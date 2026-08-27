import { describe, it, expect } from 'vitest'
import { buildCallbackUrl, signInUrlFrom, COACH_ORIGIN } from '@/lib/auth/links'

describe('buildCallbackUrl', () => {
  it('points the token hash at our own callback', () => {
    const url = buildCallbackUrl('abc123', 'magiclink')
    expect(url).toBe(`${COACH_ORIGIN}/auth/callback?token_hash=abc123&type=magiclink`)
  })

  it('escapes a token that contains URL-significant characters', () => {
    const url = new URL(buildCallbackUrl('a+b/c=d&e', 'magiclink')!)
    expect(url.searchParams.get('token_hash')).toBe('a+b/c=d&e')
  })

  it('returns null with no token, so a caller must handle the fallback', () => {
    expect(buildCallbackUrl(null, 'magiclink')).toBeNull()
    expect(buildCallbackUrl(undefined, 'magiclink')).toBeNull()
    expect(buildCallbackUrl('', 'magiclink')).toBeNull()
  })
})

describe('signInUrlFrom', () => {
  it('prefers the token-hash callback', () => {
    const url = signInUrlFrom(
      { hashed_token: 'abc123', action_link: 'https://project.supabase.co/auth/v1/verify?token=abc123' },
      'magiclink'
    )
    expect(url).toContain('/auth/callback?token_hash=abc123')
  })

  it('falls back to the Supabase action link rather than sending an email with no link', () => {
    const action = 'https://project.supabase.co/auth/v1/verify?token=abc123'
    expect(signInUrlFrom({ action_link: action }, 'magiclink')).toBe(action)
  })

  it('returns null when Supabase gave us nothing usable', () => {
    expect(signInUrlFrom(null, 'magiclink')).toBeNull()
    expect(signInUrlFrom({}, 'magiclink')).toBeNull()
  })
})
