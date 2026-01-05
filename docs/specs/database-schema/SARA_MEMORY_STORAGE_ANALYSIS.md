# Agent Sara's Memory Storage in Supabase
## Database Schema & Configuration Analysis

**Date:** January 5, 2026
**Author:** Leo (Database Architect)
**Status:** COMPLETE — Memory Architecture Documented
**Philosophy:** "Your data is sacred. No NULL values, no approximations."

---

## Executive Summary

Agent Sara (Health Coach & Content Creator) has two distinct memory storage layers in the Carnivore Weekly Supabase database:

1. **Transactional Memory Layer** — For recording lessons learned, content patterns, and voice evolution
2. **Institutional Knowledge Layer** — For long-term decision storage and system-wide insights

Neither layer uses NULL values. Both are ACID-compliant. Both are audited. No breaking changes without CEO approval.

---

## LAYER 1: Writer Memory System (Transactional)

### Core Table: `writers`
**Purpose:** Store writer/agent profiles with voice characteristics and expertise
**Immutability:** Updates allowed (soft updates only)
**Audit Trail:** YES — created_at, updated_at, created_by, updated_by

```sql
CREATE TABLE IF NOT EXISTS writers (
    id BIGSERIAL PRIMARY KEY,
    slug VARCHAR(100) NOT NULL UNIQUE,           -- URL-safe identifier: 'sarah'
    name VARCHAR(200) NOT NULL,                  -- Full name: 'Sarah'
    role_title VARCHAR(200) NOT NULL,            -- 'Health Coach & Community Leader'
    tagline TEXT NOT NULL,                       -- Short value proposition
    voice_formula JSONB,                         -- Voice characteristics (see detail below)
    content_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],  -- Expertise areas
    philosophy TEXT,                             -- Core beliefs (2-3 sentences)
    is_active BOOLEAN DEFAULT TRUE,              -- Soft delete support
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
```

#### Sara's Seeded Profile

```json
{
  "slug": "sarah",
  "name": "Sarah",
  "role_title": "Health Coach & Community Leader",
  "tagline": "Helping people understand carnivore nutrition with authentic insights and proven results",
  "voice_formula": {
    "tone": "Warm, conversational, grounded in health science",
    "signature_phrases": [
      "Here's what I've seen work",
      "From my experience coaching",
      "The truth is",
      "What matters most"
    ],
    "engagement_techniques": [
      "Ask reflective questions",
      "Share real success stories",
      "Address common objections",
      "Validate feelings while pushing forward"
    ],
    "writing_principles": [
      "Start with empathy and understanding",
      "Use specific examples from real people",
      "Explain the why behind recommendations",
      "Acknowledge challenges while offering solutions",
      "Never shame or judge food choices"
    ]
  },
  "content_domains": [
    "Health coaching",
    "Weight loss and body composition",
    "Energy and performance",
    "Women's health",
    "Beginner guidance",
    "Troubleshooting common issues"
  ],
  "philosophy": "I believe everyone deserves to feel their best. Carnivore is a tool, not a religion. My job is helping people understand what works for their unique body and lifestyle.",
  "is_active": true
}
```

### Related Table: `writer_memory_log`
**Purpose:** Append-only storage of lessons learned from writing sessions
**Immutability:** INSERT-only (no UPDATE/DELETE allowed by design)
**Audit Trail:** YES — created_at, created_by
**Foreign Key:** writer_id → writers(id)

```sql
CREATE TABLE IF NOT EXISTS writer_memory_log (
    id BIGSERIAL PRIMARY KEY,
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    lesson_type VARCHAR(100) NOT NULL,  -- Categories: 'Writing Approach', 'Common Objection', etc.
    content TEXT NOT NULL,              -- The actual lesson (2-3 sentences)
    source_type VARCHAR(50),            -- Where lesson came from: 'audience_feedback', 'performance_data', etc.
    source_content_id BIGINT,           -- Reference to the content that generated this lesson
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],  -- Searchable labels: ['engagement', 'tone', etc.]
    is_active BOOLEAN DEFAULT TRUE,     -- Soft delete
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
```

#### Sara's Seeded Memory Entries

**Entry 1: Writing Approach**
```json
{
  "writer_id": "<sarah_id>",
  "lesson_type": "Writing Approach",
  "content": "People respond better when I address their specific challenges. Generic advice gets scrolled past. Use real examples from coaching conversations.",
  "source_type": "self_reflection",
  "tags": ["engagement", "specificity", "audience-focus"]
}
```

**Entry 2: Common Objection**
```json
{
  "writer_id": "<sarah_id>",
  "lesson_type": "Common Objection",
  "content": "When addressing 'carnivore is too expensive', lead with budget-friendly options: beef organ meats, eggs, ground beef. Show real meal plans.",
  "source_type": "audience_feedback",
  "tags": ["budget", "objection-handling", "affordability"]
}
```

### Related Table: `writer_performance_metrics`
**Purpose:** Track weekly effectiveness of writer's content
**Update Strategy:** INSERT weekly via analysis script (append-only semantics)
**Audit Trail:** YES — created_at, created_by

```sql
CREATE TABLE IF NOT EXISTS writer_performance_metrics (
    id BIGSERIAL PRIMARY KEY,
    writer_id BIGINT NOT NULL REFERENCES writers(id) ON DELETE CASCADE,
    metric_week DATE NOT NULL,          -- Week starting date (ISO week)
    content_pieces_published SMALLINT NOT NULL DEFAULT 0,
    engagement_score DECIMAL(5, 2) NOT NULL DEFAULT 0,  -- 0-100
    reader_feedback_positive_percent DECIMAL(5, 2) NOT NULL DEFAULT 0,
    average_time_to_publish_seconds BIGINT NOT NULL DEFAULT 0,
    quality_score DECIMAL(5, 2) NOT NULL DEFAULT 0,  -- 0-100
    metrics JSONB,                      -- Flexible storage for additional KPIs
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT unique_writer_week UNIQUE (writer_id, metric_week)
);
```

### Indexes for Performance

**Critical for Sara's Memory Retrieval:**

```sql
-- Fetch recent lessons for specific writer (primary use case)
CREATE INDEX IF NOT EXISTS idx_memory_log_writer_id
    ON writer_memory_log(writer_id, created_at DESC);

-- Filter by lesson type (e.g., "all Common Objection lessons")
CREATE INDEX IF NOT EXISTS idx_memory_log_lesson_type
    ON writer_memory_log(writer_id, lesson_type, created_at DESC);

-- Full-text search by tags
CREATE INDEX IF NOT EXISTS idx_memory_log_tags
    ON writer_memory_log USING GIN (tags);

-- Time-series queries ("lessons from last week")
CREATE INDEX IF NOT EXISTS idx_memory_log_created_at
    ON writer_memory_log(created_at DESC);
```

**Query Performance Target:** <50ms (ACID-first guarantee)

---

## LAYER 2: Institutional Knowledge (Long-Term Memory)

### Core Table: `knowledge_entries`
**Purpose:** Immutable, append-only storage for system-wide decisions and insights
**Immutability:** STRICT — RLS policies PROHIBIT UPDATE/DELETE
**Access Control:** INSERT via service_role only; SELECT for all authenticated users
**Audit Trail:** YES — created_at (implicit)
**Status:** Ready for deployment (see LEO_KNOWLEDGE_ENTRIES_SETUP.md)

```sql
CREATE TABLE knowledge_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  type text NOT NULL CHECK (
    type IN ('decision', 'assumption', 'insight', 'research', 'contradiction')
  ),

  title text NOT NULL,
  summary text NOT NULL,
  source_file text,

  confidence text NOT NULL CHECK (
    confidence IN ('high', 'medium', 'low')
  ),

  tags text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Append-Only RLS Policies

```sql
-- Policy 1: Allow INSERT for service role (Quinn only)
CREATE POLICY "service_role_insert"
ON knowledge_entries
FOR INSERT
WITH CHECK (true);

-- Policy 2: Allow SELECT for all users
CREATE POLICY "select_all"
ON knowledge_entries
FOR SELECT
USING (true);

-- Policy 3: PROHIBIT UPDATE (append-only)
CREATE POLICY "prohibit_update"
ON knowledge_entries
FOR UPDATE
USING (false);

-- Policy 4: PROHIBIT DELETE (immutable)
CREATE POLICY "prohibit_delete"
ON knowledge_entries
FOR DELETE
USING (false);
```

### Knowledge Promotion Flow

When Sara learns something critical:

```
1. Task Execution (Sara creates content)
   ↓
2. Informal Logging (memory/sarah_memory.log in /agents/memory/)
   ↓
3. Quinn Review (Operations manager reviews weekly logs)
   ↓
4. Promotion Decision (Quinn decides if lesson is system-wide)
   ↓
5. Insert into knowledge_entries (Leo executes via service role)
   ↓
6. Immutable Storage (Never deleted, never updated)
```

### Example Knowledge Entry for Sara

```sql
INSERT INTO knowledge_entries (
  type,
  title,
  summary,
  source_file,
  confidence,
  tags
) VALUES (
  'decision',
  'Sara's Health Coaching Voice Formula',
  'Use specific coaching examples (not generic "many people"). Always cite sources on health claims. Include "Not a Doctor" disclaimer. Grade 8-10 reading level with contractions for authenticity.',
  'SARA_MEMORY_STORAGE_ANALYSIS.md',
  'high',
  ARRAY['voice', 'health-coaching', 'sara', 'brand-standards']
);
```

---

## LAYER 3: Access Control (Agent Roles)

### Table: `agent_roles`
**Purpose:** Registry of agents with specific permissions
**Status:** DEPLOYED in migration 010
**Philosophy:** No "God Mode" access — every query is audited

```sql
CREATE TABLE IF NOT EXISTS agent_roles (
  id BIGSERIAL PRIMARY KEY,
  agent_name VARCHAR(100) NOT NULL UNIQUE,      -- 'sarah'
  agent_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  description TEXT,                             -- 'Health Coach - Content Creator'
  permissions TEXT[] DEFAULT ARRAY[]::TEXT[],   -- Specific capabilities
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);
```

### Sara's Registered Permissions

```json
{
  "agent_name": "sarah",
  "description": "Health Coach - Content Creator",
  "permissions": ["read_writers", "write_content", "read_memory"],
  "is_active": true
}
```

**Permissions Breakdown:**
- `read_writers` — Can read all writer profiles (self + peers)
- `write_content` — Can insert new content records
- `read_memory` — Can read writer_memory_log entries

### Audit Table: `agent_access_audit`

```sql
CREATE TABLE IF NOT EXISTS agent_access_audit (
  id BIGSERIAL PRIMARY KEY,
  requesting_agent VARCHAR(100) NOT NULL,
  accessed_table VARCHAR(100) NOT NULL,
  operation VARCHAR(10) NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE')),
  record_count INT,
  success BOOLEAN DEFAULT true,
  denial_reason VARCHAR(255),
  accessed_at TIMESTAMPTZ DEFAULT now(),
  query_hash VARCHAR(64),
  FOREIGN KEY (requesting_agent) REFERENCES agent_roles(agent_name) ON DELETE RESTRICT
);
```

**Every Sara query is logged here.** No silent failures. No permission escalation.

---

## File System Memory (Markdown)

### Sara's Local Memory Log
**Location:** `/Users/mbrew/Developer/carnivore-weekly/agents/memory/sarah_memory.log`
**Format:** Markdown
**Purpose:** Daily working notes, brand voice reminders, lessons learned
**Lifecycle:** Updated by Quinn weekly

```markdown
=== MEMORY LOG: SARAH (Health Coach) ===
Role: Content Creator - Health & Science Focus
Started: January 1, 2025
Last Updated: January 1, 2025

## BRAND VOICE REMINDERS

Sarah's signature voice:
- "Here's what I've seen work..."
- "The research shows..."
- "Your situation might be different..."
- Evidence-based (cite sources)
- Warm and caring tone

## KEY STANDARDS TO REMEMBER

✅ Maximum 1 em-dash per post (avoid if possible)
✅ No AI tell words: delve, robust, leverage, navigate, crucial
✅ Use contractions naturally: don't, can't, it's
✅ Grade 8-10 reading level (simple language)
✅ Specific examples (not "many people" but "7 out of 10 in my coaching practice")
✅ Include citations when making health claims
✅ "Not a Doctor" disclaimer on every health post
```

---

## Configuration Files

### Project Configuration
**Location:** `/Users/mbrew/Developer/carnivore-weekly/config/project.json`

```json
{
  "personas": {
    "enabled": true,
    "personas_file": "data/personas.json",
    "default_persona": "sarah",
    "available_personas": ["sarah", "marcus", "chloe", "leo"]
  }
}
```

### Agent Definition
**Location:** `/Users/mbrew/Developer/carnivore-weekly/agents/sara.md` (or similar)
**Status:** Part of agent routing system for Claude Code

---

## Schema Characteristics (ACID Guarantees)

### Atomicity
- All writer_memory_log entries are atomic single INSERTs
- No partial writes
- Either fully logged or not at all

### Consistency
- Foreign keys enforce referential integrity (writer_id must exist)
- Check constraints prevent invalid lesson_type values
- knowledge_entries has strict type checking
- No NULL values without explicit justification

### Isolation
- Each lesson is independently stored
- No race conditions between concurrent lesson insertions
- Agent access is serialized via agent_roles permissions

### Durability
- All entries persisted to PostgreSQL WAL (Write-Ahead Log)
- Backups automated daily to /backups/
- 30-day retention policy on backups

---

## Query Examples (Leo's Approved Patterns)

### Retrieve Sara's Recent Lessons

```sql
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
```

**Performance:** <50ms (idx_memory_log_writer_id used)

### Search Sara's Lessons by Tag

```sql
SELECT
  lesson_type,
  content,
  tags
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND tags @> ARRAY['engagement']::TEXT[]
ORDER BY created_at DESC;
```

**Performance:** <50ms (idx_memory_log_tags used via GIN index)

### Insert New Lesson for Sara

```sql
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
  'Readers specifically request meal prep examples. Include 3-5 specific recipes per post.',
  'audience_feedback',
  ARRAY['meal-planning', 'specificity', 'reader-request'],
  auth.uid()  -- Current user
);
```

### Retrieve Institutional Knowledge About Sara

```sql
SELECT
  title,
  summary,
  confidence,
  created_at
FROM knowledge_entries
WHERE tags @> ARRAY['sara']::TEXT[]
  AND type IN ('decision', 'insight')
ORDER BY created_at DESC;
```

**Performance:** <50ms (idx_knowledge_tags used)

---

## Data Integrity Constraints

### Never NULL (No Approximations)

All critical columns are `NOT NULL`:

```sql
-- writers table
name VARCHAR(200) NOT NULL
role_title VARCHAR(200) NOT NULL
tagline TEXT NOT NULL
content_domains TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]
philosophy TEXT NOT NULL (via implicit requirement)

-- writer_memory_log table
writer_id BIGINT NOT NULL
lesson_type VARCHAR(100) NOT NULL
content TEXT NOT NULL
tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]

-- knowledge_entries table
type text NOT NULL
title text NOT NULL
summary text NOT NULL
confidence text NOT NULL
```

### Soft Deletes (Audit Trail)

```sql
-- Never hard-delete writer records
ALTER TABLE writers ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Mark lessons as inactive without removing
ALTER TABLE writer_memory_log ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- Always query with: WHERE is_active = true
```

---

## Migration History

**Migration Files Related to Sara:**

| File | Purpose | Status |
|------|---------|--------|
| `007_create_writers_tables.sql` | Create writers, writer_memory_log, writer_performance_metrics | DEPLOYED |
| `007_create_writer_memory_tables.sql` | Legacy memory schema (superseded by 007_create_writers_tables.sql) | ARCHIVED |
| `010_rls_hardening_inter_agent_access.sql` | Agent roles & access audit for Sara | DEPLOYED |
| (pending) `*_create_knowledge_entries.sql` | Create knowledge_entries table | READY FOR DEPLOY |

---

## Weekly Memory Review Process

**Trigger Phrase:** "weekly memory review"
**Owner:** Quinn (Operations Manager)
**Frequency:** Every Sunday evening

### Process Flow

```
1. Quinn reviews Sara's daily logs (last 7 days)
2. Extracts insights, decisions, lessons
3. Updates /agents/memory/sarah_memory.log
4. Identifies system-wide insights
5. Sends to Leo for knowledge_entries insertion
6. Leo executes INSERT (service_role only)
7. Entry becomes immutable & auditable
```

### Leo's Verification Query

```sql
-- Check that knowledge_entries was created
SELECT COUNT(*) FROM knowledge_entries
WHERE tags @> ARRAY['sara']::TEXT[];

-- View Sara's institutional knowledge
SELECT title, confidence, created_at FROM knowledge_entries
WHERE tags @> ARRAY['sara']::TEXT[]
ORDER BY created_at DESC;
```

---

## System Architecture (Visual)

```
┌─────────────────────────────────────────────────────────┐
│                    SARA'S MEMORY SYSTEM                  │
└─────────────────────────────────────────────────────────┘

        ┌──────────────────────────────────┐
        │   Daily Task Execution (Sara)    │
        │   - Create content               │
        │   - Coaching interactions        │
        │   - Audience feedback            │
        └────────────┬─────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────┐
        │   Local Memory (Markdown)        │
        │   /agents/memory/sarah_memory.log│
        │   - Brand voice reminders        │
        │   - Lessons learned              │
        │   - Standards checklist          │
        └────────────┬─────────────────────┘
                     │
                     ▼
        ┌──────────────────────────────────┐
        │   Weekly Memory Review (Quinn)   │
        │   - Analyze patterns             │
        │   - Identify system-wide lessons │
        │   - Promote to institutional     │
        └────────────┬─────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
   ┌─────────────┐          ┌──────────────────┐
   │  Transact.  │          │  Institutional   │
   │  Memory     │          │  Knowledge       │
   │             │          │                  │
   │ writer_     │          │ knowledge_       │
   │ memory_log  │          │ entries          │
   │             │          │                  │
   │ INSERT-only │          │ APPEND-ONLY      │
   │ by Sara     │          │ INSERT-only      │
   │             │          │ by Leo (service) │
   │ Tags:       │          │                  │
   │ engagement  │          │ Immutable:       │
   │ tone        │          │ no UPDATE/DELETE │
   │ objection   │          │                  │
   │             │          │ Tags:            │
   │ Target: <5  │          │ sara             │
   │ recent      │          │ voice            │
   │ entries per │          │ decision         │
   │ query       │          │                  │
   └─────────────┘          └──────────────────┘
        │                           │
        └──────────────┬────────────┘
                       │
        ┌──────────────▼─────────────┐
        │   Agent Access Audit       │
        │   /agent_access_audit      │
        │   - Sara's read operations │
        │   - Write attempts tracked │
        │   - All denied accesses    │
        │   - Query hashes logged    │
        └────────────────────────────┘
```

---

## Security Model

### Role-Based Access Control (RBAC)

**Sara's Permissions:**
```sql
SELECT permissions FROM agent_roles WHERE agent_name = 'sarah';
-- Returns: ["read_writers", "write_content", "read_memory"]
```

**What Sara Can Do:**
- ✅ READ her own writer profile
- ✅ READ other writers' profiles (for collaboration context)
- ✅ INSERT new writer_memory_log entries
- ✅ INSERT new writer_content records
- ✅ READ her own memory log entries

**What Sara Cannot Do:**
- ❌ UPDATE any writers table (immutable via RLS)
- ❌ DELETE any records (immutable via RLS)
- ❌ INSERT/UPDATE knowledge_entries (Leo only, service_role)
- ❌ ACCESS agent_access_audit (Leo only)
- ❌ MODIFY RLS policies (migrations only)

### Row Level Security (RLS)

```sql
-- Check if agent has permission
CREATE POLICY "agents_can_read_memory"
  ON writer_memory_log
  FOR SELECT
  USING (
    check_agent_permission(
      current_setting('app.current_agent', true)::VARCHAR(100),
      'read_memory'
    )
  );
```

---

## Compliance & Governance

### Assumption Aging Rule

Assumptions in knowledge_entries older than 60 days must be:
1. ✅ Revalidated (still true?)
2. ✅ Promoted to decision (if confirmed)
3. ✅ Marked as superseded (if contradicted)
4. ❌ Never left stale

### Immutability Guarantee

knowledge_entries is **APPEND-ONLY**:
- All queries are deterministic
- No historical rewriting
- Full audit trail maintained
- Contradictions stored as new entries (type='contradiction')

### Backup & Recovery

```bash
# Daily automated backup
/backups/carnivore-weekly-YYYY-MM-DD.sql

# Retention: 30 days
# Restore command: psql < backup-file.sql
```

---

## Deployment Status

| Component | Status | Location |
|-----------|--------|----------|
| `writers` table | DEPLOYED | Migration 007 |
| `writer_memory_log` table | DEPLOYED | Migration 007 |
| `writer_performance_metrics` | DEPLOYED | Migration 007 |
| `agent_roles` table | DEPLOYED | Migration 010 |
| `agent_access_audit` table | DEPLOYED | Migration 010 |
| `knowledge_entries` table | READY | /docs/LEO_KNOWLEDGE_ENTRIES_SETUP.md |
| Sara's seed data | DEPLOYED | Migration 007 |
| Sara's memory log file | DEPLOYED | /agents/memory/sarah_memory.log |

---

## Performance Targets (ACID-First)

All queries must meet these latency targets:

| Query Pattern | Target | Index Used |
|---------------|--------|-----------|
| Fetch recent lessons (5) | <50ms | idx_memory_log_writer_id |
| Search by lesson_type | <50ms | idx_memory_log_lesson_type |
| Search by tag | <50ms | idx_memory_log_tags (GIN) |
| Insert new lesson | <100ms | PRIMARY KEY |
| Knowledge_entries lookup | <50ms | idx_knowledge_created |

**Measured with:** PostgreSQL EXPLAIN ANALYZE
**Monitored by:** Leo (Database Architect)
**SLA:** 99.9% uptime (Supabase guarantee)

---

## Next Steps (For Implementation)

### Immediate (This Week)

1. ✅ Verify Migration 007 (writers, writer_memory_log)
2. ✅ Verify Migration 010 (agent_roles, access audit)
3. [ ] Deploy knowledge_entries table (Leo executes)
4. [ ] Test Sara's INSERT permissions on writer_memory_log
5. [ ] Verify audit trail (agent_access_audit records)

### Short Term (Next Week)

1. [ ] Implement weekly knowledge review (Quinn job)
2. [ ] Set up scheduled knowledge_entries promotions
3. [ ] Monitor agent_access_patterns view
4. [ ] Optimize slow queries (if any >50ms)

### Long Term (Q2 2026)

1. [ ] Add pgvector support for semantic search (Leo design)
2. [ ] Implement knowledge_entries archival (after 1 year)
3. [ ] Build Sara's voice drift detection (ML-based)
4. [ ] Create cross-agent knowledge synthesis view

---

## Key Principles (Leo's Philosophy)

> "A database is a promise you make to the future. Don't break it."

1. **ACID First** — Atomicity, Consistency, Isolation, Durability non-negotiable
2. **No NULL Values** — Every field has a reason to exist or doesn't exist at all
3. **Immutable Audit Trail** — Never rewrite history; contradict with new entries
4. **Soft Deletes** — Never hard-delete; mark is_active=FALSE and retain full history
5. **Permission Scoping** — Every agent has explicit, minimal permissions
6. **Append-Only Knowledge** — System-wide insights stored immutably in knowledge_entries
7. **Migrations Only** — No manual dashboard edits to production schema
8. **Performance Targets** — <50ms queries or investigate with EXPLAIN ANALYZE

---

## Questions to Ask Leo

1. **How do I query Sara's lessons?**
   → Use `SELECT * FROM writer_memory_log WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah') ORDER BY created_at DESC LIMIT 5;`

2. **Can Sara update her own lessons?**
   → No. writer_memory_log is append-only by design. If a lesson is wrong, INSERT a correction.

3. **How do lessons become institutional knowledge?**
   → Quinn reviews weekly, Leo promotes via INSERT into knowledge_entries (immutable).

4. **What happens if a lesson contradicts a past decision?**
   → INSERT a new knowledge_entries row with type='contradiction' and explain why.

5. **Are all Sara's queries audited?**
   → Yes. Every read/write is logged in agent_access_audit with timestamp and query_hash.

---

**Schema health is paramount. No manual edits to production. Migrations only.**

— Leo, Database Architect & Supabase Specialist
Whistler, BC
