-- 20260909_cw_assessment_data_corrections.sql
--
-- An append-only audit trail for operator corrections to a paid customer's stored
-- questionnaire.
--
-- WHY: on 2026-09-08 a customer's self-contradictory goal (goal 'gain' with
-- 'weightloss' among her motivations) was corrected by hand-editing the RENDERED
-- report. The database still said 'gain'. The artifact and the canonical row had
-- diverged, so the next regeneration from stored inputs would have reproduced the
-- original broken report, and nothing recorded what she had originally submitted or
-- why anyone had changed it.
--
-- The column lives OUTSIDE form_data deliberately: buildReportData()
-- (api/calculator-api.js) does {...session, ...form}, so every form_data key reaches
-- the report data object, and calculateMacros() is handed session.form_data raw.
--
-- Applied to production 2026-09-09 via the Supabase MCP. Recorded here so the schema
-- has one history.

ALTER TABLE public.cw_assessment_sessions
  ADD COLUMN IF NOT EXISTS data_corrections jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.cw_assessment_sessions'::regclass
       AND conname  = 'cw_assessment_sessions_data_corrections_is_array'
  ) THEN
    ALTER TABLE public.cw_assessment_sessions
      ADD CONSTRAINT cw_assessment_sessions_data_corrections_is_array
      CHECK (data_corrections IS NULL OR jsonb_typeof(data_corrections) = 'array')
      NOT VALID;
  END IF;
END
$$;

-- Separate statement: VALIDATE takes only SHARE UPDATE EXCLUSIVE and blocks neither
-- reads nor writes, keeping the ADD COLUMN window catalog-only.
ALTER TABLE public.cw_assessment_sessions
  VALIDATE CONSTRAINT cw_assessment_sessions_data_corrections_is_array;

-- Only the array-ness is constrained. Per-key CHECKs are deliberately avoided: see
-- 20260830_fix_deficit_check_sources_no_reactivate.sql for what happens when an
-- over-tight CHECK rejects a legal value. An audit trail that refuses to record a
-- correction because a new key appeared is worse than useless.
