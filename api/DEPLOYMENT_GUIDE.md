# Calculator API - Deployment Guide

**Quick Start:** Follow these steps in order. Takes ~15 minutes.

---

## Step 1: Verify Files Are In Place

```bash
# Check worker file exists
ls -la /Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js

# Check wrangler config
cat /Users/mbrew/Developer/carnivore-weekly/api/wrangler.toml
```

**Expected Output:**
- calculator-api.js: ~18KB JavaScript file
- wrangler.toml: name = "carnivore-report-api", main = "calculator-api.js"

---

## Step 2: Apply Database Migration to Supabase

### Option A: Via Supabase Dashboard
1. Go to https://app.supabase.com/project/[YOUR_PROJECT]/sql
2. Click "New Query"
3. Copy entire contents of `/Users/mbrew/Developer/carnivore-weekly/migrations/016_step6b_report_generation.sql`
4. Paste into editor
5. Click "Run"
6. Verify success (no errors)

### Option B: Via CLI
```bash
cd /Users/mbrew/Developer/carnivore-weekly
supabase db push
```

**Verify Tables Exist:**
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'calculator_sessions_v2',
  'calculator_reports',
  'calculator_report_access_log',
  'claude_api_logs',
  'payment_tiers'
);
```

---

## Step 3: Set Environment Variables in Cloudflare

From your command line (requires wrangler CLI installed):

```bash
cd /Users/mbrew/Developer/carnivore-weekly/api

# Required environment variables (get these from Supabase & Stripe)
wrangler secret put SUPABASE_URL
# Paste: https://kwtdpvnjewtahuxjyltn.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# Paste: Your Supabase service role key (from Settings → API)

wrangler secret put SUPABASE_ANON_KEY
# Paste: Your Supabase anon key (from Settings → API)

wrangler secret put STRIPE_SECRET_KEY
# Paste: sk_live_... or sk_test_... (from Stripe Dashboard)

wrangler secret put STRIPE_PUBLISHABLE_KEY
# Paste: pk_live_... or pk_test_... (from Stripe Dashboard)

wrangler secret put CLAUDE_API_KEY
# Paste: Your Anthropic API key (from console.anthropic.com)

wrangler secret put FRONTEND_URL
# Paste: https://carnivoreweekly.com or your frontend domain

wrangler secret put API_BASE_URL
# Paste: https://api.example.com (or your Workers domain)
```

**Verify Secrets:**
```bash
wrangler secret list
```

Expected: 8 secrets listed

---

## Step 4: Deploy Worker to Cloudflare

```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler deploy
```

**Expected Output:**
```
Uploaded calculator-api.js
Published to https://carnivore-report-api.[RANDOM].workers.dev
```

**Save this URL** - it's your API endpoint.

---

## Step 5: Test Deployment

### Test 1: Get Payment Tiers (simplest test)
```bash
curl https://carnivore-report-api.[RANDOM].workers.dev/api/v1/calculator/payment/tiers
```

**Expected Response:**
```json
{
  "tiers": [
    {
      "id": "...",
      "tier_slug": "bundle",
      "tier_title": "Bundle - $9.99",
      "price_cents": 999,
      "features": {...}
    }
  ],
  "count": 1
}
```

### Test 2: Create Session
```bash
curl -X POST https://carnivore-report-api.[RANDOM].workers.dev/api/v1/calculator/session \
  -H "Content-Type: application/json" \
  -d '{"referrer": "test"}'
```

**Expected Response:**
```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "created_at": "2026-01-03T10:30:00Z"
}
```

### Test 3: Save Step 1
```bash
curl -X POST https://carnivore-report-api.[RANDOM].workers.dev/api/v1/calculator/step/1 \
  -H "Content-Type: application/json" \
  -d '{
    "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "data": {
      "sex": "male",
      "age": 35,
      "height_feet": 5,
      "height_inches": 10,
      "weight_value": 185,
      "weight_unit": "lbs"
    }
  }'
```

**Expected Response:**
```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step_completed": 2,
  "next_step": 3
}
```

---

## Step 6: Configure Frontend API URL

In your frontend code, update the API base URL:

```javascript
const API_BASE_URL = 'https://carnivore-report-api.[RANDOM].workers.dev/api/v1/calculator';

// Example: Create session
async function createSession() {
  const response = await fetch(`${API_BASE_URL}/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referrer: 'google.com' })
  });
  return response.json();
}
```

---

## Step 7: Test Full Payment Flow

### Test Flow:
1. POST /session → get session_token
2. POST /step/1 → save physical stats
3. POST /step/2 → save fitness profile
4. POST /step/3 → save macros, get tiers
5. POST /payment/initiate → get Stripe URL
6. (User completes payment on Stripe)
7. POST /payment/verify → get access_token
8. POST /step/4 → save health profile
9. GET /report/{token}/status → track generation

### Example Script:
```bash
#!/bin/bash

API="https://carnivore-report-api.[RANDOM].workers.dev/api/v1/calculator"

# Create session
echo "1. Creating session..."
SESSION=$(curl -s -X POST $API/session \
  -H "Content-Type: application/json" \
  -d '{"referrer":"test"}')
TOKEN=$(echo $SESSION | jq -r '.session_token')
echo "Token: $TOKEN"

# Step 1
echo "2. Saving step 1..."
curl -s -X POST $API/step/1 \
  -H "Content-Type: application/json" \
  -d "{\"session_token\":\"$TOKEN\",\"data\":{\"sex\":\"male\",\"age\":35,\"height_feet\":5,\"height_inches\":10,\"weight_value\":185,\"weight_unit\":\"lbs\"}}" | jq .

# Step 2
echo "3. Saving step 2..."
curl -s -X POST $API/step/2 \
  -H "Content-Type: application/json" \
  -d "{\"session_token\":\"$TOKEN\",\"data\":{\"lifestyle_activity\":\"moderate\",\"exercise_frequency\":\"5-6\",\"goal\":\"lose\",\"deficit_percentage\":20,\"diet_type\":\"carnivore\"}}" | jq .

# Step 3 + Get Tiers
echo "4. Saving step 3 and getting tiers..."
curl -s -X POST $API/step/3 \
  -H "Content-Type: application/json" \
  -d "{\"session_token\":\"$TOKEN\",\"calculated_macros\":{\"calories\":2400,\"protein_grams\":180,\"fat_grams\":200,\"carbs_grams\":25,\"protein_percentage\":30,\"fat_percentage\":75,\"carbs_percentage\":5}}" | jq .

echo "5. Getting tiers..."
curl -s -X GET $API/payment/tiers | jq '.tiers[0].id'
```

---

## Step 8: Monitor & Troubleshoot

### Check Cloudflare Worker Logs
```bash
wrangler tail
```

This streams real-time logs from your Worker.

### Check Supabase Logs
1. Go to https://app.supabase.com/project/[YOUR_PROJECT]/logs
2. Look for recent queries to calculator_sessions_v2, calculator_reports

### Common Errors

**Error: "SUPABASE_URL not found"**
- Cause: Environment variable not set
- Fix: Run `wrangler secret put SUPABASE_URL`

**Error: "session not found"**
- Cause: Database insert failed or wrong key
- Fix: Check SUPABASE_SERVICE_ROLE_KEY is correct (not ANON_KEY)

**Error: "RATE_LIMIT"**
- Cause: Too many requests from same session in 1 hour
- Fix: This is expected; wait 1 hour or use different session_token

**Error: "CORS error in browser console"**
- Cause: FRONTEND_URL not set or doesn't match
- Fix: Set FRONTEND_URL to your actual frontend domain

---

## Step 9: Deploy Async Report Processor (Optional but Recommended)

The calculator-api.js handles the request/response, but reports are generated asynchronously.

You have options:
1. **Cron Job:** Set scheduled job every 5 minutes via Cloudflare Workers
2. **Stripe Webhook:** Listen to payment_intent.succeeded event
3. **Supabase Function:** Edge function triggered on calculator_reports insert

**Recommended:** Stripe Webhook (most reliable)

See `/Users/mbrew/Developer/carnivore-weekly/src/services/report-generation-queue.ts` for the processor code.

---

## Step 10: Set Up Monitoring

### Cloudflare Analytics
- Dashboard: https://dash.cloudflare.com/
- Workers → calculator-api → Analytics
- Metrics: Requests, Errors, Latency

### Supabase Monitoring
- Dashboard: https://app.supabase.com/
- Logs: Check query performance
- Usage: Monitor token consumption

### Custom Monitoring
Consider adding:
- Error tracking (Sentry)
- Performance monitoring (Honeycomb, DataDog)
- Cost tracking (Claude API tokens via claude_api_logs table)

---

## Rollback Procedure

If issues occur:

### Quick Rollback
```bash
# Redeploy previous version
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler rollback
```

### Manual Rollback
1. Update API_BASE_URL in frontend to previous worker URL
2. No database changes needed (migrations are backward compatible)

---

## Success Criteria

You'll know deployment is successful when:

- [x] All 9 endpoints respond to requests
- [x] Session tokens are created and stored in Supabase
- [x] Form data is saved to calculator_sessions_v2
- [x] Payment tiers are fetched from payment_tiers
- [x] Payment verification creates report records
- [x] Report status can be queried with access_token
- [x] Cloudflare logs show 200 responses
- [x] Supabase shows data in calculator_sessions_v2 and calculator_reports

---

## Support & Troubleshooting

For issues:

1. **Check logs:** `wrangler tail`
2. **Test endpoint:** `curl https://[WORKER_URL]/api/v1/calculator/payment/tiers`
3. **Review code:** `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
4. **Check migration:** `SELECT COUNT(*) FROM calculator_reports;` in Supabase

---

## Next: Frontend Integration

Once API is deployed and tested:

1. Update frontend API base URL
2. Test full form flow (steps 1-4)
3. Test payment flow with Stripe test card: 4242 4242 4242 4242
4. Verify reports are created and accessible

See `/Users/mbrew/Developer/carnivore-weekly/docs/CALCULATOR_API_INTEGRATION_COMPLETE.md` for full endpoint documentation.

---

**Status:** Ready to deploy. Follow steps 1-5, then test. Should take 15-20 minutes total.
