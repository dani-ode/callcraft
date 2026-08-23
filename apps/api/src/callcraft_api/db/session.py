import logging
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from callcraft_api.config import settings

logger = logging.getLogger("callcraft.db")

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Primary Async Engine
engine = create_async_engine(
    db_url,
    echo=settings.app_env == "development",
    poolclass=NullPool,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

# In-Memory SQLite Engine for offline execution & fast test suite
_fallback_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
_FallbackSessionLocal = async_sessionmaker(
    bind=_fallback_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
_use_fallback = False
_fallback_initialized = False


_postgres_initialized = False


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Yields active PostgreSQL session, or falls back to initialized in-memory database session."""
    global _use_fallback, _fallback_initialized, _postgres_initialized

    if not _use_fallback and not _postgres_initialized:
        _postgres_initialized = True
        try:
            async with AsyncSessionLocal() as init_sess:
                from callcraft_api.db.init_db import init_db
                await init_db(init_sess)
        except Exception as conn_err:
            logger.warning(f"PostgreSQL connection offline ({conn_err}), switching to in-memory DB fallback.")
            _use_fallback = True

    if not _use_fallback:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
        return

    # Fallback to in-memory SQLite session
    if not _fallback_initialized:
        from callcraft_api.db.init_db import init_db
        async with _FallbackSessionLocal() as init_sess:
            await init_db(init_sess)
        _fallback_initialized = True

    async with _FallbackSessionLocal() as fallback_session:
        try:
            yield fallback_session
        except Exception:
            await fallback_session.rollback()
            raise
