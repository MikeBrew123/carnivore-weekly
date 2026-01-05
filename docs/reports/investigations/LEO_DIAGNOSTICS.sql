-- LEO's Form Data Diagnostic Queries
-- Purpose: Verify schema and data state
-- Author: LEO (Database Architect)
-- Status: Ready to execute

-- =============================================================================
-- PART 1: VERIFY SCHEMA EXISTS
-- =============================================================================

-- Check if form_data column exists on calculator_sessions_v2
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'calculator_sessions_v2'
  AND column_name = 'form_data'
ORDER BY column_name;

-- Result: If empty → Migration 025 not deployed yet


-- =============================================================================
-- PART 2: CHECK TABLE CONTENTS
-- =============================================================================

-- Count sessions in calculator_sessions_v2
SELECT
  COUNT(*) as total_sessions,
  COUNT(form_data) as sessions_with_form_data,
  COUNT(*) FILTER (WHERE step_completed = 4) as step4_complete,
  COUNT(*) FILTER (WHERE is_premium = true) as premium_sessions
FROM public.calculator_sessions_v2;


-- Count sessions in cw_assessment_sessions (the other table)
SELECT
  COUNT(*) as total_sessions,
  COUNT(form_data) as sessions_with_form_data,
  COUNT(*) FILTER (WHERE payment_status = 'completed') as completed_payments
FROM public.cw_assessment_sessions;


-- =============================================================================
-- PART 3: INSPECT SPECIFIC SESSION
-- =============================================================================

-- Check the target session (286ec3ee-4d30-4b29-84bb-81bcd61e9fbd)
-- FROM cw_assessment_sessions
SELECT
  id,
  email,
  first_name,
  form_data,
  payment_status,
  created_at,
  updated_at
FROM public.cw_assessment_sessions
WHERE id = '286ec3ee-4d30-4b29-84bb-81bcd61e9fbd';

-- Expected: form_data should have all fields


-- =============================================================================
-- PART 4: VERIFY FIELD PRESENCE IN form_data
-- =============================================================================

-- Check if form_data has required fields for report generation
SELECT
  id,
  form_data ->> 'weight' as weight,
  form_data ->> 'heightFeet' as height_feet,
  form_data ->> 'heightInches' as height_inches,
  form_data ->> 'age' as age,
  form_data ->> 'sex' as sex,
  form_data ->> 'goal' as goal,
  form_data ->> 'diet' as diet,
  form_data ->> 'exercise' as exercise,
  form_data ->> 'lifestyle' as lifestyle,
  (form_data ->> 'calculatedMacros')::jsonb as calculated_macros
FROM public.cw_assessment_sessions
WHERE form_data IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Expected: All fields populated (not null)


-- =============================================================================
-- PART 5: DATA TYPE VALIDATION
-- =============================================================================

-- Ensure form_data is stored as object (not string)
SELECT
  id,
  jsonb_typeof(form_data) as data_type,
  octet_length(form_data::text) as size_bytes,
  jsonb_object_keys(form_data)::text[] as top_level_keys
FROM public.cw_assessment_sessions
WHERE form_data IS NOT NULL
LIMIT 1;

-- Expected: data_type = 'object', size_bytes > 100


-- =============================================================================
-- PART 6: PAYMENT STATUS CHECK
-- =============================================================================

-- Verify payment status is tracked correctly
SELECT
  payment_status,
  COUNT(*) as session_count,
  COUNT(form_data) as with_form_data,
  MIN(created_at) as earliest,
  MAX(created_at) as latest
FROM public.cw_assessment_sessions
GROUP BY payment_status
ORDER BY COUNT(*) DESC;

-- Expected: 'completed' status has data


-- =============================================================================
-- PART 7: STEP COMPLETION TRACKING
-- =============================================================================

-- Track step completion for calculator_sessions_v2
SELECT
  step_completed,
  COUNT(*) as session_count,
  COUNT(form_data) as with_form_data,
  COUNT(email) as with_email,
  COUNT(calculated_macros) as with_macros
FROM public.calculator_sessions_v2
GROUP BY step_completed
ORDER BY step_completed;

-- Expected: Empty until Migration 025 + API update deployed


-- =============================================================================
-- PART 8: MIGRATION 025 VALIDATION (After Deployment)
-- =============================================================================

-- Verify form_data column was created
SELECT
  table_name,
  column_name,
  data_type,
  column_default,
  is_nullable,
  table_schema
FROM information_schema.columns
WHERE table_name = 'calculator_sessions_v2'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected: form_data column present with data_type = 'jsonb'


-- =============================================================================
-- PART 9: INDEX VERIFICATION (After Migration)
-- =============================================================================

-- Check GIN index on form_data
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'calculator_sessions_v2'
  AND indexname LIKE '%form_data%';

-- Expected: One GIN index on form_data


-- =============================================================================
-- PART 10: PERFORMANCE TEST (After API Update)
-- =============================================================================

-- Query performance on form_data fields (after index created)
EXPLAIN ANALYZE
SELECT id, form_data ->> 'weight' as weight, form_data ->> 'age' as age
FROM public.calculator_sessions_v2
WHERE form_data ->> 'age' = '30'
LIMIT 10;

-- Expected: Uses GIN index (Index Scan), < 10ms


-- =============================================================================
-- PART 11: DATA COMPLETENESS AUDIT
-- =============================================================================

-- Audit form_data completeness for Step 4 sessions
SELECT
  id,
  session_token,
  step_completed,
  CASE
    WHEN form_data IS NULL THEN 'MISSING'
    WHEN form_data ->> 'weight' IS NULL THEN 'MISSING_WEIGHT'
    WHEN form_data ->> 'age' IS NULL THEN 'MISSING_AGE'
    WHEN form_data ->> 'calculatedMacros' IS NULL THEN 'MISSING_MACROS'
    ELSE 'COMPLETE'
  END as form_data_status,
  jsonb_object_keys(form_data)::text[] as present_fields
FROM public.calculator_sessions_v2
WHERE step_completed = 4
ORDER BY created_at DESC;

-- Expected: All COMPLETE after fix


-- =============================================================================
-- PART 12: CLEANUP QUERIES (Use with caution)
-- =============================================================================

-- List all sessions (useful for debugging)
SELECT
  id,
  session_token,
  email,
  step_completed,
  is_premium,
  payment_status,
  created_at
FROM public.calculator_sessions_v2
ORDER BY created_at DESC
LIMIT 20;

-- List all assessment sessions
SELECT
  id,
  email,
  first_name,
  payment_status,
  created_at
FROM public.cw_assessment_sessions
ORDER BY created_at DESC
LIMIT 20;

-- =============================================================================
-- PART 13: TRIGGER VERIFICATION (For updated_at auto-update)
-- =============================================================================

-- Check if trigger exists for automatic timestamp updates
SELECT
  event_object_schema,
  event_object_table,
  trigger_name,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table = 'calculator_sessions_v2';

-- Expected: One trigger for updated_at on UPDATE

-- =============================================================================
-- Notes for LEO
-- =============================================================================

/*
  CRITICAL CHECKS AFTER DEPLOYMENT:

  1. Migration 025 deployed:
     SELECT column_name FROM information_schema.columns
     WHERE table_name = 'calculator_sessions_v2' AND column_name = 'form_data';
     → Should return 1 row

  2. API saving form_data:
     New submission → SELECT form_data FROM calculator_sessions_v2 WHERE step_completed = 4;
     → form_data should contain all fields

  3. Report generation working:
     POST /api/v1/calculator/report/generate
     → Should personalize with form_data fields, not use defaults

  4. No NULL values in critical fields:
     SELECT * FROM calculator_sessions_v2 WHERE step_completed = 4 AND form_data IS NULL;
     → Should return 0 rows

  Philosophy: "A database is a promise you make to the future. Don't break it."
  Status: All queries designed for data integrity verification.
*/
