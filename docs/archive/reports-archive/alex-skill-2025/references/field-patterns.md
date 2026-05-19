# Field Patterns Reference

Accessible, mobile-friendly patterns for every form input type.

## Table of Contents
1. [Field Structure Template](#field-structure-template)
2. [Text Inputs](#text-inputs)
3. [Number Inputs](#number-inputs)
4. [Select Dropdowns](#select-dropdowns)
5. [Radio Buttons](#radio-buttons)
6. [Checkboxes](#checkboxes)
7. [Range Sliders](#range-sliders)
8. [Date and Time](#date-and-time)
9. [File Upload](#file-upload)
10. [Submit Buttons](#submit-buttons)

---

## Field Structure Template

Every field should follow this structure:

```jsx
<div className="mb-4">
  {/* 1. Label - ALWAYS visible, linked to input */}
  <label 
    htmlFor="fieldId" 
    className="block text-base font-medium text-gray-700 mb-1"
  >
    Field Label
    {required && <span className="text-red-500 ml-1">*</span>}
  </label>
  
  {/* 2. Helper text - BEFORE input for screen readers */}
  {helperText && (
    <p id="fieldId-help" className="text-sm text-gray-500 mb-1">
      {helperText}
    </p>
  )}
  
  {/* 3. Input - with proper attributes */}
  <input
    id="fieldId"
    name="fieldId"
    type="text"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               disabled:bg-gray-100 disabled:cursor-not-allowed"
    aria-describedby={helperText ? "fieldId-help" : undefined}
    aria-invalid={hasError}
  />
  
  {/* 4. Error message - AFTER input */}
  {error && (
    <p className="text-sm text-red-600 mt-1" role="alert">
      {error}
    </p>
  )}
</div>
```

---

## Text Inputs

### Basic Text Input

```jsx
<div className="mb-4">
  <label htmlFor="name" className="block text-base font-medium text-gray-700 mb-1">
    Full Name <span className="text-red-500">*</span>
  </label>
  <input
    type="text"
    id="name"
    name="name"
    required
    autoComplete="name"
    placeholder="Enter your full name"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
```

### Email Input

```jsx
<div className="mb-4">
  <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-1">
    Email Address
  </label>
  <input
    type="email"
    id="email"
    name="email"
    inputMode="email"
    autoComplete="email"
    placeholder="you@example.com"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
```

### Password Input (with toggle)

```jsx
function PasswordInput() {
  const [show, setShow] = useState(false);
  
  return (
    <div className="mb-4">
      <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-1">
        Password
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          id="password"
          name="password"
          autoComplete="current-password"
          className="w-full px-4 py-3 pr-12 text-lg border-2 border-gray-300 rounded-md
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
```

### Textarea

```jsx
<div className="mb-4">
  <label htmlFor="message" className="block text-base font-medium text-gray-700 mb-1">
    Message
  </label>
  <textarea
    id="message"
    name="message"
    rows={4}
    placeholder="Enter your message..."
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md resize-y
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
  <p className="text-sm text-gray-500 mt-1">Max 500 characters</p>
</div>
```

---

## Number Inputs

### Basic Number

```jsx
<div className="mb-4">
  <label htmlFor="weight" className="block text-base font-medium text-gray-700 mb-1">
    Weight (lbs)
  </label>
  <input
    type="number"
    id="weight"
    name="weight"
    min="50"
    max="700"
    step="1"
    inputMode="numeric"
    placeholder="200"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
```

### Number with Unit Selector

```jsx
<div className="mb-4">
  <label htmlFor="weight" className="block text-base font-medium text-gray-700 mb-1">
    Weight
  </label>
  <div className="flex gap-2">
    <input
      type="number"
      id="weight"
      name="weight"
      min="0"
      step="0.1"
      inputMode="decimal"
      placeholder="200"
      className="flex-1 px-4 py-3 text-lg border-2 border-gray-300 rounded-md
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
    <select
      name="weightUnit"
      className="px-4 py-3 text-lg border-2 border-gray-300 rounded-md
                 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="lbs">lbs</option>
      <option value="kg">kg</option>
    </select>
  </div>
</div>
```

### Height (Feet + Inches)

```jsx
<div className="mb-4">
  <label className="block text-base font-medium text-gray-700 mb-1">
    Height
  </label>
  <div className="flex gap-2">
    <div className="flex-1">
      <input
        type="number"
        id="heightFeet"
        name="heightFeet"
        min="3"
        max="8"
        inputMode="numeric"
        placeholder="5"
        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <span className="text-sm text-gray-500">feet</span>
    </div>
    <div className="flex-1">
      <input
        type="number"
        id="heightInches"
        name="heightInches"
        min="0"
        max="11"
        inputMode="numeric"
        placeholder="10"
        className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
                   focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      <span className="text-sm text-gray-500">inches</span>
    </div>
  </div>
</div>
```

### Age Input

```jsx
<div className="mb-4">
  <label htmlFor="age" className="block text-base font-medium text-gray-700 mb-1">
    Age
  </label>
  <input
    type="number"
    id="age"
    name="age"
    min="18"
    max="120"
    inputMode="numeric"
    placeholder="35"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
```

---

## Select Dropdowns

### Basic Select

```jsx
<div className="mb-4">
  <label htmlFor="activity" className="block text-base font-medium text-gray-700 mb-1">
    Activity Level
  </label>
  <select
    id="activity"
    name="activity"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               bg-white"
  >
    <option value="">Select your activity level</option>
    <option value="sedentary">Sedentary (desk job, little exercise)</option>
    <option value="light">Lightly Active (light exercise 1-3 days/week)</option>
    <option value="moderate">Moderately Active (exercise 3-5 days/week)</option>
    <option value="very">Very Active (hard exercise 6-7 days/week)</option>
    <option value="extreme">Extremely Active (physical job + exercise)</option>
  </select>
</div>
```

### Select with Descriptions

```jsx
<div className="mb-4">
  <label htmlFor="goal" className="block text-base font-medium text-gray-700 mb-1">
    Your Goal
  </label>
  <select
    id="goal"
    name="goal"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500
               bg-white"
  >
    <option value="">Select your goal</option>
    <option value="fat_loss">Fat Loss (20% calorie deficit)</option>
    <option value="maintenance">Maintenance (maintain current weight)</option>
    <option value="muscle_gain">Muscle Gain (10% calorie surplus)</option>
  </select>
  <p className="text-sm text-gray-500 mt-1">
    This determines your calorie target
  </p>
</div>
```

---

## Radio Buttons

### Basic Radio Group

```jsx
<fieldset className="mb-4">
  <legend className="text-base font-medium text-gray-700 mb-2">
    Sex
  </legend>
  <div className="space-y-2">
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name="sex"
        value="male"
        className="w-5 h-5 text-blue-600 border-2 border-gray-300
                   focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-lg">Male</span>
    </label>
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="radio"
        name="sex"
        value="female"
        className="w-5 h-5 text-blue-600 border-2 border-gray-300
                   focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-lg">Female</span>
    </label>
  </div>
</fieldset>
```

### Radio Cards (Visual Selection)

```jsx
<fieldset className="mb-4">
  <legend className="text-base font-medium text-gray-700 mb-2">
    Select Your Goal
  </legend>
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {[
      { value: 'fat_loss', label: 'Fat Loss', desc: 'Lose body fat' },
      { value: 'maintenance', label: 'Maintain', desc: 'Stay the same' },
      { value: 'muscle_gain', label: 'Build Muscle', desc: 'Gain mass' },
    ].map((option) => (
      <label
        key={option.value}
        className="relative flex flex-col p-4 border-2 rounded-lg cursor-pointer
                   hover:border-blue-300 has-[:checked]:border-blue-500 
                   has-[:checked]:bg-blue-50"
      >
        <input
          type="radio"
          name="goal"
          value={option.value}
          className="sr-only"
        />
        <span className="text-lg font-medium">{option.label}</span>
        <span className="text-sm text-gray-500">{option.desc}</span>
      </label>
    ))}
  </div>
</fieldset>
```

---

## Checkboxes

### Single Checkbox

```jsx
<div className="mb-4">
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      name="terms"
      required
      className="w-5 h-5 mt-0.5 text-blue-600 border-2 border-gray-300 rounded
                 focus:ring-2 focus:ring-blue-500"
    />
    <span className="text-base">
      I agree to the{' '}
      <a href="/terms" className="text-blue-600 underline">Terms of Service</a>
      {' '}and{' '}
      <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>
    </span>
  </label>
</div>
```

### Checkbox Group

```jsx
<fieldset className="mb-4">
  <legend className="text-base font-medium text-gray-700 mb-2">
    Dietary Preferences
  </legend>
  <div className="space-y-2">
    {['Strict Carnivore', 'Carnivore + Eggs', 'Carnivore + Dairy', 'Animal-Based'].map((option) => (
      <label key={option} className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="preferences"
          value={option.toLowerCase().replace(/\s+/g, '_')}
          className="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded
                     focus:ring-2 focus:ring-blue-500"
        />
        <span className="text-lg">{option}</span>
      </label>
    ))}
  </div>
</fieldset>
```

---

## Range Sliders

### Basic Range with Value Display

```jsx
function RangeInput() {
  const [value, setValue] = useState(50);
  
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label htmlFor="intensity" className="text-base font-medium text-gray-700">
          Training Intensity
        </label>
        <span className="text-lg font-semibold text-blue-600">{value}%</span>
      </div>
      <input
        type="range"
        id="intensity"
        name="intensity"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer
                   accent-blue-600"
      />
      <div className="flex justify-between text-sm text-gray-500 mt-1">
        <span>Light</span>
        <span>Intense</span>
      </div>
    </div>
  );
}
```

---

## Date and Time

### Date Input

```jsx
<div className="mb-4">
  <label htmlFor="startDate" className="block text-base font-medium text-gray-700 mb-1">
    Start Date
  </label>
  <input
    type="date"
    id="startDate"
    name="startDate"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
```

### Birthday (with reasonable limits)

```jsx
<div className="mb-4">
  <label htmlFor="birthday" className="block text-base font-medium text-gray-700 mb-1">
    Date of Birth
  </label>
  <input
    type="date"
    id="birthday"
    name="birthday"
    max={new Date().toISOString().split('T')[0]} // Today
    min="1900-01-01"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
</div>
```

---

## File Upload

### Simple File Upload

```jsx
<div className="mb-4">
  <label htmlFor="photo" className="block text-base font-medium text-gray-700 mb-1">
    Upload Photo
  </label>
  <input
    type="file"
    id="photo"
    name="photo"
    accept="image/*"
    className="w-full px-4 py-3 text-lg border-2 border-gray-300 rounded-md
               file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
               file:bg-blue-600 file:text-white file:cursor-pointer
               focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
  />
  <p className="text-sm text-gray-500 mt-1">PNG, JPG up to 5MB</p>
</div>
```

### Drag and Drop Zone

```jsx
function DropZone() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  
  return (
    <div className="mb-4">
      <label className="block text-base font-medium text-gray-700 mb-1">
        Upload File
      </label>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          setFile(e.dataTransfer.files[0]);
        }}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                    transition-colors ${isDragging 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'}`}
      >
        {file ? (
          <p className="text-lg">{file.name}</p>
        ) : (
          <>
            <p className="text-lg text-gray-600">Drag & drop a file here</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          </>
        )}
        <input
          type="file"
          className="hidden"
          onChange={(e) => setFile(e.target.files[0])}
        />
      </div>
    </div>
  );
}
```

---

## Submit Buttons

### Primary Submit

```jsx
<button
  type="submit"
  className="w-full py-4 px-6 text-lg font-semibold text-white 
             bg-blue-600 hover:bg-blue-700 rounded-md
             focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
             disabled:bg-gray-400 disabled:cursor-not-allowed
             transition-colors"
>
  Calculate My Macros
</button>
```

### Submit with Loading State

```jsx
function SubmitButton({ isLoading }) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="w-full py-4 px-6 text-lg font-semibold text-white 
                 bg-blue-600 hover:bg-blue-700 rounded-md
                 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                 disabled:bg-gray-400 disabled:cursor-not-allowed
                 transition-colors flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" 
                    stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Calculating...</span>
        </>
      ) : (
        'Calculate My Macros'
      )}
    </button>
  );
}
```

### Secondary/Cancel Button

```jsx
<div className="flex gap-3">
  <button
    type="button"
    onClick={onCancel}
    className="flex-1 py-3 px-6 text-lg font-medium text-gray-700
               bg-gray-100 hover:bg-gray-200 rounded-md
               focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
               transition-colors"
  >
    Cancel
  </button>
  <button
    type="submit"
    className="flex-1 py-3 px-6 text-lg font-semibold text-white
               bg-blue-600 hover:bg-blue-700 rounded-md
               focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
               transition-colors"
  >
    Submit
  </button>
</div>
```
