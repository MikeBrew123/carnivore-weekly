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
      from: 'Coach Remy <coach@ketodial.com>',
      to: email,
      subject: "You're on the list — KetoDial Coach founding cohort",
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px;">
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Hey ${name},</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">You're on the interest list for the KetoDial Coach founding cohort.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">We're putting the finishing touches on the coaching workflow with our first test group. Once we're ready for early access, you'll be the first to know.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">The founding cohort will be intentionally small — we want to get the experience right before opening it up.</p>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">Talk soon,<br/>Coach Remy<br/><span style="color: #94a3b8; font-size: 14px;">KetoDial Coach</span></p>
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
