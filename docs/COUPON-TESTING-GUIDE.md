# Coupon Testing Guide

**Date:** January 19, 2026
**Status:** ✅ API Deployed - Ready for Testing

---

## What Changed

✅ **Refactored coupon system** to use Stripe API instead of hardcoded validation
✅ **Coupons now applied to Stripe checkout** (tracked in Stripe analytics)
✅ **Created 3 Stripe coupons:**
- TEST999 (100% off, forever)
- WELCOME10 (10% off, one-time)
- CARNIVORE20 (20% off, one-time)

---

## Testing Checklist

### Test 1: TEST999 (100% off) ✅ Priority
**Expected:** Stripe checkout shows $0.00 total

1. Go to https://carnivoreweekly.com/calculator.html
2. Fill Steps 1 & 2 (any values)
3. Click "Upgrade for Full Protocol"
4. Enter:
   - Email: test@carnivoreweekly.com
   - First name: Test
   - Select: $9.99 Complete Protocol Bundle
   - **Coupon: TEST999**
5. Click "Checkout"

**What should happen:**
- ✅ Redirects to Stripe
- ✅ Stripe shows **$9.99** with **-$9.99 discount**
- ✅ Total: **$0.00**
- ✅ Can complete checkout without entering card

**If this works:** TEST999 coupon is properly integrated with Stripe!

---

### Test 2: WELCOME10 (10% off)
**Expected:** Stripe checkout shows $8.99 total ($9.99 - 10%)

1. Go to https://carnivoreweekly.com/calculator.html
2. Fill Steps 1 & 2 (any values)
3. Click "Upgrade for Full Protocol"
4. Enter:
   - Email: test2@carnivoreweekly.com
   - First name: Test
   - Select: $9.99 Complete Protocol Bundle
   - **Coupon: WELCOME10**
5. Click "Checkout"

**What should happen:**
- ✅ Redirects to Stripe
- ✅ Stripe shows **$9.99** with **-$1.00 discount (10%)**
- ✅ Total: **$8.99**
- ✅ Enter test card: 4242 4242 4242 4242
- ✅ Complete payment

**If this works:** Partial discounts work through Stripe!

---

### Test 3: CARNIVORE20 (20% off)
**Expected:** Stripe checkout shows $7.99 total ($9.99 - 20%)

1. Go to https://carnivoreweekly.com/calculator.html
2. Fill Steps 1 & 2 (any values)
3. Click "Upgrade for Full Protocol"
4. Enter:
   - Email: test3@carnivoreweekly.com
   - First name: Test
   - Select: $9.99 Complete Protocol Bundle
   - **Coupon: CARNIVORE20**
5. Click "Checkout"

**What should happen:**
- ✅ Redirects to Stripe
- ✅ Stripe shows **$9.99** with **-$2.00 discount (20%)**
- ✅ Total: **$7.99**
- ✅ Enter test card: 4242 4242 4242 4242
- ✅ Complete payment

---

### Test 4: Invalid Coupon
**Expected:** Error message, checkout blocked

1. Go to https://carnivoreweekly.com/calculator.html
2. Fill Steps 1 & 2 (any values)
3. Click "Upgrade for Full Protocol"
4. Enter:
   - Email: test@carnivoreweekly.com
   - First name: Test
   - Select: $9.99 Complete Protocol Bundle
   - **Coupon: INVALIDCODE**
5. Click "Checkout"

**What should happen:**
- ❌ Error message: "Coupon code not found or expired"
- ❌ Does NOT redirect to Stripe
- ✅ User can correct the coupon or remove it

---

### Test 5: No Coupon (Baseline)
**Expected:** Stripe checkout shows $9.99 total

1. Go to https://carnivoreweekly.com/calculator.html
2. Fill Steps 1 & 2 (any values)
3. Click "Upgrade for Full Protocol"
4. Enter:
   - Email: test@carnivoreweekly.com
   - First name: Test
   - Select: $9.99 Complete Protocol Bundle
   - **Coupon: (leave blank)**
5. Click "Checkout"

**What should happen:**
- ✅ Redirects to Stripe
- ✅ Stripe shows **$9.99** (no discount)
- ✅ Total: **$9.99**
- ✅ Enter test card: 4242 4242 4242 4242
- ✅ Complete payment

---

## Stripe Test Cards

Use these for testing payments:

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Successful payment |
| 4000 0025 0000 3155 | Requires authentication (3D Secure) |
| 4000 0000 0000 9995 | Declined (insufficient funds) |

**Expiry:** Any future date (e.g., 12/30)
**CVC:** Any 3 digits (e.g., 123)
**ZIP:** Any 5 digits (e.g., 12345)

---

## Monitoring Stripe

After tests, check Stripe Dashboard:

1. **Payments** → See test charges
2. **Coupons** → See redemption count for each coupon
3. **Customers** → See test customer records

**Analytics you can now track:**
- Which coupons are used most
- Average discount per order
- Revenue with vs without coupons
- Coupon redemption trends

---

## Troubleshooting

### Issue: Coupon not applying

**Check:**
1. Is the coupon code in `stripeCouponMap` (api/calculator-api.js:133-140)?
2. Is the Stripe coupon ID correct?
3. Check Wrangler logs: `wrangler tail --env production`

### Issue: Stripe shows wrong discount

**Check:**
1. Verify coupon details in Stripe Dashboard
2. Check if coupon has expired
3. Verify coupon type (percent_off vs amount_off)

### Issue: API error on checkout

**Check:**
1. Wrangler logs: `wrangler tail --env production`
2. Browser console for error messages
3. Network tab for API responses

---

## Next Steps After Testing

Once all tests pass:

1. **Refund test payments** in Stripe Dashboard
2. **Create real coupons** for production use
3. **Update coupon map** in calculator-api.js
4. **Redeploy API** with production coupons
5. **Monitor analytics** in Stripe

---

## Production Coupon Creation (Future)

To add new coupons:

1. **Create in Stripe Dashboard:**
   - Go to Stripe Dashboard → Products → Coupons
   - Click "New coupon"
   - Set discount (percent or amount)
   - Set duration (once, forever, repeating)
   - Copy the Coupon ID (e.g., `abc123xyz`)

2. **Add to code:**
   ```javascript
   // In api/calculator-api.js, line 133
   const stripeCouponMap = {
     'NEWCODE': 'abc123xyz',  // Your new code
     'TEST999': 'DjCf14wH',
     // ... existing codes
   };
   ```

3. **Deploy:**
   ```bash
   cd api && wrangler deploy --env production
   ```

4. **Test** with the new code

---

## Summary

✅ **No more hardcoded coupons**
✅ **Stripe validates and tracks everything**
✅ **Full analytics available**
✅ **Can create coupons without code changes (just update map)**

**Current Status:** Ready for testing
**Deployment:** Complete
**Next Action:** Run Test 1 (TEST999)
