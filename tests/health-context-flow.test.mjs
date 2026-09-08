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
import fs from 'fs';

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
const { deriveMedicalContext, HEALTH_CONTEXT_FIELDS, buildMedicalSafetyRules,
        findConditionClaimFrames, buildSymptomDisclosure,
        findUnfoundedClearance } = med;

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
// GROUP G — THE RENDERED PHYSICIAN GUIDE. Asserted against the finished text of
// Report #5 and the one-page handout, not against prompts or intermediate state.
//
// Why this group exists, and why it is separate from GROUP B:
// GROUP B audits the SYSTEM PROMPT for the two live-written sections. On 2026-09-08
// that passed while the shipped Report #5 said, in the patient's voice:
//
//     "I'm starting a therapeutic Carnivore protocol to address pelvic floor
//      prolapse. This is evidence-based metabolic therapy, not a fad diet."
//     "I am starting a therapeutic Carnivore protocol to address: pelvic floor prolapse"
//
// Both came from a hardcoded template, so no prompt rule could reach them. The
// classifier decides what a section may say and never reads back what it said. And
// this file's own GROUP D asserted the handout CONTAINED the symptom, which the
// therapeutic sentence satisfied perfectly: testing for presence without testing for
// framing is what let it through.
//
// So these assertions read the rendered document and check HOW the condition appears.
// ===========================================================================
{
  const SYMPTOM = 'bladder prolapse, stage 2, diagnosed last year';
  const r = await render('G-rendered', { ...BASE, otherSymptoms: SYMPTOM });
  const consult = r.sections[5] || '';
  const handout = consult.slice(consult.indexOf('ONE-PAGE PHYSICIAN CONSULTATION GUIDE'));

  check('G', 'Report #5 renders at all', consult.length > 500, `${consult.length} chars`);
  check('G', 'the one-page handout renders', handout.length > 200, `${handout.length} chars`);

  // The exact constructions that shipped. Named individually so a failure says which.
  const BANNED = [
    [/therapeutic[^.\n]{0,60}protocol to address/i, 'therapeutic ... protocol to address'],
    [/protocol to address:?\s*\*{0,2}[^*\n]*prolapse/i, 'protocol to address: <condition>'],
    [/evidence-based metabolic therapy/i, 'evidence-based metabolic therapy'],
    [/starting a therapeutic/i, 'starting a therapeutic ...'],
  ];
  for (const [rx, name] of BANNED) {
    for (const [label, body] of [['Report #5', consult], ['one-page handout', handout]]) {
      const hit = body.match(rx);
      check('G', `${label}: no "${name}"`, !hit, hit ? `found: "${hit[0]}"` : '');
    }
  }

  // The general property, not just the two known strings: the reported condition may
  // not share a sentence with a therapeutic frame, anywhere in any rendered section.
  for (const [num, body] of Object.entries(r.sections)) {
    const hits = findConditionClaimFrames(body, r.ctx);
    check('G', `Report #${num}: reported condition never sits in a treatment-claim frame`,
      hits.length === 0,
      hits.map(h => `"${h.sentence}"`).join(' ; '));
  }

  // Provenance must survive the fix: removing the claim must not remove the disclosure.
  check('G', 'the handout still tells the doctor what the patient reported',
    /Patient-reported symptoms\/concerns:[^\n]*prolapse/i.test(handout),
    'the condition vanished from the handout entirely');
  check('G', 'the patient request discloses the condition without a purpose claim',
    /what I am dealing with: [^.\n]*prolapse/i.test(consult),
    'the disclosure sentence is missing from Report #5');
  check('G', 'the disclosure disclaims any assumed benefit',
    /not assuming that changing my diet will do anything for that/i.test(consult), '');
  check('G', 'the disclosure asks the clinician whether the change is appropriate',
    /whether you think this change is appropriate/i.test(consult), '');

  // And the detector itself must be able to see the historical sentence, otherwise
  // every assertion above is vacuous.
  const HISTORICAL = "I'm starting a therapeutic Carnivore protocol to address bladder prolapse, " +
    "stage 2, diagnosed last year. This is evidence-based metabolic therapy, not a fad diet.";
  check('G', 'the detector flags the exact sentence that shipped',
    findConditionClaimFrames(HISTORICAL, r.ctx).length > 0,
    'findConditionClaimFrames() cannot see the 2026-09-08 bypass; the guard is decorative');

  // Referral language must NOT trip it. Over-firing here would push the generator into
  // throwing on correct copy, which is its own outage.
  const REFERRAL = 'You mentioned bladder prolapse, stage 2, diagnosed last year. ' +
    'That is one for the clinician who treats it, and worth asking about.';
  check('G', 'the detector does not flag ordinary referral language',
    findConditionClaimFrames(REFERRAL, r.ctx).length === 0,
    'referral copy trips the guard: ' + JSON.stringify(findConditionClaimFrames(REFERRAL, r.ctx)));

  // SEAM: the detector must actually be called by the generator. A guard that works
  // perfectly and is never invoked is the same as no guard, and nothing else in this
  // file would notice its removal.
  const src = fs.readFileSync(API, 'utf8');
  const genStart = src.indexOf('async function generateAllReports');
  const genEnd = src.indexOf('async function generateAIReports');
  const genBody = src.slice(genStart, genEnd > genStart ? genEnd : undefined);
  check('G', 'generateAllReports calls the render-time claim gate on every section',
    genStart !== -1 && /assertNoConditionClaimFrames\s*\(/.test(genBody),
    'the guard is defined but generateAllReports never invokes it');
  check('G', 'the render-time gate runs over all sections, not one',
    /for \(const \[num, body\] of Object\.entries\(reports\)\)[\s\S]{0,200}assertNoConditionClaimFrames/.test(genBody),
    'the guard is called but not across every rendered section');

  const PROVENANCE = 'Symptoms and concerns you reported: bladder prolapse, stage 2, diagnosed last year';
  check('G', 'the detector does not flag the provenance heading',
    findConditionClaimFrames(PROVENANCE, r.ctx).length === 0, '');
}

// ===========================================================================
// GROUP H — NO UNFOUNDED CLEARANCE. Absence of a triggered gate is not medical
// clearance, and the report may never say it is.
//
// The sentence this group exists for, from a shipped Report #1 on 2026-09-08:
//
//     "Since you haven't reported any medications or conditions that would require
//      modified guidance, your targets above are appropriate to follow."
//
// It is an invalid inference. All the system knows is that nothing the reader typed
// matched a rule that would have changed the output. It has not seen their labs,
// their history, or anything they chose not to type. And note WHICH reader gets it:
// the one who declared nothing, i.e. the default path, i.e. most customers.
//
// Asserted on the rendered document. GROUP H's negative control is the healthy
// persona, because that is the reader the sentence was written for.
// ===========================================================================
{
  const healthy = await render('H-healthy', { ...BASE });
  const declared = await render('H-declared', { ...BASE, otherSymptoms: 'occasional bloating after meals' });

  const BANNED_CLEARANCE = [
    [/appropriate to follow/i, 'appropriate to follow'],
    [/targets?[^.!?]{0,40}\b(are|is)\b[^.!?]{0,25}(appropriate|safe|suitable|fine)/i, 'targets are appropriate/safe'],
    [/\b(safe|appropriate|suitable) for you\b/i, 'safe/appropriate for you'],
    [/nothing you reported[^.!?]{0,60}(unsafe|unsuitable|inappropriate)/i, 'nothing you reported makes these unsuitable'],
    [/you(?:'re| are) (?:cleared|good to go|all set)/i, "you're cleared"],
  ];

  for (const [label, r] of [['healthy persona', healthy], ['symptom-declaring persona', declared]]) {
    for (const [num, body] of Object.entries(r.sections)) {
      for (const [rx, name] of BANNED_CLEARANCE) {
        const hit = body.match(rx);
        check('H', `${label}, Report #${num}: no "${name}"`, !hit, hit ? `found: "${hit[0]}"` : '');
      }
    }
    // The general property, via the shared detector, across the whole document.
    const hits = findUnfoundedClearance(r.full);
    check('H', `${label}: no clearance language anywhere in the report`,
      hits.length === 0, hits.map(h => `"${h.sentence}"`).join(' ; '));
  }

  // POSITIVE CONTROL. Removing a false reassurance must not remove the product. A
  // healthy reader still gets every number and every day they paid for.
  check('H', 'positive control: healthy persona still gets a calorie target',
    /- Calories: \d{3,4}/.test(healthy.prompts), 'the calorie target vanished');
  check('H', 'positive control: healthy persona still gets a protein target',
    /- Protein: \d+g/.test(healthy.prompts), 'the protein target vanished');
  check('H', 'positive control: healthy persona still gets quantitative electrolytes',
    /\d\s*-\s*\d\s*grams a day/i.test(healthy.sections[10] || ''),
    'the electrolyte protocol was suppressed for a reader who declared nothing');
  check('H', 'positive control: healthy persona still gets all 30 calendar days',
    ((healthy.sections[3] || '').match(/^\|\s*Day \d+\s*\|/gm) || []).length === 30,
    'the meal plan was thinned out');
  check('H', 'positive control: healthy persona still gets a full grocery list',
    ((healthy.sections[4] || '').match(/\* \[ \]/g) || []).length > 20,
    'the shopping list was thinned out');

  // The replacement wording must actually be on the page, not merely the removal.
  check('H', 'the banner says plainly that nothing triggered is not the same as suitable',
    /not the same as saying these numbers are right for you/i.test(healthy.full),
    'the correction was removed without putting the true statement in its place');
  check('H', 'the banner routes suitability to the provider',
    /whether these targets[\s>]+suit you is a question for your healthcare provider/i.test(healthy.full), '');

  // Rule 13 must reach the model that wrote the sentence, unconditionally.
  for (const [label, r] of [['healthy', healthy], ['declared', declared]]) {
    check('H', `${label}: rule 13 is in the system prompt`,
      /13\. NEVER tell the reader that their targets/i.test(r.prompts),
      'the model was never told not to infer clearance');
    check('H', `${label}: rule 13 is marked always active`,
      /Rule 13 is ALWAYS ACTIVE/i.test(r.prompts), '');
  }

  // Detector sanity, both directions.
  check('H', 'the detector flags the exact sentence that shipped',
    findUnfoundedClearance("Since you haven't reported any medications or conditions that " +
      'would require modified guidance, your targets above are appropriate to follow.').length > 0,
    'findUnfoundedClearance() cannot see the sentence it exists for');
  check('H', 'the detector flags a clearance dressed up with a trailing caveat',
    findUnfoundedClearance('Your targets are appropriate to follow, but do review them with your doctor.').length > 0,
    'a trailing caveat launders the clearance past the detector');
  check('H', 'the detector does NOT flag the patient asking their doctor',
    findUnfoundedClearance('I would like to know whether you think this change is appropriate for me.').length === 0,
    'deferential phrasing trips the guard');
  check('H', 'the detector does NOT flag the corrected banner wording',
    findUnfoundedClearance('That is not the same as saying these numbers are right for you. ' +
      'Whether these targets suit you is a question for your healthcare provider.').length === 0,
    'the replacement copy trips its own guard');

  // SEAM: the generator must call it, on every section, for every reader.
  const srcH = fs.readFileSync(API, 'utf8');
  const gStart = srcH.indexOf('async function generateAllReports');
  const gEnd = srcH.indexOf('async function generateAIReports');
  const gBody = srcH.slice(gStart, gEnd > gStart ? gEnd : undefined);
  check('H', 'generateAllReports calls the clearance gate',
    /assertNoUnfoundedClearance\s*\(/.test(gBody),
    'the clearance guard is defined but never invoked');
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
    !/the health goals described in this report/i.test(consult),
    'the free-text symptom is present in the form but the handout still says "the health goals described in this report"');
  // {{symptoms}} is retired on purpose: its only job was to drop the condition into a
  // sentence about the condition, which is the construction that shipped the bypass.
  // A live substitution for it is a loaded gun for the next template author.
  check('D', 'the raw {{symptoms}} placeholder is not substituted anywhere',
    !/\{\{symptoms\}\}/.test(r.full), 'an unreplaced {{symptoms}} token reached the page');

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
console.log(`\nhealth-context-flow: ${pass.length} passed, ${failures.length} failed  (groups A B C D E F G H)\n`);
if (failures.length) {
  for (const f of failures) console.log(`  [${f.group}] ${f.label}\n        ${f.detail}`);
  console.log('');
  process.exit(1);
}
console.log('Customer-entered health text reaches the safety classifier through the same');
console.log('canonical map the AI prompt reads (GROUP A), and cannot become a treatment');
console.log('claim (GROUP B) or someone else\'s medical history (GROUP E).\n');
