#!/usr/bin/env python3
"""
Update all December 2025 blog posts to match January 2026 branding standards.

Changes:
1. Fix stylesheet path from ../../style-2026.css to ../style-2026.css
2. Remove dark theme inline style from body tag
3. Update HTML structure (header, container, nav, wrappers)
4. Fix image paths from ../../images to ../images
5. Remove Archive and About links from navigation
6. Add proper 2026 color styles in <style> block
7. Remove conflicting inline styles
"""

import os
import re
from pathlib import Path


def update_december_post(file_path):
    """Update a single December post to match 2026 standards."""

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    original_content = content

    # 1. Fix stylesheet path: ../../style-2026.css to ../style-2026.css
    content = content.replace(
        '<link rel="stylesheet" href="../../style-2026.css">',
        '<link rel="stylesheet" href="../style-2026.css">',
    )

    # 2. Remove dark theme inline style from body tag
    content = re.sub(
        r'<body style="background-color: #1a120b; color: #f4e4d4; font-family: \'Merriweather\', serif;">',
        "<body>",
        content,
    )

    # 3. Fix back-to-blog link to use absolute path
    content = re.sub(
        r'<a href="[^"]*blog\.html" class="back-to-blog">',
        '<a href="/blog.html" class="back-to-blog">',
        content,
    )

    # 4. Fix image paths: ../../images to ../images
    content = content.replace('src="../../images/', 'src="../images/')

    # 5. Fix footer links to use absolute paths
    content = re.sub(
        r'href="\.\./(about|the-lab|index|channels|wiki|calculator)\.html"',
        r'href="/\1.html',
        content,
    )

    # Fix mailto and external links
    content = re.sub(
        r'<a href="mailto:([^"]+)"',
        r'<a href="mailto:\1"',
        content,
    )

    # 6. Update header from generic <header> to <header class="header-2026">
    content = re.sub(
        r'<header>\s*<div class="container">',
        '<header class="header-2026">\n        <div class="container-2026">',
        content,
    )

    # 7. Update navigation: add class, update structure, remove Archive/About
    nav_pattern = r'<nav class="nav-menu-2026">\s*<a href="[^"]*">Home</a>\s*<a href="[^"]*">Channels</a>\s*<a href="[^"]*">Wiki</a>\s*<a href="[^"]*">Blog</a>\s*<a href="[^"]*">Calculator</a>\s*(?:<a href="[^"]*">Archive</a>\s*)?(?:<a href="[^"]*">About</a>\s*)?</nav>'

    nav_replacement = '''<nav class="nav-menu-2026">
        <a href="/index.html">Home</a>
        <a href="/channels.html">Channels</a>
        <a href="/wiki.html">Wiki</a>
        <a href="/blog.html">Blog</a>
        <a href="/calculator.html">Calculator</a>

    </nav>'''

    content = re.sub(nav_pattern, nav_replacement, content)

    # 8. Update post container to use layout wrapper + main content
    content = re.sub(
        r'<div class="post-container">',
        '<div class="layout-wrapper-2026">\n        <main class="main-content-2026">',
        content,
    )

    # 9. Add style block with 2026 colors if not present
    if "<style>" not in content:
        style_block = '''    <style>
        /* 2026 Brand Colors - Comprehensive Styling */

        /* Global link styling */
        a { color: #d4a574 !important;
            text-decoration: underline;
            transition: color 0.2s ease;
        }

        a:hover {
            color: #ffd700;
            text-decoration: underline;
        }

        /* Navigation menu styling for dark background */
        body .nav-menu-2026 a {
            color: #d4a574 !important;
            border-bottom-color: #d4a574 !important;
        }

        body .nav-menu-2026 a:hover {
            color: #ffd700 !important;
            border-bottom-color: #ffd700 !important;
        }

        /* Wiki links */
        .wiki-link {
            color: #d4a574;
            text-decoration: underline;
        }

        .wiki-link:hover {
            color: #ffd700;
        }

        /* Strong tags and emphasis - gold for visual hierarchy */
        strong {
            color: #ffd700;
            font-weight: 600;
        }

        /* Headings - ensure visual hierarchy with gold */
        h1, h2, h3, h4, h5, h6 { color: #ffd700 !important;
        }

        /* Post author bio styling */
        .post-author-bio {
            background-color: #2c1810;
            color: #f4e4d4;
            padding: 15px;
            border-left: 4px solid #d4a574;
            border-radius: 4px;
            margin: 15px 0;
        }

        .post-author-bio strong {
            color: #ffd700;
        }

        /* Tag styling */
        .tag {
            background-color: #2c1810;
            color: #d4a574;
            border: 1px solid #d4a574;
            padding: 6px 12px;
            margin: 4px;
            border-radius: 4px;
            display: inline-block;
            font-size: 14px;
        }

        .tag:hover {
            background-color: #3d2817;
            color: #ffd700;
            border-color: #ffd700;
        }

        /* Back to blog link */
        .back-to-blog {
            color: #d4a574;
            text-decoration: underline;
            display: inline-block;
            margin-bottom: 20px;
        }

        .back-to-blog:hover {
            color: #ffd700;
        }

        /* Post meta information */
        .post-meta { color: #d4a574 !important;
            font-size: 14px;
        }

        /* Disclaimer/footer text */
        .post-footer {
            color: #f4e4d4;
        }

        .post-footer h3 {
            color: #ffd700;
        }

        /* Wiki box styling */
        .wiki-box {
            background: #2c1810;
            padding: 20px;
            border-left: 4px solid #d4a574;
            margin: 30px 0;
            border-radius: 4px;
        }

        .wiki-box strong {
            color: #ffd700;
        }

        .wiki-box-links {
            color: #d4a574;
            font-size: 14px;
        }

        /* Post header styling */
        .post-header {
            margin-bottom: 40px;
            border-bottom: 2px solid #8b4513;
            padding-bottom: 20px;
        }

        /* Comments section */
        .comments-section {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #8b4513;
        }

        /* Footer styling */
        .blog-footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #8b4513;
            text-align: center;
            color: #d4a574;
            font-size: 12px;
        }

        /* Disclaimer text */
        .post-disclaimer {
            font-size: 0.9em;
            color: #d4a574;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #8b4513;
        }

        /* Layout wrapper */
        .layout-wrapper-2026 {
            display: flex;
            gap: 30px;
            max-width: 1000px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        /* Main content */
        .main-content-2026 {
            flex: 1;
            max-width: 800px;
        }

        /* Container 2026 */
        .container-2026 {
            max-width: 800px;
            margin: 0 auto;
            padding: 0 20px;
        }
    </style>'''

        # Insert before </head>
        content = content.replace("</head>", style_block + "\n</head>")

    # 10. Remove inline styles from various divs (let stylesheet handle it)
    content = re.sub(
        r'<div class="post-header" style="[^"]*">',
        '<div class="post-header">',
        content,
    )

    content = re.sub(
        r'<div class="post-footer"[^>]*>',
        '<div class="post-footer">',
        content,
    )

    content = re.sub(
        r'<div class="comments-section" style="[^"]*">',
        '<div class="comments-section">',
        content,
    )

    # 11. Fix copyright year to 2026 if it says 2025
    content = re.sub(
        r"&copy; 2025 Carnivore Weekly",
        "&copy; 2026 Carnivore Weekly",
        content,
    )

    # 12. Close main content wrapper before footer
    if '<script src="/js/mobile-nav.js"></script>' in content:
        content = content.replace(
            '</div>\n    <script src="/js/mobile-nav.js"></script>',
            '</div>\n    </main>\n    </div>\n\n    <script src="/js/mobile-nav.js"></script>',
            1,  # Only replace first occurrence
        )

    # Check if anything changed
    if content != original_content:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        return True
    return False


def main():
    """Update all December 2025 blog posts."""
    blog_dir = Path("/Users/mbrew/Developer/carnivore-weekly/public/blog")

    # Get all December 2025 posts
    december_posts = sorted(blog_dir.glob("2025-12*.html"))

    if not december_posts:
        print("No December 2025 posts found")
        return

    print(f"Found {len(december_posts)} December posts to update\n")

    updated_count = 0
    for post_file in december_posts:
        print(f"Updating: {post_file.name}...", end=" ")
        try:
            if update_december_post(str(post_file)):
                print("✓ Updated")
                updated_count += 1
            else:
                print("✓ No changes needed")
        except Exception as e:
            print(f"✗ Error: {e}")

    print(f"\nCompleted: {updated_count} posts updated")


if __name__ == "__main__":
    main()
