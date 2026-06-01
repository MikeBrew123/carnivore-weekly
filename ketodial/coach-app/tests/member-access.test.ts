import { describe, it, expect } from 'vitest'
import { canMemberAccessCoaching } from '@/lib/member-access'

describe('Member access eligibility', () => {
  it('grants access to active onboarded member', () => {
    expect(canMemberAccessCoaching({
      status: 'active',
      subscription_status: 'active',
      onboarded_at: '2026-01-01',
      current_period_end: null,
    })).toBe(true)
  })

  it('grants access during trial', () => {
    expect(canMemberAccessCoaching({
      status: 'active',
      subscription_status: 'trialing',
      onboarded_at: '2026-01-01',
      current_period_end: null,
    })).toBe(true)
  })

  it('grants access during grace period (past_due)', () => {
    expect(canMemberAccessCoaching({
      status: 'active',
      subscription_status: 'past_due',
      onboarded_at: '2026-01-01',
      current_period_end: null,
    })).toBe(true)
  })

  it('grants access to cancelled within paid period', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    expect(canMemberAccessCoaching({
      status: 'active',
      subscription_status: 'cancelled',
      onboarded_at: '2026-01-01',
      current_period_end: future,
    })).toBe(true)
  })

  it('denies access to cancelled past paid period', () => {
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(canMemberAccessCoaching({
      status: 'active',
      subscription_status: 'cancelled',
      onboarded_at: '2026-01-01',
      current_period_end: past,
    })).toBe(false)
  })

  it('denies access to non-onboarded member', () => {
    expect(canMemberAccessCoaching({
      status: 'active',
      subscription_status: 'active',
      onboarded_at: null,
      current_period_end: null,
    })).toBe(false)
  })

  it('denies access to suspended member', () => {
    expect(canMemberAccessCoaching({
      status: 'suspended',
      subscription_status: 'active',
      onboarded_at: '2026-01-01',
      current_period_end: null,
    })).toBe(false)
  })

  it('grants access to test members regardless of subscription', () => {
    expect(canMemberAccessCoaching({
      status: 'test',
      subscription_status: null,
      onboarded_at: '2026-01-01',
      current_period_end: null,
    })).toBe(true)
  })
})
