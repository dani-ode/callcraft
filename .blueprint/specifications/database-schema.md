# Database Specification — Complete PostgreSQL Schema DDL & ERD

This document specifies the production PostgreSQL 16+ relational database schema for **Callcraft**. The database is designed to support all business requirements and architectural decisions outlined in Q&A files 1 through 5, comprising **16 Core Relational Tables**.

---

## 📋 Catalog of Database Tables (16 Relational Tables)

| # | Table Name | Category | Description |
| :-: | :--- | :--- | :--- |
| **1** | `users` | Core User | Platform user accounts, email, password hashes, and verification status |
| **2** | `roles` | Security & RBAC | System roles (SUPER_ADMIN, ADMIN, SUPPORT, ANALYST, USER) |
| **3** | `permissions` | Security & RBAC | Granular permission codes (e.g., `model.manage`, `call.execute`, `user.read`) |
| **4** | `role_permissions` | Security & RBAC | Many-to-Many junction table between Roles and Permissions |
| **5** | `user_roles` | Security & RBAC | Many-to-Many junction table between Users and Roles |
| **6** | `service_clients` | Internal Auth | Credentials for internal Next.js Server ➔ Python API authentication (`/internal/v1/*`) |
| **7** | `api_credentials` | Customer Auth | Public Key & Secret Key Hash pairs for customer applications (`call_sk_live_...`) |
| **8** | `ai_providers` | AI Registry | Provider registry (Google Gemini, OpenAI, Anthropic, DeepSeek) |
| **9** | `ai_models` | AI Registry | AI Vision & LLM model registry, tool calling features, and token pricing rates |
| **10**| `user_ai_providers` | User Credentials | User-supplied AI Provider API Keys encrypted with **AES-256-GCM** |
| **11**| `templates` | Blueprint Master | Official master templates (Invoice, Receipt, Document Parser, Custom API) |
| **12**| `call_specs` | Call Specs | Custom user-created Callcraft API specification entities |
| **13**| `call_spec_versions` | Call Specs | Schema version history (Request/Response JSON Schemas, Prompts) |
| **14**| `system_prompts` | Platform Config | Master system prompts & tool calling prompts managed by Admins |
| **15**| `api_requests` | Audit Logs | Execution request metadata logs (Zero document/image retention) |
| **16**| `user_usage_daily` | Analytics | Daily aggregated usage metrics (request counts, token counts, cost tracking) |

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
-- TABLE 1: USERS
-- =============================================================================
CREATE TABLE users (
    id VARCHAR(26) PRIMARY KEY, -- ULID format (26 chars)
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
-- TABLE 2: ROLES
-- =============================================================================
CREATE TABLE roles (
    id VARCHAR(26) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'ANALYST', 'USER'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABLE 3: PERMISSIONS
-- =============================================================================
CREATE TABLE permissions (
    id VARCHAR(26) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'user.read', 'model.manage', 'call.execute'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABLE 4: ROLE_PERMISSIONS
-- =============================================================================
CREATE TABLE role_permissions (
    role_id VARCHAR(26) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(26) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);


-- =============================================================================
-- TABLE 5: USER_ROLES
-- =============================================================================
CREATE TABLE user_roles (
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(26) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);


-- =============================================================================
-- TABLE 6: SERVICE_CLIENTS (Next.js Server -> Python API Auth)
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
-- TABLE 7: API_CREDENTIALS (Customer Public & Secret Keys)
-- =============================================================================
CREATE TABLE api_credentials (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., 'Production App Key'
    public_key VARCHAR(100) NOT NULL UNIQUE, -- 'pk_live_...'
    secret_key_hash VARCHAR(255) NOT NULL, -- Argon2id hash of 'call_sk_live_...'
    environment VARCHAR(20) NOT NULL DEFAULT 'production', -- 'production', 'sandbox'
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_credentials_user_id ON api_credentials(user_id);
CREATE INDEX idx_api_credentials_public_key ON api_credentials(public_key);


-- =============================================================================
-- TABLE 8: AI_PROVIDERS
-- =============================================================================
CREATE TABLE ai_providers (
    id VARCHAR(26) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'gemini', 'openai', 'anthropic', 'deepseek'
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABLE 9: AI_MODELS
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
-- TABLE 10: USER_AI_PROVIDERS (User Encrypted Keys)
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
-- TABLE 11: TEMPLATES
-- =============================================================================
CREATE TABLE templates (
    id VARCHAR(26) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'invoice', 'document-parser', 'receipt'
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- 'financial', 'document', 'form'
    request_schema JSONB NOT NULL,
    response_schema JSONB NOT NULL,
    system_prompt TEXT NOT NULL,
    extraction_prompt TEXT,
    is_official BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- =============================================================================
-- TABLE 12: CALL_SPECS
-- =============================================================================
CREATE TABLE call_specs (
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

CREATE INDEX idx_call_specs_user_id ON call_specs(user_id);


-- =============================================================================
-- TABLE 13: CALL_SPEC_VERSIONS
-- =============================================================================
CREATE TABLE call_spec_versions (
    id VARCHAR(26) PRIMARY KEY,
    call_spec_id VARCHAR(26) NOT NULL REFERENCES call_specs(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    request_schema JSONB NOT NULL,
    response_schema JSONB NOT NULL,
    system_prompt TEXT,
    extraction_prompt TEXT,
    preferred_model_id VARCHAR(26) REFERENCES ai_models(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_spec_version UNIQUE (call_spec_id, version_number)
);


-- =============================================================================
-- TABLE 14: SYSTEM_PROMPTS (Managed by Admin)
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
-- TABLE 15: API_REQUESTS (Audit Metadata - Zero Document Retention)
-- =============================================================================
CREATE TABLE api_requests (
    id VARCHAR(26) PRIMARY KEY,
    request_id VARCHAR(100) NOT NULL UNIQUE,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_spec_id VARCHAR(26) NOT NULL REFERENCES call_specs(id) ON DELETE CASCADE,
    call_spec_version_id VARCHAR(26) NOT NULL REFERENCES call_spec_versions(id) ON DELETE CASCADE,
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
CREATE INDEX idx_api_requests_spec_id ON api_requests(call_spec_id);
CREATE INDEX idx_api_requests_status ON api_requests(status);


-- =============================================================================
-- TABLE 16: USER_USAGE_DAILY (Daily Aggregated Analytics)
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
