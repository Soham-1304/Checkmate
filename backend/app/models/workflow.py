import uuid
from datetime import date, datetime, timezone
from sqlalchemy import Column, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    commodity_id = Column(UUID(as_uuid=True), ForeignKey("commodities.id"), nullable=False)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rule_set_id = Column(UUID(as_uuid=True), ForeignKey("rule_sets.id"), nullable=False)
    status = Column(String(30), default="ASSIGNED", nullable=False, index=True)
    # 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REASSIGNED', 'CANCELLED'
    due_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    commodity = relationship("Commodity", back_populates="assignments")
    assigner = relationship("User", foreign_keys=[assigned_by], back_populates="created_assignments")
    assignee = relationship("User", foreign_keys=[assigned_to], back_populates="assigned_tasks")
    rule_set = relationship("RuleSet", back_populates="assignments")
    inspections = relationship("Inspection", back_populates="assignment")


class Inspection(Base):
    __tablename__ = "inspections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=True)
    commodity_id = Column(UUID(as_uuid=True), ForeignKey("commodities.id"), nullable=False)
    officer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rule_set_id = Column(UUID(as_uuid=True), ForeignKey("rule_sets.id"), nullable=False)  # Immutable once started
    status = Column(String(30), default="DRAFT", nullable=False, index=True)
    # 'DRAFT', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'
    compliance_result = Column(String(20), nullable=True)  # System evaluated: 'PASS', 'FAIL', 'REVIEW'
    final_decision = Column(String(40), nullable=True)     # Admin finalized: 'APPROVED_COMPLIANT', 'APPROVED_NON_COMPLIANT', 'RETURNED_FOR_REVIEW'
    location = Column(JSONB, nullable=True)                 # {market_name, district, state, coordinates}
    context_notes = Column(Text, nullable=True)
    physical_quantity = Column(Numeric(10, 3), nullable=True)  # Physical weighed sample by officer
    physical_unit = Column(String(20), nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    assignment = relationship("Assignment", back_populates="inspections")
    commodity = relationship("Commodity", back_populates="inspections")
    officer = relationship("User", back_populates="inspections")
    rule_set = relationship("RuleSet", back_populates="inspections")
    evidence_items = relationship("Evidence", back_populates="inspection", cascade="all, delete-orphan")
    analysis_runs = relationship("AnalysisRun", back_populates="inspection", cascade="all, delete-orphan")
    declarations = relationship("Declaration", back_populates="inspection", cascade="all, delete-orphan")
    compliance_evaluations = relationship(
        "ComplianceEvaluation", back_populates="inspection", cascade="all, delete-orphan"
    )
    findings = relationship("Finding", back_populates="inspection", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="inspection", uselist=False, cascade="all, delete-orphan")
