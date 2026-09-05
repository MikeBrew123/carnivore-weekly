#!/usr/bin/env python3
"""Tests for the shared send guards and the clean's decision logic.

No network, no Supabase, no API keys, no subprocess. Every case runs against
plain values, so the live list is never touched and nothing can be mailed.

The cases that matter most are the ones that must NOT fire. A guard that is too
eager silently deletes a reader, which is the exact failure Brew warned about:
"I don't want to make it harder for the people that do give us their
information."

Run: python3 tests/test_subscriber_hygiene.py
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from subscriber_hygiene import (  # noqa: E402
    MIN_SENDS_FOR_NEVER_DELIVERED,
    filter_mailable,
    is_undeliverable_fixture,
    never_delivered,
)
from clean_subscribers import classify  # noqa: E402

PASSED, FAILED = [], []


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}")


def stats(sent=0, delivered=0, opened=0, clicked=0):
    return {"sent": sent, "delivered": delivered,
            "opened": opened, "clicked": clicked}


def test_fixture_domains_are_blocked():
    print("\nfixture addresses are blocked")
    for addr in ["dave@test.ketodial.com", "MIKE@Test.KetoDial.com",
                 "source-test@example.com", "x@example.net", "x@example.org",
                 "redacted-subscriber-32@example.invalid",
                 "someone@my.test", "someone@box.localhost",
                 "qa-probe-20260825@carnivoreweekly.com"]:
        check(f"blocked: {addr}", is_undeliverable_fixture(addr))


def test_real_addresses_are_never_blocked():
    print("\nreal addresses survive the guard")
    # Every one of these is a shape that has appeared on the real list, plus
    # near-misses chosen to catch a substring match written too loosely.
    for addr in ["iambrew@gmail.com", "iambrew+coachtest@gmail.com",
                 "someone@a-real-peer-site.com", "someone@an-isp.net",
                 "someone@an-isp.com.au", "x@example.com.au",
                 "x@notexample.com", "test@gmail.com",
                 "qa@carnivoreweekly.com", "user@contest.co.uk",
                 "user@invalid.com", "a@test-kitchen.com"]:
        check(f"allowed: {addr}", not is_undeliverable_fixture(addr))


def test_blank_addresses_fail_closed():
    print("\nblank addresses fail closed")
    for addr in [None, "", "   "]:
        check(f"blocked: {addr!r}", is_undeliverable_fixture(addr))


def test_filter_mailable_splits_and_keeps_order():
    print("\nfilter_mailable splits without reordering")
    mailable, blocked = filter_mailable(
        ["b@gmail.com", "dave@test.ketodial.com", "a@gmail.com"])
    check("mailable keeps input order", mailable == ["b@gmail.com", "a@gmail.com"])
    check("blocked collects the fixture", blocked == ["dave@test.ketodial.com"])
    check("empty input is handled", filter_mailable([]) == ([], []))


def test_never_delivered_needs_enough_sends():
    print("\nnever_delivered needs a real run of sends")
    check("4 sends is not enough",
          not never_delivered(stats(sent=MIN_SENDS_FOR_NEVER_DELIVERED - 1)))
    check("5 sends with nothing landing fires",
          never_delivered(stats(sent=MIN_SENDS_FOR_NEVER_DELIVERED)))
    check("11 sends, 0 delivered fires", never_delivered(stats(sent=11)))
    check("no history at all does not fire", not never_delivered(stats()))


def test_any_evidence_of_arrival_disqualifies():
    print("\nany evidence the mail arrived protects the address")
    check("one delivered saves them",
          not never_delivered(stats(sent=50, delivered=1)))
    check("an open with no delivered event saves them",
          not never_delivered(stats(sent=50, opened=1)))
    check("a click with no delivered event saves them",
          not never_delivered(stats(sent=50, clicked=1)))


def test_bounces_are_not_a_retirement_reason():
    print("\nbounces never retire anyone")
    # A ContentRejected bounce is a statement about our newsletter, not their
    # mailbox. Counting one here would reintroduce the August defect that cut a
    # live reader off at day 6 of 30 (commit 7783a20c).
    bounced_but_reading = stats(sent=9, delivered=6, opened=3)
    bounced_but_reading["bounced"] = 3
    check("a reader who also bounced is left alone",
          not never_delivered(bounced_but_reading))
    check("classify leaves them alone",
          classify("someone@an-isp.com.au", bounced_but_reading) is None)


def test_classify_picks_the_right_reason():
    print("\nclassify names why, and stays silent otherwise")
    fixture = classify("dave@test.ketodial.com", stats(sent=50, delivered=50))
    check("fixture wins even with a clean history",
          fixture is not None and fixture.startswith("retired-fixture:"))

    placeholder = classify("someone@an-isp.com", stats(sent=11))
    check("never-delivered reason names the send count",
          placeholder is not None
          and placeholder.startswith("retired-never-delivered:")
          and "11 sends" in placeholder)

    check("a healthy subscriber is left alone",
          classify("someone@gmail.com", stats(sent=20, delivered=20, opened=8))
          is None)
    check("an address with no event history is left alone",
          classify("someone@gmail.com", None) is None)


def test_every_reason_is_greppable_as_a_retirement():
    print("\nretirement reasons never look like provider bounces")
    for email, st in [("dave@test.ketodial.com", stats()), ("someone@an-isp.com", stats(sent=9))]:
        reason = classify(email, st)
        check(f"reason for {email} is prefixed 'retired-'",
              reason is not None and reason.startswith("retired-"))


def main():
    print("Subscriber hygiene tests")
    for fn in [
        test_fixture_domains_are_blocked,
        test_real_addresses_are_never_blocked,
        test_blank_addresses_fail_closed,
        test_filter_mailable_splits_and_keeps_order,
        test_never_delivered_needs_enough_sends,
        test_any_evidence_of_arrival_disqualifies,
        test_bounces_are_not_a_retirement_reason,
        test_classify_picks_the_right_reason,
        test_every_reason_is_greppable_as_a_retirement,
    ]:
        fn()
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    for f in FAILED:
        print(f"  {f}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
