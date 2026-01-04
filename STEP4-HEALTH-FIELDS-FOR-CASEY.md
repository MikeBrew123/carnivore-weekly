# Step 4 Health Profile Fields - Visual Testing Guide for Casey

**Status:** Ready for Visual Validation
**Build:** Successful (no errors)
**Date:** January 3, 2026

---

## Quick Summary

All 5 health fields have been implemented in Step 4 of the Carnivore Calculator form. Build is clean, types are correct, and the form is ready for visual testing on desktop, tablet, and mobile.

---

## Fields to Test

### 1. Current Medications (Textarea)
**Location:** Health & Medical section, first field

**Visual Requirements:**
- Label text: "Current Medications"
- Placeholder visible: "e.g., Metformin, Lisinopril, etc."
- Height: 4 rows (approximately 96px)
- Full width of container
- Help text below: "Optional - Helps us provide safe dietary recommendations"
- Focus ring visible when clicked (blue border with shadow effect)

**Interactions to Test:**
- Click inside textarea - focus ring should appear
- Type text - text should wrap properly
- Try pasting ~5000 chars - should accept without truncating
- Resize handle should be visible at bottom-right (browser default)

---

### 2. Health Conditions (Checkboxes)
**Location:** Health & Medical section, second field

**Visual Requirements:**
- Label text: "Health Conditions (select all that apply)"
- 6 checkbox options stacked vertically:
  1. Diabetes
  2. Heart Disease
  3. Thyroid Disorder
  4. PCOS
  5. Joint Pain/Arthritis
  6. None of the above
- Help text below: "Optional - Select all that apply"
- Checkbox size: 20px square
- Checkbox color: Blue when selected (#2563eb or similar)
- Label text clickable with checkbox
- Total click area: 44px+ height (checkbox + label + spacing)

**Interactions to Test:**
- Click the checkbox itself - should toggle
- Click the label text - should toggle the checkbox
- Select multiple options - all should show checked
- Visual feedback on selection (checkmark should appear)
- Tab through checkboxes - focus ring should be visible on each
- On mobile (375px): checkboxes should not wrap awkwardly

---

### 3. Other Conditions (Text Input)
**Location:** Health & Medical section, immediately after checkboxes

**Visual Requirements:**
- Label text: "Other Conditions"
- Placeholder text: "Specify others not listed above"
- Single line text input
- Full width
- Height: standard input height (~44px)
- No help text for this field

**Interactions to Test:**
- Click input - focus ring should appear
- Type text - should display normally
- On 375px mobile: should remain full width, not break layout

---

### 4. Current Symptoms (Textarea)
**Location:** Health & Medical section, below "Other Conditions"

**Visual Requirements:**
- Label text: "Current Symptoms"
- Placeholder visible: "e.g., fatigue, brain fog, joint pain, etc."
- Height: 4 rows (approximately 96px)
- Full width of container
- Help text below: "Optional - Helps us tailor recommendations"
- Focus ring visible when clicked (matching medications field)
- Resizable (browser default resize handle bottom-right)

**Interactions to Test:**
- Click inside textarea - focus ring should appear
- Type text - text should wrap properly
- Test character count near limit (~4500 chars) - should all fit
- Verify resize handle visible and functional

---

### 5. Other Symptoms (Text Input)
**Location:** Health & Medical section, bottom of health fields

**Visual Requirements:**
- Label text: "Other Symptoms"
- Placeholder text: "Specify others not listed above"
- Single line text input
- Full width
- Height: standard input height (~44px)
- No help text for this field

**Interactions to Test:**
- Click input - focus ring should appear
- Type text - should display normally

---

## Viewport Testing

Test at these three widths:

### Desktop (1400px)
- All fields full width
- Good spacing between sections
- No horizontal scroll
- Help text properly positioned below fields
- No layout breaks

### Tablet (768px)
- All fields full width
- Proper spacing maintained
- Checkboxes still vertically stacked
- Focus ring visible at full size
- Text readable without zoom

### Mobile (375px)
- All fields full width (full viewport width - margins)
- Proper margins/padding preserved
- Checkboxes not cramped (44px+ click area maintained)
- Help text readable
- Textareas have proper padding
- No horizontal scroll
- Proper spacing between fields

---

## Focus/Interaction States to Check

For all input fields (textareas and text inputs):
- Focus ring: 2px border, blue color (#2563eb or similar)
- Background: White
- Border: Gray (#d1d5db) normally, blue when focused
- Text color: Dark gray (#111827 or similar)
- Cursor visible and positioned correctly

For checkboxes:
- Checkbox box: 20px square
- Selected: Blue background with white checkmark
- Unselected: White background with gray border
- Hover: Label text should appear slightly darkened or hand cursor
- Focus: Ring should be visible around checkbox

---

## Color Checks

- Labels: Dark gray (should match other form labels)
- Inputs: White background
- Focus rings: Blue (consistent with other form fields)
- Borders: Gray normally, blue when focused
- Help text: Lighter gray (smaller text)
- Error text: Red (if validation was triggered)

---

## Mobile-Specific Checks

At 375px width:
- Entire form section readable without horizontal scrolling
- Touch targets at least 44px (checkboxes + labels)
- Text inputs not cramped
- Textareas have reasonable minimum height
- No overflowing text
- Proper spacing between sections
- Labels properly positioned above inputs

---

## Responsive Behavior

All fields should:
- Scale smoothly between 375px - 1400px
- Maintain readability at all sizes
- Have consistent spacing
- Not have awkward text wrapping
- Maintain focus ring visibility
- Have accessible click/touch targets on mobile

---

## Known Good Behaviors

From the codebase:
- TextArea component handles maxLength gracefully
- CheckboxGroup makes both checkbox and label clickable
- FormField includes error handling (should show red border + error text if validation fails)
- All components use consistent focus ring styling
- Focus ring: `focus:ring-2 focus:ring-blue-500`

---

## What to Look For - Issues

Report if you see:
1. Fields not full-width
2. Placeholder text missing or cut off
3. Help text not visible
4. Focus ring not appearing on any field
5. Checkboxes not clickable via label
6. Text wrapping incorrectly
7. Layout breaking at any viewport
8. Inconsistent spacing between fields
9. Inputs appearing disabled or grayed out
10. Color mismatches with other form fields

---

## Success Criteria

All fields should:
- [x] Render without errors
- [ ] Match existing form field styling
- [ ] Support all required interactions
- [ ] Be fully responsive (375px, 768px, 1400px)
- [ ] Have visible focus states
- [ ] Be accessible (keyboard nav, labels, click targets)
- [ ] Maintain consistent spacing
- [ ] Have no layout breaks

---

## Screenshots to Provide

Please capture:
1. **Desktop (1400px)** - Full health section
2. **Tablet (768px)** - Health section
3. **Mobile (375px)** - Health section (may need scrolling)
4. **Desktop with focus** - One field with focus ring visible
5. **Mobile with checkbox selected** - Show selected state

---

## File Location

Component file: `/Users/mbrew/Developer/carnivore-weekly/calculator2-demo/src/components/calculator/steps/Step4HealthProfile.tsx`

Build output: `/Users/mbrew/Developer/carnivore-weekly/public/assets/calculator2/`

---

## How to Access the Form

The calculator should be accessible at:
- Local: `http://localhost:3000` (if dev server running)
- Production: TBD based on deployment

The Step 4 form appears after completing Steps 1-3.

---

## Questions?

Key implementation details:
- All fields optional (no required validation)
- Textareas have maxLength=5000 (no truncation, browser respects this)
- Checkboxes allow any combination (including 0 selections)
- Focus ring style: `focus:ring-2 focus:ring-blue-500 focus:border-transparent`
- Component spacing: `space-y-6` in health section

---

## Next Steps

After visual validation:
1. Confirm all fields render as expected
2. Report any styling mismatches
3. Test on actual mobile device if possible
4. Provide screenshots for documentation
5. Sign off on visual acceptance

Thank you for the thorough visual testing!
