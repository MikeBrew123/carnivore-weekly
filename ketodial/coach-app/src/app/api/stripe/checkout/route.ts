import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICES, FOUNDING_CAP } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { tier, email } = await request.json()

    if (!tier || !email) {
      return NextResponse.json({ error: 'Missing tier or email' }, { status: 400 })
    }

    // Validate email format
    if (typeof email !== 'string' || !email.includes('@') || email.length > 320) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const priceId = PRICES[tier as keyof typeof PRICES]
    if (!priceId) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    // Check founding cap atomically (advisory lock prevents race condition)
    const supabase = await createServiceClient()
    const { data: hasRoom, error: capError } = await supabase.rpc('check_founding_cap', { p_cap: FOUNDING_CAP })

    if (capError || !hasRoom) {
      return NextResponse.json(
        { error: 'Founding cohort is full' },
        { status: 409 }
      )
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      customer_email: email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${request.nextUrl.origin}/app/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/?cancelled=true`,
      metadata: {
        tier,
        founding_member: 'true',
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('Checkout error:', err)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
