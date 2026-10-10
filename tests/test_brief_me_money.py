"""Brief Me personal money area: one open and one shut case per gate.

Synthetic rows only; no real figures from the sheet live in this public repo.
Run: python3 -m pytest tests/test_brief_me_money.py -q
"""

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'dashboard'))
from brief_me import wallet as W     # noqa: E402

TODAY = date(2026, 10, 10)          # a Saturday


def sheet(**over):
    base = {
        'subs': [
            ['Internet Co', 'Internet', '$100.00', '', '', 'Monthly', '2026-09-12', 'Active'],
            ['Old Stream', 'Streaming', '$20.00', '', '', 'Monthly', '2026-09-12', 'Inactive'],
            ['Far Bill', 'Utility', '$40.00', '', '', 'Monthly', '2026-09-25', 'Active'],
        ],
        'recurring': [
            ['Phone Co', 'Subscriptions', '$30.00', '', '', '', '2026-09-14', 'Monthly', '9'],
            ['Corner Grocer', 'Groceries', '$55.00', '', '', '', '2026-09-14', 'Monthly', '40'],
            ['Dead Bill', 'Housing', '$90.00', '', '', '', '2025-03-14', 'Monthly', '3'],
        ],
        'goals': [
            ['Goal', 'Target', 'Current', 'Monthly Save', 'Annual Target', 'Actual/Yr'],
            ['Vacation', '$5,000/yr', '', '$400', '$5,000', '$1,200'],
            ['CW Revenue (Etsy + CW)', '$600/mo', '', '', '$7,200'],
        ],
        'networth': [
            ['2026-08-29', '', '', '', '', '', '', '', '', '', '', '$100,000'],
            ['2026-09-10', '', '', '', '', '', '', '', '', '', '', '$101,000'],
            ['2026-09-28', '', '', '', '', '', '', '', '', '', '', '$104,000'],
        ],
        'holdings': [
            ['2026-07-01', 'RRSP', 'AAA', 'CA', 'Fund A', '10', '', '50', '', '500'],
            ['2026-07-01', 'RRSP', 'BBB', 'CA', 'Fund B', '10', '', '20', '', '200'],
            ['2026-07-01', 'RRSP', 'CASH', '', 'Cash', '1', '', '', '', '99'],
            ['2026-10-03', 'RRSP', 'AAA', 'CA', 'Fund A', '20', '', '56', '', '1120'],
            ['2026-10-03', 'RRSP', 'BBB', 'CA', 'Fund B', '10', '', '', '', '210'],
            ['2026-10-03', 'RRSP', 'CASH', '', 'Cash', '1', '', '', '', '500'],
        ],
        'budget': [
            ['Month', 'Dining Out Budget', 'Dining Out Actual', 'Dining Out Variance',
             'Groceries Budget', 'Groceries Actual', 'Groceries Variance', 'Total Budget', 'Total Actual'],
            ['2026-10', '$300', '$200', '', '$1,000', '$320', '', '$1,300', '$520'],
        ],
        'txns': [
            ['2026-10-08', 'Hotel', '', '-400', 'Expense', 'Travel', 'Hotel'],
            ['2026-10-07', 'Dinner', '', '-60', 'Expense', 'Dining Out', ''],
            ['2026-10-06', 'Rent', '', '-1000', 'Expense', 'Housing', 'Rent'],
            ['2026-10-06', 'Hosting', '', '-20', 'Expense', 'Business - CW', ''],
            ['2026-10-06', 'Move to TFSA', '', '-500', 'Transfer', 'Transfer', ''],
            ['2026-10-01', 'Before trip', '', '-75', 'Expense', 'Dining Out', ''],
        ],
    }
    base.update(over)
    return base


WATCH = """# Watchlist
## A. Money on the table, ranked
| # | Opportunity | Worth | Status / next step |
|---|---|---|---|
| 1 | **Flip the plan** | **~$470/yr** | Decision due Oct 20 billing date |
| 2 | **No dollar item** | some | Due Oct 15 |
| 3 | **Far item** | $900 | Due Dec 31 |
| 4 | **Dropped item** | $300 | RETRACTED. Was due Oct 12 |
## B. Risks
| Risk | Why | Watch |
|---|---|---|
| **Risk row** | $1,000 | Due Oct 13 |
"""

CC = {'revenue': {'configured': True, 'last_30d': {'net': 58.0, 'charges': 2}},
      'etsy': {'sales_delta': 3, 'baseline_date': '2026-10-04'}}


def ids(facts):
    return [f['id'] for f in facts]


# ---------- 1. due soon ----------

def test_due_soon_lists_active_bills_inside_seven_days():
    f = W.due_soon(sheet(), TODAY)
    assert ids(f) == ['personal.due']
    assert 'Internet Co' in f[0]['text'] and 'Oct 12' in f[0]['text']
    assert 'Phone Co' in f[0]['text']


def test_due_soon_skips_inactive_far_groceries_and_stale():
    t = W.due_soon(sheet(), TODAY)[0]['text']
    for name in ('Old Stream', 'Far Bill', 'Corner Grocer', 'Dead Bill'):
        assert name not in t


def test_due_soon_silent_when_nothing_due():
    assert W.due_soon(sheet(subs=[], recurring=[]), TODAY) == []


# ---------- 2. watchlist ----------

def test_watchlist_due_needs_dollar_and_deadline_in_14_days():
    f = W.watchlist_due(WATCH, TODAY)
    assert ids(f) == ['personal.watchlist']
    t = f[0]['text']
    assert 'Flip the plan' in t and '$470' in t and 'Oct 20' in t
    for name in ('No dollar item', 'Far item', 'Dropped item', 'Risk row'):
        assert name not in t


def test_watchlist_silent_outside_window():
    assert W.watchlist_due(WATCH, date(2026, 11, 20)) == []


# ---------- 3. budget pace ----------

def test_budget_pace_flags_category_ahead_of_straight_line():
    f = W.budget_pace(sheet(), TODAY)
    assert ids(f) == ['personal.budget_pace']
    # Groceries is $62 over a straight line but inside the 25% tolerance.
    assert 'Dining Out' in f[0]['text'] and 'Groceries' not in f[0]['text']
    assert 'Oct 8' in f[0]['text'] and '2 days behind' in f[0]['text']


def test_budget_pace_waits_for_an_import_this_month():
    old = [['2026-09-02', 'x', '', '-10', 'Expense', 'Dining Out', '']]
    assert W.budget_pace(sheet(txns=old), TODAY) == []


def test_budget_pace_silent_without_this_months_row():
    b = sheet()['budget'][:1] + [['2026-09', '$300', '$900']]
    assert W.budget_pace(sheet(budget=b), TODAY) == []


# ---------- 4. business, Friday only ----------

def test_business_week_on_friday_with_units():
    f = W.business_week(sheet(), CC, 'friday')
    assert ids(f) == ['personal.business_week']
    t = f[0]['text']
    assert 'USD' in t and 'CAD' in t and '$600.00' in t and '$58.00' in t


def test_business_week_silent_other_formats():
    assert W.business_week(sheet(), CC, 'monday') == []
    assert W.business_week(sheet(), CC, None) == []


# ---------- 5. net worth, monthly ----------

def test_net_worth_once_month_end_snapshot_exists():
    f = W.net_worth_month(sheet(), TODAY, set())
    assert ids(f) == ['personal.networth']
    assert '$104,000.00' in f[0]['text'] and '$100,000.00' in f[0]['text']
    assert f[0]['seen_key'] == 'personal.networth.2026-09'


def test_net_worth_not_repeated_in_the_same_month():
    assert W.net_worth_month(sheet(), TODAY, {'personal.networth.2026-09'}) == []


def test_net_worth_waits_for_a_month_end_row():
    mid = [['2026-09-10', '', '', '', '', '', '', '', '', '', '', '$101,000']]
    assert W.net_worth_month(sheet(networth=mid), TODAY, set()) == []


# ---------- 6. holdings ----------

def test_holdings_reports_price_move_past_threshold_only():
    f = W.holdings_move(sheet(), TODAY, set())
    assert ids(f) == ['personal.holdings']
    t = f[0]['text']
    assert 'AAA' in t and '+12.0%' in t and 'BBB' not in t and 'CASH' not in t
    assert 'not a reason to trade' in t


def test_holdings_uses_price_not_market_value():
    # AAA's market value more than doubled from new units; price moved 12%.
    assert '+124' not in W.holdings_move(sheet(), TODAY, set())[0]['text']


def test_holdings_said_once_per_snapshot():
    assert W.holdings_move(sheet(), TODAY, {'personal.holdings.2026-10-03'}) == []


def test_holdings_silent_when_snapshot_is_stale():
    assert W.holdings_move(sheet(), date(2026, 11, 30), set()) == []


def test_holdings_silent_below_threshold():
    h = [r for r in sheet()['holdings'] if r[2] != 'AAA']
    assert W.holdings_move(sheet(holdings=h), TODAY, set()) == []


# ---------- 7. trip ----------

TRIP = {'name': 'Coast', 'start': '2026-10-05', 'end': '2026-10-12'}


def test_trip_spend_counts_trip_window_without_bills():
    f = W.trip_spend(sheet(), TODAY, TRIP)
    assert ids(f) == ['personal.trip']
    t = f[0]['text']
    assert '$460.00 across 2 charges' in t and '$400.00 of it filed as Travel' in t
    assert '$5,000.00 a year' in t and '$1,200.00' in t


def test_trip_spend_silent_outside_trip():
    assert W.trip_spend(sheet(), date(2026, 10, 20), TRIP) == []
    assert W.trip_spend(sheet(), TODAY, None) == []


# ---------- config + entry point ----------

def test_money_off_in_config_turns_area_off(tmp_path):
    (tmp_path / 'config.json').write_text(json.dumps({'money': 'off'}))
    assert W.money_facts(TODAY, tmp_path, sheet=sheet(), watchlist_md=WATCH) == []


def test_money_defaults_on(tmp_path):
    f = W.money_facts(TODAY, tmp_path, cc=CC, sheet=sheet(), watchlist_md=WATCH)
    assert {x['area'] for x in f} == {'personal'}
    assert 'personal.due' in ids(f)


def test_unreadable_sheet_is_missing_not_clear(tmp_path, monkeypatch):
    def boom(_):
        raise OSError('no creds')
    monkeypatch.setattr(W, 'sheet_id', boom)
    f = W.money_facts(TODAY, tmp_path)
    assert ids(f) == ['personal.unavailable'] and 'missing, not clear' in f[0]['text']


def test_quiet_day_has_no_personal_facts(tmp_path):
    quiet = sheet(subs=[], recurring=[], networth=[], holdings=[], budget=[])
    assert W.money_facts(TODAY, tmp_path, cc=CC, fmt='monday', sheet=quiet, watchlist_md='') == []


# ---------- wiring into the episode plan ----------

from brief_me import lenses as L     # noqa: E402

BIZ = [{'id': f'b{i}', 'area': a, 'lenses': ['trend'], 'value': 10 + i, 'importance': 0.6,
        'text': f'b{i} is {10 + i}.', 'source': 't'} for i, a in enumerate(['traffic', 'search', 'etsy'])]


def test_trip_mode_keys_and_friday_format_name_accepted():
    t = {'name': 'Coast', 'starts_on': '2026-10-05', 'ends_on': '2026-10-12'}
    assert ids(W.trip_spend(sheet(), TODAY, t)) == ['personal.trip']
    assert ids(W.business_week(sheet(), CC, 'week_review')) == ['personal.business_week']


def test_plan_gives_personal_money_its_own_slot_before_close():
    money = W.net_worth_month(sheet(), TODAY, set())
    slots = [s['slot'] for s in L.plan_episode(BIZ + money, [])['slides']]
    assert slots[-2:] == ['personal', 'close']
    assert 'personal' not in [s['area'] for s in L.plan_episode(BIZ + money, [])['slides'] if s['slot'] == 'area']


def test_plan_has_no_personal_slot_on_a_quiet_day():
    assert 'personal' not in [s['slot'] for s in L.plan_episode(BIZ, [])['slides']]


def test_personal_money_never_opens_the_show():
    money = [dict(W.net_worth_month(sheet(), TODAY, set())[0], importance=1.0)]
    assert L.plan_episode(BIZ + money, [])['cold_open'] != 'personal.networth'


def test_history_remembers_once_only_money_facts():
    money = W.net_worth_month(sheet(), TODAY, set())
    plan = L.plan_episode(BIZ + money, [])
    rec = L.history_record('ep', plan, BIZ + money)
    assert W.seen_keys([rec]) == {'personal.networth.2026-09'}
    assert W.net_worth_month(sheet(), TODAY, W.seen_keys([rec])) == []
