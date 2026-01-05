# Migration 007: Unified Writers Schema Deployment Guide

## Overview
This document covers the deployment of `007_writers_unified_schema.sql` to Supabase PostgreSQL.

**Status:** Ready for deployment
**Project ID:** kwtdpvnjewtahuxjyltn
**Database:** postgres
**Migration Size:** 23.82 KB / 582 lines

## Schema Components

### 5 Tables Created
- **writers** - Core writer profiles with voice characteristics and expertise (20 columns)
- **writer_content** - Historical record of content created by writers
- **writer_relationships** - Collaboration patterns and knowledge sharing between writers
- **writer_memory_log** - Persistent memory of lessons learned (KEY TABLE FOR SARAH'S MEMORY)
- **writer_voice_snapshots** - Point-in-time captures of voice evolution

### 20 Indexes Created
Strategic indexes for query optimization across all 5 tables:
- writers table: 4 indexes (slug lookup, active status, specialty, created_at)
- writer_content: 3 indexes (writer_id, content_type, published_at)
- writer_relationships: 3 indexes (writer_a_id, writer_b_id, relationship_type)
- writer_memory_log: 8 indexes (writer_id, memory_type, lesson_type, tags GIN, impact_category, created_at, relevance_score, implementation_status)
- writer_voice_snapshots: 2 indexes (writer_id, snapshot_date)

### Seed Data
Three writer profiles:
- **Sarah** (slug: 'sarah') - Health Coach & Community Leader
  - Specialty: Health coaching, weight loss, women's health
  - Tone: Conversational, warm, empathetic
  - Voice formula with 5 signature phrases, engagement techniques, and writing principles

- **Marcus** (slug: 'marcus') - Sales & Partnerships Lead
  - Specialty: Partnership strategy, market trends, business opportunities
  - Tone: Professional, direct, data-driven

- **Chloe** (slug: 'chloe') - Marketing & Community Manager
  - Specialty: Community engagement, trending topics, social media
  - Tone: Conversational, enthusiastic, trendy

### Seed Memories (2 for Sarah)
1. **"Specificity drives engagement"** - Pattern that specific examples outperform generic advice
2. **"Budget is the primary barrier for beginners"** - Audience insight about affordability concerns

## Deployment Methods

### Method 1: Supabase Dashboard (Easiest)
1. Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn
2. Navigate to "SQL Editor" in left sidebar
3. Click "New query"
4. Copy entire contents of `/Users/mbrew/Developer/carnivore-weekly/migrations/007_writers_unified_schema.sql`
5. Paste into the SQL editor
6. Click "Run" button
7. Verify success (should complete with no errors)

### Method 2: Supabase CLI (from machine with network access)
```bash
# Set access token
export SUPABASE_ACCESS_TOKEN="<your-access-token>"

# Navigate to project directory
cd /Users/mbrew/Developer/carnivore-weekly

# Link to project
supabase link --project-ref kwtdpvnjewtahuxjyltn

# Deploy migration
supabase db push --dry-run  # Preview changes
supabase db push            # Execute migration
```

### Method 3: psql (direct PostgreSQL, requires network access)
```bash
# From a machine with PostgreSQL installed and network access to Supabase
psql -h db.kwtdpvnjewtahuxjyltn.supabase.co \
     -p 5432 \
     -d postgres \
     -U postgres \
     -f /Users/mbrew/Developer/carnivore-weekly/migrations/007_writers_unified_schema.sql
```

**Postgres credentials are in:** `/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json`

## Verification Queries

After deployment completes, run these queries to verify success:

### 1. Verify Sarah's profile exists
```sql
SELECT slug, name, role_title FROM writers WHERE slug = 'sarah';
```

**Expected result:**
```
 slug | name |          role_title
------+------+-------------------------------
 sarah| Sarah| Health Coach & Community Leader
```

### 2. Verify Sarah's memory entries
```sql
SELECT memory_type, title, description, tags
FROM writer_memory_log
WHERE writer_id = (SELECT id FROM writers WHERE slug = 'sarah')
LIMIT 5;
```

**Expected result:** 2 rows
- Row 1: memory_type='lesson_learned', title='Specificity drives engagement'
- Row 2: memory_type='pattern_identified', title='Budget is the primary barrier for beginners'

### 3. Verify all tables created
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

**Expected result:** 5 tables
- writer_content
- writer_memory_log
- writer_relationships
- writer_voice_snapshots
- writers

### 4. Verify all writer profiles
```sql
SELECT slug, name, specialty FROM writers ORDER BY slug;
```

**Expected result:** 3 rows
- chloe, Chloe, Community engagement, trending topics, social media strategy
- marcus, Marcus, Partnership strategy, market trends, business opportunities
- sarah, Sarah, Health coaching, weight loss, women's health

### 5. Verify indexes created
```sql
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public' AND tablename LIKE 'writer%'
ORDER BY tablename, indexname;
```

**Expected:** Multiple indexes across all writer tables

## Schema Details

### writers table (20 columns)
```
Column               | Type                    | Constraints
---------------------|-------------------------|-------------------------------------
id                   | BIGSERIAL PRIMARY KEY   | NOT NULL
slug                 | VARCHAR(100)            | NOT NULL, UNIQUE
name                 | VARCHAR(200)            | NOT NULL, UNIQUE
role_title           | VARCHAR(200)            | NOT NULL
bio                  | TEXT                    | NULL
specialty            | VARCHAR(500)            | NOT NULL
experience_level     | VARCHAR(50)             | DEFAULT 'expert'
tone_style           | VARCHAR(100)            | DEFAULT 'professional'
signature_style      | TEXT                    | NULL
tagline              | TEXT                    | NULL
avatar_url           | VARCHAR(500)            | NULL
preferred_topics     | TEXT[]                  | DEFAULT '{}'
content_domains      | JSONB                   | DEFAULT '{}'
voice_formula        | JSONB                   | NULL
philosophy           | TEXT                    | NULL
is_active            | BOOLEAN                 | DEFAULT TRUE
created_at           | TIMESTAMP WITH TIME ZONE| NOT NULL
updated_at           | TIMESTAMP WITH TIME ZONE| NOT NULL
created_by           | UUID (FK: auth.users)   | NULL
updated_by           | UUID (FK: auth.users)   | NULL
```

### writer_memory_log table (CORE FOR SARAH'S MEMORY)
```
Column               | Type                    | Constraints
---------------------|-------------------------|-------------------------------------
id                   | BIGSERIAL PRIMARY KEY   | NOT NULL
writer_id            | BIGINT                  | FK: writers(id) ON DELETE CASCADE
memory_type          | VARCHAR(50)             | CHECK (8 valid types)
title                | VARCHAR(500)            | NOT NULL
description          | TEXT                    | NOT NULL
content              | TEXT                    | NOT NULL
context              | JSONB                   | DEFAULT '{}'
related_content_id   | BIGINT                  | FK: writer_content(id) ON DELETE SET NULL
source_content_id    | BIGINT                  | NULL
source_type          | VARCHAR(50)             | NULL
relevance_score      | DECIMAL(3,2)            | CHECK (0-1 scale)
impact_category      | VARCHAR(100)            | 7 valid categories
implementation_status| VARCHAR(50)             | DEFAULT 'documented'
source               | VARCHAR(100)            | DEFAULT 'system_analysis'
tags                 | TEXT[]                  | DEFAULT '{}'
lesson_type          | VARCHAR(100)            | NULL (legacy)
is_active            | BOOLEAN                 | DEFAULT TRUE
expires_at           | TIMESTAMP WITH TIME ZONE| NULL
created_at           | TIMESTAMP WITH TIME ZONE| NOT NULL
updated_at           | TIMESTAMP WITH TIME ZONE| NOT NULL
created_by           | UUID (FK: auth.users)   | NULL
```

## Important Notes

1. **Idempotent Design:** The migration uses `CREATE TABLE IF NOT EXISTS` and `DROP TABLE IF EXISTS CASCADE` to ensure it can run multiple times safely.

2. **Trigger Automation:** Includes `update_writer_timestamp_trigger` on writers table to automatically update the `updated_at` field.

3. **ACID Compliance:** All foreign keys are properly defined with CASCADE deletes where appropriate.

4. **Row Level Security:** After this migration, RLS policies should be added (separate work).

5. **Voice Formula:** The `voice_formula` JSONB column stores:
   - tone
   - signature_phrases (array)
   - engagement_techniques (array)
   - writing_principles (array)
   - common_opening_patterns (array)

6. **Content Domains:** The `content_domains` JSONB maps content types to expertise levels for flexible domain expertise tracking.

## Rollback Plan

If needed, to rollback this migration:

```sql
-- Drop all created tables (in reverse dependency order)
DROP TABLE IF EXISTS writer_voice_snapshots CASCADE;
DROP TABLE IF EXISTS writer_memory_log CASCADE;
DROP TABLE IF EXISTS writer_relationships CASCADE;
DROP TABLE IF EXISTS writer_content CASCADE;
DROP TABLE IF EXISTS writers CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_writer_timestamp CASCADE;
```

## Next Steps

After successful deployment:

1. Apply Row Level Security (RLS) policies to protect writer data
2. Create Supabase Edge Functions for memory management
3. Setup webhook triggers for memory log automation
4. Test voice formula extraction with actual prompt engineering
5. Begin populating memory_log with production insights

## Status

- Migration file validated: ✅
- SQL syntax checked: ✅
- Table structure verified: ✅
- Seed data prepared: ✅
- Ready for deployment: ✅

---

**Last updated:** 2026-01-05
**Prepared by:** Leo (Database Architect)
**Schema version:** 007 (Unified Writers Schema v1.0)
