#!/usr/bin/env python3
"""Fix title + meta description for adaptation timeline post (CTR optimization)"""
import json

BLOG_JSON = "/Users/mbrew/Developer/carnivore-weekly/data/blog_posts.json"
TARGET_SLUG = "2026-02-08-adaptation-timeline"

with open(BLOG_JSON, "r") as f:
    data = json.load(f)

for post in data["blog_posts"]:
    if post["slug"] == TARGET_SLUG:
        old_title = post["title"]
        old_meta = post["seo"].get("meta_description", "")

        post["title"] = "Carnivore Adaptation Timeline: Week-by-Week Symptoms & Fixes"
        post["seo"]["meta_description"] = "Week 1: fatigue and cravings. Week 3: energy returns. Week 6: fat-adapted. The complete carnivore adaptation timeline with what to do when each symptom hits."

        print(f"OLD title: {old_title}")
        print(f"NEW title: {post['title']}")
        print(f"OLD meta:  {old_meta}")
        print(f"NEW meta:  {post['seo']['meta_description']}")
        print(f"Title length: {len(post['title'])} chars")
        print(f"Meta length:  {len(post['seo']['meta_description'])} chars")
        break
else:
    print("❌ Post not found!")
    exit(1)

with open(BLOG_JSON, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("✅ Updated!")
