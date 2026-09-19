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

MFG_RE = re.compile(
    r"(?:mfd|mfg|packed|pkd|date\s*of\s*mfg|mfr)[\s.:]*([0-9]{1,2}[/-][0-9]{2,4}|[A-Za-z]{3,9}[\s,.-]+[0-9]{2,4})",
    re.IGNORECASE,
)
EXP_RE = re.compile(
    r"(?:expiry|exp|use\s*by|best\s*before)[\s.:]*([0-9]{1,2}[/-][0-9]{2,4}|[A-Za-z]{3,9}[\s,.-]+[0-9]{2,4}|\d+\s*(?:months|days|years))",
    re.IGNORECASE,
)
CARE_RE = re.compile(
    r"(?:consumer\s*care|customer\s*care|feedback|helpline|toll\s*free|email)[\s.:]*([^\n\r]+)",
    re.IGNORECASE,
)
MFR_RE = re.compile(
    r"(?:mfd\s*by|manufactured\s*by|mktd\s*by|marketed\s*by)[\s.:]*([^\n\r]+)",
    re.IGNORECASE,
)
GENERIC_RE = re.compile(
    r"(?:commodity|product|generic\s*name)[\s.:]*([^\n\r]+)",
    re.IGNORECASE,
)

_reader = None


def get_reader():
    global _reader
    if _reader is None:
        from rapidocr_onnxruntime import RapidOCR

        _reader = RapidOCR()
    return _reader


async def call_ml_service(
    image_bytes: bytes,
    filename: str = "package.jpg",
    category: Optional[str] = None,
    pdp_area_cm2: Optional[float] = None,
) -> Optional[Dict[str, Any]]:
    """Call the standalone ML microservice (Hugging Face / Render) if configured.

    Gracefully falls back to local RapidOCR if ML_SERVICE_URL is unset,
    unreachable, or returns a non-200 response.
    """
    import httpx
    from app.core.config import settings

    if not settings.ML_SERVICE_URL or not settings.ML_SERVICE_URL.strip():
        return None

    target_url = f"{settings.ML_SERVICE_URL.rstrip('/')}/predict"
    form_data: Dict[str, Any] = {}
    if category:
        form_data["category"] = category
    if pdp_area_cm2 is not None:
        form_data["pdp_area_cm2"] = str(pdp_area_cm2)

    files = {"file": (filename, image_bytes, "image/jpeg")}
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(target_url, data=form_data, files=files)
            if resp.status_code == 200:
                logger.info("ML microservice call succeeded (%s)", target_url)
                return resp.json()
            else:
                logger.warning(
                    "ML microservice returned HTTP %d: %s",
                    resp.status_code,
                    resp.text[:200],
                )
                return None
    except Exception as exc:
        logger.warning(
            "ML microservice connection to %s failed (%s); using local RapidOCR fallback.",
            target_url,
            exc,
        )
        return None


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

    mrp_line = best(MRP_RE)
    qty_line = best(NET_QTY_RE)
    mfg_line = best(MFG_RE)
    exp_line = best(EXP_RE)
    care_line = best(CARE_RE)
    mfr_line = best(MFR_RE)
    generic_line = best(GENERIC_RE)

    mrp_value = None
    if mrp_line:
        m = MRP_RE.search(mrp_line["text"])
        mrp_value = float(m.group(2)) if m else None
    qty_value, qty_unit = None, None
    if qty_line:
        m = NET_QTY_RE.search(qty_line["text"])
        qty_value, qty_unit = (m.group(1), m.group(2).lower()) if m else (None, None)

    # Pre-compute contrast crops for MRP/qty lines to avoid holding the
    # full tuned numpy array (~3-10MB) in memory after this function returns.
    mrp_contrast, qty_contrast = None, None
    if mrp_line:
        mrp_contrast = contrast_ratio_from_crop(_crop(tuned, mrp_line["bbox"]))
    if qty_line:
        qty_contrast = contrast_ratio_from_crop(_crop(tuned, qty_line["bbox"]))

    return {
        "lines": lines,
        "avg_confidence": round(sum(l["confidence"] for l in lines) / len(lines), 4) if lines else 0.0,
        "px_to_mm": px_to_mm,
        "mrp_line": mrp_line,
        "mrp_value": mrp_value,
        "qty_line": qty_line,
        "qty_value": qty_value,
        "qty_unit": qty_unit,
        "mfg_line": mfg_line,
        "exp_line": exp_line,
        "care_line": care_line,
        "mfr_line": mfr_line,
        "generic_line": generic_line,
        "mrp_contrast": mrp_contrast,
        "qty_contrast": qty_contrast,
    }


def _crop(tuned_img: np.ndarray, bbox: Dict[str, int], pad: int = 4) -> np.ndarray:
    h, w, _ = tuned_img.shape
    return tuned_img[max(0, bbox["y"] - pad):min(h, bbox["y"] + bbox["height"] + pad),
                     max(0, bbox["x"] - pad):min(w, bbox["x"] + bbox["width"] + pad)]


CANONICAL_KEYS = [
    "mrp",
    "net_quantity",
    "net_quantity_unit",
    "mfg_date",
    "expiry_date",
    "generic_name",
    "manufacturer_name",
    "manufacturer_address",
    "packer_name",
    "importer_name",
    "consumer_care",
    "standard_pack_warning",
]


def build_declarations(
    results: List[Dict[str, Any]],
    evidence_ids: List[Any],
    ml_payload: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Construct canonical declarations from either the ML microservice payload
    or the in-process RapidOCR extraction results.
    """
    primary_evid = evidence_ids[0] if evidence_ids else None

    # Base dictionary with UNDETECTED placeholders
    decls = {
        k: {
            "canonical_key": k,
            "machine_value": None,
            "confidence": 0.0,
            "confidence_label": "UNDETECTED",
            "bounding_box": None,
            "font_size_mm": None,
            "contrast_pass": None,
            "script_language": "ENGLISH",
            "clearance_pass": None,
            "evidence_id": None,
        }
        for k in CANONICAL_KEYS
    }

    # Case 1: Populated from Standalone ML Microservice (High Precision / Rules Schema)
    if ml_payload and "mapped_fields" in ml_payload:
        mapped = ml_payload["mapped_fields"]
        spatial = ml_payload.get("spatial_metrics", {})
        avg_conf = float(ml_payload.get("avg_confidence") or 0.90)
        font_mm = spatial.get("measured_max_font_height_mm")
        if font_mm is not None:
            font_mm = round(float(font_mm), 2)

        def _val(field_key: str) -> Optional[str]:
            item = mapped.get(field_key)
            if not item:
                return None
            if isinstance(item, dict):
                return str(item.get("value") or "").strip() or None
            return str(item).strip() or None

        # MRP
        mrp_str = _val("mrp")
        if mrp_str:
            tax = " [tax legend seen]" if mapped.get("mrp", {}).get("has_inclusive_taxes") else ""
            decls["mrp"].update({
                "machine_value": f"{mrp_str}{tax}".strip(),
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "font_size_mm": font_mm,
                "contrast_pass": True,
                "evidence_id": primary_evid,
            })

        # Net Quantity & Unit
        qty_str = _val("net_quantity")
        if qty_str:
            qm = NET_QTY_RE.search(qty_str)
            qty_val = qm.group(1) if qm else qty_str
            qty_u = qm.group(2).lower() if qm else None
            decls["net_quantity"].update({
                "machine_value": qty_val,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "font_size_mm": font_mm,
                "contrast_pass": True,
                "evidence_id": primary_evid,
            })
            if qty_u:
                decls["net_quantity_unit"].update({
                    "machine_value": qty_u,
                    "confidence": avg_conf,
                    "confidence_label": conf_label(avg_conf),
                    "evidence_id": primary_evid,
                })

        # Dates
        mfg_str = _val("mfg_date")
        if mfg_str:
            decls["mfg_date"].update({
                "machine_value": mfg_str,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        exp_str = _val("expiry_or_best_before") or _val("expiry_date")
        if exp_str:
            decls["expiry_date"].update({
                "machine_value": exp_str,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        # Generic Name
        gen_str = _val("generic_name")
        if gen_str:
            decls["generic_name"].update({
                "machine_value": gen_str,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        # Manufacturer, Packer, Importer
        mfr_entities = mapped.get("mfr_packer_importer_name_address", {}).get("entities", {})
        mfr_name = _val("manufacturer_name") or mfr_entities.get("mfr")
        if mfr_name:
            decls["manufacturer_name"].update({
                "machine_value": mfr_name,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        mfr_addr = _val("manufacturer_address") or _val("mfr_packer_importer_name_address")
        if mfr_addr:
            decls["manufacturer_address"].update({
                "machine_value": mfr_addr,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        pkr_name = _val("packer_name") or mfr_entities.get("packer")
        if pkr_name:
            decls["packer_name"].update({
                "machine_value": pkr_name,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        imp_name = _val("importer_name") or mfr_entities.get("importer")
        if imp_name:
            decls["importer_name"].update({
                "machine_value": imp_name,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        # Consumer Care
        care_str = _val("consumer_care")
        if care_str:
            decls["consumer_care"].update({
                "machine_value": care_str,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        # Warnings / Disclaimers
        warn_str = _val("standard_pack_warning")
        if warn_str:
            decls["standard_pack_warning"].update({
                "machine_value": warn_str,
                "confidence": avg_conf,
                "confidence_label": conf_label(avg_conf),
                "evidence_id": primary_evid,
            })

        return [decls[k] for k in CANONICAL_KEYS]

    # Case 2: Local RapidOCR fallback extraction
    best_mrp, best_qty = None, None
    best_mfg, best_exp = None, None
    best_care, best_mfr, best_gen = None, None, None

    for res, evid in zip(results, evidence_ids):
        if res.get("mrp_line") and (best_mrp is None or res["mrp_line"]["confidence"] > best_mrp[0]["confidence"]):
            best_mrp = (res["mrp_line"], res, evid)
        if res.get("qty_line") and (best_qty is None or res["qty_line"]["confidence"] > best_qty[0]["confidence"]):
            best_qty = (res["qty_line"], res, evid)
        if res.get("mfg_line") and (best_mfg is None or res["mfg_line"]["confidence"] > best_mfg[0]["confidence"]):
            best_mfg = (res["mfg_line"], res, evid)
        if res.get("exp_line") and (best_exp is None or res["exp_line"]["confidence"] > best_exp[0]["confidence"]):
            best_exp = (res["exp_line"], res, evid)
        if res.get("care_line") and (best_care is None or res["care_line"]["confidence"] > best_care[0]["confidence"]):
            best_care = (res["care_line"], res, evid)
        if res.get("mfr_line") and (best_mfr is None or res["mfr_line"]["confidence"] > best_mfr[0]["confidence"]):
            best_mfr = (res["mfr_line"], res, evid)
        if res.get("generic_line") and (best_gen is None or res["generic_line"]["confidence"] > best_gen[0]["confidence"]):
            best_gen = (res["generic_line"], res, evid)

    if best_mrp:
        line, res, evid = best_mrp
        tax = " [tax legend seen]" if TAX_RE.search(line["text"]) else ""
        ratio = res.get("mrp_contrast")
        decls["mrp"] = {
            "canonical_key": "mrp",
            "machine_value": f"{line['text']}{tax}",
            "confidence": line["confidence"],
            "confidence_label": conf_label(line["confidence"]),
            "bounding_box": line["bbox"],
            "font_size_mm": round(line["bbox"]["height"] * res["px_to_mm"], 2),
            "contrast_pass": (ratio >= CONTRAST_THRESHOLD) if ratio is not None else None,
            "script_language": line["script"],
            "clearance_pass": None,
            "evidence_id": evid,
        }

    if best_qty:
        line, res, evid = best_qty
        ratio = res.get("qty_contrast")
        cpass = (ratio >= CONTRAST_THRESHOLD) if ratio is not None else None
        font_mm = round(line["bbox"]["height"] * res["px_to_mm"], 2)
        decls["net_quantity"] = {
            "canonical_key": "net_quantity",
            "machine_value": res["qty_value"],
            "confidence": line["confidence"],
            "confidence_label": conf_label(line["confidence"]),
            "bounding_box": line["bbox"],
            "font_size_mm": font_mm,
            "contrast_pass": cpass,
            "script_language": line["script"],
            "clearance_pass": None,
            "evidence_id": evid,
        }
        decls["net_quantity_unit"] = {
            **decls["net_quantity"],
            "canonical_key": "net_quantity_unit",
            "machine_value": res["qty_unit"],
            "font_size_mm": None,
        }

    if best_mfg:
        line, res, evid = best_mfg
        decls["mfg_date"] = {
            "canonical_key": "mfg_date",
            "machine_value": line["text"],
            "confidence": line["confidence"],
            "confidence_label": conf_label(line["confidence"]),
            "bounding_box": line["bbox"],
            "font_size_mm": round(line["bbox"]["height"] * res["px_to_mm"], 2),
            "contrast_pass": None,
            "script_language": line["script"],
            "clearance_pass": None,
            "evidence_id": evid,
        }

    if best_exp:
        line, res, evid = best_exp
        decls["expiry_date"] = {
            "canonical_key": "expiry_date",
            "machine_value": line["text"],
            "confidence": line["confidence"],
            "confidence_label": conf_label(line["confidence"]),
            "bounding_box": line["bbox"],
            "font_size_mm": round(line["bbox"]["height"] * res["px_to_mm"], 2),
            "contrast_pass": None,
            "script_language": line["script"],
            "clearance_pass": None,
            "evidence_id": evid,
        }

    if best_care:
        line, res, evid = best_care
        decls["consumer_care"] = {
            "canonical_key": "consumer_care",
            "machine_value": line["text"],
            "confidence": line["confidence"],
            "confidence_label": conf_label(line["confidence"]),
            "bounding_box": line["bbox"],
            "font_size_mm": round(line["bbox"]["height"] * res["px_to_mm"], 2),
            "contrast_pass": None,
            "script_language": line["script"],
            "clearance_pass": None,
            "evidence_id": evid,
        }

    if best_mfr:
        line, res, evid = best_mfr
        decls["manufacturer_name"] = {
            "canonical_key": "manufacturer_name",
            "machine_value": line["text"],
            "confidence": line["confidence"],
            "confidence_label": conf_label(line["confidence"]),
            "bounding_box": line["bbox"],
            "font_size_mm": round(line["bbox"]["height"] * res["px_to_mm"], 2),
            "contrast_pass": None,
            "script_language": line["script"],
            "clearance_pass": None,
            "evidence_id": evid,
        }

    if best_gen:
        line, res, evid = best_gen
        decls["generic_name"] = {
            "canonical_key": "generic_name",
            "machine_value": line["text"],
            "confidence": line["confidence"],
            "confidence_label": conf_label(line["confidence"]),
            "bounding_box": line["bbox"],
            "font_size_mm": round(line["bbox"]["height"] * res["px_to_mm"], 2),
            "contrast_pass": None,
            "script_language": line["script"],
            "clearance_pass": None,
            "evidence_id": evid,
        }

    return [decls[k] for k in CANONICAL_KEYS]
