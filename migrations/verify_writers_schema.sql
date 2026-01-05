-- ===== WRITERS SCHEMA VERIFICATION & DIAGNOSTIC QUERIES =====
-- Use these queries to verify the unified schema is correct and to retrieve data
-- Date: 2026-01-05
-- Status: Safe read-only queries for inspection

-- Step 1: Verify writers table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'writers'
ORDER BY ordinal_position;

-- Step 2: Verify all 5 tables exist
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE 'writer%'
ORDER BY table_name;

-- Step 3: List all writers (should show Sarah, Marcus, Chloe)
SELECT
    id,
    slug,
    name,
    role_title,
    specialty,
    experience_level,
    tone_style,
    is_active,
    created_at
FROM writers
ORDER BY created_at DESC;

-- Step 4: Count memory entries by writer
SELECT
    w.name,
    w.slug,
    COUNT(wml.id) AS memory_count,
    STRING_AGG(DISTINCT wml.memory_type, ', ') AS memory_types
FROM writers w
LEFT JOIN writer_memory_log wml ON w.id = wml.writer_id
GROUP BY w.id, w.name, w.slug
ORDER BY w.slug;

-- Step 5: GET SARAH'S MEMORY ENTRIES (Main Query for Your Use Case)
-- This retrieves all of Sarah's stored memories for processing
SELECT
    wml.id,
    wml.writer_id,
    w.name AS writer_name,
    w.slug AS writer_slug,
    wml.memory_type,
    wml.lesson_type,
    wml.title,
    wml.description,
    wml.content,
    wml.source_type,
    wml.source,
    wml.tags,
    wml.relevance_score,
    wml.impact_category,
    wml.implementation_status,
    wml.is_active,
    wml.created_at,
    wml.created_by
FROM writer_memory_log wml
JOIN writers w ON wml.writer_id = w.id
WHERE w.slug = 'sarah'
AND wml.is_active = true
ORDER BY wml.created_at DESC;

-- Step 6: GET SARAH'S RECENT LESSONS (Last 5, ordered by relevance)
SELECT
    wml.title,
    wml.memory_type,
    wml.description,
    wml.tags,
    wml.relevance_score,
    wml.impact_category,
    wml.implementation_status,
    wml.created_at
FROM writer_memory_log wml
JOIN writers w ON wml.writer_id = w.id
WHERE w.slug = 'sarah'
AND wml.is_active = true
ORDER BY wml.relevance_score DESC, wml.created_at DESC
LIMIT 5;

-- Step 7: Check writer_content table (should be empty initially)
SELECT
    COUNT(*) AS total_content_pieces,
    COUNT(DISTINCT writer_id) AS writers_with_content
FROM writer_content;

-- Step 8: Check writer_relationships table (should be empty initially)
SELECT
    COUNT(*) AS total_relationships,
    STRING_AGG(DISTINCT relationship_type, ', ') AS relationship_types
FROM writer_relationships;

-- Step 9: Check writer_voice_snapshots table (should be empty initially)
SELECT
    COUNT(*) AS total_snapshots,
    COUNT(DISTINCT writer_id) AS writers_with_snapshots
FROM writer_voice_snapshots;

-- Step 10: Verify indexes are present
SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE tablename IN ('writers', 'writer_memory_log', 'writer_content', 'writer_relationships', 'writer_voice_snapshots')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- Step 11: Test full voice formula retrieval for Sarah
SELECT
    slug,
    name,
    role_title,
    specialty,
    voice_formula,
    philosophy
FROM writers
WHERE slug = 'sarah';

-- Step 12: Get memory entry count by type (histogram)
SELECT
    memory_type,
    COUNT(*) AS count,
    ROUND(AVG(relevance_score::numeric), 2) AS avg_relevance
FROM writer_memory_log
WHERE is_active = true
GROUP BY memory_type
ORDER BY count DESC;
