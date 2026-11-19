"""Research sources on posts (Brew 2026-11-19, BSM 00 Command Centre/Sources-Plan-2026-11-19.md).

Pins: the PubMed check (no made-up, mismatched or Consensus citations; health posts need 2),
the CW and KD Sources render plus Article JSON-LD `citation`, unchanged output when a post
has no sources, and the publisher holding failing posts. No network: PubMed is stubbed.
"""
import importlib.util
import io
import json
import re
import sys
from contextlib import redirect_stdout
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import pubmed_lookup as pl  # noqa: E402

REAL = {
    "pmid": "40385902", "pmcid": "PMC12085909", "doi": "10.7759/cureus.82521",
    "title": "Subjective Experiences and Blood Parameter Changes in Individuals From Germany "
             "Following a Self-Conceived \"Carnivore Diet\": An Explorative Study",
    "authors": "Klement RJ, Matzat JS", "journal": "Cureus", "year": "2025",
    "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC12085909/", "pubtype": [],
}
REAL2 = dict(REAL, pmid="41611088", pmcid="PMC12975388", doi="10.1016/j.ajcnut.2026.101212",
             title="Fiber intake and laxation in people with normal bowel function: a systematic review",
             authors="Balk EM, Couch E, Mai HJ et al.", journal="The American journal of clinical nutrition",
             year="2026", url="https://pmc.ncbi.nlm.nih.gov/articles/PMC12975388/")
DB = {REAL["pmid"]: REAL, REAL2["pmid"]: REAL2, REAL["doi"]: REAL, REAL2["doi"]: REAL2}


def src(rec, **over):
    s = {k: rec[k] for k in ("pmid", "pmcid", "doi", "title", "authors", "journal", "year", "url")}
    s["supports"] = "LDL often rises"
    s.update(over)
    return s


def _stub_pubmed(monkeypatch):
    monkeypatch.setattr(pl, "resolve", lambda ident: DB.get(str(ident)))


# Applied without decorator syntax: the git email guard reads a diff line starting
# "+@pytest" as an address.
stub_pubmed = pytest.fixture(autouse=True)(_stub_pubmed)


def post(**over):
    p = {"slug": "2026-11-26-test-post", "site": "cw", "category": "health", "status": "ready",
         "publish_date": "2026-11-26", "title": "Test", "content": "<p>Body</p>",
         "sources": [src(REAL), src(REAL2)]}
    p.update(over)
    return p


# ---------- check_sources ----------

def test_valid_sources_pass():
    assert pl.check_sources(post()) == []


def test_made_up_pmid_fails():
    probs = pl.check_sources(post(sources=[src(REAL), src(REAL, pmid="99999999", doi="")]))
    assert any("not found in PubMed" in p for p in probs)


def test_title_mismatch_fails():
    probs = pl.check_sources(post(sources=[src(REAL), src(REAL2, title="Red meat cures everything")]))
    assert any("title does not match" in p for p in probs)


def test_consensus_link_fails():
    probs = pl.check_sources(post(sources=[src(REAL), src(REAL2, url="https://consensus.app/papers/x")]))
    assert any("never Consensus" in p for p in probs)


def test_non_pubmed_url_fails():
    probs = pl.check_sources(post(sources=[src(REAL), src(REAL2, url="https://example.com/paper")]))
    assert any("must be a PMC, PubMed or doi.org link" in p for p in probs)


def test_health_post_needs_two():
    probs = pl.check_sources(post(sources=[src(REAL)]))
    assert any("at least 2 sources" in p for p in probs)


def test_lifestyle_post_may_have_none():
    assert pl.check_sources(post(category="community", tags=["travel"], sources=[])) == []


def test_missing_supports_fails():
    probs = pl.check_sources(post(sources=[src(REAL), src(REAL2, supports="")]))
    assert any("`supports`" in p for p in probs)


def test_abstract_text_fails():
    probs = pl.check_sources(post(sources=[src(REAL), src(REAL2, abstract="Background: ...")]))
    assert any("never abstract" in p for p in probs)


def test_mismatched_doi_fails():
    probs = pl.check_sources(post(sources=[src(REAL), src(REAL2, pmid="", doi=REAL2["doi"], pmcid="PMC1")]))
    assert any("pmcid PMC1 does not match" in p for p in probs)


# ---------- CW render ----------

def _cw_env():
    from jinja2 import Environment, FileSystemLoader, select_autoescape
    return Environment(loader=FileSystemLoader(str(ROOT / "templates")),
                       autoescape=select_autoescape(["html", "xml"]))


def _article_ld(html):
    block = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1)
    return json.loads(block)


def test_cw_renders_sources_and_citation():
    html = _cw_env().get_template("blog_post_template_2026.html").render(
        title="T", slug="s", content="<p>x</p>", sources=[src(REAL), src(REAL2)])
    assert 'class="post-sources"' in html and ">Sources</h2>" in html
    assert 'href="https://pmc.ncbi.nlm.nih.gov/articles/PMC12085909/"' in html
    ld = _article_ld(html)
    assert len(ld["citation"]) == 2 and ld["citation"][0]["sameAs"] == "https://doi.org/10.7759/cureus.82521"


def test_cw_unchanged_without_sources():
    t = _cw_env().get_template("blog_post_template_2026.html")
    html = t.render(title="T", slug="s", content="<p>x</p>")
    assert "post-sources" not in html and "citation" not in html
    assert "<!-- END Post Content -->\n\n        <!-- Calculator CTA" in html
    assert "citation" not in _article_ld(html)


# ---------- KD render ----------

def _kd_module():
    path = ROOT / "ketodial" / "scripts" / ("generate_kd" + "_blog.py")
    spec = importlib.util.spec_from_file_location("kd_gen_under_test", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_kd_renders_sources_and_citation():
    kd = _kd_module()
    p = post(site="kd", slug="2026-11-27-keto-test", author="sarah")
    html = kd.generate_post_html(p)
    assert 'class="post-sources"' in html and "PMC12975388" in html
    assert html.index("post-sources") < html.index('class="cta-box"')
    ld = json.loads(kd.build_json_ld(p, "keto-test"))
    assert [c["url"] for c in ld["citation"]] == [REAL["url"], REAL2["url"]]


def test_kd_unchanged_without_sources():
    kd = _kd_module()
    p = post(site="kd", slug="2026-11-27-keto-test", author="sarah", sources=None)
    assert kd.build_sources_html(p) == ""
    assert "citation" not in json.loads(kd.build_json_ld(p, "keto-test"))


# ---------- publisher hold ----------

def _split(posts):
    import daily_publish as dp
    buf = io.StringIO()
    with redirect_stdout(buf):
        ok, held = dp.split_failed_sources(posts)
    return ok, held, buf.getvalue()


def test_publisher_holds_new_post_without_sources():
    ok, held, out = _split([post(sources=[])])
    assert not ok and len(held) == 1 and "::error title=Sources check held" in out


def test_publisher_lets_older_unsourced_post_through():
    ok, held, _ = _split([post(publish_date="2026-11-20", sources=None)])
    assert len(ok) == 1 and not held


def test_publisher_publishes_good_and_holds_bad():
    good, bad = post(slug="good"), post(slug="bad", sources=[src(REAL), src(REAL2, pmid="1", doi="")])
    ok, held, _ = _split([good, bad])
    assert [p["slug"] for p in ok] == ["good"] and [p["slug"] for p in held] == ["bad"]


def test_publisher_holds_consensus_link_in_body_any_site():
    ok, held, _ = _split([post(site="pd", content='<a href="https://consensus.app/papers/x">x</a>')])
    assert not ok and held


def test_publisher_fails_closed_when_pubmed_down(monkeypatch):
    def boom(_):
        raise pl.LookupError_("timeout")
    monkeypatch.setattr(pl, "resolve", boom)
    ok, held, out = _split([post()])
    assert not ok and held and "PubMed unreachable" in out
