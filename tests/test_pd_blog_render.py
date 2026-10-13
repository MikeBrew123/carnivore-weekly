"""PescoDial blog: template render and fail-closed post contract.

1. A contract-compliant post renders with breadcrumb, byline bio, the
   "not a doctor" note, Article schema, 3 static related links and the
   calculator CTA; the guides index lists it.
2. Every validator rule rejects a bad post with a named message
   (one test_rejects_<rule> per rule).
3. The CLI fails closed: --check-only exits 1 on a bad ready post and renders
   nothing; a full run exits 1 before writing output.

Run: python3 tests/test_pd_blog_render.py   (pytest also works)
"""

import copy
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pescodial" / "scripts"))

import generate_pd_site as pd  # noqa: E402

GEN = ROOT / "pescodial" / "scripts" / "generate_pd_site.py"

FILLER = ("Shrimp is a lean food that fits well in a heart friendly week when you cook it "
          "simply and keep the butter for special days at home with family. ")


# Kept outside the f-string: Python 3.11 (the CI runner) rejects backslashes
# inside f-string expressions.
DEFAULT_MED_NOTE = ('<aside class="med-note"><p><strong>If you take medicine:</strong> statins and '
                    'blood-pressure medicine keep working the same way. Ask your doctor or pharmacist '
                    'before you change anything.</p></aside>')


def body(intro_extra="", med="", extra=""):
    filler = "".join(f"<p>{FILLER * 4}</p>" for _ in range(6))
    return (
        f'<p>Most of us were told to fear shrimp. Start with your own numbers in the '
        f'<a href="/calculator/">free calculator</a> and read on. {intro_extra}</p>'
        f"{filler}"
        f'{med or DEFAULT_MED_NOTE}'
        f"<h2>What the research says</h2>{filler}"
        f"{extra}"
        "<h2>When to talk to your doctor</h2><p>Talk to your doctor if your numbers change.</p>"
        '<h2>Sources</h2><ul><li><a href="https://fdc.nal.usda.gov/">USDA FoodData Central</a></li>'
        '<li><a href="https://www.fda.gov/food/consumers/advice-about-eating-fish">FDA and EPA fish advice</a></li></ul>'
    )


def good_post(slug="is-shrimp-bad-for-cholesterol", day="2026-10-14", status="ready", **kw):
    p = {
        "site": "pd", "slug": slug, "title": "Is Shrimp Bad for Cholesterol? What Actually Raises LDL",
        "meta_description": ("Shrimp has dietary cholesterol, but for most people it is saturated fat that moves "
                             "LDL. Here is what to know if you love shrimp."),
        "excerpt": "Shrimp has cholesterol, but it is not the villain most of us were told it was.",
        "author": "sarah", "date": day, "publish_date": day, "scheduled_date": day,
        "status": status, "published": status == "published", "category": "health",
        "topic_id": "P7", "content": body(),
    }
    p.update(kw)
    return p


def problems_for(post, others=()):
    return pd.validate_pd_posts([post, *others])


def write_data(tmp_path, posts):
    data = tmp_path / "posts.json"
    data.write_text(json.dumps({"blog_posts": posts}))
    return data


# ---------------------------------------------------------------------------
# 1. Good post renders
# ---------------------------------------------------------------------------

def test_good_post_passes_validation():
    assert problems_for(good_post()) == []


def test_good_post_renders_with_related_cta_schema(tmp_path):
    posts = [
        good_post("is-shrimp-bad-for-cholesterol", "2026-10-20", "published", related=["best-fish-for-high-cholesterol"]),
        good_post("best-fish-for-high-cholesterol", "2026-10-17", "published"),
        good_post("fish-high-in-omega-3", "2026-10-14", "published"),
        good_post("is-pescatarian-healthy-after-50", "2026-10-10", "published"),
        good_post("how-much-fish-per-week", "2026-10-07", "published"),
        good_post("future-ready-post", "2026-10-24", "ready"),
    ]
    assert pd.validate_pd_posts(posts) == []
    out = tmp_path / "out"
    rendered, urls = pd.render_site(write_data(tmp_path, posts), out)
    assert pd.check_output(out, rendered) == []
    html = (out / "guides" / "is-shrimp-bad-for-cholesterol" / "index.html").read_text()
    # Breadcrumb Home > Guides, byline bio, not-a-doctor line near the top.
    assert '<nav class="crumbs"' in html and 'href="/guides/">Guides</a>' in html
    assert "Sarah, the PescoDial writer" in html
    assert "I&#39;m not a doctor. This is general information, not medical advice." in html \
        or "I'm not a doctor. This is general information, not medical advice." in html
    assert html.index("not a doctor") < html.index('class="prose post-body"')
    # Article schema.
    schemas = [json.loads(m) for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)]
    art = next(s for s in schemas if s["@type"] == "Article")
    assert art["headline"].startswith("Is Shrimp") and art["author"]["name"] == "Sarah"
    assert art["mainEntityOfPage"] == "https://www.pescodial.com/guides/is-shrimp-bad-for-cholesterol/"
    # Exactly 3 related links, preferred one first, never self, never the ready post.
    rel = re.search(r'<nav class="related".*?</nav>', html, re.S).group(0)
    hrefs = re.findall(r'href="(/guides/[^"]+)"', rel)
    assert hrefs == ["/guides/best-fish-for-high-cholesterol/", "/guides/fish-high-in-omega-3/",
                     "/guides/is-pescatarian-healthy-after-50/"], hrefs
    # CTA after related, med-note survives.
    assert html.index('class="related"') < html.index('class="calc-cta"')
    assert 'href="/calculator/">Try the free PescoDial calculator' in html
    assert html.count('<aside class="med-note">') == 1
    assert not (out / "guides" / "future-ready-post").exists()
    # Guides index lists posts with excerpt and date, and is indexable.
    idx = (out / "guides" / "index.html").read_text()
    assert 'href="/guides/how-much-fish-per-week/"' in idx and "October 20, 2026" in idx
    assert 'content="noindex' not in idx
    assert any(u == "https://www.pescodial.com/guides/" for u, _ in urls)


def test_empty_guides_index_stays_noindex(tmp_path):
    out = tmp_path / "out"
    pd.render_site(write_data(tmp_path, []), out)
    assert 'content="noindex' in (out / "guides" / "index.html").read_text()


# ---------------------------------------------------------------------------
# 2. Every rule rejects a bad post with a named message
# ---------------------------------------------------------------------------

def _set(**kw):
    return lambda p: p.update(kw)


def _content(fn):
    return lambda p: p.update(content=fn(p["content"]))


LONG = "Fresh shrimp is easy. " * 30

RULES = {
    # name: (mutation, expected message substring, extra posts)
    "missing_field": (lambda p: p.pop("topic_id"), "missing required field 'topic_id'", ()),
    "missing_published": (lambda p: p.pop("published"), "missing required field 'published'", ()),
    "published_mismatch": (_set(published=True), "status is ready but published is true", ()),
    "bad_category": (_set(category="recipes"), "category 'recipes' is not one of", ()),
    "missing_scheduled_date": (lambda p: p.pop("scheduled_date"), "missing required field 'scheduled_date'", ()),
    "date_trio_mismatch": (_set(scheduled_date="2026-10-15"), "date, publish_date and scheduled_date must be equal", ()),
    "title_too_long": (_set(title="T" * 66), "title is 66 chars", ()),
    "meta_too_short": (_set(meta_description="Too short."), "meta_description is 10 chars", ()),
    "excerpt_too_long": (_set(excerpt="E" * 201), "excerpt is 201 chars", ()),
    "bad_author": (_set(author="chloe"), "author 'chloe' is not one of", ()),
    "bad_date": (_set(date="2026-13-01", publish_date="2026-13-01", scheduled_date="2026-13-01"), "is not a YYYY-MM-DD date", ()),
    "image_field": (_set(image="/x.png"), "has an 'image' field", ()),
    "bad_slug": (_set(slug="2026-10-14-Shrimp_Post"), "slug must match", ()),
    "duplicate_slug": (lambda p: None, "duplicate slug", (good_post(day="2026-10-21"),)),
    "shared_publish_date": (lambda p: None, "shares publish_date 2026-10-14", (good_post("other-post"),)),
    "no_calculator_link": (_content(lambda c: c.replace('href="/calculator/"', 'href="/about/"')),
                           "no /calculator/ link in the first 300 words", ()),
    "calculator_link_too_late": (_content(lambda c: c.replace('<a href="/calculator/">free calculator</a>', "free calculator")
                                          .replace("<h2>When to talk", '<p><a href="/calculator/">calc</a></p><h2>When to talk')),
                                 "no /calculator/ link in the first 300 words", ()),
    "no_med_note": (_content(lambda c: re.sub(r'<aside class="med-note">.*?</aside>', "", c, flags=re.S)),
                    'needs exactly one <aside class="med-note">, found 0', ()),
    "two_med_notes": (_content(lambda c: c + '<aside class="med-note"><p>Ask your doctor.</p></aside>'),
                      'needs exactly one <aside class="med-note">, found 2', ()),
    "aside_wrong_class": (_content(lambda c: c + '<aside class="tip"><p>x</p></aside>'),
                          'every <aside> must be <aside class="med-note">', ()),
    "med_note_no_referral": (_content(lambda c: c.replace("Ask your doctor or pharmacist before you change anything.", "Keep going.")),
                             "med-note does not send the reader to a doctor or pharmacist", ()),
    "no_doctor_h2": (_content(lambda c: c.replace("<h2>When to talk to your doctor</h2>", "<h2>Next steps</h2>")),
                     'missing "When to talk to your doctor" h2', ()),
    "no_sources_h2": (_content(lambda c: c.replace("<h2>Sources</h2>", "<h2>Reading</h2>")), 'missing "Sources" h2', ()),
    "one_source": (_content(lambda c: re.sub(r'<li><a href="https://www.fda.gov[^<]*</a></li>', "", c)),
                   "Sources section needs a <ul> with at least 2 external https links (found 1)", ()),
    "script_tag": (_content(lambda c: c + "<script>alert(1)</script>"), "disallowed tag <script>", ()),
    "style_tag": (_content(lambda c: c + "<style>p{}</style>"), "disallowed tag <style>", ()),
    "iframe_tag": (_content(lambda c: c + '<iframe src="https://x.com"></iframe>'), "disallowed tag <iframe>", ()),
    "img_tag": (_content(lambda c: c + '<img src="/og.png" alt="">'), "disallowed tag <img>", ()),
    "h1_tag": (_content(lambda c: "<h1>Again</h1>" + c), "disallowed tag <h1>", ()),
    "inline_style": (_content(lambda c: c.replace("<p>Talk to", '<p style="color:red">Talk to')), "inline style attribute on <p>", ()),
    "em_dash_title": (_set(title="Shrimp \u2014 good or bad"), "em-dash in title", ()),
    "em_dash_meta": (lambda p: p.update(meta_description=p["meta_description"][:-10] + " \u2014 really."), "em-dash in meta_description", ()),
    "em_dash_excerpt": (_set(excerpt="Shrimp &mdash; fine."), "em-dash in excerpt", ()),
    "em_dash_content": (_content(lambda c: c.replace("and read on.", "\u2014 and read on.")), "em-dash in content", ()),
    "fact_check_brackets": (_content(lambda c: c.replace("and read on.", "and read on [[cite]].")), "unresolved fact-check marker '[[' in content", ()),
    "fact_check_verify": (_set(excerpt="Shrimp has cholesterol VERIFY number."), "unresolved fact-check marker 'VERIFY' in excerpt", ()),
    "supplement_dose": (_content(lambda c: c.replace("and read on.", "and read on. Some people take 1000 mg of fish oil a day.")),
                        "supplement dose '1000 mg'", ()),
    "supplement_dose_iu": (_content(lambda c: c.replace("and read on.", "and read on. A capsule with 400 IU is common.")),
                           "supplement dose '400 IU'", ()),
    "relative_cw_link": (_content(lambda c: c.replace("<p>Talk to", '<p><a href="/blog/2026-01-01-ldl/">CW</a> Talk to')),
                         "relative link /blog/2026-01-01-ldl/ is a Carnivore Weekly/KetoDial path", ()),
    "scheme_less_ketodial_link": (_content(lambda c: c.replace("<p>Talk to", '<p><a href="ketodial.com/macros/">KD</a> Talk to')),
                                  "is not root-relative or https", ()),
    "cw_ldl_link": (_content(lambda c: c.replace("<p>Talk to", '<p><a href="https://carnivoreweekly.com/blog/2026-02-02-high-ldl-on-carnivore/">CW</a> Talk to')),
                    "Carnivore Weekly LDL/cholesterol page", ()),
    "http_link": (_content(lambda c: c.replace("https://fdc.nal.usda.gov/", "http://fdc.nal.usda.gov/")), "is not https", ()),
    "too_short": (_content(lambda c: re.sub(r"(<p>Shrimp is a lean.*?</p>)+", "", c, flags=re.S)), "word count", ()),
    "too_long": (_content(lambda c: c.replace("and read on.", "and read on. " + LONG * 3)), "word count", ()),
    "guide_link_unknown": (_content(lambda c: c.replace("<p>Talk to", '<p><a href="/guides/no-such-post/">x</a> Talk to')),
                           "points at 'no-such-post', which is not a published or ready PD post", ()),
    "guide_link_future_ready": (_content(lambda c: c.replace("<p>Talk to", '<p><a href="/guides/later-post/">x</a> Talk to')),
                                "points at ready post 'later-post' dated 2026-10-21", (good_post("later-post", "2026-10-21"),)),
    "related_unknown": (_set(related=["ghost-post"]), "related slug 'ghost-post' is not a published or ready PD post", ()),
}


def _make_rule_test(name, mutate, expected, others):
    def test():
        p = good_post()
        mutate(p)
        problems = problems_for(p, [copy.deepcopy(o) for o in others])
        assert any(expected in x for x in problems), f"{name}: expected '{expected}' in {problems}"
    test.__name__ = f"test_rejects_{name}"
    return test


for _name, (_mut, _exp, _others) in RULES.items():
    globals()[f"test_rejects_{_name}"] = _make_rule_test(_name, _mut, _exp, _others)


def test_ready_link_to_earlier_ready_post_is_ok():
    earlier = good_post("best-fish-for-high-cholesterol", "2026-10-10")
    p = good_post(content=body(extra='<p>See <a href="/guides/best-fish-for-high-cholesterol/">best fish</a>.</p>'))
    assert problems_for(p, [earlier]) == []


def test_food_numbers_without_supplement_words_are_ok():
    p = good_post(content=body(intro_extra="A 3 ounce serving has about 20 g of protein."))
    assert problems_for(p) == []


def test_food_omega3_figure_is_ok_but_supplement_dose_is_not():
    food = good_post(content=body(extra="<p>A 3 oz serving of cooked salmon has about 1.8 g of omega-3.</p>"))
    assert problems_for(food) == []
    pill = good_post(content=body(extra="<p>An omega-3 supplement with 1 g a day is common.</p>"))
    assert any("supplement dose" in p for p in problems_for(pill))


def test_non_pd_and_draft_posts_are_not_validated():
    bad = good_post(title="T" * 99)
    assert pd.validate_pd_posts([dict(bad, site="cw"), dict(bad, status="draft")]) == []


def test_topic_queue_shape():
    q = json.loads((ROOT / "data" / "pd_topic_queue.json").read_text())
    items = q["queue"] + q["later"]
    assert [i["id"] for i in q["queue"]] == ["P7", "P2", "P8", "P4", "P3", "P5"]
    assert len({i["id"] for i in items}) == len(items)
    for i in items:
        assert i["status"] in ("queued", "drafted", "published", "later"), i
        for k in ("id", "working_title", "keyword_evidence", "writer", "safety_note", "must_not_cannibalize", "status"):
            assert k in i, (i["id"], k)
    assert all(i["status"] == "later" for i in q["later"])
    assert next(i for i in q["queue"] if i["id"] == "P2")["writer"] == "marcus"
    assert "P1" not in {i["id"] for i in items}


# ---------------------------------------------------------------------------
# 3. CLI fails closed
# ---------------------------------------------------------------------------

def test_cli_check_only_fails_closed(tmp_path):
    out = tmp_path / "out"
    data = write_data(tmp_path, [good_post(title="T" * 70)])
    r = subprocess.run([sys.executable, str(GEN), "--check-only", "--data", str(data), "--out", str(out)],
                       capture_output=True, text=True)
    assert r.returncode == 1 and "title is 70 chars" in r.stdout, r.stdout
    # A bad post that is already published blocks the render.
    data = write_data(tmp_path, [good_post(title="T" * 70, status="published")])
    r = subprocess.run([sys.executable, str(GEN), "--data", str(data), "--out", str(out)], capture_output=True, text=True)
    assert r.returncode == 1 and not out.exists(), r.stdout


def test_bad_future_post_warns_but_never_blocks_a_render(tmp_path):
    out = tmp_path / "out"
    data = write_data(tmp_path, [good_post(status="published"),
                                 good_post("best-fish-for-high-cholesterol", "2026-12-01", title="T" * 70)])
    r = subprocess.run([sys.executable, str(GEN), "--data", str(data), "--out", str(out)], capture_output=True, text=True)
    assert r.returncode == 0 and "not yet published" in r.stdout and (out / "guides" / "is-shrimp-bad-for-cholesterol").exists(), r.stdout
    r = subprocess.run([sys.executable, str(GEN), "--check-only", "--data", str(data)], capture_output=True, text=True)
    assert r.returncode == 1, r.stdout


def test_cli_check_only_passes_good_data(tmp_path):
    data = write_data(tmp_path, [good_post()])
    r = subprocess.run([sys.executable, str(GEN), "--check-only", "--data", str(data), "--out", str(tmp_path / "o")],
                       capture_output=True, text=True)
    assert r.returncode == 0 and "1 ready/published pd post(s) checked" in r.stdout, r.stdout
    assert not (tmp_path / "o").exists()


def test_content_tables_get_phone_labels():
    html = "<table><thead><tr><th>Day</th><th>Lunch</th></tr></thead><tbody><tr><td>Day 1</td><td>Soup</td></tr></tbody></table>"
    out = pd.stack_tables(html)
    assert out.startswith('<div class="post-table">') and '<td data-label="Day">Day 1' in out and '<td data-label="Lunch">Soup' in out


if __name__ == "__main__":
    import inspect
    import tempfile
    failed = passed = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                if "tmp_path" in inspect.signature(fn).parameters:
                    with tempfile.TemporaryDirectory() as d:
                        fn(Path(d))
                else:
                    fn()
                passed += 1
                print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001  any crash is a named failure
                failed += 1
                print(f"FAIL {name}: {type(e).__name__}: {e}")
    print(f"{passed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
