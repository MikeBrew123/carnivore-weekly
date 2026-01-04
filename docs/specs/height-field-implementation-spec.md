# Height Field Implementation Specification
**For:** Alex (Developer)
**From:** Casey (Visual Director & QA)
**Status:** Implementation Required
**Reference:** test-calculator-flow.js (lines 109-122)

---

## Overview

The Height field must support two unit systems with a radio button toggle:
1. **Imperial:** Feet (3-8) and Inches (0-11) - default
2. **Metric:** Centimeters (100-250)

The field must switch between two distinct input layouts based on user selection, with smooth visibility transitions.

---

## HTML Structure Template

```html
<!-- After the Age field, add this: -->

<!-- Height Field -->
<fieldset>
    <legend>Height</legend>

    <!-- Unit Toggle -->
    <div class="radio-option">
        <input type="radio" id="height-imperial" name="heightUnit" value="imperial" checked required>
        <label for="height-imperial">Feet & Inches</label>
    </div>
    <div class="radio-option">
        <input type="radio" id="height-metric" name="heightUnit" value="metric" required>
        <label for="height-metric">Centimeters</label>
    </div>

    <!-- Imperial Mode: Feet & Inches -->
    <div id="heightImperialMode" class="height-input-group">
        <div class="input-wrapper">
            <label for="heightFeet">Feet</label>
            <input
                type="number"
                id="heightFeet"
                name="heightFeet"
                min="3"
                max="8"
                placeholder="3-8"
                aria-label="Height in feet"
            >
        </div>
        <div class="input-wrapper">
            <label for="heightInches">Inches</label>
            <input
                type="number"
                id="heightInches"
                name="heightInches"
                min="0"
                max="11"
                placeholder="0-11"
                aria-label="Height in inches"
            >
        </div>
    </div>

    <!-- Metric Mode: Centimeters -->
    <div id="heightMetricMode" class="height-input-group" style="display: none;">
        <div class="input-wrapper">
            <label for="heightCm">Centimeters</label>
            <input
                type="number"
                id="heightCm"
                name="heightCm"
                min="100"
                max="250"
                placeholder="100-250"
                aria-label="Height in centimeters"
            >
        </div>
    </div>
</fieldset>
```

---

## CSS Requirements

### Inherit from Existing Styles

The following CSS already exists and should apply to Height field:
- `fieldset` - removes default borders, sets margins (40px)
- `fieldset legend` - gold (#ffd700), Merriweather, 18px, weight 600
- `.radio-option` - flex layout, 20px bottom margin, 12px gap
- `.radio-option input[type="radio"]` - 24px size, tan accent (#d4a574)
- `.radio-option label` - cursor pointer, dark brown text, 18px
- `.input-wrapper` - flex column, 12px gap, 40px bottom margin
- `.input-wrapper label` - gold (#ffd700), Merriweather, 18px, weight 700
- `.input-wrapper input[type="number"]` - 44px height, 100% width, tan border (#d4a574)

### Additional CSS Needed (Optional Enhancement)

```css
/* Group two inputs side-by-side on larger screens */
.height-input-group {
    display: flex;
    gap: 20px;
}

.height-input-group .input-wrapper {
    flex: 1;
    margin-bottom: 0;
}

/* Stack inputs on mobile */
@media (max-width: 480px) {
    .height-input-group {
        flex-direction: column;
        gap: 12px;
    }

    .height-input-group .input-wrapper {
        flex: 1;
        margin-bottom: 20px;
    }
}
```

**Note:** If you don't add custom CSS, the inputs will stack vertically (which is also acceptable).

---

## JavaScript Toggle Functionality

```javascript
// Add this script before closing </body> tag or in a separate file

const heightUnitRadios = document.querySelectorAll('input[name="heightUnit"]');
const imperialMode = document.getElementById('heightImperialMode');
const metricMode = document.getElementById('heightMetricMode');

heightUnitRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        if (e.target.value === 'imperial') {
            imperialMode.style.display = 'flex'; // or 'block' if no custom CSS
            metricMode.style.display = 'none';
        } else {
            imperialMode.style.display = 'none';
            metricMode.style.display = 'flex'; // or 'block' if no custom CSS
        }
    });
});
```

---

## Test Coverage (from test-calculator-flow.js)

Your implementation will be tested against these assertions:

```javascript
// Test expects these exact IDs and behaviors:
await this.page.selectOption('button:has-text("lbs/in")'); // Click toggle
await this.page.fill('input[id="heightFeet"]', '5');
await this.page.fill('input[id="heightInches"]', '11');

const feet = await this.page.inputValue('input[id="heightFeet"]');
const inches = await this.page.inputValue('input[id="heightInches"]');
assert.strictEqual(feet, '5', 'Height feet should be 5');
assert.strictEqual(inches, '11', 'Height inches should be 11');
```

**Important:** The test uses exact IDs. Your implementation must use:
- `heightFeet` (not `height-feet` or `heightFeet_input`)
- `heightInches` (not `height-inches` or `heightInches_input`)
- `heightCm` (not `height-cm` or `heightCm_input`)

---

## Color Values to Verify

**Copy these into browser DevTools color picker to verify:**

| Element | Color | Hex Value |
|---------|-------|-----------|
| Legend "Height" | Gold | #ffd700 |
| Input Labels | Gold | #ffd700 |
| Input Borders | Tan | #d4a574 |
| Input Background | White | #ffffff |
| Input Text | Dark Brown | #2c1810 |
| Radio Button (unchecked) | Tan | #d4a574 |
| Radio Button (checked) | Tan | #d4a574 |

---

## Form Flow Context

The Height field appears **after** Age field in this sequence:

1. **Sex Field** (radio buttons: Male / Female)
2. **Age Field** (number input, 18-100)
3. **Height Field** (radio toggle: Feet/Inches or Centimeters) ← YOU ARE HERE
4. **Weight Field** (coming next - will follow same pattern)

The form follows a top-to-bottom linear flow with consistent styling.

---

## Tab Order (Accessibility)

The keyboard navigation should flow like this:

1. Biological Sex radio buttons
2. Age input
3. **Height Unit Toggle radio buttons** (imperial / metric)
4. **Height Feet input** (if imperial selected) OR **Height CM input** (if metric selected)
5. **Height Inches input** (if imperial selected) OR skip to next field
6. Weight input (coming)

---

## Validation Rules

| Field | Min | Max | Required |
|-------|-----|-----|----------|
| Height Feet | 3 | 8 | Yes (in imperial mode) |
| Height Inches | 0 | 11 | Yes (in imperial mode) |
| Height CM | 100 | 250 | Yes (in metric mode) |

---

## Visual Behavior

### Desktop (1400px)
- Legend "Height" appears above radio toggle
- Two radio buttons: "Feet & Inches" and "Centimeters"
- Below toggle: Two inputs side-by-side (Feet | Inches) in imperial mode
- Below toggle: One full-width input (Centimeters) in metric mode
- Toggle switches smoothly between layouts

### Mobile (375px)
- Legend and radio toggle remain at top
- Two inputs stack vertically in imperial mode
- Single input displays full-width in metric mode
- Touch targets remain 44px+ height

### Responsive Behavior
```
Desktop (1400px): Feet | Inches  (side-by-side)
Tablet (768px):   Feet | Inches  (side-by-side, narrower)
Mobile (375px):   Feet (full-width)
                  Inches (full-width)
```

---

## Accessibility Requirements (WCAG AA)

### Focus Management
- [ ] All inputs have visible focus outline (currently: 2px solid #ffd700)
- [ ] Tab order follows: toggle → feet → inches (or cm)
- [ ] No focus traps
- [ ] Focus-visible outline on radio buttons

### Labels
- [ ] All inputs have associated label elements with proper for/id
- [ ] Labels descriptive and clear
- [ ] Aria-labels on inputs for screen readers

### Color Contrast
- [ ] Gold text on light background: > 4.5:1 ✓ (already verified)
- [ ] Dark brown text on light background: > 4.5:1 ✓ (already verified)
- [ ] Tan accent on white: > 3:1 ✓ (already verified)

### Keyboard Navigation
- [ ] Can reach all inputs via Tab key
- [ ] Can select radio buttons via arrow keys
- [ ] Can type into all number inputs
- [ ] Enter key does not prematurely submit form

---

## Testing Checklist (Before Submission)

- [ ] HTML is valid (no console errors)
- [ ] All input IDs are exact: heightFeet, heightInches, heightCm
- [ ] Feet input accepts values 3-8
- [ ] Inches input accepts values 0-11
- [ ] CM input accepts values 100-250
- [ ] Toggle switches between imperial and metric modes
- [ ] Imperial mode shows 2 inputs, metric shows 1
- [ ] Toggle is smooth (no jarring layout shifts)
- [ ] Mobile view (375px) has no horizontal scroll
- [ ] All touch targets are 44px+
- [ ] Colors match brand guide (checked with color picker)
- [ ] Font is Merriweather (not system font)
- [ ] Keyboard navigation works (Tab through all inputs)
- [ ] Focus states are visible
- [ ] Labels are properly associated with inputs

---

## Submission Checklist

When you're ready to submit for visual validation, provide:

1. **Updated HTML file** with Height field implementation
2. **Screenshots:**
   - Desktop (1400x900px): Feet & Inches mode
   - Desktop (1400x900px): Centimeters mode (after toggle)
   - Mobile (375x812px): Feet & Inches mode
   - Mobile (375x812px): Centimeters mode
3. **Color verification:** Screenshot or report showing color picker values
4. **Browser console:** Screenshot showing no errors
5. **Note to Casey:** Any special implementation details

Submit to Casey for visual validation against the checklist in `/docs/validation-reports/height-field-validation-2025-01-03.md`.

---

## File Locations

| Item | Location |
|------|----------|
| HTML Test File | `/Users/mbrew/Developer/carnivore-weekly/public/calculator-form-rebuild.html` |
| Test Suite | `/Users/mbrew/Developer/carnivore-weekly/test-calculator-flow.js` |
| Style Guide | `/docs/style-guide.md` |
| Validation Report | `/docs/validation-reports/height-field-validation-2025-01-03.md` |
| This Specification | `/docs/specs/height-field-implementation-spec.md` |

---

## Questions or Issues?

If you encounter any issues during implementation:

1. Check the existing Age field (lines 372-385 of calculator-form-rebuild.html) as a reference
2. Review the CSS styling (lines 139-348) for color and typography values
3. Look at the test expectations in test-calculator-flow.js (lines 109-122)
4. Ask Casey for visual direction or Jordan for structural questions

---

**Specification Version:** 1.0
**Last Updated:** January 3, 2026
**Prepared By:** Casey (Visual Director & QA)
**For:** Alex (Developer)

