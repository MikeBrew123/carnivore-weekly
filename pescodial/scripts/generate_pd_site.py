#!/usr/bin/env python3
"""
PescoDial site generator.

Renders the whole of pescodial.com from data/blog_posts.json (site == "pd" only)
and the Jinja templates in pescodial/templates/ into pescodial/public/.

PescoDial has no legacy hand-built pages, so a full re-render is safe here.
That is deliberately different from KetoDial (ISSUE-026): every PD page comes
from a template or from blog_posts.json, never from hand-edited output.

Usage:
    python3 pescodial/scripts/generate_pd_site.py
    python3 pescodial/scripts/generate_pd_site.py --data X.json --out DIR   # tests
"""

import argparse
import json
import re
import shutil
import sys
from datetime import date
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

SITE = "pd"
DOMAIN = "https://www.pescodial.com"
ROOT = Path(__file__).resolve().parents[2]
PD_DIR = ROOT / "pescodial"
TEMPLATES = PD_DIR / "templates"
STATIC = PD_DIR / "static"
DEFAULT_DATA = ROOT / "data" / "blog_posts.json"
DEFAULT_OUT = PD_DIR / "public"

# Static pages rendered from templates/pages/<name>.html -> <out>/<path>
PAGES = {
    "index.html": "",
    "calculator.html": "calculator/",
    "about.html": "about/",
    "privacy.html": "privacy/",
    "contact.html": "contact/",
    "404.html": "404.html",
}
# Pages kept out of the sitemap. /calculator/ duplicates the homepage tool, so it
# points its canonical at / (CANONICAL_TO) instead of competing with it.
NOINDEX_PAGES = {"404.html", "calculator.html"}
CANONICAL_TO = {"calculator.html": ""}

# Foreign domains that must never appear as same-site links in PD output.
FOREIGN_HOSTS = ("carnivoreweekly.com", "ketodial.com")

# Until Brew approves launch, every page is noindex and robots.txt disallows all,
# so the *.pages.dev preview can never be indexed ahead of the real domain.
PRELAUNCH = True

# The $29 upgrade card stays hidden until Brew approves selling (Stripe test buy
# done, every style's report verified). Tests render with --paid-preview.
PAID_REPORT_LIVE = False


def is_published(post):
    status = post.get("status")
    if status:
        return status == "published"
    return str(post.get("published")).lower() == "true"


def load_pd_posts(data_path):
    with open(data_path, encoding="utf-8") as f:
        posts = json.load(f).get("blog_posts", [])
    # Explicit match only: a post with no site tag is never PescoDial.
    pd = [p for p in posts if p.get("site") == SITE and is_published(p)]
    pd.sort(key=lambda p: p.get("date", ""), reverse=True)
    return pd


def render_site(data_path=DEFAULT_DATA, out_dir=DEFAULT_OUT, paid_preview=False):
    out_dir = Path(out_dir)
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    posts = load_pd_posts(data_path)
    ctx = {"domain": DOMAIN, "posts": posts, "build_date": date.today().isoformat(), "prelaunch": PRELAUNCH, "paid_report_live": PAID_REPORT_LIVE or paid_preview}

    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)
    if STATIC.exists():
        shutil.copytree(STATIC, out_dir, dirs_exist_ok=True)

    urls = []
    for tpl, path in PAGES.items():
        dest = out_dir / path if path.endswith(".html") else (out_dir / path / "index.html" if path else out_dir / "index.html")
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(env.get_template(f"pages/{tpl}").render(**ctx, canonical=f"{DOMAIN}/{CANONICAL_TO.get(tpl, path)}"), encoding="utf-8")
        if tpl not in NOINDEX_PAGES:
            urls.append((f"{DOMAIN}/{path}", ctx["build_date"]))

    post_tpl = env.get_template("post.html")
    for post in posts:
        dest = out_dir / "guides" / post["slug"] / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        canonical = f"{DOMAIN}/guides/{post['slug']}/"
        dest.write_text(post_tpl.render(**ctx, post=post, canonical=canonical), encoding="utf-8")
        urls.append((canonical, post.get("date_modified") or post.get("date", "")))

    guides = out_dir / "guides" / "index.html"
    guides.parent.mkdir(parents=True, exist_ok=True)
    guides.write_text(env.get_template("guides.html").render(**ctx, canonical=f"{DOMAIN}/guides/"), encoding="utf-8")
    # An empty guides index is thin content: keep it out of the sitemap (and noindex,
    # see guides.html) until the first guide is published.
    if posts:
        urls.append((f"{DOMAIN}/guides/", ctx["build_date"]))

    (out_dir / "sitemap.xml").write_text(env.get_template("sitemap.xml").render(urls=urls), encoding="utf-8")
    robots = "User-agent: *\nDisallow: /\n" if PRELAUNCH else f"User-agent: *\nAllow: /\n\nSitemap: {DOMAIN}/sitemap.xml\n"
    (out_dir / "robots.txt").write_text(robots, encoding="utf-8")
    return posts, urls


def check_output(out_dir, posts):
    """Fail on broken internal links or posts from another site in the output."""
    out_dir = Path(out_dir)
    problems = []
    for page in out_dir.rglob("*.html"):
        html = page.read_text(encoding="utf-8")
        for href in re.findall(r'href="(/[^"#?]*)', html):
            target = out_dir / href.lstrip("/")
            if not (target.is_file() or (target / "index.html").is_file()):
                problems.append(f"{page.relative_to(out_dir)}: broken internal link {href}")
    slugs = {p["slug"] for p in posts}
    for d in (out_dir / "guides").iterdir() if (out_dir / "guides").exists() else []:
        if d.is_dir() and d.name not in slugs:
            problems.append(f"guides/{d.name}: not a published PescoDial post")
    return problems


def main():
    ap = argparse.ArgumentParser(description="Render pescodial.com")
    ap.add_argument("--data", default=str(DEFAULT_DATA))
    ap.add_argument("--out", default=str(DEFAULT_OUT))
    ap.add_argument("--paid-preview", action="store_true", help="show the upgrade card (tests only; never deploy)")
    args = ap.parse_args()
    posts, urls = render_site(args.data, args.out, paid_preview=args.paid_preview)
    problems = check_output(args.out, posts)
    if problems:
        print("❌ PescoDial output check failed:")
        for p in problems:
            print("   " + p)
        return 1
    print(f"✅ PescoDial rendered: {len(posts)} guides, {len(urls)} sitemap URLs → {args.out}")


if __name__ == "__main__":
    sys.exit(main())
