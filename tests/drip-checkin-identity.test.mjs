#!/usr/bin/env node
/**
 * tests/drip-checkin-identity.test.mjs
 *
 * THE PRIVACY AND CORRECTNESS GATE FOR CHECK-IN IDENTITY.
 *
 * Run it:
 *     node tests/drip-checkin-identity.test.mjs
 *
 * Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. It drives the REAL worker
 * handler against the REAL database, because the thing worth proving is what the
 * shipped code does, not what a reimplementation of it does.
 *
 * It creates two throwaway subscribers on a reserved fixture domain that
 * subscriber_hygiene.is_undeliverable_fixture() refuses to mail, exercises them,
 * and deletes them and their answers at the end.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * Identity made two new things possible, and only one of them is wanted.
 *
 *   WANTED:   attribute an answer to the subscriber we mailed, so before/after
 *             pairs exist and calculator context can be joined server side.
 *   NOT WANTED: a URL in an email that hands its bearer somebody's weight, health
 *             conditions, medications, mood history or email address.
 *
 * Check-in links get forwarded, quoted in replies and left in shared mailboxes.
 * The token therefore RECORDS and never REVEALS, and the tests below are the
 * thing that keeps it that way as the handler changes.
 */
import { randomUUID } from 'crypto';

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}
const REST = `${URL_BASE}/rest/v1`;
const H = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };

const mod = await import('file://' + new URL('../api/calculator-api.js', import.meta.url).pathname);
const resolveCheckinToken = mod.__test_resolveCheckinToken;
const handleDripSurveySubmit = mod.__test_handleDripSurveySubmit;
for (const [n, f] of [['resolveCheckinToken', resolveCheckinToken], ['handleDripSurveySubmit', handleDripSurveySubmit]]) {
  if (typeof f !== 'function') {
    console.error(`FATAL: api/calculator-api.js no longer exports ${n} on its TEST SURFACE.`);
    process.exit(1);
  }
}

const env = { SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: KEY };
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  PASS  ${m}`); } else { fail++; console.log(`  FAIL  ${m}${d ? ' :: ' + d : ''}`); } };

const rest = async (path, init = {}) => fetch(`${REST}${path}`, { ...init, headers: { ...H, ...(init.headers || {}) } });
const post = (site, body) => handleDripSurveySubmit(
  new Request('https://x/api/v1/drip-survey', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ site, ...body }),
  }), env);

// ---- fixtures -------------------------------------------------------------
// @example.com is IANA-reserved and is on the sender's undeliverable-fixture list,
// so these rows can never be mailed even if cleanup fails.
const stamp = Date.now();
const FIX = { cw: `checkin-test-cw-${stamp}@example.com`, kd: `checkin-test-kd-${stamp}@example.com` };
const subs = {};

async function setup() {
  for (const site of ['cw', 'kd']) {
    const r = await rest('/drip_subscribers', {
      method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ email: FIX[site], site, source: 'identity-test', current_day: 0 }),
    });
    const rows = await r.json();
    subs[site] = rows[0];
  }
}
async function teardown() {
  for (const site of ['cw', 'kd']) {
    if (!subs[site]) continue;
    await rest(`/drip_survey_responses?subscriber_id=eq.${subs[site].id}`, { method: 'DELETE' });
    await rest(`/drip_subscribers?id=eq.${subs[site].id}`, { method: 'DELETE' });
  }
}

// A live option id for (site, day), so submissions are genuine.
async function anOption(site, day) {
  const q = await (await rest(`/drip_survey_questions?site=eq.${site}&day=eq.${day}&active=eq.true&select=id&limit=1`)).json();
  if (!q.length) return null;
  const o = await (await rest(`/drip_survey_options?question_id=eq.${q[0].id}&select=id&limit=1`)).json();
  return o.length ? o[0].id : null;
}
const answersFor = async (id) =>
  (await (await rest(`/drip_survey_responses?subscriber_id=eq.${id}&select=id,option_id,answered_via,site,day`)).json());

// ---- tests ----------------------------------------------------------------
const HIST_BEFORE = (await (await rest('/drip_survey_responses?select=id')).json()).length;

await setup();
console.log(`\nDrip check-in identity — fixtures ${subs.cw.id.slice(0, 8)}… (cw) / ${subs.kd.id.slice(0, 8)}… (kd)\n`);

// 1 + 2. A valid token links the answer to the right subscriber, on both sites.
for (const site of ['cw', 'kd']) {
  const optId = await anOption(site, 1);
  const res = await post(site, { day: 1, option_ids: [optId], fingerprint: randomUUID(), token: subs[site].checkin_token, answered_via: 'one_tap' });
  const rows = await answersFor(subs[site].id);
  ok(res.status === 200, `${site.toUpperCase()}: valid token accepted`, `status ${res.status}`);
  ok(rows.length === 1 && rows[0].option_id === optId, `${site.toUpperCase()}: answer linked to the right subscriber`, `${rows.length} row(s)`);
  ok(rows[0] && rows[0].answered_via === 'one_tap', `${site.toUpperCase()}: answered_via recorded`, rows[0] && rows[0].answered_via);
  ok(rows[0] && rows[0].site === site, `${site.toUpperCase()}: response carries the right site`);
}

// 4. The unsubscribe token is NOT interchangeable with the check-in token.
const unsubAsCheckin = await resolveCheckinToken(env, subs.cw.unsubscribe_token, 'cw');
ok(unsubAsCheckin === null, 'unsubscribe_token cannot substitute for checkin_token');
ok(subs.cw.unsubscribe_token !== subs.cw.checkin_token, 'the two tokens are different values');

// Cross-site: a CW token must not attach a KD answer to the CW subscription.
ok(await resolveCheckinToken(env, subs.cw.checkin_token, 'kd') === null, 'CW token does not resolve on a KD day');

// 5. Invalid tokens fail SOFT: the answer still records, anonymously.
for (const [label, bad] of [['malformed', 'not-a-token'], ['well-formed but unknown', 'a'.repeat(64)], ['absent', undefined], ['wrong type', { x: 1 }]]) {
  ok(await resolveCheckinToken(env, bad, 'cw') === null, `invalid token (${label}) resolves to null`);
}
{
  const fp = randomUUID();
  const optId = await anOption('cw', 1);
  const res = await post('cw', { day: 1, option_ids: [optId], fingerprint: fp, token: 'not-a-token' });
  const anon = await (await rest(`/drip_survey_responses?fingerprint=eq.${fp}&select=id,subscriber_id`)).json();
  ok(res.status === 200, 'bad token still returns 200 (fails soft, reader is never blocked)');
  ok(anon.length === 1 && anon[0].subscriber_id === null, 'bad-token answer recorded ANONYMOUSLY, not dropped');
  await rest(`/drip_survey_responses?fingerprint=eq.${fp}`, { method: 'DELETE' });
}

// 10. Anonymous (no token at all) still works exactly as before identity existed.
{
  const fp = randomUUID();
  const optId = await anOption('cw', 1);
  const res = await post('cw', { day: 1, option_ids: [optId], fingerprint: fp });
  const anon = await (await rest(`/drip_survey_responses?fingerprint=eq.${fp}&select=id,subscriber_id,answered_via`)).json();
  ok(res.status === 200 && anon.length === 1, 'no-token submission still succeeds');
  ok(anon[0] && anon[0].subscriber_id === null && anon[0].answered_via === null, 'no-token answer stays fully anonymous');
  await rest(`/drip_survey_responses?fingerprint=eq.${fp}`, { method: 'DELETE' });
}

// 7. Idempotency: the same answer twice, and from a second device, must not duplicate.
{
  const optId = await anOption('cw', 1);
  await post('cw', { day: 1, option_ids: [optId], fingerprint: randomUUID(), token: subs.cw.checkin_token });
  const afterRepeat = await answersFor(subs.cw.id);
  ok(afterRepeat.length === 1, 'repeat submission from a different device does not duplicate', `${afterRepeat.length} rows`);

  const [a, b] = await Promise.all([
    post('cw', { day: 1, option_ids: [optId], fingerprint: randomUUID(), token: subs.cw.checkin_token }),
    post('cw', { day: 1, option_ids: [optId], fingerprint: randomUUID(), token: subs.cw.checkin_token }),
  ]);
  const afterRace = await answersFor(subs.cw.id);
  ok(a.status === 200 && b.status === 200, 'concurrent double submit: both return 200', `${a.status}/${b.status}`);
  ok(afterRace.length === 1, 'concurrent double submit leaves exactly one row', `${afterRace.length} rows`);
}

// 3. No raw email address in any generated check-in URL.
{
  const { readFileSync } = await import('fs');
  const src = readFileSync(new URL('../scripts/send_drip.py', import.meta.url).pathname, 'utf8');
  const m = src.match(/CHECKIN_URL_RE\s*=\s*re\.compile\(r'(.+?)'\)/);
  ok(!!m, 'send_drip.py defines the check-in URL rewrite');
  const built = `https://carnivoreweekly.com/journey-checkin.html?day=3&t=${subs.cw.checkin_token}`;
  ok(!built.includes('@') && !built.includes(FIX.cw), 'generated check-in URL contains no email address');
  ok(/^[a-f0-9]{64}$/.test(subs.cw.checkin_token), 'token is opaque 64-hex, encodes nothing');
  // The real risk is not that random bytes never contain byte 0x40 -- they do,
  // about 12% of the time -- but that the token might be DERIVED from the email,
  // which would make it reversible by anyone who guesses the scheme.
  const { createHash } = await import('crypto');
  const derivations = ['md5', 'sha1', 'sha256'].map((a) => createHash(a).update(FIX.cw).digest('hex'));
  ok(!derivations.includes(subs.cw.checkin_token), 'token is not a hash of the email address');
  ok(!subs.cw.checkin_token.includes(Buffer.from(FIX.cw).toString('hex')), 'token does not embed the email');
}

// 6. THE PRIVACY BOUNDARY. Possession of the link must reveal nothing.
{
  const resolved = await resolveCheckinToken(env, subs.cw.checkin_token, 'cw');
  const keys = Object.keys(resolved || {}).sort();
  ok(JSON.stringify(keys) === JSON.stringify(['id', 'site']), 'resolution returns ONLY {id, site}', keys.join(','));
  for (const leaked of ['email', 'weight', 'conditions', 'medications', 'energy', 'hunger', 'mood', 'first_name', 'unsubscribe_token'])
    ok(!(leaked in (resolved || {})), `resolution does not expose ${leaked}`);

  // The public GET is the only read path, and it must not accept a token at all.
  const workerSrc = (await import('fs')).readFileSync(new URL('../api/calculator-api.js', import.meta.url).pathname, 'utf8');
  const getFn = workerSrc.slice(workerSrc.indexOf('async function handleDripSurveyGet'), workerSrc.indexOf('async function handleDripSurveyView'));
  ok(getFn.length > 0, 'located the GET handler');
  ok(!/token|checkin_token|subscriber_id/.test(getFn), 'GET handler never reads a token or subscriber id');

  const payload = await (await fetch(`${REST}/drip_survey_responses?subscriber_id=eq.${subs.cw.id}&select=*`, { headers: H })).json();
  const cols = Object.keys(payload[0] || {});
  for (const forbidden of ['email', 'weight', 'first_name', 'checkin_token'])
    ok(!cols.includes(forbidden), `response row does not copy ${forbidden} (no shadow profile)`);
}

// 9. Calculator context is JOINABLE server side, without copying it onto the row.
{
  const joined = await (await rest(
    `/drip_subscribers?id=eq.${subs.cw.id}&select=id,email,site`)).json();
  ok(joined.length === 1, 'subscriber row reachable by id for a server-side join');
  // THE JOIN MUST BE CASE-INSENSITIVE. drip_subscribers is lowercased on insert by
  // the worker; calculator_sessions_v2 stores whatever the reader typed, and 9 rows
  // carry uppercase. An exact-match join silently drops them, which would show up
  // later as a payback that mysteriously has no data for ~2% of people. Assert the
  // correct form works AND that we know why the naive form is wrong.
  const real = await (await rest(
    `/drip_subscribers?site=eq.cw&source=eq.calculator&select=id,email&limit=20`)).json();
  let joinable = 0;
  for (const r of real) {
    const c = await (await rest(
      `/calculator_sessions_v2?email=ilike.${encodeURIComponent(r.email)}&select=id,age,sex,goal&limit=1`)).json();
    if (c.length) joinable++;
  }
  ok(real.length > 0 && joinable === real.length,
    'every sampled calculator-sourced subscriber joins to calculator_sessions_v2 (case-insensitive)',
    `${joinable}/${real.length}`);
}

// 8. Historical anonymous rows are untouched.
{
  const histAfter = (await (await rest('/drip_survey_responses?select=id')).json()).length;
  const stillAnon = (await (await rest('/drip_survey_responses?subscriber_id=is.null&select=id')).json()).length;
  const ours = (await answersFor(subs.cw.id)).length + (await answersFor(subs.kd.id)).length;
  ok(histAfter === HIST_BEFORE + ours, 'no historical row was deleted or added behind our back', `${HIST_BEFORE} -> ${histAfter}, ours ${ours}`);
  ok(stillAnon === HIST_BEFORE, `all ${HIST_BEFORE} pre-existing rows remain anonymous`, `${stillAnon}`);
}

await teardown();
{
  const left = await (await rest(`/drip_subscribers?email=in.("${FIX.cw}","${FIX.kd}")&select=id`)).json();
  ok(left.length === 0, 'fixtures cleaned up');
  const finalCount = (await (await rest('/drip_survey_responses?select=id')).json()).length;
  ok(finalCount === HIST_BEFORE, `response table back to its original ${HIST_BEFORE} rows`, `${finalCount}`);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
