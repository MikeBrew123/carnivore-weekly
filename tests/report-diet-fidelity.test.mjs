#!/usr/bin/env node
/**
 * tests/report-diet-fidelity.test.mjs
 *
 * EVERY DIET GETS ITS OWN REPORT (ISSUE-086).
 *
 * On 2026-08-10 a real pescatarian buyer's $29 report was titled "Carnivore Diet
 * Report" and mentioned beef 40 times, steak 29 times and pork 8 times: several
 * lookups were keyed on "Pescatarian" while the stored value was "pescatarian".
 * A `lowcarb` buyer would have got a 500 ("expected 30 days, got 0") because no
 * food carries a LowCarb tag. PescoDial adds four more diets on the same path.
 *
 * For every diet this renders the full report through the real path
 * (buildReportData + calculateMacros + generateAllReports, AI sections stubbed)
 * and asserts:
 *   A. it renders: no throw, a 30-day calendar and a shopping list exist;
 *   B. fish-only diets contain no land meat anywhere in the rendered report;
 *   C. the cover title names the reader's diet, never another one.
 *
 * Run: node tests/report-diet-fidelity.test.mjs
 */
import path from 'node:path';

const API = path.resolve(new URL('../api/calculator-api.js', import.meta.url).pathname);

const BASE_FORM = {
  sex: 'female', age: 58, heightFeet: 5, heightInches: 5, weight: 180, goalWeight: 150,
  lifestyle: 'light', exercise: '1-2', goal: 'lose', deficit: 20, ratio: 'moderate',
  email: 'diet-fidelity-fixture@example.com', firstName: 'Fixture', lastName: 'Persona',
  medications: '', conditions: ['none'], otherConditions: '', symptoms: ['none'], otherSymptoms: '',
  allergies: '', avoidFoods: '', previousDiets: '', whatWorked: '', carnivoreExperience: 'beginner',
  goals: ['weight-loss'], biggestChallenge: '', cookingSkill: 'basic', budget: 'moderate',
  familySituation: 'partner', workTravel: 'rarely', additionalNotes: '', mealsPerDay: 2,
};

// diet value as stored -> words the cover title must contain
const DIETS = {
  carnivore: { title: 'Carnivore', fishOnly: false },
  pescatarian: { title: 'Pescatarian', fishOnly: true },
  keto: { title: 'Keto', fishOnly: false },
  lowcarb: { title: 'Low Carb', fishOnly: false },
  'pesco-carnivore': { title: 'Pescatarian Carnivore', fishOnly: true },
  'pesco-keto': { title: 'Pescatarian Keto', fishOnly: true },
  'pesco-lowcarb': { title: 'Pescatarian Low Carb', fishOnly: true },
  // PescoDial's own report (Brew's design): a 7-day plan, not the 30-day calendar.
  'pesco-mediterranean': { title: 'Pescatarian Mediterranean', fishOnly: true, days: 7 },
};
const ONLY = process.argv.slice(2).filter(a => !a.startsWith('-'));

// Land meat that must never appear in a fish-only report. Word-boundary matches,
// so "beefsteak tomato" style false positives would still be caught on purpose.
const LAND_MEAT = /\b(beef|steaks?|ribeye|sirloin|brisket|pork|bacon|ham|lamb|chicken|turkey|duck|bison|venison|beef liver|chicken liver|calf liver|liver pâté|organ meats?|ground meat|chuck|sausage|pemmican|bone marrow|tallow|lard)\b/i;

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('anthropic.com')) {
    return { ok: true, json: async () => ({ content: [{ text: '[AI SECTION STUBBED]' }] }) };
  }
  if (realFetch) return realFetch(url, opts);
  throw new Error('unexpected network call to ' + u);
};

const api = await import('file://' + API);
const buildReportData = api.__test_buildReportData;
const calculateMacros = api.__test_calculateMacros;
const generateAllReports = api.__test_generateAllReports;
const wrapInPrintHTML = api.__test_wrapInPrintHTML;

let failed = 0;
const fail = (diet, msg) => { failed++; console.log(`FAIL ${diet}: ${msg}`); };

const quiet = ['log', 'info', 'warn', 'debug'].map(k => [k, console[k]]);
for (const [diet, want] of Object.entries(DIETS)) {
  if (ONLY.length && !ONLY.includes(diet)) continue;
  const form = { ...BASE_FORM, diet };
  const session = { id: 'fixture-' + diet, email: form.email, first_name: form.firstName,
                    last_name: form.lastName, diet_type: diet, form_data: form };
  let sections, html;
  for (const [k] of quiet) console[k] = () => {};
  try {
    const data = buildReportData(session);
    data.macros = calculateMacros(form);
    sections = await generateAllReports(data, 'sk-fixture-not-a-real-key');
    const md = Object.values(sections).join('\n\n');
    html = wrapInPrintHTML(md, data);
  } catch (err) {
    for (const [k, fn] of quiet) console[k] = fn;
    fail(diet, `A. report did not render: ${err.message.split('\n')[0]}`);
    continue;
  } finally {
    for (const [k, fn] of quiet) console[k] = fn;
  }
  let ok = true;
  if (want.days === 7) {
    const rows = (html.match(/<tr><th scope="row">(Mon|Tue|Wed|Thu|Fri|Sat|Sun)<\/th>/g) || []).length;
    if (rows !== 7) { ok = false; fail(diet, `A. 7-day plan has ${rows} day rows`); }
    if (!/data-pd-section="grocery"/.test(html)) { ok = false; fail(diet, 'A. no grocery list'); }
  } else {
    if (!/day\s*30/i.test(sections[3] || '')) { ok = false; fail(diet, 'A. no 30-day calendar'); }
    if (!(sections[4] || '').trim()) { ok = false; fail(diet, 'A. no shopping list'); }
  }
  if (want.fishOnly) {
    // A fish "steak" (tuna steak, salmon steak) is fish; strip those before matching.
    const text = html.replace(/\b(tuna|salmon|swordfish|halibut|cod|mahi[- ]mahi)\s+steaks?\b/gi, '$1');
    const m = text.match(LAND_MEAT);
    if (m) {
      ok = false;
      const i = text.search(LAND_MEAT);
      fail(diet, `B. land meat "${m[0]}" in a fish-only report: ...${text.slice(Math.max(0, i - 60), i + 40).replace(/\s+/g, ' ')}...`);
    }
  }
  const title = (html.match(/Personalized ([A-Za-z ]+?) (Diet )?(Report|Plan)/) || [])[1] || '';
  if (title !== want.title) { ok = false; fail(diet, `C. cover title says "${title}", want "${want.title}"`); }
  if (ok) console.log(`PASS ${diet}`);
}
process.exit(failed ? 1 : 0);
