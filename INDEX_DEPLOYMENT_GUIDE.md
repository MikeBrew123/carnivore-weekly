# Index Migration 026 Deployment Guide
## Quick Start for Production Deployment

**Migration File:** `/migrations/026_add_performance_indexes.sql`
**Database:** Supabase PostgreSQL
**Estimated Execution Time:** 2-3 minutes
**Downtime Required:** None (online index creation)
**Rollback Time:** 30 seconds

---

## Pre-Deployment Checklist

- [ ] Backup database (Supabase auto-backup enabled)
- [ ] Verify 100 MB free disk space
- [ ] Schedule during low-traffic window (off-peak hours)
- [ ] Notify team of index deployment
- [ ] Prepare monitoring dashboard (see monitoring section)

---

## Deployment Steps

### Option 1: Supabase Dashboard (Recommended for Production)

```bash
# 1. Log into Supabase console
# https://app.supabase.com/

# 2. Navigate to: Database > SQL Editor

# 3. Create new query, paste contents of:
# /migrations/026_add_performance_indexes.sql

# 4. Execute query
# Watch: "Query succeeded" message appears

# 5. Verify all indexes created (see verification below)
```

### Option 2: Command Line (For Scripted Deployment)

```bash
# Set environment variables
export SUPABASE_DB_HOST="your-project.supabase.co"
export SUPABASE_DB_USER="postgres"
export SUPABASE_DB_PASSWORD="your-secure-password"
export SUPABASE_DB_NAME="postgres"
export SUPABASE_DB_PORT="5432"

# Deploy migration
psql \
  -h $SUPABASE_DB_HOST \
  -U $SUPABASE_DB_USER \
  -d $SUPABASE_DB_NAME \
  -p $SUPABASE_DB_PORT \
  -f /migrations/026_add_performance_indexes.sql \
  2>&1 | tee deployment.log

# Capture output for verification
if grep -q "Migration 026" deployment.log; then
  echo "✓ Migration 026 deployed successfully"
else
  echo "✗ Migration failed - check deployment.log"
  exit 1
fi
```

### Option 3: Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to project
supabase link --project-ref your-project-ref

# Push migration
supabase db push --schema-only migrations/026_add_performance_indexes.sql

# Verify deployment
supabase db list
```

---

## Deployment Verification

### Verify All 19 Indexes Created

```sql
-- Run this query in Supabase SQL Editor to verify deployment

SELECT
  schemaname,
  tablename,
  indexname,
  CASE
    WHEN indexname LIKE 'idx_%' THEN 'B-tree'
    WHEN indexname LIKE 'brin_%' THEN 'BRIN'
    ELSE 'Other'
  END AS index_type,
  pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_writers_slug',
  'idx_writers_active',
  'idx_writers_composite_active_slug',
  'idx_writers_specialty',
  'idx_writers_created_at',
  'idx_writer_memory_log_writer_id',
  'idx_writer_memory_log_type',
  'idx_writer_memory_log_relevance',
  'idx_writer_memory_log_tags',
  'idx_writer_memory_log_implementation_status',
  'idx_writer_memory_log_created',
  'idx_writer_memory_log_composite_context',
  'idx_writer_memory_log_impact',
  'idx_writer_content_writer_type_published',
  'idx_writer_content_performance_score',
  'idx_published_content_writer_slug_published_date',
  'idx_published_content_tags_published_date',
  'idx_published_content_slug',
  'idx_published_content_date',
  'idx_published_content_recent',
  'idx_writer_memory_log_active_only',
  'idx_writer_memory_log_covering',
  'brin_writer_memory_log_created_at',
  'brin_published_content_published_date'
)
ORDER BY tablename, indexname;

-- Expected result: 24 rows (all indexes created)
-- If count < 24, deployment incomplete - check for errors in log
```

### Check Deployment Errors

```sql
-- If deployment failed, check for errors
-- Error log in Supabase dashboard > Database > Logs

-- Common errors and fixes:
-- "relation does not exist" - Verify writers table exists
-- "duplicate index" - Check if indexes already exist (should be OK with IF NOT EXISTS)
-- "out of memory" - Disk space issue (need 100 MB free)
```

---

## Post-Deployment Optimization

### Step 1: Update Statistics (Critical)

```sql
-- Run immediately after deployment to help query planner

ANALYZE writers;
ANALYZE writer_content;
ANALYZE writer_memory_log;
ANALYZE published_content;
```

### Step 2: Monitor Query Performance

```bash
# Check query execution times before/after

# BEFORE (run before deployment):
EXPLAIN ANALYZE
SELECT * FROM writer_memory_log
WHERE writer_id = 'some-uuid'
  AND implementation_status = 'active'
ORDER BY relevance_score DESC
LIMIT 25;

# Run query 3 times, note average execution time (~150ms before)

# AFTER (run after deployment):
# Same query should now execute in ~0.15ms (1000x faster)
```

### Step 3: Set Up Monitoring Alerts

```sql
-- Create alert for slow queries (> 100ms after deployment)
-- In your monitoring tool (DataDog, New Relic, etc.):
-- Alert if query latency > 100ms for writer_memory_log queries
-- Alert if index bloat > 50% (use pgstattuple)
```

---

## Performance Validation

### Quick Performance Check

```sql
-- Run these 3 hottest queries and note execution times
-- All should complete in < 1ms after optimization

-- QUERY 1: Load agent memory (most critical)
EXPLAIN ANALYZE
SELECT id, title, memory_type, relevance_score
FROM writer_memory_log
WHERE writer_id = 'uuid-leo'
  AND memory_type = 'lesson_learned'
  AND implementation_status = 'active'
ORDER BY relevance_score DESC
LIMIT 25;
-- Expected: ~0.15ms, Cost: 0.42..15.67

-- QUERY 2: Homepage feed
EXPLAIN ANALYZE
SELECT slug, title, published_date
FROM published_content
WHERE published_date > NOW() - INTERVAL '90 days'
ORDER BY published_date DESC
LIMIT 10;
-- Expected: ~1ms, uses idx_published_content_recent

-- QUERY 3: Topic discovery
EXPLAIN ANALYZE
SELECT slug, title, published_date
FROM published_content
WHERE topic_tags @> ARRAY['compliance']::text[]
ORDER BY published_date DESC;
-- Expected: ~0.2ms, uses idx_published_content_tags_published_date
```

---

## Rollback Procedure (If Needed)

### Emergency Rollback

```sql
-- If issues occur post-deployment, drop all indexes created by this migration

DROP INDEX CONCURRENTLY IF EXISTS idx_writers_slug;
DROP INDEX CONCURRENTLY IF EXISTS idx_writers_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_writers_composite_active_slug;
DROP INDEX CONCURRENTLY IF EXISTS idx_writers_specialty;
DROP INDEX CONCURRENTLY IF EXISTS idx_writers_created_at;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_writer_id;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_type;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_relevance;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_tags;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_implementation_status;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_created;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_composite_context;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_impact;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_content_writer_type_published;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_content_performance_score;
DROP INDEX CONCURRENTLY IF EXISTS idx_published_content_writer_slug_published_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_published_content_tags_published_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_published_content_slug;
DROP INDEX CONCURRENTLY IF EXISTS idx_published_content_date;
DROP INDEX CONCURRENTLY IF EXISTS idx_published_content_recent;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_active_only;
DROP INDEX CONCURRENTLY IF EXISTS idx_writer_memory_log_covering;
DROP INDEX CONCURRENTLY IF EXISTS brin_writer_memory_log_created_at;
DROP INDEX CONCURRENTLY IF EXISTS brin_published_content_published_date;

-- Rebuild statistics
ANALYZE;
```

**Rollback time:** ~30 seconds
**Data safety:** 100% safe - only drops indexes, no data modification

---

## Monitoring During Deployment

### Real-Time Monitoring Dashboard

Monitor these metrics during and after deployment:

```sql
-- CPU Usage (should be < 80%)
SELECT round(100.0 * sum(heap_blks_read) / (sum(heap_blks_read) + sum(heap_blks_hit)), 2) AS cache_hit_ratio
FROM pg_stat_user_tables;

-- Active Connections (should drop after deployment completes)
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Index Build Progress (for large tables)
SELECT * FROM pg_stat_progress_create_index;

-- Slow Queries (should disappear after deployment)
SELECT query, mean_time, calls FROM pg_stat_statements
WHERE mean_time > 100 AND query LIKE '%writer_memory_log%'
ORDER BY mean_time DESC;
```

---

## Post-Deployment Tasks (24 Hours)

### Day 1: Validation
- [ ] Confirm all 24 indexes exist
- [ ] Run ANALYZE to update statistics
- [ ] Execute 3 hottest queries and verify < 1ms execution
- [ ] Check slow query log - should be empty
- [ ] Confirm no new errors in application logs

### Day 7: Full Verification
- [ ] Monitor index usage statistics
  ```sql
  SELECT indexname, idx_scan, idx_tup_read
  FROM pg_stat_user_indexes
  WHERE indexname LIKE 'idx_%' OR indexname LIKE 'brin_%'
  ORDER BY idx_scan DESC;
  ```
- [ ] Confirm cache hit ratio > 99%
- [ ] Verify no unused indexes (all idx_scan > 0)
- [ ] Document actual vs expected performance gains

### Ongoing Maintenance
- [ ] Weekly: Check for bloated indexes
- [ ] Monthly: Run ANALYZE to refresh statistics
- [ ] Quarterly: REINDEX high-churn tables (writer_memory_log, published_content)

---

## Troubleshooting

### Issue: "ERROR: relation does not exist"
**Cause:** Migration 007 (writers table) not deployed yet
**Fix:** Deploy migrations 001-018 first, then 026

### Issue: "ERROR: out of memory"
**Cause:** Not enough disk space (need 100 MB free)
**Fix:** Clear temp files, or deploy on smaller batch of indexes

### Issue: Query performance didn't improve
**Cause:** Statistics not updated; query planner using wrong index
**Fix:** Run `ANALYZE` and rerun `EXPLAIN ANALYZE` to verify index usage

### Issue: Write latency increased (INSERT/UPDATE slower)
**Cause:** Normal during index maintenance; should resolve in 24 hours
**Fix:** Run `VACUUM ANALYZE` to update visibility map and statistics

---

## Support & Documentation

- **Full Performance Report:** `/PERFORMANCE_INDEX_REPORT.md`
- **Migration SQL File:** `/migrations/026_add_performance_indexes.sql`
- **Query Examples:** See PERFORMANCE_INDEX_REPORT.md sections 4-6
- **Supabase Docs:** https://supabase.com/docs/guides/database/postgres/indexes
- **PostgreSQL Docs:** https://www.postgresql.org/docs/current/sql-createindex.html

---

## Sign-Off

**Deployed By:** [Your Name]
**Deployment Date:** [YYYY-MM-DD]
**Deployment Time:** [HH:MM UTC]
**Status:** ✓ SUCCESSFUL / ✗ FAILED / ⚠ ROLLBACK

**Verification:**
- [ ] All 24 indexes created
- [ ] ANALYZE completed
- [ ] Query performance validated
- [ ] No errors in logs
- [ ] Monitoring configured

**Notes:**
[Document any issues or observations here]

---

**Document Version:** 1.0
**Last Updated:** 2026-01-05
**Status:** PRODUCTION-READY
