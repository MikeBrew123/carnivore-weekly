# Checkout Endpoint Integration Guide

## Overview

This guide explains how to integrate the Stripe checkout endpoint into the Carnivore Weekly assessment calculator frontend.

**Endpoint:** `POST /api/v1/assessment/create-checkout`
**Price:** $10 USD (fixed)
**Returns:** Stripe checkout URL

## Quick Start

### 1. Frontend Form Submission

When user completes the assessment form, collect this data:

```javascript
const assessmentData = {
  email: 'user@example.com',
  first_name: 'John',
  form_data: {
    // Step 1: Physical Stats
    age: 35,
    sex: 'male',
    weight: 180,
    weight_unit: 'lbs',
    height_feet: 6,
    height_inches: 0,

    // Step 2: Fitness & Diet
    lifestyle_activity: 'moderate',
    exercise_frequency: '3-4',
    goal: 'lose',
    deficit_percentage: 20,
    diet_type: 'carnivore',

    // Step 3: Health Profile (if applicable)
    medications: 'none',
    conditions: [],
    allergies: 'none',

    // Add any other form fields here
  }
};
```

### 2. Call Checkout Endpoint

```javascript
async function initiateCheckout(assessmentData) {
  try {
    const response = await fetch(
      'https://carnivore-report-api-production.iambrew.workers.dev/api/v1/assessment/create-checkout',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(assessmentData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Checkout failed');
    }

    const result = await response.json();

    if (result.success) {
      return result;
    } else {
      throw new Error(result.message);
    }
  } catch (err) {
    console.error('Checkout error:', err);
    throw err;
  }
}
```

### 3. Redirect to Stripe Checkout

```javascript
async function handleCheckoutClick() {
  try {
    // Show loading state
    document.getElementById('checkout-button').disabled = true;
    document.getElementById('checkout-button').textContent = 'Loading...';

    // Call endpoint
    const result = await initiateCheckout(assessmentData);

    // Redirect to Stripe checkout
    window.location.href = result.checkout_url;
  } catch (err) {
    // Show error to user
    showErrorMessage(err.message);

    // Re-enable button
    document.getElementById('checkout-button').disabled = false;
    document.getElementById('checkout-button').textContent = 'Proceed to Payment';
  }
}
```

## Response Handling

### Success Response (Status 201)
```json
{
  "success": true,
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_...",
  "session_id": "cs_test_...",
  "session_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Checkout session created"
}
```

**Action:** Redirect user to `checkout_url`

### Error Response (Status 400/500)
```json
{
  "success": false,
  "code": "MISSING_EMAIL",
  "message": "email is required",
  "details": null
}
```

**Action:** Show error message to user, allow them to retry

## Error Handling

### User Input Errors (400)

These are validation errors. Show user-friendly messages:

```javascript
const errorMessages = {
  'INVALID_EMAIL': 'Please provide a valid email address.',
  'MISSING_EMAIL': 'Email is required.',
  'MISSING_FIRST_NAME': 'First name is required.',
  'MISSING_FORM_DATA': 'Please complete the assessment form.',
  'INVALID_JSON': 'Invalid form data. Please refresh and try again.',
  'INVALID_CONTENT_TYPE': 'Invalid request format. Please refresh and try again.',
};

function handleCheckoutError(error) {
  const userMessage = errorMessages[error.code] || error.message || 'Checkout failed. Please try again.';
  showErrorMessage(userMessage);

  // Log technical details for debugging
  console.error('Checkout error:', error);
}
```

### Server Errors (500)

These indicate infrastructure issues. Implement retry logic:

```javascript
async function initiateCheckoutWithRetry(assessmentData, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await initiateCheckout(assessmentData);
    } catch (err) {
      if (err.statusCode >= 500 && attempt < maxAttempts) {
        // Server error - wait and retry
        const delayMs = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      } else {
        throw err;
      }
    }
  }
}
```

## Form Validation

Before calling endpoint, validate form data:

```javascript
function validateAssessmentForm(data) {
  const errors = [];

  // Check email
  if (!data.email) {
    errors.push('Email is required');
  } else if (!isValidEmail(data.email)) {
    errors.push('Email format is invalid');
  }

  // Check first_name
  if (!data.first_name || data.first_name.trim().length === 0) {
    errors.push('First name is required');
  }

  // Check form_data
  if (!data.form_data || Object.keys(data.form_data).length === 0) {
    errors.push('Please complete the assessment form');
  }

  // Check required form fields
  const requiredFields = [
    'age', 'sex', 'weight', 'weight_unit',
    'lifestyle_activity', 'exercise_frequency', 'goal', 'diet_type'
  ];

  const missing = requiredFields.filter(f => !data.form_data[f]);
  if (missing.length > 0) {
    errors.push(`Missing fields: ${missing.join(', ')}`);
  }

  return errors;
}

function isValidEmail(email) {
  const regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return regex.test(email) && email.length <= 255;
}
```

## Complete Example

```html
<form id="assessment-form">
  <!-- Form fields here -->
  <button id="checkout-button" type="button">Proceed to Payment ($10)</button>
</form>

<div id="error-message" style="display: none; color: red;"></div>
```

```javascript
document.getElementById('checkout-button').addEventListener('click', async (e) => {
  e.preventDefault();

  try {
    // Collect form data
    const formData = collectFormData();

    // Validate locally
    const errors = validateAssessmentForm(formData);
    if (errors.length > 0) {
      showErrorMessage(errors.join('\n'));
      return;
    }

    // Show loading state
    const button = document.getElementById('checkout-button');
    button.disabled = true;
    button.textContent = 'Creating checkout session...';

    // Call endpoint with retry
    const result = await initiateCheckoutWithRetry(formData);

    // Redirect to Stripe
    window.location.href = result.checkout_url;

  } catch (err) {
    // Handle error
    showErrorMessage('Checkout failed: ' + err.message);

    // Reset button
    const button = document.getElementById('checkout-button');
    button.disabled = false;
    button.textContent = 'Proceed to Payment ($10)';
  }
});

function collectFormData() {
  // Read form fields and return data structure
  return {
    email: document.getElementById('email').value,
    first_name: document.getElementById('first-name').value,
    form_data: {
      age: parseInt(document.getElementById('age').value),
      sex: document.getElementById('sex').value,
      weight: parseFloat(document.getElementById('weight').value),
      weight_unit: document.getElementById('weight-unit').value || 'lbs',
      // ... collect all other fields
    }
  };
}

function showErrorMessage(message) {
  const errorDiv = document.getElementById('error-message');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorDiv.style.display = 'none';
  }, 5000);
}
```

## Stripe Checkout Page

After redirect to `checkout_url`, Stripe handles:
- Payment form display
- Card validation
- Payment processing
- Success/Cancel redirects

**Success redirect:** `https://carnivoreweekly.com/assessment/success?session_id={CHECKOUT_SESSION_ID}`
**Cancel redirect:** `https://carnivoreweekly.com/assessment`

On success page, you can:
1. Show confirmation message
2. Store session ID in localStorage
3. Call report generation API
4. Redirect to report page

## Testing

### Local Development

```bash
# Test with cURL
curl -X POST http://localhost:8787/api/v1/assessment/create-checkout \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "form_data": {
      "age": 30,
      "sex": "male",
      "weight": 180,
      "weight_unit": "lbs",
      "lifestyle_activity": "moderate",
      "exercise_frequency": "3-4",
      "goal": "lose",
      "deficit_percentage": 20,
      "diet_type": "carnivore"
    }
  }'
```

### Test with Real Form

1. Navigate to assessment page
2. Fill out form completely
3. Click "Proceed to Payment"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Verify redirect to success page

## Database Access

To check saved sessions:

```sql
-- Get all sessions
SELECT id, email, first_name, payment_status, created_at
FROM cw_assessment_sessions
ORDER BY created_at DESC;

-- Get pending sessions
SELECT id, email, stripe_session_id, payment_status
FROM cw_assessment_sessions
WHERE payment_status = 'pending'
ORDER BY created_at DESC;

-- Get session by email
SELECT * FROM cw_assessment_sessions
WHERE email = 'user@example.com'
ORDER BY created_at DESC;
```

## Monitoring

Track these metrics:
- **Endpoint calls:** Count of checkout creation requests
- **Success rate:** Percentage of 201 responses
- **Error rate:** Percentage of 400/500 responses
- **Redirect rate:** Percentage of users who proceed to Stripe
- **Conversion rate:** Percentage of users who complete payment

## Troubleshooting

### "Checkout session created but missing fields"
- Check Stripe credentials in Cloudflare
- Verify STRIPE_PRICE_ID is correct
- Contact ALEX

### "Failed to save assessment data"
- Check if cw_assessment_sessions table exists
- Run migration: `migrations/020_assessment_sessions_table.sql`
- Check Supabase service role key

### "Stripe checkout not redirecting"
- Verify checkout_url in response is valid
- Check browser console for JavaScript errors
- Verify FRONTEND_URL environment variable

### CORS errors
- Check Origin header matches allowed domains
- Local dev should use http://localhost:3000
- Production should use https://carnivoreweekly.com

## Timeline

1. **Assessment Form:** User fills out assessment
2. **Validation:** Frontend validates form locally
3. **Checkout Call:** Frontend calls endpoint
4. **Database Save:** Backend saves form data (payment_status='pending')
5. **Stripe Session:** Backend creates Stripe checkout session
6. **Redirect:** Frontend redirects to Stripe checkout
7. **Payment:** User completes payment on Stripe
8. **Webhook:** Stripe sends webhook (handled separately)
9. **Verification:** Backend marks payment_status='completed'
10. **Report Access:** User can generate/view report

## Next Steps

1. Review checkout endpoint code in `/api/create-checkout.js`
2. Deploy to production
3. Test with real form data
4. Monitor error rates
5. Implement payment webhook handler

---

**For Questions:** Contact ALEX (Senior Infrastructure Architect)
**Status:** Production Ready
**Last Updated:** 2026-01-04
