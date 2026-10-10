#!/usr/bin/env python3
"""Brief Me: an on-demand, narrated walkthrough of the business.

Pipeline (the `brief-me` skill drives it; Claude writes step 3):
    1. gather   facts from the Command Center snapshot, the CEO brief and the
                calendar, then plan the episode (areas, lenses, cold open)
    2.          -> episode dir with facts.json + plan.json
    3.          Claude writes script.json from plan.json
    4. check    every number traces to a cited fact; no em-dashes
    5. voice    OpenAI TTS, one MP3 per slide, under a fail-closed $1/day cap
    6. render   self-contained slide player (index.html)
    7. publish  NAS deck /brief/<stamp>/ and /brief/latest/, then record history

State lives outside the repo in ~/.brief-me/ (the repo is public and episodes
quote reader feedback): history.jsonl, tts-ledger.jsonl, episodes/<stamp>/.

    python3 dashboard/briefme.py gather [--calendar cal.json] [--refresh] [--full] [--date YYYY-MM-DD]
    python3 dashboard/briefme.py recent  [-n 7]        what recent episodes said (read before writing)
    python3 dashboard/briefme.py check   <episode-dir>
    python3 dashboard/briefme.py voice   <episode-dir>
    python3 dashboard/briefme.py render  <episode-dir>
    python3 dashboard/briefme.py publish <episode-dir> [--local]
    python3 dashboard/briefme.py status
    python3 dashboard/briefme.py daily   on|off|status  the opt-in switch for the overnight run

Episode length follows the news (lenses.pick_tier): a quiet day is a one-slide
card with no voice, a normal day a short episode, a big day the full one.
Weekdays have formats (Mon week ahead, Wed deep dive, Fri week in review), and
while a trip.trips row contains today the trip leads and the business shrinks
to one headline slide unless something is red. --full always gets the
complete standard episode.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

sys.path.insert(0, str(Path(__file__).resolve().parent))
from brief_me import facts as F          # noqa: E402
from brief_me import lenses as L         # noqa: E402
from brief_me import trip as T           # noqa: E402

TZ = ZoneInfo('America/Vancouver')
HERE = Path(__file__).resolve().parent
HOME = Path(os.environ.get('BRIEF_ME_HOME', Path.home() / '.brief-me'))
HISTORY = HOME / 'history.jsonl'
TRIP_WINDOWS = HOME / 'trip-windows.json'
DAILY_FLAG = HOME / 'daily.on'
LEDGER = HOME / 'tts-ledger.jsonl'
MAIN_REPO = Path('/Users/mbrew/Developer/carnivore-weekly')
CEO_DIR = Path.home() / 'Documents/Banana Stand Media/01 Carnivore Weekly/Legacy Project/reports/ceo-briefs'
OPENAI_KEYS = Path('/Users/mbrew/Developer/project-nexus/secrets/api-keys.json')

NAS_HOST = 'mbrew@100.117.74.5'
NAS_ROOT = '/volume1/docker/artifacts-site'
NAS_BASE_URL = 'http://100.117.74.5:8087'

TTS_MODEL = 'gpt-4o-mini-tts'
TTS_VOICE = 'ash'
TTS_STYLE = ('Warm, dry, upbeat morning-show host. Brisk pace, light humour, '
             'clear on numbers. Never breathless or salesy.')
# gpt-4o-mini-tts bills about $0.015 per spoken minute. Estimate from words at
# 150 wpm and pad 50% so the cap errs on the side of refusing.
TTS_COST_PER_MIN = 0.015 * 1.5
DAILY_CAP = 1.00
STALE_HOURS = 6


def now():
    return datetime.now(TZ)


def data_path():
    env = os.environ.get('BRIEF_ME_DATA')
    for p in ((Path(env),) if env else ()) + (HERE / 'command-center-data.json',
                                              MAIN_REPO / 'dashboard' / 'command-center-data.json'):
        if p.exists():
            return p
    sys.exit('No command-center-data.json found. Run dashboard/generate_command_center.py first.')


def load_history():
    if not HISTORY.exists():
        return []
    return [json.loads(l) for l in HISTORY.read_text().splitlines() if l.strip()]


def latest_ceo_brief():
    briefs = sorted(CEO_DIR.glob('20??-??-??.md')) if CEO_DIR.exists() else []
    return (briefs[-1].stem, briefs[-1].read_text()) if briefs else (None, '')


# ---------- gather ----------

def cmd_gather(a):
    path = data_path()
    age_h = (time.time() - path.stat().st_mtime) / 3600
    if age_h > STALE_HOURS and a.refresh:
        print(f'Snapshot is {age_h:.1f}h old, refreshing (this takes a few minutes)...')
        subprocess.run([sys.executable, str(path.parent / 'generate_command_center.py')],
                       cwd=path.parent.parent, check=True)
        age_h = 0
    data = json.loads(path.read_text())
    ceo_date, ceo_md = latest_ceo_brief()
    calendar = json.loads(Path(a.calendar).read_text()) if a.calendar else []
    today = a.date or now().date().isoformat()

    ctx, trip_note = trip_context(today)
    facts = (F.command_center_facts(data) + F.ceo_facts(F.parse_ceo_brief(ceo_md))
             + F.calendar_facts(calendar, today=today) + F.trip_facts(ctx) + trip_note)
    if ctx and ctx.get('trip'):
        F.merge_commitments_into_week(facts, ctx.get('commitments'))
    history = load_history()
    plan = L.plan_episode(facts, history, today=today, full=a.full)

    stamp = now().strftime('%Y-%m-%d-%H%M%S')
    ep = HOME / 'episodes' / stamp
    ep.mkdir(parents=True, exist_ok=True)
    meta = {'stamp': stamp, 'data_generated': data.get('meta', {}).get('generated_at'),
            'data_age_hours': round(age_h, 1), 'ceo_brief_date': ceo_date,
            'calendar_events': len(calendar), 'episodes_before': len(history), 'today': today,
            'trip': ctx['trip']['name'] if ctx and ctx.get('trip') else None}
    (ep / 'facts.json').write_text(json.dumps(facts, indent=1))
    (ep / 'plan.json').write_text(json.dumps({'meta': meta, **plan}, indent=1))
    print(f'Episode dir: {ep}')
    print(f"Tier {plan['tier']} (news {plan['news']}), format {plan['format']}"
          + (f", deep dive on {plan['deep_area']}" if plan.get('deep_area') else '')
          + (f", trip: {meta['trip']}" if meta['trip'] else '') + '.')
    print(f"Data {meta['data_age_hours']}h old, CEO brief {ceo_date}, {len(calendar)} calendar events, "
          f'{len(history)} earlier episodes.')
    for s in plan['slides']:
        ids = ', '.join(f['id'] for f in s['facts']) or '-'
        print(f"  {s['slot']:<9} {str(s['area']):<10} {s['lens']:<12} {ids}")
    if plan['quiet_areas']:
        print('  quiet:', ', '.join(plan['quiet_areas']))
    if age_h > STALE_HOURS:
        print(f'WARNING: snapshot is {age_h:.1f}h old. Re-run with --refresh for fresh numbers.')


def trip_context(today):
    """(ledger context or None, [health fact]) for today. The trip area appears
    only when a trip.trips row contains today. If the ledger cannot be read on
    a day a cached trip window covers, that is a red health fact: missing, not zero."""
    try:
        ctx = T.load_trip(today)
        HOME.mkdir(parents=True, exist_ok=True)
        TRIP_WINDOWS.write_text(json.dumps(ctx.get('windows') or []))
        return ctx, []
    except Exception as e:                        # no driver, no network, no password file
        try:
            windows = json.loads(TRIP_WINDOWS.read_text())
        except (OSError, ValueError):
            windows = []
        if any(w['starts_on'][:10] <= today <= w['ends_on'][:10] for w in windows):
            return None, [{'id': 'health.trip_ledger', 'area': 'health', 'lenses': ['housekeeping'],
                           'text': f'Trip ledger could not be read ({type(e).__name__}); trip numbers are missing, not zero.',
                           'value': None, 'importance': 0.9, 'source': 'brief_me.trip'}]
        print(f'note: trip ledger not read ({type(e).__name__}: {e}); no cached trip covers {today}.')
        return None, []


def recent_scripts(n=L.REPEAT_EPISODES, exclude=None):
    """(stamp, script) for the last n published episodes, oldest first."""
    out = []
    for r in load_history():
        if r['stamp'] == exclude:
            continue
        f = HOME / 'episodes' / r['stamp'] / 'script.json'
        if f.exists():
            out.append((r['stamp'], json.loads(f.read_text())))
    return out[-n:]


def cmd_recent(a):
    rs = recent_scripts(a.n)
    if not rs:
        print('No published episodes yet.')
    for stamp, sc in rs:
        print(f"== {stamp}: {sc.get('headline', '')}")
        for i, s in enumerate(sc.get('slides', [])):
            print(f"  {i}: {s.get('narration', '')}")


# ---------- check ----------

def _load_ep(d):
    ep = Path(d).expanduser()
    return ep, json.loads((ep / 'facts.json').read_text()), json.loads((ep / 'script.json').read_text())


def cmd_check(a):
    ep, facts, script = _load_ep(a.episode)
    plan = json.loads((ep / 'plan.json').read_text())
    tier = plan.get('tier', 'full')
    problems = L.validate_script(script, facts)
    n, want = len(script.get('slides', [])), len(plan['slides'])
    if n != want:
        problems.append(f'{n} slides; the plan has {want} (one per slot, in order)')
    words = sum(len((s.get('narration') or '').split()) for s in script.get('slides', []))
    lo, hi = L.TIER_WORDS[tier]
    if not lo <= words <= hi:
        problems.append(f'{words} narration words; a {tier} episode needs {lo} to {hi}')
    problems += L.repeat_problems(script, recent_scripts(exclude=ep.name))
    for p in problems:
        print('PROBLEM:', p)
    print(f'{len(problems)} problem(s), {words} words, about {words / 150:.1f} minutes.')
    sys.exit(1 if problems else 0)


# ---------- voice (OpenAI TTS under a fail-closed cap) ----------

def spent_today():
    """Dollars spent today. Raises if the ledger cannot be read: fail closed."""
    today = now().strftime('%Y-%m-%d')
    if not LEDGER.exists():
        return 0.0
    total = 0.0
    for line in LEDGER.read_text().splitlines():
        if line.strip():
            row = json.loads(line)
            if row['date'] == today:
                total += float(row['cost'])
    return total


def estimate_cost(text):
    return round(len(text.split()) / 150 * TTS_COST_PER_MIN, 4)


def cmd_voice(a):
    ep, facts, script = _load_ep(a.episode)
    if L.validate_script(script, facts):
        sys.exit('Script fails check; run `check` and fix it before spending on voice.')
    if json.loads((ep / 'plan.json').read_text()).get('tier') == 'card':
        print('Card episode: no voice on quiet days.')
        return
    slides = script['slides']
    cost = sum(estimate_cost(s.get('narration', '')) for s in slides)
    try:
        spent = spent_today()
        key = json.loads(OPENAI_KEYS.read_text())['openai']['api_key']
    except Exception as e:
        sys.exit(f'BLOCKED (fail closed): {e}')
    if spent + cost > DAILY_CAP:
        sys.exit(f'BLOCKED: ${spent:.2f} spent today + ${cost:.2f} would pass the ${DAILY_CAP:.2f} cap.')
    (ep / 'audio').mkdir(exist_ok=True)
    for i, s in enumerate(slides):
        body = json.dumps({'model': TTS_MODEL, 'voice': TTS_VOICE, 'input': s['narration'],
                           'instructions': TTS_STYLE, 'response_format': 'mp3'}).encode()
        req = urllib.request.Request('https://api.openai.com/v1/audio/speech', data=body, headers={
            'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=120) as r:
            (ep / 'audio' / f'{i:02d}.mp3').write_bytes(r.read())
        HOME.mkdir(parents=True, exist_ok=True)
        with LEDGER.open('a') as fh:
            fh.write(json.dumps({'date': now().strftime('%Y-%m-%d'), 'ts': now().isoformat(),
                                 'episode': ep.name, 'slide': i, 'model': TTS_MODEL,
                                 'cost': estimate_cost(s['narration'])}) + '\n')
        print(f'  slide {i + 1}/{len(slides)} voiced')
    print(f'Voice done. Estimated ${cost:.3f}; today ${spent + cost:.3f} of ${DAILY_CAP:.2f}.')


# ---------- render ----------

def cmd_render(a):
    ep, facts, script = _load_ep(a.episode)
    problems = L.validate_script(script, facts)
    if problems:
        sys.exit('Script fails check:\n  ' + '\n  '.join(problems))
    by_id = {f['id']: f for f in facts}
    slides = []
    for i, s in enumerate(script['slides']):
        s = dict(s)
        if (ep / 'audio' / f'{i:02d}.mp3').exists():
            s['audio'] = f'audio/{i:02d}.mp3'
        vid = s.pop('visual', None) or s.pop('chart_fact', None)
        f = by_id.get(vid) if vid else None
        if f and (f.get('viz') or f.get('series')):
            viz = dict(f.get('viz') or {'type': 'bars' if len(f['series']) <= 6 else 'line'})
            if f.get('series'):
                viz.setdefault('series', f['series'])
                viz.setdefault('labels', f.get('labels', []))
            viz['label'] = f['text']
            s['visual'] = viz
        site = s.get('site') or next((by_id[c].get('site') for c in s.get('fact_ids', [])
                                      if by_id.get(c, {}).get('site')), None)
        if site:
            s['site'] = site
        slides.append(s)
    words = sum(len((s.get('narration') or '').split()) for s in slides)
    plan = json.loads((ep / 'plan.json').read_text())
    ticker = []
    for area in plan.get('quiet_areas', []):
        best = max((f for f in facts if f['area'] == area), key=lambda f: f['importance'], default=None)
        if best:
            ticker.append({'area': area, 'text': best['text'].replace('\u2014', ',').replace(' ,', ',')[:140]})
    episode = {'ticker': ticker, 'headline': script.get('headline', ''), 'dateline': script.get('dateline')
               or now().strftime('%A %B %-d, %-I:%M %p'), 'runtime': f'{round(words / 150)} min',
               'slides': slides}
    html = (HERE / 'brief_me' / 'template.html').read_text().replace(
        '/*__EPISODE__*/null', json.dumps(episode).replace('</', '<\\/'))
    (ep / 'index.html').write_text(html)
    print(f'Rendered {ep / "index.html"}')


# ---------- publish + record ----------

def record(ep):
    if any(r['stamp'] == ep.name for r in load_history()):
        return                              # republishing the same episode
    plan = json.loads((ep / 'plan.json').read_text())
    facts = json.loads((ep / 'facts.json').read_text())
    script = json.loads((ep / 'script.json').read_text())
    # Remember what was actually said: the plan's facts plus anything the script cited.
    cited = {c for s in script['slides'] for c in s.get('fact_ids', [])}
    planned = {f['id'] for s in plan['slides'] for f in s['facts']}
    plan['slides'].append({'slot': 'extra', 'area': 'extra', 'lens': 'extra',
                           'facts': [f for f in facts if f['id'] in cited - planned]})
    rec = L.history_record(ep.name, plan, facts)
    HOME.mkdir(parents=True, exist_ok=True)
    with HISTORY.open('a') as fh:
        fh.write(json.dumps(rec) + '\n')


def cmd_publish(a):
    ep = Path(a.episode).expanduser()
    if not (ep / 'index.html').exists():
        sys.exit('Render first.')
    if not a.local:
        with tempfile.TemporaryDirectory() as tmp:
            for sub in (ep.name, 'latest'):
                dest = Path(tmp) / 'public' / 'brief' / sub
                shutil.copytree(ep, dest, ignore=shutil.ignore_patterns('*.json'))
            subprocess.run(['sh', '-c',
                            f'ssh -o ConnectTimeout=15 -o BatchMode=yes {NAS_HOST} '
                            f'"rm -rf {NAS_ROOT}/public/brief/latest" && '
                            f'tar czf - -C "{tmp}" public | ssh -o ConnectTimeout=15 -o BatchMode=yes '
                            f'{NAS_HOST} "cd {NAS_ROOT} && tar xzf -"'],
                           check=True, timeout=180)
        print(f'Live: {NAS_BASE_URL}/brief/{ep.name}/  (also {NAS_BASE_URL}/brief/latest/)')
    record(ep)
    print(f'Recorded in {HISTORY}')


def cmd_status(a):
    h = load_history()
    print(f'{len(h)} episodes. TTS today: ${spent_today():.3f} of ${DAILY_CAP:.2f}.')
    for r in h[-5:]:
        print(f"  {r['stamp']}: open {r['cold_open']}, " +
              ', '.join(f"{s['area']}/{s['lens']}" for s in r['slides']))


def cmd_daily(a):
    HOME.mkdir(parents=True, exist_ok=True)
    if a.state == 'on':
        DAILY_FLAG.write_text(now().isoformat() + '\n')
    elif a.state == 'off':
        DAILY_FLAG.unlink(missing_ok=True)
    print('Daily brief is ' + ('ON' if DAILY_FLAG.exists() else 'OFF') + f' ({DAILY_FLAG}).')


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest='cmd', required=True)
    g = sub.add_parser('gather')
    g.add_argument('--calendar', help='JSON list of {summary, start} events')
    g.add_argument('--refresh', action='store_true', help='rebuild the Command Center snapshot if stale')
    g.add_argument('--full', action='store_true', help='"brief me full": the complete standard episode')
    g.add_argument('--date', help='plan as if today were this ISO date (weekday format, trip gating)')
    r = sub.add_parser('recent')
    r.add_argument('-n', type=int, default=L.REPEAT_EPISODES)
    d = sub.add_parser('daily')
    d.add_argument('state', choices=['on', 'off', 'status'])
    for name in ('check', 'voice', 'render', 'publish'):
        s = sub.add_parser(name)
        s.add_argument('episode')
        if name == 'publish':
            s.add_argument('--local', action='store_true', help='record history without pushing to the NAS')
    sub.add_parser('status')
    a = p.parse_args()
    {'gather': cmd_gather, 'recent': cmd_recent, 'daily': cmd_daily, 'check': cmd_check, 'voice': cmd_voice, 'render': cmd_render,
     'publish': cmd_publish, 'status': cmd_status}[a.cmd](a)


if __name__ == '__main__':
    main()
