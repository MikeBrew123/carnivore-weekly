#!/usr/bin/env python3
"""No subscriber email address reaches the public GitHub Actions log.

2026-11-10: this repo is public, and the drip and newsletter senders printed
each subscriber's address on every send, skip, graduation and failure line.
The fix has two layers and this file tests both, plus a static guard:

  1. RedactingStream / install() (scripts/log_redaction.py): every write to
     sys.stdout and sys.stderr is scrubbed of addresses, including an address
     split across two writes, a URL-encoded one, and a traceback.
  2. The senders themselves name subscribers by row-id reference, never by
     address: send_drip.py, send_newsletter.py (CW and PD), resend_quota.py.
     These runs capture output in-process WITHOUT the stream guard, so they
     prove the source fix on its own.
  3. The real scripts run as __main__ in a subprocess, with the guard on,
     must not leak even when a dependency prints or raises with an address.
  4. A static scan fails if a print / allow() / annotation in a sender
     interpolates an email-like field again.

Every network call is a fake. No Supabase, no Resend, no Stripe, no email.
Only synthetic addresses on the reserved .invalid domain are used.

Run: python3 tests/test_log_redaction.py   (or under pytest)
"""

import ast
import io
import json
import os
import subprocess
import sys
import tempfile
import textwrap
import types
from contextlib import redirect_stdout
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = PROJECT_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))
os.environ.setdefault("UNSUBSCRIBE_SECRET", "test-unsubscribe-secret")

import log_redaction  # noqa: E402
import resend_quota  # noqa: E402
import send_drip  # noqa: E402
import send_guard  # noqa: E402
import send_newsletter  # noqa: E402

PASSED, FAILED = [], []
STRICT = __name__ != "__main__"  # under pytest, a failed check raises

ADDR = {n: f"reader{n}@example.invalid" for n in range(1, 10)}
FIXTURE = "fixture1@example.invalid"
ALL_ADDRS = list(ADDR.values()) + [FIXTURE]


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}")
    if STRICT:
        assert cond, name


def leaks(text):
    """Every address-shaped string in text (synthetic or otherwise)."""
    return log_redaction.EMAIL_RE.findall(text or "")


# ------------------------------------------------------------------ 1. stream


def _stream():
    sink = io.StringIO()
    return sink, log_redaction.RedactingStream(sink)


def test_plain_print_is_redacted():
    print("\nstream: a printed address is redacted, the rest of the line kept")
    sink, s = _stream()
    print(f"  ✅ Day 3 → {ADDR[1]}: Welcome", file=s)
    out = sink.getvalue()
    check("address gone", ADDR[1] not in out and not leaks(out))
    check("marker and context kept", out == "  ✅ Day 3 → [email redacted]: Welcome\n")


def test_partial_writes_split_mid_address():
    print("\nstream: an address split across writes is still caught, at every split point")
    line = f"MISSED: {ADDR[2]} — 422\n"
    bad = []
    for i in range(1, len(line)):
        sink, s = _stream()
        s.write(line[:i])
        s.write(line[i:])
        if leaks(sink.getvalue()) or "[email redacted]" not in sink.getvalue():
            bad.append(i)
    check("no split point leaks the address", bad == [])
    sink, s = _stream()
    for ch in line:  # one character per write
        s.write(ch)
    check("char-by-char writes are redacted", sink.getvalue() == "MISSED: [email redacted] — 422\n")


def test_url_encoded_and_varied_addresses():
    print("\nstream: URL-encoded, plus-addressed and upper-case addresses are caught")
    r = log_redaction.redact
    check("%40 in a Supabase filter URL",
          not leaks(r("404 for url https://x.invalid/rest/v1/t?email=ilike.reader1%40example.invalid&limit=1")))
    check("plus addressing", r("reader+tag@example.invalid") == "[email redacted]")
    check("upper case", r("READER1@EXAMPLE.INVALID") == "[email redacted]")
    check("inside JSON", not leaks(r(json.dumps({"to": [ADDR[3]], "x": 1}))))
    check("non-address text untouched", r("Done: 3 sent, 1 graduated") == "Done: 3 sent, 1 graduated")


def test_unicode_survives():
    print("\nstream: unicode around an address is preserved")
    sink, s = _stream()
    s.write(f"🎓 {ADDR[4]} — café ✅ naïve\n")
    check("unicode intact, address gone", sink.getvalue() == "🎓 [email redacted] — café ✅ naïve\n")


def test_flush_releases_held_text():
    print("\nstream: flush() releases held text and flushes the wrapped stream")
    flushed = []

    class Sink(io.StringIO):
        def flush(self):
            flushed.append(True)
            super().flush()

    sink = Sink()
    s = log_redaction.RedactingStream(sink)
    s.write("progress: 3 of 9 done")  # no newline: the trailing word is held
    s.flush()
    check("held text written on flush", sink.getvalue() == "progress: 3 of 9 done")
    check("wrapped stream flushed", flushed == [True])
    sink2, s2 = _stream()
    s2.write("to reader5@exa")  # an address cut off before its dot, then flushed
    s2.flush()
    check("a cut-off address is still redacted on flush", "reader5" not in sink2.getvalue()
          and "[email redacted]" in sink2.getvalue())
    sink3, s3 = _stream()
    check("write returns the length it was given", s3.write("abc@") == 4)


def test_stream_delegates_and_install_is_idempotent():
    print("\nstream: fileno/encoding/isatty delegate; install() wraps once")
    raw = sys.__stdout__
    s = log_redaction.RedactingStream(raw)
    check("fileno delegates", s.fileno() == raw.fileno())
    check("encoding delegates", s.encoding == raw.encoding)
    check("isatty delegates", s.isatty() == raw.isatty())
    saved = sys.stdout, sys.stderr
    try:
        sys.stdout, sys.stderr = io.StringIO(), io.StringIO()
        log_redaction.install()
        first = sys.stdout
        log_redaction.install()
        check("stdout wrapped", isinstance(sys.stdout, log_redaction.RedactingStream))
        check("stderr wrapped", isinstance(sys.stderr, log_redaction.RedactingStream))
        check("second install does not double-wrap", sys.stdout is first)
    finally:
        sys.stdout, sys.stderr = saved


def test_ref_is_stable_and_not_an_address():
    print("\nref(): row id first, keyed hash otherwise, never the address")
    r = log_redaction.ref
    check("row id preferred", r("11111111-2222-3333", ADDR[1]) == "sub:11111111")
    check("hash is stable", r(email=ADDR[1]) == r(email=ADDR[1].upper()))
    check("hash differs per address", r(email=ADDR[1]) != r(email=ADDR[2]))
    check("hash carries no address", "@" not in r(email=ADDR[1]) and "reader" not in r(email=ADDR[1]))
    check("nothing known", r() == "sub:unknown")


def _run_child(code, env_extra=None):
    env = {"PATH": os.environ.get("PATH", ""), "PYTHONIOENCODING": "utf-8",
           "UNSUBSCRIBE_SECRET": "test-unsubscribe-secret"}
    env.update(env_extra or {})
    return subprocess.run([sys.executable, "-c", code], capture_output=True, text=True,
                          cwd=str(PROJECT_ROOT), env=env, timeout=120)


def test_stderr_and_traceback_in_a_real_process():
    print("\nprocess: stderr and an uncaught traceback pass through the guard")
    code = textwrap.dedent(f"""
        import sys
        sys.path.insert(0, {str(SCRIPTS)!r})
        import log_redaction
        log_redaction.install()
        print("stdout {ADDR[1]}", flush=True)
        print("stderr {ADDR[2]}", file=sys.stderr)
        sys.stdout.write("split reader3@exa")
        sys.stdout.write("mple.invalid done\\n")
        raise RuntimeError("Supabase said: duplicate row for {ADDR[4]}")
    """)
    p = _run_child(code)
    both = p.stdout + p.stderr
    check("exits non-zero from the exception", p.returncode == 1)
    check("traceback still printed", "Traceback (most recent call last)" in p.stderr
          and "RuntimeError" in p.stderr)
    check("no address anywhere in stdout or stderr", not leaks(both))
    check("redaction markers present", both.count("[email redacted]") >= 4)


# --------------------------------------------- 2. senders, in-process (source)


class _Resp:
    def __init__(self, status=200, payload=None, text=None):
        self.status_code = status
        self._payload = payload if payload is not None else {}
        self.text = text if text is not None else json.dumps(self._payload)

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(f"{self.status_code} error: {self.text}")

    def json(self):
        return self._payload


TODAY_TS = send_drip._utc_today() + "T01:00:00+00:00"
YESTERDAY_TS = "2000-01-01T01:00:00+00:00"
QUOTA = {"statusCode": 429, "name": "daily_quota_exceeded",
         "message": "You have exceeded your daily email sending quota."}


def sid(n):
    return f"{n}{n}{n}{n}{n}{n}{n}{n}-0000-4000-8000-00000000000{n}"


class FakeNet:
    """requests stand-in for send_drip / send_newsletter / resend_quota."""

    def __init__(self, pending=None, newsletter_rows=None, in_drip=None):
        self.pending = pending or []
        self.newsletter_rows = newsletter_rows or []
        self.in_drip = in_drip or []
        self.resend_calls, self.inserts, self.patches = [], [], []

    def get(self, url, params=None, **kw):
        params = params or {}
        table = url.rstrip("/").rsplit("/", 1)[-1]
        if table == "drip_subscribers":
            if "id" in params:  # per-reader dedupe
                rid = params["id"][3:]
                if rid == sid(7):
                    return _Resp(500, {"message": "server error"})
                last = TODAY_TS if rid == sid(6) else YESTERDAY_TS
                return _Resp(200, [{"id": rid, "last_sent_at": last}])
            if "last_sent_at" in params:  # run-level lock
                return _Resp(200, [])
            if params.get("select") == "email":  # newsletter drip suppression
                return _Resp(200, [{"email": e} for e in self.in_drip])
            return _Resp(200, [dict(r) for r in self.pending])
        if table == "drip_survey_questions":
            return _Resp(200, [{"day": 3}])  # day 3 is personalised in these runs
        if table == "calculator_sessions_v2":
            who = params.get("email", "").split(".", 1)[-1]
            if who == ADDR[8]:
                return _Resp(200, [])  # no calculator row: the skip path
            if who == ADDR[9]:
                raise RuntimeError(f"404 for url {url}?email=ilike.reader9%40example.invalid")
            return _Resp(200, [{"weight_value": 80, "sex": "female", "goal": "lose"}])
        if table == "newsletter_subscribers":
            return _Resp(200, [dict(r) for r in self.newsletter_rows])
        return _Resp(200, [])

    def post(self, url, json=None, **kw):
        if "api.resend.com/emails" in url:
            to = json["to"][0]
            self.resend_calls.append(to)
            if to == ADDR[2]:
                return _Resp(422, text='{"name":"validation_error","message":"Invalid `to`: ' + to + '"}')
            if to == ADDR[3]:
                return _Resp(429, QUOTA)
            return _Resp(200, {"id": "re_ok"})
        table = url.rsplit("/", 1)[-1]
        self.inserts.append((table, json))
        if table == resend_quota.TABLE:  # the refusal record fails, echoing the row
            return _Resp(500, text=f'{{"message":"insert failed for {json.get("email")}"}}')
        return _Resp(201, {})

    def patch(self, url, json=None, **kw):
        self.patches.append((url, json))
        return _Resp(204, {})


STUB_SECRETS = {
    "supabase": {"url": "https://stub.invalid", "service_role_key": "stub-key"},
    "resend": {"key": "stub-resend-key"},
    "stripe": {"secret_key_live": ""},
}


def drip_pending():
    rows = [
        (1, 2),  # sent
        (2, 2),  # Resend 422 echoing the address
        (3, 2),  # quota refusal
        (4, 28),  # graduation
        (5, 8),  # quiet day advance
        (6, 2),  # already sent today
        (7, 2),  # dedupe check failed
        (8, 2),  # personalised day, no calculator row: skipped
        (9, 2),  # calculator lookup raises with a %40 URL: fail open, sent
    ]
    out = [{"id": sid(n), "email": ADDR[n], "current_day": d, "subscribed_at": None,
            "checkin_token": None, "source": None} for n, d in rows]
    out.append({"id": "f0f0f0f0-0000", "email": FIXTURE, "current_day": 2, "subscribed_at": None})
    return out


class Patched:
    """Swap the network, clock, secrets and GitHub runner files; restore after."""

    def __init__(self, net, argv):
        self.net, self.argv = net, argv
        self.tmp = tempfile.TemporaryDirectory()

    def __enter__(self):
        fake_time = types.SimpleNamespace(sleep=lambda s: None)
        self.saved = dict(
            dr=send_drip.requests, nr=send_newsletter.requests, qr=resend_quota.requests,
            dt=send_drip.time, nt=send_newsletter.time, ds=send_drip.load_secrets,
            ns=send_newsletter.load_secrets, fx=send_drip.is_undeliverable_fixture,
            argv=sys.argv, env={k: os.environ.get(k) for k in (
                "GITHUB_OUTPUT", "RUNNER_TEMP", "RESEND_QUOTA_ALERT_FILE", "MAX_SENDS_PER_RUN",
                send_drip.RERUN_OVERRIDE_ENV)})
        send_drip.requests = send_newsletter.requests = resend_quota.requests = self.net
        send_drip.time = send_newsletter.time = fake_time
        send_drip.load_secrets = send_newsletter.load_secrets = lambda: STUB_SECRETS
        # .invalid is a fixture domain to the real guard; here only "fixture*" is.
        send_drip.is_undeliverable_fixture = lambda e: (e or "").startswith("fixture")
        for k in self.saved["env"]:
            os.environ.pop(k, None)
        self.output = os.path.join(self.tmp.name, "github_output")
        open(self.output, "w").close()
        os.environ["GITHUB_OUTPUT"] = self.output
        os.environ["RUNNER_TEMP"] = self.tmp.name
        sys.argv = list(self.argv)
        return self

    def alert(self):
        p = os.path.join(self.tmp.name, resend_quota.ALERT_FILE_NAME)
        return Path(p).read_text() if os.path.exists(p) else ""

    def __exit__(self, *exc):
        s = self.saved
        send_drip.requests, send_newsletter.requests, resend_quota.requests = s["dr"], s["nr"], s["qr"]
        send_drip.time, send_newsletter.time = s["dt"], s["nt"]
        send_drip.load_secrets, send_newsletter.load_secrets = s["ds"], s["ns"]
        send_drip.is_undeliverable_fixture = s["fx"]
        sys.argv = s["argv"]
        for k, v in s["env"].items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        send_guard.set_dry_run(False)
        self.tmp.cleanup()
        return False


def run_main(mod, net, argv):
    buf, code = io.StringIO(), 0
    with Patched(net, argv) as p:
        try:
            with redirect_stdout(buf):
                mod.main()
        except SystemExit as e:
            code = e.code or 0
        alert, output = p.alert(), Path(p.output).read_text()
    return buf.getvalue(), code, alert, output


def test_drip_live_run_names_no_one():
    print("\nsend_drip (live, mocked): every path logs a reference, never an address")
    net = FakeNet(pending=drip_pending())
    out, code, alert, output = run_main(send_drip, net, ["send_drip.py"])
    check("behaviour: mailed exactly readers 1, 2, 3 and 9",
          sorted(net.resend_calls) == sorted([ADDR[1], ADDR[2], ADDR[3], ADDR[9]]))
    check("behaviour: graduation still inserted into newsletter_subscribers",
          any(t == "newsletter_subscribers" and r.get("email") == ADDR[4] for t, r in net.inserts))
    check("behaviour: exits 1 because sends failed", code == 1)
    check("no address in the run log", not leaks(out))
    check("no address in the GitHub alert table", not leaks(alert) and sid(3) in alert)
    check("step output still raised", "resend_quota_refused=true" in output)
    check("summary counts present",
          "Done: 2 sent, 1 graduated to weekly, 2 FAILED (1 refused by the Resend quota" in out
          and "1 skipped (already sent today)" in out
          and "1 SKIPPED (dedupe check failed" in out
          and "1 skipped (no usable calculator context" in out)
    check("sent line names the row reference", f"✅ Day 3 → sub:{sid(1)[:8]}: " in out)
    check("422 failure names the reference, echoed body redacted",
          f"❌ Day 3 → sub:{sid(2)[:8]}:" in out and "[email redacted]" in out)
    check("MISSED lines use references", f"MISSED: day 3 -> sub:{sid(2)[:8]}" in out
          and f"MISSED: day 3 -> sub:{sid(3)[:8]}" in out)
    check("graduation, quiet day, duplicate, dedupe and skip lines present",
          f"🎓 sub:{sid(4)[:8]} — completed drip" in out
          and f"💤 sub:{sid(5)[:8]} — day 9 is a quiet day" in out
          and f"⏭️  sub:{sid(6)[:8]} — already sent today" in out
          and f"SKIPPED: day 3 -> sub:{sid(7)[:8]}" in out
          and f"⏭️  sub:{sid(8)[:8]} — day 3 skipped" in out)
    check("fixture skip names a reference", "🚫 sub:f0f0f0f0 — test fixture address" in out)
    check("calculator-lookup URL (%40) redacted", "calculator lookup failed" in out
          and "reader9" not in out)
    check("unsaved quota record printed without the address",
          "RESEND QUOTA REFUSAL NOT SAVED TO SUPABASE" in out and sid(3) in out)
    check("quota refusal annotation unchanged", "::error title=Resend quota refusal::" in out)


def test_drip_dry_run_names_no_one():
    print("\nsend_drip --dry-run: the Would ... lines name references")
    net = FakeNet(pending=drip_pending())
    out, code, _, _ = run_main(send_drip, net, ["send_drip.py", "--dry-run"])
    check("dry run sent nothing", net.resend_calls == [] and net.patches == [])
    check("no address in the dry-run log", not leaks(out))
    check("would-send, would-graduate, would-advance, would-skip lines present",
          f"Would send day 3 to sub:{sid(1)[:8]}" in out
          and f"Would graduate sub:{sid(4)[:8]}" in out
          and f"Would advance sub:{sid(5)[:8]}" in out
          and f"Would SKIP day 3 for sub:{sid(8)[:8]}" in out)


def test_drip_kd_buffer_and_test_mode():
    print("\nsend_drip: KD 48h buffer skip and --test mode name no one")
    now = send_drip.datetime.now(send_drip.timezone.utc).isoformat()
    net = FakeNet(pending=[{"id": sid(1), "email": ADDR[1], "current_day": 0, "subscribed_at": now}])
    out, code, _, _ = run_main(send_drip, net, ["send_drip.py", "--site", "kd"])
    check("buffer skip logged by reference", f"⏳ sub:{sid(1)[:8]}: subscribed" in out and not leaks(out))
    out, code, _, _ = run_main(send_drip, FakeNet(), ["send_drip.py", "--test"])
    check("--test names the test inbox, not its address", "would send to the test inbox" in out
          and not leaks(out))


def newsletter_rows():
    return [{"id": sid(n), "email": ADDR[n]} for n in (1, 2, 3, 5)]


def run_newsletter(argv, site_patches=None):
    net = FakeNet(newsletter_rows=newsletter_rows(), in_drip=[ADDR[5]])
    saved = (send_newsletter.load_newsletter_html, send_newsletter.load_subject,
             send_newsletter.validate_newsletter_links, send_newsletter.pd_newsletter_checks,
             send_newsletter.filter_mailable)
    # .invalid is a fixture domain to the real guard; here only "fixture*" is.
    send_newsletter.filter_mailable = lambda es: (
        [e for e in es if not e.startswith("fixture")], [e for e in es if e.startswith("fixture")])
    send_newsletter.load_newsletter_html = lambda site, date=None: ("<p>issue</p>", "2026-11-15")
    send_newsletter.load_subject = lambda site: "This week"
    send_newsletter.validate_newsletter_links = lambda html: []
    marks = []
    send_newsletter.pd_newsletter_checks = types.SimpleNamespace(
        load_issue=lambda d, date: ({}, "<p>pd issue</p>", "PD this week"),
        already_sent=lambda d, date: False,
        check_issue=lambda issue, html: [],
        mark_sent=lambda d, date, sent, failed: marks.append((sent, failed)),
    )
    send_newsletter.SUBSCRIBER_IDS.clear()
    try:
        out, code, alert, output = run_main(send_newsletter, net, argv)
    finally:
        (send_newsletter.load_newsletter_html, send_newsletter.load_subject,
         send_newsletter.validate_newsletter_links, send_newsletter.pd_newsletter_checks,
         send_newsletter.filter_mailable) = saved
    return net, out, code, alert, output, marks


def test_newsletter_live_cw_names_no_one():
    print("\nsend_newsletter --site cw (live, mocked): results name references")
    net, out, code, alert, output, _ = run_newsletter(["send_newsletter.py", "--site", "cw"])
    check("behaviour: mailed 1, 2, 3; reader 5 held back by the drip",
          net.resend_calls == [ADDR[1], ADDR[2], ADDR[3]])
    check("behaviour: exits 1 on failures", code == 1)
    check("no address in the run log", not leaks(out))
    check("no address in the alert table", not leaks(alert))
    check("counts present", "Results: 1 sent, 2 failed" in out
          and "2 of 3 SUBSCRIBERS DID NOT RECEIVE THIS" in out
          and "Suppressed 1 subscriber(s) still in the 30-day drip" in out)
    check("per-subscriber lines use references", f"✅ sub:{sid(1)[:8]}" in out
          and f"MISSED: sub:{sid(2)[:8]}" in out and f"MISSED: sub:{sid(3)[:8]}" in out)
    check("sender shown by domain", "From:    Carnivore Weekly (carnivoreweekly.com)" in out)


def test_newsletter_pd_path_names_no_one():
    print("\nsend_newsletter --site pd (the pd-newsletter.yml path): no address")
    net, out, code, alert, output, marks = run_newsletter(
        ["send_newsletter.py", "--site", "pd", "--date", "2026-11-15"])
    check("behaviour: PD issue mailed to the same audience", len(net.resend_calls) == 3)
    check("behaviour: marked sent with 1 sent, 2 failed", marks == [(1, 2)])
    check("no address in the run log", not leaks(out) and not leaks(alert))


def test_newsletter_dry_run_and_test_mode_name_no_one():
    print("\nsend_newsletter --dry-run and --test: the test inboxes are not printed")
    _, out, code, _, _, _ = run_newsletter(["send_newsletter.py", "--site", "kd", "--dry-run"])
    check("dry run: no address", not leaks(out) and "Would send to: ref:" in out)
    net, out, code, _, _, _ = run_newsletter(["send_newsletter.py", "--site", "kd", "--test"])
    check("test mode: no address", not leaks(out) and "sending to the 2 test inboxes only" in out)
    check("behaviour: test mode still mails the two test inboxes",
          net.resend_calls == send_newsletter.TEST_EMAILS)


# ------------------------------- 3. the real scripts as __main__, guard on

HARNESS = textwrap.dedent('''
    import json, runpy, sys, types
    SCRIPTS, SCRIPT, ARGV = sys.argv[1], sys.argv[2], sys.argv[3:]
    sys.path.insert(0, SCRIPTS)
    A1 = "reader1@example.invalid"

    class R:
        def __init__(self, status=200, payload=None, text=None):
            self.status_code, self._p = status, payload if payload is not None else {}
            self.text = text if text is not None else json.dumps(self._p)
        def json(self): return self._p
        def raise_for_status(self): pass

    def get(url, params=None, **kw):
        params = params or {}
        if url.endswith("/drip_subscribers"):
            if "id" in params:
                return R(200, [{"id": params["id"][3:], "last_sent_at": "2000-01-01"}])
            if "last_sent_at" in params:
                return R(200, [])
            return R(200, [{"id": "abcdef12-0000", "email": A1, "current_day": 2,
                            "subscribed_at": None}])
        return R(200, [])

    def post(url, json=None, **kw):
        if "api.resend.com" in url:
            # A chatty dependency: logs the recipient, in two pieces.
            sys.stdout.write("resend debug: to=" + json["to"][0][:9])
            sys.stdout.write(json["to"][0][9:] + "\\n")
            print("resend warn: " + json["to"][0], file=sys.stderr)
            return R(200, {"id": "re_ok"})
        return R(201, {})

    def patch(url, json=None, **kw):
        # A Supabase error that echoes row data, raised uncaught.
        raise RuntimeError("PATCH rejected: conflicting row for " + A1)

    fake = types.ModuleType("requests")
    fake.get, fake.post, fake.patch = get, post, patch
    sys.modules["requests"] = fake
    import subscriber_hygiene
    subscriber_hygiene.is_undeliverable_fixture = lambda e: False
    sys.argv = [SCRIPT] + ARGV
    runpy.run_path(SCRIPT, run_name="__main__")
''')


def test_real_drip_script_with_guard_on():
    print("\nsend_drip.py as __main__: a chatty dependency and a crash leak nothing")
    with tempfile.TemporaryDirectory() as tmp:
        h = Path(tmp) / "harness.py"
        h.write_text(HARNESS, encoding="utf-8")
        env = {"PATH": os.environ.get("PATH", ""), "PYTHONIOENCODING": "utf-8",
               "SUPABASE_URL": "https://stub.invalid", "SUPABASE_SERVICE_ROLE_KEY": "stub",
               "RESEND_API_KEY": "stub", "UNSUBSCRIBE_SECRET": "test-unsubscribe-secret"}
        p = subprocess.run([sys.executable, str(h), str(SCRIPTS), str(SCRIPTS / "send_drip.py")],
                           capture_output=True, text=True, cwd=str(PROJECT_ROOT), env=env,
                           timeout=120)
    both = p.stdout + p.stderr
    check("the run really reached Resend and crashed after it",
          "resend debug: to=" in p.stdout and "RuntimeError: PATCH rejected" in p.stderr)
    check("traceback kept", "Traceback (most recent call last)" in p.stderr)
    check("guarded run: no address in stdout or stderr", not leaks(both))


# ------------------------------------------------------------ 4. static scan

SENDERS = ["send_drip.py", "send_newsletter.py", "resend_quota.py", "pd_newsletter.py",
           "weekly_newsletter.py", "pd_newsletter_checks.py", "send_guard.py"]
ADDRESS_NAMES = {"email", "emails", "to", "to_email", "to_emails", "recipient", "recipients",
                 "addr", "address", "TEST_EMAIL", "TEST_EMAILS", "first_name", "name_first"}
WHOLE_ROWS = {"sub", "row", "subscriber"}
SAFE_CALLS = {"who", "ref", "redact", "len"}
OUTPUT_CALLS = {"print", "allow"}
# (file, line text fragment) pairs a reviewer has accepted. Keep it empty if you can.
ALLOWLIST = set()


def _call_name(node):
    f = node.func
    return f.attr if isinstance(f, ast.Attribute) else getattr(f, "id", None)


def _risky(expr):
    """True when an interpolated expression can carry an address."""
    if isinstance(expr, ast.Call) and _call_name(expr) in SAFE_CALLS:
        return False
    for n in ast.walk(expr):
        if isinstance(n, ast.Call) and _call_name(n) in SAFE_CALLS:
            continue
        if isinstance(n, ast.Name) and (n.id in ADDRESS_NAMES or n.id in WHOLE_ROWS and n is expr):
            return True
        if isinstance(n, ast.Constant) and n.value in ("email", "first_name", "to"):
            return True
    return False


def _inside_safe_call(tree):
    safe = set()
    for n in ast.walk(tree):
        if isinstance(n, ast.Call) and _call_name(n) in SAFE_CALLS:
            safe.update(id(x) for x in ast.walk(n))
    return safe


def scan(path):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    safe = _inside_safe_call(tree)
    lines = path.read_text(encoding="utf-8").splitlines()
    hits = []
    for node in ast.walk(tree):
        if not (isinstance(node, ast.Call) and _call_name(node) in OUTPUT_CALLS):
            continue
        for arg in list(node.args) + [k.value for k in node.keywords if k.arg != "file"]:
            parts = [v.value for v in ast.walk(arg) if isinstance(v, ast.FormattedValue)]
            if not isinstance(arg, ast.JoinedStr):
                parts.append(arg)
            for part in parts:
                if id(part) not in safe and _risky(part):
                    text = lines[node.lineno - 1].strip()
                    if (path.name, text) not in ALLOWLIST:
                        hits.append(f"{path.name}:{node.lineno}: {text}")
                    break
    return hits


def test_static_no_address_interpolated_in_output():
    print("\nstatic: no print/allow() in a sender interpolates an address field")
    hits = []
    for name in SENDERS:
        hits += scan(SCRIPTS / name)
    for h in hits:
        print(f"      {h}")
    check("no print/allow() interpolates email, to, TEST_EMAIL(S) or a whole row", hits == [])
    check("the scanner itself catches the old leak shape", bool(_scan_src(
        'print(f"  ✅ Day {d} → {sub[\'email\']}: {s}")\nsend_guard.allow(f"send to {to}")\n')))


def _scan_src(src):
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "x.py"
        p.write_text(src, encoding="utf-8")
        return scan(p)


def test_every_sender_entrypoint_installs_the_guard_first():
    print("\nstatic: each sender entrypoint installs the guard before its other imports")
    for name in ("send_drip.py", "send_newsletter.py", "pd_newsletter.py", "weekly_newsletter.py"):
        tree = ast.parse((SCRIPTS / name).read_text(encoding="utf-8"))
        body = [n for n in tree.body if not (isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant))]
        first = body[0]
        src = ast.unparse(first)
        check(f"{name}: first statement installs log_redaction under __main__",
              isinstance(first, ast.If) and "__main__" in src and "log_redaction.install()" in src)


def main():
    print("Subscriber addresses stay out of the public run log")
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    for f in FAILED:
        print(f"  {f}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
