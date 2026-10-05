#!/usr/bin/env node
/**
 * tests/email-validation.test.mjs
 *
 * Run it:
 *     node tests/email-validation.test.mjs
 *
 * WHY: on 2026-10-04 a PescoDial reader typed "name@aol..ccoom" and the worker
 * stored it in newsletter_subscribers, because the old regex let "aol." and "."
 * through as domain parts. Brew approved one shared shape check
 * (isPlausibleEmail) for every email-accepting endpoint. Pins:
 *   1. the accept/reject table for isPlausibleEmail;
 *   2. POST /api/v1/subscribe through the real worker router returns
 *      400 INVALID_EMAIL for name@aol..ccoom and never touches Supabase/Resend;
 *   3. POST /create-checkout refuses the same address with 400 INVALID_EMAIL;
 *   4. a plus-addressed gmail address still gets past the gate on subscribe;
 *   5. no endpoint keeps a private email regex (one validator, used everywhere).
 *
 * No network: global fetch is stubbed and records every call.
 */
import { readFileSync } from 'node:fs';

const API_JS = new URL('../api/calculator-api.js', import.meta.url).pathname;
const mod = await import('file://' + API_JS);
const worker = mod.default;
const isPlausible = mod.__test_isPlausibleEmail;

const calls = [];
globalThis.fetch = async (url) => {
  const u = String(url);
  calls.push(u);
  if (u.includes('cloudflare-dns.com')) {
    return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15, data: 'mx' }] }), { status: 200 });
  }
  return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const quiet = console.log;
console.log = () => {};
console.warn = () => {};

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => {
  if (ok) { pass++; quiet(`PASS ${label}`); }
  else { fail++; quiet(`FAIL ${label}${detail ? ': ' + detail : ''}`); }
};

// ---- 1. the table ----
const ACCEPT = [
  // Fixtures stay inside scripts/check-pii.sh ALLOW_RE (public repo), so the brief's
  // plus, dotted-local, co.uk and digit cases are split across allowlisted addresses.
  'testuser+b@gmail.com', 'first.last@example.com', 'x@mail.co.uk', 'x@sub-domain.photography', 'x@2.io', '1@example.com',
  'name@aol.com', "o'brien@example.com", 'x@x-y.z9.example.com', 'test%b_c-d@example.com', 'NAME@Example.COM',
];
const REJECT = [
  'name@aol..ccoom', 'name@aol..com', 'na..me@example.com', '.name@example.com', 'name.@example.com',
  'name@-x.com', 'name@x-.com', 'name@x.c', 'a b@x.com', 'a@@x.com', 'a@b@x.com',
  'name@.x.com', 'name@x.com.', 'name@x', 'name@x.c0m', 'name@x.abcdefghijklmnopqrstuvwxy',
  '@x.com', 'name@', '', 'name@x .com', `${'a'.repeat(250)}@x.com`,
];
for (const e of ACCEPT) check(`isPlausibleEmail accepts ${e}`, isPlausible(e) === true);
for (const e of REJECT) check(`isPlausibleEmail rejects ${JSON.stringify(e.length > 40 ? e.slice(0, 20) + '...' : e)}`, isPlausible(e) === false);

// ---- 2-4. real handlers through the router ----
const env = {
  SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'r',
  STRIPE_SECRET_KEY: 'sk_test_x', ENVIRONMENT: 'test',
};
const post = (path, body) => worker.fetch(new Request(`https://api.test${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: 'https://pescodial.com' },
  body: JSON.stringify(body),
}), env, { waitUntil() {} });

for (const bad of ['name@aol..ccoom', 'name@aol..com']) {
  calls.length = 0;
  const res = await post('/api/v1/subscribe', { email: bad, site: 'pd', source: 'calculator', diet_type: 'pesco-mediterranean' });
  const j = await res.json().catch(() => ({}));
  check(`subscribe rejects ${bad} with 400 INVALID_EMAIL`, res.status === 400 && j.code === 'INVALID_EMAIL', `got ${res.status} ${JSON.stringify(j)}`);
  check(`subscribe ${bad} never reaches Supabase or Resend`, !calls.some(u => u.includes('db.test') || u.includes('resend')), calls.join(', '));
}

calls.length = 0;
const co = await post('/create-checkout', { email: 'name@aol..ccoom', tier_id: 'bundle', site: 'pd', form_data: { diet: 'pesco-mediterranean' } });
const coj = await co.json().catch(() => ({}));
check('create-checkout rejects name@aol..ccoom with 400 INVALID_EMAIL', co.status === 400 && coj.code === 'INVALID_EMAIL', `got ${co.status} ${JSON.stringify(coj)}`);

calls.length = 0;
const ok = await post('/api/v1/subscribe', { email: 'testuser+b@gmail.com', site: 'pd', source: 'calculator', diet_type: 'pesco-mediterranean' });
const okj = await ok.json().catch(() => ({}));
check('subscribe lets testuser+b@gmail.com past the email gate', okj.code !== 'INVALID_EMAIL' && calls.some(u => u.includes('db.test')), `got ${ok.status} ${JSON.stringify(okj)}`);

// ---- 5. one validator ----
const src = readFileSync(API_JS, 'utf8');
check('no isValidEmail left (one shared validator)', !/isValidEmail\(/.test(src));
check('no inline email regex outside isPlausibleEmail', !/\[\^\\s@\]\+@/.test(src));
const uses = (src.match(/isPlausibleEmail\(/g) || []).length;
check('isPlausibleEmail is used by every email endpoint (>=7 call sites)', uses >= 8, `found ${uses - 1} call sites`);

quiet(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
