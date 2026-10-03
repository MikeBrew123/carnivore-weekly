// PescoDial sign-up routing (Brew, 2026-10-03).
// pesco-* calculator diets join the PescoDial newsletter + drip; CW's plain
// "pescatarian" stays on the CW newsletter with no drip; keto/low carb stay KD;
// carnivore stays CW. Extracts subscribeCore from the worker and runs it with
// a mocked fetch, so it checks the real routing code, not a copy.
//
// Run: node tests/pd-subscribe-routing.test.mjs
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../api/calculator-api.js', import.meta.url), 'utf8');
const start = src.indexOf('async function subscribeCore(');
const end = src.indexOf('\n}\n', start) + 2;
assert.ok(start > 0 && end > start, 'subscribeCore not found');

const calls = [];
globalThis.fetch = async (url, opts) => {
  calls.push({ url: String(url), body: opts && opts.body ? JSON.parse(opts.body) : null });
  return new Response('{}', { status: 200 });
};
const subscribeCore = new Function(`${src.slice(start, end)}; return subscribeCore;`)();
const env = { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'k' };

async function route(diet, site = null) {
  calls.length = 0;
  await subscribeCore(env, 'a@b.co', 'calculator', diet, site);
  const nl = calls.find(c => c.url.includes('upsert_newsletter_subscriber'));
  const drip = calls.find(c => c.url.includes('/drip_subscribers'));
  return { newsletter: nl && nl.body.p_site, drip: drip ? drip.body.site : null };
}

const cases = [
  ['pesco-mediterranean', null, { newsletter: 'pd', drip: 'pd' }],
  ['pesco-keto', null, { newsletter: 'pd', drip: 'pd' }],
  ['pesco-lowcarb', null, { newsletter: 'pd', drip: 'pd' }],
  ['pesco-carnivore', null, { newsletter: 'pd', drip: 'pd' }],
  ['pescatarian', null, { newsletter: 'cw', drip: null }],
  ['keto', null, { newsletter: 'kd', drip: 'kd' }],
  ['lowcarb', null, { newsletter: 'kd', drip: 'kd' }],
  ['carnivore', null, { newsletter: 'cw', drip: 'cw' }],
  [null, 'pd', { newsletter: 'pd', drip: 'pd' }],
  [null, 'kd', { newsletter: 'kd', drip: 'kd' }],
  [null, null, { newsletter: 'cw', drip: 'cw' }],
];

let failed = 0;
for (const [diet, site, want] of cases) {
  const got = await route(diet, site);
  try {
    assert.deepEqual(got, want);
    console.log(`PASS diet=${diet} site=${site} -> ${JSON.stringify(got)}`);
  } catch {
    failed++;
    console.log(`FAIL diet=${diet} site=${site}: want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
  }
}
process.exit(failed ? 1 : 0);
