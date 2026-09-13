#!/usr/bin/env python3
"""Fetch top comments for chosen Reddit source threads (comment mining).

Second stage of the fresh-topic pipeline (Brew approved 2026-08-24).
After Chloe picks blog topics from data/reddit-trends-{site}.json, the
blog-gen task calls this with each topic's source_post_url. Writers then
answer the REAL questions and objections people raised in the thread,
instead of guessing what readers might ask.

CACHED BY THREAD URL (Brew, 2026-09-13). Trend snapshots are now pulled once
every 14 days (see fetch_reddit_trends.py), so CW's two weekly runs and KD's
one all pick topics from the SAME snapshot. Without a cache we paid to mine
the same threads again every run. Comment mining had become the dominant Apify
cost, about $3.87 of $4.52 a month against a $5 free credit.

A thread mined within --cache-days (default 30) is served from
data/reddit-comments-{site}-cache.json and costs nothing. Only genuinely new
URLs reach Apify, and a run where every URL is cached makes no API call at
all. The cache is also the duplicate-topic tripwire: if a run reports every
thread as cached, topic research has re-picked last run's threads and the
batch is about to repeat itself.

Usage:
    python3 scripts/fetch_reddit_comments.py --site cw --urls URL [URL ...]
    python3 scripts/fetch_reddit_comments.py --site cw --urls URL --force
    python3 scripts/fetch_reddit_comments.py --site cw --urls URL --cache-days 7

Writes data/reddit-comments-{site}.json (the contract consumers read, always
the full set of requested threads, cached or freshly mined):
    {"fetched_at", "threads": [{url, title, comments: [{score, body, created}]}]}

and data/reddit-comments-{site}-cache.json (accumulating, pruned by age).

Cost: ~20 comments/post at $0.002 each -> ~$0.40 for 9 uncached posts.
"""

import argparse
import datetime
import json
import os
import sys
import urllib.request

ACTOR = 'harshmaur~reddit-scraper'
MAX_COMMENTS_PER_POST = 20
CACHE_DAYS = 30
COST_PER_THREAD_USD = 0.04  # ~20 comments at $0.002, for the savings line
KEY_PATHS = [
    '/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json',
    '/Users/mbrew/Developer/project-nexus/secrets/api-keys.json',
]


def data_path(name):
    return os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', name)


def normalize(url):
    """Canonical form of a Reddit thread URL, for cache lookups.

    Reddit hands out the same thread as http/https, with and without www, with
    a trailing slash, with a slug, and with tracking query strings. Comparing
    raw strings would miss the cache and we would pay for it.
    """
    u = (url or '').strip().split('?')[0].split('#')[0]
    u = u.replace('http://', '').replace('https://', '')
    for prefix in ('www.', 'old.', 'new.', 'np.', 'm.'):
        if u.startswith(prefix):
            u = u[len(prefix):]
    return u.rstrip('/').lower()


def load_cache(site, cache_days):
    """Cached threads keyed by normalized url, dropping anything past its age."""
    try:
        with open(data_path(f'reddit-comments-{site}-cache.json')) as f:
            raw = json.load(f).get('threads') or {}
    except Exception:
        # First run after this feature landed: seed from the last output file
        # so threads already on disk are not paid for a second time.
        raw = {}
        try:
            with open(data_path(f'reddit-comments-{site}.json')) as f:
                prev = json.load(f)
            for t in prev.get('threads') or []:
                key = normalize(t.get('url'))
                if key and t.get('comments'):
                    raw[key] = {'url': t['url'], 'title': t.get('title', ''),
                                'comments': t['comments'],
                                'mined_at': prev.get('fetched_at', '')}
            if raw:
                print(f'  seeded cache with {len(raw)} thread(s) from the '
                      f'previous reddit-comments-{site}.json')
        except Exception:
            return {}
    now = datetime.datetime.now(datetime.timezone.utc)
    fresh = {}
    for key, entry in raw.items():
        try:
            mined = datetime.datetime.fromisoformat(
                entry['mined_at'].replace('Z', '+00:00'))
        except (KeyError, AttributeError, ValueError):
            continue
        if (now - mined).total_seconds() / 86400 <= cache_days and entry.get('comments'):
            fresh[key] = entry
    return fresh


def save_cache(site, cache):
    with open(data_path(f'reddit-comments-{site}-cache.json'), 'w') as f:
        json.dump({'threads': cache}, f, indent=1)


def apify_token():
    for path in KEY_PATHS:
        try:
            with open(path) as f:
                key = (json.load(f).get('apify') or {}).get('api_key')
            if key:
                return key
        except Exception:
            continue
    sys.exit('No apify.api_key found in secrets files')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--site', choices=['cw', 'kd'], required=True)
    ap.add_argument('--urls', nargs='+', required=True,
                    help='Reddit post URLs (the chosen topics\' source threads)')
    ap.add_argument('--cache-days', type=float, default=CACHE_DAYS,
                    help=f'reuse a thread mined within this many days (default {CACHE_DAYS})')
    ap.add_argument('--force', action='store_true',
                    help='re-mine every URL even if it is cached')
    args = ap.parse_args()

    cache = {} if args.force else load_cache(args.site, args.cache_days)

    wanted = []          # requested urls, de-duplicated within this run
    seen = set()
    for u in args.urls:
        key = normalize(u)
        if key and key not in seen:
            seen.add(key)
            wanted.append(u)
    if len(wanted) < len(args.urls):
        print(f'  {len(args.urls) - len(wanted)} duplicate URL(s) in this request, collapsed')

    to_fetch = [u for u in wanted if normalize(u) not in cache]
    cached = [u for u in wanted if normalize(u) in cache]

    if cached:
        saved = len(cached) * COST_PER_THREAD_USD
        print(f'{len(cached)} of {len(wanted)} threads already mined within '
              f'{args.cache_days:g} days, served from cache (about ${saved:.2f} not spent).')
    if cached and not to_fetch:
        print('  Every requested thread was cached. Nothing to fetch.')
        print('  NOTE: if this keeps happening, topic research is re-picking the '
              'same threads off a reused trend snapshot. Check for repeated topics.')

    threads = {u: {'url': u, 'title': '', 'comments': []} for u in wanted}
    for u in cached:
        entry = cache[normalize(u)]
        threads[u] = {'url': u, 'title': entry.get('title', ''),
                      'comments': entry.get('comments', [])}

    items = []
    if to_fetch:
        print(f'Mining {len(to_fetch)} new thread(s).')
        run_input = {
            'startUrls': [{'url': u} for u in to_fetch],
            'crawlCommentsPerPost': True,
            'maxCommentsPerPost': MAX_COMMENTS_PER_POST,
            'fastMode': True,
        }
        url = (f'https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items'
               f'?token={apify_token()}&timeout=240')
        req = urllib.request.Request(
            url, data=json.dumps(run_input).encode(),
            headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                items = json.loads(resp.read())
        except Exception as e:
            print(f'  comment fetch failed: {e}')
            print('  Check the Apify quota before blaming the actor: '
                  '/v2/users/me/limits (ISSUE-080).')
            if not cached:
                print('NOTHING MINED AND NOTHING CACHED. '
                      'Existing output left untouched.')
                sys.exit(1)
            print('  Continuing with the cached threads only.')

    # Only threads we actually fetched can receive incoming items. A cached
    # thread must not also absorb scraped comments, or it ends up doubled.
    fetch_targets = {normalize(u): u for u in to_fetch}

    def thread_for(link):
        key = normalize(link)
        if not key:
            return None
        if key in fetch_targets:
            return threads[fetch_targets[key]]
        for k, u in fetch_targets.items():
            if key.startswith(k) or k.startswith(key):
                return threads[u]
        return None

    for it in items:
        dtype = it.get('dataType')
        if dtype == 'post':
            t = thread_for(it.get('url', ''))
            if t:
                t['title'] = it.get('title', '')
        elif dtype == 'comment':
            t = thread_for(it.get('postUrl') or it.get('url', ''))
            body = (it.get('body') or '').strip()
            if t and body and len(body) > 15:
                t['comments'].append({
                    'score': it.get('score') or 0,
                    'body': body[:600],
                    'created': it.get('createdAt', ''),
                })

    for t in threads.values():
        t['comments'].sort(key=lambda c: -(c['score'] or 0))
        t['comments'] = t['comments'][:MAX_COMMENTS_PER_POST]

    now = datetime.datetime.now(datetime.timezone.utc).isoformat()

    # Bank everything freshly mined so the next run inside the window is free.
    # An empty result is not banked: a thread that came back with nothing
    # should be retried later, not cached as permanently empty.
    newly_mined = 0
    for u in to_fetch:
        t = threads[u]
        if t['comments']:
            cache[normalize(u)] = {'url': u, 'title': t['title'],
                                   'comments': t['comments'], 'mined_at': now}
            newly_mined += 1
    if newly_mined:
        save_cache(args.site, cache)

    out = {
        'fetched_at': now,
        'cache_days': args.cache_days,
        'from_cache': [u for u in cached],
        'newly_mined': [u for u in to_fetch if threads[u]['comments']],
        'threads': list(threads.values()),
    }
    out_path = data_path(f'reddit-comments-{args.site}.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=1)
    total = sum(len(t['comments']) for t in threads.values())
    print(f'{total} comments across {len(threads)} threads -> {out_path}')
    print(f'  {len(cached)} from cache, {newly_mined} newly mined, '
          f'cache now holds {len(cache)} threads')
    for u, t in threads.items():
        tag = 'cached' if u in cached else 'mined '
        print(f"  {tag} {len(t['comments']):>3}💬 {t['title'][:65] or t['url']}")


if __name__ == '__main__':
    main()
