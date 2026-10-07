"""KD drip stalled 2026-10-03..10-07: 59 due > fixed cap 50 on a daily drip."""
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import send_drip  # noqa: E402

NOW = datetime(2026, 10, 7, 12, 0, tzinfo=timezone.utc)


def subs(old, new):
    mk = lambda d: {"subscribed_at": (NOW - timedelta(days=d)).isoformat()}
    return [mk(10) for _ in range(old)] + [mk(0) for _ in range(new)]


def test_grown_list_is_not_a_flood():
    pending = subs(59, 0)
    assert len(pending) <= max(send_drip.MIN_SEND_CAP, send_drip.established_list_cap(pending, NOW))


def test_new_signup_surge_still_trips():
    pending = subs(40, 80)
    assert len(pending) > send_drip.established_list_cap(pending, NOW)


def test_bad_dates_never_widen_cap():
    assert send_drip.established_list_cap([{"subscribed_at": None}] * 200, NOW) == 5


def test_safety_stop_leaves_a_reason_for_the_command_centre():
    src = (Path(__file__).resolve().parent.parent / "scripts" / "send_drip.py").read_text()
    stop = src.index("SAFETY STOP")
    assert "log_block(" in src[stop:stop + 400]
    cc = (Path(__file__).resolve().parent.parent / "dashboard" / "command_center_exec.py").read_text()
    assert "blocked_reason" in cc and "safety cap" in cc
