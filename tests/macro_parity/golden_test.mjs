#!/usr/bin/env node
// Golden-value regression test for the worker's calculateMacros — the function
// that prices every $29 report's numbers (api/calculator-api.js).
//
// Red-team context (2026-08-30): the macro math exists twice (worker + client
// bundle) with four known divergences, and a refactor that renames a return
// key silently corrupts paid reports to `|| default` values. This test freezes
// the worker's current behavior across a grid of inputs. ANY change to its
// output — intended or not — fails CI until the golden file is regenerated on
// purpose with --update.
//
// Usage:  node tests/macro_parity/golden_test.mjs           # verify
//         node tests/macro_parity/golden_test.mjs --update  # re-freeze
//
// The client-vs-worker parity gate (step 3 of the plan) will reuse the same
// grid via grid() below.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const GOLDEN = join(here, 'golden.json');

// --- extract calculateMacros from the worker source (it's not an ES export) ---
function extractWorkerFn() {
  const src = readFileSync(join(repo, 'api', 'calculator-api.js'), 'utf8');
  const start = src.indexOf('function calculateMacros(formData)');
  if (start < 0) throw new Error('calculateMacros not found in api/calculator-api.js');
  let depth = 0, i = src.indexOf('{', start);
  const bodyStart = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  const fnSrc = src.slice(start, i + 1);
  // Silence its console noise inside the harness.
  const factory = new Function(
    'console',
    `${fnSrc}; return calculateMacros;`
  );
  const quiet = { log() {}, warn() {}, error() {} };
  return factory(quiet);
}

// --- the input grid ---------------------------------------------------------
// Covers every branch the red-team flagged: BMI>=30 protein basis, activity
// aliases + unknown-key 1.2 fallback, lifestyle||exercise precedence,
// 'lose'/'loss', deficit 0/10/undefined defaults, keto+lowcarb 20g carbs vs 0g,
// diet||selectedProtocol, heightCm||ft/in, and the all-defaults path.
export function grid() {
  const cases = [];
  const bodies = [
    { sex: 'male', age: 30, heightFeet: 6, heightInches: 0, weight: 200 },
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168 },
    { sex: 'male', age: 64, heightFeet: 5, heightInches: 10, weight: 312 }, // BMI>=30 (ISSUE-069)
    { sex: 'female', age: 45, heightCm: 165, weight: 240 },                 // BMI>=30, metric height
    { sex: 'female', age: 72, heightFeet: 5, heightInches: 2, weight: 145 },
    { sex: 'male', age: 22, heightCm: 183, weight: 160 },
  ];
  const activities = [
    { lifestyle: 'sedentary' }, { lifestyle: 'moderate' }, { lifestyle: 'extreme' },
    { exercise: 'none' },                       // exercise fallback path
    { lifestyle: 'veryactive' },                // alias key
    { lifestyle: 'cardio-bunny' },              // unknown -> 1.2, never 1.55
    {},                                         // neither -> 'moderate' default
  ];
  const goals = [
    { goal: 'lose' }, { goal: 'loss' }, { goal: 'gain' }, { goal: 'maintain' }, {},
  ];
  const deficits = [{}, { deficit: 10 }, { deficit: 25 }, { deficit: 0 }, { deficit: '20' }];
  const diets = [
    { diet: 'carnivore' }, { diet: 'keto' }, { diet: 'lowcarb' },
    { diet: 'pescatarian' }, { selectedProtocol: 'lion' }, { diet: 'vegan' }, {},
  ];
  let n = 0;
  for (const b of bodies)
    for (const a of activities)
      for (const g of goals)
        for (const d of deficits)
          for (const t of diets) {
            // Full cross-product is ~7k cases; sample deterministically to keep
            // the golden file reviewable while still hitting every branch pair.
            // Stride must be coprime to EVERY loop length (diets has 7 entries;
            // a stride of 7 aliased to always picking the same diet — caught
            // 2026-08-30 when a lowcarb math change produced a zero-case diff).
            if (n++ % 5 === 0) cases.push({ ...b, ...a, ...g, ...d, ...t });
          }

  // Branch-critical cases that must never be sampled out:
  cases.push(
    {},                                                       // all defaults
    { weight: 312, heightFeet: 5, heightInches: 10, sex: 'male', age: 64, lifestyle: 'sedentary', goal: 'lose', diet: 'carnivore' },
    { weight: 200, heightCm: 0, sex: 'male', age: 30, diet: 'carnivore' }, // heightCm 0 sentinel -> ft/in default
    { weight: 168, sex: 'female', age: 57, lifestyle: 'sedentary', goal: 'lose', deficit: 0, diet: 'keto' }, // falsy-0 deficit
  );

  // Goal weight (2026-09-06): protein basis when present. Every case below is
  // NEW - no existing case carries goalWeight, so the pre-existing golden
  // entries must not move at all when this ships.
  const goalWeights = [
    // 5'4" female, 168 lb: realistic goal, goal above current, BMI-30 goal, and
    // a fantasy goal that must clamp to the BMI 18.5 floor rather than cut protein.
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'carnivore', goalWeight: 140 },
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'keto', goalWeight: 140 },
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'carnivore', goalWeight: 95 },  // below floor
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'carnivore', goalWeight: 60 },  // far below floor
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'carnivore', goalWeight: 175 }, // goal above current
    // 312 lb male: goal weight must override the BMI>=30 proxy (ISSUE-069 path)
    { sex: 'male', age: 64, heightFeet: 5, heightInches: 10, weight: 312, goal: 'lose', diet: 'carnivore', goalWeight: 200 },
    { sex: 'male', age: 64, heightFeet: 5, heightInches: 10, weight: 312, goal: 'lose', diet: 'carnivore', goalWeight: 230 }, // goal still BMI>=30 -> proxy caps it
    // metric height, and a gain goal
    { sex: 'female', age: 45, heightCm: 165, weight: 240, goal: 'lose', diet: 'lowcarb', goalWeight: 160 },
    { sex: 'male', age: 22, heightCm: 183, weight: 160, goal: 'gain', deficit: 10, diet: 'carnivore', goalWeight: 185 },
    // non-low-carb diet: goal weight must NOT touch the 1.6g/kg branch
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'vegan', goalWeight: 140 },
    // junk values must fall back to current weight, not crash or zero out
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'carnivore', goalWeight: 0 },
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'carnivore', goalWeight: '' },
    { sex: 'female', age: 57, heightFeet: 5, heightInches: 4, weight: 168, goal: 'lose', diet: 'carnivore', goalWeight: 'abc' },
  ];
  cases.push(...goalWeights);

  // Self-service fat-loss floor (2026-09-10). All NEW cases: the floor only
  // moves a target that was already under 1200 (female) / 1500 (male), so the
  // pre-existing golden entries above must keep their calorie values.
  const guardrail = [
    // Case A, female: small sedentary profile whose 25% deficit lands under 1200.
    { sex: 'female', age: 68, heightFeet: 5, heightInches: 0, weight: 130, lifestyle: 'sedentary', goal: 'lose', deficit: 25, diet: 'carnivore' },
    { sex: 'female', age: 68, heightFeet: 5, heightInches: 0, weight: 130, lifestyle: 'sedentary', goal: 'lose', deficit: 10, diet: 'carnivore' },
    // Case A, male: under the 1500 floor.
    { sex: 'male', age: 72, heightFeet: 5, heightInches: 4, weight: 135, lifestyle: 'sedentary', goal: 'lose', deficit: 25, diet: 'carnivore' },
    // Case B, suppression: maintenance itself at or below the floor.
    { sex: 'female', age: 80, heightFeet: 4, heightInches: 10, weight: 95, lifestyle: 'sedentary', goal: 'lose', deficit: 10, diet: 'carnivore' },
    { sex: 'male', age: 85, heightFeet: 5, heightInches: 0, weight: 105, lifestyle: 'sedentary', goal: 'lose', deficit: 10, diet: 'carnivore' },
    // The floor must never touch maintenance or gain, however small the profile.
    { sex: 'female', age: 80, heightFeet: 4, heightInches: 10, weight: 95, lifestyle: 'sedentary', goal: 'maintain', diet: 'carnivore' },
    { sex: 'female', age: 80, heightFeet: 4, heightInches: 10, weight: 95, lifestyle: 'sedentary', goal: 'gain', deficit: 10, diet: 'carnivore' },
    // Comfortably above the floor: must be completely unaffected.
    { sex: 'female', age: 45, heightFeet: 5, heightInches: 6, weight: 190, lifestyle: 'moderate', goal: 'lose', deficit: 20, diet: 'carnivore' },
  ];
  cases.push(...guardrail);
  return cases;
}

// --- run (only when executed directly, not when imported for grid()) --------
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (!isMain) {
  // imported (e.g. by parity_test.mjs) — expose grid() only, no side effects
} else {
  runGoldenCheck();
}

function runGoldenCheck() {
const fn = extractWorkerFn();
const results = grid().map((input) => ({ input, output: fn(input) }));

if (process.argv.includes('--update')) {
  writeFileSync(GOLDEN, JSON.stringify(results, null, 1));
  console.log(`golden.json frozen: ${results.length} cases`);
  process.exit(0);
}

if (!existsSync(GOLDEN)) {
  console.error('golden.json missing — run with --update once, review, and commit it.');
  process.exit(1);
}

const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
if (golden.length !== results.length) {
  console.error(`case count changed: golden ${golden.length} vs current ${results.length}. If the grid change is intentional, re-run with --update.`);
  process.exit(1);
}
let failures = 0;
for (let i = 0; i < golden.length; i++) {
  const want = JSON.stringify(golden[i].output);
  const got = JSON.stringify(results[i].output);
  if (want !== got) {
    if (failures < 10) {
      console.error(`MISMATCH case ${i}: input=${JSON.stringify(golden[i].input)}`);
      console.error(`  golden: ${want}`);
      console.error(`  now:    ${got}`);
    }
    failures++;
  }
}
if (failures) {
  console.error(`\n${failures}/${golden.length} cases diverge from golden. The worker's macro math changed.`);
  console.error('If intentional (approved math change), regenerate with --update and commit the diff.');
  process.exit(1);
}
console.log(`macro golden test: ${golden.length}/${golden.length} cases match`);
}
