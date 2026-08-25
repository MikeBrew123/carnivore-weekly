import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Idempotency: skip already-processed events
  const { data: existing } = await supabase
    .from('coach_stripe_events')
    .select('id')
    .eq('id', event.id)
    .single()

  if (existing) {
    return NextResponse.json({ received: true, skipped: true })
  }

  // Record event before processing (prevents replay on retry)
  await supabase
    .from('coach_stripe_events')
    .insert({
      id: event.id,
      type: event.type,
      payload: event.data.object as any,
    })

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Product filter: this Stripe account also receives CW calculator and KD
        // report checkouts (payment mode, no tier). Two shapes count as a coach
        // signup:
        //   1. mode=subscription with metadata.tier, from /api/stripe/checkout
        //   2. mode=payment with metadata.program, from a one-off Stripe Payment
        //      Link (the 2026-09-15 Carnivore six-week cohort is sold this way:
        //      $49 once, not a subscription, so mode is payment and there is no
        //      tier on the session).
        const ONE_OFF_PROGRAMS: Record<string, { tier: string; site: string }> = {
          'carnivore-coach-6wk': { tier: 'carnivore-6wk', site: 'cw' },
        }
        // Payment Link metadata is not reliably copied onto the Checkout Session,
        // so match on the link id too. session.payment_link is always set when a
        // session originates from a Payment Link.
        const ONE_OFF_LINKS: Record<string, string> = {
          plink_1U8QKBEVDfkpGz8wAfPsfaMF: 'carnivore-coach-6wk',
        }
        const programKey =
          session.metadata?.program ??
          (typeof session.payment_link === 'string'
            ? ONE_OFF_LINKS[session.payment_link]
            : undefined)
        const oneOff = session.mode === 'payment' && programKey
          ? ONE_OFF_PROGRAMS[programKey]
          : undefined

        if (!oneOff && (session.mode !== 'subscription' || !session.metadata?.tier)) {
          console.log('Skipping non-coach checkout.session.completed:', session.id)
          break
        }

        const tier = oneOff ? oneOff.tier : session.metadata!.tier!
        const site = oneOff ? oneOff.site : 'ketodial'
        // One-off cohort buyers are founding members by definition.
        const founding = oneOff ? true : session.metadata?.founding_member === 'true'

        // /api/stripe/checkout pre-fills customer_email, so subscription
        // sessions carry it. A Payment Link does not: the buyer types their
        // address at checkout and it lands in customer_details.email, leaving
        // customer_email null. Read both or one-off buyers get no account.
        const buyerEmail = session.customer_details?.email ?? session.customer_email
        if (!buyerEmail) {
          console.error('No email on checkout session, cannot create member:', session.id)
          break
        }

        // Create Supabase auth user if not exists
        const { data: authUser } = await supabase.auth.admin.createUser({
          email: buyerEmail,
          email_confirm: true,
        })

        if (!authUser?.user) {
          // User may already exist — look them up
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const existing = users?.find(u => u.email === buyerEmail)
          if (!existing) {
            console.error('Failed to create or find user for', buyerEmail)
            break
          }
          await createMemberRow(supabase, existing.id, session, tier, founding, site, buyerEmail)
        } else {
          await createMemberRow(supabase, authUser.user.id, session, tier, founding, site, buyerEmail)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const sub = subscription as any
        await supabase
          .from('coach_members')
          .update({
            subscription_status: subscription.status,
            current_period_start: sub.current_period_start
              ? new Date(sub.current_period_start * 1000).toISOString()
              : null,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
            cancel_at_period_end: subscription.cancel_at_period_end,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await supabase
          .from('coach_members')
          .update({
            subscription_status: 'cancelled',
            status: 'cancelled',
            offboarded_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id)
        break
      }
    }
  } catch (err) {
    console.error(`Webhook processing error for ${event.type}:`, err)
    // Return 500 so Stripe retries the event
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function createMemberRow(
  supabase: any,
  userId: string,
  session: Stripe.Checkout.Session,
  tier: string,
  founding: boolean,
  site: string = 'ketodial',
  buyerEmail?: string
) {
  // Check if member already exists (idempotency for checkout retries)
  const { data: existingMember } = await supabase
    .from('coach_members')
    .select('id')
    .eq('id', userId)
    .single()

  if (existingMember) {
    // Update Stripe IDs if missing (handles edge case: user existed but Stripe wasn't linked)
    await supabase
      .from('coach_members')
      .update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    return
  }

  const { error: memberError } = await supabase
    .from('coach_members')
    .insert({
      id: userId,
      display_name: (buyerEmail ?? session.customer_email!).split('@')[0],
      email: buyerEmail ?? session.customer_email!,
      tier,
      site,
      founding_member: founding,
      stripe_customer_id: session.customer as string,
      // null for one-off cohort purchases; only subscription checkouts set this
      stripe_subscription_id: (session.subscription as string) ?? null,
      status: 'onboarding',
    })

  if (memberError) {
    console.error('Failed to create member:', memberError)
    return
  }

  // Insert signup bonus credit
  await supabase
    .from('coach_credit_ledger')
    .insert({
      member_id: userId,
      credit_type: 'bonus_checkin',
      amount: 1,
      reason: 'signup_bonus',
    })
}
