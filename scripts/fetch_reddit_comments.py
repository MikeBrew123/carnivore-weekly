#!/usr/bin/env python3
"""Fetch top comments for chosen Reddit source threads (comment mining).

Second stage of the fresh-topic pipeline (Brew approved 2026-08-24).
After Chloe picks blog topics from data/reddit-trends-{site}.json, the
blog-gen task calls this with each topic's source_post_url. Writers then
answer the REAL questions and objections people raised in the thread,
instead of guessing what readers might ask.

Usage:
    python3 scripts/fetch_reddit_comments.py --site cw --urls URL [URL ...]

Writes data/reddit-comments-{site}.json:
    {"fetched_at", "threads": [{url, title, comments: [{score, body, created}]}]}

Cost: ~20 comments/post at $0.002 each -> ~$0.40 for 9 posts, against
Apify's free-tier monthly credit.
"""

import argparse
import datetime
import json
import os
import sys
import urllib.request

ACTOR = 'harshmaur~reddit-scraper'
MAX_COMMENTS_PER_POST = 20
KEY_PATHS = [
    '/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json',
    '/Users/mbrew/Developer/project-nexus/secrets/api-keys.json',
]


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
    args = ap.parse_args()

    run_input = {
        'startUrls': [{'url': u} for u in args.urls],
        'crawlCommentsPerPost': True,
        'maxCommentsPerPost': MAX_COMMENTS_PER_POST,
        'fastMode': True,
    }
    url = (f'https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items'
           f'?token={apify_token()}&timeout=240')
    req = urllib.request.Request(
        url, data=json.dumps(run_input).encode(),
        headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as resp:
        items = json.loads(resp.read())

    # Items mix posts and comments; group comments under their post URL.
    threads = {u: {'url': u, 'title': '', 'comments': []} for u in args.urls}

    def thread_for(link):
        for u in threads:
            if link and (link.rstrip('/').startswith(u.rstrip('/'))
                         or u.rstrip('/').startswith(link.rstrip('/'))):
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

    out = {
        'fetched_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'threads': list(threads.values()),
    }
    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                            'data', f'reddit-comments-{args.site}.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=1)
    total = sum(len(t['comments']) for t in threads.values())
    print(f'{total} comments across {len(threads)} threads -> {out_path}')
    for t in threads.values():
        print(f"  {len(t['comments']):>3}💬 {t['title'][:70] or t['url']}")


if __name__ == '__main__':
    main()
