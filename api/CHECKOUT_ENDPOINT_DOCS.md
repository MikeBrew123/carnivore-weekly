# Stripe Checkout Endpoint Documentation

## Overview

**Endpoint:** `POST /api/v1/assessment/create-checkout`
**Environment:** Cloudflare Workers (carnivore-report-api-production.iambrew.workers.dev)
**Purpose:** Create Stripe checkout sessions for the Carnivore Weekly assessment calculator
**Philosophy:** Simple, focused, no over-engineering

## Request Format

### URL
```
POST https://carnivore-report-api-production.iambrew.workers.dev/api/v1/assessment/create-checkout
```

### Headers
```
Content-Type: application/json
Origin: https://carnivoreweekly.com
```

### Body (JSON)
```json
{
  "email": "user@example.com",
  "first_name": "John",
  "form_data": {
    "age": 35,
    "sex": "male",
    "weight": 180,
    "weight_unit": "lbs",
    "height_feet": 6,
    "height_inches": 0,
    "lifestyle_activity": "moderate",
    "exercise_frequency": "3-4",
    "goal": "lose",
    "deficit_percentage": 20,
    "diet_type": "carnivore"
  }
}
```

### Field Requirements

| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| email | string | YES | Valid email address, ≤255 chars |
| first_name | string | YES | Non-empty string, ≤100 chars |
| form_data | object | YES | Must be a valid JSON object |

## Response Format

### Success Response (201 Created)
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_...",
  "session_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Checkout session created"
}
```

### Error Response (400/500)
```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": "Optional technical details"
}
```

## Error Codes

| Code | HTTP | Meaning | Action |
|------|------|---------|--------|
| INVALID_CONTENT_TYPE | 400 | Missing or wrong Content-Type header | Use application/json |
| INVALID_JSON | 400 | Request body is not valid JSON | Fix JSON syntax |
| MISSING_EMAIL | 400 | email field is missing | Add email field |
| INVALID_EMAIL | 400 | email format is invalid | Provide valid email |
| MISSING_FIRST_NAME | 400 | first_name is missing or empty | Add first_name field |
| MISSING_FORM_DATA | 400 | form_data is missing or not an object | Add form_data object |
| DB_INSERT_FAILED | 500 | Database insert failed | Check database connection |
| DB_RESPONSE_ERROR | 500 | Database didn't return session ID | Contact support |
| STRIPE_ERROR | 500 | Stripe API call failed | Check Stripe credentials |
| STRIPE_RESPONSE_ERROR | 500 | Stripe session missing fields | Contact support |
| INTERNAL_ERROR | 500 | Unexpected server error | Check logs |

## Implementation Details

### 1. Validation
- Email must be valid format
- first_name must be non-empty string
- form_data must be valid JSON object
- Returns 400 errors for validation failures

### 2. Database Insert
- Creates record in `cw_assessment_sessions` table
- Sets payment_status = 'pending'
- Stores entire form_data as JSONB
- Auto-generates UUID for session ID

### 3. Stripe Checkout
- Uses fixed price: `price_1SjRlBEVDfkpGz8wQK8QPE6m` ($10 USD)
- Success URL: `https://carnivoreweekly.com/assessment/success?session_id={CHECKOUT_SESSION_ID}`
- Cancel URL: `https://carnivoreweekly.com/assessment`
- Stores customer email and metadata

### 4. Response
- Returns checkout_url (redirect user to this)
- Returns session_id (for tracking)
- Returns session_uuid (unique ID in database)

### 5. CORS
- Accepts requests from carnivoreweekly.com
- Accepts localhost for development (3000, 8000)
- Preflight OPTIONS requests are handled

## Database Schema

### Table: cw_assessment_sessions

```sql
CREATE TABLE public.cw_assessment_sessions (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    form_data JSONB NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    stripe_session_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);
```

### Columns

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key, unique session ID |
| email | VARCHAR(255) | User email address |
| first_name | VARCHAR(100) | User first name |
| form_data | JSONB | Complete assessment form as JSON |
| payment_status | VARCHAR(50) | pending/completed/failed/refunded |
| stripe_session_id | VARCHAR(255) | Stripe checkout session ID |
| stripe_payment_intent_id | VARCHAR(255) | Stripe payment intent ID |
| created_at | TIMESTAMP | When session was created |
| updated_at | TIMESTAMP | Last update time |
| completed_at | TIMESTAMP | When payment was completed |

## Environment Variables Required

Must be set in Cloudflare Workers secrets:

```
SUPABASE_URL=https://kwtdpvnjewtahuxjyltn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_1SjRlBEVDfkpGz8wQK8QPE6m
FRONTEND_URL=https://carnivoreweekly.com
```

## Deployment

### 1. Apply Database Migration
```bash
# Run in Supabase dashboard or via CLI
psql -U postgres -d postgres -f migrations/020_assessment_sessions_table.sql
```

### 2. Deploy Worker
```bash
cd api
wrangler deploy create-checkout.js
```

### 3. Verify Secrets
```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PRICE_ID
wrangler secret put FRONTEND_URL
```

## Testing

### cURL Test
```bash
curl -X POST https://carnivore-report-api-production.iambrew.workers.dev/api/v1/assessment/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "John",
    "form_data": {
      "age": 35,
      "sex": "male",
      "weight": 180,
      "weight_unit": "lbs",
      "height_feet": 6,
      "height_inches": 0,
      "lifestyle_activity": "moderate",
      "exercise_frequency": "3-4",
      "goal": "lose",
      "deficit_percentage": 20,
      "diet_type": "carnivore"
    }
  }'
```

### Expected Response
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_...",
  "session_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Checkout session created"
}
```

### Test Cases

#### 1. Valid Request
- Provides all required fields
- Email is valid format
- form_data is valid JSON object
- Expected: 201 with checkout_url

#### 2. Missing Email
- Omit "email" field
- Expected: 400 MISSING_EMAIL

#### 3. Invalid Email
- email: "invalid-email"
- Expected: 400 INVALID_EMAIL

#### 4. Missing first_name
- Omit "first_name" field
- Expected: 400 MISSING_FIRST_NAME

#### 5. Empty first_name
- first_name: ""
- Expected: 400 MISSING_FIRST_NAME

#### 6. Missing form_data
- Omit "form_data" field
- Expected: 400 MISSING_FORM_DATA

#### 7. Invalid Content-Type
- Header: "Content-Type: text/plain"
- Expected: 400 INVALID_CONTENT_TYPE

#### 8. Invalid JSON
- Body is malformed JSON
- Expected: 400 INVALID_JSON

## Frontend Integration

### 1. Collect Assessment Data
```javascript
const formData = {
  email: 'user@example.com',
  first_name: 'John',
  form_data: {
    age: 35,
    sex: 'male',
    weight: 180,
    // ... all other fields
  }
};
```

### 2. Call Endpoint
```javascript
const response = await fetch(
  'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/assessment/create-checkout',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  }
);

const data = await response.json();
```

### 3. Redirect to Checkout
```javascript
if (data.success) {
  window.location.href = data.checkout_url;
} else {
  console.error('Checkout failed:', data.message);
  // Show error to user
}
```

## Monitoring & Logging

### Errors to Watch
- DB_INSERT_FAILED: Database connectivity issue
- STRIPE_ERROR: Stripe API issue
- INVALID_EMAIL: User input validation failure

### Success Tracking
- Monitor checkout_url redirects
- Track session creation rate
- Monitor payment completion rate

## Webhook Integration

After payment completion, Stripe sends webhook to verify payment status. This is handled separately by the payment verification endpoint.

Expected workflow:
1. User submits assessment → creates session (payment_status='pending')
2. User pays → Stripe creates payment intent
3. Webhook confirms payment → update payment_status='completed'
4. User can access premium report

## Rollback Plan

If endpoint has issues:
1. Rollback worker code to previous version
2. Check Stripe credentials
3. Verify database table exists and is accessible
4. Verify CORS origin whitelist

## Performance Targets

- Request/Response time: < 1 second
- Database insert: < 100ms
- Stripe API call: < 500ms
- Total response: < 2 seconds

## Security

- CORS restricted to carnivoreweekly.com
- Email validation
- Rate limiting (per IP, recommended future enhancement)
- No sensitive data in error messages (unless debug mode)
- Service role key stored in Cloudflare secrets
- Stripe secret key stored in Cloudflare secrets

## Maintenance

- Monitor error rates weekly
- Review database growth monthly
- Update Stripe price ID when pricing changes
- Review CORS whitelist quarterly

---

**Author:** ALEX (Senior Infrastructure Architect)
**Created:** 2026-01-04
**Last Updated:** 2026-01-04
**Status:** Production Ready
