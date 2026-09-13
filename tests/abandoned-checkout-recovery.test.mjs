#!/usr/bin/env node
/**
 * tests/abandoned-checkout-recovery.test.mjs
 *
 * Run it:
 *     node tests/abandoned-checkout-recovery.test.mjs
 *
 * No network, no database, no Stripe, no Resend. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * Until now nothing on either site contacted a person who started a checkout and
 * did not pay. The signal was not even received: neither webhook subscribed to
 * `checkout.session.expired`, so the abandonment was never written down, and by
 * the time anyone went looking Stripe's own Sessions had aged out of reach. The
 * one recovery play that ever ran (2026-07-09) was a person sending four emails
 * by hand with a coupon that expired a week later.
 *
 * The danger in building this is not that it fails to send. It is that it sends
 * to the wrong person. A recovery email is a sales email aimed at someone who
 * has already declined once, so every guard below is about NOT sending:
 *
 *   A  the kill switch holds: the abandonment is recorded, nothing is sent
 *   B  a real abandoner gets exactly one email, with their own saved answers behind it
 *   C  someone who paid in a LATER session is never told they did not finish
 *   D  a duplicate expiry event sends exactly one email
 *   E  an unsubscribe, a bounce or a spam complaint outranks the sale
 *   F  a suppression list that will not answer is treated as suppressed
 *   G  one email per person, ever, however many checkouts they abandon
 *   H  KetoDial, coach and shop checkouts are not touched
 *   I  the copy claims no payment, no discount and no deadline, and can be left
 *   J  an undecidable database fails loudly and is retried, not swallowed
 *
 * THE HARD ONE IS C. Abandoning session A and paying in session B is an ordinary
 * sequence, and Stripe expires A afterwards, so the naive version emails a paying
 * customer to say they never finished.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const API = path.join(ROOT, 'api', 'calculator-api.js');
const worker = await import('file://' + API);
const handler = worker.default;
const {
  __test_buildRecoveryLink: buildRecoveryLink,
  __test_buildAbandonEmailBody: buildAbandonEmailBody,
  __test_ABANDON_EMAIL_SUBJECT: ABANDON_SUBJECT,
} = worker;

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

const BASE_ENV = {
  SUPABASE_URL: 'https://supabase.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
  STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
  RESEND_API_KEY: 're_fixture',
};
const ON = { ...BASE_ENV, CW_ABANDON_RECOVERY_ENABLED: 'true' };

const ASSESSMENT_ID = '11111111-2222-4333-8444-555555555555';
const OTHER_ASSESSMENT_ID = '99999999-8888-4777-8666-555555555555';
const ABANDONER = 'left-the-checkout@example.invalid';
const CHECKOUT_ID = 'cs_test_abandon_fixture';

/** An expired Checkout Session as Stripe sends it for a CW report that was never paid. */
const expiredEvent = (overrides = {}, id = 'evt_abandon_1') => ({
  id,
  type: 'checkout.session.expired',
  data: {
    object: {
      id: CHECKOUT_ID,
      client_reference_id: ASSESSMENT_ID,
      customer_email: ABANDONER,
      amount_total: 2900,
      currency: 'usd',
      payment_status: 'unpaid',
      status: 'expired',
      metadata: { assessment_session_id: ASSESSMENT_ID, email: ABANDONER },
      ...overrides,
    },
  },
});

function signedRequest(event, env) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
  return new Request('https://api.test/webhook/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': `t=${t},v1=${v1}` },
    body,
  });
}

/**
 * A Supabase honest about the two things this feature turns on: the event table
 * enforces its unique id (so the marker really does deduplicate), and PostgREST
 * answers 200 with an empty array when a filter matches nothing.
 */
function makeWorld({
  assessmentStatus = 'pending',
  assessmentMissing = false,
  newsletterStatus = null,        // 'unsubscribed' | 'bounced' | 'complained'
  dripUnsubscribed = false,
  dripBouncedAt = null,
  suppressionLookupFails = false,
  priorMarkerForEmail = false,    // this address already got a recovery email
  resendStatus = 200,
  eventLookupFails = false,
  seedEvents = [],
} = {}) {
  const world = {
    events: new Set(seedEvents),
    assessment: assessmentMissing ? null
      : { id: ASSESSMENT_ID, email: ABANDONER, payment_status: assessmentStatus },
    resendCalls: [],
    calls: [],
  };

  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    world.calls.push({ url: u, method });

    if (u.includes('api.resend.com')) {
      const fail = resendStatus !== 200;
      world.resendCalls.push({
        body: JSON.parse(opts.body || '{}'),
        idempotencyKey: (opts.headers || {})['Idempotency-Key'],
        ok: !fail,
      });
      return fail
        ? { ok: false, status: resendStatus, text: async () => 'rejected', json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ id: 'resend-msg-1' }) };
    }

    if (u.includes('/rest/v1/stripe_webhook_events')) {
      if (method === 'POST') {
        const row = JSON.parse(opts.body || '{}');
        if (world.events.has(row.stripe_event_id)) {
          return { ok: false, status: 409, text: async () => 'duplicate key' };
        }
        world.events.add(row.stripe_event_id);
        return { ok: true, status: 201, json: async () => ([row]), text: async () => '' };
      }
      if (eventLookupFails) return { ok: false, status: 503, json: async () => ({}), text: async () => 'down' };
      // The one-per-person lookup, keyed on event_type rather than a single id.
      if (u.includes('event_type=eq.cw_abandon_email_sent')) {
        return { ok: true, status: 200, json: async () => (priorMarkerForEmail ? [{ id: 'row' }] : []) };
      }
      const m = u.match(/stripe_event_id=eq\.([^&]+)/);
      const id = m ? decodeURIComponent(m[1]) : '';
      return { ok: true, status: 200, json: async () => (world.events.has(id) ? [{ id: 'row' }] : []) };
    }

    if (u.includes('/rest/v1/cw_assessment_sessions')) {
      // The by-email lookup that powers the one-per-person cap.
      if (u.includes('email=eq.')) {
        return { ok: true, status: 200, json: async () => ([{ id: ASSESSMENT_ID }, { id: OTHER_ASSESSMENT_ID }]) };
      }
      if (!u.includes(`id=eq.${encodeURIComponent(ASSESSMENT_ID)}`)) {
        world.unscopedAssessmentReads = (world.unscopedAssessmentReads || 0) + 1;
        return { ok: true, status: 200, json: async () => ([]) };
      }
      return { ok: true, status: 200, json: async () => (world.assessment ? [world.assessment] : []) };
    }

    if (u.includes('/rest/v1/newsletter_subscribers')) {
      if (suppressionLookupFails) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => (newsletterStatus ? [{ status: newsletterStatus }] : []) };
    }
    if (u.includes('/rest/v1/drip_subscribers')) {
      if (suppressionLookupFails) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ([{ unsubscribed: dripUnsubscribed, bounced_at: dripBouncedAt }]) };
    }

    return { ok: true, status: 200, json: async () => ([]), text: async () => '' };
  };

  return world;
}

const realFetch = globalThis.fetch;
async function post(event, env) {
  try { return await handler.fetch(signedRequest(event, env), env, { waitUntil() {} }); }
  catch (e) { return { status: 0, error: e, json: async () => ({}) }; }
}

// ---------------------------------------------------------------------------
// A  The kill switch
// ---------------------------------------------------------------------------
{
  const world = makeWorld();
  const res = await post(expiredEvent(), BASE_ENV);  // flag absent
  check('A', 'the webhook accepts an expired checkout', res.status === 200, `status ${res.status}`);
  check('A', 'nothing is sent while the flag is off', world.resendCalls.length === 0,
    `${world.resendCalls.length} sends`);
  check('A', 'the abandonment is recorded anyway', world.events.has('evt_abandon_1'),
    `events: ${[...world.events].join(',')}`);
  check('A', 'no send marker is written', ![...world.events].some(e => e.startsWith('cw-abandon-email:')));
}

// ---------------------------------------------------------------------------
// B  A real abandoner
// ---------------------------------------------------------------------------
{
  const world = makeWorld();
  const res = await post(expiredEvent(), ON);
  const sent = world.resendCalls[0];
  check('B', 'the webhook succeeds', res.status === 200, `status ${res.status}`);
  check('B', 'exactly one email is sent', world.resendCalls.length === 1, `${world.resendCalls.length} sends`);
  check('B', 'it goes to the abandoner', sent && sent.body.to[0] === ABANDONER, sent && sent.body.to[0]);
  check('B', 'the subject is the approved one', sent && sent.body.subject === ABANDON_SUBJECT);
  check('B', 'the link carries their own assessment', sent && sent.body.text.includes(ASSESSMENT_ID));
  check('B', 'the link restores without claiming a payment',
    sent && sent.body.text.includes('payment=resume') && !sent.body.text.includes('payment=success'));
  check('B', 'the send is idempotent at Resend',
    sent && sent.idempotencyKey === `cw-abandon/${CHECKOUT_ID}`, sent && sent.idempotencyKey);
  check('B', 'a durable marker is written', [...world.events].includes(`cw-abandon-email:${CHECKOUT_ID}`),
    [...world.events].join(','));
  check('B', 'replies reach a person', sent && sent.body.reply_to === 'sarah@carnivoreweekly.com');
}

// ---------------------------------------------------------------------------
// C  They paid in a later session
// ---------------------------------------------------------------------------
for (const status of ['completed', 'success']) {
  const world = makeWorld({ assessmentStatus: status });
  const res = await post(expiredEvent(), ON);
  check('C', `a ${status} assessment is never told it did not finish`,
    world.resendCalls.length === 0, `${world.resendCalls.length} sends`);
  check('C', `the webhook still succeeds for ${status}`, res.status === 200, `status ${res.status}`);
}
{
  const world = makeWorld({ assessmentMissing: true });
  await post(expiredEvent(), ON);
  check('C', 'no assessment row means no email', world.resendCalls.length === 0);
}

// ---------------------------------------------------------------------------
// D  A duplicate expiry event
// ---------------------------------------------------------------------------
{
  const world = makeWorld();
  await post(expiredEvent(), ON);
  await post(expiredEvent(), ON);           // Stripe redelivers the same event id
  check('D', 'a redelivered expiry sends exactly one email',
    world.resendCalls.length === 1, `${world.resendCalls.length} sends`);
}
{
  // A DIFFERENT Stripe event for the same checkout, which the event-id dedup misses.
  const world = makeWorld();
  await post(expiredEvent(), ON);
  await post(expiredEvent({}, 'evt_abandon_2'), ON);
  check('D', 'a second event for the same checkout sends nothing more',
    world.resendCalls.length === 1, `${world.resendCalls.length} sends`);
}

// ---------------------------------------------------------------------------
// E  Suppression outranks the sale
// ---------------------------------------------------------------------------
for (const [label, opts] of [
  ['an unsubscribed reader', { newsletterStatus: 'unsubscribed' }],
  ['a bounced address', { newsletterStatus: 'bounced' }],
  ['a spam complaint', { newsletterStatus: 'complained' }],
  ['a drip unsubscribe', { dripUnsubscribed: true }],
  ['a drip bounce', { dripBouncedAt: '2026-09-01T00:00:00Z' }],
]) {
  const world = makeWorld(opts);
  const res = await post(expiredEvent(), ON);
  check('E', `${label} is never emailed`, world.resendCalls.length === 0, `${world.resendCalls.length} sends`);
  check('E', `${label} does not fail the webhook`, res.status === 200, `status ${res.status}`);
}

// ---------------------------------------------------------------------------
// F  Fail closed
// ---------------------------------------------------------------------------
{
  const world = makeWorld({ suppressionLookupFails: true });
  const res = await post(expiredEvent(), ON);
  check('F', 'an unreadable suppression list sends nothing',
    world.resendCalls.length === 0, `${world.resendCalls.length} sends`);
  check('F', 'and does not wedge the webhook', res.status === 200, `status ${res.status}`);
}

// ---------------------------------------------------------------------------
// G  One per person, ever
// ---------------------------------------------------------------------------
{
  const world = makeWorld({ priorMarkerForEmail: true });
  await post(expiredEvent(), ON);
  check('G', 'a second abandoned checkout from the same person sends nothing',
    world.resendCalls.length === 0, `${world.resendCalls.length} sends`);
}

// ---------------------------------------------------------------------------
// H  Other brands and products
// ---------------------------------------------------------------------------
{
  const world = makeWorld();
  const res = await post(
    expiredEvent({ client_reference_id: null, metadata: {}, customer_email: 'kd-shopper@example.invalid' }),
    ON
  );
  check('H', 'a checkout with no assessment reference is left alone',
    world.resendCalls.length === 0, `${world.resendCalls.length} sends`);
  check('H', 'and is acknowledged', res.status === 200, `status ${res.status}`);
  check('H', 'and no assessment is read on a guess', !world.unscopedAssessmentReads);
}

// ---------------------------------------------------------------------------
// I  The copy
// ---------------------------------------------------------------------------
{
  const link = buildRecoveryLink(ASSESSMENT_ID);
  const unsub = 'https://api.test/api/v1/unsubscribe?email=x&site=cw';
  const { text, html } = buildAbandonEmailBody(link, unsub);
  const body = `${text}\n${html}`.toLowerCase();

  check('I', 'it never claims a payment happened', !/payment went through|you paid|your purchase/.test(body));
  check('I', 'it says nothing was charged', /nothing was charged/.test(body));
  check('I', 'it offers no discount', !/%\s*off|discount|coupon|promo code/.test(body));
  check('I', 'it sets no deadline', !/expires|last chance|only \d+ (hours|days)|act now|hurry/.test(body));
  check('I', 'it does not claim a report exists', !/your report is ready|download your report/.test(body));
  check('I', 'it can be left', /unsubscribe/.test(body));
  check('I', 'the unsubscribe is site-scoped to cw', html.includes('site=cw'));
  check('I', 'the link is the resume link, not a checkout', link.includes('payment=resume') && !link.includes('stripe'));
  check('I', 'the subject promises nothing', !/free|%|now|last/i.test(ABANDON_SUBJECT), ABANDON_SUBJECT);
  check('I', 'no em dashes in customer copy', !text.includes('—') && !html.includes('—'));
}

// ---------------------------------------------------------------------------
// J  An undecidable database
// ---------------------------------------------------------------------------
{
  const world = makeWorld({ eventLookupFails: true });
  const res = await post(expiredEvent(), ON);
  check('J', 'an unreadable marker table fails loudly so Stripe retries',
    res.status === 500, `status ${res.status}`);
  check('J', 'and sends nothing in the meantime', world.resendCalls.length === 0);
}
{
  // The retry Stripe then makes lands on the duplicate path, because the event row
  // was written before the failure. Without a retry there it would be swallowed.
  const world = makeWorld({ seedEvents: ['evt_abandon_1'] });
  const res = await post(expiredEvent(), ON);
  check('J', 'the duplicate path retries the recovery', world.resendCalls.length === 1,
    `${world.resendCalls.length} sends`);
  check('J', 'and acknowledges once it succeeds', res.status === 200, `status ${res.status}`);
}
{
  // A Resend rejection of THIS message is not worth days of Stripe retries.
  for (const status of [400, 422, 502]) {
    const world = makeWorld({ resendStatus: status });
    const res = await post(expiredEvent(), ON);
    check('J', `a Resend ${status} does not wedge the webhook`, res.status === 200, `status ${res.status}`);
    check('J', `a Resend ${status} writes no success marker`,
      ![...world.events].some(e => e.startsWith('cw-abandon-email:')));
  }
}

// ---------------------------------------------------------------------------
// Source-level guards
// ---------------------------------------------------------------------------
{
  const src = fs.readFileSync(API, 'utf8');
  check('K', 'the expired event is subscribed', src.includes("'checkout.session.expired'"));
  check('K', 'the send is behind a flag', src.includes("env.CW_ABANDON_RECOVERY_ENABLED !== 'true'"));
  check('K', 'payment_status is re-read before sending', src.includes("if (status === 'completed' || status === 'success') return { skipped: 'already-paid' }"));
  const app = fs.readFileSync(path.join(ROOT, 'calculator2-demo', 'src', 'App.tsx'), 'utf8');
  check('K', 'the front end restores a resume link', app.includes("payment === 'resume'"));
  check('K', 'and lands them on their results', app.includes('setCurrentStep(3)'));
  const store = fs.readFileSync(path.join(ROOT, 'calculator2-demo', 'src', 'hooks', 'usePaymentState.ts'), 'utf8');
  check('K', "'resume' is never treated as a completed payment",
    !store.includes("=== 'resume'"));
}

globalThis.fetch = realFetch;

console.log(`\nabandoned-checkout recovery: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  FAIL [${f.group}] ${f.label}${f.detail ? ` (${f.detail})` : ''}`);
  process.exit(1);
}
