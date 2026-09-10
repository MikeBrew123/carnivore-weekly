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
const STEP = { egg: 1, strip: 1, oz: 0.5, lb: 0.1, tbsp: 0.5, tsp: 0.5, cup: 0.5 };

/** Never print a portion smaller than this — "0 eggs" is not a meal. */
const MIN_QTY = { egg: 1, strip: 1, oz: 0.5, lb: 0.1, tbsp: 0.5, tsp: 0.5, cup: 0.5 };

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

/** Every non-empty subset of items, order preserved, largest first. */
function subsets(items) {
  const out = [];
  for (let mask = (1 << items.length) - 1; mask >= 1; mask--) {
    const pick = items.filter((_, i) => mask & (1 << i));
    if (pick.length) out.push(pick);
  }
  return out.sort((a, b) => b.length - a.length);
}

function renderItems(items, slotCalories) {
  const base = items.reduce((sum, i) => sum + i.baseQty * i.calPerUnit, 0);
  const k = base > 0 ? slotCalories / base : 0;
  return items.map((i) => {
    const qty = roundToStep(i.baseQty * k, i.unit);
    return { name: i.name, qty, unit: i.unit, calPerUnit: i.calPerUnit, text: formatQty(qty, i.unit, i.name) };
  });
}

/**
 * Build one meal at a calorie allocation.
 *
 * Scaling every ingredient together and flooring each at a servable portion
 * overshoots badly at small targets: an 80-calorie snack allocation floors an
 * ounce of jerky AND an ounce of cheese into a 229-calorie "snack". So instead
 * of scaling one fixed ingredient list, try every subset of the ingredients and
 * keep whichever lands closest to the allocation. With two or three ingredients
 * that is at most seven candidates, and the choice is deterministic.
 *
 * Near-ties prefer the subset containing the FIRST ingredient, which each diet
 * lists as its anchor food. Without that rule a carnivore snack at 1,250
 * calories drops the beef jerky and serves cheese alone, purely because cheese
 * happens to be 3 calories closer.
 */
export function buildMeal(spec, slotCalories) {
  const candidates = subsets(spec.items).map((items) => {
    const rendered = renderItems(items, slotCalories);
    const calories = Math.round(rendered.reduce((s, i) => s + i.qty * i.calPerUnit, 0));
    return {
      items: rendered,
      calories,
      diff: Math.abs(calories - slotCalories),
      hasAnchor: items[0] === spec.items[0],
    };
  });

  // The whole ingredient list is the default. Dropping an ingredient is a last
  // resort for when the full meal cannot fit the allocation at all — otherwise
  // "closest fit" quietly serves 6 Eggs as a carnivore breakfast because the
  // ground beef happened to round badly. Only trim once the full meal is more
  // than a third away from its allocation, which in practice means small
  // snack allocations where every ingredient has already hit its floor.
  // The anchor is the diet's defining food and is never dropped: a carnivore
  // snack that trims the beef jerky and serves cheese alone is worse than a
  // small snack. Trimming is limited to the supporting ingredients, and only
  // when the full list cannot fit the allocation at all.
  const withAnchor = candidates.filter((c) => c.hasAnchor);
  const full = withAnchor.find((c) => c.items.length === spec.items.length);
  const chosen = full && full.diff <= slotCalories * 0.33
    ? full
    : withAnchor
        .slice()
        .sort((a, b) => a.diff - b.diff || b.items.length - a.items.length)[0];

  return {
    label: spec.label,
    items: chosen.items,
    calories: chosen.calories,
    description: chosen.items.map((i) => i.text).join(' + '),
  };
}

/**
 * Build the whole day.
 *
 * Rounding each meal to servable portions leaves the day a little off the
 * target, so the allocations are rescaled and the meals rebuilt a few times
 * until the day converges. The correction is spread across every meal in
 * proportion to its share.
 *
 * The previous version instead charged the entire surplus to one "anchor"
 * ingredient, which produced a 1 oz ribeye as a midday meal at a 1,300-calorie
 * target — and non-monotonically, since 1,250 and 1,350 both gave 2 oz. Never
 * let one meal absorb the whole day's rounding error.
 */
export function buildSampleDay(specs, target) {
  let alloc = specs.map((spec) => target * spec.share);
  let meals = specs.map((spec, i) => buildMeal(spec, alloc[i]));

  // Close the residual left by whole-ounce rounding by nudging ONE meal at a
  // time, always the nudge that most reduces the gap, and never letting a meal
  // stray far from its share of the day.
  //
  // Rescaling every allocation together does not work here: at small targets
  // all five meals cross their rounding boundaries at once, so the day
  // oscillates (850 kcal flipped between 1010 and 705 and never approached the
  // target). Charging the whole residual to a single "anchor" ingredient does
  // not work either — that is what produced a 1 oz ribeye as a midday meal.
  // Spread it, one bounded step at a time.
  const totalOf = (ms) => ms.reduce((sum, m) => sum + m.calories, 0);
  const shareCal = specs.map((spec) => target * spec.share);
  const tolerance = Math.max(target * 0.02, 25);

  for (let iter = 0; iter < 40; iter++) {
    const total = totalOf(meals);
    if (Math.abs(total - target) <= tolerance) break;

    let pick = null;
    let pickDiff = Math.abs(total - target);

    for (let i = 0; i < specs.length; i++) {
      for (const dir of [1, -1]) {
        const trial = alloc[i] + dir * Math.max(shareCal[i] * 0.12, 30);
        // A meal may flex around its share, but never become a token portion
        // or swallow the day.
        if (trial < shareCal[i] * 0.55 || trial > shareCal[i] * 1.6) continue;
        const candidate = buildMeal(specs[i], trial);
        const diff = Math.abs(total - meals[i].calories + candidate.calories - target);
        if (diff < pickDiff) {
          pickDiff = diff;
          pick = { i, trial, candidate };
        }
      }
    }

    if (!pick) break;
    alloc[pick.i] = pick.trial;
    meals[pick.i] = pick.candidate;
  }

  return { meals, total: totalOf(meals), target };
}

const SHARES = { meal1: 0.25, meal2: 0.25, meal3: 0.19, meal4: 0.22, snack: 0.09 };

/**
 * Per-diet sample-day shapes. Quantities are a REFERENCE SHAPE only — the
 * builder scales them to the user's actual target. Shares sum to 1.
 * calPerUnit are ordinary cooked-portion figures.
 */
export const dietSampleDays = {
  carnivore: [
    { label: 'MEAL 1 · MORNING', share: SHARES.meal1, items: [
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 4 },
      { name: 'Ground Beef (80/20)', unit: 'oz', calPerUnit: 77, baseQty: 6 },
    ]},
    { label: 'MEAL 2 · MIDDAY', share: SHARES.meal2, items: [
      { name: 'Ribeye Steak', unit: 'oz', calPerUnit: 82, baseQty: 9 },
    ]},
    { label: 'MEAL 3 · AFTERNOON', share: SHARES.meal3, items: [
      { name: 'NY Strip', unit: 'oz', calPerUnit: 74, baseQty: 5 },
      { name: 'Butter', unit: 'tbsp', calPerUnit: 102, baseQty: 1 },
    ]},
    { label: 'MEAL 4 · EVENING', share: SHARES.meal4, items: [
      { name: 'Ground Beef Patties', unit: 'oz', calPerUnit: 77, baseQty: 6 },
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 2 },
    ]},
    { label: 'DAILY SNACK', share: SHARES.snack, items: [
      { name: 'Beef Jerky', unit: 'oz', calPerUnit: 116, baseQty: 1 },
      { name: 'Hard Cheese', unit: 'oz', calPerUnit: 113, baseQty: 1 },
    ]},
  ],

  keto: [
    { label: 'MEAL 1 · MORNING', share: SHARES.meal1, items: [
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 3 },
      { name: 'Cheddar', unit: 'oz', calPerUnit: 113, baseQty: 2 },
      { name: 'Avocado', unit: 'oz', calPerUnit: 45, baseQty: 3 },
    ]},
    { label: 'MEAL 2 · MIDDAY', share: SHARES.meal2, items: [
      { name: 'Chicken Thighs (skin-on)', unit: 'oz', calPerUnit: 59, baseQty: 8 },
    ]},
    { label: 'MEAL 3 · AFTERNOON', share: SHARES.meal3, items: [
      { name: 'Grilled Chicken Thigh', unit: 'oz', calPerUnit: 59, baseQty: 5 },
      { name: 'Olive Oil', unit: 'tbsp', calPerUnit: 119, baseQty: 1 },
    ]},
    { label: 'MEAL 4 · EVENING', share: SHARES.meal4, items: [
      { name: 'Salmon Fillet', unit: 'oz', calPerUnit: 58, baseQty: 6 },
      { name: 'Butter', unit: 'tbsp', calPerUnit: 102, baseQty: 1 },
    ]},
    { label: 'DAILY SNACK', share: SHARES.snack, items: [
      { name: 'Macadamia Nuts', unit: 'oz', calPerUnit: 204, baseQty: 0.5 },
      { name: 'Hard Cheese', unit: 'oz', calPerUnit: 113, baseQty: 1 },
    ]},
  ],

  lowcarb: [
    { label: 'MEAL 1 · MORNING', share: SHARES.meal1, items: [
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 3 },
      { name: 'Sausage', unit: 'oz', calPerUnit: 92, baseQty: 4 },
    ]},
    { label: 'MEAL 2 · MIDDAY', share: SHARES.meal2, items: [
      { name: 'Pork Chops (bone-in)', unit: 'oz', calPerUnit: 68, baseQty: 8 },
    ]},
    { label: 'MEAL 3 · AFTERNOON', share: SHARES.meal3, items: [
      { name: 'Turkey Burger', unit: 'oz', calPerUnit: 57, baseQty: 5 },
      { name: 'Avocado', unit: 'oz', calPerUnit: 45, baseQty: 2 },
    ]},
    { label: 'MEAL 4 · EVENING', share: SHARES.meal4, items: [
      { name: 'Chicken Thighs', unit: 'oz', calPerUnit: 59, baseQty: 6 },
      { name: 'Olive Oil', unit: 'tbsp', calPerUnit: 119, baseQty: 1 },
    ]},
    { label: 'DAILY SNACK', share: SHARES.snack, items: [
      { name: 'Almonds', unit: 'oz', calPerUnit: 164, baseQty: 0.5 },
      { name: 'String Cheese', unit: 'oz', calPerUnit: 85, baseQty: 1 },
    ]},
  ],

  pescatarian: [
    { label: 'MEAL 1 · MORNING', share: SHARES.meal1, items: [
      { name: 'Eggs', unit: 'egg', calPerUnit: 72, baseQty: 3 },
      { name: 'Smoked Salmon', unit: 'oz', calPerUnit: 33, baseQty: 4 },
    ]},
    { label: 'MEAL 2 · MIDDAY', share: SHARES.meal2, items: [
      { name: 'Wild Salmon Fillet', unit: 'oz', calPerUnit: 58, baseQty: 8 },
    ]},
    { label: 'MEAL 3 · AFTERNOON', share: SHARES.meal3, items: [
      { name: 'Grilled Shrimp', unit: 'oz', calPerUnit: 28, baseQty: 5 },
      { name: 'Garlic Butter', unit: 'tbsp', calPerUnit: 102, baseQty: 1 },
    ]},
    { label: 'MEAL 4 · EVENING', share: SHARES.meal4, items: [
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
