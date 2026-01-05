# Writer Memory System - Documentation

**Purpose**: Centralize and preserve writer lessons, patterns, and insights in structured database format.

**Status**: Implemented for Sarah
**Version**: 1.0
**Last Updated**: 2026-01-05

---

## Overview

The Writer Memory System captures writer expertise, learned lessons, identified patterns, and insights in Supabase. This enables:

- **Continuous Learning**: Each writer builds institutional knowledge over time
- **Knowledge Transfer**: Team can understand any writer's approach and reasoning
- **Quality Improvement**: Patterns from past successes inform future work
- **Consistency**: Writers reference their own memories during content creation
- **Accountability**: All lessons are documented and tracked

---

## Architecture

### Table: `writer_memory_log`

Centralized storage for all writer insights across the organization.

**Primary Fields**:
- `id` (UUID) - Unique identifier
- `writer_id` (UUID) - Links to writers table
- `memory_type` - Classification of the insight
- `title` - Short memorable name
- `description` - One-line summary
- `content` - Full detailed explanation
- `tags` (TEXT[]) - Searchable keywords
- `relevance_score` (0-1) - How critical the insight is
- `impact_category` - Domain of impact
- `implementation_status` - Active, archived, implemented, deprecated
- `source` - How the insight was learned (direct_learning, feedback, validation_error, strategic_decision)
- `created_at`, `updated_at` - Timestamps

### Memory Types

**1. lesson_learned** (4-5 per writer)
Core principles that guide the writer's work.
- Usually high relevance (0.90+)
- Examples: Voice formula, disclaimer strategy, pre-flight requirements
- Source: Direct learning, strategic decisions

**2. pattern_identified** (5-7 per writer)
Recurring procedural patterns the writer uses.
- Medium-high relevance (0.85-0.95)
- Examples: Writing process, self-check checklist, opening hooks
- Source: Observation, repeated success

**3. style_refinement** (2-3 per writer)
Specific style preferences and techniques.
- Medium relevance (0.85-0.90)
- Examples: Signature phrases, personal examples
- Source: Direct learning, feedback

**4. audience_insight** (2-3 per writer)
Understanding of audience and market.
- Medium relevance (0.85-0.90)
- Examples: Content scope, success metrics, reader preferences
- Source: Direct learning, audience feedback

### Impact Categories

| Category | Use Case | Example |
|----------|----------|---------|
| `voice_and_tone` | How the writer sounds | Signature phrases, conversational tone |
| `content_structure` | How content is organized | Opening hooks, post structure |
| `process_and_workflow` | How work gets done | Writing process, submission workflow |
| `quality_assurance` | How quality is maintained | Self-check checklist, validation gates |
| `compliance_and_safety` | Legal and safety concerns | Medical disclaimers, health claims |
| `governance` | Rules and boundaries | Authority limits, what cannot be done |
| `audience_and_scope` | Reader understanding | Content expertise, target audience |

---

## Sarah's Implementation

### 14 Total Memories Extracted

Source: `/agents/sarah.md` (461 lines of documentation)

**By Type**:
- Lesson Learned: 4 entries
- Style Refinement: 2 entries
- Pattern Identified: 6 entries
- Audience Insight: 2 entries

**By Impact Category**:
- voice_and_tone: 3
- process_and_workflow: 4
- compliance_and_safety: 2
- content_structure: 2
- quality_assurance: 1
- governance: 1
- audience_and_scope: 1

**Relevance Distribution**:
- 0.99: Category 7 Disclaimer
- 0.97: Pre-Flight Requirements
- 0.96: Medical Disclaimer Strategy
- 0.95: Warmth + Evidence Balance
- 0.94: Signature Phrases, Authority Limits
- Average: 0.91
- Range: 0.86-0.99

### Critical Sarah Insights

1. **Medical Disclaimer Categories**: 7 categories, each with 4 voice-matched variations. Category 7 (medications/diagnoses) is mandatory and must be caught before Jordan validation.

2. **Writing Process**: 5-step workflow with quality gates: Planning → Writing → Self-Check → Submission → Validation → Rework → Publication

3. **Voice Formula**: Warm, educational, evidence-based, never academic. Use contractions naturally. Grade 8-10 reading level.

4. **Pre-Flight**: Sarah MUST request current persona and last 10 active memory entries from Leo before writing ANY content.

5. **Authority Boundaries**: Hard limits on publishing without disclaimers, skipping validation, changing brand standards, or making unsupported health claims.

---

## Workflow: How Writers Use Memory

### Step 1: Pre-Flight (Start of writing session)
```sql
-- Leo executes these queries
SELECT slug, name, title, subtitle, signature, writing_style
FROM writers WHERE slug = 'sarah';

SELECT memory_type, title, description, tags, relevance_score
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND implementation_status = 'active'
ORDER BY created_at DESC LIMIT 10;
```

### Step 2: Memory Application
Sarah reviews her memories and applies them to the writing task:
- Voice formula (lesson_learned)
- Relevant patterns (pattern_identified)
- Style preferences (style_refinement)
- Audience insights (audience_insight)

### Step 3: Skill Invocation
Sarah uses her assigned MCP skills in order:
1. copy-editor (self-check)
2. carnivore-brand (voice consistency)
3. ai-text-humanization (AI pattern removal)
4. content-integrity (fact check)
5. seo-validator (search optimization)
6. soft-conversion (product mentions)

### Step 4: Self-Check
Sarah checks against her documented patterns:
- Read aloud test (sounds human?)
- Search for AI tell-words
- Em-dash count (max 1)
- Reading level (Grade 8-10)
- Citation verification
- Disclaimer presence (if health content)

### Step 5: Submission & Feedback
Sarah submits to Quinn → Jordan validation → Feedback → Sarah updates memory_log with lessons learned from feedback.

---

## Adding New Memories

When a writer learns something new:

1. **Source Recognition**: Identify where the insight came from
   - direct_learning (research, observation)
   - feedback (from editor, reader, validation)
   - validation_error (mistake caught during validation)
   - strategic_decision (organizational guidance)

2. **Memory Entry**: Create INSERT to writer_memory_log with:
   - writer_id (correct writer)
   - memory_type (lesson_learned, pattern_identified, etc.)
   - title (memorable, searchable)
   - description (one-liner)
   - content (full explanation)
   - tags (2-5 keywords)
   - relevance_score (0-1, be honest)
   - impact_category (one of 7)
   - implementation_status ('active' for new)
   - source (how it was learned)

3. **Reference**: Writer references this memory before next writing session
   - Prevents repeating the same mistake
   - Improves quality over time
   - Builds organizational knowledge

### Example: New Lesson from Feedback

Jordan flags Sarah's post for "too many em-dashes". Process:

1. Sarah experiences the error (validation feedback)
2. Quinn updates `writer_memory_log` with:
   ```json
   {
     "writer_id": "sarah_uuid",
     "memory_type": "pattern_identified",
     "title": "Em-dash Over-Usage Error",
     "description": "Maximum 1 em-dash per 1000 words; replace with periods or commas",
     "content": "Jordan flagged 3 em-dashes in 800-word post as excessive. Professional writing uses max 1 em-dash per page. Search draft for '--' before submitting.",
     "tags": ["punctuation", "writing-errors", "self-check"],
     "relevance_score": 0.92,
     "impact_category": "quality_assurance",
     "source": "validation_error"
   }
   ```
3. Sarah reads this memory before her next post
4. Sarah searches for "--" in her draft (prevents the mistake)

---

## Security & Access

### Row Level Security (RLS)

**SELECT** (read):
- Writers can read only their own memories
- Editors/admins can read all memories

**INSERT** (create):
- Only admins can insert memories
- Leo (system admin) creates memories from feedback

**UPDATE**:
- Only admins can update memories
- Memories are rarely updated (usually archived then create new)

**DELETE**:
- Memories are never deleted (audit trail)
- Use `implementation_status = 'deprecated'` to retire

### Audit Trail

All changes tracked via timestamps:
- `created_at`: When memory was first documented
- `updated_at`: Last modification (if any)
- Soft deletes via `implementation_status`

---

## Queries

### For Writers: Fetch My Active Memories
```sql
SELECT memory_type, title, description, tags, relevance_score
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND implementation_status = 'active'
ORDER BY relevance_score DESC, created_at DESC
LIMIT 10;
```

### For Leo: Check Memories by Category
```sql
SELECT impact_category, COUNT(*) as count, AVG(relevance_score) as avg_relevance
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
GROUP BY impact_category
ORDER BY count DESC;
```

### For Editors: Find Patterns Across Writers
```sql
SELECT w.slug, wm.memory_type, COUNT(*) as pattern_count
FROM writer_memory_log wm
JOIN writers w ON wm.writer_id = w.id
WHERE wm.memory_type = 'pattern_identified'
  AND wm.implementation_status = 'active'
GROUP BY w.slug, wm.memory_type;
```

### For Analysis: High-Relevance Insights
```sql
SELECT writer_id, memory_type, title, relevance_score
FROM writer_memory_log
WHERE relevance_score >= 0.95
  AND implementation_status = 'active'
ORDER BY relevance_score DESC, created_at DESC;
```

---

## Implementation Files

**Migrations**:
- `migrations/018_create_writer_memory_log.sql` - Table & RLS setup
- `migrations/019_seed_sarah_memories.sql` - Sarah's 14 initial memories

**Documentation**:
- `docs/WRITER_MEMORY_SYSTEM.md` - This file (system overview)
- `docs/SARAH_MEMORY_EXTRACTION.md` - Sarah's 14 memories in detail
- `/agents/sarah.md` - Original source document

**Execution**:
1. Open: https://supabase.com/dashboard/project/kwtdpvnjewtahuxjyltn/sql/new
2. Run: `migrations/018_create_writer_memory_log.sql`
3. Run: `migrations/019_seed_sarah_memories.sql`
4. Verify: `SELECT COUNT(*) FROM writer_memory_log WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah');` (expect: 14)

---

## Future Enhancements

**Planned Additions**:
1. Writer summaries (auto-generated from memories)
2. Memory search interface (keyword, type, category)
3. Memory recommendations (suggest relevant memories when writer starts new task)
4. Cross-writer patterns (identify common patterns across team)
5. Performance tracking (correlate memory usage with validation success rate)
6. AI tagging suggestions (auto-tag new memories)
7. Memory versioning (track evolution of insights over time)

**Next Writers**:
- Marcus (performance coach) - Extract from `/agents/marcus.md`
- Chloe (community manager) - Extract from `/agents/chloe.md`
- Quinn (operations) - Extract from `/agents/quinn.md`
- Jordan (quality validator) - Extract from `/agents/jordan.md`

---

## Philosophy

> "A writer's memory is sacred. Every lesson learned is institutional knowledge that belongs to the organization, not just the individual."

This system ensures:
- **No knowledge is lost** when writers rotate roles or leave
- **Quality compounds** as writers learn from their own mistakes
- **Consistency improves** as patterns are documented and followed
- **Onboarding accelerates** when new writers can learn from predecessors
- **Validation success increases** when writers apply documented patterns

---

**Maintained by**: Leo (Database Architect & Supabase Specialist)
**Schema Version**: 1.0
**Last Updated**: 2026-01-05
**Status**: Ready for Implementation
