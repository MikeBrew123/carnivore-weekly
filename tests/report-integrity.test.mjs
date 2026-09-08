#!/usr/bin/env node
/**
 * tests/report-integrity.test.mjs
 *
 * INTERNAL-CONSISTENCY REGRESSION FOR THE $29 FULL REPORT.
 *
 * Run it:
 *     node tests/report-integrity.test.mjs
 *     node tests/report-integrity.test.mjs --dump /tmp/integrity   (writes rendered output)
 *
 * No dependencies, no network, no database, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-09-07 a customer bought the report and wrote in the same morning:
 *
 *     "My weekly meal plans don't match my weekly shopping lists?"
 *
 * She was right. Report #3 (the 30-day calendar) rotated a protein per day
 * (dayNum % pool.length). Report #4 (the weekly grocery lists) ran its OWN rotation
 * (week % pool.length) over the same pool. Two generators, two rotations, no shared
 * state. Her Week 1 called for eight cuts; her Week 1 shopping list named two, neither
 * of which appeared in a single Week 1 dinner. Every report sold had this.
 *
 * The fix was not to make her list come out right. It was to delete the second
 * generator: generateGroceryListByWeek() now aggregates the structured `items` that
 * generateFullMealPlan() attaches to each day, reads no food database, and throws if
 * it is not handed a meal plan.
 *
 * THE ARCHITECTURAL RULE THIS FILE ENFORCES:
 *
 *     Never independently regenerate data that is supposed to describe another
 *     generated output. Derive it from that output's source data.
 *
 * GROUP D is the part that matters most. A and B would both pass again if someone
 * reintroduced a second generator that happened to agree today. D asserts the
 * derivation itself: same meal plan in, same list out, whatever `data` says.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE DOES *NOT* COVER
 * ---------------------------------------------------------------------------
 * Reports #1 and #6 are written live by Claude and are stubbed here, as in
 * tests/report-safety.test.mjs. Medical/safety gating is that file's job, not this
 * one. This suite is only about whether the report agrees with itself.
 *
 * It also does NOT assert that the goal a reader selected is the goal they wanted.
 * GROUP C checks that every section names the same goal. Whether the questionnaire
 * should let goal:'gain' coexist with goals:['weightloss'] is a product question
 * tracked separately, not a thing a fixture can decide.
 */

import path from 'path';
import fs from 'fs';

const API = path.resolve(new URL('../api/calculator-api.js', import.meta.url).pathname);

// ---------------------------------------------------------------------------
// Personas. Chosen to cover every branch of the meal generator, because the bug
// lived in the seam between two branches that were each individually fine.
// ---------------------------------------------------------------------------
const BASE_FORM = {
  sex: 'female', age: 51,
  heightFeet: 5, heightInches: 5,
  weight: 198, goalWeight: 150,
  lifestyle: 'sedentary', exercise: '1-2', goal: 'lose', deficit: 20,
  diet: 'Carnivore', ratio: 'moderate',
  email: 'integrity-fixture@example.com', firstName: 'Fixture', lastName: 'Persona',
  medications: '', conditions: ['none'], otherConditions: '',
  symptoms: ['none'], otherSymptoms: '',
  allergies: '', avoidFoods: '', previousDiets: '', whatWorked: '',
  carnivoreExperience: 'beginner',
  goals: ['weight-loss'], biggestChallenge: '',
  cookingSkill: 'basic', budget: 'moderate', familySituation: 'partner',
  workTravel: 'rarely', additionalNotes: ''
};

const PERSONAS = [
  // The real one. Reproduces the 2026-09-07 report that produced the complaint:
  // lowercase diet, no mealsPerDay key, goal 'gain' alongside a weightloss goal.
  { id: 'JUDITH', name: 'Reported case: 67F, carnivore, no mealsPerDay, goal=gain',
    form: { ...BASE_FORM, age: 67, weight: 120, heightFeet: 5, heightInches: 4,
            lifestyle: 'light', diet: 'carnivore', goal: 'gain', deficit: 10,
            goals: ['mental', 'weightloss', 'energy'], budget: 'moderate',
            avoidFoods: 'I can tolerate full fat dairy, I think, but not whole milk, yogurt, etc.',
            otherSymptoms: 'pelvic floor prolapse', familySituation: 'partner' } },

  { id: 'M1', name: 'OMAD: 1 meal/day',
    form: { ...BASE_FORM, mealsPerDay: 1 } },

  { id: 'M2', name: '2 meals/day (explicit)',
    form: { ...BASE_FORM, mealsPerDay: 2 } },

  { id: 'M3', name: '3 meals/day',
    form: { ...BASE_FORM, mealsPerDay: 3 } },

  { id: 'MU', name: 'mealsPerDay absent (the production default)',
    form: { ...BASE_FORM } },

  { id: 'LION', name: 'Lion diet, OMAD, no eggs',
    form: { ...BASE_FORM, diet: 'Lion', mealsPerDay: 1 } },

  { id: 'KETO', name: 'Keto, 3 meals, produce in every meal',
    form: { ...BASE_FORM, diet: 'Keto', mealsPerDay: 3 } },

  { id: 'PESC', name: 'Pescatarian, 2 meals',
    form: { ...BASE_FORM, diet: 'Pescatarian', mealsPerDay: 2 } },

  { id: 'EGG', name: 'Egg allergy: eggs must vanish from BOTH documents',
    form: { ...BASE_FORM, allergies: 'eggs', mealsPerDay: 3 } },

  { id: 'DAIRY', name: 'Dairy allergy: butter must vanish from BOTH documents',
    form: { ...BASE_FORM, allergies: 'dairy', mealsPerDay: 2 } },

  { id: 'BIG', name: 'High calorie: forces the 500g split and multi-serving branches',
    form: { ...BASE_FORM, sex: 'male', weight: 320, heightFeet: 6, heightInches: 4,
            lifestyle: 'very', goal: 'gain', deficit: 15, mealsPerDay: 1 } },

  { id: 'TIGHT', name: 'Tight budget, maintain',
    form: { ...BASE_FORM, budget: 'tight', goal: 'maintain' } },

  { id: 'PREM', name: 'Premium budget, gain',
    form: { ...BASE_FORM, budget: 'premium', goal: 'gain', deficit: 10 } },

  { id: 'AVOID', name: 'Avoids pork and lamb: neither may appear in either document',
    form: { ...BASE_FORM, avoidFoods: 'pork, lamb', mealsPerDay: 3 } },
];

// ---------------------------------------------------------------------------
// Harness. Same shape as tests/report-safety.test.mjs on purpose: rendering goes
// through buildReportData + calculateMacros + generateAllReports, the real path, so
// this fixture cannot drift away from production.
// ---------------------------------------------------------------------------
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('anthropic.com')) {
    return { ok: true, json: async () => ({ content: [{ text: '[AI SECTION STUBBED BY tests/report-integrity.test.mjs]' }] }) };
  }
  if (realFetch) return realFetch(url, opts);
  throw new Error('report-integrity fixture: unexpected network call to ' + u);
};

const api = await import('file://' + API);
const {
  __test_buildReportData: buildReportData,
  __test_calculateMacros: calculateMacros,
  __test_generateAllReports: generateAllReports,
  __test_generateFullMealPlan: generateFullMealPlan,
  __test_generateGroceryListByWeek: generateGroceryListByWeek,
} = api;

for (const [name, fn] of Object.entries({
  buildReportData, calculateMacros, generateAllReports,
  generateFullMealPlan, generateGroceryListByWeek,
})) {
  if (typeof fn !== 'function') {
    console.error(`FATAL: api/calculator-api.js no longer exports ${name}.`);
    console.error('       Look for the "TEST SURFACE" export block at the bottom of that file.');
    process.exit(2);
  }
}

const rendered = {};
const quiet = ['log', 'info', 'warn', 'debug'].map(k => [k, console[k]]);
for (const [k] of quiet) console[k] = () => {};
try {
  for (const p of PERSONAS) {
    const session = {
      id: 'fixture-' + p.id, email: p.form.email,
      first_name: p.form.firstName, last_name: p.form.lastName,
      diet_type: p.form.diet, form_data: p.form
    };
    const data = buildReportData(session);
    data.macros = calculateMacros(p.form);
    const sections = await generateAllReports(data, 'sk-fixture-not-a-real-key');
    rendered[p.id] = { data, sections, calendar: sections[3] || '', shopping: sections[4] || '' };
  }
} finally {
  for (const [k, fn] of quiet) console[k] = fn;
}

const dumpIdx = process.argv.indexOf('--dump');
if (dumpIdx > -1 && process.argv[dumpIdx + 1]) {
  const dir = process.argv[dumpIdx + 1];
  fs.mkdirSync(dir, { recursive: true });
  for (const p of PERSONAS) {
    fs.writeFileSync(path.join(dir, `${p.id}.md`),
      rendered[p.id].calendar + '\n\n---\n\n' + rendered[p.id].shopping);
  }
  console.log(`Rendered output written to ${dir}\n`);
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------
const failures = [];
const pass = [];
function check(persona, group, label, ok, detail) {
  if (ok) pass.push(`${group} ${persona}: ${label}`);
  else failures.push({ persona, group, label, detail });
}

/** Rows of the week-N calendar table, as arrays of cell strings. */
function calendarRows(calendar, week) {
  const heads = ['Week 1:', 'Week 2:', 'Week 3:', 'Week 4:'];
  const start = calendar.indexOf('## ' + heads[week - 1]);
  if (start === -1) return [];
  const nextIdx = heads.slice(week).map(h => calendar.indexOf('## ' + h, start)).filter(i => i > -1);
  const end = nextIdx.length ? Math.min(...nextIdx) : calendar.length;
  return calendar.slice(start, end).split('\n')
    .filter(l => /^\|\s*Day \d+\s*\|/.test(l))
    .map(l => l.split('|').slice(1, -1).map(c => c.trim()));
}

/**
 * Shopping-list lines for week N, grouped by their "### ..." heading. Read by heading
 * rather than by a hardcoded emoji, because the protein heading is diet-dependent
 * (butcher / fishmonger / both) and a fixture that hardcodes one silently stops
 * checking the others.
 */
function shoppingSections(shopping, week) {
  const start = shopping.indexOf(`## 🛒 Week ${week} Shopping List`);
  if (start === -1) return {};
  const end = shopping.indexOf(`## 🛒 Week ${week + 1} Shopping List`, start);
  const block = shopping.slice(start, end === -1 ? shopping.length : end);
  const out = {};
  let heading = null;
  for (const line of block.split('\n')) {
    if (line.startsWith('###')) { heading = line.replace(/^#+\s*/, '').trim(); out[heading] ||= []; }
    else if (heading && line.trim().startsWith('* [ ]')) out[heading].push(line.replace('* [ ]', '').trim());
  }
  return out;
}

/** Week N's protein lines: everything that is not the dairy/eggs or pantry section. */
function shoppingProteins(shopping, week) {
  const secs = shoppingSections(shopping, week);
  return Object.entries(secs)
    .filter(([h]) => !/Dairy|Eggs|Pantry|Produce/i.test(h))
    .flatMap(([, lines]) => lines);
}

const nameOf = line => line.split(' - ')[0].trim();
const qtyLbsOf = line => {
  const m = line.match(/([\d.]+)\s*lbs?\b/);
  return m ? parseFloat(m[1]) : null;
};

/** Protein names + grams mentioned in a rendered meal cell, e.g. "229g Ribeye Steak". */
function mealMeats(cell) {
  const out = [];
  // Food names legitimately contain parentheses ("Ground Beef (80/20)", "Sardines (in
  // oil)"), so the name runs to the next comma. The one parenthetical that is NOT part
  // of a name is the serving note the 500g cap appends, "(x3 servings throughout day)".
  const re = /(\d+)\s*g\s+([A-Za-z][^,]*?)(?=\s*(?:,|\(x\d|$))/g;
  let m;
  while ((m = re.exec(cell)) !== null) {
    const name = m[2].trim();
    if (name) out.push({ name, grams: parseInt(m[1], 10) });
  }
  return out;
}

const GRAMS_PER_LB = 453.6;

for (const p of PERSONAS) {
  const { calendar, shopping, data } = rendered[p.id];

  // -----------------------------------------------------------------------
  // GROUP A — every protein the reader is told to COOK in week N is on week N's list.
  // This is the customer's actual complaint, stated as an assertion.
  // -----------------------------------------------------------------------
  for (let week = 1; week <= 4; week++) {
    const rows = calendarRows(calendar, week);
    check(p.id, 'A', `week ${week} calendar has rows`, rows.length > 0,
      'no Day rows parsed from the week table');
    if (!rows.length) continue;

    const meals = new Map();
    for (const row of rows) {
      for (const cell of row.slice(1)) {
        for (const { name, grams } of mealMeats(cell)) {
          meals.set(name, (meals.get(name) || 0) + grams);
        }
      }
    }
    // Coverage (GROUP A) is checked against the WHOLE week's list: eggs are both a
    // gram-portioned rotation protein ("423g Eggs") and a per-meal extra ("2 Eggs"),
    // and they are bought in the Dairy & Eggs aisle either way.
    const listed = shoppingProteins(shopping, week);
    const allListedNames = new Set(
      Object.values(shoppingSections(shopping, week)).flat().map(nameOf));
    const listedNames = new Set(listed.map(nameOf));

    for (const name of meals.keys()) {
      check(p.id, 'A', `week ${week}: "${name}" is on the shopping list`,
        allListedNames.has(name),
        `cooked in week ${week} but never listed. listed = [${[...allListedNames].join(', ')}]`);
    }

    // -----------------------------------------------------------------------
    // GROUP B — the inverse. Nothing on the list that the week never cooks.
    // Without this, "put everything in the pool on every list" would pass GROUP A.
    // -----------------------------------------------------------------------
    for (const name of listedNames) {
      check(p.id, 'B', `week ${week}: listed "${name}" is actually cooked`,
        meals.has(name),
        `on the shopping list but absent from every week ${week} meal`);
    }

    // Quantities must cover the plan. Round-up is fine; short is not.
    for (const line of listed) {
      const name = nameOf(line);
      const lbs = qtyLbsOf(line);
      const needG = meals.get(name);
      if (lbs === null || needG === undefined) continue;
      check(p.id, 'B', `week ${week}: "${name}" quantity covers the meals`,
        lbs * GRAMS_PER_LB >= needG - 1,
        `list says ${lbs} lbs (${Math.round(lbs * GRAMS_PER_LB)}g) but the week cooks ${needG}g`);
    }
  }

  // -----------------------------------------------------------------------
  // GROUP C — one goal, named the same everywhere.
  // The 2026-09-07 report's header said "Focus: gain" while its macro table said the
  // calories "support fat loss". The header was the honest one. Whatever the reader
  // picked, the sections must not contradict each other about it.
  // -----------------------------------------------------------------------
  const focus = calendar.match(/Focus:\s*([a-z]+)/i);
  check(p.id, 'C', 'calendar names a focus', !!focus, 'no "Focus:" line in report #3');
  if (focus) {
    check(p.id, 'C', `calendar focus "${focus[1]}" matches data.goal "${data.goal}"`,
      String(focus[1]).toLowerCase() === String(data.goal).toLowerCase(),
      `header says ${focus[1]}, the macros were computed for ${data.goal}`);
  }

  // -----------------------------------------------------------------------
  // GROUP E — no empty meal cells. A paid 30-day calendar may have fewer columns,
  // never a column of 30 blanks.
  // -----------------------------------------------------------------------
  for (let week = 1; week <= 4; week++) {
    for (const row of calendarRows(calendar, week)) {
      const empties = row.slice(1).filter(c => c === '' || c === '-');
      check(p.id, 'E', `week ${week} ${row[0]}: no empty meal cell`,
        empties.length === 0,
        `row renders as: ${row.join(' | ')}`);
    }
  }

  // Restriction honoured in BOTH documents, not just the one that filters.
  // Scoped to what the reader is told to EAT and BUY: the "Dairy & Eggs" aisle heading
  // is always printed and is not a violation, and the fixture should not pretend it is.
  const eatenAndBought = [];
  for (let w = 1; w <= 4; w++) {
    for (const row of calendarRows(calendar, w)) eatenAndBought.push(...row.slice(1));
    eatenAndBought.push(...Object.values(shoppingSections(shopping, w)).flat());
  }
  const both = eatenAndBought.join(' | ').toLowerCase();
  if (p.id === 'EGG') {
    check(p.id, 'E', 'egg allergy: no eggs in any meal or on any list',
      !/\beggs?\b/.test(both), `found: ${eatenAndBought.filter(x => /\beggs?\b/i.test(x)).slice(0, 3).join(' / ')}`);
  }
  if (p.id === 'AVOID') {
    check(p.id, 'E', 'avoided foods absent from every meal and list',
      !/\b(pork|lamb)\b/.test(both), `found: ${eatenAndBought.filter(x => /\b(pork|lamb)\b/i.test(x)).slice(0, 3).join(' / ')}`);
    // Separately: an avoided food must not be offered as a swap either.
    const guide = (calendar.split('## Substitution Guide')[1] || '').toLowerCase();
    check(p.id, 'E', 'avoided foods are not offered in the substitution guide',
      !/\b(pork|lamb)\b/.test(guide), `substitution guide says: ${guide.trim().slice(0, 160)}`);
  }
}

// ---------------------------------------------------------------------------
// GROUP D — the structural proof. This is the group that makes divergence
// impossible rather than merely absent today.
// ---------------------------------------------------------------------------

// D1. The grocery list refuses to exist without the meal plan it describes. The old
// behaviour was to improvise one; improvising is the bug.
{
  let threw = false;
  try { generateGroceryListByWeek({ macros: { protein_grams: 150 } }); }
  catch { threw = true; }
  check('-', 'D', 'generateGroceryListByWeek throws without a meal plan', threw,
    'it returned a list built from something other than the meal plan');
}

// D2. The grocery list is a pure function of the meal plan. Two calls with the same
// hand-built plan but wildly different `data` must produce identical lists. If anyone
// reintroduces a food-selection step keyed off diet, budget, or the food database,
// this fails immediately.
{
  const plan = {
    weeks: [{
      weekNumber: 1,
      days: [
        { dayNumber: 1, items: [
          { name: 'Ribeye Steak', category: 'Beef', unit: 'g', qty: 400 },
          { name: 'Eggs', category: 'Eggs', unit: 'each', qty: 2 },
          { name: 'Butter', category: 'Dairy', unit: 'tbsp', qty: 3 } ] },
        { dayNumber: 2, items: [
          { name: 'Ribeye Steak', category: 'Beef', unit: 'g', qty: 300 } ] },
      ]
    }]
  };
  const a = generateGroceryListByWeek(
    { selectedProtocol: 'Carnivore', budget: 'tight', macros: { protein_grams: 100 } }, plan);
  const b = generateGroceryListByWeek(
    { selectedProtocol: 'Keto', budget: 'premium', allergies: 'dairy', macros: { protein_grams: 400 } }, plan);
  check('-', 'D', 'grocery list ignores data and depends only on the meal plan',
    JSON.stringify(a) === JSON.stringify(b),
    'changing diet/budget/allergies changed the list even though the meals did not');

  // And it aggregates, rather than sampling one day.
  const ribeye = a.week1.proteins.find(x => x.name === 'Ribeye Steak');
  check('-', 'D', 'quantities aggregate across the week (700g -> >=1.5 lbs)',
    !!ribeye && qtyLbsOf(ribeye.quantity) >= 700 / GRAMS_PER_LB,
    `got ${ribeye ? ribeye.quantity : 'nothing'} for 700g of ribeye`);
}

// D3. Perturbation. Change the meal plan and the list MUST change with it. A list
// that is merely stable is not the same thing as a list that is derived.
{
  const mk = proteinName => ({
    weeks: [{ weekNumber: 1, days: [
      { dayNumber: 1, items: [{ name: proteinName, category: 'Beef', unit: 'g', qty: 500 }] }
    ] }]
  });
  const one = generateGroceryListByWeek({}, mk('Chuck Steak'));
  const two = generateGroceryListByWeek({}, mk('Lamb Chops'));
  check('-', 'D', 'a different meal plan yields a different shopping list',
    one.week1.proteins[0].name === 'Chuck Steak' && two.week1.proteins[0].name === 'Lamb Chops',
    'the list did not follow the plan');
}

// D4. No second generator survives. The grocery builder must not consult the food
// database at all; if it does, it can once again choose food nobody is cooking.
{
  const src = fs.readFileSync(API, 'utf8');
  const start = src.indexOf('function generateGroceryListByWeek');
  const body = src.slice(start, src.indexOf('\n}', start));
  check('-', 'D', 'generateGroceryListByWeek does not read foodDatabase',
    !body.includes('foodDatabase'),
    'a food-selection step has been reintroduced into the grocery builder');
  check('-', 'D', 'generateGroceryListByWeek does not branch on diet or budget',
    !/\b(budget|selectedProtocol)\b/.test(body),
    'the grocery builder is choosing food again instead of aggregating meals');
}

// D5. No OTHER file in api/ may grow a grocery generator that picks its own food.
// api/generate-report.js is a dormant copy of the pre-2026-09-08 worker: it is not
// deployed (api/wrangler.toml points at calculator-api.js) but it still contains the
// original two-rotation design, and api/package.json still names it "main". It is
// listed here by name, deliberately and visibly, rather than being quietly skipped:
// the day it is deleted or fixed, remove it from KNOWN_DORMANT and this assertion
// starts protecting that file too. Anything NOT on this list fails immediately.
{
  const KNOWN_DORMANT = new Set(['generate-report.js']);
  const apiDir = path.dirname(API);
  const offenders = [];
  for (const f of fs.readdirSync(apiDir)) {
    if (!f.endsWith('.js') || f === path.basename(API) || KNOWN_DORMANT.has(f)) continue;
    const src = fs.readFileSync(path.join(apiDir, f), 'utf8');
    const i = src.indexOf('function generateGroceryListByWeek');
    if (i === -1) continue;
    if (src.slice(i, src.indexOf('\n}', i)).includes('foodDatabase')) offenders.push(f);
  }
  check('-', 'D', 'no second grocery generator has appeared in api/',
    offenders.length === 0,
    `these files build a shopping list by picking food instead of aggregating meals: ${offenders.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------
const groups = [...new Set(pass.concat(failures.map(f => `${f.group} x`)).map(s => s[0]))].sort();
console.log(`\nreport-integrity: ${pass.length} passed, ${failures.length} failed  (groups ${groups.join(' ')})\n`);

if (failures.length) {
  const byPersona = {};
  for (const f of failures) (byPersona[f.persona] ||= []).push(f);
  for (const [persona, list] of Object.entries(byPersona)) {
    const p = PERSONAS.find(x => x.id === persona);
    console.log(`--- ${persona}${p ? ' — ' + p.name : ''}`);
    for (const f of list) console.log(`  [${f.group}] ${f.label}\n        ${f.detail}`);
    console.log('');
  }
  console.log('Re-run with --dump <dir> to read the rendered reports these came from.');
  process.exit(1);
}

console.log('The calendar and the shopping list agree, and the list is derived from the');
console.log('calendar rather than regenerated beside it (GROUP D).\n');
