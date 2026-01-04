# Step 6b: Quick Reference Guide

**Three Critical Endpoints + One Async Job**

---

## Endpoint 1: POST /api/v1/calculator/step/4

**Submit health profile and finalize Step 4**

```bash
curl -X POST https://api.example.com/api/v1/calculator/step/4 \
  -H "Content-Type: application/json" \
  -d '{
    "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "data": {
      "email": "michael@example.com",
      "first_name": "Michael",
      "last_name": "Brew",
      "medications": "Atenolol 50mg daily",
      "conditions": ["hypertension"],
      "symptoms": "Occasional fatigue",
      "dairy_tolerance": "butter-only",
      "goals": ["weightloss", "energy"],
      "additional_notes": "Prefer beef and lamb"
    }
  }'
```

**Response (200 OK)**
```json
{
  "success": true,
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step_completed": 4,
  "message": "Step 4 submitted. Report generation queued."
}
```

**Validation**
- Email: REQUIRED, valid format, max 255 chars
- First name: REQUIRED, 1-100 chars
- Last name: REQUIRED, 1-100 chars
- Premium check: is_premium must be true
- Rate limit: 3 per hour

**Errors**
- 400: `INVALID_EMAIL` - Email validation failed
- 403: `PAYMENT_REQUIRED` - Not premium
- 429: `RATE_LIMIT` - Too many attempts
- 500: `DB_UPDATE_FAILED` - Database error

---

## Endpoint 2: POST /api/v1/calculator/payment/verify

**Verify Stripe payment and unlock premium + create report**

```bash
curl -X POST https://api.example.com/api/v1/calculator/payment/verify \
  -H "Content-Type: application/json" \
  -d '{
    "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "stripe_payment_intent_id": "pi_1Abc123XYZ"
  }'
```

**Response (200 OK)**
```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "is_premium": true,
  "payment_status": "completed",
  "access_token": "7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c...",
  "expires_at": "2026-01-05T10:30:00Z",
  "message": "Payment verified. Report generation started."
}
```

**What it does**
1. Verifies Stripe payment via API
2. Sets is_premium=true, payment_status='completed'
3. Creates calculator_reports row
4. Generates 64-char access token
5. Queues async report generation

**Validation**
- session_token: Must exist
- stripe_payment_intent_id: Must match session
- Stripe verification: Must return 'succeeded'
- Rate limit: 5 per hour

**Errors**
- 400: `PAYMENT_MISMATCH` - Intent ID doesn't match
- 400: `PAYMENT_VERIFICATION_FAILED` - Stripe verification failed
- 429: `RATE_LIMIT` - Too many attempts
- 500: `PAYMENT_VERIFICATION_FAILED` - Transaction failed

**ACID Transaction**
All-or-nothing: Update session + create report + log access

---

## Endpoint 3: GET /api/v1/calculator/report/{access_token}/status

**Poll real-time progress of report generation**

```bash
curl https://api.example.com/api/v1/calculator/report/7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c/status
```

**Response (200 OK) - Queued**
```json
{
  "access_token": "7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c",
  "status": "queued",
  "is_generated": false,
  "stage": 0,
  "stage_name": "Initializing...",
  "progress": 0,
  "time_remaining_seconds": 30,
  "expires_at": "2026-01-05T10:30:00Z"
}
```

**Response (200 OK) - Generating**
```json
{
  "access_token": "7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c",
  "status": "generating",
  "is_generated": false,
  "stage": 2,
  "stage_name": "Analyzing your health profile...",
  "progress": 40,
  "time_remaining_seconds": 20,
  "expires_at": "2026-01-05T10:30:00Z"
}
```

**Response (200 OK) - Completed**
```json
{
  "access_token": "7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c",
  "status": "completed",
  "is_generated": true,
  "stage": 5,
  "stage_name": "Your report is ready!",
  "progress": 100,
  "time_remaining_seconds": 0,
  "expires_at": "2026-01-05T10:30:00Z"
}
```

**Stage Progression**
- Stage 0: Initializing (0%)
- Stage 1: Calculating macros (20%)
- Stage 2: Analyzing health (40%)
- Stage 3: Generating protocol (60%)
- Stage 4: Personalizing (80%)
- Stage 5: Finalizing (100%)

**Frontend Integration**
```typescript
// Poll every 2 seconds
const token = '7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c';
while (true) {
  const response = await fetch(`/api/v1/calculator/report/${token}/status`);
  const data = await response.json();

  updateProgressBar(data.progress, data.stage_name);

  if (data.status === 'completed') break;
  await new Promise(r => setTimeout(r, 2000));
}
```

**Errors**
- 400: `INVALID_TOKEN` - Token format wrong
- 404: `REPORT_NOT_FOUND` - Report doesn't exist
- 410: `REPORT_EXPIRED` - Access expired

---

## Async Report Generation Job

**Background: processReportQueue(env, maxReports=10)**

**Execution**
- Cron: Every 5 minutes (process max 10 reports)
- Stripe webhook: payment_intent.succeeded
- Manual: Call processReportQueue(env) directly

**Pipeline**
```
1. Fetch pending reports (is_generated=false)
2. For each report:
   a. Fetch session data
   b. Build Claude prompt
   c. Call Claude API (claude-opus-4-5-20251101)
   d. Convert markdown to HTML
   e. Extract metadata
   f. Store report (ATOMIC)
   g. Log usage + access
```

**Progress Updates**
- Stage 1: Calculating (20%)
- Stage 2: Analyzing (40%)
- Stage 3: Generating (60%)
- Stage 4: Personalizing (80%)
- Stage 5: Finalizing (100%)

**Error Handling**
- Transient errors: Auto-retry (up to 5 attempts)
- Permanent errors: Mark as failed, continue queue
- Alert on: 3+ consecutive failures

**Database Operations**

Update report during generation:
```sql
UPDATE calculator_reports SET
  report_json = '{"status":"generating","stage":2,"progress":40}',
  updated_at = NOW()
WHERE id = 'report-id';
```

Store completed report:
```sql
UPDATE calculator_reports SET
  report_html = '<html>...</html>',
  report_markdown = '# Report...',
  report_json = '{"status":"completed","stage":5,"progress":100}',
  is_generated = true,
  generated_at = NOW()
WHERE id = 'report-id';
```

Log usage:
```sql
INSERT INTO claude_api_logs (
  session_id, model, input_tokens, output_tokens, status, duration_ms
) VALUES (
  'session-id', 'claude-opus-4-5-20251101', 500, 2000, 'success', 15000
);
```

---

## Flow Diagram

```
USER SUBMISSION
│
├─ Frontend: Fill Step 4 form
│   (email, health data, goals)
│
├─ POST /api/v1/calculator/step/4
│   ├─ Validate email (REQUIRED)
│   ├─ Server-side validation
│   ├─ Update session
│   └─ Response: success=true
│
├─ Frontend: Payment success callback
│   (from Stripe with payment_intent_id)
│
├─ POST /api/v1/calculator/payment/verify
│   ├─ Verify with Stripe API (MCP)
│   ├─ Update is_premium=true
│   ├─ Create calculator_reports row
│   ├─ Generate access_token
│   └─ Queue async job
│
├─ Frontend: Show progress bar
│   (5 stages: calculating → analyzing → generating → personalizing → finalizing)
│
├─ GET /api/v1/calculator/report/:token/status (poll every 2s)
│   ├─ Return current stage
│   ├─ Return progress %
│   ├─ Return time remaining
│   └─ Return status (queued|generating|completed)
│
└─ BACKGROUND: processReportQueue()
    ├─ Fetch session data
    ├─ Build Claude prompt
    ├─ Call Claude API
    ├─ Convert to HTML
    ├─ Store in database
    └─ Log metrics
```

---

## Error Codes Reference

| Code | HTTP | Description |
|------|------|-------------|
| INVALID_EMAIL | 400 | Email validation failed |
| MISSING_FIELDS | 400 | Required fields missing |
| VALIDATION_FAILED | 400 | Form validation error |
| INVALID_TOKEN | 400 | Access token format wrong |
| PAYMENT_MISMATCH | 400 | Payment intent doesn't match |
| PAYMENT_VERIFICATION_FAILED | 400 | Stripe verification failed |
| SESSION_NOT_FOUND | 404 | Session doesn't exist |
| REPORT_NOT_FOUND | 404 | Report doesn't exist |
| REPORT_EXPIRED | 410 | Report access expired |
| NOT_PREMIUM | 403 | Payment required |
| PAYMENT_REQUIRED | 403 | Step 4 requires payment |
| RATE_LIMIT | 429 | Too many requests |
| DB_UPDATE_FAILED | 500 | Database error |
| INTERNAL_ERROR | 500 | Server error |

---

## Key Implementation Details

### Email Validation
- Pattern: `/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/`
- Max length: 255 chars
- Required in Step 4

### Access Token
- Format: 64-character hex string
- Entropy: 256-bit cryptographic random
- Security: Non-guessable, secure proof of ownership

### Rate Limiting
- In-memory store with 1-hour windows
- Per session_token
- Limits: Step4=3, Verify=5, Status=100

### ACID Transactions
- Payment verify: Update session + create report (all-or-nothing)
- Report generation: Update report HTML/metadata atomically
- Rollback on any step failure

### Cron Job
- Runs every 5 minutes
- Process max 10 reports per cycle
- Retry failed reports exponentially

---

## Testing Checklist

- [ ] POST /step/4: Valid email accepted
- [ ] POST /step/4: Invalid email rejected
- [ ] POST /step/4: Missing email rejected
- [ ] POST /step/4: Rate limit enforced (3/hour)
- [ ] POST /payment/verify: Valid payment verified
- [ ] POST /payment/verify: Invalid payment rejected
- [ ] POST /payment/verify: Mismatch detected
- [ ] GET /status: Queued state returned
- [ ] GET /status: Generating state with progress
- [ ] GET /status: Completed state
- [ ] GET /status: Expired report rejected
- [ ] Background job: Report queued → generating → completed
- [ ] Background job: Claude API called with correct prompt
- [ ] Background job: HTML conversion works
- [ ] Background job: Error handling (retry, logging)

---

**Files**

- Implementation: `src/workers/calculator-api-step6b.ts`
- Async Job: `src/services/report-generation-queue.ts`
- Full Docs: `docs/STEP6B_IMPLEMENTATION.md`

