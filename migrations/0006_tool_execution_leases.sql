ALTER TABLE tool_executions ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;
ALTER TABLE tool_executions ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS ix_tool_executions_reconciliation_due
    ON tool_executions(status, lease_until, updated_at)
    WHERE status = 'reconciliation_required';
