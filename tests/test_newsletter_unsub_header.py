#!/usr/bin/env python3
"""The weekly newsletter's List-Unsubscribe header, per brand.

WHY THIS EXISTS. Verified 2026-09-13 against a real delivered CW issue: the
weekly went out with no List-Unsubscribe at all, while the drip has always had
one. Resend does not inject the header; the drip has it only because
send_drip.py declares it. This locks the newsletter's version in.

WHAT MUST NOT REGRESS:
  - CW newsletter carries List-Unsubscribe pointing at the CW route (site=cw)
  - KD newsletter carries List-Unsubscribe pointing at the KD route (site=kd)
  - header url and visible body url stay identical (one unsubscribe, one brand)
  - the KD payload keeps the KD From identity
  - no RFC 8058 List-Unsubscribe-Post (explicitly out of scope)

NO EMAIL IS SENT. requests.post is replaced; every Resend call is captured.
"""
import sys
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import send_newsletter as sn  # noqa: E402

checks, failures = 0, []


def check(group, name, ok, detail=""):
    global checks
    checks += 1
    if not ok:
        failures.append((group, name, detail))


class FakeResp:
    status_code = 200
    text = "{}"

    @staticmethod
    def json():
        return {"id": "stub-id"}


def capture(site):
    """Run the real send path for one site and return the Resend payload."""
    cfg = sn.SITES[site]
    sent = []

    def fake_post(url, headers=None, json=None, **kw):
        sent.append({"url": url, "payload": json})
        return FakeResp()

    html = '<html><body><a href="{{unsubscribe_url}}">Unsubscribe</a></body></html>'
    with mock.patch.object(sn.requests, "post", side_effect=fake_post), \
         mock.patch.object(sn.send_guard, "allow", return_value=True), \
         mock.patch.object(sn.time, "sleep", return_value=None):
        sn.send_via_resend(
            "stub-key", cfg["from_email"], cfg["from_name"], cfg["reply_to"],
            ["reader@example.com"], "Test subject", html, site,
        )
    assert len(sent) == 1, f"expected one send, got {len(sent)}"
    return sent[0]["payload"]


# ---- CW ----------------------------------------------------------------
cw = capture("cw")
cw_hdr = (cw.get("headers") or {}).get("List-Unsubscribe", "")
check("CW", "List-Unsubscribe present", bool(cw_hdr), repr(cw_hdr))
check("CW", "header is angle-bracketed", cw_hdr.startswith("<") and cw_hdr.endswith(">"), cw_hdr)
check("CW", "header routes to site=cw", "&site=cw" in cw_hdr, cw_hdr)
check("CW", "header does NOT route to kd", "site=kd" not in cw_hdr, cw_hdr)
check("CW", "From identity unchanged", cw["from"] == "Carnivore Weekly <newsletter@carnivoreweekly.com>", cw["from"])
check("CW", "header url matches body url",
      cw_hdr.strip("<>") in cw["html"], "header/body mismatch")
check("CW", "no RFC 8058 one-click (out of scope)",
      "List-Unsubscribe-Post" not in (cw.get("headers") or {}), str(cw.get("headers")))

# ---- KD ----------------------------------------------------------------
kd = capture("kd")
kd_hdr = (kd.get("headers") or {}).get("List-Unsubscribe", "")
check("KD", "List-Unsubscribe present", bool(kd_hdr), repr(kd_hdr))
check("KD", "header routes to site=kd", "&site=kd" in kd_hdr, kd_hdr)
check("KD", "header does NOT route to cw", "site=cw" not in kd_hdr, kd_hdr)
check("KD", "KD From identity correct",
      kd["from"] == "KetoDial — The Weekly Dial-In <ketodial@carnivoreweekly.com>", kd["from"])
check("KD", "KD sends from a verified domain",
      kd["from"].endswith("<ketodial@carnivoreweekly.com>"), kd["from"])
check("KD", "header url matches body url",
      kd_hdr.strip("<>") in kd["html"], "header/body mismatch")
check("KD", "no RFC 8058 one-click (out of scope)",
      "List-Unsubscribe-Post" not in (kd.get("headers") or {}), str(kd.get("headers")))

# ---- brands cannot cross ----------------------------------------------
check("ISO", "CW and KD headers differ", cw_hdr != kd_hdr, "identical headers")
check("ISO", "CW and KD From differ", cw["from"] != kd["from"], "identical from")

print(f"\nnewsletter-unsub-header: {checks - len(failures)}/{checks} checks passed")
for g, n, d in failures:
    print(f"  FAIL [{g}] {n}{' — ' + d if d else ''}")
sys.exit(1 if failures else 0)
