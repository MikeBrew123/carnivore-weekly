import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { resolvePostAuthDestination, safeRelativePath } from '@/lib/auth/destination'

// The front door. Two kinds of arrival land here:
//
//   ?code=...                     OAuth (Google), PKCE flow
//   ?token_hash=...&type=magiclink  emailed sign-in link, see lib/auth/links.ts
//
// Both end with the session written into cookies BY THE SERVER, which is the
// whole reason this route matters. The previous version copied cookie names and
// values onto the response and dropped the options, so the browser received
// bare `sb-...=value; Path=/`: no HttpOnly, no Secure, no SameSite, and no
// Max-Age. That last one turns every session into a browser-session cookie, so
// closing the browser signs the member out. It had never run in production, so
// nobody had seen it. It runs now.

// How long a signed-in session survives on the device.
//
// @supabase/ssr asks for roughly 400 days, which is the browser's own ceiling.
// On a six-week program that is not convenience, it is a health-data session
// left open on a device for over a year, and members in this cohort share
// laptops and tablets with family. Ninety days still means essentially nobody
// is logged out mid-program, while a lost or shared device stops being an
// open door indefinitely.
//
// This is a CLAMP, not an assignment: sign-out and token-rotation removals
// arrive as maxAge 0 and must stay 0.
const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60

function clampSessionLifetime<T extends { maxAge?: number }>(options: T): T {
  if (typeof options?.maxAge !== 'number' || options.maxAge <= 0) return options
  return { ...options, maxAge: Math.min(options.maxAge, SESSION_MAX_AGE_SECONDS) }
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const otpType = searchParams.get('type')
  const oauthError = searchParams.get('error')
  const requestedRedirect = safeRelativePath(searchParams.get('redirect'))

  // Google (or Supabase) refused or the person clicked Cancel. Say so plainly
  // rather than showing the generic "something went wrong" copy.
  if (oauthError) {
    const reason = oauthError === 'access_denied' ? 'cancelled' : 'auth'
    return NextResponse.redirect(new URL(`/login?error=${reason}`, origin))
  }

  if (!code && !tokenHash) {
    return NextResponse.redirect(new URL('/login?error=auth', origin))
  }

  // Cookies set during the exchange are collected here and applied to whichever
  // response we end up returning, options intact.
  const pendingCookies: { name: string; value: string; options: CookieOptions }[] = []
  const pendingHeaders: Record<string, string> = {}

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            pendingCookies.push({ name, value, options })
          })
          // Supabase asks for no-store on any response that sets auth cookies,
          // so a CDN cannot hand one person's session to the next visitor.
          Object.entries(headers ?? {}).forEach(([key, value]) => {
            pendingHeaders[key] = value
          })
        },
      },
    }
  )

  function redirectTo(path: string) {
    const response = NextResponse.redirect(new URL(path, origin))
    pendingCookies.forEach(({ name, value, options }) =>
      response.cookies.set(name, value, clampSessionLifetime(options))
    )
    Object.entries(pendingHeaders).forEach(([key, value]) =>
      response.headers.set(key, value)
    )
    return response
  }

  let userId: string | null = null

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
      console.error('auth/callback: code exchange failed', error?.message)
      return NextResponse.redirect(new URL('/login?error=auth', origin))
    }
    userId = data.user.id
  } else {
    // Emailed link. type comes back on the query string; anything unexpected is
    // treated as a magic link, which is what /api/auth/link and the Stripe
    // webhook both generate.
    const type = otpType === 'recovery' || otpType === 'invite' || otpType === 'signup'
      ? otpType
      : 'magiclink'
    const { data, error } = await supabase.auth.verifyOtp({
      type: type as 'magiclink' | 'recovery' | 'invite' | 'signup',
      token_hash: tokenHash!,
    })
    if (error || !data.user) {
      console.error('auth/callback: token verification failed', error?.message)
      return NextResponse.redirect(new URL('/login?error=expired', origin))
    }
    userId = data.user.id
  }

  // Membership decides where they go, and whether they go anywhere at all.
  // Doing it here, server-side, means a mismatched account never renders a
  // member page even for a moment.
  const { data: admin } = await supabase
    .from('coach_admins')
    .select('role')
    .eq('auth_user_id', userId)
    .eq('active', true)
    .maybeSingle()

  const { data: member } = await supabase
    .from('coach_members')
    .select('status')
    .eq('id', userId)
    .maybeSingle()

  const destination = resolvePostAuthDestination({
    isAdmin: Boolean(admin),
    memberStatus: member?.status ?? null,
  })

  // Signed in, but nothing here belongs to them: a Google account whose address
  // does not match the purchase, or a stranger who self-registered against the
  // Supabase project. Drop the session rather than leaving them authenticated
  // with nowhere to go, so their next attempt starts clean and the account
  // chooser actually offers them a choice.
  if (destination === '/login?error=nomatch') {
    await supabase.auth.signOut({ scope: 'local' })
    const response = redirectTo(destination)
    // signOut revokes the session server-side, which is what actually matters,
    // but it does not always emit a removal cookie. Clear the auth cookies here
    // too so the browser is not left holding a token that is already dead.
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith('sb-')) response.cookies.delete(cookie.name)
    }
    for (const { name } of pendingCookies) {
      if (name.startsWith('sb-')) response.cookies.delete(name)
    }
    return response
  }

  // Honour a deep link the proxy captured (?redirect=/app/thread), but only
  // once we know this person is entitled to a normal dashboard.
  if (destination === '/app/dashboard' && requestedRedirect) {
    return redirectTo(requestedRedirect)
  }

  return redirectTo(destination)
}
