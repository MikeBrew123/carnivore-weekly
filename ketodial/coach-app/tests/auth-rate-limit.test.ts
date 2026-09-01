import { describe, it, expect } from 'vitest'
import {
  decide,
  withinWindow,
  clientIpFrom,
  EMAIL_LIMIT,
  IP_LIMIT,
  EMAIL_WINDOW_MS,
  IP_WINDOW_MS,
} from '@/lib/auth/rate-limit'

const NOW = Date.parse('2026-08-27T12:00:00.000Z')
const ago = (ms: number) => new Date(NOW - ms).toISOString()

describe('withinWindow', () => {
  it('counts only timestamps inside the window', () => {
    const stamps = [ago(1000), ago(EMAIL_WINDOW_MS - 1), ago(EMAIL_WINDOW_MS + 60_000)]
    expect(withinWindow(stamps, EMAIL_WINDOW_MS, NOW)).toBe(2)
  })

  it('ignores unparseable timestamps rather than counting them', () => {
    expect(withinWindow(['not a date', ago(1000)], EMAIL_WINDOW_MS, NOW)).toBe(1)
  })
})

describe('decide', () => {
  it('allows a first request', () => {
    expect(decide([], [], NOW)).toEqual({ allowed: true, reason: 'ok' })
  })

  it('allows right up to the per-address limit', () => {
    const stamps = Array.from({ length: EMAIL_LIMIT - 1 }, () => ago(60_000))
    expect(decide(stamps, [], NOW).allowed).toBe(true)
  })

  it('refuses at the per-address limit', () => {
    const stamps = Array.from({ length: EMAIL_LIMIT }, () => ago(60_000))
    expect(decide(stamps, [], NOW)).toEqual({ allowed: false, reason: 'email' })
  })

  it('lets an address back in once its window has rolled off', () => {
    const stamps = Array.from({ length: EMAIL_LIMIT }, () => ago(EMAIL_WINDOW_MS + 1000))
    expect(decide(stamps, [], NOW).allowed).toBe(true)
  })

  it('refuses at the per-IP limit even when the address is fresh', () => {
    const ipStamps = Array.from({ length: IP_LIMIT }, () => ago(60_000))
    expect(decide([], ipStamps, NOW)).toEqual({ allowed: false, reason: 'ip' })
  })

  it('does not apply an IP limit when there is no IP to count', () => {
    expect(decide([], [], NOW).allowed).toBe(true)
  })

  it('ages IP attempts out of the hour window', () => {
    const ipStamps = Array.from({ length: IP_LIMIT }, () => ago(IP_WINDOW_MS + 1000))
    expect(decide([], ipStamps, NOW).allowed).toBe(true)
  })
})

describe('clientIpFrom', () => {
  it('takes the first address in x-forwarded-for', () => {
    const h = new Headers({ 'x-forwarded-for': '203.0.113.7, 70.41.3.18, 150.172.238.178' })
    expect(clientIpFrom(h)).toBe('203.0.113.7')
  })

  it('falls back to x-real-ip', () => {
    expect(clientIpFrom(new Headers({ 'x-real-ip': '203.0.113.9' }))).toBe('203.0.113.9')
  })

  it('returns null when there is nothing to read', () => {
    expect(clientIpFrom(new Headers())).toBeNull()
  })

  it('does not let a header stuff an unbounded string into the database', () => {
    const h = new Headers({ 'x-forwarded-for': 'a'.repeat(500) })
    expect(clientIpFrom(h)!.length).toBe(64)
  })
})
