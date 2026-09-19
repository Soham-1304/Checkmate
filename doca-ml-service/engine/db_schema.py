from sqlalchemy import Column, Integer, String, Float, JSON, DateTime, Text, create_engine, Index
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

Base = declarative_base()

class InspectionRecordDB(Base):
    __tablename__ = 'inspection_records'

    id = Column(Integer, primary_key=True, autoincrement=True)
    inspection_id = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    
    # 1. Raw Input & OpenCV Metadata
    image_file_path = Column(String, nullable=False)
    annotated_image_path = Column(String, nullable=True)  # bbox overlay for evidence traceability (§5)
    pdp_area_cm2 = Column(Float, nullable=False)
    rule_version = Column(String, nullable=True)  # G.S.R. 202(E) + amendments for audit
    category = Column(String, nullable=True)
    category_inferred = Column(JSON, nullable=True)  # auto-inferred vs manual
    
    # 2. Intermediate Stage: OCR Output Data (Spatial + Raw Text + bbox)
    raw_ocr_data = Column(JSON, nullable=False)  # Contains bounding boxes, confidence, font metrics (mm)
    extracted_text_summary = Column(Text, nullable=True)  # Text blob is large, use Text not VARCHAR
    image_metadata = Column(JSON, nullable=True)
    spatial_metrics = Column(JSON, nullable=True)
    quality_signals = Column(JSON, nullable=True)  # blur/glare/resolution/skew gate (§3.2)
    visual_signals = Column(JSON, nullable=True)  # veg/brown + geometry
    barcode_signals = Column(JSON, nullable=True)  # GTIN
    pdp_estimated = Column(JSON, nullable=True)
    inkjet_boxes = Column(JSON, nullable=True)
    
    # 3. Parsed Structured Fields (MRP, Net Qty, Mfg Date, etc.)
    mapped_fields = Column(JSON, nullable=False)
    product_context = Column(JSON, nullable=True)  # listing info from ecommerce/field officer (§3.1)
    
    # 4. Final Stage: Rules Engine Compliance Output (Section 36) + REVIEW
    compliance_status = Column(String, nullable=False, index=True)  # COMPLIANT / NON_COMPLIANT / REVIEW
    total_violations = Column(Integer, default=0)
    violations_detail = Column(JSON, nullable=True)
    passed_checks_detail = Column(JSON, nullable=True)
    warnings_detail = Column(JSON, nullable=True)  # includes REVIEW reasons
    computed_detail = Column(JSON, nullable=True)  # USP, GTIN, PDP est, review_reasons
    penalty_detail = Column(JSON, nullable=True)

    def to_dict(self):
        return {
            "inspection_id": self.inspection_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "image_file_path": self.image_file_path,
            "annotated_image_path": self.annotated_image_path,
            "pdp_area_cm2": self.pdp_area_cm2,
            "rule_version": self.rule_version,
            "category": self.category,
            "compliance_status": self.compliance_status,
            "total_violations": self.total_violations,
            "raw_ocr_data": self.raw_ocr_data,
            "extracted_text_summary": self.extracted_text_summary,
            "mapped_fields": self.mapped_fields,
            "product_context": self.product_context,
            "violations_detail": self.violations_detail,
            "passed_checks_detail": self.passed_checks_detail,
            "warnings_detail": self.warnings_detail,
            "computed_detail": self.computed_detail,
            "quality_signals": self.quality_signals,
            "visual_signals": self.visual_signals,
            "barcode_signals": self.barcode_signals,
        }

# Database Setup Helper - production-safe
def init_db(db_url: str = "sqlite:///legal_metrology.db"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False} if "sqlite" in db_url else {},
        pool_pre_ping=True,
        echo=False,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal
