#!/usr/bin/env python3
"""
PubMed lookup and citation check for blog-post sources (CW, KD, PD).

Plan: BSM vault 00 Command Centre/Sources-Plan-2026-11-19.md (Brew approved 2026-11-19).
PubMed is the only source of record. Consensus is not used (its terms are personal-use).

Usage:
    python3 scripts/pubmed_lookup.py search "carnivore diet LDL cholesterol" [-n 8]
    python3 scripts/pubmed_lookup.py show 40385902 10.7759/cureus.82521 PMC12085909
    python3 scripts/pubmed_lookup.py source 40385902 --supports "LDL often rises"   # JSON for blog_posts.json
    python3 scripts/pubmed_lookup.py verify --slug 2026-11-20-some-post
    python3 scripts/pubmed_lookup.py verify --ready [--site cw|kd|pd]

NCBI rules followed (https://www.ncbi.nlm.nih.gov/home/about/policies/):
  - at most 3 requests per second, tool and email sent with every request
  - metadata only (title, authors, journal, year, ids); abstracts are never stored or printed into posts
  - no article downloads
"""

import argparse
import difflib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
BLOG_POSTS = PROJECT_ROOT / "data" / "blog_posts.json"

EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
TOOL = "carnivoreweekly"
EMAIL = os.environ.get("NCBI_EMAIL", "research@carnivoreweekly.com")
MIN_INTERVAL = 0.34  # seconds between requests: under NCBI's 3 per second
ALLOWED_URL_PREFIXES = (
    "https://pmc.ncbi.nlm.nih.gov/articles/PMC",
    "https://pubmed.ncbi.nlm.nih.gov/",
    "https://doi.org/",
)
BANNED_URL_HOSTS = ("consensus.app",)
TITLE_MATCH_MIN = 0.85
HEALTH_MIN_SOURCES = 2

_last_call = 0.0
_cache = {}


class LookupError_(Exception):
    """Network or NCBI failure. Callers fail closed."""


def _get(endpoint, params):
    global _last_call
    wait = MIN_INTERVAL - (time.time() - _last_call)
    if wait > 0:
        time.sleep(wait)
    q = dict(params, tool=TOOL, email=EMAIL, retmode="json")
    url = EUTILS + endpoint + "?" + urllib.parse.urlencode(q)
    last_err = None
    for attempt in range(3):
        try:
            _last_call = time.time()
            with urllib.request.urlopen(url, timeout=20) as resp:
                return json.load(resp)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            last_err = e
            time.sleep(1.5 * (attempt + 1))
    raise LookupError_(f"PubMed request failed: {last_err}")


def _ids(rec):
    out = {}
    for a in rec.get("articleids", []):
        if a.get("idtype") in ("doi", "pmc", "pubmed") and a.get("value"):
            out[a["idtype"]] = a["value"]
    return out


def _authors(rec):
    names = [a.get("name", "") for a in rec.get("authors", []) if a.get("authtype", "Author") == "Author"]
    names = [n for n in names if n]
    if not names:
        return ""
    return ", ".join(names[:3]) + (" et al." if len(names) > 3 else "")


def _record(rec):
    ids = _ids(rec)
    pmid = rec.get("uid", "")
    pmcid = ids.get("pmc", "")
    if pmcid and not pmcid.startswith("PMC"):
        pmcid = "PMC" + pmcid
    doi = ids.get("doi", "")
    if pmcid:
        url = f"https://pmc.ncbi.nlm.nih.gov/articles/{pmcid}/"
    elif doi:
        url = f"https://doi.org/{doi}"
    else:
        url = f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"
    year = (rec.get("pubdate") or rec.get("epubdate") or "")[:4]
    return {
        "pmid": pmid,
        "pmcid": pmcid,
        "doi": doi,
        "title": (rec.get("title") or "").rstrip("."),
        "authors": _authors(rec),
        "journal": rec.get("fulljournalname") or rec.get("source") or "",
        "year": year,
        "url": url,
        "pubtype": rec.get("pubtype", []),
    }


def summaries(pmids):
    """PubMed records for a list of PMIDs, keyed by PMID."""
    need = [p for p in pmids if p not in _cache]
    for i in range(0, len(need), 100):
        chunk = need[i:i + 100]
        data = _get("esummary.fcgi", {"db": "pubmed", "id": ",".join(chunk)})
        res = data.get("result", {})
        for uid in res.get("uids", []):
            _cache[uid] = _record(res[uid])
    return {p: _cache[p] for p in pmids if p in _cache}


def search(query, n=8):
    data = _get("esearch.fcgi", {"db": "pubmed", "term": query, "retmax": n, "sort": "relevance"})
    pmids = data.get("esearchresult", {}).get("idlist", [])
    recs = summaries(pmids)
    return [recs[p] for p in pmids if p in recs]


def resolve(identifier):
    """PMID, PMCID or DOI -> PubMed record, or None if PubMed has no such paper."""
    ident = identifier.strip()
    if re.fullmatch(r"\d{1,9}", ident):
        pmid = ident
    else:
        if re.fullmatch(r"(?i)pmc\d+", ident):
            term = f"{ident.upper()}[pmcid]"
        elif ident.lower().startswith("10."):
            term = f"{ident}[doi]"
        else:
            raise ValueError(f"Not a PMID, PMCID or DOI: {identifier}")
        ids = _get("esearch.fcgi", {"db": "pubmed", "term": term}).get("esearchresult", {}).get("idlist", [])
        if len(ids) != 1:
            return None
        pmid = ids[0]
    return summaries([pmid]).get(pmid)


def _norm(t):
    return re.sub(r"[^a-z0-9 ]", "", (t or "").lower()).strip()


def is_health_post(post):
    """Blunt signal, not a keyword list: health category or a medical tag."""
    cat = (post.get("category") or "").lower()
    tags = " ".join(post.get("tags") or []).lower()
    return any(k in cat for k in ("health", "medical", "science", "symptom", "nutrition", "cholesterol")) or any(
        k in tags for k in ("health", "medical", "symptom", "cholesterol", "blood", "doctor"))


def check_sources(post):
    """Return a list of problems with a post's `sources` field. Empty list = passes.
    Raises LookupError_ if PubMed cannot be reached (callers fail closed)."""
    problems = []
    sources = post.get("sources") or []
    if not isinstance(sources, list):
        return ["`sources` must be a list"]
    if is_health_post(post) and len(sources) < HEALTH_MIN_SOURCES:
        problems.append(f"health post needs at least {HEALTH_MIN_SOURCES} sources, has {len(sources)}")
    for i, s in enumerate(sources, 1):
        tag = f"source {i}"
        if not isinstance(s, dict):
            problems.append(f"{tag}: must be an object")
            continue
        url = s.get("url", "")
        if any(h in url for h in BANNED_URL_HOSTS):
            problems.append(f"{tag}: links {url}; use the PMC or DOI link, never Consensus")
        elif not url.startswith(ALLOWED_URL_PREFIXES):
            problems.append(f"{tag}: url must be a PMC, PubMed or doi.org link, got {url!r}")
        if not (s.get("supports") or "").strip():
            problems.append(f"{tag}: `supports` must name the claim in the post this paper backs")
        if len(s.get("title", "")) > 400 or "abstract" in s:
            problems.append(f"{tag}: titles only, never abstract text")
        ident = s.get("pmid") or s.get("doi")
        if not ident:
            problems.append(f"{tag}: needs a pmid or doi")
            continue
        rec = resolve(str(ident))
        if rec is None:
            problems.append(f"{tag}: {ident} not found in PubMed")
            continue
        ratio = difflib.SequenceMatcher(None, _norm(s.get("title")), _norm(rec["title"])).ratio()
        if ratio < TITLE_MATCH_MIN:
            problems.append(f"{tag}: title does not match PubMed record {rec['pmid']} "
                            f"({ratio:.2f}): PubMed says {rec['title']!r}")
        for key in ("pmcid", "doi"):
            if s.get(key) and rec.get(key) and s[key].lower() != rec[key].lower():
                problems.append(f"{tag}: {key} {s[key]} does not match PubMed ({rec[key]})")
        if s.get("pmid") and str(s["pmid"]) != rec["pmid"]:
            problems.append(f"{tag}: pmid {s['pmid']} does not match PubMed ({rec['pmid']})")
    return problems


def _load_posts():
    return json.loads(BLOG_POSTS.read_text())["blog_posts"]


def _print_rec(r):
    print(f"PMID {r['pmid']}  {r['year']}  {r['journal']}")
    print(f"  {r['title']}")
    print(f"  {r['authors']}")
    print(f"  {r['url']}" + (f"  types: {', '.join(r['pubtype'])}" if r["pubtype"] else ""))


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("query"); s.add_argument("-n", type=int, default=8)
    sh = sub.add_parser("show"); sh.add_argument("ids", nargs="+")
    so = sub.add_parser("source"); so.add_argument("id"); so.add_argument("--supports", required=True)
    v = sub.add_parser("verify")
    g = v.add_mutually_exclusive_group(required=True)
    g.add_argument("--slug"); g.add_argument("--ready", action="store_true")
    v.add_argument("--site", choices=["cw", "kd", "pd"])
    a = ap.parse_args(argv)

    try:
        if a.cmd == "search":
            for r in search(a.query, a.n):
                _print_rec(r); print()
        elif a.cmd == "show":
            for i in a.ids:
                r = resolve(i)
                print(f"{i}: NOT FOUND") if r is None else _print_rec(r)
        elif a.cmd == "source":
            r = resolve(a.id)
            if r is None:
                print(f"{a.id}: NOT FOUND", file=sys.stderr); return 1
            out = {k: r[k] for k in ("pmid", "pmcid", "doi", "title", "authors", "journal", "year", "url")}
            out["supports"] = a.supports
            print(json.dumps(out, indent=2, ensure_ascii=False))
        elif a.cmd == "verify":
            posts = _load_posts()
            if a.slug:
                posts = [p for p in posts if p.get("slug") == a.slug]
                if not posts:
                    print(f"No post with slug {a.slug}", file=sys.stderr); return 1
            else:
                posts = [p for p in posts if p.get("status") == "ready" and (not a.site or p.get("site") == a.site)]
            bad = 0
            for p in posts:
                probs = check_sources(p)
                if probs:
                    bad += 1
                    print(f"FAIL {p.get('site')} {p['slug']}")
                    for pr in probs: print(f"  - {pr}")
                else:
                    print(f"ok   {p.get('site')} {p['slug']} ({len(p.get('sources') or [])} sources)")
            return 1 if bad else 0
    except LookupError_ as e:
        print(f"ERROR: {e}. Failing closed.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
