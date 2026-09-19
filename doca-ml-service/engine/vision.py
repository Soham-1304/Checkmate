"""
Vision module for Legal Metrology Engine.
- Veg / Non-veg symbol detection (HSV + contour geometry)
- Barcode / QR decoding (cv2.barcode.BarcodeDetector + QRCodeDetector + pyzbar optional)
- PDP area auto-estimation (edge + contour segmentation)
- Inkjet preprocessing helpers
"""
import cv2
import numpy as np
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# 1) Veg / Non-Veg Icon Detection (FSSAI requirement)
# Green dot inside green square = Vegetarian
# Brown/Red dot inside brown square = Non-Vegetarian
# Uses HSV masking + contour contour hierarchy (parent/child)
# ------------------------------------------------------------------
def detect_veg_nonveg_symbol(bgr_img: np.ndarray, debug: bool = False) -> Dict[str, Any]:
    """
    Returns detailed veg/non-veg visual signals.
    Combines pixel ratio + geometric validation (square + inner circle/contour).
    """
    try:
        h, w = bgr_img.shape[:2]
        total_px = h * w
        hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)

        # --- HSV masks ---
        # Green: hue 35-85, need sufficient saturation
        lower_green = np.array([35, 50, 40])
        upper_green = np.array([85, 255, 255])
        mask_green = cv2.inRange(hsv, lower_green, upper_green)

        # Brown: tighter to avoid orange packaging (Lay's yellow)
        # Real brown FSSAI is dark: low Value, medium-high Sat. Yellow is bright high Value.
        lower_brown = np.array([8, 80, 20])
        upper_brown = np.array([18, 255, 150])
        mask_brown = cv2.inRange(hsv, lower_brown, upper_brown)

        # Red covers two hue bands
        lower_red1 = np.array([0, 70, 50]); upper_red1 = np.array([10, 255, 255])
        lower_red2 = np.array([170, 70, 50]); upper_red2 = np.array([180, 255, 255])
        mask_red = cv2.inRange(hsv, lower_red1, upper_red1) | cv2.inRange(hsv, lower_red2, upper_red2)
        mask_nonveg = cv2.bitwise_or(mask_brown, mask_red)

        green_px = int(cv2.countNonZero(mask_green))
        brown_px = int(cv2.countNonZero(mask_brown))
        red_px = int(cv2.countNonZero(mask_red))
        # Corner-specific counts (FSSAI symbols typically top-right / top-left)
        h_third = max(1, h // 4)
        w_third = max(1, w // 4)
        # top-right corner
        mask_green_tr = mask_green[0:h_third*2, w - w_third*2:w]
        mask_nonveg_tr = mask_nonveg[0:h_third*2, w - w_third*2:w]
        green_tr = int(cv2.countNonZero(mask_green_tr))
        nonveg_tr = int(cv2.countNonZero(mask_nonveg_tr))
        # top-left corner also
        mask_green_tl = mask_green[0:h_third*2, 0:w_third*2]
        green_tl = int(cv2.countNonZero(mask_green_tl))

        # --- Contour geometry validation ---
        # For veg: expect square contour + inner filled circle.
        # We find contours on green mask and check for square + dot nesting.
        def _has_veg_geometry(mask: np.ndarray) -> Tuple[bool, List[Dict[str, Any]]]:
            # clean mask
            kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
            cleaned = cv2.morphologyEx(cleaned_mask := cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=1), cv2.MORPH_OPEN, kernel, iterations=1)
            # find contours with hierarchy
            contours, hierarchy = cv2.findContours(cleaned, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
            candidates = []
            if hierarchy is None or len(contours) == 0:
                return False, candidates
            hierarchy = hierarchy[0]
            for i, cnt in enumerate(contours):
                area = cv2.contourArea(cnt)
                # FSSAI symbol is small but visible: expect 0.02% - 2% of image
                if area < total_px * 0.00015 or area > total_px * 0.05:
                    continue
                peri = cv2.arcLength(cnt, True)
                approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)
                # square check: 4 vertices, aspect ratio ~1, area vs bounding rect
                is_square = False
                if len(approx) == 4:
                    x, y, cw, ch = cv2.boundingRect(approx)
                    ar = cw / float(ch) if ch else 0
                    rect_area = cw * ch
                    extent = area / rect_area if rect_area else 0
                    if 0.75 < ar < 1.35 and 0.7 < extent < 1.0:
                        is_square = True
                # circularity for inner dot
                circularity = 4 * np.pi * area / (peri * peri) if peri else 0
                # check if this contour has a child (dot inside square)
                has_child = bool(hierarchy[i][2] != -1)
                is_square_py = bool(is_square)
                # For veg, the outer green border is square, inner dot is ~30-50% area of square
                if is_square_py and has_child:
                    # find child contour area ratio
                    child_idx = hierarchy[i][2]
                    child_area = cv2.contourArea(contours[child_idx]) if 0 <= child_idx < len(contours) else 0
                    ratio = child_area / area if area else 0
                    if 0.08 < ratio < 0.75:
                        candidates.append({"area": float(area), "circularity": float(circularity), "has_child": True, "ratio": float(ratio), "is_square": True})
                        return True, candidates
                # Also accept strong circular dot alone (if square border eroded by masking) – keep as candidate but NOT geometry validated
                if circularity > 0.65 and 0.0002 < area / total_px < 0.01:
                    candidates.append({"area": float(area), "circularity": float(circularity), "has_child": bool(has_child), "is_square": bool(is_square_py), "dot_only": True})
            # Only square+child counts as geometry validated; dot-only is not validated but kept for debug
            return False, candidates

        veg_geo, veg_cands = _has_veg_geometry(mask_green)
        nonveg_geo, nonveg_cands = _has_veg_geometry(mask_nonveg)
        # Also check corner region specifically – reduces false brown from pack color
        # Re-run geometry on corner crops for stricter validation
        try:
            h_tr = max(1, h // 3); w_tr = max(1, w // 3)
            # corner masks for geometry check
            mask_green_tr_full = np.zeros_like(mask_green)
            mask_green_tr_full[0:h_tr*2, w - w_tr*2:w] = mask_green[0:h_tr*2, w - w_tr*2:w]
            # For green, corner geometry is more relevant
            veg_geo_corner, _ = _has_veg_geometry(mask_green_tr_full)
        except: veg_geo_corner = False

        # Heuristic thresholds: need both pixel count AND geometry or strong pixel ratio
        # Use corner counts for veg decision to avoid pack-color false positives
        # Lay's 28g image ~ 724k pixels, green dot ~ 600-2000 px (all in corner)
        corner_green = green_tr + green_tl
        # For non-veg, require corner presence too (brown dot also typically corner)
        # Global brown huge due to pack, but corner brown should be limited unless symbol
        corner_nonveg = nonveg_tr
        visual_veg = (corner_green > 250 and (veg_geo or veg_geo_corner)) or (corner_green > 500) or (green_tr > 400 and veg_geo)
        # fallback global if corner missing but global strong
        if not visual_veg and green_px > 900 and veg_geo:
            visual_veg = True
        visual_nonveg = ((corner_nonveg > 300 and nonveg_geo) or (nonveg_tr > 600)) and not visual_veg
        # If still ambiguous, use global counts with stricter threshold for brown
        if not visual_veg and not visual_nonveg:
            if (brown_px + red_px) > 2500 and nonveg_geo and green_px < 300:
                visual_nonveg = True
            elif green_px > 500 and green_px > (brown_px + red_px) * 0.15:
                # green decent relative to brown (allow pack orange)
                visual_veg = (green_px > 350)

        # Prefer veg if both trigger (green more specific)
        if visual_veg and visual_nonveg:
            # corner green vs corner nonveg comparison
            if corner_green > corner_nonveg * 1.2:
                visual_nonveg = False
            elif corner_nonveg > corner_green * 1.2:
                visual_veg = False
            else:
                # if ambiguous, prefer veg for food snacks? But keep both false to avoid false positive
                pass

        result: Dict[str, Any] = {
            "green_pixels": green_px,
            "brown_pixels": brown_px,
            "red_pixels": red_px,
            "nonveg_pixels": int(brown_px + red_px),
            "corner_green_pixels": int(corner_green),
            "corner_nonveg_pixels": int(corner_nonveg),
            "green_tr": int(green_tr),
            "green_tl": int(green_tl),
            "nonveg_tr": int(nonveg_tr),
            "total_pixels": int(total_px),
            "green_ratio": round(green_px / total_px, 6) if total_px else 0,
            "nonveg_ratio": round((brown_px + red_px) / total_px, 6) if total_px else 0,
            "visual_veg_detected": bool(visual_veg),
            "visual_nonveg_detected": bool(visual_nonveg),
            "veg_geometry_validated": bool(veg_geo),
            "veg_corner_geometry": bool(veg_geo_corner),
            "nonveg_geometry_validated": bool(nonveg_geo),
            "veg_candidates": veg_cands[:3],
            "nonveg_candidates": nonveg_cands[:3],
        }
        if visual_veg:
            result["detected_symbol"] = "Vegetarian - Green Dot (HSV+contour)"
        elif visual_nonveg:
            result["detected_symbol"] = "Non-Vegetarian - Brown/Red Dot (HSV+contour)"
        else:
            result["detected_symbol"] = None

        return result
    except Exception as e:
        logger.debug(f"veg symbol detection failed: {e}")
        return {"visual_veg_detected": False, "visual_nonveg_detected": False, "error": str(e)}


# ------------------------------------------------------------------
# 2) Barcode / QR Detection (Legal Metrology + GTIN validation)
# EAN-13 for Lay's 8901491001137 should be decodable
# Uses: pyzbar if available, then cv2.barcode.BarcodeDetector, then QRCodeDetector
# ------------------------------------------------------------------
def decode_barcodes(bgr_img: np.ndarray) -> Dict[str, Any]:
    decoded: List[Dict[str, Any]] = []
    try:
        # Try pyzbar first (most robust for EAN-13)
        try:
            from pyzbar.pyzbar import decode as pyzbar_decode  # type: ignore
            pil_like = bgr_img  # pyzbar can handle numpy
            results = pyzbar_decode(bgr_img)
            for r in results:
                try:
                    data = r.data.decode("utf-8", errors="ignore")
                except Exception:
                    data = str(r.data)
                decoded.append({"data": data, "type": r.type, "engine": "pyzbar", "bbox": [ (p.x, p.y) for p in r.polygon ] if r.polygon else []})
        except ImportError:
            pass
        except Exception as e:
            logger.debug(f"pyzbar decode failed: {e}")

        # Try cv2.barcode.BarcodeDetector (OpenCV 4.7+)
        if not decoded:
            try:
                if hasattr(cv2, "barcode") and hasattr(cv2.barcode, "BarcodeDetector"):
                    detector = cv2.barcode.BarcodeDetector()
                    retval, decoded_info, decoded_type, points = detector.detectAndDecode(bgr_img)
                    if retval and decoded_info is not None:
                        # decoded_info may be list or single string
                        infos = decoded_info if isinstance(decoded_info, (list, tuple, np.ndarray)) else [decoded_info]
                        types = decoded_type if isinstance(decoded_type, (list, tuple, np.ndarray)) else [decoded_type]
                        pts = points if points is not None else []
                        for idx, info in enumerate(infos):
                            if info and str(info).strip():
                                t = types[idx] if idx < len(types) else "UNKNOWN"
                                bbox = pts[idx].tolist() if idx < len(pts) and pts[idx] is not None else []
                                decoded.append({"data": str(info).strip(), "type": str(t), "engine": "cv2.barcode", "bbox": bbox})
            except Exception as e:
                logger.debug(f"cv2.barcode failed: {e}")

        # Try QRCodeDetector (handles QR + some barcodes with fallback)
        if not decoded:
            try:
                qrd = cv2.QRCodeDetector()
                # detectAndDecodeMulti is better for multiple
                if hasattr(qrd, "detectAndDecodeMulti"):
                    retval, info, points, _ = qrd.detectAndDecodeMulti(bgr_img)
                    if retval and info is not None:
                        for idx, code in enumerate(info):
                            if code and str(code).strip():
                                bbox = points[idx].tolist() if points is not None and idx < len(points) else []
                                decoded.append({"data": str(code).strip(), "type": "QR_CODE", "engine": "cv2.QRCodeDetector", "bbox": bbox})
                else:
                    data, points, _ = qrd.detectAndDecode(bgr_img)
                    if data and str(data).strip():
                        decoded.append({"data": str(data).strip(), "type": "QR_CODE", "engine": "cv2.QRCodeDetector", "bbox": points.tolist() if points is not None else []})
            except Exception as e:
                logger.debug(f"QRCodeDetector failed: {e}")

        # Bottom-right crop retry for EAN-13 (often at package edge, detector misses global)
        if not decoded:
            try:
                h, w = bgr_img.shape[:2]
                # Crop bottom 40% and right 60% (typical barcode location) + upscale
                for crop_box in [
                    (int(w*0.35), int(h*0.55), w, h),  # bottom-right
                    (int(w*0.25), int(h*0.50), w, h),  # slightly larger
                    (0, int(h*0.60), w, h),  # full width bottom strip
                ]:
                    x0, y0, x1, y1 = crop_box
                    crop = bgr_img[y0:y1, x0:x1]
                    if crop.size == 0 or crop.shape[0] < 80 or crop.shape[1] < 80:
                        continue
                    # upscale 2x for small barcode
                    crop_up = cv2.resize(crop, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
                    # try barcode detector on crop
                    if hasattr(cv2, "barcode") and hasattr(cv2.barcode, "BarcodeDetector"):
                        det2 = cv2.barcode.BarcodeDetector()
                        retval2, info2, type2, pts2 = det2.detectAndDecode(crop_up)
                        if retval2 and info2 is not None:
                            infos2 = info2 if isinstance(info2, (list, tuple, np.ndarray)) else [info2]
                            for ik, inf in enumerate(infos2):
                                if inf and str(inf).strip():
                                    decoded.append({"data": str(inf).strip(), "type": "EAN_13", "engine": "cv2.barcode[crop]", "bbox": []})
                                    break
                        if decoded:
                            break
                    # try QR detector on crop
                    if not decoded:
                        qrd2 = cv2.QRCodeDetector()
                        data2, _, _ = qrd2.detectAndDecode(crop_up)
                        if data2 and str(data2).strip():
                            decoded.append({"data": str(data2).strip(), "type": "QR_CODE", "engine": "cv2.QR[crop]", "bbox": []})
                            break
                # Also try grayscale + threshold enhance for barcode contrast
                if not decoded:
                    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
                    # Bottom-right crop gray with adaptive threshold
                    h, w = gray.shape
                    br_gray = gray[int(h*0.55):h, int(w*0.35):w]
                    if br_gray.size > 0:
                        _, thr = cv2.threshold(br_gray, 0, 255, cv2.THRESH_BINARY+cv2.THRESH_OTSU)
                        thr_bgr = cv2.cvtColor(thr, cv2.COLOR_GRAY2BGR)
                        if hasattr(cv2, "barcode") and hasattr(cv2.barcode, "BarcodeDetector"):
                            det3 = cv2.barcode.BarcodeDetector()
                            r3, i3, _, _ = det3.detectAndDecode(thr_bgr)
                            if r3 and i3 is not None:
                                infos3 = i3 if isinstance(i3, (list, tuple, np.ndarray)) else [i3]
                                for inf in infos3:
                                    if inf and str(inf).strip():
                                        decoded.append({"data": str(inf).strip(), "type": "EAN_13", "engine": "cv2.barcode[thresh]", "bbox": []})
                                        break
            except Exception as e:
                logger.debug(f"barcode crop retry failed: {e}")

        # Validate GTIN/EAN-13 checksum for numeric 13-digit codes
        for d in decoded:
            code = d["data"].strip()
            if code.isdigit() and len(code) in (8, 12, 13, 14):
                d["is_gtin_candidate"] = True
                if len(code) == 13:
                    # EAN-13 checksum: sum odd*1 + even*3, check = (10 - sum%10)%10
                    try:
                        digits = [int(ch) for ch in code]
                        s = sum(digits[i] * (1 if i % 2 == 0 else 3) for i in range(12))
                        check = (10 - (s % 10)) % 10
                        d["ean13_valid"] = (check == digits[12])
                        d["ean13_computed_check"] = check
                    except Exception:
                        d["ean13_valid"] = False
                else:
                    d["ean13_valid"] = None
            else:
                d["is_gtin_candidate"] = False

        return {
            "barcodes": decoded,
            "count": len(decoded),
            "primary_gtin": next((d["data"] for d in decoded if d.get("is_gtin_candidate")), None),
            "ean13_valid": any(d.get("ean13_valid") for d in decoded),
        }
    except Exception as e:
        logger.debug(f"barcode decode failed: {e}")
        return {"barcodes": [], "count": 0, "primary_gtin": None, "error": str(e)}


# ------------------------------------------------------------------
# 3) PDP Area Auto-Estimation
# Estimates Principal Display Panel surface area when pdp_area_cm2 not supplied
# Uses edge detection + largest contour polygon area
# ------------------------------------------------------------------
def estimate_pdp_area(bgr_img: np.ndarray, fallback_cm2: float = 200.0) -> Dict[str, Any]:
    """
    Estimate PDP area in cm2 from image.
    Strategy:
    - Convert to gray, blur, Canny edge
    - Dilate / close to connect package edges
    - Find largest contour approximating package boundary polygon
    - Compute bounding polygon area ratio vs full image
    - Convert to cm2: assume standard viewing distance/DPI mapping.
      If reference object not available, use fallback scaling: assume package fills
      ~60-90% of frame corresponds to typical 150-400 cm2 PDp.
    Returns dict with estimated_cm2 and method.
    """
    try:
        h, w = bgr_img.shape[:2]
        total_px = h * w
        gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)

        # Adaptive Canny thresholds via median
        v = np.median(blurred)
        lower = int(max(0, 0.66 * v))
        upper = int(min(255, 1.33 * v))
        edges = cv2.Canny(blurred, lower, upper)

        # Morph close to connect edges
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 15))
        closed = cv2.morphologyEx(edges, cv2.MORPH_CLOSE, kernel, iterations=2)
        # Dilate slightly
        dilated = cv2.dilate(closed, kernel, iterations=1)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return {"estimated_cm2": float(fallback_cm2), "method": "fallback_no_contour", "ratio": 1.0, "confidence": "low"}

        # Largest contour is assumed package
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        largest = contours[0]
        area_px = cv2.contourArea(largest)
        ratio = area_px / total_px if total_px else 1.0

        # If largest contour is >95% of image, likely image border itself, use next
        if ratio > 0.98 and len(contours) > 1:
            largest = contours[1]
            area_px = cv2.contourArea(largest)
            ratio = area_px / total_px

        # Approximate polygon to get bounding rect area for robustness
        peri = cv2.arcLength(largest, True)
        approx = cv2.approxPolyDP(largest, 0.02 * peri, True)
        # If polygon approximates rectangle, use boundingRect
        x, y, cw, ch = cv2.boundingRect(approx if len(approx) >= 4 else largest)
        rect_area = cw * ch
        # Prefer polygon area but use rect if more stable (when package is rectangular Lay's)
        used_px = max(area_px, rect_area * 0.85)

        # Convert px to cm2:
        # Without physical scale, estimate using typical smartphone capture at ~30cm distance.
        # Empirical: 1000px width ~ 10cm at 72dpi? Instead use pixel density heuristic:
        # Assume image captured at ~300 DPI equivalent => 1 cm = ~118 px (300/2.54)
        # But unknown; we calibrate so fallback_cm2 corresponds to full-frame.
        # Let estimated = fallback * ratio  (simple linear scaling)
        # Clamp to realistic 30 - 3000 cm2
        estimated = fallback_cm2 * max(0.35, min(ratio / 0.75, 1.6))  # normalize around 75% fill = fallback
        # Alternative: if we can estimate from DPI using EXIF, we lack EXIF, so keep linear.

        # More physical: compute mm per px from fallback assumption, then scale
        # If we trust fallback is reasonable, we just return scaled.
        estimated = float(np.clip(estimated, 30.0, 3000.0))

        # Confidence based on ratio
        if 0.4 < ratio < 0.95:
            conf = "high"
        elif 0.2 < ratio < 0.98:
            conf = "medium"
        else:
            conf = "low"

        return {
            "estimated_cm2": round(estimated, 1),
            "ratio": round(float(ratio), 4),
            "contour_area_px": int(area_px),
            "rect_area_px": int(rect_area),
            "polygon_vertices": len(approx),
            "confidence": conf,
            "method": "edge_contour_scaling",
            "fallback_used": False,
        }
    except Exception as e:
        logger.debug(f"PDP estimate failed: {e}")
        return {"estimated_cm2": float(fallback_cm2), "method": "fallback_exception", "error": str(e), "confidence": "low"}


# ------------------------------------------------------------------
# 4) Inkjet Preprocessing for dot-matrix / stamped text
# Morphological closing to connect dots + adaptive threshold
# ------------------------------------------------------------------
def preprocess_inkjet_region(gray_roi: np.ndarray) -> np.ndarray:
    """
    Enhance inkjet / dot-matrix printed regions (MRP, Mfg, Batch white boxes).
    - Upscale 2x, morphological closing, adaptive threshold, denoise
    """
    try:
        # upscale for dot connection
        scaled = cv2.resize(gray_roi, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        # close gaps between dots
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        closed = cv2.morphologyEx(scaled, cv2.MORPH_CLOSE, kernel, iterations=1)
        # adaptive threshold to sharpen
        thresh = cv2.adaptiveThreshold(closed, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        # slight blur to smooth
        denoised = cv2.medianBlur(thresh, 3)
        return denoised
    except Exception:
        return gray_roi


def detect_inkjet_boxes(bgr_img: np.ndarray) -> List[Dict[str, Any]]:
    """
    Heuristic: white rectangular boxes often contain inkjet MRP/Batch/Mfg.
    - Find bright white regions (high V, low S)
    Returns list of bbox polygons
    """
    try:
        hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
        # white: low saturation, high value
        lower_white = np.array([0, 0, 200])
        upper_white = np.array([180, 30, 255])
        mask = cv2.inRange(hsv, lower_white, upper_white)
        # close to get solid boxes
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 7))
        closed = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
        contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        boxes = []
        img_area = bgr_img.shape[0] * bgr_img.shape[1]
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < img_area * 0.005 or area > img_area * 0.15:
                continue
            x, y, w, h = cv2.boundingRect(cnt)
            ar = w / float(h) if h else 0
            if 1.5 < ar < 10 and w > 60 and h > 12:
                boxes.append({"x": int(x), "y": int(y), "w": int(w), "h": int(h), "area": int(area), "aspect": round(ar, 2)})
        # sort by area desc
        boxes.sort(key=lambda b: b["area"], reverse=True)
        return boxes[:5]
    except Exception as e:
        logger.debug(f"inkjet box detect failed: {e}")
        return []

