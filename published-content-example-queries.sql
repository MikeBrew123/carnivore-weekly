-- Example Queries for published_content Table
-- Purpose: Demonstrate safe patterns and expected results
-- Date: 2026-01-05
-- Author: LEO

================================================================================
PART 1: SAMPLE DATA (INSERT EXAMPLES)
================================================================================

-- Insert 1: Basic article by Sarah
INSERT INTO public.published_content (
    title,
    slug,
    writer_slug,
    published_date,
    summary,
    topic_tags
)
VALUES (
    'Carnivore Diet Myths Busted',
    'carnivore-diet-myths-busted',
    'sarah',
    '2026-01-01 10:00:00+00'::timestamptz,
    'Debunking 5 common misconceptions about the carnivore diet backed by science.',
    ARRAY['nutrition', 'myths', 'science', 'beginner-friendly']
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, slug, writer_slug, created_at, updated_at;

-- Insert 2: Marcus recipe article
INSERT INTO public.published_content (
    title,
    slug,
    writer_slug,
    published_date,
    summary,
    topic_tags
)
VALUES (
    'Quick Steak Dinner Recipes for Busy Professionals',
    'quick-steak-recipes-busy',
    'marcus',
    '2026-01-02 14:30:00+00'::timestamptz,
    'High-protein, low-effort steak meals you can prepare in 20 minutes or less.',
    ARRAY['recipes', 'quick', 'meals', 'professional']
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, slug, writer_slug, created_at, updated_at;

-- Insert 3: Chloe health article
INSERT INTO public.published_content (
    title,
    slug,
    writer_slug,
    published_date,
    summary,
    topic_tags
)
VALUES (
    'How Carnivore Diet Improved My Energy Levels',
    'carnivore-energy-improvement',
    'chloe',
    '2026-01-03 09:15:00+00'::timestamptz,
    'Personal journey: From chronic fatigue to sustained energy on the carnivore diet.',
    ARRAY['health-benefits', 'energy', 'personal-story', 'transformation']
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, slug, writer_slug, created_at, updated_at;

-- Insert 4: Newsletter by Sarah
INSERT INTO public.published_content (
    title,
    slug,
    writer_slug,
    published_date,
    summary,
    topic_tags
)
VALUES (
    'Weekly Digest: January 5, 2026',
    'weekly-digest-2026-01-05',
    'sarah',
    '2026-01-05 06:00:00+00'::timestamptz,
    'This week''s top stories: New research on meat quality, reader Q&A, and upcoming events.',
    ARRAY['newsletter', 'weekly', 'roundup', 'community']
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, slug, writer_slug, created_at, updated_at;

-- Insert 5: Marcus article about sourcing
INSERT INTO public.published_content (
    title,
    slug,
    writer_slug,
    published_date,
    summary,
    topic_tags
)
VALUES (
    'Finding Quality Grass-Fed Beef in Your Area',
    'finding-quality-grass-fed-beef',
    'marcus',
    '2026-01-04 11:45:00+00'::timestamptz,
    'Guide: How to locate, evaluate, and source premium grass-fed beef locally.',
    ARRAY['sourcing', 'beef-quality', 'meat-quality', 'guide']
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, slug, writer_slug, created_at, updated_at;

================================================================================
PART 2: QUERY EXAMPLES
================================================================================

-- QUERY 1: Fetch single article by slug (Router lookup)
-- Purpose: Used when user visits /content/carnivore-diet-myths-busted
SELECT
    id,
    title,
    slug,
    writer_slug,
    published_date,
    summary,
    topic_tags,
    created_at,
    updated_at
FROM public.published_content
WHERE slug = 'carnivore-diet-myths-busted';

-- EXPECTED OUTPUT:
-- id: 550e8400-e29b-41d4-a716-446655440000
-- title: Carnivore Diet Myths Busted
-- slug: carnivore-diet-myths-busted
-- writer_slug: sarah
-- published_date: 2026-01-01 10:00:00+00
-- summary: Debunking 5 common misconceptions...
-- topic_tags: {nutrition, myths, science, beginner-friendly}
-- created_at: 2026-01-05 12:30:45+00
-- updated_at: 2026-01-05 12:30:45+00

-- ===================================================================

-- QUERY 2: Recent content feed (Homepage)
-- Purpose: Display 10 most recent articles on homepage
SELECT
    id,
    title,
    slug,
    writer_slug,
    published_date,
    summary,
    ARRAY_LENGTH(topic_tags, 1) AS topic_count
FROM public.published_content
ORDER BY published_date DESC
LIMIT 10;

-- EXPECTED OUTPUT:
-- 1. Weekly Digest: January 5, 2026 | sarah | 2026-01-05
-- 2. Finding Quality Grass-Fed Beef in Your Area | marcus | 2026-01-04
-- 3. How Carnivore Diet Improved My Energy Levels | chloe | 2026-01-03
-- 4. Quick Steak Dinner Recipes for Busy Professionals | marcus | 2026-01-02
-- 5. Carnivore Diet Myths Busted | sarah | 2026-01-01

-- ===================================================================

-- QUERY 3: All content by specific writer
-- Purpose: Show all articles by Sarah
SELECT
    id,
    title,
    slug,
    published_date,
    ARRAY_LENGTH(topic_tags, 1) AS topic_count
FROM public.published_content
WHERE writer_slug = 'sarah'
ORDER BY published_date DESC;

-- EXPECTED OUTPUT:
-- 1. Weekly Digest: January 5, 2026 | 2026-01-05 | 4 topics
-- 2. Carnivore Diet Myths Busted | 2026-01-01 | 4 topics

-- ===================================================================

-- QUERY 4: Filter by topic tags (semantic search)
-- Purpose: Show articles tagged with 'nutrition' OR 'recipes'
SELECT
    id,
    title,
    slug,
    writer_slug,
    published_date,
    topic_tags
FROM public.published_content
WHERE topic_tags && ARRAY['nutrition', 'recipes']
ORDER BY published_date DESC;

-- EXPECTED OUTPUT:
-- 1. Quick Steak Dinner Recipes for Busy Professionals | marcus | 2026-01-02 | {recipes, quick, meals, professional}
-- 2. Carnivore Diet Myths Busted | sarah | 2026-01-01 | {nutrition, myths, science, beginner-friendly}

-- Note: && operator means "has any overlap"
-- ARRAY['nutrition', 'recipes'] && topic_tags
-- Returns rows where topic_tags contains EITHER 'nutrition' OR 'recipes'

-- ===================================================================

-- QUERY 5: Filter by specific topic (strict match)
-- Purpose: Articles tagged with BOTH 'health-benefits' AND 'personal-story'
SELECT
    id,
    title,
    slug,
    writer_slug,
    topic_tags
FROM public.published_content
WHERE topic_tags @> ARRAY['health-benefits', 'personal-story']
ORDER BY published_date DESC;

-- EXPECTED OUTPUT:
-- 1. How Carnivore Diet Improved My Energy Levels | chloe | {health-benefits, energy, personal-story, transformation}

-- Note: @> operator means "contains"
-- topic_tags @> ARRAY['health-benefits', 'personal-story']
-- Returns rows where topic_tags contains ALL specified tags

-- ===================================================================

-- QUERY 6: Writer profile page (all articles with stats)
-- Purpose: Show Marcus's profile with article count and topics
SELECT
    writer_slug,
    COUNT(*) AS article_count,
    COUNT(DISTINCT topic_tags) AS unique_topics,
    MIN(published_date) AS first_published,
    MAX(published_date) AS latest_published,
    STRING_AGG(DISTINCT title, ', ' ORDER BY title) AS articles
FROM public.published_content
WHERE writer_slug = 'marcus'
GROUP BY writer_slug;

-- EXPECTED OUTPUT:
-- writer_slug: marcus
-- article_count: 2
-- unique_topics: 5
-- first_published: 2026-01-02
-- latest_published: 2026-01-04
-- articles: Finding Quality Grass-Fed Beef in Your Area, Quick Steak Dinner Recipes for Busy Professionals

-- ===================================================================

-- QUERY 7: Tag cloud (most popular topics)
-- Purpose: Show trending topics across all content
SELECT
    tag,
    COUNT(*) AS article_count,
    ARRAY_AGG(DISTINCT writer_slug) AS writers
FROM public.published_content,
     LATERAL UNNEST(topic_tags) AS tag
GROUP BY tag
ORDER BY article_count DESC;

-- EXPECTED OUTPUT:
-- Tag | Count | Writers
-- --------------------
-- nutrition | 1 | {sarah}
-- recipes | 1 | {marcus}
-- myths | 1 | {sarah}
-- science | 1 | {sarah}
-- beginner-friendly | 1 | {sarah}
-- quick | 1 | {marcus}
-- meals | 1 | {marcus}
-- professional | 1 | {marcus}
-- health-benefits | 1 | {chloe}
-- energy | 1 | {chloe}
-- personal-story | 1 | {chloe}
-- transformation | 1 | {chloe}
-- newsletter | 1 | {sarah}
-- weekly | 1 | {sarah}
-- roundup | 1 | {sarah}
-- community | 1 | {sarah}
-- sourcing | 1 | {marcus}
-- beef-quality | 1 | {marcus}
-- meat-quality | 1 | {marcus}
-- guide | 1 | {marcus}

-- ===================================================================

-- QUERY 8: Recent edits (audit trail)
-- Purpose: Show what was changed in the last 7 days
SELECT
    id,
    title,
    created_at,
    updated_at,
    (updated_at - created_at) AS time_since_publication,
    CASE
        WHEN created_at = updated_at THEN 'Never edited'
        ELSE 'Edited ' || EXTRACT(EPOCH FROM (updated_at - created_at))::int || ' seconds after publication'
    END AS status
FROM public.published_content
WHERE updated_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY updated_at DESC;

-- EXPECTED OUTPUT:
-- If nothing has been updated, all rows show "Never edited"

-- ===================================================================

-- QUERY 9: Complex filter: By writer AND by topic
-- Purpose: Find articles by Marcus about recipes OR meals
SELECT
    id,
    title,
    slug,
    published_date,
    topic_tags
FROM public.published_content
WHERE writer_slug = 'marcus'
    AND topic_tags && ARRAY['recipes', 'meals']
ORDER BY published_date DESC;

-- EXPECTED OUTPUT:
-- 1. Quick Steak Dinner Recipes for Busy Professionals | 2026-01-02 | {recipes, quick, meals, professional}

-- ===================================================================

-- QUERY 10: Pagination (feed with offset)
-- Purpose: Load articles 10-20 for infinite scroll
SELECT
    id,
    title,
    slug,
    writer_slug,
    published_date,
    summary
FROM public.published_content
ORDER BY published_date DESC
LIMIT 10 OFFSET 10;

-- Expected behavior:
-- If we only have 5 articles, OFFSET 10 returns empty result set
-- This is correct behavior for pagination end

-- ===================================================================

-- QUERY 11: Search with pagination
-- Purpose: Find articles with 'diet' in title, page 1 (10 per page)
SELECT
    id,
    title,
    slug,
    writer_slug,
    published_date,
    summary
FROM public.published_content
WHERE title ILIKE '%diet%'  -- Case-insensitive search
ORDER BY published_date DESC
LIMIT 10 OFFSET 0;

-- EXPECTED OUTPUT:
-- 1. Carnivore Diet Myths Busted | sarah | 2026-01-01
-- 2. How Carnivore Diet Improved My Energy Levels | chloe | 2026-01-03

-- ===================================================================

-- QUERY 12: Full-text search (advanced)
-- Purpose: Find articles matching multiple keywords
SELECT
    id,
    title,
    slug,
    writer_slug,
    published_date,
    summary,
    CASE
        WHEN title ILIKE '%carnivore%' AND title ILIKE '%diet%' THEN 'Both keywords'
        WHEN title ILIKE '%carnivore%' THEN 'Carnivore only'
        WHEN title ILIKE '%diet%' THEN 'Diet only'
        ELSE 'No match'
    END AS match_type
FROM public.published_content
WHERE title ILIKE '%carnivore%' OR title ILIKE '%diet%'
ORDER BY published_date DESC;

-- EXPECTED OUTPUT:
-- 1. Carnivore Diet Myths Busted | sarah | Both keywords
-- 2. How Carnivore Diet Improved My Energy Levels | chloe | Both keywords

================================================================================
PART 3: UPDATE EXAMPLES
================================================================================

-- UPDATE 1: Fix typo in article
UPDATE public.published_content
SET summary = 'Debunking 5 common misconceptions about the carnivore diet backed by research.'
WHERE slug = 'carnivore-diet-myths-busted'
RETURNING id, slug, summary, updated_at;

-- Note: updated_at is automatically set to CURRENT_TIMESTAMP by trigger
-- Output shows updated_at changed even though we didn't explicitly set it

-- ===================================================================

-- UPDATE 2: Add tags to existing article
UPDATE public.published_content
SET topic_tags = ARRAY['nutrition', 'myths', 'science', 'beginner-friendly', 'protein']
WHERE slug = 'carnivore-diet-myths-busted'
RETURNING id, slug, topic_tags, updated_at;

-- ===================================================================

-- UPDATE 3: Bulk update topics (add 'trending' tag to all recent content)
UPDATE public.published_content
SET topic_tags = ARRAY_APPEND(topic_tags, 'trending')
WHERE published_date > CURRENT_TIMESTAMP - INTERVAL '7 days'
RETURNING id, title, topic_tags, updated_at;

-- Note: ARRAY_APPEND may create duplicates
-- Use ARRAY_CAT with ARRAY_REMOVE to deduplicate:
-- topic_tags = ARRAY(SELECT DISTINCT UNNEST(ARRAY_APPEND(topic_tags, 'trending')))

================================================================================
PART 4: DELETE EXAMPLES
================================================================================

-- DELETE 1: Remove draft article
DELETE FROM public.published_content
WHERE slug = 'draft-article-title'
RETURNING id, title, slug;

-- Note: Hard delete is permanent. Consider soft delete with is_published flag instead.

-- ===================================================================

-- DELETE 2: Cleanup test data
DELETE FROM public.published_content
WHERE slug LIKE 'test-%'
RETURNING COUNT(*) AS deleted_count;

================================================================================
PART 5: ERROR SCENARIOS
================================================================================

-- ERROR 1: Violate foreign key (invalid writer_slug)
/*
INSERT INTO public.published_content (title, slug, writer_slug)
VALUES ('Article', 'article-slug', 'invalid-writer');

ERROR: insert or update on table "published_content" violates foreign key constraint "fk_published_content_writer_slug"
DETAIL: Key (writer_slug)=(invalid-writer) is not present in table "writers".
*/

-- Solution: Check valid writers first
SELECT slug FROM public.writers WHERE is_active = TRUE;

-- ===================================================================

-- ERROR 2: Duplicate slug
/*
INSERT INTO public.published_content (title, slug, writer_slug)
VALUES ('Different Article', 'carnivore-diet-myths-busted', 'marcus');

ERROR: duplicate key value violates unique constraint "idx_published_content_slug"
DETAIL: Key (slug)=(carnivore-diet-myths-busted) already exists.
*/

-- Solution: Use ON CONFLICT or check slug first
INSERT INTO public.published_content (title, slug, writer_slug)
VALUES ('Different Article', 'carnivore-diet-myths-busted', 'marcus')
ON CONFLICT (slug) DO NOTHING
RETURNING id;

-- ===================================================================

-- ERROR 3: Empty title
/*
INSERT INTO public.published_content (title, slug, writer_slug)
VALUES ('', 'empty-title', 'sarah');

ERROR: new row for relation "published_content" violates check constraint "title_not_empty"
*/

-- Solution: Validate before insert
INSERT INTO public.published_content (title, slug, writer_slug)
VALUES (TRIM('   Article   '), 'trimmed-title', 'sarah')
RETURNING id, title;

================================================================================
PERFORMANCE ANALYSIS
================================================================================

-- ANALYZE 1: Query execution plan (by slug)
EXPLAIN ANALYZE
SELECT * FROM public.published_content WHERE slug = 'carnivore-diet-myths-busted';

-- EXPECTED: Index Scan using idx_published_content_slug
-- Cost: 0.01 rows, ~0.5ms

-- ===================================================================

-- ANALYZE 2: Query execution plan (by date)
EXPLAIN ANALYZE
SELECT * FROM public.published_content
ORDER BY published_date DESC LIMIT 10;

-- EXPECTED: Index Scan using idx_published_content_published_date
-- Cost: 0.34 rows, ~1ms

-- ===================================================================

-- ANALYZE 3: Query execution plan (by tags)
EXPLAIN ANALYZE
SELECT * FROM public.published_content
WHERE topic_tags && ARRAY['nutrition', 'recipes'];

-- EXPECTED: Index Scan using idx_published_content_topic_tags
-- Cost depends on tag selectivity, ~2-3ms

================================================================================
SUMMARY
================================================================================

These queries demonstrate:

✅ Safe INSERT patterns (with ON CONFLICT DO NOTHING)
✅ Common SELECT patterns (by slug, date, writer, tags)
✅ Advanced filtering (AND/OR combinations)
✅ Aggregations (writer stats, tag clouds)
✅ Pagination (LIMIT/OFFSET)
✅ Audit trails (created_at vs updated_at)
✅ UPDATE patterns (single and bulk)
✅ DELETE patterns (with caution)
✅ Error handling (FK violations, duplicates, validation)
✅ Query optimization (EXPLAIN ANALYZE)

All patterns respect ACID properties and leverage indexes for performance.

================================================================================
LEO - Database Architect
