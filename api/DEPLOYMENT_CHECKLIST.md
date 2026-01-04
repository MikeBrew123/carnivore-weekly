# Story 3.4: Deployment Checklist

**Endpoint:** `POST /api/v1/assessment/verify-and-generate`
**Status:** Ready for Deployment
**Date:** 2026-01-04

---

## Pre-Deployment

### Environment Setup

- [ ] **SUPABASE_URL** - Confirmed correct (`https://kwtdpvnjewtahuxjyltn.supabase.co`)
- [ ] **SUPABASE_SERVICE_ROLE_KEY** - Stored securely in Cloudflare secrets
- [ ] **STRIPE_SECRET_KEY** - Using test key for staging, live key for production
- [ ] **CLAUDE_API_KEY** - Valid API key with available credits from Anthropic

**Verify secrets are set:**

```bash
wrangler secret list
# Should show:
# SUPABASE_SERVICE_ROLE_KEY (encrypted)
# STRIPE_SECRET_KEY (encrypted)
# CLAUDE_API_KEY (encrypted)
```

### Database Readiness

- [ ] **Migrations Applied** - All tables exist and are indexed
  ```bash
  # Run these migrations (in order):
  # 015_calculator_comprehensive_schema.sql
  # 016_step6b_report_generation.sql

  # Verify tables exist:
  psql -c "SELECT tablename FROM pg_tables WHERE schemaname='public'" | grep calculator
  ```

- [ ] **Test Suite Passed** - All 17 database tests pass
  ```bash
  psql -f /api/verify-and-generate-test.sql
  # Should end with: "All 17 tests passed successfully!"
  ```

- [ ] **RLS Policies Enabled** - Correct access control
  ```bash
  psql -c "SELECT policyname FROM pg_policies WHERE tablename IN ('calculator_reports', 'calculator_sessions_v2')"
  ```

- [ ] **Indexes Created** - Performance-critical indexes in place
  ```bash
  psql -c "SELECT indexname FROM pg_indexes WHERE tablename IN ('calculator_reports', 'claude_api_logs')"
  ```

- [ ] **Triggers Active** - Auto-update mechanisms working
  ```bash
  psql -c "SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema='public'"
  ```

---

## Code Deployment

### Step 1: File Integration

- [ ] **Copy verify-and-generate.js** to `/api/` directory
  ```bash
  cp verify-and-generate.js /api/verify-and-generate.js
  ```

- [ ] **Add route handler** to `calculator-api.js`
  ```javascript
  // In calculator-api.js, add:
  if (url.pathname === '/api/v1/assessment/verify-and-generate') {
    return handleVerifyAndGenerate(request, env);
  }
  ```

- [ ] **Import the handler** at top of calculator-api.js
  ```javascript
  const { handleVerifyAndGenerate } = require('./verify-and-generate.js');
  ```

### Step 2: Local Testing

- [ ] **Start development server**
  ```bash
  wrangler dev
  # Should respond on http://localhost:8787
  ```

- [ ] **Test happy path**
  ```bash
  curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
    -H "Content-Type: application/json" \
    -d '{"session_id": "550e8400-e29b-41d4-a716-446655440000"}'
  # Should return 404 (session doesn't exist locally)
  ```

- [ ] **Test error handling**
  ```bash
  # Missing session_id
  curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
    -H "Content-Type: application/json" \
    -d '{}'
  # Should return 400
  ```

### Step 3: Staging Deployment

- [ ] **Deploy to staging environment**
  ```bash
  wrangler deploy --env staging
  # Verify deployment URL is returned
  ```

- [ ] **Verify staging endpoint is live**
  ```bash
  curl https://calculator-api-staging.carnivore-weekly.workers.dev/api/v1/assessment/verify-and-generate
  # Should return 405 (not GET) or error message
  ```

---

## Pre-Production Testing

### Integration Test Suite (From VERIFY_AND_GENERATE_GUIDE.md)

- [ ] **Test 1: Happy Path** - Full success flow
  - Create session, complete payment, call endpoint
  - Verify response: success=true, access_token present
  - Check database: report created, session updated

- [ ] **Test 2: Payment Not Verified** - 402 response
  - Use unpaid session
  - Verify response: success=false, paid=false
  - Verify no database changes

- [ ] **Test 3: Session Not Found** - 404 response
  - Use non-existent UUID
  - Verify response: error_code=SESSION_NOT_FOUND

- [ ] **Test 4: Missing Fields** - 400 response
  - Send empty body
  - Verify response: error_code=MISSING_FIELDS

- [ ] **Test 5: Invalid JSON** - 400 response
  - Send malformed JSON
  - Verify response: error_code=INVALID_JSON

- [ ] **Test 6: Wrong Method** - 405 response
  - Send GET instead of POST
  - Verify response: error_code=METHOD_NOT_ALLOWED

- [ ] **Test 7: Access Token Format** - 64 hex chars
  - Generate token locally
  - Verify format: `^[a-f0-9]{64}$`

- [ ] **Test 8: Expiration Timestamp** - 48 hours
  - Check report expires_at
  - Verify: NOW() + 48 hours (within 1 minute margin)

- [ ] **Test 9: Report HTML Validation** - Valid structure
  - Check report_html from database
  - Verify: Starts with `<div class="report">`
  - Verify: Ends with `</div>`
  - Verify: Contains all 13 section headers

- [ ] **Test 10: Idempotency Check** - One report per session
  - Call endpoint twice with same session_id
  - Verify: First call succeeds
  - Verify: Second call fails with 500 (UNIQUE constraint)

### Database Verification

- [ ] **Report table verified**
  ```sql
  SELECT COUNT(*) FROM calculator_reports;
  # Should show reports from tests
  ```

- [ ] **Session payment_status updated**
  ```sql
  SELECT payment_status FROM calculator_sessions_v2
  WHERE id = '<test-session-id>';
  # Should show 'completed'
  ```

- [ ] **Claude API logs recorded**
  ```sql
  SELECT COUNT(*) FROM claude_api_logs;
  # Should show test calls
  ```

- [ ] **Access logs created**
  ```sql
  SELECT COUNT(*) FROM calculator_report_access_log;
  # Should show audit entries
  ```

- [ ] **Access count incremented**
  ```sql
  SELECT access_count FROM calculator_reports
  WHERE id = '<test-report-id>';
  # Should be > 0 if accessed
  ```

### Performance Baseline

- [ ] **Measure latency**
  ```bash
  # Time the endpoint response
  time curl -X POST "https://staging-api.carnivore-weekly.com/api/v1/assessment/verify-and-generate" \
    -d '{"session_id": "..."}'
  # Expected: 30-65 seconds (Claude generation dominates)
  ```

- [ ] **Check database query times**
  ```sql
  EXPLAIN ANALYZE
  SELECT * FROM calculator_sessions_v2 WHERE id = 'uuid';
  # Expected: < 1ms (index scan)
  ```

- [ ] **Monitor Cloudflare logs**
  ```bash
  wrangler tail --env staging
  # Watch for any errors or unexpected behavior
  ```

---

## Production Deployment

### Final Checks

- [ ] **All staging tests passed** - No failures or warnings
- [ ] **Database backups current** - Recent snapshot available
- [ ] **Monitoring alerts configured** - Will alert on errors
- [ ] **Support team briefed** - Know how to help if issues arise
- [ ] **Rollback plan reviewed** - Can quickly disable endpoint

### Deploy to Production

```bash
# Deploy the code
wrangler deploy --env production

# Verify deployment
curl https://api.carnivore-weekly.com/api/v1/assessment/verify-and-generate

# Check logs for errors
wrangler tail --env production
```

- [ ] **Production endpoint verified live**
  ```bash
  curl -X OPTIONS https://api.carnivore-weekly.com/api/v1/assessment/verify-and-generate \
    -v
  # Should return 405 or 200 (OPTIONS not implemented)
  ```

- [ ] **Stripe keys switched to live** (if not already)
  ```bash
  wrangler secret put STRIPE_SECRET_KEY  # Use live key
  ```

- [ ] **Claude API keys verified for production**
  ```bash
  # Test a real API call to Anthropic
  # Verify credits/quota is sufficient
  ```

---

## Post-Deployment (First 24 Hours)

### Monitoring

- [ ] **Error rate normal** - < 1% of requests
  ```sql
  SELECT COUNT(*), status FROM claude_api_logs
  WHERE request_at > NOW() - INTERVAL '1 hour'
  GROUP BY status;
  ```

- [ ] **No database errors** - All transactions succeeding
  ```sql
  SELECT COUNT(*) FROM calculator_reports
  WHERE created_at > NOW() - INTERVAL '1 hour';
  ```

- [ ] **Claude API costs within budget**
  ```sql
  SELECT
    COUNT(*) as reports_generated,
    ROUND(SUM(input_tokens) * 3.0 / 1000000.0 +
          SUM(output_tokens) * 15.0 / 1000000.0, 4) as total_cost_usd
  FROM claude_api_logs
  WHERE request_at > NOW() - INTERVAL '24 hours'
  AND status = 'success';
  ```

- [ ] **Report access logs normal**
  ```sql
  SELECT COUNT(*) FROM calculator_report_access_log
  WHERE accessed_at > NOW() - INTERVAL '24 hours';
  ```

- [ ] **No spike in user support tickets** - Endpoint working correctly

### Fine-Tuning (If Needed)

- [ ] **Claude API performance acceptable?**
  - If too slow (> 90 seconds): Reduce max_tokens from 16,000 to 12,000
  - If too expensive: Reduce temperature from 0.7 to 0.5
  - If timeouts: Increase Cloudflare Worker timeout from 30s to 60s

- [ ] **Database performance adequate?**
  - If slow: Check `pg_stat_user_indexes` for unused indexes
  - If slow: Run `VACUUM ANALYZE` on tables
  - If still slow: Consider caching layer

- [ ] **Rate limiting needed?**
  - If abuse detected: Implement per-session rate limit (5 calls/minute)
  - If DDoS: Enable Cloudflare DDoS protection

---

## Scheduled Jobs Setup

### Hourly: Expire Old Reports

This marks reports as expired after 48 hours.

**Option A: Supabase pg_cron**

```sql
SELECT cron.schedule('expire-old-reports', '0 * * * *',
  'SELECT expire_old_reports()');
```

**Option B: GitHub Actions**

```yaml
# .github/workflows/expire-reports.yml
name: Expire Old Reports
on:
  schedule:
    - cron: '0 * * * *'  # Every hour
jobs:
  expire:
    runs-on: ubuntu-latest
    steps:
      - name: Expire reports
        run: |
          psql ${{ secrets.DATABASE_URL }} \
            -c "SELECT expire_old_reports();"
```

- [ ] **Scheduled job created**
- [ ] **Tested successful execution** - Run manually first
- [ ] **Monitoring enabled** - Alert if job fails

### Weekly: Cleanup Expired Data

This hard-deletes reports older than 90 days (GDPR compliance).

**Option A: Supabase pg_cron**

```sql
SELECT cron.schedule('cleanup-expired-reports', '0 2 * * 0',
  'SELECT cleanup_expired_reports(90)');
```

**Option B: GitHub Actions**

```yaml
# .github/workflows/cleanup-reports.yml
name: Cleanup Expired Reports
on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly, Sunday 2 AM
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup reports
        run: |
          psql ${{ secrets.DATABASE_URL }} \
            -c "SELECT cleanup_expired_reports(90);"
```

- [ ] **Scheduled job created**
- [ ] **Backup verified before first run**
- [ ] **Tested successful execution**
- [ ] **Monitoring enabled**

---

## Documentation & Communication

- [ ] **Documentation published** - All markdown files in `/api/`
- [ ] **Team briefed** - Walkthrough of deployment & support procedures
- [ ] **API documentation updated** - Endpoint added to public API spec
- [ ] **Runbook created** - Troubleshooting guide for support team
- [ ] **Dashboard configured** - Real-time monitoring in Datadog/New Relic

---

## Sign-Off

### Technical Lead

- [ ] Code reviewed
- [ ] Tests passed
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Ready for production

**Name:** ________________  **Date:** ________________

### Database Architect (Leo)

- [ ] Schema validated
- [ ] Indexes optimized
- [ ] ACID properties enforced
- [ ] RLS policies correct
- [ ] Approved for production

**Name:** Leo  **Date:** 2026-01-04

### Product Manager

- [ ] Business requirements met
- [ ] User experience verified
- [ ] Cost estimates acceptable
- [ ] Timeline met

**Name:** ________________  **Date:** ________________

---

## Rollback Plan

If critical issues found in production:

### Immediate Rollback (< 5 minutes)

```bash
# Disable the endpoint in calculator-api.js
# Comment out: if (url.pathname === '/api/v1/assessment/verify-and-generate') { ... }

# Redeploy
wrangler deploy --env production

# Notify users
# Post-incident: Investigate root cause
```

### Database Rollback (If data corruption)

```bash
# Restore from backup (Supabase handles automatically)
# Roll back session payment_status manually if needed:
UPDATE calculator_sessions_v2
SET payment_status = 'pending', paid_at = NULL
WHERE id IN (
  SELECT session_id FROM calculator_reports
  WHERE created_at > NOW() - INTERVAL '1 hour'
);

# Delete the problem reports:
DELETE FROM calculator_reports
WHERE created_at > NOW() - INTERVAL '1 hour';
```

- [ ] **Rollback tested in staging first** - Verify plan works
- [ ] **Communication template prepared** - Know what to tell users

---

## Success Criteria

Endpoint is considered successfully deployed when:

- [ ] No critical errors in logs (first 24 hours)
- [ ] Response time < 70 seconds (90th percentile)
- [ ] Zero payment verification failures (false negatives)
- [ ] 100% transaction atomicity (no orphaned records)
- [ ] Claude API costs < $500/month at current volume
- [ ] All 10 integration tests pass
- [ ] Database remains healthy (no locks, no bloat)
- [ ] Support team can troubleshoot basic issues
- [ ] Users report success in accessing reports

---

## Contact & Escalation

| Issue | Contact | Response Time |
|-------|---------|----------------|
| Endpoint down | DevOps + Leo | < 15 minutes |
| 5xx errors spiking | Engineering Lead | < 30 minutes |
| Database performance | Leo (DBA) | < 1 hour |
| Claude API quota exceeded | Finance + Leo | < 2 hours |
| User can't access report | Support + Engineering | < 1 hour |

---

**Deployment Status:** ⚪ Ready to Deploy

**Estimated Deployment Time:** 15-20 minutes (staging), 5-10 minutes (production)

**Risk Level:** Low (well-tested, backward compatible, easy rollback)

**Confidence Level:** High (comprehensive testing, documented procedures)

---

Last Updated: 2026-01-04
Prepared by: Leo, Database Architect
