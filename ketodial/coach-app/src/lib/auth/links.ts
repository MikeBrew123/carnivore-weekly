// Building the URL that actually goes in a sign-in email.
//
// supabase.auth.admin.generateLink() hands back two usable things:
//
//   properties.action_link   -> {SUPABASE_URL}/auth/v1/verify?token=...&redirect_to=...
//   properties.hashed_token  -> the same one-time token, unwrapped
//
// action_link works, but it lands the session in the URL *fragment* on the way
// back, which never reaches the server, so the session can only be picked up by
// client-side JavaScript. That is the path login/page.tsx has been patching
// around. Feeding hashed_token to our own /auth/callback instead lets the server
// call verifyOtp and write the session into real HttpOnly, Secure, Max-Age
// cookies. That is the difference between "signed in until you close the tab"
// and "still signed in tomorrow morning", which is the entire point of this work.
//
// action_link stays as the fallback for the case where hashed_token is missing,
// so a Supabase change cannot silently produce an email with no link in it.

export const COACH_ORIGIN = 'https://coach.ketodial.com'

export type EmailOtpLinkType = 'magiclink' | 'recovery' | 'invite' | 'signup'

export function buildCallbackUrl(
  hashedToken: string | null | undefined,
  type: EmailOtpLinkType,
  origin: string = COACH_ORIGIN
): string | null {
  if (!hashedToken) return null
  const url = new URL('/auth/callback', origin)
  url.searchParams.set('token_hash', hashedToken)
  url.searchParams.set('type', type)
  return url.toString()
}

// Prefer our own callback; fall back to whatever Supabase generated.
export function signInUrlFrom(
  properties: { hashed_token?: string | null; action_link?: string | null } | null | undefined,
  type: EmailOtpLinkType,
  origin: string = COACH_ORIGIN
): string | null {
  return buildCallbackUrl(properties?.hashed_token, type, origin) ?? properties?.action_link ?? null
}
