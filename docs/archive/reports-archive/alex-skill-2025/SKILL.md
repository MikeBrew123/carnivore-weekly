---
name: modern-forms
description: Comprehensive guide for building web forms in 2026 with modern HTML5, React, and Tailwind. Use this skill when creating any form — calculators, signups, contact forms, multi-step wizards, payment forms. Emphasizes incremental building (container → form → fields), accessibility for 30-60 age demographic, mobile-first responsive design, validation patterns, and API integration. Prevents common issues like forms breaking out of containers.
---

# Modern Forms Skill (2026)

Build robust, accessible, mobile-friendly web forms that don't break.

## Critical Rule: Build Incrementally

**The #1 cause of broken forms is building too much at once.**

ALWAYS build forms in this order, verifying each step renders correctly:

```
Step 1: Container only     → Verify it renders
Step 2: Empty <form> tag   → Verify it's INSIDE container  
Step 3: One field          → Verify layout works
Step 4: Add fields one-by-one
Step 5: Add validation
Step 6: Add submission logic
```

**NEVER:**
- Build the entire form in one pass
- Copy broken code and try to fix it
- Add submission logic before the form renders correctly
- Skip the "verify it's inside the container" step

## Form Building Workflow

### Step 1: Create the Container

Start with JUST the container. Add a visible border so you can confirm it renders:

```jsx
// React/Next.js
export default function CalculatorForm() {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md border-2 border-red-500">
      {/* Temporary red border to verify container renders */}
      <h2 className="text-2xl font-bold mb-4">Calculator</h2>
      {/* Form will go here */}
    </div>
  );
}
```

```html
<!-- Vanilla HTML -->
<div class="form-container" style="max-width: 400px; margin: 0 auto; padding: 24px; border: 2px solid red;">
  <h2>Calculator</h2>
  <!-- Form will go here -->
</div>
```

**STOP. Verify the container renders in the correct position before continuing.**

### Step 2: Add Empty Form Tag

Add the form element inside the container:

```jsx
export default function CalculatorForm() {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Calculator</h2>
      <form onSubmit={(e) => e.preventDefault()}>
        {/* Fields will go here */}
        <p className="text-gray-500">Form shell ready</p>
      </form>
    </div>
  );
}
```

**STOP. Verify the form is INSIDE the container, not breaking out.**

### Step 3: Add First Field

Add one input field with proper structure:

```jsx
<form onSubmit={(e) => e.preventDefault()}>
  <div className="mb-4">
    <label htmlFor="weight" className="block text-sm font-medium mb-1">
      Weight (lbs)
    </label>
    <input
      type="number"
      id="weight"
      name="weight"
      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500"
      required
    />
  </div>
</form>
```

**STOP. Verify the field renders inside the container before adding more.**

### Step 4: Add Remaining Fields

Now add remaining fields one at a time. See `references/field-patterns.md` for each input type.

### Step 5: Add Validation

See `references/validation.md` for validation patterns.

### Step 6: Add Submission Logic

Only after the form renders and validates correctly, add API submission.

See `references/submission.md` for API integration patterns.

---

## Quick Reference: Form Container Patterns

### Centered Card (Most Common)

```jsx
<div className="min-h-screen bg-gray-100 py-12 px-4">
  <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
    <form>...</form>
  </div>
</div>
```

### Bento Grid Card

```jsx
<div className="col-span-2 row-span-2 bg-white rounded-xl p-6 shadow-sm">
  <form>...</form>
</div>
```

### Full-Width Section

```jsx
<section className="w-full max-w-2xl mx-auto px-4 py-8">
  <form>...</form>
</section>
```

### Modal/Overlay Form

```jsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
  <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
    <form>...</form>
  </div>
</div>
```

---

## Accessibility Requirements (30-60 Age Demo)

| Element | Minimum | Recommended |
|---------|---------|-------------|
| Label text | 14px | 16px |
| Input text | 16px | 18px |
| Input height | 44px | 48px |
| Touch targets | 44×44px | 48×48px |
| Contrast ratio | 4.5:1 | 7:1 |
| Focus indicator | 2px ring | 3px ring |

### Always Include

```jsx
// Every input MUST have a visible label
<label htmlFor="email" className="block text-base font-medium mb-1">
  Email Address
</label>
<input
  type="email"
  id="email"
  name="email"
  // Large enough touch target
  className="w-full px-4 py-3 text-lg border-2 rounded-md 
             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  // Helpful for mobile
  autoComplete="email"
  inputMode="email"
/>
```

---

## Mobile-First Patterns

### Responsive Form Container

```jsx
<div className="w-full px-4 sm:max-w-md sm:mx-auto">
  <form className="space-y-4">
    {/* Fields stack vertically on mobile, can go side-by-side on larger screens */}
  </form>
</div>
```

### Side-by-Side Fields (Desktop Only)

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div>
    <label>First Name</label>
    <input />
  </div>
  <div>
    <label>Last Name</label>
    <input />
  </div>
</div>
```

### Mobile Keyboard Optimization

```jsx
// Numeric input (for weight, age, etc.)
<input type="number" inputMode="decimal" />

// Phone number
<input type="tel" inputMode="tel" autoComplete="tel" />

// Email
<input type="email" inputMode="email" autoComplete="email" />

// Search
<input type="search" inputMode="search" />
```

---

## Troubleshooting Common Issues

### Form Breaking Out of Container

**Symptom:** Form or fields render outside their parent container

**Causes:**
1. Missing `w-full` on inputs (they overflow)
2. Flexbox/grid issue on parent
3. Absolute positioning somewhere
4. Form rendered at wrong level in component tree

**Fix:**
```jsx
// Ensure all inputs are constrained to container width
<input className="w-full max-w-full ..." />

// Ensure container has overflow handling
<div className="overflow-hidden ...">
  <form>...</form>
</div>
```

### Form Renders But Doesn't Submit

**Check:**
1. Is there a `<button type="submit">` inside the form?
2. Is `onSubmit` handler attached to `<form>`, not button?
3. Is `e.preventDefault()` being called?

### Fields Not Updating State

**React pattern:**
```jsx
const [formData, setFormData] = useState({ weight: '' });

<input
  value={formData.weight}
  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
/>
```

### Validation Not Showing

**Check:**
1. HTML5 validation: Is `required` attribute present?
2. Custom validation: Is error state being set?
3. Are error messages conditionally rendered?

---

## Files in This Skill

- `references/field-patterns.md` — Every input type with accessible markup
- `references/validation.md` — Client and server validation patterns
- `references/submission.md` — API integration and error handling
- `references/styling.md` — Tailwind form styling patterns
