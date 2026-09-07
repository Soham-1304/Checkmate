from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class InspectionCreate(BaseModel):
    commodity_id: UUID
    assignment_id: Optional[UUID] = None
    location: Optional[Dict[str, Any]] = None
    context_notes: Optional[str] = None


class InspectionUpdate(BaseModel):
    status: Optional[str] = None
    context_notes: Optional[str] = None
    physical_quantity: Optional[float] = None
    physical_unit: Optional[str] = None


class ReviewDecisionRequest(BaseModel):
    decision: str  # 'APPROVED_COMPLIANT', 'APPROVED_NON_COMPLIANT', 'RETURNED_FOR_REVIEW'
    notes: Optional[str] = None


class EvidenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    inspection_id: UUID
    file_key: str
    file_url: Optional[str] = None
    view_type: str
    mime_type: str
    pdp_area_cm2: Optional[float] = None
    uploaded_at: datetime


class DeclarationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    inspection_id: UUID
    field_definition_id: UUID
    canonical_key: Optional[str] = None
    display_name: Optional[str] = None
    machine_value: Optional[str] = None
    officer_value: Optional[str] = None
    final_value: Optional[str] = None
    confidence: Optional[float] = None
    confidence_label: Optional[str] = None
    bounding_box: Optional[Dict[str, Any]] = None
    font_size_mm: Optional[float] = None
    contrast_pass: Optional[bool] = None
    script_language: Optional[str] = None
    clearance_pass: Optional[bool] = None
    is_corrected: bool = False
    correction_reason: Optional[str] = None


class DeclarationCorrection(BaseModel):
    officer_value: str
    correction_reason: Optional[str] = None


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    inspection_id: UUID
    severity: str
    title: str
    explanation: str
    legal_reference: str
    officer_accepted: Optional[bool] = None
    officer_note: Optional[str] = None
    created_at: datetime


class FindingUpdate(BaseModel):
    officer_accepted: bool
    officer_note: Optional[str] = None


class InspectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    commodity_id: UUID
    officer_id: UUID
    rule_set_id: UUID
    status: str
    compliance_result: Optional[str] = None
    final_decision: Optional[str] = None
    location: Optional[Dict[str, Any]] = None
    context_notes: Optional[str] = None
    physical_quantity: Optional[float] = None
    physical_unit: Optional[str] = None
    created_at: datetime
    submitted_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None


class InspectionDetailOut(InspectionOut):
    evidence_items: List[EvidenceOut] = []
    declarations: List[DeclarationOut] = []
    findings: List[FindingOut] = []
