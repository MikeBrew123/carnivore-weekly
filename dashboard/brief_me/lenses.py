"""The anti-repetition engine: novelty scoring, lens rotation, script checks.

History is a list of past episode records (newest last), each:
    {"stamp": "...", "cold_open": "<fact id>", "close": "<fact id>",
     "slides": [{"area": "...", "lens": "..."}],
     "facts": {"<fact id>": <value or text signature>}}
"""

import hashlib
import re

LENSES = ['trend', 'mover', 'spotlight', 'voice', 'experiment', 'leak',
          'quiet_win', 'head_to_head']

MIN_AREAS, MAX_AREAS = 3, 5
COLD_OPEN_MEMORY = 5        # a fact cannot open the show again for 5 episodes
REPEAT_REL_CHANGE = 0.10    # a number must move 10% before it is "news" again
QUIET_THRESHOLD = 0.15      # areas scoring below this get a one-liner, not a slide


def signature(fact):
    if fact.get('value') is not None:
        return fact['value']
    return hashlib.sha1(fact['text'].encode()).hexdigest()[:12]


def novelty(fact, history):
    """1.0 if never said or it moved; low if we said the same thing recently."""
    sig = signature(fact)
    for back, ep in enumerate(reversed(history)):
        if fact['id'] not in ep.get('facts', {}):
            continue
        old = ep['facts'][fact['id']]
        if isinstance(sig, (int, float)) and isinstance(old, (int, float)):
            base = max(abs(old), 1e-9)
            if abs(sig - old) / base >= REPEAT_REL_CHANGE and abs(sig - old) >= 1:
                return 0.9                     # said before, but it moved
        elif sig != old:
            return 0.9
        return min(0.6, 0.1 + 0.1 * back)      # same as last time; fades back in
    return 1.0


def score(fact, history):
    return round(fact['importance'] * novelty(fact, history), 4)


def _lens_age(area, lens, history):
    """Episodes since this area last used this lens (large = long ago)."""
    for back, ep in enumerate(reversed(history)):
        if any(s['area'] == area and s['lens'] == lens for s in ep.get('slides', [])):
            return back
    return 10_000


def pick_lens(area, facts, history):
    available = sorted({l for f in facts for l in f['lenses'] if l in LENSES})
    if not available:
        return None
    # Least recently used first (the lens used last time is always the most
    # recent, so it never repeats back to back), then by how much material it has.
    return max(available, key=lambda l: (_lens_age(area, l, history),
                                    sum(score(f, history) for f in facts if l in f['lenses'])))


# Fixed slots every episode; health (data outages) rides on the close slide.
FIXED_AREAS = {'ceo', 'calendar', 'health'}


def pick_cold_open(scored, on_slides, history):
    recent_opens = {ep.get('cold_open') for ep in history[-COLD_OPEN_MEMORY:]}
    candidates = [f for f in scored if f['area'] not in FIXED_AREAS
                  and f.get('value') is not None and f['id'] not in recent_opens]
    return max(candidates, key=lambda f: (f['id'] not in on_slides, f['score'], f['novelty']),
               default=None)


def plan_episode(facts, history):
    scored = [dict(f, score=score(f, history), novelty=novelty(f, history)) for f in facts]
    by_area = {}
    for f in scored:
        by_area.setdefault(f['area'], []).append(f)

    area_scores = {a: max(f['score'] for f in fs) for a, fs in by_area.items()
                   if a not in FIXED_AREAS}
    ranked = sorted(area_scores, key=lambda a: -area_scores[a])
    chosen = [a for a in ranked if area_scores[a] >= QUIET_THRESHOLD][:MAX_AREAS]
    for a in ranked:                       # always show at least MIN_AREAS
        if len(chosen) >= MIN_AREAS:
            break
        if a not in chosen:
            chosen.append(a)
    quiet = [a for a in ranked if a not in chosen]

    area_slides = []
    for a in chosen:
        lens = pick_lens(a, by_area[a], history)
        fs = sorted([f for f in by_area[a] if lens in f['lenses']],
                    key=lambda f: -f['score'])[:3]
        area_slides.append({'slot': 'area', 'area': a, 'lens': lens, 'facts': fs})

    # Cold open: the best fresh numeric fact not used as an opener recently,
    # preferring one the area slides are not already going to say.
    cold = pick_cold_open(scored, {f['id'] for s in area_slides for f in s['facts']}, history)

    slides = [{'slot': 'cold_open', 'area': cold['area'] if cold else None,
               'lens': 'cold_open', 'facts': [cold] if cold else []}]
    slides.append({'slot': 'calendar', 'area': 'calendar', 'lens': 'calendar',
                   'facts': by_area.get('calendar', [])[:8]})
    slides += area_slides
    ceo = by_area.get('ceo', [])
    slides.append({'slot': 'ceo', 'area': 'ceo', 'lens': 'ceo',
                   'facts': sorted([f for f in ceo if f['id'] == 'ceo.move' or f['id'].startswith('ceo.sit')],
                                   key=lambda f: -f['score'])[:4]})

    recent_close = {ep.get('close') for ep in history[-3:]}
    watch = [f for f in scored if ('watch' in f['lenses'] or f['area'] == 'funnel')
             and f['id'] not in recent_close]
    close = max(watch, key=lambda f: f['score'], default=None)
    health = by_area.get('health', [])
    slides.append({'slot': 'close', 'area': 'close', 'lens': 'close',
                   'facts': ([close] if close else []) + health[:2], 'quiet_areas': quiet})
    return {'slides': slides, 'quiet_areas': quiet,
            'cold_open': cold['id'] if cold else None,
            'close': close['id'] if close else None}


def history_record(stamp, plan, facts):
    used = {f['id'] for s in plan['slides'] for f in s['facts']}
    return {'stamp': stamp, 'cold_open': plan.get('cold_open'), 'close': plan.get('close'),
            'slides': [{'area': s['area'], 'lens': s['lens']}
                       for s in plan['slides'] if s['slot'] == 'area'],
            'facts': {f['id']: signature(f) for f in facts if f['id'] in used}}


# ---------- script validation ----------

NUM_RE = re.compile(r'(?<![\w.])\$?\d[\d,]*(?:\.\d+)?')
SMALL_OK = {str(n) for n in range(0, 11)}    # "one thing", "two weeks", slide counts


def _nums(text):
    return {m.group().lstrip('$').replace(',', '') for m in NUM_RE.finditer(text or '')}


def _variants(n):
    out = {n}
    try:
        x = float(n)
        out |= {f'{x:g}', f'{round(x)}', f'{x:.1f}', f'{x:.2f}', f'{abs(x):g}', f'{round(abs(x))}'}
    except ValueError:
        pass
    return out


def validate_script(script, facts):
    """Return a list of problems. Empty list = safe to render.

    Rules: every slide cites facts that exist; every number in its title,
    big number, bullets and narration appears in a cited fact; no em-dashes.
    """
    by_id = {f['id']: f for f in facts}
    problems = []
    for i, s in enumerate(script.get('slides', [])):
        cited = s.get('fact_ids') or []
        missing = [c for c in cited if c not in by_id]
        if missing:
            problems.append(f'slide {i}: cites unknown facts {missing}')
        allowed = set(SMALL_OK)
        for c in cited:
            if c in by_id:
                for n in _nums(by_id[c]['text']) | ({str(by_id[c]['value'])} if by_id[c].get('value') is not None else set()):
                    allowed |= _variants(n)
                for n in by_id[c].get('series') or []:
                    allowed |= _variants(str(n))
        big = s.get('big_number') or {}
        texts = [s.get('title', ''), s.get('kicker', ''), s.get('narration', ''),
                 str(big.get('value', '')), *(s.get('bullets') or [])]
        for t in texts:
            if '—' in t:
                problems.append(f'slide {i}: em-dash in "{t[:40]}"')
            for n in _nums(t):
                if not (_variants(n) & allowed):
                    problems.append(f'slide {i}: number {n} is not in any cited fact')
    return problems
