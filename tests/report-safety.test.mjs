#!/usr/bin/env node
/**
 * tests/report-safety.test.mjs
 *
 * ADVERSARIAL SAFETY REGRESSION FOR THE $29 FULL REPORT.
 *
 * Run it:
 *     node tests/report-safety.test.mjs
 *     node tests/report-safety.test.mjs --dump /tmp/reports   (writes rendered output)
 *
 * No dependencies, no network, no database, no API key. Exits non-zero on any
 * failure. If you are reading this because it went red, scroll to the bottom of the
 * output: every failure prints the persona, the assertion, and the offending text.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-09-07 a safety audit of the paid report found that it collected the
 * reader's conditions and medications, computed {{conditions}} and {{medications}}
 * substitutions from them, and then used those substitutions in zero templates. A
 * 72-year-old on warfarin, metoprolol, furosemide, metformin and levothyroxine with
 * heart failure, AFib and CKD stage 3 received the same medical content as a healthy
 * 51-year-old on nothing:
 *
 *   - 3-7 g/day of sodium plus 1-2 L of added fluid (she is on a loop diuretic for CHF)
 *   - a potassium-chloride "Lite Salt" instruction (she has CKD stage 3)
 *   - "Dizziness -> Add salt immediately" (she is on a beta blocker and metformin)
 *   - a fasting glucose target of 60-85, "lower is better" (she is on metformin),
 *     in a report that elsewhere calls anything under 70 hypoglycemia
 *   - a script for talking her doctor out of a statin
 *   - a script calling her kidney doctor's protein concern "a myth from outdated research"
 *
 * THE ACCEPTANCE TEST THIS FILE ENCODES:
 *
 *     A medically complex persona must not receive the same medically relevant
 *     report content as the healthy baseline, while neither persona may receive
 *     unsafe medication-management instructions.
 *
 * Both halves matter. Making every reader get the referral text would pass the
 * second half and fail the first. Personalising the numbers would pass the first and
 * fail the second. The suite checks both, in both directions.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE DOES *NOT* COVER — read this before trusting a green run
 * ---------------------------------------------------------------------------
 * Report #1 (Executive Summary) and Report #6 (Obstacle Protocol) are written live
 * by Claude at request time. This suite stubs that call, so it CANNOT tell you what
 * a real customer reads in those two sections. What it does instead is assert on the
 * system prompts and sampling parameters that govern them (GROUP E below). A live
 * sampled audit of those two sections is a separate, still-open gate.
 *
 * Two more honest limits, added with round 2:
 *
 *   - GROUP H's rendered-body check is latent, not load-bearing. No shipped template
 *     prints {{protein}}, so today the protein figure only ever reaches a customer
 *     through the prompt for reports #1 and #6. The prompt assertions carry the
 *     weight; the rendered-body one and the SOURCE seam assertion in GROUP F exist so
 *     that adding {{protein}} to a template later cannot ship the number silently.
 *
 *   - GROUP G proves the meal PLAN omits organ meats. It does not address the fact
 *     that a CKD reader's meal portions are still sized from the protein figure this
 *     report refuses to state. That is a selection question, it is unresolved, and it
 *     is recorded in the medical-interaction map rather than fixed here — sizing
 *     protein for reduced kidney function is a clinical decision.
 *
 * ---------------------------------------------------------------------------
 * ROUND 2 (2026-09-07): what was added, and the rule it encodes
 * ---------------------------------------------------------------------------
 * GROUP G: warfarin + liver -> ZERO liver meals. Behaviour, not warnings. A report
 * that schedules 296 g of liver and prints a caution above it is not fixed, and an
 * assertion on the caution alone would have passed on exactly that report.
 *
 * GROUP H: CKD -> no protein quantity anywhere, and NOT a smaller one. Substituting a
 * gentler number is the same clinical judgement in a quieter voice. Mutation-checked:
 * replacing the suppression with "60g" fails this suite.
 *
 * Both groups carry a positive control (a reader with no anticoagulant still gets
 * liver; a reader with no kidney disease still gets their protein target in the
 * prompt), because blanket-restricting everybody would otherwise read as a pass.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API = path.join(HERE, '..', 'api', 'calculator-api.js');

// ===========================================================================
// THE PERSONAS
// ---------------------------------------------------------------------------
// Field names come from the shipped frontend bundle
// (public/assets/calculator2/assets/index-*.js, default form object). `conditions`
// is a checkbox array limited to diabetes | heart-disease | thyroid | pcos |
// arthritis | none. `medications`, `otherConditions` and `otherSymptoms` are free
// text. There is no kidney or gallbladder checkbox, which is why those personas
// declare them through `otherConditions` — exactly as a real customer would.
//
// H1 and X9 are the load-bearing pair. Keep them. The other seven exist to stop a
// fix from being special-cased to that one comparison.
// ===========================================================================
const BASE_FORM = {
  sex: 'female', age: 51,
  heightFeet: 5, heightInches: 5,
  weight: 198, goalWeight: 150,
  lifestyle: 'sedentary', exercise: '1-2', goal: 'lose', deficit: 20,
  diet: 'Carnivore', ratio: 'moderate',
  email: 'safety-fixture@example.com', firstName: 'Linda', lastName: 'Test',
  medications: '', conditions: [], otherConditions: '',
  symptoms: [], otherSymptoms: '',
  allergies: '', avoidFoods: '', previousDiets: '', whatWorked: '',
  carnivoreExperience: 'beginner',
  goals: ['weight-loss'], biggestChallenge: 'Sugar cravings in the evening',
  cookingSkill: 'basic', budget: 'moderate', familySituation: 'cooking-for-family',
  workTravel: 'rarely', additionalNotes: ''
};

const PERSONAS = [
  { id: 'H1', name: 'Healthy baseline: no medications, no conditions',
    expectRestricted: false,
    form: { ...BASE_FORM, medications: '', conditions: ['none'], symptoms: ['none'] } },

  { id: 'C2', name: 'Metformin + diabetes',
    expectRestricted: true, expectGlucose: true,
    form: { ...BASE_FORM, medications: 'Metformin 1000mg twice daily', conditions: ['diabetes'],
            symptoms: ['fatigue', 'brain-fog'] } },

  { id: 'C3', name: 'Levothyroxine + thyroid condition',
    expectRestricted: true,
    form: { ...BASE_FORM, medications: 'Levothyroxine 88mcg daily (Synthroid)', conditions: ['thyroid'],
            symptoms: ['fatigue', 'mood-changes'] } },

  { id: 'C4', name: 'Lisinopril + hypertension (ACE inhibitor)',
    expectRestricted: true,
    form: { ...BASE_FORM, medications: 'Lisinopril 20mg daily', conditions: [],
            otherConditions: 'High blood pressure (hypertension)', symptoms: ['headaches'] } },

  { id: 'C5', name: 'Thiazide diuretic + statin + heart disease',
    expectRestricted: true,
    form: { ...BASE_FORM, medications: 'Hydrochlorothiazide 25mg daily (diuretic), Atorvastatin 40mg',
            conditions: ['heart-disease'], symptoms: ['fatigue'] } },

  { id: 'C6', name: 'Four medications, four conditions, CKD stage 3',
    expectRestricted: true, expectGlucose: true, expectNoProteinTarget: true,
    form: { ...BASE_FORM, medications: 'Metformin 1000mg, Levothyroxine 100mcg, Lisinopril 10mg, Furosemide 20mg',
            conditions: ['diabetes', 'heart-disease', 'thyroid', 'pcos'],
            otherConditions: 'Stage 3 chronic kidney disease, gallbladder removed 2019',
            symptoms: ['fatigue', 'joint-pain', 'sleep-problems'] } },

  { id: 'C7', name: 'Medications declared, conditions answered "none"',
    expectRestricted: true, expectGlucose: true,
    form: { ...BASE_FORM, medications: 'Metformin 500mg, Levothyroxine 50mcg, Lisinopril 5mg',
            conditions: ['none'], symptoms: ['fatigue'] } },

  { id: 'C8', name: 'Conditions declared, no medications',
    expectRestricted: true, expectGlucose: true,
    form: { ...BASE_FORM, medications: '', conditions: ['diabetes', 'heart-disease', 'thyroid'],
            symptoms: ['fatigue', 'weight-issues'] } },

  { id: 'X9', name: 'Complex: 72yo, 5 medications, CHF + AFib + CKD3 + diabetes',
    expectRestricted: true, expectGlucose: true, expectAnticoagulant: true,
    expectNoOrganMeats: true, expectNoProteinTarget: true,
    form: { ...BASE_FORM, age: 72, weight: 210, goalWeight: 170,
            medications: 'Warfarin 5mg, Metoprolol 50mg, Furosemide 40mg, Metformin 850mg, Levothyroxine 125mcg',
            conditions: ['diabetes', 'heart-disease', 'thyroid', 'arthritis'],
            otherConditions: 'Atrial fibrillation, congestive heart failure, CKD stage 3',
            symptoms: ['fatigue', 'joint-pain', 'sleep-problems', 'digestive-issues'],
            carnivoreExperience: 'none' } },

  // ---------------------------------------------------------------------------
  // Added 2026-09-07, remediation round 2. X9 declares warfarin AND kidney disease
  // AND four other things at once, so a fix could be accidentally keyed to any of
  // them. A10 and K11 isolate the two triggers so that cannot happen quietly.
  // ---------------------------------------------------------------------------
  { id: 'A10', name: 'Anticoagulant only: warfarin, no conditions declared',
    expectRestricted: true, expectAnticoagulant: true, expectNoOrganMeats: true,
    form: { ...BASE_FORM, medications: 'Warfarin 5mg daily', conditions: ['none'],
            symptoms: ['fatigue'] } },

  { id: 'D11', name: 'Anticoagulant only: a DOAC, to prove the check is not warfarin-keyed',
    expectRestricted: true, expectAnticoagulant: true, expectNoOrganMeats: true,
    form: { ...BASE_FORM, medications: 'Eliquis 5mg twice daily', conditions: [],
            symptoms: ['fatigue'] } },

  { id: 'K12', name: 'Kidney disease only, no medications',
    expectRestricted: true, expectNoProteinTarget: true,
    form: { ...BASE_FORM, medications: '', conditions: [],
            otherConditions: 'Chronic kidney disease, stage 3',
            symptoms: ['fatigue', 'sleep-problems'] } }
];

const BASELINE = 'H1';
const COMPLEX = 'X9';

// ===========================================================================
// BANNED CONTENT
// ---------------------------------------------------------------------------
// Each entry is a defect that actually shipped. If one of these fires, the fix was
// reverted or re-introduced somewhere else. Do not "fix" a failure by loosening a
// pattern; fix the content.
// ===========================================================================
const BANNED_EVERYWHERE = [
  // "Lite Salt" may only appear where the report is warning the reader OFF it.
  // These patterns match it being offered: as an ingredient, with a measurement, or
  // as an instruction. docs/house-claims.md: "We do not give bulk KCl dosing
  // instructions." Hyperkalemia risk in CKD and alongside ACE inhibitors.
  { re: /(?:^|\n)[ \t]*(?:-|\*(?!\*))[ \t]+[^\n]{0,40}lite\s*salt/i, why: 'a potassium-chloride product offered as a recipe ingredient' },
  { re: /(?:½|¼|1\/2|\d)\s*(?:tsp|teaspoons?|tbsp|tablespoons?)[^.\n]{0,40}lite\s*salt/i, why: 'a measured dose of a potassium-chloride product' },
  { re: /\b(add|take|use|mix|include|try)\s+(?:some\s+|a\s+)?["“]?lite\s*salt/i, why: 'an instruction to take a potassium-chloride product' },
  { re: /potassium chloride[^.]{0,60}(?:take|add|mix|½|1\/2|tsp|teaspoon)/i, why: 'potassium chloride dosing instruction' },
  { re: /add salt immediately/i,              why: 'salt self-treatment for dizziness; delays care for orthostatic hypotension, bradycardia, arrhythmia and hypoglycemia' },
  { re: /lower is better on low-carb/i,       why: 'the "lower is better" fasting glucose framing' },
  { re: /\|\s*60-85\s*\|/,                    why: 'the 60-85 fasting glucose target; the same report calls anything under 70 hypoglycemia' },
  { re: /glucose\s*<\s*50\s*mg\/dL/i,         why: 'a <50 mg/dL self-treatment threshold; tells the reader to wait through 20 mg/dL of real hypoglycemia' },
  { re: /drink\s+(4 oz )?orange juice/i,      why: 'hypoglycemia self-treatment dosing' },
  { re: /drink salted water/i,                why: 'salt self-treatment for hypotension' },
  { re: /insist on statins/i,                 why: 'statin-deferral script; docs/house-claims.md: medication changes are the prescriber\'s decision, never dismiss statins categorically' },
  { re: /myth from outdated research/i,       why: 'dismisses a kidney-disease concern as a myth, to a reader who may have kidney disease' },
  { re: /safe for healthy kidneys and may even be protective/i, why: 'protein-safety claim delivered to declared CKD patients' },
  { re: /discussing tapering/i,               why: 'tapering language in a paid medical-adjacent document' },
  { re: /\b(taper|titrate|wean)\s+(off|down|your)\b/i, why: 'medication tapering instruction' },
  { re: /\b(stop|skip|halve|reduce|lower|cut)\s+(taking\s+)?your\s+(medication|meds|dose|insulin|metformin|statin)/i, why: 'medication dose-change instruction' },
  { re: /you (can|will be able to|should be able to) (stop|come off|get off)\s+(your\s+)?(medication|meds|insulin|metformin)/i, why: 'predicts medication discontinuation' },
  { re: /\{\{[^}]*\}\}/,                      why: 'unreplaced template placeholder leaked to the customer' },
  { re: /\bundefined\b/,                      why: 'a literal "undefined" rendered into customer-facing text' },
  { re: /to address\s+none\b/i,               why: 'raw "none" slug leaked into the physician-facing letter' },
  { re: /\bbrain-fog\b|\bweight-issues\b|\bsleep-problems\b|\bjoint-pain\b|\bmood-changes\b|\bdigestive-issues\b/, why: 'un-humanised form slug rendered into prose' }
];

/** Quantity patterns that must NOT appear in a restricted reader's Report #10. */
const ELECTROLYTE_QUANTITIES = [
  { re: /\d+\s*[-–]\s*\d+\s*g(?:ram)?s?\b/i,      why: 'a sodium/potassium gram range' },
  { re: /\d+\s*(?:½|1\/2|¼)?\s*(?:tsp|teaspoons?|tbsp|tablespoons?)\b/i, why: 'a salt measurement' },
  { re: /\b\d+\s*[-–]?\s*\d*\s*(?:liters?|litres?|L)\s+(?:daily|a day|per day)/i, why: 'a daily fluid volume' },
  { re: /\d[\d,]*\s*mg\b/i,                        why: 'a supplement dose in mg' }
];

// ===========================================================================
// Tiny assertion harness
// ===========================================================================
let failures = [];
let checks = 0;
function check(persona, name, condition, detail = '') {
  checks++;
  if (!condition) failures.push({ persona, name, detail });
}
function excerpt(text, re, pad = 90) {
  const m = text.match(re);
  if (!m) return '';
  const i = text.indexOf(m[0]);
  return '…' + text.slice(Math.max(0, i - pad), i + m[0].length + pad).replace(/\s+/g, ' ') + '…';
}

/** Cheap trigram overlap. 1.0 = identical, 0.0 = nothing in common. */
function similarity(a, b) {
  const grams = s => {
    const set = new Set();
    const t = s.toLowerCase().replace(/\s+/g, ' ');
    for (let i = 0; i < t.length - 3; i++) set.add(t.slice(i, i + 4));
    return set;
  };
  const A = grams(a), B = grams(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  for (const g of A) if (B.has(g)) shared++;
  return shared / (A.size + B.size - shared);
}

// ===========================================================================
// Render every persona through the REAL pipeline
// ===========================================================================
const captured = {};   // persona id -> [{ system, user, temperature, max_tokens }]

const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.includes('api.anthropic.com')) {
    const body = JSON.parse(opts.body);
    captured[globalThis.__persona].push({
      system: body.system,
      user: body.messages[0].content,
      temperature: body.temperature,
      model: body.model
    });
    // Deliberately inert. What a customer really reads in reports #1 and #6 is not
    // covered by this suite — see the header. GROUP E audits the prompt instead.
    return { ok: true, json: async () => ({ content: [{ text: '[AI SECTION STUBBED BY tests/report-safety.test.mjs]' }] }) };
  }
  if (realFetch) return realFetch(url, opts);
  throw new Error('report-safety fixture: unexpected network call to ' + u);
};

const api = await import(path.toRawFileURL ? path.toRawFileURL(API) : 'file://' + API);
const { __test_buildReportData: buildReportData,
        __test_calculateMacros: calculateMacros,
        __test_generateAllReports: generateAllReports } = api;

for (const fn of [buildReportData, calculateMacros, generateAllReports]) {
  if (typeof fn !== 'function') {
    console.error('FATAL: api/calculator-api.js no longer exports the test surface this fixture needs.');
    console.error('       Look for the "TEST SURFACE" export block at the bottom of that file.');
    process.exit(2);
  }
}

const rendered = {};   // persona id -> { sections: {1..13}, full: string }

const quiet = ['log', 'info', 'warn', 'debug'].map(k => [k, console[k]]);
for (const [k] of quiet) console[k] = () => {};
try {
  for (const p of PERSONAS) {
    globalThis.__persona = p.id;
    captured[p.id] = [];
    // Rendered through the SAME mapping production uses (buildReportData, extracted
    // from handleReportInit) so this fixture cannot drift away from the real path.
    const session = {
      id: 'fixture-' + p.id,
      email: p.form.email,
      first_name: p.form.firstName,
      last_name: p.form.lastName,
      diet_type: p.form.diet,
      form_data: p.form
    };
    const data = buildReportData(session);
    data.macros = calculateMacros(p.form);
    const sections = await generateAllReports(data, 'sk-fixture-not-a-real-key');
    const full = Object.keys(sections).sort((a, b) => a - b).map(k => sections[k]).filter(Boolean).join('\n\n---\n\n');
    rendered[p.id] = { sections, full, macros: data.macros };
  }
} finally {
  for (const [k, fn] of quiet) console[k] = fn;
}

const dumpIdx = process.argv.indexOf('--dump');
if (dumpIdx > -1 && process.argv[dumpIdx + 1]) {
  const dir = process.argv[dumpIdx + 1];
  fs.mkdirSync(dir, { recursive: true });
  for (const p of PERSONAS) fs.writeFileSync(path.join(dir, `${p.id}.md`), rendered[p.id].full);
  fs.writeFileSync(path.join(dir, 'llm-prompts.json'), JSON.stringify(captured, null, 2));
  console.log(`Rendered output written to ${dir}\n`);
}

// ===========================================================================
// GROUP A — no persona receives unsafe medication-management content.
// (the negative half of the acceptance test, applied to all nine)
// ===========================================================================
for (const p of PERSONAS) {
  const text = rendered[p.id].full;
  for (const ban of BANNED_EVERYWHERE) {
    check(p.id, `must not contain: ${ban.why}`, !ban.re.test(text), excerpt(text, ban.re));
  }
}

// ===========================================================================
// GROUP B — the medically complex persona does not get the healthy report.
// (the positive half of the acceptance test)
// ===========================================================================
{
  const base = rendered[BASELINE].sections;
  const cx = rendered[COMPLEX].sections;

  // #5 physician guide, #9 labs, #10 electrolytes are where the medical content is.
  // Sections #1 and #6 are excluded: they are stubbed here, by design.
  for (const n of [5, 9, 10]) {
    check(COMPLEX, `report #${n} must differ from the healthy baseline`,
      (base[n] || '') !== (cx[n] || ''),
      `report #${n} is byte-identical between ${BASELINE} and ${COMPLEX}`);
  }

  // Report #10 should not merely differ, it should be a different section.
  const sim = similarity(base[10] || '', cx[10] || '');
  check(COMPLEX, 'report #10 (electrolytes) must be substantially different, not a tweaked copy',
    sim < 0.45, `trigram similarity to the healthy baseline is ${sim.toFixed(2)} (want < 0.45)`);

  // The report must actually acknowledge what she told us.
  const t = rendered[COMPLEX].full.toLowerCase();
  for (const term of ['warfarin', 'metoprolol', 'furosemide', 'metformin', 'levothyroxine',
                      'congestive heart failure', 'atrial fibrillation', 'ckd stage 3']) {
    check(COMPLEX, `report must name the declared "${term}"`, t.includes(term),
      'declared in the questionnaire and never surfaced in the report');
  }

  // ...and the differentiation must not come from blanket-restricting everybody.
  check(BASELINE, 'healthy baseline still receives the general electrolyte guidance',
    /daily electrolyte goals/i.test(base[10] || ''),
    'the healthy reader lost the section too — that is over-correction, not a fix');
}

// ===========================================================================
// GROUP C — restricted readers get no electrolyte numbers at all.
// ===========================================================================
for (const p of PERSONAS) {
  const s10 = rendered[p.id].sections[10] || '';
  // The acknowledgement banner is a blockquote that echoes the reader's OWN declared
  // medication list back to them ("Metformin 1000mg"). That is not the report issuing
  // a dose, so quantity checks run against the protocol body only.
  const protocolBody = s10.split('\n').filter(l => !l.trim().startsWith('>')).join('\n');
  if (p.expectRestricted) {
    for (const q of ELECTROLYTE_QUANTITIES) {
      check(p.id, `report #10 must not contain ${q.why}`, !q.re.test(protocolBody), excerpt(protocolBody, q.re));
    }
    check(p.id, 'report #10 must say why it is withholding the numbers',
      /does not give you sodium, potassium, fluid or supplement amounts/i.test(s10), '');
    check(p.id, 'report #10 must route the decision to the prescriber',
      /prescriber|your doctor/i.test(s10), '');
    check(p.id, 'report #10 must not tell the reader to self-treat symptoms with salt',
      /do not treat it with salt/i.test(s10), 'missing the explicit do-not-self-treat instruction');
  } else {
    // The unflagged path keeps general guidance, but only at house-claims numbers.
    check(p.id, 'report #10 sodium figure must match docs/house-claims.md (3-5 g, up to 6)',
      /3-5 grams a day/i.test(s10) && !/3-7\s*g/i.test(s10), excerpt(s10, /\d-\d\s*g(ram)?s?/i));
    check(p.id, 'report #10 must still carry the "if that changes, ask your prescriber" caveat',
      /stop applying to you/i.test(s10), '');
  }
}

// ===========================================================================
// GROUP D — every persona is told what this document is and is not.
// ===========================================================================
for (const p of PERSONAS) {
  const text = rendered[p.id].full;
  const ctxAware = p.expectRestricted;
  if (ctxAware) {
    check(p.id, 'report acknowledges the declared medical context',
      /What you told us, and what it means for this report/i.test(text), '');
    check(p.id, 'report tells the reader not to change medications on their own',
      /do not change, stop, skip or re-time any\s*\n?>?\s*medication/i.test(text) ||
      /Do not change a dose, skip a dose, or stop a medication on your own/i.test(text), '');
  }
  if (p.expectGlucose) {
    check(p.id, 'report sets no personal fasting glucose target',
      /does not set a personal target|does not give you a fasting glucose target/i.test(text), '');
  }
  if (p.expectAnticoagulant) {
    check(p.id, 'report flags the meal plan for prescriber review given a blood thinner',
      /blood thinner/i.test(text), '');
  }
  // The physician-facing handout exists to tell a doctor what the patient is doing.
  if (p.expectRestricted) {
    check(p.id, 'the one-page physician handout states the reported medications',
      /Medications the patient reported:/i.test(rendered[p.id].sections[5] || ''), '');
  }
}

// ===========================================================================
// GROUP E — the AI sections' guardrails. This is a PROMPT audit, not an output
// audit: reports #1 and #6 are stubbed. See the header.
// ===========================================================================
for (const p of PERSONAS) {
  const prompts = captured[p.id];
  check(p.id, 'both AI sections were generated (2 Claude calls)', prompts.length === 2,
    `saw ${prompts.length}`);

  for (const [i, call] of prompts.entries()) {
    const sys = call.system || '';
    check(p.id, `AI prompt ${i + 1}: explicit medication prohibition present`,
      /NEVER give medication advice of any kind/i.test(sys), '');
    check(p.id, `AI prompt ${i + 1}: tapering/discontinuation explicitly forbidden`,
      /tapering|taper/i.test(sys) && /Do not suggest\s*\n?\s*changing, adjusting, tapering/i.test(sys), '');
    check(p.id, `AI prompt ${i + 1}: doctor-override scripts forbidden`,
      /Never call a clinical concern a myth/i.test(sys), '');
    // The specific inversion that made this dangerous: the old rule 1 forbade the
    // only correction these readers needed. The prompt must now REQUIRE it.
    check(p.id, `AI prompt ${i + 1}: the clinician-check caveat is required, not forbidden`,
      /Saying that is REQUIRED/i.test(sys), '');
    check(p.id, `AI prompt ${i + 1}: sampling temperature is not maxed out`,
      typeof call.temperature === 'number' && call.temperature <= 0.7,
      `temperature=${call.temperature}`);
    check(p.id, `AI prompt ${i + 1}: no "undefined" leaked into the profile`,
      !/undefined/.test(call.user || ''), excerpt(call.user || '', /.{0,60}undefined.{0,60}/));

    if (p.expectRestricted) {
      check(p.id, `AI prompt ${i + 1}: medical context passed to the model`,
        /MEDICAL CONTEXT FOR THIS READER — the rules above are live/i.test(sys), '');
      check(p.id, `AI prompt ${i + 1}: the no-electrolyte-numbers rule is switched on`,
        /Rule 4 is ACTIVE/i.test(sys), '');
    } else {
      check(p.id, `AI prompt ${i + 1}: model told not to invent conditions`,
        /none declared/i.test(sys), '');
    }
  }
  // The model writing a 72-year-old's plan should know she is 72.
  if (p.id === COMPLEX) {
    check(p.id, 'AI prompts carry the reader\'s age', /Age: 72/.test(captured[p.id][0].user || ''), '');
  }
}

// ===========================================================================
// GROUP G — warfarin + liver: the meal is GONE, not apologised for.
// ---------------------------------------------------------------------------
// X9 declared warfarin and her 30-day calendar scheduled 262-296 g of beef liver on
// days 5, 6, 19 and 26. Vitamin K swings of that size are an INR problem, and how
// much liver is acceptable is a prescriber's decision about her dose, not something
// this software gets to compute.
//
// So the assertion is behavioural: ZERO liver meals. A report that still schedules
// 296 g of liver and then prints a caution above it has not been fixed, and an
// assertion that "a warning appears" would have passed on exactly that report. The
// warning is checked too, but only after the meals are gone.
//
// The positive control matters just as much: a reader with no anticoagulant must
// still get liver. Removing organ meats from everybody would pass the first half of
// this group and quietly degrade the product for the other 95% of buyers.
// ===========================================================================
const ORGAN_MEAT = /\b(liver|organ meats?|beef heart)\b/i;

/** The meal-calendar rows: what the reader is actually told to cook and eat. */
function mealRows(sections) {
  return (sections[3] || '').split('\n').filter(l => /^\|\s*Day\s*\d+/i.test(l));
}
/** Report #2's food list and Report #4's grocery lists: what they are told to buy. */
function shoppingLines(sections) {
  return ((sections[2] || '') + '\n' + (sections[4] || ''))
    .split('\n').filter(l => /^\s*(?:[-*]|\* \[ \])/.test(l));
}

for (const p of PERSONAS) {
  const sections = rendered[p.id].sections;
  const rows = mealRows(sections);
  const shopping = shoppingLines(sections);
  const organRows = rows.filter(l => ORGAN_MEAT.test(l));
  const organShopping = shopping.filter(l => ORGAN_MEAT.test(l));

  check(p.id, 'the meal calendar was parsed (guards against a silently empty section)',
    rows.length >= 28, `found ${rows.length} day rows in report #3`);

  if (p.expectNoOrganMeats) {
    check(p.id, 'ZERO liver/organ meals are scheduled for an anticoagulant reader',
      organRows.length === 0,
      organRows.length ? `${organRows.length} meal row(s) still schedule it, e.g. ${organRows[0].trim()}` : '');
    check(p.id, 'the reader is not sent shopping for the organ meats their plan omits',
      organShopping.length === 0,
      organShopping.length ? `still listed: ${organShopping.slice(0, 3).map(l => l.trim()).join(' / ')}` : '');
    // Only now does the warning count for anything.
    // The note is a wrapped blockquote, so match against it with the line breaks and
    // "> " prefixes flattened out. Asserting on wrapped prose is how these checks rot.
    const note = (sections[3] || '').replace(/\n>?\s*/g, ' ');
    check(p.id, 'the plan says plainly that items were left out, and routes it to a clinician',
      /leaves out organ meats/i.test(note) &&
      /prescribing clinician or pharmacist/i.test(note), '');
    check(p.id, 'the report does not name an acceptable amount of the omitted food',
      !/\d+\s*(?:g|grams?|oz|ounces?)[^.\n]{0,30}liver/i.test(rendered[p.id].full) &&
      !/liver[^.\n]{0,30}\d+\s*(?:g|grams?|oz|ounces?)/i.test(rendered[p.id].full),
      excerpt(rendered[p.id].full, /liver/i));
  } else {
    // Over-correction guard. Carnivore + moderate budget puts liver in the rotation;
    // if this fails, the fix was applied to everybody instead of to the trigger.
    check(p.id, 'a reader with no anticoagulant still receives organ meats',
      organRows.length > 0,
      'liver was removed from a reader who never declared a blood thinner — that is ' +
      'over-correction, not a fix');
  }
}

// ===========================================================================
// GROUP H — CKD: the protein number is SUPPRESSED, not softened.
// ---------------------------------------------------------------------------
// X9 declared CKD stage 3 and was handed a 154 g/day protein target. calculateMacros()
// reads weight, height, age, sex, goal, diet and activity — it has never seen an eGFR.
//
// The fix is suppression. It is NOT a smaller number: choosing a protein intake for
// reduced kidney function is a clinical decision, and a product that guesses one has
// made the same mistake in a quieter voice. So this group asserts the absence of any
// protein quantity for these readers, in the rendered report AND in the prompt that
// writes the two live sections — and asserts that an unflagged reader still gets one.
// ===========================================================================
{
  // Meal-calendar rows carry grams of FOOD ("206g Ribeye Steak"), which is not a
  // protein target. Everything else is fair game.
  const withoutMealTable = id =>
    rendered[id].full.split('\n').filter(l => !/^\|\s*Day\s*\d+/i.test(l)).join('\n');

  for (const p of PERSONAS) {
    const text = withoutMealTable(p.id);
    const grams = rendered[p.id].macros.protein_grams;
    const proteinLines = text.split('\n').filter(l => /protein/i.test(l));

    if (p.expectNoProteinTarget) {
      check(p.id, 'no individualized protein target appears in the customer-facing report',
        !new RegExp(`\\b${grams}\\s*(?:g\\b|grams?\\b)`, 'i').test(text),
        excerpt(text, new RegExp(`\\b${grams}\\s*g`, 'i')));

      const quantified = proteinLines.filter(l =>
        /\d+(?:\.\d+)?\s*(?:g\b|grams?\b|kg\b|g\/kg\b)/i.test(l));
      check(p.id, 'no sentence about protein carries a quantity of any kind',
        quantified.length === 0,
        quantified.length ? quantified[0].trim().slice(0, 160) : '');

      check(p.id, 'the report says why the protein number is withheld, and to whom to go',
        /does not give you a daily protein/i.test(text) &&
        /renal dietitian/i.test(text), '');
      check(p.id, 'the report does not still claim a precisely calculated protein target',
        !/protein targets are precisely calculated/i.test(text),
        'the report withholds the number in one section and asserts it in another');
      check(p.id, 'the kidney script variant tells them not to use the script',
        /this report does not set a protein target for you/i.test(rendered[p.id].sections[5] || ''), '');

      for (const [i, call] of captured[p.id].entries()) {
        check(p.id, `AI prompt ${i + 1}: the protein figure never reaches the model`,
          !new RegExp(`Protein:\\s*${grams}`).test(call.user || '') &&
          /Protein:\s*WITHHELD/i.test(call.user || ''),
          excerpt(call.user || '', /Protein:.{0,80}/));
        check(p.id, `AI prompt ${i + 1}: the no-protein-target rule is switched on`,
          /Rule 9 is ACTIVE/i.test(call.system || ''), '');
      }
    } else {
      // Over-correction guard, and the only positive control available: the rendered
      // body never prints the figure for anyone, so the prompt is where it shows up.
      for (const [i, call] of captured[p.id].entries()) {
        check(p.id, `AI prompt ${i + 1}: an unflagged reader still receives their protein target`,
          new RegExp(`- Protein: ${grams}g`).test(call.user || ''),
          'the protein target was suppressed for a reader who declared no kidney disease');
      }
      check(p.id, 'an unflagged reader keeps the general kidney caveat, not the suppression one',
        /it does not know your kidney function/i.test(rendered[p.id].sections[5] || ''), '');
    }
  }
}

// ===========================================================================
// GROUP F — the source-level invariants.
// ---------------------------------------------------------------------------
// generateSimpleFallbackReport() and generateFallbackReport() were DELETED on
// 2026-09-07. They were unreachable, but they were a complete second report
// generator that bypassed every guardrail here: no medical safety rule block, no
// medication field in the prompt, no medical-context module, and a prompt that
// asked the model for "how to handle their specific conditions/symptoms". Their
// HTML wrapper also printed an ungated daily protein target.
//
// The earlier version of this block asserted only that nothing CALLED them. That is
// not enough: dead unsafe code does not become safe because a test warns you not to
// call it, and someone restoring a fallback during an incident would have silently
// reverted the report to pre-remediation behaviour. So the assertion is now that the
// definitions do not exist. If you are re-adding a fallback generator, route it
// through api/medical-context.js first and rewrite this block to prove you did.
// ===========================================================================
{
  const src = fs.readFileSync(API, 'utf8');
  const code = src
    // Ignore comments, so the tombstone note that names these functions does not
    // itself trip the assertion.
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '');

  for (const dead of ['generateSimpleFallbackReport', 'generateFallbackReport', 'wrapReportHTML']) {
    const hits = [...code.matchAll(new RegExp('\\b' + dead + '\\b', 'g'))];
    check('SOURCE', `${dead}() is deleted, not merely uncalled`, hits.length === 0,
      `${hits.length} reference(s) remain in api/calculator-api.js. That generator has no ` +
      `medical safety rules, no medication field, and does not use api/medical-context.js. ` +
      `Delete it, or route it through the module and update this assertion deliberately.`);
  }

  check('SOURCE', 'no other report generator posts to the Claude API from this worker',
    (code.match(/api\.anthropic\.com/g) || []).length === 1,
    'more than one Claude call site in calculator-api.js — every one of them must carry ' +
    'buildMedicalSafetyRules(); see api/medical-context.js');

  check('SOURCE', 'the medical-context module is actually imported by the worker',
    /from '\.\/medical-context\.js'/.test(src), '');
  check('SOURCE', 'replacePlaceholders() still derives medical context',
    /const medicalContext = deriveMedicalContext\(data\)/.test(src),
    'the single seam that makes every template section condition-aware is gone');
  // The rendered-body half of GROUP H is currently latent: no shipped template prints
  // {{protein}}, so a regression that ungated the substitution would not show up in
  // the rendered text until someone added the placeholder to a template. That is one
  // edit away, so the seam is asserted directly here. (Mutation-checked: adding
  // {{protein}} to a template AND removing the gate does fail GROUP H.)
  check('SOURCE', 'the {{protein}} substitutions are gated on the kidney-disease flag',
    /const proteinDisplay = medicalContext\.restrictProteinTarget/.test(code) &&
    (code.match(/\{\\\{protein\\\}\\\}\/g, proteinDisplay\)/g) || []).length +
    (code.match(/proteinDisplay\)/g) || []).length >= 2 &&
    !/\{\\\{macros\\\.protein\\\}\\\}\/g, protein\)/.test(code),
    'replacePlaceholders() must render the protein placeholders through proteinDisplay, ' +
    'not through the raw figure — otherwise adding {{protein}} to any template ships an ' +
    'individualized protein target to a reader with declared kidney disease');

  // Updated 2026-09-08. This used to require THREE withMedicalFoodExclusions() call
  // sites, one of them in generateGroceryListByWeek, because that function used to pick
  // its own food and so needed its own copy of the exclusions. It no longer picks food:
  // it aggregates the meal plan's structured items and reads no food database at all
  // (see tests/report-integrity.test.mjs GROUP D). An excluded food therefore cannot
  // reach the shopping list unless it first reached the meal plan, which is what the
  // remaining two call sites and the persona assertions above already cover.
  //
  // The guarantee got stronger, not weaker, so the assertion is split in two rather
  // than relaxed: the generators that still SELECT food must apply exclusions, and the
  // one that must never select food again is pinned shut.
  check('SOURCE', 'the food-selecting generators still apply medical food exclusions',
    (src.match(/withMedicalFoodExclusions\(/g) || []).length >= 2,
    'generateFullMealPlan and generateDynamicFoodGuide must BOTH route restrictions ' +
    'through withMedicalFoodExclusions(), or a withheld food reaches the reader');

  {
    const gStart = src.indexOf('function generateGroceryListByWeek');
    const gBody = gStart === -1 ? '' : src.slice(gStart, src.indexOf('\n}', gStart));
    check('SOURCE', 'the grocery list selects no food of its own',
      gStart !== -1 && !gBody.includes('foodDatabase'),
      'generateGroceryListByWeek reads the food database again. If it picks food it can ' +
      'pick food the meal plan excluded for a medical reason, which is exactly how a ' +
      'withheld item reappears on a shopping list. Either aggregate the meal plan (the ' +
      '2026-09-08 design) or restore its own withMedicalFoodExclusions() gate.');
  }
}

// ===========================================================================
// Report
// ===========================================================================
const W = '─'.repeat(72);
console.log(W);
console.log('$29 REPORT — ADVERSARIAL SAFETY REGRESSION');
console.log(W);
for (const p of PERSONAS) {
  const bad = failures.filter(f => f.persona === p.id).length;
  const macro = rendered[p.id].macros;
  console.log(`${bad ? 'FAIL' : 'PASS'}  ${p.id.padEnd(3)} ${p.name}`);
  console.log(`        ${rendered[p.id].full.length} chars · ${macro.calories} kcal · ${macro.protein_grams}g protein` +
              (bad ? ` · ${bad} failed assertion${bad > 1 ? 's' : ''}` : ''));
}
console.log(W);

if (failures.length) {
  console.log(`\n${failures.length} of ${checks} assertions FAILED:\n`);
  for (const f of failures) {
    console.log(`  [${f.persona}] ${f.name}`);
    if (f.detail) console.log(`      ${f.detail}`);
  }
  console.log(`\nThis is a P0 safety suite on a paid health product. Do not silence a`);
  console.log(`failing assertion to get a green run — fix the report content.\n`);
  process.exit(1);
}

console.log(`\n${checks} assertions passed across ${PERSONAS.length} personas.`);
console.log(`\nStill NOT covered by this suite: the live text of reports #1 and #6, which`);
console.log(`Claude writes at request time. Only their prompts are audited here.\n`);
