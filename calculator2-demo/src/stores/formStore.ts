import { create } from 'zustand'
import { FormData, MacroResults } from '../types/form'

interface FormStore {
  form: FormData
  macros: MacroResults | null
  currentStep: number
  units: 'imperial' | 'metric'
  isPremium: boolean
  sessionToken: string | null
  
  setFormField: (field: keyof FormData, value: unknown) => void
  setMacros: (macros: MacroResults) => void
  setCurrentStep: (step: number) => void
  setUnits: (units: 'imperial' | 'metric') => void
  setIsPremium: (premium: boolean) => void
  setSessionToken: (token: string) => void
  setForm: (form: Partial<FormData>) => void
  resetForm: () => void
}

const defaultForm: FormData = {
  // Step 1: Basic
  sex: 'male',
  age: 42,
  heightFeet: 5,
  heightInches: 11,
  weight: 215,

  // Step 2: Activity
  lifestyle: '1.2',
  exercise: '0.1',

  // Step 3: Goals & Diet
  goal: 'lose',
  deficit: 25,
  diet: 'carnivore',
  ratio: '75-25',

  // Step 4: Health (Premium)
  email: '', // Users must provide their own email during checkout
  firstName: '', // User enters their name during payment
  lastName: '', // User enters their name during payment
  medications: 'Metformin 500mg twice daily, Lisinopril 10mg for blood pressure',
  conditions: ['diabetes', 'guthealth', 'inflammation'],
  allergies: 'Shellfish (anaphylaxis), tree nuts',
  avoidFoods: 'Pork (causes bloating and GI distress), chicken thighs (inflammatory response), dairy except butter, seed oils, vegetable oils, peanuts, legumes',

  // Step 5: Preferences (Premium)
  previousDiets: 'Standard American diet for 20 years (caused prediabetes and chronic inflammation). Tried low-fat diet 2012-2015 (made energy worse). Did keto for 14 months (great results but fell off). Recently did "healthy whole grains" nonsense for 2 years (blood sugar went out of control, gained 40lbs, severe brain fog and joint pain).',
  carnivoreExperience: 'months',
  selectedProtocol: 'carnivore',
  goals: ['weightloss', 'mental', 'guthealth'],
  additionalNotes: 'Serious about this time. Have young kids and want to be around to see them grow up. Already seeing family members go through health decline. Mostly want beef (ribeye, ground beef), some salmon and halibut. Open to organ meats (liver is fine). Cannot do pork or chicken. Want simple protocols, no complicated supplements. Have GI issues from years of sugar and processed foods - need gentle transition plan. Blood sugar readings have been 180-220 fasting. Doctor says pre-diabetic but I know I can reverse this with proper diet.',
}

export const useFormStore = create<FormStore>((set) => ({
  form: defaultForm,
  macros: null,
  currentStep: 1,
  units: 'imperial',
  isPremium: false,
  sessionToken: null,

  setFormField: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value },
    })),

  setMacros: (macros) => set({ macros }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setUnits: (units) => set({ units }),
  setIsPremium: (premium) => set({ isPremium: premium }),
  setSessionToken: (token) => set({ sessionToken: token }),
  
  setForm: (formUpdate) =>
    set((state) => ({
      form: { ...state.form, ...formUpdate },
    })),

  resetForm: () => set({ form: defaultForm, currentStep: 1, macros: null }),
}))
