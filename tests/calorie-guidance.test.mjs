#!/usr/bin/env node
/**
 * tests/calorie-guidance.test.mjs
 *
 * Run it:
 *     node tests/calorie-guidance.test.mjs
 *
 * No network, no database, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * A $29 report that answers every medical question with silence is not safe, it is
 * worthless, and a customer who is handed one has been charged for a disclaimer. The
 * opposite failure is the one this codebase already shipped once: compute a confident
 * 20% deficit for a 72-year-old on insulin and a beta blocker, then hide the number in
 * prose while it still sizes every portion on the calendar underneath.
 *
 * So calorie guidance is three states, not a boolean, and this suite pins all three:
 *
 *   normal      no relevant medical context. The target as calculated, stated plainly.
 *               MOST CUSTOMERS ARE HERE AND MUST STAY HERE. Group B is the assertion
 *               that protects the product from its own safety layer.
 *
 *   qualified   a declared medication, or a cardiac / renal / hepatic / blood-pressure
 *               condition, or a glucose-lowering drug. The reader still gets a real,
 *               usable number. What is removed is the DEFICIT, not the figure and not
 *               the meal plan. Group C proves the removal is structural: the portions
 *               and the grocery quantities are maintenance-sized too. Relabelling a
 *               deficit that still sizes the food is the cosmetic-safety anti-pattern,
 *               and this group exists to catch a future version of it.
 *
 *   suppressed  declared kidney disease. No figure anywhere, and nothing downstream
 *               may size itself from one. Group D walks every consumer.
 *
 * GROUP F MUTATION-TESTS THE SUITE. A passing safety test proves nothing until it has
 * been watched to go red. Group F removes the suppression guard from a copy of the
 * worker, reconnects the suppressed calorie target to the meal engine, and asserts that
 * the unsafe plan then builds. If Group F ever passes quietly it means the guard was
 * already gone and the rest of this file was measuring nothing.
 */
import path from 'path';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const API = path.join(ROOT, 'api', 'calculator-api.js');
const MEDICAL = path.join(ROOT, 'api', 'medical-context.js');

const {
  __test_generateAllReports: generateAllReports,
  __test_generateFullMealPlan: generateFullMealPlan,
  __test_calculateMacros: calculateMacros,
} = await import('file://' + API);
const { deriveMedicalContext, applyCalorieGuidance } = await import('file://' + MEDICAL);

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

// ===========================================================================
// PERSONAS. Identical body, goal and diet throughout. The ONLY thing that varies
// between them is declared health context, so every difference in output is
// attributable to that and to nothing else.
// ===========================================================================
const BASE = {
  sex: 'female', age: 54, heightFeet: 5, heightInches: 5, weight: 186, goalWeight: 150,
  goal: 'lose', deficit: 20, diet: 'Carnivore', selectedProtocol: 'Carnivore',
  firstName: 'Calorie', lastName: 'Fixture', budget: 'moderate',
  lifestyle: 'sedentary', exercise: '1-2', carnivoreExperience: 'beginner',
  goals: ['weight-loss'], email: 'x@example.com',
};

const HEALTHY   = { ...BASE, conditions: ['none'], otherConditions: '', medications: '', symptoms: [] };
// Symptoms alone must NOT qualify. medical-context.js is explicit that a reader who
// reports bloating keeps every ordinary macro.
const SYMPTOMS  = { ...HEALTHY, symptoms: ['fatigue'], otherSymptoms: 'bloating' };
// A condition with no bearing on calorie-deficit safety must NOT qualify either: that
// axis is restrictConditionClaims, and the two must not share a trigger.
const THYROID   = { ...HEALTHY, conditions: ['Hypothyroidism'] };
const INSULIN   = { ...HEALTHY, medications: 'Lantus insulin, 20 units at night' };
const BPMED     = { ...HEALTHY, medications: 'lisinopril 10mg' };
const CARDIAC   = { ...HEALTHY, otherConditions: 'congestive heart failure' };
const RENAL     = { ...BASE, conditions: [], otherConditions: 'Chronic kidney disease, stage 3', medications: '', symptoms: [] };

const COMPLIANT_AI =
  'Your daily numbers are listed below. People report a wide range of first-week ' +
  'experiences, and yours may differ. Take these figures to your doctor before you start.';

const realFetch = globalThis.fetch;
function stubModel() {
  globalThis.fetch = async (url) => String(url).includes('api.anthropic.com')
    ? { ok: true, status: 200, json: async () => ({ content: [{ text: COMPLIANT_AI }] }) }
    : { ok: true, status: 200, json: async () => ({}), text: async () => '' };
}
const quiet = () => {
  const real = {};
  for (const k of ['log', 'info', 'warn', 'debug', 'error']) { real[k] = console[k]; console[k] = () => {}; }
  return () => Object.assign(console, real);
};

async function build(form) {
  stubModel();
  const restore = quiet();
  try {
    const data = { ...form };
    data.macros = calculateMacros(data);
    return { data, reports: await generateAllReports(data, 'test-key') };
  } finally { restore(); }
}

const g = form => deriveMedicalContext(form).calorieGuidance;
const eff = form => applyCalorieGuidance(calculateMacros(form), deriveMedicalContext(form));

// ===========================================================================
// GROUP A - the three states are derived from the authoritative context, and the
// boundaries are where they were designed to be.
// ===========================================================================
check('A', 'a reader with no medical context gets normal guidance', g(HEALTHY) === 'normal', g(HEALTHY));
check('A', 'reported symptoms alone do NOT qualify', g(SYMPTOMS) === 'normal', g(SYMPTOMS));
check('A', 'a condition unrelated to calorie safety does NOT qualify', g(THYROID) === 'normal', g(THYROID));
check('A', 'any declared medication qualifies', g(BPMED) === 'qualified', g(BPMED));
check('A', 'a glucose-lowering medication qualifies', g(INSULIN) === 'qualified', g(INSULIN));
check('A', 'a cardiac condition qualifies', g(CARDIAC) === 'qualified', g(CARDIAC));
check('A', 'declared kidney disease suppresses', g(RENAL) === 'suppressed', g(RENAL));
check('A', 'the state is one of exactly three values',
  [HEALTHY, SYMPTOMS, THYROID, BPMED, INSULIN, CARDIAC, RENAL]
    .every(p => ['normal', 'qualified', 'suppressed'].includes(g(p))), '');

// applyCalorieGuidance is pure and idempotent, because it is derived at every
// consumption point rather than stamped once onto the data object.
{
  const ctx = deriveMedicalContext(INSULIN);
  const raw = calculateMacros(INSULIN);
  const once = applyCalorieGuidance(raw, ctx);
  const twice = applyCalorieGuidance(once, ctx);
  check('A', 'applying guidance twice is a no-op',
    once.calories === twice.calories && once.fat_grams === twice.fat_grams, '');
  check('A', 'applying guidance does not mutate its input',
    raw.calories !== null && raw.calories !== once.calories, 'the raw macro set was mutated in place');
}

// ===========================================================================
// GROUP B - THE PRODUCT. A normal customer's report is not touched by any of this.
// If this group ever goes red, the safety layer has eaten the thing people paid for.
// ===========================================================================
{
  const raw = calculateMacros(HEALTHY);
  const e = eff(HEALTHY);
  check('B', 'a normal reader keeps the calculated calorie target', e.calories === raw.calories, `${e.calories} vs ${raw.calories}`);
  check('B', 'the target is a real deficit, not maintenance', e.calories < raw.tdee, `${e.calories} vs tdee ${raw.tdee}`);
  check('B', 'no deficit was neutralized', e.deficitNeutralized === false, '');
  check('B', 'protein, fat and carbs are untouched',
    e.protein_grams === raw.protein_grams && e.fat_grams === raw.fat_grams && e.carbs_grams === raw.carbs_grams, '');

  const { reports } = await build(HEALTHY);
  const r3 = String(reports[3] || '');
  check('B', 'the normal reader still gets a real 30-day calendar',
    /Day 30/.test(r3) && /\d+\s*g\b/.test(r3), 'the calendar lost its portions');
  check('B', 'the normal reader gets no calorie qualification note',
    !/starting reference point rather than a deficit/.test(r3) &&
    !/higher than the one the free calculator showed you/.test(r3),
    'a healthy reader was handed medical hedging');
  check('B', 'the normal reader gets no glucose-medication caution',
    !/Before you stretch the gap/.test(r3), '');
  check('B', 'all thirteen sections generate', Object.keys(reports).length >= 13, `${Object.keys(reports).length} sections`);
}

// ===========================================================================
// GROUP C - QUALIFIED. The number survives. The deficit does not, and it does not
// survive in the food either, which is the half a copy-only fix would have missed.
// ===========================================================================
for (const [id, persona] of [['insulin', INSULIN], ['bp-med', BPMED], ['cardiac', CARDIAC]]) {
  const raw = calculateMacros(persona);
  const e = eff(persona);
  check('C', `${id}: still receives a calorie figure`, Number.isFinite(e.calories), String(e.calories));
  check('C', `${id}: the figure is maintenance, not the deficit target`,
    e.calories === Math.round(raw.tdee), `${e.calories} vs tdee ${Math.round(raw.tdee)}`);
  check('C', `${id}: the deficit is recorded as removed`,
    e.deficitNeutralized === true && e.effectiveDeficitPct === 0, '');
  check('C', `${id}: nothing was substituted downward`, e.calories > raw.calories, `${e.calories} vs ${raw.calories}`);
  check('C', `${id}: protein is unchanged (it is body-weight derived, not calorie derived)`,
    e.protein_grams === raw.protein_grams, '');
  check('C', `${id}: fat scaled with the calorie change rather than being recomputed`,
    e.fat_grams > raw.fat_grams, `${e.fat_grams} vs ${raw.fat_grams}`);
}
{
  // THE STRUCTURAL ASSERTION. Two readers identical but for the medication: if the
  // deficit were merely relabelled, these calendars would be byte-identical.
  const { reports: healthy } = await build(HEALTHY);
  const { reports: medicated } = await build(INSULIN);
  const h3 = String(healthy[3] || '');
  const m3 = String(medicated[3] || '');
  check('C', 'the qualified reader still gets a full 30-day calendar',
    /Day 30/.test(m3) && /\d+\s*g\b/.test(m3), 'qualification removed the meal plan');
  check('C', 'the qualified calendar is NOT the deficit calendar with softer wording',
    h3 !== m3, 'identical calendars: the deficit was relabelled, not removed');
  check('C', 'the qualified reader is told what the number is and is not',
    /starting reference point rather than a deficit/.test(m3),
    'the qualification is applied but never explained');
  // The reader saw a LOWER number on the free calculator before they paid, because the
  // medical questions come after checkout. Unexplained, a higher number in the paid
  // report reads as a bug or a bait and switch. Saying so plainly is load-bearing for
  // trust, so it is pinned rather than left to a future copy edit.
  check('C', 'the change from the free calculator number is explained, not left to be noticed',
    /higher than the one the free calculator showed you/.test(m3),
    'the paid report silently contradicts the number that sold it');
  check('C', 'the reader is not told weight loss is off the table',
    /Losing weight is still/.test(m3), '');
  check('C', 'a glucose-lowering reader is told who needs to know before they eat less often',
    /Before you stretch the gap/.test(m3), '');
  check('C', 'a non-glucose medication does not get the fasting caution',
    !/Before you stretch the gap/.test(String((await build(BPMED)).reports[3] || '')), '');
  check('C', 'the qualified grocery list is still produced', String(medicated[4] || '').length > 400, '');
}

// ===========================================================================
// GROUP D - SUPPRESSED. Every consumer, not just the ones that print prose.
// ===========================================================================
{
  const e = eff(RENAL);
  check('D', 'no calorie figure survives the guidance step', e.calories === null, String(e.calories));
  check('D', 'fat and carbs go with it, because both are the calorie total in another unit',
    e.fat_grams === null && e.carbs_grams === null, `fat=${e.fat_grams} carbs=${e.carbs_grams}`);

  // The meal engine refuses rather than falling back to an invented 2,000 kcal day.
  let threw = null;
  try { generateFullMealPlan({ ...RENAL, macros: calculateMacros(RENAL) }); } catch (err) { threw = err; }
  check('D', 'the meal engine refuses to build for a suppressed reader', threw !== null,
    'the plan built anyway, sized from a target the report refuses to state');

  const { reports } = await build(RENAL);
  const r3 = String(reports[3] || '');
  check('D', 'Report #3 is the referral notice, not a calendar', !/Day 30/.test(r3), '');
  check('D', 'the reader is told why the calorie target is withheld too',
    /does not set a daily calorie target/.test(r3), 'calorie silence with no explanation reads as an oversight');
  check('D', 'the referral is specific, not boilerplate',
    /renal dietitian/.test(r3) && !/consult your doctor before making dietary changes/i.test(r3), '');
  check('D', 'the reader keeps the rest of the report they paid for',
    Object.keys(reports).length >= 13, `${Object.keys(reports).length} sections`);

  // No four-digit calorie-shaped figure anywhere in the whole document.
  const full = Object.values(reports).map(String).join('\n');
  const calorieShaped = full.match(/\b[12],?\d{3}\b\s*(?:calories|kcal|cal\b)/gi) || [];
  check('D', 'no calorie figure appears anywhere in the rendered report',
    calorieShaped.length === 0, calorieShaped.join(', '));

  // The weight-loss horizon is the deficit restated as a date, so the same gate belongs
  // on it. This assertion is STRUCTURAL, not behavioural, and deliberately so:
  // computeGoalHorizon reads from Supabase and the offline suite cannot drive it. More
  // importantly the gate is currently inert there, because the row it builds formData
  // from (calculator_sessions_v2) has no conditions or medications column. So what is
  // pinned here is that the gate exists and runs BEFORE the deficit arithmetic, which is
  // what makes it correct the day health fields reach that object. It is not claimed as
  // proof that a medicated subscriber is protected on the drip path, because they are
  // not; that gap is tracked as its own issue.
  const workerSrc = readFileSync(API, 'utf8');
  const horizonFn = workerSrc.slice(workerSrc.indexOf('async function computeGoalHorizon('));
  const gateAt = horizonFn.indexOf("calorieGuidance === 'suppressed'");
  const deficitAt = horizonFn.indexOf('const dailyDeficit = Math.round(');
  check('D', 'the horizon consumer carries the suppression gate', gateAt > -1, '');
  check('D', 'the gate runs before the deficit is computed',
    gateAt > -1 && deficitAt > -1 && gateAt < deficitAt, `gate@${gateAt} deficit@${deficitAt}`);
}

// ===========================================================================
// GROUP E - MEAL FREQUENCY. Two meals is a stated template, not a hidden default,
// and one-meal-a-day guidance cannot reach a reader who never asked for it.
// ===========================================================================
{
  const { reports: healthy } = await build(HEALTHY);
  const r3 = String(healthy[3] || '');
  const r2 = String(healthy[2] || '');
  check('E', 'the two-meal structure is stated to the reader',
    /built around two meals a day/.test(r3), 'the default is still silent');
  check('E', 'it is not claimed as a personalization',
    /We did not ask you how often you eat/.test(r3), '');
  check('E', 'no unprompted OMAD encouragement in the food guide',
    !/OMAD/.test(r2) && !/one meal per day/i.test(r2), '');

  const { reports: lion } = await build({ ...HEALTHY, diet: 'Lion', selectedProtocol: 'Lion' });
  check('E', 'a Lion reader gets no unprompted OMAD encouragement either',
    !/OMAD/.test(String(lion[2] || '')) && !/500-1500/.test(String(lion[2] || '')), '');

  // The branch is gated, not deleted: an explicit declaration still reaches it.
  const { reports: declared } = await build({ ...HEALTHY, diet: 'Lion', selectedProtocol: 'Lion', mealsPerDay: 1 });
  check('E', 'an explicitly declared one-meal reader still gets the OMAD pattern',
    /You told us you eat once a day/.test(String(declared[2] || '')), 'the gate is a deletion, not a gate');
  check('E', 'a reader who declared their frequency is not told we did not ask',
    !/We did not ask you how often you eat/.test(String(declared[3] || '')), '');

  // And a glucose-lowering reader cannot be encouraged into it unprompted.
  const { reports: insulinLion } = await build({ ...INSULIN, diet: 'Lion', selectedProtocol: 'Lion' });
  check('E', 'a glucose-lowering Lion reader receives no fasting or OMAD encouragement',
    !/OMAD/.test(String(insulinLion[2] || '')) && !/one meal per day/i.test(String(insulinLion[2] || '')), '');
}

globalThis.fetch = realFetch;

// ===========================================================================
// GROUP F - MUTATION TEST. Break the guard on purpose and prove this suite notices.
// ===========================================================================
{
  const MUTANT = path.join(ROOT, 'api', '__calorie_mutation_tmp.mjs');
  let mutantResult = 'not-run';
  try {
    const src = readFileSync(API, 'utf8');

    // Reconnect the suppressed calorie target to the meal engine, exactly the way it
    // was wired before 2026-09-14: strip the two refusals and restore the silent
    // fallbacks that turned a withheld target into an invented 2,000 kcal day.
    let mutated = src
      .replace(
        /if \(mealPlanContext\.calorieGuidance === 'suppressed'[\s\S]*?\n  \}\n/,
        '\n')
      .replace(
        /if \(mealPlanContext\.restrictProteinTarget\) \{[\s\S]*?\n  \}\n/,
        '\n')
      .replace(
        /if \(!Number\.isFinite\(dailyCalories\)[\s\S]*?\n  \}\n/,
        '\n')
      .replace(
        'const dailyCalories = Number(effectiveMacros.calories);',
        'const dailyCalories = Number(effectiveMacros.calories) || 2000;')
      .replace(
        'const dailyProtein = Number(effectiveMacros.protein_grams);',
        'const dailyProtein = Number(effectiveMacros.protein_grams) || 150;')
      .replace(
        'const dailyFat = Number(effectiveMacros.fat_grams);',
        'const dailyFat = Number(effectiveMacros.fat_grams) || 130;');

    check('F', 'the mutation actually changed the worker source', mutated !== src,
      'the guard patterns did not match: this group is measuring nothing');

    writeFileSync(MUTANT, mutated);
    const { __test_generateFullMealPlan: mutantPlan } = await import('file://' + MUTANT);

    const restore = quiet();
    try {
      const plan = mutantPlan({ ...RENAL, macros: calculateMacros(RENAL) });
      mutantResult = plan?.weeks?.length ? 'built' : 'empty';
    } catch { mutantResult = 'threw'; } finally { restore(); }
  } finally {
    try { unlinkSync(MUTANT); } catch { /* already gone */ }
  }

  // THE POINT. Without the guard the unsafe plan builds. That is what makes GROUP D's
  // "the meal engine refuses" a real assertion rather than a coincidence of the data.
  check('F', 'without the guard, a suppressed reader DOES get a meal plan',
    mutantResult === 'built',
    `mutant returned "${mutantResult}": the guard is not what stops the unsafe plan, ` +
    'so GROUP D proves nothing and this suite needs rewriting');
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  [${f.group}] ${f.label}${f.detail ? ` - ${f.detail}` : ''}`);
  console.log(`\ncalorie-guidance: ${passed} passed, ${failures.length} FAILED`);
  process.exit(1);
}
console.log(`calorie-guidance: ${passed} passed, 0 failed  (groups A B C D E F)`);
console.log('');
console.log('Ordinary customers keep an ordinary recommendation. Medicated customers keep');
console.log('a usable number without a deficit underneath it. Kidney disease gets a referral');
console.log('instead of a figure, and no part of the report is sized from one anyway.');
