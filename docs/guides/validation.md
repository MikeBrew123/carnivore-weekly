# Validation Guide

## 3-Wall Validation System

### Wall 1: Auto-Fix (scripts)
- `scripts/validate_before_commit.py` — runs all checks
- Catches: missing meta descriptions, broken JSON-LD, orphan HTML files, Jinja2 template leaks

### Wall 2: Pre-Commit Hook
- Runs validation automatically on `git commit`
- Blocks commits with critical errors
- Must pass with 0 critical, 0 warnings

### Wall 3: GitHub Actions
- Runs on push to main
- Final safety net before deploy

## Running Validation

```bash
python3 scripts/validate_before_commit.py
```

**PASS criteria**: 0 critical, 0 warnings
**Output**: HTML files validated, sitemap entries, Python files checked, JSON-LD blocks validated

## What Gets Checked

| Check | What It Validates |
|-------|-------------------|
| HTML structure | Missing titles, meta descriptions, skip-nav |
| JSON-LD | Valid schema markup on every page |
| Sitemap | All public pages listed |
| Python lint | Syntax errors in scripts |
| Orphan detection | HTML files not in blog_posts.json |
| Jinja2 leaks | Unrendered `{{ }}` or `{% %}` in output |
| Link validation | Internal links resolve to real files |

## Excluded from Validation

These use email-format HTML and skip web page rules:
- `newsletters/` — generated newsletter HTML
- `public/newsletter-preview.html` — newsletter browser preview

## Calculator Validation

```bash
cd calculator2-demo
node validate-robust.mjs
```

Checks: form navigation, results page rendering, brand colors (#ffd700 heading, #F2F0E6 background), no horizontal scroll.

## Payment Testing

- Use test card: `4242 4242 4242 4242`
- Use coupon: `TEST999` (100% off)
- Verify: Stripe dashboard shows test payment
- Verify: Report generated and accessible via token URL

## Accessibility Checks

- All interactive elements: 44px+ touch targets
- Focus rings visible on all inputs
- Skip-nav link on every page
- Color contrast meets WCAG AA
