-- Sixth goal_target option: "I don't have a specific number yet".
--
-- WHY. Sarah raised it while drafting day 5, and she is right: without a truthful way
-- to say "no number", a reader with no target either taps a band that is not true --
-- which corrupts the ONLY field this question exists to collect -- or does not tap at
-- all. Both are worse than an extra button. The locked architecture (decision 2) had
-- called for it; the first implementation shipped five bands and missed it.
--
-- It is NOT an error and NOT a magnitude. display_order 6 maps to a non-numeric band in
-- GOAL_MAGNITUDE_BANDS, and computeGoalHorizon returns estimate_available:false with
-- suppression_reason 'no_specific_goal' BEFORE any calculator lookup: there is nothing
-- to compute from, so reading that reader's profile would be a pointless look at
-- personal data.
--
-- The five numeric boundaries are unchanged. They remain a data contract shared between
-- this table and the code, and tests/day5-readiness.test.mjs pins both halves.
--
-- Seeded on the existing INACTIVE goal_target question. Nothing goes live here.

insert into drip_survey_options (question_id, option_text, display_order)
select q.id, 'I don''t have a specific number yet', 6
from drip_survey_questions q
where q.question_key = 'goal_target'
  and q.version = 1
  and not exists (
    select 1 from drip_survey_options o
    where o.question_id = q.id and o.display_order = 6
  );
