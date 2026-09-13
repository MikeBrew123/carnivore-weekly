#!/usr/bin/env python3
"""Comment-mining cache: prove we stop paying to re-mine the same threads.

Why this exists (Brew, 2026-09-13). Trend snapshots are pulled once every 14
days, so CW's two weekly runs and KD's one all pick topics from the SAME
snapshot. fetch_reddit_comments.py used to overwrite its output every run and
had no cache, so a re-picked thread was mined and paid for again. Comment
mining had become the dominant Apify cost, about $3.87 of $4.52 a month
against a $5 free credit (ISSUE-080).

Every test stubs urlopen. Nothing here touches the network or Apify.

Run: python3 tests/test_reddit_comment_cache.py
"""

import datetime
import json
import os
import shutil
import sys
import tempfile
import unittest.mock as mock

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(
    os.path.abspath(__file__))), 'scripts'))
import fetch_reddit_comments as m  # noqa: E402

PASS = FAIL = 0
URL_A = 'https://www.reddit.com/r/keto/comments/aaa/thread_a/'
URL_B = 'https://www.reddit.com/r/keto/comments/bbb/thread_b/'


def check(label, cond):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f'  PASS  {label}')
    else:
        FAIL += 1
        print(f'  FAIL  {label}')


def payload(urls):
    """What the actor returns: posts and comments interleaved."""
    items = []
    for u in urls:
        items.append({'dataType': 'post', 'url': u, 'title': f'title for {u[-12:]}'})
        for i in range(3):
            items.append({'dataType': 'comment', 'postUrl': u, 'score': 10 - i,
                          'body': f'a real reader comment number {i} on {u[-12:]}',
                          'createdAt': '2026-09-10T00:00:00+00:00'})
    return items


class Resp:
    def __init__(self, data): self.data = data
    def read(self): return json.dumps(self.data).encode()
    def __enter__(self): return self
    def __exit__(self, *a): pass


def run(site, urls, extra=None, fail=False, capture=None):
    """Run main() with urlopen stubbed. Returns (calls, output_dict)."""
    calls = []

    def fake_urlopen(req, timeout=None):
        body = json.loads(req.data.decode())
        asked = [s['url'] for s in body['startUrls']]
        calls.append(asked)
        if fail:
            raise OSError('HTTP Error 403: Forbidden')
        return Resp(payload(asked))

    argv = ['fetch_reddit_comments.py', '--site', site, '--urls'] + urls + (extra or [])
    with mock.patch.object(m.urllib.request, 'urlopen', fake_urlopen), \
            mock.patch.object(sys, 'argv', argv), \
            mock.patch.object(m, 'apify_token', lambda: 'stub'):
        try:
            m.main()
            code = 0
        except SystemExit as e:
            code = e.code or 0
    try:
        with open(m.data_path(f'reddit-comments-{site}.json')) as f:
            out = json.load(f)
    except Exception:
        out = None
    return calls, out, code


def main():
    tmp = tempfile.mkdtemp()
    os.makedirs(os.path.join(tmp, 'data'), exist_ok=True)
    m.data_path = lambda name: os.path.join(tmp, 'data', name)

    print('\nURL normalization (a missed match is money spent)')
    variants = [
        'https://www.reddit.com/r/keto/comments/aaa/thread_a/',
        'http://old.reddit.com/r/keto/comments/aaa/thread_a',
        'https://reddit.com/r/keto/comments/aaa/thread_a/?utm_source=share',
        'https://np.reddit.com/r/keto/comments/aaa/Thread_A/',
    ]
    norms = {m.normalize(v) for v in variants}
    check('http/https, www/old/np, trailing slash and query all normalize alike',
          len(norms) == 1)
    check('distinct threads stay distinct', m.normalize(URL_A) != m.normalize(URL_B))

    print('\nFirst run: nothing cached, everything mined')
    calls, out, code = run('kd', [URL_A, URL_B])
    check('one API call made', len(calls) == 1)
    check('both URLs sent to the actor', sorted(calls[0]) == sorted([URL_A, URL_B]))
    check('both threads in the output', len(out['threads']) == 2)
    check('comments captured', all(t['comments'] for t in out['threads']))
    check('titles captured', all(t['title'] for t in out['threads']))

    print('\nSecond run, same threads: cache serves them, no API call')
    calls, out, code = run('kd', [URL_A, URL_B])
    check('NO API call made', len(calls) == 0)
    check('both threads still in the output', len(out['threads']) == 2)
    check('comments still present from cache',
          all(len(t['comments']) == 3 for t in out['threads']))
    check('output records them as cached', len(out['from_cache']) == 2)

    print('\nMixed run: only the new thread is paid for')
    URL_C = 'https://www.reddit.com/r/keto/comments/ccc/thread_c/'
    calls, out, code = run('kd', [URL_A, URL_C])
    check('exactly one API call', len(calls) == 1)
    check('ONLY the uncached URL was sent', calls[0] == [URL_C])
    check('cached thread still returned', len(out['threads']) == 2)
    check('cached thread kept its comments',
          next(t for t in out['threads'] if t['url'] == URL_A)['comments'])
    check('new thread got comments',
          next(t for t in out['threads'] if t['url'] == URL_C)['comments'])

    print('\nA URL variant of a cached thread is still a cache hit')
    calls, out, code = run('kd', ['https://old.reddit.com/r/keto/comments/aaa/thread_a?x=1'])
    check('NO API call for the variant', len(calls) == 0)

    print('\nDuplicate URLs within one request are collapsed')
    calls, out, code = run('kd', [URL_B, URL_B])
    check('no API call (both cached)', len(calls) == 0)
    check('one thread, not two', len(out['threads']) == 1)

    print('\n--force re-mines even cached threads')
    calls, out, code = run('kd', [URL_A], extra=['--force'])
    check('API call made despite cache', len(calls) == 1)
    check('forced URL was sent', calls[0] == [URL_A])

    print('\n--cache-days 0 expires the cache')
    calls, out, code = run('kd', [URL_A], extra=['--cache-days', '0'])
    check('expired cache causes a re-mine', len(calls) == 1)

    print('\nFetch fails, nothing cached: output untouched, exit 1')
    before = json.load(open(m.data_path('reddit-comments-kd.json')))
    URL_D = 'https://www.reddit.com/r/keto/comments/ddd/thread_d/'
    calls, out, code = run('kd', [URL_D], fail=True)
    check('exits 1', code == 1)
    check('previous output left byte-identical', out == before)

    print('\nFetch fails but some threads cached: keeps going with what we have')
    calls, out, code = run('kd', [URL_A, URL_D], fail=True)
    check('does not exit 1', code == 0)
    check('cached thread still delivered',
          any(t['url'] == URL_A and t['comments'] for t in out['threads']))

    print('\nAn empty result is not cached as permanently empty')
    cache = json.load(open(m.data_path('reddit-comments-kd-cache.json')))['threads']
    check('failed thread absent from cache', m.normalize(URL_D) not in cache)

    print('\nCache seeds from a pre-existing output file (no double payment)')
    shutil.rmtree(tmp); os.makedirs(os.path.join(tmp, 'data'))
    json.dump({'fetched_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
               'threads': [{'url': URL_A, 'title': 'seeded',
                            'comments': [{'score': 5, 'body': 'x' * 40,
                                          'created': ''}]}]},
              open(m.data_path('reddit-comments-cw.json'), 'w'))
    calls, out, code = run('cw', [URL_A])
    check('NO API call for the seeded thread', len(calls) == 0)
    check('seeded comments delivered',
          out['threads'][0]['comments'][0]['body'].startswith('x'))

    shutil.rmtree(tmp, ignore_errors=True)
    print(f'\n{PASS} passed, {FAIL} failed')
    sys.exit(1 if FAIL else 0)


if __name__ == '__main__':
    main()
