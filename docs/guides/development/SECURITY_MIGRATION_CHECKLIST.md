# Security Migration Checklist: Supabase Credentials to Wrangler

**Migration Date**: 2026-01-05
**Status**: ✅ COMPLETE - Secrets Uploaded & Verified
**Action Required**: Deploy updated Worker code and verify access

---

## Phase 1: Secret Upload [COMPLETE]

- [x] SUPABASE_PROJECT_ID uploaded to Wrangler
- [x] SUPABASE_HOST uploaded to Wrangler
- [x] SUPABASE_PORT uploaded to Wrangler
- [x] SUPABASE_DATABASE uploaded to Wrangler
- [x] SUPABASE_USERNAME uploaded to Wrangler
- [x] SUPABASE_PASSWORD uploaded to Wrangler
- [x] SUPABASE_ANON_KEY uploaded to Wrangler
- [x] SUPABASE_SERVICE_ROLE_KEY uploaded to Wrangler

**Verification Command**:
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler secret list | grep SUPABASE
```

**Result**: All 8 Supabase secrets confirmed in Wrangler vault.

---

## Phase 2: File Updates [COMPLETE]

### wrangler.toml
- [x] Updated comments to indicate migration
- [x] Documented all uploaded secrets
- [x] Kept SUPABASE_URL as var (non-sensitive)
- [x] Added instructions for accessing secrets

**File**: `/Users/mbrew/Developer/carnivore-weekly/api/wrangler.toml`

### .env Configuration
- [x] Removed hardcoded Supabase credentials
- [x] Kept only non-sensitive SUPABASE_URL reference
- [x] Added comments directing to Wrangler
- [x] Added local development instructions

**File**: `/Users/mbrew/Developer/carnivore-weekly/.env`

### Migration Documentation
- [x] Created migration status document
- [x] Created access guide with code examples
- [x] Created troubleshooting guide
- [x] Created implementation checklist

**Files**:
- `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_MIGRATION_STATUS.md`
- `/Users/mbrew/Developer/carnivore-weekly/SUPABASE_SECRETS_ACCESS_GUIDE.md`
- `/Users/mbrew/Developer/carnivore-weekly/SECURITY_MIGRATION_CHECKLIST.md`

---

## Phase 3: Verification [PENDING]

### Step 3.1: Local Development Test
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler dev

# In another terminal:
curl http://localhost:8787/test-secrets

# Expected: All secrets should be accessible (not undefined)
```

**Status**: [ ] Run this test

**Expected Result**: All secrets available via env bindings

### Step 3.2: Code Integration Test
Ensure Worker code can access secrets:

```javascript
// Test that env.SUPABASE_* bindings work
export default {
  async fetch(request, env) {
    if (!env.SUPABASE_PASSWORD) {
      return new Response('ERROR: SUPABASE_PASSWORD not found', { status: 500 })
    }
    return new Response('OK: All secrets accessible')
  }
}
```

**Status**: [ ] Update Worker code with test
**Status**: [ ] Test with wrangler dev
**Status**: [ ] Verify all 8 secrets accessible

### Step 3.3: Production Deployment
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api

# Deploy to production
wrangler deploy --env production

# Monitor logs
wrangler tail --env production
```

**Status**: [ ] Deploy to production
**Status**: [ ] Check logs for errors
**Status**: [ ] Verify no "undefined" errors for SUPABASE_* vars

### Step 3.4: Production Verification
Test production Worker endpoint:

```bash
# Test connection with real credentials
curl https://carnivore-report-api-production.iambrew.workers.dev/test-db

# Expected: Successful connection to Supabase using Wrangler secrets
```

**Status**: [ ] Test production endpoint
**Status**: [ ] Verify database connectivity
**Status**: [ ] Confirm no credential errors

---

## Phase 4: Cleanup [PENDING]

### Option 1: Keep Original File (Recommended for 30 days)
- [ ] Keep `/secrets/api-keys.json` unchanged
- [ ] Use as rollback reference if needed
- [ ] Review after 30 days for archival

### Option 2: Archive Original File
Once verified in production for 7+ days:
```bash
# Create archive directory
mkdir -p /Users/mbrew/Developer/carnivore-weekly/_archive/credentials

# Move original file
mv /Users/mbrew/Developer/carnivore-weekly/secrets/api-keys.json \
   /Users/mbrew/Developer/carnivore-weekly/_archive/credentials/api-keys.json.2026-01-05-backup

# Document the migration
echo "Supabase credentials migrated to Wrangler on 2026-01-05" \
  > /Users/mbrew/Developer/carnivore-weekly/_archive/credentials/README.md
```

**Status**: [ ] Archive original file (after 7-day verification period)

---

## Phase 5: Code Updates [PENDING]

### Worker Code Changes Needed
Update any Worker code that currently reads from .env to use env bindings:

**Before**:
```javascript
// Reading from .env (no longer works in Workers)
const password = process.env.SUPABASE_PASSWORD
```

**After**:
```javascript
// Reading from Wrangler secrets
export default {
  async fetch(request, env) {
    const password = env.SUPABASE_PASSWORD
  }
}
```

**Files to Update**:
- [ ] `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`
- [ ] Any other Worker files using Supabase credentials

**Status**: [ ] Audit all Worker code
**Status**: [ ] Update to use env.SUPABASE_* bindings
**Status**: [ ] Test with wrangler dev
**Status**: [ ] Deploy changes

---

## Phase 6: Documentation & Team Communication [PENDING]

- [ ] Share migration guide with team members
- [ ] Document how to access secrets in Wrangler
- [ ] Create incident response plan for credential rotation
- [ ] Update deployment procedures
- [ ] Add to onboarding documentation

**Files to Share**:
- `SUPABASE_SECRETS_ACCESS_GUIDE.md` - How to use secrets
- `SUPABASE_MIGRATION_STATUS.md` - What was migrated
- `SECURITY_MIGRATION_CHECKLIST.md` - This file

---

## Access Reference Table

| Secret Name | Original File | Wrangler Name | Stored | Accessible |
|---|---|---|---|---|
| project_id | api-keys.json | SUPABASE_PROJECT_ID | ✅ | Via env.SUPABASE_PROJECT_ID |
| host | api-keys.json | SUPABASE_HOST | ✅ | Via env.SUPABASE_HOST |
| port | api-keys.json | SUPABASE_PORT | ✅ | Via env.SUPABASE_PORT |
| database | api-keys.json | SUPABASE_DATABASE | ✅ | Via env.SUPABASE_DATABASE |
| username | api-keys.json | SUPABASE_USERNAME | ✅ | Via env.SUPABASE_USERNAME |
| postgres_password | api-keys.json | SUPABASE_PASSWORD | ✅ | Via env.SUPABASE_PASSWORD |
| anon_key | api-keys.json | SUPABASE_ANON_KEY | ✅ | Via env.SUPABASE_ANON_KEY |
| service_role_key | api-keys.json | SUPABASE_SERVICE_ROLE_KEY | ✅ | Via env.SUPABASE_SERVICE_ROLE_KEY |

---

## Rollback Plan

If critical issues arise, rollback is possible:

### Step 1: Revert Worker Code
Update Worker to read from .env instead of env bindings (temporary):
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
git revert [commit-hash]
wrangler deploy
```

### Step 2: Restore from Backup
If needed, credentials are still in `/secrets/api-keys.json`

### Step 3: Delete Wrangler Secrets (if needed)
```bash
wrangler secret delete SUPABASE_PASSWORD
wrangler secret delete SUPABASE_ANON_KEY
# ... repeat for all 8 secrets
```

### Step 4: Contact Support
- Cloudflare Support: https://dash.cloudflare.com/support
- Supabase Support: https://supabase.com/support

---

## Success Criteria

Migration is considered successful when:

- [x] All 8 Supabase secrets uploaded to Wrangler
- [ ] Local development works with wrangler dev (Phase 3.1)
- [ ] Worker code successfully accesses all secrets (Phase 3.2)
- [ ] Production Worker deployed and tested (Phase 3.3-3.4)
- [ ] Database connectivity verified in production (Phase 3.4)
- [ ] No "undefined" or "not found" errors in logs
- [ ] Team trained on new secret access method (Phase 6)

---

## Timeline

| Phase | Task | Target Date | Actual Date | Status |
|-------|------|-------------|-------------|--------|
| 1 | Upload secrets | 2026-01-05 | 2026-01-05 | ✅ Complete |
| 2 | Update files | 2026-01-05 | 2026-01-05 | ✅ Complete |
| 3 | Verification | 2026-01-05 | Pending | [ ] In Progress |
| 4 | Cleanup | 2026-01-12 | Pending | [ ] Blocked |
| 5 | Code updates | 2026-01-05 | Pending | [ ] Blocked |
| 6 | Communication | 2026-01-05 | Pending | [ ] Blocked |

---

## Next Immediate Actions

**Due: Within 24 hours**
1. [ ] Run Phase 3.1: Local development test
2. [ ] Run Phase 3.2: Code integration test
3. [ ] Review Worker code for env binding usage

**Due: Within 1 week**
1. [ ] Deploy to production (Phase 3.3)
2. [ ] Verify production access (Phase 3.4)
3. [ ] Run 24-hour stability check

**Due: After 7-day production validation**
1. [ ] Archive original credentials file (Phase 4)
2. [ ] Update team documentation (Phase 6)

---

## Contact & Support

**For Questions About Secrets Access**:
- Reference: `SUPABASE_SECRETS_ACCESS_GUIDE.md`
- Wrangler Docs: https://developers.cloudflare.com/workers/configuration/secrets/

**For Deployment Issues**:
- Check logs: `wrangler tail --format json`
- Verify secrets: `wrangler secret list`
- Restart dev: `wrangler dev`

**For Emergency Credential Rotation**:
1. Run: `wrangler secret put SECRET_NAME`
2. Enter new value
3. Restart Worker or wait for next deployment
4. Rotate in Supabase dashboard if needed

---

## Document Version

- **Version**: 1.0
- **Created**: 2026-01-05
- **Last Updated**: 2026-01-05
- **Status**: Active - Implementation in progress
- **Owner**: Security Team / Operations
