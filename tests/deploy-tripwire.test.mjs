#!/usr/bin/env node
/**
 * tests/deploy-tripwire.test.mjs
 *
 * DEPLOYMENT TRIPWIRE FOR DORMANT REPORT GENERATORS.
 *
 * Run it:
 *     node tests/deploy-tripwire.test.mjs
 *
 * No dependencies, no network. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * api/calculator-api.js is the one worker that builds the paid Carnivore Weekly
 * report. Two other files in api/ can also produce one:
 *
 *   api/generate-report.js       a copy of the pre-2026-09-08 worker, carrying the
 *                                original two-independent-rotations design, its own
 *                                grocery generator, and a raw {{goal}} render.
 *   api/verify-and-generate.ts   a different design entirely: it asks Claude for all
 *                                13 sections in one call. It has `export default`,
 *                                so it is a deployable worker entry, and it routes
 *                                POST /api/v1/assessment/verify-and-generate.
 *
 * Neither is deployed today. Neither is authorized for deletion, and neither should be
 * deleted on a hunch: something may still want them. But "not deployed today" is a fact
 * about a config file, and config files change. If either becomes the `main` of a
 * Wrangler config, or gets a route, or gets deployed by CI, every fix made to the
 * canonical worker silently stops applying to customers.
 *
 * A comment cannot prevent that. This file can: it reads the actual deployment
 * surface and fails the build.
 *
 * THE INVARIANT:
 *
 *     Exactly one file may be a production report generator, and it must be the one
 *     the report suites actually test.
 *
 * If you are here because this went red, you have either deployed a second generator
 * or deliberately promoted one. If it is deliberate, the promoted file must first pass
 * tests/report-safety.test.mjs and tests/report-integrity.test.mjs, and CANONICAL below
 * must be updated in the same commit.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

/** The one file allowed to be a deployed report generator. */
const CANONICAL = 'calculator-api.js';

/** Files that can produce a report but must never be deployed as one. */
const DORMANT = ['generate-report.js', 'verify-and-generate.js', 'verify-and-generate.ts'];

const failures = [];
let passed = 0;
const check = (label, ok, detail = '') => ok ? passed++ : failures.push({ label, detail });

/** Every file in the repo that git tracks, minus vendored and scratch trees. */
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.wrangler', 'dist', 'build', '.claude'].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const files = walk(ROOT);
const rel = f => path.relative(ROOT, f);

// -------------------------------------------------------------------------
// 1. No Wrangler config may point `main` at a dormant generator.
// -------------------------------------------------------------------------
const wranglers = files.filter(f => path.basename(f) === 'wrangler.toml');
check('at least one wrangler config was found', wranglers.length > 0,
  'the tripwire found nothing to check, which means it is not protecting anything');

for (const w of wranglers) {
  const src = fs.readFileSync(w, 'utf8');
  for (const m of src.matchAll(/^\s*main\s*=\s*["']([^"']+)["']/gm)) {
    const target = path.basename(m[1]);
    check(`${rel(w)}: main is not a dormant generator (${target})`,
      !DORMANT.includes(target),
      `main = "${m[1]}". A dormant report generator is about to be deployed. It has not ` +
      `passed the report suites and does not share the canonical meal/grocery/goal path.`);
  }
}

// The CW report worker specifically must point at the canonical file.
const cwWrangler = wranglers.find(w => rel(w) === 'api/wrangler.toml');
check('api/wrangler.toml exists', !!cwWrangler, 'the report worker config is gone');
if (cwWrangler) {
  const src = fs.readFileSync(cwWrangler, 'utf8');
  const main = (src.match(/^\s*main\s*=\s*["']([^"']+)["']/m) || [])[1];
  check(`api/wrangler.toml deploys ${CANONICAL}`, path.basename(main || '') === CANONICAL,
    `main = "${main}", expected "${CANONICAL}"`);
}

// -------------------------------------------------------------------------
// 2. No package manifest may name a dormant generator as its entry point.
//    api/package.json named generate-report.js as "main" until 2026-09-08.
// -------------------------------------------------------------------------
for (const f of files.filter(f => path.basename(f) === 'package.json')) {
  let pkg;
  try { pkg = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  if (!pkg.main) continue;
  check(`${rel(f)}: main is not a dormant generator`,
    !DORMANT.includes(path.basename(pkg.main)),
    `main = "${pkg.main}"`);
}

// -------------------------------------------------------------------------
// 3. No CI workflow may deploy a dormant generator.
// -------------------------------------------------------------------------
for (const f of files.filter(f => f.includes('.github/workflows') && /\.ya?ml$/.test(f))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const d of DORMANT) {
    const deploys = new RegExp(`wrangler[^\\n]*deploy[^\\n]*${d.replace('.', '\\.')}`).test(src);
    check(`${rel(f)}: does not deploy ${d}`, !deploys, `a workflow deploys a dormant generator`);
  }
}

// -------------------------------------------------------------------------
// 4. A dormant generator may not gain a production route binding.
//    verify-and-generate.ts already declares one internally; what must not happen is
//    the canonical worker delegating to it, or a config routing traffic at it.
// -------------------------------------------------------------------------
const canonicalSrc = fs.readFileSync(path.join(ROOT, 'api', CANONICAL), 'utf8');
for (const d of DORMANT) {
  const stem = d.replace(/\.(js|ts)$/, '');
  check(`the canonical worker does not import or delegate to ${d}`,
    !new RegExp(`(from|require\\()\\s*['"][^'"]*${stem}['"]`).test(canonicalSrc),
    `${CANONICAL} pulls in a dormant generator, so requests can reach it`);
}
for (const w of wranglers) {
  const src = fs.readFileSync(w, 'utf8');
  for (const d of DORMANT) {
    const stem = d.replace(/\.(js|ts)$/, '');
    check(`${rel(w)}: no binding references ${d}`, !src.includes(stem),
      `a Wrangler config mentions a dormant generator`);
  }
}

// -------------------------------------------------------------------------
// 5. The canonical worker is the one the report suites actually exercise.
//    A tripwire that guards a file nobody tests is theatre.
// -------------------------------------------------------------------------
for (const suite of ['report-integrity.test.mjs', 'report-safety.test.mjs']) {
  const src = fs.readFileSync(path.join(ROOT, 'tests', suite), 'utf8');
  check(`tests/${suite} loads api/${CANONICAL}`, src.includes(CANONICAL),
    `the suite does not test the file this tripwire protects`);
}

// -------------------------------------------------------------------------
// Report
// -------------------------------------------------------------------------
console.log(`\ndeploy-tripwire: ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  ${f.label}\n        ${f.detail}`);
  console.log('\nExactly one file may be a deployed report generator, and it must be the');
  console.log('one the report suites test. See the header of this file.\n');
  process.exit(1);
}
console.log(`Only api/${CANONICAL} is deployable as a report generator, and it is the file`);
console.log('tests/report-integrity.test.mjs and tests/report-safety.test.mjs exercise.\n');
