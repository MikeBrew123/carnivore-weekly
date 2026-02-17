# Forms Evolution Archive

## Calculator Form Architecture

Multi-step form with React components in `calculator2-demo/`.

### Form Steps

**Step 1 — Physical Stats**: Age, weight, height, gender, activity level
**Step 2 — Lifestyle & Diet**: Diet experience, goals, meal frequency
**Step 3 — Health Profile**: Medications (textarea), health conditions (6 checkboxes), symptoms (textarea)
**Step 4 — Results**: Calculated macros + Stripe CTA

### Component Structure

```
src/components/calculator/steps/
├── Step1PhysicalStats.tsx
├── Step2Lifestyle.tsx
├── Step3Diet.tsx
├── Step4HealthProfile.tsx
└── Results.tsx
```

### Form Validation

- All health fields optional (no required validation)
- Textareas: max 5000 chars, 4 rows
- Checkboxes: multi-select (0 or more)
- All inputs: full-width, 44px+ touch targets, visible focus rings
- `<select>` elements use `.selectOption()`, inputs use `.fill()`, radios use `.click()`

### Visual Standards

- Brand colors: heading #ffd700, background #F2F0E6
- Responsive: tested at 375px, 768px, 1400px
- No horizontal scroll at any viewport
- All interactive elements accessible via keyboard

### State Management

- Form data preserved in component state across step navigation
- Session ID generated on first interaction
- Back/forward navigation preserves all entered data
- Payment modal captures name + email before Stripe redirect
