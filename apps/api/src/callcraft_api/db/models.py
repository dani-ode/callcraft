from datetime import datetime, date
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    BIGINT,
    BOOLEAN,
    DATE,
    INT,
    JSON,
    NUMERIC,
    TEXT,
    VARCHAR,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Table,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


# Junction Tables
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", VARCHAR(26), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("permission_id", VARCHAR(26), ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True),
)

user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", VARCHAR(26), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", VARCHAR(26), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    email: Mapped[str] = mapped_column(VARCHAR(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    full_name: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    status: Mapped[str] = mapped_column(VARCHAR(50), default="active", nullable=False, index=True)
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    api_credentials: Mapped[List["ApiCredential"]] = relationship("ApiCredential", back_populates="user", cascade="all, delete-orphan")
    call_specs: Mapped[List["CallSpec"]] = relationship("CallSpec", back_populates="user", cascade="all, delete-orphan")
    ai_providers: Mapped[List["UserAiProvider"]] = relationship("UserAiProvider", back_populates="user", cascade="all, delete-orphan")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    name: Mapped[str] = mapped_column(VARCHAR(50), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(TEXT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    code: Mapped[str] = mapped_column(VARCHAR(100), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(TEXT)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ServiceClient(Base):
    __tablename__ = "service_clients"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    name: Mapped[str] = mapped_column(VARCHAR(100), unique=True, nullable=False)
    client_id: Mapped[str] = mapped_column(VARCHAR(100), unique=True, nullable=False)
    secret_hash: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    status: Mapped[str] = mapped_column(VARCHAR(50), default="active", nullable=False)
    permissions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=list, nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class ApiCredential(Base):
    __tablename__ = "api_credentials"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    user_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    public_key: Mapped[str] = mapped_column(VARCHAR(100), unique=True, nullable=False, index=True)
    secret_key_hash: Mapped[str] = mapped_column(VARCHAR(255), nullable=False)
    environment: Mapped[str] = mapped_column(VARCHAR(20), default="production", nullable=False)
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    revoked_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="api_credentials")


class AiProvider(Base):
    __tablename__ = "ai_providers"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    code: Mapped[str] = mapped_column(VARCHAR(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(BOOLEAN, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    models: Mapped[List["AiModel"]] = relationship("AiModel", back_populates="provider", cascade="all, delete-orphan")


class AiModel(Base):
    __tablename__ = "ai_models"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    provider_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("ai_providers.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    model_identifier: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    supports_image: Mapped[bool] = mapped_column(BOOLEAN, default=True, nullable=False)
    supports_tool_calling: Mapped[bool] = mapped_column(BOOLEAN, default=True, nullable=False)
    supports_structured_output: Mapped[bool] = mapped_column(BOOLEAN, default=True, nullable=False)
    cost_per_1k_prompt_tokens: Mapped[float] = mapped_column(NUMERIC(10, 6), default=0.000150)
    cost_per_1k_completion_tokens: Mapped[float] = mapped_column(NUMERIC(10, 6), default=0.000600)
    is_default: Mapped[bool] = mapped_column(BOOLEAN, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(BOOLEAN, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    provider: Mapped["AiProvider"] = relationship("AiProvider", back_populates="models")


class UserAiProvider(Base):
    __tablename__ = "user_ai_providers"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    user_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("ai_providers.id", ondelete="CASCADE"), nullable=False)
    encrypted_api_key: Mapped[str] = mapped_column(TEXT, nullable=False)
    key_nonce: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    is_active: Mapped[bool] = mapped_column(BOOLEAN, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "provider_id", name="uq_user_provider"),)

    user: Mapped["User"] = relationship("User", back_populates="ai_providers")


class Template(Base):
    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    code: Mapped[str] = mapped_column(VARCHAR(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(TEXT)
    category: Mapped[str] = mapped_column(VARCHAR(50), nullable=False)
    request_schema: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    response_schema: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    system_prompt: Mapped[str] = mapped_column(TEXT, nullable=False)
    extraction_prompt: Mapped[Optional[str]] = mapped_column(TEXT)
    is_official: Mapped[bool] = mapped_column(BOOLEAN, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class CallSpec(Base):
    __tablename__ = "call_specs"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    user_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    template_id: Mapped[Optional[str]] = mapped_column(VARCHAR(26), ForeignKey("templates.id", ondelete="SET NULL"))
    name: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    slug: Mapped[str] = mapped_column(VARCHAR(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(TEXT)
    active_version_number: Mapped[int] = mapped_column(INT, default=1, nullable=False)
    status: Mapped[str] = mapped_column(VARCHAR(50), default="active", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "slug", name="uq_user_spec_slug"),)

    user: Mapped["User"] = relationship("User", back_populates="call_specs")
    versions: Mapped[List["CallSpecVersion"]] = relationship("CallSpecVersion", back_populates="call_spec", cascade="all, delete-orphan")


class CallSpecVersion(Base):
    __tablename__ = "call_spec_versions"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    call_spec_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("call_specs.id", ondelete="CASCADE"), nullable=False)
    version_number: Mapped[int] = mapped_column(INT, nullable=False)
    request_schema: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    response_schema: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    system_prompt: Mapped[Optional[str]] = mapped_column(TEXT)
    extraction_prompt: Mapped[Optional[str]] = mapped_column(TEXT)
    preferred_model_id: Mapped[Optional[str]] = mapped_column(VARCHAR(26), ForeignKey("ai_models.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("call_spec_id", "version_number", name="uq_spec_version"),)

    call_spec: Mapped["CallSpec"] = relationship("CallSpec", back_populates="versions")


class SystemPrompt(Base):
    __tablename__ = "system_prompts"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    code: Mapped[str] = mapped_column(VARCHAR(100), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(VARCHAR(150), nullable=False)
    content: Mapped[str] = mapped_column(TEXT, nullable=False)
    is_active: Mapped[bool] = mapped_column(BOOLEAN, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class ApiRequest(Base):
    __tablename__ = "api_requests"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    request_id: Mapped[str] = mapped_column(VARCHAR(100), unique=True, nullable=False)
    user_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    call_spec_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("call_specs.id", ondelete="CASCADE"), nullable=False, index=True)
    call_spec_version_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("call_spec_versions.id", ondelete="CASCADE"), nullable=False)
    credential_id: Mapped[Optional[str]] = mapped_column(VARCHAR(26), ForeignKey("api_credentials.id", ondelete="SET NULL"))
    provider_id: Mapped[Optional[str]] = mapped_column(VARCHAR(26), ForeignKey("ai_providers.id", ondelete="SET NULL"))
    model_id: Mapped[Optional[str]] = mapped_column(VARCHAR(26), ForeignKey("ai_models.id", ondelete="SET NULL"))

    status: Mapped[str] = mapped_column(VARCHAR(50), nullable=False, index=True)
    http_status: Mapped[int] = mapped_column(INT, nullable=False)

    input_type: Mapped[str] = mapped_column(VARCHAR(20), nullable=False)
    input_size_bytes: Mapped[int] = mapped_column(INT, nullable=False)

    processing_time_ms: Mapped[int] = mapped_column(INT, nullable=False)
    prompt_tokens: Mapped[int] = mapped_column(INT, default=0)
    completion_tokens: Mapped[int] = mapped_column(INT, default=0)
    total_tokens: Mapped[int] = mapped_column(INT, default=0)
    estimated_cost_usd: Mapped[float] = mapped_column(NUMERIC(10, 6), default=0.000000)

    error_code: Mapped[Optional[str]] = mapped_column(VARCHAR(100))
    error_message: Mapped[Optional[str]] = mapped_column(TEXT)

    client_ip: Mapped[Optional[str]] = mapped_column(VARCHAR(45))
    user_agent: Mapped[Optional[str]] = mapped_column(TEXT)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class UserUsageDaily(Base):
    __tablename__ = "user_usage_daily"

    id: Mapped[str] = mapped_column(VARCHAR(26), primary_key=True)
    user_id: Mapped[str] = mapped_column(VARCHAR(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    usage_date: Mapped[date] = mapped_column(DATE, nullable=False)
    total_requests: Mapped[int] = mapped_column(INT, default=0, nullable=False)
    successful_requests: Mapped[int] = mapped_column(INT, default=0, nullable=False)
    failed_requests: Mapped[int] = mapped_column(INT, default=0, nullable=False)
    total_tokens: Mapped[int] = mapped_column(BIGINT, default=0, nullable=False)
    total_cost_usd: Mapped[float] = mapped_column(NUMERIC(12, 6), default=0.000000, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (UniqueConstraint("user_id", "usage_date", name="uq_user_daily_usage"),)
