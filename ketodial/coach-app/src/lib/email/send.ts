// Email send via Resend — thin wrapper for coach notifications

import { Resend } from 'resend'
import { coachSignOff } from '@/lib/coach-identity'

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
    coachName: 'Your coach',
    accent: '#0ea5e9',
  },
  carnivoreweekly: {
    product: 'Carnivore Coach',
    from: 'Carnivore Coach <coach@carnivoreweekly.com>',
    replyTo: 'sarah@carnivoreweekly.com',
    coachName: 'Your coach',
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
      // Signs as the role, so the From line must not promise a person. See
      // lib/coach-identity.ts: fronting the coach with a writer's name is the
      // thing that was retired on 2026-08-25. Reply-to stays sarah@ so the two
      // questions below still reach a human.
      from: 'Carnivore Coach <coach@carnivoreweekly.com>',
      to: email,
      replyTo: 'sarah@carnivoreweekly.com',
      subject: `You're in. We start ${opts.startDate}.`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 20px; color:#1e293b;">
          <p style="font-size:16px;line-height:1.6;">Welcome in, and congratulations. I'm glad you're here.</p>
          <p style="font-size:16px;line-height:1.6;">We start on <strong>${opts.startDate}</strong>. Your account is already set up under this email address, so there's nothing to fill in and no password to pick. One tap on the button below signs you in.</p>
          <a href="${loginUrl}" style="display:inline-block;background:#b8860b;color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:16px;margin:14px 0;">Sign me in</a>
          <p style="font-size:14px;line-height:1.6;color:#475569;">That link signs you in on its own, so there's nothing to remember. It doesn't last forever, but a fresh one is one click away, or reply here and I'll send you another.</p>

          <p style="font-size:16px;line-height:1.6;margin-top:26px;"><strong>One thing before you tap it.</strong> The web address says coach.ketodial.com, which looks odd until you know why. KetoDial is our sister site and the coaching runs on the same platform. Everything you'll see once you're in says Carnivore Coach, because that's what you bought.</p>

          <p style="font-size:16px;line-height:1.6;margin-top:26px;"><strong>Two questions, if you have a minute.</strong> Just hit reply, a sentence each is plenty:</p>
          <p style="font-size:16px;line-height:1.6;margin:0 0 6px;">1. What's gone wrong for you before?</p>
          <p style="font-size:16px;line-height:1.6;margin:0;">2. What would make these six weeks worth it?</p>
          <p style="font-size:14px;line-height:1.6;color:#475569;">I read every one of these myself, and they shape what I write in week one.</p>

          <div style="background:#f1f5f9;border-radius:10px;padding:18px;margin-top:26px;">
            <p style="font-size:16px;line-height:1.6;margin:0 0 8px;"><strong>Start with your actual numbers, half price.</strong></p>
            <p style="font-size:15px;line-height:1.6;margin:0 0 10px;color:#334155;">The Complete Protocol turns your own numbers into the targets for week one, instead of guessing and working it out six weeks later. Use code <strong>${opts.discountCode}</strong> at checkout.</p>
            <a href="https://carnivoreweekly.com/calculator.html?utm_source=coach-welcome-email" style="font-size:15px;color:#0369a1;font-weight:600;">Run my numbers &rarr;</a>
            <p style="font-size:13px;color:#64748b;margin:10px 0 0;">Optional. Six weeks of check-ins gets you there either way.</p>
          </div>

          <p style="font-size:16px;line-height:1.6;margin-top:26px;"><strong>If you take medication</strong>, especially for blood pressure or blood sugar, please tell your doctor you're changing how you eat before we start. Cutting carbs can change how those medicines behave within days, sometimes faster than people expect. It's worth a phone call this week. This is the one thing I ask of everyone before day one, and I'd much rather you were looked after than surprised.</p>

          <p style="font-size:16px;line-height:1.6;margin-top:24px;">See you on the ${opts.startDate.replace(/^(\d+)/, '$1th').split(' ')[0]}.<br>${coachSignOff('carnivoreweekly')}</p>
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

// The "email me a sign-in link" mail, sent from POST /api/auth/link.
//
// It goes through Resend rather than Supabase's own mailer for a blunt reason:
// this project has no custom SMTP configured, and Supabase refuses to deliver
// auth mail to any address outside the project team. signInWithOtp and
// resetPasswordForEmail therefore reach nobody who bought. The link itself is
// generated with the admin API and delivered from the same domain the buyer
// already gets mail from, which is exactly what the welcome email does.
//
// Deliberately short. Somebody asked to be let in; they do not want to read.
export async function sendSignInLink(
  email: string,
  loginUrl: string,
  site?: string | null
): Promise<{ success: boolean; messageId?: string }> {
  const b = brandFor(site)

  try {
    const { data, error } = await getResend().emails.send({
      from: b.from,
      replyTo: b.replyTo,
      to: email,
      subject: `Your ${b.product} sign-in link`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; color:#1e293b;">
          <p style="font-size:16px;line-height:1.6;">Good to see you back. Tap the button and you're in.</p>
          <a href="${loginUrl}" style="display:inline-block;background:${b.accent};color:#fff;font-weight:700;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:16px;margin:14px 0;">Sign me in</a>
          <p style="font-size:14px;line-height:1.6;color:#475569;">The link works once, and it doesn't last forever. If it's gone stale, ask for a fresh one at <a href="https://coach.ketodial.com/login${site ? `?site=${encodeURIComponent(site)}` : ''}" style="color:#0369a1;">coach.ketodial.com</a>. There's no password to remember.</p>
          <p style="font-size:14px;line-height:1.6;color:#475569;">If you didn't ask for this, just ignore it. Nothing happens until someone taps the button.</p>
          <p style="font-size:12px;color:#94a3b8;margin-top:20px;border-top:1px solid #e2e8f0;padding-top:14px;">${b.product} &middot; 1505 Spring Creek, Whistler, BC, Canada</p>
        </div>
      `,
    })
    if (error) { console.error('Resend error (sign-in link):', error); return { success: false } }
    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('Sign-in link send failed:', err)
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
