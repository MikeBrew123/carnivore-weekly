# Supabase Connection Setup Guide

## Current Status

### What's Working ✓
- **Supabase Project:** Created and accessible
- **Anon/Publishable Key:** Valid and correct
- **Project ID:** `kwtdpvnjewtahuxjyltn`
- **Project URL:** `https://kwtdpvnjewtahuxjyltn.supabase.co`

### What's Not Working ✗
- **Service Role Key:** Invalid (needs replacement)
- **Database Tables:** Not created (0/5)
- **Writer Data:** Not seeded
- **Connection Status:** Can't access database until tables exist

---

## The Problem in Plain English

You have a Supabase project set up, and you have a valid anon key (the one starting with `sb_publishable_`). However:

1. **The database is empty** - No tables have been created yet
2. **The admin key is broken** - The service role key in your `.env` file is being rejected by Supabase

To use this database, you need:
1. A working admin key (service role)
2. To run database migrations to create tables
3. To seed some test data

---

## How to Fix It (5 Easy Steps)

### Step 1: Get a Valid Service Role Key (1 minute)

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Look for your project or click "Select a project"
3. Select the project: **kwtdpvnjewtahuxjyltn**
4. In the left sidebar, click **Settings**
5. Click **API** in the submenu
6. Look for **Project API keys**
7. Find the key labeled **service_role** (there should be a description like "Provides access to Supabase as a service")
8. Click the copy icon (it should be a square with two overlapping squares)

You should now have a long string that looks like:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IkpPS1pRR...
```

### Step 2: Update Your .env File (1 minute)

1. Open `/Users/mbrew/Developer/carnivore-weekly/.env`
2. Find the line starting with `SUPABASE_SERVICE_ROLE_KEY=`
3. Replace the entire value with the key you just copied
4. Save the file

Before:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IlBPUkpFQ1RfSUQiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzM0MTYwNjQzLCJleHAiOjE4OTE4MjcyNDN9.REDACTED_ACTUAL_KEY
```

After:
```
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IkpPS1pRR...COMPLETE_KEY...
```

### Step 3: Verify the Key Works (2 minutes)

Run the diagnostic test:

```bash
cd /Users/mbrew/Developer/carnivore-weekly
node test-supabase-full.js
```

Look for this in the output:
```
TEST 2: SERVICE ROLE KEY (Admin/Migration Access)
Status: ✓ ACCESSIBLE
```

If you see "✓ ACCESSIBLE", you're good to proceed.

### Step 4: Create Database Tables (2-3 minutes)

You have two options:

#### Option A: Via Supabase Dashboard (Easiest)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select project `kwtdpvnjewtahuxjyltn`
3. Click **SQL Editor** in the left sidebar
4. Look for migration files in `/Users/mbrew/Developer/carnivore-weekly/migrations/`
5. Run each migration file:
   - `001_create_core_tables.sql`
   - `002_add_indexes.sql`
   - `003_create_rls_policies.sql`
   - `007_create_writer_memory_tables.sql`

Copy the contents of each file and paste into the SQL Editor, then click "Run".

#### Option B: Via Node Script

Make sure your service role key is valid (Step 3), then:

```bash
cd /Users/mbrew/Developer/carnivore-weekly
node execute_production_activation.js
```

This script will:
- Run all migrations
- Create all 5 tables
- Set up indexes
- Configure RLS policies
- Prepare the system for data seeding

### Step 5: Seed Test Writer Data (2 minutes)

Once the tables exist, add some test data:

```bash
cd /Users/mbrew/Developer/carnivore-weekly
node scripts/seed_writer_data.js
```

This will create:
- 9 test writers (Sarah, Marcus, Chloe, Eric, Quinn, Jordan, Casey, Alex, Sam)
- Voice profiles for each writer
- Sample memory log entries

---

## Verification: It's Working

Run this command to confirm everything is set up:

```bash
node test-supabase-connection.js
```

You should see:
```
✓ Connection successful

✓ Writers table accessible
  Total rows: 9
  Sample data:
    1. Sarah (sarah-chen)
    2. Marcus (marcus-rodriguez)
    3. Chloe (chloe-winters)
```

---

## Understanding the Errors You Saw

### Error 1: "Could not find the table 'public.writers'"
**What it means:** The writers table doesn't exist yet.
**Is it a problem?** No, this is expected. Just run the migrations.
**Is it an API key problem?** No, the anon key works fine.

### Error 2: "Invalid API key"
**What it means:** The service role JWT is being rejected by Supabase.
**Is it a problem?** Yes, this needs to be fixed.
**Is it expired?** Probably not (expires 2030), but might be revoked or never issued.
**Fix:** Get a fresh key from the Supabase Dashboard.

---

## API Key Reference

### Your Anon/Publishable Key
```
sb_publishable_bQlgBZ7Otay8D9AErt8daA_2lQI36jk
```
- **What it's for:** Client-side queries, frontend apps
- **Can it write?** No (unless RLS allows)
- **Status:** ✓ Valid and working
- **Action:** Keep it - don't change it

### Your Service Role Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **What it's for:** Server-side operations, database migrations
- **Can it write?** Yes (full access)
- **Status:** ✗ Invalid - needs replacement
- **Action:** Replace with fresh key from Dashboard

---

## Test Scripts Available

### Quick Connection Test
```bash
node test-supabase-connection.js
```
Tests if you can access the writers table and fetch data.

### Full Diagnostic Test
```bash
node test-supabase-full.js
```
Comprehensive test including:
- Both API keys
- All required tables
- Query performance
- RLS policies

### Seed Test Writers
```bash
node scripts/seed_writer_data.js
```
Creates 9 test writers with complete profiles.

### Generate Writer Prompts
```bash
node scripts/generate_agent_prompt.js sarah "weight loss"
```
Retrieves Sarah's profile and generates an optimized prompt.

---

## Troubleshooting

### "Still getting 'Invalid API key' error"

1. Double-check you copied the entire service_role key
2. Make sure you updated the correct line in .env
3. Save the .env file
4. Try again

### "Tables still not found after running migrations"

1. Verify the migrations ran without errors
2. Check in Supabase Dashboard > SQL Editor > Migrations
3. If migrations failed, check the error message
4. May need to fix the migration SQL

### "Can see tables but no writer data"

This is normal. Run:
```bash
node scripts/seed_writer_data.js
```

### "Can access tables but anon key doesn't work"

1. Make sure the tables were created with RLS policies enabled
2. The anon key should work for reading (if RLS allows)
3. Test with service role key first to verify data is there

---

## What Gets Created

### Tables (5 total)
- **writers** - Main writer profiles
- **writer_memory_log** - Lessons learned
- **writer_voice_snapshots** - Voice profiles
- **writer_content** - Writer's content pieces
- **writer_relationships** - Relationships between writers

### Test Writers (9 total)
1. **Sarah Chen** - Research specialist
2. **Marcus Rodriguez** - Community engagement expert
3. **Chloe Winters** - Video content strategist
4. **Eric Thompson** - Technical writer
5. **Quinn Patel** - Data analyst
6. **Jordan Kim** - Investigative journalist
7. **Casey Morgan** - Wellness advocate
8. **Alex Baker** - Emerging voice (social media)
9. **Sam Fletcher** - Multimedia editor

### Indexes & Security
- 15 performance indexes
- RLS policies on all tables
- Timestamp triggers
- Data partitioning

---

## Timeline

If you follow all steps:
- Step 1 (get key): 1 minute
- Step 2 (update .env): 1 minute
- Step 3 (verify): 1 minute
- Step 4 (migrations): 2-3 minutes
- Step 5 (seed data): 2 minutes
- Step 6 (verify): 1 minute

**Total: 8-11 minutes to full setup**

---

## Still Stuck?

Run the comprehensive diagnostic and check the output:

```bash
node test-supabase-full.js
```

Look for:
- **"Status: ✓ ACCESSIBLE"** under Service Role Key - means it's working
- **"Tables: 5/5"** in Database Schema Status - means everything is created
- **"Writers found: 9"** - means data is seeded

If you see anything marked with ✗, that's what needs to be fixed.

---

## Next Steps

1. ✅ Copy new service role key from Dashboard
2. ✅ Update .env file
3. ✅ Run `node test-supabase-full.js` to verify
4. ✅ Run migrations (via Dashboard or script)
5. ✅ Seed test data: `node scripts/seed_writer_data.js`
6. ✅ Verify: `node test-supabase-connection.js`

Once step 6 passes, your database is ready to use!

---

**Created:** December 31, 2025
**Project:** carnivore-weekly
**Supabase Project:** kwtdpvnjewtahuxjyltn
