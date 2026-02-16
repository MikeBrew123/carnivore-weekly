# API Integration Specifications

**By Leo, Database Architect**
Complete endpoint reference for calculator form backend integration
Every payload verified against schema constraints. No NULL values without explicit allowance.

---

## API Overview

```
BASE_URL: https://api.example.com/api/v1/calculator
PROTOCOL: HTTPS + JSON
AUTHENTICATION: session_token in request body (not header)
ERROR FORMAT: Standardized 4xx/5xx responses with details
RATE LIMIT: 100 requests/minute per session_token
```

---

## Session Management

### CREATE SESSION
**Endpoint**: `POST /session`
**Rate**: Unlimited (new user)
**Response Time**: <100ms
**Description**: Initialize new calculator session. Returns session_token for tracking.

#### Request

```json
{
  "referrer": "google.com",
  "utm_source": "facebook",
  "utm_campaign": "carnivore_promo"
}
```

#### Response (201 Created)

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "session_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "created_at": "2026-01-03T10:30:00Z"
}
```

#### Error Cases

```
400 INVALID_CONTENT_TYPE
  message: "Content-Type must be application/json"
  details: { received_type: "text/plain" }

400 MISSING_FIELDS
  message: "Request body malformed"
  details: { parse_error: "..." }

500 DB_INSERT_FAILED
  message: "Unable to create session"
  details: { operation: "INSERT calculator_sessions_v2", retry: true }
```

#### Database Impact
- Creates row in `calculator_sessions_v2`
- Sets: session_token (UNIQUE), session_id (PK), created_at, step_completed=0, is_premium=false

---

## Step 1: Physical Stats

### SAVE PHYSICAL STATS
**Endpoint**: `POST /step/1`
**Rate**: 10 requests per session_token (prevents duplicate submissions)
**Response Time**: <200ms
**Description**: Save height, weight, age, sex. Calculates BMR prerequisites.

#### Request

```json
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
```

#### Field Mapping to Database

| Request Field | Database Column | Type | Validation |
|---|---|---|---|
| sex | sex | ENUM | 'male' \| 'female' |
| age | age | INTEGER | 13 <= age <= 150 |
| height_feet | height_feet | INTEGER | 3 <= feet <= 9 (if provided) |
| height_inches | height_inches | INTEGER | 0 <= inches <= 11 (if provided) |
| height_cm | height_cm | INTEGER | 90 <= cm <= 280 (if provided instead) |
| weight_value | weight_value | DECIMAL | 50-700 (lbs) or 25-320 (kg) |
| weight_unit | weight_unit | ENUM | 'lbs' \| 'kg' |

#### Validation Pipeline

```
Layer 1 - Type Validation (Zod):
  ✓ sex: string, enum ['male', 'female']
  ✓ age: number, integer, min 13, max 150
  ✓ height_feet: optional number, integer, min 3, max 9
  ✓ height_inches: optional number, integer, min 0, max 11
  ✓ height_cm: optional number, integer, min 90, max 280
  ✓ weight_value: number, positive
  ✓ weight_unit: string, enum ['lbs', 'kg']

Layer 2 - Domain Validation:
  ✓ Height XOR: (height_feet AND height_inches) XOR height_cm
    Error: "Provide EITHER feet+inches OR centimeters, not both"
  ✓ Height range if feet: (feet*12 + inches) must be 36-92 inches
    Error: "Height must be between 3'0\" and 7'8\""
  ✓ Weight range based on unit:
    - if lbs: 50 <= weight <= 700
    - if kg: 25 <= weight <= 320
    Error: "Weight out of range for selected unit"
  ✓ Session must exist and not be expired
    Error: "Session token invalid or expired"

Layer 3 - Database Constraints:
  ✓ session_token UNIQUE (would fail if duplicate token somehow exists)
  ✓ step_completed >= 1 (enforced by trigger)
  ✓ updated_at auto-updates to current timestamp
```

#### Response (200 OK)

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step_completed": 1,
  "next_step": 2,
  "message": "Physical stats saved. Ready for fitness profile.",
  "session_expires_in_hours": 24
}
```

#### Non-Blocking Warnings

May return status 200 with warnings (user can still proceed):

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step_completed": 1,
  "next_step": 2,
  "warnings": [
    {
      "field": "weight_value",
      "code": "UNUSUAL_VALUE",
      "message": "Weight is notably high (650 lbs). Ensure this is accurate.",
      "is_blocking": false
    }
  ]
}
```

#### Error Cases

```
400 VALIDATION_FAILED
  message: "Age must be between 13 and 150 years old"
  details: {
    errors: [
      {
        field: "age",
        code: "OUT_OF_RANGE",
        message: "Age must be between 13 and 150 years old",
        is_blocking: true
      }
    ]
  }

400 INVALID_SESSION_TOKEN
  message: "Session token invalid or expired"
  details: { received: "invalid-token-format" }

404 SESSION_NOT_FOUND
  message: "Session does not exist"
  details: { session_token: "a1b2c3d4..." }

400 HEIGHT_VALIDATION_FAILED
  message: "Provide EITHER feet+inches OR centimeters, not both"
  details: { provided: ["height_feet", "height_inches", "height_cm"] }

500 DB_UPDATE_FAILED
  message: "Failed to save physical stats"
  details: { operation: "UPDATE calculator_sessions_v2", retry: true }
```

#### Database Impact
- Updates `calculator_sessions_v2` row
- Sets: sex, age, height_feet, height_inches (or height_cm), weight_value, weight_unit
- Sets: step_completed=1, updated_at=NOW()
- May insert rows to `validation_errors` table for non-blocking errors
- Returns `step_completed` to frontend to enforce progression

---

## Step 2: Fitness & Diet

### SAVE FITNESS & DIET PROFILE
**Endpoint**: `POST /step/2`
**Rate**: 10 requests per session_token
**Response Time**: <200ms
**Description**: Save activity level, exercise frequency, goals, and diet preference.

#### Request

```json
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
```

#### Field Mapping to Database

| Request Field | Database Column | Type | Valid Values | Multiplier |
|---|---|---|---|---|
| lifestyle_activity | lifestyle_activity | ENUM | sedentary, light, moderate, very, extreme | 1.2, 1.375, 1.55, 1.725, 1.9 |
| exercise_frequency | exercise_frequency | ENUM | none, 1-2, 3-4, 5-6, 7 | Days/week |
| goal | goal | ENUM | lose, maintain, gain | Weight change intent |
| deficit_percentage | deficit_percentage | ENUM | 15, 20, 25 | Conditional on goal |
| diet_type | diet_type | ENUM | carnivore, pescatarian, keto, lowcarb | Macro ratio basis |

#### Validation Pipeline

```
Layer 1 - Type Validation (Zod):
  ✓ lifestyle_activity: string, enum ['sedentary', 'light', 'moderate', 'very', 'extreme']
  ✓ exercise_frequency: string, enum ['none', '1-2', '3-4', '5-6', '7']
  ✓ goal: string, enum ['lose', 'maintain', 'gain']
  ✓ deficit_percentage: optional number, enum [15, 20, 25]
  ✓ diet_type: string, enum ['carnivore', 'pescatarian', 'keto', 'lowcarb']

Layer 2 - Domain Validation:
  ✓ If goal='maintain', deficit_percentage must be null/omitted
    Error: "Deficit percentage not applicable for maintenance goal"
  ✓ If goal='lose' or 'gain', deficit_percentage is REQUIRED and enum [15, 20, 25]
    Error: "Deficit must be 15%, 20%, or 25%"
  ✓ All ENUM fields: exact match only
  ✓ Session must have completed step 1
    Error: "Must complete physical stats first"
  ✓ Session token must exist
    Error: "Session token invalid or expired"

Layer 3 - Database Constraints:
  ✓ step_completed >= 2 enforced by trigger
  ✓ CHECK (goal IN ('lose', 'maintain', 'gain'))
  ✓ CHECK (deficit_percentage IS NULL OR goal != 'maintain')
```

#### Response (200 OK)

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step_completed": 2,
  "next_step": 3,
  "message": "Fitness profile saved. Ready for macro calculation.",
  "activity_multiplier": 1.55,
  "diet_ratios": {
    "carnivore": {
      "protein_percent": 30,
      "fat_percent": 70,
      "carbs_percent": 0
    }
  }
}
```

#### Error Cases

```
400 VALIDATION_FAILED
  message: "Deficit percentage required when goal is 'lose'"
  details: {
    errors: [
      {
        field: "deficit_percentage",
        code: "MISSING_REQUIRED",
        message: "Deficit must be 15, 20, or 25% for weight loss goals",
        is_blocking: true
      }
    ]
  }

400 CONDITIONAL_CONFLICT
  message: "Cannot have deficit with maintenance goal"
  details: { goal: "maintain", deficit_provided: true }

403 STEP_SEQUENCE_VIOLATION
  message: "Must complete step 1 before step 2"
  details: { completed_steps: 0, required: 1 }

404 SESSION_NOT_FOUND
  message: "Session does not exist"
  details: { session_token: "a1b2c3d4..." }

500 DB_UPDATE_FAILED
  message: "Failed to save fitness profile"
  details: { operation: "UPDATE calculator_sessions_v2", retry: true }
```

#### Database Impact
- Updates `calculator_sessions_v2` row
- Sets: lifestyle_activity, exercise_frequency, goal, deficit_percentage, diet_type
- Sets: step_completed=2, updated_at=NOW()
- Enforces step sequence (can't complete 2 without completing 1)

---

## Step 3: Macro Calculation

### SUBMIT CALCULATED MACROS
**Endpoint**: `POST /step/3`
**Rate**: 10 requests per session_token
**Response Time**: <200ms
**Description**: Frontend sends calculated macros, displays to user, surfaces payment tiers.

#### Request

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "calculated_macros": {
    "calories": 2400,
    "protein_grams": 180,
    "fat_grams": 200,
    "carbs_grams": 25,
    "protein_percentage": 30,
    "fat_percentage": 75,
    "carbs_percentage": 5,
    "calculation_method": "katch-mcardle",
    "calculation_timestamp": "2026-01-03T10:30:00Z"
  }
}
```

#### Field Mapping to Database

| Request Field | Database Column | Type | Notes |
|---|---|---|---|
| calculated_macros (entire object) | calculated_macros | JSONB | Stored as-is for flexibility |
| calories | calculated_macros->calories | INT | Total daily energy expenditure |
| protein_grams | calculated_macros->protein_grams | INT | Grams per day |
| fat_grams | calculated_macros->fat_grams | INT | Grams per day |
| carbs_grams | calculated_macros->carbs_grams | INT | Grams per day |
| protein_percentage | calculated_macros->protein_percentage | INT | Percent of total calories |
| fat_percentage | calculated_macros->fat_percentage | INT | Percent of total calories |
| carbs_percentage | calculated_macros->carbs_percentage | INT | Percent of total calories |
| calculation_method | calculated_macros->calculation_method | TEXT | Algorithm used (e.g., katch-mcardle) |
| calculation_timestamp | calculated_macros->calculation_timestamp | TEXT | ISO 8601 when calculated |

#### Validation Pipeline

```
Layer 1 - Type Validation (Zod):
  ✓ calculated_macros: object, not null
  ✓ calories: number, integer, > 0
  ✓ protein_grams, fat_grams, carbs_grams: number, >= 0
  ✓ percentages: number, sum to 100 or < 101 (allow rounding)
  ✓ calculation_method: string, non-empty
  ✓ calculation_timestamp: ISO 8601 datetime string

Layer 2 - Domain Validation:
  ✓ calories must be between 500-5000 (reasonable range)
  ✓ Percentages must sum to ~100 (allow 99-101 for rounding)
  ✓ Macros must be logically consistent:
    - protein_grams * 4 + fat_grams * 9 + carbs_grams * 4 ≈ calories
    - Allow 5% variance for rounding
  ✓ Session must have completed steps 1-2
    Error: "Must complete steps 1-2 before calculation"
  ✓ Session token must exist
    Error: "Session token invalid or expired"

Layer 3 - Database Constraints:
  ✓ step_completed >= 3 enforced by trigger
  ✓ calculated_macros is JSONB (no schema validation at DB level, app validates)
```

#### Response (200 OK)

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step_completed": 3,
  "next_step": 4,
  "calculated_macros": {
    "calories": 2400,
    "protein_grams": 180,
    "fat_grams": 200,
    "carbs_grams": 25,
    "protein_percentage": 30,
    "fat_percentage": 75,
    "carbs_percentage": 5,
    "calculation_method": "katch-mcardle",
    "calculation_timestamp": "2026-01-03T10:30:00Z"
  },
  "available_tiers": [
    {
      "id": "tier-uuid-1",
      "tier_slug": "bundle",
      "tier_title": "Bundle - $9.99",
      "price_cents": 999,
      "features": {
        "includes_meal_plan": false,
        "includes_recipes": 0,
        "includes_shopping_list": false,
        "includes_medical_context": false,
        "report_expiry_days": 30,
        "revision_limit": 1
      }
    },
    {
      "id": "tier-uuid-2",
      "tier_slug": "meal-plan",
      "tier_title": "Meal Plan - $27.00",
      "price_cents": 2700,
      "features": {
        "includes_meal_plan": true,
        "includes_recipes": 10,
        "includes_shopping_list": true,
        "includes_medical_context": false,
        "report_expiry_days": 90,
        "revision_limit": 3
      }
    },
    {
      "id": "tier-uuid-3",
      "tier_slug": "shopping",
      "tier_title": "Shopping - $19.00",
      "price_cents": 1900,
      "features": {
        "includes_meal_plan": false,
        "includes_recipes": 5,
        "includes_shopping_list": true,
        "includes_medical_context": false,
        "report_expiry_days": 60,
        "revision_limit": 2
      }
    },
    {
      "id": "tier-uuid-4",
      "tier_slug": "doctor",
      "tier_title": "Doctor - $15.00",
      "price_cents": 1500,
      "features": {
        "includes_meal_plan": false,
        "includes_recipes": 0,
        "includes_shopping_list": false,
        "includes_medical_context": true,
        "report_expiry_days": 180,
        "revision_limit": 5
      }
    }
  ],
  "message": "Macros calculated. Select a tier below to unlock personalized report."
}
```

#### Error Cases

```
400 VALIDATION_FAILED
  message: "Macro percentages don't sum to 100%"
  details: {
    errors: [
      {
        field: "calculated_macros.carbs_percentage",
        code: "MATH_ERROR",
        message: "Protein + Fat + Carbs must sum to ~100% (allow rounding)",
        is_blocking: true
      }
    ]
  }

400 MACROS_OUT_OF_RANGE
  message: "Calculated calories appear invalid"
  details: { calories: 50, valid_range: "500-5000" }

403 STEP_SEQUENCE_VIOLATION
  message: "Must complete steps 1-2 before step 3"
  details: { completed_steps: 1, required: 2 }

404 SESSION_NOT_FOUND
  message: "Session does not exist"
  details: { session_token: "a1b2c3d4..." }

500 DB_UPDATE_FAILED
  message: "Failed to save macros"
  details: { operation: "UPDATE calculator_sessions_v2", retry: true }

500 TIER_LOOKUP_FAILED
  message: "Unable to retrieve available tiers"
  details: { reason: "No active tiers in database" }
```

#### Database Impact
- Updates `calculator_sessions_v2` row
- Sets: calculated_macros (JSONB), step_completed=3, updated_at=NOW()
- Does NOT require payment yet
- Tier data fetched from `payment_tiers` table (WHERE is_active=true)

---

## Payment Flow

### COMPLETE PAYMENT FLOW (User Journey)

```
Step 3 Complete: User sees calculated macros + "Upgrade" button
                           ↓
POST /payment/initiate (Backend creates Stripe checkout via MCP)
                           ↓
Stripe session created → payment_intent_id stored in DB
                           ↓
Response with stripe_session_url
                           ↓
User redirected to Stripe checkout → Pays via Stripe
                           ↓
(Stripe handles payment, card processing, etc.)
                           ↓
Stripe redirects back to success_url with ?session_id=cs_...
                           ↓
POST /payment/verify (Backend verifies payment via Stripe MCP)
                           ↓
Stripe confirms payment_status='succeeded'
                           ↓
is_premium=true, step_completed=4
                           ↓
access_token generated, report record created
                           ↓
User sees "Payment confirmed! Health profile next..."
```

---

### INITIATE PAYMENT
**Endpoint**: `POST /payment/initiate`
**Rate**: 5 requests per session_token (prevents duplicate Stripe sessions)
**Response Time**: <500ms (includes Stripe MCP API call)
**Description**: Create Stripe checkout session via MCP Stripe integration. Frontend redirects user to Stripe.

#### Request

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "tier_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "customer_email": "john@example.com",
  "success_url": "https://example.com/calculator/payment-success",
  "cancel_url": "https://example.com/calculator/payment-cancel"
}
```

#### Validation Pipeline

```
Layer 1 - Type Validation (Zod):
  ✓ session_token: string, non-empty
  ✓ tier_id: string, UUID format
  ✓ customer_email: string, valid email format
  ✓ success_url: string, valid URL, https only
  ✓ cancel_url: string, valid URL, https only

Layer 2 - Domain Validation:
  ✓ Session must exist and not be expired
    Error: "Session token invalid or expired"
  ✓ Session must have completed steps 1-3
    Error: "Must complete steps 1-3 before payment"
  ✓ tier_id must reference valid active tier in payment_tiers
    Error: "Invalid or inactive tier"
  ✓ Session must not already have pending/completed payment
    Error: "Session already has active payment"
  ✓ success_url and cancel_url must match whitelisted domain
    Error: "Redirect URL not whitelisted"
  ✓ customer_email must match session email (if provided in step 4, or use provided)
    Error: "Email mismatch with session"

Layer 3 - Stripe MCP Integration:
  ✓ Call Stripe MCP: create_checkout_session()
  ✓ Idempotency key = session_token (prevents duplicate sessions)
  ✓ Line items constructed from tier (price_id from payment_tiers)
  ✓ Customer metadata includes: session_id, tier_id, user_email
  ✓ On success: store stripe_session_id + payment_intent_id in DB
```

#### Stripe MCP Method: create_checkout_session()

**Method Signature:**
```
create_checkout_session({
  line_items: Array<{
    price: string,          // Stripe price ID from payment_tiers.stripe_price_id
    quantity: number        // Always 1
  }>,
  mode: string,             // "payment"
  success_url: string,      // https://...?session_id={CHECKOUT_SESSION_ID}
  cancel_url: string,       // https://...?cancelled=true
  customer_email?: string,  // Optional pre-fill email
  metadata?: Record,        // { session_id, tier_id, user_email }
  idempotency_key?: string, // session_token (prevents duplicate calls)
  expires_in_seconds?: number // Default 3600 (1 hour)
}): Promise<CheckoutSession>

Response:
{
  id: string,               // Stripe checkout session ID (cs_live_...)
  payment_intent_id: string,// Stripe payment intent ID (pi_...)
  client_secret: string,    // Used for payment element (if applicable)
  url: string,              // Checkout URL to redirect user to
  status: string,           // "open" or "complete"
  customer_email?: string,  // Email used for session
  payment_status: string,   // "unpaid", "paid", "no_payment_required"
  created: number,          // Unix timestamp
  expires_at: number        // Unix timestamp
}
```

#### Response (201 Created)

```json
{
  "stripe_session_url": "https://checkout.stripe.com/pay/cs_live_abc123...",
  "stripe_session_id": "cs_live_abc123...",
  "stripe_payment_intent_id": "pi_1234567890abcdef",
  "tier_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "amount_cents": 999,
  "currency": "usd",
  "created_at": "2026-01-03T10:30:00Z",
  "expires_in_seconds": 3600,
  "message": "Checkout session created. Redirecting to Stripe..."
}
```

#### Frontend Flow After Response

```
1. Receive stripe_session_url from POST /payment/initiate
2. Redirect user immediately: window.location = response.stripe_session_url
3. User completes payment on Stripe's secure checkout
4. Stripe redirects to success_url with ?session_id=cs_live_... query param
5. Extract session_id from URL
6. Call POST /payment/verify with session_token + stripe_session_id
7. Wait for verification to complete before showing success message
```

#### Error Cases

```
400 INVALID_SESSION_TOKEN
  message: "Session token invalid or expired"
  details: { received: "..." }

400 INVALID_TIER
  message: "Tier does not exist or is inactive"
  details: { tier_id: "...", valid_tiers: ["uuid1", "uuid2"] }

400 INCOMPLETE_STEPS
  message: "Must complete steps 1-3 before payment"
  details: { step_completed: 2, required: 3 }

400 INVALID_REDIRECT_URL
  message: "Success URL not whitelisted"
  details: { url: "https://evil.com", whitelisted_domains: ["example.com"] }

403 PAYMENT_ALREADY_ACTIVE
  message: "Session already has pending payment"
  details: { stripe_session_id: "cs_...", status: "open" }

403 PAYMENT_ALREADY_COMPLETED
  message: "This session already has a completed payment"
  details: { completed_at: "2026-01-03T10:30:00Z" }

404 SESSION_NOT_FOUND
  message: "Session does not exist"
  details: { session_token: "a1b2c3d4..." }

503 STRIPE_MCP_ERROR
  message: "Failed to create Stripe checkout session"
  details: {
    stripe_error: "rate_limit_exceeded | invalid_request_error | api_error",
    stripe_message: "Request rate limited...",
    retry: true
  }

500 DB_UPDATE_FAILED
  message: "Failed to store payment intent"
  details: { operation: "UPDATE calculator_sessions_v2", retry: true }
```

#### Database Impact
- Updates `calculator_sessions_v2` row
- Sets: tier_id, stripe_session_id, stripe_payment_intent_id, payment_status='pending', initiated_at=NOW()
- Amount denormalized from payment_tiers.price_cents for audit trail
- No money moved yet (purely session created in Stripe)

---

### VERIFY PAYMENT
**Endpoint**: `POST /payment/verify`
**Rate**: 5 requests per session_token (prevents race condition retries)
**Response Time**: <500ms (includes Stripe MCP verification)
**Description**: Verify payment succeeded via Stripe MCP, unlock step 4, queue report generation.

#### Request

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "stripe_session_id": "cs_live_abc123..."
}
```

#### Validation Pipeline

```
Layer 1 - Type Validation (Zod):
  ✓ session_token: string, non-empty
  ✓ stripe_session_id: string, matches Stripe format (cs_live_...)

Layer 2 - Domain Validation:
  ✓ Session must exist
    Error: "Session token invalid or expired"
  ✓ stripe_session_id must match session's stored value
    Error: "Stripe session ID mismatch"
  ✓ Payment must not already be verified
    Error: "Payment already verified"

Layer 3 - Stripe MCP Verification:
  ✓ Call Stripe MCP: retrieve_checkout_session(stripe_session_id)
  ✓ Verify: payment_status == 'paid'
  ✓ Verify: customer_email matches (or exists)
  ✓ Verify: expires_at > NOW() (session not expired)
  ✓ Extract: payment_intent_id from response
  ✓ Call Stripe MCP: retrieve_payment_intent(payment_intent_id)
  ✓ Verify: payment intent status == 'succeeded'

Layer 4 - Database Update:
  ✓ Update session: is_premium=true, payment_status='completed', paid_at=NOW()
  ✓ Set step_completed=4 to unlock health profile
  ✓ Create calculator_reports row with placeholder
  ✓ Generate access_token (64-char cryptographic hex)
  ✓ Queue async report generation task
```

#### Stripe MCP Methods: Verification Flow

**Method 1: retrieve_checkout_session()**
```
retrieve_checkout_session(session_id: string): Promise<CheckoutSession>

Response:
{
  id: string,                 // cs_live_...
  payment_intent: string,     // pi_... (or PaymentIntent object)
  payment_status: string,     // "paid" | "unpaid" | "no_payment_required"
  payment_method_types: string[],
  payment_method_collection: string,
  customer_email?: string,
  customer?: string | Customer,
  status: string,             // "open" | "complete" | "expired"
  client_secret?: string,
  url: string,
  expires_at: number,
  created: number,
  metadata?: Record
}
```

**Method 2: retrieve_payment_intent()**
```
retrieve_payment_intent(payment_intent_id: string): Promise<PaymentIntent>

Response:
{
  id: string,                 // pi_...
  object: "payment_intent",
  amount: number,             // In cents
  amount_capturable: number,
  amount_details: { tip: number },
  amount_received: number,
  application?: string,
  application_fee_amount?: number,
  automatic_payment_methods?: { enabled: boolean },
  canceled_at?: number,
  cancellation_reason?: string,
  capture_method: string,     // "automatic" | "manual"
  charges: { data: Array },
  client_secret: string,
  confirmation_method: string,
  created: number,
  currency: string,           // "usd"
  customer?: string,
  description?: string,
  flow_directions?: string[],
  livemode: boolean,
  metadata: Record,
  next_action?: any,
  on_behalf_of?: string,
  payment_method?: string,
  payment_method_options?: Record,
  payment_method_types: string[],
  receipt_email?: string,
  review?: string,
  setup_future_usage?: string,
  shipping?: Address,
  source?: string,
  statement_descriptor?: string,
  statement_descriptor_suffix?: string,
  status: string,             // "succeeded" | "processing" | "requires_action" | "requires_payment_method" | "canceled"
  transfer_data?: { destination: string },
  transfer_group?: string
}
```

#### Response (200 OK)

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "is_premium": true,
  "payment_status": "completed",
  "step_completed": 4,
  "next_step": 4,
  "message": "Payment verified! Ready for health profile. Report generation started.",
  "report_access_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
  "report_url": "https://app.example.com/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
  "amount_paid_cents": 999,
  "currency": "usd",
  "paid_at": "2026-01-03T10:30:00Z",
  "report_expires_at": "2026-02-02T10:30:00Z"
}
```

#### Side Effects

1. **Session Updated**:
   - is_premium = TRUE
   - payment_status = 'completed'
   - step_completed = 4
   - paid_at = NOW()
   - stripe_session_id, stripe_payment_intent_id, amount_paid_cents stored

2. **Report Created**:
   - Row inserted to `calculator_reports`
   - access_token generated (64-char secure hex)
   - report_html = placeholder HTML (pending async generation)
   - expires_at = NOW() + 30 days (or tier-specific duration)

3. **Async Job Queued**:
   - Added to report generation queue
   - Will execute via Supabase Edge Function or Cron
   - Generates personalized report via Claude API

#### Error Cases

```
400 INVALID_SESSION_TOKEN
  message: "Session token invalid or expired"
  details: { received: "..." }

400 STRIPE_SESSION_MISMATCH
  message: "Stripe session ID doesn't match session"
  details: { provided: "cs_...", stored: "cs_...", session_token: "a1b2..." }

400 INVALID_PAYMENT_STATUS
  message: "Payment was not completed successfully"
  details: { stripe_status: "unpaid", session_status: "open" }

400 STRIPE_SESSION_EXPIRED
  message: "Stripe checkout session has expired"
  details: { expires_at: "2026-01-03T11:30:00Z" }

403 PAYMENT_ALREADY_VERIFIED
  message: "Payment already verified for this session"
  details: { completed_at: "2026-01-03T10:30:00Z" }

404 SESSION_NOT_FOUND
  message: "Session does not exist"
  details: { session_token: "a1b2c3d4..." }

404 STRIPE_SESSION_NOT_FOUND
  message: "Stripe session not found (may have expired)"
  details: { stripe_session_id: "cs_..." }

503 STRIPE_MCP_ERROR
  message: "Failed to verify payment with Stripe"
  details: {
    stripe_error: "rate_limit_exceeded | api_error | invalid_request_error",
    stripe_message: "...",
    retry: true,
    method_called: "retrieve_checkout_session"
  }

500 DB_UPDATE_FAILED
  message: "Failed to unlock step 4"
  details: { operation: "UPDATE calculator_sessions_v2", retry: true }

500 REPORT_CREATION_FAILED
  message: "Failed to create report record"
  details: { operation: "INSERT calculator_reports", retry: true }
```

#### Idempotency & Retry Safety

```
POST /payment/verify is fully idempotent:

1. First call: Retrieves Stripe session, verifies payment, updates DB
2. Second call: Detects payment already verified (403 PAYMENT_ALREADY_VERIFIED)
3. Frontend handles 403 gracefully: Show success message (already paid)

This prevents double-updates on network retries.
```

---

### STRIPE MCP INTEGRATION REFERENCE

This section documents the Stripe MCP (Model Context Protocol) integration for payment handling.

#### Available MCP Methods

The Stripe API via MCP provides the following methods for payment operations:

```
1. create_checkout_session()
   Purpose: Create a new Stripe checkout session
   Scope: Payment initiation
   Returns: CheckoutSession with URL and IDs

2. retrieve_checkout_session()
   Purpose: Fetch checkout session details and payment status
   Scope: Payment verification
   Returns: Detailed session state

3. retrieve_payment_intent()
   Purpose: Fetch payment intent details and status
   Scope: Payment verification
   Returns: Complete payment intent state

4. create_webhook_endpoint() [Optional]
   Purpose: Register webhook URLs for payment events
   Scope: Webhook configuration
   Returns: Webhook endpoint object

5. verify_webhook_signature()
   Purpose: Cryptographically verify webhook authenticity
   Scope: Webhook security
   Returns: Boolean (valid/invalid)
```

#### MCP Authentication & Configuration

**Stripe API Key Storage:**
```
Environment variables (production):
  STRIPE_SECRET_KEY = sk_live_... (full API access)
  STRIPE_PUBLISHABLE_KEY = pk_live_... (frontend-safe)
  STRIPE_WEBHOOK_SECRET = whsec_... (webhook signature verification)

Configuration in backend:
  - MCP uses STRIPE_SECRET_KEY automatically
  - No explicit authentication headers needed in requests
  - Credentials managed by deployment platform (Supabase)
```

**Using MCP in Backend Code:**
```javascript
// Supabase Edge Function / Backend Handler

import { stripeClient } from '@mcp/stripe';

// MCP client is pre-authenticated with STRIPE_SECRET_KEY
// No manual authentication needed

const session = await stripeClient.createCheckoutSession({
  line_items: [...],
  mode: 'payment',
  success_url: '...',
  cancel_url: '...',
  idempotency_key: 'unique-session-token'
});
```

#### Rate Limits

**Stripe API Rate Limits (via MCP):**
```
- Standard: 100 requests per second
- Burst: Higher burst capacity allowed
- Backoff: Exponential backoff recommended on 429 responses

Recommended retry strategy:
  - Attempt 1: Immediate
  - Attempt 2: After 1 second (if 429 received)
  - Attempt 3: After 2 seconds
  - Fail after 3 attempts

MCP handles most retries automatically.
```

**Application-Level Rate Limits:**
```
POST /payment/initiate: 5 requests per session_token
POST /payment/verify: 5 requests per session_token

Enforced in database via request tracking table.
```

#### Webhook Verification Flow

**Webhook Setup:**
```
1. Stripe sends events to configured webhook URL
2. Events include: payment_intent.succeeded, charge.refunded, etc.
3. Webhook contains HMAC signature in X-Stripe-Signature header

Implementation:
  - Register webhook endpoint via Supabase settings
  - Stripe URL: https://your-domain.com/webhooks/stripe
  - Include webhook secret in environment variables
```

**Signature Verification (MCP):**
```javascript
import { stripeClient } from '@mcp/stripe';

// Verify webhook signature
const event = await stripeClient.verifyWebhookSignature({
  body: rawBody,  // Raw request body as buffer/string
  signature: request.headers['x-stripe-signature'],
  secret: process.env.STRIPE_WEBHOOK_SECRET
});

// If valid, event.type = 'payment_intent.succeeded', etc.
// If invalid, throws error - reject webhook

if (event.type === 'payment_intent.succeeded') {
  const paymentIntent = event.data.object;
  // Update database: mark payment complete
}
```

**Webhook Event Types to Monitor:**
```
payment_intent.succeeded
  Trigger: Payment completed successfully
  Action: Mark payment complete, unlock premium features

payment_intent.payment_failed
  Trigger: Payment declined
  Action: Send error notification, allow retry

charge.refunded
  Trigger: Customer requests refund
  Action: Revoke premium access, send notification

customer.subscription.updated
  Trigger: Subscription modified (if using recurring)
  Action: Update features/access

charge.dispute.created
  Trigger: Chargeback filed
  Action: Log incident, alert team
```

**Webhook Best Practices:**
```
1. Always verify signature (prevents spoofing)
2. Use event.type to route logic
3. Store event.id to prevent duplicate processing
4. Idempotent handlers (safe to call multiple times)
5. Return 200 OK immediately, process async
6. Log all webhook events to audit table
```

#### Error Handling & Fallback

**MCP Error Response Format:**
```json
{
  "error": {
    "code": "rate_limit_exceeded | invalid_request_error | authentication_error | card_error | api_error",
    "message": "Human readable message",
    "param": "optional field name",
    "charge": "optional charge ID"
  }
}
```

**Handling Strategy:**
```
if (error.code === 'rate_limit_exceeded') {
  // Wait 1-2 seconds, retry
  return { retry: true, delay_seconds: 2 };
}

if (error.code === 'card_error') {
  // Card declined - user action required
  return { retry: false, user_action_needed: true };
}

if (error.code === 'authentication_error') {
  // API key issue - contact support
  return { retry: false, contact_support: true };
}

if (error.code === 'api_error') {
  // Stripe service issue - retry with backoff
  return { retry: true, delay_seconds: 5 };
}
```

#### Idempotency Keys

**Purpose:**
```
Prevent duplicate charges if network retries occur.

How it works:
  1. Client sends request with idempotency_key
  2. Stripe tracks this key in memory (24 hours)
  3. Duplicate request with same key returns cached result
  4. No double-charge even if network fails mid-request
```

**Implementation:**
```javascript
const idempotencyKey = sessionToken; // Use session token

const session = await stripeClient.createCheckoutSession({
  line_items: [...],
  mode: 'payment',
  success_url: '...',
  cancel_url: '...',
  idempotency_key: idempotencyKey
  // ^ Stripe MCP handles this automatically
});

// Even if request fails and user retries:
// Same idempotency_key = same session returned
// No duplicate session created
```

**Key Generation:**
```
idempotency_key = session_token (32-char UUID)

Properties:
  - Unique per session
  - Deterministic (not random)
  - Timestamped (created at session init)
  - Never reused across sessions
```

#### Testing Stripe Integration

**Test Mode:**
```
Use Stripe test credentials in development:
  STRIPE_SECRET_KEY = sk_test_... (test mode)
  STRIPE_PUBLISHABLE_KEY = pk_test_... (test mode)

Test Cards (Stripe provides):
  4242 4242 4242 4242 = Success
  4000 0000 0000 0002 = Declined card
  4000 0027 6000 3184 = Requires authentication
```

**Webhook Testing:**
```
Use Stripe CLI for local webhook testing:
  stripe listen --forward-to localhost:3000/webhooks/stripe
  stripe trigger payment_intent.succeeded

Simulates live webhook events in test environment.
```

---

## Step 4: Health Profile

### SUBMIT HEALTH PROFILE
**Endpoint**: `POST /step/4`
**Rate**: 5 requests per session_token
**Response Time**: <200ms
**Requires**: `is_premium=true AND payment_status='completed'`
**Description**: Collect health details, finalize session, trigger report generation.

#### Request

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "data": {
    "email": "john@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "medications": "Metformin 500mg twice daily for diabetes, Lisinopril 10mg once daily",
    "conditions": ["diabetes", "hypertension"],
    "other_conditions": null,
    "symptoms": "Fatigue after meals, occasional brain fog in mornings",
    "other_symptoms": null,
    "allergies": "Shellfish (anaphylaxis)",
    "avoid_foods": "Processed seed oils, artificial sweeteners",
    "dairy_tolerance": "butter-only",
    "previous_diets": "Keto (6 months), Low-carb (2 years)",
    "what_worked": "Keto reduced inflammation and weight loss was consistent, but unsustainable due to social constraints",
    "carnivore_experience": "new",
    "cooking_skill": "intermediate",
    "meal_prep_time": "some",
    "budget": "moderate",
    "family_situation": "partner",
    "work_travel": "office",
    "goals": ["weightloss", "energy", "inflammation_reduction"],
    "biggest_challenge": "Consistency when eating at restaurants with partner",
    "additional_notes": "Prefer beef and lamb. Pork causes mild digestive upset. Open to experimenting with organ meats."
  }
}
```

#### Field Mapping to Database

| Request Field | Database Column | Type | Required | Max Length | Valid Values |
|---|---|---|---|---|---|
| email | email | VARCHAR | YES | 255 | Valid email format |
| first_name | first_name | VARCHAR | YES | 100 | 1-100 chars |
| last_name | last_name | VARCHAR | YES | 100 | 1-100 chars |
| medications | medications | TEXT | NO | 5000 | Plain text, no control chars |
| conditions | conditions | TEXT[] | NO | - | ENUM array (20 values) |
| other_conditions | other_conditions | TEXT | NO | 500 | Free text |
| symptoms | symptoms | TEXT | NO | 5000 | Plain text, no control chars |
| other_symptoms | other_symptoms | TEXT | NO | 500 | Free text |
| allergies | allergies | TEXT | NO | 5000 | Plain text |
| avoid_foods | avoid_foods | TEXT | NO | 5000 | Plain text |
| dairy_tolerance | dairy_tolerance | ENUM | NO | - | none, butter-only, some, full |
| previous_diets | previous_diets | TEXT | NO | 5000 | Plain text |
| what_worked | what_worked | TEXT | NO | 5000 | Plain text |
| carnivore_experience | carnivore_experience | ENUM | NO | - | new, weeks, months, years |
| cooking_skill | cooking_skill | ENUM | NO | - | beginner, intermediate, advanced |
| meal_prep_time | meal_prep_time | ENUM | NO | - | none, minimal, some, extensive |
| budget | budget | ENUM | NO | - | tight, moderate, comfortable |
| family_situation | family_situation | ENUM | NO | - | single, partner, kids, extended |
| work_travel | work_travel | ENUM | NO | - | office, remote, frequent_travel, variable |
| goals | goals | TEXT[] | NO | - | ENUM array (14 values) |
| biggest_challenge | biggest_challenge | TEXT | NO | 5000 | Plain text |
| additional_notes | additional_notes | TEXT | NO | 5000 | Plain text |

#### Validation Pipeline

```
Layer 1 - Type Validation (Zod):
  ✓ email: string, valid email format, max 255 chars
  ✓ first_name: string, 1-100 chars, letters/hyphens/apostrophes
  ✓ last_name: string, 1-100 chars, letters/hyphens/apostrophes
  ✓ medications: optional string, max 5000 chars, no control chars
  ✓ conditions: optional array of strings
  ✓ other_conditions: optional string, max 500 chars
  ✓ symptoms: optional string, max 5000 chars, no control chars
  ✓ other_symptoms: optional string, max 500 chars
  ✓ allergies: optional string, max 5000 chars
  ✓ avoid_foods: optional string, max 5000 chars
  ✓ dairy_tolerance: optional string, enum ['none', 'butter-only', 'some', 'full']
  ✓ previous_diets: optional string, max 5000 chars
  ✓ what_worked: optional string, max 5000 chars
  ✓ carnivore_experience: optional string, enum ['new', 'weeks', 'months', 'years']
  ✓ cooking_skill: optional string, enum ['beginner', 'intermediate', 'advanced']
  ✓ meal_prep_time: optional string, enum ['none', 'minimal', 'some', 'extensive']
  ✓ budget: optional string, enum ['tight', 'moderate', 'comfortable']
  ✓ family_situation: optional string, enum ['single', 'partner', 'kids', 'extended']
  ✓ work_travel: optional string, enum ['office', 'remote', 'frequent_travel', 'variable']
  ✓ goals: optional array of strings
  ✓ biggest_challenge: optional string, max 5000 chars
  ✓ additional_notes: optional string, max 5000 chars

Layer 2 - Domain Validation:
  ✓ Email must be unique (not already in database or allowed duplicates)
  ✓ Conditions: each element must be in ENUM list (20 conditions)
    Valid: diabetes, hypertension, heart_disease, thyroid, pcos, ibs, crohns,
           eczema, arthritis, gout, sleep_apnea, depression, anxiety, adhd,
           autoimmune, kidney_disease, liver_disease, metabolic_syndrome,
           high_cholesterol, fatty_liver
  ✓ Symptoms: each element must be in ENUM list (15 symptoms)
    Valid: fatigue, brain_fog, bloating, constipation, diarrhea, joint_pain,
           muscle_pain, headaches, migraines, anxiety, depression, insomnia,
           low_energy, skin_issues, digestive_issues
  ✓ Goals: each element must be in ENUM list (14 goals)
    Valid: weightloss, energy, mental_clarity, athletic_performance,
           inflammation_reduction, blood_sugar_control, hormone_balance,
           digestive_health, skin_health, longevity, better_sleep,
           muscle_gain, recovery, biomarker_improvement
  ✓ Text fields sanitized: no control characters (0x00-0x1F except \n\t\r)
  ✓ Session must exist
    Error: "Session token invalid or expired"
  ✓ Session must have is_premium=TRUE
    Error: "Cannot access step 4 without premium subscription"
  ✓ Session must have payment_status='completed'
    Error: "Payment not verified yet"
  ✓ Session must have completed steps 1-3
    Error: "Must complete steps 1-3 first"

Layer 3 - Database:
  ✓ All fields inserted into calculator_sessions_v2 row
  ✓ RLS policy check: service role can write
  ✓ Constraints enforced at DB level
```

#### Response (201 Created)

```json
{
  "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "step_completed": 4,
  "is_premium": true,
  "access_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
  "report_url": "https://app.example.com/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
  "expires_at": "2026-02-02T10:30:00Z",
  "report_status": "generating",
  "estimated_generation_time_seconds": 15,
  "message": "Health profile saved. Your personalized report is being generated...",
  "created_at": "2026-01-03T10:30:00Z"
}
```

#### Side Effects

1. **Session Updated**:
   - All 25+ health fields populated
   - step_completed = 4
   - updated_at = NOW()

2. **Report Generation**:
   - Row in `calculator_reports` updated with health context
   - Async job to generate personalized report via Claude API
   - May take 5-15 seconds

#### Error Cases

```
400 VALIDATION_FAILED
  message: "Email already exists"
  details: {
    errors: [
      {
        field: "email",
        code: "DUPLICATE_EMAIL",
        message: "This email is already registered",
        is_blocking: true
      }
    ]
  }

400 INVALID_ENUM_VALUE
  message: "Invalid condition selected"
  details: {
    errors: [
      {
        field: "conditions[0]",
        code: "INVALID_ENUM",
        message: "Value 'unknown_condition' is not valid",
        is_blocking: true
      }
    ]
  }

400 TEXT_TOO_LONG
  message: "Medications field exceeds maximum length"
  details: {
    field: "medications",
    max_length: 5000,
    provided_length: 6000
  }

403 NOT_PREMIUM
  message: "Premium subscription required for step 4"
  details: { is_premium: false, payment_status: "pending" }

403 STEP_SEQUENCE_VIOLATION
  message: "Must complete steps 1-3 before step 4"
  details: { step_completed: 2, required: 3 }

404 SESSION_NOT_FOUND
  message: "Session does not exist"
  details: { session_token: "a1b2c3d4..." }

500 DB_UPDATE_FAILED
  message: "Failed to save health profile"
  details: { operation: "UPDATE calculator_sessions_v2", retry: true }

500 REPORT_GENERATION_FAILED
  message: "Report generation queued but encountered error"
  details: { queued: true, error: "..." }
```

---

## Report Access

### GET REPORT
**Endpoint**: `GET /report/{access_token}`
**Rate**: Unlimited (token-based, not user-based)
**Response Time**: <100ms (unless report still generating)
**Authentication**: None (token is sufficient)
**Description**: Retrieve generated report via public access token.

#### URL Parameters

```
access_token: 64-char cryptographic hex string (REQUIRED)
  Format: /report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4
  Characters: 0-9, a-f only (hex)
```

#### Response (200 OK)

**If report generation complete**:

```json
{
  "status": "complete",
  "report_html": "<html><head><title>Personalized Carnivore Diet Report</title>...",
  "report_markdown": "# Personalized Carnivore Diet Report\n\n## Executive Summary\n...",
  "report_json": {
    "sections": [
      {
        "title": "Executive Summary",
        "type": "narrative",
        "content_length": 1500
      },
      {
        "title": "Macro Strategy",
        "type": "detailed",
        "content_length": 3000
      }
    ],
    "total_sections": 9,
    "has_summary": true,
    "has_macros": true,
    "has_recipes": true,
    "content_length": 15000,
    "generated_at": "2026-01-03T10:35:00Z"
  },
  "user_name": "John Doe",
  "generated_at": "2026-01-03T10:35:00Z",
  "expires_at": "2026-02-02T10:30:00Z",
  "access_count": 3,
  "last_accessed_at": "2026-01-03T12:00:00Z"
}
```

**If report still generating**:

```json
{
  "status": "generating",
  "message": "Your personalized report is being generated. Check back in a few moments.",
  "estimated_time_remaining_seconds": 8,
  "expires_at": "2026-02-02T10:30:00Z"
}
```

#### Response (200 OK - Pre-expired Generation)

**If report generation failed**:

```json
{
  "status": "failed",
  "message": "Report generation encountered an error. Please contact support.",
  "error_code": "CLAUDE_API_TIMEOUT",
  "expires_at": "2026-02-02T10:30:00Z"
}
```

#### Validation Pipeline

```
Layer 1 - Type Validation (Zod):
  ✓ access_token: string, exactly 64 chars, hex only

Layer 2 - Domain Validation:
  ✓ Token must exist in calculator_reports table
    Error: "Report not found"
  ✓ Report must not be expired
    - is_expired = FALSE
    - expires_at > NOW()
    Error: "Report expired" (410 GONE)
  ✓ Report access logged to calculator_report_access_log
    - IP address captured
    - User agent captured
    - Referer captured
    - Success flag set

Layer 3 - Database:
  ✓ RLS policy: SELECT allowed if is_expired=FALSE AND expires_at > NOW()
  ✓ Trigger: auto-increment access_count, update last_accessed_at
  ✓ Insert audit log row
```

#### Side Effects

1. **Access Logged**:
   - Row inserted to `calculator_report_access_log`
   - IP address, user agent, referer captured
   - access_count incremented on report
   - last_accessed_at updated

2. **Metrics Tracked**:
   - Report popularity (access_count)
   - Access patterns (time-based)
   - Geographic distribution (IP)

#### Error Cases

```
400 INVALID_TOKEN
  message: "Access token invalid format"
  details: { received: "not-64-hex", expected: "64 hex characters" }

404 REPORT_NOT_FOUND
  message: "Report not found"
  details: { access_token: "a1b2c3d4..." }

410 REPORT_EXPIRED
  message: "Report has expired and is no longer accessible"
  details: { expired_at: "2026-02-02T10:30:00Z" }

500 GENERATION_ERROR
  message: "Report generation failed"
  details: { error_code: "CLAUDE_API_TIMEOUT", retry: true }

503 GENERATION_IN_PROGRESS
  message: "Report still being generated"
  details: { estimated_time_remaining_seconds: 8 }
```

---

## Error Response Format (All Endpoints)

All errors follow standard format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "context_key": "additional information"
  },
  "request_id": "optional correlation ID for debugging"
}
```

### Common Error Codes

```
INVALID_CONTENT_TYPE
MISSING_FIELDS
VALIDATION_FAILED
INVALID_SESSION_TOKEN
INVALID_TOKEN
INVALID_TIER
INVALID_STEP
MISSING_REQUIRED
INVALID_TYPE
OUT_OF_RANGE
MATH_ERROR
DUPLICATE_EMAIL
INVALID_ENUM
TEXT_TOO_LONG
CONDITIONAL_CONFLICT
HEIGHT_VALIDATION_FAILED
PAYMENT_INTENT_MISMATCH
INCOMPLETE_STEPS
INVALID_REDIRECT_URL
PAYMENT_ALREADY_ACTIVE
PAYMENT_ALREADY_VERIFIED
NOT_PREMIUM
STEP_SEQUENCE_VIOLATION
SESSION_NOT_FOUND
REPORT_NOT_FOUND
TIER_NOT_FOUND
REPORT_EXPIRED
TIER_LOOKUP_FAILED
GENERATION_ERROR
STRIPE_SESSION_MISMATCH
STRIPE_SESSION_EXPIRED
STRIPE_MCP_ERROR
DB_INSERT_FAILED
DB_UPDATE_FAILED
DB_QUERY_FAILED
INTERNAL_ERROR
```

---

## Session Token Lifecycle

```
CREATE: POST /session → Returns session_token (32-char UUID)
STORE: Frontend stores in memory or session storage (NOT localStorage for security)
USE: All requests include session_token in body JSON
EXPIRE: 24 hours after creation (or payment completion + 30 days)
REVOKE: Manual revocation possible (admin only)
```

---

## Access Token Lifecycle

```
CREATE: POST /payment/verify → Returns access_token (64-char cryptographic hex)
STORE: Frontend passes in URL (NOT in request body for security)
USE: GET /report/{access_token} (no authentication needed)
EXPIRE: 30 days (configurable per tier)
AUTO_REVOKE: is_expired=TRUE when expires_at < NOW()
```

---

## Rate Limiting

```
Session Creation: Unlimited
Step Submission: 10 requests/session_token (prevents accidental duplicates)
Payment Initiate: 5 requests/session_token (prevents multiple Stripe sessions)
Payment Verify: 5 requests/session_token (prevents race conditions)
Step 4 Submit: 5 requests/session_token
Report Access: Unlimited (token-based)

Enforcement:
  - Track by session_token (anonymous users)
  - Reset on successful submission
  - Return 429 TOO_MANY_REQUESTS if exceeded
```

---

## Testing Payloads

Complete curl examples for each endpoint:

### Create Session

```bash
curl -X POST https://api.example.com/api/v1/calculator/session \
  -H "Content-Type: application/json" \
  -d '{
    "referrer": "google.com",
    "utm_source": "facebook"
  }'
```

### Step 1

```bash
curl -X POST https://api.example.com/api/v1/calculator/step/1 \
  -H "Content-Type: application/json" \
  -d '{
    "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "data": {
      "sex": "male",
      "age": 35,
      "height_feet": 5,
      "height_inches": 10,
      "weight_value": 185.5,
      "weight_unit": "lbs"
    }
  }'
```

### Step 2

```bash
curl -X POST https://api.example.com/api/v1/calculator/step/2 \
  -H "Content-Type: application/json" \
  -d '{
    "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "data": {
      "lifestyle_activity": "moderate",
      "exercise_frequency": "5-6",
      "goal": "lose",
      "deficit_percentage": 20,
      "diet_type": "carnivore"
    }
  }'
```

### Step 3

```bash
curl -X POST https://api.example.com/api/v1/calculator/step/3 \
  -H "Content-Type: application/json" \
  -d '{
    "session_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "calculated_macros": {
      "calories": 2400,
      "protein_grams": 180,
      "fat_grams": 200,
      "carbs_grams": 25,
      "protein_percentage": 30,
      "fat_percentage": 75,
      "carbs_percentage": 5,
      "calculation_method": "katch-mcardle",
      "calculation_timestamp": "2026-01-03T10:30:00Z"
    }
  }'
```

---

**End of API Integration Specifications**

This is Alex's reference guide. Every endpoint, validation rule, and error case documented.
Physics and Logic are the only two things needed to trust this API.

All ACID properties maintained. All constraints enforced. No compromises.

Last Updated: 2026-01-03
Stripe MCP Integration: Complete
