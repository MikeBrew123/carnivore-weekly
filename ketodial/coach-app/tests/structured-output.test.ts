import { describe, it, expect } from 'vitest'
import { validateDraftOutput } from '@/lib/claude/structured-output'

describe('Structured output validation', () => {
  const validOutput = {
    member_message: 'Hey Alex! Great week — your adherence at 8/10 shows real commitment. I noticed your cravings dropped from a 4 to a 2, which usually means your body is adapting well to the lower carb intake. For this week, try adding an extra tablespoon of butter or olive oil to your dinner. The extra fat often helps with the evening snack cravings you mentioned. How did the magnesium before bed go? — Coach Remy',
    metadata: {
      adherence_summary: 'Strong week at 8/10 adherence, up from 6/10 last week.',
      trend_assessment: 'improving',
      emotional_tone: 'positive',
      risk_flags: [],
      recommended_action: 'Add extra fat to dinner to reduce evening cravings.',
      safety_caveat_needed: false,
      safety_caveat_reason: null,
      draft_rationale: 'Member is trending positive with improving adherence and decreasing cravings. Focused on the evening snack struggle they mentioned.',
    },
  }

  it('accepts valid output', () => {
    expect(validateDraftOutput(validOutput)).not.toBeNull()
  })

  it('rejects null input', () => {
    expect(validateDraftOutput(null)).toBeNull()
  })

  it('rejects missing member_message', () => {
    expect(validateDraftOutput({ metadata: validOutput.metadata })).toBeNull()
  })

  it('rejects too-short member_message', () => {
    expect(validateDraftOutput({ member_message: 'Hi', metadata: validOutput.metadata })).toBeNull()
  })

  it('rejects too-long member_message (>10000 chars)', () => {
    expect(validateDraftOutput({ member_message: 'x'.repeat(10001), metadata: validOutput.metadata })).toBeNull()
  })

  it('rejects missing metadata', () => {
    expect(validateDraftOutput({ member_message: validOutput.member_message })).toBeNull()
  })

  it('rejects invalid trend_assessment enum', () => {
    const bad = { ...validOutput, metadata: { ...validOutput.metadata, trend_assessment: 'great' } }
    expect(validateDraftOutput(bad)).toBeNull()
  })

  it('rejects invalid emotional_tone enum', () => {
    const bad = { ...validOutput, metadata: { ...validOutput.metadata, emotional_tone: 'happy' } }
    expect(validateDraftOutput(bad)).toBeNull()
  })

  it('rejects non-array risk_flags', () => {
    const bad = { ...validOutput, metadata: { ...validOutput.metadata, risk_flags: 'none' } }
    expect(validateDraftOutput(bad)).toBeNull()
  })

  it('rejects non-boolean safety_caveat_needed', () => {
    const bad = { ...validOutput, metadata: { ...validOutput.metadata, safety_caveat_needed: 'no' } }
    expect(validateDraftOutput(bad)).toBeNull()
  })

  it('accepts output with risk flags', () => {
    const withFlags = {
      ...validOutput,
      metadata: {
        ...validOutput.metadata,
        risk_flags: ['medication: metformin', 'symptoms: dizziness'],
        safety_caveat_needed: true,
        safety_caveat_reason: 'Member mentioned stopping metformin',
      },
    }
    const result = validateDraftOutput(withFlags)
    expect(result).not.toBeNull()
    expect(result!.metadata.risk_flags).toHaveLength(2)
  })
})
