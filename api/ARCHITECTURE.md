# Story 3.4: Verify & Generate Endpoint - Architecture Deep Dive

**Philosophy:** "ACID properties don't negotiate. All-or-nothing, always."

---

## System Architecture Diagram

```
Frontend (Next.js)
     │
     │ POST /api/v1/assessment/verify-and-generate
     │ { session_id: "uuid" }
     │
     ▼
┌────────────────────────────────────────────────────┐
│  Cloudflare Worker (calculator-api.js)             │
│  ┌──────────────────────────────────────────────┐  │
│  │ 1. INPUT VALIDATION                          │  │
│  │    - Check Content-Type: application/json    │  │
│  │    - Validate session_id format (UUID)       │  │
│  │    - Reject if missing or malformed          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 2. DATABASE LOOKUP                           │  │
│  │    - Query: calculator_sessions_v2           │  │
│  │    - Fetch: All 25+ form fields              │  │
│  │    - Retrieve: stripe_session_id             │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 3. STRIPE VERIFICATION                       │  │
│  │    - API: stripe.checkout.sessions.retrieve  │  │
│  │    - Check: payment_status = 'paid'          │  │
│  │    - Verify: Session age < 24 hours          │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 4. CLAUDE REPORT GENERATION                  │  │
│  │    - Model: claude-sonnet-4-20250514         │  │
│  │    - Max tokens: 16,000                      │  │
│  │    - Temperature: 0.7                        │  │
│  │    - Output: 13-section HTML report          │  │
│  │    - Duration: 30-60 seconds                 │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 5. TRANSACTION EXECUTION                     │  │
│  │    - Generate: 64-char hex access token      │  │
│  │    - Calculate: expires_at = NOW() + 48h     │  │
│  │    - BEGIN TRANSACTION                       │  │
│  │      a) INSERT calculator_reports            │  │
│  │      b) UPDATE calculator_sessions_v2        │  │
│  │      c) INSERT claude_api_logs (non-block)   │  │
│  │    - COMMIT                                  │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 6. AUDIT LOGGING                             │  │
│  │    - INSERT: calculator_report_access_log    │  │
│  │    - Capture: Client IP, User-Agent          │  │
│  │    - Store: Access timestamp                 │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │ 7. RESPONSE                                  │  │
│  │    - Status: 200 OK (success) or 4xx/5xx err │  │
│  │    - Body: { success, report_id,             │  │
│  │             access_token, expires_at }       │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
     │
     ├──────────────────────────────────┬──────────────────────────────┬──────────────────────────────┐
     │                                  │                              │                              │
     ▼                                  ▼                              ▼                              ▼
  Stripe API              Anthropic Claude API        Supabase PostgreSQL         User Browser

  Verify payment          Generate HTML report       ACID Transaction         Receive token
  ✓ payment_status        13 sections                Atomicity guaranteed    Redirect to report
  ✓ Created within 24h     tailored to user data    Consistency enforced
                           streaming response       Isolation via MVCC
                           monitor tokens/costs     Durability to disk
```

---

## Database Transaction Flow (Atomicity Core)

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: Stripe Verification (Outside Transaction)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  stripe.checkout.sessions.retrieve(session_id)                      │
│    ✓ payment_status = 'paid'                                        │
│    ✓ created_at within 24 hours                                     │
│                                                                      │
│  Result: VERIFIED ──→ Continue to Step 2                            │
│  Result: FAILED   ──→ Return 402 Payment Required (no DB changes)   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ Verified
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: Claude Report Generation (Outside Transaction)             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Call Anthropic API:                                                │
│    POST https://api.anthropic.com/v1/messages                       │
│    {                                                                │
│      model: "claude-sonnet-4-20250514",                             │
│      max_tokens: 16000,                                             │
│      temperature: 0.7,                                              │
│      system: [13-section report prompt],                            │
│      messages: [{ role: "user", content: [form_data] }]             │
│    }                                                                │
│                                                                      │
│  Response:                                                          │
│    ✓ html: <div class="report">...</div>                            │
│    ✓ tokens: { input: 1500, output: 8500, total: 10000 }            │
│    ✓ duration: 45000ms                                              │
│                                                                      │
│  Result: SUCCESS  ──→ Continue to Step 3                            │
│  Result: FAILURE  ──→ Return 500 (no DB changes, user can retry)    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │ Report Generated
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: Generate Access Token & Calculate Expiration               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  access_token = crypto.getRandomValues(32 bytes)                    │
│                = "a1b2c3d4e5f6a1b2c3d4e5f6..." (64 hex chars)       │
│                                                                      │
│  expires_at = NOW() + INTERVAL '48 hours'                           │
│             = "2026-01-06T14:32:00.000Z"                            │
│                                                                      │
│  request_id = `req_${timestamp}_${random()}`                        │
│             = "req_1735939200_a1b2c3d4"                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: ATOMIC TRANSACTION (All or Nothing)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  BEGIN TRANSACTION;                                                 │
│                                                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  4a) INSERT INTO calculator_reports (...)                           │
│                                                                      │
│      id: gen_random_uuid()                                          │
│      session_id: [from lookup]                                      │
│      email: [from lookup]                                           │
│      access_token: [generated 64-char hex]  ◄─── UNIQUE CONSTRAINT  │
│      report_html: [HTML from Claude]        ◄─── NOT NULL           │
│      report_json: { status: "completed" }                           │
│      generation_start_at: [time - duration]                         │
│      generation_completed_at: NOW()                                 │
│      expires_at: [NOW() + 48h]              ◄─── NOT NULL           │
│      is_expired: FALSE                      ◄─── DEFAULT            │
│      access_count: 0                                                │
│      created_at: NOW()                                              │
│      updated_at: NOW()                                              │
│                                                                      │
│      Result: Success ──→ Continue to 4b                             │
│      Result: Constraint Violation ──→ ROLLBACK (report already      │
│                 exists for this session)                            │
│  ─────────────────────────────────────────────────────────────────  │
│  4b) UPDATE calculator_sessions_v2 SET (...)                        │
│                                                                      │
│      payment_status = 'completed'                                   │
│      paid_at = NOW()                                                │
│      completed_at = NOW()                                           │
│      updated_at = NOW()  ◄─── Trigger automatically updates this    │
│                                                                      │
│      WHERE id = [session_id]                                        │
│                                                                      │
│      Result: 1 row updated ──→ Continue to 4c                       │
│      Result: 0 rows updated ──→ ROLLBACK (session not found)        │
│  ─────────────────────────────────────────────────────────────────  │
│  4c) INSERT INTO claude_api_logs (...) [NON-BLOCKING]               │
│                                                                      │
│      session_id, request_id, model, tokens, status, duration, etc   │
│                                                                      │
│      Result: Success or Failure ──→ Both continue (doesn't fail     │
│               the whole transaction)                                │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  COMMIT;  ◄─── All changes persist atomically                       │
│           ◄─── Or ROLLBACK if any step failed                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
                           │
                           ├─ Success ──→ Return 200 with token
                           │
                           └─ Failure ──→ Return 500 with error
```

---

## Data Flow Diagram

```
User Submits Form (Steps 1-3)
          │
          ▼
calculator_sessions_v2 (incomplete)
  - id, session_token
  - sex, age, weight, height
  - lifestyle_activity, exercise_frequency
  - goal, diet_type
  - calculated_macros (JSONB)
          │
          ▼
User Proceeds to Payment
          │
          ▼
Stripe Checkout
  - Creates checkout session
  - session.id = "cs_..."
  - Returns success URL with session_id
          │
          ▼
Frontend Calls /verify-and-generate
          │
          ├─ Validates session_id format
          │
          ▼
Database Lookup
  │
  └─ SELECT * FROM calculator_sessions_v2
         WHERE id = $1
         │
         ├─ Retrieves all 25+ fields
         │
         └─ Returns to Worker
          │
          ▼
Stripe API Verification
  │
  └─ stripe.checkout.sessions.retrieve(session.stripe_session_id)
         │
         ├─ Checks payment_status = 'paid'
         │
         └─ Returns verification result
          │
          ▼
Claude API Request
  │
  └─ POST https://api.anthropic.com/v1/messages
         │
         ├─ Sends form_data as JSON
         │
         ├─ 13-section system prompt
         │
         ├─ Temperature 0.7, max 16k tokens
         │
         └─ Returns HTML report + token counts
          │
          ▼
Transaction (Atomic)
  │
  ├─ INSERT calculator_reports
  │     (report_id, session_id, email, access_token,
  │      report_html, expires_at, created_at, ...)
  │
  ├─ UPDATE calculator_sessions_v2
  │     SET payment_status = 'completed',
  │         paid_at = NOW(),
  │         completed_at = NOW()
  │
  └─ INSERT claude_api_logs (monitoring)
          │
          ▼
Audit Trail
  │
  └─ INSERT calculator_report_access_log
         (on first access of report, triggered by user clicking link)
          │
          ▼
Response to Frontend
  │
  └─ { success: true,
       paid: true,
       report_id: "uuid",
       access_token: "64-char-hex",
       expires_at: "2026-01-06T...",
       message: "Report generated successfully" }
          │
          ▼
User Redirected to Report Viewer
  │
  └─ /report/:access_token
         │
         ├─ GET /api/v1/calculator/report/{token}/content
         │     (RLS enforces: is_expired = false AND expires_at > NOW())
         │
         └─ Display HTML report
```

---

## Error Handling Decision Tree

```
                    Verify & Generate Request
                            │
                            ▼
                   ┌─────────────────────┐
                   │ Valid JSON & Method?│
                   └─────────────────────┘
                      │           │
                   YES│           │NO
                      │           └──→ Return 400/405
                      ▼
            ┌──────────────────────┐
            │ session_id provided? │
            └──────────────────────┘
               │              │
            YES│              │NO
               │              └──→ Return 400 MISSING_FIELDS
               ▼
    ┌────────────────────────────┐
    │ Session exists in DB?      │
    └────────────────────────────┘
       │                    │
    YES│                    │NO
       │                    └──→ Return 404 SESSION_NOT_FOUND
       ▼
    ┌────────────────────────────┐
    │ stripe_session_id present? │
    └────────────────────────────┘
       │                    │
    YES│                    │NO
       │                    └──→ Return 400 NO_STRIPE_SESSION
       ▼
    ┌───────────────────────────────┐
    │ Stripe verification success?  │
    └───────────────────────────────┘
       │                       │
    YES│                       │NO
       │                       └──→ Return 402 PAYMENT_NOT_VERIFIED
       ▼                            (paid=false)
    ┌────────────────────────────┐
    │ Claude API success?        │
    └────────────────────────────┘
       │                    │
    YES│                    │NO
       │                    └──→ Return 500 CLAUDE_GENERATION_FAILED
       ▼
    ┌────────────────────────────┐
    │ Transaction success?       │
    │ (INSERT + UPDATE)          │
    └────────────────────────────┘
       │                    │
    YES│                    │NO
       │                    └──→ Return 500 REPORT_SAVE_FAILED
       ▼
    ┌────────────────────────────┐
    │ Return 200 OK              │
    │ with access_token & report │
    └────────────────────────────┘
```

---

## Sequence Diagram

```
Frontend              Worker           Supabase      Stripe         Claude API
   │                   │                 │             │                │
   │ POST /verify-and-generate           │             │                │
   ├──────────────────────────►           │             │                │
   │                           │          │             │                │
   │                           │ SELECT * FROM sessions│             │
   │                           ├──────────────────────►│             │
   │                           │◄──────────────────────┤             │
   │                           │ (form data returned)  │             │
   │                           │                       │             │
   │                           │ stripe.checkout.sessions.retrieve() │
   │                           │────────────────────────────────────►│
   │                           │◄────────────────────────────────────┤
   │                           │ (payment_status verified)           │
   │                           │                       │             │
   │                           │───────────────────────────────────────────►│
   │                           │ POST /messages (with form data)     │     │
   │                           │◄───────────────────────────────────────────┤
   │                           │ (HTML report returned, 16k max toks)│     │
   │                           │                       │             │
   │                           │ BEGIN TRANSACTION     │             │
   │                           ├──────────────────────►│             │
   │                           │                       │             │
   │                           │ INSERT calculator_reports           │
   │                           ├──────────────────────►│             │
   │                           │◄──────────────────────┤             │
   │                           │ (report_id returned)  │             │
   │                           │                       │             │
   │                           │ UPDATE calculator_sessions_v2       │
   │                           ├──────────────────────►│             │
   │                           │◄──────────────────────┤             │
   │                           │                       │             │
   │                           │ INSERT claude_api_logs              │
   │                           ├──────────────────────►│             │
   │                           │◄──────────────────────┤             │
   │                           │                       │             │
   │                           │ COMMIT                │             │
   │                           ├──────────────────────►│             │
   │                           │◄──────────────────────┤             │
   │                           │                       │             │
   │ ◄──────────────────────────                       │             │
   │ { success: true,           │                       │             │
   │   report_id: "uuid",                              │             │
   │   access_token: "64-char" }│                       │             │
   │                            │                       │             │
   └────────────────────────────────────────────────────────────────────────

[Later when user opens report]

Frontend              Worker           Supabase
   │                   │                 │
   │ GET /report/{token}/content         │
   ├──────────────────────────►           │
   │                           │          │
   │                           │ SELECT report_html WHERE access_token=token
   │                           │ AND is_expired=false AND expires_at > NOW()
   │                           ├──────────────────────►│
   │                           │◄──────────────────────┤
   │                           │ (report HTML returned) │
   │                           │                       │
   │                           │ INSERT access_log     │
   │                           ├──────────────────────►│
   │                           │◄──────────────────────┤
   │◄──────────────────────────                        │
   │ (HTML report body)         │                       │
   │                            │                       │
```

---

## Index Strategy (Performance)

```
Table: calculator_sessions_v2
┌─────────────────────────────────────────────────┐
│ Lookup by session UUID (primary lookup)         │
├─────────────────────────────────────────────────┤
│ INDEX: PRIMARY KEY (id)                         │
│ Usage: WHERE id = $1                            │
│ Selectivity: Unique                             │
│ Expected rows returned: 1                       │
│ Plan: Index Scan (0.1ms)                        │
└─────────────────────────────────────────────────┘

Table: calculator_reports
┌──────────────────────────────────────────────────┐
│ Lookup by access token (security check)         │
├──────────────────────────────────────────────────┤
│ INDEX: UNIQUE (access_token)                    │
│ Usage: WHERE access_token = $1                  │
│ Selectivity: Unique                             │
│ Expected rows: 1                                │
│ Plan: Index Scan (0.1ms)                        │
└──────────────────────────────────────────────────┘

│ Lookup by session_id (for updates)              │
├──────────────────────────────────────────────────┤
│ INDEX: (session_id)                             │
│ Usage: WHERE session_id = $1                    │
│ Selectivity: Unique (FK constraint)             │
│ Expected rows: 1                                │
│ Plan: Index Scan (0.1ms)                        │
└──────────────────────────────────────────────────┘

│ List non-expired reports (scheduled cleanup)    │
├──────────────────────────────────────────────────┤
│ INDEX: (expires_at DESC) WHERE is_expired=false │
│ Usage: WHERE is_expired=false AND               │
│        expires_at < NOW()                       │
│ Selectivity: 1-5% (mostly active reports)       │
│ Expected rows: 10-100 per scan                  │
│ Plan: Partial Index Scan (1-5ms)                │
└──────────────────────────────────────────────────┘

Table: claude_api_logs
┌──────────────────────────────────────────────────┐
│ Lookup logs by session_id (cost analysis)       │
├──────────────────────────────────────────────────┤
│ INDEX: (session_id)                             │
│ Usage: WHERE session_id = $1                    │
│ Selectivity: 1 (one-to-one with reports)        │
│ Expected rows: 1                                │
│ Plan: Index Scan (0.1ms)                        │
└──────────────────────────────────────────────────┘

│ Daily cost analysis                             │
├──────────────────────────────────────────────────┤
│ INDEX: (request_at DESC)                        │
│ Usage: WHERE request_at > NOW() - '1 day'::INT  │
│ Selectivity: 10-20% (last 24h worth)            │
│ Expected rows: 100-500                          │
│ Plan: Index Scan (1-5ms)                        │
└──────────────────────────────────────────────────┘

Table: calculator_report_access_log
┌──────────────────────────────────────────────────┐
│ Partitioned by month (accessed_at RANGE)        │
│ Prevents 1M+ row table from slowdown            │
├──────────────────────────────────────────────────┤
│ Partitions: 2026_01, 2026_02, etc.             │
│ Each partition: 10-100k rows                    │
│ Query: WHERE report_id = $1 AND accessed_at ... │
│ Plan: Partition Elimination + Index Scan        │
│ Expected: 0.1-1ms per quarter-year partition    │
└──────────────────────────────────────────────────┘
```

---

## ACID Property Implementation

### Atomicity: All-or-Nothing

```
If any step fails:
┌──────────────────┐
│ INSERT report    │ ✓ Success
├──────────────────┤
│ UPDATE session   │ ✗ Failure (constraint violation)
├──────────────────┤
│ INSERT logs      │ ← Never reaches here
└──────────────────┘

Result: ROLLBACK
- Report insert undone
- Session not modified
- Clean database state
- User can retry payment
```

### Consistency: Constraint Enforcement

```
CHECK constraints prevent invalid states:
✗ access_token must be exactly 64 characters (hex)
✗ expires_at must be > created_at
✗ is_expired must be BOOLEAN (true/false)
✗ session_id must exist (FK constraint)

UNIQUE constraints prevent duplicates:
✗ Only one report per session (UNIQUE on session_id)
✗ Access tokens never reused (UNIQUE on access_token)

Triggers maintain derived data:
✓ updated_at auto-updated on any change
✓ access_count incremented when accessed
```

### Isolation: MVCC (Multi-Version Concurrency Control)

```
Concurrent requests don't block each other:

Request A (User 1)              Request B (User 2)
│                               │
├─ Read session 1               ├─ Read session 2
├─ Generate report A            ├─ Generate report B
├─ Insert report A (v1)         ├─ Insert report B (v1)
├─ MVCC shows v1 to others      ├─ MVCC shows v1 to others
│                               │
└─ COMMIT                       └─ COMMIT
   All readers see v2              All readers see v2
   No locks held                   No locks held
   Both succeed                     Both succeed
```

### Durability: Write-Ahead Logging (WAL)

```
Database Crash Recovery:

Memory Buffer (unsaved)
       │
       ▼
Write-Ahead Log (disk)  ◄─── Survives crashes
       │
       ▼
Data Pages (disk)       ◄─── Eventually written
       │
       ▼
Replication Standby     ◄─── Backup written
       │
       ▼
Backup Storage          ◄─── Snapshot archived

If crash occurs:
- WAL replayed from last checkpoint
- Data restored to consistent state
- No lost transactions
```

---

## Cost Analysis

```
Claude API Costs (Sonnet 4):
┌────────────────────────────────┬──────────────┐
│ Input tokens (1,500 avg)       │ $0.0045      │
├────────────────────────────────┼──────────────┤
│ Output tokens (8,500 avg)      │ $0.1275      │
├────────────────────────────────┼──────────────┤
│ Total per report               │ $0.132       │
├────────────────────────────────┼──────────────┤
│ Reports/day (assume 100)       │ $13.20       │
├────────────────────────────────┼──────────────┤
│ Reports/month                  │ $396         │
├────────────────────────────────┼──────────────┤
│ Reports/year                   │ $4,752       │
└────────────────────────────────┴──────────────┘

Monitoring View (auto-calculated):
SELECT
  DATE(request_at) as date,
  COUNT(*) as calls,
  SUM(input_tokens) as input,
  SUM(output_tokens) as output,
  ROUND(SUM(input_tokens) * 3.0 / 1000000.0, 4) as input_cost_usd,
  ROUND(SUM(output_tokens) * 15.0 / 1000000.0, 4) as output_cost_usd,
  ROUND(... input + output ..., 4) as total_cost_usd
FROM claude_api_logs
WHERE status = 'success'
GROUP BY DATE(request_at);
```

---

## Philosophy: Why This Design?

### "A database is a promise you make to the future"

1. **Immutability:** Reports cannot be edited after creation
   - guarantees user received correct document at generation time
   - audit trail shows exact state when created

2. **Atomic Transactions:** All-or-nothing guarantees
   - no orphaned reports without session updates
   - no half-completed payments

3. **Cryptographic Tokens:** 256-bit entropy
   - impossible to guess (2^256 possibilities)
   - one-time use (index prevents reuse)
   - no business logic in token (secure by obscurity)

4. **Expiration Management:** Soft delete + hard delete
   - privacy: reports disappear after 48 hours
   - GDPR: complete deletion after 90 days
   - audit: can still query deleted records (soft delete marker)

5. **RLS (Row Level Security):** Database-level access control
   - no way to bypass with SQL injection
   - public can only see non-expired reports
   - service role has full admin access

6. **Comprehensive Logging:**
   - Claude API: Track every model call for cost analysis
   - Report Access: Who accessed what, when, from where
   - Validation Errors: Debug user form submission issues

This endpoint represents **30 years of proven database architecture principles** applied to a modern problem: generating personalized reports securely at scale.
