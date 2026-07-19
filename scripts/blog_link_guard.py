#!/usr/bin/env python3
"""Guard against cross-site / dead CW blog links (ISSUE-038).

The CW homepage editorial (weekly_summary) is LLM-written and has repeatedly
cited `/blog/<slug>.html` links to posts that don't exist as live CW pages —
usually a `site:"kd"` post that lives on ketodial.com, or a hallucinated
date/slug. A CW-relative href to a non-CW post 404s on carnivoreweekly.com and
blocks the publisher as a CRITICAL broken-link error.

`sanitize_cw_blog_links` strips any `/blog/<slug>.html` link whose target file
does NOT exist under the CW `public/blog/` dir, keeping the anchor TEXT so the
editorial prose survives (matches the manual fix that's been applied 4x). Works
on both markdown `[text](/blog/x.html)` and HTML `<a href="/blog/x.html">text</a>`.

Use at BOTH ends: content_analyzer (clean the data it writes) and generate.py
(last line of defense before public/index.html ships).
"""
import os
import re

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_PUBLIC = os.path.join(_ROOT, "public")

_MD_LINK = re.compile(r"\[([^\]]+)\]\(\s*/blog/([a-z0-9][a-z0-9-]*)\.html\s*\)")
_HTML_LINK = re.compile(
    r'<a\b[^>]*\bhref=["\']/blog/([a-z0-9][a-z0-9-]*)\.html["\'][^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)


def _is_live_cw_post(slug, public_dir):
    """A valid target is a rendered CW page on disk (KD posts live elsewhere)."""
    return os.path.exists(os.path.join(public_dir, "blog", slug + ".html"))


def sanitize_cw_blog_links(text, public_dir=_DEFAULT_PUBLIC):
    """Return (clean_text, removed_slugs). Dead /blog/ links become plain text."""
    if not text:
        return text, []
    removed = []

    def md_sub(m):
        anchor, slug = m.group(1), m.group(2)
        if _is_live_cw_post(slug, public_dir):
            return m.group(0)
        removed.append(slug)
        return anchor

    def html_sub(m):
        slug, inner = m.group(1), m.group(2)
        if _is_live_cw_post(slug, public_dir):
            return m.group(0)
        removed.append(slug)
        return inner

    text = _MD_LINK.sub(md_sub, text)
    text = _HTML_LINK.sub(html_sub, text)
    return text, removed


if __name__ == "__main__":
    # tiny self-test / CLI: sanitize stdin, report removals on stderr
    import sys
    data = sys.stdin.read()
    clean, removed = sanitize_cw_blog_links(data)
    if removed:
        sys.stderr.write("stripped dead CW /blog/ links: %s\n" % ", ".join(removed))
    sys.stdout.write(clean)
