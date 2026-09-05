#!/usr/bin/env python3
"""The fixture guard is actually wired into the live send paths.

test_subscriber_hygiene.py proves the RULE is right. This proves the rule is
CONNECTED, which is the half that silently rots: a guard nobody calls looks
identical to a guard that works, right up until it mails a fixture.

Every network call is stubbed. No Supabase read, no Resend call, no email, and
the real subscriber list is never contacted.

Run: python3 tests/test_send_paths_block_fixtures.py
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

import send_drip  # noqa: E402
import send_newsletter  # noqa: E402

PASSED, FAILED = [], []


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}")


class Recorder:
    """Stands in for requests.get, replaying canned rows and recording params."""

    def __init__(self, rows_by_table):
        self.rows_by_table = rows_by_table
        self.calls = []

    def __call__(self, url, **kwargs):
        table = url.rsplit("/", 1)[-1]
        self.calls.append((table, kwargs.get("params")))
        rows = self.rows_by_table.get(table, [])
        return _Resp(rows)


class _Resp:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_drip_skips_fixture_rows(capture):
    print("\nsend_drip drops fixture rows before the send loop")
    pending = [
        {"id": "1", "email": "someone@gmail.com", "current_day": 3, "subscribed_at": None},
        {"id": "2", "email": "dave@test.ketodial.com", "current_day": 3, "subscribed_at": None},
        {"id": "3", "email": "qa-probe@carnivoreweekly.com", "current_day": 3, "subscribed_at": None},
    ]
    kept = [s for s in pending if not send_drip.is_undeliverable_fixture(s.get("email"))]
    check("only the real subscriber survives",
          [s["email"] for s in kept] == ["someone@gmail.com"])
    check("send_drip imports the shared guard, not a local copy",
          send_drip.is_undeliverable_fixture is capture)


def test_drip_source_actually_filters_pending():
    print("\nsend_drip's filter runs on `pending`, before the cap and the loop")
    src = (PROJECT_ROOT / "scripts" / "send_drip.py").read_text(encoding="utf-8")
    guard = src.index("is_undeliverable_fixture(s.get(\"email\"))")
    loop = src.index("for sub in pending:")
    cap = src.index("SAFETY STOP")
    check("guard appears before the send loop", guard < loop)
    check("guard appears before the volume cap", guard < cap)


def test_newsletter_blocks_fixtures_from_the_audience():
    print("\nsend_newsletter drops fixtures out of the audience query")
    rows = {
        "newsletter_subscribers": [
            {"email": "someone@gmail.com"},
            {"email": "lisa@test.ketodial.com"},
            {"email": "x@example.com"},
        ],
        # kd takes the early return, so the drip suppression query never runs
    }
    rec = Recorder(rows)
    original = send_newsletter.requests.get
    send_newsletter.requests.get = rec
    try:
        emails = send_newsletter.get_subscribers(
            {"supabase": {"url": "https://stub.invalid",
                          "service_role_key": "stub-key"}}, "kd")
    finally:
        send_newsletter.requests.get = original
    check("fixtures are gone from the audience", emails == ["someone@gmail.com"])
    check("no Resend call was made", all(c[0] != "emails" for c in rec.calls))


def test_coach_launch_uses_the_shared_rule():
    print("\nsend_coach_launch uses the shared rule, not its old inline check")
    src = (PROJECT_ROOT / "scripts" / "send_coach_launch.py").read_text(encoding="utf-8")
    check("imports filter_mailable", "from subscriber_hygiene import filter_mailable" in src)
    check("the old two-domain inline check is gone",
          'e.endswith("@test.ketodial.com")' not in src)


def main():
    print("Send-path fixture guard wiring")
    capture = send_drip.is_undeliverable_fixture
    test_drip_skips_fixture_rows(capture)
    test_drip_source_actually_filters_pending()
    test_newsletter_blocks_fixtures_from_the_audience()
    test_coach_launch_uses_the_shared_rule()
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    for f in FAILED:
        print(f"  {f}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
