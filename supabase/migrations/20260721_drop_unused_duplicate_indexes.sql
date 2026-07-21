-- 2026-07-21 — Drop unused + duplicate indexes (bead carnivore-weekly-gyfi + P3-4)
-- Verified: stats accumulated 225 days (never reset) so 0-scan is trustworthy; all non-constraint;
-- oldest created 2026-01-01, youngest 2026-05-31 (not "young/seasonal").
drop index if exists public.idx_rejected_videos_reason;
drop index if exists public.idx_rejected_videos_created;
drop index if exists public.idx_blog_posts_tags;
drop index if exists public.idx_youtube_videos_topic_tags;
drop index if exists public.idx_youtube_videos_youtube_id;
drop index if exists public.idx_writer_memory_log_tags;
drop index if exists public.idx_recipes_diet_tags;

-- Redundant duplicates on calculator_reports (unique constraint indexes cover the same columns).
-- Kept: calculator_reports_access_token_key, calculator_reports_session_id_key, calculator_reports_pkey.
drop index if exists public.idx_calculator_reports_token;
drop index if exists public.idx_calculator_reports_session_id;
