-- Drip "question of the day" — anonymous journey check-ins.
-- Config-driven: questions/options live in data so expanding to more days is inserts, not deploys.
-- Anonymous by design: responses carry fingerprint + IP for dedup ONLY, never identity.

create table if not exists drip_survey_questions (
  id uuid primary key default gen_random_uuid(),
  site text not null default 'cw',
  day integer not null,
  question_key text not null,                    -- 'why_started', 'checkin_energy', ...
  question_text text not null,
  question_type text not null default 'multi',   -- 'multi' (checkbox) | 'single' (radio)
  intro_text text,                               -- "New feature" blurb shown above the question
  archetype text,                                -- motivation|experience|needs|outcome|checkin
  display_order integer not null default 0,      -- grid rows render before the day question
  active boolean not null default true,
  created_at timestamptz default now(),
  unique (site, day, question_key)               -- multiple questions per day (check-in grid)
);
-- Recurring check-in metrics: one row PER (day, key) with identical question_text/options;
-- longitudinal aggregation groups by question_key across days.

create table if not exists drip_survey_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references drip_survey_questions(id) on delete cascade,
  option_text text not null,
  display_order integer not null default 0
);

create table if not exists drip_survey_responses (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references drip_survey_questions(id) on delete cascade,
  option_id  uuid not null references drip_survey_options(id) on delete cascade,
  site text not null default 'cw',
  day integer not null,
  source text not null default 'drip',           -- 'drip' | 'calculator' | 'blog'
  fingerprint text,                              -- dedup only, NOT identity
  ip_address inet,
  submitted_at timestamptz default now()
);
create index if not exists idx_drip_survey_responses_site_day on drip_survey_responses (site, day);
create index if not exists idx_drip_survey_responses_fp_day on drip_survey_responses (fingerprint, day);

create or replace view v_drip_survey_results as
select q.site, q.day, q.question_key, q.question_text, q.question_type, q.display_order as q_order,
       o.id as option_id, o.option_text, o.display_order,
       count(r.id) as votes
from drip_survey_questions q
join drip_survey_options o on o.question_id = q.id
left join drip_survey_responses r on r.option_id = o.id
group by q.site, q.day, q.question_key, q.question_text, q.question_type, q.display_order,
         o.id, o.option_text, o.display_order;
-- Longitudinal curves: aggregate this view by (question_key, day) across days.

-- Lock the anonymous tables down: service-role only (the Worker), no anon/authenticated access.
alter table drip_survey_questions enable row level security;
alter table drip_survey_options enable row level security;
alter table drip_survey_responses enable row level security;
