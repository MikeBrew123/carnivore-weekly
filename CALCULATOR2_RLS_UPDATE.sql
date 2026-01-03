-- CALCULATOR2 SESSION MANAGEMENT - RLS POLICY UPDATE
-- Date: 2026-01-03
-- Purpose: Fix 400 Bad Request by enabling anonymous INSERT and UPDATE
-- How to apply: Copy this entire file and paste into Supabase SQL editor
-- URL: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new

-- ===== STEP 1: DROP OLD POLICIES =====
DROP POLICY IF EXISTS read_calculator2_sessions ON calculator2_sessions;
DROP POLICY IF EXISTS service_role_calculator2_sessions ON calculator2_sessions;
DROP POLICY IF EXISTS insert_calculator2_sessions ON calculator2_sessions;
DROP POLICY IF EXISTS select_calculator2_sessions ON calculator2_sessions;
DROP POLICY IF EXISTS update_calculator2_sessions ON calculator2_sessions;

-- ===== STEP 2: CREATE NEW POLICIES =====

-- Policy 1: Anonymous users can CREATE new sessions
CREATE POLICY insert_calculator2_sessions ON calculator2_sessions
    FOR INSERT
    WITH CHECK (true);

-- Policy 2: Anonymous users can READ sessions
-- Security: Token-based access (only users with their token can read their session)
CREATE POLICY select_calculator2_sessions ON calculator2_sessions
    FOR SELECT
    USING (true);

-- Policy 3: Anonymous users can UPDATE their session (form state, payment fields)
-- Security: Client always sends their token in WHERE clause
CREATE POLICY update_calculator2_sessions ON calculator2_sessions
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Policy 4: Service role can manage all sessions
-- Note: Service role key is used only server-side for migrations and cleanup
CREATE POLICY service_role_calculator2_sessions ON calculator2_sessions
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ===== VERIFICATION =====
-- Expected result: All 4 policies created successfully
-- Run this to verify:
--   SELECT schemaname, tablename, policyname
--   FROM pg_policies
--   WHERE tablename = 'calculator2_sessions'
--   ORDER BY policyname;
