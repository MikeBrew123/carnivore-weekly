#!/usr/bin/env python3
"""Pins Gate 12: removed URLs must have a stub, on the real corpus and on fixtures."""
import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from check_unpublished_redirects import find_missing  # noqa: E402

STUB = '<meta http-equiv="refresh" content="0; url=/blog/">'


def build(tmp, posts, redirects=(), files=None):
    root = Path(tmp)
    (root / 'data').mkdir()
    (root / 'public' / 'blog').mkdir(parents=True)
    (root / 'data' / 'blog_posts.json').write_text(json.dumps({'blog_posts': posts}))
    (root / 'data' / 'redirects.json').write_text(json.dumps({'redirects': list(redirects)}))
    for rel, body in (files or {}).items():
        (root / 'public' / rel).write_text(body)
    return root


def test_real_corpus_is_clean():
    assert find_missing(ROOT) == []


def test_unpublished_post_without_file_fails():
    with tempfile.TemporaryDirectory() as t:
        root = build(t, [{'slug': 'gone', 'status': 'unpublished', 'site': 'cw'}])
        assert find_missing(root) == [
            ('public/blog/gone.html', 'Unpublished CW post has no redirect stub')]


def test_unpublished_post_with_real_page_fails():
    with tempfile.TemporaryDirectory() as t:
        root = build(t, [{'slug': 'gone', 'status': 'unpublished', 'site': 'cw'}],
                     files={'blog/gone.html': '<html><body>still here</body></html>'})
        assert len(find_missing(root)) == 1


def test_unpublished_post_with_stub_passes():
    with tempfile.TemporaryDirectory() as t:
        root = build(t, [{'slug': 'gone', 'status': 'unpublished', 'site': 'cw'}],
                     files={'blog/gone.html': STUB})
        assert find_missing(root) == []


def test_missing_site_counts_as_cw():
    with tempfile.TemporaryDirectory() as t:
        root = build(t, [{'slug': 'gone', 'status': 'unpublished'}])
        assert len(find_missing(root)) == 1


def test_other_sites_and_statuses_ignored():
    with tempfile.TemporaryDirectory() as t:
        root = build(t, [{'slug': 'kd', 'status': 'unpublished', 'site': 'kd'},
                         {'slug': 'later', 'status': 'ready', 'site': 'cw'}])
        assert find_missing(root) == []


def test_redirect_entry_without_stub_fails():
    with tempfile.TemporaryDirectory() as t:
        root = build(t, [], redirects=[{'from': 'old.html', 'to': '/new.html'}])
        assert find_missing(root) == [
            ('public/old.html', 'data/redirects.json entry has no stub')]


if __name__ == '__main__':
    tests = [v for k, v in sorted(globals().items()) if k.startswith('test_')]
    for test in tests:
        test()
        print(f'ok {test.__name__}')
    print(f'{len(tests)} passed')
