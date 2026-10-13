// Render the real CW paid report for a fictional reader, Anthropic stubbed. Used by build.sh.
import path from 'node:path'; import fs from 'node:fs';
const root = process.argv[2], out = process.argv[3];
const calls = [];
globalThis.fetch = async (url, init) => {
  if (String(url).includes('anthropic.com')) { calls.push(init?.body?.slice?.(0,200)); return { ok: true, json: async () => ({ content: [{ text: '## Report #1: Executive Summary\n\nAI_STUB_SECTION' }] }) }; }
  throw new Error('unexpected network call to ' + url);
};
const api = await import('file://' + path.join(root, 'api/calculator-api.js'));
const form = { sex: 'female', age: 56, heightFeet: 5, heightInches: 5, weight: 182, goalWeight: 150,
  lifestyle: 'light', goal: 'lose', deficit: 20, firstName: 'Your', lastName: 'Name',
  conditions: ['none'], symptoms: ['none'], medications: '', otherConditions: '', otherSymptoms: '',
  allergies: '', avoidFoods: '', mealsPerDay: 2, diet: 'carnivore' };
const log = console.log; console.log = () => {}; console.info = () => {}; console.warn = () => {};
const d = api.__test_buildReportData({ id: 'x', diet_type: form.diet, form_data: form });
d.macros = api.__test_calculateMacros(form);
const s = await api.__test_generateAllReports(d, 'k');
let md = ''; for (let i = 1; i <= 13; i++) if (s[i]) md += (i > 1 ? '\n\n---\n\n' : '') + s[i];
const html = api.__test_wrapInPrintHTML(md, d);
fs.writeFileSync(out, html);
console.log = log;
console.log('anthropic calls stubbed:', calls.length, 'html bytes', html.length);
for (let i = 1; i <= 13; i++) console.log(i, (s[i]||'').split('\n')[0].slice(0,80), (s[i]||'').includes('AI_STUB') ? '[STUB]' : '');
