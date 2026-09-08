"""DoCA ML extractor — adapted from AI_ML/main2.py for the backend worker bridge.

What changed vs the prototype (main2.py):
- REMOVED: FastAPI app, SQLite models, LegalMetrologyRuleEngine, /inspect-commodity.
  Rules live in our Supabase DB (rule_sets LM-PCR-2011-v1.0); the backend decides.
- KEPT: ImagePreprocessor.tune_image_for_ocr (CLAHE + denoise) verbatim.
- UPGRADED: extraction is PER-LINE (each OCR line -> text, confidence, bbox,
  script) instead of one joined blob, so every declaration carries its own
  machine_value + confidence + bounding_box + script_language.
- ADDED: en+hi EasyOCR reader (Devanagari detection for Rule 9(4)) and an
  OpenCV luminance contrast helper feeding Rule 9(1)(b) contrast_pass.

Heavy deps (easyocr/torch) import lazily inside DeclarationExtractor so this
module imports cleanly without them (bridge --help, tests).
"""

import re
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

DEVANAGARI_RE = re.compile(r"[\u0900-\u097F]")

MRP_RE = re.compile(r"(MRP|MAX\.?\s*RETAIL\s*PRICE).*?(\d+\.?\d*)", re.IGNORECASE)
NET_QTY_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|litres|grm|grams?)\b", re.IGNORECASE)
DATE_RE = re.compile(r"\b(0?[1-9]|1[0-2])[/\-.](\d{2}|\d{4})\b")
PIN_RE = re.compile(r"\b[1-9][0-9]{5}\b")
PHONE_RE = re.compile(r"\b(?:\+91|0)?[6-9]\d{9}\b|1800[-\s]?\d{3}[-\s]?\d{3,4}")
EMAIL_RE = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
TAX_RE = re.compile(r"incl[^a-z]*of all tax|inclusive of all tax", re.IGNORECASE)


class ImagePreprocessor:
    @staticmethod
    def tune_image_for_ocr(image_bytes: bytes) -> Tuple[np.ndarray, Dict[str, Any]]:
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Invalid image file.")

        h, w, _ = img.shape
        target_width = 1200
        if w < target_width:
            scale = target_width / float(w)
            img = cv2.resize(img, (target_width, int(h * scale)), interpolation=cv2.INTER_CUBIC)
            h, w, _ = img.shape

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced_gray = clahe.apply(gray)
        denoised = cv2.fastNlMeansDenoising(enhanced_gray, h=10)

        tuned_img = cv2.cvtColor(denoised, cv2.COLOR_GRAY2BGR)
        return tuned_img, {"original_width": w, "original_height": h}


def detect_script(text: str) -> str:
    if DEVANAGARI_RE.search(text or ""):
        return "DEVANAGARI"
    if (text or "").strip():
        return "ENGLISH"
    return "OTHER"


def contrast_ratio_from_crop(crop_bgr: np.ndarray) -> Optional[float]:
    """WCAG-style luminance ratio between the two Otsu classes of a text crop.

    Assumes the smaller pixel class is the printed text. Returns None when the
    crop is unusable (caller must send contrast_pass=None, never a guess).
    """
    try:
        gray = cv2.cvtColor(crop_bgr, cv2.COLOR_BGR2GRAY)
        if gray.size < 100:
            return None
        _, labels = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        fg = gray[labels == 0].astype(float)
        bg = gray[labels == 255].astype(float)
        if fg.size == 0 or bg.size == 0:
            return None
        text, back = (fg, bg) if fg.size <= bg.size else (bg, fg)
        lum = lambda v: (v / 255.0) ** 2.2  # noqa: E731, gamma-approx relative luminance
        l1, l2 = float(np.mean(lum(text))), float(np.mean(lum(back)))
        light, dark = (l1, l2) if l1 >= l2 else (l2, l1)
        return round((light + 0.05) / (dark + 0.05), 2)
    except Exception:
        return None


class DeclarationExtractor:
    def __init__(self, langs: Tuple[str, ...] = ("en", "hi")):
        import easyocr

        self.reader = easyocr.Reader(list(langs))
        self.langs = langs

    def extract_lines(self, tuned_img: np.ndarray) -> List[Dict[str, Any]]:
        out = []
        for bbox, text, prob in self.reader.readtext(tuned_img):
            xs = [p[0] for p in bbox]
            ys = [p[1] for p in bbox]
            out.append(
                {
                    "text": text,
                    "confidence": round(float(prob), 4),
                    "bbox": {
                        "x": int(min(xs)),
                        "y": int(min(ys)),
                        "width": int(max(xs) - min(xs)),
                        "height": int(max(ys) - min(ys)),
                    },
                    "script": detect_script(text),
                }
            )
        return out

    def extract(self, image_bytes: bytes, pkg_height_mm: float = 150.0) -> Dict[str, Any]:
        tuned, meta = ImagePreprocessor.tune_image_for_ocr(image_bytes)
        lines = self.extract_lines(tuned)
        full_text = " ".join(line["text"] for line in lines)
        avg_conf = round(sum(l["confidence"] for l in lines) / len(lines), 4) if lines else 0.0

        px_to_mm = pkg_height_mm / float(meta["original_height"])

        def best(pattern: re.Pattern) -> Optional[Dict[str, Any]]:
            scored = [l for l in lines if pattern.search(l["text"])]
            if not scored:
                return None
            return max(scored, key=lambda l: l["confidence"])

        mrp_line = best(MRP_RE)
        qty_line = best(NET_QTY_RE)
        mrp_value = None
        if mrp_line:
            m = MRP_RE.search(mrp_line["text"])
            mrp_value = float(m.group(2)) if m else None
        qty_value, qty_unit = None, None
        if qty_line:
            m = NET_QTY_RE.search(qty_line["text"])
            qty_value, qty_unit = (m.group(1), m.group(2).lower()) if m else (None, None)

        font_mm = None
        if qty_line:
            font_mm = round(qty_line["bbox"]["height"] * px_to_mm, 2)

        return {
            "lines": lines,
            "full_text": full_text,
            "avg_confidence": avg_conf,
            "px_to_mm": px_to_mm,
            "image_meta": meta,
            "mrp_line": mrp_line,
            "mrp_value": mrp_value,
            "qty_line": qty_line,
            "qty_value": qty_value,
            "qty_unit": qty_unit,
            "font_height_mm": font_mm,
            "tuned_image": tuned,
        }
