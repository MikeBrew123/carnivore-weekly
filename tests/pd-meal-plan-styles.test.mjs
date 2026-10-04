#!/usr/bin/env node
// PescoDial weeks for every style (api/pd-meal-plan.js buildPescoWeek).
// The Mediterranean week has its own suite (tests/pd-meal-plan.test.mjs); this one
// holds the three styles added on 2026-10-03 to their own rules, and all four to the
// shared ones.
// A. every day of every target, from the ROUNDED quantities the reader is told to
//    cook: calories within 7%, protein 90-130%, and the style's carb rule
//    (Low Carb within 25 g of its carb target, Keto 30 g or less, Carnivore 10 g or less);
// B. fish meals per style (Mediterranean and Low Carb 5, Keto and Carnivore 7, Brew
//    2026-10-03), lowest-mercury kinds only, halibut at most once, every fish meal's
//    fish at least 4 oz, kinds varied;
// C. no forbidden foods: no grains, bread, pasta, potatoes, beans or sugar on Low Carb
//    or Keto, no fruit on Keto beyond a few berries, nothing but animal foods on
//    Carnivore;
// D. sane portions per meal and per day, no food listed twice in a meal;
// E. restrictions remove dishes (shellfish, eggs, feta) and keep the plan inside A;
//    excluding every fish is refused for every style;
// F. the numbers-withheld week: same dishes, no quantity anywhere;
// G. the grocery list is the sum of the week; no usable target, no plan.
// Run: node tests/pd-meal-plan-styles.test.mjs
import assert from 'node:assert/strict';
import { buildPescoWeek, buildPescoDishWeek, groceryFromWeek, groceryNamesFromWeek, PD_FISH_MEALS, PD_STYLES } from '../api/pd-meal-plan.js';
import { PD_FOODS } from '../api/pd-foods.js';

let failed = 0;
const check = (name, fn) => { try { fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '-', e.message); } };

const NEW_STYLES = ['pesco-lowcarb', 'pesco-keto', 'pesco-carnivore'];
const LOW_MERCURY = new Set(['salmon', 'sardines', 'shrimp', 'cod', 'tilapia', 'trout', 'tuna', 'mackerel', 'scallops', 'smoked_salmon']);
const GOOD_CHOICE = new Set(['halibut']);
const SEAFOOD = new Set(Object.keys(PD_FOODS).filter(k => PD_FOODS[k].section === 'Seafood'));
const FISH_ONLY = ['salmon', 'cod', 'tuna', 'sardines', 'trout', 'tilapia', 'mackerel', 'smoked_salmon', 'halibut'];
const ALL_SEAFOOD = [...FISH_ONLY, 'shrimp', 'scallops'];
const GRAINS_STARCH_SUGAR = ['wholegrain_bread', 'pita', 'oats', 'quinoa', 'bulgur', 'ww_pasta', 'potatoes', 'dates'];
const LEGUMES = ['lentils', 'chickpeas', 'white_beans', 'hummus'];
const FRUIT = ['apple', 'orange', 'pear', 'dates', 'blueberries', 'raspberries', 'strawberries', 'lemon'];
const BERRIES = ['blueberries', 'raspberries', 'strawberries'];
const ANIMAL = new Set([...SEAFOOD, 'eggs', 'butter', 'cheddar', 'cream_cheese', 'heavy_cream', 'whole_greek_yogurt',
  'greek_yogurt', 'milk', 'feta', 'parmesan', 'string_cheese']);

// The macro sets calculateMacros gives these styles: protein 2 g per kg of goal weight
// (about 9.5% of calories at 1,200 kcal, 7% at 2,600), Low Carb carbs up to 100 g,
// Keto 20 g, Carnivore 0; fat fills the rest. Two protein levels per target.
function macrosFor(style, cal, r) {
  const P = Math.round(cal * r);
  const C = style === 'pesco-lowcarb' ? Math.min(100, Math.max(20, Math.floor((cal - 4 * P - 0.2 * cal) / 4)))
    : style === 'pesco-keto' ? 20 : style === 'pesco-carnivore' ? 0 : Math.round(cal * 0.45 / 4);
  return { calories: cal, protein_grams: P, carbs_grams: C, fat_grams: Math.round((cal - 4 * P - 4 * C) / 9) };
}
const CALS = [1200, 1356, 1500, 1700, 1900, 2100, 2300, 2600];
const targets = style => CALS.flatMap(cal => {
  const rHigh = 0.095 - (cal - 1200) / 1400 * 0.025;
  return [macrosFor(style, cal, rHigh), macrosFor(style, cal, rHigh - 0.015)];
});
const meals = w => w.days.flatMap(d => d.meals);
const items = w => meals(w).flatMap(m => m.items);

function assertDayTolerance(style, m, w, tag) {
  assert.equal(w.days.length, 7, `${tag}: ${w.days.length} days (${w.warnings.join(' ')})`);
  for (const d of w.days) {
    const t = d.totals, at = `${style} ${m.calories} ${d.day}${tag ? ' ' + tag : ''}`;
    assert.ok(Math.abs(t.kcal - m.calories) <= 0.07 * m.calories, `${at}: ${t.kcal} kcal`);
    assert.ok(t.protein >= 0.9 * m.protein_grams && t.protein <= 1.3 * m.protein_grams, `${at}: protein ${t.protein}/${m.protein_grams}`);
    if (style === 'pesco-lowcarb') assert.ok(Math.abs(t.carbs - m.carbs_grams) <= 25, `${at}: carbs ${t.carbs}/${m.carbs_grams}`);
    if (style === 'pesco-keto') assert.ok(t.carbs <= 30, `${at}: keto carbs ${t.carbs}`);
    if (style === 'pesco-carnivore') assert.ok(t.carbs <= 10, `${at}: carnivore carbs ${t.carbs}`);
  }
}

for (const style of NEW_STYLES) {
  check(`A. ${style}: every day within tolerance across ${CALS.length} targets x 2 protein levels`, () => {
    for (const m of targets(style)) assertDayTolerance(style, m, buildPescoWeek(style, m), '');
  });
}

for (const style of PD_STYLES) {
  check(`B. ${style}: ${PD_FISH_MEALS[style]} fish meals, lowest-mercury kinds, 4 oz or more, varied`, () => {
    for (const m of [targets(style)[2], targets(style)[13]]) {
      const w = buildPescoWeek(style, m);
      const fishMeals = meals(w).filter(x => x.fish);
      assert.equal(fishMeals.length, PD_FISH_MEALS[style], 'fish meal count');
      const seafood = items(w).filter(i => SEAFOOD.has(i.food));
      for (const i of seafood) assert.ok(LOW_MERCURY.has(i.food) || GOOD_CHOICE.has(i.food), `${i.food} is not a lowest-mercury kind`);
      assert.ok(seafood.filter(i => i.food === 'halibut').length <= 1, 'halibut more than once a week');
      const kinds = new Set(fishMeals.map(x => x.items.find(i => SEAFOOD.has(i.food) && i.food !== 'smoked_salmon').food));
      assert.ok(kinds.size >= 4, `only ${kinds.size} kinds of fish`);
      if (style !== 'pesco-mediterranean') {
        // Mediterranean keeps its original ½ can tuna and 1 can sardine portions.
        for (const x of fishMeals) {
          const main = x.items.filter(i => SEAFOOD.has(i.food) && i.food !== 'smoked_salmon').reduce((a, i) => a + i.grams, 0);
          assert.ok(main >= 113, `${style} ${x.name}: ${main} g of fish, under 4 oz`);
        }
      }
      // A day with no fish meal may not carry fish under another name.
      for (const d of w.days) if (!d.meals.some(x => x.fish)) {
        assert.ok(!d.meals.some(x => x.items.some(i => SEAFOOD.has(i.food))), `${d.day}: fish on a fish-free day`);
      }
    }
  });
}

const FORBIDDEN = {
  'pesco-lowcarb': k => GRAINS_STARCH_SUGAR.includes(k) || LEGUMES.includes(k) || ['apple', 'orange', 'pear', 'dates'].includes(k),
  'pesco-keto': k => GRAINS_STARCH_SUGAR.includes(k) || LEGUMES.includes(k) || (FRUIT.includes(k) && !BERRIES.includes(k)) || k === 'milk',
  'pesco-carnivore': k => !ANIMAL.has(k),
};
for (const style of NEW_STYLES) {
  check(`C. ${style}: no forbidden foods in any dish, side or top-up`, () => {
    const restrictions = [() => false, k => k === 'eggs', (k, f) => /shrimp|shellfish|crustacean|scallop|mollus/i.test(k + ' ' + (f.usda || ''))];
    for (const isEx of restrictions) for (const m of targets(style)) {
      const w = buildPescoWeek(style, m, isEx);
      for (const i of items(w)) assert.ok(!FORBIDDEN[style](i.food), `${style} ${m.calories}: ${i.food} is not allowed`);
      if (style === 'pesco-keto') for (const d of w.days) {
        const berries = d.meals.flatMap(x => x.items).filter(i => BERRIES.includes(i.food)).reduce((a, i) => a + i.qty, 0);
        assert.ok(berries <= 0.5, `${style} ${d.day}: ${berries} cups of berries is more than a few`);
      }
    }
    for (const i of buildPescoDishWeek(style).days.flatMap(d => d.meals).flatMap(x => x.items)) {
      assert.ok(!FORBIDDEN[style](i.food), `${style} dish week: ${i.food} is not allowed`);
    }
  });
}

const MEAL_MAX = { salmon: 10, cod: 10, shrimp: 10, trout: 10, tilapia: 10, mackerel: 10, scallops: 10, halibut: 7,
  sardines: 2.5, tuna: 1.5, smoked_salmon: 2, eggs: 4, butter: 3, olive_oil: 3, cheddar: 2, string_cheese: 2,
  greek_yogurt: 1.25, whole_greek_yogurt: 1.25, avocado: 0.5, olives: 10, macadamia: 3, almonds: 6, walnuts: 3,
  heavy_cream: 3, cream_cheese: 2, feta: 2, blueberries: 1, raspberries: 1, strawberries: 1 };
const DAY_MAX = { eggs: 10, string_cheese: 5, smoked_salmon: 2, greek_yogurt: 3 };
check('D. sane portions per meal and per day, nothing listed twice in a meal (all styles)', () => {
  for (const style of PD_STYLES) for (const m of targets(style)) {
    const w = buildPescoWeek(style, m);
    for (const d of w.days) {
      const day = {};
      for (const x of d.meals) {
        const seen = new Set();
        for (const i of x.items) {
          const at = `${style} ${m.calories} ${d.day} ${x.slot}`;
          assert.ok(!seen.has(i.food), `${at}: ${i.food} listed twice`);
          seen.add(i.food);
          if (MEAL_MAX[i.food]) assert.ok(i.qty <= MEAL_MAX[i.food], `${at}: ${i.qty} ${i.unit} ${i.food}`);
          assert.ok(i.qty > 0, `${at}: ${i.food} with no amount`);
          day[i.food] = (day[i.food] || 0) + i.qty;
        }
      }
      for (const [k, max] of Object.entries(DAY_MAX)) assert.ok((day[k] || 0) <= max, `${style} ${m.calories} ${d.day}: ${day[k]} ${k} in a day`);
    }
  }
});

const SHELLFISH = (k, f) => /shrimp|shellfish|crustacean|scallop|mollus/i.test(k + ' ' + (f.usda || ''));
for (const style of PD_STYLES) {
  check(`E. ${style}: restrictions remove dishes; all fish excluded is refused`, () => {
    const m = targets(style)[4];
    const shell = buildPescoWeek(style, m, SHELLFISH);
    assert.ok(!items(shell).some(i => i.food === 'shrimp' || i.food === 'scallops'), 'shellfish left in');
    assert.equal(meals(shell).filter(x => x.fish).length, PD_FISH_MEALS[style], 'fish meals not kept under a shellfish allergy');
    if (style !== 'pesco-mediterranean') for (const t of targets(style)) assertDayTolerance(style, t, buildPescoWeek(style, t, SHELLFISH), 'shellfish allergy');
    const noEgg = buildPescoWeek(style, m, k => k === 'eggs');
    assert.equal(noEgg.days.length, 7);
    assert.ok(!items(noEgg).some(i => i.food === 'eggs'), 'eggs left in');
    assert.ok(meals(noEgg).filter(x => x.fish).length >= PD_FISH_MEALS[style], 'an egg allergy cost a fish meal');
    if (style === 'pesco-lowcarb') for (const t of targets(style)) assertDayTolerance(style, t, buildPescoWeek(style, t, k => k === 'eggs'), 'egg allergy');
    const noFeta = buildPescoWeek(style, m, k => k === 'feta');
    assert.ok(!items(noFeta).some(i => i.food === 'feta'), 'feta left in');
    const noDairyFat = buildPescoWeek(style, m, k => k === 'butter' || k === 'olive_oil');
    assert.ok(!items(noDairyFat).some(i => i.food === 'butter' || i.food === 'olive_oil'), 'an excluded cooking fat was still added');
    for (const isEx of [k => ALL_SEAFOOD.includes(k), (k, f) => ALL_SEAFOOD.includes(k) || SHELLFISH(k, f)]) {
      const none = buildPescoWeek(style, m, isEx);
      assert.equal(none.days.length, 0, 'a week with every fish excluded was built');
      assert.ok(none.warnings.length > 0, 'no refusal reason');
      assert.equal(buildPescoDishWeek(style, isEx).days.length, 0, 'the dish-only week was built with every fish excluded');
    }
  });
}

for (const style of PD_STYLES) {
  check(`F. ${style}: numbers-withheld week has the same dishes and no quantity`, () => {
    const hidden = buildPescoDishWeek(style);
    const sized = buildPescoWeek(style, targets(style)[4]);
    assert.deepEqual(hidden.days.map(d => d.meals.map(x => x.dishId)), sized.days.map(d => d.meals.map(x => x.dishId)));
    for (const i of items(hidden)) {
      for (const k of ['qty', 'unit', 'grams']) assert.ok(!(k in i), `hidden week item ${i.food} carries ${k}`);
    }
    for (const list of Object.values(groceryNamesFromWeek(hidden))) for (const i of list) assert.ok(!('qty' in i), 'hidden grocery list carries an amount');
    const shell = buildPescoDishWeek(style, SHELLFISH);
    assert.ok(!items(shell).some(i => i.food === 'shrimp' || i.food === 'scallops'), 'shellfish in the hidden week');
  });
}

check('G. grocery list is the sum of the week; no usable target, no plan (all styles)', () => {
  for (const style of PD_STYLES) {
    const w = buildPescoWeek(style, targets(style)[6]);
    const fromWeek = {};
    for (const i of items(w)) fromWeek[i.food] = (fromWeek[i.food] || 0) + i.qty;
    const fromList = {};
    for (const list of Object.values(groceryFromWeek(w))) for (const i of list) fromList[i.food] = i.qty;
    assert.deepEqual(fromList, fromWeek, style);
    assert.throws(() => buildPescoWeek(style, { calories: null, protein_grams: 80, fat_grams: 50, carbs_grams: 20 }), style);
    assert.throws(() => buildPescoWeek(style, {}), style);
  }
  assert.throws(() => buildPescoWeek('pesco-lowcarb', { calories: 1500, protein_grams: 120, fat_grams: 60 }), 'low carb without a carb target');
  assert.throws(() => buildPescoWeek('pesco-paleo', targets('pesco-keto')[0]), 'unknown style');
});

process.exit(failed ? 1 : 0);
