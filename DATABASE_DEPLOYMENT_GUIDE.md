# Database Deployment Guide

## Current Status

✅ **Migration file created and ready:** `supabase/migrations/20250101120000_create_report_system.sql`

⏳ **Deployment method:** Requires Supabase CLI authentication

---

## Why Authentication is Required

The Supabase CLI uses personal access tokens (different from API keys) to:
- Authenticate with your Supabase account
- Access project configuration
- Deploy migrations to your database

This is a security feature - it ensures only authorized users can modify your database schema.

---

## Deployment Steps

### Step 1: Authenticate with Supabase (One-time setup)

```bash
supabase login
```

This will:
1. Open a browser to https://supabase.com/dashboard/account/tokens
2. You'll see your personal access tokens
3. Create a new token or use an existing one
4. Copy the token and paste it into the CLI prompt
5. CLI will save the token locally for future use

**Alternative (if browser doesn't open):**
1. Go to: https://supabase.com/dashboard/account/tokens
2. Create a new token
3. Run: `supabase login --token <your-token-here>`

### Step 2: Link Your Project (One-time)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
supabase link --project-ref kwtdpvnjewtahuxjyltn
```

This connects your local project to your Supabase project.

### Step 3: Deploy the Migration

```bash
supabase db push
```

This will:
1. Read your migration file
2. Execute the SQL against your database
3. Show you the results
4. Ask for confirmation if needed

**Expected output:**
```
✓ Pushing migrations...
✓ Creating migration...
✓ Successfully created migration: 20250101120000_create_report_system
✓ Applying migrations...
✓ Applied 1 migration
```

### Step 4: Verify Deployment

Check that the tables were created:

**Option A: Via Dashboard**
1. Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/editor
2. You should see these 3 new tables:
   - `user_sessions`
   - `generated_reports`
   - `report_access_log`

**Option B: Via CLI**
```bash
supabase db pull
```

---

## What Gets Deployed

When you run `supabase db push`, it will create:

### 1. **user_sessions** Table
```
id (UUID) - Primary key
email (TEXT) - User email
path_choice (TEXT) - 'free' or 'paid'
macro_data (JSONB) - Calculated macros
payment_status (TEXT) - 'unpaid', 'paid', 'refunded'
stripe_payment_id (TEXT) - Stripe transaction ID
created_at (TIMESTAMP) - Auto-set
updated_at (TIMESTAMP) - Auto-updated
```

### 2. **generated_reports** Table
```
id (UUID) - Primary key
session_id (UUID) - Links to user_sessions
email (TEXT) - Report recipient
access_token (TEXT UNIQUE) - Secure download link
report_html (TEXT) - Full HTML report
questionnaire_data (JSONB) - Form responses
created_at (TIMESTAMP) - Auto-set
expires_at (TIMESTAMP) - 48 hours from creation
access_count (INT) - Download counter
last_accessed_at (TIMESTAMP) - Last download time
```

### 3. **report_access_log** Table
```
id (UUID) - Primary key
report_id (UUID) - Links to generated_reports
accessed_at (TIMESTAMP) - Auto-set
ip_address (TEXT) - User IP
user_agent (TEXT) - Browser info
```

### 4. **Functions & Triggers**
- Auto-update timestamp function
- RLS (Row-Level Security) policies
- Indexed columns for performance

---

## Troubleshooting

### "Cannot find project ref"
**Problem:** Project not linked
**Solution:** Run `supabase link --project-ref kwtdpvnjewtahuxjyltn`

### "Access token not provided"
**Problem:** Not authenticated
**Solution:** Run `supabase login`

### "Not authenticated with Supabase"
**Problem:** Token expired or missing
**Solution:**
```bash
supabase logout
supabase login
```

### "Migration file not found"
**Problem:** Wrong directory
**Solution:** Make sure you're in `/Users/mbrew/Developer/carnivore-weekly`

### Migration fails with SQL error
**Problem:** Database syntax or constraint issue
**Solution:**
1. Check the error message
2. Review `supabase/migrations/20250101120000_create_report_system.sql`
3. Run `supabase migration repair --status reverted` if needed
4. Try again: `supabase db push`

---

## After Deployment

Once tables are created:

### 1. Deploy the Cleanup Edge Function
```bash
supabase functions deploy cleanup-expired-reports --project-id kwtdpvnjewtahuxjyltn
```

### 2. Schedule Daily Cleanup
1. Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/functions
2. Click on `cleanup-expired-reports`
3. Go to "Cron Jobs" tab
4. Add new job:
   - Expression: `0 2 * * *` (2 AM UTC daily)
   - Function: `cleanup-expired-reports`
5. Save

### 3. Test the System
```bash
# Test free path
Open: https://carnivoreweekly.com/public/calculator.html
Click: "Start Free Calculator"
Submit: Form
See: Results page ✓

# Test paid path
Open: https://carnivoreweekly.com/public/calculator.html
Click: "Get Full Protocol"
Fill: Questionnaire
Submit: Form
Check: Email for report link
Click: Report link
See: Full report ✓
```

---

## Rollback

If something goes wrong:

### Rollback the migration
```bash
supabase db reset
```

This will:
1. Drop all tables
2. Re-run the migration from scratch
3. Give you a clean slate

### Delete and recreate project
If you want a complete reset:
1. Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/settings/general
2. Scroll to "Delete Project"
3. Recreate project with same name

---

## Reference

**Supabase CLI Docs:** https://supabase.com/docs/guides/cli
**Personal Access Tokens:** https://supabase.com/docs/guides/auth#personal-access-tokens
**Migrations Guide:** https://supabase.com/docs/guides/migrations

---

## Quick Cheat Sheet

```bash
# Authenticate
supabase login

# Link project
supabase link --project-ref kwtdpvnjewtahuxjyltn

# Deploy migration
supabase db push

# Pull latest schema
supabase db pull

# Reset database
supabase db reset

# Check status
supabase status

# View logs
supabase functions list
supabase functions logs cleanup-expired-reports
```

---

**Next:** Authenticate with Supabase and run `supabase db push` to deploy the database schema!
