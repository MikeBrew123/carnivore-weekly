#!/usr/bin/env node
// KetoDial worker: the Etsy print-card promo (?promo=ETSY25) on POST /checkout.
// Drives the worker's real fetch handler with global fetch stubbed: the Supabase
// intake read is answered with a fixture row and the Stripe session create is
// CAPTURED, never sent. Nothing leaves the process.
// Run: node tests/kd-etsy-promo-worker.test.mjs
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKER = path.join(REPO, 'ketodial/worker/index.js');
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + extra}`); if (!ok) failed++; };

const ETSY25_ID = 'promo_1UG2yPEVDfkpGz8wt2rbVih6';
const TOKEN = 'kd_promoTest0123456789';
const ROW = {
  session_token: TOKEN, step_completed: 1, email: 'promo-test@example.com',
  sex: 'female', age: 52, height_cm: 165, weight_value: 80, weight_unit: 'kg', goal: 'lose',
  lifestyle_activity: 'light', kidney_status: 'no',
  calculated_macros: { calories: 1700, fatG: 125, proteinG: 110, carbG: 25, tdee: 2100 },
};
const ENV = { SUPABASE_URL: 'https://supabase.stub.invalid', SUPABASE_SERVICE_ROLE_KEY: 'stub', STRIPE_SECRET_KEY: 'sk_test_stub' };

const mod = await import(pathToFileURL(WORKER).href);
const realFetch = globalThis.fetch;

async function checkout(body) {
  let stripeBody = null;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.startsWith('https://supabase.stub.invalid/rest/v1/calculator_sessions_v2')) {
      return new Response(JSON.stringify([ROW]), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (u === 'https://api.stripe.com/v1/checkout/sessions') {
      stripeBody = opts.body;
      return new Response(JSON.stringify({ id: 'cs_test_stub', client_secret: 'cs_test_stub_secret' }), { status: 200 });
    }
    throw new Error('unexpected network call ' + u);
  };
  try {
    const res = await mod.default.fetch(new Request('https://w.test/checkout', {
      method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
    }), ENV);
    return { status: res.status, json: await res.json(), stripeBody, params: stripeBody ? [...new URLSearchParams(stripeBody)] : [] };
  } finally { globalThis.fetch = realFetch; }
}
const get = (r, k) => r.params.filter(([key]) => key === k).map(([, v]) => v);
const base = { email: 'promo-test@example.com', name: 'Test', token: TOKEN };

// Captured from the worker BEFORE the promo change (2026-11-23), items ['protocol'],
// no promo. A no-promo checkout must still send exactly this, byte for byte.
const BASELINE_NO_PROMO = 'mode=payment&ui_mode=embedded&return_url=https%3A%2F%2Fketodial.com%2F%3Fsuccess%3Dtrue%26session_id%3D%7BCHECKOUT_SESSION_ID%7D&allow_promotion_codes=true&line_items%5B0%5D%5Bprice%5D=price_1Tcvd0EVDfkpGz8wCtiZSJT6&line_items%5B0%5D%5Bquantity%5D=1&customer_email=promo-test%40example.com&metadata%5Bcustomer_name%5D=Test&metadata%5Bitems%5D=protocol&metadata%5Bsession_token%5D=kd_promoTest0123456789';

if (process.argv.includes('--baseline')) {
  const r = await checkout({ ...base, items: ['protocol'] });
  console.log(r.status, r.stripeBody);
  process.exit(0);
}

// W1: allowlisted promo + the Full Protocol -> the discount is pre-applied.
{
  const r = await checkout({ ...base, items: ['protocol'], promo: 'ETSY25' });
  check('W1a. 200 with a client secret', r.status === 200 && r.json.clientSecret === 'cs_test_stub_secret', JSON.stringify(r.json));
  check('W1b. discounts[0][promotion_code] is the ETSY25 promotion code id',
    get(r, 'discounts[0][promotion_code]').join() === ETSY25_ID, r.stripeBody);
  check('W1c. allow_promotion_codes is NOT sent (Stripe rejects both together)',
    get(r, 'allow_promotion_codes').length === 0, r.stripeBody);
  check('W1d. metadata[promo]=ETSY25 and metadata[acq]=etsy',
    get(r, 'metadata[promo]').join() === 'ETSY25' && get(r, 'metadata[acq]').join() === 'etsy', r.stripeBody);
  check('W1e. price, line items and session token unchanged',
    get(r, 'line_items[0][price]').join() === 'price_1Tcvd0EVDfkpGz8wCtiZSJT6' &&
    get(r, 'metadata[session_token]').join() === TOKEN && get(r, 'metadata[items]').join() === 'protocol', r.stripeBody);
  // Lower-case from a hand-typed URL is the same code.
  const lc = await checkout({ ...base, items: ['protocol'], promo: 'etsy25' });
  check('W1f. lower-case etsy25 is honoured the same way',
    get(lc, 'discounts[0][promotion_code]').join() === ETSY25_ID && get(lc, 'allow_promotion_codes').length === 0, lc.stripeBody);
}

// W2: allowlisted promo but not the product it applies to -> today's behaviour.
{
  const r = await checkout({ ...base, items: ['doctor'], promo: 'ETSY25' });
  check('W2. ETSY25 + doctor only -> allow_promotion_codes=true, no discounts, no promo metadata',
    r.status === 200 && get(r, 'allow_promotion_codes').join() === 'true' &&
    !r.params.some(([k]) => k.startsWith('discounts')) && get(r, 'metadata[promo]').length === 0, r.stripeBody);
}

// W3: anything not on the server allowlist is ignored.
for (const promo of ['HACK100', 'promo_1UG2yPEVDfkpGz8wt2rbVih6', { x: 1 }, 'ETSY25 ']) {
  const r = await checkout({ ...base, items: ['protocol'], promo });
  check(`W3. promo ${JSON.stringify(promo)} ignored -> allow_promotion_codes=true, no discounts`,
    r.status === 200 && get(r, 'allow_promotion_codes').join() === 'true' &&
    !r.params.some(([k]) => k.startsWith('discounts')) && get(r, 'metadata[promo]').length === 0, r.stripeBody);
}

// W4: no promo -> byte-identical to the pre-change request.
{
  const r = await checkout({ ...base, items: ['protocol'] });
  check('W4. no promo -> Stripe body byte-identical to the pre-change baseline',
    r.stripeBody === BASELINE_NO_PROMO, `\n got: ${r.stripeBody}\nwant: ${BASELINE_NO_PROMO}`);
}

process.exit(failed ? 1 : 0);
