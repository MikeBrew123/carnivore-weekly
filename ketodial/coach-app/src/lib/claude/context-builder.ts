// Assembles per-member context window for Claude coach draft
// Pulls profile, last 8 check-ins, last 4 exchanges, risk level, coach notes

import { SupabaseClient } from '@supabase/supabase-js'
import { detectSafetyFlags } from '@/lib/safety/keywords'

export interface MemberContext {
  profile: MemberProfile
  checkinHistory: CheckinSummary[]
  recentExchanges: Exchange[]
  riskLevel: 'green' | 'yellow' | 'red'
  activeFlags: string[]
  coachNotes: string | null
}

interface MemberProfile {
  display_name: string
  age: number | null
  sex: string | null
  diet_type: string | null
  diet_duration: string | null
  start_weight: number | null
  current_weight: number | null
  goal_weight: number | null
  activity_level: string | null
  health_conditions: string[] | null
  medications: string | null
  biggest_challenge: string | null
  success_vision: string | null
  goal_target?: string | null
  tier: string
  weeks_active: number
  member_summary: string | null
  // Expanded intake fields
  primary_goal: string | null
  personal_why: string | null
  keto_experience: string | null
  food_allergies: string | null
  dietary_restrictions: string | null
  feedback_tone: string | null
  feedback_format: string | null
  pregnant_or_nursing: boolean
  eating_disorder_history: boolean
  working_with_doctor: boolean
  confidence_level: number | null
  biggest_obstacle: string | null
  typical_eating: string | null
}

interface CheckinSummary {
  submitted_at: string
  weight: number | null
  adherence: number | null
  sleep_quality: number | null
  energy_level: number | null
  cravings_level: number | null
  steps_avg: number | null
  wins: string | null
  struggles: string | null
  symptoms: string | null
}

interface Exchange {
  direction: 'member' | 'coach'
  content: string
  sent_at: string
}

export async function buildMemberContext(
  serviceClient: SupabaseClient,
  memberId: string,
  currentCheckinText: string
): Promise<MemberContext> {
  const [memberResult, checkinsResult, exchangesResult, safetyResult] = await Promise.all([
    serviceClient
      .from('coach_members')
      .select('display_name, age, sex, diet_type, diet_duration, start_weight, current_weight, goal_weight, activity_level, health_conditions, medications, biggest_challenge, success_vision, goal_target, tier, onboarded_at, coach_notes, member_summary, primary_goal, personal_why, keto_experience, food_allergies, dietary_restrictions, feedback_tone, feedback_format, pregnant_or_nursing, eating_disorder_history, working_with_doctor, confidence_level, biggest_obstacle, typical_eating')
      .eq('id', memberId)
      .single(),

    serviceClient
      .from('coach_checkins')
      .select('submitted_at, weight, adherence, sleep_quality, energy_level, cravings_level, steps_avg, wins, struggles, symptoms')
      .eq('member_id', memberId)
      .order('submitted_at', { ascending: false })
      .limit(8),

    serviceClient
      .from('coach_messages')
      .select('direction, content, sent_at')
      .eq('member_id', memberId)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(8),

    serviceClient
      .from('coach_safety_events')
      .select('category, severity')
      .eq('member_id', memberId)
      .is('resolved_at', null),
  ])

  const member = memberResult.data!
  const weeksActive = member.onboarded_at
    ? Math.floor((Date.now() - new Date(member.onboarded_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
    : 0

  const currentFlags = detectSafetyFlags(currentCheckinText)
  const unresolvedSafety = safetyResult.data || []
  const hasCritical = currentFlags.some(f => f.severity === 'critical') ||
    unresolvedSafety.some(e => e.severity === 'critical')
  const hasHigh = currentFlags.some(f => f.severity === 'high') ||
    unresolvedSafety.some(e => e.severity === 'high')

  let riskLevel: 'green' | 'yellow' | 'red' = 'green'
  if (hasCritical) riskLevel = 'red'
  else if (hasHigh) riskLevel = 'yellow'

  const exchanges = (exchangesResult.data || [])
    .slice(0, 8)
    .reverse()
    .map(e => ({
      direction: e.direction as 'member' | 'coach',
      content: e.content,
      sent_at: e.sent_at,
    }))

  return {
    profile: {
      display_name: member.display_name,
      age: member.age,
      sex: member.sex,
      diet_type: member.diet_type,
      diet_duration: member.diet_duration,
      start_weight: member.start_weight,
      current_weight: member.current_weight,
      goal_weight: member.goal_weight,
      activity_level: member.activity_level,
      health_conditions: member.health_conditions,
      medications: member.medications,
      biggest_challenge: member.biggest_challenge,
      // Onboarding writes "What does success look like?" to goal_target;
      // success_vision is a separate legacy column the form never fills. Read
      // both so the member's own answer actually reaches the coach.
      success_vision: member.success_vision ?? member.goal_target ?? null,
      tier: member.tier,
      weeks_active: weeksActive,
      member_summary: member.member_summary,
      primary_goal: member.primary_goal,
      personal_why: member.personal_why,
      keto_experience: member.keto_experience,
      food_allergies: member.food_allergies,
      dietary_restrictions: member.dietary_restrictions,
      feedback_tone: member.feedback_tone,
      feedback_format: member.feedback_format,
      pregnant_or_nursing: member.pregnant_or_nursing || false,
      eating_disorder_history: member.eating_disorder_history || false,
      working_with_doctor: member.working_with_doctor || false,
      confidence_level: member.confidence_level,
      biggest_obstacle: member.biggest_obstacle,
      typical_eating: member.typical_eating,
    },
    checkinHistory: (checkinsResult.data || []).reverse(),
    recentExchanges: exchanges,
    riskLevel,
    activeFlags: currentFlags.map(f => `${f.category}: ${f.trigger}`),
    coachNotes: member.coach_notes,
  }
}

export function formatContextForPrompt(ctx: MemberContext): string {
  const p = ctx.profile
  const lines: string[] = []

  lines.push(`## Member: ${p.display_name}`)
  lines.push(`Tier: ${p.tier} | Weeks active: ${p.weeks_active}`)

  if (p.age || p.sex) lines.push(`Age: ${p.age || '?'} | Sex: ${p.sex || '?'}`)
  if (p.diet_type) lines.push(`Diet: ${p.diet_type} (${p.diet_duration || 'unknown duration'})`)
  if (p.activity_level) lines.push(`Activity: ${p.activity_level}`)

  if (p.start_weight || p.current_weight || p.goal_weight) {
    lines.push(`Weight: ${p.start_weight || '?'} → ${p.current_weight || '?'} (goal: ${p.goal_weight || '?'})`)
  }

  if (p.health_conditions?.length) lines.push(`Health conditions: ${p.health_conditions.join(', ')}`)
  if (p.medications) lines.push(`Medications: ${p.medications}`)
  if (p.primary_goal) lines.push(`Primary goal: ${p.primary_goal}`)
  if (p.biggest_challenge) lines.push(`Biggest challenge: ${p.biggest_challenge}`)
  if (p.success_vision) lines.push(`Success vision: ${p.success_vision}`)
  if (p.personal_why) lines.push(`Personal why: ${p.personal_why}`)
  if (p.keto_experience) lines.push(`Keto experience: ${p.keto_experience.replace('_', ' ')}`)
  if (p.typical_eating) lines.push(`Typical eating: ${p.typical_eating}`)
  if (p.food_allergies) lines.push(`Food allergies: ${p.food_allergies}`)
  if (p.dietary_restrictions) lines.push(`Dietary restrictions: ${p.dietary_restrictions}`)
  if (p.biggest_obstacle) lines.push(`Biggest obstacle: ${p.biggest_obstacle}`)
  if (p.confidence_level) lines.push(`Starting confidence: ${p.confidence_level}/5`)
  if (p.pregnant_or_nursing) lines.push(`⚠️ Pregnant or nursing`)
  if (p.eating_disorder_history) lines.push(`⚠️ History of disordered eating — adjust approach`)
  if (p.working_with_doctor) lines.push(`Working with a doctor: yes`)
  if (p.feedback_tone) lines.push(`Preferred tone: ${p.feedback_tone}`)
  if (p.feedback_format) lines.push(`Preferred format: ${p.feedback_format}`)

  if (p.member_summary) {
    lines.push(`\n## Longitudinal Summary\n${p.member_summary}`)
  }

  if (ctx.coachNotes) {
    lines.push(`\n## Coach Notes\n${ctx.coachNotes}`)
  }

  if (ctx.checkinHistory.length > 0) {
    lines.push(`\n## Check-in History (last ${ctx.checkinHistory.length})`)
    for (const c of ctx.checkinHistory) {
      const date = new Date(c.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const nums = [
        c.weight && `weight: ${c.weight}`,
        c.adherence && `adherence: ${c.adherence}/10`,
        c.sleep_quality && `sleep: ${c.sleep_quality}/5`,
        c.energy_level && `energy: ${c.energy_level}/5`,
        c.cravings_level && `cravings: ${c.cravings_level}/5`,
        c.steps_avg && `steps: ${c.steps_avg}`,
      ].filter(Boolean).join(', ')
      lines.push(`\n### ${date}\n${nums}`)
      if (c.wins) lines.push(`Wins: ${c.wins}`)
      if (c.struggles) lines.push(`Struggles: ${c.struggles}`)
      if (c.symptoms) lines.push(`Symptoms: ${c.symptoms}`)
    }
  }

  if (ctx.recentExchanges.length > 0) {
    lines.push(`\n## Recent Exchanges (last ${ctx.recentExchanges.length})`)
    for (const e of ctx.recentExchanges) {
      const date = new Date(e.sent_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const speaker = e.direction === 'coach' ? 'Coach Remy' : p.display_name
      lines.push(`\n**${speaker}** (${date}):\n${e.content}`)
    }
  }

  if (ctx.riskLevel !== 'green') {
    lines.push(`\n## ⚠️ Risk Level: ${ctx.riskLevel.toUpperCase()}`)
    if (ctx.activeFlags.length > 0) {
      lines.push(`Active flags: ${ctx.activeFlags.join('; ')}`)
    }
  }

  return lines.join('\n')
}
