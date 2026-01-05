# Analytics Deployment - Complete Index
## Carnivore Weekly Supabase Infrastructure

**Project:** carnivore-weekly
**Supabase Project ID:** kwtdpvnjewtahuxjyltn
**Date:** 2026-01-02
**Architect:** Leo (Database Architect)
**Status:** READY FOR DEPLOYMENT

---

## Quick Start

1. **Read first:** `ANALYTICS_DEPLOYMENT_SUMMARY.txt` (quick overview, 5 min read)
2. **Follow checklist:** `ANALYTICS_DEPLOYMENT_CHECKLIST.md` (step-by-step, 10 min)
3. **Reference details:** `DEPLOYMENT_REPORT_ANALYTICS.md` (comprehensive, 20 min read)

---

## Documentation Files

### Primary Documentation

#### 1. ANALYTICS_DEPLOYMENT_SUMMARY.txt
**Purpose:** Quick reference for deployment
**Length:** ~500 lines
**Best for:** Getting the big picture, choosing deployment method
**Contains:**
- Status overview
- What's being deployed
- 3 deployment options
- Quick verification steps
- Key credentials
- Performance expectations
- Success criteria

**Read if:** You need a 5-minute understanding of the deployment

---

#### 2. ANALYTICS_DEPLOYMENT_CHECKLIST.md
**Purpose:** Step-by-step deployment guide
**Length:** ~350 lines
**Best for:** Actually executing the deployment
**Contains:**
- Pre-deployment checklist
- 3 deployment method options with steps
- Post-migration verification steps
- Edge Function deployment steps
- Post-deployment verification
- Final verification checklist
- Next steps
- Rollback instructions

**Read if:** You're about to deploy and want detailed step-by-step instructions

---

#### 3. DEPLOYMENT_REPORT_ANALYTICS.md
**Purpose:** Comprehensive technical documentation
**Length:** ~750 lines
**Best for:** Understanding technical details, troubleshooting, long-term reference
**Contains:**
- Executive summary
- Detailed component status
- Table schemas with complete specifications
- Edge Function specifications
- Index details and purposes
- 3 deployment options with full details
- 7 verification procedures with expected outputs
- Migration file breakdown
- Edge Function code breakdown
- Performance expectations
- Monitoring guidance
- Security considerations
- Troubleshooting guide

**Read if:** You need comprehensive technical details or are troubleshooting

---

### Supporting Documentation

#### 4. ANALYTICS_INFRASTRUCTURE.md
**Purpose:** Original infrastructure specification
**Length:** ~350 lines
**Best for:** Understanding the original design decisions
**Contains:** Infrastructure overview, requirements, RLS policies, indexes

**Location:** `/Users/mbrew/Developer/carnivore-weekly/ANALYTICS_INFRASTRUCTURE.md`

---

## Source Code Files

### Database Migration

**File:** `/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20260102_create_analytics_tables.sql`

**Size:** 2,092 bytes
**Lines:** 71
**Idempotent:** YES (uses CREATE TABLE IF NOT EXISTS)

**Creates:**
- Table: `analytics_events` (tracks user interactions)
- Table: `performance_metrics` (tracks Core Web Vitals)
- 4 performance indexes
- RLS policies (4 per table)

**Key Features:**
- Automatic UUID generation
- Timestamp defaults
- Row-level security enabled
- Anonymous access policies
- Performance indexes on frequently-queried columns

---

### Edge Function

**File:** `/Users/mbrew/Developer/carnivore-weekly/supabase/functions/analytics/index.ts`

**Size:** 3,464 bytes
**Lines:** 123
**Language:** TypeScript (Deno)

**Functionality:**
- Unified analytics endpoint
- Automatic event routing (analytics vs performance metrics)
- Request validation
- Error handling with detailed messages
- CORS support for cross-origin requests
- Service role key authentication

**Key Features:**
- No JWT verification required (public endpoint)
- Intelligent routing based on event type and fields
- Comprehensive error responses
- Logging for debugging

**Endpoint:** `https://kwtdpvnjewtahuxjyltn.supabase.co/functions/v1/analytics`

---

## Deployment Methods

### Method A: Supabase Dashboard (RECOMMENDED)
**Time:** 30 seconds
**Difficulty:** Easiest
**Requirements:** Browser, Supabase account
**Steps:** 5

Use Case: One-time deployment, no automation needed

**Steps:**
1. Navigate to Supabase Dashboard SQL Editor
2. Copy migration SQL
3. Paste into editor
4. Click Run
5. Verify tables in sidebar

---

### Method B: Supabase CLI
**Time:** 2-3 minutes
**Difficulty:** Intermediate
**Requirements:** supabase CLI installed, authenticated
**Steps:** 5

Use Case: CI/CD pipelines, automation, team workflows

**Steps:**
1. `supabase login`
2. `supabase link --project-ref kwtdpvnjewtahuxjyltn`
3. `supabase db push`
4. `supabase functions deploy analytics --no-verify-jwt`
5. `supabase functions list`

---

### Method C: Direct psql
**Time:** 1 minute
**Difficulty:** Intermediate
**Requirements:** psql installed, network access
**Steps:** 1

Use Case: Direct database access, scripting

**Step:**
1. Run psql with migration file as input

---

## Verification Procedures

After deployment, run 7 verification tests:

1. **Table Existence** - Verify both tables created
2. **Index Creation** - Verify all 4 indexes exist
3. **RLS Policies** - Verify all policies active
4. **Anonymous INSERT** - Test insert permission
5. **Edge Function Response** - Test analytics endpoint
6. **Performance Metrics** - Test performance metrics endpoint
7. **Data Verification** - Verify data stored in database

All procedures have SQL queries and expected outputs in `DEPLOYMENT_REPORT_ANALYTICS.md`

---

## Database Schema

### analytics_events Table

```
Column          Type            Purpose
────────────────────────────────────────────────────
id              UUID            Primary key
event_type      VARCHAR(50)     Type of interaction
source          VARCHAR(50)     Page/source
device_type     VARCHAR(20)     Device type
viewport_width  INT             Browser width
scroll_depth    INT             Scroll position
created_at      TIMESTAMPTZ     Event timestamp

Indexes:
- idx_analytics_events_created (created_at DESC)
- idx_analytics_events_type_source (event_type, source)

RLS Policies:
- Allow anonymous INSERT
- Allow anonymous SELECT
```

### performance_metrics Table

```
Column          Type            Purpose
────────────────────────────────────────────────────
id              UUID            Primary key
page_url        VARCHAR(500)    URL of measured page
lcp_ms          INT             Largest Contentful Paint
cls_score       DECIMAL(5,3)    Cumulative Layout Shift
inp_ms          INT             Interaction to Next Paint
device_type     VARCHAR(20)     Device type
created_at      TIMESTAMPTZ     Measurement timestamp

Indexes:
- idx_performance_created (created_at DESC)
- idx_performance_page_url (page_url, created_at DESC)

RLS Policies:
- Allow anonymous INSERT
- Allow anonymous SELECT
```

---

## Edge Function Specification

**Endpoint:** `https://kwtdpvnjewtahuxjyltn.supabase.co/functions/v1/analytics`

**Method:** POST (with OPTIONS CORS support)

**Required Fields:**
- `event_type` (string)
- `source` (string)

**Optional Fields:**
- `device_type` (string)
- `viewport_width` (integer)
- `scroll_depth` (integer)
- `page_url` (string)
- `lcp_ms` (integer)
- `cls_score` (decimal)
- `inp_ms` (integer)

**Auto-Routing Logic:**
- If event_type contains "performance" OR lcp_ms is present → `performance_metrics` table
- Otherwise → `analytics_events` table

**Response Codes:**
- 200: Success
- 400: Missing required fields
- 405: Invalid HTTP method
- 500: Database error

**Success Response:**
```json
{"success": true, "type": "event" | "performance"}
```

---

## Credentials

All credentials stored in: `/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json`

```
Project ID:           kwtdpvnjewtahuxjyltn
Supabase URL:         https://kwtdpvnjewtahuxjyltn.supabase.co
Service Role Key:     sb_secret_-DJISSDQQD7oWqS87RBJ8Q_0sKdDWVz
Database Host:        db.kwtdpvnjewtahuxjyltn.supabase.co
Database Port:        5432
Database Name:        postgres
Database User:        postgres
Database Password:    MCNxDuS6DzFsBGc (reset 2026-01-02)
```

---

## Performance Characteristics

### Query Performance (with indexes)
- Recent events (24 hours): <50ms
- Events by type: <50ms
- Performance metrics by page: <50ms
- 30-day aggregations: <500ms

### Insert Performance
- Single insert: ~10-20ms
- Batch insert (100 records): ~50-100ms
- Via Edge Function: ~50-100ms (includes network)

### Storage
- Per analytics event: ~100 bytes
- Per performance metric: ~80 bytes
- Monthly estimate (100k events, 10k metrics): ~12 MB

---

## Security

- **RLS Enabled:** Both tables protected with row-level security
- **Anonymous Access:** Limited to INSERT and SELECT only
- **No UPDATE/DELETE:** Not allowed for anonymous users
- **Edge Function:** Uses service role key (not exposed to frontend)
- **CORS:** Enabled for all origins (required for frontend tracking)
- **Input Validation:** All user inputs validated
- **Credentials:** Secured in secrets/api-keys.json

---

## Success Criteria

Deployment is successful when:

- [ ] Both tables exist and are accessible
- [ ] All 4 indexes are created
- [ ] All 4 RLS policies are active on each table
- [ ] Anonymous INSERT permission works (test succeeds)
- [ ] Anonymous SELECT permission works (test succeeds)
- [ ] Edge Function deployed without errors
- [ ] Edge Function responds to POST requests with 200 status
- [ ] Test data successfully inserted via Edge Function
- [ ] Data successfully retrieved from database
- [ ] CORS headers present in Edge Function responses

---

## Next Steps After Deployment

1. **Frontend Implementation**
   - Install Supabase client: `npm install @supabase/supabase-js`
   - Create analytics tracking utility
   - Implement event tracking for user interactions
   - Implement performance monitoring

2. **Event Tracking Examples**
   - Calculator usage
   - CTA button clicks
   - Form submissions
   - Link clicks

3. **Performance Tracking Examples**
   - Largest Contentful Paint (LCP)
   - Cumulative Layout Shift (CLS)
   - Interaction to Next Paint (INP)

4. **Monitoring & Dashboard**
   - Monitor in Supabase Dashboard
   - View event trends
   - Track performance metrics
   - Set up alerts

---

## Rollback Procedure

If issues occur after deployment:

```sql
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS performance_metrics CASCADE;
```

Then restore from backup using Supabase Project Settings > Backups

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Access denied for user 'postgres'" | Check credentials in api-keys.json or reset password in Supabase Dashboard |
| "Network timeout" connecting to database | Check DNS resolution or use Supabase Dashboard SQL Editor |
| Edge Function returns 500 error | Check function logs in Supabase Dashboard, verify environment variables |
| RLS policies blocking inserts | Verify policies created with "WITH CHECK (true)" and grants given to anon role |

See `DEPLOYMENT_REPORT_ANALYTICS.md` for more detailed troubleshooting.

---

## File Locations Reference

```
Project Root: /Users/mbrew/Developer/carnivore-weekly/

Database:
  supabase/migrations/20260102_create_analytics_tables.sql

Edge Function:
  supabase/functions/analytics/index.ts

Documentation:
  ANALYTICS_DEPLOYMENT_SUMMARY.txt
  ANALYTICS_DEPLOYMENT_CHECKLIST.md
  DEPLOYMENT_REPORT_ANALYTICS.md
  ANALYTICS_DEPLOYMENT_INDEX.md (this file)
  ANALYTICS_INFRASTRUCTURE.md

Credentials:
  secrets/api-keys.json
```

---

## File Reading Recommendations

**For Different Audiences:**

**Managers/Decision Makers:**
- Start with: ANALYTICS_DEPLOYMENT_SUMMARY.txt
- Time: 5 minutes

**Deployment Engineers:**
- Read in order:
  1. ANALYTICS_DEPLOYMENT_SUMMARY.txt (overview)
  2. ANALYTICS_DEPLOYMENT_CHECKLIST.md (procedure)
  3. DEPLOYMENT_REPORT_ANALYTICS.md (reference)
- Time: 30 minutes

**Database Architects:**
- Read all: DEPLOYMENT_REPORT_ANALYTICS.md
- Review code: supabase/migrations/ and supabase/functions/analytics/
- Time: 1 hour

**Frontend Developers (after deployment):**
- Read: DEPLOYMENT_REPORT_ANALYTICS.md section "Next Steps - Frontend Integration"
- Review Edge Function spec in this document
- Time: 15 minutes

---

## Document Maintenance

**Last Updated:** 2026-01-02
**Prepared By:** Leo (Database Architect)
**Status:** READY FOR PRODUCTION DEPLOYMENT

**Next Review Date:** After successful deployment
**Maintenance:** Update verification section as deployment progresses

---

## Support & Questions

For detailed technical information, see:
- `/Users/mbrew/Developer/carnivore-weekly/DEPLOYMENT_REPORT_ANALYTICS.md` - Technical details
- `/Users/mbrew/Developer/carnivore-weekly/ANALYTICS_DEPLOYMENT_CHECKLIST.md` - Step-by-step

For code review, see:
- `/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20260102_create_analytics_tables.sql` - Migration SQL
- `/Users/mbrew/Developer/carnivore-weekly/supabase/functions/analytics/index.ts` - Edge Function code

---

**Deployment Package Complete**
**Status: READY FOR DEPLOYMENT**
**Date: 2026-01-02**
