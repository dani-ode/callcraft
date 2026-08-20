import logging
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from callcraft_api.config import settings

logger = logging.getLogger("callcraft.db")

db_url = settings.database_url
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and "+asyncpg" not in db_url:
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

# Create Async Engine for PostgreSQL
engine = create_async_engine(
    db_url,
    echo=settings.app_env == "development",
    pool_size=10,
    max_overflow=20,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db_session() -> AsyncGenerator[Optional[AsyncSession], None]:
    try:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
    except (OSError, Exception) as db_err:
        # If DB connection engine fails at startup/connect, yield None for offline mode
        # Note: Must check if error is DB connect error vs route exception
        if "password authentication failed" in str(db_err) or "Connection refused" in str(db_err) or "NoSuchModuleError" in str(db_err):
            logger.warning(f"DB offline mode: {db_err}")
            yield None
        else:
            raise db_err
