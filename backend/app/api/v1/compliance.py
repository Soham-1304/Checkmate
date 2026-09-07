from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import EntityNotFoundException
from app.deps import get_current_user, get_db
from app.models.compliance import AuditEvent, Finding
from app.models.user import User
from app.models.workflow import Inspection
from app.schemas.inspection import FindingOut, FindingUpdate
from app.services.compliance_service import run_compliance_evaluation

router = APIRouter(prefix="/inspections", tags=["Compliance & Evaluation"])


@router.post("/{inspection_id}/evaluate")
async def evaluate_inspection(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Inspection).where(Inspection.id == inspection_id)
    inspection = (await db.execute(stmt)).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)

    overall, findings = await run_compliance_evaluation(inspection_id, db)

    audit = AuditEvent(
        actor_id=current_user.id,
        action="COMPLIANCE_EVALUATED",
        entity_type="INSPECTION",
        entity_id=inspection_id,
        new_value={"compliance_result": overall, "findings_count": len(findings)},
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "inspection_id": inspection_id,
        "compliance_result": overall,
        "findings_count": len(findings),
    }


@router.get("/{inspection_id}/findings", response_model=List[FindingOut])
async def list_findings(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Finding).where(Finding.inspection_id == inspection_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.patch("/{inspection_id}/findings/{finding_id}", response_model=FindingOut)
async def update_finding(
    inspection_id: UUID,
    finding_id: UUID,
    payload: FindingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Finding).where(Finding.id == finding_id, Finding.inspection_id == inspection_id)
    finding = (await db.execute(stmt)).scalar_one_or_none()
    if not finding:
        raise EntityNotFoundException("Finding", finding_id)

    finding.officer_accepted = payload.officer_accepted
    finding.officer_note = payload.officer_note

    audit = AuditEvent(
        actor_id=current_user.id,
        action="FINDING_REVIEWED",
        entity_type="FINDING",
        entity_id=finding_id,
        new_value={"accepted": payload.officer_accepted, "note": payload.officer_note},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(finding)
    return finding
