#!/usr/bin/env python3
"""Render the 30-Day Keto Meal Plan & Food Guide from Sarah's content JSON.

Writers produce content only. This script owns layout, exactly like the blog
pipeline: nobody hand-edits the output PDF, you fix the renderer.

Source : etsy/products/content/keto-flagship-content.json
Outputs: etsy/products/pdfs/keto-30day-flagship-letter.pdf   (8.5 x 11in)
         etsy/products/pdfs/keto-30day-flagship-a4.pdf       (210 x 297mm)

Both sizes ship, because competitors advertise "A4 + US Letter" and buyers
outside North America ask for it.

Usage:
  python3 etsy/products/templates/build_keto_flagship.py
  python3 etsy/products/templates/build_keto_flagship.py --html-only
"""

import argparse
import html
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
CONTENT = ROOT / "etsy" / "products" / "content" / "keto-flagship-content.json"
OUT_DIR = ROOT / "etsy" / "products" / "pdfs"
BUILD_DIR = ROOT / "etsy" / "products" / "_build"

SIZES = {
    "letter": {"w": "8.5in", "h": "11in", "file": "keto-30day-flagship-letter.pdf"},
    "a4": {"w": "210mm", "h": "297mm", "file": "keto-30day-flagship-a4.pdf"},
}

# Keto green and cream, carried over from the existing keto food list so the
# flagship reads as the same family on the shop grid.
CSS = """
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap');

:root {
  --green:      #2f5233;
  --green-dark: #1f381f;
  --green-soft: #e8efe4;
  --cream:      #faf7ef;
  --ink:        #23271f;
  --muted:      #6d7268;
  --rule:       #cfd8c8;
  --amber:      #8a6d971;
}
* { margin: 0; padding: 0; box-sizing: border-box; }

@page { size: %(w)s %(h)s; margin: 0; }

body {
  font-family: 'Nunito', 'Segoe UI', sans-serif;
  color: var(--ink);
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  width: %(w)s;
  height: %(h)s;
  padding: 0.52in 0.55in 0.42in;
  display: flex;
  flex-direction: column;
  page-break-after: always;
  overflow: hidden;
  position: relative;
  background: #fff;
}
.page:last-child { page-break-after: auto; }

/* ---------- cover ---------- */
.cover { background: var(--cream); justify-content: center; text-align: center;
          padding-left: 0.9in; padding-right: 0.9in; }
.cover .rule-top, .cover .rule-bot {
  height: 10px; background: var(--green); border-radius: 2px;
}
.cover h1 {
  font-family: 'Fredoka', sans-serif; font-weight: 700;
  font-size: 43pt; line-height: 1.06; color: var(--green-dark);
  margin: 34px 0 18px;
}
.cover .sub {
  font-size: 14.5pt; font-weight: 600; color: var(--green);
  line-height: 1.45; margin-bottom: 34px;
}
.cover .intro {
  font-size: 12pt; line-height: 1.66; color: var(--ink);
  margin-bottom: 40px;
}
.cover .brand {
  font-family: 'Fredoka', sans-serif; font-size: 13pt;
  letter-spacing: 1.6px; color: var(--green); margin-bottom: 22px;
}
.cover .disclaim {
  font-size: 8.4pt; line-height: 1.5; color: var(--muted);
  margin-top: 14px;
}

/* ---------- page furniture ---------- */
.hdr { flex-shrink: 0; border-bottom: 2.5px solid var(--green); padding-bottom: 7px; margin-bottom: 13px; }
.hdr h2 {
  font-family: 'Fredoka', sans-serif; font-weight: 600;
  font-size: 20.5pt; color: var(--green-dark); line-height: 1.12;
}
.hdr .sub { font-size: 10pt; color: var(--muted); margin-top: 3px; font-weight: 600; }

.content { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 9px; }

p.body { font-size: 10.4pt; line-height: 1.56; }

ul.bul { list-style: none; display: flex; flex-direction: column; gap: 5px; }
ul.bul li { font-size: 10.2pt; line-height: 1.48; padding-left: 15px; position: relative; }
ul.bul li::before {
  content: ''; position: absolute; left: 0; top: 0.52em;
  width: 6px; height: 6px; border-radius: 50%%; background: var(--green);
}

.sec { break-inside: avoid; }
.sec h3 {
  font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 12.6pt;
  color: var(--green); margin-bottom: 4px;
}
.sec p { font-size: 10.2pt; line-height: 1.52; margin-bottom: 4px; }

.note {
  background: var(--green-soft); border-left: 4px solid var(--green);
  padding: 9px 12px; font-size: 9.8pt; line-height: 1.5; border-radius: 3px;
}

table { width: 100%%; border-collapse: collapse; }
caption {
  caption-side: top; text-align: left;
  font-family: 'Fredoka', sans-serif; font-size: 11pt; color: var(--green);
  padding-bottom: 5px;
}
th {
  background: var(--green); color: #fff; font-size: 9.2pt; font-weight: 700;
  text-align: left; padding: 6px 8px; letter-spacing: 0.3px;
}
td {
  font-size: 9.5pt; line-height: 1.44; padding: 6px 8px;
  border-bottom: 1px solid var(--rule); vertical-align: top;
}
tbody tr:nth-child(even) td { background: #f6f8f4; }
td:first-child { font-weight: 700; color: var(--green-dark); white-space: nowrap; }

/* tracker: two stacked blocks of 15 days, side by side */
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid2 td, .grid2 th { font-size: 8.4pt; padding: 4px 5px; text-align: center; }
.grid2 td:first-child, .grid2 th:first-child { text-align: center; }
.grid2 td:not(:first-child) { height: 19px; }

.footnote { font-size: 9.2pt; color: var(--muted); font-style: italic; line-height: 1.45; }
.closing { font-size: 11pt; font-weight: 700; color: var(--green); line-height: 1.5; }

.ftr {
  flex-shrink: 0; border-top: 1px solid var(--rule); margin-top: 10px; padding-top: 5px;
  display: flex; justify-content: space-between;
  font-size: 7.6pt; color: var(--muted); letter-spacing: 0.4px;
}
"""


def esc(s):
    return html.escape(str(s), quote=False)


def render_table(t):
    cols = t.get("columns", [])
    rows = t.get("rows", [])
    cap = f"<caption>{esc(t['caption'])}</caption>" if t.get("caption") else ""
    head = "".join(f"<th>{esc(c)}</th>" for c in cols)

    def block(subset):
        body = "".join(
            "<tr>" + "".join(f"<td>{esc(c)}</td>" for c in r) + "</tr>" for r in subset
        )
        return f"<table>{cap}<thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>"

    if t.get("layout") == "two-column-15":
        half = (len(rows) + 1) // 2
        # caption only once, on the left block
        left = block(rows[:half])
        right = block(rows[half:]).replace(cap, "", 1)
        return f'<div class="grid2">{left}{right}</div>'
    return block(rows)


def render_page(p, total):
    bits = []
    for para in p.get("body", []):
        bits.append(f'<p class="body">{esc(para)}</p>')
    if p.get("table"):
        bits.append(render_table(p["table"]))
    for s in p.get("sections", []):
        inner = "".join(f"<p>{esc(b)}</p>" for b in s.get("body", []))
        if s.get("bullets"):
            inner += '<ul class="bul">' + "".join(
                f"<li>{esc(b)}</li>" for b in s["bullets"]) + "</ul>"
        bits.append(f'<div class="sec"><h3>{esc(s.get("title",""))}</h3>{inner}</div>')
    if p.get("bullets"):
        bits.append('<ul class="bul">' + "".join(
            f"<li>{esc(b)}</li>" for b in p["bullets"]) + "</ul>")
    if p.get("note"):
        bits.append(f'<div class="note">{esc(p["note"])}</div>')
    if p.get("closing"):
        bits.append(f'<p class="closing">{esc(p["closing"])}</p>')
    if p.get("footer_note"):
        bits.append(f'<p class="footnote">{esc(p["footer_note"])}</p>')

    sub = f'<div class="sub">{esc(p["subheading"])}</div>' if p.get("subheading") else ""
    return (
        '<section class="page">'
        f'<div class="hdr"><h2>{esc(p["heading"])}</h2>{sub}</div>'
        f'<div class="content">{"".join(bits)}</div>'
        f'<div class="ftr"><span>carnivoreweekly.com</span>'
        f'<span>30-Day Keto Meal Plan &amp; Food Guide</span>'
        f'<span>Page {p.get("page","")} of {total}</span></div>'
        "</section>"
    )


def render_cover(c):
    return (
        '<section class="page cover">'
        '<div class="rule-top"></div>'
        f'<h1>{esc(c["title"])}</h1>'
        f'<div class="sub">{esc(c["subtitle"])}</div>'
        f'<div class="intro">{esc(c["intro"])}</div>'
        f'<div class="brand">{esc(c["brand_line"])}</div>'
        '<div class="rule-bot"></div>'
        f'<div class="disclaim">{esc(c["disclaimer"])}</div>'
        "</section>"
    )


def merge_week_pairs(pages):
    """Fold week-Na and week-Nb into one page per week.

    Sarah wrote each week as 4 days + 3 days, which renders as two pages that
    are each about half empty. A whole week on one sheet fills the page and is
    the more useful artifact anyway: it is the thing you pin to the fridge on
    Sunday. Layout is the renderer's job, so the merge happens here rather than
    by asking for the content to be rewritten.
    """
    by_id = {p["id"]: p for p in pages}
    out, skip = [], set()

    for p in pages:
        pid = p["id"]
        if pid in skip:
            continue
        if pid.endswith("a") and pid.startswith("week-"):
            partner = by_id.get(pid[:-1] + "b")
            if partner:
                m = dict(p)
                first = p.get("subheading", "").split()
                last = partner.get("subheading", "").split()
                if first and last:
                    m["subheading"] = f"{first[0]} {first[1]} to {last[-1]}"
                m["body"] = p.get("body", []) + partner.get("body", [])
                m["sections"] = p.get("sections", []) + partner.get("sections", [])
                if p.get("table") and partner.get("table"):
                    t = dict(p["table"])
                    t["rows"] = p["table"]["rows"] + partner["table"]["rows"]
                    t["caption"] = m["subheading"]
                    m["table"] = t
                if partner.get("note") and not m.get("note"):
                    m["note"] = partner["note"]
                skip.add(partner["id"])
                out.append(m)
                continue
        out.append(p)

    for i, p in enumerate(out, start=1):
        p["page"] = i
    return out


def build_html(data, size):
    pages_data = merge_week_pairs(data["pages"])
    total = len(pages_data)
    pages = [render_cover(data["cover"])] + [
        render_page(p, total) for p in pages_data
    ]
    css = CSS % {"w": SIZES[size]["w"], "h": SIZES[size]["h"]}
    return (
        "<!DOCTYPE html><html lang='en'><head><meta charset='utf-8'>"
        f"<title>{esc(data['product_title'])}</title><style>{css}</style></head>"
        f"<body>{''.join(pages)}</body></html>"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--html-only", action="store_true")
    a = ap.parse_args()

    data = json.loads(CONTENT.read_text())
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for size, spec in SIZES.items():
        doc = build_html(data, size)
        hp = BUILD_DIR / f"keto-flagship-{size}.html"
        hp.write_text(doc)
        print(f"  html: {hp.relative_to(ROOT)}  ({len(doc)//1024} KB)")
        if a.html_only:
            continue
        out = OUT_DIR / spec["file"]
        with sync_playwright() as pw:
            b = pw.chromium.launch()
            pg = b.new_page()
            pg.goto(hp.as_uri(), wait_until="networkidle")
            pg.emulate_media(media="print")
            pg.pdf(path=str(out), width=spec["w"], height=spec["h"],
                   print_background=True, margin={"top": "0", "right": "0",
                                                  "bottom": "0", "left": "0"})
            b.close()
        print(f"  pdf : {out.relative_to(ROOT)}  ({out.stat().st_size//1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
