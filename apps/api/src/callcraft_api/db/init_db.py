import logging
from datetime import datetime, date, timedelta, timezone
import ulid
from sqlalchemy import select, text
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

        # Execute column migrations safely for Postgres & SQLite
        try:
            await session.execute(text("ALTER TABLE users ADD COLUMN bio TEXT;"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT;"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE users ADD COLUMN github_url VARCHAR(255);"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE users ADD COLUMN website_url VARCHAR(255);"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE users ADD COLUMN company VARCHAR(255);"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE users ADD COLUMN location VARCHAR(255);"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50);"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE app_init ADD COLUMN default_registration_status VARCHAR(50) DEFAULT 'pending_verification';"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE app_init ADD COLUMN require_email_verification BOOLEAN DEFAULT TRUE;"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE templates ADD COLUMN tools_config JSONB DEFAULT '{}'::jsonb;"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE call_specs ADD COLUMN tools_config JSONB DEFAULT '{}'::jsonb;"))
        except Exception:
            pass
        try:
            await session.execute(text("ALTER TABLE call_spec_versions ADD COLUMN tools_config JSONB DEFAULT '{}'::jsonb;"))
        except Exception:
            pass
        await session.commit()

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
        ("usr_demo_engineer_04", "budi.santoso@idcheck.co.id", "idcheck_budi_secret_123", "Budi Santoso", "USER"),
        ("usr_demo_health_05", "m.vance@medtech.org", "medtech_vance_secret_123", "Dr. Michael Vance", "USER"),
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
    service_clients_data = [
        ("01HZX01SVC000000000000001", "svc_nextjs_main", "client_nextjs_dashboard_01", "nextjs_secret_key_prod_01", ["spec.manage", "call.execute", "analytics.read"]),
        ("01HZX01SVC000000000000002", "svc_analytics_worker", "client_analytics_worker_01", "analytics_secret_key_prod_02", ["analytics.read"]),
    ]
    for sid, sname, scid, ssecret, sperms in service_clients_data:
        stmt = select(ServiceClient).where(ServiceClient.name == sname)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                ServiceClient(
                    id=sid,
                    name=sname,
                    client_id=scid,
                    secret_hash=hash_secret_argon2(ssecret),
                    status="active",
                    permissions=sperms,
                )
            )

    # 6. Seed API Credentials
    credentials_data = [
        ("crd_01HZX01KEY00000000001", "usr_default_dev_01", "Default Production Key", "pk_live_default_key_01", "call_sk_live_default_dev_key_01", "production"),
        ("crd_01HZX01KEY00000000002", "usr_default_dev_01", "Development Sandbox Key", "pk_test_sandbox_key_01", "call_sk_test_sandbox_dev_key_01", "sandbox"),
        ("crd_01HZX01KEY00000000003", "usr_demo_developer_02", "Acme Production Gateway Key", "pk_live_acme_key_02", "call_sk_live_acme_gateway_key_02", "production"),
    ]
    for cid, uid, cname, pkey, skey, cenv in credentials_data:
        stmt = select(ApiCredential).where(ApiCredential.public_key == pkey)
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                ApiCredential(
                    id=cid,
                    user_id=uid,
                    name=cname,
                    public_key=pkey,
                    secret_key_hash=hash_secret_argon2(skey),
                    environment=cenv,
                )
            )

    # 7. Seed User AI Provider Encrypted Keys
    user_ai_providers_data = [
        ("uap_01HZX01UAP000000000001", "usr_default_dev_01", "01HZX01PROVIDER00000000001", settings.gemini_api_key or "AIzaSyDummyGeminiKey_12345"),
        ("uap_01HZX01UAP000000000002", "usr_default_dev_01", "01HZX01PROVIDER00000000002", settings.openai_api_key or "sk-proj-DummyOpenAIKey_12345"),
    ]
    for uap_id, uid, pid, raw_key in user_ai_providers_data:
        try:
            enc_key, nonce = encrypt_aes_256_gcm(raw_key, settings.master_encryption_key)
            stmt = select(UserAiProvider).where(UserAiProvider.user_id == uid, UserAiProvider.provider_id == pid)
            res = await session.execute(stmt)
            if not res.scalar_one_or_none():
                session.add(
                    UserAiProvider(
                        id=uap_id,
                        user_id=uid,
                        provider_id=pid,
                        encrypted_api_key=enc_key,
                        key_nonce=nonce,
                        is_active=True,
                    )
                )
        except Exception as e:
            logger.warning(f"Skipped UserAiProvider seed: {e}")

    # 8. Seed System Prompts
    system_prompts_data = [
        ("01HZX01SYSPRM0000000000001", "default_tool_calling_system_prompt", "Default Structured Tool Calling Prompt", "You are a high-precision structured data extraction engine. Extract JSON adhering strictly to the provided tool schema. Output valid JSON only."),
        ("01HZX01SYSPRM0000000000002", "document_ocr_system_prompt", "Document OCR & Legal Extraction Prompt", "Extract clear, verbatim text and structured fields from official identity and legal documents. Do not infer or extrapolate unrepresented information."),
        ("01HZX01SYSPRM0000000000003", "financial_receipt_system_prompt", "Financial Statement & Receipt Prompt", "Analyze financial documents including invoices, receipts, and bank statements. Extract all line items, tax components, currency codes, vendor identity, and grand total."),
    ]
    for sp_id, sp_code, sp_name, sp_content in system_prompts_data:
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

    # 9. Seed Official Master Templates (Professional Schemas & Specs)
    import random
    from callcraft_api.db.models import TemplateComment

    templates_data = [
        {
            "id": "tmpl_id_ktp",
            "user_id": "usr_demo_engineer_04",
            "code": "government-issued-identity-document",
            "name": "Government-Issued Identity & License Document Parser Suite",
            "description": "Suite verifikasi dokumen identitas resmi negara (e-KTP Indonesia NIK 16-digit, SIM / Driver License, dan Paspor Republik Indonesia). Dilengkapi dengan 3 spesialisasi Tool Calling otomatis.",
            "category": "identity",
            "categories": ["identity", "ocr", "kyc", "government"],
            "request_schema": {
                "properties": {
                    "image": {"type": "string", "description": "Base64 or URL of identity document image"},
                    "prompt": {"type": "string", "description": "Optional guidelines"}
                },
                "required": ["image"]
            },
            "response_schema": {
                "properties": {
                    "document_type": {"type": "string", "required": True},
                    "document_number": {"type": "string", "required": True},
                    "full_name": {"type": "string", "required": True},
                    "date_of_birth": {"type": "string", "required": True},
                    "gender": {"type": "string", "required": True},
                    "address": {
                        "type": "object",
                        "required": True,
                        "properties": {
                            "street": {"type": "string", "required": False},
                            "rt_rw": {"type": "string", "required": False},
                            "subdistrict": {"type": "string", "required": False},
                            "district": {"type": "string", "required": False},
                            "city": {"type": "string", "required": True},
                            "province": {"type": "string", "required": True}
                        }
                    },
                    "expiry_date": {"type": "string", "required": False},
                    "nationality": {"type": "string", "required": True}
                }
            },
            "system_prompt": "Analisis dokumen identitas resmi yang diunggah (e-KTP Indonesia, SIM, atau Paspor RI). Tentukan jenis dokumen fisik dan eksekusi Tool Calling yang paling presisi.",
            "tools_config": {
                "enabled": True,
                "toolChoice": "auto",
                "instruction": "Pilih 1 tool_call yang paling sesuai berdasarkan jenis dokumen identitas resmi yang terdeteksi (e-KTP Indonesia vs SIM vs Paspor RI).",
                "tools": [
                    {
                        "name": "extract_indonesian_ktp_identity",
                        "description": "Ekstraksi data terstruktur kartu e-KTP Indonesia (NIK 16-digit, Nama Lengkap, Tempat/Tgl Lahir, Jenis Kelamin, Golongan Darah, Alamat Lengkap, RT/RW, Kel/Desa, Kecamatan, Agama, Status Perkawinan, Pekerjaan, Kewarganegaraan, Masa Berlaku).",
                        "agentRole": "Indonesian Identity & KYC Verification Specialist",
                        "textContext": "Khusus dokumen e-KTP (Kartu Tanda Penduduk) Republik Indonesia.",
                        "includeImageContext": True,
                    },
                    {
                        "name": "extract_driver_license_permit",
                        "description": "Ekstraksi data terstruktur Surat Izin Mengemudi (SIM) / Driver License (Nomor SIM, Golongan SIM A/B1/B2/C/D, Nama Pemilik, Tempat/Tgl Lahir, Tinggi Badan, Pekerjaan, Alamat, Kab/Kota, Masa Berlaku).",
                        "agentRole": "Driver License Inspection Specialist",
                        "textContext": "Khusus dokumen SIM (Surat Izin Mengemudi) Republik Indonesia atau International Driver Permit.",
                        "includeImageContext": True,
                    },
                    {
                        "name": "extract_republic_indonesia_passport",
                        "description": "Ekstraksi lengkap Paspor Republik Indonesia (Jenis Paspor, Kode Negara IDN, Nomor Paspor, Nama Lengkap, Kewarganegaraan, Tanggal Lahir, Jenis Kelamin, Tempat Dikeluarkan, Tanggal Dikeluarkan, Tanggal Habis Berlaku, Nomor Registrasi, Machine Readable Zone / MRZ Line 1 & Line 2).",
                        "agentRole": "Immigration & International Travel Document Inspector",
                        "textContext": "Khusus dokumen Paspor Resmi Republik Indonesia (Elektronik / Non-Elektronik).",
                        "includeImageContext": True,
                    },
                ],
            },
        },
        {
            "id": "tmpl_retail_receipt",
            "user_id": "usr_demo_analyst_03",
            "code": "financial-receipt-invoice-suite",
            "name": "Financial Receipt, B2B Invoice & Bank Statement Suite",
            "description": "Suite otomatisasi akuntansi dan verifikasi bukti transaksi finansial retail (Struk Kasir/Kwitansi), Faktur Pajak/Corporate Tagihan B2B, dan Laporan Rekening Koran Bank.",
            "category": "finance",
            "categories": ["finance", "retail", "accounting", "expenses"],
            "request_schema": {
                "properties": {
                    "image": {"type": "string"},
                    "currency_override": {"type": "string"}
                },
                "required": ["image"]
            },
            "response_schema": {
                "properties": {
                    "transaction_type": {"type": "string", "required": True},
                    "merchant_or_vendor": {
                        "type": "object",
                        "required": True,
                        "properties": {
                            "name": {"type": "string", "required": True},
                            "tax_id_npwp": {"type": "string", "required": False},
                            "address": {"type": "string", "required": False}
                        }
                    },
                    "transaction_details": {
                        "type": "object",
                        "required": True,
                        "properties": {
                            "invoice_or_receipt_number": {"type": "string", "required": True},
                            "date": {"type": "string", "required": True},
                            "currency": {"type": "string", "required": True}
                        }
                    },
                    "line_items": {
                        "type": "array",
                        "required": True,
                        "items": {
                            "type": "object",
                            "properties": {
                                "item_name": {"type": "string", "required": True},
                                "quantity": {"type": "number", "required": True},
                                "unit_price": {"type": "number", "required": True},
                                "total_price": {"type": "number", "required": True}
                            }
                        }
                    },
                    "financial_summary": {
                        "type": "object",
                        "required": True,
                        "properties": {
                            "subtotal": {"type": "number", "required": True},
                            "tax_ppn_amount": {"type": "number", "required": False},
                            "grand_total": {"type": "number", "required": True}
                        }
                    }
                }
            },
            "system_prompt": "Analisis dokumen transaksi keuangan yang diunggah. Pilih 1 tool_call yang paling sesuai berdasarkan jenis dokumen (Struk Kasir Retail vs Corporate Invoice B2B vs Rekening Koran Bank).",
            "tools_config": {
                "enabled": True,
                "toolChoice": "auto",
                "instruction": "Pilih 1 tool_call yang paling sesuai dengan tipe transaksi finansial (Struk Kasir Retail vs Faktur Tagihan Corporate Invoice B2B vs Laporan Mutasi Rekening Koran Bank).",
                "tools": [
                    {
                        "name": "extract_retail_store_receipt",
                        "description": "Ekstraksi struk kasir toko/restoran (Nama Merchant, Tanggal Transaksi, Line Items Rincian Barang, Subtotal, Tax/PPN, Service Charge, Total Bayar, Metode Pembayaran).",
                        "agentRole": "Retail Expense Audit Agent",
                        "textContext": "Untuk struk kasir toko, minimarket, kwitansi, dan resto.",
                        "includeImageContext": True,
                    },
                    {
                        "name": "extract_corporate_tax_invoice",
                        "description": "Ekstraksi faktur pajak dan tagihan B2B corporate (Invoice Number, Vendor Name, Buyer Company, NPWP, Invoice Date, Due Date, Tax Amount, Line Items, Total Amount).",
                        "agentRole": "Corporate Accounts Payable Auditor",
                        "textContext": "Untuk dokumen invoice tagihan B2B dan faktur pajak.",
                        "includeImageContext": True,
                    },
                    {
                        "name": "extract_bank_account_statement",
                        "description": "Ekstraksi Laporan Mutasi Rekening Koran Bank (Nama Bank, Nama Pemilik Rekening, Nomor Rekening / IBAN, Periode Laporan, Saldo Awal, Total Debet, Total Kredit, Saldo Akhir, Rincian Baris Mutasi [Tanggal, Uraian Keterangan Transaksi, Saldo Debet/Kredit, Running Balance]).",
                        "agentRole": "Bank Statement Reconciliation & Financial Audit Specialist",
                        "textContext": "Khusus dokumen rekening koran bank (BCA, Mandiri, BRI, BNI, CIMB, atau Internasional).",
                        "includeImageContext": True,
                    },
                ],
            },
        },
        {
            "id": "tmpl_medical_prescription",
            "user_id": "usr_demo_health_05",
            "code": "medical-prescription-lab-report",
            "name": "Medical Diagnostics, Doctor Prescription & Clinical Lab Suite",
            "description": "Analisis medis terstruktur untuk Resep Obat Dokter, Laporan Laboratorium Medis/Hasil Tes Darah, dan Resume Medis Pasien Rawat Inap.",
            "category": "medical",
            "categories": ["medical", "diagnostics", "healthcare", "pharma"],
            "request_schema": {
                "properties": {
                    "image": {"type": "string"},
                    "patient_id_override": {"type": "string"}
                },
                "required": ["image"]
            },
            "response_schema": {
                "properties": {
                    "medical_document_type": {"type": "string", "required": True},
                    "patient_info": {
                        "type": "object",
                        "required": True,
                        "properties": {
                            "full_name": {"type": "string", "required": True},
                            "medical_record_number": {"type": "string", "required": False}
                        }
                    },
                    "healthcare_facility": {
                        "type": "object",
                        "required": True,
                        "properties": {
                            "facility_name": {"type": "string", "required": True},
                            "practitioner_doctor_name": {"type": "string", "required": True},
                            "date": {"type": "string", "required": True}
                        }
                    },
                    "prescribed_medications": {
                        "type": "array",
                        "required": False,
                        "items": {
                            "type": "object",
                            "properties": {
                                "drug_name": {"type": "string", "required": True},
                                "dosage": {"type": "string", "required": True},
                                "instructions_signa": {"type": "string", "required": True}
                            }
                        }
                    },
                    "lab_test_results": {
                        "type": "array",
                        "required": False,
                        "items": {
                            "type": "object",
                            "properties": {
                                "test_parameter": {"type": "string", "required": True},
                                "result_value": {"type": "string", "required": True},
                                "unit": {"type": "string", "required": False},
                                "reference_range": {"type": "string", "required": False},
                                "flag": {"type": "string", "required": False}
                            }
                        }
                    }
                }
            },
            "system_prompt": "Analisis dokumen medis/kesehatan yang diunggah. Pilih 1 tool_call yang paling sesuai berdasarkan jenis dokumen (Resep Obat Dokter vs Laporan Lab Medis vs Resume Medis Rawat Inap).",
            "tools_config": {
                "enabled": True,
                "toolChoice": "auto",
                "instruction": "Pilih 1 tool_call yang paling sesuai dengan dokumen kesehatan (Resep Dokter vs Laporan Hasil Lab Medis vs Resume Medis Pasien Rawat Inap).",
                "tools": [
                    {
                        "name": "extract_doctor_prescription",
                        "description": "Ekstraksi lembar resep obat dokter (Nama Pasien, Umur, Nama Dokter, Tanggal Resep, Daftar Obat, Dosis & Signa Aturan Pakai).",
                        "agentRole": "Clinical Pharmacology Specialist",
                        "textContext": "Untuk resep obat dari dokter, klinik, dan apotek.",
                        "includeImageContext": True,
                    },
                    {
                        "name": "extract_medical_lab_result",
                        "description": "Ekstraksi laporan lab medis (Nama Pasien, Tanggal Tes, Nama Fasilitas Medis, Parameter Tes Lab, Nilai Hasil, Nilai Rujukan Normal).",
                        "agentRole": "Clinical Diagnostics Inspector",
                        "textContext": "Untuk hasil pemeriksaan laboratorium darah, tes urine, dan diagnostik medis.",
                        "includeImageContext": True,
                    },
                    {
                        "name": "extract_clinical_discharge_resume",
                        "description": "Ekstraksi resume medis / Ringkasan Pasien Pulang (Nama Pasien, Tanggal Masuk RS, Tanggal Keluar RS, Diagnosa Utama ICD-10, Diagnosa Sekunder, Prosedur Medis, Kondisi Pulang).",
                        "agentRole": "Hospital Medical Record Auditor & Clinical Summary Specialist",
                        "textContext": "Khusus lembar resume medis dan ringkasan perawatan rawat inap rumah sakit.",
                        "includeImageContext": True,
                    },
                ],
            },
        },
    ]

    comments_pool = [
        ("Budi Prasetyo (Fintech Architect)", 5, "Model ini sangat presisi mengekstraksi data KTP & SIM Indonesia. Multi-tool calling bekerja secara presisi!"),
        ("Siti Nurhaliza (Lead Developer)", 5, "Sangat mempercepat integrasi API di backend FastAPI kami. Tool calling terstruktur sempurna."),
        ("Rian Hidayat (DevOps Lead)", 5, "Response time sangat cepat menggunakan Gemini Flash. PPN dan subtotal langsung sesuai."),
        ("Dewi Lestari (Product Manager)", 4, "Sangat membantu proses KYC onboarding pengguna baru. Pydantic validator berjalan tanpa error."),
        ("Andi Wijaya (Senior Backend)", 5, "Dokumentasi dan sistem prompt bawaan sangat profesional. Tinggal clone dan langsung pakai."),
        ("Fajri Ramadhan (Fullstack Engineer)", 5, "Ekstraksi itemized line items pada struk kasir berjalan 100% akurat."),
        ("Dr. Michael Vance (Healthtech Advisor)", 5, "Hasil ekstraksi resep medis presisi tinggi, dosis obat terbaca dengan jelas."),
        ("Sarah Chen (Co-Founder)", 4, "Sangat efisien untuk pengolahan dokumen Purchase Order korporasi."),
    ]

    users_for_comments = ["usr_default_dev_01", "usr_demo_developer_02", "usr_demo_analyst_03", "usr_demo_engineer_04", "usr_demo_health_05"]

    for tmpl in templates_data:
        likes_count = random.randint(40, 60)
        fork_count = random.randint(150, 250)

        num_comments = random.randint(2, 5)
        selected_comments = random.sample(comments_pool, min(num_comments, len(comments_pool)))
        ratings_list = [c[1] for c in selected_comments]
        rating_avg = round(sum(ratings_list) / len(ratings_list), 2)
        reviews_count = len(selected_comments)

        stmt = select(Template).where((Template.id == tmpl["id"]) | (Template.code == tmpl["code"]))
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            session.add(
                Template(
                    id=tmpl["id"],
                    user_id=tmpl.get("user_id", "usr_default_dev_01"),
                    code=tmpl["code"],
                    name=tmpl["name"],
                    description=tmpl["description"],
                    category=tmpl["category"],
                    categories=tmpl.get("categories", [tmpl["category"]]),
                    request_schema=tmpl["request_schema"],
                    response_schema=tmpl["response_schema"],
                    system_prompt=tmpl["system_prompt"],
                    tools_config=tmpl.get("tools_config", {}),
                    is_official=True,
                    is_published=True,
                    fork_count=fork_count,
                    likes_count=likes_count,
                    rating_avg=rating_avg,
                    reviews_count=reviews_count,
                )
            )
            await session.flush()

            for idx, (aname, crating, ctext) in enumerate(selected_comments):
                cid = f"cmt_{tmpl['code']}_{idx+1}"
                stmt_c = select(TemplateComment).where(TemplateComment.id == cid)
                res_c = await session.execute(stmt_c)
                if not res_c.scalar_one_or_none():
                    session.add(
                        TemplateComment(
                            id=cid,
                            template_id=tmpl["id"],
                            user_id=random.choice(users_for_comments),
                            author_name=aname,
                            rating=crating,
                            comment=ctext,
                        )
                    )

    await session.flush()

    # 10. Seed Call Specs & Spec Versions
    specs_data = [
        (
            "spc_01HZX01SPEC0000000001",
            "usr_default_dev_01",
            "tmpl_id_ktp",
            "Government Identity Document Verification",
            "ktp-parser",
            "Suite verifikasi KTP, SIM, dan Paspor resmi Republik Indonesia",
            {"properties": {"document_type": {"type": "string", "required": True}, "full_name": {"type": "string", "required": True}}},
            "gemini-3.6-flash",
        ),
        (
            "spc_01HZX01SPEC0000000002",
            "usr_default_dev_01",
            "tmpl_retail_receipt",
            "Financial Receipt & Invoice Suite",
            "receipt-extractor",
            "Multi-currency corporate receipt, invoice & bank statement scanner spec",
            {"properties": {"merchant_name": {"type": "string", "required": True}, "grand_total": {"type": "number", "required": True}}},
            "gemini-3.6-flash",
        ),
        (
            "spc_01HZX01SPEC0000000003",
            "usr_default_dev_01",
            "tmpl_medical_prescription",
            "Medical Prescription Scanner",
            "prescription-parser",
            "Clinical prescription, lab test diagnostic & discharge resume extractor spec",
            {"properties": {"patient_name": {"type": "string", "required": True}, "doctor_name": {"type": "string", "required": True}}},
            "gemini-3.6-flash",
        ),
    ]

    tmpl_map = {t["id"]: t for t in templates_data}

    for sid, suid, stpid, sname, sslug, sdesc, sresp, mident in specs_data:
        stmt = select(CallSpec).where(CallSpec.user_id == suid, CallSpec.slug == sslug)
        res = await session.execute(stmt)
        spec_obj = res.scalar_one_or_none()
        matched_tmpl = tmpl_map.get(stpid, {})
        tools_cfg = matched_tmpl.get("tools_config", {})
        if not spec_obj:
            spec_obj = CallSpec(
                id=sid,
                user_id=suid,
                published_template_id=stpid,
                name=sname,
                slug=sslug,
                description=sdesc,
                active_version_number=1,
                status="active",
                use_external_api_key=True,
                external_model_name=mident,
                tools_config=tools_cfg,
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
                    system_prompt=matched_tmpl.get("system_prompt", "Extract document structured fields accurately."),
                    preferred_model_id=model_map.get(mident),
                    use_external_api_key=True,
                    external_model_name=mident,
                    tools_config=tools_cfg,
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
