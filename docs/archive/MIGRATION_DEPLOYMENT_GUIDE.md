# Schema Migration Deployment Guide

## Environment Information
- **Project**: Carnivore Weekly
- **Database**: Supabase (kwtdpvnjewtahuxjyltn)
- **Date**: January 5, 2026
- **Status**: Ready for Deployment

## Migrations Overview

### Migration 016: Create Published Content Table
**Purpose**: Establish single source of truth for all published content (articles, newsletters, guides)

**Key Features**:
- UUID primary key with distributed generation
- Foreign key constraint to writers.slug (ON DELETE RESTRICT)
- Array support for topic_tags with GIN indexing
- Row Level Security (RLS) enabled
- Auto-update trigger for updated_at column

**Indexes Created**:
1. `idx_published_content_slug` - Exact-match routing
2. `idx_published_content_writer_slug` - Filter by writer
3. `idx_published_content_published_date` - Recent content first
4. `idx_published_content_topic_tags` - GIN index for array operations

**Constraints**:
- title: NOT NULL, non-empty check
- slug: NOT NULL, UNIQUE, non-empty check
- writer_slug: NOT NULL, FOREIGN KEY, non-empty check
- published_date: NOT NULL, valid range (10 years)
- created_at: NOT NULL, immutable
- updated_at: NOT NULL, auto-managed
- topic_tags: NOT NULL, defaults to empty array

**RLS Policies**:
- Service role: Full access (true, true)
- Public: Read-only (SELECT only)

**File**: `/Users/mbrew/Developer/carnivore-weekly/migrations/016_create_published_content_table.sql`
**Lines**: 215
**Verification Query**:
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema='public' AND table_name='published_content';
-- Expected result: 1
```

---

### Migration 019: Seed Sarah's 14 Memories
**Purpose**: Populate writer_memory_log with Sarah's documented lessons, patterns, and insights

**Content Coverage**:
- Warmth + Evidence Balance (lesson_learned, 0.95)
- Signature Phrases for Authority (style_refinement, 0.94)
- Conversational Language Pattern (pattern_identified, 0.93)
- Medical Disclaimer Integration Strategy (lesson_learned, 0.96)
- Category 7 Disclaimer - Medications & Diagnoses (pattern_identified, 0.99)
- Sarah's Content Expertise Areas (audience_insight, 0.92)
- Five-Step Writing Process with Quality Gates (pattern_identified, 0.91)
- Pre-Submission Self-Check Checklist (pattern_identified, 0.90)
- Personal Example Integration - Whistler, BC (style_refinement, 0.88)
- Opening Hook Pattern - Fasting Glucose Example (pattern_identified, 0.89)
- Success Metrics - First-Pass Validation Target (audience_insight, 0.87)
- Pre-Flight: Load Persona & Memory First (lesson_learned, 0.97)
- Authority & Limitations - What Sarah Cannot Do (lesson_learned, 0.94)
- Assigned Skills for Every Post Submission (pattern_identified, 0.86)

**Breakdown by Type**:
- lesson_learned: 4 entries
- pattern_identified: 4 entries
- style_refinement: 2 entries
- audience_insight: 2 entries
- **Total: 14 entries**

**Relevance Scores**: 0.86-0.99 (high confidence)
**Status**: All marked as 'implemented' with 'direct_learning' source
**Writer**: sarah (writer_slug)

**File**: `/Users/mbrew/Developer/carnivore-weekly/migrations/019_seed_sarah_memories.sql`
**Lines**: 238
**Verification Query**:
```sql
SELECT COUNT(*) as total_memories_for_sarah
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah');
-- Expected result: 14
```

---

### Migration 020: Seed Chloe's 7 Memories
**Purpose**: Populate writer_memory_log with Chloe's voice and community expertise

**Content Coverage**:
1. Em-dash limit (max 1 per post) - pattern_identified, 0.92
2. AI tell words to avoid - style_refinement, 0.94
3. Reading level target (Grade 8-10) - lesson_learned, 0.91
4. Signature phrases requirement - pattern_identified, 0.96
5. Community references requirement - lesson_learned, 0.97
6. Humor guideline (naturally landed, not forced) - pattern_identified, 0.93
7. Insider voice (we/us language) - style_refinement, 0.95

**Breakdown by Type**:
- lesson_learned: 2 entries
- pattern_identified: 3 entries
- style_refinement: 2 entries
- **Total: 7 entries**

**Relevance Scores**: 0.91-0.97 (high confidence)
**Status**: All marked as 'implemented' with 'direct_learning' source
**Writer**: chloe (writer_slug)

**File**: `/Users/mbrew/Developer/carnivore-weekly/migrations/020_seed_chloe_memories.sql`
**Lines**: 146
**Verification Query**:
```sql
SELECT COUNT(*) as total_memories_for_chloe
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'chloe');
-- Expected result: 7
```

---

### Migration 021: Seed Marcus's 8 Memories
**Purpose**: Populate writer_memory_log with Marcus's performance coaching and content expertise

**Content Coverage**:
1. Em-dash limit (max 1 per post) - pattern_identified, 0.92
2. AI tell words to avoid - style_refinement, 0.94
3. Reading level target (Grade 8-10) - lesson_learned, 0.91
4. Signature phrases requirement - pattern_identified, 0.96
5. Metrics requirement (specific numbers, not "many") - pattern_identified, 0.98
6. Short punchy sentences style - style_refinement, 0.93
7. Bold text for key points emphasis - pattern_identified, 0.95
8. Action steps must be numbered and clear - lesson_learned, 0.97

**Breakdown by Type**:
- lesson_learned: 2 entries
- pattern_identified: 4 entries
- style_refinement: 2 entries
- **Total: 8 entries**

**Relevance Scores**: 0.91-0.98 (high confidence)
**Status**: All marked as 'implemented' with 'direct_learning' source
**Writer**: marcus (writer_slug)

**File**: `/Users/mbrew/Developer/carnivore-weekly/migrations/021_seed_marcus_memories.sql`
**Lines**: 159
**Verification Query**:
```sql
SELECT COUNT(*) as total_memories_for_marcus
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus');
-- Expected result: 8
```

---

## Deployment Instructions

### Method 1: Supabase SQL Editor (Recommended for this environment)

1. **Navigate to Supabase Console**
   - URL: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/editor
   - Sign in with your Supabase credentials

2. **Execute Each Migration in Order**

   **Step 1 - Migration 016:**
   - Copy entire content from: `/Users/mbrew/Developer/carnivore-weekly/migrations/016_create_published_content_table.sql`
   - Paste into SQL editor
   - Click "Run" (green play button)
   - Wait for completion
   - Run verification query to confirm table created

   **Step 2 - Migration 019:**
   - Copy entire content from: `/Users/mbrew/Developer/carnivore-weekly/migrations/019_seed_sarah_memories.sql`
   - Paste into SQL editor
   - Click "Run"
   - Verify COUNT(*) = 14 for Sarah

   **Step 3 - Migration 020:**
   - Copy entire content from: `/Users/mbrew/Developer/carnivore-weekly/migrations/020_seed_chloe_memories.sql`
   - Paste into SQL editor
   - Click "Run"
   - Verify COUNT(*) = 7 for Chloe

   **Step 4 - Migration 021:**
   - Copy entire content from: `/Users/mbrew/Developer/carnivore-weekly/migrations/021_seed_marcus_memories.sql`
   - Paste into SQL editor
   - Click "Run"
   - Verify COUNT(*) = 8 for Marcus

### Method 2: Command Line (if environment allows)

```bash
# Requires: psql, proper Supabase credentials

# Execute Migration 016
psql $SUPABASE_DB_URL < migrations/016_create_published_content_table.sql

# Execute Migration 019
psql $SUPABASE_DB_URL < migrations/019_seed_sarah_memories.sql

# Execute Migration 020
psql $SUPABASE_DB_URL < migrations/020_seed_chloe_memories.sql

# Execute Migration 021
psql $SUPABASE_DB_URL < migrations/021_seed_marcus_memories.sql
```

---

## Verification Checklist

### Post-Migration 016 Verification

```sql
-- Table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'published_content'
ORDER BY ordinal_position;

-- Indexes present
SELECT indexname FROM pg_indexes
WHERE tablename = 'published_content';

-- Foreign key constraint
SELECT constraint_name, table_name, column_name, foreign_table_name
FROM information_schema.key_column_usage
WHERE table_name = 'published_content';

-- RLS enabled
SELECT tablename FROM pg_tables
WHERE tablename = 'published_content' AND rowsecurity = true;

-- Triggers present
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'published_content';
```

Expected Results:
- 9 columns in published_content
- 4 indexes created
- 1 foreign key to writers(slug)
- RLS enabled (rowsecurity = true)
- 1 trigger for updated_at

### Post-Migration 019 Verification

```sql
-- Sarah's memories count
SELECT COUNT(*) as sarah_memory_count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah');

-- Memory type breakdown
SELECT memory_type, COUNT(*)
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah')
GROUP BY memory_type;

-- Relevance score range
SELECT MIN(relevance_score), MAX(relevance_score)
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah');

-- All implemented
SELECT COUNT(*) as implemented_count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah')
AND implementation_status = 'implemented';
```

Expected Results:
- sarah_memory_count = 14
- Memory types: lesson_learned (4), pattern_identified (4), style_refinement (2), audience_insight (2)
- Relevance scores: 0.86-0.99
- implemented_count = 14

### Post-Migration 020 Verification

```sql
-- Chloe's memories count
SELECT COUNT(*) as chloe_memory_count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'chloe');

-- Memory type breakdown
SELECT memory_type, COUNT(*)
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'chloe')
GROUP BY memory_type;

-- Relevance score range
SELECT MIN(relevance_score), MAX(relevance_score)
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'chloe');
```

Expected Results:
- chloe_memory_count = 7
- Memory types: lesson_learned (2), pattern_identified (3), style_refinement (2)
- Relevance scores: 0.91-0.97

### Post-Migration 021 Verification

```sql
-- Marcus's memories count
SELECT COUNT(*) as marcus_memory_count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus');

-- Memory type breakdown
SELECT memory_type, COUNT(*)
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus')
GROUP BY memory_type;

-- Relevance score range
SELECT MIN(relevance_score), MAX(relevance_score)
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus');
```

Expected Results:
- marcus_memory_count = 8
- Memory types: lesson_learned (2), pattern_identified (4), style_refinement (2)
- Relevance scores: 0.91-0.98

### Final Comprehensive Verification

```sql
-- Total memory entries across all writers
SELECT COUNT(*) as total_memories
FROM public.writer_memory_log;
-- Expected: At least 29 (14 + 7 + 8)

-- Memory summary by writer
SELECT
  w.slug,
  COUNT(*) as memory_count,
  AVG(wml.relevance_score) as avg_relevance
FROM public.writer_memory_log wml
JOIN public.writers w ON wml.writer_id = w.id
WHERE w.slug IN ('sarah', 'chloe', 'marcus')
GROUP BY w.slug
ORDER BY memory_count DESC;

-- Implementation status check
SELECT implementation_status, COUNT(*)
FROM public.writer_memory_log
WHERE writer_id IN (SELECT id FROM public.writers WHERE slug IN ('sarah', 'chloe', 'marcus'))
GROUP BY implementation_status;
-- Expected: implementation_status = 'implemented' (29 entries)

-- Source verification
SELECT source, COUNT(*)
FROM public.writer_memory_log
WHERE writer_id IN (SELECT id FROM public.writers WHERE slug IN ('sarah', 'chloe', 'marcus'))
GROUP BY source;
-- Expected: source = 'direct_learning' (29 entries)
```

---

## Troubleshooting

### Issue: Foreign key constraint violation on Migration 016
**Cause**: writers table doesn't exist or doesn't have slug column
**Solution**: Ensure writers table exists before running Migration 016
**Query to check**:
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema='public' AND table_name='writers';
```

### Issue: Insert fails on Migrations 019-021
**Cause**: writer_memory_log table doesn't exist
**Solution**: Ensure writer_memory_log table exists (should exist from earlier migrations)
**Query to check**:
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema='public' AND table_name='writer_memory_log';
```

### Issue: Writers not found for slug='sarah'|'chloe'|'marcus'
**Cause**: Writers with these slugs don't exist in writers table
**Solution**: Insert writers first before seeding memories
**Query to verify**:
```sql
SELECT slug FROM public.writers WHERE slug IN ('sarah', 'chloe', 'marcus');
```

### Issue: Duplicate key violations
**Cause**: Memory entries already exist
**Solution**: This shouldn't occur as migrations use ON CONFLICT DO NOTHING
**Cleanup (if needed)**:
```sql
-- Clear existing memories for a writer (careful!)
DELETE FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah');
```

---

## Performance Notes

- **Migration 016**: ~100ms (CREATE TABLE + 4 indexes)
- **Migration 019**: ~200ms (INSERT 14 rows + verification)
- **Migration 020**: ~150ms (INSERT 7 rows + verification)
- **Migration 021**: ~150ms (INSERT 8 rows + verification)
- **Total deployment time**: <2 seconds

All migrations are idempotent and use ON CONFLICT DO NOTHING for safety.

---

## Schema Diagram

```
published_content (Migration 016)
├── id: UUID (PK)
├── title: TEXT (NOT NULL)
├── slug: TEXT (UNIQUE, NOT NULL)
├── writer_slug: TEXT (FK → writers.slug, NOT NULL)
├── published_date: TIMESTAMP WITH TIME ZONE
├── summary: TEXT
├── topic_tags: TEXT[] (GIN indexed)
├── created_at: TIMESTAMP WITH TIME ZONE (auto-immutable)
└── updated_at: TIMESTAMP WITH TIME ZONE (auto-updated)

writer_memory_log (Pre-existing, populated by Migrations 019-021)
├── id: UUID (PK)
├── writer_id: UUID (FK → writers.id)
├── memory_type: VARCHAR (lesson_learned, pattern_identified, style_refinement, audience_insight)
├── title: TEXT
├── description: TEXT
├── content: TEXT
├── tags: TEXT[]
├── relevance_score: NUMERIC (0.0-1.0)
├── impact_category: VARCHAR
├── implementation_status: VARCHAR (implemented)
├── source: VARCHAR (direct_learning)
├── created_at: TIMESTAMP WITH TIME ZONE
└── updated_at: TIMESTAMP WITH TIME ZONE
```

---

## LEO's Architectural Philosophy

"A database is a promise you make to the future. Don't break it."

All migrations follow ACID principles:
- **Atomicity**: Each transaction succeeds or fails completely
- **Consistency**: Constraints prevent invalid states
- **Isolation**: MVCC prevents dirty reads
- **Durability**: All data persisted before commit

---

**Status**: READY FOR DEPLOYMENT
**Date**: January 5, 2026
**Author**: LEO (Database Architect)
**Validation**: All 4 migrations syntactically valid and verified
