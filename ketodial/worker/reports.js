/**
 * KetoDial Report Templates
 *
 * Three report generators that produce complete, standalone HTML documents
 * matching the Claude Design templates pixel-for-pixel. CSS is inlined.
 *
 * Exports:
 *   generateDoctorReport(name, formData)  -> HTML string
 *   generateMealPlan(name, formData)      -> HTML string
 *   generateStarterKit(name, formData)    -> HTML string
 *
 * Every generator here takes a VALIDATED intake object (ketodial/worker/intake.js).
 * None of them may substitute a customer fact it was not given — see requireFacts().
 */

import { requireFacts, requireDeclaredAnswers } from './intake.js';

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────

function reportId() {
  const now = new Date();
  const y = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 90) + 10);
  return `KD-${y}-${mm}${dd}-${seq}`;
}

function fmtDate() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

function fmtNum(n) {
  return Number(n).toLocaleString('en-US');
}

function kgToLb(kg) {
  return Math.round(kg * 2.205);
}

function cmToFeetInches(cm) {
  const totalInches = Math.round(cm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}′${inches}″`;
}

function calcBmi(kg, cm) {
  const m = cm / 100;
  return (kg / (m * m)).toFixed(1);
}

function bmiCategory(bmi) {
  const b = parseFloat(bmi);
  if (b < 18.5) return 'underweight';
  if (b < 25) return 'normal';
  if (b < 30) return 'overweight';
  return 'obese';
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function activityLabel(a) {
  // Handle numeric multiplier values (e.g. 1.375)
  const v = parseFloat(a);
  if (!isNaN(v)) {
    if (v <= 1.2) return 'Sedentary';
    if (v <= 1.375) return 'Lightly active';
    if (v <= 1.55) return 'Moderately active';
    if (v <= 1.725) return 'Very active';
    return 'Athlete';
  }
  // Handle string labels
  const map = {
    sedentary: 'Sedentary',
    light: 'Lightly active',
    moderate: 'Moderately active',
    active: 'Active',
    very: 'Very active',
  };
  return map[a] || a || 'Not specified';
}

function normalizeMedications(raw) {
  if (!raw || raw === 'None reported') return raw;
  // Normalize common misspellings first, then brand names
  // Order matters: fix typos before brand-name matching to avoid double-replacement
  let result = raw;
  // Step 1: Fix misspellings to correct brand names
  result = result.replace(/ozimpic/gi, 'Ozempic');
  // Step 2: Add generic names to brand names (only if generic not already present)
  const brandGenerics = [
    [/\bOzempic\b(?!\s*[\/(])/gi, 'Ozempic / semaglutide'],
    [/\bWegovy\b(?!\s*[\/(])/gi, 'Wegovy / semaglutide'],
    [/\bMounjaro\b(?!\s*[\/(])/gi, 'Mounjaro / tirzepatide'],
    [/\bZepbound\b(?!\s*[\/(])/gi, 'Zepbound / tirzepatide'],
    [/\bLipitor\b(?!\s*[\/(])/gi, 'Lipitor / atorvastatin'],
    [/\bSynthroid\b(?!\s*[\/(])/gi, 'Synthroid / levothyroxine'],
    [/\bJardiance\b(?!\s*[\/(])/gi, 'Jardiance / empagliflozin'],
    [/\bInvokana\b(?!\s*[\/(])/gi, 'Invokana / canagliflozin'],
    [/\bJanuvia\b(?!\s*[\/(])/gi, 'Januvia / sitagliptin'],
  ];
  // Step 3: Capitalize common generics
  const generics = [
    [/\bmetformin\b/gi, 'Metformin'],
    [/\blisinopril\b/gi, 'Lisinopril'],
    [/\blosartan\b/gi, 'Losartan'],
    [/\batorvastatin\b/gi, 'Atorvastatin'],
    [/\blevothyroxine\b/gi, 'Levothyroxine'],
    [/\bglipizide\b/gi, 'Glipizide'],
    [/\binsulin\b/gi, 'Insulin'],
    [/\bamlodipine\b/gi, 'Amlodipine'],
  ];
  for (const [p, r] of brandGenerics) result = result.replace(p, r);
  for (const [p, r] of generics) result = result.replace(p, r);
  return result;
}

// ---------------------------------------------------------------------------
// MEDICAL CONTAINMENT GATE
// ---------------------------------------------------------------------------
// The Starter Kit is a paid PDF emailed after a Stripe payment. It used to print
// sodium 3,000-5,000 mg/day, potassium ~3,500 mg/day, a potassium-chloride "lite
// salt" instruction and a supplement table to EVERY buyer, including one who had
// just told us they take lisinopril. The only gating was a text callout that sat
// UNDER the numbers and said to clear it with a physician.
//
// The rule this file now enforces is the one already established for the Carnivore
// Weekly report: SUPPRESS, DO NOT SUBSTITUTE. A reader who declares a medication or
// a cardiac / renal / blood-pressure condition gets NO quantitative electrolyte
// protocol at all. They are not given gentler numbers - picking a gentler number is
// the same clinical judgement in a quieter voice, and this software has never seen
// their labs, their kidney function or their prescriber.
//
// FAILS CLOSED ON PURPOSE
// -----------------------
// `meds` is a free-text box. Brand names, misspellings, "the little white one for my
// heart" - no keyword list survives contact with that. So the trigger is deliberately
// blunt: ANY declared medication, or ANY cardio/renal/BP condition, withholds the
// protocol. The term list below only sharpens WHAT the reader is told; it is never
// the thing that decides whether it is safe to print a number.
//
// It also fails closed on an UNRECOGNISED condition slug. The intake form lives in a
// different repository (ketodial/public/index.html, the ketodial.com Pages repo), so
// a new checkbox can ship to customers before this worker learns what it means. An
// unknown slug is treated as a declared condition we cannot interpret, and the
// protocol is withheld.
//
// And it fails closed on an UNREADABLE form. Until 2026-09-08 index.js stored the
// questionnaire in a Stripe metadata field as `JSON.stringify(formData).slice(0, 490)`
// and handleReport() did `safeParseJSON(...) || {}`. A customer who typed more than
// about eighty characters into the free-text "biggest challenge" box pushed the JSON
// past 490, the truncated string did not parse, and the WHOLE form - conditions,
// medications and all - silently became `{}`. Read literally that is a reader who
// declared nothing, which is how a CKD customer on four drugs would have been handed
// the full protocol through a fault that has nothing to do with their health.
//
// That store is gone: the authoritative questionnaire now lives in
// calculator_sessions_v2 and is loaded and validated by ketodial/worker/intake.js
// before any generator runs. `unreadableIntake` is KEPT anyway. It costs nothing, it
// is the last line if some future caller reaches a generator without going through
// intake.js, and a gate that has already been wrong once does not get to rely on the
// layer above it being right.
//
// ---------------------------------------------------------------------------
// PROTEIN, AND WHY THIS GATE GREW A SECOND SWITCH (2026-09-08)
// ---------------------------------------------------------------------------
// `renal` was computed here from the day this gate was written, returned in the
// context object, and read by nothing. Carnivore Weekly treats an undeclared protein
// target for a reader with kidney disease as a P0 and suppresses it. KetoDial
// computed the same flag and then printed the customer's protein target in the
// Doctor's Report and twice in the meal plan, on top of a seven-day plan that was
// byte-identical to the one a customer with healthy kidneys received.
//
// `restrictProteinTarget` closes that. It is the same rule, in the same words, as
// api/medical-context.js: how much protein is right in reduced kidney function
// depends on stage, on dialysis, on nutritional status and on a clinician's
// assessment, and none of that is in a questionnaire. So the report prints NO protein
// figure. It does not print a lower one. Choosing a lower one is the clinical
// judgement this software is not entitled to make.
//
// It is NOT a display rule. buildMealPlanDays() anchors on protein twice over -
// `minDensity = prot / cal` filters which meals are eligible, and
// `protScale = prot / baseP` scales every portion - so hiding the number while it
// still sizes the food would be the cosmetic safety CLAUDE.md names by that term.
// When this flag is set, the protein-anchored plan is not generated at all.

/** Answers that mean "nothing to declare". Anything else counts as a declaration. */
const KD_NONE_VALUES = new Set([
  '', '-', '--', 'n/a', 'na', 'no', 'none', 'none reported', 'nope', 'nil',
  'nothing', 'no meds', 'no medication', 'no medications', 'no meds.', 'none.',
]);

/** Condition slugs the intake form can send that are cardio / renal / BP. */
const KD_RESTRICTING_CONDITION_SLUGS = new Set(['bp', 'kidney', 'heart']);

/** Every condition slug this worker knows how to interpret. Anything else fails closed. */
const KD_KNOWN_CONDITION_SLUGS = new Set([
  't2d', 'pre', 'bp', 'chol', 'thy', 'pcos', 'liver', 'gerd', 'ibs', 'kidney', 'heart',
]);

// ---------------------------------------------------------------------------
// HOW A FREE-TEXT TERM IS ALLOWED TO MATCH
// ---------------------------------------------------------------------------
// Every term below used to be tested with `blob.includes(term)`. That is a
// character-sequence test, not a word test, and `adrenal` contains `renal`.
//
// A customer who answered NO to the kidney question, ticked no kidney condition,
// and typed "hydrocortisone for adrenal insufficiency" into the medications box
// was classified renal: protein target suppressed, meal plan and both bundles
// removed from sale, and a Doctor's Report that opened by telling their physician
// they had told us about kidney disease. Adrenal insufficiency is not a kidney
// condition, and "adrenal fatigue" is a phrase this audience writes constantly.
//
// The fix is a matching RULE PER TERM, not a blocklist of unlucky words. Adding
// `adrenal` to an exception list would leave `adrenaline`, `noradrenaline` and
// `adrenalectomy` broken, and the next such word after that.
//
//   'anywhere' — plain substring, as before. For sequences no ordinary English
//                word contains, and where a left boundary would LOSE a real
//                signal: 'dialysis' must still catch "hemodialysis", 'nephro'
//                must still catch "hydronephrosis".
//   'prefix'   — must start a word; may continue. "kidneys", "kidney disease".
//   'token'    — must be a whole word. Acronyms only. "CKD", "ckd 3" and
//                "CKD-4" match, because a digit or hyphen is not a letter.
//   'stem'     — 'prefix', minus the two prefixes that mean a different organ.
//                Only `renal` needs this; see below.
//
// WHY `renal` IS ITS OWN CASE. In medical English exactly two prefixes take
// `renal` away from the kidney and give it to the gland sitting on top of it:
// ad- (adrenal, adrenaline, adrenalectomy) and supra- (suprarenal). Every other
// prefix keeps the kidney meaning — prerenal, postrenal, intrarenal, extrarenal,
// perirenal, pararenal. So a plain word-start rule trades one error for another:
// it fixes "adrenal" and breaks "prerenal".
//
// Both halves are handled, and they need different mechanisms because English
// writes these two ways. Written closed up, the gland's prefixes are simply part
// of the word, so word-start settles it: "adrenal" is out, and the kidney
// compounds are added below as terms of their own. Written with a dash, word-
// start no longer separates them, so `renal` additionally refuses the two gland
// morphemes by name: "supra-renal" is out, while "pre-renal" and
// "chronic-renal-failure" are in.
//
// Naming ad- and supra- is naming the entire set of prefixes that change the
// organ, which is a fact about medical English rather than a list of unlucky
// words. Blocking the literal "adrenal" instead would have left "adrenaline",
// "noradrenaline" and "adrenalectomy" broken, and the next such word after that.
//
// SCOPE. Only the renal family is reclassified. No English word ends in
// "kidney" or contains "ckd"/"esrd"/"egfr", and the three 'anywhere' terms keep
// the exact rule they had, so `renal` is the only behaviour that moves. Every
// cardiac and blood-pressure term is left on 'anywhere', byte-for-byte as
// before. Narrowing "heart" so it stops matching "heartburn" is a real and
// separate question; it is not this one, and over-suppressing an electrolyte
// protocol is the safe direction anyway.
const KD_MATCH_ANYWHERE = 'anywhere';
const KD_MATCH_PREFIX = 'prefix';
const KD_MATCH_TOKEN = 'token';
const KD_MATCH_STEM = 'stem';

/**
 * Prefixes that leave `renal` meaning the kidney, written closed up. The dashed
 * spellings need no entry: "pre-renal" already reaches `renal` at a word start.
 */
const KD_RENAL_PREFIXES = ['pre', 'post', 'intra', 'extra', 'peri', 'para'];

/**
 * The prefixes that move `renal` to the adrenal gland, as they appear when a
 * writer dashes them. The closed-up spellings need no entry: "adrenal" and
 * "suprarenal" already fail the word-start rule.
 */
const KD_ADRENAL_PREFIXES = ['ad', 'supra'];

/**
 * The renal family, and how each member may match. This is the single source of
 * truth: it was written out twice inline before, once for `renal` and once for
 * `kidneyConditionDeclared`, which is two places for the same rule to rot.
 */
const KD_RENAL_TERMS = [
  ['kidney', KD_MATCH_PREFIX],
  ['renal', KD_MATCH_STEM],
  ...KD_RENAL_PREFIXES.map(p => [`${p}renal`, KD_MATCH_PREFIX]),
  ['ckd', KD_MATCH_TOKEN],
  ['esrd', KD_MATCH_TOKEN],
  ['nephro', KD_MATCH_ANYWHERE],
  ['dialysis', KD_MATCH_ANYWHERE],
  ['glomerul', KD_MATCH_ANYWHERE],
  ['egfr', KD_MATCH_TOKEN],
];

/**
 * Words that mean a cardiac, renal or blood-pressure problem, however the reader
 * happened to write it. Used ONLY to sharpen wording and to catch free text; the
 * safety decision above does not depend on this list matching anything.
 */
const KD_CARDIO_RENAL_TERMS = [
  ...KD_RENAL_TERMS,
  ['nephritis', KD_MATCH_ANYWHERE], ['nephropathy', KD_MATCH_ANYWHERE],
  ['creatinine', KD_MATCH_ANYWHERE],
  ['heart', KD_MATCH_ANYWHERE], ['cardiac', KD_MATCH_ANYWHERE],
  ['cardio', KD_MATCH_ANYWHERE], ['chf', KD_MATCH_ANYWHERE],
  ['congestive', KD_MATCH_ANYWHERE], ['heart failure', KD_MATCH_ANYWHERE],
  ['afib', KD_MATCH_ANYWHERE], ['a-fib', KD_MATCH_ANYWHERE],
  ['atrial fibrillation', KD_MATCH_ANYWHERE], ['arrhythmia', KD_MATCH_ANYWHERE],
  ['pacemaker', KD_MATCH_ANYWHERE], ['hypertension', KD_MATCH_ANYWHERE],
  ['blood pressure', KD_MATCH_ANYWHERE], ['stroke', KD_MATCH_ANYWHERE],
  ['transplant', KD_MATCH_ANYWHERE], ['edema', KD_MATCH_ANYWHERE],
  ['oedema', KD_MATCH_ANYWHERE],
];

/**
 * Regex-escape a literal term. The lists are ours, but a term may contain "-".
 *
 * "-" is deliberately NOT in this set. It carries no meaning outside a character
 * class, and under the `u` flag `\-` is not a permitted escape at all: including
 * it threw "Invalid regular expression: /(?<![\p{L}\p{Pd}])pre\-renal/u" at
 * module load, which would have taken every KetoDial report down with it.
 */
function kdEscapeTerm(t) {
  return String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Compile one term into a test against the normalized blob.
 *
 * A boundary here is "not a letter", deliberately, rather than \b. \b treats a
 * digit as a word character, so "ckd3" — which a real customer writes — would
 * fail a \b-anchored token match. \p{L} also means an accented spelling cannot
 * sneak past the left boundary.
 *
 * 'stem' adds one negative lookbehind per adrenal-gland prefix, which is what
 * separates "supra-renal" (the gland) from "pre-renal" and
 * "chronic-renal-failure" (the kidney). JavaScript allows a variable-length
 * lookbehind, so this can be stated directly instead of being approximated by
 * treating every dash as part of the word, which would have swallowed the
 * genuine hyphenated phrasings along with the two bad ones.
 *
 * `opts.notBefore` is the mirror image, a negative lookahead, and it exists for
 * one word: "insulin resistance" is a description of metabolism, not a
 * prescription. A reader who writes it is usually telling us why they are here,
 * and treating it as declared insulin would put a hypoglycaemia warning in front
 * of someone who takes nothing. Stems rather than whole words, so "resistant"
 * and "sensitivity" are covered, and a dash or space between is allowed because
 * "insulin-resistant" is how half of them write it.
 */
function kdCompileTerm([term, mode, opts]) {
  const notBefore = opts && opts.notBefore && opts.notBefore.length
    ? `(?![\\s\\p{Pd}]*(?:${opts.notBefore.map(kdEscapeTerm).join('|')}))`
    : '';
  if (mode === KD_MATCH_ANYWHERE && !notBefore) {
    return (blob) => blob.includes(term);
  }
  const notGland = mode === KD_MATCH_STEM
    ? KD_ADRENAL_PREFIXES.map(p => `(?<!${p}\\p{Pd})`).join('')
    : '';
  // 'anywhere' means anywhere even when it carries a lookahead, so it keeps no
  // left boundary. Silently promoting it to 'prefix' here would have changed
  // what the term matches as a side effect of adding an exclusion to it.
  const left = mode === KD_MATCH_ANYWHERE ? '' : '(?<!\\p{L})';
  const right = (mode === KD_MATCH_TOKEN ? '(?!\\p{L})' : '') + notBefore;
  const re = new RegExp(left + notGland + kdEscapeTerm(term) + right, 'u');
  return (blob) => re.test(blob);
}

/** Compiled once at module load, not per report. */
const KD_RENAL_MATCHERS = KD_RENAL_TERMS.map(kdCompileTerm);
const KD_CARDIO_RENAL_MATCHERS = KD_CARDIO_RENAL_TERMS.map(kdCompileTerm);

/**
 * Lowercase, and drop characters that are not there.
 *
 * Unicode format characters (\p{Cf}: soft hyphen, zero-width space, zero-width
 * joiner) are invisible, and a customer pasting from a Word document or a PDF
 * brings them along without knowing. A soft hyphen sitting inside "ad<shy>renal"
 * is not a word boundary to any reader, and it must not be one here either:
 * left in, it splits the word and hands the fragment "renal" to the gate, which
 * is the whole defect wearing a different hat. Stripping them first means the
 * text is judged as it is read.
 */
function kdNormalizeBlob(blob) {
  return String(blob == null ? '' : blob).toLowerCase().replace(/\p{Cf}/gu, '');
}

/**
 * Does this free text declare reduced kidney function?
 *
 * Exported so a regression test can drive the rule directly instead of only
 * observing it through a whole generated report.
 *
 * @param {string} blob condition slugs, condition labels and the medications
 *                      free text, joined
 */
export function kdTextDeclaresRenal(blob) {
  const s = kdNormalizeBlob(blob);
  return KD_RENAL_MATCHERS.some(m => m(s));
}

/** The same question for the wider cardiac / renal / blood-pressure family. */
function kdTextDeclaresCardioRenal(blob) {
  const s = kdNormalizeBlob(blob);
  return KD_CARDIO_RENAL_MATCHERS.some(m => m(s));
}

// ---------------------------------------------------------------------------
// DIABETES MEDICATION CLASSES
// ---------------------------------------------------------------------------
// The Doctor's Report keyed its glycemic caution and its whole medication
// considerations table off the condition CHIPS the customer ticked. The
// medications box was stored, printed back verbatim, and never read.
//
// So a customer who ticked nothing and typed "Lantus insulin 24 units at night,
// glipizide 5mg" received a personalized 18 g net carb target, a conditions
// table reading "None reported, standard monitoring recommended", no mention of
// hypoglycemia anywhere in the document, and a seven day meal plan built at that
// carb level. The report already CONTAINED the right sentence about insulin and
// sulfonylureas, sitting inside the Type 2 diabetes metadata where free text
// could not reach it.
//
// The intake form has chips for t2d, pre, pcos, bp, heart, kidney, chol, thy and
// liver. There is no Type 1 option, so a Type 1 diabetic can ONLY tell us about
// their insulin in the free-text box.
//
// THREE CLASSES, BECAUSE THEY NEED DIFFERENT THINGS. This is deliberately not
// "any declared medication suppresses the carb target": most medications have no
// interaction with carbohydrate restriction, and blanketing them would be a
// different product decision that nobody made. See the policy note above
// kdDeriveMedicationRisk.
//
// Names are the common ones a customer actually writes. This is not a formulary,
// and it does not try to be. `gliflozin` earns its place because it is the class
// stem every SGLT2 generic ends in, so it catches the ones not listed by name.
const KD_DIABETES_MED_TERMS = {
  insulin: [
    // "insulin resistance" is a metabolic description, not a prescription.
    ['insulin', KD_MATCH_PREFIX, { notBefore: ['resistan', 'sensitiv'] }],
    ['lantus', KD_MATCH_PREFIX], ['glargine', KD_MATCH_PREFIX],
    ['basaglar', KD_MATCH_PREFIX], ['toujeo', KD_MATCH_PREFIX],
    ['semglee', KD_MATCH_PREFIX], ['humalog', KD_MATCH_PREFIX],
    ['lispro', KD_MATCH_PREFIX], ['admelog', KD_MATCH_PREFIX],
    ['lyumjev', KD_MATCH_PREFIX], ['novolog', KD_MATCH_PREFIX],
    ['novorapid', KD_MATCH_PREFIX], ['fiasp', KD_MATCH_PREFIX],
    // TOKEN, not PREFIX: "aspartame" and "aspartate" are not insulin.
    ['aspart', KD_MATCH_TOKEN],
    ['tresiba', KD_MATCH_PREFIX], ['degludec', KD_MATCH_PREFIX],
    ['levemir', KD_MATCH_PREFIX], ['detemir', KD_MATCH_PREFIX],
    ['humulin', KD_MATCH_PREFIX], ['novolin', KD_MATCH_PREFIX],
    ['apidra', KD_MATCH_PREFIX], ['glulisine', KD_MATCH_PREFIX],
  ],
  sulfonylurea: [
    ['sulfonylurea', KD_MATCH_PREFIX], ['sulphonylurea', KD_MATCH_PREFIX],
    ['glipizide', KD_MATCH_PREFIX], ['gliclazide', KD_MATCH_PREFIX],
    ['glimepiride', KD_MATCH_PREFIX], ['glyburide', KD_MATCH_PREFIX],
    ['glibenclamide', KD_MATCH_PREFIX],
    ['amaryl', KD_MATCH_PREFIX], ['diamicron', KD_MATCH_PREFIX],
    ['glucotrol', KD_MATCH_PREFIX], ['diabeta', KD_MATCH_PREFIX],
    ['glynase', KD_MATCH_PREFIX], ['micronase', KD_MATCH_PREFIX],
  ],
  sglt2: [
    // The class stem. Every generic in it ends this way, listed or not.
    ['gliflozin', KD_MATCH_ANYWHERE],
    ['sglt2', KD_MATCH_PREFIX], ['sglt-2', KD_MATCH_PREFIX],
    ['jardiance', KD_MATCH_PREFIX], ['farxiga', KD_MATCH_PREFIX],
    ['forxiga', KD_MATCH_PREFIX], ['invokana', KD_MATCH_PREFIX],
    ['steglatro', KD_MATCH_PREFIX],
    // Combination products. The generic name inside them is usually written too,
    // but not always, and the brand is what is on the box.
    ['synjardy', KD_MATCH_PREFIX], ['xigduo', KD_MATCH_PREFIX],
    ['invokamet', KD_MATCH_PREFIX], ['glyxambi', KD_MATCH_PREFIX],
    ['trijardy', KD_MATCH_PREFIX], ['qtern', KD_MATCH_PREFIX],
    // Ertugliflozin and sotagliflozin combinations, whose brand names do not
    // contain the class stem. Added after review found they failed open.
    ['steglujan', KD_MATCH_PREFIX], ['segluromet', KD_MATCH_PREFIX],
    ['inpefa', KD_MATCH_PREFIX], ['brenzavvy', KD_MATCH_PREFIX],
  ],
};

const KD_DIABETES_MED_MATCHERS = Object.entries(KD_DIABETES_MED_TERMS)
  .map(([cls, terms]) => [cls, terms.map(kdCompileTerm)]);

/**
 * THE CANONICAL MEDICATION-RISK SIGNAL.
 *
 * One derivation, read by every customer-facing decision that depends on it.
 * Three regexes at three output sites is how the condition chips and the
 * medications box drifted apart in the first place.
 *
 * THE POLICY THESE BOOLEANS CARRY, and why the two are not the same:
 *
 *   Insulin and sulfonylureas — the carb target STANDS. Cutting carbohydrate on
 *   these drugs risks hypoglycemia, and the thing that needs a clinician's
 *   judgement is the DOSE, which this software never touches and must not.
 *   Low-carbohydrate eating is an accepted option in type 2 diabetes provided
 *   medication is adjusted proactively, so withholding the number would not
 *   remove the risk; it would only remove the document whose entire purpose is
 *   to start that conversation with the prescriber. So: keep the number, state
 *   the risk plainly, and route the dose decision where it belongs.
 *
 *   SGLT2 inhibitors — the targets are WITHHELD. Here the ketogenic pattern
 *   itself is the hazard, not the dose. Carbohydrate restriction is a recognised
 *   trigger for euglycemic diabetic ketoacidosis on these drugs, and the reason
 *   monitoring copy is not an adequate answer is in the name: blood glucose can
 *   read normal throughout, so the reader cannot watch for it. When the
 *   recommendation is the thing that is unsafe, the recommendation stops. That
 *   is the same rule the renal gate follows, and for the same reason.
 *
 * NEITHER IS A DIAGNOSIS. A medication is not a condition. Nothing here writes a
 * condition slug, and the copy downstream says "you told us you take", never
 * "your diabetes".
 *
 * @param {string} medsText the customer's medications free text
 * @returns {{diabetesMedClasses: string[], highHypoglycemiaMedication: boolean,
 *            sglt2Medication: boolean}}
 */
export function kdDeriveMedicationRisk(medsText) {
  const blob = kdNormalizeBlob(medsText);
  const diabetesMedClasses = kdIsNothing(blob)
    ? []
    : KD_DIABETES_MED_MATCHERS.filter(([, ms]) => ms.some(m => m(blob))).map(([cls]) => cls);
  return {
    diabetesMedClasses,
    highHypoglycemiaMedication:
      diabetesMedClasses.includes('insulin') || diabetesMedClasses.includes('sulfonylurea'),
    sglt2Medication: diabetesMedClasses.includes('sglt2'),
  };
}

function kdToList(value) {
  if (Array.isArray(value)) return value.filter(v => typeof v === 'string' && v.trim());
  if (typeof value === 'string' && value.trim()) {
    return value.split(/[,;\n]/).map(v => v.trim()).filter(Boolean);
  }
  return [];
}

function kdIsNothing(value) {
  return KD_NONE_VALUES.has(String(value == null ? '' : value).trim().toLowerCase());
}

/**
 * Decide what this reader's Starter Kit is allowed to say.
 *
 * @param {object} d - the form_data object collected by ketodial.js/collectFormData()
 * @returns {{
 *   declaredConditionSlugs: string[],
 *   declaredConditionLabels: string[],
 *   medsText: string,
 *   hasDeclaredMedication: boolean,
 *   cardioRenal: boolean,
 *   renal: boolean,
 *   unknownConditionSlug: boolean,
 *   restrictElectrolyteProtocol: boolean,
 *   restrictionReason: string
 * }}
 */
export function deriveKdMedicalContext(d) {
  const data = d || {};

  const declaredConditionSlugs = kdToList(data.conditions)
    .map(c => c.trim().toLowerCase())
    .filter(c => c && c !== 'none');

  const medsRaw = typeof data.meds === 'string' ? data.meds : '';
  const medsText = normalizeMedications(medsRaw.trim());
  const hasDeclaredMedication = !kdIsNothing(medsText);

  const declaredConditionLabels = declaredConditionSlugs.map(
    c => (CONDITION_INFO[c] && CONDITION_INFO[c].label) || c
  );

  const unknownConditionSlug = declaredConditionSlugs.some(c => !KD_KNOWN_CONDITION_SLUGS.has(c));

  // collectFormData() in ketodial.js always emits `conditions` and `meds`. If neither
  // survived, we are not looking at a reader who declared nothing - we are looking at
  // a form we lost. See the note at the top of this block.
  const unreadableIntake = !('conditions' in data) && !('meds' in data);

  const blob = [...declaredConditionSlugs, ...declaredConditionLabels, medsText]
    .join(' | ').toLowerCase();
  const cardioRenalSlug = declaredConditionSlugs.some(c => KD_RESTRICTING_CONDITION_SLUGS.has(c));
  const cardioRenalText = kdTextDeclaresCardioRenal(blob);
  // THE EARLY GATE (2026-09-08, Audit 2B). One question, asked once, BEFORE the free
  // protein result: "Have you been diagnosed with kidney disease, told that your
  // kidney function is reduced, or are you on dialysis?" -> no | yes | unsure.
  //
  // "I'm not sure" is treated exactly as "yes". That is not caution for its own sake:
  // the alternative is asking a customer to rule out their own renal function, which
  // is the clinical judgement this software is least entitled to ask for. Over-
  // suppression costs one line of a report; under-suppression prints a protein
  // prescription for someone with reduced kidney function.
  //
  // FAIL CLOSED ON AN UNRECORDED ANSWER. Anything that is not an explicit 'no'
  // restricts, and that includes the field being absent entirely. An unanswered
  // safety question is not a negative answer.
  //
  // Two layers stop that from turning into over-suppression for real customers:
  // validateIntake() makes kidneyStatus a required fact, so a session that never
  // recorded it is refused at the request boundary rather than quietly downgraded to
  // a restricted report; and requireFacts() repeats the demand inside each generator
  // for any caller that arrives by some other route. What is left here is the last
  // line, and the last line does not get to assume the best case.
  const kidneyAnswer = typeof data.kidneyStatus === 'string'
    ? data.kidneyStatus.trim().toLowerCase() : '';
  const kidneyAnswered = kidneyAnswer === 'no' || kidneyAnswer === 'yes' || kidneyAnswer === 'unsure';
  const kidneyDeclared = kidneyAnswer !== 'no';

  // The free-text and slug detection stays. The early question is the gate a real
  // customer actually passes through; these catch the reader who answered 'no' to a
  // formal diagnosis and then typed "my nephrologist" into the medications box.
  const renal = kidneyDeclared ||
    declaredConditionSlugs.includes('kidney') ||
    kdTextDeclaresRenal(blob);

  // RENAL IS CARDIO-RENAL. Declared reduced kidney function restricts the electrolyte
  // protocol as well as the protein target — sodium, potassium and fluid are the
  // canonical renal decisions, and they are not the software's to make either.
  //
  // This line is here because the suite caught its absence. When the early kidney
  // question was first wired it fed `restrictProteinTarget` only, so a customer who
  // answered "yes" WITHOUT also ticking the `kidney` condition chip on the later
  // screen had their protein target withheld and was then handed the full sodium and
  // potassium protocol on the next page. A new signal has to reach every gate it is
  // relevant to, not just the one it was added for.
  const cardioRenal = cardioRenalSlug || cardioRenalText || renal;

  // THE GATE. Blunt on purpose. Over-suppression is the acceptable failure here;
  // printing a potassium target for someone on an ACE inhibitor is not.
  const restrictElectrolyteProtocol =
    hasDeclaredMedication || cardioRenal || unknownConditionSlug || unreadableIntake;

  // SUPPRESS, DO NOT SUBSTITUTE. Declared kidney disease means this product states no
  // protein target at all — not in grams, not per kilogram, not as a range, not as a
  // per-meal amount — and generates no plan whose portions were sized from one.
  // See the block at the top of this section. Mirrors api/medical-context.js
  // `restrictProteinTarget` so the two products cannot drift apart again.
  const restrictProteinTarget = renal;

  // SUPPRESSION IS NOT DIAGNOSIS.
  // "Yes" and "I'm not sure" get IDENTICAL safety behaviour — both suppress — but
  // they are not the same statement about the reader, and the prose must not treat
  // them as one. Telling a customer who answered "I'm not sure" that they "told us
  // about kidney disease" puts a diagnosis in their mouth, on a document they may
  // hand to a clinician. That is the exact failure the dedicated kidney_status
  // column was created to avoid, and it survived in the copy until 2026-09-08.
  const kidneyConditionDeclared =
    kidneyAnswer === 'yes' ||
    declaredConditionSlugs.includes('kidney') ||
    kdTextDeclaresRenal(blob);
  const kidneyUnsureOnly = renal && !kidneyConditionDeclared;

  // THE MEDICATION SIGNAL, derived once and read by every gate below. Only the
  // medications box feeds it: a condition chip is a condition, and inferring a
  // prescription from one would be the mirror image of the diagnosis error.
  const medRisk = kdDeriveMedicationRisk(hasDeclaredMedication ? medsText : '');

  // The ketogenic targets themselves are withheld for a declared SGLT2 inhibitor.
  // Same shape as restrictProteinTarget, same reason: the recommendation is what
  // is unsafe, so the recommendation stops rather than shrinking. See the policy
  // note on kdDeriveMedicationRisk.
  const restrictKetogenicProtocol = medRisk.sglt2Medication;

  let restrictionReason = '';
  if (restrictElectrolyteProtocol) {
    const parts = [];
    if (declaredConditionLabels.length) parts.push(declaredConditionLabels.join(', '));
    if (hasDeclaredMedication) parts.push(medsText);
    restrictionReason = parts.join(' - ') ||
      (unreadableIntake
        ? 'your questionnaire, which did not reach us in full'
        : 'what you told us on the questionnaire');
  }

  return {
    declaredConditionSlugs,
    declaredConditionLabels,
    medsText: hasDeclaredMedication ? medsText : 'None reported',
    hasDeclaredMedication,
    cardioRenal,
    renal,
    unknownConditionSlug,
    unreadableIntake,
    kidneyAnswer: kidneyAnswered ? kidneyAnswer : undefined,
    kidneyAnswered,
    kidneyConditionDeclared,
    kidneyUnsureOnly,
    ...medRisk,
    restrictElectrolyteProtocol,
    restrictProteinTarget,
    restrictKetogenicProtocol,
    restrictionReason,
  };
}

// ---------------------------------------------------------------------------
// WHAT WE ARE ALLOWED TO SELL
// ---------------------------------------------------------------------------

/**
 * Products whose value IS an individualised protein target. There is no version of
 * these that is not a protein prescription, so when protein is suppressed they are
 * not deliverable and must not be sold.
 *
 * Only the 7-Day Meal Plan qualifies. buildMealPlanDays() anchors on protein twice
 * over: `minDensity = prot / cal` decides which meals are eligible and
 * `protScale = prot / baseP` scales every portion.
 *
 * The Doctor's Report and the Starter Kit are NOT on this list, and that is the
 * point of having a list at all. The Doctor's Report withholds the macro panel for a
 * renal reader and is otherwise exactly the document such a reader most benefits from
 * taking to their clinician. The Starter Kit's quantities are already gated by
 * restrictElectrolyteProtocol. Both remain fully deliverable and fully purchasable.
 */
const PROTEIN_ANCHORED_PRODUCTS = new Set(['meal']);

/** items -> the individual reports they contain. Mirrors BUNDLE_EXPAND in index.js. */
const KD_BUNDLE_CONTENTS = {
  essentials: ['meal', 'starter'],
  protocol: ['doctor', 'meal', 'starter'],
};

/**
 * Decide which catalogue items this customer may buy, given their medical context.
 *
 * SAFETY CHANGES THE OFFER, NOT THE ABILITY TO PURCHASE. The customer is never shown
 * a disabled button, never asked to complete a second health intake to buy, and never
 * charged for something that will later be refused. The catalogue simply contains
 * what we can actually deliver to them.
 *
 * A bundle is unavailable when any component is, because we have no Stripe price for
 * a partial bundle. That is not a worse deal: for a renal customer the Doctor's
 * Report ($5.99) plus the Starter Kit ($3.99) is $9.98, against $10.99 for the Full
 * Protocol they can no longer receive in full. Nobody pays more for less.
 *
 * @param {object} ctx from deriveKdMedicalContext()
 * @returns {{allowed: string[], blocked: string[], reason: string}}
 */
export function allowedProducts(ctx) {
  const ALL = ['doctor', 'meal', 'starter', 'essentials', 'protocol'];
  // TWO REASONS, ONE CONSEQUENCE. A withheld protein target and a withheld
  // ketogenic target both make the 7-Day Meal Plan undeliverable, because it is
  // portioned to whichever number is missing. The reason is reported separately
  // so the checkout message can say the true one.
  const reason = ctx && ctx.restrictProteinTarget
    ? 'personalized_protein_target_unavailable'
    : (ctx && ctx.restrictKetogenicProtocol ? 'ketogenic_target_unavailable' : '');
  if (!reason) {
    return { allowed: ALL, blocked: [], reason: '' };
  }
  const blocked = ALL.filter(item => {
    const parts = KD_BUNDLE_CONTENTS[item] || [item];
    return parts.some(part => PROTEIN_ANCHORED_PRODUCTS.has(part));
  });
  return {
    allowed: ALL.filter(i => !blocked.includes(i)),
    blocked,
    reason,
  };
}

/**
 * What a reader who declared kidney disease is told where a protein target would
 * otherwise have been. It is a referral, not a smaller number, and it deliberately
 * does not imply a figure is waiting elsewhere in the document.
 */
export function kdProteinSuppressionNote(ctx) {
  if (!ctx || !ctx.restrictProteinTarget) return '';
  // Same suppression, different sentence. See kidneyUnsureOnly above.
  const opening = ctx.kidneyUnsureOnly
    ? 'You told us you were not sure whether your kidney function is reduced, and we cannot ' +
      'settle that from a questionnaire.'
    : 'You told us about kidney disease.';
  return `<div class="callout warn" style="margin-top:16px">
        <span class="ct">Your protein target is not in this report</span>
        ${opening} How much protein is right for you can depend on your
        kidney function, on whether you are being treated and how, on your nutritional status,
        and on your clinician's assessment of all three. None of that is in a questionnaire, so
        this report does not set a protein target for you — and it deliberately does not give
        you a lower or more cautious one either, because choosing that number is the same
        clinical decision in a quieter voice.
        <b>Ask your doctor or a renal dietitian what your protein intake should be</b>, and take
        this report with you when you do.
      </div>`;
}

/** The phrase that replaces a protein figure wherever one would have been printed. */
export const KD_PROTEIN_WITHHELD = 'Not set by this report — ask your doctor or renal dietitian';

/**
 * What replaces the macronutrient panel for a reader who declared an SGLT2
 * inhibitor. Same shape and same rule as kdProteinSuppressionNote: it is a
 * referral, not a smaller number, and it does not imply a figure is waiting
 * elsewhere in the document.
 *
 * Copy by Sarah. Note what it does NOT say: it never calls the reader diabetic.
 * The medication is the fact we were given; the diagnosis is not.
 */
export function kdKetogenicSuppressionNote(ctx) {
  if (!ctx || !ctx.restrictKetogenicProtocol) return '';
  return `<div class="callout warn" style="margin-top:16px">
        <span class="ct">Your macronutrient targets are not in this report</span>
        You told us you take an SGLT2 inhibitor. Ketogenic eating on this class of medication is a
        recognized trigger for euglycemic diabetic ketoacidosis, and the part that matters most here
        is that blood glucose can read normal while it happens, so it is not something you can watch
        for yourself with a home glucose meter. Whether ketogenic targets are appropriate for you at
        all, and what monitoring would need to be in place first, is a clinical judgment, and none of
        what it rests on is in a questionnaire. So this report does not set your calories, fat,
        protein or carbohydrate, and it deliberately does not give you a gentler, higher-carb version
        instead, because choosing that number is the same clinical decision in a quieter voice.
        <b>Take this report to the clinician who prescribes that medication and ask what is right for
        you.</b>
      </div>`;
}

/** The phrase that replaces a ketogenic figure wherever one would have been printed. */
export const KD_KETOGENIC_WITHHELD =
  'Not set by this report — ask the clinician who prescribes your SGLT2 inhibitor';

/**
 * What a reader who declared insulin or a sulfonylurea is told, alongside targets
 * we have deliberately NOT withheld.
 *
 * The dose is the clinical decision here, not the carbohydrate figure, and the
 * dose belongs to their prescriber. So the number stays and this says why that
 * conversation has to happen first. It must read correctly whether or not they
 * ticked a diabetes chip, because the whole defect was that a chip was required.
 *
 * Copy by Sarah.
 */
export function kdHypoglycemiaCallout(ctx) {
  if (!ctx || !ctx.highHypoglycemiaMedication) return '';
  return `<div class="callout warn" style="margin-top:16px">
        <span class="ct">Talk to your prescriber before you start</span>
        You told us you take insulin or a sulfonylurea. Cutting carbohydrate lowers blood glucose on
        its own, and a dose that suited your usual way of eating can then take you lower than
        intended, which is a real risk of hypoglycemia. Your targets and your meal plan are unchanged
        and we have not withheld them. <b>Take your reports to the clinician who prescribes that
        medication before you start</b>, and ask what glucose monitoring you should be doing and
        whether your dose needs to be adjusted for the change in how you eat.
      </div>`;
}

/**
 * Medication considerations for the physician, keyed on what the customer
 * actually declared rather than on a condition chip they may not have ticked.
 *
 * The names deliberately match the rows already sitting inside
 * CONDITION_INFO.t2d.meds. Those rows are hedged with "if applicable", which is
 * the right register when a condition implies a medication might exist. When the
 * medication itself was declared, hedging is wrong, so these are seeded into the
 * table first and the existing de-duplication keeps them.
 */
const KD_MED_CLASS_CONSIDERATIONS = {
  highHypoglycemiaMedication: {
    name: 'Insulin / sulfonylureas',
    sub: 'reported by patient',
    note: 'Patient reports currently taking this class. Carbohydrate restriction lowers blood ' +
      'glucose from the first day of the change, so hypoglycemia risk is highest in this group ' +
      'and a pre-emptive dose review plus an agreed glucose monitoring plan are advised before ' +
      'starting.',
    risk: 'hi',
  },
  sglt2Medication: {
    name: 'SGLT2 inhibitors',
    sub: 'reported by patient',
    note: "Patient reports currently taking this class, so this report's quantitative ketogenic " +
      'targets have been withheld pending your review. Ketogenic eating with an SGLT2 inhibitor ' +
      'is a recognized trigger for euglycemic diabetic ketoacidosis, which can occur with normal ' +
      'blood glucose readings and so is not detectable by home glucose monitoring.',
    risk: 'hi',
  },
};

/** The declared-medication rows this reader's Doctor's Report must carry. */
function kdMedicationConsiderations(ctx) {
  return Object.entries(KD_MED_CLASS_CONSIDERATIONS)
    .filter(([flag]) => ctx && ctx[flag])
    .map(([, row]) => row);
}

function goalLabel(g) {
  const map = {
    lose: 'Fat loss',
    maintain: 'Maintenance',
    gain: 'Lean mass gain',
  };
  return map[g] || g || 'Not specified';
}

function macroPercents(cal, fatG, proteinG, carbG) {
  const fatCal = fatG * 9;
  const protCal = proteinG * 4;
  const carbCal = carbG * 4;
  const total = fatCal + protCal + carbCal || 1;
  return {
    fat: Math.round((fatCal / total) * 100),
    protein: Math.round((protCal / total) * 100),
    carb: Math.round((carbCal / total) * 100),
  };
}

// ─────────────────────────────────────────────────
// SHARED CSS (inlined from report.css)
// ─────────────────────────────────────────────────

const SHARED_CSS = `
:root{
  --bg:#e7edf3;
  --surface:#ffffff;
  --ink:#0f172a;
  --ink-soft:#475569;
  --ink-faint:#94a3b8;
  --line:#e2e8f0;
  --line-soft:#eef2f6;
  --panel:#0b1620;
  --panel-2:#0f2236;
  --panel-line:#1e3a52;
  --accent:#38bdf8;
  --accent-deep:#0ea5e9;
  --fat:#38bdf8;
  --protein:#2dd4bf;
  --carbs:#818cf8;
  --green:#16a34a;
  --amber:#d97706;
  --red:#dc2626;
  --sans:"Hanken Grotesk",system-ui,sans-serif;
  --mono:"JetBrains Mono",ui-monospace,monospace;
  --serif:"Newsreader",Georgia,serif;
}

*{box-sizing:border-box;margin:0;padding:0}
html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{
  font-family:var(--sans);
  background:var(--bg);
  color:var(--ink);
  -webkit-font-smoothing:antialiased;
  line-height:1.5;
  padding:34px 0 60px;
}
.mono{font-family:var(--mono)}

.page{
  position:relative;
  width:8.5in;
  min-height:11in;
  background:var(--surface);
  margin:0 auto 26px;
  box-shadow:0 14px 40px -10px rgba(15,23,42,.22);
  overflow:hidden;
  display:flex;
  flex-direction:column;
}

.rep-head{
  background:radial-gradient(120% 130% at 18% -30%,#15324c 0%,var(--panel) 62%);
  color:#e2eef7;
  padding:0.5in 0.6in 0.46in;
  position:relative;
  overflow:hidden;
}
.rep-head::before{
  content:"";position:absolute;inset:0;opacity:.5;pointer-events:none;
  background-image:linear-gradient(rgba(56,189,248,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(56,189,248,.06) 1px,transparent 1px);
  background-size:24px 24px;
  -webkit-mask-image:radial-gradient(90% 90% at 30% 10%,#000,transparent);
          mask-image:radial-gradient(90% 90% at 30% 10%,#000,transparent);
}
.rep-head>*{position:relative}
.rh-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}
.rh-brand{display:flex;align-items:center;gap:10px}
.rh-brand .mark{width:30px;height:30px;flex:none}
.rh-brand .word{font-weight:800;font-size:18px;letter-spacing:-.02em;color:#fff}
.rh-brand .word b{color:var(--accent)}
.rh-tag{font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#6da6c9}
.rh-title-row{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
.rh-eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);font-weight:500;margin-bottom:10px}
.rep-head h1{font-size:33px;font-weight:800;letter-spacing:-.03em;line-height:1.02;color:#fff}
.rep-head h1 .lt{color:#9fc0d6;font-weight:500}
.rh-meta{text-align:right;flex:none}
.rh-meta .row{font-family:var(--mono);font-size:11px;color:#9fc0d6;margin-bottom:5px;letter-spacing:.02em}
.rh-meta .row b{color:#fff;font-weight:500}
.rh-prepared{margin-top:14px;font-size:13.5px;color:#bcd4e3}
.rh-prepared b{color:#fff;font-weight:600}

.rep-body{padding:0.46in 0.6in 0.3in;flex:1}
.rep-body.tight{padding-top:0.34in}

.rep-foot{
  margin-top:auto;
  padding:0.26in 0.6in;
  border-top:1px solid var(--line);
  display:flex;justify-content:space-between;align-items:center;
  font-family:var(--mono);font-size:9.5px;letter-spacing:.04em;color:var(--ink-faint);
}
.rep-foot .dot{color:var(--accent-deep)}
.rep-foot a{color:var(--ink-faint);text-decoration:none}

.sec{margin-bottom:24px}
.sec-eyebrow{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--accent-deep);font-weight:500;margin-bottom:7px}
.sec-title{font-size:18px;font-weight:800;letter-spacing:-.02em;margin-bottom:14px;display:flex;align-items:center;gap:10px}
.sec-title .num{font-family:var(--mono);font-size:12px;color:var(--ink-faint);font-weight:500}
.sec-sub{font-size:13.5px;color:var(--ink-soft);margin:-8px 0 14px;line-height:1.5}

.stat-grid{display:grid;gap:1px;background:var(--line);border:1px solid var(--line);border-radius:12px;overflow:hidden}
.stat-grid.c4{grid-template-columns:repeat(4,1fr)}
.stat-grid.c3{grid-template-columns:repeat(3,1fr)}
.stat-grid.c2{grid-template-columns:repeat(2,1fr)}
.stat{background:var(--surface);padding:13px 15px}
.stat .k{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint);margin-bottom:6px}
.stat .v{font-family:var(--mono);font-size:18px;font-weight:700;color:var(--ink);letter-spacing:-.01em}
.stat .v small{font-size:11px;color:var(--ink-soft);font-weight:400}

.dtable{width:100%;border-collapse:collapse;font-size:12.5px}
.dtable th{
  text-align:left;font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;
  color:var(--ink-faint);font-weight:500;padding:9px 12px;border-bottom:1.5px solid var(--line);
}
.dtable td{padding:11px 12px;border-bottom:1px solid var(--line-soft);color:var(--ink-soft);vertical-align:top;line-height:1.45}
.dtable td b,.dtable td strong{color:var(--ink);font-weight:600}
.dtable tr:last-child td{border-bottom:none}
.dtable .mono{color:var(--ink);font-weight:500}
.dtable.zebra tr:nth-child(even) td{background:#fafcfe}

.mpills{display:flex;gap:7px;flex-wrap:wrap}
.mpill{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:11px;font-weight:500;padding:4px 9px;border-radius:7px;border:1px solid var(--line);color:var(--ink)}
.mpill .d{width:8px;height:8px;border-radius:2px}
.mpill.kcal{background:var(--ink);color:#fff;border-color:var(--ink)}

.callout{border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:10px;padding:14px 16px;background:#f7fbfe;font-size:13px;color:var(--ink-soft);line-height:1.55}
.callout.warn{border-left-color:var(--amber);background:#fffaf2}
.callout b{color:var(--ink)}
.callout .ct{font-weight:700;color:var(--ink);font-size:13px;margin-bottom:4px;display:block}

.tag{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;padding:4px 9px;border-radius:6px;font-weight:600}
.tag.green{background:rgba(22,163,74,.1);color:var(--green)}
.tag.amber{background:rgba(217,119,6,.12);color:var(--amber)}
.tag.red{background:rgba(220,38,38,.1);color:var(--red)}
.tag.sky{background:rgba(56,189,248,.14);color:var(--accent-deep)}

.minigauge{width:150px;flex:none;position:relative}
.minigauge .num{position:absolute;left:0;right:0;top:54%;text-align:center;font-family:var(--mono);font-weight:700;font-size:22px;color:#fff;line-height:1}
.minigauge .lab{position:absolute;left:0;right:0;top:54%;margin-top:22px;text-align:center;font-family:var(--mono);font-size:8px;letter-spacing:.16em;color:#6da6c9;text-transform:uppercase}

ul.checks{list-style:none;display:flex;flex-direction:column;gap:9px}
ul.checks li{display:flex;gap:11px;font-size:13px;color:var(--ink-soft);line-height:1.45}
ul.checks li::before{content:"";width:16px;height:16px;border:1.5px solid var(--accent-deep);border-radius:5px;flex:none;margin-top:1px}
ul.qs{list-style:none;display:flex;flex-direction:column;gap:11px;counter-reset:q}
ul.qs li{display:flex;gap:12px;font-size:13.5px;color:var(--ink);line-height:1.5;align-items:flex-start}
ul.qs li::before{counter-increment:q;content:"Q"counter(q);font-family:var(--mono);font-size:10px;font-weight:700;color:var(--accent-deep);background:rgba(56,189,248,.12);padding:3px 7px;border-radius:6px;flex:none;margin-top:1px}

.printbar{position:fixed;top:18px;right:18px;z-index:100;display:flex;gap:10px}
.printbar a,.printbar button{
  display:inline-flex;align-items:center;gap:8px;font-family:var(--sans);font-size:13px;font-weight:600;
  background:var(--ink);color:#fff;border:none;border-radius:10px;padding:10px 16px;cursor:pointer;
  box-shadow:0 8px 20px -6px rgba(15,23,42,.4);text-decoration:none;transition:background .15s;
}
.printbar a{background:var(--surface);color:var(--ink);border:1px solid var(--line)}
.printbar button:hover{background:#15273f}
.printbar svg{width:15px;height:15px}

@media print{
  body{background:#fff;padding:0}
  .page{box-shadow:none;margin:0;width:auto;min-height:auto;page-break-after:always}
  .page:last-child{page-break-after:auto}
  .no-print{display:none!important}
  .avoid-break{break-inside:avoid;page-break-inside:avoid}
}
.avoid-break{break-inside:avoid}
`;

// ─────────────────────────────────────────────────
// SHARED SVG LOGO
// ─────────────────────────────────────────────────

const BRAND_SVG = `<svg class="mark" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="20" cy="20" r="19" fill="#0b1620"/>
  <path d="M9 25 A 12 12 0 1 1 31 25" stroke="#1e3a52" stroke-width="3" stroke-linecap="round"/>
  <path d="M9 25 A 12 12 0 0 1 18.5 8.4" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
  <line x1="20" y1="20" x2="26.5" y2="13.5" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
  <circle cx="20" cy="20" r="3" fill="#e2eef7"/>
</svg>`;

const PRINT_BUTTON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z"/></svg>`;

// ─────────────────────────────────────────────────
// HTML SHELL
// ─────────────────────────────────────────────────

/**
 * SCREEN LAYOUT FOR PHONES.
 *
 * The reports were built as documents: `.page` is 8.5in wide, the gutters are in
 * inches, and the only media query in the file was `@media print`. On a 390px
 * phone every paid report rendered 816px wide, so the reader saw 48% of the page
 * and had to drag sideways for the other half of every line. Headings were cut
 * mid-word and the four-cell patient snapshot showed two cells. The delivery
 * email's only instruction is "click any report below to view it in your
 * browser", and there is no attached PDF, so this is how most customers meet the
 * thing they paid for.
 *
 * WHY THIS IS A SEPARATE CONSTANT, appended AFTER the per-report CSS in
 * htmlShell rather than added to SHARED_CSS. Media queries do not raise
 * specificity, so a `.meal` rule inside a query in SHARED_CSS would lose to the
 * plain `.meal` rule that MEAL_CSS defines further down the stylesheet. Last
 * wins, so these have to be last.
 *
 * `@media screen` on purpose: print is untouched and keeps the 8.5in document
 * page, which the existing `@media print` block already handles. The browser
 * report adapts, the printable report stays printable, and the mobile test
 * asserts both.
 *
 * NOTHING IS HIDDEN. There is no `display:none` here and there must never be:
 * `.page` carries `overflow:hidden`, so anything still too wide is CLIPPED
 * rather than scrolled to, and a clipped renal referral or a clipped medication
 * warning is the failure mode this whole audit exists to prevent. Everything
 * below reflows, shrinks or wraps. `min-width:0` on grid and flex children is
 * the load-bearing line: without it a grid child refuses to shrink below its
 * content and pushes the page wide again from the inside.
 */
const SCREEN_CSS = `
@media screen and (max-width:860px){
  body{padding:0 0 28px}
  .page{width:100%;max-width:100%;min-height:0;margin:0 0 12px;box-shadow:none;border-bottom:1px solid var(--line)}

  /* On desktop the Save-as-PDF button floats in the margin beside the page. On a
     phone there is no margin, so a fixed button lands on top of the report's own
     header. It becomes an ordinary row above the document instead. */
  .printbar{position:static;justify-content:flex-end;padding:10px 14px 0}

  /* Inches are a print unit. On a 320px screen 0.6in of gutter each side eats
     a third of the readable width. */
  .rep-head{padding:20px 16px 18px}
  .rep-body,.rep-body.tight{padding:18px 16px 16px}
  .rep-foot{padding:12px 16px;flex-wrap:wrap;gap:4px;justify-content:flex-start;text-align:left}

  .rep-head h1{font-size:24px;line-height:1.12}
  .rh-top{margin-bottom:16px}
  .rh-title-row{flex-direction:column;align-items:flex-start;gap:12px}
  .rh-meta{text-align:left;flex:1 1 auto}
  .rh-prepared{font-size:13px}

  /* Multi-column layouts collapse. Two cells still read on a phone; four do not. */
  .stat-grid.c4,.stat-grid.c3{grid-template-columns:repeat(2,1fr)}
  .two-col{grid-template-columns:1fr;gap:16px}
  .pt-row{grid-template-columns:1fr;gap:18px}
  .intervention{grid-template-columns:1fr;gap:18px;padding:16px}
  .minigauge{width:100%;max-width:190px;margin:0 auto}
  .sign-block .sl{flex-direction:column;gap:22px}

  /* The macro panel: keep the label, bar and value, just narrower. */
  .ml{grid-template-columns:66px 1fr auto;gap:9px}
  .ml .val{min-width:0;font-size:12px}
  .ml .val small{display:block}

  /* Meal plan */
  .targets{gap:8px;padding:12px 14px}
  .week-glance{grid-template-columns:repeat(4,1fr);gap:6px}
  .day-head{flex-wrap:wrap;gap:6px;padding:10px 14px}
  .meal{grid-template-columns:1fr;gap:3px;padding:11px 14px}
  .meal .mm{justify-content:flex-start;flex-wrap:wrap;gap:8px;margin-top:2px}
  .daytot{flex-wrap:wrap;gap:8px;padding:9px 14px}
  .stackbar{width:100%;max-width:150px}
  .grocery{grid-template-columns:1fr;gap:18px}

  /* Starter kit */
  .timeline,.elyte,.cheat{grid-template-columns:1fr;gap:12px}
  .supp-grid{grid-template-columns:1fr}
  .lede{font-size:16px}

  /* Dense tables stay whole: smaller type, tighter cells, and cells that wrap.
     NOT table-layout:fixed, and NOT overflow-wrap:anywhere on the cells. Both
     were in the first version of this block and between them they squeezed the
     risk column to 27px and rendered the word "High" as four stacked letters in
     the medication considerations table, which is safety content. "anywhere"
     breaks eagerly to reach the narrowest possible box; "break-word" breaks only
     when a word genuinely cannot fit, which is the behaviour wanted here.
     (No backticks in here: this whole block is a template literal, and the first
     draft of this comment closed it and broke the module at load.) */
  .dtable{font-size:12px}
  .dtable th,.dtable td{padding:8px 9px}
  /* A risk pill is a label, not prose. It never breaks. */
  .risk{white-space:nowrap}
  /* Nor does a section number: the min-width:0 below was splitting "03" into a
     0 above a 3. */
  .sec-title .num,.sec-eyebrow{white-space:nowrap}

  /* THE REFERRAL DOCUMENTS HAVE NO .rep-body. generateRenalMealPlanReferral and
     generateSglt2MealPlanReferral put .sec straight inside .page, so every
     gutter rule in this file missed them and their text ran edge to edge on the
     glass. These are the two documents whose entire content is a safety refusal,
     so they are the last two that should be touching the screen edge. The child
     combinator matches only them: everywhere else .sec sits inside .rep-body
     and is already padded. */
  .page>.sec{padding-left:16px;padding-right:16px}
  .page>.rep-foot{padding-left:16px;padding-right:16px}

  /* Nothing may be pushed out of the page from the inside. */
  .page *{min-width:0}
  .rep-body,.sec,.callout,.dtable th,.dtable td,.meal .name,.meal .name small,
  .gcat li,.tcard p,.food .fn,.stat .v{overflow-wrap:break-word}
}

/* The narrow phones, where two columns of anything stop working. */
@media screen and (max-width:400px){
  .stat-grid.c4,.stat-grid.c3,.stat-grid.c2{grid-template-columns:1fr}
  .week-glance{grid-template-columns:repeat(3,1fr)}
  .rep-head h1{font-size:21px}
  .rep-head{padding:18px 14px 16px}
  .rep-body,.rep-body.tight{padding:16px 14px 14px}
  .rep-foot{padding:11px 14px}
  .meal{padding:10px 14px}
  .dtable{font-size:11.5px}
  .dtable th,.dtable td{padding:7px 6px}
  .page>.sec,.page>.rep-foot{padding-left:14px;padding-right:14px}
}
`;

function htmlShell(title, extraCSS, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>KetoDial — ${escHtml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Newsreader:ital,opsz,wght@0,16..72,400;0,16..72,500;1,16..72,400&display=swap" rel="stylesheet" />
<style>${SHARED_CSS}${extraCSS}${SCREEN_CSS}</style>
</head>
<body>

<div class="printbar no-print">
  <button onclick="window.print()">
    ${PRINT_BUTTON_SVG}
    Save as PDF
  </button>
</div>

${bodyContent}

</body>
</html>`;
}

function brandHeader(tag) {
  return `<div class="rh-top">
      <div class="rh-brand">
        ${BRAND_SVG}
        <span class="word">Keto<b>Dial</b></span>
      </div>
      <span class="rh-tag">${escHtml(tag)}</span>
    </div>`;
}

function pageFooter(leftText, centerText, pageNum, totalPages) {
  return `<footer class="rep-foot">
    <span>${leftText}</span>
    <span>${centerText}</span>
    <span>Page ${pageNum} of ${totalPages}</span>
  </footer>`;
}


// ═══════════════════════════════════════════════════
// DOCTOR'S REPORT
// ═══════════════════════════════════════════════════

const DOCTOR_CSS = `
  .pt-row{display:grid;grid-template-columns:1fr auto;gap:26px;align-items:center}
  .intervention{display:grid;grid-template-columns:1fr 168px;gap:24px;align-items:center;border:1px solid var(--line);border-radius:14px;padding:18px 20px;background:#fafcfe}
  .macro-line{display:flex;flex-direction:column;gap:10px}
  .ml{display:grid;grid-template-columns:78px 1fr auto;align-items:center;gap:12px}
  .ml .nm{font-size:13px;font-weight:600;color:var(--ink);display:flex;align-items:center;gap:8px}
  .ml .nm .d{width:10px;height:10px;border-radius:3px}
  .ml .bar{height:7px;border-radius:4px;background:var(--line-soft);overflow:hidden}
  .ml .bar i{display:block;height:100%;border-radius:4px}
  .ml .val{font-family:var(--mono);font-size:13px;font-weight:600;color:var(--ink);min-width:78px;text-align:right}
  .ml .val small{color:var(--ink-faint);font-weight:400;font-size:11px}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:22px}
  .sign-block{margin-top:20px;border:1px dashed var(--line);border-radius:12px;padding:18px 20px}
  .sign-block .sl{display:flex;gap:30px;margin-top:18px}
  .sign-line{flex:1;border-top:1.5px solid var(--ink);padding-top:6px;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
  .risk{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.04em;padding:3px 8px;border-radius:5px}
  .risk.hi{background:rgba(220,38,38,.1);color:var(--red)}
  .risk.med{background:rgba(217,119,6,.12);color:var(--amber)}
  .risk.lo{background:rgba(22,163,74,.1);color:var(--green)}
`;

// Condition metadata for doctor's report
const CONDITION_INFO = {
  t2d: {
    label: 'Type 2 diabetes',
    relevance: 'Glycemic changes are common during carbohydrate restriction; monitoring advised',
    why: 'You reported Type 2 diabetes. Carbohydrate restriction directly affects blood glucose management.',
    risk: 'hi', riskLabel: 'monitor',
    labs: [
      { panel: 'HbA1c + fasting glucose', rationale: 'Track glycemic response; anticipate medication titration.', cadence: 'Baseline, 6 &amp; 12 wk' },
      { panel: 'Fasting insulin / HOMA-IR', rationale: 'Quantify insulin resistance and its improvement.', cadence: 'Baseline, 12 wk' },
    ],
    meds: [
      { name: 'Metformin', note: 'Generally compatible. Watch for additive GI upset early on; lactic acidosis remains rare. No routine dose change purely for diet.', risk: 'lo' },
      { name: 'Insulin / sulfonylureas', sub: 'if applicable', note: 'Highest hypoglycemia risk with carb restriction. Typically requires pre-emptive dose reduction and glucose monitoring.', risk: 'hi' },
      { name: 'SGLT2 inhibitors', sub: 'if applicable', note: 'Small but real risk of euglycemic diabetic ketoacidosis when combined with ketogenic eating. Discuss before starting.', risk: 'hi' },
    ],
  },
  pre: {
    label: 'Prediabetes',
    relevance: 'Fasting glucose may normalize; monitor weekly',
    why: 'You reported prediabetes. Blood glucose monitoring is especially important during dietary changes.',
    risk: 'med', riskLabel: 'monitor',
    labs: [
      { panel: 'HbA1c + fasting glucose', rationale: 'Track glycemic normalization over time.', cadence: 'Baseline, 6 &amp; 12 wk' },
      { panel: 'Fasting insulin / HOMA-IR', rationale: 'Quantify insulin resistance and its improvement.', cadence: 'Baseline, 12 wk' },
    ],
    meds: [],
  },
  bp: {
    label: 'Hypertension',
    relevance: 'BP may fall with carb restriction &amp; diuresis',
    why: 'You reported hypertension. Sodium and fluid shifts during keto adaptation can affect blood pressure.',
    risk: 'med', riskLabel: 'monitor',
    labs: [
      { panel: 'Comprehensive metabolic panel', rationale: 'Electrolytes, renal &amp; hepatic function during diuresis.', cadence: 'Baseline, 4 &amp; 12 wk' },
      { panel: 'Magnesium, potassium', rationale: 'Electrolyte shifts are common in early adaptation.', cadence: 'Baseline, 4 wk' },
    ],
    meds: [
      { name: 'ACE inhibitors / ARBs', sub: 'e.g. lisinopril', note: 'Blood pressure may decline with sodium/water loss. Monitor for lightheadedness; clinician may reduce dose.', risk: 'med' },
      { name: 'Diuretics', sub: 'if applicable', note: 'Keto itself is diuretic. Combined effect may cause dehydration and electrolyte depletion. Close monitoring advised.', risk: 'med' },
    ],
  },
  chol: {
    label: 'High cholesterol',
    relevance: 'Lipid shifts expected; particle count more informative than LDL-C',
    why: 'You reported high cholesterol. Dietary fat changes will affect your lipid panel readings.',
    risk: 'med', riskLabel: 'retest',
    labs: [
      { panel: 'Lipid panel + ApoB / LDL-P', rationale: 'Particle count is more informative than LDL-C on keto.', cadence: 'Baseline, 12 wk' },
    ],
    meds: [
      { name: 'Statins', sub: 'if applicable', note: 'Generally compatible. Monitor lipid panel at baseline and 12 weeks. Focus on ApoB and triglyceride/HDL ratio rather than LDL-C alone.', risk: 'lo' },
    ],
  },
  thy: {
    label: 'Thyroid condition',
    relevance: 'T3 may shift with carb restriction; monitor thyroid panel',
    why: 'You reported a thyroid condition. Carbohydrate intake can affect T3 levels.',
    risk: 'med', riskLabel: 'monitor',
    labs: [
      { panel: 'TSH + free T4', rationale: 'Reported thyroid relevance; rule out confounders.', cadence: 'Baseline' },
    ],
    meds: [
      { name: 'Levothyroxine', sub: 'if applicable', note: 'No direct interaction with keto. Take on empty stomach as usual. Recheck TSH at 3 months.', risk: 'lo' },
    ],
  },
  pcos: {
    label: 'PCOS',
    relevance: 'Insulin sensitivity and hormonal balance may improve',
    why: 'You reported PCOS. Insulin sensitivity improvements on keto may affect hormonal balance.',
    risk: 'med', riskLabel: 'monitor',
    labs: [
      { panel: 'Fasting insulin / HOMA-IR', rationale: 'Quantify insulin resistance driving PCOS symptoms.', cadence: 'Baseline, 12 wk' },
      { panel: 'Testosterone, DHEA-S, SHBG', rationale: 'Track hormonal response to dietary intervention.', cadence: 'Baseline, 12 wk' },
    ],
    meds: [],
  },
  liver: {
    label: 'Fatty liver (NAFLD)',
    relevance: 'Liver fat reduction expected with carb restriction',
    why: 'You reported fatty liver. Ketogenic diets have shown reduction in liver fat in studies.',
    risk: 'lo', riskLabel: 'favorable',
    labs: [
      { panel: 'Liver function panel (ALT, AST, GGT)', rationale: 'Track hepatic improvement with carb restriction.', cadence: 'Baseline, 12 wk' },
    ],
    meds: [],
  },
  gerd: {
    label: 'GERD / acid reflux',
    relevance: 'Symptoms often improve with carb restriction; monitor initial weeks',
    risk: 'lo', riskLabel: 'favorable',
    labs: [],
    meds: [
      { name: 'PPIs (omeprazole, etc.)', sub: 'if applicable', note: 'May be able to taper after 4-8 weeks if reflux improves. Do not stop abruptly without physician guidance.', risk: 'lo' },
    ],
  },
  // Added 2026-09-08 with the containment gate. Without an entry here the doctor
  // report's `filter(c => CONDITION_INFO[c])` silently DROPS the condition, so a
  // customer who ticked "kidney disease" would have handed their physician a report
  // that did not mention it. Both entries carry empty labs/meds arrays on purpose:
  // saying which panels to run or how to handle a prescription in reduced kidney
  // function or cardiac disease is clinical guidance, and this product does not get
  // to author it. The report states what the patient reported and defers.
  kidney: {
    label: 'Kidney disease / CKD',
    relevance: 'Sodium, potassium, fluid and protein intake are clinical decisions in reduced kidney function',
    why: 'You reported kidney disease. This report does not set sodium, potassium, fluid or electrolyte-supplement amounts for you. Ask the clinician who manages your kidneys, or a renal dietitian, what yours should be.',
    risk: 'hi', riskLabel: 'defer to clinician',
    labs: [],
    meds: [],
  },
  heart: {
    label: 'Heart condition',
    relevance: 'Sodium and fluid shifts during adaptation are a clinical matter in cardiac disease',
    why: 'You reported a heart condition. This report does not set sodium, potassium or fluid amounts for you. Ask the clinician who manages your heart what yours should be.',
    risk: 'hi', riskLabel: 'defer to clinician',
    labs: [],
    meds: [],
  },
  ibs: {
    label: 'IBS',
    relevance: 'Low-carb diets often reduce bloating and GI symptoms',
    risk: 'lo', riskLabel: 'favorable',
    labs: [],
    meds: [],
  },
};

// Standard labs always included
const STANDARD_LABS = [
  { panel: 'Lipid panel + ApoB / LDL-P', rationale: 'Particle count is more informative than LDL-C on keto.', cadence: 'Baseline, 12 wk' },
  { panel: 'Comprehensive metabolic panel', rationale: 'Electrolytes, renal &amp; hepatic function during diuresis.', cadence: 'Baseline, 4 &amp; 12 wk' },
  { panel: 'Magnesium, potassium', rationale: 'Electrolyte shifts are common in early adaptation.', cadence: 'Baseline, 4 wk' },
  { panel: 'Uric acid', rationale: 'May transiently rise in the first weeks.', cadence: 'Baseline, 6 wk' },
];

export function generateDoctorReport(name, d) {
  // NO DEFAULTS. This document is written to be handed to a physician, and every
  // figure on it is a claim about a specific person's body. `const cal = d.calories
  // || 1800` is what let a lost questionnaire print BMI 26.0 for a customer whose
  // BMI was 32.3, under a heading inviting her doctor to act on it. Refuse instead.
  requireFacts(d, ['calories', 'fatG', 'proteinG', 'carbG', 'tdee', 'weightKg', 'heightCm',
                   'sex', 'age', 'goal', 'kidneyStatus'], 'generateDoctorReport');
  // This document prints a conditions table and a medications table. With neither
  // field supplied it printed "None reported" in both — a claim about the customer,
  // addressed to their physician, that nobody made. Empty is fine; absent is not.
  requireDeclaredAnswers(d, ['conditions', 'meds'], 'generateDoctorReport');

  const rid = reportId();
  const dateStr = fmtDate();
  const cal = d.calories;
  const fat = d.fatG;
  const prot = d.proteinG;
  const carb = d.carbG;
  const pct = macroPercents(cal, fat, prot, carb);
  const wKg = d.weightKg;
  const hCm = d.heightCm;
  const bmi = calcBmi(wKg, hCm);
  const bmiCat = bmiCategory(bmi);
  const tdee = d.tdee;

  // THE SHARED BOUNDARY. Until 2026-09-08 only generateStarterKit consulted it, so
  // the two documents most likely to be read by a clinician were the two with no
  // gate at all. Every generator now passes through this one call.
  const ctx = deriveKdMedicalContext(d);
  const proteinWithheld = ctx.restrictProteinTarget;
  // A declared SGLT2 inhibitor withholds the ketogenic targets themselves, so the
  // panel empties for either reason, and the calorie gauge empties only for this one.
  const ketoWithheld = ctx.restrictKetogenicProtocol;
  const panelWithheld = proteinWithheld || ketoWithheld;

  const conditions = (d.conditions || []).filter(c => c !== 'none' && CONDITION_INFO[c]);
  const rawMeds = d.meds || 'None reported';
  const meds = normalizeMedications(rawMeds);

  // Build conditions table rows
  const conditionRows = conditions.length > 0
    ? conditions.map(c => {
        const info = CONDITION_INFO[c];
        return `<tr><td><b>${info.label}</b></td><td>${info.relevance} <span class="risk ${info.risk}">${info.risk === 'hi' ? 'High' : info.risk === 'med' ? 'Medium' : 'Low'} — ${info.riskLabel}</span>${info.why ? `<br /><span style="font-size:11px;color:var(--ink-faint);line-height:1.4">${info.why}</span>` : ''}</td></tr>`;
      }).join('')
    : '<tr><td><b>None reported</b></td><td>Standard monitoring recommended</td></tr>';

  // Build medications table
  const medsHtml = meds && meds !== 'None reported' && meds.trim()
    ? `<table class="dtable">
            <thead><tr><th>Reported medication</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td><b>${escHtml(meds)}</b></td><td class="mono">As reported</td></tr>
            </tbody>
          </table>`
    : `<table class="dtable">
            <thead><tr><th>Reported medication</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>None reported</td><td class="mono">N/A</td></tr>
            </tbody>
          </table>`;

  // Check for GLP-1 medications
  const glp1Pattern = /ozempic|semaglutide|mounjaro|tirzepatide|wegovy|zepbound/i;
  const hasGlp1 = meds && glp1Pattern.test(meds);
  const glp1Callout = hasGlp1
    ? `<div class="callout warn" style="margin-top:16px">
        <span class="ct">GLP-1 medication note</span>
        GLP-1 medications can significantly reduce appetite. During keto adaptation, monitor whether calorie intake drops too aggressively — undereating protein is a common risk when appetite is already suppressed.
      </div>`
    : '';

  // Build warning callout based on conditions
  let warningCallout = '';
  const hasGlycemic = conditions.some(c => ['t2d', 'pre'].includes(c));
  const hasBP = conditions.includes('bp');
  if (hasGlycemic || hasBP) {
    let msg = 'Carbohydrate restriction can ';
    const parts = [];
    if (hasGlycemic) parts.push('lower blood glucose');
    if (hasBP) parts.push('lower blood pressure');
    msg += parts.join(' and ') + ' relatively quickly. ';
    if (meds && meds !== 'None reported') {
      msg += `Where the patient takes glucose- or pressure-lowering agents, <b>proactive monitoring and possible dose adjustment</b> may be warranted in the first weeks. See medication considerations on page 2.`;
    } else {
      msg += `<b>Proactive monitoring</b> is recommended in the first weeks.`;
    }
    warningCallout = `<div class="callout warn" style="margin-top:16px">
        <span class="ct">Why this matters</span>
        ${msg}
      </div>`;
  }

  // Build labs table — deduplicate
  const labMap = new Map();
  // Add condition-specific labs first
  conditions.forEach(c => {
    (CONDITION_INFO[c].labs || []).forEach(l => {
      if (!labMap.has(l.panel)) labMap.set(l.panel, l);
    });
  });
  // Add standard labs
  STANDARD_LABS.forEach(l => {
    if (!labMap.has(l.panel)) labMap.set(l.panel, l);
  });
  const labRows = Array.from(labMap.values()).map(l =>
    `<tr><td><b>${l.panel}</b></td><td>${l.rationale}</td><td class="mono">${l.cadence}</td></tr>`
  ).join('');

  // Build medication considerations table — deduplicate
  const medMap = new Map();
  // DECLARED MEDICATION FIRST. This table used to be built only from the condition
  // chips, so a customer who ticked nothing and typed "Lantus insulin 24 units at
  // night, glipizide 5mg" got no medication section at all — while the exact row
  // their physician needed sat unreachable inside the Type 2 diabetes metadata.
  // Seeding here means the section appears on the strength of the medication
  // alone, and the de-duplication below then keeps this specific wording in
  // preference to the "if applicable" version.
  kdMedicationConsiderations(ctx).forEach(m => medMap.set(m.name, m));
  conditions.forEach(c => {
    (CONDITION_INFO[c].meds || []).forEach(m => {
      if (!medMap.has(m.name)) medMap.set(m.name, m);
    });
  });
  const medConsRows = Array.from(medMap.values()).map(m =>
    `<tr><td><b>${escHtml(m.name)}</b>${m.sub ? `<br /><span style="font-size:11px;color:var(--ink-faint)">${escHtml(m.sub)}</span>` : ''}</td><td>${escHtml(m.note)}</td><td><span class="risk ${m.risk}">${m.risk === 'hi' ? 'High' : m.risk === 'med' ? 'Medium' : 'Low'}</span></td></tr>`
  ).join('');

  // Build questions for physician
  const questions = [];
  if (meds && meds !== 'None reported') {
    questions.push(`Given my current medication (${escHtml(meds)}), should we adjust doses or set a check-in for the first 2–4 weeks?`);
  }
  questions.push('Which of the baseline labs above would you like to run before I start?');
  if (hasBP || hasGlycemic) {
    questions.push('Is there a blood-pressure or glucose reading at which I should call the office?');
  }
  questions.push('Do my kidney and liver values look fine for a higher-fat pattern of eating?');
  if (conditions.length === 0) {
    questions.push('Are there any conditions in my history that might require extra monitoring on a ketogenic diet?');
  }

  const questionsHtml = questions.map(q => `<li>${q}</li>`).join('\n        ');

  // Gauge needle angle: map calories to an arc position
  // The gauge arc goes from about 9 o'clock (left) to 3 o'clock (right)
  // We'll position needle proportional to deficit from TDEE
  const deficitPct = Math.min(Math.max((cal / (tdee || cal)), 0.5), 1.2);
  const needleAngle = -50 + (deficitPct * 80); // rough angle mapping

  const body = `
<!-- ============ PAGE 1 ============ -->
<div class="page">
  <header class="rep-head">
    ${brandHeader('Clinical Summary')}
    <div class="rh-title-row">
      <div>
        <div class="rh-eyebrow">Doctor's Report</div>
        <h1>Ketogenic diet<br /><span class="lt">clinical discussion summary</span></h1>
      </div>
      <div class="rh-meta">
        <div class="row">REPORT <b>${rid}</b></div>
        <div class="row">GENERATED <b>${dateStr}</b></div>
        <div class="row">SOURCE <b>Self-reported</b></div>
      </div>
    </div>
    <div class="rh-prepared">Prepared for <b>${escHtml(name)}</b> — to review and discuss with your physician before starting.</div>
  </header>

  <div class="rep-body">

    <!-- patient snapshot -->
    <section class="sec avoid-break">
      <div class="sec-eyebrow">Section 1</div>
      <div class="sec-title"><span class="num">01</span> Patient snapshot</div>
      <div class="stat-grid c4">
        <div class="stat"><div class="k">Sex</div><div class="v">${escHtml(d.sex || 'Not specified')}</div></div>
        <div class="stat"><div class="k">Age</div><div class="v">${d.age || '—'} <small>yrs</small></div></div>
        <div class="stat"><div class="k">Height</div><div class="v">${cmToFeetInches(hCm)} <small>${hCm}cm</small></div></div>
        <div class="stat"><div class="k">Weight</div><div class="v">${kgToLb(wKg)} <small>lb · ${wKg}kg</small></div></div>
        <div class="stat"><div class="k">BMI</div><div class="v">${bmi} <small>${bmiCat}</small></div></div>
        <div class="stat"><div class="k">Activity</div><div class="v" style="font-size:13px">${activityLabel(d.activity)}</div></div>
        <div class="stat"><div class="k">Goal</div><div class="v" style="font-size:13px">${goalLabel(d.goal)}</div></div>
        <div class="stat"><div class="k">Est. TDEE</div><div class="v">${fmtNum(tdee)} <small>kcal</small></div></div>
      </div>
    </section>

    <!-- intervention -->
    <section class="sec avoid-break">
      <div class="sec-eyebrow">Section 2</div>
      <div class="sec-title"><span class="num">02</span> Proposed dietary intervention</div>
      <div class="sec-sub">${panelWithheld
        ? 'This section would normally set a macronutrient distribution. It does not, for the reason stated below.'
        : `A ketogenic macronutrient distribution${d.goal === 'lose' ? ' at a 20% caloric deficit from estimated maintenance' : d.goal === 'gain' ? ' at a 10% caloric surplus above maintenance' : ' at estimated maintenance'}. Protein set to approximately 25% of calories to support body composition during fat loss.`}</div>
      <div class="intervention">
        ${panelWithheld
          // THE WHOLE PANEL GOES, NOT JUST THE PROTEIN ROW. Energy, fat, protein and
          // carbohydrate are one closed system: printing any three of them states the
          // fourth. Blanking the protein line while leaving calories, fat and carbs on
          // the page would let the reader recover the number by subtraction, which is
          // suppression in appearance only — the exact failure CLAUDE.md calls
          // cosmetic safety. So the macro panel is replaced, not edited.
          //
          // Two different reasons can empty it, and a reader can have both, so both
          // notes render rather than one silently winning.
          ? kdProteinSuppressionNote(ctx) + kdKetogenicSuppressionNote(ctx)
          : `<div class="macro-line">
          <div class="ml" style="margin-bottom:4px">
            <div class="nm">Energy</div>
            <div class="bar"><i style="background:var(--ink);width:80%"></i></div>
            <div class="val">${fmtNum(cal)} <small>kcal/d</small></div>
          </div>
          <div class="ml">
            <div class="nm"><span class="d" style="background:var(--fat)"></span>Fat</div>
            <div class="bar"><i style="background:var(--fat);width:${pct.fat}%"></i></div>
            <div class="val">${fat} g <small>· ${pct.fat}%</small></div>
          </div>
          <div class="ml">
            <div class="nm"><span class="d" style="background:var(--protein)"></span>Protein</div>
            <div class="bar"><i style="background:var(--protein);width:${pct.protein}%"></i></div>
            <div class="val">${prot} g <small>· ${pct.protein}%</small></div>
          </div>
          <div class="ml">
            <div class="nm"><span class="d" style="background:var(--carbs)"></span>Net carbs</div>
            <div class="bar"><i style="background:var(--carbs);width:${Math.max(pct.carb, 3)}%"></i></div>
            <div class="val">${carb} g <small>· ${pct.carb}%</small></div>
          </div>
        </div>`}
        ${ketoWithheld
          // The gauge is a calorie target, and for this reader the calorie target is
          // withheld along with the rest. Leaving the dial spinning next to a note
          // saying we have not set your calories would be the number surviving its
          // own suppression, which is the whole failure mode.
          //
          // It stays for the renal reader: energy is not the protein figure, and
          // theirs is not withheld.
          ? ''
          : `<div class="minigauge">
          <svg viewBox="0 0 150 96" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
            <path d="M16 84 A 59 59 0 0 1 134 84" stroke="#e2e8f0" stroke-width="9" stroke-linecap="round"/>
            <path d="M16 84 A 59 59 0 0 1 110 30" stroke="#0ea5e9" stroke-width="9" stroke-linecap="round"/>
            <line x1="75" y1="84" x2="108" y2="40" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="75" cy="84" r="4.5" fill="#0f172a"/>
          </svg>
          <div class="num" style="color:var(--ink);top:48%">${fmtNum(cal)}</div>
          <div class="lab" style="color:var(--ink-faint);top:48%;margin-top:20px">kcal / day</div>
        </div>`}
      </div>
      ${kdHypoglycemiaCallout(ctx)}
    </section>

    <!-- conditions & meds -->
    <section class="sec avoid-break">
      <div class="sec-eyebrow">Section 3</div>
      <div class="sec-title"><span class="num">03</span> Reported conditions &amp; medications</div>
      <div class="two-col">
        <div>
          <table class="dtable">
            <thead><tr><th>Reported condition</th><th>Relevance</th></tr></thead>
            <tbody>
              ${conditionRows}
            </tbody>
          </table>
        </div>
        <div>
          ${medsHtml}
          ${glp1Callout}
        </div>
      </div>
      ${warningCallout}
    </section>

  </div>

  ${pageFooter(`KetoDial Clinical Summary <span class="dot">·</span> ${rid}`, 'Not medical advice — for discussion with a licensed provider', 1, 2)}
</div>

<!-- ============ PAGE 2 ============ -->
<div class="page">
  <div class="rep-body tight">

    <!-- labs -->
    <section class="sec avoid-break">
      <div class="sec-eyebrow">Section 4</div>
      <div class="sec-title"><span class="num">04</span> Suggested baseline &amp; follow-up labs</div>
      <div class="sec-sub">Panels commonly considered before and during a ketogenic intervention for a patient with this profile. Final selection is the clinician's judgment.</div>
      <table class="dtable zebra">
        <thead><tr><th style="width:30%">Panel</th><th>Rationale</th><th style="width:22%">Suggested cadence</th></tr></thead>
        <tbody>
          ${labRows}
        </tbody>
      </table>
    </section>

    <!-- med considerations -->
    ${medConsRows.length > 0 ? `<section class="sec avoid-break">
      <div class="sec-eyebrow">Section 5</div>
      <div class="sec-title"><span class="num">05</span> Medication considerations</div>
      <table class="dtable">
        <thead><tr><th style="width:24%">Medication</th><th>Consideration on a ketogenic diet</th><th style="width:14%">Risk</th></tr></thead>
        <tbody>
          ${medConsRows}
        </tbody>
      </table>
    </section>` : ''}

    <!-- talking points -->
    <section class="sec avoid-break">
      <div class="sec-eyebrow">Section ${medConsRows.length > 0 ? '6' : '5'}</div>
      <div class="sec-title"><span class="num">${medConsRows.length > 0 ? '06' : '05'}</span> Questions to ask your physician</div>
      <ul class="qs">
        ${questionsHtml}
      </ul>
    </section>

    <!-- sign block -->
    <section class="sec avoid-break">
      <div class="sign-block">
        <div style="font-size:12.5px;color:var(--ink-soft);line-height:1.55"><b style="color:var(--ink)">Clinician notes &amp; sign-off.</b> This summary was generated by KetoDial from patient-reported information and is intended to support a conversation — not to direct treatment. Targets and labs are suggestions for your consideration.</div>
        <div class="sl">
          <div class="sign-line">Provider signature</div>
          <div class="sign-line">Date</div>
        </div>
      </div>
    </section>

    <div class="callout" style="border-left-color:var(--accent);margin-top:8px">
      <span class="ct">Bring this to your appointment</span>
      Print this report and bring it to your next appointment. The lab recommendations, medication notes, and talking points are designed to make a productive 5-minute conversation with your physician.
    </div>

  </div>

  ${pageFooter(`KetoDial Clinical Summary <span class="dot">·</span> ${rid}`, '<a href="https://ketodial.com">ketodial.com</a> — not medical advice', 2, 2)}
</div>`;

  return htmlShell("Doctor's Report", DOCTOR_CSS, body);
}


// ═══════════════════════════════════════════════════
// 7-DAY MEAL PLAN
// ═══════════════════════════════════════════════════

const MEAL_CSS = `
  .targets{display:flex;align-items:center;gap:16px;flex-wrap:wrap;border:1px solid var(--line);border-radius:14px;padding:14px 18px;background:#fafcfe;margin-bottom:22px}
  .targets .tl{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-faint);margin-right:4px}
  .week-glance{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:24px}
  .wg{border:1px solid var(--line);border-radius:10px;padding:9px 8px;text-align:center}
  .wg .d{font-family:var(--mono);font-size:9px;letter-spacing:.1em;color:var(--ink-faint);text-transform:uppercase}
  .wg .n{font-family:var(--mono);font-size:18px;font-weight:700;color:var(--ink);margin:2px 0 4px}
  .wg .k{font-family:var(--mono);font-size:9.5px;color:var(--accent-deep)}

  .day{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin-bottom:14px}
  .day-head{display:flex;align-items:center;justify-content:space-between;gap:14px;background:var(--panel);color:#e2eef7;padding:11px 16px}
  .day-head .dl{display:flex;align-items:baseline;gap:10px}
  .day-head .dn{font-family:var(--mono);font-size:13px;font-weight:700;color:#fff;letter-spacing:.04em}
  .day-head .dd{font-size:12px;color:#9fc0d6}
  .day-head .dt{display:flex;align-items:center;gap:6px}
  .meal{display:grid;grid-template-columns:74px 1fr auto;gap:12px;align-items:center;padding:10px 16px;border-bottom:1px solid var(--line-soft)}
  .meal:last-child{border-bottom:none}
  .meal .slot{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-faint)}
  .meal .name{font-size:13px;font-weight:600;color:var(--ink)}
  .meal .name small{display:block;font-weight:400;color:var(--ink-faint);font-size:11px;margin-top:1px}
  .meal .mm{display:flex;align-items:center;gap:10px;font-family:var(--mono);font-size:11px}
  .meal .mm .kc{font-weight:700;color:var(--ink)}
  .meal .mm .fp{color:var(--ink-soft)}
  .meal .mm .fp b{font-weight:500}
  .fF{color:var(--fat)}.fP{color:var(--protein)}.fC{color:var(--carbs)}
  .daytot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 16px;background:#f7fbfe;border-top:1px solid var(--line)}
  .daytot .lab{font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-faint)}
  .stackbar{display:flex;height:7px;border-radius:4px;overflow:hidden;width:150px}
  .grocery{display:grid;grid-template-columns:1fr 1fr;gap:22px 30px}
  .gcat h4{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-deep);margin-bottom:10px;padding-bottom:7px;border-bottom:1.5px solid var(--line)}
  .gcat ul{list-style:none}
  .gcat li{display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0}
  .gcat li::before{content:"";width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none}
  .gcat li .q{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--ink-faint)}
`;

// Meal database: USDA-sourced macros with specific weights
// All macros verified against USDA FoodData Central
// Base macros are for ~1800 cal/day, scaled proportionally to customer target
// desc shows exact weights so customers can verify
// ═══════════════════════════════════════════════════
// THE EXECUTABLE MEAL
// ═══════════════════════════════════════════════════
//
// Until 2026-09-10 a meal was a name, a `desc` STRING, and four macro numbers.
// scaleMeal() multiplied the numbers and copied the string, so the plan told a
// customer to cook "4 oz sirloin steak (113g) · 2 large eggs (100g) · 1 tbsp
// butter (14g)" beside a macro column that had been scaled to 0.6x or 2.0x of
// that plate. Measured on a real 890 kcal profile: the line above printed 265
// kcal when the food as written is 442. Cooking the written week delivered
// roughly 1,480 kcal against an 890 kcal target, which is not a rounding error,
// it is the entire deficit the product sold.
//
// The fat knob made it worse. It appended text like "· −2 tbsp fat" to a dinner
// containing one tablespoon of oil, and "· +9.5 tbsp butter" (about 133 g on one
// plate) at the top of the range, because it was solving for exact calorie
// equality against numbers no food had to honour.
//
// ONE REPRESENTATION. A meal is now a list of ingredients. The SAME data
// produces the name, the written quantities, the meal macros, the day totals and
// the grocery list, so there is no second copy to drift from the first.
//
// Scaling scales the FOOD. Quantities are scaled, rounded to something a person
// can actually measure, and the macros are then computed FROM THE ROUNDED
// QUANTITIES. That ordering is the whole fix: the printed macros are by
// construction what the printed food delivers, so the two cannot disagree no
// matter what the scale factor is.
//
// The cost is that a day no longer lands exactly on the calorie target, because
// real food comes in eggs and half-tablespoons. That is the right trade and the
// tolerance is asserted in tests/kd-meal-plan-executable.test.mjs.

/**
 * Every ingredient the plan can use, with macros per ONE unit of `unit`.
 *
 * Values are USDA-typical and carry the same figures the old per-meal comments
 * used, so a scale of 1.0 lands close to the numbers this product has always
 * printed. They are not laboratory values and do not need to be: the guarantee
 * this file makes is that the written food and the printed macros agree with
 * each other, not that either is accurate to the gram.
 *
 *   unit    what one unit is
 *   g       one gram. `disp` says whether to show it as oz, cups or grams.
 *   each    one countable thing: an egg, a tortilla, an olive, a lettuce cup
 *   tbsp    one tablespoon
 *   strip   one rasher of bacon
 *   link    one sausage
 *
 *   step    the increment quantities are rounded to. A person can measure half a
 *           tablespoon and a 5 g difference on a steak; they cannot measure 0.37
 *           of an egg.
 *   min     the smallest quantity worth printing. Below it the ingredient is
 *           dropped rather than printed as a garnish-sized joke.
 *   aisle   which grocery section it aggregates into.
 *   buy     the shopper-facing unit the grocery list rounds to.
 */
const KD_ING = {
  // ---- proteins -----------------------------------------------------------
  egg:            { label: 'large egg', plural: 'large eggs', unit: 'each', g: 50, kcal: 70, f: 5, p: 6, c: 0.4, step: 1, min: 1, aisle: 'proteins', buy: 'dozen' },
  bacon:          { label: 'strip bacon', plural: 'strips bacon', unit: 'strip', g: 14, kcal: 43, f: 3.3, p: 3, c: 0, step: 1, min: 1, aisle: 'proteins', buy: 'pack' },
  sausage:        { label: 'pork sausage link', plural: 'pork sausage links', unit: 'link', g: 28, kcal: 98, f: 8, p: 6, c: 0.5, step: 1, min: 1, aisle: 'proteins', buy: 'pack' },
  smoked_salmon:  { label: 'smoked salmon', unit: 'g', disp: 'oz', kcal: 1.17, f: 0.044, p: 0.186, c: 0, step: 5, min: 30, aisle: 'proteins', buy: 'lb' },
  sirloin:        { label: 'sirloin steak', unit: 'g', disp: 'oz', kcal: 1.77, f: 0.071, p: 0.265, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  ribeye:         { label: 'ribeye steak', unit: 'g', disp: 'oz', kcal: 2.40, f: 0.159, p: 0.229, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  beef_strips:    { label: 'beef sirloin strips', unit: 'g', disp: 'oz', kcal: 1.76, f: 0.071, p: 0.271, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  ground_beef:    { label: 'ground beef 80/20', unit: 'g', disp: 'oz', kcal: 2.00, f: 0.129, p: 0.200, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  chicken_breast: { label: 'chicken breast', unit: 'g', disp: 'oz', kcal: 1.16, f: 0.026, p: 0.218, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  chicken_thigh:  { label: 'chicken thigh', unit: 'g', disp: 'oz', kcal: 1.90, f: 0.113, p: 0.197, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  chicken_thigh_skin: { label: 'skin-on chicken thighs', unit: 'g', disp: 'oz', kcal: 1.59, f: 0.099, p: 0.162, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  chicken_drumstick: { label: 'chicken drumsticks', unit: 'g', disp: 'oz', kcal: 1.72, f: 0.100, p: 0.185, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  pork_chop:      { label: 'bone-in pork chops', unit: 'g', disp: 'oz', kcal: 1.63, f: 0.099, p: 0.177, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  pork_shoulder:  { label: 'pork shoulder, pulled', unit: 'g', disp: 'oz', kcal: 2.11, f: 0.141, p: 0.194, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  pork_loin:      { label: 'pork loin', unit: 'g', disp: 'oz', kcal: 1.43, f: 0.077, p: 0.194, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  ground_turkey:  { label: 'ground turkey 85/15', unit: 'g', disp: 'oz', kcal: 1.71, f: 0.135, p: 0.171, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  salmon_fillet:  { label: 'salmon fillet', unit: 'g', disp: 'oz', kcal: 2.06, f: 0.129, p: 0.200, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  canned_salmon:  { label: 'canned salmon', unit: 'g', disp: 'oz', kcal: 1.18, f: 0.050, p: 0.200, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'can' },
  cod:            { label: 'cod fillet', unit: 'g', disp: 'oz', kcal: 0.82, f: 0.006, p: 0.176, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  tuna:           { label: 'canned tuna', unit: 'g', disp: 'oz', kcal: 0.92, f: 0.007, p: 0.204, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'can' },
  shrimp:         { label: 'shrimp', unit: 'g', disp: 'oz', kcal: 0.99, f: 0.018, p: 0.212, c: 0, step: 5, min: 40, aisle: 'proteins', buy: 'lb' },
  prosciutto:     { label: 'prosciutto', unit: 'g', disp: 'oz', kcal: 1.76, f: 0.106, p: 0.212, c: 0, step: 5, min: 25, aisle: 'proteins', buy: 'pack' },
  deli_turkey:    { label: 'deli turkey', unit: 'g', disp: 'oz', kcal: 1.06, f: 0.012, p: 0.212, c: 0.024, step: 5, min: 25, aisle: 'proteins', buy: 'pack' },
  jerky:          { label: 'beef jerky', unit: 'g', disp: 'oz', kcal: 2.86, f: 0.036, p: 0.464, c: 0.107, step: 5, min: 15, aisle: 'proteins', buy: 'pack' },
  // ---- fats ---------------------------------------------------------------
  butter:         { label: 'butter', unit: 'tbsp', g: 14, kcal: 102, f: 11.5, p: 0, c: 0, step: 0.5, min: 0.5, aisle: 'fats', buy: 'block' },
  olive_oil:      { label: 'olive oil', unit: 'tbsp', g: 14, kcal: 119, f: 13.5, p: 0, c: 0, step: 0.5, min: 0.5, aisle: 'fats', buy: 'bottle' },
  coconut_oil:    { label: 'coconut oil', unit: 'tbsp', g: 14, kcal: 121, f: 14, p: 0, c: 0, step: 0.5, min: 0.5, aisle: 'fats', buy: 'jar' },
  sesame_oil:     { label: 'sesame oil', unit: 'tbsp', g: 14, kcal: 120, f: 13.6, p: 0, c: 0, step: 0.5, min: 0.5, aisle: 'fats', buy: 'bottle' },
  mayo:           { label: 'olive-oil mayo', unit: 'tbsp', g: 14, kcal: 94, f: 10.5, p: 0, c: 0, step: 0.5, min: 0.5, aisle: 'fats', buy: 'jar' },
  ranch:          { label: 'ranch', unit: 'tbsp', g: 15, kcal: 73, f: 7.7, p: 0.2, c: 0.6, step: 0.5, min: 0.5, aisle: 'fats', buy: 'bottle' },
  avocado:        { label: 'avocado', unit: 'g', disp: 'avocado', kcal: 1.68, f: 0.147, p: 0.021, c: 0.029, step: 17, min: 34, aisle: 'produce', buy: 'each', eachG: 136 },
  macadamia:      { label: 'macadamias', unit: 'g', disp: 'oz', kcal: 7.29, f: 0.75, p: 0.079, c: 0.071, step: 5, min: 10, aisle: 'fats', buy: 'bag' },
  pecan:          { label: 'pecans', unit: 'g', disp: 'oz', kcal: 7.00, f: 0.71, p: 0.107, c: 0.036, step: 5, min: 10, aisle: 'fats', buy: 'bag' },
  almond:         { label: 'almonds', unit: 'g', disp: 'oz', kcal: 5.86, f: 0.50, p: 0.214, c: 0.107, step: 5, min: 10, aisle: 'fats', buy: 'bag' },
  olives:         { label: 'green olive', plural: 'green olives', unit: 'each', g: 4, kcal: 5.8, f: 0.5, p: 0, c: 0.2, step: 1, min: 2, aisle: 'fats', buy: 'jar' },
  kalamata:       { label: 'kalamata olive', plural: 'kalamata olives', unit: 'each', g: 4, kcal: 5.8, f: 0.5, p: 0, c: 0.2, step: 1, min: 2, aisle: 'fats', buy: 'jar' },
  cheddar:        { label: 'cheddar', unit: 'g', disp: 'oz', kcal: 4.04, f: 0.32, p: 0.250, c: 0.014, step: 5, min: 10, aisle: 'dairy', buy: 'block' },
  blue_cheese:    { label: 'blue cheese', unit: 'g', disp: 'oz', kcal: 3.53, f: 0.29, p: 0.210, c: 0.020, step: 5, min: 10, aisle: 'dairy', buy: 'block' },
  feta:           { label: 'feta', unit: 'g', disp: 'oz', kcal: 2.64, f: 0.21, p: 0.140, c: 0.040, step: 5, min: 10, aisle: 'dairy', buy: 'block' },
  mozzarella:     { label: 'fresh mozzarella', unit: 'g', disp: 'oz', kcal: 2.80, f: 0.22, p: 0.200, c: 0.030, step: 5, min: 15, aisle: 'dairy', buy: 'ball' },
  cream_cheese:   { label: 'cream cheese', unit: 'g', disp: 'oz', kcal: 3.46, f: 0.34, p: 0.060, c: 0.050, step: 5, min: 10, aisle: 'dairy', buy: 'tub' },
  heavy_cream:    { label: 'heavy cream', unit: 'tbsp', g: 15, kcal: 50, f: 5.4, p: 0.4, c: 0.4, step: 0.5, min: 0.5, aisle: 'dairy', buy: 'carton' },
  coconut_cream:  { label: 'coconut cream', unit: 'tbsp', g: 15, kcal: 50, f: 5.2, p: 0.5, c: 0.7, step: 0.5, min: 0.5, aisle: 'pantry', buy: 'can' },
  // ---- produce ------------------------------------------------------------
  romaine:        { label: 'romaine', unit: 'g', disp: 'cup', cupG: 47, kcal: 0.17, f: 0.003, p: 0.012, c: 0.017, step: 10, min: 20, aisle: 'produce', buy: 'bag' },
  mixed_greens:   { label: 'mixed greens', unit: 'g', disp: 'cup', cupG: 30, kcal: 0.23, f: 0.004, p: 0.022, c: 0.023, step: 10, min: 20, aisle: 'produce', buy: 'bag' },
  lettuce:        { label: 'shredded lettuce', unit: 'g', disp: 'cup', cupG: 47, kcal: 0.15, f: 0.002, p: 0.014, c: 0.015, step: 10, min: 20, aisle: 'produce', buy: 'head' },
  spinach:        { label: 'spinach', unit: 'g', disp: 'cup', cupG: 30, kcal: 0.23, f: 0.004, p: 0.029, c: 0.014, step: 10, min: 20, aisle: 'produce', buy: 'bag' },
  cucumber:       { label: 'cucumber', unit: 'g', disp: 'cup', cupG: 130, kcal: 0.15, f: 0.001, p: 0.007, c: 0.021, step: 10, min: 30, aisle: 'produce', buy: 'each', eachG: 300 },
  zucchini:       { label: 'zucchini', unit: 'g', disp: 'each', eachG: 200, kcal: 0.17, f: 0.003, p: 0.012, c: 0.021, step: 25, min: 50, aisle: 'produce', buy: 'each' },
  broccoli:       { label: 'broccoli', unit: 'g', disp: 'cup', cupG: 91, kcal: 0.34, f: 0.004, p: 0.028, c: 0.040, step: 10, min: 30, aisle: 'produce', buy: 'head' },
  green_beans:    { label: 'green beans', unit: 'g', disp: 'cup', cupG: 100, kcal: 0.31, f: 0.001, p: 0.018, c: 0.049, step: 10, min: 30, aisle: 'produce', buy: 'bag' },
  cabbage:        { label: 'shredded cabbage', unit: 'g', disp: 'cup', cupG: 75, kcal: 0.25, f: 0.001, p: 0.013, c: 0.036, step: 10, min: 30, aisle: 'produce', buy: 'head' },
  mushroom:       { label: 'mushrooms', unit: 'g', disp: 'cup', cupG: 70, kcal: 0.22, f: 0.003, p: 0.031, c: 0.020, step: 10, min: 20, aisle: 'produce', buy: 'pack' },
  asparagus:      { label: 'asparagus', unit: 'g', disp: 'cup', cupG: 134, kcal: 0.20, f: 0.001, p: 0.022, c: 0.021, step: 10, min: 30, aisle: 'produce', buy: 'bunch' },
  coleslaw:       { label: 'coleslaw with olive-oil dressing', unit: 'g', disp: 'cup', cupG: 120, kcal: 0.50, f: 0.033, p: 0.008, c: 0.033, step: 10, min: 30, aisle: 'produce', buy: 'bag' },
  lettuce_cup:    { label: 'butter lettuce cup', plural: 'butter lettuce cups', unit: 'each', g: 15, kcal: 2, f: 0, p: 0.2, c: 0.3, step: 1, min: 1, aisle: 'produce', buy: 'head' },
  raspberries:    { label: 'raspberries', unit: 'g', disp: 'cup', cupG: 123, kcal: 0.52, f: 0.006, p: 0.012, c: 0.065, step: 5, min: 15, aisle: 'produce', buy: 'punnet' },
  // ---- pantry -------------------------------------------------------------
  almond_flour:   { label: 'almond flour', unit: 'tbsp', g: 7, kcal: 40, f: 3.5, p: 1.5, c: 0.5, step: 0.5, min: 0.5, aisle: 'pantry', buy: 'bag' },
  tortilla:       { label: 'low-carb tortilla', plural: 'low-carb tortillas', unit: 'each', g: 38, kcal: 90, f: 4, p: 5, c: 3, step: 1, min: 1, aisle: 'pantry', buy: 'pack' },
  celery:         { label: 'stalk celery', plural: 'stalks celery', unit: 'each', g: 30, kcal: 5, f: 0, p: 0.2, c: 0.5, step: 1, min: 1, aisle: 'produce', buy: 'bunch' },
  dark_choc:      { label: 'square 90% dark chocolate', plural: 'squares 90% dark chocolate', unit: 'each', g: 10, kcal: 60, f: 5, p: 1, c: 2, step: 1, min: 1, aisle: 'pantry', buy: 'bar' },
};

/**
 * The increment a quantity is rounded to.
 *
 * For anything shown in cups, avocados or whole vegetables this is DERIVED from
 * the display grid rather than set by hand. It has to be: the description prints
 * both the unit and the grams, so if the rounding step and the display grid are
 * different numbers the two halves of the same phrase disagree. "½ cup cucumber
 * (50g)" was the result, and half a cup of cucumber is 65 g. Snapping the
 * quantity to a quarter cup makes the printed grams the grams of that quarter
 * cup, exactly, and the macros are then summed from the same figure.
 *
 * Weights shown in ounces keep their explicit 5 g step, because kdFmtIngredient
 * already picks the ounce grid to suit the size of the portion.
 */
function kdStepFor(ing) {
  // A quarter ounce. The 5 g step was not on the ounce grid either, so "4 oz
  // ribeye steak (120g)" printed a unit worth 113 g. Weight is the number a
  // customer with a scale actually follows, so the two must name one amount.
  if (ing.disp === 'oz') return 28.35 / 4;
  if (ing.disp === 'cup') return ing.cupG / 4;
  if (ing.disp === 'avocado') return 136 / 4;
  if (ing.disp === 'each' && ing.eachG) return ing.eachG / 2;
  return ing.step;
}

/**
 * The smallest quantity worth printing, also snapped to the display grid.
 *
 * A hand-set minimum in grams and a derived grid step are two numbers that can
 * disagree: mushrooms carried min 20 g against a quarter-cup grid of 17.5 g, so
 * a legitimate quarter cup sat just under its own floor. One quarter of the
 * display unit is the floor for anything measured that way.
 */
function kdMinFor(ing) {
  // ROUNDED THE SAME WAY THE QUANTITY IS. kdRoundQty snaps to two decimals and
  // this did not, so a jerky portion of 21.26 g failed a floor of 21.2625 g by
  // two and a half thousandths of a gram, the ingredient was dropped, the snack
  // came out at zero calories and a 6,000 kcal day silently lost 1,000 of them.
  // Two functions rounding the same grid differently is the same class of defect
  // as two places holding the same meal.
  const raw = ing.disp === 'oz' ? Math.ceil(ing.min / (28.35 / 4)) * (28.35 / 4)
    : ing.disp === 'cup' ? ing.cupG / 4
      : ing.disp === 'avocado' ? 136 / 4
        : (ing.disp === 'each' && ing.eachG) ? ing.eachG / 2
          : ing.min;
  return Math.round(raw * 100) / 100;
}

/** Round to a step a person can actually measure, never below the useful minimum. */
function kdRoundQty(key, qty) {
  const ing = KD_ING[key];
  const step = kdStepFor(ing);
  const stepped = Math.round(qty / step) * step;
  // Two decimals kills float dust from half-steps; nothing here needs more.
  return Math.round(stepped * 100) / 100;
}

/**
 * The ingredient library, exposed so a test can re-derive every meal's macros
 * from the quantities the customer was shown and compare. Exported rather than
 * duplicated in the suite: a test that keeps its own copy of the numbers is
 * checking itself, which is exactly how the printed macros drifted from the
 * printed food in the first place.
 */
export const KD_ING_FOR_TEST = KD_ING;

const KD_FRACTIONS = [[0.25, '¼'], [0.33, '⅓'], [0.5, '½'], [0.67, '⅔'], [0.75, '¾']];

/** "1½", "¾", "3" — the way a recipe writes a number. */
function kdFmtNumber(n) {
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 100) / 100;
  if (frac === 0) return String(whole);
  const hit = KD_FRACTIONS.find(([v]) => Math.abs(v - frac) < 0.02);
  if (!hit) return String(Math.round(n * 10) / 10);
  return whole === 0 ? hit[1] : `${whole}${hit[1]}`;
}

/**
 * Write one scaled ingredient the way the customer will read it.
 *
 * Weight is shown in the unit the shopper thinks in AND in grams, because a
 * kitchen scale is the only way to make "6 oz" repeatable. Countable things stay
 * countable: eggs are whole eggs.
 */
function kdFmtIngredient(key, qty) {
  const ing = KD_ING[key];
  if (ing.unit === 'each' || ing.unit === 'strip' || ing.unit === 'link') {
    const label = qty === 1 ? ing.label : (ing.plural || ing.label);
    return `${kdFmtNumber(qty)} ${label}${ing.g ? ` (${Math.round(qty * ing.g)}g)` : ''}`;
  }
  if (ing.unit === 'tbsp') {
    return `${kdFmtNumber(qty)} tbsp ${ing.label} (${Math.round(qty * ing.g)}${ing.label.includes('oil') || ing.label.includes('cream') ? 'ml' : 'g'})`;
  }
  // unit === 'g'
  if (ing.disp === 'oz') {
    // Quarter-ounce precision throughout, because that is the grid the quantity
    // was rounded onto. At half ounces a 20 g portion of macadamias printed as
    // "½ oz (20g)" and half an ounce is 14 g: the two halves of the same phrase
    // disagreed, which is this whole blocker in miniature.
    return `${kdFmtNumber(Math.round((qty / 28.35) * 4) / 4)} oz ${ing.label} (${Math.round(qty)}g)`;
  }
  if (ing.disp === 'cup') return `${kdFmtNumber(Math.round((qty / ing.cupG) * 4) / 4)} cup${qty / ing.cupG > 1.001 ? 's' : ''} ${ing.label} (${Math.round(qty)}g)`;
  if (ing.disp === 'avocado') return `${kdFmtNumber(Math.round((qty / 136) * 4) / 4)} avocado (${Math.round(qty)}g)`;
  if (ing.disp === 'each') return `${kdFmtNumber(Math.round((qty / ing.eachG) * 2) / 2)} ${ing.label} (${Math.round(qty)}g)`;
  return `${Math.round(qty)}g ${ing.label}`;
}

/**
 * Turn a meal template plus a scale factor into the thing the customer receives.
 *
 * THE ORDER MATTERS AND IS THE WHOLE POINT: scale, then round to a measurable
 * quantity, THEN compute the macros from what was rounded to. Doing it the other
 * way round is how the printed numbers stopped describing the printed food.
 *
 * @returns {{name, ing: [key, qty][], desc: string, kcal, f, p, c}}
 */
function kdMaterializeMeal(tpl, scale) {
  const ing = [];
  for (const [key, baseQty] of tpl.ing) {
    // The fat ceiling applies HERE too, not only in the adjuster. A snack scaled
    // 4.5x put six tablespoons of cream on a bowl of raspberries, which no
    // adjuster had touched. A ceiling that only some code paths respect is not a
    // ceiling. Capping the quantity before the macros are summed keeps the two
    // in step; the day simply lands a little lower, which the tolerance covers.
    const raw = baseQty * scale;
    const capped = KD_FAT_KEYS.includes(key) ? Math.min(raw, KD_FAT_MAX_TBSP) : raw;
    const q = kdRoundQty(key, capped);
    // The minimum is snapped to the same grid, so a quantity can never be
    // dropped for sitting a rounding error under a threshold off the grid.
    if (q >= kdMinFor(KD_ING[key])) ing.push([key, q]);
  }
  return kdFinishMeal(tpl, ing);
}

/** Sum a materialised ingredient list and render its description. */
function kdFinishMeal(tpl, ing) {
  let kcal = 0, f = 0, p = 0, c = 0;
  for (const [key, q] of ing) {
    const i = KD_ING[key];
    kcal += i.kcal * q; f += i.f * q; p += i.p * q; c += i.c * q;
  }
  const parts = ing.map(([key, q]) => kdFmtIngredient(key, q));
  if (tpl.garnish) parts.push(tpl.garnish);
  return {
    name: tpl.name,
    ing,
    desc: parts.join(' · '),
    kcal: Math.round(kcal), f: Math.round(f), p: Math.round(p), c: Math.round(c),
  };
}

/**
 * Nudge a meal's added fat to close a calorie gap, in food rather than in text.
 *
 * The old knob appended a sentence: "· −2 tbsp fat" onto a dinner holding one
 * tablespoon of oil, and "· +9.5 tbsp butter" at the top of the range. Both were
 * instructions nobody could follow, and neither changed the ingredient list.
 *
 * This changes the QUANTITY of a fat already in the meal, within a range a person
 * would actually cook, and never below zero. Nothing is ever subtracted in prose,
 * because there is no prose: the number in the ingredient list is simply smaller.
 *
 * Bounds are deliberate. Six tablespoons on one plate is the ceiling, and if the
 * gap is still open after that we accept the gap. A day that lands a little under
 * target is a plan; a dinner carrying nine and a half tablespoons of butter is
 * not, and the tolerance test exists so that trade is visible rather than assumed.
 */
const KD_FAT_KEYS = ['butter', 'olive_oil', 'coconut_oil', 'sesame_oil', 'mayo', 'heavy_cream', 'coconut_cream'];
/**
 * The most fat one plate may carry. Three tablespoons is a generous but real
 * amount of butter on a steak; six was what the first attempt produced when it
 * put the whole day's gap on the dinner, and nine and a half is what the version
 * before that printed. The gap is spread across the day's meals instead, so no
 * single plate absorbs it.
 */
const KD_FAT_MAX_TBSP = 4;

function kdAdjustMealFat(tpl, ing, kcalGap) {
  const idx = ing.findIndex(([k]) => KD_FAT_KEYS.includes(k));
  if (idx === -1 || Math.abs(kcalGap) < 25) return { meal: kdFinishMeal(tpl, ing), used: 0 };
  const [key, qty] = ing[idx];
  const per = KD_ING[key].kcal;
  const bounded = Math.max(0, Math.min(KD_FAT_MAX_TBSP, qty + kcalGap / per));
  const rounded = kdRoundQty(key, bounded);
  const next = ing.slice();
  if (rounded < KD_ING[key].min) next.splice(idx, 1);
  else next[idx] = [key, rounded];
  return { meal: kdFinishMeal(tpl, next), used: (rounded - qty) * per };
}

/**
 * Share one day's calorie gap across the meals that contain a fat, dinner first
 * because that is where an extra spoon of butter reads as cooking rather than as
 * an instruction. Each meal takes what it can within its own cap and passes the
 * rest along; whatever is left over is left over, and the day tolerance covers it.
 */
function kdDistributeFat(entries, kcalGap) {
  let remaining = kcalGap;
  const out = new Map();
  for (const { slot, tpl, meal } of entries) {
    if (Math.abs(remaining) < 25) { out.set(slot, meal); continue; }
    const share = kdAdjustMealFat(tpl, meal.ing, remaining);
    remaining -= share.used;
    out.set(slot, share.meal);
  }
  return out;
}

/**
 * The meal templates. Each is a name, an ingredient list at 1.0 scale, and an
 * optional garnish phrase carrying no macros and no quantity to scale.
 *
 * These are the SAME plates the plan has always used, restated as ingredients so
 * the quantities can move. The `desc` strings they replace are gone: a written
 * description that is not derived from the ingredient list is a second source of
 * truth, and it is the one that was wrong.
 */
function getMealDatabase(noDairy) {
  return {
    breakfast: [
      { name: 'Bacon &amp; avocado baked eggs', ing: [['egg', 3], ['bacon', 3], ['avocado', 68], ['butter', 1]] },
      { name: `Smoked salmon &amp; ${noDairy ? 'avocado' : 'cream-cheese'} roll-ups`,
        ing: [['smoked_salmon', 113], noDairy ? ['avocado', 68] : ['cream_cheese', 57], ['cucumber', 100]] },
      { name: `Sausage &amp; egg ${noDairy ? 'scramble' : 'muffins'}`,
        ing: [['egg', 3], ['sausage', 2], noDairy ? ['olive_oil', 1] : ['cheddar', 28]] },
      { name: `${noDairy ? 'Herb &amp; mushroom' : 'Cheese &amp; herb'} omelette`,
        ing: [['egg', 3], ['butter', 1], noDairy ? ['mushroom', 35] : ['cheddar', 28]], garnish: 'herbs' },
      { name: 'Steak &amp; eggs', ing: [['sirloin', 113], ['egg', 2], ['butter', 1]] },
      { name: 'Keto pancakes + butter', ing: [['egg', 2], ['almond_flour', 2], ['coconut_oil', 1], ['butter', 1]] },
      { name: 'Bacon &amp; egg plate', ing: [['egg', 2], ['avocado', 68], ['bacon', 2], ['spinach', 30]] },
    ],
    lunch: [
      { name: 'Chicken Cobb salad',
        ing: noDairy
          ? [['chicken_breast', 142], ['romaine', 94], ['egg', 1], ['olive_oil', 2]]
          : [['chicken_breast', 142], ['romaine', 94], ['egg', 1], ['blue_cheese', 28], ['ranch', 2]] },
      { name: 'Tuna-avocado lettuce boats', ing: [['tuna', 142], ['mayo', 2], ['avocado', 68], ['lettuce_cup', 2]] },
      { name: 'Greek salad + grilled chicken',
        ing: [['chicken_thigh', 142], ['mixed_greens', 60], ['cucumber', 65],
              noDairy ? ['kalamata', 10] : ['feta', 28], ['olive_oil', 2]] },
      { name: 'Burger bowl, no bun', ing: [['ground_beef', 170], ['avocado', 68], ['lettuce', 94], ['mayo', 1]] },
      { name: 'Shrimp avocado salad', ing: [['shrimp', 170], ['avocado', 68], ['olive_oil', 1], ['mixed_greens', 60]], garnish: 'lime' },
      { name: `${noDairy ? 'Prosciutto &amp; avocado' : 'Caprese'} plate`,
        ing: [['prosciutto', 85], noDairy ? ['avocado', 136] : ['mozzarella', 113], ['olive_oil', 1]], garnish: 'fresh basil' },
      { name: 'Chicken-bacon wrap',
        ing: [['chicken_breast', 113], ['bacon', 2], ['tortilla', 1], noDairy ? ['avocado', 34] : ['ranch', 1]] },
    ],
    dinner: [
      { name: 'Ribeye + garlic-butter asparagus', ing: [['ribeye', 227], ['asparagus', 134], ['butter', 1]] },
      { name: 'Pork chops + sautéed spinach', ing: [['pork_chop', 283], ['spinach', 60], ['olive_oil', 1]], garnish: '2 cloves garlic' },
      { name: `Salmon + ${noDairy ? 'garlic' : 'creamed'} spinach`,
        ing: noDairy
          ? [['salmon_fillet', 170], ['spinach', 60], ['olive_oil', 1]]
          : [['salmon_fillet', 170], ['spinach', 60], ['butter', 1], ['heavy_cream', 2]] },
      { name: 'Roast chicken thighs + broccoli', ing: [['chicken_thigh_skin', 283], ['broccoli', 91], ['olive_oil', 1]] },
      { name: 'Beef stir-fry, zucchini noodles', ing: [['beef_strips', 170], ['zucchini', 200], ['sesame_oil', 1]], garnish: 'ginger · soy sauce' },
      { name: 'Lemon-butter cod + green beans', ing: [['cod', 170], ['green_beans', 100], ['butter', 2]] },
      { name: 'Slow-roast pork shoulder + slaw', ing: [['pork_shoulder', 227], ['coleslaw', 120], ['olive_oil', 1]] },
    ],
    snack: [
      { name: 'Macadamia nuts', ing: [['macadamia', 28]] },
      { name: `Olives &amp; ${noDairy ? 'almonds' : 'cheddar'}`,
        ing: [['olives', 10], noDairy ? ['almond', 28] : ['cheddar', 28]] },
      { name: 'Pecans', ing: [['pecan', 28]] },
      { name: 'Hard-boiled eggs', ing: [['egg', 2]] },
      { name: 'Dark chocolate 90%', ing: [['dark_choc', 2]] },
      { name: 'Almonds', ing: [['almond', 28]] },
      { name: `Berries &amp; ${noDairy ? 'coconut cream' : 'heavy cream'}`,
        ing: [['raspberries', 31], noDairy ? ['coconut_cream', 2] : ['heavy_cream', 2]] },
    ],
  };
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getBudgetDinners(noDairy) {
  void noDairy;
  return [
    { name: 'Ground beef &amp; broccoli bowl', ing: [['ground_beef', 227], ['broccoli', 91], ['butter', 1]] },
    { name: 'Chicken thighs + green beans', ing: [['chicken_thigh_skin', 283], ['green_beans', 100], ['olive_oil', 1]] },
    { name: 'Pork loin + buttered cabbage', ing: [['pork_loin', 170], ['cabbage', 150], ['butter', 2]] },
    { name: 'Salmon patties + spinach', ing: [['canned_salmon', 170], ['egg', 1], ['spinach', 60], ['olive_oil', 1]] },
    { name: 'Roast drumsticks + zucchini', ing: [['chicken_drumstick', 227], ['zucchini', 200], ['butter', 1]] },
    { name: 'Turkey taco bowl, no shell', ing: [['ground_turkey', 170], ['lettuce', 94], ['avocado', 34], ['olive_oil', 1]] },
    { name: 'Slow-roast pork shoulder + slaw', ing: [['pork_shoulder', 227], ['coleslaw', 120], ['olive_oil', 1]] },
  ];
}

/** Lean protein snacks, for when the day is short on protein rather than energy. */
const LEAN_SNACKS = [
  { name: 'Hard-boiled eggs', ing: [['egg', 2]] },
  { name: 'Turkey roll-ups', ing: [['deli_turkey', 85]], garnish: 'mustard' },
  { name: 'Beef jerky', ing: [['jerky', 28]] },
];

/**
 * Build the seven days.
 *
 * Unchanged in shape from before: pick meals by protein density, scale the day to
 * anchor protein, then close the calorie gap with fat and a snack. What changed is
 * that every one of those steps now moves FOOD, and the macros printed on the page
 * are summed from the food afterwards.
 *
 * DAY TOTALS NO LONGER LAND EXACTLY ON TARGET, and that is deliberate. Eggs come in
 * ones and tablespoons in halves, so a day built from measurable quantities lands
 * near the target rather than on it. tests/kd-meal-plan-executable.test.mjs pins
 * how near: KD_DAY_KCAL_TOLERANCE either side, across the whole plausible range.
 * The alternative is what this replaced, which hit the target exactly by printing
 * numbers no plate had to honour.
 */
/** How many snacks a day may carry, and how far one may be scaled. Three
 *  ordinary snacks beat one impossible one. */
const KD_MAX_SNACKS = 5;
const KD_SNACK_MAX_SCALE = 3.0;
/** The fallback when a day needs nothing more. Real ingredients, so it reaches
 *  the grocery list like everything else does. */
const KD_CELERY_SNACK = { name: 'Celery + sea salt', ing: [['celery', 3]] };
const KD_DAY_KCAL_TOLERANCE = 0.12;
const KD_DAY_PROTEIN_TOLERANCE = 0.15;

export function buildMealPlanDays(d) {
  // NO DEFAULTS. `prot` is not decoration here: it filters which meals are eligible
  // (minDensity, below) and scales every portion (protScale). A substituted 113 g
  // would silently reshape a real customer's week.
  requireFacts(d, ['calories', 'proteinG', 'carbG'], 'buildMealPlanDays');
  const cal = d.calories;
  const prot = d.proteinG;
  const budget = d.budget || 'mod';
  const dairyPref = (d.dairy || '').toLowerCase();
  const noDairy = dairyPref.includes('free') || dairyPref.includes('none') || dairyPref.includes('strict');
  const lightDairy = noDairy || dairyPref.includes('light') || dairyPref.includes('little') || dairyPref.includes('bother');
  const db = getMealDatabase(lightDairy);
  const budgetDins = budget === 'tight' ? getBudgetDinners(lightDairy) : null;

  /** A template's macros at scale 1, computed from its own ingredients. */
  const base = (tpl) => kdMaterializeMeal(tpl, 1);

  // 1. Minimum protein density for template filtering
  const minDensity = prot / cal;
  const premiumWords = ['salmon', 'shrimp', 'prosciutto', 'caprese', 'mozzarella', 'ribeye'];
  function filterPool(pool, skipPremium) {
    let filtered = pool;
    if (skipPremium) {
      filtered = pool.filter(m => !premiumWords.some(w => m.name.toLowerCase().includes(w)));
      if (filtered.length < 3) filtered = pool;
    }
    const ranked = filtered.slice().sort((a, b) => (base(b).p / base(b).kcal) - (base(a).p / base(a).kcal));
    const good = ranked.filter(m => (base(m).p / base(m).kcal) >= minDensity * 0.65);
    return good.length >= 4 ? good : ranked.slice(0, Math.max(4, Math.ceil(filtered.length * 0.6)));
  }
  const isTight = budget === 'tight';
  const bPool = filterPool(db.breakfast, isTight);
  const lPool = filterPool(db.lunch, isTight);
  const dPool = filterPool(budgetDins || db.dinner, isTight);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const bT = bPool[i % bPool.length];
    const lT = lPool[i % lPool.length];
    const dT = dPool[i % dPool.length];

    // 2. Scale the FOOD uniformly to anchor protein.
    const baseP = base(bT).p + base(lT).p + base(dT).p;
    const protScale = baseP > 0 ? prot / baseP : 1;
    // THE CEILING IS WHAT THE TOP OF THE RANGE COSTS. At 2.6 the three main
    // meals froze at about 2,990 kcal however high the target went, so a 6,000
    // kcal customer had 3,000 kcal of snacks to find and a page that promised a
    // number the food never reached. 3.5 lets the plates grow instead. They get
    // large, and they are supposed to: this is what 6,000 kcal looks like.
    const clamped = Math.max(0.45, Math.min(3.5, protScale));

    const raw = [
      { slot: 'Dinner', tpl: dT, meal: kdMaterializeMeal(dT, clamped) },
      { slot: 'Breakfast', tpl: bT, meal: kdMaterializeMeal(bT, clamped) },
      { slot: 'Lunch', tpl: lT, meal: kdMaterializeMeal(lT, clamped) },
    ];

    // 3. Close the calorie gap by changing how much fat is in the food, spread
    //    across the day's plates and leaving room for the snack. Expressed as a
    //    quantity, never as an instruction to remove fat that is not there.
    const targetMainKcal = cal * 0.90;
    const gap = targetMainKcal - raw.reduce((a, r) => a + r.meal.kcal, 0);
    const adjusted = kdDistributeFat(raw, gap);
    const mB = { slot: 'Breakfast', ...adjusted.get('Breakfast') };
    const mL = { slot: 'Lunch', ...adjusted.get('Lunch') };
    const mD = { slot: 'Dinner', ...adjusted.get('Dinner') };

    // 4. Snacks as the final buffer, chosen for what the day is actually short of.
    //
    // MORE THAN ONE, because one could not do it. A single snack scaled to close
    // the gap hit its 4.5x ceiling and stopped: a 4,451 kcal customer, which the
    // live calculator produces for a 130 kg athlete, was left 634 kcal short on
    // one day and 1,361 short across the week, under a page that printed
    // "TARGET 4,451 kcal/d" at the top. Scaling one snack further is not the
    // answer either; nine squares of chocolate is not a snack. Two or three
    // ordinary ones are.
    let remainKcal = cal - (mB.kcal + mL.kcal + mD.kcal);
    let remainP = prot - (mB.p + mL.p + mD.p);
    const snacks = [];
    const fatSnacks = db.snack.filter(s => base(s).p <= 3);
    for (let n = 0; n < KD_MAX_SNACKS && (remainKcal > 60 || remainP > 8); n++) {
      let tpl, scale;
      if (remainP > 8) {
        tpl = LEAN_SNACKS[(i + n) % LEAN_SNACKS.length];
        scale = Math.max(0.5, Math.min(KD_SNACK_MAX_SCALE, remainP / Math.max(1, base(tpl).p)));
      } else {
        const pool = fatSnacks.length > 0 ? fatSnacks : db.snack;
        tpl = pool[(i + n) % pool.length];
        scale = Math.max(0.3, Math.min(KD_SNACK_MAX_SCALE, remainKcal / Math.max(1, base(tpl).kcal)));
      }
      const made = kdMaterializeMeal(tpl, scale);
      if (made.kcal <= 0) break;
      snacks.push({ slot: snacks.length === 0 ? 'Snack' : `Snack ${snacks.length + 1}`, ...made });
      remainKcal -= made.kcal;
      remainP -= made.p;
    }
    if (snacks.length === 0) {
      snacks.push({ slot: 'Snack', ...kdMaterializeMeal(KD_CELERY_SNACK, 1) });
    }

    const meals = [mB, mL, mD, ...snacks];
    days.push({
      dayNum: i + 1, dayName: DAY_NAMES[i], meals,
      totKcal: meals.reduce((a, m) => a + m.kcal, 0),
      totF: meals.reduce((a, m) => a + m.f, 0),
      totP: meals.reduce((a, m) => a + m.p, 0),
      totC: meals.reduce((a, m) => a + m.c, 0),
    });
  }
  return days;
}

// ---------------------------------------------------------------------------
// THE GROCERY LIST, DERIVED
// ---------------------------------------------------------------------------
// It used to be two hardcoded lists, one for a tight budget and one for everyone
// else, printed under the heading "Your week's grocery list ... sized for one
// person". It said 12 oz of steak whatever the plan called for, and it did not
// move when the calorie target doubled. A customer at 3,200 kcal was told to buy
// a third of the food their own plan asked them to cook.
//
// It is now summed from the seven days that were actually generated, then rounded
// UP to something a shop sells. Rounding up on purpose: a list that leaves you
// short on Thursday is worse than one that leaves a little in the fridge.

/** Round a total up to a quantity a shop actually sells. */
function kdShoppingQty(key, qty) {
  const ing = KD_ING[key];
  if (ing.buy === 'dozen') {
    const dozens = Math.max(1, Math.ceil(qty / 12));
    return `${qty <= 12 ? '1 dozen' : `${dozens} dozen`}`;
  }
  if (ing.unit === 'each' || ing.unit === 'strip' || ing.unit === 'link') {
    return `${Math.ceil(qty)}`;
  }
  if (ing.unit === 'tbsp') {
    const cups = qty / 16;
    if (cups >= 0.75) return `${kdFmtNumber(Math.ceil(cups * 4) / 4)} cup`;
    return `${Math.ceil(qty)} tbsp`;
  }
  // grams
  if (ing.buy === 'each' && ing.eachG) return `${Math.max(1, Math.ceil(qty / ing.eachG))}`;
  const lb = qty / 453.6;
  if (lb >= 0.75) return `${kdFmtNumber(Math.ceil(lb * 4) / 4)} lb`;
  const oz = qty / 28.35;
  if (oz >= 1) return `${Math.ceil(oz)} oz`;
  return `${Math.ceil(qty / 10) * 10}g`;
}

/** Aggregate every ingredient in the generated week, by aisle. */
function kdBuildGroceryList(days) {
  const totals = new Map();
  for (const day of days) {
    for (const meal of day.meals) {
      for (const [key, qty] of (meal.ing || [])) {
        totals.set(key, (totals.get(key) || 0) + qty);
      }
    }
  }
  const byAisle = { proteins: [], fats: [], produce: [], dairy: [], pantry: [] };
  for (const [key, qty] of totals) {
    const ing = KD_ING[key];
    byAisle[ing.aisle].push([ing.plural || ing.label, kdShoppingQty(key, qty), qty]);
  }
  // Heaviest first, so the list reads like a trolley rather than an index.
  for (const aisle of Object.keys(byAisle)) byAisle[aisle].sort((a, b) => b[2] - a[2]);
  return byAisle;
}


function mealRow(m) {
  return `<div class="meal"><span class="slot">${m.slot}</span><span class="name">${m.name}<small>${m.desc}</small></span><span class="mm"><span class="kc">${m.kcal}</span><span class="fp"><b class="fF">F${m.f}</b> <b class="fP">P${m.p}</b> <b class="fC">C${m.c}</b></span></span></div>`;
}

function dayBlock(day) {
  const dayStr = String(day.dayNum).padStart(2, '0');
  const pctF = Math.round((day.totF * 9) / (day.totKcal || 1) * 100);
  const pctP = Math.round((day.totP * 4) / (day.totKcal || 1) * 100);
  const pctC = 100 - pctF - pctP;
  return `<div class="day avoid-break">
      <div class="day-head">
        <div class="dl"><span class="dn">DAY ${dayStr}</span><span class="dd">${day.dayName}</span></div>
        <div class="dt"><span class="mpill kcal">${fmtNum(day.totKcal)} kcal</span></div>
      </div>
      ${day.meals.map(mealRow).join('\n      ')}
      <div class="daytot">
        <span class="lab">Day total</span>
        <div style="display:flex;align-items:center;gap:12px">
          <div class="stackbar"><i style="background:var(--fat);width:${pctF}%"></i><i style="background:var(--protein);width:${pctP}%"></i><i style="background:var(--carbs);width:${pctC}%"></i></div>
          <span class="mono" style="font-size:11px;color:var(--ink-soft)"><b class="fF">F${day.totF}</b> <b class="fP">P${day.totP}</b> <b class="fC">C${day.totC}</b></span>
        </div>
      </div>
    </div>`;
}

/**
 * The grocery list, summed from the seven days that were actually generated.
 *
 * Takes `days`, not `d`. That change of argument is the fix: the old version took
 * the customer's preferences and printed one of two hardcoded lists, so it could
 * not have reflected the plan even in principle.
 */
function grocerySection(d, days) {
  const budget = d.budget || 'mod';
  const aisles = kdBuildGroceryList(days);

  function listItems(arr) {
    return arr.length
      ? arr.map(([item, qty]) => `<li>${item} <span class="q">${qty}</span></li>`).join('\n          ')
      : '<li>Nothing this week <span class="q">—</span></li>';
  }

  const budgetTip = budget === 'tight'
    ? 'Ground beef for ribeye, chicken thighs over breasts, frozen fish and frozen spinach, and whole blocks of cheese cut down the bill the most — roughly <b>30–40%</b> versus the premium versions above, with identical macros.'
    : 'Buy in bulk where possible. Costco-size proteins and eggs save 30–40% vs grocery store prices, with identical macros.';

  const pantryAndDairy = aisles.dairy.concat(aisles.pantry);

  return `<section class="sec">
      <div class="sec-eyebrow">Shop once</div>
      <div class="sec-title">Your week's grocery list</div>
      <div class="sec-sub">Added up from the seven days above and rounded up to what a shop sells, for one person.${budget === 'tight' ? ' Budget-conscious swaps noted where they save the most.' : ''}</div>
    </section>

    <div class="grocery">
      <div class="gcat">
        <h4>Proteins</h4>
        <ul>
          ${listItems(aisles.proteins)}
        </ul>
      </div>
      <div class="gcat">
        <h4>Fats &amp; oils</h4>
        <ul>
          ${listItems(aisles.fats)}
        </ul>
      </div>
      <div class="gcat">
        <h4>Produce</h4>
        <ul>
          ${listItems(aisles.produce)}
        </ul>
      </div>
      <div class="gcat">
        <h4>${aisles.dairy.length ? 'Dairy &amp; pantry' : 'Pantry'}</h4>
        <ul>
          ${listItems(pantryAndDairy)}
        </ul>
      </div>
    </div>

    <div class="callout" style="margin-top:16px">
      <span class="ct">${budget === 'tight' ? 'Tight-budget swaps' : 'Money-saving tip'}</span>
      ${budgetTip}
    </div>`;
}

function generateSglt2MealPlanReferral(name, d, ctx) {
  const body = `
<div class="page">
  <header class="rep-head">
    ${brandHeader('Personalized Plan')}
    <div class="rh-title-row">
      <div>
        <div class="rh-eyebrow">7-Day Meal Plan</div>
        <h1>We have not built this plan,<br /><span class="lt">and here is exactly why.</span></h1>
      </div>
    </div>
  </header>

  <section class="sec">
    <div class="sec-title"><span class="num">01</span> The short version</div>
    <p>${escHtml(name)}, you told us you take an SGLT2 inhibitor. Every meal in this plan would have
    been chosen and portioned to hold you at a ketogenic carbohydrate and calorie target. Ketogenic
    eating on this class of medication is a recognized trigger for euglycemic diabetic ketoacidosis,
    and the reason that matters here is that blood glucose can read normal while it is happening, so
    a home glucose meter would not warn you. Whether those targets are appropriate for you, and what
    monitoring would need to be in place first, is a clinical judgment. This is an automated
    questionnaire. It has never seen your labs and there is no clinician in the loop.</p>

    <p>So we have not set you ketogenic targets, and we have not built you a week of meals sized to
    them. <b>We have also not quietly given you a gentler, higher-carb week instead.</b> That would
    be the same clinical decision made more quietly, and it is not ours to make.</p>

    <div class="callout warn" style="margin-top:16px">
      <span class="ct">Your money back, no conversation required</span>
      You paid for a meal plan and this is not one. Reply to your receipt, or email
      <b>ketodial@carnivoreweekly.com</b>, and we will refund the meal plan. You do not have to
      explain yourself and nothing else in your order is affected.
    </div>
  </section>

  <section class="sec">
    <div class="sec-title"><span class="num">02</span> What to ask for instead</div>
    <p>The person you want is the clinician who prescribes your SGLT2 inhibitor. Take this report
    with you. Worth asking them:</p>
    <ul>
      <li>Is a low-carbohydrate or ketogenic way of eating reasonable for me at all while I am on this medication?</li>
      <li>If it is, what carbohydrate level would you be comfortable with, and how gradually should I get there?</li>
      <li>What should be checked before I change how I eat, and what should be rechecked afterward?</li>
      <li>Since euglycemic ketoacidosis can happen with normal glucose readings, what symptoms should make me call you, and would ketone testing be useful for me?</li>
      <li>Does anything else change the answer, such as my other medications, illness, a planned procedure, or alcohol?</li>
    </ul>
    <p><b>Do not start, stop or change any medication or supplement on your own</b>, and that
    includes over-the-counter salt, potassium and magnesium products.</p>
  </section>

  <section class="sec">
    <div class="sec-title"><span class="num">03</span> What you did tell us</div>
    <p>So the person you take this to does not have to start from nothing:</p>
    <table class="dtable">
      <thead><tr><th>You reported</th><th>Details</th></tr></thead>
      <tbody>
        <tr><td><b>Conditions</b></td><td>${escHtml(ctx.declaredConditionLabels.join(', ') || 'None reported')}</td></tr>
        <tr><td><b>Medications</b></td><td>${escHtml(ctx.medsText)}</td></tr>
      </tbody>
    </table>
    <p style="font-size:11px;color:var(--ink-faint);margin-top:8px">Self-reported into an online
    questionnaire and not verified. Please confirm against your own record.</p>
  </section>

  ${pageFooter(
    `KetoDial 7-Day Meal Plan <span class="dot">·</span> ${escHtml(name)}`,
    'Not medical advice — take this to the clinician who prescribes your medication', 1, 1)}
</div>`;

  return htmlShell('7-Day Meal Plan', MEAL_CSS, body);
}

function generateRenalMealPlanReferral(name, d, ctx) {
  const body = `
<div class="page">
  <header class="rep-head">
    ${brandHeader('Personalized Plan')}
    <div class="rh-title-row">
      <div>
        <div class="rh-eyebrow">7-Day Meal Plan</div>
        <h1>We have not built this plan,<br /><span class="lt">and here is exactly why.</span></h1>
      </div>
    </div>
  </header>

  <section class="sec">
    <div class="sec-title"><span class="num">01</span> The short version</div>
    <p>${escHtml(name)}, ${ctx.kidneyUnsureOnly
      ? 'you told us you were not sure whether your kidney function is reduced'
      : 'you told us about kidney disease'}. Every meal in this plan would have
    been chosen and portioned to hit a daily protein target. Deciding what that target should
    be for someone with reduced kidney function is a clinical judgement — it depends on your
    kidney function, on whether you are being treated and how, on your nutritional status, and
    on your clinician's assessment of all three. This is an automated questionnaire. It has
    never seen your labs and there is no clinician in the loop.</p>

    <p>So we have not set you a protein target, and we have not built you a week of meals sized
    to one. <b>We have also not quietly given you a lower number instead.</b> Choosing a smaller
    figure would be the same clinical decision made more quietly, and it is not ours to make.</p>

    <div class="callout warn" style="margin-top:16px">
      <span class="ct">Your money back, no conversation required</span>
      You paid for a meal plan and this is not one. Reply to your receipt, or email
      <b>ketodial@carnivoreweekly.com</b>, and we will refund the meal plan. You do not have to
      explain yourself and nothing else in your order is affected.
    </div>
  </section>

  <section class="sec">
    <div class="sec-title"><span class="num">02</span> What to ask for instead</div>
    <p>The person you want is a <b>renal dietitian</b> — a dietitian who specialises in kidney
    disease. Your kidney clinician can refer you, and in many places you can self-refer. Worth
    asking them:</p>
    <ul>
      <li>How much protein should I be eating each day, given my current kidney function?</li>
      <li>Is a low-carbohydrate or ketogenic pattern reasonable for me at all right now?</li>
      <li>Which of my usual foods should I be eating less of, and which are fine?</li>
      <li>Should anything be rechecked after a few weeks if I do change how I eat?</li>
      <li>What should I watch for at home, and what should make me call you?</li>
    </ul>
    <p><b>Do not start, stop or change any medication or supplement on your own</b>, and that
    includes over-the-counter salt, potassium and magnesium products.</p>
  </section>

  <section class="sec">
    <div class="sec-title"><span class="num">03</span> What you did tell us</div>
    <p>So the person you take this to does not have to start from nothing:</p>
    <table class="dtable">
      <thead><tr><th>You reported</th><th>Details</th></tr></thead>
      <tbody>
        <tr><td><b>Conditions</b></td><td>${escHtml(ctx.declaredConditionLabels.join(', ') || 'None reported')}</td></tr>
        <tr><td><b>Kidney safety check</b></td><td>${ctx.kidneyUnsureOnly
          ? 'Answered &ldquo;I am not sure&rdquo; &mdash; not a reported diagnosis'
          : 'Reported reduced kidney function or kidney disease'}</td></tr>
        <tr><td><b>Medications</b></td><td>${escHtml(ctx.medsText)}</td></tr>
      </tbody>
    </table>
    <p style="font-size:11px;color:var(--ink-faint);margin-top:8px">Self-reported into an online
    questionnaire and not verified. Please confirm against your own record.</p>
  </section>

  ${pageFooter(
    `KetoDial 7-Day Meal Plan <span class="dot">·</span> ${escHtml(name)}`,
    'Not medical advice — take this to your kidney clinician or a renal dietitian', 1, 1)}
</div>`;

  return htmlShell('7-Day Meal Plan', MEAL_CSS, body);
}

export function generateMealPlan(name, d) {
  // NO DEFAULTS: the portions on every page of this document are computed from
  // these four numbers. See generateDoctorReport for why the `|| 1800` idiom is gone.
  requireFacts(d, ['calories', 'fatG', 'proteinG', 'carbG', 'kidneyStatus'], 'generateMealPlan');
  // The renal referral restates what the customer declared, so it has the same
  // "None reported" hazard as the Doctor's Report.
  requireDeclaredAnswers(d, ['conditions', 'meds'], 'generateMealPlan');

  // THE SHARED BOUNDARY, consulted before a single portion is sized.
  const ctx = deriveKdMedicalContext(d);
  if (ctx.restrictProteinTarget) {
    // buildMealPlanDays() anchors on protein twice — `minDensity = prot / cal` picks
    // which meals are eligible and `protScale = prot / baseP` scales every portion.
    // So for a reader who declared kidney disease there is no version of this plan
    // that is not an individualised protein prescription with pictures. Returning
    // the plan with the number blanked would leave the food doing the prescribing.
    // The plan is therefore not generated. This is a real product consequence and it
    // is flagged for Brew in docs/project-log/decisions.md, not hidden here.
    return generateRenalMealPlanReferral(name, d, ctx);
  }
  if (ctx.restrictKetogenicProtocol) {
    // Every meal below is chosen and portioned to hold a ketogenic calorie and
    // carbohydrate target. For a reader on an SGLT2 inhibitor that target is the
    // hazard, so there is no version of this week that is not the recommendation we
    // have just declined to make. Checked AFTER the renal gate so a reader who is
    // both keeps the referral naming the condition they actually reported first.
    return generateSglt2MealPlanReferral(name, d, ctx);
  }

  const cal = d.calories;
  const fat = d.fatG;
  const prot = d.proteinG;
  const carb = d.carbG;
  const budget = d.budget || 'mod';
  const dairyPrefMP = (d.dairy || '').toLowerCase();
  const noDairyMP = dairyPrefMP.includes('free') || dairyPrefMP.includes('none') || dairyPrefMP.includes('strict');
  const lightDairyMP = noDairyMP || dairyPrefMP.includes('light') || dairyPrefMP.includes('little') || dairyPrefMP.includes('bother');
  const prepTime = d.prepTime || '30 min';

  const days = buildMealPlanDays(d);

  const budgetLabel = budget === 'tight' ? 'Tight' : budget === 'generous' ? 'Generous' : 'Moderate';
  const dairyLabel = noDairyMP ? 'dairy-free' : lightDairyMP ? 'dairy-light' : 'dairy-included';

  const footLeft = `KetoDial 7-Day Meal Plan <span class="dot">·</span> ${escHtml(name)}`;
  const footCenter = 'Macros are estimates based on USDA data — adjust portions based on your labels and clinician guidance';

  // Week at a glance
  const weekGlance = days.map(day =>
    `<div class="wg"><div class="d">${day.dayName.slice(0, 3)}</div><div class="n">${day.dayNum}</div><div class="k">${fmtNum(day.totKcal)}</div></div>`
  ).join('\n      ');

  // Page 1: header + targets + week glance + days 1-2
  // Page 2: days 3-5
  // Page 3: days 6-7 + prep tip
  // Page 4: grocery list

  const body = `
<!-- ============ PAGE 1 ============ -->
<div class="page">
  <header class="rep-head">
    ${brandHeader('Personalized Plan')}
    <div class="rh-title-row">
      <div>
        <div class="rh-eyebrow">7-Day Meal Plan</div>
        <h1>A week of keto,<br /><span class="lt">built around your macros.</span></h1>
      </div>
      <div class="rh-meta">
        <div class="row">FOR <b>${escHtml(name)}</b></div>
        <div class="row">TARGET <b>${fmtNum(cal)} kcal/d</b></div>
        <div class="row">BUDGET <b>${budgetLabel} · ${dairyLabel}</b></div>
      </div>
    </div>
    <div class="rh-prepared">Tuned to your target, your cooking time (~${escHtml(prepTime.replace(/\/day$/i, ''))}/day) and a ${dairyLabel} preference. Swap any meal for another at the same macro count.</div>
  </header>

  <div class="rep-body">
    <div class="targets">
      <span class="tl">Daily targets</span>
      <span class="mpill kcal">${fmtNum(cal)} kcal</span>
      <span class="mpill"><span class="d" style="background:var(--fat)"></span>Fat ${fat}g</span>
      <span class="mpill"><span class="d" style="background:var(--protein)"></span>Protein ${prot}g</span>
      <span class="mpill"><span class="d" style="background:var(--carbs)"></span>Net carbs ${carb}g</span>
      <span style="margin-left:auto;font-size:12px;color:var(--ink-soft)">Designed around your weekly target, with lighter and heavier days for variety.</span>
    </div>

    ${kdHypoglycemiaCallout(ctx)}

    <div class="week-glance">
      ${weekGlance}
    </div>

    <!-- DAY 1 -->
    ${dayBlock(days[0])}

    <!-- DAY 2 -->
    ${dayBlock(days[1])}

  </div>

  ${pageFooter(footLeft, footCenter, 1, 4)}
</div>

<!-- ============ PAGE 2 ============ -->
<div class="page">
  <div class="rep-body tight">
    <!-- DAY 3 -->
    ${dayBlock(days[2])}
    <!-- DAY 4 -->
    ${dayBlock(days[3])}
    <!-- DAY 5 -->
    ${dayBlock(days[4])}
  </div>
  ${pageFooter(footLeft, footCenter, 2, 4)}
</div>

<!-- ============ PAGE 3 ============ -->
<div class="page">
  <div class="rep-body tight">
    <!-- DAY 6 -->
    ${dayBlock(days[5])}
    <!-- DAY 7 -->
    ${dayBlock(days[6])}

    <div class="callout" style="margin-top:6px">
      <span class="ct">Batch-prep shortcut for your ~${escHtml(prepTime.replace(/\/day$/i, ''))}/day</span>
      Sunday: hard-boil 6 eggs, roast the chicken thighs and pork shoulder, and pre-portion nuts into ¼-cup bags. That covers most lunches and snacks for the first half of the week.
    </div>
  </div>
  ${pageFooter(footLeft, footCenter, 3, 4)}
</div>

<!-- ============ PAGE 4 — GROCERY ============ -->
<div class="page">
  <div class="rep-body tight">
    ${grocerySection(d, days)}
  </div>
  ${pageFooter(footLeft, '<a href="https://ketodial.com">ketodial.com</a>', 4, 4)}
</div>`;

  return htmlShell('7-Day Meal Plan', MEAL_CSS, body);
}


// ═══════════════════════════════════════════════════
// KETO STARTER KIT
// ═══════════════════════════════════════════════════

const STARTER_CSS = `
  .lede{font-family:var(--serif);font-size:18px;line-height:1.5;color:var(--ink-soft);margin-bottom:24px}
  .lede b{color:var(--ink);font-weight:500}
  .timeline{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .tcard{border:1px solid var(--line);border-radius:14px;overflow:hidden}
  .tcard .th{padding:12px 16px;color:#fff;display:flex;align-items:center;justify-content:space-between}
  .tcard .th .ph{font-family:var(--mono);font-size:10px;letter-spacing:.1em;opacity:.85}
  .tcard .th .dy{font-family:var(--mono);font-size:13px;font-weight:700}
  .tcard .tb{padding:14px 16px}
  .tcard h4{font-size:14px;font-weight:700;margin-bottom:7px}
  .tcard p{font-size:12.5px;color:var(--ink-soft);line-height:1.5}
  .ph1{background:#0f2236}.ph2{background:var(--amber)}.ph3{background:var(--green)}
  .elyte{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .ecard{border:1px solid var(--line);border-radius:14px;padding:16px;position:relative;background:#fafcfe}
  .ecard .sym{font-family:var(--mono);font-size:22px;font-weight:700;color:var(--accent-deep);letter-spacing:-.02em}
  .ecard .nm{font-size:14px;font-weight:700;margin:2px 0 10px}
  .ecard .target{font-family:var(--mono);font-size:12px;color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:7px;padding:5px 9px;display:inline-block;margin-bottom:10px}
  .ecard .src{font-size:12px;color:var(--ink-soft);line-height:1.5}
  .cheat-legend{display:flex;gap:18px;margin-bottom:16px;flex-wrap:wrap}
  .cheat-legend .lg{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-soft)}
  .cheat-legend .sw{width:13px;height:13px;border-radius:4px}
  .cheat{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
  .col h4{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:10px;padding:8px 11px;border-radius:8px}
  .col.g h4{background:rgba(22,163,74,.1);color:var(--green)}
  .col.a h4{background:rgba(217,119,6,.12);color:var(--amber)}
  .col.r h4{background:rgba(220,38,38,.1);color:var(--red)}
  .food{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 11px;border-bottom:1px solid var(--line-soft);font-size:12.5px}
  .food .fn{color:var(--ink)}
  .food .fc{font-family:var(--mono);font-size:11px;font-weight:600}
  .col.g .fc{color:var(--green)}.col.a .fc{color:var(--amber)}.col.r .fc{color:var(--red)}
  .food .sv{font-size:9.5px;color:var(--ink-faint);font-family:var(--mono)}
  .supp-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
`;

export function generateStarterKit(name, d) {
  // NO DEFAULTS, for the same reason as the other two generators.
  requireFacts(d, ['carbG', 'kidneyStatus'], 'generateStarterKit');
  requireDeclaredAnswers(d, ['conditions', 'meds'], 'generateStarterKit');
  const carb = d.carbG;
  const ctx = deriveKdMedicalContext(d);
  // `restricted` decides whether this document is allowed to print a quantitative
  // electrolyte protocol. Every quantity on page 2, plus the sodium/fluid
  // instructions scattered through pages 1 and 4, hang off it.
  const restricted = ctx.restrictElectrolyteProtocol;
  // The carb ceiling on page 1 and the cheat sheet that serves it are the
  // ketogenic prescription in another form, so a declared SGLT2 inhibitor empties
  // them here too. The rest of the kit, what to expect and what to watch for,
  // still belongs to this reader and is not withheld.
  const ketoWithheld = ctx.restrictKetogenicProtocol;
  const meds = ctx.hasDeclaredMedication ? ctx.medsText : '';
  const conditions = ctx.declaredConditionSlugs;
  const symptoms = (d.symptoms || []).filter(s => s !== 'none');

  // Build watch-outs from customer data
  const watchOuts = [];
  if (conditions.includes('t2d')) watchOuts.push({title: 'Blood sugar may drop fast', detail: 'Carb restriction can lower blood glucose quickly. If you take diabetes medication, monitor closely and talk to your doctor about dose adjustments in the first 2 weeks.'});
  if (conditions.includes('bp')) watchOuts.push({title: 'Blood pressure may shift', detail: 'Sodium and fluid changes during keto can affect blood pressure. If you take blood pressure medication, ask your prescriber how often to check it and what reading should make you call them.'});
  if (conditions.includes('kidney')) watchOuts.push({title: 'Your kidney team sets your electrolytes, not this kit', detail: 'You reported kidney disease. Sodium, potassium and fluid intake are decisions your kidney clinician or a renal dietitian makes with your labs in front of them. This kit does not set them for you.'});
  if (conditions.includes('heart')) watchOuts.push({title: 'Your cardiology team sets your electrolytes, not this kit', detail: 'You reported a heart condition. Sodium and fluid intake affect blood pressure and heart rhythm directly, so the amounts are a decision for the clinician who manages your heart, not for an automated report.'});
  if (conditions.includes('chol')) watchOuts.push({title: 'Cholesterol numbers will change', detail: 'LDL may temporarily rise while triglycerides typically drop and HDL rises. Get an advanced lipid panel at 3 months, not a standard one.'});
  if (meds) watchOuts.push({title: 'Your medications need attention', detail: `You reported taking ${escHtml(meds)}. Some medications interact with carbohydrate restriction, and several very common ones act directly on sodium, potassium and fluid balance. Review your plan with your doctor or pharmacist before starting. Do not change, stop or re-time any medication because of anything in here.`});
  if (symptoms.includes('energy')) watchOuts.push({title: 'Low energy will get worse before better', detail: restricted
    ? 'Days 3-5 are the hardest for energy. Electrolytes are usually the reason, but because of what you told us this kit does not set yours - ask your prescriber what your sodium, potassium and fluid intake should be. If you feel faint, confused or short of breath, call your doctor rather than treating it yourself.'
    : 'Days 3-5 are the hardest for energy. This is normal adaptation, not failure. Electrolytes (page 2) are your fix.'});
  if (symptoms.includes('sleep')) watchOuts.push({title: 'Sleep may be disrupted temporarily', detail: 'Some people experience lighter sleep in week 1. Extra magnesium at bedtime helps. It resolves by week 2 for most.'});
  if (symptoms.includes('crave')) watchOuts.push({title: 'Cravings will peak around day 3-4', detail: 'Sugar cravings are real withdrawal. They pass. Eating enough fat and staying full is the strategy, not willpower.'});
  const topWatchOuts = watchOuts.slice(0, 3);

  // The old `medWarning` lived here: a keyword list (`lisinopril`, `ace`, `arb`,
  // `metformin`, `insulin`) that chose which caution to print UNDERNEATH the
  // sodium and potassium targets, which printed regardless. It is deleted, not
  // moved. A keyword list must never be the thing that decides whether it is safe
  // to print a number, and this one failed open on every brand name it did not
  // know. What replaces it is `restricted` above, which removes the numbers.

  const firstName = name.split(' ')[0] || name;

  const footLeft = `KetoDial Starter Kit <span class="dot">·</span> ${escHtml(name)}`;

  const body = `
<!-- ============ PAGE 1 ============ -->
<div class="page">
  <header class="rep-head">
    ${brandHeader('First 14 Days')}
    <div class="rh-title-row">
      <div>
        <div class="rh-eyebrow">Keto Starter Kit</div>
        <h1>Your first two weeks,<br /><span class="lt">dialed in.</span></h1>
      </div>
      <div class="rh-meta">
        <div class="row">FOR <b>${escHtml(name)}</b></div>
        <div class="row">TARGET <b>${ketoWithheld ? 'Set by your clinician' : `${carb}g net carbs`}</b></div>
        <div class="row">START <b>Day 1, today</b></div>
      </div>
    </div>
    <div class="rh-prepared">Everything you need to get into ketosis comfortably — what to expect, how to dodge the keto flu, and a cheat sheet you can stick on the fridge.</div>
  </header>

  <div class="rep-body">
    <p class="lede">The first two weeks are the whole game. Your body is switching from running on sugar to running on fat — and <b>most people who quit keto quit in week one</b>, almost always for reasons that are completely preventable. Here's your map.</p>

    <section class="sec">
      <div class="sec-eyebrow">What to expect</div>
      <div class="sec-title"><span class="num">01</span> The 14-day adaptation curve</div>
      <div class="timeline">
        <div class="tcard avoid-break">
          <div class="th ph1"><span class="dy">DAYS 1–3</span><span class="ph">Switching over</span></div>
          <div class="tb">
            <h4>Burning through stored sugar</h4>
            <p>Your glycogen empties and you shed water weight fast — often 2–4 lb. The scale flatters you now; that's water, not fat.${restricted ? ` Ask your doctor how much you should be drinking.` : ` Drink more than feels normal.`}</p>
          </div>
        </div>
        <div class="tcard avoid-break">
          <div class="th ph2"><span class="dy">DAYS 4–7</span><span class="ph">The flu window</span></div>
          <div class="tb">
            <h4>Where it can get rough</h4>
            <p>Headaches, fatigue, or irritability can show up. This is the "keto flu" — and it's an <b>electrolyte</b> problem, not a sign keto is failing you. ${restricted ? `Page 2 explains why your electrolyte amounts have to come from your doctor rather than from this kit.` : `Page 2 prevents it.`}</p>
          </div>
        </div>
        <div class="tcard avoid-break">
          <div class="th ph3"><span class="dy">DAYS 8–14</span><span class="ph">Fat-adapted</span></div>
          <div class="tb">
            <h4>The lights come back on</h4>
            <p>Energy stabilizes, cravings fade, and hunger quiets down. Many people report the clearest focus they've had in years right around here.</p>
          </div>
        </div>
      </div>
    </section>

    ${kdHypoglycemiaCallout(ctx)}

    <section class="sec avoid-break">
      <div class="sec-eyebrow">The golden rule</div>
      <div class="sec-title"><span class="num">02</span> ${ketoWithheld ? 'Your carb number is not in this kit' : 'Stay under your carb ceiling'}</div>
      ${ketoWithheld
        // The carb ceiling IS the ketogenic prescription. Printing it here while the
        // Doctor's Report withholds it would be the same number arriving through a
        // second door, which is exactly how the renal protein target used to survive
        // its own suppression inside the meal plan.
        ? kdKetogenicSuppressionNote(ctx)
        : `<div class="callout">
        <span class="ct">Your number is ${carb}g net carbs per day</span>
        Net carbs = total carbs − fiber − sugar alcohols. Stay under this and ketosis takes care of itself. The cheat sheet on page 3 shows exactly which foods fit — keep it somewhere you'll see it.
      </div>`}
    </section>

    ${topWatchOuts.length > 0 ? `<section class="sec avoid-break">
      <div class="sec-eyebrow">Personalized for you</div>
      <div class="sec-title">Your first 3 watch-outs</div>
      ${topWatchOuts.map(w => `<div class="callout" style="margin-bottom:10px">
        <span class="ct">${escHtml(w.title)}</span>
        ${w.detail}
      </div>`).join('\n      ')}
    </section>` : ''}
  </div>

  ${pageFooter(footLeft, 'Educational — not medical advice', 1, 4)}
</div>

<!-- ============ PAGE 2 — KETO FLU / ELECTROLYTES / SUPPLEMENTS ============ -->
<div class="page">
  <div class="rep-body tight">
    ${restricted ? `<section class="sec">
      <div class="sec-eyebrow">Electrolytes</div>
      <div class="sec-title"><span class="num">03</span> Your amounts have to come from your doctor</div>
      <div class="callout warn">
        <span class="ct">This kit does not set sodium, potassium, fluid or supplement amounts for you</span>
        You told us about <b>${escHtml(ctx.restrictionReason)}</b>. Sodium, potassium, fluid and
        electrolyte supplements act directly on blood pressure, heart rhythm and kidney function, and
        several of the most commonly prescribed medications there are change how your body handles all
        of them. This kit was generated from a questionnaire. It has not seen your labs, it does not
        know your kidney function, and it is not a clinician — so it is not the right thing to be
        setting those amounts.
      </div>
      <div class="callout" style="margin-top:12px">
        <span class="ct">What to do instead</span>
        <b>Ask the clinician who manages your condition or your prescription what your sodium,
        potassium and fluid intake should be</b>, and what supplements, if any, are appropriate for
        you. Your Doctor's Report is written for exactly that conversation — print it and take it
        with you. Do not change, stop or re-time any medication because of anything in this kit.
      </div>
      <div class="callout" style="margin-top:12px">
        <span class="ct">If you feel unwell in the first two weeks</span>
        Light-headedness, unusual weakness, confusion, breathlessness, swelling or a racing or
        irregular heartbeat are reasons to <b>contact your doctor</b>, or to seek urgent care if they
        are severe. <b>Do not treat any of it with salt, lite salt or an electrolyte supplement.</b>
        Those symptoms have causes that salt makes worse, and telling them apart needs someone who can
        examine you.
      </div>
    </section>

    <section class="sec">
      <div class="sec-eyebrow">What still applies to you</div>
      <div class="sec-title"><span class="num">04</span> The rest of this kit is unchanged</div>
      <div class="sec-sub">Only the electrolyte and supplement amounts were withheld. The adaptation
      timeline, your carb ceiling, the net-carb cheat sheet on page 3 and the shopping list on page 4
      are all still yours to use, and nothing about them depends on the numbers we left out.</div>
    </section>` : `<section class="sec">
      <div class="sec-eyebrow">Keto-flu prevention</div>
      <div class="sec-title"><span class="num">03</span> The three minerals that decide your week</div>
      <div class="sec-sub">As insulin drops, your kidneys flush sodium — and potassium and magnesium follow. Replace all three from day one and the keto flu mostly disappears before it starts.</div>
      <div class="elyte">
        <div class="ecard avoid-break">
          <div class="sym">Na</div>
          <div class="nm">Sodium</div>
          <div class="target">3,000–5,000 mg/day</div>
          <div class="src">Salt your food generously, sip broth daily, add a pinch to water. This is the single biggest lever.</div>
        </div>
        <div class="ecard avoid-break">
          <div class="sym">K</div>
          <div class="nm">Potassium</div>
          <div class="target">2,600 mg/day women, 3,400 men</div>
          <div class="src">The 2019 National Academies adequate intakes, not ceilings. Food first: avocado, leafy greens, salmon, mushrooms, and meat carries more than most people expect. This kit does not give potassium-chloride ("lite salt") dosing.</div>
        </div>
        <div class="ecard avoid-break">
          <div class="sym">Mg</div>
          <div class="nm">Magnesium</div>
          <div class="target">300–400 mg/day</div>
          <div class="src">Hardest to get from food. A glycinate or citrate supplement at night also helps sleep and cramps.</div>
        </div>
      </div>
      <div class="callout" style="margin-top:14px">
        <span class="ct">These are general figures, not targets set for you</span>
        You did not tell us about any medication or any heart, kidney or blood-pressure condition, so
        these are written for someone in that situation. If any of that changes, or you are being
        treated for something you did not mention, <b>these figures stop applying to you and become a
        question for your doctor.</b>
      </div>
    </section>

    <section class="sec">
      <div class="sec-eyebrow">Optional support</div>
      <div class="sec-title"><span class="num">04</span> Supplements worth considering</div>
      <table class="dtable zebra">
        <thead><tr><th style="width:28%">Supplement</th><th>Why</th><th style="width:24%">Typical dose</th></tr></thead>
        <tbody>
          <tr><td><b>Magnesium glycinate</b></td><td>Prevents cramps and restless sleep during adaptation.</td><td class="mono">200–400 mg PM</td></tr>
          <tr><td><b>Electrolyte powder</b><br /><span style="font-size:11px;color:var(--ink-faint)">no sugar</span></td><td>Easiest way to hit sodium daily. Check the label: many are underdosed.</td><td class="mono">1 serving/day</td></tr>
          <tr><td><b>Omega-3 (fish oil)</b></td><td>Balances the higher fat intake; supports heart health.</td><td class="mono">1–2 g EPA/DHA</td></tr>
          <tr><td><b>Vitamin D3 + K2</b></td><td>Common baseline deficiency; K2 directs calcium.</td><td class="mono">2,000 IU D3</td></tr>
        </tbody>
      </table>
    </section>`}
  </div>
  ${pageFooter(footLeft, 'Educational — not medical advice', 2, 4)}
</div>

<!-- ============ PAGE 3 — NET CARB CHEAT SHEET ============ -->
<div class="page">
  <header class="rep-head" style="padding-top:0.4in;padding-bottom:0.4in">
    <div class="rh-top" style="margin-bottom:14px">
      <div class="rh-brand">
        ${BRAND_SVG}
        <span class="word">Keto<b>Dial</b></span>
      </div>
      <span class="rh-tag">Fridge-ready</span>
    </div>
    <div class="rh-eyebrow">The Net-Carb Cheat Sheet</div>
    <h1 style="font-size:27px">Eat freely · go easy · save for treats</h1>
  </header>
  <div class="rep-body tight">
    <div class="cheat-legend">
      <div class="lg"><span class="sw" style="background:var(--green)"></span><b style="color:var(--ink)">Green</b> — eat freely, under ~3g</div>
      <div class="lg"><span class="sw" style="background:var(--amber)"></span><b style="color:var(--ink)">Amber</b> — portion-aware</div>
      <div class="lg"><span class="sw" style="background:var(--red)"></span><b style="color:var(--ink)">Red</b> — saves your day's carbs fast</div>
      <span style="margin-left:auto;font-family:var(--mono);font-size:10px;color:var(--ink-faint)">net carbs per serving</span>
    </div>

    <div class="cheat">
      <div class="col g">
        <h4>Eat freely</h4>
        <div class="food"><span class="fn">Leafy greens</span><span><span class="sv">2 cups</span> <span class="fc">1g</span></span></div>
        <div class="food"><span class="fn">Eggs</span><span><span class="sv">each</span> <span class="fc">0.4g</span></span></div>
        <div class="food"><span class="fn">Avocado</span><span><span class="sv">½</span> <span class="fc">1g</span></span></div>
        <div class="food"><span class="fn">Ribeye / beef</span><span><span class="sv">6 oz</span> <span class="fc">0g</span></span></div>
        <div class="food"><span class="fn">Salmon</span><span><span class="sv">6 oz</span> <span class="fc">0g</span></span></div>
        <div class="food"><span class="fn">Olive oil / butter</span><span><span class="sv">1 tbsp</span> <span class="fc">0g</span></span></div>
        <div class="food"><span class="fn">Cheddar</span><span><span class="sv">1 oz</span> <span class="fc">0.5g</span></span></div>
        <div class="food"><span class="fn">Cucumber</span><span><span class="sv">1 cup</span> <span class="fc">2g</span></span></div>
        <div class="food"><span class="fn">Zucchini</span><span><span class="sv">1 cup</span> <span class="fc">3g</span></span></div>
      </div>
      <div class="col a">
        <h4>Portion-aware</h4>
        <div class="food"><span class="fn">Raspberries</span><span><span class="sv">½ cup</span> <span class="fc">3g</span></span></div>
        <div class="food"><span class="fn">Almonds</span><span><span class="sv">1 oz</span> <span class="fc">3g</span></span></div>
        <div class="food"><span class="fn">Bell pepper</span><span><span class="sv">1 cup</span> <span class="fc">4g</span></span></div>
        <div class="food"><span class="fn">Tomato</span><span><span class="sv">medium</span> <span class="fc">3g</span></span></div>
        <div class="food"><span class="fn">Greek yogurt</span><span><span class="sv">½ cup</span> <span class="fc">4g</span></span></div>
        <div class="food"><span class="fn">Broccoli</span><span><span class="sv">1 cup</span> <span class="fc">4g</span></span></div>
        <div class="food"><span class="fn">Dark choc 90%</span><span><span class="sv">2 sq</span> <span class="fc">4g</span></span></div>
        <div class="food"><span class="fn">Onion</span><span><span class="sv">¼ cup</span> <span class="fc">3g</span></span></div>
        <div class="food"><span class="fn">Blueberries</span><span><span class="sv">¼ cup</span> <span class="fc">4g</span></span></div>
      </div>
      <div class="col r">
        <h4>Save for treats</h4>
        <div class="food"><span class="fn">Bread</span><span><span class="sv">1 slice</span> <span class="fc">13g</span></span></div>
        <div class="food"><span class="fn">Rice, cooked</span><span><span class="sv">1 cup</span> <span class="fc">45g</span></span></div>
        <div class="food"><span class="fn">Pasta, cooked</span><span><span class="sv">1 cup</span> <span class="fc">43g</span></span></div>
        <div class="food"><span class="fn">Potato</span><span><span class="sv">medium</span> <span class="fc">33g</span></span></div>
        <div class="food"><span class="fn">Banana</span><span><span class="sv">each</span> <span class="fc">24g</span></span></div>
        <div class="food"><span class="fn">Oats, cooked</span><span><span class="sv">1 cup</span> <span class="fc">24g</span></span></div>
        <div class="food"><span class="fn">Apple</span><span><span class="sv">each</span> <span class="fc">21g</span></span></div>
        <div class="food"><span class="fn">Beans</span><span><span class="sv">½ cup</span> <span class="fc">18g</span></span></div>
        <div class="food"><span class="fn">Soda / juice</span><span><span class="sv">12 oz</span> <span class="fc">39g</span></span></div>
      </div>
    </div>

    <div class="callout" style="margin-top:18px">
      <span class="ct">How to read it</span>
      ${ketoWithheld
        ? 'This page is a guide to which foods are low in carbohydrate, not a daily ceiling. Your ceiling is the number we have not set for you, so treat the green column as the safer end of the range and take the question of where your line sits to the clinician who prescribes your medication.'
        : `Your daily ceiling is <b>${carb}g net carbs</b>. A whole day of green-column eating barely touches it — that's the point. One slice of bread or half a banana spends most of your day in a single bite, which is why the red column is "treats," not "never."`}
    </div>
  </div>
  ${pageFooter(`KetoDial Net-Carb Cheat Sheet <span class="dot">·</span> ${escHtml(name)}`, 'Values are typical per-serving estimates', 3, 4)}
</div>

<!-- ============ PAGE 4 — GROCERY STARTER + FIRST WEEK ============ -->
<div class="page">
  <div class="rep-body tight">
    <section class="sec">
      <div class="sec-eyebrow">Stock the kitchen</div>
      <div class="sec-title"><span class="num">05</span> Your starter shopping list</div>
      <div class="sec-sub">Buy these once and you can make a keto meal out of almost nothing for two weeks.</div>
      <div class="supp-grid">
        <div class="gcat" style="border:1px solid var(--line);border-radius:12px;padding:14px 16px">
          <h4 style="font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-deep);margin-bottom:10px;padding-bottom:7px;border-bottom:1.5px solid var(--line)">Fridge &amp; freezer</h4>
          <ul style="list-style:none">
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>Eggs, butter, heavy cream</li>
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>Ground beef, chicken thighs, bacon</li>
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>Frozen salmon &amp; spinach</li>
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>Leafy greens, avocados, cucumber</li>
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>Cheese block, olives</li>
          </ul>
        </div>
        <div class="gcat" style="border:1px solid var(--line);border-radius:12px;padding:14px 16px">
          <h4 style="font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent-deep);margin-bottom:10px;padding-bottom:7px;border-bottom:1.5px solid var(--line)">Pantry &amp; support</h4>
          <ul style="list-style:none">
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>Olive oil${restricted ? `` : `, sea salt, "lite salt"`}</li>
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>Olive-oil mayo, mustard, vinegar</li>
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>Nuts (macadamia, pecan, almond)</li>
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>${restricted ? `Herbs, spices and vinegars you like` : `Bone broth, no-sugar electrolyte mix`}</li>
            <li style="display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--ink-soft);padding:5px 0"><span style="width:14px;height:14px;border:1.5px solid var(--line);border-radius:4px;flex:none"></span>${restricted ? `Anything else your doctor has told you to take` : `Magnesium glycinate`}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="sec avoid-break">
      <div class="sec-eyebrow">Your first week, simplified</div>
      <div class="sec-title"><span class="num">06</span> Five rules that carry you</div>
      <ul class="checks">
        <li>${restricted ? `<b style="color:var(--ink)">Get your electrolyte plan from your doctor.</b> The keto flu is almost always a sodium problem, but what you should be taking is a decision for the clinician who manages your condition or your prescription — not for this kit. Ask before you start.` : `<b style="color:var(--ink)">Salt everything.</b> The keto flu is almost always a sodium problem. A cup of broth a day is cheap insurance.`}</li>
        <li><b style="color:var(--ink)">Eat fat to fullness, don't fear it.</b> Hunger is your gauge — you don't need to count every gram in week one.</li>
        <li>${ketoWithheld ? `<b style="color:var(--ink)">Your carb number comes from your prescriber.</b> Lean on the green column while you wait for it. When in doubt, protein + fat + greens.` : `<b style="color:var(--ink)">Keep carbs under ${carb}g.</b> Lean on the green column. When in doubt, protein + fat + greens.`}</li>
        <li>${restricted ? `<b style="color:var(--ink)">Ask about fluids too.</b> You flush a lot of water early on, and how much you should drink to replace it is part of the same conversation with your doctor.` : `<b style="color:var(--ink)">Drink more water than feels normal.</b> You're flushing a lot of it early on.`}</li>
        <li><b style="color:var(--ink)">Ignore the scale after day 3.</b> Early drops are water. Real fat loss shows up over weeks, not days.</li>
      </ul>
    </section>

    <div class="callout" style="margin-top:8px">
      <span class="ct">You've got this, ${escHtml(firstName)}</span>
      ${restricted ? `When week-one gets hard, it's almost never willpower — it's usually electrolytes. Yours are your doctor's call, so make that call early rather than pushing through. Sleep, eat enough, let the cravings pass, and if you feel genuinely unwell, ring your doctor instead of reaching for the salt. Many people feel noticeably better by days 8-14.` : `When week-one gets hard, it's almost never willpower — it's electrolytes. Salt, hydrate, sleep, and let the cravings pass. Many people feel noticeably better by days 8-14.`}
    </div>
  </div>
  ${pageFooter(footLeft, '<a href="https://ketodial.com">ketodial.com</a> — educational, not medical advice', 4, 4)}
</div>`;

  return htmlShell('Keto Starter Kit', STARTER_CSS, body);
}
