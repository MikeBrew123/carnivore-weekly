#!/usr/bin/env python3
"""SEO audit for all blog posts."""
import os, re, json
from pathlib import Path

blog_dir = Path("public/blog")
files = sorted([f for f in blog_dir.glob("*.html") if f.name not in ("index.html", "wiki.html")])

results = []

for fp in files:
    html = fp.read_text(encoding="utf-8", errors="replace")
    slug = fp.stem

    # Title
    title_m = re.search(r"<title>([^<]*)</title>", html)
    title = title_m.group(1).strip() if title_m else ""

    # Meta description
    desc_m = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html, re.I)
    if not desc_m:
        desc_m = re.search(r'content="([^"]*)".*?name="description"', html, re.I)
    desc = desc_m.group(1).strip() if desc_m else ""

    # Canonical
    canon_m = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']*)["\']', html, re.I)
    if not canon_m:
        canon_m = re.search(r'<link[^>]+href=["\']([^"\']*)["\'][^>]+rel=["\']canonical["\']', html, re.I)
    canonical = canon_m.group(1).strip() if canon_m else ""

    # OG tags
    og_title = re.search(r'property=["\']og:title["\']', html, re.I)
    og_desc = re.search(r'property=["\']og:description["\']', html, re.I)
    og_image = re.search(r'property=["\']og:image["\']', html, re.I)
    og_url = re.search(r'property=["\']og:url["\']', html, re.I)
    og_type = re.search(r'property=["\']og:type["\']', html, re.I)

    # Twitter cards
    tw_card = re.search(r'name=["\']twitter:card["\']', html, re.I)
    tw_title = re.search(r'name=["\']twitter:title["\']', html, re.I)
    tw_desc = re.search(r'name=["\']twitter:description["\']', html, re.I)
    tw_image = re.search(r'name=["\']twitter:image["\']', html, re.I)

    # Schema/JSON-LD
    schema_m = re.search(r'<script\s+type=["\']application/ld\+json["\']', html, re.I)

    # Robots meta
    robots_m = re.search(r'<meta\s+name=["\']robots["\']', html, re.I)

    # H1 count
    h1_count = len(re.findall(r"<h1[\s>]", html, re.I))

    # GA4 tracking
    has_ga4 = "G-NR4JVKW2JV" in html

    # Images without alt
    imgs = re.findall(r"<img[^>]*>", html, re.I)
    imgs_no_alt = [i for i in imgs if "alt=" not in i.lower()]

    # HTML entities in meta (bad)
    has_entities_title = "&#" in title or "&amp;" in title
    has_entities_desc = "&#" in desc or "&amp;" in desc

    issues = []

    # Title checks
    if not title:
        issues.append("CRITICAL: Missing title tag")
    elif len(title) > 60:
        issues.append(f"WARN: Title too long ({len(title)} chars)")
    elif len(title) < 30:
        issues.append(f"WARN: Title too short ({len(title)} chars)")
    if has_entities_title:
        issues.append("WARN: HTML entities in title")
    if "| Carnivore Weekly" not in title and title:
        issues.append("INFO: No brand suffix in title")

    # Description checks
    if not desc:
        issues.append("CRITICAL: Missing meta description")
    elif len(desc) < 120:
        issues.append(f"WARN: Description too short ({len(desc)} chars)")
    elif len(desc) > 160:
        issues.append(f"WARN: Description too long ({len(desc)} chars)")
    if has_entities_desc:
        issues.append("WARN: HTML entities in description")

    # Canonical
    if not canonical:
        issues.append("CRITICAL: Missing canonical tag")

    # OG tags
    missing_og = []
    if not og_title: missing_og.append("og:title")
    if not og_desc: missing_og.append("og:description")
    if not og_image: missing_og.append("og:image")
    if not og_url: missing_og.append("og:url")
    if not og_type: missing_og.append("og:type")
    if missing_og:
        issues.append(f"WARN: Missing OG tags: {', '.join(missing_og)}")

    # Twitter cards
    missing_tw = []
    if not tw_card: missing_tw.append("twitter:card")
    if not tw_title: missing_tw.append("twitter:title")
    if not tw_desc: missing_tw.append("twitter:description")
    if not tw_image: missing_tw.append("twitter:image")
    if missing_tw:
        issues.append(f"WARN: Missing Twitter tags: {', '.join(missing_tw)}")

    # Schema
    if not schema_m:
        issues.append("WARN: No JSON-LD schema markup")

    # H1
    if h1_count == 0:
        issues.append("WARN: No H1 tag")
    elif h1_count > 1:
        issues.append(f"WARN: Multiple H1 tags ({h1_count})")

    # Robots
    if not robots_m:
        issues.append("INFO: No robots meta tag")

    # GA4
    if not has_ga4:
        issues.append("WARN: Missing GA4 tracking")

    # Images
    if imgs_no_alt:
        issues.append(f"WARN: {len(imgs_no_alt)} images without alt text")

    results.append({
        "slug": slug,
        "title": title,
        "title_len": len(title),
        "desc": desc,
        "desc_len": len(desc),
        "canonical": canonical,
        "has_og": len(missing_og) == 0,
        "has_twitter": len(missing_tw) == 0,
        "has_schema": bool(schema_m),
        "h1_count": h1_count,
        "has_ga4": has_ga4,
        "imgs_no_alt": len(imgs_no_alt),
        "issues": issues,
        "issue_count": len(issues),
    })

# Save full results
with open("dashboard/seo-audit-results.json", "w") as f:
    json.dump(results, f, indent=2)

# Summary stats
total = len(results)
critical = sum(1 for r in results if any("CRITICAL" in i for i in r["issues"]))
warnings = sum(1 for r in results if any("WARN" in i for i in r["issues"]))
clean = sum(1 for r in results if r["issue_count"] == 0)

no_desc = sum(1 for r in results if not r["desc"])
short_desc = sum(1 for r in results if r["desc"] and r["desc_len"] < 120)
long_desc = sum(1 for r in results if r["desc_len"] > 160)
no_title = sum(1 for r in results if not r["title"])
long_title = sum(1 for r in results if r["title_len"] > 60)
short_title = sum(1 for r in results if r["title"] and r["title_len"] < 30)
no_og = sum(1 for r in results if not r["has_og"])
no_twitter = sum(1 for r in results if not r["has_twitter"])
no_schema = sum(1 for r in results if not r["has_schema"])
no_ga4 = sum(1 for r in results if not r["has_ga4"])
entities_desc = sum(1 for r in results if "&#" in r["desc"] or "&amp;" in r["desc"])
entities_title = sum(1 for r in results if "&#" in r["title"] or "&amp;" in r["title"])
multi_h1 = sum(1 for r in results if r["h1_count"] > 1)
no_h1 = sum(1 for r in results if r["h1_count"] == 0)
imgs_issues = sum(1 for r in results if r["imgs_no_alt"] > 0)
no_brand = sum(1 for r in results if r["title"] and "| Carnivore Weekly" not in r["title"])

print("=" * 70)
print("SEO AUDIT SUMMARY — ALL BLOG POSTS")
print("=" * 70)
print()
print(f"  Total pages scanned:  {total}")
print(f"  Clean (0 issues):     {clean}")
print(f"  With critical issues: {critical}")
print(f"  With warnings:        {warnings}")
print()
print("--- META TITLES ---")
print(f"  Missing title:        {no_title}")
print(f"  Too short (<30):      {short_title}")
print(f"  Too long (>60):       {long_title}")
print(f"  HTML entities:        {entities_title}")
print(f"  No brand suffix:      {no_brand}")
print()
print("--- META DESCRIPTIONS ---")
print(f"  Missing description:  {no_desc}")
print(f"  Too short (<120):     {short_desc}")
print(f"  Too long (>160):      {long_desc}")
print(f"  HTML entities:        {entities_desc}")
print()
print("--- SOCIAL / STRUCTURED DATA ---")
print(f"  Missing OG tags:      {no_og}")
print(f"  Missing Twitter tags: {no_twitter}")
print(f"  No JSON-LD schema:    {no_schema}")
print()
print("--- TECHNICAL ---")
print(f"  No H1 tag:            {no_h1}")
print(f"  Multiple H1 tags:     {multi_h1}")
print(f"  Missing GA4:          {no_ga4}")
print(f"  Images w/o alt text:  {imgs_issues}")
print()

# Print all posts with short descriptions
if short_desc:
    print("=" * 70)
    print(f"DESCRIPTIONS TOO SHORT ({short_desc} posts):")
    print("-" * 70)
    for r in sorted(results, key=lambda x: x["desc_len"]):
        if r["desc"] and r["desc_len"] < 120:
            print(f"  [{r['desc_len']:3d}] {r['slug'][:50]}")
            d = r["desc"][:100]
            print(f'        "{d}"')
    print()

# Print posts with long descriptions
if long_desc:
    print("=" * 70)
    print(f"DESCRIPTIONS TOO LONG ({long_desc} posts):")
    print("-" * 70)
    for r in results:
        if r["desc_len"] > 160:
            d = r["desc"][:100]
            print(f"  [{r['desc_len']:3d}] {r['slug'][:50]}")
            print(f'        "{d}..."')
    print()

# Print posts with entities in desc
if entities_desc:
    print("=" * 70)
    print(f"HTML ENTITIES IN DESCRIPTIONS ({entities_desc} posts):")
    print("-" * 70)
    for r in results:
        if "&#" in r["desc"] or "&amp;" in r["desc"]:
            d = r["desc"][:120]
            print(f"  {r['slug'][:50]}")
            print(f'        "{d}"')
    print()

# Print long titles
if long_title:
    print("=" * 70)
    print(f"TITLES TOO LONG ({long_title} posts):")
    print("-" * 70)
    for r in results:
        if r["title_len"] > 60:
            print(f"  [{r['title_len']:3d}] {r['slug'][:45]}")
            print(f'        "{r["title"]}"')
    print()

# Print missing critical items
if no_desc or no_title:
    print("=" * 70)
    print("CRITICAL: MISSING META TAGS")
    print("-" * 70)
    for r in results:
        if not r["title"]:
            print(f"  NO TITLE: {r['slug']}")
        if not r["desc"]:
            print(f"  NO DESC:  {r['slug']}")
    print()

print("=" * 70)
print("Full results saved to dashboard/seo-audit-results.json")
