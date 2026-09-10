/**
 * Step 1 unit switching: ft/in + lbs  <->  cm + kg.
 *
 * The toggle used to clear every measurement on each tap, including a tap on the
 * unit that was already selected. Continue then failed with no visible error,
 * because the "height" error key is not tied to any rendered field (mobile audit
 * 2026-09-10). Switching now converts what was entered, and re-selecting the
 * active system changes nothing.
 *
 * Metric mode is `heightCm !== undefined`, with 0 meaning "metric, not entered
 * yet". CalculatorApp and Step 2 read the same sentinel. In metric mode the
 * imperial fields are kept in step with the metric inputs, because the macro
 * math fallback, the results summary and the step/1 save still read them.
 */
import type { FormData } from '../types/form'

export type UnitSystem = 'imperial' | 'metric'

/** Same factor Step 1 and Step 2 already use for kg -> lbs. */
export const LB_PER_KG = 2.205

export function unitSystemOf(data: Pick<FormData, 'heightCm'>): UnitSystem {
  return data.heightCm !== undefined ? 'metric' : 'imperial'
}

const isPositive = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v > 0

/** Whole centimetres for a feet + inches height. */
export function feetInchesToCm(feet: number, inches = 0): number {
  return Math.round((feet * 12 + inches) * 2.54)
}

/**
 * Feet + inches for a centimetre height. Rounds the TOTAL inches first, so the
 * inches part is always 0-11. Rounding the remainder instead turned 182 cm into
 * 5 ft 12 in, which Step 1 then rejected against an inches field metric users
 * cannot see, so Continue did nothing.
 */
export function cmToFeetInches(cm: number): { heightFeet: number; heightInches: number } {
  const totalInches = Math.round(cm / 2.54)
  return { heightFeet: Math.floor(totalInches / 12), heightInches: totalInches % 12 }
}

export const lbToKg = (lb: number): number => Math.round(lb / LB_PER_KG)
export const kgToLb = (kg: number): number => Math.round(kg * LB_PER_KG)

/**
 * Move the form to `target` units without losing the reader's measurements.
 * Returns `data` itself (same reference) when `target` is already active.
 * Only height and weight fields are touched; nothing else on the form changes.
 */
export function switchUnitSystem(data: FormData, target: UnitSystem): FormData {
  if (unitSystemOf(data) === target) return data

  const inches = Number(data.heightInches) || 0

  if (target === 'metric') {
    // The imperial values stay as they are, so switching straight back
    // returns exactly what was typed.
    return {
      ...data,
      heightCm: isPositive(data.heightFeet) ? feetInchesToCm(data.heightFeet, inches) : 0,
      weightKg: isPositive(data.weight) ? lbToKg(data.weight) : undefined,
    }
  }

  const next: FormData = { ...data, heightCm: undefined, weightKg: undefined }

  if (isPositive(data.heightCm)) {
    // Keep the original ft/in when they still describe the same height (an
    // untouched round trip). Otherwise the reader typed a new height in cm.
    const unchanged = isPositive(data.heightFeet) && feetInchesToCm(data.heightFeet, inches) === data.heightCm
    if (!unchanged) Object.assign(next, cmToFeetInches(data.heightCm))
  } else {
    next.heightFeet = undefined
    next.heightInches = undefined
  }

  if (isPositive(data.weightKg)) {
    const unchanged = isPositive(data.weight) && lbToKg(data.weight) === data.weightKg
    if (!unchanged) next.weight = kgToLb(data.weightKg)
  }

  return next
}
