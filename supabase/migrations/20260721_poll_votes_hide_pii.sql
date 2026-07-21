-- 2026-07-21 — poll_votes PII: remove public read of ip_address (bead carnivore-weekly-yaye)
-- Verified: no code reads poll_votes (frontend/workers/api). Voting INSERT + service_role kept.
create or replace view public.poll_results with (security_invoker = on) as
  select poll_id, option_id, count(*) as votes
  from public.poll_votes
  group by poll_id, option_id;

drop policy if exists poll_votes_public_read on public.poll_votes;
