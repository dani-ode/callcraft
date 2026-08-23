-- =============================================================================
-- SEED DATA FOR CALLCRAFT PLATFORM (COMPLETE REALISTIC MULTIMODAL DATASET)
-- =============================================================================

-- 1. SEED AI PROVIDERS
INSERT INTO ai_providers (id, code, name, is_active) VALUES
('01HZX01PROVIDER00000000001', 'gemini', 'Google Gemini AI', true),
('01HZX01PROVIDER00000000002', 'openai', 'OpenAI', true),
('01HZX01PROVIDER00000000003', 'anthropic', 'Anthropic Claude', true),
('01HZX01PROVIDER00000000004', 'mistral', 'Mistral AI', true),
('01HZX01PROVIDER00000000005', 'deepseek', 'DeepSeek AI', true),
('01HZX01PROVIDER00000000006', 'ocr-engine', 'OCR Precision Engines', true)
ON CONFLICT (code) DO NOTHING;

-- 2. SEED AI MODELS (LATEST 2026 RELEASES: TOOL CALLING, VISION, OCR)
INSERT INTO ai_models (id, provider_id, name, model_identifier, supports_image, supports_tool_calling, supports_structured_output, cost_per_1k_prompt_tokens, cost_per_1k_completion_tokens, is_default, is_active) VALUES
-- Google Gemini
('01HZX01MODEL00000000000001', '01HZX01PROVIDER00000000001', 'Gemini 3.6 Flash', 'gemini-3.6-flash', true, true, true, 0.000075, 0.000300, true, true),
('01HZX01MODEL00000000000002', '01HZX01PROVIDER00000000001', 'Gemini 3.5 Flash', 'gemini-3.5-flash', true, true, true, 0.000060, 0.000240, false, true),
('01HZX01MODEL00000000000003', '01HZX01PROVIDER00000000001', 'Gemini 3.5 Flash Lite', 'gemini-3.5-flash-lite', false, true, true, 0.000030, 0.000120, false, true),
('01HZX01MODEL00000000000004', '01HZX01PROVIDER00000000001', 'Gemini 3.1 Flash Lite', 'gemini-3.1-flash-lite', false, true, true, 0.000025, 0.000100, false, true),

-- OpenAI
('01HZX01MODEL00000000000005', '01HZX01PROVIDER00000000002', 'GPT-5.6 Luna', 'gpt-5.6-luna', true, true, true, 0.002500, 0.010000, false, true),
('01HZX01MODEL00000000000006', '01HZX01PROVIDER00000000002', 'GPT-5.6 Terra', 'gpt-5.6-terra', true, true, true, 0.001500, 0.006000, false, true),
('01HZX01MODEL00000000000007', '01HZX01PROVIDER00000000002', 'GPT-5.6 Sol', 'gpt-5.6-sol', true, true, true, 0.000150, 0.000600, false, true),

-- Anthropic Claude
('01HZX01MODEL00000000000008', '01HZX01PROVIDER00000000003', 'Claude Opus 5', 'claude-opus-5', true, true, true, 0.005000, 0.025000, false, true),
('01HZX01MODEL00000000000009', '01HZX01PROVIDER00000000003', 'Claude Sonnet 5', 'claude-sonnet-5', true, true, true, 0.003000, 0.015000, false, true),
('01HZX01MODEL00000000000010', '01HZX01PROVIDER00000000003', 'Claude Haiku 4.5', 'claude-haiku-4.5', true, true, true, 0.000800, 0.004000, false, true),

-- Mistral AI
('01HZX01MODEL00000000000011', '01HZX01PROVIDER00000000004', 'Mistral Medium 3.5', 'mistral-medium-3.5', true, true, true, 0.000900, 0.002700, false, true),
('01HZX01MODEL00000000000012', '01HZX01PROVIDER00000000004', 'Mistral Small 4', 'mistral-small-4', true, true, true, 0.000200, 0.000600, false, true),

-- DeepSeek AI
('01HZX01MODEL00000000000013', '01HZX01PROVIDER00000000005', 'DeepSeek V4 Pro', 'deepseek-v4-pro', false, true, true, 0.000280, 0.000560, false, true),
('01HZX01MODEL00000000000014', '01HZX01PROVIDER00000000005', 'DeepSeek V4 Flash', 'deepseek-v4-flash', false, true, true, 0.000100, 0.000200, false, true),
('01HZX01MODEL00000000000015', '01HZX01PROVIDER00000000005', 'DeepSeek VL2', 'deepseek-vl2', true, true, true, 0.000200, 0.000400, false, true),
('01HZX01MODEL00000000000016', '01HZX01PROVIDER00000000005', 'DeepSeek OCR', 'deepseek-ocr', true, false, true, 0.000080, 0.000160, false, true),

-- OCR Engines
('01HZX01MODEL00000000000017', '01HZX01PROVIDER00000000006', 'OCR 4.1', 'ocr-4.1', true, false, true, 0.000050, 0.000100, false, true)
ON CONFLICT DO NOTHING;

-- 3. SEED ROLES & PERMISSIONS
INSERT INTO roles (id, name, description) VALUES
('01HZX01ROLE000000000000001', 'SUPER_ADMIN', 'Super administrator with unrestricted platform access'),
('01HZX01ROLE000000000000002', 'ADMIN', 'Platform administrator'),
('01HZX01ROLE000000000000003', 'SUPPORT', 'Support engineer with read-only inspection access'),
('01HZX01ROLE000000000000004', 'ANALYST', 'Data analyst with usage & log metrics read access'),
('01HZX01ROLE000000000000005', 'USER', 'Standard developer user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (id, code, description) VALUES
('01HZX01PERM000000000000001', 'call.execute', 'Execute Callcraft API specs'),
('01HZX01PERM000000000000002', 'spec.manage', 'Create, update, and delete Callcraft API specs'),
('01HZX01PERM000000000000003', 'key.manage', 'Create and revoke API keys and AI provider keys'),
('01HZX01PERM000000000000004', 'model.manage', 'Administer platform AI models and providers'),
('01HZX01PERM000000000000005', 'analytics.read', 'View platform aggregated usage and request logs'),
('01HZX01PERM000000000000006', 'user.manage', 'Manage user accounts and role assignments')
ON CONFLICT (code) DO NOTHING;

-- Map Role Permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
-- SUPER_ADMIN (All permissions)
('01HZX01ROLE000000000000001', '01HZX01PERM000000000000001'),
('01HZX01ROLE000000000000001', '01HZX01PERM000000000000002'),
('01HZX01ROLE000000000000001', '01HZX01PERM000000000000003'),
('01HZX01ROLE000000000000001', '01HZX01PERM000000000000004'),
('01HZX01ROLE000000000000001', '01HZX01PERM000000000000005'),
('01HZX01ROLE000000000000001', '01HZX01PERM000000000000006'),
-- ADMIN
('01HZX01ROLE000000000000002', '01HZX01PERM000000000000001'),
('01HZX01ROLE000000000000002', '01HZX01PERM000000000000002'),
('01HZX01ROLE000000000000002', '01HZX01PERM000000000000003'),
('01HZX01ROLE000000000000002', '01HZX01PERM000000000000004'),
('01HZX01ROLE000000000000002', '01HZX01PERM000000000000005'),
-- USER
('01HZX01ROLE000000000000005', '01HZX01PERM000000000000001'),
('01HZX01ROLE000000000000005', '01HZX01PERM000000000000002'),
('01HZX01ROLE000000000000005', '01HZX01PERM000000000000003')
ON CONFLICT DO NOTHING;

-- 4. SEED USERS
INSERT INTO users (id, email, password_hash, full_name, status, email_verified_at) VALUES
('usr_default_dev_01', 'dev@callcraft.io', '$argon2id$v=19$m=65536,t=3,p=4$koJPkmQFPcTZ/P3UQIUj5Q$xCnPP62OVevT5gna/XGPsUZbkjgzAbKTW/yD3fhkrmc', 'Callcraft Admin', 'active', CURRENT_TIMESTAMP),
('usr_demo_developer_02', 'developer@acme.corp', '$argon2id$v=19$m=65536,t=3,p=4$koJPkmQFPcTZ/P3UQIUj5Q$xCnPP62OVevT5gna/XGPsUZbkjgzAbKTW/yD3fhkrmc', 'Alex Rivera', 'active', CURRENT_TIMESTAMP),
('usr_demo_analyst_03', 'analyst@fintech.io', '$argon2id$v=19$m=65536,t=3,p=4$koJPkmQFPcTZ/P3UQIUj5Q$xCnPP62OVevT5gna/XGPsUZbkjgzAbKTW/yD3fhkrmc', 'Sarah Chen', 'active', CURRENT_TIMESTAMP),
('usr_demo_engineer_04', 'budi.santoso@idcheck.co.id', '$argon2id$v=19$m=65536,t=3,p=4$koJPkmQFPcTZ/P3UQIUj5Q$xCnPP62OVevT5gna/XGPsUZbkjgzAbKTW/yD3fhkrmc', 'Budi Santoso', 'active', CURRENT_TIMESTAMP),
('usr_demo_health_05', 'm.vance@medtech.org', '$argon2id$v=19$m=65536,t=3,p=4$koJPkmQFPcTZ/P3UQIUj5Q$xCnPP62OVevT5gna/XGPsUZbkjgzAbKTW/yD3fhkrmc', 'Dr. Michael Vance', 'active', CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Map User Roles
INSERT INTO user_roles (user_id, role_id) VALUES
('usr_default_dev_01', '01HZX01ROLE000000000000001'),
('usr_demo_developer_02', '01HZX01ROLE000000000000005'),
('usr_demo_analyst_03', '01HZX01ROLE000000000000004'),
('usr_demo_engineer_04', '01HZX01ROLE000000000000005'),
('usr_demo_health_05', '01HZX01ROLE000000000000005')
ON CONFLICT DO NOTHING;

-- 5. SEED SERVICE CLIENTS
INSERT INTO service_clients (id, name, client_id, secret_hash, status, permissions) VALUES
('01HZX01SVC000000000000001', 'svc_nextjs_main', 'client_nextjs_dashboard_01', '$argon2id$v=19$m=65536,t=3,p=4$gBfzPPlzukMMux6Jeplb2A$9Lps4oqHwAPvPovugfMmPt69i7UEiqwaGw6rrGHr554', 'active', '["spec.manage", "call.execute", "analytics.read"]'::jsonb),
('01HZX01SVC000000000000002', 'svc_analytics_worker', 'client_analytics_worker_01', '$argon2id$v=19$m=65536,t=3,p=4$gBfzPPlzukMMux6Jeplb2A$9Lps4oqHwAPvPovugfMmPt69i7UEiqwaGw6rrGHr554', 'active', '["analytics.read"]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- 6. SEED API CREDENTIALS
INSERT INTO api_credentials (id, user_id, name, public_key, secret_key_hash, environment) VALUES
('crd_01HZX01KEY00000000001', 'usr_default_dev_01', 'Default Production Key', 'pk_live_default_key_01', '$argon2id$v=19$m=65536,t=3,p=4$gBfzPPlzukMMux6Jeplb2A$9Lps4oqHwAPvPovugfMmPt69i7UEiqwaGw6rrGHr554', 'production'),
('crd_01HZX01KEY00000000002', 'usr_default_dev_01', 'Development Sandbox Key', 'pk_test_sandbox_key_01', '$argon2id$v=19$m=65536,t=3,p=4$+6XwYgMRHtHsTNOql4MNIw$iyioWCvkAGfQCV+eWe3QKZyU2srfiBElA+QLkENuTmI', 'sandbox'),
('crd_01HZX01KEY00000000003', 'usr_demo_developer_02', 'Acme Production Gateway Key', 'pk_live_acme_key_02', '$argon2id$v=19$m=65536,t=3,p=4$y1NghfbjaIt6ph8q0BVvGA$7R6G3PE2utMxPxCnf0ItCTzEAao1p7Em7Vo0ELIk0FU', 'production')
ON CONFLICT (public_key) DO NOTHING;

-- 7. SEED USER AI PROVIDERS (ENCRYPTED KEYS)
INSERT INTO user_ai_providers (id, user_id, provider_id, encrypted_api_key, key_nonce, is_active) VALUES
('uap_01HZX01UAP000000000001', 'usr_default_dev_01', '01HZX01PROVIDER00000000001', '1a333d00482090e1940d4c8baf1161b0d540455cc4b2ea7e0b0a4378ae6c014b8710a6ca6b24eb007c4dc703b780', 'b6ce5db49831083cfef26d9b', true),
('uap_01HZX01UAP000000000002', 'usr_default_dev_01', '01HZX01PROVIDER00000000002', '1a333d00482090e1940d4c8baf1161b0d540455cc4b2ea7e0b0a4378ae6c014b8710a6ca6b24eb007c4dc703b780', 'b6ce5db49831083cfef26d9b', true)
ON CONFLICT (user_id, provider_id) DO NOTHING;

-- 8. SEED SYSTEM PROMPTS
INSERT INTO system_prompts (id, code, name, content, is_active) VALUES
('01HZX01SYSPRM0000000000001', 'default_tool_calling_system_prompt', 'Default Structured Tool Calling Prompt', 'You are a high-precision structured data extraction engine. Extract JSON adhering strictly to the provided tool schema. Output valid JSON only.', true),
('01HZX01SYSPRM0000000000002', 'document_ocr_system_prompt', 'Document OCR & Legal Extraction Prompt', 'Extract clear, verbatim text and structured fields from official identity and legal documents. Do not infer or extrapolate unrepresented information.', true),
('01HZX01SYSPRM0000000000003', 'financial_receipt_system_prompt', 'Financial Statement & Receipt Prompt', 'Analyze financial documents including invoices, receipts, and bank statements. Extract all line items, tax components, currency codes, vendor identity, and grand total.', true)
ON CONFLICT (code) DO NOTHING;

-- 9. SEED OFFICIAL MASTER TEMPLATES (WITH MANDATORY PUBLISHER & RICH MULTI-TOOL CALLING SUITES)
INSERT INTO templates (id, user_id, code, name, description, category, categories, request_schema, response_schema, system_prompt, tools_config, is_official) VALUES
('tmpl_01HZX01TMPL0000000001', 'usr_demo_engineer_04', 'government-issued-identity-document', 'Government-Issued Identity & License Document Parser Suite', 'Suite verifikasi dokumen identitas resmi negara (e-KTP Indonesia NIK 16-digit, SIM / Driver License, dan Paspor Republik Indonesia). Dilengkapi dengan 3 spesialisasi Tool Calling otomatis.', 'identity', '["identity", "ocr", "kyc", "government"]'::jsonb, 
'{"properties": {"image": {"type": "string", "description": "Base64 or URL of identity document image"}, "prompt": {"type": "string", "description": "Optional guidelines"}}, "required": ["image"]}'::jsonb,
'{"properties": {"document_type": {"type": "string", "required": true}, "document_number": {"type": "string", "required": true}, "full_name": {"type": "string", "required": true}, "date_of_birth": {"type": "string", "required": true}, "gender": {"type": "string", "required": true}, "address": {"type": "object", "required": true, "properties": {"street": {"type": "string", "required": false}, "rt_rw": {"type": "string", "required": false}, "subdistrict": {"type": "string", "required": false}, "district": {"type": "string", "required": false}, "city": {"type": "string", "required": true}, "province": {"type": "string", "required": true}}}, "expiry_date": {"type": "string", "required": false}, "nationality": {"type": "string", "required": true}}}'::jsonb,
'Analisis dokumen identitas resmi yang diunggah (e-KTP Indonesia, SIM, atau Paspor RI). Tentukan jenis dokumen fisik dan eksekusi Tool Calling yang paling presisi.',
'{"enabled": true, "toolChoice": "auto", "instruction": "Pilih 1 tool_call yang paling sesuai berdasarkan jenis dokumen identitas resmi yang terdeteksi (e-KTP Indonesia vs SIM vs Paspor RI).", "tools": [{"name": "extract_indonesian_ktp_identity", "description": "Ekstraksi data terstruktur kartu e-KTP Indonesia (NIK 16-digit, Nama Lengkap, Tempat/Tgl Lahir, Jenis Kelamin, Golongan Darah, Alamat Lengkap, RT/RW, Kel/Desa, Kecamatan, Agama, Status Perkawinan, Pekerjaan, Kewarganegaraan, Masa Berlaku).", "agentRole": "Indonesian Identity & KYC Verification Specialist", "textContext": "Khusus dokumen e-KTP (Kartu Tanda Penduduk) Republik Indonesia.", "includeImageContext": true}, {"name": "extract_driver_license_permit", "description": "Ekstraksi data terstruktur Surat Izin Mengemudi (SIM) / Driver License (Nomor SIM, Golongan SIM A/B1/B2/C/D, Nama Pemilik, Tempat/Tgl Lahir, Tinggi Badan, Pekerjaan, Alamat, Kab/Kota, Masa Berlaku).", "agentRole": "Driver License Inspection Specialist", "textContext": "Khusus dokumen SIM (Surat Izin Mengemudi) Republik Indonesia atau International Driver Permit.", "includeImageContext": true}, {"name": "extract_republic_indonesia_passport", "description": "Ekstraksi lengkap Paspor Republik Indonesia (Jenis Paspor, Kode Negara IDN, Nomor Paspor, Nama Lengkap, Kewarganegaraan, Tanggal Lahir, Jenis Kelamin, Tempat Dikeluarkan, Tanggal Dikeluarkan, Tanggal Habis Berlaku, Nomor Registrasi, Machine Readable Zone / MRZ Line 1 & Line 2).", "agentRole": "Immigration & International Travel Document Inspector", "textContext": "Khusus dokumen Paspor Resmi Republik Indonesia (Elektronik / Non-Elektronik).", "includeImageContext": true}]}'::jsonb, true),

('tmpl_01HZX01TMPL0000000002', 'usr_demo_analyst_03', 'financial-receipt-invoice-suite', 'Financial Receipt, B2B Invoice & Bank Statement Suite', 'Suite otomatisasi akuntansi dan verifikasi bukti transaksi finansial retail (Struk Kasir/Kwitansi), Faktur Pajak/Corporate Tagihan B2B, dan Laporan Rekening Koran Bank.', 'finance', '["finance", "retail", "accounting", "expenses"]'::jsonb,
'{"properties": {"image": {"type": "string"}, "currency_override": {"type": "string"}}, "required": ["image"]}'::jsonb,
'{"properties": {"transaction_type": {"type": "string", "required": true}, "merchant_or_vendor": {"type": "object", "required": true, "properties": {"name": {"type": "string", "required": true}, "tax_id_npwp": {"type": "string", "required": false}, "address": {"type": "string", "required": false}}}, "transaction_details": {"type": "object", "required": true, "properties": {"invoice_or_receipt_number": {"type": "string", "required": true}, "date": {"type": "string", "required": true}, "currency": {"type": "string", "required": true}}}, "line_items": {"type": "array", "required": true, "items": {"type": "object", "properties": {"item_name": {"type": "string", "required": true}, "quantity": {"type": "number", "required": true}, "unit_price": {"type": "number", "required": true}, "total_price": {"type": "number", "required": true}}}}, "financial_summary": {"type": "object", "required": true, "properties": {"subtotal": {"type": "number", "required": true}, "tax_ppn_amount": {"type": "number", "required": false}, "grand_total": {"type": "number", "required": true}}}}}'::jsonb,
'Analisis dokumen transaksi keuangan yang diunggah. Pilih 1 tool_call yang paling sesuai berdasarkan jenis dokumen (Struk Kasir Retail vs Corporate Invoice B2B vs Rekening Koran Bank).',
'{"enabled": true, "toolChoice": "auto", "instruction": "Pilih 1 tool_call yang paling sesuai dengan tipe transaksi finansial (Struk Kasir Retail vs Faktur Tagihan Corporate Invoice B2B vs Laporan Mutasi Rekening Koran Bank).", "tools": [{"name": "extract_retail_store_receipt", "description": "Ekstraksi struk kasir toko/restoran (Nama Merchant, Tanggal Transaksi, Line Items Rincian Barang, Subtotal, Tax/PPN, Service Charge, Total Bayar, Metode Pembayaran).", "agentRole": "Retail Expense Audit Agent", "textContext": "Untuk struk kasir toko, minimarket, kwitansi, dan resto.", "includeImageContext": true}, {"name": "extract_corporate_tax_invoice", "description": "Ekstraksi faktur pajak dan tagihan B2B corporate (Invoice Number, Vendor Name, Buyer Company, NPWP, Invoice Date, Due Date, Tax Amount, Line Items, Total Amount).", "agentRole": "Corporate Accounts Payable Auditor", "textContext": "Untuk dokumen invoice tagihan B2B dan faktur pajak.", "includeImageContext": true}, {"name": "extract_bank_account_statement", "description": "Ekstraksi Laporan Mutasi Rekening Koran Bank (Nama Bank, Nama Pemilik Rekening, Nomor Rekening / IBAN, Periode Laporan, Saldo Awal, Total Debet, Total Kredit, Saldo Akhir, Rincian Baris Mutasi [Tanggal, Uraian Keterangan Transaksi, Saldo Debet/Kredit, Running Balance]).", "agentRole": "Bank Statement Reconciliation & Financial Audit Specialist", "textContext": "Khusus dokumen rekening koran bank (BCA, Mandiri, BRI, BNI, CIMB, atau Internasional).", "includeImageContext": true}]}'::jsonb, true),

('tmpl_01HZX01TMPL0000000003', 'usr_demo_health_05', 'medical-prescription-lab-report', 'Medical Diagnostics, Doctor Prescription & Clinical Lab Suite', 'Analisis medis terstruktur untuk Resep Obat Dokter, Laporan Laboratorium Medis/Hasil Tes Darah, dan Resume Medis Pasien Rawat Inap.', 'medical', '["medical", "diagnostics", "healthcare", "pharma"]'::jsonb,
'{"properties": {"image": {"type": "string"}, "patient_id_override": {"type": "string"}}, "required": ["image"]}'::jsonb,
'{"properties": {"medical_document_type": {"type": "string", "required": true}, "patient_info": {"type": "object", "required": true, "properties": {"full_name": {"type": "string", "required": true}, "medical_record_number": {"type": "string", "required": false}}}, "healthcare_facility": {"type": "object", "required": true, "properties": {"facility_name": {"type": "string", "required": true}, "practitioner_doctor_name": {"type": "string", "required": true}, "date": {"type": "string", "required": true}}}, "prescribed_medications": {"type": "array", "required": false, "items": {"type": "object", "properties": {"drug_name": {"type": "string", "required": true}, "dosage": {"type": "string", "required": true}, "instructions_signa": {"type": "string", "required": true}}}}, "lab_test_results": {"type": "array", "required": false, "items": {"type": "object", "properties": {"test_parameter": {"type": "string", "required": true}, "result_value": {"type": "string", "required": true}, "unit": {"type": "string", "required": false}, "reference_range": {"type": "string", "required": false}, "flag": {"type": "string", "required": false}}}}}}'::jsonb,
'Analisis dokumen medis/kesehatan yang diunggah. Pilih 1 tool_call yang paling sesuai berdasarkan jenis dokumen (Resep Obat Dokter vs Laporan Lab Medis vs Resume Medis Rawat Inap).',
'{"enabled": true, "toolChoice": "auto", "instruction": "Pilih 1 tool_call yang paling sesuai dengan dokumen kesehatan (Resep Dokter vs Laporan Hasil Lab Medis vs Resume Medis Pasien Rawat Inap).", "tools": [{"name": "extract_doctor_prescription", "description": "Ekstraksi lembar resep obat dokter (Nama Pasien, Umur, Nama Dokter, Tanggal Resep, Daftar Obat, Dosis & Signa Aturan Pakai).", "agentRole": "Clinical Pharmacology Specialist", "textContext": "Untuk resep obat dari dokter, klinik, dan apotek.", "includeImageContext": true}, {"name": "extract_medical_lab_result", "description": "Ekstraksi laporan lab medis (Nama Pasien, Tanggal Tes, Nama Fasilitas Medis, Parameter Tes Lab, Nilai Hasil, Nilai Rujukan Normal).", "agentRole": "Clinical Diagnostics Inspector", "textContext": "Untuk hasil pemeriksaan laboratorium darah, tes urine, dan diagnostik medis.", "includeImageContext": true}, {"name": "extract_clinical_discharge_resume", "description": "Ekstraksi resume medis / Ringkasan Pasien Pulang (Nama Pasien, Tanggal Masuk RS, Tanggal Keluar RS, Diagnosa Utama ICD-10, Diagnosa Sekunder, Prosedur Medis, Kondisi Pulang).", "agentRole": "Hospital Medical Record Auditor & Clinical Summary Specialist", "textContext": "Khusus lembar resume medis dan ringkasan perawatan rawat inap rumah sakit.", "includeImageContext": true}]}'::jsonb, true)
ON CONFLICT (code) DO NOTHING;

-- 10. SEED CALL SPECS
INSERT INTO call_specs (id, user_id, template_id, name, slug, description, active_version_number, status, use_external_api_key, external_model_name, tools_config) VALUES
('spc_01HZX01SPEC0000000001', 'usr_default_dev_01', 'tmpl_01HZX01TMPL0000000001', 'Government Identity Document Verification', 'ktp-parser', 'Suite verifikasi KTP, SIM, dan Paspor resmi Republik Indonesia', 1, 'active', true, 'gemini-3.6-flash', '{"enabled": true, "toolChoice": "auto", "tools": [{"name": "extract_indonesian_ktp_identity", "description": "Ekstraksi data terstruktur KTP Indonesia"}, {"name": "extract_driver_license_permit", "description": "Ekstraksi SIM"}, {"name": "extract_republic_indonesia_passport", "description": "Ekstraksi Paspor RI"}]}'::jsonb),
('spc_01HZX01SPEC0000000002', 'usr_default_dev_01', 'tmpl_01HZX01TMPL0000000002', 'Financial Receipt & Invoice Suite', 'receipt-extractor', 'Multi-currency corporate receipt, invoice & bank statement scanner spec', 1, 'active', true, 'gemini-3.6-flash', '{"enabled": true, "toolChoice": "auto", "tools": [{"name": "extract_retail_store_receipt", "description": "Ekstraksi struk retail"}, {"name": "extract_corporate_tax_invoice", "description": "Ekstraksi faktur pajak B2B"}, {"name": "extract_bank_account_statement", "description": "Ekstraksi mutasi koran bank"}]}'::jsonb),
('spc_01HZX01SPEC0000000003', 'usr_default_dev_01', 'tmpl_01HZX01TMPL0000000003', 'Medical Prescription Scanner', 'prescription-parser', 'Clinical prescription, lab test diagnostic & discharge resume extractor spec', 1, 'active', true, 'gemini-3.6-flash', '{"enabled": true, "toolChoice": "auto", "tools": [{"name": "extract_doctor_prescription", "description": "Ekstraksi resep dokter"}, {"name": "extract_medical_lab_result", "description": "Ekstraksi laporan lab medis"}, {"name": "extract_clinical_discharge_resume", "description": "Ekstraksi resume medis"}]}'::jsonb)
ON CONFLICT (user_id, slug) DO NOTHING;

-- 11. SEED CALL SPEC VERSIONS
INSERT INTO call_spec_versions (id, call_spec_id, version_number, request_schema, response_schema, system_prompt, preferred_model_id, use_external_api_key, external_model_name, tools_config) VALUES
('ver_01HZX01SPEC0000000001', 'spc_01HZX01SPEC0000000001', 1, '{"properties": {"image": {"type": "string", "description": "Base64 or URL of identity document image"}, "prompt": {"type": "string", "description": "Optional guidelines"}}, "required": ["image"]}'::jsonb, '{"properties": {"document_type": {"type": "string", "required": true}, "full_name": {"type": "string", "required": true}}}'::jsonb, 'Analisis dokumen identitas resmi yang diunggah (KTP, SIM, atau Paspor). Pilih 1 tool_call yang paling sesuai.', '01HZX01MODEL00000000000001', true, 'gemini-3.6-flash', '{"enabled": true, "toolChoice": "auto", "tools": [{"name": "extract_indonesian_ktp_identity", "description": "Ekstraksi data terstruktur KTP Indonesia"}, {"name": "extract_driver_license_permit", "description": "Ekstraksi SIM"}, {"name": "extract_republic_indonesia_passport", "description": "Ekstraksi Paspor RI"}]}'::jsonb),
('ver_01HZX01SPEC0000000002', 'spc_01HZX01SPEC0000000002', 1, '{"properties": {"image": {"type": "string", "description": "Base64 string or image URL"}, "currency_override": {"type": "string", "description": "3-letter ISO code"}}, "required": ["image"]}'::jsonb, '{"properties": {"merchant_name": {"type": "string", "required": true}, "total_paid": {"type": "number", "required": true}}}'::jsonb, 'Analisis dokumen transaksi keuangan yang diunggah.', '01HZX01MODEL00000000000001', true, 'gemini-3.6-flash', '{"enabled": true, "toolChoice": "auto", "tools": [{"name": "extract_retail_store_receipt", "description": "Ekstraksi struk retail"}, {"name": "extract_corporate_tax_invoice", "description": "Ekstraksi faktur pajak B2B"}, {"name": "extract_bank_account_statement", "description": "Ekstraksi mutasi koran bank"}]}'::jsonb),
('ver_01HZX01SPEC0000000003', 'spc_01HZX01SPEC0000000003', 1, '{"properties": {"image": {"type": "string", "description": "Base64 or URL of medical document"}, "patient_id_override": {"type": "string", "description": "Internal Medical Record ID"}}, "required": ["image"]}'::jsonb, '{"properties": {"patient_name": {"type": "string", "required": true}, "doctor_name": {"type": "string", "required": true}}}'::jsonb, 'Analisis dokumen medis/kesehatan yang diunggah.', '01HZX01MODEL00000000000001', true, 'gemini-3.6-flash', '{"enabled": true, "toolChoice": "auto", "tools": [{"name": "extract_doctor_prescription", "description": "Ekstraksi resep dokter"}, {"name": "extract_medical_lab_result", "description": "Ekstraksi laporan lab medis"}, {"name": "extract_clinical_discharge_resume", "description": "Ekstraksi resume medis"}]}'::jsonb)
ON CONFLICT (call_spec_id, version_number) DO NOTHING;

-- 12. SEED API REQUEST AUDIT LOGS
INSERT INTO api_requests (id, request_id, user_id, call_spec_id, call_spec_version_id, credential_id, provider_id, model_id, status, http_status, input_type, input_size_bytes, processing_time_ms, prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd, client_ip, user_agent, created_at) VALUES
('req_01HZX01REQ000000000001', 'req_live_01HZX01AAA99', 'usr_default_dev_01', 'spc_01HZX01SPEC0000000001', 'ver_01HZX01SPEC0000000001', 'crd_01HZX01KEY00000000001', '01HZX01PROVIDER00000000001', '01HZX01MODEL00000000000001', 'completed', 200, 'url', 154200, 420, 680, 140, 820, 0.000093, '198.51.100.42', 'python-requests/2.31.0', CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
('req_01HZX01REQ000000000002', 'req_live_01HZX01BBB88', 'usr_default_dev_01', 'spc_01HZX01SPEC0000000002', 'ver_01HZX01SPEC0000000002', 'crd_01HZX01KEY00000000001', '01HZX01PROVIDER00000000001', '01HZX01MODEL00000000000001', 'completed', 200, 'base64', 285400, 850, 1250, 310, 1560, 0.000186, '198.51.100.42', 'Node/v20.11.0', CURRENT_TIMESTAMP - INTERVAL '45 minutes'),
('req_01HZX01REQ000000000003', 'req_live_01HZX01CCC77', 'usr_default_dev_01', 'spc_01HZX01SPEC0000000003', 'ver_01HZX01SPEC0000000003', 'crd_01HZX01KEY00000000001', '01HZX01PROVIDER00000000001', '01HZX01MODEL00000000000001', 'completed', 200, 'url', 98400, 640, 890, 180, 1070, 0.004025, '203.0.113.15', 'curl/7.88.1', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
('req_01HZX01REQ000000000004', 'req_live_01HZX01DDD66', 'usr_default_dev_01', 'spc_01HZX01SPEC0000000001', 'ver_01HZX01SPEC0000000001', 'crd_01HZX01KEY00000000001', '01HZX01PROVIDER00000000001', '01HZX01MODEL00000000000001', 'failed', 422, 'base64', 12000, 45, 0, 0, 0, 0.000000, '198.51.100.42', 'python-requests/2.31.0', CURRENT_TIMESTAMP - INTERVAL '5 hours'),
('req_01HZX01REQ000000000005', 'req_live_01HZX01EEE55', 'usr_default_dev_01', 'spc_01HZX01SPEC0000000002', 'ver_01HZX01SPEC0000000002', 'crd_01HZX01KEY00000000001', '01HZX01PROVIDER00000000001', '01HZX01MODEL00000000000001', 'completed', 200, 'url', 310500, 1120, 1420, 260, 1680, 0.008160, '172.56.21.9', 'Go-http-client/1.1', CURRENT_TIMESTAMP - INTERVAL '12 hours')
ON CONFLICT (request_id) DO NOTHING;

-- 13. SEED USER DAILY USAGE ANALYTICS
INSERT INTO user_usage_daily (id, user_id, usage_date, total_requests, successful_requests, failed_requests, total_tokens, total_cost_usd) VALUES
('usg_01HZX01USG000000000001', 'usr_default_dev_01', CURRENT_DATE - INTERVAL '6 days', 120, 115, 5, 142000, 0.042500),
('usg_01HZX01USG000000000002', 'usr_default_dev_01', CURRENT_DATE - INTERVAL '5 days', 145, 142, 3, 185000, 0.058200),
('usg_01HZX01USG000000000003', 'usr_default_dev_01', CURRENT_DATE - INTERVAL '4 days', 98, 95, 3, 118000, 0.035100),
('usg_01HZX01USG000000000004', 'usr_default_dev_01', CURRENT_DATE - INTERVAL '3 days', 210, 204, 6, 276000, 0.089400),
('usg_01HZX01USG000000000005', 'usr_default_dev_01', CURRENT_DATE - INTERVAL '2 days', 180, 175, 5, 230000, 0.071200),
('usg_01HZX01USG000000000006', 'usr_default_dev_01', CURRENT_DATE - INTERVAL '1 day', 260, 255, 5, 340000, 0.114500),
('usg_01HZX01USG000000000007', 'usr_default_dev_01', CURRENT_DATE, 84, 82, 2, 105000, 0.032800),

('usg_01HZX01USG000000000008', 'usr_demo_developer_02', CURRENT_DATE - INTERVAL '6 days', 45, 43, 2, 58000, 0.018500),
('usg_01HZX01USG000000000009', 'usr_demo_developer_02', CURRENT_DATE - INTERVAL '5 days', 62, 60, 2, 82000, 0.026400),
('usg_01HZX01USG000000000010', 'usr_demo_developer_02', CURRENT_DATE - INTERVAL '4 days', 88, 85, 3, 112000, 0.035800),
('usg_01HZX01USG000000000011', 'usr_demo_developer_02', CURRENT_DATE - INTERVAL '3 days', 105, 102, 3, 134000, 0.043100),
('usg_01HZX01USG000000000012', 'usr_demo_developer_02', CURRENT_DATE - INTERVAL '2 days', 130, 128, 2, 168000, 0.054200),
('usg_01HZX01USG000000000013', 'usr_demo_developer_02', CURRENT_DATE - INTERVAL '1 day', 175, 170, 5, 225000, 0.072600),
('usg_01HZX01USG000000000014', 'usr_demo_developer_02', CURRENT_DATE, 52, 50, 2, 64000, 0.020500)
ON CONFLICT (user_id, usage_date) DO NOTHING;

-- 14. SEED APP INIT SETTINGS
INSERT INTO app_init (id, app_name, app_icon, tagline, description, favicon_url, disable_landing_page, default_registration_status, require_email_verification) VALUES
('app_01HZX01INIT00000000001', 'Callcraft', 'Feather', 'Multimodal AI Execution Gateway', 'Dynamic AI Tool Calling, Structured JSON Coercion, and Multimodal API Gateway.', '/favicon.ico', false, 'pending_verification', true)
ON CONFLICT (id) DO NOTHING;

