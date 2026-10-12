"""PescoDial blog health gate: one fixture per decision branch.

Run: python3 tests/test_pd_blog_health.py -v   (pytest also works)
"""

import datetime as dt
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
SCRIPT = REPO / 'scripts' / 'pd_blog_health.py'
TODAY = dt.date(2026, 10, 12)


def post(slug, age, state='Submitted and indexed', imp=0, clicks=0, pos=None):
    return {'slug': slug, 'publish_date': (TODAY - dt.timedelta(days=age)).isoformat(),
            'coverageState': state, 'lastCrawlTime': '2026-10-01T00:00:00Z',
            'impressions': imp, 'clicks': clicks, 'ctr': (clicks / imp) if imp else 0.0,
            'position': pos}


def run(fixture=None, extra_env=None, args=None):
    env = dict(os.environ, **(extra_env or {}))
    with tempfile.TemporaryDirectory() as d:
        cmd = [sys.executable, str(SCRIPT)]
        if fixture is not None:
            f = Path(d) / 'fx.json'
            f.write_text(json.dumps(fixture))
            cmd += ['--offline', str(f)]
        cmd += args or []
        r = subprocess.run(cmd, capture_output=True, text=True, env=env, timeout=120)
    return r.returncode, r.stdout + r.stderr


def fx(posts, **kw):
    return {'today': TODAY.isoformat(), 'posts': posts, **kw}


class TestPdBlogHealth(unittest.TestCase):

    def test_write_default(self):
        posts = [post(f'p{i}', 60, imp=500, clicks=20, pos=8) for i in range(5)]
        code, out = run(fx(posts))
        self.assertEqual(code, 0, out)
        self.assertIn('WRITE', out)
        self.assertNotIn('PAUSE_WRITING', out)
        self.assertIn('TITLE_FIX: none', out)
        self.assertIn('THIN_CHECK: none', out)

    def test_write_with_zero_posts(self):
        code, out = run(fx([]))
        self.assertEqual(code, 0, out)
        self.assertIn('0 published pd post(s)', out)

    def test_pause_by_index_ratio(self):
        posts = [post('a', 50), post('b', 50, 'Discovered - currently not indexed'),
                 post('c', 50, 'URL is unknown to Google'),
                 post('d', 50, 'Crawled - currently not indexed')]
        code, out = run(fx(posts))
        self.assertEqual(code, 3, out)
        self.assertIn('PAUSE_WRITING', out)
        self.assertIn('1 of 4', out)
        self.assertIn('links, not posts', out)
        self.assertIn('ISSUE-068', out)

    def test_index_ratio_exactly_half_writes(self):
        posts = [post('a', 50), post('b', 50, 'Indexed, not submitted in sitemap'),
                 post('c', 50, 'URL is unknown to Google'), post('d', 50, 'URL is unknown to Google')]
        code, out = run(fx(posts))
        self.assertEqual(code, 0, out)

    def test_index_ratio_needs_four_old_posts(self):
        posts = [post(s, 50, 'URL is unknown to Google') for s in 'abc'] + \
                [post('young', 10, 'URL is unknown to Google')]
        code, out = run(fx(posts))
        self.assertEqual(code, 0, out)

    def test_pause_by_impressions(self):
        posts = [post(f'p{i}', 90, imp=40, clicks=0, pos=30) for i in range(6)]
        code, out = run(fx(posts))
        self.assertEqual(code, 3, out)
        self.assertIn('6 posts aged 84+ days have under 100 impressions', out)
        self.assertIn('links, not posts', out)

    def test_five_low_impression_posts_writes(self):
        posts = [post(f'p{i}', 90, imp=40, pos=30) for i in range(5)] + \
                [post('ok', 90, imp=400, clicks=10, pos=12)]
        code, out = run(fx(posts))
        self.assertEqual(code, 0, out)

    def test_title_fix_listing(self):
        posts = [post('needs-title', 30, imp=800, clicks=4, pos=6.2),   # ctr 0.5%
                 post('fine-ctr', 30, imp=800, clicks=40, pos=6.2),      # ctr 5%
                 post('deep-pos', 30, imp=800, clicks=1, pos=14.0),      # pos > 10
                 post('few-imp', 30, imp=200, clicks=0, pos=5.0)]        # imp < 300
        code, out = run(fx(posts))
        self.assertEqual(code, 0, out)
        section = out.split('TITLE_FIX:')[1].split('THIN_CHECK:')[0]
        self.assertIn('needs-title', section)
        for slug in ('fine-ctr', 'deep-pos', 'few-imp'):
            self.assertNotIn(slug, section)

    def test_thin_listing(self):
        posts = [post('thin-one', 20, 'Crawled - currently not indexed'), post('good', 20)]
        code, out = run(fx(posts))
        self.assertEqual(code, 0, out)
        section = out.split('THIN_CHECK:')[1]
        self.assertIn('thin-one', section)
        self.assertNotIn('good', section)

    def test_api_failure_fixture(self):
        code, out = run(fx([], gsc_error='HttpError 429 quota exceeded'))
        self.assertEqual(code, 0, out)
        self.assertIn('GSC_UNAVAILABLE', out)
        self.assertNotIn('TITLE_FIX', out)

    def test_api_failure_live_bad_credentials(self):
        """Real live path with an unreadable credentials file: never blocks, never fakes, no cache write."""
        cache = REPO / 'data' / 'pd-blog-health.json'
        before = cache.read_bytes() if cache.exists() else None
        code, out = run(None, extra_env={'PD_GSC_CREDENTIALS': '/nonexistent/creds.json'})
        self.assertEqual(code, 0, out)
        self.assertIn('GSC_UNAVAILABLE', out)
        after = cache.read_bytes() if cache.exists() else None
        self.assertEqual(before, after)


if __name__ == '__main__':
    unittest.main()
