import uuid
from datetime import datetime, timezone
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False, index=True)
    # 'OFFICER', 'REVIEWER', 'ADMIN', 'SUPERADMIN'
    permissions = Column(JSONB, nullable=False, default=dict)

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id"), nullable=False)
    employee_id = Column(String(100), unique=True, index=True, nullable=True)
    name = Column(String(200), nullable=False)
    email = Column(String(200), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=True)
    password_hash = Column(Text, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    role = relationship("Role", back_populates="users")
    inspections = relationship("Inspection", back_populates="officer")
    assigned_tasks = relationship(
        "Assignment", foreign_keys="Assignment.assigned_to", back_populates="assignee"
    )
    created_assignments = relationship(
        "Assignment", foreign_keys="Assignment.assigned_by", back_populates="assigner"
    )
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(128), unique=True, nullable=False, index=True)  # sha256 of opaque token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    replaced_by = Column(UUID(as_uuid=True), nullable=True)  # id of rotating successor

    user = relationship("User", back_populates="refresh_tokens")
