# Complete Submission Flow: Steps 1-6
**By Leo, Database Architect & Supabase Specialist**

*"Slow is smooth, and smooth is fast. Your data is sacred."*

**Date:** January 3, 2026
**Status:** Final Specification Before Step 6 Implementation
**Philosophy:** "A database is a promise you make to the future. Don't break it."

---

## Table of Contents
1. [Flow Overview](#flow-overview)
2. [Step 1-4: Data Collection](#step-1-4-data-collection)
3. [Step 5: Validation & Payment](#step-5-validation--payment)
4. [Step 6: Payment Processing & Report Generation](#step-6-payment-processing--report-generation)
5. [Database Operations Summary](#database-operations-summary)
6. [API Endpoints Referenced](#api-endpoints-referenced)
7. [Error Handling & Recovery](#error-handling--recovery)
8. [Security & Compliance](#security--compliance)

---

## Flow Overview

### High-Level Journey (22 Fields → Report → Email)

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Physical Stats (5 fields)                           │
│ sex, age, height_feet, height_inches, weight_value          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Fitness & Goals (5 fields)                          │
│ lifestyle_activity, exercise_frequency, goal,               │
│ deficit_percentage, diet_type                               │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Review Macros (2 fields - auto-calculated)          │
│ calories, protein_grams, fat_grams, carbs_grams             │
│ (user views; no new input)                                  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Health Profile (7 fields) - REQUIRES PAYMENT        │
│ email, name, health_conditions, dietary_restrictions,       │
│ lifestyle_notes, goals_details, medical_context             │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Payment Selection & Verification                    │
│ User selects tier (4 options)                               │
│ Stripe payment intent created + checkout                    │
│ User returns with payment success                           │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: Report Generation & Delivery                        │
│ 1. Async Claude API call (2000-5000 word HTML)              │
│ 2. Progress bar shows 5 stages                              │
│ 3. Report stored + access token generated                   │
│ 4. Email sent + link available for 48 hours                 │
│ 5. User downloads PDF or views online                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1-4: Data Collection

### Session Initialization
**Endpoint:** `POST /api/v1/calculator/session`
**Rate:** Unlimited (new user)
**Database Impact:** Creates `calculator_sessions_v2` row

```json
Request:
{
  "referrer": "google.com",
  "utm_source": "facebook",
  "utm_campaign": "carnivore_promo"
}

Response (201):
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "created_at": "2026-01-03T10:30:00Z"
}
```

**Database State After Session Creation:**
```sql
INSERT INTO calculator_sessions_v2 (
  session_id, session_token, step_completed, is_premium,
  payment_status, created_at, updated_at
) VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  0,  -- No steps completed
  false,
  NULL,  -- No payment attempted yet
  NOW(),
  NOW()
);
```

---

### Step 1: Physical Stats (Free)
**Endpoint:** `POST /api/v1/calculator/step/1`
**Rate:** 10 requests per session_token
**Required Fields:** sex, age, height, weight

| Field | Type | Validation | Database Column |
|-------|------|-----------|-----------------|
| sex | enum | 'male' OR 'female' | sex |
| age | integer | 13 <= age <= 150 | age |
| height_feet | integer | 4 <= height_feet <= 7 (if provided) | height_feet |
| height_inches | integer | 0 <= height_inches <= 11 (if provided) | height_inches |
| height_cm | decimal | 120 <= height_cm <= 220 (if provided) | height_cm |
| weight_value | decimal | 30 <= weight_value <= 500 | weight_value |
| weight_unit | enum | 'lbs' OR 'kg' | weight_unit |

**Constraint:** Height must be feet+inches OR cm (not both, not neither)

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "data": {
    "sex": "male",
    "age": 35,
    "height_feet": 5,
    "height_inches": 10,
    "weight_value": 185.5,
    "weight_unit": "lbs"
  }
}

Response (200):
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step": 1,
  "step_completed": 1,
  "message": "Step 1 saved. Proceed to Step 2."
}
```

**Database State After Step 1:**
```sql
UPDATE calculator_sessions_v2 SET
  sex = 'male',
  age = 35,
  height_feet = 5,
  height_inches = 10,
  weight_value = 185.5,
  weight_unit = 'lbs',
  step_completed = 1,
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

---

### Step 2: Fitness & Goals (Free)
**Endpoint:** `POST /api/v1/calculator/step/2`
**Rate:** 10 requests per session_token
**Required Fields:** lifestyle_activity, exercise_frequency, goal, diet_type

| Field | Type | Validation | Database Column |
|-------|------|-----------|-----------------|
| lifestyle_activity | enum | sedentary, light, moderate, very, extreme | lifestyle_activity |
| exercise_frequency | enum | none, 1-2, 3-4, 5-6, 7 | exercise_frequency |
| goal | enum | lose, maintain, gain | goal |
| deficit_percentage | enum | 15, 20, 25 (optional, only if goal='lose') | deficit_percentage |
| diet_type | enum | carnivore, pescatarian, keto, lowcarb | diet_type |

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "data": {
    "lifestyle_activity": "moderate",
    "exercise_frequency": "5-6",
    "goal": "lose",
    "deficit_percentage": 20,
    "diet_type": "carnivore"
  }
}

Response (200):
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step": 2,
  "step_completed": 2,
  "message": "Step 2 saved. Proceed to Step 3."
}
```

**Database State After Step 2:**
```sql
UPDATE calculator_sessions_v2 SET
  lifestyle_activity = 'moderate',
  exercise_frequency = '5-6',
  goal = 'lose',
  deficit_percentage = 20,
  diet_type = 'carnivore',
  step_completed = 2,
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

---

### Step 3: Calculated Macros (Free - Display Only)
**Endpoint:** `POST /api/v1/calculator/step/3`
**Rate:** 10 requests per session_token
**No New Input:** System calculates macros from Steps 1-2 (TDEE, protein target, fat/carb ratios)

**Calculation Logic:**
1. Calculate BMR using Mifflin-St-Jeor: `BMR = 10*weight_kg + 6.25*height_cm - 5*age + (sex=='male' ? 5 : -161)`
2. Calculate TDEE: `TDEE = BMR * activity_multiplier`
3. Apply deficit if goal='lose': `TDEE = TDEE * (1 - deficit_percentage/100)`
4. Calculate macros (carnivore defaults):
   - Protein: 0.7-0.9g per lb of body weight (27-30% of calories)
   - Fat: Fill remainder (~65-70% of calories)
   - Carbs: <20g (~2% of calories)

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}

Response (200):
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step": 3,
  "step_completed": 3,
  "calculated_macros": {
    "calories": 1920,
    "protein_grams": 130,
    "fat_grams": 160,
    "carbs_grams": 18,
    "protein_percentage": 27,
    "fat_percentage": 75,
    "carbs_percentage": 2,
    "calculation_method": "mifflin-st-jeor",
    "activity_multiplier": 1.375,
    "tdee_before_deficit": 2400
  },
  "message": "Macros calculated. Review and proceed to Step 4."
}
```

**Database State After Step 3:**
```sql
UPDATE calculator_sessions_v2 SET
  calculated_macros = jsonb_build_object(
    'calories', 1920,
    'protein_grams', 130,
    'fat_grams', 160,
    'carbs_grams', 18,
    'protein_percentage', 27,
    'fat_percentage', 75,
    'carbs_percentage', 2,
    'calculation_method', 'mifflin-st-jeor',
    'activity_multiplier', 1.375,
    'tdee_before_deficit', 2400
  ),
  step_completed = 3,
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

---

### Step 4: Health Profile (Premium - Requires Payment First)
**Endpoint:** `POST /api/v1/calculator/step/4`
**Rate:** 3 requests per session_token (limited due to payment requirement)
**Constraint:** Only accessible if `is_premium=true` AND `payment_status='completed'`

| Field | Type | Validation | Database Column | Required |
|-------|------|-----------|-----------------|----------|
| email | email | RFC 5322 compliant | email | YES |
| name | string | 2-50 characters, no special chars | name | YES |
| health_conditions | array[string] | Pre-defined list (diabetes, hypertension, autoimmune, etc.) | health_conditions | NO |
| dietary_restrictions | array[string] | Allergies: nut, shellfish, dairy, gluten, sesame | dietary_restrictions | NO |
| lifestyle_notes | text | 0-500 characters, user comments | lifestyle_notes | NO |
| goals_details | text | 0-500 characters, personal goals | goals_details | NO |
| medical_context | text | 0-500 characters, medications, etc. | medical_context | NO |

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "data": {
    "email": "michael@example.com",
    "name": "Michael",
    "health_conditions": ["hypertension"],
    "dietary_restrictions": ["dairy"],
    "lifestyle_notes": "Busy executive, travel 2x/month",
    "goals_details": "Lose 15 lbs while maintaining muscle",
    "medical_context": "On atenolol for BP control"
  }
}

Response (200):
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step": 4,
  "step_completed": 4,
  "message": "Health profile saved. Ready for report generation."
}
```

**Database State After Step 4:**
```sql
UPDATE calculator_sessions_v2 SET
  email = 'michael@example.com',
  name = 'Michael',
  health_conditions = ARRAY['hypertension']::text[],
  dietary_restrictions = ARRAY['dairy']::text[],
  lifestyle_notes = 'Busy executive, travel 2x/month',
  goals_details = 'Lose 15 lbs while maintaining muscle',
  medical_context = 'On atenolol for BP control',
  step_completed = 4,
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

---

## Step 5: Validation & Payment

### Pre-Payment Validation
**Endpoint:** `POST /api/v1/calculator/validate`
**Rate:** 10 requests per session_token
**Purpose:** Validate all form data before payment checkout

**Validation Rules:**
```
1. Steps 1-3: MUST be complete
   - All required fields filled in Steps 1-2
   - Calculated macros available from Step 3

2. Step 4: Email field REQUIRED
   - Must be valid RFC 5322 email
   - Cannot be NULL or empty

3. Step 4: Optional fields are optional
   - name: Can be NULL (will be required during payment)
   - health_conditions, dietary_restrictions, lifestyle_notes,
     goals_details, medical_context: All nullable

4. Payment Tier: Must be selected
   - bundle, meal-plan, shopping, doctor
   - Corresponding Stripe product ID must exist
```

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}

Response (200 - Valid):
{
  "valid": true,
  "message": "All required fields complete. Ready for payment.",
  "steps_completed": 4,
  "user_email": "michael@example.com"
}

Response (400 - Invalid):
{
  "valid": false,
  "errors": [
    {
      "step": 4,
      "field": "email",
      "message": "Email is required for report delivery"
    }
  ]
}
```

---

### Payment Flow

#### 1. Select Payment Tier
**Endpoint:** `POST /api/v1/calculator/payment/tier`
**Rate:** 5 requests per session_token

**Available Tiers:**
| Tier | Price | Stripe ID | Features |
|------|-------|-----------|----------|
| Bundle | $9.99 | price_bundle_xxxxx | Basic macro report + email |
| Meal Plan | $27 | price_meal_plan_xxxxx | Macros + meal plans + recipes |
| Shopping | $19 | price_shopping_xxxxx | Macros + shopping list + prep guide |
| Doctor | $15 | price_doctor_xxxxx | Macros + medical context + drug interactions |

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "tier_slug": "meal-plan"
}

Response (200):
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "tier_slug": "meal-plan",
  "tier_name": "Meal Plan",
  "amount_cents": 2700,
  "amount_display": "$27.00",
  "message": "Tier selected. Proceed to checkout."
}
```

**Database State After Tier Selection:**
```sql
UPDATE calculator_sessions_v2 SET
  tier_slug = 'meal-plan',
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

---

#### 2. Create Payment Intent (via Stripe MCP)
**Endpoint:** `POST /api/v1/calculator/payment/intent`
**Rate:** 5 requests per session_token
**Backend Process:** Creates Stripe payment intent (MCP call)

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "tier_slug": "meal-plan"
}

Response (200):
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "stripe_payment_intent_id": "pi_1Abc123XYZ",
  "client_secret": "pi_1Abc123XYZ_secret_xyz",
  "amount_cents": 2700,
  "currency": "usd",
  "status": "requires_payment_method",
  "checkout_url": "https://checkout.stripe.com/pay/cs_test_abc123",
  "message": "Redirecting to Stripe checkout..."
}
```

**Database State After Intent Creation:**
```sql
UPDATE calculator_sessions_v2 SET
  stripe_payment_intent_id = 'pi_1Abc123XYZ',
  stripe_session_id = NULL,  -- Set after successful payment
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

---

#### 3. User Completes Payment (Stripe Hosted Checkout)
- User redirected to Stripe checkout URL
- User enters payment details securely (PCI compliant - Stripe hosted)
- Stripe processes payment
- User redirected back to success page with `session_id` parameter

**Return URL:** `https://app.example.com/calculator/payment/success?session_id=cs_test_abc123`

---

#### 4. Verify Payment & Activate Premium
**Endpoint:** `POST /api/v1/calculator/payment/verify`
**Rate:** 10 requests per session_token
**Backend Process:** Calls Stripe API to verify payment status

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "stripe_session_id": "cs_test_abc123"
}

Response (200 - Payment Verified):
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "payment_status": "completed",
  "is_premium": true,
  "tier_slug": "meal-plan",
  "amount_paid": 2700,
  "message": "Payment verified! Your report is being generated..."
}

Response (400 - Payment Failed):
{
  "valid": false,
  "payment_status": "failed",
  "message": "Payment could not be verified. Please try again.",
  "error_code": "STRIPE_VERIFICATION_FAILED"
}
```

**Database State After Verification:**
```sql
UPDATE calculator_sessions_v2 SET
  is_premium = true,
  payment_status = 'completed',
  stripe_session_id = 'cs_test_abc123',
  payment_verified_at = NOW(),
  updated_at = NOW()
WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6';
```

**CRITICAL CONSTRAINT:** Step 4 fields are now accessible. If Step 4 fields (email, etc.) were not filled before payment, they MUST be filled now before report generation proceeds.

---

## Step 6: Payment Processing & Report Generation

### Flow Diagram
```
┌─────────────────────────────────────────────────────────────┐
│ Payment Verified (is_premium=true, payment_status=completed)│
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Check Step 4 Completion                           │
│ If Step 4 incomplete, force user to fill email + name       │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ User Clicks "Generate My Report"                            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Finalize Step 4 (if needed)                        │
│ POST /api/v1/calculator/step/4 (final save)                 │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Create Report Row + Access Token                   │
│ INSERT calculator_reports (report_html, access_token, etc)  │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend: Show Progress Bar (5 stages)                      │
│ Stage 1: "Calculating macros..."                            │
│ Stage 2: "Analyzing health profile..."                      │
│ Stage 3: "Generating protocol..."                           │
│ Stage 4: "Personalizing recommendations..."                 │
│ Stage 5: "Finalizing your report..."                        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Async Claude API Call (2000-5000 words)            │
│ - Builds context from calculator_sessions_v2               │
│ - Calls Claude API with personalization prompt              │
│ - Generates HTML report (styled + responsive)               │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Store Report + Update Access Token Expiry          │
│ UPDATE calculator_reports SET report_html, is_generated     │
│ expires_at = NOW() + INTERVAL '48 hours'                    │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Backend: Send Email with Report Link + Token                │
│ Email: "Your Carnivore Weekly Report is Ready"              │
│ Link: https://app.example.com/report/{access_token}         │
│ Subject: Time-limited (48 hours)                            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ Frontend: "Your Report is Ready!"                           │
│ - View online (via access_token)                            │
│ - Download PDF                                              │
│ - Copy share link                                           │
│ - Countdown: "Expires in 48 hours"                          │
└─────────────────────────────────────────────────────────────┘
```

---

### Initialize Report Row
**Endpoint:** `POST /api/v1/calculator/report/init`
**Rate:** 2 requests per session_token (prevent duplicates)

```json
Request:
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}

Response (201 Created):
{
  "report_id": "c87f23a1-9c4b-4b2f-a9f8-1c3d5e7f9a1b",
  "access_token": "7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c",
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "status": "generating",
  "message": "Report generation started. Monitor progress..."
}
```

**Database State After Init:**
```sql
INSERT INTO calculator_reports (
  id, session_id, access_token, report_html, is_generated,
  is_expired, created_at, expires_at
) VALUES (
  'c87f23a1-9c4b-4b2f-a9f8-1c3d5e7f9a1b',
  (SELECT session_id FROM calculator_sessions_v2
   WHERE session_token = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'),
  '7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c',  -- 64-char hex string
  NULL,  -- Will be filled by async Claude call
  false,  -- Not yet generated
  false,  -- Not expired
  NOW(),
  NOW() + INTERVAL '48 hours'
);
```

---

### Backend: Async Report Generation (Claude API)

**Process:** Backend immediately returns to user, begins async Claude API call

**Request Context:** Backend builds full user context from `calculator_sessions_v2`
```json
{
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "user_name": "Michael",
  "user_email": "michael@example.com",
  "step_1": {
    "sex": "male",
    "age": 35,
    "height": "5'10\"",
    "weight": "185.5 lbs"
  },
  "step_2": {
    "lifestyle_activity": "moderate",
    "exercise_frequency": "5-6 times/week",
    "goal": "lose",
    "deficit_percentage": 20,
    "diet_type": "carnivore"
  },
  "step_3": {
    "calories": 1920,
    "protein_grams": 130,
    "fat_grams": 160,
    "carbs_grams": 18
  },
  "step_4": {
    "health_conditions": ["hypertension"],
    "dietary_restrictions": ["dairy"],
    "lifestyle_notes": "Busy executive, travel 2x/month",
    "goals_details": "Lose 15 lbs while maintaining muscle",
    "medical_context": "On atenolol for BP control"
  },
  "tier": "meal-plan"
}
```

**Claude API Call:** Generates 2000-5000 word HTML report per `/docs/REPORT_GENERATION_SPEC.md`

**Report Content (21 Sections):**
1. Personalized Header (name, goals)
2. Executive Summary (3 sentences)
3. Your Profile (age, weight, BMR, TDEE)
4. Macronutrient Targets (table with daily/weekly)
5. Carnivore Protocol (food list)
6. Meal Planning Guide (tier-dependent)
7. Recipes (tier-dependent)
8. Shopping List (tier-dependent)
9. Meal Prep Tips
10. Weekly Meal Template
11. Nutrition Timing
12. Hydration & Electrolytes
13. Supplement Stack (optional)
14. Exercise Recommendations
15. Tracking & Progress
16. Common Challenges & Solutions
17. FAQ
18. Safety Notes (medical disclaimers)
19. When to Consult Medical Professional
20. Resources & Further Reading
21. Access Expiry Notification

---

### Store Generated Report

**Database State After Generation:**
```sql
UPDATE calculator_reports SET
  report_html = '<html>...full report HTML...</html>',
  is_generated = true,
  generated_at = NOW(),
  updated_at = NOW()
WHERE id = 'c87f23a1-9c4b-4b2f-a9f8-1c3d5e7f9a1b';

-- Log access for audit trail
INSERT INTO calculator_report_access_log (
  report_id, access_type, ip_address, user_agent, accessed_at
) VALUES (
  'c87f23a1-9c4b-4b2f-a9f8-1c3d5e7f9a1b',
  'generated',
  '192.168.1.1',
  'Mozilla/5.0...',
  NOW()
);
```

---

### Email Delivery

**Backend Sends Email** (async, after report generation)

**Email Template:**
```
Subject: Your Carnivore Weekly Report is Ready!

Dear Michael,

Your personalized Carnivore Weekly Report has been generated and is ready for download.

DOWNLOAD YOUR REPORT:
https://app.example.com/report/7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c

IMPORTANT:
- This link expires in 48 hours (Jan 5, 2026 at 10:30 AM)
- After expiration, run the calculator again to generate a new report
- Reports are private and only accessible via this secure token

WHAT'S IN YOUR REPORT:
- Personalized macro targets (1920 cal, 130g protein, 160g fat)
- Meal plans & recipes (Meal Plan tier)
- Shopping list & prep guide (Shopping tier)
- Medical context & drug interactions (Doctor tier)

Questions? Contact us at support@carnivoreweekly.com

Best regards,
The Carnivore Weekly Team
```

**Database State After Email:**
```sql
INSERT INTO email_log (
  report_id, recipient_email, subject, status, sent_at
) VALUES (
  'c87f23a1-9c4b-4b2f-a9f8-1c3d5e7f9a1b',
  'michael@example.com',
  'Your Carnivore Weekly Report is Ready!',
  'sent',
  NOW()
);
```

---

### Post-Generation: Report Access & Expiry

#### View Report Online
**Endpoint:** `GET /api/v1/calculator/report/{access_token}`
**Rate:** 100 requests per access_token
**Response:** HTML report (set Content-Type: text/html)

```
Request:
GET /api/v1/calculator/report/7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c
Accept: text/html

Response (200):
Content-Type: text/html
Content-Length: 45320
Expires: Sun, 05 Jan 2026 10:30:00 GMT

<html>
  <head>
    <title>Your Carnivore Weekly Report - Michael</title>
    <style>... responsive CSS ...</style>
  </head>
  <body>
    ... full report HTML ...
  </body>
</html>
```

**Database State After Access:**
```sql
INSERT INTO calculator_report_access_log (
  report_id, access_type, ip_address, user_agent, accessed_at
) VALUES (
  'c87f23a1-9c4b-4b2f-a9f8-1c3d5e7f9a1b',
  'online_view',
  '192.168.1.1',
  'Mozilla/5.0...',
  NOW()
);
```

---

#### Download PDF
**Endpoint:** `GET /api/v1/calculator/report/{access_token}/pdf`
**Rate:** 10 requests per access_token
**Response:** PDF file (Content-Disposition: attachment)

```
Request:
GET /api/v1/calculator/report/7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c/pdf

Response (200):
Content-Type: application/pdf
Content-Disposition: attachment; filename="Carnivore_Weekly_Report_Michael_2026-01-03.pdf"
Content-Length: 123456

%PDF-1.4
... PDF binary ...
```

**Backend Process:** Converts HTML report to PDF using headless browser (e.g., Puppeteer/wkhtmltopdf)

**Database State After Download:**
```sql
INSERT INTO calculator_report_access_log (
  report_id, access_type, ip_address, user_agent, accessed_at
) VALUES (
  'c87f23a1-9c4b-4b2f-a9f8-1c3d5e7f9a1b',
  'pdf_download',
  '192.168.1.1',
  'Mozilla/5.0...',
  NOW()
);
```

---

#### Share Report (Extend Access)
**Endpoint:** `POST /api/v1/calculator/report/{access_token}/share`
**Rate:** 5 requests per access_token
**Purpose:** Generate shareable link (optional, maintains same token)

```json
Request:
{
  "access_token": "7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c",
  "recipient_emails": ["friend@example.com"]
}

Response (200):
{
  "access_token": "7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c",
  "share_url": "https://app.example.com/report/7a9f2c1e3d5b8a4f6e9c2d4b1a7f3e5c",
  "expires_at": "2026-01-05T10:30:00Z",
  "message": "Share link copied to clipboard"
}
```

---

#### Report Expiration
**Scheduled Job:** Runs every hour, soft-deletes expired reports

```sql
UPDATE calculator_reports SET
  is_expired = true,
  expired_at = NOW()
WHERE expires_at < NOW() AND is_expired = false;

-- User sees "Your report has expired" message
-- Offer: "Run calculator again to generate a new report"
```

---

### Progress Bar (5 Stages)

**Frontend displays progress as report is being generated:**

```
Stage 1 (0-20%): "Calculating macros..."
  Backend calculates TDEE, protein targets, adjustments

Stage 2 (20-40%): "Analyzing health profile..."
  Backend loads health conditions, restrictions, medical context

Stage 3 (40-60%): "Generating protocol..."
  Claude API call begins, generates first sections

Stage 4 (60-80%): "Personalizing recommendations..."
  Claude API completes sections 6-15

Stage 5 (80-100%): "Finalizing your report..."
  Claude API completes final sections, HTML styled, ready to store

[SUCCESS] "Your report is ready! Download below."
```

**Backend Implementation:**
- Use WebSocket or Server-Sent Events (SSE) for real-time progress updates
- Each stage sends event: `{ "stage": 1-5, "message": "..." }`
- Frontend updates progress bar accordingly

---

## Database Operations Summary

### Tables Involved

#### 1. calculator_sessions_v2
**Purpose:** Single source of truth for all form data across Steps 1-4

```sql
INSERT INTO calculator_sessions_v2 (
  session_id, session_token, step_completed, is_premium,
  payment_status, created_at, updated_at,
  -- Step 1
  sex, age, height_feet, height_inches, height_cm,
  weight_value, weight_unit,
  -- Step 2
  lifestyle_activity, exercise_frequency, goal,
  deficit_percentage, diet_type,
  -- Step 3
  calculated_macros,
  -- Step 4
  email, name, health_conditions, dietary_restrictions,
  lifestyle_notes, goals_details, medical_context,
  -- Payment
  tier_slug, stripe_payment_intent_id, stripe_session_id,
  payment_verified_at
) VALUES (...)
RETURNING *;
```

#### 2. calculator_reports
**Purpose:** Stores generated reports + access tokens + expiry

```sql
INSERT INTO calculator_reports (
  id, session_id, access_token, report_html,
  is_generated, is_expired, created_at,
  generated_at, expires_at, expired_at, updated_at
) VALUES (...)
RETURNING *;
```

#### 3. calculator_report_access_log
**Purpose:** Audit trail for all report accesses

```sql
INSERT INTO calculator_report_access_log (
  id, report_id, access_type, ip_address,
  user_agent, accessed_at
) VALUES (
  gen_random_uuid(),
  'c87f23a1-9c4b-4b2f-a9f8-1c3d5e7f9a1b',
  'online_view' | 'pdf_download' | 'generated',
  '192.168.1.1',
  'Mozilla/5.0...',
  NOW()
)
RETURNING *;
```

#### 4. payment_tiers
**Purpose:** Pricing + feature definitions

```sql
SELECT * FROM payment_tiers
WHERE tier_slug = 'meal-plan' AND is_active = true;
```

#### 5. email_log (optional but recommended)
**Purpose:** Track email delivery

```sql
INSERT INTO email_log (
  id, report_id, recipient_email, subject,
  status, sent_at
) VALUES (...)
RETURNING *;
```

---

## API Endpoints Referenced

### Session & Form Data
- `POST /api/v1/calculator/session` - Create session
- `POST /api/v1/calculator/step/1` - Save physical stats
- `POST /api/v1/calculator/step/2` - Save fitness goals
- `POST /api/v1/calculator/step/3` - Calculate macros
- `POST /api/v1/calculator/step/4` - Save health profile
- `POST /api/v1/calculator/validate` - Validate all data

### Payment
- `POST /api/v1/calculator/payment/tier` - Select payment tier
- `POST /api/v1/calculator/payment/intent` - Create Stripe intent
- `POST /api/v1/calculator/payment/verify` - Verify payment + activate premium

### Report
- `POST /api/v1/calculator/report/init` - Initialize report generation
- `GET /api/v1/calculator/report/{access_token}` - View report HTML
- `GET /api/v1/calculator/report/{access_token}/pdf` - Download PDF
- `POST /api/v1/calculator/report/{access_token}/share` - Generate share link
- `GET /api/v1/calculator/report/{access_token}/progress` - Check generation progress (SSE)

**Base URL:** `https://api.example.com/api/v1/calculator`

---

## Error Handling & Recovery

### Validation Errors (4xx)
```
400 MISSING_REQUIRED_FIELD
  Field: "email" (Step 4)
  Message: "Email is required for report delivery"

400 INVALID_EMAIL_FORMAT
  Field: "email"
  Message: "Email must be valid RFC 5322 format"

400 PAYMENT_REQUIRED
  Message: "Step 4 requires payment. Complete payment first."

400 STEP_NOT_COMPLETE
  Message: "Step {n} must be completed before proceeding"
```

### Payment Errors
```
400 STRIPE_PAYMENT_FAILED
  Message: "Payment was declined. Please try another card."
  Details: { stripe_error_code: "card_declined" }

400 STRIPE_VERIFICATION_FAILED
  Message: "Payment could not be verified. Session may have expired."
  Remedy: "Try payment again or contact support"

500 PAYMENT_PROCESSING_ERROR
  Message: "Payment processing error on our end. Please retry."
  Retry: true
```

### Report Generation Errors
```
500 CLAUDE_API_ERROR
  Message: "Report generation failed. Please try again."
  Remedy: "Retry button + contact support if persistent"

500 HTML_STORAGE_ERROR
  Message: "Report could not be stored. Please try again."
  Remedy: "Automatic retry (3x) + notify admin

500 EMAIL_DELIVERY_ERROR
  Message: "Email could not be sent, but report is ready online."
  Remedy: "Resend email button + download directly from site"
```

### Recovery Strategies
```
1. All POST requests are idempotent (using session_token)
   - Retry same request = safe, no duplicates

2. Report generation retries automatically (3x) before failing

3. Email delivery retries hourly for 24 hours

4. Users can always re-generate report (soft limit: 2x per 24h)
   - Creates new calculator_reports row with new access_token
```

---

## Security & Compliance

### Row-Level Security (RLS)

#### calculator_sessions_v2
```sql
-- Users can only see their own session
CREATE POLICY "Users see own session" ON calculator_sessions_v2
  FOR SELECT
  USING (session_id = auth.uid());  -- Assumes session_id = auth.uid()

-- Prevent users from updating payment fields directly
CREATE POLICY "No direct payment updates" ON calculator_sessions_v2
  FOR UPDATE
  USING (auth.uid() = session_id)
  WITH CHECK (
    -- Allow: Update of form fields
    -- Deny: Direct manipulation of is_premium, payment_status
    session_id = auth.uid()
    AND stripe_payment_intent_id IS NOT DISTINCT FROM OLD.stripe_payment_intent_id
  );
```

#### calculator_reports
```sql
-- Users can only view their own reports via access_token
CREATE POLICY "Users see own reports via token" ON calculator_reports
  FOR SELECT
  USING (
    access_token = current_setting('app.access_token')::text
    OR session_id = auth.uid()
  );

-- Reports are immutable after generation
CREATE POLICY "Reports are immutable" ON calculator_reports
  FOR UPDATE
  USING (false);  -- No updates allowed
```

#### calculator_report_access_log
```sql
-- Append-only, no user access
-- Admin-only for auditing
```

### Data Encryption
```
- Payment data: Stripe handles PCI compliance (no card storage locally)
- Email: Encrypted at rest in Supabase
- Reports: Accessible via secure access_token (not guessable)
  - Token format: 64-char hex string (2^256 possibilities)
```

### Rate Limiting
```
Session creation: Unlimited (new user)
Form submissions: 10 requests per session per endpoint
Validation: 10 requests per session
Payment: 5 requests per session (prevent loops)
Report access: 100 requests per access_token
```

### Privacy & GDPR
```
- No tracking of personally identifiable information (PII)
  except email (required for report delivery)
- Reports soft-expire after 48 hours (auto cleanup)
- Access logs retained for 90 days (audit trail)
- Users can request deletion via GDPR compliance endpoint
```

---

## Summary: End-to-End Flow

```
User Journey:
1. Creates session (1 row in calculator_sessions_v2)
2. Completes Step 1 (height, weight, age, sex)
3. Completes Step 2 (goals, activity, diet)
4. Reviews Step 3 (calculated macros)
5. Selects payment tier
6. Completes Stripe payment
7. Completes Step 4 (email, health profile)
8. Clicks "Generate My Report"
9. Waits 30-60 seconds (async Claude call)
10. Views report online OR downloads PDF
11. Shares report link (valid 48 hours)
12. Report expires, user re-runs calculator

Database State:
- calculator_sessions_v2: 1 row (all form data)
- calculator_reports: 1 row (report HTML + token)
- calculator_report_access_log: N rows (audit trail)
- payment_tiers: 4 rows (pre-configured)
- email_log: 1 row (delivery tracking)

Security:
- ACID transactions (all-or-nothing)
- RLS policies (user isolation)
- Access tokens (non-guessable)
- Rate limiting (DOS prevention)
- Immutable reports (audit trail)
```

---

**Status:** Complete Specification Ready for Alex Implementation

"A database is a promise you make to the future. Don't break it."
— Leo, Database Architect
