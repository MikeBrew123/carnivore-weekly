#!/usr/bin/env python3
"""
tests/test_day5_eligibility.py

Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... python3 tests/test_day5_eligibility.py

Fixtures only, on the IANA-reserved @example.com domain that
subscriber_hygiene.is_undeliverable_fixture() refuses to mail. Cleans up.

WHAT THIS PINS
--------------
An email whose whole payoff is a calculation should not go to somebody we cannot
calculate for. But the reverse error is worse: excluding a real subscriber at SEND time
for a reason that belongs to the CALCULATION. A reader whose estimate is suppressed by
the calorie floor, or who is under 18, still gets the email and the fallback state.
Only a missing or unusable calculator row stops the send.

And the whole rule stays dormant until the interaction is activated, so nothing about
today's day 5 changes.
"""
import json
import os
import sys
import uuid
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

SB_URL = os.environ.get("SUPABASE_URL")
SB_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not SB_URL or not SB_KEY:
    print("FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.")
    sys.exit(1)

REST = f"{SB_URL}/rest/v1"
H = {"Content-Type": "application/json", "apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"}

import send_drip  # noqa: E402

send_drip.SITE = "cw"
send_drip.CFG = send_drip.SITES["cw"]
SECRETS = {"supabase": {"url": SB_URL, "service_role_key": SB_KEY}}

PASS = FAIL = 0


def ok(cond, msg, detail=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS  {msg}")
    else:
        FAIL += 1
        print(f"  FAIL  {msg}" + (f" :: {detail}" if detail else ""))


STAMP = uuid.uuid4().hex[:8]
made_emails = []


def mk(site, tag, calc=None):
    email = f"d5e-{tag}-{STAMP}@example.com"
    requests.post(f"{REST}/drip_subscribers", headers=H, json={
        "email": email, "site": site, "source": "day5-elig", "current_day": 0})
    if calc is not None:
        body = {"session_token": f"d5e-{STAMP}-{uuid.uuid4().hex[:6]}",
                "email": calc.pop("_email", email), "source": "day5-elig"}
        body.update(calc)
        requests.post(f"{REST}/calculator_sessions_v2", headers=H, json=body)
    made_emails.append(email)
    return email


BASE = dict(sex="female", age=58, weight_value=200, weight_unit="lbs",
            height_feet=5, height_inches=4, goal="lose", diet_type="carnivore",
            lifestyle_activity="sedentary", deficit_percentage=20)

print(f"\nDay-5 eligibility rule — fixtures {STAMP}\n")

try:
    # REQ 12 (the most important one): the rule is DORMANT today.
    for site in ("cw", "kd"):
        send_drip.SITE = site
        send_drip.CFG = send_drip.SITES[site]
        days = send_drip.personalised_days(SECRETS)
        ok(days == set(), f"{site.upper()}: no personalised days while goal_target is inactive", str(days))
    send_drip.SITE = "cw"
    send_drip.CFG = send_drip.SITES["cw"]

    # REQ 4 + 5: a subscriber with usable context is eligible, on both sites.
    for site in ("cw", "kd"):
        send_drip.SITE = site
        send_drip.CFG = send_drip.SITES[site]
        e = mk(site, f"ok-{site}", dict(BASE))
        eligible, reason = send_drip.day5_eligibility(SECRETS, e)
        ok(eligible and reason is None, f"{site.upper()}: usable calculator context is ELIGIBLE", str(reason))
    send_drip.SITE = "cw"
    send_drip.CFG = send_drip.SITES["cw"]

    # REQ 6: mixed-case calculator email stays eligible.
    mixed_local = f"d5e-Mixed-{STAMP}"
    email_lower = f"{mixed_local.lower()}@example.com"
    requests.post(f"{REST}/drip_subscribers", headers=H, json={
        "email": email_lower, "site": "cw", "source": "day5-elig", "current_day": 0})
    made_emails.append(email_lower)
    calc = dict(BASE)
    calc["email"] = f"{mixed_local}@Example.COM"   # as typed, mixed case
    calc["session_token"] = f"d5e-{STAMP}-mix"
    calc["source"] = "day5-elig"
    requests.post(f"{REST}/calculator_sessions_v2", headers=H, json=calc)
    eligible, reason = send_drip.day5_eligibility(SECRETS, email_lower)
    ok(eligible, "mixed-case calculator email remains ELIGIBLE (case-insensitive lookup)", str(reason))

    # REQ 7: no calculator row at all -> skipped, with the right reason.
    e = mk("cw", "nocalc", None)
    eligible, reason = send_drip.day5_eligibility(SECRETS, e)
    ok(not eligible, "no calculator row is SKIPPED")
    ok(reason == send_drip.SKIP_NO_CALC_ROW, "reason is no_calculator_context", str(reason))

    # REQ 8: a row exists but lacks what the interaction needs.
    for tag, missing in (("noweight", dict(BASE, weight_value=None)), ("nosex", dict(BASE, sex=None))):
        e = mk("cw", tag, missing)
        eligible, reason = send_drip.day5_eligibility(SECRETS, e)
        ok(not eligible, f"incomplete context ({tag}) is SKIPPED")
        ok(reason == send_drip.SKIP_INCOMPLETE, f"reason is incomplete_calculator_context ({tag})", str(reason))

    # An explicit maintain/gain goal: the email's own premise does not apply.
    for goal in ("maintain", "gain"):
        e = mk("cw", f"goal-{goal}", dict(BASE, goal=goal))
        eligible, reason = send_drip.day5_eligibility(SECRETS, e)
        ok(not eligible, f"explicit goal={goal} is SKIPPED")
        ok(reason == send_drip.SKIP_GOAL_NOT_LOSS, f"reason is goal_not_weight_loss ({goal})", str(reason))

    # REQ 9, the one that matters most: CALCULATION-level suppression must NOT become
    # SEND-level exclusion. Each of these gets the email and Sarah's fallback.
    cases = [
        ("under18", dict(BASE, age=16), "age is never a send-eligibility input"),
        ("subfloor", dict(BASE, age=80, weight_value=99, height_feet=4, height_inches=8),
         "a sub-floor maintenance target still RECEIVES the email"),
        ("nullgoal", dict(BASE, goal=None), "a null goal is 'never answered', not 'said no' -> still sent"),
    ]
    for tag, calc, msg in cases:
        e = mk("cw", tag, calc)
        eligible, reason = send_drip.day5_eligibility(SECRETS, e)
        ok(eligible and reason is None, msg, f"skipped as {reason}")

    # REQ 10: a skip is measurable, and distinguishable by reason.
    probe = mk("cw", "instr", None)
    before = requests.get(f"{REST}/drip_events?event_type=eq.skipped&select=id", headers=H).json()
    send_drip.log_skip(SECRETS, probe, 5, send_drip.SKIP_NO_CALC_ROW, "fixture subject")
    rows = requests.get(
        f"{REST}/drip_events?event_type=eq.skipped&email=eq.{probe}&select=site,subject,tags,resend_id",
        headers=H).json()
    ok(len(rows) == 1, "a skip writes exactly one drip_events row", str(len(rows)))
    if rows:
        tags = json.loads(rows[0]["tags"]) if isinstance(rows[0]["tags"], str) else rows[0]["tags"]
        by = {t["name"]: t["value"] for t in tags}
        ok(by.get("skip_reason") == send_drip.SKIP_NO_CALC_ROW, "skip_reason is recorded in tags", str(by))
        ok(by.get("drip_day") == "5", "drip_day is recorded, so it joins the existing per-day analysis")
        ok(rows[0]["site"] == "cw", "site recorded")
        ok(rows[0]["resend_id"] is None, "no resend_id invented for an email that was never sent")
    kinds = {send_drip.SKIP_NO_CALC_ROW, send_drip.SKIP_INCOMPLETE, send_drip.SKIP_GOAL_NOT_LOSS}
    ok(len(kinds) == 3, "three distinct, separately countable skip reasons exist")
    requests.delete(f"{REST}/drip_events?event_type=eq.skipped&email=eq.{probe}", headers=H)

    # A lookup failure must fail OPEN: send rather than silently drop a real subscriber.
    real_query = send_drip.supabase_query

    def boom(*a, **k):
        raise RuntimeError("simulated outage")

    send_drip.supabase_query = boom
    try:
        eligible, reason = send_drip.day5_eligibility(SECRETS, "whoever@example.com")
        ok(eligible, "a lookup outage FAILS OPEN (sends) rather than skipping a real subscriber")
        ok(send_drip.personalised_days(SECRETS) == set(), "an outage also leaves the rule dormant")
    finally:
        send_drip.supabase_query = real_query

finally:
    for e in made_emails:
        requests.delete(f"{REST}/drip_events?email=eq.{e}", headers=H)
        requests.delete(f"{REST}/drip_subscribers?email=eq.{e}", headers=H)
    requests.delete(f"{REST}/calculator_sessions_v2?source=eq.day5-elig", headers=H)

left_s = requests.get(f"{REST}/drip_subscribers?source=eq.day5-elig&select=id", headers=H).json()
left_c = requests.get(f"{REST}/calculator_sessions_v2?source=eq.day5-elig&select=id", headers=H).json()
left_e = requests.get(f"{REST}/drip_events?event_type=eq.skipped&select=id", headers=H).json()
ok(len(left_s) == 0 and len(left_c) == 0, "fixtures cleaned up", f"{len(left_s)}/{len(left_c)}")
ok(len(left_e) == 0, "no skip events left behind", str(len(left_e)))

print(f"\n{PASS} passed, {FAIL} failed\n")
sys.exit(1 if FAIL else 0)
