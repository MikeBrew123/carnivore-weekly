# Form Validation Testing Plan

**By Alex, Technical Architect**
**Status:** Ready for Testing
**Date:** 2026-01-03

---

## Overview

This document outlines comprehensive testing for the client-side validation system implemented in `/public/validation.js` for all 22 form fields.

---

## Test Environment Setup

**Files:**
- `/public/validation.js` - Validation logic (newly created)
- `/public/calculator-form-rebuild.html` - Form with validation CSS and script tags
- Browser: Chrome, Safari, Firefox (desktop and mobile)

**How to Test:**
1. Open `/public/calculator-form-rebuild.html` in browser
2. Open browser DevTools (F12)
3. Go to Console tab
4. Follow test cases below

---

## FIELD 1: EMAIL VALIDATION (BLOCKING FIELD)

### Test Case 1.1: Empty Email Field
**Setup:** Leave email field blank
**Action:** Click elsewhere (blur) or try to submit
**Expected:**
- Border turns RED
- Status shows X
- Error message: "Please enter an email address"
- Form cannot submit
- aria-invalid="true" on input

**Pass/Fail:** ___

### Test Case 1.2: Invalid Email Format (No @)
**Setup:** Type "testexample.com"
**Action:** Blur field or submit
**Expected:**
- Border turns RED
- Status shows X
- Error message: "Please enter a valid email address"
- Form cannot submit

**Pass/Fail:** ___

### Test Case 1.3: Invalid Email Format (No Domain)
**Setup:** Type "test@"
**Action:** Blur field or submit
**Expected:**
- Border turns RED
- Error message: "Please enter a valid email address"

**Pass/Fail:** ___

### Test Case 1.4: Valid Email Format
**Setup:** Type "user@example.com"
**Action:** Blur field
**Expected:**
- Border turns GREEN
- Status shows checkmark (✓)
- Background turns light green (#f1f8f4)
- Error message clears
- aria-invalid removed
- Form can submit

**Pass/Fail:** ___

### Test Case 1.5: Valid Email with Subdomain
**Setup:** Type "user@mail.example.co.uk"
**Action:** Blur field
**Expected:**
- Border turns GREEN
- Status shows ✓
- Valid state active

**Pass/Fail:** ___

### Test Case 1.6: Email Field Constraints
**Setup:** Try to type >255 characters
**Action:** Attempt to fill email with 256+ chars
**Expected:**
- HTML maxlength="255" prevents entry
- Cannot exceed 255 chars

**Pass/Fail:** ___

### Test Case 1.7: Real-Time Validation (Typing)
**Setup:** Start typing "test"
**Action:** Continue typing "test@example.com" one char at a time
**Expected:**
- Validation updates as you type
- Green checkmark appears as soon as format is valid
- Error clears immediately

**Pass/Fail:** ___

### Test Case 1.8: Whitespace Handling
**Setup:** Type " test@example.com " (with spaces)
**Action:** Blur field
**Expected:**
- Spaces are trimmed
- Email validates as valid
- Green checkmark shows

**Pass/Fail:** ___

---

## FIELDS 2-3: NAME FIELDS (OPTIONAL)

### Test Case 2.1: First Name - Empty (Optional)
**Setup:** Leave first name blank
**Action:** Try to submit form
**Expected:**
- No error message (optional field)
- Form can submit with other required fields valid

**Pass/Fail:** ___

### Test Case 2.2: First Name - Valid Input
**Setup:** Type "John"
**Action:** Blur field
**Expected:**
- No error shown
- Value accepted

**Pass/Fail:** ___

### Test Case 2.3: First Name - With Accent Characters
**Setup:** Type "José"
**Action:** Blur field
**Expected:**
- No error
- Accented characters accepted (regex allows À-ÿ)

**Pass/Fail:** ___

### Test Case 2.4: First Name - With Apostrophe
**Setup:** Type "O'Brien"
**Action:** Blur field
**Expected:**
- No error
- Apostrophe accepted

**Pass/Fail:** ___

### Test Case 2.5: First Name - With Hyphen
**Setup:** Type "Mary-Anne"
**Action:** Blur field
**Expected:**
- No error
- Hyphen accepted

**Pass/Fail:** ___

### Test Case 2.6: First Name - Exceeds 100 Characters
**Setup:** Type 101+ characters
**Action:** Try to submit
**Expected:**
- Error: "First name cannot exceed 100 characters"
- Form blocks submission
- aria-invalid="true" on input

**Pass/Fail:** ___

### Test Case 2.7: First Name - Invalid Characters (Numbers)
**Setup:** Type "John123"
**Action:** Try to submit
**Expected:**
- Error: "First name can only contain letters, hyphens, and apostrophes"
- Form blocks submission

**Pass/Fail:** ___

### Test Case 2.8: First Name - Invalid Characters (Special)
**Setup:** Type "John@Smith"
**Action:** Try to submit
**Expected:**
- Error shown
- Submission blocked

**Pass/Fail:** ___

### Test Case 2.9: Last Name - Same Tests as First Name
**Run same tests for lastName field**

**Pass/Fail:** ___

---

## FIELDS 4-10: TEXTAREA FIELDS WITH CHARACTER COUNTERS

### Test Case 3.1: Medications - Character Counter Starts at 0
**Setup:** Load page
**Action:** Look at medications textarea
**Expected:**
- Character counter shows "0 / 5000 characters"
- Counter is visible below textarea

**Pass/Fail:** ___

### Test Case 3.2: Medications - Counter Updates on Input
**Setup:** Click medications textarea
**Action:** Type "Metformin 500mg, Lisinopril 10mg"
**Expected:**
- Counter updates in real-time
- Shows "33 / 5000 characters" (or actual count)
- Counter updates with each keystroke

**Pass/Fail:** ___

### Test Case 3.3: Medications - Empty Field Valid
**Setup:** Leave medications blank
**Action:** Try to submit
**Expected:**
- No error (optional field)
- Form can submit

**Pass/Fail:** ___

### Test Case 3.4: Medications - Approaches Limit (4500+ chars)
**Setup:** Type 4600 characters
**Action:** Watch counter
**Expected:**
- Counter shows "4600 / 5000 characters"
- Counter text turns ORANGE (#ff9800)
- Counter font-weight becomes 600 (bold)
- Warning indicates user approaching limit

**Pass/Fail:** ___

### Test Case 3.5: Medications - Exceeds Limit
**Setup:** Try to type >5000 characters
**Action:** Attempt to fill field with 5001+ chars
**Expected:**
- HTML maxlength="5000" prevents entry
- Cannot exceed 5000 chars

**Pass/Fail:** ___

### Test Case 3.6: Medications - Line Breaks Allowed
**Setup:** Type multiple lines
**Action:** Press Enter to create line breaks
**Expected:**
- Line breaks accepted
- Counter increments for each line break
- Multiple paragraphs allowed

**Pass/Fail:** ___

### Test Case 3.7: Other Conditions - Max 500 Chars
**Setup:** Type >500 characters in "other_conditions"
**Action:** Try to submit
**Expected:**
- If filled: Error "Additional conditions cannot exceed 500 characters"
- If empty: No error (optional)

**Pass/Fail:** ___

### Test Case 3.8: Other Symptoms - Max 500 Chars
**Same as 3.7 for other_symptoms field**

**Pass/Fail:** ___

### Test Case 3.9: Allergies - Max 5000 Chars
**Setup:** Test allergies textarea (same as medications)
**Action:** Type content and check counter
**Expected:**
- Counter shows "X / 5000 characters"
- Updates in real-time
- Warning at 4500+ chars

**Pass/Fail:** ___

### Test Case 3.10: Avoid Foods - Max 5000 Chars
**Same as 3.9 for avoid_foods field**

**Pass/Fail:** ___

### Test Case 3.11: Previous Diets - Max 5000 Chars
**Same as 3.9 for previous_diets field**

**Pass/Fail:** ___

### Test Case 3.12: What Worked - Max 5000 Chars
**Same as 3.9 for what_worked field**

**Pass/Fail:** ___

### Test Case 3.13: Biggest Challenge - Max 5000 Chars
**Same as 3.9 for biggest_challenge field**

**Pass/Fail:** ___

### Test Case 3.14: Additional Notes - Max 5000 Chars
**Same as 3.9 for additional_notes field**

**Pass/Fail:** ___

### Test Case 3.15: Textarea - Sanitization on Submit
**Setup:** Type content with control characters (if possible)
**Action:** Submit form
**Expected:**
- Control characters removed
- Whitespace trimmed
- Multiple line breaks collapsed

**Pass/Fail:** ___

---

## FIELDS 5 & 7: CHECKBOX ARRAYS (CONDITIONS, SYMPTOMS)

### Test Case 4.1: Conditions - Zero Selections Valid
**Setup:** Leave all condition checkboxes unchecked
**Action:** Try to submit
**Expected:**
- No error (optional field)
- Empty array sent to server

**Pass/Fail:** ___

### Test Case 4.2: Conditions - Single Selection
**Setup:** Check "Diabetes (Type 1 or 2)"
**Action:** Submit form
**Expected:**
- No error
- Selection recorded
- Form accepts submission

**Pass/Fail:** ___

### Test Case 4.3: Conditions - Multiple Selections
**Setup:** Check 3-4 conditions
**Action:** Submit form
**Expected:**
- All selections recorded
- Array contains all checked values
- Form accepts submission

**Pass/Fail:** ___

### Test Case 4.4: Conditions - All Selections Valid (6 max)
**Setup:** Check all 6 condition options
**Action:** Submit form
**Expected:**
- All 6 accepted
- No error
- Array contains 6 items

**Pass/Fail:** ___

### Test Case 4.5: Symptoms - Zero Selections Valid
**Setup:** Leave all symptom checkboxes unchecked
**Action:** Try to submit
**Expected:**
- No error (optional field)
- Empty array sent

**Pass/Fail:** ___

### Test Case 4.6: Symptoms - Multiple Selections
**Setup:** Check "Fatigue / Low Energy" and "Brain Fog"
**Action:** Submit form
**Expected:**
- Both selections recorded
- Array contains both values
- Form accepts

**Pass/Fail:** ___

### Test Case 4.7: Symptoms - All 7 Selections Valid
**Setup:** Check all 7 symptom options
**Action:** Submit form
**Expected:**
- All 7 accepted
- No error
- Array contains 7 items

**Pass/Fail:** ___

---

## FIELD 6 & 8: OTHER CONDITIONS/SYMPTOMS (CONDITIONAL TEXT)

### Test Case 5.1: Other Conditions - Not Shown When Not Selected
**Setup:** Don't check any condition that requires "other"
**Action:** Look at form
**Expected:**
- Field hidden or not visible
- Cannot be filled

**Pass/Fail:** ___

### Test Case 5.2: Other Conditions - Max 500 Characters
**Setup:** Fill with >500 chars
**Action:** Try to submit
**Expected:**
- Error: "Additional conditions cannot exceed 500 characters"
- Submission blocked

**Pass/Fail:** ___

### Test Case 5.3: Other Symptoms - Same as 5.2
**Run same tests for other_symptoms field**

**Pass/Fail:** ___

---

## FIELDS 11, 14-19: ENUM DROPDOWNS

### Test Case 6.1: Dairy Tolerance - Optional (Empty Valid)
**Setup:** Leave dairy tolerance unselected
**Action:** Try to submit
**Expected:**
- No error (optional field)
- Form can submit

**Pass/Fail:** ___

### Test Case 6.2: Dairy Tolerance - Valid Selection
**Setup:** Select "None (avoid all dairy)"
**Action:** Submit form
**Expected:**
- No error
- Value "none" recorded
- Form accepts

**Pass/Fail:** ___

### Test Case 6.3: Dairy Tolerance - All Options Valid
**Setup:** Test each option: none, butter-only, some, full
**Action:** Submit after each selection
**Expected:**
- All options accepted
- No errors
- Each value recorded correctly

**Pass/Fail:** ___

### Test Case 6.4: Carnivore Experience - Optional
**Setup:** Leave unselected
**Action:** Try to submit
**Expected:**
- No error (optional)

**Pass/Fail:** ___

### Test Case 6.5: Carnivore Experience - All Options Valid
**Setup:** Test: new, weeks, months, years
**Action:** Submit after each
**Expected:**
- All valid
- No errors
- Values recorded

**Pass/Fail:** ___

### Test Case 6.6: Cooking Skill - All Options Valid
**Setup:** Test: beginner, intermediate, advanced
**Action:** Submit each
**Expected:**
- All valid
- No errors

**Pass/Fail:** ___

### Test Case 6.7: Meal Prep Time - All Options Valid
**Setup:** Test: none, minimal, some, extensive
**Action:** Submit each
**Expected:**
- All valid
- No errors

**Pass/Fail:** ___

### Test Case 6.8: Budget - All Options Valid
**Setup:** Test: tight, moderate, comfortable
**Action:** Submit each
**Expected:**
- All valid
- No errors

**Pass/Fail:** ___

### Test Case 6.9: Family Situation - All Options Valid
**Setup:** Test: single, partner, kids, extended
**Action:** Submit each
**Expected:**
- All valid
- No errors

**Pass/Fail:** ___

### Test Case 6.10: Work/Travel - All Options Valid
**Setup:** Test: office, remote, frequent_travel, variable
**Action:** Submit each
**Expected:**
- All valid
- No errors

**Pass/Fail:** ___

---

## FIELD 20: HEALTH GOALS (MULTI-SELECT CHECKBOXES)

### Test Case 7.1: Goals - Zero Selections Valid
**Setup:** Leave all goal checkboxes unchecked
**Action:** Try to submit
**Expected:**
- No error (optional)
- Empty array sent

**Pass/Fail:** ___

### Test Case 7.2: Goals - Single Selection
**Setup:** Check "Weight Loss"
**Action:** Submit
**Expected:**
- No error
- Value recorded

**Pass/Fail:** ___

### Test Case 7.3: Goals - Multiple Selections
**Setup:** Check 4-5 goals
**Action:** Submit
**Expected:**
- All selected values recorded
- Array contains all checked items

**Pass/Fail:** ___

### Test Case 7.4: Goals - All 14 Selections Valid
**Setup:** Check all goal options
**Action:** Submit
**Expected:**
- All 14 accepted
- No error
- Array contains 14 items

**Pass/Fail:** ___

---

## FORM SUBMISSION GATE

### Test Case 8.1: Cannot Submit Without Email
**Setup:** Leave email empty, fill all other fields
**Action:** Click submit button
**Expected:**
- Form does NOT submit
- Error message displayed: "Please enter an email address"
- Email field gets focus
- aria-invalid="true" set

**Pass/Fail:** ___

### Test Case 8.2: Cannot Submit With Invalid Email
**Setup:** Type "notemail" in email field, fill other required fields
**Action:** Click submit button
**Expected:**
- Form does NOT submit
- Error message: "Please enter a valid email address"
- Email field gets focus
- Red border on email field

**Pass/Fail:** ___

### Test Case 8.3: Can Submit With Valid Email
**Setup:** Enter valid email "test@example.com"
**Action:** Click submit button
**Expected:**
- Form accepts submission
- Email field shows green checkmark
- Form passes validation gate

**Pass/Fail:** ___

### Test Case 8.4: Optional Fields Don't Block Submit
**Setup:** Enter valid email only, leave all optional fields blank
**Action:** Click submit button
**Expected:**
- Form submits successfully
- No errors for optional fields
- First name, last name, etc. can be empty

**Pass/Fail:** ___

### Test Case 8.5: Multiple Errors Show Together
**Setup:**
- Leave email empty
- Type >5000 chars in medications
- Fill other fields
**Action:** Click submit button
**Expected:**
- Multiple error messages displayed
- Error container shows all errors
- Focus moves to first error field

**Pass/Fail:** ___

---

## ACCESSIBILITY TESTS

### Test Case 9.1: Aria-Required on Email
**Setup:** Inspect email input with DevTools
**Action:** Check for aria-required attribute
**Expected:**
- aria-required="true" present
- Screen readers announce "required"

**Pass/Fail:** ___

### Test Case 9.2: Required Indicator Visual
**Setup:** Look at email field label
**Action:** Check for * indicator
**Expected:**
- Red asterisk (*) visible next to "Email Address"
- Indicates required field

**Pass/Fail:** ___

### Test Case 9.3: Error Messages in Aria-Live
**Setup:** Open DevTools
**Action:** Look for aria-live regions in error messages
**Expected:**
- Error container has aria-live="assertive"
- Screen readers announce errors immediately

**Pass/Fail:** ___

### Test Case 9.4: Aria-Invalid on Error
**Setup:** Enter invalid email
**Action:** Blur field
**Expected:**
- aria-invalid="true" on input
- aria-invalid removed when corrected

**Pass/Fail:** ___

### Test Case 9.5: Character Counter Aria-Live
**Setup:** Type in medications textarea
**Action:** Watch counter with screen reader
**Expected:**
- aria-live="polite" on counter
- Screen reader announces count updates

**Pass/Fail:** ___

### Test Case 9.6: Focus Management on Error
**Setup:** Leave email empty, try to submit
**Action:** Observe focus
**Expected:**
- Focus automatically moves to email field
- User can immediately see and fix error

**Pass/Fail:** ___

### Test Case 9.7: Tab Navigation
**Setup:** Use Tab key to navigate form
**Action:** Press Tab repeatedly through all fields
**Expected:**
- Logical tab order through all inputs
- No fields skipped
- Focus visible on all interactive elements

**Pass/Fail:** ___

---

## MOBILE RESPONSIVENESS

### Test Case 10.1: Form Displays Correctly on Mobile (375px)
**Setup:** Resize browser to 375px width
**Action:** View form
**Expected:**
- All fields visible (no horizontal scroll)
- Labels readable
- Inputs large enough to tap (min 44px height)
- Text doesn't overlap

**Pass/Fail:** ___

### Test Case 10.2: Email Input Has Sufficient Touch Target
**Setup:** View on mobile (375px)
**Action:** Try to tap email field
**Expected:**
- Input has min-height: 44px
- Easy to tap without missing
- Touch area is sufficient

**Pass/Fail:** ___

### Test Case 10.3: Textareas Are Full Width on Mobile
**Setup:** View medications textarea on mobile
**Action:** Check width
**Expected:**
- Width: 100% (full width with padding)
- Doesn't overflow horizontally

**Pass/Fail:** ___

### Test Case 10.4: Error Messages Visible on Mobile
**Setup:** Trigger error on mobile (375px)
**Action:** Look at error display
**Expected:**
- Error messages visible
- Not cut off by screen
- Text readable

**Pass/Fail:** ___

### Test Case 10.5: Character Counter Visible on Mobile
**Setup:** Type in textarea on mobile
**Action:** Look at counter
**Expected:**
- Counter visible below textarea
- Not overlapped by keyboard
- Readable font size

**Pass/Fail:** ___

---

## BROWSER COMPATIBILITY

### Test Case 11.1: Chrome/Edge
**Setup:** Open in Chrome or Edge
**Action:** Run all validation tests
**Expected:**
- All validations work
- No console errors
- Visual feedback displays correctly

**Pass/Fail:** ___

### Test Case 11.2: Safari Desktop
**Setup:** Open in Safari
**Action:** Run email validation
**Expected:**
- Email validation works
- Green checkmark shows
- Red borders appear on error

**Pass/Fail:** ___

### Test Case 11.3: Safari iOS (Mobile)
**Setup:** Open on iPhone/iPad Safari
**Action:** Test email and textarea fields
**Expected:**
- Validation works
- Character counter updates
- Keyboard doesn't cover errors

**Pass/Fail:** ___

### Test Case 11.4: Firefox
**Setup:** Open in Firefox
**Action:** Run all validation tests
**Expected:**
- All validations work
- Number input spinners removed
- Focus states visible

**Pass/Fail:** ___

---

## CONDITIONAL LOGIC

### Test Case 12.1: Deficit Field - Hidden When Goal = Maintain
**Setup:** Select "Maintain" goal
**Action:** Look at form
**Expected:**
- Deficit percentage field hidden (display: none)
- Field not required
- Value cleared

**Pass/Fail:** ___

### Test Case 12.2: Deficit Field - Shown When Goal = Lose
**Setup:** Select "Fat Loss" goal
**Action:** Look at form
**Expected:**
- Deficit percentage field visible
- Field becomes required
- Can select 15%, 20%, or 25%

**Pass/Fail:** ___

### Test Case 12.3: Deficit Field - Shown When Goal = Gain
**Setup:** Select "Muscle Gain" goal
**Action:** Look at form
**Expected:**
- Deficit percentage field visible
- Field becomes required
- Can select 15%, 20%, or 25%

**Pass/Fail:** ___

### Test Case 12.4: Deficit Field - Toggling Goal Changes Visibility
**Setup:** Start with "Maintain", then change to "Lose"
**Action:** Watch deficit field
**Expected:**
- Field smoothly appears (no animation, just display change)
- Field becomes required
- Can now select value

**Pass/Fail:** ___

---

## DATA SANITIZATION

### Test Case 13.1: Email - Trimmed
**Setup:** Type " test@example.com " (with spaces)
**Action:** Submit form
**Expected:**
- Leading/trailing spaces removed
- Email stored as "test@example.com"

**Pass/Fail:** ___

### Test Case 13.2: First Name - Trimmed
**Setup:** Type " John " (with spaces)
**Action:** Submit form
**Expected:**
- Spaces trimmed
- Stored as "John"

**Pass/Fail:** ___

### Test Case 13.3: Medications - Multiple Line Breaks Collapsed
**Setup:** Type text with 5+ consecutive line breaks
**Action:** Submit form
**Expected:**
- Multiple line breaks collapsed to max 2
- Whitespace normalized

**Pass/Fail:** ___

### Test Case 13.4: Medications - Control Characters Removed
**Setup:** Type content with null bytes or control chars (if possible)
**Action:** Submit form
**Expected:**
- Control characters removed
- Content sanitized

**Pass/Fail:** ___

---

## Edge Cases

### Test Case 14.1: Rapid Email Changes
**Setup:** Type email character by character rapidly
**Action:** Type "test@example.com" quickly
**Expected:**
- Validation keeps up
- No lag in visual feedback
- Green checkmark appears at correct time

**Pass/Fail:** ___

### Test Case 14.2: Copy/Paste Email
**Setup:** Copy valid email, paste into field
**Action:** Paste "user@example.com"
**Expected:**
- Validation triggers on paste
- Green checkmark appears
- Form can submit

**Pass/Fail:** ___

### Test Case 14.3: Paste Text in Textarea
**Setup:** Copy large text (3000 chars)
**Action:** Paste into medications textarea
**Expected:**
- Text accepted
- Character counter updates
- Shows "3000 / 5000"

**Pass/Fail:** ___

### Test Case 14.4: Refresh After Partial Fill
**Setup:** Fill some fields
**Action:** Refresh page (F5)
**Expected:**
- Form clears (no persistence)
- Returns to initial state
- All validation resets

**Pass/Fail:** ___

### Test Case 14.5: Submit Multiple Times
**Setup:** Fill valid form, submit
**Action:** If form re-displays, try to submit again
**Expected:**
- Second submission also validates
- No duplicate submission if prevented

**Pass/Fail:** ___

---

## Console Testing

### Test Case 15.1: No Console Errors on Load
**Setup:** Open DevTools Console
**Action:** Load page
**Expected:**
- No red errors in console
- validation.js loads successfully
- No warnings about missing elements

**Pass/Fail:** ___

### Test Case 15.2: No Console Errors on Validation
**Setup:** Open DevTools Console
**Action:** Trigger validations (invalid email, etc.)
**Expected:**
- No console errors
- No JavaScript exceptions
- Clean console output

**Pass/Fail:** ___

### Test Case 15.3: Validation Functions Exported
**Setup:** Open Console, type: `window.validateEmail`
**Action:** Check if function available
**Expected:**
- Function should be available for testing
- Can call validation functions directly

**Pass/Fail:** ___

---

## Summary Checklist

### Email Validation
- [ ] Empty email blocked
- [ ] Invalid formats blocked
- [ ] Valid email accepted
- [ ] Real-time feedback works
- [ ] Green checkmark shows
- [ ] Red error shows
- [ ] Form gates on email

### Name Fields
- [ ] Optional (empty valid)
- [ ] Max 100 chars enforced
- [ ] Accents accepted
- [ ] Special chars (hyphens, apostrophes) accepted
- [ ] Numbers rejected

### Textareas (9 fields)
- [ ] Character counters show
- [ ] Real-time counter updates
- [ ] Warnings at 90% capacity
- [ ] Max length enforced
- [ ] Line breaks allowed
- [ ] Optional fields valid when empty

### Dropdowns (7 fields)
- [ ] Optional (empty valid)
- [ ] All ENUM values accepted
- [ ] Invalid values rejected

### Checkbox Arrays (3 fields)
- [ ] 0 selections valid
- [ ] Multiple selections valid
- [ ] All selections valid
- [ ] No errors for optional fields

### Form Submission
- [ ] Email required to submit
- [ ] Optional fields don't block
- [ ] Error messages appear
- [ ] Multiple errors show together
- [ ] Focus moves to first error

### Accessibility
- [ ] aria-required on email
- [ ] aria-invalid on errors
- [ ] aria-live on errors
- [ ] Focus management works
- [ ] Tab navigation works

### Mobile
- [ ] Responsive to 375px width
- [ ] No horizontal scroll
- [ ] Touch targets 44px+
- [ ] Errors visible
- [ ] Counters visible

### Browsers
- [ ] Chrome/Edge works
- [ ] Safari desktop works
- [ ] Safari iOS works
- [ ] Firefox works

---

## Test Results Summary

**Total Tests:** 135+
**Passed:** ___
**Failed:** ___
**Blocked:** ___

**Notes:**
[Space for tester notes]

---

## Sign-Off

**Tested By:** [Name]
**Date:** [Date]
**Status:** [ ] PASS [ ] FAIL [ ] PARTIAL

**Comments:**
[Space for comments]

---

**Next Step:** If all tests pass, proceed to Step 6 (Form Submission & Payment Integration)
