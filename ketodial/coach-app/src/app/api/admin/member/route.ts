import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  const { data: admin } = await serviceClient
    .from('coach_admins')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const memberId = request.nextUrl.searchParams.get('id')
  if (!memberId) {
    return NextResponse.json({ error: 'Member ID required' }, { status: 400 })
  }

  const [memberResult, checkinsResult, messagesResult, safetyResult, metricsResult] = await Promise.all([
    serviceClient
      .from('coach_members')
      .select('*')
      .eq('id', memberId)
      .single(),

    serviceClient
      .from('coach_checkins')
      .select('*')
      .eq('member_id', memberId)
      .order('submitted_at', { ascending: false })
      .limit(52),

    serviceClient
      .from('coach_messages')
      .select('id, direction, content, ai_draft, was_edited, was_auto_sent, red_flag, review_status, sent_at, created_at')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(100),

    serviceClient
      .from('coach_safety_events')
      .select('id, category, severity, status, trigger_text, detected_by, created_at, resolved_at')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(20),

    serviceClient
      .from('coach_metrics')
      .select('recorded_date, weight, steps, source')
      .eq('member_id', memberId)
      .order('recorded_date', { ascending: true })
      .limit(52),
  ])

  if (!memberResult.data) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const checkins = checkinsResult.data || []
  const streak = computeStreak(checkins)

  return NextResponse.json({
    member: memberResult.data,
    checkins,
    messages: messagesResult.data || [],
    safety_events: safetyResult.data || [],
    metrics: metricsResult.data || [],
    streak,
    admin_id: admin.id,
    admin_role: admin.role,
  }, { headers: { 'Cache-Control': 'no-store' } })
}

function computeStreak(checkins: { period_start: string }[]): number {
  if (checkins.length === 0) return 0

  let streak = 0
  const now = new Date()
  const currentSunday = new Date(now)
  currentSunday.setDate(currentSunday.getDate() - currentSunday.getDay())
  currentSunday.setHours(0, 0, 0, 0)

  for (let i = 0; i < checkins.length; i++) {
    const expected = new Date(currentSunday)
    expected.setDate(expected.getDate() - i * 7)
    const expectedStr = expected.toISOString().split('T')[0]

    if (checkins.some(c => c.period_start === expectedStr)) {
      streak++
    } else {
      break
    }
  }

  return streak
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  const { data: admin } = await serviceClient
    .from('coach_admins')
    .select('id, role')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()

  if (!admin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { member_id, coach_notes, bonus_credits } = body

  if (!member_id) {
    return NextResponse.json({ error: 'member_id required' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (typeof coach_notes === 'string') {
    updates.coach_notes = coach_notes
  }

  if (typeof bonus_credits === 'number' && bonus_credits >= 0) {
    updates.bonus_credit_balance = bonus_credits

    await serviceClient
      .from('coach_admin_audit_log')
      .insert({
        actor_admin_id: admin.id,
        action: 'grant_credit',
        target_member_id: member_id,
        metadata: { new_balance: bonus_credits },
      })
  }

  await serviceClient
    .from('coach_members')
    .update(updates)
    .eq('id', member_id)

  return NextResponse.json({ ok: true })
}
