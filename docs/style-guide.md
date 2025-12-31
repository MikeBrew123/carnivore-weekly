# Carnivore Weekly Style Guide
**Last Updated:** December 31, 2025
**Audience:** All agents (writers, developers, designers, validators)
**Purpose:** Technical and visual consistency standards

---

## **DESIGN SYSTEM**

### **Color Palette (Brand Colors - DO NOT CHANGE)**

| Color | Hex | RGB | Usage | Example |
|-------|-----|-----|-------|---------|
| **Dark Brown** (Background) | `#1a120b` | 26, 18, 11 | Page background, base color | Body background |
| **Text Brown** | `#2c1810` | 44, 24, 16 | Body text (on light backgrounds) | Archive titles |
| **Tan Accent** (Primary) | `#d4a574` | 212, 165, 116 | Links, secondary headings, accents | Nav links, meta text |
| **Gold Accent** (Secondary) | `#ffd700` | 255, 215, 0 | Primary headings, highlights | H1, H2 titles |
| **Light Text** | `#f4e4d4` | 244, 228, 212 | Body text on dark backgrounds | Blog post paragraphs |

**Color Usage Rules:**
- ✅ H1 headings: **Gold (#ffd700)** - always
- ✅ H2 headings: **Gold (#ffd700)** - always
- ✅ H3 headings: **Tan (#d4a574)** - always
- ✅ Links: **Tan (#d4a574)** - always
- ✅ Body text on dark: **Light (#f4e4d4)** - always
- ✅ Body text on light: **Dark Brown (#2c1810)** - always
- ✅ Accents/borders: **Dark Brown (#8b4513)** - for visual separation
- ❌ Never substitute colors (no "close enough" grays or golds)
- ❌ Never use system colors without approval

**Validation:**
Developers/Designers: Compare hex values exactly. Use browser inspector to verify RGB values match.

---

### **Typography**

#### Required Fonts (Google Fonts Import)
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Merriweather:wght@400;700&display=swap');
```

| Font | Weight | Usage | Fallback |
|------|--------|-------|----------|
| **Playfair Display** | 700 (bold) | H1, H2, H3, important titles | Georgia, serif |
| **Merriweather** | 400, 700 | Body text, paragraphs | Georgia, serif |

#### Font Rules
- ✅ All H1: **Playfair Display, 48px, #ffd700, bold**
- ✅ All H2: **Playfair Display, 24px, #ffd700, bold**
- ✅ All H3: **Playfair Display, 18px, #d4a574, bold**
- ✅ Body paragraphs: **Merriweather, 16px, line-height 1.8**
- ❌ NO sans-serif fonts (no Arial, Helvetica, system fonts)
- ❌ NO font substitutions without approval
- ❌ NO custom fonts (stick to Google Fonts)

**Important:** If fonts fail to load, fallbacks are Georgia + serif. Not perfect, but acceptable while fonts load.

---

### **Spacing & Layout**

#### Container & Margins
- **Page container max-width**: `1400px`
- **Blog post container max-width**: `800px`
- **Navigation spacing**: `50px` (consistent across all pages)
- **Section gaps**: `25-40px` (generous white space)
- **Paragraph margin**: `15px` bottom
- **Line height**: `1.8` (for readability)

#### Padding Rules
- **Page padding**: `20px` on mobile, `40px` on desktop
- **Card padding**: `20px` (blog cards, author bio, related posts)
- **Border spacing**: `20px` (space between border and content)

#### Mobile Breakpoints
- **Mobile-first approach**: Design for mobile, enhance for desktop
- **Tablet**: `768px` and up
- **Desktop**: `1024px` and up
- **Large desktop**: `1400px` and up

**Spacing Validation:**
Casey (Visual QA): Check every page for:
- Generous white space (not cramped)
- Consistent gutters
- Aligned elements (no random 15px vs 20px)
- Mobile doesn't have horizontal scroll

---

### **Visual Elements**

#### Borders
- **Color**: Dark Brown (`#8b4513`) for dividers
- **Width**: `2px` for major dividers, `1px` for subtle
- **Radius**: `4px` (slight rounding on cards/boxes), `8px` (more prominent)

#### Buttons & Links
- **Link hover**: Change to gold (`#ffd700`)
- **Link underline**: Subtle tan underline when possible
- **Button style**: Brown background (`#8b4513`), light text, 5px radius
- **Button hover**: Gold text (`#ffd700`)

#### Cards (Blog posts, related posts)
- **Background**: Dark Brown (`#2c1810`)
- **Border**: `1px solid #8b4513`
- **Padding**: `20px`
- **Radius**: `8px`
- **Hover effect**: `transform: translateY(-4px)`, shadow increase

#### Author Bio Boxes
- **Background**: Dark Brown (`#2c1810`)
- **Left border**: `4px solid #d4a574`
- **Padding**: `15px`
- **Title color**: Gold (`#ffd700`)
- **Body color**: Light tan

---

## **CODE STANDARDS**

### **HTML Standards**

**Required Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Page Title]</title>
    <meta name="description" content="[Meta description]">
    <link rel="stylesheet" href="../../style.css">
</head>
<body>
    <!-- Content -->
</body>
</html>
```

**Meta Tags (Required on all pages):**
- `<meta charset="UTF-8">`
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- `<title>` (descriptive, under 60 characters)
- `<meta name="description">` (under 160 characters)

**CSS Path Rules:**
- Blog posts at `/public/blog/`: Link is `../../style.css`
- Pages at `/public/`: Link is `../style.css`
- Always use relative paths, never absolute

**Semantic HTML:**
- ✅ Use `<h1>` for main page heading (one per page)
- ✅ Use `<h2>` for section headings
- ✅ Use `<h3>` for subsection headings
- ✅ Use `<p>` for paragraphs
- ✅ Use `<nav>` for navigation
- ✅ Use `<footer>` for footer
- ✅ Use `<article>` for blog posts
- ❌ Don't skip heading levels (h1 → h3 is wrong)
- ❌ Don't use headings for styling (use `<strong>` + CSS instead)

**Accessibility:**
- All images must have `alt` text (descriptive, not "image")
- All links must have clear text (not "click here")
- Color alone shouldn't convey information (use text + color)
- Form labels must be connected to inputs

**Validation:**
- W3C HTML5 validation passes (no errors)
- Run: `https://validator.w3.org/`

---

### **CSS Standards**

**File Location:** `/public/style.css` (global styles)

**Organization:**
```css
/* Import fonts first */
@import url('...');

/* Reset and base styles */
* { ... }
html { ... }
body { ... }

/* Layout */
.container { ... }

/* Typography */
h1 { ... }
h2 { ... }
p { ... }

/* Components */
.button { ... }
.card { ... }

/* Media queries (mobile-first) */
@media (min-width: 768px) { ... }
```

**Variable Usage (CSS Custom Properties):**
```css
:root {
    --color-dark-brown: #1a120b;
    --color-tan: #d4a574;
    --color-gold: #ffd700;
    --font-serif: 'Playfair Display', Georgia, serif;
    --spacing-base: 20px;
}
```

**Inline Styles (When Used):**
- ✅ For one-off styles (navigation, footer)
- ✅ When style is element-specific
- ❌ Don't override global styles excessively
- ❌ Don't use `!important` unless absolutely necessary

**Color in CSS:**
Always use hex codes:
```css
color: #ffd700; /* NOT rgb(255, 215, 0) */
background: #1a120b; /* NOT "dark brown" */
```

**Spacing:**
Use consistent units:
```css
margin: 40px auto;    /* Good */
padding: 20px;        /* Good */
gap: 20px;            /* Good */
```

**Browser Support:**
- Modern browsers only (Chrome, Firefox, Safari, Edge)
- No IE11 support needed
- Use CSS Grid and Flexbox freely

---

### **JavaScript Standards**

**File Location:** Inline `<script>` tags or `/scripts/` directory

**Rules:**
- ✅ ES6+ syntax allowed
- ✅ Use `const` and `let` (no `var`)
- ✅ Arrow functions are preferred
- ✅ Add comments for complex logic
- ✅ Test in browser console before deploying
- ❌ No jQuery (vanilla JS only)
- ❌ No external libraries without approval
- ❌ No console.log() in production (remove before deploy)

**Example - Comment Filter:**
```javascript
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const filter = this.dataset.filter;
        // Update active state
        document.querySelectorAll('.filter-btn')
            .forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        // Filter items
        document.querySelectorAll('[data-category]').forEach(item => {
            item.style.display =
                filter === 'all' || item.dataset.category === filter
                    ? 'block'
                    : 'none';
        });
    });
});
```

---

### **Python Standards**

**File Location:** `/scripts/` directory

**Requirements:**
- Python 3.9+
- Use type hints where possible
- Follow PEP 8 style guide
- 79 character line limit

**Tools:**
```bash
# Linting
flake8 scripts/*.py

# Formatting
black scripts/

# Type checking
mypy scripts/
```

**Template Variables:**
When rendering Jinja2 templates, use consistent naming:
```python
template.render(
    title=post.get('title'),
    author=post.get('author'),
    content=post.get('content'),
    date=post.get('date'),
    # ... more variables
)
```

**File Naming:**
- Lowercase with underscores: `generate_blog_pages.py`
- Descriptive: `validate_w3c_html.py` not `v.py`
- Verb-first if it's a script: `generate_`, `validate_`, `update_`

---

## **BLOG POST STRUCTURE**

### Raw Post Format (Before Templating)

**Location:** `/public/blog/[date]-[slug].html`

**Minimal HTML:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[Title]</title>
    <meta name="description" content="[Description]">
</head>
<body>
<h1>[Main Title]</h1>

<p>Opening paragraph...</p>

<h2>Section Heading</h2>

<p>Section content...</p>

<!-- Continue with h2, h3, p tags only -->

</body>
</html>
```

**Post Rules:**
- ✅ Use `<h1>` once (title)
- ✅ Use `<h2>` for sections
- ✅ Use `<h3>` for subsections
- ✅ Use `<p>` for paragraphs
- ✅ Use `<ul>` or `<ol>` for lists
- ✅ Use `<strong>` and `<em>` for emphasis
- ✅ Include meta description (under 160 characters)
- ❌ Don't include CSS or JavaScript in raw files
- ❌ Don't include navigation or footer (template handles it)
- ❌ Don't use inline styles (use semantic HTML only)

### Generated Post (After Templating)

Template adds:
- Navigation bar
- Post header (title, date, author, bio)
- CSS (inline + global)
- Comments section
- Footer
- Related posts

---

## **IMAGE & ASSET STANDARDS**

### Image Sizes
- **Featured images**: `1200x600px` (2:1 ratio) - for social sharing
- **Thumbnails**: `400x300px` (4:3 ratio)
- **Icons**: `32x32px` or `64x64px`
- **Favicon**: `16x16px`, `32x32px`, `180x180px` (Apple touch)

### Image Optimization
- ✅ Compress before uploading (use TinyPNG)
- ✅ Use `.webp` format where possible (with `.jpg` fallback)
- ✅ Always include descriptive `alt` text
- ✅ Filename should be descriptive: `sarah-health-coaching-2025.jpg`
- ❌ Don't use large unoptimized images (under 200KB each)
- ❌ Don't use placeholder images in production

### Favicon
- Must exist: `/public/favicon.ico`
- Also create: `/public/apple-touch-icon.png`
- Must include Carnivore Weekly logo/brand mark

---

## **SEO STANDARDS**

### Meta Information
- **Title tags**: 50-60 characters, include primary keyword
- **Meta descriptions**: 150-160 characters, persuasive call-to-action
- **H1**: One per page, includes primary keyword
- **Keywords**: Target 1-2 per page, use naturally

### URL Structure
- Lowercase, hyphens between words
- Descriptive slug: `/blog/2025-01-05-weight-loss-stalls.html`
- Date format: `YYYY-MM-DD`

### Internal Linking
- Link to related blog posts where relevant
- Link to wiki for deep-dive topics
- Anchor text should be descriptive ("The Lion Diet Challenge" not "click here")

### Structured Data
Consider adding JSON-LD for:
- BlogPosting (blog posts)
- Person (author bio)
- Organization (site info)

---

## **PERFORMANCE STANDARDS**

### Target Metrics
- **Page load time**: < 3 seconds
- **Largest Contentful Paint (LCP)**: ≤ 2.5 seconds
- **First Input Delay (FID)**: ≤ 100ms
- **Cumulative Layout Shift (CLS)**: < 0.1

### Optimization Rules
- ✅ Minify CSS/JavaScript
- ✅ Compress images
- ✅ Use CSS Grid/Flexbox (not float layouts)
- ✅ Lazy load images if possible
- ✅ Avoid render-blocking resources
- ❌ Don't load unnecessary fonts
- ❌ Don't use heavy external libraries
- ❌ Don't use auto-playing videos

### Testing
Run weekly:
```bash
# Lighthouse performance audit
npx playwright screenshot --viewport-size=1400,900 [URL]

# Visual comparison to baseline
# Use Casey's screenshots
```

---

## **VALIDATION CHECKLIST**

### Pre-Deployment Validation

**HTML Validation (Jordan's job):**
- [ ] W3C HTML5 validation passes
- [ ] No broken links
- [ ] All images have alt text
- [ ] Meta tags present and correct
- [ ] CSS path is correct

**CSS Validation (Jordan's job):**
- [ ] No color drift (exact hex values)
- [ ] All fonts loading (Playfair + Merriweather)
- [ ] Spacing is consistent (25-40px sections)
- [ ] Mobile responsive (no horizontal scroll)
- [ ] Links have hover states

**Visual Validation (Casey's job):**
- [ ] Screenshot comparison to baseline
- [ ] Favicon present and displaying
- [ ] Fonts rendering correctly
- [ ] Colors exact (use color picker)
- [ ] Spacing and alignment perfect
- [ ] No visual regressions from last week

**Performance Validation (Jordan's job):**
- [ ] Page load time < 3 seconds
- [ ] No console errors
- [ ] Images compressed (< 200KB)
- [ ] Lighthouse performance > 90

**Content Validation (Sarah/Marcus/Chloe):**
- [ ] No AI tell words
- [ ] Contractions used naturally
- [ ] Persona voice consistent
- [ ] Specific examples (not generic)
- [ ] Evidence/sources cited (if health claims)

---

## **QUICK REFERENCE**

### Colors (Copy-Paste)
```
Background: #1a120b
Text: #2c1810
Accent Tan: #d4a574
Gold: #ffd700
Light: #f4e4d4
Border: #8b4513
```

### Typography (Copy-Paste)
```css
/* Import */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Merriweather:wght@400;700&display=swap');

/* H1 */
font-family: 'Playfair Display', Georgia, serif;
font-size: 48px;
color: #ffd700;
font-weight: 700;

/* Body */
font-family: 'Merriweather', Georgia, serif;
font-size: 16px;
color: #f4e4d4;
line-height: 1.8;
```

### Spacing (Copy-Paste)
```css
/* Container */
max-width: 800px;
margin: 40px auto;
padding: 20px;

/* Text */
margin-bottom: 15px;
gap: 20px;
```

---

## **WHEN TO ESCALATE**

If you're unsure about:
- **Colors**: Ask CEO (me) - brand identity critical
- **Fonts**: Ask CEO - brand identity critical
- **Layout changes**: Ask CEO - might affect all pages
- **New components**: Ask CEO - needs design system decision
- **Performance issues**: Ask Alex (developer)
- **Visual regressions**: Ask Casey (QA)

**Golden Rule:** When in doubt, ask. Don't guess. The Library is here for reference, but exceptions need approval.

