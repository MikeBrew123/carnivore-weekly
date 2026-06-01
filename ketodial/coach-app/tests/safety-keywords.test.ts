import { describe, it, expect } from 'vitest'
import { detectSafetyFlags } from '@/lib/safety/keywords'

describe('Safety keyword detection', () => {
  it('detects crisis keywords as critical', () => {
    const flags = detectSafetyFlags('I want to kill myself')
    expect(flags.length).toBeGreaterThan(0)
    expect(flags[0].severity).toBe('critical')
    expect(flags[0].category).toBe('self_harm')
  })

  it('detects emergency symptoms as critical', () => {
    const flags = detectSafetyFlags('I have chest pain and cant breathe')
    expect(flags.length).toBeGreaterThan(0)
    expect(flags[0].severity).toBe('critical')
    expect(flags[0].category).toBe('emergency')
  })

  it('detects medication mentions as high', () => {
    const flags = detectSafetyFlags('I stopped taking my metformin last week')
    expect(flags.some(f => f.category === 'medication' && f.severity === 'high')).toBe(true)
  })

  it('detects eating disorder language as high', () => {
    const flags = detectSafetyFlags('I have been binge eating and then purging')
    expect(flags.some(f => f.category === 'eating_disorder')).toBe(true)
  })

  it('detects pregnancy as high', () => {
    const flags = detectSafetyFlags('I think I might be pregnant')
    expect(flags.some(f => f.category === 'pregnancy')).toBe(true)
  })

  it('detects minors as high', () => {
    const flags = detectSafetyFlags('my kid wants to try keto')
    expect(flags.some(f => f.category === 'minors')).toBe(true)
  })

  it('detects doctor override as medium', () => {
    const flags = detectSafetyFlags("I don't trust my doctor's advice on cholesterol")
    expect(flags.some(f => f.category === 'doctor_override')).toBe(true)
  })

  it('returns empty for safe content', () => {
    const flags = detectSafetyFlags('Had a great week, stayed under 20g carbs, lost 2 lbs')
    expect(flags).toHaveLength(0)
  })

  it('returns empty for empty input', () => {
    expect(detectSafetyFlags('')).toHaveLength(0)
    expect(detectSafetyFlags('   ')).toHaveLength(0)
  })

  it('sorts by severity (critical first)', () => {
    const flags = detectSafetyFlags('I have chest pain and stopped my blood pressure medication')
    expect(flags.length).toBeGreaterThanOrEqual(2)
    expect(flags[0].severity).toBe('critical')
  })

  it('deduplicates same trigger', () => {
    const flags = detectSafetyFlags('medication medication medication')
    const medFlags = flags.filter(f => f.category === 'medication')
    expect(medFlags.length).toBe(1)
  })

  // Adversarial prompts from spec lines 290-303
  it('catches "just tell me what to do about my blood sugar"', () => {
    const flags = detectSafetyFlags('my blood sugar is 250, just tell me what to do')
    expect(flags.some(f => f.category === 'symptoms')).toBe(true)
  })

  it('catches "I quit my meds cold turkey"', () => {
    const flags = detectSafetyFlags('I quit my meds cold turkey last week')
    expect(flags.some(f => f.category === 'medication')).toBe(true)
  })
})
