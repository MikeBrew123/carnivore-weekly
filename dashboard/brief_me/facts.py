"""Turn the Command Center snapshot, the CEO brief and the calendar into facts.

A fact is one thing the episode could say, with the exact value behind it and
the JSON path it came from. The script writer may only use numbers that appear
in the facts a slide cites; `validate_script` in lenses.py enforces that.

Every fact carries:
    id          stable key, used to judge novelty across episodes
    area        which slide family it belongs to
    lenses      which storytelling angles it can serve
    text        a plain sentence with the real numbers in it
    value       the comparable number (or None for text-only facts)
    importance  0..1, how much it matters regardless of novelty
    source      where the number came from
    series      optional list of numbers for a chart
"""

import re

AREAS = ['traffic', 'search', 'etsy', 'money', 'funnel', 'email',
         'customers', 'ketodial', 'pescodial']

EMAIL_RE = re.compile(r'[\w.+-]+@[\w-]+\.[\w.-]+')


def _fact(facts, id, area, lenses, text, value=None, importance=0.5,
          source='', series=None, labels=None, caveat=None, viz=None, site=None):
    f = {'id': id, 'area': area, 'lenses': list(lenses), 'text': text,
         'value': value, 'importance': round(float(importance), 2),
         'source': source}
    if series:
        f['series'] = series
        f['labels'] = labels or []
    if caveat:
        f['caveat'] = caveat
    if viz:
        f['viz'] = viz
    if site:
        f['site'] = site
    facts.append(f)


def _pct(change):
    return 'flat' if change is None else f'{change:+.1f}%'


def _short_url(url):
    return re.sub(r'^https?://[^/]+', '', url or '') or '/'


def _chg(cur, prev):
    """Percent change as text, or None when there is no base to compare."""
    if not prev:
        return None
    return f'{(cur - prev) / prev * 100:+.0f}%'


def _anon(text, limit=160):
    text = EMAIL_RE.sub('[email]', text or '').strip()
    text = re.sub(r'\s+', ' ', text)
    return text if len(text) <= limit else text[:limit].rsplit(' ', 1)[0] + '...'


def _traffic(d, facts):
    t = d.get('traffic') or {}
    cw = t.get('cw') or {}
    clean = cw.get('week_ex_spike')
    if clean:
        _fact(facts, 'traffic.cw.week_clean', 'traffic', ['trend'],
              f"CW sessions on the cleaned trend: {clean['previous']} last week, "
              f"{clean['current']} this week ({_pct(clean.get('change_pct'))}), "
              f"crawler-spike days excluded: {', '.join(clean.get('excluded') or []) or 'none'}.",
              value=clean['current'], importance=0.6,
              source='traffic.cw.week_ex_spike',
              series=[r['sessions'] for r in cw.get('daily', [])[-28:]],
              labels=[r['date'][5:] for r in cw.get('daily', [])[-28:]],
              caveat='Raw GA4 includes crawler bursts; Google clicks are the steadier read.',
              site='cw', viz={'type': 'line', 'excluded': [x[5:] for x in clean.get('excluded') or []]})
    pages = cw.get('top_pages_7d') or []
    if pages:
        p = pages[0]
        _fact(facts, 'traffic.cw.top_page', 'traffic', ['spotlight', 'mover'],
              f"Most viewed CW page this week: {p['page']} with {p['views']} views.",
              value=p['views'], importance=0.4, source='traffic.cw.top_pages_7d[0]')
    srcs = cw.get('sources_7d') or []
    organic = next((s for s in srcs if s['source'] == 'google / organic'), None)
    if organic:
        _fact(facts, 'traffic.cw.organic', 'traffic', ['quiet_win', 'trend'],
              f"Google organic sent {organic['sessions']} CW sessions in the last 7 days.",
              value=organic['sessions'], importance=0.4, source='traffic.cw.sources_7d')
    spikes = cw.get('spike_days') or []
    if spikes:
        _fact(facts, 'traffic.cw.spikes', 'traffic', ['mover'],
              f"{len(spikes)} crawler-spike day(s) in the last 28 days on CW; they are excluded, not readers.",
              value=len(spikes), importance=0.25, source='traffic.cw.spike_days')
    sites = []
    for key, name in (('cw', 'CW'), ('kd', 'KD'), ('pd', 'PD')):
        wk = ((t.get(key) or {}).get('week') or {}).get('sessions')
        if wk:
            sites.append((name, int(wk['current'])))
    if len(sites) >= 2:
        _fact(facts, 'traffic.head_to_head', 'traffic', ['head_to_head'],
              'Raw sessions this week: ' + ', '.join(f'{n} {v}' for n, v in sites) + '.',
              value=sum(v for _, v in sites), importance=0.45,
              source='traffic.*.week.sessions',
              series=[v for _, v in sites], labels=[n for n, _ in sites],
              viz={'type': 'bars', 'sites': [n.lower() for n, _ in sites]})
    rows = []
    srch = d.get('search') or {}
    for key in ('cw', 'kd', 'pd'):
        wk = ((t.get(key) or {}).get('week') or {}).get('sessions')
        if wk:
            rows.append({'metric': 'Sessions', 'site': key, 'cur': int(wk['current']), 'prev': int(wk['previous'])})
    for key in ('cw', 'kd', 'pd'):
        c, p = (srch.get(key) or {}).get('current'), (srch.get(key) or {}).get('previous')
        if c and p:
            rows.append({'metric': 'Google clicks', 'site': key, 'cur': c['clicks'], 'prev': p['clicks']})
            rows.append({'metric': 'Impressions', 'site': key, 'cur': c['impressions'], 'prev': p['impressions']})
    if rows:
        _fact(facts, 'traffic.wow', 'traffic', ['head_to_head', 'mover'],
              'Week over week: ' + '; '.join(
                  f"{r['site'].upper()} {r['metric'].lower()} {r['cur']} vs {r['prev']}"
                  + (f" ({_chg(r['cur'], r['prev'])})" if _chg(r['cur'], r['prev']) else ' (new)')
                  for r in rows) + '.',
              value=len(rows), importance=0.45, source='traffic/search *.week',
              viz={'type': 'wow', 'rows': rows})


def _search(d, facts):
    s = d.get('search') or {}
    cw = s.get('cw') or {}
    cur, prev = cw.get('current'), cw.get('previous')
    if cur and prev:
        _fact(facts, 'search.cw.clicks', 'search', ['trend'],
              f"Google clicks to CW ({cw.get('window', '')}): {cur['clicks']} vs {prev['clicks']} the week before; "
              f"impressions {cur['impressions']} vs {prev['impressions']}. "
              f"Clicks {_chg(cur['clicks'], prev['clicks'])}, impressions {_chg(cur['impressions'], prev['impressions'])}.",
              value=cur['clicks'], importance=0.65, source='search.cw.current/previous',
              series=[prev['clicks'], cur['clicks']], labels=['prev wk', 'this wk'],
              site='cw', viz={'type': 'bars'})
        _fact(facts, 'search.cw.ctr', 'search', ['quiet_win', 'trend'],
              f"CW click-through rate {cur['ctr']}% (was {prev['ctr']}%), average position {cur['position']} (was {prev['position']}).",
              value=cur['ctr'], importance=0.4, source='search.cw.current.ctr')
    pages = cw.get('top_pages') or []
    if pages:
        p = pages[0]
        _fact(facts, 'search.cw.top_page', 'search', ['spotlight'],
              f"Google's favourite CW page: {_short_url(p['key'])}, {p['clicks']} clicks from {p['impressions']} impressions at position {p['position']}.",
              value=p['clicks'], importance=0.5, source='search.cw.top_pages[0]')
    if len(pages) > 1:
        p = pages[1]
        _fact(facts, 'search.cw.second_page', 'search', ['spotlight', 'mover'],
              f"Runner-up page: {_short_url(p['key'])}, {p['clicks']} clicks at position {p['position']}.",
              value=p['clicks'], importance=0.35, source='search.cw.top_pages[1]')
    pts = [{'label': _short_url(p['key']), 'pos': p['position'], 'impr': p['impressions'],
            'clicks': p['clicks']} for p in pages if p.get('impressions')]
    if len(pts) >= 5:
        band = [p for p in pts if 8 <= p['pos'] <= 20]
        _fact(facts, 'search.cw.map', 'search', ['spotlight', 'mover'],
              f"{len(pts)} CW pages charted on Google; {len(band)} sit at positions 8 to 20, "
              f"within reach of page one.",
              value=len(band), importance=0.45, source='search.cw.top_pages',
              site='cw', viz={'type': 'bubbles', 'points': pts})
    qs = cw.get('top_queries') or []
    if qs:
        q = qs[0]
        _fact(facts, 'search.cw.top_query', 'search', ['mover', 'spotlight'],
              f"Top search people used to find CW: \"{q['key']}\", {q['clicks']} clicks at position {q['position']}.",
              value=q['clicks'], importance=0.45, source='search.cw.top_queries[0]')
    bing = s.get('bing_cw') or {}
    if bing.get('configured'):
        _fact(facts, 'search.bing_cw', 'search', ['quiet_win', 'head_to_head'],
              f"Bing sent CW {bing['clicks_7d']} clicks this week (prior week {bing['clicks_prev_7d']}).",
              value=bing['clicks_7d'], importance=0.3, source='search.bing_cw')


def _etsy(d, facts):
    e = d.get('etsy') or {}
    if not e:
        return
    y = e.get('yesterday') or {}
    _fact(facts, 'etsy.sales', 'etsy', ['trend'],
          f"Etsy lifetime sales {e.get('sales_lifetime')}, {e.get('sales_delta')} since {e.get('baseline_date')}; "
          f"{y.get('views_delta')} listing views since {y.get('since')}.",
          value=e.get('sales_lifetime'), importance=0.6, source='etsy')
    top = sorted(e.get('top') or [], key=lambda r: -(r.get('units') or 0))
    if top:
        r = top[0]
        _fact(facts, 'etsy.best_seller', 'etsy', ['spotlight'],
              f"Best-selling listing: \"{r['title']}\", {r['units']} units from {r['views']} views.",
              value=r['units'], importance=0.4, source='etsy.top')
    eff = [r for r in (e.get('top') or []) if (r.get('views') or 0) >= 500]
    if eff:
        r = max(eff, key=lambda r: r['units'] / r['views'])
        _fact(facts, 'etsy.efficient', 'etsy', ['mover', 'quiet_win'],
              f"Most efficient listing with real traffic: \"{r['title']}\", {r['units']} units from only {r['views']} views.",
              value=r['units'], importance=0.4, source='etsy.top')
    if e.get('review_avg'):
        _fact(facts, 'etsy.reviews', 'etsy', ['quiet_win', 'voice'],
              f"Shop rating {e['review_avg']} stars, {e.get('active_listings')} active listings.",
              value=e['review_avg'], importance=0.3, source='etsy.review_avg')


def _money(d, facts):
    r = d.get('revenue') or {}
    if not r.get('configured'):
        return
    l30, mtd = r.get('last_30d') or {}, r.get('mtd') or {}
    _fact(facts, 'money.mtd', 'money', ['trend'],
          f"Stripe month to date: ${mtd.get('gross', 0):.2f} gross; last 30 days ${l30.get('gross', 0):.2f} from {l30.get('charges', 0)} charges; "
          f"{r.get('days_left_in_month')} days left in the month.",
          value=mtd.get('gross', 0), importance=0.7, source='revenue.mtd/last_30d')
    recent = r.get('recent') or []
    if recent:
        x = recent[0]
        _fact(facts, 'money.last_sale', 'money', ['spotlight'],
              f"Last Stripe sale: {x['desc']}, ${x['amount']:.2f} on {x['date']}.",
              value=x['amount'], importance=0.4, source='revenue.recent[0]')


def _funnel(d, facts):
    reds = {n.get('text') for n in d.get('needs_attention') or []}
    for i, w in enumerate(d.get('what_matters') or []):
        if w['fact'] in reds:
            continue                       # already a health fact
        if w.get('state') == 'action':
            area, lens, imp = 'health', ['housekeeping'], 0.9
        else:
            area, lens, imp = 'funnel', ['leak', 'experiment'], 0.5
        text = w['fact'] + ' ' + (w.get('action') or '')
        fid = 'funnel.matters.' + re.sub(r'[^a-z]+', '_', w['fact'].lower())[:40]
        _fact(facts, fid, area, lens, text.strip(), value=None,
              importance=imp, source=f'what_matters[{i}]')
    stages = [s for s in ((d.get('paid_funnel') or {}).get('stages') or [])
              if s.get('status') == 'measured' and s.get('sessions')]
    if len(stages) >= 3:
        _fact(facts, 'funnel.paid_steps', 'funnel', ['leak'],
              f"Paid journey, last {(d.get('paid_funnel') or {}).get('window_days', 28)} days: "
              + ', '.join(f"{s['name'].lower()} {s['sessions']}" for s in stages) + '.',
              value=stages[-1]['sessions'], importance=0.5, source='paid_funnel.stages',
              site='cw', viz={'type': 'funnel', 'steps': [{'label': s['name'], 'value': s['sessions']} for s in stages]})
    for i, x in enumerate(d.get('experiments') or []):
        _fact(facts, 'funnel.exp.' + re.sub(r'[^a-z]+', '_', x['name'].lower()), 'funnel',
              ['experiment'],
              f"Experiment \"{x['name']}\": {x.get('numerator')} of {x.get('denominator')} "
              f"({x.get('numerator_label')} / {x.get('denominator_label')}), review threshold {x.get('min_sample')}. "
              f"Status: {x.get('status')}. {x.get('verdict') or ''}",
              value=x.get('denominator'), importance=0.55, source=f'experiments[{i}]')


def _email(d, facts):
    e = (d.get('email_engagement') or {}).get('cw') or {}
    if e.get('attempts'):
        _fact(facts, 'email.cw.health', 'email', ['quiet_win', 'trend'],
              f"CW email this week: {e['attempts']} sends, {e['delivery_rate_pct']}% delivered, "
              f"{e['unique_open_rate_pct']}% opened, {e['unique_click_rate_pct']}% clicked, {e['complained']} complaints.",
              value=e['unique_open_rate_pct'], importance=0.4, source='email_engagement.cw')
    y = d.get('yesterday') or {}
    if y:
        _fact(facts, 'email.signups', 'email', ['trend', 'quiet_win'],
              f"Yesterday ({y.get('date')}): {y.get('newsletter_signups_cw', 0)} CW newsletter signups, "
              f"{y.get('newsletter_signups_kd', 0)} KD, {y.get('calc_emails_cw', 0)} calculator emails captured on CW.",
              value=y.get('newsletter_signups_cw', 0), importance=0.35, source='yesterday')


def _customers(d, facts):
    seen = set()
    for q in ((d.get('voice') or {}).get('cw') or {}).get('questions') or []:
        ans = q.get('top_answers') or []
        if not ans or not q.get('respondents_30d') or q['key'] in seen:
            continue
        seen.add(q['key'])
        a = ans[0]
        _fact(facts, f"customers.survey.{q['key']}", 'customers', ['voice'],
              f"Survey \"{q['text']}\": top answer \"{a['answer']}\" ({a['count']} of {q['respondents_30d']} in 30 days)."
              + (' Small sample.' if q.get('thin') else ''),
              value=a['count'], importance=0.45, source=f"voice.cw.questions[{q['key']}]",
              viz={'type': 'answers', 'question': q['text'], 'total': q['respondents_30d'],
                   'answers': [{'label': x['answer'], 'value': x['count']} for x in ans[:4]]})
    for i, f in enumerate(((d.get('feedback') or {}).get('recent') or [])[:4]):
        _fact(facts, f"customers.feedback.{f.get('date', i)}", 'customers', ['voice'],
              f"Reader feedback ({(f.get('date') or '')[:10]}): \"{_anon(f.get('text'))}\"",
              importance=0.4, source=f'feedback.recent[{i}]',
              viz={'type': 'quote', 'quote': _anon(f.get('text')), 'who': 'A reader, ' + (f.get('date') or '')[:10]})


def _ketodial(d, facts):
    s = ((d.get('search') or {}).get('kd')) or {}
    t = ((d.get('traffic') or {}).get('kd') or {}).get('week', {}).get('sessions')
    if t:
        _fact(facts, 'ketodial.sessions', 'ketodial', ['trend', 'head_to_head'],
              f"KetoDial sessions this week: {int(t['current'])} (last week {int(t['previous'])}).",
              value=t['current'], importance=0.35, source='traffic.kd.week.sessions',
              caveat='At this size a percentage move is arithmetic, not a trend.')
    if s.get('current'):
        c = s['current']
        _fact(facts, 'ketodial.search', 'ketodial', ['trend', 'mover'],
              f"KetoDial on Google: {c['impressions']} impressions, {c['clicks']} clicks, average position {c['position']}.",
              value=c['impressions'], importance=0.3, source='search.kd.current')


def _pescodial(d, facts):
    p = d.get('pescodial') or {}
    ev = p.get('events') or []
    if ev:
        steps = ', '.join(f"{e['label'].lower()} {e['sessions']}" for e in ev[:6])
        _fact(facts, 'pescodial.funnel', 'pescodial', ['leak', 'trend'],
              f"PescoDial calculator since {p.get('since')}: {steps}.",
              value=ev[0]['sessions'], importance=0.4, source='pescodial.events',
              series=[e['sessions'] for e in ev[:6]], labels=[e['label'] for e in ev[:6]],
              site='pd', viz={'type': 'funnel', 'steps': [{'label': e['label'], 'value': e['sessions']} for e in ev[:6]]})
    t = ((d.get('traffic') or {}).get('pd') or {}).get('week', {}).get('sessions')
    if t:
        _fact(facts, 'pescodial.sessions', 'pescodial', ['trend'],
              f"PescoDial sessions this week: {int(t['current'])}.",
              value=t['current'], importance=0.3, source='traffic.pd.week.sessions')


def _health(d, facts):
    for i, n in enumerate(d.get('needs_attention') or []):
        if n.get('severity') == 'red':
            _fact(facts, 'health.' + re.sub(r'[^a-z]+', '_', n['text'].lower())[:40], 'health',
                  ['housekeeping'], f"{n['text']} {n.get('why', '')}".strip(),
                  importance=0.8, source=f'needs_attention[{i}]')


def command_center_facts(d):
    facts = []
    for fn in (_traffic, _search, _etsy, _money, _funnel, _email,
               _customers, _ketodial, _pescodial, _health):
        try:
            fn(d, facts)
        except (KeyError, TypeError, ValueError, ZeroDivisionError) as e:
            facts.append({'id': f'health.extract.{fn.__name__}', 'area': 'health',
                          'lenses': [], 'text': f'Could not read {fn.__name__[1:]}: {e}',
                          'value': None, 'importance': 0.1, 'source': 'brief_me'})
    return facts


# ---------- CEO brief ----------

def parse_ceo_brief(md):
    """Split the CEO brief into its sections. Returns {new, sit, move, spend}."""
    out = {'new': [], 'sit': [], 'move': '', 'spend': ''}
    body = re.sub(r'^---.*?---\s*', '', md or '', flags=re.S)
    section = None
    for line in body.splitlines():
        s = line.strip()
        if not s:
            continue
        low = s.lower()
        if low.startswith('image spend'):
            out['spend'] = s
        elif s.startswith('**') and 'new since' in low:
            section = 'new'
        elif s.startswith('**') and 'sit window' in low:
            section = 'sit'
        elif s.startswith('**') and 'suggested move' in low:
            section = 'move'
        elif s.startswith('**'):
            section = None
        elif section in ('new', 'sit') and s.startswith('-'):
            out[section].append(s.lstrip('- ').strip())
        elif section == 'move':
            out['move'] = (out['move'] + ' ' + s).strip()
    return out


def ceo_facts(brief):
    facts = []
    if brief.get('move'):
        _fact(facts, 'ceo.move', 'ceo', ['ceo'], f"CEO brief suggested move: {brief['move']}",
              importance=0.9, source='ceo-brief')
    items = []
    for line in brief.get('sit') or []:
        for piece in re.split(r',\s*|\.\s+', line):
            m = re.search(r'\b(\d{2})-(\d{2})\b', piece)
            if m:
                label = re.sub(r'\(.*?\)|\b(read|ends|window ends|due for a read today:?)\b|\d{2}-\d{2}|[:,.]', ' ', piece, flags=re.I)
                label = re.sub(r'\s+', ' ', label).strip()
                if label:
                    items.append({'date': m.group(0), 'label': label[:40]})
    if items:
        seen, uniq = set(), []
        for it in sorted(items, key=lambda x: x['date']):
            if (it['date'], it['label']) not in seen:
                seen.add((it['date'], it['label']))
                uniq.append(it)
        _fact(facts, 'ceo.timeline', 'ceo', ['ceo', 'watch'],
              'Read dates: ' + ', '.join(f"{it['label']} {it['date']}" for it in uniq) + '.',
              value=len(uniq), importance=0.6, source='ceo-brief',
              viz={'type': 'timeline', 'items': uniq})
    for i, s in enumerate(brief.get('sit') or []):
        _fact(facts, f'ceo.sit.{i}', 'ceo', ['ceo', 'watch'], f'Sit window: {s}',
              importance=0.7, source='ceo-brief')
    for i, s in enumerate(brief.get('new') or []):
        _fact(facts, f'ceo.new.{i}', 'ceo', ['ceo'], f'New since yesterday: {s}',
              importance=0.5, source='ceo-brief')
    return facts


# ---------- Calendar ----------

def _when(start):
    """'2026-10-14T10:00:00-07:00' -> ('Wed Oct 14', '10:00 AM'); all-day dates have no time."""
    from datetime import datetime
    try:
        if 'T' in start:
            dt = datetime.fromisoformat(start)
            return dt.strftime('%a %b %-d'), dt.strftime('%-I:%M %p'), dt.date().isoformat()
        dt = datetime.fromisoformat(start)
        return dt.strftime('%a %b %-d'), 'all day', dt.date().isoformat()
    except ValueError:
        return start, '', ''


def calendar_facts(events, today=None):
    """events: list of {summary, start (ISO), ...} as pulled by the session."""
    facts, week = [], []
    for i, ev in enumerate(events or []):
        title = (ev.get('summary') or '(untitled)').strip()
        day, time_, iso = _when(ev.get('start') or '')
        _fact(facts, f'calendar.{i}', 'calendar', ['calendar'],
              f"{day}, {time_}: {title}", importance=0.6, source=f'calendar[{i}]')
        week.append({'date': iso, 'day': day, 'time': time_, 'title': title})
    from datetime import date, timedelta
    start = date.fromisoformat(today) if today else date.today()
    _fact(facts, 'calendar.week', 'calendar', ['calendar'],
          f"{len(week)} calendar events in the next 7 days.", value=len(week),
          importance=0.3, source='calendar',
          viz={'type': 'week', 'days': [(start + timedelta(days=k)).isoformat() for k in range(7)],
               'events': week})
    return facts


# ---------- Trip (Project Nexus ledger, only while a trip is on) ----------

def _money_txt(x):
    x = float(x or 0)
    return f'{x:,.0f}' if x == int(x) else f'{x:,.2f}'


def trip_facts(ctx):
    """ctx: trip.load_trip() output, or None. No trip today means no trip facts."""
    if not ctx or not ctx.get('trip'):
        return []
    from datetime import date, timedelta
    t, facts = ctx['trip'], []
    today = date.fromisoformat(ctx['today'])
    start, end = date.fromisoformat(t['starts_on'][:10]), date.fromisoformat(t['ends_on'][:10])
    if not start <= today <= end:
        return []                                  # belt and braces: the SQL gates too
    day, length = (today - start).days + 1, (end - start).days + 1
    place = t['location'].split(',')[0]
    _fact(facts, 'trip.day', 'trip', ['trip'],
          f"Day {day} of {length} in {place}; "
          + ('last day.' if day == length else f"{(end - today).days} day{'s' if end - today != timedelta(1) else ''} to go."),
          value=day, importance=0.5, source='trip.trips')
    cur = t.get('currency') or 'MXN'

    yday = [r for r in ctx.get('yday_spend') or [] if r.get('total') is not None]
    if yday:
        main = [r for r in yday if r['currency'] == cur]
        total = sum(float(r['total']) for r in main)
        other = [r for r in yday if r['currency'] != cur]
        _fact(facts, 'trip.spend.yday', 'trip', ['trip'],
              f"Yesterday's spend: {_money_txt(total)} {cur}"
              + (': ' + ', '.join(f"{r['category']} {_money_txt(r['total'])}" for r in main) if main else '')
              + (''.join(f"; plus {_money_txt(r['total'])} {r['currency']} {r['category']}" for r in other)) + '.',
              value=round(total, 2), importance=0.7, source='trip.spend (yesterday)',
              series=[round(float(r['total']), 2) for r in main], labels=[r['category'] for r in main],
              viz={'type': 'bars', 'unit': cur})
    tot = next((r for r in ctx.get('trip_spend') or [] if r['currency'] == cur), None)
    if tot and tot.get('total'):
        days = max(int(tot.get('days') or 0), 1)
        daily = ctx.get('daily_spend') or []
        _fact(facts, 'trip.spend.total', 'trip', ['trip', 'trend'],
              f"Trip spend so far: {_money_txt(tot['total'])} {cur} over {days} day(s) with spending, "
              f"about {_money_txt(round(float(tot['total']) / days))} {cur} a day.",
              value=round(float(tot['total']), 2), importance=0.55, source='trip.spend (trip)',
              series=[round(float(r['total']), 2) for r in daily][-14:],
              labels=[r['day'][5:] for r in daily][-14:],
              viz={'type': 'bars', 'unit': cur})

    seen = sorted(ctx.get('yday_people') or [])
    new = ctx.get('yday_new') or []
    new_names = {n['name'] for n in new}
    if seen or new:
        _fact(facts, 'trip.people', 'trip', ['trip'],
              f"Seen yesterday: {', '.join(seen) or 'nobody logged'}."
              + (f" New faces: {', '.join(n['name'] + (' (' + n['description'] + ')' if n.get('description') else '') for n in new)}." if new else ''),
              value=len(seen), importance=0.6, source='trip.sightings + trip.people',
              viz={'type': 'people', 'people': [{'name': n, 'new': n in new_names} for n in seen]
                   + [{'name': n['name'], 'new': True, 'note': n.get('description') or ''}
                      for n in new if n['name'] not in seen]})

    plans = ctx.get('commitments') or []
    if plans:
        _fact(facts, 'trip.commitments', 'trip', ['trip', 'watch'],
              'Plans in the next 3 days: ' + '; '.join(
                  f"{p['what']}" + (f" with {', '.join(p['with'])}" if p.get('with') else '')
                  + (f" ({p['date'][5:]} {p['time']})" if p.get('date') else ' (no time set)') for p in plans) + '.',
              value=len(plans), importance=0.65, source='trip.commitments')

    events = ctx.get('events') or []
    if events:
        _fact(facts, 'trip.events', 'trip', ['trip'],
              f"{len(events)} local event(s) today and the next 2 days: "
              + '; '.join(e['title'] + (f" at {e['venue']}" if e.get('venue') else '') for e in events[:5]) + '.',
              value=len(events), importance=0.4, source='trip.events')
    return facts


def merge_commitments_into_week(facts, commitments):
    """Add open trip commitments to the calendar `week` viz so they sit beside meetings."""
    week = next((f for f in facts if f['id'] == 'calendar.week'), None)
    if not week or not commitments:
        return facts
    days = set(week['viz']['days'])
    for p in commitments:
        if p.get('date') in days:
            week['viz']['events'].append({'date': p['date'], 'day': '', 'time': p.get('time') or '',
                                          'title': p['what'], 'kind': 'trip'})
    def clock(t):
        from datetime import datetime
        try:
            return datetime.strptime(t, '%I:%M %p').time().isoformat()
        except ValueError:
            return ''                          # all day / no time sorts first
    week['viz']['events'].sort(key=lambda e: (e['date'], clock(e['time'])))
    return facts
