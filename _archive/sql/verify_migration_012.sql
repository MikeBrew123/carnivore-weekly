-- Migration 012 Verification Script
-- Run these queries AFTER executing the migration to verify success
-- Author: LEO Database Architect
-- Date: 2026-01-01

-- ===== SECTION 1: Verify Tables Exist =====
-- Run this to confirm all 3 core tables were created
SELECT
    table_name,
    table_schema,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_sessions', 'generated_reports', 'report_access_log')
ORDER BY table_name;

-- Expected output (3 rows):
-- user_sessions | public | BASE TABLE
-- generated_reports | public | BASE TABLE
-- report_access_log | public | BASE TABLE

-- ===== SECTION 2: Verify Table Columns =====
-- Verify user_sessions columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_sessions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Expected columns:
-- id, BIGINT, NO
-- email, VARCHAR, NO
-- path_choice, VARCHAR, NO
-- macro_data, JSONB, NO
-- payment_status, VARCHAR, YES (default)
-- stripe_payment_id, VARCHAR, YES
-- created_at, TIMESTAMP, NO (default)
-- updated_at, TIMESTAMP, NO (default)

-- ===== SECTION 3: Verify Partitions =====
-- Confirm report_access_log partitions were created
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE tablename LIKE 'report_access_log_%'
AND schemaname = 'public'
ORDER BY tablename;

-- Expected output (3 rows):
-- report_access_log_2026_01
-- report_access_log_2026_02
-- report_access_log_2026_03

-- ===== SECTION 4: Verify Indexes =====
-- List all indexes on report tables
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('user_sessions', 'generated_reports', 'report_access_log')
ORDER BY tablename, indexname;

-- Expected indexes:
-- idx_user_sessions_email ON user_sessions
-- idx_user_sessions_stripe_payment_id ON user_sessions
-- idx_generated_reports_access_token ON generated_reports (UNIQUE)
-- idx_generated_reports_email_expires ON generated_reports
-- idx_generated_reports_expires_at ON generated_reports
-- idx_generated_reports_session_id ON generated_reports
-- idx_report_access_log_report_id_accessed ON report_access_log

-- ===== SECTION 5: Verify Triggers =====
-- List all triggers
SELECT
    trigger_name,
    event_object_table,
    event_manipulation,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('user_sessions', 'report_access_log')
ORDER BY event_object_table, trigger_name;

-- Expected triggers:
-- trg_user_sessions_updated_at ON user_sessions BEFORE UPDATE
-- trg_increment_report_access ON report_access_log AFTER INSERT

-- ===== SECTION 6: Verify Functions =====
-- Check trigger functions exist
SELECT
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('update_user_sessions_updated_at', 'increment_report_access')
ORDER BY routine_name;

-- Expected functions (2):
-- update_user_sessions_updated_at (FUNCTION)
-- increment_report_access (FUNCTION)

-- ===== SECTION 7: Verify RLS Policies =====
-- Check RLS enabled on tables
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('user_sessions', 'generated_reports', 'report_access_log')
AND schemaname = 'public';

-- Expected:
-- All 3 tables should have rowsecurity = true

-- List all RLS policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_sessions', 'generated_reports', 'report_access_log')
ORDER BY tablename, policyname;

-- Expected policies:
-- service_role_user_sessions (PERMISSIVE)
-- service_role_generated_reports (PERMISSIVE)
-- service_role_report_access_log (PERMISSIVE)
-- public_generated_reports_read (PERMISSIVE)
-- auth_user_sessions_read (PERMISSIVE)

-- ===== SECTION 8: Verify Check Constraints =====
-- List all constraints
SELECT
    constraint_name,
    table_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name IN ('user_sessions', 'generated_reports', 'report_access_log')
AND constraint_type = 'CHECK'
ORDER BY table_name, constraint_name;

-- Expected CHECK constraints on user_sessions:
-- email_valid
-- macro_data_valid
-- payment_id_with_completed

-- Expected CHECK constraints on generated_reports:
-- email_valid
-- access_token_valid
-- report_html_not_empty
-- questionnaire_not_empty
-- expiry_in_future
-- last_access_after_creation

-- ===== SECTION 9: Verify Foreign Keys =====
-- Check foreign key relationships
SELECT
    constraint_name,
    table_name,
    column_name,
    foreign_table_name,
    foreign_column_name,
    delete_rule
FROM information_schema.referential_constraints
NATURAL JOIN information_schema.key_column_usage
WHERE table_schema = 'public'
AND table_name IN ('generated_reports', 'report_access_log')
ORDER BY table_name;

-- Expected FKs:
-- generated_reports.session_id → user_sessions.id (CASCADE)
-- report_access_log.report_id → generated_reports.id (CASCADE)

-- ===== SECTION 10: Quick Data Insertion Test =====
-- Try inserting a test session (if tables are empty)
BEGIN;

INSERT INTO user_sessions (email, path_choice, macro_data)
VALUES ('leo@test.example.com', 'carnivore', '{"protein": 150, "fat": 100}'::jsonb);

-- Verify it was inserted
SELECT
    id,
    email,
    path_choice,
    created_at,
    updated_at
FROM user_sessions
WHERE email = 'leo@test.example.com'
ORDER BY created_at DESC
LIMIT 1;

-- Cleanup
DELETE FROM user_sessions WHERE email = 'leo@test.example.com';

ROLLBACK;

-- ===== SECTION 11: Schema Summary =====
-- Get overall schema statistics
SELECT
    schemaname,
    COUNT(*) as total_tables,
    SUM(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;

-- ===== SECTION 12: Migration Status Report =====
-- Run this to generate a comprehensive status report
WITH table_stats AS (
    SELECT
        't1' as category,
        'user_sessions' as name,
        COUNT(*) as row_count,
        pg_size_pretty(pg_relation_size('public.user_sessions')) as table_size
    FROM public.user_sessions
    UNION ALL
    SELECT
        't2',
        'generated_reports',
        COUNT(*),
        pg_size_pretty(pg_relation_size('public.generated_reports'))
    FROM public.generated_reports
    UNION ALL
    SELECT
        't3',
        'report_access_log',
        COUNT(*),
        pg_size_pretty(pg_relation_size('public.report_access_log'))
    FROM public.report_access_log
)
SELECT
    name,
    row_count,
    table_size
FROM table_stats
ORDER BY category;

-- ===== FINAL VERIFICATION =====
-- This query should return 3 rows if migration succeeded
SELECT
    'user_sessions' as object_name,
    'TABLE' as object_type,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT
    'generated_reports',
    'TABLE',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'generated_reports') THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
SELECT
    'report_access_log',
    'TABLE',
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_access_log') THEN 'EXISTS' ELSE 'MISSING' END
ORDER BY object_name;

-- All should show 'EXISTS' for successful migration

-- Report: Migration 012 Verification Complete
-- If all queries return expected results, migration was successful
-- Total checks: 12 verification sections
-- Expected status: All objects created, RLS enabled, triggers active

-- ===== END VERIFICATION SCRIPT =====
