/**
 * Macro calculation utilities.
 *
 * calculateMacrosCanonical() is THE calculation — a line-for-line port of the
 * worker's calculateMacros (api/calculator-api.js), which prices every paid
 * report. CI enforces parity between the two over 1,000+ input cases
 * (tests/macro_parity/), so the free results screen and the $29 report can
 * never disagree again. If you change the math, change BOTH sides and
 * regenerate the golden file, or CI fails.
 *
 * The older calculateBMR/calculateTDEE/calculateMacros exports below are the
 * pre-unification implementations, kept only so untouched components compile.
 * Do not add new callers.
 */

export interface CanonicalMacros {
  calories: number
  protein: number
  fat: number
  carbs: number
  tdee: number
}

// Exact port of api/calculator-api.js calculateMacros (2026-08-30).
// Differences from the old client math, all deliberate:
//  - BMI >= 30 bases protein on reference weight at BMI 25, not total weight
//    (2g/kg of total told a 312 lb customer to eat 283g/day - ISSUE-069)
//  - unknown activity keys fall back to 1.2, never 1.55 (overestimating burn
//    for a weight-loss customer is the documented failure mode)
//  - accepts the exercise field as an activity fallback + none/active/veryactive aliases
//  - keto gets 2g/kg protein + 20g carbs + fat fills (was a 25%/65% ratio split)
//  - lowcarb is treated as a low-carb diet (2g/kg protein), matching the report
export function calculateMacrosCanonical(formData: Record<string, unknown>): CanonicalMacros {
  const fd = formData || {}
  const weight = Number(fd.weight) || 200
  const heightFeet = Number(fd.heightFeet) || 6
  const heightInches = Number(fd.heightInches) || 0
  const heightCm = Number(fd.heightCm) || 0
  const age = Number(fd.age) || 30
  const sex = String(fd.sex || 'male').toLowerCase()
  const goal = String(fd.goal || 'maintain').toLowerCase().trim()
  const isLose = goal === 'lose' || goal === 'loss'
  const isGain = goal === 'gain'
  const rawDiet = String(fd.diet || fd.selectedProtocol || 'carnivore')
  const diet = rawDiet.toLowerCase().trim()
  const activityKey = String(fd.lifestyle || fd.exercise || 'moderate').toLowerCase().trim()

  const weightKg = weight * 0.453592
  const heightCmVal = heightCm || ((heightFeet || 6) * 12 + (heightInches || 0)) * 2.54

  const bmr = sex === 'male'
    ? 10 * weightKg + 6.25 * heightCmVal - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCmVal - 5 * age - 161

  const activityMap: Record<string, number> = {
    none: 1.2, sedentary: 1.2, light: 1.375, moderate: 1.55,
    very: 1.725, active: 1.725, extreme: 1.9, veryactive: 1.9,
  }
  const multiplier = activityMap[activityKey] || 1.2
  const tdee = bmr * multiplier

  const deficitPct = parseFloat(String(fd.deficit)) || (isLose ? 20 : isGain ? 10 : 0)
  let calories = tdee
  if (isLose) calories = tdee * (1 - deficitPct / 100)
  if (isGain) calories = tdee * (1 + deficitPct / 100)

  let protein: number, fat: number, carbs: number
  const isLowCarbDiet = ['carnivore', 'lion', 'pescatarian', 'keto', 'strict carnivore', 'lowcarb', 'low-carb', 'low carb'].includes(diet)

  if (isLowCarbDiet) {
    const heightM = heightCmVal / 100
    const bmi = weightKg / (heightM * heightM)
    const proteinBasisKg = bmi >= 30 ? 25 * heightM * heightM : weightKg
    protein = Math.round(proteinBasisKg * 2)
    const proteinCals = protein * 4
    // Keto and Low-Carb get a 20g carb budget; carnivore/lion/pescatarian are
    // the zero-carb diets (Brew, 2026-08-30). Must mirror the worker exactly.
    if (diet === 'keto' || diet === 'lowcarb' || diet === 'low-carb' || diet === 'low carb') {
      carbs = 20
      fat = Math.round((calories - proteinCals - carbs * 4) / 9)
    } else {
      carbs = 0
      fat = Math.round((calories - proteinCals) / 9)
    }
  } else {
    protein = Math.round(weightKg * 1.6)
    const proteinCals = protein * 4
    const fatCals = calories * 0.3
    fat = Math.round(fatCals / 9)
    carbs = Math.round((calories - proteinCals - fatCals) / 4)
  }

  return {
    calories: Math.round(calories),
    protein,
    fat,
    carbs,
    tdee: Math.round(tdee),
  }
}

export function calculateBMR(sex: 'male' | 'female', age: number, weight: number, heightCm: number): number {
  // Convert weight from lbs to kg (weight input is always in lbs from form)
  const weightKg = weight * 0.453592

  if (sex === 'male') {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  } else {
    return 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  }
}

export function calculateTDEE(bmr: number, lifestyle: number, exercise: number): number {
  return bmr * (lifestyle + exercise)
}

export function calculateMacros(
  tdee: number,
  goal: 'lose' | 'maintain' | 'gain',
  deficit: number,
  diet: 'carnivore' | 'pescatarian' | 'keto' | 'lowcarb',
  ratio?: string,
  proteinMin?: string | number,
  netCarbs?: string | number,
  bodyweightKg?: number
) {
  console.log('[calculateMacros] Input - TDEE:', tdee, 'Goal:', goal, 'Deficit:', deficit, 'Diet:', diet, 'Bodyweight:', bodyweightKg)

  let calories = tdee

  if (goal === 'lose') {
    calories = tdee * (1 - deficit / 100)
  } else if (goal === 'gain') {
    calories = tdee * (1 + deficit / 100)
  }

  console.log('[calculateMacros] Adjusted calories:', calories)

  let protein = 0
  let fat = 0
  let carbs = 0

  if (diet === 'carnivore' || diet === 'pescatarian') {
    // For carnivore/pescatarian: Use bodyweight-based protein (2g per kg)
    // Fat fills remaining calories
    if (bodyweightKg) {
      protein = Math.round(bodyweightKg * 2.0)
    } else {
      // Fallback if bodyweight not provided
      protein = Math.round((calories * 0.30) / 4)
    }

    const proteinCalories = protein * 4
    const fatCalories = calories - proteinCalories
    fat = Math.round(fatCalories / 9)
    carbs = 0

    console.log('[calculateMacros] Carnivore - Protein (2g/kg):', protein, 'Protein calories:', proteinCalories, 'Fat calories:', fatCalories)
  } else {
    // Keto/Low-carb: Use ratio-based approach
    protein = Math.round((calories * 0.25) / 4)
    fat = Math.round((calories * 0.65) / 9)
    const netCarbsNum = typeof netCarbs === 'string' ? parseFloat(netCarbs) : (netCarbs || 20)
    carbs = netCarbsNum
  }

  console.log('[calculateMacros] Output - Calories:', calories, 'Protein:', protein, 'Fat:', fat, 'Carbs:', carbs)
  return { calories: Math.round(calories), protein, fat, carbs, tdee: Math.round(tdee) }
}

export function imperialToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * 2.54
}

export function cmToImperial(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return { feet, inches }
}

export function getUnitDefaults(units: 'imperial' | 'metric') {
  return units === 'imperial' 
    ? { height: { feet: 5, inches: 10 }, weight: 180 }
    : { heightCm: 178, weight: 82 }
}

export function detectUnits(countryCode?: string): 'imperial' | 'metric' {
  const imperialCountries = ['US', 'LR', 'MM']
  const country = countryCode || navigator.language.split('-')[1] || 'US'
  return imperialCountries.includes(country) ? 'imperial' : 'metric'
}
