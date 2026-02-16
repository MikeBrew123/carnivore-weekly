# Medical Disclaimer System - Pilot Testing Guide (Phase 6)

**Date Created:** 2026-01-01
**Phase:** 6 (Pilot Testing)
**Status:** Ready to Execute
**Duration:** 1-3 days

---

## Overview

This guide walks you through the pilot testing phase of the medical disclaimer integration system. The pilot validates that:

1. ✅ Disclaimers sound natural in Sarah's voice (not robotic/legal)
2. ✅ Jordan Validator 2B correctly detects high-risk content
3. ✅ Jordan Validator 2B correctly validates present disclaimers
4. ✅ Sarah can self-validate before submission (low failure rate)
5. ✅ System is ready for full rollout (Marcus, Chloe, Casey)

---

## Pre-Pilot Checklist (Verify System Ready)

### Documentation in Place
- [ ] `/docs/medical-disclaimer-guide.md` exists with all 112 variations
- [ ] `/docs/validation-standards.md` includes Validator 2B specification
- [ ] `/docs/brand-kit.md` documents hybrid disclaimer approach
- [ ] All 4 writer personas have disclaimer sections

**Verify:**
```bash
# Check all files exist and contain key content
grep -l "Medical Disclaimer" /Users/mbrew/Developer/carnivore-weekly/docs/*.md
grep -l "Validator 2B" /Users/mbrew/Developer/carnivore-weekly/agents/jordan.md
grep -c "Category 7" /Users/mbrew/Developer/carnivore-weekly/docs/medical-disclaimer-guide.md
# Should return 112+ mentions (28 per writer)
```

### Writer Personas Updated
- [ ] `agents/sarah.md` - Medical Disclaimer Integration section present
- [ ] `agents/marcus.md` - Medical Disclaimer Integration section present
- [ ] `agents/chloe.md` - Medical Disclaimer Integration section present
- [ ] `agents/casey.md` - Medical Disclaimer Integration section present

**Verify:**
```bash
for file in sarah marcus chloe casey; do
  grep -c "Medical Disclaimer Integration" /Users/mbrew/Developer/carnivore-weekly/agents/${file}.md
  # Each should return 1
done
```

### Validator System Ready
- [ ] `agents/jordan.md` includes Validator 2B after Validator 2
- [ ] Validator 2B section includes keyword list
- [ ] Validator 2B section includes failure example

**Verify:**
```bash
grep -A 5 "Validator 2B" /Users/mbrew/Developer/carnivore-weekly/agents/jordan.md | head -20
# Should show Validator 2B spec
```

---

## Pilot Test Article Requirements

### Article Topic & Scope

**Recommended Topic:** "Why Fasting Affects Your Bloodwork (And It's Not Always Bad)"

**Why this topic:**
- Naturally triggers Category 7 (high-risk: medication interactions)
- Allows inclusion of Category 2 (research citations)
- Provides opportunities for Category 3 (individual variability)
- Health claim focus ensures disclaimers are appropriate
- Realistic length (800-1200 words)

**Alternative Topics:**
- How to adjust diet if you're taking metformin
- Thyroid health on carnivore (mentions diagnosed conditions)
- Managing bloodwork on new eating patterns
- Any topic mentioning medications or diagnosed conditions

### Article Structure Requirements

**MUST INCLUDE** (for comprehensive testing):

1. **Category 1: General Health/Nutrition** (early in article)
   - Where: Introduction or first main section
   - Trigger: When explaining a general health concept
   - Example: Explaining how fasting affects insulin levels

2. **Category 2: Research/Scientific Evidence** (in middle)
   - Where: When citing studies
   - Trigger: "Research shows..." or "Studies indicate..."
   - Example: "Research shows fasting improves insulin sensitivity. [Category 2 disclaimer]"

3. **Category 3: Individual Variability** (middle section)
   - Where: When discussing different outcomes
   - Trigger: "Most people experience..." or "Results vary..."
   - Example: Acknowledging that not everyone responds the same

4. **Category 7: Medications/Diagnoses/Acute Symptoms** (critical trigger)
   - Where: Any mention of medications or diagnosed conditions
   - Trigger: "medication," "diagnosed with," "prescription," etc.
   - Example: "If you take metformin for diabetes..." should include Category 7

5. **End-of-Post "Not a Doctor" Statement** (final section)
   - Where: Just before conclusion or at very end
   - Content: Sarah's standard disclaimer from her persona
   - Status: Should already be in Sarah's voice

### Word Count & Format

- **Length:** 800-1200 words (standard blog post)
- **Format:** HTML file in `/public/blog/`
- **Naming:** `[DATE]_[SLUG].html` (e.g., `2026-01-01_fasting-bloodwork.html`)
- **Metadata:** Include author (Sarah), date, title

---

## Step-by-Step Pilot Execution

### Step 1: Sarah Reviews Disclaimer System (30 minutes)

**Sarah should:**
1. Read the new "Medical Disclaimer Integration" section in her persona file (`/agents/sarah.md`)
2. Review the full `/docs/medical-disclaimer-guide.md` (skim, focus on Category 1-7 definitions)
3. Pay special attention to:
   - When each category is triggered
   - Her 4 variations for each category
   - Placement philosophy (one per concept, not every paragraph)
   - Common mistakes to avoid

**Quick Orientation:**
- Categories 1-6: Conversational, educational, natural-sounding
- Category 7: STRONGEST (only for medications/diagnoses/acute symptoms)
- Decision tree in guide shows when to use which category
- 4 variations per category = rotate for variety

---

### Step 2: Sarah Writes Pilot Article (1-2 days)

**Process:**
1. **Planning (0.5 day)**
   - Choose topic (fasting/bloodwork recommended)
   - Create outline with 5+ sections
   - Note where each disclaimer category will naturally fit
   - Check brand guidelines (`/docs/brand-kit.md`)

2. **Writing (1-1.5 days)**
   - Write full draft without worrying about disclaimers first
   - Focus on voice consistency and clarity
   - Include specific examples and evidence

3. **Disclaimer Integration (30 minutes)**
   - Read draft aloud
   - Identify health claims and high-risk triggers
   - Add appropriate disclaimers using guide
   - Ensure they sound like Sarah (not robotic)

4. **Self-Validation (30 minutes)**
   - Use self-check validation from Sarah's persona:
     - [ ] Health claims made? → Disclaimers present
     - [ ] Medications/diagnoses/acute symptoms? → Category 7 REQUIRED
     - [ ] High-risk topics? → Category 5
     - [ ] Research cited? → Category 2
     - [ ] Disclaimers sound like Sarah?
     - [ ] End-of-post "Not a Doctor" statement included?
   - Read aloud - does it flow naturally?
   - Check for excessive disclaimer density

5. **Documentation**
   - Create file in `/public/blog/` with proper naming
   - Add HTML structure with metadata
   - Include date published: 2026-01-01
   - Include author: Sarah

---

### Step 3: Submit to Jordan Validation

**Submission Process:**
1. Notify Quinn: "Sarah's [Pilot Article Title] ready for validation"
2. Quinn routes to Jordan with note: "PILOT TEST - Medical disclaimer system Phase 6"
3. Jordan runs all 11 validators (full validation)

**Expected Result:**
- Validators 1-9: Should PASS (standard quality checks)
- **Validator 2B: CRITICAL test**
  - Should detect high-risk keywords (medications/diagnoses/symptoms)
  - Should verify Category 7 disclaimer is present
  - Should return PASS if disclaimer appropriately included
  - If disclaimer missing, should FAIL with clear fix guidance

---

### Step 4: Jordan Validation Execution

**Jordan's Validation Report Should Include:**

```markdown
# Validation Report - PILOT TEST
## Blog Post: [Article Title]
## Author: Sarah

### Content Quality
- Copy-Editor: ✅ PASS
- Brand Voice: ✅ PASS
- Humanization: ✅ PASS

### Code Quality
- HTML: ✅ PASS
- CSS: ✅ PASS
- CSS Path: ✅ PASS
- JavaScript: ✅ PASS

### Visual Quality
- Screenshot: ✅ PASS
- Brand Details: ✅ PASS

### Performance
- Lighthouse: ✅ PASS
- Mobile: ✅ PASS

### Medical Disclaimers (NEW)
- **Validator 2: Brand Voice**
  - "Not a Doctor" disclaimer present at end: ✅ PASS
  - Disclaimer matches Sarah's voice: ✅ PASS

- **Validator 2B: High-Risk Medical Content** [PILOT TEST FOCUS]
  - High-risk keywords detected: ✅ YES [list: "prescribed," "metformin," "taking medication"]
  - Category 7 disclaimer present: ✅ YES
  - Disclaimer location appropriate: ✅ YES
  - Disclaimer sounds like Sarah: ✅ YES
  - Result: ✅ PASS

### Summary
This pilot article successfully demonstrates the new medical disclaimer system:
- ✅ Disclaimers sound natural in Sarah's voice
- ✅ All categories (1-7) appropriately used
- ✅ Validator 2B correctly detected high-risk content
- ✅ Validator 2B correctly validated present disclaimers
- ✅ No excessive disclaimer density
- ✅ System ready for full rollout

### Decision
✅ APPROVED FOR PUBLICATION (Pilot validates system effectiveness)
✅ READY FOR ROLLOUT (Marcus, Chloe, Casey pilot posts)

Validated by: Jordan
Date: [DATE]
```

---

### Step 5: Evaluate Results

**Success Criteria - ALL must be met:**

✅ **Voice Preservation**
- [ ] Disclaimers sound like Sarah, not legal/robotic
- [ ] Reader doesn't notice disclaimers interrupt flow
- [ ] Disclaimers feel conversational and helpful
- **Failure if:** Disclaimers sound formal or break voice

✅ **Validator 2B Detection**
- [ ] Validator 2B detected high-risk keywords
- [ ] Validator 2B verified Category 7 disclaimer present
- [ ] Validator 2B returned PASS (not FAIL)
- **Failure if:** False positive or false negative detection

✅ **Content Quality**
- [ ] All other validators passed (2-11)
- [ ] No validation reworks needed
- [ ] Sarah's writing quality unchanged
- **Failure if:** Other validators failed due to disclaimers

✅ **Density & Placement**
- [ ] Disclaimers don't feel excessive (not more than 5-6 per post)
- [ ] Each disclaimer relates to nearby health claim
- [ ] Placement feels natural (not randomly sprinkled)
- **Failure if:** Readers feel over-disclaimed or interrupted

✅ **Self-Validation Success**
- [ ] Sarah correctly identified all health claims
- [ ] Sarah caught high-risk triggers (medications, diagnoses)
- [ ] Sarah didn't miss needed Category 7 disclaimers
- **Failure if:** Jordan had to add/fix disclaimers Sarah missed

---

### Step 6: Gather Feedback & Refine (if needed)

**If Pilot PASSES (expect this):**
- Proceed to Step 7: Approve for Rollout
- No refinement needed
- Variations work as designed

**If Pilot Has Issues (unlikely but plan for):**

**Issue: Disclaimers sound too formal/legal**
- Refine: Review Sarah's chosen variations
- Action: Sarah picks different variation from guide that feels more natural
- Retest: Resubmit single paragraph showing natural integration
- Timeline: 1 hour fix

**Issue: Validator 2B missed high-risk content**
- Refine: Review keyword list in Validator 2B specification
- Action: Add missing keywords to detection list
- Retest: Run validator again on same content
- Timeline: 30 minutes fix + retest

**Issue: Validator 2B flagged false positive**
- Refine: Review content - was disclaimer actually needed?
- Action: Either add the disclaimer (correct behavior) or adjust keyword list if too broad
- Retest: Validate fix works
- Timeline: 30 minutes investigation + fix

**Issue: Sarah missed including a needed category**
- Refine: Review Sarah's self-check validation process
- Action: Clarify trigger/decision tree in guide
- Retest: Have Sarah review article again with refined understanding
- Timeline: 30 minutes clarification + retest

---

### Step 7: Approve for Full Rollout

**Once Pilot PASSES:**

1. **Document Success**
   - Update plan file: Phase 6 COMPLETE ✅
   - Document any minor refinements made
   - Record success date and validator results

2. **Prepare Marcus, Chloe, Casey**
   - They read pilot article (as reference)
   - They review their own persona sections
   - They understand the system works

3. **Begin Phase 7 (if you choose to execute)**
   - Marcus writes first production article (performance/protocol topic)
   - Chloe writes first production article (trending topic)
   - Casey coordinates visual validation
   - Monitor for consistent disclaimer integration

4. **Monitor Success Metrics**
   - First 12 posts across all writers
   - Track: Disclaimer appropriateness, validation pass rate, voice consistency
   - Refine variations if patterns emerge

---

## Quick Reference Guides

### For Sarah (While Writing)

**Decision Tree - Which Category to Use:**

```
Does my post mention... → Use Category

Medications, diagnosed conditions, or acute symptoms? → CATEGORY 7 ⭐ REQUIRED
Fasting, electrolytes, gout, or chronic conditions? → CATEGORY 5
Research studies or citations? → CATEGORY 2
Health concepts/education? → CATEGORY 1
Individual differences in responses? → CATEGORY 3
Tools or calculators? → CATEGORY 4
End of major section? → CATEGORY 6 (optional)
End of post (all health content)? → "NOT A DOCTOR" STATEMENT ⭐ REQUIRED
```

**Placement Checklist:**

- [ ] Disclaimer comes AFTER the health claim (not before)
- [ ] One per major concept (not every paragraph)
- [ ] Flows naturally with surrounding text
- [ ] Doesn't interrupt reader's thought
- [ ] Sounds like Sarah talking to a friend

**Category 7 Examples (When to Use):**

❌ "If you're taking blood pressure medication on carnivore, you might notice changes in your readings."
✅ "If you're taking blood pressure medication on carnivore, you might notice changes in your readings. If you're taking medications, you need individualized medical oversight. Work with your healthcare provider to monitor how carnivore affects your specific medications."

❌ "Many people with type 2 diabetes report improved blood sugar on carnivore."
✅ "Many people with type 2 diabetes report improved blood sugar on carnivore. If you've been diagnosed with diabetes and take medications to manage it, you need individualized medical oversight. Don't make changes without consulting your doctor—your medications may need adjustment."

---

## Validation Checklists

### Pre-Submission Checklist (Sarah's Self-Check)

- [ ] **Disclaimers Present**
  - [ ] End-of-post "Not a Doctor" statement at conclusion
  - [ ] Category 7 for any medication/diagnosis/symptom mentions
  - [ ] Other categories integrated appropriately

- [ ] **Voice Quality**
  - [ ] Disclaimers sound like Sarah (warm, evidence-based, caring)
  - [ ] No legal/robotic language
  - [ ] Flows naturally when read aloud
  - [ ] Doesn't sound overly cautious or preachy

- [ ] **Density**
  - [ ] Maximum 5-6 total disclaimers in 800-1200 word post
  - [ ] Not more than one per paragraph
  - [ ] Each relates to nearby health claim
  - [ ] Feel necessary, not excessive

- [ ] **Completeness**
  - [ ] Health claims have appropriate disclaimers
  - [ ] High-risk content (meds/diagnoses) has Category 7
  - [ ] Evidence-based sections (research) have Category 2
  - [ ] Individual variability acknowledged with Category 3

- [ ] **Format**
  - [ ] HTML file created with proper naming
  - [ ] Metadata includes author, date, title
  - [ ] Follows `/public/blog/` structure
  - [ ] No HTML errors in disclaimer sentences

- [ ] **Brand Compliance**
  - [ ] Tone matches Sarah's persona
  - [ ] Color codes correct (if visual elements)
  - [ ] Fonts correct (Playfair/Merriweather)
  - [ ] Reading level Grade 8-10

### Jordan Validation Checklist (After Submission)

#### Validator 2: Brand Voice
- [ ] End-of-post "Not a Doctor" disclaimer present
- [ ] Disclaimer matches Sarah's voice
- [ ] No legal/robotic language
- **Result:** ✅ PASS or 🔴 FAIL

#### Validator 2B: High-Risk Medical Content (NEW - PILOT TEST FOCUS)
- [ ] Content scanned for high-risk keywords
- [ ] High-risk keywords detected correctly (if present)
- [ ] Category 7 disclaimer verified present
- [ ] Disclaimer placement appropriate
- [ ] Disclaimer wording strong enough for high-risk content
- [ ] No false positives triggered
- **Result:** ✅ PASS or 🔴 FAIL

#### Other Validators (Standard)
- [ ] Validators 1, 3-11 all passing
- [ ] No rework needed due to disclaimers
- [ ] Content quality unchanged
- **Result:** ✅ ALL PASS

---

## Success Metrics

### Pilot Test Success (Target: 100% on all)

**Immediate (During Pilot):**
- ✅ Sarah writes article with all 7 disclaimer categories represented
- ✅ Disclaimers sound natural to Sarah's voice
- ✅ Validator 2B correctly detects high-risk content
- ✅ Validator 2B correctly validates present disclaimers
- ✅ All 11 validators return PASS
- ✅ No excessive disclaimer density (5-6 total)
- ✅ Sarah's self-validation success rate = 100% (caught all needed disclaimers)

**Post-Pilot (Next 3 Days):**
- ✅ Pilot article published without issues
- ✅ Reader feedback neutral/positive (no complaints about disclaimers)
- ✅ System ready for Marcus pilot (Phase 7a)
- ✅ System ready for Chloe pilot (Phase 7b)
- ✅ System ready for Casey coordination (Phase 7c)

---

## Timeline

| Phase | Task | Owner | Duration | Target Date |
|-------|------|-------|----------|-------------|
| 6.1 | Pre-flight checks | You | 30 min | 2026-01-01 |
| 6.2 | Sarah reviews guide | Sarah | 1 hour | 2026-01-01 |
| 6.3 | Sarah writes article | Sarah | 1-2 days | 2026-01-02 |
| 6.4 | Sarah self-validates | Sarah | 1 hour | 2026-01-02 |
| 6.5 | Submit to Jordan | You | 15 min | 2026-01-02 |
| 6.6 | Jordan validates | Jordan | 1-2 hours | 2026-01-02 |
| 6.7 | Evaluate results | You | 1 hour | 2026-01-02 |
| 6.8 | Refine (if needed) | Sarah | 30 min | 2026-01-02 |
| 6.9 | Approve rollout | You | 15 min | 2026-01-03 |

**Total Pilot Duration:** 2-3 days
**Expected Completion:** 2026-01-03

---

## Deploy Decision Framework

### GO (Proceed to Rollout)
- ✅ Pilot article passes all 11 validators
- ✅ Validator 2B works correctly (detects and validates)
- ✅ Disclaimers sound natural in Sarah's voice
- ✅ Sarah's self-validation success rate ≥ 95%
- ✅ No excessive disclaimer density
- ✅ Reader impact neutral/positive
- **Decision:** Proceed to Phase 7 (Marcus, Chloe, Casey pilots)

### NO-GO (Refine First)
- ❌ Pilot article fails any validator (except 2B failures are expected to fix)
- ❌ Validator 2B not detecting high-risk content correctly
- ❌ Disclaimers sound robotic/legal
- ❌ Sarah missed >20% of needed disclaimers
- ❌ Excessive disclaimer density (>7 per post)
- ❌ Reader complaints about disclaimer overload
- **Decision:** Refine system and retest (same day or next day)

### CONDITIONAL (Minor Refinement Then GO)
- ⚠️ Validator 2B keyword list missing some edge cases
- ⚠️ One category's variations could be more natural
- ⚠️ Guide needs clarification on one topic
- **Decision:** Update guide/validator based on findings, then rollout

---

## Escalation Path (If Issues Arise)

**Issue:** Validator 2B not working correctly
- **Immediate:** Don't publish article, investigate keyword detection
- **Timeline:** 1-2 hours to debug and fix
- **Escalate to:** CEO if root cause unclear

**Issue:** Disclaimers break Sarah's voice
- **Immediate:** Sarah picks different variation from guide
- **Timeline:** 30 minutes to adjust and retest
- **Escalate to:** CEO if all variations feel wrong

**Issue:** Sarah can't integrate disclaimers naturally
- **Immediate:** Pause pilot, review guide with Sarah
- **Timeline:** 1 hour coaching session
- **Escalate to:** CEO to review disclaimer system approach

---

## After Pilot Success

**Next Steps (Phase 7):**

### 7a: Marcus Pilot
- Marcus writes performance/protocol article
- Include medications or protocols with interactions
- Should naturally trigger Category 7
- Expected duration: 1-2 days
- Validation: Full 11 validators

### 7b: Chloe Pilot
- Chloe writes trending topic article
- Discuss community debates about health topics
- Should include individual variability disclaimers
- Expected duration: 1-2 days
- Validation: Full 11 validators

### 7c: Casey Coordination
- Casey validates visual elements of disclaimers
- Ensure disclaimer text is readable, formatted well
- Check colors/fonts consistent with brand
- Expected duration: 30 minutes per post

### 7d: Monitor First 12 Posts
- Track validation pass rate
- Monitor disclaimer density
- Verify voice consistency maintained
- Document any patterns or refinements needed

---

## Questions During Pilot?

**If Sarah has questions:**
- **About disclaimers:** Reference `/docs/medical-disclaimer-guide.md` (Sarah's section)
- **About her persona voice:** Review `/agents/sarah.md` signature phrases and examples
- **About Validator 2B:** Reference Validator 2B spec in `/agents/jordan.md`
- **About brand compliance:** Reference `/docs/brand-kit.md`

**If you have questions:**
- All implementation details in the comprehensive plan: `/Users/mbrew/.claude/plans/cuddly-mixing-lighthouse.md`
- All disclaimer variations documented in: `/docs/medical-disclaimer-guide.md`
- All validator specs in: `/agents/jordan.md` Validator 2B section

---

## Success Confirmation Template

Once pilot completes successfully, you can use this to confirm readiness:

```markdown
# Medical Disclaimer System - Pilot Success Confirmation

**Date:** [DATE]
**Status:** ✅ PILOT PHASE COMPLETE

## Pilot Article Details
- **Title:** [Article Title]
- **Author:** Sarah
- **Topic:** [Topic area]
- **Word Count:** [Word count]
- **File:** [File path]

## Validation Results
- ✅ Validator 1 (Copy-Editor): PASS
- ✅ Validator 2 (Brand Voice): PASS
- ✅ Validator 2B (High-Risk Content): PASS [KEY PILOT TEST]
- ✅ Validator 3-11: PASS

## Pilot Test Objectives - ACHIEVED
- ✅ Disclaimers sound natural in Sarah's voice
- ✅ Jordan Validator 2B correctly detects high-risk content
- ✅ Jordan Validator 2B correctly validates present disclaimers
- ✅ Sarah successfully self-validated before submission
- ✅ No excessive disclaimer density observed

## System Assessment
✅ **Ready for Full Rollout**

All success criteria met. Medical disclaimer integration system:
- Functions as designed
- Preserves writer voices
- Detects high-risk content appropriately
- Writers can self-validate effectively
- Ready for Marcus, Chloe, Casey implementation

## Next Phase
🚀 Proceed to Phase 7: Marcus, Chloe, Casey pilots
```

---

**Pilot Testing Guide Created:** 2026-01-01
**Status:** Ready to Execute
**All supporting documentation:** Complete ✅
