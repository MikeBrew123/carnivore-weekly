import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { detectSafetyFlags } from '@/lib/safety/keywords'
import { canMemberAccessCoaching } from '@/lib/member-access'
import { generateCoachDraft } from '@/lib/claude/coach'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Server-side validation
  if (body.weight != null && (body.weight < 50 || body.weight > 800)) {
    return NextResponse.json({ error: 'Weight must be between 50 and 800' }, { status: 400 })
  }
  if (body.adherence != null && (body.adherence < 1 || body.adherence > 10)) {
    return NextResponse.json({ error: 'Adherence must be between 1 and 10' }, { status: 400 })
  }
  if (body.sleep_quality != null && (body.sleep_quality < 1 || body.sleep_quality > 5)) {
    return NextResponse.json({ error: 'Sleep quality must be between 1 and 5' }, { status: 400 })
  }
  if (body.energy_level != null && (body.energy_level < 1 || body.energy_level > 5)) {
    return NextResponse.json({ error: 'Energy level must be between 1 and 5' }, { status: 400 })
  }
  if (body.cravings_level != null && (body.cravings_level < 1 || body.cravings_level > 5)) {
    return NextResponse.json({ error: 'Cravings level must be between 1 and 5' }, { status: 400 })
  }
  // Truncate free text fields to 5000 chars
  const maxText = 5000
  if (body.wins) body.wins = body.wins.substring(0, maxText)
  if (body.struggles) body.struggles = body.struggles.substring(0, maxText)
  if (body.symptoms) body.symptoms = body.symptoms.substring(0, maxText)

  const serviceClient = await createServiceClient()

  // Verify member has active coaching access (includes billing check)
  const { data: member } = await serviceClient
    .from('coach_members')
    .select('status, tier, subscription_status, onboarded_at, current_period_end')
    .eq('id', user.id)
    .maybeSingle()

  if (!member || !canMemberAccessCoaching(member)) {
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
    const { error: weightErr } = await serviceClient
      .from('coach_members')
      .update({ current_weight: body.weight, updated_at: now.toISOString() })
      .eq('id', user.id)
    if (weightErr) console.error('Weight update failed:', weightErr)
  }

  // Insert weight metric
  if (body.weight) {
    const { error: metricErr } = await serviceClient
      .from('coach_metrics')
      .insert({
        member_id: user.id,
        recorded_date: now.toISOString().split('T')[0],
        weight: body.weight,
        steps: body.steps_avg,
        source: 'checkin',
      })
    if (metricErr) console.error('Metric insert failed:', metricErr)
  }

  // Run safety keyword detection on free-text fields
  const textToCheck = [body.wins, body.struggles, body.symptoms].filter(Boolean).join(' ')
  const flags = detectSafetyFlags(textToCheck)

  if (flags.length > 0) {
    for (const flag of flags) {
      const { error: safetyErr } = await serviceClient
        .from('coach_safety_events')
        .insert({
          member_id: user.id,
          checkin_id: checkin.id,
          trigger_text: flag.trigger,
          category: flag.category,
          severity: flag.severity,
          detected_by: 'system',
        })
      if (safetyErr) {
        console.error('CRITICAL: Safety event insert failed:', safetyErr, 'Flag:', flag)
      }
    }
  }

  // Trigger async Claude draft generation (non-blocking)
  // Check-in is saved regardless of whether draft generation succeeds
  generateCoachDraft(serviceClient, user.id, checkin.id).catch(err =>
    console.error('Coach draft generation failed:', err)
  )

  return NextResponse.json({ ok: true, checkin_id: checkin.id })
}

function getLastSunday(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}
