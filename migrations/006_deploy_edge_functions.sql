-- Migration 006: Deploy Edge Functions and Automation
-- Date: 2025-12-31
-- Purpose: Set up refresh_bento_grid Edge Function and cron scheduler
-- Status: Partially automated

-- ===== STEP 1: Deploy Edge Functions (manual via Supabase CLI) =====
-- supabase functions deploy refresh_bento_grid
-- supabase functions deploy get_personalized_grid
-- Result: Functions available at /functions/v1/[function_name]

-- ===== STEP 2: Create cron job to refresh grid hourly =====
-- Requires pg_cron extension (available in Supabase)

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule hourly refresh
SELECT cron.schedule('refresh_homepage_grid', '0 * * * *',
  'REFRESH MATERIALIZED VIEW CONCURRENTLY homepage_grid'
);

-- Schedule edge function call (requires pg_http extension)
CREATE EXTENSION IF NOT EXISTS http;

-- Note: This requires manual webhook configuration
-- Alternative: Use Supabase scheduled functions (GUI setup)

-- ===== STEP 3: Verify deployment =====
-- Test GET /functions/v1/refresh_bento_grid
-- Expected: HTTP 200 with JSON result
--
-- Test GET /functions/v1/get_personalized_grid?user_id=[UUID]
-- Expected: HTTP 200 with grid_items array

-- End Migration 006
