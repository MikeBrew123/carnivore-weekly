# Checkout Endpoint - Quick Reference

## At a Glance

```
POST /api/v1/assessment/create-checkout
Input:  { email, first_name, form_data }
Output: { success, checkout_url, session_id, session_uuid }
Price:  $10 USD (fixed)
```

## Example Request

```javascript
fetch('https://carnivore-report-api-production.iambrew.workers.dev/api/v1/assessment/create-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    first_name: 'John',
    form_data: {
      age: 35,
      sex: 'male',
      weight: 180,
      weight_unit: 'lbs',
      lifestyle_activity: 'moderate',
      exercise_frequency: '3-4',
      goal: 'lose',
      deficit_percentage: 20,
      diet_type: 'carnivore'
    }
  })
})
.then(r => r.json())
.then(data => window.location.href = data.checkout_url)
.catch(err => alert('Error: ' + err.message));
```

## Example Response

```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_...",
  "session_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Checkout session created"
}
```

## Error Response

```json
{
  "success": false,
  "code": "INVALID_EMAIL",
  "message": "email must be a valid email address"
}
```

## Required Fields

| Field | Type | Min | Max | Format |
|-------|------|-----|-----|--------|
| email | string | 1 | 255 | valid email |
| first_name | string | 1 | 100 | any text |
| form_data | object | - | - | JSON object |

## Common Error Codes

| Code | HTTP | Fix |
|------|------|-----|
| MISSING_EMAIL | 400 | Add email field |
| INVALID_EMAIL | 400 | Use valid email format |
| MISSING_FIRST_NAME | 400 | Add first_name field |
| MISSING_FORM_DATA | 400 | Add form_data object |
| DB_INSERT_FAILED | 500 | Check database |
| STRIPE_ERROR | 500 | Check Stripe credentials |

## cURL Test

```bash
curl -X POST https://carnivore-report-api-production.iambrew.workers.dev/api/v1/assessment/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "John",
    "form_data": {"age": 35, "sex": "male", "weight": 180}
  }'
```

## Frontend Integration (3 Steps)

### Step 1: Collect Form Data
```javascript
const data = {
  email: form.email.value,
  first_name: form.firstName.value,
  form_data: { /* all form fields */ }
};
```

### Step 2: Call Endpoint
```javascript
const response = await fetch('https://...create-checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
const result = await response.json();
```

### Step 3: Redirect
```javascript
if (result.success) {
  window.location.href = result.checkout_url;
}
```

## Database

### Table: cw_assessment_sessions

```sql
-- Check saved sessions
SELECT id, email, payment_status, created_at
FROM cw_assessment_sessions
ORDER BY created_at DESC
LIMIT 10;

-- Check by email
SELECT * FROM cw_assessment_sessions
WHERE email = 'user@example.com';

-- Check pending sessions
SELECT id, email, stripe_session_id
FROM cw_assessment_sessions
WHERE payment_status = 'pending';
```

## Deployment

```bash
# 1. Apply migration
psql postgresql://...supabase.co:5432/postgres \
  < migrations/020_assessment_sessions_table.sql

# 2. Deploy worker
wrangler deploy api/create-checkout.js

# 3. Set secrets
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_PRICE_ID
wrangler secret put FRONTEND_URL

# 4. Test
bash api/test-checkout-endpoint.sh all
```

## Environment Variables

```
SUPABASE_URL=https://kwtdpvnjewtahuxjyltn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRICE_ID=price_1SjRlBEVDfkpGz8wQK8QPE6m
FRONTEND_URL=https://carnivoreweekly.com
```

## CORS

Allowed origins:
- https://carnivoreweekly.com
- http://localhost:3000
- http://localhost:8000

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 201 | Session created successfully |
| 400 | Validation error |
| 500 | Server error |

## Performance

| Metric | Target | Typical |
|--------|--------|---------|
| Request → Response | < 1s | 300-500ms |
| Database Insert | < 100ms | 20-50ms |
| Stripe API Call | < 500ms | 200-400ms |

## Success Flow

```
User fills form
    ↓
Click "Proceed to Payment"
    ↓
Frontend validates locally
    ↓
POST to /api/v1/assessment/create-checkout
    ↓
← Returns 201 with checkout_url
    ↓
Redirect to Stripe checkout
    ↓
User enters payment info
    ↓
Success redirect to /assessment/success?session_id=...
```

## Common Issues

**"CORS error"**
- Check Origin header matches allowed domains
- Use https://carnivoreweekly.com (not http)

**"STRIPE_ERROR"**
- Verify STRIPE_SECRET_KEY in secrets
- Verify STRIPE_PRICE_ID is correct format

**"DB_INSERT_FAILED"**
- Check SUPABASE_SERVICE_ROLE_KEY
- Verify cw_assessment_sessions table exists
- Run migration: migrations/020_assessment_sessions_table.sql

**"Email validation error"**
- Use valid email format: name@domain.com
- Check email ≤ 255 characters

## Files

| File | Purpose |
|------|---------|
| api/create-checkout.js | Endpoint code |
| api/CHECKOUT_ENDPOINT_DOCS.md | Full documentation |
| api/CHECKOUT_INTEGRATION_GUIDE.md | Frontend guide |
| api/test-checkout-endpoint.sh | Test script |
| migrations/020_assessment_sessions_table.sql | Database migration |

## Contact

**Questions?** Contact ALEX (Senior Infrastructure Architect)

---

**Last Updated:** 2026-01-04
**Status:** Production Ready
