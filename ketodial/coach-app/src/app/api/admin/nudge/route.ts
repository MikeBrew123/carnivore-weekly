import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { detectNudgeOpportunities } from '@/lib/nudge/engine'
import { sendCoachRepliedNotification } from '@/lib/email/send'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()
  const { data: admin } = await serviceClient
    .from('coach_admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const suggestions = await detectNudgeOpportunities(serviceClient)

  return NextResponse.json({ suggestions }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = await createServiceClient()
  const { data: admin } = await serviceClient
    .from('coach_admins')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('active', true)
    .maybeSingle()
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  let body: any
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { member_id, message, reason } = body
  if (!member_id || !message) {
    return NextResponse.json({ error: 'member_id and message required' }, { status: 400 })
  }

  // Rate limit check: any nudge in last 7 days?
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await serviceClient
    .from('coach_admin_audit_log')
    .select('id')
    .eq('action', 'send_nudge')
    .eq('target_member_id', member_id)
    .gte('created_at', oneWeekAgo)
    .limit(1)
    .maybeSingle()

  if (recent) {
    return NextResponse.json({ error: 'Member was nudged within the last 7 days' }, { status: 429 })
  }

  // Check no coaching response sent today
  const today = new Date().toISOString().split('T')[0]
  const { data: todayMsg } = await serviceClient
    .from('coach_messages')
    .select('id')
    .eq('member_id', member_id)
    .eq('direction', 'coach')
    .gte('sent_at', `${today}T00:00:00`)
    .limit(1)
    .maybeSingle()

  if (todayMsg) {
    return NextResponse.json({ error: 'Coaching response already sent today' }, { status: 429 })
  }

  // Insert nudge as a coach message
  const now = new Date().toISOString()
  await serviceClient
    .from('coach_messages')
    .insert({
      member_id,
      direction: 'coach',
      content: message.trim(),
      review_status: 'approved',
      reviewed_by_admin_id: admin.id,
      reviewed_at: now,
      sent_at: now,
    })

  // Audit log
  await serviceClient
    .from('coach_admin_audit_log')
    .insert({
      actor_admin_id: admin.id,
      action: 'send_nudge',
      target_member_id: member_id,
      metadata: { reason: reason || 'manual', message_preview: message.substring(0, 100) },
    })

  // Notify member
  const { data: memberInfo } = await serviceClient
    .from('coach_members')
    .select('email, display_name')
    .eq('id', member_id)
    .single()

  if (memberInfo) {
    sendCoachRepliedNotification(memberInfo.email, memberInfo.display_name).catch(err =>
      console.error('Nudge notification failed:', err)
    )
  }

  return NextResponse.json({ ok: true })
}
