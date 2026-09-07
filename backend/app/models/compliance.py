import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class ComplianceEvaluation(Base):
    __tablename__ = "compliance_evaluations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    requirement_id = Column(UUID(as_uuid=True), ForeignKey("requirements.id"), nullable=False)
    result = Column(String(20), nullable=False)  # 'PASS', 'FAIL', 'REVIEW', 'NOT_APPLICABLE'
    evaluated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    eval_detail = Column(JSONB, nullable=True)   # Diagnostic trace of check

    inspection = relationship("Inspection", back_populates="compliance_evaluations")
    requirement = relationship("Requirement", back_populates="evaluations")
    findings = relationship("Finding", back_populates="compliance_evaluation", cascade="all, delete-orphan")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), nullable=False)
    compliance_evaluation_id = Column(
        UUID(as_uuid=True), ForeignKey("compliance_evaluations.id", ondelete="CASCADE"), nullable=False
    )
    evidence_id = Column(UUID(as_uuid=True), ForeignKey("evidence.id"), nullable=True)
    severity = Column(String(20), default="CRITICAL", nullable=False)  # 'CRITICAL', 'MAJOR', 'MINOR'
    title = Column(String(300), nullable=False)
    explanation = Column(Text, nullable=False)
    legal_reference = Column(String(100), nullable=False)  # 'Rule 7 Table I', 'Rule 6(1)(e)'
    officer_accepted = Column(Boolean, nullable=True)     # NULL = pending review, TRUE = confirmed
    officer_note = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    inspection = relationship("Inspection", back_populates="findings")
    compliance_evaluation = relationship("ComplianceEvaluation", back_populates="findings")


class Report(Base):
    __tablename__ = "reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    inspection_id = Column(
        UUID(as_uuid=True), ForeignKey("inspections.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    file_key = Column(Text, nullable=False)
    file_url = Column(Text, nullable=True)
    report_format = Column(String(20), default="PDF", nullable=False)
    generated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    generated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    inspection = relationship("Inspection", back_populates="report")
    generator = relationship("User")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    actor = relationship("User")
