# Troubleshooting Guide

## Common Issues

### Validation Fails with Critical Errors

**Missing meta description:**
Add `<meta name="description" content="...">` to the page's `<head>`.

**Unrendered Jinja2 template:**
Content field contains `{{ }}` or `{% %}` — these belong in templates, not in `blog_posts.json` content.

**Orphan HTML file:**
Blog HTML exists in `public/blog/` but has no entry in `data/blog_posts.json`. Either add the entry or delete the file.

### Calculator Not Advancing Steps

- Button text must match exactly: "Continue to Next Step" (Step 1), "See Your Results" (Step 2)
- Use `.last()` selector when multiple buttons share text
- Always wait 800-1500ms after navigation clicks

### Payment Flow Issues

**Stripe checkout not opening:**
- Verify `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` in Wrangler secrets
- Check browser console for CORS errors
- Test with card `4242 4242 4242 4242`

**Report not generating:**
- Check Cloudflare Worker logs: `wrangler tail`
- Verify Anthropic API key in Wrangler secrets
- Check Supabase for the session record

**Email not arriving:**
- Check Resend dashboard for delivery status
- Verify DKIM/SPF/DMARC for carnivoreweekly.com
- Check spam folder

### Blog Posts Not Rendering

**Template variables showing raw:**
- Check that `blog_posts.json` content doesn't include template HTML
- Run `python3 scripts/generate_blog_pages.py` to regenerate

**Duplicate sections:**
- Content field has template markup mixed in — clean the content field

**Broken internal links:**
- Run validation: `python3 scripts/validate_before_commit.py`
- Check that target post slug exists and has correct date prefix

### Supabase Connection Issues

**MCP not responding:**
- Run `/status` in Claude Code to check loaded MCP servers
- If `supabase` appears, access is working
- Keep-alive: run a simple query every 3 days to prevent free tier pause

### Git Push Rejected

**Push protection (secrets in files):**
- GitHub blocks pushes containing API keys/passwords
- Remove the secret from the file, use `[REDACTED]` placeholder
- Ensure `secrets/` and `archive/` directories are in `.gitignore`

### Pre-commit Hook Fails

- Fix the issues reported
- Re-stage files: `git add <files>`
- Create a NEW commit (don't amend — the previous commit didn't happen)

## Calculator State Management

The calculator uses a multi-step form with state preserved across steps:
- Form data stored in component state
- Session ID generated on first interaction
- State persists through back/forward navigation
- Payment modal captures name + email before Stripe redirect
