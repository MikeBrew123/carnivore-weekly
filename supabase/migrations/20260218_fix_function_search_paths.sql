-- Migration: Fix mutable search_path warnings on 8 public functions
-- Date: 2026-02-18
-- Author: Leo (Database Architect)
-- Purpose: Add SET search_path = '' to all functions missing it
-- Rationale: Supabase security advisor flags functions without explicit
--   search_path as vulnerable to search_path manipulation attacks.
--   Setting search_path = '' forces fully-qualified table references
--   inside function bodies. For trigger functions that only call NOW()
--   and assign to NEW, this is safe with no behavior change.
-- Status: IDEMPOTENT (CREATE OR REPLACE)

-- ===================================================================
-- 1. public.update_updated_at
--    Source: 20250101120000_create_report_system.sql
--    Used by: user_sessions_updated_at trigger
-- ===================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ===================================================================
-- 2. public.update_calculator2_sessions_last_active
--    Source: 014_create_calculator2_sessions.sql
--    Used by: trg_calculator2_sessions_last_active trigger
-- ===================================================================
CREATE OR REPLACE FUNCTION public.update_calculator2_sessions_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ===================================================================
-- 3. public.trg_calculator_sessions_v2_updated_at
--    Source: 20260103180000_create_calculator_payment_system.sql
--    Used by: trigger_calculator_sessions_v2_updated_at trigger
--    Note: Removing IMMUTABLE (incorrect for a trigger calling NOW())
-- ===================================================================
CREATE OR REPLACE FUNCTION public.trg_calculator_sessions_v2_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ===================================================================
-- 4. public.update_timestamp
--    Source: 20250101140000_create_content_tables.sql
--    Used by: writers_updated_at, blog_posts_updated_at,
--             youtube_videos_updated_at, weekly_analysis_updated_at,
--             wiki_video_links_updated_at, topic_product_mapping_updated_at
-- ===================================================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ===================================================================
-- 5. public.trg_calculator_reports_updated_at
--    Source: 20260103180000_create_calculator_payment_system.sql
--    Used by: trigger_calculator_reports_updated_at trigger
--    Note: Removing IMMUTABLE (incorrect for a trigger calling NOW())
-- ===================================================================
CREATE OR REPLACE FUNCTION public.trg_calculator_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ===================================================================
-- 6. public.trg_increment_report_access_count
--    Source: 20260103180000_create_calculator_payment_system.sql
--    Used by: trigger_increment_report_access_count trigger
--    Note: References public.calculator_reports explicitly
-- ===================================================================
CREATE OR REPLACE FUNCTION public.trg_increment_report_access_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.calculator_reports
    SET
        access_count = access_count + 1,
        last_accessed_at = NEW.accessed_at
    WHERE id = NEW.report_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ===================================================================
-- 7. public.update_writer_timestamp
--    Source: 007_writers_unified_schema.sql
--    Used by: update_writer_timestamp_trigger on writers table
-- ===================================================================
CREATE OR REPLACE FUNCTION public.update_writer_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = '';

-- ===================================================================
-- 8. public.get_related_content
--    Source: Created directly in Supabase (no local migration)
--    Used by: public/js/related-content.js via RPC
--    Note: Wraps v_related_content view with parameters.
--          Must use fully-qualified public.v_related_content since
--          search_path is now empty.
-- ===================================================================
CREATE OR REPLACE FUNCTION public.get_related_content(
    p_content_type TEXT,
    p_content_identifier TEXT,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    source_type TEXT,
    source_identifier TEXT,
    related_type TEXT,
    related_identifier TEXT,
    shared_topic_slug TEXT,
    shared_topic_name TEXT
)
LANGUAGE sql STABLE
SET search_path = ''
AS $$
    SELECT DISTINCT
        v.source_type,
        v.source_identifier,
        v.related_type,
        v.related_identifier,
        v.shared_topic_slug,
        v.shared_topic_name
    FROM public.v_related_content v
    WHERE v.source_type = p_content_type
      AND v.source_identifier = p_content_identifier
    LIMIT p_limit;
$$;

-- ===================================================================
-- VERIFICATION: Run after migration to confirm all 8 have search_path set
-- ===================================================================
-- SELECT p.proname, p.proconfig
-- FROM pg_proc p
-- WHERE p.proname IN (
--     'update_updated_at',
--     'update_calculator2_sessions_last_active',
--     'trg_calculator_sessions_v2_updated_at',
--     'update_timestamp',
--     'trg_calculator_reports_updated_at',
--     'trg_increment_report_access_count',
--     'update_writer_timestamp',
--     'get_related_content'
-- )
-- AND p.pronamespace = 'public'::regnamespace;
-- Expected: proconfig = {search_path=} for all 8 rows

-- ===================================================================
-- MIGRATION COMPLETE
-- Functions patched: 8
-- Breaking changes: None (same bodies, same signatures)
-- Side fix: Removed incorrect IMMUTABLE from 2 trigger functions
-- ===================================================================
