from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import EntityNotFoundException
from app.deps import get_current_user, get_db
from app.models.compliance import AuditEvent
from app.models.evidence import Declaration
from app.models.user import User
from app.models.workflow import Inspection
from app.schemas.inspection import DeclarationCorrection, DeclarationOut

router = APIRouter(prefix="/inspections", tags=["Declarations & Review"])


@router.get("/{inspection_id}/declarations", response_model=List[DeclarationOut])
async def list_declarations(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Declaration)
        .options(selectinload(Declaration.field_definition))
        .where(Declaration.inspection_id == inspection_id)
    )
    result = await db.execute(stmt)
    declarations = result.scalars().all()

    out = []
    for d in declarations:
        item = DeclarationOut(
            id=d.id,
            inspection_id=d.inspection_id,
            field_definition_id=d.field_definition_id,
            canonical_key=d.field_definition.canonical_key if d.field_definition else None,
            display_name=d.field_definition.display_name if d.field_definition else None,
            machine_value=d.machine_value,
            officer_value=d.officer_value,
            final_value=d.final_value,
            confidence=float(d.confidence) if d.confidence else None,
            confidence_label=d.confidence_label,
            bounding_box=d.bounding_box,
            font_size_mm=float(d.font_size_mm) if d.font_size_mm else None,
            contrast_pass=d.contrast_pass,
            script_language=d.script_language,
            clearance_pass=d.clearance_pass,
            is_corrected=d.is_corrected,
            correction_reason=d.correction_reason,
        )
        out.append(item)
    return out


@router.patch("/{inspection_id}/declarations/{declaration_id}", response_model=DeclarationOut)
async def correct_declaration(
    inspection_id: UUID,
    declaration_id: UUID,
    payload: DeclarationCorrection,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Declaration)
        .options(selectinload(Declaration.field_definition))
        .where(Declaration.id == declaration_id, Declaration.inspection_id == inspection_id)
    )
    declaration = (await db.execute(stmt)).scalar_one_or_none()
    if not declaration:
        raise EntityNotFoundException("Declaration", declaration_id)

    old_val = declaration.officer_value or declaration.machine_value

    # Update without overwriting original machine_value
    declaration.officer_value = payload.officer_value
    declaration.is_corrected = True
    declaration.correction_reason = payload.correction_reason

    audit = AuditEvent(
        actor_id=current_user.id,
        action="DECLARATION_CORRECTED",
        entity_type="DECLARATION",
        entity_id=declaration.id,
        old_value={"value": old_val},
        new_value={"value": payload.officer_value},
        reason=payload.correction_reason,
    )
    db.add(audit)
    await db.commit()
    await db.refresh(declaration)

    return DeclarationOut(
        id=declaration.id,
        inspection_id=declaration.inspection_id,
        field_definition_id=declaration.field_definition_id,
        canonical_key=declaration.field_definition.canonical_key if declaration.field_definition else None,
        display_name=declaration.field_definition.display_name if declaration.field_definition else None,
        machine_value=declaration.machine_value,
        officer_value=declaration.officer_value,
        final_value=declaration.final_value,
        confidence=float(declaration.confidence) if declaration.confidence else None,
        confidence_label=declaration.confidence_label,
        bounding_box=declaration.bounding_box,
        font_size_mm=float(declaration.font_size_mm) if declaration.font_size_mm else None,
        contrast_pass=declaration.contrast_pass,
        script_language=declaration.script_language,
        clearance_pass=declaration.clearance_pass,
        is_corrected=declaration.is_corrected,
        correction_reason=declaration.correction_reason,
    )
