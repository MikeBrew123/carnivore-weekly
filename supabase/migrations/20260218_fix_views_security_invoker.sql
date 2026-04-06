-- Migration: Fix 5 views from SECURITY DEFINER to SECURITY INVOKER
-- Date: 2026-02-18
-- Author: Leo (Database Architect)
-- Reason: Views created without security_invoker default to SECURITY DEFINER,
--         which means RLS policies are evaluated as the view OWNER (postgres),
--         bypassing all row-level security. This is a privilege escalation risk.
--         SECURITY INVOKER evaluates RLS as the querying user (e.g., anon, authenticated).

-- ============================================================
-- VIEW 1: v_topics_by_content
-- Purpose: Get all topics for a specific content item
-- ============================================================
CREATE OR REPLACE VIEW public.v_topics_by_content
WITH (security_invoker = true)
AS
SELECT
  ct.content_type,
  ct.content_identifier,
  t.slug AS topic_slug,
  t.display_name AS topic_name,
  ct.assigned_at
FROM public.content_topics ct
JOIN public.topics t ON ct.topic_id = t.id
ORDER BY ct.content_type, ct.content_identifier, ct.assigned_at DESC;

COMMENT ON VIEW public.v_topics_by_content IS 'Agent query: Get all topics for a content item (SECURITY INVOKER)';

-- ============================================================
-- VIEW 2: v_post_reaction_counts
-- Purpose: Aggregated thumbs up/down counts per blog post
-- ============================================================
CREATE OR REPLACE VIEW public.v_post_reaction_counts
WITH (security_invoker = true)
AS
SELECT
  post_slug,
  COUNT(*) FILTER (WHERE reaction_type = 'up') AS thumbs_up,
  COUNT(*) FILTER (WHERE reaction_type = 'down') AS thumbs_down,
  COUNT(*) AS total_reactions,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE reaction_type = 'up') / NULLIF(COUNT(*), 0),
    1
  ) AS approval_percentage
FROM public.post_reactions
GROUP BY post_slug;

COMMENT ON VIEW public.v_post_reaction_counts IS 'Aggregated reaction counts per blog post (SECURITY INVOKER)';

-- ============================================================
-- VIEW 3: v_content_by_topic
-- Purpose: Get all content linked to a specific topic
-- ============================================================
CREATE OR REPLACE VIEW public.v_content_by_topic
WITH (security_invoker = true)
AS
SELECT
  t.slug AS topic_slug,
  t.display_name AS topic_name,
  ct.content_type,
  ct.content_identifier,
  ct.assigned_at
FROM public.content_topics ct
JOIN public.topics t ON ct.topic_id = t.id
ORDER BY ct.assigned_at DESC;

COMMENT ON VIEW public.v_content_by_topic IS 'Agent query: Get all content linked to a topic (SECURITY INVOKER)';

-- ============================================================
-- VIEW 4: v_related_content
-- Purpose: Find related content via shared topics (self-join)
-- ============================================================
CREATE OR REPLACE VIEW public.v_related_content
WITH (security_invoker = true)
AS
SELECT
  ct1.content_type AS source_type,
  ct1.content_identifier AS source_identifier,
  ct2.content_type AS related_type,
  ct2.content_identifier AS related_identifier,
  t.slug AS shared_topic_slug,
  t.display_name AS shared_topic_name
FROM public.content_topics ct1
JOIN public.content_topics ct2 ON ct1.topic_id = ct2.topic_id
JOIN public.topics t ON ct1.topic_id = t.id
WHERE (ct1.content_type != ct2.content_type OR ct1.content_identifier != ct2.content_identifier);

COMMENT ON VIEW public.v_related_content IS 'Agent query: Find related content via shared topics (SECURITY INVOKER)';

-- ============================================================
-- VIEW 5: v_poll_results
-- Purpose: Live poll results with vote counts and percentages
-- ============================================================
CREATE OR REPLACE VIEW public.v_poll_results
WITH (security_invoker = true)
AS
SELECT
  p.id AS poll_id,
  p.week_identifier,
  p.poll_question,
  p.poll_status,
  po.id AS option_id,
  po.option_text,
  po.display_order,
  COUNT(pv.id) AS vote_count,
  ROUND(
    100.0 * COUNT(pv.id) / NULLIF(SUM(COUNT(pv.id)) OVER (PARTITION BY p.id), 0),
    1
  ) AS vote_percentage
FROM public.topic_polls p
JOIN public.poll_options po ON p.id = po.poll_id
LEFT JOIN public.poll_votes pv ON po.id = pv.option_id
GROUP BY p.id, p.week_identifier, p.poll_question, p.poll_status, po.id, po.option_text, po.display_order
ORDER BY p.week_identifier DESC, po.display_order;

COMMENT ON VIEW public.v_poll_results IS 'Live poll results with vote counts and percentages (SECURITY INVOKER)';

-- ============================================================
-- VERIFICATION QUERY (run after migration)
-- ============================================================
-- SELECT viewname,
--   (SELECT rolname FROM pg_roles WHERE oid = viewowner) as owner,
--   obj_description((quote_ident(schemaname) || '.' || quote_ident(viewname))::regclass) as comment
-- FROM pg_views
-- WHERE schemaname = 'public'
-- AND viewname IN ('v_topics_by_content','v_post_reaction_counts','v_content_by_topic','v_related_content','v_poll_results');
