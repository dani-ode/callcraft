-- Migration 0004: Add Base URL columns for third-party AI gateway/proxy support
ALTER TABLE user_ai_providers ADD COLUMN IF NOT EXISTS base_url VARCHAR(500);
ALTER TABLE call_specs ADD COLUMN IF NOT EXISTS external_base_url VARCHAR(500);
ALTER TABLE call_spec_versions ADD COLUMN IF NOT EXISTS external_base_url VARCHAR(500);
ALTER TABLE playground_states ADD COLUMN IF NOT EXISTS ai_base_url VARCHAR(500);
