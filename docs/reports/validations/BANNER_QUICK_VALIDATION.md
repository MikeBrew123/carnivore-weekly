# Banner Validation - Quick Summary

## Pages Compared
- **wiki.html** vs **calculator.html**
- Both use `/public/style-2026.css` (shared styling)

## Results

### PASS - Layout & Structure
| Element | Status | Details |
|---------|--------|---------|
| Header height | ✓ | 180px min-height on both |
| Header background | ✓ | Identical gradient on both |
| Logo aspect ratio | ✓ | 1.833 (within 1.83 ±2%) |
| Logo file | ✓ | Same /images/logo.png on both |
| Logo position | ✓ | Identical absolute positioning |
| Spacing/padding | ✓ | All identical on both pages |
| Subtitle styling | ✓ | Gold color, italic, 1.5em on both |
| Border styling | ✓ | 4px saddle brown on both |
| Box shadow | ✓ | Identical depth effect on both |

### CRITICAL FAILURES - Color & Font
| Element | Current | Required | Status |
|---------|---------|----------|--------|
| H1 color | #d4a574 (TAN) | #ffd700 (GOLD) | 🔴 FAIL |
| H1 font-family | Not set | Playfair Display, serif | 🔴 FAIL |

## The Problem

**Both pages have the SAME error** (shared CSS file):

```css
/* WRONG - Current code */
header h1 {
    color: #d4a574;  /* TAN instead of GOLD */
    font-size: 4em;
    /* Missing: font-family: 'Playfair Display', serif; */
}
```

## The Fix

**File:** `/Users/mbrew/Developer/carnivore-weekly/public/style-2026.css`

**Replace header h1 rule with:**

```css
header h1 {
    color: #ffd700;  /* GOLD - brand standard */
    font-family: 'Playfair Display', serif;  /* Add this line */
    font-size: 4em;
    margin: 15px 0 10px 0;
    font-weight: 900;
    letter-spacing: 4px;
    text-shadow: 3px 3px 6px rgba(0,0,0,0.7);
}
```

## Impact

- Fixes H1 on BOTH wiki.html and calculator.html
- Improves accessibility (gold > tan contrast on brown background)
- Ensures Playfair Display font displays correctly
- One change fixes all pages using .header-2026 class

## Validation Status

**Current:** 🔴 BLOCKED (Critical issues)
**After fix:** ✓ APPROVED (Will pass validation)

---

**Validated by:** Jordan
**Date:** 2026-01-04
