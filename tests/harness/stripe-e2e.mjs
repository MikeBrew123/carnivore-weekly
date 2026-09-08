#!/usr/bin/env node
/**
 * tests/harness/stripe-e2e.mjs
 *
 * KetoDial Stripe TEST-MODE end-to-end harness.
 *
 *   node tests/harness/stripe-e2e.mjs --create-prices
 *   node tests/harness/stripe-e2e.mjs
 *   node tests/harness/stripe-e2e.mjs --cleanup
 *
 * See README-stripe-e2e.md in this directory for what this covers, what it cannot
 * do headlessly, and why swapping two environment variables is not sufficient.
 *
 * ---------------------------------------------------------------------------
 * IT DRIVES THE PRODUCTION CODE, NOT A COPY OF IT
 * ---------------------------------------------------------------------------
 * The worker's own `default.fetch` handler is imported and called with real Request
 * objects. Supabase is real. Stripe is real, in test mode. The only production
 * behaviour that changes is supplied through env vars that already default to the
 * production values (RETURN_URL_BASE, REPORT_BASE_URL, PRICE_MAP_JSON), so nothing
 * here required weakening the application to make a test pass.
 *
 * ---------------------------------------------------------------------------
 * SAFETY RAILS — read before running
 * ---------------------------------------------------------------------------
 *  1. Refuses to run on anything but an `sk_test_` key, and confirms the account
 *     reports `livemode:false` before touching Stripe at all.
 *  2. Supabase is PRODUCTION — there is one project on the account and no staging.
 *     Every row is tagged `source='kd-audit2b-test'` with an `@audit2b.invalid`
 *     address (a reserved TLD that cannot receive mail), and cleanup FAILS the run
 *     if any survives.
 *  3. Resend is intercepted unless --live-email is passed, and even then only
 *     @audit2b.invalid recipients are permitted.
 *  4. Only Stripe's documented test card numbers are used.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..', '..');
const WORKER = path.join(REPO, 'ketodial', 'worker', 'index.js');

const ARGS = new Set(process.argv.slice(2));
const CREATE_PRICES = ARGS.has('--create-prices');
const CLEANUP_ONLY = ARGS.has('--cleanup');
const LIVE_EMAIL = ARGS.has('--live-email');

const TEST_SOURCE = 'kd-audit2b-test';
const TEST_EMAIL_DOMAIN = '@audit2b.invalid';
const PRICE_FILE = path.join(HERE, '.test-prices.json');   // gitignored, local only

// ---------------------------------------------------------------------------
// Credentials
// ---------------------------------------------------------------------------
const SECRETS = process.env.KD_SECRETS_PATH || [
  path.join(REPO, 'secrets', 'api-keys.json'),
  path.join(REPO, '..', 'carnivore-weekly', 'secrets', 'api-keys.json'),
].find(p => fs.existsSync(p));

if (!SECRETS) die('Cannot find secrets/api-keys.json. Set KD_SECRETS_PATH.');
const creds = JSON.parse(fs.readFileSync(SECRETS, 'utf8'));

const SK = creds.stripe?.secret_key_test || '';
const PK = creds.stripe?.publishable_key_test || '';
const SUPABASE_URL = creds.supabase.url;
const SUPABASE_KEY = creds.supabase.service_role_key;

function die(msg, code = 2) { console.error(`\n  ${msg}\n`); process.exit(code); }

// RAIL 1 — test mode or nothing.
if (!SK.startsWith('sk_test_')) {
  die('Refusing to run: stripe.secret_key_test is not an sk_test_ key.\n' +
      '  This harness never uses the live key — a live Checkout Session is a\n' +
      '  production artifact. See README-stripe-e2e.md.');
}

async function stripe(pathname, params, method = 'POST') {
  const res = await fetch(`https://api.stripe.com/v1/${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${SK}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20',
    },
    body: method === 'GET' ? undefined : new URLSearchParams(params || {}).toString(),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${pathname} ${res.status}: ${JSON.stringify(json.error || json)}`);
  return json;
}

// RAIL 1b — confirm the account agrees we are in test mode.
let balance;
try {
  balance = await stripe('balance', null, 'GET');
} catch (e) {
  if (/api_key_expired|Expired API Key/i.test(e.message)) {
    die('The Stripe TEST secret key is EXPIRED, so this run cannot start.\n\n' +
        '  Only Brew can fix this: rotating an API key is a Stripe Dashboard action.\n' +
        '    1. Stripe Dashboard, Test mode ON, Developers -> API keys\n' +
        '    2. Reveal or roll the sk_test_ secret key\n' +
        '    3. Put it in secrets/api-keys.json at stripe.secret_key_test\n' +
        '       (also refresh stripe.publishable_key_test, and set last_rotated)\n\n' +
        '  Do NOT touch the live keys or any live Price object.\n' +
        '  Then:  node tests/harness/stripe-e2e.mjs --create-prices\n' +
        '  Full detail: tests/harness/README-stripe-e2e.md');
  }
  die(`Stripe rejected the test key: ${e.message}`);
}
if (balance.livemode !== false) {
  die(`Refusing to run: Stripe reports livemode=${balance.livemode}. Expected false.`);
}
console.log('Stripe mode confirmed: TEST (livemode=false)');

// ---------------------------------------------------------------------------
// TEST-mode products and prices
// ---------------------------------------------------------------------------
const CATALOGUE = [
  { key: 'doctor',     name: "KetoDial Doctor's Report (TEST)", cents: 599 },
  { key: 'meal',       name: 'KetoDial 7-Day Meal Plan (TEST)', cents: 599 },
  { key: 'starter',    name: 'KetoDial Starter Kit (TEST)',     cents: 399 },
  { key: 'essentials', name: 'KetoDial Essentials Bundle (TEST)', cents: 799 },
  { key: 'protocol',   name: 'KetoDial Full Protocol (TEST)',   cents: 1099 },
];

async function createPrices() {
  const map = {};
  for (const item of CATALOGUE) {
    const product = await stripe('products', { name: item.name, 'metadata[audit]': 'audit2b' });
    const price = await stripe('prices', {
      product: product.id, unit_amount: String(item.cents), currency: 'usd',
      'metadata[audit]': 'audit2b',
    });
    map[item.key] = price.id;
    console.log(`  ${item.key.padEnd(11)} ${price.id}  $${(item.cents / 100).toFixed(2)}  product ${product.id}`);
  }
  fs.writeFileSync(PRICE_FILE, JSON.stringify(map, null, 2));
  console.log(`\nWrote ${PRICE_FILE}. These are TEST-mode objects; live prices are untouched.`);
  return map;
}

async function cleanupPrices() {
  if (!fs.existsSync(PRICE_FILE)) { console.log('No test prices recorded; nothing to archive.'); return; }
  const map = JSON.parse(fs.readFileSync(PRICE_FILE, 'utf8'));
  for (const [key, priceId] of Object.entries(map)) {
    try {
      const price = await stripe(`prices/${priceId}`, null, 'GET');
      await stripe(`prices/${priceId}`, { active: 'false' });
      await stripe(`products/${price.product}`, { active: 'false' });
      console.log(`  archived ${key}: ${priceId}`);
    } catch (e) { console.error(`  could not archive ${key}: ${e.message}`); }
  }
  fs.unlinkSync(PRICE_FILE);
}

if (CREATE_PRICES) { await createPrices(); process.exit(0); }

// ---------------------------------------------------------------------------
// Supabase helpers — real database, marked rows, guaranteed cleanup
// ---------------------------------------------------------------------------
const SB = {
  apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json', Accept: 'application/json',
};
const createdTokens = new Set();

async function readRow(token) {
  const res = await realFetch(
    `${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${encodeURIComponent(token)}&limit=1`,
    { headers: SB });
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}
async function tagRow(token) {
  await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`, {
    method: 'PATCH', headers: { ...SB, Prefer: 'return=minimal' },
    body: JSON.stringify({ source: TEST_SOURCE }),
  });
}
async function deleteRow(token) {
  await realFetch(`${SUPABASE_URL}/rest/v1/calculator_sessions_v2?session_token=eq.${token}`,
    { method: 'DELETE', headers: SB });
}

async function cleanupRows() {
  const leaked = [];
  for (const t of createdTokens) { await deleteRow(t); if (await readRow(t)) leaked.push(t); }
  const stray = await realFetch(
    `${SUPABASE_URL}/rest/v1/calculator_sessions_v2?source=eq.${TEST_SOURCE}&select=session_token`,
    { headers: SB });
  const rows = await stray.json();
  return { leaked, stray: Array.isArray(rows) ? rows.length : -1 };
}

if (CLEANUP_ONLY) {
  await cleanupPrices();
  const c = await cleanupRows();
  console.log(`Rows: ${c.leaked.length} leaked, ${c.stray} tagged remaining.`);
  process.exit(c.leaked.length === 0 && c.stray === 0 ? 0 : 1);
}

// ---------------------------------------------------------------------------
// Resend interception — RAIL 3
// ---------------------------------------------------------------------------
const realFetch = globalThis.fetch;
const emails = [];
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.resend.com')) {
    const b = opts.body ? JSON.parse(opts.body) : {};
    const key = opts.headers?.['Idempotency-Key'] || null;
    emails.push({ to: b.to, subject: b.subject, html: b.html || '', replyTo: b.reply_to, idempotencyKey: key });
    const recipients = [].concat(b.to || []);
    if (LIVE_EMAIL && recipients.every(r => String(r).endsWith(TEST_EMAIL_DOMAIN))) {
      return realFetch(url, opts);
    }
    if (LIVE_EMAIL) throw new Error(`Refusing --live-email to a non-test address: ${recipients.join(',')}`);
    return { ok: true, json: async () => ({ id: 'intercepted_no_send' }) };
  }
  return realFetch(url, opts);
};

// ---------------------------------------------------------------------------
// The worker, with production defaults overridden ONLY for the test surfaces
// ---------------------------------------------------------------------------
if (!fs.existsSync(PRICE_FILE)) {
  die('No TEST prices yet. Run:  node tests/harness/stripe-e2e.mjs --create-prices');
}
const PRICE_MAP = JSON.parse(fs.readFileSync(PRICE_FILE, 'utf8'));
const HARNESS_PORT = Number(process.env.KD_HARNESS_PORT || 8797);

const ENV = {
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
  STRIPE_SECRET_KEY: SK,
  STRIPE_WEBHOOK_SECRET: creds.stripe?.webhook_secret || '',
  RESEND_API_KEY: creds.resend?.key || 'intercepted',
  PRICE_MAP_JSON: JSON.stringify(PRICE_MAP),
  // Both default to production when unset — see GROUP R.
  RETURN_URL_BASE: `http://localhost:${HARNESS_PORT}`,
  REPORT_BASE_URL: `http://localhost:${HARNESS_PORT}/api`,
};

const worker = (await import('file://' + WORKER)).default;
const req = (m, p, b) => new Request('https://ketodial-api.test' + p, {
  method: m, headers: { 'Content-Type': 'application/json' },
  body: b === undefined ? undefined : JSON.stringify(b),
});
const call = async (m, p, b) => {
  const res = await worker.fetch(req(m, p, b), ENV);
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, json, text };
};

let checks = 0; const failures = [];
const check = (g, name, ok, detail = '') => { checks++; if (!ok) failures.push({ g, name, detail }); };

const step1 = (kidney, email) => ({
  sex: 'female', age: 58, goal: 'lose', lifestyle_activity: 'sedentary',
  height_cm: 165, weight_value: 194, weight_unit: 'lbs',
  email, newsletter_opt_in: false, kidney_status: kidney,
  macros: { calories: 1650, fatG: 128, proteinG: 118, carbG: 22, tdee: 2060 },
  device_type: 'desktop', utm_source: TEST_SOURCE,
});
const step2 = (token) => ({
  token, step_completed: 2, first_name: 'Linda',
  conditions: ['t2d'], symptoms: ['energy'], medications: 'Metformin 1000mg',
  dairy_tolerance: 'some', cooking_skill: 'beginner', meal_prep_time: 'some',
  family_situation: 'solo', budget: 'moderate', biggest_challenge: '', previous_diets: [],
});

/**
 * Move a real TEST Checkout Session to paid.
 *
 * Embedded checkout is an iframe on js.stripe.com and cannot be driven from our
 * page, so the documented test card is confirmed through Stripe's own API instead.
 * The Checkout Session, the PaymentIntent and the resulting `payment_status` are all
 * genuine test-mode objects — only the card ENTRY is API-driven. Stated in the
 * README rather than papered over.
 */
async function payTestSession(sessionId) {
  const session = await stripe(`checkout/sessions/${sessionId}`, null, 'GET');
  const pm = await stripe('payment_methods', {
    type: 'card', 'card[token]': 'tok_visa',        // Stripe's documented test token
  });
  await stripe(`payment_intents/${session.payment_intent}/confirm`, {
    payment_method: pm.id, return_url: `http://localhost:${HARNESS_PORT}/done`,
  });
  return stripe(`checkout/sessions/${sessionId}`, null, 'GET');
}

console.log('\nHarness ready. Runs: A(no) B(yes) C(unsure) D(pay-first).');
console.log(`Return URL base: ${ENV.RETURN_URL_BASE}   Report base: ${ENV.REPORT_BASE_URL}`);
console.log(`Publishable key for the browser page: ${PK.slice(0, 12)}…\n`);

// The run matrix lives here; each case is small because the worker does the work.
const RUNS = [
  { id: 'A', kidney: 'no',     items: ['protocol'],           expectCents: 1099 },
  { id: 'B', kidney: 'yes',    items: ['doctor', 'starter'],  expectCents: 998 },
  { id: 'C', kidney: 'unsure', items: ['doctor', 'starter'],  expectCents: 998 },
];

try {
  for (const run of RUNS) {
    const G = `${run.id}/${run.kidney}`;
    const email = `audit2b-${run.id.toLowerCase()}${TEST_EMAIL_DOMAIN}`;
    const created = await call('POST', '/session', step1(run.kidney, email));
    const token = created.json?.token;
    check(G, 'session created', created.status === 200 && !!token, `status ${created.status}`);
    if (!token) continue;
    createdTokens.add(token); await tagRow(token);
    await call('PATCH', '/session', step2(token));

    const buy = await call('POST', '/checkout', { items: run.items, email, name: 'Linda', token });
    check(G, 'checkout accepted', buy.status === 200, `status ${buy.status} ${JSON.stringify(buy.json)}`);
    const csid = buy.json?.sessionId;
    if (!csid) continue;

    const s = await stripe(`checkout/sessions/${csid}`, null, 'GET');
    check(G, 'Checkout Session is TEST mode', s.livemode === false, `livemode=${s.livemode}`);
    check(G, 'amount is correct', s.amount_total === run.expectCents,
      `${s.amount_total} vs ${run.expectCents}`);
    check(G, 'metadata carries session_token', s.metadata?.session_token === token, '');
    check(G, 'metadata carries NO form_data', !('form_data' in (s.metadata || {})),
      `keys: ${Object.keys(s.metadata || {}).join(',')}`);
    check(G, 'return URL points at the harness, not production',
      String(s.return_url || '').startsWith(ENV.RETURN_URL_BASE), s.return_url);

    const paid = await payTestSession(csid);
    check(G, 'Stripe reports the session paid', paid.payment_status === 'paid', paid.payment_status);

    emails.length = 0;
    const fulfil = await call('POST', '/fulfill', { stripe_session_id: csid });
    check(G, 'fulfilment succeeded', fulfil.status === 200, `status ${fulfil.status} ${fulfil.text.slice(0,200)}`);
    check(G, 'one report email', emails.length === 1, `${emails.length}`);
    check(G, 'idempotency key is deterministic',
      emails[0]?.idempotencyKey === `kd-report/${csid}`, emails[0]?.idempotencyKey);

    const row = await readRow(token);
    check(G, 'delivery marker written', !!row?.reports_delivered_at, '');

    const status = await call('GET', `/purchase/${csid}`);
    const expected = run.items.includes('protocol') ? ['doctor','meal','starter'] : run.items;
    check(G, 'success page shows exactly what was bought',
      JSON.stringify((status.json?.purchased || []).sort()) === JSON.stringify(expected.sort()),
      JSON.stringify(status.json?.purchased));

    const doc = await call('GET', `/report/${csid}?type=doctor`);
    const text = (doc.text || '').replace(/<[^>]+>/g, ' | ').replace(/\s+/g, ' ');
    check(G, 'report uses the authoritative body (BMI 32.3)', /32\.3/.test(text), '');
    check(G, 'no substituted defaults', !/\b26\.0\b/.test(text) && !/\b1,?800\b/.test(text), '');
    if (run.kidney === 'no') {
      check(G, 'protein target present', /118/.test(text), '');
    } else {
      check(G, 'no protein target anywhere', !/\b118\b/.test(text), '');
      check(G, 'routed to a clinician', /renal dietitian/i.test(text), '');
      if (run.kidney === 'unsure') {
        check(G, 'unsure is not rendered as a diagnosis',
          !/told us about kidney disease/i.test(text), '');
      }
    }
  }

  // D — pay first, finish the profile afterwards.
  {
    const G = 'D/pay-first';
    const email = `audit2b-d${TEST_EMAIL_DOMAIN}`;
    const created = await call('POST', '/session', step1('no', email));
    const token = created.json?.token;
    if (token) {
      createdTokens.add(token); await tagRow(token);
      const buy = await call('POST', '/checkout', { items: ['doctor'], email, name: 'Linda', token });
      const csid = buy.json?.sessionId;
      check(G, 'can buy before the optional profile', buy.status === 200, `status ${buy.status}`);
      if (csid) {
        await payTestSession(csid);
        const early = await call('POST', '/fulfill', { stripe_session_id: csid });
        check(G, 'fulfilment refused while the profile is unfinished', early.status === 409, `${early.status}`);

        const late = await call('PATCH', '/session', { ...step2(token), token: undefined, stripe_session_id: csid });
        check(G, 'profile attaches via the Stripe session id, no token', late.status === 200, `${late.status}`);
        check(G, 'and lands on the original row', (await readRow(token))?.step_completed >= 2, '');

        emails.length = 0;
        const done = await call('POST', '/fulfill', { stripe_session_id: csid });
        check(G, 'fulfilment now succeeds', done.status === 200, `${done.status}`);
        check(G, 'exactly one email', emails.length === 1, `${emails.length}`);

        emails.length = 0;
        const again = await call('POST', '/fulfill', { stripe_session_id: csid });
        check(G, 'repeat is idempotent', again.json?.alreadyDelivered === true, '');
        check(G, 'and sends no second email', emails.length === 0, `${emails.length}`);
      }
    }
  }

  // Failure matrix, against real Stripe test objects.
  {
    const G = 'F/failures';
    const unknown = await call('POST', '/fulfill', { stripe_session_id: 'cs_test_does_not_exist_at_all' });
    check(G, 'unknown checkout session rejected', unknown.status >= 400, `${unknown.status}`);

    const open = await call('POST', '/session', step1('no', `audit2b-f${TEST_EMAIL_DOMAIN}`));
    const t = open.json?.token;
    if (t) {
      createdTokens.add(t); await tagRow(t);
      await call('PATCH', '/session', step2(t));
      const buy = await call('POST', '/checkout', { items: ['doctor'], email: `audit2b-f${TEST_EMAIL_DOMAIN}`, name: 'L', token: t });
      const unpaidId = buy.json?.sessionId;   // deliberately NOT paid
      const write = await call('PATCH', '/session', { stripe_session_id: unpaidId, step_completed: 2, conditions: [], medications: '' });
      check(G, 'an UNPAID session cannot unlock a post-payment write', write.status >= 400, `${write.status}`);
      const rep = await call('GET', `/report/${unpaidId}?type=doctor`);
      check(G, 'and cannot produce a report', rep.status >= 400, `${rep.status}`);
    }
  }
} finally {
  const c = await cleanupRows();
  check('cleanup', 'every test row deleted', c.leaked.length === 0, c.leaked.join(','));
  check('cleanup', 'no tagged rows remain', c.stray === 0, String(c.stray));
  globalThis.fetch = realFetch;
}

const W = '─'.repeat(78);
console.log(W);
console.log(`Stripe: TEST (livemode=false)   Emails intercepted: ${LIVE_EMAIL ? 'no (--live-email)' : 'yes'}`);
if (failures.length) {
  console.log(`\n${failures.length} of ${checks} assertions FAILED:\n`);
  for (const f of failures) { console.log(`  [${f.g}] ${f.name}`); if (f.detail) console.log(`      ${f.detail}`); }
  process.exit(1);
}
console.log(`\n${checks} assertions passed against real Stripe TEST objects.\n`);
console.log('Remember: node tests/harness/stripe-e2e.mjs --cleanup\n');
