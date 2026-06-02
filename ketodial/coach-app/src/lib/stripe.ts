import Stripe from 'stripe'

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}

// Legacy export for existing imports — lazy getter
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop]
  },
})

// Product/price IDs — set after creating in Stripe
export const PRICES = {
  weekly: process.env.STRIPE_PRICE_WEEKLY!,
  // daily: process.env.STRIPE_PRICE_DAILY!, // Phase 2
} as const

export const FOUNDING_CAP = 50
