# Report Generation Implementation Checklist

**Author:** Leo (Database Architect)
**Audience:** Backend developers implementing Step 6 (submission logic)
**Status:** Complete specification checklist

---

## Pre-Implementation Verification

- [ ] Read `REPORT_GENERATION_SPEC.md` (complete understanding)
- [ ] Read `REPORT_FIELD_MAPPING.md` (form-to-report mapping)
- [ ] Review example report: `/Users/mbrew/Downloads/carnivore-protocol (1).html`
- [ ] Verify CALCULATOR_ARCHITECTURE.md covers payment flow
- [ ] Understand calculator_sessions_v2 schema (all 25+ fields)
- [ ] Understand calculator_reports schema (id, access_token, report_html, etc.)
- [ ] Understand payment_tiers schema (features JSONB)

---

## Database Schema Verification

### calculator_reports Table
- [ ] Table exists in Supabase
- [ ] All fields present:
  - id (UUID PK)
  - session_id (FK, UNIQUE)
  - email (VARCHAR 255)
  - access_token (VARCHAR 64, UNIQUE)
  - report_html (TEXT)
  - report_markdown (TEXT)
  - report_json (JSONB)
  - claude_request_id (VARCHAR 255)
  - generation_start_at (TIMESTAMP)
  - generation_completed_at (TIMESTAMP)
  - expires_at (TIMESTAMP)
  - is_expired (BOOLEAN)
  - access_count (INTEGER)
  - last_accessed_at (TIMESTAMP)
  - created_at (TIMESTAMP)
  - updated_at (TIMESTAMP)
- [ ] Indexes created:
  - idx_calculator_reports_session_id
  - idx_calculator_reports_access_token
  - idx_calculator_reports_email
  - idx_calculator_reports_expires_at
  - idx_calculator_reports_is_expired
- [ ] RLS policies applied (public read non-expired, service role CRUD)

### calculator_report_access_log Table
- [ ] Partitioned table exists
- [ ] Partitions created for months (2026-01, 2026-02, etc.)
- [ ] All fields present:
  - id (UUID PK)
  - report_id (FK)
  - accessed_at (TIMESTAMP)
  - ip_address (INET)
  - user_agent (TEXT)
  - referer_url (TEXT)
  - success (BOOLEAN)
  - error_message (TEXT)
- [ ] Index created: idx_calculator_report_access_log_report_id
- [ ] Trigger created to auto-increment access_count

### claude_api_logs Table
- [ ] Table exists in Supabase
- [ ] All fields present:
  - id (UUID PK)
  - session_id (FK)
  - request_id (UNIQUE)
  - model (VARCHAR 100)
  - input_tokens (INTEGER)
  - output_tokens (INTEGER)
  - total_tokens (INTEGER)
  - stop_reason (VARCHAR 50)
  - request_at (TIMESTAMP)
  - response_at (TIMESTAMP)
  - duration_ms (INTEGER)
  - status (VARCHAR 50)
  - error_code (VARCHAR 100)
  - error_message (TEXT)
  - prompt_hash (VARCHAR 64)
  - created_at (TIMESTAMP)
- [ ] Indexes created:
  - idx_claude_api_logs_session_id
  - idx_claude_api_logs_status
  - idx_claude_api_logs_request_at

### payment_tiers Table
- [ ] Table exists in Supabase
- [ ] 4 tiers seeded:
  - [ ] Bundle ($9.99): includes_meal_plan=false, includes_medical_context=false, expiry=30
  - [ ] Shopping ($19): includes_shopping_list=true, includes_medical_context=false, expiry=60
  - [ ] MealPlan ($27): includes_meal_plan=true, includes_medical_context=false, expiry=90
  - [ ] Doctor ($15): includes_medical_context=true, includes_meal_plan=false, expiry=180
- [ ] Each tier has correct features JSON:
  - includes_meal_plan: boolean
  - includes_recipes: number
  - includes_shopping_list: boolean
  - includes_medical_context: boolean
  - report_expiry_days: number
  - revision_limit: number

---

## API Endpoints to Implement

### GET /api/v1/calculator/report/{access_token}
- [ ] Extract access_token from URL path
- [ ] Validate token format (64 hex chars)
- [ ] Query calculator_reports WHERE access_token = token
- [ ] Check is_expired=FALSE AND expires_at > NOW()
- [ ] Return report_html + report_json
- [ ] Side effect: Insert into calculator_report_access_log (IP, user_agent, referer)
- [ ] Side effect: Trigger to increment access_count + update last_accessed_at
- [ ] Error handling:
  - 400 INVALID_TOKEN (not 64 hex chars)
  - 404 REPORT_NOT_FOUND (token doesn't exist)
  - 410 REPORT_EXPIRED (is_expired=true OR expires_at < NOW)

### POST /api/v1/calculator/step/4 (modified)
**Existing endpoint, needs modification for Step 4 premium**

Current flow (verify):
- [ ] Validate session_token exists
- [ ] Check is_premium=true AND payment_status='completed'
- [ ] Validate Step 4 data (email, name, health fields)
- [ ] Update session: step_completed=4
- [ ] Create calculator_reports row (placeholder HTML + access_token)
- [ ] Queue async report generation job
- [ ] Return access_token + report_url + expires_at

New requirements:
- [ ] access_token generation (64-char cryptographic random)
- [ ] expires_at calculation (NOW + tier.report_expiry_days)
- [ ] report_json initial value ({"status": "generating", "tier": "doctor|meal-plan|shopping|bundle"})
- [ ] Queue mechanism (cron, webhook, or Supabase function)

---

## Report Generation Background Job

### Trigger Options (Choose one)

#### Option 1: Cloudflare Cron (Recommended)
- [ ] Create scheduled trigger: Every 5 minutes
- [ ] Max batch size: 10 pending reports per run
- [ ] Query: `SELECT * FROM calculator_reports WHERE report_html IS NULL LIMIT 10`

#### Option 2: Stripe Webhook
- [ ] Listen to payment.intent.succeeded
- [ ] Trigger report generation immediately
- [ ] Reduces delay between payment and report availability

#### Option 3: Supabase PostgreSQL Trigger
- [ ] Create trigger on calculator_reports INSERT
- [ ] Invoke HTTP function for async processing

### Job Implementation

**Core Process:**
```
1. Fetch calculator_reports row (pending report)
2. Fetch calculator_sessions_v2 row (session data)
3. Fetch payment_tiers row (tier features)
4. Build Claude prompt (see REPORT_GENERATION_SPEC.md)
5. Call Claude API (claude-opus-4-5-20251101)
6. Parse response markdown
7. Convert to HTML (markdown parser + template)
8. Extract metadata (section count, content length)
9. Update calculator_reports (report_html, report_json, timestamps)
10. Log API call to claude_api_logs
11. Handle errors (retry, alert, fallback)
```

### Implementation Checklist

- [ ] Create background job handler function
- [ ] Implement Claude API client
  - [ ] Model: claude-opus-4-5-20251101
  - [ ] Max tokens: 4000
  - [ ] System message (from SPEC.md)
  - [ ] User prompt construction (from SPEC.md)
- [ ] Implement markdown-to-HTML converter
  - [ ] Preserve Markdown structure
  - [ ] Convert tables to HTML tables
  - [ ] Apply styling (from example report HTML)
  - [ ] Wrap content in template structure
- [ ] Implement error handling:
  - [ ] Timeout handling (retry in 5 min, max 3 retries)
  - [ ] Invalid data (alert + manual escalation)
  - [ ] Rate limiting (batch by tier to avoid API limits)
- [ ] Implement logging:
  - [ ] Log all Claude API calls to claude_api_logs
  - [ ] Track input/output tokens (cost calculation)
  - [ ] Track duration_ms (performance metrics)
- [ ] Implement monitoring:
  - [ ] Alert if >3 consecutive failures
  - [ ] Alert if avg duration > 30 seconds
  - [ ] Daily report generation metrics

---

## Claude API Integration

### Prompt Construction

- [ ] Fetch all 25+ fields from calculator_sessions_v2
- [ ] Fetch tier features from payment_tiers
- [ ] Build system message (from SPEC.md § Claude Prompt Structure)
- [ ] Build user prompt (from SPEC.md § Claude Prompt Structure)
  - [ ] Include Demographics (sex, age, height, weight)
  - [ ] Include Health Status (conditions, medications, symptoms, allergies)
  - [ ] Include Dietary History (previous diets, what worked, experience)
  - [ ] Include Lifestyle (cooking skill, meal prep, budget, family, work)
  - [ ] Include Goals (goal, health goals, biggest challenge)
  - [ ] Include Calculated Nutrition (calories, protein, fat, carbs)
  - [ ] Include Tier Features (controls section inclusion)

### API Response Handling

- [ ] Check for errors (status != 200)
  - [ ] Timeout → retry in 5 min
  - [ ] Rate limit (429) → exponential backoff
  - [ ] Auth error (401) → alert immediately
  - [ ] Other 5xx → retry in 30 min
- [ ] Extract markdown content from response
- [ ] Extract usage data:
  - [ ] input_tokens
  - [ ] output_tokens
  - [ ] stop_reason
- [ ] Extract request_id (for correlation)

### Markdown-to-HTML Conversion

- [ ] Parse markdown sections (## headers)
- [ ] Convert headers to HTML h2 tags
- [ ] Convert bullet lists to HTML ul/li
- [ ] Convert numbered lists to HTML ol/li
- [ ] Convert markdown tables to HTML tables
  - [ ] Preserve thead/tbody structure
  - [ ] Add CSS classes for styling
- [ ] Convert bold (**text**) to HTML strong
- [ ] Convert italic (*text*) to HTML em
- [ ] Preserve line breaks (\n → <p> tags)
- [ ] No control characters in output

### Report Template Wrapping

- [ ] Create HTML wrapper (from REPORT_GENERATION_SPEC.md § HTML Template)
  - [ ] DOCTYPE declaration
  - [ ] Meta tags (charset, viewport)
  - [ ] CSS styling (print-friendly, page breaks)
  - [ ] Cover page section (static)
  - [ ] Content section (Claude-generated markdown converted to HTML)
  - [ ] Footer section (disclaimer, copyright)
- [ ] Insert user personalization:
  - [ ] First name in cover page (optional)
  - [ ] Date in cover page
  - [ ] All Claude content inserted into content div

---

## Data Updates & Persistence

- [ ] Update calculator_reports row after generation:
  - [ ] report_html ← full HTML string
  - [ ] report_markdown ← raw markdown (version control)
  - [ ] report_json ← metadata JSON
    - [ ] sections_count (number of ## headers)
    - [ ] has_meal_plan (true if tier includes)
    - [ ] has_medical_context (true if tier includes)
    - [ ] content_length (byte length of HTML)
    - [ ] generated_at (ISO8601 timestamp)
  - [ ] claude_request_id ← request ID from API
  - [ ] generation_completed_at ← NOW()
- [ ] Insert into claude_api_logs:
  - [ ] session_id
  - [ ] request_id (from Claude response)
  - [ ] model ('claude-opus-4-5-20251101')
  - [ ] input_tokens
  - [ ] output_tokens
  - [ ] total_tokens
  - [ ] stop_reason
  - [ ] request_at (timestamp when request sent)
  - [ ] response_at (timestamp when response received)
  - [ ] duration_ms (response_at - request_at)
  - [ ] status ('success' or 'error')
  - [ ] error_code (if status='error')
  - [ ] error_message (if status='error')

---

## Expiration & Lifecycle

- [ ] Create daily cron job (runs at 00:00 UTC):
  ```sql
  UPDATE calculator_reports
  SET is_expired = TRUE
  WHERE expires_at <= NOW() AND is_expired = FALSE;
  ```
- [ ] Test expiration:
  - [ ] Create report with expires_at = NOW + 1 hour
  - [ ] Wait 1 hour
  - [ ] Cron runs
  - [ ] GET report/{token} returns 410 REPORT_EXPIRED
- [ ] Optional: Archive old reports (>90 days expired) to cold storage
- [ ] Optional: Hard delete archived reports

---

## Report Access & Delivery

### Access Token Security

- [ ] Generate access_token using cryptographically secure random:
  ```
  crypto.randomBytes(32).toString('hex')  // 64-char hex string
  ```
- [ ] Never log access_token in plain text
- [ ] Treat access_token as proof of access (not tied to user auth)
- [ ] Token is single-use proof of authorization

### Report Distribution

- [ ] Send email to user with report link:
  ```
  Subject: Your Personalized Carnivore Diet Report
  Body: https://app.carnivoreweekly.com/report/{access_token}
  ```
- [ ] Display report URL on frontend after Step 4 completion
- [ ] Expiration notice: "This report expires on {expires_at}"
- [ ] Option to download as PDF (optional enhancement)

### Access Logging

- [ ] Every GET /report/{token} triggers:
  - [ ] INSERT into calculator_report_access_log
    - report_id
    - accessed_at (NOW)
    - ip_address (from request)
    - user_agent (from request)
    - referer_url (from request)
    - success (TRUE if 200, FALSE if error)
    - error_message (null if success)
  - [ ] Trigger to UPDATE calculator_reports:
    - access_count += 1
    - last_accessed_at = NOW()

---

## Testing Checklist

### Unit Tests

- [ ] Test access_token generation (format, uniqueness)
- [ ] Test expires_at calculation (NOW + days)
- [ ] Test markdown-to-HTML conversion:
  - [ ] Headers (## → h2)
  - [ ] Lists (- → ul/li)
  - [ ] Tables (markdown table → HTML table)
  - [ ] Bold/italic
  - [ ] Special characters (no control chars)
- [ ] Test Claude prompt construction (includes all fields)
- [ ] Test error handling:
  - [ ] Timeout → retry
  - [ ] Rate limit → exponential backoff
  - [ ] Invalid session → error response

### Integration Tests

- [ ] End-to-end flow (Step 4 complete → report generated → accessible)
  - [ ] User completes Step 4
  - [ ] POST /step/4 returns access_token
  - [ ] Background job runs
  - [ ] calculator_reports.report_html populated
  - [ ] GET /report/{token} returns HTML
- [ ] Report expiration:
  - [ ] Create report with 1-hour expiry
  - [ ] Immediately: GET /report/{token} returns 200
  - [ ] After 1 hour + cron: GET /report/{token} returns 410
- [ ] Tier-specific content:
  - [ ] Bundle tier: No meal plan, no medical context
  - [ ] Shopping tier: Grocery lists, no meal plan
  - [ ] MealPlan tier: Full meal calendar, no medical context
  - [ ] Doctor tier: Medical context, no meal calendar
- [ ] Personalization:
  - [ ] Name appears in report
  - [ ] Conditions affect sections
  - [ ] Biggest challenge creates section
  - [ ] Budget affects food suggestions
  - [ ] Goals determine which subsections appear

### Load Tests

- [ ] Simulate 100+ concurrent report requests
- [ ] Verify API latency <100ms (cached reports)
- [ ] Verify Claude API doesn't get rate-limited (batch strategy)
- [ ] Verify database queries use indexes effectively

### Manual QA

- [ ] Generate report for each tier (4 total)
- [ ] Verify HTML renders correctly in browser
- [ ] Verify HTML prints correctly (page breaks, fonts)
- [ ] Verify responsive design (mobile, tablet, desktop)
- [ ] Verify all personalization fields are present:
  - [ ] First name in opening/closing
  - [ ] Condition-specific sections appear
  - [ ] Biggest challenge section present
  - [ ] Macro targets match calculated values
  - [ ] Food recommendations avoid allergies
  - [ ] Dairy recommendations match tolerance

---

## Monitoring & Observability

### Key Metrics to Track

- [ ] Report generation latency (target: 5-15 seconds)
- [ ] Claude API tokens per report (target: 500-2000 input, 1500-3000 output)
- [ ] Report generation success rate (target: >99%)
- [ ] Report access frequency (alert if spike)
- [ ] Database query times (target: <100ms)

### Logging Requirements

- [ ] Log all Claude API calls:
  - Request ID, model, tokens, duration, status
- [ ] Log all report generation:
  - Session ID, tier, generation time, HTML size
- [ ] Log all report access:
  - Access token, IP, timestamp, success/error
- [ ] Log validation errors:
  - Field, error code, submitted value

### Alerts to Configure

- [ ] Claude API >3 consecutive failures
- [ ] Report generation avg time >30 seconds
- [ ] Report access spike (>1000 requests in 1 hour)
- [ ] Database constraint violations
- [ ] Invalid access tokens (format error spike)

---

## Cost Tracking

### Claude API Costs (Jan 2026 rates)

- [ ] Input tokens: $3 per million
- [ ] Output tokens: $15 per million
- [ ] Typical report: ~500 input, ~2000 output = ~$0.035
- [ ] Budget calculation:
  - 1,000 reports/month = $35
  - 10,000 reports/month = $350

### Cost Optimization

- [ ] Implement prompt caching (dedup based on prompt_hash)
- [ ] Batch reports (5-minute intervals prevent 1000s simultaneous API calls)
- [ ] Monitor token usage per tier (some tiers may be more expensive)
- [ ] Consider model selection (opus is expensive; can smaller model work?)

---

## Deployment Checklist

- [ ] All database tables created + indexes + RLS policies
- [ ] Environment variables set:
  - [ ] CLAUDE_API_KEY
  - [ ] SUPABASE_URL
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] STRIPE_SECRET_KEY
- [ ] Background job deployed (cron or webhook)
- [ ] All endpoints tested in staging
- [ ] Email notifications configured (report ready, errors)
- [ ] Monitoring dashboard created
- [ ] Error alerting configured
- [ ] Documentation updated (internal wiki, runbooks)

---

## Post-Launch Monitoring (First 48 Hours)

- [ ] Monitor error rates (target: <1%)
- [ ] Monitor API latency (target: <15s generation)
- [ ] Monitor token usage (alert if >2x expected)
- [ ] Monitor report access patterns (normal distribution?)
- [ ] Check logs for unexpected errors
- [ ] Verify expiration cron ran successfully
- [ ] Manual spot-check reports for quality

---

## Known Limitations & Future Enhancements

### Current Scope (Step 6 MVP)

- [ ] One-time report generation (per payment)
- [ ] 30-day default expiry (configurable per tier)
- [ ] Token-based access (no user authentication required)
- [ ] HTML delivery only (no PDF)
- [ ] No revision/regeneration (user buys new report)

### Future Enhancements (Post-MVP)

- [ ] [ ] PDF generation (from HTML)
- [ ] [ ] Email delivery (automatic weekly emails?)
- [ ] [ ] Revision limit (tier-specific: 1-5 regenerations)
- [ ] [ ] Report customization (user can adjust sections?)
- [ ] [ ] Multi-language support (Spanish, French?)
- [ ] [ ] Report sharing (secure link to share with doctor?)
- [ ] [ ] Progress tracking (compare reports over time?)
- [ ] [ ] AI follow-up (chat with Claude about report?)

---

## Sign-Off

- [ ] Database schema reviewed by DBA (Leo)
- [ ] API design reviewed by backend lead
- [ ] Claude prompt reviewed by content team
- [ ] Test plan reviewed by QA
- [ ] All checklist items completed
- [ ] Ready for production deployment

**Implementation Status:** Specification Complete
**Target Launch:** [Insert date after implementation]
**Owner:** [Insert backend engineer name]

---

**Remember:** "A database is a promise you make to the future. Don't break it."

This specification ensures that promise is kept: immutable reports, secure access, accurate personalization, and reliable delivery.
