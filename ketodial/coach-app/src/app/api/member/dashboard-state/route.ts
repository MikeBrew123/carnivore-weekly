import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCurrentCheckInState } from '@/lib/checkin-state'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
  }

  const serviceClient = await createServiceClient()

  // Fetch member row
  const { data: member } = await serviceClient
    .from('coach_members')
    .select('id, display_name, status, tier, site, founding_member, subscription_status, onboarding_step, onboarded_at, current_weight, start_weight, goal_weight, diet_type, bonus_credit_balance, timezone, cancel_at_period_end, current_period_end')
    .eq('id', user.id)
    .maybeSingle()

  if (!member) {
    return NextResponse.json({ state: 'no_member' }, { status: 404, headers: { 'Cache-Control': 'no-store' } })
  }

  // Onboarding incomplete
  if (member.status === 'onboarding' || !member.onboarded_at) {
    return NextResponse.json({
      state: 'onboarding_required',
      onboarding: { current_step: member.onboarding_step || 1 },
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Billing/access check
  const activeStatuses = ['active', 'trialing']
  const graceStatuses = ['past_due']
  const isActive = activeStatuses.includes(member.subscription_status || '')
  const isGrace = graceStatuses.includes(member.subscription_status || '')
  const isCancelledButPaidThrough = member.subscription_status === 'cancelled' &&
    member.current_period_end && new Date(member.current_period_end) > new Date()

  const canAccess = isActive || isGrace || isCancelledButPaidThrough

  if (!canAccess && member.status !== 'test') {
    return NextResponse.json({
      state: 'billing_required',
      access: {
        status: member.subscription_status || 'none',
        can_access: false,
        requires_billing_action: true,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  // Fetch latest check-in for this week
  const sunday = getLastSunday(new Date())
  const periodStart = sunday.toISOString().split('T')[0]

  const { data: latestCheckin } = await serviceClient
    .from('coach_checkins')
    .select('submitted_at, period_start, period_end')
    .eq('member_id', user.id)
    .eq('checkin_type', 'weekly')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Compute check-in state
  const checkInState = getCurrentCheckInState(
    {
      tier: member.tier,
      status: member.status,
      bonus_credit_balance: member.bonus_credit_balance || 0,
      timezone: member.timezone || 'America/New_York',
      onboarded_at: member.onboarded_at,
    },
    latestCheckin,
  )

  // Fetch latest sent coach response (visible to member)
  const { data: latestResponse } = await serviceClient
    .from('coach_messages')
    .select('content, sent_at')
    .eq('member_id', user.id)
    .eq('direction', 'coach')
    .not('sent_at', 'is', null)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Extract focus from latest response (explicit marker, else last real paragraph).
  // The fallback used to take the final line outright, which is almost always the
  // sign-off, so the card rendered "Your current focus: - Coach Remy". Sign-offs
  // and stubs are excluded, and if nothing substantive is found the card is not
  // rendered at all rather than shown empty.
  let focus = null
  if (latestResponse?.content) {
    const isSignOff = (l: string) => {
      const t = l.trim()
      return (
        /^[-\u2013\u2014*_\s]*$/.test(t) ||                       // rules / dashes only
        /^[-\u2013\u2014]\s*coach\b/i.test(t) ||                  // "- Coach Remy"
        /^(coach\s+\w+|remy|thanks|cheers|talk soon)[.!,]?$/i.test(t) ||
        t.length < 25                                             // too short to be a focus
      )
    }
    const lines = latestResponse.content
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)

    const substantive = lines.filter((l: string) => !isSignOff(l))
    const focusLine = substantive.find((l: string) =>
      l.toLowerCase().includes('focus') ||
      l.toLowerCase().includes('this week') ||
      l.toLowerCase().includes('try this')
    )
    const body = (focusLine || substantive[substantive.length - 1] || '').trim()
    if (body) {
      focus = { body, source: 'coach_response' as const }
    }
  }

  return NextResponse.json({
    state: 'ready',
    member: {
      display_name: member.display_name,
      tier: member.tier,
      // Which product they bought. The UI brands from this; without it every
      // member saw KetoDial regardless of what they paid for.
      site: member.site,
      founding_member: member.founding_member,
      diet_type: member.diet_type,
      current_weight: member.current_weight,
      goal_weight: member.goal_weight,
      start_weight: member.start_weight,
    },
    access: {
      status: member.subscription_status || 'active',
      can_access: true,
      requires_billing_action: isGrace,
      cancel_at_period_end: member.cancel_at_period_end,
    },
    check_in: checkInState,
    coach: {
      latest_response_preview: latestResponse?.content
        ? latestResponse.content.substring(0, 150) + (latestResponse.content.length > 150 ? '...' : '')
        : null,
      latest_response_at: latestResponse?.sent_at || null,
      has_unread_response: latestResponse?.sent_at
        ? new Date(latestResponse.sent_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        : false,
    },
    focus,
    notes: {
      can_add_note: canAccess,
    },
    billing: {
      portal_url_available: !!member.tier,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}

function getLastSunday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}
