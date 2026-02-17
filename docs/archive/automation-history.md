# Automation History

## Current State (as of 2026-02)

### Publishing Automation
- **Daily publish**: GitHub Action at 9 AM EST
- **Script**: `daily_publish.py` finds posts with status=ready, publish_date≤today
- **Flow**: draft → ready → published (automatic)
- **Safety**: Validates before commit, won't publish with errors

### Content Generation
- **Weekly prompt**: `scripts/weekly_content_prompt.md` generates 9 posts/week (3 per writer)
- **Newsletter**: `scripts/generate_newsletter.py` renders from pre-written JSON content
- **No API calls in scripts**: Content written by Claude Code during sessions, not via API

### N8N Workflows
- **Drip welcome** (webhook): Triggered on new subscriber signup
- **Drip daily** (cron): Sends days 2-7 emails to active subscribers
- **Unsubscribe handler**: Processes unsubscribe requests

### Site Generation
- `scripts/generate.py` — main generator (blog, homepage, sitemap, all pages)
- `scripts/generate_blog_pages.py` — blog HTML from blog_posts.json
- Template system: Jinja2 templates in `templates/`

## Evolution Timeline

**2025-12**: Manual content creation, manual deployment
**2026-01**: Supabase integration, writer agents, validation walls
**2026-01**: Bento grid homepage redesign, automation setup
**2026-02**: Phase 2 self-healing pipeline, Phase 4 autonomous content
**2026-02**: Daily publish cron, weekly content prompt, 3-wall validation
**2026-02**: Newsletter system, drip email sequence, Stripe integration

## Key Decisions

- Content in JSON files (not Supabase) for version control and static site generation
- Templates handle all chrome; content fields are body-only
- Validation runs at 3 levels (script, pre-commit, CI)
- No Anthropic API calls in automation scripts — content pre-written by Claude Code
