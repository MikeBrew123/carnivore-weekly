# Phase 4: Database Migration Deployment Guide

**Status:** Ready for Deployment
**Date:** January 1, 2026
**Tables to Create:** 6 (writers, blog_posts, youtube_videos, weekly_analysis, wiki_video_links, topic_product_mapping)

---

## Quick Start (Recommended Method)

### Method 1: Supabase Dashboard (Easiest - No Tools Required)

**Time Required:** 3-5 minutes

#### Step 1: Open Supabase Dashboard
Go to: https://app.supabase.com/project/kwtdpvnjewtahuxjyltn/sql/editor

#### Step 2: Create New Query
- Click the **"New Query"** button (top right)
- Select **"Create new file"**
- Name: `create_content_tables`
- Click **Create**

#### Step 3: Copy Migration SQL
Open this file in your text editor:
```
/Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20250101140000_create_content_tables.sql
```

OR use the quick-reference backup file:
```
/Users/mbrew/Developer/carnivore-weekly/MIGRATION_READY.sql
```

Select all content (Ctrl+A / Cmd+A) and copy it.

#### Step 4: Paste into Dashboard
- In the Supabase SQL editor, paste the entire SQL content
- You should see 68 SQL statements

#### Step 5: Execute
- Click the **"Run"** button (top right of editor)
- Wait for execution (takes 10-30 seconds)

#### Step 6: Verify Success
After execution completes, run this verification query in a new query:

```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

You should see these 6 tables:
- blog_posts
- topic_product_mapping
- wiki_video_links
- writers
- weekly_analysis
- youtube_videos

---

## Alternative Methods

### Method 2: Supabase CLI (If You Have It Installed)

**Prerequisites:** Node.js, npm, Supabase CLI

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Link to your project
supabase link --project-ref kwtdpvnjewtahuxjyltn

# Deploy migrations
supabase db push --linked

# Check the output for "All migrations deployed successfully"
```

### Method 3: Direct PostgreSQL (Advanced)

If you have `psql` installed and can connect directly:

```bash
# Option A: Using connection string
export PGPASSWORD="[SUPABASE_SERVICE_ROLE_KEY]"
psql postgresql://postgres:PASSWORD@kwtdpvnjewtahuxjyltn.supabase.co:5432/postgres?sslmode=require \
  -f supabase/migrations/20250101140000_create_content_tables.sql

# Option B: Using connection parameters
psql -h kwtdpvnjewtahuxjyltn.supabase.co \
     -p 5432 \
     -U postgres \
     -d postgres \
     -f supabase/migrations/20250101140000_create_content_tables.sql
```

**Note:** You'll be prompted for password - use the value of `SUPABASE_SERVICE_ROLE_KEY` from your `.env` file.

---

## Troubleshooting

### Issue: "Column does not exist" errors
**Cause:** Partial deployment - some tables created, others failed
**Solution:**
1. Skip to "Clean Slate" below
2. Drop all tables
3. Re-run the migration

### Issue: "Table already exists" errors
**This is OK!** The migration uses `CREATE TABLE IF NOT EXISTS`
- The tables were already created successfully
- You can proceed to data migration

### Issue: "Relation does not exist"
**Cause:** Foreign key references a table that doesn't exist
**Solution:** Ensure all 6 tables are created (check Step 6 above)

### Issue: RLS Policy errors
**Cause:** Policies created before tables (shouldn't happen)
**Solution:** Drop policies and re-run migration (in Supabase dashboard, search for "policy" in SQL)

---

## What Gets Created

### 6 Tables with Full Schema

#### 1. writers
- Writer profiles with assignment rules
- 20+ rows for 9+ writers
- Fields: name, title, backstory, personality, skills, assignment_rules (JSONB)

#### 2. blog_posts
- Blog content with metadata
- 5-10 rows initially
- Fields: title, content (HTML), author (FK), tags, SEO, validation status

#### 3. youtube_videos
- YouTube video data with engagement metrics
- 50-200 rows
- Fields: video_id, title, channel, views, likes, engagement, analysis

#### 4. weekly_analysis
- Weekly insights and analysis
- 1 row per week
- Fields: summary, trending_topics, insights, sentiment, recommendations

#### 5. wiki_video_links
- Links between wiki topics and YouTube videos
- 50-100 rows
- Fields: topic, video_id (FK), relevance_score, notes

#### 6. topic_product_mapping
- Product recommendation mappings
- 20-50 rows
- Fields: topic, product_name, recommendation_type, when_to_recommend

---

## Security Features Deployed

✅ **Row Level Security (RLS)**
- Service role: Full access for migrations and data loading
- Anon: Read-only on public tables (blog_posts, youtube_videos, weekly_analysis)
- Authenticated: Future support for user-specific features

✅ **Data Integrity**
- Foreign key constraints prevent orphaned records
- Check constraints validate data (e.g., relevance_score 0-100)
- Unique constraints prevent duplicates
- Required fields marked NOT NULL

✅ **Performance**
- 20+ indexes on frequently queried fields
- Indexes on: foreign keys, dates, tags, relevance scores
- Query optimization for common patterns

✅ **Audit Trail**
- Auto-update triggers on all tables
- created_at and updated_at timestamps
- Track data changes automatically

---

## After Deployment

### 1. Verify Tables (2 minutes)

Run verification query from Step 6 above to confirm all 6 tables exist.

### 2. Run Data Migration (5-10 minutes)

```bash
cd /Users/mbrew/Developer/carnivore-weekly
node scripts/run_phase4_migration.js
```

This will:
- Load writers from personas.json
- Load blog posts from blog_posts.json
- Load YouTube videos from youtube_data.json
- Validate all data

### 3. Check Data (2 minutes)

In Supabase dashboard, run:

```sql
-- Check writers
SELECT COUNT(*) as writer_count FROM writers;
-- Expected: 9

-- Check blog posts
SELECT COUNT(*) as blog_count FROM blog_posts;
-- Expected: 5+

-- Check YouTube videos
SELECT COUNT(*) as video_count FROM youtube_videos;
-- Expected: 50-200
```

### 4. Update Application Code

Update Python and Node scripts to query Supabase instead of JSON files:
- `scripts/generate.py` → Use Supabase client
- `scripts/generate_newsletter.py` → Query weekly_analysis table
- API endpoints → Query appropriate tables

### 5. Archive JSON Files (Optional)

Once data migration is complete and verified:
```bash
# Backup JSON files (keep as reference)
mkdir -p data/backup
cp data/*.json data/backup/

# You can delete the original JSON files if space is needed
# But keep them for now as safety net
```

---

## Rollback Procedure (If Needed)

If something goes wrong, you can drop all tables and start over:

**In Supabase Dashboard > SQL Editor:**

```sql
-- Drop all migrated tables (careful!)
DROP TABLE IF EXISTS topic_product_mapping CASCADE;
DROP TABLE IF EXISTS wiki_video_links CASCADE;
DROP TABLE IF EXISTS youtube_videos CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS weekly_analysis CASCADE;
DROP TABLE IF EXISTS writers CASCADE;

-- Check that all tables are gone
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- Should only show report system tables (user_sessions, generated_reports, report_access_log)
```

Then re-run the migration from Step 1.

---

## Expected Results

After successful deployment, you should have:

✅ **6 new tables** created with all indexes
✅ **RLS policies** active on all tables
✅ **Triggers** for auto-updating timestamps
✅ **Constraints** validating data integrity
✅ **Foreign keys** linking tables together
✅ **No errors** during execution
✅ **Verification query** showing all 6 tables

---

## Support & Questions

If you encounter issues:

1. **Check error message** - Copy the full error
2. **Review "Troubleshooting" section** above
3. **Verify credentials** - Check .env file has correct values
4. **Check firewall** - Ensure your IP is allowed in Supabase
5. **Try clean slate** - Drop tables and re-run migration

---

## Timeline

| Step | Action | Time |
|------|--------|------|
| 1 | Deploy migrations | 5 min |
| 2 | Verify tables created | 2 min |
| 3 | Run data migration | 10 min |
| 4 | Validate data integrity | 2 min |
| 5 | Update application code | 30 min |
| **Total** | **Complete Phase 4** | **~50 min** |

---

## Next Phase (Phase 5)

Once Phase 4 is complete, you can start Phase 5:
- **Real-time Analytics Dashboards**
- Subscribe to table changes using Supabase Realtime
- Build live update features
- Monitor data in real-time

---

**Created:** January 1, 2026
**Project:** Carnivore Weekly
**Status:** Ready for Deployment

