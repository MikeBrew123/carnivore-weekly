#!/usr/bin/env node
/**
 * tests/health-context-flow.test.mjs
 *
 * THE DATA-FLOW INVARIANT FOR CUSTOMER-ENTERED HEALTH TEXT.
 *
 * Run it:
 *     node tests/health-context-flow.test.mjs
 *
 * No dependencies, no network, no database, no API key. Exits non-zero on failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-09-08 a customer typed a structural diagnosis into the free-text
 * `otherSymptoms` box. buildProfile() put it in the prompt for reports #1 and #6 under
 * CURRENT SYMPTOMS. deriveMedicalContext() read only conditions and medications, so
 * the safety layer never saw it. The live-written section then told her that protein
 * was "essential for pelvic floor tissue integrity" and that the diet "can support the
 * tissue integrity" of the thing she was living with.
 *
 * Nothing was misconfigured. The model was handed a diagnosis and given no rule about
 * it, because the gate and the prompt read different fields.
 *
 * THE ACCEPTANCE TEST THIS FILE ENCODES:
 *
 *     If a customer-entered field can influence generated health prose, the same
 *     text must also reach the safety classifier. Both halves, for every field.
 *
 * That is deliberately not "does the word prolapse appear in a blacklist". A blacklist
 * fixes one customer. GROUP A below walks HEALTH_CONTEXT_FIELDS and proves the
 * property for every enumerated field at once, so adding a questionnaire field without
 * wiring it in fails here rather than in someone's report.
 *
 * ---------------------------------------------------------------------------
 * PERSONAS ARE SYNTHETIC
 * ---------------------------------------------------------------------------
 * No real customer's text appears in this file. The conditions below were chosen to
 * exercise the same shapes (a pelvic-organ diagnosis, a connective-tissue diagnosis, a
 * benign symptom, a family member's illness mentioned in a notes box) with invented
 * details.
 */

import { fileURLToPath } from 'url';
import path from 'path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = path.join(HERE, '..', 'api', 'calculator-api.js');
const MED = path.join(HERE, '..', 'api', 'medical-context.js');

const failures = [];
const pass = [];
function check(group, label, ok, detail = '') {
  if (ok) pass.push(`${group}: ${label}`);
  else failures.push({ group, label, detail });
}

// ---------------------------------------------------------------------------
// Capture the prompts the worker would have sent to Claude for reports #1 and #6.
// ---------------------------------------------------------------------------
const captured = {};
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts = {}) => {
  const u = String(url);
  if (u.includes('api.anthropic.com')) {
    const body = JSON.parse(opts.body || '{}');
    (captured[globalThis.__persona] ||= []).push({
      system: body.system,
      user: body.messages?.[0]?.content || ''
    });
    return { ok: true, json: async () => ({ content: [{ text: '[AI SECTION STUBBED]' }] }) };
  }
  if (realFetch) return realFetch(url, opts);
  throw new Error('health-context-flow: unexpected network call to ' + u);
};

const api = await import('file://' + API);
const med = await import('file://' + MED);

const {
  __test_buildReportData: buildReportData,
  __test_calculateMacros: calculateMacros,
  __test_generateAllReports: generateAllReports,
} = api;
const { deriveMedicalContext, HEALTH_CONTEXT_FIELDS, buildMedicalSafetyRules } = med;

for (const [name, fn] of Object.entries({ buildReportData, calculateMacros, generateAllReports })) {
  if (typeof fn !== 'function') {
    console.error(`FATAL: api/calculator-api.js no longer exports ${name} on its TEST SURFACE.`);
    process.exit(2);
  }
}
if (!HEALTH_CONTEXT_FIELDS || !deriveMedicalContext) {
  console.error('FATAL: api/medical-context.js must export HEALTH_CONTEXT_FIELDS and deriveMedicalContext.');
  process.exit(2);
}

const BASE = {
  sex: 'female', age: 58, heightFeet: 5, heightInches: 6, weight: 150,
  lifestyle: 'light', exercise: '1-2', goal: 'maintain', deficit: 0,
  diet: 'Carnivore', email: 'health-context-fixture@example.com',
  firstName: 'Fixture', lastName: 'Persona',
  medications: '', conditions: ['none'], otherConditions: '',
  symptoms: ['none'], otherSymptoms: '',
  allergies: '', avoidFoods: '', previousDiets: '', whatWorked: '',
  carnivoreExperience: 'beginner', goals: ['energy'], biggestChallenge: 'none',
  cookingSkill: 'basic', budget: 'moderate', familySituation: 'partner',
  workTravel: 'remote', additionalNotes: ''
};

async function render(id, form) {
  globalThis.__persona = id;
  captured[id] = [];
  const session = {
    id: 'fixture-' + id, email: form.email,
    first_name: form.firstName, last_name: form.lastName,
    diet_type: form.diet, form_data: form
  };
  const data = buildReportData(session);
  data.macros = calculateMacros(form);
  const sections = await generateAllReports(data, 'sk-fixture-not-a-real-key');
  const full = Object.keys(sections).sort((a, b) => a - b)
    .map(k => sections[k]).filter(Boolean).join('\n\n---\n\n');
  const prompts = (captured[id] || []).map(c => `${c.system}\n${c.user}`).join('\n\n');
  return { data, sections, full, prompts, ctx: deriveMedicalContext(data) };
}

const quiet = ['log', 'info', 'warn', 'debug'].map(k => [k, console[k]]);
for (const [k] of quiet) console[k] = () => {};

try {

// ===========================================================================
// GROUP A — CASE 1. Every enumerated health field reaches BOTH the model and the gate.
//
// The sentinel is a renal phrase because kidney disease has the sharpest observable
// consequence in the classifier (restrictProteinTarget). If a field is readable by
// the prompt builder but invisible to deriveMedicalContext, exactly one of the two
// assertions below fails, and the failure names the field.
// ===========================================================================
const SENTINEL = 'stage 3 chronic kidney disease';

// The fields a customer can actually type into. Driven end to end: form -> session ->
// buildReportData -> prompt, and form -> deriveMedicalContext.
const FORM_FIELDS = ['conditions', 'otherConditions', 'medications',
                     'symptoms', 'otherSymptoms', 'additionalNotes'];

for (const field of FORM_FIELDS) {
  const r = await render(`A-${field}`, { ...BASE, [field]: SENTINEL });

  check('A', `${field}: text reaches the AI prompt`,
    r.prompts.toLowerCase().includes(SENTINEL),
    `"${SENTINEL}" put in ${field} never appeared in the prompts for reports #1/#6`);

  check('A', `${field}: same text reaches the safety classifier`,
    r.ctx.renal === true,
    `deriveMedicalContext() did not see ${field}, so the model gets a diagnosis the ` +
    `gate does not. That is the 2026-09-08 defect, in a different field.`);

  check('A', `${field}: renal suppression actually fires`,
    r.ctx.restrictProteinTarget === true,
    'kidney disease declared but the protein target was not suppressed');
}

// The alias names buildReportData() writes onto the data object (otherSymptoms ->
// currentSymptoms, additionalNotes -> challenges, conditions -> healthConditions).
// A customer cannot set these directly, and buildReportData overwrites them, so they
// are asserted against the classifier directly: any generator that reads the data
// object by its alias name must still be seen by the gate.
const ALIAS_FIELDS = ['healthConditions', 'currentSymptoms', 'currentMedications', 'challenges'];
for (const field of ALIAS_FIELDS) {
  const ctx = deriveMedicalContext({ [field]: SENTINEL });
  check('A', `${field} (derived alias): the classifier reads it`,
    ctx.renal === true,
    `deriveMedicalContext() ignores the "${field}" alias that buildReportData() writes`);
}

// Every enumerated field must be one or the other, so the map cannot grow a name
// that nothing actually checks.
for (const [group, fields] of Object.entries(HEALTH_CONTEXT_FIELDS)) {
  for (const field of fields) {
    check('A', `HEALTH_CONTEXT_FIELDS.${group}.${field} is exercised by this suite`,
      FORM_FIELDS.includes(field) || ALIAS_FIELDS.includes(field),
      `${field} is enumerated but no case drives it; add it to FORM_FIELDS or ALIAS_FIELDS`);
  }
}

// A guard on the map itself: the fields the prompt builder reads for health context
// must all be enumerated. This is the line that makes adding a questionnaire field
// without wiring it in fail here.
const ENUMERATED = new Set(Object.values(HEALTH_CONTEXT_FIELDS).flat());
for (const f of ['conditions', 'otherConditions', 'medications', 'symptoms', 'otherSymptoms', 'additionalNotes']) {
  check('A', `${f} is enumerated in HEALTH_CONTEXT_FIELDS`, ENUMERATED.has(f),
    `${f} reaches the AI prompt via buildProfile()/buildExecutiveSummarySystemPrompt but is not in the map`);
}

// ===========================================================================
// GROUP B — CASE 2 and CASE 3. Condition-specific treatment claims are prohibited,
// and the prohibition is delivered to the model that writes reports #1 and #6.
//
// Reports #1 and #6 are written live by Claude, so this suite cannot assert their
// text (see tests/report-safety.test.mjs on the same limitation). What it CAN assert,
// and what actually failed on 2026-09-08, is that the governing prompt carries the
// rule and names the reader's reported context. A model that is never told cannot
// comply.
// ===========================================================================
const CLAIM_PERSONAS = [
  { id: 'B-pelvic', label: 'pelvic-organ condition',
    form: { ...BASE, otherSymptoms: 'bladder prolapse, stage 2, diagnosed last year' },
    mustName: 'prolapse' },
  { id: 'B-connective', label: 'connective-tissue condition',
    form: { ...BASE, otherConditions: 'hypermobile joint syndrome, connective tissue disorder' },
    mustName: 'connective tissue' },
];

for (const persona of CLAIM_PERSONAS) {
  const r = await render(persona.id, persona.form);

  check('B', `${persona.label}: counts as reported health context`,
    r.ctx.restrictConditionClaims === true,
    'restrictConditionClaims is false, so the claim rules never activate');

  check('B', `${persona.label}: the prompt carries the no-treatment-claim rule`,
    /never claim, imply or hint that this diet treats/i.test(r.prompts),
    'rule 11 is missing from the system prompt for reports #1/#6');

  check('B', `${persona.label}: the prompt forbids tissue/ligament repair language`,
    /connective-tissue repair, healing, support, integrity or strengthening/i.test(r.prompts),
    'rule 12 is missing from the system prompt');

  check('B', `${persona.label}: the prompt forbids testimonials as evidence`,
    /testimonials, anecdotes, success stories/i.test(r.prompts),
    'the testimonial prohibition is missing');

  check('B', `${persona.label}: the prompt forbids inflammation-as-treatment framing`,
    /reduced inflammation as a treatment mechanism/i.test(r.prompts),
    'the inflammation-mechanism prohibition is missing');

  check('B', `${persona.label}: rules 11/12 are marked ACTIVE and name what was reported`,
    /Rules 11 and 12 are ACTIVE/i.test(r.prompts) &&
      r.prompts.toLowerCase().includes(persona.mustName),
    'the active note does not name the reader\'s reported context');

  // The shipped templates must not make the claim either. This is the half that is
  // testable end to end, and Report #8 used to interpolate the reader's own symptom
  // into "shows promising results for {{goal}} and {{symptoms}}".
  const CLAIMY = [
    /promising results for [^.\n]*(prolapse|connective|hypermobil)/i,
    /(heals?|repairs?|reverses?|restores?)\s+(your\s+)?(pelvic|prolapse|connective tissue|ligaments?|tendons?)/i,
    /essential for [^.\n]{0,40}tissue integrity/i,
    /support[s]? (the )?tissue integrity/i,
  ];
  for (const rx of CLAIMY) {
    const hit = r.full.match(rx);
    check('B', `${persona.label}: rendered sections make no claim matching ${rx.source.slice(0, 42)}`,
      !hit, hit ? `found: "${hit[0]}"` : '');
  }
}

// ===========================================================================
// GROUP C — CASE 4. A benign free-text symptom must not strip ordinary nutrition
// content. Over-suppression is a real failure mode, not a safe default: a reader who
// types "bloating" paid for macros, a food list and a meal plan.
// ===========================================================================
{
  const benign = await render('C-benign', { ...BASE, otherSymptoms: 'occasional bloating after meals' });

  check('C', 'benign symptom does not suppress the protein target',
    benign.ctx.restrictProteinTarget === false,
    'a benign symptom triggered kidney-disease protein suppression');
  check('C', 'benign symptom does not suppress electrolyte numbers',
    benign.ctx.restrictElectrolyteTargets === false,
    'a benign symptom triggered the electrolyte restriction');
  check('C', 'benign symptom still counts as reported context for claim scope',
    benign.ctx.restrictConditionClaims === true,
    'we must still not tell this reader the diet treats their bloating');

  const electrolytes = benign.sections[10] || '';
  check('C', 'benign symptom: Report #10 still prints a sodium range',
    /\d\s*-\s*\d\s*grams a day/i.test(electrolytes),
    'the quantitative electrolyte protocol was withheld from a benign-symptom reader');
  check('C', 'benign symptom: the protein figure still reaches the prompt',
    /- Protein: \d+g/.test(benign.prompts),
    'the protein target was withheld from the model for a benign symptom');
  const mealPlan = benign.sections[3] || '';
  check('C', 'benign symptom: the meal calendar is still fully populated',
    (mealPlan.match(/^\|\s*Day \d+\s*\|/gm) || []).length === 30,
    'the meal plan was thinned out for a benign symptom');
}

// ===========================================================================
// GROUP D — CASE 5. The physician handout carries what the customer actually typed,
// with provenance, and does not silently drop the free-text box.
// ===========================================================================
{
  const SYMPTOM = 'bladder prolapse, stage 2, diagnosed last year';
  const r = await render('D-handout', { ...BASE, otherSymptoms: SYMPTOM });
  const consult = r.sections[5] || '';

  check('D', 'physician handout reflects the free-text symptom the customer entered',
    consult.toLowerCase().includes('prolapse'),
    'the doctor\'s sheet does not mention what the patient typed into otherSymptoms');
  check('D', 'physician handout labels it as patient-reported',
    /Patient-reported symptoms\/concerns:/i.test(consult),
    'the symptom is present but carries no provenance label');
  check('D', 'physician handout keeps the self-reported / unverified warning',
    /self-reported into an online questionnaire and have not been verified/i.test(consult),
    'the unverified disclaimer was lost');
  check('D', 'physician handout says these are the patient\'s words, not our diagnosis',
    /not a diagnosis made by this report/i.test(consult),
    'nothing distinguishes patient report from a diagnosis');
  check('D', 'the handout no longer falls back to the generic placeholder',
    !/protocol to address: \*\*the health goals described in this report\*\*/i.test(consult),
    'the free-text symptom is present in the form but the handout still says "the health goals described in this report"');

  // And the reader-facing banner acknowledges it too.
  check('D', 'the medical-context banner acknowledges reported symptoms',
    /Symptoms and concerns you reported:/i.test(r.full),
    'the banner still only lists conditions and medications');
}

// ===========================================================================
// GROUP E — CASE 6. A family member's illness, mentioned in a notes box, is not the
// customer's medical history.
//
// The distinction this asserts is deliberate and narrow:
//   - it must NOT be recorded as the CUSTOMER's condition or symptom (that would put
//     someone else's diagnosis on her doctor's handout and in her banner), and
//   - it MAY still make the report more cautious, because free text is not reliably
//     attributable and failing closed is the house rule.
// Suppressing a number for the wrong reason is recoverable. Printing a relative's
// diagnosis as the patient's own is not.
// ===========================================================================
{
  const NOTE = 'My sister has lupus and takes warfarin, which is what got me reading about diet.';
  const r = await render('E-family', { ...BASE, additionalNotes: NOTE });

  check('E', 'a relative\'s condition is not recorded as the customer\'s condition',
    !/lupus/i.test(r.ctx.conditionsText),
    `conditionsText became "${r.ctx.conditionsText}"`);
  check('E', 'a relative\'s condition is not recorded as the customer\'s symptom',
    !/lupus/i.test(r.ctx.symptomsText),
    `symptomsText became "${r.ctx.symptomsText}"`);
  check('E', 'a relative\'s medication is not recorded as the customer\'s medication',
    !/warfarin/i.test(r.ctx.medicationsText),
    `medicationsText became "${r.ctx.medicationsText}"`);

  const consult = r.sections[5] || '';
  const handout = consult.slice(consult.indexOf('ONE-PAGE PHYSICIAN'));
  check('E', 'the physician handout does not list the relative\'s condition as the patient\'s',
    !/Conditions the patient reported:[^\n]*lupus/i.test(handout),
    'a family member\'s diagnosis reached the doctor\'s sheet as the patient\'s own');
  check('E', 'the physician handout does not list the relative\'s medication as the patient\'s',
    !/Medications the patient reported:[^\n]*warfarin/i.test(handout),
    'a family member\'s medication reached the doctor\'s sheet as the patient\'s own');

  // The fail-closed half, asserted so the behaviour is deliberate rather than accidental.
  check('E', 'the narrative still reaches the classifier (fails closed, by design)',
    r.ctx.anticoagulant === true,
    'a drug name in a notes box was invisible to the classifier; free text must fail closed');
}

// ===========================================================================
// GROUP F — CASE 7. The clean path is unchanged. Nothing above may turn a reader who
// declared nothing into a restricted one.
// ===========================================================================
{
  const clean = await render('F-clean', { ...BASE });

  check('F', 'no declared context: hasAnyMedicalContext is false',
    clean.ctx.hasAnyMedicalContext === false, JSON.stringify({
      conditions: clean.ctx.conditionsText, symptoms: clean.ctx.symptomsText,
      medications: clean.ctx.medicationsText }));
  check('F', 'no declared context: nothing is restricted',
    clean.ctx.restrictElectrolyteTargets === false &&
    clean.ctx.restrictProteinTarget === false &&
    clean.ctx.restrictConditionClaims === false, '');
  check('F', 'no declared context: the banner uses the none-declared wording',
    /You did not tell us about any health/i.test(clean.full),
    'the no-context banner did not render');
  check('F', 'no declared context: the prompt says none declared',
    /MEDICAL CONTEXT FOR THIS READER: none declared/i.test(clean.prompts),
    'the model was not told the reader declared nothing');
  check('F', 'no declared context: quantitative electrolytes still present',
    /\d\s*-\s*\d\s*grams a day/i.test(clean.sections[10] || ''), '');
  check('F', 'no declared context: full 30-day calendar still renders',
    ((clean.sections[3] || '').match(/^\|\s*Day \d+\s*\|/gm) || []).length === 30, '');
  check('F', '"none" answers are not treated as declared context',
    clean.ctx.hasDeclaredSymptoms === false && clean.ctx.hasDeclaredConditions === false,
    'the literal answer "none" was counted as a reported condition or symptom');
}

// The rules block must be self-consistent: rule 11/12 text present regardless of ctx.
{
  const rulesNone = buildMedicalSafetyRules(deriveMedicalContext({}));
  check('F', 'rules 11 and 12 ship even when no context is declared',
    /11\. NEVER claim/i.test(rulesNone) && /12\. NEVER attribute/i.test(rulesNone),
    'the claim rules are conditional; they must be unconditional');
}

} finally {
  for (const [k, fn] of quiet) console[k] = fn;
}

// ---------------------------------------------------------------------------
console.log(`\nhealth-context-flow: ${pass.length} passed, ${failures.length} failed  (groups A B C D E F)\n`);
if (failures.length) {
  for (const f of failures) console.log(`  [${f.group}] ${f.label}\n        ${f.detail}`);
  console.log('');
  process.exit(1);
}
console.log('Customer-entered health text reaches the safety classifier through the same');
console.log('canonical map the AI prompt reads (GROUP A), and cannot become a treatment');
console.log('claim (GROUP B) or someone else\'s medical history (GROUP E).\n');
