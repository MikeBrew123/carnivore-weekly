# Analytics Infrastructure Deployment Guide

**For:** Leo (Database Architect)
**Purpose:** Deploy analytics tracking for 2026 demo conversion optimization
**Status:** Ready for deployment
**Date:** January 2, 2026

---

## Overview

This document outlines the analytics infrastructure that Leo must deploy to track the 2026 demo's performance and enable Jordan's data-driven rollback decisions.

### What This Tracks

1. **Calculator CTR (Click-Through Rate)**
   - Sticky CTA button clicks (mobile post-hero scroll)
   - Sidebar calculator clicks (desktop)
   - Feedback FAB button clicks

2. **Core Web Vitals**
   - LCP (Largest Contentful Paint)
   - CLS (Cumulative Layout Shift)
   - INP (Interaction to Next Paint)

3. **User Context**
   - Device type (mobile/desktop/tablet)
   - Viewport width (pixel dimensions)
   - Scroll depth (% of page scrolled)

---

## Files Created

### 1. Database Migration
**Location:** `supabase/migrations/20260102_create_analytics_tables.sql`

**What it does:**
- Creates `analytics_events` table for CTA tracking
- Creates `performance_metrics` table for Core Web Vitals
- Sets up indexes for sub-50ms query performance
- Enables RLS (Row Level Security) for anonymous access
- Grants permissions for unauthenticated users

**Key tables:**

```sql
analytics_events:
- id (UUID, primary key)
- event_type (calculator_click, feedback_click, etc)
- source (sticky_cta, fab, sidebar)
- device_type (mobile, desktop, tablet)
- viewport_width (int)
- scroll_depth (int, 0-100%)
- created_at (TIMESTAMPTZ)

performance_metrics:
- id (UUID, primary key)
- page_url (page being measured)
- lcp_ms (Largest Contentful Paint in milliseconds)
- cls_score (Cumulative Layout Shift)
- inp_ms (Interaction to Next Paint)
- device_type (mobile, desktop, tablet)
- created_at (TIMESTAMPTZ)
```

### 2. Edge Function
**Location:** `supabase/functions/analytics/index.ts`

**What it does:**
- Provides `/api/analytics` endpoint
- Accepts POST requests with analytics data
- Routes to appropriate table (analytics_events or performance_metrics)
- Includes CORS headers for cross-origin requests
- Validates required fields before insertion
- Returns JSON response

**Endpoint:** `https://{project_ref}.functions.supabase.co/analytics`

### 3. Deployment Script
**Location:** `deploy-analytics.sh`

**What it does:**
- Validates Supabase credentials
- Applies database migration (creates tables)
- Deploys Edge Function
- Verifies deployment
- Provides next steps

---

## Deployment Steps

### Prerequisites

```bash
# 1. Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# 2. Authenticate with Supabase
supabase login
```

### Deploy

```bash
# 1. Set environment variables
export SUPABASE_PROJECT_REF="your_project_ref"  # From app.supabase.com

# 2. Deploy using script (recommended)
bash deploy-analytics.sh

# OR deploy manually

# 3. Manual: Push database migrations
supabase db push --project-ref $SUPABASE_PROJECT_REF

# 4. Manual: Deploy Edge Function
supabase functions deploy analytics --project-ref $SUPABASE_PROJECT_REF --no-verify-jwt
```

### Verify Deployment

```bash
# Test Edge Function
curl -X POST https://{project_ref}.functions.supabase.co/analytics \
  -H "Content-Type: application/json" \
  -d '{"event_type":"test","source":"test"}'

# Should return: {"success":true,"type":"event"}
```

---

## Frontend Integration

The analytics tracking is already integrated in `public/index-2026.html`:

### 1. Calculator Click Tracking
```javascript
Analytics.trackClick('calculator_click', 'sticky_cta')
// Fires when user clicks the sticky bottom CTA on mobile

Analytics.trackClick('calculator_click', 'sidebar')
// Would fire for desktop sidebar (not implemented yet)
```

### 2. Feedback Click Tracking
```javascript
Analytics.trackClick('feedback_click', 'fab')
// Fires when user clicks the floating action button
```

### 3. Performance Tracking
```javascript
Analytics.trackPerformance()
// Tracks LCP when page fully loads
```

**Note:** If `/api/analytics` endpoint returns errors, tracking fails silently (doesn't break UX).

---

## Rollback Queries

These queries help Jordan monitor rollback triggers:

### 1. Mobile Calculator CTR
```sql
SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE event_type = 'calculator_click' AND source = 'sticky_cta') as mobile_cta_clicks,
    COUNT(*) FILTER (WHERE device_type = 'mobile') as total_mobile_visitors,
    ROUND(
        (COUNT(*) FILTER (WHERE event_type = 'calculator_click' AND source = 'sticky_cta')::DECIMAL /
         NULLIF(COUNT(*) FILTER (WHERE device_type = 'mobile'), 0) * 100), 2
    ) as mobile_calculator_ctr
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Rollback trigger: If mobile_calculator_ctr < 10% for 3+ consecutive days
```

### 2. Performance (LCP)
```sql
SELECT
    DATE(created_at) as date,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY lcp_ms) as p75_lcp,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cls_score) as p75_cls
FROM performance_metrics
WHERE page_url = '/public/index-2026.html'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Rollback trigger: If p75_lcp > 3000ms for 2+ consecutive days
```

### 3. Feedback Response Rate
```sql
SELECT
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE event_type = 'feedback_click') as feedback_clicks,
    COUNT(*) FILTER (WHERE event_type = 'feedback_click' AND source = 'fab') as fab_clicks,
    ROUND(
        (COUNT(*) FILTER (WHERE event_type = 'feedback_click' AND source = 'fab')::DECIMAL /
         NULLIF(COUNT(*) FILTER (WHERE event_type = 'feedback_click'), 0) * 100), 2
    ) as fab_percentage
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Leo's Daily Monitoring Ritual

Add these to your morning health checks (after Supabase deploys):

```sql
-- 1. Verify event tracking is working
SELECT COUNT(*), event_type, source
FROM analytics_events
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY event_type, source;
-- Expected: Non-zero counts for sticky_cta and fab

-- 2. Check performance metrics collection
SELECT COUNT(*), AVG(lcp_ms), AVG(cls_score)
FROM performance_metrics
WHERE created_at > NOW() - INTERVAL '24 hours';
-- Expected: Regular samples, LCP ≤ 2500ms avg

-- 3. Weekly rollback trigger check
-- (Run the rollback queries above)
-- Alert if any thresholds breached
```

---

## Troubleshooting

### Edge Function Not Responding

```bash
# Check function logs
supabase functions list
supabase functions logs analytics

# Redeploy if needed
supabase functions deploy analytics --no-verify-jwt
```

### Tables Not Found

```bash
# Check if migration applied
supabase db pull  # Sync local schema
supabase db push  # Push again

# Verify tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('analytics_events', 'performance_metrics');
```

### RLS Errors

```bash
# Check RLS policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('analytics_events', 'performance_metrics')
ORDER BY tablename;

-- Expected: 2 policies per table (INSERT + SELECT)
```

### Tracking Not Working

1. Check browser console for errors
2. Verify `/api/analytics` endpoint is accessible
3. Check Edge Function logs for request errors
4. Ensure RLS policies allow anonymous inserts

---

## Performance Targets

✅ **All analytics queries must complete in < 50ms** (Leo's standard)

Currently indexed columns:
- `created_at DESC` (for time-range queries)
- `event_type, source` (for aggregation)
- `page_url, created_at DESC` (for performance trends)

Monitor with:
```sql
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%analytics%'
ORDER BY mean_exec_time DESC;
```

---

## Security Considerations

✅ **RLS Enabled:** Only anonymous inserts/reads allowed (no auth required)
✅ **No PII:** Never track user identity, only device/viewport/scroll depth
✅ **CORS Configured:** Endpoint accessible from index-2026.html only
✅ **Validation:** Event data validated before insertion

---

## Success Criteria

After deployment, verify:

- [ ] `analytics_events` table exists with 0 rows initially
- [ ] `performance_metrics` table exists with 0 rows initially
- [ ] Edge Function endpoint returns `{"success":true}`
- [ ] Indexes created and performing <50ms
- [ ] RLS policies in place (4 total: 2 tables × 2 policies)
- [ ] Frontend can POST to endpoint without CORS errors
- [ ] Morning monitoring queries return results

---

## Next Steps

1. **Leo Deploys:** Run `bash deploy-analytics.sh` with proper credentials
2. **QA Testing:**
   - Open https://localhost:8000/public/index-2026.html
   - Click Calculator CTA button
   - Check Supabase > SQL Editor > `SELECT * FROM analytics_events LIMIT 1;`
   - Verify row created with correct data
3. **Production Deployment:**
   - Deploy index-2026.html to production (with analytics tracking)
   - Monitor metrics for 1 week
   - Execute rollback queries daily (Jordan's decision point)
4. **Optimization:**
   - If > 1000 events/day, consider partitioning tables
   - Archive old analytics monthly
   - Add custom dashboards to Supabase

---

## Key Contacts

- **Jordan (Data Analyst):** Reviews rollback trigger queries, makes go/no-go decisions
- **Leo (Database Architect):** Maintains schema health, optimizes queries, monitors performance
- **Mike (CEO):** Final authority on rollback/go-live decisions

---

**Status:** 🟢 Ready for deployment
**Last Updated:** 2026-01-02
**Created by:** Claude Code
**For:** Leo (Database Architect)
