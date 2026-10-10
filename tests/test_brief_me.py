"""Brief Me anti-repetition engine and script guard.

Run: python3 -m pytest tests/test_brief_me.py -q
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'dashboard'))
from brief_me import facts as F      # noqa: E402
from brief_me import lenses as L     # noqa: E402


def fact(id, area, lenses, value=10, importance=0.6, text=None, series=None):
    f = {'id': id, 'area': area, 'lenses': lenses, 'value': value,
         'importance': importance, 'text': text or f'{id} is {value}.', 'source': 't'}
    if series:
        f['series'] = series
    return f


FACTS = [
    fact('a.trend', 'traffic', ['trend'], 335),
    fact('a.page', 'traffic', ['spotlight', 'mover'], 123),
    fact('a.h2h', 'traffic', ['head_to_head'], 440),
    fact('s.clicks', 'search', ['trend'], 190),
    fact('s.top', 'search', ['spotlight'], 47),
    fact('e.sales', 'etsy', ['trend'], 58),
    fact('e.best', 'etsy', ['spotlight', 'quiet_win'], 7),
    fact('m.mtd', 'money', ['trend', 'spotlight'], 29, importance=0.7),
    fact('f.leak', 'funnel', ['leak', 'experiment'], None, importance=0.5, text='Half drop off.'),
    fact('ceo.move', 'ceo', ['ceo'], None, importance=0.9, text='No move today.'),
    fact('ceo.sit.0', 'ceo', ['ceo', 'watch'], None, importance=0.7, text='Sale ends 10-12.'),
]


def run_episodes(n, facts=FACTS, full=True):
    """Rotation tests run the complete episode ("brief me full"); without it a
    re-run on unchanged data is, correctly, a one-slide card."""
    history, plans = [], []
    for i in range(n):
        plan = L.plan_episode(facts, history, full=full)
        plans.append(plan)
        history.append(L.history_record(f'ep{i}', plan, facts))
    return plans


# ---------- novelty ----------

def test_novelty_new_fact_is_full():
    assert L.novelty(FACTS[0], []) == 1.0


def test_novelty_unchanged_fact_is_low():
    hist = [{'facts': {'a.trend': 335}}]
    assert L.novelty(FACTS[0], hist) <= 0.2


def test_novelty_moved_fact_is_news_again():
    hist = [{'facts': {'a.trend': 250}}]
    assert L.novelty(FACTS[0], hist) >= 0.9


def test_novelty_tiny_move_is_not_news():
    hist = [{'facts': {'a.trend': 330}}]   # 1.5% move
    assert L.novelty(FACTS[0], hist) < 0.5


def test_novelty_text_fact_changes_with_text():
    f = FACTS[8]
    hist = [{'facts': {f['id']: L.signature(f)}}]
    assert L.novelty(f, hist) < 0.5
    assert L.novelty(dict(f, text='Something else now.'), hist) >= 0.9


# ---------- lens rotation and openers ----------

def test_lens_never_repeats_back_to_back_for_an_area():
    plans = run_episodes(6)
    for prev, cur in zip(plans, plans[1:]):
        last = {s['area']: s['lens'] for s in prev['slides'] if s['slot'] == 'area'}
        for s in cur['slides']:
            if s['slot'] == 'area' and s['area'] in last and len(
                    {l for f in FACTS if f['area'] == s['area'] for l in f['lenses']}) > 1:
                assert s['lens'] != last[s['area']], f"{s['area']} repeated lens {s['lens']}"


def test_cold_open_differs_across_three_runs_on_same_data():
    opens = [p['cold_open'] for p in run_episodes(3)]
    assert len(set(opens)) == 3, opens


def test_lens_rotation_beats_material():
    # The last-used lens has far more material, but must still not repeat.
    fs = [fact('t1', 'x', ['trend'], 1, importance=1.0), fact('t2', 'x', ['trend'], 2, importance=1.0),
          fact('s1', 'x', ['spotlight'], 3, importance=0.1)]
    hist = [{'slides': [{'area': 'x', 'lens': 'spotlight'}], 'facts': {}},
            {'slides': [{'area': 'x', 'lens': 'trend'}], 'facts': {}}]
    assert L.pick_lens('x', fs, hist) == 'spotlight'


def test_recent_opener_cannot_open_again_even_if_best():
    best = dict(fact('star', 'money', ['trend'], 500, importance=1.0), score=1.0, novelty=1.0)
    other = dict(fact('meh', 'etsy', ['trend'], 5, importance=0.2), score=0.2, novelty=1.0)
    hist = [{'cold_open': 'star', 'slides': [], 'facts': {}}]
    assert L.pick_cold_open([best, other], set(), hist)['id'] == 'meh'
    assert L.pick_cold_open([best, other], set(), [])['id'] == 'star'


def test_area_line_up_changes_on_same_data():
    plans = run_episodes(3)
    lineups = [tuple((s['area'], s['lens']) for s in p['slides'] if s['slot'] == 'area') for p in plans]
    assert len(set(lineups)) == 3, lineups


def test_fixed_slots_always_present():
    for p in run_episodes(3):
        slots = [s['slot'] for s in p['slides']]
        assert slots[0] == 'cold_open' and slots[1] == 'calendar'
        assert slots[-2:] == ['ceo', 'close']


def test_area_count_bounded():
    for p in run_episodes(4):
        n = sum(1 for s in p['slides'] if s['slot'] == 'area')
        assert L.MIN_AREAS <= n <= L.MAX_AREAS


def test_quiet_areas_are_skipped_not_dropped():
    many = FACTS + [fact(f'x{i}.f', f'x{i}', ['trend'], 1, importance=0.05) for i in range(4)]
    p = L.plan_episode(many, [], full=True)
    assert {'x0', 'x1', 'x2', 'x3'} <= set(p['quiet_areas'])


def test_cold_open_is_never_a_data_outage():
    outage = fact('health.down', 'health', ['housekeeping'], None, importance=1.0, text='Supabase down.')
    p = L.plan_episode(FACTS + [outage], [], full=True)
    assert p['cold_open'] != 'health.down'
    assert any(f['id'] == 'health.down' for f in p['slides'][-1]['facts'])


# ---------- script guard ----------

def script(narration, ids=('a.trend',), **kw):
    return {'slides': [dict({'title': 'T', 'narration': narration, 'fact_ids': list(ids)}, **kw)]}


def test_validate_accepts_cited_numbers():
    assert L.validate_script(script('Sessions hit 335 this week.'), FACTS) == []


def test_validate_rejects_uncited_number():
    probs = L.validate_script(script('Sessions hit 412 this week.'), FACTS)
    assert any('412' in p for p in probs)


def test_validate_rejects_number_from_uncited_fact():
    probs = L.validate_script(script('Sessions hit 190.'), FACTS)   # 190 belongs to s.clicks
    assert any('190' in p for p in probs)


def test_validate_checks_big_number_and_bullets():
    probs = L.validate_script(script('ok', big_number={'value': '999'}, bullets=['also 777']), FACTS)
    assert any('999' in p for p in probs) and any('777' in p for p in probs)


def test_validate_checks_delta_pill():
    probs = L.validate_script(script('ok', big_number={'value': '335', 'delta': {'text': '+44%', 'dir': 'up'}}), FACTS)
    assert any('44' in p for p in probs)


def test_validate_rejects_unknown_fact():
    assert L.validate_script(script('ok', ids=('nope',)), FACTS)


def test_validate_rejects_em_dash():
    assert any('em-dash' in p for p in L.validate_script(script('Up — nicely.'), FACTS))


def test_validate_allows_rounding_and_money_format():
    f = [fact('m', 'money', ['trend'], 58.0, text='Last 30 days $58.00 gross.')]
    assert L.validate_script(script('We made $58 this month.', ids=('m',)), f) == []


# ---------- extraction ----------

def test_ceo_brief_parse():
    md = ('---\ntype: ceo-brief\n---\n\nImage spend: $0.00.\n\n**1. New since yesterday**\n- Quiet day.\n'
          '\n**3. In the sit window**\n- Sale ends 10-12.\n- Read 10-14.\n\n**4. Suggested move**\nNo move today.\n')
    b = F.parse_ceo_brief(md)
    assert b['new'] == ['Quiet day.'] and len(b['sit']) == 2 and b['move'] == 'No move today.'


def test_feedback_is_anonymised():
    d = {'feedback': {'recent': [{'text': 'Email me at jane.doe@example.com please', 'email': 'jane.doe@example.com',
                                  'date': '2026-10-01T10:00'}]}}
    out = F.command_center_facts(d)
    assert not any('example.com' in f['text'] for f in out)


if __name__ == '__main__':
    failed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith('test_') and callable(fn):
            try:
                fn()
            except Exception as e:
                failed += 1
                print(f'FAIL {name}: {e!r}'[:300])
    print(f'{failed} failed')
    sys.exit(1 if failed else 0)



# ---------- trip area (gating, collapse, calendar merge) ----------

import json, os, subprocess                       # noqa: E402

TRIP = {'id': 9, 'name': 'Test trip', 'location': 'Sayulita, Nayarit, Mexico',
        'starts_on': '2026-10-26', 'ends_on': '2026-12-03', 'currency': 'MXN'}


def trip_ctx(today='2026-10-28', **kw):
    ctx = {'today': today, 'trip': TRIP,
           'yday_spend': [{'category': 'food', 'currency': 'MXN', 'total': 480, 'n': 2},
                          {'category': 'beer', 'currency': 'MXN', 'total': 300, 'n': 3}],
           'trip_spend': [{'currency': 'MXN', 'total': 2200, 'days': 2}],
           'daily_spend': [{'day': '2026-10-26', 'total': 1420}, {'day': '2026-10-27', 'total': 780}],
           'yday_people': ['JP', 'Rick'], 'yday_new': [{'name': 'Rick', 'description': 'surf shop'}],
           'commitments': [{'what': 'Dinner', 'with': ['JP'], 'date': '2026-10-29', 'time': '7:00 PM'}],
           'events': [{'title': 'Jazz night', 'venue': 'Wine Shop', 'date': '2026-10-28', 'time': '8:00 PM'}]}
    ctx.update(kw)
    return ctx


def test_trip_facts_only_inside_a_trip():
    assert F.trip_facts(None) == []
    assert F.trip_facts(trip_ctx(trip=None)) == []
    assert F.trip_facts(trip_ctx(today='2026-10-25')) == []       # the night before
    assert F.trip_facts(trip_ctx(today='2026-12-04')) == []       # the morning after
    ids = {f['id'] for f in F.trip_facts(trip_ctx())}
    assert {'trip.day', 'trip.spend.yday', 'trip.spend.total', 'trip.people',
            'trip.commitments', 'trip.events'} <= ids


def test_trip_facts_numbers_and_viz():
    by = {f['id']: f for f in F.trip_facts(trip_ctx())}
    assert by['trip.day']['value'] == 3 and 'Day 3 of 39' in by['trip.day']['text']
    assert by['trip.spend.yday']['value'] == 780 and by['trip.spend.yday']['series'] == [480, 300]
    assert '1,100 MXN a day' in by['trip.spend.total']['text']
    people = by['trip.people']['viz']['people']
    assert [p['name'] for p in people if p['new']] == ['Rick']


def test_commitments_join_the_calendar_week():
    facts = F.calendar_facts([{'summary': 'Eye exam', 'start': '2026-10-29T09:00:00-07:00'}], today='2026-10-28')
    F.merge_commitments_into_week(facts, trip_ctx()['commitments'])
    ev = next(f for f in facts if f['id'] == 'calendar.week')['viz']['events']
    assert [e['title'] for e in ev] == ['Eye exam', 'Dinner'] and ev[1]['kind'] == 'trip'


def test_trip_leads_and_business_collapses_to_one_headline():
    p = L.plan_episode(FACTS + F.trip_facts(trip_ctx()), [], today='2026-10-28')
    slots = [s['slot'] for s in p['slides']]
    assert p['format'] == 'trip' and slots[0] == 'trip'
    assert slots.count('business') == 1 and 'area' not in slots and 'ceo' not in slots
    assert slots.index('business') > max(i for i, x in enumerate(slots) if x == 'trip')


def test_red_health_keeps_business_slides_on_a_trip():
    red = fact('health.down', 'health', ['housekeeping'], None, importance=0.9, text='Stripe down.')
    p = L.plan_episode(FACTS + [red] + F.trip_facts(trip_ctx()), [], today='2026-10-28')
    slots = [s['slot'] for s in p['slides']]
    assert slots[0] == 'trip' and 'area' in slots and 'business' not in slots


def test_full_on_a_trip_keeps_business_slides():
    p = L.plan_episode(FACTS + F.trip_facts(trip_ctx()), [], today='2026-10-28', full=True)
    slots = [s['slot'] for s in p['slides']]
    assert 'business' not in slots and slots.count('area') >= L.MIN_AREAS


def test_no_trip_no_trip_slides():
    p = L.plan_episode(FACTS, [], today='2026-10-10')
    assert p['format'] != 'trip' and not any(s['area'] == 'trip' for s in p['slides'])


def _briefme(tmp_path, monkeypatch):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'dashboard'))
    import briefme
    monkeypatch.setattr(briefme, 'HOME', tmp_path)
    monkeypatch.setattr(briefme, 'HISTORY', tmp_path / 'history.jsonl')
    monkeypatch.setattr(briefme, 'TRIP_WINDOWS', tmp_path / 'trip-windows.json')
    return briefme


def test_trip_ledger_outage_during_a_trip_is_red(tmp_path, monkeypatch):
    bm = _briefme(tmp_path, monkeypatch)
    (tmp_path / 'trip-windows.json').write_text(json.dumps([{'starts_on': '2026-10-26', 'ends_on': '2026-12-03'}]))
    def down(today):
        raise OSError('no route to host')
    monkeypatch.setattr(bm.T, 'load_trip', down)
    ctx, note = bm.trip_context('2026-11-02')
    assert ctx is None and note[0]['id'] == 'health.trip_ledger' and note[0]['importance'] >= L.RED
    assert bm.trip_context('2026-10-20') == (None, [])          # outside any trip: silent


# ---------- episode length follows the news ----------

def test_tier_thresholds():
    assert L.pick_tier(0.2, red=False) == 'card'
    assert L.pick_tier(0.2, red=True) == 'short'                 # something red is never a card
    assert L.pick_tier(L.CARD_BELOW, red=False) == 'short'
    assert L.pick_tier(L.FULL_FROM, red=False) == 'full'
    assert L.pick_tier(0.0, red=False, full=True) == 'full'


def test_same_data_again_is_a_card_with_no_voice():
    p1 = L.plan_episode(FACTS, [], today='2026-10-10')
    assert p1['tier'] == 'full'                                   # first episode: all news
    hist = [L.history_record('2026-10-10-0400', p1, FACTS)]
    p2 = L.plan_episode(FACTS, hist, today='2026-10-11')
    assert p2['tier'] == 'card' and p2['news'] == 0
    assert len(p2['slides']) == 1 and p2['slides'][0]['slot'] == 'card'


def test_unsaid_facts_do_not_count_as_news_twice():
    p1 = L.plan_episode(FACTS, [], today='2026-10-10')
    said = {f['id'] for s in p1['slides'] for f in s['facts']}
    assert set(f['id'] for f in FACTS) - said                     # some facts never made air
    hist = [L.history_record('2026-10-10-0400', p1, FACTS)]
    assert L.plan_episode(FACTS, hist, today='2026-10-11')['news'] == 0


def test_some_news_is_a_short_episode():
    p1 = L.plan_episode(FACTS, [], today='2026-10-10')
    hist = [L.history_record('2026-10-10-0400', p1, FACTS)]
    moved = [dict(f, value=f['value'] * 2) if f['id'] in ('m.mtd', 's.clicks') else f for f in FACTS]
    p = L.plan_episode(moved, hist, today='2026-10-11')
    assert p['tier'] == 'short' and 4 <= len(p['slides']) <= 5, [s['slot'] for s in p['slides']]


def test_lots_of_news_is_a_full_episode():
    p1 = L.plan_episode(FACTS, [], today='2026-10-10')
    hist = [L.history_record('2026-10-10-0400', p1, FACTS)]
    moved = [dict(f, value=f['value'] * 2) if f.get('value') else f for f in FACTS]
    p = L.plan_episode(moved, hist, today='2026-10-11')
    assert p['tier'] == 'full' and len(p['slides']) >= 7


def test_full_flag_overrides_a_quiet_day():
    p1 = L.plan_episode(FACTS, [], today='2026-10-10')
    hist = [L.history_record('2026-10-10-0400', p1, FACTS)]
    p = L.plan_episode(FACTS, hist, today='2026-10-11', full=True)
    assert p['tier'] == 'full' and p['format'] == 'standard' and len(p['slides']) >= 7


# ---------- weekday formats ----------

def test_monday_is_the_week_ahead():
    p = L.plan_episode(FACTS, [], today='2026-10-12')
    assert p['format'] == 'week_ahead'
    assert [s['lens'] for s in p['slides'][:3]] == ['cold_open', 'week_ahead', 'ceo']


def test_wednesday_is_a_three_slide_deep_dive_on_one_area():
    p = L.plan_episode(FACTS, [], today='2026-10-14')
    area = [s for s in p['slides'] if s['slot'] == 'area']
    assert p['format'] == 'deep_dive' and len(area) == 3
    assert {s['area'] for s in area} == {p['deep_area']}
    ids = [f['id'] for s in area for f in s['facts']]
    assert len(ids) == len(set(ids))                              # three slides, no fact twice


def test_deep_dive_area_rotates_week_to_week():
    p1 = L.plan_episode(FACTS, [], today='2026-10-14')
    hist = [L.history_record('2026-10-14-0400', p1, FACTS)]
    p2 = L.plan_episode(FACTS, hist, today='2026-10-21', full=False)
    if p2['format'] == 'deep_dive':
        assert p2['deep_area'] != p1['deep_area']
    p3 = L.plan_episode([dict(f, value=(f['value'] or 0) + 99) for f in FACTS], hist, today='2026-10-21')
    assert p3['format'] == 'deep_dive' and p3['deep_area'] != p1['deep_area']


def test_friday_is_the_week_in_review_on_trend_lenses():
    p = L.plan_episode(FACTS, [], today='2026-10-16')
    area = [s for s in p['slides'] if s['slot'] == 'area']
    assert p['format'] == 'week_review' and area
    for s in area:
        if any('trend' in f['lenses'] for f in FACTS if f['area'] == s['area']):
            assert s['lens'] == 'trend', (s['area'], s['lens'])


def test_friday_review_is_not_silenced_by_this_weeks_episodes():
    p1 = L.plan_episode(FACTS, [], today='2026-10-14')
    hist = [L.history_record('2026-10-14-0400', p1, FACTS)]     # Wednesday said it all
    assert L.plan_episode(FACTS, hist, today='2026-10-15')['tier'] == 'card'
    assert L.plan_episode(FACTS, hist, today='2026-10-16')['tier'] == 'full'


def test_other_days_use_the_standard_format_and_full_beats_weekday():
    assert L.plan_episode(FACTS, [], today='2026-10-13')['format'] == 'standard'
    assert L.plan_episode(FACTS, [], today='2026-10-14', full=True)['format'] == 'standard'


# ---------- no-repeat phrasing ----------

def sc(*narrations, headline=''):
    return {'headline': headline, 'slides': [{'narration': n} for n in narrations]}


OLD = [('2026-10-09-0400', sc('Good morning from the numbers desk, where coffee is strong.',
                              'Google sent 190 clicks to Carnivore Weekly this week, up from last week.'))]


def test_repeat_flags_same_opener():
    p = L.repeat_problems(sc('Good morning from the numbers desk again, folks.'), OLD)
    assert any('episode opens with' in x for x in p), p


def test_repeat_flags_near_duplicate_sentence_even_with_new_numbers():
    p = L.repeat_problems(sc('Fresh start today.', 'Google sent 204 clicks to Carnivore Weekly this week, up from last week.'), OLD)
    assert any('is close to 2026-10-09-0400' in x for x in p), p


def test_repeat_allows_fresh_phrasing_and_short_stock_lines():
    p = L.repeat_problems(sc('Etsy had a loud Thursday.', 'Search clicks climbed to 204, a quiet win for the blog.',
                             'That is all.'), OLD + [('x', sc('Short one.', 'That is all.'))])
    assert p == [], p


def test_repeat_flags_reused_slide_opener():
    p = L.repeat_problems(sc('New day.', 'Google sent Carnivore Weekly fewer people today.'),
                          [('e1', sc('Hi.', 'Google sent Carnivore Weekly fewer readers than hoped.'))])
    assert any('slide 1 opens' in x for x in p), p


def test_check_compares_only_the_last_seven_published_scripts(tmp_path, monkeypatch):
    bm = _briefme(tmp_path, monkeypatch)
    rows = []
    for i in range(9):
        stamp = f'2026-10-0{i + 1}-0400'
        d = tmp_path / 'episodes' / stamp
        d.mkdir(parents=True)
        (d / 'script.json').write_text(json.dumps(sc(f'Opener number {i}.')))
        rows.append(json.dumps({'stamp': stamp}))
    (tmp_path / 'history.jsonl').write_text('\n'.join(rows) + '\n')
    got = [s for s, _ in bm.recent_scripts()]
    assert len(got) == L.REPEAT_EPISODES and got[-1] == '2026-10-09-0400' and '2026-10-02-0400' not in got


def _episode(tmp_path, plan, script, facts=FACTS):
    d = tmp_path / 'episodes' / '2026-10-11-0400'
    d.mkdir(parents=True)
    (d / 'facts.json').write_text(json.dumps(facts))
    (d / 'plan.json').write_text(json.dumps(plan))
    (d / 'script.json').write_text(json.dumps(script))
    return d


def _check(tmp_path, d):
    env = dict(os.environ, BRIEF_ME_HOME=str(tmp_path))
    return subprocess.run([sys.executable, str(Path(__file__).resolve().parent.parent / 'dashboard' / 'briefme.py'),
                           'check', str(d)], capture_output=True, text=True, env=env)


def test_check_command_rejects_a_repeated_opener(tmp_path):
    old = tmp_path / 'episodes' / '2026-10-10-0400'
    old.mkdir(parents=True)
    (old / 'script.json').write_text(json.dumps(sc('Good morning from the numbers desk, where coffee is strong.')))
    (tmp_path / 'history.jsonl').write_text(json.dumps({'stamp': '2026-10-10-0400'}) + '\n')
    plan = {'tier': 'card', 'slides': [{'slot': 'card'}]}
    script = {'slides': [{'title': 'Quiet', 'fact_ids': ['a.trend'],
                          'narration': 'Good morning from the numbers desk. Sessions sat at 335.'}]}
    r = _check(tmp_path, _episode(tmp_path, plan, script))
    assert r.returncode == 1 and 'episode opens with' in r.stdout, r.stdout


def test_check_command_holds_slide_count_to_the_plan(tmp_path):
    plan = {'tier': 'card', 'slides': [{'slot': 'card'}]}
    script = {'slides': [{'title': 'A', 'fact_ids': ['a.trend'], 'narration': 'Sessions sat at 335.'},
                         {'title': 'B', 'fact_ids': ['a.trend'], 'narration': 'Still 335.'}]}
    r = _check(tmp_path, _episode(tmp_path, plan, script))
    assert r.returncode == 1 and 'the plan has 1' in r.stdout, r.stdout


def test_repeat_masks_numbers_so_a_number_swap_is_still_a_repeat():
    old = [('e1', sc('Hi.', 'Sessions 335, clicks 190, signups 4 and sales 58 today.'))]
    p = L.repeat_problems(sc('Hello.', 'Sessions 340, clicks 204, signups 6 and sales 59 today.'), old)
    assert any('is close to e1' in x for x in p), p
