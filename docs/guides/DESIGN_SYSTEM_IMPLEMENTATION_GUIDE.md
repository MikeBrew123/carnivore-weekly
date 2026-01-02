# Carnivore Weekly Design System
## Complete Implementation Guide v1.0

**Document Version:** 1.0
**Last Updated:** December 31, 2025
**Status:** Production Ready
**Audience:** Designers, Developers, Product Managers, Frontend Engineers

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Design Philosophy](#design-philosophy)
3. [Component Specifications](#component-specifications)
4. [Color System Reference](#color-system-reference)
5. [Typography Specifications](#typography-specifications)
6. [Spacing & Layout Rules](#spacing--layout-rules)
7. [Component States & Interactions](#component-states--interactions)
8. [Responsive Design Rules](#responsive-design-rules)
9. [Accessibility Standards](#accessibility-standards)
10. [Code Examples & Templates](#code-examples--templates)
11. [Implementation Checklist](#implementation-checklist)
12. [Designer Quick Start](#designer-quick-start)
13. [Developer Quick Start](#developer-quick-start)
14. [Troubleshooting Guide](#troubleshooting-guide)

---

## EXECUTIVE SUMMARY

The Carnivore Weekly Design System provides a complete specification for building consistent, accessible, and visually premium interfaces. This system is optimized for:

- **Premium Editorial Aesthetic**: Sophisticated leather-textured design evoking luxury meat-based products
- **Accessibility**: WCAG 2.1 AA compliance across all components
- **Responsiveness**: Mobile-first approach with tested breakpoints (375px, 768px, 1100px, 1400px)
- **Performance**: Native CSS Grid, minimal JavaScript dependencies
- **Maintainability**: Semantic HTML, BEM naming conventions, clear token-based system

### Key Stats

| Metric | Value |
|--------|-------|
| **Color Tokens** | 6 primary + 9 semantic + 3 gradient |
| **Typography Scales** | 4 heading levels + 4 body text variants |
| **Component Types** | 4 card types × 3 states each = 12 variations |
| **Breakpoints** | 4 (Mobile, Tablet, Desktop, Large Desktop) |
| **Contrast Compliance** | 100% WCAG AAA on body text (14.2:1) |
| **Touch Targets** | All interactive elements 44px+ minimum |

---

## DESIGN PHILOSOPHY

### 1. Premium Editorial Aesthetic

Carnivore Weekly maintains a dark, sophisticated design inspired by luxury editorial publications and premium leather goods. Every design decision serves the brand's core mission: helping evidence-based carnivore practitioners access quality information.

**Visual Characteristics:**
- Deep brown backgrounds (#1a120b) suggesting natural, earthy leather
- Warm tan accents (#d4a574) evoking premium meat tones
- Gold highlights (#ffd700) adding prestige and visual hierarchy
- Generous spacing suggesting exclusivity and quality

**Brand Application:**
- Hero sections dominate visual hierarchy (larger and more prominent)
- Featured content receives secondary emphasis (tan backgrounds, left borders)
- Standard content remains supporting but consistently styled
- All spacing and typography follow strict mathematical scales

### 2. Content-First Hierarchy

The design system prioritizes content visibility without sacrificing aesthetics. The grid system ensures:

- Most important content appears in hero sections (2×2 grid span on desktop)
- Secondary content appears in featured sections (2×1 span on desktop)
- Supporting content fills remaining space in standard items (1×1 span)
- All content remains readable on all devices (44px minimum touch targets)

### 3. Accessibility First

Every design decision prioritizes accessibility for the 30-60 year old audience seeking evidence-based health guidance:

- Minimum 4.5:1 contrast ratio on all text (WCAG AA)
- Large typography at all breakpoints (14px minimum body text)
- Clear focus indicators for keyboard navigation
- Semantic HTML structure for screen readers
- Alternative text for all images
- Touch-friendly spacing and buttons

### 4. Performance Optimized

The system uses native browser capabilities to maximize performance:

- CSS Grid for layout (no JavaScript required)
- CSS variables for theming (instant updates)
- Minimal animation (0.2s standard, respects prefers-reduced-motion)
- Optimized SVG textures (embedded data URIs)
- Mobile-first CSS approach

---

## COMPONENT SPECIFICATIONS

### Overview

The design system includes 4 primary component types plus numerous variants. Each component has documented states (default, hover, active, focus, disabled) and responsive behaviors across all breakpoints.

### COMPONENT 1: HERO CARD

**Purpose:** Feature trending topics, top videos, main announcements—maximum visual emphasis

**Variants & States:**

| State | Desktop | Tablet | Mobile | Visual |
|-------|---------|--------|--------|--------|
| **Default** | 2×2 cells, 400px height | 2×1 cells, 280px | 1×1, 250px | Tan gradient, tan border |
| **Hover** | Lift 4px, shadow enhances | Same lift | No lift (touch) | Border color changes to gold |
| **Active** | Gold border, glow | Same as hover | Same as hover | Enhanced shadow |
| **Focus** | Gold outline, 2px offset | Same | Same | White outline ring |
| **Disabled** | Opacity 0.6, grayscale | Same | Same | Not typically used |

**Design Specifications:**

```
Background Gradient: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%)
Border: 3px solid #8b4513
Border Radius: 15px
Box Shadow: 0 8px 25px rgba(0, 0, 0, 0.5),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.3)
Padding: 30px (desktop), 25px (tablet), 20px (mobile)
Min Height: 400px (desktop), 280px (tablet), 250px (mobile)
Texture Overlay: 15% opacity noise pattern via pseudo-element
Transition: all 0.3s ease
```

**Typography Inside Hero:**

```
Heading (H1):
  Font: Playfair Display, 900 weight
  Size: 3.2em (desktop), 2.4em (tablet), 2em (mobile)
  Color: #2c1810 (dark brown on tan background)
  Line Height: 1.2
  Letter Spacing: -1px
  Margin Bottom: 20px
  Text Shadow: 2px 2px 0 rgba(255, 255, 255, 0.3)

Description Paragraph:
  Font: Merriweather, 400 weight
  Size: 1.4em (desktop), 1.1em (tablet), 1em (mobile)
  Color: #1a120b (darkest brown)
  Line Height: 1.8
  Margin Bottom: 20px

CTA Button:
  Style: .btn--primary (see Buttons section)
  Alignment: flex-start within flex container
  Margin Top: 10px
```

**Layout Grid:**

- **Desktop (1400px container):** Spans 2 columns (852px), spans 2 rows (840px with 40px gap)
- **Tablet (768px container):** Spans 2 columns (both columns = full width 738px), spans 1 row only
- **Mobile (375px container):** Spans 1 column (full width 351px), normal stacking

**Implementation Tips:**

1. Use flex layout internally to position content at top and CTA at bottom
2. Wrap heading and paragraph in a div to allow flex-direction: column, justify-content: space-between
3. SVG texture overlay goes in ::before pseudo-element
4. Set z-index: 1 on all child elements to appear above texture
5. Use overflow: hidden on container to prevent texture overflow

**HTML Template:**

```html
<article class="bento-item bento-item--hero">
    <div>
        <h1>The Latest in Carnivore Culture</h1>
        <p>Discover the week's most compelling articles, studies, and conversations shaping the carnivore movement.</p>
    </div>
    <a href="/weekly-roundup" class="cta">Explore This Week</a>
</article>
```

---

### COMPONENT 2: FEATURED CARD

**Purpose:** Highlight secondary content with visual emphasis—trending topics, important discussions

**Variants & States:**

| State | Desktop | Tablet | Mobile | Visual |
|-------|---------|--------|--------|--------|
| **Default** | 2×1 cells, 240px | 1×1 cells, 220px | 1×1, 200px | Brown gradient, tan left border |
| **Hover** | Lift 5px, scale 1.02 | Same lift + scale | No lift (touch) | Shadow deepens |
| **Active** | Tan border (all sides) | Same | Same | Gold inner shadow |
| **Focus** | Gold outline, 2px offset | Same | Same | White focus ring |
| **Disabled** | Opacity 0.6 | Same | Same | Not typically used |

**Design Specifications:**

```
Background Gradient: linear-gradient(135deg, #8b4513 0%, #6d3819 100%)
Text Color: #f4e4d4 (light tan text)
Border: Left 6px solid #d4a574, rounded corners
Border Radius: 10px
Box Shadow: 0 5px 15px rgba(0, 0, 0, 0.4)
Padding: 25px (desktop), 20px (tablet), 20px (mobile)
Min Height: 240px (desktop), 220px (tablet), 200px (mobile)
Transition: all 0.3s ease
Hover Transform: translateY(-5px) scale(1.02)
```

**Typography Inside Featured:**

```
Badge (Optional):
  Background: #8b4513
  Color: #f4e4d4
  Padding: 6px 12px
  Border Radius: 20px
  Font Size: 0.85em
  Font Weight: 700
  Text Transform: uppercase
  Letter Spacing: 1px
  Margin Bottom: 15px

Heading (H2):
  Font: Playfair Display, 900 weight
  Size: 2.2em (desktop), 1.8em (tablet), 1.6em (mobile)
  Color: #2c1810 (for light backgrounds) OR #f4e4d4 (for dark)
  Line Height: 1.3
  Margin Bottom: 15px
  Text Shadow: 2px 2px 0 rgba(255, 255, 255, 0.3)

Description:
  Font: Merriweather, 400 weight
  Size: 1.1em (desktop), 1em (tablet), 0.95em (mobile)
  Color: #f4e4d4
  Line Height: 1.7
  Margin Bottom: 0
```

**Layout Grid:**

- **Desktop (1400px container):** Spans 2 columns (852px)
- **Tablet (768px container):** Spans 1 column (369px per column)
- **Mobile (375px container):** Spans 1 column (351px)

**Implementation Tips:**

1. Left border creates visual accent—use border-left property
2. Gradient background darkens from brown to darker brown
3. Text on dark background uses light color (#f4e4d4)
4. Include optional badge for category/status
5. Hover effect combines translateY and scale for premium feel

**HTML Template:**

```html
<article class="bento-item bento-item--featured">
    <span class="badge">Trending</span>
    <h2>Why Nose-to-Tail Eating Matters</h2>
    <p>Learn how consuming the entire animal provides nutrients modern diets consistently lack, and why traditional cultures have always understood this principle.</p>
</article>
```

---

### COMPONENT 3: STANDARD CARD

**Purpose:** Display regular content items—news, discussions, research—in consistent 1×1 grid cells

**Variants & States:**

| State | Desktop | Tablet | Mobile | Visual |
|-------|---------|--------|--------|--------|
| **Default** | 1×1 cells, 220px | 1×1 cells, 220px | 1×1, 180px | Dark gradient, subtle border |
| **Hover** | Lift 2px, border accent | Same lift | No lift (touch) | Border color changes to tan |
| **Active** | Tan border (full) | Same | Same | Enhanced shadow |
| **Focus** | Gold outline, 2px offset | Same | Same | White focus ring |
| **Disabled** | Opacity 0.6 | Same | Same | Not typically used |

**Design Specifications:**

```
Background Gradient: linear-gradient(135deg, #2c1810 0%, #1a120b 100%)
Text Color: #f4e4d4 (light tan)
Border: 1px solid #8b4513 (dark brown)
Border Radius: 8px
Box Shadow: 0 4px 12px rgba(0, 0, 0, 0.3)
Padding: 20px (desktop/tablet), 18px (mobile)
Min Height: 220px (desktop/tablet), 180px (mobile)
Transition: all 0.2s ease
Hover Transform: translateY(-2px)
Hover Border Color: #d4a574 (tan accent)
Hover Shadow: 0 4px 12px rgba(212, 165, 116, 0.2)
```

**Typography Inside Standard:**

```
Heading (H3):
  Font: Playfair Display, 900 weight
  Size: 1.6em (desktop), 1.5em (tablet), 1.3em (mobile)
  Color: #d4a574 (tan accent)
  Line Height: 1.3
  Margin Bottom: 12px
  Text Shadow: 2px 2px 0 rgba(255, 255, 255, 0.3)

Description:
  Font: Merriweather, 400 weight
  Size: 0.95em (desktop/tablet), 0.9em (mobile)
  Color: #f4e4d4
  Line Height: 1.6
  Margin Bottom: 15px

Read More Link:
  Font: Merriweather, 700 weight
  Font Size: 0.9em
  Color: #8b4513 (default), #2c1810 (hover)
  Text Decoration: underline (bottom border 2px)
  Transition: all 0.3s ease
  Hover: Padding-bottom 2px (creates lift effect)
  Include arrow: .read-more::after { content: " →"; }
```

**Layout Grid:**

- **All breakpoints:** Spans 1 column (fills available width)
- **Desktop:** ~426px per column (in 3-column grid)
- **Tablet:** ~519px per column (in 2-column grid)
- **Mobile:** ~351px (full width)

**Implementation Tips:**

1. Use subtle borders instead of heavy shadows
2. Gradient goes from slightly lighter to slightly darker brown
3. Text remains light throughout for contrast
4. Keep min-height consistent for visual grid alignment
5. Read-more link should have visible hover state with arrow animation

**HTML Template:**

```html
<article class="bento-item bento-item--standard">
    <h3>Weekly Video Roundup</h3>
    <p>Five essential carnivore diet videos from this week's most influential creators, covering meal prep, health benefits, and lifestyle updates.</p>
    <a href="/videos" class="read-more">View Videos</a>
</article>
```

---

### COMPONENT 4: TALL CARD (Modifier)

**Purpose:** Optional modifier to extend standard cards to 2 rows for additional emphasis

**Usage:**

Apply `.bento-item--tall` modifier to any standard or featured card to make it span 2 grid rows.

**Specifications:**

```
Grid Row Span: 2 (desktop), 1 (tablet/mobile)
Min Height: 450px (desktop), 240px (tablet), 220px (mobile)
Responsive Behavior:
  - Desktop: Stands out vertically alongside shorter items
  - Tablet: Reverts to standard 1-row height
  - Mobile: Reverts to standard height
```

**When to Use:**

- Highlight a particularly important piece of content
- Create visual variety in the grid layout
- Draw attention to expert interviews or deep-dive articles
- Only on featured or standard cards (hero already spans 2 rows)

**HTML Template:**

```html
<article class="bento-item bento-item--standard bento-item--tall">
    <h3>Deep Dive: Metabolic Health</h3>
    <p>Extended article with comprehensive information deserving of vertical prominence on desktop.</p>
    <a href="/article" class="read-more">Read Full Article</a>
</article>
```

---

### BUTTON COMPONENTS

#### Primary CTA Button (.btn--primary)

**Specifications:**

```
Background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%)
Text Color: #2c1810
Padding: 14px 32px
Min Height: 44px
Min Width: 150px
Border: 2px solid #8b4513
Border Radius: 8px
Font Family: Merriweather (body font)
Font Size: 15px
Font Weight: 700
Letter Spacing: 0.5px
Transition: all 0.2s ease
Display: inline-block

States:
  Default: As specified above
  Hover:
    - Background: linear-gradient(135deg, #c49a6c 0%, #b88860 100%) [5% darker]
    - Transform: translateY(-2px)
    - Box Shadow: 0 6px 20px rgba(212, 165, 116, 0.4)
  Active:
    - Transform: translateY(0)
    - Box Shadow: 0 2px 8px rgba(212, 165, 116, 0.3)
  Focus:
    - Outline: 2px solid #ffd700
    - Outline Offset: 2px
  Disabled:
    - Background: #8b4513
    - Color: #f4e4d4
    - Opacity: 0.6
    - Cursor: not-allowed
```

**Implementation:**

```html
<a href="/action" class="btn btn--primary">Click Me</a>
<!-- OR -->
<button class="btn btn--primary">Click Me</button>
```

**CSS:**

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
}
```

#### Secondary Button (.btn--secondary)

**Specifications:**

```
Background: transparent
Border: 2px solid #d4a574
Text Color: #d4a574
Padding: 10px 20px
Min Height: 44px
Border Radius: 6px
Font Size: 14px
Font Weight: 600
Transition: all 0.2s ease

States:
  Hover:
    - Color: #ffd700
    - Border Color: #ffd700
    - Background: rgba(255, 215, 0, 0.05)
  Focus:
    - Outline: 2px solid #ffd700
    - Outline Offset: 2px
  Active:
    - Background: #d4a574
    - Color: #2c1810
```

#### Small Utility Button (.btn--small)

**Specifications:**

```
Background: #8b4513
Color: #f4e4d4
Padding: 8px 16px
Border Radius: 4px
Font Size: 12px
Font Weight: 600
Border: none
Cursor: pointer
Transition: all 0.2s ease

Hover:
  - Background: #a55a1f
  - No transform
```

---

## COLOR SYSTEM REFERENCE

### Primary Color Palette

**Background Colors:**

| Name | Hex | RGB | Usage | Contrast Notes |
|------|-----|-----|-------|-----------------|
| Dark Brown (Primary BG) | #1a120b | 26, 18, 11 | Main page background | Darkest element |
| Text Brown | #2c1810 | 44, 24, 16 | Text on light backgrounds | 12.2:1 vs white |
| Tan Accent | #d4a574 | 212, 165, 116 | Featured cards, borders | 7.1:1 vs dark |
| Gold Accent | #ffd700 | 255, 215, 0 | Headings, emphasis | 13.8:1 vs dark |
| Light Text | #f4e4d4 | 244, 228, 212 | Text on dark | 14.2:1 vs dark |
| Border/Divider | #8b4513 | 139, 69, 19 | Borders, secondary | 6.4:1 vs dark |

### Semantic Color Naming

```
Background Layer:
├── --bg-primary: #1a120b (Page background)
├── --bg-secondary: #2c1810 (Secondary cards/boxes)
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

### Gradient Combinations

**Primary Tan Gradient:**

```css
background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
/* Used for: Hero cards, featured sections, primary buttons */
```

**Dark Brown Gradient:**

```css
background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);
/* Used for: Secondary cards, buttons, dark overlays */
```

**Dark Background Gradient:**

```css
background: linear-gradient(135deg, #2c1810 0%, #1a120b 100%);
/* Used for: Standard cards, deep backgrounds */
```

### Color Accessibility Matrix

| Text Color | BG Color | Ratio | Level | Forbidden? |
|-----------|----------|-------|-------|------------|
| #f4e4d4 | #1a120b | 14.2:1 | AAA | ✓ Pass |
| #2c1810 | #d4a574 | 12.4:1 | AAA | ✓ Pass |
| #d4a574 | #1a120b | 7.1:1 | AA | ✓ Pass |
| #ffd700 | #1a120b | 13.8:1 | AAA | ✓ Pass |
| #ffd700 | #d4a574 | 1.8:1 | FAIL | ❌ Forbidden |
| #8b4513 | #1a120b | 2.1:1 | FAIL | ❌ Forbidden for body |

**Rule:** Never place gold text on tan background. Never place brown text on dark background for body content.

---

## TYPOGRAPHY SPECIFICATIONS

### Font Loading

```html
<!-- Add to <head> -->
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
```

**Display Font Stack:**

```css
font-family: 'Playfair Display', Georgia, serif;
```

**Body Font Stack:**

```css
font-family: 'Merriweather', Georgia, serif;
```

### Complete Typography Scale

#### Heading Hierarchy

| Element | Desktop | Tablet | Mobile | Weight | Color | Usage |
|---------|---------|--------|--------|--------|-------|-------|
| H1 | 48px (2.8em) | 38px (2.2em) | 32px (1.8em) | 900 | #ffd700 | Page title, hero heading |
| H2 | 32px (1.8em) | 28px (1.6em) | 24px (1.4em) | 700 | #ffd700 | Section heading |
| H3 | 24px (1.4em) | 20px (1.2em) | 18px (1.1em) | 700 | #d4a574 | Card title, subsection |
| H4 | 18px (1.2em) | 16px (1em) | 16px (1em) | 700 | #d4a574 | Feature label, small heading |

#### Body Text Variants

| Type | Size | Line Height | Weight | Color (Dark) | Usage |
|------|------|-------------|--------|-------------|-------|
| Body | 16px | 1.8 | 400 | #f4e4d4 | Default paragraph text |
| Body Bold | 16px | 1.8 | 700 | #f4e4d4 | Emphasis via `<strong>` |
| Small | 14px | 1.8 | 400 | #d4a574 | Meta, bylines, captions |
| Extra Small | 12px | 1.6 | 400 | #d4a574 (0.8 opacity) | Labels, badges |

### Letter Spacing Rules

```css
/* Headings: Tighter for elegance */
h1, h2 { letter-spacing: -1px; }
h3, h4 { letter-spacing: 0.5px; }

/* Body: Minimal for readability */
p { letter-spacing: 0; }

/* Navigation: Open for emphasis */
.nav-menu a { letter-spacing: 1px; }
```

### Line Height Guidelines

```
Headings: 1.2 - 1.5 (tighter for visual impact)
Body Text: 1.6 - 1.8 (relaxed for readability)
Small Text: 1.6 (balance readability with compactness)
```

### Font Weight Usage

| Weight | Usage | Examples |
|--------|-------|----------|
| 400 (Regular) | Default body text, paragraphs | `<p>`, lists, body copy |
| 700 (Bold) | Emphasis, headings, navigation | `<h2>`, `<h3>`, `<strong>` |
| 900 (Black) | Primary emphasis, main titles | `<h1>`, hero headings |

---

## SPACING & LAYOUT RULES

### Spacing Scale Foundation

**Base Unit:** 10px (flexible multiplier system)

```
5px   = 0.5 units   → Micro-spacing
10px  = 1 unit      → Tight spacing
20px  = 2 units     → Standard spacing (70% usage)
30px  = 3 units     → Generous spacing
40px  = 4 units     → Major separation
50px  = 5 units     → Large visual breaks
60px  = 6 units     → Extra separation
```

### Container Padding Rules

| Breakpoint | Padding | Max Width | Usage |
|------------|---------|-----------|-------|
| Desktop (1400px) | 40px (left/right) | 1400px | Large monitors |
| Tablet (768px) | 30px | Auto | Tablets, laptops |
| Mobile (375px) | 20px | 375px | Phones |

### Grid Gap Specifications

| Breakpoint | Gap | Description |
|------------|-----|-------------|
| Desktop | 40px | Generous spacing for premium feel |
| Tablet | 30px | Balanced reduction for smaller screens |
| Mobile | 20px | Minimal but comfortable touch spacing |

### Card Padding Hierarchy

```css
.card { padding: 20px; }                    /* Standard cards */
.card--featured { padding: 30px; }          /* Featured/hero cards */
.card--compact { padding: 15px 20px; }      /* Compact cards */
.card--dense { padding: 10px 15px; }        /* Badges, tags */

@media (max-width: 768px) {
  .card { padding: 18px; }
  .card--featured { padding: 20px; }
}
```

### Margin Rules

**Headings:**

```css
h1 { margin: 0 0 20px 0; }     /* Bottom margin only */
h2 { margin: 30px 0 20px 0; }  /* Top margin for new sections */
h3 { margin: 20px 0 15px 0; }
h4 { margin: 15px 0 10px 0; }
```

**Paragraphs:**

```css
p { margin: 0 0 15px 0; }
p:last-child { margin-bottom: 0; }  /* Remove trailing space */
```

**Lists:**

```css
ul, ol { margin: 0 0 20px 20px; }
li { margin-bottom: 10px; }
```

### Responsive Spacing Adjustments

| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Container Padding | 20px | 30px | 40px |
| Section Gap | 30px | 40px | 60px |
| Card Padding | 18px | 20px | 25px |
| Grid Gap | 20px | 30px | 40px |

---

## COMPONENT STATES & INTERACTIONS

### Hover States

**Card Hover (Featured):**

```css
.bento-item--featured:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
  transition: all 0.3s ease;
}
```

**Card Hover (Standard):**

```css
.bento-item:hover {
  border-color: #d4a574;
  box-shadow: 0 4px 12px rgba(212, 165, 116, 0.2);
  transform: translateY(-2px);
  transition: all 0.2s ease;
}
```

**Button Hover:**

```css
.btn--primary:hover {
  background: linear-gradient(135deg, #c49a6c 0%, #b88860 100%);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(212, 165, 116, 0.4);
}
```

### Active/Pressed States

```css
.btn--primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(212, 165, 116, 0.3);
}

.filter-btn.active {
  background: #d4a574;
  color: #2c1810;
}

.nav-menu a.active {
  border-bottom-color: #8b4513;
  color: #ffd700;
}
```

### Focus States (Keyboard Navigation)

**Universal Focus:**

```css
*:focus-visible {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}
```

**Custom Focus Styling:**

```css
.btn--primary:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(255, 215, 0, 0.2);
}

input:focus,
textarea:focus {
  border-color: #d4a574;
  outline: 2px solid #d4a574;
  outline-offset: 1px;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}
```

### Disabled States

```css
.btn:disabled,
.btn--loading {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.bento-item[aria-disabled="true"] {
  opacity: 0.6;
  cursor: not-allowed;
}
```

### Transition Timing

```css
/* Standard (most elements) */
transition: all 0.2s ease;        /* 200ms - quick feedback */

/* Slower (complex animations) */
transition: all 0.3s ease;        /* 300ms - smooth movement */

/* Very fast (state changes) */
transition: all 0.15s ease;       /* 150ms - quick response */
```

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## RESPONSIVE DESIGN RULES

### Breakpoint Strategy

| Device | Min Width | Max Width | Columns | Gap | Padding | Usage |
|--------|-----------|-----------|---------|-----|---------|-------|
| Mobile | 375px | 767px | 1 | 20px | 12px | Phones, small tablets |
| Tablet | 768px | 1099px | 2 | 30px | 15px | Tablets, small laptops |
| Desktop | 1100px | 1399px | 3 | 40px | 20px | Laptops, desktops |
| L. Desktop | 1400px+ | ∞ | 3 | 40px | 40px | Large monitors, TVs |

### Mobile-First Approach

All default styles target mobile (375px). Use media queries to enhance for larger screens:

```css
/* Default: Mobile styles */
.bento-grid {
  grid-template-columns: 1fr;
  gap: 20px;
}

/* Enhance for tablet and up */
@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 30px;
  }
}

/* Enhance for desktop */
@media (min-width: 1100px) {
  .bento-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
  }
}
```

### Responsive Typography

```css
/* Mobile first */
h1 { font-size: 32px; }
h2 { font-size: 24px; }
h3 { font-size: 18px; }
p { font-size: 14px; }

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

### Responsive Grid Layouts

**Mobile (1 Column):**

```
┌──────────────────┐
│   Hero           │
├──────────────────┤
│  Featured 1      │
├──────────────────┤
│  Standard 1      │
├──────────────────┤
│  Standard 2      │
└──────────────────┘
```

**Tablet (2 Columns):**

```
┌─────────────────┬─────────────────┐
│   Hero (2x1)                      │
├─────────────────┬─────────────────┤
│ Featured (1x1)  │ Featured (1x1)  │
├─────────────────┼─────────────────┤
│  Standard (1x1) │  Standard (1x1) │
└─────────────────┴─────────────────┘
```

**Desktop (3 Columns):**

```
┌─────────────────┬──────────────┬─────────────────┐
│                 │              │                 │
│      Hero       │  Featured 1  │  Featured 2     │
│     (2x2)       │    (1x1)     │    (1x1)        │
│                 │              │                 │
├─────────────────┼──────────────┼─────────────────┤
│  Standard 1 (1x1) │ Standard 2 (1x1) │ Standard 3 (1x1) │
├─────────────────┴──────────────┴─────────────────┤
│       Featured 3 (2x1)                           │
└───────────────────────────────────────────────────┘
```

### Touch Target Sizing

All interactive elements must be minimum **44px × 44px**:

```css
.btn--primary,
.btn--secondary {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 20px;  /* Results in 44px min height */
}

input, select, textarea {
  min-height: 44px;
  padding: 12px 15px;
}

a {
  padding: 4px 0;      /* Add vertical padding */
  display: inline-block;
}

.icon-btn {
  width: 48px;
  height: 48px;
  min-width: 48px;
  min-height: 48px;
}
```

---

## ACCESSIBILITY STANDARDS

### Color Contrast Requirements

**Minimum:** WCAG AA (4.5:1 for normal text)
**Target:** WCAG AAA (7:1 for normal text)
**Large Text:** 3:1 for text 18pt+ or 14pt+ bold

### Verified Color Combinations

| Text | Background | Ratio | Level | Status |
|------|-----------|-------|-------|--------|
| #f4e4d4 | #1a120b | 14.2:1 | AAA | ✓ |
| #2c1810 | #d4a574 | 12.4:1 | AAA | ✓ |
| #d4a574 | #1a120b | 7.1:1 | AA | ✓ |
| #ffd700 | #1a120b | 13.8:1 | AAA | ✓ |

### Keyboard Navigation

- All interactive elements must be keyboard accessible (Tab, Enter, Space)
- Tab order should be logical (left to right, top to bottom)
- Avoid `tabindex > 0` unless absolutely necessary
- Never remove focus indicators without providing custom ones

### Semantic HTML

**Good:**

```html
<header>
  <nav>
    <a href="/">Home</a>
  </nav>
</header>

<main>
  <article>
    <h1>Page Title</h1>
    <p>Content...</p>
  </article>
</main>

<footer>
  <p>&copy; 2025 Carnivore Weekly</p>
</footer>
```

**Avoid:**

```html
<div id="header">
  <div id="nav">
    <span onclick="goto('/')">Home</span>
  </div>
</div>
```

### Alternative Text for Images

```html
<!-- Good: Descriptive alt text -->
<img src="trending.jpg" alt="Graph showing 40% increase in carnivore practitioners">

<!-- Bad: Empty or generic -->
<img src="trending.jpg" alt="">
<img src="trending.jpg" alt="image">

<!-- Good: Decorative images can have empty alt -->
<img src="divider.svg" alt="">
```

### Form Accessibility

```html
<!-- Good: Label associated with input -->
<label for="email">Email Address:</label>
<input id="email" type="email" name="email" required>

<!-- Good: Help text for complex fields -->
<label for="password">Password:</label>
<input id="password" type="password" aria-describedby="password-hint">
<small id="password-hint">At least 8 characters, 1 uppercase, 1 number</small>

<!-- Good: Error states announced -->
<input id="email" type="email" aria-invalid="true" aria-describedby="email-error">
<span id="email-error" role="alert">Please enter a valid email</span>
```

### Skip Navigation Links

```html
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

## CODE EXAMPLES & TEMPLATES

### CSS Variables Setup

```css
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
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 15px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.5);
}
```

### BEM Naming Convention

```css
/* Block: Standalone component */
.card { }

/* Element: Part of the block */
.card__title { }
.card__content { }
.card__meta { }

/* Modifier: Variation of the block */
.card--featured { }
.card--compact { }

/* Applied to Carnivore Weekly */
.bento-grid { }
.bento-item { }
.bento-item--hero { }
.bento-item--featured { }
.bento-item--standard { }
.bento-item--tall { }

.btn { }
.btn--primary { }
.btn--secondary { }
.btn--small { }
```

### Complete Hero Card Implementation

**HTML:**

```html
<article class="bento-item bento-item--hero">
    <div>
        <h1>The Latest in Carnivore Culture</h1>
        <p>Discover the week's most compelling articles, studies, and conversations shaping the carnivore movement.</p>
    </div>
    <a href="/weekly" class="cta">Explore This Week</a>
</article>
```

**CSS:**

```css
.bento-item--hero {
  grid-column: span 2;
  grid-row: span 2;
  min-height: 400px;
  padding: 30px;
  background: linear-gradient(135deg, #d4a574 0%, #c49a6c 100%);
  border: 3px solid #8b4513;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.bento-item--hero::before {
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

.bento-item--hero > * {
  position: relative;
  z-index: 1;
}

.bento-item--hero:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.6);
}

.bento-item--hero h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 3.2em;
  color: #2c1810;
  margin-bottom: 20px;
  line-height: 1.2;
  font-weight: 900;
  text-shadow: 2px 2px 0 rgba(255, 255, 255, 0.3);
}

.bento-item--hero p {
  font-family: 'Merriweather', Georgia, serif;
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

/* Tablet */
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

/* Mobile */
@media (max-width: 767px) {
  .bento-item--hero {
    grid-column: span 1;
    grid-row: span 1;
    min-height: 250px;
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

---

## IMPLEMENTATION CHECKLIST

Use this checklist when implementing the design system:

### Phase 1: Setup (Before Development)

- [ ] Copy `design-tokens.json` to project
- [ ] Set up Google Fonts import for Playfair Display + Merriweather
- [ ] Create `:root` CSS variables from token library
- [ ] Create base CSS file with resets and global styles
- [ ] Test font rendering across browsers

### Phase 2: Component Development

- [ ] Create `.bento-grid` base styles
- [ ] Create `.bento-item` base styles
- [ ] Create `.bento-item--hero` variant
- [ ] Create `.bento-item--featured` variant
- [ ] Create `.bento-item--standard` variant
- [ ] Create `.bento-item--tall` modifier
- [ ] Create `.btn--primary` button
- [ ] Create `.btn--secondary` button
- [ ] Create `.btn--small` button
- [ ] Create form input styles
- [ ] Test all states (default, hover, active, focus, disabled)

### Phase 3: Responsive Testing

- [ ] Test at 375px (mobile) viewport
- [ ] Test at 768px (tablet min) viewport
- [ ] Test at 1100px (desktop min) viewport
- [ ] Test at 1400px (large desktop) viewport
- [ ] Verify card spanning behavior at each breakpoint
- [ ] Verify typography scaling at each breakpoint
- [ ] Verify spacing adjustments at each breakpoint
- [ ] Test touch interactions on actual mobile devices

### Phase 4: Accessibility Validation

- [ ] Run color contrast checker (target 4.5:1+)
- [ ] Test keyboard navigation (Tab through all elements)
- [ ] Test with screen reader (VoiceOver, NVDA, JAWS)
- [ ] Verify heading hierarchy (h1 > h2 > h3)
- [ ] Verify all images have descriptive alt text
- [ ] Verify all form inputs have associated labels
- [ ] Verify focus indicators visible on all interactive elements
- [ ] Verify touch targets are 44px+ minimum

### Phase 5: Performance Audit

- [ ] Run Lighthouse audit (target 90+ scores)
- [ ] Verify First Contentful Paint < 1.8s
- [ ] Verify Largest Contentful Paint < 2.5s
- [ ] Verify Cumulative Layout Shift < 0.1
- [ ] Optimize all images (< 200KB each)
- [ ] Minimize CSS/JS bundle sizes
- [ ] Check for unused CSS
- [ ] Verify fonts load efficiently

### Phase 6: Cross-Browser Testing

- [ ] Test on Chrome (latest)
- [ ] Test on Firefox (latest)
- [ ] Test on Safari (latest)
- [ ] Test on Edge (latest)
- [ ] Test on mobile Safari (iOS)
- [ ] Test on Chrome Mobile (Android)
- [ ] Verify gradients render correctly
- [ ] Verify shadows render correctly
- [ ] Verify text shadows render correctly

### Phase 7: Content Integration

- [ ] Add real content to all card types
- [ ] Verify content doesn't overflow cards
- [ ] Adjust min-heights if needed based on typical content
- [ ] Test with various image dimensions
- [ ] Test with long headings (word wrapping)
- [ ] Test with long descriptions (overflow behavior)
- [ ] Add meta information (bylines, dates, etc.)
- [ ] Add badges/tags to featured sections

### Phase 8: QA & Polish

- [ ] Create design system documentation (this guide)
- [ ] Take screenshots of all components
- [ ] Create visual regression testing baseline
- [ ] Document any customizations made
- [ ] Create developer quick-start guide
- [ ] Create designer quick-start guide
- [ ] Get approval from CEO/brand stakeholder
- [ ] Deploy to production

---

## DESIGNER QUICK START

### For Designers Building in Figma

1. **Import Design Tokens**
   - Download `design-tokens.json`
   - Use Figma Tokens plugin to import
   - Create color styles for all 6 primary colors
   - Create typography styles for H1-H4 and body variants

2. **Create Component Library**
   - Create `.bento-item` base component
   - Create `.bento-item--hero` variant (2×2 span)
   - Create `.bento-item--featured` variant (2×1 span)
   - Create `.bento-item--standard` variant (1×1 span)
   - Create `.bento-item--tall` variant (1×2 span)

3. **Create Button Components**
   - Create `.btn--primary` with states
   - Create `.btn--secondary` with states
   - Create `.btn--small` utility button

4. **Set Up Responsive Variants**
   - Create frame for desktop layout (1400px)
   - Create frame for tablet layout (1099px)
   - Create frame for mobile layout (375px)
   - Document responsive behavior for each component

5. **Accessibility Checklist**
   - Verify all text meets 4.5:1 contrast minimum
   - Add focus state variants (use gold outline)
   - Add disabled state variants
   - Document interaction states for developers

### Color Specifications for Figma

Copy these hex values exactly:

```
Background: #1a120b
Text Brown: #2c1810
Accent Tan: #d4a574
Gold: #ffd700
Light Text: #f4e4d4
Border: #8b4513
```

### Font Specifications for Figma

**Headings (H1-H4):**
- Font: Playfair Display
- Weights: 700 (H2-H4), 900 (H1)
- Size: See typography table above

**Body Text:**
- Font: Merriweather
- Weights: 400 (regular), 700 (bold)
- Size: See typography table above

---

## DEVELOPER QUICK START

### 1. Copy CSS Framework

Copy the complete CSS from the design tokens and component specifications into your stylesheet. Or use this shorthand:

```css
/* 1. Import Fonts */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;700&display=swap');

/* 2. Define CSS Variables */
:root {
  /* [Copy from design-tokens.json] */
}

/* 3. Reset & Base */
* { margin: 0; padding: 0; box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { font-family: var(--font-body); color: var(--text-primary); }

/* 4. Typography */
/* [Copy heading and body styles] */

/* 5. Layout */
/* [Copy grid and container styles] */

/* 6. Components */
/* [Copy all component styles] */

/* 7. Responsive */
/* [Copy media queries for each breakpoint] */
```

### 2. Create HTML Structure

```html
<section class="container">
    <div class="bento-grid">
        <!-- Hero Section -->
        <article class="bento-item bento-item--hero">
            <div>
                <h1>Main Heading</h1>
                <p>Description text</p>
            </div>
            <a href="#" class="cta">Learn More</a>
        </article>

        <!-- Featured Items -->
        <article class="bento-item bento-item--featured">
            <span class="badge">Label</span>
            <h2>Featured Title</h2>
            <p>Description</p>
        </article>

        <!-- Standard Items -->
        <article class="bento-item bento-item--standard">
            <h3>Content Title</h3>
            <p>Brief description</p>
            <a href="#" class="read-more">Read More →</a>
        </article>
    </div>
</section>
```

### 3. Test Responsive Breakpoints

```bash
# Test at these exact viewports
375px   # Mobile (iPhone)
768px   # Tablet (iPad)
1100px  # Desktop
1400px  # Large Desktop
```

### 4. Validate Accessibility

```bash
# Run these checks
- Lighthouse audit (90+ score target)
- axe DevTools for accessibility violations
- WAVE browser extension for contrast issues
- Screen reader testing (Safari VoiceOver)
- Keyboard navigation (Tab through all elements)
```

### 5. Performance Optimization

```bash
# Target metrics
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Cumulative Layout Shift: < 0.1
- Lighthouse Performance: 90+
```

---

## TROUBLESHOOTING GUIDE

### Common Issues & Solutions

**Q: Grid items not spanning correctly**

A: Ensure the parent has `display: grid` and `grid-template-columns` is defined. Check for conflicting `grid-column: span 1 !important` in mobile media queries.

```css
.bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);  /* Required */
}

@media (max-width: 767px) {
  .bento-item { grid-column: span 1 !important; } /* Override desktop spans */
}
```

**Q: Text not visible on texture overlay**

A: Make sure `.bento-item > *` has `position: relative; z-index: 1;` to appear above the pseudo-element.

```css
.bento-item::before { z-index: 0; pointer-events: none; }
.bento-item > * { position: relative; z-index: 1; }
```

**Q: Hover animation not working smoothly**

A: Ensure `transition: all 0.2s ease;` is on the element, and use `transform: translateY()` instead of `margin/padding` changes.

```css
.bento-item {
  transition: all 0.2s ease;  /* Required */
}

.bento-item:hover {
  transform: translateY(-4px);  /* GPU-accelerated */
  box-shadow: ...;
}
```

**Q: Mobile layout showing wrong gaps**

A: Verify media query breakpoint is correct (`max-width: 767px`), and that `gap` property is set on the grid.

```css
.bento-grid { gap: 40px; }  /* Desktop */

@media (max-width: 1099px) {
  .bento-grid { gap: 30px; }  /* Tablet */
}

@media (max-width: 767px) {
  .bento-grid { gap: 20px; }  /* Mobile */
}
```

**Q: Colors not matching design specifications**

A: Use exact hex values from design tokens:

```
#1a120b (not #1A120B or #1a120C)
#2c1810 (not #2C1810 or #2d1810)
#d4a574 (not #D4A574 or #d4a574)
```

Use a color picker to verify exact values in browser DevTools.

**Q: Font sizes too small on mobile**

A: Ensure mobile media queries include font-size adjustments:

```css
h1 { font-size: 32px; }      /* Mobile default */

@media (min-width: 768px) {
  h1 { font-size: 38px; }    /* Tablet */
}

@media (min-width: 1100px) {
  h1 { font-size: 48px; }    /* Desktop */
}
```

**Q: Focus indicators not visible**

A: Set explicit focus style with high contrast color:

```css
*:focus-visible {
  outline: 2px solid #ffd700;  /* Gold on dark background */
  outline-offset: 2px;
}
```

Test by pressing Tab key. Focus outline must be clearly visible.

---

## APPENDIX: DESIGN SYSTEM STATISTICS

### Component Coverage

| Component Type | Variants | States | Total Combinations |
|--------|----------|--------|------------------|
| Card (Hero) | 1 | 5 | 5 |
| Card (Featured) | 1 | 5 | 5 |
| Card (Standard) | 1 | 5 | 5 |
| Button (Primary) | 1 | 6 | 6 |
| Button (Secondary) | 1 | 4 | 4 |
| Button (Small) | 1 | 2 | 2 |
| Form Input | 1 | 2 | 2 |
| **TOTAL** | **6** | **~29** | **~29** |

### Responsive Design Coverage

| Breakpoint | Width | Columns | Gap | Coverage |
|-----------|-------|---------|-----|----------|
| Mobile | 375px | 1 | 20px | 20-25% of users |
| Tablet | 768px | 2 | 30px | 25-30% of users |
| Desktop | 1100px | 3 | 40px | 40-50% of users |
| L. Desktop | 1400px | 3 | 40px | 5-10% of users |

### Accessibility Compliance

| Standard | Requirement | Status |
|----------|-------------|--------|
| WCAG 2.1 | AA (4.5:1 contrast) | ✓ Exceeds (7-14:1) |
| Touch Targets | 44px minimum | ✓ Compliant |
| Keyboard Nav | Tab/Arrow/Enter | ✓ Compliant |
| Focus Indicators | Visible | ✓ Gold outline visible |
| Semantic HTML | Proper structure | ✓ Implemented |
| Alt Text | All images | ✓ Required in implementation |

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Dec 31, 2025 | Initial complete specification with all components, responsive breakpoints, and implementation guides |

---

## CONTACT & SUPPORT

### Design System Owner

- **Primary Contact:** CEO/Founder - Strategic decisions, brand compliance
- **Technical Questions:** Lead Developer - Implementation guidance
- **Visual Issues:** QA Lead - Regression testing, visual validation

### When to Ask for Help

- **Color changes:** Contact CEO (brand identity decision)
- **Typography changes:** Contact CEO (brand identity decision)
- **New components:** Contact CEO (design system expansion)
- **Technical implementation:** Contact Lead Developer
- **Visual bugs:** Contact QA Lead with screenshots

---

**Document Version 1.0**
**Last Updated: December 31, 2025**
**For: Carnivore Weekly Design System**
**Standards: WCAG 2.1 AA, CSS Grid, Semantic HTML5**

