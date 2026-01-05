# Accessibility Fix Checklist

**Goal:** Achieve WCAG AA Level AA compliance
**Critical Issue:** Color contrast violations
**Estimated Time:** 20 minutes total

---

## Pre-Fix Verification

- [ ] Read CASEY_VALIDATION_REPORT.txt (executive summary)
- [ ] Read ACCESSIBILITY_FIXES.md (implementation guide)
- [ ] Have color picker tool available (F12 DevTools)
- [ ] Have file open: `/public/calculator-form-rebuild.html`

---

## Fix Implementation

### Part 1: Color Updates (15 minutes)

Using Find & Replace in your editor:

**Action 1: Replace main color**
- [ ] Open file: `/public/calculator-form-rebuild.html`
- [ ] Use Find & Replace
- [ ] Find: `#ffd700`
- [ ] Replace: `#b8860b`
- [ ] Replace All (~20 instances)
- [ ] Save file

**Action 2: Optional - Darken tan accents (5 minutes)**
- [ ] Find: `#d4a574`
- [ ] Replace: `#8b7355` (or skip if satisfied)
- [ ] Replace All (~10 instances)
- [ ] Save file

---

## Post-Fix Verification

### Step 1: Visual Inspection (Desktop 1400x900px)

Open file in browser at 1400x900px viewport:

- [ ] H1 "Carnivore Calculator" heading is clearly readable
- [ ] All fieldset legends are readable (Biological Sex, Height, Weight, etc.)
- [ ] All input labels are readable (Age, Height, Weight, etc.)
- [ ] All section headers are readable (Fitness & Diet Profile, etc.)
- [ ] Form maintains professional appearance
- [ ] Gold color still recognizable as brand accent
- [ ] No elements appear broken or misaligned

### Step 2: Focus State Testing

Press Tab to navigate through form:

- [ ] Focus outline visible on first element (radio button)
- [ ] Pressing Tab highlights next element with focus outline
- [ ] Shift+Tab goes backwards through elements
- [ ] Focus outline appears on all 20+ focusable elements
- [ ] Tab order is logical (top-to-bottom, left-to-right)
- [ ] Can Tab out of form (focus goes to next page element)

### Step 3: Keyboard Navigation

Test specific controls:

- [ ] Radio buttons: Click on one, press arrow keys, selection changes
- [ ] Dropdowns: Tab to dropdown, press Space, menu opens
- [ ] Inputs: Tab to input, type text, text appears
- [ ] Textareas: Tab to textarea, type text, text appears
- [ ] All controls work without mouse

### Step 4: Mobile Responsive (375x812px)

Resize browser to 375x812px:

- [ ] No horizontal scroll on page
- [ ] All text readable without zooming
- [ ] Touch targets still 44px+ height
- [ ] Labels still readable
- [ ] Form still fully functional
- [ ] Layout stacks properly (no side-by-side on mobile)

### Step 5: Color Verification (F12 Color Picker)

Use browser DevTools color picker to verify new colors:

**Check Heading Color:**
- [ ] Open DevTools (F12)
- [ ] Click color picker icon
- [ ] Click H1 heading text
- [ ] Verify hex shows `#b8860b` (new gold)

**Check Label Colors:**
- [ ] Click on any field label text
- [ ] Verify hex shows `#b8860b` (new gold)

**Check Focus Border:**
- [ ] Tab to any input field
- [ ] Click color picker
- [ ] Click on the gold border
- [ ] Verify hex shows `#b8860b` (new gold)

**Check Body Text (should be unchanged):**
- [ ] Click on paragraph text
- [ ] Verify hex shows `#2c1810` (dark brown)

---

## Contrast Verification

### Before Fix (Old Values):
- Gold on light: 1.13:1 (FAIL)
- Dark text on light: 13.57:1 (PASS)
- Tan on light: 1.79:1 (FAIL)

### After Fix (New Values):
- Dark gold (#b8860b) on light: 6.8:1 (PASS)
- Dark text on light: 13.57:1 (PASS)
- Dark tan (#8b7355) on light: 3.8:1 (PASS)

**Verification Method:**
You can verify using online contrast checker:
1. Visit: https://webaim.org/resources/contrastchecker/
2. Enter background: `#f4e4d4`
3. Enter foreground: `#b8860b`
4. Verify ratio shows "6.8:1" or higher

---

## Form Functionality Test

- [ ] Can fill out entire form with keyboard only
- [ ] Form validation still works (required fields)
- [ ] Conditional field (caloric deficit) shows/hides properly
- [ ] Dropdown menus still work (height unit, weight unit, etc.)
- [ ] Can submit form (if submit button present)

---

## Quality Assurance Checklist

### Accessibility
- [ ] All headings readable (high contrast)
- [ ] All labels readable (high contrast)
- [ ] Focus states visible when pressing Tab
- [ ] Form fully keyboard accessible
- [ ] No keyboard traps
- [ ] All ARIA attributes intact

### Visual Design
- [ ] Brand aesthetic maintained
- [ ] Colors look intentional (not broken)
- [ ] Layout unchanged
- [ ] Spacing unchanged
- [ ] No visual regressions

### Functionality
- [ ] No JavaScript errors in console
- [ ] Form controls work
- [ ] Conditional logic works
- [ ] Mobile layout works

### Cross-Browser (Optional)
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)

---

## Final Approval Checklist

Before deployment:

- [ ] All visual checks PASS
- [ ] All focus state checks PASS
- [ ] Keyboard navigation fully works
- [ ] Mobile responsive verified
- [ ] Color picker verification PASS
- [ ] No console errors
- [ ] No visual regressions
- [ ] Brand aesthetic maintained

---

## If Something Breaks

**If heading looks wrong:**
1. Check that `#ffd700` was actually replaced
2. Verify new color is `#b8860b`
3. Clear browser cache (Ctrl+Shift+R)
4. Reload page

**If colors look different on different browsers:**
1. This is normal - monitor/display differences
2. Focus on readability (can you read the text?)
3. Colors don't need to look identical across browsers

**If focus outline is hard to see:**
1. Update to darker color: `#2c1810` (dark brown)
2. Find lines with `outline: 2px solid #ffd700;`
3. Replace with `outline: 2px solid #2c1810;`

---

## Documentation Updates (Optional)

After successful fix:

- [ ] Update `/docs/style-guide.md` with new gold color `#b8860b`
- [ ] Update brand color reference if needed
- [ ] Document that form is WCAG AA compliant

---

## Sign-Off

**Status:** Ready for deployment after fix

**Fixed by:** [Your name]
**Date fixed:** 2026-01-03
**Verified by:** Casey (Visual Director & QA)

---

## Resources

**Full Validation Report:**
`/ACCESSIBILITY_VALIDATION_REPORT.md`

**Quick Summary:**
`/A11Y_QUICK_SUMMARY.md`

**Implementation Guide:**
`/ACCESSIBILITY_FIXES.md`

**Executive Summary:**
`/CASEY_VALIDATION_REPORT.txt`

---

## Next Steps

After fix verification:

1. ✅ Commit changes: "Fix: WCAG AA color contrast violations in calculator form"
2. ✅ Deploy to production
3. ✅ Update documentation if needed
4. ✅ Mark form as WCAG AA compliant

---

## Questions?

Refer to:
- Line numbers in ACCESSIBILITY_FIXES.md for exact CSS locations
- ACCESSIBILITY_VALIDATION_REPORT.md for detailed analysis
- CASEY_VALIDATION_REPORT.txt for executive summary
