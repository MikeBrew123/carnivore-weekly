# Coupon System Issues - Critical Findings

**Date:** January 19, 2026
**Status:** 🔴 CRITICAL - Payment testing incomplete

---

## Problem Summary

The calculator has been tested exclusively with **TEST999**, a **hardcoded 100% discount** that **bypasses Stripe entirely**. This means:

❌ **Real Stripe payment flow has NEVER been tested**
❌ **Stripe promotion codes are not integrated**
❌ **Coupon analytics are not tracked**
❌ **Cannot create/modify coupons without code deployment**

---

## Current Flow (BROKEN)

### Hardcoded Coupon Validation

**Location:** `api/calculator-api.js` lines 131-157

```javascript
const validCoupons = {
  'WELCOME10': { percent: 10, description: 'Welcome 10% off' },
  'CARNIVORE20': { percent: 20, description: 'Carnivore community 20% off' },
  'EARLY25': { percent: 25, description: 'Early adopter 25% off' },
  'LAUNCH50': { percent: 50, description: 'Limited launch 50% off' },
  'FRIEND15': { percent: 15, description: 'Referral friend 15% off' },
  'TESTCOUPON5': { percent: 5, description: 'Test coupon 5% off' },
  'TEST321': { percent: 100, description: 'Test 100% off' },
  'TEST999': { percent: 100, description: 'Test 100% off (Unlimited)' },  // ⚠️ Used for all testing
};
```

### Flow Breakdown

1. **User enters coupon code** → Frontend calls `/validate-coupon`
2. **API validates** → Checks hardcoded `validCoupons` object
3. **If 100% discount** → Bypasses Stripe entirely, marks session as paid
4. **If partial discount** → Creates Stripe checkout BUT doesn't apply coupon to Stripe
5. **Stripe** → Has `allow_promotion_codes: true` but never receives the coupon

### What Actually Happens with TEST999

```
User enters "TEST999"
  ↓
Frontend validates (hardcoded check)
  ↓
100% discount detected
  ↓
**BYPASSES STRIPE COMPLETELY**
  ↓
Session marked as "paid" in database
  ↓
No payment actually processed
```

---

## Stripe Coupons in Dashboard (UNUSED)

**Created but NOT connected to calculator:**

| Coupon Code | Discount | Created In | Works? |
|-------------|----------|------------|--------|
| TEST99 | 99% off | Stripe Dashboard | ❌ No |
| TestingOnGoing | 100% off (forever) | Stripe Dashboard | ❌ No |
| Free2 | 100% off (forever) | Stripe Dashboard | ❌ No |
| free | 100% off (one-time) | Stripe Dashboard | ❌ No |
| TEST1 | 100% off (one-time) | Stripe Dashboard | ❌ No |
| test122 | 100% off (one-time) | Stripe Dashboard | ❌ No |
| FreeBee123 | 100% off (one-time) | Stripe Dashboard | ❌ No |

**Why they don't work:** Not in the hardcoded `validCoupons` object.

---

## Stripe Products (Working)

✅ **These products ARE configured correctly:**

| Product | Price | Stripe Price ID |
|---------|-------|-----------------|
| Complete Protocol Bundle | $9.99 | `price_1SmnylEVDfkpGz8w4WO79kXd` |
| Doctor Script | $47.00 | `price_1Smny5EVDfkpGz8wDpgDuKKW` |
| 30-Day Meal Plan | $27.00 | `price_1SmnxZEVDfkpGz8wKsduACYH` |
| Shopping Lists | $19.00 | `price_1SmnwoEVDfkpGz8wzdG365qu` |

**Status:** Products exist, prices mapped correctly in code (line 4179-4184)

---

## Testing Gaps

### What Was Tested
✅ Calculator form navigation (Steps 1-3)
✅ Session creation and storage
✅ TEST999 coupon flow (100% discount, bypasses Stripe)
✅ Report generation after "payment"

### What Was NOT Tested
❌ **Real Stripe checkout redirect**
❌ **Real payment processing**
❌ **Stripe success/cancel webhooks**
❌ **Partial discount coupons** (10%, 20%, etc.)
❌ **Full-price checkout** (no coupon)
❌ **Stripe promotion codes**

---

## Impact

### Business Impact
- **Cannot track coupon usage** (no Stripe analytics)
- **Cannot limit redemptions** (e.g., "100 uses only")
- **Cannot expire coupons** without code deployment
- **Cannot A/B test discount strategies** (requires code changes)
- **Cannot create influencer-specific codes** dynamically

### Technical Debt
- **Code deployment required** for every coupon change
- **Hardcoded validation** creates single point of failure
- **No audit trail** for discount usage
- **Potential revenue loss** if Stripe payment flow is broken

---

## Required Actions

### 1. Test Real Stripe Payment (IMMEDIATE)
**Manual test required:**
- Load calculator
- Fill Steps 1 & 2
- Click "Upgrade"
- Enter email, select $9.99 bundle
- **Leave coupon blank**
- Click "Checkout"
- **Verify:** Redirects to Stripe? Shows error?

### 2. Refactor to Stripe Promotion Codes (HIGH PRIORITY)
**Replace hardcoded validation with Stripe API:**
- Create promotion codes in Stripe Dashboard
- Use Stripe API to validate codes dynamically
- Apply codes to checkout session via Stripe
- Remove hardcoded `validCoupons` object

### 3. Create TEST999 in Stripe (TESTING)
**For continued testing:**
- Create "TEST999" promotion code in Stripe
- 100% discount
- Unlimited redemptions
- Never expires

### 4. Deploy and Validate (FINAL)
**End-to-end testing:**
- Deploy updated API
- Test real payment ($9.99)
- Test partial discount (20% off)
- Test 100% discount (TEST999)
- Verify Stripe analytics tracking

---

## Recommended Fix (Option 1)

### Use Stripe Promotion Codes API

**How it works:**
1. Create promotion codes in Stripe Dashboard (or via API)
2. When user enters code, backend validates via Stripe API
3. If valid, pass `promotion_code` ID to Stripe Checkout session
4. Stripe applies discount automatically
5. Stripe tracks all usage/analytics

**Benefits:**
- ✅ No code deployment for new coupons
- ✅ Stripe handles validation, limits, expiration
- ✅ Full analytics and tracking
- ✅ Industry standard approach

**Code changes required:**
- Add Stripe API call to validate promotion code
- Pass `discounts: [{promotion_code: 'promo_xxx'}]` to checkout
- Remove hardcoded `validCoupons` object
- Update frontend to show Stripe validation errors

---

## Timeline Estimate

- **Manual testing:** 15 minutes
- **Refactoring:** 30-45 minutes
- **Creating Stripe promotion codes:** 10 minutes
- **Deployment & testing:** 20 minutes

**Total:** ~90 minutes to fully fix

---

## Next Steps

1. ✅ **Document issues** (this file)
2. ⏳ **Manual test** (waiting for user)
3. ⏳ **Refactor code** (pending test results)
4. ⏳ **Deploy & validate** (final step)

---

## References

- Hardcoded coupons: `api/calculator-api.js:131-140`
- Stripe checkout creation: `api/calculator-api.js:4148-4474`
- Promotion codes enabled: `api/calculator-api.js:4355` (`allow_promotion_codes: true`)
- Stripe MCP connected: Verified Jan 19, 2026
