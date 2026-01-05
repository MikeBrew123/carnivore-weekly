# Migration 016 - Quick Reference Card

**LEO's Golden Rules for `published_content`**

---

## The Table (9 Columns)

```
id               UUID      PRIMARY KEY (auto)
title            TEXT      NOT NULL
slug             TEXT      NOT NULL UNIQUE
writer_slug      TEXT      NOT NULL → writers.slug
published_date   TIMESTAMP DEFAULT NOW()
summary          TEXT
topic_tags       TEXT[]    GIN-indexed
created_at       TIMESTAMP DEFAULT NOW() (immutable)
updated_at       TIMESTAMP DEFAULT NOW() (auto-updated)
```

---

## The Constraints

| Type | What | Why |
|------|------|-----|
| PK | `id` | Distributed primary key |
| UNIQUE | `slug` | URL routing requires uniqueness |
| FK | `writer_slug → writers.slug` ON DELETE RESTRICT | Prevents orphaned content |
| CHECK | 5 constraints | Enforce valid data (no empty strings, valid dates) |

---

## The Indexes (4 Total)

| Name | Type | For |
|------|------|-----|
| `idx_published_content_slug` | UNIQUE B-tree | Router: `WHERE slug = $1` |
| `idx_published_content_writer_slug` | Partial B-tree | Filter: `WHERE writer_slug = $1` |
| `idx_published_content_published_date` | B-tree DESC | Sort: `ORDER BY published_date DESC` |
| `idx_published_content_topic_tags` | GIN | Array: `WHERE topic_tags && $1` |

---

## The Trigger

**Name**: `trigger_published_content_updated_at`

**What it does**: Automatically sets `updated_at = CURRENT_TIMESTAMP` when any UPDATE occurs.

**Your job**: Never manually set `updated_at`. The trigger will do it.

---

## Safe Patterns (Copy & Paste)

### INSERT New Content
```sql
INSERT INTO public.published_content (
    title,
    slug,
    writer_slug,
    published_date,
    topic_tags,
    summary
)
VALUES (
    'Article Title',
    'url-safe-slug',
    'writer-slug',  -- Must exist in writers table
    CURRENT_TIMESTAMP,
    ARRAY['tag1', 'tag2', 'tag3'],
    'Short summary here'
)
ON CONFLICT (slug) DO NOTHING
RETURNING id, slug, created_at;
```

### SELECT by Slug (Router)
```sql
SELECT * FROM public.published_content WHERE slug = 'url-safe-slug';
```

### SELECT Recent (Homepage)
```sql
SELECT id, title, slug, writer_slug, published_date, summary
FROM public.published_content
ORDER BY published_date DESC
LIMIT 10;
```

### SELECT by Writer
```sql
SELECT id, title, slug, published_date
FROM public.published_content
WHERE writer_slug = 'sarah'
ORDER BY published_date DESC;
```

### SELECT by Topic (Has ANY)
```sql
-- Articles with 'nutrition' OR 'recipes'
SELECT * FROM public.published_content
WHERE topic_tags && ARRAY['nutrition', 'recipes']
ORDER BY published_date DESC;
```

### SELECT by Topic (Has ALL)
```sql
-- Articles with 'nutrition' AND 'recipes'
SELECT * FROM public.published_content
WHERE topic_tags @> ARRAY['nutrition', 'recipes']
ORDER BY published_date DESC;
```

### UPDATE Content
```sql
UPDATE public.published_content
SET
    title = 'New Title',
    summary = 'New summary',
    topic_tags = ARRAY['tag1', 'tag2']
WHERE slug = 'url-safe-slug'
RETURNING id, updated_at;
```

**Important**: Don't set `updated_at` — the trigger will do it automatically.

### DELETE Content
```sql
DELETE FROM public.published_content WHERE slug = 'url-safe-slug';
```

---

## What Can Go Wrong (& How to Fix)

### Error: "violates foreign key constraint"
**Cause**: Invalid `writer_slug`
```sql
-- Check valid writers
SELECT slug FROM writers WHERE is_active = TRUE;
-- Use one of these slugs in your insert
```

### Error: "duplicate key value violates unique constraint"
**Cause**: Slug already exists
```sql
-- Use ON CONFLICT DO NOTHING (shown above)
-- OR check slug first:
SELECT id FROM published_content WHERE slug = 'your-slug';
```

### Error: "violates check constraint 'title_not_empty'"
**Cause**: Empty title
```sql
-- Trim whitespace before insert:
TRIM('   Your Title   ')
```

### Trigger isn't auto-updating `updated_at`?
**Solution**: Verify trigger exists
```sql
SELECT trigger_name FROM information_schema.triggers
WHERE event_object_table = 'published_content';
-- Should show: trigger_published_content_updated_at
```

---

## Verification Checklist

After deployment, run:

```sql
-- 1. Table exists with 9 columns
SELECT COUNT(*) FROM information_schema.columns
WHERE table_name = 'published_content';
-- Expect: 9

-- 2. Foreign key is active
SELECT * FROM information_schema.table_constraints
WHERE table_name = 'published_content' AND constraint_type = 'FOREIGN KEY';
-- Expect: fk_published_content_writer_slug → writers.slug

-- 3. Indexes are created
SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'published_content';
-- Expect: 4

-- 4. RLS is enabled
SELECT rowsecurity FROM pg_tables WHERE tablename = 'published_content';
-- Expect: true

-- 5. Trigger is active
SELECT COUNT(*) FROM pg_trigger WHERE tgrelid = 'published_content'::regclass;
-- Expect: 1
```

---

## RLS Policies

| Role | Can SELECT | Can INSERT | Can UPDATE | Can DELETE |
|------|:----------:|:----------:|:----------:|:----------:|
| `service_role` | ✅ | ✅ | ✅ | ✅ |
| `authenticated` | ❌ | ❌ | ❌ | ❌ |
| `public`/anon | ✅ | ❌ | ❌ | ❌ |

**Translation**:
- Backend (service_role) can do anything
- Logged-in users cannot modify (security)
- Public can read but not write

---

## Performance Expectations

| Operation | Expected Time | Indexed |
|-----------|---------------|---------|
| Insert | 1-2ms | Yes |
| Select by slug | 0.5ms | Yes |
| Select by writer | 1ms | Yes |
| Order by date | 1ms | Yes |
| Filter by tags | 2-3ms | Yes |
| Delete | 1-2ms | Yes |

**Full table scan (no WHERE)**: Avoid. Always use indexes.

---

## Common Queries

### "Latest 5 articles"
```sql
SELECT id, title, slug, published_date
FROM published_content
ORDER BY published_date DESC LIMIT 5;
```

### "All articles by Marcus"
```sql
SELECT * FROM published_content WHERE writer_slug = 'marcus';
```

### "Articles about nutrition"
```sql
SELECT * FROM published_content
WHERE topic_tags && ARRAY['nutrition'];
```

### "Articles by Sarah about health"
```sql
SELECT * FROM published_content
WHERE writer_slug = 'sarah'
  AND topic_tags && ARRAY['health-benefits', 'science'];
```

### "How many articles in total?"
```sql
SELECT COUNT(*) as total_articles FROM published_content;
```

### "Tags and article counts"
```sql
SELECT tag, COUNT(*) as count
FROM published_content, LATERAL UNNEST(topic_tags) as tag
GROUP BY tag ORDER BY count DESC;
```

---

## ACID Guarantees

✅ **Atomicity**: Each query succeeds completely or fails completely
✅ **Consistency**: FK & CHECK constraints prevent bad data
✅ **Isolation**: Concurrent users don't interfere
✅ **Durability**: Data survives crashes

---

## Files You Need

| File | Purpose |
|------|---------|
| `migrations/016_create_published_content_table.sql` | The migration |
| `verify-migration-016.sql` | Verify structure (11 queries) |
| `PUBLISHED_CONTENT_IMPLEMENTATION.md` | Full guide (20+ pages) |
| `published-content-example-queries.sql` | Example queries |
| This card | Quick reference |

---

## LEO's Philosophy

> "A database is a promise you make to the future. Don't break it."

Trust the constraints. Let them protect your data. Never bypass them.

**Physics and Logic are the only two things you need to trust.**

---

## Emergency Contacts

**Did something break?**
1. Check the constraint error message
2. Verify the data you're trying to insert
3. Run the verification script: `verify-migration-016.sql`
4. Review the implementation guide for your specific use case

**Questions about design?**
- Read: `PUBLISHED_CONTENT_IMPLEMENTATION.md`
- Study: `published-content-example-queries.sql`
- Trust: The constraints are there for a reason

---

**Last Updated**: 2026-01-05
**Author**: LEO (Database Architect)
**Location**: Whistler, BC
