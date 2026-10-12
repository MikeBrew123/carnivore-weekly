#!/usr/bin/env node
/**
 * tests/kidney-understand-gate.test.mjs
 *
 * Run it:
 *     node tests/kidney-understand-gate.test.mjs
 *
 * No network, no database, no API key. Exits non-zero on any failure.
 *
 * Brew, 2026-10-12 (decision ledger, "KIDNEY DISEASE ON KETO/CARNIVORE" and
 * "KIDNEY WARNING COPY APPROVED"): a CW reader who mentions their kidneys gets the
 * FULL report only after ticking an "I understand" box, and the approved warning then
 * sits beside their numbers. Without the tick, the suppressed report is unchanged.
 *
 *   A  who is a kidney reader, and what a valid acknowledgment unlocks
 *   B  an acknowledged reader's report: warning first, full calendar and grocery list
 *   C  an unacknowledged reader's report is exactly the old suppressed one
 *   D  the model is told the right thing about protein
 *   E  only the server writes the acknowledgment, stamped with its own clock
 *   F  the approved copy, pinned verbatim
 *   G  PescoDial is untouched (Brew: "leave PD as is")
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const API = path.join(ROOT, 'api', 'calculator-api.js');
const worker = await import('file://' + API);
const {
  __test_generateAllReports: generateAllReports,
  __test_calculateMacros: calculateMacros,
  __test_RENAL_MEAL_CALENDAR_NOTICE: NOTICE_3,
  __test_RENAL_GROCERY_LIST_NOTICE: NOTICE_4,
} = worker;
const MC = await import('file://' + path.join(ROOT, 'api', 'medical-context.js'));
const {
  deriveMedicalContext, buildMedicalSafetyRules, buildProteinTargetNote, needsKidneyAck,
  applyCalorieGuidance, KIDNEY_ACK_VERSION, KIDNEY_ACK_SCREEN, KIDNEY_ACK_REPORT_WARNING,
} = MC;

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

const BASE = {
  sex: 'female', age: 54, heightFeet: 5, heightInches: 5, weight: 186, goalWeight: 150,
  goal: 'lose', deficit: 20, diet: 'Carnivore', selectedProtocol: 'Carnivore',
  firstName: 'Kidney', lastName: 'Fixture', budget: 'moderate',
  lifestyle: 'sedentary', exercise: '1-2', carnivoreExperience: 'beginner',
  goals: ['weight-loss'], medications: '', symptoms: ['fatigue'],
};
const ACK = { version: KIDNEY_ACK_VERSION, at: '2026-10-12T21:10:00.000Z' };
const HEALTHY = { ...BASE, conditions: ['none'], otherConditions: '' };
const RENAL = { ...BASE, conditions: [], otherConditions: 'Chronic kidney disease, stage 3' };
const NOT_SURE = { ...BASE, conditions: [], additionalNotes: "I'm not sure my kidneys are healthy" };
const RENAL_ACK = { ...RENAL, kidney_risk_ack: ACK };

// ---------------------------------------------------------------------------
// A  The flag set
// ---------------------------------------------------------------------------
{
  check('A', 'declared kidney disease triggers the screen', needsKidneyAck(RENAL));
  check('A', '"not sure" about kidneys triggers the screen (Brew 14:06)', needsKidneyAck(NOT_SURE));
  check('A', 'a healthy reader never sees the screen', !needsKidneyAck(HEALTHY));
  check('A', 'a stored acknowledgment does not hide the screen on a re-render',
    needsKidneyAck(RENAL_ACK));

  const plain = deriveMedicalContext(RENAL);
  check('A', 'no tick: protein target still withheld', plain.restrictProteinTarget === true);
  check('A', 'no tick: calories still suppressed', plain.calorieGuidance === 'suppressed');
  check('A', 'no tick: not acknowledged', plain.renalAcknowledged === false);

  const acked = deriveMedicalContext(RENAL_ACK);
  check('A', 'tick: protein target released', acked.restrictProteinTarget === false);
  check('A', 'tick: calories at maintenance, never a deficit', acked.calorieGuidance === 'qualified');
  check('A', 'tick: still a kidney reader', acked.renal === true && acked.renalAcknowledged === true);
  check('A', 'tick: electrolyte amounts stay withheld', acked.restrictElectrolyteTargets === true);

  const m = calculateMacros({ ...RENAL_ACK });
  const g = applyCalorieGuidance(m, acked);
  check('A', 'tick: the calorie figure is maintenance', g.calories === Math.round(m.tdee),
    `${g.calories} vs tdee ${m.tdee}`);
  check('A', 'tick: protein is the same number a healthy reader gets',
    g.protein_grams === calculateMacros({ ...HEALTHY }).protein_grams);

  for (const [label, ack] of [
    ['an old warning version', { ...ACK, version: 'kidney-warning-v1' }],
    ['no timestamp', { version: KIDNEY_ACK_VERSION }],
    ['a junk timestamp', { version: KIDNEY_ACK_VERSION, at: 'yesterday-ish' }],
    ['a bare true', true],
  ]) {
    check('A', `${label} unlocks nothing`,
      deriveMedicalContext({ ...RENAL, kidney_risk_ack: ack }).restrictProteinTarget === true);
  }
  check('A', 'an acknowledgment on a healthy reader changes nothing',
    deriveMedicalContext({ ...HEALTHY, kidney_risk_ack: ACK }).calorieGuidance === 'normal');
}

// ---------------------------------------------------------------------------
// Report builds
// ---------------------------------------------------------------------------
const COMPLIANT_AI =
  'Your daily numbers are listed below. People report a wide range of first-week ' +
  'experiences, and yours may differ. Take these figures to your doctor before you start.';
const prompts = [];
function stub() {
  globalThis.fetch = async (url, init) => {
    if (String(url).includes('api.anthropic.com')) {
      prompts.push(String(init && init.body || ''));
      return { ok: true, status: 200, json: async () => ({ content: [{ text: COMPLIANT_AI }] }) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
}
const quiet = () => {
  const real = {};
  for (const k of ['log', 'info', 'warn', 'debug', 'error']) { real[k] = console[k]; console[k] = () => {}; }
  return () => Object.assign(console, real);
};
async function build(form) {
  stub();
  prompts.length = 0;
  const restore = quiet();
  try {
    const data = { ...form };
    data.macros = calculateMacros(data);
    const reports = await generateAllReports(data, 'test-key');
    return { reports, prompts: prompts.join('\n'), data };
  } finally { restore(); }
}

const acked = await build(RENAL_ACK);
const plain = await build(RENAL);
const healthy = await build(HEALTHY);
const ackText = Object.values(acked.reports).join('\n');

// ---------------------------------------------------------------------------
// B  Acknowledged reader
// ---------------------------------------------------------------------------
{
  const r1 = acked.reports[1] || '';
  const w = r1.indexOf(KIDNEY_ACK_REPORT_WARNING);
  check('B', 'the kidney warning is in Report #1', w >= 0);
  check('B', 'it comes before anything the model wrote', w >= 0 && w < r1.indexOf(COMPLIANT_AI));
  check('B', 'it is the first thing in the warning box',
    w >= 0 && r1.indexOf('Conditions you reported') > w);
  check('B', 'all thirteen sections generate', Object.keys(acked.reports).length === 13);
  check('B', 'Report #3 is a real meal calendar, not the notice',
    !(acked.reports[3] || '').includes(NOTICE_3) && /\bDay\s*1\b/i.test(acked.reports[3] || ''));
  check('B', 'Report #4 is a real grocery list, not the notice',
    !(acked.reports[4] || '').includes(NOTICE_4) && /\d+\s*(?:lb|lbs|g|oz)\b/i.test(acked.reports[4] || ''));
  check('B', 'the old "no protein target" kidney paragraph is gone',
    !/does not give you a daily protein/.test(ackText));
  check('B', 'the physician guide carries the same warning, not "do not use this script"',
    buildProteinTargetNote(deriveMedicalContext(RENAL_ACK)).includes(KIDNEY_ACK_REPORT_WARNING));
}

// ---------------------------------------------------------------------------
// C  Unacknowledged and healthy readers are unchanged
// ---------------------------------------------------------------------------
{
  check('C', 'no tick: Report #3 is the suppression notice', (plain.reports[3] || '').includes(NOTICE_3));
  check('C', 'no tick: Report #4 is the suppression notice', (plain.reports[4] || '').includes(NOTICE_4));
  check('C', 'no tick: the kidney warning is not shown',
    !Object.values(plain.reports).join('\n').includes(KIDNEY_ACK_REPORT_WARNING));
  check('C', 'healthy reader never sees the kidney warning',
    !Object.values(healthy.reports).join('\n').includes(KIDNEY_ACK_REPORT_WARNING));
  check('C', 'healthy reader keeps a real calendar', /\bDay\s*1\b/i.test(healthy.reports[3] || ''));
}

// ---------------------------------------------------------------------------
// D  What the model is told
// ---------------------------------------------------------------------------
{
  const protein = applyCalorieGuidance(acked.data.macros, deriveMedicalContext(RENAL_ACK)).protein_grams;
  check('D', 'tick: the model is given the protein figure, not WITHHELD',
    !/Protein: WITHHELD/.test(acked.prompts) && acked.prompts.includes(String(protein)));
  check('D', 'tick: the model is told rule 9 does not apply and to change nothing',
    /Rule 9 does NOT apply/.test(acked.prompts) && /Never change it/.test(acked.prompts));
  check('D', 'tick: the model may not call the plan safe for kidneys',
    /never say this plan is safe or good for their kidneys/.test(acked.prompts));
  check('D', 'no tick: rule 9 is still active', /Rule 9 is ACTIVE/.test(plain.prompts));
  check('D', 'no tick: protein still WITHHELD to the model', /Protein: WITHHELD/.test(plain.prompts));
  const rules = buildMedicalSafetyRules(deriveMedicalContext(RENAL_ACK));
  check('D', 'tick: sodium, potassium and fluid amounts are still off limits',
    /Do not set sodium, potassium or fluid amounts/.test(rules));
}

// ---------------------------------------------------------------------------
// E  The server writes the acknowledgment, nothing else does
// ---------------------------------------------------------------------------
async function step4(clientData, { dietType = 'carnivore', stored = {} } = {}) {
  let patched = null;
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.includes('/rest/v1/cw_assessment_sessions') && (init.method || 'GET') === 'GET') {
      return { ok: true, status: 200, json: async () => ([{
        id: 'a1b2c3d4-0000-4000-8000-000000000001', payment_status: 'completed',
        diet_type: dietType, form_data: { ...BASE, ...stored },
      }]) };
    }
    if (u.includes('/rest/v1/calculator_reports')) return { ok: true, status: 200, json: async () => [] };
    if (u.includes('/rest/v1/cw_assessment_sessions') && init.method === 'PATCH') {
      patched = JSON.parse(init.body);
      return { ok: true, status: 204, json: async () => ({}), text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  const restore = quiet();
  try {
    const res = await worker.default.fetch(new Request('https://api.test/api/v1/calculator/step/4', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessment_id: 'a1b2c3d4-0000-4000-8000-000000000001', data: clientData }),
    }), { SUPABASE_URL: 'https://db.test', SUPABASE_SERVICE_ROLE_KEY: 'k' }, { waitUntil() {} });
    return { status: res.status, form: patched && patched.form_data };
  } finally { restore(); }
}
{
  const before = Date.now();
  const ok = await step4({ otherConditions: 'CKD stage 3', kidneyRiskAcknowledged: true, kidneyAckVersion: KIDNEY_ACK_VERSION });
  const stamp = ok.form && ok.form.kidney_risk_ack;
  check('E', 'ticked kidney reader: acknowledgment stored', !!stamp && stamp.version === KIDNEY_ACK_VERSION, JSON.stringify(ok));
  check('E', 'stamped with the server clock', !!stamp && Date.parse(stamp.at) >= before - 1000 && Date.parse(stamp.at) <= Date.now() + 1000);
  check('E', 'the stored stamp unlocks the report', deriveMedicalContext({ ...BASE, ...ok.form }).renalAcknowledged === true);

  const unticked = await step4({ otherConditions: 'CKD stage 3' });
  check('E', 'unticked: nothing stored', unticked.form && !('kidney_risk_ack' in unticked.form));

  const forged = await step4({ otherConditions: 'CKD stage 3', kidney_risk_ack: ACK });
  check('E', 'a client-supplied stamp is never stored', forged.form && !('kidney_risk_ack' in forged.form));

  const stale = await step4({ otherConditions: 'CKD stage 3', kidneyRiskAcknowledged: true, kidneyAckVersion: 'kidney-warning-v1' });
  check('E', 'a tick on old warning text is not stored', stale.form && !('kidney_risk_ack' in stale.form));

  const healthyTick = await step4({ otherConditions: '', kidneyRiskAcknowledged: true, kidneyAckVersion: KIDNEY_ACK_VERSION });
  check('E', 'a tick from a non-kidney reader is not stored', healthyTick.form && !('kidney_risk_ack' in healthyTick.form));

  const untick = await step4({ otherConditions: 'CKD stage 3' }, { stored: { kidney_risk_ack: ACK } });
  check('E', 'resubmitting without the tick clears an earlier one', untick.form && !('kidney_risk_ack' in untick.form));

  const pd = await step4({ otherConditions: 'CKD stage 3', kidneyRiskAcknowledged: true, kidneyAckVersion: KIDNEY_ACK_VERSION }, { dietType: 'pesco-keto' });
  check('E', 'PescoDial: never stored', pd.form && !('kidney_risk_ack' in pd.form));

  const src = fs.readFileSync(API, 'utf8');
  check('E', 'create-checkout strips a client-supplied stamp',
    /const finalFormData = form_data \|\| formData;[\s\S]{0,300}delete finalFormData\.kidney_risk_ack/.test(src));
  check('E', 'kidney_risk_ack is not a Step 4 field a client can set',
    !/STEP4_FIELDS = new Set\(\[[^\]]*kidney_risk_ack/.test(src));
}

// ---------------------------------------------------------------------------
// F  The approved copy (Brew 14:06, Sarah's v2), verbatim
// ---------------------------------------------------------------------------
{
  check('F', 'heading', KIDNEY_ACK_SCREEN.heading === 'This plan is hard on kidneys');
  check('F', 'checkbox', KIDNEY_ACK_SCREEN.checkbox ===
    'I understand this plan is hard on struggling kidneys, the damage can be silent and permanent, and I choose to go ahead anyway.');
  check('F', 'unchecked line', KIDNEY_ACK_SCREEN.unchecked ===
    'Leave this box unchecked and your report will not include a protein target, a calorie target, the 30-day meal calendar or the grocery lists. It will send those questions to a doctor or renal dietitian instead.');
  check('F', 'button', KIDNEY_ACK_SCREEN.button === 'Build my full plan');
  check('F', 'body opens for both kidney and "not sure" readers',
    KIDNEY_ACK_SCREEN.body.startsWith("You told us your kidneys have problems, or you're not sure they're healthy."));
  check('F', 'body says the damage is silent and often permanent',
    /The damage is usually silent\. By the time you notice it, it is often permanent\./.test(KIDNEY_ACK_SCREEN.body));
  check('F', 'report box', KIDNEY_ACK_REPORT_WARNING.startsWith('**This plan is hard on struggling kidneys.** These are the same numbers a reader with healthy kidneys gets.'));
  const all = [...Object.values(KIDNEY_ACK_SCREEN), KIDNEY_ACK_REPORT_WARNING].join(' ');
  check('F', 'no em dashes', !all.includes('—'));
  check('F', 'no lower or "safer" number anywhere', !/\d/.test(all.replace(/30-day/, '')));
  const step4 = fs.readFileSync(path.join(ROOT, 'calculator2-demo', 'src', 'components', 'calculator', 'steps', 'Step4HealthProfile.tsx'), 'utf8');
  check('F', 'the form renders the shared copy, not its own', /KIDNEY_ACK_SCREEN\.(heading|body|checkbox|unchecked)/.test(step4)
    && !step4.includes('This plan is hard on kidneys'));
}

// ---------------------------------------------------------------------------
// G  PescoDial unchanged
// ---------------------------------------------------------------------------
{
  for (const diet of ['pesco-keto', 'pesco-carnivore']) {
    const ctx = deriveMedicalContext({ ...RENAL_ACK, diet, diet_type: diet });
    check('G', `${diet}: an acknowledgment unlocks nothing`, ctx.restrictProteinTarget === true && !ctx.renalAcknowledged);
    check('G', `${diet}: no kidney screen`, !needsKidneyAck({ ...RENAL, diet }));
  }
}

const groups = [...new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G'])].join(' ');
console.log(`kidney-understand-gate: ${passed} passed, ${failures.length} failed  (groups ${groups})`);
for (const f of failures) console.log(`  FAIL [${f.group}] ${f.label}${f.detail ? ' :: ' + f.detail : ''}`);
process.exit(failures.length ? 1 : 0);
