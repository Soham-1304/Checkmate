from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.deps import get_current_user, get_db
from app.models.compliance import Finding
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
            select(Inspection).where(Inspection.officer_id == current_user.id).order_by(desc(Inspection.created_at)).limit(5)
        )
    ).scalars().all()

    return {
        "today_count": today_count,
        "my_pending_assignments": pending,
        "my_completion_rate": round(done_mine / total_mine, 3) if total_mine else 0.0,
        "my_total_inspections": total_mine,
        "recent_activity": [
            {"id": i.id, "status": i.status, "compliance_result": i.compliance_result, "created_at": i.created_at}
            for i in recent
        ],
    }
