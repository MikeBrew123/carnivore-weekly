# Height Field Implementation - Quick Reference for Alex

**Status:** IMPLEMENTATION NEEDED
**Test File:** `/Users/mbrew/Developer/carnivore-weekly/public/calculator-form-rebuild.html`
**Full Spec:** `/docs/specs/height-field-implementation-spec.md`

---

## Copy-Paste Ready HTML

Add this code **after the Age field** (around line 385) in calculator-form-rebuild.html:

```html
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

## Copy-Paste Ready JavaScript

Add this code **before the closing </body> tag**:

```javascript
<script>
    const heightUnitRadios = document.querySelectorAll('input[name="heightUnit"]');
    const imperialMode = document.getElementById('heightImperialMode');
    const metricMode = document.getElementById('heightMetricMode');

    heightUnitRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'imperial') {
                imperialMode.style.display = 'flex';
                metricMode.style.display = 'none';
            } else {
                imperialMode.style.display = 'none';
                metricMode.style.display = 'flex';
            }
        });
    });
</script>
```

---

## Optional CSS (For Side-by-Side on Desktop)

Add this to the `<style>` section if you want Feet and Inches side-by-side on large screens:

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

**Note:** Without this CSS, the inputs will stack vertically (still valid).

---

## Critical Details

### Input IDs (Must be exact - case sensitive)
- ✓ `heightFeet` (not `height_feet` or `heightfeet`)
- ✓ `heightInches` (not `height_inches` or `heightinches`)
- ✓ `heightCm` (not `height_cm` or `heightcm`)

### Input Ranges
- Feet: min="3" max="8"
- Inches: min="0" max="11"
- Centimeters: min="100" max="250"

### Colors (Verify with browser color picker)
- Legend text: #ffd700 (gold)
- Input labels: #ffd700 (gold)
- Input borders: #d4a574 (tan)
- Input background: white
- Input text: #2c1810 (dark brown)

### Typography (Verify fonts load)
- Legend: Merriweather, 18px, weight 600
- Input labels: Merriweather, 18px, weight 700
- Input text: Merriweather, 18px

---

## Testing Before Submission

- [ ] HTML file opens without errors
- [ ] Radio toggle works (click "Centimeters", inputs change)
- [ ] Feet input accepts values 3-8
- [ ] Inches input accepts values 0-11
- [ ] CM input accepts values 100-250
- [ ] Mobile view (375px) has no horizontal scroll
- [ ] All inputs have 44px+ height
- [ ] Colors look correct (gold legend, tan borders)
- [ ] Tab order works (can tab through inputs)
- [ ] Focus outline visible when tabbing

---

## What to Submit to Casey

1. Updated calculator-form-rebuild.html file
2. Screenshot: Desktop (1400px) showing Feet & Inches mode
3. Screenshot: Desktop (1400px) showing Centimeters mode (after toggle)
4. Screenshot: Mobile (375px) showing both modes
5. Color verification (use browser DevTools color picker)
6. Note if you found any issues

---

## Color Picker Quick Check

To verify colors, use browser DevTools:

1. Open page in browser (http://localhost:8000/calculator-form-rebuild.html)
2. Press F12 to open DevTools
3. Click color picker icon (dropper tool)
4. Click on element to check its color
5. Compare hex value to list above

**Colors to Check:**
- Legend "Height" text → should be #ffd700
- "Feet" input label → should be #ffd700
- Feet input border → should be #d4a574
- Feet input background → should be white

---

## Form Structure Context

Your Height field goes here in the form:

```
1. Biological Sex (radio)
2. Age (number input)
3. HEIGHT FIELD (radio toggle + 2 or 1 input) ← YOU ARE HERE
4. Weight (coming next)
5. ...more fields
```

It follows the same styling patterns as Age, so it should feel consistent.

---

## If You Get Stuck

1. **Review existing Age field** (lines 372-385 of calculator-form-rebuild.html) as a style reference
2. **Check CSS styles** (lines 139-348) for color and font values
3. **Run test suite** to see if IDs and functionality match expectations:
   ```bash
   node test-calculator-flow.js
   ```
4. **Check browser console** for JavaScript errors (F12 → Console tab)
5. **Ask Casey** for visual feedback or Jordan for technical questions

---

## Files You'll Need

- Test file to edit: `/Users/mbrew/Developer/carnivore-weekly/public/calculator-form-rebuild.html`
- Full specification: `/docs/specs/height-field-implementation-spec.md`
- Test expectations: `/Users/mbrew/Developer/carnivore-weekly/test-calculator-flow.js` (lines 109-122)
- Validation checklist: `/docs/validation-reports/height-field-validation-2025-01-03.md`

---

## Timeline

1. Implement Height field (this step)
2. Submit to Casey with screenshots and color verification
3. Casey performs visual validation (desktop, mobile, colors, accessibility)
4. Casey reports PASS or FAIL to Jordan
5. If PASS: Approve for Weight field implementation
6. If FAIL: Fix issues and resubmit

**Note:** Casey is waiting for your submission. This is the blocking step.

---

**Quick Reference Version:** 1.0
**Generated:** January 3, 2026
**For:** Alex (Developer)
**From:** Casey (Visual Director & QA)

