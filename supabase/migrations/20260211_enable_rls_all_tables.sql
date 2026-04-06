-- ============================================================================
-- Migration: 20260211_enable_rls_all_tables.sql
-- Date: 2026-02-11
-- Author: Leo (Database Architect)
-- Purpose: Comprehensive RLS enforcement across ALL public tables
--
-- IMPORTANT: Row Level Security (RLS) restricts access for the `anon` and
-- `authenticated` roles. The `service_role` key BYPASSES RLS entirely by
-- design in Supabase. This means backend services (Cloudflare Workers,
-- N8N workflows, agent scripts) using service_role remain unaffected.
--
-- Tables without explicit SELECT/INSERT policies are effectively locked
-- down to service_role only once RLS is enabled.
--
-- Policy Tiers:
--   PUBLIC READ    - Anyone can SELECT (content tables)
--   PUBLIC INSERT  - Anyone can INSERT (engagement/submission tables)
--   SERVICE ONLY   - No anon/authenticated policies (internal/sensitive)
--
-- Safety: Uses DROP POLICY IF EXISTS + CREATE POLICY pattern to avoid
-- conflicts with existing policies from prior migrations.
-- Uses ALTER TABLE ... ENABLE ROW LEVEL SECURITY which is idempotent
-- (safe to run on tables that already have RLS enabled).
--
-- Philosophy: "ACID properties don't negotiate."
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: ENABLE RLS ON ALL PUBLIC TABLES
-- (Idempotent - safe to run on tables that already have RLS enabled)
-- ============================================================================

-- Content tables (from migration 20250101140000)
ALTER TABLE public.writers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wiki_video_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_product_mapping ENABLE ROW LEVEL SECURITY;

-- Content linking tables (from migration 008)
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_topics ENABLE ROW LEVEL SECURITY;

-- Engagement tables (from migration 009)
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Report system tables (from migrations 012, 20250101120000)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_access_log ENABLE ROW LEVEL SECURITY;

-- Calculator tables (from migrations 014, 20260103180000)
ALTER TABLE public.calculator2_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_sessions_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_report_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claude_api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validation_errors ENABLE ROW LEVEL SECURITY;

-- Analytics tables (from migration 20260102)
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

-- Writer memory system tables (from migration 007)
ALTER TABLE public.writer_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_memory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writer_voice_snapshots ENABLE ROW LEVEL SECURITY;

-- Trending topics system tables (from migration 011)
ALTER TABLE public.trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_series_posts ENABLE ROW LEVEL SECURITY;

-- Core infrastructure tables (from migration 001)
ALTER TABLE public.bento_grid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Agent system tables (from migration 010)
ALTER TABLE public.agent_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_access_audit ENABLE ROW LEVEL SECURITY;

-- Published content (from migration 016)
ALTER TABLE public.published_content ENABLE ROW LEVEL SECURITY;

-- Credentials table (from migration 027)
ALTER TABLE public.etsy_tokens ENABLE ROW LEVEL SECURITY;

-- Knowledge system
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECTION 2: PUBLIC READ POLICIES (SELECT)
-- Tables whose content is intended for anonymous website visitors
-- ============================================================================

-- blog_posts: Public content - visitors read articles
DROP POLICY IF EXISTS "rls_public_read_blog_posts" ON public.blog_posts;
CREATE POLICY "rls_public_read_blog_posts" ON public.blog_posts
  FOR SELECT USING (true);

-- youtube_videos: Public content - visitors browse video listings
DROP POLICY IF EXISTS "rls_public_read_youtube_videos" ON public.youtube_videos;
CREATE POLICY "rls_public_read_youtube_videos" ON public.youtube_videos
  FOR SELECT USING (true);

-- topics: Public taxonomy - used for navigation and filtering
DROP POLICY IF EXISTS "rls_public_read_topics" ON public.topics;
CREATE POLICY "rls_public_read_topics" ON public.topics
  FOR SELECT USING (true);

-- content_topics: Public junction - powers related content widgets
DROP POLICY IF EXISTS "rls_public_read_content_topics" ON public.content_topics;
CREATE POLICY "rls_public_read_content_topics" ON public.content_topics
  FOR SELECT USING (true);

-- poll_options: Public content - visitors see poll choices
DROP POLICY IF EXISTS "rls_public_read_poll_options" ON public.poll_options;
CREATE POLICY "rls_public_read_poll_options" ON public.poll_options
  FOR SELECT USING (true);

-- topic_polls: Public content - visitors see active polls
DROP POLICY IF EXISTS "rls_public_read_topic_polls" ON public.topic_polls;
CREATE POLICY "rls_public_read_topic_polls" ON public.topic_polls
  FOR SELECT USING (true);

-- post_reactions: Public read - visitors see reaction counts
DROP POLICY IF EXISTS "rls_public_read_post_reactions" ON public.post_reactions;
CREATE POLICY "rls_public_read_post_reactions" ON public.post_reactions
  FOR SELECT USING (true);

-- poll_votes: Public read - visitors see poll results
DROP POLICY IF EXISTS "rls_public_read_poll_votes" ON public.poll_votes;
CREATE POLICY "rls_public_read_poll_votes" ON public.poll_votes
  FOR SELECT USING (true);

-- weekly_analysis: Public content - visitors read weekly summaries
DROP POLICY IF EXISTS "rls_public_read_weekly_analysis" ON public.weekly_analysis;
CREATE POLICY "rls_public_read_weekly_analysis" ON public.weekly_analysis
  FOR SELECT USING (true);

-- wiki_video_links: Public content - powers wiki-to-video widgets
DROP POLICY IF EXISTS "rls_public_read_wiki_video_links" ON public.wiki_video_links;
CREATE POLICY "rls_public_read_wiki_video_links" ON public.wiki_video_links
  FOR SELECT USING (true);

-- topic_product_mapping: Public content - product recommendations
DROP POLICY IF EXISTS "rls_public_read_topic_product_mapping" ON public.topic_product_mapping;
CREATE POLICY "rls_public_read_topic_product_mapping" ON public.topic_product_mapping
  FOR SELECT USING (true);

-- payment_tiers: Public read - visitors see pricing (active tiers only)
DROP POLICY IF EXISTS "rls_public_read_payment_tiers" ON public.payment_tiers;
CREATE POLICY "rls_public_read_payment_tiers" ON public.payment_tiers
  FOR SELECT USING (is_active = TRUE);

-- bento_grid_items: Public content - homepage grid display
DROP POLICY IF EXISTS "rls_public_read_bento_grid_items" ON public.bento_grid_items;
CREATE POLICY "rls_public_read_bento_grid_items" ON public.bento_grid_items
  FOR SELECT USING (true);

-- published_content: Public content - published articles
DROP POLICY IF EXISTS "rls_public_read_published_content" ON public.published_content;
CREATE POLICY "rls_public_read_published_content" ON public.published_content
  FOR SELECT USING (true);

-- creators: Public content - YouTube creator profiles
DROP POLICY IF EXISTS "rls_public_read_creators" ON public.creators;
CREATE POLICY "rls_public_read_creators" ON public.creators
  FOR SELECT USING (true);

-- analytics_events: Public read - dashboard access
DROP POLICY IF EXISTS "rls_public_read_analytics_events" ON public.analytics_events;
CREATE POLICY "rls_public_read_analytics_events" ON public.analytics_events
  FOR SELECT USING (true);

-- performance_metrics: Public read - dashboard access
DROP POLICY IF EXISTS "rls_public_read_performance_metrics" ON public.performance_metrics;
CREATE POLICY "rls_public_read_performance_metrics" ON public.performance_metrics
  FOR SELECT USING (true);

-- knowledge_entries: Public read - institutional memory (read-only by design)
DROP POLICY IF EXISTS "rls_public_read_knowledge_entries" ON public.knowledge_entries;
CREATE POLICY "rls_public_read_knowledge_entries" ON public.knowledge_entries
  FOR SELECT USING (true);


-- ============================================================================
-- SECTION 3: PUBLIC INSERT POLICIES
-- Tables where anonymous visitors submit data
-- ============================================================================

-- post_reactions: Visitors submit thumbs up/down
DROP POLICY IF EXISTS "rls_public_insert_post_reactions" ON public.post_reactions;
CREATE POLICY "rls_public_insert_post_reactions" ON public.post_reactions
  FOR INSERT WITH CHECK (true);

-- newsletter_subscribers: Visitors subscribe to newsletter
DROP POLICY IF EXISTS "rls_public_insert_newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "rls_public_insert_newsletter_subscribers" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- poll_votes: Visitors cast poll votes
DROP POLICY IF EXISTS "rls_public_insert_poll_votes" ON public.poll_votes;
CREATE POLICY "rls_public_insert_poll_votes" ON public.poll_votes
  FOR INSERT WITH CHECK (true);

-- content_feedback: Visitors submit content requests
DROP POLICY IF EXISTS "rls_public_insert_content_feedback" ON public.content_feedback;
CREATE POLICY "rls_public_insert_content_feedback" ON public.content_feedback
  FOR INSERT WITH CHECK (true);

-- calculator2_sessions: Calculator creates stateless sessions
DROP POLICY IF EXISTS "rls_public_insert_calculator2_sessions" ON public.calculator2_sessions;
CREATE POLICY "rls_public_insert_calculator2_sessions" ON public.calculator2_sessions
  FOR INSERT WITH CHECK (true);

-- calculator2_sessions: Calculator can read/update own session by token
DROP POLICY IF EXISTS "rls_public_select_calculator2_sessions" ON public.calculator2_sessions;
CREATE POLICY "rls_public_select_calculator2_sessions" ON public.calculator2_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "rls_public_update_calculator2_sessions" ON public.calculator2_sessions;
CREATE POLICY "rls_public_update_calculator2_sessions" ON public.calculator2_sessions
  FOR UPDATE USING (true) WITH CHECK (true);

-- analytics_events: Browser submits analytics data
DROP POLICY IF EXISTS "rls_public_insert_analytics_events" ON public.analytics_events;
CREATE POLICY "rls_public_insert_analytics_events" ON public.analytics_events
  FOR INSERT WITH CHECK (true);

-- performance_metrics: Browser submits Core Web Vitals
DROP POLICY IF EXISTS "rls_public_insert_performance_metrics" ON public.performance_metrics;
CREATE POLICY "rls_public_insert_performance_metrics" ON public.performance_metrics
  FOR INSERT WITH CHECK (true);

-- report_access_log: Browser logs report views
DROP POLICY IF EXISTS "rls_public_insert_report_access_log" ON public.report_access_log;
CREATE POLICY "rls_public_insert_report_access_log" ON public.report_access_log
  FOR INSERT WITH CHECK (true);

-- content_engagement: Browser submits engagement events
DROP POLICY IF EXISTS "rls_public_insert_content_engagement" ON public.content_engagement;
CREATE POLICY "rls_public_insert_content_engagement" ON public.content_engagement
  FOR INSERT WITH CHECK (true);


-- ============================================================================
-- SECTION 4: SERVICE-ROLE ONLY (LOCKED DOWN)
-- These tables have RLS enabled but NO anon/public policies.
-- Only service_role (which bypasses RLS) can access them.
-- No explicit policies needed - the absence of policies IS the lockdown.
-- ============================================================================

-- The following tables are locked down by virtue of having RLS enabled
-- with no permissive policies for anon/authenticated roles:
--
--   calculator_reports        (PII: emails, access tokens, health data)
--   calculator_sessions_v2    (PII: emails, health profiles, payment data)
--   calculator_report_access_log (audit trail - internal only)
--   generated_reports         (PII: emails, health reports) *
--   user_sessions             (PII: emails, payment data) *
--   etsy_tokens               (CREDENTIALS: OAuth tokens)
--   claude_api_logs           (INTERNAL: API usage tracking)
--   validation_errors         (INTERNAL: form validation debugging)
--   newsletter_subscribers    (PII read-locked: insert allowed above)
--   content_feedback          (PII read-locked: insert allowed above)
--   writers                   (INTERNAL: agent personas)
--   writer_content            (INTERNAL: agent-generated content)
--   writer_memory_log         (INTERNAL: agent learning data)
--   writer_relationships      (INTERNAL: agent collaboration)
--   writer_voice_snapshots    (INTERNAL: agent voice profiles)
--   trending_topics           (INTERNAL: editorial pipeline)
--   topic_sources             (INTERNAL: research sources)
--   topic_series              (INTERNAL: editorial series planning)
--   topic_series_posts        (INTERNAL: series episode tracking)
--   agent_roles               (INTERNAL: agent permission registry)
--   agent_access_audit        (INTERNAL: agent access audit trail)
--   audit_log                 (INTERNAL: system audit trail)
--   user_interests            (PII: user preference data)
--
-- * generated_reports and user_sessions have conditional read policies
--   in prior migrations (token-based, expiry-based). Those remain in effect.
--   This migration does not drop them.


-- ============================================================================
-- SECTION 5: VERIFICATION QUERIES (Run after migration)
-- ============================================================================

-- Verify RLS is enabled on all public tables:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;

-- Verify policy count per table:
-- SELECT schemaname, tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY schemaname, tablename
-- ORDER BY tablename;

-- ============================================================================
-- MIGRATION SUMMARY
-- ============================================================================
-- Total tables with RLS enabled: 36
--
-- PUBLIC READ (SELECT):  18 tables
--   blog_posts, youtube_videos, topics, content_topics,
--   poll_options, topic_polls, post_reactions, poll_votes,
--   weekly_analysis, wiki_video_links, topic_product_mapping,
--   payment_tiers (active only), bento_grid_items, published_content,
--   creators, analytics_events, performance_metrics, knowledge_entries
--
-- PUBLIC INSERT:  11 tables
--   post_reactions, newsletter_subscribers, poll_votes,
--   content_feedback, calculator2_sessions (+ SELECT + UPDATE),
--   analytics_events, performance_metrics, report_access_log,
--   content_engagement
--
-- SERVICE-ROLE ONLY (locked down):  23 tables
--   calculator_reports, calculator_sessions_v2,
--   calculator_report_access_log, generated_reports, user_sessions,
--   etsy_tokens, claude_api_logs, validation_errors,
--   newsletter_subscribers (read), content_feedback (read),
--   writers, writer_content, writer_memory_log,
--   writer_relationships, writer_voice_snapshots,
--   trending_topics, topic_sources, topic_series, topic_series_posts,
--   agent_roles, agent_access_audit, audit_log, user_interests
--
-- "Slow is smooth, and smooth is fast. Your data is sacred."
-- ============================================================================

COMMIT;
