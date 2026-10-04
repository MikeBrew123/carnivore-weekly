#!/usr/bin/env python3
"""Build the PescoDial welcome drip HTML from Sarah's fact-checked drafts.

    python3 pescodial/scripts/build_pd_drip.py          # write data/drip-emails/pd/day-N.html
    python3 pescodial/scripts/build_pd_drip.py --check  # exit 1 if any file is stale

Source: pescodial/drafts/drip/day-N.md (Sarah, fact-checked 2026-10-03, see FACTCHECK.md).
Edit the draft, never the HTML. Output format matches what scripts/send_drip.py reads:
a `<!-- Subject: ... -->` first line and a `{$unsubscribe}` merge tag.

[PROMO SLOT] lines are dropped: there is no PescoDial offer until the paid report
ships and Brew approves one, and send_drip.py sends PD promo days as plain emails.
Layout and colours come from Brew's email design, shared with the newsletter
layout in pescodial/scripts/pd_email_shell.py (header, scallop, footer with the
signed {$unsubscribe} link and the CW/KD postal address).
"""
import argparse
import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFTS = ROOT / "pescodial" / "drafts" / "drip"
OUT = ROOT / "data" / "drip-emails" / "pd"

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pd_email_shell as shell  # noqa: E402
import json  # noqa: E402

CTA_BOXES = json.loads((DRAFTS / "cta-boxes.json").read_text())

# Palette from Brew's email design (pescodial/scripts/pd_email_shell.py).
SEA, SEA_SOFT, OLIVE, INK, INK2, LINE = (
    shell.NAVY, "#e3ebf2", shell.OLIVE, shell.INK, shell.MUTED, shell.RULE)
P = f'<p style="margin:0 0 16px 0">'
BULLET_RE = re.compile(r"^\s*[-*] ")
NUMBER_RE = re.compile(r"^\s*\d+\. ")
URL_RE = re.compile(r"(https?://[^\s<)]+[^\s<).,;:!?])")


def utm_query(day):
    return f"utm_source=drip&utm_medium=email&utm_campaign=pd-day{day}"


def utm(url, day):
    return shell.with_utm(url, utm_query(day))


def inline(text, day):
    """Escape, then bold/italic/links. Order matters: escape first, then markup."""
    t = html.escape(text, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r'<strong class="t-ink" style="color:%s">\1</strong>' % INK, t)
    t = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", t)
    t = URL_RE.sub(lambda m: f'<a class="t-link" href="{html.escape(utm(html.unescape(m.group(1)), day))}" style="color:{SEA}; font-weight:bold">{m.group(1)}</a>', t)
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
    subject = meta["subject"]
    # Order (Brew 2026-10-03): body, Sarah's reply question, sign-off, plan box, sources last.
    box = CTA_BOXES["drip"][str(day)]
    intro = [
        f'<h1 class="h1 t-sea" style="margin:0 0 20px;font-family:{shell.SERIF};font-weight:normal;'
        f'font-size:32px;line-height:38px;color:{shell.NAVY_DEEP};">{html.escape(subject)}</h1>',
        render_blocks(main, day),
    ]
    signoff = [
        f'<div style="margin-top:28px;padding-top:20px;border-top:1px solid {LINE}">'
        f'{P}{html.escape(closing)}</p>'
        f'<p style="margin:0 0 4px 0;font-weight:bold">Sarah</p>'
        f'<p style="margin:0 0 16px 0;font-size:16px;color:{INK2}" class="t-muted">PescoDial</p></div>',
    ]
    if after:
        signoff.append(render_blocks(after, day))
    sections = [
        shell.body_section("\n      ".join(intro)),
        shell.reply_block(box["reply"]["lead"], box["reply"]["question"]),
        shell.body_section("\n      ".join(signoff)),
        shell.calculator_box(box["heading"], box["text"], box["button"], utm=utm_query(day)),
    ]
    if sources:
        src = re.sub(r"^Sources:\s*", "", sources)
        sections.append(shell.body_section(
            f'<div style="padding-top:16px;border-top:1px solid {LINE}">'
            f'<p class="t-olive" style="margin:0 0 8px 0;font-size:13px;font-weight:bold;letter-spacing:1px;color:{OLIVE}">SOURCES</p>'
            f'{render_blocks(src, day, small=True)}</div>'))
    head = (f"<!-- Subject: {subject} -->\n"
            f"<!-- Generated by pescodial/scripts/build_pd_drip.py from pescodial/drafts/drip/day-{day}.md. Edit the draft, not this file. -->\n")
    return shell.render_email(
        title=subject, preheader=meta.get("preheader", ""),
        header_label="Welcome" if day == 1 else f"Day {day}", header_sub="Starter guide",
        sections=sections, unsubscribe=shell.DRIP_UNSUBSCRIBE, utm=utm_query(day),
        footer_reason="You're receiving this because you signed up with the PescoDial calculator at pescodial.com.",
        head_comment=head,
    )


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
