# Step 2 Form Persistence Bug Investigation - Complete Index

**Issue:** Calculator Step 2 form fields reset after user selection, blocking payment flow
**Status:** CRITICAL - DIAGNOSED
**Timestamp:** 2026-01-04T18:34:00Z
**Investigator:** Leo, Database Architect

---

## Documents in This Investigation

### 1. LEO_QUICK_REFERENCE.md ⭐ START HERE
**Purpose:** 30-second summary + quick verification checklist
**Time to Read:** 2 minutes
**Contains:**
- The bug explained in plain English
- Root cause hypothesis (90% confident)
- Quick verification steps (12 minutes total)
- Debugging commands you can run immediately

### 2. LEO_DIAGNOSIS_SUMMARY.md
**Purpose:** Executive technical summary
**Time to Read:** 10 minutes
**Contains:**
- What the problem is and why it happens
- Why Step 1 works but Step 2 fails
- Evidence trail (code + behavioral)
- Four-stage failure cascade explanation
- Most likely scenarios (ranked by probability)
- Solution approach (high-level)

### 3. LEO_STEP2_FORM_PERSISTENCE_DIAGNOSIS.md
**Purpose:** Deep technical diagnosis with ACID analysis
**Time to Read:** 15 minutes
**Contains:**
- The two parallel state management systems
- Root cause: Dual state architecture conflict
- Secondary issue: Supabase session overwrites
- Tertiary issue: Type mismatches
- Complete evidence chain
- ACID violations explained
- Why Diet dropdown works (hint: timing)
- Critical files involved
- Investigation checkpoints

### 4. LEO_STEP2_CODE_ANALYSIS.md
**Purpose:** Line-by-line code-level analysis
**Time to Read:** 20 minutes
**Contains:**
- Initialization issue (lines 35-44)
- The controlled component chain dissected
- Radio button problem explained
- Conditional rendering trap (Deficit field)
- Validation flow analysis
- useEffect race condition
- Zustand parallel system complications
- The cascade of failures (visual diagram)

### 5. LEO_STEP2_DEBUG_CHECKLIST.md
**Purpose:** Step-by-step debugging instructions
**Time to Read:** Reference (execute as needed)
**Contains:**
- How to reproduce locally
- 8 specific checkpoints to run:
  1. React DevTools state inspection
  2. Network tab analysis
  3. Browser console logging
  4. Supabase session data inspection (SQL)
  5. Type consistency verification
  6. Zustand store state check
  7. Validation state trace
  8. Macro calculation useEffect interference
- Priority order for investigation
- Expected findings for each scenario
- How to interpret results

---

## Reading Guide

### If You Have 2 Minutes:
Read: **LEO_QUICK_REFERENCE.md**
- Understand the bug
- Run 12-minute verification

### If You Have 15 Minutes:
Read: **LEO_DIAGNOSIS_SUMMARY.md**
- Understand root causes
- Know what to look for

### If You Have 30 Minutes:
Read: **LEO_DIAGNOSIS_SUMMARY.md** + **LEO_QUICK_REFERENCE.md** + Run Checkpoint 1
- Full diagnosis + verify locally

### If You Have 1 Hour:
Read: **LEO_STEP2_FORM_PERSISTENCE_DIAGNOSIS.md** + Run Checkpoints 1-4
- Deep technical understanding + database verification

### If You Have 2 Hours:
Read all documents + Run all 8 checkpoints
- Complete expert-level diagnosis
- Ready to implement fix

---

## The Root Cause (TL;DR)

**Three factors combine:**

1. **Dual State Systems**
   - CalculatorApp.tsx uses React hooks
   - Zustand store (formStore.ts) uses separate state
   - They're not synchronized
   - When one updates, the other doesn't

2. **Supabase Overwrites**
   - Code fetches session data from Supabase (line 355-376 in CalculatorApp)
   - If this fetch happens while user is filling Step 2
   - And the Supabase data has NULL for form_data fields
   - Then setFormData() overwrites user's selections with stale data

3. **Visual Masking**
   - UI shows selection (visual feedback)
   - But state is corrupted (data is NULL/undefined)
   - User clicks Continue
   - Validation checks state (not UI)
   - Validation fails because data doesn't match UI

**Result:** Form appears filled but validation fails.

---

## Most Likely Cause (90% Confidence)

Background Supabase session fetch overwrites form state while user is actively filling Step 2.

**Evidence:**
- Production-specific issue (Supabase only in prod)
- Affects all Step 2 fields (suggests whole state overwrite)
- Happens after advancing to Step 2 (fetch triggered then)
- Visual shows selection but validation fails (UI/state mismatch)

---

## Quickest Verification

**Time: 5 minutes**

```javascript
// In browser console, open React DevTools
// Go to CalculatorApp component
// Select "Sedentary" in Activity Level
// Immediately check: $r.props.data.lifestyle
// Should show: 'sedentary'
// Wait 2 seconds
// Check again: $r.props.data.lifestyle
// If it reverted to: ''  ← FOUND THE BUG
```

---

## Critical Code Locations

| Component | Problem | Line | Severity |
|-----------|---------|------|----------|
| CalculatorApp.tsx | State init mismatch | 35-44 | High |
| CalculatorApp.tsx | Session fetch overwrite | 355-376 | Critical |
| CalculatorApp.tsx | useEffect race condition | 78-118 | Medium |
| Step2FitnessDiet.tsx | Controlled components | 62-154 | Low |
| Step2FitnessDiet.tsx | Stale validation | 32-52 | High |
| formStore.ts | Parallel state system | All | Critical |

---

## Investigation Priorities

1. **Verify root cause exists** (Checkpoint 1 - 5 min)
   - React DevTools inspection

2. **Check for Supabase fetches** (Checkpoint 2 - 5 min)
   - Network tab monitoring

3. **Verify data in database** (Checkpoint 4 - 2 min)
   - SQL query on sessions table

4. **Deep analysis** (Checkpoints 3, 5-8 - 20 min)
   - Only if checkpoints 1-3 inconclusive

---

## Expected Outcomes

### If Checkpoint 1 Shows State Reversion
- formData.lifestyle changes to 'sedentary' then back to ''
- **Diagnosis:** State is being overwritten
- **Next Step:** Check Checkpoint 2 for API calls

### If Checkpoint 2 Shows Supabase Fetch
- GET /get-session?id=<uuid> appears during Step 2
- Timing: After user selection, before validation
- **Diagnosis:** Session fetch is overwriting state
- **Next Step:** Check Checkpoint 4 for stale data

### If Checkpoint 4 Shows NULL Values
- SQL: form_data->>'lifestyle' returns null
- Sessions table has incomplete form_data
- **Diagnosis:** Supabase storing corrupted data
- **Next Step:** Check RLS policies

### If All Checkpoints Pass Normally
- States stay consistent
- No Supabase overwrites detected
- Data in database looks correct
- **Diagnosis:** Might be environment-specific or different root cause
- **Next Step:** Run Checkpoints 5-8 for deeper analysis

---

## Files to Examine

### Source Code
```
/calculator2-demo/src/components/calculator/CalculatorApp.tsx
/calculator2-demo/src/components/calculator/steps/Step2FitnessDiet.tsx
/calculator2-demo/src/components/calculator/shared/SelectField.tsx
/calculator2-demo/src/components/calculator/shared/RadioGroup.tsx
/calculator2-demo/src/stores/formStore.ts
```

### Configuration
```
/supabase/migrations/
/supabase/rls_policies/
.env.example  (check for Supabase config)
```

### Deployment
```
CloudFlare Workers logs (check form_data handling)
Supabase database logs (check update patterns)
```

---

## Action Items

### For Development Team
- [ ] Execute Checkpoint 1 (React DevTools - 5 min)
- [ ] Execute Checkpoint 2 (Network monitoring - 5 min)
- [ ] Execute Checkpoint 4 (SQL query - 2 min)
- [ ] Report findings using investigation template

### For Database Team (Leo)
- [ ] Review Supabase RLS policies
- [ ] Check for trigger-based overwrites
- [ ] Verify form_data table structure
- [ ] Analyze concurrent update patterns
- [ ] Check for auto-save mechanisms

### For DevOps/Infrastructure
- [ ] Review CloudFlare Worker logs
- [ ] Check for middleware interfering with state
- [ ] Verify environment variable differences (prod vs local)

---

## Investigation Results Template

When you've run the checkpoints, summarize findings here:

```markdown
## Investigation Results

### Checkpoint 1: React DevTools
- [ ] State changed immediately: YES / NO
- [ ] State reverted after 2 sec: YES / NO
- Observation: ________________

### Checkpoint 2: Network Tab
- [ ] Supabase fetch detected: YES / NO
- [ ] Timing (after/during/before selection): ________
- [ ] Response contains form_data: YES / NO
- Observation: ________________

### Checkpoint 4: SQL Query
- [ ] form_data has NULL fields: YES / NO
- [ ] NULL fields: lifestyle, exercise, goal, deficit, diet
- Observation: ________________

### Root Cause Determination
Based on above: ________________

### Recommended Fix
________________
```

---

## Physics of the Problem

In database terms, this violates ACID principles:

- **Atomicity:** User selection and state update not atomic
- **Consistency:** Two state systems diverge
- **Isolation:** Supabase fetch not isolated from React updates
- **Durability:** Incomplete form_data persists corrupted

**This is a transactions problem, not a code syntax problem.**

---

## Glossary

**formData:** React state object holding form values in CalculatorApp
**Zustand:** State management library used by formStore
**SelectField:** Component wrapper around HTML <select>
**RadioGroup:** Component for radio button groups
**RLS:** Row Level Security (Supabase access control)
**ACID:** Atomicity, Consistency, Isolation, Durability (database principles)
**Race Condition:** Two operations competing, one overwrites the other

---

## Contact & Escalation

**Investigator:** Leo, Database Architect
**Status:** DIAGNOSIS COMPLETE - Awaiting Verification
**Escalation:** This blocks payment processing
**Next Phase:** Confirm root cause via checkpoints, then implement fix

---

**Last Updated:** 2026-01-04T18:34:00Z
**Document Version:** 1.0
**Investigation Confidence:** 90%

*"Schema health is paramount. This is a state management transaction problem requiring architectural changes."*
