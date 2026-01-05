# Migration 007 Deployment Checklist

## Pre-Deployment

- [x] Migration file created and validated
- [x] SQL syntax checked for errors
- [x] Idempotent design confirmed
- [x] Seed data prepared (3 writers + 2 memories)
- [x] Indexes optimized for query patterns
- [x] Foreign key relationships verified
- [x] Triggers and automation configured
- [x] Documentation complete
- [x] Verification scripts prepared

---

## Deployment (Choose One Method)

### Option 1: Supabase Dashboard (Recommended)
- [ ] Open https://app.supabase.com/project/kwtdpvnjewtahuxjyltn
- [ ] Navigate to SQL Editor
- [ ] Create new query
- [ ] Copy entire migration file content
- [ ] Paste into editor
- [ ] Click "Run" button
- [ ] Verify no errors in output
- [ ] Note execution time

### Option 2: Node.js Script
- [ ] Ensure @supabase/supabase-js is installed
- [ ] Run: `node deploy-migration-007.js`
- [ ] Verify success message
- [ ] Check no network errors

### Option 3: Supabase CLI
- [ ] Set SUPABASE_ACCESS_TOKEN environment variable
- [ ] Run: `supabase link --project-ref kwtdpvnjewtahuxjyltn`
- [ ] Run: `supabase db push --dry-run`
- [ ] Review changes preview
- [ ] Run: `supabase db push`
- [ ] Verify success

### Option 4: psql
- [ ] Ensure PostgreSQL client installed
- [ ] Have network access to db.kwtdpvnjewtahuxjyltn.supabase.co
- [ ] Set PGPASSWORD environment variable
- [ ] Run psql command with migration file
- [ ] Verify no errors in output

---

## Post-Deployment Verification (Run ALL checks)

### 1. Writers Table
- [ ] Query: `SELECT COUNT(*) FROM writers;` → Expected: 3
- [ ] Query: `SELECT slug FROM writers WHERE slug='sarah';` → Expected: sarah
- [ ] Sarah record has: name, role_title, specialty, tone_style
- [ ] Check is_active = true for all writers
- [ ] Verify created_at and updated_at timestamps

### 2. Writer Memory Log Table
- [ ] Query: `SELECT COUNT(*) FROM writer_memory_log;` → Expected: 2
- [ ] Sarah's memory count: `SELECT COUNT(*) FROM writer_memory_log WHERE writer_id=(SELECT id FROM writers WHERE slug='sarah');` → Expected: 2
- [ ] Memory 1 title: "Specificity drives engagement" (lesson_learned)
- [ ] Memory 2 title: "Budget is the primary barrier for beginners" (pattern_identified)
- [ ] Check tags array is populated
- [ ] Check relevance_score populated
- [ ] Check implementation_status = 'implemented'

### 3. Writer Content Table
- [ ] Query: `SELECT COUNT(*) FROM writer_content;` → Expected: 0 (no seed data)
- [ ] Table structure valid
- [ ] Foreign keys intact

### 4. Writer Relationships Table
- [ ] Query: `SELECT COUNT(*) FROM writer_relationships;` → Expected: 0 (no seed data)
- [ ] Table structure valid
- [ ] Foreign keys intact

### 5. Writer Voice Snapshots Table
- [ ] Query: `SELECT COUNT(*) FROM writer_voice_snapshots;` → Expected: 0 (no seed data)
- [ ] Table structure valid
- [ ] Foreign keys intact

### 6. Indexes
- [ ] Count writer-related indexes: `SELECT COUNT(*) FROM pg_indexes WHERE tablename LIKE 'writer%';` → Expected: 20
- [ ] Check GIN index exists on writer_memory_log.tags
- [ ] Verify partial index on writers (is_active=true)

### 7. Trigger
- [ ] Check trigger exists: `SELECT COUNT(*) FROM pg_triggers WHERE tgname='update_writer_timestamp_trigger';` → Expected: 1
- [ ] Test trigger: UPDATE writers SET name=name WHERE slug='sarah'; Check updated_at changed

### 8. Seed Data Quality
- [ ] Sarah has voice_formula JSONB populated
- [ ] Sarah has content_domains JSONB populated
- [ ] Sarah has preferred_topics array with 6 items
- [ ] Sarah has philosophy text
- [ ] Marcus specialty correct
- [ ] Chloe tagline correct

---

## Run Verification Script (Automated)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
npm install @supabase/supabase-js  # Only needed first time
node verify-migration-007.js
```

- [ ] Script runs without errors
- [ ] All 5 tables detected
- [ ] All 3 writers found
- [ ] Sarah's memory entries displayed
- [ ] All profile fields populated

---

## Critical Queries (Run in Supabase SQL Editor)

### Query 1: Verify Sarah's profile
```sql
SELECT slug, name, role_title FROM writers WHERE slug = 'sarah';
```
- [ ] Returns exactly 1 row
- [ ] slug = 'sarah'
- [ ] name = 'Sarah'
- [ ] role_title = 'Health Coach & Community Leader'

### Query 2: Verify Sarah's memory
```sql
SELECT memory_type, title, description, tags FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
LIMIT 5;
```
- [ ] Returns exactly 2 rows
- [ ] Row 1: memory_type='lesson_learned', title='Specificity drives engagement'
- [ ] Row 2: memory_type='pattern_identified', title='Budget is the primary barrier for beginners'
- [ ] Both have tags populated
- [ ] Both have non-null descriptions

### Query 3: Check all writers
```sql
SELECT slug, name, specialty FROM writers ORDER BY slug;
```
- [ ] Returns exactly 3 rows
- [ ] Slugs are: chloe, marcus, sarah (in alphabetical order)
- [ ] All rows have non-null specialties

### Query 4: Verify all tables exist
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'writer%'
ORDER BY tablename;
```
- [ ] Returns exactly 5 rows
- [ ] Tables are: writer_content, writer_memory_log, writer_relationships, writer_voice_snapshots, writers

### Query 5: Test index performance
```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM writers WHERE slug = 'sarah';
```
- [ ] Uses index scan (not sequential scan)
- [ ] Execution time < 1ms

---

## Smoke Tests (Basic Functionality)

### Test 1: Writer Lookup
```sql
SELECT id, name, tone_style FROM writers WHERE slug = 'sarah';
```
- [ ] Returns results instantly
- [ ] tone_style = 'conversational'

### Test 2: Memory Filtering
```sql
SELECT title FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND memory_type = 'lesson_learned';
```
- [ ] Returns 1 row
- [ ] Title = 'Specificity drives engagement'

### Test 3: Tag Search
```sql
SELECT title FROM writer_memory_log
WHERE 'engagement' = ANY(tags);
```
- [ ] Returns at least 1 row
- [ ] Uses GIN index (check EXPLAIN output)

### Test 4: Update Timestamp
```sql
UPDATE writers SET updated_at = CURRENT_TIMESTAMP WHERE slug = 'sarah';
SELECT updated_at FROM writers WHERE slug = 'sarah';
```
- [ ] updated_at is current time
- [ ] Trigger fired correctly

### Test 5: Voice Formula Extraction
```sql
SELECT
  voice_formula->>'tone' as tone,
  (voice_formula->'signature_phrases') as phrases
FROM writers
WHERE slug = 'sarah';
```
- [ ] Returns JSONB data
- [ ] tone = 'Warm, conversational, grounded in health science'
- [ ] Phrases array has 4 items

---

## Performance Baseline (After Successful Deployment)

Run these queries and note execution times:

### Baseline 1: Slug lookup (should be <1ms)
```sql
EXPLAIN (ANALYZE) SELECT * FROM writers WHERE slug = 'sarah';
```
- [ ] Record execution time: _____ ms

### Baseline 2: Memory retrieval (should be <2ms)
```sql
EXPLAIN (ANALYZE)
SELECT * FROM writer_memory_log
WHERE writer_id = 1
ORDER BY created_at DESC LIMIT 10;
```
- [ ] Record execution time: _____ ms

### Baseline 3: Tag search (should be <5ms)
```sql
EXPLAIN (ANALYZE)
SELECT * FROM writer_memory_log
WHERE 'engagement' = ANY(tags)
LIMIT 10;
```
- [ ] Record execution time: _____ ms

---

## Integration Tests (Before Going to Production)

### Test 1: Foreign Key Cascade
```sql
-- Verify cascade delete works
DELETE FROM writers WHERE slug = 'sarah';
SELECT COUNT(*) FROM writer_memory_log WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah');
-- Should return 0 (memories deleted with writer)
-- ROLLBACK to restore data
ROLLBACK;
```
- [ ] Cascade delete verified

### Test 2: Unique Constraints
```sql
-- Try to insert duplicate slug (should fail)
INSERT INTO writers (slug, name, role_title, specialty)
VALUES ('sarah', 'Sarah 2', 'Role', 'Specialty');
```
- [ ] Expected error: unique constraint violation
- [ ] No data actually inserted

### Test 3: NOT NULL Constraints
```sql
-- Try to insert with missing required field (should fail)
INSERT INTO writers (slug, name, role_title)
VALUES ('test', 'Test', 'Role');
-- specialty is required
```
- [ ] Expected error: NOT NULL constraint violation

---

## Documentation Verification

- [ ] MIGRATION_DEPLOYMENT_007.md is complete
- [ ] docs/WRITERS_SCHEMA_REFERENCE.md is complete
- [ ] DEPLOYMENT_SUMMARY_007.md is complete
- [ ] This checklist covers all scenarios
- [ ] Query examples are correct and tested

---

## Sign-Off

| Item | Status | Completed By | Date |
|------|--------|--------------|------|
| Migration Deployed | [ ] Pass | _____________ | _____ |
| All Verification Queries Passed | [ ] Pass | _____________ | _____ |
| Performance Baseline Recorded | [ ] Pass | _____________ | _____ |
| Integration Tests Passed | [ ] Pass | _____________ | _____ |
| Documentation Verified | [ ] Pass | _____________ | _____ |
| Ready for Production | [ ] Yes | _____________ | _____ |

---

## Rollback Procedure (If Needed)

If deployment fails or validation doesn't pass:

1. [ ] Identify issue in checklist above
2. [ ] Do NOT proceed with dependent migrations
3. [ ] Run rollback SQL:
```sql
DROP TABLE IF EXISTS writer_voice_snapshots CASCADE;
DROP TABLE IF EXISTS writer_memory_log CASCADE;
DROP TABLE IF EXISTS writer_relationships CASCADE;
DROP TABLE IF EXISTS writer_content CASCADE;
DROP TABLE IF EXISTS writers CASCADE;
DROP FUNCTION IF EXISTS update_writer_timestamp CASCADE;
```
4. [ ] Verify tables removed: `SELECT COUNT(*) FROM pg_tables WHERE tablename LIKE 'writer%';` → Expected: 0
5. [ ] Fix issue and redeploy

---

## Notes

Write any issues or observations here:

```
[Use this space for notes during deployment]

```

---

**Deployment Date:** _____________
**Deployed By:** _____________
**Status:** [ ] PASSED [ ] FAILED
**Notes:** _________________________________________________________________

---

**Generated:** 2026-01-05
**Schema Version:** 007
**Database:** Supabase (kwtdpvnjewtahuxjyltn)
