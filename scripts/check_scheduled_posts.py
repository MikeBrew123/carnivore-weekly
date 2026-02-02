#!/usr/bin/env python3
"""
Check for blog posts ready to publish based on scheduled date.
Generates content using writer agents if HTML doesn't exist.
Updates published status in blog_posts.json.
"""

import json
import os
import subprocess
from datetime import datetime
from pathlib import Path

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

def generate_blog_content_for_post(post):
    """Generate blog content using writer agent via Python subprocess."""

    # Import here to avoid issues if anthropic not installed
    try:
        from anthropic import Anthropic
    except ImportError:
        print("⚠️  anthropic package not installed. Run: pip install anthropic")
        return None

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

    print(f"   🤖 Generating content with {author.title()}...")

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

def check_and_publish_scheduled_posts():
    """Check for posts with scheduled_date <= today and publish them."""

    if not BLOG_POSTS_FILE.exists():
        print("❌ No blog posts file found")
        with open("/tmp/posts_published.txt", "w") as f:
            f.write("0")
        return

    with open(BLOG_POSTS_FILE, "r") as f:
        data = json.load(f)

    today = datetime.now().strftime("%Y-%m-%d")
    published_count = 0
    published_titles = []
    generated_count = 0
    failed_posts = []

    for post in data.get("blog_posts", []):
        # Check if post is scheduled but not yet published
        if not post.get("published", False):
            scheduled_date = post.get("scheduled_date", post.get("date"))

            if scheduled_date <= today:
                slug = post.get("slug", "")
                html_file = BLOG_DIR / f"{slug}.html"

                # If HTML doesn't exist, generate it
                if not html_file.exists():
                    print(f"📝 Generating: {post['title']}")

                    # Generate content using writer agent
                    content = generate_blog_content_for_post(post)

                    if content:
                        # Create HTML file from template
                        try:
                            html = generate_html_from_template(post, content)
                            html_file.parent.mkdir(parents=True, exist_ok=True)
                            html_file.write_text(html)
                            generated_count += 1
                            print(f"   ✅ Created {slug}.html")
                        except Exception as e:
                            print(f"   ❌ Failed to create HTML: {e}")
                            failed_posts.append({
                                "title": post.get("title", "Unknown"),
                                "error": str(e)
                            })
                            continue
                    else:
                        print(f"   ⚠️  Content generation failed, skipping")
                        failed_posts.append({
                            "title": post.get("title", "Unknown"),
                            "error": "Content generation failed"
                        })
                        continue

                # Now HTML exists, publish the post
                post["published"] = True
                published_count += 1
                published_titles.append(post.get("title", "Unknown"))
                print(f"✅ Publishing: {post['title']} (scheduled for {scheduled_date})")

    if published_count > 0:
        # Save updated post data
        with open(BLOG_POSTS_FILE, "w") as f:
            json.dump(data, f, indent=2)

        print(f"\n📝 Published {published_count} post(s) today:")
        for title in published_titles:
            print(f"   • {title}")

        if generated_count > 0:
            print(f"\n🤖 Generated {generated_count} new blog post(s) with AI")

        with open("/tmp/posts_published.txt", "w") as f:
            f.write(str(published_count))
    else:
        print("⏳ No posts ready to publish today")
        with open("/tmp/posts_published.txt", "w") as f:
            f.write("0")

    # Report failed posts
    if failed_posts:
        print(f"\n❌ FAILED {len(failed_posts)} post(s):")
        for post in failed_posts:
            print(f"   • {post['title']}: {post['error']}")

if __name__ == "__main__":
    check_and_publish_scheduled_posts()
