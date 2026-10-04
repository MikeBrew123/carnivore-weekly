#!/usr/bin/env python3
"""CW -> PescoDial invite (scripts/send_pd_invite.py). No network, no email.

Run: python3 tests/test_pd_invite.py
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "tests"))
os.environ.setdefault("UNSUBSCRIBE_SECRET", "test-unsubscribe-secret")
import send_pd_invite as inv  # noqa: E402
from test_pd_drip import pd_page_exists, PD_LINK  # noqa: E402

FAILED = []


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" - {detail}"))
    if not ok:
        FAILED.append(name)


def main():
    c = inv.parse_draft()
    h = inv.build_html(c)
    check("subject is Sarah's pick", c["subject"] == "You picked pescatarian, so we built PescoDial", c["subject"])
    check("subject in <title>", f"<title>{c['subject']}</title>" in h)
    check("preheader present", c["preheader"] and inv.shell.e(c["preheader"]) in h)
    check("PESCO50 present", "PESCO50" in h)
    check("no em dash", "—" not in h and "&mdash;" not in h)
    check("reply-to is @carnivoreweekly.com", inv.REPLY_TO.endswith("@carnivoreweekly.com") and "iambrew" not in inv.REPLY_TO)
    check("from is newsletter@carnivoreweekly.com", "<newsletter@carnivoreweekly.com>" in inv.FROM)
    check("{{unsubscribe_url}} in template", 'href="{{unsubscribe_url}}"' in h)
    check("CW footer reason", inv.FOOTER_REASON in h)
    check("reply box sits above the doctor line",
          0 < h.find("Your turn") < h.find("Please talk to your doctor"))
    check("button text present", c["button"] in h)
    check("Not a Doctor note kept", "I&#x27;m not a doctor" in h or "I'm not a doctor" in h)
    check("sign-off Sarah / Carnivore Weekly", "Sarah<br>Carnivore Weekly" in h)
    out = inv.personalise(h, "reader@example.com", "s")
    check("unsubscribe personalised to the CW signed link",
          "{{unsubscribe_url}}" not in out and "unsubscribe?email=reader%40example.com&site=cw&sig=" in out)
    links = PD_LINK.findall(h)
    dead = [u for u in links if not pd_page_exists(u)]
    check("every pescodial link is a real page", bool(links) and not dead, dead[:3])
    check("built HTML file is fresh", inv.HTML.exists() and inv.HTML.read_text(encoding="utf-8") == h)

    # test.com is not a fixture domain; example.org is, so filter_mailable drops it.
    pesco = ["Closed@Test.com", "a@example.org", "b@test.com", "c@test.com", "d@test.com"]
    mailable = ["closed@test.com", "a@example.org", "b@test.com", "c@test.com", "z@test.com"]
    got = inv.select_audience(pesco, mailable, {inv.email_hash("closed@test.com")})
    check("audience: excluded hash dropped (case-insensitive), fixtures dropped, intersection only",
          got == ["b@test.com", "c@test.com"], got)
    check("audience: default EXCLUDE drops the closed customer's hash",
          inv.select_audience(["x@test.com"], ["x@test.com"], {inv.email_hash("x@test.com")}) == []
          and "59384c3586b2405c7f53f31582dad39d31f5c02cb0c7d87334ee941f35b78673" in inv.EXCLUDE_SHA256)
    check("ledger is gitignored", os.system(f"git -C {ROOT} check-ignore -q reports/pd-invite-send-ledger.jsonl") == 0)
    sys.exit(1 if FAILED else 0)


if __name__ == "__main__":
    main()
