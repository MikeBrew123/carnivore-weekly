# Calculator Build - Dependencies & Integration Map

**Created:** 2026-01-03
**Purpose:** Visual mapping of file dependencies, data flow, and system integration points
**Audience:** Developers, DevOps, architects

---

## Dependency Graph Overview

```
External Systems
    ↓
┌────────────────────────────────────────┐
│  Frontend (Browser)                    │
│  ├─ calculator-form-rebuild.html       │
│  ├─ validation.js                      │
│  └─ submit-handler.js                  │
└────────────────────────────────────────┘
    ↓ HTTP REST API
┌────────────────────────────────────────┐
│  Backend (Cloudflare Worker)           │
│  └─ calculator-api.js                  │
│     ├─ Supabase SDK                    │
│     ├─ Stripe API Client               │
│     └─ Queue Processor                 │
└────────────────────────────────────────┘
    ↓ SQL
┌────────────────────────────────────────┐
│  Database (Supabase/PostgreSQL)        │
│  ├─ Migrations                         │
│  ├─ Tables (6)                         │
│  ├─ RLS Policies                       │
│  └─ Triggers                           │
└────────────────────────────────────────┘
    ↓ Async Job
┌────────────────────────────────────────┐
│  Report Generator                      │
│  └─ generate-report.js                 │
│     └─ Claude API                      │
└────────────────────────────────────────┘
```

---

## File-Level Dependencies

### Frontend Dependencies

#### calculator-form-rebuild.html
**Depends On:**
- validation.js (for form validation)
- submit-handler.js (for form submission)
- style.css (for styling)
- Stripe.js (external CDN)
- Google Fonts API (for typefaces)

**Used By:**
- Web browser (user interface)
- Test suites

**External APIs Called:**
- None (loads external scripts)

**Data Flow:**
1. User enters data in form
2. Validation.js validates in real-time
3. Submit-handler.js collects form data
4. POST request sent to calculator-api.js

---

#### validation.js
**Depends On:**
- None (vanilla JavaScript, no dependencies)

**Used By:**
- calculator-form-rebuild.html (imported as module)
- submit-handler.js (reuses validation functions)

**Exports:**
- validateEmail()
- validateStep4()
- isFieldValid()
- collectFieldErrors()
- All ENUM definitions
- All MAX_LENGTH constants

**External APIs Called:**
- None

**Data Flow:**
1. HTML form loads
2. Validation.js provides validation functions
3. Real-time validation on user input
4. Error messages displayed to user
5. Submit blocked if validation fails

---

#### submit-handler.js
**Depends On:**
- validation.js (field validation)
- calculator-form-rebuild.html (DOM elements)
- Stripe.js (payment processing)
- Fetch API (HTTP requests)

**Used By:**
- calculator-form-rebuild.html (initialization)
- User click events

**Exports:**
- collectFormData()
- handleSubmitClick()
- handlePaymentRedirect()

**External APIs Called:**
- POST /api/v1/calculator/step/{1-4}
- POST /api/v1/calculator/payment/initiate
- POST /api/v1/calculator/payment/verify
- Stripe API (via Stripe.js)

**Data Flow:**
1. User clicks submit button
2. collectFormData() gathers form values
3. validation.js validates all fields
4. If valid: POST to calculator-api.js
5. If payment: redirect to Stripe checkout
6. On success: verify payment, unlock Step 4

---

### Backend Dependencies

#### calculator-api.js
**Depends On:**
- wrangler.toml (environment variables)
- Supabase JavaScript SDK
- Stripe JavaScript SDK
- Node.js built-ins (crypto, fetch)

**Used By:**
- Frontend (HTTP REST)
- Webhook handlers
- Test suites

**Imports:**
```javascript
// Environment variables (from wrangler.toml)
const SUPABASE_URL = env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY
const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY
const CLAUDE_API_KEY = env.CLAUDE_API_KEY

// SDKs
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'
```

**Provides Endpoints:**
1. POST /api/v1/calculator/session
2. POST /api/v1/calculator/step/1
3. POST /api/v1/calculator/step/2
4. POST /api/v1/calculator/step/3
5. POST /api/v1/calculator/step/4
6. GET /api/v1/calculator/payment/tiers
7. POST /api/v1/calculator/payment/initiate
8. POST /api/v1/calculator/payment/verify
9. GET /api/v1/calculator/report/{token}

**Database Calls:**
```javascript
// Session creation
supabase.from('calculator_sessions_v2').insert(...)

// Session retrieval
supabase.from('calculator_sessions_v2')
  .select('*')
  .eq('session_token', token)

// Session updates
supabase.from('calculator_sessions_v2')
  .update({...})
  .eq('session_token', token)

// Payment tiers
supabase.from('payment_tiers')
  .select('*')
  .eq('is_active', true)

// Report retrieval
supabase.from('calculator_reports')
  .select('*')
  .eq('access_token', token)
```

**Stripe Calls:**
```javascript
// Create checkout session
stripe.checkout.sessions.create({...})

// Retrieve session
stripe.checkout.sessions.retrieve(sessionId)

// Retrieve payment intent
stripe.paymentIntents.retrieve(intentId)
```

**Side Effects:**
- Inserts into calculator_sessions_v2
- Inserts into calculator_reports
- Inserts into validation_errors
- Inserts into calculator_report_access_log
- Queues report generation job

---

#### generate-report.js
**Depends On:**
- calculator-api.js (called from payment verify)
- Supabase JavaScript SDK
- Claude API
- Node.js built-ins (crypto, fetch)

**Used By:**
- Background job queue (Cron or Webhook)
- Payment verification flow

**Triggered By:**
- POST /api/v1/calculator/payment/verify (queues job)
- Cron trigger (every 5 minutes)
- Stripe webhook (payment.intent.succeeded)

**Database Calls:**
```javascript
// Fetch session data
supabase.from('calculator_sessions_v2')
  .select('*')
  .eq('session_id', sessionId)

// Update report
supabase.from('calculator_reports')
  .update({
    report_html: ...,
    report_markdown: ...,
    generation_completed_at: ...
  })
  .eq('id', reportId)

// Log API usage
supabase.from('claude_api_logs').insert({...})
```

**Claude API Calls:**
```javascript
// Call Claude API
fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'x-api-key': CLAUDE_API_KEY,
    'anthropic-version': '2023-06-01'
  },
  body: JSON.stringify({
    model: 'claude-opus-4-5-20251101',
    max_tokens: 4000,
    system: systemPrompt,
    messages: [{role: 'user', content: userPrompt}]
  })
})
```

**Data Flow:**
1. Payment verified (payment_status = 'completed')
2. Job queued with session_id
3. Job worker fetches full session data
4. Builds Claude prompt from user profile
5. Calls Claude API
6. Converts markdown to HTML
7. Extracts JSON metadata
8. Updates calculator_reports record
9. Logs API usage (tokens, cost)

---

### Database Dependencies

#### 015_calculator_comprehensive_schema.sql
**Depends On:**
- Supabase PostgreSQL environment
- Proper Supabase project setup

**Creates:**
1. **payment_tiers** table
   - Columns: id, tier_slug, tier_title, price_cents, features (JSONB), is_active, display_order
   - Indexes: tier_slug (UNIQUE), is_active
   - Dependencies: None (reference data)

2. **calculator_sessions_v2** table
   - Columns: session_id (PK), session_token (UNIQUE), 39 data columns, timestamps
   - Indexes: session_token, email, payment_status, created_at, stripe_payment_intent_id
   - Constraints: step_completed 1-4, premium requires payment
   - Triggers: auto-update updated_at
   - Dependencies: None initially

3. **calculator_reports** table
   - Columns: id (PK), session_id (FK), access_token (UNIQUE), report_*, timestamps
   - Indexes: session_id, access_token, is_expired
   - Dependencies: calculator_sessions_v2 (FK)
   - Triggers: auto-increment access_count, update last_accessed_at

4. **calculator_report_access_log** table
   - Columns: report_id (FK), accessed_at, ip_address, user_agent, referer_url, success, error_message
   - Partitions: Monthly (2026_01, 2026_02, etc.)
   - Indexes: report_id, accessed_at DESC
   - Dependencies: calculator_reports (FK)

5. **claude_api_logs** table
   - Columns: session_id (FK), request_id (UNIQUE), model, tokens, duration, status, error
   - Indexes: session_id, status, request_at DESC
   - Dependencies: calculator_sessions_v2 (FK)

6. **validation_errors** table
   - Columns: session_id (FK), field_name, error_code, error_message, submitted_value, step_number, is_blocking, resolved_at
   - Indexes: session_id, created_at
   - Dependencies: calculator_sessions_v2 (FK)

**RLS Policies:**
- payment_tiers: Public SELECT (active only)
- calculator_sessions_v2: Service role only (no public access)
- calculator_reports: Public SELECT (non-expired only, token-based)
- Other tables: Service role only

**Used By:**
- calculator-api.js (all operations)
- generate-report.js (read/write)
- Test suites (write during testing)

---

#### SUPABASE_MIGRATION_COMBINED.sql
**Depends On:**
- Same as 015_calculator_comprehensive_schema.sql

**Purpose:**
- Combined migration for simplified setup
- Can be run in Supabase SQL editor
- Contains all 6 table definitions

---

### Configuration Dependencies

#### wrangler.toml
**Depends On:**
- Cloudflare account setup
- Environment variables configured

**Used By:**
- Cloudflare Workers deployment
- calculator-api.js (reads environment variables)
- generate-report.js (reads environment variables)

**Environment Variables Required:**
```toml
SUPABASE_URL=https://[project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
CLAUDE_API_KEY=sk-ant-...
FRONTEND_URL=https://example.com
API_BASE_URL=https://api.example.com
```

**Deployment:**
```bash
wrangler deploy --name calculator-api --env production
```

---

## Data Flow & Integration Points

### Complete User Journey

```
1. USER ARRIVES AT FORM
   └─ Browser loads: calculator-form-rebuild.html
      ├─ Loads: validation.js
      ├─ Loads: submit-handler.js
      ├─ Loads: Stripe.js

2. STEP 1: PHYSICAL STATS
   ├─ User enters data
   ├─ validation.js validates in real-time
   ├─ User clicks submit
   ├─ submit-handler.js validates all fields
   ├─ POST /api/v1/calculator/step/1
   │  └─ calculator-api.js
   │     ├─ Validates data
   │     ├─ INSERT into calculator_sessions_v2
   │     └─ Returns step_completed=1
   └─ Form advances to Step 2

3. STEP 2: FITNESS & DIET
   ├─ Similar flow to Step 1
   ├─ POST /api/v1/calculator/step/2
   │  └─ UPDATE calculator_sessions_v2
   └─ Form advances to Step 3

4. STEP 3: MACRO CALCULATION
   ├─ Frontend calculates macros
   ├─ Displays calculated results
   ├─ Shows pricing tiers
   │  └─ GET /api/v1/calculator/payment/tiers
   │     └─ Reads: payment_tiers table
   └─ User selects tier

5. PAYMENT FLOW
   ├─ User clicks "Upgrade"
   ├─ POST /api/v1/calculator/payment/initiate
   │  ├─ calculator-api.js
   │  ├─ Calls Stripe API
   │  ├─ Creates checkout session
   │  ├─ UPDATE calculator_sessions_v2
   │  │  └─ tier_id, stripe_session_id, payment_status=pending
   │  └─ Returns stripe_session_url
   ├─ Frontend redirects to Stripe
   ├─ User enters payment details
   ├─ Stripe processes payment
   ├─ Stripe redirects to success_url
   └─ Frontend receives stripe_session_id

6. PAYMENT VERIFICATION
   ├─ POST /api/v1/calculator/payment/verify
   │  ├─ calculator-api.js
   │  ├─ Calls Stripe API
   │  ├─ Verifies payment succeeded
   │  ├─ UPDATE calculator_sessions_v2
   │  │  └─ is_premium=true, payment_status=completed, step_completed=4
   │  ├─ INSERT into calculator_reports
   │  │  └─ access_token, report_html (placeholder)
   │  ├─ Queue report generation
   │  │  └─ Adds job to queue
   │  └─ Returns access_token
   └─ Form advances to Step 4

7. STEP 4: HEALTH PROFILE
   ├─ User fills 25+ health fields
   ├─ validation.js validates all fields
   ├─ POST /api/v1/calculator/step/4
   │  ├─ calculator-api.js
   │  ├─ UPDATE calculator_sessions_v2
   │  │  └─ All health profile fields
   │  └─ Returns completion
   └─ "Your report is being generated..."

8. ASYNC REPORT GENERATION
   ├─ generate-report.js processes queue
   │  ├─ Fetches full session data
   │  ├─ Builds Claude prompt
   │  ├─ Calls Claude API
   │  │  └─ Input: User demographics, health, goals, lifestyle
   │  │     Output: Personalized report (markdown)
   │  ├─ Converts markdown to HTML
   │  ├─ Extracts JSON metadata
   │  ├─ UPDATE calculator_reports
   │  │  └─ report_html, report_markdown, report_json
   │  └─ INSERT into claude_api_logs
   │     └─ Logs: tokens, cost, duration
   └─ Report ready

9. REPORT ACCESS
   ├─ GET /api/v1/calculator/report/{access_token}
   │  ├─ calculator-api.js
   │  ├─ SELECT from calculator_reports
   │  │  └─ Where: access_token matches & not expired
   │  ├─ INSERT into calculator_report_access_log
   │  │  └─ Logs: IP, user agent, timestamp
   │  └─ Returns report_html + report_json
   └─ User reads personalized report
```

---

## External Service Dependencies

### Stripe Integration
**Service:** Stripe Payment Processing
**Endpoints Used:**
- `/v1/checkout/sessions` (POST) - Create checkout session
- `/v1/checkout/sessions/{id}` (GET) - Retrieve session details
- `/v1/payment_intents/{id}` (GET) - Verify payment

**Integration Point:** calculator-api.js
**Authentication:** STRIPE_SECRET_KEY (environment variable)
**Fallback:** None (payment essential, must succeed)

### Claude API Integration
**Service:** Anthropic Claude LLM
**Endpoint:** `https://api.anthropic.com/v1/messages`
**Model:** claude-opus-4-5-20251101
**Integration Point:** generate-report.js
**Authentication:** CLAUDE_API_KEY (environment variable)
**Fallback:** Report generation can retry with exponential backoff

### Supabase Integration
**Service:** PostgreSQL Database Hosting
**Connection:** JavaScript SDK
**Integration Points:**
- calculator-api.js (main API)
- generate-report.js (report generation)

**Authentication:**
- SUPABASE_URL (project URL)
- SUPABASE_SERVICE_ROLE_KEY (backend write access)
- SUPABASE_ANON_KEY (public read access)

### Cloudflare Workers
**Service:** Edge Computing Platform
**Integration:** Hosts calculator-api.js
**Deployment:** wrangler.toml + `wrangler deploy`
**Environment:** Production workers at edge

---

## Dependency Conflicts & Resolution

### No Direct Conflicts Found
- Frontend uses vanilla JS (no framework conflicts)
- Backend uses modern JavaScript/TypeScript (compatible)
- Database uses standard PostgreSQL (well-tested)
- External services (Stripe, Claude) have stable APIs

### Known Constraints
1. **Stripe Session Expiration:** 1 hour (need to complete payment)
2. **Claude API Rate Limits:** 100 requests/minute (handle gracefully)
3. **Supabase Connection Limits:** 10 concurrent connections
4. **Cloudflare Worker Timeout:** 30 seconds max execution

### Mitigation Strategies
1. **Idempotency Keys:** Prevent duplicate Stripe sessions
2. **Exponential Backoff:** Retry Claude API calls on rate limit
3. **Connection Pooling:** Reuse Supabase connections
4. **Async Jobs:** Offload long-running tasks (report generation)

---

## Version Compatibility

### Node.js / JavaScript Runtime
- **Minimum:** Node.js 16+
- **Recommended:** Node.js 18+
- **Tested On:** Node.js 18, 20

### Database
- **PostgreSQL:** 13+
- **Supabase:** Latest version
- **Tested On:** Supabase (latest)

### API Clients
- **Supabase JS SDK:** ^2.0.0
- **Stripe SDK:** ^13.0.0
- **Anthropic SDK:** Latest

### Browser Support
- **Modern Browsers:** Chrome, Firefox, Safari, Edge
- **Mobile:** iOS Safari, Android Chrome
- **Minimum:** ES6 support

---

## Deployment Dependency Order

1. **Create Supabase Project**
2. **Run Database Migration** (015_calculator_comprehensive_schema.sql)
3. **Seed payment_tiers** (4 rows)
4. **Configure Cloudflare Worker** (wrangler.toml)
5. **Deploy API** (calculator-api.js)
6. **Verify API Endpoints** (test all endpoints)
7. **Deploy Frontend** (HTML + JS files)
8. **Configure Report Generator** (generate-report.js queue)
9. **Test Payment Flow** (use test cards)
10. **Monitor Logs** (verify no errors)

---

## Testing Dependencies

### Unit Tests
- Depend on: validation.js functions
- No external service calls
- Fast execution (<1 second)

### Integration Tests
- Depend on: calculator-api.js + test Supabase project
- May call Stripe test API
- Require test environment variables

### E2E Tests
- Depend on: Everything (frontend + backend + database)
- Run full user journey
- Use test cards from PAYMENT_TESTING_GUIDE.md

---

## Maintenance Dependencies

### Database Maintenance
- Regular backups (Supabase handles)
- Partition cleanup (report_access_log monthly)
- Index health checks
- RLS policy audits

### API Maintenance
- Monitor error logs (validation_errors table)
- Track Stripe webhook failures
- Monitor Claude API costs
- Check Cloudflare Worker performance

### Frontend Maintenance
- Browser compatibility testing
- Mobile responsiveness testing
- Form validation edge cases
- Stripe.js updates

---

## Dependency Summary Table

| Component | Depends On | Used By | External Services |
|-----------|-----------|---------|-------------------|
| calculator-form-rebuild.html | validation.js, submit-handler.js, CSS | Browser | Stripe.js, Google Fonts |
| validation.js | None | HTML, submit-handler.js | None |
| submit-handler.js | validation.js, fetch API | HTML | calculator-api.js, Stripe |
| calculator-api.js | wrangler.toml, Supabase SDK | submit-handler.js | Supabase, Stripe, Claude |
| generate-report.js | calculator-api.js queue | Background job | Supabase, Claude API |
| wrangler.toml | None | Cloudflare deploy | Cloudflare |
| 015_calculator_comprehensive_schema.sql | Supabase | calculator-api.js | Supabase PostgreSQL |

---

**End of Dependencies Documentation**

**Created By:** Quinn, Record Keeper
**Date:** 2026-01-03
**Confidence:** Very High
