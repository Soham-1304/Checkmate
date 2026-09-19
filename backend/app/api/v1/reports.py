import asyncio
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import EntityNotFoundException
from app.deps import get_current_user, get_db, require_capability
from app.models.compliance import Report
from app.models.user import User
from app.models.workflow import Inspection
from app.schemas.inspection import ReportOut
from app.services import report_service, storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/inspections", tags=["Reports"])
view_guard = Depends(require_capability("can_view_own_reports"))


def _scoped(inspection: Inspection, user: User) -> None:
    perms = user.role.permissions or {}
    if user.role.name == "SUPERADMIN" or perms.get("all") is True:
        return
    if inspection.officer_id != user.id and not perms.get("can_view_all_reports"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Report belongs to another officer.",
        )


async def _get_inspection(inspection_id: UUID, db: AsyncSession) -> Inspection:
    inspection = (
        await db.execute(select(Inspection).where(Inspection.id == inspection_id))
    ).scalar_one_or_none()
    if not inspection:
        raise EntityNotFoundException("Inspection", inspection_id)
    return inspection


def _fresh_url(report: Report) -> Report:
    try:
        report.file_url = storage_service.presigned_url(
            report.file_key, settings.SUPABASE_BUCKET_REPORTS
        )
    except Exception as exc:
        logger.warning("report: presign failed for %s: %s", report.file_key, exc)
    return report


@router.get("/{inspection_id}/report", response_model=ReportOut)
async def get_report(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _guard: User = view_guard,
):
    inspection = await _get_inspection(inspection_id, db)
    _scoped(inspection, current_user)

    report = (
        await db.execute(select(Report).where(Report.inspection_id == inspection_id))
    ).scalar_one_or_none()
    if not report:
        try:
            report = await report_service.render_inspection_report(
                db, inspection_id, current_user.id
            )
        except Exception as exc:
            logger.exception("report: lazy render failed for %s", inspection_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Report not available and render failed: {exc}",
            )
    return _fresh_url(report)


@router.post("/{inspection_id}/report", response_model=ReportOut, status_code=status.HTTP_201_CREATED)
async def render_report(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _guard: User = view_guard,
):
    inspection = await _get_inspection(inspection_id, db)
    _scoped(inspection, current_user)
    try:
        report = await report_service.render_inspection_report(
            db, inspection_id, current_user.id
        )
    except Exception as exc:
        logger.exception("report: render failed for %s", inspection_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report render failed: {exc}",
        )
    return _fresh_url(report)


@router.get("/{inspection_id}/report/pdf")
async def stream_report_pdf(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _guard: User = view_guard,
):
    """Directly stream the inspection PDF report with inline Content-Disposition
    so web browsers (iframes) and mobile devices can view it immediately without external links."""
    inspection = await _get_inspection(inspection_id, db)
    _scoped(inspection, current_user)

    report = (
        await db.execute(select(Report).where(Report.inspection_id == inspection_id))
    ).scalar_one_or_none()

    if not report:
        try:
            report = await report_service.render_inspection_report(
                db, inspection_id, current_user.id
            )
        except Exception as exc:
            logger.exception("report: render failed on stream request for %s", inspection_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Report rendering failed: {exc}",
            )

    try:
        pdf_bytes = await asyncio.to_thread(
            storage_service.download_bytes, report.file_key, settings.SUPABASE_BUCKET_REPORTS
        )
    except Exception as exc:
        logger.warning("report: stored PDF fetch failed for %s: %s; rendering fresh", report.file_key, exc)
        context = await report_service.build_report_context(db, inspection_id)
        pdf_bytes = await asyncio.to_thread(report_service.render_pdf, context)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=inspection_report_{inspection_id}.pdf"
        },
    )


@router.get("/{inspection_id}/report/download")
async def download_report_pdf(
    inspection_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _guard: User = view_guard,
):
    """Directly download the inspection PDF report as an attachment."""
    res = await stream_report_pdf(inspection_id, db, current_user, _guard)
    res.headers["Content-Disposition"] = f"attachment; filename=inspection_report_{inspection_id}.pdf"
    return res

