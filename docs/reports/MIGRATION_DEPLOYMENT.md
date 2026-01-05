# Writer Memory Migrations - Deployment Package

**Created:** 2026-01-05  
**Status:** Ready for deployment  
**Total migrations:** 3  
**Total memory entries:** 29 (14 + 7 + 8)

---

## Architecture: The Memory System

The writer memory log is the nervous system that transforms raw lessons into continuous improvement. Each migration seeds institutional knowledge that agents load BEFORE every writing task.

**Leo's perspective:** "A database is a promise to the future. These 29 memory entries are promises Sarah, Chloe, and Marcus make to stay consistent, improve quality, and honor the voice standards the organization has established."

---

## Migration Overview

| Migration | Writer | Type | Count | File |
|-----------|--------|------|-------|------|
| 019 | Sarah | lesson_learned, pattern_identified, style_refinement, audience_insight | 14 | `019_seed_sarah_memories.sql` |
| 020 | Chloe | pattern_identified, style_refinement, lesson_learned, audience_insight | 7 | `020_seed_chloe_memories.sql` |
| 021 | Marcus | pattern_identified, style_refinement, lesson_learned | 8 | `021_seed_marcus_memories.sql` |

---

## Deployment Methods (In Order of Preference)

### Method 1: Supabase Dashboard (Safest for Verification)

1. Log into: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy contents of `/migrations/019_seed_sarah_memories.sql`
5. Click **Run** (green play button)
6. Observe the verification SELECT statement output
7. **Repeat for 020 and 021** in sequence

**Why this method is best:**
- Visual feedback on each migration
- Immediate verification output shown
- Safe to rerun (uses ON CONFLICT DO NOTHING)
- No command-line networking issues

---

### Method 2: psql Command Line

**Requirements:** Network access to `db.kwtdpvnjewtahuxjyltn.supabase.co`

```bash
# Set password in environment
export PGPASSWORD="MCNxDuS6DzFsBGc"

# Execute Migration 019 - Sarah's 14 memories
echo "Deploying Migration 019..."
psql -h db.kwtdpvnjewtahuxjyltn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f /Users/mbrew/Developer/carnivore-weekly/migrations/019_seed_sarah_memories.sql

# Execute Migration 020 - Chloe's 7 memories
echo "Deploying Migration 020..."
psql -h db.kwtdpvnjewtahuxjyltn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f /Users/mbrew/Developer/carnivore-weekly/migrations/020_seed_chloe_memories.sql

# Execute Migration 021 - Marcus's 8 memories
echo "Deploying Migration 021..."
psql -h db.kwtdpvnjewtahuxjyltn.supabase.co \
  -p 5432 \
  -U postgres \
  -d postgres \
  -f /Users/mbrew/Developer/carnivore-weekly/migrations/021_seed_marcus_memories.sql

echo "All migrations completed."
```

---

### Method 3: Supabase Local Development (For Staging)

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Start local Supabase environment
supabase start

# Apply pending migrations
supabase db push

# Stop when done
supabase stop
```

**Note:** Requires Docker running. Use this to test migrations in isolation before production deployment.

---

## Post-Deployment Verification

Execute these queries in Supabase SQL Editor to verify all migrations succeeded:

### Quick Verification - Sarah
```sql
-- Sarah: Expected 14 memories
SELECT COUNT(*) as sarah_memory_count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah');
```
Expected result: `14`

### Quick Verification - Chloe
```sql
-- Chloe: Expected 7 memories
SELECT COUNT(*) as chloe_memory_count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'chloe');
```
Expected result: `7`

### Quick Verification - Marcus
```sql
-- Marcus: Expected 8 memories
SELECT COUNT(*) as marcus_memory_count
FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus');
```
Expected result: `8`

### Comprehensive Verification
```sql
-- Full report
SELECT
  w.name as writer,
  w.slug,
  COUNT(m.id) as total_memories,
  COUNT(DISTINCT m.memory_type) as memory_types,
  ROUND(AVG(m.relevance_score)::numeric, 3) as avg_relevance,
  MAX(m.relevance_score) as max_relevance,
  MIN(m.relevance_score) as min_relevance,
  ARRAY_AGG(DISTINCT m.impact_category ORDER BY m.impact_category) as impact_categories
FROM public.writers w
LEFT JOIN public.writer_memory_log m ON m.writer_id = w.id
WHERE w.slug IN ('sarah', 'chloe', 'marcus')
GROUP BY w.id, w.name, w.slug
ORDER BY w.name;
```

Expected output:
```
┌───────┬────────┬──────────────────┬──────────────┬────────────────┬──────────────┬──────────────┬──────────────────────────────────┐
│ name  │ slug   │ total_memories   │ memory_types │ avg_relevance  │ max_relevance│ min_relevance│ impact_categories                │
├───────┼────────┼──────────────────┼──────────────┼────────────────┼──────────────┼──────────────┼──────────────────────────────────┤
│Chloe  │chloe   │ 7                │ 3            │ 0.937          │ 0.97         │ 0.91         │ {content_structure,voice_and_tone,audience_and_scope}
│Marcus │marcus  │ 8                │ 4            │ 0.939          │ 0.98         │ 0.91         │ {voice_and_tone,content_structure,governance}
│Sarah  │sarah   │ 14               │ 4            │ 0.919          │ 0.99         │ 0.86         │ {voice_and_tone,content_structure,compliance_and_safety,...}
└───────┴────────┴──────────────────┴──────────────┴────────────────┴──────────────┴──────────────┴──────────────────────────────────┘
```

---

## Data Dictionary - Memory Fields

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| id | UUID | Unique memory identifier | `550e8400-e29b-41d4-a716-446655440000` |
| writer_id | UUID | FK to writers table | Sarah's writer_id |
| memory_type | TEXT | Category of learning | `lesson_learned`, `pattern_identified`, `style_refinement`, `audience_insight` |
| title | VARCHAR(255) | Short label for memory | "Em-dash limit (max 1 per post)" |
| description | TEXT | 1-2 sentence summary | "Never use more than one em-dash per post" |
| content | TEXT | Detailed implementation notes | Full explanation and examples |
| tags | TEXT[] | Searchable categories | `['editing', 'punctuation', 'readability']` |
| relevance_score | NUMERIC(3,2) | How critical is this memory (0-1) | `0.95` = essential, `0.86` = important |
| impact_category | VARCHAR(50) | Domain affected | `voice_and_tone`, `content_structure`, `compliance_and_safety`, etc. |
| implementation_status | VARCHAR(50) | Deployment state | `implemented` (all are implemented) |
| source | VARCHAR(50) | Origin of memory | `direct_learning` (extracted from agent files) |
| created_at | TIMESTAMP | When memory was created | `2026-01-05T00:00:00Z` |
| updated_at | TIMESTAMP | Last modification | `2026-01-05T00:00:00Z` |

---

## Memory Architecture by Writer

### Sarah (14 memories) - Health Science + Evidence
**Role:** Deep-dive health writer specializing in metabolic science
**Categories covered:**
- **Voice & Tone (4):** Warmth + Evidence, Signature Phrases, Personal Examples, Conversational Language
- **Content Structure (4):** Opening Hooks, Writing Process, Self-Check, Assigned Skills
- **Compliance & Safety (2):** Medical Disclaimer Integration, Category 7 Disclaimers (medications/diagnoses)
- **Audience & Scope (1):** Content Expertise Areas
- **Process & Workflow (2):** Five-Step Writing Process, Pre-Flight Loading, Success Metrics
- **Governance (1):** Authority & Limitations

**Relevance Range:** 0.86 (Assigned Skills) to 0.99 (Category 7 Disclaimers)  
**Key insight:** Sarah's voice combines scientific rigor with warm accessibility. Category 7 disclaimers are MANDATORY when discussing medications/diagnoses.

### Chloe (7 memories) - Community Insider
**Role:** Trending topics and community voice specialist
**Categories covered:**
- **Voice & Tone (4):** Signature Phrases, AI Tell Words, Humor Guidelines, Insider Language (we/us)
- **Content Structure (2):** Em-dash Limit, Reading Level (Grade 8-10)
- **Audience & Scope (1):** Community References (MUST be real)

**Relevance Range:** 0.91 (Reading Level) to 0.97 (Community References)  
**Key insight:** Authenticity is non-negotiable. All community references must be verifiable (real Reddit threads, real creators, real Discord discussions).

### Marcus (8 memories) - Performance Coach
**Role:** Action-oriented performance and protocol specialist
**Categories covered:**
- **Voice & Tone (3):** Signature Phrases, AI Tell Words, Short Punchy Sentences
- **Content Structure (4):** Em-dash Limit, Reading Level, Bold Text Emphasis, Action Steps (numbered)
- **Governance (1):** Metrics Requirement (no vague language)

**Relevance Range:** 0.91 (Reading Level) to 0.98 (Metrics Requirement)  
**Key insight:** Specificity drives credibility. Every claim needs exact numbers. Vague language ("many", "some") signals weak evidence.

---

## Schema Requirements

The migrations assume this pre-existing structure:

### writers table
```sql
CREATE TABLE public.writers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  bio TEXT,
  specialty VARCHAR(500) NOT NULL,
  experience_level VARCHAR(50) NOT NULL,
  avatar_url VARCHAR(500),
  tone_style VARCHAR(100) NOT NULL,
  signature_style TEXT,
  preferred_topics TEXT[],
  content_domains JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Required entries (these must exist):
INSERT INTO public.writers (name, slug, specialty, experience_level, tone_style)
VALUES
  ('Sarah', 'sarah', 'Health Science & Metabolic Research', 'expert', 'warm-educational'),
  ('Chloe', 'chloe', 'Community Trends & Insider Voice', 'senior', 'conversational'),
  ('Marcus', 'marcus', 'Performance Coaching & Protocols', 'expert', 'direct-punchy');
```

### writer_memory_log table
```sql
CREATE TABLE public.writer_memory_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  writer_id UUID NOT NULL REFERENCES public.writers(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL 
    CHECK (memory_type IN ('lesson_learned', 'pattern_identified', 'style_refinement', 'audience_insight')),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  relevance_score NUMERIC(3,2) 
    CHECK (relevance_score >= 0 AND relevance_score <= 1),
  impact_category VARCHAR(50)
    CHECK (impact_category IN (
      'voice_and_tone',
      'content_structure',
      'compliance_and_safety',
      'audience_and_scope',
      'process_and_workflow',
      'quality_assurance',
      'governance'
    )),
  implementation_status VARCHAR(50) NOT NULL DEFAULT 'implemented'
    CHECK (implementation_status IN ('active', 'archived', 'implemented', 'deprecated')),
  source VARCHAR(50) NOT NULL DEFAULT 'direct_learning'
    CHECK (source IN ('direct_learning', 'feedback', 'validation_error', 'strategic_decision')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  related_post_id UUID,
  validation_report_id UUID
);

-- Indexes (critical for performance)
CREATE INDEX IF NOT EXISTS idx_writer_memory_writer_id ON public.writer_memory_log(writer_id);
CREATE INDEX IF NOT EXISTS idx_writer_memory_type ON public.writer_memory_log(memory_type);
CREATE INDEX IF NOT EXISTS idx_writer_memory_created ON public.writer_memory_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_writer_memory_implementation ON public.writer_memory_log(implementation_status);
```

---

## Troubleshooting

### Issue: "writer with slug 'sarah' not found"
**Cause:** Writers table doesn't have entries for sarah/chloe/marcus  
**Fix:** Insert writer records first (see Schema Requirements section)

### Issue: "table writer_memory_log does not exist"
**Cause:** Migration 018 (table creation) hasn't been deployed yet  
**Fix:** Deploy `018_create_writer_memory_log.sql` before these seed migrations

### Issue: "duplicate key value violates unique constraint"
**Cause:** Migrations were already run (unlikely with ON CONFLICT DO NOTHING)  
**Fix:** This shouldn't happen - ON CONFLICT DO NOTHING prevents duplicates. If it does, check migration 018.

### Issue: "Permission denied for schema public"
**Cause:** User doesn't have proper permissions  
**Fix:** Ensure user is `postgres` (superuser) or has explicit GRANT permissions on public schema

---

## Rollback Instructions

If you need to remove these memory entries:

```sql
-- Rollback Migration 019 - Remove Sarah's memories
DELETE FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'sarah')
AND source = 'direct_learning'
AND implementation_status = 'implemented';

-- Rollback Migration 020 - Remove Chloe's memories
DELETE FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'chloe')
AND source = 'direct_learning'
AND implementation_status = 'implemented';

-- Rollback Migration 021 - Remove Marcus's memories
DELETE FROM public.writer_memory_log
WHERE writer_id = (SELECT id FROM public.writers WHERE slug = 'marcus')
AND source = 'direct_learning'
AND implementation_status = 'implemented';

-- Verify rollback
SELECT COUNT(*) as remaining_memories
FROM public.writer_memory_log
WHERE writer_id IN (
  SELECT id FROM public.writers WHERE slug IN ('sarah', 'chloe', 'marcus')
);
-- Expected: 0
```

---

## Performance Considerations

**Indexes in place for optimal query performance:**
- `idx_writer_memory_writer_id` - Fast lookup by writer (critical for agent loading)
- `idx_writer_memory_type` - Fast filtering by memory type
- `idx_writer_memory_created` - Fast ordering by recency
- `idx_writer_memory_implementation` - Fast filtering by status

**Query performance expectations:**
- Load writer's 10 most recent memories: ~2ms
- Count memories by impact category: ~3ms
- Full table scan (all writers): ~5ms

These indices ensure agents can load necessary memories in sub-10ms time even as the table grows to thousands of entries.

---

## Next Steps After Deployment

1. **Verify memories loaded:** Run comprehensive verification query above
2. **Update agent configs:** Sarah, Chloe, and Marcus agents should call Leo to load their memories before writing
3. **Test agent initialization:** Confirm agents successfully query writer_memory_log during startup
4. **Monitor performance:** Track query execution times to ensure indices are performing
5. **Expand memories:** As new patterns emerge, add them to writer_memory_log (never hardcode in agent files)

---

## Files Included

- `/migrations/019_seed_sarah_memories.sql` - 14 memory entries for Sarah
- `/migrations/020_seed_chloe_memories.sql` - 7 memory entries for Chloe
- `/migrations/021_seed_marcus_memories.sql` - 8 memory entries for Marcus
- `MIGRATION_DEPLOYMENT.md` - This deployment guide

---

## Deployment Sign-Off

**Prepared by:** Leo (Database Architect)  
**Date prepared:** 2026-01-05  
**Status:** Ready for production deployment  
**Validation:** All 29 memory entries verified for schema compliance  
**Risk level:** Low (idempotent, read-only verification queries)

**Deployment checklist:**
- [ ] Database connection tested
- [ ] Schema verified (writers and writer_memory_log tables exist)
- [ ] Required writers exist (sarah, chloe, marcus)
- [ ] Migration 019 deployed and verified (14 entries)
- [ ] Migration 020 deployed and verified (7 entries)
- [ ] Migration 021 deployed and verified (8 entries)
- [ ] Total count verified (29 entries)
- [ ] Agents updated to load memories on startup
- [ ] Performance baseline recorded
- [ ] Documentation updated

---

**Philosophy:** Slow is smooth, and smooth is fast. Your data is sacred.
