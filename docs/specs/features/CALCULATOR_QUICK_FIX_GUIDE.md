# Calculator Brand Fixes - Quick Implementation Guide
## Fast Track to Production-Ready Visual Compliance

**Time Estimate:** 2-3 hours for all fixes
**Difficulty:** Intermediate (copy-paste friendly)
**Owner:** Alex (code) + Casey (visual validation)

---

## QUICK WINS (Do These First)

### Fix 1: Create Tailwind Config (5 min)
**File:** `/calculator2-demo/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          'cream': '#F2F0E6',
          'dark': '#1a120b',
          'gold': '#ffd700',
          'tan': '#d4a574',
          'mahogany': '#6A1B1B',
          'mahogany-light': '#8A2B2B',
          'text-muted': '#666666',
        },
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'body': ['Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

---

### Fix 2: Create PostCSS Config (5 min)
**File:** `/calculator2-demo/postcss.config.js`

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  }
}
```

---

### Fix 3: Update App.tsx (10 min)
**File:** `/calculator2-demo/src/App.tsx`

**Change this (lines 65, 81):**
```typescript
// BEFORE - WRONG
<div className="min-h-screen bg-gray-50 flex items-center justify-center">
<div className="min-h-screen bg-gray-50">

// AFTER - CORRECT
<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F2F0E6' }}>
<div className="min-h-screen" style={{ backgroundColor: '#F2F0E6' }}>
```

---

## BRAND COMPONENT TEMPLATES (Copy-Paste Ready)

### BrandButton.tsx
**File:** `/calculator2-demo/src/components/ui/BrandButton.tsx`

```typescript
import React from 'react'

export interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function BrandButton({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: BrandButtonProps) {
  const baseStyles = 'font-semibold rounded-lg transition-colors min-h-[44px] min-w-[44px]'

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const variantStyles = {
    primary: 'bg-brand-mahogany text-white hover:bg-brand-mahogany-light active:bg-brand-mahogany',
    secondary: 'border-2 border-brand-mahogany text-brand-mahogany hover:bg-brand-mahogany/10',
    text: 'text-brand-tan hover:text-brand-gold',
  }

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      style={{
        fontFamily: 'Merriweather, serif',
      }}
      {...props}
    >
      {children}
    </button>
  )
}
```

---

### BrandInput.tsx
**File:** `/calculator2-demo/src/components/ui/BrandInput.tsx`

```typescript
import React from 'react'

export interface BrandInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function BrandInput({
  label,
  error,
  className = '',
  ...props
}: BrandInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          className="block text-sm font-semibold mb-2"
          style={{
            color: '#1a120b',
            fontFamily: 'Merriweather, serif',
          }}
        >
          {label}
        </label>
      )}
      <input
        className={`w-full px-4 py-3 rounded-lg transition-all ${className}`}
        style={{
          backgroundColor: '#F2F0E6',
          color: '#1a120b',
          border: `2px solid ${error ? '#d32f2f' : '#d4a574'}`,
          fontFamily: 'Merriweather, serif',
          fontSize: '16px',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? '#d32f2f' : '#ffd700'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#d32f2f' : '#d4a574'
        }}
        {...props}
      />
      {error && (
        <span
          className="text-xs mt-1 block"
          style={{
            color: '#d32f2f',
            fontFamily: 'Merriweather, serif',
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
```

---

### BrandSelect.tsx
**File:** `/calculator2-demo/src/components/ui/BrandSelect.tsx`

```typescript
import React from 'react'

export interface BrandSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: Array<{ value: string; label: string }>
  error?: string
}

export function BrandSelect({
  label,
  options,
  error,
  className = '',
  ...props
}: BrandSelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          className="block text-sm font-semibold mb-2"
          style={{
            color: '#1a120b',
            fontFamily: 'Merriweather, serif',
          }}
        >
          {label}
        </label>
      )}
      <select
        className={`w-full px-4 py-3 rounded-lg transition-all ${className}`}
        style={{
          backgroundColor: '#F2F0E6',
          color: '#1a120b',
          border: `2px solid ${error ? '#d32f2f' : '#d4a574'}`,
          fontFamily: 'Merriweather, serif',
          fontSize: '16px',
          cursor: 'pointer',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? '#d32f2f' : '#ffd700'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? '#d32f2f' : '#d4a574'
        }}
        {...props}
      >
        <option value="">Select an option...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <span
          className="text-xs mt-1 block"
          style={{
            color: '#d32f2f',
            fontFamily: 'Merriweather, serif',
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}
```

---

## GLOBAL STYLES UPDATE

**File:** `/calculator2-demo/src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Merriweather:wght@400;500;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* Brand Color Variables */
:root {
  --brand-cream: #F2F0E6;
  --brand-dark: #1a120b;
  --brand-gold: #ffd700;
  --brand-tan: #d4a574;
  --brand-mahogany: #6A1B1B;
  --brand-mahogany-light: #8A2B2B;
  --brand-text-muted: #666666;
}

@layer base {
  body {
    background-color: var(--brand-cream);
    color: var(--brand-dark);
    font-family: 'Merriweather', Georgia, serif;
    line-height: 1.6;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Playfair Display', Georgia, serif;
    color: var(--brand-gold);
    font-weight: 700;
  }

  h1 { font-size: 2.25rem; font-weight: 900; }
  h2 { font-size: 1.875rem; font-weight: 700; }
  h3 { font-size: 1.5rem; font-weight: 700; }

  a {
    color: var(--brand-tan);
    text-decoration: none;
    transition: color 0.3s ease;
  }

  a:hover {
    color: var(--brand-gold);
  }

  button, [role="button"] {
    min-height: 44px;
    min-width: 44px;
  }
}

@layer components {
  .input-field {
    @apply w-full px-4 py-3 rounded-lg transition-all;
    background-color: var(--brand-cream);
    color: var(--brand-dark);
    border: 2px solid var(--brand-tan);
    font-family: 'Merriweather', serif;
  }

  .input-field:focus {
    border-color: var(--brand-gold);
    outline: none;
  }

  .btn-primary {
    @apply px-6 py-3 rounded-lg font-semibold transition-colors;
    background-color: var(--brand-mahogany);
    color: var(--brand-cream);
  }

  .btn-primary:hover {
    background-color: var(--brand-mahogany-light);
  }

  .btn-secondary {
    @apply px-6 py-3 rounded-lg font-semibold transition-all;
    border: 2px solid var(--brand-mahogany);
    color: var(--brand-mahogany);
    background-color: transparent;
  }

  .btn-secondary:hover {
    background-color: rgba(106, 27, 27, 0.1);
  }

  .form-section {
    @apply p-6 rounded-lg;
    background-color: var(--brand-cream);
    border: 1px solid var(--brand-tan);
  }
}
```

---

## FIND & REPLACE CHEATSHEET

After fixing the 3 critical files above, search-and-replace in all component files:

| Find | Replace | Files |
|------|---------|-------|
| `bg-gray-50` | `bg-brand-cream` or inline `#F2F0E6` | All components |
| `bg-gray-100` | `bg-brand-cream` | All components |
| `bg-gray-200` | `bg-brand-cream` | All components |
| `text-gray-900` | `text-brand-dark` | All components |
| `text-gray-700` | `text-brand-dark` | All components |
| `border-gray-300` | `border-brand-tan` | All components |
| `border-gray-200` | `border-brand-tan` | All components |
| `bg-blue-*` | `bg-brand-mahogany` | Button files |
| `hover:bg-blue-*` | `hover:bg-brand-mahogany-light` | Button files |

---

## COMPONENT USAGE EXAMPLES

### Using BrandButton
```typescript
import { BrandButton } from '../ui/BrandButton'

export function MyComponent() {
  return (
    <div>
      <BrandButton variant="primary">Continue</BrandButton>
      <BrandButton variant="secondary">Cancel</BrandButton>
      <BrandButton variant="text">Learn More</BrandButton>
    </div>
  )
}
```

### Using BrandInput
```typescript
import { BrandInput } from '../ui/BrandInput'

export function FormStep() {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  return (
    <BrandInput
      label="Full Name"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      error={error}
      placeholder="Enter your name"
    />
  )
}
```

### Using BrandSelect
```typescript
import { BrandSelect } from '../ui/BrandSelect'

export function FormStep() {
  const [value, setValue] = useState('')

  return (
    <BrandSelect
      label="Activity Level"
      options={[
        { value: 'sedentary', label: 'Sedentary' },
        { value: 'light', label: 'Light Activity' },
        { value: 'moderate', label: 'Moderate Activity' },
      ]}
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  )
}
```

---

## VALIDATION CHECKLIST (After Fixes)

- [ ] `tailwind.config.ts` created with brand colors
- [ ] `postcss.config.js` created
- [ ] `index.css` updated with brand color variables
- [ ] `App.tsx` background colors fixed (no bg-gray-50)
- [ ] `BrandButton.tsx` created and used
- [ ] `BrandInput.tsx` created and used
- [ ] `BrandSelect.tsx` created and used
- [ ] All gray color classes replaced
- [ ] All button components use brand mahogany
- [ ] All form inputs use brand colors
- [ ] No console errors (`npm run dev` console clean)
- [ ] Mobile responsive (375px width test)
- [ ] Desktop responsive (1400px width test)
- [ ] Colors verified with color picker (exact hex matches)
- [ ] Fonts verified (Playfair for headings, Merriweather for body)
- [ ] Lighthouse score ≥ 90

---

## TESTING COMMANDS

```bash
# Start dev server
cd /calculator2-demo
npm run dev

# In browser console, check colors:
document.body.style.backgroundColor  # Should be rgb(242, 240, 230) or #F2F0E6
document.body.style.color            # Should be rgb(26, 18, 11) or #1a120b

# Check fonts loaded:
window.getComputedStyle(document.querySelector('h1')).fontFamily
# Should include 'Playfair Display'

window.getComputedStyle(document.querySelector('p')).fontFamily
# Should include 'Merriweather'

# Run validation
npm run build  # Ensure no build errors
```

---

## DEPLOYMENT GATE

**Do NOT deploy until:**
1. All 3 critical files created/updated
2. All brand components created
3. All gray color classes replaced
4. No console errors in dev
5. Colors match brand palette (visual inspection)
6. Fonts render correctly
7. Mobile responsive (no horizontal scroll)
8. Jordan approves validation report

---

**Time Estimate Summary:**
- Tailwind config: 5 min
- PostCSS config: 5 min
- Update App.tsx: 10 min
- Create BrandButton: 15 min
- Create BrandInput: 15 min
- Create BrandSelect: 15 min
- Update index.css: 10 min
- Replace color classes: 30 min
- Testing & tweaks: 30 min
- **Total: ~2.5 hours**

---

**Questions?** See CALCULATOR_BRAND_VALIDATION_REQUIREMENTS.md for full details.
