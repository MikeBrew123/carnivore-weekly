# Validation Patterns Reference

Client-side and server-side validation patterns for robust form handling.

## Table of Contents
1. [Validation Strategy](#validation-strategy)
2. [HTML5 Built-in Validation](#html5-built-in-validation)
3. [React Validation Patterns](#react-validation-patterns)
4. [Real-time vs Submit Validation](#real-time-vs-submit-validation)
5. [Error Display Patterns](#error-display-patterns)
6. [Common Validation Rules](#common-validation-rules)

---

## Validation Strategy

### The Three Layers

```
┌─────────────────────────────────────────┐
│ Layer 1: HTML5 Attributes               │  ← First defense, instant
│ (required, min, max, pattern)           │
├─────────────────────────────────────────┤
│ Layer 2: Client-side JavaScript         │  ← Rich feedback, UX
│ (custom validation, real-time)          │
├─────────────────────────────────────────┤
│ Layer 3: Server-side                    │  ← Security, source of truth
│ (NEVER trust client)                    │
└─────────────────────────────────────────┘
```

**Golden Rule:** Server-side validation is mandatory. Client-side is for UX only.

---

## HTML5 Built-in Validation

### Essential Attributes

```jsx
// Required field
<input required />

// Number constraints
<input type="number" min="18" max="120" step="1" />

// Text length
<input minLength={2} maxLength={100} />

// Pattern matching (regex)
<input pattern="[A-Za-z]+" title="Letters only" />

// Email format
<input type="email" />

// URL format
<input type="url" />
```

### Complete Example

```jsx
<form onSubmit={handleSubmit} noValidate={false}>
  <input
    type="number"
    name="weight"
    required
    min="50"
    max="700"
    placeholder="Enter weight"
  />
  <input
    type="email"
    name="email"
    required
    placeholder="you@example.com"
  />
  <button type="submit">Submit</button>
</form>
```

### Custom Validation Messages

```jsx
<input
  type="number"
  name="age"
  required
  min="18"
  max="120"
  onInvalid={(e) => {
    if (e.target.validity.valueMissing) {
      e.target.setCustomValidity('Please enter your age');
    } else if (e.target.validity.rangeUnderflow) {
      e.target.setCustomValidity('You must be at least 18 years old');
    } else if (e.target.validity.rangeOverflow) {
      e.target.setCustomValidity('Please enter a valid age');
    }
  }}
  onInput={(e) => e.target.setCustomValidity('')}
/>
```

---

## React Validation Patterns

### Basic State-Based Validation

```jsx
function CalculatorForm() {
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    age: '',
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = (data) => {
    const newErrors = {};

    // Weight validation
    if (!data.weight) {
      newErrors.weight = 'Weight is required';
    } else if (data.weight < 50 || data.weight > 700) {
      newErrors.weight = 'Weight must be between 50-700 lbs';
    }

    // Height validation
    if (!data.height) {
      newErrors.height = 'Height is required';
    } else if (data.height < 36 || data.height > 96) {
      newErrors.height = 'Height must be between 36-96 inches';
    }

    // Age validation
    if (!data.age) {
      newErrors.age = 'Age is required';
    } else if (data.age < 18 || data.age > 120) {
      newErrors.age = 'Age must be between 18-120';
    }

    return newErrors;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newData = { ...formData, [name]: value };
    setFormData(newData);
    
    // Validate on change if field was touched
    if (touched[name]) {
      const newErrors = validate(newData);
      setErrors((prev) => ({ ...prev, [name]: newErrors[name] }));
    }
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    // Validate on blur
    const newErrors = validate(formData);
    setErrors((prev) => ({ ...prev, [name]: newErrors[name] }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({ weight: true, height: true, age: true });
    
    // Validate all
    const newErrors = validate(formData);
    setErrors(newErrors);
    
    // If no errors, submit
    if (Object.keys(newErrors).length === 0) {
      submitForm(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="weight">Weight (lbs)</label>
        <input
          type="number"
          id="weight"
          name="weight"
          value={formData.weight}
          onChange={handleChange}
          onBlur={handleBlur}
          className={errors.weight && touched.weight ? 'border-red-500' : ''}
        />
        {errors.weight && touched.weight && (
          <p className="text-red-600 text-sm mt-1">{errors.weight}</p>
        )}
      </div>
      {/* More fields... */}
    </form>
  );
}
```

### Validation Hook (Reusable)

```jsx
function useFormValidation(initialValues, validationRules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = useCallback((data = values) => {
    const newErrors = {};
    
    Object.keys(validationRules).forEach((field) => {
      const rules = validationRules[field];
      const value = data[field];
      
      for (const rule of rules) {
        const error = rule(value, data);
        if (error) {
          newErrors[field] = error;
          break; // Stop at first error
        }
      }
    });
    
    return newErrors;
  }, [values, validationRules]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    
    setValues((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    
    const newErrors = validate();
    setErrors((prev) => ({ ...prev, [name]: newErrors[name] }));
  };

  const handleSubmit = async (onSubmit) => {
    return async (e) => {
      e.preventDefault();
      
      // Touch all fields
      const allTouched = Object.keys(initialValues).reduce(
        (acc, key) => ({ ...acc, [key]: true }),
        {}
      );
      setTouched(allTouched);
      
      // Validate
      const newErrors = validate();
      setErrors(newErrors);
      
      // Submit if valid
      if (Object.keys(newErrors).length === 0) {
        setIsSubmitting(true);
        try {
          await onSubmit(values);
        } finally {
          setIsSubmitting(false);
        }
      }
    };
  };

  const getFieldProps = (name) => ({
    name,
    value: values[name],
    onChange: handleChange,
    onBlur: handleBlur,
    'aria-invalid': touched[name] && errors[name] ? true : undefined,
  });

  const getFieldError = (name) => touched[name] ? errors[name] : undefined;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    getFieldProps,
    getFieldError,
    setValues,
    validate,
  };
}

// Usage
const validationRules = {
  weight: [
    (v) => !v && 'Weight is required',
    (v) => (v < 50 || v > 700) && 'Weight must be between 50-700 lbs',
  ],
  email: [
    (v) => !v && 'Email is required',
    (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && 'Invalid email format',
  ],
};

function MyForm() {
  const form = useFormValidation({ weight: '', email: '' }, validationRules);
  
  return (
    <form onSubmit={form.handleSubmit(submitToAPI)}>
      <input {...form.getFieldProps('weight')} />
      {form.getFieldError('weight') && <p>{form.getFieldError('weight')}</p>}
    </form>
  );
}
```

---

## Real-time vs Submit Validation

### When to Validate

| Moment | Use For | UX Impact |
|--------|---------|-----------|
| **On Change** | Format-as-you-type (phone, credit card) | Immediate but can be annoying |
| **On Blur** | Most fields | Good balance — validates after user leaves field |
| **On Submit** | All fields, final check | Catches everything, shows all errors |

### Recommended Pattern

```jsx
// Validate on blur + on submit
// Show errors only for touched fields until submit

const [touched, setTouched] = useState({});
const [submitted, setSubmitted] = useState(false);

// Show error if: field was touched OR form was submitted
const showError = (field) => (touched[field] || submitted) && errors[field];
```

### Real-time Format Validation

Good for: phone numbers, credit cards, dates

```jsx
function PhoneInput() {
  const [value, setValue] = useState('');
  
  const formatPhone = (input) => {
    // Remove non-digits
    const digits = input.replace(/\D/g, '');
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };
  
  return (
    <input
      type="tel"
      value={value}
      onChange={(e) => setValue(formatPhone(e.target.value))}
      placeholder="(555) 123-4567"
    />
  );
}
```

---

## Error Display Patterns

### Inline Error (Recommended)

```jsx
<div className="mb-4">
  <label htmlFor="weight" className="block text-base font-medium mb-1">
    Weight (lbs)
  </label>
  <input
    type="number"
    id="weight"
    name="weight"
    className={`w-full px-4 py-3 border-2 rounded-md
                ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
    aria-invalid={error ? 'true' : 'false'}
    aria-describedby={error ? 'weight-error' : undefined}
  />
  {error && (
    <p id="weight-error" className="text-red-600 text-sm mt-1" role="alert">
      {error}
    </p>
  )}
</div>
```

### Error Summary (For Long Forms)

```jsx
{Object.keys(errors).length > 0 && submitted && (
  <div 
    className="bg-red-50 border border-red-200 rounded-md p-4 mb-6"
    role="alert"
    aria-labelledby="error-summary-title"
  >
    <h3 id="error-summary-title" className="text-red-800 font-medium mb-2">
      Please fix the following errors:
    </h3>
    <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
      {Object.entries(errors).map(([field, message]) => (
        <li key={field}>
          <a href={`#${field}`} className="underline hover:no-underline">
            {message}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}
```

### Success State

```jsx
{isValid && touched[field] && (
  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-600">
    ✓
  </span>
)}
```

---

## Common Validation Rules

### Validation Helper Functions

```javascript
// Required
const required = (message = 'This field is required') => 
  (value) => (!value || value.toString().trim() === '') && message;

// Min/Max for numbers
const min = (minVal, message) => 
  (value) => value < minVal && (message || `Must be at least ${minVal}`);

const max = (maxVal, message) => 
  (value) => value > maxVal && (message || `Must be no more than ${maxVal}`);

const between = (minVal, maxVal, message) => 
  (value) => (value < minVal || value > maxVal) && 
    (message || `Must be between ${minVal} and ${maxVal}`);

// String length
const minLength = (len, message) => 
  (value) => value.length < len && (message || `Must be at least ${len} characters`);

const maxLength = (len, message) => 
  (value) => value.length > len && (message || `Must be no more than ${len} characters`);

// Email
const email = (message = 'Invalid email address') => 
  (value) => value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && message;

// Pattern
const pattern = (regex, message) => 
  (value) => value && !regex.test(value) && message;

// Match another field
const matches = (otherField, message = 'Fields must match') => 
  (value, allValues) => value !== allValues[otherField] && message;

// Custom
const custom = (fn, message) => 
  (value, allValues) => !fn(value, allValues) && message;
```

### Usage Example

```javascript
const validationRules = {
  weight: [
    required('Please enter your weight'),
    between(50, 700, 'Weight must be between 50-700 lbs'),
  ],
  height: [
    required('Please enter your height'),
    between(36, 96, 'Height must be between 36-96 inches'),
  ],
  age: [
    required('Please enter your age'),
    min(18, 'You must be at least 18 years old'),
    max(120, 'Please enter a valid age'),
  ],
  email: [
    required('Please enter your email'),
    email('Please enter a valid email address'),
  ],
  password: [
    required('Please enter a password'),
    minLength(8, 'Password must be at least 8 characters'),
    pattern(/[A-Z]/, 'Password must contain an uppercase letter'),
    pattern(/[0-9]/, 'Password must contain a number'),
  ],
  confirmPassword: [
    required('Please confirm your password'),
    matches('password', 'Passwords do not match'),
  ],
};
```

### Macro Calculator Specific Validations

```javascript
const macroValidation = {
  weight: [
    required('Weight is required'),
    (v) => isNaN(v) && 'Please enter a valid number',
    between(50, 700, 'Weight must be between 50-700 lbs'),
  ],
  height: [
    required('Height is required'),
    between(36, 96, 'Height must be between 3-8 feet'),
  ],
  age: [
    required('Age is required'),
    between(18, 120, 'Age must be between 18-120 years'),
  ],
  sex: [
    required('Please select your sex'),
    (v) => !['male', 'female'].includes(v?.toLowerCase()) && 'Please select male or female',
  ],
  activity: [
    required('Please select your activity level'),
    (v) => !['sedentary', 'light', 'moderate', 'very', 'extreme'].includes(v) && 
      'Please select a valid activity level',
  ],
  goal: [
    required('Please select your goal'),
    (v) => !['fat_loss', 'maintenance', 'muscle_gain'].includes(v) && 
      'Please select a valid goal',
  ],
};
```
