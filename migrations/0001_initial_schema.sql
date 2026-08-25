-- Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. USERS
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    email_verified_at TIMESTAMPTZ,
    bio TEXT,
    avatar_url TEXT,
    github_url VARCHAR(255),
    website_url VARCHAR(255),
    company VARCHAR(255),
    location VARCHAR(255),
    phone VARCHAR(50),
    email_verification_token VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token);

-- 2. ROLES
CREATE TABLE roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. PERMISSIONS
CREATE TABLE permissions (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. ROLE_PERMISSIONS
CREATE TABLE role_permissions (
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(50) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 5. USER_ROLES
CREATE TABLE user_roles (
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(50) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- 6. SERVICE_CLIENTS
CREATE TABLE service_clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    client_id VARCHAR(100) NOT NULL UNIQUE,
    secret_hash VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. PROJECTS
CREATE TABLE projects (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) NOT NULL DEFAULT '#e1b329',
    icon VARCHAR(50) NOT NULL DEFAULT 'Boxes',
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_project_slug UNIQUE (user_id, slug)
);

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);

-- 8. API_CREDENTIALS
CREATE TABLE api_credentials (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    public_key VARCHAR(100) NOT NULL UNIQUE,
    secret_key_hash VARCHAR(255) NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    ip_whitelist JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_api_credentials_user_id ON api_credentials(user_id);
CREATE INDEX idx_api_credentials_project_id ON api_credentials(project_id);
CREATE INDEX idx_api_credentials_public_key ON api_credentials(public_key);

-- 9. AI_PROVIDERS
CREATE TABLE ai_providers (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. AI_MODELS
CREATE TABLE ai_models (
    id VARCHAR(50) PRIMARY KEY,
    provider_id VARCHAR(50) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    model_identifier VARCHAR(100) NOT NULL,
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

-- 11. USER_AI_PROVIDERS
CREATE TABLE user_ai_providers (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    provider_id VARCHAR(50) NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
    encrypted_api_key TEXT NOT NULL,
    key_nonce VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_project_provider UNIQUE (user_id, project_id, provider_id)
);

CREATE INDEX idx_user_ai_providers_project_id ON user_ai_providers(project_id);

-- 12. TEMPLATES
CREATE TABLE templates (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    categories JSONB NOT NULL DEFAULT '[]'::jsonb,
    request_schema JSONB NOT NULL,
    response_schema JSONB NOT NULL,
    tools_config JSONB DEFAULT '{}'::jsonb,
    positive_prompt TEXT,
    negative_prompt TEXT,
    additional_prompt TEXT,
    allow_additional_prompt BOOLEAN NOT NULL DEFAULT true,
    is_official BOOLEAN NOT NULL DEFAULT true,
    is_published BOOLEAN NOT NULL DEFAULT true,
    fork_count INT NOT NULL DEFAULT 0,
    likes_count INT NOT NULL DEFAULT 0,
    rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 5.00,
    reviews_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_user_id ON templates(user_id);

-- 12a. TEMPLATE_LIKES
CREATE TABLE template_likes (
    template_id VARCHAR(50) NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (template_id, user_id)
);

-- 12b. TEMPLATE_COMMENTS
CREATE TABLE template_comments (
    id VARCHAR(50) PRIMARY KEY,
    template_id VARCHAR(50) NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(100) NOT NULL DEFAULT 'Developer',
    rating INT NOT NULL DEFAULT 5,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_template_comments_template_id ON template_comments(template_id);
CREATE INDEX idx_template_comments_user_id ON template_comments(user_id);

-- 12c. APP_INIT
CREATE TABLE app_init (
    id VARCHAR(50) PRIMARY KEY,
    app_name VARCHAR(100) NOT NULL DEFAULT 'Callcraft',
    app_icon TEXT NOT NULL DEFAULT 'Feather',
    tagline VARCHAR(255) NOT NULL DEFAULT 'Multimodal AI Execution Gateway',
    description TEXT,
    favicon_url TEXT DEFAULT '/favicon.ico',
    disable_landing_page BOOLEAN NOT NULL DEFAULT false,
    default_allow_additional_prompt BOOLEAN NOT NULL DEFAULT true,
    default_additional_prompt TEXT DEFAULT 'Opsional: Instruksi tambahan dari user...',
    default_registration_status VARCHAR(50) DEFAULT 'pending_verification',
    require_email_verification BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 13. CALL_SPECS
CREATE TABLE call_specs (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    template_id VARCHAR(50) REFERENCES templates(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    active_version_number INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    allow_pdf_input BOOLEAN NOT NULL DEFAULT true,
    use_external_api_key BOOLEAN NOT NULL DEFAULT true,
    external_api_key TEXT,
    external_model_name VARCHAR(100),
    tools_config JSONB DEFAULT '{}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_template_id VARCHAR(50) REFERENCES templates(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_spec_slug UNIQUE (user_id, slug)
);

CREATE INDEX idx_call_specs_user_id ON call_specs(user_id);
CREATE INDEX idx_call_specs_project_id ON call_specs(project_id);

-- 14. CALL_SPEC_VERSIONS
CREATE TABLE call_spec_versions (
    id VARCHAR(50) PRIMARY KEY,
    call_spec_id VARCHAR(50) NOT NULL REFERENCES call_specs(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    request_schema JSONB NOT NULL,
    response_schema JSONB NOT NULL,
    positive_prompt TEXT,
    negative_prompt TEXT,
    additional_prompt TEXT,
    allow_additional_prompt BOOLEAN NOT NULL DEFAULT true,
    preferred_model_id VARCHAR(50) REFERENCES ai_models(id),
    allow_pdf_input BOOLEAN NOT NULL DEFAULT true,
    use_external_api_key BOOLEAN NOT NULL DEFAULT true,
    external_api_key TEXT,
    external_model_name VARCHAR(100),
    tools_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_spec_version UNIQUE (call_spec_id, version_number)
);

-- 15. SYSTEM_PROMPTS
CREATE TABLE system_prompts (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 16. API_REQUESTS
CREATE TABLE api_requests (
    id VARCHAR(50) PRIMARY KEY,
    request_id VARCHAR(100) NOT NULL UNIQUE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    call_spec_id VARCHAR(50) NOT NULL REFERENCES call_specs(id) ON DELETE CASCADE,
    call_spec_version_id VARCHAR(50) NOT NULL REFERENCES call_spec_versions(id) ON DELETE CASCADE,
    credential_id VARCHAR(50) REFERENCES api_credentials(id) ON DELETE SET NULL,
    provider_id VARCHAR(50) REFERENCES ai_providers(id) ON DELETE SET NULL,
    model_id VARCHAR(50) REFERENCES ai_models(id) ON DELETE SET NULL,
    
    status VARCHAR(50) NOT NULL,
    http_status INT NOT NULL,
    
    input_type VARCHAR(20) NOT NULL,
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

-- 17. USER_USAGE_DAILY
CREATE TABLE user_usage_daily (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

-- 18. PLAYGROUND_STATES
CREATE TABLE playground_states (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id VARCHAR(50) REFERENCES projects(id) ON DELETE CASCADE,
    call_spec_id VARCHAR(50) NOT NULL REFERENCES call_specs(id) ON DELETE CASCADE,
    selected_credential_id VARCHAR(50) REFERENCES api_credentials(id) ON DELETE SET NULL,
    checked_states JSONB NOT NULL DEFAULT '{}'::jsonb,
    extra_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
    prompt TEXT,
    image_url TEXT,
    ai_model_name VARCHAR(100),
    ai_api_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_spec_playground_state UNIQUE (user_id, call_spec_id)
);

CREATE INDEX idx_playground_states_user_id ON playground_states(user_id);
CREATE INDEX idx_playground_states_call_spec_id ON playground_states(call_spec_id);
