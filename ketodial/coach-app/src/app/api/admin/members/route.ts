import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
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

  // Get all active members
  const { data: members } = await serviceClient
    .from('coach_members')
    .select('id, display_name, email, tier, founding_member, status, subscription_status, age, sex, diet_type, start_weight, current_weight, goal_weight, health_conditions, medications, onboarded_at, created_at')
    .in('status', ['active', 'test'])
    .order('display_name')

  if (!members) {
    return NextResponse.json({ members: [], checkins: {} })
  }

  // Get latest 2 check-ins per member for trend comparison
  const memberIds = members.map(m => m.id)
  const { data: allCheckins } = await serviceClient
    .from('coach_checkins')
    .select('member_id, weight, sleep_quality, energy_level, cravings_level, adherence, period_start, submitted_at')
    .in('member_id', memberIds)
    .order('submitted_at', { ascending: false })
    .limit(200)

  // Group by member: latest + previous
  const checkinsByMember: Record<string, { latest: any; previous: any }> = {}
  for (const c of (allCheckins || [])) {
    if (!checkinsByMember[c.member_id]) {
      checkinsByMember[c.member_id] = { latest: c, previous: null }
    } else if (!checkinsByMember[c.member_id].previous) {
      checkinsByMember[c.member_id].previous = c
    }
  }

  // Check who submitted this week
  const now = new Date()
  const sunday = new Date(now)
  sunday.setDate(sunday.getDate() - sunday.getDay())
  sunday.setHours(0, 0, 0, 0)
  const currentPeriod = sunday.toISOString().split('T')[0]

  const submittedThisWeek = new Set(
    (allCheckins || [])
      .filter(c => c.period_start === currentPeriod)
      .map(c => c.member_id)
  )

  // Compute tenure in weeks
  const membersWithMeta = members.map(m => ({
    ...m,
    weeks_active: Math.floor((Date.now() - new Date(m.onboarded_at || m.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000)),
    submitted_this_week: submittedThisWeek.has(m.id),
  }))

  return NextResponse.json({
    members: membersWithMeta,
    checkins: checkinsByMember,
    current_period: currentPeriod,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
