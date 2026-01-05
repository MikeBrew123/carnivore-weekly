-- Migration 025: Add form_data JSONB column to calculator_sessions_v2
-- Date: 2026-01-05
-- Author: LEO (Database Architect)
-- Purpose: Consolidate form submission data for report generation
-- Philosophy: "A single source of truth for form data - immutable and complete."
-- Status: IDEMPOTENT (safe to run multiple times)

-- Add form_data column to store complete submission as JSONB
ALTER TABLE IF EXISTS public.calculator_sessions_v2
ADD COLUMN IF NOT EXISTS form_data JSONB;

-- Add comment explaining the column
COMMENT ON COLUMN public.calculator_sessions_v2.form_data IS
'Complete form submission as JSONB object. Includes all fields from steps 1-4. Used by report generation for personalization.';

-- Create index on form_data for faster queries (if needed)
CREATE INDEX IF NOT EXISTS idx_calculator_sessions_v2_form_data
ON public.calculator_sessions_v2
USING gin (form_data);

-- Verify the migration was successful
SELECT COUNT(*) as total_sessions,
       COUNT(form_data) as sessions_with_form_data
FROM public.calculator_sessions_v2;
