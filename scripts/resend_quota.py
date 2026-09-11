#!/usr/bin/env python3
"""Resend quota alarm: record every quota refusal and raise the alarm.

Why this exists (Brew, deck 920ebe5a, approved 2026-09-10: "watch it with a
429 alarm, do not pay yet"). Resend's free tier caps the account at 100 emails
a day. Sunday is the only day the newsletter and the drip both fire, and those
Sundays have already gone over (128 on 2026-09-06). Resend has not enforced it
yet. When it does, the refusal comes back as HTTP 429 with one of these names
(https://resend.com/docs/api-reference/errors):

    daily_quota_exceeded     "You have exceeded your daily email sending quota."
    monthly_quota_exceeded   "You have exceeded your monthly email sending quota."

A 429 named rate_limit_exceeded is the ~2 requests/second throttle, which the
send scripts already back off and retry. That path is left exactly as it was.

What happens on a quota refusal:
  1. The send is NOT retried. A quota does not clear in seconds, and nothing
     here ever re-sends to a subscriber on its own.
  2. A row goes into Supabase `email_send_refusals` (site, list, subscriber id,
     email, template or drip day, subject, time, Resend's error), so the email
     can be re-sent by hand later.
  3. The alarm: a line goes into $RUNNER_TEMP/resend-quota-refusals.md and the
     step output resend_quota_refused=true is set. The workflow turns that into
     a GitHub issue (scripts/resend_quota_alert.sh) and a red run. Neither path
     touches Resend, so the alarm still works when the quota is the problem.

The alert file feeds an issue on a PUBLIC repo, so it carries subscriber ids,
never email addresses. The address lives only in the private Supabase row.

Tested by tests/test_resend_quota_alarm.py (mocked, no network).
"""

import json
import os
import sys
from datetime import datetime, timezone

import requests

import send_guard

QUOTA_ERROR_NAMES = ("daily_quota_exceeded", "monthly_quota_exceeded")
TABLE = "email_send_refusals"
OUTPUT_KEY = "resend_quota_refused"
ALERT_FILE_NAME = "resend-quota-refusals.md"


class QuotaRefused(str):
    """A send result that is a quota refusal. It is still a plain string, so
    every existing caller that prints or slices the failure detail keeps working."""

    def __new__(cls, error_name, message=""):
        obj = super().__new__(
            cls, f"429 {error_name}: Resend refused this send over quota (recorded, not retried)")
        obj.error_name = error_name
        obj.message = message or ""
        return obj


def response_body(resp):
    """Resend's error body as a dict when it is JSON, else the raw text."""
    try:
        return resp.json()
    except Exception:
        return getattr(resp, "text", "") or ""


def quota_error_name(status_code, body):
    """Return Resend's error name when this response is a quota refusal, else None.

    Only a 429 can be one. The documented names are matched first; a 429 whose
    message mentions a quota is also treated as one, so a renamed error still
    fires the alarm instead of being retried as a rate limit.
    """
    if status_code != 429:
        return None
    data = body
    if isinstance(body, str):
        try:
            data = json.loads(body)
        except ValueError:
            data = {}
    if not isinstance(data, dict):
        data = {}
    name = data.get("name")
    if name in QUOTA_ERROR_NAMES:
        return name
    message = str(data.get("message") or (body if isinstance(body, str) else ""))
    if "quota" in message.lower():
        return name or "quota_exceeded"
    return None


def _run_url():
    server, repo, run = (os.environ.get(k) for k in
                         ("GITHUB_SERVER_URL", "GITHUB_REPOSITORY", "GITHUB_RUN_ID"))
    return f"{server}/{repo}/actions/runs/{run}" if server and repo and run else None


def alert_file_path():
    explicit = os.environ.get("RESEND_QUOTA_ALERT_FILE")
    if explicit:
        return explicit
    temp = os.environ.get("RUNNER_TEMP")
    return os.path.join(temp, ALERT_FILE_NAME) if temp else None


def _insert_row(secrets, row):
    """Write the refusal to Supabase. Returns (ok, detail)."""
    sb = (secrets or {}).get("supabase") or {}
    url, key = (sb.get("url") or "").rstrip("/"), sb.get("service_role_key")
    if not url or not key:
        return False, "no Supabase credentials"
    try:
        resp = requests.post(
            f"{url}/rest/v1/{TABLE}",
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=row,
            timeout=15,
        )
    except Exception as e:
        return False, str(e)[:120]
    if 200 <= resp.status_code < 300:
        return True, ""
    return False, f"HTTP {resp.status_code} {str(getattr(resp, 'text', ''))[:120]}"


def _raise_alarm(line):
    """Append to the alert file and flag the step output. Neither touches Resend."""
    path = alert_file_path()
    if path:
        try:
            new = not os.path.exists(path)
            with open(path, "a", encoding="utf-8") as f:
                if new:
                    f.write("| refused at (UTC) | site | list | subscriber id | template | Resend error | saved to Supabase |\n")
                    f.write("|---|---|---|---|---|---|---|\n")
                f.write(line + "\n")
        except OSError as e:
            print(f"  RESEND QUOTA ALERT FILE NOT WRITTEN ({path}): {e}")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        try:
            with open(output, "a", encoding="utf-8") as f:
                f.write(f"{OUTPUT_KEY}=true\n")
        except OSError as e:
            print(f"  RESEND QUOTA STEP OUTPUT NOT WRITTEN: {e}")


def record_refusal(secrets, *, site, list_name, subscriber_id, email, template,
                   subject, error_name, error_message="", status_code=429, notes=None):
    """Record one quota refusal durably and raise the alarm. Never re-sends.

    Returns True when the Supabase row was written. The alarm fires either way,
    and the alert line says whether the row made it.
    """
    if not send_guard.allow(f"record a Resend quota refusal for {list_name} {template} to {email}"):
        return False
    refused_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    row = {
        "refused_at": refused_at,
        "site": site,
        "list_name": list_name,
        "subscriber_id": subscriber_id,
        "email": email,
        "template": template,
        "subject": subject,
        "http_status": status_code,
        "error_name": error_name,
        "error_message": (error_message or "")[:500],
        "notes": notes,
        "run_url": _run_url(),
    }
    ok, detail = _insert_row(secrets, row)
    if not ok:
        print(f"  RESEND QUOTA REFUSAL NOT SAVED TO SUPABASE ({detail}). "
              f"Full record for a hand re-send: {json.dumps(row)}")
    _raise_alarm(f"| {refused_at} | {site} | {list_name} | {subscriber_id or 'unknown'} | "
                 f"{template} | {error_name} | {'yes' if ok else 'NO, see run log'} |")
    # A GitHub annotation on the run page. Subscriber id only: this repo is public.
    print(f"::error title=Resend quota refusal::{site} {list_name} {template} to subscriber "
          f"{subscriber_id or 'unknown'} refused ({error_name})")
    sys.stdout.flush()
    return ok
