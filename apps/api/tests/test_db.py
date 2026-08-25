"""
Unit tests for database initialization, seeding, and Repository operations.

Uses a dedicated PostgreSQL schema for isolation so it does not interfere
with the live tables used by test_routes.py and other integration tests.
"""
import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text
from callcraft_api.config import settings
from callcraft_api.db.models import Base
from callcraft_api.db.init_db import init_db
from callcraft_api.db.repository import Repository


def _build_asyncpg_url(url: str) -> str:
    """Normalize DATABASE_URL to asyncpg driver format."""
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


@pytest.fixture
async def test_session():
    """
    Creates a fully isolated PostgreSQL session using a per-test schema.
    The schema is dropped after the test completes to ensure no shared state.
    """
    schema_name = f"test_{uuid.uuid4().hex[:12]}"
    db_url = _build_asyncpg_url(settings.database_url)

    # Use a separate engine with search_path scoped to the ephemeral schema
    schema_engine = create_async_engine(
        db_url,
        echo=False,
        connect_args={"server_settings": {"search_path": schema_name}},
    )

    async with schema_engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=schema_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        await init_db(session)
        yield session

    # Teardown: drop the ephemeral schema and all its tables
    async with schema_engine.begin() as conn:
        await conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema_name}" CASCADE'))

    await schema_engine.dispose()


@pytest.mark.asyncio
async def test_init_db_seeding(test_session: AsyncSession):
    # Verify templates seeding
    templates = await Repository.list_templates(test_session)
    assert len(templates) >= 3
    template_codes = [t["code"] for t in templates]
    assert "government-issued-identity-document" in template_codes
    assert "financial-receipt-invoice-suite" in template_codes
    assert "medical-prescription-lab-report" in template_codes

    # Verify initial call specs
    specs = await Repository.list_call_specs(test_session, "usr_default_dev_01")
    assert len(specs) >= 3


@pytest.mark.asyncio
async def test_create_and_verify_api_credential(test_session: AsyncSession):
    cred_dict, secret_key = await Repository.create_api_credential(
        db=test_session, user_id="usr_default_dev_01", name="Test App Key", environment="sandbox"
    )

    assert cred_dict["name"] == "Test App Key"
    assert cred_dict["environment"] == "sandbox"
    assert secret_key.startswith("call_sk_live_")

    # Verify valid credential
    verified = await Repository.verify_api_credential(
        db=test_session, public_key=cred_dict["publicKey"], secret_key=secret_key
    )
    assert verified is not None
    assert verified["id"] == cred_dict["id"]
    assert verified["user_id"] == "usr_default_dev_01"

    # Verify invalid secret key fails
    invalid = await Repository.verify_api_credential(
        db=test_session, public_key=cred_dict["publicKey"], secret_key="wrong_secret"
    )
    assert invalid is None

    # Verify mismatched public key fails
    mismatched = await Repository.verify_api_credential(
        db=test_session, public_key="pk_mismatched_key_9999", secret_key=secret_key
    )
    assert mismatched is None


@pytest.mark.asyncio
async def test_create_and_fetch_call_spec(test_session: AsyncSession):
    schema = {
        "properties": {
            "title": {"type": "string", "required": True},
            "amount": {"type": "number", "required": True},
        }
    }
    created = await Repository.create_call_spec(
        db=test_session,
        user_id="usr_default_dev_01",
        name="Custom Receipt Spec",
        slug="custom-receipt",
        description="Extract custom receipt fields",
        response_schema=schema,
        positive_prompt="Custom positive prompt instructions",
        negative_prompt="Custom negative prompt constraints",
    )

    assert created["slug"] == "custom-receipt"
    assert created["status"] == "active"

    # Fetch spec by slug
    fetched = await Repository.get_call_spec(test_session, "usr_default_dev_01", "custom-receipt")
    assert fetched is not None
    assert fetched["name"] == "Custom Receipt Spec"
    assert fetched["responseSchema"] == schema
    assert fetched["positivePrompt"] == "Custom positive prompt instructions"
    assert fetched["negativePrompt"] == "Custom negative prompt constraints"
