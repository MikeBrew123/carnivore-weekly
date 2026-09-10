/**
 * Sample-day builder for the free calculator results screen.
 *
 * Why this exists (audit 2026-09-10): the sample day printed one computed meal,
 * one "to reach your target" meal, and then three HARDCODED meals stacked on
 * top — under a heading claiming the day hit the user's calorie target. For
 * carnivore that added a fixed 1,580 kcal to every profile: a 937-calorie target
 * displayed a 2,517-calorie day, a 1,646-calorie target displayed 3,226.
 *
 * One source of truth: every meal is an ingredient list with real per-unit
 * calories, the target is allocated across meals by fixed shares, quantities are
 * scaled and rounded to portions a person can actually serve, and each meal's
 * calories are then RECOMPUTED FROM THE ROUNDED QUANTITIES. The printed food and
 * the printed numbers cannot drift, because the numbers are derived from the food.
 *
 * Plain JS (not TS) so the React app and the node test suite share one
 * implementation, matching api/goal-semantics.js.
 */

/**
 * Smallest servable increment per unit, so portions stay realistic.
 * Fats are measured in half-tablespoons: at a 900-calorie target a floored whole
 * tablespoon of butter (102 cal) is a large fraction of an afternoon meal and
 * pushes the day above the target it claims to hit.
 */
const STEP = { egg: 1, strip: 1, oz: 1, lb: 0.1, tbsp: 0.5, tsp: 0.5, cup: 0.5 };

/** Never print a portion smaller than this — "0 eggs" is not a meal. */
const MIN_QTY = { egg: 1, strip: 1, oz: 1, lb: 0.1, tbsp: 0.5, tsp: 0.5, cup: 0.5 };

function roundToStep(value, unit) {
  const step = STEP[unit];
  const rounded = Math.round(value / step) * step;
  const clamped = Math.max(rounded, MIN_QTY[unit]);
  // Kill binary float dust (0.30000000000000004) without changing the value.
  return Math.round(clamped * 100) / 100;
}

function formatQty(qty, unit, name) {
  const plural = (n, word) => (n === 1 ? word : `${word}s`);
  switch (unit) {
    case 'egg': return `${qty} ${plural(qty, 'Egg')}`;
    case 'strip': return `${qty} ${plural(qty, 'Strip')} ${name}`;
    case 'lb': return `${qty} lb ${name}`;
    case 'oz': return `${qty} oz ${name}`;
    case 'tbsp': return `${qty} tbsp ${name}`;
    case 'tsp': return `${qty} tsp ${name}`;
    case 'cup': return `${qty} cup ${name}`;
    default: return `${qty} ${name}`;
  }
}

/**
 * Build one meal at a calorie allocation, scaling every ingredient together so
 * the meal keeps its shape, then recomputing calories from what was rounded.
 */
export function buildMeal(spec, slotCalories) {
  const baseCalories = spec.items.reduce((sum, i) => sum + i.baseQty * i.calPerUnit, 0);
  const k = baseCalories > 0 ? slotCalories / baseCalories : 0;

  // An item scaled to less than half its smallest servable portion is dropped
  // rather than floored. At an 900-calorie target, flooring both an ounce of
  // macadamias (204 cal) and an ounce of cheese (113) makes a 317-calorie
  // "snack" against a ~80-calorie allocation. Always keep at least one item.
  const scaled = spec.items.map((i) => ({ ...i, raw: i.baseQty * k }));
  const kept = scaled.filter((i) => i.raw >= MIN_QTY[i.unit] * 0.5);
  const use = kept.length > 0
    ? kept
    : [scaled.reduce((a, b) => (a.raw > b.raw ? a : b))];

  const items = use.map((i) => {
    const qty = roundToStep(i.raw, i.unit);
    return { name: i.name, qty, unit: i.unit, calPerUnit: i.calPerUnit, text: formatQty(qty, i.unit, i.name) };
  });

  const calories = Math.round(items.reduce((sum, item) => sum + item.qty * item.calPerUnit, 0));

  return {
    label: spec.label,
    items,
    calories,
    description: items.map((i) => i.text).join(' + '),
  };
}

/**
 * Build the whole day. `total` is the sum of what is actually printed, so the
 * UI can state it without re-deriving anything.
 */
function recalcMeal(meal) {
  meal.calories = Math.round(meal.items.reduce((s, i) => s + i.qty * i.calPerUnit, 0));
  meal.description = meal.items.map((i) => i.text).join(' + ');
}

/**
 * Close the gap left by per-ingredient rounding.
 *
 * Ten ingredients each rounded to a servable portion (and floored so nothing
 * prints as "0 oz") bias the day upward, badly at small targets. Rather than
 * fudge the displayed numbers, adjust the single largest oz-measured protein —
 * the day's anchor — one ounce at a time until the day lands on the target. The
 * food changes, so the calories derived from it stay honest.
 */
function reconcile(meals, target) {
  let anchor = null;
  for (const meal of meals) {
    for (const item of meal.items) {
      if (item.unit !== 'oz') continue;
      const contribution = item.qty * item.calPerUnit;
      if (!anchor || contribution > anchor.item.qty * anchor.item.calPerUnit) {
        anchor = { meal, item };
      }
    }
  }
  if (!anchor) return;

  for (let guard = 0; guard < 500; guard++) {
    const total = meals.reduce((s, m) => s + m.calories, 0);
    const delta = total - target;
    if (Math.abs(delta) <= anchor.item.calPerUnit / 2) break;
    const next = anchor.item.qty + (delta > 0 ? -STEP.oz : STEP.oz);
    if (next < MIN_QTY.oz) break;
    anchor.item.qty = Math.round(next * 100) / 100;
    anchor.item.text = formatQty(anchor.item.qty, anchor.item.unit, anchor.item.name);
    recalcMeal(anchor.meal);
  }
}

export function buildSampleDay(specs, target) {
  const meals = specs.map((spec) => buildMeal(spec, target * spec.share));
  reconcile(meals, target);
  const total = meals.reduce((sum, m) => sum + m.calories, 0);
  return { meals, total, target };
}

const SHARES = { meal1: 0.25, meal2: 0.25, meal3: 0.19, meal4: 0.22, snack: 0.09 };

/**
 * Per-diet sample-day shapes. Quantities are a REFERENCE SHAPE only — the
 * builder scales them to the user's actual target. Shares sum to 1.
 * calPerUnit are ordinary cooked-portion figures.
 */
export const dietSampleDays = {
  carnivore: [
    { label: 'MEAL 1 — MORNING', share: SHARES.meal1, items: [
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 4 },
      { name: 'Ground Beef (80/20)', unit: 'oz', calPerUnit: 77, baseQty: 6 },
    ]},
    { label: 'MEAL 2 — MIDDAY', share: SHARES.meal2, items: [
      { name: 'Ribeye Steak', unit: 'oz', calPerUnit: 82, baseQty: 9 },
    ]},
    { label: 'MEAL 3 — AFTERNOON', share: SHARES.meal3, items: [
      { name: 'NY Strip', unit: 'oz', calPerUnit: 74, baseQty: 5 },
      { name: 'Butter', unit: 'tbsp', calPerUnit: 102, baseQty: 1 },
    ]},
    { label: 'MEAL 4 — EVENING', share: SHARES.meal4, items: [
      { name: 'Ground Beef Patties', unit: 'oz', calPerUnit: 77, baseQty: 6 },
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 2 },
    ]},
    { label: 'DAILY SNACK', share: SHARES.snack, items: [
      { name: 'Beef Jerky', unit: 'oz', calPerUnit: 116, baseQty: 1 },
      { name: 'Hard Cheese', unit: 'oz', calPerUnit: 113, baseQty: 1 },
    ]},
  ],

  keto: [
    { label: 'MEAL 1 — MORNING', share: SHARES.meal1, items: [
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 3 },
      { name: 'Cheddar', unit: 'oz', calPerUnit: 113, baseQty: 2 },
      { name: 'Avocado', unit: 'oz', calPerUnit: 45, baseQty: 3 },
    ]},
    { label: 'MEAL 2 — MIDDAY', share: SHARES.meal2, items: [
      { name: 'Chicken Thighs (skin-on)', unit: 'oz', calPerUnit: 59, baseQty: 8 },
    ]},
    { label: 'MEAL 3 — AFTERNOON', share: SHARES.meal3, items: [
      { name: 'Grilled Chicken Thigh', unit: 'oz', calPerUnit: 59, baseQty: 5 },
      { name: 'Olive Oil', unit: 'tbsp', calPerUnit: 119, baseQty: 1 },
    ]},
    { label: 'MEAL 4 — EVENING', share: SHARES.meal4, items: [
      { name: 'Salmon Fillet', unit: 'oz', calPerUnit: 58, baseQty: 6 },
      { name: 'Butter', unit: 'tbsp', calPerUnit: 102, baseQty: 1 },
    ]},
    { label: 'DAILY SNACK', share: SHARES.snack, items: [
      { name: 'Macadamia Nuts', unit: 'oz', calPerUnit: 204, baseQty: 1 },
      { name: 'Hard Cheese', unit: 'oz', calPerUnit: 113, baseQty: 1 },
    ]},
  ],

  lowcarb: [
    { label: 'MEAL 1 — MORNING', share: SHARES.meal1, items: [
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 3 },
      { name: 'Sausage', unit: 'oz', calPerUnit: 92, baseQty: 4 },
    ]},
    { label: 'MEAL 2 — MIDDAY', share: SHARES.meal2, items: [
      { name: 'Pork Chops (bone-in)', unit: 'oz', calPerUnit: 68, baseQty: 8 },
    ]},
    { label: 'MEAL 3 — AFTERNOON', share: SHARES.meal3, items: [
      { name: 'Turkey Burger', unit: 'oz', calPerUnit: 57, baseQty: 5 },
      { name: 'Avocado', unit: 'oz', calPerUnit: 45, baseQty: 2 },
    ]},
    { label: 'MEAL 4 — EVENING', share: SHARES.meal4, items: [
      { name: 'Chicken Thighs', unit: 'oz', calPerUnit: 59, baseQty: 6 },
      { name: 'Olive Oil', unit: 'tbsp', calPerUnit: 119, baseQty: 1 },
    ]},
    { label: 'DAILY SNACK', share: SHARES.snack, items: [
      { name: 'Almonds', unit: 'oz', calPerUnit: 164, baseQty: 1 },
      { name: 'String Cheese', unit: 'oz', calPerUnit: 85, baseQty: 1 },
    ]},
  ],

  pescatarian: [
    { label: 'MEAL 1 — MORNING', share: SHARES.meal1, items: [
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 3 },
      { name: 'Smoked Salmon', unit: 'oz', calPerUnit: 33, baseQty: 4 },
    ]},
    { label: 'MEAL 2 — MIDDAY', share: SHARES.meal2, items: [
      { name: 'Wild Salmon Fillet', unit: 'oz', calPerUnit: 58, baseQty: 8 },
    ]},
    { label: 'MEAL 3 — AFTERNOON', share: SHARES.meal3, items: [
      { name: 'Grilled Shrimp', unit: 'oz', calPerUnit: 28, baseQty: 5 },
      { name: 'Garlic Butter', unit: 'tbsp', calPerUnit: 102, baseQty: 1 },
    ]},
    { label: 'MEAL 4 — EVENING', share: SHARES.meal4, items: [
      { name: 'Seared Tuna Steak', unit: 'oz', calPerUnit: 46, baseQty: 6 },
      { name: 'Lemon Butter', unit: 'tbsp', calPerUnit: 102, baseQty: 1 },
    ]},
    { label: 'DAILY SNACK', share: SHARES.snack, items: [
      { name: 'Sardines', unit: 'oz', calPerUnit: 59, baseQty: 2 },
      { name: 'Cream Cheese', unit: 'tbsp', calPerUnit: 51, baseQty: 1 },
    ]},
  ],
};

export const getDietSampleDay = (diet) => dietSampleDays[diet] || dietSampleDays.carnivore;
