#!/usr/bin/env node
// Client-vs-worker macro parity (red-team step 3, 2026-08-30).
//
// Compiles the client's calculateMacrosCanonical (calculator2-demo TS source)
// and runs it against the worker's calculateMacros (api/calculator-api.js)
// over the same grid as the golden test. Any divergence in
// calories/protein/fat/carbs fails: the free results screen must always show
// the numbers the paid report will contain.
//
// Usage: node tests/macro_parity/parity_test.mjs
// Requires calculator2-demo/node_modules (npm ci) for esbuild.

import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { grid } from './golden_test.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');

// --- worker side (same extraction as golden_test) ---
function workerFn() {
  const src = readFileSync(join(repo, 'api', 'calculator-api.js'), 'utf8');
  const start = src.indexOf('function calculateMacros(formData)');
  if (start < 0) throw new Error('worker calculateMacros not found');
  let depth = 0, i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  const factory = new Function('console', `${src.slice(start, i + 1)}; return calculateMacros;`);
  return factory({ log() {}, warn() {}, error() {} });
}

// --- client side: compile the TS module with the project's own esbuild ---
async function clientFn() {
  const esbuild = join(repo, 'calculator2-demo', 'node_modules', '.bin', 'esbuild');
  const out = join(mkdtempSync(join(tmpdir(), 'calcparity-')), 'calculations.mjs');
  execFileSync(esbuild, [
    join(repo, 'calculator2-demo', 'src', 'lib', 'calculations.ts'),
    '--format=esm', '--platform=neutral', `--outfile=${out}`,
  ], { stdio: 'pipe' });
  const mod = await import(pathToFileURL(out).href);
  if (!mod.calculateMacrosCanonical) throw new Error('client calculateMacrosCanonical not exported');
  return mod.calculateMacrosCanonical;
}

const worker = workerFn();
const client = await clientFn();

let failures = 0;
const cases = grid();
for (const input of cases) {
  const w = worker(input);
  const c = client(input);
  const same = w.calories === c.calories && w.protein_grams === c.protein
            && w.fat_grams === c.fat && w.carbs_grams === c.carbs;
  if (!same) {
    if (failures < 10) {
      console.error(`PARITY MISMATCH: input=${JSON.stringify(input)}`);
      console.error(`  worker: ${JSON.stringify(w)}`);
      console.error(`  client: ${JSON.stringify(c)}`);
    }
    failures++;
  }
}
if (failures) {
  console.error(`\n${failures}/${cases.length} cases diverge between client and worker math.`);
  process.exit(1);
}
console.log(`macro parity: client === worker on ${cases.length}/${cases.length} cases`);
