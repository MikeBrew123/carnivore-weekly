import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { computeCheckinReminders, computeReplyNotifications } from '@/lib/email/reminder-engine'
import { sendCheckinReminder, sendCoachRepliedNotification } from '@/lib/email/send'

export async function GET(request: NextRequest) {
  // Verify cron secret — fail closed (reject if no secret configured)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dryRun = request.nextUrl.searchParams.get('dry') === '1'
  const serviceClient = await createServiceClient()
  const now = new Date()

  const [checkinDecisions, replyDecisions] = await Promise.all([
    computeCheckinReminders(serviceClient, now),
    computeReplyNotifications(serviceClient, now),
  ])

  const results = {
    dry_run: dryRun,
    timestamp: now.toISOString(),
    checkin_reminders: { sent: 0, skipped: 0, failed: 0, decisions: [] as any[] },
    reply_notifications: { sent: 0, skipped: 0, failed: 0, decisions: [] as any[] },
  }

  // Process check-in reminders
  for (const d of checkinDecisions) {
    if (d.skip) {
      results.checkin_reminders.skipped++
      results.checkin_reminders.decisions.push({ ...d, action: 'skipped' })
      continue
    }

    if (dryRun) {
      results.checkin_reminders.sent++
      results.checkin_reminders.decisions.push({ ...d, action: 'would_send' })
      continue
    }

    const sent = await sendCheckinReminder(d.email, d.display_name, d.site)
    if (sent.success) {
      results.checkin_reminders.sent++
      results.checkin_reminders.decisions.push({ ...d, action: 'sent', messageId: sent.messageId })

      // Log to audit
      await serviceClient
        .from('coach_admin_audit_log')
        .insert({
          actor_admin_id: null,
          action: 'email_checkin_due',
          target_member_id: d.member_id,
          metadata: { email: d.email, provider_id: sent.messageId },
        })
    } else {
      results.checkin_reminders.failed++
      results.checkin_reminders.decisions.push({ ...d, action: 'failed' })
    }
  }

  // Process reply notifications
  for (const d of replyDecisions) {
    if (d.skip) {
      results.reply_notifications.skipped++
      results.reply_notifications.decisions.push({ ...d, action: 'skipped' })
      continue
    }

    if (dryRun) {
      results.reply_notifications.sent++
      results.reply_notifications.decisions.push({ ...d, action: 'would_send' })
      continue
    }

    const sent = await sendCoachRepliedNotification(d.email, d.display_name, d.site)
    if (sent.success) {
      results.reply_notifications.sent++
      results.reply_notifications.decisions.push({ ...d, action: 'sent', messageId: sent.messageId })

      await serviceClient
        .from('coach_admin_audit_log')
        .insert({
          actor_admin_id: null,
          action: 'email_coach_replied',
          target_member_id: d.member_id,
          metadata: { email: d.email, provider_id: sent.messageId },
        })
    } else {
      results.reply_notifications.failed++
      results.reply_notifications.decisions.push({ ...d, action: 'failed' })
    }
  }

  return NextResponse.json(results)
}
