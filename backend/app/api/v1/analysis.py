from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import EntityNotFoundException
from app.deps import get_current_user, get_db
from app.models.compliance import AuditEvent
from app.models.evidence import AnalysisRun, Declaration, Evidence
from app.models.master_data import FieldDefinition
from app.models.user import User
from app.models.workflow import Inspection
from app.schemas.inspection import (
    AnalysisRunOut,
    AnalyzeRequest,
    DeclarationIngestRequest,
)

router = APIRouter(prefix="/inspections", tags=["ML Analysis"])

ALLOWED_SCRIPTS = {"DEVANAGARI", "ENGLISH", "OTHER"}
ALLOWED_LABELS = {"HIGH", "MEDIUM", "LOW", "UNDETECTED"}


def _check_owner(inspection: Inspection, current_user: User) -> None:
    if current_user.role.name == "OFFICER" and inspection.officer_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this inspection.")


@router.post("/{inspection_id}/analyze", response_model=AnalysisRunOut)
async def trigger_analyze(
    inspection_id: UUID,
    response: Response,
    payload: AnalyzeRequest | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inspection = (await db.execute(select(Inspection).where(Inspection.id == inspection_id))).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)
    _check_owner(inspection, current_user)

    if inspection.status in ["UNDER_REVIEW", "COMPLETED", "ARCHIVED"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot analyze inspection in status {inspection.status}.")

    ev_count = (await db.execute(select(func.count()).select_from(Evidence).where(Evidence.inspection_id == inspection_id))).scalar()
    if not ev_count:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload at least one evidence image before analyze.")

    existing = (await db.execute(select(AnalysisRun).where(AnalysisRun.inspection_id == inspection_id, AnalysisRun.status == "QUEUED").order_by(AnalysisRun.created_at.desc()).limit(1))).scalar_one_or_none()
    if existing:
        response.status_code = status.HTTP_200_OK
        return existing

    run = AnalysisRun(
        inspection_id=inspection_id,
        pipeline_version=(payload.pipeline_version if payload else None) or "local-1.0",
        model_version=(payload.model_version if payload else None) or "regex-tier1-1.0",
        status="QUEUED",
    )
    db.add(run)

    if inspection.status == "DRAFT":
        inspection.status = "IN_PROGRESS"

    await db.flush()
    db.add(AuditEvent(actor_id=current_user.id, action="ANALYSIS_QUEUED", entity_type="ANALYSIS_RUN", entity_id=run.id, new_value={"inspection_id": str(inspection_id)}))
    await db.commit()
    await db.refresh(run)
    response.status_code = status.HTTP_201_CREATED
    return run


@router.get("/{inspection_id}/analysis-runs/{run_id}", response_model=AnalysisRunOut)
async def get_analysis_run(
    inspection_id: UUID,
    run_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inspection = (await db.execute(select(Inspection).where(Inspection.id == inspection_id))).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)
    _check_owner(inspection, current_user)

    run = (await db.execute(select(AnalysisRun).where(AnalysisRun.id == run_id, AnalysisRun.inspection_id == inspection_id))).scalar_one_or_none()
    if not run:
        raise EntityNotFoundException("AnalysisRun", run_id)
    return run


@router.put("/{inspection_id}/analysis-runs/{run_id}/declarations")
async def ingest_declarations(
    inspection_id: UUID,
    run_id: UUID,
    payload: DeclarationIngestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inspection = (await db.execute(select(Inspection).where(Inspection.id == inspection_id))).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)
    _check_owner(inspection, current_user)

    run = (await db.execute(select(AnalysisRun).where(AnalysisRun.id == run_id, AnalysisRun.inspection_id == inspection_id))).scalar_one_or_none()
    if not run:
        raise EntityNotFoundException("AnalysisRun", run_id)
    if run.status == "COMPLETED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Analysis run already completed.")

    if not payload.declarations:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="declarations list must not be empty.")

    for item in payload.declarations:
        if item.confidence is not None and not (0 <= item.confidence <= 1):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"confidence out of range for '{item.canonical_key}'. Must be 0..1.")
        if item.script_language is not None and item.script_language not in ALLOWED_SCRIPTS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"script_language '{item.script_language}' invalid. Use DEVANAGARI|ENGLISH|OTHER.")
        if item.confidence_label is not None and item.confidence_label not in ALLOWED_LABELS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"confidence_label '{item.confidence_label}' invalid.")
        if item.bounding_box is not None and not isinstance(item.bounding_box, dict):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"bounding_box for '{item.canonical_key}' must be an object.")

    # Pre-validate keys + evidence ownership BEFORE touching run state,
    # so 422s never leave the run flipped to RUNNING with no FAILED trail.
    fd_rows = (await db.execute(select(FieldDefinition))).scalars().all()
    fd_by_key = {fd.canonical_key: fd for fd in fd_rows}
    ev_rows = (await db.execute(select(Evidence.id).where(Evidence.inspection_id == inspection_id))).all()
    ev_ids = {r[0] for r in ev_rows}
    for item in payload.declarations:
        if item.canonical_key not in fd_by_key:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown canonical_key '{item.canonical_key}'.")
        if item.evidence_id is not None and item.evidence_id not in ev_ids:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"evidence_id '{item.evidence_id}' does not belong to this inspection.")

    try:
        run.status = "RUNNING"
        run.started_at = datetime.now(timezone.utc)
        await db.flush()

        upserted = 0
        for item in payload.declarations:
            fd = fd_by_key[item.canonical_key]

            existing = (await db.execute(select(Declaration).where(Declaration.inspection_id == inspection_id, Declaration.field_definition_id == fd.id))).scalar_one_or_none()
            if existing:
                existing.machine_value = item.machine_value
                existing.confidence = item.confidence
                existing.confidence_label = item.confidence_label
                existing.bounding_box = item.bounding_box
                existing.font_size_mm = item.font_size_mm
                existing.contrast_pass = item.contrast_pass
                existing.script_language = item.script_language
                existing.clearance_pass = item.clearance_pass
                existing.analysis_run_id = run.id
                if item.evidence_id:
                    existing.evidence_id = item.evidence_id
            else:
                db.add(Declaration(
                    inspection_id=inspection_id,
                    analysis_run_id=run.id,
                    evidence_id=item.evidence_id,
                    field_definition_id=fd.id,
                    machine_value=item.machine_value,
                    confidence=item.confidence,
                    confidence_label=item.confidence_label,
                    bounding_box=item.bounding_box,
                    font_size_mm=item.font_size_mm,
                    contrast_pass=item.contrast_pass,
                    script_language=item.script_language,
                    clearance_pass=item.clearance_pass,
                ))
            upserted += 1

        run.status = "COMPLETED"
        run.completed_at = datetime.now(timezone.utc)
        if payload.raw_ocr_output is not None:
            run.raw_ocr_output = payload.raw_ocr_output
        db.add(AuditEvent(actor_id=current_user.id, action="ANALYSIS_COMPLETED", entity_type="ANALYSIS_RUN", entity_id=run.id, new_value={"declarations": upserted}))
        await db.commit()
        await db.refresh(run)
        return {"success": True, "run_id": run.id, "status": run.status, "declarations_upserted": upserted}
    except Exception as exc:
        await db.rollback()
        run.status = "FAILED"
        run.error_detail = str(exc)[:500]
        db.add(run)
        db.add(AuditEvent(actor_id=current_user.id, action="ANALYSIS_FAILED", entity_type="ANALYSIS_RUN", entity_id=run.id, new_value={"error": str(exc)[:200]}))
        await db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Declaration ingestion failed.")
