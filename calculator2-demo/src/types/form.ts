export interface FormData {
  sex: 'male' | 'female'
  age: number
  heightFeet?: number
  heightInches?: number
  heightCm?: number
  weight: number
  lifestyle: string
  exercise: string
  goal: 'lose' | 'maintain' | 'gain'
  deficit: number
  diet: 'carnivore' | 'pescatarian' | 'keto' | 'lowcarb'
  ratio?: string
  proteinMin?: string
  netCarbs?: number
  proteinSetting?: string
  email?: string
  firstName?: string
  lastName?: string
  medications?: string
  conditions?: string[]
  allergies?: string
  avoidFoods?: string
  previousDiets?: string
  whatWorked?: string
  carnivoreExperience?: string
  selectedProtocol?: string
  goals?: string[]
  biggestChallenge?: string
  cookingSkill?: string
  budget?: string
  familySituation?: string
  workTravel?: string
  additionalNotes?: string
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
