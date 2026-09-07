from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.core.security import (
    create_access_token,
    hash_refresh_token,
    new_refresh_token,
    refresh_token_expiry,
    verify_password,
)
from app.deps import get_current_user, get_db
from app.models.user import RefreshToken, User
from app.schemas.auth import LoginRequest, LogoutRequest, RefreshRequest, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])


async def _issue_token_pair(db: AsyncSession, user: User) -> Token:
    access_token = create_access_token(subject=user.id)
    raw_refresh = new_refresh_token()
    db.add(RefreshToken(user_id=user.id, token_hash=hash_refresh_token(raw_refresh), expires_at=refresh_token_expiry()))
    await db.commit()
    return Token(
        access_token=access_token,
        token_type="bearer",
        role=user.role.name,
        user_id=user.id,
        name=user.name,
        refresh_token=raw_refresh,
    )


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
):
    stmt = select(User).options(selectinload(User.role)).where(User.email == form_data.username)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account")

    return await _issue_token_pair(db, user)


@router.post("/login/json", response_model=Token)
async def login_json(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(User).options(selectinload(User.role)).where(User.email == payload.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user account")

    return await _issue_token_pair(db, user)


@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "role": current_user.role.name,
        "employee_id": current_user.employee_id,
    }


@router.post("/refresh", response_model=Token)
async def refresh_tokens(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    now = datetime.now(timezone.utc)
    stored = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(payload.refresh_token)))
    ).scalar_one_or_none()

    if not stored:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    if stored.revoked_at is not None:
        # Reuse of a rotated token → possible theft: revoke the whole chain.
        chain = (
            await db.execute(select(RefreshToken).where(RefreshToken.user_id == stored.user_id, RefreshToken.revoked_at.is_(None)))
        ).scalars().all()
        for tok in chain:
            tok.revoked_at = now
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token reused. All sessions revoked — please log in again.")

    if stored.expires_at <= now:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired.")

    user = (await db.execute(select(User).options(selectinload(User.role)).where(User.id == stored.user_id))).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account unavailable.")

    raw_next = new_refresh_token()
    successor = RefreshToken(user_id=user.id, token_hash=hash_refresh_token(raw_next), expires_at=refresh_token_expiry())
    db.add(successor)
    await db.flush()
    stored.revoked_at = now
    stored.replaced_by = successor.id
    await db.commit()

    return Token(
        access_token=create_access_token(subject=user.id),
        token_type="bearer",
        role=user.role.name,
        user_id=user.id,
        name=user.name,
        refresh_token=raw_next,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: LogoutRequest, db: AsyncSession = Depends(get_db)):
    stored = (
        await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(payload.refresh_token)))
    ).scalar_one_or_none()
    if stored and stored.revoked_at is None:
        stored.revoked_at = datetime.now(timezone.utc)
        await db.commit()
    return None
