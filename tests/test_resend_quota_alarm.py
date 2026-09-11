#!/usr/bin/env python3
"""The Resend quota alarm fires on a real quota refusal, and only then.

Brew, deck 920ebe5a, approved 2026-09-10: "watch it with a 429 alarm, do not
pay yet". When Resend refuses a send over the daily/monthly quota (HTTP 429,
daily_quota_exceeded / monthly_quota_exceeded), the refusal must be:
  (a) recorded durably: a Supabase email_send_refusals row with the subscriber
      id, site, list, template or drip day and time; and
  (b) alarmed without Resend: the step output resend_quota_refused=true and a
      refusal table (subscriber ids, NEVER emails, the repo is public) that the
      workflow turns into a GitHub issue and a red run.
And a normal send, or a plain rate-limit 429, must behave exactly as before.

Every network call is a mock. No Supabase, no Resend, no Stripe, no email.

Run: python3 tests/test_resend_quota_alarm.py
"""

import io
import os
import sys
import tempfile
import types
from contextlib import redirect_stdout
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

import resend_quota  # noqa: E402
import send_drip  # noqa: E402
import send_guard  # noqa: E402
import send_newsletter  # noqa: E402

PASSED, FAILED = [], []
STRICT = __name__ != "__main__"  # under pytest, a failed check raises

DAILY = {"statusCode": 429, "name": "daily_quota_exceeded",
         "message": "You have exceeded your daily email sending quota."}
MONTHLY = {"statusCode": 429, "name": "monthly_quota_exceeded",
           "message": "You have exceeded your monthly email sending quota."}
RATE = {"statusCode": 429, "name": "rate_limit_exceeded",
        "message": "Too many requests. Please limit the number of requests per second."}


def check(name, cond):
    (PASSED if cond else FAILED).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}")
    if STRICT:
        assert cond, name


class _Resp:
    def __init__(self, status=200, payload=None):
        self.status_code = status
        self._payload = payload if payload is not None else {}
        import json
        self.text = json.dumps(self._payload)

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeNet:
    """Stands in for the requests module in every script under test.

    resend_by_email maps a recipient to a list of responses, served in order
    (the last one repeats). Everything else is recorded.
    """

    def __init__(self, rows_by_table=None, resend_by_email=None, refusal_insert_status=201):
        self.rows_by_table = rows_by_table or {}
        self.resend_by_email = resend_by_email or {}
        self.refusal_insert_status = refusal_insert_status
        self.resend_calls, self.inserts, self.patches, self.other_posts = [], [], [], []

    def get(self, url, **kwargs):
        table = url.rstrip("/").rsplit("/", 1)[-1].split("?")[0]
        return _Resp(200, self.rows_by_table.get(table, []))

    def post(self, url, **kwargs):
        if "api.resend.com/emails" in url:
            to = kwargs["json"]["to"][0]
            self.resend_calls.append(to)
            queue = self.resend_by_email.get(to) or [_Resp(200, {"id": "re_ok"})]
            return queue.pop(0) if len(queue) > 1 else queue[0]
        if "/rest/v1/" in url:
            table = url.rsplit("/", 1)[-1]
            self.inserts.append((table, kwargs.get("json")))
            status = self.refusal_insert_status if table == resend_quota.TABLE else 201
            return _Resp(status, {})
        self.other_posts.append(url)
        return _Resp(200, {})

    def patch(self, url, **kwargs):
        self.patches.append((url, kwargs.get("json")))
        return _Resp(204, {})

    def refusals(self):
        return [row for table, row in self.inserts if table == resend_quota.TABLE]


STUB_SECRETS = {
    "supabase": {"url": "https://stub.invalid", "service_role_key": "stub-key"},
    "resend": {"key": "stub-resend-key"},
    "stripe": {"secret_key_live": ""},  # no Stripe minting in these tests
}


class Harness:
    """Patch the network and the GitHub runner files, restore everything after."""

    def __init__(self, net):
        self.net = net
        self.tmp = tempfile.TemporaryDirectory()
        self.output = os.path.join(self.tmp.name, "github_output")
        self.alert = os.path.join(self.tmp.name, "resend-quota-refusals.md")
        open(self.output, "w").close()
        self.sleeps = []

    def __enter__(self):
        fake_time = types.SimpleNamespace(sleep=lambda s: self.sleeps.append(s))
        self.saved = (send_drip.requests, send_newsletter.requests, resend_quota.requests,
                      send_drip.time, send_newsletter.time, send_drip.load_secrets, sys.argv,
                      {k: os.environ.get(k) for k in ("GITHUB_OUTPUT", "RUNNER_TEMP",
                                                      "RESEND_QUOTA_ALERT_FILE", "MAX_SENDS_PER_RUN")})
        send_drip.requests = send_newsletter.requests = resend_quota.requests = self.net
        send_drip.time = send_newsletter.time = fake_time
        send_drip.load_secrets = lambda: STUB_SECRETS
        os.environ["GITHUB_OUTPUT"] = self.output
        os.environ["RUNNER_TEMP"] = self.tmp.name
        os.environ.pop("RESEND_QUOTA_ALERT_FILE", None)
        os.environ.pop("MAX_SENDS_PER_RUN", None)
        return self

    def __exit__(self, *exc):
        (send_drip.requests, send_newsletter.requests, resend_quota.requests,
         send_drip.time, send_newsletter.time, send_drip.load_secrets, sys.argv, env) = self.saved
        for k, v in env.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v
        send_guard.set_dry_run(False)
        self.tmp.cleanup()
        return False

    def output_text(self):
        return Path(self.output).read_text()

    def alert_text(self):
        return Path(self.alert).read_text() if os.path.exists(self.alert) else ""


def run_drip(net):
    """send_drip.main() live (not dry run) with every call mocked.
    Returns (harness snapshot, stdout, exit code)."""
    with Harness(net) as h:
        sys.argv = ["send_drip.py"]
        buf, code = io.StringIO(), 0
        try:
            with redirect_stdout(buf):
                send_drip.main()
        except SystemExit as e:
            code = e.code or 0
        snap = types.SimpleNamespace(output=h.output_text(), alert=h.alert_text(), sleeps=list(h.sleeps))
    return snap, buf.getvalue(), code


PENDING = [
    {"id": "11111111-1111-4111-8111-111111111111", "email": "someone@gmail.com",
     "current_day": 3, "subscribed_at": None},
    {"id": "22222222-2222-4222-8222-222222222222", "email": "somebody@gmail.com",
     "current_day": 3, "subscribed_at": None},
]


def drip_rows():
    return {"drip_subscribers": [dict(r) for r in PENDING], "drip_events": []}


def test_drip_quota_refusal_is_recorded_and_alarmed():
    print("\nsend_drip: a daily_quota_exceeded refusal is recorded and alarmed")
    net = FakeNet(drip_rows(), {"somebody@gmail.com": [_Resp(429, DAILY)]})
    snap, out, code = run_drip(net)
    refused_id = PENDING[1]["id"]

    rows = net.refusals()
    check("exactly one refusal row written", len(rows) == 1)
    row = rows[0] if rows else {}
    check("row names the subscriber id", row.get("subscriber_id") == refused_id)
    check("row names the site and list", row.get("site") == "cw" and row.get("list_name") == "drip")
    check("row names the drip day", row.get("template") == "30day-starter/day-4")
    check("row carries a refusal time", bool(row.get("refused_at")))
    check("row carries the address for a hand re-send", row.get("email") == "somebody@gmail.com")
    check("row carries Resend's error name", row.get("error_name") == "daily_quota_exceeded")

    check("refused send was NOT retried (one Resend call)",
          net.resend_calls.count("somebody@gmail.com") == 1)
    check("no backoff sleep for the quota refusal", all(s < 1.0 for s in snap.sleeps))
    check("step output resend_quota_refused=true is set",
          "resend_quota_refused=true" in snap.output)
    check("alert table names the subscriber id and day",
          refused_id in snap.alert and "30day-starter/day-4" in snap.alert)
    check("alert table carries NO email address (public repo)",
          "@" not in snap.alert)
    check("GitHub error annotation printed", "::error title=Resend quota refusal::" in out)

    patched = [u for u, _ in net.patches]
    check("the refused subscriber's current_day was NOT advanced",
          not any(refused_id in u for u in patched))
    check("the delivered subscriber still advanced as before",
          any(PENDING[0]["id"] in u for u in patched))
    check("the run exits non-zero, as any drip failure already did", code == 1)
    check("no email was sent anywhere but the mocked Resend", net.other_posts == [])


def test_drip_success_path_is_unchanged():
    print("\nsend_drip: a clean run fires no alarm and behaves as before")
    net = FakeNet(drip_rows())
    snap, out, code = run_drip(net)
    check("both subscribers mailed once", sorted(net.resend_calls) == ["somebody@gmail.com", "someone@gmail.com"])
    check("no refusal rows", net.refusals() == [])
    check("no step output written", snap.output == "")
    check("no alert table written", snap.alert == "")
    check("two 'sent' events logged to drip_events",
          [t for t, _ in net.inserts].count("drip_events") == 2)
    check("both subscribers advanced", len(net.patches) == 2)
    check("exit code 0", code == 0)
    check("no quota annotation", "::error" not in out)


def test_drip_rate_limit_429_still_retries_and_fires_no_alarm():
    print("\nsend_drip: a rate_limit_exceeded 429 is retried as before, no alarm")
    net = FakeNet(drip_rows(), {"somebody@gmail.com": [_Resp(429, RATE), _Resp(200, {"id": "re_ok"})]})
    snap, out, code = run_drip(net)
    check("the rate-limited send was retried", net.resend_calls.count("somebody@gmail.com") == 2)
    check("it backed off before retrying", any(s >= 1.0 for s in snap.sleeps))
    check("no refusal rows", net.refusals() == [])
    check("no step output written", snap.output == "")
    check("exit code 0 once the retry succeeds", code == 0)


def test_alarm_fires_even_if_supabase_record_fails():
    print("\nsend_drip: the alarm still fires when the Supabase insert fails")
    net = FakeNet(drip_rows(), {"somebody@gmail.com": [_Resp(429, DAILY)]}, refusal_insert_status=500)
    snap, out, code = run_drip(net)
    check("step output still set", "resend_quota_refused=true" in snap.output)
    check("alert table says the row was NOT saved", "NO, see run log" in snap.alert)
    check("full record printed to the run log instead", "RESEND QUOTA REFUSAL NOT SAVED TO SUPABASE" in out
          and PENDING[1]["id"] in out)


def run_newsletter_send(net, recipients):
    with Harness(net) as h:
        send_guard.set_dry_run(False)
        send_newsletter.SUBSCRIBER_IDS.clear()
        send_newsletter.SUBSCRIBER_IDS.update({
            "someone@gmail.com": "33333333-3333-4333-8333-333333333333",
            "somebody@gmail.com": "44444444-4444-4444-8444-444444444444",
        })
        buf = io.StringIO()
        with redirect_stdout(buf):
            results = send_newsletter.send_via_resend(
                "stub-key", "newsletter@carnivoreweekly.com", "Carnivore Weekly",
                "newsletter@carnivoreweekly.com", recipients, "Subject", "<p>body</p>", "cw",
                secrets=STUB_SECRETS, template="newsletter/2026-09-13")
        snap = types.SimpleNamespace(output=h.output_text(), alert=h.alert_text(), sleeps=list(h.sleeps))
    return results, snap, buf.getvalue()


def test_newsletter_quota_refusal_is_recorded_and_alarmed():
    print("\nsend_newsletter: a monthly_quota_exceeded refusal is recorded and alarmed")
    net = FakeNet(resend_by_email={"somebody@gmail.com": [_Resp(429, MONTHLY)]})
    results, snap, out = run_newsletter_send(net, ["someone@gmail.com", "somebody@gmail.com"])
    check("first subscriber sent, second failed",
          [r[1] for r in results] == ["sent", "failed"])
    rows = net.refusals()
    row = rows[0] if rows else {}
    check("exactly one refusal row written", len(rows) == 1)
    check("row names the newsletter subscriber id", row.get("subscriber_id") == "44444444-4444-4444-8444-444444444444")
    check("row names site, list and issue", row.get("site") == "cw" and row.get("list_name") == "newsletter"
          and row.get("template") == "newsletter/2026-09-13")
    check("row carries a refusal time", bool(row.get("refused_at")))
    check("refused send was NOT retried", net.resend_calls.count("somebody@gmail.com") == 1)
    check("step output resend_quota_refused=true is set", "resend_quota_refused=true" in snap.output)
    check("alert table has the id and no email", "44444444" in snap.alert and "@" not in snap.alert)


def test_newsletter_success_path_is_unchanged():
    print("\nsend_newsletter: a clean send fires no alarm")
    net = FakeNet()
    results, snap, out = run_newsletter_send(net, ["someone@gmail.com", "somebody@gmail.com"])
    check("both sent", [r[1] for r in results] == ["sent", "sent"])
    check("no refusal rows", net.refusals() == [])
    check("no step output written", snap.output == "")
    check("no alert table written", snap.alert == "")


def test_newsletter_old_call_signature_still_works():
    print("\nsend_newsletter: the 8-argument call still works (no secrets passed)")
    net = FakeNet()
    with Harness(net):
        send_guard.set_dry_run(False)
        with redirect_stdout(io.StringIO()):
            results = send_newsletter.send_via_resend(
                "stub-key", "f@carnivoreweekly.com", "F", "r@carnivoreweekly.com",
                ["someone@gmail.com"], "Subject", "<p>b</p>", "cw")
    check("sent", [r[1] for r in results] == ["sent"])


def test_get_subscribers_maps_ids():
    print("\nsend_newsletter.get_subscribers keeps each subscriber id for the record")
    net = FakeNet({"newsletter_subscribers": [
        {"id": "55555555-5555-4555-8555-555555555555", "email": "Someone@gmail.com"}]})
    with Harness(net):
        send_newsletter.SUBSCRIBER_IDS.clear()
        with redirect_stdout(io.StringIO()):
            emails = send_newsletter.get_subscribers(STUB_SECRETS, "kd")
    check("audience unchanged", emails == ["Someone@gmail.com"])
    check("id mapped by lowercased email",
          send_newsletter.SUBSCRIBER_IDS.get("someone@gmail.com") == "55555555-5555-4555-8555-555555555555")


def test_quota_detection():
    print("\nquota detection matches only quota refusals")
    q = resend_quota.quota_error_name
    check("daily_quota_exceeded", q(429, DAILY) == "daily_quota_exceeded")
    check("monthly_quota_exceeded", q(429, MONTHLY) == "monthly_quota_exceeded")
    check("JSON text body", q(429, '{"name":"daily_quota_exceeded"}') == "daily_quota_exceeded")
    check("renamed error mentioning quota still counts", q(429, {"name": "x", "message": "sending quota hit"}) == "x")
    check("rate_limit_exceeded is NOT a quota refusal", q(429, RATE) is None)
    check("a 200 is never a refusal", q(200, DAILY) is None)
    check("a 422 is never a refusal", q(422, {"message": "quota"}) is None)


def test_workflows_wire_the_alarm():
    print("\nthe workflows turn the output into an issue and a red run")
    daily = (PROJECT_ROOT / ".github/workflows/daily-publish.yml").read_text()
    weekly = (PROJECT_ROOT / ".github/workflows/weekly-update.yml").read_text()
    check("daily-publish exposes the output from the publish job",
          "resend_quota_refused: ${{ steps.drip.outputs.resend_quota_refused == 'true' || steps.kd_drip.outputs.resend_quota_refused == 'true' }}" in daily)
    check("daily-publish opens the issue", "scripts/resend_quota_alert.sh" in daily)
    check("daily-publish fails the run in health-check",
          "if: needs.publish.outputs.resend_quota_refused == 'true'" in daily)
    check("weekly-update can open issues", "issues: write" in weekly)
    check("weekly-update names the newsletter step", "id: newsletter" in weekly)
    check("weekly-update opens the issue", "scripts/resend_quota_alert.sh" in weekly)
    check("weekly-update fails the run",
          weekly.count("if: steps.newsletter.outputs.resend_quota_refused == 'true'") == 2)
    last_step = weekly.rstrip().rsplit("- name:", 1)[-1]
    check("weekly-update red-run step comes after the commit step", "Fail the run on Resend quota refusal" in last_step)
    alert_sh = (PROJECT_ROOT / "scripts/resend_quota_alert.sh").read_text()
    check("alert script never calls Resend", "resend.com" not in alert_sh and "RESEND_API_KEY" not in alert_sh)


def main():
    print("Resend quota alarm (deck 920ebe5a)")
    test_quota_detection()
    test_drip_quota_refusal_is_recorded_and_alarmed()
    test_drip_success_path_is_unchanged()
    test_drip_rate_limit_429_still_retries_and_fires_no_alarm()
    test_alarm_fires_even_if_supabase_record_fails()
    test_newsletter_quota_refusal_is_recorded_and_alarmed()
    test_newsletter_success_path_is_unchanged()
    test_newsletter_old_call_signature_still_works()
    test_get_subscribers_maps_ids()
    test_workflows_wire_the_alarm()
    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    for f in FAILED:
        print(f"  {f}")
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
