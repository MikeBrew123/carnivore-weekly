#!/usr/bin/env python3
"""PescoDial blog health gate. Run BEFORE the weekly PD writing task writes anything.

For every published pd post in data/blog_posts.json it pulls, from Search Console
(property sc-domain:pescodial.com):
  * URL Inspection: coverageState, lastCrawlTime
  * Search Analytics, page dimension, publish date to today: impressions, clicks, ctr, position
and caches the result to data/pd-blog-health.json (no PII, safe to commit).

Exit codes:
  0  WRITE           default; also when GSC is unavailable (printed as GSC_UNAVAILABLE)
  3  PAUSE_WRITING   indexing or impressions say the domain is not earning crawl demand;
                     put the effort into links, not posts (KD lesson, ISSUE-068)

TITLE_FIX and THIN_CHECK lists are advisory and never change the exit code.

Usage:
  python3 scripts/pd_blog_health.py
  python3 scripts/pd_blog_health.py --offline tests/fixtures/x.json   # decision logic only
"""

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
POSTS_FILE = REPO / 'data' / 'blog_posts.json'
CACHE_FILE = REPO / 'data' / 'pd-blog-health.json'
SITE_URL = 'sc-domain:pescodial.com'
URL_TMPL = 'https://www.pescodial.com/guides/{slug}/'
SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

EXIT_WRITE = 0
EXIT_PAUSE = 3

# Thresholds
INDEX_MIN_POSTS, INDEX_MIN_AGE = 4, 42
IMP_MIN_POSTS, IMP_MIN_AGE, IMP_FLOOR = 6, 84, 100
TITLE_MIN_IMP, TITLE_MAX_POS, TITLE_MAX_CTR = 300, 10, 0.01
THIN_STATE = 'Crawled - currently not indexed'


# ---------- decision logic (pure) ----------

def is_indexed(state):
    s = state or ''
    if 'not indexed' in s.lower():
        return False
    return 'Submitted and indexed' in s or 'Indexed' in s


def age_days(post, today):
    try:
        return (today - dt.date.fromisoformat(str(post['publish_date'])[:10])).days
    except (KeyError, ValueError, TypeError):
        return -1


def decide(posts, today):
    """posts: list of dicts with slug, publish_date, coverageState, impressions, clicks, ctr, position."""
    reasons = []

    old42 = [p for p in posts if age_days(p, today) >= INDEX_MIN_AGE]
    indexed42 = [p for p in old42 if is_indexed(p.get('coverageState'))]
    if len(old42) >= INDEX_MIN_POSTS and len(indexed42) * 2 < len(old42):
        reasons.append(f'only {len(indexed42)} of {len(old42)} posts aged {INDEX_MIN_AGE}+ days are indexed')

    old84_low = [p for p in posts
                 if age_days(p, today) >= IMP_MIN_AGE and (p.get('impressions') or 0) < IMP_FLOOR]
    if len(old84_low) >= IMP_MIN_POSTS:
        reasons.append(f'{len(old84_low)} posts aged {IMP_MIN_AGE}+ days have under {IMP_FLOOR} impressions')

    title_fix = [p for p in posts
                 if (p.get('impressions') or 0) >= TITLE_MIN_IMP
                 and p.get('position') is not None and p['position'] <= TITLE_MAX_POS
                 and (p.get('ctr') or 0) < TITLE_MAX_CTR]
    thin = [p for p in posts if (p.get('coverageState') or '') == THIN_STATE]

    return {
        'decision': 'PAUSE_WRITING' if reasons else 'WRITE',
        'reasons': reasons,
        'title_fix': title_fix,
        'thin_check': thin,
        'indexed': len([p for p in posts if is_indexed(p.get('coverageState'))]),
    }


def report(posts, result, today):
    out = [f'PescoDial blog health, {today.isoformat()}: {len(posts)} published pd post(s), '
           f'{result["indexed"]} indexed.']
    if result['decision'] == 'PAUSE_WRITING':
        out.append('PAUSE_WRITING: ' + '; '.join(result['reasons']) + '.')
        out.append('Put the effort into links, not posts (KD lesson, ISSUE-068). '
                   'More pages on an untrusted domain reinforce the pattern instead of earning crawl demand.')
    else:
        out.append('WRITE: no pause signal.')
    out.append('TITLE_FIX:' + ('' if result['title_fix'] else ' none'))
    for p in result['title_fix']:
        out.append(f'  {p["slug"]}  imp {p.get("impressions")}  pos {round(p["position"], 1)}  '
                   f'ctr {round((p.get("ctr") or 0) * 100, 2)}%  (rewrite title/meta before new posts)')
    out.append('THIN_CHECK:' + ('' if result['thin_check'] else ' none'))
    for p in result['thin_check']:
        out.append(f'  {p["slug"]}  ({THIN_STATE}, last crawl {p.get("lastCrawlTime") or "unknown"})')
    return '\n'.join(out)


def gsc_unavailable(err):
    bar = '!' * 60
    print(bar)
    print(f'GSC_UNAVAILABLE: {err}')
    print('Search Console could not be read, so no health data exists for this run.')
    print('Not blocking: WRITE (exit 0). Cache left untouched.')
    print(bar)
    return EXIT_WRITE


# ---------- live GSC ----------

def load_published_pd():
    data = json.loads(POSTS_FILE.read_text())
    posts = data['blog_posts'] if isinstance(data, dict) else data
    return [p for p in posts if p.get('site') == 'pd' and p.get('status') == 'published']


def find_credentials():
    if os.environ.get('PD_GSC_CREDENTIALS'):
        return Path(os.environ['PD_GSC_CREDENTIALS'])
    roots = [REPO]
    try:  # credentials are gitignored, so a worktree falls back to the main checkout
        common = subprocess.run(['git', '-C', str(REPO), 'rev-parse', '--path-format=absolute',
                                 '--git-common-dir'], capture_output=True, text=True, timeout=10)
        if common.returncode == 0:
            roots.append(Path(common.stdout.strip()).parent)
    except Exception:
        pass
    for root in roots:
        env = root / 'dashboard' / '.env'
        if env.exists():
            for line in env.read_text().splitlines():
                if line.startswith('GA4_CREDENTIALS_PATH='):
                    val = line.split('=', 1)[1].strip().strip('"\'')
                    cand = Path(val) if Path(val).is_absolute() else root / 'dashboard' / val
                    if cand.exists():
                        return cand
        cand = root / 'dashboard' / 'ga4-credentials.json'
        if cand.exists():
            return cand
    return REPO / 'dashboard' / 'ga4-credentials.json'


def fetch_live(posts, today):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    creds = service_account.Credentials.from_service_account_file(str(find_credentials()), scopes=SCOPES)
    svc = build('searchconsole', 'v1', credentials=creds, cache_discovery=False)
    svc.sites().get(siteUrl=SITE_URL).execute()  # proves auth and property access even with 0 posts

    rows = []
    for p in posts:
        url = URL_TMPL.format(slug=p['slug'])
        insp = svc.urlInspection().index().inspect(body={'inspectionUrl': url, 'siteUrl': SITE_URL}).execute()
        idx = insp.get('inspectionResult', {}).get('indexStatusResult', {})
        start = str(p.get('publish_date'))[:10]
        sa = svc.searchanalytics().query(siteUrl=SITE_URL, body={
            'startDate': start, 'endDate': today.isoformat(), 'dimensions': ['page'],
            'dimensionFilterGroups': [{'filters': [{'dimension': 'page', 'operator': 'equals',
                                                    'expression': url}]}],
            'rowLimit': 10}).execute().get('rows', [])
        imp = sum(r['impressions'] for r in sa)
        clicks = sum(r['clicks'] for r in sa)
        pos = (sum(r['position'] * r['impressions'] for r in sa) / imp) if imp else None
        rows.append({'slug': p['slug'], 'url': url, 'publish_date': start,
                     'coverageState': idx.get('coverageState'), 'lastCrawlTime': idx.get('lastCrawlTime'),
                     'impressions': imp, 'clicks': clicks, 'ctr': (clicks / imp) if imp else 0.0,
                     'position': round(pos, 2) if pos is not None else None})
    return rows


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--offline', metavar='FILE',
                    help='fixture JSON {"today", "posts": [...], optional "gsc_error"}; no API, no cache write')
    args = ap.parse_args(argv)

    if args.offline:
        fx = json.loads(Path(args.offline).read_text())
        today = dt.date.fromisoformat(fx.get('today') or dt.date.today().isoformat())
        if fx.get('gsc_error'):
            return gsc_unavailable(fx['gsc_error'])
        rows = fx.get('posts', [])
    else:
        today = dt.date.today()
        try:
            rows = fetch_live(load_published_pd(), today)
        except Exception as e:  # auth, network, quota, missing libs: never block, never fake
            return gsc_unavailable(f'{type(e).__name__}: {str(e)[:300]}')
        result = decide(rows, today)
        CACHE_FILE.write_text(json.dumps({
            'generated_at': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
            'property': SITE_URL, 'decision': result['decision'], 'reasons': result['reasons'],
            'posts': rows}, indent=2) + '\n')

    result = decide(rows, today)
    print(report(rows, result, today))
    return EXIT_PAUSE if result['decision'] == 'PAUSE_WRITING' else EXIT_WRITE


if __name__ == '__main__':
    sys.exit(main())
