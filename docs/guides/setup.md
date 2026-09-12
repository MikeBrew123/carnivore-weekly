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

## Resend Sending Domains

Both domains live on one Resend account (free tier: 3 sending domains, 100 emails/day
shared across all of them). DNS for both is hosted at **GoDaddy**, not Cloudflare.

| Domain | Resend ID | Status | Sending | Receiving |
|---|---|---|---|---|
| carnivoreweekly.com | `f266a0f1-4f63-47fa-9297-de65deec9c5e` | verified | enabled | enabled (inbound catch-all) |
| ketodial.com | `a0c9850a-f3c9-49b6-84be-ec50e131c616` | **verified** 2026-09-12 | enabled | disabled |

Tracking differs between the two: carnivoreweekly.com has open and click tracking
**on**; ketodial.com was created with both **off**. Turn them on before flipping KD over,
or KD loses open/click stats.

### ketodial.com: DNS records (added at GoDaddy 2026-09-12, verified)

Add these four to the `ketodial.com` zone. Enter names **relative** to the domain
(GoDaddy appends `.ketodial.com` itself, so do not type the full hostname). TTL: default/Auto.

| Type | Name | Value | Priority |
|---|---|---|---|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC5hUua+rvGts6dyv39ZLXDeOoaAQUfRTACAKUHYmImFQJwWcGgwhzD+oLZlpPOpjjf6fvwOVkKbRYK2gKGVGq0EQ3AQ4zWyItCPX6jIQSWz/CSnrfk8L5OlHyFS9dsA/LBRKRK5eMvx+WEEWeK/8DVmovAmiWxUNU0KGnJ4tIoOwIDAQAB` | |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | |
| CNAME | `rsend` | `send.forge.rmta.net` | |

**The MX record is on the `send` subdomain, not the root.** It does not touch
`ketodial.com`'s root MX, so adding a real inbox on ketodial.com later stays possible.

DMARC needs no change: ketodial.com already carries GoDaddy's default
`v=DMARC1; p=quarantine; adkim=r; aspf=r`. Relaxed alignment means the Resend DKIM
signature aligns on its own.

All four went live at the nameserver within 30 seconds and Resend verified the domain
shortly after. A `newsletter@ketodial.com` test send to iambrew@gmail.com returned
`delivered` (id `c2c8f4c3-8eb5-4324-8f70-b25b1be0d703`) and Gmail's Show original
confirmed **SPF PASS, DKIM PASS with domain `ketodial.com`, DMARC PASS**. The DKIM
domain is the assertion that matters: it proves alignment on ketodial.com rather than
on amazonses.com or carnivoreweekly.com, which is what carries the DMARC pass.

Re-verify if records ever change:

```bash
KEY=$(python3 -c "import json;print(json.load(open('secrets/api-keys.json'))['resend']['key'])")
curl -s -X POST -H "Authorization: Bearer $KEY" \
  https://api.resend.com/domains/a0c9850a-f3c9-49b6-84be-ec50e131c616/verify
```

### Sending addresses (unchanged as of 2026-09-12)

KD mail still sends from `@carnivoreweekly.com`. Verifying the domain above grants the
*capability* to send from `@ketodial.com`; it changes no behaviour by itself. Flipping KD
over is a deliberate, separate change to the `kd` entries in `scripts/send_drip.py` and
`scripts/send_newsletter.py`, and needs Brew's go-ahead.

Reply-to is the piece to think through before flipping: KD replies currently ride the
`@carnivoreweekly.com` inbound catch-all, which feeds the writer-inbox ledger and the daily
digest. A second inbox on `ketodial.com` needs Resend receiving enabled on that domain
(root MX records) plus the ledger and digest taught about a second site. Sending from
`@ketodial.com` while replying to `@carnivoreweekly.com` is valid and is the low-risk
intermediate step.

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
