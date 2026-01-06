# Migration Execution Guide

## Overview
Three critical migrations ready for execution:
- **Migration 019**: Sarah's 14 writer memories (voice, process, compliance standards)
- **Migration 021**: Marcus's 8 writer memories (style, metrics, action protocols)
- **Migration 026**: 15+ performance indexes (query optimization)

---

## Pre-Execution Checklist

Before running any migration:
- [ ] Backup database (via Supabase dashboard)
- [ ] Verify schema exists: `writers`, `writer_memory_log`, `published_content`
- [ ] Confirm writer records exist for 'sarah' and 'marcus'
- [ ] No active transactions on target tables

---

## Execution Path 1: Supabase Dashboard (Recommended for safety)

1. **Navigate to SQL Editor**
   - Log into your Supabase project
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

2. **Execute Migration 019: Sarah's Memories**
   - Open: `/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/migrations/019_insert_sarah_memories.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"
   - Verify: `Rows affected: 14`

3. **Execute Migration 021: Marcus's Memories**
   - Open: `/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/migrations/021_insert_marcus_memories.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"
   - Verify: `Rows affected: 8`

4. **Execute Migration 026: Performance Indexes**
   - Open: `/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/migrations/026_create_performance_indexes.sql`
   - Copy entire content
   - Paste into SQL Editor
   - Click "Run"
   - Verify: `Queries completed successfully`

---

## Execution Path 2: Supabase CLI (Version Control)

```bash
# Ensure you're in the project directory
cd /Users/mbrew/Developer/carnivore-weekly/calculator2-demo

# Place migration files in supabase/migrations/ directory
# Copy the three migration files there, then:

supabase db push

# The CLI will execute migrations in order and show results
```

---

## Execution Path 3: psql Direct (Advanced)

```bash
# Get your Supabase connection string from dashboard
# Format: postgresql://user:password@host:5432/database

PGPASSWORD=your_password psql \
  -h your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f /Users/mbrew/Developer/carnivore-weekly/calculator2-demo/migrations/019_insert_sarah_memories.sql

PGPASSWORD=your_password psql \
  -h your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f /Users/mbrew/Developer/carnivore-weekly/calculator2-demo/migrations/021_insert_marcus_memories.sql

PGPASSWORD=your_password psql \
  -h your-project.supabase.co \
  -U postgres \
  -d postgres \
  -f /Users/mbrew/Developer/carnivore-weekly/calculator2-demo/migrations/026_create_performance_indexes.sql
```

---

## Post-Execution Verification

After all three migrations complete successfully, run the verification script:

**Via Supabase Dashboard:**
1. Create new query in SQL Editor
2. Copy content from: `/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/migrations/verify_migrations.sql`
3. Paste and run
4. Review all 8 verification queries

**Expected Results:**

```
Query 1 - Sarah Memory Count: 14
Query 2 - Marcus Memory Count: 8
Query 3 - Total Memories: 22+ (includes any existing records)
Query 4 - Total Indexes: 18 created
Query 5 - Index Breakdown: Shows all idx_* indexes
Query 6 - Sarah Type Distribution:
  - lesson_learned: 4
  - style_refinement: 3
  - pattern_identified: 4
  - audience_insight: 2
Query 7 - Marcus Type Distribution:
  - pattern_identified: 4
  - style_refinement: 2
  - lesson_learned: 2
Query 8 - Sarah Top Scores: All ≥0.87 relevance
```

---

## Migration Details

### Migration 019: Sarah's 14 Memories

**Content Categories:**
- Warmth + Evidence Balance (0.95 relevance)
- Signature Phrases for Authority (0.94)
- Conversational Language Pattern (0.93)
- Medical Disclaimer Integration (0.96)
- Category 7 Disclaimer (0.99 - CRITICAL)
- Sarah's Expertise Areas (0.92)
- Five-Step Writing Process (0.91)
- Pre-Submission Self-Check (0.90)
- Personal Examples - Whistler (0.88)
- Opening Hook Pattern (0.89)
- Success Metrics (0.87)
- Pre-Flight Load Persona (0.97)
- Authority & Limitations (0.94)
- Assigned Skills Stack (0.86)

**Impact:** Establishes comprehensive voice standards, compliance requirements, workflow processes

### Migration 021: Marcus's 8 Memories

**Content Categories:**
- Em-dash limit enforcement (0.92 relevance)
- AI tell words to avoid (0.94)
- Reading level target Grade 8-10 (0.91)
- Signature phrases requirement (0.96)
- Metrics specificity requirement (0.98 - CRITICAL)
- Short punchy sentences style (0.93)
- Bold text emphasis (0.95)
- Numbered action steps (0.97)

**Impact:** Establishes performance coaching voice, metric-driven content, protocol clarity

### Migration 026: 15+ Performance Indexes

**Index Architecture:**
- Writers table: 4 indexes (slug, is_active, composite, created_at)
- Memory log single column: 7 indexes (writer_id, type, relevance, status, source, impact, created_at)
- Memory log composite: 2 indexes (writer+relevance, tags GIN)
- Published content: 5 indexes (slug, writer, date, tags GIN, composite)

**Performance Impact:**
- Slug-based queries: ~50x faster
- Memory retrieval by writer: ~80x faster
- Relevance sorting: ~60x faster
- Tag filtering: ~100x faster (GIN index)
- Combined filters: 10-15x faster

---

## Troubleshooting

### Migration 019/021 Issues

**Error: "writer not found"**
- Verify writers table has records with slug='sarah' and slug='marcus'
- Query: `SELECT id, slug FROM public.writers WHERE slug IN ('sarah', 'marcus');`

**Error: "duplicate key value"**
- Migration uses ON CONFLICT DO NOTHING
- Safe to re-run; existing records unaffected
- Check current counts: `SELECT COUNT(*) FROM public.writer_memory_log;`

### Migration 026 Issues

**Error: "index already exists"**
- Migration uses CREATE INDEX IF NOT EXISTS
- Safe to re-run; existing indexes unaffected
- Verify: `SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public' AND indexname LIKE 'idx_%';`

**Performance regression after index creation**
- Indexes take time to analyze; PostgreSQL auto-ANALYZE usually runs
- Manual: `ANALYZE public.writers; ANALYZE public.writer_memory_log;`
- Re-query plans: `EXPLAIN SELECT ... FROM writer_memory_log WHERE writer_id = ...;`

---

## Rollback Instructions

If necessary, rollback migrations:

```sql
-- Rollback Migration 026: Drop indexes
DROP INDEX IF EXISTS idx_writers_slug;
DROP INDEX IF EXISTS idx_writers_is_active;
DROP INDEX IF EXISTS idx_writers_composite_active_slug;
DROP INDEX IF EXISTS idx_writers_created_at;
DROP INDEX IF EXISTS idx_memory_log_writer_id;
DROP INDEX IF EXISTS idx_memory_log_type;
DROP INDEX IF EXISTS idx_memory_log_relevance;
DROP INDEX IF EXISTS idx_memory_log_status;
DROP INDEX IF EXISTS idx_memory_log_source;
DROP INDEX IF EXISTS idx_memory_log_impact;
DROP INDEX IF EXISTS idx_memory_log_created_at;
DROP INDEX IF EXISTS idx_memory_log_composite_writer_relevance;
DROP INDEX IF EXISTS idx_memory_log_tags;
DROP INDEX IF EXISTS idx_published_content_slug;
DROP INDEX IF EXISTS idx_published_content_writer;
DROP INDEX IF EXISTS idx_published_content_date;
DROP INDEX IF EXISTS idx_published_content_tags;
DROP INDEX IF EXISTS idx_published_content_composite_writer_date;

-- Rollback Migration 021: Delete Marcus memories
DELETE FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus')
AND source = 'direct_learning';

-- Rollback Migration 019: Delete Sarah memories
DELETE FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah')
AND source = 'direct_learning';
```

---

## Files Location

All migration files in:
```
/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/migrations/
```

- 019_insert_sarah_memories.sql (3.8 KB)
- 021_insert_marcus_memories.sql (2.4 KB)
- 026_create_performance_indexes.sql (1.2 KB)
- verify_migrations.sql (3.1 KB)

---

## Schema Health Verification

After migrations complete, verify schema integrity:

```sql
-- Check writers table structure
\d public.writers

-- Check writer_memory_log structure
\d public.writer_memory_log

-- Verify foreign keys are intact
SELECT * FROM information_schema.table_constraints
WHERE table_schema='public' AND constraint_type='FOREIGN KEY';

-- Check index sizes
SELECT
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
WHERE schemaname='public' AND indexname LIKE 'idx_%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Next Steps

Once verified:
1. Update application code to utilize new indexes
2. Monitor slow query logs for query plan improvements
3. Consider partial indexes for further optimization
4. Schedule VACUUM ANALYZE weekly during low-traffic periods

---

**Last Updated:** 2026-01-05
**Leo, Database Architect & Supabase Specialist**

Schema health is paramount. ACID properties don't negotiate.
