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

    // 5. No zero or nonsensical portions.
    for (const m of day.meals) {
      for (const i of m.items) {
        check(
          `${p.name} @${p.target}: ${m.label} "${i.name}" portion is servable`,
          i.qty > 0,
          `qty=${i.qty}`
        );
      }
    }
  }
  console.log('');
}

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
