from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base
from app.core.config import settings


def _async_db_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def _connect_args(url: str) -> dict:
    if "pooler.supabase.com" in url:
        return {"statement_cache_size": 0}
    return {}


engine = create_async_engine(
    _async_db_url(settings.DATABASE_URL),
    echo=False,
    future=True,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=5,
    connect_args=_connect_args(settings.DATABASE_URL),
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()
