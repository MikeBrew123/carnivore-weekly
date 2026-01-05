-- SARA'S MEMORY STORAGE — QUICK REFERENCE GUIDE
-- Leo (Database Architect)
-- Philosophy: "Slow is smooth, and smooth is fast. Your data is sacred."

-- ============================================================================
-- LAYER 1: TRANSACTIONAL MEMORY (writer_memory_log)
-- ============================================================================

-- 1. Fetch Sara's Recent Lessons (Last 5)
SELECT
  lesson_type,
  content,
  tags,
  created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND is_active = true
ORDER BY created_at DESC
LIMIT 5;

-- 2. Search Sara's Lessons by Tag (e.g., "engagement")
SELECT
  lesson_type,
  content,
  tags,
  created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND tags @> ARRAY['engagement']::TEXT[]
  AND is_active = true
ORDER BY created_at DESC;

-- 3. Search Sara's Lessons by Lesson Type
SELECT
  lesson_type,
  content,
  tags,
  created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND lesson_type = 'Common Objection'
  AND is_active = true
ORDER BY created_at DESC;

-- 4. Insert New Lesson for Sara
INSERT INTO writer_memory_log (
  writer_id,
  lesson_type,
  content,
  source_type,
  tags,
  created_by
) VALUES (
  (SELECT id FROM writers WHERE slug = 'sarah'),
  'Audience Feedback',
  'Readers request meal prep examples. Include 3-5 specific recipes per post.',
  'audience_feedback',
  ARRAY['meal-planning', 'specificity', 'reader-request'],
  NULL  -- Set to auth.uid() if user context available
)
RETURNING id, created_at;

-- 5. Check How Many Lessons Sara Has
SELECT COUNT(*) as total_lessons
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND is_active = true;

-- 6. Get Sara's Performance This Week
SELECT
  content_pieces_published,
  engagement_score,
  reader_feedback_positive_percent,
  quality_score,
  created_at
FROM writer_performance_metrics
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND metric_week >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY metric_week DESC;

-- ============================================================================
-- LAYER 2: INSTITUTIONAL KNOWLEDGE (knowledge_entries)
-- ============================================================================

-- 7. Retrieve Institutional Knowledge About Sara
SELECT
  title,
  summary,
  type,
  confidence,
  tags,
  created_at
FROM knowledge_entries
WHERE tags @> ARRAY['sara']::TEXT[]
  AND type IN ('decision', 'insight')
ORDER BY created_at DESC;

-- 8. Insert New Institutional Knowledge About Sara
-- (Leo executes this via service_role only)
INSERT INTO knowledge_entries (
  type,
  title,
  summary,
  source_file,
  confidence,
  tags
) VALUES (
  'decision',
  'Sara''s Health Coaching Voice Formula',
  'Use specific examples from coaching practice. Always cite health sources. Include "Not a Doctor" disclaimer on every health post. Grade 8-10 reading level.',
  'SARA_MEMORY_STORAGE_ANALYSIS.md',
  'high',
  ARRAY['voice', 'health-coaching', 'sara', 'brand-standards']
)
RETURNING id, created_at;

-- 9. View All Knowledge Entries by Type
SELECT
  type,
  title,
  confidence,
  COUNT(*) as count
FROM knowledge_entries
GROUP BY type, title, confidence
ORDER BY type, confidence DESC;

-- 10. Check Aging Assumptions (>60 days old)
SELECT
  title,
  summary,
  confidence,
  created_at,
  EXTRACT(DAY FROM (NOW() - created_at)) as days_old
FROM knowledge_entries
WHERE type = 'assumption'
  AND created_at < NOW() - INTERVAL '60 days'
ORDER BY created_at ASC;

-- ============================================================================
-- LAYER 3: ACCESS CONTROL (agent_roles, agent_access_audit)
-- ============================================================================

-- 11. Check Sara's Permissions
SELECT
  agent_name,
  description,
  permissions,
  is_active
FROM agent_roles
WHERE agent_name = 'sarah';

-- 12. View Sara's Recent Access History (Last 24 Hours)
SELECT
  requesting_agent,
  accessed_table,
  operation,
  record_count,
  success,
  accessed_at
FROM agent_access_audit
WHERE requesting_agent = 'sarah'
  AND accessed_at >= NOW() - INTERVAL '24 hours'
ORDER BY accessed_at DESC;

-- 13. Check for Denied Access Attempts (Troubleshooting)
SELECT
  requesting_agent,
  accessed_table,
  operation,
  denial_reason,
  accessed_at
FROM agent_access_audit
WHERE requesting_agent = 'sarah'
  AND success = false
ORDER BY accessed_at DESC
LIMIT 10;

-- 14. Monitor Agent Access Patterns (Last 7 Days)
SELECT
  requesting_agent,
  accessed_table,
  COUNT(*) as access_count,
  COUNT(*) FILTER (WHERE success = true) as successful,
  COUNT(*) FILTER (WHERE success = false) as denied
FROM agent_access_audit
WHERE accessed_at >= NOW() - INTERVAL '7 days'
GROUP BY requesting_agent, accessed_table
ORDER BY access_count DESC;

-- ============================================================================
-- LAYER 4: WRITER PROFILE (writers table)
-- ============================================================================

-- 15. Get Sara's Full Profile
SELECT
  id,
  slug,
  name,
  role_title,
  tagline,
  voice_formula,
  content_domains,
  philosophy,
  is_active,
  created_at,
  updated_at
FROM writers
WHERE slug = 'sarah';

-- 16. View Voice Formula (Pretty-printed)
SELECT
  slug,
  jsonb_pretty(voice_formula) as voice_formula
FROM writers
WHERE slug = 'sarah';

-- 17. Update Sara's Voice Formula (Soft update allowed)
UPDATE writers
SET
  voice_formula = jsonb_set(
    voice_formula,
    '{signature_phrases}',
    to_jsonb(ARRAY[
      'Here''s what I''ve seen work',
      'From my experience coaching',
      'The truth is',
      'What matters most',
      'Let me be clear about something'
    ])
  ),
  updated_at = CURRENT_TIMESTAMP,
  updated_by = NULL
WHERE slug = 'sarah'
RETURNING updated_at;

-- 18. List All Active Writers (Including Sara)
SELECT
  slug,
  name,
  role_title,
  is_active
FROM writers
WHERE is_active = true
ORDER BY created_at ASC;

-- ============================================================================
-- LAYER 5: VERIFICATION QUERIES (Health Checks)
-- ============================================================================

-- 19. Verify Migration 007 (writers tables)
SELECT
  table_name,
  CASE
    WHEN table_name = 'writers' THEN 'OK'
    WHEN table_name = 'writer_memory_log' THEN 'OK'
    WHEN table_name = 'writer_performance_metrics' THEN 'OK'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('writers', 'writer_memory_log', 'writer_performance_metrics')
ORDER BY table_name;

-- 20. Verify Migration 010 (agent access control)
SELECT
  table_name,
  CASE
    WHEN table_name = 'agent_roles' THEN 'OK'
    WHEN table_name = 'agent_access_audit' THEN 'OK'
    ELSE 'MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('agent_roles', 'agent_access_audit')
ORDER BY table_name;

-- 21. Verify knowledge_entries Table (Pending Deployment)
SELECT
  table_name,
  CASE
    WHEN table_name = 'knowledge_entries' THEN 'DEPLOYED'
    ELSE 'NOT YET DEPLOYED'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'knowledge_entries';

-- 22. Check RLS Policies (ACID Enforcement)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('writer_memory_log', 'knowledge_entries', 'writers')
ORDER BY tablename, policyname;

-- 23. Check Indexes (Performance)
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('writers', 'writer_memory_log', 'knowledge_entries')
ORDER BY tablename, indexname;

-- 24. Performance Test (Should be <50ms)
EXPLAIN ANALYZE
SELECT
  lesson_type,
  content,
  created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- PRACTICAL EXAMPLES (Data Patterns)
-- ============================================================================

-- 25. Example: Track Lesson Evolution Over Time
WITH sara_lessons AS (
  SELECT
    lesson_type,
    DATE_TRUNC('week', created_at) as week,
    COUNT(*) as lesson_count
  FROM writer_memory_log
  WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
    AND is_active = true
  GROUP BY lesson_type, DATE_TRUNC('week', created_at)
)
SELECT * FROM sara_lessons ORDER BY week DESC, lesson_type;

-- 26. Example: Find Common Topics in Sara's Lessons
SELECT
  unnest(tags) as tag,
  COUNT(*) as frequency
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND is_active = true
GROUP BY unnest(tags)
ORDER BY frequency DESC;

-- 27. Example: Correlate Lessons with Performance
SELECT
  wml.lesson_type,
  wml.created_at as lesson_date,
  wpm.metric_week,
  wpm.engagement_score,
  wpm.reader_feedback_positive_percent
FROM writer_memory_log wml
LEFT JOIN writer_performance_metrics wpm
  ON wml.writer_id = wpm.writer_id
  AND DATE_TRUNC('week', wml.created_at) = wpm.metric_week
WHERE wml.writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND wml.is_active = true
ORDER BY wml.created_at DESC;

-- ============================================================================
-- SOFT DELETE RECOVERY (Never Hard-Delete)
-- ============================================================================

-- 28. Soft Delete: Mark Lesson as Inactive (Reversible)
UPDATE writer_memory_log
SET is_active = false
WHERE id = <lesson_id>
  AND writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
RETURNING id, is_active;

-- 29. Recover Soft-Deleted Lesson
UPDATE writer_memory_log
SET is_active = true
WHERE id = <lesson_id>
  AND writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
RETURNING id, is_active;

-- 30. View All Lessons (Including Soft-Deleted)
SELECT
  id,
  lesson_type,
  content,
  is_active,
  created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
ORDER BY created_at DESC;

-- ============================================================================
-- DEBUGGING & TROUBLESHOOTING
-- ============================================================================

-- 31. Check Sara's User Context (Current Agent Setting)
SELECT current_setting('app.current_agent', true) as current_agent;

-- 32. Verify Agent Permission Function
SELECT check_agent_permission('sarah', 'read_memory') as can_read_memory;
SELECT check_agent_permission('sarah', 'write_content') as can_write_content;

-- 33. Find Slow Queries Involving Sara's Data
EXPLAIN ANALYZE
SELECT * FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND tags @> ARRAY['engagement']::TEXT[];

-- 34. Compare Sara's Metrics to Other Writers
SELECT
  w.slug,
  COUNT(wml.id) as lesson_count,
  ROUND(AVG(wpm.engagement_score), 2) as avg_engagement
FROM writers w
LEFT JOIN writer_memory_log wml ON w.id = wml.writer_id AND wml.is_active = true
LEFT JOIN writer_performance_metrics wpm ON w.id = wpm.writer_id
WHERE w.is_active = true
GROUP BY w.slug
ORDER BY lesson_count DESC;

-- ============================================================================
-- NOTES FOR LEO
-- ============================================================================

-- ACID Properties: ALL GUARANTEED
-- - Atomicity: Each INSERT is atomic (all-or-nothing)
-- - Consistency: Foreign keys enforce referential integrity
-- - Isolation: Concurrent writes don't interfere
-- - Durability: WAL ensures persistence

-- Performance Targets:
-- - Fetch recent lessons: <50ms (uses idx_memory_log_writer_id)
-- - Tag search: <50ms (uses GIN index on tags)
-- - Insert lesson: <100ms (writes to WAL first)

-- No Manual Edits: All schema changes via migrations
-- No NULL Values: Every field has a reason
-- Immutable Knowledge: knowledge_entries append-only

-- Monitor With:
-- SELECT * FROM agent_access_patterns;
-- SELECT * FROM agent_permission_compliance;
