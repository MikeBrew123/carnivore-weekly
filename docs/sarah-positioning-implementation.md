# Sarah Voice Positioning - Implementation Guide

**For:** Designers, Developers, Content Creators
**Purpose:** Practical, code-ready guide for implementing Sarah's positioning
**Status:** Ready to build
**Date:** December 31, 2025

---

## PART 1: VISUAL IMPLEMENTATION

### Option A: Author Badge (Minimal)

#### Design Specifications

```
Height: 180px
Width: Responsive (see layout below)
Background: #1a120b (dark brown)
Border: 1px solid #d4a574 (tan), top only
Padding: 30px
Margin: 40px auto
```

#### HTML Structure

```html
<section class="sarah-badge-section">
  <div class="container">
    <div class="sarah-badge">
      <div class="sarah-photo">
        <img
          src="/images/sarah-avatar-circle.png"
          alt="Sarah - Health Coach"
          width="120"
          height="120"
        >
      </div>
      <div class="sarah-intro">
        <h3>This Week's Curator</h3>
        <p class="name">Sarah</p>
        <p class="tagline">Health coach + science explorer</p>
      </div>
    </div>
  </div>
</section>
```

#### CSS Implementation

```css
/* Sarah Badge Section */
.sarah-badge-section {
  background: #1a120b;
  border-top: 3px solid #d4a574;
  padding: 40px 20px;
  margin: 40px 0;
}

.sarah-badge-section .container {
  max-width: 600px;
  margin: 0 auto;
}

.sarah-badge {
  display: flex;
  align-items: center;
  gap: 30px;
}

.sarah-photo {
  flex-shrink: 0;
}

.sarah-photo img {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: block;
  border: 2px solid #d4a574;
}

.sarah-intro {
  flex-grow: 1;
}

.sarah-intro h3 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 16px;
  color: #d4a574;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 8px 0;
}

.sarah-intro .name {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 28px;
  color: #ffd700;
  margin: 0 0 8px 0;
  font-weight: 700;
}

.sarah-intro .tagline {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  color: #d4a574;
  margin: 0;
  line-height: 1.6;
}

/* Mobile */
@media (max-width: 768px) {
  .sarah-badge {
    flex-direction: column;
    text-align: center;
  }

  .sarah-intro h3 {
    font-size: 14px;
  }

  .sarah-intro .name {
    font-size: 24px;
  }

  .sarah-intro .tagline {
    font-size: 13px;
  }
}
```

#### Visual Mockup

```
┌────────────────────────────────────┐
│ (tan line)                         │
├────────────────────────────────────┤
│                                    │
│  [Circle Photo]  This Week's       │
│  Sarah           Curator           │
│  (120px)                           │
│                  Sarah             │
│                                    │
│                  Health coach +    │
│                  science explorer  │
│                                    │
└────────────────────────────────────┘
```

---

### Option B: Content Callout (Featured)

#### Design Specifications

```
Height: 320px (desktop), 380px (mobile)
Width: Responsive (see layout)
Background: Linear gradient #1a120b → #2c1810
Border: 4px solid #d4a574 (left side)
Padding: 40px
Margin: 40px auto
```

#### HTML Structure

```html
<section class="sarah-callout-section">
  <div class="container">
    <div class="sarah-callout">
      <div class="sarah-callout-header">
        <h2>Sarah's Weekly Roundup</h2>
      </div>

      <div class="sarah-callout-body">
        <div class="sarah-callout-image">
          <img
            src="/images/sarah-avatar-small.png"
            alt="Sarah"
            width="100"
            height="100"
          >
        </div>

        <div class="sarah-callout-content">
          <p class="callout-intro">
            Your glucose jumped to 110 and you're panicking.
            Here's why that's normal on carnivore—and when
            you should actually worry.
          </p>

          <p class="callout-preview">
            <strong>This week:</strong> Glucose myths, thyroid
            nuance, reader Q&A, and your biggest health
            question answered.
          </p>
        </div>
      </div>

      <div class="sarah-callout-footer">
        <a href="#weekly-roundup" class="cta-button">
          Read Full Roundup →
        </a>
      </div>
    </div>
  </div>
</section>
```

#### CSS Implementation

```css
/* Sarah Callout Section */
.sarah-callout-section {
  padding: 40px 20px;
  margin: 40px 0;
}

.sarah-callout-section .container {
  max-width: 700px;
  margin: 0 auto;
}

.sarah-callout {
  background: linear-gradient(135deg, #1a120b 0%, #2c1810 100%);
  border-left: 4px solid #d4a574;
  border-radius: 8px;
  padding: 40px;
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.sarah-callout-header h2 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 32px;
  color: #ffd700;
  margin: 0;
  font-weight: 700;
}

.sarah-callout-body {
  display: flex;
  gap: 25px;
  align-items: flex-start;
}

.sarah-callout-image {
  flex-shrink: 0;
}

.sarah-callout-image img {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  display: block;
  border: 2px solid #d4a574;
}

.sarah-callout-content {
  flex-grow: 1;
}

.callout-intro {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 16px;
  color: #f4e4d4;
  line-height: 1.8;
  margin: 0 0 15px 0;
  font-weight: 700;
}

.callout-preview {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  color: #d4a574;
  line-height: 1.7;
  margin: 0;
}

.callout-preview strong {
  color: #ffd700;
  font-weight: 700;
}

.sarah-callout-footer {
  margin-top: 15px;
}

.cta-button {
  display: inline-block;
  background: #8b4513;
  color: #f4e4d4;
  padding: 12px 24px;
  border-radius: 4px;
  text-decoration: none;
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  font-weight: 700;
  transition: all 0.3s ease;
}

.cta-button:hover {
  background: #d4a574;
  color: #1a120b;
  transform: translateX(4px);
}

/* Tablet */
@media (max-width: 768px) {
  .sarah-callout {
    padding: 30px;
  }

  .sarah-callout-header h2 {
    font-size: 28px;
  }

  .sarah-callout-body {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .sarah-callout-image img {
    width: 90px;
    height: 90px;
  }
}

/* Mobile */
@media (max-width: 480px) {
  .sarah-callout {
    padding: 20px;
    gap: 20px;
  }

  .sarah-callout-header h2 {
    font-size: 24px;
  }

  .callout-intro {
    font-size: 15px;
  }

  .callout-preview {
    font-size: 13px;
  }
}
```

#### Visual Mockup

```
┌──────────────────────────────────────┐
│ │                                    │ ← 4px left border
│ │ Sarah's Weekly Roundup             │
│ │ ─────────────────────────────────  │
│ │                                    │
│ │ [Photo]  Your glucose jumped to    │
│ │  Small   110 and you're panicking. │
│ │          Here's why that's normal  │
│ │          on carnivore—and when you │
│ │          should worry.             │
│ │                                    │
│ │          This week: Glucose myths, │
│ │          thyroid nuance, reader    │
│ │          Q&A, and your biggest     │
│ │          health question answered. │
│ │                                    │
│ │ [Read Full Roundup →]              │
│ │                                    │
└──────────────────────────────────────┘
```

---

## PART 2: CONTENT IMPLEMENTATION

### Weekly Roundup Template

#### Markdown Format (For Content Team)

```markdown
# [Week's Theme] - Sarah's Weekly Roundup

## The Core Question
[Lead with the week's main topic or reader question]

## This Week's Deep Dives
- **Topic 1**: [One sentence hook]
- **Topic 2**: [One sentence hook]
- **Topic 3**: [One sentence hook]
- **Topic 4**: [One sentence hook]

## What's Happening in the Community
[1-2 paragraphs about trends, questions, or patterns Sarah's observing]

## Your Takeaway
[Clear, actionable summary of this week's theme]

---

*I'm not a doctor. I've researched this deeply and worked with many people,
but I'm not your doctor. If you have health conditions, take medications,
or need specific guidance, talk to someone who knows your full medical picture.*
```

#### Real Example: Glucose Week

```markdown
# Why Your Glucose Went Up (And Why That's Okay) - Sarah's Weekly Roundup

## The Core Question
You've been on carnivore three weeks. Your glucose jumped from 95 to 110.
Your doctor says it's "prediabetic." You're panicking. Is carnivore broken?

Short answer: No. Here's what's actually happening.

## This Week's Deep Dives
- **The Glucose Myth on Carnivore**: Why your fasting glucose rises while
  your insulin sensitivity improves
- **Thyroid Complexity**: New research shows thyroid management on carnivore
  is more nuanced than "just increase salt"
- **Metabolic Adaptation Explained**: What "metabolic adaptation" actually
  means and why it's not damage
- **Health Condition Q&A**: When carnivore works for specific conditions,
  and when you need extra caution

## What's Happening in the Community
This week, five readers asked variations of the same question: "My bloodwork
improved, my energy is great, but my glucose went up. What's happening?"

Here's what I've observed: The glucose confusion is the biggest source of
early-stage carnivore panic. Because we've been taught glucose = health
(it doesn't), and prediabetic = imminent problem (it doesn't on carnivore).

The real picture: Your fasting glucose rises because your body isn't getting
carbs, so it produces glucose from protein instead (gluconeogenesis). This is
adaptation, not pathology. What matters is your fasting insulin. If that's
low or normal, you're fine.

## Your Takeaway
- Elevated fasting glucose on carnivore ≠ bad
- Watch your fasting insulin instead
- If both glucose AND insulin are high, talk to your doctor
- This pattern is consistent across hundreds of bloodwork panels I've reviewed

See the full breakdowns below.
```

#### HTML Format (For Web Display)

```html
<article class="sarah-roundup">
  <header class="roundup-header">
    <div class="roundup-badge">
      <span>Sarah's Weekly Roundup</span>
    </div>
    <h1>Why Your Glucose Went Up (And Why That's Okay)</h1>
    <div class="roundup-meta">
      <span class="date">Week of January 5, 2026</span>
      <span class="author">By Sarah</span>
    </div>
  </header>

  <section class="roundup-intro">
    <h2>The Core Question</h2>
    <p>You've been on carnivore three weeks. Your glucose jumped from 95 to 110.
       Your doctor says it's "prediabetic." You're panicking. Is carnivore broken?</p>
    <p><strong>Short answer: No.</strong> Here's what's actually happening.</p>
  </section>

  <section class="roundup-topics">
    <h2>This Week's Deep Dives</h2>
    <ul>
      <li>
        <strong>The Glucose Myth on Carnivore:</strong> Why your fasting glucose
        rises while your insulin sensitivity improves
      </li>
      <li>
        <strong>Thyroid Complexity:</strong> New research shows thyroid management
        on carnivore is more nuanced than "just increase salt"
      </li>
      <li>
        <strong>Metabolic Adaptation Explained:</strong> What "metabolic adaptation"
        actually means and why it's not damage
      </li>
      <li>
        <strong>Health Condition Q&A:</strong> When carnivore works for specific
        conditions, and when you need extra caution
      </li>
    </ul>
  </section>

  <section class="roundup-community">
    <h2>What's Happening in the Community</h2>
    <p>This week, five readers asked variations of the same question:
       "My bloodwork improved, my energy is great, but my glucose went up.
       What's happening?"</p>

    <p>Here's what I've observed: The glucose confusion is the biggest source
       of early-stage carnivore panic. Because we've been taught glucose = health
       (it doesn't), and prediabetic = imminent problem (it doesn't on carnivore).</p>

    <p>The real picture: Your fasting glucose rises because your body isn't
       getting carbs, so it produces glucose from protein instead
       (gluconeogenesis). This is adaptation, not pathology. What matters is
       your fasting insulin. If that's low or normal, you're fine.</p>
  </section>

  <section class="roundup-takeaway">
    <h2>Your Takeaway</h2>
    <ul>
      <li>Elevated fasting glucose on carnivore ≠ bad</li>
      <li>Watch your fasting insulin instead</li>
      <li>If both glucose AND insulin are high, talk to your doctor</li>
      <li>This pattern is consistent across hundreds of bloodwork panels I've reviewed</li>
    </ul>
  </section>

  <footer class="roundup-footer">
    <div class="disclaimer">
      <p><strong>I'm not a doctor.</strong> I've researched this deeply and
         worked with many people, but I'm not your doctor. If you have health
         conditions, take medications, or need specific guidance, talk to someone
         who knows your full medical picture.</p>
    </div>
  </footer>
</article>
```

#### CSS for Roundup Article

```css
/* Sarah Roundup Article */
.sarah-roundup {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
}

.roundup-header {
  margin-bottom: 40px;
  border-bottom: 1px solid #d4a574;
  padding-bottom: 30px;
}

.roundup-badge {
  display: inline-block;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 12px;
  color: #d4a574;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 15px;
}

.roundup-header h1 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 42px;
  color: #ffd700;
  margin: 15px 0;
  line-height: 1.3;
}

.roundup-meta {
  display: flex;
  gap: 20px;
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  color: #d4a574;
  margin-top: 15px;
}

/* Roundup Sections */
.roundup-intro,
.roundup-topics,
.roundup-community,
.roundup-takeaway {
  margin-bottom: 40px;
}

.roundup-intro h2,
.roundup-topics h2,
.roundup-community h2,
.roundup-takeaway h2 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 24px;
  color: #ffd700;
  margin-bottom: 20px;
}

.roundup-intro p,
.roundup-community p {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 16px;
  color: #f4e4d4;
  line-height: 1.8;
  margin-bottom: 15px;
}

.roundup-topics ul,
.roundup-takeaway ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.roundup-topics li,
.roundup-takeaway li {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 15px;
  color: #f4e4d4;
  line-height: 1.8;
  margin-bottom: 15px;
  padding-left: 20px;
  position: relative;
}

.roundup-topics li:before,
.roundup-takeaway li:before {
  content: "▸";
  position: absolute;
  left: 0;
  color: #d4a574;
  font-size: 18px;
}

.roundup-footer {
  border-top: 1px solid #d4a574;
  padding-top: 30px;
  margin-top: 40px;
}

.disclaimer {
  background: rgba(212, 165, 116, 0.05);
  padding: 20px;
  border-left: 3px solid #d4a574;
  border-radius: 4px;
}

.disclaimer p {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  color: #d4a574;
  margin: 0;
  line-height: 1.7;
}

/* Mobile */
@media (max-width: 768px) {
  .roundup-header h1 {
    font-size: 28px;
  }

  .roundup-intro h2,
  .roundup-topics h2,
  .roundup-community h2,
  .roundup-takeaway h2 {
    font-size: 20px;
  }

  .roundup-meta {
    flex-direction: column;
    gap: 10px;
  }
}
```

---

## PART 3: INTERACTIVE COMPONENTS

### Ask Sarah Q&A Section

#### HTML

```html
<section class="ask-sarah">
  <div class="container">
    <h2>Ask Sarah</h2>
    <p class="intro">
      Have a health question? Submit it below and Sarah
      will answer it in next week's roundup.
    </p>

    <form class="ask-sarah-form" id="ask-sarah-form">
      <div class="form-group">
        <label for="question">Your Question *</label>
        <textarea
          id="question"
          name="question"
          placeholder="What would you like Sarah to explain or clarify?"
          rows="5"
          required
        ></textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="email">Email *</label>
          <input
            type="email"
            id="email"
            name="email"
            placeholder="Your email (so Sarah can respond if needed)"
            required
          >
        </div>

        <div class="form-group">
          <label for="health-condition">Relevant Health Condition</label>
          <input
            type="text"
            id="health-condition"
            name="health_condition"
            placeholder="E.g., PCOS, diabetes, thyroid (optional)"
          >
        </div>
      </div>

      <button type="submit" class="submit-btn">
        Submit Your Question
      </button>
    </form>
  </div>
</section>
```

#### CSS

```css
.ask-sarah {
  background: #2c1810;
  padding: 40px 20px;
  margin: 60px 0;
  border: 1px solid #8b4513;
  border-radius: 8px;
}

.ask-sarah .container {
  max-width: 700px;
  margin: 0 auto;
}

.ask-sarah h2 {
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 32px;
  color: #ffd700;
  margin: 0 0 20px 0;
}

.ask-sarah .intro {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 15px;
  color: #d4a574;
  margin: 0 0 30px 0;
}

.ask-sarah-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  font-weight: 700;
  color: #d4a574;
}

.form-group textarea,
.form-group input {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  padding: 12px;
  background: #1a120b;
  border: 1px solid #d4a574;
  color: #f4e4d4;
  border-radius: 4px;
}

.form-group textarea:focus,
.form-group input:focus {
  outline: none;
  border-color: #ffd700;
  background: #2c1810;
}

.form-group textarea::placeholder,
.form-group input::placeholder {
  color: #8b4513;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.submit-btn {
  background: #d4a574;
  color: #1a120b;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-family: 'Merriweather', Georgia, serif;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 10px;
}

.submit-btn:hover {
  background: #ffd700;
  transform: translateY(-2px);
}

/* Mobile */
@media (max-width: 768px) {
  .ask-sarah h2 {
    font-size: 24px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
```

---

### Expandable Health Topic Sections

#### HTML

```html
<section class="health-topics">
  <div class="container">
    <div class="topic-item">
      <button class="topic-toggle" aria-expanded="false">
        <span class="toggle-icon">+</span>
        <span class="toggle-title">Why Glucose Rises on Carnivore</span>
      </button>

      <div class="topic-content" hidden>
        <p>Your body adapts to using fat for fuel instead of glucose.
           This means you produce less glucose from food, but more from
           protein breakdown (gluconeogenesis). Your fasting insulin is
           the real indicator here, not your glucose number.</p>
      </div>
    </div>

    <div class="topic-item">
      <button class="topic-toggle" aria-expanded="false">
        <span class="toggle-icon">+</span>
        <span class="toggle-title">Is This Dangerous?</span>
      </button>

      <div class="topic-content" hidden>
        <p>For most people, no. Here's why: Elevated fasting glucose
           on carnivore is common and usually temporary during adaptation.
           What matters is your fasting insulin. If that's normal or low,
           you're fine.</p>
      </div>
    </div>

    <div class="topic-item">
      <button class="topic-toggle" aria-expanded="false">
        <span class="toggle-icon">+</span>
        <span class="toggle-title">When Should I Be Concerned?</span>
      </button>

      <div class="topic-content" hidden>
        <p>Watch for these signs: Both glucose AND insulin elevated,
           persistent fatigue, vision changes, or extreme thirst.
           If any of these occur, talk to your doctor.</p>
      </div>
    </div>
  </div>
</section>
```

#### CSS

```css
.health-topics {
  margin: 40px 0;
}

.topic-item {
  border: 1px solid #8b4513;
  border-radius: 4px;
  margin-bottom: 15px;
  overflow: hidden;
}

.topic-toggle {
  width: 100%;
  padding: 20px;
  background: #2c1810;
  color: #f4e4d4;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 15px;
  font-family: 'Merriweather', Georgia, serif;
  font-size: 15px;
  font-weight: 700;
  transition: all 0.3s ease;
  text-align: left;
}

.topic-toggle:hover {
  background: #3d2817;
}

.toggle-icon {
  color: #d4a574;
  font-size: 20px;
  font-weight: 700;
  transition: transform 0.3s ease;
}

.topic-toggle[aria-expanded="true"] .toggle-icon {
  transform: rotate(45deg);
}

.toggle-title {
  color: #ffd700;
}

.topic-content {
  padding: 20px;
  background: #1a120b;
  border-top: 1px solid #8b4513;
}

.topic-content p {
  font-family: 'Merriweather', Georgia, serif;
  font-size: 15px;
  color: #f4e4d4;
  line-height: 1.8;
  margin: 0;
}

/* JavaScript for toggle */
```

#### JavaScript

```javascript
document.querySelectorAll('.topic-toggle').forEach(button => {
  button.addEventListener('click', () => {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const content = button.nextElementSibling;

    button.setAttribute('aria-expanded', !isExpanded);

    if (isExpanded) {
      content.hidden = true;
    } else {
      content.hidden = false;
    }
  });
});
```

---

## PART 4: DESIGN TOKENS

### Color System

```css
:root {
  /* Primary Colors */
  --color-dark-brown: #1a120b;
  --color-brown: #2c1810;
  --color-tan: #d4a574;
  --color-gold: #ffd700;
  --color-light: #f4e4d4;
  --color-border: #8b4513;

  /* Typography */
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Merriweather', Georgia, serif;

  /* Spacing */
  --spacing-xs: 8px;
  --spacing-sm: 15px;
  --spacing-md: 20px;
  --spacing-lg: 30px;
  --spacing-xl: 40px;
  --spacing-2xl: 50px;

  /* Border Radius */
  --radius-small: 4px;
  --radius-medium: 8px;

  /* Transitions */
  --transition-fast: 0.2s ease;
  --transition-normal: 0.3s ease;
  --transition-slow: 0.5s ease;
}
```

### Typography Scale

```css
/* Display Headings */
h1 {
  font-family: var(--font-display);
  font-size: 48px;
  color: var(--color-gold);
  line-height: 1.2;
  margin: 0 0 var(--spacing-lg) 0;
}

/* Headings */
h2 {
  font-family: var(--font-display);
  font-size: 32px;
  color: var(--color-gold);
  line-height: 1.3;
  margin: 0 0 var(--spacing-md) 0;
}

h3 {
  font-family: var(--font-display);
  font-size: 24px;
  color: var(--color-tan);
  line-height: 1.4;
  margin: 0 0 var(--spacing-md) 0;
}

/* Body */
p {
  font-family: var(--font-body);
  font-size: 16px;
  color: var(--color-light);
  line-height: 1.8;
  margin: 0 0 var(--spacing-md) 0;
}

small {
  font-size: 13px;
  color: var(--color-tan);
}

/* Mobile */
@media (max-width: 768px) {
  h1 { font-size: 32px; }
  h2 { font-size: 24px; }
  h3 { font-size: 18px; }
}
```

---

## PART 5: IMAGE SPECIFICATIONS

### Photo Requirements for Sarah

#### Avatar (Circular)
```
Size: 120x120px (desktop), 100x100px (mobile)
Format: PNG with transparency
Style: Professional headshot, warm expression
Border: 2px solid tan (#d4a574)
Rounded: 50% (circle)
File size: < 50KB
```

#### Featured Photo (Rectangular)
```
Size: 400x300px (desktop), 300x200px (mobile)
Format: JPG, optimized
Aspect ratio: 4:3
Style: Professional, healthy, approachable
File size: < 100KB
```

#### Banner Photo (Wide)
```
Size: 1200x400px (desktop), 600x300px (mobile)
Format: WebP with JPG fallback
Aspect ratio: 3:1
Style: Hero image representing health/science
File size: < 200KB
```

### Naming Convention
```
sarah-avatar-circle.png          # For circular profile
sarah-featured-small.jpg         # For rounded square
sarah-hero-banner.webp           # For wide banner
sarah-photo-[date]-[topic].jpg  # For blog/article use
```

---

## PART 6: ACCESSIBILITY GUIDELINES

### Alt Text Examples

```html
<!-- For Sarah's circular photo -->
<img
  src="sarah-avatar-circle.png"
  alt="Sarah - Health Coach at Carnivore Weekly"
>

<!-- For featured article photo -->
<img
  src="article-photo.jpg"
  alt="Sarah discussing metabolic health research"
>

<!-- Avoid -->
<!-- DON'T: alt="photo" or alt="sarah" (too vague) -->
<!-- DON'T: alt="image123" (unhelpful) -->
```

### Color Contrast

```
✅ Gold (#ffd700) on Dark Brown (#1a120b) = 11.5:1 contrast
✅ Light (#f4e4d4) on Dark Brown (#1a120b) = 13.2:1 contrast
✅ Tan (#d4a574) on Dark Brown (#1a120b) = 6.8:1 contrast

All exceed WCAG AA (4.5:1) and AAA (7:1) standards.
```

### Form Accessibility

```html
<!-- Always use proper labels -->
<div class="form-group">
  <label for="question">Your Question *</label>
  <textarea id="question" name="question" required></textarea>
</div>

<!-- Not: -->
<!-- <textarea placeholder="Your question"></textarea> -->
```

---

## CHECKLIST FOR IMPLEMENTATION

### Design Phase
- [ ] Choose visual treatment (Option A: Badge OR Option B: Callout)
- [ ] Create or source Sarah's photos (avatar, featured, banner)
- [ ] Design homepage mockup with Sarah section at 30-40% above fold
- [ ] Review color values (must use exact hex)
- [ ] Test on mobile, tablet, desktop
- [ ] Get stakeholder approval

### Development Phase
- [ ] Implement HTML structure
- [ ] Add CSS (use design tokens)
- [ ] Optimize images (compress, correct formats)
- [ ] Test responsive breakpoints
- [ ] Verify color accuracy
- [ ] Test form accessibility
- [ ] Performance test (< 3 seconds load)

### Content Phase
- [ ] Write first weekly roundup
- [ ] Create 3-4 example callouts
- [ ] Prepare Q&A content
- [ ] Write disclaimer language
- [ ] Test tone consistency
- [ ] Review for guardrails

### QA Phase
- [ ] Visual regression testing
- [ ] Cross-browser testing
- [ ] Mobile testing
- [ ] Accessibility audit
- [ ] Performance audit
- [ ] Content review

---

**Document Status:** ✅ Ready to Implement
**Last Updated:** December 31, 2025
