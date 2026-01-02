# Weekly Knowledge Report — Leo Implementation

**Schedule:** Sundays 18:00 local time
**Output:** Append to docs/project-log/weekly/weekly-knowledge-report.md
**Query Playbook:** 5 approved read-only queries
**Constraints:** Read-only (no INSERT/UPDATE/DELETE)

---

## Approved Query Playbook

```sql
-- Query 1: High-Confidence Decisions
SELECT title, summary
FROM knowledge_entries
WHERE type = 'decision'
  AND confidence = 'high'
ORDER BY created_at DESC;

-- Query 2: All Assumptions
SELECT title, summary, confidence
FROM knowledge_entries
WHERE type = 'assumption'
ORDER BY created_at DESC;

-- Query 3: New Entries (Past 7 Days)
SELECT type, title, confidence, created_at
FROM knowledge_entries
WHERE created_at >= now() - interval '7 days'
ORDER BY created_at DESC;

-- Query 4: Top 10 Tags
SELECT unnest(tags) AS tag, count(*) AS count
FROM knowledge_entries
GROUP BY tag
ORDER BY count DESC
LIMIT 10;

-- Query 5: Summary by Type/Confidence
SELECT type, confidence, count(*)
FROM knowledge_entries
GROUP BY type, confidence
ORDER BY confidence DESC, type;

-- Query 6: Aging Assumptions (30+ days old)
SELECT
  title,
  summary,
  confidence,
  created_at,
  EXTRACT(DAY FROM now() - created_at)::int AS age_days
FROM knowledge_entries
WHERE type = 'assumption'
  AND created_at <= now() - interval '30 days'
ORDER BY created_at ASC;
```

---

## Deterministic Markdown Function

```sql
CREATE OR REPLACE FUNCTION generate_weekly_knowledge_report()
RETURNS text AS $$
DECLARE
  report text := '';
  report_date text;
  decision_count int;
  assumption_count int;
  new_count int;
  total_entries int;
  high_count int;
  medium_count int;
  low_count int;
BEGIN
  -- Use fixed date for determinism
  report_date := to_char(date_trunc('week', now())::date + interval '6 days', 'YYYY-MM-DD');

  -- Header with date
  report := E'\n## ' || report_date || E'\n\n';

  -- Section 1: Snapshot (High-Confidence Decisions)
  report := report || '### Snapshot (High-Confidence Decisions)' || E'\n';

  WITH decisions AS (
    SELECT title, summary
    FROM knowledge_entries
    WHERE type = 'decision'
      AND confidence = 'high'
    ORDER BY created_at DESC
  )
  SELECT
    report || string_agg('- ' || title || ' — ' || summary || E'\n', '')
  INTO report
  FROM decisions;

  report := report || E'\n';

  -- Section 2: New This Week
  report := report || '### New This Week' || E'\n';

  WITH recent AS (
    SELECT type, title, confidence, created_at
    FROM knowledge_entries
    WHERE created_at >= now() - interval '7 days'
    ORDER BY created_at DESC
  )
  SELECT
    report || string_agg('- [' || type || '] ' || title || ' (' || confidence || ')' || E'\n', '')
  INTO report
  FROM recent;

  SELECT count(*) INTO new_count
  FROM knowledge_entries
  WHERE created_at >= now() - interval '7 days';

  IF new_count = 0 THEN
    report := report || '- No new entries this week' || E'\n';
  END IF;

  report := report || E'\n';

  -- Section 3: Open Assumptions
  report := report || '### Open Assumptions' || E'\n';

  WITH assumptions AS (
    SELECT title, summary, confidence
    FROM knowledge_entries
    WHERE type = 'assumption'
    ORDER BY created_at DESC
  )
  SELECT
    report || string_agg('- ' || title || ' — ' || summary || ' (' || confidence || ')' || E'\n', '')
  INTO report
  FROM assumptions;

  report := report || E'\n';

  -- Section 4: Patterns Emerging (Top 10 Tags)
  report := report || '### Patterns Emerging' || E'\n';

  WITH tags AS (
    SELECT unnest(tags) AS tag, count(*) AS tag_count
    FROM knowledge_entries
    GROUP BY tag
    ORDER BY tag_count DESC
    LIMIT 10
  )
  SELECT
    report || string_agg('- ' || tag || ' — ' || tag_count || E'\n', '')
  INTO report
  FROM tags;

  report := report || E'\n';

  -- Section 5: Aging Assumptions (30+ days)
  report := report || '### Aging Assumptions' || E'\n\n';

  WITH aging AS (
    SELECT
      title,
      summary,
      confidence,
      EXTRACT(DAY FROM now() - created_at)::int AS age_days
    FROM knowledge_entries
    WHERE type = 'assumption'
      AND created_at <= now() - interval '30 days'
    ORDER BY created_at ASC
  ),
  over_60 AS (
    SELECT * FROM aging WHERE age_days > 60
  ),
  thirty_to_60 AS (
    SELECT * FROM aging WHERE age_days BETWEEN 30 AND 60
  )
  SELECT
    report ||
    '#### Over 60 Days (Action Required)' || E'\n' ||
    COALESCE(
      (SELECT string_agg('- ' || title || ' — ' || summary || ' (age: ' || age_days || ' days)' || E'\n', '')
       FROM over_60),
      '- None' || E'\n'
    ) || E'\n' ||
    '#### 30–60 Days (Review Soon)' || E'\n' ||
    COALESCE(
      (SELECT string_agg('- ' || title || ' — ' || summary || ' (age: ' || age_days || ' days)' || E'\n', '')
       FROM thirty_to_60),
      '- None' || E'\n'
    )
  INTO report;

  report := report || E'\n';

  -- Section 6: System Health
  report := report || '### System Health' || E'\n';

  SELECT COUNT(*) INTO total_entries FROM knowledge_entries;
  SELECT SUM(CASE WHEN confidence = 'high' THEN 1 ELSE 0 END) INTO high_count FROM knowledge_entries;
  SELECT SUM(CASE WHEN confidence = 'medium' THEN 1 ELSE 0 END) INTO medium_count FROM knowledge_entries;
  SELECT SUM(CASE WHEN confidence = 'low' THEN 1 ELSE 0 END) INTO low_count FROM knowledge_entries;

  report := report || '- Total entries: ' || COALESCE(total_entries, 0) || E'\n';
  report := report || '- High confidence: ' || COALESCE(high_count, 0) || E'\n';
  report := report || '- Medium confidence: ' || COALESCE(medium_count, 0) || E'\n';
  report := report || '- Low confidence: ' || COALESCE(low_count, 0) || E'\n';

  RETURN report;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Scheduled Job (pg_cron)

```sql
-- One-time setup
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule: Sunday 18:00 local time
SELECT cron.schedule(
  'weekly-knowledge-report-sunday-1800',
  '0 18 * * 0',  -- Sunday at 18:00 UTC (adjust TZ as needed)
  $$
    SELECT generate_weekly_knowledge_report();
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;
```

---

## Output File: docs/project-log/weekly/weekly-knowledge-report.md

File structure:
```
# Weekly Knowledge Reports

## 2025-01-05

### Snapshot (High-Confidence Decisions)
...

### New This Week
...

## 2025-01-12

### Snapshot (High-Confidence Decisions)
...
```

Each week appends a new section with date header.

---

## Execution Steps for Leo

1. **Deploy function in Supabase SQL Editor:**
   ```sql
   CREATE OR REPLACE FUNCTION generate_weekly_knowledge_report()
   RETURNS text AS $$ ... $$
   ```

2. **Enable pg_cron:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   ```

3. **Schedule weekly job (Sunday 18:00):**
   ```sql
   SELECT cron.schedule(
     'weekly-knowledge-report-sunday-1800',
     '0 18 * * 0',
     $$ SELECT generate_weekly_knowledge_report(); $$
   );
   ```

4. **Test function manually:**
   ```sql
   SELECT generate_weekly_knowledge_report();
   ```

5. **Verify output** generates correct markdown with all 5 sections

---

## Constraints (Read-Only, No Modifications)

✅ **Allowed:**
- SELECT queries only
- Generate markdown text
- Read from knowledge_entries table

❌ **Prohibited:**
- INSERT into knowledge_entries
- UPDATE knowledge_entries
- DELETE from knowledge_entries
- Modify function code
- Change table structures

---

## Notes

- **Determinism:** Uses `date_trunc('week', now())::date + interval '6 days'` for consistent Sunday date
- **Timezone:** Adjust cron expression `'0 18 * * 0'` if using local timezone other than UTC
- **Append Mode:** Manual append to docs/project-log/weekly/weekly-knowledge-report.md (or use git history for version control)
- **Read-Only:** Function has STABLE keyword; makes no modifications

**Status:** Ready for Leo deployment
