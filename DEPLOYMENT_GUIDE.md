# Two-Path Calculator + Supabase Report System - Deployment Guide

**Status:** Ready for deployment
**Implementation:** Complete
**Date:** January 1, 2026

---

## Overview

This deployment guide covers the complete setup for:
1. Two-path calculator choice system (free vs. $9.99 paid)
2. Proper report storage in Supabase with 48-hour expiration
3. Email delivery via Resend
4. Secure report retrieval with access tokens
5. Automatic cleanup of expired reports

---

## Phase 7: Environment Variables & Deployment

### Step 1: Gather Required Credentials

You'll need credentials from three services:

**A. Anthropic (Claude API)**
- URL: https://console.anthropic.com
- Get: API Key
- Action: Go to "API Keys" → Create new key
- Save as: `ANTHROPIC_API_KEY`

**B. Supabase (Database)**
- URL: https://supabase.com/dashboard
- Get: Service Role Key (NOT anon key)
- Action: Go to Project → Settings → API → Service Role Key
- Save as: `SUPABASE_SERVICE_ROLE_KEY`
- Note: This is different from the anon key used in frontend code

**C. Resend (Email Service)**
- URL: https://resend.com
- Get: API Key
- Action: Go to API Keys → Create a new API key
- Save as: `RESEND_API_KEY`
- Also verify: Domain verification (reports@carnivoreweekly.com)

### Step 2: Deploy Cloudflare Worker

**Command:**
```bash
cd api
wrangler deploy --env production
```

**This will:**
- Deploy `api/generate-report.js` to Cloudflare Workers
- Use secrets from Cloudflare Secret Manager
- Make it available at: https://carnivore-report-api.iambrew.workers.dev

**Add Secrets to Cloudflare:**
```bash
# Interactive prompt for each secret
wrangler secret put ANTHROPIC_API_KEY --env production
# Paste: (your Claude API key)

wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
# Paste: (your Supabase service role key)

wrangler secret put RESEND_API_KEY --env production
# Paste: (your Resend API key)
```

**Verify Deployment:**
```bash
# Check active workers
wrangler list

# Test the endpoint
curl -X POST https://carnivore-report-api.iambrew.workers.dev \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Step 3: Deploy Supabase Edge Function

**Prerequisites:**
- Supabase CLI installed: `npm install -g supabase`
- Authenticated: `supabase login`

**Deploy:**
```bash
# Navigate to function directory
cd supabase/functions/cleanup-expired-reports

# Deploy the function
supabase functions deploy cleanup-expired-reports --project-id kwtdpvnjewtahuxjyltn
```

**Test Locally (Optional):**
```bash
supabase functions serve cleanup-expired-reports
# Should start server at http://localhost:54321
```

### Step 4: Schedule Cleanup Cron Job

In Supabase Dashboard:

1. Go to: Project → SQL Editor
2. Create a new query with:
```sql
SELECT cron.schedule(
  'cleanup-expired-reports',
  '0 2 * * *', -- Daily at 2 AM UTC
  'SELECT http_post(''https://kwtdpvnjewtahuxjyltn.supabase.co/functions/v1/cleanup-expired-reports'', ''{}''::jsonb)'
);
```

Or use Supabase Dashboard:
1. Go to: Database → Cron Jobs
2. Add new job:
   - Name: `cleanup-expired-reports`
   - Function: `cleanup-expired-reports` (edge function)
   - Schedule: `0 2 * * *` (daily at 2 AM)

### Step 5: Verify Database Schema

Ensure these tables exist in Supabase:

```sql
-- Check tables
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Should show:
-- - user_sessions
-- - generated_reports
-- - report_access_log
```

If missing, run migration 012:
```bash
supabase db push
```

### Step 6: Update Frontend Configuration (if needed)

The following are already hardcoded correctly:

**calculator.html** (line 1686-1687):
```javascript
'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // SUPABASE_ANON_KEY
'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**report.html** (line ~1355):
```javascript
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**questionnaire.html** (line 1420):
```javascript
const apiUrl = 'https://carnivore-report-api.iambrew.workers.dev';
```

These are correct and don't need changes.

---

## Phase 8: End-to-End Testing

### Test 1: Free Path (Calculator Only)

**Steps:**
1. Go to: https://carnivoreweekly.com/calculator.html
2. Click: "Start Free Calculator →"
3. Calculator form appears (hidden initially)
4. Fill form and calculate macros
5. Click: "Get Your Free Report"
6. Verify: Results display, no email sent

**Expected:**
- No email should be sent for free path
- User sees results immediately
- Upgrade CTA button visible

### Test 2: Paid Path (Free Choice)

**Steps:**
1. Go to: https://carnivoreweekly.com/calculator.html
2. Click: "Get Full Protocol →"
3. Redirects to: questionnaire.html
4. Fill form with test email
5. Click: "Generate My Report"
6. Loading animation shows

**Expected:**
- 60-120 second generation time
- Progress bar shows
- Email sent to test email address

### Test 3: Email & Report Access

**Steps:**
1. From Test 2, check email inbox
2. Look for: "Your Personalized Carnivore Report is Ready"
3. Click: "View My Report" button
4. Should redirect to: report.html?token=xxx

**Expected:**
- Email arrives within 2-5 minutes
- Access link in email works
- Report displays with all 13 sections
- Print button works

### Test 4: Report Expiration

**Steps:**
1. Wait 48+ hours (or manually set database `expires_at` to now)
2. Try to access same report token
3. Click: report.html?token=expired-token

**Expected:**
- "Report Expired" message
- Link to start over
- No error messages

### Test 5: Upgrade Flow (Free → Paid)

**Steps:**
1. Go to calculator.html
2. Click: "Start Free Calculator"
3. Calculate macros, get results
4. Click: "Upgrade to Full Protocol" button (if present)
5. Redirects to questionnaire
6. Fill form, generate report

**Expected:**
- Session ID preserved from calculator
- Email sent with report
- User gets full personalized protocol

### Test 6: Mobile Responsiveness

**Steps:**
1. Open calculator.html on mobile (375x812)
2. Test choice buttons responsive
3. Open report.html on mobile
4. Print button works
5. No horizontal scroll

**Expected:**
- No horizontal overflow
- Touch targets ≥44px
- Text readable without zoom

---

## Troubleshooting

### Issue: Worker returns 500 error

**Solution:**
1. Check Cloudflare logs: Dash → Workers → Tail logs
2. Verify secrets are set: `wrangler secret list --env production`
3. Test Claude API key: `curl https://api.anthropic.com/v1/messages -H "x-api-key: YOUR_KEY"`

### Issue: Email not arriving

**Solution:**
1. Check Resend dashboard for delivery status
2. Verify domain verified: verify reports@carnivoreweekly.com
3. Check spam folder
4. Test with: `curl -X POST https://api.resend.com/emails -H "Authorization: Bearer YOUR_KEY"`

### Issue: Report not saving to Supabase

**Solution:**
1. Check Supabase logs: Project → Logs
2. Verify service role key is correct (NOT anon key)
3. Check table permissions: Go to Auth → Policies
4. Verify generated_reports table exists

### Issue: Cleanup job not running

**Solution:**
1. Check cron job in dashboard: Database → Cron Jobs
2. Verify function deployed: `supabase functions list`
3. Check edge function logs: Functions → cleanup-expired-reports → Logs
4. Manually trigger: Go to Functions, click "Test"

---

## Rollback Plan

If something breaks:

### Revert Worker
```bash
cd api
wrangler deployments list
wrangler deployments rollback VERSION_ID
```

### Revert Database
```bash
supabase db reset
supabase db push
```

### Stop Cleanup Job
```sql
SELECT cron.unschedule('cleanup-expired-reports');
```

---

## Success Criteria

**Week 1:**
- ✅ Worker deployed and responding
- ✅ Supabase saves reports
- ✅ Resend sends emails
- ✅ Users access reports via token
- ✅ No critical errors in logs

**Week 2:**
- ✅ 50%+ users choose a path (not bouncing)
- ✅ 25%+ choose paid upfront
- ✅ 95%+ email delivery rate
- ✅ 80%+ users access report via email

**Month 1:**
- ✅ 40%+ overall paid conversion
- ✅ <2% expired report access attempts
- ✅ Zero data loss incidents
- ✅ Average 1.5 accesses per report

---

## Files Modified/Created

### Modified
- `/api/generate-report.js` - Added Supabase save & Resend email
- `/api/wrangler.toml` - Added env vars config
- `/public/calculator.html` - Added choice screen & Supabase integration
- `/public/questionnaire.html` - Added session_id, email confirmation

### Created
- `/public/report.html` - Report retrieval & display
- `/supabase/functions/cleanup-expired-reports/index.ts` - Auto-cleanup

---

## Next Steps

1. **Immediate:** Run through all 6 tests above
2. **This week:** Monitor logs for errors
3. **Monitor:** Track GA events for conversion funnel
4. **Iterate:** Adjust messaging based on user feedback
5. **Scale:** Add more marketing channels once proven

---

## Support

**Questions during deployment?**
- Anthropic API docs: https://docs.anthropic.com
- Cloudflare Workers docs: https://developers.cloudflare.com/workers
- Supabase docs: https://supabase.com/docs
- Resend docs: https://resend.com/docs

**Emergency contacts:**
- Anthropic support: support@anthropic.com
- Cloudflare support: Dash → Support
- Supabase support: Dashboard → Support
- Resend support: support@resend.com

---

**Deployment Guide Version:** 1.0
**Last Updated:** January 1, 2026
**Ready for Production:** ✅ Yes
