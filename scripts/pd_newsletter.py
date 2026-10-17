#!/usr/bin/env python3
"""PescoDial weekly newsletter: Sunday job (Brew, 2026-10-17).

Launch plan: docs/project-log/pd-newsletter-launch-plan-2026-10-17.md.
  * Nothing happens before LAUNCH_DATE (first live issue, Sun 2026-11-08).
  * If data/newsletters/pd/<date>.json already exists (issue 1 was hand-written
    by Sarah and approved by Brew), it is used as-is.
  * Otherwise Sarah's voice drafts the issue from the newest live PD guide not
    yet featured, with the most recent past issue as the model. One repair pass
    if a check fails. Still failing: nothing is written or sent, exit 1, and the
    workflow opens an alert issue. Skip, never send a weaker email.
  * Sending goes through send_newsletter.py --site pd, which re-runs every check.

Usage:
    python3 scripts/pd_newsletter.py                       # today's issue (Sunday job)
    python3 scripts/pd_newsletter.py --date 2026-11-15 --generate-only
    python3 scripts/pd_newsletter.py --date 2026-11-15 --test
"""
import argparse
import json
import os
import subprocess
import sys
from datetime import date as Date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import pd_newsletter_checks as checks  # noqa: E402
import pd_publish_check  # noqa: E402

LAUNCH_DATE = "2026-11-08"
MODEL = "claude-sonnet-5-5"

SYSTEM_PROMPT = """You are Sarah, PescoDial's health coach, writing the PescoDial weekly guide email.
Readers are pescatarians, mostly women aged 45 to 70, who used the free PescoDial calculator.

Write ONE issue as JSON with exactly the same keys as the example issue you are given
(subject, title, preheader, date, intro{h1, greeting, paragraphs[], signoff},
question{question, answer, link, link_label}, recipe{title, meta, method}, tip{title, text},
calculator{heading, text, button}, reply{lead, question}).

Rules, all mandatory:
- The question of the week answers the guide you are given, using ONLY facts in that guide.
  question.link is that guide's URL, exactly as given.
- The only links allowed are the guide URL given to you. No other URLs anywhere, not even as text.
- General information only. No doses, no supplement or electrolyte amounts, no medicine advice,
  no new clinical guidance. Anything about medicines goes to their doctor or pharmacist.
- No invented statistics, studies, quotes or reader stories.
- Recipe: a simple weeknight fish or seafood dinner, method in plain steps. Different from the
  recipes in the past issues you are shown. No link, no image.
- Tip: one practical shopping or kitchen tip. Different from past tips.
- Calculator box: soft. The free calculator, an honest mention of the $29 USD 7-day plan.
  No urgency, no deadlines, no "limited time".
- Reply: one easy question readers answer by hitting reply.
- Never use em-dashes. Use commas or periods. Plain warm words, contractions, short paragraphs,
  reading grade 8 or lower. Never: delve, landscape, robust, utilize, leverage, crucial, realm, navigate.
- subject under 60 characters. signoff is "Sarah".

Return ONLY the JSON object. No markdown fences, no explanation."""


def past_issues(issue_dir, before):
    out = []
    for p in sorted(Path(issue_dir).glob("20*-*-*.json")):
        if p.name.endswith(".sent.json") or p.stem >= before:
            continue
        out.append((p.stem, json.loads(p.read_text(encoding="utf-8"))))
    return out


def featured_links(issues):
    return {(i.get("question") or {}).get("link", "").split("?")[0] for _, i in issues}


def pick_guide(posts, issues, fetch=None):
    """Newest published PD guide that is live and has not been the question of the week."""
    fetch = fetch or checks._fetch_status
    used = featured_links(issues)
    pd = [p for p in posts if p.get("site") == "pd" and p.get("status") == "published"]
    pd.sort(key=lambda p: p.get("publish_date", ""), reverse=True)
    for p in pd:
        url = pd_publish_check.guide_url(p["slug"])
        if url in used:
            continue
        if fetch(url) == 200:
            return p, url
    return None, None


def guide_text(post, limit=9000):
    body = post.get("content") or post.get("body") or ""
    if isinstance(body, list):
        body = "\n".join(json.dumps(b) if not isinstance(b, str) else b for b in body)
    return checks.content_review.strip_html(str(body))[:limit]


def call_model(system, user):
    import anthropic
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        secrets = json.loads((ROOT / "secrets" / "api-keys.json").read_text())
        key = secrets.get("anthropic", {}).get("key") or secrets.get("anthropic", {}).get("api_key")
    msg = anthropic.Anthropic(api_key=key).messages.create(
        model=MODEL, max_tokens=4096, system=system,
        messages=[{"role": "user", "content": user}])
    # Newer models may return a thinking block before the text.
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")


def parse_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]
    return json.loads(text)


def draft_issue(day, post, url, issues, model=None, fetch=None):
    """(issue, problems). problems is empty only when the issue passes every check."""
    model = model or call_model
    example = issues[-1][1] if issues else {}
    recent = [{"recipe": (i.get("recipe") or {}).get("title"), "tip": (i.get("tip") or {}).get("title")}
              for _, i in issues[-8:]]
    display = Date.fromisoformat(day).strftime("%B %-d, %Y")
    user = (f"Issue date: {display} (set \"date\" to exactly this).\n\n"
            f"Example issue (match its shape and voice, not its content):\n{json.dumps(example, indent=2)}\n\n"
            f"Recipes and tips already used (do not repeat):\n{json.dumps(recent)}\n\n"
            f"This week's guide: {post.get('title')}\nURL: {url}\n\nGuide text:\n{guide_text(post)}")
    issue = parse_json(model(SYSTEM_PROMPT, user))
    issue["date"] = display
    problems = checks.check_issue(issue, checks.render(issue), fetch=fetch)
    if problems:
        fix = (user + "\n\nYour previous draft failed these checks. Return a corrected JSON issue:\n"
               + "\n".join(f"- {p}" for p in problems) + f"\n\nPrevious draft:\n{json.dumps(issue)}")
        issue = parse_json(model(SYSTEM_PROMPT, fix))
        issue["date"] = display
        problems = checks.check_issue(issue, checks.render(issue), fetch=fetch)
    return issue, problems


def main(argv=None):
    ap = argparse.ArgumentParser(description="PescoDial weekly newsletter")
    ap.add_argument("--date", default=Date.today().isoformat())
    ap.add_argument("--generate-only", action="store_true")
    ap.add_argument("--test", action="store_true", help="send to the two test inboxes only")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args(argv)

    if args.date < LAUNCH_DATE and not (args.test or args.generate_only or args.dry_run):
        print(f"PescoDial newsletter launches {LAUNCH_DATE}; {args.date} is before that. Nothing to do.")
        return 0

    issue_dir = checks.ISSUE_DIR
    path = checks.issue_path(issue_dir, args.date)
    if path.exists():
        print(f"Using existing issue {path.name}")
    else:
        issues = past_issues(issue_dir, args.date)
        post, url = pick_guide(pd_publish_check.load(pd_publish_check.DEFAULT_DATA), issues)
        if not post:
            print("SKIPPED: no live PescoDial guide that has not already been featured. Nothing sent.")
            return 1
        print(f"Drafting from {url}")
        issue, problems = draft_issue(args.date, post, url, issues)
        if problems:
            print(f"SKIPPED: the draft still failed {len(problems)} check(s) after one repair. Nothing sent.")
            for p in problems:
                print(f"  {p}")
            return 1
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(issue, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Wrote data/newsletters/pd/{path.name}")

    if args.generate_only:
        return 0
    cmd = [sys.executable, str(ROOT / "scripts" / "send_newsletter.py"), "--site", "pd", "--date", args.date]
    if args.test:
        cmd.append("--test")
    if args.dry_run:
        cmd.append("--dry-run")
    return subprocess.call(cmd)


if __name__ == "__main__":
    sys.exit(main())
