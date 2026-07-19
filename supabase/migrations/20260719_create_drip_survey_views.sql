-- First-party page-view pings for the check-in funnel: clicked (drip_events) → viewed (here) → submitted (drip_survey_responses)
create table if not exists drip_survey_views (
  id uuid primary key default gen_random_uuid(),
  site text not null default 'cw',
  day integer not null,
  source text not null default 'drip',
  fingerprint text,
  created_at timestamptz default now()
);
create index if not exists idx_drip_survey_views_site_day on drip_survey_views (site, day);
alter table drip_survey_views enable row level security;
