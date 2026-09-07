from datetime import date, datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class AssignmentCreate(BaseModel):
    commodity_id: UUID
    assigned_to: UUID
    due_date: Optional[date] = None
    notes: Optional[str] = None


class AssignmentUpdate(BaseModel):
    assigned_to: Optional[UUID] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class AssignmentStatusUpdate(BaseModel):
    status: str


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    commodity_id: UUID
    commodity_name: Optional[str] = None
    commodity_barcode: Optional[str] = None
    assigned_by: UUID
    assigner_name: Optional[str] = None
    assigned_to: UUID
    assignee_name: Optional[str] = None
    rule_set_id: UUID
    status: str
    due_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
