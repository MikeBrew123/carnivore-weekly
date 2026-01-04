# Story 3.6 - Report Styling Architecture

## Component Structure

```
ReportViewer Component (889 lines)
├── Constants
│   └── reportStylesCSS (230 lines)
│       ├── Brand Colors (CSS variables)
│       ├── Google Fonts Import
│       ├── Base Typography (h1-h4, p, lists)
│       ├── Components (tables, code, blockquotes)
│       ├── Screen Display Styles
│       ├── @media print (page breaks, sizing)
│       ├── @media (tablet breakpoints)
│       └── @media (mobile breakpoints)
├── State Management
│   ├── reportHTML (string)
│   ├── isLoading (boolean)
│   └── error (string)
├── Effects
│   └── useEffect (fetchReport)
│       ├── API call to Supabase
│       ├── Error handling
│       └── State updates
├── Event Handlers
│   ├── handlePrintPDF()
│   └── handleDownloadHTML()
└── Render
    ├── Loading State
    ├── Error State
    └── Success State
        ├── Inline <style> tag
        ├── Report Sections (with animations)
        └── Action Bar (Print/Download buttons)
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Views Report                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  ReportViewer Component      │
        │  1. accessToken received     │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │  useEffect Hook              │
        │  - fetchReport()             │
        └──────────┬───────────────────┘
                   │
                   ▼
        ┌──────────────────────────────┐
        │  Supabase API Call           │
        │  /rest/v1/generated_reports  │
        └──────────┬───────────────────┘
                   │
    ┌──────────────┴──────────────┐
    │                             │
    ▼                             ▼
┌─────────────┐          ┌──────────────────┐
│   Success   │          │      Error       │
│  reportHTML │          │   Error State    │
│  setLoading │          │   Display Error  │
└──────┬──────┘          └──────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  Parse Report HTML                       │
│  split('## Report #') → 13 sections     │
└──────────┬────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│  Render Sections with Animations        │
│  - 0.5s duration                        │
│  - 0.15s stagger delay                  │
└──────────┬────────────────────────────────┘
           │
    ┌──────┴──────────────────────────────┐
    │                                      │
    ▼                                      ▼
┌─────────────────┐          ┌──────────────────────┐
│  Print as PDF   │          │ Download as HTML     │
│  - Print Dialog │          │ - Create HTML File   │
│  - User saves   │          │ - Include styles     │
│  - PDF output   │          │ - Download file      │
└─────────────────┘          └──────────────────────┘
```

## Styling System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       CSS Variables                          │
│                      (Color System)                          │
│  --report-bg: #F2F0E6                                        │
│  --report-heading: #ffd700                                   │
│  --report-text: #1a120b                                      │
│  --report-divider: #d4a574                                   │
│  --report-code-bg: #0f0f0f                                   │
│  --report-code-text: #f5f5f5                                 │
└──────────────────┬──────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────────────────────────────┐
    │              │                                      │
    ▼              ▼                                      ▼
┌──────────┐  ┌──────────────┐  ┌────────────────────┐
│Typography│  │Components    │  │Media Queries       │
│Headings  │  │- Tables      │  │- @media print      │
│- H1-H4   │  │- Code        │  │- @media tablet     │
│- Font    │  │- Lists       │  │- @media mobile     │
│- Size    │  │- Blockquote  │  │- Responsive        │
│- Color   │  │- Horizontal  │  │- Page breaks       │
└──────────┘  │  rule        │  └────────────────────┘
              └──────────────┘
```

## Print Workflow

```
User clicks "Print as PDF"
        │
        ▼
window.print() triggered
        │
        ▼
┌─────────────────────────────────────┐
│  Browser Print Dialog Opens         │
│  1. Print Preview Generated         │
│  2. CSS parsed for @media print     │
│  3. Colors applied with exact       │
│     color-adjust: exact             │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  PDF Renderer (Browser)             │
│  1. Page breaks applied             │
│  2. A4 margins (1in)                │
│  3. Font sizes converted to points  │
│  4. Colors preserved exactly        │
│  5. Interactive elements hidden     │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  Print to Printer or Save as PDF    │
│  Output: PDF file or printed page   │
└─────────────────────────────────────┘
```

## Download HTML Workflow

```
User clicks "Download as HTML"
        │
        ▼
handleDownloadHTML() executed
        │
        ▼
┌──────────────────────────────────────────┐
│  Create HTML File Structure              │
│  <!DOCTYPE html>                         │
│  <html>                                  │
│    <head>                                │
│      <meta charset="UTF-8">              │
│      <link Google Fonts>                 │
│      <style>[reportStylesCSS]</style>    │
│    </head>                               │
│    <body>                                │
│      <div class="report-container">      │
│        [Report HTML]                     │
│      </div>                              │
│    </body>                               │
│  </html>                                 │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  Create Blob + Download Link             │
│  1. Encode HTML as data URL              │
│  2. Create <a> element                   │
│  3. Set href to data URL                 │
│  4. Set download filename                │
│  5. Trigger click() to download          │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│  File Downloaded                         │
│  carnivore-protocol-report.html          │
│  (Includes all styles)                   │
└──────────────────────────────────────────┘
```

## Responsive Design Architecture

```
                      Default Styles
                      (Desktop 1024px+)
                        ┌─────────┐
                        │ H2: 28px│
                        │ P: 18px │
                        │Pad: 2rem│
                        └────┬────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
    @media 768px       @media 640px       @media print
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ H2: 24px     │  │ H2: 22px     │  │ H2: 20pt     │
    │ P: 16px      │  │ P: 16px      │  │ P: 12pt      │
    │ Pad: 1.5rem  │  │ Pad: 1rem    │  │ Pad: 1in     │
    │ (Tablet)     │  │ (Mobile)     │  │ (A4 Paper)   │
    └──────────────┘  └──────────────┘  └──────────────┘
```

## CSS Import Structure

```
<style>
  ┌─────────────────────────────────────────────────┐
  │  1. Google Fonts Import (display=swap)           │
  │     @import url('...Playfair+Display...')        │
  │     @import url('...Merriweather...')            │
  └─────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  2. CSS Variables (Brand Colors)                │
  │     :root { --report-bg: #F2F0E6; ... }         │
  └─────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  3. Base Elements (h1-h4, p, lists)             │
  │     font-family, font-size, color, margin       │
  └─────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  4. Components (table, code, blockquote)        │
  │     Specific styling for content types          │
  └─────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  5. Screen Display (.report-section)            │
  │     Containers, shadows, borders                │
  └─────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  6. Print Media Query (@media print)            │
  │     Page breaks, sizing, hiding interactive     │
  └─────────────────────────────────────────────────┘
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  7. Responsive Breakpoints (@media 768px, 640px)│
  │     Tablet and mobile font/padding adjustments  │
  └─────────────────────────────────────────────────┘
</style>
```

## Color System Architecture

```
CSS Variables Layer
    │
    ├── --report-bg: #F2F0E6
    │   └── Applied to: body, .report-container
    │
    ├── --report-heading: #ffd700
    │   └── Applied to: h1, h2, h3, a (screen)
    │
    ├── --report-text: #1a120b
    │   └── Applied to: p, li, td, body, a (print)
    │
    ├── --report-divider: #d4a574
    │   └── Applied to: border-bottom (h2)
    │   └── Applied to: border (table)
    │   └── Applied to: background (th)
    │   └── Applied to: border-left (blockquote)
    │
    ├── --report-code-bg: #0f0f0f
    │   └── Applied to: background (code, pre)
    │
    └── --report-code-text: #f5f5f5
        └── Applied to: color (code, pre)
```

## Animation Architecture

```
Motion Wrapper (opacity: 0 → 1)
    │
    ├── Report Sections Loop
    │   ├── Key: index
    │   ├── Initial: { opacity: 0, y: 20 }
    │   ├── Animate: { opacity: 1, y: 0 }
    │   ├── Duration: 0.5s
    │   ├── Delay: index * 0.15s (stagger)
    │   └── Ease: easeOut
    │
    └── Action Bar (buttons)
        ├── Initial: { opacity: 0, y: 20 }
        ├── Animate: { opacity: 1, y: 0 }
        ├── Duration: 0.3s
        └── Delay: sections.length * 0.15 + 0.2
```

## State Management Flow

```
Component Initialize
    │
    ├── reportHTML: '' (empty string)
    ├── isLoading: true
    └── error: '' (empty string)
        │
        ▼
    Fetch Report (useEffect)
        │
        ├── Success
        │   ├── setReportHTML(data[0].report_html)
        │   ├── setError('')
        │   └── setIsLoading(false)
        │       │
        │       ▼
        │       Render Report Sections
        │
        └── Error
            ├── setError(errorMsg)
            └── setIsLoading(false)
                │
                ▼
                Render Error State
```

## File Architecture

```
calculator2-demo/
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── ReportViewer.tsx (889 lines)
│   │           ├── reportStylesCSS (230 lines)
│   │           ├── Props interface
│   │           ├── State hooks
│   │           ├── useEffect hook
│   │           ├── Event handlers
│   │           └── JSX render
│   └── index.css (global styles)
│
├── REPORT_STYLING_GUIDE.md (400+ lines)
│   ├── Brand colors reference
│   ├── Typography specifications
│   ├── Section styling details
│   ├── Print specifications
│   ├── Implementation guidelines
│   └── Testing checklist
│
├── STORY_3_6_SUMMARY.md (300+ lines)
│   ├── Implementation details
│   ├── Compliance checklist
│   ├── Styling architecture
│   └── Testing recommendations
│
├── STORY_3_6_DELIVERABLE.md (400+ lines)
│   ├── Deliverables overview
│   ├── Feature implementation
│   ├── Testing status
│   └── Deployment readiness
│
├── CSS_QUICK_REFERENCE.md (200+ lines)
│   ├── Color palette
│   ├── Typography quick rules
│   ├── Common CSS patterns
│   ├── Responsive breakpoints
│   └── Debugging tips
│
└── ARCHITECTURE.md (this file)
    ├── Component structure
    ├── Data flow diagrams
    ├── Styling system architecture
    └── File organization
```

## Browser Compatibility Layer

```
Print Color Adjustment
├── -webkit-print-color-adjust: exact  (Chrome, Safari, Edge)
├── color-adjust: exact                (Firefox)
└── print-color-adjust: exact          (Standard)

Font Loading
├── Google Fonts CDN
├── display=swap (system font fallback)
└── Serif/Monospace fallbacks

Page Break Support
├── page-break-after: avoid
├── page-break-before: avoid
└── page-break-inside: avoid
```

## Testing Architecture

```
Component Testing
├── TypeScript Compilation
│   └── npm run type-check (PASS)
│
├── Component Props
│   └── accessToken: string (validated)
│
├── State Management
│   ├── reportHTML state
│   ├── isLoading state
│   └── error state
│
├── API Integration
│   ├── Supabase fetch
│   ├── Error handling
│   └── Data validation
│
├── Event Handlers
│   ├── handlePrintPDF()
│   └── handleDownloadHTML()
│
├── Rendering
│   ├── Loading state
│   ├── Error state
│   └── Success state
│
├── Animation
│   ├── Staggered entrance
│   ├── Duration & easing
│   └── Delay calculations
│
└── Styling
    ├── Brand colors applied
    ├── Typography correct
    ├── Print media working
    ├── Responsive breakpoints
    └── Print functionality
```

## Deployment Checklist

```
Pre-Deployment
├── [x] TypeScript compilation passes
├── [x] Component functionality verified
├── [x] CSS styling complete
├── [x] Print functionality tested conceptually
├── [x] Responsive design verified
├── [x] Documentation complete
├── [x] No console errors
└── [x] No breaking changes

Deployment
├── [ ] Code review approved
├── [ ] QA testing complete
├── [ ] Staging deployment successful
├── [ ] Production deployment

Post-Deployment
├── [ ] Monitor error logs
├── [ ] Verify print functionality
├── [ ] Verify HTML download works
├── [ ] User acceptance testing
└── [ ] Performance monitoring
```

---

**Architecture Documentation Complete**

This document provides a comprehensive visual and textual representation of the Report Styling system architecture, data flows, and implementation details for Story 3.6.

---

*Generated: 2026-01-04*
*Version: 1.0*
*Status: Complete*
