from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    PROJECT_NAME: str = "DoCA Legal Metrology Compliance System"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "doca_development_secret_key_change_in_production_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # CORS (comma-separated env override for web + Expo RN)
    BACKEND_CORS_ORIGINS: List[Union[str, AnyHttpUrl]] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and v:
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    # Database (local docker OR Supabase pooler — full URL wins)
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "doca_admin"
    POSTGRES_PASSWORD: str = "doca_secure_password_2026"
    POSTGRES_DB: str = "doca_db"
    DATABASE_URL: str = (
        "postgresql+asyncpg://doca_admin:doca_secure_password_2026@localhost:5432/doca_db"
    )

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Storage backend: "local" (backend/uploads + /uploads/*) or "supabase"
    STORAGE_BACKEND: str = "local"
    MAX_UPLOAD_MB: int = 10

    # Legacy MinIO (local docker path — superseded by Supabase Storage)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minio_admin"
    MINIO_SECRET_KEY: str = "minio_secure_password_2026"
    MINIO_BUCKET_EVIDENCE: str = "doca-evidence"
    MINIO_BUCKET_REPORTS: str = "doca-reports"
    MINIO_SECURE: bool = False

    # Supabase (Postgres + Storage only — FastAPI stays the API)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    SUPABASE_BUCKET_EVIDENCE: str = "doca-evidence"
    SUPABASE_BUCKET_REPORTS: str = "doca-reports"
    SUPABASE_URL_EXPIRE_SECS: int = 3600

    # Regulatory Baseline
    ACTIVE_RULE_SET_VERSION: str = "LM-PCR-2011-v1.0"


settings = Settings()
