# CASEY'S VISUAL VALIDATION: Step 6c Submission Flow & Progress Bar

**Validator:** Casey (Visual Director & QA)
**Date:** January 3, 2026
**Task:** Visual validation of calculator submission flow and progress bar UI
**Status:** FINDINGS DOCUMENTED - AWAITING IMPLEMENTATION

---

## Executive Summary

The calculator form (`/public/calculator-form-rebuild.html`) has a solid, accessible, responsive foundation with proper styling and form structure. However, it **lacks the critical submit button and progress bar implementations** needed to complete the report generation flow.

**Current Status:**
- ✓ Form structure complete (Steps 1-4)
- ✓ Input styling matches brand guidelines
- ✓ Responsive design working (no horizontal scroll)
- ✓ Accessibility attributes present
- ✗ Submit button missing (CRITICAL)
- ✗ Progress bar not implemented (CRITICAL)
- ✗ JavaScript handlers missing (CRITICAL)

**Recommendation:** HALT VISUAL TESTING until submit button and progress bar are implemented

---

## SECTION 1: Form Structure Assessment

### What Exists (VERIFIED)

The form correctly includes all required fields:

**Step 1: Physical Stats**
- Biological sex (radio buttons) ✓
- Age (number input, 13-150) ✓
- Height (combined inputs with unit selector) ✓
- Weight (combined inputs with unit selector) ✓

**Step 2: Fitness & Diet Profile**
- Lifestyle activity level (select) ✓
- Exercise frequency (select) ✓
- Primary goal (radio buttons: lose/maintain/gain) ✓
- Caloric deficit/surplus (conditional select) ✓
- Diet type (radio buttons: carnivore/pescatarian/keto/lowcarb) ✓

**Step 3: Dietary Restrictions & History**
- Food allergies (textarea) ✓
- Foods to avoid (textarea) ✓
- Dairy tolerance (radio buttons) ✓
- Previous diets tried (textarea) ✓
- What worked best (textarea) ✓
- Carnivore experience (radio buttons) ✓

**Step 4: Contact (Premium)**
- Email address (email input, REQUIRED) ✓
- First name (text input) ✓
- Last name (text input) ✓

**Total Form Elements:** ~40+ inputs across 9 fieldsets

### What's Missing (CRITICAL)

```html
<!-- MISSING: Submit button -->
<!-- Form closes without any way to submit -->
</form>
```

---

## SECTION 2: Input Styling Verification

### Colors - All Verified Correct

| Element | Expected | CSS Value | Status |
|---------|----------|-----------|--------|
| Form container background | #f4e4d4 (light tan) | `background: #f4e4d4` | ✓ PASS |
| Form headings (H1) | #b8860b (gold) | `color: #b8860b` | ✓ PASS |
| Form labels | #b8860b (gold) | `color: #b8860b` | ✓ PASS |
| Step dividers | #d4a574 (tan) | `border-color: #d4a574` | ✓ PASS |
| Input borders (normal) | #d4a574 (tan) | `border-color: #d4a574` | ✓ PASS |
| Input borders (focus) | #b8860b (gold) | `border-color: #b8860b` | ✓ PASS |
| Input text | #2c1810 (dark brown) | `color: #2c1810` | ✓ PASS |
| Input background | white | `background: white` | ✓ PASS |
| Placeholder text | #a89474 (muted tan) | `color: #a89474` | ✓ PASS |

### Input Field States - All Implemented

**Normal State:**
- 2px border #d4a574 (tan)
- White background
- Black text
- Height: 44px minimum (accessible)

**Focus State:**
- Border changes to #b8860b (gold)
- Box shadow: `0 0 8px rgba(255, 215, 0, 0.3)`
- Visible focus indicator (WCAG AA compliant)

**Hover State:**
- Border changes to #b8860b
- Smooth transition (0.3s)

**Implementation Quality:** EXCELLENT

### Radio Buttons & Checkboxes

- Accent color: #d4a574 ✓
- Touch target: 44px with padding ✓
- Focus outline: 2px solid #b8860b ✓
- Hover state: Background highlight ✓

---

## SECTION 3: Responsive Design Testing

### Desktop (1400px width)
- ✓ Form visible
- ✓ All inputs accessible
- ✓ No horizontal scroll
- ✓ Padding: 40px
- ✓ Max-width: 800px (centered)

### Tablet (768px width)
- ✓ Responsive padding (20px)
- ✓ Layouts stack properly
- ✓ No horizontal scroll
- ✓ Combined inputs (height/weight) stack to single column
- ✓ Fieldsets remain readable

### Mobile (375px width)
- ✓ No horizontal scroll detected
- ✓ Padding: 15px (mobile optimized)
- ✓ Full-width inputs
- ✓ Radio button hit targets adequate (44px)
- ✓ Text readable without zooming
- ✓ Form container: 90% width with padding

**Responsive Design Status:** EXCELLENT - No issues found

---

## SECTION 4: Accessibility Audit

### WCAG 2.1 AA Compliance

**Touch Targets (44px minimum):**
- ✓ Radio buttons: 24px + 10px padding = 44px total
- ✓ Input fields: min-height 44px
- ✓ Checkboxes: Same as radio buttons
- ✗ Submit button: Will need 44px minimum (not yet implemented)

**Keyboard Navigation:**
- ✓ Tab order natural (left to right, top to bottom)
- ✓ All inputs focusable
- ✓ Focus indicators visible on all form fields
- ✓ Radio buttons navigable with arrow keys

**Aria Labels & Attributes:**
```html
✓ <input aria-label="Your age in years">
✓ <input aria-label="Your height">
✓ <input aria-label="Your weight">
✓ <input aria-label="Your email address" aria-required="true">
✓ <fieldset> elements with <legend>
```

**Form Structure:**
- ✓ Proper use of fieldset/legend for radio groups
- ✓ Label elements associated with inputs
- ✓ Required fields marked with required attribute
- ✓ Email input type provides browser validation

**Color Contrast:**
- ✓ Dark brown text (#2c1810) on white: High contrast
- ✓ Gold labels (#b8860b) on tan container (#f4e4d4): NEEDS VERIFICATION

**Accessibility Status:** GOOD - No major issues, but color contrast needs final check

---

## SECTION 5: Missing Implementation - Submit Button

### Specification (from checklist)

**Desktop (1400px):**
- [ ] Button visible below last form field
- [ ] Gold background (#b8860b) with white text
- [ ] 44px+ height (accessible)
- [ ] Text: "Generate My Personalized Report"
- [ ] Disabled state: grayed out when email invalid
- [ ] Enabled state: bright gold when form valid
- [ ] Hover state: darker gold on hover
- [ ] Focus state: gold outline visible on keyboard focus

**Mobile (375px):**
- [ ] Full width of container (minus padding)
- [ ] 44px+ height (touch-friendly)
- [ ] Text readable and not cut off
- [ ] Tap target large enough (44px)
- [ ] No horizontal scroll

### Required HTML

```html
<button type="submit" id="submit-button" class="submit-button">
    Generate My Personalized Report
</button>
```

### Required CSS

```css
.submit-button {
    background: #b8860b;
    color: white;
    padding: 14px 32px;
    min-height: 44px;
    font-size: 16px;
    font-weight: 700;
    font-family: 'Merriweather', Georgia, serif;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    width: 100%;
    transition: all 0.3s ease;
    text-align: center;
    margin-top: 20px;
}

/* Enabled state */
.submit-button:not(:disabled) {
    background: #b8860b;
}

.submit-button:not(:disabled):hover {
    background: #8b6508;
    box-shadow: 0 4px 12px rgba(184, 134, 11, 0.4);
}

.submit-button:focus-visible {
    outline: 3px solid #b8860b;
    outline-offset: 2px;
}

/* Disabled state (when email invalid) */
.submit-button:disabled {
    background: #cccccc;
    color: #999999;
    cursor: not-allowed;
    opacity: 0.6;
}

@media (max-width: 480px) {
    .submit-button {
        padding: 12px 20px;
        font-size: 15px;
    }
}
```

### Current Gap

**The form closes with no submit button.** Users cannot trigger report generation.

---

## SECTION 6: Missing Implementation - Progress Bar

### Specification (from `/docs/REPORT_GENERATION_SPEC.md` Section 7)

The progress bar appears after form submission and shows real-time generation progress over 20-30 seconds.

**5 Stages:**
1. "Calculating your macros..." (0% → 20%) - 2-3 seconds
2. "Analyzing your health profile..." (20% → 40%) - 3-5 seconds
3. "Generating personalized protocol..." (40% → 65%) - 5-8 seconds
4. "Building your food guide..." (65% → 85%) - 3-5 seconds
5. "Creating your meal plan..." (85% → 100%) - 4-6 seconds

**Total Duration:** ~20-30 seconds

### Required HTML Structure

```html
<div class="report-generation-container">
  <div class="generation-overlay" id="generationOverlay">
    <div class="generation-modal">
      <div class="generation-header">
        <h2>Building Your Personalized Report</h2>
        <p class="generation-subtitle">This takes about 20-30 seconds</p>
      </div>

      <div class="progress-wrapper">
        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="progressBarFill"></div>
        </div>
        <div class="progress-percent" id="progressPercent">0%</div>
      </div>

      <div class="stage-message" id="stageMessage">
        Preparing your data...
      </div>

      <div class="elapsed-time" id="elapsedTime">
        Time: 0s
      </div>

      <div class="navigation-warning">
        <strong>Important:</strong> Please don't refresh, go back, or close this tab
        while your report is generating.
      </div>
    </div>
  </div>

  <div class="report-ready-container" id="reportReadyContainer" style="display: none;">
    <div class="report-ready-modal">
      <div class="report-ready-icon">✓</div>
      <h2>Your Report is Ready!</h2>
      <p>Your personalized carnivore diet protocol has been generated.</p>
      <div class="action-buttons">
        <button class="btn btn-primary" id="viewReportBtn">View Report</button>
        <button class="btn btn-secondary" id="downloadReportBtn">Download PDF</button>
      </div>
      <p class="report-expiry">
        This report will be available for <span id="expiryDays">30</span> days.
      </p>
    </div>
  </div>
</div>
```

### Required CSS

**Progress Bar (Gold Gradient):**
```css
.progress-bar-container {
  background: #e8e8e8;
  height: 8px;
  border-radius: 10px;
  overflow: hidden;
}

.progress-bar-fill {
  background: linear-gradient(90deg, #ffd700 0%, #ffed4e 100%);
  height: 100%;
  width: 0%;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

**Overlay & Modal:**
```css
.generation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.generation-modal {
  background: white;
  border-radius: 12px;
  padding: 40px 24px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}
```

### Required JavaScript

```javascript
// Form submission handler
document.getElementById('calculator-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  // Show progress bar
  document.getElementById('generationOverlay').style.display = 'flex';

  // Gather form data
  const formData = new FormData(e.target);

  // Submit to API
  const response = await fetch('/api/v1/calculator/step/4', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  const reportToken = data.report_token;

  // Start polling for progress
  pollReportProgress(reportToken);
});

async function pollReportProgress(reportToken) {
  const pollInterval = setInterval(async () => {
    const response = await fetch(`/api/v1/calculator/report/${reportToken}/status`);
    const status = await response.json();

    // Update progress bar
    updateProgressBar(status.progress_percent);
    document.getElementById('stageMessage').innerText = status.stage_name;
    document.getElementById('elapsedTime').innerText = `Time: ${status.elapsed_seconds}s`;
    document.getElementById('progressPercent').innerText = `${status.progress_percent}%`;

    if (status.status === 'completed') {
      clearInterval(pollInterval);
      showReportReady(reportToken);
    }
  }, 2000);
}

function updateProgressBar(percent) {
  document.getElementById('progressBarFill').style.width = `${percent}%`;
}

function showReportReady(reportToken) {
  document.getElementById('generationOverlay').style.display = 'none';
  document.getElementById('reportReadyContainer').style.display = 'flex';

  document.getElementById('viewReportBtn').onclick = () => {
    window.location.href = `/report/${reportToken}`;
  };
  document.getElementById('downloadReportBtn').onclick = () => {
    window.location.href = `/api/v1/calculator/report/${reportToken}/download`;
  };
}
```

### Current Gap

**Progress bar is not implemented.** Users submitting the form will have no visual feedback for 20-30 seconds while the report generates.

---

## SECTION 7: Color Verification Needed

Once implementation is complete, verify exact hex values using browser DevTools color picker:

| Element | Expected Hex | Needs Verification |
|---------|-------------|-------------------|
| Submit button background | #b8860b | YES - After implementation |
| Submit button hover | #8b6508 | YES - After implementation |
| Submit button focus | #b8860b outline | YES - After implementation |
| Progress bar fill | #ffd700 → #ffed4e | YES - Gradient verification |
| Progress bar container | #e8e8e8 | YES |
| Stage text | #1a1a1a | YES |
| Navigation warning bg | #fff3cd | YES |

---

## SECTION 8: Implementation Checklist

### Phase 1: Submit Button
- [ ] Add button HTML to form
- [ ] Add button CSS with all states
- [ ] Add form submit event listener
- [ ] Test button visibility (desktop + mobile)
- [ ] Verify colors with color picker
- [ ] Test disabled state (when email invalid)
- [ ] Test hover and focus states
- [ ] Verify touch target 44px+ on mobile

### Phase 2: Progress Bar UI
- [ ] Add progress bar HTML structure
- [ ] Add overlay modal CSS
- [ ] Add progress bar CSS with shimmer animation
- [ ] Add responsive styles (375px, 1400px)
- [ ] Test progress bar appears on form submit
- [ ] Test stage message updates
- [ ] Test elapsed time counter
- [ ] Verify smooth animation (no jank)

### Phase 3: Form Submission Handler
- [ ] Add submit event listener
- [ ] Gather form data
- [ ] Post to `/api/v1/calculator/step/4`
- [ ] Start polling for progress
- [ ] Handle errors and show error message

### Phase 4: Progress Bar JavaScript
- [ ] Implement polling mechanism
- [ ] Update progress bar percentage
- [ ] Update stage message
- [ ] Update elapsed time
- [ ] Show success modal when complete
- [ ] Handle errors (show retry button)

---

## SECTION 9: Validation Timeline

**After Implementation:**

1. **Desktop Screenshot (1400x900)**
   - Submit button visible
   - Progress bar structure correct
   - Colors match brand guidelines
   - No overflow or layout issues

2. **Mobile Screenshot (375x812)**
   - Submit button full width
   - Progress bar responsive
   - No horizontal scroll
   - Text readable

3. **Color Verification**
   - Use browser color picker
   - Verify each element's hex value
   - Document findings

4. **Responsive Testing**
   - 375px viewport (mobile)
   - 768px viewport (tablet)
   - 1400px viewport (desktop)
   - Check for horizontal scroll at each size

5. **Accessibility Testing**
   - Keyboard navigation (Tab key)
   - Focus indicators visible
   - Screen reader testing
   - Touch target sizes

6. **Functional Testing**
   - Form validation (email required)
   - Button disabled state (email invalid)
   - Form submission flow
   - Progress bar progression (5 stages)
   - Success modal display

---

## SECTION 10: Files & Documentation

**Implementation References:**
- `/public/calculator-form-rebuild.html` - Form file (add button and progress bar here)
- `/docs/REPORT_GENERATION_SPEC.md` - Full specification (Section 7 has all progress bar details)
- `/docs/style-guide.md` - Brand colors and guidelines

**Validation Reports:**
- `/STEP_6C_VISUAL_VALIDATION_REPORT.md` - Detailed validation findings
- `/agents/memory/casey_submission_validation_summary.md` - Quick reference for Casey

**Baseline Tracking:**
- `/agents/visual_baselines/` - Directory for baseline screenshots
- `/agents/visual_validation_reports/` - Directory for validation reports and screenshots

---

## SECTION 11: Sign-Off

**Current Validation Status:** INCOMPLETE - Awaiting Implementation

**Casey's Assessment:**
- Form foundation is solid
- Styling is on-brand
- Responsive design works
- Missing critical submit button and progress bar UI

**Recommendation:**
1. Implement submit button (high priority)
2. Implement progress bar UI and JavaScript (high priority)
3. Create API endpoints for report status (medium priority)
4. Revalidate with screenshots after implementation

**Next Review Date:** After submit button and progress bar implementation complete

---

**Generated by:** Casey (Visual Director & QA)
**Date:** January 3, 2026
**Time Investment:** Comprehensive form analysis + specification review
**Status:** Findings documented, awaiting development team implementation
