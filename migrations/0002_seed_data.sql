-- =============================================================================
-- SEED DATA FOR CALLCRAFT PLATFORM
-- =============================================================================

-- 1. SEED AI PROVIDERS
INSERT INTO ai_providers (id, code, name, is_active) VALUES
('01HZX01PROVIDER00000000001', 'gemini', 'Google Gemini AI', true),
('01HZX01PROVIDER00000000002', 'openai', 'OpenAI', true),
('01HZX01PROVIDER00000000003', 'anthropic', 'Anthropic Claude', true),
('01HZX01PROVIDER00000000004', 'deepseek', 'DeepSeek AI', true)
ON CONFLICT (code) DO NOTHING;

-- 2. SEED AI MODELS
INSERT INTO ai_models (id, provider_id, name, model_identifier, supports_image, supports_tool_calling, supports_structured_output, cost_per_1k_prompt_tokens, cost_per_1k_completion_tokens, is_default, is_active) VALUES
('01HZX01MODEL00000000000001', '01HZX01PROVIDER00000000001', 'Gemini 1.5 Flash', 'gemini-1.5-flash', true, true, true, 0.000075, 0.000300, true, true),
('01HZX01MODEL00000000000002', '01HZX01PROVIDER00000000001', 'Gemini 1.5 Pro', 'gemini-1.5-pro', true, true, true, 0.001250, 0.005000, false, true),
('01HZX01MODEL00000000000003', '01HZX01PROVIDER00000000002', 'GPT-4o', 'gpt-4o', true, true, true, 0.002500, 0.010000, false, true),
('01HZX01MODEL00000000000004', '01HZX01PROVIDER00000000002', 'GPT-4o Mini', 'gpt-4o-mini', true, true, true, 0.000150, 0.000600, false, true),
('01HZX01MODEL00000000000005', '01HZX01PROVIDER00000000003', 'Claude 3.5 Sonnet', 'claude-3-5-sonnet-20240620', true, true, true, 0.003000, 0.015000, false, true),
('01HZX01MODEL00000000000006', '01HZX01PROVIDER00000000004', 'DeepSeek V3', 'deepseek-chat', false, true, true, 0.000140, 0.000280, false, true)
ON CONFLICT DO NOTHING;

-- 3. SEED ROLES & PERMISSIONS
INSERT INTO roles (id, name, description) VALUES
('01HZX01ROLE000000000000001', 'SUPER_ADMIN', 'Super administrator with unrestricted platform access'),
('01HZX01ROLE000000000000002', 'ADMIN', 'Platform administrator'),
('01HZX01ROLE000000000000003', 'USER', 'Standard developer user')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (id, code, description) VALUES
('01HZX01PERM000000000000001', 'call.execute', 'Execute Callcraft API specs'),
('01HZX01PERM000000000000002', 'spec.manage', 'Create, update, and delete Callcraft API specs'),
('01HZX01PERM000000000000003', 'key.manage', 'Create and revoke API keys and AI provider keys'),
('01HZX01PERM000000000000004', 'model.manage', 'Administer platform AI models and providers')
ON CONFLICT (code) DO NOTHING;

-- 4. SEED OFFICIAL TEMPLATES
INSERT INTO templates (id, code, name, description, category, request_schema, response_schema, system_prompt, is_official) VALUES
('01HZX01TMPL000000000000001', 'invoice-parser', 'Invoice Data Extractor', 'Extracts invoice metadata including invoice number, vendor, line items, and total amount.', 'financial', 
'{"properties": {"image": {"type": "string", "description": "Base64 or URL of invoice image/pdf"}}, "required": ["image"]}'::jsonb,
'{"properties": {"invoice_number": {"type": "string", "required": true}, "vendor_name": {"type": "string", "required": true}, "invoice_date": {"type": "date", "required": true}, "total_amount": {"type": "number", "required": true}, "currency": {"type": "string", "required": true}, "line_items": {"type": "array", "required": false}}}'::jsonb,
'Extract all structured financial invoice metadata accurately from the document image.', true),

('01HZX01TMPL000000000000002', 'ktp-id-parser', 'Indonesian KTP / National ID Parser', 'Extracts NIK, Full Name, Gender, DOB, and Address details from KTP document.', 'document',
'{"properties": {"image": {"type": "string", "description": "Base64 or URL of KTP image"}}, "required": ["image"]}'::jsonb,
'{"properties": {"nik": {"type": "string", "required": true}, "full_name": {"type": "string", "required": true}, "gender": {"type": "enum", "enum_values": ["LAKI-LAKI", "PEREMPUAN"], "required": true}, "place_of_birth": {"type": "string", "required": false}, "date_of_birth": {"type": "date", "required": false}, "address": {"type": "string", "required": false}}}'::jsonb,
'Extract clear, exact text fields from the Indonesian KTP National Identity card image.', true),

('01HZX01TMPL000000000000003', 'receipt-parser', 'Retail Receipt Parser', 'Extracts merchant name, purchase date, line items, tax, and total paid.', 'financial',
'{"properties": {"image": {"type": "string", "description": "Base64 or URL of receipt image"}}, "required": ["image"]}'::jsonb,
'{"properties": {"merchant_name": {"type": "string", "required": true}, "transaction_date": {"type": "date", "required": true}, "tax_amount": {"type": "number", "required": false}, "total_paid": {"type": "number", "required": true}}}'::jsonb,
'Extract retail receipt fields accurately from receipt image.', true)
ON CONFLICT (code) DO NOTHING;
