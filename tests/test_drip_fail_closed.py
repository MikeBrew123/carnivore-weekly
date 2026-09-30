#!/usr/bin/env python3
"""The drip cannot double-send: fail-closed dedupe and a same-day run lock.

Brew, deck card 1f3f2f68, approved 2026-09-30 ("Fix both"); beads
carnivore-weekly-qhpe and carnivore-weekly-wxmk, which ship together.

  qhpe: the per-reader "already sent today?" check used to swallow every
        error and answer "no", so a Supabase hiccup re-mailed the reader.
        Now a failed check SKIPS that reader for the day, loudly.
  wxmk: a second same-day run (queued dispatch, re-run, laptop run on top
        of the Action) could send again. Now send_drip.py refuses to mail
        anyone when today's drip for that site already went out, and
        daily-publish.yml no longer shares the "pages" queue with deploy.yml.

Every network call is a mock. No Supabase, no Resend, no Stripe, no email.

Run: python3 tests/test_drip_fail_closed.py
"""

import io
import os
import sys
import types
from contextlib import redirect_stdout
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))
os.environ.setdefault("UNSUBSCRIBE_SECRET", "test-unsubscribe-secret")

import send_drip  # noqa: E402
import send_guard  # noqa: E402

PASSED, FAILED = [], []
STRICT = __name__ != "__main__"  # under pytest, a failed check raises

TODAY = datetime.now(timezone.utc).strftime("%Y-%m-%d")
TODAY_TS = f"{TODAY}T14:00:05.123456+00:00"
YESTERDAY_TS = "2000-01-01T14:00:05+00:00"

A = "11111111-1111-4111-8111-111111111111"
B = "22222222-2222-4222-8222-222222222222"


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}")
    if STRICT:
        assert cond, name


class _Resp:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self._payload = payload if payload is not None else {}
        self.text = str(self._payload)

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"HTTP {self.status_code}")

    def json(self):
        return self._payload


class FakeNet:
    """requests stand-in that understands just enough PostgREST.

    drip_subscribers GETs are routed by their params:
      - the run-lock probe (has last_sent_at filter)  -> lock_rows / lock_status
      - the per-reader dedupe probe (has id=eq.X)     -> dedupe_by_id / dedupe_status
      - anything else is the pending list             -> pending
    """

    def __init__(self, pending, lock_rows=None, lock_status=200, dedupe_by_id=None,
                 dedupe_status=None, dedupe_raises=None):
        self.pending = pending
        self.lock_rows = lock_rows or []
        self.lock_status = lock_status
        self.dedupe_by_id = dedupe_by_id or {}
        self.dedupe_status = dedupe_status or {}
        self.dedupe_raises = dedupe_raises or set()
        self.resend_calls, self.patches, self.inserts, self.lock_probes = [], [], [], 0

    def get(self, url, **kwargs):
        table = url.rstrip("/").rsplit("/", 1)[-1].split("?")[0]
        params = kwargs.get("params") or {}
        if table != "drip_subscribers":
            return _Resp(200, [])
        if "last_sent_at" in params:
            self.lock_probes += 1
            return _Resp(self.lock_status, self.lock_rows if self.lock_status == 200 else {"message": "boom"})
        if str(params.get("id", "")).startswith("eq."):
            sid = params["id"][3:]
            if sid in self.dedupe_raises:
                raise ConnectionError("simulated network failure")
            status = self.dedupe_status.get(sid, 200)
            if status != 200:
                return _Resp(status, {"message": "server error"})
            row = self.dedupe_by_id.get(sid, {"id": sid, "last_sent_at": YESTERDAY_TS})
            return _Resp(200, [] if row is None else [row])
        return _Resp(200, [dict(r) for r in self.pending])

    def post(self, url, **kwargs):
        if "api.resend.com/emails" in url:
            self.resend_calls.append(kwargs["json"]["to"][0])
            return _Resp(200, {"id": "re_ok"})
        self.inserts.append(url)
        return _Resp(201, {})

    def patch(self, url, **kwargs):
        self.patches.append((url, kwargs.get("json")))
        return _Resp(204, {})


STUB_SECRETS = {
    "supabase": {"url": "https://stub.invalid", "service_role_key": "stub-key"},
    "resend": {"key": "stub-resend-key"},
    "stripe": {"secret_key_live": ""},
}

PENDING = [
    {"id": A, "email": "someone@gmail.com", "current_day": 2, "subscribed_at": None},
    {"id": B, "email": "somebody@gmail.com", "current_day": 2, "subscribed_at": None},
]


def run_drip(net, argv=("send_drip.py",), env=None):
    """send_drip.main() with every call mocked. Returns (stdout, exit code)."""
    saved = (send_drip.requests, send_drip.time, send_drip.load_secrets, sys.argv,
             {k: os.environ.get(k) for k in ("MAX_SENDS_PER_RUN", "GITHUB_OUTPUT",
                                              send_drip.RERUN_OVERRIDE_ENV)})
    send_drip.requests = net
    send_drip.time = types.SimpleNamespace(sleep=lambda s: None)
    send_drip.load_secrets = lambda: STUB_SECRETS
    sys.argv = list(argv)
    for k in saved[4]:
        os.environ.pop(k, None)
    for k, v in (env or {}).items():
        os.environ[k] = v
    buf, code = io.StringIO(), 0
    try:
        with redirect_stdout(buf):
            send_drip.main()
    except SystemExit as e:
        code = e.code or 0
    finally:
        send_drip.requests, send_drip.time, send_drip.load_secrets, sys.argv, env_saved = saved
        for k, v in env_saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        send_guard.set_dry_run(False)
    return buf.getvalue(), code


def advanced(net, sid):
    return any(sid in u for u, _ in net.patches)


# ---------------------------------------------------------------- qhpe

def test_clean_run_sends_to_everyone():
    print("\nbaseline: nothing sent today, both checks succeed, both readers mailed")
    net = FakeNet(PENDING)
    out, code = run_drip(net)
    check("both readers mailed once",
          sorted(net.resend_calls) == ["somebody@gmail.com", "someone@gmail.com"])
    check("both advanced", advanced(net, A) and advanced(net, B))
    check("exit 0", code == 0)
    check("the run lock was consulted", net.lock_probes == 1)


def test_dedupe_http_error_skips_reader():
    print("\nqhpe: a 500 from the per-reader check skips that reader (fail closed)")
    net = FakeNet(PENDING, dedupe_status={B: 500})
    out, code = run_drip(net)
    check("the healthy reader is still mailed", net.resend_calls == ["someone@gmail.com"])
    check("the unconfirmed reader is NOT mailed", "somebody@gmail.com" not in net.resend_calls)
    check("the unconfirmed reader is NOT advanced (retries tomorrow)", not advanced(net, B))
    check("the healthy reader is advanced", advanced(net, A))
    check("the skip is logged loudly", "DEDUPE CHECK FAILED" in out and "SKIPPED: day 3 -> somebody@gmail.com" in out)
    check("a GitHub error annotation is printed", "::error title=Drip dedupe check failed::" in out)
    check("the run exits non-zero so the drip-failure issue opens", code == 1)


def test_dedupe_exception_skips_reader():
    print("\nqhpe: a network exception in the per-reader check skips that reader")
    net = FakeNet(PENDING, dedupe_raises={A})
    out, code = run_drip(net)
    check("the reader whose check raised is NOT mailed", "someone@gmail.com" not in net.resend_calls)
    check("the other reader is mailed", net.resend_calls == ["somebody@gmail.com"])
    check("exit 1", code == 1)


def test_dedupe_missing_row_skips_reader():
    print("\nqhpe: a check that cannot find the reader's row is 'cannot confirm', not 'not sent'")
    net = FakeNet(PENDING, dedupe_by_id={A: None})
    out, code = run_drip(net)
    check("the reader is NOT mailed", "someone@gmail.com" not in net.resend_calls)
    check("exit 1", code == 1)


def test_dedupe_already_sent_today_still_skips_quietly():
    print("\nqhpe: a reader already mailed today is skipped as before, no alarm")
    net = FakeNet(PENDING, dedupe_by_id={A: {"id": A, "last_sent_at": TODAY_TS}})
    out, code = run_drip(net)
    check("the already-mailed reader is not mailed again", "someone@gmail.com" not in net.resend_calls)
    check("the other reader is mailed", net.resend_calls == ["somebody@gmail.com"])
    check("reported as an ordinary duplicate skip", "1 skipped (already sent today)" in out)
    check("no alarm, exit 0", code == 0 and "::error" not in out)


def test_already_sent_today_unit():
    print("\nqhpe: already_sent_today() answers True/False or raises, never guesses")
    saved = send_drip.requests
    try:
        send_drip.requests = FakeNet([], dedupe_by_id={A: {"id": A, "last_sent_at": TODAY_TS}})
        check("sent today -> True", send_drip.already_sent_today(STUB_SECRETS, A) is True)
        send_drip.requests = FakeNet([], dedupe_by_id={A: {"id": A, "last_sent_at": None}})
        check("never sent -> False", send_drip.already_sent_today(STUB_SECRETS, A) is False)
        for label, net in (("HTTP 503", FakeNet([], dedupe_status={A: 503})),
                           ("exception", FakeNet([], dedupe_raises={A})),
                           ("missing row", FakeNet([], dedupe_by_id={A: None}))):
            send_drip.requests = net
            try:
                send_drip.already_sent_today(STUB_SECRETS, A)
                raised = False
            except send_drip.DedupeCheckFailed:
                raised = True
            check(f"{label} -> raises DedupeCheckFailed", raised)
    finally:
        send_drip.requests = saved


def test_no_fail_open_left_in_dedupe():
    print("\nqhpe: the old fail-open handler is gone")
    src = (PROJECT_ROOT / "scripts" / "send_drip.py").read_text(encoding="utf-8")
    body = src[src.index("def already_sent_today("):src.index("RERUN_OVERRIDE_ENV =")]
    check("no 'pass' exception swallow in already_sent_today", "pass  # Fail open" not in body
          and "except Exception:\n        pass" not in body)


# ---------------------------------------------------------------- wxmk

def test_second_same_day_run_sends_nothing():
    print("\nwxmk: a second run on a day this site already sent mails nobody")
    net = FakeNet(PENDING, lock_rows=[{"id": A, "last_sent_at": TODAY_TS}])
    out, code = run_drip(net)
    check("no email sent", net.resend_calls == [])
    check("no subscriber advanced", net.patches == [])
    check("nothing inserted", net.inserts == [])
    check("a warning annotation explains the stop", "::warning title=Drip same-day run blocked::" in out)
    check("exit 0 (the guard working is not a failure)", code == 0)


def test_run_lock_check_failure_fails_closed():
    print("\nwxmk: if the run lock cannot be checked, nobody is mailed and the run goes red")
    net = FakeNet(PENDING, lock_status=500)
    out, code = run_drip(net)
    check("no email sent", net.resend_calls == [])
    check("no subscriber advanced", net.patches == [])
    check("error annotation printed", "::error title=Drip run lock check failed::" in out)
    check("exit 1 so the drip-failure issue opens", code == 1)


def test_lock_ignores_rows_not_from_today():
    print("\nwxmk: the lock re-checks the date instead of trusting the filter")
    net = FakeNet(PENDING, lock_rows=[{"id": A, "last_sent_at": YESTERDAY_TS}])
    out, code = run_drip(net)
    check("a stale last_sent_at does not lock the day", len(net.resend_calls) == 2)
    check("exit 0", code == 0)


def test_lock_is_per_site():
    print("\nwxmk: the lock query is scoped to the site being sent")
    captured = []

    class Spy(FakeNet):
        def get(self, url, **kwargs):
            params = kwargs.get("params") or {}
            if "last_sent_at" in params:
                captured.append(params.get("site"))
            return super().get(url, **kwargs)

    run_drip(Spy(PENDING), argv=("send_drip.py", "--site", "kd"))
    check("KD run probes site=eq.kd", captured == ["eq.kd"])


def test_explicit_override_allows_deliberate_rerun():
    print("\nwxmk: the human override lets a deliberate re-run through, per-reader dedupe still applies")
    net = FakeNet(PENDING, lock_rows=[{"id": A, "last_sent_at": TODAY_TS}],
                  dedupe_by_id={A: {"id": A, "last_sent_at": TODAY_TS}})
    out, code = run_drip(net, env={send_drip.RERUN_OVERRIDE_ENV: "1"})
    check("the lock was not consulted", net.lock_probes == 0)
    check("the reader already mailed today is still skipped", "someone@gmail.com" not in net.resend_calls)
    check("the reader not yet mailed is sent", net.resend_calls == ["somebody@gmail.com"])


def test_dry_run_reports_lock_and_sends_nothing():
    print("\nwxmk: a dry run on a locked day says so and still touches nothing")
    net = FakeNet(PENDING, lock_rows=[{"id": A, "last_sent_at": TODAY_TS}])
    out, code = run_drip(net, argv=("send_drip.py", "--dry-run"))
    check("reports the stop a live run would make", "Would STOP" in out)
    check("no email, no write", net.resend_calls == [] and net.patches == [] and net.inserts == [])


def test_workflow_has_its_own_concurrency_group():
    print("\nwxmk: daily-publish no longer queues in the shared 'pages' group")
    text = (PROJECT_ROOT / ".github/workflows/daily-publish.yml").read_text()
    top = text[:text.index("\njobs:")]
    deploy = text[text.index("\n  deploy:"):text.index("\n  health-check:")]
    check("workflow-level group is daily-publish",
          "concurrency:\n  group: daily-publish\n" in top and 'group: "pages"' not in top)
    check("the Pages deploy job still serialises with deploy.yml",
          'concurrency:\n      group: "pages"' in deploy)
    check("no workflow sets the rerun override", all(
        send_drip.RERUN_OVERRIDE_ENV not in p.read_text()
        for p in (PROJECT_ROOT / ".github/workflows").glob("*.yml")))


def main():
    print("Drip double-send protection (qhpe + wxmk)")
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    for f in FAILED:
        print(f"  {f}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
