// Reminder decision engine — determines who gets reminded and why
// Runs before any email is sent. Testable independently.

import { SupabaseClient } from '@supabase/supabase-js'

// Seeded demo rows live on @test.ketodial.com, a domain that accepts no mail.
// Emailing them produces hard bounces, and hard bounces damage the sending
// reputation of the domain the real coaching emails go out from. Never send to
// a fixture, whatever its subscription status says.
function isUndeliverableFixture(email: string | null | undefined): boolean {
  if (!email) return true
  const e = email.toLowerCase()
  return (
    e.endsWith('@test.ketodial.com') ||
    e.endsWith('@example.com') ||
    e.endsWith('.invalid') ||
    e.startsWith('qa-')
  )
}

export type ReminderType = 'checkin_due' | 'coach_replied'

export interface ReminderDecision {
  member_id: string
  email: string
  site?: string | null
  display_name: string
  type: ReminderType
  reason: string
  skip: boolean
  skip_reason: string | null
}

export async function computeCheckinReminders(
  serviceClient: SupabaseClient,
  now: Date = new Date()
): Promise<ReminderDecision[]> {
  const decisions: ReminderDecision[] = []

  // Get all active members
  const { data: members } = await serviceClient
    .from('coach_members')
    .select('id, email, display_name, tier, status, subscription_status, site')
    .in('status', ['active', 'test'])

  if (!members || members.length === 0) return decisions

  const today = now.toISOString().split('T')[0]
  const dayOfWeek = now.getDay() // 0 = Sunday

  for (const member of members) {
    if (isUndeliverableFixture(member.email)) {
      decisions.push({
        member_id: member.id,
        email: member.email,
        site: member.site,
        display_name: member.display_name,
        type: 'checkin_due',
        reason: 'Test fixture address',
        skip: true,
        skip_reason: 'undeliverable_fixture',
      })
      continue
    }

    // Skip inactive subscriptions
    const activeSubs = ['active', 'trialing', 'past_due']
    if (member.subscription_status && !activeSubs.includes(member.subscription_status)) {
      decisions.push({
        member_id: member.id,
        email: member.email,
        site: member.site,
        display_name: member.display_name,
        type: 'checkin_due',
        reason: `Subscription ${member.subscription_status}`,
        skip: true,
        skip_reason: 'inactive_subscription',
      })
      continue
    }

    // Weekly: only remind on Sundays
    if (member.tier === 'weekly' && dayOfWeek !== 0) {
      decisions.push({
        member_id: member.id,
        email: member.email,
        site: member.site,
        display_name: member.display_name,
        type: 'checkin_due',
        reason: 'Not Sunday',
        skip: true,
        skip_reason: 'wrong_day',
      })
      continue
    }

    // Check if they already checked in today/this period
    const hasCheckin = await hasCheckinForPeriod(serviceClient, member.id, member.tier, today, now)
    if (hasCheckin) {
      decisions.push({
        member_id: member.id,
        email: member.email,
        site: member.site,
        display_name: member.display_name,
        type: 'checkin_due',
        reason: 'Already checked in',
        skip: true,
        skip_reason: 'already_checked_in',
      })
      continue
    }

    // Check if reminder already sent today
    const alreadySent = await reminderSentToday(serviceClient, member.id, 'checkin_due', today)
    if (alreadySent) {
      decisions.push({
        member_id: member.id,
        email: member.email,
        site: member.site,
        display_name: member.display_name,
        type: 'checkin_due',
        reason: 'Reminder already sent today',
        skip: true,
        skip_reason: 'already_reminded',
      })
      continue
    }

    // Eligible for reminder
    decisions.push({
      member_id: member.id,
      email: member.email,
        site: member.site,
      display_name: member.display_name,
      type: 'checkin_due',
      reason: `${member.tier} check-in due`,
      skip: false,
      skip_reason: null,
    })
  }

  return decisions
}

export async function computeReplyNotifications(
  serviceClient: SupabaseClient,
  now: Date = new Date()
): Promise<ReminderDecision[]> {
  const decisions: ReminderDecision[] = []
  const today = now.toISOString().split('T')[0]

  // Find coach messages sent today that haven't been notified
  const { data: newReplies } = await serviceClient
    .from('coach_messages')
    .select(`
      id, member_id, sent_at,
      coach_members!inner(email, display_name, status, site)
    `)
    .eq('direction', 'coach')
    .gte('sent_at', `${today}T00:00:00`)
    .not('sent_at', 'is', null)

  if (!newReplies || newReplies.length === 0) return decisions

  for (const reply of newReplies) {
    const member = reply.coach_members as any

    if (isUndeliverableFixture(member?.email)) {
      decisions.push({
        member_id: reply.member_id,
        email: member?.email,
        site: member?.site,
        display_name: member?.display_name,
        type: 'coach_replied',
        reason: 'Test fixture address',
        skip: true,
        skip_reason: 'undeliverable_fixture',
      })
      continue
    }

    const alreadySent = await reminderSentToday(serviceClient, reply.member_id, 'coach_replied', today)
    if (alreadySent) {
      decisions.push({
        member_id: reply.member_id,
        email: member.email,
        site: member?.site,
        display_name: member.display_name,
        type: 'coach_replied',
        reason: 'Notification already sent',
        skip: true,
        skip_reason: 'already_notified',
      })
      continue
    }

    decisions.push({
      member_id: reply.member_id,
      email: member.email,
        site: member?.site,
      display_name: member.display_name,
      type: 'coach_replied',
      reason: 'New coach response',
      skip: false,
      skip_reason: null,
    })
  }

  return decisions
}

async function hasCheckinForPeriod(
  serviceClient: SupabaseClient,
  memberId: string,
  tier: string,
  today: string,
  now: Date
): Promise<boolean> {
  if (tier === 'daily') {
    const { data } = await serviceClient
      .from('coach_checkins')
      .select('id')
      .eq('member_id', memberId)
      .gte('submitted_at', `${today}T00:00:00`)
      .lt('submitted_at', `${today}T23:59:59`)
      .maybeSingle()
    return !!data
  }

  // Weekly: check current period
  const sunday = new Date(now)
  sunday.setDate(sunday.getDate() - sunday.getDay())
  sunday.setHours(0, 0, 0, 0)
  const periodStart = sunday.toISOString().split('T')[0]

  const { data } = await serviceClient
    .from('coach_checkins')
    .select('id')
    .eq('member_id', memberId)
    .eq('period_start', periodStart)
    .maybeSingle()
  return !!data
}

async function reminderSentToday(
  serviceClient: SupabaseClient,
  memberId: string,
  type: string,
  today: string
): Promise<boolean> {
  const { data } = await serviceClient
    .from('coach_admin_audit_log')
    .select('id')
    .eq('action', `email_${type}`)
    .eq('target_member_id', memberId)
    .gte('created_at', `${today}T00:00:00`)
    .maybeSingle()
  return !!data
}
