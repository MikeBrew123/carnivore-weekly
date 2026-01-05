-- Verification Queries for Migration 016: published_content
-- Run these queries after executing the migration to confirm table structure health
-- Purpose: Validate ACID properties, indexes, constraints, and RLS policies

-- ===== QUERY 1: COLUMN STRUCTURE =====
-- Shows all columns, data types, nullability, and defaults
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'published_content'
ORDER BY ordinal_position;

-- Expected Output:
-- id | uuid | NO | gen_random_uuid()
-- title | text | NO | (null)
-- slug | text | NO | (null)
-- writer_slug | text | NO | (null)
-- published_date | timestamp with time zone | NO | CURRENT_TIMESTAMP
-- summary | text | YES | (null)
-- topic_tags | text[] | YES | ARRAY[]::text[]
-- created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP
-- updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP

-- ===== QUERY 2: FOREIGN KEY CONSTRAINTS =====
-- Shows all FK relationships for referential integrity verification
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'published_content' AND tc.constraint_type = 'FOREIGN KEY';

-- Expected Output:
-- constraint_name | fk_published_content_writer_slug
-- table_name | published_content
-- column_name | writer_slug
-- foreign_table_name | writers
-- foreign_column_name | slug
-- update_rule | RESTRICT
-- delete_rule | RESTRICT

-- ===== QUERY 3: CHECK CONSTRAINTS =====
-- Shows all CHECK constraints enforcing data integrity
SELECT
    constraint_name,
    check_clause
FROM information_schema.check_constraints
WHERE constraint_schema = 'public'
    AND (constraint_name LIKE '%published_content%' OR constraint_name LIKE 'title_%' OR constraint_name LIKE 'slug_%')
ORDER BY constraint_name;

-- Expected Output (5 constraints):
-- title_not_empty | (length(trim(title)) > 0)
-- slug_not_empty | (length(trim(slug)) > 0)
-- writer_slug_not_empty | (length(trim(writer_slug)) > 0)
-- published_date_valid | (published_date >= (CURRENT_TIMESTAMP - INTERVAL '10 years'))
-- created_at_before_updated | (created_at <= updated_at)

-- ===== QUERY 4: UNIQUE CONSTRAINTS =====
-- Shows unique indexes for preventing duplicate data
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'published_content'
    AND indexname LIKE '%unique%' OR indexdef LIKE '%UNIQUE%'
ORDER BY indexname;

-- Expected Output:
-- idx_published_content_slug_unique | CREATE UNIQUE INDEX idx_published_content_slug ON public.published_content USING btree (slug)

-- ===== QUERY 5: ALL INDEXES =====
-- Comprehensive index listing for query optimization verification
SELECT
    indexname,
    indexdef,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_indexes
LEFT JOIN pg_stat_user_indexes ON pg_indexes.indexname = pg_stat_user_indexes.indexrelname
WHERE tablename = 'published_content'
ORDER BY indexname;

-- Expected Indexes (4 total):
-- 1. idx_published_content_slug (UNIQUE, B-tree)
-- 2. idx_published_content_writer_slug (B-tree, partial WHERE writer_slug IS NOT NULL)
-- 3. idx_published_content_published_date (B-tree DESC)
-- 4. idx_published_content_topic_tags (GIN array index)

-- ===== QUERY 6: ROW LEVEL SECURITY STATUS =====
-- Verify RLS is enabled and policies are created
SELECT
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'published_content';

-- Expected Output:
-- schemaname | public
-- tablename | published_content
-- rowsecurity | true (RLS enabled)
-- forcerowsecurity | false

-- ===== QUERY 7: RLS POLICIES =====
-- Show all security policies for access control verification
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'published_content'
ORDER BY policyname;

-- Expected Output (2 policies):
-- 1. service_role_published_content (PERMISSIVE, TO service_role, USING true WITH CHECK true)
-- 2. public_published_content_read (PERMISSIVE, FOR SELECT TO public, USING true)

-- ===== QUERY 8: TRIGGER VERIFICATION =====
-- Show all triggers on published_content for automation verification
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public' AND event_object_table = 'published_content'
ORDER BY trigger_name;

-- Expected Output (1 trigger):
-- trigger_name | trigger_published_content_updated_at
-- event_manipulation | UPDATE
-- event_object_table | published_content
-- action_statement | EXECUTE FUNCTION public.trg_published_content_updated_at()

-- ===== QUERY 9: TABLE STATISTICS =====
-- Show table size and row count for capacity planning
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND tablename = 'published_content';

-- Expected Output (initial):
-- total_size | 8192 bytes (empty table)
-- table_size | 8192 bytes
-- indexes_size | 16384 bytes (4 indexes)
-- row_count | 0

-- ===== QUERY 10: SAFE INSERT TEST (READ-ONLY) =====
-- This is a demonstration query - DO NOT EXECUTE in production without testing
-- Shows the safe insert pattern using ON CONFLICT DO NOTHING
/*
INSERT INTO public.published_content (
    title,
    slug,
    writer_slug,
    published_date,
    topic_tags,
    summary
)
VALUES (
    'Carnivore Diet Myths Busted',
    'carnivore-diet-myths-busted',
    'sarah',  -- Must reference an existing writers.slug
    CURRENT_TIMESTAMP,
    ARRAY['nutrition', 'myths', 'science'],
    'Debunking common misconceptions about the carnivore diet.'
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, slug, writer_slug, created_at;
*/

-- ===== QUERY 11: VERIFY WRITER RELATIONSHIPS =====
-- Check that referenced writers exist
SELECT
    w.slug,
    w.name,
    w.specialty,
    (SELECT COUNT(*) FROM public.published_content pc WHERE pc.writer_slug = w.slug) AS content_count
FROM public.writers w
WHERE w.is_active = TRUE
ORDER BY w.name;

-- Expected Output:
-- Shows all active writers with count of their published content (initially 0 for new table)

-- ===== SUMMARY =====
-- If all 11 queries return expected results:
-- ✅ Table created successfully
-- ✅ All columns have correct types and defaults
-- ✅ Foreign key constraint enforced (ON DELETE RESTRICT)
-- ✅ All CHECK constraints in place
-- ✅ Unique constraint on slug
-- ✅ 4 indexes created for performance
-- ✅ RLS enabled with 2 policies
-- ✅ Trigger auto-updates updated_at
-- ✅ Table ready for production use

-- ===== SCHEMA DIAGRAM =====
-- published_content
-- ├─ id (UUID PRIMARY KEY)
-- ├─ title (TEXT NOT NULL)
-- ├─ slug (TEXT UNIQUE NOT NULL)
-- ├─ writer_slug (TEXT NOT NULL) → writers.slug (ON DELETE RESTRICT)
-- ├─ published_date (TIMESTAMP NOT NULL, DEFAULT NOW())
-- ├─ summary (TEXT)
-- ├─ topic_tags (TEXT[] DEFAULT ARRAY[]::TEXT[])
-- ├─ created_at (TIMESTAMP NOT NULL, DEFAULT NOW())
-- ├─ updated_at (TIMESTAMP NOT NULL, DEFAULT NOW())
-- └─ Indexes:
--    ├─ idx_published_content_slug (UNIQUE B-tree)
--    ├─ idx_published_content_writer_slug (B-tree, partial)
--    ├─ idx_published_content_published_date (B-tree DESC)
--    └─ idx_published_content_topic_tags (GIN)
-- └─ RLS Policies:
--    ├─ service_role: Full access
--    └─ public: Read-only
-- └─ Trigger:
--    └─ trigger_published_content_updated_at (auto-update updated_at)
