#!/usr/bin/env python3
"""
Mac-side automation heartbeat check (sprint task 4.2, 2026-07-04).

Covers the jobs GitHub can't see: the dashboard cron, the weekly scoreboard
cron, the three personal LaunchAgents, vault sync, and local log health.
GitHub-side automations (workflows, pin-queue commits, publish freshness) are
checked by the automation-staleness job in .github/workflows/weekly-health-check.yml.

Run: cron, Mondays 10:45 UTC (after the 10:30 scoreboard pass).
Alerts: emails iambrew@gmail.com via Resend ONLY when something is stale/dead
(the receipts-flow lesson: a log line nobody reads is not an alert).
Always appends one summary line to logs/heartbeat.log.
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
from datetime import date, datetime

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS = os.path.join(PROJECT_ROOT, 'logs')
SECRETS_PATH = os.path.join(PROJECT_ROOT, 'secrets', 'api-keys.json')
HOME = os.path.expanduser('~')

HOURS = 3600
DAYS = 24 * HOURS
NOW = time.time()

problems = []
notes = []


def age_of(path):
    """Seconds since last mtime, or None if missing."""
    try:
        return NOW - os.path.getmtime(path)
    except OSError:
        return None


def check(name, path, max_age, missing_is_dead=True):
    age = age_of(path)
    if age is None:
        if missing_is_dead:
            problems.append(f"{name}: log file missing entirely ({path}) — job may have never run")
        return
    if age > max_age:
        problems.append(f"{name}: no activity for {age / DAYS:.1f}d ({path})")
    else:
        notes.append(f"{name} ok ({age / HOURS:.0f}h)")


# 1. Dashboard cron (daily 10:00 UTC) — stale after 30h
check('dashboard-cron', os.path.join(LOGS, 'dashboard_update.log'), 30 * HOURS)

# 2. Scoreboard truth pass (Mondays 10:30 UTC) — stale after 8d.
#    Cron installed 2026-07-04; first run 2026-07-06, so tolerate a missing
#    log until 2026-07-08 to avoid a false alarm before the first fire.
if date.today() >= date(2026, 7, 8) or age_of(os.path.join(LOGS, 'scoreboard_truth_pass.log')) is not None:
    check('scoreboard-truth-pass', os.path.join(LOGS, 'scoreboard_truth_pass.log'), 8 * DAYS)

# 3. LaunchAgents: weekly/monthly report. Known failure mode (found Jul 4 2026):
#    process runs with exit code 0 but PermissionError lands in the error log,
#    so "error log newer than stdout log" = silently dead.
for label in ('weekly-report', 'monthly-report'):
    out_age = age_of(f'{HOME}/Library/Logs/{label}.log')
    err_age = age_of(f'{HOME}/Library/Logs/{label}-error.log')
    if err_age is not None and (out_age is None or err_age < out_age):
        problems.append(
            f"launchagent {label}: error log is newer than stdout log — "
            f"still failing (likely macOS Full Disk Access for launchd python3)")

# 4. Vault sync (fires every 10 min; known dead Jul 4 2026 with git 'fatal:' spam)
try:
    with open('/tmp/vault-sync.log') as f:
        tail = f.readlines()[-3:]
    if tail and any(line.startswith('fatal:') for line in tail):
        problems.append("launchagent vaultsync: last log lines are git 'fatal:' errors — sync dead "
                        "(sessions have been pushing the vault manually)")
except OSError:
    notes.append('vault-sync log missing (agent may be unloaded)')

# 5. Brew-Vault last commit age (backstop for #4 — is the vault actually reaching git?)
try:
    ts = subprocess.run(
        ['git', '-C', f'{HOME}/Documents/Brew-Vault', 'log', '-1', '--format=%ct'],
        capture_output=True, text=True, timeout=15).stdout.strip()
    if ts and NOW - int(ts) > 5 * DAYS:
        problems.append(f"Brew-Vault: last git commit {(NOW - int(ts)) / DAYS:.1f}d ago — vault not syncing")
except Exception as e:
    notes.append(f'vault git check skipped: {e}')

# 6. Unbounded log growth
cv = os.path.join(LOGS, 'commit_validation.log')
if os.path.exists(cv) and os.path.getsize(cv) > 20 * 1024 * 1024:
    problems.append(f"commit_validation.log is {os.path.getsize(cv) / 1024 / 1024:.0f}MB and unbounded — rotate it")


def send_alert(body):
    try:
        with open(SECRETS_PATH) as f:
            key = json.load(f)['resend']['key']
        req = urllib.request.Request(
            'https://api.resend.com/emails',
            data=json.dumps({
                'from': 'Carnivore Weekly <newsletter@carnivoreweekly.com>',
                'to': ['iambrew@gmail.com'],
                'subject': f'⚠️ Mac automation heartbeat: {len(problems)} problem(s)',
                'text': body,
            }).encode(),
            # Explicit UA: Cloudflare fronting api.resend.com 403s urllib's default (error 1010)
            headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json',
                     'User-Agent': 'cw-heartbeat/1.0'},
        )
        urllib.request.urlopen(req, timeout=30)
        return True
    except Exception as e:
        print(f'ALERT EMAIL FAILED: {e}', file=sys.stderr)
        return False


stamp = datetime.now().strftime('%Y-%m-%d %H:%M')
if problems:
    body = 'Mac-side automation heartbeat found problems:\n\n' + '\n'.join(f'- {p}' for p in problems) \
        + '\n\nHealthy: ' + ', '.join(notes) \
        + '\n\n(GitHub-side automations are checked separately by weekly-health-check.yml.)'
    sent = send_alert(body)
    summary = f"{stamp} HEARTBEAT: {len(problems)} PROBLEM(S) {'(emailed)' if sent else '(EMAIL FAILED)'}: " \
        + ' | '.join(problems)
else:
    summary = f"{stamp} HEARTBEAT: all clear ({'; '.join(notes)})"

print(summary)
with open(os.path.join(LOGS, 'heartbeat.log'), 'a') as f:
    f.write(summary + '\n')

sys.exit(0)
