from datetime import datetime, timezone
from uuid import UUID
import asyncio
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
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
from app.services import ocr_service, report_service, storage_service

logger = logging.getLogger(__name__)

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


@router.post("/{inspection_id}/analyze-auto", tags=["ML Analysis"])
async def analyze_auto(
    inspection_id: UUID,
    response: Response,
    pkg_height_mm: float = Query(default=150.0, gt=0, le=2000),
    pipeline_version: str = Query(default="server-rapidocr-1.0"),
    model_version: str = Query(default="rapidocr-onnx-1.4"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Server-side extraction: creates the run, OCRs evidence in-process
    (RapidOCR, CPU seconds), and ingests the 12 canonical declarations —
    one call from upload to COMPLETED. Heavy-model workers keep using the
    async PUT contract unchanged."""
    run = await trigger_analyze(
        inspection_id, response,
        AnalyzeRequest(pipeline_version=pipeline_version, model_version=model_version),
        db, current_user,
    )

    ev_rows = (await db.execute(
        select(Evidence).where(Evidence.inspection_id == inspection_id))).scalars().all()
    if not ev_rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="Upload at least one evidence image before analyze.")

    from app.core.config import settings

    results, ev_ids, raw_images = [], [], []
    ml_result = None

    for ev in ev_rows:
        try:
            data = await asyncio.to_thread(
                storage_service.download_bytes, ev.file_key, settings.SUPABASE_BUCKET_EVIDENCE)

            # If remote ML microservice is configured, query it for spatial parsing and vision diagnostics
            if settings.ML_SERVICE_URL and ml_result is None:
                try:
                    pdp_val = float(ev.pdp_area_cm2) if ev.pdp_area_cm2 else None
                    ml_result = await ocr_service.call_ml_service(
                        data,
                        filename=f"evidence_{ev.id}.jpg",
                        pdp_area_cm2=pdp_val,
                    )
                    if ml_result:
                        logger.info("Successfully received prediction from ML microservice for inspection %s", inspection_id)
                except Exception as ml_exc:
                    logger.warning("ML microservice call error (%s); proceeding with local fallback", ml_exc)

            res = await asyncio.to_thread(ocr_service.extract_image, data, pkg_height_mm)
        except Exception as exc:
            logger.warning("auto-extract failed for evidence %s: %s", ev.id, exc)
            continue
        results.append(res)
        ev_ids.append(ev.id)
        raw_images.append({"evidence_id": str(ev.id), "view_type": ev.view_type,
                           "avg_confidence": res["avg_confidence"],
                           "lines": [{k: l[k] for k in ("text", "confidence", "bbox", "script")}
                                     for l in res["lines"]]})

    if not results:
        run.status = "FAILED"
        run.error_detail = "Server-side OCR extracted nothing from any evidence image."
        await db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Server-side OCR extracted nothing.")

    declarations = ocr_service.build_declarations(results, ev_ids, ml_payload=ml_result)

    engine_name = (
        ml_result.get("ocr_engine_used", "paddleocr")
        if ml_result else "rapidocr-onnxruntime"
    )

    raw_output = {
        "engine": engine_name,
        "pipeline_version": pipeline_version,
        "images": raw_images,
        "visual_signals": ml_result.get("visual_signals") if ml_result else None,
        "quality_signals": ml_result.get("quality_signals") if ml_result else None,
        "barcode_signals": ml_result.get("barcode_signals") if ml_result else None,
        "pdp_area_cm2": ml_result.get("effective_pdp_cm2") if ml_result else None,
        "pdp_estimated": ml_result.get("pdp_estimated") if ml_result else None,
        "violations": ml_result.get("violations") if ml_result else None,
        "penalty": ml_result.get("penalty") if ml_result else None,
    }

    out = await ingest_declarations(
        inspection_id, run.id,
        DeclarationIngestRequest(
            declarations=declarations,
            raw_ocr_output=raw_output),
        db, current_user,
    )

    # 1. Automatically evaluate statutory compliance against Legal Metrology Rules (Rule 6, 7, 8, 9)
    compliance_res = None
    findings_count = 0
    try:
        from app.services import compliance_service
        compliance_res, findings = await compliance_service.run_compliance_evaluation(inspection_id, db)
        findings_count = len(findings) if findings else 0
        logger.info(
            "Auto compliance evaluation succeeded for inspection %s: verdict=%s, findings=%d",
            inspection_id, compliance_res, findings_count,
        )
    except Exception as eval_exc:
        logger.warning("Auto compliance evaluation failed for %s: %s", inspection_id, eval_exc)

    # 2. Auto-render the statutory compliance PDF report with populated findings
    report_url = None
    try:
        report = await report_service.render_inspection_report(db, inspection_id, current_user.id)
        report_url = storage_service.presigned_url(
            report.file_key, settings.SUPABASE_BUCKET_REPORTS)
    except Exception:
        logger.exception("auto report render failed for inspection %s", inspection_id)

    return {"success": True, "run_id": run.id, "status": "COMPLETED",
            "compliance_result": compliance_res,
            "findings_count": findings_count,
            "images_processed": len(results),
            "avg_confidence": round(sum(r["avg_confidence"] for r in results) / len(results), 4),
            "engine": engine_name,
            "ingest": out,
            "report_url": report_url}

