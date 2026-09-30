#!/usr/bin/env python3
"""
tests/test_kd_cw_intro.py

Run: python3 tests/test_kd_cw_intro.py   (or pytest tests/test_kd_cw_intro.py)

No network, no secrets: every Supabase, Resend and Stripe call is stubbed.

WHAT THIS PINS (bead carnivore-weekly-a1s7, decision 2026-09-23)
-----------------------------------------------------------------
A KetoDial drip subscriber who signed up through the Carnivore Weekly calculator
gets day 1 from the Carnivore Weekly address, as an introduction to KetoDial.
That behaviour is SWITCHED OFF behind KD_CW_INTRO_ENABLED, and the most
important assertion here is the first one: with the flag unset, every reader
gets exactly the KD day 1 they got before this change, from the KD sender.
"""
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import send_drip  # noqa: E402

FLAG = send_drip.CW_INTRO_FLAG
KD_FROM = send_drip.SITES["kd"]["from_email"]
CW_FROM = send_drip.SITES["cw"]["from_email"]
TEMPLATE = ROOT / "data" / "drip-emails" / "kd" / "day-1-from-cw.html"
OLD = (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()

SUBS = [
    {"id": 1, "email": "cw-calc@example.com", "current_day": 0, "subscribed_at": OLD, "source": "calculator"},
    {"id": 2, "email": "cw-backfill@example.com", "current_day": 0, "subscribed_at": OLD, "source": "calculator-backfill"},
    {"id": 3, "email": "etsy@example.com", "current_day": 0, "subscribed_at": OLD, "source": "etsy-bonus"},
    {"id": 4, "email": "no-source@example.com", "current_day": 0, "subscribed_at": OLD, "source": None},
    {"id": 5, "email": "cw-calc-day2@example.com", "current_day": 1, "subscribed_at": OLD, "source": "calculator"},
]


def set_flag(value):
    if value is None:
        os.environ.pop(FLAG, None)
    else:
        os.environ[FLAG] = value


def use_kd():
    send_drip.SITE = "kd"
    send_drip.CFG = send_drip.SITES["kd"]


def run_kd_drip(monkey_env):
    """Run main() for the KD site with every outside call stubbed. Returns the
    list of (to, subject, from_email, tags) that WOULD have gone to Resend."""
    set_flag(monkey_env)
    calls = []
    saved = {}

    def stub(name, fn):
        saved[name] = getattr(send_drip, name)
        setattr(send_drip, name, fn)

    stub("load_secrets", lambda: {"supabase": {"url": "x", "service_role_key": "x"},
                                  "resend": {"key": "x"}, "stripe": {"secret_key_live": ""}})
    stub("supabase_query", lambda s, table, params: [dict(r) for r in SUBS] if table == "drip_subscribers" else [])
    stub("supabase_update", lambda *a, **k: None)
    stub("supabase_insert", lambda *a, **k: None)
    stub("already_sent_today", lambda *a, **k: False)
    stub("fetch_buyer_emails", lambda s: set())
    stub("personalised_days", lambda s: set())
    stub("dynamic_send_cap", lambda s: 50)
    # Fixtures live on @example.com, which the live fixture guard refuses on
    # purpose. Nothing is sent here (send_email is stubbed), so lift it.
    stub("is_undeliverable_fixture", lambda e: False)

    def fake_send(resend_key, to, subject, html, tags=None, log=True, from_email=None):
        calls.append((to, subject, from_email or send_drip.CFG["from_email"], tags or [], html))
        return True, {"id": "stub"}

    stub("send_email", fake_send)
    saved_secret = send_drip.unsubscribe_link.load_secret
    send_drip.unsubscribe_link.load_secret = lambda s=None: "test-secret"
    saved_argv = sys.argv
    sys.argv = ["send_drip.py", "--site", "kd"]
    try:
        send_drip.main()
    finally:
        sys.argv = saved_argv
        send_drip.unsubscribe_link.load_secret = saved_secret
        for name, fn in saved.items():
            setattr(send_drip, name, fn)
        set_flag(None)
    return {c[0]: c for c in calls}


def default_day1_subject():
    use_kd()
    return send_drip.load_drip_email(1)[0]


# ---------------------------------------------------------------------------

def test_flag_off_by_default_changes_nothing():
    for value in (None, "", "0", "false", "off", "no", "maybe"):
        sent = run_kd_drip(value)
        normal = default_day1_subject()
        assert len(sent) == 5, value
        for to, subject, frm, tags, _ in sent.values():
            assert frm == KD_FROM, (value, to, frm)
            assert not any(t["name"] == "variant" for t in tags), (value, to)
        for to in ("cw-calc@example.com", "cw-backfill@example.com", "etsy@example.com"):
            assert sent[to][1] == normal, (value, to, sent[to][1])


def test_flag_on_sends_intro_only_to_cw_sourced_day1():
    for value in ("1", "true", "TRUE", " yes ", "on"):
        sent = run_kd_drip(value)
        intro_subject = send_drip.load_drip_email(1, send_drip.CW_INTRO_VARIANT)[0]
        normal = default_day1_subject()
        assert intro_subject != normal
        for to in ("cw-calc@example.com", "cw-backfill@example.com"):
            _, subject, frm, tags, html = sent[to]
            assert frm == CW_FROM, (value, to, frm)
            assert subject == intro_subject
            assert {"name": "variant", "value": "cw-intro"} in tags
            # Unsubscribe is signed for the KD drip the reader is actually on.
            assert send_drip.unsubscribe_link.unsubscribe_url(to, "kd", "test-secret") in html
        for to in ("etsy@example.com", "no-source@example.com"):
            assert sent[to][2] == KD_FROM and sent[to][1] == normal, (value, to)
        # Day 2 and later always come from KetoDial, CW-sourced or not.
        _, subject, frm, tags, _ = sent["cw-calc-day2@example.com"]
        assert frm == KD_FROM and subject == send_drip.load_drip_email(2)[0]


def test_cw_site_never_uses_intro():
    set_flag("1")
    try:
        send_drip.SITE = "cw"
        send_drip.CFG = send_drip.SITES["cw"]
        assert not send_drip.use_cw_intro({"source": "calculator"}, 1)
        use_kd()
        assert send_drip.use_cw_intro({"source": "calculator"}, 1)
        assert not send_drip.use_cw_intro({"source": "calculator"}, 2)
        assert not send_drip.use_cw_intro({"source": "kd-homepage"}, 1)
    finally:
        set_flag(None)


def test_preview_all_does_not_pick_up_the_variant():
    use_kd()
    days = [int(m.group(1)) for f in send_drip.CFG["drip_dir"].glob("day-*.html")
            if (m := re.match(r"day-(\d+)\.html$", f.name))]
    assert days.count(1) == 1


def test_template_is_clean():
    html = TEMPLATE.read_text(encoding="utf-8")
    assert "—" not in html and "–" not in html, "em or en dash in intro copy"
    assert "{$unsubscribe}" in html
    assert send_drip.CHECKIN_URL_RE.search(html), "check-in link must accept the token"
    # No offer, price or urgency in an introduction.
    for banned in ("$", "promo code", "{$promo", "discount", "% off", "expires", "hurry", "last chance"):
        assert banned not in html.lower().replace("{$unsubscribe}", ""), banned
    # Honest about the sender switch and the diet the reader chose.
    assert "ketodial@ketodial.com" in html
    assert "keto or low-carb" in html


def test_send_email_from_override():
    use_kd()
    captured = []

    class Resp:
        status_code = 200
        text = "{}"

        def json(self):
            return {"id": "x"}

    saved_post, saved_sleep = send_drip.requests.post, send_drip.time.sleep
    send_drip.requests.post = lambda url, headers=None, json=None, **k: captured.append(json) or Resp()
    send_drip.time.sleep = lambda s: None
    send_drip.UNSUB_SECRET = "test-secret"
    try:
        send_drip.send_email("k", "a@example.com", "s", "<p>x</p>", log=False)
        send_drip.send_email("k", "a@example.com", "s", "<p>x</p>", log=False, from_email=CW_FROM)
    finally:
        send_drip.requests.post, send_drip.time.sleep = saved_post, saved_sleep
    assert captured[0]["from"] == KD_FROM
    assert captured[1]["from"] == CW_FROM
    # Replies still land in the KD inbox either way.
    assert captured[1]["reply_to"] == send_drip.SITES["kd"]["reply_to"]


if __name__ == "__main__":
    fails = 0
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except AssertionError as e:
                fails += 1
                print(f"FAIL {name}: {e}")
    print(f"\n{'ALL PASS' if not fails else f'{fails} FAILED'}")
    sys.exit(1 if fails else 0)
