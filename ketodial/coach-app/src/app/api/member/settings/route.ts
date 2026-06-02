import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: member } = await supabase
    .from('coach_members')
    .select('display_name, email, age, sex, current_weight, goal_weight, activity_level, diet_type, tier, founding_member, subscription_status, bonus_credit_balance, onboarded_at')
    .eq('id', user.id)
    .single()

  if (!member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  return NextResponse.json({ member })
}

export async function PATCH(request: NextRequest) {
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

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.display_name !== undefined) {
    const name = String(body.display_name).trim().substring(0, 100)
    if (!name) return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    updates.display_name = name
  }

  if (body.goal_weight !== undefined) {
    const w = Number(body.goal_weight)
    if (isNaN(w) || w < 50 || w > 800) return NextResponse.json({ error: 'Goal weight must be between 50 and 800' }, { status: 400 })
    updates.goal_weight = w
  }

  if (body.activity_level !== undefined) {
    const valid = ['sedentary', 'lightly_active', 'active', 'very_active']
    if (!valid.includes(body.activity_level)) return NextResponse.json({ error: 'Invalid activity level' }, { status: 400 })
    updates.activity_level = body.activity_level
  }

  if (Object.keys(updates).length <= 1) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const serviceClient = await createServiceClient()
  const { error } = await serviceClient
    .from('coach_members')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
