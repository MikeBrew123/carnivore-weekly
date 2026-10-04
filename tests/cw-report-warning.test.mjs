#!/usr/bin/env node
/**
 * tests/cw-report-warning.test.mjs
 *
 * CW paid report, CLAUDE.md "Medicine or a relevant condition: numbers plus a
 * warning that says why" (Brew, 2026-10-04). Renders through the real path with the
 * model stubbed. The stub puts the reader's numbers in Report #1, as the live model does.
 *
 *   A. a reader who declared a medicine or a condition sees the warning in Report #1,
 *      under its heading and ABOVE the numbers the model wrote;
 *   B. a reader who declared nothing, or only symptoms, gets Report #1 unchanged;
 *   C. the blood-thinner line is true for every diet's plan: organ meats really are
 *      absent, and it no longer claims leafy greens were removed (keto and low-carb
 *      plans schedule broccoli).
 *
 * Run: node tests/cw-report-warning.test.mjs
 */
import path from 'node:path';

const SUMMARY = '## Report #1: Executive Summary\n\nYour daily target is NUMBERS_FROM_MODEL calories.';
globalThis.fetch = async (url) => {
  if (String(url).includes('anthropic.com')) return { ok: true, json: async () => ({ content: [{ text: SUMMARY }] }) };
  throw new Error('unexpected network call to ' + url);
};
const api = await import('file://' + path.resolve(new URL('../api/calculator-api.js', import.meta.url).pathname));

const BASE = {
  sex: 'female', age: 58, heightFeet: 5, heightInches: 5, weight: 180, goalWeight: 150,
  lifestyle: 'light', goal: 'lose', deficit: 20, firstName: 'M', lastName: 'E',
  conditions: ['none'], symptoms: ['none'], medications: '', otherConditions: '', otherSymptoms: '',
  allergies: '', avoidFoods: '', mealsPerDay: 2, diet: 'carnivore',
};
const quiet = ['log', 'info', 'warn', 'debug'].map(k => [k, console[k]]);
async function render(over) {
  const form = { ...BASE, ...over };
  for (const [k] of quiet) console[k] = () => {};
  try {
    const d = api.__test_buildReportData({ id: 'x', diet_type: form.diet, form_data: form });
    d.macros = api.__test_calculateMacros(form);
    return await api.__test_generateAllReports(d, 'k');
  } finally { for (const [k, fn] of quiet) console[k] = fn; }
}

let failed = 0;
async function check(name, fn) {
  try { await fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, '-', e.message); }
}
const ok = (c, m) => { if (!c) throw new Error(m); };
const BANNER = 'What you told us, and what it means for this report';

for (const [label, over] of [
  ['blood pressure medicine', { medications: 'lisinopril' }],
  ['diabetes medicine', { medications: 'metformin' }],
  ['blood thinner', { medications: 'warfarin' }],
  ['blood pressure condition, no medicine', { otherConditions: 'high blood pressure' }],
  ['kidney disease', { otherConditions: 'CKD stage 3' }],
]) {
  await check(`A. ${label}: warning sits under the Report #1 heading, above the numbers`, async () => {
    const s = await render(over);
    const r1 = s[1];
    ok(r1.startsWith('## Report #1: Executive Summary\n'), 'heading moved');
    const b = r1.indexOf(BANNER), n = r1.indexOf('NUMBERS_FROM_MODEL');
    ok(b > 0 && n > b, `banner at ${b}, numbers at ${n}`);
  });
}

for (const [label, over] of [['nothing declared', {}], ['symptoms only', { symptoms: ['bloating'] }]]) {
  await check(`B. ${label}: Report #1 unchanged`, async () => {
    const s = await render(over);
    ok(s[1] === SUMMARY, 'Report #1 was changed');
  });
}

for (const diet of ['carnivore', 'pescatarian', 'keto', 'lowcarb']) {
  await check(`C. ${diet} + blood thinner: the warning matches the plan`, async () => {
    const s = await render({ medications: 'warfarin', diet });
    const all = Object.values(s).join('\n');
    const plan = (s[3] || '') + (s[4] || '');
    ok(all.includes('Organ meats have been left out of your meal plan.'), 'new line missing');
    ok(!all.includes('have had those items left out'), 'old greens-removed claim still present');
    // The plan itself, not its quoted notes (one of which says liver was left out).
    const food = plan.split('\n').filter(l => !l.startsWith('>')).join('\n');
    const hit = food.match(/[^\n]{0,40}\b(liver|organ meats?|heart|kidneys?)\b[^\n]{0,40}/i);
    ok(!hit, `organ meat in a plan we said has none: ${hit && hit[0]}`);
  });
}

process.exit(failed ? 1 : 0);
