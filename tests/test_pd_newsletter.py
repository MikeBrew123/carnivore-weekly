#!/usr/bin/env python3
"""PescoDial weekly newsletter (Brew, 2026-10-17).

  A. issue 1 (data/newsletters/pd/2026-11-08.json) renders and passes every check
  B. checks catch: em dash, dose directive, off-domain link, dead link, missing
     unsubscribe tag, missing subject
  C. send_newsletter.py --site pd: --test reaches only the two test inboxes; a
     failing check stops a live send before anyone is mailed; an issue already
     sent live is never sent again; --date is required
  D. readers still in the 30-day drip are held back from the PD weekly
  E. the unsubscribe link is the signed one, branded pd
  F. pd_newsletter.py: nothing before 2026-11-08; a draft that still fails after
     one repair is skipped (exit 1, no file, no send)

No network, no email. Run: python3 tests/test_pd_newsletter.py
"""
import copy
import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
os.environ.setdefault("UNSUBSCRIBE_SECRET", "test-unsubscribe-secret")
import pd_newsletter_checks as checks  # noqa: E402
import send_newsletter as sn  # noqa: E402
import pd_newsletter  # noqa: E402

FAILED = []
ISSUE1 = json.loads((ROOT / "data/newsletters/pd/2026-11-08.json").read_text())
LIVE = lambda url: 200  # noqa: E731


def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else f" - {detail}"))
    if not ok:
        FAILED.append(name)


def problems_for(issue, fetch=LIVE):
    return checks.check_issue(issue, checks.render(issue), fetch=fetch)


def test_issue1():
    found = problems_for(ISSUE1)
    check("A. issue 1 passes every check", not found, found)
    html = checks.render(ISSUE1)
    check("A. issue 1 links only to pescodial.com", all(u.startswith(checks.LINK_PREFIX) for u in checks.links(html)))
    check("A. issue 1 has a subject", bool(ISSUE1.get("subject")))


def test_checks_catch():
    def mutated(fn):
        i = copy.deepcopy(ISSUE1)
        fn(i)
        return i
    cases = {
        "em dash": (mutated(lambda i: i["intro"]["paragraphs"].append("Fish is great — really.")), "em-dash"),
        "dose directive": (mutated(lambda i: i["tip"].update(text="Take 1,000 mg of potassium every day with your fish.")), "dose guard"),
        "off-domain link": (mutated(lambda i: i["question"].update(link="https://example.com/x")), "is not on"),
        "missing subject": (mutated(lambda i: i.pop("subject")), "subject: missing"),
    }
    for name, (issue, needle) in cases.items():
        found = problems_for(issue)
        check(f"B. catches {name}", any(needle in p for p in found), found)
    dead = problems_for(ISSUE1, fetch=lambda url: 404 if "shrimp" in url else 200)
    check("B. catches a dead guide link", any("returned 404" in p for p in dead), dead)
    html = checks.render(ISSUE1).replace(checks.UNSUB_TAG, "")
    found = checks.check_issue(ISSUE1, html, fetch=LIVE)
    check("B. catches a missing unsubscribe tag", any("unsubscribe" in p for p in found), found)


class Harness:
    """Runs send_newsletter.main() against a temp issue dir with no network."""

    def __init__(self, issue, date="2026-11-08", fetch=LIVE):
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        (self.dir / f"{date}.json").write_text(json.dumps(issue))
        self.sent_to, self.fetch = None, fetch

    def run(self, *argv):
        saved = (sn.SITES["pd"]["newsletter_dir"], sn.send_via_resend, sn.get_subscribers,
                 sn.load_secrets, checks._fetch_status, sys.argv)
        sn.SITES["pd"]["newsletter_dir"] = self.dir
        checks._fetch_status = self.fetch

        def fake_send(key, fe, fn, rt, to, subject, html, site, **kw):
            self.sent_to = list(to)
            self.site, self.reply_to, self.from_email = site, rt, fe
            return [(e, "sent", "id") for e in to]
        sn.send_via_resend = fake_send
        sn.get_subscribers = lambda secrets, site: ["reader@test.com"]
        sn.load_secrets = lambda: {"resend": {"key": "k"}, "unsubscribe": {"secret": "s"}}
        sys.argv = ["send_newsletter.py", "--site", "pd", *argv]
        code = 0
        try:
            sn.main()
        except SystemExit as exc:
            code = exc.code or 0
        finally:
            (sn.SITES["pd"]["newsletter_dir"], sn.send_via_resend, sn.get_subscribers,
             sn.load_secrets, checks._fetch_status, sys.argv) = saved
        return code


def test_sender():
    h = Harness(ISSUE1)
    code = h.run("--date", "2026-11-08", "--test")
    check("C. --test sends", code == 0 and h.sent_to is not None, code)
    check("C. --test reaches only the two test inboxes", h.sent_to == sn.TEST_EMAILS, h.sent_to)
    check("C. --test leaves no sent marker", not checks.already_sent(h.dir, "2026-11-08"))
    check("C. PD uses the PD sender and catch-all reply-to",
          h.site == "pd" and h.from_email == "sarah@pescodial.com" and h.reply_to == "pescodial@carnivoreweekly.com",
          (h.site, h.from_email, h.reply_to))

    h = Harness(ISSUE1, fetch=lambda url: 404 if "shrimp" in url else 200)
    code = h.run("--date", "2026-11-08")
    check("C. a dead link stops the live send", code == 1 and h.sent_to is None, (code, h.sent_to))

    h = Harness(ISSUE1)
    code = h.run("--date", "2026-11-08")
    check("C. a clean issue sends live", code == 0 and h.sent_to == ["reader@test.com"], (code, h.sent_to))
    check("C. a live send writes the sent marker", checks.already_sent(h.dir, "2026-11-08"))
    h.sent_to = None
    code = h.run("--date", "2026-11-08")
    check("C. an issue already sent live is never sent again", code == 1 and h.sent_to is None, (code, h.sent_to))

    h = Harness(ISSUE1)
    code = h.run("--test")
    check("C. --site pd without --date refuses", code == 1 and h.sent_to is None, (code, h.sent_to))


def test_drip_hold():
    class Resp:
        def __init__(self, rows):
            self.rows = rows

        def raise_for_status(self):
            pass

        def json(self):
            return self.rows

    calls = []

    def fake_get(url, headers=None, params=None):
        calls.append(url)
        if url.endswith("/newsletter_subscribers"):
            return Resp([{"id": 1, "email": "graduated@test.com"}, {"id": 2, "email": "middrip@test.com"}])
        return Resp([{"email": "middrip@test.com"}])
    saved = sn.requests.get
    sn.requests.get = fake_get
    try:
        got = sn.get_subscribers({"supabase": {"url": "https://x.supabase.co", "service_role_key": "k"}}, "pd")
    finally:
        sn.requests.get = saved
    check("D. PD holds readers still in the drip", got == ["graduated@test.com"], got)
    check("D. PD checks the drip table", any(u.endswith("/drip_subscribers") for u in calls), calls)


def test_unsubscribe():
    html = sn.personalize_html(checks.render(ISSUE1), "reader@test.com", "pd", "secret")
    check("E. unsubscribe tag is filled", checks.UNSUB_TAG not in html)
    check("E. unsubscribe link is branded pd", "site=pd" in html)


def test_sunday_job():
    calls = []
    saved = pd_newsletter.subprocess.call
    pd_newsletter.subprocess.call = lambda cmd: calls.append(cmd) or 0
    try:
        picked = []
        saved_pick = pd_newsletter.pick_guide
        pd_newsletter.pick_guide = lambda posts, issues: picked.append(1) or (None, None)
        try:
            code = pd_newsletter.main(["--date", "2026-11-01"])
        finally:
            pd_newsletter.pick_guide = saved_pick
        check("F. nothing happens before 2026-11-08", code == 0 and not calls and not picked, (code, calls, picked))

        bad = json.dumps(dict(copy.deepcopy(ISSUE1), subject="Fish — the easy way"))
        post = {"site": "pd", "slug": "is-shrimp-bad-for-cholesterol", "title": "Shrimp", "content": "text"}
        url = "https://www.pescodial.com/guides/is-shrimp-bad-for-cholesterol/"
        _, found = pd_newsletter.draft_issue("2026-11-15", post, url, [], model=lambda s, u: bad, fetch=LIVE)
        check("F. a draft failing twice is reported", bool(found), found)
        good = json.dumps(ISSUE1)
        seq = iter([bad, good])
        issue, found = pd_newsletter.draft_issue("2026-11-15", post, url, [], model=lambda s, u: next(seq), fetch=LIVE)
        check("F. one repair pass can fix a draft", not found and issue["date"] == "November 15, 2026", found)

        with tempfile.TemporaryDirectory() as d:
            saved_dir, saved_draft, saved_pick = checks.ISSUE_DIR, pd_newsletter.draft_issue, pd_newsletter.pick_guide
            checks.ISSUE_DIR = Path(d)
            pd_newsletter.pick_guide = lambda posts, issues: (post, url)
            pd_newsletter.draft_issue = lambda *a, **k: ({}, ["style: em-dash"])
            try:
                code = pd_newsletter.main(["--date", "2026-11-15"])
            finally:
                checks.ISSUE_DIR, pd_newsletter.draft_issue, pd_newsletter.pick_guide = saved_dir, saved_draft, saved_pick
            check("F. a failing draft is skipped with exit 1", code == 1, code)
            check("F. a failing draft writes no issue file", not any(Path(d).iterdir()))
            check("F. a failing draft sends nothing", not calls, calls)
    finally:
        pd_newsletter.subprocess.call = saved


if __name__ == "__main__":
    test_issue1()
    test_checks_catch()
    test_sender()
    test_drip_hold()
    test_unsubscribe()
    test_sunday_job()
    sys.exit(1 if FAILED else 0)
