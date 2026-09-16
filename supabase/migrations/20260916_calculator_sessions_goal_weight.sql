-- Record the optional goal weight the free calculator has asked for since 2026-09-06
-- (commit 39545312). Until now it drove the on-screen protein target and was then
-- discarded: the step-2 save never sent it and this table had nowhere to put it.
-- The paid path already keeps it in cw_assessment_sessions.form_data.
--
-- Pounds, matching the calculator's internal goalWeight (metric entries are converted
-- client-side). Nullable: the field is optional. The worker sends NULL for anything
-- outside the range below rather than failing the step save, so this constraint is a
-- backstop, not the validation.
--
-- Why it matters beyond completeness (Brew, 2026-09-16): a goal weight that contradicts
-- the chosen goal (goal=gain with a lower goal weight, goal=lose with a higher one) is
-- the clearest signal that a reader picked the wrong goal. See bead carnivore-weekly-4sk8.
alter table calculator_sessions_v2
  add column if not exists goal_weight_lb numeric(6,1)
  check (goal_weight_lb is null or (goal_weight_lb >= 50 and goal_weight_lb <= 1000));

comment on column calculator_sessions_v2.goal_weight_lb is
  'Optional goal weight in lbs from calculator step 2 (asked since 2026-09-06, recorded since 2026-09-16). Compare with weight_value and goal to spot a mis-picked goal.';
