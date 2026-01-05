# Wrangler Secrets Quick Reference

**Migration Status**: ✅ Complete
**Last Updated**: 2026-01-05

## The 8 Supabase Secrets

All stored securely in Cloudflare Wrangler:

```
SUPABASE_PROJECT_ID       → kwtdpvnjewtahuxjyltn
SUPABASE_HOST             → db.kwtdpvnjewtahuxjyltn.supabase.co
SUPABASE_PORT             → 5432
SUPABASE_DATABASE         → postgres
SUPABASE_USERNAME         → postgres
SUPABASE_PASSWORD         → [Encrypted in Wrangler]
SUPABASE_ANON_KEY         → [Encrypted in Wrangler]
SUPABASE_SERVICE_ROLE_KEY → [Encrypted in Wrangler]
```

## Access Secrets

### In Worker Code
```javascript
export default {
  async fetch(request, env) {
    const projectId = env.SUPABASE_PROJECT_ID
    const host = env.SUPABASE_HOST
    const password = env.SUPABASE_PASSWORD
    // ... access any of the 8 secrets
  }
}
```

### View List
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler secret list | grep SUPABASE
```

### Local Testing
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler dev
# Secrets automatically injected for testing
```

## Common Tasks

### Add/Update a Secret
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler secret put SUPABASE_PASSWORD
# Paste value when prompted
```

### Delete a Secret
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler secret delete SUPABASE_PASSWORD
```

### Rotate All Secrets
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
# Update in Supabase dashboard first
# Then update each secret:
wrangler secret put SUPABASE_PASSWORD
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# etc.
```

### Deploy with Secrets
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler deploy
# Secrets automatically included
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `env.SUPABASE_PASSWORD undefined` | Check: `wrangler secret list` - secret must exist |
| `Binding name already in use` | Check wrangler.toml for name conflicts with vars |
| Secrets not available in wrangler dev | Run: `wrangler login` and restart wrangler dev |
| Can't update secret | Delete first, then create new |

## File Locations

| File | Purpose |
|------|---------|
| `/api/wrangler.toml` | Config (secrets documented here) |
| `/.env` | Local env vars (secrets removed) |
| `SUPABASE_MIGRATION_STATUS.md` | Migration details |
| `SUPABASE_SECRETS_ACCESS_GUIDE.md` | Full usage guide |
| `SECURITY_MIGRATION_CHECKLIST.md` | Implementation checklist |

## Important Notes

- Secrets are encrypted at rest in Cloudflare
- Never commit secrets to git
- Never add secrets to wrangler.toml (they go in Cloudflare vault)
- Secrets automatically available in deployed Workers
- Different secrets can be used per environment (dev/staging/prod)

## Original Source

From `/Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json` (lines 19-36)

Moved on: 2026-01-05
