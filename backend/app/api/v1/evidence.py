import os
import uuid
from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.core.exceptions import EntityNotFoundException
from app.deps import get_current_user, get_db
from app.models.compliance import AuditEvent
from app.models.evidence import Evidence
from app.models.user import User
from app.models.workflow import Inspection
from app.schemas.inspection import EvidenceOut
from app.services import storage_service

router = APIRouter(prefix="/inspections", tags=["Evidence & Uploads"])

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/{inspection_id}/evidence", response_model=EvidenceOut, status_code=status.HTTP_201_CREATED)
async def upload_evidence(
    inspection_id: UUID,
    view_type: str = Form(..., description="FRONT_PDP, BACK_PANEL, SIDE_PANEL, CLOSEUP"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Inspection).where(Inspection.id == inspection_id)
    inspection = (await db.execute(stmt)).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)

    # Read into memory for validation + size cap
    data = await file.read()
    storage_service.check_upload(file.content_type or "", len(data))

    object_name = storage_service.build_object_name(str(inspection_id), file.filename or "")
    if settings.STORAGE_BACKEND == "supabase":
        storage_service.upload_bytes(object_name, data, file.content_type or "image/jpeg", settings.SUPABASE_BUCKET_EVIDENCE)
        file_key = object_name
        file_url = storage_service.presigned_url(object_name, settings.SUPABASE_BUCKET_EVIDENCE)
    else:
        file_url = storage_service.save_bytes_local(object_name, data)
        file_key = f"evidence/{os.path.basename(file_url)}"

    evidence = Evidence(
        inspection_id=inspection_id,
        file_key=file_key,
        file_url=file_url,
        view_type=view_type.upper(),
        mime_type=file.content_type or "image/jpeg",
    )
    db.add(evidence)
    await db.flush()

    audit = AuditEvent(
        actor_id=current_user.id,
        action="EVIDENCE_UPLOADED",
        entity_type="EVIDENCE",
        entity_id=evidence.id,
        new_value={"view_type": view_type, "file_key": file_key, "storage": settings.STORAGE_BACKEND},
    )
    db.add(audit)
    await db.commit()
    await db.refresh(evidence)
    return evidence


@router.get("/{inspection_id}/evidence", response_model=List[EvidenceOut])
async def list_evidence(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Evidence).where(Evidence.inspection_id == inspection_id)
    result = await db.execute(stmt)
    return result.scalars().all()
