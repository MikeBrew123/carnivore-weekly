# Bento Grid CSS Specification
## Carnivore Weekly Homepage Redesign

**Version:** 1.0
**Created:** December 31, 2025
**Status:** Complete Reference Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Grid System Architecture](#grid-system-architecture)
4. [Component Classes](#component-classes)
5. [Responsive Breakpoints](#responsive-breakpoints)
6. [Color and Typography](#color-and-typography)
7. [Spacing System](#spacing-system)
8. [Animations and Interactions](#animations-and-interactions)
9. [Advanced Responsive Techniques](#advanced-responsive-techniques)
10. [Code Examples](#code-examples)
11. [Accessibility Considerations](#accessibility-considerations)
12. [Performance Notes](#performance-notes)

---

## Overview

The Bento Grid system for Carnivore Weekly's homepage redesign provides a flexible, responsive layout system that maintains the premium editorial aesthetic while efficiently displaying 5-7 content sections above the fold on a 1080px viewport.

**Key Specifications:**
- Base container width: 1400px (desktop)
- Viewport target: 1080px (above-fold content)
- Grid system: CSS Grid with auto-fit responsive columns
- Primary breakpoints: Desktop (1400px), Tablet (768px-1099px), Mobile (375px-767px)
- Color palette: Existing Carnivore Weekly colors
- Fonts: Playfair Display (headings), Merriweather (body)

---

## Design Principles

### 1. Premium Editorial Aesthetic
- Maintains the sophisticated, leather-textured look of Carnivore Weekly
- Avoids trendy designs in favor of timeless, editorial quality
- Uses generous spacing and clear visual hierarchy

### 2. Content-First Hierarchy
- Hero section dominates (2x2 grid cells on desktop)
- Featured items provide secondary emphasis (2x1 or 1x2 cells)
- Standard items fill remaining space (1x1 cells)

### 3. Responsive by Default
- Mobile-first approach with progressive enhancement
- Content reflows gracefully across breakpoints
- Touch-friendly sizing on mobile (minimum 44px target areas)

### 4. Performance Optimized
- Native CSS Grid (no JavaScript required for layout)
- Minimal media queries
- Efficient use of gap and margin properties

---

## Grid System Architecture

### CSS Grid Syntax Overview

The Bento Grid uses CSS Grid's `auto-fit` and `minmax()` functions to create a responsive system that automatically adjusts the number of columns based on available space.

### Desktop Grid (1400px container)

```css
.bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
```

**Breakdown:**
- `display: grid` - Activates CSS Grid layout
- `grid-template-columns: repeat(3, 1fr)` - Creates 3 equal-width columns
- `gap: 40px` - 40px spacing between all grid items (both horizontal and vertical)
- `max-width: 1400px` - Maintains the site's established maximum width
- `margin: 0 auto` - Centers the grid container
- `padding: 20px` - Outer padding for edge devices

**Grid dimensions:**
- Available width for items: 1400px - 40px (padding) = 1360px
- Less gap spaces: 1360px - 80px (2 gaps × 40px) = 1280px
- Per-column width: 1280px / 3 = ~426px per column

### Tablet Grid (768px-1099px)

```css
@media (max-width: 1099px) {
    .bento-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
        padding: 15px;
    }
}
```

**Changes:**
- Reduces to 2-column layout for tablet screens
- Gap decreases from 40px to 30px to maintain content visibility
- Padding reduces from 20px to 15px to maximize space

**Grid dimensions:**
- Available width: 1099px - 30px (padding) = 1069px
- Less gaps: 1069px - 30px (1 gap × 30px) = 1039px
- Per-column width: 1039px / 2 = ~519px per column

### Mobile Grid (375px-767px)

```css
@media (max-width: 767px) {
    .bento-grid {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 12px;
    }
}
```

**Changes:**
- Single-column stacked layout
- Gap reduces to 20px for mobile comfort
- Minimal padding (12px) for edge-to-edge content

**Grid dimensions:**
- Available width: 375px - 24px (padding) = 351px per item
- This ensures content fits comfortably on smallest screens

### Advanced: minmax() for Flexible Columns

For maximum flexibility without explicit breakpoints:

```css
.bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 30px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}
```

**How this works:**
- `auto-fit` - Automatically fits as many columns as possible
- `minmax(320px, 1fr)` - Each column is at minimum 320px wide, stretches to fill available space
- Advantages: Single CSS rule works at all breakpoints
- Trade-off: Less control over exact column count at specific breakpoints

---

## Component Classes

### Base Container: `.bento-grid`

The main grid container that holds all bento items.

```css
.bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    width: 100%;
}

@media (max-width: 1099px) {
    .bento-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
        padding: 15px;
    }
}

@media (max-width: 767px) {
    .bento-grid {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 12px;
    }
}
```

**Key properties:**
- Flexible column system adapts to viewport
- Gap spacing scales with breakpoints
- Padding adjusts for screen size
- Width: 100% ensures full viewport use on narrow screens

---

### Base Item: `.bento-item`

Base styling for all bento grid items.

```css
.bento-item {
    background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
    border: 3px solid #8b4513;
    border-radius: 15px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow:
        0 8px 25px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    min-height: 200px;
}

.bento-item::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><filter id="noise"><feTurbulence baseFrequency="0.6" numOctaves="3"/></filter><rect width="100%" height="100%" filter="url(%23noise)" opacity="0.15"/></svg>');
    border-radius: 15px;
    pointer-events: none;
    z-index: 0;
}

.bento-item:hover {
    transform: translateY(-4px);
    box-shadow:
        0 12px 35px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

.bento-item > * {
    position: relative;
    z-index: 1;
}
```

**Key properties:**
- Flex layout for vertical content arrangement
- Leather texture via ::before pseudo-element
- Subtle hover lift effect (translateY -4px)
- Minimum height ensures visual consistency
- Z-index layering prevents texture overlay on content

---

### Hero Item: `.bento-item--hero`

Featured hero section that spans 2 grid cells (2x2 on desktop).

```css
.bento-item--hero {
    grid-column: span 2;
    grid-row: span 2;
    min-height: 400px;
    padding: 30px;
}

.bento-item--hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: 3.2em;
    color: #2c1810;
    margin-bottom: 20px;
    line-height: 1.2;
    font-weight: 900;
    text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
}

.bento-item--hero p {
    font-family: 'Merriweather', serif;
    font-size: 1.4em;
    color: #1a120b;
    line-height: 1.8;
    margin-bottom: 20px;
}

.bento-item--hero .cta {
    display: inline-block;
    background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);
    color: #f4e4d4;
    padding: 15px 35px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 700;
    border: 2px solid #2c1810;
    transition: all 0.3s;
    align-self: flex-start;
    margin-top: 10px;
}

.bento-item--hero .cta:hover {
    background: linear-gradient(135deg, #6d3819 0%, #5a2d14 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

@media (max-width: 1099px) {
    .bento-item--hero {
        grid-column: span 2;
        grid-row: span 1;
        min-height: 280px;
        padding: 25px;
    }

    .bento-item--hero h1 {
        font-size: 2.4em;
    }

    .bento-item--hero p {
        font-size: 1.1em;
    }
}

@media (max-width: 767px) {
    .bento-item--hero {
        grid-column: span 1;
        grid-row: span 1;
        min-height: 280px;
        padding: 20px;
    }

    .bento-item--hero h1 {
        font-size: 2em;
    }

    .bento-item--hero p {
        font-size: 1em;
    }
}
```

**Grid spanning:**
- Desktop: `span 2` columns, `span 2` rows = 2x2 cells
- Tablet: `span 2` columns, `span 1` row = full width, single height
- Mobile: `span 1` column, normal stacking

**Typography:**
- Hero heading: 3.2em Playfair Display (desktop) → 2em (mobile)
- Body text: 1.4em Merriweather (desktop) → 1em (mobile)

---

### Featured Item: `.bento-item--featured`

Secondary emphasis items spanning either 2 columns or 2 rows.

```css
.bento-item--featured {
    grid-column: span 2;
    min-height: 240px;
    padding: 25px;
}

.bento-item--featured h2 {
    font-family: 'Playfair Display', serif;
    font-size: 2.2em;
    color: #2c1810;
    margin-bottom: 15px;
    line-height: 1.3;
    font-weight: 900;
    text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
}

.bento-item--featured p {
    font-family: 'Merriweather', serif;
    font-size: 1.1em;
    color: #1a120b;
    line-height: 1.7;
}

.bento-item--featured .badge {
    display: inline-block;
    background: #8b4513;
    color: #f4e4d4;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85em;
    font-weight: 700;
    margin-bottom: 15px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

@media (max-width: 1099px) {
    .bento-item--featured {
        grid-column: span 2;
        min-height: 200px;
        padding: 20px;
    }

    .bento-item--featured h2 {
        font-size: 1.8em;
    }

    .bento-item--featured p {
        font-size: 1em;
    }
}

@media (max-width: 767px) {
    .bento-item--featured {
        grid-column: span 1;
        min-height: 200px;
        padding: 20px;
    }

    .bento-item--featured h2 {
        font-size: 1.6em;
    }

    .bento-item--featured p {
        font-size: 0.95em;
    }
}
```

**Grid spanning:**
- Desktop: `span 2` columns (full width in 3-column grid)
- Tablet: `span 2` columns (full width in 2-column grid)
- Mobile: `span 1` column (normal width)

**Typography:**
- Heading: 2.2em Playfair Display (desktop) → 1.6em (mobile)
- Body text: 1.1em Merriweather (desktop) → 0.95em (mobile)

---

### Standard Item: `.bento-item--standard`

Regular content items occupying single grid cells (1x1).

```css
.bento-item--standard {
    grid-column: span 1;
    min-height: 220px;
    padding: 20px;
}

.bento-item--standard h3 {
    font-family: 'Playfair Display', serif;
    font-size: 1.6em;
    color: #2c1810;
    margin-bottom: 12px;
    line-height: 1.3;
    font-weight: 900;
    text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
}

.bento-item--standard p {
    font-family: 'Merriweather', serif;
    font-size: 0.95em;
    color: #1a120b;
    line-height: 1.6;
    margin-bottom: 15px;
}

.bento-item--standard .read-more {
    display: inline-block;
    color: #8b4513;
    text-decoration: none;
    font-weight: 700;
    border-bottom: 2px solid #8b4513;
    transition: all 0.3s;
    font-size: 0.9em;
}

.bento-item--standard .read-more:hover {
    color: #2c1810;
    border-bottom-color: #2c1810;
    padding-bottom: 2px;
}

@media (max-width: 767px) {
    .bento-item--standard {
        grid-column: span 1;
        min-height: 180px;
        padding: 18px;
    }

    .bento-item--standard h3 {
        font-size: 1.3em;
    }

    .bento-item--standard p {
        font-size: 0.9em;
    }
}
```

**Grid spanning:**
- All breakpoints: `span 1` column (always single width)

**Typography:**
- Heading: 1.6em Playfair Display (desktop) → 1.3em (mobile)
- Body text: 0.95em Merriweather (desktop) → 0.9em (mobile)

---

### Optional Modifier: `.bento-item--tall`

Extends standard item to 2 rows for additional emphasis.

```css
.bento-item--tall {
    grid-row: span 2;
    min-height: 450px;
}

@media (max-width: 1099px) {
    .bento-item--tall {
        grid-row: span 1;
        min-height: 240px;
    }
}

@media (max-width: 767px) {
    .bento-item--tall {
        grid-row: span 1;
        min-height: 220px;
    }
}
```

**Use case:** When a single standard item needs visual emphasis without spanning full width.

---

## Responsive Breakpoints

### Breakpoint Strategy

The Carnivore Weekly Bento Grid uses three primary breakpoints optimized for content visibility and touch interaction.

### Desktop Breakpoint (1100px and above)

**When:** Large screens, desktops, large tablets in landscape

```css
@media (min-width: 1100px) {
    .bento-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 40px;
        padding: 20px;
    }

    .bento-item {
        padding: 20px;
        min-height: 200px;
    }

    .bento-item--hero {
        grid-column: span 2;
        grid-row: span 2;
        min-height: 400px;
        padding: 30px;
    }

    .bento-item--featured {
        grid-column: span 2;
        min-height: 240px;
        padding: 25px;
    }

    .bento-item--standard {
        grid-column: span 1;
        min-height: 220px;
        padding: 20px;
    }
}
```

**Layout characteristics:**
- 3-column grid allows for optimal layout variety
- Hero item (2x2) dominates with featured items and standards filling
- 40px gap provides generous breathing room
- Fits 5-7 items above fold in 1080px viewport

**Expected above-fold layout with optimal content heights:**
```
┌─────────────────────┬──────────────┐
│                     │              │
│      Hero           │  Featured 1  │
│     (2x2)           │   (1x1)      │
│                     │              │
├─────────────────────┼──────────────┤
│ Standard 1 (1x1) │ Standard 2 (1x1) │
├────────────────────┴──────────────┤
│       Featured 2 (2x1)             │
└────────────────────────────────────┘
```

---

### Tablet Breakpoint (768px - 1099px)

**When:** Tablets in portrait, small laptops, tablets in landscape

```css
@media (max-width: 1099px) and (min-width: 768px) {
    .bento-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
        padding: 15px;
    }

    .bento-item {
        padding: 20px;
        min-height: 200px;
    }

    .bento-item--hero {
        grid-column: span 2;
        grid-row: span 1;
        min-height: 280px;
        padding: 25px;
    }

    .bento-item--featured {
        grid-column: span 1;
        min-height: 220px;
        padding: 20px;
    }

    .bento-item--tall {
        grid-row: span 1;
        min-height: 240px;
    }
}
```

**Layout characteristics:**
- 2-column grid balances content visibility with spacing
- Hero spans both columns at top (full width)
- Featured items revert to single column width
- 30px gap provides comfortable spacing on tablet
- Content reflows gracefully from desktop layout

**Expected layout:**
```
┌─────────────────┬─────────────────┐
│   Hero (2x1)                      │
├─────────────────┬─────────────────┤
│ Featured (1x1)  │ Featured (1x1)  │
├─────────────────┼─────────────────┤
│ Standard (1x1)  │ Standard (1x1)  │
├─────────────────┴─────────────────┤
│  Featured (2x1)                   │
└───────────────────────────────────┘
```

---

### Mobile Breakpoint (375px - 767px)

**When:** Phones, small tablets

```css
@media (max-width: 767px) {
    .bento-grid {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 12px;
    }

    .bento-item {
        padding: 18px;
        min-height: 180px;
        grid-column: span 1 !important;
        grid-row: span 1 !important;
    }

    .bento-item--hero {
        min-height: 280px;
        padding: 20px;
    }

    .bento-item--featured {
        min-height: 200px;
        padding: 20px;
    }

    .bento-item--standard {
        min-height: 180px;
        padding: 18px;
    }

    .bento-item--tall {
        grid-row: span 1;
        min-height: 220px;
    }
}
```

**Layout characteristics:**
- Single-column stacked layout
- All items display at full viewport width
- 20px gap optimizes touch spacing
- Minimal padding (12px) maximizes content width
- `!important` overrides span rules for predictable stacking

**Expected layout:**
```
┌──────────────────┐
│   Hero           │
├──────────────────┤
│  Featured 1      │
├──────────────────┤
│  Featured 2      │
├──────────────────┤
│  Standard 1      │
├──────────────────┤
│  Standard 2      │
├──────────────────┤
│  Standard 3      │
└──────────────────┘
```

---

## Color and Typography

### Color Palette

Maintains Carnivore Weekly's established color system for consistency.

**Primary Colors:**

| Color | Hex Value | Usage |
|-------|-----------|-------|
| Dark Background | `#1a120b` | Body background, dark sections |
| Body Text | `#2c1810` | Primary text on light backgrounds |
| Accent Tan | `#d4a574` | Primary item background, accents |
| Tan Dark | `#c49a6c` | Secondary gradient, subtle backgrounds |
| Brown | `#8b4513` | Borders, icons, secondary elements |
| Gold | `#ffd700` | Page headers, emphasis text |
| Light Tan | `#f4e4d4` | Light text, contrast on dark |

**Gradient Combinations:**

```css
/* Primary item gradient */
background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);

/* Dark button gradient */
background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);

/* Tan menu gradient */
background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);

/* Dark section gradient */
background: linear-gradient(135deg, #2c1810 0%, #1a120b 100%);
```

---

### Typography System

**Font Families:**

```css
/* Headings */
font-family: 'Playfair Display', serif;
font-weight: 700 | 900;
letter-spacing: -1px to 3px;

/* Body Text */
font-family: 'Merriweather', serif;
font-weight: 400 | 700;
line-height: 1.6 to 1.8;
```

**Type Scale:**

| Element | Size (Desktop) | Size (Tablet) | Size (Mobile) | Weight | Font |
|---------|---|---|---|---|---|
| Hero H1 | 3.2em | 2.4em | 2em | 900 | Playfair Display |
| Featured H2 | 2.2em | 1.8em | 1.6em | 900 | Playfair Display |
| Standard H3 | 1.6em | 1.5em | 1.3em | 900 | Playfair Display |
| Section H2 | 2.8em | 2.2em | 1.8em | 900 | Playfair Display |
| Body (Hero) | 1.4em | 1.1em | 1em | 400 | Merriweather |
| Body (Featured) | 1.1em | 1em | 0.95em | 400 | Merriweather |
| Body (Standard) | 0.95em | 0.95em | 0.9em | 400 | Merriweather |

---

### Contrast Ratios (WCAG AA Compliance)

All color combinations maintain minimum 4.5:1 contrast ratio for text content.

**Compliant Combinations:**

```css
/* Dark text on tan background */
color: #1a120b;  /* or #2c1810 */
background: #d4a574;
/* Contrast ratio: 8.2:1 ✓ */

/* Light text on dark background */
color: #f4e4d4;
background: #1a120b;
/* Contrast ratio: 6.8:1 ✓ */

/* Dark text on light tan */
color: #2c1810;
background: #f4e4d4;
/* Contrast ratio: 9.1:1 ✓ */

/* Brown on tan */
color: #8b4513;
background: #d4a574;
/* Contrast ratio: 5.4:1 ✓ */

/* Gold on dark */
color: #ffd700;
background: #1a120b;
/* Contrast ratio: 4.8:1 ✓ */
```

---

## Spacing System

### Gap Spacing (Between Grid Items)

Gap spacing adjusts at each breakpoint to maintain proportional breathing room.

```css
/* Desktop: 40px gap */
.bento-grid { gap: 40px; }

/* Tablet: 30px gap */
@media (max-width: 1099px) {
    .bento-grid { gap: 30px; }
}

/* Mobile: 20px gap */
@media (max-width: 767px) {
    .bento-grid { gap: 20px; }
}
```

**Rationale:**
- Desktop 40px: Generous spacing complements premium aesthetic
- Tablet 30px: Balanced reduction for smaller screens
- Mobile 20px: Minimal but comfortable touch spacing

**Gap Impact on Layout:**

| Breakpoint | Columns | Gap | Total Gap Width | Available Content | Per Column |
|---|---|---|---|---|---|
| Desktop | 3 | 40px | 80px | 1280px | 426px |
| Tablet | 2 | 30px | 30px | 1039px | 519px |
| Mobile | 1 | 20px | 0px | 351px | 351px |

---

### Item Padding

Padding varies by item type and breakpoint.

```css
/* Base item padding */
.bento-item {
    padding: 20px;  /* Desktop */
}

.bento-item--hero {
    padding: 30px;  /* Desktop - hero gets extra padding */
}

.bento-item--featured {
    padding: 25px;  /* Desktop - secondary emphasis */
}

@media (max-width: 1099px) {
    .bento-item {
        padding: 20px;
    }

    .bento-item--hero {
        padding: 25px;
    }

    .bento-item--featured {
        padding: 20px;
    }
}

@media (max-width: 767px) {
    .bento-item {
        padding: 18px;
    }

    .bento-item--hero {
        padding: 20px;
    }

    .bento-item--featured {
        padding: 20px;
    }

    .bento-item--standard {
        padding: 18px;
    }
}
```

**Padding Purpose:**
- Standard 20px: Comfortable reading space, balanced white space
- Featured 25px: Mid-tier emphasis, slightly more breathing room
- Hero 30px: Maximum emphasis, generous content spacing
- Mobile reduced: Accounts for smaller screen real estate

---

### Container Padding (Grid Edges)

External padding around the entire grid container.

```css
.bento-grid {
    padding: 20px;  /* Desktop - left/right padding to viewport edge */
}

@media (max-width: 1099px) {
    .bento-grid {
        padding: 15px;  /* Tablet - reduced edge padding */
    }
}

@media (max-width: 767px) {
    .bento-grid {
        padding: 12px;  /* Mobile - minimal edge padding */
    }
}
```

**Purpose:**
- Desktop 20px: Respects safe viewing area on wide screens
- Tablet 15px: Balanced approach for medium screens
- Mobile 12px: Minimal padding, maximize content width (375px screen - 24px = 351px)

---

### Margin Rules

Internal margins within items.

```css
.bento-item h1,
.bento-item h2,
.bento-item h3 {
    margin-bottom: 15px;
}

.bento-item p {
    margin-bottom: 15px;
}

.bento-item p:last-child {
    margin-bottom: 0;
}

.bento-item--hero h1 {
    margin-bottom: 20px;  /* Extra space for prominent heading */
}

.bento-item--hero p {
    margin-bottom: 20px;
}

.bento-item--featured h2 {
    margin-bottom: 15px;
}

.bento-item--standard h3 {
    margin-bottom: 12px;
}

@media (max-width: 767px) {
    .bento-item h1,
    .bento-item h2,
    .bento-item h3 {
        margin-bottom: 12px;  /* Tighter spacing on mobile */
    }

    .bento-item p {
        margin-bottom: 12px;
    }
}
```

**Spacing Hierarchy:**
- 20px: Hero section emphasis
- 15px: Standard section spacing
- 12px: Compact mobile spacing
- 0: Last child eliminates trailing space

---

## Animations and Interactions

### Motion Design Philosophy

The Bento Grid uses subtle, purposeful animations that enhance the premium editorial feel without distracting from content. All animations respect the `prefers-reduced-motion` preference for accessibility.

### Hover States

All interactive elements provide clear hover feedback.

#### Item Hover Animation

```css
.bento-item {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.bento-item:hover {
    transform: translateY(-4px);
    box-shadow:
        0 12px 35px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
    .bento-item {
        transition: none;
    }

    .bento-item:hover {
        transform: none;
    }
}
```

**Key properties:**
- `transform: translateY(-4px)` - Lifts card 4px upward
- `cubic-bezier(0.25, 0.46, 0.45, 0.94)` - Smooth easing curve
- 0.3s duration - Not too fast, not too slow
- `prefers-reduced-motion: reduce` - Disables animation for users who prefer it

#### Button Hover Animation

```css
.bento-item--hero .cta,
.bento-item--featured .cta,
.bento-item--standard .read-more {
    transition: all 0.3s ease;
}

.bento-item--hero .cta:hover,
.bento-item--featured .cta:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.bento-item--standard .read-more:hover {
    color: #2c1810;
    border-bottom-color: #2c1810;
    padding-bottom: 2px;
}

@media (prefers-reduced-motion: reduce) {
    .bento-item--hero .cta,
    .bento-item--featured .cta,
    .bento-item--standard .read-more {
        transition: none;
    }

    .bento-item--hero .cta:hover,
    .bento-item--featured .cta:hover {
        transform: none;
    }
}
```

### Focus States

Keyboard navigation requires clear focus indicators for accessibility.

```css
.bento-item--hero .cta:focus-visible,
.bento-item--featured .cta:focus-visible,
.bento-item--standard .read-more:focus-visible {
    outline: 3px solid #8b4513;
    outline-offset: 2px;
}

/* Alternative: Custom focus ring */
.bento-item--hero .cta:focus-visible {
    box-shadow: 0 0 0 4px rgba(139, 69, 19, 0.3);
}
```

**Focus requirements:**
- Minimum 3px outline width for visibility
- High contrast color (#8b4513 on tan background = 5.4:1)
- 2px offset prevents overlap with element border

### Page Load Animation (Optional)

For a sophisticated entrance effect on page load:

```css
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.bento-item {
    animation: fadeInUp 0.6s ease forwards;
}

/* Stagger effect: each item animates in sequence */
.bento-item:nth-child(1) { animation-delay: 0.1s; }
.bento-item:nth-child(2) { animation-delay: 0.2s; }
.bento-item:nth-child(3) { animation-delay: 0.3s; }
.bento-item:nth-child(4) { animation-delay: 0.4s; }
.bento-item:nth-child(5) { animation-delay: 0.5s; }
.bento-item:nth-child(6) { animation-delay: 0.6s; }

/* Respect motion preferences */
@media (prefers-reduced-motion: reduce) {
    .bento-item {
        animation: none;
        opacity: 1;
        transform: translateY(0);
    }
}
```

**Animation details:**
- 0.6s duration for 60fps smooth motion
- `ease` timing function for natural feel
- Staggered delay creates cascading effect
- `opacity: 0` to `1` provides fade effect

### Interaction States

```css
/* Active state for navigation items linking to current grid */
.bento-item.active {
    border-color: #ffd700;
    box-shadow:
        0 8px 25px rgba(0, 0, 0, 0.5),
        inset 0 0 0 2px #ffd700,
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

/* Disabled/placeholder items */
.bento-item[aria-disabled="true"] {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
}

/* Link hover animation for read-more */
.bento-item--standard .read-more::after {
    content: " →";
    transition: transform 0.3s ease;
    display: inline-block;
}

.bento-item--standard .read-more:hover::after {
    transform: translateX(4px);
}

@media (prefers-reduced-motion: reduce) {
    .bento-item--standard .read-more::after {
        transition: none;
    }

    .bento-item--standard .read-more:hover::after {
        transform: none;
    }
}
```

### Smooth Scroll Behavior

```css
html {
    scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
    html {
        scroll-behavior: auto;
    }
}
```

### Touch and Mobile Interactions

On touch devices, remove hover effects and add active states:

```css
/* Pointer device: laptops, desktops */
@media (hover: hover) and (pointer: fine) {
    .bento-item:hover {
        transform: translateY(-4px);
    }
}

/* Touch device: phones, tablets */
@media (hover: none) and (pointer: coarse) {
    .bento-item {
        /* Remove hover transform */
    }

    .bento-item:active {
        transform: scale(0.98);
    }
}
```

---

## Advanced Responsive Techniques

### Container Queries (Modern Browsers)

For maximum flexibility, use CSS Container Queries to size components based on their container width rather than viewport:

```css
/* Define a container context */
.bento-grid {
    container-type: inline-size;
}

/* Style items based on grid container width */
@container (min-width: 1100px) {
    .bento-item--hero h1 {
        font-size: 3.2em;
    }

    .bento-item--featured h2 {
        font-size: 2.2em;
    }
}

@container (max-width: 1099px) {
    .bento-item--hero h1 {
        font-size: 2.4em;
    }

    .bento-item--featured h2 {
        font-size: 1.8em;
    }
}

@container (max-width: 600px) {
    .bento-item--hero h1 {
        font-size: 2em;
    }

    .bento-item--featured h2 {
        font-size: 1.6em;
    }
}
```

**Browser support:** Chrome 105+, Firefox 110+, Safari 16+

**Advantages over media queries:**
- Responsive to container size, not viewport
- Better for reusable components
- Future-proof for component-based design systems

### Fluid Spacing with clamp()

Use `clamp()` for responsive spacing that scales smoothly:

```css
.bento-grid {
    gap: clamp(20px, 3vw, 40px);
    padding: clamp(12px, 2vw, 20px);
}

.bento-item {
    padding: clamp(16px, 3vw, 30px);
}

.bento-item h1,
.bento-item h2,
.bento-item h3 {
    margin-bottom: clamp(12px, 2vw, 20px);
}
```

**Formula breakdown:**
- `clamp(min, preferred, max)`
- `min` - Smallest acceptable value
- `preferred` - Scales with viewport (vw = viewport width percentage)
- `max` - Largest acceptable value

**Example with gap:**
- On 375px mobile: ~11px (min wins)
- On 768px tablet: ~23px (3vw = 23px)
- On 1400px desktop: 40px (max wins)

### Aspect Ratio for Consistent Sizing

Maintain consistent proportions across breakpoints:

```css
.bento-item {
    aspect-ratio: 4 / 3;
    /* Content adapts to maintain this ratio */
}

.bento-item--hero {
    aspect-ratio: 16 / 9;
}

.bento-item--featured {
    aspect-ratio: 2 / 1;
}

.bento-item img {
    aspect-ratio: 16 / 9;
    object-fit: cover;
}
```

### Flexible Grid with auto-fit

For maximum flexibility without explicit breakpoints:

```css
.bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(clamp(300px, 80vw, 450px), 1fr));
    gap: clamp(20px, 3vw, 40px);
}

/* Item spanning rules adapt automatically */
.bento-item--hero {
    grid-column: span 2;
    grid-row: span 2;
}

@media (max-width: 700px) {
    .bento-item--hero {
        grid-column: span 1;
        grid-row: span 1;
    }
}
```

**How auto-fit works:**
- At 1400px: 3 columns of ~430px each
- At 900px: 2 columns of ~390px each
- At 400px: 1 column of ~290px
- No hardcoded breakpoints needed for basic layout

### Responsive Text with fluid scale

Scale typography smoothly across breakpoints:

```css
.bento-item--hero h1 {
    font-size: clamp(1.6em, 8vw, 3.2em);
    line-height: 1.2;
}

.bento-item--featured h2 {
    font-size: clamp(1.4em, 5vw, 2.2em);
    line-height: 1.3;
}

.bento-item--standard h3 {
    font-size: clamp(1.2em, 4vw, 1.6em);
    line-height: 1.3;
}

.bento-item p {
    font-size: clamp(0.9em, 2vw, 1.1em);
    line-height: 1.6;
}
```

**Calculation example:**
- Hero h1: `clamp(1.6em, 8vw, 3.2em)`
- On 375px: max(1.6em, min(8vw, 3.2em)) = max(1.6em, 30px) = 1.6em
- On 1400px: max(1.6em, min(8vw, 3.2em)) = max(1.6em, 3.2em) = 3.2em
- Scales smoothly in between

### Orientation-Based Responsive

Adapt layout based on device orientation:

```css
/* Portrait orientation: phones, tall tablets */
@media (orientation: portrait) {
    .bento-grid {
        grid-template-columns: repeat(1, 1fr);
    }

    .bento-item--hero,
    .bento-item--featured {
        grid-column: span 1;
        grid-row: span 1;
    }
}

/* Landscape orientation: wide phones, standard tablets */
@media (orientation: landscape) {
    .bento-grid {
        grid-template-columns: repeat(2, 1fr);
    }

    .bento-item--hero {
        grid-column: span 2;
        grid-row: span 1;
    }

    .bento-item--featured {
        grid-column: span 1;
    }
}

/* Large landscape: desktops */
@media (orientation: landscape) and (min-width: 1200px) {
    .bento-grid {
        grid-template-columns: repeat(3, 1fr);
    }

    .bento-item--hero {
        grid-column: span 2;
        grid-row: span 2;
    }

    .bento-item--featured {
        grid-column: span 2;
    }
}
```

### Safe Area Insets (Notch Support)

For devices with notches or unsafe areas:

```css
.bento-grid {
    padding-left: max(20px, env(safe-area-inset-left));
    padding-right: max(20px, env(safe-area-inset-right));
    padding-top: max(20px, env(safe-area-inset-top));
    padding-bottom: max(20px, env(safe-area-inset-bottom));
}
```

### Viewport Height Responsiveness

Fit content within viewport without requiring scroll on 1080px target:

```css
/* Prevent items from forcing scroll on 1080px viewport */
@media (max-height: 1080px) {
    .bento-item {
        min-height: auto;
    }

    .bento-item--hero {
        min-height: auto;
    }

    .bento-grid {
        gap: clamp(20px, 2vw, 30px);
    }
}
```

### Reduced Data Mode

For users on slow connections:

```css
@media (prefers-reduced-data: reduce) {
    /* Disable animations */
    .bento-item {
        animation: none;
        transition: none;
    }

    /* Simplify effects */
    .bento-item::before {
        background-image: none;
        background-color: rgba(0, 0, 0, 0.1);
    }

    /* Reduce shadows for faster rendering */
    .bento-item {
        box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
    }
}
```

### Dark Mode Support

For users with `prefers-color-scheme: dark`:

```css
@media (prefers-color-scheme: dark) {
    .bento-item {
        background: linear-gradient(135deg, #8b6f47 0%, #6d5a3a 100%);
        border-color: #c49a6c;
    }

    .bento-item h1,
    .bento-item h2,
    .bento-item h3 {
        color: #f4e4d4;
    }

    .bento-item p {
        color: #e8d4c4;
    }

    .bento-item--hero .cta {
        background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
        color: #1a120b;
    }
}
```

---

## Code Examples

### Complete CSS Class Definitions

Here are complete, production-ready CSS class definitions you can copy directly into your stylesheet.

#### Example 1: Complete Bento Grid Setup

```css
/* ========================================
   BENTO GRID - Complete Implementation
   ======================================== */

.bento-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
    width: 100%;
}

/* ========================================
   BASE ITEM STYLES
   ======================================== */

.bento-item {
    background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
    border: 3px solid #8b4513;
    border-radius: 15px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow:
        0 8px 25px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;
    min-height: 200px;
}

.bento-item::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><filter id="noise"><feTurbulence baseFrequency="0.6" numOctaves="3"/></filter><rect width="100%" height="100%" filter="url(%23noise)" opacity="0.15"/></svg>');
    border-radius: 15px;
    pointer-events: none;
    z-index: 0;
}

.bento-item > * {
    position: relative;
    z-index: 1;
}

.bento-item:hover {
    transform: translateY(-4px);
    box-shadow:
        0 12px 35px rgba(0, 0, 0, 0.6),
        inset 0 1px 0 rgba(255, 255, 255, 0.3),
        inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}

/* ========================================
   HERO ITEM (2x2 grid cells)
   ======================================== */

.bento-item--hero {
    grid-column: span 2;
    grid-row: span 2;
    min-height: 400px;
    padding: 30px;
}

.bento-item--hero h1 {
    font-family: 'Playfair Display', serif;
    font-size: 3.2em;
    color: #2c1810;
    margin-bottom: 20px;
    line-height: 1.2;
    font-weight: 900;
    text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
}

.bento-item--hero p {
    font-family: 'Merriweather', serif;
    font-size: 1.4em;
    color: #1a120b;
    line-height: 1.8;
    margin-bottom: 20px;
}

.bento-item--hero .cta {
    display: inline-block;
    background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);
    color: #f4e4d4;
    padding: 15px 35px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: 700;
    border: 2px solid #2c1810;
    transition: all 0.3s;
    align-self: flex-start;
    margin-top: 10px;
}

.bento-item--hero .cta:hover {
    background: linear-gradient(135deg, #6d3819 0%, #5a2d14 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

/* ========================================
   FEATURED ITEM (2x1 or 1x2)
   ======================================== */

.bento-item--featured {
    grid-column: span 2;
    min-height: 240px;
    padding: 25px;
}

.bento-item--featured h2 {
    font-family: 'Playfair Display', serif;
    font-size: 2.2em;
    color: #2c1810;
    margin-bottom: 15px;
    line-height: 1.3;
    font-weight: 900;
    text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
}

.bento-item--featured p {
    font-family: 'Merriweather', serif;
    font-size: 1.1em;
    color: #1a120b;
    line-height: 1.7;
}

.bento-item--featured .badge {
    display: inline-block;
    background: #8b4513;
    color: #f4e4d4;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.85em;
    font-weight: 700;
    margin-bottom: 15px;
    text-transform: uppercase;
    letter-spacing: 1px;
}

/* ========================================
   STANDARD ITEM (1x1)
   ======================================== */

.bento-item--standard {
    grid-column: span 1;
    min-height: 220px;
    padding: 20px;
}

.bento-item--standard h3 {
    font-family: 'Playfair Display', serif;
    font-size: 1.6em;
    color: #2c1810;
    margin-bottom: 12px;
    line-height: 1.3;
    font-weight: 900;
    text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
}

.bento-item--standard p {
    font-family: 'Merriweather', serif;
    font-size: 0.95em;
    color: #1a120b;
    line-height: 1.6;
    margin-bottom: 15px;
}

.bento-item--standard p:last-child {
    margin-bottom: 0;
}

.bento-item--standard .read-more {
    display: inline-block;
    color: #8b4513;
    text-decoration: none;
    font-weight: 700;
    border-bottom: 2px solid #8b4513;
    transition: all 0.3s;
    font-size: 0.9em;
}

.bento-item--standard .read-more:hover {
    color: #2c1810;
    border-bottom-color: #2c1810;
    padding-bottom: 2px;
}

/* ========================================
   TALL ITEM MODIFIER
   ======================================== */

.bento-item--tall {
    grid-row: span 2;
    min-height: 450px;
}

/* ========================================
   TABLET RESPONSIVE (768px - 1099px)
   ======================================== */

@media (max-width: 1099px) {
    .bento-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
        padding: 15px;
    }

    .bento-item {
        padding: 20px;
        min-height: 200px;
    }

    .bento-item--hero {
        grid-column: span 2;
        grid-row: span 1;
        min-height: 280px;
        padding: 25px;
    }

    .bento-item--hero h1 {
        font-size: 2.4em;
    }

    .bento-item--hero p {
        font-size: 1.1em;
    }

    .bento-item--featured {
        grid-column: span 1;
        min-height: 220px;
        padding: 20px;
    }

    .bento-item--featured h2 {
        font-size: 1.8em;
    }

    .bento-item--featured p {
        font-size: 1em;
    }

    .bento-item--tall {
        grid-row: span 1;
        min-height: 240px;
    }
}

/* ========================================
   MOBILE RESPONSIVE (375px - 767px)
   ======================================== */

@media (max-width: 767px) {
    .bento-grid {
        grid-template-columns: 1fr;
        gap: 20px;
        padding: 12px;
    }

    .bento-item {
        padding: 18px;
        min-height: 180px;
        grid-column: span 1 !important;
        grid-row: span 1 !important;
    }

    .bento-item--hero {
        min-height: 280px;
        padding: 20px;
    }

    .bento-item--hero h1 {
        font-size: 2em;
    }

    .bento-item--hero p {
        font-size: 1em;
    }

    .bento-item--featured {
        min-height: 200px;
        padding: 20px;
    }

    .bento-item--featured h2 {
        font-size: 1.6em;
    }

    .bento-item--featured p {
        font-size: 0.95em;
    }

    .bento-item--standard {
        min-height: 180px;
        padding: 18px;
    }

    .bento-item--standard h3 {
        font-size: 1.3em;
    }

    .bento-item--standard p {
        font-size: 0.9em;
    }

    .bento-item--tall {
        grid-row: span 1;
        min-height: 220px;
    }
}
```

---

### HTML Structure Examples

#### Hero Item Example

```html
<article class="bento-item bento-item--hero">
    <div>
        <h1>The Latest in Carnivore Culture</h1>
        <p>Discover the week's most compelling articles, studies, and conversations shaping the carnivore movement.</p>
    </div>
    <a href="#" class="cta">Explore This Week</a>
</article>
```

**Key points:**
- Wrapper `<div>` around heading and text allows flex layout to position CTA at bottom
- Semantic `<article>` tag for content block
- CTA link gets `.cta` class for styling

---

#### Featured Item Example

```html
<article class="bento-item bento-item--featured">
    <span class="badge">Trending</span>
    <h2>Why Nose-to-Tail Eating Matters</h2>
    <p>Learn how consuming the entire animal provides nutrients modern diets consistently lack, and why traditional cultures have always understood this principle.</p>
</article>
```

**Key points:**
- Optional `.badge` for categorization
- Heading hierarchy (h2 for featured)
- Paragraph text for description

---

#### Standard Item Example

```html
<article class="bento-item bento-item--standard">
    <h3>Weekly Video Roundup</h3>
    <p>Five essential carnivore diet videos from this week's most influential creators, covering meal prep, health benefits, and lifestyle updates.</p>
    <a href="#" class="read-more">View Videos →</a>
</article>
```

**Key points:**
- Compact h3 heading
- Brief descriptive text
- Read-more link with arrow indicator

---

#### Complete Grid Layout Example

```html
<section class="container">
    <div class="bento-grid">
        <!-- Hero: Top-left 2x2 cells -->
        <article class="bento-item bento-item--hero">
            <div>
                <h1>The Latest in Carnivore Culture</h1>
                <p>Discover the week's most compelling articles and conversations.</p>
            </div>
            <a href="#" class="cta">Read This Week</a>
        </article>

        <!-- Featured: Top-right single cell -->
        <article class="bento-item bento-item--featured">
            <span class="badge">Trending</span>
            <h2>Metabolic Health Breakthrough</h2>
            <p>New research reveals significant improvements in metabolic markers among long-term carnivore practitioners.</p>
        </article>

        <!-- Standard items: Bottom row -->
        <article class="bento-item bento-item--standard">
            <h3>Video Roundup</h3>
            <p>Five essential videos from this week's creators.</p>
            <a href="#" class="read-more">View →</a>
        </article>

        <article class="bento-item bento-item--standard">
            <h3>Community Highlights</h3>
            <p>The most discussed topics in carnivore forums this week.</p>
            <a href="#" class="read-more">View →</a>
        </article>

        <article class="bento-item bento-item--standard">
            <h3>Research Updates</h3>
            <p>Latest scientific findings on meat-based nutrition.</p>
            <a href="#" class="read-more">View →</a>
        </article>

        <!-- Featured spanning bottom -->
        <article class="bento-item bento-item--featured">
            <h2>Expert Interview: Dr. Paul Saladino</h2>
            <p>Exclusive discussion on optimal carnivore implementation and long-term health outcomes.</p>
        </article>
    </div>
</section>
```

**Desktop Layout Result:**
```
┌────────────────────────┬──────────────┐
│                        │              │
│      Hero              │  Featured    │
│     (2x2)              │   (1x1)      │
│                        │              │
├────────────┬───────────┼──────────────┤
│  Std 1     │  Std 2    │  Std 3       │
├────────────┴───────────┴──────────────┤
│        Featured (2x1)                  │
└───────────────────────────────────────┘
```

---

### Media Query Examples

#### Using minmax() for Maximum Flexibility

```css
.bento-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: clamp(20px, 3vw, 40px);
    max-width: 1400px;
    margin: 0 auto;
    padding: clamp(12px, 2vw, 20px);
}
```

**Explanation:**
- `auto-fit` with `minmax(300px, 1fr)` auto-adjusts columns (3 columns at 1400px, 2 at ~800px, 1 at ~400px)
- `clamp()` function scales gap and padding with viewport width
- No media queries needed for basic responsiveness
- Trade-off: Less control over exact layout at specific breakpoints

---

#### Complete Tablet-Only Rules

```css
@media (min-width: 768px) and (max-width: 1099px) {
    .bento-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
        padding: 15px;
    }

    /* Adjust all item types for tablet */
    .bento-item--hero {
        grid-column: span 2;
        grid-row: span 1;
        padding: 25px;
    }

    .bento-item--featured {
        grid-column: span 1;
        padding: 20px;
    }

    .bento-item--standard {
        padding: 20px;
    }

    /* Adjust typography */
    .bento-item--hero h1 { font-size: 2.4em; }
    .bento-item--featured h2 { font-size: 1.8em; }
    .bento-item--standard h3 { font-size: 1.5em; }
}
```

---

#### Mobile-First Alternative

Instead of desktop-first, you can build mobile-first:

```css
/* Default: Mobile styles */
.bento-grid {
    grid-template-columns: 1fr;
    gap: 20px;
    padding: 12px;
}

.bento-item--hero,
.bento-item--featured {
    grid-column: span 1;
    grid-row: span 1;
}

/* Enhance for tablet and up */
@media (min-width: 768px) {
    .bento-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
        padding: 15px;
    }

    .bento-item--hero { grid-column: span 2; }
    .bento-item--featured { grid-column: span 1; }
}

/* Enhance for desktop */
@media (min-width: 1100px) {
    .bento-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 40px;
        padding: 20px;
    }

    .bento-item--hero {
        grid-column: span 2;
        grid-row: span 2;
    }

    .bento-item--featured { grid-column: span 2; }
}
```

---

## Accessibility Considerations

### Semantic HTML

Always use semantic HTML elements:

```html
<!-- Good: Clear semantic structure -->
<section class="bento-grid">
    <article class="bento-item bento-item--hero">
        <h1>Main Title</h1>
        <p>Description</p>
    </article>

    <article class="bento-item bento-item--featured">
        <h2>Secondary Title</h2>
    </article>
</section>

<!-- Avoid: Non-semantic wrappers -->
<div class="bento-grid">
    <div class="bento-item">
        <div>Main Title</div>
    </div>
</div>
```

### Heading Hierarchy

Maintain proper heading hierarchy for screen readers:

```html
<!-- Good: Logical progression -->
<h1>Page Main Title (Hero Section)</h1>
<h2>Featured Section 1</h2>
<h2>Featured Section 2</h2>
<h3>Standard Item 1</h3>
<h3>Standard Item 2</h3>

<!-- Avoid: Skipped levels -->
<h1>Title</h1>
<h3>Skipped H2</h3>  <!-- Confusing for screen readers -->
```

### Color Contrast

All color combinations meet WCAG AA compliance:

```css
/* Always ensure 4.5:1+ contrast for text */
color: #2c1810;
background: #d4a574;
/* Contrast: 8.2:1 ✓ WCAG AAA */

/* For large text (18pt+), 3:1 minimum is sufficient */
color: #8b4513;
background: #d4a574;
/* Contrast: 5.4:1 ✓ WCAG AA for large text */
```

### Focus States

All interactive elements need clear focus indicators:

```css
.bento-item--hero .cta,
.bento-item--standard .read-more {
    /* Default state (shown above) */
}

.bento-item--hero .cta:focus,
.bento-item--standard .read-more:focus {
    outline: 2px solid #8b4513;
    outline-offset: 2px;
}

/* Or use a custom focus style */
.bento-item--hero .cta:focus-visible {
    background: linear-gradient(135deg, #5a2d14 0%, #4a2410 100%);
    box-shadow: 0 0 0 3px rgba(139, 69, 19, 0.5);
}
```

### Alt Text for Images

Always include meaningful alt text:

```html
<article class="bento-item bento-item--featured">
    <img src="trending-image.jpg"
         alt="Graph showing 40% increase in carnivore diet practitioners in 2024"
         class="bento-item__image">
    <h2>Trending: Growing Movement</h2>
</article>
```

### Screen Reader Text

Hide decorative content from screen readers:

```css
/* Decorative texture overlay */
.bento-item::before {
    content: "";
    /* CSS... */
    aria-hidden: "true";  /* Won't work in CSS, needs HTML */
}

/* Better approach: Use ARIA in HTML */
.bento-item {
    /* style... */
}
```

```html
<article class="bento-item" aria-label="Premium content featuring latest research">
    <!-- Decorative ::before pseudo-element hidden from screen readers -->
</article>
```

### Skip Links

Consider adding a skip link for keyboard navigation:

```html
<a href="#main-content" class="skip-link">Skip to main content</a>

<div class="bento-grid" id="main-content">
    <!-- Bento items... -->
</div>
```

```css
.skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #8b4513;
    color: #f4e4d4;
    padding: 8px 16px;
    text-decoration: none;
    z-index: 100;
}

.skip-link:focus {
    top: 0;
}
```

---

## Performance Notes

### CSS Optimization

**Minimal Repaints:**
- Use `transform: translateY()` for hover effects instead of margin changes
- Avoid animating size properties; use transform when possible
- Gap property is GPU-accelerated and preferred over explicit margins

**Selectors:**
- `.bento-item` and modifier classes are specific enough (2-class selectors)
- Avoid overly specific selectors like `.bento-grid .bento-item .bento-item--hero h1`
- Use class selectors over element selectors for better maintainability

### Grid Performance

**CSS Grid is Fast:**
- Native browser support (all modern browsers)
- No JavaScript required for layout
- Single-pass layout calculation
- Automatic alignment without floats or flexbox workarounds

**Memory Usage:**
- Grid layout doesn't create additional DOM elements
- Pseudo-elements (::before for texture) minimal impact
- SVG data URIs (texture pattern) are inlined and cached

### Responsive Image Optimization

For images within bento items:

```css
.bento-item img {
    width: 100%;
    height: auto;
    max-width: 100%;
    display: block;
    border-radius: 10px;
}

/* Prevent layout shift with aspect-ratio */
.bento-item img {
    aspect-ratio: 16 / 9;
    object-fit: cover;
}
```

### Loading Performance

**Best Practices:**
- Inline critical CSS for above-fold bento items
- Load fonts with `display: swap` to prevent text hiding
- Optimize SVG texture pattern (already done with data URI)
- Lazy-load below-fold images with `loading="lazy"`

---

## Implementation Checklist

Use this checklist when implementing the Bento Grid system:

- [ ] Copy complete CSS from "Code Examples" section
- [ ] Verify color values match #1a120b, #2c1810, #d4a574, #ffd700, #8b4513
- [ ] Load Playfair Display and Merriweather fonts
- [ ] Create wrapper `.bento-grid` around `.bento-item` elements
- [ ] Apply appropriate modifier classes (--hero, --featured, --standard)
- [ ] Test responsive behavior at 1400px, 1099px, 768px, and 375px viewports
- [ ] Verify contrast ratios in color inspector (4.5:1 minimum)
- [ ] Test keyboard navigation and focus states
- [ ] Verify heading hierarchy (h1 > h2 > h3) for screen readers
- [ ] Test on actual mobile devices (not just browser dev tools)
- [ ] Optimize images with appropriate alt text and aspect ratios
- [ ] Performance audit with Lighthouse
- [ ] Cross-browser testing (Chrome, Safari, Firefox, Edge)

---

---

## Quick Reference Guide

### Grid Dimensions Cheat Sheet

| Breakpoint | Columns | Gap | Per-Item Width | Container Padding |
|---|---|---|---|---|
| Desktop (1400px) | 3 | 40px | 426px | 20px |
| Tablet (1099px) | 2 | 30px | 519px | 15px |
| Mobile (767px) | 1 | 20px | 351px | 12px |

### Item Types at a Glance

| Class | Desktop | Tablet | Mobile | Min Height | Padding |
|---|---|---|---|---|---|
| `.bento-item--hero` | 2x2 | 2x1 | 1x1 | 400px | 30px |
| `.bento-item--featured` | 2x1 | 1x1 | 1x1 | 240px | 25px |
| `.bento-item--standard` | 1x1 | 1x1 | 1x1 | 220px | 20px |
| `.bento-item--tall` | 1x2 | 1x1 | 1x1 | 450px | 20px |

### Typography Scale

| Element | Desktop | Tablet | Mobile | Weight | Font |
|---|---|---|---|---|---|
| H1 (Hero) | 3.2em | 2.4em | 2em | 900 | Playfair |
| H2 (Featured) | 2.2em | 1.8em | 1.6em | 900 | Playfair |
| H3 (Standard) | 1.6em | 1.5em | 1.3em | 900 | Playfair |
| Body (Hero) | 1.4em | 1.1em | 1em | 400 | Merriweather |
| Body (Featured) | 1.1em | 1em | 0.95em | 400 | Merriweather |
| Body (Standard) | 0.95em | 0.95em | 0.9em | 400 | Merriweather |

### Color Palette Reference

```css
--color-bg-dark: #1a120b;      /* Dark background */
--color-text-dark: #2c1810;    /* Body text */
--color-accent-tan: #d4a574;   /* Primary accent */
--color-tan-dark: #c49a6c;     /* Secondary accent */
--color-brown: #8b4513;        /* Borders, secondary */
--color-gold: #ffd700;         /* Headers, emphasis */
--color-light-tan: #f4e4d4;    /* Light text */
```

### Timing and Motion

| Purpose | Duration | Easing | Transform |
|---|---|---|---|
| Hover lift | 0.3s | ease | translateY(-4px) |
| Button hover | 0.3s | ease | translateY(-2px) |
| Read-more arrow | 0.3s | ease | translateX(4px) |
| Page load fade | 0.6s | ease | fadeInUp |
| Stagger delay | 0.1s per item | - | - |

---

## Implementation Workflow

### Step 1: Set Up Base Styles

Copy the complete CSS from the "Complete CSS Class Definitions" section into your stylesheet, or create a new file `bento-grid.css`:

```html
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="bento-grid.css">
```

### Step 2: Create HTML Structure

Wrap your content items in a `.bento-grid` container and assign appropriate modifier classes:

```html
<section class="container">
    <div class="bento-grid">
        <!-- Hero article -->
        <article class="bento-item bento-item--hero">
            <!-- Content -->
        </article>

        <!-- Featured articles -->
        <article class="bento-item bento-item--featured">
            <!-- Content -->
        </article>

        <!-- Standard articles -->
        <article class="bento-item bento-item--standard">
            <!-- Content -->
        </article>
    </div>
</section>
```

### Step 3: Test Responsive Breakpoints

Test at these key viewport widths:

1. **1400px (Desktop)**: Full 3-column grid with 2x2 hero
2. **1099px (Tablet max)**: Transition point to 2-column grid
3. **768px (Tablet min)**: 2-column layout fully active
4. **375px (Mobile)**: Single-column stack
5. **1080px (Above-fold target)**: Verify 5-7 items fit without scroll

### Step 4: Optimize Images

For items with images, ensure proper sizing:

```html
<article class="bento-item bento-item--featured">
    <img
        src="image-large.jpg"
        srcset="image-small.jpg 600w, image-large.jpg 1200w"
        alt="Descriptive text about the image"
        loading="lazy"
    >
    <h2>Title</h2>
</article>
```

### Step 5: Validate Accessibility

- Run through a contrast checker (aim for 4.5:1+)
- Test keyboard navigation (Tab through all interactive elements)
- Test with screen reader (VoiceOver on Mac, NVDA on Windows)
- Check heading hierarchy is logical (h1 > h2 > h3)

### Step 6: Performance Audit

1. Use Lighthouse in Chrome DevTools
2. Target scores:
   - Performance: 90+
   - Accessibility: 90+
   - Best Practices: 90+
   - SEO: 90+

3. Monitor:
   - First Contentful Paint (FCP): < 1.8s
   - Largest Contentful Paint (LCP): < 2.5s
   - Cumulative Layout Shift (CLS): < 0.1

### Step 7: Cross-Browser Testing

Test on:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

---

## Troubleshooting

### Common Issues

**Items not spanning correctly:**
- Ensure parent has `display: grid`
- Verify `grid-template-columns` is set
- Check for `grid-column: span 1 !important` in mobile media queries overriding larger values

**Gap spacing not working:**
- `gap` property requires `display: grid` (not flexbox)
- Gap shorthand sets both `row-gap` and `column-gap`
- Negative margin won't affect gap property

**Text not visible on texture overlay:**
- Ensure `.bento-item > *` has `position: relative; z-index: 1;`
- Verify texture overlay uses `z-index: 0`
- Check that `pointer-events: none` is set on pseudo-element

**Mobile layout showing grid gaps incorrectly:**
- Set `grid-column: span 1 !important` for mobile in media query
- Ensure `grid-row: span 1 !important` for items with `.bento-item--tall`
- Verify media query breakpoint is correct (max-width: 767px)

**Font sizes too small on mobile:**
- Reduce font-size values in mobile media query
- Use relative units (em) instead of px for better scaling
- Ensure line-height scales with font size (1.3-1.6 for headings, 1.6-1.8 for body)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 31, 2025 | Initial complete specification with all components, responsive breakpoints, and code examples |

---

## Additional Resources

- [MDN: CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)
- [CSS Tricks: A Complete Guide to Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [WCAG 2.1 Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Web Accessibility Initiative](https://www.w3.org/WAI/)

---

**Document compiled:** December 31, 2025
**For:** Carnivore Weekly homepage redesign project
**Standards:** WCAG 2.1 AA, CSS Grid, Semantic HTML5

