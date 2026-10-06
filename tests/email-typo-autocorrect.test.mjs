#!/usr/bin/env node
/**
 * tests/email-typo-autocorrect.test.mjs
 *
 * Run it:
 *     node tests/email-typo-autocorrect.test.mjs
 *
 * No network: global fetch is stubbed to answer the DNS-over-HTTPS lookups.
 *
 * WHY: the 2026-08-10 gate only BLOCKED dead domains, and 'gnail.com' is a real
 * registered domain, so a real KD signup at gnail.com passed and bounced on
 * 2026-09-20. Brew 2026-09-30: "fix the typos don't just block them". Pins:
 *   1. known misspellings are corrected, even when the typo domain resolves;
 *   2. an address with no known typo comes back byte-identical (case untouched);
 *   3. a dead domain one slip from a big provider is corrected, not refused;
 *   4. a dead domain with no close match is still refused;
 *   5. a real domain near gmail.com that is NOT on the list is left alone.
 */
const API_JS = new URL('../api/calculator-api.js', import.meta.url).pathname;
const mod = await import('file://' + API_JS);
const fix = mod.__test_correctEmailTypo;
const resolve = mod.__test_resolveSignupEmail;

// Domains that "exist" for the DNS stub. Everything else is NXDOMAIN.
const LIVE = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'gnail.com', 'gmx.com', 'fuse.net']);
globalThis.fetch = async (url) => {
  const u = new URL(url);
  const name = u.searchParams.get('name');
  const type = u.searchParams.get('type');
  const live = LIVE.has(name);
  return new Response(JSON.stringify({
    Status: live ? 0 : 3,
    Answer: live ? [{ type: type === 'MX' ? 15 : 1, data: 'x' }] : [],
  }), { status: 200 });
};
console.log = () => {};

let pass = 0, fail = 0;
const check = (label, got, want) => {
  if (JSON.stringify(got) === JSON.stringify(want)) { pass++; }
  else { fail++; console.error(`FAIL ${label}\n  got  ${JSON.stringify(got)}\n  want ${JSON.stringify(want)}`); }
};

// 1. known misspellings, corrected synchronously
check('gnail', fix('user@gnail.com').email, 'user@gmail.com');
check('gmail.vom', fix('someone@gmail.vom').email, 'someone@gmail.com');
check('yagoo', fix('foo@yagoo.com').email, 'foo@yahoo.com');
check('hotmial', fix('a@hotmial.com').email, 'a@hotmail.com');
check('trim+case on a typo', fix('  User@GNAIL.com ').email, 'user@gmail.com');
check('correctedFrom recorded', fix('x@gmail.con').correctedFrom, 'x@gmail.con');

// 2. untouched when not a typo
check('mixed case kept', fix('Test@Fuse.Net').email, 'Test@Fuse.Net');
check('no correctedFrom', fix('a@gmail.com').correctedFrom, null);
check('garbage kept', fix('not-an-email').email, 'not-an-email');

// 3-5. enrollment path with DNS
check('resolve gnail (resolves, still fixed)', await resolve('you@gnail.com'), { email: 'you@gmail.com', correctedFrom: 'you@gnail.com', error: null });
const dead = await resolve('x@gmaik.com');
check('dead near-miss corrected', [dead.email, dead.correctedFrom, dead.error], ['x@gmail.com', 'x@gmaik.com', null]);
const unfixable = await resolve('b@zzqqxx.org');
check('dead, no match: refused', [unfixable.email, unfixable.error !== null], ['b@zzqqxx.org', true]);
check('real gmx.com left alone', await resolve('test@gmx.com'), { email: 'test@gmx.com', correctedFrom: null, error: null });
check('real fuse.net lowercased only', (await resolve('Bar@Fuse.net')).email, 'bar@fuse.net');

// 6. stuttered dead domains get a suggestion (malformed ones like 'aol..ccoom' are
//    refused upstream by isPlausibleEmail, see email-validation.test.mjs)
check('dead stutter via resolve', (await resolve('x@aol.ccoom')).email, 'x@aol.com');

console.log = console.info;
console.info(`email-typo-autocorrect: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
