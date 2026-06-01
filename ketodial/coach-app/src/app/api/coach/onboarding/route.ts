import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Risk screening based on intake data
function classifyRisk(conditions: string[], medications: string): 'green' | 'yellow' | 'red' {
  const redConditions = ['type 1 diabetes', 'kidney disease', 'pregnant', 'eating disorder']
  const yellowConditions = ['type 2 diabetes', 'pcos', 'thyroid', 'blood pressure']

  const conditionsLower = conditions.map(c => c.toLowerCase())
  const medsLower = (medications || '').toLowerCase()

  if (redConditions.some(r => conditionsLower.some(c => c.includes(r)))) return 'red'
  if (medsLower.includes('insulin') || medsLower.includes('warfarin')) return 'red'

  if (yellowConditions.some(y => conditionsLower.some(c => c.includes(y)))) return 'yellow'
  if (medsLower.length > 0) return 'yellow'

  return 'green'
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { step } = body

  const serviceClient = await createServiceClient()

  // Fetch current member state for step validation
  const { data: member } = await serviceClient
    .from('coach_members')
    .select('onboarding_step, status, onboarded_at')
    .eq('id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // Already completed — redirect to dashboard
  if (member.status === 'active' && member.onboarded_at) {
    return NextResponse.json({ ok: true, complete: true, already_done: true })
  }

  // Step validation: can't skip ahead
  if (step > (member.onboarding_step || 1) + 1) {
    return NextResponse.json({ error: 'Complete previous steps first' }, { status: 400 })
  }

  switch (step) {
    case 1: {
      const now = new Date().toISOString()
      await serviceClient
        .from('coach_members')
        .update({
          waiver_consented_at: now,
          waiver_version: 'v1',
          ai_disclosure_consented_at: now,
          ai_disclosure_version: 'v1',
          response_time_consented_at: now,
          response_time_version: 'v1',
          consent_ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          onboarding_step: 2,
          updated_at: now,
        })
        .eq('id', user.id)

      return NextResponse.json({ ok: true, next_step: 2 })
    }

    case 2: {
      const risk = classifyRisk(body.health_conditions || [], body.medications || '')

      await serviceClient
        .from('coach_members')
        .update({
          display_name: body.display_name,
          age: body.age,
          sex: body.sex,
          current_weight: body.current_weight,
          start_weight: body.current_weight,
          goal_weight: body.goal_weight,
          diet_type: body.diet_type,
          health_conditions: body.health_conditions || [],
          medications: body.medications || null,
          risk_level: risk,
          onboarding_step: 3,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      return NextResponse.json({ ok: true, next_step: 3, risk_level: risk })
    }

    case 3: {
      // Guard: only complete onboarding once (prevents duplicate welcome messages)
      if (member.onboarded_at) {
        return NextResponse.json({ ok: true, complete: true, already_done: true })
      }

      const now = new Date().toISOString()

      await serviceClient
        .from('coach_members')
        .update({
          biggest_challenge: body.biggest_challenge,
          success_vision: body.success_vision,
          referral_source: body.referral_source,
          status: 'active',
          onboarded_at: now,
          onboarding_step: 3,
          updated_at: now,
        })
        .eq('id', user.id)

      // Get member name for welcome message
      const { data: updatedMember } = await serviceClient
        .from('coach_members')
        .select('display_name, diet_type')
        .eq('id', user.id)
        .single()

      const name = updatedMember?.display_name || 'there'
      const diet = updatedMember?.diet_type === 'carnivore' ? 'carnivore'
        : updatedMember?.diet_type === 'keto' ? 'keto' : 'low-carb'

      // Insert Coach Remy welcome message (only if onboarded_at was just set)
      await serviceClient
        .from('coach_messages')
        .insert({
          member_id: user.id,
          direction: 'coach',
          content: `Welcome aboard, ${name} — I'm Coach Remy.\n\nI've read through your intake. Your ${diet} goals are clear, and the fact that you're here means you're serious about staying consistent.\n\nNo homework yet. Just settle in, eat to your plan, and I'll see you at your first Sunday check-in. That's where the real work starts.\n\nOne thing to remember: you can add notes anytime during the week. I'll read everything when I review your check-in.`,
          review_status: 'approved',
          reviewed_at: now,
          sent_at: now,
        })

      return NextResponse.json({ ok: true, complete: true })
    }

    default:
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  }
}
