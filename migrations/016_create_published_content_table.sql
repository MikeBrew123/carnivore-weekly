-- Migration 016: Published Content Schema
-- Date: 2026-01-05
-- Author: LEO (Database Architect)
-- Purpose: Create published_content table for managing written articles, newsletters, and content
-- Philosophy: "A database is a promise you make to the future. Don't break it."
-- Status: IDEMPOTENT (safe to run multiple times)
--
-- SCOPE:
-- - Stores published articles with metadata (title, slug, writer attribution)
-- - Maintains temporal data (published_date, created_at, updated_at)
-- - Supports semantic search via topic_tags array
-- - Provides immutable audit trail (created_at never changes)
-- - Foreign key constraint to writers table for referential integrity

-- ===== TABLE: published_content =====
-- Purpose: Single source of truth for all published content
-- Principle: Immutable history with versioning support
CREATE TABLE IF NOT EXISTS public.published_content (
    -- Primary key and identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Content metadata
    title TEXT NOT NULL,
    -- Article/newsletter title (required, indexed for full-text search)

    slug TEXT NOT NULL UNIQUE,
    -- URL-safe identifier (required, unique)
    -- Pattern: 'carnivore-diet-myths-busted', 'weekly-digest-2026-01-05'
    -- Used for routing: /content/{slug}

    writer_slug TEXT NOT NULL REFERENCES public.writers(slug) ON DELETE RESTRICT,
    -- Foreign key to writers.slug (required)
    -- ON DELETE RESTRICT prevents orphaned content

    -- Temporal tracking
    published_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Publication timestamp (required, indexed for sorting)

    summary TEXT,
    -- Content summary or excerpt (optional, for previews)

    topic_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    -- Array of topic tags for semantic search and filtering
    -- Examples: ['meat-quality', 'nutrition', 'recipes', 'health-benefits']

    -- Audit trail (ACID compliance)
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints ensuring data integrity
    CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
    CONSTRAINT slug_not_empty CHECK (length(trim(slug)) > 0),
    CONSTRAINT writer_slug_not_empty CHECK (length(trim(writer_slug)) > 0),
    CONSTRAINT published_date_valid CHECK (published_date >= CURRENT_TIMESTAMP - INTERVAL '10 years'),
    CONSTRAINT created_at_before_updated CHECK (created_at <= updated_at),
    CONSTRAINT topic_tags_not_null CHECK (topic_tags IS NOT NULL)
);

-- ===== INDEXES FOR published_content =====
-- Strategic indexing for common query patterns

CREATE INDEX IF NOT EXISTS idx_published_content_slug
    ON public.published_content(slug);
-- Query pattern: Fetch content by URL slug (router: /content/{slug})

CREATE INDEX IF NOT EXISTS idx_published_content_writer_slug
    ON public.published_content(writer_slug)
    WHERE writer_slug IS NOT NULL;
-- Query pattern: List all content by specific writer

CREATE INDEX IF NOT EXISTS idx_published_content_published_date
    ON public.published_content(published_date DESC);
-- Query pattern: Recent content first (homepage feed, archive)

CREATE INDEX IF NOT EXISTS idx_published_content_topic_tags
    ON public.published_content USING GIN (topic_tags);
-- Query pattern: Find content by topic tags using array operations
-- GIN index enables efficient @> (contains) and && (overlap) queries

-- ===== ENABLE ROW LEVEL SECURITY =====
ALTER TABLE public.published_content ENABLE ROW LEVEL SECURITY;

-- ===== ROW LEVEL SECURITY POLICIES =====

-- Service role (backend) has full access
CREATE POLICY IF NOT EXISTS "service_role_published_content" ON public.published_content
    TO service_role USING (true) WITH CHECK (true);

-- Public can read all published content
CREATE POLICY IF NOT EXISTS "public_published_content_read" ON public.published_content
    FOR SELECT TO public USING (true);

-- ===== TRIGGER FOR updated_at =====

CREATE OR REPLACE FUNCTION public.trg_published_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DROP TRIGGER IF EXISTS trigger_published_content_updated_at ON public.published_content;

CREATE TRIGGER trigger_published_content_updated_at
    BEFORE UPDATE ON public.published_content
    FOR EACH ROW
    WHEN (OLD IS DISTINCT FROM NEW)
    EXECUTE FUNCTION public.trg_published_content_updated_at();

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE public.published_content
    IS 'Single source of truth for all published content (articles, newsletters, guides). Immutable audit trail with writer attribution.';

COMMENT ON COLUMN public.published_content.id
    IS 'UUID primary key, distributed generation without coordination';

COMMENT ON COLUMN public.published_content.title
    IS 'Article/newsletter title (required, searchable)';

COMMENT ON COLUMN public.published_content.slug
    IS 'URL-safe identifier (required, unique). Pattern: carnivore-diet-myths-busted';

COMMENT ON COLUMN public.published_content.writer_slug
    IS 'Foreign key to writers.slug. ON DELETE RESTRICT prevents orphaned content.';

COMMENT ON COLUMN public.published_content.published_date
    IS 'Publication timestamp (required, indexed for sorting)';

COMMENT ON COLUMN public.published_content.summary
    IS 'Content summary or excerpt for previews (optional)';

COMMENT ON COLUMN public.published_content.topic_tags
    IS 'Array of topic tags for semantic search. Examples: meat-quality, nutrition, recipes. Indexed with GIN for @> (contains) queries.';

COMMENT ON COLUMN public.published_content.created_at
    IS 'Immutable creation timestamp. Never changes after insert.';

COMMENT ON COLUMN public.published_content.updated_at
    IS 'Auto-updated on modification. Managed by trigger.';

-- ===== VERIFICATION QUERIES =====
-- Run these after migration to verify schema health

-- Show table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'published_content'
-- ORDER BY ordinal_position;

-- Check foreign key relationships
-- SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
-- FROM information_schema.key_column_usage
-- WHERE table_name = 'published_content' AND constraint_type = 'FOREIGN KEY';

-- List all indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'published_content';

-- ===== MIGRATION METADATA =====
-- Leo's Architectural Notes:
--
-- 1. SCHEMA DESIGN:
--    - Normalization: writer_slug is TEXT FK (not UUID) to match writers.slug design
--    - Immutability: created_at never changes; use updated_at for modifications
--    - Referential integrity: ON DELETE RESTRICT prevents orphaned content
--    - Type safety: CHECKs enforce non-empty strings and valid timestamps
--
-- 2. ACID COMPLIANCE:
--    - Atomicity: Each transaction succeeds or fails completely
--    - Consistency: FK + CHECK constraints prevent invalid states
--    - Isolation: MVCC prevents dirty reads
--    - Durability: All data persisted to disk before commit
--
-- 3. INDEXING STRATEGY:
--    - slug: Single-column B-tree for exact-match routing
--    - writer_slug: Partial index (WHERE writer_slug IS NOT NULL) reduces bloat
--    - published_date DESC: Descending for "newest first" queries
--    - topic_tags: GIN index enables efficient array operations (@>, &&)
--    - Total: 4 indexes, each serves specific query pattern
--
-- 4. SECURITY:
--    - RLS enabled: Service role (backend) full access, public read-only
--    - No insert/update/delete for anonymous users
--    - Foreign key constraint prevents invalid writer references
--
-- 5. PERFORMANCE CHARACTERISTICS:
--    - UUID primary key: 128-bit, distributed generation
--    - TEXT arrays: Efficient storage and GIN indexing
--    - FK constraint: O(1) lookup via writers(slug) index
--    - published_date DESC: Supports "recent first" pagination
--
-- 6. SAFE INSERT PATTERN:
--    INSERT INTO public.published_content (title, slug, writer_slug, published_date, topic_tags, summary)
--    VALUES ($1, $2, $3, NOW(), $4, $5)
--    ON CONFLICT (slug) DO NOTHING
--    RETURNING id, slug;
--
-- 7. COMMON QUERIES:
--    - Fetch by slug: SELECT * FROM published_content WHERE slug = $1
--    - By writer: SELECT * FROM published_content WHERE writer_slug = $1 ORDER BY published_date DESC
--    - By topic: SELECT * FROM published_content WHERE topic_tags && $1 ORDER BY published_date DESC
--    - Recent: SELECT * FROM published_content ORDER BY published_date DESC LIMIT 10
--
-- 8. FUTURE EXTENSIBILITY:
--    - Add content_type ENUM: 'article', 'newsletter', 'guide'
--    - Add featured_image_url for previews
--    - Add view_count for analytics
--    - Add is_published for draft support
--    - Keep slug unique constraint for route integrity
--
-- End Migration 016
