import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

let _resend: any = null
function getResend() {
  if (!_resend) {
    const { Resend } = require('resend')
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://ketodial.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function corsJson(data: any, init?: { status?: number }) {
  return NextResponse.json(data, { ...init, headers: CORS_HEADERS })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return corsJson({ error: 'Invalid JSON' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!email || !email.includes('@') || email.length > 320) {
    return corsJson({ error: 'Valid email required' }, { status: 400 })
  }

  const firstName = typeof body.first_name === 'string' ? body.first_name.trim().substring(0, 100) : null
  const interests = Array.isArray(body.interests) ? body.interests.slice(0, 10).map((i: any) => String(i).substring(0, 50)) : []
  const note = typeof body.note === 'string' ? body.note.trim().substring(0, 500) : null

  const serviceClient = await createServiceClient()

  // Upsert — if they sign up again, update their info
  const { error } = await serviceClient
    .from('coach_waitlist')
    .upsert({
      email,
      first_name: firstName,
      interests,
      note,
      source: 'landing',
    }, { onConflict: 'email' })

  if (error) {
    console.error('Waitlist insert error:', error)
    return corsJson({ error: 'Failed to join waitlist' }, { status: 500 })
  }

  // Send welcome email (non-blocking)
  const name = firstName || 'there'
  try {
    await getResend().emails.send({
      from: 'KetoDial Coach <coach@carnivoreweekly.com>',
      to: email,
      subject: "You're on the list — thanks for being early",
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head><body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0">
<tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%">

<!-- Header -->
<tr><td style="background:#0b1620;padding:32px;border-radius:14px 14px 0 0;text-align:center">
  <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
    <td style="vertical-align:middle;padding-right:12px">
      <img src="https://coach.ketodial.com/logo-dial.png" width="38" height="38" alt="" style="display:block" />
    </td>
    <td style="vertical-align:middle">
      <span style="font-size:26px;font-weight:800;color:#e2eef7;letter-spacing:-0.02em">Keto<span style="color:#38bdf8">Dial</span></span>
      <span style="font-size:11px;font-weight:600;color:#64748b;letter-spacing:0.14em;text-transform:uppercase;padding-left:8px">COACH</span>
    </td>
  </tr></table>
</td></tr>

<!-- Body -->
<tr><td style="background:#ffffff;padding:32px 32px 28px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0">
  <p style="font-size:17px;line-height:1.6;color:#0f172a;margin:0 0 16px">Hey ${name},</p>
  <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 16px">Thank you for signing up. You're on the list for the KetoDial Coach founding cohort.</p>
  <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 16px">Here's where we are: we're finishing up testing with a small group right now. We're close to opening the doors for our first founding members, and you'll be among the first to know when that happens.</p>
  <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 16px">As part of the founding group, we'll be asking for your honest feedback as you use the system. Your input will directly shape how this works for everyone who comes after you. That matters a lot to us.</p>

  <!-- Bring a friend callout -->
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0"><tr>
    <td style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:12px;padding:18px 20px">
      <p style="font-size:14px;font-weight:700;color:#0d9488;margin:0 0 6px;text-transform:uppercase;letter-spacing:0.05em">Coming for early members</p>
      <p style="font-size:15px;line-height:1.5;color:#334155;margin:0">As we grow the founding group, you'll get a <strong>bring-a-friend pass</strong> so someone you know can skip the line. Our way of saying thanks for being here from the start.</p>
    </td>
  </tr></table>

  <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 16px">Sit tight. We'll be in touch soon.</p>
  <p style="font-size:16px;line-height:1.6;color:#0f172a;margin:0">The KetoDial Coach Team</p>
</td></tr>

<!-- Footer -->
<tr><td style="background:#f8fafc;padding:20px 32px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 14px 14px">
  <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:0">KetoDial provides educational information, accountability tools, and nutrition-related content. KetoDial does not provide medical advice, diagnosis, or treatment.</p>
  <p style="font-size:11px;color:#94a3b8;margin:8px 0 0">KetoDial Coach &middot; 1505 Spring Creek, Whistler, BC, Canada</p>
  <p style="font-size:11px;color:#cbd5e1;margin:4px 0 0">&copy; 2026 KetoDial &middot; <a href="https://ketodial.com" style="color:#94a3b8">ketodial.com</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body></html>
      `,
    })
  } catch (err) {
    console.error('Waitlist welcome email failed:', err)
  }

  // Get current waitlist count
  const { count } = await serviceClient
    .from('coach_waitlist')
    .select('*', { count: 'exact', head: true })

  return corsJson({ ok: true, position: count })
}
