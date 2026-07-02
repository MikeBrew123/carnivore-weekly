#!/usr/bin/env python3
"""Check GSC URL Inspection API for 404s and indexing issues."""

import json
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

sys.stdout.reconfigure(line_buffering=True)

from google.oauth2 import service_account
from googleapiclient.discovery import build

CREDS_PATH = Path(__file__).parent.parent / "dashboard" / "ga4-credentials.json"
SITEMAP_PATH = Path(__file__).parent.parent / "public" / "sitemap.xml"
SITE_URL = "sc-domain:carnivoreweekly.com"

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]


def get_service():
    creds = service_account.Credentials.from_service_account_file(
        str(CREDS_PATH), scopes=SCOPES
    )
    return build("searchconsole", "v1", credentials=creds)


def parse_sitemap():
    tree = ET.parse(str(SITEMAP_PATH))
    root = tree.getroot()
    ns = {"ns": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    return [loc.text.strip() for loc in root.findall(".//ns:loc", ns)]


def inspect_url(service, url):
    """Inspect a single URL via the URL Inspection API."""
    body = {
        "inspectionUrl": url,
        "siteUrl": SITE_URL,
    }
    try:
        result = service.urlInspection().index().inspect(body=body).execute()
        return result
    except Exception as e:
        return {"error": str(e)}


def main():
    service = get_service()
    urls = parse_sitemap()
    print(f"Sitemap has {len(urls)} URLs")

    # Also check common old patterns that might 404
    old_patterns = [
        "https://carnivoreweekly.com/blog/adhd-connection.html",
        "https://carnivoreweekly.com/blog/ground-beef-budget.html",
        "https://carnivoreweekly.com/blog/lion-diet-research.html",
        "https://carnivoreweekly.com/blog/pcos-hormones.html",
        "https://carnivoreweekly.com/blog/index.html",
        "https://carnivoreweekly.com/channels.html",
        "https://carnivoreweekly.com/wiki/",
        "https://carnivoreweekly.com/wiki/carnivore-diet",
        "https://carnivoreweekly.com/about.html",
        "https://carnivoreweekly.com/subscribe",
        "https://carnivoreweekly.com/newsletter",
        "https://carnivoreweekly.com/tools",
        "https://carnivoreweekly.com/recipes",
        "https://carnivoreweekly.com/sitemap.xml",
    ]

    all_urls = urls + [u for u in old_patterns if u not in urls]
    print(f"Total URLs to check: {len(all_urls)}")

    # Rate limit: 600/min, 2000/day. Check all sitemap URLs + old patterns.
    # With 159 sitemap + ~14 old = ~173 total, well within limits.
    issues = []
    not_indexed = []
    errors = []

    for i, url in enumerate(all_urls):
        if i > 0 and i % 50 == 0:
            print(f"  ...checked {i}/{len(all_urls)}")

        result = inspect_url(service, url)

        if "error" in result:
            errors.append((url, result["error"]))
            # Rate limit backoff
            if "429" in str(result["error"]) or "quota" in str(result["error"]).lower():
                print("  Rate limited, waiting 60s...")
                time.sleep(60)
            continue

        inspection = result.get("inspectionResult", {})
        index_status = inspection.get("indexStatusResult", {})
        verdict = index_status.get("verdict", "UNKNOWN")
        coverage = index_status.get("coverageState", "")
        page_fetch = index_status.get("pageFetchState", "")
        crawled_as = index_status.get("crawledAs", "")
        robots = index_status.get("robotsTxtState", "")
        indexing = index_status.get("indexingState", "")
        last_crawl = index_status.get("lastCrawlTime", "")
        referring = index_status.get("referringUrls", [])

        is_from_sitemap = url in urls
        source = "sitemap" if is_from_sitemap else "old-pattern"

        if verdict != "PASS":
            issues.append({
                "url": url,
                "source": source,
                "verdict": verdict,
                "coverage": coverage,
                "page_fetch": page_fetch,
                "robots": robots,
                "indexing": indexing,
                "last_crawl": last_crawl,
            })

        # Small delay to stay well under rate limits
        time.sleep(0.15)

    # Print results
    print("\n" + "=" * 70)
    print("GSC URL INSPECTION RESULTS")
    print("=" * 70)

    if issues:
        print(f"\n--- ISSUES FOUND ({len(issues)}) ---\n")
        for item in issues:
            print(f"  {item['url']}")
            print(f"    Source: {item['source']} | Verdict: {item['verdict']}")
            print(f"    Coverage: {item['coverage']}")
            print(f"    Fetch: {item['page_fetch']} | Robots: {item['robots']}")
            print(f"    Indexing: {item['indexing']} | Last crawl: {item['last_crawl']}")
            print()
    else:
        print("\nNo indexing issues found.")

    if errors:
        print(f"\n--- API ERRORS ({len(errors)}) ---\n")
        for url, err in errors[:10]:
            print(f"  {url}")
            # Truncate long error messages
            print(f"    Error: {err[:200]}")
            print()

    # Summary
    total_checked = len(all_urls)
    print(f"\nSummary: {total_checked} checked, {len(issues)} issues, {len(errors)} API errors")


if __name__ == "__main__":
    main()
