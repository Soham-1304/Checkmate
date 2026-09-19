import cv2
import numpy as np
import logging
from pathlib import Path
from typing import Dict, Any, Tuple, List, Optional
import datetime

logger = logging.getLogger(__name__)

# Import vision and quality helpers
try:
    from engine.vision import (
        detect_veg_nonveg_symbol,
        decode_barcodes,
        estimate_pdp_area,
        detect_inkjet_boxes,
        preprocess_inkjet_region,
    )
    from engine.quality import check_image_quality
except ImportError:
    from .vision import (
        detect_veg_nonveg_symbol,
        decode_barcodes,
        estimate_pdp_area,
        detect_inkjet_boxes,
        preprocess_inkjet_region,
    )
    from .quality import check_image_quality


def get_available_ocr_engines() -> List[str]:
    """Detect available OCR engines in the current runtime environment."""
    available = []
    try:
        import paddleocr  # noqa: F401
        import paddle  # noqa: F401
        available.append("PaddleOCR")
    except (ImportError, Exception):
        pass

    try:
        import rapidocr_onnxruntime  # noqa: F401
        available.append("RapidOCR")
    except (ImportError, Exception):
        pass

    try:
        import easyocr  # noqa: F401
        available.append("EasyOCR")
    except (ImportError, Exception):
        pass

    return available


class PackagingOCRPipeline:
    """
    Production-ready Spatial Vision & OCR Pipeline for Legal Metrology.
    Multi-engine fallback support:
      1. PaddleOCR (high accuracy, PP-OCRv4)
      2. RapidOCR (ONNXRuntime, ultra-fast, cross-platform)
      3. EasyOCR (PyTorch-based fallback)
      4. Graceful degraded fallback (returns empty detections without crash)

    Features:
    - Preserves raw BGR for high OCR retention
    - Calculates PDP pixel-to-mm ratio
    - Inline Vision module: HSV+contour veg/non-veg, barcode/QR (GTIN), PDP auto-estimation
    - Inkjet / dot-matrix re-OCR with morphological closing
    - Per-field font height retention (bbox -> mm per detection)
    - Real-time image quality gate (blur, glare, skew, exposure)
    """

    def __init__(
        self,
        use_gpu: bool = False,
        lang: str = "en",
        det_thresh: float = 0.3,
        preferred_engine: Optional[str] = None,
    ):
        self.det_thresh = det_thresh
        self.lang = lang
        self.use_gpu = use_gpu
        self.engine_name = "None"
        self.engine_type = "none"
        self.ocr = None

        candidates = [preferred_engine] if preferred_engine else ["PaddleOCR", "RapidOCR", "EasyOCR"]

        for cand in candidates:
            if not cand:
                continue
            cand_lower = cand.lower()

            # Try PaddleOCR
            if "paddle" in cand_lower:
                try:
                    from paddleocr import PaddleOCR
                    try:
                        self.ocr = PaddleOCR(
                            lang=lang,
                            use_textline_orientation=True,
                            use_doc_orientation_classify=False,
                            use_doc_unwarping=False,
                            text_det_thresh=det_thresh,
                        )
                    except TypeError:
                        self.ocr = PaddleOCR(use_angle_cls=True, lang=lang)
                    self.engine_name = "PaddleOCR"
                    self.engine_type = "paddleocr"
                    logger.info("PackagingOCRPipeline initialized with PaddleOCR.")
                    break
                except Exception as e:
                    logger.warning(f"Failed to initialize PaddleOCR: {e}. Trying fallback engine...")

            # Try RapidOCR
            elif "rapid" in cand_lower:
                try:
                    from rapidocr_onnxruntime import RapidOCR
                    self.ocr = RapidOCR()
                    self.engine_name = "RapidOCR"
                    self.engine_type = "rapidocr"
                    logger.info("PackagingOCRPipeline initialized with RapidOCR (ONNXRuntime).")
                    break
                except Exception as e:
                    logger.warning(f"Failed to initialize RapidOCR: {e}. Trying fallback engine...")

            # Try EasyOCR
            elif "easy" in cand_lower:
                try:
                    import easyocr
                    self.ocr = easyocr.Reader([lang], gpu=use_gpu)
                    self.engine_name = "EasyOCR"
                    self.engine_type = "easyocr"
                    logger.info("PackagingOCRPipeline initialized with EasyOCR.")
                    break
                except Exception as e:
                    logger.warning(f"Failed to initialize EasyOCR: {e}.")

        if self.ocr is None:
            logger.warning(
                "No supported OCR engine (PaddleOCR / RapidOCR / EasyOCR) could be loaded. "
                "Running in degraded mode (empty OCR detections)."
            )
            self.engine_name = "None"
            self.engine_type = "none"

    # ------------------------------------------------------------
    def preprocess_image(self, image_path: str) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
        p = Path(image_path)
        if not p.exists() or not p.is_file():
            raise FileNotFoundError(f"Image file does not exist at {image_path}")
        img = cv2.imread(str(p))
        if img is None:
            raise ValueError(f"Could not decode image file '{p.name}'. File may be corrupted or in an unsupported format.")
        height, width, _ = img.shape
        pdp_area_px = height * width
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        metadata = {
            "image_width_px": width,
            "image_height_px": height,
            "total_area_px": int(pdp_area_px),
        }
        return img, denoised, metadata

    # ------------------------------------------------------------
    def _run_ocr_raw(self, image_input: Any) -> List[Tuple[List[List[float]], str, float]]:
        """
        Run OCR engine on image (path or BGR np.ndarray) and return standardized list of
        (bbox_4pts, text, confidence).
        """
        if self.engine_type == "none" or self.ocr is None:
            return []

        # 1. RapidOCR
        if self.engine_type == "rapidocr":
            try:
                res, _ = self.ocr(image_input)
                if not res:
                    return []
                standardized = []
                for item in res:
                    # RapidOCR item format: [box, text, score]
                    if len(item) >= 3:
                        box, text, score = item[0], item[1], item[2]
                        try:
                            box_list = np.array(box, dtype=float).tolist()
                        except Exception:
                            box_list = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0]]
                        standardized.append((box_list, str(text).strip(), float(score)))
                return standardized
            except Exception as e:
                logger.warning(f"RapidOCR prediction error: {e}")
                return []

        # 2. EasyOCR
        if self.engine_type == "easyocr":
            try:
                res = self.ocr.readtext(image_input)
                if not res:
                    return []
                standardized = []
                for item in res:
                    # EasyOCR format: (box, text, score)
                    if len(item) >= 3:
                        box, text, score = item[0], item[1], item[2]
                        try:
                            box_list = np.array(box, dtype=float).tolist()
                        except Exception:
                            box_list = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0]]
                        standardized.append((box_list, str(text).strip(), float(score)))
                return standardized
            except Exception as e:
                logger.warning(f"EasyOCR prediction error: {e}")
                return []

        # 3. PaddleOCR
        if self.engine_type == "paddleocr":
            raw = None
            for method_name in ("predict", "ocr"):
                if hasattr(self.ocr, method_name):
                    fn = getattr(self.ocr, method_name)
                    try:
                        res = fn(image_input)
                        if res is not None:
                            raw = res
                            break
                    except Exception as e:
                        logger.debug(f"PaddleOCR.{method_name} failed: {e}")
                        continue

            if raw is None:
                return []

            standardized = []
            # Newer PaddleOCR v3+ dict output
            if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], dict):
                first = raw[0]
                texts = first.get("rec_texts", []) or []
                scores = first.get("rec_scores", []) or [1.0] * len(texts)
                polys = first.get("rec_polys", []) or first.get("dt_polys", []) or []
                for idx, text in enumerate(texts):
                    conf = float(scores[idx]) if idx < len(scores) else 1.0
                    box = polys[idx] if idx < len(polys) else [[0, 0], [0, 0], [0, 0], [0, 0]]
                    try:
                        box_list = np.array(box, dtype=float).tolist()
                    except Exception:
                        box_list = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0]]
                    standardized.append((box_list, str(text).strip(), conf))
                return standardized

            # Classic PaddleOCR list output: [[ [box, (text, score)], ... ]]
            lines = raw[0] if isinstance(raw, list) and len(raw) > 0 and isinstance(raw[0], list) else raw
            if isinstance(lines, list):
                for line in lines:
                    if not line:
                        continue
                    bbox, text, conf = None, "", 1.0
                    try:
                        if len(line) == 2 and isinstance(line[1], (tuple, list)):
                            bbox, ti = line[0], line[1]
                            text = str(ti[0])
                            conf = float(ti[1])
                        elif len(line) == 3:
                            bbox, text, conf = line[0], line[1], float(line[2])
                        elif len(line) == 2:
                            bbox, text = line[0], line[1]
                        else:
                            continue
                    except Exception:
                        continue
                    try:
                        box_list = np.array(bbox, dtype=float).tolist()
                    except Exception:
                        box_list = [[0.0, 0.0], [0.0, 0.0], [0.0, 0.0], [0.0, 0.0]]
                    standardized.append((box_list, str(text).strip(), float(conf)))

            return standardized

        return []

    # ------------------------------------------------------------
    def _parse_ocr_records(
        self,
        raw_detections: List[Tuple[List[List[float]], str, float]],
        px_to_mm: float,
        min_conf: float,
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        records: List[Dict[str, Any]] = []
        lines: List[str] = []

        for bbox, text, conf in raw_detections:
            if conf < min_conf or not text or not text.strip():
                continue
            try:
                arr = np.array(bbox, dtype=float)
                xs = arr[:, 0]
                ys = arr[:, 1]
                h_px = float(np.max(ys) - np.min(ys))
                w_px = float(np.max(xs) - np.min(xs))
                bbox_list = arr.tolist()
            except Exception:
                h_px = 10.0
                w_px = 50.0
                bbox_list = bbox

            font_mm = round(h_px * px_to_mm, 2)
            records.append({
                "bounding_box": bbox_list,
                "text": text.strip(),
                "confidence": round(conf, 4),
                "height_px": float(h_px),
                "width_px": float(w_px),
                "font_height_mm": font_mm,
            })
            lines.append(text.strip())

        return records, lines

    # ------------------------------------------------------------
    def extract_spatial_text(
        self,
        image_path: str,
        assumed_pdp_area_cm2: float = 200.0,
        min_confidence: float = 0.35,
        pdp_area_cm2: float | None = None,
        auto_pdp: bool = True,
        enable_inkjet: bool = True,
        enable_barcode: bool = True,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Runs image preprocessing, quality checks, spatial OCR, and packaging diagnostics.
        """
        if pdp_area_cm2 is not None:
            assumed_pdp_area_cm2 = pdp_area_cm2
        if "pdp_area" in kwargs:
            assumed_pdp_area_cm2 = kwargs["pdp_area"]
        if assumed_pdp_area_cm2 <= 0:
            raise ValueError("pdp_area_cm2 must be > 0")

        orig_img, _, img_meta = self.preprocess_image(image_path)

        # 1. Real-time quality gate (§3.2)
        quality_signals = None
        if check_image_quality is not None:
            try:
                quality_signals = check_image_quality(orig_img)
            except Exception as e:
                logger.debug(f"quality check failed: {e}")
                quality_signals = {"gate": "PASS", "overall_score": 0.8}
        else:
            quality_signals = {"gate": "PASS", "overall_score": 1.0}

        # 2. PDP auto-estimation
        pdp_est = None
        if auto_pdp and estimate_pdp_area is not None:
            try:
                pdp_est = estimate_pdp_area(orig_img, fallback_cm2=float(assumed_pdp_area_cm2))
            except Exception as e:
                logger.debug(f"PDP est failed: {e}")
                pdp_est = {"estimated_cm2": float(assumed_pdp_area_cm2), "method": "error", "error": str(e)}

        px_to_mm_ratio = float(np.sqrt((assumed_pdp_area_cm2 * 100.0) / img_meta["total_area_px"]))
        px_to_mm_est = (
            float(np.sqrt((pdp_est["estimated_cm2"] * 100.0) / img_meta["total_area_px"]))
            if pdp_est and pdp_est.get("estimated_cm2")
            else px_to_mm_ratio
        )

        # 3. Primary OCR pass (pass in-memory BGR image directly)
        raw_detections = self._run_ocr_raw(orig_img)
        if not raw_detections and Path(image_path).is_file():
            raw_detections = self._run_ocr_raw(image_path)

        records, lines = self._parse_ocr_records(raw_detections, px_to_mm_ratio, min_confidence)

        # 4. Inkjet re-OCR pass: detect white-box regions and re-run with enhanced preprocessing
        inkjet_boxes: List[Dict[str, Any]] = []
        inkjet_extra_records: List[Dict[str, Any]] = []
        if enable_inkjet and detect_inkjet_boxes is not None and preprocess_inkjet_region is not None:
            try:
                inkjet_boxes = detect_inkjet_boxes(orig_img) or []
                for box in inkjet_boxes[:3]:
                    x, y, w, h = box["x"], box["y"], box["w"], box["h"]
                    pad = 4
                    x0 = max(0, x - pad)
                    y0 = max(0, y - pad)
                    x1 = min(orig_img.shape[1], x + w + pad)
                    y1 = min(orig_img.shape[0], y + h + pad)
                    roi_bgr = orig_img[y0:y1, x0:x1]
                    if roi_bgr.size == 0:
                        continue
                    gray_roi = cv2.cvtColor(roi_bgr, cv2.COLOR_BGR2GRAY)
                    enhanced = preprocess_inkjet_region(gray_roi)
                    enhanced_bgr = cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

                    raw_ink = self._run_ocr_raw(enhanced_bgr)
                    if not raw_ink:
                        raw_ink = self._run_ocr_raw(roi_bgr)

                    rec2, lin2 = self._parse_ocr_records(raw_ink, px_to_mm_ratio, min_conf=0.25)
                    for r in rec2:
                        try:
                            bb = np.array(r["bounding_box"])
                            bb[:, 0] += x0
                            bb[:, 1] += y0
                            r["bounding_box"] = bb.tolist()
                        except Exception:
                            pass
                        r["inkjet_roi"] = True
                        r["roi_box"] = box

                    existing_lower = {l.lower() for l in lines}
                    for r, txt in zip(rec2, lin2):
                        if txt.lower() not in existing_lower:
                            inkjet_extra_records.append(r)
                            lines.append(txt)
                    records.extend(rec2)
            except Exception as e:
                logger.debug(f"inkjet re-ocr failed: {e}")

        # 5. Compute spatial metrics
        total = len(records)
        if total > 0:
            heights = [r["font_height_mm"] for r in records if r.get("font_height_mm")]
            max_h = max(heights) if heights else 0.0
            min_h = min(heights) if heights else 0.0
            avg_h = round((max_h + min_h) / 2.0, 2) if heights else 0.0
        else:
            max_h = min_h = avg_h = 0.0

        # Sort by vertical reading order
        try:
            records.sort(
                key=lambda r: (
                    r["bounding_box"][0][1] if isinstance(r["bounding_box"][0], list) else 0,
                    r["bounding_box"][0][0] if isinstance(r["bounding_box"][0], list) else 0,
                )
            )
            lines = [r["text"] for r in records]
        except Exception:
            pass
        full_text = "\n".join(lines)

        # 6. Visual veg / non-veg symbol check
        visual_veg = {}
        if detect_veg_nonveg_symbol is not None:
            try:
                visual_veg = detect_veg_nonveg_symbol(orig_img)
            except Exception as e:
                logger.debug(f"veg visual failed: {e}")
                visual_veg = self._detect_veg_symbol_visual(orig_img)
        else:
            visual_veg = self._detect_veg_symbol_visual(orig_img)

        # 7. Barcode / QR detect
        barcode_result = {}
        if enable_barcode and decode_barcodes is not None:
            try:
                barcode_result = decode_barcodes(orig_img)
            except Exception as e:
                logger.debug(f"barcode failed: {e}")
                barcode_result = {"barcodes": [], "count": 0}

        # 8. Annotated evidence image
        annotated_path = None
        try:
            annotated = orig_img.copy()
            for r in records[:120]:
                try:
                    pts = np.array(r["bounding_box"], dtype=np.int32)
                    cv2.polylines(annotated, [pts], True, (0, 255, 0), 1)
                    x, y = int(pts[0][0]), int(pts[0][1] - 3)
                    if 0 <= x < annotated.shape[1] and 0 <= y < annotated.shape[0]:
                        cv2.putText(
                            annotated,
                            str(r.get("confidence", "")),
                            (x, y),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.3,
                            (0, 255, 0),
                            1,
                            cv2.LINE_AA,
                        )
                except Exception:
                    pass
            for b in inkjet_boxes:
                cv2.rectangle(annotated, (b["x"], b["y"]), (b["x"] + b["w"], b["y"] + b["h"]), (255, 0, 0), 1)

            annotated_path = str(Path(image_path).parent / f"annotated_{Path(image_path).stem}.jpg")
            cv2.imwrite(annotated_path, annotated)
        except Exception as e:
            logger.debug(f"annotated save failed: {e}")
            annotated_path = None

        avg_conf = (
            round(float(sum([r.get("confidence", 0) for r in records]) / len(records)), 3)
            if records
            else 0.0
        )

        return {
            "processing_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "image_metadata": img_meta,
            "pdp_area_cm2": float(assumed_pdp_area_cm2),
            "pdp_estimated": pdp_est,
            "px_to_mm_ratio": round(px_to_mm_ratio, 4),
            "px_to_mm_ratio_estimated": round(px_to_mm_est, 4) if pdp_est else None,
            "raw_ocr_detections": records,
            "spatial_metrics": {
                "total_text_blocks": total,
                "measured_min_font_height_mm": float(min_h),
                "measured_max_font_height_mm": float(max_h),
                "average_font_height_mm": float(avg_h),
                "avg_confidence": avg_conf,
            },
            "quality_signals": quality_signals,
            "avg_ocr_confidence": avg_conf,
            "inkjet_boxes": inkjet_boxes,
            "inkjet_extra_count": len(inkjet_extra_records),
            "extracted_raw_text": full_text,
            "visual_signals": visual_veg,
            "barcode_signals": barcode_result,
            "annotated_image_path": annotated_path,
            "ocr_engine_used": self.engine_name,
        }

    # ------------------------------------------------------------
    def _detect_veg_symbol_visual(self, bgr_img: np.ndarray) -> Dict[str, Any]:
        try:
            hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
            lower_green = np.array([35, 40, 40])
            upper_green = np.array([85, 255, 255])
            mask = cv2.inRange(hsv, lower_green, upper_green)
            lower_brown = np.array([5, 50, 20])
            upper_brown = np.array([20, 255, 200])
            mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)
            lower_red1 = np.array([0, 70, 50])
            upper_red1 = np.array([10, 255, 255])
            lower_red2 = np.array([170, 70, 50])
            upper_red2 = np.array([180, 255, 255])
            mask_red = cv2.inRange(hsv, lower_red1, upper_red1) | cv2.inRange(hsv, lower_red2, upper_red2)
            green_px = int(cv2.countNonZero(mask))
            brown_px = int(cv2.countNonZero(mask_brown))
            red_px = int(cv2.countNonZero(mask_red))
            total_px = int(bgr_img.shape[0] * bgr_img.shape[1])
            return {
                "green_pixels": green_px,
                "brown_pixels": brown_px,
                "red_pixels": red_px,
                "green_ratio": round(green_px / total_px, 5) if total_px else 0,
                "visual_veg_detected": green_px > 500,
                "visual_nonveg_detected": (brown_px + red_px) > 800,
            }
        except Exception as e:
            logger.debug(f"veg visual check failed: {e}")
            return {"visual_veg_detected": False, "visual_nonveg_detected": False}
