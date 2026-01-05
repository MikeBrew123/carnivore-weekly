-- ===== WRITERS SCHEMA QUICK REFERENCE =====
-- Run after migration for common queries
-- All queries optimized with indexes

-- 1. LIST ALL WRITERS
SELECT id, slug, name, role_title, specialty, experience_level, is_active
FROM writers
ORDER BY slug;

-- 2. GET SARAH'S PROFILE
SELECT
    id,
    slug,
    name,
    role_title,
    specialty,
    experience_level,
    tone_style,
    bio,
    philosophy,
    avatar_url,
    voice_formula
FROM writers
WHERE slug = 'sarah';

-- 3. GET SARAH'S ALL MEMORY ENTRIES (Main Query)
SELECT
    id,
    title,
    memory_type,
    description,
    tags,
    relevance_score,
    impact_category,
    implementation_status,
    source,
    created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
AND is_active = true
ORDER BY relevance_score DESC, created_at DESC;

-- 4. GET SARAH'S TOP 5 LESSONS
SELECT
    title,
    memory_type,
    description,
    relevance_score,
    impact_category,
    created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
AND is_active = true
ORDER BY relevance_score DESC
LIMIT 5;

-- 5. GET SARAH'S IMPLEMENTED MEMORIES ONLY
SELECT
    id,
    title,
    memory_type,
    description,
    tags,
    created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
AND is_active = true
AND implementation_status = 'implemented'
ORDER BY created_at DESC;

-- 6. GET MEMORIES BY TAG (Search for 'engagement')
SELECT
    title,
    memory_type,
    description,
    tags,
    relevance_score
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
AND is_active = true
AND 'engagement' = ANY(tags)
ORDER BY relevance_score DESC;

-- 7. COUNT MEMORIES BY TYPE (For Sarah)
SELECT
    memory_type,
    COUNT(*) as count,
    ROUND(AVG(relevance_score::numeric), 2) as avg_relevance
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
GROUP BY memory_type
ORDER BY count DESC;

-- 8. COUNT MEMORIES BY IMPACT CATEGORY
SELECT
    impact_category,
    COUNT(*) as count
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
GROUP BY impact_category
ORDER BY count DESC;

-- 9. GET RECENT MEMORIES (Last 7 Days)
SELECT
    id,
    title,
    memory_type,
    relevance_score,
    created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
AND created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY created_at DESC;

-- 10. GET ALL WRITERS WITH MEMORY COUNT
SELECT
    w.id,
    w.slug,
    w.name,
    w.specialty,
    COUNT(wml.id) as memory_count,
    ROUND(AVG(wml.relevance_score::numeric), 2) as avg_relevance
FROM writers w
LEFT JOIN writer_memory_log wml ON w.id = wml.writer_id AND wml.is_active = true
WHERE w.is_active = true
GROUP BY w.id, w.slug, w.name, w.specialty
ORDER BY memory_count DESC, w.slug;

-- 11. GET WRITERS BY SPECIALTY
SELECT
    id,
    slug,
    name,
    specialty,
    tone_style,
    experience_level
FROM writers
WHERE specialty LIKE '%health%'
AND is_active = true;

-- 12. GET SENIOR/EXPERT WRITERS
SELECT
    id,
    slug,
    name,
    experience_level,
    specialty
FROM writers
WHERE experience_level IN ('senior', 'expert')
AND is_active = true
ORDER BY slug;

-- 13. GET WRITER CONTENT HISTORY (Empty Initially)
SELECT
    w.name,
    wc.title,
    wc.content_type,
    wc.word_count,
    wc.performance_score,
    wc.published_at
FROM writers w
LEFT JOIN writer_content wc ON w.id = wc.writer_id
WHERE w.slug = 'sarah'
ORDER BY wc.published_at DESC;

-- 14. CHECK WRITER RELATIONSHIPS (Empty Initially)
SELECT
    COALESCE(w1.slug, 'Unknown') as writer_a,
    COALESCE(w2.slug, 'Unknown') as writer_b,
    relationship_type,
    collaboration_count,
    last_interaction
FROM writer_relationships wr
LEFT JOIN writers w1 ON wr.writer_a_id = w1.id
LEFT JOIN writers w2 ON wr.writer_b_id = w2.id
ORDER BY wr.created_at DESC;

-- 15. GET VOICE SNAPSHOTS (Empty Initially)
SELECT
    w.slug,
    ws.snapshot_date,
    ws.voice_consistency_score,
    ws.evolution_notes,
    ws.period_summary
FROM writers w
LEFT JOIN writer_voice_snapshots ws ON w.id = ws.writer_id
WHERE w.slug = 'sarah'
ORDER BY ws.snapshot_date DESC;

-- 16. SCHEMA VERIFICATION (Run After Migration)
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'writers'
ORDER BY ordinal_position;

-- 17. INDEX VERIFICATION
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE tablename IN ('writers', 'writer_memory_log', 'writer_content', 'writer_relationships', 'writer_voice_snapshots')
AND schemaname = 'public'
ORDER BY tablename, indexname;

-- 18. TABLE SIZE INFORMATION
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'writer%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 19. CREATE TEST MEMORY ENTRY (For Testing)
-- Uncomment to insert a test memory for Sarah
/*
INSERT INTO writer_memory_log (
    writer_id,
    memory_type,
    lesson_type,
    title,
    description,
    content,
    source_type,
    source,
    tags,
    relevance_score,
    impact_category,
    implementation_status,
    created_by
)
SELECT
    (SELECT id FROM writers WHERE slug = 'sarah'),
    'lesson_learned',
    'Testing',
    'This is a test memory',
    'This is a test memory entry created via SQL',
    'This is a test memory entry created via SQL',
    'self_reflection',
    'direct_learning',
    ARRAY['test', 'example'],
    0.75,
    'engagement_boost',
    'documented',
    NULL
RETURNING id, title, created_at;
*/

-- 20. DELETE TEST ENTRY (For Cleanup)
-- Uncomment to remove test entries
/*
DELETE FROM writer_memory_log
WHERE title = 'This is a test memory'
RETURNING id, title;
*/

-- ===== USEFUL CONSTANTS FOR APPLICATION CODE =====

-- Memory Types Enum
-- 'lesson_learned', 'pattern_identified', 'improvement', 'audience_insight',
-- 'technical_tip', 'style_refinement', 'audience_feedback', 'competitive_analysis'

-- Experience Levels Enum
-- 'junior', 'mid', 'senior', 'expert'

-- Relationship Types Enum
-- 'mentor', 'mentee', 'peer', 'collaborator', 'reviewer'

-- Impact Categories Enum
-- 'tone_improvement', 'engagement_boost', 'accuracy_increase', 'clarity_enhancement',
-- 'audience_expansion', 'efficiency_gain', 'brand_alignment'

-- Implementation Status Enum
-- 'documented', 'in_progress', 'implemented', 'archived'

-- Source Types Enum
-- 'direct_learning', 'audience_feedback', 'peer_input', 'system_analysis', 'external_research'

-- ===== PERFORMANCE BASELINE =====
-- Expected query times (with proper indexes):
-- - Single row by slug: <5ms
-- - Get all memories for writer: <10ms
-- - Filter by tags: <20ms
-- - Count aggregations: <50ms
-- - List all writers: <100ms

-- ===== BACKUP COMMAND =====
-- pg_dump --format=custom --file=/backup/writers_schema.dump carnivore_weekly

-- ===== RESTORE COMMAND =====
-- pg_restore --format=custom --file=/backup/writers_schema.dump /backup/writers_schema.dump
