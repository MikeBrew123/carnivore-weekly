import { describe, it, expect } from 'vitest'
import { brandFor, normaliseSite, isCoachSite, DEFAULT_SITE } from '@/lib/brand'
import { buildCallbackUrl, COACH_ORIGIN } from '@/lib/auth/links'

describe('brandFor', () => {
  it('gives a carnivore buyer the product they paid for', () => {
    const b = brandFor('carnivoreweekly')
    expect(b.product).toBe('Carnivore Coach')
    expect(b.discipline).toBe('carnivore accountability coaching')
  })

  it('never tells a carnivore buyer they bought low-carb coaching', () => {
    expect(brandFor('carnivoreweekly').discipline).not.toContain('low-carb')
  })

  it('keeps KetoDial members on KetoDial', () => {
    expect(brandFor('ketodial').product).toBe('KetoDial Coach')
  })

  it('falls back rather than throwing on an unknown or missing site', () => {
    for (const v of [null, undefined, '', 'nonsense', 42, {}]) {
      expect(brandFor(v).product).toBe(brandFor(DEFAULT_SITE).product)
    }
  })

  it('explains the ketodial.com address to carnivore buyers only', () => {
    expect(brandFor('carnivoreweekly').platformNote).toContain('ketodial.com')
    expect(brandFor('ketodial').platformNote).toBeNull()
  })
})

describe('normaliseSite', () => {
  it('accepts the cw/kd shorthand used in links', () => {
    expect(normaliseSite('cw')).toBe('carnivoreweekly')
    expect(normaliseSite('kd')).toBe('ketodial')
  })
  it('accepts stored values unchanged', () => {
    expect(normaliseSite('carnivoreweekly')).toBe('carnivoreweekly')
  })
  it('refuses anything else', () => {
    expect(normaliseSite('../evil')).toBe(DEFAULT_SITE)
    expect(isCoachSite('../evil')).toBe(false)
  })
})

describe('buildCallbackUrl with site', () => {
  it('carries the site so a failed link still brands correctly', () => {
    const url = new URL(buildCallbackUrl('tok', 'magiclink', COACH_ORIGIN, 'carnivoreweekly')!)
    expect(url.searchParams.get('site')).toBe('carnivoreweekly')
  })

  it('is byte-identical to the old URL when no site is given', () => {
    expect(buildCallbackUrl('tok', 'magiclink'))
      .toBe(`${COACH_ORIGIN}/auth/callback?token_hash=tok&type=magiclink`)
  })

  it('omits the param rather than emitting site=null', () => {
    expect(buildCallbackUrl('tok', 'magiclink', COACH_ORIGIN, null)).not.toContain('site=')
  })
})
