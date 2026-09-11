#!/usr/bin/env bash
# Resend quota alarm, GitHub side (Brew, deck 920ebe5a, approved 2026-09-10).
#
# Called by a workflow step when a send step set resend_quota_refused=true
# (see scripts/resend_quota.py). Opens one GitHub issue, or comments on the open
# one, with the refusal table. GitHub notifies Brew; nothing here uses Resend,
# so the alarm still works when the Resend quota is the thing that broke.
#
# The table holds subscriber ids, never email addresses: this repo is PUBLIC.
# The addresses are in Supabase `email_send_refusals`.
#
# Usage: scripts/resend_quota_alert.sh <alert-file> <label>
set -u

ALERT_FILE="${1:-${RUNNER_TEMP:-/tmp}/resend-quota-refusals.md}"
LABEL="${2:-send}"
TITLE="🚨 Resend quota refused email sends"
RUN_URL="${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}"
BODY_FILE="${RUNNER_TEMP:-/tmp}/resend-quota-issue-body.md"

{
  echo "Resend refused ${LABEL} emails on $(date -u +%F) because the account hit its sending quota (HTTP 429, daily or monthly). Those emails were NOT sent and were NOT retried."
  echo
  if [ -s "$ALERT_FILE" ]; then
    cat "$ALERT_FILE"
  else
    echo "(The refusal table was not written. Check the run log for RESEND QUOTA lines.)"
  fi
  echo
  echo "Full records, including the address for a hand re-send:"
  echo '`select * from email_send_refusals where resent_at is null order by refused_at desc;`'
  echo
  echo "Drip rows: current_day was not advanced, so the next daily run tries that day again on its own. Hand-send only if that run also fails, or the subscriber gets it twice."
  echo "Newsletter rows: nothing retries these. Re-send by hand if wanted, then set resent_at."
  echo
  echo "Run: $RUN_URL"
} > "$BODY_FILE"

EXISTING=$(gh issue list --state open --search "$TITLE in:title" --json number --jq '.[0].number' || true)
if [ -z "$EXISTING" ]; then
  gh issue create --title "$TITLE" --body-file "$BODY_FILE"
else
  gh issue comment "$EXISTING" --body-file "$BODY_FILE"
fi
