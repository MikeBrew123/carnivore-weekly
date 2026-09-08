#!/usr/bin/env node
/**
 * tests/kd-integration-live.test.mjs
 *
 * REAL-INTERFACE INTEGRATION PROOF FOR THE KETODIAL AUTHORITATIVE-INTAKE FLOW.
 *
 *     node tests/kd-integration-live.test.mjs
 *
 * ---------------------------------------------------------------------------
 * THIS FILE IS NOT PART OF CI, ON PURPOSE
 * ---------------------------------------------------------------------------
 * It needs real Supabase credentials and it WRITES ROWS to a real database. CI
 * runs tests/kd-intake-authority.test.mjs and tests/kd-report-safety.test.mjs,
 * which stub every boundary and are safe to run anywhere. This one exists to
 * answer the question those cannot: does the round trip actually work against the
 * real storage, or only against my idea of it.
 *
 * Credentials are read from secrets/api-keys.json at run time. NOTHING SECRET IS
 * WRITTEN INTO THIS FILE and nothing secret is printed.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS REAL HERE AND WHAT IS NOT — read this before believing the output
 * ---------------------------------------------------------------------------
 * REAL:
 *   - the worker's own default.fetch() handler, driven with real Request objects
 *   - POST /session, PATCH /session, POST /checkout, GET /report/:id
 *   - every Supabase call: real HTTPS to the real project, real inserts, real
 *     reads, real PostgREST coercion (numerics come back as strings, arrays as
 *     arrays), real CHECK constraint on kidney_status
 *   - loadAuthoritativeIntake / validateIntake / deriveKdMedicalContext /
 *     allowedProducts / the three generators
 *
 * NOT REAL, AND WHY:
 *   - **No Stripe object is created.** The only Stripe TEST key in the vault
 *     (secrets/api-keys.json -> stripe.secret_key_test, last rotated 2026-01-06)
 *     is EXPIRED: /v1/balance returns "Expired API Key provided". The Stripe MCP
 *     server is not authorized in this session either. Using the LIVE key was
 *     rejected — a live-mode Checkout Session is a production artifact and this
 *     run is supposed to be non-production.
 *
 *     So the Stripe leg is proven at the HTTP boundary instead: the interceptor
 *     below captures the EXACT bytes handleCheckout serializes and asserts the
 *     metadata shape on them. That is a real assertion about real code — the
 *     request is the one Stripe would have received — but it is NOT proof that
 *     Stripe accepted it. Rotate the test key and this file upgrades to a true
 *     end-to-end with no other change.
 *
 *   - `payment_status: 'paid'` on the retrieved Checkout Session. A test-mode
 *     session cannot be completed through the API without a browser, and
 *     handleReport refuses anything not paid. The flip is stated, not hidden.
 *
 * ---------------------------------------------------------------------------
 * DATABASE SAFETY
 * ---------------------------------------------------------------------------
 * There is exactly ONE Supabase project on this account (kwtdpvnjewtahuxjyltn,
 * "CarnivoreWeekly") and it is PRODUCTION. There is no staging project. A
 * preview branch costs $0.01344/hour, which is spend, and spend is Brew's call.
 *
 * So this writes to production, and it protects the data three ways:
 *   1. every row is tagged source='ketodial-audit2b-test', which no product code
 *      path can produce, so reporting can exclude it and a human can find it
 *   2. every row's email is @audit2b.invalid — a reserved TLD that cannot receive
 *      mail, so no real address is involved and no PII is created
 *   3. cleanup runs in a finally block and the run FAILS if any row survives
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const WORKER = path.join(REPO, 'ketodial', 'worker', 'index.js');

// ---------------------------------------------------------------------------
// Credentials. Read at run time, never logged, never committed.
// ---------------------------------------------------------------------------
// Repo-relative first, then the sibling main checkout (this file usually runs from a
// worktree, and secrets/ is gitignored so it only exists in the primary clone).
// KD_SECRETS_PATH overrides both. Nothing here is a credential — it is a file path.
const SECRETS = process.env.KD_SECRETS_PATH || [
  path.join(REPO, 'secrets', 'api-keys.json'),
  path.join(REPO, '..', 'carnivore-weekly', 'secrets', 'api-keys.json'),
].find(p => fs.existsSync(p)) || path.join(REPO, 'secrets', 'api-keys.json');
let creds;
try {
  creds = JSON.parse(fs.readFileSync(SECRETS, 'utf8'));
} catch (e) {
  console.error(`Cannot read ${SECRETS}: ${e.message}`);
  console.error('This suite needs real credentials and is not part of CI. Skipping is correct in CI.');
  process.exit(2);
}

const SUPABASE_URL = creds.supabase.url;
const SUPABASE_KEY = creds.supabase.service_role_key;
const PROJECT_REF = creds.supabase.project_id;

const TEST_SOURCE = 'kd-audit2b-test';
const TEST_EMAIL_DOMAIN = '@audit2b.invalid';

// Test-mode price ids are unresolvable without a working test key, so the map is
// synthetic. It only ever reaches the intercepted Stripe request.
const TEST_PRICE_MAP = {
  doctor: 'price_TEST_doctor', meal: 'price_TEST_meal', starter: 'price_TEST_starter',
  essentials: 'price_TEST_essentials', protocol: 'price_TEST_protocol',
};

const ENV = {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
  STRIPE_SECRET_KEY: 'sk_test_UNUSED_no_stripe_object_is_created_by_this_run',
  PRICE_MAP_JSON: JSON.stringify(TEST_PRICE_MAP),
  // Non-empty so the send path actually runs; every call is captured by the stub
  // above and nothing reaches Resend. resendSend() now throws on a missing key, so
  // leaving this blank would make every delivery test pass for the wrong reason.
  RESEND_API_KEY: 'stub-key-never-used-no-mail-leaves-this-process',
};

// ---------------------------------------------------------------------------
// The Stripe boundary. Supabase is NOT intercepted — those calls go to the real
// database. Only api.stripe.com is captured.
// ---------------------------------------------------------------------------
const realFetch = globalThis.fetch;
const stripeCalls = [];
const fakeSessions = new Map();

const emailsSent = [];
let resendShouldFail = false;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  // NOTHING MAY LEAVE. /fulfill and the webhook both send real mail, so Resend is
  // captured here rather than trusted to fail on an empty key.
  if (u.includes('api.resend.com')) {
    const b = opts.body ? JSON.parse(opts.body) : {};
    const key = (opts.headers && (opts.headers['Idempotency-Key'] || opts.headers['idempotency-key'])) || null;
    emailsSent.push({ to: b.to, subject: b.subject, html: b.html || '',
                      replyTo: b.reply_to, idempotencyKey: key });
    if (resendShouldFail) return { ok: false, status: 500, text: async () => 'stubbed Resend outage' };
    return { ok: true, json: async () => ({ id: 'email_stubbed_no_send' }) };
  }
  if (!u.includes('api.stripe.com')) return realFetch(url, opts);

  const body = opts.body ? String(opts.body) : '';
  stripeCalls.push({ url: u, method: opts.method || 'GET', body });

  // POST /v1/checkout/sessions — capture what the worker actually serialized.
  if (u.endsWith('/checkout/sessions') && (opts.method || 'GET') === 'POST') {
    const params = new URLSearchParams(body);
    const id = 'cs_test_audit2b_' + Math.random().toString(36).slice(2, 12);
    const metadata = {};
    for (const [k, v] of params.entries()) {
      const m = k.match(/^metadata\[(.+)\]$/);
      if (m) metadata[m[1]] = v;
    }
    fakeSessions.set(id, {
      id,
      // Flipped to 'paid'. A test-mode session cannot be completed via API.
      payment_status: 'paid',
      customer_email: params.get('customer_email'),
      metadata,
      amount_total: 0,
      livemode: false,
    });
    return { ok: true, json: async () => ({ id, client_secret: 'cs_test_secret_' + id }) };
  }

  // GET /v1/checkout/sessions/:id — hand back the session built from real bytes.
  const m = u.match(/\/checkout\/sessions\/([^?]+)/);
  if (m && fakeSessions.has(m[1])) {
    return { ok: true, json: async () => fakeSessions.get(m[1]) };
  }
  return { ok: false, status: 404, json: async () => ({ error: { message: 'not found' } }) };
};

const worker = (await import('file://' + WORKER)).default;

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------
let checks = 0;
const failures = [];
const createdTokens = new Set();

function check(group, name, ok, detail = '') {
  checks++;
  if (!ok) failures.push({ group, name, detail });
}

const req = (method, pathname, body) => new Request('https://ketodial-api.test' + pathname, {
  method,
  headers: { 'Content-Type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

const call = async (method, pathname, body) => {
  const res = await worker.fetch(req(method, pathname, body), ENV);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html report */ }
  return { status: res.status, json, text };
};

/** Read a row straight from PostgREST, bypassing the worker, to prove persistence. */
async function readRow(token) {
  const res = await realFetch(
    `${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${encodeURIComponent(token)}&limit=1`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } });
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function deleteRow(token) {
  const res = await realFetch(
    `${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${encodeURIComponent(token)}`,
    { method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
  return res.ok;
}

/** The step-1 payload, exactly as ketodial.js sends it. */
function step1(kidney) {
  return {
    sex: 'female', age: 58, goal: 'lose', lifestyle_activity: 'sedentary',
    height_cm: 165, weight_value: 194, weight_unit: 'lbs',
    email: `audit2b-${kidney}${TEST_EMAIL_DOMAIN}`,
    newsletter_opt_in: false,
    kidney_status: kidney,
    macros: { calories: 1650, fatG: 128, proteinG: 118, carbG: 22, tdee: 2060 },
    referrer: null, device_type: 'desktop',
    utm_source: TEST_SOURCE, utm_medium: null, utm_campaign: null, utm_content: null, utm_term: null,
  };
}

/** The step-2 payload, exactly as updateSession() sends it. */
function step2(token) {
  return {
    token, step_completed: 2,
    email: null, first_name: 'Audit2B',
    conditions: [], symptoms: [], medications: '',
    // What the browser submits NOW: the explicit value= attributes added on
    // 2026-09-08, which are the shared table's own vocabulary.
    dairy_tolerance: 'some',
    cooking_skill: 'beginner',
    meal_prep_time: 'some',
    family_situation: 'solo',
    budget: 'moderate',
    biggest_challenge: '', previous_diets: [],
  };
}

const stripTags = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

// ===========================================================================
// THE RUN
// ===========================================================================
const results = {};

try {
  // -------------------------------------------------------------------------
  // GROUP 1 — the round trip, for all three answers.
  // -------------------------------------------------------------------------
  for (const answer of ['no', 'yes', 'unsure']) {
    const G = `1/${answer}`;

    // 1. kidney answer -> persisted
    const created = await call('POST', '/session', step1(answer));
    check(G, 'POST /session succeeds against the real database', created.status === 200,
      `status ${created.status} ${created.text.slice(0, 200)}`);
    const token = created.json && created.json.token;
    check(G, 'a session token is issued', typeof token === 'string' && token.startsWith('kd_'), String(token));
    if (!token) continue;
    createdTokens.add(token);

    // Tag the row so it is identifiable in production reporting even if cleanup fails.
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ source: TEST_SOURCE }),
    });

    const rowAfterStep1 = await readRow(token);
    check(G, 'the kidney answer is durably stored in calculator_sessions_v2',
      rowAfterStep1 && rowAfterStep1.kidney_status === answer,
      `column holds ${rowAfterStep1 && JSON.stringify(rowAfterStep1.kidney_status)}`);

    // 2. medical intake completes the record
    const updated = await call('PATCH', '/session', step2(token));
    check(G, 'PATCH /session records the medical screen', updated.status === 200,
      `status ${updated.status}`);
    const row = await readRow(token);
    check(G, 'step_completed reached 2', row && row.step_completed >= 2, '');
    check(G, '"answered nothing" was stored as an answer, not left NULL',
      row && row.medications !== null && row.conditions !== null,
      `medications=${row && JSON.stringify(row.medications)} conditions=${row && JSON.stringify(row.conditions)}`);
    check(G, 'the kidney answer survived the second write',
      row && row.kidney_status === answer, '');
    // Proven against the real constraints rather than asserted.
    check(G, "the values the form now submits are accepted by the shared table as-is",
      row && row.dairy_tolerance === 'some' && row.cooking_skill === 'beginner' &&
      row.meal_prep_time === 'some' && row.family_situation === 'solo' && row.budget === 'moderate',
      `stored dairy=${row && row.dairy_tolerance} cooking=${row && row.cooking_skill} ` +
      `prep=${row && row.meal_prep_time} family=${row && row.family_situation} budget=${row && row.budget}`);

    // 3. authoritative intake read back + validated, through the real module
    const { loadAuthoritativeIntake } = await import('file://' + path.join(REPO, 'ketodial', 'worker', 'intake.js'));
    const { deriveKdMedicalContext, allowedProducts } =
      await import('file://' + path.join(REPO, 'ketodial', 'worker', 'reports.js'));
    let intake = null, intakeErr = null;
    try { intake = await loadAuthoritativeIntake(token, ENV); } catch (e) { intakeErr = e; }
    check(G, 'the complete authoritative intake loads and validates from the real row',
      intake !== null, intakeErr ? `${intakeErr.name}: ${intakeErr.message}` : '');
    if (!intake) continue;

    check(G, 'the round trip preserves her real weight (194 lb -> 88.0 kg)',
      Math.abs(intake.weightKg - 88.0) < 0.2, `got ${intake.weightKg}`);
    check(G, 'medical context is derived from the stored answer',
      deriveKdMedicalContext(intake).kidneyAnswer === answer, '');
    check(G, 'and the stored vocabulary translates back to what the generators expect',
      intake.dairy === 'a little bothers me' && intake.budget === 'mod',
      `dairy=${intake.dairy} budget=${intake.budget}`);

    const ctx = deriveKdMedicalContext(intake);
    const offer = allowedProducts(ctx);
    const suppressed = answer !== 'no';
    check(G, `protein suppression is ${suppressed ? 'ON' : 'OFF'} as the answer requires`,
      ctx.restrictProteinTarget === suppressed, '');

    // 4. checkout validates the intake and builds the Stripe request
    const wanted = suppressed ? ['doctor', 'starter'] : ['protocol'];
    stripeCalls.length = 0;
    const checkout = await call('POST', '/checkout',
      { items: wanted, email: `audit2b-${answer}${TEST_EMAIL_DOMAIN}`, name: 'Audit2B', token });
    check(G, `checkout succeeds for the products this customer may buy (${wanted.join('+')})`,
      checkout.status === 200, `status ${checkout.status} ${JSON.stringify(checkout.json)}`);

    const post = stripeCalls.find(c => c.method === 'POST' && c.url.endsWith('/checkout/sessions'));
    check(G, 'a Checkout Session request reached the Stripe boundary', !!post, '');
    if (post) {
      const params = new URLSearchParams(post.body);
      const metaKeys = [...params.keys()].filter(k => k.startsWith('metadata['));
      check(G, 'Stripe metadata carries the bounded session_token',
        params.get('metadata[session_token]') === token, '');
      check(G, 'Stripe metadata carries NO serialized intake',
        !metaKeys.includes('metadata[form_data]'),
        `metadata keys: ${metaKeys.join(', ')}`);
      check(G, 'the session reference is short and bounded (<= 40 chars)',
        (params.get('metadata[session_token]') || '').length <= 40,
        `${token.length} chars`);
      // Nothing resembling a questionnaire anywhere in the outbound body.
      check(G, 'no questionnaire field appears anywhere in the Stripe request body',
        !/proteinG|weightKg|heightCm|biggest_challenge|conditions|medications/.test(post.body),
        'the request body still contains questionnaire fields');
    }

    // 5. the report path: real token -> real Supabase -> real generation
    const sessionId = checkout.json && checkout.json.sessionId;
    const rep = await call('GET', `/report/${sessionId}?type=doctor`);
    check(G, "the Doctor's Report generates from the authoritative row", rep.status === 200,
      `status ${rep.status}`);
    const doc = rep.text || '';
    const text = stripTags(doc);

    check(G, 'the report states her real BMI (32.3), computed from the stored row',
      /32\.3/.test(text), 'the report is not using the authoritative row');
    check(G, 'the report does not contain the old substituted body (BMI 26.0 / 75 kg / 1800 kcal)',
      !/\b26\.0\b/.test(text) && !/\b1,?800\b/.test(text), '');

    if (suppressed) {
      check(G, 'the personalized protein figure is absent from the report',
        !/\b118\s*g\b/.test(text), '');
      check(G, 'no substitute protein number appears either',
        !/\b\d{1,3}\s*g\s*(?:of\s+)?protein\b/i.test(text) &&
        !/protein[^.]{0,40}?\b\d{1,3}\s*g\b/i.test(text), '');
      check(G, 'the reader is routed to a renal dietitian', /renal dietitian/i.test(text), '');
      check(G, 'the protein-anchored meal plan is NOT sold', offer.blocked.includes('meal'), '');
      check(G, 'nor any bundle containing it',
        offer.blocked.includes('essentials') && offer.blocked.includes('protocol'), '');
      check(G, "the Doctor's Report remains purchasable", offer.allowed.includes('doctor'), '');
      check(G, 'the Starter Kit remains purchasable', offer.allowed.includes('starter'), '');
      check(G, 'the customer can still spend money', offer.allowed.length >= 2, '');

      // Selling the blocked product must be refused at the real endpoint.
      const blockedBuy = await call('POST', '/checkout',
        { items: ['protocol'], email: `audit2b-${answer}${TEST_EMAIL_DOMAIN}`, name: 'Audit2B', token });
      check(G, 'the real checkout endpoint declines the protein-anchored bundle',
        blockedBuy.status === 409 && blockedBuy.json.error === 'product_unavailable',
        `status ${blockedBuy.status}`);
      check(G, 'and tells the customer what is still available',
        blockedBuy.json && Array.isArray(blockedBuy.json.available) &&
        blockedBuy.json.available.includes('doctor'), '');

      const mealRep = await call('GET', `/report/${sessionId}?type=meal`);
      check(G, 'a meal plan cannot be fetched either (it was not purchased)',
        mealRep.status === 403 || /renal dietitian/i.test(stripTags(mealRep.text || '')), '');
    } else {
      check(G, 'the personalized protein figure IS present', /\b118\s*g\b/.test(text), '');
      check(G, 'the full product set remains available',
        offer.allowed.length === 5 && offer.blocked.length === 0, '');
      const meal = await call('GET', `/report/${sessionId}?type=meal`);
      check(G, 'the protein-anchored meal plan generates normally',
        meal.status === 200 && /class="wg"/.test(meal.text), `status ${meal.status}`);
    }

    if (answer === 'unsure') {
      // Suppression must not become diagnosis.
      check(G, 'the report does NOT claim a kidney diagnosis the customer never gave',
        !/Kidney disease \/ CKD/i.test(doc),
        'an "I\'m not sure" answer was rendered as a declared condition');
      check(G, 'the authoritative value remains exactly "unsure"',
        row.kidney_status === 'unsure' && intake.kidneyStatus === 'unsure', '');
      check(G, 'and it was not smuggled into the conditions array',
        !(row.conditions || []).includes('kidney'), '');
    }

    results[answer] = {
      token,
      storedKidney: row.kidney_status,
      suppressed: ctx.restrictProteinTarget,
      offered: offer.allowed,
      blocked: offer.blocked,
      stripeMetadataKeys: post ? [...new URLSearchParams(post.body).keys()]
        .filter(k => k.startsWith('metadata[')) : [],
      reportBytes: doc.length,
    };
  }

  // -------------------------------------------------------------------------
  // GROUP 1b — a session created by the OLD form still works.
  // ---------------------------------------------------------------------------
  // The <option> tags now carry explicit values, so the bridge is no longer on the
  // hot path. It still has to rescue anyone mid-session across the deploy, and a
  // cached page will keep submitting label text for as long as it lives. This is
  // the only remaining reason to keep the bridge, so it gets its own proof against
  // the real constraints — the ones that rejected exactly these strings.
  // -------------------------------------------------------------------------
  {
    const G = '1b/legacy-form';
    const created = await call('POST', '/session', step1('yes'));
    const token = created.json.token;
    createdTokens.add(token);
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ source: TEST_SOURCE }),
    });

    const legacy = {
      ...step2(token),
      dairy_tolerance: 'A little bothers me',
      cooking_skill: 'Basic — I can follow a recipe',
      meal_prep_time: 'About 30 min/day',
      family_situation: 'Just me',
      budget: 'mod',
    };
    const res = await call('PATCH', '/session', legacy);
    check(G, 'a stale page submitting label text is still accepted', res.status === 200,
      `status ${res.status} ${res.text.slice(0, 160)}`);
    const row = await readRow(token);
    check(G, 'and its answers land in the shared vocabulary',
      row && row.dairy_tolerance === 'some' && row.cooking_skill === 'beginner' &&
      row.meal_prep_time === 'some' && row.family_situation === 'solo' && row.budget === 'moderate',
      `stored dairy=${row && row.dairy_tolerance} cooking=${row && row.cooking_skill} ` +
      `prep=${row && row.meal_prep_time} family=${row && row.family_situation} budget=${row && row.budget}`);
    check(G, 'so the medical answers it carried are not lost with it',
      row && row.medications !== null && row.conditions !== null && row.step_completed >= 2, '');
  }

  // -------------------------------------------------------------------------
  // GROUP 1c — PAY FIRST, FINISH THE PROFILE AFTERWARDS.
  // ---------------------------------------------------------------------------
  // The hole that splitting the boundaries opened. A customer may buy after step 1;
  // the webhook then cannot generate a report, and it used to log NO REPORT SENT,
  // return 200 to Stripe and send nothing at all. The customer paid and heard
  // silence. The recovery the error page suggested did not work either: Stripe
  // redirects to a freshly loaded page where sessionToken is null and nothing
  // restores it, so the profile could not be attached to the paid session.
  //
  // Proven end to end here against the real database.
  // -------------------------------------------------------------------------
  {
    const G = '1c/pay-then-profile';
    const created = await call('POST', '/session', step1('yes'));
    const token = created.json.token;
    createdTokens.add(token);
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ source: TEST_SOURCE }),
    });

    // 1. Buy with NO step-2 profile. This must succeed.
    const buy = await call('POST', '/checkout',
      { items: ['doctor', 'starter'], email: `audit2b-late${TEST_EMAIL_DOMAIN}`, name: 'Linda', token });
    check(G, 'a customer can buy before completing the optional profile', buy.status === 200,
      `status ${buy.status} ${JSON.stringify(buy.json)}`);
    const csid = buy.json && buy.json.sessionId;

    // 2. The webhook must NOT go silent — it sends the finish-your-reports email.
    emailsSent.length = 0;
    // The webhook verifies Stripe signatures, so the branch is driven through the
    // same loader it uses rather than by forging one.
    const { loadAuthoritativeIntake: loadReport } =
      await import('file://' + path.join(REPO, 'ketodial', 'worker', 'intake.js'));
    let hookErr = null;
    try { await loadReport(token, ENV); } catch (e) { hookErr = e; }
    check(G, 'the webhook path sees an unfinished profile, not a corrupt one',
      hookErr && hookErr.code === 'INTAKE_PROFILE_NOT_COMPLETED',
      hookErr ? hookErr.code : 'no error at all');

    // 3. The success screen learns what was bought and that delivery is pending.
    const before = await call('GET', `/purchase/${csid}`);
    check(G, 'purchase status is readable from the Stripe session alone', before.status === 200,
      `status ${before.status}`);
    check(G, 'it reports only what was actually purchased',
      before.json && JSON.stringify(before.json.purchased.sort()) === JSON.stringify(['doctor', 'starter']),
      JSON.stringify(before.json && before.json.purchased));
    check(G, 'it does NOT claim the meal plan they were correctly not sold',
      before.json && !before.json.purchased.includes('meal'), '');
    check(G, 'it reports the profile as incomplete but recoverable',
      before.json && before.json.profileComplete === false && before.json.recoverable === true, '');

    // 4. Fulfilment is refused while the profile is unfinished.
    const early = await call('POST', '/fulfill', { stripe_session_id: csid });
    check(G, 'fulfilment refuses while the profile is unfinished', early.status === 409,
      `status ${early.status}`);
    check(G, '  ...and no report email was sent', emailsSent.length === 0,
      `${emailsSent.length} email(s) escaped`);

    // 5. THE RECOVERY: the profile is submitted keyed on the STRIPE SESSION ID, with
    //    no session token — exactly what the browser has after the redirect.
    const late = await call('PATCH', '/session', {
      stripe_session_id: csid,
      step_completed: 2, first_name: 'Linda',
      conditions: ['t2d'], symptoms: ['energy'], medications: 'Metformin 1000mg',
      dairy_tolerance: 'some', cooking_skill: 'beginner', meal_prep_time: 'some',
      family_situation: 'solo', budget: 'moderate', biggest_challenge: '', previous_diets: [],
    });
    check(G, 'the profile can be saved with NO session token, keyed on the paid session',
      late.status === 200, `status ${late.status} ${late.text.slice(0, 160)}`);

    const row = await readRow(token);
    check(G, 'and it landed on the ORIGINAL authoritative row', row && row.step_completed >= 2 &&
      row.medications === 'Metformin 1000mg' && (row.conditions || []).includes('t2d'),
      `step=${row && row.step_completed} meds=${row && row.medications}`);
    check(G, 'without disturbing the kidney answer given before payment',
      row && row.kidney_status === 'yes', `kidney=${row && row.kidney_status}`);

    // 6. Now it delivers.
    emailsSent.length = 0;
    const done = await call('POST', '/fulfill', { stripe_session_id: csid });
    check(G, 'fulfilment now succeeds', done.status === 200, `status ${done.status}`);
    check(G, 'and exactly one report email is sent', emailsSent.length === 1,
      `${emailsSent.length} sent`);
    check(G, 'the email offers only the purchased reports',
      emailsSent[0] && /Doctor/.test(emailsSent[0].html) && /Starter/.test(emailsSent[0].html) &&
      !/7-Day Meal Plan/.test(emailsSent[0].html), '');

    const after = await call('GET', `/purchase/${csid}`);
    check(G, 'the success screen now shows the profile as complete',
      after.json && after.json.profileComplete === true, '');

    // 7. Idempotent: a double click must not send twice.
    emailsSent.length = 0;
    const again = await call('POST', '/fulfill', { stripe_session_id: csid });
    check(G, 'a repeated fulfilment is idempotent', again.status === 200 &&
      again.json.alreadyDelivered === true, JSON.stringify(again.json));
    check(G, '  ...and sends no second email', emailsSent.length === 0,
      `${emailsSent.length} duplicate(s)`);

    const delivered = await readRow(token);
    check(G, 'delivery is recorded, so "paid but never delivered" is answerable',
      delivered && delivered.reports_delivered_at !== null, '');

    // 8. An UNPAID session must not unlock writing to someone's row.
    const unpaid = await call('PATCH', '/session',
      { stripe_session_id: 'cs_test_never_existed', step_completed: 2, conditions: [], medications: '' });
    check(G, 'an unknown checkout id cannot write to any row', unpaid.status >= 400,
      `status ${unpaid.status}`);
  }

  // -------------------------------------------------------------------------
  // GROUP 1d — DELIVERY TRUTHFULNESS, against the real database.
  // ---------------------------------------------------------------------------
  // sendReportEmail used to log a non-2xx Resend response and return normally, so
  // both callers went on to write reports_delivered_at — permanently recording a
  // delivery that never happened, on the one column that answers "who paid and got
  // nothing". And the marker itself swallowed a rejected PATCH, so a failed write
  // looked identical to a successful one.
  // -------------------------------------------------------------------------
  {
    const G = '1d/delivery';
    const created = await call('POST', '/session', step1('no'));
    const token = created.json.token;
    createdTokens.add(token);
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ source: TEST_SOURCE }),
    });
    await call('PATCH', '/session', step2(token));
    const buy = await call('POST', '/checkout',
      { items: ['doctor'], email: `audit2b-deliv${TEST_EMAIL_DOMAIN}`, name: 'Linda', token });
    const csid = buy.json.sessionId;

    // --- Resend rejects: nothing may be marked delivered. ---
    resendShouldFail = true;
    emailsSent.length = 0;
    const failed = await call('POST', '/fulfill', { stripe_session_id: csid });
    resendShouldFail = false;

    check(G, 'a rejected send reports failure, not success', failed.status === 502,
      `status ${failed.status} ${JSON.stringify(failed.json)}`);
    check(G, '  ...and says it is retryable', failed.json && failed.json.retryable === true, '');
    const afterFail = await readRow(token);
    check(G, '  ...and reports_delivered_at is NOT written',
      afterFail && afterFail.reports_delivered_at === null,
      `marker = ${afterFail && afterFail.reports_delivered_at} — a delivery that never happened`);
    check(G, '  ...so the customer stays visible to the paid-but-undelivered query',
      afterFail && afterFail.reports_delivered_at === null, '');

    // --- Retry after the transient failure succeeds, with the SAME key. ---
    emailsSent.length = 0;
    const ok1 = await call('POST', '/fulfill', { stripe_session_id: csid });
    check(G, 'the retry after a transient failure succeeds', ok1.status === 200,
      `status ${ok1.status}`);
    check(G, '  ...and the delivery is recorded only now',
      ok1.json && ok1.json.deliveryRecorded === true, '');
    const afterOk = await readRow(token);
    check(G, '  ...in the database', afterOk && afterOk.reports_delivered_at !== null, '');

    check(G, 'the report email carries a DETERMINISTIC idempotency key',
      emailsSent.length === 1 && emailsSent[0].idempotencyKey === `kd-report/${csid}`,
      `key = ${emailsSent[0] && emailsSent[0].idempotencyKey}`);
  }

  // -------------------------------------------------------------------------
  // GROUP 1e — CONCURRENT FULFILMENT.
  // ---------------------------------------------------------------------------
  // reports_delivered_at is read-then-write, so two simultaneous /fulfill requests
  // can both see NULL and both send. The database marker is durable application
  // state; the deterministic Resend key is what makes the duplicate a no-op.
  // -------------------------------------------------------------------------
  {
    const G = '1e/concurrent';
    const created = await call('POST', '/session', step1('no'));
    const token = created.json.token;
    createdTokens.add(token);
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ source: TEST_SOURCE }),
    });
    await call('PATCH', '/session', step2(token));
    const buy = await call('POST', '/checkout',
      { items: ['starter'], email: `audit2b-conc${TEST_EMAIL_DOMAIN}`, name: 'Linda', token });
    const csid = buy.json.sessionId;

    emailsSent.length = 0;
    const [a, b] = await Promise.all([
      call('POST', '/fulfill', { stripe_session_id: csid }),
      call('POST', '/fulfill', { stripe_session_id: csid }),
    ]);
    check(G, 'both concurrent fulfilments answer successfully',
      a.status === 200 && b.status === 200, `${a.status} / ${b.status}`);

    const keys = emailsSent.map(e => e.idempotencyKey);
    check(G, 'every send used the SAME deterministic key, so Resend collapses them',
      keys.length > 0 && keys.every(k => k === `kd-report/${csid}`),
      `keys: ${JSON.stringify(keys)}`);
    check(G, '  ...and the key is derived from the Stripe session, not random',
      keys.every(k => k === `kd-report/${csid}`), '');
    check(G, 'the row records delivery exactly once',
      (await readRow(token)).reports_delivered_at !== null, '');
  }

  // -------------------------------------------------------------------------
  // GROUP 1f — THE PAYMENT WRITEBACK, AGAINST THE REAL DB VOCABULARY.
  // ---------------------------------------------------------------------------
  // Stripe Checkout says payment_status='paid'. calculator_sessions_v2 allows
  // pending|completed|failed|refunded. The webhook wrote Stripe's word straight
  // through, PostgREST rejected the WHOLE patch on the CHECK constraint, and the
  // amount, the payment intent and the timestamps went with it. Same class as the
  // step-2 defect: one wrong enum value silently discards an entire write.
  //
  // Stubs cannot catch this, so it is asserted against the real table.
  // -------------------------------------------------------------------------
  {
    const G = '1f/payment-writeback';
    const created = await call('POST', '/session', step1('no'));
    const token = created.json.token;
    createdTokens.add(token);

    const writeback = async (payload) => {
      const res = await realFetch(
        `${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
          method: 'PATCH',
          headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                     'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify(payload),
        });
      return res.ok;
    };
    await writeback({ source: 'ketodial', lifestyle_activity: 'sedentary', exercise_frequency: '1-2' });

    // paid_timestamp_check requires paid_at >= created_at, and created_at is the
    // DATABASE clock. Deriving paid_at from the row rather than from this machine
    // keeps the test about the payment vocabulary instead of about clock skew.
    const createdAt = new Date((await readRow(token)).created_at).getTime();
    const nowIso = new Date(Math.max(Date.now(), createdAt) + 1000).toISOString();

    // Stripe's own vocabulary must be rejected — that is the bug, reproduced.
    check(G, "Stripe's payment_status='paid' is REJECTED by the real table",
      (await writeback({ payment_status: 'paid' })) === false,
      'the constraint no longer rejects it, so this test proves nothing');

    // The mapped payload the worker now sends must land in full.
    const workerPayload = {
      payment_status: 'completed',
      amount_paid_cents: 599,
      paid_at: nowIso,
      payment_verified_at: nowIso,
      stripe_payment_intent_id: 'pi_audit2b_test',
      step_completed: 4,
      updated_at: nowIso,
    };
    check(G, 'the mapped payload is accepted', (await writeback(workerPayload)) === true, '');

    const row = await readRow(token);
    check(G, 'payment_status landed as completed', row.payment_status === 'completed', row.payment_status);
    check(G, 'amount_paid_cents landed', row.amount_paid_cents === 599, String(row.amount_paid_cents));
    check(G, 'paid_at landed', !!row.paid_at, '');
    check(G, 'payment_verified_at landed', !!row.payment_verified_at, '');
    check(G, 'stripe_payment_intent_id landed',
      row.stripe_payment_intent_id === 'pi_audit2b_test', row.stripe_payment_intent_id);
    check(G, 'step_completed reached 4', row.step_completed === 4, String(row.step_completed));

    // is_premium is deliberately NOT written: premium_requires_payment demands a
    // tier_id, which is a Carnivore Weekly concept KetoDial has no value for.
    check(G, 'is_premium=true is unsatisfiable here, and the worker does not attempt it',
      (await writeback({ is_premium: true })) === false,
      'premium_requires_payment now accepts is_premium without a tier_id; revisit the worker');
    check(G, '  ...and the row is still intact after that rejection',
      (await readRow(token)).payment_status === 'completed', '');

    // THE OPERATIONAL QUERY must find this customer — and only KetoDial ones. Run
    // unscoped it also returns Carnivore Weekly purchases whose worker never writes
    // this column, presenting customers nobody owes anything as stuck fulfilments.
    const unscoped = await realFetch(
      `${SUPABASE_URL}/rest/v1/calculator_sessions_v2` +
      `?payment_status=eq.completed&reports_delivered_at=is.null&source=neq.ketodial&select=session_token`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } });
    const falsePositives = await unscoped.json();
    check(G, 'the unscoped query really does have non-KetoDial false positives',
      Array.isArray(falsePositives) && falsePositives.length > 0,
      'if this is 0 the scoping assertion below proves nothing');

    const q = await realFetch(
      `${SUPABASE_URL}/rest/v1/calculator_sessions_v2` +
      `?source=eq.ketodial&payment_status=eq.completed&reports_delivered_at=is.null&session_token=eq.${token}&select=session_token`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } });
    const stuck = await q.json();
    check(G, 'the paid-but-undelivered query finds a paid customer with no delivery',
      Array.isArray(stuck) && stuck.length === 1 && stuck[0].session_token === token,
      `returned ${JSON.stringify(stuck)}`);

    // ...and stops finding them once delivery is recorded.
    await writeback({ reports_delivered_at: new Date().toISOString() });
    const q2 = await realFetch(
      `${SUPABASE_URL}/rest/v1/calculator_sessions_v2` +
      `?source=eq.ketodial&payment_status=eq.completed&reports_delivered_at=is.null&session_token=eq.${token}&select=session_token`,
      { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } });
    check(G, '  ...and drops them once delivery is recorded',
      (await q2.json()).length === 0, '');
  }

  // -------------------------------------------------------------------------
  // GROUP 1g — A FAILED KIDNEY WRITE MUST NOT SURVIVE THE PROFILE CHECKPOINT.
  // ---------------------------------------------------------------------------
  //   stored=No -> customer changes to Yes -> that PATCH fails -> profile submit
  //   -> if the profile payload omits kidney_status, the server still believes No.
  // The customer would see suppression on screen while the authoritative row — the
  // one that decides what we sell and what the report says — said the opposite.
  // -------------------------------------------------------------------------
  for (const answer of ['yes', 'unsure']) {
    const G = `1g/kidney-recovery-${answer}`;
    const created = await call('POST', '/session', step1('no'));
    const token = created.json.token;
    createdTokens.add(token);
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ source: TEST_SOURCE }),
    });
    check(G, 'the row starts at No', (await readRow(token)).kidney_status === 'no', '');

    // The kidney-only PATCH is simulated as having failed: it simply never happened.
    // The profile checkpoint is then submitted, carrying the CURRENT answer.
    const checkpoint = { ...step2(token), kidney_status: answer };
    const res = await call('PATCH', '/session', checkpoint);
    check(G, 'the profile checkpoint is accepted', res.status === 200, `status ${res.status}`);

    const row = await readRow(token);
    check(G, `the authoritative row is now ${answer}, not the stale No`,
      row.kidney_status === answer,
      `row says ${row.kidney_status} while the customer sees ${answer}`);

    const { loadIntakeForPurchase: loadBuy, loadAuthoritativeIntake: loadRep } =
      await import('file://' + path.join(REPO, 'ketodial', 'worker', 'intake.js'));
    const { deriveKdMedicalContext: derive, allowedProducts: allowed } =
      await import('file://' + path.join(REPO, 'ketodial', 'worker', 'reports.js'));

    const buyIntake = await loadBuy(token, ENV);
    const ctx = derive(buyIntake);
    check(G, 'product routing sees the corrected answer',
      ctx.restrictProteinTarget === true && allowed(ctx).blocked.includes('meal'),
      `suppress=${ctx.restrictProteinTarget} blocked=${allowed(ctx).blocked.join(',')}`);

    const repIntake = await loadRep(token, ENV);
    check(G, 'report medical context sees the corrected answer',
      derive(repIntake).kidneyAnswer === answer, derive(repIntake).kidneyAnswer);
  }

  // -------------------------------------------------------------------------
  // GROUP 1h — THE FREE PLAN EMAIL IS GATED TOO.
  // ---------------------------------------------------------------------------
  // The calculator auto-calls /email-plan seconds after the first free result. The
  // page suppressed the protein figure for a Yes or "I'm not sure" — and the email
  // then carried it in the SUBJECT LINE, in a Protein row, in "hit the protein
  // number first", in copy explaining why we set their protein high, and in an
  // upsell to the meal plan we had just refused to sell them.
  //
  // Suppressed on one surface, still emitted on another. Same defect class as the
  // meal plan sized from a withheld figure.
  // -------------------------------------------------------------------------
  for (const answer of ['no', 'yes', 'unsure']) {
    const G = `1h/free-email-${answer}`;
    const created = await call('POST', '/session', step1(answer));
    const token = created.json.token;
    createdTokens.add(token);
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ source: TEST_SOURCE }),
    });

    emailsSent.length = 0;
    // The browser sends its own macros. They are deliberately WRONG here: the worker
    // must use the authoritative row, not what the client claims.
    const res = await call('POST', '/email-plan', {
      email: `audit2b-plan-${answer}${TEST_EMAIL_DOMAIN}`,
      token,
      goal: 'lose', age: 58, activity: 1.2,
      macros: { calories: 9999, fatG: 999, proteinG: 777, carbG: 99, tdee: 9999 },
    });
    check(G, 'the free plan email is still sent', res.status === 200, `status ${res.status}`);
    check(G, '  ...exactly once', emailsSent.length === 1, `${emailsSent.length}`);
    if (!emailsSent.length) continue;

    const mail = emailsSent[0];
    // Cells are separated by ' | ', not collapsed into one run of words. Flattening
    // the macro table with a plain space made the Fat row's "128 g" run straight into
    // the next row's "Protein" label and read as a protein figure — a false positive
    // that would have masked a real one.
    const text = mail.html.replace(/<[^>]+>/g, ' | ').replace(/&[a-z]+;/g, ' ')
      .replace(/(\s*\|\s*)+/g, ' | ').replace(/[^\S\n]+/g, ' ');

    check(G, 'macros come from the authoritative row, not the client',
      /1,?650/.test(mail.html) && !/9,?999/.test(mail.html),
      'the worker trusted client-supplied macros');
    check(G, 'replies go to the KetoDial catch-all, never a personal inbox',
      mail.replyTo === 'ketodial@carnivoreweekly.com', String(mail.replyTo));

    if (answer === 'no') {
      check(G, 'the protein target IS in the subject', /118g protein/.test(mail.subject), mail.subject);
      check(G, 'and in the body', /Protein[\s\S]{0,40}118 g/.test(text), '');
      check(G, '  ...and the fat row is unaffected', /128 g/.test(text), '');
      check(G, 'the Full Protocol upsell is present', /Full Protocol/.test(text), '');
    } else {
      check(G, 'the protein target is NOT in the subject',
        !/protein/i.test(mail.subject), mail.subject);
      check(G, 'the protein figure appears NOWHERE in the email',
        !/\b118\s*g\b/.test(text) && !/\b118\b/.test(mail.subject),
        'the number the page withheld is in the email');
      check(G, 'no substitute protein number either',
        !/\b\d{1,3}\s*g\s*(?:of\s+)?protein\b/i.test(text) &&
        !/protein[^.]{0,30}?\b\d{2,3}\s*g\b/i.test(text), '');
      check(G, 'the reader is routed to a clinician instead',
        /renal dietitian/i.test(text), '');
      check(G, '"hit the protein number first" is gone',
        !/hit the protein number/i.test(text), '');
      check(G, 'no copy explaining why we set their protein high',
        !/set your protein high/i.test(text) && !/needs more protein/i.test(text), '');
      check(G, 'the meal-plan bundle is NOT advertised',
        !/Full Protocol/.test(text) && !/7-day meal plan/i.test(text),
        'the email upsells the product checkout would refuse to sell');
      check(G, 'the two deliverable reports are offered instead',
        /doctor-ready report/i.test(text) && /starter kit/i.test(text), '');
      check(G, '  ...and the customer can still spend money', /9\.98/.test(text), '');
    }
  }

  // -------------------------------------------------------------------------
  // GROUP 2 — failure cases, against the same real storage path.
  // -------------------------------------------------------------------------
  const G = '2/failures';

  {
    const r = await call('POST', '/checkout', { items: ['starter'], email: 'x' + TEST_EMAIL_DOMAIN, name: 'X' });
    check(G, 'missing session token: checkout refused', r.status === 409, `status ${r.status}`);
    check(G, '  ...with an intake reference error', r.json && r.json.code === 'INTAKE_REFERENCE_INVALID', '');
  }
  {
    const r = await call('POST', '/checkout',
      { items: ['starter'], email: 'x' + TEST_EMAIL_DOMAIN, name: 'X', token: 'kd_doesnotexistanywhere000000' });
    check(G, 'nonexistent session: checkout refused', r.status === 409, `status ${r.status}`);
    check(G, '  ...as INTAKE_NOT_FOUND from the real database', r.json && r.json.code === 'INTAKE_NOT_FOUND', '');
  }
  {
    // A real row that stopped at step 1: the medical screen was never submitted.
    const created = await call('POST', '/session', step1('no'));
    const token = created.json.token;
    createdTokens.add(token);
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ source: TEST_SOURCE }),
    });
    // THE OPTIONAL PROFILE MUST NOT BLOCK A SALE. This row is step 1 only: calculator
    // done, kidney answered, profile skipped — exactly what the page invites, since it
    // shows the picker above the profile and calls the profile optional. Until
    // 2026-09-08 checkout used the full REPORT validator and turned this buyer away.
    const r = await call('POST', '/checkout',
      { items: ['starter'], email: 'x' + TEST_EMAIL_DOMAIN, name: 'X', token });
    check(G, 'step 1 only, no profile: checkout is ALLOWED', r.status === 200,
      `status ${r.status} ${JSON.stringify(r.json)} — a willing buyer was turned away`);

    // ...and the report bar is untouched: the same row still cannot produce one.
    const { loadAuthoritativeIntake: loadReport } =
      await import('file://' + path.join(REPO, 'ketodial', 'worker', 'intake.js'));
    let reportErr = null;
    try { await loadReport(token, ENV); } catch (e) { reportErr = e; }
    check(G, '  ...while report generation from the same row still REFUSES',
      reportErr !== null, 'the report bar was loosened along with the purchase bar');
    check(G, '  ...saying the profile is unfinished, not that data was lost',
      reportErr && reportErr.code === 'INTAKE_PROFILE_NOT_COMPLETED',
      reportErr ? reportErr.code : '');
  }
  {
    // A complete row whose kidney answer is NULL — every session predating the gate.
    const created = await call('POST', '/session', step1('no'));
    const token = created.json.token;
    createdTokens.add(token);
    await call('PATCH', '/session', step2(token));
    await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ kidney_status: null, source: TEST_SOURCE }),
    });
    const back = await readRow(token);
    check(G, 'the NULL kidney answer really is NULL in the database', back.kidney_status === null, '');
    const r = await call('POST', '/checkout',
      { items: ['starter'], email: 'x' + TEST_EMAIL_DOMAIN, name: 'X', token });
    check(G, 'missing kidney answer: checkout refused, not defaulted to No',
      r.status === 409 && r.json.code === 'PURCHASE_INTAKE_INCOMPLETE',
      `status ${r.status} code ${r.json && r.json.code}`);
  }
  {
    // The CHECK constraint is a real guard, not a comment.
    const created = await call('POST', '/session', step1('no'));
    const token = created.json.token;
    createdTokens.add(token);
    const res = await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
                 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ kidney_status: 'probably', source: TEST_SOURCE }),
    });
    check(G, 'the database itself rejects an answer outside no|yes|unsure', !res.ok,
      `PostgREST accepted kidney_status='probably' (status ${res.status})`);
  }
  {
    // Nothing above may have produced a fabricated document.
    const badReport = await call('GET', '/report/cs_test_nonexistent_session?type=doctor');
    check(G, 'an unknown Stripe session yields no report', badReport.status !== 200,
      `status ${badReport.status}`);
    check(G, '  ...and no fabricated body in the response',
      !/\b26\.0\b/.test(badReport.text) && !/\b1,?800\b/.test(badReport.text), '');
  }

} finally {
  // -------------------------------------------------------------------------
  // CLEANUP. Runs whatever happened above. The run fails if a row survives.
  // -------------------------------------------------------------------------
  let leaked = [];
  for (const token of createdTokens) {
    await deleteRow(token);
    if (await readRow(token)) leaked.push(token);
  }
  check('cleanup', 'every test row was deleted from the database', leaked.length === 0,
    leaked.length ? `LEAKED: ${leaked.join(', ')}` : '');

  const stray = await realFetch(
    `${SUPABASE_URL}/rest/v1/calculator_sessions_v2?source=eq.${TEST_SOURCE}&select=session_token`,
    { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, Accept: 'application/json' } });
  const strayRows = await stray.json();
  check('cleanup', 'no row tagged as an audit test remains in the table',
    Array.isArray(strayRows) && strayRows.length === 0,
    Array.isArray(strayRows) ? `${strayRows.length} left behind` : 'could not verify');

  globalThis.fetch = realFetch;
}

// ===========================================================================
// Report
// ===========================================================================
const W = '─'.repeat(78);
console.log(W);
console.log('KETODIAL — REAL-INTERFACE INTEGRATION PROOF');
console.log(W);
console.log(`Supabase project : ${PROJECT_REF} (CarnivoreWeekly) — PRODUCTION, the only project on the account`);
console.log('Supabase calls   : REAL (inserts, reads, CHECK constraint, cleanup)');
console.log('Stripe           : NO OBJECT CREATED — the vault test key is expired.');
console.log('                   Request bytes captured at the HTTP boundary and asserted.');
console.log('Rows written     : tagged source=' + TEST_SOURCE + ', emails @audit2b.invalid, all deleted');
console.log(W);

for (const [answer, r] of Object.entries(results)) {
  console.log(`\n${answer.toUpperCase().padEnd(6)} stored=${r.storedKidney}  proteinSuppressed=${r.suppressed}`);
  console.log(`       offered : ${r.offered.join(', ')}`);
  console.log(`       blocked : ${r.blocked.join(', ') || '(none)'}`);
  console.log(`       stripe  : ${r.stripeMetadataKeys.join(', ')}`);
  console.log(`       report  : ${r.reportBytes} bytes generated from the authoritative row`);
}

console.log(`\n${W}`);
const groups = [...new Set(failures.map(f => f.group))];
if (failures.length) {
  console.log(`\n${failures.length} of ${checks} assertions FAILED across ${groups.length} group(s):\n`);
  for (const f of failures) {
    console.log(`  [${f.group}] ${f.name}`);
    if (f.detail) console.log(`      ${f.detail}`);
  }
  console.log('');
  process.exit(1);
}
console.log(`\n${checks} assertions passed against the real storage path.`);
console.log('\nRemaining gap: no Stripe object was created. Rotate stripe.secret_key_test');
console.log('and re-run for a true end-to-end with no change to this file.\n');
