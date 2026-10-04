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
 *   S. every other PescoDial style (Low Carb, Keto, Carnivore) renders this report, not
 *      CW's: its own label on the cover and title, its 7-day plan, grocery list,
 *      recipes, plate guide and eating-out line; nothing Mediterranean and no CW
 *      section; no forbidden food in its plan; the numbers-hidden variant (kidney
 *      disease plus a blood thinner) prints no number; allergies and a fish allergy
 *      behave as above.
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
async function render(over = {}, sessionDiet) {
  const form = { ...BASE, ...over };
  const session = { id: 'pd-fixture', email: form.email, first_name: form.firstName, last_name: form.lastName,
    diet_type: sessionDiet === undefined ? form.diet : sessionDiet, form_data: form };
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
const BLOOD_THINNER_NOTE = 'keep the amount of leafy greens you eat about the same';
// The warning box (Brew, 2026-10-04): one line per concern, only for readers who have one.
const concerns = html => [...html.matchAll(/data-concern="([a-zA-Z]+)"/g)].map(m => m[1]);
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
  ok(!/data-pd-warning/.test(healthy.html) && !nums.includes(HIDDEN_NOTE), 'a healthy reader got a medical warning');
  ok(!/WARN_[A-Z]/.test(healthy.html), 'warning copy placeholder in the report');
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

await check('B1. medication declared: maintenance numbers and a warning saying why', async () => {
  const r = await render({ medications: 'lisinopril' });
  const m = calculateMacros({ ...BASE, medications: 'lisinopril' });
  const nums = text(section(r.html, 'numbers'));
  ok(nums.includes(`Calories per day ${m.tdee.toLocaleString('en-US')}`), `calories should be maintenance ${m.tdee}`);
  ok(!nums.includes(`Calories per day ${m.calories.toLocaleString('en-US')}`), 'deficit target still printed');
  ok(JSON.stringify(concerns(r.html)) === '["otherMedicine","maintenance"]', `concerns ${concerns(r.html)}`);
  ok(!r.html.includes(HIDDEN_NOTE), 'medication alone must not hide the numbers');
});

await check('B2. diabetes medicine: warning names low blood sugar, plus the question', async () => {
  const r = await render({ medications: 'metformin' });
  ok(r.html.includes(Q_DIABETES), 'diabetes question missing');
  ok(JSON.stringify(concerns(r.html)) === '["diabetes","maintenance"]', `concerns ${concerns(r.html)}`);
});

await check('B3. blood thinner: numbers shown, warning names leafy greens, plus the question', async () => {
  const r = await render({ medications: 'warfarin' });
  const nums = text(section(r.html, 'numbers'));
  ok(/Calories per day \d/.test(nums) && !nums.includes(HIDDEN_NOTE), 'numbers hidden for a blood thinner');
  ok((section(r.html, 'meals').match(/class="portion"/g) || []).length === 28, 'portions missing');
  ok(JSON.stringify(concerns(r.html)) === '["bloodThinner","maintenance"]', `concerns ${concerns(r.html)}`);
  ok(r.html.includes(Q_THINNER), 'blood thinner question missing');
});

await check('B4. heart condition, no medicine: maintenance line only, no medicine line', async () => {
  const r = await render({ otherConditions: 'high blood pressure' });
  ok(JSON.stringify(concerns(r.html)) === '["maintenance"]', `concerns ${concerns(r.html)}`);
});

await check('B5. medication with a maintain goal: warning without the calorie line', async () => {
  const r = await render({ medications: 'lisinopril', goal: 'maintain', deficit: 0 });
  ok(JSON.stringify(concerns(r.html)) === '["otherMedicine"]', `concerns ${concerns(r.html)}`);
});

for (const [label, over, extraNote, extraQ] of [
  ['C. kidney disease', { otherConditions: 'CKD stage 3' }, null, null],
  ['D. kidney disease and a blood thinner', { otherConditions: 'CKD stage 3', medications: 'warfarin' }, BLOOD_THINNER_NOTE, Q_THINNER],
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

// S. The other three PescoDial styles.
const STYLES = {
  'pesco-lowcarb': {
    label: 'Pescatarian Low Carb', fish: 5,
    plate: 'A quarter to a half: fish, seafood or eggs, about the size of your palm',
    eatingOut: 'Trade the starch for a second vegetable',
    recipe: 'Shrimp stir-fry with cauliflower rice', card: 'Vegetables, berries, nuts',
    forbidden: /\b(bread|pita|pasta|rice(?! vinegar)|quinoa|bulgur|oats|potato(es)?|lentils?|chickpeas?|hummus|white beans|apple|orange|pear|dates)\b/i,
  },
  'pesco-keto': {
    label: 'Pescatarian Keto', fish: 7,
    plate: 'Most of the plate: fish, seafood or eggs',
    eatingOut: 'Skip the bread basket, rice and potatoes',
    recipe: 'Garlic shrimp with zucchini noodles', card: 'Leafy and green vegetables',
    forbidden: /\b(bread|pita|pasta|quinoa|bulgur|oats|potato(es)?|lentils?|chickpeas?|hummus|beans|apple|orange|pear|dates|milk)\b/i,
  },
  'pesco-carnivore': {
    label: 'Pescatarian Carnivore', fish: 7,
    plate: 'Fish, seafood or eggs make up the plate.',
    eatingOut: 'Order the fish or shrimp plain, cooked in butter',
    recipe: 'Brown butter shrimp', card: 'Very little on this style',
    forbidden: /\b(bread|pasta|quinoa|oats|potato(es)?|lentils?|chickpeas?|hummus|beans|spinach|greens|broccoli|cauliflower|asparagus|zucchini|tomato(es)?|cucumber|carrots?|pepper|avocado|olives?|olive oil|almonds|walnuts|macadamia|berries|raspberries|strawberries|blueberries|lemon|cabbage|mushrooms|chia)\b/i,
  },
};
// CW report section titles and markers that must never appear in a PD report.
const CW_LEAKS = /Report #\d|30-Day|Day 30|\bday\s*30\b|Your Carnivore|Carnivore Diet Report|Mediterranean|About this report:|\n---\n/i;
const aisles = html => [...section(html, 'grocery').matchAll(/<h3>([^<]+?)(?: <small>|<\/h3>)/g)].map(m => m[1]);
for (const [diet, want] of Object.entries(STYLES)) {
  const r = await render({ diet });
  await check(`S1. ${diet}: the PD report with its own label, 7-day plan, grocery list and copy`, async () => {
    ok(new RegExp(`<title>Personalized ${want.label} Plan for Margaret Ellis · PescoDial</title>`).test(r.html), 'title');
    const cover = section(r.html, 'cover');
    ok(cover.includes(`<div class="style-name">${want.label}</div>`) && cover.includes(`<dd>${want.label}</dd>`), 'cover label');
    for (const s of ['cover', 'numbers', 'fish', 'meals', 'grocery', 'recipes', 'eating-out', 'doctor', 'sources']) ok(section(r.html, s), `missing section ${s}`);
    const m = CW_LEAKS.exec(r.html);
    ok(!m, `CW or Mediterranean text in a ${want.label} report: "${m && m[0]}"`);
    ok(!/carnivore\s*weekly|carnivoreweekly/i.test(r.html), 'Carnivore Weekly text in a PD report');
    const meals = section(r.html, 'meals');
    ok((meals.match(/<tr><th scope="row">/g) || []).length === 7, 'not 7 day rows');
    ok((meals.match(/class="portion"/g) || []).length === 28, 'not 28 portion lines');
    ok((meals.match(/class="tag">Fish</g) || []).length === want.fish, `not ${want.fish} fish meals`);
    const qtys = [...section(r.html, 'grocery').matchAll(/<span class="qty">([^<]*)<\/span>/g)].map(x => x[1]);
    ok(qtys.length >= 8 && qtys.every(q => /\d|[¼½¾⅛]/.test(q)), 'grocery list missing amounts');
    ok(text(section(r.html, 'numbers')).includes(want.plate), 'plate guide is not this style\'s');
    ok(text(section(r.html, 'numbers')).includes(want.card), 'card notes are not this style\'s');
    ok(text(section(r.html, 'eating-out')).includes(want.eatingOut), 'eating-out line is not this style\'s');
    const rec = section(r.html, 'recipes');
    ok((rec.match(/<article class="recipe">/g) || []).length === 5, 'not 5 recipes');
    ok(rec.includes(want.recipe), 'recipes are not this style\'s');
    const labels = [...rec.matchAll(/Recipe \d · ([A-Za-z]+)/g)].map(x => x[1]);
    ok(labels.length === 5 && labels.every(l => /day$/.test(l)), `a recipe is not tied to a plan day: ${labels}`);
  });
  await check(`S2. ${diet}: no food this style leaves out, in the plan or the grocery list`, async () => {
    for (const s of ['meals', 'grocery']) {
      // "Green beans" are a vegetable and "cauliflower rice" is cauliflower.
      const body = text(section(r.html, s)).replace(/green beans/gi, 'GB').replace(/cauliflower rice/gi, 'CR');
      const m = body.match(want.forbidden);
      ok(!m, `"${m && m[0]}" in ${s}`);
    }
    if (diet === 'pesco-carnivore') {
      ok(JSON.stringify(aisles(r.html)) === '["Seafood","Dairy and eggs"]', `carnivore aisles ${aisles(r.html)}`);
    } else {
      ok(!aisles(r.html).includes('Bread'), 'a bread aisle on a low-carb list');
    }
  });
  await check(`S3. ${diet}: kidney disease and a blood thinner, numbers hidden everywhere`, async () => {
    const h = await render({ diet, otherConditions: 'CKD stage 3', medications: 'warfarin' });
    const nums = section(h.html, 'numbers');
    ok(nums.includes(HIDDEN_NOTE), 'numbers-hidden note missing');
    ok(!/num-card|Calories per day|split-bar/.test(nums), 'a number card rendered');
    ok(!/\d+\s*(g|kcal|calories)\b/i.test(text(nums)), 'a gram or calorie figure in the numbers section');
    if (diet === 'pesco-lowcarb') {
      const meals = section(h.html, 'meals');
      ok((meals.match(/<tr><th scope="row">/g) || []).length === 7, 'not 7 day rows');
      ok(!/class="portion"/.test(meals), 'portions printed');
      ok(!/\d+\s*(oz|cups?|tbsp|slices?|cans?|sticks?)\b/i.test(text(meals)), 'a quantity in the meal table');
      const q = [...section(h.html, 'grocery').matchAll(/<span class="qty">([^<]*)<\/span>/g)].map(x => x[1]);
      ok(q.length >= 8 && q.every(x => x === ''), 'grocery amounts printed');
    } else {
      // Kidney disease on Keto or Carnivore: no meal week at all (R3 below).
      for (const s of ['meals', 'grocery', 'recipes']) ok(!section(h.html, s), `${s} section rendered for a renal ${diet} reader`);
    }
    ok(h.html.includes(Q_CALORIES) && h.html.includes(Q_THINNER), 'hidden-variant questions missing');
    ok(h.html.includes(BLOOD_THINNER_NOTE), 'blood thinner note missing');
    ok(new RegExp(`<div class="style-name">${want.label}</div>`).test(h.html), 'hidden variant lost its label');
  });
  await check(`S4. ${diet}: blood thinner with numbers shown gets a true warning line`, async () => {
    const b = await render({ diet, medications: 'warfarin' });
    ok(JSON.stringify(concerns(b.html)) === '["bloodThinner","maintenance"]', `concerns ${concerns(b.html)}`);
    const line = (b.html.match(/data-concern="bloodThinner">([^<]*)</) || [])[1] || '';
    if (diet === 'pesco-carnivore') ok(!/Your meal plan has leafy greens/.test(line), 'carnivore warning claims leafy greens in the plan');
    ok(line.length > 40, 'empty blood thinner line');
  });
  await check(`S5. ${diet}: shellfish allergy and fish allergy`, async () => {
    const sh = await render({ diet, allergies: 'shellfish' });
    for (const s of ['meals', 'grocery', 'recipes']) {
      const m = text(section(sh.html, s)).match(/\b(shrimp|prawns?|clams?|oysters?|scallops?|crab|lobster|mussels?)\b/i);
      ok(!m, `"${m && m[0]}" in ${s}`);
    }
    ok((section(sh.html, 'meals').match(/class="tag">Fish</g) || []).length === want.fish, 'fish meals not kept');
    let err = null;
    try { await render({ diet, allergies: 'fish, shellfish' }); } catch (e) { err = e; }
    ok(err instanceof ReportValidationError && err.code === 'PD_PLAN_NOT_POSSIBLE', `expected PD_PLAN_NOT_POSSIBLE, got ${err && (err.code || err.message)}`);
  });
}

// G. Lifecycle email branding. Supabase and Resend are stubbed; nothing is sent.
async function lifecycle(fnName, diet, obj) {
  const sends = [];
  const saved = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.resend.com')) { sends.push(JSON.parse(opts.body)); return { ok: true, status: 200, json: async () => ({ id: 'x' }), text: async () => '' }; }
    if (u.includes('cw_assessment_sessions?id=')) return { ok: true, status: 200, json: async () => ([{ id: obj.client_reference_id, email: 'b@example.com', payment_status: 'pending', form_data: { diet } }]), text: async () => '' };
    return { ok: true, status: 200, json: async () => ([]), text: async () => '' };
  };
  for (const [k] of quiet) console[k] = () => {};
  try {
    const env = { SUPABASE_URL: 'https://stub', SUPABASE_SERVICE_ROLE_KEY: 'k', RESEND_API_KEY: 'k', CW_ABANDON_RECOVERY_ENABLED: 'true', UNSUBSCRIBE_SECRET: 's' };
    const result = await api[fnName](env, obj);
    return { result, sends };
  } finally { globalThis.fetch = saved; for (const [k, fn] of quiet) console[k] = fn; }
}
const ASSESS = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const paidObj = { id: 'cs_test_1', client_reference_id: ASSESS, payment_status: 'paid', customer_email: 'b@example.com', created: 1893456000 };

await check('G1. PD resume email: PescoDial sender, pescodial.com link, PescoDial signature', async () => {
  const { sends } = await lifecycle('__test_sendResumeEmailIfOwed', 'pesco-mediterranean', paidObj);
  ok(sends.length === 1, `sends=${sends.length}`);
  const m = sends[0];
  ok(m.from === 'PescoDial <reports@pescodial.com>', m.from);
  ok(m.reply_to === 'pescodial@carnivoreweekly.com', m.reply_to);
  ok(m.html.includes('https://www.pescodial.com/calculator/?payment=success&session_id=' + ASSESS), 'resume link not on www.pescodial.com');
  ok(!/carnivore\s*weekly|carnivoreweekly\.com\/calculator/i.test(m.html + m.text), 'Carnivore Weekly in a PD resume email');
});

await check('G2. CW resume email unchanged', async () => {
  const { sends } = await lifecycle('__test_sendResumeEmailIfOwed', 'carnivore', paidObj);
  ok(sends[0].from === 'Carnivore Weekly <reports@carnivoreweekly.com>' && sends[0].reply_to === 'sarah@carnivoreweekly.com', sends[0].from);
  ok(sends[0].html.includes('https://carnivoreweekly.com/calculator.html?payment=success'), 'CW link changed');
});

await check('G3. CW abandon-recovery copy never goes to a PD reader', async () => {
  const { result, sends } = await lifecycle('__test_sendAbandonRecoveryIfOwed', 'pesco-keto', { ...paidObj, payment_status: 'unpaid' });
  ok(sends.length === 0, `sent ${sends.length}`);
  ok(result.skipped === 'pd-recovery-not-approved', JSON.stringify(result));
});

await check('G4. claim gate knows the PD diet words', async () => {
  const ctx = deriveMedicalContext({ conditions: ['type 2 diabetes'] });
  const { assertNoConditionClaimFrames } = await import('../api/medical-context.js');
  let threw = false;
  try { assertNoConditionClaimFrames('x', 'The Mediterranean pattern reverses type 2 diabetes.', ctx); } catch { threw = true; }
  ok(threw, 'Mediterranean claim frame not caught');
});

// ---------------------------------------------------------------------------
// R. Red-team health review fixes (2026-10-03). Every check renders a real report.
// ---------------------------------------------------------------------------
const ALL_STYLES = ['pesco-mediterranean', 'pesco-lowcarb', 'pesco-keto', 'pesco-carnivore'];
const SEAFOOD_RE = /\b(salmon|sardines?|shrimp|cod|trout|tuna|tilapia|mackerel|scallops?|halibut)\b/i;
const fishTags = html => (section(html, 'meals').match(/class="tag">Fish</g) || []).length;
const mealCells = html => [...section(html, 'meals').matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m => text(m[1]));
const assertHidden = (html, tag) => {
  const nums = section(html, 'numbers');
  ok(nums.includes(HIDDEN_NOTE), `${tag}: numbers-hidden note missing`);
  ok(!/num-card|Calories per day|split-bar|data-pd-warning/.test(nums), `${tag}: a number card rendered`);
  ok(!/\d+\s*(g|kcal|calories)\b/i.test(text(nums)), `${tag}: a gram or calorie figure in the numbers section`);
  ok(!/class="portion"/.test(section(html, 'meals')), `${tag}: portions printed`);
  const q = [...section(html, 'grocery').matchAll(/<span class="qty">([^<]*)<\/span>/g)].map(x => x[1]);
  ok(q.every(x => x === ''), `${tag}: grocery amounts printed`);
};

for (const diet of ALL_STYLES) {
  await check(`R1a. ${diet}: pregnant or breastfeeding (PD form) hides numbers, sizes nothing, caps fish at 2, no smoked or raw fish`, async () => {
    const r = await render({ diet, otherConditions: 'pregnant or breastfeeding' });
    assertHidden(r.html, 'pregnancy');
    ok((section(r.html, 'meals').match(/<tr><th scope="row">/g) || []).length === 7, 'pregnancy: not 7 day rows');
    ok(fishTags(r.html) <= 2, `pregnancy: ${fishTags(r.html)} fish meals, the pregnancy box allows 2 to 3`);
    const seafoodMeals = mealCells(r.html).filter(c => SEAFOOD_RE.test(c)).length;
    ok(seafoodMeals <= 3, `pregnancy: ${seafoodMeals} meals carry seafood, the pregnancy box allows 2 to 3`);
    for (const s of ['meals', 'grocery', 'recipes', 'eating-out']) {
      const m = text(section(r.html, s)).match(/smoked (salmon|trout|fish)|\blox\b|sushi|sashimi|ceviche/i);
      ok(!m, `pregnancy: "${m && m[0]}" in ${s}`);
    }
    // Only recipes for dishes the capped week serves: five fish recipes would undo the cap.
    const labels = [...section(r.html, 'recipes').matchAll(/Recipe \d · ([A-Za-z]+)/g)].map(x => x[1]);
    ok(labels.every(l => /day$/.test(l)), `pregnancy: a recipe for a dish the week does not serve: ${labels}`);
    ok(/If you're pregnant, breastfeeding or might become pregnant/.test(section(r.html, 'fish')), 'pregnancy box missing');
    ok(!/We swapped one or more of this week's fish meals|we swapped one or more/i.test(section(r.html, 'meals')), 'the fish cap is reported as an allergy swap');
  });
}

await check('R1b. pregnancy terms in any spelling set the flag and take the deficit away', async () => {
  for (const t of ['Pregnant (20 weeks)', 'breast-feeding', 'breastfeeding my son', 'nursing', 'lactating']) {
    const ctx = deriveMedicalContext({ otherConditions: t });
    ok(ctx.pregnancy === true, `"${t}" not read as pregnancy`);
    ok(ctx.calorieGuidance !== 'normal', `"${t}": calorie guidance still normal`);
  }
  ok(deriveMedicalContext({ otherConditions: 'none' }).pregnancy === false, 'false positive on none');
});

await check('R1c. CW: a pregnant reader gets no deficit; a healthy CW reader is unchanged', async () => {
  const form = { ...BASE, diet: 'carnivore', otherConditions: 'pregnant or breastfeeding' };
  const data = buildReportData({ id: 'cw', email: form.email, first_name: 'M', last_name: 'E', diet_type: 'carnivore', form_data: form });
  data.macros = calculateMacros(form);
  ok(data.macros.calories < data.macros.tdee, 'fixture should ask for a deficit');
  const g = applyCalorieGuidance(data.macros, deriveMedicalContext(data));
  ok(g.calories === Math.round(data.macros.tdee) && g.deficitNeutralized, `CW pregnant reader still in deficit: ${g.calories} vs tdee ${data.macros.tdee}`);
  const healthyForm = { ...BASE, diet: 'carnivore' };
  const hd = buildReportData({ id: 'cw', email: healthyForm.email, diet_type: 'carnivore', form_data: healthyForm });
  const hg = applyCalorieGuidance(calculateMacros(healthyForm), deriveMedicalContext(hd));
  ok(hg.calorieGuidance === 'normal' && !hg.deficitNeutralized, 'healthy CW reader changed');
});

for (const diet of ALL_STYLES) {
  await check(`R2. ${diet}: glucose-lowering medicine (Jardiance)`, async () => {
    const r = await render({ diet, medications: 'Jardiance' });
    if (diet === 'pesco-keto' || diet === 'pesco-carnivore') {
      assertHidden(r.html, 'glucose');
      ok((section(r.html, 'meals').match(/<tr><th scope="row">/g) || []).length === 7, 'glucose: dish week missing');
      ok(/data-pd-hidden-reason="diabetes"/.test(section(r.html, 'numbers')), 'glucose: no talk-to-your-doctor line beside the hidden numbers');
      ok(text(section(r.html, 'numbers')).includes('eating fewer carbs can make your blood sugar drop too low'), 'glucose: diabetes line text');
      ok(r.html.includes(Q_DIABETES), 'glucose: diabetes question missing');
    } else {
      ok(/Calories per day \d/.test(text(section(r.html, 'numbers'))), `${diet}: numbers hidden for a glucose medicine`);
      ok(JSON.stringify(concerns(r.html)) === '["diabetes","maintenance"]', `concerns ${concerns(r.html)}`);
    }
  });
}
for (const med of ['insulin', 'glipizide', 'empagliflozin']) {
  await check(`R2b. pesco-keto with ${med}: numbers hidden`, async () => {
    assertHidden((await render({ diet: 'pesco-keto', medications: med })).html, med);
  });
}

for (const diet of ['pesco-keto', 'pesco-carnivore']) {
  await check(`R3. ${diet}: kidney disease gets no meal week, no grocery list, no protein-first plate`, async () => {
    const r = await render({ diet, otherConditions: 'CKD stage 3' });
    for (const s of ['meals', 'grocery', 'recipes']) ok(!section(r.html, s), `renal ${diet}: ${s} section rendered`);
    ok(!/class="week-strip"|class="fish-card"/.test(section(r.html, 'fish')), `renal ${diet}: fish week strip or counts rendered`);
    ok(!/class="plate"/.test(section(r.html, 'numbers')), `renal ${diet}: plate guide rendered`);
    ok(!/still hungry|Most of the plate|second portion of protein/i.test(text(r.html)), `renal ${diet}: protein-first copy`);
    ok(section(r.html, 'numbers').includes(HIDDEN_NOTE) && !/Until then, use the fish plan/.test(r.html), `renal ${diet}: hidden note points at a plan that is not there`);
    const nums = [...r.html.matchAll(/<div class="sec-num">(\d+)<\/div>/g)].map(m => Number(m[1]));
    ok(nums.every((n, i) => n === i + 1), `renal ${diet}: section numbers ${nums}`);
  });
}
await check('R3b. pesco-mediterranean with kidney disease keeps its dish week', async () => {
  const r = await render({ otherConditions: 'CKD stage 3' });
  ok((section(r.html, 'meals').match(/<tr><th scope="row">/g) || []).length === 7, 'Mediterranean renal week removed');
});

// The fish page prose, minus the FDA reference material (the low-mercury guide, the
// family-fish note and the pregnancy box), which names every kind on purpose.
const fishProse = html => text(section(html, 'fish').split('<h3>Low-mercury guide</h3>')[0]);
for (const diet of ALL_STYLES) {
  await check(`R4. ${diet}: shellfish and egg allergies leave no shellfish or eggs in the prose`, async () => {
    const sh = await render({ diet, allergies: 'shellfish' });
    const SHELL = /\b(shrimp|prawns?|clams?|oysters?|scallops?|crab|lobster|mussels?|shellfish)\b/i;
    for (const [where, t] of [['numbers', text(section(sh.html, 'numbers'))], ['fish prose', fishProse(sh.html)], ['eating-out', text(section(sh.html, 'eating-out'))]]) {
      const m = t.match(SHELL);
      ok(!m, `shellfish allergy: "${m && m[0]}" in ${where}`);
    }
    const eg = await render({ diet, allergies: 'eggs' });
    for (const [where, t] of [['numbers', text(section(eg.html, 'numbers'))], ['fish prose', fishProse(eg.html)], ['eating-out', text(section(eg.html, 'eating-out'))]]) {
      const m = t.match(/.{0,25}\beggs?\b.{0,25}/i);
      ok(!m, `egg allergy: "${m && m[0]}" in ${where}`);
    }
  });
}

for (const diet of ['pesco-keto', 'pesco-carnivore']) {
  await check(`R5. ${diet}: fish page counts every seafood item and states the plan's portion range`, async () => {
    const r = await render({ diet });
    const cards = [...section(r.html, 'fish').matchAll(/<div class="times">(\d+)<small>a week<\/small><\/div><div><h4>([^<]+)<\/h4>/g)].map(m => [m[2], Number(m[1])]);
    const cells = mealCells(r.html);
    const smokedMeals = cells.filter(c => /smoked salmon/i.test(c)).length;
    const card = cards.find(([n]) => n === 'Smoked salmon');
    ok(smokedMeals === 0 ? !card : card && card[1] === smokedMeals, `smoked salmon on ${smokedMeals} meals, card says ${card && card[1]}`);
    const total = cards.reduce((a, [, n]) => a + n, 0);
    const kinds = c => new Set((c.match(new RegExp(SEAFOOD_RE.source.replace('\\b(', '\\b(smoked salmon|'), 'gi')) || []).map(x => x.toLowerCase().replace(/s$/, '')));
    const expected = cells.reduce((a, c) => a + [...kinds(c)].filter(k => !(k === 'salmon' && /smoked salmon/i.test(c) && !/(^|[^d] )salmon/i.test(c.replace(/smoked salmon/gi, '')))).length, 0);
    ok(total === expected, `fish cards add to ${total}, the week has ${expected} seafood servings`);
    const oz = [...section(r.html, 'meals').matchAll(/<td data-label="[A-Za-z]+" class="fishy">[\s\S]*?<span class="portion">([^<]*)<\/span>/g)]
      .map(m => (m[1].match(/(\d+(?:½)?) oz (?:salmon|cod|shrimp|trout|tilapia|Atlantic mackerel|scallops)/) || [])[1]).filter(Boolean)
      .map(x => parseFloat(x.replace('½', '.5')));
    const lede = text(section(r.html, 'fish'));
    ok(/One serving is about 4 ounces before cooking/.test(lede), 'FDA serving text changed');
    ok(lede.includes('The FDA and EPA advise 2 to 3 servings a week (8 to 12 ounces) from their Best Choices list.'), 'FDA how-often text changed');
    const m = lede.match(/The fish meals in your plan are about (\d+)(?: to (\d+))? ounces before cooking/);
    ok(m, 'no portion range stated');
    const hi = Number(m[2] || m[1]);
    ok(oz.length && Math.round(Math.max(...oz)) <= hi + 1 && hi > 4, `stated max ${hi} oz vs plan max ${Math.max(...oz)} oz`);
  });
}

await check('R6. blood-thinner misspellings sharpen the wording; the gate is any medication', async () => {
  for (const t of ['cumadin', 'coumidin', 'coumadine', 'warferin', 'warfrin']) {
    ok(deriveMedicalContext({ medications: t }).anticoagulant, `"${t}" not read as a blood thinner`);
  }
  const r = await render({ medications: 'warferin' });
  ok(JSON.stringify(concerns(r.html)) === '["bloodThinner","maintenance"]', `concerns ${concerns(r.html)}`);
  const u = await render({ medications: 'the little white one for my heart' });
  ok(JSON.stringify(concerns(u.html)) === '["otherMedicine","maintenance"]', `unparsed medicine concerns ${concerns(u.html)}`);
});

await check('R7. a meal with no option left is its own refusal, not "every fish"', async () => {
  let err = null;
  try { await render({ diet: 'pesco-carnivore', allergies: 'dairy, eggs' }); } catch (e) { err = e; }
  ok(err instanceof ReportValidationError, `expected ReportValidationError, got ${err && err.message}`);
  ok(err.code === 'PD_MEAL_NOT_POSSIBLE', `code ${err.code}`);
  ok(!/every fish/.test(err.message) && /every option we have for at least one of your meals/.test(err.message), 'refusal text');
});

for (const [sessionDiet, formDiet, label] of [['carnivore', 'pesco-keto', 'Pescatarian Keto'], ['pesco-mediterranean', 'carnivore', 'Pescatarian Mediterranean'], ['', 'pesco-carnivore', 'Pescatarian Carnivore']]) {
  await check(`R8. diet_type "${sessionDiet}" with form diet "${formDiet}" goes to the PD report`, async () => {
    const r = await render({ diet: formDiet }, sessionDiet);
    ok(/data-pd-section="cover"/.test(r.html), 'not the PD report');
    ok(new RegExp(`<div class="style-name">${label}</div>`).test(r.html), 'wrong PD style');
  });
}

process.exit(failed ? 1 : 0);
