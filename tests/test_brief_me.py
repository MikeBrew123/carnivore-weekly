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


def run_episodes(n, facts=FACTS):
    history, plans = [], []
    for i in range(n):
        plan = L.plan_episode(facts, history)
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
    p = L.plan_episode(many, [])
    assert {'x0', 'x1', 'x2', 'x3'} <= set(p['quiet_areas'])


def test_cold_open_is_never_a_data_outage():
    outage = fact('health.down', 'health', ['housekeeping'], None, importance=1.0, text='Supabase down.')
    p = L.plan_episode(FACTS + [outage], [])
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
