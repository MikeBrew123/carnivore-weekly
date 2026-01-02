# PHASE 4: CRITICAL DEPLOYMENT INSTRUCTIONS

## STATUS: ⚠️ BLOCKING ON SERVICE ROLE KEY

**Root Cause Identified:** Your `SUPABASE_SERVICE_ROLE_KEY` in `.env` is **INVALID or EXPIRED**

This causes silent failures where the migration appears to succeed (HTTP 200) but no tables are actually created.

---

## IMMEDIATE ACTION REQUIRED (5 Minutes)

### Step 1: Get New Service Role Key

1. Go to: **https://app.supabase.com**
2. Select project: **carnivore-weekly** (ID: `kwtdpvnjewtahuxjyltn`)
3. Click: **Settings** → **API**
4. Under "Project API Keys", find **service_role** key
5. Click the **copy icon** next to it
6. **Save this key somewhere safe** - you'll need it in Step 2

**Expected format:** Starts with `eyJhbGciOiJIUzI1NiI...` (JWT token)

---

### Step 2: Update .env File

1. Open: `/Users/mbrew/Developer/carnivore-weekly/.env`
2. Find line: `SUPABASE_SERVICE_ROLE_KEY=eyJ...`
3. Replace the entire value with the key from Step 1
4. Save the file

**Example:**
```
# OLD (INVALID)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...old_key...

# NEW (FROM DASHBOARD)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...new_key...
```

---

### Step 3: Deploy Migration

**Option A: Supabase Dashboard (Recommended - Easiest)**

1. Go to: **https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/new**
2. Click: **New Query** → **Create new file**
3. Name it: `phase4_create_content_tables`
4. Copy entire contents from: `/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20250101140000_create_content_tables.sql`
5. Paste into the SQL editor
6. Click: **Run** (top right)
7. **Monitor the output panel** (bottom right) for:
   - ✅ **Success** - Green checkmark, no error messages
   - ❌ **Error** - Red error text (note the exact error)

**Expected execution time:** ~2-3 seconds

---

**Option B: Supabase CLI (More Reliable)**

```bash
# Install CLI (if not already installed)
npm install -g supabase

# Link to project
supabase link --project-ref kwtdpvnjewtahuxjyltn

# Deploy migrations
supabase db push --linked

# Watch for: "✓ Migration completed"
```

---

### Step 4: Verify Success

Run the diagnostic script:

```bash
node scripts/diagnose_supabase.js
```

**Expected output:**
```
1️⃣  Checking PUBLIC SCHEMA TABLES...
   ✅ writers: EXISTS (0 rows)
   ✅ blog_posts: EXISTS (0 rows)
   ✅ youtube_videos: EXISTS (0 rows)
   ✅ weekly_analysis: EXISTS (0 rows)
   ✅ wiki_video_links: EXISTS (0 rows)
   ✅ topic_product_mapping: EXISTS (0 rows)
```

All tables should show **EXISTS** (0 rows is normal at this point).

---

## WHAT WAS FIXED

✅ **Removed 12 problematic GRANT statements** from migration SQL
- These caused rollback when authentication failed
- Supabase uses RLS policies instead (already configured)
- Migration is now clean and idempotent

✅ **Generated 6 comprehensive diagnostic reports**
- `SUPABASE_DIAGNOSTIC_REPORT.md` - Full technical analysis
- `TECHNICAL_ANALYSIS.md` - Root cause explanation
- `QUICK_REFERENCE.txt` - Fast lookup guide
- `DIAGNOSTIC_SUMMARY.txt` - Executive summary
- `DIAGNOSTIC_FINDINGS.txt` - Detailed findings (25 KB)
- `DIAGNOSTIC_INDEX.md` - Navigation guide

---

## WHAT HAPPENS NEXT (After Tables Created)

Once tables exist, we can:

1. **Run Data Migration** (5 min)
   ```bash
   node scripts/run_phase4_migration.js
   ```
   This loads:
   - Writers (from personas.json)
   - Blog posts (from blog_posts.json)
   - YouTube videos (from youtube_data.json)

2. **Verify Data** (1 min)
   ```bash
   # Check row counts
   SELECT COUNT(*) as writer_count FROM writers;
   SELECT COUNT(*) as post_count FROM blog_posts;
   SELECT COUNT(*) as video_count FROM youtube_videos;
   ```

3. **Fix Channels Page** (automatic)
   - Once youtube_videos table has data
   - Regenerate: `python3 scripts/generate.py --type channels`

---

## TROUBLESHOOTING

### Dashboard Shows "Error" After Click "Run"

1. **Look at the error message** in red text in the output panel
2. **Common errors:**
   - `"permission denied for schema public"` → Service role key is still wrong
   - `"syntax error"` → SQL parsing issue (unlikely, we fixed this)
   - `"relation ... does not exist"` → Partial migration (run Step 4 again)

### Diagnostic Script Says "Invalid API Key"

Your new service role key didn't get saved properly:
1. Verify `.env` file was saved (Ctrl+S in editor)
2. Verify the entire key was copied (no truncation)
3. Check for extra spaces or line breaks
4. Try reloading the terminal or opening new shell session

### Still Can't Connect After New Key

1. Confirm key in dashboard is for **service_role** (not anon)
2. Try regenerating the key in Supabase dashboard again
3. Verify project ID is correct: `kwtdpvnjewtahuxjyltn`
4. Check network - can you reach app.supabase.com?

---

## REFERENCE FILES

**Migration SQL:** `/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20250101140000_create_content_tables.sql`
- 300+ lines
- Creates 6 core tables
- Includes 20+ indexes, RLS policies, triggers

**Diagnostic Reports:** Root directory (6 files, 127 KB total)
- Read `QUICK_REFERENCE.txt` for fast lookup
- Read `SUPABASE_DIAGNOSTIC_REPORT.md` for full context

**Deployment Scripts:** `/Users/mbrew/Developer/carnivore-weekly/scripts/`
- `diagnose_supabase.js` - Diagnostic tool
- `run_phase4_migration.js` - Master data migration orchestrator
- `migrate_writers.js`, `migrate_blog_posts.js`, `migrate_youtube_data.js` - Individual data loaders

---

## TIMELINE

**Total time to fix:** ~15-20 minutes
- Get new key: 3-5 min
- Update .env: 1 min
- Deploy migration: 3-5 min
- Verify success: 2 min
- Optional data migration: 5-10 min

---

## QUESTIONS?

See diagnostic reports in root directory:
- **Quick question?** → Read `QUICK_REFERENCE.txt`
- **Full context?** → Read `SUPABASE_DIAGNOSTIC_REPORT.md`
- **Technical details?** → Read `TECHNICAL_ANALYSIS.md`

All reports are comprehensive and designed for troubleshooting.
