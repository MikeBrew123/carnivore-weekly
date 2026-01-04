# STEP 6a Testing Guide: Submit Button + Payment Flow

**Quick Reference for Testing**
**Created:** 2026-01-03

---

## Visual Verification

### Submit Button States

#### Disabled (Email Empty or Invalid)
- [ ] Background color: #c4a484 (light tan)
- [ ] Text color: #999 (gray)
- [ ] Cursor: not-allowed
- [ ] Hover effect: None (no color change)
- [ ] Height: 48px minimum
- [ ] Width: 100% (full width on all screen sizes)

#### Enabled (Email Valid)
- [ ] Background color: #b8860b (gold)
- [ ] Text color: white
- [ ] Cursor: pointer
- [ ] Hover effect: Darker gold (#9a6f0a) + lift up (-2px)
- [ ] Shadow: 0 6px 16px rgba(184, 134, 11, 0.4)

#### Pressed/Active
- [ ] Transform: translateY(0) (back to original position)
- [ ] Shadow: 0 2px 8px rgba(184, 134, 11, 0.3)

---

## Test Scenarios

### Scenario 1: Basic Form Submission
**Setup:** Clear browser cache, load form fresh

1. Enter all required fields (Steps 1-2):
   - Sex: Male
   - Age: 35
   - Height: 5 feet 10 inches
   - Weight: 180 lbs
   - Lifestyle: Moderate
   - Exercise: 5-6 days/week
   - Goal: Fat Loss
   - Deficit: 20%
   - Diet: Carnivore

2. Verify submit button still disabled (no email yet)

3. Enter valid email: test@example.com

4. Verify submit button is now enabled (gold background)

5. Click submit button

6. Expected:
   - Progress bar appears
   - First stage: "Calculating macros..."
   - Button disabled while processing
   - No errors in console

---

### Scenario 2: Email Validation
**Setup:** Form loaded

1. Click email field, leave empty, blur
   - Button should be disabled
   - Email field has no visible error (field is empty)

2. Type invalid email: "notanemail"
   - Email field gets red border
   - Button remains disabled
   - Type more: "notanemail@"
   - Button still disabled (incomplete email)

3. Type valid email: "notanemail@example.com"
   - Red border disappears
   - Green border appears (if validation.js active)
   - Button becomes enabled (gold)

4. Clear email field
   - Border returns to normal
   - Button disabled again

---

### Scenario 3: Empty Form Submission
**Setup:** Form loaded, no fields filled

1. Try to click submit button
   - Button is disabled (locked)
   - Cannot click

2. Enter email: valid@example.com
   - Button is still disabled (other required fields missing)

3. Enter Step 1 fields only
   - Button still disabled (Step 2 required)

4. Enter Steps 1-2 completely
   - Button becomes enabled
   - Can now click

---

### Scenario 4: Progress Bar Display
**Setup:** Form filled with all required data, valid email

1. Click submit button

2. Watch progress bar appear:
   - Initially hidden
   - Appears in 100-300ms
   - Background color: rgba(184, 134, 11, 0.05)
   - Left border: 4px solid #b8860b

3. Stages should display:
   - 0%: Calculating macros... (20%)
   - 20%: Analyzing fitness profile... (40%)
   - 40%: Calculating macros... (60%)
   - 60%: Preparing payment... (80%)
   - 80%+: Finalizing your report...

4. Progress bar fill animates smoothly
   - Width transitions over 0.3s
   - No jumps or stutters

---

### Scenario 5: Mobile Responsiveness
**Setup:** Open form on mobile device (375px width)

1. **Button Layout:**
   - [ ] Button spans full width
   - [ ] Has 20px left/right padding
   - [ ] Font size: 16px
   - [ ] Min height: 44px
   - [ ] Text readable, not cramped

2. **Progress Bar:**
   - [ ] Appears below button
   - [ ] Scales to viewport width
   - [ ] Text is readable
   - [ ] No horizontal scroll

3. **Payment Modal (if shown):**
   - [ ] Modal is 90% width
   - [ ] Max width 500px
   - [ ] Centered on screen
   - [ ] Tier buttons stack vertically
   - [ ] Each button full width
   - [ ] Touch-friendly (min 44px height)

---

### Scenario 6: Browser Console (Dev Tools)
**Setup:** Open DevTools console, fill form, submit

**Should NOT see:**
- [ ] No errors on page load
- [ ] No errors when button enabled
- [ ] No errors when button clicked
- [ ] No console.log() statements
- [ ] No undefined variable errors

**Expected console output:**
- [ ] None (clean console)
- [ ] Only errors if API calls fail

---

## API Call Verification

Open DevTools Network tab and submit form:

### Expected API Calls (in order):

1. **POST /api/v1/calculator/session**
   - Request: { referrer: "...", utm_source: "...", ... }
   - Response: { session_token: "...", session_id: "..." }
   - Status: 201 (Created)

2. **POST /api/v1/calculator/step/1**
   - Request: { session_token: "...", data: { sex, age, height, weight, ... } }
   - Response: { step_completed: 1, ... }
   - Status: 200 (OK)

3. **POST /api/v1/calculator/step/2**
   - Request: { session_token: "...", data: { lifestyle_activity, exercise_frequency, ... } }
   - Response: { step_completed: 2, ... }
   - Status: 200 (OK)

4. **POST /api/v1/calculator/step/3**
   - Request: { session_token: "...", calculated_macros: { calories, protein_grams, ... } }
   - Response: { step_completed: 3, ... }
   - Status: 200 (OK)

5. **POST /api/v1/calculator/payment/initiate** (if not premium)
   - Request: { session_token: "...", tier_id: "...", customer_email: "...", success_url: "...", cancel_url: "..." }
   - Response: { stripe_session_url: "https://checkout.stripe.com/...", ... }
   - Status: 201 (Created)

---

## Error Scenarios

### Test: Invalid Email
1. Enter email: "invalid@"
2. Click submit
3. Expected:
   - Button doesn't click (disabled)
   - No API calls made
   - Email field shows invalid state

### Test: Network Failure (Step 1)
1. Fill form, valid email
2. Open DevTools, throttle to "Offline"
3. Click submit
4. Expected:
   - Progress bar starts
   - First API call fails
   - Error message: "Failed to save physical stats"
   - Button re-enabled
   - No infinite loading

### Test: Missing Required Field (Step 1)
1. Leave sex unselected, fill other Step 1 fields
2. Fill Step 2 completely
3. Enter valid email
4. Click submit
5. Expected:
   - No API call made
   - Native HTML validation error: "Please select an option"
   - Focus moves to sex field

### Test: API Validation Error
1. Fill form with invalid age (e.g., 5 years old)
2. Click submit
3. Expected:
   - POST /api/v1/calculator/step/1 fails with 400
   - Error message: "Age must be between 13 and 150 years old"
   - Button re-enabled
   - User can correct and retry

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through form fields in logical order
- [ ] Tab to email field
- [ ] Tab to submit button
- [ ] Button shows focus outline (2px solid #b8860b)
- [ ] Press Enter to click submit button
- [ ] Shift+Tab goes backward through fields

### Screen Reader (NVDA/JAWS)
- [ ] Submit button has aria-label: "Generate your personalized report"
- [ ] Button announced as: "Generate your personalized report, button"
- [ ] Progress bar label announced when it appears
- [ ] Progress percentage announced

### Color Contrast
- [ ] Button text (white) on gold background (#b8860b): WCAG AA compliant
- [ ] Disabled button (#c4a484 with #999 text): WCAG AA compliant
- [ ] Progress bar fill (#b8860b) on light background: AA compliant

---

## Performance Checklist

### Page Load Time
- [ ] Form loads in < 1 second
- [ ] submit-handler.js loads < 500ms
- [ ] No render blocking

### Submission Flow Time
- [ ] Form validation: < 50ms
- [ ] Progress bar appears: < 300ms
- [ ] Each API call: < 500ms
- [ ] Total flow (Steps 1-3): < 2 seconds
- [ ] Payment redirect: Immediate

### No Memory Leaks
- [ ] Open form 10 times, submit each time
- [ ] DevTools Memory tab: Memory usage stable
- [ ] No event listener accumulation

---

## Cross-Browser Testing

Test on these browser combinations:

| Browser | Desktop | Tablet | Mobile |
|---------|---------|--------|--------|
| Chrome (latest) | [ ] | [ ] | [ ] |
| Safari (latest) | [ ] | [ ] | [ ] |
| Firefox (latest) | [ ] | [ ] | [ ] |
| Edge (latest) | [ ] | [ ] | [ ] |
| Safari iOS | N/A | [ ] | [ ] |
| Chrome Android | N/A | [ ] | [ ] |

**What to verify on each:**
- [ ] Button renders correctly
- [ ] Email validation works
- [ ] Progress bar animates smoothly
- [ ] No console errors
- [ ] Form data submits correctly

---

## Sign-Off Checklist

Before marking Step 6a complete:

- [ ] HTML: Submit button added with correct ID, classes, attributes
- [ ] CSS: Button styled with #b8860b, 48px height, full width
- [ ] CSS: Disabled/enabled/hover states look correct
- [ ] CSS: Mobile responsive (44px+ height at 480px)
- [ ] JavaScript: Email validation works (enables/disables button)
- [ ] JavaScript: Form data collection returns all 22 fields
- [ ] JavaScript: Progress bar displays and animates
- [ ] JavaScript: API calls made in correct order
- [ ] JavaScript: Error handling works (button re-enabled on error)
- [ ] Accessibility: Keyboard navigation works
- [ ] Accessibility: Screen reader announces button correctly
- [ ] Performance: Page loads < 1s, submission < 2s
- [ ] Cross-browser: Works on Chrome, Safari, Firefox, Mobile
- [ ] No console errors in production
- [ ] Code follows /docs/style-guide.md
- [ ] All tests pass

---

**Ready for:** Backend development + integration testing
**Test Duration:** ~30 minutes for basic scenarios
**Test Duration:** ~2 hours for comprehensive testing
