from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, require_capability
from app.models.compliance import AuditEvent
from app.models.user import User
from app.schemas.audit import AuditEventListOut, AuditEventOut

router = APIRouter(tags=["Audit Trail"])
audit_guard = Depends(require_capability("can_view_audit"))


@router.get("/audit-events", response_model=AuditEventListOut)
async def list_audit_events(
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    action: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _guard: User = audit_guard,
):
    stmt = select(AuditEvent)
    count_stmt = select(func.count()).select_from(AuditEvent)
    if entity_type:
        stmt = stmt.where(AuditEvent.entity_type == entity_type.upper())
        count_stmt = count_stmt.where(AuditEvent.entity_type == entity_type.upper())
    if entity_id:
        stmt = stmt.where(AuditEvent.entity_id == entity_id)
        count_stmt = count_stmt.where(AuditEvent.entity_id == entity_id)
    if action:
        stmt = stmt.where(AuditEvent.action == action.upper())
        count_stmt = count_stmt.where(AuditEvent.action == action.upper())

    total = (await db.execute(count_stmt)).scalar() or 0
    events = (
        await db.execute(stmt.order_by(AuditEvent.created_at.asc()).offset(offset).limit(limit))
    ).scalars().all()
    return AuditEventListOut(items=[AuditEventOut.model_validate(e) for e in events], total=total)
