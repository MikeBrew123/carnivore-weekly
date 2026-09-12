-- Freeze the v1 (current) drip analytics baseline before any copy, subject, cadence or
-- schema change. Brew, 2026-09-12: Operating Rule 7 now means UNIQUE-RECIPIENT click rate;
-- the old >=25% threshold is retired because it was computed from raw click events.
--
-- WHY A PHYSICAL TABLE AND NOT A VIEW. Per-day attribution is derived by joining engagement
-- events to the `sent` row on `resend_id` and reading the `drip_day` tag off that sent row.
-- That join is durable, but a VIEW would silently change meaning the moment subjects, tags or
-- the sequence change -- which is exactly what v2 is about to do. This is computed once and
-- never recomputed. The INSERT is guarded so re-running the migration cannot double-write.
--
-- SUBJECT TEXT IS NOT A JOIN KEY. `subject_at_snapshot` is recorded for human reference only.

create table if not exists drip_baseline_v1 (
  id                     uuid primary key default gen_random_uuid(),
  snapshot_at            timestamptz not null default now(),
  sequence_version       text        not null default 'v1',
  site                   text        not null,
  drip_day               integer     not null,
  email_id               text        not null,   -- stable slot id, e.g. 'cw-d07'
  subject_at_snapshot    text,                   -- reference only, never a join key
  distinct_subjects_seen integer,                -- >1 means the subject changed mid-flight
  window_start           date,
  window_end             date,

  -- UNIQUE-RECIPIENT counts (the canonical KPI basis)
  sent_unique            integer not null default 0,
  delivered_unique       integer not null default 0,
  opened_unique          integer not null default 0,
  clicked_unique         integer not null default 0,
  bounced_unique         integer not null default 0,
  replied_unique         integer,                -- NULL: not attributable, see notes

  -- RAW EVENT totals, retained for debugging and for reconciling older reports
  delivered_events_raw   integer not null default 0,
  opened_events_raw      integer not null default 0,
  clicked_events_raw     integer not null default 0,

  -- Rates, computed at snapshot time on delivered_unique
  unique_open_rate       numeric(6,4),
  unique_click_rate      numeric(6,4),
  unique_ctor            numeric(6,4),
  raw_click_rate         numeric(6,4),           -- the old, inflated basis, kept for contrast

  -- Proxies and attributions, each documented in `notes`
  unsubscribed_on_day    integer not null default 0,
  purchases_last_touch   integer not null default 0,
  purchase_cents_last_touch integer not null default 0,

  -- The metric Operating Rule 7 actually governed: the check-in CTA specifically,
  -- not overall email click. Derived from clicked events whose metadata names journey-checkin.
  checkin_clicked_unique integer default 0,
  checkin_click_rate     numeric(6,4),

  notes                  text,
  unique (sequence_version, site, drip_day)
);

comment on table drip_baseline_v1 is
  'Frozen v1 drip performance snapshot, 2026-09-12. Computed once from the resend_id join; never recomputed. Canonical KPI is unique-recipient rate on delivered_unique. Metric definitions and limitations: docs/archive/reports-archive/2026-09-12-drip-v1-baseline.md.';

alter table drip_baseline_v1 enable row level security;

-- Companion: interaction volume at the same instant, so question-level v1 vs v2 is possible.
create table if not exists drip_baseline_v1_questions (
  id                  uuid primary key default gen_random_uuid(),
  snapshot_at         timestamptz not null default now(),
  sequence_version    text not null default 'v1',
  site                text not null,
  drip_day            integer not null,
  question_key        text not null,
  question_type       text,
  archetype           text,
  options_count       integer not null default 0,
  responses_total     integer not null default 0,
  respondents_unique  integer not null default 0,  -- distinct fingerprints
  page_views_unique   integer not null default 0,
  unique (sequence_version, site, drip_day, question_key)
);

comment on table drip_baseline_v1_questions is
  'Frozen v1 check-in interaction volume, 2026-09-12. Respondents are distinct localStorage fingerprints (browser-scoped, not people). The 103 historical responses are anonymous and are never backfilled.';

alter table drip_baseline_v1_questions enable row level security;
