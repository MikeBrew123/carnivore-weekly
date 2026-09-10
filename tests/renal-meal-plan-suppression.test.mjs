#!/usr/bin/env node
/**
 * tests/renal-meal-plan-suppression.test.mjs
 *
 * Run it:
 *     node tests/renal-meal-plan-suppression.test.mjs
 *
 * No network, no database, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * The report already refused to print a protein target to a reader who told us about
 * kidney disease. It then printed a 30-day meal calendar sized to that exact number,
 * and a shopping list derived from the calendar.
 *
 * Measured 2026-09-09, same body inputs, healthy persona vs declared CKD persona:
 *
 *     healthy   day 1: 2 Eggs, 191g Ground Beef, 1 tbsp Butter, 283g Ribeye
 *     CKD       day 1: 2 Eggs, 191g Ground Beef, 1 tbsp Butter, 283g Ribeye
 *
 * Byte-identical, 474 g of meat a day, in a document whose own words are "this report
 * does not set a protein target for you". Hiding a number while the food still carries
 * it is not suppression. It is the same recommendation in a different unit.
 *
 * WHAT THIS SUITE PINS
 * --------------------
 *   A  the renal reader's Reports #3 and #4 are the approved notices and carry no
 *      quantity, and the protein-anchored generator refuses to run for them at all
 *   B  the healthy reader's calendar and grocery list are untouched
 *   C  nothing is substituted: no smaller figure, no percentage, no grams per day
 *   D  the rest of the paid report still generates, all thirteen sections
 *
 * SUPPRESS, DO NOT SUBSTITUTE. Choosing a protein intake for reduced kidney function
 * is a clinical decision. The software stops rather than inventing a second number,
 * and this suite exists to keep it stopped.
 */

import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const API = path.join(ROOT, 'api', 'calculator-api.js');

const {
  __test_generateAllReports: generateAllReports,
  __test_generateFullMealPlan: generateFullMealPlan,
  __test_generateGroceryListByWeek: generateGroceryListByWeek,
  __test_calculateMacros: calculateMacros,
  __test_RENAL_MEAL_CALENDAR_NOTICE: NOTICE_3,
  __test_RENAL_GROCERY_LIST_NOTICE: NOTICE_4,
} = await import('file://' + API);
const { deriveMedicalContext, buildMedicalSafetyRules } =
  await import('file://' + path.join(ROOT, 'api', 'medical-context.js'));

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

// ===========================================================================
// PERSONAS. Identical body inputs, identical goal, identical diet. The ONLY
// difference is the declared kidney disease, so any difference in output is
// attributable to it and nothing else.
// ===========================================================================
const BASE = {
  sex: 'female', age: 54, heightFeet: 5, heightInches: 5, weight: 186, goalWeight: 150,
  goal: 'lose', deficit: 20, diet: 'Carnivore', selectedProtocol: 'Carnivore',
  firstName: 'Renal', lastName: 'Fixture', budget: 'moderate',
  lifestyle: 'sedentary', exercise: '1-2', carnivoreExperience: 'beginner',
  goals: ['weight-loss'], medications: '', symptoms: ['fatigue'],
};
const HEALTHY = { ...BASE, conditions: ['none'], otherConditions: '' };
const RENAL = { ...BASE, conditions: [], otherConditions: 'Chronic kidney disease, stage 3' };

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

// Anything that would be a portion, a pack size or a shopping quantity.
const QUANTITY_PATTERNS = [
  [/\b\d+(?:\.\d+)?\s*g\b/i, 'a gram quantity'],
  [/\b\d+(?:\.\d+)?\s*(?:lb|lbs|pound|pounds)\b/i, 'a pound quantity'],
  [/\b\d+(?:\.\d+)?\s*(?:oz|ounce|ounces)\b/i, 'an ounce quantity'],
  [/\b\d+(?:\.\d+)?\s*(?:tbsp|tablespoons?|tsp|teaspoons?|cups?)\b/i, 'a measured volume'],
  [/\b\d+\s*(?:eggs?|steaks?|servings?)\b/i, 'a countable portion'],
  [/\bDay\s*\d+\b/i, 'a numbered meal-plan day'],
  [/\bMeal\s*\d+\b/i, 'a numbered meal'],
];

const { reports: renal, data: renalData } = await build(RENAL);
const { reports: healthy } = await build(HEALTHY);
const renalProteinTarget = renalData.macros.protein_grams;

// ===========================================================================
// GROUP A — the renal reader's two quantitative sections.
// ===========================================================================
{
  const s3 = renal[3] || '';
  const s4 = renal[4] || '';

  check('A', 'the persona is one the report withholds a protein target from',
    deriveMedicalContext(RENAL).restrictProteinTarget === true,
    'the fixture is not exercising the suppressed path at all');

  check('A', 'Report #3 carries the approved suppression notice, verbatim',
    s3.includes(NOTICE_3), s3.slice(0, 200));
  check('A', 'Report #4 carries the approved suppression notice, verbatim',
    s4.includes(NOTICE_4), s4.slice(0, 200));
  check('A', 'Report #3 keeps its heading, so nothing is renumbered',
    /^## Report #3:/m.test(s3), s3.slice(0, 80));
  check('A', 'Report #4 keeps its heading, so nothing is renumbered',
    /^## Report #4:/m.test(s4), s4.slice(0, 80));

  check('A', 'the withheld protein target appears in neither section',
    !new RegExp(`\\b${renalProteinTarget}\\b`).test(s3 + s4),
    `${renalProteinTarget} is printed in a section that must not carry it`);

  for (const [re, what] of QUANTITY_PATTERNS) {
    check('A', `Report #3 contains no ${what}`, !re.test(s3), (s3.match(re) || [''])[0]);
    check('A', `Report #4 contains no ${what}`, !re.test(s4), (s4.match(re) || [''])[0]);
  }

  check('A', 'no meal-plan table survives in Report #3',
    !/\|\s*Day\b/i.test(s3) && !/Week \d Shopping/i.test(s3), '');
  check('A', 'no shopping checklist survives in Report #4',
    !/\*\s*\[\s*\]/.test(s4), 'a tickable grocery item is still printed');

  // The load-bearing one: the generator does not merely go unrendered, it refuses.
  let planThrew = null;
  try { generateFullMealPlan({ ...renalData }); } catch (e) { planThrew = e; }
  check('A', 'the protein-anchored generator REFUSES to build a plan for this reader',
    planThrew !== null && /refusing to build a protein-anchored meal plan/.test(planThrew.message),
    planThrew ? planThrew.message.slice(0, 160) : 'it produced a plan');

  // And the grocery list cannot be built without one, so there is no second path in.
  let groceryThrew = null;
  try { generateGroceryListByWeek({ ...renalData }, undefined); } catch (e) { groceryThrew = e; }
  check('A', 'the grocery list cannot be built without a meal plan',
    groceryThrew !== null, 'a grocery list was produced with no plan behind it');
}

// ===========================================================================
// GROUP B — the healthy reader is untouched.
// ===========================================================================
{
  const s3 = healthy[3] || '';
  const s4 = healthy[4] || '';

  check('B', 'the healthy persona is NOT on the suppressed path',
    deriveMedicalContext(HEALTHY).restrictProteinTarget !== true, '');

  check('B', 'the healthy meal calendar still exists',
    /## Report #3:/.test(s3) && s3.length > 3000, `length ${s3.length}`);
  check('B', 'it still carries dated days',
    /\bDay\s*1\b/.test(s3) && /\bDay\s*30\b/.test(s3), 'the 30 days are not all there');
  check('B', 'it still carries gram portions',
    /\b\d+\s*g\b/.test(s3), 'the calendar lost its quantities');
  check('B', 'it still carries the substitution guide',
    /Substitution Guide/i.test(s3), '');
  check('B', 'the healthy grocery list still exists',
    /## Report #4:/.test(s4) && s4.length > 1500, `length ${s4.length}`);
  check('B', 'it still carries all four weekly lists',
    [1, 2, 3, 4].every(w => new RegExp(`Week ${w} Shopping List`, 'i').test(s4)),
    'a week went missing from the shopping list');
  check('B', 'it still carries tickable quantities',
    /\*\s*\[\s*\]/.test(s4) && /\b\d+(?:\.\d+)?\s*(?:lb|lbs)\b/i.test(s4), '');
  check('B', 'the healthy report still has all thirteen sections',
    Object.keys(healthy).length === 13, `${Object.keys(healthy).length} sections`);

  // Determinism: same inputs, same bytes. If the gate had leaked into the healthy
  // path at all, the second build would differ from the first.
  const second = await build(HEALTHY);
  check('B', 'the healthy calendar is byte-for-byte stable across builds',
    (second.reports[3] || '') === s3, 'the healthy meal calendar changed between builds');
  check('B', 'the healthy grocery list is byte-for-byte stable across builds',
    (second.reports[4] || '') === s4, 'the healthy grocery list changed between builds');
  const restoreB = quiet();
  const healthyPlan = generateFullMealPlan({ ...HEALTHY, macros: calculateMacros(HEALTHY) });
  restoreB();
  check('B', 'the healthy plan still sizes portions from the protein target',
    healthyPlan.weeks.length > 0, 'the healthy generator stopped producing a plan');
}

// ===========================================================================
// GROUP C — nothing was substituted for the number we withheld.
// ===========================================================================
{
  const bodyOnly = [renal[3], renal[4]]
    .map(s => String(s || '').split('\n').filter(l => !/^## Report #\d/.test(l)).join('\n'))
    .join('\n');

  check('C', 'the suppressed sections contain no digit at all outside their headings',
    !/\d/.test(bodyOnly), (bodyOnly.match(/.{0,40}\d.{0,40}/) || [''])[0]);
  check('C', 'no substitute protein figure, in grams or per kilogram',
    !/\bg(?:rams)?\s*(?:\/|per)\s*(?:kg|kilogram|day)\b/i.test(bodyOnly), '');
  check('C', 'no reduced percentage of calories',
    !/%|\bpercent\b/i.test(bodyOnly), '');
  check('C', 'no substitute target expressed in words',
    !/\b(?:half|third|quarter|double|lower(?: your)? protein to|aim for|limit(?:ed)? to)\b/i.test(bodyOnly),
    (bodyOnly.match(/\b(?:half|third|quarter|double|aim for|limit(?:ed)? to)\b/i) || [''])[0]);
  check('C', 'no renal diet or food prescription is offered',
    !/\b(?:renal diet|kidney diet|low[- ]protein diet|eat instead|swap to|choose these foods)\b/i.test(bodyOnly), '');
  check('C', 'the decision is routed to a clinician instead',
    /renal dietitian/i.test(bodyOnly) && /doctor/i.test(bodyOnly), '');
  check('C', 'no hidden quantitative target is left anywhere in the renal report',
    !Object.values(renal).some(s => new RegExp(`\\b${renalProteinTarget}\\s*g\\b`).test(String(s || ''))),
    `${renalProteinTarget}g appears somewhere in the renal report`);
}

// ===========================================================================
// GROUP D — the rest of the paid report survives. Suppression is not failure.
// ===========================================================================
{
  check('D', 'the renal report generated at all',
    renal && Object.keys(renal).length > 0, 'generation threw for a renal reader');
  check('D', 'the renal report has all thirteen sections',
    Object.keys(renal).length === 13, `${Object.keys(renal).length} sections`);
  check('D', 'every section has content',
    Object.entries(renal).every(([, s]) => String(s || '').trim().length > 100),
    Object.entries(renal).filter(([, s]) => String(s || '').trim().length <= 100).map(([n]) => `#${n}`).join(', '));
  check('D', 'the sections are numbered 1 to 13 with no gap',
    Object.keys(renal).map(Number).sort((a, b) => a - b).join(',') ===
      Array.from({ length: 13 }, (_, i) => i + 1).join(','),
    Object.keys(renal).join(','));
  check('D', 'the physician handout still reaches the reader',
    /## Report #5:/.test(String(renal[5] || '')), '');
  check('D', 'the electrolyte section still reaches the reader',
    String(renal[10] || '').length > 200, '');
  check('D', 'no unreplaced template placeholder in the renal report',
    !Object.values(renal).some(s => /\{\{\w+\}\}/.test(String(s || ''))),
    'a placeholder token would print literally to the customer');
}

// ===========================================================================
// GROUP E — the reader who declared BOTH a blood thinner and kidney disease.
//
// Withdrawing the meal plan withdrew the section that carried the organ-meat
// exclusion note, and left three other sections asserting that "your meal plan has
// had those items left out of it" to someone holding a report with no meal plan in
// it. Suppressing a section must not orphan the safety copy that lived in it, and
// must not leave the rest of the report describing something that is no longer there.
// ===========================================================================
{
  const BOTH = {
    ...BASE, age: 72, weight: 210, goalWeight: 170,
    medications: 'Warfarin 5mg daily',
    conditions: ['heart-disease'], otherConditions: 'CKD stage 3',
  };
  const ctxBoth = deriveMedicalContext(BOTH);
  check('E', 'the fixture really is both anticoagulant and protein-restricted',
    ctxBoth.anticoagulant === true && ctxBoth.restrictProteinTarget === true,
    `anticoagulant=${ctxBoth.anticoagulant} restrictProteinTarget=${ctxBoth.restrictProteinTarget}`);

  const { reports: both } = await build(BOTH);
  const flat = Object.values(both).join('\n').replace(/\n>?\s*/g, ' ');

  check('E', 'the report does not claim a meal plan left items out',
    !/meal plan has had those items left out/i.test(flat),
    'the reader is told about omissions from a plan they did not receive');
  check('E', 'it says plainly that no meals are scheduled',
    /does not schedule meals/i.test(flat), '');
  check('E', 'the food-and-medication question still reaches the prescriber',
    /prescriber or pharmacist/i.test(flat), '');
  check('E', 'and no organ meat is offered to them as food anyway',
    !/\*\s*\[?\s*\]?\s*[^\n]{0,30}\b(?:liver|beef heart|organ meats?)\b/i.test(
      String(both[2] || '') + String(both[4] || '')), '');

  // The model is told the same truth the reader is. buildMedicalSafetyRules() feeds the
  // system prompts for Reports #1 and #6, and none of the four copy gates tests for a
  // claim about what another section contains, so a false premise here reaches the
  // reader as fluent prose with nothing to stop it.
  const rulesBoth = buildMedicalSafetyRules(ctxBoth);
  check('E', 'the prompt does not tell the model this reader has a meal plan',
    !/meal plan has had organ meats/i.test(rulesBoth),
    'the model is briefed on a plan the reader never receives');
  check('E', 'the prompt says plainly that no plan and no quantities were given',
    /receives NO meal plan and NO food quantities/i.test(rulesBoth), '');
  check('E', 'the organ-meat prohibition and the routing survive in the prompt',
    /Do not suggest they eat liver or other organ meats/i.test(rulesBoth) &&
    /prescriber or pharmacist/i.test(rulesBoth), '');
  const rulesAnticoagOnly = buildMedicalSafetyRules(deriveMedicalContext(
    { ...BASE, medications: 'Warfarin 5mg daily', conditions: ['none'], otherConditions: '' }));
  check('E', 'a reader who DOES get a plan is still briefed the original way',
    /meal plan has had organ meats, including liver, REMOVED/i.test(rulesAnticoagOnly), '');

  // The reader with the blood thinner and NO kidney disease keeps the original
  // wording, so this is a variant for one intersection and not a rewrite for everyone.
  const ANTICOAG_ONLY = { ...BASE, medications: 'Warfarin 5mg daily', conditions: ['none'], otherConditions: '' };
  const { reports: anticoagOnly } = await build(ANTICOAG_ONLY);
  const flatOnly = Object.values(anticoagOnly).join('\n').replace(/\n>?\s*/g, ' ');
  check('E', 'an anticoagulant reader WITH a meal plan still gets the original wording',
    /meal plan has had those items left out/i.test(flatOnly), '');
  check('E', 'and still gets the meal-plan exclusion note in Report #3',
    /leaves out organ/i.test(String(anticoagOnly[3] || '').replace(/\n>?\s*/g, ' ')), '');
}

// ===========================================================================
// GROUP F — the Lion protocol's Report #2.
//
// Lion is the one protocol whose "Daily Eating Pattern" states an amount, and it is
// a static string: "500-1500g <protein> + salt", the same for every Lion reader. It
// is not calculated from the protein target, which is exactly why the suppression
// built for the meal plan never touched it. To the reader holding the report that
// distinction does not exist: they were told we set no target and print no portions,
// and then handed a daily quantity of meat two sections later.
// ===========================================================================
{
  const LION = { ...BASE, diet: 'Lion', selectedProtocol: 'Lion' };
  const LION_RENAL = { ...LION, conditions: [], otherConditions: 'Chronic kidney disease, stage 3' };
  const LION_HEALTHY = { ...LION, conditions: ['none'], otherConditions: '' };

  const { reports: lionRenal } = await build(LION_RENAL);
  const { reports: lionHealthy } = await build(LION_HEALTHY);
  const r2 = String(lionRenal[2] || '');
  const h2 = String(lionHealthy[2] || '');

  check('F', 'the Lion renal fixture is on the suppressed path',
    deriveMedicalContext(LION_RENAL).restrictProteinTarget === true, '');

  check('F', 'the Lion daily amount is gone for a renal reader',
    !/500-1500/.test(r2), '500-1500g is still printed to a reader we withhold a target from');
  for (const [re, what] of QUANTITY_PATTERNS) {
    check('F', `the Lion renal food guide contains no ${what}`, !re.test(r2), (r2.match(re) || [''])[0]);
  }
  check('F', 'no replacement amount was invented in its place',
    !/\d/.test(r2.split('\n').filter(l => /One meal|One large meal/.test(l)).join(' ')), '');
  check('F', 'the amount decision is routed to a clinician instead',
    /renal dietitian/i.test(r2) && /doctor/i.test(r2), '');

  // Still a report, not a hole where one was.
  check('F', 'Report #2 still renders its heading and eating pattern',
    /^## Report #2:/m.test(r2) && /Daily Eating Pattern/.test(r2), r2.slice(0, 120));
  check('F', 'the bullets that carry no intake guidance are untouched',
    /- \*\*Meal timing:\*\* Whenever hungry/.test(r2) && /- \*\*Seasoning:\*\* Salt only/.test(r2), '');
  check('F', 'the section is not degraded to a stub',
    r2.length > 800, `length ${r2.length}`);

  // The healthy Lion reader is the control, and the else branch (every other
  // protocol) lists combinations rather than amounts, so it cannot be affected.
  check('F', 'a healthy Lion reader still gets the original amount',
    /- \*\*One large meal:\*\* 500-1500g/.test(h2),
    'the fix reached readers it was not for');
  const secondLion = await build(LION_HEALTHY);
  check('F', 'the healthy Lion food guide is byte-for-byte stable',
    String(secondLion.reports[2] || '') === h2, 'the healthy Lion guide changed between builds');
}

globalThis.fetch = realFetch;

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  [${f.group}] ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
  console.log(`\nrenal-meal-plan-suppression: ${passed} passed, ${failures.length} FAILED`);
  process.exit(1);
}
console.log(`renal-meal-plan-suppression: ${passed} passed, 0 failed  (groups A B C D E F)`);
console.log('');
console.log('A withheld protein target is not delivered as food. The plan is not built,');
console.log('the quantities do not exist, nothing is substituted for them, and the reader');
console.log('keeps the other eleven sections of the report they paid for.');
