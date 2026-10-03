// PescoDial: Pescatarian Mediterranean 7-day meal plan (Brew, 2026-10-03).
//
// The CW meal generator is protein-anchored with butter as the calorie top-up,
// which is right for carnivore and keto and wrong for a Mediterranean plate
// (olive oil, legumes, grains, fruit). This builds the Pescatarian Mediterranean
// week from named dishes, modelled on the design Brew approved, scales each day
// to the reader's calorie target, uses olive oil to land fat near target, then
// rounds every quantity to a kitchen measure.
//
// Same rules the CW plan lives by:
//  - the ROUNDED quantity is authoritative: day totals are recomputed from it and
//    the grocery list aggregates the same item objects, so the calendar and the
//    shopping list cannot disagree (ISSUE: 2026-09-07 report-integrity);
//  - a missing calorie target stops the build; nothing defaults to 2,000 kcal;
//  - excluded foods (allergies, avoid list, medical exclusions) remove whole
//    dishes in favour of an alternative; they never swap in a "safer" amount.
//
// Nutrition values come from USDA FoodData Central (SR Legacy) via
// api/pd-foods.js, each carrying its fdcId.

import { PD_FOODS } from './pd-foods.js';

export const PD_PLAN_DAYS = 7;
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Base portions are for a ~1,700 kcal day before scaling.
// role: 'scale' items scale with the day; 'veg' items scale gently (never below base);
// olive oil is added by the balancer, not listed here unless it is part of the dish.
const DISHES = {
  breakfast: [
    { id: 'yogurt-bowl', name: 'Greek yogurt bowl', items: [['greek_yogurt', 1], ['blueberries', 0.5], ['walnuts', 2]] },
    { id: 'spinach-eggs', name: 'Spinach scrambled eggs', items: [['eggs', 2], ['spinach', 1, 'veg'], ['wholegrain_bread', 1]] },
    { id: 'overnight-oats', name: 'Overnight oats', items: [['oats', 0.5], ['chia', 1], ['milk', 0.5], ['blueberries', 0.5]] },
    { id: 'avocado-toast', name: 'Avocado toast with egg', items: [['wholegrain_bread', 1], ['avocado', 0.25], ['eggs', 1]] },
    { id: 'veg-omelet', name: 'Vegetable omelet', items: [['eggs', 2], ['bell_pepper', 0.5, 'veg'], ['feta', 1]] },
  ],
  lunch: [
    { id: 'lentil-feta-salad', name: 'Lentil and feta salad', items: [['lentils', 1], ['greens', 2, 'veg'], ['feta', 1], ['tomatoes', 0.5, 'veg']] },
    { id: 'sardine-bean-toast', name: 'Sardine and white bean toast', fish: true, items: [['sardines', 1], ['white_beans', 0.5], ['wholegrain_bread', 1], ['lemon', 0.5]] },
    { id: 'greek-salad-eggs', name: 'Greek salad with eggs', items: [['eggs', 2], ['cucumber', 1, 'veg'], ['tomatoes', 1, 'veg'], ['feta', 1], ['olives', 6]] },
    { id: 'tuna-chickpea-salad', name: 'Tuna and chickpea salad', fish: true, items: [['tuna', 0.5], ['chickpeas', 0.5], ['greens', 2, 'veg'], ['cucumber', 0.5, 'veg']] },
    { id: 'mezze-plate', name: 'Mezze plate', items: [['hummus', 4], ['olives', 6], ['cucumber', 1, 'veg'], ['pita', 0.5], ['carrots', 0.5, 'veg']] },
  ],
  dinner: [
    { id: 'sheet-pan-salmon', name: 'Sheet-pan salmon', fish: true, items: [['salmon', 5], ['green_beans', 1.5, 'veg'], ['potatoes', 0.5]] },
    { id: 'shrimp-chickpea-skillet', name: 'Shrimp and chickpea skillet', fish: true, shellfish: true, items: [['shrimp', 5], ['chickpeas', 0.5], ['bell_pepper', 1, 'veg']] },
    { id: 'cod-tomato-olive', name: 'Baked cod with tomatoes and olives', fish: true, items: [['cod', 6], ['tomatoes', 1, 'veg'], ['olives', 6], ['bulgur', 0.5]] },
    { id: 'salmon-grain-bowl', name: 'Salmon grain bowl', fish: true, items: [['salmon', 5], ['quinoa', 0.5], ['cucumber', 1, 'veg'], ['greek_yogurt', 0.125]] },
    { id: 'trout-lemon-broccoli', name: 'Lemon trout with broccoli', fish: true, items: [['trout', 5], ['broccoli', 1.5, 'veg'], ['potatoes', 0.5], ['lemon', 0.5]] },
    { id: 'shakshuka', name: 'Shakshuka', items: [['eggs', 2], ['tomato_sauce', 1], ['wholegrain_bread', 1]] },
    { id: 'bean-pasta-spinach', name: 'White bean pasta with spinach', items: [['ww_pasta', 1], ['white_beans', 0.5], ['spinach', 2, 'veg'], ['parmesan', 1]] },
  ],
  snack: [
    { id: 'apple-almond-butter', name: 'Apple and almond butter', items: [['apple', 1], ['almond_butter', 1]] },
    { id: 'hummus-carrots', name: 'Hummus and carrots', items: [['hummus', 4], ['carrots', 1, 'veg']] },
    { id: 'almonds', name: 'Almonds', items: [['almonds', 3]] },
    { id: 'orange-cheese', name: 'Orange and string cheese', items: [['orange', 1], ['string_cheese', 1]] },
    { id: 'pear-walnuts', name: 'Pear and walnuts', items: [['pear', 1], ['walnuts', 2]] },
    { id: 'yogurt-cinnamon', name: 'Greek yogurt with cinnamon', items: [['greek_yogurt', 0.75]] },
  ],
};

// The week, Mon..Sun: [breakfast, lunch, dinner, snack] dish ids. Five fish meals
// (Brew, 2026-10-03: 4-5 a week, lowest-mercury species only, varied kinds).
const WEEK = [
  ['yogurt-bowl', 'lentil-feta-salad', 'sheet-pan-salmon', 'apple-almond-butter'],
  ['spinach-eggs', 'sardine-bean-toast', 'bean-pasta-spinach', 'hummus-carrots'],
  ['overnight-oats', 'mezze-plate', 'shrimp-chickpea-skillet', 'almonds'],
  ['yogurt-bowl', 'greek-salad-eggs', 'cod-tomato-olive', 'orange-cheese'],
  ['avocado-toast', 'lentil-feta-salad', 'salmon-grain-bowl', 'pear-walnuts'],
  ['veg-omelet', 'mezze-plate', 'shakshuka', 'yogurt-cinnamon'],
  ['overnight-oats', 'greek-salad-eggs', 'bean-pasta-spinach', 'almonds'],
];
export const PD_FISH_MEALS_PER_WEEK = 5;
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
// Foods sized to the protein target (everything else fills remaining calories).
const PROTEIN_KEYS = ['salmon', 'cod', 'shrimp', 'trout', 'tilapia', 'tuna', 'sardines', 'eggs', 'greek_yogurt', 'feta', 'string_cheese'];
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Kitchen rounding steps per display unit. Count units round to whole numbers
// except avocado/lemon/can/pita, which allow halves and quarters as listed.
const ROUND_STEP = { oz: 0.5, cup: 0.25, tbsp: 0.5, each: 1, slice: 1, stick: 1, can: 0.5 };
const FRACTIONAL_EACH = { avocado: 0.25, lemon: 0.5, pita: 0.5 };

function food(key) {
  const f = PD_FOODS[key];
  if (!f) throw new Error(`pd-meal-plan: unknown food "${key}"`);
  return f;
}

function roundQty(key, qty) {
  const f = food(key);
  const step = FRACTIONAL_EACH[key] || ROUND_STEP[f.unit] || 0.25;
  return Math.max(step, Math.round(qty / step) * step);
}

function itemNutrition(key, qty) {
  const f = food(key);
  const g = qty * f.gramsPerUnit;
  const p = f.per100g;
  return {
    grams: g,
    kcal: (p.kcal || 0) * g / 100,
    protein: (p.protein || 0) * g / 100,
    fat: (p.fat || 0) * g / 100,
    carbs: (p.carbs || 0) * g / 100,
    fiber: (p.fiber || 0) * g / 100,
  };
}

function sumNutrition(items) {
  const t = { kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 };
  for (const it of items) {
    const n = itemNutrition(it.food, it.qty);
    for (const k of Object.keys(t)) t[k] += n[k];
  }
  return t;
}

function dishExcluded(dish, isExcluded) {
  if (dish.items.some(([key]) => isExcluded(key, food(key)))) return true;
  if (dish.shellfish && isExcluded('shellfish', { usda: 'shellfish shrimp crustacean' })) return true;
  return false;
}

function pickDish(slot, wantedId, isExcluded, used) {
  const pool = DISHES[slot];
  const wanted = pool.find(d => d.id === wantedId);
  if (wanted && !dishExcluded(wanted, isExcluded)) return wanted;
  // Alternative in the same slot: prefer a fish dish when the wanted one was fish,
  // and one not already used this week.
  const ok = pool.filter(d => !dishExcluded(d, isExcluded));
  const sameKind = ok.filter(d => !!d.fish === !!(wanted && wanted.fish));
  const fresh = (sameKind.length ? sameKind : ok).filter(d => !used.has(d.id));
  return fresh[0] || sameKind[0] || ok[0] || null;
}

/**
 * Build the 7-day Pescatarian Mediterranean plan.
 * @param {{calories:number, protein_grams:number, fat_grams:number, carbs_grams:number}} macros
 *        the macro set this reader may be fed from (already through applyCalorieGuidance)
 * @param {(key:string, food:object) => boolean} isExcluded  true when a food must not appear
 */
export function buildPescoMedWeek(macros, isExcluded = () => false) {
  const cal = Number(macros && macros.calories);
  const proteinTarget = Number(macros && macros.protein_grams);
  const fatTarget = Number(macros && macros.fat_grams);
  if (!Number.isFinite(cal) || !Number.isFinite(proteinTarget) || !Number.isFinite(fatTarget) || cal <= 0) {
    throw new Error('buildPescoMedWeek: refusing to size a meal plan without a usable calorie, protein and fat target.');
  }
  const oil = food('olive_oil');
  const oilKcalPerTbsp = oil.per100g.kcal * oil.gramsPerUnit / 100;
  const oilFatPerTbsp = oil.per100g.fat * oil.gramsPerUnit / 100;

  const used = new Set();
  const days = [];
  const warnings = [];
  for (let d = 0; d < PD_PLAN_DAYS; d++) {
    const dishes = SLOTS.map((slot, i) => {
      const dish = pickDish(slot, WEEK[d][i], isExcluded, used);
      if (dish) used.add(dish.id);
      return { slot, dish };
    });
    if (dishes.some(x => !x.dish)) {
      return { days: [], warnings: ['Your food restrictions rule out every option for at least one meal. Please review your selections.'] };
    }
    // Only warn when a restriction removed a planned fish meal, not on the
    // days the week deliberately has none.
    dishes.forEach(({ slot, dish }, i) => {
      const planned = DISHES[slot].find(x => x.id === WEEK[d][i]);
      if (planned && planned.fish && !dish.fish) {
        warnings.push(`${DAY_NAMES[d]} ${slot}: a planned fish meal was swapped because of your food restrictions.`);
      }
    });

    const base = [];
    dishes.forEach(({ slot, dish }) => dish.items.forEach(([key, qty, role]) =>
      base.push({ slot, food: key, qty, role: role || (PROTEIN_KEYS.includes(key) ? 'protein' : 'scale') })));

    // Two scales per day: protein foods are sized to the protein target, the
    // rest of the plate fills the remaining calories, and olive oil (0-3 tbsp)
    // is chosen to land fat as close to target as the dishes allow. Vegetables
    // never shrink below their base portion. Uniform scaling overshot protein by
    // up to 85% on high-calorie targets, which this replaces.
    const group = role => base.filter(it => it.role === role);
    const nP = sumNutrition(group('protein'));
    const nS = sumNutrition(group('scale'));
    const nV = sumNutrition(group('veg'));
    let best = null;
    for (let o = 0; o <= 3; o += 0.5) {
      let sP = 1, sS = 1;
      for (let iter = 0; iter < 4; iter++) {
        sP = clamp((proteinTarget - nS.protein * sS - nV.protein) / Math.max(nP.protein, 1), 0.5, 2);
        sS = clamp((cal - nP.kcal * sP - nV.kcal - o * oilKcalPerTbsp) / Math.max(nS.kcal, 1), 0.4, 2.5);
      }
      const kcal = nP.kcal * sP + nS.kcal * sS + nV.kcal + o * oilKcalPerTbsp;
      const fat = nP.fat * sP + nS.fat * sS + nV.fat + o * oilFatPerTbsp;
      const err = Math.abs(fat - fatTarget) + Math.abs(kcal - cal) / 9;
      if (!best || err < best.err) best = { o, sP, sS, err };
    }

    const items = base.map(it => ({
      ...it,
      qty: roundQty(it.food, it.role === 'veg' ? it.qty : it.qty * (it.role === 'protein' ? best.sP : best.sS)),
    }));
    if (best.o > 0) {
      // Cooking oil goes to lunch and dinner.
      const lunchOil = roundQty('olive_oil', best.o / 2);
      const dinnerOil = best.o - lunchOil;
      items.push({ slot: 'lunch', food: 'olive_oil', qty: lunchOil, role: 'oil' });
      if (dinnerOil > 0) items.push({ slot: 'dinner', food: 'olive_oil', qty: roundQty('olive_oil', dinnerOil), role: 'oil' });
    }

    // Calorie floor/ceiling after rounding. Some days' dishes have little to
    // scale besides protein; close a shortfall with plain sides (whole-grain
    // bread with lunch, almonds with the snack, an extra half cup of the day's
    // grain or beans at dinner), and trim the snack if a day runs long.
    const FILLERS = [
      { slot: 'lunch', food: 'wholegrain_bread', step: 1, max: 2 },
      { slot: 'dinner', food: 'wholegrain_bread', step: 1, max: 2 },
      { slot: 'snack', food: 'almonds', step: 1, max: 4 },
    ];
    for (let guard = 0; guard < 16 && sumNutrition(items).kcal < 0.94 * cal; guard++) {
      const f = FILLERS.find(f => !isExcluded(f.food, food(f.food)) &&
        items.filter(it => it.slot === f.slot && it.food === f.food && it.role === 'filler').reduce((a, it) => a + it.qty, 0) < f.max);
      if (!f) break;
      const cur = items.find(it => it.slot === f.slot && it.food === f.food && it.role === 'filler');
      if (cur) cur.qty += f.step; else items.push({ slot: f.slot, food: f.food, qty: f.step, role: 'filler' });
    }
    for (let guard = 0; guard < 8 && sumNutrition(items).kcal > 1.06 * cal; guard++) {
      const t = items.filter(it => it.role === 'scale' && it.qty > (FRACTIONAL_EACH[it.food] || ROUND_STEP[food(it.food).unit] || 0.25))
        .sort((x, y) => itemNutrition(y.food, y.qty).kcal - itemNutrition(x.food, x.qty).kcal)[0];
      if (!t) break;
      t.qty = roundQty(t.food, t.qty - (FRACTIONAL_EACH[t.food] || ROUND_STEP[food(t.food).unit] || 0.25));
    }

    // Protein floor after rounding: never under 90% of target.
    for (let guard = 0; guard < 12 && sumNutrition(items).protein < 0.9 * proteinTarget; guard++) {
      const target = items.find(it => it.slot === 'dinner' && it.role === 'protein')
        || items.find(it => it.role === 'protein');
      if (!target) break;
      target.qty = roundQty(target.food, target.qty + (FRACTIONAL_EACH[target.food] || ROUND_STEP[food(target.food).unit] || 1));
    }
    // Raising protein can push a day back over the ceiling (a fish-free day whose
    // protein lives in eggs and cheese). Trim the least protein-dense non-protein
    // foods first, and only while protein stays at or above the floor.
    for (let guard = 0; guard < 16 && sumNutrition(items).kcal > 1.06 * cal; guard++) {
      const cands = items.filter(it => (it.role === 'scale' || it.role === 'filler' || it.role === 'oil') &&
        it.qty > (FRACTIONAL_EACH[it.food] || ROUND_STEP[food(it.food).unit] || 0.25))
        .map(it => {
          const step = FRACTIONAL_EACH[it.food] || ROUND_STEP[food(it.food).unit] || 0.25;
          const n = itemNutrition(it.food, step);
          return { it, step, density: n.protein / Math.max(n.kcal, 1) };
        })
        .sort((x, y) => x.density - y.density);
      const totalsNow = sumNutrition(items);
      const pick = cands.find(c => totalsNow.protein - itemNutrition(c.it.food, c.step).protein >= 0.9 * proteinTarget);
      if (!pick) break;
      pick.it.qty = roundQty(pick.it.food, pick.it.qty - pick.step);
    }

    const totals = sumNutrition(items);
    days.push({
      day: DAY_NAMES[d],
      meals: dishes.map(({ slot, dish }) => ({
        slot, name: dish.name, fish: !!dish.fish,
        items: items.filter(it => it.slot === slot).map(it => ({
          food: it.food, name: displayName(it.food), qty: it.qty, unit: food(it.food).unit,
          grams: Math.round(it.qty * food(it.food).gramsPerUnit), section: food(it.food).section,
        })),
      })),
      totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v)])),
    });
  }
  // A pescatarian plan with no fish in it is not the plan this reader paid for.
  // When restrictions rule out every fish dish, refuse rather than ship a
  // fish-free week under a pescatarian name.
  const fishMeals = days.flatMap(d => d.meals).filter(m => m.fish).length;
  if (fishMeals === 0) {
    return { days: [], warnings: ['Your food restrictions rule out every fish meal, so we cannot build a pescatarian week for you. Please review your selections or contact us.'] };
  }
  return { days, warnings };
}

const DISPLAY_NAMES = {
  salmon: 'salmon', cod: 'cod', shrimp: 'shrimp', sardines: 'sardines in olive oil', tuna: 'canned light tuna',
  trout: 'trout', tilapia: 'tilapia', eggs: 'eggs', greek_yogurt: 'plain Greek yogurt', milk: 'milk',
  feta: 'feta', parmesan: 'parmesan', string_cheese: 'string cheese', blueberries: 'berries', apple: 'apple',
  orange: 'orange', pear: 'pear', dates: 'dates', walnuts: 'walnuts', almonds: 'almonds',
  almond_butter: 'almond butter', chia: 'chia seeds', oats: 'oats', wholegrain_bread: 'whole-grain bread',
  pita: 'whole-wheat pita', quinoa: 'cooked quinoa', bulgur: 'cooked bulgur', ww_pasta: 'cooked whole-wheat pasta',
  potatoes: 'potatoes', lentils: 'cooked lentils', chickpeas: 'chickpeas', white_beans: 'white beans',
  hummus: 'hummus', spinach: 'spinach', greens: 'salad greens', green_beans: 'green beans',
  tomatoes: 'tomatoes', bell_pepper: 'bell pepper', cucumber: 'cucumber', carrots: 'carrots',
  broccoli: 'broccoli', zucchini: 'zucchini', olive_oil: 'olive oil', olives: 'olives', avocado: 'avocado',
  tomato_sauce: 'tomato sauce', lemon: 'lemon',
};
export function displayName(key) { return DISPLAY_NAMES[key] || key.replace(/_/g, ' '); }

const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.125: '⅛' };
/** "1½ cups", "5 oz", "2 eggs", "¼ avocado". */
export function formatQty(qty, unit, name) {
  const whole = Math.floor(qty);
  const frac = Math.round((qty - whole) * 1000) / 1000;
  const num = (whole ? String(whole) : '') + (FRACTIONS[frac] || (frac ? String(frac).replace(/^0/, '') : ''));
  const shown = num || '0';
  if (unit === 'each') return `${shown} ${name}`;
  const plural = qty > 1 && !['oz'].includes(unit) ? (unit === 'each' ? '' : unit === 'tbsp' ? '' : 's') : '';
  return `${shown} ${unit}${plural} ${name}`;
}

/** Grocery list for the week, grouped by store section, from the plan's own items. */
export function groceryFromWeek(week) {
  if (!week || !Array.isArray(week.days) || week.days.length === 0) {
    throw new Error('groceryFromWeek: needs the generated week; it never builds a list on its own.');
  }
  const byFood = new Map();
  for (const day of week.days) for (const meal of day.meals) for (const it of meal.items) {
    const cur = byFood.get(it.food) || { food: it.food, name: it.name, unit: it.unit, qty: 0, grams: 0, section: it.section };
    cur.qty += it.qty;
    cur.grams += it.grams;
    byFood.set(it.food, cur);
  }
  const sections = {};
  for (const it of byFood.values()) (sections[it.section] = sections[it.section] || []).push(it);
  for (const list of Object.values(sections)) list.sort((a, b) => a.name.localeCompare(b.name));
  return sections;
}
