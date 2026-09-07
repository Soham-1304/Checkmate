from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import EntityNotFoundException, InvalidWorkflowStateException
from app.deps import get_current_user, get_db, require_roles
from app.models.compliance import AuditEvent
from app.models.rules import RuleSet
from app.models.user import User
from app.models.workflow import Inspection
from app.schemas.inspection import (
    InspectionCreate,
    InspectionDetailOut,
    InspectionOut,
    InspectionUpdate,
    ReviewDecisionRequest,
)

router = APIRouter(prefix="/inspections", tags=["Inspections"])


@router.post("", response_model=InspectionOut, status_code=status.HTTP_201_CREATED)
async def create_inspection(
    payload: InspectionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Lock to currently active rule set
    stmt = select(RuleSet).where(RuleSet.is_active == True)
    active_rule_set = (await db.execute(stmt)).scalar_one_or_none()
    if not active_rule_set:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No active regulatory rule set is configured.",
        )

    inspection = Inspection(
        commodity_id=payload.commodity_id,
        assignment_id=payload.assignment_id,
        officer_id=current_user.id,
        rule_set_id=active_rule_set.id,
        status="DRAFT",
        location=payload.location,
        context_notes=payload.context_notes,
    )
    db.add(inspection)
    await db.flush()

    audit = AuditEvent(
        actor_id=current_user.id,
        action="INSPECTION_CREATED",
        entity_type="INSPECTION",
        entity_id=inspection.id,
        new_value={"status": "DRAFT", "commodity_id": str(payload.commodity_id)},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(inspection)
    return inspection


@router.get("", response_model=List[InspectionOut])
async def list_inspections(
    status_filter: Optional[str] = Query(None, alias="status"),
    officer_id: Optional[UUID] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Inspection).order_by(desc(Inspection.created_at)).offset(offset).limit(limit)

    # Officers only see their own inspections unless Reviewer/Admin
    if current_user.role.name == "OFFICER":
        stmt = stmt.where(Inspection.officer_id == current_user.id)
    elif officer_id:
        stmt = stmt.where(Inspection.officer_id == officer_id)

    if status_filter:
        stmt = stmt.where(Inspection.status == status_filter.upper())

    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{inspection_id}", response_model=InspectionDetailOut)
async def get_inspection(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Inspection)
        .options(
            selectinload(Inspection.evidence_items),
            selectinload(Inspection.declarations),
            selectinload(Inspection.findings),
        )
        .where(Inspection.id == inspection_id)
    )
    result = await db.execute(stmt)
    inspection = result.scalar_one_or_none()

    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)

    if current_user.role.name == "OFFICER" and inspection.officer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this inspection."
        )

    return inspection


@router.patch("/{inspection_id}", response_model=InspectionOut)
async def update_inspection(
    inspection_id: UUID,
    payload: InspectionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Inspection).where(Inspection.id == inspection_id)
    inspection = (await db.execute(stmt)).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)

    if payload.context_notes is not None:
        inspection.context_notes = payload.context_notes
    if payload.physical_quantity is not None:
        inspection.physical_quantity = payload.physical_quantity
    if payload.physical_unit is not None:
        inspection.physical_unit = payload.physical_unit

    await db.commit()
    await db.refresh(inspection)
    return inspection


@router.post("/{inspection_id}/submit", response_model=InspectionOut)
async def submit_inspection(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Inspection).where(Inspection.id == inspection_id)
    inspection = (await db.execute(stmt)).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)

    if inspection.status not in ["DRAFT", "IN_PROGRESS"]:
        raise InvalidWorkflowStateException(inspection.status, "submit")

    inspection.status = "UNDER_REVIEW"
    inspection.submitted_at = datetime.now(timezone.utc)

    audit = AuditEvent(
        actor_id=current_user.id,
        action="INSPECTION_SUBMITTED",
        entity_type="INSPECTION",
        entity_id=inspection.id,
        new_value={"status": "UNDER_REVIEW"},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(inspection)
    return inspection


@router.post(
    "/{inspection_id}/review",
    response_model=InspectionOut,
    dependencies=[Depends(require_roles("REVIEWER", "ADMIN", "SUPERADMIN"))],
)
async def review_inspection(
    inspection_id: UUID,
    payload: ReviewDecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    valid_decisions = ["APPROVED_COMPLIANT", "APPROVED_NON_COMPLIANT", "RETURNED_FOR_REVIEW"]
    if payload.decision not in valid_decisions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid decision. Must be one of: {valid_decisions}",
        )

    stmt = select(Inspection).where(Inspection.id == inspection_id)
    inspection = (await db.execute(stmt)).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)

    if inspection.status != "UNDER_REVIEW":
        raise InvalidWorkflowStateException(inspection.status, "review")

    if payload.decision == "RETURNED_FOR_REVIEW":
        inspection.status = "IN_PROGRESS"
        inspection.final_decision = payload.decision
    else:
        inspection.status = "COMPLETED"
        inspection.final_decision = payload.decision
        inspection.finalized_at = datetime.now(timezone.utc)

    audit = AuditEvent(
        actor_id=current_user.id,
        action="FINAL_DECISION_RECORDED",
        entity_type="INSPECTION",
        entity_id=inspection.id,
        new_value={"status": inspection.status, "final_decision": payload.decision},
        reason=payload.notes,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(inspection)
    return inspection
