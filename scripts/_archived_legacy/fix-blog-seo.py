#!/usr/bin/env python3
"""
Fix SEO issues in blog posts:
1. Add missing Open Graph tags
2. Add missing Twitter Card tags
3. Add Google Analytics tracking code
4. Add canonical URL tag
5. Fix multiple H1 tags (convert header H1 to H2)
"""

import re
from pathlib import Path


def fix_blog_post(file_path):
    """Fix a single blog post file"""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract information from the post
    title_match = re.search(r"<title>([^<]+)</title>", content)
    desc_match = re.search(r'<meta name="description" content="([^"]+)"', content)

    if not title_match or not desc_match:
        print(f"⚠️  Skipping {file_path} - missing title or description")
        return False

    title = title_match.group(1)
    description = desc_match.group(1)

    # Extract the date from filename (e.g., 2026-01-01-beginners-blueprint.html)
    filename = Path(file_path).stem
    date_match = re.match(r"(\d{4}-\d{2}-\d{2})", filename)
    publish_date = date_match.group(1) if date_match else "2025-12-31"

    # Build canonical URL
    canonical_url = f"https://carnivoreweekly.com/blog/{Path(file_path).name}"

    # Generate Open Graph tags
    og_tags = f"""    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Carnivore Weekly">
    <meta property="og:url" content="{canonical_url}">
    <meta property="article:published_time" content="{publish_date}">"""

    # Generate Twitter Card tags
    twitter_tags = f"""    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description}">
    <meta name="twitter:site" content="@carnivoreweekly">"""

    # Google Analytics code
    ga_code = """    <script async src="https://www.googletagmanager.com/gtag/js?id=G-NR4JVKW2JV"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-NR4JVKW2JV');
    </script>"""

    # Canonical URL tag
    canonical_tag = f'    <link rel="canonical" href="{canonical_url}">'

    # Check if these tags already exist
    if 'property="og:title"' in content:
        print(f"✓ {Path(file_path).name} - already has OG tags")
        return False

    # If canonical already exists, don't add another one — only add OG/Twitter
    if 'rel="canonical"' in content:
        print(f"⚠ {Path(file_path).name} - canonical exists, adding OG/Twitter only")
        head_insert = f"{og_tags}\n{twitter_tags}"
    else:
        head_insert = f"{canonical_tag}\n{og_tags}\n{twitter_tags}"
    content = content.replace("</head>", f"{head_insert}\n</head>")

    # Add Google Analytics before closing </head>
    content = content.replace("</head>", f"{ga_code}\n</head>")

    # Fix multiple H1 tags: convert header H1 to H2
    # The first <h1>CARNIVORE WEEKLY</h1> should be H2
    content = re.sub(
        r"<header[^>]*>.*?<h1>CARNIVORE WEEKLY</h1>",
        lambda m: m.group(0).replace("<h1>CARNIVORE WEEKLY</h1>", "<h2>CARNIVORE WEEKLY</h2>"),
        content,
        flags=re.DOTALL,
    )

    # Remove duplicate H1 in post content (keep only .post-title H1)
    # Find the post content section and remove any extra H1s in it
    post_content_match = re.search(r'<div class="post-content">(.*?)</div>', content, re.DOTALL)
    if post_content_match:
        post_content = post_content_match.group(1)
        # Count H1s in post content
        h1_count = len(re.findall(r"<h1[^>]*>", post_content))
        if h1_count > 1:
            # Replace the first H1 in post content with H2 (it's a duplicate)
            post_content = re.sub(r"<h1([^>]*)>(.*?)</h1>", r"<h2\1>\2</h2>", post_content, count=1)
            content = content.replace(post_content_match.group(1), post_content)

    # Write fixed content back
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"✓ Fixed {Path(file_path).name}")
    return True


def main():
    """Fix all blog posts"""
    # Use Path(__file__).parent.parent to get project root (more portable)
    blog_dir = Path(__file__).parent.parent / "public" / "blog"

    if not blog_dir.exists():
        print(f"❌ Blog directory not found: {blog_dir}")
        return

    html_files = sorted(blog_dir.glob("*.html"))

    if not html_files:
        print(f"❌ No HTML files found in {blog_dir}")
        return

    print(f"🔧 Found {len(html_files)} blog posts to check")
    print()

    fixed_count = 0
    skipped_count = 0

    for html_file in html_files:
        try:
            if fix_blog_post(str(html_file)):
                fixed_count += 1
            else:
                skipped_count += 1
        except Exception as e:
            print(f"❌ Error processing {html_file.name}: {e}")

    print()
    print("=" * 50)
    print(f"✅ Fixed: {fixed_count}")
    print(f"⏭️  Skipped: {skipped_count}")
    print("=" * 50)


if __name__ == "__main__":
    main()
