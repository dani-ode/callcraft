"""
Callcraft API Test Suite - Global Fixtures & Setup
Ensures PostgreSQL tables and seed data are initialized before all tests run.
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from callcraft_api.config import settings
from callcraft_api.db.models import Base
from callcraft_api.db.init_db import init_db


def _build_asyncpg_url(url: str) -> str:
    """Normalize DATABASE_URL to asyncpg driver format."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


@pytest.fixture(scope="session", autouse=True)
async def ensure_db_initialized():
    """
    Session-scoped fixture that initializes all PostgreSQL tables and seeds
    baseline data once before the entire test suite runs.
    """
    db_url = _build_asyncpg_url(settings.resolved_database_url)
    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        await init_db(session)

    await engine.dispose()
    yield
