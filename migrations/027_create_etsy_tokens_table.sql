-- Migration: 027_create_etsy_tokens_table.sql
-- Purpose: Store Etsy OAuth tokens for API integration
-- Created: 2026-01-11

-- Etsy OAuth tokens storage
CREATE TABLE IF NOT EXISTS etsy_tokens (
  id TEXT PRIMARY KEY DEFAULT 'primary',  -- Single row for shop owner
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  user_id TEXT,  -- Etsy user ID extracted from token
  shop_id TEXT,  -- Cached shop ID for convenience
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for expiration checks
CREATE INDEX IF NOT EXISTS idx_etsy_tokens_expires_at ON etsy_tokens(expires_at);

-- Enable RLS
ALTER TABLE etsy_tokens ENABLE ROW LEVEL SECURITY;

-- Only service role can access (no public access to tokens)
CREATE POLICY "etsy_tokens_service_only" ON etsy_tokens
  FOR ALL
  USING (auth.role() = 'service_role');

-- Comment
COMMENT ON TABLE etsy_tokens IS 'Stores Etsy OAuth access and refresh tokens for API integration';
