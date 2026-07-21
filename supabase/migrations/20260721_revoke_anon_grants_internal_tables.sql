-- 2026-07-21 — Defense-in-depth after Supabase "rls_disabled_in_public" alert (scan dated 2026-07-20).
-- Current state already safe (all public tables have RLS enabled). These 4 internal tables still carried
-- Supabase's default anon/authenticated grants, gated only by RLS. Revoke them so a future RLS slip
-- cannot re-expose them. Verified access is service_role-only:
--   etsy_tokens, stripe_webhook_events -> SUPABASE_SERVICE_ROLE_KEY (api/calculator-api.js)
--   writer_inbox, project_status       -> no client code path
revoke all on table public.etsy_tokens from anon, authenticated;
revoke all on table public.stripe_webhook_events from anon, authenticated;
revoke all on table public.writer_inbox from anon, authenticated;
revoke all on table public.project_status from anon, authenticated;
