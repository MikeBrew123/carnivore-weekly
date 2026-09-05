#!/usr/bin/env python3
"""Shared rules for deciding who must never be mailed.

Two rules live here, both from the 2026-08-28 bounce review and approved by
Brew on 2026-08-31 ("approve all three"):

  RULE: undeliverable fixtures    is_undeliverable_fixture()
    A send-time guard. Reserved and fixture domains can never belong to a real
    person, so a live send to one is always a mistake. This is the Python twin
    of isUndeliverableFixture() in
    ketodial/coach-app/src/lib/email/reminder-engine.ts, which already guards
    the coach path. send_drip.py, send_newsletter.py and send_coach_launch.py
    had no equivalent, so a reseeded fixture would have been mailed for real.

  RULE: never once delivered      never_delivered()
    A cleaning rule, not a send-time one, because it needs event history.
    An address with several sends and zero delivered/opened/clicked has never
    reached anybody. A real person's mail generates a `delivered` event, so
    this rule cannot fire on someone whose mail is arriving. That property is
    the whole reason it is safe, and it is why the thresholds are conservative.

Deliberately NOT here: anything that reads a bounce. Bounces are the webhook's
job (api/calculator-api.js), and a ContentRejected bounce in particular says
nothing about the address. See commit 7783a20c.
"""

# RFC 2606 / RFC 6761 reserved names plus our own fixture domain. Nothing on
# this list can be registered by a real person, so widening it is safe only for
# names with that same guarantee. A real domain that merely looks like a test
# (test.ca, iambrew.com) does NOT belong here: it can be bought tomorrow.
FIXTURE_DOMAIN_SUFFIXES = (
    "@test.ketodial.com",   # our coach seed accounts
    "@example.com",
    "@example.net",
    "@example.org",
    ".invalid",             # used by the 2026-09-03 PII redaction placeholders
    ".test",
    ".localhost",
)

# Local-part conventions we use for probes. Kept short on purpose: a prefix
# rule is blunt, and every entry has to be one no subscriber would type.
FIXTURE_LOCAL_PREFIXES = (
    "qa-",
)

# never_delivered() thresholds. Five sends is roughly a week of drip, enough
# that a transient outage cannot explain a total absence of delivery.
MIN_SENDS_FOR_NEVER_DELIVERED = 5


def is_undeliverable_fixture(email):
    """True if this address is a test fixture and must never receive live mail.

    A missing or blank address counts as undeliverable: there is nothing to
    send to, and failing closed is the safe direction for a send guard.
    """
    if not email or not str(email).strip():
        return True
    e = str(email).strip().lower()
    if any(e.endswith(suffix) for suffix in FIXTURE_DOMAIN_SUFFIXES):
        return True
    local = e.split("@", 1)[0]
    return any(local.startswith(prefix) for prefix in FIXTURE_LOCAL_PREFIXES)


def filter_mailable(emails):
    """Split an iterable of addresses into (mailable, blocked_fixtures)."""
    mailable, blocked = [], []
    for email in emails:
        (blocked if is_undeliverable_fixture(email) else mailable).append(email)
    return mailable, blocked


def never_delivered(stats, min_sends=MIN_SENDS_FOR_NEVER_DELIVERED):
    """True if this address has been mailed repeatedly and never once landed.

    `stats` is a dict of event-type counts: sent, delivered, opened, clicked.
    Any evidence of arrival disqualifies, including an open or click without a
    delivered event, because either one proves a human saw the message.
    """
    if int(stats.get("sent", 0)) < min_sends:
        return False
    return not any(int(stats.get(k, 0)) > 0
                   for k in ("delivered", "opened", "clicked"))
