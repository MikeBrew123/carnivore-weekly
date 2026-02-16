# Report Field Mapping: From Form Input to Personalized Output

**Author:** Leo (Database Architect)
**Purpose:** Quick reference for understanding how each calculator form field flows into report sections
**Status:** Complete mapping with examples

---

## Overview

The calculator is a funnel that progressively gathers data, then the Claude API transforms that data into a personalized HTML report. This document shows the exact path each form field takes.

---

## Step 1: Physical Stats (Free)

### Input Fields
```typescript
{
  sex: "male" | "female",
  age: 13-150,
  height_feet?: 3-9,
  height_inches?: 0-11,
  height_cm?: 90-280,
  weight_value: number,
  weight_unit: "lbs" | "kg"
}
```

### Report Impact

#### Field: `sex`
- **Calculation:** TDEE formula uses sex-specific metabolic rates
- **Report Sections:**
  - Daily Targets (macro suggestion reflects sex)
  - Macros Strategy (gender-specific protein ratios)
  - Health Context (condition-specific gender notes)
- **Example:**
  - Female: Slightly lower baseline TDEE, often higher body fat %
  - Male: Higher baseline TDEE, emphasis on muscle preservation

#### Field: `age`
- **Calculation:** Metabolic adjustment (older = slower metabolism)
- **Report Sections:**
  - Timeline (older users may have slower adaptation)
  - Activity Adjustment (recovery time increases with age)
  - Medication Interactions (age-specific drug metabolism)
- **Example:**
  - Michael (35): "You've already proven this works—build on 14 months of success"
  - User (65): "At your age, stable blood sugar is especially critical"

#### Field: `height_feet` + `height_inches` OR `height_cm`
- **Calculation:** BMR (Katch-McArdle formula) includes height as proxy for body surface area
- **Report Sections:**
  - Daily Targets (caloric baseline)
  - Body Composition (expected lean muscle mass)
- **Example:**
  - Michael (5'10"): BMR ~1,700 → TDEE ~2,400 (moderate activity)
  - User (5'2"): BMR ~1,400 → TDEE ~2,000

#### Field: `weight_value` + `weight_unit`
- **Calculation:**
  - TDEE baseline: weight input
  - Protein target: 0.7-1.0g per lb (converted from kg if needed)
  - Progress expectation: "1-2 lbs per week" = weight-dependent metric
- **Report Sections:**
  - Daily Targets (macro table)
  - Progress Timeline (Week 3-4 weight loss expectations)
  - First Action Step (meal portion sizing based on weight)
  - Meal Calendar (caloric targets scaled to weight)
- **Example:**
  - Michael (185 lbs): 130g protein = 0.7g/lb (lighter protein, more fat-focused)
  - User (250 lbs): 150g protein = 0.6g/lb (preserve muscle during larger deficit)

---

## Step 2: Fitness & Diet Goals (Free)

### Input Fields
```typescript
{
  lifestyle_activity: "sedentary" | "light" | "moderate" | "very" | "extreme",
  exercise_frequency: "none" | "1-2" | "3-4" | "5-6" | "7",
  goal: "lose" | "maintain" | "gain",
  deficit_percentage?: 15 | 20 | 25,  // only if goal != 'maintain'
  diet_type: "carnivore" | "pescatarian" | "keto" | "lowcarb"
}
```

### Report Impact

#### Field: `lifestyle_activity`
- **Calculation:** TDEE multiplier (1.2x BMR → 1.9x BMR)
  - sedentary: 1.2
  - light: 1.375
  - moderate: 1.55
  - very: 1.725
  - extreme: 1.9
- **Report Sections:**
  - Daily Targets (caloric baseline)
  - Why This Protocol Works (activity-specific benefits)
  - Exercise Recovery notes (if "very" or "extreme")
- **Example:**
  - Michael (moderate): 1,700 BMR × 1.55 = 2,635 → adjusted down to 2,400
  - User (sedentary): 1,500 BMR × 1.2 = 1,800 → target deficit to 1,440

#### Field: `exercise_frequency`
- **Calculation:** Electrolyte needs, carb loading (if applicable), recovery emphasis
- **Report Sections:**
  - Electrolyte Protocol (higher frequency = more sodium/potassium loss)
  - Meal Calendar (timing based on workout schedule)
  - First Action Step (protein portion emphasizes post-workout recovery)
  - Timeline (Week 2 "difficult middle" has activity notes)
- **Example:**
  - Michael (5-6x/week): "Prioritize post-workout protein intake. Electrolytes critical on workout days."
  - User (none): "Your carb targets can be slightly more flexible; focus on satiety."

#### Field: `goal`
- **Calculation:** Determines deficit/surplus, tone of messaging, strategy focus
  - lose: Apply deficit_percentage, weight loss narrative
  - maintain: No deficit, body recomposition focus
  - gain: Surplus, muscle-building emphasis
- **Report Sections:**
  - Daily Targets (caloric restriction)
  - Why This Protocol Works (section: "For Weight Loss" appears if goal='lose')
  - Timeline (expectation setting based on goal)
  - Overall tone (loss = aggressive, maintain = optimization, gain = indulgence-ok)
- **Example:**
  - Michael (lose): "1,920 kcal daily, expect 1-2 lbs/week. High protein protects muscle."
  - User (maintain): "2,400 kcal daily, focus on recomposition. Strength training critical."

#### Field: `deficit_percentage`
- **Calculation:** Exact caloric reduction
  - 15% deficit: Slower loss, better sustainability
  - 20% deficit: Moderate loss, manageable energy
  - 25% deficit: Aggressive loss, higher fatigue risk
- **Report Sections:**
  - Daily Targets (exact caloric range)
  - Timeline (Week 2 difficulty note if deficit >20%)
  - Stall-Breaker Protocol (5-day refeed at maintenance if stalls)
- **Example:**
  - Michael (20% deficit): "20% creates a moderate caloric deficit without excessive fatigue."
  - User (25% deficit): "Aggressive 25% deficit. Monitor energy closely. Take 5-day refeeds monthly."

#### Field: `diet_type`
- **Calculation:** Selects protein/fat sources, macro ranges, food restrictions
  - carnivore: 0g carbs, 70-80% fat, 20-30% protein
  - pescatarian: Adds fish, 0-5g carbs, 65-75% fat
  - keto: Allows nuts/dairy, 5-20g carbs, 60-75% fat
  - lowcarb: Allows more plants, 20-50g carbs
- **Report Sections:**
  - Food Pyramid (diet-specific proteins)
  - Daily Eating Patterns (meal examples match diet)
  - Grocery Lists (ingredients exclude non-carnivore items)
  - Medical Disclaimer (carnivore-specific medication notes)
- **Example:**
  - Michael (carnivore): Beef, lamb, fish, eggs, butter (no dairy, no plants, no carbs)
  - User (pescatarian-carnivore): Seafood + beef, no terrestrial animals

---

## Step 3: Calculated Macros (Free)

### Input Fields
```typescript
{
  calculated_macros: {
    calories: number,
    protein_grams: number,
    fat_grams: number,
    carbs_grams: number,
    protein_percentage: number,
    fat_percentage: number,
    carbs_percentage: number,
    calculation_method: string,  // 'katch-mcardle', 'mifflin-st-jeor', etc.
    calculation_timestamp: ISO8601
  }
}
```

### Report Impact

#### Field: `calories`
- **Usage:** Primary constraint for all meal planning and portion sizing
- **Report Sections:**
  - Daily Targets (main table, ±10% range)
  - Meal Calendar (portion sizing)
  - Grocery Lists (quantity calculations)
  - Stall-Breaker Protocol (refeed at maintenance kcal)
- **Example:**
  - Michael: 1,920 kcal → Daily Targets shows "1,800-2,200 (adjust based on hunger)"
  - Report: 4 meals (breakfast, lunch, snack, dinner) at ~480 kcal each

#### Field: `protein_grams`
- **Usage:** Muscle preservation, satiety driver, meal portion sizing
- **Report Sections:**
  - Daily Targets (protein line item with ±10% range)
  - Why This Protocol Works (subsection "For Weight Loss" emphasizes protein satiety)
  - First Action Step ("eggs" + "beef" portions match protein target)
  - Meal Calendar (each meal has protein-first emphasis)
  - Grocery Lists (calculate meat quantities from protein target)
- **Example:**
  - Michael (130g): "Prioritize this first. At your weight, 130g = 0.7g/lb, optimized for fat loss."
  - Meal example: "2 ribeye steaks (4 oz each) = 56g protein in one meal"

#### Field: `fat_grams`
- **Usage:** Satiety, caloric balance, cooking fat recommendations
- **Report Sections:**
  - Daily Targets (fat line item with ±10% range)
  - Why This Protocol Works (subsection "For Energy" notes fat as efficient fuel)
  - First Action Step (butter purchase recommended based on fat target)
  - Stall-Breaker Protocol (may reduce added fat if stalled)
- **Example:**
  - Michael (160g): "Eat to satiety. Cook in butter. Avoid excessive added fat if stalled."
  - Report: Ground beef 80/20 selected because 20% fat naturally contributes to target

#### Field: `carbs_grams`
- **Usage:** Validation (should be <20g for carnivore), elimination narrative
- **Report Sections:**
  - Daily Targets (carbs row shows "<20g (ideally near zero)")
  - Why This Protocol Works (subsection "For Blood Sugar" emphasizes carb elimination)
  - Medical Disclaimer (medication warning if diabetic)
  - First Action Step ("No sides needed" reinforces zero-carb message)
- **Example:**
  - Michael: <20g → Report includes "Carnivore eliminates glucose spikes"
  - Timeline: Week 1 notes "Blood sugar may drop—monitor closely with Metformin"

#### Field: `protein_percentage`, `fat_percentage`, `carbs_percentage`
- **Usage:** Educational visualization, macro balance confirmation
- **Report Sections:**
  - Daily Targets (optional visual display)
  - Why This Protocol Works (ratio supports each claim)
- **Example:**
  - Michael (30% protein / 75% fat / <1% carbs):
    - "Your macro split is optimized for carnivore."
    - Ratio validates: High protein for satiety + muscle, high fat for hormonal health

#### Field: `calculation_method`
- **Usage:** Transparency, audit trail, methodology note
- **Report Sections:**
  - Metadata (logged but not displayed to user)
  - Transparency note (optional): "We used Katch-McArdle formula (most accurate for lean individuals)"
- **Example:**
  - Michael: Katch-McArdle (accounts for body composition)
  - Logged to: `calculator_sessions_v2.calculated_macros.calculation_method`

---

## Step 4: Health Profile (Premium Only)

### Input Fields
```typescript
{
  // Contact
  email: string,
  first_name: string,
  last_name: string,

  // Health
  medications: string,
  conditions: array,  // enum: ['diabetes', 'hypertension', 'ibs', etc.]
  other_conditions: string,
  symptoms: string,
  other_symptoms: string,

  // Dietary
  allergies: string,
  avoid_foods: string,
  dairy_tolerance: enum,  // 'none', 'butter-only', 'some', 'full'

  // History
  previous_diets: string,
  what_worked: string,
  carnivore_experience: enum,  // 'new', 'weeks', 'months', 'years'

  // Lifestyle
  cooking_skill: enum,  // 'beginner', 'intermediate', 'advanced'
  meal_prep_time: enum,  // 'none', 'some', 'lots'
  budget: enum,  // 'budget', 'moderate', 'premium'
  family_situation: enum,  // 'solo', 'partner', 'kids', 'extended'
  work_travel: enum,  // 'office', 'remote', 'frequent-travel'

  // Goals
  goals: array,  // enum: ['weight_loss', 'energy', 'mental', 'performance', 'healing']
  biggest_challenge: string,
  additional_notes: string
}
```

### Report Impact

#### Field: `email`
- **Usage:** Report delivery, access control (soft)
- **Report Sections:** (Not displayed, backend only)
- **Example:**
  - Michael: michael@example.com
  - Used to send report link, denormalized in `calculator_reports.email`

#### Field: `first_name` + `last_name`
- **Usage:** Personalization throughout report
- **Report Sections:**
  - Cover Page: "Your Complete Personalized Carnivore Diet Report"
  - Mission Brief: "You've already proven this works, [FirstName]"
  - Personal Closing: "One meal at a time, [FirstName]"
  - Doctor handout: "Patient: [FirstName] [LastName]"
- **Example:**
  - Michael: "You've already proven keto works for your body, Michael."

#### Field: `medications`
- **Usage:** Physician coordination, medication adjustment warnings
- **Report Sections:**
  - Medical Disclaimer (lists medications, emphasizes coordination)
  - Week 1 Timeline (if diabetes-related: "Monitor blood sugar closely with Metformin")
  - Week 4 Timeline (if hypertension-related: "Time to check in with your doctor about medication needs")
  - Physician Consultation Guide (Doctor tier only)
    - Lists exact medications needing dosage review
    - Provides "Medication Adjustment Protocols" section
- **Example:**
  - Michael: "Metformin 500mg twice daily" + "Lisinopril 10mg daily"
  - Disclaimer: "Blood sugar and blood pressure often improve significantly on carnivore—medication dosages may need reduction to avoid hypoglycemia or hypotension."
  - Physician Guide: "Fasting insulin and HOMA-IR typically improve, potentially allowing Metformin reduction as early as Week 4."

#### Field: `conditions`
- **Usage:** Condition-specific content selection and messaging
- **Report Sections (Multiple):**
  - Why This Protocol Works (subsection for each condition):
    - diabetes → "For Blood Sugar & Diabetes"
    - hypertension → "For Blood Pressure Management"
    - ibs → "For Gut Health"
    - autoimmune → "For Inflammation Reduction"
  - Medical Disclaimer (emphasizes condition-specific coordination)
  - Timeline (condition-specific notes in each week)
  - Physician Consultation Guide (Doctor tier):
    - Baseline labs (condition-specific markers)
    - Advanced bloodwork (condition-optimized)
    - Lab monitoring schedule
- **Example:**
  - Michael: `conditions = ['diabetes']`
    - Why This Works: Section "For Blood Sugar & Diabetes" ✅
    - Timeline Week 1: "Blood sugar may drop—monitor closely with Metformin"
    - Timeline Week 4: "Time to check in about Metformin dosages"
    - Physician Guide: "Request fasting insulin, HbA1c, HOMA-IR to track insulin sensitivity"

#### Field: `other_conditions`
- **Usage:** Free-form condition notes if not in predefined list
- **Report Sections:**
  - Conditions Narrative (integrated with `conditions`)
  - Symptom-specific recommendations
- **Example:**
  - Michael: None (covered by conditions array)
  - User with "NAFLD": "Non-alcoholic fatty liver disease—carnivore shows promising liver improvement results in recent studies"

#### Field: `symptoms`
- **Usage:** Personalization of "Your Biggest Challenge, Addressed" and symptom-specific strategy
- **Report Sections:**
  - Why This Protocol Works (subsection appears based on symptoms):
    - "brain fog" → "For Mental Clarity" subsection
    - "fatigue" → "For Energy" subsection
    - "joint pain" → inflammation context
    - "bloating" → "For Gut Health" subsection
  - Timeline (symptom improvement timeline):
    - Week 1-2: "Possible fatigue, headaches as you shift to fat-burning"
    - Week 3: "Mental clarity emerging"
  - Electrolyte Protocol (Doctor tier): "If experiencing headaches, increase salt"
  - 30-Day Tracker (Doctor tier): Symptom checklist includes their specific symptoms
- **Example:**
  - Michael: "Fatigue, brain fog, joint pain"
    - Why This Works: All three addressed in separate subsections
    - Timeline: "Week 3: Fat adaptation strengthening. Mental clarity emerging. Joint pain may decrease."
    - 30-Day Tracker: Checkboxes for "Brain fog," "Energy crashes," "Joint pain"

#### Field: `other_symptoms`
- **Usage:** Free-form symptom tracking
- **Report Sections:**
  - 30-Day Tracker (Doctor tier): Symptoms they report can be added to tracking sheet
- **Example:**
  - User: "Occasional migraines"
  - Report: "Track your migraines in the 30-day tracker. Stabilized blood sugar often reduces frequency."

#### Field: `allergies`
- **Usage:** Food restriction enforcement in meal planning
- **Report Sections:**
  - Food Pyramid (removes allergen from options)
  - First Action Step (avoids suggesting allergenic foods)
  - Meal Calendar (no meal includes allergen)
  - Grocery Lists (doesn't suggest allergenic items)
- **Example:**
  - User: "Shellfish allergy"
  - Food Pyramid: Salmon suggested (✅), shrimp removed (✅)
  - First Action Step: Beef, eggs, butter suggested (avoids seafood entirely)

#### Field: `avoid_foods`
- **Usage:** Personal food rejection list enforcement
- **Report Sections:**
  - Food Pyramid (emphasizes alternatives)
  - Personal Rejection List section (Doctor tier): "You mentioned avoiding seed oils. We've optimized your meal plan for grass-fed beef and butter-based cooking."
  - First Action Step (selects appropriate alternatives)
  - Meal Calendar (zero meals include avoided foods)
- **Example:**
  - Michael: "Seed oils, processed foods"
  - Food Pyramid: Grass-fed beef emphasis, butter/ghee highlighted
  - Report: "We've selected grass-fed beef and butter exclusively. All cooking fats are from quality sources, never seed oils."

#### Field: `dairy_tolerance`
- **Usage:** Dairy inclusion/exclusion in all meal planning
- **Report Sections:**
  - Dairy Reintroduction Roadmap (Doctor tier): Customized based on tolerance
    - none → "Avoid all dairy. Consider introducing ghee after 8 weeks."
    - butter-only → "Butter and ghee are your dairy options. Consider hard cheeses after 12 weeks."
    - some → "Butter, ghee, hard cheeses okay. Monitor cream and soft cheeses."
    - full → "All dairy products included. Focus on quality (grass-fed, A2 milk)."
  - Food Pyramid (dairy product recommendations)
  - Meal Calendar (no dairy or modified dairy based on tolerance)
  - Grocery Lists (dairy products reflect tolerance level)
- **Example:**
  - Michael: `dairy_tolerance = 'butter-only'`
    - Food Pyramid: Only butter listed, no cheese
    - Dairy Roadmap: "Butter and ghee are your current options. After 12 weeks, consider testing hard cheeses. Start with 1 oz and monitor digestion."
    - Meals: Ground beef cooked in butter (not cream sauce), steaks pan-seared in butter (not served with cheese)

#### Field: `previous_diets`
- **Usage:** Context for opening narrative and sustainability messaging
- **Report Sections:**
  - Mission Brief (references previous success or explains why past diets failed)
  - Why This Protocol Works (leverages understanding from previous attempts)
  - Your Biggest Challenge, Addressed (if relevant to adherence)
- **Example:**
  - Michael: `previous_diets = 'Keto for 14 months'`
    - Mission Brief: "You've already proven keto works for your body—14 months of great results don't lie. This protocol builds on that success..."
  - User: `previous_diets = 'Low-fat diet, felt deprived and gained weight back'`
    - Why This Works: "Unlike the low-fat approach that left you hungry, carnivore satisfies through high protein and fat."

#### Field: `what_worked`
- **Usage:** Success pattern analysis, reinforcement messaging
- **Report Sections:**
  - Mission Brief (reinforces what worked)
  - Why This Protocol Works (emphasizes mechanisms they've already experienced)
  - Your Biggest Challenge, Addressed (if challenge is adherence, reference what worked before)
  - Personal Closing (references their proven success)
- **Example:**
  - Michael: `what_worked = 'Blood sugar control and weight loss'`
    - Mission Brief: "Your previous keto success strongly predicts you'll respond well."
    - Personal Closing: "You've already done the hard version of this before and succeeded."
  - User: `what_worked = 'Energy from intermittent fasting, but felt restricted'`
    - Why This Works: "Carnivore provides the metabolic clarity of fasting WITHOUT food restriction."

#### Field: `carnivore_experience`
- **Usage:** Expectation setting, timeline detail level
- **Report Sections:**
  - Timeline (detail level)
    - new → Very detailed 30-day timeline with all symptoms, hand-holding
    - weeks → Moderate detail, assumes some keto knowledge
    - months → Optimization focus, assumes adaptation complete
    - years → Performance focus, assumes mastery
  - First Action Step (confidence level)
    - new → Very prescriptive ("Go buy THIS")
    - years → Open-ended ("You know what works for you")
  - Adaptation Timeline section (Doctor tier) (detail level varies)
- **Example:**
  - Michael: `carnivore_experience = 'new'`
    - Timeline: Detailed week-by-week with "Possible fatigue," "Cravings diminishing," etc.
    - First Action Step: Specific shopping list + specific meal
  - User: `carnivore_experience = 'years'`
    - Timeline: Optimized "Week 1 adjustment, return to performance baseline Week 2"
    - First Action Step: "You know what works—this tier provides medical context for optimization"

#### Field: `cooking_skill`
- **Usage:** Recipe complexity, meal simplicity level
- **Report Sections:**
  - Food Pyramid (advanced users see organ meats, sous vide; beginners see ground beef, steaks)
  - Meal Calendar
    - beginner → Simple meals (ground beef + eggs, steak + butter, eggs)
    - intermediate → Added variety (organ meats, different cuts)
    - advanced → Complex dishes (beef tartare, slow-cooked ribs, pâté)
  - Recipes (included in some tiers): Complexity matching
  - Grocery Lists (ingredient preparation level)
- **Example:**
  - Michael: `cooking_skill = 'intermediate'`
    - Food Pyramid: Ground beef, ribeye, NY strip, lamb, pork, organ meats (liver, heart)
    - Meals: Mix of simple (ground beef) and slightly complex (marinated lamb chops)
  - User: `cooking_skill = 'beginner'`
    - Food Pyramid: Ground beef 80/20, ribeye, eggs only (organs removed)
    - Meals: All 2-3 ingredient meals, no organ meats

#### Field: `meal_prep_time`
- **Usage:** Batch prep guidance, meal frequency recommendations
- **Report Sections:**
  - Meal Calendar
    - none → 1-2 meals daily, simple daily cooking
    - some → 2-3x weekly batch prep, focus on pre-cooked meat
    - lots → 1x weekly full meal prep, containers ready
  - Practical Implementation section
    - none → "Cook fresh daily, keep it simple"
    - some → "Batch cook 2-3 lbs ground beef Sunday, use throughout week"
    - lots → "Full Sunday prep: cook proteins, portion into containers"
- **Example:**
  - Michael: `meal_prep_time = 'some'`
    - Meal Calendar: "Every Sunday, do this: Cook 2-3 lbs of ground beef in batches. Hard boil a dozen eggs."
    - Strategy: Meals use pre-cooked proteins throughout week
  - User: `meal_prep_time = 'none'`
    - Meal Calendar: Every meal is simple daily cooking
    - Strategy: "You have time to cook fresh. Keep proteins simple (pan-sear steaks, ground beef scramble)."

#### Field: `budget`
- **Usage:** Ingredient quality tier, cost optimization
- **Report Sections:**
  - Food Pyramid (budget optimization section)
    - budget → "Ground Beef (80/20), $50-80/week is your anchor"
    - moderate → "Mix of ground beef and quality steaks"
    - premium → "Grass-fed beef, pastured eggs, wild-caught fish"
  - Grocery Lists (cut selection)
    - budget → Ground beef, eggs, butter
    - moderate → Added steaks (NYC strip, ribeye), some lamb
    - premium → Grass-fed, A2 dairy, organ meats, wild fish
  - Shopping Tips (Doctor tier)
    - budget → "Buy from local farms, bulk discounts"
    - premium → Quality sourcing emphasis
- **Example:**
  - Michael: `budget = 'moderate'`
    - Food Pyramid: Ground beef 80/20 ($50-80/week), mix with steaks for variety
    - Grocery lists: 5 lbs ground beef, 2 ribeyes (not grass-fed), standard eggs
  - User: `budget = 'budget'`
    - Food Pyramid: "Ground Beef (80/20) is your anchor—$50-80/week covers your protein needs"
    - Grocery lists: 10 lbs ground beef, minimal steaks, eggs in bulk

#### Field: `family_situation`
- **Usage:** Meal scaling, social context, recipe adaptation
- **Report Sections:**
  - Food Pyramid (scale recommendations)
    - solo → Portions for 1
    - partner → Double portions, cooking for 2
    - kids → Scaling to family size, addressing picky eaters
    - extended → Large batch meals
  - Meal Calendar (recipe scaling notes)
    - kids → "Can scale down each protein, serve family at same meal"
  - Practical Implementation section
    - kids → "You can serve the same carnivore meals to your partner and kids. Kids often prefer simple ground beef."
- **Example:**
  - Michael: `family_situation = 'partner + kids'`
    - Report: "You can serve the same carnivore meals to your partner and kids. They don't need to follow carnivore—just serve their portions plain."
    - Meal scaling: Recipes can accommodate family size
  - User: `family_situation = 'solo'`
    - Report: Portions are single-serving, no scaling needed

#### Field: `work_travel`
- **Usage:** Restaurant guide inclusion, convenience emphasis
- **Report Sections:**
  - Dining Out & Travel Survival Guide (Doctor tier)
    - office → "Office lunch planning + nearby restaurant strategies"
    - remote → Minimal (can cook at home)
    - frequent-travel → Full guide included, emphasis on airport food, hotel cooking
  - First Action Step (convenience products if frequent-travel)
    - frequent-travel → "Keep beef sticks in your bag, pre-cooked patties in your cooler"
- **Example:**
  - Michael: `work_travel = 'office'`
    - Dining Out Guide: Moderate emphasis, office lunch strategies
    - Report: "You can pack ground beef to the office or find a nearby burger restaurant."
  - User: `work_travel = 'frequent-travel'`
    - Dining Out Guide: Full inclusion, extensive restaurant scripts and airport strategies

#### Field: `goals`
- **Usage:** Subsection selection in "Why This Protocol Works for You" + motivation emphasis
- **Report Sections:**
  - Why This Protocol Works for You (subsection for each goal)
    - weight_loss → "For Weight Loss" (satiety, fat burning, no calorie obsession)
    - energy → "For Energy" (stable fuel, no crashes)
    - mental → "For Mental Clarity" (stable blood sugar, inflammation reduction)
    - performance → "For Athletic Performance" (efficient fuel, muscle preservation)
    - healing → "For Gut Healing" (elimination, no irritants)
  - Timeline (goal-specific notes)
    - weight_loss → "Week 4: Weight loss evident"
    - energy → "Week 3: Energy returns, consistent"
    - mental → "Week 3: Mental clarity emerging"
  - Personalization (closing notes)
- **Example:**
  - Michael: `goals = ['weight_loss', 'energy', 'mental_clarity']`
    - Why This Works: Three subsections (For Weight Loss, For Energy, For Mental Clarity)
    - Timeline: Week 4 includes "Weight loss evident. Energy consistent. Mental clarity established."
  - User: `goals = ['healing']`
    - Why This Works: Single "For Gut Healing" subsection, heavily emphasis elimination and recovery

#### Field: `biggest_challenge`
- **Usage:** Section heading + custom tactical solutions
- **Report Sections:**
  - Your Biggest Challenge, Addressed (entire section built around this)
    - Challenge is quoted as heading
    - Claude AI generates empathetic response
    - Provides 3-4 tactical solutions specific to their challenge
  - Conquering Your Kryptonite (Doctor tier) (entire section dedicated)
    - Systems approach (not willpower problem)
    - Tactical solutions (meal defaults, remove negotiation points, prep strategy)
    - Emergency protocols (salt trick, 10-minute rule)
- **Example:**
  - Michael: `biggest_challenge = 'I fell off keto after 14 months'`
    - Your Biggest Challenge: Heading "I fell off keto after 14 months"
    - Content: "This is actually valuable data, not failure... carnivore is often easier to maintain..."
    - Solutions: Simpler decisions, no keto treats trap, clear boundaries, stronger why
  - User: `biggest_challenge = 'Managing carnivore while working long hours'`
    - Your Biggest Challenge: Heading "Managing carnivore while working long hours"
    - Content: Time management, batch prep focus, simple default meals
    - Solutions: Pre-cooked proteins, emergency beef sticks, office lunch strategy

#### Field: `additional_notes`
- **Usage:** Closing personalization, specific motivational hooks
- **Report Sections:**
  - Personalized Closing Statement (final 1-2 sentences)
    - References their specific situation
    - Uses exact language from additional_notes if relevant
  - Challenge-specific sections may incorporate notes
- **Example:**
  - Michael: `additional_notes = 'Have kids watching me. Want to be healthy example.'`
    - Personalized Closing: "...and the stakes—your kids, your future—make it non-negotiable."
  - User: `additional_notes = 'Just recovered from surgery, need to regain strength'`
    - Personalized Closing: "Your recovery depends on stable nutrition. This protocol gives you that."

---

## Tier Features Control

The `payment_tiers.features` JSONB object controls which sections are generated:

```typescript
interface TierFeatures {
  includes_meal_plan: boolean;         // Sections 10-12 (Food Pyramid, Meal Calendar, Grocery Lists)
  includes_recipes: number;             // 0, 5, 10 recipes in meal calendar
  includes_shopping_list: boolean;      // Section 12 (Grocery Lists)
  includes_medical_context: boolean;    // Sections 13-21 (Physician guide, protocols, etc.)
  report_expiry_days: number;           // 30, 60, 90, 180
  revision_limit: number;               // 1, 2, 3, 5 revisions allowed
}
```

### Tier Breakdown

**Bundle ($9.99)**
```typescript
{
  includes_meal_plan: false,
  includes_recipes: 0,
  includes_shopping_list: false,
  includes_medical_context: false,
  report_expiry_days: 30,
  revision_limit: 1
}
// Includes: Sections 1-9 only (basics)
```

**Shopping ($19)**
```typescript
{
  includes_meal_plan: false,
  includes_recipes: 5,
  includes_shopping_list: true,
  includes_medical_context: false,
  report_expiry_days: 60,
  revision_limit: 2
}
// Includes: Sections 1-9, 12 (shopping lists but not meal calendar)
```

**MealPlan ($27)**
```typescript
{
  includes_meal_plan: true,
  includes_recipes: 10,
  includes_shopping_list: true,
  includes_medical_context: false,
  report_expiry_days: 90,
  revision_limit: 3
}
// Includes: Sections 1-12 (full meal planning, no medical context)
```

**Doctor ($15)**
```typescript
{
  includes_meal_plan: false,
  includes_recipes: 0,
  includes_shopping_list: false,
  includes_medical_context: true,
  report_expiry_days: 180,
  revision_limit: 5
}
// Includes: Sections 1-9, 13-21 (medical context, physician coordination, no meal calendar)
```

---

## Visual Flow: Michael's Example

```
STEP 1 INPUT:
  sex='male', age=35, height=5'10", weight=185 lbs

STEP 2 INPUT:
  lifestyle='moderate', exercise='5-6x', goal='lose', deficit=20%, diet='carnivore'

STEP 3 CALCULATION:
  TDEE = 1700 (BMR) × 1.55 (moderate) = 2635 → adjusted 2400
  Deficit = 2400 × 0.8 = 1,920 kcal
  Protein = 185 × 0.7 = 130g
  Fat = (1920 - (130 × 4)) / 9 = 160g
  Carbs = 20g (carnivore)

STEP 4 PREMIUM INPUT:
  email='michael@example.com'
  first_name='Michael'
  conditions=['diabetes']
  medications='Metformin 500mg 2x/day, Lisinopril 10mg'
  symptoms='Brain fog, joint pain'
  previous_diets='Keto 14 months'
  what_worked='Blood sugar control, weight loss'
  biggest_challenge='I fell off keto after 14 months'
  tier='Doctor' (includes_medical_context=true)

REPORT OUTPUT SECTIONS GENERATED:
  1. Cover Page (static HTML)
  2. Mission Brief (Claude)
     → References 14 months keto success
  3. Your Daily Targets (backend table)
     → Shows 1,800-2,200 kcal, 130-160g protein, 130-170g fat, <20g carbs
  4. Why This Protocol Works for You (Claude)
     → Subsections:
        - For Blood Sugar & Diabetes (condition-specific)
        - For Mental Clarity (symptom: brain fog)
        - For Weight Loss (goal)
        - For Energy (exercise frequency + goal context)
  5. Your First Action Step (Claude)
     → Shopping list (beef, eggs, butter, salt) + tonight's dinner
  6. 30-Day Timeline (backend table + Claude)
     → Week 1: "Blood sugar may drop—monitor closely with Metformin"
     → Week 4: "Time to check in about Metformin adjustments"
  7. Your Biggest Challenge, Addressed (Claude)
     → "You fell off keto after 14 months"
     → Explanation + 4 tactical solutions
  8. Medical Disclaimer (backend + Claude)
     → Lists Metformin, Lisinopril, diabetes
  9. Personalized Closing (Claude)
     → "One meal at a time, Michael."
  10. Carnivore Food Pyramid (backend + Claude) ← Doctor tier only
  11. Daily Eating Patterns (backend)
  12. Physician Consultation Guide (backend + Claude) ← Doctor tier only
  13. Conquering Your Kryptonite (Claude) ← Doctor tier only
  14. Dining Out & Travel Survival (backend)
  15. Science & Evidence (backend)
  16. Laboratory Reference Guide (backend + Claude)
  17. Electrolyte Protocol (backend)
  18. Adaptation Timeline (backend)
  19. Stall-Breaker Protocol (backend)
  20. 30-Day Symptom Tracker (backend)

TOTAL: 20 sections, ~45KB HTML, ~15,000 words
```

---

## Form Input → Report Section Cross-Reference

**Quick lookup table** (which form field affects which report sections):

| Form Field | Affects Sections | Calculation? | Displayed? |
|------------|------------------|-------------|-----------|
| sex | 4, 6, 7, 13 | Yes (metabolic) | Yes (implicitly) |
| age | 6, 13, 17 | Yes (metabolic) | No |
| height | 3, 4, 13 | Yes (TDEE) | No |
| weight | 3, 4, 6, 11, 12 | Yes (TDEE, macros) | No (ranges used) |
| lifestyle_activity | 3, 4, 13 | Yes (TDEE multiplier) | No |
| exercise_frequency | 4, 17, 18 | Yes (electrolyte, recovery) | Yes (in timeline) |
| goal | 2, 4, 6, 13 | Yes (deficit calculation) | Yes (opening tone) |
| deficit_percentage | 3, 6, 13 | Yes (exact kcal) | Yes (targets table) |
| diet_type | 4, 10, 11, 12, 13 | Yes (food selection) | Yes (food pyramid) |
| calories | 3, 4, 11, 12, 19 | No (from formula) | Yes (targets table) |
| protein_grams | 3, 4, 11, 12 | No (from formula) | Yes (targets table) |
| fat_grams | 3, 4, 11 | No (from formula) | Yes (targets table) |
| carbs_grams | 3, 4, 6 | No (from formula) | Yes (targets table, messaging) |
| email | (storage only) | No | No (RLS soft control) |
| first_name | 1, 2, 7, 9, 13 | No | Yes (personalization) |
| last_name | 9 | No | Yes (closing) |
| medications | 7, 8, 13, 14, 16 | No | Yes (medical context) |
| conditions | 4, 6, 7, 8, 13, 14, 16 | Yes (section selection) | Yes (condition-specific) |
| other_conditions | 4, 6, 7 | Yes (section selection) | Yes (custom sections) |
| symptoms | 4, 6, 18, 20 | Yes (section selection) | Yes (symptom checklist) |
| other_symptoms | 20 | No | Yes (tracker) |
| allergies | 10, 11, 12 | Yes (food selection) | No (excluded from output) |
| avoid_foods | 10, 11, 12 | Yes (food selection) | Yes (mentioned in strategy) |
| dairy_tolerance | 10, 11, 12, 15 | Yes (food selection) | Yes (dairy roadmap) |
| previous_diets | 2, 4, 6, 9 | No | Yes (context) |
| what_worked | 2, 4, 6, 9 | No | Yes (reinforcement) |
| carnivore_experience | 6, 11, 18 | Yes (detail level) | No (affects depth) |
| cooking_skill | 4, 10, 11, 12 | Yes (complexity) | No (affects depth) |
| meal_prep_time | 11, 12 | Yes (strategy) | Yes (prep guidance) |
| budget | 10, 12 | Yes (sourcing tier) | Yes (optimization) |
| family_situation | 4, 11, 12 | Yes (scaling) | No (affects scaling) |
| work_travel | 14 | Yes (section selection) | Yes (if frequent-travel) |
| goals | 4, 6, 9 | Yes (section selection) | Yes (subsection selection) |
| biggest_challenge | 7, 13 | Yes (section creation) | Yes (section heading + content) |
| additional_notes | 9 | No | Yes (closing personalization) |

---

**This mapping is the DNA of Step 6 implementation. Use it to understand exactly how each form field transforms into report content.**
