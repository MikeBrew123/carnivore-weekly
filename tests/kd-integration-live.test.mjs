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
  RESEND_API_KEY: '',
};

// ---------------------------------------------------------------------------
// The Stripe boundary. Supabase is NOT intercepted — those calls go to the real
// database. Only api.stripe.com is captured.
// ---------------------------------------------------------------------------
const realFetch = globalThis.fetch;
const stripeCalls = [];
const fakeSessions = new Map();

globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
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
    const r = await call('POST', '/checkout',
      { items: ['starter'], email: 'x' + TEST_EMAIL_DOMAIN, name: 'X', token });
    check(G, 'incomplete authoritative row: checkout refused', r.status === 409, `status ${r.status}`);
    check(G, '  ...as INTAKE_INCOMPLETE', r.json && r.json.code === 'INTAKE_INCOMPLETE', '');
    check(G, '  ...and no report can be produced from it either',
      (await (async () => {
        const { loadAuthoritativeIntake } = await import('file://' + path.join(REPO, 'ketodial', 'worker', 'intake.js'));
        try { await loadAuthoritativeIntake(token, ENV); return false; } catch { return true; }
      })()), '');
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
      r.status === 409 && r.json.code === 'INTAKE_INCOMPLETE', `status ${r.status}`);
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
