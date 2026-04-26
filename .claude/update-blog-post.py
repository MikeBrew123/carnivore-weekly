#!/usr/bin/env python3
"""Remove duplicate and update calculator hype post in blog_posts.json"""
import json

BLOG_JSON = "/Users/mbrew/Developer/carnivore-weekly/data/blog_posts.json"
CONTENT_FILE = "/Users/mbrew/Developer/carnivore-weekly/.claude/temp-blog-content.html"
TARGET_SLUG = "2026-02-26-best-macro-calculator-carnivore-keto-low-carb"

# Read the updated content HTML
with open(CONTENT_FILE, "r") as f:
    content = f.read().strip()

# Load blog_posts.json
with open(BLOG_JSON, "r") as f:
    data = json.load(f)

# Remove ALL entries with this slug
data["blog_posts"] = [p for p in data["blog_posts"] if p["slug"] != TARGET_SLUG]

# Build the updated post entry
new_post = {
    "slug": TARGET_SLUG,
    "title": "The Only Macro Calculator for Carnivore, Keto & Low-Carb",
    "author": "team",
    "author_title": "Carnivore Weekly Team",
    "date": "2026-02-26",
    "scheduled_date": "2026-02-26",
    "published": True,
    "status": "published",
    "publish_date": "2026-02-26",
    "category": "nutrition",
    "tags": [
        "calculator", "macros", "keto", "carnivore",
        "low-carb", "protein", "electrolytes", "meal plan"
    ],
    "excerpt": "Generic macro calculators assume you eat carbs. If you don't, every number is wrong. Three writers tested the only calculator built for carnivore, keto, and low-carb diets.",
    "wiki_links": [],
    "related_posts": [
        "2026-02-10-carnivore-vs-keto",
        "2026-02-09-how-much-protein-carnivore",
        "2026-02-09-carnivore-weight-loss-results",
        "2026-02-09-carnivore-meal-plan-complete-guide"
    ],
    "sponsor_callout": None,
    "seo": {
        "meta_description": "The only macro calculator built for carnivore, keto, and low-carb diets. Free personalized protein, fat, calorie, and electrolyte targets in 90 seconds.",
        "keywords": [
            "carnivore macro calculator", "keto macro calculator",
            "carnivore diet calculator", "low carb macro calculator",
            "carnivore diet meal plan", "keto calorie calculator",
            "carnivore protein calculator", "best keto calculator for weight loss",
            "how to calculate macros on carnivore"
        ]
    },
    "validation": {},
    "content": content
}

# Prepend to array
data["blog_posts"].insert(0, new_post)

# Write back
with open(BLOG_JSON, "w") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"✅ Updated post (removed duplicates, re-added). Total posts: {len(data['blog_posts'])}")
