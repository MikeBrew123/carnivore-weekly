# Step 6b: Backend Submission Endpoint + Report Generation Kickoff

**By Leo, Database Architect & Supabase Specialist**

*"Slow is smooth, and smooth is fast. Your data is sacred."*

**Date:** January 3, 2026
**Status:** Implementation Complete
**Philosophy:** "ACID properties don't negotiate. All-or-nothing, always."

---

## Overview

Step 6b implements three critical backend endpoints that orchestrate payment verification and async report generation:

1. **POST /api/v1/calculator/step/4** - Enhanced submission endpoint with email validation
2. **POST /api/v1/calculator/payment/verify** - Payment verification + premium unlock + report creation
3. **GET /api/v1/calculator/report/{token}/status** - Real-time progress tracking

Plus one async background job:
- **Report Generation Queue Handler** - Async Claude API integration with 5-stage progress tracking

---

## Architecture Overview

```
User Submission Flow:
┌─────────────────┐
│ Frontend: Step 4 │
│ (Health Fields) │
└────────┬────────┘
         ↓
┌─────────────────────────────────────────┐
│ POST /api/v1/calculator/step/4          │
│ - Validate email (REQUIRED)              │
│ - Server-side form validation            │
│ - Update calculator_sessions_v2          │
│ - Rate limit (3 requests/hour)           │
└────────┬────────────────────────────────┘
         ↓
┌─────────────────────────────────────────┐
│ Database Transaction (ACID)              │
│ - Update session with step 4 data        │
│ - Mark step_completed = 4                │
│ - Return success + session_token         │
└────────┬────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Frontend: Payment Success Callback        │
│ Has access_token from payment verification│
└────────┬─────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ POST /api/v1/calculator/payment/verify    │
│ - Verify Stripe payment (MCP call)       │
│ - Mark is_premium = true                 │
│ - Create calculator_reports row          │
│ - Generate access_token (64-char hex)    │
│ - Return access_token + expires_at       │
└────────┬─────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Database Transaction (ATOMIC)            │
│ - Update session: is_premium, tier_id    │
│ - Insert calculator_reports record       │
│ - Queue async report generation job      │
└────────┬─────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Frontend: Progress Bar (5 Stages)         │
│ GET /api/v1/calculator/report/:token/status
│ Polls every 2 seconds                    │
└────────┬─────────────────────────────────┘
         ↓
┌──────────────────────────────────────────┐
│ Background: Report Generation (Async)    │
│ Stage 1: Calculating macros (20%)        │
│ Stage 2: Analyzing health (40%)          │
│ Stage 3: Generating protocol (60%)       │
│ Stage 4: Personalizing (80%)             │
│ Stage 5: Finalizing (100%)               │
└──────────────────────────────────────────┘
```

---

## Endpoint 1: POST /api/v1/calculator/step/4

### Purpose
Submit health profile (Step 4 data) and finalize form submission.

### Request

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "data": {
    "email": "michael@example.com",
    "first_name": "Michael",
    "last_name": "Brew",
    "medications": "Atenolol 50mg daily for blood pressure",
    "conditions": ["hypertension"],
    "other_conditions": null,
    "symptoms": "Occasional fatigue",
    "other_symptoms": null,
    "allergies": null,
    "avoid_foods": "Seed oils, processed foods",
    "dairy_tolerance": "butter-only",
    "previous_diets": "Keto for 6 months",
    "what_worked": "Lost 15 lbs on keto",
    "carnivore_experience": "new",
    "cooking_skill": "intermediate",
    "meal_prep_time": "some",
    "budget": "moderate",
    "family_situation": "partner",
    "work_travel": "office",
    "goals": ["weightloss", "energy"],
    "biggest_challenge": "Maintaining consistency while eating out",
    "additional_notes": "Prefer beef and lamb, pork causes bloating"
  }
}
```

### Validation Rules

**Blocking Errors** (prevent submission):
- `email`: Required, must be valid RFC 5322 format, max 255 chars
- `first_name`: Required, 1-100 chars, no special characters
- `last_name`: Required, 1-100 chars, no special characters
- `is_premium`: Must be true (payment required)
- `payment_status`: Must be 'completed'
- `step_completed`: Must be >= 3 (steps 1-3 must be complete)

**Non-Blocking Errors** (logged but allow submission):
- Textarea fields: Max 5000 chars, no binary/control characters
- Arrays: Enum validation for each element
- Optional fields: Nullable

### Response (200 OK)

```json
{
  "success": true,
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step_completed": 4,
  "message": "Step 4 submitted. Report generation queued."
}
```

### Error Responses

```json
{
  "code": "INVALID_EMAIL",
  "message": "Valid email is required for report delivery",
  "status": 400
}
```

```json
{
  "code": "PAYMENT_REQUIRED",
  "message": "Step 4 requires completed payment. Verify payment first.",
  "status": 403
}
```

```json
{
  "code": "RATE_LIMIT",
  "message": "Too many submissions. Try again in 1 hour.",
  "status": 429
}
```

### Rate Limiting
- **Limit**: 3 submissions per session_token per hour
- **Headers**: Returns `Retry-After` on 429 response

### Database Impact

```sql
UPDATE calculator_sessions_v2 SET
  email = 'michael@example.com',
  first_name = 'Michael',
  last_name = 'Brew',
  medications = 'Atenolol 50mg daily for blood pressure',
  conditions = ARRAY['hypertension']::text[],
  symptoms = 'Occasional fatigue',
  avoid_foods = 'Seed oils, processed foods',
  dairy_tolerance = 'butter-only',
  previous_diets = 'Keto for 6 months',
  what_worked = 'Lost 15 lbs on keto',
  carnivore_experience = 'new',
  cooking_skill = 'intermediate',
  meal_prep_time = 'some',
  budget = 'moderate',
  family_situation = 'partner',
  work_travel = 'office',
  goals = ARRAY['weightloss', 'energy']::text[],
  biggest_challenge = 'Maintaining consistency while eating out',
  additional_notes = 'Prefer beef and lamb, pork causes bloating',
  step_completed = 4,
  completed_at = NOW(),
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

---

## Endpoint 2: POST /api/v1/calculator/payment/verify

### Purpose
Verify Stripe payment, unlock premium features, and queue report generation.

### Request

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "stripe_payment_intent_id": "pi_1Abc123XYZ"
}
```

### Validation Rules

**Pre-Verification Checks**:
- `session_token`: Must exist in database
- `stripe_payment_intent_id`: Must match session's intent ID
- Rate limit: 5 verification attempts per hour (prevent loops)

**Stripe Verification** (MCP call):
- Call Stripe API: `stripe.paymentIntents.retrieve(pi_1Abc123XYZ)`
- Check status: `succeeded`, `requires_action`, `requires_payment_method`, etc.
- Only accept `succeeded` status

### Response (200 OK)

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

### Error Responses

```json
{
  "code": "PAYMENT_MISMATCH",
  "message": "Payment intent does not match session",
  "status": 400
}
```

```json
{
  "code": "PAYMENT_VERIFICATION_FAILED",
  "message": "Stripe verification failed. Payment status: requires_payment_method",
  "status": 400
}
```

```json
{
  "code": "RATE_LIMIT",
  "message": "Too many verification attempts. Try again in 1 hour.",
  "status": 429
}
```

### ACID Transaction

All operations happen atomically:

```sql
BEGIN TRANSACTION;

-- Step 1: Update session (premium unlock)
UPDATE calculator_sessions_v2 SET
  is_premium = true,
  payment_status = 'completed',
  payment_verified_at = NOW(),
  step_completed = 4,
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';

-- Step 2: Create report record (initial, not yet generated)
INSERT INTO calculator_reports (
  id, session_id, email, access_token,
  report_html, report_json, is_generated, is_expired,
  created_at, expires_at, updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM calculator_sessions_v2
   WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'),
  'michael@example.com',
  '7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c...',  -- 64-char hex token
  '<p>Report generation starting...</p>',
  '{"status":"queued","stage":0}',
  false,
  false,
  NOW(),
  NOW() + INTERVAL '48 hours',
  NOW()
);

-- Step 3: Log for audit trail
INSERT INTO calculator_report_access_log (
  report_id, accessed_at, ip_address, user_agent, success
) VALUES (
  (SELECT id FROM calculator_reports LIMIT 1),
  NOW(),
  'system-internal',
  'payment-verification',
  true
);

COMMIT;
```

**If ANY step fails**: Transaction rolls back, no partial state change.

### Database Impact

Three tables modified atomically:
1. `calculator_sessions_v2` - is_premium=true, payment_status='completed'
2. `calculator_reports` - New row with access_token and expires_at
3. `calculator_report_access_log` - Audit entry (optional)

---

## Endpoint 3: GET /api/v1/calculator/report/{access_token}/status

### Purpose
Poll real-time progress of report generation for frontend progress bar.

### Request

```
GET /api/v1/calculator/report/7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c/status
```

### Response (200 OK) - Queued

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

### Response (200 OK) - Generating

```json
{
  "access_token": "7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c",
  "status": "generating",
  "is_generated": false,
  "stage": 2,
  "stage_name": "Analyzing your health profile...",
  "progress": 35,
  "time_remaining_seconds": 20,
  "expires_at": "2026-01-05T10:30:00Z"
}
```

### Response (200 OK) - Completed

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

### Error Responses

```json
{
  "code": "INVALID_TOKEN",
  "message": "Invalid access token format",
  "status": 400
}
```

```json
{
  "code": "REPORT_NOT_FOUND",
  "message": "Report not found",
  "status": 404
}
```

```json
{
  "code": "REPORT_EXPIRED",
  "message": "Report access has expired",
  "status": 410
}
```

### Stage Progression

```
Stage 0: Initializing... (0%)
  └─ Report queued, waiting for processing

Stage 1: Calculating your macros... (20%)
  └─ Backend fetches session data, validates calculations

Stage 2: Analyzing your health profile... (40%)
  └─ System loads health conditions, medications, restrictions

Stage 3: Generating your protocol... (60%)
  └─ Claude API call initiated, generating main content

Stage 4: Personalizing recommendations... (80%)
  └─ Claude API completing sections 6-15, personalizing advice

Stage 5: Finalizing your report... (95-100%)
  └─ HTML conversion, metadata extraction, database storage
```

### Database Query

```sql
SELECT
  id, access_token, report_json, is_generated, is_expired, expires_at
FROM calculator_reports
WHERE access_token = '7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c'
AND is_expired = false
AND expires_at > NOW();
```

### Frontend Integration

```typescript
// Poll every 2 seconds during report generation
const pollProgress = async (accessToken: string) => {
  while (true) {
    const response = await fetch(`/api/v1/calculator/report/${accessToken}/status`);
    const data = await response.json();

    if (data.status === 'completed') {
      showReportReadyScreen(accessToken);
      break;
    }

    updateProgressBar(data.progress, data.stage_name);
    await sleep(2000); // Poll every 2 seconds
  }
};
```

---

## Async Report Generation Service

### Purpose
Background job that processes pending reports asynchronously via Claude API.

### Execution Options

#### Option 1: Cron Trigger (Recommended)
```
Run every 5 minutes: Process max 10 pending reports
- Uses Cloudflare Workers scheduled triggers
- Prevents API rate limiting by spreading load
- Retry failed reports exponentially
```

#### Option 2: Stripe Webhook
```
Trigger: payment_intent.succeeded
- Immediately queue report generation
- Reduces delay between payment and report
- Real-time feedback to user
```

#### Option 3: Supabase Function
```
Trigger: PostgreSQL trigger on calculator_reports INSERT
- Automatic when report row created
- Real-time processing
- Tight coupling with database
```

### Processing Pipeline

```
1. FETCH PENDING REPORTS
   └─ SELECT from calculator_reports WHERE is_generated=false

2. FOR EACH REPORT:
   a. UPDATE progress: Stage 1, progress=20%
   b. FETCH session data from calculator_sessions_v2
   c. UPDATE progress: Stage 2, progress=40%
   d. BUILD Claude prompt from session data
   e. UPDATE progress: Stage 3, progress=60%
   f. CALL Claude API
      └─ model: claude-opus-4-5-20251101
      └─ max_tokens: 4000
      └─ Response: ~2000-3000 tokens (2-5 min read)
   g. UPDATE progress: Stage 4, progress=80%
   h. CONVERT markdown to HTML
   i. EXTRACT metadata from markdown
   j. UPDATE progress: Stage 5, progress=95%
   k. STORE in calculator_reports
      └─ report_html, report_markdown, report_json, is_generated
   l. LOG Claude usage (tokens, duration, cost)
   m. MARK complete: progress=100%
   n. LOG report access (audit trail)

3. ERROR HANDLING:
   └─ If any step fails:
      - Mark report as 'failed' in report_json
      - Log error with session_id, error message
      - Continue to next report (don't block queue)
      - Retry failed reports on next cron cycle
```

### Claude API Integration

**Model**: `claude-opus-4-5-20251101`
**Max Tokens**: 4000
**Expected Output**: 2000-3000 tokens
**Estimated Duration**: 10-30 seconds

### Prompt Structure

```
[SYSTEM MESSAGE]
You are an expert nutrition strategist specializing in personalized
carnivore diet implementation. Generate comprehensive, evidence-based
recommendations specific to each individual's health status, goals,
constraints, and lifestyle. Output in markdown format with clear sections.

[USER PROMPT]
## User Demographics
- Name: Michael Brew
- Age: 35 years
- Sex: male
- Weight: 185.5 lbs
- Height: 5'10"
- Email: michael@example.com

[... 30+ fields from calculator_sessions_v2 ...]

## Report Requirements
Create a comprehensive 2000-5000 word personalized report with:
1. Executive Summary
2. Your Profile
3. Macro Strategy
4. Nutrition Optimization
5. Practical Implementation
6. Dairy Tolerance Roadmap
7. Monitoring & Adjustment
8. Timeline & Milestones
9. Q&A
10. Resources & Next Steps

Use markdown formatting. Be specific, evidence-based, and actionable.
```

### Report Structure (Output)

The Claude-generated report contains:

1. **Executive Summary** (2-3 paragraphs)
   - Personalized overview of user's situation
   - Vision for their success

2. **Your Profile** (demographics, calculated metrics)
   - Age, weight, height, BMR, TDEE
   - Activity level, goals, timeline

3. **Macro Strategy**
   - Rationale for protein/fat/carb targets
   - Body composition context
   - Activity-adjusted calculations
   - Meal examples hitting targets

4. **Nutrition Optimization**
   - Condition-specific strategies
   - Medication interactions (if applicable)
   - GI impact, blood sugar, inflammation effects

5. **Practical Implementation**
   - Weekly meal planning template
   - Shopping list framework
   - 5-10 recipes
   - Budget optimization
   - Batch prep strategies

6. **Dairy Tolerance Roadmap**
   - Current status assessment
   - Reintroduction protocol
   - Quality criteria
   - Which products to prioritize

7. **Monitoring & Adjustment**
   - Physical metrics to track
   - Health markers (condition-specific labs)
   - Biofeedback signals
   - Adjustment frequency

8. **Timeline & Milestones**
   - Weeks 1-2: Adaptation phase
   - Weeks 3-8: Optimization phase
   - Month 3+: Fine-tuning phase
   - Expected outcomes

9. **Q&A**
   - 5-7 anticipated questions
   - Based on their exact challenges/goals

10. **Resources & Next Steps**
    - Recommended readings
    - Community resources
    - Healthcare provider guidance
    - 30-day action plan

### Database Schema: Report Tracking

```sql
-- Active report: status='generating', progress increments
UPDATE calculator_reports SET
  report_json = jsonb_build_object(
    'status', 'generating',
    'stage', 2,
    'progress', 40,
    'queued_at', '2026-01-03T10:30:00Z'
  ),
  updated_at = NOW()
WHERE id = 'report-uuid';

-- Completed report
UPDATE calculator_reports SET
  report_html = '<html>...</html>',
  report_markdown = '# Personalized Report...',
  report_json = jsonb_build_object(
    'status', 'completed',
    'stage', 5,
    'progress', 100,
    'sections_count', 10,
    'content_length', 15000,
    'generated_at', '2026-01-03T10:45:00Z',
    'generation_duration_ms', 900000
  ),
  is_generated = true,
  generated_at = NOW(),
  updated_at = NOW()
WHERE id = 'report-uuid';

-- Failed report (retryable)
UPDATE calculator_reports SET
  report_json = jsonb_build_object(
    'status', 'failed',
    'error', 'Claude API timeout after 30s',
    'retry_count', 1,
    'last_attempt', '2026-01-03T10:45:00Z'
  ),
  updated_at = NOW()
WHERE id = 'report-uuid';
```

---

## Security & Compliance

### Access Control

**Report Access**:
- Token-based access (no email/session checking required)
- 64-character hex token (256-bit entropy)
- Non-guessable (cryptographically random)
- Access logs recorded (IP, user agent, timestamp)

**Session Isolation**:
- Service role key for all database operations
- RLS policies enforce row-level isolation
- No cross-session data leakage

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /api/v1/calculator/step/4 | 3 | 1 hour |
| POST /api/v1/calculator/payment/verify | 5 | 1 hour |
| GET /api/v1/calculator/report/:token/status | 100 | 1 hour |
| POST /api/v1/calculator/report/:token/share | 5 | 1 hour |

### Data Encryption

- **Payment data**: Stripe handles PCI (no card storage locally)
- **Email**: Encrypted at rest in Supabase
- **Health data**: End-to-end encrypted via HTTPS
- **Reports**: Access token is sufficient proof of ownership

### Expiration & Cleanup

```sql
-- Soft-delete expired reports (hourly job)
UPDATE calculator_reports SET
  is_expired = true,
  expired_at = NOW()
WHERE expires_at < NOW()
AND is_expired = false;

-- Hard-delete after 90 days (compliance cleanup)
DELETE FROM calculator_reports
WHERE expired_at < NOW() - INTERVAL '90 days';
```

---

## Error Handling & Recovery

### Retry Strategy

**Blocking Errors** (user action required):
- Invalid email format
- Missing required fields
- Payment verification failed

**Transient Errors** (automatic retry):
- Database connection timeout
- Claude API rate limit
- Network timeout

**Retry Policy**:
```
Attempt 1: Immediate
Attempt 2: After 5 seconds
Attempt 3: After 30 seconds
Attempt 4: After 2 minutes
Attempt 5: After 10 minutes
After 5 failures: Mark as failed, alert admin
```

### Idempotency

All endpoints are idempotent:
```
POST /api/v1/calculator/step/4 with same session_token
  └─ Same request = same response (no duplicates)
  └─ Safe to retry

POST /api/v1/calculator/payment/verify with same intent_id
  └─ Same payment verified = no double-charging
  └─ Safe to retry
```

---

## Monitoring & Observability

### Key Metrics

```
API Latency:
  - POST /step/4: <200ms
  - POST /payment/verify: <500ms (Stripe call)
  - GET /report/:token/status: <100ms

Report Generation:
  - Queue processing: Every 5 minutes
  - Avg generation time: 10-30 seconds
  - Claude API tokens: 500-1000 input, 2000-3000 output
  - Success rate: >99%

Database:
  - Query times: All <100ms (indexed)
  - Report access logs: ~50M/month at scale
  - Storage: calculator_reports ~1GB/month
```

### Logging

All operations logged with:
- Timestamp
- Request ID (for correlation)
- Session ID / Report ID
- Operation type
- Duration
- Success/failure status
- Error details (if applicable)

### Alerts

Alert on:
- >3 consecutive report generation failures
- Payment verification success rate <95%
- API latency >500ms p95
- Database connection pool exhaustion
- Stripe API errors

---

## Deployment Checklist

### Pre-Deployment

- [ ] Database schema verified (calculator_sessions_v2, calculator_reports)
- [ ] RLS policies applied and tested
- [ ] Stripe test mode configured
- [ ] Claude API key configured
- [ ] Supabase service role key configured
- [ ] Rate limiter initialized
- [ ] Error logging configured

### Deployment

- [ ] Deploy calculator-api-step6b.ts to Cloudflare Workers
- [ ] Deploy report-generation-queue.ts to background job runner
- [ ] Configure cron trigger (every 5 minutes)
- [ ] Configure Stripe webhook (payment_intent.succeeded)
- [ ] Test payment flow end-to-end
- [ ] Test report generation (multiple tiers)
- [ ] Verify progress tracking endpoint
- [ ] Monitor error logs (first hour)

### Post-Deployment

- [ ] Check error rate (should be <1%)
- [ ] Monitor report generation latency
- [ ] Verify email delivery (if applicable)
- [ ] Check database query performance
- [ ] Monitor API latency
- [ ] Review access logs for anomalies

---

## Implementation Files

### New Files Created

1. **src/workers/calculator-api-step6b.ts**
   - POST /api/v1/calculator/step/4 (enhanced)
   - POST /api/v1/calculator/payment/verify
   - GET /api/v1/calculator/report/{token}/status

2. **src/services/report-generation-queue.ts**
   - Background job: processReportQueue()
   - Claude API integration
   - Progress tracking
   - Error handling & logging

3. **docs/STEP6B_IMPLEMENTATION.md** (this file)
   - Complete specification
   - API reference
   - Execution guide

### Modified Files

None. Step 6b is implemented as new services alongside existing Step 6a.

---

## Testing Guide

### Unit Tests

```typescript
// Test email validation
assert(isValidEmail('michael@example.com') === true);
assert(isValidEmail('invalid-email') === false);

// Test access token generation
const token = generateAccessToken();
assert(token.length === 64);
assert(/^[a-f0-9]{64}$/i.test(token));

// Test rate limiter
assert(checkRateLimit('session-1', 5) === true); // First
assert(checkRateLimit('session-1', 5) === true); // Second
assert(checkRateLimit('session-1', 5) === true); // Third
assert(checkRateLimit('session-1', 5) === true); // Fourth
assert(checkRateLimit('session-1', 5) === true); // Fifth
assert(checkRateLimit('session-1', 5) === false); // Sixth (rate limited)
```

### Integration Tests

```typescript
// Test full step 4 submission flow
const sessionToken = await createSession();
await submitStep1(sessionToken, step1Data);
await submitStep2(sessionToken, step2Data);
await submitStep3(sessionToken, macroData);
await submitStep4(sessionToken, healthData); // Should succeed

// Test payment verification flow
const paymentIntentId = await initiatePayment(sessionToken);
const verifyResponse = await verifyPayment(sessionToken, paymentIntentId);
assert(verifyResponse.is_premium === true);
assert(verifyResponse.access_token.length === 64);

// Test progress tracking
let progress = await getReportStatus(accessToken);
assert(progress.status === 'queued');
// ... wait for generation
progress = await getReportStatus(accessToken);
assert(progress.status === 'completed');
assert(progress.progress === 100);
```

### E2E Tests

1. Create session
2. Complete Steps 1-3
3. Initiate payment
4. Verify payment (simulated Stripe success)
5. Submit Step 4 (health profile)
6. Poll progress endpoint (verify 5 stages)
7. Wait for report generation (async job)
8. Access generated report
9. Verify HTML + metadata in response

---

## Performance Optimization

### Caching Strategy

```
Tier configurations: Cached 1 hour
Payment tiers: Cached at startup
Claude API responses: Not cached (unique per user)
Report HTML: Stored in DB (no cache)
```

### Database Optimization

```sql
-- Indexes for frequent queries
CREATE INDEX idx_calculator_reports_session_id ON calculator_reports(session_id);
CREATE INDEX idx_calculator_reports_access_token ON calculator_reports(access_token);
CREATE INDEX idx_calculator_reports_is_generated ON calculator_reports(is_generated, expires_at);
CREATE INDEX idx_calculator_report_access_log_report_id ON calculator_report_access_log(report_id, accessed_at DESC);

-- Partition access logs by month
ALTER TABLE calculator_report_access_log PARTITION BY RANGE (YEAR_MONTH(accessed_at));
```

---

## Troubleshooting

### Report Stuck in "Generating"

**Symptoms**: Progress never reaches 100%

**Causes**:
- Claude API timeout
- Database connection failure
- Cron job not running

**Resolution**:
1. Check logs: `SELECT * FROM claude_api_logs WHERE status='error'`
2. Verify cron job is scheduled
3. Test Claude API connectivity
4. Retry report manually: `processReportQueue(env, 1)`

### Payment Verification Fails

**Symptoms**: User stuck after payment

**Causes**:
- Stripe API unavailable
- Payment intent ID mismatch
- Session expired

**Resolution**:
1. Check Stripe status page
2. Verify payment_intent_id in session
3. If expired: Initiate payment again

### High API Latency

**Symptoms**: Response times >500ms

**Causes**:
- Database overload
- Stripe API slow
- Network issues

**Resolution**:
1. Check database connection pool
2. Monitor Stripe API status
3. Review rate limiting (may be blocking requests)
4. Scale Cloudflare workers (add more instances)

---

## Cost Analysis

### Claude API Costs (Jan 2026 pricing)

```
Input tokens: $3 per million
Output tokens: $15 per million

Typical report:
  ~500 input tokens ($0.0015)
  ~2000 output tokens ($0.03)
  Total: ~$0.032 per report

At scale:
  1,000 reports/month: $32
  10,000 reports/month: $320
  100,000 reports/month: $3,200
```

### Database Costs

```
Storage per report: ~50KB (HTML) + 20KB (metadata) = ~70KB
Queries per report: ~10 (avg)

At scale:
  10,000 reports/month: ~700MB storage
  Database transactions: Minimal (ACID operations)
  Query cost: Negligible
```

### Total Operating Cost

```
Per report: $0.032 (Claude) + $0.001 (DB) = ~$0.033
1,000 reports/month: ~$33/month
10,000 reports/month: ~$330/month
```

---

## References

- PostgreSQL ACID Documentation: https://www.postgresql.org/docs/current/
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Claude API: https://docs.anthropic.com/en/api/
- Stripe Payment Intents: https://stripe.com/docs/payments/payment-intents

---

**Status:** Implementation Complete & Ready for Testing

"A database is a promise you make to the future. Don't break it."
— Leo, Database Architect

