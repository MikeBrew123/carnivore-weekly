#!/usr/bin/env python3
"""
Sync blog_posts.json to Supabase blog_posts table.

Ensures Supabase always has correct slugs and dates for all blog posts.
Run this after any changes to blog_posts.json or as part of weekly automation.

Usage:
    python3 scripts/sync_blog_posts_to_supabase.py [--dry-run]

--dry-run reports what would change without writing to Supabase.
"""

import json
import sys
from pathlib import Path
from supabase import create_client


def _differs(current, desired):
    """Compare a Supabase column value against the desired JSON value.

    Treats DB NULL as the JSON default ("" for strings, [] for lists) so a
    NULL column doesn't register as a change against an empty JSON field.
    """
    if current is None:
        current = [] if isinstance(desired, list) else ""
    return current != desired


def sync_blog_posts(dry_run=False):
    """Sync blog_posts.json to Supabase."""

    # Category mapping: JSON categories → Supabase categories
    # Live valid_category constraint (migration 20260210): health, protocol,
    # community, lifestyle, performance, nutrition, getting-started, meal-plan
    # (strategy/news/featured were removed — never send those.)
    category_map = {
        "fitness": "protocol",
        "science": "health",
        "protocols": "protocol",
        "research": "health",
        "guides": "protocol",
        # Already valid categories (identity mappings)
        "health": "health",
        "protocol": "protocol",
        "community": "community",
        "lifestyle": "lifestyle",
        "performance": "performance",
        "nutrition": "nutrition",
        "getting-started": "getting-started",
        "meal-plan": "meal-plan",
    }
    # Anything unmapped (one-off labels like "gear", "sunburn") falls back to
    # "community" — same fallback the insert path has always used.

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

    # Get all existing posts from Supabase — every synced column, so we can
    # detect content-only edits (previously only slug/date were compared and
    # content changes were skipped as "already correct")
    try:
        response = (
            client.table("blog_posts")
            .select(
                "id, slug, title, published_date, excerpt, category, tags, "
                "is_published, content, site"
            )
            .execute()
        )
        supabase_posts_by_title = {post["title"]: post for post in response.data}
        supabase_posts_by_slug = {post["slug"]: post for post in response.data}
    except Exception as e:
        print(f"❌ Could not fetch existing posts from Supabase: {e}")
        return False

    # Cross-post safety: refuse to sync if any post is missing a valid site tag
    valid_sites = {"cw", "kd"}
    untagged = [p for p in json_posts if p.get("site") not in valid_sites]
    if untagged:
        print(f"🛑 SAFETY: {len(untagged)} posts missing valid site tag. Refusing to sync.")
        print(f"   First untagged: {untagged[0].get('slug', 'unknown')}")
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

        # Map category to a value the valid_category constraint accepts
        # (case-normalized: JSON has "Health"/"Community" variants)
        json_category = str(json_post.get("category", "community")).strip().lower()
        mapped_category = category_map.get(json_category, "community")

        # Get content from JSON (if exists)
        content = json_post.get("content") or ""

        # GUARD: Never publish posts with empty content
        is_published = json_post.get("published", True)
        if content.strip() == "" and is_published:
            print(
                f"  ⚠️  WARNING: {title[:50]}... has empty content - forcing is_published=False"
            )
            is_published = False

        # Every synced column and its desired value — JSON is source of truth.
        # NOTE: author_id excluded — writers.id type (BIGSERIAL vs UUID) varies
        # between migration versions. Author info lives in blog_posts.json and
        # is used by the static site generator, not Supabase.
        desired = {
            "slug": correct_slug,
            "title": title,
            "published_date": published_date,
            "excerpt": json_post.get("excerpt", ""),
            "category": mapped_category,
            "tags": json_post.get("tags", []),
            "is_published": is_published,
            "content": content,
            "site": json_post.get("site", "cw"),
        }

        # Check if post exists (by title or slug)
        existing_post = supabase_posts_by_title.get(title) or supabase_posts_by_slug.get(
            correct_slug
        )

        if existing_post:
            # Update if ANY synced field changed — including content, so
            # content-only edits (e.g. added affiliate links) propagate
            changed = {
                col: value
                for col, value in desired.items()
                if _differs(existing_post.get(col), value)
            }
            if changed:
                try:
                    if not dry_run:
                        client.table("blog_posts").update(changed).eq(
                            "id", existing_post["id"]
                        ).execute()
                    prefix = "would update" if dry_run else "Updated"
                    print(f"  ✓ {prefix} ({', '.join(sorted(changed))}): {title[:50]}...")
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
                if not dry_run:
                    # Use upsert to handle duplicates gracefully
                    client.table("blog_posts").upsert(desired, on_conflict="slug").execute()
                prefix = "would insert" if dry_run else "Inserted"
                print(f"  ✓ {prefix}: {title[:50]}...")
                inserted_count += 1
            except Exception as e:
                print(f"  ❌ Error upserting {title[:50]}: {e}")
                error_count += 1

    # Summary
    print("")
    print("=" * 70)
    print("✅ BLOG POST SYNC COMPLETE" + (" (DRY RUN — nothing written)" if dry_run else ""))
    print("=" * 70)
    print(f"  Updated: {updated_count}")
    print(f"  Inserted: {inserted_count}")
    print(f"  Skipped (already correct): {skipped_count}")
    print(f"  Errors: {error_count}")
    print("")

    if error_count > 0:
        print("⚠️  Some errors occurred during sync. Check output above.")
        print("   (Non-fatal - continuing with weekly automation)")

    # Return True unless every single post errored (partial success is OK)
    total_processed = inserted_count + updated_count + skipped_count + error_count
    return total_processed == 0 or error_count < total_processed


if __name__ == "__main__":
    success = sync_blog_posts(dry_run="--dry-run" in sys.argv)
    sys.exit(0 if success else 1)
