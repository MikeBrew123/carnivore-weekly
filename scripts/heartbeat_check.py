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

# 1b. Command Center (daily 3:40 PT, moved off Actions 2026-08-28) — stale after 30h.
#     Nothing watched this job when it lived in Actions; Aug 27 ran 10h late and Aug 28
#     was dropped, both unnoticed. Never let it go unmonitored again.
check('command-center', os.path.join(LOGS, 'command_center.log'), 30 * HOURS)

# 2. Scoreboard truth pass (Mondays) — stale after 8d. Judged by the newest
#    snapshot file, not the cron log: since 2026-08 the pass is often run by a
#    Claude scheduled task instead of the 3:30am cron (Mac asleep), and those
#    runs never touch the cron log. The snapshot is the actual product.
_snapdir = f'{HOME}/Documents/Brew-Vault/04-Systems/Projects/Carnivore-Weekly/reports/scoreboard-snapshots'
try:
    _newest = max(os.path.join(_snapdir, p) for p in os.listdir(_snapdir) if p.endswith('.json'))
    check('scoreboard-truth-pass', _newest, 8 * DAYS)
except (OSError, ValueError):
    problems.append(f'scoreboard-truth-pass: no snapshots found in {_snapdir}')

# 3. LaunchAgents: monthly report. Known failure mode (found Jul 4 2026):
#    process runs with exit code 0 but PermissionError lands in the error log,
#    so "error log newer than stdout log" = silently dead. The max_stale guard
#    stops a disabled/retired job from alarming forever off ancient logs
#    (weekly-report retired 2026-07-13). A genuine silent failure is RECENT.
for label, max_stale in (('monthly-report', 40 * DAYS),):
    out_age = age_of(f'{HOME}/Library/Logs/{label}.log')
    err_age = age_of(f'{HOME}/Library/Logs/{label}-error.log')
    if err_age is not None and err_age < max_stale and (out_age is None or err_age < out_age):
        problems.append(
            f"launchagent {label}: error log is newer than stdout log — "
            f"still failing (likely macOS Full Disk Access for launchd python3)")

# 4. Vault sync (fires every 10 min). Judge by the newest DATED line: the
#    script logs FAIL on errors and (since 2026-08-05) OK on success, while
#    raw git stderr ('fatal: ...') lands undated between them. The old
#    check flagged any 'fatal:' in the tail, which kept alarming forever
#    after recovery because successes were silent.
try:
    with open('/tmp/vault-sync.log') as f:
        dated = [l.strip() for l in f.readlines()[-50:] if l[:2] == '20']
    last = dated[-1] if dated else ''
    if 'FAIL' in last:
        problems.append(f'launchagent vaultsync: latest run failed — {last}')
    elif last:
        notes.append('vault-sync ok')
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
