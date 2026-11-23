#!/usr/bin/env python3
"""CW drip links carry email UTMs; KD/PD drips and cross-site links are untouched.

Until 2026-11-23 only offer links were tagged, so check-in, one-tap and blog clicks
from the welcome emails landed in GA4 as Direct. Renders every drip template through
send_drip.personalize() offline (no Resend, no Supabase) and checks each href.
Run: python3 tests/test_drip_email_utm.py
"""
import html as H, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import send_drip as d

d.UNSUB_SECRET = "t" * 32
fails = []
for site in ("cw", "kd", "pd"):
    d.SITE, d.CFG = site, d.SITES[site]
    for f in sorted(d.CFG["drip_dir"].glob("day-*.html")):
        day = int(re.match(r"day-(\d+)", f.name).group(1))
        raw = f.read_text(encoding="utf-8")
        raw_hrefs = [H.unescape(h) for h in re.findall(r'href="([^"]+)"', raw)]
        out = d.personalize(raw, "reader@example.com", "TOKEN123", day=day)
        for h in (H.unescape(x) for x in re.findall(r'href="([^"]+)"', out)):
            if site == "cw" and h.startswith("https://carnivoreweekly.com/") and "utm_medium=email" not in h:
                fails.append(f"{site} {f.name}: untagged {h}")
            if site != "cw" and "utm_campaign=day" in h and h.split("&t=")[0] not in [r.split("&t=")[0] for r in raw_hrefs] and "unsub" not in h:
                fails.append(f"{site} {f.name}: KD/PD link changed {h}")
            if site == "cw" and "ketodial.com" in h and h not in raw_hrefs:
                fails.append(f"cw {f.name}: ketodial.com link changed {h}")
            if "journey-checkin" in h and "t=TOKEN123" not in h:
                fails.append(f"{site} {f.name}: check-in token lost {h}")
            if "unsub" in h.lower() and "utm_" in h:
                fails.append(f"{site} {f.name}: unsubscribe link tagged")
print("\n".join(fails) or "PASS all drip links tagged correctly (CW tagged, KD/PD untouched, tokens kept)")
sys.exit(1 if fails else 0)
