// Structured output schema for Claude coach draft
// Claude returns this alongside the member-facing message
// Displayed in admin review queue to help Keren quickly accept/edit/reject

export interface CoachDraftOutput {
  member_message: string
  metadata: CoachDraftMetadata
}

export interface CoachDraftMetadata {
  adherence_summary: string
  trend_assessment: 'improving' | 'stable' | 'declining' | 'insufficient_data'
  emotional_tone: 'positive' | 'neutral' | 'struggling' | 'distressed'
  risk_flags: string[]
  recommended_action: string
  safety_caveat_needed: boolean
  safety_caveat_reason: string | null
  draft_rationale: string
}

export const COACH_DRAFT_TOOL = {
  name: 'submit_coach_draft' as const,
  description: 'Submit the coaching response draft with structured metadata for reviewer approval.',
  input_schema: {
    type: 'object' as const,
    required: ['member_message', 'metadata'] as string[],
    properties: {
      member_message: {
        type: 'string',
        description: 'The full coaching response the member will see after review approval. Write in the coaching voice: warm, plain, and never signed with a personal name.',
      },
      metadata: {
        type: 'object',
        required: [
          'adherence_summary',
          'trend_assessment',
          'emotional_tone',
          'risk_flags',
          'recommended_action',
          'safety_caveat_needed',
          'safety_caveat_reason',
          'draft_rationale',
        ] as string[],
        properties: {
          adherence_summary: {
            type: 'string',
            description: 'One-sentence summary of how well the member followed their plan this week.',
          },
          trend_assessment: {
            type: 'string',
            enum: ['improving', 'stable', 'declining', 'insufficient_data'],
            description: 'Overall trend direction based on check-in history.',
          },
          emotional_tone: {
            type: 'string',
            enum: ['positive', 'neutral', 'struggling', 'distressed'],
            description: 'Detected emotional state of the member from their check-in text.',
          },
          risk_flags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Any safety or medical flags detected. Empty array if none.',
          },
          recommended_action: {
            type: 'string',
            description: 'The single primary action item recommended for next week.',
          },
          safety_caveat_needed: {
            type: 'boolean',
            description: 'Whether the response includes a "talk to your doctor" redirect.',
          },
          safety_caveat_reason: {
            type: ['string', 'null'],
            description: 'Why the safety caveat was included. Null if not needed.',
          },
          draft_rationale: {
            type: 'string',
            description: 'Brief explanation of why this draft was written this way. Helps reviewer understand the coaching logic.',
          },
        },
      },
    },
  },
}

export function validateDraftOutput(raw: unknown): CoachDraftOutput | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  if (typeof obj.member_message !== 'string' || obj.member_message.length < 50) return null
  if (typeof obj.member_message === 'string' && obj.member_message.length > 10000) return null

  const meta = obj.metadata as Record<string, unknown> | undefined
  if (!meta || typeof meta !== 'object') return null

  const validTrends = ['improving', 'stable', 'declining', 'insufficient_data']
  const validTones = ['positive', 'neutral', 'struggling', 'distressed']

  if (typeof meta.adherence_summary !== 'string') return null
  if (!validTrends.includes(meta.trend_assessment as string)) return null
  if (!validTones.includes(meta.emotional_tone as string)) return null
  if (!Array.isArray(meta.risk_flags)) return null
  if (typeof meta.recommended_action !== 'string') return null
  if (typeof meta.safety_caveat_needed !== 'boolean') return null
  if (typeof meta.draft_rationale !== 'string') return null

  return obj as unknown as CoachDraftOutput
}
