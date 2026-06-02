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
        const tier = session.metadata?.tier || 'weekly'
        const founding = session.metadata?.founding_member === 'true'

        // Create Supabase auth user if not exists
        const { data: authUser } = await supabase.auth.admin.createUser({
          email: session.customer_email!,
          email_confirm: true,
        })

        if (!authUser?.user) {
          // User may already exist — look them up
          const { data: { users } } = await supabase.auth.admin.listUsers()
          const existing = users?.find(u => u.email === session.customer_email)
          if (!existing) {
            console.error('Failed to create or find user for', session.customer_email)
            break
          }
          await createMemberRow(supabase, existing.id, session, tier, founding)
        } else {
          await createMemberRow(supabase, authUser.user.id, session, tier, founding)
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
  founding: boolean
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
      display_name: session.customer_email!.split('@')[0],
      email: session.customer_email!,
      tier,
      founding_member: founding,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
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
