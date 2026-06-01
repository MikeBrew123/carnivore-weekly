import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { consumeBonusCredit } from '@/lib/eligibility'

export async function POST(request: NextRequest) {
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

  const { action, member_id, amount } = body

  if (!member_id) {
    return NextResponse.json({ error: 'member_id required' }, { status: 400 })
  }

  if (action === 'grant') {
    const grantAmount = typeof amount === 'number' && amount > 0 ? amount : 1

    const { error } = await serviceClient
      .from('coach_members')
      .update({
        bonus_credit_balance: grantAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member_id)

    if (error) {
      return NextResponse.json({ error: 'Failed to grant credit' }, { status: 500 })
    }

    await serviceClient
      .from('coach_admin_audit_log')
      .insert({
        actor_admin_id: admin.id,
        action: 'grant_credit',
        target_member_id: member_id,
        metadata: { new_balance: grantAmount, reason: body.reason || 'manual_admin_grant' },
      })

    return NextResponse.json({ ok: true, new_balance: grantAmount })
  }

  if (action === 'consume') {
    const result = await consumeBonusCredit(serviceClient, member_id, admin.id, body.reason || 'member_request')
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid action. Use "grant" or "consume".' }, { status: 400 })
}
