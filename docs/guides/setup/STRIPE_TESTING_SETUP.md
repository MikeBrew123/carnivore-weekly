# Stripe Testing Setup Guide

## Overview
This guide covers setting up a local Stripe testing environment for the Calculator 2 payment flow.

## Prerequisites
- Node.js and npm installed
- Stripe CLI installed (v1.34.0+)
- Stripe account with test keys
- Playwright installed

## Step 1: Stripe CLI Installation

Stripe CLI is already installed via Homebrew:

```bash
which stripe
stripe --version  # Should show v1.34.0 or higher
```

## Step 2: Authenticate with Stripe

```bash
stripe login
```

Follow the prompts to authenticate with your Stripe account. This will create a `.stripecli-config.json` file in your home directory.

## Step 3: Get Test Keys

In your Stripe Dashboard:
1. Go to Settings > API Keys
2. Copy your **Publishable Key** (starts with `pk_test_`)
3. Copy your **Secret Key** (starts with `sk_test_`)

Store these in `.env.local`:

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

## Step 4: Set Up Webhook Listening

The Stripe CLI can forward webhook events to your local development environment.

### Terminal 1: Start Stripe Webhook Listener

```bash
stripe listen --forward-to localhost:8000/webhook
```

This will:
- Show your webhook signing secret (copy this to `.env`)
- Forward all Stripe events to your local server
- Display real-time webhook events in the terminal

### Terminal 2: Start Your Development Server

```bash
npm run dev  # or your development command
# Or if running on different port:
# PORT=8000 npm run dev
```

## Step 5: Test Keys for Payment Testing

Use these test card numbers:

### Successful Payment
- Card Number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/26)
- CVC: Any 3 digits (e.g., 123)
- Zip: Any 5 digits (e.g., 10001)

### Failed Payment (Insufficient Funds)
- Card Number: `4000 0000 0000 0002`
- Expiry: Any future date
- CVC: Any 3 digits

### Declined Payment
- Card Number: `4000 0000 0000 0069`
- Expiry: Any future date
- CVC: Any 3 digits

### Requires Authentication (3D Secure)
- Card Number: `4000 0025 0000 3155`
- Expiry: Any future date
- CVC: Any 3 digits

For full list of test cards: https://stripe.com/docs/testing

## Step 6: Run Tests

### Option A: Using Test Script

```bash
# Install Playwright if not already installed
npm install -D @playwright/test

# Run calculator flow tests
node test-calculator-flow.js
```

Or with custom base URL:
```bash
BASE_URL=http://localhost:3000 node test-calculator-flow.js
```

### Option B: Manual Testing

1. Open browser to calculator
2. Fill Step 1 (Basic) - include email
3. Fill Step 2 (Activity)
4. Submit to see results
5. Click Upgrade button
6. Fill payment modal with:
   - First Name: John
   - Last Name: Carnivore
   - Email: test@carnivore-demo.com
   - Card: 4242 4242 4242 4242
7. Click Pay button

## Step 7: Monitor Webhook Events

In the terminal running `stripe listen`, you'll see events like:

```
2026-01-03 10:30:45 › invoice.created
2026-01-03 10:30:46 › charge.succeeded
2026-01-03 10:30:47 › customer.created
```

Check specific events:

```bash
stripe logs tail  # See all logs
stripe logs tail --filter 'resource=charge'  # Filter by resource
```

## Testing Email & Name Capture

The calculator now captures:
1. **Email**: Captured in Step 1 (Basic) - optional field
2. **First Name**: Captured in payment modal - required
3. **Last Name**: Captured in payment modal - required

### Test Validation

Email validation:
- Must be valid email format (user@domain.com)
- Validated in real-time as user types

Name validation:
- First and last name are both required
- Minimum 2 characters each
- Only letters, spaces, hyphens, and apostrophes allowed
- Pay button disabled until names are valid

### Test Flow

```
Step 1: User enters email (optional)
         ↓
Step 2: User continues through activity/goals
         ↓
Step 3: User clicks Upgrade
         ↓
Payment Modal:
  - Email pre-filled from Step 1 (if provided)
  - User enters firstName (required)
  - User enters lastName (required)
  - User enters email (required, overrides Step 1)
```

## API Payload Sent to Stripe

When user clicks "Pay", the calculator sends:

```json
{
  "tier_id": "bundle",
  "tier_title": "Bundle Package",
  "amount": 999,
  "original_amount": 999,
  "coupon_code": null,
  "discount_percent": 0,
  "customer_email": "user@example.com",
  "customer_name": "John Carnivore",
  "customer_first_name": "John",
  "customer_last_name": "Carnivore",
  "session_token": "session_xyz",
  "success_url": "https://example.com/calculator2-demo.html?payment=success",
  "cancel_url": "https://example.com/calculator2-demo.html?payment=cancelled"
}
```

## Troubleshooting

### Webhook Not Forwarding
```bash
# Check webhook status
stripe status

# Re-establish connection
stripe listen --forward-to localhost:8000/webhook
```

### Test Keys Not Working
- Verify you're using test keys (start with `pk_test_` / `sk_test_`)
- Check `.env` file is loaded by dev server
- Restart dev server after updating `.env`

### Cards Not Declining as Expected
- Use exact test card numbers (no spaces)
- Use any future expiry date
- Use any 3-digit CVC
- Use any 5-digit zip code

### Webhook Events Not Firing
- Ensure `stripe listen` is running
- Check terminal running Stripe CLI for connection status
- Verify server is actually making checkout requests

## Best Practices

1. **Use separate terminals**:
   - Terminal 1: Stripe webhook listener
   - Terminal 2: Dev server
   - Terminal 3: Test script / manual testing

2. **Monitor in real-time**:
   - Watch webhook events in Terminal 1
   - Check server logs in Terminal 2
   - View browser console for client errors

3. **Test all scenarios**:
   - Valid payment (4242)
   - Declined payment (4000 0000 0000 0069)
   - Email validation errors
   - Name validation errors

4. **Check Stripe Dashboard**:
   - View test payments at https://dashboard.stripe.com/test/payments
   - Check for test customers: https://dashboard.stripe.com/test/customers
   - Monitor webhooks: https://dashboard.stripe.com/test/webhooks

## Next Steps

Once testing is complete and all tests pass:

1. Run full test suite: `node test-calculator-flow.js`
2. Check Stripe Dashboard for test charges
3. Verify webhook events were received
4. Document any issues or improvements
5. Prepare for production migration

## References

- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Playwright Documentation](https://playwright.dev)
