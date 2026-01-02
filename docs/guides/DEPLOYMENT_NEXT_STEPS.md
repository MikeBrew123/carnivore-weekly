# Next Steps for Two-Path Calculator Deployment

**Status:** 🟢 **ALMOST READY** - 2 Critical Tasks Remaining

**Current Progress:**
- ✅ Cloudflare Worker: DEPLOYED (secrets configured)
- ✅ Frontend code: COMPLETE & TESTED (35/37 tests passing)
- ⏳ Supabase database: READY (migration file created)
- ⏳ Resend email service: NEEDS API KEY

---

## Remaining Tasks (In Order)

### Task 1: Deploy Supabase Database Schema

**What:** Create database tables and functions for report storage

**Files:**
- Migration: `supabase/migrations/20250101120000_create_report_system.sql`
- Tables: `user_sessions`, `generated_reports`, `report_access_log`

**How to Deploy:**

**Option A: Automated (Recommended)**
```bash
cd /Users/mbrew/Developer/carnivore-weekly
chmod +x deploy-migration.sh
./deploy-migration.sh
```

**Option B: Manual**
```bash
# First, authenticate if needed
supabase login

# Link project
supabase link --project-ref kwtdpvnjewtahuxjyltn

# Deploy migration
supabase db push
```

**Verification:**
```bash
# Check Supabase dashboard: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/editor
# You should see these tables:
# - user_sessions
# - generated_reports
# - report_access_log
```

**Time:** 2-3 minutes

---

### Task 2: Deploy Supabase Edge Function (Cleanup Job)

**What:** Daily cron job to delete reports after 48 hours

**File:** `supabase/functions/cleanup-expired-reports/index.ts`

**How to Deploy:**

```bash
cd /Users/mbrew/Developer/carnivore-weekly

# Deploy the function
supabase functions deploy cleanup-expired-reports --project-id kwtdpvnjewtahuxjyltn

# You should see:
# ✓ Function "cleanup-expired-reports" pushed successfully
```

**Schedule the Cron Job:**

1. Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/functions
2. Click on `cleanup-expired-reports` function
3. Click "Cron Jobs" tab
4. Add new cron job:
   - Expression: `0 2 * * *` (Daily at 2 AM UTC)
   - Function: `cleanup-expired-reports`
   - Enable: ✓
5. Save

**Time:** 5 minutes

---

### Task 3: Setup Email Delivery (Resend)

**What:** Enable users to receive report access links via email

**Required:**
1. Resend account
2. API key
3. Domain verification

**How to Setup:**

**Step 1: Create Resend Account**
```
1. Go to: https://resend.com/signup
2. Sign up with any email
3. Verify your email
```

**Step 2: Get API Key**
```
1. Go to: https://resend.com/settings/api-keys
2. Create new API key
3. Copy the key (format: "re_xxxxxxxxxxxxx")
```

**Step 3: Verify Domain**
```
1. Go to: https://app.resend.com/domains
2. Click "Add Domain"
3. Enter: carnivoreweekly.com
4. Add DNS records shown (TXT and CNAME)
5. Wait for verification (usually 5-30 minutes)
```

**Step 4: Deploy to Cloudflare**
```bash
# Set the API key
export RESEND_API_KEY="re_xxxxxxxxxxxxx"

# Deploy to Cloudflare Workers
wrangler secret put RESEND_API_KEY --env production

# You should see:
# ✨ Success! Uploaded secret RESEND_API_KEY
```

**Step 5: Redeploy Worker**
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler deploy --env production

# You should see:
# ✨ Deployed carnivore-report-api-production
```

**Time:** 10-15 minutes (+ domain verification wait time)

---

## Verification Checklist

After completing all tasks, verify everything works:

### Database
- [ ] Can connect to Supabase project
- [ ] Tables exist (user_sessions, generated_reports, report_access_log)
- [ ] RLS policies in place
- [ ] Cleanup function deployed

### Email
- [ ] Domain verified in Resend
- [ ] API key deployed to Cloudflare
- [ ] Worker redeployed with Resend secret

### Frontend
- [ ] Calculator choice screen visible
- [ ] Free/Paid buttons work
- [ ] Forms submit without errors
- [ ] LocalStorage session tracking working

---

## End-to-End Test (After All Deploys)

**Test Free Path:**
```
1. Open: https://carnivoreweekly.com/public/calculator.html
2. Click "Start Free Calculator"
3. Fill form and submit
4. See results page
```

**Test Paid Path:**
```
1. Open: https://carnivoreweekly.com/public/calculator.html
2. Click "Get Full Protocol"
3. Go to: https://carnivoreweekly.com/public/questionnaire.html
4. Fill form with test email: testuser@example.com
5. Submit form
6. Check email inbox for report link
7. Click link and verify report displays
```

**Test Report Access:**
```
1. From the email, click the report link
2. Verify report displays correctly
3. Wait 48+ hours
4. Try accessing link again
5. Should show "Report Expired" message
```

---

## Credentials Stored Locally

All credentials are stored in: `/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json`

**Currently Deployed:**
- ✅ Anthropic API Key (Cloudflare Worker)
- ✅ Supabase Service Role Key (Cloudflare Worker)
- ✅ Cloudflare Authentication (wrangler CLI)

**Need to Deploy:**
- ⏳ Resend API Key (Cloudflare Worker)

**Reference (Not Deployed):**
- YouTube API Key
- Google Analytics Property

---

## Troubleshooting

### Cloudflare Worker Tests Failing
```bash
# Verify secrets are set
wrangler secret list --env production

# Should show:
# ANTHROPIC_API_KEY
# SUPABASE_SERVICE_ROLE_KEY
# RESEND_API_KEY (after step 3)
```

### Email Not Sending
1. Check domain is verified in Resend
2. Check API key is deployed to Cloudflare
3. Check Worker logs: `wrangler tail --env production`

### Database Queries Timing Out
1. Check Supabase project status
2. Verify RLS policies aren't too restrictive
3. Check migration ran successfully

### Reports Not Storing
1. Verify Supabase service role key is correct
2. Check generated_reports table in Supabase dashboard
3. Test with direct API call to Supabase

---

## Timeline

**If you do tasks in order:**

| Task | Time | Cumulative |
|------|------|-----------|
| Deploy DB Schema | 2-3 min | 2-3 min |
| Deploy Edge Function | 5 min | 7-8 min |
| Setup Resend Account | 2 min | 9-10 min |
| Setup Domain Verification | 2 min | 11-12 min |
| Deploy to Cloudflare | 2 min | 13-14 min |
| Domain verification (wait) | 5-30 min | 18-44 min |
| End-to-end testing | 10 min | 28-54 min |

**Total:** ~30-50 minutes to full deployment

---

## Success Indicators

**System is working when:**

1. ✅ Supabase tables populated with test data
2. ✅ Emails received for test reports
3. ✅ Reports accessible via token for 48 hours
4. ✅ Reports deleted after 48 hours
5. ✅ GA events tracking free vs paid choices
6. ✅ Access logs recording report downloads
7. ✅ No errors in Cloudflare Worker logs

---

## Support

- **Supabase Issues:** https://supabase.com/support
- **Resend Issues:** https://resend.com/support
- **Cloudflare Issues:** https://support.cloudflare.com
- **Database:** https://app.supabase.com/project/kwtdpvnjewtahuxjyltn

---

**Next Action:** Run `./deploy-migration.sh` to deploy the database schema
