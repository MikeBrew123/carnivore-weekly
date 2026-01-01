# Quick Start - Deploy Now ⚡

**Status:** Ready to deploy. 3 simple steps to go live.

---

## Step 1: Deploy Database (5 min) ✨

Run the automated script:

```bash
cd /Users/mbrew/Developer/carnivore-weekly
chmod +x deploy-migration.sh
./deploy-migration.sh
```

This will:
- Link your Supabase project
- Create 3 tables (user_sessions, generated_reports, report_access_log)
- Setup RLS policies and auto-cleanup triggers
- Deploy cleanup edge function

**Verify:** https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/editor
- You should see the 3 new tables

---

## Step 2: Setup Email (10 min) ✨

### 2a. Create Resend Account (2 min)
1. Go to https://resend.com/signup
2. Sign up with any email
3. Verify email in your inbox

### 2b. Get API Key (1 min)
1. Go to https://resend.com/settings/api-keys
2. Click "Create API Key"
3. Copy the key (looks like: `re_xxxxxxxxxxxxx`)

### 2c. Verify Domain (2 min)
1. Go to https://app.resend.com/domains
2. Click "Add Domain"
3. Enter: `carnivoreweekly.com`
4. Follow DNS instructions (add TXT + CNAME records in your DNS provider)
5. Wait for verification (usually 5-30 minutes)

### 2d. Deploy to Cloudflare (1 min)
```bash
# Set your API key (replace with actual key from step 2b)
export RESEND_API_KEY="re_your_actual_key_here"

# Deploy to Cloudflare
wrangler secret put RESEND_API_KEY --env production

# You should see: ✨ Success! Uploaded secret RESEND_API_KEY

# Redeploy Worker
wrangler deploy --env production

# You should see: ✨ Deployed carnivore-report-api-production
```

---

## Step 3: Test Everything (10 min) ✨

### Test Free Path
```
1. Open: https://carnivoreweekly.com/public/calculator.html
2. Click: "Start Free Calculator"
3. Fill form and submit
4. See: Results page ✓
```

### Test Paid Path
```
1. Open: https://carnivoreweekly.com/public/calculator.html
2. Click: "Get Full Protocol"
3. Go to: https://carnivoreweekly.com/public/questionnaire.html
4. Fill form with test email (testuser+timestamp@gmail.com)
5. Submit form
6. Check email inbox
7. Click report link
8. See: Full report loads ✓
```

### Test Report Expiration (Optional)
```
1. Save report link from email
2. Wait 48 hours
3. Click link again
4. See: "Report Expired" message ✓
```

---

## What's Already Deployed ✅

- ✅ Cloudflare Worker (running at: https://carnivore-report-api-production.iambrew.workers.dev)
- ✅ Frontend pages (calculator choice screen, report retrieval, questionnaire)
- ✅ Database schema (ready to deploy)
- ✅ Cleanup function (ready to deploy)
- ✅ All secrets configured (except Resend)

---

## Troubleshooting

### Database deploy fails: "Cannot find project ref"
```bash
# Make sure you're in the right directory
cd /Users/mbrew/Developer/carnivore-weekly

# Login to Supabase
supabase login

# Then run the script again
./deploy-migration.sh
```

### Email not sending after deploying Resend key
1. Verify domain actually completed (check Resend dashboard)
2. Verify Resend secret was deployed: `wrangler secret list --env production`
3. Check Worker logs: `wrangler tail --env production`

### Report link not working
1. Verify database tables were created in Supabase
2. Check if report was saved: Go to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/editor → generated_reports table
3. Check Worker logs for errors: `wrangler tail --env production`

---

## Rollback

If something breaks:

```bash
# Rollback Worker to previous version
wrangler rollback --env production

# Check Supabase backups
# (Go to https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/backups)

# Delete test database and reset
# (Go to Supabase dashboard → Settings → Delete project & recreate)
```

---

## Next Steps After Deployment

1. **Monitor Logs**
   - Cloudflare: `wrangler tail --env production`
   - Supabase: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/logs

2. **Schedule Cleanup Cron**
   - Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/functions
   - Click: cleanup-expired-reports
   - Add cron: `0 2 * * *` (2 AM UTC daily)

3. **Setup Analytics**
   - Check GA4 for path selection events
   - Monitor conversion rates (free → paid)
   - Track report access patterns

4. **Production Launch**
   - Update calculator.html SUPABASE_ANON_KEY to match project
   - Push frontend to production server
   - Monitor for errors in first 24 hours

---

## Cheat Sheet

**Check what's deployed:**
```bash
wrangler secret list --env production
wrangler tail --env production
supabase functions list --project-id kwtdpvnjewtahuxjyltn
```

**Check database:**
```
https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/editor
```

**Check email domain:**
```
https://app.resend.com/domains
```

**Check logs:**
```bash
wrangler tail --env production
```

**Redeploy everything:**
```bash
# Database
supabase db push

# Function
supabase functions deploy cleanup-expired-reports

# Worker
wrangler deploy --env production
```

---

## Estimated Timings

- Step 1 (Database): 2-3 minutes
- Step 2 (Email): 10-15 minutes (+ 5-30 min domain verification)
- Step 3 (Testing): 10 minutes

**Total: ~25-50 minutes to full production**

---

## Success Criteria

You're done when:
1. ✅ `./deploy-migration.sh` runs successfully
2. ✅ Resend domain verified
3. ✅ Test email received at test address
4. ✅ Report link in email works
5. ✅ Report displays correctly

---

**Ready? Start with:** `./deploy-migration.sh`
