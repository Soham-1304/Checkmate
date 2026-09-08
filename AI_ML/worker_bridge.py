"""DoCA ML worker bridge — the ONLY integration point between AI_ML and the backend.

Supabase (via the FastAPI backend) is the source of truth for everything:
evidence, declarations, rules, verdicts, reports. This script is a stateless
worker: it pulls images, runs the local OCR extractor, and pushes the 12
canonical-key declarations back through the documented async-callback contract
(docs/RULEBOOK_CONTRACT.md). It stores nothing locally.

Lifecycle per run:
  login (officer JWT) -> POST /inspections/{id}/analyze -> run QUEUED
  -> GET evidence (presigned URLs) -> download + extract per image
  -> PUT .../analysis-runs/{rid}/declarations -> run COMPLETED
  (officer then runs POST .../evaluate for the verdict + auto-PDF)

Usage:
  python worker_bridge.py --inspection <uuid> --officer-email o@x --officer-password y
  python worker_bridge.py --inspection <uuid> --officer-email o@x --officer-password y \\
      --base-url http://localhost:8000/api/v1 --pkg-height-mm 150

Mapping honesty rules (demo-safe, grill-safe):
- mrp / net_quantity / net_quantity_unit come from OCR regex hits.
- The other 9 canonical keys are sent as machine_value=null, confidence=0.0,
  confidence_label=UNDETECTED. The backend downgrades their FAILs to REVIEW
  (low-confidence invariant), so missing OCR never fabricates a verdict.
- contrast_pass is measured (Otsu luminance ratio on the MRP/qty crop);
  unmeasurable -> None, never guessed. clearance_pass is always None
  (prototype limitation, declared in docs/backend-ai-integration.md).
"""

import argparse
import json
import sys
from typing import Any, Dict, List, Optional

import requests

from ocr_extract import TAX_RE, DeclarationExtractor, contrast_ratio_from_crop, detect_script

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

CONTRAST_THRESHOLD = 3.0  # mirrors check_logic min_contrast_ratio in seed_gazette.py


def conf_label(conf: Optional[float]) -> str:
    if conf is None or conf <= 0:
        return "UNDETECTED"
    if conf >= 0.85:
        return "HIGH"
    if conf >= 0.60:
        return "MEDIUM"
    return "LOW"


def crop_for_line(tuned_img, bbox: Dict[str, int], pad: int = 4):
    h, w, _ = tuned_img.shape
    x0 = max(0, bbox["x"] - pad)
    y0 = max(0, bbox["y"] - pad)
    x1 = min(w, bbox["x"] + bbox["width"] + pad)
    y1 = min(h, bbox["y"] + bbox["height"] + pad)
    return tuned_img[y0:y1, x0:x1]


def build_declarations(
    results: List[Dict[str, Any]], evidence_ids: List[Optional[str]]
) -> List[Dict[str, Any]]:
    """Merge per-image extraction into one declaration per canonical key.

    Best (highest-confidence) hit wins per field; fields with no hit anywhere
    go out as UNDETECTED nulls so the backend REVIEWs instead of guessing.
    """
    best_mrp, best_qty = None, None
    for res, evid in zip(results, evidence_ids):
        if res["mrp_line"] and (best_mrp is None or res["mrp_line"]["confidence"] > best_mrp[0]["confidence"]):
            best_mrp = (res["mrp_line"], res, evid)
        if res["qty_line"] and (best_qty is None or res["qty_line"]["confidence"] > best_qty[0]["confidence"]):
            best_qty = (res["qty_line"], res, evid)

    decls: Dict[str, Dict[str, Any]] = {}
    for key in CANONICAL_KEYS:
        decls[key] = {
            "canonical_key": key,
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

    if best_mrp:
        line, res, evid = best_mrp
        tax_hit = bool(TAX_RE.search(line["text"]))
        ratio = contrast_ratio_from_crop(crop_for_line(res["tuned_image"], line["bbox"]))
        decls["mrp"] = {
            "canonical_key": "mrp",
            "machine_value": f"{line['text']}{' [tax legend seen]' if tax_hit else ''}",
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
        font_mm = round(line["bbox"]["height"] * res["px_to_mm"], 2)
        ratio = contrast_ratio_from_crop(crop_for_line(res["tuned_image"], line["bbox"]))
        cpass = (ratio >= CONTRAST_THRESHOLD) if ratio is not None else None
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
            "canonical_key": "net_quantity_unit",
            "machine_value": res["qty_unit"],
            "confidence": line["confidence"],
            "confidence_label": conf_label(line["confidence"]),
            "bounding_box": line["bbox"],
            "font_size_mm": None,
            "contrast_pass": cpass,
            "script_language": line["script"],
            "clearance_pass": None,
            "evidence_id": evid,
        }

    return [decls[k] for k in CANONICAL_KEYS]


def main() -> int:
    ap = argparse.ArgumentParser(description="DoCA ML worker: OCR bridge to backend.")
    ap.add_argument("--inspection", required=True, help="Inspection UUID")
    ap.add_argument("--base-url", default="http://localhost:8000/api/v1")
    ap.add_argument("--officer-email", required=True)
    ap.add_argument("--officer-password", required=True)
    ap.add_argument("--pkg-height-mm", type=float, default=150.0)
    ap.add_argument("--pipeline-version", default="doca-worker-1.0")
    ap.add_argument("--model-version", default="easyocr-en-hi-tier1")
    args = ap.parse_args()

    base = args.base_url.rstrip("/")
    sess = requests.Session()

    login = sess.post(f"{base}/auth/login/json", json={"email": args.officer_email, "password": args.officer_password})
    if login.status_code != 200:
        print(f"login failed: {login.status_code} {login.text}", file=sys.stderr)
        return 1
    sess.headers["Authorization"] = f"Bearer {login.json()['access_token']}"

    insp = args.inspection
    run = sess.post(f"{base}/inspections/{insp}/analyze", json={"pipeline_version": args.pipeline_version, "model_version": args.model_version})
    if run.status_code not in (200, 201):
        print(f"analyze failed: {run.status_code} {run.text}", file=sys.stderr)
        return 1
    run_id = run.json()["id"]
    print(f"run {run_id} ({'reused QUEUED' if run.status_code == 200 else 'new'})")

    ev = sess.get(f"{base}/inspections/{insp}/evidence")
    if ev.status_code != 200:
        print(f"evidence list failed: {ev.status_code} {ev.text}", file=sys.stderr)
        return 1
    items = ev.json()
    if not items:
        print("no evidence images on inspection — upload first", file=sys.stderr)
        return 1

    extractor = DeclarationExtractor()
    results, ev_ids, raw_lines = [], [], []
    for item in items:
        url = item.get("file_url")
        if not url:
            print(f"skipping evidence {item['id']}: no file_url", file=sys.stderr)
            continue
        img = sess.get(url) if url.startswith("http") else sess.get(f"{base}{url}")
        if img.status_code != 200:
            print(f"download failed for {item['id']}: {img.status_code}", file=sys.stderr)
            continue
        res = extractor.extract(img.content, pkg_height_mm=args.pkg_height_mm)
        results.append(res)
        ev_ids.append(item["id"])
        raw_lines.append({"evidence_id": item["id"], "view_type": item.get("view_type"), "lines": res["lines"]})
        print(f"{item.get('view_type')}: {len(res['lines'])} lines, avg_conf={res['avg_confidence']}")

    if not results:
        print("no images could be downloaded/extracted", file=sys.stderr)
        return 1

    declarations = build_declarations(results, ev_ids)
    payload = {
        "declarations": declarations,
        "raw_ocr_output": {
            "engine": f"easyocr[{','.join(extractor.langs)}]",
            "pipeline_version": args.pipeline_version,
            "images": raw_lines,
        },
    }
    put = sess.put(f"{base}/inspections/{insp}/analysis-runs/{run_id}/declarations", json=payload)
    print(f"PUT declarations: {put.status_code}")
    print(json.dumps(put.json(), indent=2, default=str))
    return 0 if put.status_code == 200 else 1


if __name__ == "__main__":
    sys.exit(main())
