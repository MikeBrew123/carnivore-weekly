// PescoDial: the 7-day meal plan for all four PescoDial eating styles
// (Pescatarian Mediterranean, Low Carb, Keto, Carnivore; Brew, 2026-10-03).
//
// The CW meal generator is protein-anchored with butter as the calorie top-up,
// which is right for carnivore and keto and wrong for a Mediterranean plate
// (olive oil, legumes, grains, fruit). This builds each style's week from named
// dishes, modelled on the design Brew approved, scales each day to the reader's
// calorie target, uses the style's cooking fat (olive oil, or butter for Keto and
// Carnivore) to land fat near target, holds the low-carb styles under their carb
// ceiling, then rounds every quantity to a kitchen measure.
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


// ---------------------------------------------------------------------------
// Dishes, per eating style
// ---------------------------------------------------------------------------
// Base portions are for a ~1,700 kcal day before scaling.
// role: 'scale' items scale with the day; 'veg' items scale gently (never below base);
// the style's cooking fat is added by the balancer, not listed here unless the dish
// is named for it ("garlic butter", "parmesan butter").
// Styles with a carb group (Low Carb) also mark berries and legumes 'carb' through
// STYLE.carbKeys, so the balancer can size them to the reader's carb target.
// fish: a fish meal (counts toward the five a week); shellfish: removed by a
// shellfish allergy even when the food name alone would not say so.
const MED_DISHES = {
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
const MED_WEEK = [
  ['yogurt-bowl', 'lentil-feta-salad', 'sheet-pan-salmon', 'apple-almond-butter'],
  ['spinach-eggs', 'sardine-bean-toast', 'bean-pasta-spinach', 'hummus-carrots'],
  ['overnight-oats', 'mezze-plate', 'shrimp-chickpea-skillet', 'almonds'],
  ['yogurt-bowl', 'greek-salad-eggs', 'cod-tomato-olive', 'orange-cheese'],
  ['avocado-toast', 'lentil-feta-salad', 'salmon-grain-bowl', 'pear-walnuts'],
  ['veg-omelet', 'mezze-plate', 'shakshuka', 'yogurt-cinnamon'],
  ['overnight-oats', 'greek-salad-eggs', 'bean-pasta-spinach', 'almonds'],
];

// Pescatarian Low Carb: no bread, pasta, grains, potatoes, beans or sugar (Sarah's
// plate guide for this style leaves beans out too). Carbs come from vegetables, a
// small portion of berries, Greek yogurt and nuts. Recipes:
// pescodial/drafts/report/recipes-pesco-lowcarb.md (dish ids match).
const LOWCARB_DISHES = {
  breakfast: [
    { id: 'lc-frittata', name: 'Spinach, pepper and feta frittata', items: [['eggs', 3], ['spinach', 1, 'veg'], ['bell_pepper', 0.25, 'veg'], ['feta', 1]] },
    { id: 'lc-yogurt-bowl', name: 'Greek yogurt with berries and walnuts', items: [['greek_yogurt', 1], ['blueberries', 0.5], ['walnuts', 2]] },
    { id: 'lc-eggs-avocado', name: 'Eggs with avocado and strawberries', items: [['eggs', 2], ['avocado', 0.25], ['strawberries', 0.5]] },
    { id: 'lc-chia-yogurt', name: 'Chia and yogurt pudding with raspberries', items: [['greek_yogurt', 1], ['chia', 1], ['raspberries', 0.5]] },
  ],
  lunch: [
    { id: 'lc-sardine-greek', name: 'Sardine Greek salad', fish: true, items: [['sardines', 1.5], ['greens', 2, 'veg'], ['cucumber', 1, 'veg'], ['tomatoes', 0.5, 'veg'], ['olives', 6], ['feta', 1]] },
    { id: 'lc-salmon-wraps', name: 'Salmon lettuce wraps with crunchy slaw', fish: true, items: [['salmon', 5], ['cabbage', 1, 'veg'], ['greens', 1, 'veg'], ['greek_yogurt', 0.125], ['avocado', 0.25]] },
    { id: 'lc-greek-salad', name: 'Greek salad with feta and yogurt dressing', items: [['feta', 1.5], ['greek_yogurt', 0.5], ['greens', 2, 'veg'], ['cucumber', 1, 'veg'], ['tomatoes', 1, 'veg'], ['olives', 4]] },
    { id: 'lc-tuna-salad', name: 'Tuna and olive salad', fish: true, items: [['tuna', 1], ['greens', 2, 'veg'], ['cucumber', 0.5, 'veg'], ['tomatoes', 0.5, 'veg'], ['olives', 4]] },
    { id: 'lc-egg-veg-dip', name: 'Hard-boiled eggs with vegetables and yogurt dip', items: [['eggs', 2], ['greek_yogurt', 0.5], ['cucumber', 1, 'veg'], ['carrots', 0.5, 'veg'], ['bell_pepper', 0.5, 'veg']] },
  ],
  dinner: [
    { id: 'lc-salmon-asparagus', name: 'Sheet-pan salmon with asparagus and tomatoes', fish: true, items: [['salmon', 5], ['asparagus', 1.5, 'veg'], ['tomatoes', 0.5, 'veg']] },
    { id: 'lc-shrimp-stirfry', name: 'Shrimp stir-fry with cauliflower rice', fish: true, shellfish: true, items: [['shrimp', 6], ['cauliflower', 1, 'veg'], ['broccoli', 1, 'veg'], ['bell_pepper', 0.5, 'veg']] },
    { id: 'lc-trout-cauli', name: 'Lemon-herb trout with roasted cauliflower', fish: true, items: [['trout', 5], ['cauliflower', 1.5, 'veg'], ['green_beans', 1, 'veg'], ['lemon', 0.5, 'veg']] },
    { id: 'lc-cod-tomato', name: 'Baked cod with tomatoes, olives and zucchini', fish: true, items: [['cod', 6], ['tomatoes', 1, 'veg'], ['olives', 6], ['zucchini', 1, 'veg']] },
    { id: 'lc-shakshuka', name: 'Shakshuka with spinach and feta', items: [['eggs', 3], ['tomato_sauce', 0.75], ['spinach', 1, 'veg'], ['feta', 1]] },
    { id: 'lc-mushroom-omelet', name: 'Mushroom, spinach and feta omelet', items: [['eggs', 3], ['mushrooms', 1, 'veg'], ['spinach', 1, 'veg'], ['feta', 1]] },
  ],
  snack: [
    { id: 'lc-berries-almonds', name: 'Strawberries and almonds', items: [['strawberries', 1], ['almonds', 2]] },
    { id: 'lc-veg-dip', name: 'Carrots and cucumber with yogurt dip', items: [['greek_yogurt', 0.5], ['carrots', 0.5, 'veg'], ['cucumber', 0.5, 'veg']] },
    { id: 'lc-yogurt-raspberries', name: 'Greek yogurt with raspberries', items: [['greek_yogurt', 1], ['raspberries', 0.5]] },
    { id: 'lc-cheese-berries', name: 'String cheese and blueberries', items: [['string_cheese', 2], ['blueberries', 0.5]] },
  ],
};
const LOWCARB_WEEK = [
  ['lc-frittata', 'lc-greek-salad', 'lc-salmon-asparagus', 'lc-berries-almonds'],
  ['lc-yogurt-bowl', 'lc-sardine-greek', 'lc-mushroom-omelet', 'lc-veg-dip'],
  ['lc-chia-yogurt', 'lc-egg-veg-dip', 'lc-shrimp-stirfry', 'lc-cheese-berries'],
  ['lc-frittata', 'lc-salmon-wraps', 'lc-shakshuka', 'lc-yogurt-raspberries'],
  ['lc-yogurt-bowl', 'lc-greek-salad', 'lc-trout-cauli', 'lc-berries-almonds'],
  ['lc-chia-yogurt', 'lc-egg-veg-dip', 'lc-shakshuka', 'lc-yogurt-raspberries'],
  ['lc-yogurt-bowl', 'lc-egg-veg-dip', 'lc-mushroom-omelet', 'lc-cheese-berries'],
];

// Pescatarian Keto: fish, eggs, cheese, butter and olive oil, avocado, leafy and
// low-carb vegetables, a few nuts. No grains, legumes or fruit beyond a few berries.
// Recipes: pescodial/drafts/report/recipes-pesco-keto.md (dish ids match).
const KETO_DISHES = {
  breakfast: [
    { id: 'k-smoked-salmon-eggs', name: 'Smoked salmon scrambled eggs', items: [['eggs', 3], ['smoked_salmon', 1], ['cream_cheese', 1]] },
    { id: 'k-spinach-omelet', name: 'Spinach and feta omelet', items: [['eggs', 3], ['spinach', 1, 'veg'], ['feta', 1]] },
    { id: 'k-eggs-avocado', name: 'Eggs with avocado', items: [['eggs', 3], ['avocado', 0.5]] },
    { id: 'k-mushroom-omelet', name: 'Mushroom and cheddar omelet', items: [['eggs', 3], ['mushrooms', 0.5, 'veg'], ['cheddar', 1]] },
    { id: 'k-smoked-salmon-plate', name: 'Smoked salmon with cream cheese and cucumber', items: [['smoked_salmon', 2], ['cream_cheese', 2], ['cucumber', 0.5, 'veg']] },
    { id: 'k-yogurt-raspberries', name: 'Whole-milk Greek yogurt with raspberries and walnuts', items: [['whole_greek_yogurt', 1], ['raspberries', 0.25], ['walnuts', 1]] },
  ],
  lunch: [
    { id: 'k-tuna-avocado', name: 'Tuna-stuffed avocado', fish: true, items: [['tuna', 1], ['avocado', 0.5], ['greens', 1, 'veg']] },
    { id: 'k-sardine-salad', name: 'Sardine and olive salad', fish: true, items: [['sardines', 1.5], ['greens', 2, 'veg'], ['olives', 6], ['feta', 1]] },
    { id: 'k-egg-avocado-salad', name: 'Egg and avocado salad', items: [['eggs', 3], ['avocado', 0.25], ['greens', 2, 'veg'], ['cheddar', 1]] },
    { id: 'k-cheese-plate', name: 'Cheese, olive and avocado plate', items: [['cheddar', 1.5], ['string_cheese', 2], ['olives', 6], ['avocado', 0.25], ['greens', 1, 'veg']] },
    { id: 'k-antipasto', name: 'Eggs, cheese and olive plate', items: [['eggs', 3], ['string_cheese', 1], ['olives', 6], ['cucumber', 0.5, 'veg']] },
  ],
  dinner: [
    { id: 'k-salmon-spinach', name: 'Pan-seared salmon with garlic butter spinach', fish: true, items: [['salmon', 5], ['spinach', 3, 'veg'], ['butter', 1]] },
    { id: 'k-shrimp-zoodles', name: 'Garlic shrimp with zucchini noodles', fish: true, shellfish: true, items: [['shrimp', 6], ['zucchini', 1.5, 'veg'], ['parmesan', 1]] },
    { id: 'k-parmesan-cod', name: 'Parmesan-crusted cod with roasted broccoli', fish: true, items: [['cod', 6], ['broccoli', 0.75, 'veg'], ['parmesan', 2]] },
    { id: 'k-mackerel-asparagus', name: 'Pan-seared mackerel with asparagus', fish: true, items: [['mackerel', 5], ['asparagus', 1, 'veg']] },
    { id: 'k-trout-cauliflower', name: 'Trout with roasted cauliflower', fish: true, items: [['trout', 5], ['cauliflower', 1, 'veg']] },
    { id: 'k-zucchini-frittata', name: 'Zucchini and feta frittata', items: [['eggs', 3], ['zucchini', 1, 'veg'], ['feta', 1], ['string_cheese', 1]] },
    { id: 'k-cauli-cheese-bake', name: 'Cauliflower, egg and cheddar bake', items: [['eggs', 3], ['cauliflower', 1, 'veg'], ['cheddar', 1], ['string_cheese', 1]] },
  ],
  snack: [
    { id: 'k-macadamias', name: 'Macadamia nuts', items: [['macadamia', 2]] },
    { id: 'k-cheddar-olives', name: 'Cheddar and olives', items: [['cheddar', 1], ['olives', 6]] },
    { id: 'k-cucumber-cream-cheese', name: 'Cucumber with cream cheese', items: [['cucumber', 0.5, 'veg'], ['cream_cheese', 2]] },
    { id: 'k-string-cheese-almonds', name: 'String cheese and almonds', items: [['string_cheese', 2], ['almonds', 1]] },
    { id: 'k-raspberries-cream', name: 'Raspberries with cream', items: [['raspberries', 0.25], ['heavy_cream', 2]] },
  ],
};
// Keto and Carnivore carry a seafood meal every day (seven a week, lowest-mercury
// kinds only): their protein target is 2 g per kg of goal weight, and on a fish-free
// day eggs and cheese alone cannot reach it under a 30 g (Keto) or 10 g (Carnivore)
// carb ceiling without a dozen eggs. See STYLES[...].fishMeals.
const KETO_WEEK = [
  ['k-smoked-salmon-eggs', 'k-antipasto', 'k-salmon-spinach', 'k-macadamias'],
  ['k-spinach-omelet', 'k-tuna-avocado', 'k-zucchini-frittata', 'k-string-cheese-almonds'],
  ['k-mushroom-omelet', 'k-antipasto', 'k-shrimp-zoodles', 'k-cucumber-cream-cheese'],
  ['k-mushroom-omelet', 'k-egg-avocado-salad', 'k-parmesan-cod', 'k-cheddar-olives'],
  ['k-mushroom-omelet', 'k-sardine-salad', 'k-cauli-cheese-bake', 'k-cheddar-olives'],
  ['k-smoked-salmon-eggs', 'k-antipasto', 'k-mackerel-asparagus', 'k-macadamias'],
  ['k-spinach-omelet', 'k-antipasto', 'k-trout-cauliflower', 'k-string-cheese-almonds'],
];

// Pescatarian Carnivore: fish, seafood, eggs, butter and some dairy. No plant foods
// (salt and spices only, which the plan does not list). Recipes:
// pescodial/drafts/report/recipes-pesco-carnivore.md (dish ids match).
const CARNIVORE_DISHES = {
  breakfast: [
    { id: 'c-sardines-eggs', name: 'Sardines with soft-scrambled eggs', fish: true, items: [['eggs', 3], ['sardines', 1.5]] },
    { id: 'c-cheddar-eggs', name: 'Cheddar scrambled eggs', items: [['eggs', 3], ['cheddar', 1]] },
    { id: 'c-smoked-salmon-eggs', name: 'Scrambled eggs with smoked salmon and cream cheese', items: [['eggs', 3], ['smoked_salmon', 1], ['cream_cheese', 1]] },
    { id: 'c-fried-eggs', name: 'Eggs fried in butter', items: [['eggs', 3], ['butter', 0.5]] },
    { id: 'c-smoked-salmon-plate', name: 'Smoked salmon with cream cheese', items: [['smoked_salmon', 2], ['cream_cheese', 2], ['string_cheese', 1]] },
  ],
  lunch: [
    { id: 'c-salmon-patties', name: 'Salmon patties', fish: true, items: [['salmon', 5], ['eggs', 1], ['parmesan', 2]] },
    { id: 'c-egg-cheese-plate', name: 'Hard-boiled eggs and cheddar', items: [['eggs', 3], ['cheddar', 1], ['string_cheese', 1]] },
    { id: 'c-tuna-eggs', name: 'Tuna and hard-boiled eggs', fish: true, items: [['tuna', 1], ['eggs', 2]] },
    { id: 'c-omelet', name: 'Cheese omelet', items: [['eggs', 3], ['string_cheese', 2]] },
    { id: 'c-cheese-plate', name: 'Cheddar and string cheese plate', items: [['cheddar', 1.5], ['string_cheese', 2]] },
  ],
  dinner: [
    { id: 'c-butter-salmon', name: 'Butter-basted salmon with crispy skin', fish: true, items: [['salmon', 6], ['butter', 1]] },
    { id: 'c-brown-butter-shrimp', name: 'Brown butter shrimp', fish: true, shellfish: true, items: [['shrimp', 6], ['butter', 1.5]] },
    { id: 'c-mackerel', name: 'Pan-seared Atlantic mackerel', fish: true, items: [['mackerel', 6]] },
    { id: 'c-trout', name: 'Pan-seared trout', fish: true, items: [['trout', 6]] },
    { id: 'c-parmesan-cod', name: 'Baked cod with parmesan butter', fish: true, items: [['cod', 6], ['butter', 1], ['parmesan', 2]] },
    { id: 'c-scallops', name: 'Seared scallops', fish: true, shellfish: true, items: [['scallops', 7]] },
    { id: 'c-cheese-omelet', name: 'Cheddar and cream cheese omelet', items: [['eggs', 3], ['cheddar', 1], ['cream_cheese', 1], ['string_cheese', 1]] },
  ],
  snack: [
    { id: 'c-cheddar', name: 'Cheddar', items: [['cheddar', 1.5]] },
    { id: 'c-hard-boiled-eggs', name: 'Hard-boiled eggs', items: [['eggs', 2]] },
    { id: 'c-string-cheese', name: 'String cheese', items: [['string_cheese', 2]] },
  ],
};
const CARNIVORE_WEEK = [
  ['c-cheddar-eggs', 'c-egg-cheese-plate', 'c-butter-salmon', 'c-string-cheese'],
  ['c-fried-eggs', 'c-omelet', 'c-brown-butter-shrimp', 'c-cheddar'],
  ['c-fried-eggs', 'c-salmon-patties', 'c-cheese-omelet', 'c-hard-boiled-eggs'],
  ['c-cheddar-eggs', 'c-egg-cheese-plate', 'c-parmesan-cod', 'c-string-cheese'],
  ['c-sardines-eggs', 'c-omelet', 'c-cheese-omelet', 'c-cheddar'],
  ['c-fried-eggs', 'c-egg-cheese-plate', 'c-mackerel', 'c-string-cheese'],
  ['c-cheddar-eggs', 'c-omelet', 'c-trout', 'c-hard-boiled-eggs'],
];

// Fish meals a week, by style (Brew, 2026-10-03): Mediterranean and Low Carb 5,
// Keto and Carnivore one lowest-mercury seafood meal every day. The WEEK tables are
// checked against this when the module loads, and the tests hold the built weeks to it.
export const PD_FISH_MEALS_PER_WEEK = Object.freeze({ 'pesco-mediterranean': 5, 'pesco-lowcarb': 5, 'pesco-keto': 7, 'pesco-carnivore': 7 });
export const PD_FISH_MEALS = PD_FISH_MEALS_PER_WEEK;
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'];
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Kitchen rounding steps per display unit. Count units round to whole numbers
// except avocado/lemon/can/pita, which allow halves and quarters as listed.
const ROUND_STEP = { oz: 0.5, cup: 0.25, tbsp: 0.5, each: 1, slice: 1, stick: 1, can: 0.5 };
const FRACTIONAL_EACH = { avocado: 0.25, lemon: 0.5, pita: 0.5 };

// Per-meal portion limits, so scaling never asks for something nobody would eat
// (three oranges as a snack) or a fish portion under the 4 oz serving the fish page
// names (FDA/EPA). Whatever a limit takes off or adds is rebalanced by the filler and
// trim passes below. Styles may override a limit (STYLE.limits).
const PORTION_LIMITS = {
  salmon: [4, 7], cod: [4, 8], shrimp: [4, 7], trout: [4, 7], tilapia: [4, 7],
  sardines: [1, 1], tuna: [0.5, 1],
  eggs: [1, 3], apple: [1, 1], orange: [1, 1], pear: [1, 1], avocado: [0.25, 0.5],
  hummus: [2, 6], olives: [4, 10], tomato_sauce: [0.5, 1.5], walnuts: [1, 3], almonds: [2, 6],
  almond_butter: [1, 2], greek_yogurt: [0.5, 1.25], feta: [0.5, 2], parmesan: [1, 2],
  string_cheese: [1, 2], wholegrain_bread: [1, 2], pita: [0.5, 1], dates: [1, 3],
  chia: [1, 2], oats: [0.5, 1], milk: [0.5, 1], blueberries: [0.5, 1],
};
// Foods the Mediterranean table never used. Same rules: fish 4 oz or more (canned fish
// a full can or more, so every fish meal is at least a 4 oz serving), a palm-to-a-hand of
// cheese, a few spoons of nuts or cream.
const EXTRA_LIMITS = {
  mackerel: [4, 7], scallops: [4, 8], halibut: [4, 7], smoked_salmon: [1, 2],
  butter: [0.5, 2], cheddar: [1, 2], cream_cheese: [1, 2], heavy_cream: [1, 3],
  whole_greek_yogurt: [0.5, 1.25], macadamia: [1, 3], raspberries: [0.25, 1], strawberries: [0.5, 1],
  lentils: [0.25, 1], chickpeas: [0.25, 0.75], white_beans: [0.25, 0.75],
};
// Canned fish as a fish meal: at least 1½ cans of sardines (92 g drained each) or a
// whole can of light tuna (142 g), so the serving is 4 oz or more.
const FISH_MEAL_LIMITS = { sardines: [1.5, 2], tuna: [1, 1] };
// Keto and Carnivore build the day around the fish (2 g protein per kg of goal weight),
// so a fish portion may go up to a restaurant-size 10 oz on a high calorie target.
const BIG_FISH_LIMITS = {
  salmon: [4, 10], cod: [4, 10], shrimp: [4, 10], trout: [4, 10], tilapia: [4, 10], mackerel: [4, 10],
  scallops: [4, 10], sardines: [1.5, 2.5], tuna: [1, 1.5],
};

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

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
// Each style: its dishes and week, which foods are sized to the protein target, its
// cooking fat (first one the reader has not excluded), the plain sides that close a
// calorie shortfall, the protein top-up for a day that runs short, and, for the
// low-carb styles, a carb ceiling (and Low Carb's floor) the plan must land inside.
// pesco-mediterranean is the original table and behaves exactly as before.
// Foods a day cap counts together ('berries' in STYLE.dayCaps, in cups).
const CAP_GROUPS = { blueberries: 1, raspberries: 1, strawberries: 1 };
const FISH_KEYS = ['salmon', 'cod', 'shrimp', 'trout', 'tilapia', 'tuna', 'sardines', 'mackerel', 'scallops', 'halibut'];
const STYLES = {
  'pesco-mediterranean': {
    dishes: MED_DISHES, week: MED_WEEK,
    proteinKeys: ['salmon', 'cod', 'shrimp', 'trout', 'tilapia', 'tuna', 'sardines', 'eggs', 'greek_yogurt', 'feta', 'string_cheese'],
    fats: ['olive_oil'], fatMax: 3, fatSlots: ['lunch', 'dinner'],
    // Fat-heavy sides (almonds, oil) only while the day is still under its fat target.
    fillers: [
      { slot: 'lunch', food: 'wholegrain_bread', max: 2 },
      { slot: 'dinner', food: 'wholegrain_bread', max: 2 },
      { slot: 'snack', food: 'blueberries', max: 1 },
      { slot: 'dinner', food: 'quinoa', max: 1 },
      { slot: 'breakfast', food: 'wholegrain_bread', max: 2 },
      { slot: 'snack', food: 'almonds', max: 6, fat: true },
      { slot: 'dinner', food: 'olive_oil', max: 2, fat: true },
      { slot: 'lunch', food: 'olive_oil', max: 2, fat: true },
    ],
    topUps: [{ food: 'greek_yogurt', step: 0.25, slots: ['snack', 'breakfast', 'lunch'] }],
    limits: {},
  },
  'pesco-lowcarb': {
    dishes: LOWCARB_DISHES, week: LOWCARB_WEEK,
    proteinKeys: [...FISH_KEYS, 'eggs', 'greek_yogurt', 'string_cheese'],
    carbKeys: ['blueberries', 'raspberries', 'strawberries', 'tomato_sauce'],
    fats: ['olive_oil'], fatMax: 3, fatSlots: ['lunch', 'dinner'],
    fillers: [
      { slot: 'snack', food: 'strawberries', max: 1, carb: true },
      { slot: 'breakfast', food: 'blueberries', max: 1, carb: true },
      { slot: 'snack', food: 'raspberries', max: 1, carb: true },
      { slot: 'lunch', food: 'carrots', max: 1, carb: true },
      { slot: 'dinner', food: 'bell_pepper', max: 1, carb: true },
      { slot: 'snack', food: 'carrots', max: 1, carb: true },
      { slot: 'snack', food: 'greek_yogurt', max: 1.25 },
      { slot: 'snack', food: 'almonds', max: 4, fat: true },
      { slot: 'dinner', food: 'olive_oil', max: 3, fat: true },
      { slot: 'lunch', food: 'olive_oil', max: 3, fat: true },
      { slot: 'snack', food: 'eggs', max: 2, fat: true },
      { slot: 'breakfast', food: 'walnuts', max: 3, fat: true },
      { slot: 'breakfast', food: 'avocado', max: 0.5, fat: true },
      { slot: 'lunch', food: 'feta', max: 2, fat: true },
      { slot: 'lunch', food: 'olives', max: 10, fat: true },
      { slot: 'snack', food: 'cheddar', max: 2, fat: true },
    ],
    topUps: [
      { food: 'greek_yogurt', step: 0.25, slots: ['snack', 'breakfast', 'lunch'] },
      { food: 'string_cheese', step: 1, slots: ['snack', 'lunch', 'breakfast', 'dinner'] },
      { food: 'eggs', step: 1, slots: ['breakfast', 'lunch', 'dinner', 'snack'] },
    ],
    carbs: { max: m => m.carbs_grams + 22, min: m => m.carbs_grams - 20 },
    proteinCap: 1.25,
    trimProtein: true,
    proteinFloor: 0.91,
    limits: { ...EXTRA_LIMITS, ...FISH_MEAL_LIMITS },
    // Fruit stays a small portion (Sarah: "keep fruit to a small portion like berries").
    dayCaps: { eggs: 7, greek_yogurt: 3, string_cheese: 5, berries: 1.5 },
  },
  'pesco-keto': {
    dishes: KETO_DISHES, week: KETO_WEEK,
    proteinKeys: [...FISH_KEYS, 'eggs', 'smoked_salmon', 'string_cheese'],
    // Butter goes to the cooked meals; the cold lunches (salads, plates) get olive oil
    // from the sides list instead.
    fats: ['butter', 'olive_oil'], fatMax: 5, fatSlots: ['breakfast', 'dinner'],
    // Carb-free fats first: the 30 g carb ceiling is what runs out on a keto day.
    fillers: [
      { slot: 'dinner', food: 'butter', max: 3, fat: true },
      { slot: 'lunch', food: 'olive_oil', max: 3, fat: true },
      { slot: 'breakfast', food: 'butter', max: 2, fat: true },
      { slot: 'dinner', food: 'olive_oil', max: 1, fat: true },
      { slot: 'snack', food: 'cheddar', max: 2, fat: true },
      { slot: 'snack', food: 'heavy_cream', max: 3, fat: true },
      { slot: 'snack', food: 'macadamia', max: 3, fat: true },
    ],
    topUps: [
      { food: 'eggs', step: 1, slots: ['snack', 'breakfast', 'lunch', 'dinner'] },
      { food: 'string_cheese', step: 1, slots: ['snack', 'lunch', 'dinner'] },
      // A side of smoked salmon (lowest-mercury, never more than 2 oz, so never a
      // fish meal of its own) when eggs and cheese have reached their daily caps.
      { food: 'smoked_salmon', step: 0.5, slots: ['snack', 'lunch'] },
      { food: 'cheddar', step: 0.5, slots: ['snack', 'lunch', 'breakfast'] },
      { food: 'greek_yogurt', step: 0.25, slots: ['snack'] },
    ],
    carbs: { max: () => 27 },
    proteinCap: 1.25,
    trimProtein: true,
    proteinFloor: 0.91,
    limits: { ...EXTRA_LIMITS, ...BIG_FISH_LIMITS, eggs: [1, 4], butter: [0.5, 3] },
    dayCaps: { eggs: 9, string_cheese: 4, smoked_salmon: 2, cheddar: 4, greek_yogurt: 1 },
  },
  'pesco-carnivore': {
    dishes: CARNIVORE_DISHES, week: CARNIVORE_WEEK,
    proteinKeys: [...FISH_KEYS, 'eggs', 'smoked_salmon', 'string_cheese'],
    fats: ['butter'], fatMax: 9, fatSlots: ['breakfast', 'lunch', 'dinner'],
    fillers: [
      { slot: 'dinner', food: 'butter', max: 3, fat: true },
      { slot: 'lunch', food: 'butter', max: 3, fat: true },
      { slot: 'breakfast', food: 'butter', max: 3, fat: true },
      // Eggs before cheese: more fat per gram of carb, and the 10 g ceiling runs out first.
      { slot: 'snack', food: 'eggs', max: 3, fat: true },
      { slot: 'breakfast', food: 'heavy_cream', max: 3, fat: true },
      { slot: 'snack', food: 'cheddar', max: 2, fat: true },
      { slot: 'snack', food: 'heavy_cream', max: 3, fat: true },
    ],
    topUps: [
      { food: 'eggs', step: 1, slots: ['breakfast', 'lunch', 'dinner', 'snack'] },
      { food: 'string_cheese', step: 1, slots: ['snack', 'lunch', 'dinner'] },
      { food: 'smoked_salmon', step: 0.5, slots: ['snack', 'lunch'] },
      { food: 'cheddar', step: 0.5, slots: ['snack', 'lunch', 'breakfast'] },
    ],
    carbs: { max: () => 10 },
    // Sarah's carnivore recipe takes sardines in water or their own oil, not olive oil.
    // (Nutrition is USDA's drained canned sardine either way.)
    names: { sardines: 'canned sardines' },
    proteinCap: 1.25,
    trimProtein: true,
    proteinFloor: 0.91,
    // Butter is the only fat this style has, so a high fat target needs up to 3 tbsp a meal.
    limits: { ...EXTRA_LIMITS, ...BIG_FISH_LIMITS, eggs: [1, 4], butter: [0.5, 3] },
    dayCaps: { eggs: 10, string_cheese: 4, smoked_salmon: 2, cheddar: 4 },
  },
};
export const PD_STYLES = Object.keys(STYLES);
for (const [key, S] of Object.entries(STYLES)) {
  const fish = S.week.reduce((n, day) => n + day.filter((id, i) => S.dishes[SLOTS[i]].find(d => d.id === id).fish).length, 0);
  if (fish !== PD_FISH_MEALS_PER_WEEK[key]) throw new Error(`pd-meal-plan: ${key} week has ${fish} fish meals, want ${PD_FISH_MEALS_PER_WEEK[key]}.`);
}

function styleOf(style) {
  const S = STYLES[style];
  if (!S) throw new Error(`pd-meal-plan: unknown eating style "${style}"`);
  return S;
}

function dishExcluded(dish, isExcluded) {
  if (dish.items.some(([key]) => isExcluded(key, food(key)))) return true;
  if (dish.shellfish && isExcluded('shellfish', { usda: 'shellfish shrimp crustacean' })) return true;
  return false;
}

function pickDish(pool, wantedId, isExcluded, used) {
  const wanted = pool.find(d => d.id === wantedId);
  if (wanted && !dishExcluded(wanted, isExcluded)) return wanted;
  // Alternative in the same slot: prefer a fish dish when the wanted one was fish,
  // and one not already used this week.
  const ok = pool.filter(d => !dishExcluded(d, isExcluded));
  const sameKind = ok.filter(d => !!d.fish === !!(wanted && wanted.fish));
  const fresh = (sameKind.length ? sameKind : ok).filter(d => !used.has(d.id));
  return fresh[0] || sameKind[0] || ok[0] || null;
}

const NO_FISH_WARNING = 'Your food restrictions rule out every fish meal, so we cannot build a pescatarian week for you. Please review your selections or contact us.';
const NO_MEAL_WARNING = 'Your food restrictions rule out every option for at least one meal. Please review your selections.';

/**
 * Pick the week's dishes for a style, Mon..Sun, honouring exclusions. No quantities:
 * this is the whole plan for a reader whose numbers are withheld, and the first step
 * of the sized plan for everyone else, so both variants always show the same dishes.
 * Returns { days: [], warnings, refusal } (a refusal) when a slot has no allowed dish
 * (refusal 'no-meal') or when no fish meal survives the reader's restrictions
 * (refusal 'no-fish'). The two are different problems and get different messages.
 *
 * opts.maxFishMeals caps the week's fish meals (pregnancy: the report's own pregnancy
 * box allows 2 to 3 servings a week). Once the cap is reached, later fish slots take
 * the slot's non-fish alternative, the same swap an exclusion makes. That swap is not
 * a restriction swap, so it adds no "swapped because of your restrictions" warning.
 */
export function planPescoDishes(style, isExcluded = () => false, opts = {}) {
  const S = styleOf(style);
  const maxFish = Number.isFinite(opts.maxFishMeals) ? opts.maxFishMeals : Infinity;
  const used = new Set();
  const days = [];
  const warnings = [];
  let fishCount = 0;
  for (let d = 0; d < PD_PLAN_DAYS; d++) {
    const dishes = SLOTS.map((slot, i) => {
      let dish = pickDish(S.dishes[slot], S.week[d][i], isExcluded, used);
      if (dish && dish.fish && fishCount >= maxFish) {
        dish = pickDish(S.dishes[slot].filter(x => !x.fish), null, isExcluded, used);
      }
      if (dish) { used.add(dish.id); if (dish.fish) fishCount++; }
      return { slot, dish };
    });
    if (dishes.some(x => !x.dish)) {
      return { days: [], warnings: [NO_MEAL_WARNING], refusal: 'no-meal' };
    }
    // Only warn when a restriction removed a planned fish meal, not on the
    // days the week deliberately has none, and not for the fish cap.
    dishes.forEach(({ slot, dish }, i) => {
      const planned = S.dishes[slot].find(x => x.id === S.week[d][i]);
      if (planned && planned.fish && !dish.fish && dishExcluded(planned, isExcluded)) {
        warnings.push(`${DAY_NAMES[d]} ${slot}: a planned fish meal was swapped because of your food restrictions.`);
      }
    });
    days.push({ day: DAY_NAMES[d], dishes });
  }
  // A pescatarian plan with no fish in it is not the plan this reader paid for.
  // When restrictions rule out every fish dish, refuse rather than ship a
  // fish-free week under a pescatarian name.
  if (!days.some(d => d.dishes.some(x => x.dish.fish))) return { days: [], warnings: [NO_FISH_WARNING], refusal: 'no-fish' };
  return { days, warnings };
}
export const planPescoMedDishes = isExcluded => planPescoDishes('pesco-mediterranean', isExcluded);

/** The dish-only week (numbers withheld): names and ingredients, never a quantity. */
export function buildPescoDishWeek(style, isExcluded = () => false, opts = {}) {
  const plan = planPescoDishes(style, isExcluded, opts);
  return {
    warnings: plan.warnings,
    refusal: plan.refusal || null,
    days: plan.days.map(({ day, dishes }) => ({
      day,
      meals: dishes.map(({ slot, dish }) => ({
        slot, dishId: dish.id, name: dish.name, fish: !!dish.fish,
        items: dish.items.map(([key]) => ({ food: key, name: displayName(key, style), section: food(key).section })),
      })),
    })),
  };
}
export const buildPescoMedDishWeek = (isExcluded = () => false) => buildPescoDishWeek('pesco-mediterranean', isExcluded);

/**
 * Build the 7-day plan for a PescoDial style.
 * @param {string} style  'pesco-mediterranean' | 'pesco-lowcarb' | 'pesco-keto' | 'pesco-carnivore'
 * @param {{calories:number, protein_grams:number, fat_grams:number, carbs_grams:number}} macros
 *        the macro set this reader may be fed from (already through applyCalorieGuidance)
 * @param {(key:string, food:object) => boolean} isExcluded  true when a food must not appear
 */
export function buildPescoWeek(style, macros, isExcluded = () => false) {
  const S = styleOf(style);
  const cal = Number(macros && macros.calories);
  const proteinTarget = Number(macros && macros.protein_grams);
  const fatTarget = Number(macros && macros.fat_grams);
  const carbTarget = Number(macros && macros.carbs_grams);
  if (!Number.isFinite(cal) || !Number.isFinite(proteinTarget) || !Number.isFinite(fatTarget) || cal <= 0) {
    throw new Error('buildPescoWeek: refusing to size a meal plan without a usable calorie, protein and fat target.');
  }
  if (S.carbs && !Number.isFinite(carbTarget)) {
    throw new Error('buildPescoWeek: refusing to size a low-carb plan without a usable carb target.');
  }
  const carbMax = S.carbs ? S.carbs.max(macros) : Infinity;
  const carbMin = S.carbs && S.carbs.min ? S.carbs.min(macros) : -Infinity;
  // The cooking fat: the first of the style's fats the reader has not excluded. None
  // left (an olive oil allergy on a Mediterranean plan, dairy on a carnivore one):
  // no added fat, and the sides below close the gap.
  const fatKey = S.fats.find(k => !isExcluded(k, food(k))) || null;
  const fatFood = fatKey ? food(fatKey) : null;
  const fatKcalPerTbsp = fatFood ? fatFood.per100g.kcal * fatFood.gramsPerUnit / 100 : 0;
  const fatFatPerTbsp = fatFood ? fatFood.per100g.fat * fatFood.gramsPerUnit / 100 : 0;
  const limits = { ...PORTION_LIMITS, ...S.limits };
  const limit = (key, qty) => (limits[key] ? clamp(qty, limits[key][0], limits[key][1]) : qty);
  const roleOf = (key, f) => (S.fats.includes(key) ? 'oil' : f && f.carb ? 'carb' : 'filler');
  // Protein floor: 90% of target (the new styles keep a little margin so the rounded
  // day total never lands under 90%).
  const pFloor = S.proteinFloor || 0.9;

  const plan = planPescoDishes(style, isExcluded);
  if (!plan.days.length) return plan;
  const { warnings } = plan;
  const days = [];
  for (let d = 0; d < PD_PLAN_DAYS; d++) {
    const { dishes } = plan.days[d];
    const base = [];
    dishes.forEach(({ slot, dish }) => dish.items.forEach(([key, qty, role]) =>
      base.push({ slot, food: key, qty, role: role || (S.proteinKeys.includes(key) ? 'protein' : (S.carbKeys && S.carbKeys.includes(key)) ? 'carb' : 'scale') })));

    // Scales per day: protein foods are sized to the protein target, Low Carb's
    // berries and legumes to its carb target, the rest of the plate fills the
    // remaining calories, and the cooking fat (0 up to the style's maximum) is chosen
    // to land fat as close to target as the dishes allow, without crossing a carb
    // ceiling. Vegetables never shrink below their base portion. Uniform scaling
    // overshot protein by up to 85% on high-calorie targets, which this replaces.
    const group = role => base.filter(it => it.role === role);
    const nP = sumNutrition(group('protein'));
    const nS = sumNutrition(group('scale'));
    const nV = sumNutrition(group('veg'));
    const nC = sumNutrition(group('carb'));
    let best = null;
    for (let o = 0; o <= (fatKey ? S.fatMax : 0); o += 0.5) {
      let sP = 1, sS = 1, sC = 1;
      for (let iter = 0; iter < 4; iter++) {
        sP = clamp((proteinTarget - nS.protein * sS - nC.protein * sC - nV.protein) / Math.max(nP.protein, 1), 0.5, 2);
        if (nC.kcal > 0) sC = clamp((carbTarget - nP.carbs * sP - nS.carbs * sS - nV.carbs) / Math.max(nC.carbs, 1), 0.5, 2.5);
        sS = clamp((cal - nP.kcal * sP - nC.kcal * sC - nV.kcal - o * fatKcalPerTbsp) / Math.max(nS.kcal, 1), 0.4, 2.5);
      }
      const kcal = nP.kcal * sP + nS.kcal * sS + nC.kcal * sC + nV.kcal + o * fatKcalPerTbsp;
      const fat = nP.fat * sP + nS.fat * sS + nC.fat * sC + nV.fat + o * fatFatPerTbsp;
      let err = Math.abs(fat - fatTarget) + Math.abs(kcal - cal) / 9;
      if (S.carbs) {
        const carbs = nP.carbs * sP + nS.carbs * sS + nC.carbs * sC + nV.carbs;
        err += 3 * Math.max(0, carbs - carbMax) + 3 * Math.max(0, carbMin - carbs);
      }
      if (!best || err < best.err) best = { o, sP, sS, sC, err };
    }

    const items = base.map(it => ({
      ...it,
      qty: limit(it.food, roundQty(it.food, it.role === 'veg' ? it.qty
        : it.qty * (it.role === 'protein' ? best.sP : it.role === 'carb' ? best.sC : best.sS))),
    }));
    if (best.o > 0) {
      // Cooking fat goes to the style's cooking meals (lunch and dinner for olive oil
      // styles), shared as evenly as the half-tablespoon allows.
      // A meal whose dish already has that fat (garlic butter) takes only what keeps
      // it inside the per-meal limit.
      let left = best.o;
      const fatCap = limits[fatKey] ? limits[fatKey][1] : Infinity;
      S.fatSlots.forEach((slot, i) => {
        if (left <= 0) return;
        const cur = items.find(it => it.slot === slot && it.food === fatKey);
        let share = i === S.fatSlots.length - 1 ? roundQty(fatKey, left) : roundQty(fatKey, left / (S.fatSlots.length - i));
        share = Math.min(share, fatCap - (cur ? cur.qty : 0));
        if (share <= 0) return;
        if (cur) cur.qty = roundQty(fatKey, cur.qty + share);
        else items.push({ slot, food: fatKey, qty: share, role: 'oil' });
        left -= share;
      });
    }

    // Calorie floor/ceiling after rounding. Some days' dishes have little to
    // scale besides protein; close a shortfall with plain sides (the style's
    // FILLERS), and trim the plate if a day runs long. Every pass respects the
    // portion limits, and a side added to a meal that already has that food joins it
    // rather than being listed twice.
    const stepOf = key => FRACTIONAL_EACH[key] || ROUND_STEP[food(key).unit] || 0.25;
    const maxOf = key => (limits[key] ? limits[key][1] : Infinity);
    const minOf = key => (limits[key] ? limits[key][0] : stepOf(key));
    const inSlot = (slot, key) => items.find(it => it.slot === slot && it.food === key);
    // Daily caps (STYLE.dayCaps): eggs, string cheese, Greek yogurt and smoked salmon
    // stay at a sane amount for the day, however the meals add up.
    const caps = S.dayCaps || {};
    const capKey = key => (CAP_GROUPS[key] && 'berries' in caps ? 'berries' : key);
    const dayRoom = (key, add) => {
      const k = capKey(key);
      if (!(k in caps)) return true;
      const members = k === 'berries' ? Object.keys(CAP_GROUPS) : [k];
      return items.filter(it => members.includes(it.food)).reduce((a, it) => a + it.qty, 0) + add <= caps[k] + 1e-9;
    };
    for (const k of Object.keys(caps)) {
      const members = k === 'berries' ? Object.keys(CAP_GROUPS) : [k];
      for (let guard = 0; guard < 24 && !dayRoom(members[0], 0); guard++) {
        const big = items.filter(it => members.includes(it.food) && it.qty - stepOf(it.food) >= minOf(it.food) - 1e-9).sort((a, b) => b.qty - a.qty)[0];
        if (!big) break;
        big.qty = roundQty(big.food, big.qty - stepOf(big.food));
      }
    }
    // A side may not take a low-carb day over its carb ceiling, push protein past the
    // style's cap, or (Low Carb's berries and beans) add carbs once the target is met.
    const sideFits = (key, tot, isCarbSide) => {
      if (!S.carbs && !S.proteinCap) return true;
      const n = itemNutrition(key, stepOf(key));
      if (!dayRoom(key, stepOf(key))) return false;
      if (tot.carbs + n.carbs > carbMax) return false;
      if (isCarbSide && tot.carbs >= carbTarget) return false;
      if (S.proteinCap && n.protein > 0.5 && tot.protein + n.protein > S.proteinCap * proteinTarget) return false;
      return true;
    };
    // Low-carb styles: a protein side may not cross the carb ceiling, so make room by
    // taking a step off the most carb-dense food that is not protein (olives, avocado,
    // nuts, an added side), never below a dish's own minimum or into its vegetables.
    const makeCarbRoom = need => {
      for (let guard = 0; guard < 24 && sumNutrition(items).carbs + need > carbMax; guard++) {
        const t = items.filter(it => (it.role === 'filler' || it.role === 'scale' ||
            (it.role === 'carb' && sumNutrition(items).carbs - itemNutrition(it.food, stepOf(it.food)).carbs >= carbMin)) &&
          it.qty - stepOf(it.food) >= (it.role === 'filler' || it.added ? 0 : minOf(it.food)) - 1e-9)
          .map(it => { const n = itemNutrition(it.food, stepOf(it.food)); return { it, c: n.carbs, d: n.carbs / Math.max(n.kcal, 1) }; })
          .filter(x => x.c > 0.1)
          .sort((x, y) => y.d - x.d)[0];
        if (!t) return false;
        const next = t.it.qty - stepOf(t.it.food);
        if (next < stepOf(t.it.food) - 1e-9) items.splice(items.indexOf(t.it), 1);
        else t.it.qty = roundQty(t.it.food, next);
      }
      return sumNutrition(items).carbs + need <= carbMax;
    };
    const fill = () => {
      let swaps = 0;
      for (let guard = 0; guard < 24 && sumNutrition(items).kcal < 0.94 * cal; guard++) {
        const tot = sumNutrition(items);
        const fatRoom = tot.fat < fatTarget;
        const f = S.fillers.find(f => (!f.fat || fatRoom) && !isExcluded(f.food, food(f.food)) &&
          ((inSlot(f.slot, f.food) || { qty: 0 }).qty + stepOf(f.food)) <= Math.min(f.max, maxOf(f.food)) &&
          sideFits(f.food, tot, f.carb));
        if (!f) {
          // Low-carb styles at the ceiling: swap a step of the most carb-dense food for a
          // side that carries less carb per calorie (cheese out, an egg in), if one fits.
          if (!S.carbs || swaps++ >= 8) break;
          const g = S.fillers.find(f => (!f.fat || fatRoom) && !f.carb && !isExcluded(f.food, food(f.food)) &&
            ((inSlot(f.slot, f.food) || { qty: 0 }).qty + stepOf(f.food)) <= Math.min(f.max, maxOf(f.food)) &&
            dayRoom(f.food, stepOf(f.food)) &&
            itemNutrition(f.food, stepOf(f.food)).carbs / Math.max(itemNutrition(f.food, stepOf(f.food)).kcal, 1) < 0.009);
          if (!g || !makeCarbRoom(itemNutrition(g.food, stepOf(g.food)).carbs)) break;
          const cur = inSlot(g.slot, g.food);
          if (cur) cur.qty += stepOf(g.food);
          else items.push({ slot: g.slot, food: g.food, qty: stepOf(g.food), role: roleOf(g.food, g), added: true });
          continue;
        }
        const cur = inSlot(f.slot, f.food);
        if (cur) cur.qty += stepOf(f.food);
        else items.push({ slot: f.slot, food: f.food, qty: stepOf(f.food), role: roleOf(f.food, f), added: true });
      }
    };
    fill();
    // Trim the least protein-dense non-protein food first, never below its limit
    // and never taking protein under the 90% floor.
    const trimOnce = () => {
      const totalsNow = sumNutrition(items);
      // Oil and added sides may go to zero; a dish's own foods keep their minimum.
      const floorOf = it => (it.role === 'oil' || it.role === 'filler' ? 0 : minOf(it.food));
      const cands = items.filter(it => (it.role === 'scale' || it.role === 'filler' || it.role === 'oil' || it.role === 'carb' ||
        // Keto, Carnivore, Low Carb: protein foods carry their own fat, so a day can run
        // long on them alone; they may come down too, never below the protein floor.
        (S.trimProtein && it.role === 'protein')) &&
        it.qty - stepOf(it.food) >= floorOf(it) - 1e-9)
        .map(it => { const n = itemNutrition(it.food, stepOf(it.food)); return { it, n, density: n.protein / Math.max(n.kcal, 1) }; })
        // Low Carb keeps the berries and beans that hold its carb floor.
        .filter(c => !(c.it.role === 'carb' && totalsNow.carbs - c.n.carbs < carbMin))
        .sort((x, y) => x.density - y.density || y.n.kcal - x.n.kcal);
      const pick = cands.find(c => totalsNow.protein - c.n.protein >= pFloor * proteinTarget);
      if (!pick) return false;
      const next = pick.it.qty - stepOf(pick.it.food);
      if (next < stepOf(pick.it.food) - 1e-9) items.splice(items.indexOf(pick.it), 1);
      else pick.it.qty = roundQty(pick.it.food, next);
      return true;
    };
    for (let guard = 0; guard < 24 && sumNutrition(items).kcal > 1.06 * cal; guard++) if (!trimOnce()) break;

    // Protein floor after rounding: never under 90% of target. Dinner's protein
    // first, then any other, each only up to its portion limit.
    const proteinFloor = () => {
      for (let guard = 0; guard < (S.carbs ? 32 : 16) && sumNutrition(items).protein < pFloor * proteinTarget; guard++) {
        const room = it => it.role === 'protein' && it.qty + stepOf(it.food) <= maxOf(it.food) + 1e-9 && dayRoom(it.food, stepOf(it.food));
        let target = items.find(it => it.slot === 'dinner' && room(it)) || items.find(room);
        if (!target) {
          // Every protein food is at its limit (a fish-free day): the style's plain
          // protein side (Greek yogurt on the Mediterranean plan) with the snack, then
          // breakfast, then lunch.
          let pick = null;
          for (const t of S.topUps) {
            if (isExcluded(t.food, food(t.food))) continue;
            const slot = t.slots.find(sl => (inSlot(sl, t.food) || { qty: 0 }).qty + t.step <= maxOf(t.food) && dayRoom(t.food, t.step) &&
              (!S.carbs || sumNutrition(items).carbs + itemNutrition(t.food, t.step).carbs <= carbMax ||
                makeCarbRoom(itemNutrition(t.food, t.step).carbs)));
            if (slot) { pick = { t, slot }; break; }
          }
          if (!pick) break;
          target = inSlot(pick.slot, pick.t.food);
          if (!target) { items.push({ slot: pick.slot, food: pick.t.food, qty: pick.t.step, role: 'protein' }); continue; }
        }
        target.qty = roundQty(target.food, target.qty + stepOf(target.food));
      }
    };
    proteinFloor();
    // Raising protein can push a day back over the ceiling.
    for (let guard = 0; guard < 24 && sumNutrition(items).kcal > 1.06 * cal; guard++) if (!trimOnce()) break;
    // A fish-free day leans on eggs, cheese, hummus and olives and can run well over
    // its fat target. Take back oil, then other fat-dense foods, and refill with the
    // lean sides above.
    for (let guard = 0; guard < 16 && sumNutrition(items).fat > 1.2 * fatTarget; guard++) {
      const t = items.filter(it => (it.role === 'oil' || it.role === 'filler' || it.role === 'scale') &&
        it.qty - stepOf(it.food) >= (it.role === 'oil' || it.role === 'filler' ? 0 : minOf(it.food)) - 1e-9)
        .map(it => { const n = itemNutrition(it.food, stepOf(it.food)); return { it, fatShare: n.fat * 9 / Math.max(n.kcal, 1) }; })
        .filter(c => c.fatShare > 0.6)
        .sort((x, y) => (y.it.role === 'oil') - (x.it.role === 'oil') || y.fatShare - x.fatShare)[0];
      if (!t) break;
      const next = t.it.qty - stepOf(t.it.food);
      if (next < stepOf(t.it.food) - 1e-9) items.splice(items.indexOf(t.it), 1);
      else t.it.qty = roundQty(t.it.food, next);
      fill();
    }

    if (S.carbs) {
      // Carb ceiling (Keto, Carnivore, Low Carb): take back the most carb-dense food a
      // step at a time (added sides first, never a dish's own minimum, never the
      // vegetables), then refill calories with sides that fit under the ceiling.
      // Added sides first, then the plate's other foods, protein foods last.
      const rank = it => (it.role === 'filler' || it.added ? 0 : it.role === 'protein' ? 2 : 1);
      const carbCeiling = () => {
      for (let guard = 0; guard < 24 && sumNutrition(items).carbs > carbMax; guard++) {
        const t = items.filter(it => ['filler', 'carb', 'scale', 'protein'].includes(it.role) &&
          it.qty - stepOf(it.food) >= (it.role === 'filler' || it.added ? 0 : minOf(it.food)) - 1e-9)
          .map(it => ({ it, c: itemNutrition(it.food, stepOf(it.food)).carbs }))
          .filter(x => x.c > 0.1)
          .sort((x, y) => rank(x.it) - rank(y.it) || y.c - x.c)[0];
        if (!t) break;
        const next = t.it.qty - stepOf(t.it.food);
        if (next < stepOf(t.it.food) - 1e-9) items.splice(items.indexOf(t.it), 1);
        else t.it.qty = roundQty(t.it.food, next);
      }
      };
      carbCeiling();
      // Carb floor (Low Carb): add berries or beans a step at a time until the day is
      // back inside its range, then trim the plate back to its calories.
      for (let guard = 0; guard < 16 && sumNutrition(items).carbs < carbMin; guard++) {
        const tot = sumNutrition(items);
        const f = S.fillers.find(f => f.carb && !isExcluded(f.food, food(f.food)) && dayRoom(f.food, stepOf(f.food)) &&
          ((inSlot(f.slot, f.food) || { qty: 0 }).qty + stepOf(f.food)) <= Math.min(f.max, maxOf(f.food)) &&
          tot.carbs + itemNutrition(f.food, stepOf(f.food)).carbs <= carbMax);
        if (!f) break;
        const cur = inSlot(f.slot, f.food);
        if (cur) cur.qty += stepOf(f.food);
        else items.push({ slot: f.slot, food: f.food, qty: stepOf(f.food), role: 'carb', added: true });
      }
      fill();
      proteinFloor();
      for (let guard = 0; guard < 24 && sumNutrition(items).kcal > 1.06 * cal; guard++) if (!trimOnce()) break;
      // The ceiling is the style's definition, so it has the last word: a day that
      // cannot hold it and its protein floor gives up protein, never the ceiling.
      carbCeiling();
    }

    const totals = sumNutrition(items);
    days.push({
      day: DAY_NAMES[d],
      meals: dishes.map(({ slot, dish }) => ({
        slot, dishId: dish.id, name: dish.name, fish: !!dish.fish,
        items: items.filter(it => it.slot === slot).map(it => ({
          food: it.food, name: displayName(it.food, style), qty: it.qty, unit: food(it.food).unit,
          grams: Math.round(it.qty * food(it.food).gramsPerUnit), section: food(it.food).section,
        })),
      })),
      totals: Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v)])),
    });
  }
  return { days, warnings };
}

/** The Pescatarian Mediterranean week (the original entry point). */
export function buildPescoMedWeek(macros, isExcluded = () => false) {
  return buildPescoWeek('pesco-mediterranean', macros, isExcluded);
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
  butter: 'butter', cheddar: 'cheddar', cream_cheese: 'cream cheese', heavy_cream: 'heavy cream',
  whole_greek_yogurt: 'whole-milk plain Greek yogurt', mackerel: 'Atlantic mackerel', smoked_salmon: 'smoked salmon',
  scallops: 'scallops', halibut: 'halibut', cauliflower: 'cauliflower', asparagus: 'asparagus', mushrooms: 'mushrooms',
  cabbage: 'cabbage', raspberries: 'raspberries', strawberries: 'strawberries', macadamia: 'macadamia nuts',
};
export function displayName(key, style) {
  const own = style && STYLES[style] && STYLES[style].names;
  return (own && own[key]) || DISPLAY_NAMES[key] || key.replace(/_/g, ' ');
}

// Count foods: one form up to a single item ("½ lemon", "1 egg"), plural above it.
const COUNT_FORMS = {
  eggs: ['egg', 'eggs'], apple: ['apple', 'apples'], orange: ['orange', 'oranges'], pear: ['pear', 'pears'],
  dates: ['date', 'dates'], olives: ['olive', 'olives'], avocado: ['avocado', 'avocados'], lemon: ['lemon', 'lemons'],
  'whole-wheat pita': ['whole-wheat pita', 'whole-wheat pitas'],
};
function countNoun(name, qty) {
  const forms = COUNT_FORMS[name];
  return forms ? forms[qty > 1 ? 1 : 0] : name;
}

const FRACTIONS = { 0.25: '¼', 0.5: '½', 0.75: '¾', 0.125: '⅛' };
/** "1½ cups", "5 oz", "2 eggs", "¼ avocado". */
export function formatQty(qty, unit, name) {
  const whole = Math.floor(qty);
  const frac = Math.round((qty - whole) * 1000) / 1000;
  const num = (whole ? String(whole) : '') + (FRACTIONS[frac] || (frac ? String(frac).replace(/^0/, '') : ''));
  const shown = num || '0';
  if (unit === 'each') return `${shown} ${countNoun(name, qty)}`.trim();
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

/** Grocery list for the numbers-withheld week: what to buy, grouped by section, no amounts. */
export function groceryNamesFromWeek(week) {
  if (!week || !Array.isArray(week.days) || week.days.length === 0) {
    throw new Error('groceryNamesFromWeek: needs the generated week; it never builds a list on its own.');
  }
  const sections = {};
  const seen = new Set();
  for (const day of week.days) for (const meal of day.meals) for (const it of meal.items) {
    if (seen.has(it.food)) continue;
    seen.add(it.food);
    (sections[it.section] = sections[it.section] || []).push({ food: it.food, name: it.name, section: it.section });
  }
  for (const list of Object.values(sections)) list.sort((a, b) => a.name.localeCompare(b.name));
  return sections;
}
