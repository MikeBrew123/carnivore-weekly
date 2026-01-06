-- VERIFICATION SCRIPT: Confirm all three migrations executed successfully
-- Run this AFTER executing migrations 019, 021, and 026

-- Query 1: Sarah's memory count (should be 14)
SELECT
  'Sarah Memory Count' as test_name,
  COUNT(*) as record_count,
  (SELECT slug FROM public.writers WHERE slug = 'sarah') as writer_slug
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah');

-- Query 2: Marcus's memory count (should be 8)
SELECT
  'Marcus Memory Count' as test_name,
  COUNT(*) as record_count,
  (SELECT slug FROM public.writers WHERE slug = 'marcus') as writer_slug
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus');

-- Query 3: Total memory records
SELECT
  'Total Memory Records' as test_name,
  COUNT(*) as total_memories,
  COUNT(DISTINCT writer_id) as unique_writers
FROM public.writer_memory_log;

-- Query 4: Index verification - count performance indexes created
SELECT
  'Total Performance Indexes' as test_name,
  COUNT(*) as index_count,
  'idx_%' as pattern_match
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- Query 5: Detailed index breakdown
SELECT
  'Index Breakdown' as category,
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Query 6: Sarah memory types distribution
SELECT
  'Sarah Memory Type Distribution' as category,
  memory_type,
  COUNT(*) as count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah')
GROUP BY memory_type
ORDER BY count DESC;

-- Query 7: Marcus memory types distribution
SELECT
  'Marcus Memory Type Distribution' as category,
  memory_type,
  COUNT(*) as count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus')
GROUP BY memory_type
ORDER BY count DESC;

-- Query 8: Highest relevance scores in Sarah's memories
SELECT
  'Sarah Top Relevance Scores' as category,
  title,
  relevance_score,
  memory_type
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah')
ORDER BY relevance_score DESC
LIMIT 5;
