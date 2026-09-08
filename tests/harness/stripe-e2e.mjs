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
// Run A's webhook leg via Stripe CLI instead of a harness-signed replay. The
// synthetic HMAC is right for deterministic replay/malformed/multi-signature tests,
// but it only proves OUR verifier against OUR signature. This proves Stripe's actual
// event envelope and signing format traverse the worker.
const STRIPE_CLI = ARGS.has('--stripe-cli');
const CLI_SECRET = process.env.KD_STRIPE_CLI_SECRET || '';

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
// The publishable key cannot create a live charge on its own — the Session is made
// with the test secret — but a stale or mistyped pk turns into a confusing Stripe.js
// mode-mismatch inside the iframe, several minutes into a manual run. Fail here instead.
if (!PK.startsWith('pk_test_')) {
  die('Refusing to run: stripe.publishable_key_test is not a pk_test_ key.\n' +
      `  Got: ${PK ? PK.slice(0, 8) + '…' : '(empty)'}\n` +
      '  The /pay page would mount Embedded Checkout in the wrong mode and fail\n' +
      '  with a message that does not name this as the cause.');
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
// clientSecret per Checkout Session, so /pay/<id> can mount embedded Checkout.
// The shipped calculator cannot do this for us: its embedded Checkout only mounts
// inside startCheckout() after ITS OWN /checkout call returns a clientSecret, and it
// recognises only ?session_id and ?finish in the URL — never a ?cs the harness made.
// Pointing a customer at ?cs=… would have shown a page with nothing to pay.
const clientSecrets = new Map();

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
// A harness-specific signing secret. The production webhook secret is deliberately
// NOT used: this process must not hold it, and the events below are ours, not Stripe's.
const HARNESS_WEBHOOK_SECRET = 'whsec_kd_audit2b_harness_only_not_production';

// With --stripe-cli the worker must verify against the secret `stripe listen`
// printed, because those events are signed by Stripe, not by us.
if (STRIPE_CLI && !/^whsec_/.test(CLI_SECRET)) {
  die('--stripe-cli needs the signing secret from Stripe CLI.\n\n' +
      '  In another terminal:\n' +
      `    stripe listen --forward-to localhost:${HARNESS_PORT}/api/webhook\n\n` +
      '  It prints:  Ready! Your webhook signing secret is whsec_…\n' +
      '  Then:\n' +
      `    KD_STRIPE_CLI_SECRET=whsec_… node tests/harness/stripe-e2e.mjs --stripe-cli`);
}
const WEBHOOK_SECRET = STRIPE_CLI ? CLI_SECRET : HARNESS_WEBHOOK_SECRET;

const ENV = {
  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: SUPABASE_KEY,
  STRIPE_SECRET_KEY: SK,
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
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
 * Wait for a Checkout Session to be completed BY STRIPE.
 *
 * There is no API shortcut here, and the previous version of this file was wrong to
 * try one. It retrieved the Session's PaymentIntent and confirmed it directly —
 * Stripe's Checkout API explicitly states that a PaymentIntent belonging to a
 * Checkout Session cannot be confirmed or cancelled that way. Any other API trick
 * that merely makes `payment_status` LOOK paid would be worse: it would prove
 * nothing about the path a real customer takes.
 *
 * So the session is completed the way Stripe intends — in the embedded Checkout UI,
 * with a test card — and this polls until Stripe says so. That single card entry is
 * the one manual action in the whole run; everything after it is automated.
 */
async function awaitCheckoutCompletion(sessionId, { timeoutMs = 300000 } = {}) {
  const started = Date.now();
  let lastStatus = null;
  console.log(`\n  Complete this Checkout Session in the browser (test card 4242 4242 4242 4242,`);
  console.log(`  any future expiry, any CVC, any postcode):`);
  console.log(`     http://localhost:${HARNESS_PORT}/pay/${sessionId}\n`);
  while (Date.now() - started < timeoutMs) {
    const s = await stripe(`checkout/sessions/${sessionId}`, null, 'GET');
    if (s.status !== lastStatus || s.payment_status !== lastStatus) {
      process.stdout.write(`\r  waiting… status=${s.status} payment_status=${s.payment_status}   `);
      lastStatus = s.payment_status;
    }
    if (s.status === 'complete' && s.payment_status === 'paid') { console.log('\n  completed.'); return s; }
    if (s.status === 'expired') throw new Error(`Checkout Session ${sessionId} expired before completion.`);
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error(`Timed out waiting for ${sessionId}. Was the card entered?`);
}

/**
 * Replay Stripe's event to OUR webhook, signed with the harness secret.
 *
 * The harness must exercise `/webhook`, not skip it by calling `/fulfill` directly —
 * the webhook is where the payment writeback and the immediate-vs-finish-profile
 * decision live, and it was the least-tested code in the product. The event body is
 * the real Checkout Session Stripe just produced; the signature is ours, because a
 * local harness cannot possess Stripe's production signing secret and must not try.
 *
 * With Stripe CLI available, `stripe listen --forward-to localhost:PORT/webhook`
 * delivers genuinely Stripe-signed events instead; see the README.
 */
/**
 * Wait for Stripe CLI to forward the real event into the worker.
 *
 * There is nothing to assert on the response — the CLI holds it. The evidence that
 * the event arrived AND verified is the side effect only the paid path produces:
 * the payment writeback. If the signature had failed the worker would have returned
 * 400 and this row would never change.
 */
async function awaitForwardedWebhook(token, { timeoutMs = 120000 } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const row = await readRow(token);
    if (row?.payment_status === 'completed') return row;
    process.stdout.write('\r  waiting for the Stripe CLI to forward the event…   ');
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timed out waiting for a Stripe-CLI-forwarded event. Is `stripe listen` running, ' +
                  'and is KD_STRIPE_CLI_SECRET the secret it printed?');
}

async function deliverWebhook(session, type = 'checkout.session.completed') {
  const body = JSON.stringify({ type, data: { object: session } });
  const t = Math.floor(Date.now() / 1000);
  const { createHmac } = await import('node:crypto');
  const v1 = createHmac('sha256', HARNESS_WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
  const res = await worker.fetch(new Request('https://ketodial-api.test/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': `t=${t},v1=${v1}` },
    body,
  }), ENV);
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* */ }
  return { status: res.status, json, text };
}

// ---------------------------------------------------------------------------
// THE BROWSER LEG — a real server, a patched calculator, the TEST publishable key
// ---------------------------------------------------------------------------
// The README used to promise this and the script did not do it: nothing listened on
// the port, the calculator was never served, Stripe.js was never initialised with
// pk_test, and RETURN_URL_BASE pointed at a localhost that did not exist. Promising
// a browser harness and shipping an API harness is the same class of overclaim this
// audit keeps finding, so it is either real or renamed. It is real now.
//
// ketodial/public/ is NEVER modified. The two production constants are rewritten in
// a copy held in memory and served from here.
import http from 'node:http';

const PUBLIC_DIR = path.join(REPO, 'ketodial', 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml',
  '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };

function patchedCalculatorJs() {
  const src = fs.readFileSync(path.join(PUBLIC_DIR, 'ketodial.js'), 'utf8');
  const patched = src
    .replace(/var API_BASE='[^']*'/, `var API_BASE='http://localhost:${HARNESS_PORT}/api'`)
    .replace(/var STRIPE_PK='[^']*'/, `var STRIPE_PK='${PK}'`);
  if (patched === src) throw new Error('Could not patch API_BASE / STRIPE_PK — the constants moved.');
  if (!patched.includes(PK)) throw new Error('TEST publishable key did not land in the served bundle.');
  return patched;
}

const harnessServer = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${HARNESS_PORT}`);

  // Proxy the worker so the browser talks to THIS process, not production.
  if (url.pathname.startsWith('/api/')) {
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined :
      await new Promise(r => { let b = ''; req.on('data', c => b += c); req.on('end', () => r(b)); });
    // FORWARD THE INCOMING HEADERS. This used to hardcode Content-Type and drop
    // everything else — which would have silently stripped `stripe-signature` from
    // any event Stripe CLI forwarded here, so every real Stripe event would have
    // been rejected as unsigned and the CLI leg would have "failed" for a reason
    // that has nothing to do with the worker.
    const fwd = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (['host', 'connection', 'content-length'].includes(k.toLowerCase())) continue;
      fwd.set(k, Array.isArray(v) ? v.join(',') : String(v));
    }
    if (!fwd.has('content-type')) fwd.set('content-type', 'application/json');
    const wres = await worker.fetch(new Request(
      'https://ketodial-api.test' + url.pathname.replace(/^\/api/, '') + url.search,
      { method: req.method, headers: fwd, body }), ENV);
    const text = await wres.text();
    res.writeHead(wres.status, {
      'Content-Type': wres.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    return res.end(text);
  }

  // The manual card-entry page. Mounts Stripe's embedded Checkout with pk_test and
  // the clientSecret of a Session this harness created — the one thing the shipped
  // calculator cannot be asked to do for a session it did not create itself.
  if (url.pathname.startsWith('/pay/')) {
    const csid = decodeURIComponent(url.pathname.slice('/pay/'.length));
    const secret = clientSecrets.get(csid);
    if (!secret) { res.writeHead(404); return res.end('Unknown checkout session for this harness run.'); }
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    return res.end(`<!doctype html><meta charset="utf-8">
<title>KetoDial harness — complete test payment</title>
<style>body{font:15px/1.6 system-ui,sans-serif;margin:0;background:#0b1620;color:#e2eef7}
.wrap{max-width:620px;margin:5vh auto;padding:0 20px}
.note{background:rgba(56,189,248,.08);border-left:3px solid #38bdf8;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px}
code{background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px}</style>
<div class="wrap">
  <h1>Complete the TEST payment</h1>
  <div class="note">Stripe <b>TEST</b> mode. Card <code>4242 4242 4242 4242</code>, any future
  expiry, any CVC, any postcode. No money moves. Session <code>${csid}</code>.</div>
  <div id="checkout"></div>
</div>
<script src="https://js.stripe.com/v3/"></script>
<script>
  Stripe(${JSON.stringify(PK)})
    .initEmbeddedCheckout({ clientSecret: ${JSON.stringify(secret)} })
    .then(c => c.mount('#checkout'))
    .catch(e => { document.getElementById('checkout').textContent = 'Could not mount Checkout: ' + e.message; });
</script>`);
  }

  if (url.pathname === '/ketodial.js') {
    res.writeHead(200, { 'Content-Type': MIME['.js'] });
    return res.end(patchedCalculatorJs());
  }

  const rel = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  const file = path.join(PUBLIC_DIR, rel);
  if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('not found');
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

await new Promise(r => harnessServer.listen(HARNESS_PORT, r));
console.log(`Harness server on http://localhost:${HARNESS_PORT}`);
if (STRIPE_CLI) {
  console.log(`  webhook     -> Stripe CLI, verified against the secret it printed`);
} else {
  console.log(`  webhook     -> harness-signed replay (add --stripe-cli for the real envelope)`);
}
console.log(`  calculator  -> patched copy of ketodial/public (API_BASE + pk_test rewritten in memory)`);
console.log(`  /api/*      -> this process's worker, with TEST prices and TEST return URL`);

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
    if (buy.json?.clientSecret) clientSecrets.set(csid, buy.json.clientSecret);
    check(G, 'a clientSecret came back, so the harness can mount Checkout',
      !!buy.json?.clientSecret, 'no clientSecret — the manual pay page cannot render');

    const s = await stripe(`checkout/sessions/${csid}`, null, 'GET');
    check(G, 'Checkout Session is TEST mode', s.livemode === false, `livemode=${s.livemode}`);
    check(G, 'amount is correct', s.amount_total === run.expectCents,
      `${s.amount_total} vs ${run.expectCents}`);
    check(G, 'metadata carries session_token', s.metadata?.session_token === token, '');
    check(G, 'metadata carries NO form_data', !('form_data' in (s.metadata || {})),
      `keys: ${Object.keys(s.metadata || {}).join(',')}`);
    check(G, 'return URL points at the harness, not production',
      String(s.return_url || '').startsWith(ENV.RETURN_URL_BASE), s.return_url);

    // Completed by Stripe, in the browser, with a test card. No API shortcut.
    const paid = await awaitCheckoutCompletion(csid);
    check(G, 'Stripe reports the session paid', paid.payment_status === 'paid', paid.payment_status);
    check(G, 'and the session is complete', paid.status === 'complete', paid.status);

    // THE WEBHOOK IS THE PATH UNDER TEST, not /fulfill.
    emails.length = 0;
    const useCli = STRIPE_CLI && run.id === 'A';
    if (useCli) {
      // Stripe signed this one, not us. Nothing to inspect in the response — the CLI
      // holds it — so the evidence is the writeback only the paid path performs.
      console.log('\n  Expecting Stripe CLI to forward checkout.session.completed…');
      const row = await awaitForwardedWebhook(token);
      console.log('\n  forwarded and verified.');
      check(G, "a genuinely Stripe-signed event traversed the worker and was ACCEPTED",
        row?.payment_status === 'completed',
        'the real Stripe envelope did not verify against our implementation');
    } else {
      const hook = await deliverWebhook(paid);
      check(G, '/webhook accepted the signed event', hook.status === 200,
        `status ${hook.status} ${hook.text.slice(0, 200)}`);
      check(G, '  ...and did not report awaiting_payment', hook.json?.awaiting_payment !== true, '');
    }

    // Payment writeback, through the webhook.
    const row = await readRow(token);
    check(G, 'payment_status became completed', row?.payment_status === 'completed', row?.payment_status);
    check(G, 'amount_paid_cents landed', row?.amount_paid_cents === run.expectCents,
      `${row?.amount_paid_cents}`);
    check(G, 'paid_at landed', !!row?.paid_at, '');
    check(G, 'payment_verified_at landed', !!row?.payment_verified_at, '');
    check(G, 'stripe_payment_intent_id landed', !!row?.stripe_payment_intent_id, '');

    check(G, 'the webhook delivered one report email', emails.length === 1, `${emails.length}`);
    check(G, 'with the deterministic idempotency key',
      emails[0]?.idempotencyKey === `kd-report/${csid}`, emails[0]?.idempotencyKey);
    check(G, 'delivery marker written only after acceptance', !!row?.reports_delivered_at, '');

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
      if (csid && buy.json?.clientSecret) clientSecrets.set(csid, buy.json.clientSecret);
      check(G, 'can buy before the optional profile', buy.status === 200, `status ${buy.status}`);
      if (csid) {
        const paid = await awaitCheckoutCompletion(csid);
        emails.length = 0;
        const hook = await deliverWebhook(paid);
        check(G, '/webhook accepted the signed event', hook.status === 200, `${hook.status}`);
        check(G, 'the webhook saw an unfinished profile', hook.json?.awaiting_profile === true,
          JSON.stringify(hook.json));
        check(G, 'and sent the finish-profile reminder, not silence',
          emails.length === 1 && /finish your/i.test(emails[0]?.subject || ''),
          `${emails.length} email(s): ${emails[0]?.subject}`);
        check(G, '  ...with its own deterministic key',
          emails[0]?.idempotencyKey === `kd-finish/${csid}`, emails[0]?.idempotencyKey);
        check(G, 'no false delivery marker was written',
          (await readRow(token))?.reports_delivered_at == null, '');
        check(G, 'but the payment WAS written back',
          (await readRow(token))?.payment_status === 'completed', '');

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
  await new Promise(r => harnessServer.close(r));
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
