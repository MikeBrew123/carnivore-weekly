#!/usr/bin/env python3
"""PescoDial welcome drip (data/drip-emails/pd/).

  A. the HTML is generated from Sarah's drafts and is not stale;
  B. every email has a subject, the unsubscribe merge tag, PescoDial branding and
     no Carnivore Weekly / KetoDial branding, no em-dashes, no leftover placeholder;
  C. send_drip.py --site pd sends day 7 and day 28 as plain emails: no Stripe
     promo code is minted and nothing crashes on missing promo copy.
  D. Brew's email shell (pescodial/scripts/pd_email_shell.py), on every drip and on
     the sample newsletter: header wordmark, the signed-unsubscribe merge tag that
     the sender really substitutes, the CW/KD postal address, no Claude Design
     branding, no em dash, no placeholder photo box, no link to a pescodial page
     that does not exist (checked against pescodial/templates/pages and the
     generated pescodial/public), www links only.

No network, no Stripe, no email. Run: python3 tests/test_pd_drip.py
"""
import json
import os
import re
import subprocess
import sys
from html import unescape as html_unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
os.environ.setdefault("UNSUBSCRIBE_SECRET", "test-unsubscribe-secret")
import send_drip  # noqa: E402

FAILED = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" - {detail}"))
    if not ok:
        FAILED.append(name)


def test_generated_and_fresh():
    r = subprocess.run([sys.executable, str(ROOT / "pescodial/scripts/build_pd_drip.py"), "--check"], capture_output=True, text=True)
    check("A. drip HTML matches the drafts", r.returncode == 0, r.stdout + r.stderr)
    drafts = sorted(p.stem for p in (ROOT / "pescodial/drafts/drip").glob("day-*.md"))
    built = sorted(p.stem for p in (ROOT / "data/drip-emails/pd").glob("day-*.html"))
    check("A. one email per draft", drafts == built, f"{drafts} vs {built}")


def test_content():
    for p in sorted((ROOT / "data/drip-emails/pd").glob("day-*.html")):
        h = p.read_text()
        check(f"B. {p.name} subject", bool(re.match(r"<!-- Subject: .+ -->", h)))
        check(f"B. {p.name} unsubscribe tag", "{$unsubscribe}" in h)
        check(f"B. {p.name} PescoDial sign-off", "Sarah</p>" in h and "PescoDial</p>" in h)
        bad = re.search(r"carnivore\s*weekly|carnivoreweekly|ketodial|\[PROMO|\{\$promo|—|\*\*", h, re.I)
        check(f"B. {p.name} no foreign brand or placeholder", not bad, bad and bad.group(0))


def test_promo_days_plain():
    send_drip.SITE, send_drip.CFG = "pd", send_drip.SITES["pd"]
    minted = []
    real = send_drip.mint_promo_code
    send_drip.mint_promo_code = lambda *a, **k: minted.append(a) or "WEEK1-XXXXX"
    try:
        for day in (7, 28):
            _, html = send_drip.load_drip_email(day)
            out = send_drip.apply_promo(html, day, "reader@example.com", "sk_test_stub", buyers=set())
            check(f"C. pd day {day} sends without an offer", "{$promo" not in out and "WEEK1" not in out and "GRAD" not in out)
        check("C. no Stripe code minted for pd", minted == [], f"{len(minted)} minted")
    finally:
        send_drip.mint_promo_code = real
        send_drip.SITE, send_drip.CFG = "cw", send_drip.SITES["cw"]


# ===== D. Email shell =====
sys.path.insert(0, str(ROOT / "pescodial" / "scripts"))
import pd_email_shell as shell  # noqa: E402
import send_newsletter  # noqa: E402

PD_PUBLIC = ROOT / "pescodial" / "public"
PD_PAGES = ROOT / "pescodial" / "templates" / "pages"
WORDMARK = re.compile(r'>Pesco<span style="color:#c6cf91;">Dial</span></a>')
PD_LINK = re.compile(r'href="(https?://[^"]*pescodial\.com[^"]*)"')


def pd_page_exists(url):
    """True only if the URL is a www.pescodial.com page the site actually builds."""
    m = re.match(r"https://www\.pescodial\.com(/[^?#]*)?(?:\?[^#]*)?(?:#(.*))?$", html_unescape(url))
    if not m:
        return False
    path, frag = (m.group(1) or "/"), m.group(2)
    rel = path.strip("/")
    target = PD_PUBLIC / rel / "index.html" if not rel.endswith(".html") else PD_PUBLIC / rel
    template = PD_PAGES / ((rel.split("/")[0] or "index") + ".html")
    built = target.exists()
    # top-level pages must also have a source template; nested ones (guides/x/) must be built
    if "/" not in rel and not template.exists() and rel != "guides":
        return False
    if not built:
        return False
    return not frag or f'id="{frag}"' in target.read_text()


def html_unescape(s):
    import html as _h
    return _h.unescape(s)


def shell_checks(label, h, unsub_tag):
    check(f"D. {label} header wordmark", bool(WORDMARK.search(h)))
    check(f"D. {label} unsubscribe link uses the sender's merge tag",
          f'href="{unsub_tag}"' in h and ">Unsubscribe</a>" in h)
    check(f"D. {label} no nonexistent unsubscribe/preferences page",
          not re.search(r"pescodial\.com/(unsubscribe|preferences)", h))
    if shell.POSTAL_ADDRESS:
        check(f"D. {label} postal address", shell.POSTAL_ADDRESS in h and "[Postal address]" not in h)
    else:
        check(f"D. {label} postal address TODO is flagged", "TODO" in h)
    check(f"D. {label} no Claude Design branding", "claude_design_branding" not in h and "Made with Claude" not in h)
    check(f"D. {label} no em dash", "\u2014" not in h and "&mdash;" not in h)
    check(f"D. {label} no placeholder photo box",
          not re.search(r"bg-ph|border:1px dashed|Photo:|<img(?![^>]*src=\"https://)", h))
    links = PD_LINK.findall(h)
    dead = [u for u in links if not pd_page_exists(u)]
    check(f"D. {label} every pescodial link is a real www page", bool(links) and not dead, dead[:3])


def test_shell():
    # The merge tags must be the ones the senders really replace, or the link is dead.
    send_drip.SITE, send_drip.UNSUB_SECRET = "pd", "test-unsubscribe-secret"
    try:
        drip_out = send_drip.personalize("x " + shell.DRIP_UNSUBSCRIBE, "a@example.com")
    finally:
        send_drip.SITE, send_drip.UNSUB_SECRET = "cw", None
    check("D. drip merge tag is substituted by send_drip", shell.DRIP_UNSUBSCRIBE not in drip_out and "unsubscribe?" in drip_out)
    nl_out = send_newsletter.personalize_html("x " + shell.NEWSLETTER_UNSUBSCRIBE, "a@example.com", "kd", "s")
    check("D. newsletter merge tag is substituted by send_newsletter", shell.NEWSLETTER_UNSUBSCRIBE not in nl_out and "unsubscribe?" in nl_out)

    for p in sorted((ROOT / "data/drip-emails/pd").glob("day-*.html")):
        shell_checks(p.name, p.read_text(), shell.DRIP_UNSUBSCRIBE)
        check(f"D. {p.name} drip links carry the drip UTM", "utm_campaign=pd-day" in p.read_text())

    issue = json.loads((ROOT / "tests/fixtures/pd_newsletter_sample.json").read_text())
    nl = shell.render_newsletter(issue)
    shell_checks("sample newsletter", nl, shell.NEWSLETTER_UNSUBSCRIBE)
    for part in ("Question of the week", "This week's recipe", "Shopping tip", "Haven't tried the calculator yet?"):
        check(f"D. sample newsletter has {part!r}", part in nl)
    check("D. newsletter without image has no <img>", "<img" not in nl)

    with_img = dict(issue, recipe=dict(issue["recipe"], image_url="https://example.com/salmon.jpg"))
    check("D. newsletter with image_url renders the photo", '<img src="https://example.com/salmon.jpg"' in shell.render_newsletter(with_img))
    bare = {k: issue[k] for k in ("title", "preheader", "date", "intro")}
    nb = shell.render_newsletter(bare)
    check("D. optional newsletter sections are omitted when absent",
          all(x not in nb for x in ("Question of the week", "This week's recipe", "Shopping tip", "<!-- CALCULATOR -->")))
    try:
        shell.render_newsletter({})
        check("D. newsletter refuses an empty issue (no default content)", False)
    except ValueError:
        check("D. newsletter refuses an empty issue (no default content)", True)
    check("D. link checker rejects a nonexistent page", not pd_page_exists("https://www.pescodial.com/guides/canned-tuna"))
    check("D. link checker rejects the apex domain", not pd_page_exists("https://pescodial.com/calculator/"))
    check("D. link checker accepts #calc on the homepage", pd_page_exists("https://www.pescodial.com/?utm_source=x#calc"))


def test_engagement():
    """Brew 2026-10-03: every email asks one reply question and sells the 7-day plan."""
    import json
    boxes = json.loads((ROOT / "pescodial/drafts/drip/cta-boxes.json").read_text())
    for p in sorted((ROOT / "data/drip-emails/pd").glob("day-*.html")):
        h = html_unescape(p.read_text()); day = p.stem.split("-")[1]; box = boxes["drip"][day]
        check(f"E. {p.stem} asks Sarah's reply question", "Your turn" in h and box["reply"]["question"] in h)
        check(f"E. {p.stem} plan box sells the 7-day plan", box["heading"] in h and "7-Day Plan" in h)


def test_header_fits_phone():
    """Brew 2026-10-03: on an iPhone the wordmark wrapped to 'PescoDi / al'."""
    for p in sorted((ROOT / "data/drip-emails/pd").glob("day-*.html")):
        h = p.read_text()
        check(f"F. {p.stem} wordmark never wraps", 'class="wm"' in h and "white-space:nowrap" in h and ".wm {" in h)


if __name__ == "__main__":
    test_generated_and_fresh()
    test_content()
    test_promo_days_plain()
    test_shell()
    test_engagement()
    test_header_fits_phone()
    sys.exit(1 if FAILED else 0)
