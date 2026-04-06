-- Migration: Tighten calculator2_sessions RLS
-- Date: 2026-04-05
-- Reason: Public UPDATE policy used USING (true) WITH CHECK (true), allowing any
-- anonymous caller to update any session via the Supabase REST API.
-- All production updates go through the Cloudflare Worker (service_role), which
-- bypasses RLS. The public UPDATE policy is not needed and is removed.

DROP POLICY IF EXISTS rls_public_update_calculator2_sessions ON public.calculator2_sessions;

-- Also remove the duplicate SELECT policy left over from migration 014
DROP POLICY IF EXISTS select_calculator2_sessions ON public.calculator2_sessions;
