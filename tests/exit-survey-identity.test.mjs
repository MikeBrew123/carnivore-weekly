#!/usr/bin/env node
/**
 * tests/exit-survey-identity.test.mjs
 *
 * Run it:
 *     node tests/exit-survey-identity.test.mjs
 *
 * No database needed: global fetch is stubbed, so this drives the REAL worker
 * handlers and records what they would have written.
 *
 * WHY: after the 2026-09-12 identity change, every check-in answer carried a
 * subscriber_id except the unsubscribe exit survey (day 0, source=unsubscribe).
 * Unsubscribe links are keyed by email, not checkin_token, so the page had nothing
 * to send. The fix is a signed, expiring, day-0-only ticket minted by the
 * unsubscribe handler. These tests pin three things:
 *   1. the exit answer is attributed to the subscriber who unsubscribed;
 *   2. the ticket cannot be replayed onto a check-in day, another site, or after
 *      expiry, and a forged or tampered ticket links nothing;
 *   3. the unsubscribe page never exposes the checkin_token.
 */
const mod = await import('file://' + new URL('../api/calculator-api.js', import.meta.url).pathname);
const mint = mod.__test_mintExitTicket;
const verify = mod.__test_verifyExitTicket;
const submit = mod.__test_handleDripSurveySubmit;
const unsubscribe = mod.__test_handleUnsubscribe;
for (const [n, f] of [['mintExitTicket', mint], ['verifyExitTicket', verify], ['handleDripSurveySubmit', submit], ['handleUnsubscribe', unsubscribe]]) {
  if (typeof f !== 'function') { console.error(`FATAL: missing test export ${n}`); process.exit(1); }
}

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log(`  PASS  ${m}`); } else { fail++; console.log(`  FAIL  ${m}${d ? ' :: ' + d : ''}`); } };

const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'test-service-key' };
const SUB = '11111111-2222-4333-8444-555555555555';
const CHECKIN_TOKEN = 'a'.repeat(64);
const Q0 = 'q0000000-0000-4000-8000-000000000000';
const Q1 = 'q1111111-0000-4000-8000-000000000000';
const OPT0 = 'o0000000-0000-4000-8000-000000000000';
const OPT1 = 'o1111111-0000-4000-8000-000000000000';

// Minimal PostgREST stand-in. Records inserts so we can assert on the stored rows.
let inserted = [];
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  const method = (init.method || 'GET').toUpperCase();
  const json = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });
  if (u.includes('/drip_subscribers') && method === 'PATCH') {
    return json(u.includes('site=eq.cw') ? [{ id: SUB }] : []);
  }
  if (u.includes('/drip_subscribers') && u.includes('checkin_token=eq.')) {
    return json(u.includes(CHECKIN_TOKEN) ? [{ id: SUB, site: 'cw' }] : []);
  }
  if (u.includes('/drip_survey_questions')) {
    const day = /day=eq\.(\d+)/.exec(u)?.[1];
    return json(day === '0' ? [{ id: Q0, question_type: 'single', question_key: 'exit_reason' }]
                            : [{ id: Q1, question_type: 'single', question_key: 'energy' }]);
  }
  if (u.includes('/drip_survey_options')) {
    return json([{ id: OPT0, question_id: Q0, display_order: 1 }, { id: OPT1, question_id: Q1, display_order: 1 }]);
  }
  if (u.includes('/drip_survey_responses') && method === 'POST') {
    inserted.push(...JSON.parse(init.body));
    return new Response(null, { status: 201 });
  }
  if (method === 'DELETE' || method === 'PATCH') return new Response(null, { status: 204 });
  return json([]);
};

const post = async (body) => {
  inserted = [];
  const res = await submit(new Request('https://x/api/v1/drip-survey', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: 'cw', fingerprint: 'fp-test', ...body }),
  }), env);
  return { status: res.status, rows: inserted };
};

console.log('\nA. ticket mint / verify');
const now = Date.now();
const t = await mint(env, SUB, 'cw', now);
ok(typeof t === 'string' && t.startsWith(SUB + '.cw.'), 'mints a ticket for a real subscriber id');
ok(await verify(env, t, 'cw', now) === SUB, 'valid ticket resolves to the subscriber');
ok(await verify(env, t, 'kd', now) === null, 'wrong site links nothing');
ok(await verify(env, t, 'cw', now + 3 * 60 * 60 * 1000) === null, 'expired ticket links nothing');
ok(await verify({ ...env, SUPABASE_SERVICE_ROLE_KEY: 'other' }, t, 'cw', now) === null, 'ticket signed with another secret links nothing');
const tampered = t.replace(SUB, '99999999-2222-4333-8444-555555555555');
ok(await verify(env, tampered, 'cw', now) === null, 'swapping the subscriber id breaks the signature');
const bumped = t.replace(/\.(\d+)\./, (_, e) => `.${Number(e) + 1e9}.`);
ok(await verify(env, bumped, 'cw', now) === null, 'extending the expiry breaks the signature');
for (const junk of [null, undefined, '', 'x', 42, {}, CHECKIN_TOKEN, 'a'.repeat(500)]) {
  ok(await verify(env, junk, 'cw', now) === null, `junk ticket ${JSON.stringify(junk)?.slice(0, 20)} links nothing`);
}
ok(await mint(env, 'not-a-uuid', 'cw') === null, 'refuses to mint for a malformed id');
ok(await mint(env, SUB, 'zz') === null, 'refuses to mint for an unknown site');

console.log('\nB. submit handler');
let r = await post({ day: 0, source: 'unsubscribe', option_ids: [OPT0], exit_ticket: t });
ok(r.status === 200 && r.rows.length === 1 && r.rows[0].subscriber_id === SUB, 'exit answer with ticket carries subscriber_id', JSON.stringify(r.rows));
ok(r.rows[0]?.answered_via === 'page', 'exit answer is answered_via=page');
ok(!JSON.stringify(r.rows).includes(t), 'the ticket itself is never stored');

r = await post({ day: 0, source: 'unsubscribe', option_ids: [OPT0] });
ok(r.status === 200 && r.rows[0]?.subscriber_id === null && r.rows[0]?.answered_via === null, 'exit answer without ticket stays anonymous');

r = await post({ day: 0, source: 'unsubscribe', option_ids: [OPT0], exit_ticket: tampered });
ok(r.status === 200 && r.rows[0]?.subscriber_id === null, 'forged ticket is recorded anonymously, not rejected');

r = await post({ day: 1, source: 'drip', option_ids: [OPT1], exit_ticket: t });
ok(r.status === 200 && r.rows[0]?.subscriber_id === null, 'ticket cannot attribute a day 1-28 check-in');

r = await post({ day: 0, source: 'drip', option_ids: [OPT0], exit_ticket: t });
ok(r.status === 200 && r.rows[0]?.subscriber_id === null, 'ticket only honoured with source=unsubscribe');

r = await post({ day: 1, source: 'drip', option_ids: [OPT1], token: CHECKIN_TOKEN, answered_via: 'one_tap' });
ok(r.rows[0]?.subscriber_id === SUB && r.rows[0]?.answered_via === 'one_tap', 'check-in token path unchanged');

console.log('\nC. unsubscribe page');
const page = await (await unsubscribe(new URL('https://x/api/v1/unsubscribe?email=reader%40example.test&site=cw'), env)).text();
const m = /var ticket=("[^"]*"|null);/.exec(page);
ok(m && m[1] !== 'null', 'page embeds an exit ticket for a drip subscriber');
ok(m && await verify(env, JSON.parse(m[1]), 'cw') === SUB, 'embedded ticket resolves to that subscriber');
ok(page.includes('exit_ticket:ticket'), 'exit survey POST sends the ticket');
ok(!page.includes(CHECKIN_TOKEN) && !/checkin_token/.test(page), 'page never exposes the checkin_token');

const pageKd = await (await unsubscribe(new URL('https://x/api/v1/unsubscribe?email=reader%40example.test&site=kd'), env)).text();
ok(/var ticket=null;/.test(pageKd), 'no drip row: no ticket, exit survey stays anonymous');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
