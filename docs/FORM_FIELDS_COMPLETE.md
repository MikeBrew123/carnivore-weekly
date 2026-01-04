# Complete Form Fields Reference

**By Leo, Database Architect**
Compiled from CALCULATOR_ARCHITECTURE.md - Single Source of Truth for all form fields
Physics and Logic, no compromises. Every field is mathematically provable.

---

## Quick Reference: Fields by Step

```
STEP 1 (FREE): 4 core fields
STEP 2 (FREE): 5 core fields
STEP 3 (FREE): Display only (calculated_macros)
STEP 4 (PREMIUM): 25+ fields requiring payment + health profile
```

---

## STEP 1: Physical Stats (Free)

**Purpose**: Establish basal metabolic baseline

| Field Name | Database Column | Type | Required | Min/Max | Validation | Notes |
|---|---|---|---|---|---|---|
| Sex | `sex` | ENUM | YES | - | 'male' \| 'female' | Determines caloric coefficient |
| Age | `age` | INTEGER | YES | 13-150 | Integer, range 13-150 years | Katch-McArdle precision requires age |
| Height (Feet) | `height_feet` | INTEGER | COND | 3-9 | Integer, combined with inches OR cm | Either feet+inches OR centimeters, never both |
| Height (Inches) | `height_inches` | INTEGER | COND | 0-11 | Integer 0-11, combined with feet OR cm | Can omit if using cm |
| Height (CM) | `height_cm` | INTEGER | COND | 90-280 | Integer, centimeters, combined with feet+inches OR cm | European/metric alternative |
| Weight Value | `weight_value` | DECIMAL | YES | varies | 50-700 (lbs) or 25-320 (kg) | Positive number with 1 decimal |
| Weight Unit | `weight_unit` | ENUM | YES | - | 'lbs' \| 'kg' | Determines range validation |

### Step 1 Validation Logic

```
✓ sex: ENUM check (2 values)
✓ age: 13 <= age <= 150
✓ height: NOT (height_feet AND height_cm) — XOR check
  - if height_feet: 3 <= feet <= 9 AND 0 <= inches <= 11
    - Total = (feet * 12 + inches) must be 36-92 inches (3'0" to 7'8")
  - if height_cm: 90 <= cm <= 280
✓ weight_value: > 0, matches unit
  - if lbs: 50 <= weight <= 700
  - if kg: 25 <= weight <= 320
✓ weight_unit: ENUM check (2 values)
```

### Example Payload: Step 1

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

---

## STEP 2: Fitness & Diet (Free)

**Purpose**: Calculate activity multiplier and deficit strategy

| Field Name | Database Column | Type | Required | Valid Values | Validation | Notes |
|---|---|---|---|---|---|---|
| Lifestyle Activity | `lifestyle_activity` | ENUM | YES | sedentary, light, moderate, very, extreme | Multiplier: 1.2, 1.375, 1.55, 1.725, 1.9 | Harris-Benedict activity multiplier |
| Exercise Frequency | `exercise_frequency` | ENUM | YES | none, 1-2, 3-4, 5-6, 7 | Days per week | Influences deficit strategy |
| Primary Goal | `goal` | ENUM | YES | lose, maintain, gain | Weight change intent | Blocks deficit_percentage if 'maintain' |
| Deficit Percentage | `deficit_percentage` | ENUM | COND | 15, 20, 25 | Only if goal != 'maintain' | COND = Required if goal='lose' or 'gain' |
| Diet Type | `diet_type` | ENUM | YES | carnivore, pescatarian, keto, lowcarb | Diet framework | Determines macro ratios |

### Step 2 Validation Logic

```
✓ lifestyle_activity: ENUM check (5 values)
✓ exercise_frequency: ENUM check (5 values)
✓ goal: ENUM check (3 values)
✓ deficit_percentage:
  - if goal != 'maintain': REQUIRED, ENUM [15, 20, 25]
  - if goal == 'maintain': MUST be NULL/omitted
✓ diet_type: ENUM check (4 values)
```

### Example Payload: Step 2

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

---

## STEP 3: Macro Calculation (Free - Display Only)

**Purpose**: Present calculated macros before payment

### Calculated Macros (Read from Frontend Formula)

| Field Name | Database Column | Type | Source | Notes |
|---|---|---|---|---|
| Calories | `calculated_macros.calories` | JSONB/INT | Frontend calc | Total daily energy expenditure after deficit |
| Protein (grams) | `calculated_macros.protein_grams` | JSONB/INT | Frontend calc | 2.2g per kg body weight (standard) |
| Fat (grams) | `calculated_macros.fat_grams` | JSONB/INT | Frontend calc | Remainder after protein/carbs |
| Carbs (grams) | `calculated_macros.carbs_grams` | JSONB/INT | Frontend calc | Carnivore diet = <5g typically |
| Protein % | `calculated_macros.protein_percentage` | JSONB/INT | Calculated | (protein_grams * 4) / calories * 100 |
| Fat % | `calculated_macros.fat_percentage` | JSONB/INT | Calculated | (fat_grams * 9) / calories * 100 |
| Carbs % | `calculated_macros.carbs_percentage` | JSONB/INT | Calculated | (carbs_grams * 4) / calories * 100 |
| Calculation Method | `calculated_macros.calculation_method` | TEXT | Frontend | 'katch-mcardle', 'mifflin-st-jeor', etc. |
| Calculation Timestamp | `calculated_macros.calculation_timestamp` | TIMESTAMP | Frontend | ISO 8601 when calculated |

### Step 3 Validation Logic

```
✓ Sent to server but NOT validated (frontend calculates)
✓ Stored in JSONB for flexibility
✓ Displayed to user as confirmation
✓ No payment barrier — results always shown free
```

### Example Payload: Step 3

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

---

## STEP 4: Health Profile (Premium Only - 25+ Fields)

**Requirement**: `is_premium = TRUE` AND `payment_status = 'completed'`

### Subsection A: Contact Information

| Field Name | Database Column | Type | Required | Max Length | Validation | Payment Tier |
|---|---|---|---|---|---|---|
| Email Address | `email` | VARCHAR | YES | 255 | Valid email format (RFC 5322) | All Tiers |
| First Name | `first_name` | VARCHAR | YES | 100 | 1-100 chars, letters/hyphens/apostrophes | All Tiers |
| Last Name | `last_name` | VARCHAR | YES | 100 | 1-100 chars, letters/hyphens/apostrophes | All Tiers |

### Subsection B: Health Status & Medical History

| Field Name | Database Column | Type | Required | Max Length | Validation | Payment Tier |
|---|---|---|---|---|---|---|
| Current Medications | `medications` | TEXT | NO | 5000 | Plain text, max 5000 chars, no control chars | All Tiers |
| Medical Conditions | `conditions` | TEXT[] | NO | - | Array of ENUM values | All Tiers |
| Other Conditions (Free Text) | `other_conditions` | TEXT | NO | 500 | Plain text if conditions array needs additions | All Tiers |
| Current Symptoms | `symptoms` | TEXT | NO | 5000 | Plain text, max 5000 chars, no control chars | All Tiers |
| Other Symptoms (Free Text) | `other_symptoms` | TEXT | NO | 500 | Plain text if symptom array incomplete | All Tiers |

**Valid Conditions ENUM** (pre-defined selection):
```
diabetes, hypertension, heart_disease, thyroid, pcos, ibs,
crohns, eczema, arthritis, gout, sleep_apnea, depression,
anxiety, adhd, autoimmune, kidney_disease, liver_disease,
metabolic_syndrome, high_cholesterol, fatty_liver
```

**Valid Symptoms ENUM**:
```
fatigue, brain_fog, bloating, constipation, diarrhea,
joint_pain, muscle_pain, headaches, migraines, anxiety,
depression, insomnia, low_energy, skin_issues, digestive_issues
```

### Subsection C: Dietary Restrictions & Tolerances

| Field Name | Database Column | Type | Required | Valid Values | Validation | Payment Tier |
|---|---|---|---|---|---|---|
| Food Allergies | `allergies` | TEXT | NO | 5000 | Comma-separated or free text | All Tiers |
| Foods to Avoid | `avoid_foods` | TEXT | NO | 5000 | Plain text description | All Tiers |
| Dairy Tolerance | `dairy_tolerance` | ENUM | NO | none, butter-only, some, full | Guides dairy inclusion strategy | All Tiers |

**Dairy Tolerance Reference**:
- `none`: No dairy at all (strict)
- `butter-only`: Clarified butter/ghee only
- `some`: Aged cheeses OK, fresh dairy causes issues
- `full`: All dairy tolerated

### Subsection D: Diet History & Experience

| Field Name | Database Column | Type | Required | Max Length | Validation | Payment Tier |
|---|---|---|---|---|---|---|
| Previous Diets Tried | `previous_diets` | TEXT | NO | 5000 | Comma-separated or narrative text | All Tiers |
| What Worked Before | `what_worked` | TEXT | NO | 5000 | Free text explanation | All Tiers |
| Carnivore Experience Level | `carnivore_experience` | ENUM | NO | new, weeks, months, years | Prior familiarity with diet type | All Tiers |

**Carnivore Experience ENUM**:
- `new`: First time trying carnivore
- `weeks`: 1-4 weeks experience
- `months`: 1-12 months experience
- `years`: 1+ years carnivore veteran

### Subsection E: Lifestyle & Practical Constraints

| Field Name | Database Column | Type | Required | Valid Values | Validation | Payment Tier |
|---|---|---|---|---|---|---|
| Cooking Skill Level | `cooking_skill` | ENUM | NO | beginner, intermediate, advanced | Determines recipe complexity | All Tiers |
| Meal Prep Time Available | `meal_prep_time` | ENUM | NO | none, minimal, some, extensive | Weekly time availability | All Tiers |
| Budget Level | `budget` | ENUM | NO | tight, moderate, comfortable | Influences ingredient sourcing | All Tiers |
| Family Situation | `family_situation` | ENUM | NO | single, partner, kids, extended | Meal planning complexity | All Tiers |
| Work/Travel Situation | `work_travel` | ENUM | NO | office, remote, frequent_travel, variable | Impacts practical implementation | All Tiers |

**Cooking Skill Levels**:
- `beginner`: Basic cooking, needs simple recipes
- `intermediate`: Comfortable with standard techniques
- `advanced`: Can adapt recipes, comfortable with precision

**Meal Prep Time**:
- `none`: Cannot dedicate prep time
- `minimal`: <2 hours/week
- `some`: 2-5 hours/week
- `extensive`: 5+ hours/week

**Budget Levels**:
- `tight`: <$150/week for food
- `moderate`: $150-300/week
- `comfortable`: $300+/week

**Family Situations**:
- `single`: Living alone
- `partner`: With romantic partner
- `kids`: Children in household (ages matter)
- `extended`: Multi-generational or roommates

**Work/Travel**:
- `office`: Regular office presence
- `remote`: Full remote work
- `frequent_travel`: >50% travel/eating out
- `variable`: Mix of office and travel

### Subsection F: Health Goals & Challenges

| Field Name | Database Column | Type | Required | Valid Values | Validation | Payment Tier |
|---|---|---|---|---|---|---|
| Health Goals | `goals` | TEXT[] | NO | - | Array of 1+ goal ENUM values | All Tiers |
| Biggest Challenge | `biggest_challenge` | TEXT | NO | 5000 | Free text (1-5000 chars) | All Tiers |
| Additional Notes | `additional_notes` | TEXT | NO | 5000 | Any context useful for personalization | All Tiers |

**Valid Goals ENUM** (multi-select):
```
weightloss, energy, mental_clarity, athletic_performance,
inflammation_reduction, blood_sugar_control, hormone_balance,
digestive_health, skin_health, longevity, better_sleep,
muscle_gain, recovery, biomarker_improvement
```

---

## STEP 4: Payment & Metadata Fields

| Field Name | Database Column | Type | Required | Validation | Notes |
|---|---|---|---|---|---|
| Tier ID | `tier_id` | UUID FK | YES | FOREIGN KEY payment_tiers(id) | Denormalized for fast lookup |
| Payment Status | `payment_status` | ENUM | YES | pending, completed, failed, refunded | Controls access to step 4 |
| Stripe Payment Intent ID | `stripe_payment_intent_id` | VARCHAR | YES | UNIQUE constraint | External payment system reference |
| Amount Paid (cents) | `amount_paid_cents` | INTEGER | YES | > 0 | Audit trail for refunds |
| Paid At | `paid_at` | TIMESTAMP | NO | - | When payment initiated |
| Completed At | `completed_at` | TIMESTAMP | NO | - | When payment verified |
| Is Premium | `is_premium` | BOOLEAN | YES | TRUE if payment_status='completed' | Gate for step 4 access |

---

## Complete Field Count by Tier Access

### Tier-Based Feature Unlocking

```
FREE TIER (Steps 1-3):
  - 4 physical stats fields (sex, age, height, weight)
  - 5 fitness/diet fields (activity, exercise, goal, deficit, diet)
  - Calculated macros (display only)
  Total: 9 input fields + 1 output field

PREMIUM TIER (Add Step 4 after payment):
  - All free fields
  - 3 contact fields (email, first_name, last_name)
  - 5 health status fields (medications, conditions, symptoms, other_*)
  - 3 dietary fields (allergies, avoid_foods, dairy_tolerance)
  - 4 history fields (previous_diets, what_worked, carnivore_experience, **)
  - 5 lifestyle fields (cooking_skill, meal_prep_time, budget, family, work)
  - 3 goals fields (goals[], biggest_challenge, additional_notes)
  - 7 payment fields (tier_id, payment_status, stripe_*, amount, timestamps, is_premium)
  Total: 39 fields across 4 database tables
```

---

## Payment Tier Definitions

### Bundle ($9.99)
**Slug**: `bundle`
**Price**: 999 cents
**Features**:
```json
{
  "includes_meal_plan": false,
  "includes_recipes": 0,
  "includes_shopping_list": false,
  "includes_medical_context": false,
  "report_expiry_days": 30,
  "revision_limit": 1
}
```

### Meal Plan ($27.00)
**Slug**: `meal-plan`
**Price**: 2700 cents
**Features**:
```json
{
  "includes_meal_plan": true,
  "includes_recipes": 10,
  "includes_shopping_list": true,
  "includes_medical_context": false,
  "report_expiry_days": 90,
  "revision_limit": 3
}
```

### Shopping ($19.00)
**Slug**: `shopping`
**Price**: 1900 cents
**Features**:
```json
{
  "includes_meal_plan": false,
  "includes_recipes": 5,
  "includes_shopping_list": true,
  "includes_medical_context": false,
  "report_expiry_days": 60,
  "revision_limit": 2
}
```

### Doctor ($15.00)
**Slug**: `doctor`
**Price**: 1500 cents
**Features**:
```json
{
  "includes_meal_plan": false,
  "includes_recipes": 0,
  "includes_shopping_list": false,
  "includes_medical_context": true,
  "report_expiry_days": 180,
  "revision_limit": 5
}
```

---

## Data Type Reference

```
ENUM: PostgreSQL ENUM type, validated at database level
VARCHAR: Variable-length text, max specified length
TEXT: Unlimited-length text (JSONB for structured data)
TEXTAREA: TEXT field (50-5000 chars typically)
INT / INTEGER: 32-bit signed integer
DECIMAL: Floating-point (for weights, percentages)
BOOLEAN: TRUE / FALSE
UUID: Universally Unique Identifier (128-bit)
TIMESTAMP: ISO 8601 with timezone
TEXT[]: PostgreSQL array of text
JSONB: JSON Binary format (for structured data like calculated_macros)
```

---

## Validation Rules Summary

### Always Enforced (Database Constraints)

```sql
-- Session must exist
FOREIGN KEY (session_id) REFERENCES calculator_sessions_v2

-- Step progression enforced
step_completed >= 1 AND step_completed <= 4

-- Premium access gating
is_premium = FALSE OR (payment_status = 'completed' AND tier_id IS NOT NULL)

-- Premium requires email
is_premium = FALSE OR email IS NOT NULL

-- Payment requires amount
stripe_payment_intent_id IS NULL OR amount_paid_cents > 0

-- Unique payment tracking
UNIQUE (stripe_payment_intent_id)

-- Unique session tokens
UNIQUE (session_token)
```

### Application-Level Validation

**Blocking Errors** (prevent form submission):
- Missing required fields
- Invalid ENUM values
- Out-of-range numeric values
- Type mismatches (string sent where int expected)
- Height XOR validation failure (both feet and cm provided)
- Email format invalid
- Deficit percentage provided when goal='maintain'

**Non-Blocking Errors** (recorded but allow progress):
- Off-nominal values (weight >600 lbs but <=700)
- Unusual combinations (very high exercise + sedentary lifestyle)
- Incomplete but valid submissions

---

## Column Names for Frontend Form Binding

Use these exact column names in your form state management:

```typescript
// Step 1
sex, age, height_feet, height_inches, height_cm, weight_value, weight_unit

// Step 2
lifestyle_activity, exercise_frequency, goal, deficit_percentage, diet_type

// Step 3
calculated_macros (JSONB object)

// Step 4
email, first_name, last_name,
medications, conditions, other_conditions, symptoms, other_symptoms,
allergies, avoid_foods, dairy_tolerance,
previous_diets, what_worked, carnivore_experience,
cooking_skill, meal_prep_time, budget, family_situation, work_travel,
goals, biggest_challenge, additional_notes,
tier_id, payment_status, stripe_payment_intent_id, amount_paid_cents,
paid_at, completed_at, is_premium
```

---

**End of Form Fields Reference**

For API payload structure, see `/docs/API_INTEGRATION_SPECS.md`
