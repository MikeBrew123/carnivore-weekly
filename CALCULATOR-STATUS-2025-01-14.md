# Calculator Report - Status as of January 14, 2025 (9pm)

## VERIFIED WORKING
- Deployments to production WORK (confirmed via /version endpoint)
- Active file: `api/calculator-api.js` (196KB)
- Deploy command: `wrangler deploy --env production`
- Version check: `curl https://carnivore-report-api-production.iambrew.workers.dev/version`
- 25-page reports generate successfully
- Payment flow works (TEST999 coupon)
- All 13 sections render
- Shopping list egg filtering works

## STILL BROKEN (Logic issues, not deployment)
1. **Portions hardcoded 200g** - Personalization code deployed but not executing
2. **Diet type ignored** - Keto shows carnivore-only meals
3. **Allergies in food guide/meal plan** - Eggs/shellfish still appear despite allergies
4. **Logo on separate page when printing to PDF** - CSS print media issue

## ROOT CAUSE UNKNOWN
The fixes ARE deployed (version endpoint confirms) but aren't working.
Either:
- Wrong code path being hit
- Data not reaching the functions
- Logic error in the fix itself

## FILES
- Main API: `api/calculator-api.js` (196KB) - THIS IS THE RIGHT FILE
- Old file (unused?): `api/generate-report.js` (124KB) - Verify if imported anywhere
- Wrangler config: `wrangler.toml` → main = "calculator-api.js"
- Architecture doc: `CALCULATOR-ARCHITECTURE.md`

## FRONTEND
- Calculator URL: carnivoreweekly.com/calculator.html
- Calls: carnivore-report-api-production.iambrew.workers.dev
- Form sends fields BACKWARDS (allergies ↔ avoidFoods swapped)

## NEXT SESSION - DO THIS FIRST
1. Add console.log at START of generateFullMealPlan():
```js
   console.log('=== MEAL PLAN DEBUG ===');
   console.log('dailyProtein:', data.dailyProtein);
   console.log('mealsPerDay:', data.mealsPerDay);
   console.log('selectedProtocol:', data.selectedProtocol);
   console.log('allergies:', data.allergies);
```

2. Deploy: `wrangler deploy --env production`

3. Run test, then: `wrangler tail --env production`

4. See what values ACTUALLY reach the function

5. Fix based on REAL data, not assumptions

## WHAT WE TRIED TODAY (didn't work)
- Field swap workaround (allergies ↔ avoidFoods)
- Case-insensitive diet matching
- calculateMeatPortion() function
- mealsPerDay logic

All deployed successfully but didn't change output. Logic issue.

## TIME SPENT
~15 hours debugging. Most time lost to:
- Deploying to wrong environment (dev vs production)
- FRONTEND_URL undefined
- Field mapping confusion
- Assuming fixes worked without verification

## LESSON LEARNED
Always verify with console.log + wrangler tail before assuming fix worked.
