// Updates the longitudinal member_summary after a human-approved response is sent
// Runs ONLY after Keren approves — never on rejected or pending drafts

import Anthropic from '@anthropic-ai/sdk'
import { SupabaseClient } from '@supabase/supabase-js'

const anthropic = new Anthropic()

export async function updateMemberSummary(
  serviceClient: SupabaseClient,
  memberId: string
): Promise<void> {
  const [memberResult, checkinsResult, messagesResult] = await Promise.all([
    serviceClient
      .from('coach_members')
      .select('display_name, member_summary, diet_type, health_conditions, start_weight, current_weight, goal_weight')
      .eq('id', memberId)
      .single(),

    serviceClient
      .from('coach_checkins')
      .select('submitted_at, weight, adherence, wins, struggles')
      .eq('member_id', memberId)
      .order('submitted_at', { ascending: false })
      .limit(4),

    serviceClient
      .from('coach_messages')
      .select('content, direction, sent_at')
      .eq('member_id', memberId)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(4),
  ])

  const member = memberResult.data
  if (!member) return

  const recentCheckins = (checkinsResult.data || []).reverse()
  const recentMessages = (messagesResult.data || []).reverse()

  const existingSummary = member.member_summary || 'No previous summary.'

  const checkinBlock = recentCheckins.map(c => {
    const date = new Date(c.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return `${date}: weight ${c.weight || '?'}, adherence ${c.adherence || '?'}/10. Wins: ${c.wins || 'none noted'}. Struggles: ${c.struggles || 'none noted'}.`
  }).join('\n')

  const messageBlock = recentMessages.map(m => {
    const date = new Date(m.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const who = m.direction === 'coach' ? 'Coach' : member.display_name
    return `${who} (${date}): ${m.content.substring(0, 300)}`
  }).join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: `You maintain a concise longitudinal summary of a coaching member's journey. Update the existing summary with new information from recent check-ins and coaching exchanges. Keep it under 500 words. Focus on: key patterns, recurring struggles, progress milestones, what coaching approaches are working, and what to watch for. Write in third person. Do not include medical advice or diagnoses.`,
      messages: [
        {
          role: 'user',
          content: `Existing summary:\n${existingSummary}\n\nRecent check-ins:\n${checkinBlock}\n\nRecent exchanges:\n${messageBlock}\n\nUpdate the summary with any new insights. Keep what's still relevant, remove what's stale, add what's new.`,
        },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return

    const newSummary = textBlock.text.trim()
    if (newSummary.length < 20) return

    await serviceClient
      .from('coach_members')
      .update({ member_summary: newSummary, updated_at: new Date().toISOString() })
      .eq('id', memberId)
  } catch (err) {
    console.error('Summary update failed:', err)
  }
}
