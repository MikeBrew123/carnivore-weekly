#!/usr/bin/env node
// PescoDial Pescatarian Mediterranean week (api/pd-meal-plan.js).
// A. every day of every target lands near the reader's numbers (from the ROUNDED
//    quantities the reader is told to cook): calories within 7%, protein 90-130%,
//    fat within 30%;
// B. 5 fish meals a week, lowest-mercury species only (Brew 2026-10-03);
// C. restrictions remove dishes (shellfish, eggs) and never leave the food in;
//    a reader who excludes all fish gets a refusal, not a fish-free "pescatarian" plan;
// D. the grocery list is derived from the week and matches it item for item;
// E. no calorie target, no plan.
// Run: node tests/pd-meal-plan.test.mjs
import assert from 'node:assert/strict';
import { buildPescoMedWeek, groceryFromWeek, PD_PLAN_DAYS } from '../api/pd-meal-plan.js';
import { PD_FOODS } from '../api/pd-foods.js';

let failed = 0;
const check = (name, fn) => { try { fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '-', e.message); } };
const LOW_MERCURY = new Set(['salmon', 'sardines', 'shrimp', 'cod', 'tilapia', 'trout', 'tuna']);
const FISH = new Set([...LOW_MERCURY]);

const TARGETS = [];
for (const cal of [1200, 1356, 1500, 1700, 1900, 2100, 2300, 2600]) {
  TARGETS.push({ calories: cal, protein_grams: Math.round(cal * 0.06), fat_grams: Math.round(cal * 0.35 / 9) });
}

check('A. every day within tolerance across 8 targets', () => {
  for (const m of TARGETS) {
    const w = buildPescoMedWeek(m);
    assert.equal(w.days.length, PD_PLAN_DAYS);
    for (const d of w.days) {
      const t = d.totals, tag = `${m.calories} ${d.day}`;
      assert.ok(Math.abs(t.kcal - m.calories) <= 0.07 * m.calories, `${tag}: ${t.kcal} kcal`);
      assert.ok(t.protein >= 0.9 * m.protein_grams && t.protein <= 1.3 * m.protein_grams, `${tag}: protein ${t.protein}/${m.protein_grams}`);
      assert.ok(Math.abs(t.fat - m.fat_grams) <= 0.3 * m.fat_grams, `${tag}: fat ${t.fat}/${m.fat_grams}`);
    }
  }
});

check('B. 5 fish meals a week, lowest-mercury species only', () => {
  const w = buildPescoMedWeek(TARGETS[2]);
  const fishMeals = w.days.flatMap(d => d.meals).filter(m => m.fish);
  assert.equal(fishMeals.length, 5);
  for (const m of fishMeals) for (const it of m.items) if (PD_FOODS[it.food].section === 'Seafood') assert.ok(LOW_MERCURY.has(it.food), it.food);
});

check('C1. shellfish allergy removes shrimp dishes, keeps 5 fish meals', () => {
  const w = buildPescoMedWeek(TARGETS[2], (k, f) => /shrimp|shellfish|crustacean/i.test(k + ' ' + (f.usda || '')));
  const all = w.days.flatMap(d => d.meals).flatMap(m => m.items.map(i => i.food));
  assert.ok(!all.includes('shrimp'));
  assert.equal(w.days.flatMap(d => d.meals).filter(m => m.fish).length, 5);
});

check('C2. egg allergy: no eggs anywhere', () => {
  const w = buildPescoMedWeek(TARGETS[2], k => k === 'eggs');
  assert.equal(w.days.length, 7);
  assert.ok(!w.days.flatMap(d => d.meals).flatMap(m => m.items).some(i => i.food === 'eggs'));
});

check('C3. excluding all fish is refused, not a fish-free plan', () => {
  const w = buildPescoMedWeek(TARGETS[2], k => FISH.has(k));
  assert.equal(w.days.length, 0);
  assert.ok(w.warnings.length > 0);
});

check('D. grocery list is the sum of the week, item for item', () => {
  const w = buildPescoMedWeek(TARGETS[3]);
  const g = groceryFromWeek(w);
  const fromWeek = {};
  for (const d of w.days) for (const m of d.meals) for (const i of m.items) fromWeek[i.food] = (fromWeek[i.food] || 0) + i.qty;
  const fromList = {};
  for (const list of Object.values(g)) for (const i of list) fromList[i.food] = i.qty;
  assert.deepEqual(fromList, fromWeek);
  assert.throws(() => groceryFromWeek({ days: [] }));
});

check('E. no usable target, no plan', () => {
  assert.throws(() => buildPescoMedWeek({ calories: null, protein_grams: 80, fat_grams: 50 }));
  assert.throws(() => buildPescoMedWeek({}));
});

process.exit(failed ? 1 : 0);
