#!/usr/bin/env python3
"""The weekly newsletter must not stack on top of a drip email — on BOTH sites.

CW has suppressed mid-drip subscribers since the drip launched. KD did not:
the branch was gated on `site == "cw"`, so on 2026-09-14 42 of 75 active KD
newsletter subscribers were in line to receive the Wednesday weekly on top of
that morning's drip email. This proves the rule now covers KD, that it still
covers CW unchanged, and that a graduated subscriber is still mailed.

Every network call is stubbed. No Supabase read, no Resend call, no email.

Run: python3 tests/test_newsletter_drip_suppression.py
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

import send_newsletter  # noqa: E402

PASSED, FAILED = [], []

SECRETS = {"supabase": {"url": "https://stub.invalid", "service_role_key": "stub-key"}}


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}")


class _Resp:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class Recorder:
    """Stands in for requests.get, replaying canned rows and recording params."""

    def __init__(self, rows_by_table):
        self.rows_by_table = rows_by_table
        self.calls = []

    def __call__(self, url, **kwargs):
        table = url.rsplit("/", 1)[-1]
        self.calls.append((table, kwargs.get("params")))
        return _Resp(self.rows_by_table.get(table, []))


def audience(site, subscribers, in_drip):
    """Run get_subscribers against stubbed tables. Returns (emails, recorder)."""
    rec = Recorder({
        "newsletter_subscribers": [{"id": i, "email": e} for i, e in enumerate(subscribers)],
        "drip_subscribers": [{"email": e} for e in in_drip],
    })
    original = send_newsletter.requests.get
    send_newsletter.requests.get = rec
    try:
        return send_newsletter.get_subscribers(SECRETS, site), rec
    finally:
        send_newsletter.requests.get = original


def drip_params(rec):
    for table, params in rec.calls:
        if table == "drip_subscribers":
            return params
    return None


def test_kd_mid_drip_is_suppressed():
    print("\nKD subscriber mid-drip: weekly newsletter suppressed")
    emails, rec = audience(
        "kd",
        ["middrip@gmail.com", "graduated@gmail.com"],
        in_drip=["middrip@gmail.com"],
    )
    check("KD queries drip_subscribers at all", drip_params(rec) is not None)
    check("the mid-drip subscriber is dropped", "middrip@gmail.com" not in emails)
    check("only the graduated subscriber remains", emails == ["graduated@gmail.com"])


def test_kd_not_in_drip_is_eligible():
    print("\nKD subscriber not mid-drip: eligible normally")
    emails, _ = audience("kd", ["free@gmail.com", "also@gmail.com"], in_drip=[])
    check("nobody is suppressed when the drip list is empty",
          emails == ["free@gmail.com", "also@gmail.com"])

    # Graduated (completed=true) and unsubscribed rows never come back from the
    # query, so an empty drip response is exactly what those subscribers look like.
    emails, _ = audience("kd", ["grad@gmail.com"], in_drip=["someone.else@gmail.com"])
    check("a subscriber missing from the drip list is still mailed",
          emails == ["grad@gmail.com"])


def test_kd_matching_is_case_insensitive():
    print("\nKD suppression matches regardless of address casing")
    emails, _ = audience("kd", ["Mixed.Case@Gmail.com"], in_drip=["mixed.case@gmail.com"])
    check("a differently-cased drip row still suppresses", emails == [])


def test_cw_behaviour_is_unchanged():
    print("\nCW behaviour unchanged")
    emails, rec = audience(
        "cw",
        ["middrip@gmail.com", "graduated@gmail.com"],
        in_drip=["middrip@gmail.com"],
    )
    check("CW still suppresses the mid-drip subscriber", emails == ["graduated@gmail.com"])

    params = drip_params(rec)
    check("CW drip query still filters completed=eq.false",
          params.get("completed") == "eq.false")
    check("CW drip query still excludes unsubscribers",
          params.get("or") == "(unsubscribed.is.null,unsubscribed.eq.false)")
    check("CW drip query is still not site-scoped (mid-drip anywhere holds the weekly)",
          "site" not in params)

    # The KD query must be the same proven query, not a second implementation.
    _, kd_rec = audience("kd", ["x@gmail.com"], in_drip=[])
    check("KD reuses CW's exact drip query", drip_params(kd_rec) == params)


def test_coach_has_no_drip_suppression():
    print("\nkd_coach is untouched (no drip sequence)")
    _, rec = audience("kd_coach", ["member@gmail.com"], in_drip=["member@gmail.com"])
    check("kd_coach never queries drip_subscribers", drip_params(rec) is None)


def main():
    print("Weekly newsletter drip suppression (CW + KD)")
    test_kd_mid_drip_is_suppressed()
    test_kd_not_in_drip_is_eligible()
    test_kd_matching_is_case_insensitive()
    test_cw_behaviour_is_unchanged()
    test_coach_has_no_drip_suppression()
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    for f in FAILED:
        print(f"  {f}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
