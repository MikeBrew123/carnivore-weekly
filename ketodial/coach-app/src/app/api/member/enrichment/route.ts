import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: member } = await supabase
    .from('coach_members')
    .select('enrichment_completed_at, feedback_tone, feedback_format')
    .eq('id', user.id)
    .single()

  return NextResponse.json({
    completed: !!member?.enrichment_completed_at,
    current: {
      feedback_tone: member?.feedback_tone,
      feedback_format: member?.feedback_format,
    },
  })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  // Nice-to-have fields with validation
  if (typeof body.stress_level === 'string') updates.coach_notes = body.stress_level // append to notes
  if (body.sleep_hours) updates.sleep_hours = Math.min(Math.max(Number(body.sleep_hours), 0), 24) || null
  if (typeof body.alcohol_habits === 'string') updates.alcohol_habits = body.alcohol_habits.substring(0, 200)
  if (typeof body.cooking_ability === 'string') updates.cooking_ability = body.cooking_ability.substring(0, 100)
  if (typeof body.food_budget === 'string') updates.food_budget = body.food_budget.substring(0, 100)

  // Allow updating feedback preferences anytime
  const validTone = ['direct', 'warm', 'neutral']
  if (validTone.includes(body.feedback_tone)) updates.feedback_tone = body.feedback_tone
  const validFormat = ['detailed', 'bullets']
  if (validFormat.includes(body.feedback_format)) updates.feedback_format = body.feedback_format

  // Mark enrichment complete
  updates.enrichment_completed_at = new Date().toISOString()

  const { error } = await serviceClient
    .from('coach_members')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
