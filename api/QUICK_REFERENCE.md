# Story 3.4: Quick Reference Card

**Endpoint:** `POST /api/v1/assessment/verify-and-generate`

---

## Request/Response Cheat Sheet

### Success (200 OK)

```bash
curl -X POST https://api.carnivore-weekly.com/api/v1/assessment/verify-and-generate \
  -H "Content-Type: application/json" \
  -d '{"session_id": "550e8400-e29b-41d4-a716-446655440000"}'

# Response
{
  "success": true,
  "paid": true,
  "report_id": "660e8400-e29b-41d4-a716-446655440111",
  "access_token": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
  "expires_at": "2026-01-06T14:32:00.000Z",
  "message": "Report generated successfully"
}
```

### Error Examples

| Error | Status | Response |
|-------|--------|----------|
| Missing session_id | 400 | `{"success": false, "error_code": "MISSING_FIELDS"}` |
| Session not found | 404 | `{"success": false, "error_code": "SESSION_NOT_FOUND"}` |
| Payment not verified | 402 | `{"success": false, "paid": false, "error_code": "PAYMENT_NOT_VERIFIED"}` |
| Claude failed | 500 | `{"success": false, "error_code": "CLAUDE_GENERATION_FAILED"}` |
| DB error | 500 | `{"success": false, "error_code": "REPORT_SAVE_FAILED"}` |

---

## Environment Variables

```bash
# Required in Cloudflare secrets:
SUPABASE_URL=https://kwtdpvnjewtahuxjyltn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<long-alphanumeric-key>
STRIPE_SECRET_KEY=sk_live_...
CLAUDE_API_KEY=sk-ant-...
```

---

## File Locations

| File | Purpose |
|------|---------|
| `/api/verify-and-generate.js` | JavaScript implementation (ready to use) |
| `/api/verify-and-generate.ts` | TypeScript implementation (type-safe) |
| `/api/VERIFY_AND_GENERATE_GUIDE.md` | Comprehensive guide + 10 test cases |
| `/api/INTEGRATION_STEPS.md` | How to integrate into existing worker |
| `/api/ARCHITECTURE.md` | Deep dive into design rationale |
| `/api/verify-and-generate-test.sql` | Database validation test suite |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Claude model | claude-sonnet-4-20250514 |
| Max tokens | 16,000 |
| Temperature | 0.7 |
| Expected duration | 30-60 seconds |
| Access token length | 64 hex characters |
| Expiration | 48 hours |
| Cost/report | $0.13 (avg) |
| Database transaction time | <500ms (after Claude) |

---

## Critical Database Queries

### Find a report

```sql
SELECT * FROM calculator_reports
WHERE access_token = 'a1b2c3d4e5f6...';
```

### Check payment status

```sql
SELECT payment_status, paid_at, completed_at
FROM calculator_sessions_v2
WHERE id = 'uuid';
```

### Get Claude API costs

```sql
SELECT
  DATE(request_at),
  COUNT(*) as calls,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0 +
        SUM(output_tokens) * 15.0 / 1000000.0, 4) as cost_usd
FROM claude_api_logs
WHERE status = 'success'
GROUP BY DATE(request_at)
ORDER BY DATE(request_at) DESC;
```

### Mark report as expired

```sql
UPDATE calculator_reports
SET is_expired = TRUE, expires_at = NOW() - INTERVAL '1 hour'
WHERE id = 'uuid';
```

### Track report access

```sql
SELECT accessed_at, ip_address, user_agent
FROM calculator_report_access_log
WHERE report_id = 'uuid'
ORDER BY accessed_at DESC;
```

---

## Deployment Checklist

- [ ] Secrets set: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `CLAUDE_API_KEY`
- [ ] Route added to router: `/api/v1/assessment/verify-and-generate`
- [ ] Database migrations applied (015 + 016)
- [ ] Test database (run verify-and-generate-test.sql)
- [ ] Test endpoint locally (wrangler dev)
- [ ] Deploy to staging (wrangler deploy --env staging)
- [ ] Run 10 integration tests from guide
- [ ] Deploy to production (wrangler deploy --env production)
- [ ] Monitor Claude costs daily
- [ ] Setup scheduled cleanup jobs (hourly + weekly)

---

## Common Issues & Fixes

### "Session not found" (404)

**Cause:** session_id doesn't exist in database
**Fix:**
- Verify session was created via /calculator/session
- Verify session_id format is valid UUID

### "Payment not verified" (402)

**Cause:** Stripe session.payment_status != 'paid'
**Fix:**
- User must complete Stripe checkout
- Check Stripe dashboard: Payments > Sessions
- Verify amount was actually charged

### "Claude API error" (500)

**Cause:** Anthropic API failed
**Fix:**
- Check CLAUDE_API_KEY is valid
- Check API key has credits (Anthropic billing)
- Check internet connectivity
- Check Claude API status page

### "Report save failed" (500)

**Cause:** Database transaction failed
**Fix:**
- Check database is accessible (ping Supabase)
- Check service role key is correct
- Check no constraint violations (e.g., access_token already used)
- Check network connectivity

### "Access token already exists"

**Cause:** Crypto.getRandomValues() returned duplicate (extremely rare)
**Fix:**
- Retry the entire request
- Probability is 1 in 2^256 (effectively impossible)

---

## Performance Tuning

### If reports are slow to generate

1. Check Claude API latency
   ```sql
   SELECT AVG(duration_ms) FROM claude_api_logs WHERE status='success';
   ```
2. Check if model is overloaded (Anthropic status page)
3. Reduce max_tokens from 16,000 to 12,000 (trades quality for speed)
4. Change temperature from 0.7 to 0.5 (more deterministic, less creative)

### If database is slow

1. Check index fragmentation
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
   FROM pg_stat_user_indexes
   WHERE tablename IN ('calculator_reports', 'claude_api_logs');
   ```

2. Run VACUUM ANALYZE
   ```sql
   VACUUM ANALYZE calculator_reports;
   VACUUM ANALYZE calculator_report_access_log;
   VACUUM ANALYZE claude_api_logs;
   ```

3. Check access log partition size
   ```sql
   SELECT partition_name, pg_size_pretty(pg_total_relation_size(schemaname||'.'||partition_name))
   FROM pg_partitions
   WHERE parent_table = 'calculator_report_access_log'
   ORDER BY partition_name DESC
   LIMIT 5;
   ```

---

## Monitoring Dashboard Queries

### Hourly Revenue

```sql
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as reports_generated,
  COUNT(*) * 0.132::NUMERIC as revenue_usd
FROM calculator_reports
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;
```

### Error Rate

```sql
SELECT
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as pct
FROM claude_api_logs
WHERE request_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

### User Engagement

```sql
SELECT
  COUNT(DISTINCT r.id) as total_reports,
  COUNT(DISTINCT l.report_id) as accessed_reports,
  ROUND(100.0 * COUNT(DISTINCT l.report_id) / COUNT(DISTINCT r.id), 2) as access_rate_pct,
  ROUND(AVG(r.access_count), 2) as avg_accesses_per_report
FROM calculator_reports r
LEFT JOIN calculator_report_access_log l ON r.id = l.report_id
  AND l.accessed_at > NOW() - INTERVAL '24 hours'
WHERE r.created_at > NOW() - INTERVAL '24 hours';
```

---

## Anatomy of the Endpoint

```
Input Validation
    │
    ▼
Stripe Verification (20-50ms)
    │
    ▼
Database Lookup (1-5ms)
    │
    ▼
Claude API Call (30-60 seconds) ◄── Slowest
    │
    ▼
Database Transaction (100-500ms)
    │
    ├─ INSERT report
    ├─ UPDATE session
    ├─ INSERT logs
    └─ COMMIT
    │
    ▼
Audit Log (1-5ms)
    │
    ▼
Return Response (1ms)

Total Time: 30-65 seconds per request
```

---

## Security Checklist

- [ ] Endpoint uses HTTPS only
- [ ] Service role key is never exposed in frontend
- [ ] Access tokens are 64 random hex chars (never sequential)
- [ ] Reports expire after 48 hours (soft delete)
- [ ] Reports deleted after 90 days (hard delete, GDPR)
- [ ] RLS policies enforce access control
- [ ] All API calls logged with IP address
- [ ] No sensitive data in error messages
- [ ] Rate limiting implemented (optional but recommended)
- [ ] CORS headers restrict to your domain

---

## Troubleshooting Decision Tree

```
Endpoint returns error
        │
        ├─ 400 ──→ Check: Valid JSON? Valid session_id UUID format?
        │
        ├─ 402 ──→ Check: Did user complete Stripe payment?
        │         (Look in Stripe dashboard: Payments > Sessions)
        │
        ├─ 404 ──→ Check: Does session exist in calculator_sessions_v2?
        │         Run: SELECT id FROM calculator_sessions_v2 WHERE id='...'
        │
        ├─ 500 ──→ Check database or API error
        │         ├─ Claude: Check API key & credits
        │         ├─ Database: Check Supabase status
        │         └─ Logs: wrangler tail --env production
        │
        └─ No response (timeout)
                  ├─ Stripe API down? (stripe.com/status)
                  ├─ Claude API down? (status.anthropic.com)
                  ├─ Database down? (supabase dashboard)
                  └─ Network latency? (check firewall rules)
```

---

## Key Formulas

### Cost Calculation

```
Total Cost = (Input Tokens × $3/1M) + (Output Tokens × $15/1M)
           = (Input / 1,000,000 × 3) + (Output / 1,000,000 × 15)

Example with avg values:
           = (1,500 / 1,000,000 × 3) + (8,500 / 1,000,000 × 15)
           = 0.0045 + 0.1275
           = $0.132 per report
```

### Expiration Calculation

```
Expires At = NOW() + 48 hours
           = CURRENT_TIMESTAMP + INTERVAL '48 hours'
           = Now in ISO 8601 format + 172,800 seconds

Example:
Created:  2026-01-04 14:32:00 UTC
Expires:  2026-01-06 14:32:00 UTC
```

### Entropy (Access Token)

```
Random Bytes = 32 (256 bits)
Hex Characters = 32 × 2 = 64
Possible Values = 16^64 = 2^256
Probability of Collision = √(2^256) = 2^128 (negligible)
```

---

## Links & Resources

- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **Supabase API:** https://supabase.com/docs/guides/api
- **Stripe API:** https://stripe.com/docs/api
- **Claude API:** https://docs.anthropic.com/
- **Cloudflare Workers:** https://developers.cloudflare.com/workers/

---

## Contact & Support

- **Questions about database?** → See `/api/ARCHITECTURE.md`
- **How to test?** → See `/api/VERIFY_AND_GENERATE_GUIDE.md`
- **How to deploy?** → See `/api/INTEGRATION_STEPS.md`
- **Need SQL help?** → Run `/api/verify-and-generate-test.sql`

---

**Last Updated:** 2026-01-04
**Author:** Leo, Database Architect
**Philosophy:** "ACID properties don't negotiate."
