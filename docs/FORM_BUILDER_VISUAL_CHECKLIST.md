# Calculator Form Builder - Visual Checklist for Alex

**Quick Reference for Form Development**
**Use this while building each step**
**Created by:** Casey (Visual QA)
**Date:** January 3, 2026

---

## BEFORE YOU START EACH STEP

1. **Read** `/docs/FORM_VISUAL_STANDARDS.md` (full standards)
2. **Check baseline** in `/agents/visual_baselines/` (know the target)
3. **Review the checklist below** (during development)
4. **Take screenshots** at end of step (before submitting to Casey)

---

## VIEWPORT SIZES (For Testing & Screenshots)

**Keep these bookmarked:**
```
Desktop: 1400x900px
Tablet: 768x1024px
Mobile: 375x812px
```

**How to test:**
1. Open DevTools (F12)
2. Click device toolbar (Ctrl+Shift+M)
3. Set exact dimensions above
4. Test responsive behavior

---

## COLOR REFERENCE (Copy-Paste to CSS)

```css
/* Backgrounds */
--bg-dark: #1a120b;        /* Page background */
--bg-brown: #2c1810;       /* Input fields */

/* Text Colors */
--text-light: #f4e4d4;     /* Labels, input text */
--text-tan: #d4a574;       /* Secondary headings, helpers */
--text-gold: #ffd700;      /* Main title */

/* Borders & Accents */
--border: #8b4513;         /* Input borders, dividers */

/* Status */
--error: #ff6b6b;          /* Error messages */
```

---

## TYPOGRAPHY QUICK REFERENCE

### Font Import (Required)
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Merriweather:wght@400;700&display=swap');
```

### Font Sizes (Minimum)
| Element | Font | Size | Weight | Example |
|---------|------|------|--------|---------|
| **Form Title** | Playfair | 36-48px | bold | "Calculator" |
| **Step Headers** | Playfair | 24-28px | bold | "Step 1: Enter Age" |
| **Labels** | Merriweather | 18-20px | bold | "Your Age" |
| **Input Text** | Merriweather | 16-18px | normal | text inside input |
| **Helper Text** | Merriweather | 14-16px | normal | "Enter your age..." |

**Critical:** Labels must be 18px+ on desktop for readability.

---

## STEP-BY-STEP VISUAL CHECKLIST

### Step 1: Container

**Visual Requirements:**
- [ ] Max-width: 600px
- [ ] Padding: 40px (desktop), 20px (mobile)
- [ ] Background: #1a120b
- [ ] Centered horizontally
- [ ] No horizontal scroll on mobile (375px)

**Colors (use color picker F12):**
- [ ] Background: #1a120b (RGB 26, 18, 11)

**Testing:**
- [ ] Open at 1400x900px - looks centered ✓
- [ ] Open at 375x812px - no scroll, full width ✓
- [ ] Open at 768x1024px - responsive ✓

**Screenshots:**
```bash
npx playwright screenshot --viewport-size=1400,900 http://localhost:3000/form step1-desktop.png
npx playwright screenshot --viewport-size=375,812 http://localhost:3000/form step1-mobile.png
npx playwright screenshot --viewport-size=768,1024 http://localhost:3000/form step1-tablet.png
```

---

### Step 2: Form Title + Step Indicator

**Visual Requirements:**

**Form Title (H1):**
- [ ] Font: Playfair Display, bold, 48px (desktop), 36px (mobile)
- [ ] Color: #ffd700 (gold) - verify with color picker
- [ ] Margin-bottom: 20-24px
- [ ] Centered or left-aligned consistently

**Step Indicator:**
- [ ] 6 circles representing steps
- [ ] Active step: #ffd700 (filled gold circle)
- [ ] Inactive steps: #8b4513 (outlined brown)
- [ ] Completed: #d4a574 (filled tan)
- [ ] Circle size: 24-32px diameter
- [ ] Gap between circles: 8-12px
- [ ] Connecting line: 2px solid #8b4513 (optional but nice)
- [ ] Responsive: Single row desktop, stack on mobile if needed

**Colors (use color picker):**
- [ ] H1: #ffd700 (RGB 255, 215, 0)
- [ ] Active circle: #ffd700
- [ ] Inactive circle: #8b4513 (RGB 139, 69, 19)

**Fonts:**
- [ ] Title: Playfair Display (not system font)
- [ ] Title: bold weight (700)

**Testing:**
- [ ] At 1400x900px: Title and circles visible, not cramped
- [ ] At 375x812px: Title readable, circles don't overflow
- [ ] At 768x1024px: Proportional spacing

**Screenshots:**
```bash
npx playwright screenshot --viewport-size=1400,900 http://localhost:3000/form step2-desktop.png
npx playwright screenshot --viewport-size=375,812 http://localhost:3000/form step2-mobile.png
npx playwright screenshot --viewport-size=768,1024 http://localhost:3000/form step2-tablet.png
```

**Accessibility:**
- [ ] Step circles are visual only (no keyboard interaction yet)
- [ ] Title is semantic H1

---

### Step 3: Single Input Field

**Visual Requirements:**

**Label:**
- [ ] Font: Merriweather, bold, 18-20px (minimum)
- [ ] Color: #f4e4d4 (light tan)
- [ ] Margin-bottom: 8-12px (gap to input)
- [ ] Associated with input via `<label for="...">` or within container

**Input Field:**
- [ ] Height: 44-50px minimum (touch-friendly)
- [ ] Width: 100% of parent (minus padding)
- [ ] Padding: 12-16px (left/right), 12px (top/bottom)
- [ ] Border: 2px solid #8b4513
- [ ] Border-radius: 4px
- [ ] Background: #2c1810
- [ ] Text color: #f4e4d4
- [ ] Font: Merriweather, 16-18px
- [ ] Margin-bottom: 20-24px (space to next element)

**Focus State:**
- [ ] Border color changes to #ffd700 (gold)
- [ ] Outline: 2px solid #ffd700
- [ ] Box-shadow: optional, 0 0 8px rgba(255,215,0,0.2)
- [ ] Focus visible on Tab key (keyboard navigation)

**Colors (use color picker):**
- [ ] Label: #f4e4d4 (RGB 244, 228, 212)
- [ ] Input bg: #2c1810 (RGB 44, 24, 16)
- [ ] Input border: #8b4513 (RGB 139, 69, 19)
- [ ] Input text: #f4e4d4
- [ ] Focus border: #ffd700

**Fonts:**
- [ ] Label: Merriweather bold (not system font)
- [ ] Input: Merriweather regular (not system font)

**Accessibility:**
- [ ] Label is associated with input (id + for attribute)
- [ ] Focus outline is visible (min 2px)
- [ ] Contrast label-to-background passes 4.5:1
- [ ] Input height is 44px+ (touch target)
- [ ] Tab order works (tab to input, focus visible)

**Testing:**
- [ ] At 1400x900px: Input full width, readable
- [ ] At 375x812px: Input full width minus padding, no scroll
- [ ] At 768x1024px: Proportional
- [ ] Click input: Focus state visible
- [ ] Tab to input: Focus outline shows
- [ ] Type text: Text appears in #f4e4d4 color

**Screenshots:**
```bash
npx playwright screenshot --viewport-size=1400,900 http://localhost:3000/form step3-desktop.png
npx playwright screenshot --viewport-size=375,812 http://localhost:3000/form step3-mobile.png
npx playwright screenshot --viewport-size=768,1024 http://localhost:3000/form step3-tablet.png
```

---

### Steps 4, 5, 6: Multiple Fields & Button

**For each additional field:**

**Each Input Field Must Have:**
- [ ] Label: 18-20px Merriweather bold, #f4e4d4
- [ ] Input: 44px+ height, 2px #8b4513 border, #2c1810 background
- [ ] Text: #f4e4d4, Merriweather 16-18px
- [ ] Focus: Gold (#ffd700) border + outline
- [ ] Gap above: 20-24px (consistent vertical spacing)

**Spacing Between Inputs:**
- [ ] Label to input: 8-12px
- [ ] Input to next label: 20-24px
- [ ] All gaps consistent (no random spacing)

**Primary Button (Next Step / Submit):**
- [ ] Height: 50-56px minimum
- [ ] Width: Full container width minus padding
- [ ] Padding: 16px horizontal, 12px vertical
- [ ] Background: #8b4513
- [ ] Text: #f4e4d4, Merriweather 16-18px bold
- [ ] Border: None (background color only)
- [ ] Border-radius: 4px
- [ ] Cursor: pointer
- [ ] Margin-top: 32-40px (gap from last input)

**Button States:**
- [ ] Default: #8b4513 background, #f4e4d4 text
- [ ] Hover: #d4a574 background, #1a120b text, scale(1.02)
- [ ] Active: #ffd700 background, #1a120b text
- [ ] Disabled: #555555 background, opacity 0.5, cursor: not-allowed

**Colors (use color picker):**
- [ ] All labels: #f4e4d4
- [ ] All inputs bg: #2c1810
- [ ] All inputs border: #8b4513
- [ ] All inputs text: #f4e4d4
- [ ] Button: #8b4513
- [ ] Button hover: #d4a574

**Fonts:**
- [ ] All labels: Merriweather bold
- [ ] All inputs: Merriweather regular
- [ ] Button: Merriweather bold

**Accessibility:**
- [ ] All inputs have associated labels
- [ ] Focus states visible on all inputs
- [ ] Button focusable (tab + enter)
- [ ] All touch targets 44px+
- [ ] Tab order logical (top to bottom)

**Responsive Testing:**
- [ ] At 1400x900px: All fields visible, good spacing
- [ ] At 375x812px: Fields stack, no scroll, button full width
- [ ] At 768x1024px: Responsive, proportional spacing

**Screenshots (for each step):**
```bash
npx playwright screenshot --viewport-size=1400,900 http://localhost:3000/form step[N]-desktop.png
npx playwright screenshot --viewport-size=375,812 http://localhost:3000/form step[N]-mobile.png
npx playwright screenshot --viewport-size=768,1024 http://localhost:3000/form step[N]-tablet.png
```

---

## DESKTOP (1400x900px) VISUAL CHECKLIST

Use this to verify BEFORE screenshots:

- [ ] Form container centered, max 600px wide
- [ ] Form title visible (gold, large)
- [ ] Step indicator shows all 6 steps
- [ ] Labels readable (18px+, not cramped)
- [ ] Inputs properly spaced (20-24px gaps)
- [ ] Input heights are 44px+
- [ ] Button at bottom, full width
- [ ] No horizontal scroll
- [ ] Colors accurate (use color picker)
- [ ] Fonts rendering (Playfair + Merriweather, not system)
- [ ] Spacing consistent (no random margins)
- [ ] All elements aligned left/center consistently

---

## MOBILE (375x812px) VISUAL CHECKLIST

Use this to verify BEFORE screenshots:

- [ ] Form takes full width (375px exactly)
- [ ] No horizontal scroll (CRITICAL)
- [ ] Title readable (36px+)
- [ ] Labels readable (18px+)
- [ ] Inputs full width minus padding
- [ ] Inputs are 44px+ height
- [ ] Gap between inputs: 20-24px
- [ ] Button full width
- [ ] Button height 50px+
- [ ] All touch targets 44x44px+
- [ ] Text readable without zooming
- [ ] Colors accurate
- [ ] Fonts loading (not system fonts)
- [ ] No cramped or overlapping elements

---

## TABLET (768x1024px) VISUAL CHECKLIST

Use this to verify BEFORE screenshots:

- [ ] Form responsive (not squeezed)
- [ ] Max-width applied appropriately
- [ ] Spacing proportional to desktop
- [ ] No horizontal scroll
- [ ] Labels readable
- [ ] Inputs properly sized
- [ ] Button accessible
- [ ] Touch targets adequate

---

## COLOR VALIDATION PROCESS

**Every step, verify colors with browser:**

1. Open page in Chrome/Firefox
2. Press F12 (DevTools)
3. Click element inspector (top left)
4. Click on element you want to check
5. In Styles tab, find color property
6. Click on the color swatch (square)
7. Read the hex value
8. Compare to table below

**Color Checklist (Sample):**
- [ ] Form background: #1a120b
- [ ] H1 title: #ffd700
- [ ] Label text: #f4e4d4
- [ ] Input background: #2c1810
- [ ] Input border: #8b4513
- [ ] Input text: #f4e4d4
- [ ] Button: #8b4513
- [ ] Helper text: #d4a574

**If color doesn't match:**
- Copy exact hex from color table above
- Paste into CSS
- Verify in browser again

---

## FONT VALIDATION PROCESS

**Every step, verify fonts are loading:**

1. Open page in browser
2. Press F12 (DevTools)
3. Go to Network tab
4. Reload page
5. Look for "fonts.googleapis.com"
6. Verify successful (200 status)
7. Click element inspector
8. Click on text
9. In Styles tab, look for font-family
10. Should show: "Playfair Display" or "Merriweather"
11. NOT: "Arial", "Helvetica", "Georgia" (fallbacks are OK during load)

**If fonts not loading:**
- Check CSS import at top of file
- Verify Google Fonts URL is correct
- Clear browser cache (Ctrl+Shift+Del)
- Hard reload (Ctrl+F5)

---

## RESPONSIVE TESTING PROCESS

**Test at 3 breakpoints:**

### Desktop (1400x900px)
```
1. DevTools (F12)
2. Device Toolbar (Ctrl+Shift+M)
3. Set to 1400x900
4. Check layout looks good
5. Verify no scroll
```

### Tablet (768x1024px)
```
1. Same as above
2. Set to 768x1024
3. Check responsive
4. Verify spacing proportional
```

### Mobile (375x812px)
```
1. Same as above
2. Set to 375x812
3. CRITICAL: Verify NO horizontal scroll
4. Check text readable
5. Check buttons big enough
```

**If horizontal scroll appears on mobile:**
- FAIL: Do not submit
- Check for: fixed widths, overflow: visible, padding too wide
- Fix CSS and retest

---

## RED FLAGS (DO NOT SUBMIT IF YOU SEE THESE)

- [ ] ❌ Horizontal scroll on mobile (375px)
- [ ] ❌ Text unreadable (font <14px)
- [ ] ❌ Colors not matching (approximate is not OK)
- [ ] ❌ Fonts not loading (system fonts visible)
- [ ] ❌ Buttons/inputs <44px height
- [ ] ❌ Focus state not visible
- [ ] ❌ Input borders missing or wrong color
- [ ] ❌ Elements overlapping or cramped
- [ ] ❌ Labels <18px on desktop
- [ ] ❌ Spacing inconsistent (random gaps)

---

## AFTER BUILDING: SUBMIT TO CASEY

1. **Take 3 screenshots** (desktop, mobile, tablet) at exact dimensions
2. **Check colors** with color picker (all must match)
3. **Test responsive** (no horizontal scroll)
4. **Test accessibility** (Tab through, focus visible)
5. **Post screenshots** with this info:
   - Step number
   - What you built
   - Any changes from baseline
   - Confidence level (ready for approval?)

**Casey will:**
- Take baseline screenshots
- Compare to your screenshots
- Verify all colors with color picker
- Check fonts loading
- Test accessibility
- Approve or flag issues
- Report to Jordan

---

## TOOLS YOU'LL NEED

### Screenshot Tools
- **Playwright:** `npx playwright screenshot --viewport-size=X,Y URL output.png`
- **DevTools:** F12 → Ctrl+Shift+P → "Screenshot"

### Color Picker
- **DevTools:** F12 → Element Inspector → Click element → Color swatch

### Responsive Testing
- **DevTools:** F12 → Ctrl+Shift+M → Device Toolbar

### Font Testing
- **DevTools:** F12 → Network tab → Look for fonts.googleapis.com

---

## QUICK COMMANDS

```bash
# Desktop screenshot
npx playwright screenshot --viewport-size=1400,900 http://localhost:3000/form step1-desktop.png

# Mobile screenshot
npx playwright screenshot --viewport-size=375,812 http://localhost:3000/form step1-mobile.png

# Tablet screenshot
npx playwright screenshot --viewport-size=768,1024 http://localhost:3000/form step1-tablet.png
```

---

## CONTACT

**Visual questions:** Casey (daily)
**CSS/styling help:** Check /docs/style-guide.md or ask CEO
**DevTools questions:** Ask in team chat
**Color/font standards:** /docs/style-guide.md

---

**Created by:** Casey (Visual QA)
**Last Updated:** January 3, 2026
**Updated:** After each step approval
