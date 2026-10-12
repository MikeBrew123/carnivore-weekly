#!/usr/bin/env python3
"""
PescoDial site generator.

Renders the whole of pescodial.com from data/blog_posts.json (site == "pd" only)
and the Jinja templates in pescodial/templates/ into pescodial/public/.

PescoDial has no legacy hand-built pages, so a full re-render is safe here.
That is deliberately different from KetoDial (ISSUE-026): every PD page comes
from a template or from blog_posts.json, never from hand-edited output.

Every pd post with status "ready" or "published" is validated against the post
contract (validate_pd_posts) BEFORE anything is rendered. Any problem exits 1 and
nothing is written, so an unattended job can never ship a bad PD post.

Usage:
    python3 pescodial/scripts/generate_pd_site.py
    python3 pescodial/scripts/generate_pd_site.py --check-only            # validate, render nothing
    python3 pescodial/scripts/generate_pd_site.py --data X.json --out DIR   # tests
"""

import argparse
import json
import re
from html import escape as html_escape
import shutil
import sys
from datetime import date
from html.parser import HTMLParser
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
    "gift.html": "gift/",
    "gift-redeem.html": "gift/redeem/",
    "404.html": "404.html",
}
# Pages kept out of the sitemap. /calculator/ duplicates the homepage tool, so it
# points its canonical at / (CANONICAL_TO) instead of competing with it.
NOINDEX_PAGES = {"404.html", "calculator.html", "gift-redeem.html"}
CANONICAL_TO = {"calculator.html": ""}

# Foreign domains that must never appear as same-site links in PD output.
FOREIGN_HOSTS = ("carnivoreweekly.com", "ketodial.com")

# Until Brew approves launch, every page is noindex and robots.txt disallows all,
# so the *.pages.dev preview can never be indexed ahead of the real domain.
PRELAUNCH = False

# The $29 upgrade card stays hidden until Brew approves selling (Stripe test buy
# done, every style's report verified). Tests render with --paid-preview.
PAID_REPORT_LIVE = True


# Byline bio lines. Plain role only: never invent credentials for a writer.
AUTHORS = {
    "sarah": {"name": "Sarah", "bio": "Sarah, the PescoDial writer"},
    "marcus": {"name": "Marcus", "bio": "Marcus, the PescoDial writer"},
}
RELATED_COUNT = 3


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


def is_candidate(post):
    """pd posts the validator must see: ready (scheduled) or already published."""
    return post.get("site") == SITE and (post.get("status") in ("ready", "published") or is_published(post))


def load_pd_candidates(data_path):
    with open(data_path, encoding="utf-8") as f:
        posts = json.load(f).get("blog_posts", [])
    return [p for p in posts if is_candidate(p)]


def pick_related(post, published):
    """Up to 3 OTHER published PD posts: post["related"] first, then newest."""
    by_slug = {p["slug"]: p for p in published}
    chosen = []
    for slug in post.get("related") or []:
        p = by_slug.get(slug)
        if p and p["slug"] != post["slug"] and p not in chosen:
            chosen.append(p)
    for p in published:  # already sorted newest first
        if len(chosen) >= RELATED_COUNT:
            break
        if p["slug"] != post["slug"] and p not in chosen:
            chosen.append(p)
    return chosen[:RELATED_COUNT]


def long_date(value):
    try:
        d = date.fromisoformat(str(value)[:10])
    except ValueError:
        return value
    return f"{d.strftime('%B')} {d.day}, {d.year}"


# ---------------------------------------------------------------------------
# Post contract validation (binding contract: pd-post-contract.md)
# ---------------------------------------------------------------------------

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ALLOWED_TAGS = {"p", "h2", "h3", "ul", "ol", "li", "strong", "em", "a", "table",
                "thead", "tbody", "tr", "th", "td", "blockquote", "aside"}
ALLOWED_ATTRS = {"a": {"href", "rel", "target", "title"}, "aside": {"class"},
                 "th": {"scope", "colspan", "rowspan"}, "td": {"colspan", "rowspan"}}
EM_DASHES = ("\u2014", "&mdash;", "&#8212;", "&#x2014;")
FACT_CHECK_MARKERS = ("[[", "VERIFY")
DOSE_RE = re.compile(r"\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|\u00b5g|iu|g|grams?|milligrams?|micrograms?)\b", re.I)
# Food content figures ("3 oz salmon has about 1.8 g of omega-3") are allowed;
# a number next to a supplement word is a dose and is not (2026-10-12).
SUPPLEMENT_RE = re.compile(r"fish oil|krill oil|cod liver oil|supplement|capsule|pill|softgel|tablet|gummies|gummy", re.I)
CALC_HREF_RE = re.compile(r"^(?:https://(?:www\.)?pescodial\.com)?/calculator/(?:[#?].*)?$")
GUIDE_HREF_RE = re.compile(r"^(?:https://(?:www\.)?pescodial\.com)?/guides/([^/#?]+)/(?:[#?].*)?$")
PD_STATIC_PATHS = {"/", "/about/", "/contact/", "/privacy/", "/guides/", "/calculator/"}
WORDS_MIN, WORDS_MAX = 900, 1600
CATEGORIES = ("health", "meal-plan", "nutrition")
LIMITS = {"title": (1, 65), "meta_description": (120, 160), "excerpt": (1, 200)}


class _Scan(HTMLParser):
    """Collects tags, attributes, links (with word offset) and visible text."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.tags, self.links, self.text, self.h2 = [], [], [], []
        self.asides, self._in_aside, self._in_h2 = [], 0, None

    def words_so_far(self):
        return len(" ".join(self.text).split())

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append((tag, attrs))
        if tag == "a":
            self.links.append((a.get("href") or "", self.words_so_far()))
        if tag == "aside":
            self.asides.append({"class": a.get("class") or "", "text": []})
            self._in_aside += 1
        if tag == "h2":
            self._in_h2 = []
        # Block tags break words apart in the visible text.
        self.text.append(" ")

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "aside" and self._in_aside:
            self._in_aside -= 1
        if tag == "h2" and self._in_h2 is not None:
            self.h2.append(" ".join("".join(self._in_h2).split()))
            self._in_h2 = None
        self.text.append(" ")

    def handle_data(self, data):
        self.text.append(data)
        if self._in_aside and self.asides:
            self.asides[-1]["text"].append(data)
        if self._in_h2 is not None:
            self._in_h2.append(data)

    def visible(self):
        return " ".join("".join(self.text).split())


def _section_after_h2(content, heading_re):
    """HTML between the h2 whose text matches heading_re and the next h2 (or end)."""
    for m in re.finditer(r"<h2[^>]*>(.*?)</h2>", content, re.I | re.S):
        if heading_re.match(re.sub(r"<[^>]+>", "", m.group(1)).strip()):
            rest = content[m.end():]
            nxt = re.search(r"<h2[\s>]", rest, re.I)
            return rest[: nxt.start()] if nxt else rest
    return None


def _check_fields(post, err):
    for field in ("slug", "title", "meta_description", "excerpt", "author", "date",
                  "publish_date", "scheduled_date", "status", "category", "topic_id", "content"):
        if not str(post.get(field) or "").strip():
            err(f"missing required field '{field}'")
    for field, (lo, hi) in LIMITS.items():
        n = len(str(post.get(field) or ""))
        if post.get(field) and not lo <= n <= hi:
            err(f"{field} is {n} chars (contract: {lo}-{hi})")
    if post.get("author") and post["author"] not in AUTHORS:
        err(f"author '{post['author']}' is not one of {sorted(AUTHORS)}")
    if "published" not in post:
        err("missing required field 'published'")
    elif not isinstance(post["published"], bool):
        err(f"published must be true or false, got {post['published']!r}")
    elif post.get("status") == "published" and post["published"] is not True:
        err("status is published but published is false")
    elif post.get("status") == "ready" and post["published"] is not False:
        err("status is ready but published is true")
    if post.get("category") and post["category"] not in CATEGORIES:
        err(f"category '{post['category']}' is not one of {list(CATEGORIES)}")
    for field in ("date", "publish_date", "scheduled_date"):
        v = str(post.get(field) or "")
        if v:
            try:
                if not DATE_RE.match(v):
                    raise ValueError
                date.fromisoformat(v)
            except ValueError:
                err(f"{field} '{v}' is not a YYYY-MM-DD date")
    trio = {f: post.get(f) for f in ("date", "publish_date", "scheduled_date") if post.get(f)}
    if len(set(trio.values())) > 1:
        err("date, publish_date and scheduled_date must be equal (" + ", ".join(f"{k}={v}" for k, v in trio.items()) + ")")
    if "image" in post:
        err("has an 'image' field (PD posts use the site og.png, no paid images)")
    rel = post.get("related")
    if rel is not None and not (isinstance(rel, list) and all(isinstance(x, str) for x in rel)):
        err("related must be a list of slugs")


def _check_links(post, scan, by_slug, err):
    my_date = post.get("date") or ""
    for href, _ in scan.links:
        h = href.strip()
        low = h.lower()
        if not h:
            err("a link has an empty href")
            continue
        if low.startswith("http://"):
            err(f"link {h} is not https")
            continue
        if low.startswith("https://"):
            host = re.sub(r"^https://", "", low).split("/")[0]
            if host.endswith("carnivoreweekly.com") and re.search(r"ldl|cholesterol", low):
                err(f"link {h} points at a Carnivore Weekly LDL/cholesterol page (never link these from PD)")
            m = GUIDE_HREF_RE.match(h)
            if m:
                _check_guide_target(m.group(1), my_date, by_slug, err, h)
            continue
        if low.startswith(("mailto:", "#")):
            continue
        if not h.startswith("/"):
            err(f"link {h} is not root-relative or https (relative links break and may point at another site)")
            continue
        if re.search(r"carnivore|ketodial|/blog/", low):
            err(f"relative link {h} is a Carnivore Weekly/KetoDial path; use the full https:// URL")
            continue
        m = GUIDE_HREF_RE.match(h)
        if m:
            _check_guide_target(m.group(1), my_date, by_slug, err, h)
            continue
        if h.split("#")[0].split("?")[0] not in PD_STATIC_PATHS:
            err(f"relative link {h} is not a PescoDial page")


def _check_guide_target(slug, my_date, by_slug, err, href):
    target = by_slug.get(slug)
    if target is None:
        err(f"internal link {href} points at '{slug}', which is not a published or ready PD post")
    elif not is_published(target) and (target.get("date") or "9999") > my_date:
        err(f"internal link {href} points at ready post '{slug}' dated {target.get('date')}, after this post's date {my_date}")


def validate_post(post, by_slug):
    """All contract problems for one pd post, each prefixed with its slug."""
    slug = post.get("slug") or "<no slug>"
    problems = []

    def err(msg):
        problems.append(f"{slug}: {msg}")

    _check_fields(post, err)
    if post.get("slug") and not SLUG_RE.match(post["slug"]):
        err("slug must match ^[a-z0-9]+(-[a-z0-9]+)*$ (lowercase words and hyphens, no date prefix)")

    for field in ("title", "meta_description", "excerpt", "content"):
        val = str(post.get(field) or "")
        if any(d in val for d in EM_DASHES):
            err(f"em-dash in {field} (house rule: no em-dashes)")
        for marker in FACT_CHECK_MARKERS:
            if marker in val:
                err(f"unresolved fact-check marker '{marker}' in {field}")

    content = str(post.get("content") or "")
    scan = _Scan()
    scan.feed(content)
    scan.close()
    visible = scan.visible()

    for tag, attrs in scan.tags:
        if tag not in ALLOWED_TAGS:
            err(f"disallowed tag <{tag}> in content")
        for name, value in attrs:
            if name == "style":
                err(f"inline style attribute on <{tag}>")
            elif name.startswith("on"):
                err(f"event handler attribute {name} on <{tag}>")
            elif name not in ALLOWED_ATTRS.get(tag, set()):
                err(f"attribute '{name}' not allowed on <{tag}>")
        if tag == "aside" and (dict(attrs).get("class") or "") != "med-note":
            err('every <aside> must be <aside class="med-note">')

    med = [a for a in scan.asides if a["class"] == "med-note"]
    if len(med) != 1:
        err(f'needs exactly one <aside class="med-note">, found {len(med)}')
    elif not re.search(r"\b(doctor|pharmacist)s?\b", "".join(med[0]["text"]), re.I):
        err("med-note does not send the reader to a doctor or pharmacist")

    calc_at = [w for href, w in scan.links if CALC_HREF_RE.match(href.strip())]
    if not calc_at or min(calc_at) >= 300:
        err("no /calculator/ link in the first 300 words of visible text")

    if not any(re.match(r"when to talk to your doctor\b", h, re.I) for h in scan.h2):
        err('missing "When to talk to your doctor" h2')

    sources = _section_after_h2(content, re.compile(r"sources\s*$", re.I))
    if sources is None:
        err('missing "Sources" h2')
    else:
        ext = [h for h in re.findall(r'href="([^"]+)"', sources)
               if h.startswith("https://") and "pescodial.com" not in h]
        if "<ul" not in sources.lower() or len(ext) < 2:
            err(f"Sources section needs a <ul> with at least 2 external https links (found {len(ext)})")

    for m in DOSE_RE.finditer(visible):
        # The sentence the dose sits in.
        start = max(visible.rfind(". ", 0, m.start()), visible.rfind("? ", 0, m.start()), visible.rfind("! ", 0, m.start()))
        ends = [i for i in (visible.find(". ", m.end()), visible.find("? ", m.end()), visible.find("! ", m.end())) if i != -1]
        sentence = visible[start + 1: min(ends) if ends else len(visible)]
        if SUPPLEMENT_RE.search(sentence):
            err(f"supplement dose '{m.group(0)}' near fish oil/supplement/capsule/pill (contract: no supplement doses)")
            break

    n = len(visible.split())
    if content and not WORDS_MIN <= n <= WORDS_MAX:
        err(f"word count {n} is outside {WORDS_MIN}-{WORDS_MAX}")

    _check_links(post, scan, by_slug, err)
    for rel in post.get("related") or []:
        if isinstance(rel, str) and rel not in by_slug:
            err(f"related slug '{rel}' is not a published or ready PD post")
    return problems


def validate_pd_posts(posts):
    """Validate every ready/published pd post. Returns a list of problems ([] = ok)."""
    posts = [p for p in posts if is_candidate(p)]
    problems = []
    seen, dates = {}, {}
    for p in posts:
        s = p.get("slug")
        if s in seen:
            problems.append(f"{s}: duplicate slug (another pd post already uses it)")
        seen.setdefault(s, p)
        d = p.get("publish_date") or p.get("date")
        if d:
            if d in dates:
                problems.append(f"{s}: shares publish_date {d} with '{dates[d]}' (never two PD posts on one date)")
            else:
                dates[d] = s
    for p in posts:
        problems.extend(validate_post(p, seen))
    return problems



def stack_tables(html):
    """Wrap each content table and label every cell with its column header, so
    the CSS can stack a wide table into one card per row on a phone (a 4-column
    meal plan was cut off at 375px, 2026-10-12)."""
    def one(m):
        table = m.group(0)
        heads = [re.sub(r"<[^>]+>", "", h).strip()
                 for h in re.findall(r"<th\b[^>]*>(.*?)</th>", (re.search(r"<thead\b.*?</thead>", table, re.S) or m).group(0), re.S)]
        if not heads:
            return f'<div class="post-table">{table}</div>'

        def row(r):
            i = 0

            def cell(c):
                nonlocal i
                label = heads[i] if i < len(heads) else ""
                i += 1
                return f'<{c.group(1)} data-label="{html_escape(label, quote=True)}"{c.group(2)}>'
            return re.sub(r"<(td|th)\b([^>]*)>", cell, r.group(0))
        body = re.sub(r"<tbody\b.*?</tbody>", lambda b: re.sub(r"<tr\b.*?</tr>", row, b.group(0), flags=re.S), table, flags=re.S)
        return f'<div class="post-table">{body}</div>'
    return re.sub(r"<table\b.*?</table>", one, html, flags=re.S)

def render_site(data_path=DEFAULT_DATA, out_dir=DEFAULT_OUT, paid_preview=False):
    out_dir = Path(out_dir)
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    env.filters["longdate"] = long_date
    env.filters["stack_tables"] = stack_tables
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
        dest.write_text(post_tpl.render(**ctx, post=post, canonical=canonical,
                                        author=AUTHORS.get(post.get("author") or "sarah", AUTHORS["sarah"]),
                                        related=pick_related(post, posts)), encoding="utf-8")
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
    ap.add_argument("--check-only", action="store_true", help="validate ready/published pd posts against the contract; render nothing")
    args = ap.parse_args()
    candidates = load_pd_candidates(args.data)
    bad = validate_pd_posts(candidates)
    if args.check_only:
        # Gate for the writing task: every ready and published post must pass.
        if bad:
            print(f"❌ PescoDial post contract failed ({len(bad)} problem(s)); nothing rendered:")
            for p in bad:
                print("   " + p)
            return 1
        print(f"✅ PescoDial post contract ok: {len(candidates)} ready/published pd post(s) checked")
        return 0
    # Render (deploy, daily publish): only problems on posts that will actually be
    # rendered block. A bad post still scheduled for later is a warning here, so it
    # can never stall today's publish or an unrelated deploy (review, 2026-10-12).
    live = {p.get("slug") for p in candidates if is_published(p)}
    blocking = [b for b in bad if b.split(":", 1)[0] in live]
    for b in bad:
        if b not in blocking:
            print("⚠️  not yet published, fix before its date: " + b)
    if blocking:
        print(f"❌ PescoDial post contract failed ({len(blocking)} problem(s)); nothing rendered:")
        for p in blocking:
            print("   " + p)
        return 1
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
