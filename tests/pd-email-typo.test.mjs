#!/usr/bin/env node
// PescoDial calculator email autocorrect (pescodial/static/js/calculator.js).
// Run: node tests/pd-email-typo.test.mjs
// WHY: a real PD signup arrived as 'aol..ccoom' on 2026-10-04, 90 seconds after
// the same reader's correct aol.com signup. The client must fix the field the same
// way the worker's correctEmailTypo does, and both copies of the file must match.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const repo = new URL('..', import.meta.url).pathname;
const src = readFileSync(repo + 'pescodial/static/js/calculator.js', 'utf8');
const sandbox = { document: { querySelector: () => null } };
vm.createContext(sandbox);
vm.runInContext(src + '\n;globalThis.__fix = pdFixEmail;', sandbox);
const fix = sandbox.__fix;

let pass = 0, fail = 0;
const check = (label, got, want) => {
  if (got === want) pass++;
  else { fail++; console.error(`FAIL ${label}\n  got  ${got}\n  want ${want}`); }
};
check('aol..ccoom', fix('x@aol..ccoom'), 'x@aol.com');
check('gmail..com', fix('x@gmail..com'), 'x@gmail.com');
check('known typo gnail', fix(' X@Gnail.com '), 'x@gmail.com');
check('gmail.con', fix('x@gmail.con'), 'x@gmail.com');
check('real address untouched (case kept)', fix('Test@Fuse.Net'), 'Test@Fuse.Net');
check('gmx untouched', fix('a@gmx.com'), 'a@gmx.com');
check('garbage untouched', fix('nope'), 'nope');
check('public and static copies match',
  readFileSync(repo + 'pescodial/public/js/calculator.js', 'utf8') === src, true);

console.info(`pd-email-typo: ${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
