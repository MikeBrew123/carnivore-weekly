# Report Generation Specification - Complete Summary

**Author:** Leo (Database Architect & Supabase Specialist)
**Date:** January 3, 2026
**Status:** Complete - Ready for Step 6 Implementation

---

## What This Is

A comprehensive specification for how the Carnivore Weekly calculator transforms user input (Steps 1-4) into personalized, AI-generated HTML reports.

**Three documents created:**
1. **REPORT_GENERATION_SPEC.md** - Complete technical specification (21 report sections, personalization logic, calculations, database schema)
2. **REPORT_FIELD_MAPPING.md** - Visual reference showing exactly how each form field flows into report sections
3. **REPORT_GENERATION_CHECKLIST.md** - Implementation checklist for backend developers

---

## Quick Reference: Report Flow

```
User Completes Step 4 (Email, Name, Health Data)
    ↓
Payment Verified (is_premium=true, payment_status='completed')
    ↓
Backend Creates calculator_reports Row:
  - access_token = 64-char cryptographic random
  - expires_at = NOW + tier.report_expiry_days (30-180 days)
  - report_html = placeholder "Generating..."
    ↓
Backend Queues Async Report Generation Task
    ↓
Background Job (Cron, Webhook, or Trigger):
  1. Fetch session data (25+ fields from calculator_sessions_v2)
  2. Fetch tier features (payment_tiers.features JSONB)
  3. Build Claude prompt (system + user message)
  4. Call Claude API (claude-opus-4-5-20251101, max_tokens=4000)
  5. Parse markdown response
  6. Convert to HTML (with CSS styling)
  7. Update calculator_reports.report_html + report_json
  8. Log API usage to claude_api_logs
    ↓
Report Ready for Access
    ↓
User Gets Access via Token:
  GET /api/v1/calculator/report/{access_token}
  Returns: HTML report + metadata
    ↓
Report Expires (30-180 days):
  is_expired = TRUE (soft delete)
  Access returns 410 GONE
```

---

## Key Facts

### Report Sections (21 Total)

**Always Included (Bundle tier):**
1. Cover page
2. Mission brief (personalized opening)
3. Daily targets table (calories, protein, fat, carbs)
4. Why this protocol works for you (3-5 subsections based on conditions/goals)
5. Your first action step (today's shopping list + dinner)
6. 30-day timeline (week-by-week expectations)
7. Your biggest challenge, addressed (custom section for their specific challenge)
8. Medical disclaimer (condition + medication specific)
9. Personalized closing statement (motivational, uses their name)

**Meal Plan Tier ($27):**
10. Carnivore food pyramid
11. Daily eating patterns (meal examples)
12. Weekly grocery lists (Week 0-4)

**Doctor Tier ($15):**
13. Physician consultation guide (2-minute pitch, lab markers, conflict resolution)
14. Conquering your kryptonite (systems approach to biggest challenge)
15. Dining out & travel survival guide
16. The science & evidence
17. Laboratory reference guide
18. Electrolyte protocol
19. Adaptation timeline (detailed week-by-week)
20. Stall-breaker protocol
21. 30-day symptom tracker

### Personalization Highlights

**What makes each report unique:**
- **Name appears 5+ times** (opening, macro discussion, challenges, closing)
- **Conditions determine content**: diabetes → blood sugar section; IBS → gut healing
- **Biggest challenge gets its own section** (e.g., "I fell off keto after 14 months")
- **Goals determine subsections**: weight_loss, energy, mental_clarity each get dedicated content
- **Previous diet history integrated**: "You've already proven keto works—here's how carnivore builds on that"
- **Medications highlighted**: "Metformin may need dosage adjustment. Check with your doctor."
- **Allergies enforced**: No shellfish in meal plans if allergic
- **Budget tier affects recommendations**: Budget users see ground beef focus; premium users see grass-fed
- **Dairy tolerance respected**: Butter-only users get no cheese suggestions
- **Family situation affects portions**: Solo users get 1-serving meals; families get scaled recipes
- **Work situation affects guide inclusion**: Frequent travelers get full restaurant guide

### Example: Michael's Report

**Input Summary:**
```
Name: Michael
Age: 35, Male, 5'10", 185 lbs
Goal: Lose weight (20% deficit)
Conditions: Diabetes, Hypertension
Medications: Metformin 500mg 2x/day, Lisinopril 10mg daily
Symptoms: Brain fog, joint pain
Previous: Keto for 14 months (successful)
Challenge: "I fell off keto after 14 months"
Tier: Doctor ($15)
```

**Calculated Targets:**
- TDEE: 2,400 kcal (moderate activity × baseline)
- Deficit: 20% = 1,920 kcal daily
- Protein: 130g (0.7g/lb for lean preservation)
- Fat: 160g (75% of calories for satiety)
- Carbs: <20g (carnivore, near zero)

**Report Sections Generated (All 21):**
- Mission Brief: "You've already proven keto works—14 months don't lie..."
- Daily Targets: 1,800-2,200 kcal, 130-160g protein, 130-170g fat, <20g carbs
- Why This Works: 4 subsections (Blood Sugar, Mental Clarity, Weight Loss, Energy)
- First Action: Specific shopping list (beef, eggs, butter, salt)
- Timeline: Week-by-week with "Monitor blood sugar with Metformin" note
- Biggest Challenge: "You fell off keto after 14 months" + 4 tactical solutions
- Medical Disclaimer: Lists both medications, emphasizes dosage adjustment
- Physician Guide: Advanced labs (ApoB, CAC score, fasting insulin), conflict scripts
- 30-Day Tracker: Symptom checklist includes "brain fog" and "joint pain"
- Personalized Closing: "One meal at a time, Michael."

---

## Database Schema (Verified)

### calculator_reports
```
id (UUID) - Primary key
session_id (FK, UNIQUE) - One report per session
email - Denormalized for fast lookup
access_token (64-char hex, UNIQUE) - Token-based access
report_html - Full HTML (immutable)
report_markdown - Raw markdown (version control)
report_json - Metadata (sections_count, content_length, generated_at)
claude_request_id - API correlation
generation_start_at, generation_completed_at - Timing
expires_at - When report becomes inaccessible (30-180 days)
is_expired - Soft delete flag
access_count - Usage tracking
last_accessed_at - Activity tracking
created_at, updated_at - Audit trail
```

### calculator_report_access_log (Partitioned)
```
Partitions: One per month (2026-01, 2026-02, etc.)
Tracks: Every report access (IP, user agent, timestamp, success/failure)
Trigger: Auto-increments calculator_reports.access_count
```

### claude_api_logs
```
Tracks: Every Claude API call
Records: request_id, model, tokens, duration, status, error
Used for: Cost tracking, debugging, performance monitoring
```

---

## Tier Comparison Matrix

| Feature | Bundle | Shopping | MealPlan | Doctor |
|---------|--------|----------|----------|---------|
| Price | $9.99 | $19 | $27 | $15 |
| Basic Report | ✅ | ✅ | ✅ | ✅ |
| Meal Plan | ❌ | ❌ | ✅ | ❌ |
| Grocery Lists | ❌ | ✅ | ✅ | ❌ |
| Medical Context | ❌ | ❌ | ❌ | ✅ |
| Doctor Guide | ❌ | ❌ | ❌ | ✅ |
| Expiry | 30 days | 60 days | 90 days | 180 days |
| Revisions | 1 | 2 | 3 | 5 |

---

## Form Input → Report Output Mapping (Summary)

### Step 1: Physical Stats
- **sex** → Metabolic calculations, gender-specific messaging
- **age** → TDEE adjustment, timeline expectations
- **height** → BMR calculation, body composition context
- **weight** → Caloric targets, macro targets, protein ratio

### Step 2: Fitness & Goals
- **lifestyle_activity** → TDEE multiplier (1.2x - 1.9x)
- **exercise_frequency** → Electrolyte needs, recovery emphasis
- **goal** → Caloric deficit/maintenance/surplus, tone
- **deficit_percentage** → Exact daily calorie target
- **diet_type** → Allowed foods, macro ranges, food pyramid

### Step 3: Calculated Macros
- **calories** → Daily targets table, meal planning baseline
- **protein_grams** → Portion sizing, muscle preservation narrative
- **fat_grams** → Satiety guidance, cooking fat recommendations
- **carbs_grams** → Elimination validation (<20g for carnivore)
- **calculation_method** → Transparency, audit trail (logged but not displayed)

### Step 4: Health Profile (Premium)
- **email** → Report delivery destination (soft RLS control)
- **first_name** → Personalization throughout report
- **medications** → Medical disclaimer emphasis, physician guide
- **conditions** → Content selection (e.g., diabetes → blood sugar section)
- **symptoms** → Subsection activation, challenge section
- **allergies** → Ingredient exclusion in meal plans
- **avoid_foods** → Personal food rejection list
- **dairy_tolerance** → Dairy product recommendations
- **previous_diets** → Success narrative context
- **what_worked** → Reinforcement messaging
- **carnivore_experience** → Timeline detail level (new = more hand-holding)
- **cooking_skill** → Recipe complexity (beginner = simple; advanced = organ meats)
- **meal_prep_time** → Batch prep guidance
- **budget** → Food sourcing tier (budget = ground beef; premium = grass-fed)
- **family_situation** → Recipe scaling, meal compatibility
- **work_travel** → Restaurant/travel guide inclusion
- **goals** → Subsection selection (weight_loss, energy, mental, etc.)
- **biggest_challenge** → Custom section (becomes section heading + solution)
- **additional_notes** → Closing personalization, motivational hooks

**Example:** Michael's condition "diabetes" → Report includes "For Blood Sugar & Diabetes" subsection + medication warning in disclaimer + blood sugar monitoring in Week 1 timeline + fasting insulin/HbA1c in Physician Guide labs.

---

## Claude AI Integration

### Prompt Engineering
- **System Message**: Expert nutrition strategist generating evidence-based recommendations
- **User Prompt**: All 25+ form fields + tier features (controls which sections)
- **Model**: claude-opus-4-5-20251101 (most capable)
- **Max Tokens**: 4000 (sufficient for full report)
- **Output Format**: Markdown (then converted to HTML)

### Cost & Performance
- **Typical Cost**: ~$0.035 per report (500 input tokens, 2000 output tokens)
- **Typical Duration**: 5-15 seconds
- **Success Rate Target**: >99%
- **Token Budget**: At scale (10K reports/month), ~$350/month for Claude

### Error Handling
- Timeout → Retry in 5 minutes (max 3 retries)
- Rate limit (429) → Exponential backoff
- Auth error (401) → Alert immediately, escalate
- Large content → Truncate optional sections intelligently

---

## Access Control & Security

### Access Token Model
- **Format**: 64-character hex string (256-bit cryptographic random)
- **Generation**: `crypto.randomBytes(32).toString('hex')`
- **Distribution**: Email to user + frontend display
- **Security Model**: Token is proof of access (not tied to user auth)
- **Revocation**: Update `is_expired=TRUE` in database

### Row Level Security (RLS)

**calculator_reports:**
- Public can read if `is_expired=FALSE AND expires_at > NOW`
- Service role has full CRUD
- No email-based access control (token-based only)

**calculator_sessions_v2:**
- Service role only (backend access)
- Public cannot read directly

### Data Retention
- **Sessions**: Indefinite (user request to delete)
- **Reports**: Tier-dependent (30-180 days active, then soft delete via cron)
- **Access Logs**: 90 days (partitioned monthly for performance)
- **API Logs**: 90 days (cost tracking + debugging)

---

## Deployment Architecture

### Background Job Options

**Option 1: Cloudflare Cron (Recommended)**
- Trigger: Every 5 minutes
- Batch size: Max 10 pending reports
- Prevents overload, simple implementation

**Option 2: Stripe Webhook**
- Trigger: payment.intent.succeeded
- Immediate report generation
- Reduces delay between payment and availability

**Option 3: Supabase PostgreSQL Trigger**
- Trigger: INSERT on calculator_reports
- Real-time generation
- Higher complexity, more resilient

### Monitoring
- Report generation latency (target: <15 seconds)
- Claude API token usage (alert if >2x expected)
- Error rate (target: <1%)
- Database query times (target: <100ms with indexes)

---

## Testing Strategy

### Unit Tests
- Access token generation (format, uniqueness)
- Expires_at calculation
- Markdown-to-HTML conversion
- Claude prompt construction
- Error handling (timeout, rate limit)

### Integration Tests
- End-to-end flow (Step 4 → report generated → accessible)
- Report expiration (after X days, returns 410)
- Tier-specific content (each tier gets correct sections)
- Personalization verification (name appears, conditions affect sections)

### Load Tests
- 100+ concurrent report requests
- API latency verification
- Database index effectiveness
- Claude API rate limit avoidance

### Manual QA
- Generate reports for all 4 tiers
- Verify HTML rendering (browser, print, mobile)
- Verify personalization (name, conditions, biggest challenge)
- Verify calculations (macros match form input)

---

## Key Implementation Details

### Personalization Rules (From SPEC.md)

**Rule 1: Condition-Specific Tone**
- Diabetes → Urgent, blood sugar focused, medication coordination emphasis
- Autoimmune → Healing focused, inflammation reduction emphasis
- No conditions → Optimization focused, longevity emphasis

**Rule 2: Previous Diet Integration**
- Keto experience → "You've already proven this works—carnivore builds on that"
- Low-fat experience → "You know what doesn't work—carnivore is fundamentally different"
- Calorie restriction → "Carnivore eliminates diet mentality"

**Rule 3: Challenge-Specific Solutions**
- Time/busy → Batch prep, 2-meal daily focus
- Social/family → Communication scripts, restaurant strategies
- Consistency/falling off → Systems design, habit stacking, emergency protocols
- Expense → Budget optimization, bulk buying tips

### Data Calculations

**TDEE Formula (Katch-McArdle):**
1. Calculate LBM (lean body mass)
2. Calculate BMR = 370 + (21.6 × LBM)
3. Calculate TDEE = BMR × activity_multiplier
4. Apply deficit/surplus (goal-dependent)

**Macro Targets (Carnivore):**
- Protein: 0.7-1.0g per lb (prioritize first)
- Fat: Remainder after protein (typically 65-80% calories)
- Carbs: <20g daily (ideally 0g)

**Progress Timeline:**
- Weeks 1-2: 3-7 lbs water loss + transition symptoms
- Week 3+: 1-2 lbs/week body fat loss
- Week 3-4: Symptom improvement expected
- Week 4+: Long-term sustainability phase

---

## What's NOT Included (Future Features)

- PDF generation (future enhancement)
- Email delivery (currently manual link distribution)
- Report revisions/regeneration (future, tier-dependent)
- Report customization (future, user control over sections)
- Multi-language support (future)
- Report sharing with doctors (future)
- Progress tracking across multiple reports (future)
- AI follow-up chat (future)

---

## Critical Success Factors

1. **Immutability**: Reports never change after generation (ACID guarantee)
2. **Personalization**: Every report feels custom (not template-driven)
3. **Medical Safety**: Medication interactions highlighted, physician coordination required
4. **Expiration**: Reports don't live forever (compliance + data hygiene)
5. **Access Control**: Token-based security prevents unauthorized access
6. **Performance**: 5-15 second generation (acceptable wait time)
7. **Reliability**: >99% success rate (monitor closely, retry failed jobs)

---

## File Reference Guide

**For Implementation:**
- `/docs/REPORT_GENERATION_SPEC.md` - Complete technical specification
- `/docs/REPORT_FIELD_MAPPING.md` - Form field → report section mapping
- `/docs/REPORT_GENERATION_CHECKLIST.md` - Implementation checklist

**For Reference:**
- `/docs/CALCULATOR_ARCHITECTURE.md` - Database schema + API endpoints
- `/Users/mbrew/Downloads/carnivore-protocol (1).html` - Example report (Michael's)

**Approved by:**
- Leo (Database Architect) - Schema design ✅
- Backend Team - API design (pending)
- QA Team - Testing strategy (pending)

---

## Sign-Off

**Specification Status:** COMPLETE

All requirements from the task have been addressed:
- ✅ Reviewed example report structure
- ✅ Documented report generation spec (REPORT_GENERATION_SPEC.md)
- ✅ Created field mapping guide (REPORT_FIELD_MAPPING.md)
- ✅ Database schema verified (calculator_reports, access_log, claude_logs)
- ✅ Report sections documented (21 total, tier-dependent)
- ✅ Personalization logic specified
- ✅ API generation process detailed
- ✅ Example: Michael's report flow documented
- ✅ Report delivery method specified (email + token-based web access)
- ✅ Report expiration rules defined (30-180 days per tier)

**Report specs complete.**

---

**Philosophy:** "A database is a promise you make to the future. This specification ensures that promise is kept through immutable records, secure access tokens, precise personalization, and reliable automated delivery."

**Ready for Step 6 Implementation.**

Leo out.
