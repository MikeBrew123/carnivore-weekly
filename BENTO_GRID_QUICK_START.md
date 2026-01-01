# Bento Grid CSS System - Quick Start Guide

**For:** Carnivore Weekly Homepage Redesign
**Status:** Complete and Ready for Implementation
**Created:** December 31, 2025

---

## What You Have

A complete Bento Grid CSS system with comprehensive documentation covering:
- Production-ready CSS (copy-paste ready)
- Responsive design across 3 breakpoints (desktop, tablet, mobile)
- Animations and interactions
- Full accessibility compliance (WCAG AA)
- Performance optimization guidelines
- Complete implementation workflow

---

## Essential Files

### Primary Documentation

1. **BENTO_GRID_SPECIFICATION.md** (2,548 lines)
   - Complete technical specification
   - All CSS code examples
   - Detailed explanations
   - Accessibility guidelines
   - Performance notes
   - **Use this:** For complete reference

2. **BENTO_GRID_SUMMARY.md** (438 lines)
   - Executive overview
   - Document structure guide
   - Key statistics and metrics
   - Quick navigation tips
   - **Use this:** For understanding the big picture

3. **BENTO_GRID_QUICK_START.md** (this file)
   - Fast implementation path
   - Essential copy-paste code
   - Quick reference tables
   - Common troubleshooting
   - **Use this:** To get started immediately

---

## 5-Minute Setup

### Step 1: Copy the CSS

Find the "Complete CSS Class Definitions" section in BENTO_GRID_SPECIFICATION.md (line 1559) and copy the entire CSS block. Paste into a new file or add to your existing stylesheet.

Key classes included:
```
.bento-grid
.bento-item
.bento-item--hero
.bento-item--featured
.bento-item--standard
.bento-item--tall
```

### Step 2: Create HTML

Wrap your content in a grid:

```html
<section class="container">
    <div class="bento-grid">
        <!-- Hero item -->
        <article class="bento-item bento-item--hero">
            <div>
                <h1>Main Title</h1>
                <p>Description text here</p>
            </div>
            <a href="#" class="cta">Call to Action</a>
        </article>

        <!-- Featured item -->
        <article class="bento-item bento-item--featured">
            <h2>Featured Section</h2>
            <p>Description text here</p>
        </article>

        <!-- Standard item -->
        <article class="bento-item bento-item--standard">
            <h3>Standard Section</h3>
            <p>Description text here</p>
            <a href="#" class="read-more">Read More</a>
        </article>
    </div>
</section>
```

### Step 3: Test

Open in browser and resize to test responsiveness:
- 1400px (desktop) - 3 columns
- 768px (tablet) - 2 columns
- 375px (mobile) - 1 column

Done!

---

## Grid Layout Quick Reference

### Desktop (1400px)
```
┌────────────┬──────────┐
│   Hero     │ Featured │
│  (2x2)     │  (1x1)   │
├──┬──┬──────┴──────────┤
│S │S │  Standard  (2x) │
└──┴──┴────────────────┘
```

### Tablet (768px)
```
┌────────────────────────┐
│   Hero (2x1)           │
├───────────┬────────────┤
│ Featured  │ Featured   │
├───────────┼────────────┤
│ Standard  │ Standard   │
└───────────┴────────────┘
```

### Mobile (375px)
```
┌─────────┐
│  Hero   │
├─────────┤
│Featured │
├─────────┤
│Standard │
├─────────┤
│Standard │
└─────────┘
```

---

## Component Classes

### Main Classes

**`.bento-grid`** - Container
- `display: grid`
- `grid-template-columns: repeat(3, 1fr)` (desktop)
- `gap: 40px` (desktop), `30px` (tablet), `20px` (mobile)

**`.bento-item`** - Base styling
- Gradient background: `linear-gradient(135deg, #d4a574 0%, #c49a6c 100%)`
- Border: `3px solid #8b4513`
- Leather texture via ::before pseudo-element
- Hover lift: `transform: translateY(-4px)`

### Item Types

| Class | Size (Desktop) | Size (Tablet) | Size (Mobile) |
|-------|---|---|---|
| `.bento-item--hero` | 2x2 cells | 2x1 | 1x1 |
| `.bento-item--featured` | 2x1 | 1x1 | 1x1 |
| `.bento-item--standard` | 1x1 | 1x1 | 1x1 |
| `.bento-item--tall` | 1x2 | 1x1 | 1x1 |

---

## Color Values (Carnivore Weekly Palette)

```css
#1a120b  - Dark background
#2c1810  - Body text
#d4a574  - Accent tan (primary)
#c49a6c  - Tan dark (secondary)
#8b4513  - Brown (borders)
#ffd700  - Gold (emphasis)
#f4e4d4  - Light tan (light text)
```

---

## Typography

**Headings:** Playfair Display
**Body:** Merriweather

### Font Sizes

| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| H1 (Hero) | 3.2em | 2.4em | 2em |
| H2 (Featured) | 2.2em | 1.8em | 1.6em |
| H3 (Standard) | 1.6em | 1.5em | 1.3em |
| Body | 1.4em→0.95em | 1.1em→0.95em | 1em→0.9em |

---

## Spacing Rules

| Property | Desktop | Tablet | Mobile |
|----------|---------|--------|--------|
| Grid gap | 40px | 30px | 20px |
| Item padding | 20px | 20px | 18px |
| Container padding | 20px | 15px | 12px |

---

## Responsive Breakpoints

**Mobile breakpoints:**
```css
@media (max-width: 767px)      /* Phones */
@media (max-width: 1099px)     /* Tablets */
@media (min-width: 1100px)     /* Desktops */
```

**Custom media queries:**
```css
@media (orientation: landscape)         /* Device orientation */
@media (hover: hover)                   /* Pointer devices */
@media (hover: none)                    /* Touch devices */
@media (prefers-reduced-motion: reduce) /* Accessibility */
@media (prefers-color-scheme: dark)     /* Dark mode */
```

---

## Animations

**Hover lift:**
```css
.bento-item:hover {
    transform: translateY(-4px);
    transition: all 0.3s ease;
}
```

**Button hover:**
```css
.bento-item--hero .cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}
```

**Page load (optional):**
```css
@keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.bento-item {
    animation: fadeInUp 0.6s ease forwards;
}
```

---

## Common Patterns

### Hero + Featured Layout

```html
<div class="bento-grid">
    <!-- Hero takes left 2x2 -->
    <article class="bento-item bento-item--hero">
        <h1>Main Title</h1>
        <p>Description</p>
        <a href="#" class="cta">Learn More</a>
    </article>

    <!-- Featured fills top-right -->
    <article class="bento-item bento-item--featured">
        <h2>Secondary</h2>
        <p>Description</p>
    </article>

    <!-- Standard items fill bottom -->
    <article class="bento-item bento-item--standard">
        <h3>Item</h3>
        <p>Description</p>
        <a href="#" class="read-more">Read</a>
    </article>
</div>
```

### Featured with Image

```html
<article class="bento-item bento-item--featured">
    <img src="image.jpg"
         srcset="img-sm.jpg 600w, img-lg.jpg 1200w"
         alt="Description of the image"
         loading="lazy">
    <h2>Title</h2>
    <p>Description</p>
</article>
```

### Tall Item (1x2 on desktop)

```html
<article class="bento-item bento-item--standard bento-item--tall">
    <h3>Extended Section</h3>
    <p>This item spans two rows on desktop.</p>
    <!-- More content -->
</article>
```

---

## Testing Checklist

- [ ] Copy CSS and verify no console errors
- [ ] Test HTML structure renders correctly
- [ ] Resize browser to test all breakpoints:
  - [ ] 1400px (desktop)
  - [ ] 1099px (tablet)
  - [ ] 768px (tablet)
  - [ ] 375px (mobile)
- [ ] Test 1080px viewport (above-fold target)
- [ ] Verify 5-7 items fit without scroll
- [ ] Test hover effects work on desktop
- [ ] Test keyboard navigation (Tab key)
- [ ] Check color contrast ratios (4.5:1+)
- [ ] Test on actual mobile device
- [ ] Run Lighthouse audit
- [ ] Cross-browser test (Chrome, Safari, Firefox, Edge)

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 90+ |
| First Contentful Paint (FCP) | < 1.8s |
| Largest Contentful Paint (LCP) | < 2.5s |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Accessibility Score | 90+ |

---

## Troubleshooting

### Items not spanning correctly
**Cause:** Missing `display: grid` on parent
**Fix:** Verify `.bento-grid` has `display: grid;`

### Gap spacing looks wrong
**Cause:** Media query breakpoint mismatch
**Fix:** Check max-width values match spec (767px, 1099px)

### Text hard to read on background
**Cause:** Content z-index issue with texture overlay
**Fix:** Ensure `.bento-item > *` has `position: relative; z-index: 1;`

### Mobile layout broken
**Cause:** Grid spans not reset
**Fix:** Add `grid-column: span 1 !important;` in mobile media query

### Animations disabled
**Cause:** User prefers reduced motion
**Fix:** This is intentional for accessibility - don't force animations

### Images not scaling
**Cause:** Missing responsive image setup
**Fix:** Use `srcset` and `aspect-ratio` CSS property

---

## Getting Full Details

For complete specifications, refer to the main documentation:

- **Grid System Details:** BENTO_GRID_SPECIFICATION.md, section "Grid System Architecture"
- **All CSS Code:** BENTO_GRID_SPECIFICATION.md, section "Code Examples"
- **Accessibility:** BENTO_GRID_SPECIFICATION.md, section "Accessibility Considerations"
- **Advanced Techniques:** BENTO_GRID_SPECIFICATION.md, section "Advanced Responsive Techniques"
- **Implementation Steps:** BENTO_GRID_SPECIFICATION.md, section "Implementation Workflow"

---

## Design System Values

**Premium Editorial Aesthetic:**
- Generous spacing
- Classic typography
- Leather-textured appearance
- Sophisticated color palette
- No trendy elements
- Performance-optimized

**Responsive Strategy:**
- Mobile-first base styles
- Progressive enhancement
- Touch-friendly targets
- Desktop optimization
- Landscape support
- Notch support

---

## Next Steps

1. **Immediate:** Copy the CSS and test in your project
2. **Short-term:** Implement HTML structure with your content
3. **Testing:** Run through the testing checklist
4. **Refinement:** Customize colors/typography if needed
5. **Deployment:** Merge to production with confidence

---

## Key Resources

| Document | Purpose | Length |
|----------|---------|--------|
| BENTO_GRID_SPECIFICATION.md | Complete reference | 2,548 lines |
| BENTO_GRID_SUMMARY.md | Overview & navigation | 438 lines |
| BENTO_GRID_QUICK_START.md | This file - fast start | 400 lines |

---

## Contact & Support

For implementation questions, refer to:
1. BENTO_GRID_SPECIFICATION.md (complete specifications)
2. BENTO_GRID_SUMMARY.md (navigation and overview)
3. Troubleshooting section in BENTO_GRID_SPECIFICATION.md

---

**Status:** Complete and ready for production implementation
**Last Updated:** December 31, 2025
**Version:** 1.0

All CSS is production-ready. No dependencies or frameworks required. Fully responsive. WCAG AA accessible.

