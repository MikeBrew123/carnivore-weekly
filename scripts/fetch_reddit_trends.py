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
    # r/xxketo added 2026-08-24: women's keto sub, dead-on for the 45-70
    # mostly-female weight-loss audience both sites actually serve.
    'cw': ['carnivorediet', 'carnivore', 'keto', 'xxketo'],
    'kd': ['keto', 'lowcarb', 'ketorecipes', 'xxketo'],
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

    def is_fresh(it, days=14):
        created = it.get('createdAt') or ''
        try:
            dt = datetime.datetime.fromisoformat(created.replace('Z', '+00:00'))
            return (datetime.datetime.now(datetime.timezone.utc) - dt).days <= days
        except ValueError:
            return False

    def fetch_sub(sub):
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
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.loads(resp.read())

    items = []
    for sub in SUBREDDITS[args.site]:
        # The actor sometimes ignores searchTime and serves all-time top
        # posts (seen 2026-08-24: 12k-upvote posts from years back). Fresh
        # data is the entire point, so posts older than 14 days are dropped
        # hard, and a sub that comes back mostly-stale gets one retry.
        try:
            got = fetch_sub(sub)
            fresh = [it for it in got if is_fresh(it)]
            if len(fresh) < 5 and got:
                print(f'  r/{sub}: only {len(fresh)} fresh of {len(got)}, retrying once')
                got = fetch_sub(sub)
                fresh = [it for it in got if is_fresh(it)]
            items.extend(fresh)
        except Exception as e:
            print(f'  r/{sub} fetch failed: {e}')

    posts = []
    for it in items:
        if it.get('dataType') and it['dataType'] != 'post':
            continue
        title = it.get('title') or ''
        if not title:
            continue
        # Demographic-noise filter: photo/meme posts ("Breakfast", steak
        # pics) carry no topic signal for a 45-70 weight-loss audience.
        # Keep posts with real body text or a question in the title.
        body = (it.get('body') or '').strip()
        if len(body) < 80 and '?' not in title:
            continue
        posts.append({
            'title': title,
            'subreddit': (it.get('communityName') or '').removeprefix('r/'),
            'score': it.get('score') or 0,
            'num_comments': it.get('commentsCount') or 0,
            'created': it.get('createdAt', ''),
            'url': it.get('postUrl') or it.get('url', ''),
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
    data_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
    out_path = os.path.join(data_dir, f'reddit-trends-{args.site}.json')
    with open(out_path, 'w') as f:
        json.dump(out, f, indent=1)

    # Longitudinal archive: one compact line per run so recurring pain
    # points and rising topics are visible across weeks, not lost when the
    # snapshot file is overwritten. Read it with any jsonl tooling.
    hist_path = os.path.join(data_dir, 'reddit-trends-history.jsonl')
    with open(hist_path, 'a') as f:
        f.write(json.dumps({
            'fetched_at': out['fetched_at'], 'site': args.site,
            'posts': [{k: p[k] for k in ('title', 'subreddit', 'score',
                                         'num_comments', 'created')}
                      for p in posts],
        }) + '\n')

    print(f'{len(posts)} posts -> {out_path}')
    for p in posts[:10]:
        print(f"  {p['score']:>5}⬆ {p['num_comments']:>4}💬 r/{p['subreddit']}: {p['title'][:90]}")


if __name__ == '__main__':
    main()
