-- Migration: Add get_popular_blog_posts function
-- Purpose: Fetch blog posts ranked by popularity (thumbs_up reactions)
-- Used by: generate.py for homepage "Most Popular" section

-- ============================================================
-- GET POPULAR BLOG POSTS FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_popular_blog_posts(
  exclude_slugs TEXT[] DEFAULT ARRAY[]::TEXT[],
  limit_count INT DEFAULT 3
)
RETURNS TABLE (
  slug TEXT,
  title TEXT,
  excerpt TEXT,
  published_date DATE,
  category TEXT,
  tags TEXT[],
  thumbs_up BIGINT
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    bp.slug,
    bp.title,
    bp.excerpt,
    bp.published_date,
    bp.category,
    bp.tags,
    COALESCE(rc.thumbs_up, 0) AS thumbs_up
  FROM public.blog_posts bp
  LEFT JOIN public.v_post_reaction_counts rc ON bp.slug = rc.post_slug
  WHERE bp.is_published = true
    AND (exclude_slugs IS NULL OR bp.slug != ALL(exclude_slugs))
  ORDER BY COALESCE(rc.thumbs_up, 0) DESC, bp.published_date DESC
  LIMIT limit_count;
$$;

COMMENT ON FUNCTION public.get_popular_blog_posts IS
  'Returns most popular blog posts based on thumbs_up reactions. Excludes specified slugs (typically newest posts) to prevent overlap.';

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.get_popular_blog_posts TO service_role;
GRANT EXECUTE ON FUNCTION public.get_popular_blog_posts TO anon;
