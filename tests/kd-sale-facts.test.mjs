#!/usr/bin/env node
// KetoDial worker: saleFacts() and the landing_page / ga_client_id validation in
// handleSession. Offline: saleFacts is private, so its source is extracted and
// evaluated with the real KD_GIFT_REF_RE; handleSession is driven through the
// worker's own fetch handler with global fetch stubbed (nothing leaves the process).
// Run: node tests/kd-sale-facts.test.mjs
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKER = path.join(REPO, 'ketodial/worker/index.js');
let failed = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + extra}`); if (!ok) failed++; };

// ---- saleFacts, extracted from source ----
const src = readFileSync(WORKER, 'utf8');
const m = src.match(/function saleFacts\([\s\S]*?\n}\n/);
check('S0. saleFacts found in worker source', !!m);
const giftSrc = readFileSync(path.join(REPO, 'api/gift.js'), 'utf8');
const reSrc = giftSrc.match(/export const KD_GIFT_REF_RE = (\/.*\/);/);
check('S0b. KD_GIFT_REF_RE found in api/gift.js', !!reSrc);
const ctx = { Date, Number }; vm.createContext(ctx);
vm.runInContext(`const KD_GIFT_REF_RE = ${reSrc[1]};\n${m[0]}\nthis.saleFacts = saleFacts;`, ctx);
const saleFacts = ctx.saleFacts;
const nowS = Math.floor(Date.now() / 1000);

const gift = saleFacts('kg_' + 'a'.repeat(32), { created: nowS - 60, amount_total: 1099, currency: 'usd' });
check('S1. gift ref -> gift true, amount 0, fresh false', gift.gift === true && gift.amount_cents === 0 && gift.fresh === false, JSON.stringify(gift));
const fresh = saleFacts('cs_test_a', { created: nowS - 3600, amount_total: 1099, currency: 'usd' });
check('S2. stripe session 1h old -> fresh true, amount 1099, USD, gift false', fresh.fresh === true && fresh.amount_cents === 1099 && fresh.currency === 'USD' && fresh.gift === false, JSON.stringify(fresh));
const stale = saleFacts('cs_test_a', { created: nowS - 2 * 86400, amount_total: 1099, currency: 'usd' });
check('S3. stripe session 2 days old -> fresh false', stale.fresh === false && stale.gift === false, JSON.stringify(stale));
const nocreated = saleFacts('cs_test_a', { amount_total: 1099 });
check('S4. no created timestamp -> fresh false', nocreated.fresh === false);

// ---- handleSession validation, through the real handler ----
const mod = await import(pathToFileURL(WORKER).href);
const realFetch = globalThis.fetch;
async function postSession(body) {
  let saved = null;
  globalThis.fetch = async (url, opts = {}) => {
    if (!String(url).startsWith('https://stub.invalid')) throw new Error('unexpected network call ' + url);
    saved = JSON.parse(opts.body);
    return new Response('', { status: 201 });
  };
  try {
    const res = await mod.default.fetch(new Request('https://w.test/session', { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
      { SUPABASE_URL: 'https://stub.invalid', SUPABASE_SERVICE_ROLE_KEY: 'stub' });
    return { status: res.status, saved };
  } finally { globalThis.fetch = realFetch; }
}
const base = { sex: 'female', age: 40, goal: 'lose' };
const lp = async v => (await postSession({ ...base, landing_page: v })).saved?.landing_page;
const ga = async v => (await postSession({ ...base, ga_client_id: v })).saved?.ga_client_id;

check('L1. valid landing_page kept', (await lp('/recipes?x=1')) === '/recipes?x=1');
check('L2. javascript:x -> /', (await lp('javascript:x')) === '/');
check('L3. leading space -> /', (await lp(' /a')) === '/');
check('L4. 300 chars -> /', (await lp('/' + 'a'.repeat(299))) === '/');
check('L5. 200 chars kept', (await lp('/' + 'a'.repeat(199))) === '/' + 'a'.repeat(199));
check('L6. embedded whitespace -> /', (await lp('/a b')) === '/');
check('L7. missing -> /', (await lp(undefined)) === '/');
check('G1. valid ga id kept', (await ga('1234567890.1700000000')) === '1234567890.1700000000');
check("G2. 'GA1.1.1.2' -> null", (await ga('GA1.1.1.2')) === null);
check("G3. 'abc' -> null", (await ga('abc')) === null);
check('G4. missing -> null', (await ga(undefined)) === null);
check('G5. 13-digit part -> null', (await ga('1234567890123.1')) === null);

process.exit(failed ? 1 : 0);
