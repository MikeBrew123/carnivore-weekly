# Bento Grid CSS Specification - Executive Summary

**Document:** `BENTO_GRID_SPECIFICATION.md`
**Total Length:** 2,548 lines of comprehensive documentation
**Version:** 1.0
**Date:** December 31, 2025

---

## Document Overview

The complete Bento Grid CSS specification for Carnivore Weekly's homepage redesign is a comprehensive reference guide containing production-ready code, design principles, responsive strategies, and implementation guidance. This summary highlights key sections and quick-reference information.

---

## Core Sections Included

### 1. **Grid System Architecture** (Lines 65-162)
Complete CSS Grid implementation with three primary breakpoints:

**Desktop (1400px container):**
- 3-column grid with `grid-template-columns: repeat(3, 1fr)`
- 40px gap spacing
- Per-column width: ~426px

**Tablet (768px-1099px):**
- 2-column grid with `grid-template-columns: repeat(2, 1fr)`
- 30px gap spacing
- Per-column width: ~519px

**Mobile (375px-767px):**
- 1-column stacked layout
- 20px gap spacing
- Full-width items: 351px

Includes advanced `minmax()` techniques for flexible, breakpoint-free responsive design.

---

### 2. **Component Classes** (Lines 163-544)

Four main component classes with complete CSS specifications:

| Class | Purpose | Grid Cells | Min Height | Padding |
|-------|---------|-----------|-----------|---------|
| `.bento-grid` | Main container | - | - | 20px (desktop) |
| `.bento-item` | Base styling | 1x1 | 200px | 20px |
| `.bento-item--hero` | Feature section | 2x2 (desktop) | 400px | 30px |
| `.bento-item--featured` | Secondary items | 2x1 (desktop) | 240px | 25px |
| `.bento-item--standard` | Regular items | 1x1 | 220px | 20px |
| `.bento-item--tall` | Tall modifier | 1x2 (desktop) | 450px | 20px |

Each includes:
- Complete CSS with all properties
- Responsive breakpoint overrides
- Typography specifications
- Interaction states
- Hover animations

---

### 3. **Responsive Breakpoints** (Lines 545-735)

Three detailed breakpoint sections with layout diagrams:

**Desktop (1100px+):**
```
┌─────────────────────┬──────────────┐
│                     │              │
│      Hero           │  Featured 1  │
│     (2x2)           │   (1x1)      │
│                     │              │
├─────────────────────┼──────────────┤
│ Standard 1 | Standard 2 │
├────────────────────┴──────────────┤
│       Featured 2 (2x1)             │
└────────────────────────────────────┘
```

**Tablet (768px-1099px):** 2-column layout
**Mobile (375px-767px):** Single-column stack

Complete CSS for each breakpoint with grid column/row spans and sizing adjustments.

---

### 4. **Color and Typography** (Lines 737-835)

**Color Palette:**
- Primary: #d4a574 (accent tan)
- Dark: #1a120b, #2c1810
- Accent: #8b4513 (brown), #ffd700 (gold)
- Light: #f4e4d4

**Typography Scale:**
- Headings: Playfair Display, weights 700-900
- Body: Merriweather, weights 400-700
- Includes desktop, tablet, mobile font sizes
- WCAG AA contrast compliance (4.5:1 minimum)

**Type Scale Table:**
| Element | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| H1 Hero | 3.2em | 2.4em | 2em |
| H2 Featured | 2.2em | 1.8em | 1.6em |
| H3 Standard | 1.6em | 1.5em | 1.3em |

---

### 5. **Spacing System** (Lines 838-1015)

Comprehensive spacing guidelines:

**Gap Spacing:** 40px (desktop) → 30px (tablet) → 20px (mobile)
**Item Padding:** 20-30px depending on item type
**Container Padding:** 20px (desktop) → 15px (tablet) → 12px (mobile)
**Margin Rules:** 15-20px between content elements

Includes rationale and impact calculations on available content width.

---

### 6. **Animations and Interactions** (Lines 1018-1241)

Complete motion design system:

**Hover Effects:**
- Item lift: `transform: translateY(-4px)` over 0.3s
- Button hover: `translateY(-2px)` with shadow enhancement
- Link arrow: `translateX(4px)` on hover

**Page Load:**
- `fadeInUp` keyframe animation (0.6s)
- Staggered delays (0.1s per item)
- Respects `prefers-reduced-motion`

**Focus States:**
- 3px outline with 2px offset
- High-contrast colors (5.4:1)
- WCAG AAA keyboard navigation support

**Touch Support:**
- Disables hover on mobile devices
- Active state: `scale(0.98)`
- Pointer vs. touch media queries

---

### 7. **Advanced Responsive Techniques** (Lines 1245-1553)

Modern CSS features for maximum flexibility:

**Container Queries** (Chrome 105+, Firefox 110+, Safari 16+)
- Style based on container width, not viewport
- Future-proof for component reusability

**Fluid Spacing with clamp():**
```css
gap: clamp(20px, 3vw, 40px);
padding: clamp(12px, 2vw, 20px);
```

**Aspect Ratio Maintenance:**
- Hero: 16/9
- Featured: 2/1
- Standard: 4/3

**Flexible Grid with auto-fit:**
- Single CSS rule works across all breakpoints
- Minimal media queries needed

**Responsive Text Scale:**
- Smooth typography scaling: `font-size: clamp(1.6em, 8vw, 3.2em);`
- Eliminates need for media query font-size changes

**Additional Features:**
- Orientation-based responsive (portrait/landscape)
- Safe area insets for notched devices
- Viewport height responsiveness
- Reduced data mode support
- Dark mode support (prefers-color-scheme)

---

### 8. **Code Examples** (Lines 1557-2116)

**Production-ready CSS:**
- Complete `.bento-grid` class definitions
- All item type classes (hero, featured, standard, tall)
- All three breakpoints with full overrides
- Copy-paste ready for immediate use

**HTML Structure Examples:**
- Hero item example
- Featured item example
- Standard item example
- Complete grid layout example with all item types

**Media Query Examples:**
- `minmax()` for flexible columns
- Complete tablet-only rules
- Mobile-first alternative approach

---

### 9. **Accessibility** (Lines 2118-2269)

Comprehensive accessibility guidelines:

**Semantic HTML:**
- Proper `<article>`, `<section>` tags
- Semantic structure over div soup

**Heading Hierarchy:**
- h1 > h2 > h3 progression
- Logical structure for screen readers

**Color Contrast:**
- All color combinations meet WCAG AA (4.5:1+)
- Specific contrast ratio examples provided

**Focus States:**
- 3px outline with proper offset
- High-contrast colors

**Alt Text and Accessibility:**
- Meaningful alt attributes for images
- Screen reader text guidelines
- Skip links implementation

---

### 10. **Performance Optimization** (Lines 2269-2323)

**CSS Optimization:**
- Use transforms instead of properties that trigger repaints
- GPU-accelerated animations
- Minimal JavaScript required

**Grid Performance:**
- Native browser support (all modern browsers)
- No layout shifts or repaints
- Single-pass calculation

**Image Optimization:**
- Responsive image sizing with `aspect-ratio`
- `object-fit: cover` for proper scaling
- Lazy loading implementation

**Loading Performance:**
- Target metrics:
  - FCP: < 1.8s
  - LCP: < 2.5s
  - CLS: < 0.1

---

### 11. **Quick Reference Guide** (Lines 2348-2398)

Instant reference tables:

**Grid Dimensions Cheat Sheet:**
| Breakpoint | Columns | Gap | Per-Item Width |
|---|---|---|---|
| Desktop | 3 | 40px | 426px |
| Tablet | 2 | 30px | 519px |
| Mobile | 1 | 20px | 351px |

**Item Types at a Glance:**
Quick matrix of all component classes and their properties across breakpoints

**Typography Scale:**
All font sizes and weights for all element types

**Color Palette Reference:**
CSS custom property definitions for easy implementation

**Timing and Motion:**
All animation durations, easing functions, and transforms

---

### 12. **Implementation Workflow** (Lines 2402-2493)

Seven-step implementation guide:

1. **Set Up Base Styles** - Copy CSS or create separate stylesheet
2. **Create HTML Structure** - Wrap items in `.bento-grid` with appropriate classes
3. **Test Responsive Breakpoints** - Verify layout at 1400px, 1099px, 768px, 375px, 1080px
4. **Optimize Images** - Use srcset and lazy loading
5. **Validate Accessibility** - Contrast check, keyboard test, screen reader test
6. **Performance Audit** - Lighthouse testing with target scores
7. **Cross-Browser Testing** - Test on all major browsers and devices

---

### 13. **Troubleshooting** (Lines 2497-2540)

Common issues and solutions:

- Items not spanning correctly
- Gap spacing not working
- Text not visible on texture overlay
- Mobile layout gap issues
- Font sizes too small on mobile

Each with clear diagnostic steps and fixes.

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Total Lines | 2,548 |
| Code Examples | 50+ |
| CSS Classes | 6 main + modifiers |
| Responsive Breakpoints | 3 primary + orientation + height-based |
| Animation Types | 5+ |
| HTML Examples | 5 complete |
| Color Values | 7 core colors |
| Accessibility Sections | 7 |
| Performance Guidelines | 10+ metrics |

---

## What Developers Will Find

**Front-end developers:** Complete, production-ready CSS they can copy-paste immediately
**Designers:** Responsive layout specifications, spacing system, typography scale
**Project managers:** Clear implementation workflow, timeline, testing requirements
**QA engineers:** Comprehensive testing checklist, cross-browser requirements
**Accessibility specialists:** WCAG AA compliance specifications, contrast ratios, focus states
**Performance engineers:** Lighthouse targets, Core Web Vitals metrics, optimization strategies

---

## Design Philosophy

The specification maintains Carnivore Weekly's premium, editorial aesthetic:
- No trendy designs
- Generous, thoughtful spacing
- Premium leather-textured appearance
- Classic typography (Playfair Display + Merriweather)
- Sophisticated color palette
- Performance-optimized implementation

---

## Standards Compliance

- **CSS Grid:** Full browser support (modern browsers)
- **Responsive Design:** Mobile-first, tablet-optimized, desktop-enhanced
- **Accessibility:** WCAG 2.1 Level AA compliance
- **Performance:** Core Web Vitals optimization
- **Typography:** Fluid scaling with clamp()
- **Animations:** Respects `prefers-reduced-motion`
- **Dark Mode:** Optional `prefers-color-scheme` support

---

## Quick Start

1. Copy the complete CSS from the "Complete CSS Class Definitions" section (lines 1559-1889)
2. Create HTML using the structure examples (lines 1891-2010)
3. Test at the key breakpoints specified (1400px, 1099px, 768px, 375px)
4. Verify 5-7 items fit above fold on 1080px viewport
5. Run through the implementation checklist

---

## File Location

**Path:** `/Users/mbrew/Developer/carnivore-weekly/BENTO_GRID_SPECIFICATION.md`

---

## Version and Updates

**Current Version:** 1.0 (December 31, 2025)

Future versions may include:
- Live component library examples
- Interactive breakpoint tester
- Automated Lighthouse integration
- Component-specific variations
- Dark mode variants

---

## Document Structure Summary

```
BENTO_GRID_SPECIFICATION.md
├── Overview (purpose, key specs)
├── Design Principles (4 core principles)
├── Grid System Architecture
│   ├── Desktop Grid (1400px)
│   ├── Tablet Grid (1099px)
│   ├── Mobile Grid (375px)
│   └── Advanced minmax() techniques
├── Component Classes
│   ├── .bento-grid (container)
│   ├── .bento-item (base)
│   ├── .bento-item--hero (2x2)
│   ├── .bento-item--featured (2x1)
│   ├── .bento-item--standard (1x1)
│   └── .bento-item--tall (1x2)
├── Responsive Breakpoints (desktop/tablet/mobile)
├── Color and Typography
├── Spacing System
├── Animations and Interactions
├── Advanced Responsive Techniques
├── Code Examples (complete, copy-ready)
├── Accessibility Considerations
├── Performance Notes
├── Implementation Checklist
├── Quick Reference Guide
├── Implementation Workflow
├── Troubleshooting
├── Version History
└── Additional Resources
```

---

## Navigation Tips

- Use Ctrl+F / Cmd+F to search for specific classes (e.g., "bento-item--hero")
- Jump to sections via the Table of Contents (lines 10-23)
- Reference the Quick Reference Guide (line 2348) for instant lookups
- Follow the Implementation Workflow (line 2402) for step-by-step guidance
- Consult Troubleshooting (line 2497) for common issues

---

**This comprehensive specification document is ready for immediate use in development, providing all CSS, HTML, responsive behavior, animations, and accessibility guidelines needed to implement the Carnivore Weekly Bento Grid system.**

