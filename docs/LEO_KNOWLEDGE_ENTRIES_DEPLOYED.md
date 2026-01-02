# Knowledge Entries Table — Deployed ✅

**Deployment Date:** 2025-01-02
**Deployed By:** Leo (Memory Architect)
**Status:** Live in Supabase

## What Was Created

**Table:** `knowledge_entries`
- Append-only, immutable long-term memory layer
- No UPDATE or DELETE operations allowed
- INSERT-only for authorized users

## Schema

| Column | Type | Constraints | Purpose |
|--------|------|-------------|---------|
| id | uuid | PRIMARY KEY | Unique identifier |
| type | text | CHECK (decision \| assumption \| insight \| research \| contradiction) | Category |
| title | text | NOT NULL | Short title |
| summary | text | NOT NULL | Full content |
| source_file | text | - | Where extracted from |
| confidence | text | CHECK (high \| medium \| low) | Certainty level |
| tags | text[] | DEFAULT '{}' | For filtering/search |
| created_at | timestamptz | DEFAULT now() | Timestamp (UTC) |

## Security (RLS Policies)

✅ INSERT: Allowed (service role)
✅ SELECT: Allowed (all users)
❌ UPDATE: Blocked (prohibit_update policy)
❌ DELETE: Blocked (prohibit_delete policy)

## Indexes

- idx_knowledge_type (search by decision/assumption/etc)
- idx_knowledge_confidence (search by high/medium/low)
- idx_knowledge_source (search by source file)
- idx_knowledge_tags (array search)
- idx_knowledge_created (time-based queries)

## Next Steps

1. **Quinn:** Load extracted insights from markdown audit
2. **Quinn:** Populate with 8 locked decisions + key assumptions
3. **Quinn:** Weekly memory review feeds this table
4. **Leo:** Monitor table growth and query performance

## Example Entry

```sql
INSERT INTO knowledge_entries (
  type, title, summary, source_file, confidence, tags
) VALUES (
  'decision',
  'Technology Stack Locked',
  'Python 3.9 + Claude AI, GitHub Pages, PostgreSQL/Supabase with 4-table core. ACID-first philosophy.',
  'LEO_DATABASE_BLUEPRINT.md',
  'high',
  ARRAY['architecture', 'locked', 'phase-2-complete']
);
```

## Archive Location

Full setup guide: `docs/LEO_KNOWLEDGE_ENTRIES_SETUP.md`
