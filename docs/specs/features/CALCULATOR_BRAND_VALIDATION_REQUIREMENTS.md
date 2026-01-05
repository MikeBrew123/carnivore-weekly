# React Calculator Brand & Visual Validation Requirements
## Jordan QA Validation Report
**Date:** January 4, 2026
**Status:** Pre-deployment brand audit
**Validator:** Jordan (QA Authority)
**Component:** Calculator at `/calculator2-demo` (port 5173)

---

## EXECUTIVE SUMMARY

The React calculator at `/calculator2-demo` uses Tailwind CSS with a brand-color-aware index.css, BUT has critical issues preventing production deployment:

**Critical Issues Found:** 3
**High Issues Found:** 4
**Medium Issues Found:** 2

**Overall Status:** BLOCKED - Fix critical issues before deployment

---

## 1. COLOR PALETTE VALIDATION

### Brand Standard (Carnivore Weekly)
```
Background:     #F2F0E6  (Cream/Cloud Dancer)
Text (Primary): #1a120b  (Dark Brown)
Accent Gold:    #ffd700  (Gold - headings)
Accent Tan:     #d4a574  (Tan - dividers/accents)
Dark Mahogany:  #6A1B1B  (Primary accent, featured cards)
```

### Calculator Current Implementation
**File:** `/calculator2-demo/src/index.css`
```css
body {
  background-color: #F2F0E6;  ✅ CORRECT
  color: #1a120b;              ✅ CORRECT
  font-family: 'Merriweather';  ✅ CORRECT
}

h1, h2, h3, h4, h5, h6 {
  font-family: 'Playfair Display';  ✅ CORRECT
  color: #ffd700;                    ✅ CORRECT (Gold)
}
```

**Issue Found in App.tsx:**
```typescript
// Line 65, 81 - CRITICAL
<div className="min-h-screen bg-gray-50">
```

This overrides the brand background with Tailwind's `bg-gray-50` (which is #f9fafb), NOT the brand #F2F0E6.

**VERDICT:** Color palette defined correctly in index.css but OVERRIDDEN in React components.

---

## 2. FONT VALIDATION

### Required Fonts
- **Headings (H1-H6):** Playfair Display (serif, bold)
- **Body Text:** Merriweather (serif, regular)
- **No sans-serif fonts allowed**

### Current Implementation
**Font Import (index.css, line 1):**
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Merriweather:wght@400;500;700&display=swap');
```

**VERDICT:** Fonts correctly loaded. No sans-serif detected.
**Status:** PASS ✅

---

## 3. TAILWIND CSS CONFIGURATION ISSUE

**Critical Finding:** Calculator uses Tailwind CSS with custom color variables, but Tailwind config is MISSING from project.

**File Check:**
```bash
No tailwind.config.ts or tailwind.config.js found
```

**What's Missing:**
- No color palette customization in Tailwind
- Default Tailwind grays being used instead of brand palette
- Hardcoded color classes like `bg-gray-50` have no override

**This Causes:**
- Background colors using Tailwind defaults instead of brand
- Text colors using Tailwind defaults instead of brand
- Buttons using default button styles, not brand Mahogany/Tan

**Action Required:** Create `/calculator2-demo/tailwind.config.ts` with brand colors.

---

## 4. CRITICAL ISSUES - MUST FIX BEFORE DEPLOYMENT

### CRITICAL ISSUE 1: Background Color Override
**Location:** `/calculator2-demo/src/App.tsx` lines 65, 81
**Problem:** `className="min-h-screen bg-gray-50"` overrides brand background
**Current Value:** #f9fafb (Tailwind gray)
**Required Value:** #F2F0E6 (Brand cream)
**Fix:**
```typescript
// BEFORE (Line 65)
<div className="min-h-screen bg-gray-50 flex items-center justify-center">

// AFTER
<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
```

**Severity:** CRITICAL - Wrong background color visible to all users
**Assigned to:** Casey (visual) or Alex (code)
**Timeline:** 1 hour

---

### CRITICAL ISSUE 2: Missing Tailwind Configuration
**Location:** `/calculator2-demo/`
**Problem:** No tailwind.config.ts file to customize brand colors
**Current Behavior:** All Tailwind utilities use default palette, not brand colors
**Required Action:** Create tailwind.config.ts with brand color palette

**Fix - Create `/calculator2-demo/tailwind.config.ts`:**
```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-cream': '#F2F0E6',
        'brand-dark': '#1a120b',
        'brand-gold': '#ffd700',
        'brand-tan': '#d4a574',
        'brand-mahogany': '#6A1B1B',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

**Severity:** CRITICAL - All color utilities broken without this
**Assigned to:** Alex (code)
**Timeline:** 30 minutes

---

### CRITICAL ISSUE 3: PostCSS Configuration Missing
**Location:** `/calculator2-demo/`
**Problem:** No postcss.config.js to process Tailwind directives
**Required File:** `postcss.config.js`

**Fix - Create `/calculator2-demo/postcss.config.js`:**
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
```

**Severity:** CRITICAL - Tailwind CSS won't process without this
**Assigned to:** Alex (code)
**Timeline:** 5 minutes

---

## 5. HIGH-PRIORITY ISSUES

### HIGH ISSUE 1: Hardcoded Tailwind Color Classes
**Location:** Multiple files in `/calculator2-demo/src/components/`
**Problem:** Components using hardcoded Tailwind classes like:
- `bg-gray-50` (should be `bg-brand-cream`)
- `bg-gray-100` (should be custom)
- `border-gray-300` (should be brand tan)
- `text-gray-600` (should be brand colors)

**Fix:** After creating tailwind.config.ts, replace all:
- `bg-gray-*` → `bg-brand-cream`
- `text-gray-*` → `text-brand-dark`
- `border-gray-*` → `border-brand-tan`
- `border-amber-*` → `border-brand-mahogany`

**Severity:** HIGH - Visual brand inconsistency
**Assigned to:** Casey (visual validation) + Alex (implementation)
**Timeline:** 2 hours (across all components)

---

### HIGH ISSUE 2: Button Styling Not Brand Compliant
**Location:** `/calculator2-demo/src/components/ui/` (all button components)
**Problem:** Buttons likely using Tailwind defaults, not brand Mahogany (#6A1B1B)
**Required:** All CTA buttons should use brand Mahogany with proper hover states

**Expected Button Styles:**
- **Primary Button:** Background #6A1B1B, hover #8A2B2B, text #F2F0E6
- **Secondary Button:** Border #6A1B1B, text #6A1B1B, hover background transparent
- **Text Button:** Text #d4a574 (tan), hover text #ffd700 (gold)

**Fix:** Create button component with brand colors
```typescript
// src/components/ui/Button.tsx
export function ButtonPrimary({ children, ...props }) {
  return (
    <button
      className="px-6 py-3 rounded-lg font-semibold transition-colors"
      style={{
        backgroundColor: '#6A1B1B',
        color: '#F2F0E6',
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8A2B2B'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6A1B1B'}
      {...props}
    >
      {children}
    </button>
  )
}
```

**Severity:** HIGH - Brand buttons don't look like brand
**Assigned to:** Casey (design approval) + Alex (code)
**Timeline:** 1.5 hours

---

### HIGH ISSUE 3: Form Input Styling Not Brand Compliant
**Location:** `/calculator2-demo/src/components/steps/` (all form inputs)
**Problem:** Input borders/focus states likely using default Tailwind, not brand tan/gold

**Required Input Styling:**
- **Border:** #d4a574 (tan) at rest
- **Border on Focus:** #ffd700 (gold)
- **Background:** #F2F0E6 (cream)
- **Text:** #1a120b (dark)
- **Placeholder:** #666666 (muted)

**Fix:** Create form component with brand styling
```typescript
// src/components/ui/FormInput.tsx
export function FormInput({ ...props }) {
  return (
    <input
      className="w-full px-4 py-3 rounded-lg transition-colors"
      style={{
        backgroundColor: '#F2F0E6',
        color: '#1a120b',
        border: '2px solid #d4a574',
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = '#ffd700'}
      onBlur={(e) => e.currentTarget.style.borderColor = '#d4a574'}
      {...props}
    />
  )
}
```

**Severity:** HIGH - Form doesn't look like brand
**Assigned to:** Casey (design) + Alex (code)
**Timeline:** 1.5 hours

---

### HIGH ISSUE 4: Missing Navigation Header Integration
**Location:** `/calculator2-demo/src/components/calculator/`
**Problem:** Calculator doesn't integrate with main site header/navigation
**Required:** Calculator should display within site header, with:
- Logo (#F2F0E6 background)
- Navigation links to Home, Channels, Wiki, Blog, Calculator
- Matching header styling from `/public/style-2026.css`

**Current State:** Calculator runs as standalone React app, no site header visible

**Fix Options:**
1. **Option A (Recommended):** Import HeaderNav component from main site
2. **Option B:** Recreate header in calculator with brand colors

**Severity:** HIGH - User experience broken, calculator looks disconnected from site
**Assigned to:** Casey (integration) + Alex (code)
**Timeline:** 2 hours

---

## 6. MEDIUM-PRIORITY ISSUES

### MEDIUM ISSUE 1: No Dark Theme Support
**Location:** `/calculator2-demo/src/` (entire app)
**Problem:** Calculator hard-coded to light theme, no dark mode support
**Note:** Main site uses light theme (#F2F0E6), so this may be acceptable
**Recommendation:** Document that calculator is light-only

**Severity:** MEDIUM - Not urgent if site stays light-theme
**Assigned to:** Product decision
**Timeline:** Follow-up only

---

### MEDIUM ISSUE 2: Accessibility Color Contrast
**Location:** All form elements
**Problem:** Need to verify WCAG AA contrast ratios
- Text #1a120b on background #F2F0E6 = ✅ High contrast
- Placeholder text #666666 on #F2F0E6 = ⚠️ Check ratio
- Links #d4a574 on #F2F0E6 = ⚠️ Check ratio

**Action:** Run Lighthouse accessibility audit after styling fixes

**Severity:** MEDIUM - May impact accessibility score
**Assigned to:** Alex (code) + Jordan (validation)
**Timeline:** Validate after color fixes

---

## 7. VISUAL VALIDATION CHECKLIST

### Before Production Deployment, Verify:

#### Color Palette (Visual Inspection)
- [ ] Background is #F2F0E6 (cream) everywhere, never #f9fafb
- [ ] Headings (H1-H6) are #ffd700 (gold)
- [ ] Body text is #1a120b (dark brown)
- [ ] Primary buttons are #6A1B1B (mahogany)
- [ ] Input borders are #d4a574 (tan)
- [ ] Input focus is #ffd700 (gold)
- [ ] Links are #d4a574 (tan) at rest, #ffd700 on hover

#### Typography (Visual Inspection)
- [ ] All headings use Playfair Display font
- [ ] All body text uses Merriweather font
- [ ] No sans-serif fonts visible
- [ ] Font sizes consistent: H1=36px, H2=28px, H3=22px, body=18px
- [ ] Line height adequate: ≥1.6 for body text

#### Layout & Spacing
- [ ] No horizontal scroll on any viewport width
- [ ] Mobile responsive (375px width works)
- [ ] Tablet responsive (768px width works)
- [ ] Desktop responsive (1400px width works)
- [ ] Spacing consistent (20px, 40px increments)
- [ ] Generous white space (doesn't feel cramped)

#### Navigation & Integration
- [ ] Header visible with logo
- [ ] Navigation links match main site
- [ ] Footer visible with same styling
- [ ] Calculator links back to /calculator.html properly

#### Interactive Elements
- [ ] All buttons have 44px+ touch targets
- [ ] Button hover states work smoothly
- [ ] Form inputs responsive to keyboard
- [ ] Progress indicator visible and working
- [ ] "Back" button on all steps works
- [ ] All validation messages clear

#### Performance
- [ ] No console errors in Chrome DevTools
- [ ] No console warnings (except expected vendor warnings)
- [ ] Lighthouse score ≥ 90
- [ ] LCP ≤ 2.5 seconds
- [ ] CLS < 0.1
- [ ] Mobile performance ≥ 80 score

#### Brand Consistency
- [ ] Colors match /docs/BRAND_PALETTE.md
- [ ] Fonts match /docs/TYPOGRAPHY_GUIDE.md
- [ ] Spacing matches /docs/SPACING_SYSTEM.md
- [ ] Button styles match /docs/COMPONENTS.md
- [ ] Layout matches main site structure

---

## 8. VALIDATION APPROACH (Playwright Script)

To validate the calculator before deployment, use:

```bash
cd /Users/mbrew/Developer/carnivore-weekly/calculator2-demo
npm install  # Ensure dependencies installed
npm run dev  # Start dev server on port 5173

# In another terminal, run validation:
node validate-robust.mjs  # Uses Playwright to capture screenshots
```

This will:
- Take screenshots of each form step
- Verify colors using pixel inspection
- Check font rendering
- Validate layout responsiveness
- Generate comparison report

**Required Screenshots:**
- Step 1: Physical Stats form (375px mobile, 1400px desktop)
- Step 2: Fitness & Diet form (375px mobile, 1400px desktop)
- Step 3: Free Results page (375px mobile, 1400px desktop)
- Mobile view: Verify no horizontal scroll

---

## 9. FILES THAT NEED CHANGES

### Create New Files:
1. `/calculator2-demo/tailwind.config.ts` - Brand color palette
2. `/calculator2-demo/postcss.config.js` - CSS processing config
3. `/calculator2-demo/src/components/ui/BrandButton.tsx` - Brand-compliant buttons
4. `/calculator2-demo/src/components/ui/BrandInput.tsx` - Brand-compliant form inputs
5. `/calculator2-demo/src/components/BrandHeader.tsx` - Navigation header

### Modify Existing Files:
1. `/calculator2-demo/src/App.tsx` - Remove bg-gray-50, use brand background
2. `/calculator2-demo/src/index.css` - Add Tailwind utilities layer with brand colors
3. All component files in `/calculator2-demo/src/components/` - Replace gray with brand colors

---

## 10. SUMMARY TABLE: Issues by Priority

| Priority | Count | Examples | Timeline |
|----------|-------|----------|----------|
| CRITICAL | 3 | Background override, missing Tailwind config, missing PostCSS config | 2.5 hours |
| HIGH | 4 | Color classes, button styling, input styling, no header | 7 hours |
| MEDIUM | 2 | Dark theme (optional), accessibility contrast check | 3 hours |
| **TOTAL** | **9** | | **~12.5 hours** |

---

## 11. DEPLOYMENT DECISION

**VERDICT: BLOCKED FOR PRODUCTION**

**Reasons:**
1. Critical background color issue visible on every page
2. Missing Tailwind/PostCSS configuration prevents proper styling
3. Buttons don't match brand
4. Form inputs don't match brand
5. No header navigation integration

**Cannot deploy until:**
- [ ] All 3 CRITICAL issues fixed
- [ ] All 4 HIGH issues fixed
- [ ] Visual validation PASS using Playwright
- [ ] Jordan re-validates with signed report

**Estimated fix time:** 2-3 days (assuming parallel work)

---

## 12. NEXT STEPS (Recommended Order)

**Phase 1 - Critical Infrastructure (30 min):**
1. Create tailwind.config.ts with brand palette
2. Create postcss.config.js
3. Update index.css with Tailwind @layer utilities

**Phase 2 - Component Refactoring (4 hours):**
1. Create BrandButton.tsx with Mahogany styling
2. Create BrandInput.tsx with tan/gold styling
3. Update App.tsx to remove bg-gray-50
4. Replace all gray color classes in components

**Phase 3 - Integration (2 hours):**
1. Create BrandHeader.tsx matching main site
2. Integrate header into CalculatorApp
3. Test navigation links

**Phase 4 - Validation (1 hour):**
1. Run Playwright validation script
2. Check all 11 validators
3. Generate final report

**Phase 5 - Deployment:**
1. Jordan signs off on validation
2. Deploy to production
3. Test on live site

---

## Contact & Questions

**For color palette questions:** Refer to `/docs/BRAND_PALETTE.md`
**For typography questions:** Refer to `/docs/TYPOGRAPHY_GUIDE.md`
**For Tailwind configuration:** Contact Alex (code expert)
**For visual approval:** Contact Casey (visual validator)
**For final deployment:** Contact Jordan (QA authority)

---

**Validated by:** Jordan (QA Authority)
**Date:** January 4, 2026
**Status:** BLOCKED - Critical issues must be fixed
**Next Review:** After all critical issues resolved + Playwright validation PASS
