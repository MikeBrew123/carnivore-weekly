# CSS Quick Reference - Carnivore Report Styling

## Color Palette

```
Cream Background    #F2F0E6  ■■■■■■■■■■ Used for: Page backgrounds
Gold Headings      #ffd700  ■■■■■■■■■■ Used for: H1, H2, H3 text
Dark Brown Text    #1a120b  ■■■■■■■■■■ Used for: Body, lists, tables
Tan Dividers       #d4a574  ■■■■■■■■■■ Used for: Borders, hr, table headers
Code Background    #0f0f0f  ■■■■■■■■■■ Used for: Code block bg
Code Text          #f5f5f5  ■■■■■■■■■■ Used for: Code block text
```

## Typography Quick Rules

| Element | Font | Size (Screen) | Size (Print) | Weight | Color |
|---------|------|---|---|---|---|
| H1 | Playfair Display | 36px | 28pt | 900 | Gold |
| H2 | Playfair Display | 28px | 20pt | 700 | Gold |
| H3 | Playfair Display | 22px | 16pt | 700 | Gold |
| H4 | Merriweather | 18px | 14pt | 700 | Dark Brown |
| Body | Merriweather | 18px | 12pt | 400 | Dark Brown |
| Lists | Merriweather | 18px | 12pt | 400 | Dark Brown |
| Tables | Merriweather | 16px | 11pt | 400 | Dark Brown |
| Code | Monospace | 14px | 10pt | 400 | Light Gray (on Dark) |

## Font Import
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;500;700&display=swap" rel="stylesheet">
```

## CSS Variables (Copy-Paste)
```css
:root {
  --report-bg: #F2F0E6;
  --report-heading: #ffd700;
  --report-text: #1a120b;
  --report-divider: #d4a574;
  --report-code-bg: #0f0f0f;
  --report-code-text: #f5f5f5;
}
```

## Common CSS Patterns

### Heading Style
```css
h2 {
  font-family: 'Playfair Display', serif;
  font-size: 28px;
  color: #ffd700;
  border-bottom: 3px solid #d4a574;
  margin: 50px 0 40px 0;
}
```

### Body Text
```css
p {
  font-family: 'Merriweather', serif;
  font-size: 18px;
  color: #1a120b;
  line-height: 1.8;
  margin: 0 0 1.2em 0;
}
```

### List Style
```css
ul, ol {
  font-size: 18px;
  margin: 1.5em 0;
  padding-left: 2em;
  line-height: 1.8;
}

li {
  margin: 0.8em 0;
}
```

### Table Style
```css
table {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #d4a574;
  background-color: #fafafa;
}

th {
  background-color: #d4a574;
  color: white;
  padding: 12px;
  font-weight: 700;
}

td {
  padding: 12px;
  border: 1px solid #d4a574;
}

tbody tr:nth-child(odd) {
  background-color: #f9f7f1;
}
```

### Code Block
```css
code, pre {
  background-color: #0f0f0f;
  color: #f5f5f5;
  font-family: 'Monaco', 'Courier New', monospace;
  padding: 12px 14px;
  border-radius: 6px;
}
```

### Blockquote
```css
blockquote {
  border-left: 5px solid #d4a574;
  background-color: #faf8f3;
  padding: 20px 0 20px 20px;
  margin: 1.5em 0;
  font-style: italic;
}
```

## Responsive Breakpoints

### Desktop (1024px+)
No additional changes needed - use base styles

### Tablet (768px - 1023px)
```css
@media (max-width: 768px) {
  h2 { font-size: 24px; }
  h3 { font-size: 20px; }
  p, ul, ol { font-size: 16px; }
  .report-section { padding: 1.5rem; }
}
```

### Mobile (< 640px)
```css
@media (max-width: 640px) {
  h2 { font-size: 22px; }
  h3 { font-size: 18px; }
  p, ul, ol { font-size: 16px; }
  .report-section { padding: 1rem; }
}
```

## Print Media

### Page Setup
```css
@page {
  size: A4;
  margin: 1in;
}
```

### Print Color Preservation
```css
* {
  -webkit-print-color-adjust: exact !important;
  color-adjust: exact !important;
  print-color-adjust: exact !important;
}
```

### Hide Interactive Elements
```css
@media print {
  .print-hide { display: none !important; }
}
```

### Font Sizes for Print
```css
@media print {
  h2 { font-size: 20pt; }
  h3 { font-size: 16pt; }
  p { font-size: 12pt; }
  table { font-size: 11pt; }
  code { font-size: 10pt; }
}
```

### Page Breaks
```css
@media print {
  h2, h3 { page-break-after: avoid; }
  table, pre, blockquote { page-break-inside: avoid; }
  h2 + p, h3 + p { page-break-before: avoid; }
}
```

## Component Classes

### Report Section Container
```html
<div class="report-section">
  <div class="report-container">
    <!-- Report content here -->
  </div>
</div>
```

### Action Bar
```html
<div class="report-action-bar">
  <button class="btn-primary">Print as PDF</button>
  <button class="btn-secondary">Download as HTML</button>
</div>
```

## Brand Compliance Checklist

### Before Committing
- [ ] All H2 headings are gold (#ffd700)
- [ ] All body text is dark brown (#1a120b)
- [ ] All section borders are tan (#d4a574)
- [ ] Code blocks have dark bg (#0f0f0f) and light text (#f5f5f5)
- [ ] Using Playfair Display for headings
- [ ] Using Merriweather for body
- [ ] Minimum 18px on desktop, 16px on mobile
- [ ] Line height is 1.6+
- [ ] Tables have proper styling
- [ ] Print media queries are included

## Debugging Tips

### Colors Not Displaying
Check for:
```css
-webkit-print-color-adjust: exact !important;
color-adjust: exact !important;
print-color-adjust: exact !important;
```

### Fonts Not Loading
Check Google Fonts import:
```html
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;500;700&display=swap" rel="stylesheet">
```

### Page Breaks Not Working
Check for:
```css
page-break-after: avoid;
page-break-before: avoid;
page-break-inside: avoid;
```

### Print Preview Different from Screen
Ensure:
```css
@media print { /* All print-specific styles */ }
```

## Vendor Prefixes

All properties include vendor prefixes for compatibility:
```css
-webkit-print-color-adjust: exact;  /* Chrome, Safari, Edge */
color-adjust: exact;                /* Firefox, Standard */
print-color-adjust: exact;          /* Standard (future)  */
```

## File Locations

- **Component:** `src/components/ui/ReportViewer.tsx`
- **Styling Guide:** `REPORT_STYLING_GUIDE.md`
- **Implementation Summary:** `STORY_3_6_SUMMARY.md`
- **Deliverable Document:** `STORY_3_6_DELIVERABLE.md`
- **Quick Reference:** `CSS_QUICK_REFERENCE.md` (this file)

## Common Updates

### Change a Color
1. Update the CSS variable in `:root`
2. All elements using that variable update automatically
3. Example: To change heading color from gold to another color:
```css
:root {
  --report-heading: #NewHexCode; /* Was #ffd700 */
}
```

### Change Font Size
1. Update the font-size property for that element
2. Don't forget to update both screen and print sizes
3. Example: To change H2 from 28px:
```css
h2 {
  font-size: 30px;     /* Screen */
}
@media print {
  h2 { font-size: 22pt; }  /* Print */
}
```

### Change Line Height
1. Update the line-height property
2. Remember: Higher = more space, Lower = more compact
3. Body should be 1.6+, headings 1.2-1.3

## Additional Resources

- Google Fonts: https://fonts.googleapis.com
- CSS @media print: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/print
- CSS Page Breaks: https://developer.mozilla.org/en-US/docs/Web/CSS/break-inside
- Framer Motion: https://www.framer.com/motion/

---

**Last Updated:** 2026-01-04
**Version:** 1.0
**Status:** Complete
