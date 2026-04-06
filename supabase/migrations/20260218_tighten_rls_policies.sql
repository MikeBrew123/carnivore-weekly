-- ============================================================================
-- Migration: 20260218_tighten_rls_policies.sql
-- Date: 2026-02-18
-- Author: Leo (Database Architect)
-- Purpose: Tighten overly-permissive RLS policies and deduplicate redundant ones
--
-- PROBLEM 1: Seven content tables have ALL-operation policies with USING(true)
-- and WITH CHECK(true) that apply to ALL roles including anon. This means
-- anonymous users can INSERT, UPDATE, and DELETE rows. These must be
-- restricted to service_role only for write operations.
--
-- PROBLEM 2: Six engagement tables have duplicate INSERT/UPDATE policies
-- created by both the original migration (009) and the comprehensive
-- RLS migration (20260211). The rls_public_* duplicates should be dropped.
--
-- Safety: Uses DROP POLICY IF EXISTS to avoid errors on missing policies.
-- All changes wrapped in a transaction for atomicity.
--
-- "ACID properties don't negotiate."
-- ============================================================================

BEGIN;

-- ============================================================================
-- PART 1: TIGHTEN OVERLY-PERMISSIVE ALL POLICIES ON CONTENT TABLES
--
-- These 7 tables have policies granting ALL operations to every role.
-- Fix: Drop the permissive ALL policy, create service_role-only ALL policy,
-- and ensure a public SELECT policy exists.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. blog_posts
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "blog_posts_service_role_all" ON public.blog_posts;
CREATE POLICY "service_role_all" ON public.blog_posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Public SELECT already exists: rls_public_read_blog_posts (from 20260211)

-- --------------------------------------------------------------------------
-- 2. generated_reports
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "service_role_all" ON public.generated_reports;
CREATE POLICY "service_role_all" ON public.generated_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- No public SELECT needed (PII: emails, health reports — service_role only)

-- --------------------------------------------------------------------------
-- 3. topic_product_mapping
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "topic_product_service_role_all" ON public.topic_product_mapping;
CREATE POLICY "service_role_all" ON public.topic_product_mapping
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Public SELECT already exists: rls_public_read_topic_product_mapping (from 20260211)

-- --------------------------------------------------------------------------
-- 4. user_sessions
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "service_role_all" ON public.user_sessions;
CREATE POLICY "service_role_all" ON public.user_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- No public SELECT needed (PII: emails, payment data — service_role only)

-- --------------------------------------------------------------------------
-- 5. weekly_analysis
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "weekly_analysis_service_role_all" ON public.weekly_analysis;
CREATE POLICY "service_role_all" ON public.weekly_analysis
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Public SELECT already exists: rls_public_read_weekly_analysis (from 20260211)

-- --------------------------------------------------------------------------
-- 6. wiki_video_links
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "wiki_video_links_service_role_all" ON public.wiki_video_links;
CREATE POLICY "service_role_all" ON public.wiki_video_links
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Public SELECT already exists: rls_public_read_wiki_video_links (from 20260211)

-- --------------------------------------------------------------------------
-- 7. youtube_videos
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "youtube_videos_service_role_all" ON public.youtube_videos;
CREATE POLICY "service_role_all" ON public.youtube_videos
  FOR ALL TO service_role USING (true) WITH CHECK (true);
-- Public SELECT already exists: rls_public_read_youtube_videos (from 20260211)


-- ============================================================================
-- PART 2: DEDUPLICATE REDUNDANT POLICIES ON ENGAGEMENT TABLES
--
-- The 20260211 migration created rls_public_* policies alongside existing
-- descriptively-named policies from the original engagement migration (009).
-- Drop the rls_public_* duplicates, keep the originals.
-- ============================================================================

-- --------------------------------------------------------------------------
-- calculator2_sessions
-- Has: calculator2_sessions_anon_access (ALL) — too broad, drop it
-- Has: insert_calculator2_sessions + rls_public_insert_calculator2_sessions (dupes)
-- Has: update_calculator2_sessions + rls_public_update_calculator2_sessions (dupes)
-- Keep: rls_public_insert/select/update (from 20260211, cleaner naming)
-- Drop: calculator2_sessions_anon_access (ALL), insert_calculator2_sessions,
--        update_calculator2_sessions
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "calculator2_sessions_anon_access" ON public.calculator2_sessions;
DROP POLICY IF EXISTS "insert_calculator2_sessions" ON public.calculator2_sessions;
DROP POLICY IF EXISTS "update_calculator2_sessions" ON public.calculator2_sessions;
-- Remaining: rls_public_insert_calculator2_sessions (INSERT)
--            rls_public_select_calculator2_sessions (SELECT)
--            rls_public_update_calculator2_sessions (UPDATE)

-- --------------------------------------------------------------------------
-- content_feedback
-- Has: feedback_public_insert + rls_public_insert_content_feedback (dupes)
-- Keep: feedback_public_insert (more descriptive)
-- Drop: rls_public_insert_content_feedback
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_public_insert_content_feedback" ON public.content_feedback;

-- --------------------------------------------------------------------------
-- newsletter_subscribers
-- Has: newsletter_public_insert + rls_public_insert_newsletter_subscribers (dupes)
-- Keep: newsletter_public_insert (more descriptive)
-- Drop: rls_public_insert_newsletter_subscribers
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_public_insert_newsletter_subscribers" ON public.newsletter_subscribers;

-- --------------------------------------------------------------------------
-- poll_votes
-- Has: poll_votes_public_insert + rls_public_insert_poll_votes (dupes)
-- Keep: poll_votes_public_insert (more descriptive)
-- Drop: rls_public_insert_poll_votes
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_public_insert_poll_votes" ON public.poll_votes;

-- --------------------------------------------------------------------------
-- post_reactions
-- Has: reactions_public_insert + rls_public_insert_post_reactions (dupes)
-- Keep: reactions_public_insert (more descriptive)
-- Drop: rls_public_insert_post_reactions
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_public_insert_post_reactions" ON public.post_reactions;

-- --------------------------------------------------------------------------
-- report_access_log
-- Has: public_insert_access_log + rls_public_insert_report_access_log + service_role_all
-- Keep: public_insert_access_log (descriptive) + service_role_all
-- Drop: rls_public_insert_report_access_log
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "rls_public_insert_report_access_log" ON public.report_access_log;


-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- PART 1: Tightened 7 content tables
--   - blog_posts: ALL→service_role only (public SELECT preserved)
--   - generated_reports: ALL→service_role only (no public read — PII)
--   - topic_product_mapping: ALL→service_role only (public SELECT preserved)
--   - user_sessions: ALL→service_role only (no public read — PII)
--   - weekly_analysis: ALL→service_role only (public SELECT preserved)
--   - wiki_video_links: ALL→service_role only (public SELECT preserved)
--   - youtube_videos: ALL→service_role only (public SELECT preserved)
--
-- PART 2: Deduplicated 6 engagement tables
--   - calculator2_sessions: dropped ALL policy + old INSERT/UPDATE dupes
--   - content_feedback: dropped rls_public_insert duplicate
--   - newsletter_subscribers: dropped rls_public_insert duplicate
--   - poll_votes: dropped rls_public_insert duplicate
--   - post_reactions: dropped rls_public_insert duplicate
--   - report_access_log: dropped rls_public_insert duplicate
--
-- Net effect: 13 policies dropped, 7 service_role policies created
-- Anonymous write access to content tables: ELIMINATED
-- "Slow is smooth, and smooth is fast. Your data is sacred."
-- ============================================================================

COMMIT;
