#!/usr/bin/env python3
"""Before/after tracker for content refresh cohorts (CW).

Each cohort is a set of pages changed on one ship date, plus an untouched control
group. `baseline` records Search Console PAGE-dimension numbers for the 28 days
before the ship date. `read` pulls the 28 days after and compares, using the
control group to separate the change from site-wide drift.

Usage:
  python3 scripts/content_refresh_tracker.py baseline <cohort-id>
  python3 scripts/content_refresh_tracker.py read [<cohort-id>|all] [--out report.md]

Cohorts live in data/content-refresh-cohorts.json.
"""
import json
import sys
import warnings
from datetime import date, timedelta

warnings.filterwarnings("ignore")

import os
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COHORTS = f"{REPO}/data/content-refresh-cohorts.json"
SITE = "sc-domain:carnivoreweekly.com"
WINDOW = 28


def _creds_path():
    for root in (REPO, "/Users/mbrew/Developer/carnivore-weekly", os.path.expanduser("~/Developer/carnivore-weekly")):
        p = f"{root}/dashboard/ga4-credentials.json"
        if os.path.exists(p):
            return p
    raise SystemExit("ga4-credentials.json not found")


def gsc():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    c = service_account.Credentials.from_service_account_file(
        _creds_path(), scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    return build("searchconsole", "v1", credentials=c)


def page_stats(svc, start, end):
    rows = svc.searchanalytics().query(siteUrl=SITE, body={
        "startDate": start, "endDate": end, "dimensions": ["page"], "rowLimit": 25000,
    }).execute().get("rows", [])
    out = {}
    for r in rows:
        u = r["keys"][0]
        if "/blog/" not in u:
            continue
        slug = u.split("/blog/")[-1].replace(".html", "").strip("/")
        out[slug] = {"impr": r["impressions"], "clicks": r["clicks"], "pos": round(r["position"], 1)}
    return out


def index_state(svc, slug):
    try:
        r = svc.urlInspection().index().inspect(body={
            "inspectionUrl": f"https://carnivoreweekly.com/blog/{slug}.html", "siteUrl": SITE,
        }).execute()["inspectionResult"]["indexStatusResult"]
        return r.get("coverageState", "")
    except Exception as e:  # quota or transient error: record, never fail the run
        return f"error: {str(e)[:60]}"


def load():
    return json.load(open(COHORTS))


def save(d):
    json.dump(d, open(COHORTS, "w"), indent=2, ensure_ascii=False)
    open(COHORTS, "a").write("\n")


def windows(ship):
    s = date.fromisoformat(ship)
    pre = ((s - timedelta(days=WINDOW)).isoformat(), (s - timedelta(days=1)).isoformat())
    post = ((s + timedelta(days=1)).isoformat(), (s + timedelta(days=WINDOW)).isoformat())
    return pre, post


def baseline(cid):
    d = load()
    c = next(x for x in d["cohorts"] if x["id"] == cid)
    svc = gsc()
    pre, _ = windows(c["ship_date"])
    # GSC final data lags ~2 days; if the pre-window end is too recent, end it at today-2.
    end = min(date.fromisoformat(pre[1]), date.today() - timedelta(days=2))
    start = end - timedelta(days=WINDOW - 1)
    stats = page_stats(svc, start.isoformat(), end.isoformat())
    zero = {"impr": 0, "clicks": 0, "pos": None}
    c["baseline"] = {
        "window": [start.isoformat(), end.isoformat()],
        "pages": {s: stats.get(s, zero) | {"index": index_state(svc, s)} for s in c["pages"]},
        "control": {s: stats.get(s, zero) for s in c.get("control", [])},
        "extra": {s: stats.get(s, zero) for s in c.get("extra_baseline", [])},
    }
    save(d)
    print(f"baseline recorded for {cid}: {start} to {end}")


def _tot(m):
    return {"impr": sum(v["impr"] for v in m.values()), "clicks": sum(v["clicks"] for v in m.values()),
            "with_impr": sum(1 for v in m.values() if v["impr"] > 0), "n": len(m)}


def _pct(a, b):
    if a == 0:
        return "new" if b > 0 else "0"
    return f"{(b - a) / a * 100:+.0f}%"


def read(which, out=None):
    d = load()
    svc = gsc()
    lines = [f"# Content refresh read, {date.today().isoformat()}", ""]
    for c in d["cohorts"]:
        if which not in ("all", c["id"]) or "baseline" not in c:
            continue
        _, post = windows(c["ship_date"])
        end = min(date.fromisoformat(post[1]), date.today() - timedelta(days=2))
        if end < date.fromisoformat(post[0]):
            lines += [f"## {c['title']}", "", f"Not ready: no after-window data yet (read date {c['read_date']}).", ""]
            continue
        stats = page_stats(svc, post[0], end.isoformat())
        zero = {"impr": 0, "clicks": 0, "pos": None}
        b = c["baseline"]
        after = {s: stats.get(s, zero) for s in c["pages"]}
        ctrl_after = {s: stats.get(s, zero) for s in c.get("control", [])}
        bt, at = _tot(b["pages"]), _tot(after)
        lines += [f"## {c['title']}", "",
                  f"Shipped {c['ship_date']}. Before: {b['window'][0]} to {b['window'][1]}. After: {post[0]} to {end}.",
                  f"What changed: {c['what']}", "",
                  "| page | before impr / clicks / pos | after impr / clicks / pos | index before -> now |",
                  "|---|---|---|---|"]
        for s in c["pages"]:
            x, y = b["pages"][s], after[s]
            lines.append(f"| {s} | {x['impr']} / {x['clicks']} / {x['pos'] or '-'} | "
                         f"{y['impr']} / {y['clicks']} / {y['pos'] or '-'} | {x.get('index', '')} -> {index_state(svc, s)} |")
        lines += ["", f"**Cohort:** impressions {bt['impr']} -> {at['impr']} ({_pct(bt['impr'], at['impr'])}), "
                      f"clicks {bt['clicks']} -> {at['clicks']} ({_pct(bt['clicks'], at['clicks'])}), "
                      f"pages Google showed at all {bt['with_impr']}/{bt['n']} -> {at['with_impr']}/{at['n']}."]
        if c.get("control"):
            cb, ca = _tot(b["control"]), _tot(ctrl_after)
            lines.append(f"**Control ({cb['n']} untouched pages):** impressions {cb['impr']} -> {ca['impr']} "
                         f"({_pct(cb['impr'], ca['impr'])}), clicks {cb['clicks']} -> {ca['clicks']}, "
                         f"pages shown {cb['with_impr']}/{cb['n']} -> {ca['with_impr']}/{ca['n']}.")
        if b.get("extra"):
            et = _tot(b["extra"])
            lines.append(f"**Before-only reference ({', '.join(b['extra'])}):** {et['impr']} impressions, {et['clicks']} clicks in the before window.")
        lines += ["", f"Win rule: {c['win_rule']}", ""]
    text = "\n".join(lines)
    if out:
        open(out, "w").write(text)
    print(text)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    cmd = sys.argv[1]
    if cmd == "baseline":
        baseline(sys.argv[2])
    elif cmd == "read":
        o = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
        read(sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith("--") else "all", o)
    else:
        raise SystemExit(__doc__)
