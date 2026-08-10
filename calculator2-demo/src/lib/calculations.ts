/**
 * Macro calculation utilities ported from calculator.html
 * Uses Mifflin-St Jeor equation for BMR
 */

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
