-- 2026-07-21 — Supabase health review: security fixes
-- Applied via MCP against project kwtdpvnjewtahuxjyltn. This file mirrors the remote for repo/DB parity.
-- Context: quarterly DB review (docs/archive/reports-archive/2026-07-21-supabase-health-review.md).

-- 1. SECURITY DEFINER views were readable by anon (bypassed RLS). Switch to security_invoker
--    so they enforce the caller's RLS. service_role (dashboards) unaffected; anon now sees 0 rows.
alter view public.funnel_by_diet set (security_invoker = on);
alter view public.v_drip_survey_results set (security_invoker = on);

-- 2. Dead v2-report scaffold (empty tables) had public/anon SELECT+INSERT policies open on
--    email/report_html/access_token/report_token. Strip to service_role-only (the existing
--    service_role_all policy remains the sole access path).
drop policy if exists public_read_reports on public.generated_reports;
drop policy if exists rls_public_select_calculator2_sessions on public.calculator2_sessions;
drop policy if exists rls_public_insert_calculator2_sessions on public.calculator2_sessions;

-- 3. Drop stray Firebox tables (0 rows, another project's, no FK deps).
drop table if exists public.firebox_saved_audio;
drop table if exists public.firebox_save_flags;
