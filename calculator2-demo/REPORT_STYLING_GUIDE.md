# Carnivore Calculator - Report Styling Guide
## Story 3.6: Report Styling Documentation

This guide documents the CSS styling applied to the carnivore calculator report display, ensuring strict brand compliance and print-friendly output.

---

## Brand Colors (Strict Compliance)

All colors are locked to the following specifications. No deviations permitted.

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Background | Cloud Dancer (Cream) | `#F2F0E6` | Page & container backgrounds |
| Headings | Gold | `#ffd700` | H1, H2, H3 text |
| Body Text | Dark Brown | `#1a120b` | Paragraphs, lists, tables |
| Section Dividers | Tan | `#d4a574` | Borders, rules, table headers |
| Code Background | Dark | `#0f0f0f` | Code block backgrounds |
| Code Text | Light Gray | `#f5f5f5` | Code block text |

---

## Typography Requirements

### Font Selection (Google Fonts)

**All fonts are imported via:**
```
https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;500;700&display=swap
```

| Font | Family | Usage | Weights |
|------|--------|-------|---------|
| **Playfair Display** | Serif | H1, H2, H3 headings | 700, 900 |
| **Merriweather** | Serif | Body text, lists, captions | 400, 500, 700 |
| Monospace | Monaco/Courier New | Code blocks | Regular |

### Minimum Font Sizes

Optimized for 30-60 age demographic (readability priority).

| Element | Desktop | Tablet | Mobile | Print |
|---------|---------|--------|--------|-------|
| **H2** (28px) | 28px | 24px | 22px | 20pt |
| **H3** (22px) | 22px | 20px | 18px | 16pt |
| **Body** (18px) | 18px | 16px | 16px | 12pt |
| **Lists** (18px) | 18px | 16px | 16px | 12pt |
| **Tables** (16px) | 16px | 15px | 14px | 11pt |
| **Code** (14px) | 14px | 14px | 13px | 10pt |

### Line Height

- **Body text**: 1.8 (long-form content readability)
- **Lists**: 1.8 (spacing for scanability)
- **Code**: 1.5 (compact display)
- **Headings**: 1.2-1.3 (tight for visual impact)
- **Print**: 1.5 (ink efficiency)

---

## Report Sections Styling

### H2 Headers (Main Section Headers)

```css
font-family: 'Playfair Display', serif;
font-size: 28px;
color: #ffd700;
margin: 50px 0 40px 0;
border-bottom: 3px solid #d4a574;
padding-bottom: 15px;
page-break-after: avoid;
```

**Details:**
- Bottom margin: 40px (before first paragraph)
- Gold color (#ffd700) for visual prominence
- Tan border (#d4a574) for section separation
- Page-break safety in print

### H3 Subsection Headers

```css
font-family: 'Playfair Display', serif;
font-size: 22px;
color: #ffd700;
margin: 30px 0 20px 0;
page-break-after: avoid;
```

**Details:**
- Slightly smaller than H2 for hierarchy
- Same gold color for brand consistency
- Prevents orphaning on page breaks

### H4 Sub-subsection Headers

```css
font-family: 'Merriweather', serif;
font-size: 18px;
color: #1a120b;
margin: 20px 0 15px 0;
font-weight: 700;
```

**Details:**
- Returns to dark brown for tonal variation
- Serif font maintains brand consistency

### Paragraph Text

```css
font-family: 'Merriweather', serif;
font-size: 18px;
line-height: 1.8;
margin: 0 0 1.2em 0;
color: #1a120b;
orphans: 2;
widows: 2;
```

**Details:**
- 18px minimum ensures readability for target demographic
- 1.8 line height for comfortable reading
- Orphans/widows prevent lone lines on page breaks
- Max width: 600px (optional, improves readability)

### Lists (Unordered & Ordered)

```css
font-family: 'Merriweather', serif;
font-size: 18px;
line-height: 1.8;
margin: 1.5em 0;
padding-left: 2em;
```

**Details:**
- 18px font for consistency with body text
- 1.8 line height matches paragraph spacing
- 2em left padding for visual hierarchy
- Margin spacing prevents cramping with surrounding elements

### Tables

```css
width: 100%;
border-collapse: collapse;
margin: 1.5em 0;
font-size: 16px;
background-color: #fafafa;
border: 1px solid #d4a574;
page-break-inside: avoid;
```

**Details:**
- Light background (#fafafa) for readability
- Tan borders (#d4a574) for brand consistency
- Prevents splitting across pages
- Header cells: #d4a574 background with white text
- Row striping: Alternating white/#f9f7f1 for scannability

### Blockquotes & Callouts

```css
border-left: 5px solid #d4a574;
background-color: #faf8f3;
padding: 20px 0 20px 20px;
margin: 1.5em 0;
font-style: italic;
font-size: 17px;
line-height: 1.8;
page-break-inside: avoid;
```

**Details:**
- Tan left border for visual distinction
- Cream background (#faf8f3) for subtle callout
- Italic text for emphasis
- Prevents page-break splitting

### Code Blocks & Inline Code

```css
background-color: #0f0f0f;
color: #f5f5f5;
font-family: 'Monaco', 'Courier New', monospace;
font-size: 14px;
padding: 12px 14px;
border-radius: 6px;
overflow-x: auto;
page-break-inside: avoid;
```

**Details:**
- Dark background/light text for contrast
- Monospace font for code rendering
- Horizontal scroll for long code lines
- Rounded corners on screen (0 on print)
- Prevents page-break splitting

---

## Print-Friendly Specifications

### Page Setup

```css
@page {
  size: A4;
  margin: 1in;
}
```

**Details:**
- A4 paper size (210mm × 297mm)
- 1 inch margins on all sides
- Prevents content cutoff on standard printers

### Color Preservation

```css
* {
  -webkit-print-color-adjust: exact !important;
  color-adjust: exact !important;
  print-color-adjust: exact !important;
  box-shadow: none !important;
}
```

**Details:**
- Forces exact color rendering (no grayscale fallback)
- Removes box shadows for ink efficiency
- Ensures gold headings print as specified

### Page Break Management

**Prevent breaks within:**
- Section headings and following paragraphs
- Lists and tables
- Code blocks and blockquotes
- Header/paragraph pairs (h2+p, h3+p)

**Allow breaks between:**
- Major sections (after h2 elements)
- Large content blocks

### Text Sizing for Print

- H2: 20pt (from 28px)
- H3: 16pt (from 22px)
- Body: 12pt (from 18px)
- Lists: 12pt (from 18px)
- Tables: 11pt (from 16px)
- Code: 10pt (from 14px)

**Rationale:** Print scaling ensures readability without crowding

### Link Handling

**Screen:** Gold color (#ffd700) with underline
**Print:** Dark brown (#1a120b) without underline

Prevents wasted ink and maintains readability in print

---

## Screen Display Enhancements

### Section Containers

```css
.report-section {
  background-color: white;
  border-radius: 12px;
  padding: 2rem;
  border-left: 5px solid #ffd700;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}
```

**Details:**
- White background for content clarity
- Gold left border for brand identity
- Subtle shadow for depth
- Rounded corners for modern appearance

### Action Bar (Print/Download)

```css
.report-action-bar {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding: 1.5rem;
  background-color: white;
  border-top: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

**Details:**
- Sticky positioning with print-safe hiding
- Centered layout with responsive buttons
- Subtle separator line above

---

## Responsive Breakpoints

### Tablet (max-width: 768px)

- H2: 24px (from 28px)
- H3: 20px (from 22px)
- Body/Lists: 16px (from 18px)
- Section padding: 1.5rem (from 2rem)
- Button stacking: flex-direction column

### Mobile (max-width: 640px)

- H2: 22px
- H3: 18px
- Body/Lists: 16px
- Section padding: 1rem
- Buttons: Full width
- Container padding: 1rem

### Print (any size)

- Resets to print-optimized metrics above
- A4 margins: 1 inch all sides
- Max width: 100% of page width
- No responsive adjustments

---

## Implementation Details

### Component Structure

```tsx
<motion.div className="space-y-6">
  <style>{/* Inline CSS (all styles) */}</style>

  {/* Sections */}
  <div className="report-section">
    <div className="report-container">
      {/* HTML content from Claude */}
    </div>
  </div>

  {/* Action Bar */}
  <div className="report-action-bar">
    <button onClick={handlePrintPDF}>Print as PDF</button>
    <button onClick={handleDownloadHTML}>Download as HTML</button>
  </div>
</motion.div>
```

### Inline CSS Strategy

All CSS is embedded within a `<style>` tag inside the component to ensure:
1. **Portability**: Downloaded HTML includes all styling
2. **Consistency**: No external CSS file dependencies
3. **Print safety**: All styles preserved during browser print

### Animation Continuity

- Framer Motion handles section entrance animations (0.5s, 0.15s stagger)
- No additional animations beyond Story 3.5 requirements
- Animations disabled in print media (automatic via @media)

---

## Color Reference Chart

```
╔═══════════════════════════════════════════════════════════════╗
║                    BRAND COLOR PALETTE                        ║
╠═══════════════════════════════════════════════════════════════╣
║ ██████ Cloud Dancer (Cream)       #F2F0E6    Background       ║
║ ██████ Gold                       #ffd700    Headings         ║
║ ██████ Dark Brown                 #1a120b    Body Text        ║
║ ██████ Tan                        #d4a574    Dividers/Tables  ║
║ ██████ Dark Code Background       #0f0f0f    Code Blocks      ║
║ ██████ Light Code Text            #f5f5f5    Code Text        ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## Font Loading

Google Fonts are loaded with `display=swap` to ensure:
- Text displays immediately with fallback fonts
- Custom fonts load asynchronously
- No layout shift (CLS safe)

**Fallback chain:**
- Serif fonts → serif (browser default)
- Monospace → monospace (browser default)

---

## Testing Checklist

### Screen Display
- [ ] H2 headings render in gold (#ffd700) at 28px
- [ ] Paragraph text displays at 18px with 1.8 line height
- [ ] Tables have light backgrounds and tan borders
- [ ] Code blocks show dark background with light text
- [ ] Section containers have rounded corners and subtle shadows
- [ ] Responsive layout stacks properly on tablet (768px)
- [ ] Mobile display (640px) maintains readability
- [ ] Print/Download buttons are functional and visible

### Print Output (PDF)
- [ ] Colors print exactly as specified (no grayscale)
- [ ] Page breaks occur at logical section boundaries
- [ ] Header/paragraph pairs don't split across pages
- [ ] A4 margins (1 inch) are preserved
- [ ] Font sizes print at specified points (20pt, 16pt, 12pt, etc.)
- [ ] Print buttons and interactive elements are hidden
- [ ] Links appear as dark text without underlines
- [ ] Tables maintain formatting without page breaks

### HTML Download
- [ ] Downloaded file includes all styling
- [ ] Opening in browser renders identically to displayed report
- [ ] Print to PDF from download works correctly

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-04 | Initial implementation for Story 3.6 |

---

## Maintenance Notes

**No color changes permitted** without explicit brand approval.

**Typography is locked** - do not adjust font families or minimum sizes.

**Print media query** must remain active - report must be print-safe.

**Responsive breakpoints** can be adjusted only for UX improvements, not for style changes.

For questions or modifications, contact the product team.
