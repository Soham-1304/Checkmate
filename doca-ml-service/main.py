"""
Legal Metrology ML Microservice - Production FastAPI Entrypoint.

Provides:
- GET  /health           -> service health, rules version, available OCR engines
- POST /predict          -> accepts JSON {"image_url": "..."} OR multipart file upload,
                            runs full spatial OCR + packaging diagnostics + compliance check
- POST /api/v1/inspect   -> officer field app upload contract matching api/main.py
- GET  /api/v1/inspection/{id} -> inspection audit record
- GET  /api/v1/inspections     -> list recent inspections
"""

import os
import uuid
import shutil
import logging
import json
from pathlib import Path
from typing import Dict, Any, Optional, List

import cv2
import httpx
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# Local engine imports
from engine.ocr_pipeline import PackagingOCRPipeline, get_available_ocr_engines
from engine.rules_engine import LegalMetrologyRulesEngine
from engine.text_parser import LegalMetrologyTextParser
from engine.db_schema import InspectionRecordDB, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("doca_ml_service")

# Paths and configuration
BASE_DIR = Path(__file__).parent.resolve()
SCHEMA_PATH = str(BASE_DIR / "config" / "data2.json")
DB_URL = os.getenv("DATABASE_URL", "sqlite:///" + str(BASE_DIR / "legal_metrology.db"))
UPLOAD_DIR = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploaded_images"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Database session setup
try:
    SessionLocal = init_db(DB_URL)
except Exception as e:
    logger.warning(f"Database initialization fallback ({e}). Using in-memory SQLite.")
    SessionLocal = init_db("sqlite:///:memory:")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Recursive Numpy Sanitization
def sanitize_numpy(obj: Any) -> Any:
    """Recursively convert all numpy types, ndarrays, sets, and special floats to native Python primitives for JSON compliance."""
    import math
    if isinstance(obj, dict):
        return {
            str(sanitize_numpy(k)) if not isinstance(k, (str, int, float, bool)) else k: sanitize_numpy(v)
            for k, v in obj.items()
        }
    elif isinstance(obj, (list, tuple)):
        return [sanitize_numpy(x) for x in obj]
    elif isinstance(obj, (set, frozenset)):
        return [sanitize_numpy(x) for x in obj]
    elif isinstance(obj, np.bool_):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        f = float(obj)
        return None if math.isnan(f) or math.isinf(f) else f
    elif isinstance(obj, np.ndarray):
        return sanitize_numpy(obj.tolist())
    elif isinstance(obj, np.generic):
        item = obj.item()
        return sanitize_numpy(item) if not isinstance(item, np.generic) else str(item)
    return obj

# Singleton engine holders
_rules_engine: Optional[LegalMetrologyRulesEngine] = None
_ocr_pipeline: Optional[PackagingOCRPipeline] = None
_text_parser = LegalMetrologyTextParser()

def get_rules_engine() -> LegalMetrologyRulesEngine:
    global _rules_engine
    if _rules_engine is None:
        _rules_engine = LegalMetrologyRulesEngine(SCHEMA_PATH)
    return _rules_engine

def get_ocr_pipeline() -> PackagingOCRPipeline:
    global _ocr_pipeline
    if _ocr_pipeline is None:
        _ocr_pipeline = PackagingOCRPipeline()
    return _ocr_pipeline

# Category Auto-Inference Helper
def infer_category(mapped: Dict[str, Any], product_context: Optional[Dict[str, Any]]) -> tuple[str, bool]:
    valid_categories = [
        "food_and_beverages",
        "garments_and_hosiery",
        "cosmetics_and_toiletries",
        "cement",
        "electrical_and_electronics",
        "general_packaged_goods",
    ]
    if product_context and product_context.get("category") in valid_categories:
        return product_context["category"], False

    generic = str(
        mapped.get("generic_name", {}).get("value", "")
        if isinstance(mapped.get("generic_name"), dict)
        else mapped.get("generic_name", "")
    ).lower()

    if any(k in generic for k in ["chip", "biscuit", "namkeen", "oil", "tea", "potato", "maggi", "lays", "cookie", "juice"]):
        return "food_and_beverages", True
    if any(k in generic for k in ["shirt", "garment", "dress", "size", "pant", "cotton"]):
        return "garments_and_hosiery", True
    if any(k in generic for k in ["cement"]):
        return "cement", True
    if "fssai_lic_no" in mapped:
        return "food_and_beverages", True

    return "general_packaged_goods", True

# Fetch image bytes helper
async def fetch_image_from_url(url: str, timeout: float = 25.0) -> bytes:
    """Fetch image bytes from public/presigned HTTP/HTTPS URL or decode base64 data URI."""
    if not url or not url.strip():
        raise HTTPException(status_code=400, detail="Empty image URL provided.")

    clean_url = url.strip()

    # Support base64 data URI (e.g. data:image/jpeg;base64,/9j/4AAQSkZJRg...)
    if clean_url.startswith("data:image/") and ";base64," in clean_url:
        import base64
        try:
            _, b64_data = clean_url.split(";base64,", 1)
            return base64.b64decode(b64_data)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to decode base64 image data URI: {exc}")

    # Support raw base64 string
    if clean_url.startswith("base64,"):
        import base64
        try:
            return base64.b64decode(clean_url[7:])
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to decode base64 image string: {exc}")

    if not clean_url.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image URL scheme in '{clean_url[:30]}...'. Expected 'http://', 'https://', or 'data:image/...;base64,'",
        )

    try:
        headers = {"User-Agent": "DoCA-Legal-Metrology-ML-Service/2.0"}
        async with httpx.AsyncClient(follow_redirects=True, timeout=timeout, headers=headers) as client:
            resp = await client.get(clean_url)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to fetch image from URL. HTTP status code: {resp.status_code}",
                )
            if not resp.content:
                raise HTTPException(status_code=400, detail="Fetched image from URL is empty (0 bytes).")
            return resp.content
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Network error while fetching image URL: {exc}",
        )

# FastAPI Application
app = FastAPI(
    title="Legal Metrology Compliance Microservice",
    version="2.0.0",
    description=(
        "Production AI/ML and Rules microservice for Legal Metrology (Packaged Commodities) Rules, 2011. "
        "Supports PaddleOCR with RapidOCR (ONNXRuntime) and EasyOCR fallbacks."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas
class PredictJsonRequest(BaseModel):
    image_url: Optional[str] = Field(None, description="Public or presigned URL to the package image (Supabase/S3/external)")
    category: Optional[str] = Field("general_packaged_goods", description="Commodity category")
    pdp_area_cm2: Optional[float] = Field(200.0, description="Assumed Principal Display Panel area in cm²")
    auto_pdp: Optional[bool] = Field(True, description="Whether to auto-estimate PDP area via contour segmentation")
    product_info: Optional[str] = Field(None, description="Optional JSON string with product metadata")


@app.on_event("startup")
def startup_event():
    """Pre-warm Legal Metrology Rules Engine and OCR Pipeline on application boot."""
    logger.info("Starting up DoCA Legal Metrology ML Service...")
    try:
        eng = get_rules_engine()
        ocr = get_ocr_pipeline()
        logger.info(
            f"Initialization successful. OCR Engine: {ocr.engine_name} | "
            f"Rules Version: {eng.schema.get('source_metadata', {}).get('rules_notification')}"
        )
    except Exception as exc:
        logger.warning(f"Engine initialization warning on startup: {exc}")


# --- Endpoints ---

@app.get("/health")
def health() -> Dict[str, Any]:
    """Health check endpoint returning status, rules version, active OCR engine, and available engines."""
    eng = get_rules_engine()
    ocr = get_ocr_pipeline()
    available_engines = get_available_ocr_engines()
    rules_ver = eng.schema.get("source_metadata", {}).get("rules_notification")
    return {
        "status": "ok",
        "rules_version": rules_ver,
        "rule_version": rules_ver,
        "rules_notification": rules_ver,
        "available_engines": available_engines,
        "available_ocr_engines": available_engines,
        "active_ocr_engine": ocr.engine_name,
        "service": "doca-ml-service",
        "schema_file": Path(eng.schema_path).name,
        "database": DB_URL,
    }


@app.post("/predict")
async def predict(
    request: Request,
    file: Optional[UploadFile] = File(None),
    image_url: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    pdp_area_cm2: Optional[float] = Form(None),
    auto_pdp: Optional[bool] = Form(None),
    product_info: Optional[str] = Form(None),
) -> Dict[str, Any]:
    """
    Unified Prediction Endpoint.
    Accepts:
      - JSON body: {"image_url": "https://...", "category": "food_and_beverages", "pdp_area_cm2": 200.0}
      - Multipart form: file upload (file: UploadFile) OR image_url form parameter.

    Runs:
      1. Image Ingestion & Quality Gate (blur, glare, resolution, skew, exposure)
      2. Spatial OCR (PaddleOCR or RapidOCR/EasyOCR fallback)
      3. Text Parsing & Declaration Structuring
      4. Visual Veg/Non-Veg HSV + Contour Geometry Validation
      5. Barcode / QR Decoding (EAN-13 GTIN validation)
      6. PDP Surface Area Estimation
      7. Legal Metrology Rules Validation (Rule 6, Rule 7 font height, Rule 8, Rule 9, Section 36)
    """
    content_type = request.headers.get("content-type", "")
    image_bytes: Optional[bytes] = None
    target_filename = "package.jpg"
    req_category = "general_packaged_goods"
    req_pdp = 200.0
    req_auto_pdp = True
    req_product_info = None

    # Handle JSON Request
    if "application/json" in content_type:
        try:
            body = await request.json()
        except Exception:
            raise HTTPException(status_code=400, detail="Malformed JSON body.")

        url = body.get("image_url") or request.query_params.get("image_url")
        if not url:
            raise HTTPException(status_code=400, detail="Missing 'image_url' in JSON request body.")

        image_bytes = await fetch_image_from_url(url)
        target_filename = Path(url.split("?")[0]).name or "url_image.jpg"
        if body.get("category"):
            req_category = body["category"]
        if body.get("pdp_area_cm2") is not None:
            req_pdp = float(body["pdp_area_cm2"])
        if body.get("auto_pdp") is not None:
            req_auto_pdp = bool(body["auto_pdp"])
        req_product_info = body.get("product_info")

    # Handle Multipart / Form Request
    else:
        query_url = request.query_params.get("image_url")
        if file is not None and file.filename:
            target_filename = Path(file.filename).name or "package.jpg"
            image_bytes = await file.read()
        elif image_url and image_url.strip():
            image_bytes = await fetch_image_from_url(image_url.strip())
            target_filename = Path(image_url.split("?")[0]).name or "url_image.jpg"
        elif query_url and query_url.strip():
            image_bytes = await fetch_image_from_url(query_url.strip())
            target_filename = Path(query_url.split("?")[0]).name or "url_image.jpg"
        else:
            # Check form directly if FastAPI dependency didn't bind
            try:
                form = await request.form()
                if "file" in form and hasattr(form["file"], "filename") and form["file"].filename:
                    upload_f = form["file"]
                    target_filename = Path(upload_f.filename).name or "package.jpg"
                    image_bytes = await upload_f.read()
                elif "image_url" in form and str(form["image_url"]).strip():
                    url_str = str(form["image_url"]).strip()
                    image_bytes = await fetch_image_from_url(url_str)
                    target_filename = Path(url_str.split("?")[0]).name or "url_image.jpg"
            except Exception:
                pass

        if image_bytes is None:
            raise HTTPException(
                status_code=400,
                detail="No image provided. Pass multipart 'file', form 'image_url', query parameter '?image_url=...', or JSON {'image_url': '...'}.",
            )

        if category:
            req_category = category
        if pdp_area_cm2 is not None:
            req_pdp = float(pdp_area_cm2)
        if auto_pdp is not None:
            req_auto_pdp = bool(auto_pdp)
        req_product_info = product_info

    if req_auto_pdp and req_pdp <= 0:
        req_pdp = 200.0
    if req_pdp <= 0 and not req_auto_pdp:
        raise HTTPException(status_code=422, detail="pdp_area_cm2 must be > 0 or set auto_pdp=true")

    # Save to temporary path for CV / OCR pipeline
    file_id = uuid.uuid4().hex[:8]
    safe_name = f"{file_id}_{target_filename}"
    temp_path = os.path.join(UPLOAD_DIR, safe_name)
    with open(temp_path, "wb") as f:
        f.write(image_bytes)

    try:
        # Run OCR Pipeline
        ocr_pipeline = get_ocr_pipeline()
        ocr_output = ocr_pipeline.extract_spatial_text(
            temp_path,
            assumed_pdp_area_cm2=req_pdp,
            auto_pdp=req_auto_pdp,
            enable_inkjet=True,
            enable_barcode=True,
        )

        effective_pdp = req_pdp
        if req_auto_pdp and ocr_output.get("pdp_estimated", {}).get("estimated_cm2"):
            effective_pdp = float(ocr_output["pdp_estimated"]["estimated_cm2"])

        raw_text = ocr_output.get("extracted_raw_text", "")
        detections = ocr_output.get("raw_ocr_detections", [])

        # Parse text into declarations
        mapped_fields = _text_parser.parse_raw_text(raw_text, detections=detections)

        # Product Context Parsing
        parsed_context = None
        if req_product_info and str(req_product_info).strip():
            try:
                parsed_context = (
                    json.loads(req_product_info)
                    if str(req_product_info).strip().startswith("{")
                    else {"category": str(req_product_info).strip()}
                )
            except Exception:
                parsed_context = {"raw": req_product_info}

        # Auto-infer category if needed
        inferred_cat = req_category
        inferred_flag = False
        if not req_category or req_category == "general_packaged_goods":
            ic, flag = infer_category(mapped_fields, parsed_context)
            if flag and ic != "general_packaged_goods":
                inferred_cat = ic
                inferred_flag = True
        elif parsed_context and parsed_context.get("category"):
            inferred_cat = parsed_context["category"]

        # Integrate visual signals
        visual = ocr_output.get("visual_signals", {})
        if visual.get("visual_veg_detected") and "veg_nonveg_symbol" not in mapped_fields:
            mapped_fields["veg_nonveg_symbol"] = {
                "value": visual.get("detected_symbol") or "Vegetarian - Green Dot (HSV+contour)",
                "visual": True,
                "geometry": visual.get("veg_geometry_validated"),
            }
        elif visual.get("visual_nonveg_detected") and "veg_nonveg_symbol" not in mapped_fields:
            mapped_fields["veg_nonveg_symbol"] = {
                "value": visual.get("detected_symbol") or "Non-Vegetarian - Brown Dot (HSV+contour)",
                "visual": True,
                "geometry": visual.get("nonveg_geometry_validated"),
            }

        # Integrate barcode signals
        barcode_signals = ocr_output.get("barcode_signals", {})
        if barcode_signals and barcode_signals.get("primary_gtin"):
            mapped_fields["gtin_barcode"] = {
                "value": barcode_signals["primary_gtin"],
                "ean13_valid": barcode_signals.get("ean13_valid"),
                "barcodes": barcode_signals.get("barcodes", []),
            }

        quality = ocr_output.get("quality_signals", {})

        # Execute Legal Metrology Rules Engine
        rules_payload = {
            "category": inferred_cat,
            "category_inferred": inferred_flag,
            "pdp_area_cm2": effective_pdp,
            "pdp_estimated": ocr_output.get("pdp_estimated"),
            "measured_font_height_mm": ocr_output["spatial_metrics"]["measured_max_font_height_mm"],
            "barcode_signals": barcode_signals,
            "quality_signals": quality,
            "avg_ocr_confidence": ocr_output.get("avg_ocr_confidence"),
            "image_metadata": ocr_output.get("image_metadata"),
            "extracted_fields": mapped_fields,
            "product_context": parsed_context,
        }

        report = get_rules_engine().validate_package(rules_payload)
        inspection_id = f"INSP-{file_id.upper()}"

        response_payload = {
            "inspection_id": inspection_id,
            "status": report["status"],
            "category": inferred_cat,
            "category_inferred": inferred_flag,
            "total_violations": report["total_violations"],
            "penalty": report.get("penalty"),
            "warnings": report.get("warnings", []),
            "computed": report.get("computed", {}),
            "mapped_fields": mapped_fields,
            "violations": report["violations"],
            "passed_checks": report["passed_checks"],
            "spatial_metrics": ocr_output["spatial_metrics"],
            "quality_signals": quality,
            "avg_confidence": ocr_output.get("avg_ocr_confidence"),
            "px_to_mm_ratio": ocr_output.get("px_to_mm_ratio"),
            "px_to_mm_ratio_estimated": ocr_output.get("px_to_mm_ratio_estimated"),
            "image_metadata": ocr_output.get("image_metadata"),
            "visual_signals": visual,
            "barcode_signals": barcode_signals,
            "pdp_estimated": ocr_output.get("pdp_estimated"),
            "inkjet_boxes": ocr_output.get("inkjet_boxes", []),
            "annotated_image_path": ocr_output.get("annotated_image_path"),
            "effective_pdp_cm2": float(effective_pdp),
            "raw_ocr_detections": detections,
            "extracted_raw_text": raw_text,
            "ocr_engine_used": ocr_output.get("ocr_engine_used"),
            "rule_version": get_rules_engine().schema.get("source_metadata", {}).get("rules_notification"),
            "amendments": get_rules_engine().schema.get("source_metadata", {}).get("amendments_tracked", []),
        }

        return sanitize_numpy(response_payload)

    except HTTPException:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        raise
    except (ValueError, cv2.error) as img_err:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        logger.warning(f"Prediction image decoding error: {img_err}")
        raise HTTPException(status_code=400, detail=f"Invalid or unreadable image: {img_err}")
    except Exception as e:
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass
        logger.exception("Prediction processing error")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/inspect", response_model=Dict[str, Any])
async def inspect_package(
    category: str = Form("food_and_beverages"),
    pdp_area_cm2: float = Form(200.0),
    auto_pdp: bool = Form(False),
    product_info: str = Form(""),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Officer Field Inspection API contract matching legal_metrology_engine/api/main.py.
    Persists inspection records to SQLite audit log with full traceability.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    product_context: Optional[Dict[str, Any]] = None
    if product_info and product_info.strip():
        try:
            product_context = (
                json.loads(product_info)
                if product_info.strip().startswith("{")
                else {"category": product_info.strip()}
            )
        except Exception:
            product_context = {"raw": product_info}

    file_id = uuid.uuid4().hex[:8]
    safe_name = Path(file.filename).name
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}_{safe_name}")

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    if auto_pdp and pdp_area_cm2 <= 0:
        pdp_area_cm2 = 200.0
    if pdp_area_cm2 <= 0 and not auto_pdp:
        raise HTTPException(status_code=422, detail="pdp_area_cm2 must be > 0 or set auto_pdp=true")

    try:
        ocr_pipeline = get_ocr_pipeline()
        ocr_output = ocr_pipeline.extract_spatial_text(
            file_path,
            assumed_pdp_area_cm2=pdp_area_cm2,
            auto_pdp=True,
            enable_inkjet=True,
            enable_barcode=True,
        )

        effective_pdp = pdp_area_cm2
        if auto_pdp and ocr_output.get("pdp_estimated", {}).get("estimated_cm2"):
            effective_pdp = float(ocr_output["pdp_estimated"]["estimated_cm2"])

        raw_text = ocr_output.get("extracted_raw_text", "")
        detections = ocr_output.get("raw_ocr_detections", [])
        mapped_fields = _text_parser.parse_raw_text(raw_text, detections=detections)

        inferred_cat = category
        inferred_flag = False
        if not category or category == "general_packaged_goods":
            ic, flag = infer_category(mapped_fields, product_context)
            if flag and ic != "general_packaged_goods":
                inferred_cat = ic
                inferred_flag = True
        elif product_context and product_context.get("category"):
            inferred_cat = product_context["category"]

        visual = ocr_output.get("visual_signals", {})
        if visual.get("visual_veg_detected") and "veg_nonveg_symbol" not in mapped_fields:
            mapped_fields["veg_nonveg_symbol"] = {
                "value": visual.get("detected_symbol") or "Vegetarian - Green Dot (HSV+contour)",
                "visual": True,
                "geometry": visual.get("veg_geometry_validated"),
            }
        elif visual.get("visual_nonveg_detected") and "veg_nonveg_symbol" not in mapped_fields:
            mapped_fields["veg_nonveg_symbol"] = {
                "value": visual.get("detected_symbol") or "Non-Vegetarian - Brown Dot (HSV+contour)",
                "visual": True,
                "geometry": visual.get("nonveg_geometry_validated"),
            }

        barcode_signals = ocr_output.get("barcode_signals", {})
        if barcode_signals and barcode_signals.get("primary_gtin"):
            mapped_fields["gtin_barcode"] = {
                "value": barcode_signals["primary_gtin"],
                "ean13_valid": barcode_signals.get("ean13_valid"),
                "barcodes": barcode_signals.get("barcodes", []),
            }

        quality = ocr_output.get("quality_signals", {})

        rules_payload = {
            "category": inferred_cat,
            "category_inferred": inferred_flag,
            "pdp_area_cm2": effective_pdp,
            "pdp_estimated": ocr_output.get("pdp_estimated"),
            "measured_font_height_mm": ocr_output["spatial_metrics"]["measured_max_font_height_mm"],
            "barcode_signals": barcode_signals,
            "quality_signals": quality,
            "avg_ocr_confidence": ocr_output.get("avg_ocr_confidence"),
            "image_metadata": ocr_output.get("image_metadata"),
            "extracted_fields": mapped_fields,
            "product_context": product_context,
        }

        report = get_rules_engine().validate_package(rules_payload)
        inspection_id = f"INSP-{file_id.upper()}"
        eng = get_rules_engine()

        # Persist to database if available
        try:
            record = InspectionRecordDB(
                inspection_id=inspection_id,
                image_file_path=file_path,
                annotated_image_path=ocr_output.get("annotated_image_path"),
                pdp_area_cm2=float(effective_pdp),
                rule_version=eng.schema.get("source_metadata", {}).get("rules_notification"),
                category=inferred_cat,
                category_inferred={"inferred": inferred_flag, "original": category} if inferred_flag else None,
                raw_ocr_data=sanitize_numpy(ocr_output["raw_ocr_detections"]),
                extracted_text_summary=raw_text,
                image_metadata=sanitize_numpy(ocr_output.get("image_metadata")),
                spatial_metrics=sanitize_numpy(ocr_output.get("spatial_metrics")),
                quality_signals=sanitize_numpy(quality),
                visual_signals=sanitize_numpy(visual),
                barcode_signals=sanitize_numpy(barcode_signals),
                pdp_estimated=sanitize_numpy(ocr_output.get("pdp_estimated")),
                inkjet_boxes=sanitize_numpy(ocr_output.get("inkjet_boxes")),
                mapped_fields=sanitize_numpy(mapped_fields),
                product_context=sanitize_numpy(product_context),
                compliance_status=report["status"],
                total_violations=report["total_violations"],
                violations_detail=sanitize_numpy(report["violations"]),
                passed_checks_detail=sanitize_numpy(report["passed_checks"]),
                warnings_detail=sanitize_numpy(report.get("warnings", [])),
                computed_detail=sanitize_numpy(report.get("computed", {})),
                penalty_detail=sanitize_numpy(report.get("penalty")),
            )
            db.add(record)
            db.commit()
        except Exception as db_err:
            logger.warning(f"Inspection record persistence skipped ({db_err})")
            db.rollback()

        result = {
            "inspection_id": inspection_id,
            "status": report["status"],
            "category": inferred_cat,
            "category_inferred": inferred_flag,
            "total_violations": report["total_violations"],
            "penalty": report.get("penalty"),
            "warnings": report.get("warnings", []),
            "computed": report.get("computed", {}),
            "mapped_fields": mapped_fields,
            "violations": report["violations"],
            "passed_checks": report["passed_checks"],
            "spatial_metrics": ocr_output["spatial_metrics"],
            "quality_signals": quality,
            "avg_confidence": ocr_output.get("avg_ocr_confidence"),
            "px_to_mm_ratio": ocr_output.get("px_to_mm_ratio"),
            "px_to_mm_ratio_estimated": ocr_output.get("px_to_mm_ratio_estimated"),
            "image_metadata": ocr_output.get("image_metadata"),
            "visual_signals": visual,
            "barcode_signals": barcode_signals,
            "pdp_estimated": ocr_output.get("pdp_estimated"),
            "inkjet_boxes": ocr_output.get("inkjet_boxes", []),
            "annotated_image_path": ocr_output.get("annotated_image_path"),
            "effective_pdp_cm2": float(effective_pdp),
            "rule_version": eng.schema.get("source_metadata", {}).get("rules_notification"),
            "amendments": eng.schema.get("source_metadata", {}).get("amendments_tracked", []),
        }

        return sanitize_numpy(result)

    except HTTPException:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        raise
    except (ValueError, cv2.error) as img_err:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        logger.warning(f"Inspect package image decoding error: {img_err}")
        raise HTTPException(status_code=400, detail=f"Invalid or unreadable image file: {img_err}")
    except Exception as e:
        db.rollback()
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        logger.exception("inspect_package failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/inspection/{inspection_id}")
async def get_inspection_record(inspection_id: str, db: Session = Depends(get_db)):
    """Retrieve full audit record for a past inspection."""
    record = db.query(InspectionRecordDB).filter(InspectionRecordDB.inspection_id == inspection_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Inspection record not found")
    return sanitize_numpy({
        "inspection_id": record.inspection_id,
        "created_at": record.created_at.isoformat() if hasattr(record.created_at, "isoformat") else record.created_at,
        "compliance_status": record.compliance_status,
        "total_violations": record.total_violations,
        "category": record.category,
        "pdp_area_cm2": record.pdp_area_cm2,
        "rule_version": record.rule_version,
        "image_file_path": record.image_file_path,
        "annotated_image_path": record.annotated_image_path,
        "raw_ocr_data": record.raw_ocr_data,
        "extracted_text_summary": record.extracted_text_summary,
        "mapped_fields": record.mapped_fields,
        "product_context": record.product_context,
        "violations": record.violations_detail,
        "passed_checks": record.passed_checks_detail,
        "warnings": record.warnings_detail,
        "computed": record.computed_detail,
        "quality_signals": record.quality_signals,
        "visual_signals": record.visual_signals,
        "barcode_signals": record.barcode_signals,
        "spatial_metrics": record.spatial_metrics,
        "image_metadata": record.image_metadata,
        "penalty": record.penalty_detail,
    })


@app.get("/api/v1/inspections")
async def list_inspections(limit: int = 20, db: Session = Depends(get_db)):
    """List recent inspection records."""
    rows = db.query(InspectionRecordDB).order_by(InspectionRecordDB.id.desc()).limit(limit).all()
    return sanitize_numpy([
        {
            "inspection_id": r.inspection_id,
            "created_at": r.created_at.isoformat() if hasattr(r.created_at, "isoformat") else r.created_at,
            "compliance_status": r.compliance_status,
            "total_violations": r.total_violations,
            "category": r.category,
            "pdp_area_cm2": r.pdp_area_cm2,
            "quality_gate": (r.quality_signals or {}).get("gate"),
        }
        for r in rows
    ])


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 7860))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
