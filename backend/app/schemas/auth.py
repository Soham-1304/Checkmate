from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: UUID
    name: str
    refresh_token: Optional[str] = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
