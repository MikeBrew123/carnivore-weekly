#!/usr/bin/env python3
"""Fetch this week's top Reddit posts for CW or KD topic research.

Replaces the WebSearch-based Reddit step in the blog content generation
tasks (Brew approved 2026-08-24). Uses the Apify actor
harshmaur/reddit-scraper via the run-sync API — real posts with real
timestamps AND scores/comment counts, so topic research never works from
stale threads again. (Direct reddit.com JSON scraping is 403-blocked:
ISSUE-014. trudax/reddit-scraper-lite was tried first but returns no
vote/comment fields. r/zerocarb is effectively dead — 0 posts/week as of
2026-08-24 — so CW uses r/carnivorediet, r/carnivore, r/keto.)

Usage:
    python3 scripts/fetch_reddit_trends.py --site cw
    python3 scripts/fetch_reddit_trends.py --site kd

Writes data/reddit-trends-{site}.json:
    {"site", "fetched_at", "window": "top posts of the last 7 days",
     "posts": [{title, subreddit, score, num_comments, created, url}]}

Cost: ~$0.20/run (45 results at $0.004 + start fee) against Apify's
free-tier monthly credit. Keep maxItems modest; posts only, no comments.
"""

import argparse
import datetime
import json
import os
import sys
import urllib.request

SUBREDDITS = {
    'cw': ['carnivorediet', 'carnivore', 'keto'],
    'kd': ['keto', 'lowcarb', 'ketorecipes'],
}
MAX_ITEMS = 15  # per subreddit
ACTOR = 'harshmaur~reddit-scraper'
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
    args = ap.parse_args()

    # One call per subreddit: maxPostsCount is a TOTAL cap, and the actor
    # fills it from the first URL, starving the rest (seen 2026-08-24).
    token = apify_token()
    items = []
    for sub in SUBREDDITS[args.site]:
        run_input = {
            'subredditUrls': [f'https://www.reddit.com/r/{sub}/'],
            'searchSort': 'top',
            'searchTime': 'week',
            'maxPostsCount': MAX_ITEMS,
            'crawlCommentsPerPost': False,
            'fastMode': True,
        }
        url = (f'https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items'
               f'?token={token}&timeout=240')
        req = urllib.request.Request(
            url, data=json.dumps(run_input).encode(),
            headers={'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=300) as resp:
                items.extend(json.loads(resp.read()))
        except Exception as e:
            print(f'  r/{sub} fetch failed: {e}')

    posts = []
    for it in items:
        if it.get('dataType') and it['dataType'] != 'post':
            continue
        title = it.get('title') or ''
        if not title:
            continue
        posts.append({
            'title': title,
            'subreddit': (it.get('communityName') or '').removeprefix('r/'),
            'score': it.get('score') or 0,
            'num_comments': it.get('commentsCount') or 0,
            'created': it.get('createdAt', ''),
            'url': it.get('url', ''),
            'body_preview': (it.get('body') or '')[:280],
        })
    posts.sort(key=lambda p: -(p['score'] or 0))

    out = {
        'site': args.site,
        'fetched_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'window': 'top posts of the last 7 days',
        'subreddits': SUBREDDITS[args.site],
        'posts': posts,
    }
    out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                            'data', f'reddit-trends-{args.site}.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=1)
    print(f'{len(posts)} posts -> {out_path}')
    for p in posts[:10]:
        print(f"  {p['score']:>5}⬆ {p['num_comments']:>4}💬 r/{p['subreddit']}: {p['title'][:90]}")


if __name__ == '__main__':
    main()
