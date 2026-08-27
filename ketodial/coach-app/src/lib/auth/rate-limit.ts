// Rate limiting for the emailed sign-in link.
//
// Without a limit, POST /api/auth/link is a free mail-sending gadget aimed at
// the same Resend domain that mails the newsletter, and a way to probe the
// launch list one address at a time. Every attempt is recorded, including
// attempts for addresses that have no account, because the recording is what
// makes probing expensive.
//
// Backed by coach_signin_requests (schema/004_coach_signin_requests.sql).

import type { SupabaseClient } from '@supabase/supabase-js'

export const EMAIL_WINDOW_MS = 15 * 60 * 1000
export const EMAIL_LIMIT = 3
export const IP_WINDOW_MS = 60 * 60 * 1000
export const IP_LIMIT = 20

export type RateLimitDecision = {
  allowed: boolean
  reason: 'ok' | 'email' | 'ip' | 'unavailable'
}

// Pure, so the arithmetic is testable without a database.
export function withinWindow(timestamps: string[], windowMs: number, now: number): number {
  const cutoff = now - windowMs
  return timestamps.filter(t => {
    const ms = Date.parse(t)
    return Number.isFinite(ms) && ms >= cutoff
  }).length
}

export function decide(
  emailTimestamps: string[],
  ipTimestamps: string[],
  now: number = Date.now()
): RateLimitDecision {
  if (withinWindow(emailTimestamps, EMAIL_WINDOW_MS, now) >= EMAIL_LIMIT) {
    return { allowed: false, reason: 'email' }
  }
  if (ipTimestamps.length && withinWindow(ipTimestamps, IP_WINDOW_MS, now) >= IP_LIMIT) {
    return { allowed: false, reason: 'ip' }
  }
  return { allowed: true, reason: 'ok' }
}

// Vercel puts the real client address first in x-forwarded-for. A missing or
// unparseable value means no IP limit for that request; the per-address limit
// still applies.
export function clientIpFrom(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 64)
  }
  const real = headers.get('x-real-ip')
  return real ? real.trim().slice(0, 64) : null
}

export async function checkSignInRateLimit(
  supabase: SupabaseClient,
  email: string,
  ip: string | null,
  now: number = Date.now()
): Promise<RateLimitDecision> {
  const emailCutoff = new Date(now - EMAIL_WINDOW_MS).toISOString()
  const ipCutoff = new Date(now - IP_WINDOW_MS).toISOString()

  const emailQuery = await supabase
    .from('coach_signin_requests')
    .select('created_at')
    .eq('email', email)
    .gte('created_at', emailCutoff)

  if (emailQuery.error) {
    // Fail closed. An unlimited mailer is a worse failure than a sign-in outage,
    // and this line is the one to grep for if links stop arriving: it almost
    // certainly means schema/004_coach_signin_requests.sql was never applied.
    console.error('sign-in rate limit unavailable (is coach_signin_requests missing?):', emailQuery.error)
    return { allowed: false, reason: 'unavailable' }
  }

  let ipTimestamps: string[] = []
  if (ip) {
    const ipQuery = await supabase
      .from('coach_signin_requests')
      .select('created_at')
      .eq('ip', ip)
      .gte('created_at', ipCutoff)
    if (ipQuery.error) {
      console.error('sign-in rate limit unavailable (ip lookup):', ipQuery.error)
      return { allowed: false, reason: 'unavailable' }
    }
    ipTimestamps = (ipQuery.data ?? []).map((r: { created_at: string }) => r.created_at)
  }

  const emailTimestamps = (emailQuery.data ?? []).map((r: { created_at: string }) => r.created_at)
  return decide(emailTimestamps, ipTimestamps, now)
}

export async function recordSignInRequest(
  supabase: SupabaseClient,
  email: string,
  ip: string | null
): Promise<void> {
  const { error } = await supabase
    .from('coach_signin_requests')
    .insert({ email, ip })
  if (error) console.error('Failed to record sign-in request:', error)
}
