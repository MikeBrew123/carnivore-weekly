#!/usr/bin/env python3
"""Render the design-forward Doctor Visit Prep Kit v2 (2026-08-05 rebuild).

The product is hand-authored HTML (doctor-visit-prep-kit.html, 12 fixed-height
Letter pages, inline SVG graphics, clinical register). This script renders it
to PDF via Playwright and FAILS LOUDLY on any page overflow (ISSUE-060 rule:
split content, never squeeze).

Output: etsy/products/pdfs/doctor-visit-prep-kit.pdf
"""
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SRC = HERE / "doctor-visit-prep-kit.html"
OUT = HERE.parent / "pdfs" / "doctor-visit-prep-kit.pdf"

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    pg = browser.new_page()
    pg.goto(SRC.as_uri())
    pg.wait_for_timeout(1500)  # webfont load
    n = pg.evaluate("() => document.querySelectorAll('.page').length")
    overflows = pg.evaluate(
        """() => [...document.querySelectorAll('.page')].map((p,i)=>{
               const b = p.querySelector('.body') || p.querySelector('.cover-inner');
               return b && b.scrollHeight > b.clientHeight + 2 ? i+1 : null;
           }).filter(x=>x!==null)"""
    )
    if overflows:
        print(f"OVERFLOW on pages {overflows} — fix the content/layout, do not squeeze")
        sys.exit(1)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    pg.pdf(path=str(OUT), format="Letter", print_background=True)
    browser.close()

print(f"Built {OUT} ({n} pages, no overflow)")
