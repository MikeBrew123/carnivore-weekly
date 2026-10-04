#!/usr/bin/env node
// Worker-side PescoDial checkout + report contract, through the REAL fetch handler
// with Stripe and Supabase mocked (nothing leaves this process).
//  A. a pesco-* order returns to PescoDial (www, or the calling PescoDial origin), never CW;
//  B. a pesco-* order is priced on the server at $29 with a PescoDial product name;
//  C. a CW order is unchanged: CW return URL and the CW Stripe price id;
//  D. an unknown Origin cannot steer a PescoDial return URL;
//  E. report/init refuses an unpaid session (402) and allows a paid one past the gate;
//  F. resume links use www (the apex forward drops the path).
// Run: node tests/pd-checkout-contract.test.mjs
const calls = [];
let sessionRow = { id: '11111111-2222-3333-4444-555555555555', payment_status: 'pending', email: 'a@b.co', form_data: { diet: 'pesco-keto' } };
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  calls.push({ u, method: opts.method || 'GET', body: opts.body });
  if (u.includes('api.stripe.com/v1/checkout/sessions')) return new Response(JSON.stringify({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1', amount_total: 2900 }), { status: 200 });
  if (u.includes('api.stripe.com')) return new Response('{}', { status: 200 });
  if (u.includes('/rest/v1/cw_assessment_sessions') && (opts.method || 'GET') === 'GET') return new Response(JSON.stringify([sessionRow]), { status: 200 });
  if (u.includes('/rest/v1/calculator_reports') && (opts.method || 'GET') === 'GET') return new Response('[]', { status: 200 });
  if (u.includes('/rest/v1/')) return new Response(JSON.stringify([{ id: sessionRow.id }]), { status: 201 });
  return new Response('{}', { status: 200 });
};
const quiet = ['log', 'info', 'warn', 'debug', 'error'].map(k => [k, console[k]]);
const mod = await import('../api/calculator-api.js');
const worker = mod.default;
const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'k', STRIPE_SECRET_KEY: 'sk_test_x', ENVIRONMENT: 'test' };
let failed = 0;
const check = (n, ok, x = '') => { quiet.forEach(([k, f]) => console[k] = f); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : ' ' + x}`); if (!ok) failed++; };
const mute = () => quiet.forEach(([k]) => console[k] = () => {});

const form = diet => ({ diet, sex: 'female', age: 60, weight: 175, heightCm: 163, lifestyle: 'light', goal: 'lose', goalWeight: 150 });
async function checkout(diet, origin) {
  calls.length = 0; mute();
  const req = new Request('https://worker.test/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify({ email: 'buyer@example.com', form_data: form(diet), tier_id: 'bundle' }) });
  const res = await worker.fetch(req, env, { waitUntil() {} });
  const stripe = calls.find(c => c.u.includes('/v1/checkout/sessions'));
  return { status: res.status, body: await res.json().catch(() => ({})), stripe: stripe ? new URLSearchParams(stripe.body) : null };
}

let r = await checkout('pesco-keto', 'https://www.pescodial.com');
check('A. PD order returns to www.pescodial.com/calculator/', r.stripe && r.stripe.get('success_url').startsWith('https://www.pescodial.com/calculator/?payment=success&session_id=')
  && r.stripe.get('cancel_url').startsWith('https://www.pescodial.com/calculator/?payment=cancelled'), r.stripe && r.stripe.get('success_url'));
check('B. PD priced on server at 2900 with PescoDial name', r.stripe && r.stripe.get('line_items[0][price_data][unit_amount]') === '2900'
  && /PescoDial/.test(r.stripe.get('line_items[0][price_data][product_data][name]')) && !r.stripe.get('line_items[0][price]'));
r = await checkout('pesco-mediterranean', 'https://pescodial.pages.dev');
check('A2. PD order from pages.dev returns to pages.dev', r.stripe && r.stripe.get('success_url').startsWith('https://pescodial.pages.dev/calculator/'));
r = await checkout('carnivore', 'https://carnivoreweekly.com');
check('C. CW order unchanged', r.stripe && r.stripe.get('success_url').startsWith('https://carnivoreweekly.com/calculator.html?payment=success')
  && r.stripe.get('line_items[0][price]') === 'price_1T5CZkEVDfkpGz8wnvZEnZH7');
r = await checkout('pesco-keto', 'https://evil.example');
check('D. unknown origin cannot steer the return URL', r.stripe && r.stripe.get('success_url').startsWith('https://www.pescodial.com/'));

async function init() {
  mute();
  const res = await worker.fetch(new Request('https://worker.test/api/v1/calculator/report/init', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionRow.id }) }), env, { waitUntil() {} });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
sessionRow = { ...sessionRow, payment_status: 'pending' };
r = await init();
check('E1. report/init refuses an unpaid session', r.status === 402 && r.body.code === 'PAYMENT_REQUIRED', JSON.stringify(r));
sessionRow = { ...sessionRow, payment_status: 'completed' };
r = await init();
check('E2. a paid session gets past the payment gate', !(r.status === 402 || r.body.code === 'PAYMENT_REQUIRED'), JSON.stringify(r).slice(0, 200));
check('F. resume link uses www', mod.__test_buildResumeLink('x', 'pd').startsWith('https://www.pescodial.com/calculator/'));
process.exit(failed ? 1 : 0);
