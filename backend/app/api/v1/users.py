from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.exceptions import EntityNotFoundException
from app.core.security import get_password_hash
from app.deps import get_current_user, get_db, require_capability
from app.models.compliance import AuditEvent
from app.models.user import Role, User
from app.schemas.users import UserCreate, UserListOut, UserOut, UserUpdate

router = APIRouter(
    prefix="/users",
    tags=["Users"],
    dependencies=[Depends(require_capability("can_manage_users"))],
)

CREATABLE_ROLES = {"OFFICER", "ADMIN", "REVIEWER"}


async def _get_role(db: AsyncSession, name: str) -> Role:
    role = (await db.execute(select(Role).where(Role.name == name.upper()))).scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unknown role '{name}'.")
    return role


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.role.upper() not in CREATABLE_ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Role must be one of {sorted(CREATABLE_ROLES)} (SUPERADMIN cannot be assigned via API).")

    existing = (await db.execute(select(User).where(User.email == payload.email))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    role = await _get_role(db, payload.role)
    user = User(
        name=payload.name,
        email=payload.email,
        password_hash=get_password_hash(payload.password),
        role_id=role.id,
        employee_id=payload.employee_id,
        phone=payload.phone,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    db.add(AuditEvent(actor_id=current_user.id, action="USER_CREATED", entity_type="USER", entity_id=user.id, new_value={"email": user.email, "role": role.name}))
    await db.commit()
    user = (await db.execute(select(User).options(selectinload(User.role)).where(User.id == user.id))).scalar_one()
    return UserOut.from_user(user)


@router.get("", response_model=UserListOut)
async def list_users(
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(User).options(selectinload(User.role))
    count_stmt = select(func.count()).select_from(User)
    if role:
        stmt = stmt.join(Role, User.role_id == Role.id).where(Role.name == role.upper())
        count_stmt = count_stmt.join(Role, User.role_id == Role.id).where(Role.name == role.upper())
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
        count_stmt = count_stmt.where(User.is_active == is_active)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(User.name.ilike(like), User.email.ilike(like), User.employee_id.ilike(like)))
        count_stmt = count_stmt.where(or_(User.name.ilike(like), User.email.ilike(like), User.employee_id.ilike(like)))

    total = (await db.execute(count_stmt)).scalar()
    users = (await db.execute(stmt.order_by(User.created_at.desc()).offset(offset).limit(limit))).scalars().all()
    return UserListOut(users=[UserOut.from_user(u) for u in users], total=total)


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    user = (await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise EntityNotFoundException("User", user_id)
    return UserOut.from_user(user)


@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = (await db.execute(select(User).options(selectinload(User.role)).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise EntityNotFoundException("User", user_id)

    is_self = user.id == current_user.id
    if payload.is_active is False and is_self:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account.")
    if payload.role is not None and is_self and payload.role.upper() != user.role.name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role.")

    changes = {}
    if payload.name is not None:
        user.name = payload.name
        changes["name"] = payload.name
    if payload.phone is not None:
        user.phone = payload.phone
        changes["phone"] = payload.phone
    if payload.role is not None:
        if payload.role.upper() not in CREATABLE_ROLES:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Role must be one of {sorted(CREATABLE_ROLES)}.")
        role = await _get_role(db, payload.role)
        changes["role"] = {"from": user.role.name, "to": role.name}
        user.role_id = role.id
    if payload.is_active is not None and payload.is_active != user.is_active:
        changes["is_active"] = {"from": user.is_active, "to": payload.is_active}
        user.is_active = payload.is_active
    if payload.password is not None:
        user.password_hash = get_password_hash(payload.password)
        changes["password"] = "reset"

    action = "USER_DEACTIVATED" if changes.get("is_active", {}).get("to") is False else ("USER_REACTIVATED" if changes.get("is_active", {}).get("to") is True else "USER_UPDATED")
    db.add(AuditEvent(actor_id=current_user.id, action=action, entity_type="USER", entity_id=user.id, new_value=changes))
    await db.commit()
    user = (await db.execute(select(User).options(selectinload(User.role)).where(User.id == user.id))).scalar_one()
    return UserOut.from_user(user)
