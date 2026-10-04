#!/usr/bin/env node
// The PescoDial site's browser bundle (pescodial/static/js/pd-macros.js) must
// compute exactly what the worker computes, on every golden case. It is built
// from the same calculations.ts as the CW calculator; this catches a stale
// bundle after an engine change (rebuild: node pescodial/scripts/build_pd_calc.mjs).
// No deps beyond node: the bundle runs in a vm sandbox, no esbuild needed.
// Run: node tests/pd-macros-bundle.test.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { grid } from './macro_parity/golden_test.mjs';

const repo = new URL('..', import.meta.url).pathname;
const src = readFileSync(repo + 'api/calculator-api.js', 'utf8');
const start = src.indexOf('function calculateMacros(formData)');
let depth = 0, i = src.indexOf('{', start);
for (; i < src.length; i++) { if (src[i] === '{') depth++; else if (src[i] === '}' && --depth === 0) break; }
const worker = new Function('console', `${src.slice(start, i + 1)}; return calculateMacros;`)({ log() {}, warn() {}, error() {} });

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(readFileSync(repo + 'pescodial/static/js/pd-macros.js', 'utf8') + '\n;window.PDMacros = PDMacros;', sandbox);
const bundle = sandbox.window.PDMacros.calculateMacrosCanonical;

let bad = 0;
const cases = grid();
for (const input of cases) {
  const w = worker(input), b = bundle(input);
  if (!(w.calories === b.calories && w.protein_grams === b.protein && w.fat_grams === b.fat && w.carbs_grams === b.carbs
        && w.targetSuppressed === b.targetSuppressed)) {
    if (bad++ < 5) console.error('MISMATCH', JSON.stringify(input), JSON.stringify(w), JSON.stringify(b));
  }
}
const pesco = cases.filter(c => String(c.diet || '').startsWith('pesco-')).length;
if (bad) { console.error(`${bad}/${cases.length} cases: PescoDial bundle diverges from the worker. Rebuild it.`); process.exit(1); }
console.log(`pd-macros bundle === worker on ${cases.length}/${cases.length} cases (${pesco} PescoDial)`);
