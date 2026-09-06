#!/usr/bin/env python3
"""--dry-run really is a dry run: no database write, no email, no Stripe object.

Written for the 2026-09-06 defect. send_drip.py's graduation branch
(next_day > FINAL_DAY) called supabase_update() and supabase_insert() before
any args.dry_run check, so a dry run against a subscriber sitting on the final
day marked them completed for real and inserted them into the weekly list for
real. The send path was guarded; the graduation path was not.

This test does not care that the guard is written in one particular place. It
runs the scripts and asserts nothing leaves the process: every requests.post
and requests.patch is stubbed, and any of them firing is a failure. It also
asserts the shared choke point in scripts/send_guard.py stays wired in, since
a guard nobody calls looks exactly like a guard that works.

No network. No Supabase. No Resend. No Stripe. No real subscriber is read.

Run: python3 tests/test_dry_run_blocks_writes.py
"""

import io
import sys
from contextlib import redirect_stdout
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

import send_guard  # noqa: E402
import send_drip  # noqa: E402
import send_newsletter  # noqa: E402

PASSED, FAILED = [], []

# Run directly and you get the full report plus a non-zero exit. Collected by
# pytest (npm run test:py) and each failed check raises instead, because a
# collector that only prints FAIL would report this file as green.
STRICT = __name__ != "__main__"


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}")
    if STRICT:
        assert cond, name


class _Resp:
    def __init__(self, payload, status=200):
        self._payload = payload
        self.status_code = status
        self.text = ""

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeRequests:
    """Stands in for the requests module. Records everything, sends nothing.

    Reads replay canned rows. Writes are recorded so the test can assert they
    never happened; if one ever does happen the recording is the evidence.
    """

    def __init__(self, rows_by_table=None):
        self.rows_by_table = rows_by_table or {}
        self.gets, self.posts, self.patches = [], [], []

    def get(self, url, **kwargs):
        table = url.rstrip("/").rsplit("/", 1)[-1].split("?")[0]
        self.gets.append((table, kwargs.get("params")))
        return _Resp(self.rows_by_table.get(table, []))

    def post(self, url, **kwargs):
        self.posts.append((url, kwargs))
        return _Resp({"id": "should-never-happen"})

    def patch(self, url, **kwargs):
        self.patches.append((url, kwargs))
        return _Resp({})


STUB_SECRETS = {
    "supabase": {"url": "https://stub.invalid", "service_role_key": "stub-key"},
    "resend": {"key": "stub-resend-key"},
    "stripe": {"secret_key_live": "sk_live_stub"},
}


def run_drip_dry_run():
    """Run send_drip.main() with --dry-run over three canned subscribers:
    one due a real email, one on a quiet day, one due to graduate."""
    pending = [
        # day 3 -> day 4, a template that exists, so this is the send path
        {"id": "r1", "email": "someone@gmail.com", "current_day": 3, "subscribed_at": None},
        # day 8 has no template, so this is the quiet-day advance path
        {"id": "r2", "email": "somebody@gmail.com", "current_day": 8, "subscribed_at": None},
        # day 28 is FINAL_DAY, so next_day 29 is the graduation path: the bug
        {"id": "r3", "email": "user@gmail.com", "current_day": 28, "subscribed_at": None},
    ]
    fake = FakeRequests({"drip_subscribers": pending, "drip_events": []})
    orig_requests, orig_secrets, orig_argv = send_drip.requests, send_drip.load_secrets, sys.argv
    send_drip.requests = fake
    send_drip.load_secrets = lambda: STUB_SECRETS
    sys.argv = ["send_drip.py", "--dry-run"]
    buf = io.StringIO()
    try:
        with redirect_stdout(buf):
            send_drip.main()
    finally:
        send_drip.requests, send_drip.load_secrets, sys.argv = orig_requests, orig_secrets, orig_argv
    return fake, buf.getvalue()


def test_drip_dry_run_touches_nothing():
    print("\nsend_drip.py --dry-run: nothing is written, nothing is sent")
    fake, out = run_drip_dry_run()
    check("no PATCH was issued (no subscriber row updated)", fake.patches == [])
    check("no POST was issued (no insert, no email, no Stripe mint)", fake.posts == [])
    check("the final-day subscriber is reported, not graduated",
          "Would graduate user@gmail.com" in out)
    check("the due subscriber is reported, not mailed",
          "Would send day 4 to someone@gmail.com" in out)
    check("the quiet day is reported, not advanced",
          "Would advance somebody@gmail.com" in out)
    if FAILED:
        print("\n----- captured output -----")
        print(out.rstrip())
        print("---------------------------")


def test_graduation_branch_checks_dry_run_before_writing():
    print("\nthe graduation branch checks dry-run before its first write")
    src = (PROJECT_ROOT / "scripts" / "send_drip.py").read_text(encoding="utf-8")
    start = src.index("if next_day > FINAL_DAY:")
    end = src.index("subject, html = load_drip_email(next_day)", start)
    branch = src[start:end]
    guard = branch.find("args.dry_run")
    write = branch.find("supabase_update")
    check("branch contains a dry-run check", guard != -1)
    check("the dry-run check precedes the first write", guard != -1 and guard < write)


def test_write_primitives_are_choke_points():
    print("\nevery side-effect primitive in send_drip asks send_guard first")
    src = (PROJECT_ROOT / "scripts" / "send_drip.py").read_text(encoding="utf-8")
    for func, call in (
        ("def supabase_update(", "requests.patch"),
        ("def supabase_insert(", "requests.post"),
        ("def send_email(", "requests.post"),
        ("def mint_promo_code(", "requests.post"),
    ):
        body = src[src.index(func):]
        body = body[:body.index("\n\ndef ")] if "\n\ndef " in body else body
        allow = body.find("send_guard.allow(")
        effect = body.find(call)
        check(f"{func[4:-1]} guards before {call}", allow != -1 and allow < effect)


def test_send_scripts_arm_the_guard():
    print("\nevery send script arms the guard from its own --dry-run flag")
    for name in ("send_drip.py", "send_newsletter.py", "send_coach_launch.py"):
        src = (PROJECT_ROOT / "scripts" / name).read_text(encoding="utf-8")
        check(f"{name} calls send_guard.set_dry_run()", "send_guard.set_dry_run(" in src)


def test_post_images_dry_run_does_not_write_blog_posts_json():
    print("\ngenerate_post_images does not rewrite blog_posts.json in a dry run")
    src = (PROJECT_ROOT / "scripts" / "generate_post_images.py").read_text(encoding="utf-8")
    start = src.index("if image_ready:")
    branch = src[start:src.index("# Budget gate", start)]
    guard = branch.find("if dry_run:")
    write = branch.find("POSTS_FILE.write_text")
    check("the already-have-an-image branch checks dry_run", guard != -1)
    check("the dry_run check precedes the json write", guard != -1 and guard < write)


def test_guard_is_inert_in_a_live_run():
    print("\nthe guard permits everything when dry-run is off")
    send_guard.set_dry_run(False)
    check("allow() returns True in a live run", send_guard.allow("do the real thing") is True)
    check("nothing was recorded as blocked", send_guard.blocked_actions() == [])


def test_stripe_mint_is_blocked():
    print("\nno Stripe promotion code is minted in a dry run")
    fake = FakeRequests()
    orig = send_drip.requests
    send_drip.requests = fake
    send_guard.set_dry_run(True)
    try:
        with redirect_stdout(io.StringIO()):
            code = send_drip.mint_promo_code("sk_live_stub", 7, "someone@gmail.com")
    finally:
        send_drip.requests = orig
        send_guard.set_dry_run(False)
    check("mint_promo_code returns None instead of calling Stripe", code is None)
    check("no Stripe POST was made", fake.posts == [])


def test_newsletter_send_loop_is_blocked():
    print("\nsend_newsletter's send loop mails nobody while the guard is armed")
    fake = FakeRequests()
    orig = send_newsletter.requests
    send_newsletter.requests = fake
    send_guard.set_dry_run(True)
    try:
        with redirect_stdout(io.StringIO()):
            results = send_newsletter.send_via_resend(
                "stub-key", "from@example.com", "From", "reply@example.com",
                ["someone@gmail.com"], "Subject", "<p>body</p>", "cw")
    finally:
        send_newsletter.requests = orig
        send_guard.set_dry_run(False)
    check("no Resend POST was made", fake.posts == [])
    check("the recipient is reported as blocked", [r[1] for r in results] == ["blocked"])


def main():
    print("Dry-run guard: side effects stay inside the guard")
    test_drip_dry_run_touches_nothing()
    test_graduation_branch_checks_dry_run_before_writing()
    test_write_primitives_are_choke_points()
    test_send_scripts_arm_the_guard()
    test_post_images_dry_run_does_not_write_blog_posts_json()
    test_guard_is_inert_in_a_live_run()
    test_stripe_mint_is_blocked()
    test_newsletter_send_loop_is_blocked()
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    for f in FAILED:
        print(f"  {f}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
