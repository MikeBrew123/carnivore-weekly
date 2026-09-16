#!/usr/bin/env python3
"""Executive layer for the Command Center (Command Centre 2.0, 2026-09-13).

Pure functions only — no network, no filesystem except parse_timeline(), which
reads two project-log files. Everything here turns the already-collected data
dict into the 60-second decision layer, and is unit-tested by
dashboard/test_command_center.py.

The one rule this module exists to enforce:

    FACT          what the measurement says
    INTERPRETATION  what it probably means
    ACTION        what, if anything, Brew should do

They are built separately, rendered separately, and never merged. Nothing here
invents a number: every interpretation string quotes the metric it came from,
and a movement whose sample is too small is marked directional rather than
being allowed to shout a percentage.

Email metric definitions are NOT redefined here. This module consumes the
corrected per-site block produced by compute_email_metrics() verbatim
(attempts = delivered + bounced over distinct resend_id; complaint and the two
unique rates over delivered; fixtures excluded from the whole cohort first).
"""

import os
import re
import subprocess
from datetime import date, datetime, timedelta, timezone

# ── Sample-size policy ───────────────────────────────────────────────
# A percentage on a tiny base is noise dressed as news. Below these bases a
# change is shown as "1 → 3 (+2). Low sample — directional only." and is never
# allowed to set the page status or produce an action.
MIN_SAMPLE = {
    'sessions': 40,      # GA4 sessions (observed or de-spiked)
    'clicks': 25,        # GSC / Bing organic clicks
    'calculator': 10,    # calculator starts
    'purchases': 8,      # purchase counts
    'revenue': 300.0,    # dollars
    'email': 100,        # email attempts
    'generic': 20,
}

# Evidence tiers. The dashboard's whole purpose is to stop a small number being
# read as a big signal, so sample weight is a first-class property of every
# figure rather than a footnote: 'thin' is rendered dimmed with no percentage,
# 'usable' plainly, 'solid' at full weight.
EVIDENCE_TIERS = ('thin', 'usable', 'solid')


def evidence(value, base='generic'):
    """Sample-confidence tier for a single figure."""
    floor = MIN_SAMPLE.get(base, MIN_SAMPLE['generic'])
    if value is None:
        return 'thin'
    if value >= floor * 4:
        return 'solid'
    if value >= floor:
        return 'usable'
    return 'thin'


STATUS_RANK = {'green': 0, 'blue': 1, 'amber': 2, 'red': 3}
STATUS_LABEL = {
    'green': ('🟢', 'Healthy'),
    'blue': ('🔵', 'Watching'),
    'amber': ('🟡', 'Needs attention'),
    'red': ('🔴', 'Action needed'),
}


def pct_change(cur, prev):
    if prev in (None, 0) or cur is None:
        return None
    return round((cur - prev) / prev * 100, 1)


def _fmt(v, unit):
    if v is None:
        return '—'
    if unit == 'money':
        return f'${v:,.2f}' if abs(v) < 1000 else f'${v:,.0f}'
    if unit == 'pct':
        return f'{v:.1f}%'
    return f'{v:,.0f}'


def delta(label, prev, cur, unit='count', base='generic', invert=False, note=None):
    """One movement, fact-only. `reliable` decides whether it may drive anything.

    reliable is False when BOTH periods are below the base for this metric —
    that is the "1 sale → 3 sales is not +200%" guard. `invert` marks metrics
    where up is bad (bounces, unsubscribes, average position).
    """
    if prev is None or cur is None:
        return None
    floor = MIN_SAMPLE.get(base, MIN_SAMPLE['generic'])
    reliable = max(prev, cur) >= floor
    chg = pct_change(cur, prev)
    absolute = cur - prev
    if unit == 'pct':
        # Points, not a percentage of a percentage.
        absolute = round(cur - prev, 1)
        chg = None
    direction = 'flat'
    if absolute > 0:
        direction = 'down' if invert else 'up'
    elif absolute < 0:
        direction = 'up' if invert else 'down'
    return {
        'label': label,
        'prev': prev, 'cur': cur,
        'prev_fmt': _fmt(prev, unit), 'cur_fmt': _fmt(cur, unit),
        'abs': absolute,
        'abs_fmt': ('+' if absolute > 0 else '') + _fmt(absolute, unit).replace('$-', '-$'),
        'pct': chg if reliable else None,
        'direction': direction,
        'reliable': reliable,
        'unit': unit,
        'evidence': evidence(max(prev, cur) if unit != 'pct' else floor, base),
        'base': base,
        'floor': floor,
        'note': note or (None if reliable else 'Low sample — directional only.'),
    }


def _day(daily, offset_from_end):
    """daily is [{'date','sessions','users'}...] ascending. Returns that row."""
    if not daily or len(daily) <= abs(offset_from_end):
        return None
    return daily[offset_from_end]


def complete_days(daily, today_iso):
    """Drop today's partial row so a partial day never faces a complete one."""
    return [r for r in (daily or []) if r.get('date') and r['date'] < today_iso]


# ── Signal vs noise ──────────────────────────────────────────────────

# What the cleaned number is, stated exactly, because the label has to match
# the method. Whole flagged days are dropped. Nothing identifies a bot at the
# session level, so this is NOT a count of humans and must never be called one.
CLEANED_LABEL = 'Cleaned trend sessions'
CLEANED_METHOD = ('whole days flagged by the 3x-median spike detector are excluded; '
                  'no per-session bot identification is performed, so this is a '
                  'de-spiked trend figure, not a count of humans')


def clean_traffic(t, today_iso):
    """Observed sessions vs a de-spiked trend figure for one site.

    Observed = what GA4 reports. Cleaned = complete days only, with entire
    flagged crawler-spike days removed (the existing detector in fetch_traffic
    is the source of that flag, unchanged). Removing a whole day is a blunt
    instrument: it also discards that day's real readers, and it does nothing
    about crawler traffic spread thinly across ordinary days. The two numbers
    are never blended into one headline.
    """
    if not t or t.get('error'):
        return None
    daily = complete_days(t.get('daily'), today_iso)
    spikes = {s['date'] for s in (t.get('spike_days') or [])}
    cur = daily[-7:] if len(daily) >= 7 else daily
    prev = daily[-14:-7] if len(daily) >= 14 else []
    obs_cur = sum(r['sessions'] for r in cur)
    obs_prev = sum(r['sessions'] for r in prev)
    cln_cur = sum(r['sessions'] for r in cur if r['date'] not in spikes)
    cln_prev = sum(r['sessions'] for r in prev if r['date'] not in spikes)
    excluded = sorted(spikes & {r['date'] for r in cur + prev})
    contaminated = bool(excluded) and obs_cur != cln_cur
    med = t.get('daily_median_28d', 0)
    return {
        'observed_7d': obs_cur, 'observed_prev_7d': obs_prev,
        'clean_7d': cln_cur, 'clean_prev_7d': cln_prev,
        'excluded_days': excluded,
        'contaminated': contaminated,
        'median_28d': med,
        'baseline_28d_7d': med * 7 if med else None,
        'today_so_far': (t.get('today') or {}).get('sessions'),
        'method': CLEANED_METHOD,
        'delta': delta(f'{CLEANED_LABEL} (7d)', cln_prev, cln_cur, base='sessions'),
        'observed_delta': delta('GA4 sessions as reported (7d)', obs_prev, obs_cur, base='sessions'),
        'dod': delta('Sessions yesterday vs day before',
                     (_day(daily, -2) or {}).get('sessions'),
                     (_day(daily, -1) or {}).get('sessions'), base='sessions'),
        'yesterday_date': (_day(daily, -1) or {}).get('date'),
    }


# ── Paid funnel (CW) ─────────────────────────────────────────────────
# Stage sources, and why each is labelled the way it is. A stage with no event
# behind it is declared, never estimated into existence.
FUNNEL_SPEC = [
    ('Calculator started', 'calculator_step1_viewed', 'measured', None),
    ('Free result reached', 'calculator_free_results', 'measured', None),
    ('Paid offer eligible', None, 'inferred',
     'No eligibility event exists. Everyone who reaches a free result is offered the '
     'paid report, so this equals the free-result stage by definition, not by measurement.'),
    ('Paid offer seen', 'calculator_offer_impression', 'measured',
     'Fires when the bridge card crosses 50% visibility.'),
    ('Payment modal opened', 'calculator_payment_modal_opened', 'measured',
     'Reachable from more than one control, so the CTA paths below are contributors to it, '
     'not a stage above it.'),
    ('Checkout started', 'begin_checkout', 'measured', None),
    ('Purchase', 'purchase', 'measured', 'Cross-checked against Stripe charges.'),
]

# CTA paths into the payment modal. They are shown as CONTRIBUTORS, never as a
# sequential stage: a session can reach the modal through any of them, so they
# overlap, and summing them would double-count. The 2026-09-13 run made this
# concrete — payment_modal_opened (10 sessions) exceeded bridge_cta_click (7),
# which is impossible if the bridge CTA is the only way in.
FUNNEL_BRANCHES = [
    ('Bridge CTA clicked', 'calculator_bridge_cta_click'),
    ('Upgrade button clicked', 'calculator_upgrade_click'),
    ('Meal-lock overlay clicked', 'calculator_lock_overlay_click'),
]


def build_funnel(events, window_days=28, stripe_purchases=None):
    """Sequential paid funnel from GA4 sessions-with-event.

    Sessions, not event counts, are the denominator: one reader clicking the
    bridge CTA four times is one engaged session, not four. Raw event counts
    are carried alongside so a large gap between them is visible rather than
    silently flattering the rate.

    Conversion is shown against the PREVIOUS stage, plus overall against the
    first stage. No stage may exceed the one above it without being flagged,
    because that means the stages are not sequential and the funnel is lying.
    """
    if not events or events.get('error'):
        return {'error': (events or {}).get('error', 'no event data')}
    by = events.get('by_event', {})
    stages, prev_n, first_n = [], None, None
    for name, ev, status, note in FUNNEL_SPEC:
        if status == 'inferred':
            # Inferred from the stage above. If that stage is itself unavailable
            # the inference has nothing to stand on, so this stage is declared
            # unavailable too rather than being filled with a zero.
            n = stages[-1]['sessions'] if stages else None
            raw = None
            if n is None:
                stages.append({'name': name, 'status': 'unavailable', 'sessions': None,
                               'events': None, 'from_prev_pct': None, 'from_start_pct': None,
                               'impossible': False, 'repeat_ratio': None,
                               'note': 'The stage this is inferred from is unavailable.'})
                continue
        else:
            rec = by.get(ev)
            if rec is None:
                stages.append({'name': name, 'status': 'unavailable', 'sessions': None,
                               'events': None, 'note': f'No {ev} data in this window.',
                               'from_prev_pct': None, 'from_start_pct': None,
                               'impossible': False})
                continue
            n, raw = rec['sessions'], rec['events']
        if first_n is None and n is not None:
            first_n = n
        impossible = bool(prev_n is not None and n is not None and n > prev_n and status != 'inferred')
        stages.append({
            'name': name, 'status': status, 'sessions': n, 'events': raw, 'note': note,
            'from_prev_pct': (round(n * 100 / prev_n, 1) if (prev_n and n is not None) else None),
            'from_start_pct': (round(n * 100 / first_n, 1) if (first_n and n is not None) else None),
            'impossible': impossible,
            'repeat_ratio': (round(raw / n, 1) if (raw and n) else None),
        })
        if n is not None:
            prev_n = n
    branches = []
    for label, ev in FUNNEL_BRANCHES:
        rec = by.get(ev)
        branches.append({'name': label, 'event': ev,
                         'sessions': rec['sessions'] if rec else None,
                         'events': rec['events'] if rec else None,
                         'status': 'measured' if rec else 'unavailable'})
    out = {'window_days': window_days, 'stages': stages, 'branches': branches,
           'branch_note': ('Overlapping entry points into the payment modal. They are not added '
                           'together and are not a funnel stage — one session can use any of '
                           'them.'),
           'source': 'GA4 sessions containing each event (CW property)'}
    # Biggest proportional drop between two measured, adequately-sampled stages.
    worst, worst_drop = None, 0
    for a, b in zip(stages, stages[1:]):
        if not a['sessions'] or b['sessions'] is None or a['sessions'] < 20:
            continue
        drop = a['sessions'] - b['sessions']
        if drop > worst_drop:
            worst_drop, worst = drop, (a, b)
    if worst:
        a, b = worst
        out['biggest_leak'] = {
            'from': a['name'], 'to': b['name'], 'lost': worst_drop,
            'kept_pct': b['from_prev_pct'],
            'text': (f'{a["name"]} → {b["name"]}: {a["sessions"]} → {b["sessions"]} sessions '
                     f'({b["from_prev_pct"]}% carried through, {worst_drop} lost).'),
        }
    if stripe_purchases is not None:
        ga_purchase = next((s['sessions'] for s in stages if s['name'] == 'Purchase'), None)
        out['purchase_crosscheck'] = {
            'ga4_sessions': ga_purchase, 'stripe_charges': stripe_purchases,
            'agrees': (ga_purchase == stripe_purchases),
        }
    return out


# ── Revenue ──────────────────────────────────────────────────────────
# Three distinct quantities, never conflated:
#   gross              what Stripe charged
#   after refunds      gross minus refunds. This is COLLECTED REVENUE. It is
#                      NOT net profit — it has had no processor fee, no COGS
#                      and no operating cost taken out of it.
#   net profit         unknown. No cost feed exists, so it is reported as
#                      UNAVAILABLE. The $1k/month target is a NET PROFIT
#                      target, so progress against it is unavailable too.
# The previous version divided collected revenue by the net-profit target and
# printed a percentage. That number could not be right and is gone.
NET_PROFIT_UNAVAILABLE = (
    'Net profit is not measured. No cost feed exists for processor fees, COGS, '
    'hosting or tooling, so the share of the $%.0f/month NET PROFIT target that '
    'has been earned is unknown. Revenue after refunds is an upper bound on it, '
    'never a substitute for it.')


def build_revenue(rev, target, today):
    if not rev or not rev.get('configured') or rev.get('error'):
        return {'unavailable': True, 'reason': (rev or {}).get('error') or 'Stripe not configured'}
    mtd = rev.get('mtd', {})
    d7, d30 = rev.get('last_7d', {}), rev.get('last_30d', {})
    y = rev.get('yesterday', {})
    charges_30 = d30.get('charges', 0)
    aov = round(d30.get('gross', 0) / charges_30, 2) if charges_30 else None
    return {
        'yesterday': y, 'last_7d': d7, 'last_30d': d30, 'mtd': mtd,
        'mtd_gross': mtd.get('gross', 0),
        'mtd_refunds': mtd.get('refunds', 0),
        # Deliberately named 'collected', not 'net'. Nothing downstream may
        # treat this as profit.
        'mtd_collected': mtd.get('net', 0),
        'collected_label': 'Revenue after refunds (collected)',
        'collected_basis': 'gross minus Stripe refunds. Processor fees, COGS and operating '
                           'costs are NOT deducted — this is money collected, not profit.',
        'target_net_profit': target,
        'net_profit_known': False,
        'net_profit_mtd': None,
        'target_pct': None,
        'target_status': 'unavailable',
        'target_note': NET_PROFIT_UNAVAILABLE % target,
        'pace_collected': (round(mtd.get('net', 0) / today.day * 30, 2) if today.day else None),
        'pace_label': 'Collected-revenue pace, not a profit pace',
        'aov_30d': aov,
        'aov_reliable': charges_30 >= MIN_SAMPLE['purchases'],
        'by_product_30d': rev.get('by_product_30d', {}),
        'purchases_30d': charges_30,
    }


# ── What changed ─────────────────────────────────────────────────────

def build_changes(d, today):
    """DoD and WoW movements, facts only, each already sample-size guarded."""
    today_iso = today.isoformat()
    dod, wow = [], []
    y = d.get('yesterday') or {}
    ry = (d.get('revenue') or {}).get('yesterday') or {}

    for site, lbl in (('cw', 'CW'), ('kd', 'KD')):
        ct = clean_traffic((d.get('traffic') or {}).get(site), today_iso)
        if ct:
            if ct['dod']:
                dod.append(dict(ct['dod'], label=f'{lbl} sessions'))
            if ct['delta']:
                wow.append(dict(ct['delta'], label=f'{lbl} {CLEANED_LABEL.lower()} (7d)'))
        g = (d.get('search') or {}).get(site) or {}
        if g.get('current') and g.get('previous'):
            wow.append(delta(f'{lbl} organic clicks (7d)', g['previous'].get('clicks'),
                             g['current'].get('clicks'), base='clicks'))
        fw = ((d.get('funnels') or {}).get(f'calculator_{site}') or {}).get('week') or {}
        if fw:
            wow.append(delta(f'{lbl} calculator starts (7d)', fw.get('previous'),
                             fw.get('current'), base='calculator'))
        nl = (d.get('funnels') or {}).get(f'newsletter_{site}') or {}
        if nl and not nl.get('error'):
            wow.append(delta(f'{lbl} newsletter signups (7d)', nl.get('new_prev_7d'),
                             nl.get('new_7d'), base='generic'))
        eng = (d.get('email_engagement') or {}).get(site) or {}
        prev = eng.get('previous_7d') or {}
        if eng.get('unique_open_rate_pct') is not None and prev.get('unique_open_rate_pct') is not None:
            wow.append(delta(f'{lbl} unique open rate', prev['unique_open_rate_pct'],
                             eng['unique_open_rate_pct'], unit='pct', base='email',
                             note=('Rate over delivered; %s attempts this week.'
                                   % eng.get('attempts', 0))))

    rev = d.get('revenue') or {}
    if rev.get('configured') and not rev.get('error'):
        d7, p7 = rev.get('last_7d', {}), rev.get('prev_7d', {})
        wow.append(delta('Revenue gross (7d)', p7.get('gross'), d7.get('gross'),
                         unit='money', base='revenue'))
        wow.append(delta('Purchases (7d)', p7.get('charges'), d7.get('charges'),
                         base='purchases'))
        if ry:
            dod.append(delta('Revenue yesterday', (rev.get('day_before') or {}).get('net'),
                             ry.get('net'), unit='money', base='revenue'))

    # Yesterday's Supabase counters have no stored prior day, so they are shown
    # as levels rather than fabricated as changes.
    levels = []
    for key, lbl in (('calc_sessions_cw', 'CW calculator starts'),
                     ('calc_sessions_kd', 'KD calculator starts'),
                     ('newsletter_signups_cw', 'CW newsletter signups'),
                     ('newsletter_signups_kd', 'KD newsletter signups')):
        if key in y:
            levels.append({'label': lbl, 'value': y[key]})
    return {'dod': [x for x in dod if x], 'wow': [x for x in wow if x],
            'yesterday_levels': levels, 'yesterday_date': y.get('date')}


# ── Do not overreact to ──────────────────────────────────────────────

def build_dont_overreact(d, changes, funnel, today_iso, limit=3):
    """Three things most likely to cause a bad decision today.

    Structural traps come first — a crawler-inflated week or a site too small
    to read percentages on will mislead every number on the page. Individual
    low-sample movements come second, because each one already carries its own
    inline warning in the What Changed cards.
    """
    structural, thin = [], []
    for site, lbl in (('cw', 'CW'), ('kd', 'KD')):
        ct = clean_traffic((d.get('traffic') or {}).get(site), today_iso)
        if not ct:
            continue
        if ct['excluded_days']:
            structural.append(
                f'{lbl}: {len(ct["excluded_days"])} crawler-spike day(s) '
                f'({", ".join(ct["excluded_days"])}) are excluded from the trend above. '
                f'The raw GA4 number is higher and does not mean more readers.')
        if ct['clean_7d'] < MIN_SAMPLE['sessions']:
            structural.append(
                f'{lbl} traffic is {ct["clean_7d"]} sessions a week. At that size a daily '
                f'percentage move is arithmetic, not a trend.')
    if funnel and not funnel.get('error'):
        for s in funnel['stages']:
            if s.get('repeat_ratio') and s['repeat_ratio'] >= 2 and (s['sessions'] or 0) < 20:
                structural.append(
                    f'{s["name"]}: {s["events"]} events came from only {s["sessions"]} '
                    f'sessions ({s["repeat_ratio"]}× repeats). The event count overstates '
                    f'how many people that is.')
                break
    for c in changes['dod'] + changes['wow']:
        if c and not c['reliable'] and c['abs'] != 0:
            thin.append(f'{c["label"]}: {c["prev_fmt"]} → {c["cur_fmt"]} ({c["abs_fmt"]}). '
                        f'Too few to carry a percentage — read the direction only.')
    return (structural + thin)[:limit]


# ── Needs attention (operational only) ───────────────────────────────
# A negative percentage is not a problem. Something belongs here only if Brew
# could reasonably act on it today.
def build_needs_attention(d, changes, today):
    items = []

    def add(sev, text, why=None):
        items.append({'severity': sev, 'text': text, 'why': why})

    for w in (d.get('automation') or {}).get('workflows', []):
        if w.get('state') == 'failure':
            add('red', f'GitHub workflow "{w["label"]}" failed its last run ({w.get("ran", "?")}).',
                'Automation stops silently; nothing else reports it.')
        elif w.get('state') == 'stale':
            add('red', f'GitHub workflow "{w["label"]}" has not run in {w.get("days_ago", "?")} days.',
                'A silent stall looks identical to a quiet week.')

    for src in d.get('data_quality', {}).get('sources', []):
        if src['state'] == 'failed':
            add('red', f'{src["label"]} data is unavailable this run — {src.get("detail", "fetch failed")}.',
                'Its numbers below are missing, not zero.')

    q = d.get('queues') or {}
    for site, lbl in (('cw', 'CW'), ('kd', 'KD')):
        s = q.get(site) or {}
        runway = s.get('runway_days')
        if s.get('ready') == 0:
            add('red', f'{lbl} blog queue is empty — the next scheduled publication is at risk.')
        elif runway is not None and runway < 3:
            add('amber', f'{lbl} blog queue holds {s["ready"]} post(s), about {runway} publishing '
                         f'day(s) left at the current cadence.')
    pin = q.get('pinterest') or {}
    if pin.get('unposted') == 0:
        add('amber', 'Pinterest queue is empty — posting has stopped.')

    for site, lbl in (('cw', 'CW'), ('kd', 'KD')):
        eng = (d.get('email_engagement') or {}).get(site) or {}
        att = eng.get('attempts', 0)
        if att < MIN_SAMPLE['email']:
            continue
        if (eng.get('bounce_rate_pct') or 0) >= 5:
            add('amber', f'{lbl} bounce rate is {eng["bounce_rate_pct"]}% of {att} attempts '
                         f'(threshold 5%).', 'Sustained bounces cost sender reputation.')
        if (eng.get('complaint_rate_pct') or 0) >= 0.1:
            add('red', f'{lbl} complaint rate is {eng["complaint_rate_pct"]}% of delivered '
                       f'(threshold 0.1%).', 'Above 0.1% mailbox providers start filtering.')
        if (eng.get('delivery_rate_pct') or 100) < 95:
            add('amber', f'{lbl} delivery rate is {eng["delivery_rate_pct"]}% of {att} attempts.')

    for site, lbl in (('cw', 'CW'), ('kd', 'KD')):
        drip = (d.get('funnels') or {}).get(f'drip_{site}') or {}
        if drip.get('active', 0) > 0 and drip.get('stalled_days') is not None and drip['stalled_days'] > 2:
            add('red', f'{lbl} drip has {drip["active"]} active subscribers and no send in '
                       f'{drip["stalled_days"]:.1f} days.')

    pf = d.get('paid_funnel') or {}
    if not pf.get('error'):
        st = {x['name']: x for x in pf.get('stages', [])}
        starts = (st.get('Checkout started') or {}).get('sessions')
        buys = (st.get('Purchase') or {}).get('sessions')
        if starts and buys is not None and starts >= MIN_SAMPLE['purchases']:
            conv = round(buys * 100 / starts, 1)
            if conv < 40:
                add('amber', f'CW checkout conversion is {conv}% — {buys} purchases from '
                             f'{starts} checkout starts over {pf.get("window_days", 28)} days.')
        for x in pf.get('stages', []):
            if x.get('impossible'):
                add('amber', f'Funnel stage "{x["name"]}" exceeds the stage above it. The stages '
                             f'are not sequential as drawn — the shape needs re-deriving, not '
                             f'the number believing.')

    seen, uniq = set(), []
    for it in items:
        if it['text'] not in seen:
            seen.add(it['text'])
            uniq.append(it)
    uniq.sort(key=lambda i: 0 if i['severity'] == 'red' else 1)
    return uniq


# ── Data quality ─────────────────────────────────────────────────────
# A failed API must never look like zero traffic or zero revenue.
SOURCE_SPEC = [
    ('ga4_cw', 'GA4 · Carnivore Weekly', ('traffic', 'cw')),
    ('ga4_kd', 'GA4 · KetoDial', ('traffic', 'kd')),
    ('gsc_cw', 'Search Console · CW', ('search', 'cw')),
    ('gsc_kd', 'Search Console · KD', ('search', 'kd')),
    ('bing_cw', 'Bing Webmaster · CW', ('search', 'bing_cw')),
    ('supabase', 'Supabase', ('funnels',)),
    ('stripe', 'Stripe', ('revenue',)),
    ('resend', 'Resend (email events)', ('email_engagement',)),
    ('etsy', 'Etsy snapshot', ('etsy',)),
    ('github', 'GitHub Actions', ('automation',)),
]


def build_data_quality(d, generated_at):
    sources = []
    for key, label, path in SOURCE_SPEC:
        node = d
        for p in path:
            node = (node or {}).get(p) if isinstance(node, dict) else None
        if node is None:
            state, detail = 'missing', 'not collected this run'
        elif isinstance(node, dict) and node.get('error'):
            state, detail = 'failed', str(node['error'])[:120]
        elif isinstance(node, dict) and node.get('configured') is False:
            state, detail = 'not-configured', 'no credentials on this machine'
        elif isinstance(node, dict) and node.get('absent'):
            state, detail = 'missing', 'no snapshot file yet'
        elif isinstance(node, dict) and node.get('configured') is None and 'error' in node:
            state, detail = 'failed', str(node['error'])[:120]
        else:
            state, detail = 'ok', None
        lag = None
        if key.startswith('gsc'):
            lag = 'Search Console lags ~2 days by design; the window ends 2 days ago.'
        if key == 'etsy' and isinstance(node, dict) and node.get('date'):
            detail = f'snapshot dated {node["date"]}'
        sources.append({'key': key, 'label': label, 'state': state,
                        'detail': detail, 'lag_note': lag, 'refreshed': generated_at})
    failed = [s for s in sources if s['state'] == 'failed']
    return {'sources': sources, 'failed': len(failed), 'generated_at': generated_at,
            'note': 'A source marked failed shows no number at all below. It is never rendered '
                    'as zero.'}


# ── Project-change timeline ──────────────────────────────────────────
HEADING_RE = re.compile(r'^##\s+(\d{4}-\d{2}-\d{2})\s*[—:–-]?\s*(.*)$')
# Only commits that plausibly change what a reader or buyer experiences. A
# tooling or hook fix cannot move organic clicks, and on the first live run the
# looser filter surfaced exactly that kind of commit as the "explanation".
DEPLOY_HINTS = ('deploy', 'launch', 'publish', 'price', 'offer', 'bridge', 'newsletter',
                'drip', 'checkout', 'paywall', 'cta', 'landing', 'homepage')
DEPLOY_EXCLUDE = ('test', 'hook', 'lint', 'ci(', 'chore', 'docs', 'refactor', 'typo',
                  'guard', 'workflow')


def parse_timeline(project_root, days=45, today=None, include_git=True):
    """Dated project changes from the project logs, newest first.

    Sources are files sessions already maintain — docs/project-log/decisions.md
    and current-status.md — plus git subjects. Nothing new to keep in sync.
    """
    today = today or date.today()
    cutoff = today - timedelta(days=days)
    events = []
    for rel, kind in (('docs/project-log/decisions.md', 'decision'),
                      ('docs/project-log/current-status.md', 'status')):
        path = os.path.join(project_root, rel)
        if not os.path.exists(path):
            continue
        try:
            with open(path, encoding='utf-8') as fh:
                for line in fh:
                    m = HEADING_RE.match(line.rstrip())
                    if not m:
                        continue
                    try:
                        when = date.fromisoformat(m.group(1))
                    except ValueError:
                        continue
                    if when < cutoff or when > today:
                        continue
                    events.append({'date': m.group(1), 'kind': kind,
                                   'title': m.group(2).strip()[:140], 'source': rel})
        except Exception:
            continue
    if include_git:
        try:
            raw = subprocess.run(
                ['git', '-C', project_root, 'log', f'--since={cutoff.isoformat()}',
                 '--date=short', '--pretty=%ad\t%s', '--no-merges'],
                capture_output=True, text=True, timeout=20).stdout
            for line in raw.splitlines():
                when, _, subject = line.partition('\t')
                if not subject or len(when) != 10:
                    continue
                low = subject.lower()
                if not any(h in low for h in DEPLOY_HINTS):
                    continue
                if any(x in low for x in DEPLOY_EXCLUDE):
                    continue
                events.append({'date': when, 'kind': 'commit',
                               'title': subject.strip()[:140], 'source': 'git'})
        except Exception:
            pass
    seen, uniq = set(), []
    for e in sorted(events, key=lambda x: x['date'], reverse=True):
        k = (e['date'], e['title'][:60].lower())
        if k in seen:
            continue
        seen.add(k)
        uniq.append(e)
    return uniq


def correlate(timeline, changes, today, min_age=2, max_age=14, limit=3):
    """Name project changes that PRECEDE a reliable metric movement.

    Two guards, both learned from the first live run: a change made today
    cannot explain a seven-day movement, so a candidate must be at least
    `min_age` days old; and a single change must not be pasted against every
    mover as if it explained each one, so movements are grouped under the one
    change and reported once.

    This is proximity in time and nothing more. A low-sample movement is never
    offered a cause at all.
    """
    movers = [c for c in changes.get('wow', []) if c and c['reliable']
              and c['pct'] is not None and abs(c['pct']) >= 20]
    if not movers or not timeline:
        return []
    candidates = []
    for e in timeline:
        try:
            age = (today - date.fromisoformat(e['date'])).days
        except ValueError:
            continue
        if min_age <= age <= max_age:
            candidates.append((age, e))
    if not candidates:
        return []
    # A decision or status entry is a change somebody deliberately recorded; a
    # commit subject is a guess. Prefer the curated ones, then the most recent.
    kind_rank = {'decision': 0, 'status': 1, 'commit': 2}
    candidates.sort(key=lambda x: (kind_rank.get(x[1]['kind'], 3), x[0]))
    age, change = candidates[0]
    return [{
        'change': change['title'],
        'change_date': change['date'],
        'days_before': age,
        'movements': [{'metric': c['label'],
                       'movement': f'{c["prev_fmt"]} → {c["cur_fmt"]} ({c["pct"]:+.0f}%)'}
                      for c in movers[:limit]],
        'kind': change['kind'],
        'other_candidates': len(candidates) - 1,
        'caveat': 'Correlation — not proven causation. These movements sit in the same window '
                  'as this change; nothing here establishes that it caused them.',
    }]


# ── Experiments ──────────────────────────────────────────────────────

def build_experiments(specs, events, today, min_impressions=100):
    """Protect a running experiment from being changed before it can be reviewed.

    THE START DATE. `started` is the first FULL CALENDAR DAY after the change
    shipped, never the ship date. GA4 is aggregated here by day, so a mid-day
    ship mixes pre-change and post-change traffic into one bucket that cannot
    be separated; that day is excluded outright rather than being counted and
    caveated. If `started` is still in the future the window has not opened and
    the panel says so instead of showing zeros as if they were a result.

    ATTRIBUTION. The denominator and numerator are the two events that define
    the experiment. The checkout and purchase counts are counted over the SAME
    TIME WINDOW and nothing more: this function has no session-level
    intersection, so it cannot and does not claim those sessions saw the bridge
    offer. They are labelled as same-window counts everywhere, and the verdict
    never says "purchases FROM these impressions". Do not relabel them as
    attributed without real session-intersection instrumentation.

    THE THRESHOLD. A minimum review threshold, not a proof threshold. Reaching
    it means the result is worth a human look; it is not a winner line, and
    this function never declares one.
    """
    out = []
    by = (events or {}).get('by_event', {}) if events and not events.get('error') else {}
    for spec in specs or []:
        try:
            started = date.fromisoformat(spec['started'])
        except Exception:
            continue
        days = (today - started).days + 1        # inclusive count of measured days
        not_open = started > today

        def since(event_name):
            rec = by.get(event_name)
            if not rec:
                return None
            return sum(r['sessions'] for r in rec.get('daily', [])
                       if r['date'] >= spec['started'])

        den = 0 if not_open else since(spec.get('denominator_event'))
        num = 0 if not_open else since(spec.get('numerator_event'))
        checkouts = 0 if not_open else since(spec.get('checkout_event') or 'begin_checkout')
        purchases = 0 if not_open else since(spec.get('outcome_event') or 'purchase')
        floor = spec.get('min_sample', min_impressions)

        if not_open:
            status = 'NOT STARTED — WINDOW OPENS ' + spec['started']
            verdict = (f'The revised offer shipped on '
                       f'{(spec.get("shipped") or "")[:10] or "the ship date"}, so that partial '
                       f'day is excluded. Measurement begins {spec["started"]} and no session '
                       f'has been counted yet.')
        elif den is None or num is None:
            status, verdict = 'NO DATA', 'The declared events returned nothing for this window.'
        elif den < floor:
            status = 'KEEP MEASURING — BELOW REVIEW THRESHOLD'
            verdict = (f'{den} of the {floor} sessions needed before this is even worth '
                       f'reviewing. Do not change the experiment yet.')
        else:
            rate = round(num * 100 / den, 1) if den else 0
            status = 'REVIEW ELIGIBLE'
            verdict = (f'{num} of {den} sessions that saw the offer engaged the bridge CTA '
                       f'({rate}%) over {days} day(s). The review threshold is met — that means '
                       f'look at it, not that it worked. Crossing {floor} is not a result.')
        out.append({
            'name': spec.get('name', 'unnamed'),
            'shipped': spec.get('shipped'),
            'shipped_ref': spec.get('shipped_ref'),
            'started': spec['started'],
            'start_rationale': spec.get('start_rationale'),
            'not_started': not_open,
            'days': max(0, days),
            'denominator_label': spec.get('denominator_label', spec.get('denominator_event')),
            'numerator_label': spec.get('numerator_label', spec.get('numerator_event')),
            'checkout_label': spec.get('checkout_label',
                                       'Checkout sessions in same measurement window'),
            'outcome_label': spec.get('outcome_label',
                                      'Purchase sessions in same measurement window'),
            'denominator': den, 'numerator': num, 'checkouts': checkouts, 'outcome': purchases,
            'min_sample': floor,
            'threshold_meaning': ('Minimum review threshold. Reaching it makes the result worth '
                                  'reading; it is not proof, not a winner, and not a decision.'),
            'attribution': ('Checkout and purchase counts are SAME-WINDOW totals for the whole '
                            'site, not outcomes attributed to this experiment. Nothing here '
                            'proves those sessions saw the bridge offer.'),
            'status': status, 'verdict': verdict,
            'rate_pct': (round(num * 100 / den, 1) if (den and num is not None) else None),
            'notes': spec.get('notes'),
        })
    return out


def build_what_matters(d, changes, funnel, revenue, attention, experiments, today_iso, limit=5):
    """The three to five things worth a minute this morning.

    Every item is a triple and the triple is never collapsed: FACT is a
    measurement and quotes its number, INTERPRETATION is why it might matter
    and is allowed to be wrong, ACTION is either one thing to do or an explicit
    "no action". Nothing reaches this list on the strength of a percentage
    alone — a movement must be reliable, or it must be operational.

    "Nothing requires intervention today" is a correct and complete answer.
    This function will not manufacture work to fill the space.
    """
    items = []

    def add(state, fact, interp, action, weight):
        items.append({'state': state, 'fact': fact, 'interpretation': interp,
                      'action': action, 'weight': weight})

    # 1. Operational breakage outranks everything: it is the only class where
    #    the action is unambiguous. Only RED is promoted here — amber items are
    #    rendered in the Needs attention panel beside this one, and repeating
    #    them would spend the most valuable space on the page saying the same
    #    thing twice.
    for it in attention:
        if it['severity'] == 'red':
            add('action', it['text'], it.get('why') or 'Automation and content pipelines fail '
                'silently here; nothing else reports them.',
                'Fix or acknowledge it today.', 0)

    # 2. Money. Yesterday is the question Brew opens the page asking.
    if revenue.get('unavailable'):
        add('action', f'Revenue is unavailable — {revenue.get("reason")}.',
            'A Stripe failure and a day with no sales look identical in a total, so the '
            'dashboard refuses to show either as zero.',
            'Re-run the dashboard before drawing any revenue conclusion.', 1)
    else:
        y = revenue['yesterday'].get('net', 0)
        n = revenue['yesterday'].get('charges', 0)
        if n:
            add('good', f'Yesterday brought ${y:,.2f} from {n} purchase(s).',
                f'Thirty-day collected revenue is ${revenue["last_30d"].get("net", 0):,.2f} '
                f'from {revenue["purchases_30d"]} purchases. At that volume a single sale '
                f'moves any percentage on this page.',
                'No action — one day is not a trend at this volume.', 2)
        else:
            add('watch', 'No purchases yesterday.',
                f'{revenue["purchases_30d"]} purchases in the last 30 days, so a zero day is '
                f'the normal case, not a signal.',
                'No action — keep measuring.', 4)

    # 3. Where the funnel leaks. Strategically the most actionable thing here.
    if funnel and not funnel.get('error') and funnel.get('biggest_leak'):
        leak = funnel['biggest_leak']
        add('watch', leak['text'],
            'This is the largest absolute loss in the measurable purchase journey, so a fix '
            'here has more leverage than anywhere below it.',
            'No action today — the stages beneath it are too thin to tell you what a fix '
            'would be worth.' if (funnel.get('stages') and
                                  any((s['sessions'] or 0) < 20 and s['status'] == 'measured'
                                      for s in funnel['stages'][-3:]))
            else 'Worth investigating why this stage loses so many.', 2)

    # 4. Reliable movements only. A big percentage on a thin base never gets here.
    movers = sorted([c for c in changes.get('wow', [])
                     if c and c['reliable'] and c['pct'] is not None and abs(c['pct']) >= 25],
                    key=lambda c: -abs(c['pct']))
    for c in movers[:2]:
        direction = 'up' if c['pct'] > 0 else 'down'
        add('watch' if direction == 'up' else 'action' if abs(c['pct']) >= 40 else 'watch',
            f'{c["label"]}: {c["prev_fmt"]} → {c["cur_fmt"]} ({c["pct"]:+.0f}%).',
            f'The sample is large enough to carry that percentage '
            f'({c["floor"]}+ needed, {max(c["prev"], c["cur"]):,.0f} present), so the movement '
            f'is real. Whether it persists is a different question.',
            'No action — confirm it holds next week before changing anything.', 3)

    # 5. A locked or unopened experiment is a standing instruction not to touch
    #    something. Checkout and purchase counts are deliberately NOT quoted
    #    here: they are same-window site totals, and putting them in the same
    #    sentence as the impressions would imply an attribution that does not
    #    exist.
    for e in (experiments or []):
        if e.get('not_started'):
            add('watch',
                f'{e["name"]}: measurement has not started. Window opens {e["started"]}.',
                f'The revision shipped part-way through {(e.get("shipped") or "")[:10]}, so that '
                f'day mixes pre- and post-change traffic and is excluded. Any earlier number for '
                f'this experiment was not a valid cohort.',
                'No action — do not change the bridge card before the window opens.', 1)
        elif 'KEEP MEASURING' in e['status']:
            add('watch',
                f'{e["name"]}: {e["numerator"]} of {e["denominator"]} sessions that saw the '
                f'offer engaged the CTA, against a {e["min_sample"]}-session review threshold.',
                'Below the review threshold, so the engagement rate cannot be read yet — '
                'and the threshold is a review gate, not a winner line.',
                'No action — do not change the bridge card, its copy or the price.', 2)

    order = {'action': 0, 'watch': 1, 'good': 2}
    items.sort(key=lambda i: (i['weight'], order.get(i['state'], 9)))
    if not items:
        return [{'state': 'good', 'fact': 'Nothing requires intervention today.',
                 'interpretation': 'No operational failure, no reliable adverse movement, and '
                                   'no experiment ready to read.',
                 'action': 'No action — keep measuring.', 'weight': 0}]
    return items[:limit]


# ── Executive brief ──────────────────────────────────────────────────

def build_executive(d, changes, funnel, revenue, attention, today_iso):
    """Status verdict + 3-6 plain sentences, every clause traceable to a number.

    Status is driven by operational reality (things that need doing), never by
    a metric being down: a soft week with nothing broken is Healthy.
    """
    status = 'green'
    for it in attention:
        rank = 'red' if it['severity'] == 'red' else 'amber'
        if STATUS_RANK[rank] > STATUS_RANK[status]:
            status = rank

    brief, means, watch, actions = [], [], [], []

    cw = clean_traffic((d.get('traffic') or {}).get('cw'), today_iso)
    kd = clean_traffic((d.get('traffic') or {}).get('kd'), today_iso)

    if cw:
        dl = cw['delta']
        word = ('softer than' if dl and dl['direction'] == 'down' and dl['reliable']
                else 'ahead of' if dl and dl['direction'] == 'up' and dl['reliable']
                else 'level with')
        clean_note = (' (whole flagged spike days excluded)' if cw['contaminated'] else '')
        brief.append(f'CW traffic is {word} last week: {cw["clean_prev_7d"]} → {cw["clean_7d"]} '
                     f'sessions on the cleaned trend{clean_note}.')
        if cw['contaminated']:
            means.append(f'CW raw GA4 reports {cw["observed_7d"]} sessions this week; '
                         f'{cw["clean_7d"]} remain once the flagged spike day(s) are dropped '
                         f'whole. The cleaned figure is the better trend read, but dropping a '
                         f'whole day also drops that day\'s real readers.')
    calc = next((c for c in changes['wow'] if c['label'] == 'CW calculator starts (7d)'), None)
    if calc:
        if calc['reliable'] and calc['pct'] is not None:
            brief.append(f'Calculator starts went {calc["prev_fmt"]} → {calc["cur_fmt"]} '
                         f'({calc["pct"]:+.0f}%), and that metric is server-side, so it is '
                         f'not crawler-inflated.')
        else:
            brief.append(f'Calculator starts: {calc["prev_fmt"]} → {calc["cur_fmt"]} '
                         f'({calc["abs_fmt"]}), too small a base to read as a trend.')

    if revenue.get('unavailable'):
        brief.append('Revenue is unavailable this run — Stripe did not answer, which is not the '
                     'same as no sales.')
    else:
        tgt = revenue['target_net_profit']
        brief.append(f'Revenue month-to-date is ${revenue["mtd_gross"]:,.2f} gross, '
                     f'${revenue["mtd_collected"]:,.2f} collected after refunds. Progress '
                     f'toward the ${tgt:,.0f}/month NET PROFIT target is unavailable: no cost '
                     f'feed exists, so profit is not measured.')
        if revenue['purchases_30d'] < MIN_SAMPLE['purchases']:
            means.append(f'{revenue["purchases_30d"]} purchases in 30 days is too few for any '
                         f'conversion percentage on this page to be stable.')

    if funnel and not funnel.get('error') and funnel.get('biggest_leak'):
        brief.append('Largest funnel drop-off: ' + funnel['biggest_leak']['text'])
        means.append('That drop is where a fix would have the most leverage, subject to the '
                     'sample sizes shown in the funnel.')

    eng_cw = (d.get('email_engagement') or {}).get('cw') or {}
    if eng_cw.get('attempts'):
        healthy = ((eng_cw.get('bounce_rate_pct') or 0) < 5
                   and (eng_cw.get('complaint_rate_pct') or 0) < 0.1)
        brief.append(f'Email is {"healthy" if healthy else "showing a deliverability problem"}: '
                     f'{eng_cw["delivery_rate_pct"]:.1f}% delivery on {eng_cw["attempts"]} CW '
                     f'attempts, {eng_cw["bounce_rate_pct"]:.1f}% bounce, '
                     f'{eng_cw["unique_open_rate_pct"]:.0f}% unique open rate.')

    if kd:
        brief.append(f'KD remains small: {kd["clean_7d"]} cleaned-trend sessions this week '
                     f'({kd["clean_prev_7d"]} last week).')

    if not attention:
        actions.append('Nothing needs intervention today.')
    else:
        for it in attention[:2]:
            actions.append(it['text'])

    for c in changes['wow']:
        if c['reliable'] and c['pct'] is not None and abs(c['pct']) >= 25:
            watch.append(f'{c["label"]}: {c["prev_fmt"]} → {c["cur_fmt"]} ({c["pct"]:+.0f}%). '
                         f'Confirm it holds next week before acting on it.')
    if funnel and not funnel.get('error'):
        for s in funnel['stages']:
            if s['status'] == 'measured' and s['sessions'] is not None and 0 < s['sessions'] < 10:
                watch.append(f'{s["name"]} is only {s["sessions"]} sessions — every downstream '
                             f'rate built on it is provisional.')
                break

    icon, word = STATUS_LABEL[status]
    return {
        'status': status, 'status_icon': icon, 'status_label': word,
        'brief': brief[:6],
        'what_this_means': means[:5],
        'what_id_watch': watch[:3],
        'suggested_action': actions[:2],
        'generated_by': 'deterministic rules',
    }


# ── What people are telling us (calculator answers + drip poll answers) ──
# Added 2026-09-16. Pure: the fetcher hands in rows, this returns numbers.
#
# Counting rules, because the raw tables overstate engagement:
#   - A poll RESPONDENT is one person answering one day's check-in. The response
#     table stores one row per ticked option, and day-2-style check-ins carry four
#     questions, so one reader can write six rows. Rows are never shown as people.
#   - A person is subscriber_id when the answer came from an email link, else the
#     browser fingerprint. Anonymous visitors cannot be de-duplicated any better.
#   - Weeks are Monday-start. The current week is partial and flagged; WoW and MoM
#     use rolling 7 and 30 day windows ending today, never the partial week.
#   - An answer-mix shift is only given in points when BOTH periods clear the
#     generic floor. Otherwise it is counts only, "too few to call".

VOICE_WEEKS = 8
VOICE_GOAL_WEIGHT_SINCE = '2026-09-16'
VOICE_MIX_FIELDS = (('goal', 'Goal'), ('diet_type', 'Diet type'),
                    ('age_band', 'Age'), ('sex', 'Sex'))


def _age_band(age):
    try:
        a = int(age)
    except (TypeError, ValueError):
        return None
    for lo, hi, name in ((0, 34, 'under 35'), (35, 44, '35-44'), (45, 54, '45-54'),
                         (55, 64, '55-64'), (65, 200, '65+')):
        if lo <= a <= hi:
            return name
    return None


def _d(ts):
    try:
        return date.fromisoformat(str(ts)[:10])
    except (TypeError, ValueError):
        return None


def _person(r):
    return r.get('subscriber_id') or r.get('fingerprint') or r.get('id')


def _mix(rows, field):
    counts = {}
    for r in rows:
        v = r.get(field)
        v = str(v).strip().lower() if v not in (None, '') else None
        if v:
            counts[v] = counts.get(v, 0) + 1
    return counts, sum(counts.values())


def _mix_compare(cur_rows, prev_rows, field):
    cur, n_cur = _mix(cur_rows, field)
    prev, n_prev = _mix(prev_rows, field)
    floor = MIN_SAMPLE['generic']
    reliable = n_cur >= floor and n_prev >= floor
    out = []
    for v in sorted(set(cur) | set(prev), key=lambda k: (-cur.get(k, 0), -prev.get(k, 0))):
        c, p = cur.get(v, 0), prev.get(v, 0)
        cp = round(c * 100 / n_cur, 1) if n_cur else None
        pp = round(p * 100 / n_prev, 1) if n_prev else None
        out.append({'value': v, 'cur_n': c, 'prev_n': p, 'cur_pct': cp, 'prev_pct': pp,
                    'pts': round(cp - pp, 1) if reliable and cp is not None and pp is not None
                    else None})
    return {'n_cur': n_cur, 'n_prev': n_prev, 'reliable': reliable, 'values': out}


def build_voice(calc_rows, survey_rows, view_rows, questions, options, today):
    """Per-site trends for calculator answers and drip check-in answers.

    calc_rows:   calculator_sessions_v2 rows with site ('cw'|'kd'), created_at,
                 step_completed, sex, age, goal, diet_type. Test emails already removed.
    survey_rows: drip_survey_responses rows (site, day, question_id, option_id,
                 subscriber_id, fingerprint, submitted_at, answered_via).
    view_rows:   drip_survey_views rows (site, fingerprint, created_at).
    questions:   drip_survey_questions rows (id, site, day, question_key, question_text, active).
    options:     drip_survey_options rows (id, question_id, option_text, display_order).
    """
    week0 = today - timedelta(days=today.weekday())
    weeks = [week0 - timedelta(weeks=i) for i in range(VOICE_WEEKS - 1, -1, -1)]

    def in_window(d, days, offset=0):
        end = today - timedelta(days=offset)
        return d is not None and end - timedelta(days=days - 1) <= d <= end

    qmap = {q['id']: q for q in questions or []}
    omap = {o['id']: o for o in options or []}
    out = {}
    for site in ('cw', 'kd'):
        calc = [dict(r, _d=_d(r.get('created_at')), age_band=_age_band(r.get('age')))
                for r in calc_rows or [] if r.get('site') == site]
        surv = [dict(r, _d=_d(r.get('submitted_at'))) for r in survey_rows or []
                if r.get('site') == site]
        views = [dict(r, _d=_d(r.get('created_at'))) for r in view_rows or []
                 if r.get('site') == site]

        def done(rows):
            return [r for r in rows if (r.get('step_completed') or 0) >= 3]

        def respondents(rows):
            return len({(_person(r), r.get('day')) for r in rows})

        weekly = []
        for w in weeks:
            wc = [r for r in calc if r['_d'] and w <= r['_d'] < w + timedelta(days=7)]
            ws = [r for r in surv if r['_d'] and w <= r['_d'] < w + timedelta(days=7)]
            weekly.append({'week_start': w.isoformat(), 'partial': w == week0,
                           'calc_starts': len(wc), 'calc_completed': len(done(wc)),
                           'poll_respondents': respondents(ws)})

        def period(days, offset):
            c = [r for r in calc if in_window(r['_d'], days, offset)]
            s = [r for r in surv if in_window(r['_d'], days, offset)]
            v = [r for r in views if in_window(r['_d'], days, offset)]
            return c, s, v

        trends = {}
        for key, days in (('wow', 7), ('mom', 30)):
            c1, s1, v1 = period(days, 0)
            c0, s0, v0 = period(days, days)
            trends[key] = [
                delta('Calculator starts', len(c0), len(c1), base='calculator'),
                delta('Calculator completions', len(done(c0)), len(done(c1)), base='calculator'),
                delta('Check-in respondents', respondents(s0), respondents(s1)),
                delta('Check-in page views', len(v0), len(v1)),
            ]

        c30, s30, _ = period(30, 0)
        c60, s60, _ = period(30, 30)
        mix = {label: _mix_compare(done(c30), done(c60), field)
               for field, label in VOICE_MIX_FIELDS}

        qrows = {}
        for side, r in [('cur', x) for x in s30] + [('prev', x) for x in s60]:
            q = qmap.get(r.get('question_id'))
            if not q:
                continue
            e = qrows.setdefault(q['id'], {'day': q.get('day'), 'key': q.get('question_key'),
                                           'text': q.get('question_text'),
                                           'active': q.get('active'),
                                           'cur_people': set(), 'prev_people': set(),
                                           'cur_opts': {}, 'prev_opts': {}})
            e[f'{side}_people'].add(_person(r))
            label = (omap.get(r.get('option_id')) or {}).get('option_text') or '(unknown option)'
            e[f'{side}_opts'][label] = e[f'{side}_opts'].get(label, 0) + 1
        qlist = []
        for e in qrows.values():
            n_cur, n_prev = len(e['cur_people']), len(e['prev_people'])
            top = sorted(e['cur_opts'].items(), key=lambda x: -x[1])[:3]
            qlist.append({'day': e['day'], 'key': e['key'], 'text': e['text'],
                          'active': e['active'],
                          'respondents_30d': n_cur, 'respondents_prev_30d': n_prev,
                          'top_answers': [{'answer': a, 'count': n} for a, n in top],
                          'thin': max(n_cur, n_prev) < MIN_SAMPLE['generic']})
        qlist.sort(key=lambda q: (q['day'] if q['day'] is not None else 99, q['key'] or ''))

        # Goal weight vs chosen goal (recorded from 2026-09-16). A gain goal with a
        # lower goal weight, or a lose goal with a higher one, means the reader
        # probably picked the wrong goal. 2 lb of slack so rounding is not a flag.
        since = date.fromisoformat(VOICE_GOAL_WEIGHT_SINCE)
        asked = [r for r in done(c30) if r.get('goal') in ('lose', 'gain')
                 and r['_d'] and r['_d'] >= since]
        gw = {'asked_30d': len(asked), 'given_30d': 0, 'gain_below_current': 0,
              'lose_above_current': 0, 'recording_since': VOICE_GOAL_WEIGHT_SINCE}
        for r in asked:
            try:
                target = float(r.get('goal_weight_lb'))
                current = float(r.get('weight_value'))
            except (TypeError, ValueError):
                continue
            if str(r.get('weight_unit') or '').lower().startswith('kg'):
                current *= 2.20462
            gw['given_30d'] += 1
            if r['goal'] == 'gain' and target < current - 2:
                gw['gain_below_current'] += 1
            elif r['goal'] == 'lose' and target > current + 2:
                gw['lose_above_current'] += 1
        gw['mismatched_30d'] = gw['gain_below_current'] + gw['lose_above_current']

        out[site] = {'weekly': weekly, 'trends': trends, 'mix': mix, 'questions': qlist,
                     'goal_weight': gw,
                     'calc_completed_30d': len(done(c30)),
                     'respondents_30d': respondents(s30)}
    return out
