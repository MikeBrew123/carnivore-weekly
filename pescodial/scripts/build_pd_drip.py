#!/usr/bin/env python3
"""Build the PescoDial welcome drip HTML from Sarah's fact-checked drafts.

    python3 pescodial/scripts/build_pd_drip.py          # write data/drip-emails/pd/day-N.html
    python3 pescodial/scripts/build_pd_drip.py --check  # exit 1 if any file is stale

Source: pescodial/drafts/drip/day-N.md (Sarah, fact-checked 2026-10-03, see FACTCHECK.md).
Edit the draft, never the HTML. Output format matches what scripts/send_drip.py reads:
a `<!-- Subject: ... -->` first line and a `{$unsubscribe}` merge tag.

[PROMO SLOT] lines are dropped: there is no PescoDial offer until the paid report
ships and Brew approves one, and send_drip.py sends PD promo days as plain emails.
Colours come from Brew's report design (pescodial/design/report-v2/plan.html).
"""
import argparse
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFTS = ROOT / "pescodial" / "drafts" / "drip"
OUT = ROOT / "data" / "drip-emails" / "pd"

SEA, SEA_SOFT, OLIVE, TERRA, INK, INK2, CREAM, LINE = (
    "#1d4a66", "#dfeaf0", "#5f6e33", "#b5552f", "#1d2830", "#4a5560", "#f7efdd", "#ddd2ba")
P = f'<p style="margin:0 0 16px 0">'
BULLET_RE = re.compile(r"^\s*[-*] ")
NUMBER_RE = re.compile(r"^\s*\d+\. ")
URL_RE = re.compile(r"(https?://[^\s<)]+[^\s<).,;:!?])")


def utm(url, day):
    if "pescodial.com" not in url:
        return url
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}utm_source=drip&utm_medium=email&utm_campaign=pd-day{day}"


def inline(text, day):
    """Escape, then bold/italic/links. Order matters: escape first, then markup."""
    t = html.escape(text, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r'<strong style="color:%s">\1</strong>' % INK, t)
    t = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", t)
    t = URL_RE.sub(lambda m: f'<a href="{utm(html.unescape(m.group(1)), day)}" style="color:{SEA}; font-weight:600">{m.group(1)}</a>', t)
    return t


def parse(md):
    lines = md.replace("\r\n", "\n").split("\n")
    meta = {}
    while lines and re.match(r"^(Subject|Preheader):", lines[0]):
        k, v = lines.pop(0).split(":", 1)
        meta[k.lower()] = v.strip()
    body = "\n".join(lines).strip()
    sources = ""
    if "\n---\n" in body:
        body, sources = body.split("\n---\n", 1)
    body = "\n".join(l for l in body.split("\n") if l.strip() != "[PROMO SLOT]")
    return meta, body.strip(), sources.strip()


def blocks(text):
    return [b.strip("\n") for b in re.split(r"\n\s*\n", text) if b.strip()]


def render_blocks(text, day, small=False):
    out = []
    style_p = P if not small else f'<p style="margin:0 0 8px 0; font-size:14px; color:{INK2}">'
    for b in blocks(text):
        rows = b.split("\n")
        if all(re.match(r"^\s*[-*] ", r) for r in rows):
            items = "".join('<li style="margin-bottom:8px">' + inline(BULLET_RE.sub("", r), day) + "</li>" for r in rows)
            size = "font-size:14px; color:%s; " % INK2 if small else ""
            out.append(f'<ul style="{size}margin:10px 0 16px 0; padding-left:20px">{items}</ul>')
        elif all(re.match(r"^\s*\d+\. ", r) for r in rows):
            items = "".join('<li style="margin-bottom:8px">' + inline(NUMBER_RE.sub("", r), day) + "</li>" for r in rows)
            out.append(f'<ol style="margin:10px 0 16px 0; padding-left:22px">{items}</ol>')
        elif len(rows) == 1 and re.fullmatch(r"\*[^*].*\*", rows[0].strip()):
            # The "not a doctor" line.
            out.append(f'<p style="margin:24px 0 0 0; padding:14px 16px; background:{SEA_SOFT}; border-radius:6px; font-size:15px; color:{INK2}">{inline(rows[0].strip()[1:-1], day)}</p>')
        else:
            out.append(style_p + "<br>".join(inline(r, day) for r in rows) + "</p>")
    return "\n            ".join(out)


def split_signoff(body):
    """Pull 'Warmly,\\nSarah\\nPescoDial' (any closing word) out of the body."""
    m = re.search(r"\n\n([A-Z][^\n]{0,30},)\nSarah\nPescoDial\s*(\n\n|$)", "\n\n" + body + "\n\n")
    if not m:
        raise SystemExit("draft has no 'Closing,\\nSarah\\nPescoDial' sign-off")
    start = m.start() - 2
    before = body[:max(start, 0)].rstrip()
    after = ("\n\n" + body + "\n\n")[m.end():].strip()
    return before, m.group(1), after


def build(day):
    meta, body, sources = parse((DRAFTS / f"day-{day}.md").read_text())
    if "subject" not in meta:
        raise SystemExit(f"day-{day}.md has no Subject line")
    if "[PROMO" in body or "{$" in body:
        raise SystemExit(f"day-{day}.md still has a placeholder")
    main, closing, after = split_signoff(body)
    src_html = ""
    if sources:
        src = re.sub(r"^Sources:\s*", "", sources)
        src_html = (f'<div style="margin-top:24px; padding-top:16px; border-top:1px solid {LINE}">'
                    f'<p style="margin:0 0 8px 0; font-size:13px; font-weight:bold; letter-spacing:1px; color:{OLIVE}">SOURCES</p>'
                    f'{render_blocks(src, day, small=True)}</div>')
    pre = html.escape(meta.get("preheader", ""))
    return f"""<!-- Subject: {meta['subject']} -->
<!-- Generated by pescodial/scripts/build_pd_drip.py from pescodial/drafts/drip/day-{day}.md. Edit the draft, not this file. -->
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{html.escape(meta['subject'])}</title>
    <style type="text/css">
        body, div, p, a, li {{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }}
        a {{ word-break:break-word; }}
        @media only screen and (max-width:480px) {{
            .email-container {{ width:100% !important; max-width:100% !important; }}
            .header {{ padding:24px 16px !important; }}
            .content {{ padding:24px 18px !important; font-size:17px !important; }}
            .content p, .content li {{ font-size:17px !important; line-height:1.65 !important; }}
            .footer {{ padding:20px 16px !important; }}
            .footer a {{ display:inline-block !important; padding:12px 10px !important; }}
        }}
    </style>
</head>
<body style='margin:0; padding:0; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; background-color:#ebe2cd; color:{INK}' bgcolor="#ebe2cd">
    <div style="display:none; max-height:0; overflow:hidden; mso-hide:all">{pre}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
    <div class="email-container" style="max-width:600px; margin:0 auto; background-color:#ffffff" bgcolor="#ffffff">
        <div class="header" style="background:{SEA}; padding:30px 20px; text-align:center" align="center">
            <h1 style="margin:0; color:#ffffff; font-family:Georgia, serif; font-size:28px; font-weight:400">Pesco<em style="color:#d8e3a8">Dial</em></h1>
            <div style="color:#bcd3e0; font-size:14px; margin-top:8px; letter-spacing:1px">DAY {day}</div>
        </div>

        <div class="content" style="padding:30px 26px; line-height:1.7; font-size:16px; color:{INK}">
            <h2 style="color:{SEA}; font-family:Georgia, serif; font-size:24px; font-weight:400; margin-top:0; margin-bottom:20px">{html.escape(meta['subject'])}</h2>

            {render_blocks(main, day)}

            <div class="signature" style="margin-top:30px; padding-top:20px; border-top:1px solid {LINE}">
                {P}{html.escape(closing)}</p>
                <p style="margin:0 0 4px 0; color:{INK}; font-weight:bold">Sarah</p>
                <p style="margin:0 0 16px 0; font-size:15px; color:{INK2}">PescoDial</p>
            </div>
            {render_blocks(after, day) if after else ''}
            {src_html}
        </div>

        <div class="footer" style="background:{CREAM}; padding:20px; text-align:center; font-size:14px; color:{INK2}; border-top:1px solid {LINE}" align="center">
            <p style="margin:0 0 6px 0">You're receiving this because you signed up with the PescoDial calculator at pescodial.com</p>
            <p style="margin:0 0 6px 0">PescoDial · 1505 Spring Creek, Whistler, BC, Canada</p>
            <p style="margin:0"><a href="{{$unsubscribe}}" style="color:{INK2}; text-decoration:underline">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="fail if any generated file is missing or stale")
    args = ap.parse_args()
    days = sorted(int(m.group(1)) for p in DRAFTS.glob("day-*.md") if (m := re.match(r"day-(\d+)\.md$", p.name)))
    OUT.mkdir(parents=True, exist_ok=True)
    stale = []
    for day in days:
        out, target = build(day), OUT / f"day-{day}.html"
        if args.check:
            if not target.exists() or target.read_text() != out:
                stale.append(target.name)
        else:
            target.write_text(out)
            print(f"wrote {target.relative_to(ROOT)}")
    if stale:
        print("stale or missing:", ", ".join(stale))
        sys.exit(1)


if __name__ == "__main__":
    main()
