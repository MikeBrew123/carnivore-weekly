import { describe, it, expect } from 'vitest'
import { getCurrentCheckInState } from '@/lib/checkin-state'

const activeMember = { tier: 'weekly', status: 'active', bonus_credit_balance: 1, timezone: 'America/New_York' }
const inactiveMember = { tier: 'weekly', status: 'cancelled', bonus_credit_balance: 0, timezone: 'America/New_York' }

describe('Check-in state computation', () => {
  it('returns not_open for inactive member', () => {
    const state = getCurrentCheckInState(inactiveMember, null)
    expect(state.status).toBe('not_open')
    expect(state.can_submit).toBe(false)
  })

  it('returns due on Sunday with no check-in', () => {
    const sunday = new Date('2026-06-07T10:00:00') // a Sunday
    const state = getCurrentCheckInState(activeMember, null, sunday)
    expect(state.status).toBe('due')
    expect(state.can_submit).toBe(true)
  })

  it('returns overdue on Monday with no check-in', () => {
    const monday = new Date('2026-06-08T10:00:00') // Monday
    const state = getCurrentCheckInState(activeMember, null, monday)
    expect(state.status).toBe('overdue')
    expect(state.can_submit).toBe(true)
  })

  it('returns submitted when check-in exists for current period', () => {
    const monday = new Date('2026-06-08T10:00:00')
    const checkin = {
      submitted_at: '2026-06-07T18:00:00Z',
      period_start: '2026-06-07', // Sunday
      period_end: '2026-06-13',
    }
    const state = getCurrentCheckInState(activeMember, checkin, monday)
    expect(state.status).toBe('submitted')
    expect(state.can_submit).toBe(false)
  })

  it('includes bonus credits in state', () => {
    const state = getCurrentCheckInState(activeMember, null)
    expect(state.bonus_credits_available).toBe(1)
  })

  it('returns 0 bonus credits for member with none', () => {
    const noCreditMember = { ...activeMember, bonus_credit_balance: 0 }
    const state = getCurrentCheckInState(noCreditMember, null)
    expect(state.bonus_credits_available).toBe(0)
  })
})
