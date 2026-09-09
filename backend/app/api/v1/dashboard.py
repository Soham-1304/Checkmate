from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.deps import get_current_user, get_db, require_capability
from app.models.compliance import Finding
from app.models.evidence import Declaration
from app.models.master_data import Brand, BusinessEntity, Commodity
from app.models.user import User
from app.models.workflow import Assignment, Inspection

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Analytics"])


@router.get("/summary")
async def get_dashboard_summary(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    total_inspections = (await db.execute(select(func.count(Inspection.id)))).scalar() or 0
    draft_count = (
        await db.execute(select(func.count(Inspection.id)).where(Inspection.status == "DRAFT"))
    ).scalar() or 0
    under_review_count = (
        await db.execute(select(func.count(Inspection.id)).where(Inspection.status == "UNDER_REVIEW"))
    ).scalar() or 0
    completed_count = (
        await db.execute(select(func.count(Inspection.id)).where(Inspection.status == "COMPLETED"))
    ).scalar() or 0

    pass_count = (
        await db.execute(select(func.count(Inspection.id)).where(Inspection.compliance_result == "PASS"))
    ).scalar() or 0
    fail_count = (
        await db.execute(select(func.count(Inspection.id)).where(Inspection.compliance_result == "FAIL"))
    ).scalar() or 0
    review_count = (
        await db.execute(select(func.count(Inspection.id)).where(Inspection.compliance_result == "REVIEW"))
    ).scalar() or 0

    return {
        "total_inspections": total_inspections,
        "by_status": {
            "draft": draft_count,
            "under_review": under_review_count,
            "completed": completed_count,
        },
        "by_result": {
            "compliant_pass": pass_count,
            "non_compliant_fail": fail_count,
            "review_needed": review_count,
        },
    }


@router.get("/violations")
async def get_top_violations(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    stmt = (
        select(Finding.legal_reference, Finding.title, func.count(Finding.id).label("count"))
        .group_by(Finding.legal_reference, Finding.title)
        .order_by(func.count(Finding.id).desc())
        .limit(10)
    )
    result = await db.execute(stmt)
    rows = result.all()

    return [{"rule_reference": r[0], "title": r[1], "occurrences": r[2]} for r in rows]


@router.get("/officer")
async def get_officer_dashboard(
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)
):
    today = datetime.now(timezone.utc).date()
    today_count = (
        await db.execute(
            select(func.count(Inspection.id)).where(
                Inspection.officer_id == current_user.id, func.date(Inspection.created_at) == today
            )
        )
    ).scalar() or 0

    pending = (
        await db.execute(
            select(func.count(Assignment.id)).where(
                Assignment.assigned_to == current_user.id,
                Assignment.status.in_(["ASSIGNED", "REASSIGNED", "IN_PROGRESS"]),
            )
        )
    ).scalar() or 0

    total_mine = (
        await db.execute(select(func.count(Inspection.id)).where(Inspection.officer_id == current_user.id))
    ).scalar() or 0
    done_mine = (
        await db.execute(
            select(func.count(Inspection.id)).where(
                Inspection.officer_id == current_user.id, Inspection.status == "COMPLETED"
            )
        )
    ).scalar() or 0

    recent = (
        await db.execute(
            select(Inspection)
            .options(selectinload(Inspection.commodity).selectinload(Commodity.brand))
            .where(Inspection.officer_id == current_user.id)
            .order_by(desc(Inspection.created_at))
            .limit(10)
        )
    ).scalars().all()

    return {
        "today_count": today_count,
        "my_pending_assignments": pending,
        "my_completion_rate": round(done_mine / total_mine, 3) if total_mine else 0.0,
        "my_total_inspections": total_mine,
        "recent_activity": [
            {
                "id": str(i.id),
                "status": i.status,
                "compliance_result": i.compliance_result,
                "created_at": i.created_at,
                "commodity_id": str(i.commodity_id) if i.commodity_id else None,
                "brand_name": i.commodity.brand.name if i.commodity and i.commodity.brand else None,
                "commodity_name": i.commodity.generic_name if i.commodity else None,
            }
            for i in recent
        ],
    }


@router.get("/admin")
async def get_admin_dashboard(
    days: int = Query(30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_capability("can_view_admin_kpis")),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # 1. Volume trend (date_trunc day, zero-filled)
    trend_rows = (
        await db.execute(
            select(func.date_trunc("day", Inspection.created_at).label("day"), func.count(Inspection.id))
            .where(Inspection.created_at >= since)
            .group_by("day")
            .order_by("day")
        )
    ).all()
    by_day = {r[0].date().isoformat(): r[1] for r in trend_rows}
    volume_trend = [
        {"date": (since + timedelta(days=i)).date().isoformat(), "count": by_day.get((since + timedelta(days=i)).date().isoformat(), 0)}
        for i in range(days + 1)
    ]

    # 2. Compliance split + rate
    comp_rows = (
        await db.execute(
            select(Inspection.compliance_result, func.count(Inspection.id))
            .where(Inspection.created_at >= since)
            .group_by(Inspection.compliance_result)
        )
    ).all()
    comp = {r[0] or "PENDING": r[1] for r in comp_rows}
    judged = comp.get("PASS", 0) + comp.get("FAIL", 0)

    # 3. Recidivism — brands/entities with repeat findings
    recid_rows = (
        await db.execute(
            select(
                Brand.id, Brand.name, BusinessEntity.legal_name,
                func.count(Finding.id).label("violations"),
                func.count(func.distinct(Finding.inspection_id)).label("inspections"),
            )
            .join(Inspection, Finding.inspection_id == Inspection.id)
            .join(Commodity, Inspection.commodity_id == Commodity.id)
            .join(Brand, Commodity.brand_id == Brand.id)
            .join(BusinessEntity, Brand.business_entity_id == BusinessEntity.id)
            .where(Inspection.created_at >= since)
            .group_by(Brand.id, Brand.name, BusinessEntity.legal_name)
            .having(func.count(Finding.id) > 1)
            .order_by(desc("violations"))
            .limit(10)
        )
    ).all()

    # 4. AI exception quality — low confidence + officer override + REVIEW share
    total_decls = (await db.execute(select(func.count(Declaration.id)))).scalar() or 0
    low_conf = (
        await db.execute(select(func.count(Declaration.id)).where(Declaration.confidence.isnot(None), Declaration.confidence < 0.60))
    ).scalar() or 0
    overrides = (
        await db.execute(select(func.count(Declaration.id)).where(Declaration.is_corrected == True))
    ).scalar() or 0
    review_share = (
        await db.execute(select(func.count(Inspection.id)).where(Inspection.compliance_result == "REVIEW"))
    ).scalar() or 0

    # 5. Workload per officer
    workload_rows = (
        await db.execute(
            select(User.id, User.name, func.count(Inspection.id).label("total"),
                   func.sum(case((Inspection.status == "COMPLETED", 1), else_=0)).label("completed"))
            .join(Inspection, Inspection.officer_id == User.id)
            .where(Inspection.created_at >= since)
            .group_by(User.id, User.name)
            .order_by(desc("total"))
        )
    ).all()

    # 6. Geographic split (state / district from location JSONB)
    state_key = Inspection.location["state"].astext.label("k")
    district_key = Inspection.location["district"].astext.label("k")
    state_rows = (
        await db.execute(
            select(state_key, func.count(Inspection.id))
            .where(Inspection.created_at >= since, Inspection.location.has_key("state"))
            .group_by("k")
            .order_by(desc(func.count(Inspection.id)))
        )
    ).all()
    district_rows = (
        await db.execute(
            select(district_key, func.count(Inspection.id))
            .where(Inspection.created_at >= since, Inspection.location.has_key("district"))
            .group_by("k")
            .order_by(desc(func.count(Inspection.id)))
            .limit(20)
        )
    ).all()

    # 7. Sector split (commodity category, with fail share)
    sector_rows = (
        await db.execute(
            select(Commodity.category, func.count(Inspection.id).label("total"),
                   func.sum(case((Inspection.compliance_result == "FAIL", 1), else_=0)).label("fails"))
            .join(Inspection, Inspection.commodity_id == Commodity.id)
            .where(Inspection.created_at >= since)
            .group_by(Commodity.category)
            .order_by(desc("total"))
        )
    ).all()

    return {
        "window_days": days,
        "volume_trend": volume_trend,
        "compliance": {**comp, "pass_rate": round(comp.get("PASS", 0) / judged, 3) if judged else 0.0},
        "repeat_offenders": [
            {"brand_id": r[0], "brand": r[1], "entity": r[2], "violations": r[3], "inspections": r[4]}
            for r in recid_rows
        ],
        "ai_quality": {
            "total_declarations": total_decls,
            "low_confidence": low_conf,
            "low_confidence_rate": round(low_conf / total_decls, 3) if total_decls else 0.0,
            "officer_overrides": overrides,
            "override_rate": round(overrides / total_decls, 3) if total_decls else 0.0,
            "review_outcomes": review_share,
        },
        "workload": [{"officer_id": r[0], "officer": r[1], "total": r[2], "completed": int(r[3] or 0)} for r in workload_rows],
        "geography": {
            "by_state": [{"state": r[0], "count": r[1]} for r in state_rows],
            "by_district": [{"district": r[0], "count": r[1]} for r in district_rows],
        },
        "sectors": [{"category": r[0], "total": r[1], "fails": int(r[2] or 0)} for r in sector_rows],
    }
