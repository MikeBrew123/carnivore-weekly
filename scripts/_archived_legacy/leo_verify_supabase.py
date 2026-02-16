#!/usr/bin/env python3
"""
Leo: Verify Supabase Writer System Health
Comprehensive check of all writer-related tables
"""

import os
import json
from supabase import create_client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

print("=" * 100)
print("LEO'S SUPABASE VERIFICATION REPORT")
print("=" * 100)
print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print()

# 1. WRITERS TABLE
print("1. WRITERS TABLE (Core Personas)")
print("-" * 100)
try:
    result = supabase.table("writers").select("*").execute()
    if result.data:
        print(f"✅ Found {len(result.data)} writers\n")
        for writer in result.data:
            print(f"SLUG: {writer['slug']}")
            print(f"  Name: {writer['name']}")
            print(f"  Role: {writer['role_title']}")
            print(f"  Tagline: {writer['tagline']}")
            print(f"  Tone: {writer['tone_style']}")
            print(f"  Active: {writer['is_active']}")
            print(f"  Preferred Topics: {writer.get('preferred_topics', [])}")

            # Show voice_formula if exists
            if writer.get('voice_formula'):
                vf = writer['voice_formula']
                print(f"  Voice Formula:")
                print(f"    - Tone: {vf.get('tone', 'N/A')}")
                print(f"    - Signature Phrases: {vf.get('signature_phrases', [])[:3]}")
                print(f"    - Writing Principles: {len(vf.get('writing_principles', []))} rules")
            print()
    else:
        print("❌ No writers found")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# 2. WRITER MEMORY LOG
print("2. WRITER_MEMORY_LOG TABLE (Lessons & Patterns)")
print("-" * 100)
try:
    result = supabase.table("writer_memory_log").select("*").order("created_at", desc=True).execute()
    if result.data:
        print(f"✅ Found {len(result.data)} memory entries\n")

        # Group by writer
        writers_result = supabase.table("writers").select("id, slug").execute()
        writer_map = {w['id']: w['slug'] for w in writers_result.data}

        for entry in result.data:
            writer_slug = writer_map.get(entry['writer_id'], 'unknown')
            print(f"[{writer_slug.upper()}] {entry['memory_type']}: {entry['title']}")
            print(f"  Description: {entry['description'][:100]}...")
            print(f"  Tags: {entry.get('tags', [])}")
            print(f"  Relevance: {entry.get('relevance_score', 'N/A')}")
            print(f"  Impact: {entry.get('impact_category', 'N/A')}")
            print(f"  Status: {entry.get('implementation_status', 'N/A')}")
            print(f"  Created: {entry['created_at'][:10]}")
            print()
    else:
        print("⚠️  No memory entries found")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# 3. WRITER CONTENT TABLE
print("3. WRITER_CONTENT TABLE (Historical Articles)")
print("-" * 100)
try:
    result = supabase.table("writer_content").select("*").execute()
    count = len(result.data) if result.data else 0
    print(f"Current count: {count} rows")

    if count == 0:
        print("⚠️  Table is empty - needs backfill from published blog posts")
        print("   This is expected for initial setup")
    else:
        print(f"✅ Found {count} content entries")
        for entry in result.data[:5]:
            print(f"  - {entry.get('title', 'N/A')} ({entry.get('content_type', 'N/A')})")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# 4. WRITER RELATIONSHIPS TABLE
print("4. WRITER_RELATIONSHIPS TABLE (Collaboration Patterns)")
print("-" * 100)
try:
    result = supabase.table("writer_relationships").select("*").execute()
    count = len(result.data) if result.data else 0
    print(f"Current count: {count} rows")

    if count == 0:
        print("⚠️  No relationships defined yet (optional)")
    else:
        print(f"✅ Found {count} relationships")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# 5. WRITER VOICE SNAPSHOTS TABLE
print("5. WRITER_VOICE_SNAPSHOTS TABLE (Voice Evolution)")
print("-" * 100)
try:
    result = supabase.table("writer_voice_snapshots").select("*").execute()
    count = len(result.data) if result.data else 0
    print(f"Current count: {count} rows")

    if count == 0:
        print("⚠️  No snapshots yet (optional)")
    else:
        print(f"✅ Found {count} snapshots")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# 6. BLOG_POSTS TABLE
print("6. BLOG_POSTS TABLE (Published Content)")
print("-" * 100)
try:
    result = supabase.table("blog_posts").select("slug, title, author_id, published_date, is_published").order("published_date", desc=True).limit(10).execute()
    if result.data:
        print(f"✅ Found {len(result.data)} blog posts (showing last 10)\n")
        for post in result.data:
            print(f"  - {post['slug']}")
            print(f"    Title: {post['title'][:60]}")
            print(f"    Published: {post['published_date'][:10]}, Status: {'Published' if post['is_published'] else 'Draft'}")
            print()
    else:
        print("⚠️  No blog posts found")
except Exception as e:
    print(f"❌ Error: {e}")

print()

# 7. TABLE SCHEMA CHECK
print("7. SCHEMA VERIFICATION")
print("-" * 100)
tables_to_check = [
    "writers",
    "writer_memory_log",
    "writer_content",
    "writer_relationships",
    "writer_voice_snapshots",
    "blog_posts"
]

for table in tables_to_check:
    try:
        result = supabase.table(table).select("*", count="exact").limit(0).execute()
        count = result.count if hasattr(result, 'count') else 0
        print(f"  ✅ {table}: Schema exists, {count} rows")
    except Exception as e:
        print(f"  ❌ {table}: {e}")

print()
print("=" * 100)
print("VERIFICATION COMPLETE")
print("=" * 100)
