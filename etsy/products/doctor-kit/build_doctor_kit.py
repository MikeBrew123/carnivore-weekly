#!/usr/bin/env python3
"""Build the doctor-coordination printables (Prep Kit + BP/Glucose Log).

Parses Sarah's page-notation markdown into fixed-height Letter pages and
renders via Playwright. Explicit per-page sections only — no CSS column
balancing (ISSUE-060). Verify page counts after every build.

Usage:
  python3 build_doctor_kit.py --content-dir /path/to/markdown/dir
Outputs:
  etsy/products/pdfs/doctor-visit-prep-kit.pdf
  etsy/products/pdfs/bp-glucose-doctor-log.pdf
"""
import argparse
import html
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT_DIR = ROOT / "etsy" / "products" / "pdfs"

# Clinical design register (Sarah's spec, 2026-07-28 proposal doc)
TOKENS = {
    "BG": "#FAFAF8",
    "INK": "#1F2933",
    "SOFT": "#52606D",
    "BLUE": "#2C5F8A",
    "GREEN": "#2E7D5B",
    "LINE": "#D5DDE5",
    "FONT": "'Source Sans 3', 'Segoe UI', Helvetica, Arial, sans-serif",
}

PRODUCTS = {
    "prepkit": {
        "src": "product_prepkit.md",
        "out": "doctor-visit-prep-kit.pdf",
        "brand": "Carnivore Weekly",
        "title": "The Doctor Visit Prep Kit",
        "subtitle": "Low-Carb Edition",
        "expected_pages": 11,
    },
    "bplog": {
        "src": "product_bplog.md",
        "out": "bp-glucose-doctor-log.pdf",
        "brand": "Carnivore Weekly",
        "title": "Share-With-Your-Doctor BP & Glucose Log",
        "subtitle": "Home readings, organized for your next appointment",
        "expected_pages": 9,
    },
}

FOOTER = (
    "Educational paperwork only, never medical advice. Your doctor interprets, "
    "you decide together. &bull; carnivoreweekly.com"
)

CSS = """
@page { size: Letter; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: %(FONT)s; color: %(INK)s; background: %(BG)s; }
.page {
  width: 8.5in; height: 11in; padding: 0.65in 0.7in 0.85in;
  page-break-after: always; position: relative; background: %(BG)s;
  display: flex; flex-direction: column; overflow: hidden;
}
.page:last-child { page-break-after: avoid; }
.pagehead { border-bottom: 2px solid %(BLUE)s; padding-bottom: 6px; margin-bottom: 12px; }
.pagehead .brand { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: %(SOFT)s; }
.pagehead h2 { font-size: 19px; color: %(BLUE)s; font-weight: 700; margin-top: 2px; }
.body { flex: 1 1 auto; min-height: 0; }
p { font-size: 12.5px; line-height: 1.55; margin-bottom: 8px; }
h3 { font-size: 14px; color: %(GREEN)s; margin: 10px 0 5px; }
ul { margin: 0 0 10px 16px; }
li { font-size: 12.5px; line-height: 1.5; margin-bottom: 4px; }
.field { display: flex; align-items: baseline; gap: 8px; margin: 7px 0; }
.fieldgrid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 24px; }
.field .lbl { font-size: 12px; font-weight: 600; color: %(SOFT)s; white-space: nowrap; }
.field .line { flex: 1; border-bottom: 1px solid %(INK)s; height: 18px; }
.multi .lbl { font-size: 12px; font-weight: 600; color: %(SOFT)s; display: block; margin: 8px 0 2px; }
.multi .rule { border-bottom: 1px solid %(LINE)s; height: 21px; }
.cb { display: flex; align-items: center; gap: 9px; margin: 5.5px 0; font-size: 12.5px; }
.cb .box { width: 14px; height: 14px; border: 1.5px solid %(BLUE)s; border-radius: 2px; flex: none; }
table { width: 100%%; border-collapse: collapse; margin: 7px 0 10px; }
th { background: %(BLUE)s; color: #fff; font-size: 9.5px; text-transform: uppercase;
     letter-spacing: 0.5px; padding: 5px 6px; text-align: left; }
td { border: 1px solid %(LINE)s; height: 24px; padding: 2px 6px; font-size: 12px; }
.callout { background: #EEF3F7; border-left: 3px solid %(GREEN)s; padding: 10px 12px;
           margin: 10px 0; font-size: 12px; line-height: 1.5; }
.footer { position: absolute; bottom: 0.32in; left: 0.7in; right: 0.7in;
          display: flex; justify-content: space-between; font-size: 9px; color: %(SOFT)s;
          border-top: 1px solid %(LINE)s; padding-top: 5px; }
.cover { justify-content: center; text-align: center; }
.cover .brand { font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: %(SOFT)s; margin-bottom: 18px; }
.cover h1 { font-size: 34px; color: %(BLUE)s; line-height: 1.2; margin-bottom: 10px; }
.cover .sub { font-size: 15px; color: %(GREEN)s; margin-bottom: 26px; }
.cover .rule-block { width: 60px; border-top: 3px solid %(GREEN)s; margin: 0 auto 26px; }
""" % TOKENS


def esc(s: str) -> str:
    return html.escape(s, quote=False)


def inline(s: str) -> str:
    s = esc(s)
    s = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"\*(.+?)\*", r"<em>\1</em>", s)
    return s


def render_line(line: str) -> str:
    line = re.sub(r"^- (?=\[)", "", line)
    m = re.match(r"^\[FIELD: (.+?)\]$", line)
    if m:
        return f'<div class="field"><span class="lbl">{esc(m.group(1))}</span><span class="line"></span></div>'
    m = re.match(r"^\[FIELD-MULTI: (.+?), (\d+) lines?\]$", line)
    if m:
        rules = '<div class="rule"></div>' * int(m.group(2))
        return f'<div class="multi"><span class="lbl">{esc(m.group(1))}</span>{rules}</div>'
    m = re.match(r"^\[CHECKBOX: (.+?)\]$", line)
    if m:
        return f'<div class="cb"><span class="box"></span><span>{inline(m.group(1))}</span></div>'
    m = re.match(r"^\[TABLE: (.+?), (\d+) rows?\]$", line)
    if m:
        cols = [c.strip() for c in m.group(1).split("|")]
        head = "".join(f"<th>{esc(c)}</th>" for c in cols)
        row = "<tr>" + "".join("<td></td>" for _ in cols) + "</tr>"
        return f"<table><tr>{head}</tr>{row * int(m.group(2))}</table>"
    return ""


def md_to_pages(md: str, meta: dict) -> str:
    pages = re.split(r"^## PAGE \d+: ?", md, flags=re.M)[1:]
    titles_and_bodies = []
    for chunk in pages:
        lines = chunk.strip().splitlines()
        titles_and_bodies.append((lines[0].strip(), lines[1:]))

    out = []
    for idx, (title, body_lines) in enumerate(titles_and_bodies, start=1):
        body_html, buf_ul = [], []

        def flush_ul():
            nonlocal buf_ul
            if buf_ul:
                body_html.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in buf_ul) + "</ul>")
                buf_ul = []

        for raw in body_lines:
            line = raw.rstrip()
            if not line.strip():
                flush_ul()
                continue
            if re.match(r"^-{3,}$", line.strip()):
                flush_ul()
                continue
            bare = line.strip().strip("*_").lower()
            if idx == 1 and bare in {meta["title"].lower(), meta["subtitle"].lower()}:
                continue
            special = render_line(line.strip())
            if special:
                flush_ul()
                body_html.append(special)
            elif line.startswith("### "):
                flush_ul()
                body_html.append(f"<h3>{inline(line[4:])}</h3>")
            elif line.startswith("> "):
                flush_ul()
                body_html.append(f'<div class="callout">{inline(line[2:])}</div>')
            elif line.startswith("- "):
                buf_ul.append(line[2:])
            else:
                flush_ul()
                body_html.append(f"<p>{inline(line)}</p>")
        flush_ul()

        # Pack runs of >=4 consecutive single fields into a 2-column grid
        packed, run = [], []
        for el in body_html:
            if el.startswith('<div class="field">'):
                run.append(el)
            else:
                if len(run) >= 4:
                    packed.append('<div class="fieldgrid">' + "".join(run) + "</div>")
                else:
                    packed.extend(run)
                run = []
                packed.append(el)
        if len(run) >= 4:
            packed.append('<div class="fieldgrid">' + "".join(run) + "</div>")
        else:
            packed.extend(run)
        body_html = packed

        if idx == 1:  # cover page
            page = (
                f'<div class="page cover"><div class="brand">{esc(meta["brand"])}</div>'
                f'<h1>{esc(meta["title"])}</h1><div class="sub">{esc(meta["subtitle"])}</div>'
                f'<div class="rule-block"></div><div style="max-width:5.2in;margin:0 auto;text-align:left;">'
                + "".join(body_html)
                + f'</div><div class="footer"><span>{FOOTER}</span><span>Page {idx}</span></div></div>'
            )
        else:
            page = (
                f'<div class="page"><div class="pagehead"><div class="brand">{esc(meta["brand"])} '
                f'&mdash; {esc(meta["title"])}</div><h2>{esc(title)}</h2></div>'
                f'<div class="body">' + "".join(body_html) + "</div>"
                f'<div class="footer"><span>{FOOTER}</span><span>Page {idx}</span></div></div>'
            )
        out.append(page)
    return "".join(out), len(titles_and_bodies)


def build(content_dir: Path):
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    results = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        pg = browser.new_page()
        for key, meta in PRODUCTS.items():
            src = content_dir / meta["src"]
            body, n_pages = md_to_pages(src.read_text(), meta)
            if n_pages != meta["expected_pages"]:
                print(f"WARNING: {key} has {n_pages} pages, expected {meta['expected_pages']}")
            doc = (
                "<!DOCTYPE html><html><head><meta charset='utf-8'>"
                "<link href='https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap' rel='stylesheet'>"
                f"<style>{CSS}</style></head><body>{body}</body></html>"
            )
            html_path = OUT_DIR / f"_{key}.html"
            html_path.write_text(doc)
            pg.goto(html_path.as_uri())
            pg.wait_for_timeout(1200)  # font load
            # Per-page auto-fit: zoom down any overflowing body (min 0.82 to
            # stay readable for 60+ eyes; louder failure below if that's not
            # enough — then the CONTENT must be split, not squeezed further).
            pg.evaluate(
                """() => { for (const p of document.querySelectorAll('.page')) {
                       const b = p.querySelector('.body');
                       if (!b) continue;
                       if (b.scrollHeight > b.clientHeight + 2) {
                           const z = Math.max(0.88, (b.clientHeight / b.scrollHeight) - 0.01);
                           b.style.zoom = z.toFixed(3);
                       }
                   } }"""
            )
            pg.wait_for_timeout(200)
            overflows = pg.evaluate(
                """() => [...document.querySelectorAll('.page')].map((p,i)=>{
                       const b = p.querySelector('.body');
                       return b && b.scrollHeight > b.clientHeight + 2 ? i+1 : null;
                   }).filter(x=>x!==null)"""
            )
            if overflows:
                print(f"STILL OVERFLOWING after auto-fit in {key}: pages {overflows} — split the content")
                sys.exit(1)
            out = OUT_DIR / meta["out"]
            pg.pdf(path=str(out), format="Letter", print_background=True)
            html_path.unlink()
            results.append((key, out, n_pages))
        browser.close()
    for key, out, n in results:
        print(f"Built {key}: {out} ({n} content pages)")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--content-dir", required=True)
    args = ap.parse_args()
    build(Path(args.content_dir))
