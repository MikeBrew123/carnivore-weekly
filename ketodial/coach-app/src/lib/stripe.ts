import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_placeholder', {
  apiVersion: '2026-05-27.dahlia',
})

// Product/price IDs — set after creating in Stripe
export const PRICES = {
  weekly: process.env.STRIPE_PRICE_WEEKLY!,
  // daily: process.env.STRIPE_PRICE_DAILY!, // Phase 2
} as const

export const FOUNDING_CAP = 50
