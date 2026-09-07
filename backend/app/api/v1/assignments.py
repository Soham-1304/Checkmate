from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import EntityNotFoundException
from app.deps import get_current_user, get_db, require_capability
from app.models.compliance import AuditEvent
from app.models.master_data import Commodity
from app.models.rules import RuleSet
from app.models.user import User
from app.models.workflow import Assignment
from app.schemas.assignments import AssignmentCreate, AssignmentOut, AssignmentStatusUpdate, AssignmentUpdate

router = APIRouter(prefix="/assignments", tags=["Assignments"])
assign_guard = Depends(require_capability("can_assign"))

OFFICER_TRANSITIONS = {
    "ASSIGNED": {"IN_PROGRESS"},
    "REASSIGNED": {"IN_PROGRESS"},
    "IN_PROGRESS": {"COMPLETED"},
}
ADMIN_STATUSES = {"ASSIGNED", "IN_PROGRESS", "COMPLETED", "REASSIGNED", "CANCELLED"}


def _out(a: Assignment) -> AssignmentOut:
    return AssignmentOut(
        id=a.id, commodity_id=a.commodity_id,
        commodity_name=a.commodity.generic_name if a.commodity else None,
        commodity_barcode=a.commodity.barcode if a.commodity else None,
        assigned_by=a.assigned_by, assigner_name=a.assigner.name if a.assigner else None,
        assigned_to=a.assigned_to, assignee_name=a.assignee.name if a.assignee else None,
        rule_set_id=a.rule_set_id, status=a.status, due_date=a.due_date, notes=a.notes,
        created_at=a.created_at, updated_at=a.updated_at,
    )


def _eager(stmt):
    return stmt.options(
        selectinload(Assignment.commodity),
        selectinload(Assignment.assigner),
        selectinload(Assignment.assignee),
    )


@router.get("/my-checklist", response_model=List[AssignmentOut])
async def my_checklist(
    include_done: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = _eager(select(Assignment).where(Assignment.assigned_to == current_user.id))
    if not include_done:
        stmt = stmt.where(Assignment.status.in_(["ASSIGNED", "REASSIGNED", "IN_PROGRESS"]))
    rows = (await db.execute(stmt.order_by(Assignment.due_date.asc().nulls_last(), Assignment.created_at.desc()))).scalars().all()
    return [_out(a) for a in rows]


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment(
    payload: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = assign_guard,
):
    commodity = (await db.execute(select(Commodity).where(Commodity.id == payload.commodity_id))).scalar_one_or_none()
    if not commodity:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "commodity_id does not exist.")
    officer = (await db.execute(select(User).where(User.id == payload.assigned_to))).scalar_one_or_none()
    if not officer or not officer.is_active:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "assigned_to must be an active user.")
    rule_set = (await db.execute(select(RuleSet).where(RuleSet.is_active == True))).scalar_one_or_none()
    if not rule_set:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "No active regulatory rule set is configured.")

    a = Assignment(
        commodity_id=payload.commodity_id, assigned_by=current_user.id, assigned_to=payload.assigned_to,
        rule_set_id=rule_set.id, status="ASSIGNED", due_date=payload.due_date, notes=payload.notes,
    )
    db.add(a)
    await db.flush()
    db.add(AuditEvent(actor_id=current_user.id, action="ASSIGNMENT_CREATED", entity_type="ASSIGNMENT", entity_id=a.id, new_value={"assigned_to": str(payload.assigned_to), "commodity_id": str(payload.commodity_id)}))
    await db.commit()
    a = (await db.execute(_eager(select(Assignment).where(Assignment.id == a.id)))).scalar_one()
    return _out(a)


@router.get("", response_model=List[AssignmentOut])
async def list_assignments(
    status_filter: Optional[str] = Query(None, alias="status"),
    officer_id: Optional[UUID] = None,
    limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = assign_guard,
):
    stmt = _eager(select(Assignment))
    if status_filter:
        stmt = stmt.where(Assignment.status == status_filter.upper())
    if officer_id:
        stmt = stmt.where(Assignment.assigned_to == officer_id)
    rows = (await db.execute(stmt.order_by(Assignment.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return [_out(a) for a in rows]


@router.patch("/{assignment_id}/status", response_model=AssignmentOut)
async def update_assignment_status(
    assignment_id: UUID,
    payload: AssignmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    a = (await db.execute(_eager(select(Assignment).where(Assignment.id == assignment_id)))).scalar_one_or_none()
    if not a:
        raise EntityNotFoundException("Assignment", assignment_id)

    new_status = payload.status.upper()
    is_owner = a.assigned_to == current_user.id
    is_admin = bool((current_user.role.permissions or {}).get("can_assign")) or current_user.role.name in ("ADMIN", "SUPERADMIN")
    if not (is_owner or is_admin):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Only the assignee or an admin can update this task.")

    if is_admin and not is_owner:
        if new_status not in ADMIN_STATUSES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Status must be one of {sorted(ADMIN_STATUSES)}.")
    else:
        allowed = OFFICER_TRANSITIONS.get(a.status, set())
        if new_status not in allowed:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Cannot move {a.status} → {new_status}. Allowed: {sorted(allowed) or 'none (ask admin)'}.")

    old = a.status
    a.status = new_status
    db.add(AuditEvent(actor_id=current_user.id, action="ASSIGNMENT_STATUS", entity_type="ASSIGNMENT", entity_id=a.id, old_value={"status": old}, new_value={"status": new_status}))
    await db.commit()
    a = (await db.execute(_eager(select(Assignment).where(Assignment.id == a.id)))).scalar_one()
    return _out(a)


@router.patch("/{assignment_id}", response_model=AssignmentOut)
async def update_assignment(
    assignment_id: UUID,
    payload: AssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = assign_guard,
):
    a = (await db.execute(_eager(select(Assignment).where(Assignment.id == assignment_id)))).scalar_one_or_none()
    if not a:
        raise EntityNotFoundException("Assignment", assignment_id)

    changes = {}
    if payload.assigned_to is not None and payload.assigned_to != a.assigned_to:
        officer = (await db.execute(select(User).where(User.id == payload.assigned_to))).scalar_one_or_none()
        if not officer or not officer.is_active:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "assigned_to must be an active user.")
        changes["assigned_to"] = {"from": str(a.assigned_to), "to": str(payload.assigned_to)}
        a.assigned_to = payload.assigned_to
        if a.status in ("ASSIGNED", "IN_PROGRESS"):
            a.status = "REASSIGNED"
            changes["status"] = "REASSIGNED"
    if payload.due_date is not None:
        a.due_date = payload.due_date
        changes["due_date"] = str(payload.due_date)
    if payload.notes is not None:
        a.notes = payload.notes
        changes["notes"] = payload.notes
    if payload.status is not None:
        if payload.status.upper() not in ADMIN_STATUSES:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Status must be one of {sorted(ADMIN_STATUSES)}.")
        changes["status"] = {"from": a.status, "to": payload.status.upper()}
        a.status = payload.status.upper()

    db.add(AuditEvent(actor_id=current_user.id, action="ASSIGNMENT_UPDATED", entity_type="ASSIGNMENT", entity_id=a.id, new_value=changes))
    await db.commit()
    a = (await db.execute(_eager(select(Assignment).where(Assignment.id == a.id)))).scalar_one()
    return _out(a)


@router.delete("/{assignment_id}", response_model=AssignmentOut)
async def cancel_assignment(
    assignment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = assign_guard,
):
    a = (await db.execute(_eager(select(Assignment).where(Assignment.id == assignment_id)))).scalar_one_or_none()
    if not a:
        raise EntityNotFoundException("Assignment", assignment_id)
    if a.status == "COMPLETED":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Completed assignments cannot be cancelled.")
    old = a.status
    a.status = "CANCELLED"
    db.add(AuditEvent(actor_id=current_user.id, action="ASSIGNMENT_CANCELLED", entity_type="ASSIGNMENT", entity_id=a.id, old_value={"status": old}, new_value={"status": "CANCELLED"}))
    await db.commit()
    a = (await db.execute(_eager(select(Assignment).where(Assignment.id == a.id)))).scalar_one()
    return _out(a)
