import os
import re
import cv2
import numpy as np
import easyocr
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

# ==========================================
# 1. DATABASE SETUP (SQLAlchemy + SQLite)
# ==========================================

DATABASE_URL = "sqlite:///./inspections.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class InspectionModel(Base):
    __tablename__ = "inspections"

    id = Column(Integer, primary_key=True, index=True)
    product_category = Column(String, nullable=False)
    final_status = Column(String, nullable=False)  # PASS, FAIL, REVIEW
    total_images = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    image_results = relationship("ImageResultModel", back_populates="inspection")


class ImageResultModel(Base):
    __tablename__ = "image_results"

    id = Column(Integer, primary_key=True, index=True)
    inspection_id = Column(Integer, ForeignKey("inspections.id"))
    filename = Column(String, nullable=False)
    
    # Measurements
    pdp_area_cm2 = Column(Float)
    measured_font_height_mm = Column(Float)
    
    # Extracted Fields & Confidence (Stored as JSON)
    extracted_declarations = Column(JSON)
    
    # Rules findings
    compliance_result = Column(JSON)

    inspection = relationship("InspectionModel", back_populates="image_results")


# Create tables in SQLite
Base.metadata.create_all(bind=engine)


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==========================================
# 2. FASTAPI APP & OCR ENGINE
# ==========================================

app = FastAPI(
    title="Legal Metrology Compliance System API (PS26034)",
    version="1.1.0"
)

# Initialize EasyOCR
ocr_engine = easyocr.Reader(['en'])


# ==========================================
# 3. PRE-PROCESSING & OCR EXTRACTION
# ==========================================

class ImagePreprocessor:
    @staticmethod
    def tune_image_for_ocr(image_bytes: bytes) -> tuple[np.ndarray, Dict[str, Any]]:
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
        metadata = {"original_width": w, "original_height": h}
        return tuned_img, metadata


class DeclarationExtractor:
    @staticmethod
    def extract_and_structure(image: np.ndarray) -> tuple[Dict[str, Any], float]:
        results = ocr_engine.readtext(image)

        extracted_lines = []
        max_font_height_px = 0.0
        confidences = []

        for item in results:
            bbox, text, prob = item
            extracted_lines.append(text)
            confidences.append(prob)

            ys = [pt[1] for pt in bbox]
            box_height = max(ys) - min(ys)
            if box_height > max_font_height_px:
                max_font_height_px = box_height

        full_raw_text = " ".join(extracted_lines)
        avg_confidence = round(sum(confidences) / len(confidences), 2) if confidences else 0.0

        mrp_match = re.search(r'(MRP|MAX\.?\s*RETAIL\s*PRICE).*?(\d+\.?\d*)', full_raw_text, re.IGNORECASE)
        fssai_match = re.search(r'\b(1[0-9]{13})\b', full_raw_text)
        net_qty_match = re.search(r'(\d+\s*(g|kg|ml|l|grm|grams|N))\b', full_raw_text, re.IGNORECASE)

        structured_data = {
            "mrp_raw_string": mrp_match.group(0) if mrp_match else full_raw_text,
            "mrp_value": float(mrp_match.group(2)) if mrp_match else None,
            "net_qty": net_qty_match.group(0) if net_qty_match else None,
            "fssai_lic_no": fssai_match.group(1) if fssai_match else None,
            "ocr_avg_confidence": avg_confidence,
            "raw_text_summary": full_raw_text
        }

        return structured_data, max_font_height_px


class LegalMetrologyRuleEngine:
    @staticmethod
    def evaluate(product_category: str, pdp_area_cm2: float, fields: Dict[str, Any], font_height_mm: float) -> Dict[str, Any]:
        findings = []

        # Check OCR Confidence for REVIEW flag
        ocr_conf = fields.get("ocr_avg_confidence", 1.0)
        low_confidence_flag = ocr_conf < 0.50

        # Rule 1: MRP Check
        mrp_text = fields.get("mrp_raw_string", "").upper()
        if not fields.get("mrp_value"):
            findings.append({"rule_id": "RULE_6_1_E_MRP", "status": "FAIL", "reason": "MRP value missing or unreadable."})
        elif "MRP" in mrp_text and "INCL" in mrp_text and "TAX" in mrp_text:
            findings.append({"rule_id": "RULE_6_1_E_MRP", "status": "PASS", "reason": "MRP properly formatted."})
        else:
            findings.append({"rule_id": "RULE_6_1_E_MRP", "status": "FAIL", "reason": "MRP missing tax clause or prefix."})

        # Rule 2: Minimum Font Height
        min_required_mm = 1.0 if pdp_area_cm2 <= 50 else (1.5 if pdp_area_cm2 <= 100 else 2.5)
        if font_height_mm >= min_required_mm:
            findings.append({"rule_id": "RULE_7_FONT", "status": "PASS", "details": f"Font height ({font_height_mm:.2f}mm) meets required ({min_required_mm}mm)."})
        else:
            findings.append({"rule_id": "RULE_7_FONT", "status": "FAIL", "details": f"Font height ({font_height_mm:.2f}mm) below required {min_required_mm}mm."})

        # Rule 3: Category Check (Food)
        if product_category == "Food & Beverages":
            if fields.get("fssai_lic_no"):
                findings.append({"rule_id": "RULE_FSSAI", "status": "PASS", "reason": "14-digit FSSAI license present."})
            else:
                findings.append({"rule_id": "RULE_FSSAI", "status": "FAIL", "reason": "Missing or invalid FSSAI license."})

        has_fail = any(f["status"] == "FAIL" for f in findings)
        
        # Overall Status Logic: REVIEW if low OCR confidence, else FAIL or PASS
        if low_confidence_flag and not has_fail:
            overall = "REVIEW"
        elif has_fail:
            overall = "FAIL"
        else:
            overall = "PASS"

        return {
            "overall_status": overall,
            "findings": findings
        }


# ==========================================
# 4. API ENDPOINTS & DATABASE PERSISTENCE
# ==========================================

@app.post("/api/v1/inspect-commodity")
async def inspect_commodity(
    files: List[UploadFile] = File(..., description="Upload packaging images"),
    product_category: str = Form("Food & Beverages"),
    actual_package_height_mm: float = Form(150.0),
    db: Session = Depends(get_db)
):
    """Processes images, runs Legal Metrology evaluation, and saves results to SQLite DB."""
    if not files:
        raise HTTPException(status_code=400, detail="No images provided.")

    processed_results = []
    overall_all_passed = True

    for file in files:
        contents = await file.read()

        tuned_img, img_meta = ImagePreprocessor.tune_image_for_ocr(contents)
        structured_fields, max_font_px = DeclarationExtractor.extract_and_structure(tuned_img)

        px_to_mm_ratio = actual_package_height_mm / float(img_meta["original_height"])
        measured_font_mm = max_font_px * px_to_mm_ratio
        
        pdp_width_cm = (img_meta["original_width"] * px_to_mm_ratio) / 10.0
        pdp_height_cm = actual_package_height_mm / 10.0
        pdp_area_cm2 = pdp_width_cm * pdp_height_cm

        compliance = LegalMetrologyRuleEngine.evaluate(
            product_category, pdp_area_cm2, structured_fields, measured_font_mm
        )

        if compliance["overall_status"] != "PASS":
            overall_all_passed = False

        processed_results.append({
            "filename": file.filename,
            "extracted_declarations": structured_fields,
            "pdp_area_cm2": round(pdp_area_cm2, 2),
            "measured_font_height_mm": round(measured_font_mm, 2),
            "compliance_result": compliance
        })

    # Save Inspection Record to Database
    db_inspection = InspectionModel(
        product_category=product_category,
        final_status="PASS" if overall_all_passed else "FAIL",
        total_images=len(files)
    )
    db.add(db_inspection)
    db.commit()
    db.refresh(db_inspection)

    # Save Image Results linked to Inspection Record
    for result in processed_results:
        db_image_res = ImageResultModel(
            inspection_id=db_inspection.id,
            filename=result["filename"],
            pdp_area_cm2=result["pdp_area_cm2"],
            measured_font_height_mm=result["measured_font_height_mm"],
            extracted_declarations=result["extracted_declarations"],
            compliance_result=result["compliance_result"]
        )
        db.add(db_image_res)

    db.commit()

    return {
        "inspection_id": db_inspection.id,
        "inspection_summary": {
            "total_images_processed": len(files),
            "final_status": db_inspection.final_status,
            "product_category": product_category,
            "created_at": db_inspection.created_at
        },
        "image_results": processed_results
    }


@app.get("/api/v1/inspections/{inspection_id}")
async def get_inspection(inspection_id: int, db: Session = Depends(get_db)):
    """Fetches inspection history and evidence findings by ID."""
    inspection = db.query(InspectionModel).filter(InspectionModel.id == inspection_id).first()
    if not inspection:
        raise HTTPException(status_code=404, detail="Inspection record not found.")

    image_results = db.query(ImageResultModel).filter(ImageResultModel.inspection_id == inspection_id).all()

    return {
        "inspection_id": inspection.id,
        "product_category": inspection.product_category,
        "final_status": inspection.final_status,
        "total_images": inspection.total_images,
        "created_at": inspection.created_at,
        "image_results": image_results
    }