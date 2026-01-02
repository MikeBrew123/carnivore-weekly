# Knowledge Entries Table Setup — Leo

## Schema (Append-Only, Immutable)

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

## Append-Only RLS Policies

```sql
-- Enable RLS on knowledge_entries
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow INSERT for service role
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

## Indexes for Performance

```sql
-- Search by type
CREATE INDEX idx_knowledge_type ON knowledge_entries(type);

-- Search by confidence level
CREATE INDEX idx_knowledge_confidence ON knowledge_entries(confidence);

-- Search by source file
CREATE INDEX idx_knowledge_source ON knowledge_entries(source_file);

-- Search by tags
CREATE INDEX idx_knowledge_tags ON knowledge_entries USING GIN(tags);

-- Time-based queries
CREATE INDEX idx_knowledge_created ON knowledge_entries(created_at DESC);
```

## Verification Query

```sql
-- Check table structure
\d knowledge_entries

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'knowledge_entries';

-- Test append-only (should succeed)
INSERT INTO knowledge_entries (type, title, summary, confidence)
VALUES ('decision', 'Test Entry', 'Test summary', 'high');

-- Test immutability (should fail)
UPDATE knowledge_entries SET title = 'Updated' WHERE id = ...;
-- Error: new row violates row-level security policy

-- Test deletion (should fail)
DELETE FROM knowledge_entries WHERE id = ...;
-- Error: new row violates row-level security policy
```

## Data Types Explained

| Field | Type | Purpose |
|-------|------|---------|
| `id` | uuid | Unique identifier, auto-generated |
| `type` | text | Category: decision, assumption, insight, research, contradiction |
| `title` | text | Short title (searchable) |
| `summary` | text | Full content (immutable after insert) |
| `source_file` | text | Where this came from (e.g., LEO_DATABASE_BLUEPRINT.md) |
| `confidence` | text | High / Medium / Low certainty |
| `tags` | text[] | Array of tags for filtering |
| `created_at` | timestamptz | Auto-timestamp, UTC |

## Usage Example

```sql
INSERT INTO knowledge_entries (
  type, title, summary, source_file, confidence, tags
) VALUES (
  'decision',
  'Technology Stack Locked',
  'Python 3.9 + Claude AI (Anthropic), GitHub Pages + GitHub Actions, PostgreSQL/Supabase with 4-table core architecture. ACID-first philosophy.',
  'LEO_DATABASE_BLUEPRINT.md',
  'high',
  ARRAY['architecture', 'technology', 'locked', 'phase-2-complete']
);
```

## Implementation

Execute in Supabase SQL Editor:
1. Copy schema CREATE TABLE statement
2. Copy RLS policies (all 4)
3. Copy indexes (all 5)
4. Run verification query
5. Test with example INSERT

**Status:** Ready for Leo to deploy in Supabase
