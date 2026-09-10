export interface FormData {
  // Step 1: Physical Stats
  sex: 'male' | 'female'
  age: number
  heightFeet?: number
  heightInches?: number
  heightCm?: number
  weight: number
  weightKg?: number

  // Goal weight (optional). Protein is calculated off this when present.
  // goalWeight is always lbs; goalWeightKg is the metric display value.
  goalWeight?: number
  goalWeightKg?: number

  // Step 2: Fitness & Diet
  lifestyle: string
  exercise: string
  goal: 'lose' | 'maintain' | 'gain'
  // Set ONLY when the customer has been shown a contradiction between `goal` and
  // `goals` and has explicitly chosen which should set their calorie target.
  // The worker accepts the literal boolean true and nothing else.
  primaryGoalConfirmed?: boolean
  // Audit trail: when the customer answered. Informational only, never consulted
  // for the decision itself, which is primaryGoalConfirmed === true.
  primaryGoalConfirmedAt?: string
  deficit: number
  diet: 'carnivore' | 'pescatarian' | 'keto' | 'lowcarb'
  ratio?: string
  proteinMin?: string
  netCarbs?: number
  proteinSetting?: string

  // Step 3 - Calculated
  // (not form input, calculated from steps 1-2)

  // Step 4: Complete Health Profile
  email?: string
  firstName?: string
  lastName?: string

  // Health Conditions
  medications?: string
  conditions?: string[]
  otherConditions?: string
  symptoms?: string
  otherSymptoms?: string

  // Dietary Restrictions
  allergies?: string
  avoidFoods?: string
  dairyTolerance?: 'none' | 'butter-only' | 'some' | 'full'

  // Diet History
  previousDiets?: string
  whatWorked?: string
  carnivoreExperience?: 'new' | 'weeks' | 'months' | 'years'

  // Lifestyle
  cookingSkill?: 'beginner' | 'intermediate' | 'advanced'
  mealPrepTime?: 'minimal' | 'some' | 'lots'
  budget?: 'tight' | 'moderate' | 'flexible'
  familySituation?: 'solo' | 'partner' | 'family-with-kids' | 'large-household'
  workTravel?: 'office' | 'remote' | 'shift-work' | 'travel'

  // Goals & Challenges
  goals?: string[]
  biggestChallenge?: string
  additionalNotes?: string

  // Misc (legacy)
  selectedProtocol?: string
}

export interface MacroResults {
  /**
   * null when targetSuppressed is true. Never fall back to a number here: the
   * whole point of suppression is that no calorie target exists to size a meal
   * plan, a sample day or a report from.
   */
  calories: number | null
  tdee: number
  protein: number | null
  fat: number | null
  carbs: number | null
  /** True when maintenance is at or below the self-service floor. */
  targetSuppressed: boolean
  suppressionReason?: string
  /** The product floor that applied to this profile (1200 female / 1500 male). */
  selfServiceFloor: number
  /** True when the requested deficit was capped up to the floor. */
  floorApplied: boolean
  requestedDeficitPct: number
  /** What the displayed target actually represents. Never assume the requested %. */
  effectiveDeficitPct: number
}

export interface SessionData {
  id: string
  session_token: string
  form_state?: FormData
  macro_data?: MacroResults
  payment_status?: 'pending' | 'paid' | 'failed'
  pricing_tier?: 'bundle' | 'meal_plan' | 'shopping' | 'doctor'
  amount_paid?: number
  report_token?: string
  created_at: string
  last_active_at: string
}
