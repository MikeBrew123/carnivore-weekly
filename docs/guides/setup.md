# Setup Guide

## Environment Prerequisites

- Python 3.10+
- Node.js 18+
- Cloudflare Wrangler CLI
- Supabase CLI (optional — MCP handles most DB work)

## Credential Locations

| Service | Location | Access |
|---------|----------|--------|
| Supabase | MCP (via Leo) | `mcp__supabase__execute_sql()` |
| Stripe | Wrangler secrets | `wrangler secret list` |
| Resend | Wrangler secrets | `env.RESEND_API_KEY` |
| GA4 | `dashboard/ga4-credentials.json` | Property 517632328 |
| N8N | `secrets/api-keys.json` | `n8n.api_key` |
| All API keys | `secrets/api-keys.json` or Wrangler | Never in git |

## Supabase Setup

Project ID: `kwtdpvnjewtahuxjyltn`
URL: `https://kwtdpvnjewtahuxjyltn.supabase.co`

Access is via MCP — invoke Leo for all database operations. No manual dashboard SQL needed.

### Key Rotation

If you need to rotate the service role key:
1. Supabase Dashboard → Settings → API → Regenerate service_role key
2. Update `secrets/api-keys.json`
3. `wrangler secret put SUPABASE_SERVICE_ROLE_KEY`

## Wrangler Secrets

8 secrets stored in Cloudflare Workers:

```bash
wrangler secret list          # View all secrets
wrangler secret put KEY_NAME  # Add/update a secret
```

Secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_NAME`, `SUPABASE_PROJECT_ID`

Access in Worker code: `env.SUPABASE_URL`, `env.SUPABASE_SERVICE_ROLE_KEY`, etc.

## Stripe Testing

```bash
# Forward webhooks locally
stripe listen --forward-to localhost:8000/webhook

# Test cards
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# 100% off coupon: TEST999
```

## Comment System (Utterances)

Uses GitHub Issues as backend. Config in `templates/blog_post_template.html`:
- Repo: `MikeBrew123/carnivore-weekly`
- Theme: `github-dark`
- Issue term: `pathname`
- Install app: https://github.com/apps/utterances

## Phone Trigger

Weekly content update can be triggered from GitHub Mobile App → Actions → "Weekly Content Update" → Run workflow.
