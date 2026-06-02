// Nudge detection engine — finds members worth nudging and why
// Rate limited: max 1 nudge per member per week, never same day as coaching response

import { SupabaseClient } from '@supabase/supabase-js'

export interface NudgeSuggestion {
  member_id: string
  display_name: string
  email: string
  reason: string
  category: 'streak' | 'milestone' | 'consistency' | 'encouragement' | 'missing'
  suggested_message: string
  can_nudge: boolean
  cooldown_reason: string | null
}

const TEMPLATES: Record<string, string[]> = {
  step_streak: [
    "Hey {name}, noticed you've been hitting your steps consistently. That kind of consistency is what makes keto work long-term. Keep it up.",
    "{name}, your step count has been solid this week. Movement + keto is a powerful combo. Nice work.",
  ],
  weight_milestone: [
    "Hey {name}, just wanted to flag — you've hit a new low this week. That's real progress. Keep doing what you're doing.",
    "{name}, new low weight this week. The trend is working. Don't let daily fluctuations distract you from the bigger picture.",
  ],
  consistency: [
    "Hey {name}, {weeks} weeks of check-ins in a row. That streak matters more than any single number. Keep showing up.",
  ],
  missing_checkin: [
    "Hey {name}, haven't seen your check-in yet this week. No pressure — just checking in. Even a quick update helps me help you.",
    "{name}, your check-in is open whenever you're ready. Even a rough week is worth logging — that's how we spot patterns.",
  ],
  low_energy: [
    "Hey {name}, noticed your energy has been low the last couple check-ins. Worth looking at your fat intake and sleep. Want to troubleshoot this week?",
  ],
  high_cravings: [
    "Hey {name}, cravings have been creeping up. That's usually an electrolyte or fat signal. Try adding a pinch of salt to water today and see if it helps.",
  ],
}

export async function detectNudgeOpportunities(
  serviceClient: SupabaseClient
): Promise<NudgeSuggestion[]> {
  const suggestions: NudgeSuggestion[] = []

  // Get all active members
  const { data: members } = await serviceClient
    .from('coach_members')
    .select('id, display_name, email, onboarded_at')
    .in('status', ['active', 'test'])

  if (!members?.length) return suggestions

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const sunday = new Date(now)
  sunday.setDate(sunday.getDate() - sunday.getDay())
  const currentPeriod = sunday.toISOString().split('T')[0]
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  for (const member of members) {
    // Check cooldown: any nudge sent in the last 7 days?
    const { data: recentNudge } = await serviceClient
      .from('coach_admin_audit_log')
      .select('created_at')
      .eq('action', 'send_nudge')
      .eq('target_member_id', member.id)
      .gte('created_at', oneWeekAgo)
      .limit(1)
      .maybeSingle()

    // Check if coaching response sent today
    const { data: todayResponse } = await serviceClient
      .from('coach_messages')
      .select('id')
      .eq('member_id', member.id)
      .eq('direction', 'coach')
      .gte('sent_at', `${today}T00:00:00`)
      .limit(1)
      .maybeSingle()

    const onCooldown = !!recentNudge
    const responseSentToday = !!todayResponse
    const canNudge = !onCooldown && !responseSentToday
    const cooldownReason = onCooldown ? 'Nudged within last 7 days' : responseSentToday ? 'Coaching response sent today' : null

    // Get latest 3 check-ins for pattern detection
    const { data: checkins } = await serviceClient
      .from('coach_checkins')
      .select('weight, energy_level, cravings_level, sleep_quality, steps_avg, adherence, period_start, submitted_at')
      .eq('member_id', member.id)
      .order('submitted_at', { ascending: false })
      .limit(3)

    const latest = checkins?.[0]
    const prev = checkins?.[1]
    const name = member.display_name.split(' ')[0]

    // Check if they submitted this week
    const submittedThisWeek = checkins?.some(c => c.period_start === currentPeriod)

    // Detect patterns and pick the best nudge
    // Priority: missing > low energy/high cravings > weight milestone > consistency

    if (!submittedThisWeek) {
      const weeksTenure = Math.floor((Date.now() - new Date(member.onboarded_at).getTime()) / (7 * 24 * 60 * 60 * 1000))
      if (weeksTenure > 0 && now.getDay() >= 2) { // Only nudge after Tuesday
        suggestions.push({
          member_id: member.id, display_name: member.display_name, email: member.email,
          reason: "Hasn't checked in this week",
          category: 'missing',
          suggested_message: pickTemplate('missing_checkin', { name }),
          can_nudge: canNudge, cooldown_reason: cooldownReason,
        })
        continue
      }
    }

    if (!latest) continue

    // Low energy (2 check-ins in a row at 1-2)
    if (latest.energy_level && latest.energy_level <= 2 && prev?.energy_level && prev.energy_level <= 2) {
      suggestions.push({
        member_id: member.id, display_name: member.display_name, email: member.email,
        reason: `Energy at ${latest.energy_level}/5 two weeks running`,
        category: 'encouragement',
        suggested_message: pickTemplate('low_energy', { name }),
        can_nudge: canNudge, cooldown_reason: cooldownReason,
      })
      continue
    }

    // High cravings (2 check-ins at 4-5)
    if (latest.cravings_level && latest.cravings_level >= 4 && prev?.cravings_level && prev.cravings_level >= 4) {
      suggestions.push({
        member_id: member.id, display_name: member.display_name, email: member.email,
        reason: `Cravings at ${latest.cravings_level}/5 two weeks running`,
        category: 'encouragement',
        suggested_message: pickTemplate('high_cravings', { name }),
        can_nudge: canNudge, cooldown_reason: cooldownReason,
      })
      continue
    }

    // Weight milestone — new low
    if (latest.weight && prev?.weight && latest.weight < prev.weight) {
      const totalLost = checkins && checkins.length > 1
        ? (checkins[checkins.length - 1].weight || 0) - latest.weight
        : 0
      if (totalLost > 0) {
        suggestions.push({
          member_id: member.id, display_name: member.display_name, email: member.email,
          reason: `New low weight: ${latest.weight} (down from ${prev.weight})`,
          category: 'milestone',
          suggested_message: pickTemplate('weight_milestone', { name }),
          can_nudge: canNudge, cooldown_reason: cooldownReason,
        })
        continue
      }
    }

    // Consistency streak (3+ weeks)
    if (checkins && checkins.length >= 3) {
      suggestions.push({
        member_id: member.id, display_name: member.display_name, email: member.email,
        reason: `${checkins.length}+ week check-in streak`,
        category: 'consistency',
        suggested_message: pickTemplate('consistency', { name, weeks: String(checkins.length) }),
        can_nudge: canNudge, cooldown_reason: cooldownReason,
      })
    }
  }

  return suggestions
}

function pickTemplate(key: string, vars: Record<string, string>): string {
  const templates = TEMPLATES[key] || ['']
  const template = templates[Math.floor(Date.now() / 86400000) % templates.length] // rotate daily, deterministic
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(new RegExp(`\\{${k}\\}`, 'g'), v), template)
}
