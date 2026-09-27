#!/usr/bin/env node
/**
 * tests/unsubscribe-signed-link.test.mjs
 *
 * Run it:
 *     node tests/unsubscribe-signed-link.test.mjs
 *
 * No database needed: global fetch is stubbed, so this drives the REAL handler.
 *
 * WHY: GET /api/v1/unsubscribe acted on ?email=...&site=... alone, so anyone who
 * knew an address could unsubscribe that person from the newsletter and the drip.
 * Links now carry an HMAC sig. These tests pin:
 *   1. the CW worker, the KD worker and scripts/unsubscribe_link.py produce the
 *      SAME signature (one fixed vector, also checked with openssl on 2026-09-27);
 *   2. a valid sig unsubscribes, and the exit survey still gets its ticket;
 *   3. a wrong, cross-site, cross-email or unverifiable sig writes NOTHING;
 *   4. an unsigned (legacy) link works before the cutoff and writes nothing after;
 *   5. no sender in either worker builds an unsubscribe URL by hand any more.
 */
import fs from 'node:fs';

const API_JS = new URL('../api/calculator-api.js', import.meta.url).pathname;
const KD_JS = new URL('../ketodial/worker/index.js', import.meta.url).pathname;
const mod = await import('file://' + API_JS);
const kd = await import('file://' + KD_JS);
const sign = mod.__test_unsubscribeSignature;
const buildUrl = mod.__test_buildUnsubscribeUrl;
const kdBuildUrl = kd.__test_buildUnsubscribeUrl;
const unsubscribe = mod.__test_handleUnsubscribe;
const verifyTicket = mod.__test_verifyExitTicket;
for (const [n, f] of [['unsubscribeSignature', sign], ['buildUnsubscribeUrl', buildUrl],
  ['KD buildUnsubscribeUrl', kdBuildUrl], ['handleUnsubscribe', unsubscribe], ['verifyExitTicket', verifyTicket]]) {
  if (typeof f !== 'function') { console.error(`FATAL: missing test export ${n}`); process.exit(1); }
}

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  PASS  ${m}`); } else { fail++; console.log(`  FAIL  ${m}${d ? ' :: ' + d : ''}`); } };

// Same vector as tests/test_unsubscribe_link.py.
const VECTOR = { secret: 'vector-secret', email: 'reader+tag@example.com', cw: '26ccdf56c2e2eb70b0e091dabd281480', kd: '446ad78e471fb2f262c039ab50dbc658' };
const SECRET = 'test-unsubscribe-secret';
const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key', UNSUBSCRIBE_SECRET: SECRET };
const SUB = '11111111-2222-4333-8444-555555555555';

let writes = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const method = (init.method || 'GET').toUpperCase();
  if (method === 'PATCH') writes.push({ url: u, body: init.body });
  const json = (b) => new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('/drip_subscribers') && method === 'PATCH') return json([{ id: SUB }]);
  return json([]);
};

const hit = async (qs, e = env) => {
  writes = [];
  const res = await unsubscribe(new URL(`https://api.test/api/v1/unsubscribe?${qs}`), e);
  return { status: res.status, html: await res.text(), writes: [...writes] };
};
const q = (email, site, sig) => `email=${encodeURIComponent(email)}&site=${site}${sig === undefined ? '' : `&sig=${sig}`}`;

console.log('\n1. One signature across CW worker, KD worker and Python');
ok(await sign({ UNSUBSCRIBE_SECRET: VECTOR.secret }, VECTOR.email, 'cw') === VECTOR.cw, 'CW worker matches the fixed cw vector');
ok(await sign({ UNSUBSCRIBE_SECRET: VECTOR.secret }, VECTOR.email, 'kd') === VECTOR.kd, 'CW worker matches the fixed kd vector');
ok(await sign({ UNSUBSCRIBE_SECRET: VECTOR.secret }, '  Reader+Tag@Example.COM ', 'cw') === VECTOR.cw, 'email is trimmed and lowercased before signing');
const kdUrl = await kdBuildUrl({ UNSUBSCRIBE_SECRET: VECTOR.secret }, 'Reader+Tag@Example.com', 'kd');
ok(kdUrl.endsWith(`&site=kd&sig=${VECTOR.kd}`), 'KD worker plan-email link carries the same kd signature', kdUrl);
const cwUrl = await buildUrl({ UNSUBSCRIBE_SECRET: VECTOR.secret }, VECTOR.email, 'cw');
ok(cwUrl === `https://carnivore-report-api-production.iambrew.workers.dev/api/v1/unsubscribe?email=reader%2Btag%40example.com&site=cw&sig=${VECTOR.cw}`,
  'CW worker builds the exact URL Python builds', cwUrl);
ok(await sign({}, VECTOR.email, 'cw') === null, 'no secret means no signature (never a signature over an empty key)');

console.log('\n2. A valid signed link unsubscribes, and the exit survey still works');
const good = await hit(q('Reader@Example.com', 'cw', await sign(env, 'reader@example.com', 'cw')));
ok(good.status === 200, 'valid sig returns 200', String(good.status));
ok(good.writes.length === 2, 'both newsletter_subscribers and drip_subscribers are updated', String(good.writes.length));
ok(good.writes.every((w) => w.url.includes('email=eq.reader%40example.com') && w.url.includes('site=eq.cw')), 'writes are scoped to that email and site');
const ticket = /var ticket=("[^"]*"|null);/.exec(good.html)?.[1];
ok(ticket && ticket !== 'null', 'unsubscribe page still embeds the exit-survey ticket', ticket);
ok(ticket && (await verifyTicket(env, JSON.parse(ticket), 'cw')) === SUB, 'the ticket still resolves to the subscriber');
const goodKd = await hit(q('reader@example.com', 'kd', await sign(env, 'reader@example.com', 'kd')));
ok(goodKd.status === 200 && goodKd.writes.every((w) => w.url.includes('site=eq.kd')), 'a KD link unsubscribes from KD only');

console.log('\n3. Anything but a matching sig writes nothing');
const cwSig = await sign(env, 'reader@example.com', 'cw');
const cases = [
  ['garbage sig', q('reader@example.com', 'cw', 'nothex')],
  ['empty sig', q('reader@example.com', 'cw', '')],
  ['full 64-char HMAC instead of the 32-char prefix', q('reader@example.com', 'cw', cwSig + cwSig)],
  ['sig for another email', q('victim@example.com', 'cw', cwSig)],
  ['cw sig replayed on kd', q('reader@example.com', 'kd', cwSig)],
  ['cw sig with site dropped from a kd link', `email=reader%40example.com&sig=${await sign(env, 'reader@example.com', 'kd')}`],
  ['one character flipped', q('reader@example.com', 'cw', (cwSig[0] === 'a' ? 'b' : 'a') + cwSig.slice(1))],
];
for (const [name, qs] of cases) {
  const r = await hit(qs);
  ok(r.status === 400 && r.writes.length === 0, `${name}: 400 and no write`, `${r.status}/${r.writes.length}`);
}
const noSecret = await hit(q('reader@example.com', 'cw', cwSig), { ...env, UNSUBSCRIBE_SECRET: undefined });
ok(noSecret.status === 400 && noSecret.writes.length === 0, 'worker without the secret refuses signed links rather than trusting them');
const other = await hit(q('reader@example.com', 'cw', cwSig), { ...env, UNSUBSCRIBE_SECRET: 'some-other-secret' });
ok(other.status === 400 && other.writes.length === 0, 'a sig made with a different secret is rejected');
ok(!/checkin_token|unsubscribe_token/.test(noSecret.html), 'the rejection page reveals nothing about the subscriber');

console.log('\n4. Legacy unsigned links: honoured until the cutoff, inert after it');
const realNow = Date.now;
try {
  Date.now = () => Date.parse('2027-01-30T23:59:59Z');
  const before = await hit(q('reader@example.com', 'cw'));
  ok(before.status === 200 && before.writes.length === 2, 'legacy link still unsubscribes the day before the cutoff');
  const legacyNoSite = await hit('email=reader%40example.com');
  ok(legacyNoSite.status === 200 && legacyNoSite.writes.every((w) => w.url.includes('site=eq.cw')), 'old CW drip links without &site= still default to cw');
  Date.now = () => Date.parse('2027-01-31T00:00:00Z');
  const after = await hit(q('reader@example.com', 'cw'));
  ok(after.status === 410 && after.writes.length === 0, 'legacy link writes nothing from the cutoff on', `${after.status}/${after.writes.length}`);
  ok(/expired/i.test(after.html) && /reply/i.test(after.html), 'expired page tells the reader how to get off the list');
  const signedAfter = await hit(q('reader@example.com', 'cw', cwSig));
  ok(signedAfter.status === 200 && signedAfter.writes.length === 2, 'signed links keep working after the cutoff');
} finally {
  Date.now = realNow;
}
const missing = await hit('site=cw');
ok(missing.status === 400 && missing.writes.length === 0, 'no email: 400 and no write');

console.log('\n5. No sender builds an unsubscribe URL by hand');
for (const [label, file] of [['api/calculator-api.js', API_JS], ['ketodial/worker/index.js', KD_JS]]) {
  const src = fs.readFileSync(file, 'utf8');
  const handBuilt = src.match(/v1\/unsubscribe\?email=/g) || [];
  ok(handBuilt.length === 0, `${label}: every link goes through buildUnsubscribeUrl`, `${handBuilt.length} hand-built`);
}
const noKeyUrl = await buildUrl({}, 'reader@example.com', 'cw');
ok(!noKeyUrl.includes('sig='), 'worker without the secret falls back to an unsigned link (logged) so transactional mail still sends');

console.log(`\nunsubscribe-signed-link: ${pass}/${pass + fail} passed`);
process.exit(fail ? 1 : 0);
