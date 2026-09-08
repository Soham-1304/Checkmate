"""In-process OCR service — runs label extraction INSIDE the backend container.

Why RapidOCR (onnxruntime, ~150MB, CPU seconds, ~540MB peak) instead of the
EasyOCR/torch worker (~2GB, 5-30s/image): it fits a small Render instance, so
extraction lives on the server with zero extra infra. Same honesty contract as
the external bridge (AI_ML/worker_bridge.py): 3 fields extracted, 9 declared
UNDETECTED, backend REVIEWs the gaps. The heavy EasyOCR bridge stays valid for
future Hindi-heavy packs via the unchanged async-callback contract.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")
MRP_RE = re.compile(r"(MRP|MAX\.?\s*RETAIL\s*PRICE).*?(\d+\.?\d*)", re.IGNORECASE)
NET_QTY_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|litres|grm|grams?)\b", re.IGNORECASE)
TAX_RE = re.compile(r"incl[^a-z]*of all tax|inclusive of all tax", re.IGNORECASE)

CONTRAST_THRESHOLD = 3.0

_reader = None


def get_reader():
    global _reader
    if _reader is None:
        from rapidocr_onnxruntime import RapidOCR

        _reader = RapidOCR()
    return _reader


def detect_script(text: str) -> str:
    if DEVANAGARI_RE.search(text or ""):
        return "DEVANAGARI"
    return "ENGLISH" if (text or "").strip() else "OTHER"


def tune_image(image_bytes: bytes) -> Tuple[np.ndarray, Dict[str, Any]]:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Invalid image file.")
    h, w, _ = img.shape
    if w < 1200:
        scale = 1200 / float(w)
        img = cv2.resize(img, (1200, int(h * scale)), interpolation=cv2.INTER_CUBIC)
        h, w, _ = img.shape
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    return cv2.cvtColor(clahe.apply(gray), cv2.COLOR_GRAY2BGR), {"width": w, "height": h}


def contrast_ratio_from_crop(crop_bgr: np.ndarray) -> Optional[float]:
    try:
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        if gray.size < 100:
            return None
        _, labels = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        fg, bg = gray[labels == 0].astype(float), gray[labels == 255].astype(float)
        if fg.size == 0 or bg.size == 0:
            return None
        text, back = (fg, bg) if fg.size <= bg.size else (bg, fg)
        lum = lambda v: (v / 255.0) ** 2.2  # noqa: E731
        l1, l2 = float(np.mean(lum(text))), float(np.mean(lum(back)))
        light, dark = (l1, l2) if l1 >= l2 else (l2, l1)
        return round((light + 0.05) / (dark + 0.05), 2)
    except Exception:
        return None


def conf_label(conf: Optional[float]) -> str:
    if conf is None or conf <= 0:
        return "UNDETECTED"
    if conf >= 0.85:
        return "HIGH"
    return "MEDIUM" if conf >= 0.60 else "LOW"


def extract_image(image_bytes: bytes, pkg_height_mm: float = 150.0) -> Dict[str, Any]:
    tuned, meta = tune_image(image_bytes)
    raw = get_reader()(tuned)
    rows = raw[0] if raw and raw[0] else []
    lines = []
    for box, text, prob in rows:
        xs = [p[0] for p in box]
        ys = [p[1] for p in box]
        conf = round(float(prob), 4)
        lines.append({
            "text": text,
            "confidence": conf,
            "bbox": {"x": int(min(xs)), "y": int(min(ys)),
                     "width": int(max(xs) - min(xs)), "height": int(max(ys) - min(ys))},
            "script": detect_script(text),
        })
    px_to_mm = pkg_height_mm / float(meta["height"])

    def best(pattern: re.Pattern) -> Optional[Dict[str, Any]]:
        hits = [l for l in lines if pattern.search(l["text"])]
        return max(hits, key=lambda l: l["confidence"]) if hits else None

    mrp_line, qty_line = best(MRP_RE), best(NET_QTY_RE)
    mrp_value = None
    if mrp_line:
        m = MRP_RE.search(mrp_line["text"])
        mrp_value = float(m.group(2)) if m else None
    qty_value, qty_unit = None, None
    if qty_line:
        m = NET_QTY_RE.search(qty_line["text"])
        qty_value, qty_unit = (m.group(1), m.group(2).lower()) if m else (None, None)

    return {
        "lines": lines,
        "avg_confidence": round(sum(l["confidence"] for l in lines) / len(lines), 4) if lines else 0.0,
        "px_to_mm": px_to_mm,
        "mrp_line": mrp_line,
        "mrp_value": mrp_value,
        "qty_line": qty_line,
        "qty_value": qty_value,
        "qty_unit": qty_unit,
        "tuned_image": tuned,
    }


def _crop(tuned_img: np.ndarray, bbox: Dict[str, int], pad: int = 4) -> np.ndarray:
    h, w, _ = tuned_img.shape
    return tuned_img[max(0, bbox["y"] - pad):min(h, bbox["y"] + bbox["height"] + pad),
                     max(0, bbox["x"] - pad):min(w, bbox["x"] + bbox["width"] + pad)]


CANONICAL_KEYS = ["mrp", "net_quantity", "net_quantity_unit", "mfg_date", "expiry_date",
                  "generic_name", "manufacturer_name", "manufacturer_address", "packer_name",
                  "importer_name", "consumer_care", "standard_pack_warning"]


def build_declarations(results: List[Dict[str, Any]],
                       evidence_ids: List[Any]) -> List[Dict[str, Any]]:
    best_mrp, best_qty = None, None
    for res, evid in zip(results, evidence_ids):
        if res["mrp_line"] and (best_mrp is None or res["mrp_line"]["confidence"] > best_mrp[0]["confidence"]):
            best_mrp = (res["mrp_line"], res, evid)
        if res["qty_line"] and (best_qty is None or res["qty_line"]["confidence"] > best_qty[0]["confidence"]):
            best_qty = (res["qty_line"], res, evid)

    decls = {k: {"canonical_key": k, "machine_value": None, "confidence": 0.0,
                 "confidence_label": "UNDETECTED", "bounding_box": None, "font_size_mm": None,
                 "contrast_pass": None, "script_language": "ENGLISH", "clearance_pass": None,
                 "evidence_id": None} for k in CANONICAL_KEYS}

    if best_mrp:
        line, res, evid = best_mrp
        tax = " [tax legend seen]" if TAX_RE.search(line["text"]) else ""
        ratio = contrast_ratio_from_crop(_crop(res["tuned_image"], line["bbox"]))
        decls["mrp"] = {"canonical_key": "mrp", "machine_value": f"{line['text']}{tax}",
                        "confidence": line["confidence"], "confidence_label": conf_label(line["confidence"]),
                        "bounding_box": line["bbox"],
                        "font_size_mm": round(line["bbox"]["height"] * res["px_to_mm"], 2),
                        "contrast_pass": (ratio >= CONTRAST_THRESHOLD) if ratio is not None else None,
                        "script_language": line["script"], "clearance_pass": None, "evidence_id": evid}

    if best_qty:
        line, res, evid = best_qty
        ratio = contrast_ratio_from_crop(_crop(res["tuned_image"], line["bbox"]))
        cpass = (ratio >= CONTRAST_THRESHOLD) if ratio is not None else None
        font_mm = round(line["bbox"]["height"] * res["px_to_mm"], 2)
        decls["net_quantity"] = {"canonical_key": "net_quantity", "machine_value": res["qty_value"],
                                 "confidence": line["confidence"], "confidence_label": conf_label(line["confidence"]),
                                 "bounding_box": line["bbox"], "font_size_mm": font_mm, "contrast_pass": cpass,
                                 "script_language": line["script"], "clearance_pass": None, "evidence_id": evid}
        decls["net_quantity_unit"] = {**decls["net_quantity"], "canonical_key": "net_quantity_unit",
                                      "machine_value": res["qty_unit"], "font_size_mm": None}
    return [decls[k] for k in CANONICAL_KEYS]
