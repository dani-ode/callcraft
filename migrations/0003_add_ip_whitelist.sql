-- Migration 0003: Add IP Whitelist column to api_credentials table
ALTER TABLE api_credentials ADD COLUMN IF NOT EXISTS ip_whitelist JSONB DEFAULT '[]'::jsonb;
