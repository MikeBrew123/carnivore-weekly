# Integration Steps: Story 3.4 Verify & Generate Endpoint

**Goal:** Add the verify-and-generate endpoint to the existing calculator API worker

**Time Estimate:** 15-20 minutes

---

## Step 1: Copy the Handler Function

Add the entire contents of `/Users/mbrew/Developer/carnivore-weekly/api/verify-and-generate.js` to your calculator API.

**Location in calculator-api.js:** After all utility function definitions (around line 100), before the route handlers section.

```javascript
// Around line 100, AFTER the existing utility functions
// ADD THIS:

const { handleVerifyAndGenerate } = require('./verify-and-generate.js');
```

Or, if you prefer to keep it as a separate file for cleaner separation of concerns:

```javascript
// In wrangler.toml, add:
# Define the verify-and-generate handler as a separate entry
[env.production]
routes = [
  { pattern = "api.example.com/api/v1/assessment/*", zone_name = "example.com" }
]
```

---

## Step 2: Add Route Handler

In `calculator-api.js`, find the main request router (usually a large `if-else` or `switch` statement) and add this route:

**Location:** Inside the main `fetch` function's routing logic (around line 800+)

```javascript
// Find this section (around line 800+):
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ... existing routes ...

    // ADD THIS NEW ROUTE:
    if (url.pathname === '/api/v1/assessment/verify-and-generate') {
      return handleVerifyAndGenerate(request, env);
    }

    // ... remaining routes ...

    return new Response('Not Found', { status: 404 });
  }
};
```

Or, if using a router library like Hono or Itty Router:

```javascript
// With Hono:
app.post('/api/v1/assessment/verify-and-generate', (c) => {
  return handleVerifyAndGenerate(c.req.raw, env);
});

// With Itty Router:
router.post('/api/v1/assessment/verify-and-generate', handleVerifyAndGenerate);
```

---

## Step 3: Verify Environment Variables

In `wrangler.toml`, ensure these variables are declared:

```toml
[env.production]
vars = {
  ENVIRONMENT = "production",
  SUPABASE_URL = "https://kwtdpvnjewtahuxjyltn.supabase.co"
}

# Secrets must be set via CLI (not in file):
# wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# wrangler secret put STRIPE_SECRET_KEY
# wrangler secret put CLAUDE_API_KEY
```

**Set secrets:**

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY  # Prompt will appear
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put CLAUDE_API_KEY
```

---

## Step 4: Deploy

```bash
# Deploy to staging first
wrangler deploy --env staging

# Or deploy to production
wrangler deploy --env production
```

---

## Step 5: Test Locally

```bash
# Start local development server
wrangler dev

# In another terminal, test the endpoint
curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

## Step 6: Verify Database Readiness

Run the test suite to verify all tables, indexes, and triggers are in place:

```bash
# Connect to your Supabase database
psql "postgresql://[user]:[password]@[host]:[port]/postgres"

# Run the test script
\i /Users/mbrew/Developer/carnivore-weekly/api/verify-and-generate-test.sql
```

---

## Step 7: Configure Frontend (Optional)

In your frontend application, after successful Stripe payment:

```typescript
// After Stripe checkout redirects to success page
const sessionId = new URLSearchParams(window.location.search).get('session_id');

const response = await fetch('/api/v1/assessment/verify-and-generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ session_id: sessionId })
});

const result = await response.json();

if (result.success) {
  // Redirect to report viewer with access token
  window.location.href = `/report/${result.access_token}`;
} else {
  console.error('Report generation failed:', result.message);
}
```

---

## Step 8: Monitor Production

### Check Logs

```bash
# View Cloudflare Worker logs
wrangler tail --env production
```

### Monitor Database

```sql
-- Check for errors in Claude API logs
SELECT *
FROM claude_api_logs
WHERE status = 'error'
ORDER BY request_at DESC
LIMIT 10;

-- Check for failed reports
SELECT *
FROM calculator_reports
WHERE report_html IS NULL
ORDER BY created_at DESC;

-- Check access patterns
SELECT
  DATE(accessed_at) as date,
  COUNT(*) as accesses,
  COUNT(DISTINCT report_id) as unique_reports
FROM calculator_report_access_log
GROUP BY DATE(accessed_at)
ORDER BY date DESC;
```

---

## Step 9: Setup Scheduled Tasks

Add these scheduled jobs to your infrastructure:

### Hourly: Expire Old Reports

```sql
-- Run this hourly via pg_cron or external scheduler
SELECT expire_old_reports();
```

### Weekly: Cleanup Expired Data

```sql
-- Run this weekly (e.g., every Sunday at 2 AM)
SELECT cleanup_expired_reports(90);
```

**Option A: Using Supabase pg_cron**

```sql
-- Create the schedule (one-time setup)
SELECT cron.schedule('expire-old-reports', '0 * * * *', 'SELECT expire_old_reports()');
SELECT cron.schedule('cleanup-expired-reports', '0 2 * * 0', 'SELECT cleanup_expired_reports(90)');
```

**Option B: External Scheduler (e.g., GitHub Actions)**

```yaml
# .github/workflows/cleanup-reports.yml
name: Cleanup Expired Reports
on:
  schedule:
    - cron: '0 2 * * 0'  # Every Sunday at 2 AM UTC

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Cleanup expired reports
        run: |
          psql ${{ secrets.DATABASE_URL }} -c "SELECT cleanup_expired_reports(90);"
```

---

## Checklist

- [ ] Copied `verify-and-generate.js` to `/api/` directory
- [ ] Added route handler to `calculator-api.js`
- [ ] Set environment variables in `wrangler.toml`
- [ ] Added secrets via `wrangler secret put`
- [ ] Tested locally with `wrangler dev`
- [ ] Ran database test suite successfully
- [ ] Deployed to staging environment
- [ ] Tested happy path on staging
- [ ] Tested error cases on staging
- [ ] Deployed to production
- [ ] Monitored logs for first hour
- [ ] Setup scheduled cleanup jobs
- [ ] Documented endpoint in API spec
- [ ] Updated team on new endpoint availability

---

## Rollback Plan

If you need to disable the endpoint:

```javascript
// In calculator-api.js, comment out the route:
// if (url.pathname === '/api/v1/assessment/verify-and-generate') {
//   return handleVerifyAndGenerate(request, env);
// }

// Redeploy
wrangler deploy --env production
```

---

## Support

Refer to the comprehensive guide at:
`/Users/mbrew/Developer/carnivore-weekly/api/VERIFY_AND_GENERATE_GUIDE.md`

For questions about the database, see Leo's schema documentation:
- Migration 015: `/Users/mbrew/Developer/carnivore-weekly/migrations/015_calculator_comprehensive_schema.sql`
- Migration 016: `/Users/mbrew/Developer/carnivore-weekly/migrations/016_step6b_report_generation.sql`
