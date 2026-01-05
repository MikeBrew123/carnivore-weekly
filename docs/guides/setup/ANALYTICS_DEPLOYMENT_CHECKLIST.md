# Analytics Deployment Checklist
## Quick Reference for Carnivore Weekly

**Project:** carnivore-weekly
**Supabase Project ID:** kwtdpvnjewtahuxjyltn
**Date:** 2026-01-02

---

## Pre-Deployment Checklist

- [ ] Review credentials in `/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json`
- [ ] Confirm Supabase account access to project kwtdpvnjewtahuxjyltn
- [ ] Check migration file exists at `/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20260102_create_analytics_tables.sql`
- [ ] Check Edge Function exists at `/Users/mbrew/Developer/carnivore-weekly/supabase/functions/analytics/index.ts`
- [ ] Back up any existing Supabase data (optional)

---

## Database Migration Deployment

Choose ONE of the three deployment methods:

### Method A: Supabase Dashboard (EASIEST - Recommended)

Steps:
1. [ ] Navigate to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new
2. [ ] Copy entire contents of 20260102_create_analytics_tables.sql
3. [ ] Paste into SQL Editor
4. [ ] Click "Run" button
5. [ ] Verify no errors in output

Time: ~30 seconds

---

### Method B: Supabase CLI (For CI/CD)

Steps:
1. [ ] Run: `supabase login`
2. [ ] Run: `cd /Users/mbrew/Developer/carnivore-weekly`
3. [ ] Run: `supabase link --project-ref kwtdpvnjewtahuxjyltn`
4. [ ] Run: `supabase db push`
5. [ ] Verify migration completed successfully

Time: ~2-3 minutes

---

### Method C: Direct psql Connection (If Method A fails)

Steps:
1. [ ] Run: `PGPASSWORD="MCNxDuS6DzFsBGc" psql -h db.kwtdpvnjewtahuxjyltn.supabase.co -U postgres -d postgres -f /Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20260102_create_analytics_tables.sql`
2. [ ] Verify no errors in output

Time: ~1 minute (if network works)

---

## Post-Migration Verification

### Verify Tables Created

In Supabase Dashboard SQL Editor, run:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('analytics_events', 'performance_metrics')
ORDER BY table_name;
```

Expected: 2 rows (analytics_events, performance_metrics)

- [ ] Table: analytics_events exists
- [ ] Table: performance_metrics exists

---

### Verify Indexes Created

```sql
SELECT tablename, indexname FROM pg_indexes
WHERE tablename IN ('analytics_events', 'performance_metrics')
ORDER BY tablename, indexname;
```

Expected: 4 rows total (2 per table)

- [ ] idx_analytics_events_created
- [ ] idx_analytics_events_type_source
- [ ] idx_performance_created
- [ ] idx_performance_page_url

---

### Verify RLS Policies

```sql
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('analytics_events', 'performance_metrics')
ORDER BY tablename, policyname;
```

Expected: 4 policies per table

- [ ] Analytics table: "Allow anonymous analytics inserts"
- [ ] Analytics table: "Allow analytics reads"
- [ ] Performance table: "Allow anonymous performance inserts"
- [ ] Performance table: "Allow performance reads"

---

### Test Anonymous INSERT Permission

```sql
INSERT INTO analytics_events (event_type, source)
VALUES ('test_click', 'test_page')
RETURNING id, event_type, source, created_at;
```

- [ ] INSERT succeeds (returns a row with id, event_type, source, created_at)

---

### Clean Up Test Data (Optional)

```sql
DELETE FROM analytics_events WHERE event_type = 'test_click';
DELETE FROM performance_metrics WHERE event_type = 'test_click';
```

- [ ] Cleaned up test data

---

## Edge Function Deployment

### Deploy Function

Choose your method:

**Option 1: Supabase CLI**
```bash
supabase functions deploy analytics --no-verify-jwt
```

- [ ] Function deployed successfully

**Option 2: Manual via Supabase Dashboard**
1. [ ] Go to Edge Functions > Create Function
2. [ ] Name: analytics
3. [ ] Copy contents of /Users/mbrew/Developer/carnivore-weekly/supabase/functions/analytics/index.ts
4. [ ] Paste into editor
5. [ ] Click Deploy

---

### Verify Edge Function

Get the function URL from Supabase Dashboard:
- Function URL: `https://kwtdpvnjewtahuxjyltn.supabase.co/functions/v1/analytics`

Test with curl:

```bash
curl -X POST https://kwtdpvnjewtahuxjyltn.supabase.co/functions/v1/analytics \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "calculator_click",
    "source": "homepage",
    "device_type": "desktop",
    "viewport_width": 1920,
    "scroll_depth": 75
  }'
```

- [ ] Function responds with status 200
- [ ] Response contains: `{"success": true, "type": "event"}`

---

### Test Performance Metrics Route

```bash
curl -X POST https://kwtdpvnjewtahuxjyltn.supabase.co/functions/v1/analytics \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "performance_measurement",
    "source": "homepage",
    "page_url": "https://carnivore-weekly.com",
    "lcp_ms": 1250,
    "cls_score": 0.05,
    "inp_ms": 120,
    "device_type": "mobile"
  }'
```

- [ ] Function responds with status 200
- [ ] Response contains: `{"success": true, "type": "performance"}`

---

### Verify Data in Database

```sql
-- Check analytics_events
SELECT COUNT(*) as event_count FROM analytics_events;

-- Check performance_metrics
SELECT COUNT(*) as perf_count FROM performance_metrics;
```

- [ ] analytics_events contains rows (from Edge Function test)
- [ ] performance_metrics contains rows (from Edge Function test)

---

## Final Verification Checklist

- [ ] Both tables created and accessible
- [ ] All 4 indexes created
- [ ] All RLS policies configured
- [ ] Anonymous INSERT/SELECT permissions working
- [ ] Edge Function deployed and responding
- [ ] Test data successfully inserted via Edge Function
- [ ] Data successfully retrieved from database

---

## Deployment Status

**Started:** 2026-01-02
**Completed:** ___________
**Deployed By:** ___________

**Overall Status:** [ ] SUCCESS [ ] FAILED

If failed, document issue:
```
_________________________________________________________________

_________________________________________________________________

_________________________________________________________________
```

---

## Next Steps After Deployment

1. [ ] Implement analytics tracking in frontend application
2. [ ] Install @supabase/supabase-js in frontend: `npm install @supabase/supabase-js`
3. [ ] Create analytics tracking utility
4. [ ] Track calculator usage events
5. [ ] Track CTA button clicks
6. [ ] Implement Core Web Vitals tracking (LCP, CLS, INP)
7. [ ] Monitor analytics in Supabase Dashboard

---

## Rollback Instructions (If Needed)

If deployment fails and needs rollback:

```sql
-- Drop tables (cascades to indexes and policies)
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;

-- Verify deletion
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('analytics_events', 'performance_metrics');
```

Expected: No rows returned (tables deleted)

---

## Support Information

**Architect:** Leo (Database Architect)
**Project:** Carnivore Weekly
**Supabase Project:** kwtdpvnjewtahuxjyltn
**Region:** (Check Supabase Dashboard)

For issues, refer to: `/Users/mbrew/Developer/carnivore-weekly/DEPLOYMENT_REPORT_ANALYTICS.md`
