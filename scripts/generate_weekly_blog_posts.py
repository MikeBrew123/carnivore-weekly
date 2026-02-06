#!/usr/bin/env python3
"""
Generate blog posts for the upcoming week during Sunday automation.
Creates complete HTML files for posts scheduled in the next 7 days.
Daily workflow will just mark them as published (no content generation).
"""

import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from anthropic import Anthropic

PROJECT_ROOT = Path(__file__).parent.parent
BLOG_POSTS_FILE = PROJECT_ROOT / "data" / "blog_posts.json"
BLOG_DIR = PROJECT_ROOT / "public" / "blog"
TEMPLATE_FILE = PROJECT_ROOT / "templates" / "blog_post_template_2026.html"

def generate_html_from_template(post, content):
    """Generate complete HTML file from template and content."""

    if not TEMPLATE_FILE.exists():
        raise FileNotFoundError(f"Template not found: {TEMPLATE_FILE}")

    with open(TEMPLATE_FILE, 'r') as f:
        template = f.read()

    # Replace template placeholders
    html = template.replace('{{title}}', post.get('title', ''))
    html = html.replace('{{author}}', post.get('author', 'marcus').title())
    html = html.replace('{{author_title}}', post.get('author_title', 'Performance Coach'))
    html = html.replace('{{date}}', post.get('date', ''))
    html = html.replace('{{slug}}', post.get('slug', ''))
    html = html.replace('{{excerpt}}', post.get('excerpt', ''))
    html = html.replace('{{meta_description}}', post.get('seo', {}).get('meta_description', '')[:160])
    html = html.replace('{{keywords}}', ', '.join(post.get('tags', [])))
    html = html.replace('{{content}}', content)

    return html

def generate_blog_content(post):
    """Generate blog content using writer agent."""

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        print("⚠️  ANTHROPIC_API_KEY not set")
        return None

    client = Anthropic(api_key=api_key)

    author = post.get("author", "marcus").lower()

    # Writer agent prompts
    writer_styles = {
        "sarah": "evidence-based, research-focused, conversational but rigorous. Specialty: health science, metabolism, hormones.",
        "marcus": "results-oriented, practical, no-nonsense. Specialty: performance, habits, implementation.",
        "chloe": "warm, relatable, down-to-earth. Specialty: community, social dynamics, making carnivore approachable."
    }

    if author not in writer_styles:
        author = "marcus"

    prompt = f"""You are {author.title()}, {post.get('author_title', 'Performance Coach')} at Carnivore Weekly.
Your style: {writer_styles[author]}

Write a comprehensive blog post:
- Title: {post.get('title', '')}
- Excerpt: {post.get('excerpt', '')}
- Target: 30-60 year olds interested in carnivore diet
- Length: 800-1200 words
- Reading level: Grade 8-10

Requirements:
- Direct and clear - get to the point
- No excessive praise or hype
- Professional but accessible
- Use contractions (don't, can't, won't)
- No em-dashes (use periods or commas)
- Avoid AI tells: delve, robust, leverage, navigate, crucial, realm, landscape, utilize

Return ONLY HTML content (h1, h2, p tags) - no frontmatter."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}]
        )

        content = response.content[0].text
        return content
    except Exception as e:
        print(f"   ❌ Content generation failed: {e}")
        return None

def validate_post(html_file):
    """Validate generated post for critical issues. Returns list of errors."""

    issues = []

    try:
        with open(html_file, 'r') as f:
            content = f.read()

            # 1. Check for empty meta description
            if 'content=""' in content and 'name="description"' in content:
                issues.append("Empty meta description")

            # 2. Check canonical URL (broken .html pattern)
            if 'rel="canonical" href="https://carnivoreweekly.com/blog/.html"' in content:
                issues.append("Broken canonical URL")

            # 3. Check for AI tells
            ai_tells = ['—', 'delve', 'robust', 'leverage', 'navigate', 'crucial', 'realm', 'landscape', 'utilize']
            found_tells = [tell for tell in ai_tells if tell in content.lower()]
            if found_tells:
                issues.append(f"AI tells found: {', '.join(found_tells)}")

            # 4. Check for Google Fonts
            if 'fonts.googleapis.com' not in content:
                issues.append("Missing Google Fonts")

            # 5. Check for blog-post.css
            if 'blog-post.css' not in content and 'global.css' not in content:
                issues.append("Missing CSS link")

            # 6. Check for post-content wrapper
            if '<div class="post-content">' not in content:
                issues.append("Missing post-content wrapper")

            # 7. Check for placeholder content
            if 'Full content will be generated when this post is published' in content:
                issues.append("Contains placeholder content")

    except Exception as e:
        issues.append(f"Validation error: {e}")

    return issues

def generate_weekly_posts():
    """Generate blog posts for the next 7 days."""

    print("📝 WEEKLY BLOG POST GENERATION")
    print("=" * 60)

    if not BLOG_POSTS_FILE.exists():
        print("❌ No blog posts file found")
        return 0

    with open(BLOG_POSTS_FILE, 'r') as f:
        data = json.load(f)

    # Get date range: today through 7 days from now
    today = datetime.now()
    end_date = today + timedelta(days=7)

    today_str = today.strftime("%Y-%m-%d")
    end_date_str = end_date.strftime("%Y-%m-%d")

    print(f"\n📅 Generating posts scheduled between {today_str} and {end_date_str}")
    print()

    generated_count = 0
    skipped_count = 0
    failed_posts = []

    for post in data.get("blog_posts", []):
        # Check if post is in the next 7 days and not yet published
        if not post.get("published", False):
            scheduled_date = post.get("scheduled_date", post.get("date"))

            if today_str <= scheduled_date <= end_date_str:
                slug = post.get("slug", "")
                html_file = BLOG_DIR / f"{slug}.html"

                # Skip if HTML already exists
                if html_file.exists():
                    print(f"⏭️  Skipping: {post['title']} (already exists)")
                    skipped_count += 1
                    continue

                print(f"📝 Generating: {post['title']}")
                print(f"   Author: {post.get('author', 'marcus').title()}")
                print(f"   Scheduled: {scheduled_date}")

                # Generate content using writer agent
                content = generate_blog_content(post)

                if content:
                    # Create HTML file from template
                    try:
                        html = generate_html_from_template(post, content)
                        html_file.parent.mkdir(parents=True, exist_ok=True)
                        html_file.write_text(html)
                        print(f"   ✅ Created {slug}.html")

                        # Validate the post
                        validation_issues = validate_post(html_file)

                        if validation_issues:
                            print(f"   ⚠️  Validation warnings:")
                            for issue in validation_issues:
                                print(f"      • {issue}")
                            # Don't delete - warnings are acceptable
                        else:
                            print(f"   ✅ Validation passed")

                        generated_count += 1

                    except Exception as e:
                        print(f"   ❌ Failed to create HTML: {e}")
                        failed_posts.append({
                            "title": post.get("title", "Unknown"),
                            "error": str(e)
                        })
                else:
                    print(f"   ❌ Content generation failed")
                    failed_posts.append({
                        "title": post.get("title", "Unknown"),
                        "error": "Content generation failed"
                    })

                print()

    # Summary
    print("=" * 60)
    print(f"✅ Generated: {generated_count} post(s)")
    print(f"⏭️  Skipped: {skipped_count} post(s) (already exist)")

    if failed_posts:
        print(f"❌ Failed: {len(failed_posts)} post(s)")
        for post in failed_posts:
            print(f"   • {post['title']}: {post['error']}")

    print("=" * 60)

    return generated_count

if __name__ == "__main__":
    generated = generate_weekly_posts()
    exit(0 if generated >= 0 else 1)
