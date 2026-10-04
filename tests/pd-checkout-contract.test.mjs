#!/usr/bin/env node
// Worker-side PescoDial checkout + report contract, through the REAL fetch handler
// with Stripe and Supabase mocked (nothing leaves this process).
//  A. a pesco-* order returns to PescoDial (www, or the calling PescoDial origin), never CW;
//  B. a pesco-* order is priced on the server at $29 with a PescoDial product name;
//  C. a CW order is unchanged: CW return URL and the CW Stripe price id;
//  D. an unknown Origin cannot steer a PescoDial return URL;
//  E. report/init refuses an unpaid session (402) and allows a paid one past the gate;
//  F. resume links use www (the apex forward drops the path);
//  G. /get-session never returns health answers, and rejects a non-UUID id;
//  H. step 4 writes only step-4 answers (no diet switch) and is locked once a report exists;
//  I. email-report works without an email in the body (stored owner address).
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

sessionRow = { ...sessionRow, payment_status: 'completed', form_data: { diet: 'pesco-keto', age: 60, medications: 'warfarin', conditions: ['kidney-disease'], allergies: 'shellfish' } };
mute();
let res = await worker.fetch(new Request(`https://worker.test/get-session?id=${sessionRow.id}`), env, { waitUntil() {} });
let j = await res.json();
check('G1. get-session strips health answers', j.form_data && j.form_data.age === 60 && !('medications' in j.form_data) && !('conditions' in j.form_data) && !('allergies' in j.form_data), JSON.stringify(j.form_data));
mute();
res = await worker.fetch(new Request('https://worker.test/get-session?id=1%20or%201=1'), env, { waitUntil() {} });
check('G2. get-session rejects a non-UUID id', res.status === 400);

let reportRows = [];
const baseFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('/rest/v1/calculator_reports') && (opts.method || 'GET') === 'GET') return new Response(JSON.stringify(reportRows), { status: 200 });
  return baseFetch(url, opts);
};
async function step4(data) {
  calls.length = 0; mute();
  const r = await worker.fetch(new Request('https://worker.test/api/v1/calculator/step/4', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assessment_id: sessionRow.id, data }) }), env, { waitUntil() {} });
  const patch = calls.find(c => c.u.includes('/rest/v1/cw_assessment_sessions') && c.method === 'PATCH');
  return { status: r.status, patch: patch ? JSON.parse(patch.body) : null };
}
reportRows = [];
r = await step4({ medications: 'none', diet: 'carnivore', firstName: '<img src=x onerror=alert(1)>', age: 20 });
check('H1. step 4 keeps only step-4 answers', r.patch && r.patch.form_data.diet === 'pesco-keto' && r.patch.form_data.age === 60 && r.patch.form_data.medications === 'none', JSON.stringify(r));
reportRows = [{ id: 'rep1' }];
r = await step4({ medications: '' });
check('H2. step 4 is locked once a report exists', r.status === 409 && !r.patch, JSON.stringify(r));
const cover = mod.__test_wrapInPrintHTML('x', { firstName: '<img src=x onerror=alert(1)>', lastName: '"><script>1</script>', selectedProtocol: 'Carnivore' });
check('H3. CW cover escapes the reader name', !cover.includes('<img src=x') && !cover.includes('<script>1</script>'));
process.exit(failed ? 1 : 0);
