#!/usr/bin/env python3
"""
Save Marcus's test article to Supabase writer_content table
"""

import os
from supabase import create_client, Client
from datetime import datetime

# Initialize Supabase client
url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

# Read article content
with open("/tmp/marcus_strength_training_article.html") as f:
    article_html = f.read()

# Get Marcus's writer_id
writer_result = supabase.table("writers").select("id").eq("slug", "marcus").execute()
if not writer_result.data:
    print("❌ Marcus not found in writers table")
    exit(1)

marcus_id = writer_result.data[0]["id"]

# Calculate word count
word_count = len(article_html.split())

# Insert article
insert_data = {
    "writer_id": marcus_id,
    "title": "Carnivore Strength Training: Why You Don't Need Carbs to Build Muscle",
    "content_type": "blog",
    "word_count": word_count,
    "reading_time_minutes": max(1, word_count // 200),
    "key_themes": ["strength-training", "muscle-building", "performance", "protocol", "fitness"],
    "published_at": datetime.now().isoformat()
}

result = supabase.table("writer_content").insert(insert_data).execute()

if result.data:
    print(f"✅ Marcus's article saved to Supabase")
    print(f"   Title: {insert_data['title']}")
    print(f"   Word count: {insert_data['word_count']}")
    print(f"   Themes: {', '.join(insert_data['key_themes'])}")
else:
    print(f"❌ Failed to save article")
