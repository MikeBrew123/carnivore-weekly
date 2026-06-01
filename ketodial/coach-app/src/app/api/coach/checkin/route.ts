import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { detectSafetyFlags } from '@/lib/safety/keywords'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const serviceClient = await createServiceClient()

  // Verify member is active
  const { data: member } = await serviceClient
    .from('coach_members')
    .select('status, tier, onboarded_at')
    .eq('id', user.id)
    .single()

  if (!member || member.status !== 'active') {
    return NextResponse.json({ error: 'Active membership required' }, { status: 403 })
  }

  // Calculate period
  const now = new Date()
  const sunday = getLastSunday(now)
  const saturday = new Date(sunday)
  saturday.setDate(saturday.getDate() + 6)

  const periodStart = sunday.toISOString().split('T')[0]
  const periodEnd = saturday.toISOString().split('T')[0]

  // Insert check-in
  const { data: checkin, error: checkinError } = await serviceClient
    .from('coach_checkins')
    .insert({
      member_id: user.id,
      checkin_type: 'weekly',
      period_start: periodStart,
      period_end: periodEnd,
      due_date: periodStart,
      weight: body.weight,
      steps_avg: body.steps_avg,
      sleep_quality: body.sleep_quality,
      energy_level: body.energy_level,
      cravings_level: body.cravings_level,
      adherence: body.adherence,
      wins: body.wins,
      struggles: body.struggles,
      symptoms: body.symptoms,
    })
    .select('id')
    .single()

  if (checkinError) {
    // Likely duplicate check-in for this period
    if (checkinError.code === '23505') {
      return NextResponse.json({ error: 'Already checked in this week' }, { status: 409 })
    }
    console.error('Check-in insert error:', checkinError)
    return NextResponse.json({ error: 'Failed to save check-in' }, { status: 500 })
  }

  // Update current weight on member
  if (body.weight) {
    await serviceClient
      .from('coach_members')
      .update({ current_weight: body.weight, updated_at: now.toISOString() })
      .eq('id', user.id)
  }

  // Insert weight metric
  if (body.weight) {
    await serviceClient
      .from('coach_metrics')
      .insert({
        member_id: user.id,
        recorded_date: now.toISOString().split('T')[0],
        weight: body.weight,
        steps: body.steps_avg,
        source: 'checkin',
      })
  }

  // Run safety keyword detection on free-text fields
  const textToCheck = [body.wins, body.struggles, body.symptoms].filter(Boolean).join(' ')
  const flags = detectSafetyFlags(textToCheck)

  if (flags.length > 0) {
    for (const flag of flags) {
      await serviceClient
        .from('coach_safety_events')
        .insert({
          member_id: user.id,
          checkin_id: checkin.id,
          trigger_text: flag.trigger,
          category: flag.category,
          severity: flag.severity,
          detected_by: 'system',
        })
    }
  }

  // TODO: Trigger async Claude draft generation
  // For now, the check-in sits in the queue for manual response by Keren
  // Claude API integration is Day 7 of the build plan

  return NextResponse.json({ ok: true, checkin_id: checkin.id })
}

function getLastSunday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}
