// Email send via Resend — thin wrapper for coach notifications

import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM = 'Coach Remy <coach@ketodial.com>'

export async function sendCheckinReminder(
  email: string,
  displayName: string
): Promise<{ success: boolean; messageId?: string }> {
  const firstName = displayName.split(' ')[0]

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `${firstName}, your weekly check-in is ready`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Hey ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Your weekly check-in is ready. It takes about 2 minutes, and Coach Remy will have your response within a day.</p>
          <a href="https://coach.ketodial.com/app/checkin" style="display: inline-block; background: #0ea5e9; color: #fff; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 16px; margin: 16px 0;">Submit check-in</a>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px;">KetoDial Coach is a check-in tool, not medical advice.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Email send failed:', err)
    return { success: false }
  }
}

export async function sendCoachRepliedNotification(
  email: string,
  displayName: string
): Promise<{ success: boolean; messageId?: string }> {
  const firstName = displayName.split(' ')[0]

  try {
    const { data, error } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Coach Remy responded to your check-in`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Hey ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Coach Remy reviewed your check-in and has a response for you.</p>
          <a href="https://coach.ketodial.com/app/thread" style="display: inline-block; background: #0ea5e9; color: #fff; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 16px; margin: 16px 0;">Read response</a>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px;">KetoDial Coach is a check-in tool, not medical advice.</p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Email send failed:', err)
    return { success: false }
  }
}
