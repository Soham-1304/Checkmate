from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class RuleSetOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    version: str
    description: Optional[str] = None
    is_active: bool
    effective_at: Optional[datetime] = None
    requirements_count: int = 0


class RequirementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rule_ref: str
    title: str
    description: str
    severity: str
    applicable_to: Optional[Dict[str, Any]] = None
    check_logic: Optional[Dict[str, Any]] = None


class RuleSetDetailOut(RuleSetOut):
    requirements: List[RequirementOut] = []
