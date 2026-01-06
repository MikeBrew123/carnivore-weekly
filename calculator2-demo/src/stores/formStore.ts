import { create } from 'zustand'
import { FormData, MacroResults } from '../types/form'

interface FormStore {
  form: FormData
  macros: MacroResults | null
  currentStep: number
  units: 'imperial' | 'metric'
  isPremium: boolean
  sessionToken: string | null
  isDirty: boolean

  setFormField: (field: keyof FormData, value: unknown) => void
  setMacros: (macros: MacroResults) => void
  setCurrentStep: (step: number) => void
  setUnits: (units: 'imperial' | 'metric') => void
  setIsPremium: (premium: boolean) => void
  setSessionToken: (token: string) => void
  setForm: (form: Partial<FormData>) => void
  markDirty: () => void
  markClean: () => void
  resetForm: () => void
}

const defaultForm: FormData = {
  // Step 1: Basic
  sex: undefined,
  age: undefined,
  heightFeet: undefined,
  heightInches: undefined,
  weight: undefined,

  // Step 2: Activity
  lifestyle: undefined,
  exercise: undefined,

  // Step 3: Goals & Diet
  goal: undefined,
  deficit: undefined,
  diet: undefined,
  ratio: undefined,

  // Step 4: Health (Premium)
  email: '', // Users must provide their own email during checkout
  firstName: '', // User enters their name during payment
  lastName: '', // User enters their name during payment
  medications: '',
  conditions: [],
  allergies: '',
  avoidFoods: '',

  // Step 5: Preferences (Premium)
  previousDiets: '',
  whatWorked: '',
  carnivoreExperience: undefined,
  selectedProtocol: undefined,
  goals: [],
  biggestChallenge: '',
  cookingSkill: undefined,
  budget: undefined,
  familySituation: undefined,
  workTravel: undefined,
  additionalNotes: '',
}

export const useFormStore = create<FormStore>((set) => ({
  form: defaultForm,
  macros: null,
  currentStep: 1,
  units: 'imperial',
  isPremium: false,
  sessionToken: null,
  isDirty: false,

  setFormField: (field, value) =>
    set((state) => ({
      form: { ...state.form, [field]: value },
      isDirty: true,
    })),

  setMacros: (macros) => set({ macros }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setUnits: (units) => set({ units }),
  setIsPremium: (premium) => set({ isPremium: premium }),
  setSessionToken: (token) => set({ sessionToken: token }),

  setForm: (formUpdate) =>
    set((state) => ({
      form: { ...state.form, ...formUpdate },
      isDirty: true,
    })),

  markDirty: () => set({ isDirty: true }),
  markClean: () => set({ isDirty: false }),

  resetForm: () => set({ form: defaultForm, currentStep: 1, macros: null, isDirty: false }),
}))
