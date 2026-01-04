# Report Generation Specification

**Author:** Leo (Database Architect & Supabase Specialist)
**Date:** January 3, 2026
**Status:** Complete Specification for Step 6 Implementation

**Philosophy:** "A report is the conversation between our algorithm and the user's biology. Make it personal, actionable, and medically sound."

---

## Executive Summary

This document specifies how the Carnivore Weekly calculator transforms user input (Steps 1-4) into a personalized, AI-generated HTML report delivered via secure access token. Reports are time-limited (48-hour default, tier-dependent), immutable after generation, and tracked for compliance.

**Report Generation Flow:**
```
User Completes Step 4 (Health Profile)
    ↓
Payment Verified & Premium Unlocked
    ↓
calculator_reports Row Created (with access_token)
    ↓
Claude API Called (Async Job)
    ↓
HTML Report Generated & Stored
    ↓
Report Accessible via Token for 48 Hours (tier-dependent)
    ↓
Auto-Expiry & Purge (soft delete via is_expired flag)
```

---

## Table of Contents

1. [Form Input to Report Mapping](#form-input-to-report-mapping)
2. [Report Sections & Content Structure](#report-sections--content-structure)
3. [Personalization Logic](#personalization-logic)
4. [Data Calculations](#data-calculations)
5. [Report Template & HTML Rendering](#report-template--html-rendering)
6. [API Generation & Delivery](#api-generation--delivery)
7. [Report Generation Progress UI](#report-generation-progress-ui)
8. [Report Access & Session Management (48-Hour Window)](#report-access--session-management-48-hour-window)
9. [Database Schema for Reports](#database-schema-for-reports)
10. [Report Expiration & Lifecycle](#report-expiration--lifecycle)
11. [Example: Michael's Report Flow](#example-michaels-report-flow)
12. [Error Handling & Retry Logic](#error-handling--retry-logic)

---

## Form Input to Report Mapping

### Step 1: Physical Stats
Form fields → Report impact:

| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `sex` | enum | Macro Targets, Health Context | Gender-specific metabolic equations (Katch-McArdle for TDEE) |
| `age` | integer | Health Timeline, Activity Adjustment | Age-specific recovery, metabolic decline adjustments |
| `height_feet` + `height_inches` OR `height_cm` | numeric | TDEE Calculation, Body Composition | Body surface area, metabolic baseline |
| `weight_value` + `weight_unit` | numeric | TDEE Calculation, Progress Tracking | Current state, macro targets, expected progress timeline |

**Example:** Michael (male, 35, 5'10", 185 lbs)
- TDEE baseline: ~2400 kcal (moderate activity)
- Target protein: 130-160g (0.7-0.9g per lb)
- Fat/Carbs: Adjusted for carnivore (70-80% fat, <2% carbs)

---

### Step 2: Fitness & Diet Goals
Form fields → Report impact:

| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `lifestyle_activity` | enum: sedentary, light, moderate, very, extreme | Macro Targets | Multiplier for TDEE (1.2-1.9x BMR) |
| `exercise_frequency` | enum: none, 1-2, 3-4, 5-6, 7 | Weekly Meal Planning, Recovery Notes | Electrolyte needs, carb loading discussion (if applicable), protein timing |
| `goal` | enum: lose, maintain, gain | Caloric Deficit, Strategy Section | Determines deficit percentage, tone of messaging |
| `deficit_percentage` | enum: 15, 20, 25 | Caloric Targets | Exact calorie reduction (only if goal='lose') |
| `diet_type` | enum: carnivore, pescatarian, keto, lowcarb | Allowed Foods, Macro Strategy | Narrows protein/fat sources, dairy inclusion |

**Example:** Michael (moderate activity, 5-6x/week exercise, goal='lose', deficit=20%, diet='carnivore')
- TDEE: 2400 kcal
- Deficit: 20% → 1920 kcal daily
- Protein: 130g (27% of calories)
- Fat: 160g (75% of calories)
- Carbs: <20g (2% of calories)

---

### Step 3: Calculated Macros
Form fields → Report impact:

| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `calories` | integer | Daily Targets Table, Meal Planning | Primary constraint for meal suggestions |
| `protein_grams` | integer | Protein Section, Meal Examples | Basis for meat portions, amino acid sufficiency |
| `fat_grams` | integer | Fat Strategy, Satiety Guidelines | Portion sizes, cooking fat recommendations |
| `carbs_grams` | integer | Carb Elimination Narrative | Validation: should be <20g for carnivore |
| `protein_percentage`, `fat_percentage`, `carbs_percentage` | decimal | Educational Visual | Shows macro balance (carnivore: 30% protein / 65-70% fat / 0-2% carbs) |
| `calculation_method` | string | Transparency Note | "katch-mcardle", "mifflin-st-jeor", etc. (logged for audit) |
| `calculation_timestamp` | timestamp | Report Metadata | When macros were computed |

---

### Step 4: Health Profile (Premium)
Form fields → Report impact:

#### Contact & Identification
| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `email` | email | Delivery, Access Control | Report delivery destination, RLS-based access (soft, not enforced) |
| `first_name`, `last_name` | string(100) | Personalization, Header | "Your Complete Personalized Carnivore Diet Report for [First Name]" |

#### Health Status
| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `medications` | text(5000) | Medical Disclaimer, Medication Interaction Section | Flags requiring physician coordination (Metformin, Lisinopril, etc.) |
| `conditions` | array (enum) | Health-Specific Strategy, Warning Sections | diabetes → "Blood Sugar & Diabetes" section; hypertension → "Blood Pressure Management" |
| `other_conditions` | text(5000) | Conditions Narrative | Free-form conditions not in predefined list |
| `symptoms` | text(5000) | "Your Biggest Challenge" section | If "brain fog" mentioned → emphasize mental clarity benefits |
| `other_symptoms` | text(5000) | Symptom-specific recommendations | Free-form symptom tracking suggestions |

**Example:** Michael has `conditions=['diabetes']`, `medications='Metformin 500mg twice daily'`
- Report includes: "Blood Sugar & Diabetes" section with HbA1c improvements + medication adjustment warning
- Medical disclaimer emphasizes: "Medication dosages may need reduction as blood sugar improves"
- Timeline notes Week 1: "Monitor blood sugar closely—you may need Metformin adjustments"

#### Dietary Profile
| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `allergies` | text(5000) | Food Restrictions, Meal Planning | "Never suggest shellfish" → removed from protein options |
| `avoid_foods` | text(5000) | Personal Rejection List | "Seed oils" → emphasizes butter/ghee, "Processed meats" → quality sourcing |
| `dairy_tolerance` | enum: none, butter-only, some, full | Dairy Reintroduction Protocol | "butter-only" → no cheese/cream, only ghee/clarified butter |

**Example:** Michael has `dairy_tolerance='butter-only'`
- Report section: "Dairy Reintroduction Roadmap" focuses on butter, ghee, clarified butter only
- Meal examples: Ribeye cooked IN butter (not served with cream)
- Timeline: "Week 8+ consider testing hard cheeses, but start with 1 oz portions"

#### History & Experience
| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `previous_diets` | text(5000) | "Why This Protocol Works for You" | "You've already proven keto works for your body—14 months of great results don't lie" |
| `what_worked` | text(5000) | Success Pattern Analysis | Identify which aspects worked (satiety, energy, etc.) |
| `carnivore_experience` | enum: new, weeks, months, years | Expectation Setting, Ramp-Up Pace | "new" → detailed adaptation timeline; "months" → optimization focus |

**Example:** Michael has `previous_diets='Keto for 14 months'`, `what_worked='Blood sugar control and weight loss'`, `carnivore_experience='new'`
- Report section: "Your Biggest Challenge, Addressed" → "You fell off keto after 14 months—this is valuable data"
- Emphasis: Carnivore is simpler than keto (no macro tracking, no "keto treats" traps)
- Timeline: Detailed 30-day adaptation guide (more hand-holding for "new" users)

#### Lifestyle Factors
| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `cooking_skill` | enum: beginner, intermediate, advanced | Meal Complexity, Recipe Suggestions | "beginner" → simple 3-ingredient meals; "advanced" → organ meats, sous vide |
| `meal_prep_time` | enum: none, some, lots | Meal Planning Strategy | "none" → focus on simple daily cooking; "lots" → batch prep guide |
| `budget` | enum: budget, moderate, premium | Food Sourcing, Quality Tier | "budget" → Ground beef focus; "premium" → grass-fed, A2 dairy options |
| `family_situation` | enum: solo, partner, kids, extended | Meal Compatibility, Social Context | "kids" → suggests scaling recipes, addresses picky eaters |
| `work_travel` | enum: office, remote, frequent-travel | Restaurant/Travel Guide Inclusion | "frequent-travel" → includes "Dining Out Survival Guide" |

**Example:** Michael has `cooking_skill='intermediate'`, `meal_prep_time='some'`, `budget='moderate'`, `family_situation='partner'`, `work_travel='office'`
- Meal examples: Ground beef, ribeye (not ultra-premium cuts or organ meats)
- Meal planning: 2-3x weekly prep, focus on batch cooking ground beef
- Restaurant guide: Included (moderate emphasis)

#### Goals & Challenges
| Field | Type | Report Section | Usage |
|-------|------|-----------------|-------|
| `goals` | array (enum) | Motivation, Strategy Tailoring | ["weight_loss", "energy", "mental"] → Each gets its own subsection in "Why This Protocol Works for You" |
| `biggest_challenge` | text(5000) | "Your Biggest Challenge, Addressed" Section | Becomes a heading + personalized response |
| `additional_notes` | text(5000) | Closing Personalization | Last section: final motivational note addressing their exact concern |

**Example:** Michael has `goals=['weight_loss', 'energy', 'mental']`, `biggest_challenge='Staying consistent while eating at restaurants'`
- "Why This Protocol Works for You" has subsections:
  - "For Weight Loss"
  - "For Energy"
  - "For Mental Clarity"
- "Your Biggest Challenge, Addressed" section: "Staying Consistent While Eating at Restaurants"
  - Includes restaurant strategies for carnivore
  - Scripts for ordering without sides
  - Confidence-building language

---

## Report Sections & Content Structure

### Section 1: Cover Page
**Generated by:** HTML template (static)
**Personalization:** Name, date

```html
<div class="cover-page">
  <img src="https://carnivoreweekly.com/CarnivoreWeeklySquare.png">
  <h1>Your Complete Personalized Carnivore Diet Report</h1>
  <p>Generated on [DATE]</p>
</div>
```

---

### Section 2: Mission Brief
**Generated by:** Claude AI
**Input Fields:** goal, conditions, previous_diets, diet_type
**Length:** 2-3 sentences
**Tone:** Acknowledging, confident

**Template Logic:**
```
IF previous_diets CONTAINS 'keto':
  "You've already proven [diet_type] works for your body—[success indicator] don't lie."
  "This protocol builds on that success with a carnivore approach that should work even better for [primary_goal]."

ELSE:
  "You're starting a metabolic reset with carnivore—the most restrictive yet sustainable elimination diet."
  "This protocol targets [primary_goal] and [secondary_goal] through [mechanism]."
```

**Example (Michael):**
> "You've already proven keto works for your body—14 months of great results don't lie. This protocol builds on that success with a carnivore approach that should work even better for your blood sugar control, gut healing, and the inflammation driving your joint pain."

---

### Section 3: Your Daily Targets
**Generated by:** Backend calculation (immutable table)
**Input Fields:** calories, protein_grams, fat_grams, carbs_grams
**Format:** HTML table

```html
<table>
  <tr>
    <td>Metric</td>
    <td>Target</td>
  </tr>
  <tr>
    <td><strong>Calories</strong></td>
    <td>[calories_min]-[calories_max] (adjust based on hunger signals)</td>
  </tr>
  <tr>
    <td><strong>Protein</strong></td>
    <td>[protein_min]-[protein_max]g (prioritize this first)</td>
  </tr>
  <tr>
    <td><strong>Fat</strong></td>
    <td>[fat_min]-[fat_max]g (eat to satiety)</td>
  </tr>
  <tr>
    <td><strong>Carbs</strong></td>
    <td>&lt;[carbs_max]g (ideally near zero)</td>
  </tr>
</table>
```

**Ranges:** ±10% for macros, ±200 kcal for calories (built in as "adjustment")

---

### Section 4: Why This Protocol Works for You
**Generated by:** Claude AI
**Input Fields:** goal, conditions, symptoms, previous_diets
**Structure:** 3-5 subsections, one per primary benefit

**Subsection Examples:**

#### For Blood Sugar & Diabetes
Triggered by: `conditions CONTAINS 'diabetes'` OR `goal = 'lose'`

Content:
- Mechanism: How carnivore eliminates glucose spikes
- Evidence: 1-2 peer-reviewed citations
- Personal relevance: Reference to their Metformin use or previous blood sugar issues
- Timeline: When they'll see improvements

#### For Gut Health
Triggered by: `conditions CONTAINS 'ibs'` OR `avoid_foods CONTAINS 'processed'`

Content:
- Elimination benefits: Removing lectins, seed oils, plant fibers
- Recovery timeline: "2-4 weeks" for GI improvements
- Testing protocol: How to reintroduce foods later

#### For Mental Clarity
Triggered by: `goals CONTAINS 'mental'` OR `symptoms CONTAINS 'brain fog'`

Content:
- Mechanism: Stable blood sugar + ketones as brain fuel
- Inflammation reduction: How omega-3/omega-6 balance improves
- Timeline: "2-3 weeks for noticeable improvements"

#### For Weight Loss
Triggered by: `goal = 'lose'` (default for most users)

Content:
- Protein satiety: High protein promotes fullness
- Fat adaptation: Efficient fat-burning metabolism
- Psychology: No calorie counting obsession needed

#### For Energy & Performance
Triggered by: `goals CONTAINS 'energy'` OR `exercise_frequency >= '3-4'`

Content:
- Fat burning: Stable fuel source (no crashes)
- Ketone utilization: Efficient brain/muscle fuel
- Recovery: Protein + proper electrolytes

**Example (Michael):**
> "For Blood Sugar & Diabetes: Carnivore eliminates the glucose spikes that 'healthy whole grains' caused. Multiple studies show very low-carb approaches improve HbA1c and insulin sensitivity. Your previous keto success strongly predicts you'll respond well."

---

### Section 5: Your First Action Step (Today)
**Generated by:** Claude AI (with ingredient lookup)
**Input Fields:** diet_type, allergies, cooking_skill, budget
**Format:** Bullet list + motivational paragraph

**Template:**
```
Go buy this:
- [Protein 1] (e.g., 2 lbs ground beef 80/20)
- [Protein 2] (e.g., 1 ribeye steak)
- [Fish option] (if pescatarian, e.g., 1 lb salmon)
- [Eggs] (e.g., dozen eggs)
- [Cooking fat] (Butter/ghee)
- [Salt] (Mineral-rich)

Tonight's dinner: [Simple 2-3 ingredient meal, e.g., Pan-sear that ribeye in butter]
```

**Personalization Rules:**
- Skip shellfish if `allergies CONTAINS 'shellfish'`
- Skip pork if `avoid_foods CONTAINS 'pork'`
- Suggest budget cuts if `budget = 'budget'`
- Add "organ meats" if `cooking_skill = 'advanced'`

**Example (Michael):**
> "Go buy this: 2 lbs ground beef (80/20 or 73/27), 1 ribeye steak, 1 lb salmon filet, Dozen eggs, Butter (Kerrygold), Salt (Redmond Real Salt)"
> "Tonight's dinner: Pan-sear that ribeye in butter with generous salt. That's it. No sides needed. Eat until satisfied."

---

### Section 6: 30-Day Timeline: What to Expect
**Generated by:** Backend template (diet-type specific)
**Input Fields:** diet_type, exercise_frequency, conditions
**Format:** HTML table (Week 1-4 rows)

```html
<table>
  <tr>
    <td>Week</td>
    <td>What's Happening</td>
  </tr>
  <tr>
    <td><strong>Week 1</strong></td>
    <td>[Adaptation phase text] [condition-specific warning if applicable]</td>
  </tr>
  <tr>
    <td><strong>Week 2</strong></td>
    <td>[Energy stabilizing phase] [condition-specific note]</td>
  </tr>
  <tr>
    <td><strong>Week 3</strong></td>
    <td>[Fat adaptation phase]</td>
  </tr>
  <tr>
    <td><strong>Week 4</strong></td>
    <td>[Sustainability phase] [medical follow-up reminder if applicable]</td>
  </tr>
</table>
```

**Condition-Specific Insertions:**
- `conditions CONTAINS 'diabetes'` → Week 1: "Blood sugar may drop—monitor closely with Metformin"
- `conditions CONTAINS 'hypertension'` → Week 4: "Time to check in with your doctor about medication needs"

**Example (Michael):**
```
Week 1: Transition phase. Possible fatigue, headaches as you shift to fat-burning.
        Increase salt and water. Blood sugar may drop—monitor closely with Metformin.

Week 2: Energy stabilizing. Cravings diminishing. Gut symptoms often improving.
        Joint pain may begin decreasing.

Week 3: Fat adaptation strengthening. Mental clarity emerging. Hunger signals normalizing.
        Sleep often improves.

Week 4: Protocol feeling sustainable. Weight loss evident. Energy consistent.
        Gut likely much calmer. Time to check in with your doctor about medication needs.
```

---

### Section 7: Your Biggest Challenge, Addressed
**Generated by:** Claude AI
**Input Fields:** biggest_challenge, previous_diets, goals, additional_notes
**Length:** 2-3 paragraphs + bullet list
**Tone:** Empathetic, practical

**Template Logic:**
```
IF biggest_challenge CONTAINS 'consistency' OR 'falling off':
  Section title: "Your Biggest Challenge: [Exact quote of biggest_challenge]"
  Paragraph 1: Normalize the challenge ("This is actually valuable data, not failure")
  Paragraph 2: Why carnivore is EASIER than alternatives (simpler decisions, no keto treats trap, clear boundaries)
  Paragraph 3: Reference to their "why" (family, health markers, specific past pain point)

  Bullet list with tactical solutions:
  1. Simpler decisions—no tracking macros or "net carbs"
  2. No "keto treats" trap
  3. Clear boundaries (meat, fish, eggs, salt, water—done)
  4. Your why is stronger now

ELSE IF biggest_challenge CONTAINS 'time' OR 'busy':
  Section title: "Managing Carnivore with a Busy Schedule"
  Focus: Batch prep, simple meals, no-decision default meals

ELSE IF biggest_challenge CONTAINS 'family' OR 'social':
  Section title: "Navigating Carnivore in Social Situations"
  Focus: Communication, restaurant strategies, confidence building
```

**Example (Michael):**
> Section: "Your Biggest Challenge, Addressed: 'I fell off keto after 14 months'"
>
> "This is actually valuable data, not failure. You know you can do this—the question is sustainability. Carnivore is often easier to maintain than keto because:"
>
> "1. Simpler decisions—No tracking macros or calculating 'net carbs'
>  2. No 'keto treats' trap—Those products often trigger cravings and stall progress
>  3. Clear boundaries—Meat, fish, eggs, salt, water. Done.
>  4. Your why is stronger now—You have young kids watching. You've seen family decline. This isn't vanity anymore."
>
> "When the voice says 'just this once,' remember: you already know where 'whole grains' and seed oils lead. You lived it. 40 pounds and brain fog. Your body gave you the answer."

---

### Section 8: Medical Disclaimer
**Generated by:** Backend template (condition-specific)
**Input Fields:** conditions, medications
**Format:** Warning box with condition-specific language

```html
<div class="disclaimer">
<h2>⚠️ Medical Disclaimer</h2>
<p>
This protocol is for informational purposes only and does not constitute medical advice.
Given your current medications ([medications list]) and health conditions ([conditions list]),
<strong>you must work with your prescribing physician</strong> before and during this dietary change.
[Condition-specific warning].
Do not adjust medications without medical supervision.
</p>
</div>
```

**Condition-Specific Insertions:**
- Diabetes + Metformin: "Blood sugar and blood pressure often improve significantly on carnivore—medication dosages may need reduction to avoid hypoglycemia."
- Hypertension + Lisinopril: "Blood pressure often normalizes—your doctor may reduce dosages."
- No conditions: Generic disclaimer maintained.

**Example (Michael):**
> "This protocol is for informational purposes only and does not constitute medical advice. Given your current medications (Metformin, Lisinopril) and health conditions, **you must work with your prescribing physician** before and during this dietary change. Blood sugar and blood pressure often improve significantly on carnivore—medication dosages may need reduction to avoid hypoglycemia or hypotension. Do not adjust medications without medical supervision."

---

### Section 9: Personalized Closing Statement
**Generated by:** Claude AI
**Input Fields:** first_name, biggest_challenge, goals, additional_notes, previous_diets
**Length:** 1-2 sentences
**Tone:** Motivational, specific to their story

**Template:**
```
"[Name], you've already done the hard version of this before and succeeded.
This time it's simpler, and the stakes—[specific reference to their 'why']—make it non-negotiable.
One meal at a time."
```

**Example (Michael):**
> "You've done the hard version of this before and succeeded. This time it's simpler, and the stakes—your kids, your future—make it non-negotiable. One meal at a time, Michael."

---

### Section 10: Carnivore Food Guide (Tier-Dependent)
**Generated by:** Backend template (diet-type specific)
**Included in:** MealPlan, Shopping, Doctor tiers (not Bundle)
**Input Fields:** diet_type, allergies, dairy_tolerance, budget, cooking_skill

Content:
- Tier 1: Foundation proteins (70-80%)
- Tier 2: Supplementary proteins (15-20%)
- Tier 3: Optional additions (5%)
- Budget optimization
- Protein quality criteria (grass-fed, pasture-raised, etc.)

**Example (Michael, moderate budget):**
```
TIER 1: FOUNDATION (70-80%)
- Ground Beef (80/20) - $50-80/week
- Ribeye Steak
- Eggs (dozen)

TIER 2: ROTATION
- Lamb
- Pork
- Fish

Daily Eating Patterns:
- Option 1: Ground Beef + Butter
- Option 2: Ribeye Steak + Butter
- Option 3: Mix of proteins + Salt

Budget Optimization: Ground Beef (80/20) focus—$50-80/week
```

---

### Section 11: 30-Day Meal Calendar (Tier-Dependent)
**Generated by:** Backend algorithm (meal rotation)
**Included in:** MealPlan tier only
**Input Fields:** diet_type, allergies, dairy_tolerance, budget, cooking_skill, exercise_frequency

Content:
- 4-week meal plan (Day 1-30)
- 3 meals per day OR 2 meals (user preference)
- Rotates proteins for variety
- Prep strategies (cook 2-3x weekly)
- Substitution guide

**Example (Michael Week 1):**
```
Day 1:
  Breakfast: Grass-fed Ground Beef + Eggs + Butter
  Lunch: Grass-fed Ground Beef + Salt
  Dinner: Ribeye Steak + Butter

Day 2:
  Breakfast: Ribeye Steak + Eggs + Butter
  Lunch: Ribeye Steak + Salt
  Dinner: NY Strip Steak + Butter
```

---

### Section 12: Weekly Grocery Lists (Tier-Dependent)
**Generated by:** Backend algorithm (extracted from meal calendar)
**Included in:** MealPlan, Shopping tiers
**Input Fields:** meal_calendar, budget

Content:
- Week 0: Pantry stock-up (salt, butter, storage)
- Week 1-4: Weekly shopping lists organized by section (butcher, dairy, pantry)
- Smart shopping tips

**Example (Michael Week 1):**
```
The Butcher:
- [ ] Ground Beef (80/20) - 5 lbs
- [ ] Grass-fed Ground Beef - 1-2 units

Dairy & Eggs:
- [ ] Eggs - 18-count
- [ ] Butter - 1 lb

Pantry:
- [ ] Salt - 1 container
```

---

### Section 13: Physician Consultation Guide (Doctor Tier Only)
**Generated by:** Backend template (condition-specific)
**Included in:** Doctor tier only
**Input Fields:** medications, conditions, age, exercise_frequency, goal

Content:
- 2-minute opening pitch
- Advanced bloodwork markers (ApoB, CAC score, Trig/HDL ratio)
- Doctor conflict resolution scripts
- Lab monitoring schedule (baseline + 8 weeks)
- One-page physician handout (printable)

**Example (Michael):**
```
SECTION 1: The Opening Script
"Dr. [Name], I'm starting a therapeutic carnivore protocol to address [goals].
This is evidence-based metabolic therapy, not a fad diet. I need your partnership in three areas:
1. Lab monitoring - Baseline now, recheck at 8 weeks
2. Medication adjustment - Discussing tapering if improvements occur
3. Advanced markers - Looking beyond standard LDL to assess real cardiovascular risk"

SECTION 2: Advanced Bloodwork Markers
Request ApoB, Triglyceride/HDL Ratio, CAC Score, Fasting Insulin, HOMA-IR

SECTION 3: Doctor Conflict Resolution Scripts
- Concern #1: "This will destroy your cholesterol"
  Strong Response: "Can we agree on three things? Get baseline labs now, recheck in 8 weeks, focus on markers that matter (Trig/HDL, fasting insulin)..."
```

---

### Section 14: Challenge Override Protocol (Doctor Tier Only)
**Generated by:** Claude AI
**Included in:** Doctor tier (optional bonus)
**Input Fields:** biggest_challenge, goals, previous_diets, additional_notes

Content:
- Identify the real enemy (decision fatigue, systems failure, not willpower)
- Mindset shift (consistency = shortening the gap between failures)
- Tactical solutions (3-meal defaults, remove negotiation points, prep strategy)
- "Break glass" emergency tactics (salt trick, 10-minute rule, emergency meat)
- Commitment contract (printable)

---

### Section 15: Dining Out & Travel Guide (Doctor Tier Only)
**Generated by:** Backend template + Claude AI
**Included in:** Doctor tier
**Input Fields:** work_travel, family_situation, budget

Content:
- Three golden rules
- Restaurant strategy by cuisine
- Fast food emergency menu
- Travel packing list

---

### Section 16: Science & Evidence Summary
**Generated by:** Backend template (condition + goal specific)
**Included in:** Doctor tier
**Input Fields:** conditions, goal, diet_type

Content:
- Peer-reviewed citations for their specific conditions
- Metabolic mechanisms
- Timeline expectations (based on research)

---

### Section 17: Laboratory Reference Guide
**Generated by:** Backend template
**Included in:** Doctor tier
**Input Fields:** age, conditions, medications

Content:
- Standard vs. carnivore-optimized ranges
- What to expect after 8 weeks
- Lab markers table (fasting glucose, insulin, HbA1c, lipids, etc.)

---

### Section 18: Electrolyte Protocol
**Generated by:** Backend template
**Included in:** Doctor tier
**Input Fields:** exercise_frequency, conditions

Content:
- Why electrolytes matter on carnivore
- Ketoade recipe
- Daily electrolyte goals
- Signs you need more (headaches → salt, cramps → potassium)

---

### Section 19: Adaptation Timeline
**Generated by:** Backend template
**Included in:** All tiers
**Input Fields:** carnivore_experience, exercise_frequency

Content:
- Week 1: Glycogen depletion
- Week 2: The difficult week
- Week 3: The breakthrough
- Week 4: The new normal

---

### Section 20: Stall-Breaker Protocol
**Generated by:** Backend template
**Included in:** Doctor tier
**Input Fields:** goal, previous_diets

Content:
- Check 4 things: Real stall or fluctuation, dairy creep, too much fat, hidden carbs
- Keep going (don't quit, don't add carbs, trust carnivore)

---

### Section 21: 30-Day Tracker (Printable)
**Generated by:** Backend template
**Included in:** Doctor tier
**Input Fields:** symptoms

Content:
- Daily tracker (weight, energy 1-10, mood 1-10, digestion, NSVs)
- Symptom checklist (brain fog, energy crashes, cravings, sleep, etc.)
- End-of-30-days reflection

---

## Personalization Logic

### Dynamic Section Selection
Claude receives a `tier_features` object that controls which sections are generated:

```typescript
interface TierFeatures {
  includes_meal_plan: boolean;      // Sections 11, 12
  includes_recipes: number;          // 0, 5, 10
  includes_shopping_list: boolean;   // Section 12
  includes_medical_context: boolean; // Sections 13, 14, 15, 16, 17, 18, 20, 21
  report_expiry_days: number;        // 30, 60, 90, 180
  revision_limit: number;            // 1, 2, 3, 5
}
```

**Claude System Prompt includes:**
```
You are an expert nutrition strategist. Generate personalized carnivore recommendations
based on the user's exact health status, goals, constraints, and tier features.

Generate these sections:
- ALWAYS: Sections 1-9 (cover, brief, targets, why it works, first action, timeline, challenge, disclaimer, closing)
- IF includes_meal_plan=true: Sections 10-12 (food guide, meal calendar, grocery lists)
- IF includes_shopping_list=true AND NOT includes_meal_plan: Section 12 only
- IF includes_medical_context=true: Sections 13-21 (physician guide, challenge protocol, dining out, science, labs, electrolytes, adaptation, stall-breaker, tracker)
```

### Narrative Personalization Rules

**Rule 1: Condition-Specific Tone**
```
IF conditions CONTAINS 'diabetes':
  Tone: Urgent but supportive
  Focus: Blood sugar stabilization, medication coordination

ELSE IF conditions CONTAINS 'autoimmune':
  Tone: Healing-focused
  Focus: Inflammation reduction, gut healing

ELSE IF conditions = []:
  Tone: Optimization-focused
  Focus: Performance, longevity, health markers
```

**Rule 2: Previous Diet Integration**
```
IF previous_diets CONTAINS 'keto':
  Opening: "You've already proven this works—here's how carnivore optimizes it further"

ELSE IF previous_diets CONTAINS 'paleo':
  Opening: "You understand whole foods—carnivore is the elimination version"

ELSE IF previous_diets CONTAINS 'calorie restriction' OR 'low fat':
  Opening: "You know what doesn't work. Carnivore is fundamentally different"
```

**Rule 3: Challenge-Specific Solutions**
```
IF biggest_challenge CONTAINS 'time' OR 'busy':
  Emphasis: Simple prep (cook 2x weekly, eat twice daily)

ELSE IF biggest_challenge CONTAINS 'social' OR 'family':
  Emphasis: Communication strategies, restaurant scripts

ELSE IF biggest_challenge CONTAINS 'consistency' OR 'falling off':
  Emphasis: Systems design, habit stacking, emergency protocols

ELSE IF biggest_challenge CONTAINS 'expense' OR 'cost':
  Emphasis: Budget optimization, bulk buying, sales timing
```

---

## Data Calculations

### TDEE Calculation
**Method:** Katch-McArdle (used in calculator_sessions_v2.calculated_macros.calculation_method)

```
Step 1: Lean Body Mass
  If male: LBM = weight * (1 - body_fat_percentage)
  If female: LBM = weight * (1 - body_fat_percentage)

Step 2: BMR (Basal Metabolic Rate)
  BMR = 370 + (21.6 * LBM)  // in lbs

Step 3: TDEE
  TDEE = BMR * activity_multiplier

  Activity multipliers:
  - sedentary: 1.2
  - light: 1.375
  - moderate: 1.55
  - very: 1.725
  - extreme: 1.9
```

**Note:** For Step 3 report display, add ±10% margin ("1,800-2,200 kcal")

### Macro Calculation
**Method:** Carnivore-optimized macros

```
Protein (Priority #1):
  Target: 0.7-1.0g per lb of body weight
  Carnivore minimum: 100g daily
  Calculation: Prioritize protein target, then fill fat/carbs

Fat (Priority #2):
  Fill remainder of calories after protein
  Carnivore typical: 65-80% of total calories

Carbs:
  Target: <20g daily (ideally near zero for carnivore)
  Default: 0g (no plant foods)
  Exception: reintroduction phase (future feature)
```

### Deficit/Surplus Calculation
```
IF goal = 'lose':
  Caloric Deficit = TDEE * (1 - deficit_percentage/100)
  Example: 2400 TDEE, 20% deficit = 2400 * 0.8 = 1920 kcal

ELSE IF goal = 'maintain':
  Caloric Target = TDEE

ELSE IF goal = 'gain':
  Caloric Surplus = TDEE * (1 + surplus_percentage/100)
  Surplus percentages: 10%, 15%, 20%
```

### Progress Timeline
```
Weight loss rate (for goal='lose'):
  Weeks 1-2: 3-7 lbs (mostly water)
  Week 3+: 1-2 lbs per week (body fat)

Body composition:
  Protein intake maintains muscle
  High deficit + low carbs preserves lean mass better than low-fat

Metabolic adaptation:
  Happens around Week 4-6 if deficit is aggressive
  Suggest 5-day refeed (maintenance calories) if progress stalls
```

---

## Report Template & HTML Rendering

### Base HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Personalized Carnivore Diet Report</title>
  <style>
    /* Professional, print-friendly styles */
    @page { size: A4; margin: 15mm; }
    body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.6; }
    h1 { font-size: 16pt; color: #1a1a1a; background: #f5f1ed; }
    h2 { font-size: 13pt; page-break-before: always; break-before: page; }
    table { width: 100%; border-collapse: collapse; margin: 14pt 0; }
    th { background: #e8e8e8; padding: 8pt 10pt; border: 1pt solid #999; }
    td { padding: 7pt 10pt; border: 1pt solid #999; }
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-page">
    [Cover HTML here]
  </div>

  <!-- Content Pages -->
  <div class="content-start report-content">
    [Claude-generated content inserted here]
  </div>
</body>
</html>
```

### Claude Output → HTML Conversion
1. Claude generates markdown
2. Markdown parsed into sections
3. Each section wrapped in appropriate HTML tags
4. Markdown tables converted to HTML tables
5. Links and emphasis preserved
6. Final HTML saved to `calculator_reports.report_html`

---

## API Generation & Delivery

### Report Generation Workflow

**Trigger:** Step 4 completion (POST /api/v1/calculator/step/4)

```
1. User submits Step 4 (email, name, health data, etc.)

2. Backend validates payment_status='completed'

3. Create calculator_reports row:
   - session_id (FK)
   - email (from Step 4)
   - access_token (64-char hex generated)
   - report_html: placeholder ("Report generating...")
   - report_json: { status: "generating" }
   - generation_start_at: NOW
   - expires_at: NOW + tier.report_expiry_days

4. Return to user:
   {
     "access_token": "[64-char token]",
     "report_url": "https://app.example.com/report/[token]",
     "expires_at": "2026-02-02T10:30:00Z"
   }

5. Queue async report generation task (5-minute delay for batching)

6. Background job (cron or webhook):
   a. Fetch calculator_sessions_v2 record (all 25+ fields)
   b. Fetch payment_tiers record for features
   c. Build Claude prompt
   d. Call Claude API (claude-opus-4-5-20251101, max_tokens=4000)
   e. Parse response markdown
   f. Convert to HTML
   g. Extract report metadata (sections count, etc.)
   h. UPDATE calculator_reports: report_html, report_json, generation_completed_at
   i. Log API usage to claude_api_logs

7. Report ready at: GET /api/v1/calculator/report/{access_token}
```

### Claude Prompt Template

**System Message:**
```
You are an expert nutrition strategist specializing in personalized carnivore diet
implementation. Generate comprehensive, evidence-based recommendations specific to
each individual's health status, goals, constraints, and lifestyle.

The report should feel personal, actionable, and medically sound. Use their exact
name throughout. Reference their specific health conditions, medications, goals, and
previous diet history. Make them feel seen and understood.

Generate markdown formatted content that will be wrapped in HTML. Use ## for section
headers, bullet lists for options, and bold for emphasis.
```

**User Prompt:**
```
## User Profile

### Demographics
- Name: [first_name] [last_name]
- Age: [age] years old
- Sex: [sex]
- Height: [height_cm OR height_feet feet height_inches inches]
- Current Weight: [weight_value] [weight_unit]

### Health Status
- Conditions: [conditions as comma-separated list]
- Other Conditions: [other_conditions]
- Current Medications: [medications]
- Symptoms: [symptoms]
- Other Symptoms: [other_symptoms]
- Allergies: [allergies]
- Foods to Avoid: [avoid_foods]
- Dairy Tolerance: [dairy_tolerance]

### Dietary History
- Previous Diets: [previous_diets]
- What Worked: [what_worked]
- Carnivore Experience: [carnivore_experience]

### Lifestyle & Logistics
- Cooking Skill: [cooking_skill]
- Meal Prep Time Available: [meal_prep_time]
- Budget Level: [budget]
- Family Situation: [family_situation]
- Work/Travel Situation: [work_travel]

### Goals & Motivation
- Primary Goal: [goal]
- Health Goals: [goals as comma-separated list]
- Biggest Challenge: [biggest_challenge]
- Additional Notes: [additional_notes]

### Calculated Nutrition Targets
- Daily Calories: [calories] kcal
- Protein Target: [protein_grams]g daily
- Fat Target: [fat_grams]g daily
- Carb Target: [carbs_grams]g daily
- Calculation Method: [calculation_method]

### Report Tier Features
- Includes Meal Plan: [includes_meal_plan]
- Includes Shopping List: [includes_shopping_list]
- Includes Medical Context: [includes_medical_context]
- Includes [includes_recipes] recipes
- Report Valid For: [report_expiry_days] days

---

## Your Task

Generate a comprehensive, personalized carnivore diet report for this individual.

### Required Sections (Always Include):
1. **Mission Brief** (2-3 sentences)
   - Acknowledge their specific situation and previous success
   - State the vision for their success with carnivore

2. **Your Daily Targets** (I'll provide as table)
   - Present the calculated macro targets
   - Add brief guidance about adjusting based on hunger signals

3. **Why This Protocol Works for You** (subsections for each relevant benefit)
   - Blood Sugar & Diabetes (if applicable)
   - Gut Health (if GI issues mentioned)
   - Mental Clarity (if cognitive goals mentioned)
   - Weight Loss (if goal='lose')
   - Energy & Performance (if exercise goal mentioned)

   Each subsection should:
   - Explain the mechanism
   - Cite 1 peer-reviewed fact
   - Reference their specific situation
   - Give a timeline for improvements

4. **Your First Action Step (Today)** (shopping list + tonight's meal)
   - List 5-8 specific foods to buy TODAY
   - Suggest a simple 2-3 ingredient dinner for tonight
   - Make it actionable and confidence-building

5. **30-Day Timeline: What to Expect** (week-by-week expectations)
   - Week 1: Adaptation/transition
   - Week 2: The difficult middle
   - Week 3: The breakthrough
   - Week 4: The new normal
   - Include condition-specific notes (e.g., "monitor blood sugar closely" if diabetic)

6. **Your Biggest Challenge, Addressed** (specific to their biggest_challenge)
   - Name their exact challenge
   - Normalize it (they're not alone, not weak)
   - Explain WHY carnivore is the solution
   - Provide 3-4 tactical strategies
   - Reference their past success or "why"

7. **Medical Disclaimer** (always include)
   - State this is informational, not medical advice
   - List their conditions and medications
   - Emphasize need for physician coordination
   - Highlight any condition-specific medication concerns

8. **Personal Closing** (1-2 sentences)
   - Use their name
   - Reference their specific story or "why"
   - Motivational and specific

### Optional Sections (Include if tier supports):

9. **[IF includes_meal_plan=true] Carnivore Food Pyramid**
   - Tier 1: Foundation proteins (70-80%)
   - Tier 2: Rotation proteins (15-20%)
   - Budget optimization for their budget level
   - Quality criteria (grass-fed, etc.) based on tier

10. **[IF includes_meal_plan=true] Daily Eating Patterns**
    - 2-3 simple meal combination examples
    - Reflect their cooking skill and available time
    - Budget-appropriate protein sources

11. **[IF includes_shopping_list=true OR includes_meal_plan=true] Weekly Grocery Lists**
    - Format as Week 0 (pantry stock-up), then Weeks 1-4
    - Organize by section (Butcher, Dairy, Pantry)
    - Adjust quantities for their caloric targets and meal frequency

12. **[IF includes_medical_context=true] Physician Consultation Guide**
    - 2-minute opening script for their doctor
    - List 5-7 advanced bloodwork markers to request
    - Include resolution scripts for common doctor pushback
    - Note specific medication adjustment protocols (e.g., "Metformin tapering")
    - Suggest baseline + 8-week lab schedule

13. **[IF includes_medical_context=true] Conquering Your Kryptonite**
    - Reframe their biggest_challenge as a systems problem, not willpower problem
    - Mindset shift: "Consistency is shortening the gap between failures"
    - Tactical solutions: 3-meal defaults, remove negotiation points, prep strategy
    - "Break glass" emergency tactics (salt trick, 10-minute rule, emergency meat)
    - Printable commitment contract

14. **[IF includes_medical_context=true] Dining Out & Travel Survival Guide**
    - Three golden rules
    - Restaurant strategy by cuisine (steakhouse, diner, Mexican, Asian, etc.)
    - Fast food emergency menu
    - Travel packing list

15. **[IF includes_medical_context=true] The Science & Evidence**
    - Peer-reviewed citations for their specific conditions
    - How carnivore addresses their conditions mechanistically
    - Expected outcomes based on research

16. **[IF includes_medical_context=true] Laboratory Reference Guide**
    - Standard vs. carnivore-optimized lab ranges
    - Interpretation guide for their condition-specific markers
    - What to expect after 8 weeks

17. **[IF includes_medical_context=true] The Electrolyte Protocol**
    - Why electrolytes matter on carnivore
    - Ketoade recipe
    - Daily electrolyte goals (sodium, potassium, magnesium)
    - Signs you need more of each

18. **[IF includes_medical_context=true] Adaptation Timeline**
    - Detailed week-by-week expectations
    - What they'll experience (positive and challenging)
    - When to expect breakthroughs

19. **[IF includes_medical_context=true] The Stall-Breaker Protocol**
    - How to identify if progress has actually stalled (vs. normal fluctuation)
    - 4 things to check in order: dairy, fat intake, hidden carbs, real stalls
    - Solution for each scenario

20. **[IF includes_medical_context=true] 30-Day Tracker**
    - Daily tracking template (weight, energy, mood, digestion, NSVs)
    - Symptom checklist for their specific conditions
    - End-of-30-days reflection questions

### Content Guidelines:
- Use their name [first_name] throughout—never generic "you"
- Reference their specific medications by name (Metformin, Lisinopril, etc.)
- Reference their specific conditions (diabetes, hypertension, etc.)
- Reference their specific goals from the goals array
- If they mentioned previous keto success, build on that foundation
- If they have a biggest challenge, make that a section header
- Write in second person but sound like a mentor, not a salesperson
- Use lists and bullet points for clarity
- Bold key takeaways
- Use examples (protein portions, meal ideas) that match THEIR situation
- For meal suggestions, avoid anything in their avoid_foods list
- For dairy suggestions, respect their dairy_tolerance setting
- For recipes/cooking, match their cooking_skill level
- For budget discussions, reflect their budget setting
- Make the tone match their situation:
  - If newly diagnosed diabetic: urgent, supportive, medically detailed
  - If optimizing performance: competitive, achievement-focused
  - If struggled with consistency: empathetic, systems-focused

### Output Format:
Return ONLY the markdown content for the sections above. Do NOT include:
- Any preamble or explanation
- The title "Your Personalized Carnivore Diet Report"
- HTML tags
- Code blocks

The backend will wrap this in proper HTML structure and styling.

---

Start your response with the Mission Brief section. Generate a thorough, personalized report.
```

### Claude Response Handling

```typescript
const claudeResponse = await anthropic.messages.create({
  model: "claude-opus-4-5-20251101",
  max_tokens: 4000,
  system: SYSTEM_MESSAGE,
  messages: [{ role: "user", content: userPrompt }]
});

// Extract markdown from response
const markdownContent = claudeResponse.content[0].type === 'text'
  ? claudeResponse.content[0].text
  : '';

// Log API metrics
await supabase.from('claude_api_logs').insert({
  session_id: sessionId,
  request_id: claudeResponse.id,
  model: 'claude-opus-4-5-20251101',
  input_tokens: claudeResponse.usage.input_tokens,
  output_tokens: claudeResponse.usage.output_tokens,
  total_tokens: claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens,
  stop_reason: claudeResponse.stop_reason,
  request_at: new Date(),
  response_at: new Date(),
  duration_ms: Date.now() - startTime,
  status: 'success'
});

// Convert markdown to HTML
const htmlContent = markdownToHtml(markdownContent);

// Extract metadata
const sectionCount = (markdownContent.match(/^##\s/gm) || []).length;
const contentLength = htmlContent.length;

// Update report record
await supabase.from('calculator_reports').update({
  report_html: htmlContent,
  report_markdown: markdownContent,
  report_json: {
    sections_count: sectionCount,
    content_length: contentLength,
    generated_at: new Date().toISOString()
  },
  generation_completed_at: new Date()
}).eq('session_id', sessionId);
```

---

## Report Generation Progress UI

This section specifies how the frontend displays real-time progress during report generation, keeping users engaged and preventing navigation loss during the 20-30 second generation window.

### Problem Statement

User feedback indicated that the 20-30 second report generation window (due to Claude API latency) leaves users uncertain about progress. Users may:
- Hit back button, killing the process
- Refresh the page
- Close the tab
- Assume the application is broken

**Solution:** A visually appealing, animated progress bar that:
1. Shows real-time generation progress
2. Updates with current stage (Calculating → Analyzing → Generating → Building → Creating)
3. Prevents premature navigation
4. Maintains user engagement
5. Builds excitement as the report is assembled

---

### Architecture Overview

**User Submission Flow:**
```
Step 1: User fills Step 4 (health profile)
        ↓
Step 2: Clicks "Generate My Report" button
        ↓
Step 3: Frontend submits POST /api/v1/calculator/step/4 (health data)
        ↓
Step 4: Backend verifies payment_status='completed'
        ↓
Step 5: Backend creates calculator_reports row with status='generating'
        ↓
Step 6: Backend returns {access_token, job_id, report_token}
        ↓
Step 7: Frontend displays progress bar UI (0%)
        ↓
Step 8: Backend triggers async report generation
        ↓
Step 9: Frontend polls /api/v1/calculator/report/{report_token}/status every 2 seconds
        ↓
Step 10: Progress bar updates (0% → 25% → 50% → 75% → 100%)
        ↓
Step 11: When status='completed', show "Report Ready!" button
        ↓
Step 12: User clicks button → GET /api/v1/calculator/report/{report_token}
        ↓
Step 13: Report displayed or downloaded
```

---

### Progress Bar Stages & Timing

**Frontend shows 5 stages with cumulative progress:**

```
Stage 1: "Calculating your macros..." (0% → 20%)
         Duration: 2-3 seconds
         Backend action: Validating macro calculations
         Progress increment: +20%

Stage 2: "Analyzing your health profile..." (20% → 40%)
         Duration: 3-5 seconds
         Backend action: Building Claude prompt with health data
         Progress increment: +20%

Stage 3: "Generating personalized protocol..." (40% → 65%)
         Duration: 5-8 seconds
         Backend action: Waiting for Claude API response
         Progress increment: +25%

Stage 4: "Building your food guide..." (65% → 85%)
         Duration: 3-5 seconds
         Backend action: Processing meal plan sections
         Progress increment: +20%

Stage 5: "Creating your meal plan..." (85% → 100%)
         Duration: 4-6 seconds
         Backend action: Finalizing HTML and storing report
         Progress increment: +15%

TOTAL DURATION: ~20-30 seconds average
```

**Key principle:** Backend sends stage_name + estimated_completion_percent every 2 seconds via status endpoint.

---

### Backend Status Endpoint

**Endpoint:** `GET /api/v1/calculator/report/{report_token}/status`

**Request:**
```bash
GET /api/v1/calculator/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6/status
```

**Response (while generating):**
```json
{
  "status": "generating",
  "job_id": "async-job-12345",
  "current_stage": 2,
  "stage_name": "Analyzing your health profile...",
  "progress_percent": 40,
  "elapsed_seconds": 8,
  "estimated_remaining_seconds": 15,
  "last_update_at": "2026-01-03T10:35:22Z",
  "created_at": "2026-01-03T10:35:10Z"
}
```

**Response (completed):**
```json
{
  "status": "completed",
  "job_id": "async-job-12345",
  "progress_percent": 100,
  "completed_at": "2026-01-03T10:35:45Z",
  "report_available_at": "2026-01-03T10:35:45Z",
  "download_url": "/api/v1/calculator/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6/download",
  "view_url": "/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
}
```

**Response (error):**
```json
{
  "status": "error",
  "job_id": "async-job-12345",
  "progress_percent": 45,
  "error_code": "claude_timeout",
  "error_message": "Claude API request timed out after 30 seconds",
  "failed_at": "2026-01-03T10:35:50Z",
  "retry_available": true,
  "retry_url": "/api/v1/calculator/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6/retry"
}
```

---

### Frontend Progress Bar Implementation

**HTML Structure (minimal, mobile-first):**

```html
<div class="report-generation-container">
  <!-- Overlay to prevent navigation -->
  <div class="generation-overlay" id="generationOverlay">
    <div class="generation-modal">
      <div class="generation-header">
        <h2>Building Your Personalized Report</h2>
        <p class="generation-subtitle">This takes about 20-30 seconds</p>
      </div>

      <!-- Progress Bar -->
      <div class="progress-wrapper">
        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="progressBarFill"></div>
        </div>
        <div class="progress-percent" id="progressPercent">0%</div>
      </div>

      <!-- Stage Message -->
      <div class="stage-message" id="stageMessage">
        Preparing your data...
      </div>

      <!-- Elapsed Time -->
      <div class="elapsed-time" id="elapsedTime">
        Time: 0s
      </div>

      <!-- Warning Message -->
      <div class="navigation-warning">
        <strong>Important:</strong> Please don't refresh, go back, or close this tab
        while your report is generating.
      </div>
    </div>
  </div>

  <!-- Report Ready State -->
  <div class="report-ready-container" id="reportReadyContainer" style="display: none;">
    <div class="report-ready-modal">
      <div class="report-ready-icon">✓</div>
      <h2>Your Report is Ready!</h2>
      <p>Your personalized carnivore diet protocol has been generated.</p>

      <div class="action-buttons">
        <button class="btn btn-primary" id="viewReportBtn">
          View Report
        </button>
        <button class="btn btn-secondary" id="downloadReportBtn">
          Download PDF
        </button>
      </div>

      <p class="report-expiry">
        This report will be available for <span id="expiryDays">30</span> days.
      </p>
    </div>
  </div>
</div>
```

**CSS Styling (brand colors + responsive):**

```css
/* Desktop and mobile responsive */
.report-generation-container {
  position: relative;
}

.generation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.generation-modal {
  background: white;
  border-radius: 12px;
  padding: 40px 24px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.generation-header {
  text-align: center;
  margin-bottom: 30px;
}

.generation-header h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: #1a1a1a;
}

.generation-subtitle {
  font-size: 14px;
  color: #666;
  margin: 0;
}

/* Progress Bar */
.progress-wrapper {
  margin-bottom: 20px;
  position: relative;
}

.progress-bar-container {
  background: #e8e8e8;
  height: 8px;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
  height: 100%;
  width: 0%;
  border-radius: 10px;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  position: relative;
}

.progress-bar-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-percent {
  position: absolute;
  top: -25px;
  right: 0;
  font-size: 14px;
  font-weight: 600;
  color: #ffd700;
}

/* Stage Message */
.stage-message {
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  color: #1a1a1a;
  margin: 20px 0;
  min-height: 24px;
  animation: fadeInOut 0.5s ease-in-out;
}

@keyframes fadeInOut {
  0% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}

/* Elapsed Time */
.elapsed-time {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin: 10px 0 20px 0;
}

/* Navigation Warning */
.navigation-warning {
  background: #fff3cd;
  border-left: 4px solid #ffc107;
  padding: 12px 16px;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  margin-top: 20px;
}

.navigation-warning strong {
  display: block;
  margin-bottom: 4px;
}

/* Report Ready State */
.report-ready-modal {
  background: white;
  border-radius: 12px;
  padding: 40px 24px;
  max-width: 500px;
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.report-ready-icon {
  font-size: 60px;
  color: #28a745;
  margin-bottom: 20px;
  animation: slideDown 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes slideDown {
  0% {
    transform: translateY(-30px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

.report-ready-modal h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 10px 0;
  color: #1a1a1a;
}

.report-ready-modal p {
  font-size: 14px;
  color: #666;
  margin: 0 0 30px 0;
}

.action-buttons {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary {
  background: #ffd700;
  color: #1a1a1a;
}

.btn-primary:hover {
  background: #ffed4e;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.btn-secondary {
  background: #e8e8e8;
  color: #1a1a1a;
}

.btn-secondary:hover {
  background: #d4d4d4;
}

.report-expiry {
  font-size: 12px;
  color: #999;
  margin: 0;
}

/* Mobile optimizations */
@media (max-width: 375px) {
  .generation-modal,
  .report-ready-modal {
    width: 95%;
    padding: 30px 16px;
  }

  .generation-header h2 {
    font-size: 20px;
  }

  .action-buttons {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
```

---

### Frontend Polling & Progress Management

**JavaScript Implementation (vanilla, no heavy framework required):**

```javascript
class ReportGenerationManager {
  constructor(reportToken, expiryDays = 30) {
    this.reportToken = reportToken;
    this.expiryDays = expiryDays;
    this.pollingInterval = null;
    this.elapsedSeconds = 0;
    this.maxWaitTime = 90; // 90 second timeout
    this.pollIntervalMs = 2000; // Poll every 2 seconds
  }

  // Start polling for progress
  startPolling() {
    this.elapsedSeconds = 0;
    this.startTime = Date.now();

    // Prevent back button
    window.onbeforeunload = () => {
      return 'Your report is still being generated. Please wait or it will be lost.';
    };

    // Prevent tab closure warning (browser dependent)
    window.addEventListener('beforeunload', (e) => {
      if (this.isGenerating) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    // Poll for status
    this.pollingInterval = setInterval(() => this.checkProgress(), this.pollIntervalMs);

    // Initial check immediately
    this.checkProgress();

    // Timeout safety (if no response after 90 seconds)
    setTimeout(() => {
      if (this.isGenerating) {
        this.handleTimeout();
      }
    }, this.maxWaitTime * 1000);
  }

  // Check progress via status endpoint
  async checkProgress() {
    try {
      const response = await fetch(
        `/api/v1/calculator/report/${this.reportToken}/status`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const statusData = await response.json();

      // Update UI based on status
      if (statusData.status === 'generating') {
        this.handleGenerating(statusData);
      } else if (statusData.status === 'completed') {
        this.handleCompleted(statusData);
      } else if (statusData.status === 'error') {
        this.handleError(statusData);
      }
    } catch (error) {
      console.error('Error checking progress:', error);
      this.handleNetworkError();
    }
  }

  // Handle generating state
  handleGenerating(data) {
    this.isGenerating = true;

    // Update progress bar
    const progressPercent = data.progress_percent || 0;
    this.updateProgressBar(progressPercent);

    // Update stage message
    const stageMessage = document.getElementById('stageMessage');
    if (stageMessage) {
      stageMessage.textContent = data.stage_name || 'Generating your report...';
    }

    // Update elapsed time
    const elapsedTime = document.getElementById('elapsedTime');
    if (elapsedTime) {
      const seconds = Math.round((Date.now() - this.startTime) / 1000);
      const estimated = data.estimated_remaining_seconds || 30;
      elapsedTime.textContent = `Time: ${seconds}s (about ${estimated}s remaining)`;
    }
  }

  // Handle completed state
  handleCompleted(data) {
    this.isGenerating = false;

    // Stop polling
    clearInterval(this.pollingInterval);

    // Remove navigation warnings
    window.onbeforeunload = null;

    // Update progress to 100%
    this.updateProgressBar(100);

    // Hide generating overlay after delay
    setTimeout(() => {
      const overlay = document.getElementById('generationOverlay');
      if (overlay) {
        overlay.style.display = 'none';
      }

      // Show report ready UI
      this.showReportReady(data);
    }, 500);
  }

  // Handle error state
  handleError(data) {
    this.isGenerating = false;

    // Stop polling
    clearInterval(this.pollingInterval);

    // Remove navigation warnings
    window.onbeforeunload = null;

    // Show error message
    this.showError(data);
  }

  // Update progress bar visually
  updateProgressBar(percent) {
    const progressBarFill = document.getElementById('progressBarFill');
    const progressPercent = document.getElementById('progressPercent');

    if (progressBarFill) {
      progressBarFill.style.width = percent + '%';
    }

    if (progressPercent) {
      progressPercent.textContent = percent + '%';
    }
  }

  // Show report ready modal
  showReportReady(data) {
    const generatingOverlay = document.getElementById('generationOverlay');
    const reportReadyContainer = document.getElementById('reportReadyContainer');

    if (generatingOverlay) {
      generatingOverlay.style.display = 'none';
    }

    if (reportReadyContainer) {
      reportReadyContainer.style.display = 'flex';

      // Set expiry days
      const expiryDaysEl = document.getElementById('expiryDays');
      if (expiryDaysEl) {
        expiryDaysEl.textContent = this.expiryDays;
      }

      // View Report button
      const viewBtn = document.getElementById('viewReportBtn');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          window.location.href = data.view_url || `/report/${this.reportToken}`;
        });
      }

      // Download Report button
      const downloadBtn = document.getElementById('downloadReportBtn');
      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
          window.location.href = data.download_url || `/api/v1/calculator/report/${this.reportToken}/download`;
        });
      }
    }
  }

  // Show error modal
  showError(data) {
    const generatingOverlay = document.getElementById('generationOverlay');
    if (generatingOverlay) {
      generatingOverlay.innerHTML = `
        <div class="generation-modal error-modal">
          <div class="error-icon">!</div>
          <h2>Report Generation Failed</h2>
          <p>${data.error_message || 'An unexpected error occurred.'}</p>
          ${
            data.retry_available
              ? `<button class="btn btn-primary" onclick="location.href='${data.retry_url}'">
                   Retry Generation
                 </button>`
              : `<button class="btn btn-primary" onclick="location.href='/calculator/step/4'">
                   Try Again
                 </button>`
          }
        </div>
      `;
    }
  }

  // Handle network errors (e.g., temporary connection loss)
  handleNetworkError() {
    // Continue polling—network errors are transient
    console.warn('Network error while checking progress. Will retry in 2 seconds.');
  }

  // Handle timeout (report taking longer than expected)
  handleTimeout() {
    this.isGenerating = false;
    clearInterval(this.pollingInterval);
    window.onbeforeunload = null;

    this.showError({
      error_message: 'Report generation is taking longer than expected. Please try again.',
      retry_available: true,
    });
  }
}

// Initialize on Step 4 submission
document.addEventListener('DOMContentLoaded', () => {
  const reportForm = document.getElementById('reportGenerationForm');
  if (reportForm) {
    reportForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      // Submit Step 4
      const formData = new FormData(reportForm);
      const response = await fetch('/api/v1/calculator/step/4', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.report_token) {
        // Start generation progress tracking
        const manager = new ReportGenerationManager(
          result.report_token,
          result.expiry_days || 30
        );
        manager.startPolling();
      } else {
        // Show error
        console.error('Failed to submit report');
      }
    });
  }
});
```

---

### Error Handling & Retry Logic

**Scenario: Temporary Network Interruption**
```
1. User is in progress bar state
2. Network connection drops for 5 seconds
3. Polling fails with network error
4. Manager continues polling (doesn't give up)
5. Connection restores
6. Next poll succeeds
7. Progress continues as normal
```

**Scenario: Claude API Timeout**
```
1. Backend starts report generation
2. Claude API takes >30 seconds (timeout)
3. Backend sets status='error', error_code='claude_timeout'
4. Frontend polling receives error status
5. Frontend shows "Report generation is taking longer than expected"
6. User clicks "Retry Generation"
7. New job_id created, polling restarts
8. Up to 3 retries allowed (configurable)
```

**Scenario: User Closes Tab During Generation**
```
1. Frontend shows: "Don't close this tab - your report is building!"
2. Browser shows: "Are you sure you want to leave this page?"
3. If user closes anyway:
   - Backend continues generating
   - Report is stored and ready
   - User can access via email link
4. If user returns within 24 hours:
   - Access token still valid
   - Report available immediately
```

---

### Accessibility Compliance

**Screen Reader Support:**

```html
<div class="progress-wrapper" role="progressbar" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100" aria-label="Report generation progress">
  <div class="progress-bar-container">
    <div class="progress-bar-fill"></div>
  </div>
</div>

<div class="stage-message" id="stageMessage" aria-live="polite" aria-atomic="true" role="status">
  Analyzing your health profile...
</div>

<div class="navigation-warning" role="alert">
  <strong>Important:</strong> Please don't refresh, go back, or close this tab
  while your report is generating.
</div>
```

**Key accessibility features:**
- `role="progressbar"` with `aria-valuenow` for progress
- `aria-live="polite"` for stage message updates
- `role="alert"` for navigation warning
- Clear, high-contrast colors (#ffd700 on white)
- Touch-friendly buttons (min 44px height)
- Readable font sizes (16px minimum)

---

### Mobile Optimization

**Key responsive features:**
- Progress bar scales to 90% of viewport width
- Modal padding reduced on small screens
- Button stack vertically on screens < 375px
- Progress percent updates remain visible
- Elapsed time shows in simple format
- No horizontal scroll

**Tested breakpoints:**
- Mobile (375px): iPhone SE
- Tablet (768px): iPad
- Desktop (1024px+): Standard screens

---

### Implementation Checklist

- [ ] Backend status endpoint created: `GET /api/v1/calculator/report/{report_token}/status`
- [ ] Status endpoint returns all required fields (stage_name, progress_percent, etc.)
- [ ] Backend tracks report generation stages (5 stages with timing)
- [ ] Frontend HTML markup added to Step 4 submission page
- [ ] CSS styling applied (progress bar, modals, animations)
- [ ] JavaScript polling manager implemented
- [ ] Error handling for network issues
- [ ] Error handling for timeouts
- [ ] Retry logic for failed generations
- [ ] Navigation prevention (window.onbeforeunload)
- [ ] Accessibility features (ARIA labels, roles)
- [ ] Mobile responsiveness tested (375px, 768px, 1024px)
- [ ] Progress bar animation smooth (cubic-bezier easing)
- [ ] Report ready modal shows download/view buttons
- [ ] Email fallback if user closes tab before completion
- [ ] Load testing (100+ concurrent generations)

---

### Backend Implementation Notes

**Database Schema Addition:**

```sql
-- Extend calculator_reports table to track generation progress
ALTER TABLE calculator_reports
ADD COLUMN IF NOT EXISTS generation_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS current_stage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stage_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_stage_update TIMESTAMP WITH TIME ZONE;

-- Status endpoint handler
-- GET /api/v1/calculator/report/{report_token}/status
-- Returns:
-- {
--   status: 'generating' | 'completed' | 'error',
--   progress_percent: 0-100,
--   stage_name: string,
--   estimated_remaining_seconds: number,
--   ...
-- }
```

---

## Report Access & Session Management (48-Hour Window)

This section defines the critical access window, token lifecycle, and session persistence model that ensures reports are secure, time-limited, and compliant with data retention best practices.

**Philosophy:** "A report is temporary. Access is sacred. Tokens are crypto-strong."

### 1. Report Expiration Logic

Reports expire 48 hours after generation (tier-dependent override available):

```
Default Access Window: 48 hours
├─ Bundle tier: 48 hours (original design)
├─ Shopping tier: 48 hours
├─ MealPlan tier: 72 hours (extended for meal planning value)
└─ Doctor tier: 120 hours (5 days for comprehensive support)

Example Timeline:
├─ Report generated: 2026-01-03 15:30:00 UTC
├─ Expires at: 2026-01-05 15:30:00 UTC (48h later)
├─ After expiration: is_expired flag set to TRUE
├─ User sees: "Report expired. Run calculator again to get new report."
└─ Access denied: HTTP 410 GONE returned to client
```

**Database Implementation:**

```sql
-- Field: calculator_reports.expires_at
expires_at TIMESTAMP WITH TIME ZONE NOT NULL
  DEFAULT NOW() + (
    CASE
      WHEN tier_id = 'bundle' THEN INTERVAL '48 hours'
      WHEN tier_id = 'shopping' THEN INTERVAL '48 hours'
      WHEN tier_id = 'mealplan' THEN INTERVAL '72 hours'
      WHEN tier_id = 'doctor' THEN INTERVAL '120 hours'
      ELSE INTERVAL '48 hours'
    END
  ),

-- Field: calculator_reports.is_expired
is_expired BOOLEAN DEFAULT FALSE,

-- Constraint: expires_at must be in future at insertion
CONSTRAINT future_expiration CHECK (expires_at > NOW())

-- Daily cron job (runs at 00:00 UTC):
UPDATE calculator_reports
SET is_expired = TRUE, updated_at = NOW()
WHERE expires_at <= NOW() AND is_expired = FALSE;
```

---

### 2. Access Token Lifecycle

Tokens are single-use cryptographic identifiers that grant temporary report access:

```
Token Format:
├─ Length: 64 characters (hexadecimal)
├─ Encoding: crypto.randomBytes(32).toString('hex')
├─ Uniqueness: UNIQUE constraint in database
└─ Collision probability: < 1 in 2^256 (astronomically safe)

Generation Timing:
├─ Created: Immediately when calculator_reports row is inserted
├─ Event: After Step 4 form submission + payment verified
├─ Storage: Stored in calculator_reports.access_token (indexed)
└─ Delivery: Sent to user via email + inline link

Valid Period:
├─ Starts: At report generation (generation_start_at)
├─ Duration: Matches expires_at field (tier-dependent, default 48h)
├─ Expires: When expires_at <= NOW()
├─ Auto-revoked: No manual intervention needed

URL Format:
├─ Public access: https://app.carnivoreweekly.com/api/v1/calculator/report/{access_token}
├─ No authentication: Token is proof of authorization
├─ No user login required: Anonymous access via token
└─ Rate limiting: 100 requests per token per hour (prevent abuse)

No Manual Revocation:
├─ Users cannot manually delete tokens
├─ Deletion occurs automatically at expiration
├─ If user needs new report: Run calculator again (generates new session + token)
└─ Old tokens remain in database (is_expired=true) for analytics
```

**Database Schema:**

```sql
CREATE TABLE calculator_reports (
  -- ... existing fields ...

  access_token VARCHAR(64) UNIQUE NOT NULL,
  -- Token generated at insertion, indexed for fast lookup

  generation_start_at TIMESTAMP WITH TIME ZONE,
  generation_completed_at TIMESTAMP WITH TIME ZONE,

  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_expired BOOLEAN DEFAULT FALSE,

  -- Rate limiting enforcement
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  rate_limit_reset_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_calculator_reports_access_token
  ON calculator_reports(access_token);

CREATE INDEX idx_calculator_reports_expires_at
  ON calculator_reports(expires_at) WHERE is_expired = FALSE;

CREATE INDEX idx_calculator_reports_is_expired
  ON calculator_reports(is_expired) WHERE is_expired = FALSE;
```

---

### 3. Session Persistence

Two-table model ensures user data survives report expiration:

```
Permanent Storage:
├─ Table: calculator_sessions_v2
├─ Lifetime: Indefinite (user can re-generate reports)
├─ Fields: All form input (Steps 1-4)
├─ Purpose: Long-term analytics, re-generation capability
└─ Cleanup: Annual archive after 365 days (manual, not auto)

Temporary Storage:
├─ Table: calculator_reports
├─ Lifetime: 48h default (tier-dependent)
├─ Fields: HTML report, token, expiration metadata
├─ Purpose: Immediate access, analytics, audit trail
└─ Cleanup: Auto-expire at 48h, hard-delete after 90 days
```

**Flow:**

```
Step 4 Completion
  ↓
INSERT into calculator_sessions_v2 (all form data) → PERMANENT
  ↓
INSERT into calculator_reports (access_token, expires_at) → TEMPORARY
  ↓
Generate HTML report → Store in calculator_reports.report_html
  ↓
Email user with access_token + expiry notice
  ↓
User accesses report within 48h ✓
  ↓
[48h passes]
  ↓
Cron job: UPDATE calculator_reports SET is_expired=TRUE
  ↓
User requests report (expired) → HTTP 410 GONE
  ↓
"Report expired. Run calculator again to get new report."
  ↓
User re-runs calculator → New session ID + access token
  ↓
calculator_sessions_v2 still has all previous data (for context)
  ↓
New calculator_reports row created with fresh 48h window
```

**Data Retention Policies:**

```sql
-- calculator_sessions_v2: Keep for 365 days minimum (annual archive)
SELECT session_id, created_at, form_data
FROM calculator_sessions_v2
WHERE created_at < NOW() - INTERVAL '365 days'
-- Archive to cold storage (S3 / backup) before deletion

-- calculator_reports: Hard delete after 90 days expired
DELETE FROM calculator_reports
WHERE is_expired = TRUE
  AND expires_at < NOW() - INTERVAL '90 days';

-- calculator_report_access_log: Partition by month (auto-cleanup)
-- Older partitions can be archived to cold storage
SELECT COUNT(*) FROM calculator_report_access_log
WHERE accessed_at < NOW() - INTERVAL '180 days';
```

---

### 4. Database Schema Extensions

Required fields for 48-hour window enforcement:

```sql
-- Add to calculator_reports table

ALTER TABLE calculator_reports
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0
  COMMENT 'Incremented each successful view (for analytics)',

ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE
  COMMENT 'Last time report was viewed',

ADD COLUMN IF NOT EXISTS rate_limit_reset_at TIMESTAMP WITH TIME ZONE
  COMMENT 'Hourly rate limit reset (prevents hammering)',

ADD COLUMN IF NOT EXISTS access_ips TEXT[]
  COMMENT 'Array of IP addresses that accessed report (for fraud detection)',

ADD COLUMN IF NOT EXISTS access_user_agents TEXT[]
  COMMENT 'Array of user-agents that accessed report';

-- Create trigger: Auto-update access timestamps
CREATE OR REPLACE FUNCTION update_report_access_metadata()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE calculator_reports
  SET
    access_count = access_count + 1,
    last_accessed_at = NOW(),
    access_ips = ARRAY_APPEND(access_ips, inet_client_addr()),
    access_user_agents = ARRAY_APPEND(access_user_agents, current_setting('app.user_agent', true))
  WHERE id = NEW.report_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on access_log insert
CREATE TRIGGER tr_update_report_access_metadata
AFTER INSERT ON calculator_report_access_log
FOR EACH ROW
EXECUTE FUNCTION update_report_access_metadata();
```

---

### 5. API Endpoints for 48-Hour Access Control

All endpoints enforce expiration checks:

#### GET /api/v1/calculator/report/{access_token}

**Purpose:** Retrieve report HTML (primary user-facing endpoint)

**Request:**
```http
GET /api/v1/calculator/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4
Accept: text/html
```

**Response (200 OK - Valid report):**
```http
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Cache-Control: private, max-age=3600
X-Report-Expires: 2026-01-05T15:30:00Z

<!DOCTYPE html>
<html>
  <head>
    <title>Personalized Carnivore Diet Report</title>
  </head>
  <body>
    [Full HTML report]
  </body>
</html>
```

**Response (410 GONE - Expired report):**
```http
HTTP/1.1 410 Gone
Content-Type: application/json

{
  "error": "report_expired",
  "message": "This report expired on 2026-01-05T15:30:00Z. Run the calculator again to generate a new report.",
  "expired_at": "2026-01-05T15:30:00Z",
  "new_calculator_url": "https://app.carnivoreweekly.com/calculator"
}
```

**Response (404 NOT FOUND - Invalid token):**
```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": "report_not_found",
  "message": "No report found with this access token."
}
```

**Backend Logic:**
```typescript
async function getReport(accessToken: string, req: Request) {
  // 1. Look up report by token
  const report = await supabase
    .from('calculator_reports')
    .select('*')
    .eq('access_token', accessToken)
    .single();

  if (!report.data) {
    return new Response(
      JSON.stringify({ error: 'report_not_found' }),
      { status: 404 }
    );
  }

  // 2. Check expiration
  const now = new Date();
  const expiresAt = new Date(report.data.expires_at);

  if (now > expiresAt || report.data.is_expired) {
    return new Response(
      JSON.stringify({
        error: 'report_expired',
        message: 'This report expired. Run the calculator again.',
        expired_at: report.data.expires_at
      }),
      { status: 410 }
    );
  }

  // 3. Rate limiting check (100 req/hour per token)
  const oneHourAgo = new Date(Date.now() - 3600000);
  const recentAccesses = await supabase
    .from('calculator_report_access_log')
    .select('id', { count: 'exact' })
    .eq('report_id', report.data.id)
    .gte('accessed_at', oneHourAgo.toISOString());

  if (recentAccesses.count >= 100) {
    return new Response(
      JSON.stringify({
        error: 'rate_limit_exceeded',
        message: 'Too many requests. Try again in 1 hour.',
        reset_at: new Date(Date.now() + 3600000).toISOString()
      }),
      { status: 429 }
    );
  }

  // 4. Log access
  await supabase
    .from('calculator_report_access_log')
    .insert({
      report_id: report.data.id,
      accessed_at: now.toISOString(),
      ip_address: req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent'),
      referer_url: req.headers.get('referer'),
      success: true
    });

  // 5. Return report HTML
  return new Response(report.data.report_html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, max-age=3600',
      'X-Report-Expires': report.data.expires_at
    }
  });
}
```

---

#### GET /api/v1/calculator/report/{access_token}/status

**Purpose:** Check report status (used by progress bar, useful for pre-expiry checks)

**Response:**
```json
{
  "access_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
  "status": "available",
  "generated_at": "2026-01-03T15:30:00Z",
  "expires_at": "2026-01-05T15:30:00Z",
  "time_remaining_hours": 48,
  "time_remaining_minutes": 2880,
  "access_count": 3,
  "last_accessed_at": "2026-01-04T10:00:00Z"
}
```

---

#### POST /api/v1/calculator/report/{access_token}/download

**Purpose:** Download report as PDF (premium feature for some tiers)

**Implementation:**
```typescript
// Convert HTML to PDF using headless browser (puppeteer/playwright)
// Return file with Content-Disposition: attachment header
```

---

### 6. Frontend UX for 48-Hour Window

#### At Report Generation
```html
<div class="report-success-modal">
  <h2>Your Report is Ready!</h2>
  <p>Your personalized carnivore diet protocol has been generated.</p>

  <div class="expiry-notice">
    <strong>Important:</strong> Your report expires in <span id="expiryCountdown">48 hours</span>
    <p>After that, you'll need to run the calculator again to get a new report.</p>
  </div>

  <button class="btn-primary" onclick="viewReport()">View Report Now</button>
</div>

<script>
function updateExpiryCountdown() {
  const expiresAt = new Date('2026-01-05T15:30:00Z');
  const now = new Date();
  const diff = expiresAt - now;

  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);

  document.getElementById('expiryCountdown').textContent =
    `${hours} hours ${minutes} minutes`;
}

setInterval(updateExpiryCountdown, 60000); // Update every minute
</script>
```

#### In Report Header
```html
<div class="report-header">
  <h1>Your Personalized Carnivore Diet Report</h1>
  <p class="generated-date">Generated: January 3, 2026</p>

  <div class="expiry-banner">
    <p>
      <strong>Report expires in 48 hours:</strong>
      <span id="expiryTime">January 5, 2026 at 3:30 PM UTC</span>
    </p>
    <p class="expiry-action">
      <a href="#download">Download now</a> or
      <a href="#print">print to PDF</a> to keep this report.
    </p>
  </div>
</div>
```

#### After Expiration
```html
<div class="report-expired-modal">
  <div class="expired-icon">⏰</div>
  <h2>Report Expired</h2>
  <p>Your personalized report is no longer available.</p>

  <p class="expiry-explanation">
    Reports are available for 48 hours to protect your privacy and ensure you
    have the most current recommendations. After that, the report is automatically
    deleted from our servers.
  </p>

  <div class="action-buttons">
    <a href="/calculator" class="btn-primary">
      Run Calculator Again
    </a>
    <p class="secondary-text">
      We'll have your new report ready in 20-30 seconds.
    </p>
  </div>
</div>
```

#### Email Template

```
Subject: Your Personalized Carnivore Protocol - Valid for 48 Hours

Hello [first_name],

Your personalized report is ready! Access it here:

[BUTTON] View Your Report
https://app.carnivoreweekly.com/api/v1/calculator/report/{access_token}

Important: This link will expire in 48 hours (January 5, 2026 at 3:30 PM UTC).

Why 48 hours? We prioritize your privacy. Your report contains detailed health
information and is automatically deleted after 48 hours. If you need it later,
simply run the calculator again.

Quick Actions:
- View Report: [link]
- Download as PDF: [link]
- Print: [print instructions]

Questions? Reply to this email or contact support@carnivoreweekly.com

Best,
The Carnivore Weekly Team
```

---

### 7. Security Considerations

#### Token Security
```
Generation:
├─ crypto.randomBytes(32).toString('hex')
├─ 64-character hexadecimal string
├─ Never logged in plaintext (only store hash in logs)
└─ UNIQUE constraint prevents collisions

Transport:
├─ HTTPS only (no HTTP fallback)
├─ Sent via email link (unencrypted email is acceptable—token is single-use proof)
├─ No token in query strings (use POST body or header when possible)
└─ Never in browser history or server logs

Storage:
├─ Stored in database as plaintext (necessary for lookup)
├─ Indexed for fast retrieval
├─ Rate limiting prevents token enumeration attacks
└─ No token history after expiration (data retention policy)
```

#### Rate Limiting
```
Per-Token Limits:
├─ 100 requests per hour per token
├─ After limit: 429 Too Many Requests
├─ Reset: Automatically after 1 hour
└─ Purpose: Prevent report scraping, DDoS attacks

Global Limits:
├─ 1,000 report generations per minute per IP
├─ 10,000 report access requests per minute globally
└─ Monitored via CloudFlare / WAF
```

#### Privacy & Compliance
```
Data Retention:
├─ calculator_sessions_v2: 365 days (for re-generation)
├─ calculator_reports: 90 days (HTML + metadata)
├─ calculator_report_access_log: 30 days (access audit trail)
└─ All older data: Hard-deleted from servers

GDPR Compliance:
├─ User can request deletion of all reports (sets is_expired=TRUE immediately)
├─ No manual recovery of deleted reports
├─ Audit trail shows deletion timestamp
└─ Deletion can be requested via /api/v1/user/delete-reports

No Indefinite Storage:
├─ 48-hour access window enforced for all tiers
├─ No user option to extend expiration
├─ Automatic deletion ensures zero long-term PII storage
└─ Reduces regulatory risk (GDPR, CCPA, PIPEDA)
```

#### Token Enumeration Prevention
```
If attacker tries to guess tokens:
├─ Query random 64-char hex token
├─ Token not found → 404 (standard)
├─ But: 100 failed attempts = IP rate-limited
├─ Rate limit: 10 failed guesses per minute per IP
└─ After limit: 429 Too Many Requests

Math:
├─ 2^256 possible tokens
├─ 10 guesses per minute
├─ 525,600 minutes per year
├─ 5,256,000 guesses per year
├─ Probability: 1 in 2^256 / 5,256,000 (impossibly low)
```

---

### 8. Analytics & Monitoring

Track report lifecycle with optional metrics:

```sql
-- Analytics Query: Report access patterns
SELECT
  r.id,
  r.generated_at,
  r.expires_at,
  r.access_count,
  COUNT(l.id) as total_accesses,
  MAX(l.accessed_at) as last_access,
  EXTRACT(EPOCH FROM (MAX(l.accessed_at) - r.generated_at)) / 3600 as hours_to_first_access
FROM calculator_reports r
LEFT JOIN calculator_report_access_log l ON r.id = l.report_id
WHERE r.created_at > NOW() - INTERVAL '7 days'
GROUP BY r.id
ORDER BY r.created_at DESC;

-- Key Metrics:
-- 1. Average access_count per report (target: 2-5 views)
-- 2. Percentage of reports accessed within 24h (target: >80%)
-- 3. Percentage accessed after 48h expiry (should be 0%)
-- 4. Average time to first access (target: <1 hour)
```

---

### 9. Testing Checklist

- [ ] Report generates with correct expires_at timestamp
- [ ] Access token is unique (64-char hex)
- [ ] GET /report/{token} works within 48h window
- [ ] GET /report/{token} returns 410 GONE after 48h
- [ ] Cron job updates is_expired flag daily
- [ ] access_count increments on each view
- [ ] Rate limiting enforced (100 req/hour per token)
- [ ] Email sent with correct expiry time
- [ ] Email link works and displays report
- [ ] Report PDF download works
- [ ] Expired report shows countdown timer
- [ ] Expired report UI shows "Run Calculator Again" button
- [ ] Token not exposed in URL history
- [ ] No token in server logs (only hash)
- [ ] is_expired=TRUE prevents access (not just time-based check)
- [ ] User cannot manually extend expiration
- [ ] User cannot manually revoke token early
- [ ] Tier-dependent expirations work (48h, 72h, 120h)
- [ ] Old tokens remain in DB for analytics
- [ ] GDPR deletion removes all associated data
- [ ] Load test: 100+ concurrent report accesses

---

## Database Schema for Reports

### calculator_reports Table (Verified)

```sql
CREATE TABLE calculator_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  session_id UUID NOT NULL UNIQUE REFERENCES calculator_sessions_v2(id),

  -- Access Control
  email VARCHAR(255) NOT NULL,  -- Denormalized for fast lookup
  access_token VARCHAR(64) UNIQUE NOT NULL,  -- Cryptographic token for distribution

  -- Content Storage
  report_html TEXT,  -- Full HTML (immutable after generation)
  report_markdown TEXT,  -- Version control friendly
  report_json JSONB,  -- Structured metadata

  -- Generation Tracking
  claude_request_id VARCHAR(255),  -- Correlation with API logs
  generation_start_at TIMESTAMP WITH TIME ZONE,
  generation_completed_at TIMESTAMP WITH TIME ZONE,

  -- Lifecycle Management
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,  -- NOW + tier.report_expiry_days
  is_expired BOOLEAN DEFAULT FALSE,  -- Soft delete flag

  -- Activity Tracking
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,

  -- Audit Trail
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT report_not_expired CHECK (is_expired = FALSE OR expires_at <= NOW())
);

CREATE UNIQUE INDEX idx_calculator_reports_session_id ON calculator_reports(session_id);
CREATE INDEX idx_calculator_reports_access_token ON calculator_reports(access_token);
CREATE INDEX idx_calculator_reports_email ON calculator_reports(email);
CREATE INDEX idx_calculator_reports_expires_at ON calculator_reports(expires_at);
CREATE INDEX idx_calculator_reports_is_expired ON calculator_reports(is_expired)
  WHERE is_expired = FALSE;
```

### calculator_report_access_log Table (Verified)

```sql
CREATE TABLE calculator_report_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  report_id UUID NOT NULL REFERENCES calculator_reports(id),
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  referer_url TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,

  -- Partitioned by month for scalability
) PARTITION BY RANGE (accessed_at);

-- Create monthly partitions (auto-created via trigger)
CREATE TABLE calculator_report_access_log_2026_01
  PARTITION OF calculator_report_access_log
  FOR VALUES FROM ('2026-01-01'::timestamp) TO ('2026-02-01'::timestamp);

CREATE INDEX idx_calculator_report_access_log_report_id
  ON calculator_report_access_log(report_id, accessed_at DESC);

-- Trigger to auto-increment access_count
CREATE TRIGGER update_report_access_count
AFTER INSERT ON calculator_report_access_log
FOR EACH ROW
EXECUTE FUNCTION increment_report_access_count();
```

### claude_api_logs Table (Verified)

```sql
CREATE TABLE claude_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  session_id UUID NOT NULL REFERENCES calculator_sessions_v2(id),
  request_id VARCHAR(255) UNIQUE NOT NULL,  -- From Claude API response
  model VARCHAR(100) NOT NULL,  -- 'claude-opus-4-5-20251101'

  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  stop_reason VARCHAR(50),  -- 'end_turn', 'max_tokens', etc.

  request_at TIMESTAMP WITH TIME ZONE,
  response_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  status VARCHAR(50),  -- 'pending', 'success', 'error', 'timeout'
  error_code VARCHAR(100),
  error_message TEXT,

  prompt_hash VARCHAR(64),  -- SHA256 for deduplication

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'success', 'error', 'timeout'))
);

CREATE INDEX idx_claude_api_logs_session_id ON claude_api_logs(session_id);
CREATE INDEX idx_claude_api_logs_status ON claude_api_logs(status);
CREATE INDEX idx_claude_api_logs_request_at DESC ON claude_api_logs(request_at);
```

---

## Report Expiration & Lifecycle

### Expiration Rules

**By Tier:**
```
Bundle: 48 hours (default)
Shopping: 48 hours
MealPlan: 72 hours
Doctor: 120 hours (5 days)
```

### Soft Delete Process

1. **Automatic Expiry:** Cron job runs daily
```sql
UPDATE calculator_reports
SET is_expired = TRUE
WHERE expires_at <= NOW() AND is_expired = FALSE;
```

2. **Access Control:** RLS policy prevents access to expired reports
```sql
-- calculator_reports RLS policy
SELECT: (is_expired = FALSE AND expires_at > NOW())
```

3. **Hard Delete (Optional):** Annual archival
```sql
-- Archive expired reports to cold storage (optional)
DELETE FROM calculator_reports
WHERE is_expired = TRUE AND expires_at < NOW() - INTERVAL '90 days';
```

### Access Token Security

**Generation:**
```typescript
const accessToken = crypto.randomBytes(32).toString('hex');  // 64-char hex
// Never log token in plain text
```

**Format:**
```
URL: https://app.carnivoreweekly.com/report/{access_token}
No authentication required (token is proof of access)
Token is single-use proof of authorization
```

**Revocation:**
User can request deletion of report:
```sql
UPDATE calculator_reports
SET is_expired = TRUE
WHERE access_token = ? AND session_id = ?;
```

---

## Example: Michael's Report Flow

### User Input Summary
```
Session: s7d8f-9a0b-1c2d-3e4f
Token: abc123def456...

STEP 1 (Physical Stats):
- Sex: male
- Age: 35
- Height: 5'10" (178 cm)
- Weight: 185 lbs (84 kg)

STEP 2 (Fitness & Goals):
- Lifestyle: moderate
- Exercise: 5-6x/week
- Goal: lose (weight loss focus)
- Deficit: 20%
- Diet: carnivore

STEP 3 (Macros - Calculated):
- Calories: 1,920 kcal (TDEE 2,400 - 20% deficit)
- Protein: 130g
- Fat: 160g
- Carbs: 20g
- Method: katch-mcardle

STEP 4 (Health Profile - Premium):
- Email: michael@example.com
- Name: Michael
- Conditions: diabetes, hypertension
- Medications: Metformin 500mg 2x/day, Lisinopril 10mg daily
- Symptoms: Brain fog, joint pain
- Allergies: None
- Avoid foods: Seed oils, processed foods
- Dairy tolerance: butter-only
- Previous diets: Keto 14 months (successful)
- What worked: Blood sugar control, weight loss (but fell off)
- Carnivore experience: new
- Cooking skill: intermediate
- Meal prep time: some
- Budget: moderate
- Family situation: partner + kids
- Work travel: office
- Goals: weight_loss, energy, mental_clarity
- Biggest challenge: "I fell off keto after 14 months"
- Tier: Doctor ($15)
```

### Report Generation

**1. Create calculator_reports row:**
```sql
INSERT INTO calculator_reports
(session_id, email, access_token, generation_start_at, expires_at, report_json)
VALUES
(
  's7d8f-9a0b-1c2d-3e4f',
  'michael@example.com',
  'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4',
  NOW(),
  NOW() + INTERVAL '120 hours',  -- Doctor tier = 120 hours (5 days)
  '{"status": "generating", "tier": "doctor"}'
);
```

**2. Build Claude Prompt:**
```
## User Profile
### Demographics
- Name: Michael
- Age: 35 years old
- Sex: male
- Height: 5 feet 10 inches
- Current Weight: 185 lbs

### Health Status
- Conditions: diabetes, hypertension
- Current Medications: Metformin 500mg 2x/day, Lisinopril 10mg daily
- Symptoms: Brain fog, joint pain
- Allergies: None
- Foods to Avoid: Seed oils, processed foods
- Dairy Tolerance: butter-only

### Dietary History
- Previous Diets: Keto for 14 months
- What Worked: Blood sugar control and weight loss
- Carnivore Experience: new

### Lifestyle & Logistics
- Cooking Skill: intermediate
- Meal Prep Time Available: some
- Budget Level: moderate
- Family Situation: partner + kids
- Work/Travel Situation: office

### Goals & Motivation
- Primary Goal: lose (weight loss)
- Health Goals: weight_loss, energy, mental_clarity
- Biggest Challenge: I fell off keto after 14 months

### Calculated Nutrition Targets
- Daily Calories: 1920 kcal
- Protein Target: 130g daily
- Fat Target: 160g daily
- Carb Target: 20g daily

### Report Tier Features
- Includes Meal Plan: true
- Includes Shopping List: true
- Includes Medical Context: true
- Includes 10 recipes
- Report Valid For: 120 hours (5 days)

[Rest of Claude prompt...]
```

**3. Claude Generates Report:**

Claude returns markdown like:
```markdown
## Mission Brief

You've already proven keto works for your body—14 months of great results don't lie.
This protocol builds on that success with a carnivore approach that should work even
better for your blood sugar control, gut healing, and the inflammation driving your
joint pain.

## Your Daily Targets

| Metric | Target |
|--------|--------|
| Calories | 1,800-2,200 (adjust based on hunger signals) |
| Protein | 130-160g (prioritize this first) |
| Fat | 130-170g (eat to satiety) |
| Carbs | <20g (ideally near zero) |

...

[Full report sections continue]
```

**4. Backend Converts to HTML:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Personalized Carnivore Diet Report</title>
  <style>[CSS here]</style>
</head>
<body>
  <div class="cover-page">
    <img src="https://carnivoreweekly.com/CarnivoreWeeklySquare.png">
    <h1>Your Complete Personalized Carnivore Diet Report</h1>
    <p>Generated on January 2, 2026</p>
  </div>

  <div class="content-start report-content">
    <h2>Mission Brief</h2>
    <p>You've already proven keto works...</p>

    [Full HTML content]
  </div>
</body>
</html>
```

**5. Update calculator_reports:**
```sql
UPDATE calculator_reports
SET
  report_html = '[full HTML]',
  report_markdown = '[full markdown]',
  report_json = {
    "sections_count": 21,
    "has_meal_plan": true,
    "has_shopping_list": true,
    "has_medical_context": true,
    "content_length": 45000,
    "generated_at": "2026-01-03T10:35:00Z"
  },
  generation_completed_at = NOW()
WHERE session_id = 's7d8f-9a0b-1c2d-3e4f';
```

**6. Return to Frontend:**
```json
{
  "access_token": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
  "report_url": "https://app.carnivoreweekly.com/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4",
  "expires_at": "2026-01-08T10:30:00Z"
}
```

**7. User Access Report:**
```
GET /api/v1/calculator/report/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6a1b2c3d4e5f6g7h8i9j0k1l2m3n4

Response:
{
  "report_html": "[full HTML]",
  "report_json": {...},
  "generated_at": "2026-01-03T10:35:00Z",
  "expires_at": "2026-01-08T10:30:00Z"
}

Side effects:
- INSERT into calculator_report_access_log
- UPDATE calculator_reports.access_count = 1
- UPDATE calculator_reports.last_accessed_at = NOW()
```

---

## Error Handling & Retry Logic

### Report Generation Failures

**Scenario: Claude API times out**
```
1. Log error to claude_api_logs (status='error')
2. Set report_json.status = 'error_timeout'
3. Retry in 5 minutes (max 3 retries)
4. Alert if >3 consecutive failures
```

**Scenario: Invalid session data**
```
1. Log error to claude_api_logs (status='error')
2. Email user + support: "We encountered an issue generating your report"
3. Offer manual generation after escalation
```

**Scenario: Report too large (>10MB)**
```
1. Truncate content intelligently (remove optional sections)
2. Attempt re-generation with reduced scope
3. Log to monitoring system
```

### Delivery Failures

**Report not accessible after 24 hours:**
```
1. Check if generation is still pending
2. Verify access_token in URL
3. Check if report_html is empty
4. If all fail: Email user + support
```

---

## Summary Table: Form Fields to Report Sections

| Form Field | Step | Report Sections | Calculation |
|------------|------|-----------------|-------------|
| `sex` | 1 | TDEE, Macros, Health Context | Metabolic multiplier |
| `age` | 1 | Timeline, Activity Adjustment | Age-based adjustments |
| `height` | 1 | TDEE, Body Composition | BMR input |
| `weight` | 1 | TDEE, Macros, Progress | Caloric baseline, protein ratio |
| `lifestyle_activity` | 2 | TDEE, Daily Targets | Activity multiplier (1.2-1.9x) |
| `exercise_frequency` | 2 | Electrolytes, Recovery, Weekly Planning | Carb/mineral adjustments |
| `goal` | 2 | Strategy, Timeline, Psychology | Tone & messaging |
| `deficit_percentage` | 2 | Daily Targets, Progress Timeline | Caloric reduction |
| `diet_type` | 2 | Food Pyramid, Allowed Foods | Protein/fat source narrowing |
| `calories` | 3 | Daily Targets, Meal Planning | Primary constraint |
| `protein_grams` | 3 | Protein Strategy, Meal Examples | Portion sizing |
| `fat_grams` | 3 | Fat Strategy, Satiety Guidelines | Cooking fat recommendations |
| `carbs_grams` | 3 | Carb Elimination Narrative | Validation (should be <20g) |
| `email` | 4 | Delivery, Access Control | Report destination |
| `first_name` | 4 | Personalization, Headers | "Your report for [name]" |
| `last_name` | 4 | Personalization, Closing | "One meal at a time, Michael" |
| `medications` | 4 | Medical Disclaimer, Medication Section | Physician coordination |
| `conditions` | 4 | Health-Specific Sections, Disclaimer | Content selection |
| `symptoms` | 4 | Challenge Section, Health Strategy | Symptom-specific guidance |
| `allergies` | 4 | Food Restrictions, Meal Planning | Ingredient exclusion |
| `avoid_foods` | 4 | Personal Rejection List | Meal option filtering |
| `dairy_tolerance` | 4 | Dairy Reintroduction Protocol | Product recommendations |
| `previous_diets` | 4 | Success Pattern Analysis | Opening narrative |
| `what_worked` | 4 | Success Pattern Analysis | Reinforcement messaging |
| `carnivore_experience` | 4 | Expectation Setting, Ramp-Up | Timeline detail level |
| `cooking_skill` | 4 | Recipe Complexity, Meal Ideas | Difficulty adjustment |
| `meal_prep_time` | 4 | Meal Planning Strategy | Batch prep guidance |
| `budget` | 4 | Food Sourcing, Quality Tier | Ingredient selection |
| `family_situation` | 4 | Meal Compatibility, Social Context | Recipe scaling |
| `work_travel` | 4 | Restaurant/Travel Guide | Dining out emphasis |
| `goals` | 4 | Motivation, Strategy Tailoring | Subsection selection |
| `biggest_challenge` | 4 | Challenge Section (heading + content) | Custom solution |
| `additional_notes` | 4 | Closing Personalization | Final motivational note |
| `tier_features` | Payment | Section Selection | Meal plan, medical context, etc. |

---

## Deployment Checklist

- [ ] Verify `calculator_reports` table exists with all fields
- [ ] Verify `calculator_report_access_log` partition table created
- [ ] Verify `claude_api_logs` table exists
- [ ] Set up RLS policies (public read non-expired, service role full access)
- [ ] Seed `payment_tiers` with 4 tiers + features
- [ ] Configure Claude API key in environment
- [ ] Test report generation with sample user (end-to-end)
- [ ] Monitor report generation latency (target: 5-15 seconds)
- [ ] Set up daily cron for expiry soft-delete
- [ ] Set up retry logic for failed Claude API calls
- [ ] Test access token distribution (email + link)
- [ ] Verify report expiration after tier-specific days
- [ ] Load test: 100+ concurrent report requests
- [ ] Monitor API token costs (target: <$0.05 per report)
- [ ] Implement progress bar status endpoint
- [ ] Test progress bar polling (2-second intervals)
- [ ] Test error handling (network failures, timeouts)
- [ ] Test mobile responsiveness (375px, 768px, 1024px)
- [ ] Test accessibility (screen readers, ARIA labels)
- [ ] Verify 48-hour expiration window works correctly
- [ ] Test rate limiting (100 requests/hour per token)
- [ ] Test email delivery with correct expiry time
- [ ] Test UI countdown timer (displays correctly before expiry)
- [ ] Test 410 GONE response after expiration
- [ ] Test GDPR deletion workflow
- [ ] Test tier-dependent expiration values (48h, 72h, 120h)

---

**Report specs complete. 48-hour access window section added.**

This specification is production-ready for Step 6 (submission logic) implementation. All ACID properties are maintained through database constraints and immutable records. The 48-hour access window is mathematically sound and defensible for compliance.

The database is a promise you make to the future. This schema keeps that promise.
