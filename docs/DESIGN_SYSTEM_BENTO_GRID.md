# Carnivore Weekly Design System
## Bento Grid Redesign Specification

**Last Updated:** December 31, 2025
**Version:** 1.0
**Status:** Active Design System
**Audience:** Designers, Developers, Product Managers
**Purpose:** Single source of truth for visual and component design across Carnivore Weekly

---

## TABLE OF CONTENTS

1. [Color System](#1-color-system)
2. [Typography System](#2-typography-system)
3. [Spacing System](#3-spacing-system)
4. [Component Library](#4-component-library)
5. [Responsive Design](#5-responsive-design)
6. [Visual Effects & Interactions](#6-visual-effects--interactions)
7. [Accessibility Standards](#7-accessibility-standards)
8. [Code Standards](#8-code-standards)
9. [Design Tokens](#9-design-tokens)
10. [Maintenance & Evolution](#10-maintenance--evolution)

---

## 1. COLOR SYSTEM

### Brand Philosophy

Carnivore Weekly maintains a dark, premium aesthetic with leather-textured sophistication. Colors evoke premium meat-based products (leather, gold, natural browns) while ensuring accessibility and readability for our 30-60 year old audience seeking evidence-based guidance.

### Primary Color Palette

| Name | Hex | RGB | WCAG Contrast | Usage |
|------|-----|-----|----------------|-------|
| **Dark Brown (Background)** | `#1a120b` | 26, 18, 11 | — | Primary page background, base color for all layouts |
| **Text Brown** | `#2c1810` | 44, 24, 16 | 12.2:1 vs white | Body text on light backgrounds, archive titles |
| **Tan Accent (Primary)** | `#d4a574` | 212, 165, 116 | 7.1:1 vs dark bg | Navigation links, secondary headings, section accents |
| **Gold Accent (Secondary)** | `#ffd700` | 255, 215, 0 | 13.8:1 vs dark bg | Primary headings (H1, H2), highlights, premium elements |
| **Light Text** | `#f4e4d4` | 244, 228, 212 | 14.2:1 vs dark bg | Body text on dark backgrounds, default paragraph color |
| **Border/Divider** | `#8b4513` | 139, 69, 19 | 6.4:1 vs dark bg | Visual separation, borders, emphasis lines |

### Semantic Color Naming & Usage

```
Background Layer:
├── --bg-primary: #1a120b (Page background)
├── --bg-secondary: #2c1810 (Cards, boxes on dark bg)
└── --bg-surface: #8b4513 (Elevated surfaces, headers)

Text Layer:
├── --text-primary: #f4e4d4 (Body text on dark)
├── --text-secondary: #2c1810 (Body text on light)
└── --text-accent: #d4a574 (Secondary emphasis)

Accent Layer:
├── --accent-gold: #ffd700 (Headings, primary CTA)
├── --accent-tan: #d4a574 (Links, secondary accents)
└── --accent-brown: #8b4513 (Borders, dividers)
```

### Color Application Examples

#### Text on Backgrounds

**Dark Background + Light Text (Default)**
```
Background: #1a120b
Text: #f4e4d4
Contrast: 14.2:1 (WCAG AAA ✓)
Use for: All body copy, paragraphs on dark backgrounds
```

**Light Background + Dark Text**
```
Background: #d4a574 (Tan/Featured sections)
Text: #2c1810
Contrast: 12.4:1 (WCAG AAA ✓)
Use for: Feature cards, sponsor banners, highlighted sections
```

#### Cards & Surfaces

**Featured Card (Bento Grid - Hero)**
```
Background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%)
Text: #2c1810
Border: 3px solid #8b4513
Shadow: 0 8px 25px rgba(0,0,0,0.5)
Padding: 30px
```

**Standard Card (Bento Grid - Regular)**
```
Background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%)
Text: #f4e4d4
Border: Left 6px solid #d4a574
Shadow: 0 5px 15px rgba(0,0,0,0.4)
Padding: 25px
```

#### Button & Interactive States

**Primary Button (CTA)**
```
Default:  Background: #d4a574, Text: #2c1810
Hover:    Background: #c49a6c, Text: #2c1810 (5% darker tan)
Active:   Background: #b88860, Text: #2c1810 (10% darker)
Focus:    Outline: 2px solid #ffd700
Disabled: Background: #8b4513, Text: #f4e4d4 (opacity: 0.5)
```

**Secondary Button (Navigation)**
```
Default:  Background: transparent, Border: 2px solid #d4a574, Text: #d4a574
Hover:    Border: 2px solid #ffd700, Text: #ffd700
Active:   Border-bottom: 3px solid #8b4513
```

### Color Accessibility Verification (WCAG AA)

All text meets **WCAG AA minimum 4.5:1 contrast ratio**:

| Combination | Ratio | Status |
|-------------|-------|--------|
| #f4e4d4 text on #1a120b bg | 14.2:1 | AAA ✓ |
| #2c1810 text on #d4a574 bg | 12.4:1 | AAA ✓ |
| #d4a574 text on #1a120b bg | 7.1:1 | AA ✓ |
| #ffd700 text on #1a120b bg | 13.8:1 | AAA ✓ |

**Forbidden combinations (fail AA):**
- ❌ #ffd700 on #d4a574 (1.8:1 ratio - insufficient)
- ❌ #8b4513 on #1a120b (2.1:1 ratio - insufficient for body text)

---

## 2. TYPOGRAPHY SYSTEM

### Font Stack & Imports

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;700&display=swap');

/* Fallback stack */
--font-display: 'Playfair Display', Georgia, serif;
--font-body: 'Merriweather', Georgia, serif;
```

**Font Loading Performance:**
- Playfair Display: Used only for headings (reduced font size impacts)
- Merriweather: Used for body (heavily optimized for readability at all sizes)
- System font fallback (Georgia) acceptable while loading completes

### Heading Scale (Playfair Display)

| Level | Desktop Size | Mobile Size | Line Height | Font Weight | Color | Usage | Rationale |
|-------|--------------|-------------|-------------|-------------|-------|-------|-----------|
| **H1** | 48px (2.8em) | 32px (1.8em) | 1.3 | 900 | #ffd700 | Page title, main heading | From Refined Traditional baseline; creates visual hierarchy anchor |
| **H2** | 32px (1.8em) | 24px (1.4em) | 1.4 | 700 | #ffd700 | Section heading | From Refined Traditional; consistent scaling (0.67x H1) |
| **H3** | 24px (1.4em) | 18px (1.2em) | 1.5 | 700 | #d4a574 | Subsection, card title | New size for Bento Grid; differentiates from H2 with tan color |
| **H4** | 18px (1.2em) | 16px (1em) | 1.6 | 700 | #d4a574 | Feature label, small heading | New for Bento Grid; used in card headers |

### Body Text Scale (Merriweather)

| Element | Size | Line Height | Font Weight | Color | Usage |
|---------|------|-------------|-------------|-------|-------|
| **Body Copy** | 16px (1em) | 1.8 | 400 | #f4e4d4 (dark bg) / #2c1810 (light bg) | Default paragraph text; optimized for readability |
| **Body Bold** | 16px (1em) | 1.8 | 700 | Same as context | Emphasis within paragraphs using `<strong>` |
| **Small Text** | 14px (0.9em) | 1.8 | 400 | #d4a574 | Meta information, bylines, captions, timestamps |
| **Extra Small** | 12px (0.75em) | 1.6 | 400 | #d4a574 (opacity: 0.8) | Labels, badges, small metadata |

### Letter Spacing

```css
/* Headings: Increased spacing for premium feel */
h1, h2 { letter-spacing: -1px; }   /* Tighter for elegance */
h3, h4 { letter-spacing: 0.5px; }  /* Slightly open */

/* Body: Minimal letter spacing for readability */
p { letter-spacing: 0; }

/* Navigation: Open spacing for emphasis */
.nav-menu a { letter-spacing: 1px; }
```

### Typography Examples

**Example 1: Blog Post Title**
```html
<h1 style="
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 48px;
  font-weight: 900;
  color: #ffd700;
  line-height: 1.3;
  margin-bottom: 20px;
">
  How to Break Weight Loss Plateaus on Carnivore
</h1>
```

**Example 2: Bento Card Title**
```html
<h3 style="
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 24px;
  font-weight: 700;
  color: #d4a574;
  line-height: 1.5;
  margin-bottom: 15px;
">
  Trending Topic
</h3>
```

**Example 3: Body Copy with Emphasis**
```html
<p style="
  font-family: 'Merriweather', Georgia, serif;
  font-size: 16px;
  color: #f4e4d4;
  line-height: 1.8;
  margin-bottom: 15px;
">
  Your fasting glucose is elevated, but here's what most doctors won't tell you:
  <strong>on carnivore, this number often goes up while your actual insulin sensitivity improves.</strong>
  Here's why, and what to actually watch instead.
</p>
```

### Font Weight Usage

| Weight | Hex | Usage | Examples |
|--------|-----|-------|----------|
| 400 (Regular) | Default | Body paragraphs, default text weight | `<p>`, `<li>`, body copy |
| 700 (Bold) | Bold headings, emphasis | `<h2>`, `<h3>`, `<strong>`, navigation links |
| 900 (Black) | H1 only | Main page title for maximum impact |

---

## 3. SPACING SYSTEM

### Spacing Grid Foundation

**Base Unit:** 10px (flexible multiplier system)

```
5px   = 0.5 units   (minimal spacing, internal card elements)
10px  = 1 unit      (tight spacing)
20px  = 2 units     (standard spacing, most common)
30px  = 3 units     (generous spacing)
40px  = 4 units     (large spacing, section separation)
50px  = 5 units     (extra large)
60px  = 6 units     (jumbo spacing, rare)
```

### Spacing Increments & Usage

| Size | CSS Value | When to Use | Example |
|------|-----------|-------------|---------|
| **5px** | `5px` | Micro-spacing inside dense components | Badge padding, tight button text |
| **10px** | `10px` | Minimal internal spacing | Icon-to-text gaps, internal card spacing |
| **20px** | `20px` | **STANDARD** - used 70% of time | Padding inside cards, gaps between grid items, paragraph margins |
| **30px** | `30px` | Generous internal spacing, featured cards | Padding in featured/hero cards, section padding |
| **40px** | `40px` | Major section separation | Margin between major sections, container padding |
| **50px** | `50px` | Large visual breaks | Top/bottom section spacing on desktop |
| **60px** | `60px` | Extra visual separation | Footer top margin, page gaps |

### Container & Padding Rules

```css
/* Page Container */
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;                /* Mobile */
}

@media (min-width: 768px) {
  .container {
    padding: 40px;              /* Tablet+ */
  }
}

@media (min-width: 1400px) {
  .container {
    padding: 60px 40px;         /* Desktop */
  }
}

/* Section Container */
.section {
  max-width: 100%;
  margin-bottom: 40px;          /* Spacing between sections */
}

/* Blog Post Container */
.blog-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 30px;                /* Mobile */
}

@media (min-width: 768px) {
  .blog-container {
    padding: 50px;              /* Tablet+ */
  }
}
```

### Card Padding Hierarchy

```css
/* Standard Card (Trending topics, regular content) */
.card {
  padding: 20px;                /* Standard card padding */
  margin-bottom: 20px;          /* Gap to next card */
}

/* Featured Card (Hero, main content) */
.card--featured {
  padding: 30px;                /* More breathing room */
  margin-bottom: 25px;
}

/* Compact Card (Metadata, bylines) */
.card--compact {
  padding: 15px 20px;           /* Reduced vertical padding */
  margin-bottom: 15px;
}

/* Dense Card (Badges, tags) */
.card--dense {
  padding: 10px 15px;           /* Minimal padding */
  margin-bottom: 10px;
}
```

### Grid Gaps & Layout Spacing

```css
/* Bento Grid Gaps */
.bento-grid {
  display: grid;
  gap: 20px;                    /* Standard gap between all grid items */
  margin-bottom: 40px;          /* Gap to next section */
}

/* 2-Column Layout */
.grid--2col {
  grid-template-columns: 1fr 1fr;
  gap: 25px;                    /* Slightly larger gap for 2-column */
}

/* 3-Column Layout */
.grid--3col {
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

/* Flexbox Spacing */
.flex-container {
  display: flex;
  gap: 20px;                    /* Standard flex gap */
  margin-bottom: 30px;
}
```

### Margin Rules

```css
/* Headings */
h1 { margin: 0 0 20px 0; }      /* Bottom margin creates breathing room */
h2 { margin: 30px 0 20px 0; }   /* Top margin for new sections */
h3 { margin: 20px 0 15px 0; }
h4 { margin: 15px 0 10px 0; }

/* Paragraphs */
p { margin: 0 0 15px 0; }       /* Bottom margin for spacing between paragraphs */
p:last-child { margin-bottom: 0; }

/* Lists */
ul, ol { margin: 0 0 20px 20px; }
li { margin-bottom: 10px; }

/* Forms */
input, textarea, select { margin-bottom: 20px; }
```

### Responsive Spacing Adjustments

```css
/* Mobile-first spacing */
.container { padding: 20px; }
.section { margin-bottom: 30px; }
.card { padding: 20px; }
gap: 20px;

/* Tablet (768px+) */
@media (min-width: 768px) {
  .container { padding: 30px; }
  .section { margin-bottom: 40px; }
  .card { padding: 25px; }
  gap: 25px;
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container { padding: 40px; }
  .section { margin-bottom: 50px; }
  .card { padding: 30px; }
  gap: 30px;
}

/* Large Desktop (1400px+) */
@media (min-width: 1400px) {
  .container { padding: 60px 40px; }
  .section { margin-bottom: 60px; }
  gap: 30px;
}
```

---

## 4. COMPONENT LIBRARY

### Card Components (Bento Grid Building Blocks)

#### Hero Card (Full-Width Feature)

**Purpose:** Feature trending topics, top videos, or main announcements

**Desktop Dimensions:** 100% width × 300px height
**Mobile Dimensions:** 100% width × 250px height
**Tablet Dimensions:** 100% width × 280px height

```css
.card--hero {
  background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
  border: 3px solid #8b4513;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 25px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.5),
              inset 0 1px 0 rgba(255,255,255,0.3),
              inset 0 -1px 0 rgba(0,0,0,0.3);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 300px;
}

.card--hero::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: url('data:image/svg+xml,...');
  opacity: 0.15;
  pointer-events: none;
}

.card--hero h2 {
  color: #2c1810;
  font-size: 28px;
  margin-bottom: 15px;
  position: relative;
  z-index: 2;
}

.card--hero p {
  color: #2c1810;
  font-size: 16px;
  line-height: 1.8;
  position: relative;
  z-index: 2;
}

.card--hero:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 35px rgba(0,0,0,0.6);
}

@media (max-width: 768px) {
  .card--hero {
    min-height: 250px;
    padding: 25px;
  }

  .card--hero h2 {
    font-size: 22px;
  }
}
```

#### Featured Card (Main Grid Item)

**Purpose:** Trending topics, highlighted discussions, important content

**Desktop Dimensions:** ~350px width × ~300px height (in 3-column grid)
**Mobile Dimensions:** 100% width × ~280px height (single column)

```css
.card--featured {
  background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);
  color: #f4e4d4;
  border-left: 6px solid #d4a574;
  border-radius: 10px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.4);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
}

.card--featured:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
}

.card--featured h3 {
  color: #f4e4d4;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 12px;
  line-height: 1.4;
}

.card--featured p {
  color: #f4e4d4;
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: 12px;
}

.card--featured .meta {
  font-size: 13px;
  color: #d4a574;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(212, 165, 116, 0.3);
  opacity: 0.9;
  font-style: italic;
}

@media (max-width: 768px) {
  .card--featured {
    padding: 20px;
    margin-bottom: 15px;
  }

  .card--featured h3 {
    font-size: 18px;
  }

  .card--featured p {
    font-size: 14px;
  }
}
```

#### Standard Card (Regular Content)

**Purpose:** News items, comments, standard grid items

**Desktop Dimensions:** ~280px width × ~240px height
**Mobile Dimensions:** 100% width × ~220px height

```css
.card {
  background: linear-gradient(135deg, #2c1810 0%, #1a120b 100%);
  color: #f4e4d4;
  border: 1px solid #8b4513;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
  position: relative;
}

.card:hover {
  border-color: #d4a574;
  box-shadow: 0 4px 12px rgba(212, 165, 116, 0.2);
  transform: translateY(-2px);
}

.card h4 {
  color: #d4a574;
  font-size: 16px;
  margin-bottom: 10px;
}

.card p {
  color: #f4e4d4;
  font-size: 14px;
  line-height: 1.7;
}

@media (max-width: 768px) {
  .card {
    padding: 18px;
    margin-bottom: 15px;
  }
}
```

#### Compact Card (Metadata/Tags)

**Purpose:** Badges, tags, small summaries

**Dimensions:** Flexible, typically 100-200px

```css
.card--compact {
  background: #8b4513;
  color: #f4e4d4;
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 13px;
  display: inline-block;
  margin: 5px 10px 5px 0;
  white-space: nowrap;
}

.card--compact:hover {
  background: #a55a1f;
  cursor: pointer;
}
```

### Button Components

#### Primary CTA Button

**Purpose:** Main call-to-action (subscribe, watch, read more)

**Dimensions:**
- Desktop: 150px width × 48px height
- Mobile: 140px width × 44px height

```css
.btn--primary {
  display: inline-block;
  background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
  color: #2c1810;
  padding: 14px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 700;
  font-size: 15px;
  border: 2px solid #8b4513;
  transition: all 0.2s ease;
  text-align: center;
  cursor: pointer;
  min-width: 150px;
  letter-spacing: 0.5px;
}

.btn--primary:hover {
  background: linear-gradient(135deg, #c49a6c 0%, #b88860 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(212, 165, 116, 0.4);
}

.btn--primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
}

.btn--primary:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}

.btn--primary:disabled {
  background: #8b4513;
  color: #f4e4d4;
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .btn--primary {
    padding: 12px 28px;
    font-size: 14px;
    min-width: 140px;
  }
}
```

#### Secondary Button (Navigation/Toggle)

**Purpose:** Secondary actions, navigation, less critical CTAs

**Dimensions:**
- Desktop: Flexible width
- Mobile: Full-width or 100px minimum

```css
.btn--secondary {
  display: inline-block;
  background: transparent;
  color: #d4a574;
  padding: 10px 20px;
  border: 2px solid #d4a574;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.btn--secondary:hover {
  color: #ffd700;
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.05);
}

.btn--secondary:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}

.btn--secondary.active {
  background: #d4a574;
  color: #2c1810;
}
```

#### Small Button (Utility)

**Purpose:** Small actions, filters, close buttons

**Dimensions:** 32px height (touch-friendly minimum)

```css
.btn--small {
  display: inline-block;
  padding: 8px 16px;
  background: #8b4513;
  color: #f4e4d4;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn--small:hover {
  background: #a55a1f;
}

.btn--small:focus {
  outline: 2px solid #ffd700;
}
```

### Form Components

#### Text Input

```css
input[type="text"],
input[type="email"],
input[type="search"],
textarea {
  width: 100%;
  padding: 12px 15px;
  background: #2c1810;
  color: #f4e4d4;
  border: 2px solid #8b4513;
  border-radius: 6px;
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  line-height: 1.6;
  transition: all 0.2s ease;
  margin-bottom: 15px;
}

input[type="text"]:focus,
input[type="email"]:focus,
textarea:focus {
  border-color: #d4a574;
  outline: 2px solid #d4a574;
  outline-offset: 1px;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}

input[type="text"]::placeholder,
textarea::placeholder {
  color: #8b4513;
  opacity: 0.7;
}
```

#### Checkbox / Radio

```css
input[type="checkbox"],
input[type="radio"] {
  width: 18px;
  height: 18px;
  margin-right: 8px;
  cursor: pointer;
  accent-color: #d4a574;
}

input[type="checkbox"]:focus,
input[type="radio"]:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}
```

#### Select Dropdown

```css
select {
  width: 100%;
  padding: 12px 15px;
  background: #2c1810;
  color: #f4e4d4;
  border: 2px solid #8b4513;
  border-radius: 6px;
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 15px;
}

select:focus {
  border-color: #d4a574;
  outline: 2px solid #d4a574;
}

select option {
  background: #1a120b;
  color: #f4e4d4;
}
```

---

## 5. RESPONSIVE DESIGN

### Breakpoints

| Breakpoint | Width | Device Type | Usage |
|------------|-------|-------------|-------|
| **Mobile** | 375px - 767px | Phones, small tablets | 1-column layout, maximum touch targets |
| **Tablet** | 768px - 1099px | Tablets, large phones | 2-column grids, optimized spacing |
| **Desktop** | 1100px - 1399px | Laptop, desktop | 3-column grids, full layouts |
| **Large Desktop** | 1400px+ | Large monitors, TV | Maximum content width (1400px container) |

### Responsive Grid Layouts (Bento Grid)

#### Mobile (375px - 767px)

```css
.bento-grid {
  display: grid;
  grid-template-columns: 1fr;   /* Single column */
  gap: 15px;                    /* Tighter gap on mobile */
  padding: 12px;
}

.card--hero {
  min-height: 250px;
  padding: 20px;
  margin-bottom: 15px;
}

.card--featured {
  padding: 18px;
  margin-bottom: 12px;
}

.card {
  padding: 18px;
  margin-bottom: 12px;
}
```

#### Tablet (768px - 1099px)

```css
@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);  /* 2 columns */
    gap: 18px;
    padding: 15px;
  }

  .card--hero {
    grid-column: 1 / -1;  /* Full width */
    min-height: 280px;
  }

  .card--featured {
    padding: 20px;
  }
}
```

#### Desktop (1100px - 1399px)

```css
@media (min-width: 1100px) {
  .bento-grid {
    grid-template-columns: repeat(3, 1fr);  /* 3 columns */
    gap: 20px;
    padding: 20px;
  }

  .card--hero {
    grid-column: 1 / -1;  /* Full width */
    min-height: 300px;
  }
}
```

#### Large Desktop (1400px+)

```css
@media (min-width: 1400px) {
  .container {
    max-width: 1400px;
    margin: 0 auto;
    padding: 40px;
  }

  .bento-grid {
    gap: 25px;
    padding: 30px;
  }
}
```

### Typography Scaling Across Breakpoints

```css
/* Mobile First */
h1 { font-size: 32px; line-height: 1.3; }  /* 375px */
h2 { font-size: 24px; line-height: 1.4; }
h3 { font-size: 18px; line-height: 1.5; }
p { font-size: 14px; line-height: 1.7; }

/* Tablet */
@media (min-width: 768px) {
  h1 { font-size: 38px; }
  h2 { font-size: 28px; }
  h3 { font-size: 20px; }
  p { font-size: 15px; }
}

/* Desktop */
@media (min-width: 1100px) {
  h1 { font-size: 48px; }
  h2 { font-size: 32px; }
  h3 { font-size: 24px; }
  p { font-size: 16px; }
}
```

### Touch Target Sizing

All interactive elements must meet **minimum 44px × 44px** touch target size (iOS accessibility standard):

```css
/* Buttons */
.btn--primary,
.btn--secondary {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;  /* Results in 44px min height */
}

/* Form inputs */
input, select, textarea {
  min-height: 44px;
  padding: 12px 15px;  /* Results in 44px min height */
}

/* Links in content */
a {
  padding: 4px 0;      /* Add vertical padding for touch */
  display: inline-block;
}

/* Icon buttons */
.icon-btn {
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
}
```

### Mobile Navigation Considerations

```css
/* Mobile menu should be easy to tap */
.nav-menu a {
  display: block;
  padding: 16px 20px;      /* 44px minimum touch target */
  font-size: 15px;
}

/* Avoid tiny tap targets */
@media (max-width: 768px) {
  /* Increased touch targets on mobile */
  button, a, input {
    min-height: 44px;
  }

  .nav-menu {
    gap: 12px;            /* Space between navigation items */
  }
}
```

---

## 6. VISUAL EFFECTS & INTERACTIONS

### Hover States

**Principle:** Subtle, refined interactions—no jarring animations. 2-3px subtle lift with soft shadow enhancement.

#### Card Hover

```css
.card--featured:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
  transition: all 0.3s ease;
}

.card:hover {
  border-color: #d4a574;
  box-shadow: 0 4px 12px rgba(212, 165, 116, 0.2);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}
```

#### Button Hover

```css
.btn--primary:hover {
  background: linear-gradient(135deg, #c49a6c 0%, #b88860 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(212, 165, 116, 0.4);
  transition: all 0.2s ease;
}

.btn--secondary:hover {
  color: #ffd700;
  border-color: #ffd700;
  background: rgba(255, 215, 0, 0.05);
  transition: all 0.2s ease;
}
```

#### Link Hover

```css
a {
  color: #d4a574;
  text-decoration: none;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

a:hover {
  color: #ffd700;
  border-bottom-color: #ffd700;
}
```

#### Navigation Hover

```css
.nav-menu a {
  border-bottom: 3px solid transparent;
  transition: all 0.3s ease;
  padding: 10px 20px;
}

.nav-menu a:hover {
  border-bottom-color: #8b4513;
  transform: translateY(-2px);
}

.nav-menu a.active {
  border-bottom-color: #8b4513;
}
```

### Focus States (Keyboard Navigation)

All interactive elements must have visible focus indicators for keyboard navigation (WCAG AAA compliance).

```css
/* Universal focus state */
button:focus,
a:focus,
input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}

/* Button focus (alternative) */
.btn--primary:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.2);
}

/* Link focus */
a:focus {
  outline: 2px solid #d4a574;
  outline-offset: 1px;
}

/* Form input focus */
input:focus,
textarea:focus {
  border-color: #d4a574;
  outline: 2px solid #d4a574;
  outline-offset: 1px;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}
```

### Transition Timing

All transitions use subtle, professional timing:

```css
/* Standard transition (most UI elements) */
transition: all 0.2s ease;        /* 200ms - quick feedback */

/* Slower transition (complex animations) */
transition: all 0.3s ease;        /* 300ms - smooth movement */

/* Very fast transition (loading states) */
transition: all 0.15s ease;       /* 150ms - quick state change */

/* Loading/spinner animation */
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.spinner {
  animation: spin 1s linear infinite;
}
```

### Active/Pressed States

```css
.btn--primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
}

.nav-menu a.active {
  border-bottom-color: #8b4513;
  color: #ffd700;
}

.filter-btn.active {
  background: #d4a574;
  color: #2c1810;
}
```

### Loading States

```css
.btn:disabled,
.btn--loading {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.btn--loading::after {
  content: " ...";
  animation: dots 1.5s steps(4, end) infinite;
}

@keyframes dots {
  0%, 20% { content: " ."; }
  40% { content: " .."; }
  60% { content: " ..."; }
}
```

### Forbidden Animations

**These animations are NOT permitted** (they damage the premium aesthetic):

- Heavy scale transforms (>10% size change)
- Jittery or bouncy effects
- Rapid blinking or flashing
- Slide-in/out animations from edges
- Fade-in effects lasting >500ms
- Complex multi-step animations

---

## 7. ACCESSIBILITY STANDARDS

### Color Contrast Requirements

**All text must meet WCAG AA minimum (4.5:1 contrast ratio)**

```
WCAG Levels:
- AA (minimum): 4.5:1 for normal text
- AAA (enhanced): 7:1 for normal text
- AA large: 3:1 for text 18px+ or 14px+ bold
```

Carnivore Weekly Color Contrast Validation:

| Text Color | Background | Ratio | Level | Status |
|-----------|-----------|-------|-------|--------|
| #f4e4d4 | #1a120b | 14.2:1 | AAA | ✓ Pass |
| #2c1810 | #d4a574 | 12.4:1 | AAA | ✓ Pass |
| #d4a574 | #1a120b | 7.1:1 | AA | ✓ Pass |
| #ffd700 | #1a120b | 13.8:1 | AAA | ✓ Pass |

**Forbidden combinations:**
- ❌ #ffd700 on #d4a574 (1.8:1 - FAIL)
- ❌ #8b4513 on #1a120b (2.1:1 - FAIL for body text)

### Keyboard Navigation

All interactive elements must be keyboard accessible:

```css
/* Remove default outline only if custom focus state provided */
*:focus-visible {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}

/* Tab order should be logical (left-to-right, top-to-bottom) */
/* Use tabindex only when necessary (avoid tabindex > 0) */
```

### Focus Indicators

**Visible focus indicators for all interactive elements:**

```html
<!-- Good: Visible focus state -->
<button>Click Me</button>  <!-- Has outline:2px solid #ffd700 on :focus -->

<!-- Bad: No visible focus indicator -->
<button style="outline: none;">Click Me</button>  <!-- Inaccessible -->

<!-- Good: Custom focus styling -->
<a href="#" style="outline: 2px solid #d4a574; outline-offset: 2px;">Link</a>
```

### Button & Link Sizing

All interactive elements minimum **44px × 44px** touch target:

```css
/* Buttons */
button, .btn {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;      /* Results in 44px height */
}

/* Links should be adequate size */
a {
  padding: 4px 0;          /* Add vertical padding */
}

/* Icon buttons */
.icon-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Alternative Text for Images

All images must have descriptive `alt` text:

```html
<!-- Good: Descriptive alt text -->
<img src="sarah-health-coach.jpg" alt="Sarah, health coach, discussing metabolic health research">

<!-- Bad: Empty or generic alt -->
<img src="sarah-health-coach.jpg" alt="image">         <!-- Too generic -->
<img src="sarah-health-coach.jpg" alt="">              <!-- Missing alt -->

<!-- Good: Decorative images can have empty alt -->
<img src="divider.svg" alt="">  <!-- Purely decorative -->

<!-- Good: Linked images have descriptive alt -->
<a href="/blog">
  <img src="blog-thumbnail.jpg" alt="Blog post: How to Break Weight Loss Plateaus">
</a>
```

### Semantic HTML

Proper semantic structure improves accessibility:

```html
<!-- Good: Semantic HTML -->
<header>
  <nav>
    <a href="/">Home</a>
    <a href="/blog">Blog</a>
  </nav>
</header>

<main>
  <article>
    <h1>How to Break Weight Loss Plateaus</h1>
    <p>Opening paragraph...</p>
    <h2>Section 1</h2>
    <p>Content...</p>
  </article>
</main>

<footer>
  <p>Copyright 2025 Carnivore Weekly</p>
</footer>

<!-- Bad: Non-semantic markup -->
<div id="header">
  <div id="nav">
    <span onclick="goto('/')">Home</span>
  </div>
</div>
```

### Form Accessibility

Forms must be properly labeled and associated:

```html
<!-- Good: Label properly associated with input -->
<label for="email">Email Address:</label>
<input id="email" type="email" name="email" required>

<!-- Bad: Label not associated -->
<label>Email Address:</label>
<input type="email" name="email">

<!-- Good: Help text for complex fields -->
<label for="password">Password:</label>
<input id="password" type="password" name="password"
       aria-describedby="password-hint">
<small id="password-hint">At least 8 characters, 1 uppercase, 1 number</small>

<!-- Good: Error states are announced -->
<input id="email" type="email" aria-invalid="true" aria-describedby="email-error">
<span id="email-error" role="alert">Please enter a valid email</span>
```

### Skip Navigation Links

```html
<!-- Skip link for keyboard navigation (appears on focus) -->
<a href="#main-content" class="skip-link">Skip to main content</a>

<style>
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #d4a574;
  color: #2c1810;
  padding: 8px;
  text-decoration: none;
  z-index: 100;
}

.skip-link:focus {
  top: 0;
}
</style>

<main id="main-content">
  <!-- Page content -->
</main>
```

---

## 8. CODE STANDARDS

### CSS Class Naming (BEM Convention)

Carnivore Weekly uses **BEM (Block, Element, Modifier)** naming for maintainability:

```css
/* Block: standalone component */
.card { }

/* Element: part of the block (uses double underscore) */
.card__title { }
.card__content { }
.card__meta { }

/* Modifier: variation of the block (uses double hyphen) */
.card--featured { }
.card--compact { }

/* Full example */
.card { }                       /* Block */
.card__title { }                /* Element */
.card__description { }          /* Element */
.card__meta { }                 /* Element */
.card--hero { }                 /* Modifier (variation) */
.card--featured { }             /* Modifier */
```

**Applied to Carnivore Weekly:**

```css
.bento-grid { }
.bento-grid__item { }
.bento-grid__item--hero { }

.btn { }
.btn--primary { }
.btn--secondary { }
.btn--small { }

.section { }
.section__title { }
.section__content { }

.nav-menu { }
.nav-menu__item { }
.nav-menu__link { }
.nav-menu__link--active { }
```

### CSS File Organization

```css
/* ============================================================================
   CARNIVORE WEEKLY - GLOBAL STYLES
   ============================================================================ */

/* 1. IMPORTS & FONTS */
@import url('https://fonts.googleapis.com/...');

/* 2. CSS CUSTOM PROPERTIES (Variables) */
:root {
  --color-dark-brown: #1a120b;
  --color-text-brown: #2c1810;
  /* ... more variables ... */
}

/* 3. RESET & BASE STYLES */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: var(--font-body); color: var(--text-primary); }

/* 4. TYPOGRAPHY */
h1, h2, h3, h4, h5, h6 { font-family: var(--font-display); }
h1 { font-size: 48px; color: #ffd700; }

/* 5. LAYOUT */
.container { max-width: 1400px; margin: 0 auto; }
.bento-grid { display: grid; gap: 20px; }

/* 6. COMPONENTS */
.card { /* ... */ }
.btn { /* ... */ }
.btn--primary { /* ... */ }

/* 7. UTILITIES */
.text-center { text-align: center; }
.mb-20 { margin-bottom: 20px; }

/* 8. MEDIA QUERIES (mobile-first approach) */
@media (min-width: 768px) {
  /* tablet styles */
}

@media (min-width: 1100px) {
  /* desktop styles */
}

@media (prefers-reduced-motion: reduce) {
  /* accessibility: disable animations for users who prefer reduced motion */
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

### CSS Variable Usage

```css
/* Define at root level */
:root {
  /* Colors */
  --color-dark-brown: #1a120b;
  --color-text-brown: #2c1810;
  --color-tan: #d4a574;
  --color-gold: #ffd700;
  --color-light-text: #f4e4d4;
  --color-border: #8b4513;

  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Merriweather', Georgia, serif;

  /* Spacing */
  --spacing-xs: 5px;
  --spacing-sm: 10px;
  --spacing-md: 20px;
  --spacing-lg: 30px;
  --spacing-xl: 40px;
  --spacing-xxl: 60px;

  /* Sizing */
  --container-max: 1400px;
  --blog-max: 800px;

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 15px rgba(0,0,0,0.3);
  --shadow-lg: 0 8px 25px rgba(0,0,0,0.5);
}

/* Usage in components */
.card {
  background: linear-gradient(135deg, var(--color-tan) 0%, #c49a6c 100%);
  color: var(--color-text-brown);
  padding: var(--spacing-lg);
  border: 3px solid var(--color-border);
  box-shadow: var(--shadow-lg);
  border-radius: 15px;
  transition: all var(--transition-normal);
}

.card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-lg);
}
```

### Example: Complete Card Component CSS

```css
/* ============================================================================
   CARD COMPONENT
   ============================================================================ */

.card {
  background: linear-gradient(135deg, #2c1810 0%, #1a120b 100%);
  color: var(--color-light-text);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: var(--spacing-md);
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

.card:hover {
  border-color: var(--color-tan);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.card:focus-within {
  outline: 2px solid var(--color-gold);
  outline-offset: 2px;
}

/* Card Elements */
.card__title {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--color-tan);
  margin-bottom: var(--spacing-sm);
  line-height: 1.4;
}

.card__content {
  font-family: var(--font-body);
  font-size: 15px;
  color: var(--color-light-text);
  line-height: 1.7;
  margin-bottom: var(--spacing-sm);
}

.card__meta {
  font-size: 13px;
  color: var(--color-tan);
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-sm);
  border-top: 1px solid rgba(212, 165, 116, 0.3);
  opacity: 0.9;
  font-style: italic;
}

/* Card Modifiers */
.card--featured {
  background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);
  border-left: 6px solid var(--color-tan);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-md);
}

.card--featured:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: var(--shadow-lg);
}

.card--compact {
  padding: var(--spacing-sm) var(--spacing-md);
  margin-bottom: var(--spacing-sm);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card {
    padding: 18px;
    margin-bottom: var(--spacing-sm);
  }

  .card__title {
    font-size: 18px;
  }

  .card--featured {
    padding: var(--spacing-md);
  }
}
```

### HTML Best Practices

```html
<!-- Good: Semantic, accessible HTML -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How to Break Weight Loss Plateaus - Carnivore Weekly</title>
    <meta name="description" content="Expert strategies to overcome weight loss stalls on carnivore diet, with research-backed protocols.">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            <a href="/blog">Blog</a>
        </nav>
    </header>

    <main>
        <article>
            <h1>How to Break Weight Loss Plateaus</h1>

            <p>Opening paragraph with hook...</p>

            <section>
                <h2>Section Title</h2>
                <p>Section content...</p>
            </section>
        </article>
    </main>

    <footer>
        <p>&copy; 2025 Carnivore Weekly</p>
    </footer>
</body>
</html>
```

---

## 9. DESIGN TOKENS

### Token Library (Copy-Paste Reference)

#### Color Tokens

```css
:root {
  /* Primary Colors */
  --color-bg-primary: #1a120b;
  --color-bg-secondary: #2c1810;
  --color-bg-surface: #8b4513;

  /* Text Colors */
  --color-text-light: #f4e4d4;
  --color-text-dark: #2c1810;
  --color-text-accent: #d4a574;

  /* Accent Colors */
  --color-accent-gold: #ffd700;
  --color-accent-tan: #d4a574;
  --color-accent-brown: #8b4513;

  /* Gradients */
  --gradient-tan: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
  --gradient-brown: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);
  --gradient-dark: linear-gradient(135deg, #2c1810 0%, #1a120b 100%);
}
```

#### Typography Tokens

```css
:root {
  /* Font Families */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Merriweather', Georgia, serif;

  /* Font Sizes (H1-H4) */
  --font-size-h1: 48px;
  --font-size-h2: 32px;
  --font-size-h3: 24px;
  --font-size-h4: 18px;

  /* Font Sizes (Body) */
  --font-size-base: 16px;
  --font-size-small: 14px;
  --font-size-extra-small: 12px;

  /* Font Weights */
  --font-weight-regular: 400;
  --font-weight-bold: 700;
  --font-weight-black: 900;

  /* Line Heights */
  --line-height-tight: 1.3;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.8;

  /* Letter Spacing */
  --letter-spacing-tight: -1px;
  --letter-spacing-normal: 0;
  --letter-spacing-open: 0.5px;
  --letter-spacing-wide: 1px;
}
```

#### Spacing Tokens

```css
:root {
  /* Base Units */
  --spacing-xs: 5px;
  --spacing-sm: 10px;
  --spacing-md: 20px;
  --spacing-lg: 30px;
  --spacing-xl: 40px;
  --spacing-xxl: 60px;

  /* Component Padding */
  --padding-card: 20px;
  --padding-card-featured: 30px;
  --padding-card-compact: 15px;

  /* Component Margins */
  --margin-section: 40px;
  --margin-paragraph: 15px;
  --margin-heading: 20px;

  /* Container Sizes */
  --container-max: 1400px;
  --container-blog: 800px;
}
```

#### Shadow Tokens

```css
:root {
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 15px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 12px 35px rgba(0, 0, 0, 0.6);

  /* Inset shadows for depth */
  --shadow-inset-light: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  --shadow-inset-dark: inset 0 -1px 0 rgba(0, 0, 0, 0.3);
}
```

#### Transition Tokens

```css
:root {
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;
  --transition-very-slow: 0.5s ease;

  /* Easing functions */
  --easing-ease-in: cubic-bezier(0.4, 0, 1, 1);
  --easing-ease-out: cubic-bezier(0, 0, 0.2, 1);
  --easing-ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## 10. MAINTENANCE & EVOLUTION

### Version Control for Design Changes

**Document All Changes:**

```markdown
## Design System Changelog

### v1.1 (Future)
- [ ] Description of change
- [ ] Impact on components
- [ ] Migration guide for existing code
- Date: TBD

### v1.0 (December 31, 2025)
- Initial design system for Bento Grid
- Established color, typography, spacing, and component standards
- Created accessibility guidelines
```

### Process for Adding New Components

1. **Define the Component**
   - Name (use BEM naming convention)
   - Purpose and use cases
   - Responsive behavior

2. **Design the Component**
   - Create CSS with all states (default, hover, active, focus, disabled)
   - Test contrast ratios (WCAG AA minimum)
   - Test responsive breakpoints

3. **Document the Component**
   - Add to Design System document
   - Include example HTML and CSS
   - Document all modifiers

4. **Test the Component**
   - Test in all browsers (Chrome, Firefox, Safari, Edge)
   - Test keyboard navigation and focus states
   - Test on mobile (375px, 768px, 1100px breakpoints)
   - Test with accessibility tools

5. **Approve and Publish**
   - Get CEO approval for brand compliance
   - Update changelog
   - Add to component library
   - Communicate to team

### Deprecating Old Patterns

When retiring a component or pattern:

1. **Announce Deprecation**
   - Add note to design system: "Deprecated as of [DATE]. Use [NEW PATTERN] instead."
   - Give 2-week notice to team

2. **Provide Migration Guide**
   ```markdown
   ## Deprecated: Old Card Component

   **Replaced by:** .card--featured (new Bento Grid card)

   **Migration:**
   - Change `.old-card` to `.card--featured`
   - Remove custom padding (now 30px standard)
   - Remove custom shadows (now use var(--shadow-lg))
   ```

3. **Update All Usage**
   - Find all pages using old pattern
   - Update to new pattern
   - Remove old CSS

4. **Remove from Code**
   - Delete CSS for deprecated component
   - Update design system document

### Updating Design System When Brand Changes

**Example: CEO wants to change accent color from tan to burnt orange**

1. **Update Color Tokens**
   ```css
   :root {
     --color-accent-tan: #d4a574;     /* Old */
     --color-accent-tan: #c86b2a;     /* New burnt orange */
   }
   ```

2. **Test Contrast Ratios**
   - New color on dark background: ? (must be 7:1 minimum)
   - New color on light background: ? (must be 4.5:1 minimum)

3. **Update All Components**
   - Find all instances of old color
   - Replace with new token variable
   - Test in browser

4. **Visual Regression Testing**
   - Screenshot all pages
   - Compare to baseline
   - Ensure no unexpected changes

5. **Communicate Change**
   - Update changelog: "v1.1 - Changed accent color from tan (#d4a574) to burnt orange (#c86b2a)"
   - Notify team
   - Update brand guidelines

### Quality Assurance Checklist

Before shipping design changes:

```markdown
## Design QA Checklist

- [ ] **Colors**
  - [ ] All hex values exactly match design tokens
  - [ ] WCAG AA contrast verified for all text
  - [ ] No unauthorized color substitutions

- [ ] **Typography**
  - [ ] Font families correct (Playfair Display, Merriweather)
  - [ ] Font sizes match scale (H1: 48px, H2: 32px, etc.)
  - [ ] Font weights correct (400, 700, 900)
  - [ ] Line heights consistent (1.3-1.8 range)

- [ ] **Spacing**
  - [ ] Margins use standard increments (20px, 30px, 40px)
  - [ ] Padding consistent within component type
  - [ ] Gaps between grid items: 20px standard
  - [ ] No arbitrary spacing (12px, 18px unless justified)

- [ ] **Components**
  - [ ] All hover states work smoothly
  - [ ] Focus states visible and accessible
  - [ ] Active/disabled states clear
  - [ ] Transitions smooth (0.2s standard)

- [ ] **Responsive**
  - [ ] Mobile (375px): Single column, readable
  - [ ] Tablet (768px): 2-column layouts work
  - [ ] Desktop (1100px): 3-column layouts work
  - [ ] Large desktop (1400px): Content max-width respected
  - [ ] No horizontal scroll at any breakpoint

- [ ] **Accessibility**
  - [ ] All buttons/links have focus indicators
  - [ ] Touch targets 44px minimum
  - [ ] Images have descriptive alt text
  - [ ] Semantic HTML structure correct
  - [ ] Form labels associated with inputs
  - [ ] No color-only information (text + color)

- [ ] **Performance**
  - [ ] Page load < 3 seconds
  - [ ] No console errors
  - [ ] Images optimized (< 200KB each)
  - [ ] No render-blocking resources
```

---

## QUICK REFERENCE CARDS

### Colors (Copy-Paste)

```
Primary Background:  #1a120b
Secondary BG:        #2c1810
Accent Tan:          #d4a574
Accent Gold:         #ffd700
Light Text:          #f4e4d4
Border/Divider:      #8b4513
```

### Typography (Copy-Paste)

```css
/* H1 */
font-family: 'Playfair Display', Georgia, serif;
font-size: 48px;
font-weight: 900;
color: #ffd700;

/* H2 */
font-family: 'Playfair Display', Georgia, serif;
font-size: 32px;
font-weight: 700;
color: #ffd700;

/* Body */
font-family: 'Merriweather', Georgia, serif;
font-size: 16px;
font-weight: 400;
line-height: 1.8;
color: #f4e4d4;
```

### Spacing (Copy-Paste)

```css
/* Container */
max-width: 1400px;
margin: 0 auto;
padding: 40px;

/* Sections */
margin-bottom: 40px;
gap: 20px;

/* Cards */
padding: 20px;
border-radius: 8px;

/* Featured */
padding: 30px;
border-radius: 15px;
```

### Button States (Copy-Paste)

```css
.btn--primary {
  background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
  color: #2c1810;
  padding: 14px 32px;
  border: 2px solid #8b4513;
}

.btn--primary:hover {
  background: linear-gradient(135deg, #c49a6c 0%, #b88860 100%);
  transform: translateY(-2px);
}

.btn--primary:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}
```

---

## CONTACT & ESCALATION

### When to Ask for Help

- **Colors**: Brand identity critical—ask CEO
- **Typography**: Font choices affect brand—ask CEO
- **New Components**: Needs design system decision—ask CEO
- **Layout Changes**: Affects multiple pages—ask CEO
- **Performance Issues**: Technical expertise needed—ask Alex (developer)
- **Visual Bugs**: Screenshot comparison needed—ask Casey (QA)

### Design System Owner

**CEO/Founder** - Brand identity, strategic decisions
**Primary Developer** - Implementation, technical guidance
**QA Lead** - Visual regression testing, accessibility verification

---

## APPENDIX: Before & After

### Refined Traditional vs Bento Grid Comparison

| Aspect | Refined Traditional | Bento Grid |
|--------|-------------------|-----------|
| **Layout** | Flexible, flowing sections | Structured grid system |
| **Card Heights** | Varied, content-based | Standard heights for consistency |
| **Grid Gaps** | 25px variable | 20px standard |
| **Typography** | H1: 48px, H2: 32px | H1: 48px, H2: 32px, H3: 24px (new) |
| **Featured Cards** | Tan gradients | Dark brown with tan accent |
| **Spacing** | Ad hoc adjustments | Strict 10px multiplier grid |
| **Hover Effects** | Moderate lift | 5px lift + scale for featured |
| **Responsiveness** | Mobile-friendly | Mobile-first, tested 3 breakpoints |

**Key Improvement:** Bento Grid provides visual consistency while maintaining the premium leather aesthetic. Strict spacing and typography rules reduce design debt and make maintenance easier.

---

**Document Complete**
Version 1.0 | Updated: December 31, 2025
For questions or updates, contact the CEO and design team.
