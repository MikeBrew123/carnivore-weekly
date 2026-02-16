#!/usr/bin/env python3
"""
Save Chloe's test article to Supabase writer_content table
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# Read article content
with open("/tmp/chloe_seed_oils_article.html") as f:
    article_html = f.read()

# Get Chloe's writer_id
writer_result = supabase.table("writers").select("id").eq("slug", "chloe").execute()
if not writer_result.data:
    print("❌ Chloe not found in writers table")
    exit(1)

chloe_id = writer_result.data[0]["id"]

# Calculate word count
word_count = len(article_html.split())

# Insert article
insert_data = {
    "writer_id": chloe_id,
    "title": "Carnivore Reddit Drama: Why Everyone's Arguing About Seed Oils This Week",
    "content_type": "blog",
    "word_count": 1050,
    "reading_time_minutes": max(1, 1050 // 200),
    "key_themes": ["community", "seed-oils", "trending", "reddit", "controversy"],
    "published_at": datetime.now().isoformat()
}

result = supabase.table("writer_content").insert(insert_data).execute()

if result.data:
    print(f"✅ Chloe's article saved to Supabase")
    print(f"   Title: {insert_data['title']}")
    print(f"   Word count: {insert_data['word_count']}")
    print(f"   Themes: {', '.join(insert_data['key_themes'])}")
else:
    print(f"❌ Failed to save article")
