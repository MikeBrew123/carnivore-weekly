#!/usr/bin/env python3
"""
Audit Writer System - Check Supabase data
Quick audit script to check what data exists in writer tables
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env file
load_dotenv()

# Load Supabase credentials from environment
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    print("❌ ERROR: Missing Supabase credentials")
    print("   Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

# Create Supabase client
supabase: Client = create_client(supabase_url, supabase_key)

print("=" * 80)
print("WRITER SYSTEM AUDIT")
print("=" * 80)
print()

# Check 1: Writers table
print("1. WRITERS TABLE")
print("-" * 80)
try:
    result = supabase.table("writers").select("slug, name, role_title, tone_style, is_active").execute()
    if result.data:
        print(f"✅ Found {len(result.data)} writers:")
        for writer in result.data:
            print(f"   - {writer['slug']}: {writer['name']} ({writer['role_title']}) - Active: {writer['is_active']}")
    else:
        print("⚠️  No writers found in table")
except Exception as e:
    print(f"❌ Error querying writers table: {e}")

print()

# Check 2: Writer Memory Log
print("2. WRITER_MEMORY_LOG TABLE")
print("-" * 80)
try:
    result = supabase.table("writer_memory_log").select("id, writer_id, memory_type, title, created_at").order("created_at", desc=True).limit(10).execute()
    if result.data:
        print(f"✅ Found {len(result.data)} memory entries (showing last 10):")
        for entry in result.data:
            print(f"   - {entry['memory_type']}: {entry['title'][:60]}")
    else:
        print("⚠️  No memory entries found")
except Exception as e:
    print(f"❌ Error querying writer_memory_log: {e}")

print()

# Check 3: Published Content
print("3. PUBLISHED_CONTENT TABLE")
print("-" * 80)
try:
    result = supabase.table("published_content").select("slug, title, writer_slug, published_date").order("published_date", desc=True).limit(10).execute()
    if result.data:
        print(f"✅ Found {len(result.data)} published posts (showing last 10):")
        for post in result.data:
            print(f"   - {post['writer_slug']}: {post['title'][:60]}")
    else:
        print("⚠️  No published content found")
except Exception as e:
    print(f"❌ Error querying published_content: {e}")

print()

# Check 4: Writer Content
print("4. WRITER_CONTENT TABLE")
print("-" * 80)
try:
    result = supabase.table("writer_content").select("id, writer_id, title, content_type, published_at").order("published_at", desc=True).limit(10).execute()
    if result.data:
        print(f"✅ Found {len(result.data)} content entries (showing last 10):")
        for content in result.data:
            print(f"   - {content['content_type']}: {content['title'][:60]}")
    else:
        print("⚠️  No content entries found")
except Exception as e:
    print(f"❌ Error querying writer_content: {e}")

print()

# Check 5: Row counts
print("5. ROW COUNTS")
print("-" * 80)
tables = ["writers", "writer_memory_log", "writer_content", "published_content", "writer_relationships", "writer_voice_snapshots"]
for table in tables:
    try:
        result = supabase.table(table).select("id", count="exact").execute()
        count = result.count if hasattr(result, 'count') else len(result.data)
        print(f"   {table}: {count} rows")
    except Exception as e:
        print(f"   {table}: ❌ Error - {e}")

print()
print("=" * 80)
print("AUDIT COMPLETE")
print("=" * 80)
