export interface FormData {
  // Step 1: Physical Stats
  sex: 'male' | 'female'
  age: number
  heightFeet?: number
  heightInches?: number
  heightCm?: number
  weight: number

  // Step 2: Fitness & Diet
  lifestyle: string
  exercise: string
  goal: 'lose' | 'maintain' | 'gain'
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
  calories: number
  tdee: number
  protein: number
  fat: number
  carbs: number
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
