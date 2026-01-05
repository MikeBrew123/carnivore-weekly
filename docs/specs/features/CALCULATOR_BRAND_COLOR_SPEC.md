# Calculator Brand Color & Visual Specification
## Exact Hex Codes & Usage Rules

**Authority:** Jordan (QA Validator)
**Version:** 1.0
**Date:** January 4, 2026
**Status:** FINAL - Use these exact codes, no variations

---

## COLOR PALETTE (EXACT HEX CODES)

### Primary Colors

| Name | Hex Code | RGB | Usage | Example |
|------|----------|-----|-------|---------|
| Cream Background | `#F2F0E6` | rgb(242, 240, 230) | Page background, input bg | Body background |
| Dark Brown Text | `#1a120b` | rgb(26, 18, 11) | Body text, default text | Paragraph, labels |
| Gold Accents | `#ffd700` | rgb(255, 215, 0) | H1, H2, H3 headings | Headings, focus states |
| Tan Accent | `#d4a574` | rgb(212, 165, 116) | Input borders, dividers | Form borders, hr lines |
| Mahogany | `#6A1B1B` | rgb(106, 27, 27) | Primary buttons | CTA buttons |
| Mahogany Light | `#8A2B2B` | rgb(138, 43, 43) | Button hover state | Button hover |

### Secondary/Utility Colors

| Name | Hex Code | Usage |
|------|----------|-------|
| Muted Text | `#666666` | Placeholder text, disabled text |
| Error Red | `#d32f2f` | Error states, validation errors |
| Success Green | `#2e7d32` | Success messages (if needed) |

---

## TYPOGRAPHY SPECIFICATION

### Font Families (DO NOT CHANGE)

```css
/* Must import from Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Merriweather:wght@400;500;700&display=swap');

/* Applied as: */
Headings: 'Playfair Display', serif
Body:     'Merriweather', serif
```

### Font Sizes & Weights

| Element | Font | Size | Weight | Color | Line Height |
|---------|------|------|--------|-------|-------------|
| H1 | Playfair Display | 36px | 900 | #ffd700 | 1.2 |
| H2 | Playfair Display | 28px | 700 | #ffd700 | 1.2 |
| H3 | Playfair Display | 22px | 700 | #ffd700 | 1.3 |
| H4 | Merriweather | 18px | 700 | #1a120b | 1.4 |
| Body Text | Merriweather | 18px | 400 | #1a120b | 1.6+ |
| Labels | Merriweather | 16px | 600 | #1a120b | 1.4 |
| Input | Merriweather | 16px | 400 | #1a120b | 1.4 |
| Small Text | Merriweather | 14px | 400 | #666666 | 1.4 |

---

## COMPONENT SPECIFICATIONS

### Buttons

#### Primary Button (CTA)
```css
Background Color:      #6A1B1B (Mahogany)
Text Color:            #F2F0E6 (Cream)
Border:                None
Padding:               12px 24px (min)
Border Radius:         6-8px
Font Family:           Merriweather, serif
Font Weight:           600
Font Size:             16px
Min Height:            44px (accessibility)
Min Width:             44px (accessibility)
Cursor:                pointer

On Hover:
  Background Color:    #8A2B2B (Mahogany Light)
  Text Color:          #F2F0E6 (unchanged)
  Transition:          0.3s ease

On Focus:
  Outline:             2px solid #ffd700
  Outline Offset:      2px
```

**Example Usage:**
```typescript
<button style={{
  backgroundColor: '#6A1B1B',
  color: '#F2F0E6',
  padding: '12px 24px',
  border: 'none',
  borderRadius: '8px',
  fontFamily: 'Merriweather, serif',
  fontWeight: '600',
  fontSize: '16px',
  minHeight: '44px',
  cursor: 'pointer',
}} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#8A2B2B'}
   onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6A1B1B'}>
  Click Me
</button>
```

#### Secondary Button
```css
Background Color:      Transparent
Text Color:            #6A1B1B
Border:                2px solid #6A1B1B
Border Radius:         6-8px
Padding:               10px 22px (min, account for border)
Font:                  Merriweather, 600, 16px
Min Height:            44px
Min Width:             44px

On Hover:
  Background Color:    rgba(106, 27, 27, 0.1)
  Text Color:          #6A1B1B (unchanged)
  Border Color:        #6A1B1B (unchanged)
```

#### Text Button (Link Style)
```css
Background Color:      Transparent
Text Color:            #d4a574 (Tan)
Border:                None
Padding:               0 (no padding needed)
Font:                  Merriweather, 400-600, 16px
Text Decoration:       None
Cursor:                pointer

On Hover:
  Text Color:          #ffd700 (Gold)
  Text Decoration:     Underline (optional)
```

---

### Form Inputs

#### Text Input, Email, Number, etc.
```css
Background Color:      #F2F0E6 (Cream)
Text Color:            #1a120b (Dark Brown)
Border:                2px solid #d4a574 (Tan)
Border Radius:         6-8px
Padding:               12px 16px
Font Family:           Merriweather, serif
Font Size:             16px (prevents zoom on iOS)
Font Weight:           400
Line Height:           1.4
Placeholder Color:     #666666 (Muted)

On Focus:
  Border Color:        #ffd700 (Gold)
  Outline:             None (use border instead)
  Background Color:    #F2F0E6 (unchanged)
  Box Shadow:          Optional: 0 0 0 3px rgba(255, 215, 0, 0.1)

On Error:
  Border Color:        #d32f2f (Red)

On Disabled:
  Background Color:    #f0ebe4
  Color:               #999999
  Cursor:              not-allowed
  Opacity:             0.6
```

**Example Usage:**
```typescript
<input type="text" style={{
  backgroundColor: '#F2F0E6',
  color: '#1a120b',
  border: '2px solid #d4a574',
  borderRadius: '8px',
  padding: '12px 16px',
  fontFamily: 'Merriweather, serif',
  fontSize: '16px',
}} onFocus={(e) => e.currentTarget.style.borderColor = '#ffd700'}
   onBlur={(e) => e.currentTarget.style.borderColor = '#d4a574'}
   placeholder="Enter value" />
```

#### Select / Dropdown
```css
Same as text input, plus:
Appearance:            None (remove default)
Cursor:                pointer
Padding Right:         40px (for dropdown arrow)

Arrow Icon Color:      #1a120b
Arrow Icon Position:   Right side, 12px from edge
```

#### Checkbox / Radio
```css
Width:                 20px
Height:                20px
Cursor:                pointer
Appearance:            None
Border:                2px solid #d4a574
Background:            #F2F0E6

When Checked:
  Background:          #6A1B1B
  Border Color:        #6A1B1B
  Check Mark Color:    #F2F0E6
```

#### Textarea
```css
Background Color:      #F2F0E6
Text Color:            #1a120b
Border:                2px solid #d4a574
Border Radius:         8px
Padding:               12px 16px
Font Family:           Merriweather, serif
Font Size:             16px
Resize:                Vertical only
Min Height:            120px

On Focus:
  Border Color:        #ffd700
  Box Shadow:          0 0 0 3px rgba(255, 215, 0, 0.1)
```

---

### Labels & Help Text

#### Input Label
```css
Font Family:           Merriweather, serif
Font Size:             16px
Font Weight:           600
Color:                 #1a120b
Margin Bottom:         8px
Line Height:           1.4
```

#### Help Text / Description
```css
Font Family:           Merriweather, serif
Font Size:             14px
Font Weight:           400
Color:                 #666666 (Muted)
Margin Top:            4px
Line Height:           1.4
```

#### Error Message
```css
Font Family:           Merriweather, serif
Font Size:             14px
Font Weight:           400
Color:                 #d32f2f (Red)
Margin Top:            4px
Icon:                  ✕ or ! (same color)
```

#### Required Indicator
```css
Color:                 #d32f2f (Red)
Font Weight:           700
Content:               " *"
```

---

### Sections & Containers

#### Form Section
```css
Background Color:      #F2F0E6 (Cream)
Border:                1px solid #d4a574 (Tan)
Border Radius:         12px
Padding:               32px (desktop), 20px (mobile)
Margin Bottom:         24px
Box Shadow:            Optional: 0 2px 8px rgba(26, 18, 11, 0.08)
```

#### Progress Indicator
```css
Active Step Color:     #6A1B1B (Mahogany)
Inactive Step Color:   #d4a574 (Tan)
Step Number Color:     #F2F0E6 (on dark) or #1a120b (on light)
Connector Line:        #d4a574 (Tan)
Text Color:            #1a120b (Dark)
```

#### Cards / Results Section
```css
Background Color:      #F2F0E6 (Cream)
Border:                2px solid #d4a574 (Tan)
Border Radius:         12px
Padding:               24px
Box Shadow:            0 4px 12px rgba(26, 18, 11, 0.1)
```

---

## SPACING SPECIFICATION

### Margins & Padding

| Size | Value | Usage |
|------|-------|-------|
| XS | 4px | Between tight elements |
| Small | 8px | Between related elements |
| Base | 12px | Standard padding in inputs |
| Medium | 16px | Standard padding in buttons |
| Large | 24px | Between sections |
| XL | 32px | Between major sections |
| 2XL | 48px | Between page sections |

### Container Widths

```css
Mobile (< 640px):     100% - 20px padding on each side
Tablet (640-1024px):  90% max-width, max 600px
Desktop (> 1024px):   800-1000px max-width, centered
Wide Desktop (>1400px): 1200px max-width, centered
```

---

## INTERACTIVE STATES

### All Interactive Elements Must Support:

#### Hover State
- Visual change (color, shadow, scale)
- Smooth transition (0.3s ease)
- Must be visible on all devices

#### Focus State (Keyboard Navigation)
- 2px outline in brand gold (#ffd700)
- 2px offset from element
- Visible on all elements
- Works without mouse

#### Active State (Pressed)
- Slight color change
- Visual feedback that button was clicked
- Clear to user action was registered

#### Disabled State
- 50% opacity or gray color
- Cursor: not-allowed
- No hover effects
- Clear to user element is disabled

---

## TESTING CHECKLIST

Use color picker tools to verify exact colors:

```
Chrome DevTools:
1. Right-click element → Inspect
2. Find "background-color" in Styles panel
3. Click color square to open picker
4. Verify hex code matches specification

For Text Colors:
1. Inspect text element
2. Look for "color" property in Styles
3. Verify hex code matches specification

For Border Colors:
1. Inspect element
2. Look for "border-color" property
3. Verify hex code matches specification
```

### Acceptance Criteria

When validated by color picker:
- ✅ Background color: #F2F0E6 (exact)
- ✅ Text color: #1a120b (exact)
- ✅ Heading color: #ffd700 (exact)
- ✅ Button color: #6A1B1B (exact)
- ✅ Button hover: #8A2B2B (exact)
- ✅ Input border: #d4a574 (exact)
- ✅ Input focus: #ffd700 (exact)
- ✅ All fonts: Playfair Display or Merriweather (exact)

**No approximations. No "close enough." Exact hex codes only.**

---

## COMMON MISTAKES TO AVOID

❌ Using #f5f5f5 instead of #F2F0E6 for background
❌ Using #333333 instead of #1a120b for text
❌ Using #gold instead of #ffd700
❌ Using #tan instead of #d4a574
❌ Using #burgundy or #maroon instead of #6A1B1B
❌ Using sans-serif fonts (Arial, Helvetica, etc.)
❌ Using system fonts instead of Google Fonts
❌ Forgetting 44px minimum touch targets
❌ Using Tailwind defaults (bg-gray-50, text-gray-900)
❌ Not testing focus states for keyboard navigation

---

## QUICK REFERENCE CSS

```css
/* Copy-paste these for quick styling */

/* Backgrounds */
.bg-brand { background-color: #F2F0E6; }
.bg-brand-dark { background-color: #1a120b; }

/* Text Colors */
.text-brand { color: #1a120b; }
.text-brand-muted { color: #666666; }
.text-brand-error { color: #d32f2f; }

/* Headings */
h1, h2, h3, h4, h5, h6 {
  font-family: 'Playfair Display', serif;
  color: #ffd700;
}

/* Body */
body {
  background-color: #F2F0E6;
  color: #1a120b;
  font-family: 'Merriweather', serif;
}

/* Primary Button */
.btn-primary {
  background-color: #6A1B1B;
  color: #F2F0E6;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-family: 'Merriweather', serif;
  font-weight: 600;
  cursor: pointer;
  min-height: 44px;
  transition: background-color 0.3s ease;
}

.btn-primary:hover {
  background-color: #8A2B2B;
}

/* Form Input */
.input {
  background-color: #F2F0E6;
  color: #1a120b;
  border: 2px solid #d4a574;
  padding: 12px 16px;
  border-radius: 8px;
  font-family: 'Merriweather', serif;
  font-size: 16px;
}

.input:focus {
  border-color: #ffd700;
  outline: none;
}
```

---

## GRADIENT RULES (If Needed)

**Gradients are NOT part of brand standard.** If gradients are ever needed:
- Only use brand colors in gradient
- Always test readability on top of gradient
- Always provide fallback solid color
- Example: `linear-gradient(135deg, #F2F0E6 0%, #d4a574 100%)`

---

## OPACITY RULES

When you need to layer colors with opacity:

```css
/* Dark brown at 20% opacity */
rgba(26, 18, 11, 0.2)

/* Gold at 10% opacity (for subtle highlights) */
rgba(255, 215, 0, 0.1)

/* Mahogany at 5% opacity (very subtle) */
rgba(106, 27, 27, 0.05)
```

**Rule:** Never go below 20% opacity for text, always ensure contrast passes WCAG AA.

---

## DARK MODE (Not Implemented, For Future Reference)

If dark mode is ever added, use:
```css
Dark Background:    #1a120b
Dark Text:          #F2F0E6
Dark Headings:      #ffd700 (unchanged)
Dark Accents:       #d4a574 (unchanged)
Dark Button Bg:     #6A1B1B (unchanged)
```

---

**Authority:** Jordan (QA Validator)
**Status:** FINAL - These exact codes are non-negotiable
**Last Updated:** January 4, 2026
**Questions:** Refer to CALCULATOR_BRAND_VALIDATION_REQUIREMENTS.md
