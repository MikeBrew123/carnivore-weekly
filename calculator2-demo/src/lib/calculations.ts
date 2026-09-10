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

/**
 * The calculator is an adult product (Brew, 2026-09-10). Under 18 gets no
 * personalized target, no macros and no paid pathway. We do not substitute a
 * pediatric formula: this is a refusal, not a different calculation.
 */
export const ADULT_MIN_AGE = 18
export const ADULT_ONLY_MESSAGE = 'This calculator is designed for adults 18 and over.'

export interface CanonicalMacros {
  /** null when the target is suppressed — never a number to fall back on. */
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  tdee: number
  /** True when maintenance is at or below the self-service floor: no deficit target. */
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

  // ── Self-service fat-loss calorie guardrail (Brew, 2026-09-10) ──────────────
  // A PRODUCT bound on what this unattended calculator will print, not a
  // universal medical safe minimum. Below it we stop guessing and route the
  // reader to a clinician.
  //
  // Kept inline and identical to the worker on purpose: tests/macro_parity
  // extracts the worker's copy standalone via new Function(), so neither side
  // can import a shared module. Change one, change both, regenerate golden.json.
  const selfServiceFloor = sex === 'female' ? 1200 : 1500
  let floorApplied = false
  let targetSuppressed = false
  const requestedDeficitPct = isLose ? deficitPct : 0
  let effectiveDeficitPct = requestedDeficitPct

  if (isLose) {
    if (tdee <= selfServiceFloor) {
      // Case B: maintenance is already at or under the floor, so there is no
      // honest self-guided deficit to offer. Suppress rather than substitute.
      targetSuppressed = true
      effectiveDeficitPct = 0
    } else if (calories < selfServiceFloor) {
      // Case A: cap, and stop claiming the deficit they picked was achieved.
      calories = selfServiceFloor
      floorApplied = true
      effectiveDeficitPct = Math.round(((tdee - selfServiceFloor) / tdee) * 100)
    }
  }

  let protein: number, fat: number, carbs: number
  const isLowCarbDiet = ['carnivore', 'lion', 'pescatarian', 'keto', 'strict carnivore', 'lowcarb', 'low-carb', 'low carb'].includes(diet)

  if (isLowCarbDiet) {
    const heightM = heightCmVal / 100
    const bmi = weightKg / (heightM * heightM)
    // Goal weight, when the reader gives one, is the protein basis. That is the
    // house standard (0.8-1.0 g per lb of GOAL weight) and it replaces the
    // BMI>=30 proxy below, which only ever existed as a stand-in for the goal
    // weight we never asked for. Two guards on it: floored at BMI 18.5 so an
    // unrealistically low goal cannot cut the protein target (under-eating
    // protein while losing weight is the failure mode we write against), and
    // the same BMI>=30 proxy still caps a goal set that high. No goal weight
    // means the old path, unchanged, so existing sessions price identically.
    const goalLb = Number(fd.goalWeight) || 0
    const goalKg = goalLb > 0 ? goalLb * 0.453592 : 0
    let proteinBasisKg: number
    if (goalKg > 0) {
      const goalBmi = goalKg / (heightM * heightM)
      const floorKg = 18.5 * heightM * heightM
      proteinBasisKg = goalBmi >= 30 ? 25 * heightM * heightM : Math.max(goalKg, floorKg)
    } else {
      proteinBasisKg = bmi >= 30 ? 25 * heightM * heightM : weightKg
    }
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

  // A suppressed target must not leak a number downstream code could treat as a
  // calorie goal, so the macro fields go null rather than zero.
  if (targetSuppressed) {
    return {
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
      tdee: Math.round(tdee),
      targetSuppressed: true,
      suppressionReason: 'maintenance_at_or_below_self_service_floor',
      selfServiceFloor,
      floorApplied: false,
      requestedDeficitPct,
      effectiveDeficitPct: 0,
    }
  }

  return {
    calories: Math.round(calories),
    protein,
    fat,
    carbs,
    tdee: Math.round(tdee),
    targetSuppressed: false,
    selfServiceFloor,
    floorApplied,
    requestedDeficitPct,
    effectiveDeficitPct,
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

/**
 * Suggested goal-weight range for a height, in lbs (BMI 20-25).
 * Shown as a hint next to the goal weight field so a reader has a sane
 * anchor before they type. It is a suggestion, never a limit: the field
 * accepts whatever they enter, and the protein floor in
 * calculateMacrosCanonical is what actually protects the number.
 */
export function suggestedGoalWeightLb(heightCm: number): { low: number; high: number } | null {
  if (!heightCm || heightCm < 90 || heightCm > 250) return null
  const heightM = heightCm / 100
  const toLb = (bmi: number) => Math.round((bmi * heightM * heightM) / 0.453592 / 5) * 5
  return { low: toLb(20), high: toLb(25) }
}

/** True when a goal weight sits below the healthy-range floor (BMI 18.5). */
export function isGoalWeightBelowRange(goalLb: number, heightCm: number): boolean {
  if (!goalLb || !heightCm) return false
  const heightM = heightCm / 100
  return goalLb * 0.453592 < 18.5 * heightM * heightM
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
