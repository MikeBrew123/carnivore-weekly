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
      from: 'KetoDial Coach <coach@ketodial.com>',
      to: email,
      subject: "You're on the list — thanks for being early",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Hey ${name},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Thank you for signing up. You're on the list for the KetoDial Coach founding cohort.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Here's where we are: we're finishing up testing with a small group right now. We're close to opening the doors for our first founding members, and you'll be among the first to know when that happens.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">As part of the founding group, we'll be asking for your honest feedback as you use the system. Your input will directly shape how this works for everyone who comes after you. That matters a lot to us.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">One more thing: as we continue testing and grow the founding group, we'll be giving early members a <strong>bring-a-friend pass</strong> so someone you know can skip the line. Our way of saying thanks for being here from the start.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Sit tight. We'll be in touch soon.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">The KetoDial Coach Team</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #94a3b8;">KetoDial provides educational information, accountability tools, and nutrition-related content. KetoDial does not provide medical advice, diagnosis, or treatment.</p>
        </div>
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
