"""
Callcraft API Test Suite - Global Fixtures & Setup
Ensures PostgreSQL tables and seed data are initialized before all tests run.
"""
import os
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

# Ensure test environment variables are set before application components load
os.environ.setdefault("FRONTEND_URL", "http://localhost:3000")
os.environ.setdefault("GOOGLE_CLIENT_ID", "mock-google-client-id.apps.googleusercontent.com")
os.environ.setdefault("GOOGLE_CLIENT_SECRET", "mock-google-client-secret")
os.environ.setdefault("GOOGLE_REDIRECT_URI", "http://localhost:8081/internal/v1/auth/google/callback")

from callcraft_api.config import settings
from callcraft_api.db.models import Base
from callcraft_api.db.init_db import init_db

# Patch settings object directly if loaded before os.environ
if not settings.frontend_url:
    settings.frontend_url = "http://localhost:3000"
if not settings.google_client_id:
    settings.google_client_id = "mock-google-client-id.apps.googleusercontent.com"
if not settings.google_client_secret:
    settings.google_client_secret = "mock-google-client-secret"
if not settings.google_redirect_uri:
    settings.google_redirect_uri = "http://localhost:8081/internal/v1/auth/google/callback"


def _build_asyncpg_url(url: str) -> str:
    """Normalize DATABASE_URL to asyncpg driver format."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


import pytest_asyncio


@pytest_asyncio.fixture(scope="session", autouse=True)
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
