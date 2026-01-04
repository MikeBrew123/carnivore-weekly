/**
 * Form Validation System for Carnivore Weekly Calculator
 * Implements client-side validation for all 22 form fields
 * Reference: /docs/FORM_VALIDATION_SPEC.md
 */

// Email regex pattern - simple but effective for client-side
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ENUM validation values
const ENUM_VALUES = {
  dairy_tolerance: ['none', 'butter-only', 'some', 'full'],
  carnivore_experience: ['new', 'weeks', 'months', 'years'],
  cooking_skill: ['beginner', 'intermediate', 'advanced'],
  meal_prep_time: ['none', 'minimal', 'some', 'extensive'],
  budget: ['tight', 'moderate', 'comfortable'],
  family_situation: ['single', 'partner', 'kids', 'extended'],
  work_travel: ['office', 'remote', 'frequent_travel', 'variable'],
  conditions: [
    'diabetes', 'hypertension', 'heart_disease', 'thyroid', 'pcos', 'ibs',
    'crohns', 'eczema', 'arthritis', 'gout', 'sleep_apnea', 'depression',
    'anxiety', 'adhd', 'autoimmune', 'kidney_disease', 'liver_disease',
    'metabolic_syndrome', 'high_cholesterol', 'fatty_liver'
  ],
  symptoms: [
    'fatigue', 'brain_fog', 'bloating', 'constipation', 'diarrhea',
    'joint_pain', 'muscle_pain', 'headaches', 'migraines', 'anxiety',
    'depression', 'insomnia', 'low_energy', 'skin_issues', 'digestive_issues'
  ],
  goals: [
    'weight_loss', 'energy', 'mental_clarity', 'athletic_performance',
    'inflammation_reduction', 'blood_sugar_control', 'hormone_balance',
    'digestive_health', 'skin_health', 'longevity', 'better_sleep',
    'muscle_gain', 'recovery', 'biomarker_improvement'
  ]
};

// Character count limits for fields
const MAX_LENGTHS = {
  email: 255,
  first_name: 100,
  last_name: 100,
  medications: 5000,
  other_conditions: 500,
  other_symptoms: 500,
  allergies: 5000,
  avoid_foods: 5000,
  previous_diets: 5000,
  what_worked: 5000,
  biggest_challenge: 5000,
  additional_notes: 5000
};

/**
 * FIELD 1: EMAIL VALIDATION (REQUIRED)
 * Only blocking field - form cannot submit without valid email
 */
function validateEmail(email) {
  const trimmed = email.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: 'Please enter an email address'
    };
  }

  if (trimmed.length > MAX_LENGTHS.email) {
    return {
      valid: false,
      error: `Email cannot exceed ${MAX_LENGTHS.email} characters`
    };
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Please enter a valid email address'
    };
  }

  return {
    valid: true,
    error: null
  };
}

/**
 * Update email field with real-time validation feedback
 */
function updateEmailValidation() {
  const emailInput = document.getElementById('email');
  if (!emailInput) return;

  const emailStatus = document.getElementById('email-status') || createEmailStatus();
  const emailError = document.getElementById('email-error') || createEmailError();

  const validation = validateEmail(emailInput.value);

  if (validation.valid) {
    emailInput.classList.remove('invalid');
    emailInput.classList.add('valid');
    emailStatus.textContent = '✓';
    emailStatus.className = 'email-status valid-status';
    emailError.textContent = '';
  } else {
    emailInput.classList.remove('valid');
    emailInput.classList.add('invalid');
    emailStatus.textContent = '✗';
    emailStatus.className = 'email-status invalid-status';
    emailError.textContent = validation.error;
    emailError.setAttribute('role', 'alert');
  }

  return validation.valid;
}

function createEmailStatus() {
  const span = document.createElement('span');
  span.id = 'email-status';
  span.className = 'email-status';
  span.setAttribute('role', 'status');
  span.setAttribute('aria-live', 'polite');

  const emailInput = document.getElementById('email');
  if (emailInput && emailInput.parentElement) {
    emailInput.parentElement.appendChild(span);
  }

  return span;
}

function createEmailError() {
  const span = document.createElement('span');
  span.id = 'email-error';
  span.className = 'error';
  span.setAttribute('aria-live', 'assertive');

  const emailInput = document.getElementById('email');
  if (emailInput && emailInput.parentElement) {
    emailInput.parentElement.parentElement.appendChild(span);
  }

  return span;
}

/**
 * FIELDS 2-3: NAME FIELDS (OPTIONAL)
 * Max 100 chars, letters/hyphens/apostrophes only
 */
function validateName(name, fieldName = 'Name') {
  if (!name || !name.trim()) {
    return { valid: true, error: null }; // Optional field
  }

  const trimmed = name.trim();

  if (trimmed.length > MAX_LENGTHS[fieldName.toLowerCase()]) {
    return {
      valid: false,
      error: `${fieldName} cannot exceed ${MAX_LENGTHS[fieldName.toLowerCase()]} characters`
    };
  }

  // Allow letters (with accents), hyphens, apostrophes, spaces
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  if (!nameRegex.test(trimmed)) {
    return {
      valid: false,
      error: `${fieldName} can only contain letters, hyphens, and apostrophes`
    };
  }

  return { valid: true, error: null };
}

/**
 * TEXTAREA VALIDATION (FIELDS 4, 6, 8-10, 12-13, 21-22)
 * Max length varies by field. Show live character count.
 */
function validateTextarea(text, maxLength) {
  if (!text || !text.trim()) {
    return { valid: true, error: null }; // Optional field
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      error: `Cannot exceed ${maxLength} characters`
    };
  }

  return { valid: true, error: null };
}

/**
 * Setup live character counters for textarea fields
 */
function setupTextareaCounters() {
  const textareaFields = [
    { id: 'medications', maxLength: 5000 },
    { id: 'other_conditions', maxLength: 500 },
    { id: 'other_symptoms', maxLength: 500 },
    { id: 'allergies', maxLength: 5000 },
    { id: 'avoid_foods', maxLength: 5000 },
    { id: 'previous_diets', maxLength: 5000 },
    { id: 'what_worked', maxLength: 5000 },
    { id: 'biggest_challenge', maxLength: 5000 },
    { id: 'additional_notes', maxLength: 5000 }
  ];

  textareaFields.forEach(field => {
    const textarea = document.getElementById(field.id);
    if (!textarea) return;

    // Create counter if doesn't exist
    let counter = document.getElementById(`${field.id}-count`);
    if (!counter) {
      counter = document.createElement('span');
      counter.id = `${field.id}-count`;
      counter.className = 'char-count';
      counter.setAttribute('aria-live', 'polite');
      counter.setAttribute('aria-label', `Character count for ${field.id}`);
      textarea.parentElement.appendChild(counter);
    }

    // Update counter on input
    const updateCounter = () => {
      const current = textarea.value.length;
      counter.textContent = `${current} / ${field.maxLength} characters`;

      // Show warning at 90% capacity
      if (current > field.maxLength * 0.9) {
        counter.classList.add('warning');
      } else {
        counter.classList.remove('warning');
      }
    };

    textarea.addEventListener('input', updateCounter);

    // Initialize counter on page load
    updateCounter();
  });
}

/**
 * FIELDS 5 & 7: CHECKBOX ARRAYS (CONDITIONS, SYMPTOMS)
 * No validation errors - 0-N selections valid
 */
function getCheckedValues(fieldName) {
  const checkboxes = document.querySelectorAll(`input[name="${fieldName}"]:checked`);
  return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * FIELDS 11, 14-19: ENUM DROPDOWNS
 * Validate against allowed values
 */
function validateEnumDropdown(value, fieldName) {
  if (!value) {
    return { valid: true, error: null }; // Optional field
  }

  const validValues = ENUM_VALUES[fieldName];
  if (!validValues) {
    return { valid: true, error: null }; // Field not in ENUM list
  }

  if (!validValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid ${fieldName} selected`
    };
  }

  return { valid: true, error: null };
}

/**
 * FIELD 20: HEALTH GOALS (CHECKBOX ARRAY)
 * No validation errors - 0-14 selections valid
 */
function getHealthGoals() {
  const checkboxes = document.querySelectorAll('input[name="goals"]:checked');
  return Array.from(checkboxes).map(cb => cb.value);
}

/**
 * TEXT SANITIZATION
 * Remove control characters, trim whitespace, collapse line breaks
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') return '';

  // Trim leading/trailing whitespace
  let sanitized = text.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\x00/g, '');

  // Collapse multiple line breaks to max 2
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Remove control characters (except newlines, tabs)
  sanitized = sanitized.replace(/[\x01-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * MAIN FORM SUBMISSION VALIDATION
 * Gate: Email MUST be valid
 */
function validateFormSubmit(event) {
  event.preventDefault();

  // Step 1: Validate email (blocking)
  const emailInput = document.getElementById('email');
  if (!emailInput) {
    showError('general', 'Email field not found');
    return false;
  }

  const emailValidation = validateEmail(emailInput.value);
  if (!emailValidation.valid) {
    updateEmailValidation();
    emailInput.focus();
    showError('email', emailValidation.error);
    return false;
  }

  // Step 2: Validate optional text fields
  const validationErrors = {};

  // First name
  const firstNameInput = document.getElementById('firstName');
  if (firstNameInput) {
    const firstNameValidation = validateName(firstNameInput.value, 'first_name');
    if (!firstNameValidation.valid) {
      validationErrors.first_name = firstNameValidation.error;
    }
  }

  // Last name
  const lastNameInput = document.getElementById('lastName');
  if (lastNameInput) {
    const lastNameValidation = validateName(lastNameInput.value, 'last_name');
    if (!lastNameValidation.valid) {
      validationErrors.last_name = lastNameValidation.error;
    }
  }

  // Textareas with character limits
  const textareaFields = [
    { id: 'medications', maxLength: 5000 },
    { id: 'other_conditions', maxLength: 500 },
    { id: 'other_symptoms', maxLength: 500 },
    { id: 'allergies', maxLength: 5000 },
    { id: 'avoid_foods', maxLength: 5000 },
    { id: 'previous_diets', maxLength: 5000 },
    { id: 'what_worked', maxLength: 5000 },
    { id: 'biggest_challenge', maxLength: 5000 },
    { id: 'additional_notes', maxLength: 5000 }
  ];

  textareaFields.forEach(field => {
    const textarea = document.getElementById(field.id);
    if (textarea) {
      const validation = validateTextarea(textarea.value, field.maxLength);
      if (!validation.valid) {
        validationErrors[field.id] = validation.error;
      }
    }
  });

  // ENUM dropdowns
  const enumFields = [
    'dairy_tolerance',
    'carnivore_experience',
    'cooking_skill',
    'meal_prep_time',
    'budget',
    'family_situation',
    'work_travel'
  ];

  enumFields.forEach(fieldName => {
    const select = document.querySelector(`select[name="${fieldName}"]`);
    if (select) {
      const validation = validateEnumDropdown(select.value, fieldName);
      if (!validation.valid) {
        validationErrors[fieldName] = validation.error;
      }
    }
  });

  // Step 3: Display any validation errors
  if (Object.keys(validationErrors).length > 0) {
    displayValidationErrors(validationErrors);
    return false;
  }

  // Step 4: Collect and sanitize form data
  const formData = collectFormData();

  // Step 5: Prepare submission
  prepareFormSubmission(formData);

  return false; // Prevent default submit, use AJAX instead
}

/**
 * Collect all form data with sanitization
 */
function collectFormData() {
  const form = document.getElementById('calculator-form');
  const formData = new FormData(form);
  const data = {};

  // Collect all fields
  for (const [key, value] of formData.entries()) {
    // Handle multiple checkbox values
    if (data[key]) {
      if (!Array.isArray(data[key])) {
        data[key] = [data[key]];
      }
      data[key].push(value);
    } else {
      data[key] = value;
    }
  }

  // Sanitize text fields
  const textFields = [
    'email', 'firstName', 'lastName', 'medications',
    'other_conditions', 'other_symptoms', 'allergies', 'avoid_foods',
    'previous_diets', 'what_worked', 'biggest_challenge', 'additional_notes'
  ];

  textFields.forEach(field => {
    if (data[field]) {
      data[field] = sanitizeText(data[field]);
    }
  });

  return data;
}

/**
 * Display all validation errors to user
 */
function displayValidationErrors(errors) {
  const errorContainer = document.getElementById('form-errors') || createErrorContainer();
  errorContainer.innerHTML = '';
  errorContainer.setAttribute('role', 'alert');

  let errorHTML = '<div class="form-errors-list">';
  errorHTML += '<h3>Please fix these errors:</h3><ul>';

  for (const [field, error] of Object.entries(errors)) {
    errorHTML += `<li>${error}</li>`;

    // Add aria-invalid to field
    const fieldElement = document.querySelector(`[name="${field}"]`);
    if (fieldElement) {
      fieldElement.setAttribute('aria-invalid', 'true');
    }
  }

  errorHTML += '</ul></div>';
  errorContainer.innerHTML = errorHTML;

  // Focus first error field
  const firstErrorField = Object.keys(errors)[0];
  const firstInput = document.querySelector(`[name="${firstErrorField}"]`);
  if (firstInput) {
    firstInput.focus();
  }
}

function createErrorContainer() {
  const div = document.createElement('div');
  div.id = 'form-errors';
  div.className = 'form-errors-container';
  div.setAttribute('aria-live', 'assertive');
  div.setAttribute('aria-atomic', 'true');

  const form = document.getElementById('calculator-form');
  if (form) {
    form.insertBefore(div, form.firstChild);
  }

  return div;
}

/**
 * Show error for single field
 */
function showError(fieldName, message) {
  const errorContainer = document.getElementById('form-errors') || createErrorContainer();
  if (!errorContainer.innerHTML) {
    errorContainer.innerHTML = '<div class="form-errors-list"><ul></ul></div>';
  }

  const ul = errorContainer.querySelector('ul');
  if (ul && !ul.innerHTML.includes(message)) {
    const li = document.createElement('li');
    li.textContent = message;
    ul.appendChild(li);
  }
}

/**
 * Prepare form for submission (placeholder for step 6)
 */
function prepareFormSubmission(data) {
  console.log('Form validation passed. Ready for submission:', data);
  // Step 6 will implement actual submission logic
}

/**
 * Setup event listeners on page load
 */
function initializeFormValidation() {
  // Email field - real-time validation
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('blur', updateEmailValidation);
    emailInput.addEventListener('input', updateEmailValidation);
  }

  // Setup textarea counters
  setupTextareaCounters();

  // Form submission
  const form = document.getElementById('calculator-form');
  if (form) {
    form.addEventListener('submit', validateFormSubmit);
  }

  // Remove aria-invalid on field edit
  const allInputs = document.querySelectorAll('input, textarea, select');
  allInputs.forEach(input => {
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
    });
    input.addEventListener('change', () => {
      input.removeAttribute('aria-invalid');
    });
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFormValidation);
} else {
  initializeFormValidation();
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateEmail,
    validateName,
    validateTextarea,
    validateEnumDropdown,
    sanitizeText,
    validateFormSubmit
  };
}
