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

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
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
      // Input validation
      const name = typeof body.display_name === 'string' ? body.display_name.trim().substring(0, 100) : ''
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

      const age = typeof body.age === 'number' ? body.age : parseInt(body.age)
      if (isNaN(age) || age < 18 || age > 120) return NextResponse.json({ error: 'Age must be between 18 and 120' }, { status: 400 })

      const currentWeight = typeof body.current_weight === 'number' ? body.current_weight : parseFloat(body.current_weight)
      if (isNaN(currentWeight) || currentWeight < 50 || currentWeight > 800) return NextResponse.json({ error: 'Weight must be between 50 and 800' }, { status: 400 })

      const goalWeight = typeof body.goal_weight === 'number' ? body.goal_weight : parseFloat(body.goal_weight)
      if (isNaN(goalWeight) || goalWeight < 50 || goalWeight > 800) return NextResponse.json({ error: 'Goal weight must be between 50 and 800' }, { status: 400 })

      const validDiets = ['keto', 'carnivore', 'lowcarb']
      const dietType = validDiets.includes(body.diet_type) ? body.diet_type : 'keto'

      const validSex = ['male', 'female', 'other']
      const sex = validSex.includes(body.sex) ? body.sex : null

      const conditions = Array.isArray(body.health_conditions) ? body.health_conditions.slice(0, 10).map((c: any) => String(c).substring(0, 50)) : []
      const medications = typeof body.medications === 'string' ? body.medications.substring(0, 500) : null

      const risk = classifyRisk(conditions, medications || '')

      const { error: updateErr } = await serviceClient
        .from('coach_members')
        .update({
          display_name: name,
          age,
          sex,
          current_weight: currentWeight,
          start_weight: currentWeight,
          goal_weight: goalWeight,
          diet_type: dietType,
          health_conditions: conditions,
          medications,
          risk_level: risk,
          onboarding_step: 3,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateErr) {
        console.error('Onboarding step 2 failed:', updateErr)
        return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
      }

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
