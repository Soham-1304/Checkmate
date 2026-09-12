import csv
import io
from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.deps import get_current_user, get_db, require_capability
from app.models.compliance import Finding
from app.models.master_data import Brand, BusinessEntity, Commodity
from app.models.user import User
from app.models.workflow import Inspection
from app.schemas.repository import RepositoryOut, RepositoryRow

router = APIRouter(prefix="/repository", tags=["Repository"])
view_guard = Depends(require_capability("can_view_own_reports"))

COLUMNS = [
    "inspection_id", "created_at", "submitted_at", "status", "compliance_result",
    "final_decision", "officer_id", "officer_name", "commodity", "brand",
    "manufacturer", "barcode", "district", "state", "findings_count",
]


def _can_view_all(user: User) -> bool:
    perms = user.role.permissions or {}
    return user.role.name == "SUPERADMIN" or perms.get("all") is True or bool(
        perms.get("can_view_all_reports")
    )


def _base_stmt(
    user: User,
    brand: Optional[str],
    manufacturer: Optional[str],
    commodity: Optional[str],
    barcode: Optional[str],
    officer_id: Optional[UUID],
    result: Optional[str],
    violation: Optional[bool],
    from_date: Optional[date],
    to_date: Optional[date],
):
    findings_ct = (
        select(func.count(Finding.id))
        .where(Finding.inspection_id == Inspection.id)
        .correlate(Inspection)
        .scalar_subquery()
    )
    stmt = (
        select(
            Inspection,
            Commodity.generic_name,
            Commodity.barcode,
            Brand.name,
            BusinessEntity.legal_name,
            User.name,
            findings_ct.label("findings_count"),
        )
        .join(Commodity, Inspection.commodity_id == Commodity.id)
        .outerjoin(Brand, Commodity.brand_id == Brand.id)
        .outerjoin(BusinessEntity, Commodity.business_entity_id == BusinessEntity.id)
        .join(User, Inspection.officer_id == User.id)
    )
    if not _can_view_all(user):
        stmt = stmt.where(Inspection.officer_id == user.id)
    if officer_id:
        stmt = stmt.where(Inspection.officer_id == officer_id)
    if brand:
        stmt = stmt.where(Brand.name.ilike(f"%{brand}%"))
    if manufacturer:
        stmt = stmt.where(BusinessEntity.legal_name.ilike(f"%{manufacturer}%"))
    if commodity:
        stmt = stmt.where(Commodity.generic_name.ilike(f"%{commodity}%"))
    if barcode:
        stmt = stmt.where(Commodity.barcode == barcode)
    if result:
        stmt = stmt.where(Inspection.compliance_result == result.upper())
    if violation:
        stmt = stmt.where(Inspection.compliance_result == "FAIL")
    if from_date:
        stmt = stmt.where(func.date(Inspection.created_at) >= from_date)
    if to_date:
        stmt = stmt.where(func.date(Inspection.created_at) <= to_date)
    return stmt


def _to_row(
    inspection: Inspection,
    commodity: str,
    barcode,
    brand,
    manufacturer,
    officer_name,
    findings_count,
) -> RepositoryRow:
    loc = inspection.location or {}
    return RepositoryRow(
        inspection_id=inspection.id,
        created_at=inspection.created_at,
        submitted_at=inspection.submitted_at,
        status=inspection.status,
        compliance_result=inspection.compliance_result,
        final_decision=inspection.final_decision,
        officer_id=inspection.officer_id,
        officer_name=officer_name,
        commodity=commodity,
        brand=brand,
        manufacturer=manufacturer,
        barcode=barcode,
        district=loc.get("district"),
        state=loc.get("state"),
        findings_count=findings_count,
    )


@router.get("/search", response_model=RepositoryOut)
async def search_repository(
    brand: Optional[str] = None,
    manufacturer: Optional[str] = None,
    commodity: Optional[str] = None,
    barcode: Optional[str] = None,
    officer_id: Optional[UUID] = None,
    result: Optional[str] = None,
    violation: Optional[bool] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _guard: User = view_guard,
):
    stmt = _base_stmt(
        current_user, brand, manufacturer, commodity, barcode,
        officer_id, result, violation, from_date, to_date,
    )
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await db.execute(count_stmt)).scalar() or 0
    rows = (
        await db.execute(stmt.order_by(Inspection.created_at.desc()).offset(offset).limit(limit))
    ).all()
    items = [
        _to_row(insp, comm, barcode, br, ent, oname, fct)
        for insp, comm, barcode, br, ent, oname, fct in rows
    ]
    return RepositoryOut(items=items, total=total)


@router.get("/export")
@router.get("/export/csv")
async def export_repository(
    brand: Optional[str] = None,
    manufacturer: Optional[str] = None,
    commodity: Optional[str] = None,
    barcode: Optional[str] = None,
    officer_id: Optional[UUID] = None,
    result: Optional[str] = None,
    violation: Optional[bool] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _guard: User = view_guard,
):
    stmt = _base_stmt(
        current_user, brand, manufacturer, commodity, barcode,
        officer_id, result, violation, from_date, to_date,
    )
    rows = (
        await db.execute(stmt.order_by(Inspection.created_at.desc()).limit(5000))
    ).all()

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=COLUMNS)
    writer.writeheader()
    for insp, comm, barcode, br, ent, oname, fct in rows:
        row = _to_row(insp, comm, barcode, br, ent, oname, fct)
        d = row.model_dump()
        d["inspection_id"] = str(d["inspection_id"])
        d["officer_id"] = str(d["officer_id"])
        d["created_at"] = d["created_at"].isoformat() if d["created_at"] else ""
        d["submitted_at"] = d["submitted_at"].isoformat() if d["submitted_at"] else ""
        writer.writerow(d)
    buf.seek(0)

    stamp = datetime.now().strftime("%Y%m%d")
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=repository_{stamp}.csv"},
    )
