# Calculator Report System - Architecture Documentation

**Last Updated:** January 13, 2026
**Current Version:** `abcb950e-a87e-4026-894a-a370f510e473`

---

## 🚨 CRITICAL: Deployment

### Frontend Calls This Worker
```
https://carnivore-report-api-production.iambrew.workers.dev
```

### Deploy Command (FROM /api DIRECTORY)
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
wrangler deploy --name carnivore-report-api-production
```

### Verify Deployment
```bash
# Check latest version
wrangler deployments list --name carnivore-report-api-production | head -20

# Test API endpoint
curl https://carnivore-report-api-production.iambrew.workers.dev/health
```

### Common Mistake
❌ **WRONG:** `wrangler deploy` (deploys to carnivore-report-api.iambrew.workers.dev)
✅ **CORRECT:** `wrangler deploy --name carnivore-report-api-production`

---

## File Locations

### Frontend
- **Calculator Page:** `/public/calculator.html`
- **Compiled JS Bundle:** `/public/assets/calculator2/assets/index-Da2b8j_e.js`
- **API Calls:** Hardcoded in compiled bundle to `carnivore-report-api-production.iambrew.workers.dev`

### Backend (Cloudflare Worker)
- **Worker Code:** `/api/calculator-api.js` (188KB, 4200+ lines)
- **Config:** `/api/wrangler.toml`
- **Alternative (not used):** `/api/generate-report.js` (orphaned file, do not deploy)

### Templates
All report templates are embedded in `calculator-api.js`:
- Line 2528: Meal Calendar template
- Line 2531: Shopping List template
- Line 2534: Physician Consultation Guide (includes signature section)
- Line 2537: Restaurant & Travel Guide
- Lines 2540-2550: Science, Labs, Electrolytes, Timeline, Stall-Breaker, Tracker

---

## Data Flow

### 1. User Fills Form
- **Component:** React calculator embedded in `calculator.html`
- **Steps:** Demographics → Activity & Goals → Results → Checkout → Health Profile
- **Data Captured:** Age, weight, height, sex, activity level, diet preferences, allergies, health conditions

### 2. Form Submission
- **Endpoint:** `POST https://carnivore-report-api-production.iambrew.workers.dev/api/v1/calculator/step/4`
- **Payload:** Full form data including firstName, lastName, allergies, avoidFoods, medications, etc.
- **Note:** Frontend scrambles field names (allergies → avoidFoods, avoidFoods → previousDiets, etc.)

### 3. Session Storage
- **Table:** `calculator_sessions` (Supabase)
- **Fields:** session_token, form_data (JSONB), tier_id, payment_status
- **Expiration:** 48 hours

### 4. Report Generation Trigger
- **Endpoint:** `POST /api/v1/calculator/report/init`
- **Function:** `handleReportInit()` (line 907)
- **Input:** session_id or session_token
- **Process:**
  1. Fetch session from Supabase
  2. Remap scrambled form fields (line 1002)
  3. Call `generateAllReports()` (line 1027)
  4. Convert markdown to HTML (line 1043)
  5. Save to `calculator_reports` table
  6. Return access token + HTML

### 5. Report Storage
- **Table:** `calculator_reports` (Supabase)
- **Fields:** access_token (64-char hex), report_html, session_id, expires_at
- **Expiration:** 48 hours from generation

### 6. Report Display
- **URL:** `https://carnivoreweekly.com/calculator-report.html?token={access_token}`
- **Endpoint:** `GET /api/v1/calculator/report/{access_token}/content`
- **Function:** `handleReportContent()` (fetches HTML from Supabase)

---

## Key Functions

### `generateAllReports(data, apiKey)` - Line 2163
**Purpose:** Master orchestrator for generating all 13 report sections

**Architecture:** Hybrid AI + Templates
- **2 AI-generated sections:** Executive Summary, Obstacle Protocol
- **11 static templates:** Food Guide, Meal Calendar, Shopping, Physician, Restaurant, Science, Labs, Electrolytes, Timeline, Stall-Breaker, Tracker

**Returns:** Object with keys 1-13 containing markdown content

**Called by:** `handleReportInit()` after remapping form data

---

### `shouldFilterOutFood(food, allergies, foodRestrictions)` - Line 1596
**Purpose:** Determines if a food should be excluded from meal plans and shopping lists

**Logic:**
1. Check if food name matches allergy keywords (eggs, dairy, shellfish, beef, pork, fish, nuts)
2. Check if food name matches food restrictions
3. Return true if should filter out, false if safe to include

**Used by:**
- `generateFullMealPlan()` - Filters proteins before creating meals
- `generateGroceryListByWeek()` - Filters proteins and fats
- `generateDynamicFoodGuide()` - Filters food recommendations

**Common Bug:** Hardcoded foods (e.g., "Eggs") in meal templates bypass this check. Always use filtered protein lists.

---

### `wrapInPrintHTML(markdownContent, userData)` - Line 2058
**Purpose:** Wraps markdown report in print-optimized HTML with CSS styling

**Inputs:**
- `markdownContent`: Combined markdown from all 13 sections
- `userData`: Object with firstName, lastName for cover page personalization

**Process:**
1. Convert markdown to HTML via `markdownToHTML()`
2. Add print CSS (page breaks, fonts, table styling)
3. Generate cover page with logo, title, user name, date
4. Add "Save as PDF" button
5. Return complete HTML document

**Output:** Full HTML page ready for browser print-to-PDF

**Cover Page Name Display:**
```javascript
${userData.firstName ? `<br><span>Prepared for ${userData.firstName}${userData.lastName ? ' ' + userData.lastName : ''}</span>` : ''}
```

---

### `markdownToHTML(markdown)` - Line 1930
**Purpose:** Converts markdown syntax to styled HTML

**Supports:**
- Headings (# ## ###)
- Tables (| header | header |)
- Lists (- item, * item)
- Bold (**text** or __text__)
- Italic (*text* or _text_)
- Links ([text](url))
- Images (![alt](url))
- Code (`inline code`)

**Does NOT support:** Nested lists, complex markdown extensions

---

### `replacePlaceholders(template, data)` - Line 2559
**Purpose:** Replaces {{placeholder}} variables with actual user data

**Placeholders Replaced:**
- `{{firstName}}`, `{{lastName}}` - User name
- `{{diet}}`, `{{selectedProtocol}}` - Diet type (Carnivore, Keto, etc.)
- `{{goal}}` - User goal (weight loss, muscle gain, etc.)
- `{{allergies}}`, `{{avoidFoods}}` - Dietary restrictions
- `{{symptoms}}`, `{{medications}}`, `{{conditions}}` - Health info
- `{{macros.calories}}`, `{{macros.protein}}`, `{{macros.fat}}`, `{{macros.carbs}}` - Calculated nutrition
- `{{breakfast1}}`-`{{breakfast30}}`, `{{lunch1}}`-`{{lunch30}}`, `{{dinner1}}`-`{{dinner30}}` - Meal plan
- `{{protein1Week1}}`-`{{protein2Week4}}`, `{{qty1Week1}}`-`{{qty2Week4}}` - Shopping quantities
- `{{currentDate}}` - Today's date

**Conditional Blocks:**
```
{{#if medications && medications.toLowerCase().includes('metformin')}}
  Display medication adjustment protocol
{{/if}}
```

---

### `generateFullMealPlan(data)` - Line 1620
**Purpose:** Generate 30-day meal calendar with personalized meals

**Process:**
1. Filter proteins by diet type, budget, allergies, restrictions
2. Calculate macro targets (protein/fat per meal based on user's calculated needs)
3. Check if eggs are allowed (not in allergies)
4. For each of 30 days:
   - Rotate through available proteins for variety
   - Calculate gram amounts to hit macro targets
   - Generate breakfast, lunch, dinner based on diet type
5. Return 4 weeks of meals

**Output:**
```javascript
{
  weeks: [
    {
      weekNumber: 1,
      days: [
        { dayNumber: 1, breakfast: "200g Ground Beef, 2 Eggs, 1 tbsp Butter", lunch: "...", dinner: "..." },
        ...
      ]
    },
    ...
  ]
}
```

---

### `generateGroceryListByWeek(data)` - Line 1786
**Purpose:** Generate 4 weeks of shopping lists

**Process:**
1. Filter proteins and fats by diet, budget, allergies
2. For each week (1-4):
   - Rotate through available proteins
   - Select appropriate fats (butter, ghee, etc.)
   - Add pantry items (salt)
3. Return quantities for each week

**Output:**
```javascript
{
  week1: {
    proteins: [{ name: "Ground Beef", quantity: "5 lbs" }, ...],
    fats: [{ name: "Butter", quantity: "1 lb" }],
    pantry: [{ name: "Salt", quantity: "1 container" }]
  },
  ...
}
```

---

## Environment Variables

### Required Secrets (Cloudflare Wrangler)
```bash
# Add via: wrangler secret put VARIABLE_NAME --name carnivore-report-api-production

# Anthropic AI
ANTHROPIC_API_KEY         # Used for AI-generated sections (Executive Summary, Obstacle Protocol)
CLAUDE_API_KEY            # Legacy fallback (code checks ANTHROPIC_API_KEY || CLAUDE_API_KEY)

# Supabase Database
SUPABASE_SERVICE_ROLE_KEY # Admin access for calculator_sessions, calculator_reports tables
SUPABASE_ANON_KEY         # Public access key
SUPABASE_URL              # Set in wrangler.toml vars

# Stripe Payments
STRIPE_SECRET_KEY         # Server-side payment processing
STRIPE_PUBLISHABLE_KEY    # Client-side checkout

# CORS
FRONTEND_URL              # Set to "https://carnivoreweekly.com" in production
```

### Verify Secrets Are Set
```bash
wrangler secret list --name carnivore-report-api-production
```

---

## Common Issues & Fixes

### ❌ Issue: Changes don't appear in production
**Cause:** Deploying to wrong Worker
**Fix:** Always deploy with `--name carnivore-report-api-production`

### ❌ Issue: API errors "ANTHROPIC_API_KEY not found"
**Cause:** Secret not set on production Worker
**Fix:** `wrangler secret put ANTHROPIC_API_KEY --name carnivore-report-api-production`

### ❌ Issue: Report sections not combining (shows only 1 section)
**Cause:** `generateAllReports()` not being called, or loop not iterating 1-13
**Check:** Line 1030-1038 in `handleReportInit()` - should combine all sections

### ❌ Issue: Styling missing (plain text report)
**Cause:** `wrapInPrintHTML()` not being called
**Check:** Line 1043 should wrap markdown in HTML with CSS

### ❌ Issue: Allergies not being filtered (eggs appearing despite allergy)
**Cause:** Hardcoded food items in meal templates
**Fix:** Always check `eggsAllowed` before adding eggs (see line 1722-1726, 1742-1766)

### ❌ Issue: Placeholders showing in report (`{{firstName}}` instead of name)
**Cause:** `replacePlaceholders()` not receiving correct data
**Check:**
1. Form field mapping (line 1002-1019) - frontend scrambles field names
2. Data passed to `loadAndCustomizeTemplate()` (line 1027)

### ❌ Issue: Days 29-30 blank in meal calendar
**Cause:** Loop only going to day 28
**Fix:** Ensure loop goes to day 30 (line 1704: `for (let dayNum = 1; dayNum <= 30; dayNum++)`)

### ❌ Issue: Cover page not showing name
**Cause:** `userData` not passed to `wrapInPrintHTML()`
**Check:** Line 1043 should pass `correctedData` as second argument

---

## Database Schema (Supabase)

### `calculator_sessions`
```sql
CREATE TABLE calculator_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  form_data JSONB,
  tier_id INTEGER,
  payment_status TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `calculator_reports`
```sql
CREATE TABLE calculator_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT UNIQUE NOT NULL, -- 64-char hex
  session_id UUID REFERENCES calculator_sessions(id),
  report_html TEXT,
  generated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_expired BOOLEAN DEFAULT FALSE,
  access_count INTEGER DEFAULT 0
);
```

---

## Testing Checklist

### Before Deploying
- [ ] Commit changes with descriptive message
- [ ] Verify code compiles (no syntax errors)
- [ ] Test locally with `wrangler dev`

### Deploy to Production
```bash
cd /Users/mbrew/Developer/carnivore-weekly/api
git add calculator-api.js
git commit -m "Fix: [describe change]"
wrangler deploy --name carnivore-report-api-production
```

### After Deployment
- [ ] Check version ID matches latest deployment
- [ ] Run manual test (fill form, generate report)
- [ ] Verify changes appear in generated PDF
- [ ] Check for regressions:
  - [ ] All 13 sections present
  - [ ] Personalization working (name appears)
  - [ ] Allergies filtered
  - [ ] Meal plan has all 30 days
  - [ ] Gram amounts showing
  - [ ] Cover page displays correctly
  - [ ] Doctor signature section formatted properly

### If Test Fails
1. Check Cloudflare Worker logs: `wrangler tail --name carnivore-report-api-production`
2. Verify frontend calls correct URL (should be -production Worker)
3. Check environment variables are set: `wrangler secret list --name carnivore-report-api-production`
4. Compare deployed version vs local file

---

## Performance Notes

- **Report generation time:** 5-15 seconds
  - AI sections (Executive Summary, Obstacle Protocol): 3-10 seconds
  - Template sections: <1 second
  - Markdown to HTML conversion: <1 second
  - Database save: <1 second

- **Worker timeout:** 30 seconds (Cloudflare paid plan)
- **Report size:** 40-50KB HTML (60-80 pages when printed)
- **Token usage:** ~4000 tokens per report (Executive Summary + Obstacle Protocol)

---

## Version History

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-13 | `abcb950e` | Fix patient commitment personalization, add spacing before Date field |
| 2026-01-13 | `e5a077c3` | Fix egg filtering in meal templates |
| 2026-01-13 | `25099856` | Add field mapping correction for scrambled form data |
| 2026-01-13 | `36095a48` | Add markdown to HTML conversion |
| 2026-01-09 | `2e671d47` | Previous stable version |

---

**End of Documentation**
