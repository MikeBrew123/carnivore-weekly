#!/usr/bin/env python3
"""
Leo: Backfill writer_content table from existing blog posts
Maps published blog posts to writer_content table so writers can reference their past work
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime
from pathlib import Path

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

PROJECT_ROOT = Path(__file__).parent.parent
BLOG_POSTS_FILE = PROJECT_ROOT / "data" / "blog_posts.json"

print("=" * 100)
print("LEO: BACKFILL WRITER_CONTENT TABLE")
print("=" * 100)
print()

# Step 1: Get writer IDs
print("Step 1: Fetching writer IDs...")
writers_result = supabase.table("writers").select("id, slug").execute()
writer_map = {w['slug']: w['id'] for w in writers_result.data}
print(f"✅ Found {len(writer_map)} writers: {list(writer_map.keys())}")
print()

# Step 2: Load blog_posts.json
print("Step 2: Loading blog_posts.json...")
if not BLOG_POSTS_FILE.exists():
    print(f"❌ File not found: {BLOG_POSTS_FILE}")
    exit(1)

with open(BLOG_POSTS_FILE, 'r') as f:
    blog_data = json.load(f)

posts = blog_data.get("blog_posts", [])
print(f"✅ Found {len(posts)} posts in blog_posts.json")
print()

# Step 3: Filter posts with actual content
print("Step 3: Filtering posts with content...")
posts_with_content = []
for post in posts:
    content = post.get("content", "")
    if content and content.strip() and len(content) > 100:
        posts_with_content.append(post)

print(f"✅ Found {len(posts_with_content)} posts with substantial content (>100 chars)")
print()

# Step 4: Insert into writer_content table
print("Step 4: Inserting into writer_content table...")
print("-" * 100)

inserted_count = 0
skipped_count = 0
error_count = 0

for post in posts_with_content:
    title = post.get("title", "Untitled")
    author_slug = post.get("author", "marcus").lower()
    slug = post.get("slug", "")
    content = post.get("content", "")
    published_date = post.get("date", post.get("scheduled_date", ""))
    tags = post.get("tags", [])
    category = post.get("category", "general")

    # Get writer_id
    writer_id = writer_map.get(author_slug)
    if not writer_id:
        print(f"⚠️  Skipping {slug}: Unknown author '{author_slug}'")
        skipped_count += 1
        continue

    # Calculate metrics
    word_count = len(content.split())
    reading_time = max(1, word_count // 200)  # ~200 words per minute

    # Prepare insert data
    insert_data = {
        "writer_id": writer_id,
        "title": title,
        "content_type": "blog",
        "word_count": word_count,
        "reading_time_minutes": reading_time,
        "tone_applied": post.get("author_title", "").lower(),
        "key_themes": tags,
        "published_at": published_date if published_date else None,
        "engagement_metrics": {
            "source": "backfill",
            "category": category,
            "slug": slug
        }
    }

    try:
        supabase.table("writer_content").insert(insert_data).execute()
        print(f"  ✅ Inserted: {title[:60]}")
        print(f"     Author: {author_slug}, Words: {word_count}, Date: {published_date}")
        inserted_count += 1
    except Exception as e:
        print(f"  ❌ Error inserting {title[:60]}: {e}")
        error_count += 1

print()
print("-" * 100)
print("BACKFILL SUMMARY")
print("-" * 100)
print(f"  Total posts processed: {len(posts_with_content)}")
print(f"  ✅ Successfully inserted: {inserted_count}")
print(f"  ⏭️  Skipped: {skipped_count}")
print(f"  ❌ Errors: {error_count}")
print()

# Step 5: Verify backfill
print("Step 5: Verifying backfill...")
result = supabase.table("writer_content").select("id", count="exact").execute()
total_count = result.count if hasattr(result, 'count') else len(result.data)
print(f"✅ writer_content table now has {total_count} rows")

# Show breakdown by writer
for slug, writer_id in writer_map.items():
    result = supabase.table("writer_content").select("id", count="exact").eq("writer_id", writer_id).execute()
    count = result.count if hasattr(result, 'count') else len(result.data)
    print(f"   - {slug}: {count} articles")

print()
print("=" * 100)
print("BACKFILL COMPLETE")
print("=" * 100)
