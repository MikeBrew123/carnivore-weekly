-- 2026-07-21 — Lock down SECURITY DEFINER function EXECUTE grants (bead carnivore-weekly-urij)
-- Each caller verified in code before revoking. See docs/archive/reports-archive/2026-07-21-supabase-health-review.md.

-- Server-side only (callers use service_role: checkout route, eligibility.ts, ketodial/worker, calculator-api)
revoke execute on function public.check_founding_cap(integer) from public, anon, authenticated;
revoke execute on function public.consume_bonus_credit(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_credit_balance(uuid) from public, anon, authenticated;
revoke execute on function public.upsert_newsletter_subscriber(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.check_founding_cap(integer) to service_role;
grant execute on function public.consume_bonus_credit(uuid) to service_role;
grant execute on function public.refresh_credit_balance(uuid) to service_role;
grant execute on function public.upsert_newsletter_subscriber(text, text, text, text, text, text) to service_role;

-- Trigger function: needs no client EXECUTE grant.
revoke execute on function public.enforce_member_message_defaults() from public, anon, authenticated;

-- Member self-service: logged-in members only (not anon).
revoke execute on function public.update_member_profile(text, numeric, numeric, text, text, text) from public, anon;
grant execute on function public.update_member_profile(text, numeric, numeric, text, text, text) to authenticated, service_role;

-- INTENTIONALLY NOT TOUCHED:
--   is_coach_admin(), is_coach_owner() — used in 12 RLS policies; revoking breaks coach-admin access.
--   sps_* (sps_archive_*, sps_board_*, sps_scan_allow) — belong to another project not in this repo
--     (same "stray project on shared free plan" situation as Firebox). Left for a separate review.
