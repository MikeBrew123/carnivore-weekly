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


def _moved(sig, old):
    if isinstance(sig, (int, float)) and isinstance(old, (int, float)):
        return abs(sig - old) / max(abs(old), 1e-9) >= REPEAT_REL_CHANGE and abs(sig - old) >= 1
    return sig != old


def novelty(fact, history):
    """1.0 if never said or it moved; low if we said the same thing recently."""
    sig = signature(fact)
    for back, ep in enumerate(reversed(history)):
        if fact['id'] not in ep.get('facts', {}):
            continue
        if _moved(sig, ep['facts'][fact['id']]):
            return 0.9                         # said before, but it moved
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
NOT_BUSINESS = FIXED_AREAS | {'trip'}

# Episode length follows the news. `news` is the summed score of facts that are
# new or have moved since they were last said (novelty >= 0.9), so a day where
# nothing changed scores near zero however many facts exist. Calibrated
# 2026-10-10 on the live Command Center (about 13 points of importance in
# total): a same-day re-run scores 0, a day where 15% of numbers move about 2,
# a day where 40% move about 5.
CARD_BELOW = 1.0            # one slide, no voice
FULL_FROM = 3.0             # below this, a short (4 to 5 slide) episode
TIER_SLIDES = {'card': (1, 1), 'short': (3, 6), 'full': (6, 12)}
TIER_WORDS = {'card': (0, 90), 'short': (180, 420), 'full': (450, 850)}

# Weekday formats (Monday is 0). Other days are 'standard'.
WEEKDAY_FORMAT = {0: 'week_ahead', 2: 'deep_dive', 4: 'week_review'}
DEEP_DIVE_SLIDES = 3
DEEP_DIVE_MEMORY = 2        # an area cannot be the deep dive twice in 2 deep dives
RED = 0.8                   # health facts at or above this importance are "red"


def pick_cold_open(scored, on_slides, history):
    recent_opens = {ep.get('cold_open') for ep in history[-COLD_OPEN_MEMORY:]}
    candidates = [f for f in scored if f['area'] not in NOT_BUSINESS
                  and f.get('value') is not None and f['id'] not in recent_opens]
    return max(candidates, key=lambda f: (f['id'] not in on_slides, f['score'], f['novelty']),
               default=None)


def news_level(scored, history=()):
    """How much changed since the last episode, importance-weighted.

    Compares every fact with what the last episode *saw* (said or not), so a
    re-run on the same data is near zero even if most facts never made air.
    Older history without `seen` falls back to novelty against what was said."""
    last = next((ep['seen'] for ep in reversed(history) if ep.get('seen')), None)
    if last is None:
        return round(sum(f['score'] for f in scored if f['area'] not in FIXED_AREAS
                         and f['novelty'] >= 0.9), 3)
    return round(sum(f['importance'] for f in scored if f['area'] not in FIXED_AREAS
                     and (f['id'] not in last or _moved(signature(f), last[f['id']]))), 3)


def pick_tier(news, red, full=False):
    if full:
        return 'full'
    if news < CARD_BELOW:
        return 'short' if red else 'card'
    return 'short' if news < FULL_FROM else 'full'


def _weekday(today):
    from datetime import date
    return (date.fromisoformat(today) if isinstance(today, str) else today).weekday()


def _novelty_history(history, fmt, today):
    """Friday's week in review recaps the week, so it judges novelty against
    what was said before this week, not yesterday."""
    if fmt != 'week_review' or today is None:
        return history
    from datetime import date, timedelta
    cutoff = ((date.fromisoformat(today) if isinstance(today, str) else today) - timedelta(days=6)).isoformat()
    return [h for h in history if (h.get('stamp') or '')[:10] < cutoff]


def _area_slides(areas, by_area, history, force_lens=None):
    out = []
    for a in areas:
        lens = force_lens if force_lens and any(force_lens in f['lenses'] for f in by_area[a]) \
            else pick_lens(a, by_area[a], history)
        fs = sorted([f for f in by_area[a] if lens in f['lenses']], key=lambda f: -f['score'])[:3]
        out.append({'slot': 'area', 'area': a, 'lens': lens, 'facts': fs})
    return out


def _deep_dive(ranked, by_area, history):
    """One area, three slides, three different angles where the material allows."""
    recent = [ep.get('deep_area') for ep in history if ep.get('deep_area')][-DEEP_DIVE_MEMORY:]
    pool = [a for a in ranked if a not in recent] or ranked
    # Prefer an area with enough distinct material to fill three slides.
    area = max(pool, key=lambda a: (min(len(by_area[a]), DEEP_DIVE_SLIDES), -pool.index(a)))
    used, slides, h = set(), [], list(history)
    for _ in range(DEEP_DIVE_SLIDES):
        left = [f for f in by_area[area] if f['id'] not in used]
        if not left:
            break
        lens = pick_lens(area, left, h) or 'spotlight'
        fs = sorted([f for f in left if lens in f['lenses']], key=lambda f: -f['score'])[:2] or left[:1]
        used |= {f['id'] for f in fs}
        slides.append({'slot': 'area', 'area': area, 'lens': lens, 'facts': fs})
        h.append({'slides': [{'area': area, 'lens': lens}]})   # rotate within the episode too
    return area, slides


def plan_episode(facts, history, today=None, full=False):
    """Plan one episode. `today` (ISO date) picks the weekday format; `full`
    forces the complete standard episode ("brief me full")."""
    red_now = any(f['area'] == 'health' and f['importance'] >= RED for f in facts)
    trip_mode = any(f['area'] == 'trip' for f in facts)
    fmt = 'standard' if full or today is None else WEEKDAY_FORMAT.get(_weekday(today), 'standard')
    if trip_mode and not full:
        fmt = 'trip'                       # on vacation the trip leads, every day
    nov_hist = _novelty_history(history, fmt, today)

    scored = [dict(f, score=score(f, nov_hist), novelty=novelty(f, nov_hist)) for f in facts]
    by_area = {}
    for f in scored:
        by_area.setdefault(f['area'], []).append(f)
    red = [f for f in by_area.get('health', []) if f['importance'] >= RED]
    news = news_level(scored, nov_hist)
    tier = pick_tier(news, bool(red_now), full)
    if tier == 'card':
        fmt = 'card'

    area_scores = {a: max(f['score'] for f in fs) for a, fs in by_area.items()
                   if a not in NOT_BUSINESS}
    ranked = sorted(area_scores, key=lambda a: -area_scores[a])
    ceo = by_area.get('ceo', [])
    ceo_move = [f for f in ceo if f['id'] == 'ceo.move']

    if fmt == 'card':
        top = sorted([f for f in scored if f['area'] not in FIXED_AREAS], key=lambda f: -f['score'])[:3]
        trip_day = [f for f in by_area.get('trip', []) if f['id'] == 'trip.day']
        card = {'slot': 'card', 'area': 'card', 'lens': 'card',
                'facts': trip_day + [f for f in top if f not in trip_day] + red[:2],
                'quiet_areas': ranked}
        return {'slides': [card], 'quiet_areas': ranked, 'cold_open': None, 'close': None,
                'tier': tier, 'format': fmt, 'news': news, 'deep_area': None}

    max_areas = MAX_AREAS if tier == 'full' else (1 if fmt in ('trip', 'week_ahead') else 2)
    min_areas = MIN_AREAS if tier == 'full' else 1
    chosen = [a for a in ranked if area_scores[a] >= QUIET_THRESHOLD][:max_areas]
    for a in ranked:                       # always show at least min_areas
        if len(chosen) >= min_areas:
            break
        if a not in chosen:
            chosen.append(a)

    deep_area = None
    collapse = fmt == 'trip' and not red
    if collapse:
        chosen = []
        headline = sorted([f for f in scored if f['area'] not in NOT_BUSINESS],
                          key=lambda f: -f['score'])[:3]
        area_slides = [{'slot': 'business', 'area': 'business', 'lens': 'headline',
                        'facts': headline + ceo_move}]
    elif fmt == 'deep_dive' and ranked:
        deep_area, area_slides = _deep_dive(ranked, by_area, history)
        chosen = [deep_area]
    else:
        area_slides = _area_slides(chosen, by_area, history,
                                   force_lens='trend' if fmt == 'week_review' else None)
    quiet = [a for a in ranked if a not in chosen]

    calendar = {'slot': 'calendar', 'area': 'calendar',
                'lens': 'week_ahead' if fmt == 'week_ahead' else 'calendar',
                'facts': by_area.get('calendar', [])[:8]}
    ceo_slide = {'slot': 'ceo', 'area': 'ceo', 'lens': 'ceo',
                 'facts': sorted([f for f in ceo if f['id'] in ('ceo.move', 'ceo.timeline')
                                  or f['id'].startswith('ceo.sit')], key=lambda f: -f['score'])[:5]}
    recent_close = {ep.get('close') for ep in history[-3:]}
    watch = [f for f in scored if ('watch' in f['lenses'] or f['area'] == 'funnel')
             and f['area'] != 'trip' and f['id'] not in recent_close]
    close = max(watch, key=lambda f: f['score'], default=None)
    if fmt == 'trip':
        with_ceo = not collapse            # a collapsed business slide carries the move
    elif fmt == 'week_ahead':
        with_ceo = True
    else:
        with_ceo = tier == 'full'
    # The CEO brief's suggested move is the one action on air; with no CEO
    # slide it rides on the close (unless the headline slide already has it).
    close_slide = {'slot': 'close', 'area': 'close', 'lens': 'close',
                   'facts': ([close] if close else []) + by_area.get('health', [])[:2]
                   + (ceo_move if not with_ceo and not collapse else []),
                   'quiet_areas': quiet}

    if fmt == 'trip':
        t = {f['id']: f for f in by_area['trip']}
        pick = lambda *ids: [t[i] for i in ids if i in t]
        trip_slides = [s for s in (
            {'slot': 'trip', 'area': 'trip', 'lens': 'trip_day',
             'facts': pick('trip.day', 'trip.spend.yday', 'trip.spend.total')},
            {'slot': 'trip', 'area': 'trip', 'lens': 'trip_people', 'facts': pick('trip.people')},
            {'slot': 'trip', 'area': 'trip', 'lens': 'trip_plans',
             'facts': pick('trip.commitments', 'trip.events')
             + [f for f in by_area.get('calendar', []) if f['id'] == 'calendar.week']},
        ) if s['facts']]
        slides = trip_slides + area_slides + ([ceo_slide] if with_ceo else []) + [close_slide]
        cold = None
    else:
        cold = pick_cold_open(scored, {f['id'] for s in area_slides for f in s['facts']}, history)
        opener = {'slot': 'cold_open', 'area': cold['area'] if cold else None,
                  'lens': 'cold_open', 'facts': [cold] if cold else []}
        if fmt == 'week_ahead':
            middle = [calendar, ceo_slide] + area_slides
        elif fmt == 'week_review':
            middle = area_slides + ([ceo_slide] if with_ceo else [])
        elif tier == 'short':
            middle = ([calendar] if fmt != 'deep_dive' else []) + area_slides
        else:
            middle = [calendar] + area_slides + [ceo_slide]
        slides = [opener] + middle + [close_slide]

    return {'slides': slides, 'quiet_areas': quiet,
            'cold_open': cold['id'] if cold else None,
            'close': close['id'] if close else None,
            'tier': tier, 'format': fmt, 'news': news, 'deep_area': deep_area}


def history_record(stamp, plan, facts):
    used = {f['id'] for s in plan['slides'] for f in s['facts']}
    return {'stamp': stamp, 'cold_open': plan.get('cold_open'), 'close': plan.get('close'),
            'tier': plan.get('tier'), 'format': plan.get('format'), 'deep_area': plan.get('deep_area'),
            'slides': [{'area': s['area'], 'lens': s['lens']}
                       for s in plan['slides'] if s['slot'] == 'area'],
            'facts': {f['id']: signature(f) for f in facts if f['id'] in used},
            'seen': {f['id']: signature(f) for f in facts}}


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
                 str(big.get('value', '')), str((big.get('delta') or {}).get('text', '')),
                 *(s.get('bullets') or [])]
        for t in texts:
            if '—' in t:
                problems.append(f'slide {i}: em-dash in "{t[:40]}"')
            for n in _nums(t):
                if not (_variants(n) & allowed):
                    problems.append(f'slide {i}: number {n} is not in any cited fact')
    return problems


# ---------- no-repeat phrasing ----------

REPEAT_EPISODES = 7         # compare against the last 7 published scripts
OPENER_WORDS = 4            # the show's first words
SLIDE_OPENER_WORDS = 5      # each slide's first words
NGRAM = 3
NEAR_DUP = 0.6              # share of a sentence's trigrams already said
MIN_SENTENCE_WORDS = 6      # "Short and sweet." is allowed to recur


def _norm_words(text):
    text = re.sub(r'\d[\d,.]*', '#', (text or '').lower().replace("'", ''))
    return re.findall(r"[a-z#]+", text)


def _sentences(text):
    return [x.strip() for x in re.split(r'(?<=[.!?])\s+', text or '') if x.strip()]


def _grams(words, n=NGRAM):
    return {tuple(words[i:i + n]) for i in range(len(words) - n + 1)}


def repeat_problems(script, recent):
    """Flag phrasing reused from recent episodes. `recent` is a list of
    (stamp, script) pairs, newest last. Numbers are masked, so "335 sessions"
    and "340 sessions" in the same sentence frame count as a repeat."""
    problems = []
    slides = script.get('slides', [])
    if not slides or not recent:
        return problems
    first = lambda t, n: ' '.join(_norm_words(t)[:n])
    old_opens, old_slide_opens, old_sents = {}, {}, []
    for stamp, sc in recent:
        ss = sc.get('slides') or []
        if ss:
            old_opens.setdefault(first(ss[0].get('narration'), OPENER_WORDS), stamp)
        for s in ss:
            old_slide_opens.setdefault(first(s.get('narration'), SLIDE_OPENER_WORDS), stamp)
            for sent in _sentences(s.get('narration')) + _sentences(sc.get('headline')):
                w = _norm_words(sent)
                if len(w) >= MIN_SENTENCE_WORDS:
                    old_sents.append((stamp, sent, _grams(w)))
    op = first(slides[0].get('narration'), OPENER_WORDS)
    if op and op in old_opens:
        problems.append(f'repeat: episode opens with "{op}", same as {old_opens[op]}')
    for i, s in enumerate(slides):
        so = first(s.get('narration'), SLIDE_OPENER_WORDS)
        if i and len(so.split()) == SLIDE_OPENER_WORDS and so in old_slide_opens:
            problems.append(f'repeat: slide {i} opens "{so}", as in {old_slide_opens[so]}')
        for sent in _sentences(s.get('narration')):
            w = _norm_words(sent)
            if len(w) < MIN_SENTENCE_WORDS:
                continue
            g = _grams(w)
            for stamp, old, og in old_sents:
                if len(g & og) / len(g) >= NEAR_DUP:
                    problems.append(f'repeat: slide {i} "{sent[:60]}" is close to {stamp}: "{old[:60]}"')
                    break
    return problems
