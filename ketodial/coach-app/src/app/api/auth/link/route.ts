import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSignInLink } from '@/lib/email/send'
import { signInUrlFrom, COACH_ORIGIN } from '@/lib/auth/links'
import { checkSignInRateLimit, recordSignInRequest, clientIpFrom } from '@/lib/auth/rate-limit'

// POST { email } -> "if that address is on the list, a link is on its way".
//
// The answer is the same whether or not an account exists, always. The launch
// list is 138 people and a route that says "no such account" lets anyone work
// out who bought, one address at a time.
//
// The link is generated with the Supabase admin API and delivered by Resend.
// Supabase's own mailer is not an option here: no custom SMTP is configured on
// this project, so it will not deliver to anybody outside the project team.

const GENERIC_RESPONSE = {
  ok: true,
  message: 'If that address has an account, a sign-in link is on its way.',
}

function generic() {
  return NextResponse.json(GENERIC_RESPONSE)
}

// LIKE wildcards in an address must not turn a lookup into a scan of the list.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = (body as { email?: unknown })?.email
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (!email || !email.includes('@') || email.length > 320) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
  }

  const ip = clientIpFrom(request.headers)
  const supabase = await createServiceClient()

  const limit = await checkSignInRateLimit(supabase, email, ip)
  if (!limit.allowed) {
    // Still the generic answer: a distinguishable 429 would leak both the
    // existence of the account and the shape of the limiter.
    console.warn('Sign-in link refused by rate limit:', limit.reason)
    return generic()
  }

  // Recorded before anything else happens, so a burst of misses costs the same
  // as a burst of hits.
  await recordSignInRequest(supabase, email, ip)

  const { data: member, error: memberError } = await supabase
    .from('coach_members')
    .select('id, email, site, status')
    .ilike('email', escapeLike(email))
    .limit(1)
    .maybeSingle()

  if (memberError) {
    console.error('Sign-in link member lookup failed:', memberError)
    return generic()
  }
  if (!member) {
    return generic()
  }

  try {
    const { data: link, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: member.email,
      options: { redirectTo: `${COACH_ORIGIN}/auth/callback` },
    })

    if (linkError || !link?.properties) {
      console.error('generateLink failed for sign-in request:', linkError)
      return generic()
    }

    // Prefer our own /auth/callback with the token hash: the session then lands
    // in server-set HttpOnly cookies instead of a URL fragment. See lib/auth/links.ts.
    const url = signInUrlFrom(link.properties, 'magiclink')
    if (!url) {
      console.error('No sign-in URL could be built for a member')
      return generic()
    }

    await sendSignInLink(member.email, url, member.site)
  } catch (err) {
    console.error('Sign-in link send failed:', err)
  }

  return generic()
}
