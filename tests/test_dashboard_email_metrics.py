#!/usr/bin/env python3
"""Command Center email metrics: the arithmetic, pinned.

WHY THIS EXISTS. The dashboard divided delivered by the LOCAL 'sent' event and
treated raw open/click events as rates. Only send_drip.py writes a local 'sent'
row while the Resend webhook writes 'delivered' for every send path, so the
denominator was structurally short: CW 7d rendered 339/215 = 158% delivery.
Bounce and complaint rate, the two numbers that actually predict a sending
reputation problem, were not computed at all.

These are PURE ARITHMETIC tests over synthetic event rows. No network, no
Supabase, no Resend, no email. compute_email_metrics() is the real function the
dashboard calls.

WHAT MUST NOT REGRESS:
  1. an incomplete 'sent' row cannot produce a delivery rate above 100%
  2. repeated opens of ONE message count once
  3. repeated clicks of ONE message count once
  4. fixture events leave EVERY metric, not just bounces
  5. bounce rate is bounced / attempts
  6. complaint rate is complained / delivered
  7. CW and KD stay separated
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'dashboard'))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))

from generate_command_center import compute_email_metrics  # noqa: E402
from subscriber_hygiene import is_undeliverable_fixture     # noqa: E402

checks, failures = 0, []


def check(group, name, ok, detail=''):
    global checks
    checks += 1
    if not ok:
        failures.append((group, name, detail))


def ev(site, event_type, rid, email='reader@domain.com'):
    return {'site': site, 'event_type': event_type, 'resend_id': rid, 'email': email}


# ── 1: the 158% bug. Plenty of 'sent' rows, far fewer than reality. ──────────
rows = [ev('cw', 'sent', f'm{i}') for i in range(3)]           # under-counted
rows += [ev('cw', 'delivered', f'm{i}') for i in range(10)]    # webhook truth
m = compute_email_metrics(rows, is_undeliverable_fixture)['cw']
check('1', 'attempts ignore the local sent row', m['attempts'] == 10, str(m['attempts']))
check('1', 'delivery rate is exactly 100, not 333', m['delivery_rate_pct'] == 100.0, str(m['delivery_rate_pct']))
check('1', 'delivery rate can never exceed 100', m['delivery_rate_pct'] <= 100, str(m['delivery_rate_pct']))

# ── 2 + 3: de-duplication by message id ─────────────────────────────────────
rows = [ev('cw', 'delivered', 'm1'), ev('cw', 'delivered', 'm2')]
rows += [ev('cw', 'opened', 'm1')] * 5          # one reader, one message, 5 opens
rows += [ev('cw', 'clicked', 'm1')] * 4         # same message, 4 clicks
m = compute_email_metrics(rows, is_undeliverable_fixture)['cw']
check('2', 'five opens of one message count once', m['unique_opened_messages'] == 1, str(m['unique_opened_messages']))
check('2', 'unique open rate is 1/2 = 50%, not 250%', m['unique_open_rate_pct'] == 50.0, str(m['unique_open_rate_pct']))
check('2', 'raw open events still visible separately', m['opened_events'] == 5, str(m['opened_events']))
check('3', 'four clicks of one message count once', m['unique_clicked_messages'] == 1, str(m['unique_clicked_messages']))
check('3', 'unique click rate is 50%, not 200%', m['unique_click_rate_pct'] == 50.0, str(m['unique_click_rate_pct']))
check('3', 'raw click events still visible separately', m['clicked_events'] == 4, str(m['clicked_events']))

# ── 4: fixtures leave EVERY metric, not just bounces ────────────────────────
FIX = 'qa-probe@example.com'          # matches the existing project rule
rows = [ev('kd', 'delivered', 'r1'), ev('kd', 'delivered', 'r2'), ev('kd', 'bounced', 'r3')]
rows += [ev('kd', 'opened', 'r1'), ev('kd', 'clicked', 'r1')]
# fixture traffic across every event type
rows += [ev('kd', 'delivered', 'f1', FIX), ev('kd', 'bounced', 'f2', FIX),
         ev('kd', 'opened', 'f1', FIX), ev('kd', 'clicked', 'f1', FIX),
         ev('kd', 'complained', 'f1', FIX)]
m = compute_email_metrics(rows, is_undeliverable_fixture)['kd']
check('4', 'fixture delivered excluded', m['delivered'] == 2, str(m['delivered']))
check('4', 'fixture bounce excluded', m['bounced'] == 1, str(m['bounced']))
check('4', 'fixture complaint excluded', m['complained'] == 0, str(m['complained']))
check('4', 'fixture opens excluded', m['unique_opened_messages'] == 1, str(m['unique_opened_messages']))
check('4', 'fixture clicks excluded', m['unique_clicked_messages'] == 1, str(m['unique_clicked_messages']))
check('4', 'attempts exclude fixtures', m['attempts'] == 3, str(m['attempts']))
check('4', 'exclusion is counted and reported', m['fixture_events_excluded'] == 5, str(m['fixture_events_excluded']))
# the trap: removing fixture bounces only would give 2/2 = 100% here
check('4', 'not flattered by one-sided exclusion', m['delivery_rate_pct'] == round(200/3, 2), str(m['delivery_rate_pct']))

# ── 5: bounce rate = bounced / attempts ─────────────────────────────────────
rows = [ev('cw', 'delivered', f'd{i}') for i in range(95)]
rows += [ev('cw', 'bounced', f'b{i}') for i in range(5)]
m = compute_email_metrics(rows, is_undeliverable_fixture)['cw']
check('5', 'attempts = delivered + bounced', m['attempts'] == 100, str(m['attempts']))
check('5', 'bounce rate = 5/100 = 5%', m['bounce_rate_pct'] == 5.0, str(m['bounce_rate_pct']))
check('5', 'delivery + bounce = 100%', m['delivery_rate_pct'] + m['bounce_rate_pct'] == 100.0,
      f"{m['delivery_rate_pct']}+{m['bounce_rate_pct']}")

# ── 6: complaint rate = complained / delivered (NOT attempts) ───────────────
rows = [ev('cw', 'delivered', f'd{i}') for i in range(50)]
rows += [ev('cw', 'bounced', f'b{i}') for i in range(50)]
rows += [ev('cw', 'complained', 'd0')]
m = compute_email_metrics(rows, is_undeliverable_fixture)['cw']
check('6', 'complaint rate uses delivered (1/50 = 2%)', m['complaint_rate_pct'] == 2.0, str(m['complaint_rate_pct']))
check('6', 'complaint rate is NOT 1/100', m['complaint_rate_pct'] != 1.0, str(m['complaint_rate_pct']))

# ── 7: brand separation ─────────────────────────────────────────────────────
rows = [ev('cw', 'delivered', 'c1'), ev('cw', 'delivered', 'c2'), ev('cw', 'bounced', 'c3')]
rows += [ev('kd', 'delivered', 'k1'), ev('kd', 'bounced', 'k2'), ev('kd', 'bounced', 'k3')]
res = compute_email_metrics(rows, is_undeliverable_fixture)
check('7', 'CW counted alone', res['cw']['attempts'] == 3 and res['cw']['delivered'] == 2,
      str(res['cw']['attempts']))
check('7', 'KD counted alone', res['kd']['attempts'] == 3 and res['kd']['delivered'] == 1,
      str(res['kd']['attempts']))
check('7', 'brands have different rates', res['cw']['delivery_rate_pct'] != res['kd']['delivery_rate_pct'],
      'rates identical')

# ── 8: empty cohort must not divide by zero ────────────────────────────────
m = compute_email_metrics([], is_undeliverable_fixture)['cw']
check('8', 'empty window yields None, not a crash', m['delivery_rate_pct'] is None, str(m['delivery_rate_pct']))
check('8', 'empty window attempts are 0', m['attempts'] == 0, str(m['attempts']))

print(f"\ndashboard-email-metrics: {checks - len(failures)}/{checks} checks passed")
for g, n, d in failures:
    print(f"  FAIL [{g}] {n}{' — ' + d if d else ''}")
sys.exit(1 if failures else 0)
