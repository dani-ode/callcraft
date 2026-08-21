import logging
from datetime import datetime, date, timedelta, timezone
import ulid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from callcraft_api.config import settings
from callcraft_api.db.models import (
    AiModel,
    AiProvider,
    ApiCredential,
    ApiRequest,
    AppInit,
    Base,
    CallSpec,
    CallSpecVersion,
    Permission,
    Role,
    ServiceClient,
    SystemPrompt,
    Template,
    User,
    UserAiProvider,
    UserUsageDaily,
    role_permissions,
    user_roles,
)
from callcraft_engine.crypto import encrypt_aes_256_gcm, hash_secret_argon2

logger = logging.getLogger("callcraft.db.init")


async def init_db(session: AsyncSession) -> None:
    """Initializes tables and seeds comprehensive realistic metadata in database."""
    conn = await session.connection()
    if conn is not None:
        await conn.run_sync(Base.metadata.create_all)

    # 0. Seed AppInit Settings
    stmt_app = select(AppInit).where(AppInit.id == "app_01HZX01INIT00000000001")
    res_app = await session.execute(stmt_app)
    if not res_app.scalar_one_or_none():
        session.add(
            AppInit(
                id="app_01HZX01INIT00000000001",
                app_name="Callcraft",
                app_icon="Feather",
                tagline="Multimodal AI Execution Gateway",
                description="Convert PDF and image streams into strictly validated JSON payloads using Google Gemini and OpenAI.",
                disable_landing_page=False,
            )
        )

    # 1. Seed AI Providers
    providers_data = [
        ("01HZX01PROVIDER00000000001", "gemini", "Google Gemini AI"),
        ("01HZX01PROVIDER00000000002", "openai", "OpenAI"),
        ("01HZX01PROVIDER00000000003", "anthropic", "Anthropic Claude"),
        ("01HZX01PROVIDER00000000004", "mistral", "Mistral AI"),
        ("01HZX01PROVIDER00000000005", "deepseek", "DeepSeek AI"),
        ("01HZX01PROVIDER00000000006", "ocr-engine", "OCR Precision Engines"),
    ]
    provider_map = {}
    for pid, code, name in providers_data:
        stmt = select(AiProvider).where(AiProvider.code == code)
        res = await session.execute(stmt)
        prov = res.scalar_one_or_none()
        if not prov:
            prov = AiProvider(id=pid, code=code, name=name, is_active=True)
            session.add(prov)
        provider_map[code] = prov.id or pid

    await session.flush()

    # 2. Seed AI Models (Latest 2026 Models: Tool Calling, Vision, OCR)
    models_data = [
        # Google Gemini
        ("01HZX01MODEL00000000000001", "gemini", "Gemini 3.6 Flash", "gemini-3.6-flash", True, True, True, 0.000075, 0.000300, True),
        ("01HZX01MODEL00000000000002", "gemini", "Gemini 3.5 Flash", "gemini-3.5-flash", True, True, True, 0.000060, 0.000240, False),
        ("01HZX01MODEL00000000000003", "gemini", "Gemini 3.5 Flash Lite", "gemini-3.5-flash-lite", False, True, True, 0.000030, 0.000120, False),
        ("01HZX01MODEL00000000000004", "gemini", "Gemini 3.1 Flash Lite", "gemini-3.1-flash-lite", False, True, True, 0.000025, 0.000100, False),
        # OpenAI
        ("01HZX01MODEL00000000000005", "openai", "GPT-5.6 Luna", "gpt-5.6-luna", True, True, True, 0.002500, 0.010000, False),
        ("01HZX01MODEL00000000000006", "openai", "GPT-5.6 Terra", "gpt-5.6-terra", True, True, True, 0.001500, 0.006000, False),
        ("01HZX01MODEL00000000000007", "openai", "GPT-5.6 Sol", "gpt-5.6-sol", True, True, True, 0.000150, 0.000600, False),
        # Anthropic Claude
        ("01HZX01MODEL00000000000008", "anthropic", "Claude Opus 5", "claude-opus-5", True, True, True, 0.005000, 0.025000, False),
        ("01HZX01MODEL00000000000009", "anthropic", "Claude Sonnet 5", "claude-sonnet-5", True, True, True, 0.003000, 0.015000, False),
        ("01HZX01MODEL00000000000010", "anthropic", "Claude Haiku 4.5", "claude-haiku-4.5", True, True, True, 0.000800, 0.004000, False),
        # Mistral AI
        ("01HZX01MODEL00000000000011", "mistral", "Mistral Medium 3.5", "mistral-medium-3.5", True, True, True, 0.000900, 0.002700, False),
        ("01HZX01MODEL00000000000012", "mistral", "Mistral Small 4", "mistral-small-4", True, True, True, 0.000200, 0.000600, False),
        # DeepSeek AI
        ("01HZX01MODEL00000000000013", "deepseek", "DeepSeek V4 Pro", "deepseek-v4-pro", False, True, True, 0.000280, 0.000560, False),
        ("01HZX01MODEL00000000000014", "deepseek", "DeepSeek V4 Flash", "deepseek-v4-flash", False, True, True, 0.000100, 0.000200, False),
        ("01HZX01MODEL00000000000015", "deepseek", "DeepSeek VL2", "deepseek-vl2", True, True, True, 0.000200, 0.000400, False),
        ("01HZX01MODEL00000000000016", "deepseek", "DeepSeek OCR", "deepseek-ocr", True, False, True, 0.000080, 0.000160, False),
        # OCR Engine
        ("01HZX01MODEL00000000000017", "ocr-engine", "OCR 4.1", "ocr-4.1", True, False, True, 0.000050, 0.000100, False),
    ]

    model_map = {}
    for mid, pcode, name, mident, simg, stool, sstruct, cprompt, ccomp, isdef in models_data:
        stmt = select(AiModel).where(AiModel.model_identifier == mident)
        res = await session.execute(stmt)
        mod = res.scalar_one_or_none()
        if not mod:
            mod = AiModel(
                id=mid,
                provider_id=provider_map[pcode],
                name=name,
                model_identifier=mident,
                supports_image=simg,
                supports_tool_calling=stool,
                supports_structured_output=sstruct,
                cost_per_1k_prompt_tokens=cprompt,
                cost_per_1k_completion_tokens=ccomp,
                is_default=isdef,
                is_active=True,
            )
            session.add(mod)
        model_map[mident] = mod.id or mid

    await session.flush()

    # 3. Seed Roles & Permissions
    roles_data = [
        ("01HZX01ROLE000000000000001", "SUPER_ADMIN", "Super administrator with unrestricted platform access"),
        ("01HZX01ROLE000000000000002", "ADMIN", "Platform administrator"),
        ("01HZX01ROLE000000000000003", "SUPPORT", "Support engineer with read-only inspection access"),
        ("01HZX01ROLE000000000000004", "ANALYST", "Data analyst with usage & log metrics read access"),
        ("01HZX01ROLE000000000000005", "USER", "Standard developer user"),
    ]
    role_map = {}
    for rid, rname, rdesc in roles_data:
        stmt = select(Role).where(Role.name == rname)
        res = await session.execute(stmt)
        ro = res.scalar_one_or_none()
        if not ro:
            ro = Role(id=rid, name=rname, description=rdesc)
            session.add(ro)
        role_map[rname] = ro.id or rid

    perms_data = [
        ("01HZX01PERM000000000000001", "call.execute", "Execute Callcraft API specs"),
        ("01HZX01PERM000000000000002", "spec.manage", "Create, update, and delete Callcraft API specs"),
        ("01HZX01PERM000000000000003", "key.manage", "Create and revoke API keys and AI provider keys"),
        ("01HZX01PERM000000000000004", "model.manage", "Administer platform AI models and providers"),
        ("01HZX01PERM000000000000005", "analytics.read", "View platform aggregated usage and request logs"),
        ("01HZX01PERM000000000000006", "user.manage", "Manage user accounts and role assignments"),
    ]
    for pid, pcode, pdesc in perms_data:
        stmt = select(Permission).where(Permission.code == pcode)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(Permission(id=pid, code=pcode, description=pdesc))

    await session.flush()

    # 4. Seed Users & Assign Roles
    users_data = [
        ("usr_default_dev_01", "dev@callcraft.io", "callcraft_admin_secret_123", "Callcraft Admin", "SUPER_ADMIN"),
        ("usr_demo_developer_02", "developer@acme.corp", "acme_developer_secret_123", "Alex Rivera", "USER"),
        ("usr_demo_analyst_03", "analyst@fintech.io", "fintech_analyst_secret_123", "Sarah Chen", "ANALYST"),
    ]
    user_map = {}
    for uid, uemail, upass, uname, urole in users_data:
        stmt = select(User).where(User.email == uemail)
        res = await session.execute(stmt)
        usr = res.scalar_one_or_none()
        if not usr:
            usr = User(
                id=uid,
                email=uemail,
                password_hash=hash_secret_argon2(upass),
                full_name=uname,
                status="active",
                email_verified_at=datetime.now(timezone.utc),
            )
            session.add(usr)
        user_map[uemail] = usr.id or uid

    await session.flush()

    # 5. Seed Service Clients
    svc_data = [
        (
            "01HZX01SVC000000000000001",
            "svc_nextjs_main",
            "client_nextjs_dashboard_01",
            "sec_live_default_nextjs_service_secret_key_12345",
            ["spec.manage", "call.execute", "analytics.read"],
        ),
        (
            "01HZX01SVC000000000000002",
            "svc_analytics_worker",
            "client_analytics_worker_01",
            "sec_live_analytics_worker_secret_key_67890",
            ["analytics.read"],
        ),
    ]
    for sid, sname, scid, ssec, sperms in svc_data:
        stmt = select(ServiceClient).where(ServiceClient.name == sname)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                ServiceClient(
                    id=sid,
                    name=sname,
                    client_id=scid,
                    secret_hash=hash_secret_argon2(ssec),
                    status="active",
                    permissions=sperms,
                )
            )

    # 6. Seed API Credentials
    creds_data = [
        ("crd_01HZX01KEY00000000001", "usr_default_dev_01", "Default Production Key", "pk_live_default_key_01", "call_sk_live_dev_secret_key_12345", "production"),
        ("crd_01HZX01KEY00000000002", "usr_default_dev_01", "Development Sandbox Key", "pk_test_sandbox_key_01", "call_sk_test_sandbox_secret_key_67890", "sandbox"),
        ("crd_01HZX01KEY00000000003", "usr_demo_developer_02", "Acme Production Gateway Key", "pk_live_acme_key_02", "call_sk_live_acme_secret_key_99999", "production"),
    ]
    for cid, cuid, cname, cpub, csec, cenv in creds_data:
        stmt = select(ApiCredential).where(ApiCredential.public_key == cpub)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                ApiCredential(
                    id=cid,
                    user_id=cuid,
                    name=cname,
                    public_key=cpub,
                    secret_key_hash=hash_secret_argon2(csec),
                    environment=cenv,
                )
            )

    # 7. Seed User AI Provider Encrypted Keys
    try:
        enc_key, nonce = encrypt_aes_256_gcm("AIzaSyDummyGeminiKey1234567890", settings.master_encryption_key)
        uap_stmt = select(UserAiProvider).where(
            UserAiProvider.user_id == "usr_default_dev_01",
            UserAiProvider.provider_id == provider_map["gemini"],
        )
        res = await session.execute(uap_stmt)
        if not res.scalar_one_or_none():
            session.add(
                UserAiProvider(
                    id="uap_01HZX01UAP000000000001",
                    user_id="usr_default_dev_01",
                    provider_id=provider_map["gemini"],
                    encrypted_api_key=enc_key,
                    key_nonce=nonce,
                    is_active=True,
                )
            )
    except Exception as e:
        logger.warning(f"Skipped UserAiProvider seed: {e}")

    # 8. Seed System Prompts
    sys_prompts = [
        (
            "01HZX01SYSPRM0000000000001",
            "default_tool_calling_system_prompt",
            "Default Structured Tool Calling Prompt",
            "You are a high-precision structured data extraction engine. Extract JSON adhering strictly to the provided tool schema. Output valid JSON only.",
        ),
        (
            "01HZX01SYSPRM0000000000002",
            "document_ocr_system_prompt",
            "Document OCR & Legal Extraction Prompt",
            "Extract clear, verbatim text and structured fields from official identity and legal documents. Do not infer or extrapolate unrepresented information.",
        ),
        (
            "01HZX01SYSPRM0000000000003",
            "financial_receipt_system_prompt",
            "Financial Statement & Receipt Prompt",
            "Analyze financial documents including invoices, receipts, and bank statements. Extract all line items, tax components, currency codes, vendor identity, and grand total.",
        ),
    ]
    for sp_id, sp_code, sp_name, sp_content in sys_prompts:
        stmt = select(SystemPrompt).where(SystemPrompt.code == sp_code)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                SystemPrompt(
                    id=sp_id,
                    code=sp_code,
                    name=sp_name,
                    content=sp_content,
                    is_active=True,
                )
            )

    # 9. Seed Official Master Templates
    templates_data = [
        {
            "id": "tmpl_01HZX01TMPL0000000001",
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
                    "currency": {"type": "string", "required": True},
                    "tax_amount": {"type": "number", "required": False},
                }
            },
            "system_prompt": "Extract all structured financial invoice metadata accurately from the document image.",
        },
        {
            "id": "tmpl_01HZX01TMPL0000000002",
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
                    "place_of_birth": {"type": "string", "required": False},
                    "date_of_birth": {"type": "date", "required": False},
                    "address": {"type": "string", "required": False},
                }
            },
            "system_prompt": "Extract clear, exact text fields from the Indonesian KTP National Identity card image.",
        },
        {
            "id": "tmpl_01HZX01TMPL0000000003",
            "code": "receipt-parser",
            "name": "Retail Receipt Parser",
            "description": "Extracts merchant name, purchase date, line items, tax, and total paid.",
            "category": "Financial",
            "request_schema": {"properties": {"image": {"type": "string"}}, "required": ["image"]},
            "response_schema": {
                "properties": {
                    "merchant_name": {"type": "string", "required": True},
                    "transaction_date": {"type": "date", "required": True},
                    "total_paid": {"type": "number", "required": True},
                    "payment_method": {"type": "string", "required": False},
                }
            },
            "system_prompt": "Extract retail receipt fields accurately from receipt image.",
        },
        {
            "id": "tmpl_01HZX01TMPL0000000004",
            "code": "passport-parser",
            "name": "International Passport Parser",
            "description": "Extracts passport number, full name, nationality, date of birth, and expiry date.",
            "category": "Document",
            "request_schema": {"properties": {"image": {"type": "string"}}, "required": ["image"]},
            "response_schema": {
                "properties": {
                    "passport_number": {"type": "string", "required": True},
                    "surname": {"type": "string", "required": True},
                    "given_names": {"type": "string", "required": True},
                    "nationality": {"type": "string", "required": True},
                    "expiry_date": {"type": "date", "required": True},
                }
            },
            "system_prompt": "Extract international passport MRZ and identity fields accurately.",
        },
        {
            "id": "tmpl_01HZX01TMPL0000000005",
            "code": "business-card-parser",
            "name": "Business Card Reader",
            "description": "Extracts contact name, title, company, phone, email, and website from business card.",
            "category": "Utility",
            "request_schema": {"properties": {"image": {"type": "string"}}, "required": ["image"]},
            "response_schema": {
                "properties": {
                    "contact_name": {"type": "string", "required": True},
                    "job_title": {"type": "string", "required": False},
                    "company_name": {"type": "string", "required": False},
                    "email": {"type": "string", "required": False},
                    "phone_number": {"type": "string", "required": False},
                }
            },
            "system_prompt": "Extract professional contact details from business card photo.",
        },
        {
            "id": "tmpl_01HZX01TMPL0000000006",
            "code": "lab-report-parser",
            "name": "Medical Lab Test Report Parser",
            "description": "Extracts patient info, lab test parameters, numerical results, and reference ranges.",
            "category": "Healthcare",
            "request_schema": {"properties": {"image": {"type": "string"}}, "required": ["image"]},
            "response_schema": {
                "properties": {
                    "patient_name": {"type": "string", "required": True},
                    "lab_test_date": {"type": "date", "required": True},
                    "test_results": {"type": "array", "required": True},
                }
            },
            "system_prompt": "Extract medical lab diagnostic parameters and numerical test values accurately.",
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
                    is_published=True,
                    fork_count=tmpl.get("fork_count", 142),
                    likes_count=tmpl.get("likes_count", 89),
                    rating_avg=tmpl.get("rating_avg", 4.90),
                    reviews_count=tmpl.get("reviews_count", 12),
                )
            )

    # 9b. Seed Sample Marketplace Comments & Reviews
    from callcraft_api.db.models import TemplateComment
    sample_comments = [
        ("cmt_01", "tmpl_01HZX01TMPL0000000001", "usr_default_dev_01", "Alex Rivera (Lead Engineer)", 5, "Extremely reliable for invoice parsing! Coercion handled tax numbers seamlessly."),
        ("cmt_02", "tmpl_01HZX01TMPL0000000001", "usr_demo_developer_02", "Sarah Chen (Fintech Founder)", 5, "Forked into our accounts payable system. Saved us days of custom schema writing."),
        ("cmt_03", "tmpl_01HZX01TMPL0000000002", "usr_default_dev_01", "Budi Santoso (Indonesian Dev)", 5, "Format NIK 16 digit sangat presisi. Sangat direkomendasikan untuk verifikasi KYC!"),
        ("cmt_04", "tmpl_01HZX01TMPL0000000003", "usr_demo_developer_02", "Marcus Brody (Retail App HQ)", 4, "Great receipt parser! Works nicely with thermal printed receipts."),
    ]
    for cid, tpid, uid, aname, crating, ctext in sample_comments:
        stmt_c = select(TemplateComment).where(TemplateComment.id == cid)
        res_c = await session.execute(stmt_c)
        if not res_c.scalar_one_or_none():
            session.add(
                TemplateComment(
                    id=cid,
                    template_id=tpid,
                    user_id=uid,
                    author_name=aname,
                    rating=crating,
                    comment=ctext,
                )
            )

    # 10. Seed Call Specs & Spec Versions
    specs_data = [
        ("spc_01HZX01SPEC0000000001", "usr_default_dev_01", "Indonesian KTP Parser", "ktp-parser", "High-accuracy Indonesian NIK and ID extraction spec", templates_data[1]["response_schema"], "gemini-3.6-flash"),
        ("spc_01HZX01SPEC0000000002", "usr_default_dev_01", "Invoice Data Extractor", "invoice-extractor", "Multi-currency corporate invoice scanning spec", templates_data[0]["response_schema"], "gemini-3.6-flash"),
        ("spc_01HZX01SPEC0000000003", "usr_default_dev_01", "Retail Receipt Parser", "receipt-parser", "POS retail receipt and itemized expense extraction spec", templates_data[2]["response_schema"], "gemini-3.6-flash"),
        ("spc_01HZX01SPEC0000000004", "usr_default_dev_01", "International Passport Extractor", "passport-extractor", "Global passport MRZ and identity document spec", templates_data[3]["response_schema"], "gemini-3.6-flash"),
        ("spc_01HZX01SPEC0000000005", "usr_demo_developer_02", "Acme Automated Invoice Scanner", "acme-invoice-scanner", "Acme Corp automated accounts payable invoice spec", templates_data[0]["response_schema"], "gpt-5.6-luna"),
        ("spc_01HZX01SPEC0000000006", "usr_demo_developer_02", "Acme Business Card Reader", "acme-card-scanner", "Acme Corp sales lead contact scanner spec", templates_data[4]["response_schema"], "deepseek-vl2"),
    ]

    for sid, suid, sname, sslug, sdesc, sresp, mident in specs_data:
        stmt = select(CallSpec).where(CallSpec.user_id == suid, CallSpec.slug == sslug)
        res = await session.execute(stmt)
        spec_obj = res.scalar_one_or_none()
        if not spec_obj:
            spec_obj = CallSpec(
                id=sid,
                user_id=suid,
                name=sname,
                slug=sslug,
                description=sdesc,
                active_version_number=1,
                status="active",
            )
            session.add(spec_obj)
            await session.flush()

            session.add(
                CallSpecVersion(
                    id=f"ver_{sid[4:]}",
                    call_spec_id=spec_obj.id,
                    version_number=1,
                    request_schema={"properties": {"image": {"type": "string"}}},
                    response_schema=sresp,
                    system_prompt="Extract document structured fields accurately.",
                    preferred_model_id=model_map.get(mident),
                )
            )

    # 11. Seed API Request Audit Logs
    now = datetime.now(timezone.utc)
    logs_data = [
        ("req_01HZX01REQ000000000001", "req_live_01HZX01AAA99", "usr_default_dev_01", "spc_01HZX01SPEC0000000001", "ver_01HZX01SPEC0000000001", "crd_01HZX01KEY00000000001", "gemini", "gemini-3.6-flash", "SUCCESS", 200, "url", 154200, 420, 680, 140, 820, 0.000093, "198.51.100.42", "python-requests/2.31.0", now - timedelta(minutes=10)),
        ("req_01HZX01REQ000000000002", "req_live_01HZX01BBB88", "usr_default_dev_01", "spc_01HZX01SPEC0000000002", "ver_01HZX01SPEC0000000002", "crd_01HZX01KEY00000000001", "gemini", "gemini-3.6-flash", "SUCCESS", 200, "base64", 285400, 850, 1250, 310, 1560, 0.000186, "198.51.100.42", "Node/v20.11.0", now - timedelta(minutes=45)),
        ("req_01HZX01REQ000000000003", "req_live_01HZX01CCC77", "usr_default_dev_01", "spc_01HZX01SPEC0000000003", "ver_01HZX01SPEC0000000003", "crd_01HZX01KEY00000000001", "openai", "gpt-5.6-luna", "SUCCESS", 200, "url", 98400, 640, 890, 180, 1070, 0.004025, "203.0.113.15", "curl/7.88.1", now - timedelta(hours=2)),
        ("req_01HZX01REQ000000000004", "req_live_01HZX01DDD66", "usr_default_dev_01", "spc_01HZX01SPEC0000000001", "ver_01HZX01SPEC0000000001", "crd_01HZX01KEY00000000001", "gemini", "gemini-3.6-flash", "VALIDATION_ERROR", 422, "base64", 12000, 45, 0, 0, 0, 0.000000, "198.51.100.42", "python-requests/2.31.0", now - timedelta(hours=5)),
        ("req_01HZX01REQ000000000005", "req_live_01HZX01EEE55", "usr_default_dev_01", "spc_01HZX01SPEC0000000004", "ver_01HZX01SPEC0000000004", "crd_01HZX01KEY00000000001", "anthropic", "claude-sonnet-5", "SUCCESS", 200, "url", 310500, 1120, 1420, 260, 1680, 0.008160, "172.56.21.9", "Go-http-client/1.1", now - timedelta(hours=12)),
    ]

    for log_id, req_id, log_uid, spec_id, ver_id, cred_id, pcode, mident, st, hst, itype, isize, ptime, ptok, ctok, ttok, cost, ip, ua, log_created in logs_data:
        stmt = select(ApiRequest).where(ApiRequest.request_id == req_id)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                ApiRequest(
                    id=log_id,
                    request_id=req_id,
                    user_id=log_uid,
                    call_spec_id=spec_id,
                    call_spec_version_id=ver_id,
                    credential_id=cred_id,
                    provider_id=provider_map.get(pcode),
                    model_id=model_map.get(mident),
                    status=st,
                    http_status=hst,
                    input_type=itype,
                    input_size_bytes=isize,
                    processing_time_ms=ptime,
                    prompt_tokens=ptok,
                    completion_tokens=ctok,
                    total_tokens=ttok,
                    estimated_cost_usd=cost,
                    client_ip=ip,
                    user_agent=ua,
                    created_at=log_created,
                )
            )

    # 12. Seed User Daily Usage Aggregates
    today = date.today()
    usage_records = [
        ("usr_default_dev_01", 6, 120, 115, 5, 142000, 0.042500),
        ("usr_default_dev_01", 5, 145, 142, 3, 185000, 0.058200),
        ("usr_default_dev_01", 4, 98, 95, 3, 118000, 0.035100),
        ("usr_default_dev_01", 3, 210, 204, 6, 276000, 0.089400),
        ("usr_default_dev_01", 2, 180, 175, 5, 230000, 0.071200),
        ("usr_default_dev_01", 1, 260, 255, 5, 340000, 0.114500),
        ("usr_default_dev_01", 0, 84, 82, 2, 105000, 0.032800),

        ("usr_demo_developer_02", 6, 45, 43, 2, 58000, 0.018500),
        ("usr_demo_developer_02", 5, 62, 60, 2, 82000, 0.026400),
        ("usr_demo_developer_02", 4, 88, 85, 3, 112000, 0.035800),
        ("usr_demo_developer_02", 3, 105, 102, 3, 134000, 0.043100),
        ("usr_demo_developer_02", 2, 130, 128, 2, 168000, 0.054200),
        ("usr_demo_developer_02", 1, 175, 170, 5, 225000, 0.072600),
        ("usr_demo_developer_02", 0, 52, 50, 2, 64000, 0.020500),
    ]

    for u_uid, days_ago, req_tot, req_succ, req_fail, tok_tot, cost_tot in usage_records:
        u_date = today - timedelta(days=days_ago)
        stmt = select(UserUsageDaily).where(UserUsageDaily.user_id == u_uid, UserUsageDaily.usage_date == u_date)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                UserUsageDaily(
                    id=f"usg_{days_ago}_{str(ulid.new())[:20]}",
                    user_id=u_uid,
                    usage_date=u_date,
                    total_requests=req_tot,
                    successful_requests=req_succ,
                    failed_requests=req_fail,
                    total_tokens=tok_tot,
                    total_cost_usd=cost_tot,
                )
            )

    try:
        await session.commit()
    except Exception as e:
        await session.rollback()
        logger.warning(f"Database seeding commit skipped: {e}")
