import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class RuleSet(Base):
    __tablename__ = "rule_sets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    version = Column(String(30), unique=True, index=True, nullable=False)  # 'LM-PCR-2011-v1.0'
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    effective_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    requirements = relationship("Requirement", back_populates="rule_set", cascade="all, delete-orphan")
    inspections = relationship("Inspection", back_populates="rule_set")
    assignments = relationship("Assignment", back_populates="rule_set")


class Requirement(Base):
    __tablename__ = "requirements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    rule_set_id = Column(UUID(as_uuid=True), ForeignKey("rule_sets.id"), nullable=False)
    rule_ref = Column(String(50), nullable=False, index=True)  # 'Rule6(1)(a)', 'Rule7_TableI', 'Rule8(1)', 'Rule9(1)(b)'
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), default="CRITICAL", nullable=False)  # 'CRITICAL', 'MAJOR', 'MINOR'
    applicable_to = Column(JSONB, default=dict, nullable=False)        # applicability conditions
    check_logic = Column(JSONB, nullable=False)                        # evaluation logic parameters

    rule_set = relationship("RuleSet", back_populates="requirements")
    evaluations = relationship("ComplianceEvaluation", back_populates="requirement")
