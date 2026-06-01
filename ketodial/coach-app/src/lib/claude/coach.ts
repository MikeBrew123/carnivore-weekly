// Main coach draft orchestrator
// check-in → build context → Claude API → validate → insert pending message
// Claude is a drafting assistant, not a decision-maker

import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'
import { SYSTEM_PROMPT } from './system-prompt'
import { buildMemberContext, formatContextForPrompt } from './context-builder'
import { COACH_DRAFT_TOOL, validateDraftOutput } from './structured-output'

const anthropic = new Anthropic()

interface DraftResult {
  success: boolean
  messageId: string | null
  error: string | null
}

export async function generateCoachDraft(
  serviceClient: SupabaseClient,
  memberId: string,
  checkinId: string
): Promise<DraftResult> {
  // Idempotency: don't duplicate draft for same check-in
  const { data: existing } = await serviceClient
    .from('coach_messages')
    .select('id')
    .eq('checkin_id', checkinId)
    .eq('direction', 'coach')
    .maybeSingle()

  if (existing) {
    return { success: true, messageId: existing.id, error: null }
  }

  // Get the check-in data for the current submission
  const { data: checkin } = await serviceClient
    .from('coach_checkins')
    .select('wins, struggles, symptoms')
    .eq('id', checkinId)
    .single()

  if (!checkin) {
    return { success: false, messageId: null, error: 'Check-in not found' }
  }

  const checkinText = [checkin.wins, checkin.struggles, checkin.symptoms].filter(Boolean).join(' ')

  let context
  try {
    context = await buildMemberContext(serviceClient, memberId, checkinText)
  } catch (err) {
    console.error('Context build failed:', err)
    return { success: false, messageId: null, error: 'context_build_failed' }
  }

  const contextPrompt = formatContextForPrompt(context)
  const hasRedFlag = context.riskLevel === 'red'

  let draftOutput
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: [
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      tools: [COACH_DRAFT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_coach_draft' },
      messages: [
        {
          role: 'user',
          content: `Here is the member context and their latest check-in. Draft a coaching response using the submit_coach_draft tool.\n\n${contextPrompt}`,
        },
      ],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      return { success: false, messageId: null, error: 'no_tool_use_in_response' }
    }

    draftOutput = validateDraftOutput(toolBlock.input)
    if (!draftOutput) {
      return { success: false, messageId: null, error: 'structured_output_validation_failed' }
    }
  } catch (err) {
    console.error('Claude API call failed:', err)
    return { success: false, messageId: null, error: 'claude_api_failed' }
  }

  // Insert as pending message — sent_at=NULL means invisible to member
  const { data: message, error: insertErr } = await serviceClient
    .from('coach_messages')
    .insert({
      member_id: memberId,
      checkin_id: checkinId,
      direction: 'coach',
      content: draftOutput.member_message,
      ai_draft: draftOutput.member_message,
      ai_structured_output: draftOutput.metadata,
      red_flag: hasRedFlag || draftOutput.metadata.safety_caveat_needed,
      red_flag_reason: draftOutput.metadata.safety_caveat_reason,
      review_status: 'pending',
      sent_at: null,
    })
    .select('id')
    .single()

  if (insertErr) {
    // Unique constraint = another process already created the draft
    if (insertErr.code === '23505') {
      const { data: dup } = await serviceClient
        .from('coach_messages')
        .select('id')
        .eq('checkin_id', checkinId)
        .eq('direction', 'coach')
        .single()
      return { success: true, messageId: dup?.id || null, error: null }
    }
    console.error('Message insert failed:', insertErr)
    return { success: false, messageId: null, error: 'message_insert_failed' }
  }

  return { success: true, messageId: message.id, error: null }
}
