import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
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
