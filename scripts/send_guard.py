#!/usr/bin/env python3
"""One switch that decides whether a real side effect is allowed to happen.

Why this exists: on 2026-09-06 send_drip.py was found writing to Supabase
inside its graduation branch BEFORE any --dry-run check. A dry run against a
subscriber sitting on the final day marked them completed and inserted them
into newsletter_subscribers for real. --dry-run is the flag that makes it safe
to work on the send scripts while live sends are frozen, so a dry run that
writes is a hole in the only safety net the send system has.

The fix is not "remember to check args.dry_run at every new call site". It is
this module. Each send script arms it once from its own --dry-run flag, and
every primitive that writes to a database, sends an email, mints a Stripe
object or POSTs anywhere asks allow() first. A side effect added later is
covered by default, because the primitive it has to travel through is covered.

Usage:
    import send_guard
    send_guard.set_dry_run(args.dry_run)       # once, right after parse_args()
    ...
    if not send_guard.allow(f"send day {n} to {email}"):
        return                                  # allow() already printed the line

The printed line matches the send scripts' existing dry-run voice: "  Would ...".

Tested by tests/test_dry_run_blocks_writes.py.
"""

import sys

_DRY_RUN = False
_ARMED = False
_BLOCKED = []


def set_dry_run(enabled):
    """Arm the guard. Call once per run, straight after parse_args()."""
    global _DRY_RUN, _ARMED
    _DRY_RUN = bool(enabled)
    _ARMED = True
    _BLOCKED.clear()


def is_dry_run():
    return _DRY_RUN


def is_armed():
    """True once set_dry_run() has been called. A script that never arms the
    guard gets live behaviour, which is why the wiring is asserted in tests."""
    return _ARMED


def blocked_actions():
    """Everything allow() refused this run, in order. For tests and summaries."""
    return list(_BLOCKED)


def allow(action, stream=None):
    """Ask permission for one real side effect.

    Returns True in a live run, so the caller proceeds exactly as before.
    Returns False in a dry run, after printing "  Would <action>", so the
    caller skips the side effect and nothing reaches the network.
    """
    if not _DRY_RUN:
        return True
    _BLOCKED.append(action)
    print(f"  Would {action}", file=stream or sys.stdout)
    return False
