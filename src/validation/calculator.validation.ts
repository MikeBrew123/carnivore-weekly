/**
 * Calculator Form Validation
 * Leo's Validation Layer: Type-safe field validation with detailed error tracking
 * Philosophy: "Validate early, fail loudly, fix fast"
 */

import { z } from 'zod';
import {
  Step1Schema,
  Step2Schema,
  Step4Schema,
  Step1Data,
  Step2Data,
  Step4Data,
  ValidationError,
} from '../types/calculator.types';

// ===== VALIDATION ERROR CODES =====

export enum ValidationErrorCode {
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  INVALID_TYPE = 'INVALID_TYPE',
  OUT_OF_RANGE = 'OUT_OF_RANGE',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_ENUM = 'INVALID_ENUM',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INCONSISTENT_HEIGHT = 'INCONSISTENT_HEIGHT',
  DEFICIT_REQUIRES_GOAL = 'DEFICIT_REQUIRES_GOAL',
  PREMIUM_REQUIRES_EMAIL = 'PREMIUM_REQUIRES_EMAIL',
  STEP_SEQUENCE_ERROR = 'STEP_SEQUENCE_ERROR',
}

// ===== CUSTOM VALIDATORS =====

/**
 * Validate that height is properly provided (either feet+inches OR cm)
 */
function validateHeight(data: any): boolean {
  const hasFeetInches = data.height_feet !== undefined && data.height_feet !== null &&
                        data.height_inches !== undefined && data.height_inches !== null;
  const hasCm = data.height_cm !== undefined && data.height_cm !== null;

  // Must provide one or the other, not both
  return (hasFeetInches || hasCm) && !(hasFeetInches && hasCm);
}

/**
 * Validate that deficit_percentage is only provided when goal is 'lose' or 'gain'
 */
function validateDeficitLogic(data: any): boolean {
  if (data.goal === 'maintain') {
    return data.deficit_percentage === undefined || data.deficit_percentage === null;
  }
  // For 'lose' and 'gain', deficit_percentage is optional but allowed
  return true;
}

/**
 * Validate age is reasonable
 */
function validateAge(age: number): boolean {
  return age >= 13 && age <= 150;
}

/**
 * Validate weight is reasonable based on unit
 */
function validateWeight(weight: number, unit: string): boolean {
  if (unit === 'lbs') {
    // Reasonable weight range in pounds: 50-700 lbs
    return weight >= 50 && weight <= 700;
  } else if (unit === 'kg') {
    // Reasonable weight range in kg: 25-320 kg
    return weight >= 25 && weight <= 320;
  }
  return false;
}

/**
 * Validate feet+inches height conversion
 */
function validateFeetInchesConversion(feet: number, inches: number): boolean {
  // Total height should be between 3'0" (36 inches) and 7'8" (92 inches)
  const totalInches = feet * 12 + inches;
  return totalInches >= 36 && totalInches <= 92;
}

/**
 * Validate email format (stricter than basic zod)
 */
function validateEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  return emailRegex.test(email) && email.length <= 255;
}

/**
 * Validate textarea fields (reasonable length, no binary/control characters)
 */
function validateTextarea(text: string | null | undefined, maxLength: number = 5000): boolean {
  if (!text) return true;
  if (text.length > maxLength) return false;

  // Allow printable characters, whitespace, common punctuation
  // Reject control characters, null bytes, etc.
  const allowedPattern = /^[\p{L}\p{N}\s\-.,;:!?()'"\/@&#%\$+=\[\]{}<>|~\\`^*_]/u;
  return allowedPattern.test(text);
}

// ===== VALIDATION FUNCTIONS =====

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate Step 1: Physical Stats
 */
export function validateStep1(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Parse with Zod for basic schema validation
  const result = Step1Schema.safeParse(data);
  if (!result.success) {
    result.error.errors.forEach((err) => {
      errors.push({
        field: err.path.join('.') || 'unknown',
        code: ValidationErrorCode.INVALID_TYPE,
        message: err.message,
        is_blocking: true,
      });
    });
  }

  // Custom validations
  if (data.sex && !['male', 'female'].includes(data.sex)) {
    errors.push({
      field: 'sex',
      code: ValidationErrorCode.INVALID_ENUM,
      message: 'Sex must be either "male" or "female"',
      is_blocking: true,
    });
  }

  if (data.age !== undefined && !validateAge(data.age)) {
    errors.push({
      field: 'age',
      code: ValidationErrorCode.OUT_OF_RANGE,
      message: 'Age must be between 13 and 150 years old',
      is_blocking: true,
    });
  }

  // Validate height (feet+inches OR cm, not both)
  const heightValid = validateHeight(data);
  if (!heightValid) {
    errors.push({
      field: 'height',
      code: ValidationErrorCode.INCONSISTENT_HEIGHT,
      message: 'Provide either height in feet+inches OR centimeters, not both or neither',
      is_blocking: true,
    });
  }

  // Validate feet+inches conversion
  if (data.height_feet !== undefined && data.height_inches !== undefined) {
    if (!validateFeetInchesConversion(data.height_feet, data.height_inches)) {
      errors.push({
        field: 'height',
        code: ValidationErrorCode.OUT_OF_RANGE,
        message: 'Height must be between 3\'0" and 7\'8"',
        is_blocking: true,
      });
    }
  }

  if (data.weight_value && !validateWeight(data.weight_value, data.weight_unit)) {
    errors.push({
      field: 'weight_value',
      code: ValidationErrorCode.OUT_OF_RANGE,
      message: `Weight out of reasonable range for ${data.weight_unit}`,
      is_blocking: true,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Step 2: Fitness & Diet
 */
export function validateStep2(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // Zod schema validation
  const result = Step2Schema.safeParse(data);
  if (!result.success) {
    result.error.errors.forEach((err) => {
      errors.push({
        field: err.path.join('.') || 'unknown',
        code: ValidationErrorCode.INVALID_TYPE,
        message: err.message,
        is_blocking: true,
      });
    });
  }

  // Validate deficit_percentage logic
  if (!validateDeficitLogic(data)) {
    errors.push({
      field: 'deficit_percentage',
      code: ValidationErrorCode.DEFICIT_REQUIRES_GOAL,
      message: 'Deficit percentage is only valid for "lose" or "gain" goals',
      is_blocking: true,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Step 4: Health Profile (Premium)
 */
export function validateStep4(data: any, isPremium: boolean = true): ValidationResult {
  const errors: ValidationError[] = [];

  // Zod schema validation
  const result = Step4Schema.safeParse(data);
  if (!result.success) {
    result.error.errors.forEach((err) => {
      const path = err.path.join('.');
      const isRequired = err.code === z.ZodErrorCode.invalid_type && !err.message.includes('optional');

      errors.push({
        field: path || 'unknown',
        code: isRequired ? ValidationErrorCode.MISSING_REQUIRED : ValidationErrorCode.INVALID_TYPE,
        message: err.message,
        is_blocking: isRequired && ['email', 'first_name', 'last_name'].includes(path),
      });
    });
  }

  // Email validation (required for premium)
  if (isPremium && !data.email) {
    errors.push({
      field: 'email',
      code: ValidationErrorCode.MISSING_REQUIRED,
      message: 'Email is required for premium features',
      is_blocking: true,
    });
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push({
      field: 'email',
      code: ValidationErrorCode.INVALID_EMAIL,
      message: 'Invalid email format',
      is_blocking: true,
    });
  }

  // Validate textarea fields
  if (data.medications && !validateTextarea(data.medications)) {
    errors.push({
      field: 'medications',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Medications field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  if (data.symptoms && !validateTextarea(data.symptoms)) {
    errors.push({
      field: 'symptoms',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Symptoms field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  if (data.other_symptoms && !validateTextarea(data.other_symptoms)) {
    errors.push({
      field: 'other_symptoms',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Other symptoms field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  if (data.allergies && !validateTextarea(data.allergies)) {
    errors.push({
      field: 'allergies',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Allergies field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  if (data.avoid_foods && !validateTextarea(data.avoid_foods)) {
    errors.push({
      field: 'avoid_foods',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Avoid foods field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  if (data.previous_diets && !validateTextarea(data.previous_diets)) {
    errors.push({
      field: 'previous_diets',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Previous diets field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  if (data.what_worked && !validateTextarea(data.what_worked)) {
    errors.push({
      field: 'what_worked',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'What worked field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  if (data.biggest_challenge && !validateTextarea(data.biggest_challenge)) {
    errors.push({
      field: 'biggest_challenge',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Biggest challenge field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  if (data.additional_notes && !validateTextarea(data.additional_notes)) {
    errors.push({
      field: 'additional_notes',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Additional notes field contains invalid characters or exceeds length limit',
      is_blocking: false,
    });
  }

  // Validate health conditions array
  if (data.conditions && Array.isArray(data.conditions)) {
    const validConditions = ['diabetes', 'hypertension', 'thyroid', 'autoimmune', 'guthealth', 'inflammation', 'other'];
    data.conditions.forEach((condition: string) => {
      if (!validConditions.includes(condition)) {
        errors.push({
          field: 'conditions',
          code: ValidationErrorCode.INVALID_ENUM,
          message: `Invalid condition: "${condition}"`,
          is_blocking: false,
        });
      }
    });
  }

  // Validate goals array
  if (data.goals && Array.isArray(data.goals)) {
    const validGoals = ['weightloss', 'mental', 'guthealth', 'inflammation', 'energy', 'athletic', 'hormones'];
    data.goals.forEach((goal: string) => {
      if (!validGoals.includes(goal)) {
        errors.push({
          field: 'goals',
          code: ValidationErrorCode.INVALID_ENUM,
          message: `Invalid goal: "${goal}"`,
          is_blocking: false,
        });
      }
    });
  }

  return {
    isValid: errors.filter((e) => e.is_blocking).length === 0,
    errors,
  };
}

/**
 * Validate payment tier ID (exists in system)
 */
export async function validateTierId(
  tierId: string,
  supabaseClient: any
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  try {
    const { data, error } = await supabaseClient
      .from('payment_tiers')
      .select('id')
      .eq('id', tierId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      errors.push({
        field: 'tier_id',
        code: ValidationErrorCode.INVALID_ENUM,
        message: 'Invalid or inactive payment tier',
        is_blocking: true,
      });
    }
  } catch (err) {
    errors.push({
      field: 'tier_id',
      code: 'VALIDATION_ERROR',
      message: 'Failed to validate tier ID',
      is_blocking: true,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate session token format
 */
export function validateSessionToken(token: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!token || token.length < 32) {
    errors.push({
      field: 'session_token',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Invalid session token format',
      is_blocking: true,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate access token (report access)
 */
export function validateAccessToken(token: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!token || token.length !== 64) {
    errors.push({
      field: 'access_token',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Invalid access token format (must be 64 characters)',
      is_blocking: true,
    });
  }

  if (!/^[a-f0-9]{64}$/i.test(token)) {
    errors.push({
      field: 'access_token',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Access token must be hexadecimal',
      is_blocking: true,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate Stripe payment intent ID
 */
export function validateStripePaymentIntentId(id: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (!id || !id.startsWith('pi_')) {
    errors.push({
      field: 'stripe_payment_intent_id',
      code: ValidationErrorCode.INVALID_FORMAT,
      message: 'Invalid Stripe payment intent ID format',
      is_blocking: true,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
