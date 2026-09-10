/**
 * Sample-day arithmetic guard (audit 2026-09-10).
 *
 * The free results screen tells the reader the sample day is built to hit their
 * calorie target. Before this fix, three of the five meals were hardcoded and
 * stacked on top of the two computed ones, so a 937-calorie target displayed a
 * 2,517-calorie day. These assertions exist so that can never silently return.
 *
 * Run: node tests/sample-day-arithmetic.test.mjs
 */
import { buildSampleDay, getDietSampleDay, dietSampleDays } from '../api/sample-day.js';

let failures = 0;
let checks = 0;

function check(name, cond, detail = '') {
  checks++;
  if (cond) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

// Profiles that matter for this audience, plus the two the audit reproduced live.
const PROFILES = [
  { name: 'smaller older woman, sedentary, fat loss', target: 937 },
  { name: 'audit profile: 58F 5ft4 186lb fat loss', target: 1646 },
  { name: 'moderate typical profile', target: 2000 },
  { name: 'larger male, muscle gain', target: 3200 },
  { name: 'lowest plausible target', target: 800 },
];

const DIETS = Object.keys(dietSampleDays);

console.log('\n=== Sample-day arithmetic ===\n');

for (const diet of DIETS) {
  console.log(`Diet: ${diet}`);
  for (const p of PROFILES) {
    const day = buildSampleDay(getDietSampleDay(diet), p.target);

    // 1. The printed meal calories must sum to the printed day total.
    const sum = day.meals.reduce((s, m) => s + m.calories, 0);
    check(
      `${p.name} @${p.target}: meals sum to displayed total`,
      sum === day.total,
      `meals=${sum} total=${day.total}`
    );

    // 2. The day must materially correspond to the claimed target.
    //    ±8% absorbs realistic portion rounding without allowing a second meal.
    const drift = Math.abs(day.total - p.target) / p.target;
    check(
      `${p.name} @${p.target}: day within 8% of target (got ${day.total})`,
      drift <= 0.08,
      `drift=${(drift * 100).toFixed(1)}%`
    );

    // 3. Regression guard: the old bug added a fixed block of static calories.
    check(
      `${p.name} @${p.target}: no stacked static overshoot`,
      day.total < p.target * 1.5,
      `total=${day.total} target=${p.target}`
    );

    // 4. Every meal's own calories must equal its ingredients.
    for (const m of day.meals) {
      const fromFood = Math.round(
        m.items.reduce((s, i) => s + i.qty * i.calPerUnit, 0)
      );
      check(
        `${p.name} @${p.target}: ${m.label} calories derived from food`,
        fromFood === m.calories,
        `food=${fromFood} shown=${m.calories}`
      );
    }

    // 5. A meal keeps the food it is supposed to be made of. Only the snack
    //    may shed a supporting ingredient, and the diet's anchor food is never
    //    dropped: trimming the beef jerky and serving cheese alone is not a
    //    carnivore snack, and "1 tbsp Olive Oil" is not a keto meal.
    const specs5 = getDietSampleDay(diet);
    day.meals.forEach((meal, idx) => {
      const spec = specs5[idx];
      check(
        `${p.name} @${p.target}: ${meal.label} keeps the diet's anchor food`,
        meal.items[0].name === spec.items[0].name,
        `${meal.description}`
      );
      if (meal.items.length < spec.items.length) {
        check(
          `${p.name} @${p.target}: only the snack may shed an ingredient (${meal.label})`,
          /SNACK/i.test(meal.label),
          `${meal.description}`
        );
      }
    });

    // 6. No meal may collapse or balloon relative to its share of the day.
    //    The first attempt at this fix charged the whole day's rounding
    //    residual to one anchor ingredient and printed "1 oz Ribeye Steak" as
    //    a midday meal at a 1,300-calorie target, while the day total stayed
    //    correct and every assertion above stayed green.
    const specs = getDietSampleDay(diet);
    day.meals.forEach((meal, idx) => {
      const share = p.target * specs[idx].share;
      check(
        `${p.name} @${p.target}: ${meal.label} is a real portion of the day (${meal.calories} vs ~${Math.round(share)})`,
        meal.calories >= share * 0.45 && meal.calories <= share * 1.8,
        `${meal.description}`
      );
    });
  }
  console.log('');
}

/**
 * Continuous sweep. The single worst defect in the first attempt at this fix
 * lived at 1,300 kcal — between every profile the suite sampled — and was
 * non-monotonic: 1,250 and 1,350 both produced a sane 2 oz steak while 1,300
 * produced 1 oz. Spot profiles cannot find that; sweep the whole plausible
 * range instead.
 */
console.log('Continuous sweep, 800-4000 kcal at 1-kcal steps, every diet\n');
let worstDrift = 0;
let worstAt = '';
let collapsed = 0;
let collapsedExample = '';
let anchorLost = 0;
let anchorExample = '';
let mainTrimmed = 0;
let trimExample = '';

for (const diet of DIETS) {
  const specs = getDietSampleDay(diet);
  for (let target = 800; target <= 4000; target += 1) {
    const day = buildSampleDay(specs, target);

    const drift = Math.abs(day.total - target) / target;
    if (drift > worstDrift) { worstDrift = drift; worstAt = `${diet} @${target} → ${day.total}`; }

    day.meals.forEach((meal, idx) => {
      const share = target * specs[idx].share;
      if (meal.calories < share * 0.45 || meal.calories > share * 1.8) {
        collapsed++;
        if (!collapsedExample) collapsedExample = `${diet} @${target} ${meal.label}: "${meal.description}" = ${meal.calories} vs share ~${Math.round(share)}`;
      }
      if (meal.calories !== Math.round(meal.items.reduce((s, i) => s + i.qty * i.calPerUnit, 0))) {
        collapsed++;
      }
      if (meal.items[0].name !== specs[idx].items[0].name) {
        anchorLost++;
        if (!anchorExample) anchorExample = `${diet} @${target} ${meal.label}: "${meal.description}"`;
      }
      if (meal.items.length < specs[idx].items.length && !/SNACK/i.test(meal.label)) {
        mainTrimmed++;
        if (!trimExample) trimExample = `${diet} @${target} ${meal.label}: "${meal.description}"`;
      }
    });
  }
}

check(`sweep: worst day drift within 8% (worst ${(worstDrift * 100).toFixed(1)}%)`, worstDrift <= 0.08, worstAt);
check('sweep: no meal collapses or balloons against its share', collapsed === 0, collapsedExample);
check('sweep: the diet anchor food is never dropped', anchorLost === 0, anchorExample);
check('sweep: no main meal ever sheds an ingredient', mainTrimmed === 0, trimExample);
console.log('');

// Shares must sum to 1 for every diet, or the day cannot hit the target.
for (const diet of DIETS) {
  const shareSum = dietSampleDays[diet].reduce((s, m) => s + m.share, 0);
  check(
    `${diet}: meal shares sum to 1`,
    Math.abs(shareSum - 1) < 1e-9,
    `sum=${shareSum}`
  );
}

// Unknown diet must fall back rather than throw.
check('unknown diet falls back to carnivore', getDietSampleDay('zzz') === dietSampleDays.carnivore);

console.log(`\n${checks - failures}/${checks} assertions passed`);
if (failures > 0) {
  console.error(`\n${failures} FAILED\n`);
  process.exit(1);
}
console.log('All sample-day arithmetic assertions passed.\n');
