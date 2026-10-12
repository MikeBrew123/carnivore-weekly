#!/usr/bin/env python3
"""PescoDial publish-path helpers, used by the GitHub workflows.

Kept as one small script so the workflow logic is testable
(tests/test_pd_publish_pipeline.py) instead of living in YAML heredocs.

  newly-published BEFORE AFTER   URLs of pd posts published in AFTER but not BEFORE
  published-urls [--data F]      URLs of every published pd post
  stuck [--days N] [--data F]    pd posts still "ready" whose publish_date is
                                 more than N days old (held by the cap, or a
                                 failed publish). Prints "slug publish_date".

Always exits 0 on success; the caller decides what a non-empty result means.
"""

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA = ROOT / "data" / "blog_posts.json"
DOMAIN = "https://www.pescodial.com"


def load(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("blog_posts", []) if isinstance(data, dict) else data


def guide_url(slug):
    return f"{DOMAIN}/guides/{slug}/"


def published_slugs(posts):
    return [p["slug"] for p in posts if p.get("site") == "pd" and p.get("status") == "published"]


def newly_published(before, after):
    old = set(published_slugs(before))
    return [s for s in published_slugs(after) if s not in old]


def stuck(posts, days=8, today=None):
    today = date.fromisoformat(today) if today else date.today()
    cutoff = (today - timedelta(days=days)).isoformat()
    return [
        (p["slug"], p.get("publish_date", ""))
        for p in posts
        if p.get("site") == "pd" and p.get("status") == "ready"
        and p.get("publish_date") and p["publish_date"] < cutoff
    ]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    n = sub.add_parser("newly-published")
    n.add_argument("before")
    n.add_argument("after")
    p = sub.add_parser("published-urls")
    p.add_argument("--data", default=str(DEFAULT_DATA))
    s = sub.add_parser("stuck")
    s.add_argument("--data", default=str(DEFAULT_DATA))
    s.add_argument("--days", type=int, default=8)
    s.add_argument("--today")
    args = ap.parse_args(argv)

    if args.cmd == "newly-published":
        for slug in newly_published(load(args.before), load(args.after)):
            print(guide_url(slug))
    elif args.cmd == "published-urls":
        for slug in published_slugs(load(args.data)):
            print(guide_url(slug))
    elif args.cmd == "stuck":
        for slug, d in stuck(load(args.data), args.days, args.today):
            print(f"{slug} {d}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
