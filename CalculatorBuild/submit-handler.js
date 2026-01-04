/**
 * Submit Handler for Calculator Form (Step 6a)
 * Manages form submission, validation, form data collection, and Stripe payment flow
 *
 * Reference:
 * - /docs/SUBMISSION_FLOW_COMPLETE.md
 * - /docs/API_INTEGRATION_SPECS.md
 * - /docs/FORM_VALIDATION_SPEC.md
 */

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initializeSubmitButton();
  initializeEmailValidation();
  handlePaymentRedirect();
});

// ============================================================
// EMAIL VALIDATION & SUBMIT BUTTON CONTROL
// ============================================================

function initializeEmailValidation() {
  const emailInput = document.getElementById('email');
  const submitButton = document.getElementById('submit-button');

  if (!emailInput) return;

  emailInput.addEventListener('blur', validateEmail);
  emailInput.addEventListener('input', validateEmail);
  emailInput.addEventListener('change', validateEmail);

  function validateEmail() {
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = email && emailRegex.test(email);

    if (isValid) {
      emailInput.classList.add('valid');
      emailInput.classList.remove('invalid');
      submitButton.disabled = false;
    } else {
      emailInput.classList.remove('valid');
      if (email) {
        emailInput.classList.add('invalid');
      }
      submitButton.disabled = true;
    }
  }

  // Validate on page load in case email was pre-filled
  validateEmail();
}

// ============================================================
// SUBMIT BUTTON INITIALIZATION
// ============================================================

function initializeSubmitButton() {
  const submitButton = document.getElementById('submit-button');

  if (!submitButton) return;

  submitButton.addEventListener('click', handleSubmitClick);
}

// ============================================================
// FORM DATA COLLECTION
// ============================================================

/**
 * Collect all 22 form fields from the calculator
 * Maps form fields to API-expected structure per API_INTEGRATION_SPECS.md
 */
function collectFormData() {
  const form = document.getElementById('calculator-form');

  if (!form) {
    console.error('Calculator form not found');
    return null;
  }

  const formData = new FormData(form);
  const data = {
    // Step 1: Physical Stats
    sex: formData.get('sex'),
    age: parseInt(formData.get('age'), 10),
    height: parseInt(formData.get('height'), 10),
    height_unit: formData.get('height-unit'),
    weight: parseFloat(formData.get('weight')),
    weight_unit: formData.get('weight-unit'),

    // Step 2: Fitness & Goals
    lifestyle_activity: formData.get('lifestyle_activity'),
    exercise_frequency: formData.get('exercise_frequency'),
    goal: formData.get('goal'),
    deficit_percentage: formData.get('deficit_percentage')
      ? parseInt(formData.get('deficit_percentage'), 10)
      : null,
    diet_type: formData.get('diet_type'),

    // Step 3: Dietary Restrictions (optional)
    allergies: formData.get('allergies')?.trim() || '',
    avoid_foods: formData.get('avoid_foods')?.trim() || '',
    dairy_tolerance: formData.get('dairy_tolerance') || null,
    previous_diets: formData.get('previous_diets')?.trim() || '',
    what_worked: formData.get('what_worked')?.trim() || '',
    carnivore_experience: formData.get('carnivore_experience') || null,

    // Step 4: Contact & Health (Premium)
    email: formData.get('email')?.trim() || '',
    firstName: formData.get('firstName')?.trim() || '',
    lastName: formData.get('lastName')?.trim() || '',
  };

  return data;
}

// ============================================================
// FORM VALIDATION
// ============================================================

/**
 * Validate form before submission
 * Per FORM_VALIDATION_SPEC.md
 */
function validateFormSubmit() {
  const form = document.getElementById('calculator-form');
  const emailInput = document.getElementById('email');

  // Validate email (required field)
  if (!emailInput.value || !emailInput.classList.contains('valid')) {
    alert('Please enter a valid email address to continue.');
    emailInput.focus();
    return false;
  }

  // Check all required HTML5 fields
  if (!form.checkValidity()) {
    const invalidField = form.querySelector(':invalid');
    if (invalidField) {
      invalidField.focus();
      invalidField.reportValidity();
    }
    return false;
  }

  return true;
}

// ============================================================
// SUBMIT HANDLER
// ============================================================

async function handleSubmitClick(event) {
  event.preventDefault();

  // Step 1: Validate form
  if (!validateFormSubmit()) {
    return;
  }

  const submitButton = document.getElementById('submit-button');
  submitButton.disabled = true;

  try {
    // Step 2: Show progress bar
    showProgressBar();

    // Step 3: Collect all form data
    const formData = collectFormData();
    if (!formData) {
      throw new Error('Failed to collect form data');
    }

    // Step 4: Get session token (from session storage or create new)
    let sessionToken = sessionStorage.getItem('calculatorSessionToken');

    if (!sessionToken) {
      sessionToken = await createNewSession();
      if (!sessionToken) {
        throw new Error('Failed to create calculator session');
      }
    }

    // Step 5: Save form data to backend (Step 1-3 validation)
    const saveResponse = await savePrimaryFormData(sessionToken, formData);

    if (!saveResponse.success) {
      throw new Error(saveResponse.error || 'Failed to save form data');
    }

    // Step 6: Check if user already paid (premium)
    const isPremium = await checkPremiumStatus(sessionToken);

    if (isPremium) {
      // User already paid - proceed directly to report generation
      updateProgressBar(80, 'Finalizing your report...');
      await initializeReportGeneration(sessionToken, formData);

      // Redirect to report page
      setTimeout(() => {
        const accessToken = saveResponse.access_token;
        window.location.href = `/calculator/report?access_token=${accessToken}`;
      }, 1000);
    } else {
      // User needs to pay - show payment modal with tiers
      updateProgressBar(50, 'Preparing payment options...');
      await showPaymentModal(sessionToken, formData);
    }
  } catch (error) {
    console.error('Submit handler error:', error);
    alert(`Error: ${error.message}`);
    hideProgressBar();
    submitButton.disabled = false;
  }
}

// ============================================================
// SESSION MANAGEMENT
// ============================================================

/**
 * Create new calculator session
 * POST /api/v1/calculator/session
 */
async function createNewSession() {
  try {
    const response = await fetch('/api/v1/calculator/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        referrer: document.referrer || '',
        utm_source: getUTMParam('utm_source'),
        utm_campaign: getUTMParam('utm_campaign'),
      }),
    });

    if (!response.ok) {
      console.error('Session creation failed:', await response.text());
      return null;
    }

    const data = await response.json();
    sessionStorage.setItem('calculatorSessionToken', data.session_token);
    sessionStorage.setItem('calculatorSessionId', data.session_id);

    return data.session_token;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Extract UTM parameter from URL
 */
function getUTMParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param) || '';
}

// ============================================================
// FORM DATA SAVING
// ============================================================

/**
 * Save primary form data (Steps 1-3) to backend
 * POST /api/v1/calculator/step/1, /step/2, /step/3
 */
async function savePrimaryFormData(sessionToken, formData) {
  try {
    // Save Step 1 (Physical Stats)
    const step1Response = await saveStep(1, sessionToken, {
      sex: formData.sex,
      age: formData.age,
      height_feet: convertHeightToFeet(formData.height, formData.height_unit),
      height_inches: convertHeightToInches(formData.height, formData.height_unit),
      weight_value: formData.weight,
      weight_unit: formData.weight_unit,
    });

    if (!step1Response.ok) {
      throw new Error('Failed to save physical stats');
    }

    updateProgressBar(20, 'Analyzing fitness profile...');

    // Save Step 2 (Fitness & Goals)
    const step2Response = await saveStep(2, sessionToken, {
      lifestyle_activity: formData.lifestyle_activity,
      exercise_frequency: formData.exercise_frequency,
      goal: formData.goal,
      deficit_percentage: formData.deficit_percentage,
      diet_type: formData.diet_type,
    });

    if (!step2Response.ok) {
      throw new Error('Failed to save fitness profile');
    }

    updateProgressBar(40, 'Calculating macros...');

    // Step 3: Calculate macros (frontend calculation, then post)
    const macros = calculateMacros(formData);

    const step3Response = await saveStep(3, sessionToken, {
      calculated_macros: macros,
    });

    if (!step3Response.ok) {
      throw new Error('Failed to save calculated macros');
    }

    updateProgressBar(60, 'Preparing payment...');

    return {
      success: true,
      sessionToken: sessionToken,
      formData: formData,
    };
  } catch (error) {
    console.error('Error saving form data:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Save individual step to backend
 * POST /api/v1/calculator/step/{n}
 */
async function saveStep(stepNumber, sessionToken, data) {
  return fetch(`/api/v1/calculator/step/${stepNumber}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_token: sessionToken,
      data: data,
    }),
  });
}

// ============================================================
// MACRO CALCULATIONS
// ============================================================

/**
 * Calculate macros using Mifflin-St Jeor formula
 * Per SUBMISSION_FLOW_COMPLETE.md Step 3
 */
function calculateMacros(formData) {
  // Convert height to cm
  let heightCm;
  if (formData.height_unit === 'inches') {
    heightCm = formData.height * 2.54;
  } else {
    heightCm = formData.height;
  }

  // Convert weight to kg
  let weightKg;
  if (formData.weight_unit === 'lbs') {
    weightKg = formData.weight / 2.20462;
  } else {
    weightKg = formData.weight;
  }

  // Mifflin-St Jeor BMR formula
  const sexMultiplier = formData.sex === 'male' ? 5 : -161;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * formData.age + sexMultiplier;

  // Activity multipliers
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extreme: 1.9,
  };

  const multiplier = activityMultipliers[formData.lifestyle_activity] || 1.55;
  let tdee = bmr * multiplier;

  // Apply deficit if goal is lose
  if (formData.goal === 'lose' && formData.deficit_percentage) {
    tdee = tdee * (1 - formData.deficit_percentage / 100);
  } else if (formData.goal === 'gain' && formData.deficit_percentage) {
    tdee = tdee * (1 + formData.deficit_percentage / 100);
  }

  // Calculate macros (carnivore defaults)
  const calories = Math.round(tdee);
  const proteinPercent = 30;
  const fatPercent = 65;
  const carbsPercent = 5;

  const proteinGrams = Math.round((calories * proteinPercent) / 400); // 4 cal/g
  const fatGrams = Math.round((calories * fatPercent) / 900); // 9 cal/g
  const carbsGrams = Math.round((calories * carbsPercent) / 400); // 4 cal/g

  return {
    calories: calories,
    protein_grams: proteinGrams,
    fat_grams: fatGrams,
    carbs_grams: carbsGrams,
    protein_percentage: proteinPercent,
    fat_percentage: fatPercent,
    carbs_percentage: carbsPercent,
    calculation_method: 'mifflin-st-jeor',
    activity_multiplier: multiplier,
    tdee_before_deficit: Math.round(bmr * multiplier),
    calculation_timestamp: new Date().toISOString(),
  };
}

/**
 * Convert height to feet (for API)
 */
function convertHeightToFeet(height, unit) {
  if (unit === 'inches') {
    return Math.floor(height / 12);
  }
  // cm to inches to feet
  const inches = height / 2.54;
  return Math.floor(inches / 12);
}

/**
 * Convert height to inches (for API)
 */
function convertHeightToInches(height, unit) {
  if (unit === 'inches') {
    return height % 12;
  }
  // cm to inches, then remainder
  const inches = height / 2.54;
  return Math.round(inches % 12);
}

// ============================================================
// PREMIUM/PAYMENT STATUS
// ============================================================

/**
 * Check if user already has premium/paid
 */
async function checkPremiumStatus(sessionToken) {
  try {
    const response = await fetch('/api/v1/calculator/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_token: sessionToken,
      }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    return data.is_premium === true;
  } catch (error) {
    console.error('Error checking premium status:', error);
    return false;
  }
}

// ============================================================
// PAYMENT FLOW
// ============================================================

/**
 * Show payment modal with tier options
 * Fetches available payment tiers and displays them
 */
async function showPaymentModal(sessionToken, formData) {
  try {
    // Fetch available tiers from Step 3 response
    const tiersResponse = await fetch('/api/v1/calculator/payment/tiers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let tiers = [];
    if (tiersResponse.ok) {
      const tiersData = await tiersResponse.json();
      tiers = tiersData.tiers || [];
    }

    // Fallback tiers if API fails
    if (tiers.length === 0) {
      tiers = getDefaultTiers();
    }

    // Render tiers in modal
    const tierOptionsDiv = document.getElementById('tier-options');
    tierOptionsDiv.innerHTML = '';

    tiers.forEach((tier) => {
      const tierButton = document.createElement('button');
      tierButton.type = 'button';
      tierButton.className = 'tier-option-button';
      tierButton.innerHTML = `
        <div class="tier-name">${tier.tier_title}</div>
        <div class="tier-price">${tier.price_display}</div>
        <div class="tier-features">${tier.features_summary || ''}</div>
      `;

      tierButton.addEventListener('click', () => {
        handleTierSelection(sessionToken, formData, tier);
      });

      tierOptionsDiv.appendChild(tierButton);
    });

    // Show modal
    const paymentModal = document.getElementById('payment-modal');
    paymentModal.classList.add('active');
  } catch (error) {
    console.error('Error showing payment modal:', error);
    alert('Unable to load payment options. Please try again.');
  }
}

/**
 * Handle tier selection and initiate Stripe payment
 */
async function handleTierSelection(sessionToken, formData, tier) {
  try {
    // Hide modal
    const paymentModal = document.getElementById('payment-modal');
    paymentModal.classList.remove('active');

    updateProgressBar(70, 'Initializing payment...');

    // Save health profile before payment (Step 4 partial)
    await saveStep(4, sessionToken, {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
    });

    // Initiate Stripe payment
    const paymentResponse = await fetch('/api/v1/calculator/payment/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_token: sessionToken,
        tier_id: tier.id,
        customer_email: formData.email,
        success_url: `${window.location.origin}/calculator/payment-success`,
        cancel_url: `${window.location.origin}/calculator/payment-cancel`,
      }),
    });

    if (!paymentResponse.ok) {
      throw new Error('Failed to initiate payment');
    }

    const paymentData = await paymentResponse.json();

    updateProgressBar(85, 'Redirecting to payment...');

    // Store tier info in session for after-payment
    sessionStorage.setItem('selectedTier', JSON.stringify(tier));

    // Redirect to Stripe checkout
    setTimeout(() => {
      window.location.href = paymentData.stripe_session_url;
    }, 1000);
  } catch (error) {
    console.error('Payment initiation error:', error);
    alert(`Payment error: ${error.message}`);
    hideProgressBar();
  }
}

// ============================================================
// POST-PAYMENT HANDLERS
// ============================================================

/**
 * Handle payment redirect (success or cancel)
 * Called on page load if ?payment=success or ?payment=cancel
 */
function handlePaymentRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const paymentStatus = urlParams.get('payment');
  const stripeSessionId = urlParams.get('session_id');

  if (paymentStatus === 'success' && stripeSessionId) {
    handlePaymentSuccess(stripeSessionId);
  } else if (paymentStatus === 'cancel') {
    handlePaymentCancel();
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(stripeSessionId) {
  try {
    showProgressBar();
    updateProgressBar(85, 'Verifying payment...');

    const sessionToken = sessionStorage.getItem('calculatorSessionToken');

    // Verify payment with backend
    const verifyResponse = await fetch('/api/v1/calculator/payment/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_token: sessionToken,
        stripe_session_id: stripeSessionId,
      }),
    });

    if (!verifyResponse.ok) {
      throw new Error('Payment verification failed');
    }

    const verifyData = await verifyResponse.json();

    updateProgressBar(95, 'Finalizing your report...');

    // Get form data from session or form
    const formData = collectFormData();

    // Initialize report generation
    await initializeReportGeneration(sessionToken, formData);

    // Redirect to report page
    setTimeout(() => {
      const accessToken = verifyData.report_access_token;
      window.location.href = `/calculator/report?access_token=${accessToken}`;
    }, 1500);
  } catch (error) {
    console.error('Payment success handler error:', error);
    alert(`Error: ${error.message}`);
    hideProgressBar();
  }
}

/**
 * Handle payment cancellation
 */
function handlePaymentCancel() {
  hideProgressBar();
  alert('Payment was cancelled. Please try again to complete your report.');
}

/**
 * Initialize report generation after payment
 * POST /api/v1/calculator/report/init
 */
async function initializeReportGeneration(sessionToken, formData) {
  try {
    const reportResponse = await fetch('/api/v1/calculator/report/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        session_token: sessionToken,
      }),
    });

    if (!reportResponse.ok) {
      throw new Error('Failed to initialize report generation');
    }

    const reportData = await reportResponse.json();

    // Store report info in session
    sessionStorage.setItem('reportAccessToken', reportData.access_token);
    sessionStorage.setItem('reportId', reportData.report_id);

    return reportData;
  } catch (error) {
    console.error('Report initialization error:', error);
    throw error;
  }
}

// ============================================================
// PROGRESS BAR UI
// ============================================================

function showProgressBar() {
  const wrapper = document.getElementById('progress-bar-wrapper');
  if (wrapper) {
    wrapper.classList.add('active');
  }
}

function hideProgressBar() {
  const wrapper = document.getElementById('progress-bar-wrapper');
  if (wrapper) {
    wrapper.classList.remove('active');
  }
}

function updateProgressBar(percentage, label) {
  const fill = document.getElementById('progress-fill');
  const labelElem = document.getElementById('progress-label');
  const percentElem = document.getElementById('progress-percentage');

  if (fill) {
    fill.style.width = `${Math.min(percentage, 100)}%`;
  }

  if (labelElem) {
    labelElem.textContent = label;
  }

  if (percentElem) {
    percentElem.textContent = `${Math.min(percentage, 100)}%`;
  }
}

// ============================================================
// FALLBACK TIERS (if API unavailable)
// ============================================================

function getDefaultTiers() {
  return [
    {
      id: 'tier-bundle',
      tier_slug: 'bundle',
      tier_title: 'Bundle - $9.99',
      price_display: '$9.99',
      features_summary: 'Basic report + email delivery',
    },
    {
      id: 'tier-meal-plan',
      tier_slug: 'meal-plan',
      tier_title: 'Meal Plan - $27.00',
      price_display: '$27.00',
      features_summary: 'Macros + meal plans + 10 recipes',
    },
    {
      id: 'tier-shopping',
      tier_slug: 'shopping',
      tier_title: 'Shopping - $19.00',
      price_display: '$19.00',
      features_summary: 'Macros + shopping list + prep guide',
    },
    {
      id: 'tier-doctor',
      tier_slug: 'doctor',
      tier_title: 'Doctor - $15.00',
      price_display: '$15.00',
      features_summary: 'Medical context + drug interactions',
    },
  ];
}
