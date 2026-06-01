import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { updateMemberSummary } from '@/lib/claude/summary-updater'
import { sendCoachRepliedNotification } from '@/lib/email/send'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceClient = await createServiceClient()

  // Verify admin
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

  const { action, message_id, content } = body

  if (!action || !message_id) {
    return NextResponse.json({ error: 'action and message_id required' }, { status: 400 })
  }

  // Fetch the message to verify it exists and is pending
  const { data: message } = await serviceClient
    .from('coach_messages')
    .select('id, member_id, review_status, content, ai_draft, red_flag')
    .eq('id', message_id)
    .maybeSingle()

  if (!message) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 })
  }

  // Get member info for notifications
  const { data: memberInfo } = await serviceClient
    .from('coach_members')
    .select('email, display_name')
    .eq('id', message.member_id)
    .single()

  // Race protection: only act on pending/flagged messages
  if (!['pending', 'flagged'].includes(message.review_status)) {
    return NextResponse.json({ error: 'Message already reviewed' }, { status: 409 })
  }

  const now = new Date().toISOString()

  switch (action) {
    case 'approve_send': {
      await serviceClient
        .from('coach_messages')
        .update({
          review_status: 'approved',
          reviewed_by_admin_id: admin.id,
          reviewed_at: now,
          sent_at: now,
          updated_at: now,
        })
        .eq('id', message_id)

      // Audit log
      await serviceClient
        .from('coach_admin_audit_log')
        .insert({
          actor_admin_id: admin.id,
          action: 'approve_send',
          target_member_id: message.member_id,
          target_message_id: message_id,
          metadata: { red_flag: message.red_flag },
        })

      // Update member summary after approved send (non-blocking)
      updateMemberSummary(serviceClient, message.member_id).catch(err =>
        console.error('Summary update failed after approve:', err)
      )

      // Notify member (non-blocking)
      if (memberInfo) {
        sendCoachRepliedNotification(memberInfo.email, memberInfo.display_name).catch(err =>
          console.error('Reply notification failed:', err)
        )
      }

      return NextResponse.json({ ok: true, action: 'approved_and_sent' })
    }

    case 'edit_send': {
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return NextResponse.json({ error: 'Content required for edit' }, { status: 400 })
      }

      await serviceClient
        .from('coach_messages')
        .update({
          content: content.trim(),
          was_edited: true,
          review_status: 'edited',
          reviewed_by_admin_id: admin.id,
          reviewed_at: now,
          sent_at: now,
          updated_at: now,
        })
        .eq('id', message_id)

      // Audit log with before/after
      await serviceClient
        .from('coach_admin_audit_log')
        .insert({
          actor_admin_id: admin.id,
          action: 'edit_send',
          target_member_id: message.member_id,
          target_message_id: message_id,
          before_state: { content: message.content },
          after_state: { content: content.trim() },
        })

      // Update member summary after edited send (non-blocking)
      updateMemberSummary(serviceClient, message.member_id).catch(err =>
        console.error('Summary update failed after edit:', err)
      )

      // Notify member (non-blocking)
      if (memberInfo) {
        sendCoachRepliedNotification(memberInfo.email, memberInfo.display_name).catch(err =>
          console.error('Reply notification failed:', err)
        )
      }

      return NextResponse.json({ ok: true, action: 'edited_and_sent' })
    }

    case 'flag': {
      await serviceClient
        .from('coach_messages')
        .update({
          review_status: 'flagged',
          reviewed_by_admin_id: admin.id,
          reviewed_at: now,
          updated_at: now,
        })
        .eq('id', message_id)

      await serviceClient
        .from('coach_admin_audit_log')
        .insert({
          actor_admin_id: admin.id,
          action: 'flag',
          target_member_id: message.member_id,
          target_message_id: message_id,
        })

      return NextResponse.json({ ok: true, action: 'flagged' })
    }

    case 'escalate': {
      // Insert escalation template as the response
      const escalationContent = 'Hi — thanks for sharing this. Because it involves your health or medication, the right next step is to check in with your doctor before we go further on the coaching side. Please reach out to them, and let me know what they say so I can support you around it. Your health comes first.'

      await serviceClient
        .from('coach_messages')
        .update({
          content: escalationContent,
          was_edited: true,
          review_status: 'escalated',
          reviewed_by_admin_id: admin.id,
          reviewed_at: now,
          sent_at: now,
          updated_at: now,
        })
        .eq('id', message_id)

      // Create safety event
      await serviceClient
        .from('coach_safety_events')
        .insert({
          member_id: message.member_id,
          message_id: message_id,
          trigger_text: 'Admin escalation',
          category: 'doctor_override',
          severity: 'high',
          status: 'escalated',
          detected_by: 'admin',
          included_doctor_referral: true,
        })

      await serviceClient
        .from('coach_admin_audit_log')
        .insert({
          actor_admin_id: admin.id,
          action: 'escalate',
          target_member_id: message.member_id,
          target_message_id: message_id,
          metadata: { escalation_reason: body.reason || 'medical_scope_boundary' },
        })

      return NextResponse.json({ ok: true, action: 'escalated' })
    }

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }
}
