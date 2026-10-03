-- PescoDial styles (Brew, 2026-10-03). Widen the diet_type check only; no data change.
alter table public.calculator_sessions_v2 drop constraint calculator_sessions_v2_diet_type_check;
alter table public.calculator_sessions_v2 add constraint calculator_sessions_v2_diet_type_check
  check ((diet_type is null) or ((diet_type)::text = any ((array[
    'carnivore', 'pescatarian', 'keto', 'lowcarb',
    'pesco-mediterranean', 'pesco-keto', 'pesco-lowcarb', 'pesco-carnivore'
  ])::text[])));
