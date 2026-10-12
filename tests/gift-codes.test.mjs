#!/usr/bin/env node
// Gift a report (2026-10-11): codes, cards and redemption, through the REAL worker
// fetch handlers with Stripe, Resend and Supabase faked in memory (nothing leaves
// this process). gift_codes is a small PostgREST imitation that honours eq. filters,
// so the single-use guard is exercised as the conditional UPDATE it really is.
//  A. codes: shape, alphabet, normalisation, and which codes count as gifts
//  B. webhook: one paid gift checkout -> one row, one email, however often Stripe retries
//  C. the card: code, names and note on it; buyer text escaped; no em-dashes
//  D. redemption (CW/PD /create-checkout): single use, site-bound, after the payment
//     boundary, never touches Stripe, released if the session cannot be marked paid
//  E. refund voids an unredeemed code; a voided code no longer validates
//  F. self-purchase unchanged: a normal coupon still goes to Stripe
//  G. KD redemption: claim, offer-filtered items, kg_ reference, reports resolve
// Run: node tests/gift-codes.test.mjs
import crypto from 'node:crypto';

let failed = 0, passed = 0;
const quiet = ['log', 'info', 'warn', 'debug', 'error'].map(k => [k, console[k]]);
const mute = () => quiet.forEach(([k]) => console[k] = () => {});
const unmute = () => quiet.forEach(([k, f]) => console[k] = f);
const check = (n, ok, x = '') => { unmute(); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}${ok ? '' : '  ' + x}`); ok ? passed++ : failed++; };

// ---------------------------------------------------------------- fake backends
const db = { gift_codes: [], cw_assessment_sessions: [], calculator_sessions_v2: [] };
const sent = [];       // Resend sends
const stripeCalls = [];
let failAssessmentPatch = false;

function parseFilters(u) {
  const out = [];
  for (const [k, v] of u.searchParams) {
    if (['on_conflict', 'limit', 'select', 'order'].includes(k)) continue;
    const m = /^(eq|is)\.(.*)$/.exec(v);
    if (m) out.push([k, m[1], decodeURIComponent(m[2])]);
  }
  return out;
}
const matches = (row, f) => f.every(([k, op, v]) => op === 'is' ? (v === 'null' ? row[k] == null : true) : String(row[k]) === v);
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

globalThis.fetch = async (url, opts = {}) => {
  const u = new URL(String(url));
  const method = (opts.method || 'GET').toUpperCase();
  if (u.host === 'api.resend.com') { sent.push({ headers: opts.headers, body: JSON.parse(opts.body) }); return json({ id: 're_' + sent.length }); }
  if (u.host === 'api.stripe.com') {
    stripeCalls.push({ path: u.pathname, body: opts.body ? String(opts.body) : '' });
    if (u.pathname === '/v1/checkout/sessions' && method === 'POST') return json({ id: 'cs_test_gift', url: 'https://checkout.stripe.com/c/pay/cs_test_gift' });
    if (u.pathname.startsWith('/v1/coupons/')) return json({ valid: true, percent_off: 50 });
    return json({});
  }
  const table = u.pathname.replace('/rest/v1/', '');
  if (!(table in db)) return json([], 200);
  const rows = db[table];
  const f = parseFilters(u);
  if (method === 'GET') return json(rows.filter(r => matches(r, f)));
  if (method === 'POST') {
    const body = JSON.parse(opts.body);
    const conflict = u.searchParams.get('on_conflict');
    if (table === 'gift_codes') {
      if (conflict && rows.some(r => r[conflict] === body[conflict])) return json([]);
      if (rows.some(r => r.code === body.code)) return new Response('duplicate key gift_codes_code_key', { status: 409 });
      const row = { id: crypto.randomUUID(), status: 'active', email_sent_at: null, redeemed_at: null, redeemed_session_id: null, ...body };
      rows.push(row); return json([row], 201);
    }
    const row = { ...body }; rows.push(row); return json([row], 201);
  }
  if (method === 'PATCH') {
    if (table === 'cw_assessment_sessions' && failAssessmentPatch) return new Response('boom', { status: 500 });
    const body = JSON.parse(opts.body);
    // One row at a time, re-checking the filter: the same thing Postgres does after a lock.
    const hit = [];
    for (const r of rows) if (matches(r, f)) { Object.assign(r, body); hit.push({ ...r }); }
    return json(hit);
  }
  return json([]);
};

mute();
const gift = await import('../api/gift.js');
const cw = (await import('../api/calculator-api.js')).default;
const kdMod = await import('../ketodial/worker/index.js');
const kd = kdMod.default;
const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'k', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_WEBHOOK_SECRET: 'whsec_test', RESEND_API_KEY: 're_test', ENVIRONMENT: 'test' };

// ---------------------------------------------------------------- A. codes
const codes = Array.from({ length: 2000 }, () => gift.mintGiftCode('cw'));
check('A1. minted codes have the CW-XXXXXXXX shape', codes.every(c => gift.GIFT_CODE_RE.test(c)));
check('A2. no look-alike characters (0 O 1 I L)', codes.every(c => !/[01OIL]/.test(c.slice(3))));
check('A3. 2000 codes, no repeats', new Set(codes).size === codes.length);
check('A4. kd/pd prefixes', gift.mintGiftCode('kd').startsWith('KD-') && gift.mintGiftCode('pd').startsWith('PD-'));
check('A5. typed code is normalised (case, spaces, missing dash)', gift.normalizeGiftCode(' cw abcd2345 ') === 'CW-ABCD2345' && gift.normalizeGiftCode('pdABCD2345') === 'PD-ABCD2345');
check('A6. drip and Etsy codes are not gift codes', !gift.looksLikeGiftCode('WEEK1-ABCDE') && !gift.looksLikeGiftCode('ETSY50') && !gift.looksLikeGiftCode('GRAD-ABCDE'));

// ---------------------------------------------------------------- B. webhook
async function webhook(event) {
  const body = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(`${t}.${body}`).digest('hex');
  mute();
  const res = await cw.fetch(new Request('https://worker.test/webhook/stripe', { method: 'POST', headers: { 'stripe-signature': `t=${t},v1=${v1}` }, body }), env, { waitUntil() {} });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const giftSession = (id, site, extra = {}) => ({
  id: 'evt_' + id + Math.random(), type: 'checkout.session.completed',
  data: { object: { id, object: 'checkout.session', payment_status: 'paid', amount_total: site === 'kd' ? 1099 : 2900, currency: 'usd',
    payment_intent: 'pi_' + id, customer_email: 'Mom@Example.com',
    metadata: { kind: 'gift', gift_site: site, buyer_name: 'Linda', recipient_name: 'Dave', note: 'Start with a real plan. <script>alert(1)</script>', ...extra } } },
});

let r = await webhook(giftSession('cs_test_g1', 'cw'));
check('B1. paid gift checkout is acknowledged', r.status === 200 && r.body.gift === true, JSON.stringify(r));
check('B2. exactly one gift row', db.gift_codes.filter(g => g.stripe_session_id === 'cs_test_g1').length === 1);
const g1 = db.gift_codes.find(g => g.stripe_session_id === 'cs_test_g1');
check('B3. row carries site, buyer, recipient, payment intent', g1.site === 'cw' && g1.buyer_email === 'mom@example.com' && g1.recipient_name === 'Dave' && g1.stripe_payment_intent === 'pi_cs_test_g1');
check('B4. one card email, to the buyer, with idempotency key', sent.length === 1 && sent[0].body.to[0] === 'mom@example.com' && /gift-card\//.test(sent[0].headers['Idempotency-Key']));
r = await webhook(giftSession('cs_test_g1', 'cw'));
check('B5. Stripe retry: still one row, no second email', db.gift_codes.filter(g => g.stripe_session_id === 'cs_test_g1').length === 1 && sent.length === 1, `rows/sends ${db.gift_codes.length}/${sent.length}`);
r = await webhook({ ...giftSession('cs_test_unpaid', 'cw'), data: { object: { ...giftSession('cs_test_unpaid', 'cw').data.object, payment_status: 'unpaid' } } });
check('B6. an unpaid gift session mints nothing', !db.gift_codes.some(g => g.stripe_session_id === 'cs_test_unpaid'));

// ---------------------------------------------------------------- C. card
const mail = sent[0].body;
check('C1. card shows the code, both names and the note', mail.html.includes(g1.code) && mail.html.includes('Dave') && mail.html.includes('Linda') && mail.html.includes('Start with a real plan.'));
check('C2. buyer text is escaped, never live HTML', !mail.html.includes('<script>alert(1)</script>') && mail.html.includes('&lt;script&gt;'));
check('C3. card links to the redeem page with the code', mail.html.includes(`https://carnivoreweekly.com/gift/redeem/?code=${g1.code}`));
check('C4. plain-text part carries the code too', mail.text.includes(g1.code));
check('C5. replies go to the catch-all, not a personal inbox', mail.reply_to === 'sarah@carnivoreweekly.com');
check('C6. no em-dashes in anything the buyer reads', !/—/.test(mail.html + mail.text + mail.subject));
mute();
let res = await cw.fetch(new Request(`https://worker.test/gift/card/${g1.card_token}`), env, {});
let page = await res.text();
check('C7. printable card page works and is noindex', res.status === 200 && page.includes(g1.code) && /noindex/.test(res.headers.get('X-Robots-Tag') || ''));
res = await cw.fetch(new Request('https://worker.test/gift/status?cs=cs_test_g1'), env, {});
let st = await res.json();
check('C8. thank-you page can find the card by checkout session', st.ready === true && st.card_url.endsWith(g1.card_token), res.status + ' ' + JSON.stringify(st));

// ---------------------------------------------------------------- D. redemption (CW / PD)
const form = diet => ({ diet, sex: 'female', age: 60, weight: 175, heightCm: 163, lifestyle: 'light', goal: 'lose', goalWeight: 150 });
async function redeem(code, diet = 'carnivore', email = 'dave@example.com', extra = {}) {
  stripeCalls.length = 0; mute();
  const res = await cw.fetch(new Request('https://worker.test/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://carnivoreweekly.com' },
    body: JSON.stringify({ email, form_data: { ...form(diet), ...extra }, tier_id: 'bundle', coupon_code: code, discount_percent: 100, amount: 0 }) }), env, { waitUntil() {} });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
mute();
res = await cw.fetch(new Request('https://worker.test/validate-coupon', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: g1.code.toLowerCase() }) }), env, {});
let v = await res.json();
check('D1. validate-coupon reports an active gift as 100% without claiming it', res.status === 200 && v.percent === 100 && v.gift === true && g1.status === 'active');

r = await redeem(g1.code, 'carnivore', 'dave@example.com', { age: 15 });
check('D2. a checkout refused at the payment boundary does not burn the gift', r.status === 422 && g1.status === 'active', JSON.stringify(r).slice(0, 160));

r = await redeem(g1.code, 'pesco-keto');
check('D3. a CW gift code is refused on PescoDial and stays active', r.status === 409 && g1.status === 'active', JSON.stringify(r).slice(0, 160));

failAssessmentPatch = true;
r = await redeem(g1.code);
failAssessmentPatch = false;
check('D4. if the session cannot be marked paid, the code is given back', r.status === 500 && g1.status === 'active', `${r.status} ${g1.status}`);

r = await redeem(g1.code);
const sess = db.cw_assessment_sessions.find(s => s.id === r.body.session_uuid);
check('D5. first redemption succeeds and lands on the paid success URL', r.status === 200 && r.body.gift === true && /payment=success&session_id=/.test(r.body.checkout_url), JSON.stringify(r).slice(0, 200));
check('D6. the assessment is completed and marked as a gift', sess && sess.payment_status === 'completed' && sess.stripe_payment_intent_id === `gift_${g1.code}`);
check('D7. the code is redeemed and linked to that assessment', g1.status === 'redeemed' && g1.redeemed_session_id === r.body.session_uuid && g1.redeemed_email === 'dave@example.com');
check('D8. no Stripe checkout was created', !stripeCalls.some(c => c.path === '/v1/checkout/sessions'));

r = await redeem(g1.code, 'carnivore', 'someone@else.com');
check('D9. second use is refused with the used-code message', r.status === 409 && /already been used/.test(r.body.message || ''), JSON.stringify(r).slice(0, 200));

// Two claims at once: only one can win.
await webhook(giftSession('cs_test_g2', 'cw'));
const g2 = db.gift_codes.find(g => g.stripe_session_id === 'cs_test_g2');
const both = await Promise.all([gift.claimGift(env, g2.code, 'cw', 'a@x.com'), gift.claimGift(env, g2.code, 'cw', 'b@x.com')]);
check('D10. concurrent double claim: exactly one wins', both.filter(Boolean).length === 1);

await webhook(giftSession('cs_test_pd1', 'pd'));
const pd1 = db.gift_codes.find(g => g.stripe_session_id === 'cs_test_pd1');
check('D11. PescoDial gift email comes from PescoDial', sent.at(-1).body.from.includes('pescodial.com') && sent.at(-1).body.html.includes('https://www.pescodial.com/gift/redeem/?code=PD-'));
r = await redeem(pd1.code, 'pesco-keto');
check('D12. a PD gift redeems on a pesco order and returns to PescoDial', r.status === 200 && r.body.checkout_url.startsWith('https://www.pescodial.com/calculator/'), JSON.stringify(r).slice(0, 200));

// ---------------------------------------------------------------- E. refund
await webhook(giftSession('cs_test_g3', 'cw'));
const g3 = db.gift_codes.find(g => g.stripe_session_id === 'cs_test_g3');
r = await webhook({ id: 'evt_ref' + Math.random(), type: 'charge.refunded', data: { object: { id: 'ch_1', refunded: true, payment_intent: 'pi_cs_test_g3', amount_refunded: 2900 } } });
check('E1. full refund voids an unredeemed gift', g3.status === 'void', g3.status);
r = await redeem(g3.code);
check('E2. a voided code is refused', r.status === 409 && g3.status === 'void');
r = await webhook({ id: 'evt_ref2' + Math.random(), type: 'charge.refunded', data: { object: { id: 'ch_2', refunded: true, payment_intent: 'pi_cs_test_g1', amount_refunded: 2900 } } });
check('E3. refund after redemption leaves the redeemed gift alone', g1.status === 'redeemed');

// ---------------------------------------------------------------- F. self-purchase unchanged
stripeCalls.length = 0; mute();
res = await cw.fetch(new Request('https://worker.test/create-checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://carnivoreweekly.com' },
  body: JSON.stringify({ email: 'buyer@example.com', form_data: form('carnivore'), tier_id: 'bundle', coupon_code: 'ETSY50' }) }), env, {});
const f1 = await res.clone().text(); check('F1. a normal coupon still goes to Stripe at the CW price', res.ok && stripeCalls.some(c => c.path === '/v1/checkout/sessions' && c.body.includes('price_1T5CZkEVDfkpGz8wnvZEnZH7')), res.status + ' ' + f1.slice(0, 300) + ' ' + JSON.stringify(stripeCalls.map(c => c.path)));

stripeCalls.length = 0; mute();
res = await cw.fetch(new Request('https://worker.test/gift/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://ketodial.com' },
  body: JSON.stringify({ site: 'kd', buyer_name: 'Linda', buyer_email: 'mom@example.com', recipient_name: 'Dave', note: 'hi' }) }), env, {});
let co = new URLSearchParams(stripeCalls.find(c => c.path === '/v1/checkout/sessions')?.body || '');
check('F2. KD gift checkout uses the existing $10.99 Protocol price and marks it a gift', res.status === 200 && co.get('line_items[0][price]') === 'price_1Tcvd0EVDfkpGz8wCtiZSJT6' && co.get('metadata[kind]') === 'gift' && co.get('metadata[gift_site]') === 'kd');
check('F2b. KD gift checkout is branded KetoDial with a KETODIAL statement suffix', co.get('branding_settings[display_name]') === 'KetoDial' && co.get('payment_intent_data[statement_descriptor_suffix]') === 'KETODIAL');
check('F3. gift checkout returns to that site\'s gift page and takes no discount codes', co.get('success_url').startsWith('https://ketodial.com/gift/?bought=1') && !co.has('allow_promotion_codes'));
stripeCalls.length = 0; mute();
res = await cw.fetch(new Request('https://worker.test/gift/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ site: 'cw', buyer_name: 'Linda', buyer_email: 'mom@example.com', recipient_name: '' }) }), env, {});
check('F4. a gift without a recipient name is refused before Stripe', res.status === 400 && !stripeCalls.length);

// ---------------------------------------------------------------- G. KetoDial redemption
await webhook(giftSession('cs_test_kd1', 'kd'));
const kd1 = db.gift_codes.find(g => g.stripe_session_id === 'cs_test_kd1');
check('G1. KD gift email comes from KetoDial with KD reply-to', sent.at(-1).body.from.includes('ketodial.com') && sent.at(-1).body.reply_to === 'ketodial@carnivoreweekly.com');
const kdOk = kdMod.__test_redeemKdGift;
if (typeof kdOk !== 'function') {
  check('G2. KD redeemKdGift exposed for tests', false, 'export __test_redeemKdGift missing');
} else {
  db.calculator_sessions_v2.push({ session_token: 'tok_kd_1', payment_status: 'pending' });
  // Profile not finished: nothing is claimed, the page is told to open the profile.
  const { IntakeError } = await import('../ketodial/worker/intake.js');
  kdMod.kdGiftDeps.loadAuthoritativeIntake = async () => { throw new IntakeError('INTAKE_PROFILE_NOT_COMPLETED', ['profile'], 'finish your profile'); };
  mute();
  let pre = await kdOk(kd1.code, { allowed: ['doctor', 'meal', 'starter'] }, { email: 'dave@example.com', name: 'Dave', token: 'tok_kd_1' }, env);
  let preJ = await pre.json();
  check('G1b. unfinished profile: 409 profile_needed and the code is NOT spent', pre.status === 409 && preJ.error === 'profile_needed' && kd1.status === 'active', `${pre.status} ${JSON.stringify(preJ)} ${kd1.status}`);
  kdMod.kdGiftDeps.loadAuthoritativeIntake = async () => ({ name: 'Dave' });
  mute();
  let out = await kdOk(kd1.code, { allowed: ['doctor', 'starter'] }, { email: 'dave@example.com', name: 'Dave', token: 'tok_kd_1' }, env);
  let j = await out.json();
  check('G2. KD gift redeems and returns a kg_ success reference', out.status === 200 && /session_id=kg_[a-f0-9]{32}/.test(j.return_url), JSON.stringify(j));
  check('G3. granted items follow the safety offer (meal plan withheld)', kd1.redeemed_items === 'doctor,starter' && /^kg_/.test(kd1.report_ref));
  check('G4. the KD session is completed and marked as a gift', db.calculator_sessions_v2[0].payment_status === 'completed' && db.calculator_sessions_v2[0].stripe_payment_intent_id === `gift_${kd1.code}`);
  check('G5. the report reference never exposes the session token', !j.return_url.includes('tok_kd_1'));
  out = await kdOk(kd1.code, { allowed: ['doctor', 'meal', 'starter'] }, { email: 'x@example.com', name: 'X', token: 'tok_kd_1' }, env);
  check('G6. KD code is single use', out.status === 409);
  const resolved = await kdMod.__test_resolvePaidCheckout(kd1.report_ref, env);
  check('G7. kg_ reference resolves like a paid order with the granted items', resolved.token === 'tok_kd_1' && resolved.session.metadata.items === 'doctor,starter');
  const bogus = await kdMod.__test_resolvePaidCheckout('kg_' + 'a'.repeat(32), env);
  check('G8. unknown kg_ reference does not resolve', bogus.status === 404);
}

unmute();
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
