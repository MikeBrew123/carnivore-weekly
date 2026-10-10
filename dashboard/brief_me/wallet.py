"""Personal money facts for Brief Me, read live from Brew's MyBudget sheet.

"The Banana Stand v2" is Brew's personal finance sheet. It is NOT Banana Stand
Media (CW/KD); the business "money" area is Stripe and lives in facts.py.

Rules this module keeps:
    - Read only. The sheet is opened with a read-only scope; nothing is written.
    - Every number comes from the sheet (or, for item 2, the watchlist file that
      MyBudget sessions keep current) at gather time. Nothing is quoted from docs.
    - By exception only. Each fact has a gate; when the gate is shut the fact
      does not exist, so a normal day produces no personal slide at all.
    - Facts only on investments: what moved and by how much, never what to do.
    - The whole area is opt-out: `"money": "off"` in ~/.brief-me/config.json.

The sheet id is read from config (`money_sheet_id`) or MyBudget's CLAUDE.md, so
it never lands in this public repo.

Gates (each a pure function of the rows, `today` and context, so tests can
drive them without the network):
    due_soon        Subscriptions / Upcoming & Recurring items due in 7 days
    watchlist_due   watchlist items with a dollar value and a deadline in 14 days
    budget_pace     Budget vs Actual categories off pace this month, only once a
                    bank import has landed since month start
    business_week   Friday format only: Stripe and Etsy against the Goals target
    net_worth_month once per month, after a month-end Net Worth snapshot exists
    holdings_move   weekly, only when a holding's unit price moves past 10%
    trip_spend      during a trip: spend so far against the Goals vacation line
"""

import calendar
import json
import re
from datetime import date, timedelta
from pathlib import Path

AREA = 'personal'
MYBUDGET = Path('/Users/mbrew/Developer/MyBudget')
CREDS = MYBUDGET / 'secrets' / 'google-sheets-credentials.json'
WATCHLIST = MYBUDGET / 'references' / 'optimization-watchlist.md'

DUE_DAYS = 7
WATCH_DAYS = 14
HOLDING_MOVE_PCT = 10.0        # unit-price move that counts as news
HOLDING_FRESH_DAYS = 14        # older snapshots are history, not news
PACE_TOLERANCE = 1.25          # 25% ahead of a straight-line month
PACE_MIN_DOLLARS = 50          # ignore small overruns
MONTH_END_EARLY, MONTH_END_LATE = 24, 5   # a month-end snapshot: day 24+ or next month day 1-5

RANGES = {
    'subs': 'Subscriptions!A4:J',
    'recurring': "'Upcoming & Recurring'!A4:I",
    'goals': 'Goals!A1:I40',
    'networth': "'Net Worth'!A3:M",
    'holdings': 'Holdings!A4:K',
    'budget': "'Budget vs Actual'!A1:AZ",
    'txns': 'Transactions!A3:M',
}

CYCLE_MONTHS = {'monthly': 1, 'quarterly': 3, 'semi-annual': 6, 'annual': 12}
# Upcoming & Recurring is auto-detected merchants, so it includes shopping
# habits. Only bills belong on a "due" slide.
NOT_BILLS = {'groceries', 'dining out', 'entertainment', 'travel', 'uncategorized',
             'transportation', 'shopping', 'fitness', 'health'}
# Spend that happens whether or not Brew is travelling; not trip spend.
FIXED_BILLS = {'Housing', 'Insurance', 'Subscriptions', 'Financial Admin'}


# ---------- config + fetch ----------

def money_enabled(home):
    """`money` defaults to on; "off", false or "no" turns the area off."""
    try:
        cfg = json.loads((Path(home) / 'config.json').read_text())
    except (OSError, ValueError):
        return True
    v = cfg.get('money', 'on')
    return str(v).strip().lower() not in ('off', 'false', 'no', '0')


def sheet_id(home):
    try:
        sid = json.loads((Path(home) / 'config.json').read_text()).get('money_sheet_id')
        if sid:
            return sid
    except (OSError, ValueError):
        pass
    m = re.search(r'ID `([\w-]{30,})`', (MYBUDGET / 'CLAUDE.md').read_text())
    if not m:
        raise RuntimeError('MyBudget sheet id not found')
    return m.group(1)


def fetch_sheet(sid):
    """All ranges in one read-only batchGet. Returns {key: rows}."""
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    creds = service_account.Credentials.from_service_account_file(
        str(CREDS), scopes=['https://www.googleapis.com/auth/spreadsheets.readonly'])
    api = build('sheets', 'v4', credentials=creds, cache_discovery=False).spreadsheets()
    keys = list(RANGES)
    res = api.values().batchGet(spreadsheetId=sid, ranges=[RANGES[k] for k in keys]).execute()
    return {k: vr.get('values', []) for k, vr in zip(keys, res['valueRanges'])}


# ---------- parsing ----------

def money(s):
    """'$1,234.56' / '-$632' / '858' -> float; None if not a number."""
    if s is None:
        return None
    t = str(s).strip().replace('$', '').replace(',', '')
    m = re.match(r'^-?\d+(\.\d+)?', t)
    return float(m.group()) if m else None


def day(s):
    try:
        return date.fromisoformat(str(s).strip()[:10])
    except ValueError:
        return None


def cell(row, i):
    return row[i] if i < len(row) else ''


def add_months(d, n):
    y, m = divmod(d.month - 1 + n, 12)
    y, m = d.year + y, m + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


def next_due(last, cycle, today):
    """First date on or after today on the cycle that started at `last`."""
    n = CYCLE_MONTHS.get((cycle or '').strip().lower())
    if not last or not n:
        return None
    k, d = 1, add_months(last, n)
    while d < today:
        k += 1
        d = add_months(last, n * k)
    return d


def _fmt(x):
    return f'${x:,.2f}'


def _fact(id, text, value=None, importance=0.6, source='', viz=None, seen_key=None):
    f = {'id': id, 'area': AREA, 'lenses': ['personal'], 'text': text, 'value': value,
         'importance': importance, 'source': source}
    if viz:
        f['viz'] = viz
    if seen_key:
        f['seen_key'] = seen_key
    return f


def last_txn_date(txns):
    ds = [day(cell(r, 0)) for r in txns]
    ds = [d for d in ds if d]
    return max(ds) if ds else None


# ---------- gates ----------

def due_soon(sheet, today):
    items = []
    for r in sheet.get('subs', []):
        if cell(r, 7).strip().lower() != 'active':
            continue
        d = next_due(day(cell(r, 6)), cell(r, 5), today)
        amt = money(cell(r, 2))
        if d and amt and 0 <= (d - today).days <= DUE_DAYS:
            items.append((d, cell(r, 0).strip(), amt, 'Subscriptions'))
    names = {n.lower()[:6] for _, n, _, _ in items}
    for r in sheet.get('recurring', []):
        name, cat = cell(r, 0).strip(), cell(r, 1).strip().lower()
        last, cycle = day(cell(r, 6)), cell(r, 7)
        n = CYCLE_MONTHS.get(cycle.strip().lower())
        if not name or cat in NOT_BILLS or not n or not last or name.lower()[:6] in names:
            continue
        if (today - last).days > n * 31 * 1.5:
            continue                       # not seen for 1.5 cycles: no longer live
        d = next_due(last, cycle, today)
        amt = money(cell(r, 2))
        if d and amt and 0 <= (d - today).days <= DUE_DAYS:
            items.append((d, name, amt, 'Upcoming & Recurring'))
    if not items:
        return []
    items.sort()
    total = sum(a for _, _, a, _ in items)
    text = (f'Due in the next {DUE_DAYS} days: '
            + '; '.join(f'{n} about {_fmt(a)} on {d:%b %-d}' for d, n, a, _ in items)
            + f'. Total about {_fmt(total)}. Dates are estimated from the last charge and billing cycle.')
    return [_fact('personal.due', text, value=round(total, 2), importance=0.6,
                  source='Subscriptions / Upcoming & Recurring',
                  viz={'type': 'timeline', 'items': [{'date': d.strftime('%m-%d'), 'label': n[:40]}
                                                     for d, n, _, _ in items]})]


MONTHS = {m.lower(): i for i, m in enumerate(calendar.month_name) if m}
MONTHS.update({m.lower(): i for i, m in enumerate(calendar.month_abbr) if m})
DATE_RE = re.compile(r'\b(\d{4})-(\d{2})-(\d{2})\b|\b(' + '|'.join(sorted(MONTHS, key=len, reverse=True))
                     + r')\.?\s+(\d{1,2})\b', re.I)


def _dates_in(text, today):
    out = []
    for m in DATE_RE.finditer(text):
        if m.group(1):
            d = day(m.group(0))
        else:
            mo, dd = MONTHS[m.group(4).lower()], int(m.group(5))
            try:
                d = date(today.year, mo, dd)
            except ValueError:
                continue
            if (today - d).days > 30:
                d = date(today.year + 1, mo, dd)
        if d:
            out.append(d)
    return out


def watchlist_items(md):
    """Section A rows of the watchlist: (opportunity, worth, status)."""
    rows, in_a = [], False
    for line in md.splitlines():
        if line.startswith('## '):
            in_a = line.startswith('## A')
        if in_a and line.startswith('|') and not re.match(r'^\|\s*[-#]', line):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if len(cells) >= 4:
                rows.append((re.sub(r'\*', '', cells[1]), cells[2], cells[3]))
    return rows


def watchlist_due(md, today):
    hits = []
    for name, worth, status in watchlist_items(md):
        if re.search(r'\b(RETRACTED|CLOSED|DONE)\b', status):
            continue
        m = re.search(r'\$[\d,]+(?:\.\d+)?', worth)
        dollars = m.group() if m else None
        if dollars is None:
            continue                       # no dollar value, not a finding
        due = [d for d in _dates_in(status, today) if 0 <= (d - today).days <= WATCH_DAYS]
        if due:
            hits.append((min(due), name, dollars))
    if not hits:
        return []
    hits.sort()
    text = ('Watchlist deadlines in the next 14 days: '
            + '; '.join(f'{n}, worth {w}, due {d:%b %-d}' for d, n, w in hits) + '.')
    return [_fact('personal.watchlist', text, value=len(hits), importance=0.7,
                  source='MyBudget references/optimization-watchlist.md')]


def budget_pace(sheet, today):
    """Categories running ahead of a straight-line month. Silent until a bank
    import has landed this month, and paced only to the last imported day."""
    last = last_txn_date(sheet.get('txns', []))
    month_start = today.replace(day=1)
    if not last or last < month_start:
        return []
    rows = sheet.get('budget', [])
    if not rows:
        return []
    header = rows[0]
    row = next((r for r in rows if cell(r, 0).strip() == today.strftime('%Y-%m')), None)
    if not row:
        return []
    days = calendar.monthrange(today.year, today.month)[1]
    frac = min(last, today).day / days
    off = []
    for i, h in enumerate(header):
        if not h.endswith(' Budget') or h.startswith('Total'):
            continue
        budget, actual = money(cell(row, i)), money(cell(row, i + 1))
        if not budget or budget <= 0 or actual is None:
            continue
        actual = abs(actual)
        expected = budget * frac
        if actual > expected * PACE_TOLERANCE and actual - expected >= PACE_MIN_DOLLARS:
            off.append((h[:-7], budget, actual))
    if not off:
        return []
    lag = (today - last).days
    text = (f'Off pace this month (ledger through {last:%b %-d}, {lag} days behind): '
            + '; '.join(f'{c} {_fmt(a)} spent of a {_fmt(b)} budget' for c, b, a in off)
            + '. Spending after the last import is not counted yet.')
    return [_fact('personal.budget_pace', text, value=len(off), importance=0.6,
                  source="'Budget vs Actual'")]


def _goal(sheet, prefix):
    return next((r for r in sheet.get('goals', []) if cell(r, 0).strip().lower().startswith(prefix)), None)


def business_week(sheet, cc, fmt):
    if (fmt or '').lower() != 'friday':
        return []
    g = _goal(sheet, 'cw revenue')
    target = money(cell(g, 1)) if g else None
    r = (cc or {}).get('revenue') or {}
    l30 = r.get('last_30d') or {}
    e = (cc or {}).get('etsy') or {}
    if not target or not r.get('configured'):
        return []
    text = (f"Business against the exit target: Stripe collected {_fmt(l30.get('net', 0))} USD after refunds "
            f"in the last 30 days from {l30.get('charges', 0)} sales; Etsy {e.get('sales_delta', 0)} sale(s) "
            f"since {e.get('baseline_date', 'the baseline')} (Etsy dollars are not in the snapshot, units only). "
            f"Goals tab target: {_fmt(target)} CAD per month, the rent-offset milestone. "
            f"Currencies differ, so no combined percentage.")
    return [_fact('personal.business_week', text, value=l30.get('net', 0), importance=0.6,
                  source='command-center revenue/etsy + Goals tab')]


def month_end_snapshot(rows, year, month):
    """The Net Worth row closest to the end of year-month: dated day 24+ of
    that month or day 1-5 of the next. None if there is none."""
    end = date(year, month, calendar.monthrange(year, month)[1])
    lo, hi = date(year, month, MONTH_END_EARLY), end + timedelta(days=MONTH_END_LATE)
    best = None
    for r in rows:
        d, nw = day(cell(r, 0)), money(cell(r, 11))
        if d and nw is not None and lo <= d <= hi:
            if best is None or abs((d - end).days) < abs((best[0] - end).days):
                best = (d, nw)
    return best


def net_worth_month(sheet, today, seen):
    prev = add_months(today.replace(day=1), -1)
    snap = month_end_snapshot(sheet.get('networth', []), prev.year, prev.month)
    key = f'personal.networth.{prev:%Y-%m}'
    if not snap or key in seen:
        return []
    before = add_months(prev, -1)
    old = month_end_snapshot(sheet.get('networth', []), before.year, before.month)
    text = f'Net Worth tab, end of {prev:%B} (snapshot {snap[0]:%b %-d}): {_fmt(snap[1])}'
    text += (f', against {_fmt(old[1])} at the end of {before:%B} (snapshot {old[0]:%b %-d}).'
             if old else '.')
    return [_fact('personal.networth', text, value=snap[1], importance=0.5,
                  source="'Net Worth' col L", seen_key=key)]


def _unit_price(r):
    p = money(cell(r, 7))
    if p:
        return p
    q, mv = money(cell(r, 5)), money(cell(r, 9))
    return mv / q if q and mv else None


def holdings_move(sheet, today, seen):
    snaps = {}
    for r in sheet.get('holdings', []):
        d, sym = day(cell(r, 0)), cell(r, 2).strip()
        if not d or sym in ('', 'CASH', 'PORTFOLIO'):
            continue
        p = _unit_price(r)
        if p:
            snaps.setdefault((cell(r, 1).strip(), sym), {})[d] = p
    latest = max((d for v in snaps.values() for d in v), default=None)
    if not latest or (today - latest).days > HOLDING_FRESH_DAYS:
        return []
    key = f'personal.holdings.{latest}'
    if key in seen:
        return []
    moves = []
    for (acct, sym), by_date in snaps.items():
        if latest not in by_date:
            continue
        older = [d for d in by_date if d < latest]
        if not older:
            continue
        d0 = max(older)
        p0, p1 = by_date[d0], by_date[latest]
        pct = (p1 - p0) / p0 * 100
        if abs(pct) >= HOLDING_MOVE_PCT:
            moves.append((acct, sym, d0, p0, p1, pct))
    if not moves:
        return []
    moves.sort(key=lambda m: -abs(m[5]))
    text = ('Holdings snapshot ' + f'{latest:%b %-d}: '
            + '; '.join(f'{s} in {a} {pct:+.1f}% per unit since {d0:%b %-d} ({_fmt(p0)} to {_fmt(p1)})'
                        for a, s, d0, p0, p1, pct in moves)
            + '. Price moves only, not a reason to trade.')
    return [_fact('personal.holdings', text, value=round(moves[0][5], 1), importance=0.5,
                  source='Holdings tab', seen_key=key)]


def trip_spend(sheet, today, trip):
    if not trip:
        return []
    start, end = day(trip.get('start')), day(trip.get('end'))
    if not start or not end or not start <= today <= end:
        return []
    spent, travel, n = 0.0, 0.0, 0
    txns = sheet.get('txns', [])
    for r in txns:
        d, amt, cat = day(cell(r, 0)), money(cell(r, 3)), cell(r, 5).strip()
        if (d and amt is not None and start <= d <= today and cell(r, 4).strip() == 'Expense'
                and cat not in FIXED_BILLS and not cat.startswith('Business')):
            spent += -amt
            travel += -amt if cat == 'Travel' else 0
            n += 1
    g = _goal(sheet, 'vacation')
    target, actual = (money(cell(g, 4)), money(cell(g, 5))) if g else (None, None)
    last = last_txn_date(txns)
    text = (f"Trip spend for {trip.get('name') or 'this trip'} so far: {_fmt(spent)} across {n} charges, "
            f"{_fmt(travel)} of it filed as Travel; rent, bills and business costs left out")
    text += f' (ledger through {last:%b %-d}; later charges are not imported yet).' if last else '.'
    if target:
        text += f' Goals tab vacation line: {_fmt(target)} a year'
        text += f', {_fmt(actual)} spent this year.' if actual is not None else '.'
    return [_fact('personal.trip', text, value=round(spent, 2), importance=0.7,
                  source='Transactions + Goals tab')]


# ---------- entry point ----------

def money_facts(today, home, cc=None, fmt=None, trip=None, seen=(), sheet=None, watchlist_md=None):
    """All personal money facts that pass their gates. [] when the area is off.

    `seen`: fact keys already said in earlier episodes (history), so the
    monthly and weekly facts are said once. `sheet` / `watchlist_md` are
    injectable for tests; otherwise they are read live.
    """
    if not money_enabled(home):
        return []
    seen = set(seen)
    try:
        if sheet is None:
            sheet = fetch_sheet(sheet_id(home))
    except Exception as e:                 # fail visible, never silently "all clear"
        return [_fact('personal.unavailable',
                      f'Personal money: the MyBudget sheet could not be read ({type(e).__name__}), so this is missing, not clear.',
                      importance=0.3, source='brief_me.wallet')]
    if watchlist_md is None:
        try:
            watchlist_md = WATCHLIST.read_text()
        except OSError:
            watchlist_md = ''
    out = []
    out += due_soon(sheet, today)
    out += watchlist_due(watchlist_md, today)
    out += budget_pace(sheet, today)
    out += business_week(sheet, cc, fmt)
    out += net_worth_month(sheet, today, seen)
    out += holdings_move(sheet, today, seen)
    out += trip_spend(sheet, today, trip)
    return out


def seen_keys(history):
    """Keys of once-only money facts already said, from Brief Me history."""
    return {k for ep in history for k in ep.get('money_seen', [])}
