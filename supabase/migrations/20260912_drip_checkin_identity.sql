-- Drip check-in identity join (architecture item 2, Brew 2026-09-12).
--
-- WHAT THIS DOES: lets a check-in answer be associated with the subscriber who
-- was mailed the link, so before/after pairs are possible and calculator context
-- we already hold can be joined server-side.
--
-- WHAT THIS DELIBERATELY DOES NOT DO: the token records an answer. It is NOT a
-- credential and must never gate a READ of anything personal -- no weight, no
-- health condition, no medication, no energy/hunger/mood history, no email
-- address, no trend. A forwarded link must be worthless to whoever receives it.
-- Personalized trends render into the email body at send time instead.
--
-- SEPARATE FROM unsubscribe_token ON PURPOSE: a shared or forwarded check-in
-- link must never be able to unsubscribe somebody.

-- 1. The token. Same generator as the existing unsubscribe_token (migration 010):
--    32 random bytes, hex. Opaque, carries no encoded data, 256 bits of entropy.
alter table drip_subscribers
  add column if not exists checkin_token text default encode(gen_random_bytes(32), 'hex');

-- Backfill every pre-existing row. DEFAULT only applies to new inserts.
update drip_subscribers
   set checkin_token = encode(gen_random_bytes(32), 'hex')
 where checkin_token is null;

alter table drip_subscribers alter column checkin_token set not null;

create unique index if not exists idx_drip_subscribers_checkin_token
  on drip_subscribers (checkin_token);

comment on column drip_subscribers.checkin_token is
  'Opaque per-subscriber correlation key for check-in links. NOT a credential: it may record an answer and must never gate a read of personal or health data. Deliberately separate from unsubscribe_token so a forwarded check-in link cannot unsubscribe anyone.';

-- 2. Subscriber linkage on responses. NULLABLE on purpose: anonymous answers stay
--    supported, and the 103 historical rows are never backfilled or invented into
--    an identity. Longitudinal queries filter `subscriber_id is not null`;
--    volume queries do not.
alter table drip_survey_responses
  add column if not exists subscriber_id uuid references drip_subscribers(id) on delete set null;

alter table drip_survey_responses
  add column if not exists answered_via text;

do $$ begin
  alter table drip_survey_responses
    add constraint drip_survey_responses_answered_via_check
    check (answered_via is null or answered_via in ('one_tap', 'page'));
exception when duplicate_object then null; end $$;

create index if not exists idx_drip_survey_responses_subscriber
  on drip_survey_responses (subscriber_id, day) where subscriber_id is not null;

comment on column drip_survey_responses.subscriber_id is
  'Resolved server-side from checkin_token. NULL for anonymous answers and for every historical row. The token itself is never stored here.';
comment on column drip_survey_responses.answered_via is
  'one_tap (answered from an email link) or page (answered on the check-in page). NULL for historical rows.';

-- 3. Idempotency backstop. The handler already does delete-then-insert per
--    (site, day), so this catches concurrent double-submits and mail-client
--    prefetch races rather than being the primary mechanism. Partial, so the
--    anonymous path and every historical row are unaffected.
create unique index if not exists idx_drip_survey_responses_identified_unique
  on drip_survey_responses (subscriber_id, question_id, option_id)
  where subscriber_id is not null;
