import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import relationship
from app.db.session import Base


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    file_key = Column(Text, nullable=False)
    file_url = Column(Text, nullable=True)
    view_type = Column(String(50), nullable=False)  # 'FRONT_PDP', 'BACK_PANEL', 'SIDE_PANEL', 'CLOSEUP'
    mime_type = Column(String(100), nullable=False)
    pdp_area_cm2 = Column(Numeric(8, 2), nullable=True)
    image_metadata = Column(JSONB, nullable=True)  # {width, height, dpi, blur_score}
    uploaded_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    inspection = relationship("Inspection", back_populates="evidence_items")
    declarations = relationship("Declaration", back_populates="evidence")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    pipeline_version = Column(String(50), nullable=False)
    model_version = Column(String(50), nullable=False)
    status = Column(String(30), default="QUEUED", nullable=False, index=True)
    # 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    error_detail = Column(Text, nullable=True)
    raw_ocr_output = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    inspection = relationship("Inspection", back_populates="analysis_runs")
    declarations = relationship("Declaration", back_populates="analysis_run")


class Declaration(Base):
    __tablename__ = "declarations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    analysis_run_id = Column(UUID(as_uuid=True), ForeignKey("analysis_runs.id"), nullable=True)
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id"), nullable=True)
    field_definition_id = Column(UUID(as_uuid=True), ForeignKey("field_definitions.id"), nullable=False)

    # Machine vs Officer Dual-Value Preservation
    machine_value = Column(Text, nullable=True)
    officer_value = Column(Text, nullable=True)

    confidence = Column(Numeric(5, 4), nullable=True)
    confidence_label = Column(String(20), nullable=True)  # 'HIGH', 'MEDIUM', 'LOW', 'UNDETECTED'

    # OpenCV Geometry & Visual Features
    bounding_box = Column(JSONB, nullable=True)  # {x, y, width, height, angle}
    font_size_mm = Column(Numeric(5, 2), nullable=True)
    font_family = Column(String(100), nullable=True)
    contrast_pass = Column(Boolean, nullable=True)
    script_language = Column(String(50), nullable=True)  # 'DEVANAGARI', 'ENGLISH', 'OTHER'
    clearance_pass = Column(Boolean, nullable=True)

    is_corrected = Column(Boolean, default=False, nullable=False)
    correction_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    inspection = relationship("Inspection", back_populates="declarations")
    analysis_run = relationship("AnalysisRun", back_populates="declarations")
    evidence = relationship("Evidence", back_populates="declarations")
    field_definition = relationship("FieldDefinition", back_populates="declarations")

    @hybrid_property
    def final_value(self) -> str:
        return self.officer_value if self.officer_value is not None else self.machine_value
