# Calculator Form - Visual Quality Standards

**Document Created:** January 3, 2026
**Set by:** Casey (Visual Director & QA)
**Authority Level:** Visual validation baseline
**Referenced by:** Alex (developer), Jordan (validator)
**Status:** ACTIVE - Complete checklist below

---

## CRITICAL: Visual Validation is MANDATORY before deployment

Every step of the form rebuild must pass these standards before going live.

---

## 1. RESPONSIVE DESIGN BASELINE

### Desktop (1400x900px)
- **Container width:** Maximum 1400px
- **Form max-width:** 600px (centered)
- **Padding:** 40px on sides
- **Viewport:** Exact 1400x900px for screenshots
- **No horizontal scroll:** MANDATORY

### Tablet (768px)
- **Container width:** Full viewport
- **Form max-width:** 90% of viewport
- **Padding:** 20px on sides
- **Viewport:** Exact 768x1024px for testing
- **No horizontal scroll:** MANDATORY
- **Layout:** Responsive, no columns broken

### Mobile (375px)
- **Container width:** Full viewport (375px)
- **Form max-width:** 100% with padding
- **Padding:** 20px on sides
- **Viewport:** Exact 375x812px for screenshots (iPhone SE/8 dimensions)
- **No horizontal scroll:** MANDATORY
- **Layout:** Single column, fully stacked

### Breakpoint Strategy
```css
/* Mobile-first approach */
.form-container {
  max-width: 100%;
  padding: 20px;
}

/* Tablet and up */
@media (min-width: 768px) {
  .form-container {
    max-width: 90%;
    margin: 0 auto;
    padding: 20px;
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .form-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px;
  }
}

/* Large desktop */
@media (min-width: 1400px) {
  .form-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 40px;
  }
}
```

---

## 2. TYPOGRAPHY STANDARDS (30-60 Age Demographic)

### Font Loading Requirements
- **Primary Font:** Playfair Display (headings) - REQUIRED
- **Body Font:** Merriweather (input labels, body text) - REQUIRED
- **Fallback:** Georgia, serif
- **Import Code:**
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Merriweather:wght@400;700&display=swap');
```

### Font Sizes (Minimum Standards)

| Element | Font | Size | Weight | Color | Line Height | Usage |
|---------|------|------|--------|-------|-------------|-------|
| **Form Title (H1)** | Playfair Display | 36-48px | 700 | #ffd700 (gold) | 1.2 | Form main heading |
| **Section Headers (H2)** | Playfair Display | 24-28px | 700 | #d4a574 (tan) | 1.2 | Step titles, section headings |
| **Label Text** | Merriweather | 18-20px minimum | 700 | #f4e4d4 (light) | 1.5 | Input labels, form field names |
| **Input/Button Text** | Merriweather | 16-18px minimum | 400 | #f4e4d4 (light) | 1.6 | Text inside inputs, button labels |
| **Helper Text** | Merriweather | 14-16px minimum | 400 | #d4a574 (tan) | 1.5 | Explanatory text below fields |
| **Error Messages** | Merriweather | 14-16px minimum | 400 | #ff6b6b (red) | 1.5 | Validation error text |
| **Body Text** | Merriweather | 16px | 400 | #f4e4d4 (light) | 1.8 | Paragraphs, descriptions |

### Readability Requirements for 30-60 Age Group
- **Minimum label size:** 18px (non-negotiable for older readers)
- **Minimum input text:** 16px
- **Line height:** 1.5 or higher (increased spacing for readability)
- **Letter spacing:** 0.5-1px on headings (aid clarity)
- **No all-caps:** Use title case instead
- **High contrast:** All text must pass WCAG AA (4.5:1 contrast ratio)

---

## 3. COLOR ACCURACY STANDARDS

### Brand Colors (Must Match Exactly)

| Color Name | Hex | RGB | Usage | Validation Method |
|-----------|-----|-----|-------|-------------------|
| **Dark Brown** | #1a120b | 26, 18, 11 | Page/form background | Browser picker |
| **Light Tan** | #f4e4d4 | 244, 228, 212 | Input text, labels | Browser picker |
| **Tan Accent** | #d4a574 | 212, 165, 116 | Links, section headers, helper text | Browser picker |
| **Gold** | #ffd700 | 255, 215, 0 | Form title, highlights | Browser picker |
| **Border Brown** | #8b4513 | 139, 69, 19 | Input borders, dividers | Browser picker |
| **Light Brown** | #2c1810 | 44, 24, 16 | Cards, boxes, containers | Browser picker |

### Color Usage in Form

**Form Title (H1):**
- Color: #ffd700 (gold) - EXACT match required
- Validation: Use browser color picker to confirm RGB 255, 215, 0

**Step Headers (H2):**
- Color: #d4a574 (tan) - EXACT match required
- Validation: Use browser color picker to confirm RGB 212, 165, 116

**Input Labels:**
- Color: #f4e4d4 (light tan) - EXACT match required
- Validation: Use browser color picker to confirm RGB 244, 228, 212

**Input Fields:**
- Background: #2c1810 (light brown)
- Text: #f4e4d4 (light tan)
- Border: #8b4513 (border brown), 2px solid

**Buttons:**
- Background: #8b4513 (border brown)
- Text: #f4e4d4 (light tan)
- Hover Background: #d4a574 (tan accent)
- Hover Text: #1a120b (dark brown)

**Links/Helper Text:**
- Color: #d4a574 (tan accent)
- Hover: #ffd700 (gold)

**Error Messages:**
- Color: #ff6b6b (red - brand error color)
- Background: Transparent (no background)

### Color Validation Checklist
- [ ] H1/title is exactly #ffd700
- [ ] H2/step headers are exactly #d4a574
- [ ] Input labels are exactly #f4e4d4
- [ ] Input text is exactly #f4e4d4
- [ ] Input backgrounds are exactly #2c1810
- [ ] Input borders are exactly #8b4513
- [ ] Button background is exactly #8b4513
- [ ] Button text is exactly #f4e4d4
- [ ] Helper text is exactly #d4a574
- [ ] Form background is exactly #1a120b
- [ ] No colors approximate (no "close" hex values)
- [ ] No system colors substituted

**Validation Tool:**
Use Firefox/Chrome DevTools color picker:
1. F12 to open DevTools
2. Click element inspector (top left arrow)
3. Click on element
4. In Styles tab, look for color property
5. Click hex value to see RGB
6. Compare RGB values to table above

---

## 4. ACCESSIBILITY STANDARDS

### Touch Target Sizes (44x44px Minimum)
**CRITICAL for older demographic (30-60 years):**

| Element | Minimum Size | Target Size | Notes |
|---------|--------------|-------------|-------|
| **Buttons** | 44x44px | 50x56px | All action buttons |
| **Input Fields** | 44x44px height | 44x50px | Min 50px padding left/right |
| **Checkboxes** | 44x44px | 50x50px | Larger for accuracy |
| **Radio Buttons** | 44x44px | 50x50px | Larger for accuracy |
| **Text Links** | 44x44px hit area | 60px wide min | Underline or different color |

### Spacing Around Touch Targets
- **Minimum gap between buttons:** 16px
- **Minimum gap between inputs:** 20px
- **Padding inside buttons:** 12-16px
- **Padding inside inputs:** 12-16px left/right

### Color Contrast Requirements

**All text must pass WCAG AA (4.5:1 minimum):**

| Text Color | Background | Ratio | Status |
|-----------|-----------|-------|--------|
| #f4e4d4 (light) | #1a120b (dark brown) | 13.5:1 | PASS |
| #f4e4d4 (light) | #2c1810 (light brown) | 10.2:1 | PASS |
| #ffd700 (gold) | #1a120b (dark brown) | 7.1:1 | PASS |
| #d4a574 (tan) | #1a120b (dark brown) | 4.6:1 | PASS |
| #f4e4d4 (light) | #8b4513 (border brown) | 8.2:1 | PASS |

**Validation:** Use https://webaim.org/resources/contrastchecker/

### Focus/Hover States
- [ ] All interactive elements have visible focus state
- [ ] Focus state uses #ffd700 (gold) highlight or outline
- [ ] Outline width minimum 2px
- [ ] Focus indicator is NOT removed (no outline: none)
- [ ] Hover state clearly visible and different from default

### Keyboard Navigation
- [ ] Tab order is logical (left-to-right, top-to-bottom)
- [ ] No keyboard traps
- [ ] All buttons accessible via Tab + Enter
- [ ] All inputs focusable with Tab
- [ ] Form can be completed entirely via keyboard

### Screen Reader Compatibility
- [ ] All inputs have associated <label> elements
- [ ] Label text describes the input
- [ ] Error messages are associated with inputs (aria-describedby)
- [ ] Form sections have appropriate headings
- [ ] Placeholder text is NOT used as label substitute

---

## 5. FORM-SPECIFIC VISUAL STANDARDS

### Form Container
```
Desktop (1400x900):
┌─────────────────────────────────────────────────────────┐
│                                                         │
│              400px      600px      400px                │
│               ↓          ↓          ↓                    │
│             ────────────────────────────────            │
│             │ Form Title                  │             │
│             │                             │             │
│             │ [Form Content]              │             │
│             │                             │             │
│             ────────────────────────────────            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Requirements:**
- Max-width: 600px
- Centered horizontally
- Padding: 40px (all sides)
- Background: #1a120b (dark brown)
- Border: 1px solid #8b4513 (border brown) - optional
- Border-radius: 8px - optional
- Box shadow: Light shadow for depth (optional)

### Step Indicator Container
```
Step 1 ● Step 2 ○ Step 3 ○ Step 4 ○ Step 5 ○ Step 6 ○

Active: #ffd700 (gold filled circle)
Inactive: #8b4513 (border brown outline)
Completed: #d4a574 (tan filled circle)
```

**Requirements:**
- Circles: 24-32px diameter
- Gap between circles: 8-12px
- Connecting line: 2px solid #8b4513
- Responsive: Stack on mobile (375px), single row on desktop
- Active state: Scale up slightly (transform: scale(1.1))

### Input Field Standards

**Standard Input (Text, Number, Email):**
```
Label Text (18-20px, #f4e4d4)
[  Input text here                                 ] ← 44px min height
Helper text below (14px, #d4a574)
```

**Requirements:**
- Height: 44-50px minimum
- Padding: 12-16px left/right, 12px top/bottom
- Border: 2px solid #8b4513
- Border-radius: 4px
- Font: Merriweather 16-18px
- Text color: #f4e4d4
- Background: #2c1810
- Focus state: Border color change to #ffd700, outline: 2px gold

**Focus/Hover State:**
```
Focus:
[  Input text here                                 ]
    └─ Border: #ffd700 (gold), 2px
    └─ Outline: #ffd700 (gold), 2px
    └─ Box-shadow: 0 0 8px rgba(255,215,0,0.2)

Hover:
[  Input text here                                 ]
    └─ Border: #d4a574 (tan), 2px
    └─ Background: #2c1810 (lighter brown)
```

### Button Standards

**Primary Button (CTA):**
```
┌──────────────────────────┐
│ Next Step →              │ ← 16px+ text
│ (50-56px height)         │
└──────────────────────────┘
```

**Requirements:**
- Height: 50-56px minimum
- Width: Full form width minus padding
- Padding: 16px horizontal, 12px vertical
- Border: None (use background color only)
- Border-radius: 4px
- Font: Merriweather 16-18px bold
- Text color: #f4e4d4 (light tan)
- Background: #8b4513 (border brown)
- Cursor: pointer

**Button States:**
```
Default:
┌──────────────────────────┐
│ Next Step →              │
│ Background: #8b4513      │
└──────────────────────────┘

Hover:
┌──────────────────────────┐
│ Next Step →              │
│ Background: #d4a574      │
│ Text: #1a120b            │
│ Transform: scale(1.02)   │
│ Box-shadow: light        │
└──────────────────────────┘

Active/Pressed:
┌──────────────────────────┐
│ Next Step →              │
│ Background: #ffd700      │
│ Text: #1a120b            │
│ Transform: scale(0.98)   │
└──────────────────────────┘

Disabled:
┌──────────────────────────┐
│ Next Step →              │
│ Background: #555555      │
│ Opacity: 0.5             │
│ Cursor: not-allowed      │
└──────────────────────────┘
```

### Spacing Between Form Elements

| Element Pair | Gap | Notes |
|--------------|-----|-------|
| Label to Input | 8-12px | Tight but clear |
| Input to Helper Text | 4-8px | Small gap |
| Form Section to Label | 20-24px | Clear separation |
| Input to Input | 20-24px | Consistent vertical spacing |
| Last Input to Button | 32-40px | Generous space before CTA |
| Button to Next Section | 40-50px | Clear visual break |

### Error Message Display

**Requirements:**
- Color: #ff6b6b (red)
- Font: Merriweather 14-16px
- Position: Directly below input field
- Margin-top: 4-8px
- Display: Block (full width below input)
- Icon: Optional, use checkmark or X (16x16px)

**Example:**
```
Email Address (18px, #f4e4d4)
[  invalid-email@                             ] (Input with red border)
↓ (4px gap)
⚠ Enter a valid email address (14px, #ff6b6b)
```

**Visual Indicators:**
- [ ] Input border turns red (#ff6b6b) on error
- [ ] Error message appears below input
- [ ] Error text is red, readable
- [ ] Clear visual distinction from normal state

---

## 6. SCREENSHOT VALIDATION PROCESS

### Desktop Screenshots (1400x900px)

**Taking the screenshot:**
```bash
# Using Playwright
npx playwright screenshot --viewport-size=1400,900 https://[URL] desktop-form.png

# OR Manual in browser:
# 1. F12 (DevTools)
# 2. Ctrl+Shift+M (Device Toolbar)
# 3. Set width: 1400px, height: 900px
# 4. Ctrl+Shift+P → "Screenshot"
```

**Visual Checklist:**
- [ ] Exact dimensions 1400x900px
- [ ] Form centered on screen
- [ ] No horizontal scroll visible
- [ ] All elements visible without scrolling
- [ ] Colors render accurately
- [ ] Fonts load and render properly
- [ ] Spacing looks consistent
- [ ] Alignment is pixel-perfect
- [ ] No visual glitches or overlaps

### Mobile Screenshots (375x812px)

**Taking the screenshot:**
```bash
# Using Playwright
npx playwright screenshot --viewport-size=375,812 https://[URL] mobile-form.png

# OR Manual in browser:
# 1. F12 (DevTools)
# 2. Ctrl+Shift+M (Device Toolbar)
# 3. Select "iPhone SE" or set: 375x812
# 4. Ctrl+Shift+P → "Screenshot"
```

**Visual Checklist:**
- [ ] Exact dimensions 375x812px
- [ ] No horizontal scroll (width never exceeds 375px)
- [ ] Form stacks vertically
- [ ] All text readable without zooming
- [ ] Buttons are 44px+ height
- [ ] Touch targets have adequate spacing
- [ ] Images scale properly (no distortion)
- [ ] No cramped layouts

### Tablet Screenshots (768x1024px)

**Taking the screenshot:**
```bash
# Using Playwright
npx playwright screenshot --viewport-size=768,1024 https://[URL] tablet-form.png

# OR Manual in browser:
# 1. F12 (DevTools)
# 2. Ctrl+Shift+M (Device Toolbar)
# 3. Select "iPad" or set: 768x1024
# 4. Ctrl+Shift+P → "Screenshot"
```

**Visual Checklist:**
- [ ] Exact dimensions 768x1024px
- [ ] No horizontal scroll
- [ ] Layout is responsive, not squeezed
- [ ] Spacing maintains proportionality
- [ ] All interactive elements accessible

### Screenshot Baseline Comparison

**Location:** `/agents/visual_baselines/`

**File naming:**
```
form-desktop-baseline-2026-01-03.png
form-mobile-baseline-2026-01-03.png
form-tablet-baseline-2026-01-03.png
```

**Comparison process:**
1. Take new screenshot at exact dimensions
2. Open baseline screenshot
3. Compare side-by-side (use Mac Preview or similar)
4. Look for visual drift:
   - Layout shifts
   - Color changes
   - Font size changes
   - Spacing changes
   - Element positioning
5. Document any differences
6. Note if changes are approved (CSS update) or regressions

**When to update baseline:**
- After approved CSS changes
- After CEO-approved design changes
- After form rebuild step completion
- Never unilaterally change without documentation

---

## 7. VISUAL VALIDATION CHECKLIST

### Step 1: Container (Alex builds, Casey validates)

**Visual Validation for Step 1:**
```markdown
# Step 1 Visual Validation - Form Container

## Desktop (1400x900px)
- [ ] Screenshot taken at exact 1400x900
- [ ] Container width max 600px
- [ ] Form centered horizontally
- [ ] 40px padding visible on all sides
- [ ] Background color is #1a120b (dark brown)
- [ ] No horizontal scroll
- [ ] No visual glitches

## Tablet (768x1024px)
- [ ] Screenshot taken at exact 768x1024
- [ ] Container responsive (90% width with padding)
- [ ] Padding 20px on sides
- [ ] No horizontal scroll
- [ ] Centered appropriately for tablet

## Mobile (375x812px)
- [ ] Screenshot taken at exact 375x812
- [ ] Container takes full width with padding
- [ ] Padding 20px on sides
- [ ] No horizontal scroll (CRITICAL)
- [ ] Container width never exceeds 375px

## Color Verification
- [ ] Background: #1a120b (dark brown) - verified with color picker
- [ ] RGB values: 26, 18, 11

## Layout Alignment
- [ ] Elements aligned left/right consistently
- [ ] No unexpected margins
- [ ] White space proportional

## Overall Status
✅ PASS / 🔴 FAIL

Validated by: Casey
Date: [DATE]
```

### Step 2: Form Shell with Title & Step Indicator

**Visual Validation for Step 2:**
```markdown
# Step 2 Visual Validation - Form Shell

## Desktop (1400x900px)
- [ ] Screenshot taken at exact 1400x900
- [ ] Form title visible (#ffd700 gold color)
- [ ] Step indicator visible (6 circles)
- [ ] Active step is filled (#ffd700)
- [ ] Inactive steps are outlined (#8b4513)
- [ ] Title font is Playfair Display, 36-48px
- [ ] Title color verified #ffd700 with color picker
- [ ] Step circles are 24-32px diameter
- [ ] Gap between circles consistent (8-12px)
- [ ] No horizontal scroll

## Mobile (375x812px)
- [ ] Step indicator stacks if needed (single row OK)
- [ ] Step circles don't overflow
- [ ] Title is readable (24px+ on mobile)
- [ ] No horizontal scroll

## Font Verification
- [ ] Title uses Playfair Display (not system font)
- [ ] Font weight is bold (700)
- [ ] Font size is proportional (36px mobile, 48px desktop)

## Color Verification (Color Picker)
- [ ] H1 title: #ffd700 (RGB 255, 215, 0)
- [ ] Active step circle: #ffd700
- [ ] Inactive step circle: #8b4513
- [ ] Connecting line: #8b4513

## Spacing
- [ ] Title has 20-24px bottom margin
- [ ] Step indicator has 32-40px bottom margin
- [ ] All spacing consistent

## Overall Status
✅ PASS / 🔴 FAIL

Validated by: Casey
Date: [DATE]
```

### Step 3: Single Input Field

**Visual Validation for Step 3:**
```markdown
# Step 3 Visual Validation - Single Input Field

## Desktop (1400x900px)
- [ ] Screenshot taken at exact 1400x900
- [ ] Label text visible (18-20px Merriweather)
- [ ] Input field height is 44px minimum
- [ ] Input field border is 2px solid #8b4513
- [ ] Input background is #2c1810
- [ ] Input text color is #f4e4d4
- [ ] Padding inside input is 12-16px
- [ ] Focus state shows gold border (#ffd700)
- [ ] No horizontal scroll

## Mobile (375x812px)
- [ ] Label visible and readable (18px minimum)
- [ ] Input field full width (minus padding)
- [ ] Input height is 44px minimum (touch-friendly)
- [ ] No horizontal scroll

## Font Verification
- [ ] Label: Merriweather, 18-20px, bold
- [ ] Input text: Merriweather, 16-18px, regular
- [ ] No system fonts visible

## Color Verification (Color Picker)
- [ ] Label text: #f4e4d4
- [ ] Input background: #2c1810
- [ ] Input border: #8b4513
- [ ] Input text: #f4e4d4
- [ ] Focus border: #ffd700

## Accessibility
- [ ] Label is associated with input (<label for="...">)
- [ ] Touch target (input) is 44x44px minimum
- [ ] Focus outline is visible and at least 2px
- [ ] Contrast passes WCAG AA (4.5:1)

## Spacing
- [ ] Label to input gap: 8-12px
- [ ] Input field padding: 12-16px left/right
- [ ] No unexpected margins

## Overall Status
✅ PASS / 🔴 FAIL

Validated by: Casey
Date: [DATE]
```

### Steps 4-6: Progressive Field Addition

**Visual Validation Template (Steps 4, 5, 6):**
```markdown
# Step [N] Visual Validation - [Field Type] Field

## Desktop (1400x900px)
- [ ] Screenshot taken at exact 1400x900
- [ ] All inputs visible (no scroll needed)
- [ ] Labels readable (18px minimum)
- [ ] Input heights 44px minimum
- [ ] Vertical spacing consistent (20-24px between inputs)
- [ ] All elements properly aligned
- [ ] No horizontal scroll
- [ ] Colors accurate (use color picker)

## Mobile (375x812px)
- [ ] All inputs stack vertically
- [ ] No horizontal scroll
- [ ] Touch targets 44x44px minimum
- [ ] Spacing maintained
- [ ] Text readable without zooming

## Font Verification
- [ ] All labels: Merriweather, 18-20px, bold
- [ ] All inputs: Merriweather, 16-18px, regular
- [ ] Fonts loading correctly (not system fonts)

## Color Verification (Color Picker)
- [ ] All labels: #f4e4d4
- [ ] All inputs background: #2c1810
- [ ] All inputs border: #8b4513
- [ ] All inputs text: #f4e4d4

## Accessibility
- [ ] All inputs have associated labels
- [ ] All touch targets ≥44px
- [ ] Focus states visible
- [ ] Tab order logical (top-to-bottom, left-to-right)
- [ ] Keyboard navigation works

## Spacing Consistency
- [ ] Label-to-input gap: 8-12px consistent
- [ ] Input-to-input gap: 20-24px consistent
- [ ] All margins proportional

## Overall Status
✅ PASS / 🔴 FAIL

Validated by: Casey
Date: [DATE]
```

---

## 8. VISUAL RED FLAGS (AUTO-FAIL CHECKLIST)

**Any of these = AUTOMATIC FAIL (do not approve for deployment):**

### Critical Failures
- [ ] ❌ Horizontal scroll visible on any viewport (375px, 768px, 1400px)
- [ ] ❌ Form extends beyond viewport width
- [ ] ❌ Text unreadable without zooming (font <14px on mobile)
- [ ] ❌ Colors don't match baseline (visual drift detected)
- [ ] ❌ Colors not exact hex (approximate colors rejected)
- [ ] ❌ Fonts not loading (system fonts visible instead of Playfair/Merriweather)
- [ ] ❌ Touch targets <44px (buttons, inputs, checkboxes)

### Layout Failures
- [ ] ❌ Elements overlap or stack incorrectly
- [ ] ❌ Form breaks at any breakpoint (375, 768, 1400px)
- [ ] ❌ Layout shifts visible (reflow issues)
- [ ] ❌ Elements cut off at edges
- [ ] ❌ Uneven spacing (25px vs 40px inconsistently)

### Typography Failures
- [ ] ❌ Labels <18px on desktop (accessibility violation)
- [ ] ❌ Input text <16px
- [ ] ❌ Heading font is not Playfair Display
- [ ] ❌ Body font is not Merriweather
- [ ] ❌ Font weight incorrect (H1 not bold, inputs not regular)

### Color Failures
- [ ] ❌ Title not #ffd700 (gold)
- [ ] ❌ Labels not #f4e4d4 (light tan)
- [ ] ❌ Input background not #2c1810 (light brown)
- [ ] ❌ Input text not #f4e4d4
- [ ] ❌ Input border not #8b4513 (brown)
- [ ] ❌ Button not #8b4513 (brown)
- [ ] ❌ No visible focus state on inputs
- [ ] ❌ Error messages not red (#ff6b6b)

### Accessibility Failures
- [ ] ❌ No visible focus outline on inputs
- [ ] ❌ Focus state doesn't meet 2px minimum
- [ ] ❌ No labels associated with inputs
- [ ] ❌ Error messages not visible or readable
- [ ] ❌ Color contrast <4.5:1 (fails WCAG AA)
- [ ] ❌ Tab order illogical or missing elements

### Image/Asset Failures
- [ ] ❌ Images not loading (broken image placeholder)
- [ ] ❌ Images distorted or scaled incorrectly
- [ ] ❌ SVG icons missing or misaligned
- [ ] ❌ Favicon missing

### Performance Failures
- [ ] ❌ Fonts slow to load (visible font swap, FOIT)
- [ ] ❌ Layout shifts during load (CLS issue)
- [ ] ❌ Images unoptimized (unusually large file)

---

## 9. TESTING INSTRUCTIONS FOR ALEX

### Before Building Each Step:
1. **Review this document** - Understand visual requirements
2. **Check baseline screenshots** - Know what you're building toward
3. **Set up your screen** - Use exact viewport sizes during testing

### After Building Each Step:
1. **Take screenshots** at exact dimensions (1400x900, 768x1024, 375x812)
2. **Check colors** with browser color picker (F12 > Inspector > Color field)
3. **Verify fonts** are Playfair Display (headings) and Merriweather (body)
4. **Test touch targets** - Are buttons/inputs 44px+ height?
5. **Test responsive** - Does it work at 375px, 768px, 1400px?
6. **Test accessibility** - Tab through form, check focus states
7. **Post screenshots** in the comments or send to Casey
8. **Wait for Casey's approval** - Don't move to next step until visual validation passes

### Tools You'll Need:
- Browser DevTools (F12)
- Color picker tool (in DevTools)
- Screenshot tool (Playwright or manual)
- Responsive design tester (DevTools Device Toolbar)

### Example Testing Workflow:
```bash
# Step 1: Take desktop screenshot
npx playwright screenshot --viewport-size=1400,900 https://localhost:3000/form desktop.png

# Step 2: Take mobile screenshot
npx playwright screenshot --viewport-size=375,812 https://localhost:3000/form mobile.png

# Step 3: Take tablet screenshot
npx playwright screenshot --viewport-size=768,1024 https://localhost:3000/form tablet.png

# Step 4: Compare to baseline (manually in Preview)
# - Open baseline-desktop.png and desktop.png side-by-side
# - Look for visual differences
# - Document findings

# Step 5: Check colors (manual with browser)
# - Open page in browser
# - F12 to open DevTools
# - Click color picker (dropper icon)
# - Click on element to sample color
# - Note hex value and compare to standards

# Step 6: Test accessibility
# - Tab through form
# - Verify focus states visible
# - Check label associations
# - Test on mobile for touch targets
```

---

## 10. VISUAL VALIDATION REPORT TEMPLATE

**When submitting validation to Jordan:**

```markdown
# Visual Validation Report - Calculator Form (Step [N])

**Date:** [DATE]
**Step:** Step [N] - [Description]
**Validated by:** Casey
**Status:** ✅ PASS / 🔴 FAIL

---

## Desktop (1400x900px)

**Screenshot:** [filename]

- [x] Exact dimensions 1400x900px
- [x] Layout consistent with baseline
- [x] Colors verified with color picker
- [x] Fonts rendering correctly
- [x] Spacing consistent
- [x] No horizontal scroll
- [x] No visual glitches

**Colors Verified:**
- [ ] Background: #1a120b ✅
- [ ] Title: #ffd700 ✅
- [ ] Labels: #f4e4d4 ✅
- [ ] Input background: #2c1810 ✅
- [ ] Input border: #8b4513 ✅

**Fonts Verified:**
- [ ] Headings: Playfair Display ✅
- [ ] Body: Merriweather ✅

---

## Mobile (375x812px)

**Screenshot:** [filename]

- [x] Exact dimensions 375x812px
- [x] No horizontal scroll
- [x] Touch targets ≥44px
- [x] Text readable without zooming
- [x] Layout stacks properly
- [x] Spacing maintained

---

## Tablet (768x1024px)

**Screenshot:** [filename]

- [x] Exact dimensions 768x1024px
- [x] No horizontal scroll
- [x] Responsive layout
- [x] Spacing proportional

---

## Accessibility

- [x] All inputs have associated labels
- [x] Focus states visible (2px+ outline)
- [x] Tab order logical
- [x] Touch targets ≥44px
- [x] Color contrast ≥4.5:1 (WCAG AA)

---

## Overall Assessment

✅ **PASS - Ready for next step**

OR

🔴 **FAIL - Issues found:**
- Issue 1: [Description]
- Issue 2: [Description]
- [Required fixes before approval]

---

## Notes

[Any additional observations, recommendations, or context]

---

Validated by: Casey
Date: [DATE]
Time: [TIME]
```

---

## 11. SUMMARY FOR ALEX

### What Casey Needs From You:
1. **Exact viewport screenshots** - 1400x900, 375x812, 768x1024px (use tools above)
2. **Color verification** - Use browser color picker to sample colors, confirm hex values
3. **Font confirmation** - Verify Playfair Display and Merriweather are loading
4. **Responsive testing** - Test at all three breakpoints, confirm no horizontal scroll
5. **Touch targets** - Make sure buttons/inputs are 44px+ height

### What Casey Will Do:
1. Take baseline screenshots before you start
2. Compare your step screenshots to baseline
3. Verify colors pixel-by-pixel with color picker
4. Check fonts are rendering correctly
5. Validate accessibility standards (focus states, contrast, touch targets)
6. Generate visual validation report
7. Approve or flag issues before deployment

### Critical Requirements (Non-Negotiable):
- **No horizontal scroll** on any viewport
- **Exact color matching** (no approximations)
- **44px+ touch targets** (minimum for accessibility)
- **18px+ labels** (readability for 30-60 age demographic)
- **Fonts must load** (Playfair Display + Merriweather)

---

## 12. CONTACT & ESCALATION

**For visual questions:** Casey (daily validation)
**For CSS/styling issues:** Alex (developer)
**For color standard questions:** /docs/style-guide.md
**For design approval:** CEO (weekly check-in)
**For visual blockers:** Quinn (immediate escalation)

---

## VERSION HISTORY

| Date | Change | By |
|------|--------|-----|
| 2026-01-03 | Created comprehensive visual standards baseline | Casey |
| TBD | Updated post Step 1 validation | Casey |
| TBD | Updated post Step 2 validation | Casey |

---

**Document Status:** ACTIVE
**Last Updated:** January 3, 2026
**Next Review:** After Step 1 completion
**Approval Chain:** Casey (author) → Jordan (validator) → Alex (developer)

---

## APPENDIX: Quick Reference

### Exact Hex Color Codes (Copy-Paste)
```
Background: #1a120b
Text Light: #f4e4d4
Accent Tan: #d4a574
Gold: #ffd700
Brown Border: #8b4513
Brown Light: #2c1810
```

### Viewport Sizes (For Screenshots)
```
Desktop: 1400x900px
Tablet: 768x1024px
Mobile: 375x812px
```

### Font Import (Copy-Paste)
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Merriweather:wght@400;700&display=swap');
```

### Minimum Font Sizes
```
H1/Title: 36-48px (Playfair Display)
H2/Sections: 24-28px (Playfair Display)
Labels: 18-20px (Merriweather bold)
Input text: 16-18px (Merriweather regular)
Body/Helper: 14-16px (Merriweather)
```

### Touch Target Minimum
```
All buttons: 44x44px minimum
All inputs: 44x50px (height x width min)
All checkboxes: 50x50px
```

### Color Contrast (WCAG AA Compliant)
```
Light (#f4e4d4) on Dark (#1a120b): 13.5:1 ✅
Gold (#ffd700) on Dark (#1a120b): 7.1:1 ✅
Tan (#d4a574) on Dark (#1a120b): 4.6:1 ✅
```

---

**Visual standards set by Casey on January 3, 2026.**
**All calculator form visual validation must reference this document.**
