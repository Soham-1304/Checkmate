"""
Real-time image quality gate for Legal Metrology pipeline (§3.2).
Runs BEFORE OCR to decide PASS -> analyse, REVIEW -> officer check, REJECT -> recapture.
"""
import cv2
import numpy as np
from typing import Dict, Any

def check_image_quality(bgr_img: np.ndarray) -> Dict[str, Any]:
    h, w = bgr_img.shape[:2]
    total = h * w
    gray = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2GRAY)

    # 1. Blur (Laplacian variance) - real-time friendly
    lap_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    # thresholds tuned for 720p package photos
    if lap_var > 180: blur_status, blur_score = "sharp", 1.0
    elif lap_var > 90: blur_status, blur_score = "acceptable", 0.7
    elif lap_var > 35: blur_status, blur_score = "soft", 0.4
    else: blur_status, blur_score = "blurry", 0.1

    # 2. Resolution
    if total >= 900*700: res_status, res_score = "high", 1.0
    elif total >= 640*480: res_status, res_score = "medium", 0.7
    elif total >= 400*300: res_status, res_score = "low", 0.4
    else: res_status, res_score = "too_low", 0.1

    # 3. Glare / over-exposure (% pixels V>245 and S low)
    hsv = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2HSV)
    # bright near-white pixels
    glare_mask = cv2.inRange(hsv, np.array([0, 0, 230]), np.array([180, 30, 255]))
    glare_ratio = float(cv2.countNonZero(glare_mask) / total) if total else 0
    if glare_ratio > 0.12: glare_status, glare_score = "heavy_glare", 0.2
    elif glare_ratio > 0.06: glare_status, glare_score = "moderate_glare", 0.6
    elif glare_ratio > 0.02: glare_status, glare_score = "slight_glare", 0.85
    else: glare_status, glare_score = "no_glare", 1.0

    # 4. Orientation / skew: estimate text orientation via minAreaRect of edges (fast)
    # Not full doc-unwarp, just flag severe skew >12deg
    try:
        edges = cv2.Canny(gray, 50, 150)
        coords = np.column_stack(np.where(edges > 0))
        skew_deg = 0.0
        skew_status = "ok"
        skew_score = 1.0
        if len(coords) > 500:
            rect = cv2.minAreaRect(coords)
            angle = rect[-1]
            # convert to 0-90 range
            if angle < -45: angle = -(90 + angle)
            else: angle = -angle
            skew_deg = float(angle)
            if abs(skew_deg) > 12: skew_status, skew_score = "skewed", 0.5
            elif abs(skew_deg) > 7: skew_status, skew_score = "slight_skew", 0.8
    except Exception:
        skew_deg, skew_status, skew_score = 0.0, "unknown", 0.9

    # 5. Underexposure (dark)
    mean_v = float(np.mean(hsv[:, :, 2]))
    if mean_v < 55: exp_status, exp_score = "dark", 0.4
    elif mean_v < 80: exp_status, exp_score = "dim", 0.7
    elif mean_v > 230: exp_status, exp_score = "washed", 0.5
    else: exp_status, exp_score = "good_exposure", 1.0

    # Aggregate 0-1
    overall = float(np.mean([blur_score, res_score, glare_score, skew_score, exp_score]))
    # Gate
    if overall >= 0.75 and blur_score >= 0.6 and res_score >= 0.6:
        gate = "PASS"  # go to OCR
    elif overall >= 0.45 and blur_score >= 0.3:
        gate = "REVIEW"  # low-confidence, officer verifies
    else:
        gate = "REJECT"  # ask recapture

    return {
        "gate": gate,  # PASS / REVIEW / REJECT
        "overall_score": round(overall, 3),
        "laplacian_variance": round(lap_var, 1),
        "blur": {"status": blur_status, "score": blur_score, "lap_var": round(lap_var, 1)},
        "resolution": {"status": res_status, "score": res_score, "pixels": int(total), "w": int(w), "h": int(h)},
        "glare": {"status": glare_status, "score": glare_score, "ratio": round(glare_ratio, 4)},
        "skew": {"status": skew_status, "score": skew_score, "degrees": round(float(skew_deg), 1)},
        "exposure": {"status": exp_status, "score": exp_score, "mean_v": round(mean_v, 1)},
        "quality_flags": [k for k, v in {"blur": blur_status, "glare": glare_status, "skew": skew_status, "exposure": exp_status}.items() if v not in ("sharp", "acceptable", "no_glare", "ok", "good_exposure", "high", "medium")],
    }
