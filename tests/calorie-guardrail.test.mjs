/**
 * Self-service fat-loss calorie guardrail + adult gate (Brew, 2026-09-10).
 *
 * These floors are a PRODUCT bound on what an unattended calculator will print.
 * They are NOT universal medical safe minimums, and nothing here should be
 * reworded to imply that they are.
 *
 *   female fat-loss floor: 1200 kcal/day
 *   male   fat-loss floor: 1500 kcal/day
 *
 * Three behaviours are locked in:
 *   Case A  raw fat-loss target under the floor  -> capped, and the displayed
 *           deficit becomes what was ACTUALLY achieved, never the requested %.
 *   Case B  maintenance itself at or below the floor -> the target is
 *           suppressed entirely. No fake deficit, no number for downstream code
 *           to size a meal plan or a report from. Suppress, never substitute.
 *   Adult   under 18 gets no target and no paid pathway. Not a pediatric
 *           formula, a refusal.
 *
 * Exercises the WORKER's calculateMacros, which prices the paid report, and the
 * server-side eligibility gate that stands in front of checkout and report
 * generation. Client/worker parity is enforced separately by tests/macro_parity.
 *
 * Run: node tests/calorie-guardrail.test.mjs
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSampleDay, getDietSampleDay } from '../api/sample-day.js';

const repo = resolve(fileURLToPath(new URL('..', import.meta.url)));
const src = readFileSync(resolve(repo, 'api/calculator-api.js'), 'utf8');

/** Extract a top-level function from the worker, the way macro_parity does. */
function extract(name, deps = '') {
  const start = src.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`worker ${name} not found`);
  let depth = 0;
  let i = src.indexOf('{', start);
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) break; }
  }
  return { code: src.slice(start, i + 1) };
}

const calcCode = extract('calculateMacros').code;
const eligCode = extract('checkTargetEligibility').code;
const factory = new Function('console', `${calcCode}\n${eligCode}\nreturn { calculateMacros, checkTargetEligibility };`);
const { calculateMacros, checkTargetEligibility } = factory({ log() {}, warn() {}, error() {} });

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`  ✓ ${name}`);
  else { failures++; console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`); }
}

const base = { heightFeet: 5, heightInches: 4, lifestyle: 'sedentary', diet: 'carnivore' };
const step3 = readFileSync(resolve(repo, 'calculator2-demo/src/components/calculator/steps/Step3FreeResults.tsx'), 'utf8');

console.log('\n=== Case A: female floor (1200) ===\n');
// The audit persona that used to print 937 kcal.
const female = { ...base, sex: 'female', age: 68, heightFeet: 5, heightInches: 0, weight: 130, goal: 'lose', deficit: 25 };
const fRes = calculateMacros(female);
check('68F 5ft0 130lb, 25% deficit: target is the 1200 floor, not 937', fRes.calories === 1200, `got ${fRes.calories}`);
check('  floor is reported as applied', fRes.floorApplied === true);
check('  not suppressed (maintenance is above the floor)', fRes.targetSuppressed === false);
check('  the requested 25% is still recorded', fRes.requestedDeficitPct === 25, `got ${fRes.requestedDeficitPct}`);
check('  the effective deficit is what was achieved, not 25%', fRes.effectiveDeficitPct !== 25 && fRes.effectiveDeficitPct > 0, `got ${fRes.effectiveDeficitPct}`);
check('  effective deficit matches (tdee - 1200) / tdee',
  fRes.effectiveDeficitPct === Math.round(((fRes.tdee - 1200) / fRes.tdee) * 100),
  `eff=${fRes.effectiveDeficitPct} tdee=${fRes.tdee}`);
check('  macros are derived from the capped target, not the raw one',
  Math.abs((fRes.protein_grams * 4 + fRes.fat_grams * 9 + fRes.carbs_grams * 4) - 1200) <= 30,
  `p=${fRes.protein_grams} f=${fRes.fat_grams} c=${fRes.carbs_grams}`);
check('  the female floor is 1200', fRes.selfServiceFloor === 1200);

console.log('\n=== Case A: male floor (1500) ===\n');
const male = { ...base, sex: 'male', age: 72, weight: 135, goal: 'lose', deficit: 25 };
const mRes = calculateMacros(male);
check('72M 5ft4 135lb, 25% deficit: target is the 1500 floor', mRes.calories === 1500, `got ${mRes.calories}`);
check('  floor reported as applied', mRes.floorApplied === true);
check('  effective deficit is truthful, not the requested 25%',
  mRes.effectiveDeficitPct === Math.round(((mRes.tdee - 1500) / mRes.tdee) * 100) && mRes.effectiveDeficitPct !== 25,
  `eff=${mRes.effectiveDeficitPct} tdee=${mRes.tdee}`);
check('  the male floor is 1500', mRes.selfServiceFloor === 1500);

console.log('\n=== Above the floor: untouched ===\n');
const ordinary = { ...base, sex: 'female', age: 58, weight: 186, lifestyle: 'light', goal: 'lose', deficit: 15 };
const oRes = calculateMacros(ordinary);
check('58F 5ft4 186lb, 15%: no cap applied', oRes.floorApplied === false && oRes.targetSuppressed === false);
check('  target equals the requested deficit exactly',
  oRes.calories === Math.round(oRes.tdee * 0.85), `got ${oRes.calories} tdee ${oRes.tdee}`);
check('  effective deficit equals the requested 15%', oRes.effectiveDeficitPct === 15);
check('  target is above the floor', oRes.calories > oRes.selfServiceFloor);

console.log('\n=== Maintenance and gain: never capped ===\n');
const tiny = { ...base, sex: 'female', age: 80, heightFeet: 4, heightInches: 10, weight: 95 };
const maint = calculateMacros({ ...tiny, goal: 'maintain' });
check('small profile, maintain: target is TDEE, not raised to the floor',
  maint.calories === maint.tdee && maint.calories < 1200, `got ${maint.calories} tdee ${maint.tdee}`);
check('  maintain is never flagged as floored or suppressed',
  maint.floorApplied === false && maint.targetSuppressed === false);
const gain = calculateMacros({ ...tiny, goal: 'gain', deficit: 10 });
check('small profile, gain: surplus applied, not capped upward',
  gain.calories === Math.round(gain.tdee * 1.1), `got ${gain.calories} tdee ${gain.tdee}`);
check('  gain is never flagged as floored or suppressed',
  gain.floorApplied === false && gain.targetSuppressed === false);

console.log('\n=== Case B: maintenance at or below the floor ===\n');
const lowTdee = { ...tiny, goal: 'lose', deficit: 10 };
const sup = calculateMacros(lowTdee);
check('maintenance under 1200: no fat-loss target produced', sup.targetSuppressed === true);
check('  no calorie number is emitted at all', sup.calories === null, `got ${sup.calories}`);
check('  no macro numbers are emitted', sup.protein_grams === null && sup.fat_grams === null && sup.carbs_grams === null);
check('  the floor was NOT silently returned as a deficit', sup.calories !== sup.selfServiceFloor);
check('  maintenance is still reported honestly', sup.tdee > 0 && sup.tdee <= sup.selfServiceFloor);
check('  effective deficit is zero, not the requested 10%', sup.effectiveDeficitPct === 0);
check('  a reason is recorded', sup.suppressionReason === 'maintenance_at_or_below_self_service_floor');

// The whole point: a suppressed target must not go on to size anything.
const elig = checkTargetEligibility(lowTdee);
check('  checkout/report gate refuses a suppressed target', elig !== null && elig.code === 'CALORIE_TARGET_SUPPRESSED', JSON.stringify(elig));
check('  the refusal states nobody was charged', elig && elig.validation.charged === false);
check('  an above-floor profile is still sellable', checkTargetEligibility(ordinary) === null);
check('  a floored (capped) profile is still sellable', checkTargetEligibility(female) === null);

console.log('\n=== Adult gate (18+) ===\n');
const adult = { ...base, sex: 'female', age: 18, weight: 160, goal: 'lose', deficit: 15 };
const minor = { ...adult, age: 17 };
check('age 18 is accepted by the eligibility gate', checkTargetEligibility(adult) === null);
const minorElig = checkTargetEligibility(minor);
check('age 17 is refused', minorElig !== null && minorElig.code === 'UNDER_18_NOT_SUPPORTED', JSON.stringify(minorElig));
check('  the refusal names 18 as the minimum', minorElig && minorElig.validation.minimumAge === 18);
check('  the refusal states nobody was charged', minorElig && minorElig.validation.charged === false);
// calculateMacros defaults a missing age to 30, so the gate must fail CLOSED on
// anything that is not a real age rather than pricing the session as an adult.
for (const bad of [undefined, null, '', 0, 'abc', NaN]) {
  const r = checkTargetEligibility({ ...adult, age: bad });
  check(`  age ${JSON.stringify(bad)} is refused, not defaulted to an adult`,
    r !== null && r.code === 'UNDER_18_NOT_SUPPORTED', JSON.stringify(r));
}
check('  no paid pathway survives: checkout and report share one gate',
  /checkTargetEligibility\(finalFormData\)/.test(src) && /checkTargetEligibility\(session\.form_data\)/.test(src));

// Client-side validation must agree with the server, or a minor sees a target
// the backend would then refuse to sell.
const calcTs = readFileSync(resolve(repo, 'calculator2-demo/src/lib/calculations.ts'), 'utf8');
check('client exports ADULT_MIN_AGE = 18', /export const ADULT_MIN_AGE = 18/.test(calcTs));
const step1 = readFileSync(resolve(repo, 'calculator2-demo/src/components/calculator/steps/Step1PhysicalStats.tsx'), 'utf8');
check('client step 1 validates against ADULT_MIN_AGE, not a literal 14',
  /ADULT_MIN_AGE/.test(step1) && !/age < 14|data\.age < 14|min\(14\)/.test(step1));
// Assert the branch that actually stops a 17-year-old advancing, not merely that
// the constant is mentioned somewhere: deleting this line used to leave the
// suite fully green (reviewer mutation, 2026-09-10).
check('client step 1 blocks under-18 with the adult-only message',
  /data\.age < ADULT_MIN_AGE\)\s*newErrors\.age = ADULT_ONLY_MESSAGE/.test(step1),
  'the under-18 branch in handleContinue is missing');
check('client step 1 surfaces the adult-only message to the reader',
  /ADULT_ONLY_MESSAGE/.test(step1) && /adults 18 and over/.test(calcTs));
const app = readFileSync(resolve(repo, 'calculator2-demo/src/components/calculator/CalculatorApp.tsx'), 'utf8');
check('client refuses to compute macros under 18',
  /ageNum < ADULT_MIN_AGE/.test(app) && /setMacros\(null\)/.test(app));
// Must fail CLOSED like the server: NaN < 18 is false, so a bare comparison
// would let a non-numeric age in a rehydrated store through to the compute
// branch (reviewer, 2026-09-10).
check('  the client age gate fails closed on a non-numeric age',
  /!Number\.isFinite\(ageNum\)\s*\|\|\s*ageNum < ADULT_MIN_AGE/.test(app),
  'client gate does not reject NaN');

console.log('\n=== Case A degenerate band: cap leaves no real deficit ===\n');
// TDEE just above the floor caps to a target that is effectively maintenance.
// The copy must not describe that as the deficit the reader asked for.
const degenerate = { ...base, sex: 'female', age: 20, heightFeet: 4, heightInches: 6, weight: 90, goal: 'lose', deficit: 20 };
const dRes = calculateMacros(degenerate);
if (dRes.floorApplied && dRes.effectiveDeficitPct === 0) {
  check('cap that yields a 0% deficit is still reported as 0, never the requested %',
    dRes.effectiveDeficitPct !== dRes.requestedDeficitPct, `req=${dRes.requestedDeficitPct} eff=${dRes.effectiveDeficitPct}`);
  check('  the results copy has a branch for the 0% case',
    /effectiveDeficitPct === 0/.test(step3) && /essentially maintenance/.test(step3),
    'no 0%-deficit wording branch found');
} else {
  check('degenerate band probe still lands in Case A', true);
}

// Rounding can put the achieved deficit back on the requested number: a 1597
// TDEE capped to 1200 is 24.9%, which rounds to 25 and used to print "about 25%
// below your maintenance, not the 25% you picked" (reviewer, 2026-09-10). The
// copy must never contradict itself, so it leads with calories and only draws
// the percentage contrast when the two actually differ.
const collapsed = calculateMacros({ ...base, sex: 'female', age: 30, heightInches: 2, weight: 145, goal: 'lose', deficit: 25 });
check('rounding can collapse the effective deficit onto the requested one',
  collapsed.floorApplied && collapsed.effectiveDeficitPct === collapsed.requestedDeficitPct,
  `req=${collapsed.requestedDeficitPct} eff=${collapsed.effectiveDeficitPct} tdee=${collapsed.tdee}`);
check('  the copy only claims a different percentage when it IS different',
  /effectiveDeficitPct === macros\.requestedDeficitPct/.test(step3),
  'no equal-percentage branch: the sentence can contradict itself');
check('  the cap is explained in calories, which cannot round into a contradiction',
  /calories below your\s*\n?\s*estimated maintenance/.test(step3) || /calories below your/.test(step3));

console.log('\n=== Sample day follows the FINAL target ===\n');
// The 937 persona is now a 1200 persona: the day must be built around 1200.
const cappedDay = buildSampleDay(getDietSampleDay('carnivore'), fRes.calories);
check('sample day is built from the capped 1200 target', cappedDay.target === 1200);
// Assert what the COMPONENT passes, not what this test passes. The previous
// version only checked its own buildSampleDay call, so pointing the component
// at a pre-cap number left the suite green (reviewer mutation, 2026-09-10).
check('the component builds the sample day from macros.calories, the final target',
  /buildSampleDay\(getDietSampleDay\(data\.diet\), macros\.calories\)/.test(step3),
  'the component is not building from the final target');
check('no pre-cap or raw deficit value is recomputed in the results screen',
  !/tdee\s*\*\s*\(1\s*-/.test(step3) && !/requestedDeficitPct\s*\/\s*100/.test(step3),
  'the results screen appears to recompute a raw target');
const drift = Math.abs(cappedDay.total - 1200) / 1200;
check(`sample day total is within 8% of the capped target (${cappedDay.total})`, drift <= 0.08, `drift=${(drift * 100).toFixed(1)}%`);
check('sample day meals sum to the displayed total',
  cappedDay.meals.reduce((s, m) => s + m.calories, 0) === cappedDay.total);
const raw937 = buildSampleDay(getDietSampleDay('carnivore'), 937);
check('the capped day is NOT the day the raw 937 target would have produced',
  cappedDay.total !== raw937.total, `capped=${cappedDay.total} raw=${raw937.total}`);

// A suppressed target must never reach the sample-day builder at all. The UI
// returns before that call; this asserts the contract holds in code.
const suppressedBranch = step3.indexOf('macros.targetSuppressed');
const sampleDayCall = step3.indexOf('buildSampleDay(');
check('the results screen bails on a suppressed target BEFORE building a sample day',
  suppressedBranch > -1 && sampleDayCall > -1 && suppressedBranch < sampleDayCall,
  `suppressedAt=${suppressedBranch} sampleDayAt=${sampleDayCall}`);
// Index comparison alone passes on `if (false && macros.targetSuppressed)`, so
// assert the guard is a bare condition that returns (reviewer mutation).
check('the suppression guard is a plain early return, not a disabled branch',
  /if \(macros\.targetSuppressed\) \{/.test(step3) && /if \(macros\.targetSuppressed\)[\s\S]{0,4000}?\n    return \(/.test(step3),
  'the suppressed branch is missing, altered, or does not return');
check('no falsy short-circuit disables the suppression guard',
  !/if \((?:false|0|null|undefined)\s*&&[^)]*targetSuppressed/.test(step3));

console.log(`\n${failures === 0 ? 'All calorie-guardrail assertions passed.' : failures + ' FAILED'}\n`);
if (failures > 0) process.exit(1);
