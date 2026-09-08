from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RepositoryRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    inspection_id: UUID
    created_at: datetime
    submitted_at: Optional[datetime] = None
    status: str
    compliance_result: Optional[str] = None
    final_decision: Optional[str] = None
    officer_id: UUID
    officer_name: str
    commodity: str
    brand: Optional[str] = None
    manufacturer: Optional[str] = None
    barcode: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    findings_count: int = 0


class RepositoryOut(BaseModel):
    items: List[RepositoryRow]
    total: int
