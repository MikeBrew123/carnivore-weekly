#!/usr/bin/env python3
"""Mine real reader questions and community phrases from YouTube comments (+ cached Reddit),
group them into themes, and match each theme to our published pages.

Free YouTube Data API for comments (no Apify). Claude Haiku tags, Claude Sonnet groups.
Cost per full run: about $1-3 of Anthropic API.

Usage:
  python3 scripts/reader_question_mining.py run --out <dir> [--since 2025-04-01]
Writes to <dir>: yt_comments.json, tagged.json, agg_<diet>.json, themes.json, coverage.json.
<dir> holds raw comments: keep it OUT of the repo (public).
"""
import concurrent.futures as cf
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KEYS_PATH = next(p for p in (os.path.join(REPO, "secrets", "api-keys.json"),
                              "/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json",
                              os.path.expanduser("~/Developer/carnivore-weekly/secrets/api-keys.json"))
                 if os.path.exists(p))
KEYS = json.load(open(KEYS_PATH))


def _key(name):
    k = KEYS[name]
    return k if isinstance(k, str) else (k.get("api_key") or list(k.values())[0])


QUERIES = {
    "carnivore": ["carnivore diet", "carnivore diet funny", "carnivore diet women over 50", "lion diet"],
    "keto": ["keto diet", "keto funny", "keto women over 50", "keto flu"],
    "pescatarian": ["pescatarian diet", "pescatarian keto"],
}
SITE_FOR = {"carnivore": "cw", "keto": "kd", "pescatarian": "cw"}

TAG_PROMPT = """You are mining real {diet} diet community comments. Return ONLY JSON:
{{"phrases":[{{"phrase":"...","kind":"slang|catchphrase|joke|complaint|mantra","why":"..."}}],
 "funny_lines":["verbatim or near-verbatim funny/witty lines from the comments"],
 "questions":[{{"q":"the question in plain words"}}]}}
phrases = insider words or repeated expressions this community uses (in-group slang, mantras, running jokes). Under 8 words. Skip generic diet words.
funny_lines = only genuinely witty lines a member would laugh at. Skip insults and medical claims.
questions = real questions people ask. Max 15 each list. Output strict valid JSON: never put a double-quote character inside a string.
COMMENTS:
{body}"""

THEME_PROMPT = """Below are {n} real questions people asked in {diet} diet YouTube/Reddit comments. Group them into themes of the SAME underlying problem.
Return ONLY strict JSON: {{"themes":[{{"theme":"plain-English question a reader would type","count":N,"examples":["2-3 originals, never use double-quote characters inside them"],"type":"how-to|safety/medical|food-allowed|results/stall|cost|social|other"}}]}}
count = how many of the listed questions belong to it. Sort by count desc. 20-35 themes. Every question goes in one theme.
QUESTIONS:
{q}"""

COVER_PROMPT = """For each reader question theme, decide whether our site already has a page that answers it, using ONLY the page list (slug | title).
Return ONLY strict JSON {{"rows":[{{"theme":"...","count":N,"coverage":"covered|partial|gap","page":"best slug or empty","note":"max 12 words, no double quotes"}}]}} in the same order.
THEMES: {themes}
PAGES ({site}): {pages}"""


def yt(ep, **p):
    p["key"] = _key("youtube")
    try:
        return json.load(urllib.request.urlopen(
            f"https://www.googleapis.com/youtube/v3/{ep}?" + urllib.parse.urlencode(p), timeout=30))
    except Exception as e:
        return {"error": str(e)}


def claude(model, prompt, max_tokens):
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=json.dumps({"model": model, "max_tokens": max_tokens,
                         "messages": [{"role": "user", "content": prompt}]}).encode(),
        headers={"x-api-key": _key("anthropic"), "anthropic-version": "2023-06-01",
                 "content-type": "application/json"})
    for _ in range(3):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=300))
            txt = "".join(b.get("text", "") for b in r["content"] if b.get("type") == "text")
            return json.loads(re.search(r"\{.*\}", txt, re.S).group(0))
        except Exception:
            continue
    return None


def pull(out, since):
    data = {}
    for diet, qs in QUERIES.items():
        ids = []
        for q in qs:
            r = yt("search", part="snippet", q=q, type="video", maxResults=15, order="relevance",
                   publishedAfter=f"{since}T00:00:00Z", relevanceLanguage="en")
            ids += [i["id"]["videoId"] for i in r.get("items", []) if i["id"]["videoId"] not in ids]
        comments = []
        for vid in ids:
            tok = None
            for _ in range(3):
                p = dict(part="snippet", videoId=vid, maxResults=100, order="relevance", textFormat="plainText")
                if tok:
                    p["pageToken"] = tok
                r = yt("commentThreads", **p)
                if "error" in r:
                    break
                for it in r.get("items", []):
                    s = it["snippet"]["topLevelComment"]["snippet"]
                    comments.append({"v": vid, "t": s["textDisplay"]})
                tok = r.get("nextPageToken")
                if not tok:
                    break
        data[diet] = {"videos": ids, "comments": comments}
        print(f"{diet}: {len(ids)} videos, {len(comments)} comments")
    for site, diet in (("cw", "carnivore"), ("kd", "keto")):
        f = os.path.join(REPO, "data", f"reddit-comments-{site}.json")
        if os.path.exists(f):
            for t in json.load(open(f)).get("threads", []):
                data[diet]["comments"].append({"v": "reddit", "t": t.get("title", "")})
                for c in t.get("comments", []):
                    data[diet]["comments"].append({"v": "reddit", "t": c if isinstance(c, str) else c.get("body", c.get("text", ""))})
    json.dump(data, open(os.path.join(out, "yt_comments.json"), "w"))
    return data


def tag(out, data):
    jobs = []
    for diet, v in data.items():
        cs = [c for c in v["comments"] if len(c["t"] or "") > 15]
        jobs += [(diet, cs[i:i + 150]) for i in range(0, len(cs), 150)]

    def one(j):
        diet, batch = j
        body = "\n".join("- " + re.sub(r"\s+", " ", c["t"])[:400] for c in batch)
        return diet, claude("claude-haiku-5-5", TAG_PROMPT.format(diet=diet, body=body), 4000)

    res = {k: [] for k in data}
    with cf.ThreadPoolExecutor(6) as ex:
        for diet, o in ex.map(one, jobs):
            if o:
                res[diet].append(o)
    json.dump(res, open(os.path.join(out, "tagged.json"), "w"))
    agg = {}
    for diet, bs in res.items():
        ph, qs, fun = Counter(), [], []
        for b in bs:
            seen = set()
            for p in b.get("phrases", []):
                k = re.sub(r"[^a-z0-9 ]", "", p.get("phrase", "").lower()).strip()
                if k and k not in seen:
                    ph[k] += 1
                    seen.add(k)
            fun += b.get("funny_lines", [])
            qs += [q.get("q", "") for q in b.get("questions", []) if q.get("q")]
        agg[diet] = {"phrases": ph.most_common(), "fun": fun, "qs": list(dict.fromkeys(qs))}
        json.dump(agg[diet], open(os.path.join(out, f"agg_{diet}.json"), "w"))
        print(f"{diet}: {len(bs)} batches tagged, {len(agg[diet]['qs'])} questions")
    return agg


def themes_and_coverage(out, agg):
    posts = json.load(open(os.path.join(REPO, "data", "blog_posts.json")))["blog_posts"]
    pages = {
        "cw": [p["slug"] + " | " + p.get("title", "") for p in posts if p.get("site", "cw") == "cw" and p["status"] == "published"],
        "kd": [p["slug"] + " | " + p.get("title", "") for p in posts if p.get("site") == "kd" and p["status"] == "published"]
        + ([f for f in os.listdir(os.path.join(REPO, "ketodial", "public", "blog")) if f.endswith(".html")]
           if os.path.isdir(os.path.join(REPO, "ketodial", "public", "blog")) else []),
    }
    themes, cov = {}, {}
    for diet, a in agg.items():
        t = claude("claude-sonnet-5-5", THEME_PROMPT.format(n=len(a["qs"]), diet=diet, q="\n".join("- " + q for q in a["qs"])), 20000)
        themes[diet] = t or {"themes": []}
        slim = [{"theme": x["theme"], "count": x["count"]} for x in themes[diet]["themes"]]
        c = claude("claude-sonnet-5-5", COVER_PROMPT.format(themes=json.dumps(slim), site=SITE_FOR[diet],
                                                            pages=json.dumps(pages[SITE_FOR[diet]])), 20000)
        cov[diet] = (c or {"rows": []})["rows"]
        print(f"{diet}: {len(slim)} themes, {sum(1 for r in cov[diet] if r['coverage'] == 'gap')} gaps")
    json.dump(themes, open(os.path.join(out, "themes.json"), "w"), indent=1)
    json.dump(cov, open(os.path.join(out, "coverage.json"), "w"), indent=1)


if __name__ == "__main__":
    if len(sys.argv) < 4 or sys.argv[1] != "run" or "--out" not in sys.argv:
        raise SystemExit(__doc__)
    out = sys.argv[sys.argv.index("--out") + 1]
    since = sys.argv[sys.argv.index("--since") + 1] if "--since" in sys.argv else "2025-04-01"
    os.makedirs(out, exist_ok=True)
    d = pull(out, since)
    a = tag(out, d)
    themes_and_coverage(out, a)
    print(f"done -> {out}")
