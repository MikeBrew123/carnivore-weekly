// Email send via Resend — thin wrapper for coach notifications

import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// Members bought one of two products and the notification must say the one they
// bought. coach_members.site is the source of truth: 'carnivoreweekly' for the
// Carnivore cohort, 'ketodial' for KetoDial members. Both run on the same
// platform and the same sending domain; only the naming differs.
//
// coachName deliberately matches what the AI actually signs its replies with
// (see lib/claude/system-prompt.ts). If the persona is ever split per site,
// change it in BOTH places or the email will contradict the reply it announces.
export type CoachSite = 'ketodial' | 'carnivoreweekly'

const BRAND: Record<CoachSite, {
  product: string; from: string; replyTo: string; coachName: string; accent: string
}> = {
  ketodial: {
    product: 'KetoDial Coach',
    from: 'KetoDial Coach <coach@carnivoreweekly.com>',
    replyTo: 'coach@carnivoreweekly.com',
    coachName: 'Coach Remy',
    accent: '#0ea5e9',
  },
  carnivoreweekly: {
    product: 'Carnivore Coach',
    from: 'Carnivore Coach <coach@carnivoreweekly.com>',
    replyTo: 'sarah@carnivoreweekly.com',
    coachName: 'Coach Remy',
    accent: '#b8860b',
  },
}

function brandFor(site?: string | null) {
  return BRAND[(site as CoachSite) in BRAND ? (site as CoachSite) : 'ketodial']
}

export async function sendCheckinReminder(
  email: string,
  displayName: string,
  site?: string | null
): Promise<{ success: boolean; messageId?: string }> {
  const firstName = displayName.split(' ')[0]
  const b = brandFor(site)

  try {
    const { data, error } = await getResend().emails.send({
      from: b.from,
      replyTo: b.replyTo,
      to: email,
      subject: `${firstName}, your weekly check-in is ready`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Hey ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Your weekly check-in is ready. It takes about 2 minutes, and ${b.coachName} will have your response within a day.</p>
          <a href="https://coach.ketodial.com/app/checkin" style="display: inline-block; background: ${b.accent}; color: #fff; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 16px; margin: 16px 0;">Submit check-in</a>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px;">${b.product} is a check-in tool, not medical advice.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 14px;">${b.product} &middot; 1505 Spring Creek, Whistler, BC, Canada</p>
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
  displayName: string,
  site?: string | null
): Promise<{ success: boolean; messageId?: string }> {
  const firstName = displayName.split(' ')[0]
  const b = brandFor(site)

  try {
    const { data, error } = await getResend().emails.send({
      from: b.from,
      replyTo: b.replyTo,
      to: email,
      subject: `${b.coachName} responded to your check-in`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Hey ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">${b.coachName} reviewed your check-in and has a response for you.</p>
          <a href="https://coach.ketodial.com/app/thread" style="display: inline-block; background: ${b.accent}; color: #fff; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 16px; margin: 16px 0;">Read response</a>
          <p style="font-size: 14px; color: #64748b; margin-top: 24px;">${b.product} is a check-in tool, not medical advice.</p>
          <p style="font-size: 12px; color: #94a3b8; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 14px;">${b.product} &middot; 1505 Spring Creek, Whistler, BC, Canada</p>
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

// Sent the moment a cohort purchase completes. Before this existed a buyer got a
// Stripe receipt, a page promising an email "within a day", and then silence
// until somebody noticed the sale by hand.
export async function sendCohortWelcome(
  email: string,
  loginUrl: string,
  opts: { startDate: string; discountCode: string }
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const { data, error } = await getResend().emails.send({
      from: 'Sarah at Carnivore Weekly <coach@carnivoreweekly.com>',
      to: email,
      replyTo: 'sarah@carnivoreweekly.com',
      subject: `You're in. We start ${opts.startDate}.`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 20px; color:#1e293b;">
          <p style="font-size:16px;line-height:1.6;">You're in, and I'm glad you are.</p>
          <p style="font-size:16px;line-height:1.6;">We start <strong>${opts.startDate}</strong>. Your account is already set up with this email address, so the only thing you need to do today is set a password.</p>
          <a href="${loginUrl}" style="display:inline-block;background:#0ea5e9;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:16px;margin:14px 0;">Set my password</a>
          <p style="font-size:14px;line-height:1.6;color:#475569;">That link signs you in and takes you straight to your settings. It expires in 24 hours, and you can always ask for a new one by replying to this email.</p>

          <p style="font-size:16px;line-height:1.6;margin-top:26px;"><strong>One thing that will look odd, so I'll say it first.</strong> The coaching runs on our own platform, and that platform still carries our sister site's name, KetoDial. Same team, same people. We built it there first and haven't finished renaming it. Your programme is the carnivore one.</p>

          <p style="font-size:16px;line-height:1.6;margin-top:26px;"><strong>Two questions, if you have a minute.</strong> Just hit reply, a sentence each is plenty:</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 6px;">1. What has gone wrong for you before?</p>
          <p style="font-size:16px;line-height:1.6;margin:0;">2. What would make these six weeks worth it?</p>
          <p style="font-size:14px;line-height:1.6;color:#475569;">I read every one of these myself, and they shape what I write in week one.</p>

          <div style="background:#f1f5f9;border-radius:10px;padding:18px;margin-top:26px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 8px;"><strong>Start with your actual numbers, half price.</strong></p>
            <p style="font-size:15px;line-height:1.6;margin:0 0 10px;color:#334155;">Most people begin a diet and work out six weeks later what their targets should have been. The Complete Protocol turns your calculator results into the specific version for you. Use <strong>${opts.discountCode}</strong> for 50% off.</p>
            <a href="https://carnivoreweekly.com/calculator.html?utm_source=coach-welcome-email" style="font-size:15px;color:#0369a1;font-weight:600;">Run my numbers &rarr;</a>
            <p style="font-size:13px;color:#64748b;margin:10px 0 0;">Optional. Six weeks of check-ins gets you there either way.</p>
          </div>

          <p style="font-size:16px;line-height:1.6;margin-top:26px;"><strong>If you take medication</strong>, particularly for blood pressure or blood sugar, tell your doctor you're changing how you eat before we start. Cutting carbs can change how those behave within days. That's a condition of joining, not fine print.</p>

          <p style="font-size:16px;line-height:1.6;margin-top:24px;">See you on the ${opts.startDate.replace(/^(\d+)/, '$1th').split(' ')[0]}.<br>Sarah</p>
          <p style="font-size:12px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:14px;">Carnivore Weekly &middot; 1505 Spring Creek, Whistler, BC, Canada<br>Coaching, not medical care.</p>
        </div>
      `,
    })
    if (error) { console.error('Resend error (cohort welcome):', error); return { success: false } }
    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Cohort welcome send failed:', err)
    return { success: false }
  }
}

// Owner alert on every sale. Brew asked for this explicitly: he wants to know a
// sale landed without going to look for it.
export async function sendSaleAlert(
  buyerEmail: string,
  amount: string,
  program: string,
  seatsSold: number | null
): Promise<{ success: boolean }> {
  try {
    const { error } = await getResend().emails.send({
      from: 'Carnivore Weekly <coach@carnivoreweekly.com>',
      to: 'iambrew@gmail.com',
      subject: `Coach sale: ${buyerEmail}${seatsSold ? ` (#${seatsSold})` : ''}`,
      html: `<div style="font-family:-apple-system,sans-serif;font-size:15px;line-height:1.6;">
        <p><strong>${amount}</strong> &middot; ${program}</p>
        <p>Buyer: ${buyerEmail}</p>
        ${seatsSold ? `<p>That's sale number ${seatsSold}.</p>` : ''}
        <p>Account created and welcome email sent automatically. Nothing needed from you unless they reply.</p>
        <p><a href="https://coach.ketodial.com/admin">Open the admin queue</a></p>
      </div>`,
    })
    if (error) { console.error('Resend error (sale alert):', error); return { success: false } }
    return { success: true }
  } catch (err) {
    console.error('Sale alert failed:', err)
    return { success: false }
  }
}
