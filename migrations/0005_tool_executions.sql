-- Metadata only: no request arguments, result bodies, tokens or credentials.
CREATE TABLE IF NOT EXISTS tool_executions (
    id VARCHAR(255) PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL REFERENCES projects(id),
    spec_id VARCHAR(255) NOT NULL REFERENCES call_specs(id),
    idempotency_hash VARCHAR(64) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN
        ('running', 'succeeded', 'failed', 'reconciliation_required')),
    error_code VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (project_id, spec_id, idempotency_hash)
);
CREATE INDEX IF NOT EXISTS ix_tool_executions_project_status
    ON tool_executions(project_id, status, created_at);
