#!/usr/bin/env python3
"""
Weekly Newsletter Generator & Sender for CW and KD.

Generates editorial content via Anthropic API, renders HTML newsletters,
and sends them via Resend.

Usage:
    python3 scripts/weekly_newsletter.py                     # Generate + send both
    python3 scripts/weekly_newsletter.py --site cw           # CW only
    python3 scripts/weekly_newsletter.py --site kd           # KD only
    python3 scripts/weekly_newsletter.py --generate-only     # Generate, don't send
    python3 scripts/weekly_newsletter.py --test              # Send to iambrew@gmail.com only
    python3 scripts/weekly_newsletter.py --dry-run           # Show what would happen
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
TODAY = datetime.now().strftime("%Y-%m-%d")
TODAY_DISPLAY = datetime.now().strftime("%B %d, %Y")

# ---------------------------------------------------------------------------
# Secrets / config
# ---------------------------------------------------------------------------

def load_secrets():
    """Load API keys from secrets file or environment."""
    secrets_path = PROJECT_ROOT / "secrets" / "api-keys.json"
    if secrets_path.exists():
        return json.loads(secrets_path.read_text())
    return {}


def get_anthropic_key():
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        return key
    secrets = load_secrets()
    key = secrets.get("anthropic", {}).get("key") or secrets.get("anthropic", {}).get("api_key")
    if not key:
        print("Error: ANTHROPIC_API_KEY not set and not found in secrets/api-keys.json")
        sys.exit(1)
    return key


def get_resend_key():
    key = os.environ.get("RESEND_API_KEY")
    if key:
        return key
    secrets = load_secrets()
    key = secrets.get("resend", {}).get("key")
    if not key:
        print("Error: RESEND_API_KEY not set and not found in secrets/api-keys.json")
        sys.exit(1)
    return key


# ---------------------------------------------------------------------------
# Blog post readers
# ---------------------------------------------------------------------------

def get_recent_cw_posts(days=7):
    """Get CW posts published in the last N days from blog_posts.json."""
    bp_path = PROJECT_ROOT / "data" / "blog_posts.json"
    if not bp_path.exists():
        return []

    data = json.loads(bp_path.read_text())
    posts = data.get("blog_posts", data if isinstance(data, list) else [])

    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    recent = []
    for p in posts:
        pub_date = p.get("publish_date") or p.get("date", "")
        if p.get("status") == "published" and pub_date >= cutoff:
            recent.append(p)

    recent.sort(key=lambda x: x.get("publish_date", ""), reverse=True)
    return recent[:5]


def get_recent_kd_posts(days=7):
    """Get KD posts published in the last N days by parsing JSON-LD from HTML files."""
    blog_dir = PROJECT_ROOT / "ketodial" / "public" / "blog"
    if not blog_dir.exists():
        return []

    cutoff = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    recent = []

    for html_file in blog_dir.glob("*.html"):
        if html_file.name == "index.html":
            continue
        try:
            content = html_file.read_text(encoding="utf-8")
            ld_match = re.search(
                r'<script type="application/ld\+json">(.*?)</script>',
                content, re.DOTALL,
            )
            if not ld_match:
                continue
            ld = json.loads(ld_match.group(1))
            pub_date = ld.get("datePublished", "")
            if pub_date >= cutoff:
                recent.append({
                    "slug": html_file.stem,
                    "title": ld.get("headline", html_file.stem),
                    "author": ld.get("author", {}).get("name", ""),
                    "description": ld.get("description", ""),
                    "date": pub_date,
                    "url": f"https://ketodial.com/blog/{html_file.name}",
                })
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue

    recent.sort(key=lambda x: x.get("date", ""), reverse=True)
    return recent


# ---------------------------------------------------------------------------
# Anthropic API helper
# ---------------------------------------------------------------------------

def call_anthropic(system_prompt, user_prompt, api_key):
    """Call Anthropic API and return text response."""
    try:
        import anthropic
    except ImportError:
        print("Error: pip3 install anthropic")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text


# ---------------------------------------------------------------------------
# CW Newsletter Generation
# ---------------------------------------------------------------------------

VOICE_RULES = """Voice rules (MANDATORY):
- No em-dashes (use periods or commas instead, max 1 em-dash per entire newsletter)
- Never use these words: delve, landscape, robust, utilize, leverage, facilitate, crucial, realm, navigate
- Use contractions (it's, don't, can't, won't, we've)
- Conversational tone, like talking to a friend over coffee
- Grade 8-10 reading level
- Short paragraphs (2-4 sentences max)"""

CW_SYSTEM_PROMPT = f"""You are generating editorial content for the Carnivore Weekly newsletter.
You write in three voices:
- Sarah (Health Coach): Warm, evidence-based, reassuring. Focuses on health and science.
- Marcus (Performance Coach): Direct, practical, results-oriented. Focuses on fitness and metrics.
- Chloe (Community Manager): Upbeat, relatable, culturally aware. Focuses on trends and community.

{VOICE_RULES}

Return ONLY valid JSON. No markdown fences, no explanation."""


def generate_cw_content(recent_posts, api_key):
    """Generate CW newsletter content JSON via Anthropic API."""
    post_summaries = []
    for p in recent_posts:
        post_summaries.append(
            f"- \"{p['title']}\" by {p.get('author','unknown')} ({p.get('category','')}) — {p.get('excerpt','')}"
        )

    posts_text = "\n".join(post_summaries) if post_summaries else "No posts this week."

    user_prompt = f"""Generate the Carnivore Weekly newsletter content for {TODAY_DISPLAY}.

Recent blog posts published this week:
{posts_text}

Return a JSON object with these exact keys:
{{
  "date": "{TODAY}",
  "subject_line": "Catchy subject line, 6-10 words",
  "opening": "<p style='margin:0;'>Chloe voice, 2-3 sentences welcoming readers and teasing this week's content</p>",
  "blog_teasers": [
    {{"slug": "post-slug", "title": "Post Title", "writer": "WriterName", "teaser": "2-3 sentence hook that makes people want to click"}}
  ],
  "by_the_numbers": "<table role='presentation' width='100%' cellpadding='0' cellspacing='0' border='0'><tr><td width='33%' align='center' valign='top' style='padding:8px 4px;'><span style='font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#1C1210;'>NUM</span><br><span style='font-family:Verdana,Geneva,sans-serif;font-size:11px;color:#9B8574;text-transform:uppercase;letter-spacing:0.5px;'>LABEL</span></td><td width='34%' align='center' valign='top' style='padding:8px 4px;border-left:1px solid #E5DDD4;border-right:1px solid #E5DDD4;'><span style='font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#1C1210;'>NUM</span><br><span style='font-family:Verdana,Geneva,sans-serif;font-size:11px;color:#9B8574;text-transform:uppercase;letter-spacing:0.5px;'>LABEL</span></td><td width='33%' align='center' valign='top' style='padding:8px 4px;'><span style='font-family:Georgia,serif;font-size:28px;font-weight:bold;color:#1C1210;'>NUM</span><br><span style='font-family:Verdana,Geneva,sans-serif;font-size:11px;color:#9B8574;text-transform:uppercase;letter-spacing:0.5px;'>LABEL</span></td></tr></table>",
  "whats_trending": "<p style='margin:0;'>Chloe voice, 2-3 trends in the carnivore community with bold headers</p>",
  "community_pulse": "<p style='margin:0;'>Sarah voice, health insight from the community this week</p>",
  "looking_ahead": "<p style='font-family:Verdana,Geneva,sans-serif;font-size:14px;color:#1C1210;line-height:1.6;'>Marcus voice, what's coming next week</p>"
}}

For blog_teasers, create one entry per recent post (max 5). Use the actual slug and title from the posts above.
For by_the_numbers, use 3 real/plausible stats related to this week's content. Use the exact HTML table format shown.
All HTML content must use inline styles. No classes."""

    print("  Calling Anthropic API for CW content...")
    raw = call_anthropic(CW_SYSTEM_PROMPT, user_prompt, api_key)

    # Strip markdown fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    content = json.loads(raw)
    content["date"] = TODAY
    return content


def render_cw_newsletter():
    """Render CW newsletter HTML using existing generate_newsletter.py."""
    script = PROJECT_ROOT / "scripts" / "generate_newsletter.py"
    result = subprocess.run(
        [sys.executable, str(script), "--date", TODAY],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0:
        print(f"  Error rendering CW newsletter: {result.stderr}")
        return False
    print("  CW newsletter rendered successfully")
    return True


# ---------------------------------------------------------------------------
# KD Newsletter Generation
# ---------------------------------------------------------------------------

def get_next_kd_issue_number():
    """Scan existing KD newsletters to find the next issue number."""
    newsletter_dir = PROJECT_ROOT / "ketodial" / "public" / "newsletter"
    if not newsletter_dir.exists():
        return 1

    max_issue = 0
    for f in newsletter_dir.glob("202*.html"):
        content = f.read_text(encoding="utf-8")
        matches = re.findall(r"Issue [#№](\d+)", content)
        for m in matches:
            max_issue = max(max_issue, int(m))
    return max_issue + 1


KD_SYSTEM_PROMPT = f"""You are generating editorial content for the KetoDial newsletter "The Weekly Dial-In".
You write in three voices:
- Sarah (Health Coach): Evidence-based keto science, electrolytes, fat adaptation, blood markers.
- Marcus (Performance Coach): Recipes, cooking technique, meal prep, practical tips.
- Chloe (Community Manager): Community trends, what people are asking, relatable observations.

The newsletter is for people following a ketogenic diet. Focus on practical advice.

{VOICE_RULES}

Return ONLY valid JSON. No markdown fences, no explanation."""


def generate_kd_content(recent_posts, issue_number, api_key):
    """Generate KD newsletter editorial sections via Anthropic API."""
    post_summaries = []
    for p in recent_posts:
        post_summaries.append(f"- \"{p['title']}\" by {p['author']} — {p['description']}")

    posts_text = "\n".join(post_summaries) if post_summaries else "No new posts this week."

    # Collect all KD blog posts for quick-links section
    all_kd_posts = []
    blog_dir = PROJECT_ROOT / "ketodial" / "public" / "blog"
    for html_file in blog_dir.glob("*.html"):
        if html_file.name == "index.html":
            continue
        try:
            content = html_file.read_text(encoding="utf-8")
            ld_match = re.search(
                r'<script type="application/ld\+json">(.*?)</script>',
                content, re.DOTALL,
            )
            if ld_match:
                ld = json.loads(ld_match.group(1))
                all_kd_posts.append({
                    "slug": html_file.stem,
                    "title": ld.get("headline", ""),
                    "url": f"https://ketodial.com/blog/{html_file.name}",
                })
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue

    user_prompt = f"""Generate content for KetoDial newsletter issue #{issue_number}, dated {TODAY_DISPLAY}.

Recent KD blog posts this week:
{posts_text}

All available KD blog posts (for quick-links):
{json.dumps([{{"title": p["title"], "slug": p["slug"]}} for p in all_kd_posts[:20]], indent=2)}

Return a JSON object with these keys:
{{
  "issue_number": {issue_number},
  "issue_theme": "Short theme name, 2-4 words",
  "headline": "Big headline for the header, compelling and specific",
  "subheadline": "One sentence expanding on the headline, sets up the issue",
  "preheader": "Hidden preview text for email clients, ~120 chars",
  "feature_image_alt": "Alt text describing an ideal food photo for this issue",
  "opening": "Chloe voice, 2-3 sentences. Reference recent posts naturally. Include HTML links where relevant. Use <p> tags with style='margin:0 0 12px;'",
  "dialin_title": "Sarah's main article title",
  "dialin_body": "Sarah voice, 300-500 word educational piece. Use <p> and <strong> tags with inline styles. Reference the KetoDial calculator naturally.",
  "recipe_title": "Recipe name",
  "recipe_intro": "One sentence about the recipe",
  "recipe_servings": "2",
  "recipe_time": "25 min",
  "recipe_macros": "550 kcal / 38g fat / 45g protein / 3g net carbs",
  "recipe_ingredients": "Ingredient list as HTML",
  "recipe_steps": "Numbered steps as <ol> HTML",
  "recipe_why": "One paragraph on why this works for keto",
  "community_body": "Chloe voice, 3 community observations with bold headers. Link to relevant KD blog posts using full URLs with UTM params: ?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_dialin_{issue_number:02d}",
  "quick_links": [
    {{"title": "Article title", "url": "https://ketodial.com/blog/slug.html?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_dialin_{issue_number:02d}", "read_time": "5 min"}}
  ]
}}

For quick_links, pick 3 evergreen KD posts that relate to this week's theme. Use actual URLs from the post list above.
All content must use inline styles. No CSS classes."""

    print("  Calling Anthropic API for KD content...")
    raw = call_anthropic(KD_SYSTEM_PROMPT, user_prompt, api_key)

    raw = raw.strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```(?:json)?\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw)

    return json.loads(raw)


def build_kd_newsletter_html(content):
    """Build complete KD newsletter HTML matching existing structure."""
    issue_num = content["issue_number"]
    utm = f"weekly_dialin_{issue_num:02d}"
    date_display = datetime.strptime(TODAY, "%Y-%m-%d").strftime("%B %-d, %Y")

    # Pick a feature image from existing KD recipe images
    recipe_images_dir = PROJECT_ROOT / "ketodial" / "public" / "images" / "recipes"
    feature_image = "https://ketodial.com/images/recipes/recipe-garlic-butter-ribeye-asparagus.jpg"
    if recipe_images_dir.exists():
        imgs = list(recipe_images_dir.glob("recipe-*.jpg"))
        if imgs:
            # Pick one based on issue number for variety
            pick = imgs[issue_num % len(imgs)]
            feature_image = f"https://ketodial.com/images/recipes/{pick.name}"

    html = f"""<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>The Weekly Dial-In — KetoDial</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
</head>
<body style="margin:0;padding:0;background:#e7edf3;font-family:'Hanken Grotesk',Arial,Helvetica,sans-serif;">

<!-- preheader (hidden) -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#e7edf3;font-size:1px;line-height:1px;">
  {content.get("preheader", "")}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
</div>

<center style="width:100%;background:#e7edf3;">
<!--[if mso]><table role="presentation" width="600" align="center"><tr><td><![endif]-->
<table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;margin:0 auto;">

  <!-- top bar -->
  <tr><td style="padding:18px 4px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
      <td align="left" style="font-family:monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#64788e;">Issue №{issue_num} · {date_display}</td>
      <td align="right" style="font-family:monospace;font-size:11px;color:#64788e;"><a href="https://ketodial.com/newsletter/{TODAY}.html" style="color:#0891b2;text-decoration:none;">View in browser</a></td>
    </tr></table>
  </td></tr>

  <!-- main card -->
  <tr><td style="padding:0 4px 30px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:18px;overflow:hidden;">

      <!-- ===== HEADER ===== -->
      <tr><td style="background:#0b1620;padding:30px 34px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="left" style="vertical-align:middle;">
              <span style="font-family:Arial,sans-serif;font-weight:800;font-size:18px;letter-spacing:-0.02em;color:#ffffff;">Keto<span style="color:#38bdf8;">Dial</span></span>
            </td>
            <td align="right" style="font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#6da6c9;vertical-align:middle;">The Weekly Dial-In</td>
          </tr>
        </table>

        <div style="height:24px;line-height:24px;font-size:24px;">&nbsp;</div>
        <div style="font-family:monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#38bdf8;padding-bottom:12px;">Issue #{issue_num} · {content.get("issue_theme", "Weekly Update")}</div>
        <div style="font-family:Georgia,serif;font-weight:500;font-size:32px;line-height:1.08;letter-spacing:-0.01em;color:#ffffff;">{content.get("headline", "This Week on KetoDial")}</div>
        <div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#bcd4e3;padding-top:14px;">{content.get("subheadline", "")}</div>
      </td></tr>

      <!-- ===== FEATURE IMAGE ===== -->
      <tr><td style="padding:26px 34px 0;">
        <a href="https://ketodial.com/?utm_source=newsletter&utm_medium=email&utm_campaign={utm}#calc" style="text-decoration:none;">
          <img src="{feature_image}" alt="{content.get("feature_image_alt", "Keto meal")}" width="532" style="width:100%;height:auto;border-radius:14px;display:block;" />
        </a>
      </td></tr>

      <!-- ===== OPENING — Chloe ===== -->
      <tr><td style="padding:16px 34px 6px;">
        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:#475569;">
          {content.get("opening", "")}
        </div>
      </td></tr>

      <!-- divider -->
      <tr><td style="padding:24px 34px 0;"><div style="height:1px;background:#e2e8f0;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

      <!-- ===== DIAL-IN OF THE WEEK — Sarah ===== -->
      <tr><td style="padding:26px 34px 0;">
        <div style="font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#0891b2;padding-bottom:14px;">Dial-in of the week</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:#475569;">
          <p style="margin:0 0 12px;"><strong style="color:#0f172a;">{content.get("dialin_title", "")}</strong></p>
          {content.get("dialin_body", "")}
        </div>
      </td></tr>

      <!-- divider -->
      <tr><td style="padding:24px 34px 0;"><div style="height:1px;background:#e2e8f0;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

      <!-- ===== RECIPE — Marcus ===== -->
      <tr><td style="padding:26px 34px 0;">
        <div style="font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#0891b2;padding-bottom:14px;">Cook this week</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:#475569;">
          <p style="margin:0 0 12px;"><strong style="color:#0f172a;font-size:18px;">{content.get("recipe_title", "")}</strong></p>
          <p style="margin:0 0 12px;"><strong>Serves:</strong> {content.get("recipe_servings", "2")} &nbsp;|&nbsp; <strong>Prep + Cook:</strong> {content.get("recipe_time", "25 min")} &nbsp;|&nbsp; <strong>Macros (per serving):</strong> {content.get("recipe_macros", "")}</p>
          <p style="margin:0 0 8px;">{content.get("recipe_intro", "")}</p>
          <p style="margin:0 0 8px;"><strong>What you need:</strong><br>{content.get("recipe_ingredients", "")}</p>
          {content.get("recipe_steps", "")}
          <p style="margin:0;"><strong>Why it works for keto:</strong> {content.get("recipe_why", "")}</p>
        </div>
      </td></tr>

      <!-- divider -->
      <tr><td style="padding:24px 34px 0;"><div style="height:1px;background:#e2e8f0;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

      <!-- ===== WHAT WE'RE HEARING — Chloe ===== -->
      <tr><td style="padding:26px 34px 0;">
        <div style="font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#0891b2;padding-bottom:14px;">What we're hearing</div>
        <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.65;color:#475569;">
          {content.get("community_body", "")}
        </div>
      </td></tr>

      <!-- divider -->
      <tr><td style="padding:24px 34px 0;"><div style="height:1px;background:#e2e8f0;line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

      <!-- ===== CALCULATOR CTA ===== -->
      <tr><td style="padding:26px 34px 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b1620;border-radius:16px;">
          <tr><td style="padding:26px 28px;">
            <div style="font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#38bdf8;padding-bottom:9px;">Free tool</div>
            <div style="font-family:Georgia,serif;font-weight:500;font-size:22px;color:#ffffff;letter-spacing:-0.01em;padding-bottom:6px;">Dial in your fat-to-protein ratio</div>
            <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#9fc0d6;padding-bottom:18px;">Get your personalized keto macros in about 30 seconds. No signup, completely free.</div>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#38bdf8;border-radius:11px;">
              <a href="https://ketodial.com/?utm_source=newsletter&utm_medium=email&utm_campaign={utm}#calc" style="display:inline-block;font-family:Arial,sans-serif;font-weight:700;font-size:14px;color:#062234;padding:13px 22px;text-decoration:none;">Open the calculator →</a>
            </td></tr></table>
          </td></tr>
        </table>
      </td></tr>

      <!-- ===== QUICK LINKS ===== -->
      <tr><td style="padding:26px 34px 6px;">
        <div style="font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#94a3b8;padding-bottom:14px;">Also worth a read</div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">"""

    quick_links = content.get("quick_links", [])
    for i, link in enumerate(quick_links[:3]):
        border = 'border-bottom:1px solid #eef2f6;' if i < len(quick_links) - 1 else ''
        html += f"""
          <tr><td style="padding:9px 0;{border}">
            <a href="{link['url']}" style="font-family:Arial,sans-serif;font-weight:600;font-size:14.5px;color:#0f172a;text-decoration:none;">{link['title']}</a>
            <span style="font-family:monospace;font-size:11px;color:#94a3b8;"> · {link.get('read_time', '5 min')}</span>
          </td></tr>"""

    html += f"""
        </table>
      </td></tr>

      <!-- ===== CROSS-PROMO — Carnivore Weekly ===== -->
      <tr><td style="padding:20px 34px 30px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF7F2;border-radius:14px;border-left:3px solid #C8956C;overflow:hidden;">
          <tr><td style="padding:22px 26px;">
            <div style="font-family:monospace;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#9B8574;padding-bottom:10px;">Love this? You might also like</div>
            <a href="https://carnivoreweekly.com/?utm_source=kd_newsletter&utm_medium=email&utm_campaign=cross_promo" style="font-family:Georgia,serif;font-weight:500;font-size:18px;color:#0f172a;text-decoration:none;">Carnivore Weekly — Your Weekly Carnivore Briefing</a>
            <div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.55;color:#475569;padding-top:8px;">Research, trending videos, and community intel from the carnivore world. Same team, meat-focused.</div>
            <div style="padding-top:12px;"><a href="https://carnivoreweekly.com/?utm_source=kd_newsletter&utm_medium=email&utm_campaign=cross_promo" style="font-family:Arial,sans-serif;font-weight:600;font-size:13.5px;color:#C8956C;text-decoration:none;">Check it out →</a></div>
          </td></tr>
        </table>
      </td></tr>

    </table>
  </td></tr>

  <!-- ===== FOOTER ===== -->
  <tr><td style="padding:0 4px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center" style="padding:6px 0 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="padding:0 9px;"><a href="https://ketodial.com/?utm_source=newsletter&utm_medium=email#calc" style="font-family:monospace;font-size:11px;color:#64788e;text-decoration:none;">Calculator</a></td>
          <td style="color:#c7d2de;">·</td>
          <td style="padding:0 9px;"><a href="https://ketodial.com/blog/?utm_source=newsletter&utm_medium=email" style="font-family:monospace;font-size:11px;color:#64788e;text-decoration:none;">Guides</a></td>
          <td style="color:#c7d2de;">·</td>
          <td style="padding:0 9px;"><a href="https://ketodial.com/recipes/?utm_source=newsletter&utm_medium=email" style="font-family:monospace;font-size:11px;color:#64788e;text-decoration:none;">Recipes</a></td>
        </tr></table>
      </td></tr>
      <tr><td align="center" style="font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#8499ad;padding:0 20px 14px;">
        You're getting this because you subscribed to The Weekly Dial-In.<br />
        KetoDial provides general nutrition information, not medical advice.<br />
        <a href="{{{{unsubscribe_url}}}}" style="color:#64788e;text-decoration:underline;">Unsubscribe</a>
      </td></tr>
      <tr><td align="center" style="font-family:monospace;font-size:10.5px;color:#aab9c9;padding-top:4px;">
        © 2026 KetoDial · Whistler, BC, Canada
      </td></tr>
    </table>
  </td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->
</center>
</body>
</html>
"""
    return html


def save_kd_newsletter(html):
    """Save KD newsletter to file and update latest.html."""
    newsletter_dir = PROJECT_ROOT / "ketodial" / "public" / "newsletter"
    newsletter_dir.mkdir(parents=True, exist_ok=True)

    out_path = newsletter_dir / f"{TODAY}.html"
    out_path.write_text(html, encoding="utf-8")
    print(f"  Saved {out_path}")

    latest_path = newsletter_dir / "latest.html"
    latest_path.write_text(html, encoding="utf-8")
    print(f"  Updated {latest_path}")
    return out_path


# ---------------------------------------------------------------------------
# Sending
# ---------------------------------------------------------------------------

def send_newsletter(site, test=False, dry_run=False):
    """Call send_newsletter.py for a given site."""
    script = PROJECT_ROOT / "scripts" / "send_newsletter.py"
    cmd = [sys.executable, str(script), "--site", site, "--date", TODAY]
    if test:
        cmd.append("--test")
    if dry_run:
        cmd.append("--dry-run")

    print(f"  Running: {' '.join(cmd[-4:])}")
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=str(PROJECT_ROOT))

    if result.stdout:
        # Print key lines only
        for line in result.stdout.strip().split("\n"):
            if any(kw in line for kw in ["sent", "failed", "DRY RUN", "Results", "TEST", "Error", "Subject", "recipient"]):
                print(f"    {line.strip()}")

    if result.returncode != 0:
        print(f"  Error sending {site}: {result.stderr[:200]}")
        return False
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Weekly newsletter generator + sender")
    parser.add_argument("--site", choices=["cw", "kd", "both"], default="both",
                        help="Which newsletter(s) to generate (default: both)")
    parser.add_argument("--generate-only", action="store_true",
                        help="Generate content and HTML only, don't send")
    parser.add_argument("--test", action="store_true",
                        help="Send only to iambrew@gmail.com")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would happen without doing it")
    parser.add_argument("--date", help="Override date (YYYY-MM-DD)", default=None)
    args = parser.parse_args()

    global TODAY, TODAY_DISPLAY
    if args.date:
        TODAY = args.date
        TODAY_DISPLAY = datetime.strptime(args.date, "%Y-%m-%d").strftime("%B %d, %Y")

    sites = ["cw", "kd"] if args.site == "both" else [args.site]
    api_key = get_anthropic_key()

    print(f"\n{'=' * 60}")
    print(f"  WEEKLY NEWSLETTER — {TODAY_DISPLAY}")
    print(f"  Sites: {', '.join(s.upper() for s in sites)}")
    print(f"  Mode: {'dry-run' if args.dry_run else 'generate-only' if args.generate_only else 'test' if args.test else 'live'}")
    print(f"{'=' * 60}\n")

    results = {}

    # --- CW ---
    if "cw" in sites:
        print("[CW] Checking for recent posts...")
        cw_posts = get_recent_cw_posts()
        if not cw_posts:
            print("[CW] No published posts in the last 7 days. Skipping CW newsletter.")
            results["cw"] = "skipped"
        else:
            print(f"[CW] Found {len(cw_posts)} recent posts")

            if not args.dry_run:
                # Step 1: Generate content
                print("[CW] Step 1: Generating content...")
                content = generate_cw_content(cw_posts, api_key)
                content_path = PROJECT_ROOT / "data" / "newsletter_content.json"
                content_path.write_text(json.dumps(content, indent=2, ensure_ascii=False), encoding="utf-8")
                print(f"  Saved {content_path}")
                print(f"  Subject: {content.get('subject_line', 'N/A')}")

                # Step 2: Render HTML
                print("[CW] Step 2: Rendering newsletter...")
                if not render_cw_newsletter():
                    results["cw"] = "render_failed"
                else:
                    results["cw"] = "generated"
            else:
                print("[CW] Dry run: would generate content and render newsletter")
                results["cw"] = "dry_run"

            # Step 4: Send (only if we actually generated the HTML)
            if not args.generate_only and not args.dry_run and results.get("cw") == "generated":
                print("[CW] Step 3: Sending...")
                if send_newsletter("cw", test=args.test):
                    results["cw"] = "sent"
                else:
                    results["cw"] = "send_failed"

    # --- KD ---
    if "kd" in sites:
        print(f"\n[KD] Checking for recent posts...")
        kd_posts = get_recent_kd_posts()
        if not kd_posts:
            print("[KD] No KD posts published in the last 7 days. Skipping KD newsletter.")
            results["kd"] = "skipped"
        else:
            print(f"[KD] Found {len(kd_posts)} recent posts")
            issue_num = get_next_kd_issue_number()
            print(f"[KD] Next issue: #{issue_num}")

            if not args.dry_run:
                # Step 3: Generate KD content + HTML
                print("[KD] Step 1: Generating content...")
                kd_content = generate_kd_content(kd_posts, issue_num, api_key)

                print("[KD] Step 2: Building newsletter HTML...")
                kd_html = build_kd_newsletter_html(kd_content)
                save_kd_newsletter(kd_html)
                results["kd"] = "generated"
            else:
                print(f"[KD] Dry run: would generate issue #{issue_num}")
                results["kd"] = "dry_run"

            # Step 4: Send (only if we actually generated the HTML)
            if not args.generate_only and not args.dry_run and results.get("kd") == "generated":
                print("[KD] Step 3: Sending...")
                if send_newsletter("kd", test=args.test):
                    results["kd"] = "sent"
                else:
                    results["kd"] = "send_failed"

    # Summary
    print(f"\n{'=' * 60}")
    print("  RESULTS")
    print(f"{'=' * 60}")
    for site, status in results.items():
        icon = {"sent": "OK", "generated": "OK", "dry_run": "--", "skipped": "SKIP"}.get(status, "FAIL")
        print(f"  [{icon}] {site.upper()}: {status}")
    print()


if __name__ == "__main__":
    main()
