# Deployment Guide

## CI/CD Pipeline

### GitHub Actions

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `daily-publish.yml` | Cron 9 AM EST | Auto-publish posts with status=ready |
| `deploy.yml` | Push to main | Deploy site to production |

### Pre-Deploy Validation

Every commit must pass:
```bash
python3 scripts/validate_before_commit.py
# Must show: 0 critical, 0 warnings
```

## Cloudflare Workers (API)

```bash
cd api

# Deploy
wrangler deploy

# Check secrets
wrangler secret list

# View logs
wrangler tail

# Rollback
wrangler deployments list
wrangler deployments rollback VERSION_ID
```

## Calculator Deployment

The calculator lives at `/calculator.html` with a 3-step flow:
1. Physical stats → 2. Lifestyle → 3. Results + Stripe CTA

Payment flow: Calculator → Stripe Checkout ($9.99) → Claude API generates report → Supabase stores → Resend emails token link → User views report (48h expiry)

## Blog Deployment

```bash
# Generate all blog pages
python3 scripts/generate_blog_pages.py

# Generate homepage + sitemap
python3 scripts/generate.py

# Validate
python3 scripts/validate_before_commit.py
```

## SEO Checklist

- Every page: title (≤60 chars), meta description (≤160 chars), JSON-LD
- Blog posts: canonical URL, Open Graph tags, skip-nav link
- Sitemap: auto-generated at `public/sitemap.xml`
- Images: width/height attributes, WebP format, lazy loading

## Automation Setup

- **Content generation**: Paste `scripts/weekly_content_prompt.md` into Claude Code
- **Publishing**: Daily cron checks for ready posts
- **Newsletter**: `scripts/generate_newsletter.py` renders from `data/newsletter_content.json`
- **Drip emails**: 3 N8N workflows (welcome webhook, daily cron, unsubscribe)
