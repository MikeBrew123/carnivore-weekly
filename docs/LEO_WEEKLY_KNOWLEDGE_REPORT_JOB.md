# Weekly Knowledge Report Job — Setup for Leo

**Status:** Ready to deploy
**Type:** Read-only reporting job
**Schedule:** Weekly, Sunday 18:00 UTC
**Output:** Markdown summary (append-only storage)

---

## Query Playbook (5 queries, read-only)

### Query 1: High-Confidence Decisions
```sql
SELECT title, summary
FROM knowledge_entries
WHERE type = 'decision'
  AND confidence = 'high'
ORDER BY created_at DESC;
```

### Query 2: All Assumptions
```sql
SELECT title, summary, confidence
FROM knowledge_entries
WHERE type = 'assumption'
ORDER BY created_at DESC;
```

### Query 3: New Entries (Past 7 Days)
```sql
SELECT type, title, confidence, created_at
FROM knowledge_entries
WHERE created_at >= now() - interval '7 days'
ORDER BY created_at DESC;
```

### Query 4: Top 10 Tags by Frequency
```sql
SELECT unnest(tags) AS tag, count(*) AS count
FROM knowledge_entries
GROUP BY tag
ORDER BY count DESC
LIMIT 10;
```

### Query 5: Summary by Type/Confidence
```sql
SELECT type, confidence, count(*)
FROM knowledge_entries
GROUP BY type, confidence
ORDER BY confidence DESC, type;
```

---

## Supabase Edge Function (PostgreSQL)

Create this function in Supabase:

```sql
CREATE OR REPLACE FUNCTION weekly_knowledge_report()
RETURNS TABLE (
  report_markdown text,
  report_timestamp timestamptz
) AS $$
DECLARE
  report text := '';
  report_date text;
BEGIN
  report_date := to_char(now(), 'YYYY-MM-DD');

  -- Header
  report := '# Weekly Knowledge Report — ' || report_date || E'\n\n';

  -- Section 1: Snapshot (High-Confidence Decisions)
  report := report || '## Snapshot (High-Confidence Decisions)' || E'\n';

  WITH decisions AS (
    SELECT title, summary
    FROM knowledge_entries
    WHERE type = 'decision'
      AND confidence = 'high'
    ORDER BY created_at DESC
  )
  SELECT
    report || string_agg(
      '- ' || title || ' — ' || summary || E'\n',
      ''
    )
  INTO report
  FROM decisions;

  report := report || E'\n';

  -- Section 2: New This Week
  report := report || '## New This Week' || E'\n';

  WITH recent AS (
    SELECT type, title, confidence
    FROM knowledge_entries
    WHERE created_at >= now() - interval '7 days'
    ORDER BY created_at DESC
  )
  SELECT
    report || string_agg(
      '- [' || type || '] ' || title || ' (' || confidence || ')' || E'\n',
      ''
    )
  INTO report
  FROM recent;

  report := report || E'\n';

  -- Section 3: Open Assumptions
  report := report || '## Open Assumptions' || E'\n';

  WITH assumptions AS (
    SELECT title, summary, confidence
    FROM knowledge_entries
    WHERE type = 'assumption'
    ORDER BY created_at DESC
  )
  SELECT
    report || string_agg(
      '- ' || title || ' — ' || summary || ' (' || confidence || ')' || E'\n',
      ''
    )
  INTO report
  FROM assumptions;

  report := report || E'\n';

  -- Section 4: Patterns Emerging (Top 10 Tags)
  report := report || '## Patterns Emerging' || E'\n';

  WITH tags AS (
    SELECT unnest(tags) AS tag, count(*) AS tag_count
    FROM knowledge_entries
    GROUP BY tag
    ORDER BY tag_count DESC
    LIMIT 10
  )
  SELECT
    report || string_agg(
      '- ' || tag || ' — ' || tag_count || E'\n',
      ''
    )
  INTO report
  FROM tags;

  report := report || E'\n';

  -- Section 5: System Health
  report := report || '## System Health' || E'\n';

  WITH stats AS (
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN confidence = 'high' THEN 1 ELSE 0 END) as high_count,
      SUM(CASE WHEN confidence = 'medium' THEN 1 ELSE 0 END) as medium_count,
      SUM(CASE WHEN confidence = 'low' THEN 1 ELSE 0 END) as low_count
    FROM knowledge_entries
  )
  SELECT
    report || '- Total entries: ' || total || E'\n' ||
    '- High confidence: ' || high_count || E'\n' ||
    '- Medium confidence: ' || medium_count || E'\n' ||
    '- Low confidence: ' || low_count || E'\n'
  INTO report
  FROM stats;

  RETURN QUERY SELECT report::text, now()::timestamptz;
END;
$$ LANGUAGE plpgsql STABLE;
```

---

## Scheduled Job Setup (Supabase)

Use Supabase's `pg_cron` extension to schedule weekly execution:

```sql
-- Enable pg_cron extension (one-time)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create weekly job (Sundays 18:00 UTC)
SELECT cron.schedule(
  'weekly-knowledge-report',
  '0 18 * * 0',  -- Sunday at 18:00 UTC
  $$
    WITH report_data AS (
      SELECT * FROM weekly_knowledge_report()
    )
    SELECT report_markdown
    FROM report_data
    LIMIT 1;
  $$
);

-- View scheduled jobs
SELECT * FROM cron.job;

-- Cancel if needed
SELECT cron.unschedule('weekly-knowledge-report');
```

---

## Output Storage Option 1: Save to File

Use a Supabase HTTP function to write to file:

```sql
-- Create table to store report history
CREATE TABLE IF NOT EXISTS weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_markdown text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  week_starting date NOT NULL
);

-- Enable RLS (read-only for reports)
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_reports" ON weekly_reports
FOR SELECT USING (true);

-- Prevent modifications
CREATE POLICY "no_insert" ON weekly_reports
FOR INSERT USING (false);

CREATE POLICY "no_update" ON weekly_reports
FOR UPDATE USING (false);

CREATE POLICY "no_delete" ON weekly_reports
FOR DELETE USING (false);
```

Then update the scheduled job to INSERT into weekly_reports:

```sql
SELECT cron.schedule(
  'weekly-knowledge-report',
  '0 18 * * 0',  -- Sunday at 18:00 UTC
  $$
    INSERT INTO weekly_reports (report_markdown, week_starting)
    SELECT
      report_markdown,
      date_trunc('week', now())::date
    FROM weekly_knowledge_report()
    LIMIT 1;
  $$
);
```

---

## Output Storage Option 2: Email via Supabase Functions

Add email integration (requires SendGrid or similar):

```sql
-- Deploy Edge Function to send email
-- POST https://your-project.supabase.co/functions/v1/send-weekly-report

-- In the Edge Function:
const { data } = await supabase
  .from('knowledge_entries')
  .select('*')
  .then(/* execute queries and build markdown */);

// Send via SendGrid/email service
await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${SENDGRID_KEY}` },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: 'team@example.com' }] }],
    from: { email: 'reports@carnivoreweekly.com' },
    subject: 'Weekly Knowledge Report',
    content: [{ type: 'text/markdown', value: reportMarkdown }]
  })
});
```

---

## Constraints (Read-Only, No Modifications)

✅ **Allowed:**
- SELECT queries (read-only)
- Generate markdown summary
- Store in weekly_reports table (append-only)
- Send via email

❌ **Prohibited:**
- INSERT into knowledge_entries
- UPDATE any table
- DELETE any records
- Promote/modify entries
- Change knowledge_entries table structure

---

## Example Report Output

```markdown
# Weekly Knowledge Report — 2025-01-09

## Snapshot (High-Confidence Decisions)
- Quinn as Operations Manager — Single source of truth for project logs, status, decisions.
- Technology Stack Locked — Python 3.9, Claude AI, GitHub Pages, PostgreSQL/Supabase.
- Validation Pipeline Non-Negotiable — All content passes Copy-Editor, Brand, Humanization validators.
- Bento Grid Launch Locked to Jan 27, 2025 — Fixed deadline, 3 MVP features, 5-person team.

## New This Week
- [decision] Phase Gate Deployment Process (high)
- [insight] Persona System Database-Backed (high)
- [assumption] Real-Time Engagement Scoring Necessary (medium)

## Open Assumptions
- 10% Bounce Rate Improvement Post-Bento Launch — Target improvement within 1 month post-launch. (medium)
- Interactive Features 30% Adoption Rate — Users will engage with 3+ new features at >30% adoption. (medium)
- Claude AI Maintains Consistent Persona Voice — Test data shows 98.3% token reduction. (medium)

## Patterns Emerging
- architecture — 8
- locked — 7
- jan-2025 — 6
- quality — 5
- decision — 4
- content — 3
- database — 3
- validation — 3
- optimization — 2
- bento-grid — 2

## System Health
- Total entries: 17
- High confidence: 11
- Medium confidence: 6
- Low confidence: 0
```

---

## Deployment Steps

1. **Execute function creation SQL** in Supabase SQL Editor
2. **Enable pg_cron** extension
3. **Schedule the weekly job** (Monday 9 AM UTC)
4. **Create weekly_reports table** for history
5. **Test manually:**
   ```sql
   SELECT * FROM weekly_knowledge_report();
   ```
6. **Verify output** — Check docs/weekly-knowledge-report.md or email

---

## Status

**Setup:** Ready for deployment
**Queries:** 5 read-only queries defined
**Function:** PostgreSQL function ready
**Schedule:** Weekly Monday 9 AM UTC
**Output:** Markdown summary (append-only storage)
**Security:** No modifications allowed

Deploy when ready. Report will auto-generate every Monday.
