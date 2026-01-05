# Writers Schema Reference (Migration 007)

## Schema Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         writers (Core)                          │
├─────────────────────────────────────────────────────────────────┤
│ id (BIGSERIAL PK)                                               │
│ slug (VARCHAR UNIQUE) ────────────┐                             │
│ name (VARCHAR UNIQUE)              │                             │
│ role_title (VARCHAR)               │                             │
│ specialty (VARCHAR)                │                             │
│ experience_level (VARCHAR)         │                             │
│ tone_style (VARCHAR)               │  ┌──────────────────────┐  │
│ signature_style (TEXT)             │  │ Foreign Key refs    │  │
│ tagline (TEXT)                     │  ├──────────────────────┤  │
│ avatar_url (VARCHAR)               │  │ writer_id (BIGINT)  │  │
│ preferred_topics (TEXT[])          │  │ ↓                   │  │
│ content_domains (JSONB)            │  │ writer_content      │  │
│ voice_formula (JSONB)              │  │ writer_relationships│  │
│ philosophy (TEXT)                  │  │ writer_memory_log   │  │
│ is_active (BOOLEAN)                │  │ voice_snapshots     │  │
│ created_at (TIMESTAMP)             │  └──────────────────────┘  │
│ updated_at (TIMESTAMP)             │                             │
│ created_by (UUID FK)               │                             │
│ updated_by (UUID FK)               │                             │
└─────────────────────────────────────────────────────────────────┘
         ▲                  ▲                    ▲                    ▲
         │                  │                    │                    │
    Indexes:           writer_content      writer_relationships   voice_snapshots
    4 total        3 indexes (7 total)  3 indexes (8 total)   2 indexes (14 total)
```

## Complete Table Specifications

### 1. writers Table

**Purpose:** Core writer profiles with voice characteristics, expertise, and metadata

**Columns (20 total):**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Auto-incrementing unique identifier |
| slug | VARCHAR(100) | NOT NULL, UNIQUE | URL-safe identifier (sarah, marcus, chloe) |
| name | VARCHAR(200) | NOT NULL, UNIQUE | Display name |
| role_title | VARCHAR(200) | NOT NULL | Professional role |
| bio | TEXT | NULL | Biographical information |
| specialty | VARCHAR(500) | NOT NULL | Primary expertise area |
| experience_level | VARCHAR(50) | DEFAULT 'expert' | Career level: junior/mid/senior/expert |
| tone_style | VARCHAR(100) | DEFAULT 'professional' | Writing tone characteristic |
| signature_style | TEXT | NULL | Distinctive writing patterns |
| tagline | TEXT | NULL | Short value proposition |
| avatar_url | VARCHAR(500) | NULL | Profile image URL |
| preferred_topics | TEXT[] | DEFAULT '{}' | Array of preferred topics |
| content_domains | JSONB | DEFAULT '{}' | Domain expertise mapping |
| voice_formula | JSONB | NULL | Detailed voice formula JSON |
| philosophy | TEXT | NULL | Core beliefs and approach |
| is_active | BOOLEAN | DEFAULT TRUE | Soft delete flag |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Updated timestamp |
| created_by | UUID | FK auth.users (ON DELETE SET NULL) | Creator user ID |
| updated_by | UUID | FK auth.users (ON DELETE SET NULL) | Last modifier user ID |

**Indexes (4):**
- `idx_writers_slug` - WHERE is_active = true (lookup by slug)
- `idx_writers_active` - (is_active, created_at DESC) (list active writers)
- `idx_writers_specialty` - (specialty) (find by expertise)
- `idx_writers_created_at` - (created_at DESC) (historical tracking)

**Trigger:**
- `update_writer_timestamp_trigger` - Auto-updates `updated_at` on any modification

**Constraints:**
- slug must not be empty
- name must not be empty
- role_title must not be empty
- specialty must not be empty

---

### 2. writer_content Table

**Purpose:** Historical record of content created by writers with performance metrics

**Columns (10):**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Content identifier |
| writer_id | BIGINT | FK writers(id) ON DELETE CASCADE | Author |
| title | VARCHAR(500) | NOT NULL | Content title |
| content_type | VARCHAR(50) | NOT NULL, CHECK | Type: article, newsletter, social_post, email, blog, research, review |
| word_count | INTEGER | NULL | Article length |
| reading_time_minutes | INTEGER | NULL | Estimated reading time |
| tone_applied | VARCHAR(100) | NULL | Voice tone used |
| key_themes | TEXT[] | NULL | Main topics covered |
| performance_score | DECIMAL(5,2) | CHECK (0-100) | Engagement aggregate score |
| engagement_metrics | JSONB | NULL | Views, shares, comments, sentiment, CTR, bounce rate |
| published_at | TIMESTAMP WITH TIME ZONE | NULL | Publication date |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Record creation |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Record update |

**Indexes (3):**
- `idx_writer_content_writer_id` - (writer_id) (fetch by author)
- `idx_writer_content_type` - (content_type) (filter by type)
- `idx_writer_content_published` - (published_at DESC) (timeline queries)

---

### 3. writer_relationships Table

**Purpose:** Tracks collaboration patterns and knowledge sharing between writers

**Columns (8):**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Relationship identifier |
| writer_a_id | BIGINT | FK writers(id) ON DELETE CASCADE | First writer |
| writer_b_id | BIGINT | FK writers(id) ON DELETE CASCADE | Second writer |
| relationship_type | VARCHAR(50) | NOT NULL, CHECK | Type: mentor, mentee, peer, collaborator, reviewer |
| collaboration_count | INTEGER | DEFAULT 0 | Number of collaborations |
| knowledge_transfer_areas | TEXT[] | NULL | Topics/skills shared |
| last_interaction | TIMESTAMP WITH TIME ZONE | NULL | Last collaboration date |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Record creation |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Record update |

**Indexes (3):**
- `idx_writer_relationships_a` - (writer_a_id) (find relationships)
- `idx_writer_relationships_b` - (writer_b_id) (find relationships)
- `idx_writer_relationships_type` - (relationship_type) (filter by type)

**Constraints:**
- Different writers: writer_a_id != writer_b_id
- Unique pair: LEAST/GREATEST normalization prevents duplicate relationships

---

### 4. writer_memory_log Table (KEY TABLE)

**Purpose:** Persistent memory of lessons learned, improvements, and contextual insights for agent optimization

**Columns (21):**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Memory identifier |
| writer_id | BIGINT | FK writers(id) ON DELETE CASCADE | Writer this memory belongs to |
| memory_type | VARCHAR(50) | NOT NULL, CHECK | Type: lesson_learned, pattern_identified, improvement, audience_insight, technical_tip, style_refinement, audience_feedback, competitive_analysis |
| title | VARCHAR(500) | NOT NULL | Memory title/headline |
| description | TEXT | NOT NULL | Summary description |
| content | TEXT | NOT NULL | Full memory content |
| context | JSONB | DEFAULT '{}' | Additional context JSON |
| related_content_id | BIGINT | FK writer_content(id) ON DELETE SET NULL | Associated content |
| source_content_id | BIGINT | NULL | Alternative content reference |
| source_type | VARCHAR(50) | NULL | Where lesson came from |
| relevance_score | DECIMAL(3,2) | CHECK (0-1 scale) | Applicability to current writing |
| impact_category | VARCHAR(100) | CHECK | Expected impact: tone_improvement, engagement_boost, accuracy_increase, clarity_enhancement, audience_expansion, efficiency_gain, brand_alignment |
| implementation_status | VARCHAR(50) | DEFAULT 'documented' | Status: documented, in_progress, implemented, archived |
| source | VARCHAR(100) | DEFAULT 'system_analysis' | Origin: direct_learning, audience_feedback, peer_input, system_analysis, external_research |
| tags | TEXT[] | DEFAULT '{}' | Search tags (searchable) |
| lesson_type | VARCHAR(100) | NULL | Legacy field name |
| is_active | BOOLEAN | DEFAULT TRUE | Active flag |
| expires_at | TIMESTAMP WITH TIME ZONE | NULL | Expiration date if applicable |
| created_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Creation timestamp |
| updated_at | TIMESTAMP WITH TIME ZONE | NOT NULL | Update timestamp |
| created_by | UUID | FK auth.users (ON DELETE SET NULL) | Creator |

**Indexes (8) - Optimized for memory queries:**
- `idx_writer_memory_log_writer_id` - (writer_id, created_at DESC) - Recent lessons for writer
- `idx_writer_memory_log_memory_type` - (writer_id, memory_type, created_at DESC) - Filter by type
- `idx_writer_memory_log_lesson_type` - (writer_id, lesson_type, created_at DESC) - Legacy support
- `idx_writer_memory_log_tags` - GIN index on tags array - Full-text tag search
- `idx_writer_memory_log_impact` - (impact_category) - Filter by business impact
- `idx_writer_memory_log_created` - (created_at DESC) - Time-series queries
- `idx_writer_memory_log_relevance` - (relevance_score DESC) - Rank by relevance
- `idx_writer_memory_log_status` - (implementation_status) - Track progress

---

### 5. writer_voice_snapshots Table

**Purpose:** Point-in-time captures of writer voice characteristics for tracking evolution

**Columns (14):**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGSERIAL | PRIMARY KEY | Snapshot identifier |
| writer_id | BIGINT | FK writers(id) ON DELETE CASCADE | Writer being captured |
| snapshot_date | TIMESTAMP WITH TIME ZONE | NOT NULL, DEFAULT CURRENT_TIMESTAMP, NOT FUTURE | When snapshot was taken |
| tone_characteristics | JSONB | NOT NULL | Tone dimensions (warmth, authority, formality, humor, empathy) |
| signature_phrases | TEXT[] | NOT NULL | Recurring unique phrases |
| vocabulary_profile | JSONB | NOT NULL | Word choice analysis |
| sentence_structure_patterns | JSONB | NOT NULL | Grammar and sentence patterns |
| engagement_techniques | TEXT[] | NOT NULL | Methods to engage audience |
| audience_connection_style | VARCHAR(255) | NULL | How writer connects with readers |
| content_organization_pattern | VARCHAR(100) | NULL | How content is structured |
| distinctive_elements | TEXT[] | NULL | Unique voice markers |
| voice_consistency_score | DECIMAL(5,2) | CHECK (0-100) | Consistency measure |
| performance_baseline | DECIMAL(5,2) | NULL | Baseline engagement score |
| evolution_notes | TEXT | NULL | Notes on changes |
| period_summary | TEXT | NULL | Summary of period |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | Record creation |

**Indexes (2):**
- `idx_writer_voice_snapshots_writer_id` - (writer_id) (get writer's snapshots)
- `idx_writer_voice_snapshots_date` - (snapshot_date DESC) (timeline queries)

---

## Seed Data

### Writer Profiles (3 inserted)

**Sarah** (slug: 'sarah')
```sql
name = 'Sarah'
role_title = 'Health Coach & Community Leader'
tagline = 'Helping people understand carnivore nutrition with authentic insights and proven results'
specialty = 'Health coaching, weight loss, women''s health'
experience_level = 'expert'
tone_style = 'conversational'
signature_style = 'Warm, empathetic, evidence-based'
bio = 'Sarah has been coaching people through the carnivore lifestyle for over a decade. Her approach is grounded in real client experience and health science.'
is_active = true
```

**Marcus** (slug: 'marcus')
```sql
name = 'Marcus'
role_title = 'Sales & Partnerships Lead'
tagline = 'Building relationships and identifying opportunities within the carnivore ecosystem'
specialty = 'Partnership strategy, market trends, business opportunities'
experience_level = 'expert'
tone_style = 'professional'
signature_style = 'Direct, data-driven, opportunity-focused'
```

**Chloe** (slug: 'chloe')
```sql
name = 'Chloe'
role_title = 'Marketing & Community Manager'
tagline = 'Creating engaging content that connects our audience with the carnivore community'
specialty = 'Community engagement, trending topics, social media strategy'
experience_level = 'expert'
tone_style = 'conversational'
signature_style = 'Enthusiastic, trendy, inclusive'
```

### Memory Log Seed Data (2 for Sarah)

**Memory 1: Specificity drives engagement**
```
memory_type = 'lesson_learned'
title = 'Specificity drives engagement'
description = 'People respond better when I address their specific challenges. Generic advice gets scrolled past. Use real examples from coaching conversations.'
source = 'direct_learning'
source_type = 'self_reflection'
tags = ['engagement', 'specificity', 'audience-focus']
relevance_score = 0.95
impact_category = 'engagement_boost'
implementation_status = 'implemented'
```

**Memory 2: Budget is the primary barrier for beginners**
```
memory_type = 'pattern_identified'
title = 'Budget is the primary barrier for beginners'
description = 'When addressing "carnivore is too expensive", lead with budget-friendly options: beef organ meats, eggs, ground beef. Show real meal plans with costs.'
source = 'audience_feedback'
source_type = 'audience_feedback'
tags = ['budget', 'objection-handling', 'affordability']
relevance_score = 0.92
impact_category = 'audience_expansion'
implementation_status = 'implemented'
```

---

## Voice Formula JSON Structure

Example from Sarah:

```json
{
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
  ],
  "common_opening_patterns": [
    "I've been coaching for X years...",
    "One thing I've noticed...",
    "Here's what works..."
  ]
}
```

---

## Content Domains JSON Structure

Example from Sarah:

```json
{
  "health_coaching": "expert",
  "weight_loss": "expert",
  "womens_health": "expert",
  "beginner_guidance": "expert"
}
```

---

## Query Examples

### Find Sarah by slug
```sql
SELECT id, name, role_title, specialty
FROM writers
WHERE slug = 'sarah' AND is_active = true;
```

### Get Sarah's 5 most recent memory entries
```sql
SELECT memory_type, title, description, tags, relevance_score
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND is_active = true
ORDER BY created_at DESC
LIMIT 5;
```

### Find implemented improvements
```sql
SELECT title, description, impact_category, relevance_score
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND implementation_status = 'implemented'
  AND memory_type IN ('improvement', 'lesson_learned')
ORDER BY relevance_score DESC;
```

### Get all active writers with their memory count
```sql
SELECT
  w.slug,
  w.name,
  w.role_title,
  COUNT(m.id) as memory_count
FROM writers w
LEFT JOIN writer_memory_log m ON w.id = m.writer_id AND m.is_active = true
WHERE w.is_active = true
GROUP BY w.id, w.slug, w.name, w.role_title
ORDER BY w.slug;
```

### Find Sarah's recent improvements by impact
```sql
SELECT
  title,
  description,
  impact_category,
  implementation_status,
  relevance_score,
  created_at
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
  AND memory_type IN ('improvement', 'style_refinement')
ORDER BY created_at DESC, relevance_score DESC
LIMIT 10;
```

---

## Integration Points

### For Agent Token Optimization
The `writer_memory_log` table powers dynamic prompt injection:
1. Query recent implemented lessons (ORDER BY created_at DESC LIMIT 5)
2. Parse `content` field into agent system prompt
3. Weight by `relevance_score` (0.0-1.0)
4. Filter by `implementation_status = 'implemented'`

### For Analytics
The `writer_content` table combined with `engagement_metrics` JSONB:
1. Track content performance over time
2. Correlate writer tone_style with performance_score
3. Identify trending content_types

### For Relationship Management
The `writer_relationships` table:
1. Map mentor/mentee relationships for knowledge transfer
2. Track collaboration frequency
3. Identify knowledge gaps and learning opportunities

---

## Next Steps

1. **Apply Row Level Security (RLS)**
   - Writers can only modify their own records
   - Only admins can view all writers
   - Memory logs are read-only except for creator

2. **Create Supabase Edge Functions**
   - Memory log ingestion webhook
   - Voice formula extraction from content
   - Engagement metric aggregation

3. **Setup Triggers**
   - Auto-generate voice snapshots on significant changes
   - Webhook notification on memory log updates
   - Archive old memories based on expiration date

4. **Build Integrations**
   - AI prompt injection from memory_log
   - Dashboard visualization of voice evolution
   - Memory suggestion system for writers

---

**Schema Version:** 007 (Unified Writers Schema v1.0)
**Last Updated:** 2026-01-05
**Database:** Supabase PostgreSQL (kwtdpvnjewtahuxjyltn)
