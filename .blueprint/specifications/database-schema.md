# Database Specification — Complete PostgreSQL Schema DDL & ERD

Dokumen ini berisi spesifikasi database relasional PostgreSQL 16+ terlengkap untuk **Callcraft**. Database ini dirancang untuk mencakup seluruh kebutuhan bisnis dan arsitektur yang didiskusikan pada `qna-1.md` hingga `qna-4.md`, terdiri dari **16 Tabel Relasional Utama**.

---

## 📋 Catalog of Database Tables (16 Relational Tables)

| # | Table Name | Category | Description |
| :-: | :--- | :--- | :--- |
| **1** | `users` | Core User | Akun pengguna platform, email, password hash, status verifikasi |
| **2** | `roles` | Security & RBAC | Peran sistem (SUPER_ADMIN, ADMIN, SUPPORT, ANALYST, USER) |
| **3** | `permissions` | Security & RBAC | Hak akses spesifik (misal: `model.manage`, `call.execute`, `user.read`) |
| **4** | `role_permissions` | Security & RBAC | Relasi *Many-to-Many* antara Roles dan Permissions |
| **5** | `user_roles` | Security & RBAC | Relasi *Many-to-Many* antara Users dan Roles |
| **6** | `service_clients` | Internal Auth | Credential autentikasi internal Next.js Server ➔ Python API (`/internal/v1/*`) |
| **7** | `api_credentials` | Customer Auth | Pasangan Public Key & Secret Key Hash pelanggan (`sk_live_...`) |
| **8** | `ai_providers` | AI Registry | Registri provider AI (Google Gemini, OpenAI, Anthropic, DeepSeek) |
| **9** | `ai_models` | AI Registry | Registri model AI Vision/LLM, fitur tool calling, dan pricing per token |
| **10**| `user_ai_providers` | User AI Credentials| API Key AI Provider pengguna yang dienkripsi **AES-256-GCM** |
| **11**| `templates` | Callcraft Blueprint| Master template resmi (Invoice, Receipt, Document Parser, Custom API) |
| **12**| `call_specs` | Call Specs | Entitas spesifikasi API Callcraft buatan pengguna |
| **13**| `call_spec_versions` | Call Specs | Histori versi schema (Request/Response JSON Schema, Prompts) |
| **14**| `system_prompts` | Platform Config | Master system prompt & prompt tool calling yang dikelola Admin |
| **15**| `api_requests` | Audit Logs | Log metadata eksekusi Callcraft (Tanpa menyimpan payload gambar/dokumen) |
| **16**| `user_usage_daily` | Analytics | Agregasi harian penggunaan API, token, dan estimasi biaya per user |

---

## 📐 Entity-Relationship Diagram (ERD Overview)

```text
┌──────────────┐         ┌─────────────────────┐         ┌─────────────────────┐
│    roles     ├─────────┤  role_permissions   ├─────────┤     permissions     │
└──────┬───────┘         └─────────────────────┘         └─────────────────────┘
       │
       │                 ┌─────────────────────┐
       └─────────────────┤     user_roles      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │        users        │
                         └──────────┬──────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │                            │                            │
       ▼                            ▼                            ▼
┌──────────────┐          ┌────────────────────┐       ┌──────────────────┐
│  call_specs  │          │ user_ai_providers  │       │ api_credentials  │
└──────┬───────┘          └─────────┬──────────┘       └─────────┬────────┘
       │                            │                            │
       ▼                            │                            │
┌──────────────────────┐            │                            │
│  call_spec_versions  │            │                            │
└──────┬───────────────┘            │                            │
       │                            │                            │
       └────────────────────────────┼────────────────────────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │    api_requests     ├──────────┐
                         └──────────┬──────────┘          │
                                    │                     ▼
                                    ▼           ┌────────────────────┐
                         ┌─────────────────────┐│ user_usage_daily   │
                         │   system_prompts    │└────────────────────┘
                         └─────────────────────┘
```

---

## 🛠️ Complete PostgreSQL 16+ Migration DDL Script

```sql
-- Enable PostgreSQL Extensions for UUID & Cryptographic operations
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- TABEL 1: USERS
-- =============================================================================
CREATE TABLE users (
    id VARCHAR(26) PRIMARY KEY, -- Format ULID (26 karakter)
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'unverified'
    email_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);


-- =============================================================================
-- TABEL 2: ROLES
-- =============================================================================
CREATE TABLE roles (
    id VARCHAR(26) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'ANALYST', 'USER'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABEL 3: PERMISSIONS
-- =============================================================================
CREATE TABLE permissions (
    id VARCHAR(26) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'user.read', 'model.manage', 'ocr.execute'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABEL 4: ROLE_PERMISSIONS
-- =============================================================================
CREATE TABLE role_permissions (
    role_id VARCHAR(26) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(26) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


-- =============================================================================
-- TABEL 5: USER_ROLES
-- =============================================================================
CREATE TABLE user_roles (
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(26) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);


-- =============================================================================
-- TABEL 6: SERVICE_CLIENTS (Next.js Server -> Rust Auth)
-- =============================================================================
CREATE TABLE service_clients (
    id VARCHAR(26) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'svc_nextjs_main'
    client_id VARCHAR(100) NOT NULL UNIQUE,
    secret_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABEL 7: API_CREDENTIALS (Customer Public & Secret Keys)
-- =============================================================================
CREATE TABLE api_credentials (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Production Mobile App Key'
    public_key VARCHAR(100) NOT NULL UNIQUE, -- 'pk_live_...'
    secret_key_hash VARCHAR(255) NOT NULL, -- Argon2id hash dari 'sk_live_...'
    environment VARCHAR(20) NOT NULL DEFAULT 'production', -- 'production', 'sandbox'
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_credentials_user_id ON api_credentials(user_id);
CREATE INDEX idx_api_credentials_public_key ON api_credentials(public_key);


-- =============================================================================
-- TABEL 8: AI_PROVIDERS
-- =============================================================================
CREATE TABLE ai_providers (
    id VARCHAR(26) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'gemini', 'openai'
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABEL 9: AI_MODELS
-- =============================================================================
CREATE TABLE ai_models (
    id VARCHAR(26) PRIMARY KEY,
    provider_id VARCHAR(26) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Gemini 1.5 Flash'
    model_identifier VARCHAR(100) NOT NULL, -- e.g., 'gemini-1.5-flash'
    supports_image BOOLEAN NOT NULL DEFAULT true,
    supports_tool_calling BOOLEAN NOT NULL DEFAULT true,
    supports_structured_output BOOLEAN NOT NULL DEFAULT true,
    cost_per_1k_prompt_tokens NUMERIC(10, 6) DEFAULT 0.000150,
    cost_per_1k_completion_tokens NUMERIC(10, 6) DEFAULT 0.000600,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_models_provider ON ai_models(provider_id);


-- =============================================================================
-- TABEL 10: USER_AI_PROVIDERS (User Encrypted Keys)
-- =============================================================================
CREATE TABLE user_ai_providers (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id VARCHAR(26) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    encrypted_api_key TEXT NOT NULL, -- AES-256-GCM encrypted string
    key_nonce VARCHAR(100) NOT NULL, -- Nonce AES-256-GCM
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_provider UNIQUE (user_id, provider_id)
);


-- =============================================================================
-- TABEL 11: TEMPLATES
-- =============================================================================
CREATE TABLE templates (
    id VARCHAR(26) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'ktp-id', 'sim-id', 'invoice', 'passport'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'identity', 'financial', 'medical'
    request_schema JSONB NOT NULL,
    response_schema JSONB NOT NULL,
    system_prompt TEXT NOT NULL,
    extraction_prompt TEXT,
    is_official BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABEL 12: OCR_SPECS
-- =============================================================================
CREATE TABLE ocr_specs (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    template_id VARCHAR(26) REFERENCES templates(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    active_version_number INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'archived'
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_spec_slug UNIQUE (user_id, slug)
);

CREATE INDEX idx_ocr_specs_user_id ON ocr_specs(user_id);


-- =============================================================================
-- TABEL 13: OCR_SPEC_VERSIONS
-- =============================================================================
CREATE TABLE ocr_spec_versions (
    id VARCHAR(26) PRIMARY KEY,
    ocr_spec_id VARCHAR(26) NOT NULL REFERENCES ocr_specs(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    request_schema JSONB NOT NULL,
    response_schema JSONB NOT NULL,
    system_prompt TEXT,
    extraction_prompt TEXT,
    preferred_model_id VARCHAR(26) REFERENCES ai_models(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_spec_version UNIQUE (ocr_spec_id, version_number)
);


-- =============================================================================
-- TABEL 14: SYSTEM_PROMPTS (Managed by Admin)
-- =============================================================================
CREATE TABLE system_prompts (
    id VARCHAR(26) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'default_tool_calling_system_prompt'
    name VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABEL 15: API_REQUESTS (Audit Metadata - Zero Image Retention)
-- =============================================================================
CREATE TABLE api_requests (
    id VARCHAR(26) PRIMARY KEY,
    request_id VARCHAR(100) NOT NULL UNIQUE,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ocr_spec_id VARCHAR(26) NOT NULL REFERENCES ocr_specs(id) ON DELETE CASCADE,
    ocr_spec_version_id VARCHAR(26) NOT NULL REFERENCES ocr_spec_versions(id) ON DELETE CASCADE,
    credential_id VARCHAR(26) REFERENCES api_credentials(id) ON DELETE SET NULL,
    provider_id VARCHAR(26) REFERENCES ai_providers(id) ON DELETE SET NULL,
    model_id VARCHAR(26) REFERENCES ai_models(id) ON DELETE SET NULL,
    
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'TIMED_OUT', 'VALIDATION_ERROR'
    http_status INT NOT NULL,
    
    input_type VARCHAR(20) NOT NULL, -- 'base64', 'url'
    input_size_bytes INT NOT NULL,
    
    processing_time_ms INT NOT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens INT DEFAULT 0,
    estimated_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
    
    error_code VARCHAR(100),
    error_message TEXT,
    
    client_ip VARCHAR(45),
    user_agent TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_requests_user_created ON api_requests(user_id, created_at DESC);
CREATE INDEX idx_api_requests_spec_id ON api_requests(ocr_spec_id);
CREATE INDEX idx_api_requests_status ON api_requests(status);


-- =============================================================================
-- TABEL 16: USER_USAGE_DAILY (Agregasi Reporting Harian)
-- =============================================================================
CREATE TABLE user_usage_daily (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    total_requests INT NOT NULL DEFAULT 0,
    successful_requests INT NOT NULL DEFAULT 0,
    failed_requests INT NOT NULL DEFAULT 0,
    total_tokens BIGINT NOT NULL DEFAULT 0,
    total_cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0.000000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_daily_usage UNIQUE (user_id, usage_date)
);

CREATE INDEX idx_user_usage_daily_date ON user_usage_daily(user_id, usage_date DESC);
```
