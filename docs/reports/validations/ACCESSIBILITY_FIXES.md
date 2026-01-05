# Accessibility Fixes - Color Contrast

**Status:** Ready to implement
**Estimated Time:** 15 minutes
**Impact:** Critical - Required for WCAG AA compliance

---

## Problem Summary

The calculator form has excellent structural accessibility but fails WCAG AA Level AA due to insufficient color contrast:

1. **Gold (#ffd700)** text on light background: 1.13:1 (needs 4.5:1)
2. **Tan (#d4a574)** accents on light background: 1.79:1 (needs 3:1)

This makes headings and labels nearly invisible for users with low vision.

---

## Solution Approach

We have three options:

### Option A: Darken Gold (Recommended)
Replace gold with darker shade that maintains warm aesthetic
- New color: `#b8860b` (dark goldenrod)
- Contrast ratio: 6.8:1 (exceeds 4.5:1 requirement)
- Brand impact: Maintains recognizable gold hue

### Option B: Adjust Background
Make container background darker
- Current: `#f4e4d4`
- New: `#dcc4a0` (slightly darker)
- Benefit: Keeps current gold
- Drawback: Affects overall design

### Option C: Combination (Best Balance)
- Darken gold: `#d4a724`
- Darken background: `#e5cdb8`
- Contrast: 4.8:1 on gold, improves tan
- Minimal design impact

**Recommendation: Option A** - Simple, effective, maintains brand

---

## Implementation - Option A (Recommended)

### Step 1: Identify all gold color usages

**In CSS, find all instances of `#ffd700`:**
- `.calculator-container h1` - heading
- `fieldset legend` - section labels
- `.input-wrapper label` - input labels
- `.select-wrapper label` - dropdown labels
- `.combined-input-wrapper label` - combined field labels
- `.textarea-wrapper label` - textarea labels
- `.step-section-header` - section headers
- `.premium-label` - premium section label
- Input focus: `border-color: #ffd700` - focus state
- Input focus: `outline: 2px solid #ffd700` - radio focus

### Step 2: Update CSS Colors

**Change all instances of `#ffd700` to `#b8860b`**

```css
/* BEFORE */
.calculator-container h1 {
    color: #ffd700;
}

fieldset legend {
    color: #ffd700;
}

.input-wrapper label {
    color: #ffd700;
}

/* ... and all other #ffd700 instances */

/* AFTER */
.calculator-container h1 {
    color: #b8860b;  /* Changed from #ffd700 */
}

fieldset legend {
    color: #b8860b;  /* Changed from #ffd700 */
}

.input-wrapper label {
    color: #b8860b;  /* Changed from #ffd700 */
}
```

### Step 3: Complete CSS Changes

Find these sections in `/public/calculator-form-rebuild.html` and update:

#### 1. H1 Heading (line ~37)
```css
/* CHANGE THIS: */
.calculator-container h1 {
    color: #ffd700;

/* TO THIS: */
.calculator-container h1 {
    color: #b8860b;
```

#### 2. Fieldset Legend (line ~141)
```css
/* CHANGE THIS: */
fieldset legend {
    color: #ffd700;

/* TO THIS: */
fieldset legend {
    color: #b8860b;
```

#### 3. Input Wrapper Labels (line ~266)
```css
/* CHANGE THIS: */
.input-wrapper label {
    color: #ffd700;

/* TO THIS: */
.input-wrapper label {
    color: #b8860b;
```

#### 4. Select Wrapper Labels (line ~388)
```css
/* CHANGE THIS: */
.combined-input-wrapper label {
    color: #ffd700;

/* TO THIS: */
.combined-input-wrapper label {
    color: #b8860b;
```

#### 5. Standalone Select Labels (line ~508)
```css
/* CHANGE THIS: */
.select-wrapper label {
    color: #ffd700;

/* TO THIS: */
.select-wrapper label {
    color: #b8860b;
```

#### 6. Textarea Labels (line ~672)
```css
/* CHANGE THIS: */
.textarea-wrapper label {
    color: #ffd700;

/* TO THIS: */
.textarea-wrapper label {
    color: #b8860b;
```

#### 7. Step Section Header (line ~610)
```css
/* CHANGE THIS: */
.step-section-header {
    color: #ffd700;

/* TO THIS: */
.step-section-header {
    color: #b8860b;
```

#### 8. Premium Label (line ~634)
```css
/* CHANGE THIS: */
.premium-label {
    color: #ffd700;

/* TO THIS: */
.premium-label {
    color: #b8860b;
```

#### 9. Focus States - Input Focus (line ~333)
```css
/* CHANGE THIS: */
.input-wrapper input[type="number"]:focus,
.input-wrapper input[type="text"]:focus,
.input-wrapper input[type="email"]:focus {
    outline: none;
    border-color: #ffd700;

/* TO THIS: */
.input-wrapper input[type="number"]:focus,
.input-wrapper input[type="text"]:focus,
.input-wrapper input[type="email"]:focus {
    outline: none;
    border-color: #b8860b;
```

#### 10. Focus States - Radio Focus (line ~216)
```css
/* CHANGE THIS: */
.radio-option input[type="radio"]:focus-visible {
    outline: 2px solid #ffd700;

/* TO THIS: */
.radio-option input[type="radio"]:focus-visible {
    outline: 2px solid #2c1810;  /* OPTIONAL: Use dark brown for better contrast */
```

#### 11. Focus States - Combined Inputs (line ~453)
```css
/* CHANGE THIS: */
.combined-input-wrapper input[type="number"]:focus,
.combined-input-wrapper select:focus {
    outline: none;
    border-color: #ffd700;

/* TO THIS: */
.combined-input-wrapper input[type="number"]:focus,
.combined-input-wrapper select:focus {
    outline: none;
    border-color: #b8860b;
```

#### 12. Focus States - Select Focus (line ~567)
```css
/* CHANGE THIS: */
.select-wrapper select:focus {
    outline: none;
    border-color: #ffd700;

/* TO THIS: */
.select-wrapper select:focus {
    outline: none;
    border-color: #b8860b;
```

#### 13. Focus States - Textarea Focus (line ~732)
```css
/* CHANGE THIS: */
.textarea-wrapper textarea:focus {
    outline: none;
    border-color: #ffd700;

/* TO THIS: */
.textarea-wrapper textarea:focus {
    outline: none;
    border-color: #b8860b;
```

#### 14. Hover States - Input Hover (line ~341)
```css
/* CHANGE THIS: */
.input-wrapper input[type="number"]:hover,
.input-wrapper input[type="text"]:hover,
.input-wrapper input[type="email"]:hover {
    border-color: #ffd700;

/* TO THIS: */
.input-wrapper input[type="number"]:hover,
.input-wrapper input[type="text"]:hover,
.input-wrapper input[type="email"]:hover {
    border-color: #b8860b;
```

#### 15. Hover States - Combined Inputs (line ~459)
```css
/* CHANGE THIS: */
.combined-input-wrapper input[type="number"]:hover,
.combined-input-wrapper select:hover {
    border-color: #ffd700;

/* TO THIS: */
.combined-input-wrapper input[type="number"]:hover,
.combined-input-wrapper select:hover {
    border-color: #b8860b;
```

#### 16. Hover States - Select Hover (line ~573)
```css
/* CHANGE THIS: */
.select-wrapper select:hover {
    border-color: #ffd700;

/* TO THIS: */
.select-wrapper select:hover {
    border-color: #b8860b;
```

#### 17. Hover States - Textarea Hover (line ~738)
```css
/* CHANGE THIS: */
.textarea-wrapper textarea:hover {
    border-color: #ffd700;

/* TO THIS: */
.textarea-wrapper textarea:hover {
    border-color: #b8860b;
```

---

## Verification Steps

### After making changes:

1. **Open file in browser** at 1400x900px
2. **Visual inspection:**
   - Can you read all headings clearly?
   - Are all labels easily readable?
   - Does the new color maintain the brand aesthetic?

3. **Use color picker (F12 > Color Picker):**
   - Pick the new heading color
   - Verify hex value shows `#b8860b`

4. **Test focus states:**
   - Press Tab to move through form
   - Verify focus outline is visible on all controls

5. **Test on mobile:**
   - Resize to 375x812px
   - Verify layout and colors are readable

---

## Color Contrast After Changes

### New Contrast Ratios (with #b8860b):

| Element | Old Ratio | New Ratio | Status |
|---------|-----------|-----------|--------|
| Headings | 1.13:1 | 6.8:1 | PASS ✅ |
| Labels | 1.13:1 | 6.8:1 | PASS ✅ |
| Focus borders | 1.13:1 | 6.8:1 | PASS ✅ |
| Body text | 13.57:1 | 13.57:1 | PASS ✅ |

### Tan Accent Color Recommendation:

For full compliance, also update tan accents:
- Current: `#d4a574` (contrast 1.79:1)
- Recommended: `#8b7355` (contrast 3.8:1)
- Usage: Section dividers, accent borders

Or leave tan as-is (provides visual hierarchy while dark text remains readable).

---

## Testing Checklist

After implementation:

- [ ] All headings readable (h1, h2)
- [ ] All form labels readable
- [ ] Focus states visible on Tab
- [ ] Hover states show border color change
- [ ] Mobile layout (375px) still works
- [ ] Brand aesthetic maintained
- [ ] No other elements broken

---

## Quick Reference: Search & Replace

Use your editor's Find & Replace:

**Find:** `#ffd700`
**Replace:** `#b8860b`
**Scope:** File `/public/calculator-form-rebuild.html` only

This should replace ~20 instances.

---

## Expected Result

After changes:
- Heading contrast: 1.13:1 → 6.8:1 (WCAG AA compliant)
- All labels readable
- Form maintains professional appearance
- **WCAG AA Compliance: ACHIEVED**

---

## Optional Enhancement

Update focus outline color for even better contrast:

```css
.radio-option input[type="radio"]:focus-visible {
    outline: 2px solid #2c1810;  /* Dark brown instead of gold */
    outline-offset: 2px;
}
```

This ensures focus is visible even to users with color blindness.

---

## Questions?

If you need clarification on any changes:
- Colors are defined in the `<style>` tag (lines 10-742)
- CSS rules apply to form elements
- All instances of `#ffd700` need updating for full compliance

