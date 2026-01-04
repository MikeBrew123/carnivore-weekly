/**
 * Calculator Types & Interfaces
 * Leo's Domain Model: All 25+ form fields with strict typing
 * Philosophy: "Type safety is data integrity at compile time"
 */

import { z } from 'zod';

// ===== ENUMS =====

export enum Sex {
  MALE = 'male',
  FEMALE = 'female'
}

export enum LifestyleActivity {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  VERY = 'very',
  EXTREME = 'extreme'
}

export enum ExerciseFrequency {
  NONE = 'none',
  ONE_TWO = '1-2',
  THREE_FOUR = '3-4',
  FIVE_SIX = '5-6',
  SEVEN = '7'
}

export enum Goal {
  LOSE = 'lose',
  MAINTAIN = 'maintain',
  GAIN = 'gain'
}

export enum DietType {
  CARNIVORE = 'carnivore',
  PESCATARIAN = 'pescatarian',
  KETO = 'keto',
  LOWCARB = 'lowcarb'
}

export enum HealthCondition {
  DIABETES = 'diabetes',
  HYPERTENSION = 'hypertension',
  THYROID = 'thyroid',
  AUTOIMMUNE = 'autoimmune',
  GUTHEALTH = 'guthealth',
  INFLAMMATION = 'inflammation',
  OTHER = 'other'
}

export enum DairyTolerance {
  NONE = 'none',
  BUTTER_ONLY = 'butter-only',
  SOME = 'some',
  FULL = 'full'
}

export enum CarnivoreExperience {
  NEW = 'new',
  WEEKS = 'weeks',
  MONTHS = 'months',
  YEARS = 'years'
}

export enum CookingSkill {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced'
}

export enum MealPrepTime {
  MINIMAL = 'minimal',
  SOME = 'some',
  LOTS = 'lots'
}

export enum Budget {
  TIGHT = 'tight',
  MODERATE = 'moderate',
  FLEXIBLE = 'flexible'
}

export enum FamilySituation {
  SOLO = 'solo',
  PARTNER = 'partner',
  FAMILY_WITH_KIDS = 'family-with-kids',
  LARGE_HOUSEHOLD = 'large-household'
}

export enum WorkTravel {
  OFFICE = 'office',
  REMOTE = 'remote',
  SHIFT_WORK = 'shift-work',
  TRAVEL = 'travel'
}

export enum Goal_Type {
  WEIGHTLOSS = 'weightloss',
  MENTAL = 'mental',
  GUTHEALTH = 'guthealth',
  INFLAMMATION = 'inflammation',
  ENERGY = 'energy',
  ATHLETIC = 'athletic',
  HORMONES = 'hormones'
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum WeightUnit {
  LBS = 'lbs',
  KG = 'kg'
}

// ===== PAYMENT TIER INTERFACE =====

export interface PaymentTier {
  id: string;
  tier_slug: string;
  tier_title: string;
  description?: string;
  price_cents: number;
  currency: string;
  stripe_product_id?: string;
  stripe_price_id?: string;
  features: Record<string, any>;
  is_active: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

// ===== STEP 1: PHYSICAL STATS =====

export const Step1Schema = z.object({
  sex: z.enum(['male', 'female']).describe('Biological sex'),
  age: z.number().int().min(13).max(150).describe('Age in years'),
  height_feet: z.number().int().min(3).max(9).nullable().optional().describe('Feet component (if using imperial)'),
  height_inches: z.number().int().min(0).max(11).nullable().optional().describe('Inches component (if using imperial)'),
  height_cm: z.number().int().min(90).max(280).nullable().optional().describe('Height in centimeters'),
  weight_value: z.number().positive().describe('Weight value'),
  weight_unit: z.enum(['lbs', 'kg']).describe('Weight unit'),
});

export type Step1Data = z.infer<typeof Step1Schema>;

// ===== STEP 2: FITNESS & DIET =====

export const Step2Schema = z.object({
  lifestyle_activity: z.enum(['sedentary', 'light', 'moderate', 'very', 'extreme']).describe('Activity level'),
  exercise_frequency: z.enum(['none', '1-2', '3-4', '5-6', '7']).describe('Days per week exercising'),
  goal: z.enum(['lose', 'maintain', 'gain']).describe('Weight management goal'),
  deficit_percentage: z.union([
    z.literal(15),
    z.literal(20),
    z.literal(25)
  ]).nullable().optional().describe('Caloric deficit percentage (only for lose/gain)'),
  diet_type: z.enum(['carnivore', 'pescatarian', 'keto', 'lowcarb']).describe('Dietary preference'),
});

export type Step2Data = z.infer<typeof Step2Schema>;

// ===== STEP 3: CALCULATED RESULTS (output only) =====

export interface MacroCalculation {
  calories: number;
  protein_grams: number;
  fat_grams: number;
  carbs_grams: number;
  protein_percentage: number;
  fat_percentage: number;
  carbs_percentage: number;
  calculation_method: string;
  calculation_timestamp: Date;
}

export interface Step3Data {
  calculated_macros: MacroCalculation;
}

// ===== STEP 4: HEALTH PROFILE (PREMIUM) =====

export const Step4Schema = z.object({
  // Contact
  email: z.string().email().describe('Email address (required)'),
  first_name: z.string().min(1).max(100).describe('First name'),
  last_name: z.string().min(1).max(100).describe('Last name'),

  // Health
  medications: z.string().max(5000).nullable().optional().describe('Current medications'),
  conditions: z.array(z.string()).describe('Health conditions'),
  other_conditions: z.string().max(1000).nullable().optional().describe('Other health conditions'),
  symptoms: z.string().max(5000).nullable().optional().describe('Current symptoms'),
  other_symptoms: z.string().max(1000).nullable().optional().describe('Other symptoms'),

  // Dietary
  allergies: z.string().max(1000).nullable().optional().describe('Food allergies'),
  avoid_foods: z.string().max(1000).nullable().optional().describe('Foods to avoid'),
  dairy_tolerance: z.enum(['none', 'butter-only', 'some', 'full']).nullable().optional().describe('Dairy tolerance level'),

  // History
  previous_diets: z.string().max(2000).nullable().optional().describe('Previous diets tried'),
  what_worked: z.string().max(2000).nullable().optional().describe('What worked in the past'),
  carnivore_experience: z.enum(['new', 'weeks', 'months', 'years']).nullable().optional().describe('Carnivore diet experience level'),

  // Lifestyle
  cooking_skill: z.enum(['beginner', 'intermediate', 'advanced']).nullable().optional().describe('Cooking skill level'),
  meal_prep_time: z.enum(['minimal', 'some', 'lots']).nullable().optional().describe('Available meal prep time'),
  budget: z.enum(['tight', 'moderate', 'flexible']).nullable().optional().describe('Food budget'),
  family_situation: z.enum(['solo', 'partner', 'family-with-kids', 'large-household']).nullable().optional().describe('Family situation'),
  work_travel: z.enum(['office', 'remote', 'shift-work', 'travel']).nullable().optional().describe('Work/travel situation'),

  // Goals
  goals: z.array(z.string()).describe('Health/fitness goals'),
  biggest_challenge: z.string().max(2000).nullable().optional().describe('Biggest challenge'),
  additional_notes: z.string().max(5000).nullable().optional().describe('Additional notes'),
});

export type Step4Data = z.infer<typeof Step4Schema>;

// ===== COMPLETE SESSION DATA =====

export interface CalculatorSession {
  // Metadata
  id: string;
  session_token: string;
  step_completed: number;
  is_premium: boolean;

  // Step 1
  sex?: string;
  age?: number;
  height_feet?: number;
  height_inches?: number;
  height_cm?: number;
  weight_value?: number;
  weight_unit?: string;

  // Step 2
  lifestyle_activity?: string;
  exercise_frequency?: string;
  goal?: string;
  deficit_percentage?: number;
  diet_type?: string;

  // Step 3
  calculated_macros?: MacroCalculation;

  // Step 4
  email?: string;
  first_name?: string;
  last_name?: string;
  medications?: string;
  conditions?: string[];
  other_conditions?: string;
  symptoms?: string;
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

  // Payment
  tier_id?: string;
  payment_status: string;
  stripe_payment_intent_id?: string;
  amount_paid_cents?: number;

  // Timestamps
  created_at: Date;
  updated_at: Date;
  paid_at?: Date;
  completed_at?: Date;
}

// ===== API REQUEST SCHEMAS =====

export const CreateSessionRequestSchema = z.object({
  // Optional: initial session metadata
  referrer: z.string().optional(),
  utm_source: z.string().optional(),
  utm_campaign: z.string().optional(),
});

export const SaveStep1RequestSchema = z.object({
  session_token: z.string(),
  data: Step1Schema,
});

export const SaveStep2RequestSchema = z.object({
  session_token: z.string(),
  data: Step2Schema,
});

export const SaveStep3RequestSchema = z.object({
  session_token: z.string(),
  calculated_macros: z.object({
    calories: z.number().positive(),
    protein_grams: z.number().positive(),
    fat_grams: z.number().positive(),
    carbs_grams: z.number().positive(),
    protein_percentage: z.number().min(0).max(100),
    fat_percentage: z.number().min(0).max(100),
    carbs_percentage: z.number().min(0).max(100),
    calculation_method: z.string(),
  }),
});

export const InitiatePaymentRequestSchema = z.object({
  session_token: z.string(),
  tier_id: z.string(),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

export const VerifyPaymentRequestSchema = z.object({
  session_token: z.string(),
  stripe_payment_intent_id: z.string(),
});

export const SaveStep4RequestSchema = z.object({
  session_token: z.string(),
  data: Step4Schema,
});

export const GetReportRequestSchema = z.object({
  access_token: z.string().length(64),
});

// ===== API RESPONSE SCHEMAS =====

export interface CreateSessionResponse {
  session_token: string;
  session_id: string;
  created_at: Date;
}

export interface SaveStepResponse {
  session_token: string;
  step_completed: number;
  next_step: number | null;
}

export interface PaymentInitiationResponse {
  stripe_session_url: string;
  payment_intent_id: string;
  created_at: Date;
}

export interface GenerateReportResponse {
  access_token: string;
  report_url: string;
  expires_at: Date;
  created_at: Date;
}

export interface GetReportResponse {
  report_html: string;
  report_json?: Record<string, any>;
  generated_at: Date;
  expires_at: Date;
}

// ===== ERROR TYPES =====

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  is_blocking: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  request_id?: string;
}
