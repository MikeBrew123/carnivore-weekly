# Development Guide

## Project Overview

Carnivore Weekly is a static site with a Cloudflare Workers API, Supabase database, and Stripe payments. Content is generated via Python scripts, rendered to HTML, and deployed via GitHub Actions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Static HTML, vanilla JS, CSS |
| API | Cloudflare Workers (Wrangler) |
| Database | Supabase (PostgreSQL + RLS) |
| Payments | Stripe Checkout ($9.99 protocol) |
| Email | Resend (drip sequences) |
| CI/CD | GitHub Actions |
| Analytics | GA4 (Property 517632328) |

## Local Development

```bash
# Clone and install
git clone https://github.com/MikeBrew123/carnivore-weekly.git
cd carnivore-weekly
pip install -r requirements.txt
npm install

# Generate site
python3 scripts/generate.py

# Validate before committing
python3 scripts/validate_before_commit.py
```

## Key Scripts

| Script | Purpose |
|--------|---------|
| `scripts/generate.py` | Main site generator (blog, homepage, sitemap) |
| `scripts/generate_blog_pages.py` | Blog post HTML from `data/blog_posts.json` |
| `scripts/generate_newsletter.py` | Newsletter from `data/newsletter_content.json` |
| `scripts/daily_publish.py` | Auto-publish posts with status=ready |
| `scripts/validate_before_commit.py` | Pre-commit validation (0 critical required) |

## Content Workflow

1. Write content using writer personas (Sarah, Marcus, Chloe)
2. Add to `data/blog_posts.json` with `status: "ready"` and `publish_date`
3. Daily GitHub Action publishes at 9 AM EST
4. Validation runs automatically via pre-commit + GitHub Actions

## Design System

- **Primary font**: Georgia (headings), system sans-serif (body)
- **Colors**: Cream (#F2F0E6) background, Gold (#FFD700) accents, Dark (#1a1a1a) text
- **Max width**: 1200px container
- **Mobile-first**: All pages responsive, no horizontal scroll

## Monetization

- **Calculator**: Free 3-step macro calculator
- **Paid protocol**: $9.99 via Stripe → Claude-generated PDF report
- **Drip emails**: 7-day sequence via Resend from hello@carnivoreweekly.com
- **Coupon**: TEST999 for 100% off (testing only)
