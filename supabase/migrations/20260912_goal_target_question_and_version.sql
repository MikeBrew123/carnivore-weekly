-- Item 3A: the day-5 goal-magnitude interaction, plus question versioning.
--
-- VERSIONING. Wording changes previously forced a NEW question_key, which broke every
-- longitudinal series built on the old one. A version column lets the words change
-- while the key, and therefore the series, survives. Default 1 = everything that
-- exists today. The unique key widens to include it so a v2 can coexist with its v1
-- history.
alter table drip_survey_questions add column if not exists version integer not null default 1;

alter table drip_survey_questions drop constraint if exists drip_survey_questions_site_day_question_key_key;
create unique index if not exists idx_drip_survey_questions_site_day_key_version
  on drip_survey_questions (site, day, question_key, version);

comment on column drip_survey_questions.version is
  'Bump when the WORDING changes; keep question_key stable so the longitudinal series survives. Frozen check-in keys stay at version 1.';

-- The goal-magnitude question. Day 5, both sites, SEEDED INACTIVE.
--
-- Inactive on purpose: activating it would immediately add a fifth question to the
-- live day-5 check-in page, showing placeholder wording to real readers. Activation is
-- the go-live gate for item 3A and belongs with the writers' copy, not with this code.
--
-- Banded one-tap only: no free-form numeric field, because the answer has to be
-- reachable from an email link in one tap. Bands are in POUNDS; all 413 calculator
-- sessions to date use lbs.
--
-- We deliberately do NOT ask for a target DATE. The horizon is the thing we can
-- compute from data we already hold, so asking the reader to guess it would be asking
-- them to do our job and then be corrected.
insert into drip_survey_questions
  (site, day, question_key, question_text, question_type, archetype, display_order, active, version)
select s.site, 5, 'goal_target',
       '[PLACEHOLDER - writers] How much are you hoping to lose?',
       'single', 'personalization', 0, false, 1
from (values ('cw'), ('kd')) as s(site)
where not exists (
  select 1 from drip_survey_questions q
  where q.site = s.site and q.day = 5 and q.question_key = 'goal_target' and q.version = 1
);

-- Option rows. display_order is the contract: it is how an option id resolves to a
-- GOAL_MAGNITUDE_BANDS entry in api/calculator-api.js. Keep the two in step. Labels
-- may be restyled by the writers; the BAND BOUNDARIES may not move without changing
-- the code and re-running tests/goal-horizon-payback.test.mjs.
insert into drip_survey_options (question_id, option_text, display_order)
select q.id, o.label, o.ord
from drip_survey_questions q
cross join (values
  ('Up to 15 lb', 1),
  ('15 to 30 lb', 2),
  ('30 to 50 lb', 3),
  ('50 to 80 lb', 4),
  ('More than 80 lb', 5)
) as o(label, ord)
where q.question_key = 'goal_target' and q.version = 1
  and not exists (select 1 from drip_survey_options x where x.question_id = q.id);
