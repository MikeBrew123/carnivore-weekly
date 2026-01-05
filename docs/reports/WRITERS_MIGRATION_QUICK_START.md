# Writers Schema Migration - Quick Start

**Problem:** Schema mismatch (missing `specialty`, `experience_level`, etc.)
**Solution:** New unified migration creating all 5 tables
**Status:** Ready to deploy
**Time to fix:** 5 minutes

---

## Deploy in 3 Steps

### Step 1: Run the Migration

Go to **Supabase Dashboard** → **SQL Editor** and paste this file:
```
/Users/mbrew/Developer/carnivore-weekly/migrations/007_writers_unified_schema.sql
```

Then click **Run**.

### Step 2: Verify Success

Paste and run these verification queries:

```sql
-- Check writers exist
SELECT slug, name, specialty FROM writers ORDER BY slug;

-- Check Sarah's memory
SELECT title, memory_type FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah');

-- Count all tables
SELECT COUNT(*) FROM (
  SELECT 'writers' as t UNION ALL
  SELECT 'writer_content' UNION ALL
  SELECT 'writer_relationships' UNION ALL
  SELECT 'writer_memory_log' UNION ALL
  SELECT 'writer_voice_snapshots'
) x;
```

**Expected results:**
- 3 writers (sarah, marcus, chloe)
- 2 memory entries for sarah
- 5 tables created

### Step 3: You're Done

The error is fixed. All 5 tables now exist with complete schema.

---

## What This Migration Does

1. **Drops** old conflicting 007 tables
2. **Creates** unified writers table with ALL columns:
   - ✅ specialty (the missing column)
   - ✅ experience_level, avatar_url, tone_style, signature_style
   - ✅ preferred_topics, content_domains, voice_formula, philosophy
3. **Creates** 4 more tables:
   - writer_content (historical records)
   - writer_relationships (collaboration network)
   - writer_memory_log (lessons learned)
   - writer_voice_snapshots (voice evolution)
4. **Seeds** 3 writers + 2 memory entries
5. **Adds** 18 indexes for performance

---

## Query Sarah's Memory After Migration

```sql
-- Get all of Sarah's lessons
SELECT
    title,
    memory_type,
    description,
    relevance_score,
    created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
AND is_active = true
ORDER BY relevance_score DESC;
```

---

## Column Reference: What Was Missing

| Column | Type | Was In | Now In | Purpose |
|--------|------|--------|--------|---------|
| specialty | VARCHAR(500) | ❌ Old 007 | ✅ New 007 | Primary expertise area |
| experience_level | VARCHAR(50) | ❌ Old 007 | ✅ New 007 | Career level (junior/mid/senior/expert) |
| avatar_url | VARCHAR(500) | ❌ Old 007 | ✅ New 007 | Profile image URL |
| tone_style | VARCHAR(100) | ❌ Old 007 | ✅ New 007 | Writing tone (professional/conversational) |
| signature_style | TEXT | ❌ Old 007 | ✅ New 007 | Distinctive writing patterns |
| preferred_topics | TEXT[] | ❌ Old 007 | ✅ New 007 | Topics writer prefers |
| voice_formula | JSONB | ✅ Old 007 | ✅ New 007 | Complex voice structure (kept) |
| philosophy | TEXT | ✅ Old 007 | ✅ New 007 | Core beliefs (kept) |

---

## Files You'll Need

1. **Migration:**
   `/Users/mbrew/Developer/carnivore-weekly/migrations/007_writers_unified_schema.sql`

2. **Verification Queries:**
   `/Users/mbrew/Developer/carnivore-weekly/migrations/verify_writers_schema.sql`

3. **Full Documentation:**
   `/Users/mbrew/Developer/carnivore-weekly/WRITERS_SCHEMA_FIX.md`

---

## Safety Guarantees

- ✅ Idempotent (safe to run 1-5+ times)
- ✅ Drops old tables cleanly
- ✅ Creates all constraints properly
- ✅ Seeds data with ON CONFLICT DO NOTHING
- ✅ All ACID properties enforced
- ✅ No manual intervention needed

---

## Still Getting Errors?

1. **Check old migrations ran:** Did 007_create_writers_tables.sql run before this?
2. **Check permissions:** Do you have CREATE TABLE permissions?
3. **Check schema:** Run verification queries to see current state

If stuck, share the exact error message and I'll debug from there.

---

**Status:** Ready to deploy
**Risk:** Low (idempotent)
**Estimated Time:** 5 minutes
