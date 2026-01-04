# STEP 5: Validation Logic - Quick Start

## What's Done

Validation logic for all 22 form fields is complete and ready for testing.

## Files Created

1. `/public/validation.js` (15 KB) - Validation engine
2. `/public/calculator-form-rebuild.html` (39 KB) - Updated with validation
3. `/docs/VALIDATION_TEST_PLAN.md` - 135+ test cases
4. `/docs/VALIDATION_IMPLEMENTATION_GUIDE.md` - Technical reference
5. `/docs/STEP5_COMPLETION_REPORT.md` - Completion summary

## Quick Test

Open form in browser: `/public/calculator-form-rebuild.html`

### Test Email Validation
1. Leave email blank, try to submit → Error: "Please enter an email address"
2. Type "notanemail", blur field → Error: "Please enter a valid email address"
3. Type "test@example.com", blur field → Green checkmark appears
4. Try to submit with valid email → Form accepts (if other required fields filled)

### Test Character Counter
1. Find "Medications" textarea
2. Start typing → Counter shows "1 / 5000", updates in real-time
3. When you reach 4500+ chars → Counter turns orange (warning)
4. Try to type beyond 5000 → HTML prevents entry

### Test Optional Fields
1. Leave all optional fields blank
2. Fill email with valid address
3. Try to submit → Form accepts (no errors for empty optional fields)

## How Email Field Works

- **REQUIRED** - Only blocking field
- Real-time validation on blur + input
- Green border + ✓ checkmark = Valid
- Red border + ✗ = Invalid
- Form cannot submit without valid email

## How Textareas Work (9 total)

1. Medications (5000 chars)
2. Allergies (5000 chars)
3. Avoid Foods (5000 chars)
4. Previous Diets (5000 chars)
5. What Worked (5000 chars)
6. Biggest Challenge (5000 chars)
7. Additional Notes (5000 chars)
8. Other Conditions (500 chars)
9. Other Symptoms (500 chars)

All have:
- Live character counter: "X / MAX"
- Warning at 90% capacity (orange text)
- Optional (can be empty)
- Sanitized on submit

## How Dropdowns Work (7 total)

1. Dairy Tolerance (none, butter-only, some, full)
2. Carnivore Experience (new, weeks, months, years)
3. Cooking Skill (beginner, intermediate, advanced)
4. Meal Prep Time (none, minimal, some, extensive)
5. Budget (tight, moderate, comfortable)
6. Family Situation (single, partner, kids, extended)
7. Work/Travel (office, remote, frequent_travel, variable)

All are:
- Optional (can be empty)
- Restricted to exact ENUM values
- No validation errors possible (HTML prevents invalid selection)

## How Checkboxes Work (3 arrays)

1. **Conditions** - 6+ checkboxes, select 0-N, optional
2. **Symptoms** - 7+ checkboxes, select 0-N, optional
3. **Health Goals** - 14 checkboxes, select 0-N, optional

All are:
- Optional (0 selections valid)
- No validation errors (0-N all valid)
- Collected as array on submit

## How Name Fields Work

- First Name (optional, max 100 chars)
- Last Name (optional, max 100 chars)

Rules:
- Optional (can be empty)
- Letters, hyphens, apostrophes, spaces only
- International characters supported (José, Müller, etc.)
- Max 100 characters
- Validated on form submit
- No real-time validation (too intrusive)

## Conditional Logic

**Deficit Percentage field** shows/hides based on Goal:

- Select "Maintain" → Field hides
- Select "Fat Loss" or "Muscle Gain" → Field shows
- Field becomes required when shown
- Field is cleared when hidden

## Testing

### Run All Tests
Open `/docs/VALIDATION_TEST_PLAN.md`
Contains 135+ test cases:
- Email validation (8 tests)
- Name fields (18 tests)
- Textareas (15 tests)
- Checkboxes (7 tests)
- Dropdowns (10 tests)
- Goals (4 tests)
- Submission (5 tests)
- Accessibility (7 tests)
- Mobile (5 tests)
- Browser compat (4 tests)
- Conditional (4 tests)
- Sanitization (4 tests)
- Edge cases (5 tests)
- Console (3 tests)

Each test includes:
- Setup instructions
- Expected results
- Pass/Fail checkbox

### Console Testing
Open DevTools (F12), go to Console tab:

```javascript
// Test email validation
validateEmail("test@example.com")
// { valid: true, error: null }

validateEmail("invalid")
// { valid: false, error: "..." }

// Test name validation
validateName("John", "first_name")
// { valid: true, error: null }

// Test sanitization
sanitizeText("  hello\n\n\n\nworld  ")
// "hello\n\nworld"
```

## Accessibility Features

- Required indicator (*) on email field
- aria-required="true" on email
- aria-invalid on fields with errors
- aria-live regions for error messages
- Focus management (focus → first error on submit)
- Color + text feedback (not color-only)
- Keyboard navigation works (Tab key)

## Mobile Testing

Form is responsive to 375px+ screens:
- No horizontal scroll
- Touch targets >= 44px
- Error messages visible
- Character counters visible
- Keyboard doesn't cover inputs

Test sizes:
- Mobile: 375px (iPhone SE)
- Tablet: 768px (iPad)
- Desktop: 1400px+

## Validation Rules Summary

| Field | Required | Max Length | Type | Real-Time | Gate |
|-------|----------|-----------|------|-----------|------|
| Email | YES | 255 | Text | YES | YES |
| First Name | NO | 100 | Text | NO | NO |
| Last Name | NO | 100 | Text | NO | NO |
| Medications | NO | 5000 | Textarea | NO | NO |
| Conditions | NO | - | Array | NO | NO |
| Other Conditions | NO | 500 | Textarea | NO | NO |
| Symptoms | NO | - | Array | NO | NO |
| Other Symptoms | NO | 500 | Textarea | NO | NO |
| Allergies | NO | 5000 | Textarea | NO | NO |
| Avoid Foods | NO | 5000 | Textarea | NO | NO |
| Dairy Tolerance | NO | - | Dropdown | NO | NO |
| Previous Diets | NO | 5000 | Textarea | NO | NO |
| What Worked | NO | 5000 | Textarea | NO | NO |
| Carnivore Exp | NO | - | Dropdown | NO | NO |
| Cooking Skill | NO | - | Dropdown | NO | NO |
| Meal Prep Time | NO | - | Dropdown | NO | NO |
| Budget | NO | - | Dropdown | NO | NO |
| Family Sit | NO | - | Dropdown | NO | NO |
| Work/Travel | NO | - | Dropdown | NO | NO |
| Health Goals | NO | - | Array | NO | NO |
| Biggest Chall | NO | 5000 | Textarea | NO | NO |
| Add'l Notes | NO | 5000 | Textarea | NO | NO |

## Common Issues

### "Email is required" error shows when email is valid

**Fix:** Clear field and re-type. Validation should trigger on blur.

### Character counter not showing

**Check:** Is counter span created? Open DevTools, look for element with id="medications-count"

### Validation script not loading

**Check:** Is validation.js in /public/ directory? Is script tag in HTML?

### Form submits without validation

**Check:** Is form id="calculator-form"? Verify validation.js loaded (Console tab should show no errors).

## Next Steps

1. Run all 135+ tests from VALIDATION_TEST_PLAN.md
2. Document results
3. When ready, proceed to Step 6 (Form Submission & Payment)

---

**Status:** Ready for Testing
**Date:** 2026-01-03

All validation logic is complete. Form is ready for testing and Step 6 integration.
