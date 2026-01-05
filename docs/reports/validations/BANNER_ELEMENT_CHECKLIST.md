# Banner Element Validation Checklist

**Comparing:** wiki.html vs calculator.html
**CSS Source:** /public/style-2026.css (shared)
**Date:** 2026-01-04

---

## HEADER HEIGHT

- [x] **Header minimum height set** | Value: 180px | Both pages: 180px | ✓ IDENTICAL
- [x] **Header padding correct** | Value: 30px 0 20px 0 | Both pages: 30px 0 20px 0 | ✓ IDENTICAL
- [x] **Header margin-bottom set** | Value: 25px | Both pages: 25px | ✓ IDENTICAL
- [x] **Visual balance maintained** | Center-aligned | Both pages: center | ✓ IDENTICAL

**RESULT:** ✓ PASS

---

## LOGO ASPECT RATIO

- [x] **Logo file exists** | Path: /images/logo.png | ✓ FOUND
- [x] **Logo dimensions verified** | Size: 900 x 491 px | ✓ CONFIRMED
- [x] **Aspect ratio calculated** | 900 ÷ 491 = 1.833 | ✓ CORRECT
- [x] **Within brand standard** | Required: 1.83 ±2% (1.79-1.87) | 1.833 is within range | ✓ PASS
- [x] **Logo used on wiki.html** | <img src="/images/logo.png"> | ✓ YES
- [x] **Logo used on calculator.html** | <img src="/images/logo.png"> | ✓ YES
- [x] **Logo source identical** | Both reference same file | ✓ IDENTICAL
- [x] **Logo alt text present** | "Carnivore Weekly Logo" on both | ✓ IDENTICAL

**RESULT:** ✓ PASS

---

## H1 HEADING FONT

### Font-Family

- [ ] **Playfair Display imported** | Google Fonts | ✓ YES (linked in both pages)
- [ ] **Font weights available** | 700, 900 | ✓ YES
- [ ] **Font-family CSS rule exists** | header h1 { font-family: ... } | ✗ NO - MISSING
- [ ] **Playfair applied to H1** | Explicit CSS rule | ✗ FAIL - Not set
- [x] **Both pages use same font setup** | Identical imports | ✓ BOTH MISSING

**RESULT:** 🔴 CRITICAL FAIL - Font-family property not defined

**Current CSS:** (WRONG)
```css
header h1 {
    /* NO font-family property */
    font-size: 4em;
    color: #d4a574;
    /* ... other properties ... */
}
```

**Required CSS:** (CORRECT)
```css
header h1 {
    font-family: 'Playfair Display', serif;  /* ADD THIS */
    font-size: 4em;
    color: #ffd700;  /* CHANGE THIS TOO */
    /* ... other properties ... */
}
```

---

## H1 HEADING SIZE, WEIGHT, COLOR

### Font-Size
- [x] **H1 font-size set** | Value: 4em | Both pages: 4em | ✓ IDENTICAL
- [x] **Font-size is large enough** | 4em = ~64px | ✓ READABLE
- [x] **Letter-spacing consistent** | Value: 4px | Both pages: 4px | ✓ IDENTICAL

**RESULT:** ✓ PASS

### Font-Weight
- [x] **H1 font-weight set** | Value: 900 | Both pages: 900 | ✓ IDENTICAL
- [x] **Weight is bold** | 900 = extra bold | ✓ APPROPRIATE
- [x] **Weight matches brand** | Should be 700-900 | 900 is within range | ✓ PASS

**RESULT:** ✓ PASS

### H1 COLOR - CRITICAL ISSUE

- [x] **H1 color property set** | ✓ YES
- [x] **Current color value** | #d4a574 | ✓ FOUND
- [ ] **Color matches gold standard** | Required: #ffd700 | Current: #d4a574 | ✗ FAIL
- [ ] **Both pages use same (wrong) color** | #d4a574 on both | ✓ IDENTICALLY WRONG
- [x] **Subtitle uses correct gold** | #ffd700 | ✓ YES (correct)

**RESULT:** 🔴 CRITICAL FAIL - Color is TAN instead of GOLD

**Comparison:**
| Color | Hex | Type | Where Used | Correct? |
|-------|-----|------|-----------|----------|
| H1 text | #d4a574 | Tan/Saddle Brown | Both pages | ✗ NO |
| Subtitle | #ffd700 | Gold | Both pages | ✓ YES |
| Brand standard for H1 | #ffd700 | Gold | Spec | Required |

**Visual Impact:** The main "CARNIVORE WEEKLY" heading appears in warm tan instead of bright gold, inconsistent with brand identity.

---

## BACKGROUND COLOR

- [x] **Background gradient set** | linear-gradient(135deg, #4a2511 0%, #6d3819 50%, #8b4513 100%) | ✓ BOTH PAGES
- [x] **Darkest point** | #4a2511 (very dark brown) | Both pages: identical | ✓ PASS
- [x] **Midpoint** | #6d3819 (dark brown) | Both pages: identical | ✓ PASS
- [x] **Lightest point** | #8b4513 (saddle brown) | Both pages: identical | ✓ PASS
- [x] **Gradient angle** | 135 degrees | Both pages: 135 | ✓ IDENTICAL
- [x] **Visual consistency** | Same gradient appears on both | ✓ YES

**RESULT:** ✓ PASS

---

## BORDER STYLING

- [x] **Border-bottom property set** | 4px solid #8b4513 | Both pages: Yes | ✓ IDENTICAL
- [x] **Border color matches brand** | #8b4513 = saddle brown | ✓ APPROPRIATE
- [x] **Border thickness** | 4px | Both pages: 4px | ✓ IDENTICAL
- [x] **Border style** | solid | Both pages: solid | ✓ IDENTICAL
- [x] **Visual effect consistent** | Appears identical | ✓ YES

**RESULT:** ✓ PASS

---

## BOX SHADOW

- [x] **Box-shadow property set** | Yes | Both pages: Yes | ✓ IDENTICAL
- [x] **Primary shadow** | 0 10px 30px rgba(0,0,0,0.5) | Both pages: Yes | ✓ IDENTICAL
- [x] **Inset highlight** | inset 0 2px 0 rgba(255,255,255,0.1) | Both pages: Yes | ✓ IDENTICAL
- [x] **Shadow offset** | 0 10px | Both pages: 0 10px | ✓ IDENTICAL
- [x] **Shadow blur** | 30px | Both pages: 30px | ✓ IDENTICAL
- [x] **Shadow color opacity** | rgba(0,0,0,0.5) | Both pages: 50% black | ✓ IDENTICAL
- [x] **Visual depth created** | Yes, header appears elevated | ✓ IDENTICAL

**RESULT:** ✓ PASS

---

## PADDING & MARGINS

### Header Padding
- [x] **Top padding** | 30px | Both pages: 30px | ✓ IDENTICAL
- [x] **Right padding** | 0 | Both pages: 0 | ✓ IDENTICAL
- [x] **Bottom padding** | 20px | Both pages: 20px | ✓ IDENTICAL
- [x] **Left padding** | 0 | Both pages: 0 | ✓ IDENTICAL
- [x] **Visual spacing inside header** | Adequate whitespace | Both pages: identical | ✓ IDENTICAL

### Header Margin
- [x] **Header margin-bottom** | 25px | Both pages: 25px | ✓ IDENTICAL
- [x] **Space below header** | 25px gap before next section | Both pages: identical | ✓ IDENTICAL

### H1 Margin
- [x] **H1 top margin** | 15px | Both pages: 15px | ✓ IDENTICAL
- [x] **H1 bottom margin** | 10px | Both pages: 10px | ✓ IDENTICAL
- [x] **H1 spacing within header** | 15px top, 10px bottom | Both pages: identical | ✓ IDENTICAL

### Subtitle Margin
- [x] **Subtitle margin-bottom** | 5px | Both pages: 5px | ✓ IDENTICAL

**RESULT:** ✓ PASS

---

## LOGO POSITIONING & DIMENSIONS

### Position Properties
- [x] **Position property** | absolute | Both pages: absolute | ✓ IDENTICAL
- [x] **Top offset** | -100px | Both pages: -100px | ✓ IDENTICAL
- [x] **Right offset** | -140px | Both pages: -140px | ✓ IDENTICAL
- [x] **Z-index** | -1 (behind content) | Both pages: -1 | ✓ IDENTICAL

### Size Properties
- [x] **Width** | 750px | Both pages: 750px | ✓ IDENTICAL
- [x] **Height** | 410px | Both pages: 410px | ✓ IDENTICAL
- [x] **Aspect-ratio CSS** | 750 / 410 (1.829) | Both pages: explicit | ✓ IDENTICAL
- [x] **Max-width** | 750px | Both pages: 750px | ✓ IDENTICAL

### Object Properties
- [x] **Object-fit** | contain | Both pages: contain | ✓ IDENTICAL
- [x] **Object-position** | center | Both pages: center | ✓ IDENTICAL
- [x] **Opacity** | 0.95 | Both pages: 0.95 | ✓ IDENTICAL
- [x] **Pointer-events** | none | Both pages: none | ✓ IDENTICAL

### Visual Verification
- [x] **Logo centered visually** | Yes | Both pages: yes | ✓ IDENTICAL
- [x] **Logo appropriately sized** | 750x410 within 900x491 | ✓ FITS
- [x] **Logo not blocking text** | Z-index: -1 puts it behind | ✓ APPROPRIATE
- [x] **Logo maintains aspect ratio** | 1.829 = 1.83 ±2% | ✓ IN SPEC

**RESULT:** ✓ PASS

---

## SUBTITLE STYLING

- [x] **Subtitle element exists** | <p class="subtitle"> | Both pages: yes | ✓ YES
- [x] **Subtitle text** | "The Meat-Eater's Digest" | Both pages: identical | ✓ IDENTICAL
- [x] **Font-size** | 1.5em | Both pages: 1.5em | ✓ IDENTICAL
- [x] **Font-style** | italic | Both pages: italic | ✓ IDENTICAL
- [x] **Color** | #ffd700 (GOLD) | Both pages: #ffd700 | ✓ CORRECT
- [x] **Margin-bottom** | 5px | Both pages: 5px | ✓ IDENTICAL
- [x] **Visual appearance** | Golden, italicized, small | Both pages: identical | ✓ IDENTICAL

**RESULT:** ✓ PASS

---

## TEXT HIERARCHY

- [x] **H1 most prominent** | 4em, weight 900, gold (should be) | Both pages: yes | ✓ PASS
- [x] **Subtitle secondary** | 1.5em, italic, gold | Both pages: yes | ✓ PASS
- [x] **Logo tertiary** | Behind text, decorative | Both pages: yes | ✓ PASS
- [x] **Clear visual priority** | H1 > Subtitle > Logo (background) | Both pages: yes | ✓ PASS

**RESULT:** ✓ PASS (Text hierarchy correct, but H1 color undermines prominence)

---

## ACCESSIBILITY CHECKS

### Color Contrast
- [x] **Current H1 contrast** | Tan (#d4a574) on brown gradient | Fair but suboptimal
- [ ] **Required H1 contrast** | Gold (#ffd700) on brown gradient | Better contrast
- [x] **Subtitle contrast** | Gold (#ffd700) on brown gradient | Good contrast
- [x] **Text readability** | Large and bold | ✓ READABLE

### Semantic HTML
- [x] **Header element used** | <header> | Both pages: yes | ✓ PASS
- [x] **H1 element used** | <h1> (correct semantic) | Both pages: yes | ✓ PASS
- [x] **Logo alt text** | "Carnivore Weekly Logo" | Both pages: descriptive | ✓ PASS
- [x] **Alt text clarity** | Describes image purpose | Both pages: yes | ✓ PASS

### Visual Design
- [x] **Visual hierarchy clear** | H1 prominent, subtitle secondary | ✓ YES
- [x] **Spacing adequate** | Whitespace not cramped | ✓ YES
- [x] **Font sizes accessible** | 4em H1, 1.5em subtitle, 64px+ | ✓ YES

**RESULT:** ✓ PASS (Will improve if H1 color fixed)

---

## OVERALL VALIDATION SUMMARY

| Category | Status | Notes |
|----------|--------|-------|
| **Header Height** | ✓ PASS | Identical 180px on both |
| **Logo Aspect Ratio** | ✓ PASS | 1.833 within 1.83 ±2% |
| **H1 Font-Family** | 🔴 FAIL | Font not applied via CSS |
| **H1 Font-Size** | ✓ PASS | 4em on both pages |
| **H1 Font-Weight** | ✓ PASS | 900 on both pages |
| **H1 Color** | 🔴 FAIL | #d4a574 instead of #ffd700 |
| **Background Color** | ✓ PASS | Identical gradient on both |
| **Border Styling** | ✓ PASS | 4px saddle brown on both |
| **Padding/Margins** | ✓ PASS | All spacing identical |
| **Logo Positioning** | ✓ PASS | Identical on both pages |
| **Logo Sizing** | ✓ PASS | 750x410 on both pages |
| **Subtitle Styling** | ✓ PASS | Gold color, italic on both |
| **Text Hierarchy** | ✓ PASS | Clear hierarchy maintained |
| **Accessibility** | ✓ PASS | Will improve with color fix |

---

## CRITICAL ISSUES TO FIX

### Issue 1: H1 Font-Family Missing
- **Location:** /public/style-2026.css, header h1 rule
- **Problem:** No font-family property defined
- **Solution:** Add `font-family: 'Playfair Display', serif;`

### Issue 2: H1 Color Wrong
- **Location:** /public/style-2026.css, header h1 rule
- **Problem:** Color is #d4a574 (tan) instead of #ffd700 (gold)
- **Solution:** Change `color: #d4a574;` to `color: #ffd700;`

---

## CONCLUSION

**Current Status:** 🔴 BLOCKED (2 Critical Issues)

**Banners are visually identical** on both pages (they use the same CSS file), but the styling contains **two critical violations of brand standards:**

1. H1 heading color is tan (#d4a574) instead of gold (#ffd700)
2. H1 font-family is not explicitly set to Playfair Display

**Fix Required:** Edit `/public/style-2026.css` header h1 rule to:
```css
header h1 {
    color: #ffd700;  /* CHANGE: from #d4a574 */
    font-family: 'Playfair Display', serif;  /* ADD: missing property */
    font-size: 4em;
    margin: 15px 0 10px 0;
    font-weight: 900;
    letter-spacing: 4px;
    text-shadow: 3px 3px 6px rgba(0,0,0,0.7);
}
```

**Post-Fix Status:** Will be ✓ APPROVED

---

**Validation Date:** 2026-01-04
**Validator:** Jordan (QA Authority)
**File Generated:** BANNER_ELEMENT_CHECKLIST.md
