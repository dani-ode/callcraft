import logging
from datetime import datetime, timezone
import ulid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.db.models import (
    AiModel,
    AiProvider,
    ApiCredential,
    Base,
    CallSpec,
    CallSpecVersion,
    Permission,
    Role,
    Template,
    User,
)
from callcraft_engine.crypto import hash_secret_argon2

logger = logging.getLogger("callcraft.db.init")


async def init_db(session: AsyncSession) -> None:
    """Initializes tables and seeds initial metadata in database."""
    conn = await session.connection()
    if conn is not None:
        await conn.run_sync(Base.metadata.create_all)

    # 1. Seed AI Providers
    provider_data = [
        ("01HZX01PROVIDER00000000001", "gemini", "Google Gemini AI"),
        ("01HZX01PROVIDER00000000002", "openai", "OpenAI"),
        ("01HZX01PROVIDER00000000003", "anthropic", "Anthropic Claude"),
        ("01HZX01PROVIDER00000000004", "deepseek", "DeepSeek AI"),
    ]
    for pid, code, name in provider_data:
        stmt = select(AiProvider).where(AiProvider.code == code)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(AiProvider(id=pid, code=code, name=name, is_active=True))

    await session.flush()

    # 2. Seed Default Admin User
    stmt = select(User).where(User.email == "dev@callcraft.io")
    res = await session.execute(stmt)
    dev_user = res.scalar_one_or_none()
    if not dev_user:
        dev_user = User(
            id="usr_default_dev_01",
            email="dev@callcraft.io",
            password_hash=hash_secret_argon2("callcraft_admin_secret_123"),
            full_name="Callcraft Admin",
            status="active",
        )
        session.add(dev_user)
        await session.flush()

    # 3. Seed Default API Credential
    stmt = select(ApiCredential).where(ApiCredential.public_key == "pk_live_default_key_01")
    res = await session.execute(stmt)
    if not res.scalar_one_or_none():
        session.add(
            ApiCredential(
                id="crd_01HZX01KEY00000000001",
                user_id=dev_user.id,
                name="Default Production Key",
                public_key="pk_live_default_key_01",
                secret_key_hash=hash_secret_argon2("call_sk_live_dev_secret_key_12345"),
                environment="production",
            )
        )

    # 4. Seed Official Master Templates
    templates_data = [
        {
            "id": "tmpl_01HZX01TMPL00000000001",
            "code": "invoice-parser",
            "name": "Invoice Data Extractor",
            "description": "Extracts invoice metadata including invoice number, vendor, line items, and total amount.",
            "category": "Financial",
            "request_schema": {"properties": {"image": {"type": "string"}}, "required": ["image"]},
            "response_schema": {
                "properties": {
                    "invoice_number": {"type": "string", "required": True},
                    "vendor_name": {"type": "string", "required": True},
                    "invoice_date": {"type": "date", "required": True},
                    "total_amount": {"type": "number", "required": True},
                }
            },
            "system_prompt": "Extract all structured financial invoice metadata accurately.",
        },
        {
            "id": "tmpl_01HZX01TMPL00000000002",
            "code": "ktp-id-parser",
            "name": "Indonesian KTP / National ID Parser",
            "description": "Extracts NIK, Full Name, Gender, DOB, and Address details from KTP document.",
            "category": "Document",
            "request_schema": {"properties": {"image": {"type": "string"}}, "required": ["image"]},
            "response_schema": {
                "properties": {
                    "nik": {"type": "string", "required": True},
                    "full_name": {"type": "string", "required": True},
                    "gender": {"type": "enum", "enum_values": ["LAKI-LAKI", "PEREMPUAN"], "required": True},
                }
            },
            "system_prompt": "Extract Indonesian KTP National Identity fields accurately.",
        },
        {
            "id": "tmpl_01HZX01TMPL00000000003",
            "code": "receipt-parser",
            "name": "Retail Receipt Parser",
            "description": "Extracts merchant name, transaction date, line items, tax, and total paid.",
            "category": "Financial",
            "request_schema": {"properties": {"image": {"type": "string"}}, "required": ["image"]},
            "response_schema": {
                "properties": {
                    "merchant_name": {"type": "string", "required": True},
                    "transaction_date": {"type": "date", "required": True},
                    "total_paid": {"type": "number", "required": True},
                }
            },
            "system_prompt": "Extract retail receipt fields accurately.",
        },
    ]

    for tmpl in templates_data:
        stmt = select(Template).where(Template.code == tmpl["code"])
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                Template(
                    id=tmpl["id"],
                    code=tmpl["code"],
                    name=tmpl["name"],
                    description=tmpl["description"],
                    category=tmpl["category"],
                    request_schema=tmpl["request_schema"],
                    response_schema=tmpl["response_schema"],
                    system_prompt=tmpl["system_prompt"],
                    is_official=True,
                )
            )

    # 5. Seed Initial Call Specs
    specs_data = [
        ("spc_01HZX01SPEC0000000001", "Indonesian KTP Parser", "ktp-parser", templates_data[1]["response_schema"]),
        ("spc_01HZX01SPEC0000000002", "Invoice Data Extractor", "invoice-extractor", templates_data[0]["response_schema"]),
        ("spc_01HZX01SPEC0000000003", "Retail Receipt Parser", "receipt-parser", templates_data[2]["response_schema"]),
    ]

    for sid, sname, sslug, sresp in specs_data:
        stmt = select(CallSpec).where(CallSpec.user_id == dev_user.id, CallSpec.slug == sslug)
        res = await session.execute(stmt)
        spec_obj = res.scalar_one_or_none()
        if not spec_obj:
            spec_obj = CallSpec(
                id=sid,
                user_id=dev_user.id,
                name=sname,
                slug=sslug,
                active_version_number=1,
                status="active",
            )
            session.add(spec_obj)
            await session.flush()

            session.add(
                CallSpecVersion(
                    id=f"ver_{sid}",
                    call_spec_id=spec_obj.id,
                    version_number=1,
                    request_schema={"properties": {"image": {"type": "string"}}},
                    response_schema=sresp,
                    system_prompt="Extract document structured fields accurately.",
                )
            )

    await session.commit()
