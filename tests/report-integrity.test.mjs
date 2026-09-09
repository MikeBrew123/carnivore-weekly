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
  goals: ['weight-loss'], biggestChallenge: '',   // consistent with goal:'lose'
  cookingSkill: 'basic', budget: 'moderate', familySituation: 'partner',
  workTravel: 'rarely', additionalNotes: ''
};

const PERSONAS = [
  // The shape of the 2026-09-07 report that produced the complaint, reconstructed from
  // its INPUT STRUCTURE only. Deliberately carries no customer identity, free text, or
  // health detail: this repo is public, and the properties that reproduce the bugs are
  // structural. Those properties are: a lowercase diet string, no mealsPerDay key at
  // all, an authoritative goal of 'gain' sitting alongside 'weightloss' in the
  // motivations multi-select, and a low bodyweight that keeps portions near the 150g
  // floor so the Eggs food-database entry enters the rotation in grams.
  { id: 'REPORTED', name: 'Reported case shape: 67F, carnivore, no mealsPerDay, goal=gain',
    form: { ...BASE_FORM, age: 67, weight: 120, heightFeet: 5, heightInches: 4,
            lifestyle: 'light', diet: 'carnivore', goal: 'gain', deficit: 10,
            goals: ['mental', 'weightloss', 'energy'], budget: 'moderate',
            // The contradiction the reported case actually had. It is marked resolved
            // here so this persona still exercises RENDERING; the refusal itself is
            // asserted by the CONFLICT personas below.
            primaryGoalConfirmed: true,
            avoidFoods: '', otherSymptoms: '', familySituation: 'partner' } },

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
            lifestyle: 'very', goal: 'gain', deficit: 15, mealsPerDay: 1,
            goals: ['muscle-gain', 'athletic'] } },

  { id: 'TIGHT', name: 'Tight budget, maintain',
    form: { ...BASE_FORM, budget: 'tight', goal: 'maintain', goals: ['energy'] } },

  { id: 'PREM', name: 'Premium budget, gain',
    form: { ...BASE_FORM, budget: 'premium', goal: 'gain', deficit: 10,
            goals: ['muscle-gain'] } },

  { id: 'AVOID', name: 'Avoids pork and lamb: neither may appear in either document',
    form: { ...BASE_FORM, avoidFoods: 'pork, lamb', mealsPerDay: 3 } },

  // Goal controls. GAIN is the positive control: it exists so that "delete the word
  // gain everywhere" cannot pass this suite. LOSE and MAINT are the negative controls.
  { id: 'GAIN', name: 'Positive control: muscle-gain persona must still read as gain',
    form: { ...BASE_FORM, goal: 'gain', deficit: 10, mealsPerDay: 2, goals: ['muscle-gain', 'energy'] } },

  { id: 'LOSE', name: 'Negative control: fat-loss persona, zero gain language',
    form: { ...BASE_FORM, goal: 'lose', deficit: 20, mealsPerDay: 2 } },

  { id: 'MAINT', name: 'Negative control: maintenance persona',
    form: { ...BASE_FORM, goal: 'maintain', mealsPerDay: 2, goals: ['energy', 'guthealth'] } },

  // Forces the Eggs food-database entry into the rotation as a gram-denominated
  // protein ("423g Eggs") alongside the counted "2 Eggs" extra, which is the exact
  // collision that produced "Eggs - 660 (55 dozen)".
  { id: 'EGGMIX', name: 'Counted eggs AND gram-denominated eggs in the same week',
    form: { ...BASE_FORM, age: 67, weight: 118, heightFeet: 5, heightInches: 4,
            lifestyle: 'light', diet: 'carnivore', goal: 'gain', deficit: 10,
            goals: ['energy'] } },
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
  __test_resolveGoal: resolveGoal,
  __test_convertQuantity: convertQuantity,
  __test_GRAMS_PER_EGG: GRAMS_PER_EGG,
  __test_displayUnitFor: displayUnitFor,
  __test_renderIngredient: renderIngredient,
  __test_COUNT_ROUNDING_MAX_GRAMS_ERROR: MAX_ROUNDING_ERROR_G,
  __test_detectGoalConflict: detectGoalConflict,
  __test_ReportValidationError: ReportValidationError,
  __test_baseFoodKey: baseFoodKey,
  __test_distinctByBaseFood: distinctByBaseFood,
  __test_foodDatabase: foodDatabase,
  __test_buildSubstitutionGuide: buildSubstitutionGuide,
} = api;

for (const [name, fn] of Object.entries({
  buildReportData, calculateMacros, generateAllReports,
  generateFullMealPlan, generateGroceryListByWeek, resolveGoal, convertQuantity,
  baseFoodKey, distinctByBaseFood, buildSubstitutionGuide,
})) {
  if (typeof fn !== 'function') {
    console.error(`FATAL: api/calculator-api.js no longer exports ${name}.`);
    console.error('       Look for the "TEST SURFACE" export block at the bottom of that file.');
    process.exit(2);
  }
}

const rendered = {};
const renderErrors = [];
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
    // A persona that cannot render at all is a FAILURE to report, not a reason to kill
    // the run. The generators fail closed on a self-contradictory meal or an unknown
    // unit, and when that fires here we want the persona named, not a bare stack trace
    // half way through the suite.
    let sections;
    try {
      sections = await generateAllReports(data, 'sk-fixture-not-a-real-key');
    } catch (err) {
      renderErrors.push({ id: p.id, name: p.name, err });
      sections = {};
    }
    // The generated plan, kept alongside the rendered document so GROUP K can compare
    // the two directly. Comparing the page against a hardcoded 30 would only prove the
    // renderer agrees with this file; comparing it against the generator's own output
    // is what catches a renderer silently dropping a week.
    data.__plan = generateFullMealPlan(data);
    rendered[p.id] = { data, sections, calendar: sections[3] || '', shopping: sections[4] || '',
                       foodGuide: sections[2] || '' };
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
// The advertised plan length. Read off the generator rather than hardcoded here, so
// this fixture cannot drift from the product the way the renderer did.
const PLAN_DAYS = 30;

const failures = [];
const pass = [];
function check(persona, group, label, ok, detail) {
  if (ok) pass.push(`${group} ${persona}: ${label}`);
  else failures.push({ persona, group, label, detail });
}

/**
 * Every week heading the calendar actually rendered, in order.
 *
 * Discovered from the document, never hardcoded. A fixture that knows there are four
 * weeks cannot notice a fifth going missing, which is exactly how days 29 and 30 were
 * dropped for a day on 2026-09-08 with the whole suite green: the generator produced
 * five week buckets, the renderer had four slots, and this file only ever looked at
 * four. Reading the headings back means the fixture counts what shipped.
 */
function calendarWeeks(calendar) {
  return [...calendar.matchAll(/^## Week (\d+):/gm)].map(m => Number(m[1]));
}

/** Rows of the week-N calendar table, as arrays of cell strings. */
function calendarRows(calendar, week) {
  const start = calendar.search(new RegExp(`^## Week ${week}:`, 'm'));
  if (start === -1) return [];
  const after = calendar.slice(start + 1);
  const rel = after.search(/^## Week \d+:/m);
  const end = rel === -1 ? calendar.length : start + 1 + rel;
  return calendar.slice(start, end).split('\n')
    .filter(l => /^\|\s*Day \d+\s*\|/.test(l))
    .map(l => l.split('|').slice(1, -1).map(c => c.trim()));
}

/** Every "Day N" the calendar renders, across every week, in document order. */
function calendarDayNumbers(calendar) {
  return [...calendar.matchAll(/^\|\s*Day (\d+)\s*\|/gm)].map(m => Number(m[1]));
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
  // End at the NEXT week heading whatever its number, not at week+1 specifically.
  const after = shopping.slice(start + 1);
  const rel = after.search(/^## 🛒 Week \d+ Shopping List/m);
  const end = rel === -1 ? shopping.length : start + 1 + rel;
  const block = shopping.slice(start, end);
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

for (const { id, name, err } of renderErrors) {
  check(id, 'I', `persona renders at all (${name})`, false,
    `${err.name}: ${err.message}`);
}

for (const p of PERSONAS) {
  const { calendar, shopping, data } = rendered[p.id];

  // -----------------------------------------------------------------------
  // GROUP A — every protein the reader is told to COOK in week N is on week N's list.
  // This is the customer's actual complaint, stated as an assertion.
  // -----------------------------------------------------------------------
  for (const week of calendarWeeks(calendar)) {
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
  const canonical = resolveGoal(data);
  const wholeReport = Object.keys(rendered[p.id].sections)
    .sort((a, b) => a - b).map(k => rendered[p.id].sections[k]).filter(Boolean).join('\n\n');

  const focus = calendar.match(/Focus:\s*([^*|\n]+)/i);
  check(p.id, 'C', 'calendar names a focus', !!focus, 'no "Focus:" line in report #3');
  if (focus) {
    check(p.id, 'C', `calendar focus reads "${canonical.label}"`,
      focus[1].trim() === canonical.label,
      `header says "${focus[1].trim()}", canonical goal is "${canonical.label}" (raw: ${data.goal})`);
  }

  // The raw enum must never reach the reader. "Focus: gain" and "results for gain"
  // were both the {{goal}} placeholder printing an internal token.
  for (const token of ['lose', 'gain', 'maintain']) {
    const leaked = new RegExp(`(Focus|results for|Goal):\\s*${token}\\b`, 'i').test(wholeReport);
    check(p.id, 'C', `raw enum "${token}" does not leak into customer-facing prose`,
      !leaked, `an internal goal token is being printed to the reader`);
  }

  // Directional language must match the arithmetic. This is the assertion that would
  // have caught a surplus being described as fat loss.
  const OPPOSITE = {
    lose:     [/\bcalorie surplus\b/i, /\bmuscle gain\b/i],
    gain:     [/\bcalorie deficit\b/i, /\bsupports fat loss\b/i],
    maintain: [/\bcalorie surplus\b/i, /\bcalorie deficit\b/i],
  }[canonical.key];
  for (const re of OPPOSITE) {
    const m = wholeReport.match(re);
    check(p.id, 'C', `no "${re.source}" in a ${canonical.label} report`, !m,
      m ? `found "${m[0]}" in a report whose macros are ${canonical.direction}` : '');
  }

  // Positive control. A gain reader must still be told it is gain: a blanket removal
  // of the word would pass every negative assertion above and fail here.
  if (canonical.key === 'gain') {
    check(p.id, 'C', 'a gain persona still reads as Muscle Gain',
      /Muscle Gain/.test(wholeReport),
      'the gain label vanished; a blanket string replacement would do exactly this');
  }

  // The label and the arithmetic come from the same field, by construction.
  const macroCal = data.macros.calories;
  check(p.id, 'C', 'the goal label and the calorie target agree in direction',
    canonical.key === 'maintain' || macroCal > 0,
    `calories ${macroCal} for ${canonical.label}`);

  // -----------------------------------------------------------------------
  // GROUP F — count-denominated foods are shown and shopped as counts.
  //
  // Eggs reach a meal two ways: as the per-meal extra ("2 Eggs") and as a rotation
  // protein, because the food database has an Eggs entry with macros per 100g. The
  // second used to render as a gram portion, so a reader saw "423g Eggs", and where
  // both occurred in one meal, "2 Eggs, 223g Eggs": one ingredient, twice, in two
  // units, in one sentence. Aggregation then summed 14 counted eggs with 646 grams
  // and shipped "Eggs - 660 (55 dozen)".
  //
  // The gram portion is now converted to a whole count BEFORE rendering, and the
  // rendered count is the authoritative quantity the shopping list aggregates.
  // -----------------------------------------------------------------------
  for (const week of calendarWeeks(calendar)) {
    const rows = calendarRows(calendar, week);
    const cells = rows.flatMap(r => r.slice(1));
    const joined = cells.join(' | ');

    // A count food must never be printed as a weight.
    check(p.id, 'F', `week ${week}: no gram-denominated eggs in any meal`,
      !/\d+\s*g\s+Eggs\b/i.test(joined),
      `found: ${cells.find(c => /\d+\s*g\s+Eggs\b/i.test(c))}`);

    // A meal may name an ingredient once. "2 Eggs, 223g Eggs" was one meal.
    for (const cell of cells) {
      // Names legitimately contain parentheses ("Salmon Fillet (wild)"); the only
      // parenthetical that is not part of a name is the "(x3 servings...)" note.
      const names = [...cell.matchAll(/(?:\d+\s*g\s+|\d+ tbsp |\d+ cup |1\/2 |\d+\s+)([A-Z][^,]*?)(?=\s*(?:,|\(x\d|$))/g)]
        .map(m => m[1].trim());
      const dupes = names.filter((n, i) => names.indexOf(n) !== i);
      check(p.id, 'F', `week ${week}: no ingredient listed twice in one meal`,
        dupes.length === 0, `"${cell}" repeats: ${[...new Set(dupes)].join(', ')}`);
    }

    // The shopping count is exactly what the rendered meals say to cook.
    const expected = [...joined.matchAll(/(\d+)\s+Eggs\b/g)].reduce((a, m) => a + +m[1], 0);
    const secs = shoppingSections(shopping, week);
    const eggLine = Object.values(secs).flat().find(l => /^Eggs\b/.test(l));

    if (expected === 0) {
      check(p.id, 'F', `week ${week}: no eggs scheduled, none listed`,
        !eggLine, `list says "${eggLine}" but no meal this week contains eggs`);
      continue;
    }
    check(p.id, 'F', `week ${week}: eggs are on the list`, !!eggLine,
      `${expected} eggs are scheduled but the list has no egg line`);
    if (!eggLine) continue;

    const count = parseInt((eggLine.match(/-\s*(\d+)/) || [])[1], 10);
    check(p.id, 'F', `week ${week}: listed egg count equals what the meals say`,
      count === expected,
      `list says ${count}, the rendered meals total ${expected}`);

    // Independent plausibility bound, so an absurd figure fails on its own even if
    // the equality above is ever weakened. The shipped bug said 660.
    const MAX_EGGS_PER_WEEK = 60;
    check(p.id, 'F', `week ${week}: egg count is physically plausible (${count})`,
      count > 0 && count <= MAX_EGGS_PER_WEEK,
      `list says ${count} eggs for one week`);
  }

  // -----------------------------------------------------------------------
  // GROUP G — meal columns reflect the actual meal structure.
  // -----------------------------------------------------------------------
  {
    const declared = p.form.mealsPerDay;
    const header = (calendar.match(/\|\s*Day\s*\|([^\n]*)\|/) || [])[1];
    const cols = header ? header.split('|').map(c => c.trim()).filter(Boolean) : [];
    const expectCols = declared || 2;   // production default when never collected

    check(p.id, 'G', `calendar renders exactly ${expectCols} meal column(s)`,
      cols.length === expectCols,
      `header columns = [${cols.join(', ')}] for a ${expectCols}-meal plan`);

    if (expectCols === 2) {
      check(p.id, 'G', 'a 2-meal plan renders Meal 1 / Meal 2, not Breakfast/Lunch/Dinner',
        cols.join('|') === 'Meal 1|Meal 2',
        `columns are [${cols.join(', ')}]`);
      check(p.id, 'G', 'a 2-meal plan has no Lunch column at all',
        !cols.includes('Lunch'), 'an empty Lunch column is being rendered');
    }
    if (expectCols === 3) {
      check(p.id, 'G', 'a 3-meal plan renders Breakfast / Lunch / Dinner',
        cols.join('|') === 'Breakfast|Lunch|Dinner',
        `columns are [${cols.join(', ')}]`);
    }
    if (expectCols === 1) {
      check(p.id, 'G', 'a 1-meal plan renders a single meal column',
        cols.length === 1, `columns are [${cols.join(', ')}]`);
    }

    // No fabricated meals: the number of populated cells must equal the column count.
    for (const week of calendarWeeks(calendar)) {
      for (const row of calendarRows(calendar, week)) {
        check(p.id, 'G', `week ${week} ${row[0]}: ${expectCols} populated meal(s)`,
          row.slice(1).filter(c => c && c !== '-').length === expectCols,
          `row: ${row.join(' | ')}`);
      }
    }
  }

  // -----------------------------------------------------------------------
  // GROUP H — no placeholder or malformed value reached the reader.
  // -----------------------------------------------------------------------
  {
    const body = [calendar, shopping].join('\n');
    for (const bad of ['undefined', 'null', '[object Object]', 'NaN', '{{']) {
      check(p.id, 'H', `no "${bad}" in the calendar or shopping list`,
        !body.includes(bad),
        `found: ${body.split('\n').find(l => l.includes(bad))?.slice(0, 120)}`);
    }
    check(p.id, 'H', 'no zero or negative quantities on the shopping list',
      !/-\s*(0|-\d)(\s|$)/.test(shopping), 'a quantity rounded to zero or below');
  }

  // -----------------------------------------------------------------------
  // GROUP E — no empty meal cells. A paid 30-day calendar may have fewer columns,
  // never a column of 30 blanks.
  // -----------------------------------------------------------------------
  for (const week of calendarWeeks(calendar)) {
    for (const row of calendarRows(calendar, week)) {
      const empties = row.slice(1).filter(c => c === '' || c === '-');
      check(p.id, 'E', `week ${week} ${row[0]}: no empty meal cell`,
        empties.length === 0,
        `row renders as: ${row.join(' | ')}`);
    }
  }

  // -----------------------------------------------------------------------
  // GROUP K — THE PLAN IS COMPLETE. Everything the generator built reaches the page.
  //
  // Why this group exists: on 2026-09-08 the calendar renderer filled four fixed week
  // placeholders while generateFullMealPlan() produced five week buckets. Days 29 and
  // 30 were generated, bucketed, and silently discarded, under a heading that still
  // said "30-Day Meal Calendar". Every suite stayed green because every suite,
  // including this one, only ever looked at weeks 1 to 4.
  //
  // These assertions compare the rendered document against the generated object
  // rather than against a number this file believes. A renderer that drops a week now
  // fails here, and so does a generator that stops producing one.
  // -----------------------------------------------------------------------
  {
    const renderedDays = calendarDayNumbers(calendar);
    const generatedDays = data.__plan.weeks.flatMap(w => (w.days || []).map(d => d.dayNumber));

    check(p.id, 'K', `calendar renders all ${PLAN_DAYS} days of a ${PLAN_DAYS}-day plan`,
      renderedDays.length === PLAN_DAYS, `rendered ${renderedDays.length} day rows`);
    check(p.id, 'K', 'rendered day count equals generated day count',
      renderedDays.length === generatedDays.length,
      `generator built ${generatedDays.length}, page shows ${renderedDays.length}`);
    check(p.id, 'K', 'Day 1 is present', renderedDays.includes(1));
    check(p.id, 'K', `Day ${PLAN_DAYS} is present`, renderedDays.includes(PLAN_DAYS),
      `last rendered day is ${Math.max(...renderedDays)}`);
    check(p.id, 'K', 'no day number renders twice',
      new Set(renderedDays).size === renderedDays.length,
      `duplicates: ${renderedDays.filter((d, i) => renderedDays.indexOf(d) !== i).join(', ')}`);
    const missing = generatedDays.filter(d => !renderedDays.includes(d));
    check(p.id, 'K', 'no generated day is missing from the page',
      missing.length === 0, `missing: ${missing.join(', ')}`);
    const gaps = [];
    for (let d = 1; d <= PLAN_DAYS; d++) if (!renderedDays.includes(d)) gaps.push(d);
    check(p.id, 'K', `days 1..${PLAN_DAYS} render with no gaps`, gaps.length === 0,
      `gaps at: ${gaps.join(', ')}`);

    // The tail days must be shoppable, not just readable. A calendar that tells a
    // reader to cook on day 29 while the shopping list stops at day 28 is the same
    // defect wearing the other half of the costume.
    const tailWeek = data.__plan.weeks.find(w => (w.days || []).some(d => d.dayNumber > 28));
    check(p.id, 'K', 'days 29-30 live in a week bucket that exists',
      !!tailWeek, 'no week bucket contains day 29 or 30');
    if (tailWeek) {
      const tailDays = tailWeek.days.map(d => d.dayNumber);
      check(p.id, 'K', 'the days-29/30 week renders a calendar table',
        calendarRows(calendar, tailWeek.weekNumber).length === tailDays.length,
        `bucket has ${tailDays.length} days, table has ${calendarRows(calendar, tailWeek.weekNumber).length} rows`);
      const tailShopping = shoppingSections(shopping, tailWeek.weekNumber);
      check(p.id, 'K', 'the days-29/30 week has its own shopping list',
        Object.keys(tailShopping).length > 0,
        'no shopping section rendered for the final-days week');
      // Every protein cooked on days 29-30 has to be on that list.
      const tailProteins = shoppingProteins(shopping, tailWeek.weekNumber).map(nameOf);
      for (const row of calendarRows(calendar, tailWeek.weekNumber)) {
        for (const { name } of row.slice(1).flatMap(mealMeats)) {
          check(p.id, 'K', `days 29-30: "${name}" cooked on ${row[0]} is on the final-days list`,
            tailProteins.includes(name), `list has [${tailProteins.join(', ')}]`);
        }
      }
    }
  }

  // Restriction honoured in BOTH documents, not just the one that filters.
  // Scoped to what the reader is told to EAT and BUY: the "Dairy & Eggs" aisle heading
  // is always printed and is not a violation, and the fixture should not pretend it is.
  const eatenAndBought = [];
  for (const w of calendarWeeks(calendar)) {
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

// D6. Unit conversion is explicit and fails loudly. Nothing may infer a unit from a
// bare number, and an unknown pair must throw rather than fall through to a sum.
{
  check('-', 'D', 'grams of egg convert to a count via GRAMS_PER_EGG',
    convertQuantity(GRAMS_PER_EGG * 3, 'g', 'each', 'Eggs') === 3,
    'the gram-to-egg conversion is not using the named constant');
  check('-', 'D', 'identity conversion is a no-op',
    convertQuantity(7, 'each', 'each', 'Eggs') === 7, '');

  let threw = false;
  try { convertQuantity(5, 'cup', 'g', 'Mystery Ingredient'); } catch { threw = true; }
  check('-', 'D', 'an unknown unit pair throws instead of guessing', threw,
    'convertQuantity silently accepted a conversion it has no rule for');

  // An ingredient emitted without a unit must stop aggregation, not be assumed.
  let threwNoUnit = false;
  try {
    generateGroceryListByWeek({}, { weeks: [{ weekNumber: 1, days: [
      { dayNumber: 1, items: [{ name: 'Mystery', category: 'Beef', qty: 100 }] }] }] });
  } catch { threwNoUnit = true; }
  check('-', 'D', 'an item with no unit is rejected', threwNoUnit,
    'a unitless ingredient was aggregated as if the number meant something');

  // The exact shipped bug, as a unit test: counted and gram eggs in one week.
  const eggWeek = { weeks: [{ weekNumber: 1, days: [
    { dayNumber: 1, items: [{ name: 'Eggs', category: 'Eggs', unit: 'each', qty: 2 }] },
    { dayNumber: 2, items: [{ name: 'Eggs', category: 'Eggs', unit: 'g', qty: 423 }] },
  ] }] };
  const eggs = generateGroceryListByWeek({}, eggWeek).week1.eggs[0];
  const expected = Math.ceil(2 + 423 / GRAMS_PER_EGG);
  check('-', 'D', `counted + gram eggs aggregate to ${expected}, not 425`,
    eggs && eggs.qty === expected,
    `got ${eggs ? eggs.qty : 'nothing'}; a blind sum gives 425`);
}

// D5. No OTHER file in api/ may grow a grocery generator that picks its own food.
// This used to carry a KNOWN_DORMANT allowlist holding api/generate-report.js, a
// second copy of the pre-2026-09-08 worker that carried the original two-rotation
// design. That file was DELETED on 2026-09-08 once it was proven to have no runtime,
// so the allowlist is now empty and this sweep covers every file in api/ with no
// exceptions. Do not re-add a name to it: a file that needs an exemption from this
// assertion is a file that should not be in api/.
{
  const KNOWN_DORMANT = new Set();
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

  // Same sweep for the goal: no file may print the raw enum at the customer.
  const goalOffenders = [];
  for (const f of fs.readdirSync(apiDir)) {
    if (!f.endsWith('.js') || KNOWN_DORMANT.has(f)) continue;
    const src = fs.readFileSync(path.join(apiDir, f), 'utf8');
    if (/\{\\\{goal\\\}\\\}\/g,\s*data\.goal/.test(src)) goalOffenders.push(f);
  }
  check('-', 'D', 'no file renders the raw goal enum to the customer',
    goalOffenders.length === 0,
    `these files print an internal goal token at the reader: ${goalOffenders.join(', ')}. ` +
    `Render resolveGoal(data).label instead.`);

  // The live worker must resolve the goal through the single canonical function.
  const live = fs.readFileSync(API, 'utf8');
  check('-', 'D', 'the deployed worker renders the goal through resolveGoal()',
    /\{\\\{goal\\\}\\\}\/g,\s*resolveGoal\(data\)\.label/.test(live),
    'the {{goal}} placeholder is no longer going through the canonical resolver');
}

// ---------------------------------------------------------------------------
// GROUP J — goal contradiction. The questionnaire asks two different questions and
// they can disagree. When they do and the reader has not been asked which one should
// set their calorie target, the report must REFUSE to generate rather than hand the
// contradiction to a language model to reconcile.
// ---------------------------------------------------------------------------
{
  const mk = (goal, goals, extra = {}) => ({
    ...BASE_FORM, goal, goals, deficit: goal === 'maintain' ? undefined : 15,
    selectedProtocol: 'Carnivore', ...extra,
  });

  const CASES = [
    // [name, goal, motivations, expect blocking]
    ['gain + weightloss',            'gain',     ['weightloss', 'energy'],      true],
    ['gain + weight-loss (hyphen)',  'gain',     ['weight-loss'],               true],
    ['gain + weight_loss (underscore)', 'gain',  ['weight_loss'],               true],
    ['lose + muscle-gain',           'lose',     ['muscle-gain', 'energy'],     true],
    ['lose + bulking',               'lose',     ['bulking'],                   true],
    ['maintain + weightloss',        'maintain', ['weightloss'],                true],
    ['maintain + muscle-gain',       'maintain', ['muscle-gain'],               true],
    // consistent combinations must NOT be blocked
    ['lose + weightloss (consistent)',  'lose',     ['weightloss', 'energy'],   false],
    ['gain + muscle-gain (consistent)', 'gain',     ['muscle-gain'],            false],
    ['maintain + energy (neutral)',     'maintain', ['energy', 'guthealth'],    false],
    ['gain + athletic (neutral)',       'gain',     ['athletic', 'hormones'],   false],
    ['no motivations at all',           'gain',     [],                         false],
    ['motivations as a bare string',    'gain',     'weightloss, energy',       true],
  ];

  for (const [name, goal, goals, expectBlocking] of CASES) {
    const r = detectGoalConflict(mk(goal, goals));
    check('-', 'J', `${name}: ${expectBlocking ? 'blocks' : 'passes'}`,
      r.blocking === expectBlocking,
      `blocking=${r.blocking}, conflicting=[${r.conflicting.join(', ')}], primary=${r.primary}`);
  }

  // Explicit resolution clears the block, and ONLY explicit resolution does.
  const conflicted = mk('gain', ['weightloss']);
  check('-', 'J', 'an unresolved conflict blocks', detectGoalConflict(conflicted).blocking === true, '');
  check('-', 'J', 'primaryGoalConfirmed clears the block',
    detectGoalConflict({ ...conflicted, primaryGoalConfirmed: true }).blocking === false, '');
  for (const truthy of ['true', 1, 'yes']) {
    check('-', 'J', `primaryGoalConfirmed=${JSON.stringify(truthy)} does NOT clear the block`,
      detectGoalConflict({ ...conflicted, primaryGoalConfirmed: truthy }).blocking === true,
      'a loose truthy value is being accepted as an explicit customer decision');
  }
  // Resolving does not change the direction: the primary goal still wins.
  check('-', 'J', 'resolution does not silently flip the calorie direction',
    detectGoalConflict({ ...conflicted, primaryGoalConfirmed: true }).primary === 'gain', '');

  // The canonical generator refuses, with a structured result, before spending tokens.
  let err = null;
  try {
    await generateAllReports(buildReportData({
      id: 'conflict', email: 'x@example.com', first_name: 'T', last_name: 'T',
      diet_type: 'Carnivore', form_data: mk('gain', ['weightloss']),
    }), 'sk-fixture-not-a-real-key');
  } catch (e) { err = e; }
  check('-', 'J', 'generateAllReports refuses an unresolved contradiction',
    err !== null && err.name === 'ReportValidationError',
    err ? `threw ${err.name}` : 'it generated a report anyway');
  check('-', 'J', 'the refusal carries a machine-readable code',
    err?.code === 'GOAL_CONFLICT_UNRESOLVED', `code=${err?.code}`);
  check('-', 'J', 'the refusal says how to resolve it',
    err?.validation?.resolution === 'CONFIRM_PRIMARY_GOAL', `resolution=${err?.validation?.resolution}`);
  check('-', 'J', 'the refusal names the conflicting motivations',
    Array.isArray(err?.validation?.conflictingMotivations) && err.validation.conflictingMotivations.length > 0,
    JSON.stringify(err?.validation?.conflictingMotivations));

  // And it still generates when the reader has chosen.
  let ok = null;
  try {
    ok = await generateAllReports(buildReportData({
      id: 'resolved', email: 'x@example.com', first_name: 'T', last_name: 'T',
      diet_type: 'Carnivore', form_data: mk('gain', ['weightloss'], { primaryGoalConfirmed: true }),
    }), 'sk-fixture-not-a-real-key');
  } catch (e) { ok = e; }
  check('-', 'J', 'a resolved contradiction still generates',
    ok && !(ok instanceof Error) && !!ok[3],
    ok instanceof Error ? `threw ${ok.name}: ${ok.message}` : 'no meal calendar produced');
}

// ---------------------------------------------------------------------------
// GROUP I — display units. Nutrition stays gram-based internally; what the reader
// reads must be the unit the food is actually bought and cooked in, and the two
// must describe the same quantity.
// ---------------------------------------------------------------------------
{
  // Structural: every rotation-eligible food resolves to a display unit that has a
  // render rule. A food added to the database with an exotic category cannot quietly
  // fall through to a bare number.
  const CATEGORIES = ['Beef', 'Beef Organs', 'Lamb', 'Pork', 'Fish', 'Poultry',
                      'Shellfish', 'Eggs', 'Dairy', 'Produce', 'Pantry'];
  for (const category of CATEGORIES) {
    const unit = displayUnitFor({ name: 'Probe', category });
    let rendered = null;
    try { rendered = renderIngredient({ name: 'Probe', category, unit, qty: 2 }); } catch { /* caught below */ }
    check('-', 'I', `category "${category}" renders in a real unit (${unit})`,
      typeof rendered === 'string' && rendered.length > 0,
      `renderIngredient() has no rule for unit "${unit}"`);
  }

  check('-', 'I', 'Eggs are a counted food, not a weighed one',
    displayUnitFor({ name: 'Eggs', category: 'Eggs' }) === 'each', '');
  check('-', 'I', 'meat is a weighed food',
    displayUnitFor({ name: 'Ribeye Steak', category: 'Beef' }) === 'g', '');
  check('-', 'I', 'a per-food override wins over the category default',
    displayUnitFor({ name: 'Odd', category: 'Beef', displayUnit: 'each' }) === 'each', '');

  let threw = false;
  try { renderIngredient({ name: 'Probe', unit: 'furlong', qty: 1 }); } catch { threw = true; }
  check('-', 'I', 'an unknown display unit throws rather than printing a bare number',
    threw, 'renderIngredient() silently accepted a unit it has no rule for');

  // Behavioural, across every persona: the rendered quantity IS the stored quantity,
  // and rounding a count food never moves it by more than half a unit.
  let countItems = 0;
  for (const p of PERSONAS) {
    const data = rendered[p.id].data;
    // Fail-closed guards live inside the generator (a meal may not name one ingredient
    // in two units, an unknown unit may not be rendered). When one fires, name the
    // persona and keep going rather than ending the run on a stack trace.
    let plan;
    try {
      plan = generateFullMealPlan(data);
    } catch (err) {
      check(p.id, 'I', 'meal plan builds without a display-unit violation', false,
        `${err.name}: ${err.message}`);
      continue;
    }
    for (const week of plan.weeks) {
      for (const day of week.days) {
        for (const it of day.items) {
          check(p.id, 'I', `item "${it.name}" declares a unit`, !!it.unit, JSON.stringify(it));
          if (it.unit === 'each') {
            countItems++;
            // The rounded count is authoritative: grams are restated from it, so the
            // meal, its macros and the shopping list all describe the same food.
            check(p.id, 'I', `"${it.name}" grams are restated from the rounded count`,
              it.grams === it.qty * GRAMS_PER_EGG,
              `qty ${it.qty} but grams ${it.grams}`);
            check(p.id, 'I', `"${it.name}" is a whole number of units`,
              Number.isInteger(it.qty) && it.qty >= 1, `qty ${it.qty}`);
          }
          if (it.unit === 'g') {
            check(p.id, 'I', `"${it.name}" gram quantity is a positive whole number`,
              Number.isInteger(it.qty) && it.qty > 0, `qty ${it.qty}`);
          }
        }
      }
    }
  }
  check('-', 'I', `count-denominated items were actually exercised (${countItems} seen)`,
    countItems > 0, 'no persona produced a counted food; this group proved nothing');

  // The documented tolerance is what the code says it is.
  check('-', 'I', 'rounding tolerance is half a unit',
    MAX_ROUNDING_ERROR_G === GRAMS_PER_EGG / 2,
    `constant says ${MAX_ROUNDING_ERROR_G}, half a unit is ${GRAMS_PER_EGG / 2}`);
  const protErr = (MAX_ROUNDING_ERROR_G / 100) * 13;   // eggs: 13g protein per 100g
  check('-', 'I', `worst-case rounding costs <= 3.5g protein per portion (${protErr.toFixed(2)}g)`,
    protErr <= 3.5, `rounding can move a meal by ${protErr.toFixed(2)}g protein`);
}

// ---------------------------------------------------------------------------
// GROUP L — one food may not be presented as two.
//
// Reported 2026-09-09: "Ground Beef 80/20 and grass fed ground beef are the same
// things!" The food database lists a food once per quality grade, which is right for
// a shopping list and wrong for any line that shows several foods together as if each
// were different. generateDynamicFoodGuide sampled availableProteins.slice(0, 3), and
// the first two carnivore rows are two grades of ground beef, so EVERY carnivore
// report ever sold read "Option 1: Ground Beef (80/20) + Grass-fed Ground Beef".
//
// Both halves matter here. The rendered checks catch the symptom. The derivation
// checks below catch it at the source, and the POSITIVE CONTROLS stop the cheapest
// wrong fix from passing: collapsing everything to one item would silence the
// duplicate assertions while destroying the variety the product sells.
// ---------------------------------------------------------------------------
{
  // Pull "A + B + C" food lists out of the rendered eating-pattern options, and the
  // comma list out of Budget Optimization. Read off the page, not off the generator.
  const optionLines = (guide) =>
    (guide.match(/^- \*\*Option \d+:\*\*.*$/gm) || [])
      .map(line => line.replace(/^- \*\*Option \d+:\*\*\s*/, '').split(' + ').map(x => x.trim()));

  const budgetFoods = (guide) => {
    const m = guide.match(/## Budget Optimization\s*\n+([^\n]+)/);
    if (!m || /premium options/i.test(m[1])) return [];
    return m[1].split(',').map(x => x.trim()).filter(Boolean);
  };

  const substitutionFoods = (calendar) => {
    const m = calendar.match(/If you lack ([^,]+), substitute with ([^\n]+)/);
    if (!m) return [];
    return [m[1].trim(), ...m[2].split(',').map(x => x.trim())].filter(Boolean);
  };

  const firstRepeat = (names) => {
    const seen = new Map();
    for (const n of names) {
      const k = baseFoodKey(n);
      if (seen.has(k)) return `${seen.get(k)} and ${n} are the same food (base "${k}")`;
      seen.set(k, n);
    }
    return null;
  };

  for (const p of PERSONAS) {
    const { foodGuide, calendar } = rendered[p.id];
    if (!foodGuide) continue;

    const opts = optionLines(foodGuide);
    check(p.id, 'L', 'no eating-pattern option names one food twice',
      opts.every(foods => firstRepeat(foods) === null),
      (opts.map(firstRepeat).find(Boolean)) || '');

    // Positive control. An option that lists two foods must genuinely list TWO, so a
    // fix that deduped by collapsing the list cannot pass the assertion above.
    check(p.id, 'L', 'multi-food options still name more than one food',
      opts.length === 0 || opts.some(foods => foods.length >= 2),
      'every rendered option collapsed to a single food');

    check(p.id, 'L', 'budget picks are different foods',
      firstRepeat(budgetFoods(foodGuide)) === null,
      firstRepeat(budgetFoods(foodGuide)) || '');

    const subs = substitutionFoods(calendar);
    check(p.id, 'L', 'substitutions offer a different food than the one lacked',
      firstRepeat(subs) === null, firstRepeat(subs) || '');
  }

  // --- The substitution rule, exercised directly. -------------------------
  // Whether two grades of one food land adjacent in planProteins depends on the meal
  // rotation, and no persona happens to produce it, so asserting only on rendered
  // output left this rule unexercised (mutate.sh M17 survived a fully green suite).
  // Feed it the ordering the rule exists for.
  {
    const sub = buildSubstitutionGuide(
      ['Grass-fed Ground Beef', 'Ground Beef (80/20)', 'Ribeye Steak', 'NY Strip Steak', 'Chuck Steak'], false);
    const line = (sub.match(/If you lack [^\n]*/) || [''])[0];
    check('-', 'L', 'a substitution is never another grade of the food you lack',
      !/substitute with Ground Beef \(80\/20\)/.test(line), line);
    check('-', 'L', 'the substitution line still offers real alternatives',
      /substitute with Ribeye Steak, NY Strip Steak, Chuck Steak/.test(line), line);

    // Positive control: genuinely different foods must survive as alternatives.
    const sub2 = buildSubstitutionGuide(['Ribeye Steak', 'Ground Lamb', 'Pork Chops'], false);
    check('-', 'L', 'distinct foods are still offered as substitutes',
      /If you lack Ribeye Steak, substitute with Ground Lamb, Pork Chops/.test(sub2), sub2);

    // Degenerate input must not throw or invent a food.
    check('-', 'L', 'a plan with one protein offers no false substitute',
      !/If you lack/.test(buildSubstitutionGuide(['Ribeye Steak'], false)), '');
    check('-', 'L', 'an empty plan still returns guidance',
      buildSubstitutionGuide([], false).length > 0, '');
  }

  // --- Derivation, not rendering. -----------------------------------------
  check('-', 'L', 'the two grades of ground beef share one base identity',
    baseFoodKey('Ground Beef (80/20)') === baseFoodKey('Grass-fed Ground Beef'),
    `"${baseFoodKey('Ground Beef (80/20)')}" vs "${baseFoodKey('Grass-fed Ground Beef')}"`);
  check('-', 'L', 'the two grades of butter share one base identity',
    baseFoodKey('Butter') === baseFoodKey('Grass-fed Butter'), '');
  check('-', 'L', 'a food object is keyed the same as its bare name',
    baseFoodKey({ name: 'Grass-fed Ground Beef' }) === baseFoodKey('Grass-fed Ground Beef'), '');
  check('-', 'L', 'an explicit base field overrides the name',
    baseFoodKey({ name: 'Anything At All', base: 'ribeye steak' }) === 'ribeye steak', '');
  check('-', 'L', 'grade prefix and suffix are stripped together',
    baseFoodKey('Grass-fed Ground Beef (80/20)') === 'ground beef',
    `got "${baseFoodKey('Grass-fed Ground Beef (80/20)')}"`);

  // Negative controls: different foods must STAY different. Without these, a
  // normalizer that over-strips (or returns a constant) would satisfy every
  // duplicate assertion in this group.
  for (const [a, b] of [['Ribeye Steak', 'NY Strip Steak'], ['Beef Liver', 'Beef Heart'],
                        ['Salmon Fillet (farmed)', 'Canned Salmon (in oil)'],
                        ['Ground Beef (80/20)', 'Ground Lamb'], ['Butter', 'Beef Tallow']]) {
    check('-', 'L', `"${a}" and "${b}" stay different foods`,
      baseFoodKey(a) !== baseFoodKey(b), `both keyed "${baseFoodKey(a)}"`);
  }

  // The helper itself, against the real database rather than a hand-made list.
  const carnivore = foodDatabase.proteins.filter(p => p.diet.some(d => d.toLowerCase() === 'carnivore'));
  const deduped = distinctByBaseFood(carnivore);
  // Named, not counted. The database holds exactly two same-food-different-grade
  // pairs today; both are the reported bug's shape. Listing them means adding a third
  // grade pair fails here with the new food's name, which is the moment to decide
  // whether it really is the same food.
  const droppedNames = carnivore.filter(p => !deduped.includes(p)).map(p => p.name).sort();
  const EXPECTED_SECOND_GRADES = ['Grass-fed Ground Beef', 'Salmon Fillet (farmed)'];
  check('-', 'L', 'distinctByBaseFood drops exactly the known second grades',
    JSON.stringify(droppedNames) === JSON.stringify(EXPECTED_SECOND_GRADES),
    `dropped [${droppedNames.join(', ')}], expected [${EXPECTED_SECOND_GRADES.join(', ')}]`);
  check('-', 'L', 'distinctByBaseFood keeps the FIRST grade, so database order still decides',
    deduped[0]?.name === carnivore[0]?.name,
    `kept "${deduped[0]?.name}", database leads with "${carnivore[0]?.name}"`);
  check('-', 'L', 'distinctByBaseFood output has no repeats',
    new Set(deduped.map(baseFoodKey)).size === deduped.length, '');
  check('-', 'L', 'distinctByBaseFood is not just a truncation',
    deduped.length === carnivore.length - EXPECTED_SECOND_GRADES.length && deduped.length > 5,
    `${deduped.length} of ${carnivore.length} survived`);
  check('-', 'L', 'distinctByBaseFood tolerates an empty pool',
    Array.isArray(distinctByBaseFood([])) && distinctByBaseFood([]).length === 0, '');

  // Scope guard. The tier listing is where BOTH grades belong: they are two things a
  // reader can buy. If a future edit routes the tier list through the deduper, the
  // reader silently loses shopping options, so pin the intended asymmetry.
  const carn = rendered['REPORTED']?.foodGuide || '';
  check('-', 'L', 'the tier listing still shows both grades as buyable options',
    carn.includes('Ground Beef (80/20)') && carn.includes('Grass-fed Ground Beef'),
    'deduping leaked into the TIER 1 food list, which should show every grade');
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
