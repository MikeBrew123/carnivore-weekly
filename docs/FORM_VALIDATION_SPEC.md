# Form Validation Specification

**By Alex, Technical Architect**
**Last Updated:** 2026-01-03

---

## Overview

This document defines all client-side and server-side validation rules for the Carnivore Weekly calculator form. Validation occurs in two layers:

1. **Client-side (frontend)** - Real-time feedback, prevent invalid submissions
2. **Server-side (API)** - Security enforcement, data integrity checks

---

## Architecture

### Validation Framework

**Client-Side:**
- HTML5 native validation (type, required, pattern, min/max)
- JavaScript event listeners (onChange for live feedback)
- Custom regex validators (email, textarea content sanitization)
- Visual error states (red borders, inline error messages)
- Aria-live regions for accessibility

**Server-Side:**
- TypeScript/Node.js API validation
- Database constraints (NOT NULL, ENUM, UNIQUE, FOREIGN KEY)
- Input sanitization (prevent SQL injection, XSS)
- Rate limiting per session
- Audit logging for failed submissions

---

## Step 4: Health Profile Fields (22 Fields Total)

### Field 1: Email Address (REQUIRED)

**Database Column:** `email`
**Type:** VARCHAR(255)
**Required:** YES
**HTML Input Type:** `email`

**Validation Rules:**

1. **Must not be empty**
   - Error: "Please enter an email address"
   - Show on: Form blur OR submit attempt

2. **Must be valid email format**
   - HTML5 email validator (built-in)
   - Regex fallback: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
   - Error: "Please enter a valid email address"

3. **Max 255 characters**
   - Enforced at database level
   - No frontend error (automatically truncated)

4. **Duplicate checking (server-side)**
   - Check if email already has a session in last 24 hours
   - Warning (not blocking): "This email already has a recent report"
   - Allow override: User can proceed with same email

**UX Enhancements:**

- Display green checkmark (✓) when valid
- Red X when invalid
- Real-time validation on blur
- Prevent form submission if invalid

**Server-Side Validation (Node.js):**

```javascript
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email is required' };
  }
  if (email.length > 255) {
    return { valid: false, error: 'Email exceeds 255 characters' };
  }
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  return { valid: true };
}
```

---

### Fields 2-3: First Name & Last Name (OPTIONAL in form, handled by step 4 UI)

**Database Columns:** `first_name`, `last_name`
**Type:** VARCHAR(100)
**Required:** NO (optional - user can leave blank)
**HTML Input Type:** `text`

**Validation Rules (if filled):**

1. **Max 100 characters**
   - Error: "Name cannot exceed 100 characters"

2. **Allowed characters**
   - Letters (a-z, A-Z, accented: é, ñ, ü, etc.)
   - Hyphens (-) and apostrophes (')
   - Spaces
   - Reject: Numbers, special characters

3. **Regex pattern:** `/^[a-zA-Z\s'-]+$/` (basic)
   - Better: `/^[a-zA-ZÀ-ÿ\s'-]+$/` (handles accents)

4. **Trim whitespace on submit**
   - Strip leading/trailing spaces
   - Collapse multiple spaces to single space

**No validation error if left blank** (optional field)

---

### Field 4: Current Medications (OPTIONAL)

**Database Column:** `medications`
**Type:** TEXT (max 5000 chars)
**Required:** NO

**Validation Rules (if filled):**

1. **Max 5000 characters**
   - Show live character counter: "1234 / 5000 characters"
   - Warning (not blocking): Turn orange at 4500 chars
   - Error: "Exceeds 5000 character limit"

2. **Allowed content**
   - Letters, numbers, punctuation
   - Line breaks allowed
   - Commas for list formatting
   - Hyphens for ranges (e.g., "Metformin 500-1000mg")
   - Reject: Control characters, script tags

3. **Sanitization on submit**
   - Strip leading/trailing whitespace
   - Remove null characters (\x00)
   - Collapse multiple line breaks to max 2
   - Escape HTML entities on backend

**No validation error if left blank** (optional field)

---

### Field 5: Medical Conditions (OPTIONAL - Checkbox Array)

**Database Column:** `conditions` (TEXT[] array)
**Type:** Multi-select checkboxes
**Required:** NO
**Max selections:** Unlimited (user can check all 6)

**Valid Options (ENUM):**

```
1. Diabetes (Type 1 or 2)
2. Hypertension / High Blood Pressure
3. Heart Disease / Cardiovascular
4. Thyroid Issues (Hypo/Hyper/Hashimoto's)
5. PCOS (Polycystic Ovary Syndrome)
6. IBS (Irritable Bowel Syndrome)
```

**Validation Rules:**

1. **0-6 selections allowed**
   - No error for selecting 0 (valid)
   - No error for selecting all 6 (valid)

2. **Must be exact ENUM values**
   - Client-side: Pre-defined checkbox list
   - Server-side: Validate against allowed list

3. **Array handling**
   - If 0 selected: Send empty array `[]`
   - If 1+ selected: Send array `["diabetes", "hypertension"]`

**No validation error for this field** (optional multi-select)

---

### Field 6: Other Conditions (Free Text) (OPTIONAL)

**Database Column:** `other_conditions`
**Type:** TEXT (max 500 chars)
**Required:** NO
**Shown when:** User selects checkbox for "Other condition not listed"

**Validation Rules (if shown and filled):**

1. **Max 500 characters**
   - Error: "Additional conditions text cannot exceed 500 characters"

2. **Sanitize same as medications**
   - Strip whitespace
   - Remove control characters
   - Escape HTML

**No validation error if left blank** (optional field)

---

### Field 7: Current Symptoms (OPTIONAL - Checkbox Array)

**Database Column:** `symptoms` (TEXT[] array)
**Type:** Multi-select checkboxes
**Required:** NO
**Max selections:** Unlimited (user can check all 7)

**Valid Options (ENUM):**

```
1. Fatigue / Low Energy
2. Brain Fog / Cognitive Issues
3. Bloating / Gas
4. Constipation
5. Diarrhea
6. Joint Pain / Aches
7. Muscle Pain / Soreness
```

**Validation Rules:**

1. **0-7 selections allowed**
   - No error for selecting 0 (valid)
   - No error for selecting all 7 (valid)

2. **Must be exact ENUM values**
   - Validated against allowed list

3. **Array handling**
   - If 0 selected: Send empty array `[]`
   - If 1+ selected: Send array `["fatigue", "brain_fog"]`

**No validation error for this field** (optional multi-select)

---

### Field 8: Other Symptoms (Free Text) (OPTIONAL)

**Database Column:** `other_symptoms`
**Type:** TEXT (max 500 chars)
**Required:** NO
**Shown when:** User selects checkbox for "Other symptom not listed"

**Validation Rules (if shown and filled):**

1. **Max 500 characters**
   - Error: "Additional symptoms text cannot exceed 500 characters"

2. **Sanitize same as medications**

**No validation error if left blank** (optional field)

---

### Field 9: Food Allergies (OPTIONAL)

**Database Column:** `allergies`
**Type:** TEXT (max 5000 chars)
**Required:** NO

**Validation Rules (if filled):**

1. **Max 5000 characters**
   - Show live character counter: "X / 5000 characters"

2. **Format guidance (not enforced)**
   - Suggested: Comma-separated (e.g., "Shellfish, Peanuts, Tree nuts")
   - Accepted: Free text (comma-separated or prose)

3. **Sanitize same as medications**

**No validation error if left blank** (optional field)

---

### Field 10: Foods to Avoid (OPTIONAL)

**Database Column:** `avoid_foods`
**Type:** TEXT (max 5000 chars)
**Required:** NO

**Validation Rules (if filled):**

1. **Max 5000 characters**
   - Show live character counter

2. **Any format accepted**
   - List format, prose, ranges (e.g., "Any grain products")

3. **Sanitize same as medications**

**No validation error if left blank** (optional field)

---

### Field 11: Dairy Tolerance (OPTIONAL - Dropdown)

**Database Column:** `dairy_tolerance`
**Type:** SELECT / Dropdown
**Required:** NO

**Valid Options (ENUM):**

```
[Empty/Unselected] (default)
none        - No dairy at all (strict)
butter-only - Clarified butter / Ghee only
some        - Aged cheeses OK, fresh dairy causes issues
full        - All dairy tolerated
```

**Validation Rules:**

1. **No error if left blank**
   - Default placeholder: "-- Select one --"
   - User can skip this field entirely

2. **If selected, must be exact value**
   - Server-side ENUM validation

3. **No cascading validation**
   - Selecting dairy doesn't require anything else

**No validation error for this field** (optional dropdown)

---

### Field 12: Previous Diets Tried (OPTIONAL)

**Database Column:** `previous_diets`
**Type:** TEXT (max 5000 chars)
**Required:** NO

**Validation Rules (if filled):**

1. **Max 5000 characters**
   - Show live character counter

2. **Format: Comma-separated or free text**
   - Examples: "Keto for 3 months, Paleo for 6 months, Weight Watchers for 1 year"
   - Or prose: "I tried keto which worked for 3 months but then I hit a plateau..."

3. **Sanitize same as medications**

**No validation error if left blank** (optional field)

---

### Field 13: What Worked Before (OPTIONAL)

**Database Column:** `what_worked`
**Type:** TEXT (max 5000 chars)
**Required:** NO

**Validation Rules (if filled):**

1. **Max 5000 characters**
   - Show live character counter

2. **Any format accepted** (prose preferred)

3. **Sanitize same as medications**

**No validation error if left blank** (optional field)

---

### Field 14: Carnivore Experience Level (OPTIONAL - Dropdown)

**Database Column:** `carnivore_experience`
**Type:** SELECT / Dropdown
**Required:** NO

**Valid Options (ENUM):**

```
[Empty/Unselected] (default)
new    - First time trying carnivore
weeks  - 1-4 weeks experience
months - 1-12 months experience
years  - 1+ years carnivore veteran
```

**Validation Rules:**

1. **No error if left blank**

2. **If selected, must be exact ENUM value**
   - Server-side validation only

**No validation error for this field** (optional dropdown)

---

### Field 15: Cooking Skill Level (OPTIONAL - Dropdown)

**Database Column:** `cooking_skill`
**Type:** SELECT / Dropdown
**Required:** NO

**Valid Options (ENUM):**

```
[Empty/Unselected] (default)
beginner     - Basic cooking, needs simple recipes
intermediate - Comfortable with standard techniques
advanced     - Can adapt recipes, comfortable with precision
```

**Validation Rules:**

1. **No error if left blank**

2. **If selected, must be exact ENUM value**

**No validation error for this field** (optional dropdown)

---

### Field 16: Meal Prep Time Available (OPTIONAL - Dropdown)

**Database Column:** `meal_prep_time`
**Type:** SELECT / Dropdown
**Required:** NO

**Valid Options (ENUM):**

```
[Empty/Unselected] (default)
none       - Cannot dedicate prep time
minimal    - <2 hours/week
some       - 2-5 hours/week
extensive  - 5+ hours/week
```

**Validation Rules:**

1. **No error if left blank**

2. **If selected, must be exact ENUM value**

**No validation error for this field** (optional dropdown)

---

### Field 17: Budget Level (OPTIONAL - Dropdown)

**Database Column:** `budget`
**Type:** SELECT / Dropdown
**Required:** NO

**Valid Options (ENUM):**

```
[Empty/Unselected] (default)
tight      - <$150/week for food
moderate   - $150-300/week
comfortable - $300+/week
```

**Validation Rules:**

1. **No error if left blank**

2. **If selected, must be exact ENUM value**

**No validation error for this field** (optional dropdown)

---

### Field 18: Family Situation (OPTIONAL - Dropdown)

**Database Column:** `family_situation`
**Type:** SELECT / Dropdown
**Required:** NO

**Valid Options (ENUM):**

```
[Empty/Unselected] (default)
single   - Living alone
partner  - With romantic partner
kids     - Children in household (ages context in notes)
extended - Multi-generational or roommates
```

**Validation Rules:**

1. **No error if left blank**

2. **If selected, must be exact ENUM value**

**No validation error for this field** (optional dropdown)

---

### Field 19: Work/Travel Situation (OPTIONAL - Dropdown)

**Database Column:** `work_travel`
**Type:** SELECT / Dropdown
**Required:** NO

**Valid Options (ENUM):**

```
[Empty/Unselected] (default)
office          - Regular office presence
remote          - Full remote work
frequent_travel - >50% travel / eating out
variable        - Mix of office and travel
```

**Validation Rules:**

1. **No error if left blank**

2. **If selected, must be exact ENUM value**

**No validation error for this field** (optional dropdown)

---

### Field 20: Health Goals (OPTIONAL - Checkbox Array)

**Database Column:** `goals` (TEXT[] array)
**Type:** Multi-select checkboxes
**Required:** NO
**Max selections:** Unlimited

**Valid Options (ENUM):**

```
1. Weight Loss
2. Increase Energy
3. Mental Clarity / Focus
4. Athletic Performance
5. Reduce Inflammation
6. Blood Sugar Control
7. Hormone Balance
8. Digestive Health
9. Skin Health / Appearance
10. Longevity / Anti-Aging
11. Better Sleep
12. Muscle Gain / Strength
13. Faster Recovery
14. Better Biomarkers
```

**Validation Rules:**

1. **0-14 selections allowed**
   - No error for selecting 0 (valid)
   - No error for selecting all 14 (valid)

2. **Must be exact ENUM values**

3. **Array handling**
   - If 0 selected: Send empty array `[]`
   - If 1+ selected: Send array `["weight_loss", "energy"]`

**No validation error for this field** (optional multi-select)

---

### Field 21: Biggest Challenge (OPTIONAL)

**Database Column:** `biggest_challenge`
**Type:** TEXT (max 5000 chars)
**Required:** NO

**Validation Rules (if filled):**

1. **Max 5000 characters**
   - Show live character counter

2. **Any format accepted** (prose preferred)

3. **Sanitize same as medications**

**No validation error if left blank** (optional field)

---

### Field 22: Additional Notes (OPTIONAL)

**Database Column:** `additional_notes`
**Type:** TEXT (max 5000 chars)
**Required:** NO

**Validation Rules (if filled):**

1. **Max 5000 characters**
   - Show live character counter

2. **Any format accepted** (prose preferred)

3. **Sanitize same as medications**

**No validation error if left blank** (optional field)

---

## Summary: Required vs Optional

| Field | Required | Blocking Error | Optional Error |
|-------|----------|----------------|----------------|
| Email | YES | Invalid format | N/A |
| First Name | NO | N/A | If >100 chars |
| Last Name | NO | N/A | If >100 chars |
| Medications | NO | N/A | If >5000 chars |
| Conditions | NO | N/A | None (0-6 valid) |
| Other Conditions | NO | N/A | If >500 chars |
| Symptoms | NO | N/A | None (0-7 valid) |
| Other Symptoms | NO | N/A | If >500 chars |
| Allergies | NO | N/A | If >5000 chars |
| Avoid Foods | NO | N/A | If >5000 chars |
| Dairy Tolerance | NO | N/A | If not exact ENUM |
| Previous Diets | NO | N/A | If >5000 chars |
| What Worked | NO | N/A | If >5000 chars |
| Carnivore Experience | NO | N/A | If not exact ENUM |
| Cooking Skill | NO | N/A | If not exact ENUM |
| Meal Prep Time | NO | N/A | If not exact ENUM |
| Budget | NO | N/A | If not exact ENUM |
| Family Situation | NO | N/A | If not exact ENUM |
| Work/Travel | NO | N/A | If not exact ENUM |
| Health Goals | NO | N/A | None (0-14 valid) |
| Biggest Challenge | NO | N/A | If >5000 chars |
| Additional Notes | NO | N/A | If >5000 chars |

---

## Validation Logic: Textarea Character Counters

All textarea fields (medications, conditions, allergies, etc.) must show live character counts.

### Implementation (HTML + JavaScript)

```html
<label for="medications">Current Medications</label>
<textarea
  id="medications"
  name="medications"
  maxlength="5000"
  placeholder="List any medications you're taking..."
  aria-describedby="medications-count"
></textarea>
<span id="medications-count" class="char-count" aria-live="polite">
  0 / 5000 characters
</span>
```

```javascript
const textarea = document.getElementById('medications');
const counter = document.getElementById('medications-count');

textarea.addEventListener('input', () => {
  const current = textarea.value.length;
  const max = 5000;
  counter.textContent = `${current} / ${max} characters`;

  // Optional: Change color at threshold
  if (current > 4500) {
    counter.classList.add('warning');
  } else {
    counter.classList.remove('warning');
  }
});
```

**CSS for character counter:**

```css
.char-count {
  font-size: 0.875rem;
  color: #666;
  display: block;
  margin-top: 0.25rem;
}

.char-count.warning {
  color: #ff9800;
  font-weight: 600;
}
```

---

## Validation Logic: Email with Visual Feedback

### Implementation (HTML + JavaScript)

```html
<label for="email">Email Address <span aria-label="required">*</span></label>
<div class="email-input-wrapper">
  <input
    id="email"
    type="email"
    name="email"
    required
    maxlength="255"
    placeholder="you@example.com"
    aria-required="true"
    aria-describedby="email-error email-hint"
  />
  <span id="email-status" class="email-status" role="status" aria-live="polite">
    <!-- Checkmark or error icon populated by JS -->
  </span>
</div>
<span id="email-hint" class="hint">We'll never share your email.</span>
<span id="email-error" class="error" aria-live="assertive"></span>
```

**JavaScript validation:**

```javascript
const emailInput = document.getElementById('email');
const emailStatus = document.getElementById('email-status');
const emailError = document.getElementById('email-error');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

emailInput.addEventListener('blur', validateEmail);
emailInput.addEventListener('input', validateEmail);

function validateEmail() {
  const email = emailInput.value.trim();

  if (!email) {
    emailInput.classList.add('invalid');
    emailInput.classList.remove('valid');
    emailStatus.textContent = '';
    emailError.textContent = 'Please enter an email address';
    return false;
  }

  if (!emailRegex.test(email)) {
    emailInput.classList.add('invalid');
    emailInput.classList.remove('valid');
    emailStatus.textContent = '✗';
    emailError.textContent = 'Please enter a valid email address';
    return false;
  }

  emailInput.classList.remove('invalid');
  emailInput.classList.add('valid');
  emailStatus.textContent = '✓';
  emailError.textContent = '';
  return true;
}

// On form submit
function handleSubmit(event) {
  event.preventDefault();

  if (!validateEmail()) {
    emailInput.focus();
    return false;
  }

  // Rest of validation...
  submitForm();
}
```

**CSS for email validation states:**

```css
.email-input-wrapper {
  position: relative;
}

input[type="email"] {
  width: 100%;
  padding: 0.5rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.2s, background-color 0.2s;
}

input[type="email"].valid {
  border-color: #4caf50;
  background-color: #f1f8f4;
}

input[type="email"].invalid {
  border-color: #f44336;
  background-color: #ffe6e3;
}

.email-status {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.25rem;
  line-height: 1;
}

.email-status:contains("✓") {
  color: #4caf50;
}

.email-status:contains("✗") {
  color: #f44336;
}

.error {
  display: block;
  color: #f44336;
  font-size: 0.875rem;
  margin-top: 0.25rem;
  font-weight: 600;
}

.hint {
  display: block;
  color: #999;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
```

---

## Validation Logic: Conditional Deficit Percentage (From Step 2)

**Note:** This validation is referenced for context. Deficit percentage is a Step 2 field, but it has conditional logic that depends on the goal field.

**Client-side conditional logic:**

```javascript
const goalSelect = document.getElementById('goal');
const deficitWrapper = document.getElementById('deficit-percentage-wrapper');
const deficitInput = document.getElementById('deficit_percentage');

goalSelect.addEventListener('change', (event) => {
  const goal = event.target.value;

  if (goal === 'lose' || goal === 'gain') {
    // Show deficit percentage field
    deficitWrapper.style.display = 'block';
    deficitInput.required = true;
    deficitInput.setAttribute('aria-required', 'true');
  } else if (goal === 'maintain') {
    // Hide deficit percentage field
    deficitWrapper.style.display = 'none';
    deficitInput.required = false;
    deficitInput.removeAttribute('aria-required');
    deficitInput.value = '';
  }
});

// On form submit, validate deficit if shown
function validateDeficitPercentage() {
  const goal = document.getElementById('goal').value;

  if (goal === 'lose' || goal === 'gain') {
    const deficit = document.getElementById('deficit_percentage').value;

    if (!deficit) {
      showError('deficit_percentage', 'Please select a deficit percentage');
      return false;
    }

    const validValues = [15, 20, 25];
    if (!validValues.includes(parseInt(deficit))) {
      showError('deficit_percentage', 'Invalid deficit percentage selected');
      return false;
    }
  }

  return true;
}
```

---

## Sanitization Functions

All textarea and text input fields must be sanitized before sending to server.

### JavaScript Sanitization

```javascript
function sanitizeTextInput(text) {
  if (!text || typeof text !== 'string') return '';

  // 1. Trim leading/trailing whitespace
  let sanitized = text.trim();

  // 2. Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');

  // 3. Collapse multiple line breaks to max 2
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // 4. Remove control characters (except newlines, tabs)
  sanitized = sanitized.replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

function validateAndSanitize(fieldName, text, maxLength) {
  const sanitized = sanitizeTextInput(text);

  if (sanitized.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} cannot exceed ${maxLength} characters`,
      value: sanitized
    };
  }

  return {
    valid: true,
    error: null,
    value: sanitized
  };
}
```

---

## Server-Side Validation (Node.js/TypeScript)

### Validation Middleware

```typescript
interface Step4FormData {
  email: string;
  first_name?: string;
  last_name?: string;
  medications?: string;
  conditions?: string[];
  other_conditions?: string;
  symptoms?: string[];
  other_symptoms?: string;
  allergies?: string;
  avoid_foods?: string;
  dairy_tolerance?: string;
  previous_diets?: string;
  what_worked?: string;
  carnivore_experience?: string;
  cooking_skill?: string;
  meal_prep_time?: string;
  budget?: string;
  family_situation?: string;
  work_travel?: string;
  goals?: string[];
  biggest_challenge?: string;
  additional_notes?: string;
}

const ENUM_VALUES = {
  dairy_tolerance: ['none', 'butter-only', 'some', 'full'],
  carnivore_experience: ['new', 'weeks', 'months', 'years'],
  cooking_skill: ['beginner', 'intermediate', 'advanced'],
  meal_prep_time: ['none', 'minimal', 'some', 'extensive'],
  budget: ['tight', 'moderate', 'comfortable'],
  family_situation: ['single', 'partner', 'kids', 'extended'],
  work_travel: ['office', 'remote', 'frequent_travel', 'variable'],
  conditions: [
    'diabetes', 'hypertension', 'heart_disease', 'thyroid', 'pcos', 'ibs'
  ],
  symptoms: [
    'fatigue', 'brain_fog', 'bloating', 'constipation', 'diarrhea',
    'joint_pain', 'muscle_pain'
  ],
  goals: [
    'weight_loss', 'energy', 'mental_clarity', 'athletic_performance',
    'inflammation_reduction', 'blood_sugar_control', 'hormone_balance',
    'digestive_health', 'skin_health', 'longevity', 'better_sleep',
    'muscle_gain', 'recovery', 'biomarker_improvement'
  ]
};

function validateStep4(data: Step4FormData): {
  valid: boolean;
  errors: Record<string, string>;
  data: Step4FormData;
} {
  const errors: Record<string, string> = {};
  const sanitized: Step4FormData = { email: '' };

  // Email validation (REQUIRED)
  if (!data.email || !data.email.trim()) {
    errors.email = 'Email is required';
  } else if (data.email.length > 255) {
    errors.email = 'Email exceeds 255 characters';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Invalid email format';
  } else {
    sanitized.email = data.email.trim();
  }

  // First name (OPTIONAL)
  if (data.first_name) {
    if (data.first_name.length > 100) {
      errors.first_name = 'First name cannot exceed 100 characters';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(data.first_name)) {
      errors.first_name = 'First name contains invalid characters';
    } else {
      sanitized.first_name = data.first_name.trim();
    }
  }

  // Last name (OPTIONAL)
  if (data.last_name) {
    if (data.last_name.length > 100) {
      errors.last_name = 'Last name cannot exceed 100 characters';
    } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(data.last_name)) {
      errors.last_name = 'Last name contains invalid characters';
    } else {
      sanitized.last_name = data.last_name.trim();
    }
  }

  // Textarea fields (5000 char max)
  const longTextFields = [
    'medications', 'symptoms', 'allergies', 'avoid_foods',
    'previous_diets', 'what_worked', 'biggest_challenge', 'additional_notes'
  ];

  longTextFields.forEach(field => {
    if (data[field as keyof Step4FormData]) {
      const text = data[field as keyof Step4FormData] as string;
      if (text.length > 5000) {
        errors[field] = `${field} cannot exceed 5000 characters`;
      } else {
        sanitized[field as keyof Step4FormData] = sanitizeText(text);
      }
    }
  });

  // Short text fields (500 char max)
  const shortTextFields = ['other_conditions', 'other_symptoms'];

  shortTextFields.forEach(field => {
    if (data[field as keyof Step4FormData]) {
      const text = data[field as keyof Step4FormData] as string;
      if (text.length > 500) {
        errors[field] = `${field} cannot exceed 500 characters`;
      } else {
        sanitized[field as keyof Step4FormData] = sanitizeText(text);
      }
    }
  });

  // ENUM fields validation
  const enumFields = [
    'dairy_tolerance', 'carnivore_experience', 'cooking_skill',
    'meal_prep_time', 'budget', 'family_situation', 'work_travel'
  ];

  enumFields.forEach(field => {
    if (data[field as keyof Step4FormData]) {
      const value = data[field as keyof Step4FormData];
      const validValues = ENUM_VALUES[field as keyof typeof ENUM_VALUES];

      if (!validValues.includes(value as string)) {
        errors[field] = `Invalid ${field} selected`;
      } else {
        sanitized[field as keyof Step4FormData] = value;
      }
    }
  });

  // Array fields validation
  if (data.conditions && Array.isArray(data.conditions)) {
    const invalidConditions = data.conditions.filter(
      c => !ENUM_VALUES.conditions.includes(c)
    );
    if (invalidConditions.length > 0) {
      errors.conditions = 'One or more conditions are invalid';
    } else {
      sanitized.conditions = data.conditions;
    }
  }

  if (data.symptoms && Array.isArray(data.symptoms)) {
    const invalidSymptoms = data.symptoms.filter(
      s => !ENUM_VALUES.symptoms.includes(s)
    );
    if (invalidSymptoms.length > 0) {
      errors.symptoms = 'One or more symptoms are invalid';
    } else {
      sanitized.symptoms = data.symptoms;
    }
  }

  if (data.goals && Array.isArray(data.goals)) {
    const invalidGoals = data.goals.filter(
      g => !ENUM_VALUES.goals.includes(g)
    );
    if (invalidGoals.length > 0) {
      errors.goals = 'One or more goals are invalid';
    } else {
      sanitized.goals = data.goals;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    data: sanitized
  };
}

function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  // Trim whitespace
  let sanitized = text.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');

  // Collapse multiple line breaks
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Remove control characters (except newlines, tabs)
  sanitized = sanitized.replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}
```

---

## Form Submission Gate

The form cannot be submitted unless:

1. **Email is filled AND valid format**
   - Regular expression passes
   - HTML5 validation passes
   - No server-side errors

2. **No other blocking errors exist**
   - All ENUM dropdowns (if filled) have valid values
   - All character counts are within limits
   - Conditional fields (deficit percentage) are handled correctly

3. **Database constraints will be checked at insert**
   - Foreign key to session exists
   - Payment status is verified
   - Is_premium flag is set correctly

### Submission Handler

```javascript
async function handleFormSubmit(event) {
  event.preventDefault();

  // Step 1: Validate email (blocking)
  if (!validateEmail()) {
    emailInput.focus();
    return false;
  }

  // Step 2: Collect and sanitize all fields
  const formData = new FormData(event.target);
  const data = {
    email: formData.get('email').trim(),
    first_name: formData.get('first_name') ?
      sanitizeText(formData.get('first_name')) : null,
    // ... other fields
  };

  // Step 3: Validate on client
  const validation = clientSideValidate(data);
  if (!validation.valid) {
    displayErrors(validation.errors);
    return false;
  }

  // Step 4: Send to server
  try {
    const response = await fetch('/api/calculator/step4', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: getSessionToken(),
        data: data
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      displayErrors(errorData.errors);
      return false;
    }

    // Success: Redirect to report or payment
    window.location.href = '/calculator/report';
  } catch (error) {
    displayError('general', 'An error occurred. Please try again.');
  }

  return false;
}
```

---

## Accessibility

### Error Messages in Aria-Live Regions

All validation errors must be announced to screen readers.

```html
<!-- Error region for email -->
<span id="email-error" class="error" aria-live="assertive" aria-atomic="true">
  <!-- Error message populates here -->
</span>

<!-- Error region for dynamic fields -->
<div id="form-errors" aria-live="polite" aria-atomic="true" role="status">
  <!-- Multiple errors can be listed here -->
</div>
```

### Focus Management on Error

When validation fails, focus should move to the first invalid field.

```javascript
function displayErrors(errors) {
  const firstErrorField = Object.keys(errors)[0];
  const firstInput = document.querySelector(`[name="${firstErrorField}"]`);

  if (firstInput) {
    firstInput.focus();
    firstInput.setAttribute('aria-invalid', 'true');
  }
}
```

### Required Field Indicators

All required fields must have a visual indicator and aria-required attribute.

```html
<label for="email">
  Email Address
  <span aria-label="required" class="required-indicator">*</span>
</label>
<input
  id="email"
  type="email"
  name="email"
  required
  aria-required="true"
/>
```

**CSS for required indicator:**

```css
.required-indicator {
  color: #f44336;
  margin-left: 0.25rem;
  font-weight: bold;
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Email field validates correct format
- [ ] Email field shows error on invalid format
- [ ] Email field shows green checkmark on valid
- [ ] Textarea character counters update in real-time
- [ ] Textarea counters show warning at 4500+ chars
- [ ] Cannot submit with invalid email
- [ ] Can submit with valid email and optional fields blank
- [ ] Conditional deficit field shows/hides based on goal
- [ ] Dropdown fields accept correct ENUM values only
- [ ] Checkbox arrays allow 0-N selections without error
- [ ] Form sanitizes whitespace on submit
- [ ] Mobile responsive: Fields visible, no horizontal scroll
- [ ] Screen reader announces error messages
- [ ] Tab order is logical and includes all fields

### Automated Testing

- [ ] Email validation regex tests (valid/invalid formats)
- [ ] Character count limits enforced
- [ ] ENUM validation rejects invalid values
- [ ] Array validation accepts 0-N items
- [ ] Sanitization removes control characters
- [ ] Server-side validation mirrors client-side

---

## Error Message Library (All 22 Fields)

| Field | Error Type | Error Message |
|-------|-----------|------------------|
| Email | Empty | "Please enter an email address" |
| Email | Invalid format | "Please enter a valid email address" |
| First Name | Exceeds max | "First name cannot exceed 100 characters" |
| First Name | Invalid chars | "First name can only contain letters, hyphens, and apostrophes" |
| Last Name | Exceeds max | "Last name cannot exceed 100 characters" |
| Last Name | Invalid chars | "Last name can only contain letters, hyphens, and apostrophes" |
| Medications | Exceeds max | "Medications cannot exceed 5000 characters" |
| Other Conditions | Exceeds max | "Additional conditions cannot exceed 500 characters" |
| Other Symptoms | Exceeds max | "Additional symptoms cannot exceed 500 characters" |
| Allergies | Exceeds max | "Allergies cannot exceed 5000 characters" |
| Avoid Foods | Exceeds max | "Foods to avoid cannot exceed 5000 characters" |
| Dairy Tolerance | Invalid value | "Please select a valid dairy tolerance option" |
| Previous Diets | Exceeds max | "Previous diets cannot exceed 5000 characters" |
| What Worked | Exceeds max | "What worked before cannot exceed 5000 characters" |
| Carnivore Experience | Invalid value | "Please select a valid experience level" |
| Cooking Skill | Invalid value | "Please select a valid skill level" |
| Meal Prep Time | Invalid value | "Please select a valid time availability" |
| Budget | Invalid value | "Please select a valid budget level" |
| Family Situation | Invalid value | "Please select a valid family situation" |
| Work/Travel | Invalid value | "Please select a valid work situation" |
| Biggest Challenge | Exceeds max | "Biggest challenge cannot exceed 5000 characters" |
| Additional Notes | Exceeds max | "Additional notes cannot exceed 5000 characters" |

---

## Summary

**Key Points:**

1. **Email is ONLY required field** - All others optional
2. **Character limits enforced** - Textareas max 5000 (short text max 500)
3. **Live feedback** - Character counters update in real-time
4. **ENUM validation** - Dropdowns/arrays must have exact valid values
5. **Conditional logic** - Deficit field shows only if goal is lose/gain
6. **Accessibility** - Error messages in aria-live, focus management, required indicators
7. **Sanitization** - Remove control characters, trim whitespace, collapse line breaks
8. **Server-side mirror** - All client validation repeated on API
9. **No submission until valid** - Email must pass before form can submit
10. **Error highlighting** - Red borders and inline messages for failed fields

---

**Status:** Validation spec complete
**Next Step:** Implement validation in HTML/JavaScript forms
**Reference:** `/docs/FORM_FIELDS_COMPLETE.md` for field details
