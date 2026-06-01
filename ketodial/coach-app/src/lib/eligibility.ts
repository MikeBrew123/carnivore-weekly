// Deterministic response eligibility check
// Weekly: 1 coached response per check-in period (Sunday-Saturday)
// Daily: 1 coached response per calendar day
// Bonus credit: weekly members can request 1 extra mid-week response per credit

import { SupabaseClient } from '@supabase/supabase-js'

export type EligibilityStatus =
  | 'eligible'
  | 'already_responded'
  | 'no_checkin'
  | 'inactive'
  | 'bonus_available'
  | 'no_credits'

export interface EligibilityResult {
  eligible: boolean
  status: EligibilityStatus
  reason: string
  bonus_credits: number
  can_use_bonus: boolean
}

export async function checkResponseEligibility(
  serviceClient: SupabaseClient,
  memberId: string
): Promise<EligibilityResult> {
  const { data: member } = await serviceClient
    .from('coach_members')
    .select('tier, status, subscription_status, bonus_credit_balance')
    .eq('id', memberId)
    .single()

  if (!member || (member.status !== 'active' && member.status !== 'test')) {
    return { eligible: false, status: 'inactive', reason: 'Membership not active', bonus_credits: 0, can_use_bonus: false }
  }

  const now = new Date()
  const credits = member.bonus_credit_balance || 0

  if (member.tier === 'daily') {
    return checkDailyEligibility(serviceClient, memberId, credits, now)
  }

  return checkWeeklyEligibility(serviceClient, memberId, credits, now)
}

async function checkWeeklyEligibility(
  serviceClient: SupabaseClient,
  memberId: string,
  credits: number,
  now: Date
): Promise<EligibilityResult> {
  const sunday = getLastSunday(now)
  const periodStart = sunday.toISOString().split('T')[0]

  // Check if there's a check-in this period
  const { data: checkin } = await serviceClient
    .from('coach_checkins')
    .select('id')
    .eq('member_id', memberId)
    .eq('period_start', periodStart)
    .maybeSingle()

  if (!checkin) {
    return { eligible: false, status: 'no_checkin', reason: 'No check-in submitted this week', bonus_credits: credits, can_use_bonus: false }
  }

  // Check if a coach response already exists for this period's check-in
  const { data: response } = await serviceClient
    .from('coach_messages')
    .select('id')
    .eq('member_id', memberId)
    .eq('checkin_id', checkin.id)
    .eq('direction', 'coach')
    .maybeSingle()

  if (!response) {
    return { eligible: true, status: 'eligible', reason: 'Weekly check-in ready for response', bonus_credits: credits, can_use_bonus: false }
  }

  // Already has a response this period — check bonus eligibility
  if (credits > 0) {
    return { eligible: false, status: 'bonus_available', reason: 'Weekly response sent. Bonus credit available for mid-week response.', bonus_credits: credits, can_use_bonus: true }
  }

  return { eligible: false, status: 'already_responded', reason: 'Weekly response already sent', bonus_credits: 0, can_use_bonus: false }
}

async function checkDailyEligibility(
  serviceClient: SupabaseClient,
  memberId: string,
  credits: number,
  now: Date
): Promise<EligibilityResult> {
  const today = now.toISOString().split('T')[0]

  // Check if there's a check-in today
  const { data: checkin } = await serviceClient
    .from('coach_checkins')
    .select('id')
    .eq('member_id', memberId)
    .gte('submitted_at', `${today}T00:00:00`)
    .lt('submitted_at', `${today}T23:59:59`)
    .maybeSingle()

  if (!checkin) {
    return { eligible: false, status: 'no_checkin', reason: 'No check-in submitted today', bonus_credits: credits, can_use_bonus: false }
  }

  const { data: response } = await serviceClient
    .from('coach_messages')
    .select('id')
    .eq('member_id', memberId)
    .eq('checkin_id', checkin.id)
    .eq('direction', 'coach')
    .maybeSingle()

  if (!response) {
    return { eligible: true, status: 'eligible', reason: 'Daily check-in ready for response', bonus_credits: credits, can_use_bonus: false }
  }

  return { eligible: false, status: 'already_responded', reason: 'Daily response already sent', bonus_credits: credits, can_use_bonus: false }
}

export async function consumeBonusCredit(
  serviceClient: SupabaseClient,
  memberId: string,
  adminId: string,
  reason: string = 'member_request'
): Promise<{ success: boolean; error?: string }> {
  // Atomic decrement with floor check
  const { data, error } = await serviceClient.rpc('consume_bonus_credit', {
    p_member_id: memberId,
  })

  if (error || !data) {
    return { success: false, error: 'No credits available or consumption failed' }
  }

  // Audit log
  await serviceClient
    .from('coach_admin_audit_log')
    .insert({
      actor_admin_id: adminId,
      action: 'consume_credit',
      target_member_id: memberId,
      metadata: { reason, remaining_credits: data },
    })

  return { success: true }
}

function getLastSunday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}
