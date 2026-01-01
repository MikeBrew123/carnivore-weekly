# Design System Implementation Guide
## For Developers & Designers

**Last Updated:** December 31, 2025
**Version:** 1.0
**Quick Reference:** Copy-paste code snippets for common components

---

## QUICK START

### 1. Import Fonts (Required)

Add to your `<head>` section:

```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
```

### 2. Define CSS Variables

Add to your CSS file (top, after @import):

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

  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-normal: 0.2s ease;
  --transition-slow: 0.3s ease;

  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.2);
  --shadow-md: 0 4px 15px rgba(0,0,0,0.3);
  --shadow-lg: 0 8px 25px rgba(0,0,0,0.5);
}
```

---

## COPY-PASTE COMPONENTS

### Hero Card (Full-Width Feature)

**HTML:**
```html
<div class="card card--hero">
  <h2>Trending This Week</h2>
  <p>Community is discussing carnivore + fasting protocols. New research suggests metabolic advantages.</p>
</div>
```

**CSS:**
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

.card--hero h2 {
  color: #2c1810;
  font-size: 28px;
  margin-bottom: 15px;
}

.card--hero p {
  color: #2c1810;
  font-size: 16px;
  line-height: 1.8;
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

---

### Featured Card (Bento Grid Item)

**HTML:**
```html
<div class="card card--featured">
  <h3>Top Video This Week</h3>
  <p>Paul Saladino discusses the lion diet: just beef, salt, and water for 30 days.</p>
  <div class="card__meta">1.2M views • 456K likes</div>
</div>
```

**CSS:**
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
  font-family: var(--font-display);
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

.card--featured .card__meta {
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

---

### Standard Card

**HTML:**
```html
<div class="card">
  <h4>Recent Comment</h4>
  <p>Sarah shared her 6-month results: 32 lbs lost, bloodwork improved.</p>
</div>
```

**CSS:**
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
```

---

### Bento Grid Layout

**HTML:**
```html
<div class="bento-grid">
  <div class="card card--hero">Hero content</div>
  <div class="card card--featured">Featured 1</div>
  <div class="card card--featured">Featured 2</div>
  <div class="card">Standard 1</div>
  <div class="card">Standard 2</div>
</div>
```

**CSS:**
```css
.bento-grid {
  display: grid;
  gap: 20px;
  margin-bottom: 40px;
}

/* Mobile: 1 column */
@media (min-width: 375px) {
  .bento-grid {
    grid-template-columns: 1fr;
    gap: 15px;
    padding: 12px;
  }
}

/* Tablet: 2 columns */
@media (min-width: 768px) {
  .bento-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 18px;
    padding: 15px;
  }

  .card--hero {
    grid-column: 1 / -1;  /* Full width */
  }
}

/* Desktop: 3 columns */
@media (min-width: 1100px) {
  .bento-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    padding: 20px;
  }

  .card--hero {
    grid-column: 1 / -1;  /* Full width */
    min-height: 300px;
  }
}

/* Large Desktop */
@media (min-width: 1400px) {
  .bento-grid {
    gap: 25px;
    padding: 30px;
  }
}
```

---

### Button - Primary CTA

**HTML:**
```html
<button class="btn btn--primary">Subscribe to Newsletter</button>
<a href="/blog" class="btn btn--primary">Read More</a>
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

---

### Button - Secondary

**HTML:**
```html
<button class="btn btn--secondary">Learn More</button>
<a href="#filter" class="btn btn--secondary">See All</a>
```

**CSS:**
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

---

### Button - Small

**HTML:**
```html
<button class="btn btn--small">Filter</button>
<a href="#" class="btn btn--small">×</a>
```

**CSS:**
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
  text-decoration: none;
}

.btn--small:hover {
  background: #a55a1f;
}

.btn--small:focus {
  outline: 2px solid #ffd700;
  outline-offset: 1px;
}
```

---

### Text Input & Forms

**HTML:**
```html
<form>
  <label for="email">Email Address:</label>
  <input type="email" id="email" name="email" placeholder="you@example.com" required>

  <label for="message">Message:</label>
  <textarea id="message" name="message" rows="5"></textarea>

  <button type="submit" class="btn btn--primary">Send</button>
</form>
```

**CSS:**
```css
input[type="text"],
input[type="email"],
input[type="search"],
textarea,
select {
  width: 100%;
  padding: 12px 15px;
  background: #2c1810;
  color: #f4e4d4;
  border: 2px solid #8b4513;
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 14px;
  line-height: 1.6;
  transition: all 0.2s ease;
  margin-bottom: 15px;
}

input:focus,
textarea:focus,
select:focus {
  border-color: #d4a574;
  outline: 2px solid #d4a574;
  outline-offset: 1px;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}

input::placeholder,
textarea::placeholder {
  color: #8b4513;
  opacity: 0.7;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #d4a574;
  font-weight: 600;
  font-size: 14px;
}

textarea {
  resize: vertical;
  min-height: 150px;
}
```

---

## TYPOGRAPHY EXAMPLES

### Headings

**HTML:**
```html
<h1>Main Page Title</h1>
<h2>Section Heading</h2>
<h3>Subsection or Card Title</h3>
<h4>Feature Label</h4>
```

**CSS:**
```css
h1 {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 900;
  color: #ffd700;
  line-height: 1.3;
  margin: 0 0 20px 0;
  letter-spacing: -1px;
}

h2 {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: #ffd700;
  line-height: 1.4;
  margin: 30px 0 20px 0;
  letter-spacing: -1px;
  border-bottom: 4px solid #8b4513;
  padding-bottom: 15px;
}

h3 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  color: #d4a574;
  line-height: 1.5;
  margin: 20px 0 15px 0;
  letter-spacing: 0.5px;
}

h4 {
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 700;
  color: #d4a574;
  line-height: 1.6;
  margin: 15px 0 10px 0;
  letter-spacing: 0.5px;
}
```

### Body Text

**HTML:**
```html
<p>Standard paragraph text explaining the topic in detail.</p>
<p>
  This is <strong>bold text</strong> for emphasis and <em>italic text</em> for nuance.
</p>
```

**CSS:**
```css
p {
  font-family: var(--font-body);
  font-size: 16px;
  font-weight: 400;
  color: #f4e4d4;
  line-height: 1.8;
  margin: 0 0 15px 0;
}

p:last-child {
  margin-bottom: 0;
}

strong {
  font-weight: 700;
  color: #f4e4d4;
}

em {
  font-style: italic;
  color: #d4a574;
}
```

### Small Text (Meta)

**HTML:**
```html
<p class="text-small">By Sarah Mitchell • December 30, 2025 • 8 min read</p>
```

**CSS:**
```css
.text-small {
  font-size: 14px;
  color: #d4a574;
  margin-bottom: 15px;
  opacity: 0.9;
}

.text-extra-small {
  font-size: 12px;
  color: #d4a574;
  opacity: 0.8;
}
```

---

## SPACING UTILITIES

### Common Spacing Classes (Optional)

```css
/* Margins */
.mb-5 { margin-bottom: 5px; }
.mb-10 { margin-bottom: 10px; }
.mb-20 { margin-bottom: 20px; }
.mb-30 { margin-bottom: 30px; }
.mb-40 { margin-bottom: 40px; }

.mt-10 { margin-top: 10px; }
.mt-20 { margin-top: 20px; }
.mt-30 { margin-top: 30px; }

/* Padding */
.p-10 { padding: 10px; }
.p-20 { padding: 20px; }
.p-30 { padding: 30px; }

.px-20 { padding-left: 20px; padding-right: 20px; }
.py-20 { padding-top: 20px; padding-bottom: 20px; }
```

---

## RESPONSIVE MEDIA QUERY TEMPLATE

```css
/* Base styles (mobile-first) */
.element {
  font-size: 14px;
  padding: 12px;
}

/* Tablet (768px and up) */
@media (min-width: 768px) {
  .element {
    font-size: 15px;
    padding: 15px;
  }
}

/* Desktop (1100px and up) */
@media (min-width: 1100px) {
  .element {
    font-size: 16px;
    padding: 20px;
  }
}

/* Large Desktop (1400px and up) */
@media (min-width: 1400px) {
  .element {
    font-size: 16px;
    padding: 30px;
  }
}
```

---

## ACCESSIBILITY CHECKLIST

Before deploying any component:

- [ ] **Color Contrast:** Text meets WCAG AA minimum (4.5:1 ratio)
- [ ] **Focus States:** All interactive elements have visible focus outline
- [ ] **Touch Targets:** Buttons/links minimum 44px × 44px
- [ ] **Semantic HTML:** Use `<button>`, `<a>`, `<label>` properly
- [ ] **Alt Text:** All images have descriptive alt attributes
- [ ] **Keyboard Navigation:** Tab order is logical left-to-right, top-to-bottom
- [ ] **Form Labels:** Labels associated with inputs via `for` attribute
- [ ] **ARIA Labels:** Add `aria-label` for icon-only buttons

### Focus State Template

```css
/* Universal focus state for all interactive elements */
button:focus,
a:focus,
input:focus,
textarea:focus,
select:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}

/* Additional styling for inputs */
input:focus,
textarea:focus,
select:focus {
  border-color: #d4a574;
  box-shadow: 0 0 0 3px rgba(212, 165, 116, 0.1);
}
```

---

## COMMON MISTAKES TO AVOID

### ❌ Wrong Colors

```css
/* BAD: Using arbitrary colors */
.card {
  background: #6d3819;  /* Not approved */
  color: #e8d4c0;       /* Not approved */
}

/* GOOD: Using design tokens */
.card {
  background: linear-gradient(135deg, #8b4513 0%, #6d3819 100%);
  color: #f4e4d4;
}
```

### ❌ Inconsistent Spacing

```css
/* BAD: Ad-hoc spacing */
.card {
  padding: 18px;       /* Not in grid */
  margin-bottom: 23px; /* Not in grid */
  gap: 17px;           /* Not in grid */
}

/* GOOD: Using spacing grid */
.card {
  padding: 20px;       /* Standard */
  margin-bottom: 20px; /* Standard */
  gap: 20px;           /* Standard */
}
```

### ❌ Missing Focus States

```css
/* BAD: No keyboard navigation */
button {
  outline: none;  /* ACCESSIBILITY VIOLATION */
}

/* GOOD: Visible focus indicator */
button:focus {
  outline: 2px solid #ffd700;
  outline-offset: 2px;
}
```

### ❌ Font Substitutions

```css
/* BAD: Using wrong fonts */
h1 {
  font-family: Arial, sans-serif;  /* Not brand */
}

/* GOOD: Using approved fonts */
h1 {
  font-family: var(--font-display);  /* 'Playfair Display' */
}
```

---

## MIGRATION FROM OLD PATTERNS

If updating existing code from Refined Traditional:

1. **Find old selectors:**
   ```css
   .old-card { }
   .old-featured { }
   ```

2. **Replace with new BEM names:**
   ```css
   .card { }
   .card--featured { }
   ```

3. **Update padding (if needed):**
   ```css
   /* Old */
   padding: 22px;

   /* New */
   padding: 20px;  /* Standard grid value */
   ```

4. **Update colors:**
   ```css
   /* Old */
   color: #d4a574;

   /* New */
   color: var(--color-tan);  /* Use CSS variables */
   ```

5. **Test responsive behavior:**
   - Test at 375px (mobile)
   - Test at 768px (tablet)
   - Test at 1100px (desktop)

---

## USEFUL RESOURCES

**In this project:**
- Full documentation: `/docs/DESIGN_SYSTEM_BENTO_GRID.md`
- Visual reference: `/docs/DESIGN_SYSTEM_VISUAL_GUIDE.html`
- Brand guidelines: `/docs/brand-kit.md`
- Style reference: `/docs/style-guide.md`

**External:**
- [Google Fonts - Playfair Display](https://fonts.google.com/specimen/Playfair+Display)
- [Google Fonts - Merriweather](https://fonts.google.com/specimen/Merriweather)
- [WCAG Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [MDN Web Docs - CSS Grid](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Grid_Layout)

---

## WHEN TO ASK FOR HELP

- **Colors don't match?** Ask CEO - brand identity critical
- **Typography feels wrong?** Ask CEO - affects brand perception
- **Layout broken at a breakpoint?** Check `/docs/DESIGN_SYSTEM_BENTO_GRID.md` section 5
- **Contrast fails validation?** Check `/docs/DESIGN_SYSTEM_BENTO_GRID.md` section 7
- **Component not in this guide?** Add it and update this file
- **Want to add new pattern?** Follow "Process for Adding New Components" in main design system doc

---

**Last Updated:** December 31, 2025
**Questions?** Refer to full Design System documentation or ask the team.
