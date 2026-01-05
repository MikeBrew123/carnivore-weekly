# Height Field Validation Index
**Project:** Carnivore Weekly Calculator
**Component:** Height Field with Feet/Inches OR Centimeters Toggle
**Validator:** Casey (Visual Director & QA)
**Date:** January 3, 2026
**Status:** PENDING IMPLEMENTATION

---

## Quick Status

**FINDING:** Height field not yet implemented in test file
**BLOCKING:** Cannot proceed with visual validation
**NEXT:** Alex must implement Height field
**TIMELINE:** Once implemented, validation takes 1-2 hours

---

## For Alex (Developer) - Start Here

### Step 1: Understand Requirements
- Read: `/docs/specs/height-field-implementation-spec.md` (complete specification)
- Quick ref: `/ALEX-HEIGHT-FIELD-QUICK-REFERENCE.md` (copy-paste ready code)

### Step 2: Implement Height Field
- Target file: `/public/calculator-form-rebuild.html`
- Location: After Age field (around line 385)
- Copy HTML template from quick reference
- Add JavaScript toggle from quick reference
- Optional: Add CSS for side-by-side layout on desktop

### Step 3: Test Before Submission
- Test at breakpoints: 375px, 768px, 1400px
- Verify colors with browser color picker
- Test keyboard navigation (Tab key)
- Verify focus outlines visible
- Take screenshots of both modes

### Step 4: Submit to Casey
Files to provide:
- Updated calculator-form-rebuild.html
- Screenshot: Desktop (1400px) - Feet & Inches mode
- Screenshot: Desktop (1400px) - Centimeters mode
- Screenshot: Mobile (375px) - both modes
- Color verification (color picker values)

### Key Requirements
- Input IDs: heightFeet, heightInches, heightCm (exact, case-sensitive)
- Feet range: 3-8
- Inches range: 0-11
- Centimeters range: 100-250
- Default: Imperial mode (Feet & Inches)
- Styling: Copy patterns from Age field above

---

## For Casey (QA) - Validation Checklist

### Ready to Validate When Alex Submits

**Desktop (1400x900px):**
- [ ] Legend "Height" in gold (#ffd700), 18px
- [ ] Radio buttons visible and styled
- [ ] Feet/Inches: Two inputs side-by-side
- [ ] Centimeters: Single input after toggle
- [ ] Both inputs 44px+ height with tan borders (#d4a574)
- [ ] Colors exact (use color picker)
- [ ] Fonts correct (Merriweather, not system font)
- [ ] Spacing consistent with Age field

**Mobile (375x812px):**
- [ ] Full-width layout maintained
- [ ] No horizontal scroll
- [ ] Inputs stack vertically
- [ ] Touch targets 44px+
- [ ] Text readable without zooming
- [ ] Radio buttons easily clickable

**Accessibility:**
- [ ] Focus visible on all elements
- [ ] Tab order correct (Age → Height toggle → Feet/Inches)
- [ ] Color contrast 4.5:1+
- [ ] Labels associated with inputs
- [ ] Keyboard navigation works

**Decision:**
- PASS: Approve for Weight field implementation
- FAIL: List specific issues for Alex to fix

See: `/docs/validation-reports/height-field-validation-2025-01-03.md` for full checklist

---

## For Jordan (Validator) - Decision Framework

**Casey will provide:**
- Visual validation report with screenshots
- Comparison to brand style guide
- Accessibility assessment
- Recommendation: PASS or FAIL

**Your decision options:**
1. **PASS** - Approve Height field, allow Weight field implementation to begin
2. **FAIL** - Request specific fixes from Alex, re-validate once fixed

**Timeline:** Validation 1-2 hours after Alex's submission

---

## For Quinn (Operations) - Status Update

**Current Blocker:** Height field implementation
**Waiting For:** Alex's submission
**ETA:** Once submitted, decision within 1-2 hours
**Priority:** Required before subsequent calculator fields

**Dependencies:**
- Height field blocks Weight field implementation
- Weight field blocks complete calculator flow
- Complete calculator needed for payment modal testing

---

## Documentation Structure

### For Implementation (Alex)
| File | Purpose | Size |
|------|---------|------|
| `/ALEX-HEIGHT-FIELD-QUICK-REFERENCE.md` | Copy-paste ready code | 7.2 KB |
| `/docs/specs/height-field-implementation-spec.md` | Detailed specification | 11 KB |

### For Validation (Casey)
| File | Purpose | Size |
|------|---------|------|
| `/docs/validation-reports/height-field-validation-2025-01-03.md` | Validation checklist | 6.8 KB |
| This file | Validation index | This |

### For Team (Everyone)
| File | Purpose | Size |
|------|---------|------|
| `/VALIDATION-FINDINGS.md` | Executive summary | 5.7 KB |
| `/HEIGHT-FIELD-VALIDATION-INDEX.md` | This index | This |

---

## Test File Details

**File:** `/Users/mbrew/Developer/carnivore-weekly/public/calculator-form-rebuild.html`

**Current Contents:**
- Lines 1-9: DOCTYPE, head, font imports, style tag
- Lines 10-349: CSS styles (all colors and typography defined here)
- Lines 352-386: Form HTML
  - Lines 360-370: Sex field (radio buttons)
  - Lines 372-385: Age field (number input)
  - **Lines 386+: Height field goes HERE**

**Styling Already Defined:**
- Fieldset styles (lines 120-137)
- Legend styles (lines 139-163)
- Radio option styles (lines 165-242)
- Input wrapper styles (lines 244-348)

Just use these existing classes: `fieldset`, `legend`, `radio-option`, `input-wrapper`

---

## Validation Workflow

### Step 1: Preparation (Done)
Casey analyzed requirements and created:
- Implementation guide for Alex
- Validation checklist
- Reference documentation

### Step 2: Implementation (In Progress)
Alex will:
- Implement Height field using template
- Test at all breakpoints
- Verify colors and accessibility
- Submit to Casey

### Step 3: Validation (Pending)
Casey will:
- Take screenshots (desktop, mobile, both modes)
- Verify colors with color picker
- Test accessibility and keyboard navigation
- Compare to brand guide
- Issue PASS or FAIL decision

### Step 4: Decision (Pending)
Jordan will:
- Review Casey's validation report
- Approve or request fixes
- Allow next field implementation

---

## Key Technical Requirements

### Input IDs (Must be exact)
```
heightFeet    (NOT: height_feet, heightfeet, heightFeet_input)
heightInches  (NOT: height_inches, heightinches, heightInches_input)
heightCm      (NOT: height_cm, heightcm, heightCm_input)
```

### Radio Button Names
```
heightUnit (with values: "imperial" or "metric")
```

### CSS Classes (Already defined in file)
```
fieldset, legend, radio-option, input-wrapper
```

### Colors (From brand guide)
```
#ffd700 (gold) - legend, labels
#d4a574 (tan) - borders, accents
#2c1810 (dark brown) - text
#ffffff (white) - backgrounds
```

### Typography (From brand guide)
```
Merriweather font
18px for labels
18px for input text
700 weight for labels
600 weight for legend
```

---

## Reference Files

| File | Contains | Use |
|------|----------|-----|
| `/public/calculator-form-rebuild.html` | Target HTML file | Implementation target |
| `/test-calculator-flow.js` | Test suite | Line 109-122 shows requirements |
| `/docs/style-guide.md` | Brand colors & typography | Color verification |
| `/ALEX-HEIGHT-FIELD-QUICK-REFERENCE.md` | Copy-paste code | Quick implementation |
| `/docs/specs/height-field-implementation-spec.md` | Full specification | Complete guide |
| `/docs/validation-reports/height-field-validation-2025-01-03.md` | Validation checklist | Validation reference |
| `/VALIDATION-FINDINGS.md` | Findings summary | Executive overview |

---

## Timeline

| When | Who | What |
|------|-----|------|
| Now | Casey | Created specification and validation docs |
| Today | Alex | Implement Height field |
| Today | Alex | Test and submit to Casey |
| 1-2h later | Casey | Visual validation and testing |
| Same day | Casey | Report decision to Jordan |
| Next day | Jordan | Approve or request fixes |
| After approval | Alex | Begin Weight field implementation |

---

## Contact & Escalation

**For Implementation Questions:** Alex → Casey or Jordan
**For Validation Blockers:** Casey → Quinn (escalate)
**For Design Decisions:** Casey → CEO (weekly check-in)
**For Validation Issues:** Jordan → Casey
**For Status Updates:** Quinn (receives daily/weekly reports)

---

## Success Criteria

**Implementation Success:**
- All HTML elements present with correct IDs
- Radio toggle works (switches between modes)
- Both imperial and metric inputs visible (never both at once)
- Styling matches existing Age field
- No console errors
- Colors verified correct

**Validation Success:**
- Desktop (1400px): Perfect layout, colors, styling
- Mobile (375px): Full-width, no scroll, readable
- Tablet (768px): Responsive proportions
- Accessibility: WCAG AA compliant
- Colors: Exact match to brand guide
- Fonts: Merriweather loaded (not fallback)
- Overall: Consistent with form design

**Team Success:**
- Alex: Implements correctly on first try
- Casey: Validates within 2 hours of submission
- Jordan: Issues PASS decision same day
- Project: Unblocked to implement Weight field

---

## Notes & Assumptions

1. **Height field is a blocker** for Weight field and subsequent fields
2. **Test suite expects exact ID names** (case-sensitive)
3. **Imperial mode is default** (Feet & Inches selected by default)
4. **Styling already exists** (just use existing CSS classes)
5. **JavaScript is required** for toggle functionality
6. **Responsive design is critical** (no horizontal scroll on mobile)
7. **Accessibility is mandatory** (WCAG AA required)
8. **Colors must be exact** (verified with color picker)

---

## Version History

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-03 | Initial creation | Height field validation required |
| — | — | — |

---

## Document Usage

**For Quick Start:**
- Alex → Read `/ALEX-HEIGHT-FIELD-QUICK-REFERENCE.md`
- Casey → Review `/docs/validation-reports/height-field-validation-2025-01-03.md`
- Everyone → Skim `/VALIDATION-FINDINGS.md`

**For Complete Details:**
- Alex → Read `/docs/specs/height-field-implementation-spec.md`
- Casey → Use `/docs/validation-reports/height-field-validation-2025-01-03.md` as checklist
- Jordan → Wait for Casey's report

**For Project Context:**
- All → Read this file for overview and timeline
- All → Check `/HEIGHT-FIELD-VALIDATION-INDEX.md` for file locations

---

**Document Version:** 1.0
**Created:** January 3, 2026
**By:** Casey (Visual Director & QA)
**Status:** Ready for Implementation
**Next Update:** When Height field is submitted for validation

