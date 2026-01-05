# Supabase Secrets Access Guide

## Quick Reference

All Supabase credentials are now securely stored in Cloudflare Wrangler and accessible via environment variables in your Worker code.

## Credential Mapping

```
Project Secrets File          →  Wrangler Secret Name      →  Access in Worker
─────────────────────────────────────────────────────────────────────────────
project_id                    →  SUPABASE_PROJECT_ID       →  env.SUPABASE_PROJECT_ID
url                           →  (kept in wrangler.toml)   →  (var, not secret)
host                          →  SUPABASE_HOST             →  env.SUPABASE_HOST
port                          →  SUPABASE_PORT             →  env.SUPABASE_PORT
database                      →  SUPABASE_DATABASE         →  env.SUPABASE_DATABASE
username                      →  SUPABASE_USERNAME         →  env.SUPABASE_USERNAME
postgres_password             →  SUPABASE_PASSWORD         →  env.SUPABASE_PASSWORD
anon_key                      →  SUPABASE_ANON_KEY         →  env.SUPABASE_ANON_KEY
service_role_key              →  SUPABASE_SERVICE_ROLE_KEY →  env.SUPABASE_SERVICE_ROLE_KEY
```

## Access in Worker Code

### Example 1: Creating Supabase Client
```javascript
import { createClient } from '@supabase/supabase-js'

export default {
  async fetch(request, env) {
    const supabase = createClient(
      env.SUPABASE_URL,  // or use the var from wrangler.toml
      env.SUPABASE_ANON_KEY
    )

    // Use supabase client for queries
    const { data, error } = await supabase
      .from('table_name')
      .select('*')

    return new Response(JSON.stringify(data))
  }
}
```

### Example 2: Direct Database Connection
```javascript
export default {
  async fetch(request, env) {
    const connectionString = `postgres://${env.SUPABASE_USERNAME}:${env.SUPABASE_PASSWORD}@${env.SUPABASE_HOST}:${env.SUPABASE_PORT}/${env.SUPABASE_DATABASE}`

    // Use connectionString for direct postgres connection
    const pool = new Pool({ connectionString })

    return new Response('Connected')
  }
}
```

### Example 3: Admin Operations with Service Role Key
```javascript
export default {
  async fetch(request, env) {
    const supabaseAdmin = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY  // Use service role for admin operations
    )

    // Perform admin operations
    const { data, error } = await supabaseAdmin
      .from('protected_table')
      .select('*')

    return new Response(JSON.stringify(data))
  }
}
```

## Local Development

### Running with Wrangler Dev
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler dev

# Secrets are automatically loaded from Cloudflare
# Access them via env.SUPABASE_* in your Worker code
```

### Testing Secret Access
Create a simple test endpoint to verify secrets are available:

```javascript
export default {
  async fetch(request, env) {
    if (request.url.includes('/test-secrets')) {
      return new Response(JSON.stringify({
        hasProjectId: !!env.SUPABASE_PROJECT_ID,
        hasHost: !!env.SUPABASE_HOST,
        hasPort: !!env.SUPABASE_PORT,
        hasDatabase: !!env.SUPABASE_DATABASE,
        hasUsername: !!env.SUPABASE_USERNAME,
        hasPassword: !!env.SUPABASE_PASSWORD,
        hasAnonKey: !!env.SUPABASE_ANON_KEY,
        hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
      }))
    }
  }
}
```

### Testing Database Connection
```bash
# After wrangler dev starts, in another terminal:
curl http://localhost:8787/test-db

# Should return confirmation that all secrets are accessible
```

## Verification Checklist

### Verify Secrets Uploaded
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler secret list | grep SUPABASE
```

Expected output:
```
SUPABASE_PROJECT_ID
SUPABASE_HOST
SUPABASE_PORT
SUPABASE_DATABASE
SUPABASE_USERNAME
SUPABASE_PASSWORD
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### Verify Local Development
```bash
# Terminal 1
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler dev

# Terminal 2 - verify secrets are accessible
curl http://localhost:8787/test-secrets
```

### Verify Production Deployment
After deploying to production, check Worker logs:
```bash
wrangler tail --format json
```

Look for successful secret access in logs without errors like "env.SUPABASE_* is undefined"

## Environment-Specific Secrets (Future)

If you need different secrets per environment (staging, production):

```bash
# Staging environment
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler secret put SUPABASE_PASSWORD --env staging
# Enter staging password when prompted

# Production environment
wrangler secret put SUPABASE_PASSWORD --env production
# Enter production password when prompted
```

Then update `wrangler.toml`:
```toml
[env.staging]
vars = { ENVIRONMENT = "staging" }

[env.production]
vars = { ENVIRONMENT = "production" }
```

## Troubleshooting

### Error: "env.SUPABASE_* is undefined"
- Verify secret exists: `wrangler secret list | grep SUPABASE`
- If missing, run: `wrangler secret put SECRET_NAME`
- Restart `wrangler dev`

### Error: "Binding name already in use"
- You're trying to create a secret with a name that's already used as a var
- Check wrangler.toml for conflicting names
- Rename the secret or var accordingly

### Secrets Not Available in wrangler dev
- Ensure you're logged in: `wrangler login`
- Verify account has access to this Worker
- Check Cloudflare dashboard for account status

### Need to Rotate a Secret
```bash
# Delete the old secret
wrangler secret delete SUPABASE_PASSWORD

# Upload the new secret
wrangler secret put SUPABASE_PASSWORD
# Paste new password when prompted
```

## Security Best Practices

1. **Never commit secrets to git** - All credentials are now in Wrangler, not in files
2. **Use appropriate keys** - Use ANON_KEY for public operations, SERVICE_ROLE_KEY only for admin operations
3. **Rotate regularly** - Plan quarterly rotation of credentials
4. **Audit access** - Check Cloudflare logs for who accessed what and when
5. **Limit scope** - Create separate API keys for different purposes

## Migration Summary

| Aspect | Before | After |
|--------|--------|-------|
| Storage Location | `/secrets/api-keys.json` (file) | Cloudflare Wrangler Vault |
| Version Control Risk | High (could be committed) | None (not in files) |
| Encryption | No | Yes (at rest and in transit) |
| Access Control | File permissions only | Cloudflare auth + Wrangler CLI |
| Audit Trail | No | Yes (Cloudflare logs) |
| Rotation Difficulty | High (redeploy code) | Low (CLI command) |

## Files Changed

- ✅ `/Users/mbrew/Developer/carnivore-weekly/api/wrangler.toml` - Updated with documentation
- ✅ `/Users/mbrew/Developer/carnivore-weekly/.env` - Removed sensitive credentials
- ✅ Created `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_MIGRATION_STATUS.md` - Migration tracking
- ✅ Created `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_SECRETS_ACCESS_GUIDE.md` - This file

## Support & Documentation

- Wrangler Secrets: https://developers.cloudflare.com/workers/configuration/secrets/
- Supabase JavaScript Client: https://supabase.com/docs/reference/javascript
- Cloudflare Workers: https://developers.cloudflare.com/workers/
