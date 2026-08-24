#!/usr/bin/env python3
"""Mechanical content-quality scorer for queued blog posts (CW + KD).

Built 2026-08-24 (Brew's content-review routine). Checks every metric that
can be measured without a model:
  - Flesch-Kincaid reading grade (house target: 8-10, warn above 11)
  - AI-tell words (the banned list from the writer prompts)
  - Em-dashes (banned everywhere)
  - Contraction density (too few reads as AI/formal)
  - Internal links (house rule: at least 1, ideally 2+)
  - Cross-site links (CW->KD links help KD's crawl-demand problem)

Usage:
  python3 scripts/content_review.py             # all status=ready posts not yet review-passed
  python3 scripts/content_review.py --all-ready # all status=ready posts
  python3 scripts/content_review.py --slugs A B
  python3 scripts/content_review.py --json      # machine-readable output

Exit codes: 0 = clean, 2 = at least one post has critical issues
(em-dash, AI-tell, or grade > 12). The editorial review task fixes flagged
posts before they publish.
"""

import argparse
import json
import re
import sys

BLOG_JSON = '/Users/mbrew/Developer/carnivore-weekly/data/blog_posts.json'

AI_TELLS = ['delve', 'landscape', 'robust', 'utilize', 'facilitate', 'crucial',
            'realm', 'tapestry', 'moreover', 'furthermore', 'embark',
            "it's important to note", 'in conclusion']
# "leverage" is banned as corporate-speak, but "protein leverage" is a real
# scientific term the site legitimately covers.
LEVERAGE_OK = re.compile(r'protein\s+leverage', re.I)

CONTRACTIONS = ["n't", "'re", "'ll", "'ve", "'m", "it's", "that's", "there's",
                "what's", "let's", "here's", "who's", "she's", "he's"]


def strip_html(html):
    text = re.sub(r'<[^>]+>', ' ', html or '')
    text = re.sub(r'&[a-z]+;', ' ', text)
    return re.sub(r'\s+', ' ', text).strip()


def syllables(word):
    word = word.lower().strip(".,!?;:'\"")
    if not word:
        return 0
    groups = re.findall(r'[aeiouy]+', word)
    n = len(groups)
    if word.endswith('e') and n > 1 and not word.endswith(('le', 'ye')):
        n -= 1
    return max(1, n)


def fk_grade(text):
    sentences = max(1, len(re.findall(r'[.!?]+', text)))
    words = re.findall(r"[A-Za-z']+", text)
    if not words:
        return 0.0
    syl = sum(syllables(w) for w in words)
    return round(0.39 * (len(words) / sentences) + 11.8 * (syl / len(words)) - 15.59, 1)


def review_post(p):
    html = p.get('content', '')
    text = strip_html(html)
    low = text.lower()
    words = re.findall(r"[A-Za-z']+", text)
    wc = len(words)

    tells = []
    for t in AI_TELLS:
        c = low.count(t)
        if c:
            tells.append(f'{t} x{c}')
    lev = len(re.findall(r'\bleverag\w*\b', low)) - len(LEVERAGE_OK.findall(text))
    if lev > 0:
        tells.append(f'leverage x{lev}')

    emdash = html.count('—') + html.count('&mdash;')
    contr = sum(low.count(c) for c in CONTRACTIONS)
    contr_per_k = round(contr / wc * 1000, 1) if wc else 0

    links = re.findall(r'href="([^"]+)"', html)
    internal = [l for l in links if '/blog/' in l and 'http' not in l] + \
               [l for l in links if ('carnivoreweekly.com' in l if p.get('site', 'cw') == 'cw'
                                     else 'ketodial.com' in l)]
    cross = [l for l in links if ('ketodial.com' in l if p.get('site', 'cw') == 'cw'
                                  else 'carnivoreweekly.com' in l)]

    grade = fk_grade(text)
    critical, warn = [], []
    if emdash:
        critical.append(f'{emdash} em-dash(es)')
    if tells:
        critical.append('AI tells: ' + ', '.join(tells))
    if grade > 12:
        critical.append(f'reading grade {grade} (target 8-10)')
    elif grade > 11:
        warn.append(f'reading grade {grade} (target 8-10)')
    if contr_per_k < 2 and wc > 300:
        warn.append(f'low contraction density ({contr_per_k}/1k words) reads formal/AI')
    if not internal:
        warn.append('no internal links')
    if wc < 500:
        warn.append(f'short ({wc} words)')

    return {'slug': p['slug'], 'site': p.get('site', 'cw'), 'author': p.get('author'),
            'publish_date': p.get('publish_date'), 'words': wc, 'grade': grade,
            'contractions_per_1k': contr_per_k, 'internal_links': len(internal),
            'cross_site_links': len(cross), 'critical': critical, 'warnings': warn}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slugs', nargs='*')
    ap.add_argument('--all-ready', action='store_true')
    ap.add_argument('--json', action='store_true')
    args = ap.parse_args()

    d = json.load(open(BLOG_JSON))
    posts = d if isinstance(d, list) else d.get('blog_posts', [])
    if args.slugs:
        targets = [p for p in posts if p['slug'] in args.slugs]
    else:
        targets = [p for p in posts if p.get('status') == 'ready'
                   and (args.all_ready or not (p.get('review') or {}).get('passed'))]

    results = [review_post(p) for p in targets]
    any_critical = any(r['critical'] for r in results)

    if args.json:
        print(json.dumps(results, indent=1))
    else:
        for r in results:
            flag = 'CRIT' if r['critical'] else ('warn' if r['warnings'] else 'ok  ')
            print(f"[{flag}] {r['publish_date']} [{r['site']}] {r['slug'][:55]:55s} "
                  f"gr{r['grade']:>5} | {r['words']}w | int {r['internal_links']} | x-site {r['cross_site_links']}")
            for c in r['critical']:
                print(f'        CRITICAL: {c}')
            for w in r['warnings']:
                print(f'        warn: {w}')
        print(f'\n{len(results)} posts reviewed, '
              f'{sum(1 for r in results if r["critical"])} critical, '
              f'{sum(1 for r in results if r["warnings"] and not r["critical"])} warn-only')
    return 2 if any_critical else 0


if __name__ == '__main__':
    sys.exit(main())
