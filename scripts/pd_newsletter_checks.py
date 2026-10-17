#!/usr/bin/env python3
"""PescoDial newsletter: load an issue and decide whether it is safe to send.

Launch plan: docs/project-log/pd-newsletter-launch-plan-2026-10-17.md (Brew, 2026-10-17).
An issue that fails any check here is skipped and the run alerts. It is never
sent in a weaker form. Used by send_newsletter.py --site pd and pd_newsletter.py.

Checks:
  * subject present and short enough for a phone inbox
  * house style on every string (content_review.check_text, site pd): em-dashes,
    AI tells, reading grade
  * no dose or medicine directives (electrolyte_dose_guard, the same guard the
    paid reports use), on the rendered HTML
  * the signed unsubscribe merge tag is in the HTML
  * every link points at www.pescodial.com and returns 200 right now, so a
    guide that is not live yet can never be linked (ISSUE-038)
"""
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "pescodial" / "scripts"))

import content_review  # noqa: E402
import electrolyte_dose_guard  # noqa: E402
import pd_email_shell  # noqa: E402

ISSUE_DIR = ROOT / "data" / "newsletters" / "pd"
SUBJECT_MAX = 70
LINK_PREFIX = "https://www.pescodial.com/"
UNSUB_TAG = pd_email_shell.NEWSLETTER_UNSUBSCRIBE


def issue_path(issue_dir, date):
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date or ""):
        raise SystemExit(f"Error: bad issue date {date!r}, expected YYYY-MM-DD")
    return Path(issue_dir) / f"{date}.json"


def render(issue):
    return pd_email_shell.render_newsletter(issue)


def load_issue(issue_dir, date):
    """(issue dict, rendered html, subject). Exits if the file or subject is missing."""
    path = issue_path(issue_dir, date)
    if not path.exists():
        raise SystemExit(f"Error: {path} not found")
    issue = json.loads(path.read_text(encoding="utf-8"))
    subject = (issue.get("subject") or "").strip()
    if not subject:
        raise SystemExit(f"Error: {path.name} has no subject")
    return issue, render(issue), subject


def _strings(value, path):
    if isinstance(value, str):
        yield path, value
    elif isinstance(value, dict):
        for k, v in value.items():
            if not k.startswith("_"):
                yield from _strings(v, f"{path}.{k}")
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from _strings(v, f"{path}[{i}]")


def _fetch_status(url):
    import requests
    try:
        return requests.get(url, timeout=20, allow_redirects=True,
                            headers={"User-Agent": "pd-newsletter-linkcheck"}).status_code
    except requests.RequestException as exc:
        return f"error {type(exc).__name__}"


def links(html):
    return sorted({h for h in re.findall(r'href="([^"]+)"', html) if h != UNSUB_TAG})


def check_issue(issue, html, fetch=None):
    fetch = fetch or _fetch_status
    problems = []
    subject = (issue.get("subject") or "").strip()
    if not subject:
        problems.append("subject: missing")
    elif len(subject) > SUBJECT_MAX:
        problems.append(f"subject: {len(subject)} characters (max {SUBJECT_MAX})")

    for label, text in _strings(issue, "issue"):
        problems.extend(content_review.check_text(text, label, site="pd"))

    for f in electrolyte_dose_guard.check_text(html, "pd-newsletter", is_html=True):
        if not f.exemption:
            problems.append(f"dose guard: {f.family}: {f.detail} in: {f.snippet}")

    if UNSUB_TAG not in html:
        problems.append("unsubscribe: merge tag missing, the signed link would not be filled")

    for url in links(html):
        if not url.startswith(LINK_PREFIX):
            problems.append(f"link: {url} is not on {LINK_PREFIX}")
            continue
        bare = url.split("#", 1)[0].split("?", 1)[0]
        status = fetch(bare)
        if status != 200:
            problems.append(f"link: {bare} returned {status}")
    return problems


def sent_marker(issue_dir, date):
    return Path(issue_dir) / f"{date}.sent.json"


def already_sent(issue_dir, date):
    return sent_marker(issue_dir, date).exists()


def mark_sent(issue_dir, date, sent, failed):
    sent_marker(issue_dir, date).write_text(json.dumps({
        "date": date, "sent": sent, "failed": failed,
        "sent_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }, indent=2) + "\n")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: pd_newsletter_checks.py YYYY-MM-DD")
    issue, html, subject = load_issue(ISSUE_DIR, sys.argv[1])
    found = check_issue(issue, html)
    print(f"Subject: {subject}")
    for p in found:
        print(f"  FAIL {p}")
    print("OK, all checks pass" if not found else f"{len(found)} problem(s)")
    sys.exit(1 if found else 0)
