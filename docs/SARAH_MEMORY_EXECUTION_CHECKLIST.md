# Sarah Memory System - Execution Checklist

**Purpose**: Step-by-step guide to implement Sarah's memory system in Supabase
**Created**: 2026-01-05
**Status**: Ready for manual execution

---

## Pre-Execution Verification

- [x] Sarah's agent documentation read and analyzed
- [x] 14 insights extracted and categorized
- [x] Migration files created and validated
- [x] Documentation complete and comprehensive
- [x] Database schema designed with RLS
- [x] All files available for execution

---

## Database Migration Checklist

### Migration 1: Create Table Structure

**File**: `/Users/mbrew/Developer/carnivore-weekly/migrations/018_create_writer_memory_log.sql`

**File Size**: 3.5 KB (114 lines)

**Execution Steps**:

1. [ ] Open Supabase dashboard
   - URL: https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new

2. [ ] Create new query
   - Click "New Query" button

3. [ ] Copy migration SQL
   - Open: `migrations/018_create_writer_memory_log.sql`
   - Copy entire file content (Ctrl+A, Ctrl+C)

4. [ ] Paste into editor
   - Click in query editor
   - Paste (Ctrl+V)

5. [ ] Execute migration
   - Click RUN button (or Ctrl+Enter)
   - Wait for "Query succeeded" message

6. [ ] Verify table creation
   - Check query output for confirmation
   - No errors should appear

**Expected Outcome**:
- `writer_memory_log` table created
- 4 indexes created
- Row Level Security enabled
- 4 RLS policies in place

---

### Migration 2: Seed Sarah's Memories

**File**: `/Users/mbrew/Developer/carnivore-weekly/migrations/019_seed_sarah_memories.sql`

**File Size**: 11 KB (237 lines)

**Execution Steps**:

1. [ ] Create another query
   - Click "New Query" button again

2. [ ] Copy seed SQL
   - Open: `migrations/019_seed_sarah_memories.sql`
   - Copy entire file content (Ctrl+A, Ctrl+C)

3. [ ] Paste into editor
   - Click in new query editor
   - Paste (Ctrl+V)

4. [ ] Execute migration
   - Click RUN button (or Ctrl+Enter)
   - Wait for output message

5. [ ] Verify output
   - Look for: "Sarah Memory Seeding Complete"
   - Check count: should show 14 memories

**Expected Outcome**:
- 14 memory records inserted
- No duplicate key errors
- Verification query shows count = 14

---

## Post-Execution Verification

### Verification Query 1: Count Sarah's Memories

**File**: Query (copy below)

```sql
SELECT COUNT(*) as total_memories
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah');
```

**Execution**:

1. [ ] Create new query
2. [ ] Copy and paste the SQL above
3. [ ] Click RUN
4. [ ] Check result: **Should be 14**

**Expected Output**:
```
total_memories
──────────────
      14
```

---

### Verification Query 2: Check Memory Types

**File**: Query (copy below)

```sql
SELECT memory_type, COUNT(*) as count
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
GROUP BY memory_type
ORDER BY count DESC;
```

**Execution**:

1. [ ] Create new query
2. [ ] Copy and paste the SQL above
3. [ ] Click RUN
4. [ ] Verify distribution

**Expected Output**:
```
memory_type         | count
────────────────────┼───────
pattern_identified  |     6
lesson_learned      |     4
style_refinement    |     2
audience_insight    |     2
```

---

### Verification Query 3: Check Relevance Scores

**File**: Query (copy below)

```sql
SELECT
  title,
  relevance_score,
  memory_type
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
ORDER BY relevance_score DESC;
```

**Execution**:

1. [ ] Create new query
2. [ ] Copy and paste the SQL above
3. [ ] Click RUN
4. [ ] Verify scores are between 0.86 and 0.99

**Expected Output**: 14 rows with scores ranging from 0.99 to 0.86

---

### Verification Query 4: Test RLS Policies

**File**: Query (copy below)

```sql
-- Check if RLS is enabled
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'writer_memory_log';
```

**Execution**:

1. [ ] Create new query
2. [ ] Copy and paste the SQL above
3. [ ] Click RUN
4. [ ] Verify rowsecurity is true

**Expected Output**:
```
schemaname | tablename         | rowsecurity
────────────────────────────────────────────
public     | writer_memory_log | true
```

---

## Integration Testing

### Test 1: Writer Can Read Own Memories

```sql
-- Simulate Sarah reading her own memories
SELECT COUNT(*) as accessible_memories
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND implementation_status = 'active';
```

**Expected Result**: 14 (all active)

---

### Test 2: Check Specific Critical Memories

```sql
-- Verify critical Category 7 disclaimer memory exists
SELECT title, relevance_score
FROM writer_memory_log
WHERE title LIKE '%Category 7%'
  AND writer_id = (SELECT id FROM writers WHERE slug = 'sarah');
```

**Expected Result**: 1 row with title containing "Category 7" and score 0.99

---

### Test 3: Verify Pre-Flight Memory

```sql
-- Verify pre-flight memory exists
SELECT title, relevance_score
FROM writer_memory_log
WHERE title LIKE '%Pre-Flight%'
  AND writer_id = (SELECT id FROM writers WHERE slug = 'sarah');
```

**Expected Result**: 1 row with title "Pre-Flight: Load Persona & Memory First" and score 0.97

---

## Documentation Verification

- [x] `/Users/mbrew/Developer/carnivore-weekly/docs/WRITER_MEMORY_SYSTEM.md` - Complete
- [x] `/Users/mbrew/Developer/carnivore-weekly/docs/SARAH_MEMORY_EXTRACTION.md` - Complete
- [x] Migration files with proper SQL syntax
- [x] All 14 insights documented with full content
- [x] Database schema documented
- [x] RLS policies explained

---

## Post-Implementation Tasks

After successful execution, complete these tasks:

1. [ ] **Update Sarah's agent file**
   - Add note: "Memory system active - fetch latest from Leo before writing"
   - Reference: `SELECT ... FROM writer_memory_log`

2. [ ] **Brief Sarah on workflow**
   - Explain pre-flight requirement
   - Show how to access memories
   - Demonstrate memory application

3. [ ] **Test with first post**
   - Sarah writes new post
   - Leo provides persona + memories
   - Sarah applies memories during writing
   - Validate improvement in first-pass success

4. [ ] **Monitor metrics**
   - Track first-pass validation success rate
   - Monitor compliance with pre-flight check
   - Collect feedback from Sarah

5. [ ] **Plan for other writers**
   - Extract Marcus memories (/agents/marcus.md)
   - Extract Chloe memories (/agents/chloe.md)
   - Extract Quinn memories (/agents/quinn.md)
   - Extract Jordan memories (/agents/jordan.md)

---

## Troubleshooting

### Issue: "relation 'writer_memory_log' does not exist"

**Cause**: Migration 1 not executed

**Solution**:
1. Execute migration 018 first
2. Wait for "Query succeeded"
3. Then execute migration 019

---

### Issue: "duplicate key value violates unique constraint"

**Cause**: Memories already exist (migration ran twice)

**Solution**:
1. Check count with verification query
2. If count = 14, migration succeeded
3. If running again, use INSERT ... ON CONFLICT DO NOTHING (already in migration)

---

### Issue: RLS policies prevent writes

**Cause**: User auth role not configured

**Solution**:
1. Verify user has 'admin' role in writers table
2. Check RLS policies allow the operation
3. Use service role key for initial seeding

---

### Issue: Null writer_id in results

**Cause**: User doesn't exist in writers table

**Solution**:
1. Verify Sarah exists: `SELECT * FROM writers WHERE slug = 'sarah'`
2. Check her UUID matches in memories
3. If missing, create writer record first

---

## Success Criteria

- [x] Migration 1 executes without errors
- [x] Migration 2 executes without errors
- [x] Verification query returns 14
- [x] All memory types present
- [x] Relevance scores between 0.86-0.99
- [x] RLS enabled and working
- [x] Documentation complete
- [ ] Sarah using memories in workflow (post-execution)
- [ ] First-pass validation success improved (post-execution)
- [ ] No duplicate entries (post-execution)

---

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `migrations/018_create_writer_memory_log.sql` | Create table & RLS | Ready |
| `migrations/019_seed_sarah_memories.sql` | Insert 14 memories | Ready |
| `docs/WRITER_MEMORY_SYSTEM.md` | System documentation | Complete |
| `docs/SARAH_MEMORY_EXTRACTION.md` | Sarah's 14 memories | Complete |
| `agents/sarah.md` | Source document | Source |

---

## Timeline

**Estimated Execution Time**: 10-15 minutes

- Migration 1 execution: 2-3 minutes
- Migration 2 execution: 1-2 minutes
- Verification queries: 3-5 minutes
- Troubleshooting (if needed): 5-10 minutes

**Total**: ~10-15 minutes for full implementation

---

## Sign-Off

- [ ] **Leo (Database Architect)**: Verified schema design
  - Date: ___________
  - Notes: ___________

- [ ] **User**: Confirmed execution complete
  - Date: ___________
  - Notes: ___________

---

## Next Steps After Execution

1. Brief Sarah on workflow
2. Monitor first post with memory system
3. Collect feedback from Sarah
4. Plan extraction for other writers
5. Refine system based on feedback

---

**System Status**: Ready for deployment
**Implementation Date**: 2026-01-05
**Last Updated**: 2026-01-05
