# Correct Supabase SQL Editor Access

## ✅ Method 1: Direct Dashboard Link (Correct)

Go to the main Supabase dashboard first:
**https://app.supabase.com**

Then:
1. Click on your project: **kwtdpvnjewtahuxjyltn** (or select from list)
2. Once inside the project, click **SQL Editor** in the left sidebar
3. Click **New Query** button
4. Create a new file

## ✅ Method 2: If You're Already Logged In

Direct link that should work:
**https://app.supabase.com/project/kwtdpvnjewtahuxjyltn**

Then click: **SQL Editor** (left sidebar)

## ✅ Method 3: Copy-Paste Approach (Safest)

1. Go to: https://app.supabase.com
2. Log in if needed
3. Look for project **kwtdpvnjewtahuxjyltn** in the list
4. Click it
5. Left sidebar → **SQL Editor**
6. **New Query** → **Create new file**
7. Name: `create_content_tables`

## Next: Copy the Migration SQL

Once you're in the SQL Editor:

**Option A: Copy from file directly**
```
File: /Users/mbrew/Developer/carnivore-weekly/supabase/migrations/20250101140000_create_content_tables.sql
```

**Option B: Use the backup file**
```
File: /Users/mbrew/Developer/carnivore-weekly/MIGRATION_READY.sql
```

Open either file, select all (Cmd+A), copy (Cmd+C)

## Then: Paste and Run

1. In Supabase SQL Editor, paste the SQL (Cmd+V)
2. Click **Run** button (top right)
3. Wait for execution (10-30 seconds)

## Verify Success

After execution, run this verification query:

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

**Problem?** Try this:
1. Completely close browser/Supabase tab
2. Clear browser cache
3. Go to: https://app.supabase.com (fresh login)
4. Select your project
5. Go to SQL Editor
