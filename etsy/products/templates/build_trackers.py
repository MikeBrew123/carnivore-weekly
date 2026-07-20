#!/usr/bin/env python3
"""Build the free 30-day tracker PDFs (CW carnivore + KD keto bonus assets).

Renders etsy/products/templates/tracker_30day.html.tpl per site via Playwright.
Outputs:
  etsy/products/pdfs/carnivore-30-day-tracker.pdf
  etsy/products/pdfs/keto-30-day-tracker.pdf
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
TPL = Path(__file__).parent / "tracker_30day.html.tpl"
OUT_DIR = ROOT / "etsy" / "products" / "pdfs"

CHECKINS = {7, 14, 21, 30}


def grid(rows, start, end):
    days = list(range(start, end + 1))
    ths = "".join(
        f'<th class="ck">{d}</th>' if d in CHECKINS else f"<th>{d}</th>" for d in days
    )
    body = ""
    for label, sub in rows:
        subhtml = f'<span class="sub">{sub}</span>' if sub else ""
        body += (
            f'<tr><td class="lbl">{label}{subhtml}</td>'
            + "".join("<td></td>" for _ in days)
            + "</tr>"
        )
    return (
        f'<table><tr><th class="lbl">DAY</th>{ths}</tr>{body}</table>'
    )


VARIANTS = {
    "carnivore": {
        "out": "carnivore-30-day-tracker.pdf",
        "BRAND": "Carnivore Weekly",
        "TITLE": "30-Day Carnivore Tracker",
        "TAGLINE": "Eat animal foods. Heal your body. Keep it simple.",
        "HOWTO": (
            "Print it, stick it on the fridge, and fill in one column each night. "
            "Checkmarks for the habits, 0&ndash;10 scores for how you feel."
        ),
        "MOTTO": "Keep it simple. Stay consistent. Become unstoppable.",
        "URL": "carnivoreweekly.com",
        "FOOTNOTE": "Free bonus from the CarnivoreWeekly shop &bull; 30-day email guide at carnivoreweekly.com/bonus",
        "BODY_FONT": "'Source Sans 3', Helvetica, Arial, sans-serif",
        "HEAD_FONT": "'Libre Baskerville', Georgia, serif",
        "BG": "#faf5ec", "INK": "#2c1810", "SOFT": "#7a5c44",
        "ACCENT": "#a8341f", "LINE": "#c9ab8c", "HEADBG": "#2c1810",
        "HEADINK": "#f4e4d4", "LBLBG": "#f1e6d4",
        "rows": [
            ("Meat", "enough to satiety?"),
            ("Fat", "don't fear it"),
            ("Water", "8+ glasses"),
            ("Salt", "used liberally?"),
            ("Symptoms", "0-10 scale"),
            ("Energy", "0-10 scale"),
            ("Mood", "0-10 scale"),
            ("Notes", ""),
        ],
    },
    "keto": {
        "out": "keto-30-day-tracker.pdf",
        "BRAND": "KetoDial",
        "TITLE": "30-Day Keto Tracker",
        "TAGLINE": "Dial it in. Low carb, steady energy, no guesswork.",
        "HOWTO": (
            "Print it, stick it on the fridge, and fill in one column each night. "
            "Checkmarks for the habits, 0&ndash;10 scores for how you feel."
        ),
        "MOTTO": "Small dials, big results. One honest column a day.",
        "URL": "ketodial.com",
        "FOOTNOTE": "Free bonus from the CarnivoreWeekly shop &bull; more keto tools at ketodial.com/bonus.html",
        "BODY_FONT": "'Inter', Helvetica, Arial, sans-serif",
        "HEAD_FONT": "'Inter', Helvetica, Arial, sans-serif",
        "BG": "#f1f5f9", "INK": "#0f172a", "SOFT": "#475569",
        "ACCENT": "#0e9db8", "LINE": "#b9c8d4", "HEADBG": "#0b1620",
        "HEADINK": "#e2eef7", "LBLBG": "#e2e8f0",
        "rows": [
            ("Net carbs", "under 20g?"),
            ("Protein", "hit your target?"),
            ("Fat", "to satiety"),
            ("Water", "8+ glasses"),
            ("Electrolytes", "sodium / mag / potassium"),
            ("Symptoms", "0-10 scale"),
            ("Energy", "0-10 scale"),
            ("Mood", "0-10 scale"),
            ("Notes", ""),
        ],
    },
}


def build():
    tpl = TPL.read_text()
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page()
        for name, v in VARIANTS.items():
            html = tpl
            html = html.replace("{{TABLE1}}", grid(v["rows"], 1, 15))
            html = html.replace("{{TABLE2}}", grid(v["rows"], 16, 30))
            html = html.replace("{{CHECKIN_DAYS}}", "7, 14, 21, 30")
            for k, val in v.items():
                if k in ("out", "rows"):
                    continue
                html = html.replace("{{" + k + "}}", val)
            page.set_content(html, wait_until="networkidle")
            page.emulate_media(media="print")
            out = OUT_DIR / v["out"]
            page.pdf(
                path=str(out), width="11in", height="8.5in",
                margin={"top": "0", "right": "0", "bottom": "0", "left": "0"},
                print_background=True, scale=1.0,
            )
            print(f"built {out}")
        browser.close()


if __name__ == "__main__":
    build()
