-- coach_stripe_events.processed_at, added 2026-08-27.
--
-- The webhook writes its ledger row before processing so a replay cannot create
-- a member twice. The side effect was that a single transient failure closed the
-- event forever: Stripe retried, the retry found the row the failed attempt had
-- written, and returned success without ever creating the member. Money taken,
-- nothing delivered, one console.error on a Vercel plan that keeps no logs.
--
-- With this column, "seen" and "finished" are separate facts. The handler skips
-- only rows where processed_at is not null, and stamps it after the switch
-- completes.
--
-- The backfill stamps every existing row so nothing already handled is reopened
-- for reprocessing. now() rather than created_at, because this table was created
-- outside the schema files and its columns are not guaranteed here.

alter table coach_stripe_events
  add column if not exists processed_at timestamptz;

update coach_stripe_events
  set processed_at = now()
  where processed_at is null;
