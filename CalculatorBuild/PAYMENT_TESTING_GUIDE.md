
## STRIPE TEST PROMO CODE

**Available Promo Code:** TEST321
- **Status:** Already configured in Stripe account
- **Purpose:** Testing payment flows without using real credit cards
- **How to use:** When testing Stripe checkout, enter TEST321 as promo code
- **Expected behavior:** Should apply discount to any tier selected
- **Testing workflow:**
  1. Fill form with test data (email: test@example.com)
  2. Click "Generate My Report"
  3. Select tier (e.g., Bundle $9.99)
  4. Enter TEST321 as promo code in Stripe checkout
  5. Use Stripe test card: 4242 4242 4242 4242, exp 12/25, CVC 123
  6. Verify payment succeeds and premium flag set

**Test Cards for Stripe:**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Requires Auth: 4000 2500 0000 3155

**Test Email:** test@example.com (for testing report delivery)

