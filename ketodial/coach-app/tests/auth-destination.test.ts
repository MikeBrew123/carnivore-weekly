import { describe, it, expect } from 'vitest'
import { resolvePostAuthDestination, safeRelativePath } from '@/lib/auth/destination'

describe('resolvePostAuthDestination', () => {
  it('sends an admin to the admin queue, whatever their member status', () => {
    expect(resolvePostAuthDestination({ isAdmin: true, memberStatus: null })).toBe('/admin')
    expect(resolvePostAuthDestination({ isAdmin: true, memberStatus: 'onboarding' })).toBe('/admin')
    expect(resolvePostAuthDestination({ isAdmin: true, memberStatus: 'active' })).toBe('/admin')
  })

  it('bounces an authenticated non-member to the nomatch message', () => {
    expect(resolvePostAuthDestination({ isAdmin: false, memberStatus: null })).toBe('/login?error=nomatch')
  })

  it('sends a fresh buyer to onboarding', () => {
    expect(resolvePostAuthDestination({ isAdmin: false, memberStatus: 'onboarding' })).toBe('/app/onboarding')
  })

  it('sends every other member to the dashboard', () => {
    for (const status of ['active', 'paused', 'cancelled', 'offboarded', 'refunded', 'test']) {
      expect(resolvePostAuthDestination({ isAdmin: false, memberStatus: status })).toBe('/app/dashboard')
    }
  })

  // The bug this replaces: login/page.tsx:54 redirected an 'onboarding' member
  // before the recovery branch on the next line could send them to settings, so
  // the only escape hatch a locked-out buyer had was unreachable. There is now
  // no recovery branch to be shadowed, and onboarding is decided in one place.
  it('does not depend on a recovery flag at all', () => {
    expect(resolvePostAuthDestination({ isAdmin: false, memberStatus: 'onboarding' })).toBe('/app/onboarding')
    expect(resolvePostAuthDestination({ isAdmin: false, memberStatus: 'active' })).toBe('/app/dashboard')
  })
})

describe('safeRelativePath', () => {
  it('accepts ordinary in-app paths', () => {
    expect(safeRelativePath('/app/thread')).toBe('/app/thread')
    expect(safeRelativePath('/admin')).toBe('/admin')
  })

  it('refuses anything that could leave this origin', () => {
    expect(safeRelativePath('//evil.example.com')).toBeNull()
    expect(safeRelativePath('https://evil.example.com')).toBeNull()
    expect(safeRelativePath('/\\evil.example.com')).toBeNull()
    expect(safeRelativePath('app/dashboard')).toBeNull()
    expect(safeRelativePath(null)).toBeNull()
    expect(safeRelativePath('')).toBeNull()
  })
})
