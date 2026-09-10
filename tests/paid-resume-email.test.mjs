#!/usr/bin/env node
/**
 * tests/paid-resume-email.test.mjs
 *
 * Run it:
 *     node tests/paid-resume-email.test.mjs
 *
 * No network, no database, no Stripe, no Resend. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * The report is generated AFTER Step 4, because it is written from the health
 * profile and the questionnaire asks for that after payment. That order is correct
 * and this suite is written to keep it: a webhook that generated a report would be
 * writing one from half the questionnaire.
 *
 * What was missing is the way BACK. The browser remembers a payment for six hours and
 * then deliberately clears it, nothing was sent from the server, and the screen after
 * payment said the protocol was generating and to check your email for a download
 * link. Neither was true. A buyer who closed the tab owned an assessment they could
 * not reach. One of eight real purchases went seven days between payment and report.
 *
 * WHAT THIS SUITE PINS
 * --------------------
 *   A  payment records the purchase and sends the link, and generates NOTHING
 *   B  the email carries the right buyer, the right assessment and a working link
 *   C  a duplicate Stripe event sends exactly one email
 *   D  a Resend failure is retried, and is NOT swallowed by the event dedup
 *   F  the same assessment still reaches the canonical report path afterwards
 *   G  no customer-facing copy claims delivery that does not happen
 *
 * THE HARD ONE IS D. Idempotency and retry safety pull against each other, and the
 * obvious implementation (key the email off the Stripe event row) satisfies the first
 * and quietly loses the customer on the second.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const API = path.join(ROOT, 'api', 'calculator-api.js');
const worker = await import('file://' + API);
const handler = worker.default;
const {
  __test_buildResumeLink: buildResumeLink,
  __test_buildResumeEmailBody: buildResumeEmailBody,
  __test_RESUME_EMAIL_SUBJECT: RESUME_SUBJECT,
} = worker;

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

const ENV = {
  SUPABASE_URL: 'https://supabase.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
  STRIPE_WEBHOOK_SECRET: 'whsec_fixture',
  STRIPE_SECRET_KEY: 'sk_test_fixture',
  RESEND_API_KEY: 're_fixture',
  ANTHROPIC_API_KEY: 'sk-fixture',
};

const ASSESSMENT_ID = '11111111-2222-4333-8444-555555555555';
const BUYER_EMAIL = 'paid-buyer@example.invalid';
const CHECKOUT_ID = 'cs_test_resume_fixture';

/** A completed Checkout Session as Stripe sends it for a CW report purchase. */
const checkoutEvent = (overrides = {}, id = 'evt_resume_1') => ({
  id,
  type: 'checkout.session.completed',
  data: {
    object: {
      id: CHECKOUT_ID,
      client_reference_id: ASSESSMENT_ID,
      customer_email: BUYER_EMAIL,
      amount_total: 2900,
      currency: 'usd',
      payment_status: 'paid',
      payment_intent: 'pi_test_fixture',
      metadata: { assessment_session_id: ASSESSMENT_ID, email: BUYER_EMAIL, first_name: 'Paid' },
      ...overrides,
    },
  },
});

/** Sign the body the way Stripe does, so the real verification runs. */
function signedRequest(event) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', ENV.STRIPE_WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
  return new Request('https://api.test/webhook/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': `t=${t},v1=${v1}` },
    body,
  });
}

/**
 * A Supabase good enough to be honest about: the event table really does enforce its
 * unique id, so dedup and the delivery marker behave as they do in production.
 */
function makeWorld({
  resendStatus = 200, resendFailFirst = false, resendFailStatus = 502,
  assessmentPatchFail = 0,        // how many assessment PATCHes fail before one works
  assessmentMissing = false,      // the row is not there at all
  assessmentStatus = 'pending',   // the row's starting state
  assessmentReadFail = false,     // the read-back after a zero-row PATCH fails
} = {}) {
  const world = {
    events: new Set(),            // stripe_event_id values, including the marker
    assessment: assessmentMissing
      ? null
      : { id: ASSESSMENT_ID, email: BUYER_EMAIL, payment_status: assessmentStatus },
    assessmentPatchAttempts: 0,
    resendCalls: [],
    calls: [],
    reportCalls: 0,
    anthropicCalls: 0,
    reportRowInserts: 0,
  };
  let resendAttempt = 0;

  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    world.calls.push({ url: u, method });

    if (u.includes('api.anthropic.com')) { world.anthropicCalls++; return { ok: true, status: 200, json: async () => ({ content: [{ text: 'x' }] }) }; }

    if (u.includes('api.resend.com')) {
      resendAttempt++;
      const fail = resendStatus !== 200 || (resendFailFirst && resendAttempt === 1);
      world.resendCalls.push({
        body: JSON.parse(opts.body || '{}'),
        idempotencyKey: (opts.headers || {})['Idempotency-Key'],
        ok: !fail,
      });
      return fail
        ? { ok: false, status: resendFailStatus, text: async () => 'rejected', json: async () => ({}) }
        : { ok: true, status: 200, json: async () => ({ id: 'resend-msg-1' }) };
    }

    if (u.includes('/rest/v1/stripe_webhook_events')) {
      if (method === 'POST') {
        const row = JSON.parse(opts.body || '{}');
        if (world.events.has(row.stripe_event_id)) return { ok: false, status: 409, text: async () => 'duplicate key' };
        world.events.add(row.stripe_event_id);
        return { ok: true, status: 201, json: async () => ([row]), text: async () => '' };
      }
      const m = u.match(/stripe_event_id=eq\.([^&]+)/);
      const id = m ? decodeURIComponent(m[1]) : '';
      return { ok: true, status: 200, json: async () => (world.events.has(id) ? [{ id: 'row' }] : []) };
    }

    if (u.includes('/rest/v1/cw_assessment_sessions')) {
      if (method === 'PATCH') {
        world.assessmentPatchAttempts++;
        // A transient database or network failure, the kind that used to be logged
        // and stepped over.
        if (world.assessmentPatchAttempts <= assessmentPatchFail) {
          return { ok: false, status: 503, text: async () => 'service unavailable', json: async () => ({}) };
        }
        // PostgREST applies the filter and answers 200 with an EMPTY array when it
        // matches nothing. Reproducing that is the point of this stub: "the request
        // succeeded" and "the customer is paid" are different facts.
        const wantsPending = u.includes('payment_status=eq.pending');
        // A PATCH with no row filter, or the wrong one, would rewrite every pending
        // assessment in the table. The stub refuses to pretend that matched this row.
        const targetsThisRow = u.includes(`id=eq.${encodeURIComponent(ASSESSMENT_ID)}`);
        if (!targetsThisRow) {
          world.unscopedAssessmentWrites = (world.unscopedAssessmentWrites || 0) + 1;
          return { ok: true, status: 200, json: async () => ([]), text: async () => '' };
        }
        if (!world.assessment || (wantsPending && world.assessment.payment_status !== 'pending')) {
          return { ok: true, status: 200, json: async () => ([]), text: async () => '' };
        }
        Object.assign(world.assessment, JSON.parse(opts.body || '{}'));
        return { ok: true, status: 200, json: async () => ([world.assessment]), text: async () => '' };
      }
      if (!u.includes(`id=eq.${encodeURIComponent(ASSESSMENT_ID)}`)) {
        world.unscopedAssessmentReads = (world.unscopedAssessmentReads || 0) + 1;
        return { ok: true, status: 200, json: async () => ([]), text: async () => '' };
      }
      // The read-back. It is the branch the whole design rests on, so it can fail here.
      if (assessmentReadFail) {
        return { ok: false, status: 500, text: async () => 'read failed', json: async () => ({}) };
      }
      return {
        ok: true, status: 200, text: async () => '',
        json: async () => (world.assessment ? [world.assessment] : []),
      };
    }

    if (u.includes('/rest/v1/calculator_reports')) {
      if (method === 'POST') world.reportRowInserts++;
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    }
    if (u.includes('/rest/v1/calculator_sessions_v2')) {
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    }
    if (u.includes('google-analytics.com')) return { ok: true, status: 200, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  return world;
}

const realFetch = globalThis.fetch;
const quiet = () => {
  const real = {};
  for (const k of ['log', 'info', 'warn', 'debug', 'error']) { real[k] = console[k]; console[k] = () => {}; }
  return () => Object.assign(console, real);
};
const post = async (event) => {
  const restore = quiet();
  try { return await handler.fetch(signedRequest(event), ENV, { waitUntil() {} }); }
  finally { restore(); }
};

// ===========================================================================
// GROUP A — payment records the purchase and sends the link. It generates NOTHING.
// ===========================================================================
{
  const world = makeWorld();
  const res = await post(checkoutEvent());
  const body = await res.json();

  check('A', 'the webhook accepts a correctly signed completed checkout',
    res.status === 200, `HTTP ${res.status}`);
  check('A', 'the payment is recorded on the assessment',
    world.assessment.payment_status === 'completed', JSON.stringify(world.assessment));
  check('A', 'the resume email is sent',
    world.resendCalls.length === 1, `${world.resendCalls.length} email(s)`);
  check('A', 'the response says so',
    body.resume_email === 'sent', JSON.stringify(body));

  // The whole point of the design. Step 4 has not happened yet.
  check('A', 'NO report generation is triggered',
    world.anthropicCalls === 0, `${world.anthropicCalls} model call(s)`);
  check('A', 'report/init is not called',
    !world.calls.some(c => c.url.includes('/report/init')), '');
  check('A', 'no report row is created merely because payment completed',
    world.reportRowInserts === 0, `${world.reportRowInserts} insert(s)`);
  check('A', 'the delivery marker is written only after the send',
    world.events.has(`cw-resume-email:${CHECKOUT_ID}`), 'the marker is missing');

  // Other products on the same Stripe account must not be touched.
  const kd = makeWorld();
  await post(checkoutEvent({ client_reference_id: null, metadata: {} }, 'evt_not_cw'));
  check('A', 'a checkout with no assessment reference sends nothing',
    kd.resendCalls.length === 0, 'a non-CW checkout produced a resume email');

  // A Session completed before the money settles is not "your payment went through".
  const pending = makeWorld();
  await post(checkoutEvent({ payment_status: 'unpaid' }, 'evt_unpaid'));
  check('A', 'an unsettled checkout sends nothing',
    pending.resendCalls.length === 0, 'an unpaid session produced a resume email');
}

// ===========================================================================
// GROUP B — what is actually in the email.
// ===========================================================================
{
  const world = makeWorld();
  await post(checkoutEvent());
  const sent = world.resendCalls[0]?.body || {};
  const blob = `${sent.subject || ''}\n${sent.text || ''}\n${sent.html || ''}`;

  check('B', 'it goes to the buyer from the completed checkout',
    Array.isArray(sent.to) && sent.to[0] === BUYER_EMAIL, JSON.stringify(sent.to));
  check('B', 'replies reach a monitored Carnivore Weekly address',
    /@carnivoreweekly\.com$/.test(sent.reply_to || '') && !/iambrew@gmail\.com/.test(blob),
    sent.reply_to || '');
  check('B', 'it carries the assessment UUID from the checkout',
    blob.includes(ASSESSMENT_ID), 'the assessment id is not in the email');
  check('B', 'the link is the production calculator',
    blob.includes('https://carnivoreweekly.com/calculator.html'), '');
  check('B', 'the link returns to the paid flow, not a fresh calculator',
    blob.includes(`payment=success&session_id=${ASSESSMENT_ID}`), buildResumeLink(ASSESSMENT_ID));

  // It must not say the thing that is not true yet.
  for (const [re, what] of [
    [/\b(is ready|has been generated|is generated|attached|download link)\b/i, 'a claim that the report exists'],
    [/\b(being generated|is generating|we are building it now)\b/i, 'a claim that it is generating'],
    [/we will email (you )?(your|the) (report|protocol)/i, 'a promise to email the finished report'],
  ]) {
    check('B', `the email contains no ${what}`, !re.test(blob), (blob.match(re) || [''])[0]);
  }
  check('B', 'it says what IS true: one step left, and the link keeps working',
    /health profile/i.test(blob) && /link works later/i.test(blob), '');
  check('B', 'the subject does not claim a finished report',
    RESUME_SUBJECT.length < 60 && !/(ready|report is|download)/i.test(RESUME_SUBJECT), RESUME_SUBJECT);
  check('B', 'no em-dash in the customer copy',
    !/—/.test(`${RESUME_SUBJECT}${buildResumeEmailBody('https://x.test').text}`), '');
}

// ===========================================================================
// GROUP C — Stripe retries and duplicates send exactly one email.
// ===========================================================================
{
  const world = makeWorld();
  const event = checkoutEvent({}, 'evt_duplicate');
  const first = await post(event);
  const second = await post(event);

  check('C', 'both deliveries are acknowledged',
    first.status === 200 && second.status === 200, `${first.status}/${second.status}`);
  check('C', 'the second is recognised as a duplicate',
    (await second.json()).duplicate === true, '');
  check('C', 'exactly ONE resume email is produced',
    world.resendCalls.length === 1, `${world.resendCalls.length} email(s) sent`);
  check('C', 'and the send carries a deterministic idempotency key',
    world.resendCalls[0]?.idempotencyKey === `cw-resume/${CHECKOUT_ID}`,
    world.resendCalls[0]?.idempotencyKey || 'none');
}

// ===========================================================================
// GROUP D — a transient email failure must not become permanent silence.
//
// This is the group that rejects the obvious implementation. Keying the email off
// the Stripe event row satisfies GROUP C and loses the customer here: the row is
// written before the send, so the retry that would have fixed it is deduped away.
// ===========================================================================
{
  const world = makeWorld({ resendFailFirst: true });
  const event = checkoutEvent({}, 'evt_transient_failure');

  const first = await post(event);
  check('D', 'a failed send is reported to Stripe as a failure, so it retries',
    first.status >= 500, `HTTP ${first.status}`);
  check('D', 'the delivery marker is NOT written when the send failed',
    !world.events.has(`cw-resume-email:${CHECKOUT_ID}`), 'a failed send was marked as delivered');
  check('D', 'the payment record survives the email failure',
    world.assessment.payment_status === 'completed', JSON.stringify(world.assessment));

  // Stripe redelivers the SAME event. The event id is already recorded, so this is
  // the duplicate path: the one that used to return 200 and do nothing.
  const retry = await post(event);
  check('D', 'the retry is accepted',
    retry.status === 200, `HTTP ${retry.status}`);
  check('D', 'the retry actually re-attempts the email',
    world.resendCalls.length === 2, `${world.resendCalls.length} attempt(s)`);
  check('D', 'the retry succeeds and the customer gets exactly one delivered email',
    world.resendCalls.filter(c => c.ok).length === 1, '');
  check('D', 'and the marker is written now',
    world.events.has(`cw-resume-email:${CHECKOUT_ID}`), '');

  // Once delivered, further retries stay quiet.
  await post(event);
  check('D', 'a third delivery sends nothing more',
    world.resendCalls.length === 2, `${world.resendCalls.length} attempt(s)`);

  // ...but retry only what retrying can fix. An address the provider will never accept
  // is not a transient failure, and answering 500 to it makes Stripe retry a doomed
  // send for days. Security review, 2026-09-09.
  const dead = makeWorld({ resendStatus: 422, resendFailStatus: 422 });
  const res422 = await post(checkoutEvent({}, 'evt_bad_address'));
  check('D', 'a permanently rejected address does not become an endless Stripe retry',
    res422.status === 200, `HTTP ${res422.status}`);
  check('D', 'and it is not recorded as delivered either',
    !dead.events.has(`cw-resume-email:${CHECKOUT_ID}`), 'a rejected send was marked delivered');
  // The other half of the split, asserted on the status that distinguishes them.
  const down = makeWorld({ resendStatus: 503, resendFailStatus: 503 });
  const res503 = await post(checkoutEvent({}, 'evt_provider_down'));
  check('D', 'a provider outage IS still retryable',
    res503.status >= 500, `HTTP ${res503.status}`);
  check('D', 'and an outage is not recorded as delivered',
    !down.events.has(`cw-resume-email:${CHECKOUT_ID}`), '');
  // An auth or concurrency rejection is our problem to fix, not the address's, so it
  // must stay on the retry path rather than silently stranding the buyer.
  for (const status of [401, 403, 409, 429]) {
    const w = makeWorld({ resendStatus: status, resendFailStatus: status });
    const r = await post(checkoutEvent({}, `evt_resend_${status}`));
    check('D', `a Resend ${status} is retried, not treated as a dead address`,
      r.status >= 500 && !w.events.has(`cw-resume-email:${CHECKOUT_ID}`), `HTTP ${r.status}`);
  }
}

// ===========================================================================
// GROUP E — the authoritative payment writeback, and repairing it on a retry.
//
// cw_assessment_sessions.payment_status is what Step 4 checks. The webhook used to
// fire that PATCH, log a failure, and carry on with the event already recorded as
// seen. A transient failure there handed a real buyer a link to an assessment the
// server called pending, and Step 4 answered 403. The redelivery that could have
// fixed it only retried the email.
// ===========================================================================
{
  // --- first delivery, with the writeback failing transiently ---------------
  const world = makeWorld({ assessmentPatchFail: 1 });
  const event = checkoutEvent({}, 'evt_writeback_fails');
  const first = await post(event);

  check('E', 'a failed payment writeback is NOT acknowledged as fulfilled',
    first.status >= 500, `HTTP ${first.status}`);
  check('E', 'the assessment is still pending, and honestly so',
    world.assessment.payment_status === 'pending', JSON.stringify(world.assessment));
  check('E', 'NO resume email is sent for an assessment we cannot confirm is paid',
    world.resendCalls.length === 0,
    'the customer would get a link to an assessment Step 4 refuses');
  check('E', 'and nothing was generated',
    world.anthropicCalls === 0 && world.reportRowInserts === 0, '');

  // --- Stripe redelivers the same event -------------------------------------
  const retry = await post(event);
  check('E', 'the retry is acknowledged once the writeback lands',
    retry.status === 200, `HTTP ${retry.status}`);
  check('E', 'the duplicate path REPAIRED the payment writeback',
    world.assessment.payment_status === 'completed', JSON.stringify(world.assessment));
  check('E', 'the assessment PATCH was genuinely re-attempted',
    world.assessmentPatchAttempts >= 2, `${world.assessmentPatchAttempts} attempt(s)`);
  check('E', 'exactly one resume email is sent across both deliveries',
    world.resendCalls.length === 1, `${world.resendCalls.length} email(s)`);
  check('E', 'still nothing generated',
    world.anthropicCalls === 0 && world.reportRowInserts === 0, '');

  // --- an already-completed assessment is success, not an error -------------
  const done = makeWorld({ assessmentStatus: 'completed' });
  const already = await post(checkoutEvent({}, 'evt_already_completed'));
  check('E', 'an already-completed assessment passes idempotently',
    already.status === 200, `HTTP ${already.status}`);
  check('E', 'it stays completed',
    done.assessment.payment_status === 'completed', JSON.stringify(done.assessment));
  check('E', 'and the buyer still gets their link',
    done.resendCalls.length === 1, `${done.resendCalls.length} email(s)`);

  // A zero-row PATCH on a row that is NOT completed must not read as proof of
  // payment. This is the case PostgREST's 200-on-no-match used to hide.
  const wrongState = makeWorld({ assessmentStatus: 'refunded' });
  const odd = await post(checkoutEvent({}, 'evt_unexpected_state'));
  check('E', 'a zero-row PATCH against a non-completed row is not treated as paid',
    odd.status >= 500, `HTTP ${odd.status}`);
  check('E', 'and no email goes out for it',
    wrongState.resendCalls.length === 0, '');

  // --- the read-back itself fails -------------------------------------------
  const blind = makeWorld({ assessmentStatus: 'completed', assessmentReadFail: true });
  const unreadable = await post(checkoutEvent({}, 'evt_readback_fails'));
  check('E', 'an unreadable row is not assumed paid',
    unreadable.status >= 500, `HTTP ${unreadable.status}`);
  check('E', 'and no email is sent on an unproven state',
    blind.resendCalls.length === 0, '');

  // --- the writes are scoped to this customer's row -------------------------
  const scoped = makeWorld();
  await post(checkoutEvent({}, 'evt_scoping'));
  check('E', 'every assessment write and read names the row it is about',
    !scoped.unscopedAssessmentWrites && !scoped.unscopedAssessmentReads,
    `${scoped.unscopedAssessmentWrites || 0} unscoped write(s), ${scoped.unscopedAssessmentReads || 0} unscoped read(s)`);

  // --- an assessment that cannot be confirmed at all ------------------------
  const gone = makeWorld({ assessmentMissing: true });
  const missing = await post(checkoutEvent({}, 'evt_assessment_missing'));
  check('E', 'a missing assessment is NOT treated as successfully fulfilled',
    missing.status >= 500, `HTTP ${missing.status}`);
  check('E', 'no email is sent for an assessment that is not there',
    gone.resendCalls.length === 0, '');
  check('E', 'and nothing was generated',
    gone.anthropicCalls === 0 && gone.reportRowInserts === 0, '');

  // --- the funnel table is bookkeeping, not fulfilment ----------------------
  const funnelBroken = makeWorld();
  const realFetchForWorld = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).includes('/rest/v1/calculator_sessions_v2')) {
      return { ok: false, status: 500, text: async () => 'funnel table down', json: async () => ({}) };
    }
    return realFetchForWorld(url, opts);
  };
  const funnelRes = await post(checkoutEvent({}, 'evt_funnel_down'));
  globalThis.fetch = realFetchForWorld;
  check('E', 'a calculator_sessions_v2 failure does not block fulfilment',
    funnelRes.status === 200, `HTTP ${funnelRes.status}`);
  check('E', 'the customer is still marked paid and still gets their link',
    funnelBroken.assessment.payment_status === 'completed' && funnelBroken.resendCalls.length === 1,
    JSON.stringify({ status: funnelBroken.assessment.payment_status, emails: funnelBroken.resendCalls.length }));
}

// ===========================================================================
// GROUP F — the assessment the link points at still reaches the report path.
// ===========================================================================
{
  const world = makeWorld();
  await post(checkoutEvent({}, 'evt_then_finish'));

  // The link's UUID is what /get-session resolves, which is how a returning browser
  // restores a paid assessment with no local state left.
  const restore = quiet();
  const got = await handler.fetch(
    new Request(`https://api.test/get-session?id=${ASSESSMENT_ID}`), ENV, { waitUntil() {} });
  const session = await got.json().catch(() => ({}));
  restore();
  check('F', 'the resume link resolves to the paid assessment',
    got.status === 200 && JSON.stringify(session).includes(ASSESSMENT_ID), `HTTP ${got.status}`);
  check('F', 'and it is the paid one',
    JSON.stringify(session).includes('completed'), JSON.stringify(session).slice(0, 200));
  check('F', 'nothing generated a report along the way',
    world.anthropicCalls === 0 && world.reportRowInserts === 0, '');
}

// ===========================================================================
// GROUP G — customer-facing copy, read from the shipped files.
// ===========================================================================
{
  const appSrc = fs.readFileSync(
    path.join(ROOT, 'calculator2-demo', 'src', 'components', 'calculator', 'CalculatorApp.tsx'), 'utf8');

  for (const [claim, why] of [
    ['Your personalized protocol is being generated', 'nothing generates until Step 4 is submitted'],
    ['Check your email for your download link', 'no download link is ever emailed'],
    ['A copy will also be emailed to you', 'no copy is emailed unless the reader presses the button'],
  ]) {
    check('G', `the calculator no longer says "${claim.slice(0, 40)}"`,
      !appSrc.includes(claim), why);
  }
  check('G', 'the post-payment screen points at the health profile',
    /Payment received\. One step left\./.test(appSrc) && /health\s*\n?\s*'?\s*\+?\s*'?profile/i.test(appSrc), '');
  check('G', 'it tells them a link was emailed, which is now true',
    /emailed you a/.test(appSrc), '');
  check('G', 'the manual "Email My Report" button is still there',
    /Email My Report/.test(appSrc), 'the feature customers DO have was removed');

  const step4Src = fs.readFileSync(
    path.join(ROOT, 'calculator2-demo', 'src', 'components', 'calculator', 'steps', 'Step4HealthProfile.tsx'), 'utf8');
  check('G', 'the health profile no longer says the protocol will be sent to them',
    !/Your protocol will be sent to/.test(step4Src),
    'nothing sends the protocol; only the reader pressing Email My Report does');
  check('G', 'it says what the emailed link actually is',
    /We emailed your return link to/.test(step4Src), '');

  for (const [claim, why] of [
    ['your report will be emailed to you', 'the restore-failure path promised a delivery'],
    ['Your report will also be emailed to you', 'the retry path promised one too'],
  ]) {
    check('G', `no recovery error says "${claim.slice(0, 34)}"`,
      !appSrc.includes(claim), why);
  }
  check('G', 'the recovery errors point at the link that does exist',
    /we emailed you a link that brings you back/.test(appSrc) &&
    /the link we emailed you when you\s*'?\s*\+?\s*'?\s*paid still works/.test(appSrc.replace(/\s+/g, ' ')), '');

  const modalSrc = fs.readFileSync(
    path.join(ROOT, 'calculator2-demo', 'src', 'components', 'ui', 'StripePaymentModal.tsx'), 'utf8');
  check('G', 'the payment modal no longer promises to send the protocol',
    !/send your personalized protocol to this email/.test(modalSrc),
    'the moment of payment is the worst place to promise a delivery that never happens');
  check('G', 'it describes the email that IS sent',
    /email your return link to this address/.test(modalSrc), '');

  const terms = fs.readFileSync(path.join(ROOT, 'public', 'terms.html'), 'utf8');
  check('G', 'the terms page no longer says the report is delivered by email',
    !/delivered on-screen and by email/.test(terms), '');
  check('G', 'and it describes the resume link and the manual copy instead',
    /link back to your assessment/.test(terms) && /Email My Report button/.test(terms), '');

  const successSrc = fs.readFileSync(
    path.join(ROOT, 'calculator2-demo', 'src', 'components', 'AssessmentSuccess.tsx'), 'utf8');
  check('G', 'the assessment success page no longer claims a report was emailed',
    !/Check your email for a copy of this report/.test(successSrc), '');

  // The page that actually loads in production has to be the rebuilt bundle, or none
  // of the above reaches a customer. This is the manual step this repo has tripped on.
  const calcHtml = fs.readFileSync(path.join(ROOT, 'public', 'calculator.html'), 'utf8');
  const src = (calcHtml.match(/var SRC = '([^']+)'/) || [])[1] || '';
  const bundle = src ? fs.readFileSync(path.join(ROOT, 'public', src.replace(/^\//, '')), 'utf8') : '';
  check('G', 'calculator.html loads a bundle that exists',
    bundle.length > 0, `SRC=${src}`);
  check('G', 'and that bundle carries the corrected copy',
    bundle.includes('Payment received. One step left.'),
    'the shipped bundle still has the old post-payment copy');
  check('G', 'the shipped bundle carries none of the false claims',
    !bundle.includes('Your personalized protocol is being generated') &&
    !bundle.includes('Check your email for your download link'), '');
}

globalThis.fetch = realFetch;

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  [${f.group}] ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
  console.log(`\npaid-resume-email: ${passed} passed, ${failures.length} FAILED`);
  process.exit(1);
}
console.log(`paid-resume-email: ${passed} passed, 0 failed  (groups A B C D E F G)`);
console.log('');
console.log('Payment sends the way back, not the report. One email per purchase, a');
console.log('failed send is retried rather than deduped into silence, and nothing on');
console.log('screen promises a delivery that does not happen.');
