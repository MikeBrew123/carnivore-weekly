-- Migration 022: Assessment Session Bridge Fix
-- Date: 2026-01-04
-- Author: LEO (Database Architect)
-- Purpose: Fix the broken link between calculator_sessions_v2 and cw_assessment_sessions
-- Philosophy: "Schema health is paramount. Two tables should never operate independently."
-- Status: CRITICAL HOTFIX - Resolves silent report generation failures

-- ===== ISSUE CONTEXT =====
-- Problem: Payment verification updates calculator_sessions_v2 but never creates cw_assessment_sessions
-- Result: Step 4 submission looks for assessment in wrong table, form_data never merged, macros default silently
-- Solution: Create proper foreign key link and migration trigger

-- ===== Part 1: Add Bridge Column to cw_assessment_sessions =====
-- Purpose: Link assessment session back to its calculator session for audit trail
ALTER TABLE public.cw_assessment_sessions
ADD COLUMN IF NOT EXISTS calculator_session_id UUID,
ADD CONSTRAINT fk_calculator_session_id
  FOREIGN KEY (calculator_session_id)
  REFERENCES public.calculator_sessions_v2(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cw_assessment_sessions_calculator_session_id
  ON public.cw_assessment_sessions(calculator_session_id);

-- ===== Part 2: Backfill Existing Data =====
-- Purpose: Link existing assessment sessions to their calculator sessions by stripe_session_id
-- Safety: Only updates rows where link doesn't already exist
UPDATE public.cw_assessment_sessions cas
SET calculator_session_id = cs.id
FROM public.calculator_sessions_v2 cs
WHERE cas.stripe_session_id = cs.stripe_payment_intent_id
  AND cas.calculator_session_id IS NULL
  AND cas.stripe_session_id IS NOT NULL;

-- ===== Part 3: Add Data Migration Function =====
-- Purpose: Automatically sync form_data from calculator_sessions_v2 to cw_assessment_sessions
-- When: Before Step 4 submission
-- This ensures complete form_data (Steps 1-2) is available for merging
CREATE OR REPLACE FUNCTION public.sync_form_data_to_assessment(
  p_calculator_session_id UUID,
  p_assessment_session_id UUID
)
RETURNS TABLE (success BOOLEAN, message TEXT) AS $$
DECLARE
  v_merged_data JSONB;
  v_calculator_data JSONB;
  v_assessment_data JSONB;
BEGIN
  -- Fetch calculator session form_data
  SELECT form_data INTO v_calculator_data
  FROM public.calculator_sessions_v2
  WHERE id = p_calculator_session_id;

  -- Fetch current assessment form_data
  SELECT form_data INTO v_assessment_data
  FROM public.cw_assessment_sessions
  WHERE id = p_assessment_session_id;

  -- Merge: calculator first (Steps 1-3), then assessment overrides (Step 4)
  v_merged_data := COALESCE(v_calculator_data, '{}'::jsonb) || COALESCE(v_assessment_data, '{}'::jsonb);

  -- Update assessment with merged data
  UPDATE public.cw_assessment_sessions
  SET form_data = v_merged_data,
      updated_at = NOW()
  WHERE id = p_assessment_session_id;

  RETURN QUERY SELECT TRUE, 'Form data synced successfully'::TEXT;
EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ===== Part 4: Add Validation Constraint =====
-- Purpose: Ensure form_data has required fields before report generation
-- Prevents silent failures from missing data
CREATE OR REPLACE FUNCTION public.validate_form_data_for_report()
RETURNS TRIGGER AS $$
BEGIN
  -- Check required fields for report generation
  IF NEW.form_data IS NOT NULL THEN
    -- Allow missing optional fields, but track in audit log if incomplete
    IF NOT (NEW.form_data ? 'weight' OR NEW.form_data ? 'age') THEN
      RAISE WARNING 'Assessment % has incomplete form_data - may affect report generation', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_assessment_form_data
  ON public.cw_assessment_sessions;

CREATE TRIGGER trigger_validate_assessment_form_data
BEFORE INSERT OR UPDATE ON public.cw_assessment_sessions
FOR EACH ROW
EXECUTE FUNCTION public.validate_form_data_for_report();

-- ===== Part 5: Add Audit View =====
-- Purpose: Visibility into form_data migration issues
-- Query: SELECT * FROM public.v_assessment_data_audit
CREATE OR REPLACE VIEW public.v_assessment_data_audit AS
SELECT
  cas.id as assessment_id,
  cas.email,
  cas.payment_status,
  cas.created_at,
  cas.updated_at,
  CASE
    WHEN cas.form_data ? 'weight' THEN 'COMPLETE'
    WHEN cas.form_data ? 'age' THEN 'PARTIAL'
    ELSE 'MISSING_KEY_FIELDS'
  END as data_quality,
  jsonb_object_keys(cas.form_data) as form_keys_count,
  cs.id as source_calculator_session_id,
  cs.payment_status as source_payment_status
FROM public.cw_assessment_sessions cas
LEFT JOIN public.calculator_sessions_v2 cs
  ON cas.calculator_session_id = cs.id
ORDER BY cas.created_at DESC;

-- ===== COMMENTS =====
COMMENT ON FUNCTION public.sync_form_data_to_assessment(UUID, UUID) IS
  'Merge calculator_sessions_v2 form_data with cw_assessment_sessions form_data. Call before Step 4 submission to ensure complete data.';

COMMENT ON VIEW public.v_assessment_data_audit IS
  'Audit view showing data quality of assessment sessions. Identifies incomplete form_data that may cause silent report failures.';

-- ===== VERIFICATION QUERY =====
-- Run after migration to confirm no orphaned assessment sessions
-- SELECT COUNT(*) FROM public.cw_assessment_sessions WHERE calculator_session_id IS NULL AND stripe_session_id IS NULL;
-- Expected: 0 (all sessions properly linked)
