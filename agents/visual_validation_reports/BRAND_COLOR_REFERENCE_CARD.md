# Brand Color Reference Card
## Quick Visual Validation Guide

**Form:** Carnivore Weekly Calculator
**Last Verified:** January 3, 2026
**Status:** PASS - All colors exact

---

## The 5 Brand Colors

```
GOLD           TAN            DARK BROWN     LIGHT TAN      PLACEHOLDER
#ffd700        #d4a574        #2c1810        #f4e4d4        #a89474
(255,215,0)    (212,165,116)  (44,24,16)     (244,228,212)  (168,148,116)

All headings    Input borders  Body text      Background     Hint text
All labels      Dividers       Radio text     Container bg   Placeholders
Focus states    Radio accent   Select text
Section hdrs    Accents        Textarea text
```

---

## Form Color Map

### What Should Be Gold (#ffd700)

- H1 "Carnivore Calculator"
- All fieldset legends ("Biological Sex", "Height", "Weight", "Primary Goal", "Diet Type", "Dairy tolerance", "Experience with carnivore diet")
- All input labels ("Age", "Email Address", "First Name", "Last Name")
- All combined labels ("Height", "Unit", "Weight", "Unit")
- All select labels ("Lifestyle Activity", "Exercise Frequency")
- All textarea labels ("Food allergies", "Foods to avoid", "Previous diets tried", "What worked best for you")
- All step headers ("Fitness & Diet Profile", "Dietary Restrictions", "Diet History")
- Premium label ("PREMIUM INFORMATION")
- Input borders when focused
- Input borders when hovered
- Radio outline when focused
- Box-shadow glow effect on focus

**Total: 22+ gold elements**

### What Should Be Tan (#d4a574)

- Header divider (3px line under title)
- Form top border (2px line before form starts)
- All input borders (default state)
- All select borders (default state)
- All textarea borders (default state)
- All radio button accent colors
- Step dividers (2px lines between form sections)
- Radio hover background (10% opacity tan)

**Total: 16+ tan elements**

### What Should Be Dark Brown (#2c1810)

- Description paragraph ("Get personalized recommendations...")
- All radio option labels ("Male", "Female", "Yes", "No", etc.)
- All input text (what user types)
- All select text
- All textarea text (what user types)
- All select options (in dropdown menu)
- Dropdown chevron icons (SVG fill color)

**Total: 9+ dark brown elements**

### What Should Be Light Tan (#f4e4d4)

- Calculator container background
- (White for input backgrounds is OK)

### What Should Be #a89474

- All placeholder text ("Enter your age", "Select unit", etc.)
- Placeholder text should be italic

---

## Quick Verification Checklist

### Gold (#ffd700) - Quick Check
- [x] Main title is gold
- [x] All field labels are gold
- [x] All section headers are gold
- [x] Input focuses turn gold
- [x] No exceptions

### Tan (#d4a574) - Quick Check
- [x] All input borders are tan
- [x] All dividers are tan
- [x] Radio accents are tan
- [x] No unexpected colors

### Dark Brown (#2c1810) - Quick Check
- [x] All body text is dark brown
- [x] All option text is dark brown
- [x] All placeholder fallbacks are dark brown
- [x] Icon colors are dark brown

### Fonts - Quick Check
- [x] Headings look elegant (Playfair Display)
- [x] Body text looks readable (Merriweather)
- [x] Weights look correct (bold headings, regular body)

### Spacing - Quick Check
- [x] Plenty of white space
- [x] Elements don't feel cramped
- [x] Inputs are easy to tap (44px tall)

### Accessibility - Quick Check
- [x] Focus states visible (gold outline)
- [x] Hover states visible
- [x] Radio buttons easy to click
- [x] Text readable without zooming

---

## If You See Wrong Colors

### If a label is NOT gold...
- Bug: Label should always be #ffd700
- Location: Any label on form (Age, Email, Height, etc.)
- Fix: Change to #ffd700
- Severity: HIGH - Brand standard violated

### If an input border is NOT tan...
- Bug: Input border should always be #d4a574 (default)
- Location: Any input, select, or textarea
- Fix: Change to #d4a574
- Note: Focus/hover should turn gold, but default should be tan
- Severity: HIGH - Brand standard violated

### If body text is NOT dark brown...
- Bug: Text should always be #2c1810
- Location: Any paragraph, label, or option text
- Fix: Change to #2c1810
- Severity: HIGH - Brand standard violated

### If focus outline is NOT gold...
- Bug: Focus should always highlight in gold #ffd700
- Location: Any focused input or radio
- Fix: Change to #ffd700
- Severity: MEDIUM - Accessibility issue

### If placeholder is NOT italic...
- Bug: Placeholder text should be italic
- Location: Any input placeholder
- Fix: Add font-style: italic
- Severity: LOW - Minor styling

---

## Browser Verification Steps

**Goal:** Use F12 DevTools to spot-check a color

1. Open form in browser
2. Press F12 (or right-click → Inspect)
3. Click the color picker icon (eyedropper/dropper)
4. Click on the element you want to check
5. Look at hex value shown at top
6. Compare to this table:

| Element | Expected | Check By |
|---------|----------|----------|
| H1 heading | #ffd700 | Click on title |
| Input label | #ffd700 | Click on "Age" label |
| Input border | #d4a574 | Click on input field border |
| Input text | #2c1810 | Type in field, click on text |
| Radio label | #2c1810 | Click on "Male" or "Female" |
| Divider | #d4a574 | Click on line between sections |
| Focused input border | #ffd700 | Click in input, then click border |

**Expected result:** Hex values match exactly

---

## Why Exact Colors Matter

### Brand Recognition
- Users recognize exact gold and tan
- Even slight drift signals inconsistency
- Exact colors = professional appearance

### Color Theory
- These 5 colors were chosen for contrast and harmony
- Approximations break the color relationship
- Exact hex = intended visual effect

### Accessibility
- Gold on light background has specific contrast ratio
- Color approximations might break WCAG compliance
- Exact colors = accessible to color-blind users

---

## Color Palette Hex Values (Copy-Paste)

```
#ffd700  ← Gold (headings, labels, focus)
#d4a574  ← Tan (borders, dividers, accents)
#2c1810  ← Dark Brown (body text)
#f4e4d4  ← Light Tan (background)
#a89474  ← Placeholder (hint text)
```

---

## Font Families (Copy-Paste)

```
Headings: 'Playfair Display', Georgia, serif
Body:     'Merriweather', Georgia, serif
```

**Import:** `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Merriweather:wght@400;700&display=swap" rel="stylesheet">`

---

## Form Field Color Requirements

### Every Text Input (Age, Email, First Name, Last Name)
- Default border: #d4a574 (tan)
- Focus border: #ffd700 (gold)
- Text color: #2c1810 (dark brown)
- Label color: #ffd700 (gold)
- Background: white

### Every Select (Lifestyle, Exercise, Height Unit, Weight Unit)
- Default border: #d4a574 (tan)
- Focus border: #ffd700 (gold)
- Text color: #2c1810 (dark brown)
- Label color: #ffd700 (gold)
- Icon color: #2c1810 (dark brown)
- Background: white

### Every Textarea (Allergies, Foods, Diets, History)
- Default border: #d4a574 (tan)
- Focus border: #ffd700 (gold)
- Text color: #2c1810 (dark brown)
- Label color: #ffd700 (gold)
- Background: white

### Every Radio Button (Sex, Goal, Diet Type, Dairy, Experience)
- Accent color: #d4a574 (tan)
- Label text: #2c1810 (dark brown)
- Focus outline: #ffd700 (gold)
- Hover background: rgba(212, 165, 116, 0.1) [10% tan]

### Every Legend/Label
- Color: #ffd700 (gold)
- Font: Merriweather, 700 weight
- No exceptions

### Every Divider
- Color: #d4a574 (tan)
- No exceptions

---

## Red Flags (These Should NOT Happen)

❌ **Gray inputs** - Should be white or tan-bordered
❌ **Blue focus** - Should be gold
❌ **Black text** - Should be dark brown (#2c1810)
❌ **Random colors** - Should only be brand colors
❌ **No focus outline** - Should have gold outline
❌ **System fonts** - Should have Playfair/Merriweather loaded
❌ **Horizontal scroll on mobile** - Should be responsive

---

## When to Escalate

- **Any color doesn't match:** Flag for Casey (visual QA)
- **Focus states wrong:** Flag for Casey or Alex (developer)
- **Fonts not loading:** Flag for Alex (developer)
- **Accessibility issue:** Flag for Jordan or Casey
- **Layout broken:** Flag for Alex (developer)

---

## Last Verified

- **Date:** January 3, 2026
- **All 22+ form fields checked:** PASS
- **All colors exact match:** PASS
- **All fonts loading:** PASS
- **All accessibility met:** PASS
- **Status:** APPROVED FOR DEPLOYMENT

**Verified By:** Casey (Visual QA)
**Confidence:** 100%

