import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'
import { sendCohortWelcome, sendSaleAlert } from '@/lib/email/send'
import { signInUrlFrom, COACH_ORIGIN } from '@/lib/auth/links'
import type { SupabaseClient } from '@supabase/supabase-js'

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

  // Idempotency, with room for a retry.
  //
  // The row is still written before processing so a replay cannot double-charge
  // anyone, but "we have seen this event" and "we finished this event" are now
  // different facts. Previously they were the same fact, so a single transient
  // failure — one Supabase blip mid-handler — permanently swallowed a purchase:
  // Stripe retried, the retry saw the row the failed attempt had written, and
  // returned success without ever creating the member.
  //
  // processed_at is read defensively. If the column has not been added yet
  // (schema/005_coach_stripe_events_processed_at.sql), it reads as undefined and
  // the behaviour falls back to exactly what it was before: any existing row
  // means skip.
  const { data: existing } = await supabase
    .from('coach_stripe_events')
    .select('*')
    .eq('id', event.id)
    .maybeSingle()

  if (existing && (existing as { processed_at?: string | null }).processed_at !== null) {
    return NextResponse.json({ received: true, skipped: true })
  }

  if (!existing) {
    await supabase
      .from('coach_stripe_events')
      .insert({
        id: event.id,
        type: event.type,
        payload: event.data.object as any,
      })
  }

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
        // Values MUST satisfy the coach_members check constraints:
        //   site  IN ('ketodial','carnivoreweekly')
        //   tier  IN ('weekly','daily')
        //   diet_type IN ('keto','carnivore','lowcarb')
        // The six-week cohort runs a weekly cadence, so tier is 'weekly'.
        const ONE_OFF_PROGRAMS: Record<string, { tier: string; site: string; dietType: string }> = {
          'carnivore-coach-6wk': { tier: 'weekly', site: 'carnivoreweekly', dietType: 'carnivore' },
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
        const dietType = oneOff ? oneOff.dietType : undefined
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

        // Create Supabase auth user if not exists.
        //
        // email_confirm: true is load-bearing, not a convenience. Supabase only
        // auto-links a Google identity into an existing user when that user's
        // email is already confirmed; an unconfirmed one gets a brand new user
        // id instead, which would orphan the purchase and break every RLS policy
        // that reads auth.uid() = coach_members.id. Leave it on.
        const { data: authUser } = await supabase.auth.admin.createUser({
          email: buyerEmail,
          email_confirm: true,
        })

        if (!authUser?.user) {
          // User may already exist — look them up.
          const existingUser = await findAuthUserByEmail(supabase, buyerEmail)
          if (!existingUser) {
            console.error('Failed to create or find user for', buyerEmail)
            break
          }
          await createMemberRow(supabase, existingUser.id, session, tier, founding, site, buyerEmail, dietType)
        } else {
          await createMemberRow(supabase, authUser.user.id, session, tier, founding, site, buyerEmail, dietType)
        }

        // One-off cohort buyers get a welcome with a working sign-in link, and
        // Brew gets told a sale landed. Both are best-effort: an email failure
        // must never make the webhook non-2xx, or Stripe retries and we create
        // the member twice.
        if (oneOff) {
          // The owner alert goes FIRST and in its own try. It used to sit after
          // generateLink inside the same try, so the one mechanism that tells
          // Brew a sale landed and something broke was the mechanism that got
          // skipped when something broke.
          try {
            const { count } = await supabase
              .from('coach_members')
              .select('id', { count: 'exact', head: true })
              .eq('tier', oneOff.tier)
              .eq('site', oneOff.site)

            await sendSaleAlert(
              buyerEmail,
              `$${((session.amount_total ?? 0) / 100).toFixed(2)} ${(session.currency ?? 'usd').toUpperCase()}`,
              programKey ?? 'coach',
              count ?? null,
            )
          } catch (alertErr) {
            console.error('Sale alert failed (member still created):', alertErr)
          }

          try {
            // magiclink, not recovery. Recovery means "reset your password", and
            // this product no longer has passwords to reset.
            const { data: link } = await supabase.auth.admin.generateLink({
              type: 'magiclink',
              email: buyerEmail,
              options: { redirectTo: `${COACH_ORIGIN}/auth/callback` },
            })
            // Our own callback with the token hash, so the session lands in
            // server-set HttpOnly cookies rather than a URL fragment. Falls back
            // to Supabase's action_link. See lib/auth/links.ts.
            const loginUrl = signInUrlFrom(link?.properties, 'magiclink')
            if (loginUrl) {
              await sendCohortWelcome(buyerEmail, loginUrl, {
                startDate: '15 September',
                discountCode: 'COACH50',
              })
            } else {
              console.error('No sign-in link generated for', buyerEmail)
            }
          } catch (mailErr) {
            console.error('Welcome email failed (member still created):', mailErr)
          }
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
    // Return 500 so Stripe retries the event. The ledger row stays unprocessed,
    // so the retry is allowed to finish the job instead of short-circuiting.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  // Finished. Only now is the event closed to retries. A missing processed_at
  // column just logs; the old behaviour still applies in that case.
  const { error: markError } = await supabase
    .from('coach_stripe_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('id', event.id)
  if (markError) console.error('Could not mark stripe event processed:', markError)

  return NextResponse.json({ received: true })
}

// supabase.auth.admin.listUsers() paginates and defaults to 50 per page. The
// previous code called it with no arguments and searched only that first page,
// so once the project passes 50 auth users a repeat buyer or a retried webhook
// would silently fail to find the existing account, log "Failed to create or
// find user" and create no member row. Ten existing users plus a 40-seat cohort
// crosses that line during this launch.
async function findAuthUserByEmail(supabase: SupabaseClient, email: string) {
  const target = email.toLowerCase()
  const perPage = 1000
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) {
      console.error('listUsers failed while looking up', email, error)
      return null
    }
    const users = data?.users ?? []
    const match = users.find(u => u.email?.toLowerCase() === target)
    if (match) return match
    if (users.length < perPage) return null
  }
  console.error('listUsers exhausted 50 pages without finding', email)
  return null
}

async function createMemberRow(
  supabase: any,
  userId: string,
  session: Stripe.Checkout.Session,
  tier: string,
  founding: boolean,
  site: string = 'ketodial',
  buyerEmail?: string,
  dietType?: string
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
      ...(dietType ? { diet_type: dietType } : {}),
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
