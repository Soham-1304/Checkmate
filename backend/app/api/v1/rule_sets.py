from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import EntityNotFoundException
from app.deps import get_current_user, get_db
from app.models.rules import Requirement, RuleSet
from app.models.user import User
from app.schemas.rules import RuleSetDetailOut, RuleSetOut

router = APIRouter(prefix="/rule-sets", tags=["Rulebook"])


@router.get("", response_model=List[RuleSetOut])
async def list_rule_sets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        await db.execute(
            select(RuleSet, func.count(Requirement.id))
            .outerjoin(Requirement, Requirement.rule_set_id == RuleSet.id)
            .group_by(RuleSet.id)
            .order_by(RuleSet.created_at.desc())
        )
    ).all()
    return [
        RuleSetOut(
            id=rs.id,
            version=rs.version,
            description=rs.description,
            is_active=rs.is_active,
            effective_at=rs.effective_at,
            requirements_count=count,
        )
        for rs, count in rows
    ]


@router.get("/active", response_model=RuleSetDetailOut)
async def get_active_rule_set(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rs = (
        await db.execute(
            select(RuleSet).options(selectinload(RuleSet.requirements)).where(RuleSet.is_active == True)
        )
    ).scalar_one_or_none()
    if not rs:
        raise EntityNotFoundException("RuleSet", "active")
    return RuleSetDetailOut(
        id=rs.id, version=rs.version, description=rs.description, is_active=rs.is_active,
        effective_at=rs.effective_at, requirements_count=len(rs.requirements), requirements=rs.requirements,
    )


@router.get("/{rule_set_id}", response_model=RuleSetDetailOut)
async def get_rule_set(
    rule_set_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rs = (
        await db.execute(
            select(RuleSet).options(selectinload(RuleSet.requirements)).where(RuleSet.id == rule_set_id)
        )
    ).scalar_one_or_none()
    if not rs:
        raise EntityNotFoundException("RuleSet", rule_set_id)
    return RuleSetDetailOut(
        id=rs.id, version=rs.version, description=rs.description, is_active=rs.is_active,
        effective_at=rs.effective_at, requirements_count=len(rs.requirements), requirements=rs.requirements,
    )
