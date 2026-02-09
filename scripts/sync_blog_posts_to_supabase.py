#!/usr/bin/env python3
"""
Sync blog_posts.json to Supabase blog_posts table.

Ensures Supabase always has correct slugs and dates for all blog posts.
Run this after any changes to blog_posts.json or as part of weekly automation.

Usage:
    python3 scripts/sync_blog_posts_to_supabase.py
"""

import json
import sys
from pathlib import Path
from supabase import create_client


def sync_blog_posts():
    """Sync blog_posts.json to Supabase."""

    # Category mapping: JSON categories → Supabase categories
    # Valid Supabase categories: health, protocol, community, strategy, news, featured
    category_map = {
        "lifestyle": "community",
        "fitness": "protocol",
        "science": "health",
        "nutrition": "health",
        "getting-started": "protocol",
        "protocols": "protocol",
        "research": "health",
        "guides": "protocol",
        # Already valid categories
        "health": "health",
        "protocol": "protocol",
        "community": "community",
        "strategy": "strategy",
        "news": "news",
        "featured": "featured",
    }

    # Setup paths
    project_root = Path(__file__).parent.parent
    secrets_path = project_root / "secrets" / "api-keys.json"
    blog_json_path = project_root / "data" / "blog_posts.json"

    # Read Supabase credentials
    try:
        with open(secrets_path) as f:
            keys = json.load(f)["supabase"]
    except Exception as e:
        print(f"❌ Could not read Supabase credentials: {e}")
        return False

    # Read blog posts JSON
    try:
        with open(blog_json_path) as f:
            blog_data = json.load(f)
            json_posts = blog_data.get("blog_posts", [])
    except Exception as e:
        print(f"❌ Could not read blog_posts.json: {e}")
        return False

    print(f"📚 Syncing {len(json_posts)} blog posts to Supabase...")

    # Initialize Supabase client
    try:
        client = create_client(keys["url"], keys["service_role_key"])
    except Exception as e:
        print(f"❌ Could not connect to Supabase: {e}")
        return False

    # Get all existing posts from Supabase
    try:
        response = client.table("blog_posts").select("id, slug, title, published_date, author_id").execute()
        supabase_posts_by_title = {post["title"]: post for post in response.data}
        supabase_posts_by_slug = {post["slug"]: post for post in response.data}
    except Exception as e:
        print(f"❌ Could not fetch existing posts from Supabase: {e}")
        return False

    updated_count = 0
    inserted_count = 0
    skipped_count = 0
    error_count = 0

    for json_post in json_posts:
        title = json_post.get("title")
        correct_slug = json_post.get("slug")

        if not title or not correct_slug:
            print(f"  ⚠️  Skipping post with missing title or slug")
            skipped_count += 1
            continue

        # Extract date from slug (format: YYYY-MM-DD-title)
        slug_parts = correct_slug.split("-")
        if len(slug_parts) >= 3:
            try:
                # Validate that first 3 parts are numeric
                year = int(slug_parts[0])
                month = int(slug_parts[1])
                day = int(slug_parts[2])
                if 2020 <= year <= 2030 and 1 <= month <= 12 and 1 <= day <= 31:
                    published_date = f"{slug_parts[0]}-{slug_parts[1]}-{slug_parts[2]}"
                else:
                    published_date = json_post.get("date", "2025-01-01")
            except (ValueError, IndexError):
                published_date = json_post.get("date", "2025-01-01")
        else:
            published_date = json_post.get("date", "2025-01-01")

        # Check if post exists (by title or slug)
        existing_post = supabase_posts_by_title.get(title) or supabase_posts_by_slug.get(
            correct_slug
        )

        if existing_post:
            # Map author slug to author_id
            author_slug = json_post.get("author", "")
            author_map = {"sarah": 1, "marcus": 2, "chloe": 3, "casey": 4}
            correct_author_id = author_map.get(author_slug)

            # Update if slug, date, or author_id changed
            current_slug = existing_post["slug"]
            current_date = existing_post["published_date"]
            current_author_id = existing_post.get("author_id")

            if (current_slug != correct_slug or
                current_date != published_date or
                current_author_id != correct_author_id):
                try:
                    update_data = {
                        "slug": correct_slug,
                        "published_date": published_date,
                    }
                    if correct_author_id:
                        update_data["author_id"] = correct_author_id

                    client.table("blog_posts").update(update_data).eq("id", existing_post["id"]).execute()

                    print(f"  ✓ Updated: {title[:50]}...")
                    if current_author_id != correct_author_id:
                        print(f"    author_id: {current_author_id} → {correct_author_id}")
                    updated_count += 1
                except Exception as e:
                    print(f"  ❌ Error updating {title[:50]}: {e}")
                    error_count += 1
            else:
                # Already correct
                skipped_count += 1
        else:
            # Insert new post
            try:
                # Map category to valid Supabase category
                json_category = json_post.get("category", "community")
                mapped_category = category_map.get(json_category, "community")

                # Get content from JSON (if exists)
                content = json_post.get("content", "")

                # GUARD: Never publish posts with empty content
                is_published = json_post.get("published", True)
                if (not content or content.strip() == "") and is_published:
                    print(f"  ⚠️  WARNING: {title[:50]}... has empty content - forcing is_published=False")
                    is_published = False

                # Map author slug to author_id
                author_slug = json_post.get("author", "")
                author_map = {"sarah": 1, "marcus": 2, "chloe": 3, "casey": 4}
                author_id = author_map.get(author_slug)

                # Prepare minimal insert data
                insert_data = {
                    "slug": correct_slug,
                    "title": title,
                    "published_date": published_date,
                    "excerpt": json_post.get("excerpt", ""),
                    "category": mapped_category,
                    "tags": json_post.get("tags", []),
                    "is_published": is_published,
                    "content": content if content else "",  # Empty string for NOT NULL constraint
                }

                # Add author_id if valid
                if author_id:
                    insert_data["author_id"] = author_id

                # Use upsert to handle duplicates gracefully
                client.table("blog_posts").upsert(insert_data, on_conflict="slug").execute()
                print(f"  ✓ Inserted: {title[:50]}...")
                inserted_count += 1
            except Exception as e:
                print(f"  ❌ Error upserting {title[:50]}: {e}")
                error_count += 1

    # Summary
    print("")
    print("=" * 70)
    print("✅ BLOG POST SYNC COMPLETE")
    print("=" * 70)
    print(f"  Updated: {updated_count}")
    print(f"  Inserted: {inserted_count}")
    print(f"  Skipped (already correct): {skipped_count}")
    print(f"  Errors: {error_count}")
    print("")

    if error_count > 0:
        print("⚠️  Some errors occurred during sync. Check output above.")
        print("   (Non-fatal - continuing with weekly automation)")

    # Always return True unless ALL operations failed
    return (inserted_count + updated_count + skipped_count) > 0


if __name__ == "__main__":
    success = sync_blog_posts()
    sys.exit(0 if success else 1)
