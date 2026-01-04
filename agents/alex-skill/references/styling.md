# Form Styling Reference

Tailwind CSS patterns for beautiful, accessible forms.

## Table of Contents
1. [Base Input Styles](#base-input-styles)
2. [Input States](#input-states)
3. [Form Layouts](#form-layouts)
4. [Dark Mode](#dark-mode)
5. [Custom Components](#custom-components)
6. [Animation Patterns](#animation-patterns)

---

## Base Input Styles

### The Standard Input

```jsx
// Base input that works for most cases
const baseInputClasses = `
  w-full 
  px-4 py-3 
  text-lg 
  border-2 border-gray-300 
  rounded-md 
  bg-white
  placeholder:text-gray-400
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
  disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed
  transition-colors duration-200
`;

<input type="text" className={baseInputClasses} />
```

### Size Variants

```jsx
// Small
const inputSm = "px-3 py-2 text-base";

// Medium (default)
const inputMd = "px-4 py-3 text-lg";

// Large
const inputLg = "px-5 py-4 text-xl";
```

### Border Styles

```jsx
// Subtle (default)
const borderSubtle = "border-2 border-gray-300 rounded-md";

// Underline only
const borderUnderline = "border-0 border-b-2 border-gray-300 rounded-none px-0";

// Pill
const borderPill = "border-2 border-gray-300 rounded-full px-6";

// No visible border
const borderNone = "border-0 bg-gray-100 rounded-lg";
```

---

## Input States

### Focus State

```jsx
// Default blue focus
const focusDefault = "focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

// Green focus (for valid fields)
const focusValid = "focus:ring-2 focus:ring-green-500 focus:border-green-500";

// Red focus (for invalid fields)
const focusError = "focus:ring-2 focus:ring-red-500 focus:border-red-500";
```

### Error State

```jsx
// Input with error
<input
  className={`
    w-full px-4 py-3 text-lg rounded-md
    border-2 border-red-500
    bg-red-50
    focus:ring-2 focus:ring-red-500 focus:border-red-500
  `}
  aria-invalid="true"
/>

// Error message
<p className="text-red-600 text-sm mt-1 flex items-center gap-1">
  <span>⚠</span>
  <span>This field is required</span>
</p>
```

### Valid State

```jsx
// Input with success indicator
<div className="relative">
  <input
    className={`
      w-full px-4 py-3 pr-10 text-lg rounded-md
      border-2 border-green-500
      focus:ring-2 focus:ring-green-500
    `}
  />
  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
    ✓
  </span>
</div>
```

### Disabled State

```jsx
<input
  disabled
  className={`
    w-full px-4 py-3 text-lg rounded-md
    border-2 border-gray-200
    bg-gray-100 text-gray-500
    cursor-not-allowed
  `}
/>
```

### Loading State (Input)

```jsx
<div className="relative">
  <input
    className="w-full px-4 py-3 pr-10 text-lg border-2 rounded-md"
    disabled
  />
  <div className="absolute right-3 top-1/2 -translate-y-1/2">
    <svg className="animate-spin h-5 w-5 text-gray-400" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" 
              stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  </div>
</div>
```

---

## Form Layouts

### Single Column (Mobile-First)

```jsx
<form className="space-y-4">
  <div>
    <label>Field 1</label>
    <input />
  </div>
  <div>
    <label>Field 2</label>
    <input />
  </div>
  <button type="submit">Submit</button>
</form>
```

### Two Column (Responsive)

```jsx
<form className="space-y-4">
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
  <div>
    <label>Email (full width)</label>
    <input />
  </div>
</form>
```

### Inline Label

```jsx
<div className="flex items-center gap-4">
  <label className="w-24 text-right font-medium">Email</label>
  <input className="flex-1" />
</div>
```

### Floating Label

```jsx
function FloatingInput({ label, ...props }) {
  const [hasValue, setHasValue] = useState(false);
  
  return (
    <div className="relative">
      <input
        {...props}
        className={`
          peer w-full px-4 pt-6 pb-2 text-lg border-2 rounded-md
          placeholder-transparent
          focus:ring-2 focus:ring-blue-500
        `}
        placeholder={label}
        onChange={(e) => setHasValue(e.target.value !== '')}
      />
      <label
        className={`
          absolute left-4 transition-all duration-200 pointer-events-none
          ${hasValue 
            ? 'top-2 text-xs text-blue-600' 
            : 'top-1/2 -translate-y-1/2 text-base text-gray-400'}
          peer-focus:top-2 peer-focus:text-xs peer-focus:text-blue-600
          peer-focus:-translate-y-0
        `}
      >
        {label}
      </label>
    </div>
  );
}
```

### Card Form Container

```jsx
<div className="min-h-screen bg-gray-100 py-12 px-4">
  <div className="max-w-md mx-auto">
    {/* Header outside card */}
    <h1 className="text-3xl font-bold text-center mb-8">
      Macro Calculator
    </h1>
    
    {/* Form card */}
    <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
      <form className="space-y-6">
        {/* Fields */}
      </form>
    </div>
    
    {/* Footer outside card */}
    <p className="text-center text-gray-500 text-sm mt-4">
      Free. No email required.
    </p>
  </div>
</div>
```

---

## Dark Mode

### Dark Mode Input

```jsx
<input
  className={`
    w-full px-4 py-3 text-lg rounded-md
    
    /* Light mode */
    bg-white border-2 border-gray-300 text-gray-900
    placeholder:text-gray-400
    focus:ring-blue-500 focus:border-blue-500
    
    /* Dark mode */
    dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100
    dark:placeholder:text-gray-500
    dark:focus:ring-blue-400 dark:focus:border-blue-400
  `}
/>
```

### Dark Mode Form Card

```jsx
<div className={`
  bg-white dark:bg-gray-900
  border border-gray-200 dark:border-gray-700
  rounded-xl shadow-lg
  p-6
`}>
  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
    Calculator
  </h2>
  <form>
    {/* Dark mode inputs */}
  </form>
</div>
```

### Dark Mode Labels and Text

```jsx
<label className="block text-gray-700 dark:text-gray-200 font-medium mb-1">
  Weight
</label>

<p className="text-gray-500 dark:text-gray-400 text-sm">
  Enter your weight in pounds
</p>

<p className="text-red-600 dark:text-red-400 text-sm">
  This field is required
</p>
```

---

## Custom Components

### Input with Icon

```jsx
<div className="relative">
  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
    📧
  </span>
  <input
    type="email"
    className="w-full pl-10 pr-4 py-3 text-lg border-2 rounded-md"
    placeholder="you@example.com"
  />
</div>
```

### Input with Suffix

```jsx
<div className="relative">
  <input
    type="number"
    className="w-full pl-4 pr-12 py-3 text-lg border-2 rounded-md"
    placeholder="200"
  />
  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">
    lbs
  </span>
</div>
```

### Segmented Control (Radio as Buttons)

```jsx
<div className="flex rounded-lg overflow-hidden border-2 border-gray-300">
  {['Fat Loss', 'Maintain', 'Gain'].map((option, index) => (
    <label
      key={option}
      className={`
        flex-1 text-center py-3 cursor-pointer transition-colors
        ${index !== 0 ? 'border-l-2 border-gray-300' : ''}
        has-[:checked]:bg-blue-600 has-[:checked]:text-white
        hover:bg-gray-50 has-[:checked]:hover:bg-blue-700
      `}
    >
      <input
        type="radio"
        name="goal"
        value={option.toLowerCase().replace(' ', '_')}
        className="sr-only"
      />
      {option}
    </label>
  ))}
</div>
```

### Stepper Input

```jsx
function StepperInput({ value, onChange, min = 0, max = 100, step = 1 }) {
  return (
    <div className="flex items-center border-2 border-gray-300 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-xl font-bold"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="w-20 text-center text-lg border-0 focus:ring-0"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-xl font-bold"
      >
        +
      </button>
    </div>
  );
}
```

---

## Animation Patterns

### Shake on Error

```jsx
// Add to your CSS or Tailwind config
const shakeAnimation = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  .animate-shake {
    animation: shake 0.3s ease-in-out;
  }
`;

// Usage
<input className={hasError ? 'animate-shake border-red-500' : ''} />
```

### Smooth Error Appearance

```jsx
// Error message with fade-in
<div
  className={`
    overflow-hidden transition-all duration-300
    ${error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}
  `}
>
  <p className="text-red-600 text-sm mt-1">{error}</p>
</div>
```

### Success Checkmark Animation

```jsx
// SVG checkmark with draw animation
<svg
  className="w-6 h-6 text-green-600"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="3"
>
  <path
    d="M5 13l4 4L19 7"
    className="animate-[draw_0.3s_ease-out_forwards]"
    strokeDasharray="20"
    strokeDashoffset="20"
    style={{
      animation: 'draw 0.3s ease-out forwards',
    }}
  />
</svg>

// Add to CSS
// @keyframes draw {
//   to { stroke-dashoffset: 0; }
// }
```

### Button Loading Spinner

```jsx
<button
  disabled={isLoading}
  className="relative px-6 py-3 bg-blue-600 text-white rounded-md
             disabled:bg-blue-400"
>
  <span className={isLoading ? 'invisible' : ''}>
    Submit
  </span>
  {isLoading && (
    <span className="absolute inset-0 flex items-center justify-center">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="4" fill="none"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
    </span>
  )}
</button>
```

---

## Complete Form Example

Putting it all together:

```jsx
function MacroCalculatorForm() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">
          Carnivore Macro Calculator
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Free. No email required.
        </p>
        
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <form className="space-y-6">
            {/* Weight with unit */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
                Weight
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="200"
                  className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-lg
                             focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <select className="px-4 py-3 text-lg border-2 border-gray-300 rounded-lg
                                   focus:ring-2 focus:ring-blue-500">
                  <option>lbs</option>
                  <option>kg</option>
                </select>
              </div>
            </div>
            
            {/* Sex - Segmented */}
            <div>
              <label className="block text-base font-medium text-gray-700 mb-1">
                Sex
              </label>
              <div className="flex rounded-lg overflow-hidden border-2 border-gray-300">
                <label className="flex-1 text-center py-3 cursor-pointer
                                  has-[:checked]:bg-blue-600 has-[:checked]:text-white">
                  <input type="radio" name="sex" value="male" className="sr-only" />
                  Male
                </label>
                <label className="flex-1 text-center py-3 cursor-pointer border-l-2
                                  has-[:checked]:bg-blue-600 has-[:checked]:text-white">
                  <input type="radio" name="sex" value="female" className="sr-only" />
                  Female
                </label>
              </div>
            </div>
            
            {/* Submit */}
            <button
              type="submit"
              className="w-full py-4 text-lg font-semibold text-white
                         bg-blue-600 hover:bg-blue-700 rounded-lg
                         focus:ring-4 focus:ring-blue-500/50
                         transition-colors"
            >
              Calculate My Macros
            </button>
          </form>
        </div>
        
        <p className="text-center text-gray-500 text-sm mt-6">
          Want more detail?{' '}
          <a href="#" className="text-blue-600 hover:underline">
            Get the $10 pro report
          </a>
        </p>
      </div>
    </div>
  );
}
```
