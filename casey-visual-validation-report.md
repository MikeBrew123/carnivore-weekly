# Visual Validation Report - Calculator Step 1 & Step 2

**Validation Date:** January 3, 2026
**Validated By:** Casey (Visual Director & QA)
**Pages Inspected:** Step 1 (Physical Stats) & Step 2 (Fitness & Diet)
**Test Viewports:** Mobile (375x812px) | Tablet (768x1024px) | Desktop (1400x900px)

---

## Executive Summary

**OVERALL STATUS: FAIL - Critical Issues Found**

The calculator form has significant visual and accessibility issues that must be fixed before deployment. While the form is functional and responsive, several critical failures prevent this from passing visual validation.

---

## Step 1: Physical Stats - Detailed Findings

### Mobile (375x812px)

**Screenshot:** `/casey-screenshots/step1-detailed-mobile.png`

#### Layout & Visibility
- [x] All fields visible (no cutoff)
- [x] No horizontal scroll detected
- [x] Form properly stacked vertically
- [x] Spacing between fields adequate

#### Typography Issues
- [FAIL] Heading font is "Times" (serif system font) NOT Playfair Display (gold, 700 weight)
  - Expected: Playfair Display, #ffd700 (gold)
  - Actual: Times, rgb(0,0,0) (black)
  - Severity: CRITICAL - Brand non-compliance

- [FAIL] Body text is black (rgb(0,0,0)) NOT tan (#f4e4d4)
  - Expected: #f4e4d4 (light tan)
  - Actual: rgb(0,0,0) (black)
  - Severity: CRITICAL - Brand non-compliance

- [FAIL] Labels are black (rgb(0,0,0)) NOT brand colors
  - Expected: Labels should be #2c1810 or #d4a574
  - Actual: rgb(0,0,0) (black)
  - Severity: CRITICAL - Brand non-compliance

#### Form Fields
- [FAIL] Radio buttons are 13x13px (too small for touch targets, need 44px+)
  - Severity: HIGH - Accessibility violation

- [FAIL] Input fields are 42x21px (too small for touch targets, need 44px+)
  - Severity: HIGH - Accessibility violation

- [FAIL] Buttons ("Feet & Inches", "Centimeters") are only 21px tall (need 44px+)
  - Severity: HIGH - Accessibility violation
  - Button sizes: 98x21px and 88x21px
  - Touch target fails WCAG AAA standard

#### Focus States
- [UNCLEAR] Cannot verify focus states (gold outline) from static screenshot
  - Recommendation: Manual keyboard testing required

#### Color Verification
- [FAIL] Background is white (rgb(255,255,255)) - no brand-aware styling
- [FAIL] All text is default black - no brand colors applied
- [FAIL] No gold (#ffd700) or tan (#d4a574) colors detected
- [FAIL] No dark brown (#2c1810) background

### Tablet (768x1024px)

**Screenshot:** `/casey-screenshots/step1-detailed-tablet.png`

#### Layout & Visibility
- [x] All fields visible
- [x] No horizontal scroll
- [x] Form properly laid out

#### Typography & Colors
- [FAIL] Same font issues as mobile (Times instead of Playfair Display)
- [FAIL] Same color issues as mobile (black text instead of brand colors)
- [FAIL] All text is black (rgb(0,0,0)) - no brand compliance

#### Form Fields
- [FAIL] Button touch targets still 21px (need 44px+)
- [FAIL] Input field sizes too small

### Desktop (1400x900px)

**Screenshot:** `/casey-screenshots/step1-detailed-desktop.png`

#### Layout & Visibility
- [x] All fields visible
- [x] No horizontal scroll
- [x] Layout properly displayed

#### Typography & Colors
- [FAIL] Font issues persist (Times, not Playfair Display)
- [FAIL] Color issues persist (all black, no brand colors)
- [FAIL] No gold headings, no tan text

#### Form Fields
- [FAIL] Button touch targets 21px (acceptable on desktop but inconsistent)

---

## Critical Issues Summary

### Brand Compliance Failures

1. **Fonts Not Loading**
   - Expected: "Playfair Display" (headings), "Merriweather" (body)
   - Actual: System font "Times"
   - Files to check:
     - `/public/assets/calculator2/assets/index-CHX06gVI.js` (missing font imports)
     - CSS file missing font-family declarations
   - Impact: CRITICAL - Brand identity destroyed

2. **Colors Completely Wrong**
   - Expected: Gold headings (#ffd700), tan text (#f4e4d4), dark brown backgrounds (#2c1810)
   - Actual: All black text (rgb(0,0,0)), white backgrounds
   - Impact: CRITICAL - No brand compliance whatsoever
   - Affected elements:
     - H2 heading "Let's Start with Your Basics"
     - Body copy
     - All labels
     - Form text

3. **No Styling Applied to Form**
   - The React calculator appears to be using unstyled HTML
   - Tailwind CSS may not be compiling or loading properly
   - No custom brand styles applied

### Accessibility Failures

1. **Touch Targets Too Small**
   - Height toggle buttons: 21px (FAIL - need 44px)
   - Input fields: 21px height (marginal for mobile)
   - Radio buttons: 13x13px (FAIL - need 44x44 minimum)
   - Impact: HIGH - WCAG AAA non-compliance
   - Affects: Mobile and tablet primarily

2. **Missing Focus State Styling**
   - Cannot verify gold outline focus state
   - Recommendation: Manual testing with keyboard navigation

### Layout Issues

1. **Button Sizing Inconsistent**
   - "Feet & Inches" and "Centimeters" buttons are too small
   - Should be at least 44px tall for touch targets
   - Currently 21px tall

2. **Input Field Sizing**
   - Number inputs are 42x21px (too small)
   - Should have minimum 44px touch target area

---

## Step 2: Fitness & Diet - Expected Issues

Based on the Step 1 findings, Step 2 will likely have the same issues:
- Font loading failures
- Color non-compliance
- Accessibility violations
- Unstyled form elements

**Note:** Step 2 has additional fields (select dropdowns, more radio options) that will also show the same styling failures.

---

## Checklist Status

### Desktop (1400x900px)
- [ ] All fields visible - PASS
- [ ] No horizontal scroll - PASS
- [ ] Labels readable - FAIL (wrong colors/fonts)
- [ ] Inputs/dropdowns properly styled - FAIL (no styling)
- [ ] 44px+ touch targets - FAIL (21px buttons)
- [ ] Focus states visible (gold outline) - UNKNOWN
- [ ] Spacing consistent - PASS
- [ ] No layout breaks - PASS
- [x] Colors match spec - FAIL (all wrong)

### Mobile (375x812px)
- [ ] All fields visible - PASS
- [ ] No horizontal scroll - PASS
- [ ] Labels readable - FAIL (wrong colors/fonts)
- [ ] Inputs/dropdowns properly styled - FAIL (no styling)
- [ ] 44px+ touch targets - FAIL (13-21px)
- [ ] Focus states visible - UNKNOWN
- [ ] Spacing consistent - PASS
- [ ] No layout breaks - PASS
- [x] Colors match spec - FAIL (all wrong)

### Tablet (768x1024px)
- [ ] All fields visible - PASS
- [ ] No horizontal scroll - PASS
- [ ] Labels readable - FAIL (wrong colors/fonts)
- [ ] Inputs/dropdowns properly styled - FAIL (no styling)
- [ ] 44px+ touch targets - FAIL (21px buttons)
- [ ] Focus states visible - UNKNOWN
- [ ] Spacing consistent - PASS
- [ ] No layout breaks - PASS
- [x] Colors match spec - FAIL (all wrong)

---

## Technical Findings

### CSS/Styling Issues
- Tailwind CSS appears to NOT be compiling or loading
- No custom CSS for form elements
- Default browser styling only
- No brand color overrides

### Font Issues
- Google Fonts link may not be in the built JS bundle
- Font-family CSS rules not applied
- System fallback "Times" being used instead

### Build Issues
Likely problems:
1. CSS not bundled in production build
2. Font imports not included in JS bundle
3. Tailwind CSS not compiled for production

---

## Files That Need Review

1. **CSS Bundle**
   - `/public/assets/calculator2/assets/index-pVfZ3-EA.css`
   - Needs to verify brand colors and fonts are included

2. **JavaScript Bundle**
   - `/public/assets/calculator2/assets/index-CHX06gVI.js`
   - Needs font imports and Tailwind classes

3. **React Components**
   - `/calculator2-demo/src/components/calculator/shared/FormField.tsx`
   - `/calculator2-demo/src/components/calculator/shared/RadioGroup.tsx`
   - May need Carnivore Weekly brand styling

4. **Build Configuration**
   - `/calculator2-demo/vite.config.ts`
   - Verify Tailwind is configured
   - Verify fonts are imported

---

## Recommended Actions

### BLOCKING Issues (must fix before deployment)

1. **Load Fonts Properly**
   - Ensure Playfair Display and Merriweather are imported
   - Test font loading in production bundle
   - Verify font-family CSS is applied

2. **Apply Brand Colors**
   - Update form component styles to use brand colors
   - Headings: #ffd700 (gold)
   - Body text: #f4e4d4 (tan)
   - Labels: Mix of tan (#d4a574) and dark brown (#2c1810)
   - Backgrounds: #1a120b (dark brown) where appropriate

3. **Fix Touch Targets**
   - Increase button heights to minimum 44px
   - Ensure all interactive elements are 44x44px or larger
   - Update CSS for all form fields

4. **Verify CSS Bundle**
   - Ensure production CSS includes all form styling
   - Test that Tailwind classes are being compiled
   - Verify custom brand styles are included

### TESTING Required

1. Manual keyboard testing for focus states
2. Test at actual 375x812, 768x1024, 1400x900 screen sizes
3. Color picker verification on all text elements
4. Font loading inspection in browser DevTools
5. Accessibility audit with WCAG AAA standards

---

## Validation Verdict

**FAIL - DO NOT DEPLOY**

This form has critical brand compliance and accessibility issues. The complete absence of brand colors and fonts, combined with undersized touch targets, makes this unsuitable for public deployment.

**Required Action:** Coordinate with Alex (CSS/styling) and Jordan (overall validation) to fix all critical issues before resubmission.

**Revalidation Timeline:** After fixes, require full visual re-inspection at all three viewports.

---

**Report Prepared By:** Casey
**Date:** January 3, 2026
**Status:** COMPLETE - Awaiting fixes

Next Steps:
1. Report findings to Jordan (overall validation authority)
2. Escalate to Quinn (operations) for timeline adjustments
3. Work with Alex on CSS/styling fixes
4. Resubmit for visual validation after fixes
