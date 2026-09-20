"""
Unit tests for database initialization, seeding, and Repository operations.

Uses a dedicated PostgreSQL schema for isolation so it does not interfere
with the live tables used by test_routes.py and other integration tests.
"""
import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text, select
from sqlalchemy.pool import NullPool
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


import pytest_asyncio


@pytest_asyncio.fixture
async def test_session():
    """
    Creates a fully isolated PostgreSQL session using a per-test schema.
    The schema is dropped after the test completes to ensure no shared state.
    """
    schema_name = f"test_{uuid.uuid4().hex[:12]}"
    db_url = _build_asyncpg_url(settings.resolved_database_url)

    # Use a separate engine with search_path scoped to the ephemeral schema
    schema_engine = create_async_engine(
        db_url,
        echo=False,
        poolclass=NullPool,
        connect_args={"server_settings": {"search_path": schema_name}},
    )

    async with schema_engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}"'))
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=schema_engine, class_=AsyncSession, expire_on_commit=False)
    session = session_maker()
    await init_db(session)
    try:
        yield session
    finally:
        await session.close()
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
    specs = await Repository.list_call_specs(test_session, "usr_01HZX01USER0000000000001")
    assert len(specs) >= 3


@pytest.mark.asyncio
async def test_create_and_verify_api_credential(test_session: AsyncSession):
    cred_dict, secret_key = await Repository.create_api_credential(
        db=test_session, user_id="usr_01HZX01USER0000000000001", name="Test App Key", environment="sandbox"
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
    assert verified["user_id"] == "usr_01HZX01USER0000000000001"

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


from callcraft_api.db.models import Base, User, Project

@pytest.mark.asyncio
async def test_create_and_fetch_call_spec(test_session: AsyncSession):
    schema = {
        "properties": {
            "title": {"type": "string", "required": True},
            "amount": {"type": "number", "required": True},
        }
    }
    u_stmt = select(User).where(User.status == "active")
    u_res = await test_session.execute(u_stmt)
    user_obj = u_res.scalars().first()
    assert user_obj is not None

    p_stmt = select(Project).where(Project.user_id == user_obj.id)
    p_res = await test_session.execute(p_stmt)
    proj_obj = p_res.scalars().first()

    created = await Repository.create_call_spec(
        db=test_session,
        user_id=user_obj.id,
        project_id=proj_obj.id if proj_obj else "prj_01HZX01PROJ000000000001",
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
    fetched = await Repository.get_call_spec(test_session, user_obj.id, "custom-receipt")
    assert fetched is not None
    assert fetched["name"] == "Custom Receipt Spec"
    assert fetched["responseSchema"] == schema
    assert fetched["positivePrompt"] == "Custom positive prompt instructions"
    assert fetched["negativePrompt"] == "Custom negative prompt constraints"
    assert fetched["activeVersionId"] is not None


@pytest.mark.asyncio
async def test_record_and_list_api_requests(test_session: AsyncSession):
    u_stmt = select(User).where(User.status == "active")
    user_obj = (await test_session.execute(u_stmt)).scalars().first()
    assert user_obj is not None

    specs = await Repository.list_call_specs(test_session, user_obj.id)
    assert len(specs) > 0
    spec = specs[0]

    # Test record_api_request
    payload = {
        "request_id": "req_test_telemetry_001",
        "user_id": user_obj.id,
        "call_spec_id": spec["id"],
        "call_spec_version_id": spec.get("activeVersionId"),
        "provider_code": "gemini",
        "model_identifier": "gemini-3.6-flash",
        "status": "SUCCESS",
        "http_status": 200,
        "processing_time_ms": 320,
        "prompt_tokens": 500,
        "completion_tokens": 250,
        "total_tokens": 750,
        "estimated_cost_usd": 0.000125,
    }

    log_id = await Repository.record_api_request(test_session, payload)
    assert log_id is not None
    assert log_id.startswith("req_")

    # Test idempotency (duplicate request_id)
    dup_id = await Repository.record_api_request(test_session, payload)
    assert dup_id == log_id

    # Test list_api_requests returns enriched provider and model
    logs = await Repository.list_api_requests(test_session, user_obj.id, project_id=spec["projectId"])
    assert len(logs) > 0
    matching = next((l for l in logs if l["requestId"] == "req_test_telemetry_001"), None)
    assert matching is not None
    assert matching["provider"] == "gemini"
    assert matching["model"] == "gemini-3.6-flash"
    assert matching["costUsd"] == 0.000125
    assert matching["totalTokens"] == 750
    assert matching["status"] == "SUCCESS"

