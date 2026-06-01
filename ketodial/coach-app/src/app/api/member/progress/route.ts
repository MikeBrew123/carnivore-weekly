import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  const [memberResult, metricsResult, checkinsResult] = await Promise.all([
    serviceClient
      .from('coach_members')
      .select('display_name, start_weight, current_weight, goal_weight, onboarded_at')
      .eq('id', user.id)
      .single(),

    serviceClient
      .from('coach_metrics')
      .select('recorded_date, weight, steps')
      .eq('member_id', user.id)
      .order('recorded_date', { ascending: true })
      .limit(52),

    serviceClient
      .from('coach_checkins')
      .select('period_start, adherence, energy_level, cravings_level, sleep_quality, submitted_at')
      .eq('member_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(12),
  ])

  const member = memberResult.data
  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Compute streak
  const checkins = checkinsResult.data || []
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

  // Compute averages from last 4 check-ins
  const recent = checkins.slice(0, 4)
  const avg = (arr: number[]) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length) : null

  return NextResponse.json({
    member: {
      display_name: member.display_name,
      start_weight: member.start_weight,
      current_weight: member.current_weight,
      goal_weight: member.goal_weight,
      onboarded_at: member.onboarded_at,
    },
    metrics: metricsResult.data || [],
    streak,
    total_checkins: checkins.length,
    averages: {
      adherence: avg(recent.map(c => c.adherence).filter(Boolean)),
      energy: avg(recent.map(c => c.energy_level).filter(Boolean)),
      cravings: avg(recent.map(c => c.cravings_level).filter(Boolean)),
      sleep: avg(recent.map(c => c.sleep_quality).filter(Boolean)),
    },
  })
}
