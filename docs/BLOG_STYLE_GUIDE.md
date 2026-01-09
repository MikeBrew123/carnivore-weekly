# Blog Post Style Guide
## Carnivore Weekly - Readability & Structure Standards

### Overview
This guide shows you how to use the blog post CSS components to create well-structured, readable articles.

---

## Quick Start

### 1. Link the CSS
Add this line after `style-2026.css` in your blog post:
```html
<link rel="stylesheet" href="../css/blog-post.css">
```

### 2. Use the Components
Available readability components:

---

## Component Library

### TL;DR Box
**When to use:** At the beginning of every blog post to give readers the key takeaways upfront.

```html
<div class="tldr-box">
    <h3>TL;DR</h3>
    <ul>
        <li><strong>Key point 1</strong> with explanation</li>
        <li><strong>Key point 2</strong> with explanation</li>
        <li><strong>Key point 3</strong> with explanation</li>
    </ul>
</div>
```

**Visual:** Light cream background, gold left border, bullet list format.

---

### Pull Quote
**When to use:** To emphasize a key insight or memorable statement within the article.

```html
<blockquote class="pull-quote">
    Your memorable quote or key insight goes here.
</blockquote>
```

**Visual:** Large italic serif text, gold left border, decorative opening quote mark.

---

### Key Takeaway Box
**When to use:** At the end of a section or article to summarize the bottom line.

```html
<div class="key-takeaway">
    <h4>Bottom Line</h4>
    <p>Your summary paragraph.</p>
    <p>Additional context if needed.</p>
</div>
```

**Visual:** Dark brown background, cream text, gold left border.

---

### Callout Boxes
**When to use:** To highlight important information, warnings, or tips.

```html
<!-- Standard callout -->
<div class="callout">
    <h4>Important Note</h4>
    <p>Your important information here.</p>
</div>

<!-- Warning callout (red accent) -->
<div class="callout callout--warning">
    <h4>Watch Out</h4>
    <p>Warning message here.</p>
</div>

<!-- Success callout (green accent) -->
<div class="callout callout--success">
    <h4>Pro Tip</h4>
    <p>Helpful tip here.</p>
</div>

<!-- Info callout (blue accent) -->
<div class="callout callout--info">
    <h4>Did You Know?</h4>
    <p>Interesting fact here.</p>
</div>
```

**Visual:** Light background, colored left border based on type.

---

### Checklist
**When to use:** For action items or metrics to track.

```html
<ul class="checklist">
    <li>First item to check</li>
    <li>Second item to check</li>
    <li>Third item to check</li>
</ul>
```

**Visual:** List with green checkmarks instead of bullets.

---

### Section Divider
**When to use:** To create visual breaks between major sections.

```html
<!-- Light divider -->
<hr class="section-divider">

<!-- Heavy divider (more prominent) -->
<hr class="section-divider section-divider--heavy">
```

---

### Research Note
**When to use:** To cite studies or provide research context.

```html
<div class="research-note">
    <p><strong>Research Context:</strong> Study details and findings go here.</p>
</div>
```

**Visual:** Light background, brown left border, smaller font.

---

### Stat Highlight
**When to use:** To emphasize key numbers or percentages inline.

```html
<p>This diet improved outcomes in <span class="stat-highlight">85%</span> of participants.</p>
```

**Visual:** Gold background, dark text, inline highlight.

---

## Writing Best Practices

### 1. Structure Every Post
- **Opening paragraph:** Hook the reader
- **TL;DR box:** Key takeaways (3-5 bullets)
- **Main content:** Use H2 and H3 headings for hierarchy
- **Key takeaway box:** Summary at the end

### 2. Visual Hierarchy
- Use **H2** for major sections
- Use **H3** for subsections
- Don't skip heading levels (H2 → H4 is bad)
- Add section dividers between major topics

### 3. Readability
- Keep paragraphs to 3-4 sentences max
- Use lists instead of paragraph bullets
- Add pull quotes to break up long sections
- Use callout boxes sparingly (1-2 per post)

### 4. Lists vs Paragraphs
**Bad:**
```html
<p>- Point one</p>
<p>- Point two</p>
```

**Good:**
```html
<ul>
    <li>Point one</li>
    <li>Point two</li>
</ul>
```

---

## Example Structure

```html
<!-- Opening -->
<p>Hook paragraph that draws reader in.</p>
<p>Second paragraph expanding on the problem.</p>

<!-- TL;DR -->
<div class="tldr-box">
    <h3>TL;DR</h3>
    <ul>
        <li>Key point 1</li>
        <li>Key point 2</li>
        <li>Key point 3</li>
    </ul>
</div>

<!-- Main Content Section 1 -->
<h2>First Major Section</h2>
<p>Content paragraph.</p>

<h3>Subsection</h3>
<p>More detailed content.</p>

<blockquote class="pull-quote">
    Key insight emphasized here.
</blockquote>

<hr class="section-divider">

<!-- Main Content Section 2 -->
<h2>Second Major Section</h2>
<p>Content paragraph.</p>

<div class="callout callout--info">
    <h4>Important Note</h4>
    <p>Helpful context here.</p>
</div>

<!-- Summary -->
<h2>Bottom Line</h2>
<p>Summary paragraph.</p>

<div class="key-takeaway">
    <h4>Key Takeaway</h4>
    <p>Final summary statement.</p>
</div>
```

---

## Don'ts

❌ Don't nest components (e.g., TL;DR box inside callout box)
❌ Don't use more than 2-3 callout boxes per post
❌ Don't skip the TL;DR box
❌ Don't format lists as paragraphs with dashes
❌ Don't use pull quotes for every paragraph

---

## Component Preview
See `/blog/2025-12-30-pcos-hormones.html` for a live example using all components.
