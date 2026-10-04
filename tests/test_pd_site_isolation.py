"""PescoDial isolation and cadence tests.

1. Only published site == "pd" posts render into the PD output; CW, KD,
   untagged and unpublished posts never do.
2. Prelaunch output is noindex everywhere and robots.txt disallows all.
3. The output check catches a foreign post directory and a broken link.
4. daily_publish holds PD posts beyond 2 per rolling 7 days; CW is uncapped.

Run: python3 tests/test_pd_site_isolation.py
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pescodial" / "scripts"))
sys.path.insert(0, str(ROOT / "scripts"))

import daily_publish  # noqa: E402
import generate_pd_site as pd  # noqa: E402


def post(slug, site, status="published", date="2026-10-01"):
    p = {"slug": slug, "title": slug, "content": "<p>x</p>", "author": "sarah",
         "status": status, "date": date, "publish_date": date, "excerpt": "e"}
    if site is not None:
        p["site"] = site
    return p


def render(tmp_path, posts):
    data = tmp_path / "posts.json"
    data.write_text(json.dumps({"blog_posts": posts}))
    out = tmp_path / "out"
    rendered, urls = pd.render_site(data, out)
    return out, rendered, urls


def test_only_published_pd_posts_render(tmp_path):
    out, rendered, urls = render(tmp_path, [
        post("2026-10-01-pd-food-list", "pd"),
        post("2026-10-01-cw-steak", "cw"),
        post("2026-10-01-kd-macros", "kd"),
        post("2026-10-01-untagged", None),
        post("2026-10-02-pd-draft", "pd", status="ready"),
    ])
    guides = sorted(d.name for d in (out / "guides").iterdir() if d.is_dir())
    assert guides == ["2026-10-01-pd-food-list"], guides
    sitemap = (out / "sitemap.xml").read_text()
    assert "cw-steak" not in sitemap and "kd-macros" not in sitemap and "untagged" not in sitemap
    assert "pd-draft" not in sitemap
    assert all(u.startswith("https://www.pescodial.com/") for u, _ in urls)


def test_prelaunch_is_noindex(tmp_path):
    out, _, _ = render(tmp_path, [post("2026-10-01-pd-food-list", "pd")])
    assert pd.PRELAUNCH is True
    assert (out / "robots.txt").read_text().startswith("User-agent: *\nDisallow: /")
    for page in out.rglob("*.html"):
        assert 'name="robots" content="noindex' in page.read_text(), page


def test_output_check_catches_leaks_and_broken_links(tmp_path):
    out, rendered, _ = render(tmp_path, [post("2026-10-01-pd-food-list", "pd")])
    assert pd.check_output(out, rendered) == []
    (out / "guides" / "2026-10-01-cw-steak").mkdir()
    (out / "about" / "index.html").write_text('<a href="/guides/missing/">x</a>')
    problems = pd.check_output(out, rendered)
    assert any("cw-steak" in p for p in problems), problems
    assert any("/guides/missing/" in p for p in problems), problems


def test_pd_weekly_cap_holds_extra_posts():
    posts = [
        post("a", "pd", date="2026-10-28"),
        post("b", "pd", status="ready", date="2026-10-30"),
        post("c", "pd", status="ready", date="2026-10-31"),
        post("d", "pd", status="ready", date="2026-11-01"),
    ]
    ready = [p for p in posts if p["status"] == "ready"]
    allowed, held = daily_publish.apply_weekly_cap(posts, ready, site="pd", today="2026-11-01")
    assert [p["slug"] for p in allowed] == ["b"]
    assert [p["slug"] for p in held] == ["c", "d"]
    # A week later the window has rolled past "a".
    allowed, held = daily_publish.apply_weekly_cap(posts, ready, site="pd", today="2026-11-05")
    assert len(allowed) == 2


def test_cw_is_not_capped():
    ready = [post(str(i), "cw", status="ready") for i in range(9)]
    allowed, held = daily_publish.apply_weekly_cap(ready, ready, site="cw", today="2026-10-01")
    assert len(allowed) == 9 and held == []


if __name__ == "__main__":
    import inspect
    import tempfile
    failed = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                if "tmp_path" in inspect.signature(fn).parameters:
                    with tempfile.TemporaryDirectory() as d:
                        fn(Path(d))
                else:
                    fn()
                print(f"PASS {name}")
            except AssertionError as e:
                failed += 1
                print(f"FAIL {name}: {e}")
    sys.exit(1 if failed else 0)
