#!/usr/bin/env node
/**
 * tests/kd-report-safety.test.mjs
 *
 * ADVERSARIAL SAFETY REGRESSION FOR THE PAID KETODIAL REPORTS.
 *
 * Run it:
 *     node tests/kd-report-safety.test.mjs
 *     node tests/kd-report-safety.test.mjs --dump /tmp/kd-reports   (writes the HTML)
 *
 * No dependencies, no network, no Stripe, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-09-08 the live KetoDial worker was found to be emailing every paying
 * customer the same quantitative electrolyte protocol:
 *
 *     Sodium     3,000-5,000 mg/day
 *     Potassium  ~3,500 mg/day, "a potassium-chloride 'lite salt' helps fill the gap"
 *     Magnesium  300-400 mg/day
 *     plus a supplement table, "lite salt" on the shopping list, "Salt everything",
 *     "a cup of broth a day" and "drink more water than feels normal".
 *
 * A customer on lisinopril received all of that. The only gating was a `medWarning`
 * text callout printed UNDERNEATH the numbers, chosen by a keyword list
 * (`lisinopril` | `ace` | `arb` | `metformin` | `insulin`) that failed open on every
 * brand name it did not know. And the intake form offered no kidney option at all,
 * so a CKD customer could not declare the one condition that matters most here.
 *
 * THE ACCEPTANCE TEST THIS FILE ENCODES:
 *
 *     A reader who declares a medication, or a cardiac / renal / blood-pressure
 *     condition, receives NO quantitative electrolyte protocol - not a gentler one -
 *     while the healthy baseline still receives the protocol in full.
 *
 * Both halves matter, and the second half is not decoration. Suppressing the
 * protocol for everybody would satisfy every suppression assertion below and break
 * the product in a different way, so GROUP D asserts the healthy reader still gets
 * the whole thing, quantities included.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS FILE DOES *NOT* COVER - read this before trusting a green run
 * ---------------------------------------------------------------------------
 *   - It renders `generateStarterKit`, `generateDoctorReport` and `generateMealPlan`
 *     exactly as ketodial/worker/index.js does at /report/:id, but it does not
 *     exercise the Stripe webhook, the email body, or the PDF conversion.
 *   - It asserts on the rendered HTML, not on a screenshot. A quantity hidden in a
 *     CSS pseudo-element or an image would not be seen.
 *   - The intake half of the fix (the kidney and heart checkboxes) lives in a
 *     DIFFERENT REPOSITORY - ketodial/public is a git submodule pointing at
 *     github.com/MikeBrew123/ketodial. GROUP F asserts the checkbox exists in the
 *     working tree; it cannot tell you whether that repo has been committed and
 *     deployed to ketodial.com. Until it is, a CKD customer still cannot declare
 *     CKD, and the gate protects them only through the free-text medication box.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const REPORTS_JS = path.join(REPO, 'ketodial', 'worker', 'reports.js');
const INTAKE_HTML = path.join(REPO, 'ketodial', 'public', 'index.html');

const { generateStarterKit, generateDoctorReport, generateMealPlan, deriveKdMedicalContext } =
  await import('file://' + REPORTS_JS);
const { validateIntake } = await import('file://' + path.join(REPO, 'ketodial', 'worker', 'intake.js'));

// ===========================================================================
// THE PERSONAS
// ---------------------------------------------------------------------------
// Field names and shapes come from the shipped intake bundle
// (ketodial/public/ketodial.js -> collectFormData()), which is the object the
// worker receives verbatim through Stripe checkout metadata. `conditions` is an
// array of checkbox slugs; `meds` is a free-text input.
//
// H1 and K2 are the load-bearing pair. Keep them. The others exist so a fix cannot
// be special-cased to that one comparison.
// ===========================================================================
const BASE = {
  sex: 'female', age: 58, weightKg: 88, heightCm: 165,
  goal: 'lose', activity: 'sedentary',
  // The early renal gate, asked once before the free protein result. Every persona
  // states it explicitly: an absent answer now fails CLOSED, so a fixture that
  // omitted it would be over-suppressed and every assertion below would pass for
  // the wrong reason.
  kidneyStatus: 'no',
  calories: 1650, fatG: 128, proteinG: 113, carbG: 25, tdee: 2060,
  dairy: 'Fine with dairy', cooking: 'Basic — I can follow a recipe',
  prepTime: '30 minutes', cookingFor: 'Two',
  conditions: [], symptoms: ['energy'], diets: ['cal'],
  budget: 'moderate', meds: '', challenge: 'Evening snacking',
};

const PERSONAS = [
  { id: 'H1', name: 'Healthy baseline: no conditions, no medications',
    expectRestricted: false,
    d: { ...BASE, conditions: ['none'], symptoms: ['none'], meds: '' } },

  { id: 'K2', name: 'Kidney disease / CKD, no medications',
    expectRestricted: true, expectRenal: true,
    d: { ...BASE, kidneyStatus: 'yes', conditions: ['kidney'], meds: '' } },

  { id: 'A3', name: 'ACE inhibitor, no conditions declared',
    expectRestricted: true,
    d: { ...BASE, conditions: [], meds: 'Lisinopril 20mg daily' } },

  { id: 'D4', name: 'Diuretic, no conditions declared',
    expectRestricted: true,
    d: { ...BASE, conditions: [], meds: 'Hydrochlorothiazide 25mg daily' } },

  { id: 'C5', name: 'Heart condition, no medications',
    expectRestricted: true,
    d: { ...BASE, conditions: ['heart'], meds: '' } },

  { id: 'B6', name: 'Blood-pressure medication (a calcium channel blocker)',
    expectRestricted: true,
    d: { ...BASE, conditions: [], meds: 'Amlodipine 5mg daily' } },

  // ---------------------------------------------------------------------------
  // The seventh persona is the whole reason the trigger is not a keyword list.
  // "the little white one for my heart" names no drug, matches no brand, and is
  // exactly what a real 71-year-old types into a free-text box. If the gate ever
  // goes back to parsing drug names, this is the persona that goes unprotected.
  // ---------------------------------------------------------------------------
  { id: 'W7', name: 'Unparseable free text: "the little white one for my heart"',
    expectRestricted: true,
    d: { ...BASE, conditions: [], meds: 'the little white one for my heart' } },

  // W7 is not enough on its own, and finding that out is why mutation testing is
  // worth the hour. Replacing the gate with a keyword list left W7 PASSING - the
  // word "heart" in her free text happened to match the cardio/renal term list, so
  // she stayed protected by accident. U8 removes the accident. Nothing she typed
  // matches any term, any drug name or any condition slug. The ONLY thing that
  // protects her is the fact that she typed something at all, which is precisely
  // the property this gate is supposed to have.
  { id: 'U8', name: 'Free text matching nothing at all: "the little white ones, morning and night"',
    expectRestricted: true,
    d: { ...BASE, conditions: [], meds: 'the little white ones, one in the morning and one at night' } },

  // K10 exists because K2 declares kidney disease through the `kidney` slug alone.
  // A protein fix keyed to that slug would leave every reader who typed it in free
  // text unprotected, which is most of them.
  // kidneyStatus stays 'no' HERE ON PURPOSE. K10 is the backstop persona: someone who
  // answered No to a formal diagnosis and then typed CKD into the medications box.
  // If the early question were the only signal, this reader would be unprotected.
  { id: 'K10', name: 'Answered No to the early gate but declared CKD in free text',
    expectRestricted: true, expectNoProteinTarget: true,
    d: { ...BASE, kidneyStatus: 'no', conditions: [], meds: 'I see a nephrologist for CKD stage 3' } },

  // "I'm not sure" is treated exactly as "yes". Asking a customer to rule out their
  // own renal function is the one judgement this software is least entitled to ask for.
  { id: 'U11', name: 'Answered "I\'m not sure" to the early gate',
    expectRestricted: true, expectNoProteinTarget: true,
    d: { ...BASE, kidneyStatus: 'unsure', conditions: [], meds: '' } },
];

// ---------------------------------------------------------------------------
// NOT A PERSONA ANY MORE: the truncation case.
//
// This used to be persona T9, `d: {}`, and it asserted that a report rendered from
// a lost questionnaire came out RESTRICTED. That was the best available answer while
// the questionnaire lived in a 490-character Stripe metadata slice, because the
// alternative was rendering it unrestricted.
//
// It was never a good answer. The electrolyte gate fired, but generateDoctorReport
// never consulted the gate at all and simply substituted `wKg=75, hCm=170,
// cal=1800`, printing BMI 26.0 for a customer whose BMI was 32.3 on a document
// written to be handed to her physician. A suite asserting "renders restricted"
// went green over the top of that.
//
// As of 2026-09-08 the authoritative questionnaire is in calculator_sessions_v2 and
// an empty object is not something a generator may render AT ALL. So the expectation
// inverts: these inputs must THROW. GROUP F below asserts it.
// ---------------------------------------------------------------------------
//
// TWO LAYERS, AND THEY PROMISE DIFFERENT THINGS. Getting this wrong is how you write
// a test that looks strict and is actually lying:
//
//   REQUEST LAYER (intake.js validateIntake, asserted in kd-intake-authority.test.mjs)
//     The intake RECORD must be complete. Any missing required fact rejects the whole
//     record before a generator is reached. This is the real gate.
//
//   GENERATOR LAYER (requireFacts, asserted below)
//     Each generator refuses on the facts IT consumes. It is a backstop for a future
//     caller that reaches a generator by some other route.
//
// A generator that never touches weightKg cannot fabricate weightKg, so demanding
// that generateStarterKit refuse a missing weight would be theatre. `refusedBy`
// records which generators genuinely consume each missing fact.
const MUST_REFUSE = [
  { id: 'R1', why: 'form entirely lost (the old truncation case)', d: {},
    refusedBy: ['doctor', 'meal', 'starter'] },
  { id: 'R2', why: 'macros lost, body facts intact',
    d: { ...BASE, calories: undefined, proteinG: undefined, fatG: undefined, carbG: undefined },
    refusedBy: ['doctor', 'meal', 'starter'] },
  { id: 'R3', why: 'body facts lost, macros intact',
    d: { ...BASE, weightKg: undefined, heightCm: undefined },
    refusedBy: ['doctor'] },
  { id: 'R4', why: 'protein target lost on its own',
    d: { ...BASE, proteinG: undefined },
    refusedBy: ['doctor', 'meal'] },
  { id: 'R5', why: 'null rather than undefined',
    d: { ...BASE, weightKg: null, calories: null },
    refusedBy: ['doctor', 'meal'] },
  // The early gate itself going missing. A safety question that was never recorded
  // is not a negative answer, and no generator may proceed on one.
  { id: 'R6', why: 'the early kidney answer was never recorded',
    d: { ...BASE, kidneyStatus: undefined },
    refusedBy: ['doctor', 'meal', 'starter'] },
];

const BASELINE = 'H1';

// ===========================================================================
// Quantities a restricted reader must never be handed.
// Each pattern is scoped so it cannot fire on the reader's OWN echoed medication
// string ("Lisinopril 20mg daily"), which is stripped before these run - the report
// repeating back what the customer told us is not the report issuing a dose.
// ===========================================================================
// Applied to the STARTER KIT, which is the consumer document that carried the
// protocol. Cooking measurements have no business in it.
const KIT_QUANTITIES = [
  { re: /\d[\d,]*\s*mg\b/i, why: 'dose in milligrams' },
  { re: /\d[\d,]*\s*(?:mmol|meq)\b/i, why: 'dose in mmol/mEq' },
  { re: /(?:sodium|potassium|magnesium|electrolytes?|salt|broth|fluid)[^.<]{0,60}?\b\d[\d,]*(?:[.,]\d+)?\s*(?:mg|g|grams?|mmol|meq|tsp|teaspoons?|tbsp|tablespoons?|servings?|liters?|litres?|cups?|oz|ounces?)\b/i,
    why: 'electrolyte amount' },
  { re: /\b\d[\d,]*\s*(?:mg|g|grams?)\s*(?:\/\s*|per\s+)day\b/i, why: 'daily amount' },
  { re: /\b\d+\s*(?:tsp|teaspoons?|tbsp|tablespoons?)\b/i, why: 'salt or supplement measurement' },
  { re: /\b\d+(?:[.,]\d+)?\s*(?:liters?|litres?|cups?|glasses)\s*(?:a day|per day|daily|of water)/i,
    why: 'daily fluid volume' },
];

// Applied to EVERY paid document, including the meal plan and the physician
// handout. Deliberately narrower: the meal plan says "1 tbsp butter" and the
// handout says "Magnesium, potassium — Baseline, 4 wk", and neither is a dose. A
// milligram or millimole figure is, wherever it appears.
const CROSS_DOCUMENT_DOSES = [
  { re: /\d[\d,]*\s*mg\b/i, why: 'dose in milligrams' },
  { re: /\d[\d,]*\s*(?:mmol|meq)\b/i, why: 'dose in mmol/mEq' },
  { re: /\b\d[\d,]*\s*(?:mg|grams?)\s*(?:\/\s*|per\s+)day\b/i, why: 'daily amount' },
];

/** The protocol, as the healthy reader is supposed to still receive it. */
const PROTOCOL_MARKERS = [
  { re: /3,000[–\-]5,000\s*mg\/day/i, what: 'the sodium target' },
  { re: /2,600\s*mg\/day\s+women,\s*3,400\s+men/i, what: 'the potassium target' },
  { re: /300[–\-]400\s*mg\/day/i, what: 'the magnesium target' },
  { re: /Supplements worth considering/i, what: 'the supplement table' },
  { re: /Electrolyte powder/i, what: 'the electrolyte supplement row' },
  // This slot used to hold the lite-salt OFFER ("a potassium-chloride 'lite salt'
  // helps fill the gap"), chosen because it matched the offer rather than the
  // mention: blanket-suppressing everybody leaves "Do not treat any of it with
  // salt, lite salt or an electrolyte supplement" in the text, and a bare
  // /lite salt/ marker was satisfied by that sentence — the one marker out of
  // eight that mutation 3 did not turn red. The offer itself was retired on
  // 2026-09-09 when the potassium figures were aligned across both sites: this
  // kit no longer gives potassium-chloride dosing to ANY reader, matching what
  // the Carnivore Weekly report already said. The callout below is its
  // replacement — it renders only on the unrestricted path, so it turns red
  // under exactly the same blanket-suppression mutation.
  { re: /These are general figures, not targets set for you/i, what: 'the general-figures callout that only the unrestricted path prints' },
  { re: /Olive oil, sea salt, "lite salt"/i, what: 'lite salt on the shopping list' },
  { re: /Bone broth, no-sugar electrolyte mix/i, what: 'the electrolyte mix on the shopping list' },
  { re: /Salt everything/i, what: 'the "salt everything" rule' },
  { re: /Drink more water than feels normal/i, what: 'the fluid instruction' },
];

// ===========================================================================
// Harness
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

/** HTML -> the words a customer actually reads. */
function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    // Collapse every whitespace run, newlines included. The source wraps its prose,
    // so an assertion written as one sentence must not depend on where the wrap fell.
    .replace(/\s+/g, ' ')
    .trim();
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

/**
 * Page 3 of the starter kit is the net-carb cheat sheet: a static per-serving food
 * table, identical for every reader, that says things like "Olive oil / butter ·
 * 1 tbsp · 0g". Those are portion sizes on a food reference, not supplement doses,
 * so the loose measurement patterns are not run against them.
 *
 * Returns null if either boundary is missing, so a rename cannot silently reduce
 * the scanned text to nothing and turn this whole group green by accident. Callers
 * assert on that.
 */
function withoutCheatSheet(text) {
  const start = text.indexOf('The Net-Carb Cheat Sheet');
  const end = text.indexOf('Your starter shopping list');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(0, start) + ' ' + text.slice(end);
}

/** Split into sentences so a term can be checked in the context it appears in. */
function sentences(text) {
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
}

// ===========================================================================
// Render every persona through the SAME calls ketodial/worker/index.js makes at
// GET /report/:id (`default:` branch, i.e. the "protocol" bundle - all three).
// ===========================================================================
const rendered = {};
for (const p of PERSONAS) {
  const name = 'Linda Test';
  const starter = generateStarterKit(name, p.d);
  const doctor = generateDoctorReport(name, p.d);
  const meal = generateMealPlan(name, p.d);
  const all = doctor + meal + starter;

  // The reader's own declared medication is echoed back to them by design. That is
  // not this report issuing a dose, so it is removed before the quantity scan.
  const declared = (p.d.meds || '').trim();
  const strip = s => declared ? s.split(new RegExp(declared.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')).join(' ') : s;

  rendered[p.id] = {
    starterHtml: starter,
    doctorHtml: doctor,
    mealHtml: meal,
    allHtml: all,
    mealText: toText(meal),
    starter: toText(starter),
    doctor: toText(doctor),
    all: toText(all),
    scanStarter: strip(toText(starter)),
    scanAll: strip(toText(all)),
  };
}

const dumpIdx = process.argv.indexOf('--dump');
if (dumpIdx > -1 && process.argv[dumpIdx + 1]) {
  const dir = process.argv[dumpIdx + 1];
  fs.mkdirSync(dir, { recursive: true });
  for (const p of PERSONAS) {
    fs.writeFileSync(path.join(dir, `${p.id}-starter.html`), rendered[p.id].starterHtml);
    fs.writeFileSync(path.join(dir, `${p.id}-all.html`), rendered[p.id].allHtml);
    fs.writeFileSync(path.join(dir, `${p.id}-starter.txt`),
      rendered[p.id].starter.replace(/\n{3,}/g, '\n\n'));
  }
  console.log(`Rendered output written to ${dir}\n`);
}

// ===========================================================================
// GROUP A - restricted readers get NO quantitative electrolyte protocol.
// Behavioural: the numbers are absent, not annotated. A report that prints
// "Potassium ~3,500 mg/day" with a caution above it has not been fixed, and an
// assertion that "a warning appears" would have passed on exactly that report.
// ===========================================================================
for (const p of PERSONAS) {
  if (!p.expectRestricted) continue;
  const scan = withoutCheatSheet(rendered[p.id].scanStarter);
  check(p.id, 'the cheat-sheet boundary was found (guards against a vacuously empty scan)',
    scan !== null && scan.length > rendered[p.id].scanStarter.length * 0.55,
    scan === null ? 'withoutCheatSheet() lost its boundary headings — the quantity sweep below ' +
      'would have run against nothing' : `scan is ${scan.length} of ${rendered[p.id].scanStarter.length} chars`);
  if (scan === null) continue;

  for (const q of KIT_QUANTITIES) {
    check(p.id, `starter kit contains no ${q.why}`, !q.re.test(scan), excerpt(scan, q.re));
  }
  for (const q of CROSS_DOCUMENT_DOSES) {
    const all = rendered[p.id].scanAll;
    check(p.id, `no ${q.why} in ANY of the three paid reports`, !q.re.test(all), excerpt(all, q.re));
  }

  // Named, per the brief. These duplicate the sweep above on purpose: when this
  // suite goes red these are the lines that say what a customer would have read.
  check(p.id, 'no potassium target', !/potassium[^.<]{0,60}\d/i.test(scan) &&
    !/\d[^.<]{0,60}potassium/i.test(scan), excerpt(scan, /potassium/i));
  check(p.id, 'no quantitative sodium target', !/sodium[^.<]{0,60}\d/i.test(scan) &&
    !/\d[^.<]{0,60}sodium/i.test(scan), excerpt(scan, /sodium/i));
  check(p.id, 'no electrolyte supplement dose', !/supplements? worth considering/i.test(scan) &&
    !/electrolyte powder/i.test(scan), excerpt(scan, /supplement/i));

  // "Lite salt" may appear ONLY where the reader is being warned off it.
  const offers = sentences(scan).filter(s => /lite\s*salt/i.test(s))
    .filter(s => !/\b(do not|don't|never|avoid|not\b)/i.test(s));
  check(p.id, 'no Lite Salt / potassium-chloride guidance is offered',
    offers.length === 0, offers[0] || '');

  // Fluid. The old kit told them to drink more than feels normal.
  check(p.id, 'no fluid-intake instruction',
    !/drink more (?:water )?than feels normal/i.test(scan) &&
    !/drink more water/i.test(scan), excerpt(scan, /drink/i));

  // The shopping list must not send them out for the things the kit withheld.
  check(p.id, 'not sent shopping for lite salt or an electrolyte mix',
    !/"lite salt"/i.test(scan) && !/no-sugar electrolyte mix/i.test(scan), '');
}

// ===========================================================================
// GROUP B - and they are told why, and where to go instead.
// This runs AFTER Group A on purpose. The wording only counts once the numbers
// are actually gone.
// ===========================================================================
for (const p of PERSONAS) {
  if (!p.expectRestricted) continue;
  const t = rendered[p.id].starter;

  check(p.id, 'the kit says plainly that it is withholding the amounts',
    /does not set sodium, potassium, fluid or supplement amounts for you/i.test(t), '');
  check(p.id, 'the decision is routed to the reader\'s own clinician',
    /Ask the clinician who manages your condition or your prescription/i.test(t), '');
  check(p.id, 'the kit names what the reader declared',
    new RegExp('You told us about', 'i').test(t), '');
  check(p.id, 'the reader is told not to self-treat symptoms with salt',
    /Do not treat any of it with salt, lite salt or an electrolyte supplement/i.test(t), '');
  check(p.id, 'the reader is told not to change their own medication',
    /Do not change, stop or re-time any medication/i.test(t), '');
  check(p.id, 'the rest of the kit is not silently truncated',
    /Net-Carb Cheat Sheet/i.test(t) && /starter shopping list/i.test(t),
    'the suppression removed more of the product than it was supposed to');
}

// ===========================================================================
// GROUP C - the CKD-specific half, and the intake gap it depended on.
// ===========================================================================
{
  const p = PERSONAS.find(x => x.id === 'K2');
  const doc = rendered.K2.doctor;

  check('K2', 'the physician handout states the reported kidney disease',
    /Kidney disease \/ CKD/i.test(doc),
    'CONDITION_INFO has no `kidney` entry, so generateDoctorReport() filtered the ' +
    'condition out and the patient handed their doctor a report that never mentioned it');
  check('K2', 'the physician handout defers the electrolyte decision to a clinician',
    /renal dietitian/i.test(doc) || /clinician who manages your kidneys/i.test(doc), '');
  check('K2', 'the starter kit carries a kidney-specific watch-out',
    /kidney team sets your electrolytes/i.test(rendered.K2.starter), '');
}
{
  const doc = rendered.C5.doctor;
  check('C5', 'the physician handout states the reported heart condition',
    /Heart condition/i.test(doc), '');
}

// ===========================================================================
// GROUP C2 - PROTEIN SUPPRESSION. Added 2026-09-08 (Audit 2B).
// ---------------------------------------------------------------------------
// `renal` was computed by deriveKdMedicalContext from the day it was written,
// returned in the context object, and read by NOTHING. Carnivore Weekly treats an
// undeclared protein target for a reader with kidney disease as a P0. KetoDial
// computed the identical flag and then printed the customer's protein target in the
// Doctor's Report and twice in the meal plan, on top of a seven-day plan that was
// byte-identical to the healthy persona's.
//
// The rule is SUPPRESS, NOT SUBSTITUTE, and it has three parts, all asserted here:
//   1. no protein figure anywhere, in any unit
//   2. no SMALLER protein figure either - that is the same clinical decision, quieter
//   3. no plan whose portions were sized from the figure we refused to state
// ===========================================================================
for (const p of PERSONAS.filter(x => x.expectNoProteinTarget)) {
  const docHtml = rendered[p.id].doctorHtml;
  const docText = rendered[p.id].doctor;
  const mealHtml = rendered[p.id].mealHtml;
  const mealText = rendered[p.id].mealText;
  const allText = rendered[p.id].all;
  const target = String(p.d.proteinG);

  check(p.id, 'the gate actually raised restrictProteinTarget',
    deriveKdMedicalContext(p.d).restrictProteinTarget === true,
    'renal was detected but the protein switch did not follow it');

  check(p.id, `their protein target (${target} g) appears NOWHERE in any document`,
    !new RegExp(`\\b${target}\\s*(g|grams)\\b`, 'i').test(allText),
    'the figure the report says it is not setting is printed somewhere in it');

  check(p.id, 'no protein target in any unit: g, g/kg, %, or per meal',
    !/\b\d{1,3}\s*(?:g|grams)\s*(?:of\s+)?protein\b/i.test(allText) &&
    !/protein[^.]{0,40}?\b\d{1,3}\s*(?:g|grams)\b/i.test(allText) &&
    !/\b\d(?:\.\d)?\s*g\s*\/\s*kg\b/i.test(allText),
    'a protein amount survived in some other unit');

  check(p.id, 'the Doctor\'s Report says plainly that no protein target was set',
    /does not set a protein target|not set by this report/i.test(docText), '');

  check(p.id, 'and says it will not give a lower number instead',
    /lower or more cautious|not.{0,30}lower/i.test(docText), '');

  // The macro panel is a closed system: energy, fat and carbohydrate state protein
  // by subtraction. Blanking one row is not suppression.
  check(p.id, 'the whole macro panel is withheld, not just the protein row',
    !/class="macro-line"/.test(docHtml),
    'calories + fat + carbs still print, so the protein figure is recoverable by arithmetic');

  // The meal plan is protein-anchored twice over (minDensity, protScale). Hiding the
  // number while the food still carries it is cosmetic safety.
  check(p.id, 'no protein-anchored meal plan is generated at all',
    !/class="wg"/.test(mealHtml) && /renal dietitian/i.test(mealText),
    'the seven-day plan was still built from the suppressed protein target');

  check(p.id, 'and the customer is told they can have the meal plan refunded',
    /refund/i.test(mealText), '');
}

// ===========================================================================
// GROUP F2 - NO REPORT WITHOUT AUTHORITATIVE INTAKE.
// ---------------------------------------------------------------------------
// The inversion described at MUST_REFUSE. Each of these inputs previously produced
// a confident document about a body nobody had described. Each must now throw.
// ===========================================================================
/**
 * The exact constants the generators used to substitute, per fact. These are the
 * numbers that printed BMI 26.0 for an 88 kg customer. Each is only meaningful as
 * evidence when that particular fact is missing from the intake under test.
 */
const OLD_FALLBACKS = {
  calories: /\b1,?800\b/,
  fatG: /\b140\s*g\b/,
  proteinG: /\b113\s*g\b/,
  carbG: /\b25\s*g\b/,
  weightKg: /\b75(?:\.0)?\s*kg\b/,
  heightCm: /\b170\s*cm\b/,
};

const GENERATORS = { doctor: generateDoctorReport, meal: generateMealPlan, starter: generateStarterKit };
const GEN_LABEL = { doctor: "Doctor's Report", meal: 'meal plan', starter: 'starter kit' };

for (const c of MUST_REFUSE) {
  // 1. The request layer rejects the whole record, whatever any one generator needs.
  let recordThrew = null;
  try { validateIntake({ ...c.d, stepCompleted: 2 }); } catch (e) { recordThrew = e; }
  check(c.id, `validateIntake rejects the whole record when ${c.why}`,
    recordThrew !== null && recordThrew.name === 'IntakeError',
    recordThrew ? `threw ${recordThrew.name}` : 'an incomplete intake record was accepted');

  // 2. The generator layer refuses for every generator that consumes a lost fact.
  for (const key of c.refusedBy) {
    let threw = null, output = null;
    try { output = GENERATORS[key]('Linda Test', c.d); } catch (e) { threw = e; }
    check(c.id, `${GEN_LABEL[key]} refuses to render when ${c.why}`,
      threw !== null && threw.name === 'IntakeError',
      threw ? `threw ${threw.name}, expected IntakeError` :
        `rendered ${output ? output.length : 0} characters from an intake it did not have`);
  }

  // 3. THE ORIGINAL DEFECT, stated directly: whatever happened, no document exists
  //    that describes the 75 kg / 170 cm / 1800 kcal person nobody was.
  //
  //    Checked PER MISSING FACT, not as one blanket scan. BASE.proteinG is 113, which
  //    is also the old proteinG fallback, so a blanket scan flags a customer's real
  //    protein figure as fabricated the moment some unrelated fact goes missing. A
  //    default is only evidence of fabrication for a fact that is actually absent.
  for (const key of Object.keys(GENERATORS)) {
    let html = null;
    try { html = GENERATORS[key]('Linda Test', c.d); } catch { /* refusing is the pass */ }
    if (html === null) continue;
    const leaked = Object.entries(OLD_FALLBACKS)
      .filter(([fact]) => c.d[fact] === undefined || c.d[fact] === null)
      .filter(([, re]) => re.test(html))
      .map(([fact]) => fact);
    check(c.id, `${GEN_LABEL[key]} printed no substituted default when ${c.why}`,
      leaked.length === 0,
      leaked.length ? `rendered the old hardcoded fallback for: ${leaked.join(', ')}` : '');
  }
}

// ===========================================================================
// GROUP D - THE POSITIVE CONTROL.
// ---------------------------------------------------------------------------
// If the gate suppresses the protocol for everybody it satisfies every assertion
// above and the product is broken in a different way. The healthy baseline must
// still receive the electrolyte protocol IN FULL, quantities included.
// ===========================================================================
{
  const t = rendered[BASELINE].starter;

  for (const m of PROTOCOL_MARKERS) {
    check(BASELINE, `healthy baseline still receives ${m.what}`, m.re.test(t),
      'the healthy reader lost it too — that is over-correction, not a fix');
  }
  check(BASELINE, 'healthy baseline does NOT get the suppression notice',
    !/does not set sodium, potassium, fluid or supplement amounts for you/i.test(t),
    'everyone is being suppressed, which is not a working gate');
  check(BASELINE, 'healthy baseline is still told the figures are general, not personal',
    /these figures stop applying to you and become a question for your doctor/i.test(t), '');

  // The restricted kit must be a different section, not a tweaked copy of it.
  const grab = (id, re) => {
    const m = rendered[id].starter.match(re);
    return m ? m[0] : '';
  };
  const page2 = id => {
    const t2 = rendered[id].starter;
    const start = t2.indexOf('03');
    const end = t2.indexOf('Net-Carb Cheat Sheet');
    return start > -1 && end > start ? t2.slice(start, end) : t2;
  };
  for (const p of PERSONAS) {
    if (!p.expectRestricted) continue;
    const sim = similarity(page2(BASELINE), page2(p.id));
    check(p.id, 'the electrolyte pages are substantially different from the baseline, not a tweaked copy',
      sim < 0.55, `trigram similarity to the healthy baseline is ${sim.toFixed(2)} (want < 0.55)`);
  }
  void grab;
}

// ===========================================================================
// GROUP E - source invariants. The gate must stay the thing that decides.
// ===========================================================================
{
  const src = fs.readFileSync(REPORTS_JS, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

  check('SOURCE', 'the containment gate exists and is exported',
    /export function deriveKdMedicalContext\(/.test(code), '');
  check('SOURCE', 'the gate fails closed on ANY declared medication, not on a keyword match',
    /hasDeclaredMedication \|\| cardioRenal \|\| unknownConditionSlug/.test(code),
    'restrictElectrolyteProtocol must be driven by the presence of a declaration, never ' +
    'by whether a drug name was recognised');
  check('SOURCE', 'generateStarterKit routes through the gate',
    /const ctx = deriveKdMedicalContext\(d\)/.test(code) &&
    /const restricted = ctx\.restrictElectrolyteProtocol/.test(code), '');
  check('SOURCE', 'the old keyword-driven medWarning is deleted, not merely unused',
    !/\bmedWarning\b/.test(code) && !/\bhasBPMed\b/.test(code) && !/\bhasDiabetesMed\b/.test(code),
    'that block chose which caution to print underneath numbers that printed regardless, ' +
    'and failed open on every brand name it did not know');
  check('SOURCE', 'kidney and heart are interpretable conditions, so the doctor report cannot drop them',
    /^\s*kidney: \{/m.test(code) && /^\s*heart: \{/m.test(code), '');
  check('SOURCE', 'an unreadable / truncated form fails closed',
    /const unreadableIntake = !\('conditions' in data\) && !\('meds' in data\)/.test(code) &&
    /\|\| unreadableIntake;/.test(code),
    'index.js truncates the questionnaire to 490 chars of Stripe metadata and falls back ' +
    'to {}; an empty form must not read as an all-clear');
  check('SOURCE', 'an unrecognised condition slug fails closed',
    /unknownConditionSlug = declaredConditionSlugs\.some\(c => !KD_KNOWN_CONDITION_SLUGS\.has\(c\)\)/.test(code),
    'the intake form is in another repository and can ship a new checkbox before this ' +
    'worker learns what it means');
}

// ===========================================================================
// GROUP F - the intake half. See the header: this is a working-tree check only.
// ===========================================================================
{
  let intake = '';
  try { intake = fs.readFileSync(INTAKE_HTML, 'utf8'); } catch { /* reported below */ }
  check('INTAKE', 'ketodial/public/index.html is readable', intake.length > 0,
    'cannot verify the intake form; ketodial/public is a git submodule and may not be checked out');
  check('INTAKE', 'the intake form offers a kidney disease option',
    /data-val="kidney"/.test(intake),
    'until a customer can declare CKD, the gate looks like it works while protecting nobody');
  check('INTAKE', 'the intake form offers a heart condition option',
    /data-val="heart"/.test(intake), '');
  // Every slug the form can send must be one the worker interprets, or the worker
  // fails closed and suppresses for a reader who declared something harmless.
  const formSlugs = [...intake.matchAll(/class="checkchip"[^>]*data-val="([a-z0-9]+)"/g)]
    .map(m => m[1]);
  const conditionSlugs = formSlugs.slice(0, formSlugs.indexOf('none') + 1)
    .filter(s => s !== 'none');
  const known = ['t2d', 'pre', 'bp', 'chol', 'thy', 'pcos', 'liver', 'gerd', 'ibs', 'kidney', 'heart'];
  const unknown = conditionSlugs.filter(s => !known.includes(s));
  check('INTAKE', 'every condition checkbox the form can send is one the worker interprets',
    unknown.length === 0,
    unknown.length ? `the form can send ${unknown.join(', ')}, which reports.js does not know` : '');
}

// ===========================================================================
// Report
// ===========================================================================
const W = '─'.repeat(76);
console.log(W);
console.log('KETODIAL PAID REPORTS — ELECTROLYTE CONTAINMENT REGRESSION');
console.log(W);
for (const p of PERSONAS) {
  const bad = failures.filter(f => f.persona === p.id).length;
  console.log(`${bad ? 'FAIL' : 'PASS'}  ${p.id.padEnd(3)} ${p.name}`);
  console.log(`        ${rendered[p.id].allHtml.length} chars · protocol ` +
    `${p.expectRestricted ? 'SUPPRESSED' : 'FULL'}` + (bad ? ` · ${bad} failed assertion${bad > 1 ? 's' : ''}` : ''));
}
for (const scope of ['SOURCE', 'INTAKE']) {
  const bad = failures.filter(f => f.persona === scope).length;
  console.log(`${bad ? 'FAIL' : 'PASS'}  ${scope}` + (bad ? ` · ${bad} failed assertion${bad > 1 ? 's' : ''}` : ''));
}
console.log(W);

if (failures.length) {
  console.log(`\n${failures.length} of ${checks} assertions FAILED:\n`);
  for (const f of failures) {
    console.log(`  [${f.persona}] ${f.name}`);
    if (f.detail) console.log(`      ${f.detail}`);
  }
  console.log(`\nThis is a P0 safety suite on a paid health product that is emailing`);
  console.log(`customers right now. Do not silence a failing assertion to get a green`);
  console.log(`run — fix the report content.\n`);
  process.exit(1);
}

console.log(`\n${checks} assertions passed across ${PERSONAS.length} personas.`);
console.log(`\nNOT covered: the Stripe webhook, the email body, PDF conversion, and`);
console.log(`whether the ketodial/public submodule has been committed and deployed to`);
console.log(`ketodial.com. GROUP F checks the working tree, not the live form.\n`);
