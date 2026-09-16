-- Create calculator2_sessions table
CREATE TABLE IF NOT EXISTS public.calculator2_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  form_state JSONB DEFAULT NULL,
  pricing_tier TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on session_token for faster lookups
CREATE INDEX IF NOT EXISTS idx_calculator2_sessions_token ON public.calculator2_sessions(session_token);

-- Enable RLS
ALTER TABLE public.calculator2_sessions ENABLE ROW LEVEL SECURITY;

-- SECURITY NOTE (2026-09-16): the open anon policies this file originally created
-- (always-true read, insert and update rules) were removed in production by
-- 20260218_tighten_rls_policies.sql, 20260405_tighten_calculator2_sessions_rls.sql and
-- 20260721_db_health_security_fixes.sql. Live state: RLS on, service_role only.
-- All reads and writes go through the Cloudflare Worker using the service role.
-- No anon/authenticated policies: the service role bypasses RLS, so nothing else is needed.

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_calculator2_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_calculator2_sessions_updated_at_trigger ON public.calculator2_sessions;
CREATE TRIGGER update_calculator2_sessions_updated_at_trigger
BEFORE UPDATE ON public.calculator2_sessions
FOR EACH ROW
EXECUTE FUNCTION update_calculator2_sessions_updated_at();
