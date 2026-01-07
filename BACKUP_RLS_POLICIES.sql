-- BACKUP: All RLS Policies
-- Created: 2026-01-07
-- DO NOT DELETE - Used for rollback if changes break access

-- Relevant policies for views we're modifying:

-- calculator_reports table (used by vw_generation_stats, vw_pending_reports)
-- Policy: public_calculator_reports_read
--   Roles: {public}
--   Command: SELECT
--   Qual: ((is_expired = false) AND (expires_at > CURRENT_TIMESTAMP))

-- Policy: service_role_calculator_reports
--   Roles: {service_role}
--   Command: ALL
--   Qual: true
--   With_check: true

-- Policy: service_role_only
--   Roles: {public}
--   Command: ALL
--   Qual: (auth.role() = 'service_role'::text)

-- claude_api_logs table (used by vw_claude_api_costs)
-- Policy: service_role_claude_api_logs
--   Roles: {service_role}
--   Command: ALL
--   Qual: true
--   With_check: true

-- Full policy list (37 total policies):
-- blog_posts: blog_posts_select_all, blog_posts_service_role_all, service_role_only
-- calculator2_sessions: calculator2_sessions_anon_access, calculator2_sessions_service_role, insert_calculator2_sessions, select_calculator2_sessions, service_role_calculator2_sessions, update_calculator2_sessions
-- calculator_report_access_log: service_role_calculator_report_access_log
-- calculator_reports: public_calculator_reports_read, service_role_calculator_reports, service_role_only
-- calculator_sessions_v2: service_role_calculator_sessions_v2, service_role_only
-- claude_api_logs: service_role_claude_api_logs
-- cw_assessment_sessions: No direct access, service_role_only
-- generated_reports: public_read_reports, service_role_all
-- payment_tiers: public_payment_tiers_read, service_role_payment_tiers
-- report_access_log: public_insert_access_log, service_role_all
-- topic_product_mapping: topic_product_select_all, topic_product_service_role_all
-- user_sessions: service_role_all
-- validation_errors: service_role_validation_errors
-- waitlist: Public can join waitlist
-- weekly_analysis: weekly_analysis_select_all, weekly_analysis_service_role_all
-- wiki_video_links: wiki_video_links_select_all, wiki_video_links_service_role_all
-- writers: service_role_only
-- youtube_videos: service_role_only, youtube_videos_select_all, youtube_videos_service_role_all
