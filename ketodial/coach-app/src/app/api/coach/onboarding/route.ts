import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

// Three-tier risk classification per Hermes
// normal = standard coaching, caution = coach awareness, medical_supervision = doctor conversation required
function classifyRisk(
  conditions: string[],
  medications: string,
  pregnant: boolean,
  eatingDisorder: boolean,
  workingWithDoctor: boolean
): 'normal' | 'caution' | 'medical_supervision' {
  const conditionsLower = conditions.map(c => c.toLowerCase())
  const medsLower = (medications || '').toLowerCase()

  // MEDICAL SUPERVISION — must involve their doctor before personalized changes
  const supervisionConditions = ['type_1_diabetes', 'kidney_disease', 'heart_condition', 'bariatric_surgery']
  if (supervisionConditions.some(r => conditionsLower.includes(r))) return 'medical_supervision'
  if (pregnant) return 'medical_supervision'
  if (eatingDisorder) return 'medical_supervision'
  if (medsLower.includes('insulin') || medsLower.includes('warfarin')) return 'medical_supervision'
  if (medsLower.includes('sulfonylurea') || medsLower.includes('glipizide') || medsLower.includes('glimepiride')) return 'medical_supervision'
  if (medsLower.includes('sglt2') || medsLower.includes('empagliflozin') || medsLower.includes('dapagliflozin')) return 'medical_supervision'

  // CAUTION — coach should be aware and adjust approach
  const cautionConditions = ['type_2_diabetes', 'prediabetes', 'pcos', 'thyroid', 'hypertension', 'high_cholesterol', 'fatty_liver', 'gout', 'digestive_disorder', 'gallbladder_removed']
  if (cautionConditions.some(y => conditionsLower.includes(y))) return 'caution'
  if (medsLower.includes('metformin') || medsLower.includes('lisinopril') || medsLower.includes('statin')) return 'caution'
  if (medsLower.includes('diuretic') || medsLower.includes('blood pressure')) return 'caution'
  if (medsLower.length > 0) return 'caution'

  return 'normal'
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

  const { data: member } = await serviceClient
    .from('coach_members')
    .select('onboarding_step, status, onboarded_at')
    .eq('id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  if (member.status === 'active' && member.onboarded_at) {
    return NextResponse.json({ ok: true, complete: true, already_done: true })
  }

  if (step > (member.onboarding_step || 1) + 1) {
    return NextResponse.json({ error: 'Complete previous steps first' }, { status: 400 })
  }

  switch (step) {
    // STEP 1: Waiver + Disclaimers
    case 1: {
      const now = new Date().toISOString()
      const { error } = await serviceClient
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

      if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      return NextResponse.json({ ok: true, next_step: 2 })
    }

    // STEP 2: Safety Screening + About You
    case 2: {
      // Validate required fields
      const name = typeof body.display_name === 'string' ? body.display_name.trim().substring(0, 100) : ''
      if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

      const age = Number(body.age)
      if (isNaN(age) || age < 18 || age > 120) return NextResponse.json({ error: 'Age must be between 18 and 120' }, { status: 400 })

      const currentWeight = Number(body.current_weight)
      if (isNaN(currentWeight) || currentWeight < 50 || currentWeight > 800) return NextResponse.json({ error: 'Weight must be between 50 and 800' }, { status: 400 })

      const goalWeight = Number(body.goal_weight)
      if (isNaN(goalWeight) || goalWeight < 50 || goalWeight > 800) return NextResponse.json({ error: 'Goal weight must be between 50 and 800' }, { status: 400 })

      const heightInches = body.height_inches ? Number(body.height_inches) : null
      if (heightInches && (heightInches < 36 || heightInches > 96)) return NextResponse.json({ error: 'Height seems incorrect' }, { status: 400 })

      const validSex = ['male', 'female', 'other']
      const sex = validSex.includes(body.sex) ? body.sex : null

      const validDiets = ['keto', 'carnivore', 'lowcarb']
      const dietType = validDiets.includes(body.diet_type) ? body.diet_type : 'keto'

      // Safety fields
      // Conditions: checkboxes + free text "other"
      const checkedConditions = Array.isArray(body.health_conditions)
        ? body.health_conditions.slice(0, 15).map((c: any) => String(c).substring(0, 50))
        : []
      const otherConditions = typeof body.other_conditions === 'string' ? body.other_conditions.trim().substring(0, 300) : ''
      const conditions = otherConditions
        ? [...checkedConditions, ...otherConditions.split(',').map((c: string) => c.trim()).filter(Boolean)]
        : checkedConditions

      // Medications: free text always — members type their own
      const medications = typeof body.medications === 'string' ? body.medications.substring(0, 500) : null
      const pregnant = body.pregnant_or_nursing === true
      const eatingDisorder = body.eating_disorder_history === true
      const eatingDisorderNotes = typeof body.eating_disorder_notes === 'string' ? body.eating_disorder_notes.substring(0, 500) : null
      const workingWithDoctor = body.working_with_doctor === true

      const risk = classifyRisk(conditions, medications || '', pregnant, eatingDisorder, workingWithDoctor)

      const { error: updateErr } = await serviceClient
        .from('coach_members')
        .update({
          display_name: name,
          age,
          sex,
          height_inches: heightInches,
          current_weight: currentWeight,
          start_weight: currentWeight,
          goal_weight: goalWeight,
          diet_type: dietType,
          health_conditions: conditions,
          medications,
          pregnant_or_nursing: pregnant,
          eating_disorder_history: eatingDisorder,
          eating_disorder_notes: eatingDisorderNotes,
          working_with_doctor: workingWithDoctor,
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

    // STEP 3: Goals + Starting Point + Preferences
    case 3: {
      if (member.onboarded_at) {
        return NextResponse.json({ ok: true, complete: true, already_done: true })
      }

      const now = new Date().toISOString()

      // Validate goal
      const validGoals = ['weight_loss', 'body_recomp', 'blood_sugar', 'energy_clarity', 'athletic', 'therapeutic']
      const primaryGoal = validGoals.includes(body.primary_goal) ? body.primary_goal : null

      const validKeto = ['never', 'tried_before', 'currently_doing']
      const ketoExp = validKeto.includes(body.keto_experience) ? body.keto_experience : null

      const validTone = ['direct', 'warm', 'neutral']
      const tone = validTone.includes(body.feedback_tone) ? body.feedback_tone : 'warm'

      const validFormat = ['detailed', 'bullets']
      const format = validFormat.includes(body.feedback_format) ? body.feedback_format : 'detailed'

      const confidence = Number(body.confidence_level)
      const confLevel = (!isNaN(confidence) && confidence >= 1 && confidence <= 5) ? confidence : null

      const { error: updateErr } = await serviceClient
        .from('coach_members')
        .update({
          primary_goal: primaryGoal,
          goal_target: typeof body.goal_target === 'string' ? body.goal_target.substring(0, 500) : null,
          goal_timeline: typeof body.goal_timeline === 'string' ? body.goal_timeline.substring(0, 200) : null,
          personal_why: typeof body.personal_why === 'string' ? body.personal_why.substring(0, 1000) : null,
          typical_eating: typeof body.typical_eating === 'string' ? body.typical_eating.substring(0, 1000) : null,
          activity_level: body.activity_level || null,
          keto_experience: ketoExp,
          food_allergies: typeof body.food_allergies === 'string' ? body.food_allergies.substring(0, 300) : null,
          dietary_restrictions: typeof body.dietary_restrictions === 'string' ? body.dietary_restrictions.substring(0, 300) : null,
          feedback_tone: tone,
          feedback_format: format,
          confidence_level: confLevel,
          biggest_obstacle: typeof body.biggest_obstacle === 'string' ? body.biggest_obstacle.substring(0, 200) : null,
          biggest_challenge: typeof body.biggest_challenge === 'string' ? body.biggest_challenge.substring(0, 500) : null,
          success_vision: typeof body.success_vision === 'string' ? body.success_vision.substring(0, 500) : null,
          sleep_hours: body.sleep_hours ? Number(body.sleep_hours) : null,
          alcohol_habits: typeof body.alcohol_habits === 'string' ? body.alcohol_habits.substring(0, 200) : null,
          cooking_ability: typeof body.cooking_ability === 'string' ? body.cooking_ability.substring(0, 100) : null,
          referral_source: typeof body.referral_source === 'string' ? body.referral_source.substring(0, 100) : null,
          status: 'active',
          onboarded_at: now,
          onboarding_step: 3,
          updated_at: now,
        })
        .eq('id', user.id)

      if (updateErr) {
        console.error('Onboarding step 3 failed:', updateErr)
        return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }

      // Get member info for welcome message
      const { data: updatedMember } = await serviceClient
        .from('coach_members')
        .select('display_name, diet_type, risk_level, feedback_tone')
        .eq('id', user.id)
        .single()

      const memberName = updatedMember?.display_name || 'there'
      const diet = updatedMember?.diet_type === 'carnivore' ? 'carnivore'
        : updatedMember?.diet_type === 'keto' ? 'keto' : 'low-carb'

      // Tailor welcome message based on risk level
      let riskNote = ''
      if (updatedMember?.risk_level === 'medical_supervision') {
        riskNote = '\n\nOne important note: based on your health profile, I want to make sure your doctor is in the loop on your dietary changes. If you haven\'t already, please touch base with them. I\'ll always flag anything that should go through your healthcare provider first.'
      } else if (updatedMember?.risk_level === 'caution') {
        riskNote = '\n\nI noticed a couple of things in your health profile that I\'ll keep an eye on. Nothing to worry about, but I\'ll make sure my suggestions account for your specific situation.'
      }

      await serviceClient
        .from('coach_messages')
        .insert({
          member_id: user.id,
          direction: 'coach',
          content: `Welcome aboard, ${memberName}. I'm your coach.\n\nI've read through your intake. Your ${diet} goals are clear, and the fact that you're here means you're serious about staying consistent.${riskNote}\n\nNo homework yet. Just settle in, eat to your plan, and I'll see you at your first Sunday check-in. That's where the real work starts.\n\nOne thing to remember: you can add notes anytime during the week. I'll read everything when I review your check-in.\n\n— Your coach`,
          review_status: 'approved',
          reviewed_at: now,
          sent_at: now,
        })

      return NextResponse.json({ ok: true, complete: true, risk_level: updatedMember?.risk_level })
    }

    default:
      return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
  }
}
