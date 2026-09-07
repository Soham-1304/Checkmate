from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: str = "OFFICER"
    employee_id: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)


class UserUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=20)
    role: Optional[str] = None
    is_active: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    employee_id: Optional[str] = None
    phone: Optional[str] = None
    role: str = ""
    is_active: bool
    created_at: datetime

    @classmethod
    def from_user(cls, user) -> "UserOut":
        return cls(
            id=user.id,
            name=user.name,
            email=user.email,
            employee_id=user.employee_id,
            phone=user.phone,
            role=user.role.name if user.role else "",
            is_active=user.is_active,
            created_at=user.created_at,
        )


class UserListOut(BaseModel):
    users: List[UserOut]
    total: int
