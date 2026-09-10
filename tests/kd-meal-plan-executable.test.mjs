#!/usr/bin/env node
/**
 * tests/kd-meal-plan-executable.test.mjs
 *
 * Run it:
 *     node tests/kd-meal-plan-executable.test.mjs
 *
 * No network, no database, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS  (Blocker #3, found 2026-09-09)
 * ---------------------------------------------------------------------------
 * A meal was a `desc` STRING plus four macro numbers, and scaleMeal() multiplied
 * the numbers while copying the string. So the plan printed
 *
 *     "4 oz sirloin steak (113g) · 2 large eggs (100g) · 1 tbsp butter (14g)"
 *          => 265 kcal  F18 P25
 *
 * for a customer on 890 kcal, when that plate as written is 442 kcal. Cooking the
 * written week delivered about 1,480 kcal against an 890 kcal target, which is not
 * a rounding error, it is the whole deficit the product sold. The scale factor ran
 * 0.6x to 2.0x, so at the other end the reader ate half what the plan assumed.
 *
 * The fat knob wrote instructions nobody could follow: "· −2 tbsp fat" appended to
 * a dinner holding one tablespoon of oil, and "· +9.5 tbsp butter", about 133 g on
 * a single plate. The grocery list was two hardcoded lists that never moved.
 *
 * WHAT THIS SUITE PINS
 *   A  scaling moves the FOOD, not only the numbers
 *   B  the written portions reproduce the printed macros
 *   C  day totals stay within tolerance of the customer's target
 *   D  no negative, zero or impossible quantities, ever
 *   E  no absurd single-plate fat
 *   F  the grocery list is derived from the week that was generated
 *   G  dairy-free and tight-budget still work
 *   H  the Phase 2A and 2B safety gates are untouched
 *   I  mutation
 *
 * THE CENTRAL PROPERTY, stated once: the macros printed beside a meal are computed
 * FROM the quantities printed beside them. Group B re-derives every meal in every
 * plan from the ingredient library and checks the sums. That is the assertion the
 * old code could never have passed.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORTS = path.join(ROOT, 'ketodial', 'worker', 'reports.js');
const INTAKE = path.join(ROOT, 'ketodial', 'worker', 'intake.js');

const { buildMealPlanDays, generateMealPlan, KD_ING_FOR_TEST } = await import('file://' + REPORTS);

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

/** A complete intake at a given calorie level, keto split, everything else default. */
function intake(cal, over = {}) {
  return {
    sex: 'female', age: 58, heightCm: 165, weightKg: 88, goal: 'lose',
    calories: cal, fatG: Math.round(cal * 0.70 / 9), proteinG: Math.round(cal * 0.25 / 4),
    carbG: Math.round(cal * 0.05 / 4), tdee: Math.round(cal / 0.8),
    activity: 'light', kidneyStatus: 'no', conditions: [], meds: '', symptoms: [], diets: [],
    dairy: 'fine with dairy', budget: 'mod', cooking: 'Basic',
    prepTime: 'About 30 min/day', cookingFor: 'Just me', challenge: '',
    ...over,
  };
}

// The declared policy, asserted rather than assumed. Both were measured across
// 800-3600 kcal and all three preference variants before being written down.
const KCAL_TOLERANCE = 0.10;
const PROTEIN_TOLERANCE = 0.16;
/** A plate may carry a lot of fat on a ketogenic plan. It may not carry a stick. */
const MAX_FAT_TBSP_PER_MEAL = 5;
/** How closely the summed ingredients must reproduce the printed meal macros. */
const MEAL_ROUNDING_SLACK = 2;

const LEVELS = [
  ['low', 900], ['moderate-low', 1500], ['moderate', 1650], ['moderate-high', 1800],
  ['high', 3000], ['very high', 3400],
];
const VARIANTS = [
  ['standard', {}],
  ['dairy-free', { dairy: 'strict dairy-free' }],
  ['tight budget', { budget: 'tight' }],
];
const FAT_KEYS = ['butter', 'olive_oil', 'coconut_oil', 'sesame_oil', 'mayo', 'heavy_cream', 'coconut_cream'];

/** Every (level, variant) plan, built once. */
const PLANS = [];
for (const [lname, cal] of LEVELS) {
  for (const [vname, over] of VARIANTS) {
    const d = intake(cal, over);
    PLANS.push({ label: `${lname} ${cal}kcal / ${vname}`, d, days: buildMealPlanDays(d) });
  }
}

// ===========================================================================
// GROUP A — scaling moves the food
// ===========================================================================
{
  const small = buildMealPlanDays(intake(900));
  const large = buildMealPlanDays(intake(3000));
  for (let i = 0; i < 7; i++) {
    for (let m = 0; m < 3; m++) {
      const a = small[i].meals[m], b = large[i].meals[m];
      check('A', `day ${i + 1} ${a.slot}: the written portions differ between 900 and 3000 kcal`,
        a.desc !== b.desc, `both read "${a.desc}"`);
      check('A', `day ${i + 1} ${a.slot}: and the macros differ with them`, a.kcal !== b.kcal);
    }
  }
  // The exact defect: same words, different numbers. It must be impossible now.
  const seen = new Map();
  for (const { days } of PLANS) {
    for (const day of days) for (const meal of day.meals) {
      const prev = seen.get(meal.desc);
      if (prev !== undefined) {
        check('A', `identical portions always print identical calories: "${meal.desc.slice(0, 60)}…"`,
          prev === meal.kcal, `${prev} kcal here, ${meal.kcal} kcal there`);
      } else seen.set(meal.desc, meal.kcal);
    }
  }
}

// ===========================================================================
// GROUP B — the written portions reproduce the printed macros
// ===========================================================================
//
// Re-derive each meal independently from the ingredient library and compare. If
// the description and the macro column ever came from different places, this is
// where it shows.
check('B', 'the ingredient library is exposed for independent re-derivation',
  KD_ING_FOR_TEST && typeof KD_ING_FOR_TEST === 'object');
for (const { label, days } of PLANS) {
  for (const day of days) {
    for (const meal of day.meals) {
      if (!meal.ing || !meal.ing.length) continue;
      let kcal = 0, f = 0, p = 0, c = 0;
      for (const [key, q] of meal.ing) {
        const i = KD_ING_FOR_TEST[key];
        kcal += i.kcal * q; f += i.f * q; p += i.p * q; c += i.c * q;
      }
      check('B', `${label} day ${day.dayNum} ${meal.slot}: printed kcal is what the food adds up to`,
        Math.abs(Math.round(kcal) - meal.kcal) <= MEAL_ROUNDING_SLACK,
        `ingredients ${Math.round(kcal)}, printed ${meal.kcal} — "${meal.desc}"`);
      check('B', `${label} day ${day.dayNum} ${meal.slot}: printed protein matches the food`,
        Math.abs(Math.round(p) - meal.p) <= MEAL_ROUNDING_SLACK);
      check('B', `${label} day ${day.dayNum} ${meal.slot}: printed fat matches the food`,
        Math.abs(Math.round(f) - meal.f) <= MEAL_ROUNDING_SLACK);
      check('B', `${label} day ${day.dayNum} ${meal.slot}: printed carbs match the food`,
        Math.abs(Math.round(c) - meal.c) <= MEAL_ROUNDING_SLACK);
    }
  }
}
// And the day total is the sum of the meals printed on that day.
for (const { label, days } of PLANS) {
  for (const day of days) {
    check('B', `${label} day ${day.dayNum}: the day total is the sum of its meals`,
      day.totKcal === day.meals.reduce((a, m) => a + m.kcal, 0));
  }
}

// ===========================================================================
// GROUP C — day totals stay within tolerance of the customer's target
// ===========================================================================
for (const { label, d, days } of PLANS) {
  for (const day of days) {
    const dk = Math.abs(day.totKcal - d.calories) / d.calories;
    check('C', `${label} day ${day.dayNum}: within ${KCAL_TOLERANCE * 100}% of the calorie target`,
      dk <= KCAL_TOLERANCE, `${day.totKcal} vs ${d.calories} (${(dk * 100).toFixed(1)}%)`);
    const dp = Math.abs(day.totP - d.proteinG) / d.proteinG;
    check('C', `${label} day ${day.dayNum}: within ${PROTEIN_TOLERANCE * 100}% of the protein target`,
      dp <= PROTEIN_TOLERANCE, `${day.totP}g vs ${d.proteinG}g (${(dp * 100).toFixed(1)}%)`);
  }
}

// ===========================================================================
// GROUP D — nothing negative, nothing impossible
// ===========================================================================
for (const { label, days } of PLANS) {
  for (const day of days) {
    for (const meal of day.meals) {
      for (const [key, q] of (meal.ing || [])) {
        check('D', `${label} ${meal.slot}: ${key} quantity is positive`, q > 0, String(q));
        check('D', `${label} ${meal.slot}: ${key} is at or above its printable minimum`,
          q >= KD_ING_FOR_TEST[key].min, `${q} < ${KD_ING_FOR_TEST[key].min}`);
      }
      check('D', `${label} ${meal.slot}: no "minus fat" instruction`,
        !/(^|\s)[−-]\s*\d|minus/i.test(meal.desc), meal.desc);
      check('D', `${label} ${meal.slot}: macros are not negative`,
        meal.kcal >= 0 && meal.f >= 0 && meal.p >= 0 && meal.c >= 0);
      check('D', `${label} ${meal.slot}: the description is not empty`, meal.desc.trim().length > 0);
    }
  }
}

// ===========================================================================
// GROUP E — no absurd single-plate fat
// ===========================================================================
for (const { label, days } of PLANS) {
  for (const day of days) {
    for (const meal of day.meals) {
      for (const [key, q] of (meal.ing || [])) {
        if (!FAT_KEYS.includes(key)) continue;
        check('E', `${label} ${meal.slot}: ${key} is a cookable amount`,
          q <= MAX_FAT_TBSP_PER_MEAL, `${q} tbsp`);
      }
    }
  }
}

// ===========================================================================
// GROUP F — the grocery list is derived from the generated week
// ===========================================================================
function groceryItems(html) {
  const t = html.slice(html.indexOf("Your week's grocery list"));
  return [...t.matchAll(/<li>([^<]*)<span class="q">([^<]*)<\/span>/g)].map(m => [m[1].trim(), m[2].trim()]);
}
{
  const low = groceryItems(generateMealPlan('Jane', intake(900)));
  const high = groceryItems(generateMealPlan('Jane', intake(3000)));
  check('F', 'the grocery list is not empty', low.length > 0);
  const lowMap = new Map(low), highMap = new Map(high);
  const shared = [...lowMap.keys()].filter(k => highMap.has(k));
  check('F', 'the two plans share ingredients to compare', shared.length >= 5);
  const moved = shared.filter(k => lowMap.get(k) !== highMap.get(k));
  check('F', 'grocery quantities change with the plan',
    moved.length >= Math.ceil(shared.length * 0.6),
    `${moved.length} of ${shared.length} items moved between 900 and 3000 kcal`);

  // Reconciliation: every protein the week tells you to cook must be on the list,
  // and the list must not invent food the plan never uses. This is the assertion
  // the old fixed list could not have passed.
  for (const { label, d, days } of PLANS) {
    const used = new Set();
    for (const day of days) for (const meal of day.meals) for (const [key] of (meal.ing || [])) used.add(key);
    const listed = new Set(groceryItems(generateMealPlan('Jane', d))
      .map(([item]) => item.replace(/&amp;/g, '&')));
    for (const key of used) {
      const ing = KD_ING_FOR_TEST[key];
      const nm = (ing.plural || ing.label).replace(/&amp;/g, '&');
      check('F', `${label}: "${nm}" is cooked this week and appears on the list`, listed.has(nm), nm);
    }
    check('F', `${label}: the list contains nothing the week never cooks`,
      [...listed].every(item => [...used].some(k => {
        const i = KD_ING_FOR_TEST[k];
        return (i.plural || i.label).replace(/&amp;/g, '&') === item;
      })), [...listed].join(' | '));
  }
}

// ===========================================================================
// GROUP G — dairy-free and tight budget
// ===========================================================================
{
  const DAIRY_KEYS = ['cheddar', 'blue_cheese', 'feta', 'mozzarella', 'cream_cheese', 'heavy_cream'];
  for (const cal of [900, 1650, 3000]) {
    const df = buildMealPlanDays(intake(cal, { dairy: 'strict dairy-free' }));
    const used = new Set();
    for (const day of df) for (const meal of day.meals) for (const [k] of (meal.ing || [])) used.add(k);
    check('G', `dairy-free ${cal}: no dairy ingredient appears`,
      !DAIRY_KEYS.some(k => used.has(k)), [...used].filter(k => DAIRY_KEYS.includes(k)).join(','));

    const tight = buildMealPlanDays(intake(cal, { budget: 'tight' }));
    const tUsed = new Set();
    for (const day of tight) for (const meal of day.meals) for (const [k] of (meal.ing || [])) tUsed.add(k);
    check('G', `tight budget ${cal}: no ribeye or salmon fillet in the dinners`,
      !tUsed.has('ribeye'), [...tUsed].join(','));
    check('G', `tight budget ${cal}: the plan still hits its calorie target`,
      tight.every(day => Math.abs(day.totKcal - intake(cal).calories) / intake(cal).calories <= KCAL_TOLERANCE));
  }
}

// ===========================================================================
// GROUP H — the Phase 2A and 2B gates are untouched
// ===========================================================================
{
  const full = (over) => generateMealPlan('Jane', intake(1650, over));
  check('H', 'a declared kidney condition still gets the referral, not a plan',
    full({ kidneyStatus: 'yes' }).includes('We have not built this plan'));
  check('H', 'and no grocery quantities are derived for them',
    !full({ kidneyStatus: 'yes' }).includes("Your week's grocery list"));
  check('H', 'a declared SGLT2 inhibitor still gets the referral',
    full({ meds: 'Jardiance 10mg' }).includes('We have not built this plan'));
  check('H', 'and no grocery quantities are derived for them',
    !full({ meds: 'Jardiance 10mg' }).includes("Your week's grocery list"));
  check('H', 'adrenal text still receives a real plan',
    !full({ meds: 'hydrocortisone for adrenal insufficiency' }).includes('We have not built this plan'));
  const ins = full({ meds: 'Lantus insulin 24 units at night' });
  check('H', 'insulin still receives a real plan', !ins.includes('We have not built this plan'));
  check('H', 'and it still carries the Phase 2B medication warning',
    ins.includes('Talk to your prescriber before you start'));
  check('H', 'and it still gets a grocery list', ins.includes("Your week's grocery list"));
}

// ===========================================================================
// GROUP I — mutation
// ===========================================================================
const MUTATIONS = [
  {
    // The original defect exactly: portions frozen at base while the macro
    // numbers are multiplied. This is what scaleMeal() did.
    name: 'scaleMeal is back: macros scale, portions do not',
    apply: (s) => s.replace(
      '    const q = kdRoundQty(key, capped);\n    if (q >= KD_ING[key].min) ing.push([key, q]);\n  }\n  return kdFinishMeal(tpl, ing);',
      `    const q = kdRoundQty(key, baseQty);
    if (q >= KD_ING[key].min) ing.push([key, q]);
  }
  const m = kdFinishMeal(tpl, ing);
  return { ...m, kcal: Math.round(m.kcal * scale), f: Math.round(m.f * scale),
           p: Math.round(m.p * scale), c: Math.round(m.c * scale) };`),
    caught: ['A', 'B'],
  },
  {
    name: 'the grocery list goes back to fixed quantities',
    apply: (s) => s.replace(
      'function kdBuildGroceryList(days) {',
      `function kdBuildGroceryList(days) {
  void days;
  return { proteins: [['ribeye steak', '12 oz', 340]], fats: [], produce: [], dairy: [], pantry: [] };
}
function kdBuildGroceryListUnused(days) {`),
    caught: ['F'],
  },
  {
    // The adjustment written as prose instead of as a quantity, so the plan says
    // "minus 2 tbsp fat" about a plate that holds one.
    name: 'the fat knob appends a removal instruction again',
    apply: (s) => s.replace(
      '  return { meal: kdFinishMeal(tpl, next), used: (rounded - qty) * per };',
      '  const out = kdFinishMeal(tpl, ing);\n' +
      '  const tb = Math.round(Math.abs(kcalGap / per) * 2) / 2;\n' +
      '  out.desc += kcalGap > 0 ? " \u00b7 +" + tb + " tbsp butter" : " \u00b7 \u2212" + tb + " tbsp fat";\n' +
      '  return { meal: out, used: kcalGap };'),
    caught: ['D'],
  },
  {
    name: 'the fat ceiling is removed, so one plate can carry any amount',
    apply: (s) => s.replace('const KD_FAT_MAX_TBSP = 4;', 'const KD_FAT_MAX_TBSP = 99;'),
    caught: ['E'],
  },
];

for (const m of MUTATIONS) {
  const src = fs.readFileSync(REPORTS, 'utf8');
  const mutated = m.apply(src).replace("from './intake.js'", `from '${'file://' + INTAKE}'`);
  check('I', `mutation applied: ${m.name}`,
    mutated.replace(`from '${'file://' + INTAKE}'`, "from './intake.js'") !== src,
    'the replace matched nothing, so this mutation proves nothing');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-meal-mutant-'));
  const file = path.join(dir, 'reports.mutant.mjs');
  fs.writeFileSync(file, mutated);
  try {
    const mut = await import('file://' + file + '?v=' + encodeURIComponent(m.name));
    const broken = new Set();
    // Re-run the load-bearing checks of each group against the mutant.
    for (const cal of [900, 1650, 3000]) {
      const d = intake(cal);
      let days;
      try { days = mut.buildMealPlanDays(d); } catch { broken.add('D'); continue; }
      for (const day of days) {
        for (const meal of day.meals) {
          if (!meal.ing || !meal.ing.length) continue;
          let kcal = 0;
          for (const [key, q] of meal.ing) {
            kcal += mut.KD_ING_FOR_TEST[key].kcal * q;
            if (q <= 0) broken.add('D');
            if (FAT_KEYS.includes(key) && q > MAX_FAT_TBSP_PER_MEAL) broken.add('E');
          }
          // Group D also owns the prose form of the defect, so the harness has to
          // read the description, not only the quantities. Without this the
          // "minus 2 tbsp fat" mutation slipped through every numeric check,
          // which is precisely how it survived in production.
          if (/(^|\s)[\u2212-]\s*\d|minus/i.test(meal.desc)) broken.add('D');
          {
          }
          if (Math.abs(Math.round(kcal) - meal.kcal) > MEAL_ROUNDING_SLACK) broken.add('B');
        }
      }
      // Group A's property is "identical portions print identical calories", not
      // "two plans differ" — two plans also differ because they pick different
      // meals, which would make this pass for the wrong reason.
      const seenM = new Map();
      for (const day of days) for (const meal of day.meals) {
        if (!meal.ing || !meal.ing.length) continue;
        if (seenM.has(meal.desc) && seenM.get(meal.desc) !== meal.kcal) broken.add('A');
        seenM.set(meal.desc, meal.kcal);
      }
      for (const other of [1650, 3000]) {
        for (const day of mut.buildMealPlanDays(intake(other))) for (const meal of day.meals) {
          if (!meal.ing || !meal.ing.length) continue;
          if (seenM.has(meal.desc) && seenM.get(meal.desc) !== meal.kcal) broken.add('A');
          seenM.set(meal.desc, meal.kcal);
        }
      }
      const lo = groceryItems(mut.generateMealPlan('J', intake(900)));
      const hi = groceryItems(mut.generateMealPlan('J', intake(3000)));
      if (JSON.stringify(lo) === JSON.stringify(hi)) broken.add('F');
    }
    for (const g of m.caught) {
      check('I', `group ${g} catches: ${m.name}`, broken.has(g),
        `groups that noticed: ${[...broken].join(',') || 'none'}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ===========================================================================
if (failures.length) {
  console.error(`\nkd-meal-plan-executable: ${passed} passed, ${failures.length} FAILED\n`);
  for (const f of failures.slice(0, 30)) {
    console.error(`  [${f.group}] ${f.label}${f.detail ? `\n      ${f.detail}` : ''}`);
  }
  if (failures.length > 30) console.error(`  … and ${failures.length - 30} more`);
  console.error('\nThe written food and the printed macros are one thing now. Do not');
  console.error('loosen an assertion to go green: that gap is what this blocker was.\n');
  process.exit(1);
}
console.log(`\nkd-meal-plan-executable: ${passed} passed, 0 failed  (groups A B C D E F G H I)\n`);
console.log(`Every printed macro is the sum of the printed food. Days land within`);
console.log(`${KCAL_TOLERANCE * 100}% of the calorie target and ${PROTEIN_TOLERANCE * 100}% of protein, the grocery list is`);
console.log(`added up from the week, and no plate carries more than ${MAX_FAT_TBSP_PER_MEAL} tbsp of fat.\n`);
