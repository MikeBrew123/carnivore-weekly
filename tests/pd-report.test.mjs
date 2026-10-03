#!/usr/bin/env node
/**
 * tests/pd-report.test.mjs
 *
 * PescoDial paid report, Pescatarian Mediterranean (Brew's design, Sarah's copy).
 * Renders through the REAL path: buildReportData + calculateMacros +
 * generateAllReports + wrapInPrintHTML, the same calls handleReportInit makes.
 *
 *   A. healthy reader: the numbers printed are the guarded macro set, the 7-day table
 *      carries portions, the grocery list carries amounts, PD branding only;
 *   B. medication or diabetes ('qualified'): numbers at maintenance, with the note;
 *      a diabetes medicine adds the low-blood-sugar question;
 *   C. kidney disease ('suppressed'): NO number anywhere it could be read as a target,
 *      dishes only, grocery list with no amounts, the numbers-hidden note;
 *   D. blood thinner: same hidden variant, plus the keep-greens-steady note and question;
 *   E. allergies remove the food from the plan, the list, the recipes and the
 *      eating-out tips; a fish allergy is refused, not served a fish-free week;
 *   F. the four copy gates run on PD sections (a claim smuggled in through the
 *      reader's own name is rejected, the way it would be on a CW report).
 *
 * Run: node tests/pd-report.test.mjs
 */
import path from 'node:path';

const API = path.resolve(new URL('../api/calculator-api.js', import.meta.url).pathname);
globalThis.fetch = async (url) => { throw new Error('pd-report test: unexpected network call to ' + url); };

const api = await import('file://' + API);
const { __test_buildReportData: buildReportData, __test_calculateMacros: calculateMacros,
  __test_generateAllReports: generateAllReports, __test_wrapInPrintHTML: wrapInPrintHTML,
  __test_ReportValidationError: ReportValidationError } = api;
const { applyCalorieGuidance, deriveMedicalContext } = await import('../api/medical-context.js');

const BASE = {
  sex: 'female', age: 58, heightFeet: 5, heightInches: 5, weight: 180, goalWeight: 150,
  lifestyle: 'light', exercise: '1-2', goal: 'lose', deficit: 20,
  email: 'pd-report-fixture@example.com', firstName: 'Margaret', lastName: 'Ellis',
  medications: '', conditions: ['none'], otherConditions: '', symptoms: ['none'], otherSymptoms: '',
  allergies: '', avoidFoods: '', additionalNotes: '', diet: 'pesco-mediterranean',
};

const quiet = ['log', 'info', 'warn', 'debug'].map(k => [k, console[k]]);
async function render(over = {}) {
  const form = { ...BASE, ...over };
  const session = { id: 'pd-fixture', email: form.email, first_name: form.firstName, last_name: form.lastName,
    diet_type: 'pesco-mediterranean', form_data: form };
  for (const [k] of quiet) console[k] = () => {};
  try {
    const data = buildReportData(session);
    data.macros = calculateMacros(form);
    const sections = await generateAllReports(data, 'sk-fixture-not-a-real-key');
    let joined = '';
    for (let i = 1; i <= 13; i++) if (sections[i]) joined += (joined ? '\n' : '') + sections[i];
    return { data, sections, html: wrapInPrintHTML(joined, data) };
  } finally {
    for (const [k, fn] of quiet) console[k] = fn;
  }
}
const section = (html, name) => {
  const m = html.match(new RegExp(`<section class="page[^"]*" data-pd-section="${name}">([\\s\\S]*?)</section>`));
  return m ? m[1] : '';
};
const text = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('PASS', name); }
  catch (e) { failed++; console.log('FAIL', name, '-', e.message.split('\n')[0]); }
}
const ok = (cond, msg) => { if (!cond) throw new Error(msg); };

const HIDDEN_NOTE = "we've left the daily numbers out of your plan";
const QUALIFIED_NOTE = "we've set your calories at about what your body uses now";
const BLOOD_THINNER_NOTE = 'keep the amount of leafy greens you eat about the same';
const Q_CALORIES = 'What daily calories and protein should I aim for?';
const Q_DIABETES = 'could any of my diabetes medicines make my blood sugar drop too low?';
const Q_THINNER = 'I take a blood thinner.';

const healthy = await render();

await check('A1. healthy reader sees the guarded numbers, not raw ones', async () => {
  const m = applyCalorieGuidance(healthy.data.macros, deriveMedicalContext(healthy.data));
  const nums = text(section(healthy.html, 'numbers'));
  ok(nums.includes(`Calories per day ${m.calories.toLocaleString('en-US')}`), `calorie card does not show ${m.calories}`);
  ok(nums.includes(`Protein ${m.protein_grams} g`), `protein card does not show ${m.protein_grams} g`);
  ok(nums.includes(`Fat ${m.fat_grams} g`), 'fat card wrong');
  ok(nums.includes(`Carbs ${m.carbs_grams} g`), 'carb card wrong');
  ok(!nums.includes(QUALIFIED_NOTE) && !nums.includes(HIDDEN_NOTE), 'a healthy reader got a medical note');
});

await check('A2. 7-day table has portions and the grocery list has amounts', async () => {
  const meals = section(healthy.html, 'meals');
  ok((meals.match(/<tr><th scope="row">/g) || []).length === 7, 'not 7 day rows');
  ok((meals.match(/class="portion"/g) || []).length === 28, 'not 28 portion lines');
  const qtys = [...section(healthy.html, 'grocery').matchAll(/<span class="qty">([^<]*)<\/span>/g)].map(x => x[1]);
  ok(qtys.length > 10 && qtys.every(q => /\d|[¼½¾⅛]/.test(q)), 'grocery list missing amounts');
});

await check('A3. PescoDial branding only, 8 numbered sections, noindex', async () => {
  ok(!/carnivore\s*weekly|carnivoreweekly/i.test(healthy.html), 'Carnivore Weekly text in a PD report');
  ok(/<title>Personalized Pescatarian Mediterranean Plan for Margaret Ellis · PescoDial<\/title>/.test(healthy.html), 'title');
  ok(/<meta name="robots" content="noindex">/.test(healthy.html), 'noindex');
  for (const s of ['cover', 'numbers', 'fish', 'meals', 'grocery', 'recipes', 'eating-out', 'doctor', 'sources']) {
    ok(section(healthy.html, s), `missing section ${s}`);
  }
  ok(!/Report #\d|\n---\n|About this report:/.test(healthy.html), 'CW markdown or CW disclaimer leaked in');
  ok(!healthy.html.includes(Q_CALORIES), 'calorie question shown while numbers are shown');
  ok(!healthy.html.includes(Q_DIABETES) && !healthy.html.includes(Q_THINNER), 'condition-specific questions shown to a healthy reader');
});

await check('A4. five fish meals, five recipes, each recipe labelled with its day', async () => {
  ok((section(healthy.html, 'meals').match(/class="tag">Fish</g) || []).length === 5, 'not 5 fish meals');
  const r = section(healthy.html, 'recipes');
  ok((r.match(/<article class="recipe">/g) || []).length === 5, 'not 5 recipes');
  ok(/Recipe 1 · Monday dinner/.test(r) && /Recipe 2 · Tuesday lunch/.test(r), 'recipe day labels');
});

await check('B1. medication declared: maintenance numbers and the qualified note', async () => {
  const r = await render({ medications: 'lisinopril' });
  const m = calculateMacros({ ...BASE, medications: 'lisinopril' });
  const nums = text(section(r.html, 'numbers'));
  ok(nums.includes(`Calories per day ${m.tdee.toLocaleString('en-US')}`), `calories should be maintenance ${m.tdee}`);
  ok(!nums.includes(`Calories per day ${m.calories.toLocaleString('en-US')}`), 'deficit target still printed');
  ok(nums.includes(QUALIFIED_NOTE), 'qualified note missing');
  ok(!r.html.includes(HIDDEN_NOTE), 'medication alone must not hide the numbers');
});

await check('B2. diabetes medicine adds the low-blood-sugar question', async () => {
  const r = await render({ medications: 'metformin' });
  ok(r.html.includes(Q_DIABETES), 'diabetes question missing');
  ok(text(section(r.html, 'numbers')).includes(QUALIFIED_NOTE), 'qualified note missing');
});

for (const [label, over, extraNote, extraQ] of [
  ['C. kidney disease', { otherConditions: 'CKD stage 3' }, null, null],
  ['D. blood thinner', { medications: 'warfarin' }, BLOOD_THINNER_NOTE, Q_THINNER],
]) {
  await check(`${label}: numbers hidden everywhere, dishes only`, async () => {
    const r = await render(over);
    const nums = section(r.html, 'numbers');
    ok(nums.includes(HIDDEN_NOTE), 'numbers-hidden note missing');
    ok(!/num-card|Calories per day|split-bar/.test(nums), 'a number card rendered');
    ok(!/\d+\s*(g|kcal|calories)\b/i.test(text(nums)), 'a gram or calorie figure in the numbers section');
    const meals = section(r.html, 'meals');
    ok((meals.match(/<tr><th scope="row">/g) || []).length === 7, 'not 7 day rows');
    ok(!/class="portion"/.test(meals), 'portions printed');
    ok(!/\d+\s*(oz|cups?|tbsp|slices?|cans?)\b/i.test(text(meals)), 'a quantity in the meal table');
    const qtys = [...section(r.html, 'grocery').matchAll(/<span class="qty">([^<]*)<\/span>/g)].map(x => x[1]);
    ok(qtys.length > 10 && qtys.every(q => q === ''), 'grocery amounts printed');
    ok(r.html.includes(Q_CALORIES), 'calorie question missing from the hidden variant');
    ok(/Your weekly fish plan, seven days of meals/.test(section(r.html, 'cover')), 'cover promises numbers');
    if (extraNote) ok(r.html.includes(extraNote), 'blood thinner note missing');
    if (extraQ) ok(r.html.includes(extraQ), 'blood thinner question missing');
    if (!extraNote) ok(!r.html.includes(BLOOD_THINNER_NOTE), 'blood thinner note shown without a blood thinner');
  });
}

const PLAN_SECTIONS = ['meals', 'grocery', 'recipes', 'eating-out'];
await check('E1. shellfish allergy: no shellfish in the plan, list, recipes or tips', async () => {
  const r = await render({ allergies: 'shellfish' });
  for (const s of PLAN_SECTIONS) {
    const m = text(section(r.html, s)).match(/\b(shrimp|prawns?|clams?|oysters?|scallops?|crab|lobster|mussels?)\b/i);
    ok(!m, `"${m && m[0]}" in ${s}`);
  }
  ok((section(r.html, 'meals').match(/class="tag">Fish</g) || []).length === 5, 'fish meals not kept at 5');
});

await check('E2. egg allergy: no eggs in the plan, list or recipes', async () => {
  const r = await render({ allergies: 'eggs' });
  // Items only: the grocery aisle is still called "Dairy and eggs".
  const items = h => [...h.matchAll(/<(?:td|li)[^>]*>([\s\S]*?)<\/(?:td|li)>/g)].map(x => text(x[1])).join(' | ');
  for (const s of ['meals', 'grocery', 'recipes']) {
    const m = items(section(r.html, s)).match(/.{0,30}\beggs?\b.{0,30}/i);
    ok(!m, `egg in ${s}: ${m && m[0]}`);
  }
});

await check('E3. avoid list removes the food (feta)', async () => {
  const r = await render({ avoidFoods: 'feta' });
  for (const s of ['meals', 'grocery', 'recipes']) ok(!/\bfeta\b/i.test(text(section(r.html, s))), `feta in ${s}`);
});

await check('E5. a recipe is dropped when only a side ingredient is excluded (onion)', async () => {
  const r = await render({ avoidFoods: 'onion' });
  const rec = section(r.html, 'recipes');
  ok(!/\bonion\b/i.test(text(rec)), 'onion in recipes');
  ok(!/Sardine and white bean toast/.test(rec), 'sardine toast recipe (red onion) kept');
  ok((rec.match(/<article class="recipe">/g) || []).length === 4, 'expected 4 recipes');
  ok(/Four easy recipes/.test(rec), 'heading count not updated');
});

await check('E4. fish allergy is refused with a structured error, not a fish-free week', async () => {
  let err = null;
  try { await render({ allergies: 'fish, shellfish' }); } catch (e) { err = e; }
  ok(err instanceof ReportValidationError, `expected ReportValidationError, got ${err && err.message}`);
  ok(err.code === 'PD_PLAN_NOT_POSSIBLE', `code ${err.code}`);
});

await check('F. copy gates run on PD sections (outcome claim in the name is rejected)', async () => {
  let err = null;
  try { await render({ firstName: 'You will feel', lastName: 'lighter' }); } catch (e) { err = e; }
  ok(err && /PD Report #/.test(err.message), `expected a PD copy-gate rejection, got ${err ? err.message.split('\n')[0] : 'no error'}`);
});

process.exit(failed ? 1 : 0);
