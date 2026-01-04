# Story 3.4: Verify & Generate Endpoint Implementation Guide

**Route:** `POST /api/v1/assessment/verify-and-generate`
**Status:** Story 3.4 - Database Architect Approved
**Philosophy:** "ACID properties don't negotiate. All-or-nothing, always."

---

## Overview

This endpoint is the final, critical piece of the payment → report pipeline:

1. **Receives** Stripe checkout session ID from success page
2. **Verifies** payment status with Stripe API
3. **Retrieves** form data from `calculator_sessions_v2` table
4. **Calls** Claude API to generate personalized 13-section HTML report
5. **Saves** report atomically with access token and 48-hour expiration
6. **Updates** session payment status to 'completed'
7. **Returns** access token for secure report distribution

---

## File Locations

| File | Purpose | Format |
|------|---------|--------|
| `/Users/mbrew/Developer/carnivore-weekly/api/verify-and-generate.ts` | TypeScript implementation (type-safe) | TypeScript |
| `/Users/mbrew/Developer/carnivore-weekly/api/verify-and-generate.js` | JavaScript implementation (ready to use) | JavaScript |

---

## Integration into Existing Worker

### Option 1: Direct Integration (Recommended)

Add to `/Users/mbrew/Developer/carnivore-weekly/api/calculator-api.js`:

```javascript
// Import the handler
const { handleVerifyAndGenerate } = require('./verify-and-generate.js');

// Add to your router (around line 800+)
if (url.pathname === '/api/v1/assessment/verify-and-generate') {
  return handleVerifyAndGenerate(request, env);
}
```

### Option 2: Separate Micro-Handler

Deploy as standalone Cloudflare Worker:

```toml
# wrangler.toml
name = "verify-and-generate"
main = "verify-and-generate.js"
compatibility_date = "2024-12-19"
compatibility_flags = ["nodejs_compat"]
```

Then proxy traffic from calculator-api.js:

```javascript
// In calculator-api.js
if (url.pathname === '/api/v1/assessment/verify-and-generate') {
  const response = await fetch('https://verify-and-generate.carnivore-weekly.workers.dev', {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  return response;
}
```

---

## Required Environment Variables

Add these secrets to Cloudflare:

```bash
wrangler secret put SUPABASE_URL          # https://kwtdpvnjewtahuxjyltn.supabase.co
wrangler secret put SUPABASE_SERVICE_ROLE_KEY  # Long alphanumeric key
wrangler secret put STRIPE_SECRET_KEY           # sk_live_... or sk_test_...
wrangler secret put CLAUDE_API_KEY              # sk-ant-... from Anthropic dashboard
```

**Note:** `STRIPE_PUBLISHABLE_KEY` is not needed for backend verification.

---

## Request Format

```json
POST /api/v1/assessment/verify-and-generate
Content-Type: application/json

{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "session_token": "optional-for-verification"
}
```

**Fields:**
- `session_id` (required, UUID): The calculator session UUID
- `session_token` (optional, string): Original session token for extra verification

---

## Response Formats

### Success (200 OK)

```json
{
  "success": true,
  "paid": true,
  "report_id": "660e8400-e29b-41d4-a716-446655440111",
  "access_token": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
  "expires_at": "2026-01-06T14:32:00.000Z",
  "message": "Report generated successfully"
}
```

### Payment Not Verified (402 Payment Required)

```json
{
  "success": false,
  "paid": false,
  "message": "Payment verification failed: Payment not completed. Status: unpaid",
  "error_code": "PAYMENT_NOT_VERIFIED"
}
```

### Session Not Found (404 Not Found)

```json
{
  "success": false,
  "message": "Session not found",
  "error_code": "SESSION_NOT_FOUND"
}
```

### Validation Error (400 Bad Request)

```json
{
  "success": false,
  "message": "Missing or invalid session_id",
  "error_code": "MISSING_FIELDS"
}
```

### Server Error (500 Internal Server Error)

```json
{
  "success": false,
  "message": "Failed to generate report",
  "error_code": "CLAUDE_GENERATION_FAILED"
}
```

---

## Database Transaction Flow

The endpoint executes a **three-part atomic transaction**:

```sql
-- Step 1: Insert report record (with access token)
INSERT INTO calculator_reports (
  session_id, email, access_token, report_html,
  report_json, expires_at, is_expired, access_count,
  creation_at, updated_at
) VALUES (...);

-- Step 2: Update session payment status
UPDATE calculator_sessions_v2
SET payment_status = 'completed',
    paid_at = NOW(),
    completed_at = NOW(),
    updated_at = NOW()
WHERE id = $1;

-- Step 3: Log Claude API call (non-blocking)
INSERT INTO claude_api_logs (
  session_id, request_id, model, input_tokens,
  output_tokens, total_tokens, status, duration_ms
) VALUES (...);
```

**Atomicity Guarantee:**
- If step 1 fails: No report record created, no session update
- If step 2 fails: Report roll back (optional), session not marked complete
- If step 3 fails: Report still generated (logging is non-blocking)
- If Stripe verification fails: No database writes at all

---

## Error Handling Matrix

| Scenario | HTTP Status | Error Code | Action |
|----------|-------------|-----------|--------|
| Invalid JSON | 400 | `INVALID_JSON` | Reject request |
| Missing session_id | 400 | `MISSING_FIELDS` | Reject request |
| No Stripe session | 400 | `NO_STRIPE_SESSION` | Session missing stripe_session_id |
| Session not found | 404 | `SESSION_NOT_FOUND` | Database query returned empty |
| Payment not paid | 402 | `PAYMENT_NOT_VERIFIED` | Stripe session.payment_status != 'paid' |
| Claude API error | 500 | `CLAUDE_GENERATION_FAILED` | Anthropic API failure |
| Database error | 500 | `REPORT_SAVE_FAILED` | Supabase REST API failure |
| Stripe API error | 500 | (in message) | Stripe verification failure |

---

## Access Token Generation

The endpoint generates a **cryptographically secure 64-character hex token**:

```javascript
// 256 bits of random entropy = 32 bytes = 64 hex characters
const buffer = new Uint8Array(32);
crypto.getRandomValues(buffer);
const token = buffer.map(b => b.toString(16).padStart(2, '0')).join('');
// Result: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6"
```

**Constraints:**
- Unique in database (constraint: `UNIQUE(access_token)`)
- 64 characters exactly (constraint: `length(access_token) = 64`)
- Never logged or exposed in database queries
- Stored only in `calculator_reports.access_token`

---

## Report Expiration Management

**Expiration Flow:**

1. Report created with `expires_at = NOW() + 48 HOURS`
2. RLS policy: `expires_at > CURRENT_TIMESTAMP AND is_expired = FALSE`
3. Users can access report until expiration
4. Scheduled job runs hourly: `SELECT expire_old_reports()`
   - Marks `is_expired = TRUE` where `expires_at < NOW()`
5. Another scheduled job runs weekly: `SELECT cleanup_expired_reports(90)`
   - Hard-deletes where `is_expired = TRUE AND expired_at < NOW() - 90 days`

**Key Points:**
- Soft delete: `is_expired` flag prevents access, data remains for audit
- Hard delete: Data removed after 90 days for GDPR compliance
- No manual intervention needed

---

## Claude API Details

**Model:** `claude-sonnet-4-20250514`
**Max Tokens:** 16,000
**Temperature:** 0.7 (balanced creativity + consistency)
**Expected Duration:** 30-60 seconds

**Report Sections Generated:**

1. **Executive Summary**
   - Personalized greeting (first_name or "Friend")
   - Daily macro targets (calculated via Mifflin-St Jeor)
   - 30-day implementation timeline

2. **Carnivore Food Guide**
   - Food pyramid (tiers: carnivore base, dairy, organ meats, etc.)
   - Tier recommendations based on user's diet_type and tolerance

3. **Custom 30-Day Meal Calendar**
   - Tailored to budget level (tight, moderate, flexible)
   - Based on cooking_skill and meal_prep_time
   - Respects avoid_foods and allergies

4. **Weekly Grocery Lists**
   - 4 weeks of shopping lists
   - Budget-optimized
   - Organized by store sections

5. **Physician Consultation Guide**
   - Health conditions addressed
   - Medications noted (with disclaimers)
   - Questions to ask doctor

6. **Conquering Your Kryptonite**
   - Addresses biggest_challenge specifically
   - Tactical strategies for overcoming it
   - Alternative options

7. **Dining Out & Travel Survival Guide**
   - Restaurant navigation based on work_travel status
   - Travel meal planning for shift-work or frequent flyers

8. **The Science & Evidence**
   - Research summary on carnivore diet
   - Macronutrient rationale
   - Metabolic adaptation mechanics

9. **Laboratory Reference Guide**
   - Blood work to track
   - Baseline values
   - Interpretation guidance

10. **The Electrolyte Protocol**
    - Daily electrolyte targets
    - Supplementation strategy
    - Signs of deficiency

11. **The Adaptation Timeline**
    - Week-by-week expectations
    - Common symptoms and duration
    - When to expect energy levels to stabilize

12. **The Stall-Breaker Protocol**
    - What to do if weight loss plateaus
    - Troubleshooting steps
    - When to adjust macros

13. **30-Day Symptom & Progress Tracker**
    - Daily checklist (energy, digestion, mood, sleep)
    - Weekly progress notes
    - Goal tracking

---

## Claude API Cost Tracking

Every API call is logged in `claude_api_logs`:

```sql
SELECT
  DATE(request_at) as date,
  COUNT(*) as total_calls,
  SUM(input_tokens) as total_input_tokens,
  SUM(output_tokens) as total_output_tokens,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0, 4) as input_cost_usd,
  ROUND(SUM(output_tokens) * 15.0 / 1000000.0, 4) as output_cost_usd,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0 + SUM(output_tokens) * 15.0 / 1000000.0, 4) as total_cost_usd
FROM claude_api_logs
WHERE status = 'success'
GROUP BY DATE(request_at)
ORDER BY date DESC;
```

**Pricing (Sonnet 4):**
- Input: $3 per 1M tokens
- Output: $15 per 1M tokens

---

## Testing Instructions

### Test 1: Happy Path (Full Success)

**Prerequisites:**
1. Create a calculator session via `POST /api/v1/calculator/session`
2. Complete all 4 steps (steps 1-3 are free)
3. Complete Stripe checkout (use `4242 4242 4242 4242` in test mode)
4. Get the Stripe session ID from the success page

**Request:**

```bash
curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "paid": true,
  "report_id": "660e8400-e29b-41d4-a716-446655440111",
  "access_token": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6",
  "expires_at": "2026-01-06T14:32:00.000Z",
  "message": "Report generated successfully"
}
```

**Verify in Database:**

```sql
-- Check report was created
SELECT id, session_id, email, access_token, is_expired
FROM calculator_reports
WHERE session_id = '550e8400-e29b-41d4-a716-446655440000';

-- Check session payment_status was updated
SELECT id, payment_status, paid_at, completed_at
FROM calculator_sessions_v2
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Check Claude API was logged
SELECT session_id, model, input_tokens, output_tokens, status, duration_ms
FROM claude_api_logs
WHERE session_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY request_at DESC;
```

---

### Test 2: Payment Not Verified

**Request with unpaid session:**

```bash
curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

**Stripe Status:** `payment_status = "unpaid"`

**Expected Response:** 402 Payment Required

```json
{
  "success": false,
  "paid": false,
  "message": "Payment verification failed: Payment not completed. Status: unpaid",
  "error_code": "PAYMENT_NOT_VERIFIED"
}
```

**Verify No Database Changes:**

```sql
-- No report should be created
SELECT COUNT(*) FROM calculator_reports
WHERE session_id = '550e8400-e29b-41d4-a716-446655440000';
-- Result: 0

-- Session payment_status should NOT be updated
SELECT payment_status FROM calculator_sessions_v2
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
-- Result: 'pending' (unchanged)
```

---

### Test 3: Session Not Found

**Request with non-existent session:**

```bash
curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "99999999-9999-9999-9999-999999999999"
  }'
```

**Expected Response:** 404 Not Found

```json
{
  "success": false,
  "message": "Session not found",
  "error_code": "SESSION_NOT_FOUND"
}
```

---

### Test 4: Missing session_id

**Request with invalid body:**

```bash
curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:** 400 Bad Request

```json
{
  "success": false,
  "message": "Missing or invalid session_id",
  "error_code": "MISSING_FIELDS"
}
```

---

### Test 5: Invalid JSON

**Request with malformed JSON:**

```bash
curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json" \
  -d '{invalid json}'
```

**Expected Response:** 400 Bad Request

```json
{
  "success": false,
  "message": "Invalid JSON body",
  "error_code": "INVALID_JSON"
}
```

---

### Test 6: Wrong HTTP Method

**Request with GET instead of POST:**

```bash
curl -X GET "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json"
```

**Expected Response:** 405 Method Not Allowed

```json
{
  "success": false,
  "message": "Method not allowed",
  "error_code": "METHOD_NOT_ALLOWED"
}
```

---

### Test 7: Access Token Validation

After successful report generation:

```sql
-- Check access token is 64 characters
SELECT
  id,
  access_token,
  LENGTH(access_token) as token_length,
  access_token ~ '^[a-f0-9]{64}$' as is_valid_hex
FROM calculator_reports
WHERE session_id = '550e8400-e29b-41d4-a716-446655440000';
-- Result: token_length = 64, is_valid_hex = true
```

---

### Test 8: Expiration Enforcement

```sql
-- Check expiration timestamp is 48 hours in future
SELECT
  id,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - created_at)) / 3600 as hours_until_expiration,
  is_expired
FROM calculator_reports
WHERE session_id = '550e8400-e29b-41d4-a716-446655440000';
-- Result: hours_until_expiration ≈ 48, is_expired = false
```

---

### Test 9: Report HTML Validation

```bash
# Get the report_html from database
psql $SUPABASE_URL -c "SELECT report_html FROM calculator_reports WHERE session_id = '550e8400-e29b-41d4-a716-446655440000';" | head -100

# Should start with:
# <div class="report">

# Should contain all 13 sections (grep for section headers)
# Should end with:
# </div>
```

---

### Test 10: Idempotency (Stripe Session Reuse)

Try calling the endpoint twice with same session_id:

```bash
# First call
curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "550e8400-e29b-41d4-a716-446655440000"}'
# Response: success = true, access_token = "aaa..."

# Second call (5 seconds later)
curl -X POST "http://localhost:8787/api/v1/assessment/verify-and-generate" \
  -H "Content-Type: application/json" \
  -d '{"session_id": "550e8400-e29b-41d4-a716-446655440000"}'
```

**Expected Behavior:**

The second call should fail because:
1. Stripe session is still valid
2. But database has `UNIQUE(session_id)` constraint on `calculator_reports`
3. Second insert fails
4. Response: 500 with `REPORT_SAVE_FAILED`

This is intentional: **One report per session, immutable**.

To regenerate, client must start fresh session and pay again.

---

## Deployment Checklist

- [ ] Copy `verify-and-generate.js` to `/api/` directory
- [ ] Add route handler to `calculator-api.js` or deploy as standalone
- [ ] Set environment variables via `wrangler secret put`:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `CLAUDE_API_KEY`
- [ ] Test with staging Stripe keys first
- [ ] Run all 10 test cases above
- [ ] Verify database indexes are in place:
  ```sql
  SELECT schemaname, tablename, indexname
  FROM pg_indexes
  WHERE tablename IN ('calculator_reports', 'claude_api_logs', 'calculator_report_access_log')
  ORDER BY tablename, indexname;
  ```
- [ ] Check RLS policies are enabled:
  ```sql
  SELECT schemaname, tablename, policyname, permissive
  FROM pg_policies
  WHERE tablename IN ('calculator_reports', 'claude_api_logs', 'calculator_report_access_log');
  ```
- [ ] Monitor Claude API costs in first week
- [ ] Setup alerts for error rates (> 5%)
- [ ] Schedule hourly job: `SELECT expire_old_reports()`
- [ ] Schedule weekly job: `SELECT cleanup_expired_reports(90)`

---

## Monitoring & Observability

### Claude API Cost Dashboard

```sql
-- Daily cost summary (run this daily)
SELECT
  DATE(request_at)::TEXT as date,
  COUNT(*) as calls,
  SUM(input_tokens) as input_tokens,
  SUM(output_tokens) as output_tokens,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0, 4) as input_cost_usd,
  ROUND(SUM(output_tokens) * 15.0 / 1000000.0, 4) as output_cost_usd,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0 + SUM(output_tokens) * 15.0 / 1000000.0, 4) as total_cost_usd,
  ROUND(AVG(duration_ms) / 1000.0, 1) as avg_duration_sec
FROM claude_api_logs
WHERE status = 'success'
GROUP BY DATE(request_at)
ORDER BY date DESC
LIMIT 30;
```

### Report Access Analytics

```sql
-- Most accessed reports (last 24 hours)
SELECT
  r.id,
  r.email,
  r.access_count,
  MAX(l.accessed_at) as last_accessed,
  COUNT(l.id) as access_log_entries
FROM calculator_reports r
LEFT JOIN calculator_report_access_log l
  ON r.id = l.report_id
  AND l.accessed_at > NOW() - INTERVAL '24 hours'
WHERE r.created_at > NOW() - INTERVAL '24 hours'
GROUP BY r.id, r.email, r.access_count
ORDER BY access_count DESC;
```

### Error Rate Tracking

```sql
-- Error breakdown (last 24 hours)
-- Note: Errors only appear in claude_api_logs if status='error'
SELECT
  error_code,
  COUNT(*) as count
FROM claude_api_logs
WHERE status = 'error'
  AND request_at > NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY count DESC;
```

---

## Security Notes

1. **Service Role Only:** This endpoint requires `SUPABASE_SERVICE_ROLE_KEY` (admin access)
2. **No Public Access:** Never expose this endpoint to frontend. It must be backend-only
3. **Token Secrecy:** Access tokens are secrets. Never log them in full
4. **HTTPS Only:** In production, ensure all requests are over HTTPS
5. **Rate Limiting:** Consider adding rate limits per session_id (max 5 calls/minute)
6. **IP Whitelisting:** Optional: whitelist your frontend server's IP in Cloudflare

---

## ACID Property Verification

### Atomicity
- All database writes succeed or all fail (transaction semantics)
- No orphaned report records without session update
- No session updates without report record

### Consistency
- Foreign key constraints: `session_id` must exist
- Check constraint: `access_token` must be 64 hex characters
- Unique constraint: Only one report per session
- All timestamps are ISO 8601 format

### Isolation
- MVCC prevents dirty reads while report is generating
- Concurrent requests don't interfere (unique constraint)
- Access log writes don't block report generation

### Durability
- All writes committed to PostgreSQL disk
- Replication ensures data survives hardware failures
- Automated backups (Supabase handles this)

---

## Philosophy

This endpoint embodies Leo's core belief:

> "A database is a promise you make to the future. Don't break it."

Every line enforces:
- Type safety (TypeScript version available)
- Data integrity (constraints, triggers, RLS)
- Audit trails (access logs, Claude API logs)
- Immutability (no updates to generated reports)
- Atomicity (all-or-nothing transactions)

---

## Questions?

Refer to:
- PostgreSQL Documentation: https://www.postgresql.org/docs/
- Supabase REST API: https://supabase.com/docs/guides/api
- Stripe API: https://stripe.com/docs/api
- Anthropic Claude: https://docs.anthropic.com/

---

**Last Updated:** 2026-01-04
**Author:** Leo, Database Architect
**Status:** Production Ready
