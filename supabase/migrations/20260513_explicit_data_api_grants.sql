-- ============================================================================
-- Migration: 20260513_explicit_data_api_grants.sql
-- Date: 2026-05-13
-- Purpose: Add explicit GRANT statements for all tables/views/functions
--          accessed via the Supabase Data API (/rest/v1/, supabase-js).
--
-- Context: Starting May 30 2026, new Supabase projects require explicit GRANTs
-- for public schema tables. From October 30 2026, this applies to ALL projects.
-- This migration future-proofs the project ahead of the October deadline.
--
-- Grant tiers match the RLS policies in 20260211_enable_rls_all_tables.sql:
--   anon         — anonymous website visitors (read-only or limited insert)
--   authenticated — logged-in users (same as anon for now, no auth flows yet)
--   service_role  — internal agents, n8n, Cloudflare Workers (bypasses RLS)
--
-- Views and functions require separate grants from their underlying tables.
-- Table list verified against actual schema on 2026-05-13.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SCHEMA USAGE (required for any schema access)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- PUBLIC READ TABLES (anon + authenticated SELECT)
-- ============================================================================
GRANT SELECT ON public.blog_posts               TO anon, authenticated;
GRANT SELECT ON public.youtube_videos           TO anon, authenticated;
GRANT SELECT ON public.topics                   TO anon, authenticated;
GRANT SELECT ON public.content_topics           TO anon, authenticated;
GRANT SELECT ON public.poll_options             TO anon, authenticated;
GRANT SELECT ON public.topic_polls              TO anon, authenticated;
GRANT SELECT ON public.post_reactions           TO anon, authenticated;
GRANT SELECT ON public.poll_votes               TO anon, authenticated;
GRANT SELECT ON public.weekly_analysis          TO anon, authenticated;
GRANT SELECT ON public.wiki_video_links         TO anon, authenticated;
GRANT SELECT ON public.topic_product_mapping    TO anon, authenticated;
GRANT SELECT ON public.payment_tiers            TO anon, authenticated;
GRANT SELECT ON public.writers                  TO anon, authenticated;

-- ============================================================================
-- PUBLIC INSERT TABLES (anon INSERT)
-- ============================================================================
GRANT INSERT ON public.post_reactions           TO anon, authenticated;
GRANT INSERT ON public.newsletter_subscribers   TO anon, authenticated;
GRANT INSERT ON public.poll_votes               TO anon, authenticated;
GRANT INSERT ON public.content_feedback         TO anon, authenticated;
GRANT INSERT ON public.report_access_log        TO anon, authenticated;

-- calculator2_sessions: anon can INSERT, SELECT, and UPDATE own session
GRANT SELECT, INSERT, UPDATE ON public.calculator2_sessions TO anon, authenticated;

-- drip_subscribers: anon insert for email capture
GRANT INSERT ON public.drip_subscribers         TO anon, authenticated;

-- waitlist: anon insert for waitlist signups
GRANT INSERT ON public.waitlist                 TO anon, authenticated;

-- ============================================================================
-- VIEWS (must grant separately from underlying tables)
-- ============================================================================
GRANT SELECT ON public.v_post_reaction_counts   TO anon, authenticated;
GRANT SELECT ON public.v_related_content        TO anon, authenticated;
GRANT SELECT ON public.v_content_by_topic       TO anon, authenticated;
GRANT SELECT ON public.v_poll_results           TO anon, authenticated;
GRANT SELECT ON public.v_topics_by_content      TO anon, authenticated;

-- ============================================================================
-- FUNCTIONS (anon EXECUTE for RPC calls)
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.get_related_content TO anon, authenticated;

-- ============================================================================
-- SERVICE ROLE — full access to all tables and functions
-- (service_role bypasses RLS, but still needs table-level grants)
-- ============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ============================================================================
-- FUTURE TABLES — ensure new tables get service_role access automatically
-- (belt-and-suspenders for the Oct 30 deadline and beyond)
-- ============================================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

COMMIT;
