import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from callcraft_api.db.models import Base, User, ApiCredential, CallSpec, CallSpecVersion, Template
from callcraft_api.db.init_db import init_db
from callcraft_api.db.repository import Repository


@pytest.fixture
async def test_session():
    # Use SQLite in-memory for fast, isolated database testing
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        await init_db(session)
        yield session


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
        system_prompt="Custom prompt instructions",
    )

    assert created["slug"] == "custom-receipt"
    assert created["status"] == "active"

    # Fetch spec by slug
    fetched = await Repository.get_call_spec(test_session, "usr_default_dev_01", "custom-receipt")
    assert fetched is not None
    assert fetched["name"] == "Custom Receipt Spec"
    assert fetched["responseSchema"] == schema
    assert fetched["systemPrompt"] == "Custom prompt instructions"
