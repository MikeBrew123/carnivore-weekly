# Form Submission Patterns Reference

API integration, error handling, and submission state management.

## Table of Contents
1. [Submission State Machine](#submission-state-machine)
2. [Basic Submission Pattern](#basic-submission-pattern)
3. [Cloudflare Worker Integration](#cloudflare-worker-integration)
4. [Error Handling](#error-handling)
5. [Loading States](#loading-states)
6. [Success States](#success-states)
7. [Retry Patterns](#retry-patterns)

---

## Submission State Machine

Every form submission goes through these states:

```
     ┌─────────┐
     │  IDLE   │ ← Initial state
     └────┬────┘
          │ user clicks submit
          ▼
   ┌──────────────┐
   │  VALIDATING  │ ← Check all fields
   └──────┬───────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌───────┐  ┌─────────┐
│ ERROR │  │ LOADING │ ← API call in progress
└───────┘  └────┬────┘
                │
          ┌─────┴─────┐
          │           │
          ▼           ▼
     ┌─────────┐  ┌─────────┐
     │ SUCCESS │  │  ERROR  │
     └─────────┘  └─────────┘
```

### State Hook

```jsx
function useFormSubmission() {
  const [state, setState] = useState('idle');
  // 'idle' | 'validating' | 'loading' | 'success' | 'error'
  
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const submit = async (validateFn, submitFn) => {
    setState('validating');
    
    const validationErrors = validateFn();
    if (Object.keys(validationErrors).length > 0) {
      setState('error');
      setError({ type: 'validation', errors: validationErrors });
      return;
    }
    
    setState('loading');
    
    try {
      const data = await submitFn();
      setResult(data);
      setState('success');
    } catch (err) {
      setError({ type: 'api', message: err.message });
      setState('error');
    }
  };

  const reset = () => {
    setState('idle');
    setError(null);
    setResult(null);
  };

  return { state, error, result, submit, reset };
}
```

---

## Basic Submission Pattern

### Complete React Form with Submission

```jsx
function CalculatorForm() {
  const [formData, setFormData] = useState({
    weight: '',
    height: '',
    age: '',
    sex: '',
    activity: '',
    goal: '',
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [result, setResult] = useState(null);

  const validate = () => {
    const newErrors = {};
    if (!formData.weight) newErrors.weight = 'Required';
    if (!formData.height) newErrors.height = 'Required';
    if (!formData.age) newErrors.age = 'Required';
    if (!formData.sex) newErrors.sex = 'Required';
    if (!formData.activity) newErrors.activity = 'Required';
    if (!formData.goal) newErrors.goal = 'Required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    
    // Validate
    const validationErrors = validate();
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      return; // Stop if validation fails
    }
    
    // Submit
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }
      
      setResult(data);
      
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show result if successful
  if (result) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">Your Results</h2>
        <div dangerouslySetInnerHTML={{ __html: result.report }} />
        <button
          onClick={() => setResult(null)}
          className="mt-4 px-4 py-2 bg-gray-200 rounded"
        >
          Calculate Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Macro Calculator</h2>
      
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
          {submitError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Form fields here */}
        
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
                     hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Calculating...' : 'Calculate My Macros'}
        </button>
      </form>
    </div>
  );
}
```

---

## Cloudflare Worker Integration

### Frontend Fetch to Cloudflare Worker

```jsx
const WORKER_URL = 'https://your-worker.workers.dev';

async function submitToWorker(formData) {
  const response = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      weight: parseFloat(formData.weight),
      height: parseFloat(formData.height),
      age: parseInt(formData.age),
      sex: formData.sex,
      activity: formData.activity,
      goal: formData.goal,
    }),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Calculation failed');
  }
  
  return data;
}
```

### With Timeout Handling

```jsx
async function submitWithTimeout(formData, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    return await response.json();
    
  } catch (err) {
    clearTimeout(timeoutId);
    
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    
    throw err;
  }
}
```

---

## Error Handling

### Error Types and User Messages

```jsx
function getErrorMessage(error) {
  // Network errors
  if (error.message === 'Failed to fetch' || error.name === 'TypeError') {
    return 'Unable to connect. Please check your internet connection.';
  }
  
  // Timeout
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return 'The request took too long. Please try again.';
  }
  
  // Validation errors from server
  if (error.type === 'validation') {
    return 'Please fix the errors above and try again.';
  }
  
  // Rate limiting
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  
  // Server errors
  if (error.status >= 500) {
    return 'Our servers are having trouble. Please try again in a few minutes.';
  }
  
  // Default
  return error.message || 'Something went wrong. Please try again.';
}
```

### Error Display Component

```jsx
function FormError({ error, onRetry }) {
  if (!error) return null;
  
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
      <div className="flex items-start gap-3">
        <span className="text-red-600 text-xl">⚠️</span>
        <div className="flex-1">
          <p className="text-red-800 font-medium">Error</p>
          <p className="text-red-700 text-sm mt-1">{getErrorMessage(error)}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-red-700 underline hover:no-underline"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Server Validation Error Handling

```jsx
// When server returns field-specific errors
async function handleSubmit(formData) {
  try {
    const response = await fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    
    const data = await response.json();
    
    // Handle validation errors from server
    if (response.status === 400 && data.errors) {
      // data.errors = { weight: 'Must be positive', age: 'Required' }
      setErrors(data.errors);
      return;
    }
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
    
  } catch (err) {
    setSubmitError(err);
  }
}
```

---

## Loading States

### Simple Loading Button

```jsx
<button
  type="submit"
  disabled={isSubmitting}
  className="w-full py-3 px-4 bg-blue-600 text-white rounded-md
             flex items-center justify-center gap-2
             disabled:bg-gray-400 disabled:cursor-not-allowed"
>
  {isSubmitting ? (
    <>
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
      <span>Calculating...</span>
    </>
  ) : (
    'Calculate My Macros'
  )}
</button>
```

### Full Form Loading Overlay

```jsx
function FormWithOverlay({ children, isLoading }) {
  return (
    <div className="relative">
      {children}
      
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-blue-600 mx-auto" viewBox="0 0 24 24">
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
            <p className="mt-2 text-gray-600">Calculating your macros...</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Progress Indicator (for long operations)

```jsx
function ProgressSubmit({ stages }) {
  // stages = ['Validating...', 'Calculating BMR...', 'Generating report...']
  const [currentStage, setCurrentStage] = useState(0);
  
  useEffect(() => {
    if (isSubmitting) {
      const interval = setInterval(() => {
        setCurrentStage((prev) => Math.min(prev + 1, stages.length - 1));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isSubmitting]);
  
  return (
    <div className="text-center py-8">
      <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentStage + 1) / stages.length) * 100}%` }}
        />
      </div>
      <p className="text-gray-600">{stages[currentStage]}</p>
    </div>
  );
}
```

---

## Success States

### Simple Success Message

```jsx
{isSuccess && (
  <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
    <div className="flex items-center gap-2 text-green-800">
      <span className="text-xl">✓</span>
      <span className="font-medium">Success! Your macros have been calculated.</span>
    </div>
  </div>
)}
```

### Results Display with Reset

```jsx
function ResultsView({ result, onReset }) {
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Your Results</h2>
        <button
          onClick={onReset}
          className="text-gray-500 hover:text-gray-700"
        >
          ← Calculate Again
        </button>
      </div>
      
      {/* Render the report */}
      <div 
        className="prose prose-blue"
        dangerouslySetInnerHTML={{ __html: marked.parse(result.report) }} 
      />
      
      {/* Optional: Premium upsell */}
      {!result.isPremium && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="font-medium">Want more detail?</p>
          <p className="text-sm text-gray-600 mt-1">
            Get a comprehensive report with meal plans for $10.
          </p>
          <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md">
            Get Detailed Report
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Retry Patterns

### Automatic Retry with Backoff

```jsx
async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        const data = await response.json();
        throw new Error(data.error || `Client error: ${response.status}`);
      }
      
      // Retry server errors (5xx)
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      
      return await response.json();
      
    } catch (err) {
      lastError = err;
      
      // Don't retry on client errors
      if (err.message.includes('Client error')) {
        throw err;
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError;
}
```

### Manual Retry Button

```jsx
function SubmitWithRetry({ onSubmit }) {
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  
  const handleSubmit = async () => {
    try {
      await onSubmit();
      setError(null);
    } catch (err) {
      setError(err);
    }
  };
  
  const handleRetry = () => {
    setRetryCount((c) => c + 1);
    handleSubmit();
  };
  
  return (
    <>
      {error && (
        <div className="bg-red-50 p-4 rounded mb-4">
          <p className="text-red-700">{error.message}</p>
          <button
            onClick={handleRetry}
            className="mt-2 text-sm text-red-600 underline"
          >
            Try again {retryCount > 0 && `(attempt ${retryCount + 1})`}
          </button>
        </div>
      )}
      
      <button type="submit" onClick={handleSubmit}>
        Submit
      </button>
    </>
  );
}
```
