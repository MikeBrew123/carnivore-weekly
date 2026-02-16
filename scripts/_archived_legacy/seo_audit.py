import re
import json
import os

base = "/Users/mbrew/Developer/carnivore-weekly/public"

pages = {
    "index.html": f"{base}/index.html",
    "starter-plan.html": f"{base}/starter-plan.html",
    "blog/index.html": f"{base}/blog/index.html",
    "wiki.html": f"{base}/wiki.html",
    "channels.html": f"{base}/channels.html",
    "archive.html": f"{base}/archive.html",
    "blog/cholesterol-truth.html": f"{base}/blog/2026-02-08-cholesterol-truth.html",
    "blog/deep-freezer-strategy.html": f"{base}/blog/2025-12-24-deep-freezer-strategy.html",
    "blog/ground-beef-budget.html": f"{base}/blog/2026-01-05-ground-beef-budget.html",
}

results = []

def add(page, issue, severity, details):
    results.append((page, issue, severity, details))

for name, path in pages.items():
    if not os.path.exists(path):
        add(name, "FILE MISSING", "CRITICAL", f"File not found at {path}")
        continue

    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        html = f.read()

    # 1. Canonical tag
    canonical = re.findall(r'rel=["\']canonical["\']', html, re.IGNORECASE)
    if not canonical:
        add(name, "CANONICAL TAG MISSING", "HIGH", "No rel=\"canonical\" found")
    else:
        href = re.findall(r'<link[^>]*rel=["\']canonical["\'][^>]*href=["\']([^"\']*)["\']', html, re.IGNORECASE)
        if not href:
            href = re.findall(r'<link[^>]*href=["\']([^"\']*)["\'][^>]*rel=["\']canonical["\']', html, re.IGNORECASE)
        if href:
            add(name, "CANONICAL TAG", "OK", f"Present: {href[0]}")
        else:
            add(name, "CANONICAL TAG", "WARN", "rel=canonical found but couldn't extract href")

    # 2. Meta description
    meta_desc = re.findall(r'<meta[^>]*name=["\']description["\'][^>]*content=["\']([^"\']*)["\']', html, re.IGNORECASE)
    if not meta_desc:
        meta_desc = re.findall(r'<meta[^>]*content=["\']([^"\']*)["\'][^>]*name=["\']description["\']', html, re.IGNORECASE)
    if not meta_desc:
        add(name, "META DESCRIPTION MISSING", "HIGH", "No meta description tag found")
    else:
        length = len(meta_desc[0])
        if length < 50:
            add(name, "META DESCRIPTION SHORT", "MEDIUM", f"Length: {length} chars (recommended: 120-160)")
        elif length > 160:
            add(name, "META DESCRIPTION LONG", "LOW", f"Length: {length} chars (recommended: 120-160)")
        else:
            add(name, "META DESCRIPTION", "OK", f"Length: {length} chars")

    # 3. OG tags
    og_tags = ["og:title", "og:description", "og:image", "og:url"]
    for og in og_tags:
        pat = re.escape(og)
        found = re.findall(rf'property=["\']{ pat }["\']', html, re.IGNORECASE)
        if not found:
            found = re.findall(rf'content=["\'][^"\']*["\'][^>]*property=["\']{ pat }["\']', html, re.IGNORECASE)
        if not found:
            add(name, f"OG MISSING: {og}", "MEDIUM", f"No {og} meta tag found")

    # 4. Twitter cards
    twitter_tags = ["twitter:card", "twitter:title"]
    for tw in twitter_tags:
        pat = re.escape(tw)
        found = re.findall(rf'name=["\']{ pat }["\']', html, re.IGNORECASE)
        if not found:
            add(name, f"TWITTER MISSING: {tw}", "MEDIUM", f"No {tw} meta tag found")

    # 5. JSON-LD
    jsonld_matches = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL | re.IGNORECASE)
    if not jsonld_matches:
        add(name, "JSON-LD MISSING", "MEDIUM", "No application/ld+json script found")
    else:
        for i, jld in enumerate(jsonld_matches):
            try:
                json.loads(jld.strip())
                add(name, f"JSON-LD #{i+1}", "OK", "Valid JSON")
            except json.JSONDecodeError as e:
                add(name, f"JSON-LD #{i+1} INVALID", "HIGH", f"Invalid JSON: {str(e)[:100]}")

    # 6. H1 count
    h1_count = len(re.findall(r'<h1[\s>]', html, re.IGNORECASE))
    if h1_count == 0:
        add(name, "H1 MISSING", "HIGH", "No <h1> tag found")
    elif h1_count > 1:
        add(name, "MULTIPLE H1 TAGS", "MEDIUM", f"Found {h1_count} <h1> tags (should be 1)")
    else:
        add(name, "H1 COUNT", "OK", "Exactly 1 <h1> tag")

    # 7. Images without alt
    img_tags = re.findall(r'<img[^>]*>', html, re.IGNORECASE)
    imgs_no_alt = 0
    for img in img_tags:
        if not re.search(r'alt\s*=', img, re.IGNORECASE):
            imgs_no_alt += 1
    total_imgs = len(img_tags)
    if imgs_no_alt > 0:
        add(name, "IMAGES MISSING ALT", "MEDIUM", f"{imgs_no_alt} of {total_imgs} images missing alt attribute")
    elif total_imgs > 0:
        add(name, "IMAGE ALT TAGS", "OK", f"All {total_imgs} images have alt attributes")
    else:
        add(name, "IMAGES", "INFO", "No <img> tags found")

    # 8. Heading hierarchy
    headings = re.findall(r'<(h[1-6])[\s>]', html, re.IGNORECASE)
    heading_levels = [int(h[1]) for h in headings]
    hierarchy_issues = []
    if heading_levels:
        if heading_levels[0] != 1:
            hierarchy_issues.append(f"First heading is h{heading_levels[0]}, not h1")
        for i in range(1, len(heading_levels)):
            if heading_levels[i] > heading_levels[i-1] + 1:
                hierarchy_issues.append(f"Skipped from h{heading_levels[i-1]} to h{heading_levels[i]}")
                break
    if hierarchy_issues:
        add(name, "HEADING HIERARCHY", "MEDIUM", "; ".join(hierarchy_issues))
    elif heading_levels:
        add(name, "HEADING HIERARCHY", "OK", f"Proper hierarchy ({len(heading_levels)} headings)")


# === SITEMAP CHECK ===
sitemap_path = f"{base}/sitemap.xml"
if os.path.exists(sitemap_path):
    with open(sitemap_path, 'r', encoding='utf-8', errors='replace') as f:
        sitemap = f.read()
    urls = re.findall(r'<loc>(.*?)</loc>', sitemap)
    add("sitemap.xml", "SITEMAP FOUND", "OK", f"Contains {len(urls)} URLs total")
    # Check first 10 URLs
    for url in urls[:10]:
        # Convert URL to local path
        local = url.replace("https://carnivoreweekly.com/", "").replace("https://www.carnivoreweekly.com/", "")
        if not local or local.endswith("/"):
            local_path = f"{base}/{local}index.html"
        else:
            local_path = f"{base}/{local}"
        if not os.path.exists(local_path):
            # Try without trailing slash
            alt_path = f"{base}/{local}.html" if not local.endswith(".html") else local_path
            if not os.path.exists(alt_path):
                add("sitemap.xml", "BROKEN SITEMAP URL", "HIGH", f"{url} -> file not found ({local_path})")
            else:
                add("sitemap.xml", "SITEMAP URL OK", "OK", f"{url}")
        else:
            add("sitemap.xml", "SITEMAP URL OK", "OK", f"{url}")
else:
    add("sitemap.xml", "SITEMAP MISSING", "CRITICAL", f"No sitemap.xml found at {sitemap_path}")


# === ROBOTS.TXT CHECK ===
robots_paths = [
    f"{base}/robots.txt",
    "/Users/mbrew/Developer/carnivore-weekly/robots.txt",
]
robots_found = False
for rp in robots_paths:
    if os.path.exists(rp):
        with open(rp, 'r', encoding='utf-8', errors='replace') as f:
            robots = f.read()
        robots_found = True
        add("robots.txt", "ROBOTS.TXT FOUND", "OK", f"Location: {rp}")
        if 'sitemap' in robots.lower():
            sitemap_refs = re.findall(r'[Ss]itemap:\s*(.*)', robots)
            for sr in sitemap_refs:
                add("robots.txt", "SITEMAP REFERENCE", "OK", f"Points to: {sr.strip()}")
        else:
            add("robots.txt", "NO SITEMAP REFERENCE", "MEDIUM", "robots.txt does not reference a sitemap")
        if 'disallow' in robots.lower():
            disallows = re.findall(r'[Dd]isallow:\s*(.*)', robots)
            for d in disallows:
                if d.strip():
                    add("robots.txt", "DISALLOW RULE", "INFO", f"Disallow: {d.strip()}")
        break

if not robots_found:
    add("robots.txt", "ROBOTS.TXT MISSING", "HIGH", "No robots.txt found")


# === PRINT REPORT ===
print()
print(f"{'PAGE':<42} | {'ISSUE':<30} | {'SEV':<8} | DETAILS")
print("=" * 160)

current_page = None
for page, issue, severity, details in results:
    if page != current_page:
        if current_page is not None:
            print("-" * 160)
        current_page = page
    print(f"{page:<42} | {issue:<30} | {severity:<8} | {details}")

print("=" * 160)
print()
print("=== SEVERITY SUMMARY ===")
sev_counts = {}
for _, _, sev, _ in results:
    sev_counts[sev] = sev_counts.get(sev, 0) + 1
for sev in ["CRITICAL", "HIGH", "MEDIUM", "LOW", "WARN", "INFO", "OK"]:
    if sev in sev_counts:
        print(f"  {sev}: {sev_counts[sev]}")

# Count pages with issues
print()
print("=== ISSUES BY PAGE ===")
page_issues = {}
for page, issue, severity, _ in results:
    if severity not in ("OK", "INFO"):
        page_issues.setdefault(page, []).append((issue, severity))
for page, issues in page_issues.items():
    print(f"  {page}: {len(issues)} issues")
    for iss, sev in issues:
        print(f"    [{sev}] {iss}")
