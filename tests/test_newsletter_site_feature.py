#!/usr/bin/env python3
"""CW newsletter sister-site feature (Brew 2026-10-12, PD blog plan item 2).

A dated feature in data/newsletter_affiliates.json "site_features" renders in
exactly the sends whose date falls in its window, links with CW newsletter UTMs,
and follows the copy rules (no dashes, no weekday, no price or code).

    python3 tests/test_newsletter_site_feature.py
"""
import json
import re
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import generate_newsletter as gn  # noqa: E402

FAILED = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + (f" - {detail}" if not ok and detail else ""))
    if not ok:
        FAILED.append(name)


def render(date):
    env = Environment(loader=FileSystemLoader(ROOT / "templates"))
    return env.get_template("newsletter_template.html").render(
        date=date, unsubscribe_link="#", hero=None, supporting=[], community_pulse=[],
        affiliate=None, product_feature=None, site_feature=gn.load_site_feature(date))


def main():
    cfg = json.loads((ROOT / "data/newsletter_affiliates.json").read_text())
    pd = next(f for f in cfg["site_features"] if f["key"] == "pd_intro")

    check("A. PD feature covers the 2026-10-18 send", pd["start"] <= "2026-10-18" <= pd["end"])
    check("A. window is one week at most (runs once)", pd["start"] >= "2026-10-12" and pd["end"] <= "2026-10-19")
    h = render("2026-10-18")
    check("A. renders on 2026-10-18", pd["heading"] in h and pd["blurb"] in h)
    for d in ("2026-10-11", "2026-10-21", "2026-10-25"):
        check(f"A. absent on {d}", pd["heading"] not in render(d))

    f = gn.load_site_feature("2026-10-18")
    check("B. link is the live PD homepage", f["url"].startswith("https://www.pescodial.com/?"))
    check("B. link carries CW newsletter UTMs",
          "utm_source=cw_newsletter&utm_medium=email&utm_campaign=pd_feature" in f["url"])
    check("B. rendered href has the UTMs", "pescodial.com/?utm_source=cw_newsletter" in h)

    copy = " ".join(pd[k] for k in ("label", "heading", "blurb", "cta"))
    check("C. no em or en dash", "—" not in copy and "–" not in copy)
    check("C. never names a weekday",
          not re.search(r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b", copy, re.I))
    check("C. no price, discount or code", not re.search(r"\$|%|code|discount|PESCO", copy))
    check("C. written by a writer agent", pd.get("writer") in ("Sarah", "Marcus", "Chloe"))

    cfg2 = dict(cfg, site_features=[dict(pd, active=False)])
    orig = gn.PROJECT_ROOT
    tmp = ROOT / ".tmp_sitefeature"
    (tmp / "data").mkdir(parents=True, exist_ok=True)
    (tmp / "data/newsletter_affiliates.json").write_text(json.dumps(cfg2))
    gn.PROJECT_ROOT = tmp
    try:
        check("D. inactive feature never renders", gn.load_site_feature("2026-10-18") is None)
    finally:
        gn.PROJECT_ROOT = orig
        (tmp / "data/newsletter_affiliates.json").unlink()
        (tmp / "data").rmdir()
        tmp.rmdir()

    print(f"\n{'FAILED: ' + str(len(FAILED)) if FAILED else 'ALL PASS'}")
    sys.exit(1 if FAILED else 0)


if __name__ == "__main__":
    main()
