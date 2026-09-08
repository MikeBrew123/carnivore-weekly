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

import { requireFacts } from './intake.js';

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

/**
 * Words that mean a cardiac, renal or blood-pressure problem, however the reader
 * happened to write it. Used ONLY to sharpen wording and to catch free text; the
 * safety decision above does not depend on this list matching anything.
 */
const KD_CARDIO_RENAL_TERMS = [
  'kidney', 'renal', 'ckd', 'esrd', 'nephro', 'nephritis', 'nephropathy',
  'dialysis', 'glomerul', 'creatinine', 'egfr',
  'heart', 'cardiac', 'cardio', 'chf', 'congestive', 'heart failure',
  'afib', 'a-fib', 'atrial fibrillation', 'arrhythmia', 'pacemaker',
  'hypertension', 'blood pressure', 'stroke', 'transplant', 'edema', 'oedema',
];

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
  const cardioRenalText = KD_CARDIO_RENAL_TERMS.some(t => blob.includes(t));
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
    ['kidney', 'renal', 'ckd', 'esrd', 'nephro', 'dialysis', 'glomerul', 'egfr']
      .some(t => blob.includes(t));

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
    restrictElectrolyteProtocol,
    restrictProteinTarget,
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
  if (!ctx || !ctx.restrictProteinTarget) {
    return { allowed: ALL, blocked: [], reason: '' };
  }
  const blocked = ALL.filter(item => {
    const parts = KD_BUNDLE_CONTENTS[item] || [item];
    return parts.some(part => PROTEIN_ANCHORED_PRODUCTS.has(part));
  });
  return {
    allowed: ALL.filter(i => !blocked.includes(i)),
    blocked,
    reason: 'personalized_protein_target_unavailable',
  };
}

/**
 * What a reader who declared kidney disease is told where a protein target would
 * otherwise have been. It is a referral, not a smaller number, and it deliberately
 * does not imply a figure is waiting elsewhere in the document.
 */
export function kdProteinSuppressionNote(ctx) {
  if (!ctx || !ctx.restrictProteinTarget) return '';
  return `<div class="callout warn" style="margin-top:16px">
        <span class="ct">Your protein target is not in this report</span>
        You told us about kidney disease. How much protein is right for you can depend on your
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
<style>${SHARED_CSS}${extraCSS}</style>
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
      <div class="sec-sub">${proteinWithheld
        ? 'This section would normally set a macronutrient distribution. It does not, for the reason stated below.'
        : `A ketogenic macronutrient distribution${d.goal === 'lose' ? ' at a 20% caloric deficit from estimated maintenance' : d.goal === 'gain' ? ' at a 10% caloric surplus above maintenance' : ' at estimated maintenance'}. Protein set to approximately 25% of calories to support body composition during fat loss.`}</div>
      <div class="intervention">
        ${proteinWithheld
          // THE WHOLE PANEL GOES, NOT JUST THE PROTEIN ROW. Energy, fat, protein and
          // carbohydrate are one closed system: printing any three of them states the
          // fourth. Blanking the protein line while leaving calories, fat and carbs on
          // the page would let the reader recover the number by subtraction, which is
          // suppression in appearance only — the exact failure CLAUDE.md calls
          // cosmetic safety. So the macro panel is replaced, not edited.
          ? kdProteinSuppressionNote(ctx)
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
        <div class="minigauge">
          <svg viewBox="0 0 150 96" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
            <path d="M16 84 A 59 59 0 0 1 134 84" stroke="#e2e8f0" stroke-width="9" stroke-linecap="round"/>
            <path d="M16 84 A 59 59 0 0 1 110 30" stroke="#0ea5e9" stroke-width="9" stroke-linecap="round"/>
            <line x1="75" y1="84" x2="108" y2="40" stroke="#0f172a" stroke-width="2.4" stroke-linecap="round"/>
            <circle cx="75" cy="84" r="4.5" fill="#0f172a"/>
          </svg>
          <div class="num" style="color:var(--ink);top:48%">${fmtNum(cal)}</div>
          <div class="lab" style="color:var(--ink-faint);top:48%;margin-top:20px">kcal / day</div>
        </div>
      </div>
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
function getMealDatabase(noDairy) {
  return {
    breakfast: [
      // 3 large eggs (210cal,15f,18p,1c) + 3 strips bacon/42g (129cal,10f,9p,0c) + ½ avocado/68g (114cal,10f,1p,2c) + 1 tbsp butter/14g (102cal,12f,0p,0c)
      { name: 'Bacon &amp; avocado baked eggs', desc: '3 large eggs (150g) · 3 strips bacon (42g) · ½ avocado (68g) · 1 tbsp butter (14g)', kcal: 555, f: 47, p: 28, c: 3 },
      // 4oz smoked salmon (132cal,5f,21p,0c) + 2oz cream cheese or ½ avocado + 1 cucumber (30g)
      { name: `Smoked salmon &amp; ${noDairy ? 'avocado' : 'cream-cheese'} roll-ups`, desc: `4 oz smoked salmon (113g) · ${noDairy ? '½ avocado (68g)' : '2 oz cream cheese (57g)'} · ½ cucumber (100g)`, kcal: noDairy ? 276 : 329, f: noDairy ? 15 : 24, p: 23, c: noDairy ? 5 : 3 },
      // 3 large eggs + 2 pork sausage links/56g (196cal,16f,12p,1c) + 1oz cheddar/28g (113cal,9f,7p,0c)
      { name: `Sausage &amp; egg ${noDairy ? 'scramble' : 'muffins'}`, desc: `3 large eggs (150g) · 2 pork sausage links (56g) · ${noDairy ? '1 tbsp olive oil (14ml)' : '1 oz cheddar (28g)'}`, kcal: noDairy ? 526 : 519, f: noDairy ? 42 : 40, p: noDairy ? 33 : 37, c: 2 },
      // 3 large eggs + 1 tbsp butter + 1oz cheese or 2 tbsp olive oil
      { name: `${noDairy ? 'Herb &amp; mushroom' : 'Cheese &amp; herb'} omelette`, desc: `3 large eggs (150g) · 1 tbsp butter (14g) · ${noDairy ? '½ cup mushrooms (35g)' : '1 oz cheddar (28g)'} · herbs`, kcal: noDairy ? 340 : 425, f: noDairy ? 27 : 36, p: noDairy ? 20 : 25, c: noDairy ? 2 : 1 },
      // 4oz sirloin (200cal,8f,30p,0c) + 2 large eggs (140cal,10f,12p,1c) + 1 tbsp butter
      { name: 'Steak &amp; eggs', desc: '4 oz sirloin steak (113g) · 2 large eggs (100g) · 1 tbsp butter (14g)', kcal: 442, f: 30, p: 42, c: 1 },
      // 2 large eggs + 2 tbsp almond flour/14g (80cal,7f,3p,1c) + 1 tbsp butter + 1 tbsp coconut oil/14g (121cal,14f,0p,0c)
      { name: 'Keto pancakes + butter', desc: '2 large eggs (100g) · 2 tbsp almond flour (14g) · 1 tbsp coconut oil (14g) · 1 tbsp butter (14g)', kcal: 441, f: 39, p: 15, c: 2 },
      // 2 large eggs + ½ avocado + 2 strips bacon
      { name: 'Bacon &amp; egg plate', desc: '2 large eggs (100g) · ½ avocado (68g) · 2 strips bacon (28g) · 1 cup spinach (30g)', kcal: 400, f: 32, p: 22, c: 4 },
    ],
    lunch: [
      // 5oz chicken breast (165cal,4f,31p,0c) + 2 cups romaine (16cal,0f,1p,2c) + 1 hard-boiled egg + 2 tbsp ranch or olive oil + 1oz cheese
      { name: `Chicken Cobb salad`, desc: `5 oz grilled chicken breast (142g) · 2 cups romaine (94g) · 1 egg (50g) · ${noDairy ? '2 tbsp olive oil (28ml)' : '1 oz blue cheese (28g) · 2 tbsp ranch (30ml)'}`, kcal: noDairy ? 467 : 510, f: noDairy ? 30 : 33, p: noDairy ? 43 : 46, c: noDairy ? 3 : 4 },
      // 5oz canned tuna (130cal,1f,29p,0c) + 2 tbsp mayo/28g (188cal,21f,0p,0c) + ½ avocado + lettuce
      { name: 'Tuna-avocado lettuce boats', desc: '5 oz canned tuna (142g) · 2 tbsp olive-oil mayo (28g) · ½ avocado (68g) · 2 butter lettuce cups', kcal: 432, f: 32, p: 30, c: 4 },
      // 5oz chicken thigh (270cal,16f,28p,0c) + 1 cup mixed greens + ½ cup cucumber + 2 tbsp olive oil + feta or olives
      { name: 'Greek salad + grilled chicken', desc: `5 oz chicken thigh (142g) · 2 cups mixed greens (60g) · ½ cup cucumber (65g) · ${noDairy ? '10 kalamata olives (40g)' : '1 oz feta (28g)'} · 2 tbsp olive oil (28ml)`, kcal: noDairy ? 538 : 508, f: noDairy ? 40 : 36, p: 31, c: noDairy ? 5 : 3 },
      // 6oz 80/20 ground beef (340cal,22f,34p,0c) + ½ avocado + 2 cups lettuce + 1 tbsp mayo
      { name: 'Burger bowl, no bun', desc: '6 oz ground beef 80/20 (170g) · ½ avocado (68g) · 2 cups shredded lettuce (94g) · 1 tbsp mayo (14g)', kcal: 548, f: 42, p: 35, c: 4 },
      // 6oz shrimp (168cal,3f,36p,0c) + ½ avocado + 1 tbsp olive oil + lime
      { name: 'Shrimp avocado salad', desc: '6 oz shrimp (170g) · ½ avocado (68g) · 1 tbsp olive oil (14ml) · lime · 2 cups mixed greens (60g)', kcal: 402, f: 24, p: 38, c: 5 },
      // 3oz prosciutto (150cal,9f,18p,0c) + 4oz mozzarella or avocado + basil + 1 tbsp olive oil
      { name: `${noDairy ? 'Prosciutto &amp; avocado' : 'Caprese'} plate`, desc: `3 oz prosciutto (85g) · ${noDairy ? '1 avocado (136g)' : '4 oz fresh mozzarella (113g)'} · fresh basil · 1 tbsp olive oil (14ml)`, kcal: noDairy ? 458 : 530, f: noDairy ? 34 : 40, p: noDairy ? 20 : 34, c: noDairy ? 7 : 3 },
      // 4oz chicken breast + 2 strips bacon + low-carb tortilla/38g (90cal,4f,5p,9c net ~3c) + 1 tbsp ranch or avocado
      { name: `Chicken-bacon wrap`, desc: `4 oz chicken breast (113g) · 2 strips bacon (28g) · 1 low-carb tortilla (38g) · ${noDairy ? '¼ avocado (34g)' : '1 tbsp ranch (15ml)'}`, kcal: noDairy ? 392 : 403, f: noDairy ? 18 : 20, p: 42, c: 5 },
    ],
    dinner: [
      // 8oz ribeye (544cal,36f,52p,0c) + 1 cup asparagus/134g (27cal,0f,3p,3c) + 1 tbsp butter
      { name: 'Ribeye + garlic-butter asparagus', desc: '8 oz ribeye steak (227g) · 1 cup asparagus (134g) · 1 tbsp butter (14g)', kcal: 673, f: 48, p: 55, c: 3 },
      // 2 bone-in pork chops/10oz total (460cal,28f,50p,0c) + 2 cups spinach/60g (14cal,0f,2p,1c) + 1 tbsp olive oil
      { name: 'Pork chops + sautéed spinach', desc: '10 oz bone-in pork chops (283g) · 2 cups fresh spinach (60g) · 1 tbsp olive oil (14ml) · 2 cloves garlic', kcal: 594, f: 40, p: 52, c: 3 },
      // 6oz salmon fillet (350cal,22f,34p,0c) + 2 cups spinach + 1 tbsp butter or olive oil
      { name: `Salmon + ${noDairy ? 'garlic' : 'creamed'} spinach`, desc: `6 oz salmon fillet (170g) · 2 cups spinach (60g) · ${noDairy ? '1 tbsp olive oil (14ml)' : '1 tbsp butter (14g) · 2 tbsp heavy cream (30ml)'}`, kcal: noDairy ? 484 : 520, f: noDairy ? 34 : 38, p: 36, c: 2 },
      // 10oz skin-on chicken thighs (450cal,28f,46p,0c) + 1 cup broccoli/91g (31cal,0f,3p,4c) + 1 tbsp olive oil
      { name: 'Roast chicken thighs + broccoli', desc: '10 oz skin-on chicken thighs (283g) · 1 cup broccoli (91g) · 1 tbsp olive oil (14ml)', kcal: 601, f: 40, p: 49, c: 4 },
      // 6oz beef sirloin strips (300cal,12f,46p,0c) + 1 medium zucchini/200g (34cal,1f,2p,4c) + 1 tbsp sesame oil
      { name: 'Beef stir-fry, zucchini noodles', desc: '6 oz beef sirloin strips (170g) · 1 medium zucchini (200g) · 1 tbsp sesame oil (14ml) · ginger · soy sauce', kcal: 454, f: 25, p: 48, c: 6 },
      // 6oz cod (140cal,1f,30p,0c) + 1 cup green beans/100g (31cal,0f,2p,5c) + 2 tbsp butter
      { name: 'Lemon-butter cod + green beans', desc: '6 oz cod fillet (170g) · 1 cup green beans (100g) · 2 tbsp butter (28g)', kcal: 375, f: 25, p: 32, c: 5 },
      // 8oz pulled pork shoulder (480cal,32f,44p,0c) + 1 cup coleslaw (60cal,4f,1p,4c no sugar)
      { name: 'Slow-roast pork shoulder + slaw', desc: '8 oz pork shoulder, pulled (227g) · 1 cup coleslaw with olive-oil dressing (120g) · no sugar', kcal: 540, f: 36, p: 45, c: 4 },
    ],
    snack: [
      // 1oz macadamias/28g (204cal,21f,2p,2c net)
      { name: 'Macadamia nuts', desc: '1 oz (28g)', kcal: 204, f: 21, p: 2, c: 2 },
      // 10 olives/40g (58cal,5f,0p,2c) + 1oz cheddar/28g (113cal,9f,7p,0c) or 1oz almonds
      { name: `Olives &amp; ${noDairy ? 'almonds' : 'cheddar'}`, desc: `10 green olives (40g) · ${noDairy ? '1 oz almonds (28g)' : '1 oz cheddar (28g)'}`, kcal: noDairy ? 222 : 171, f: noDairy ? 19 : 14, p: noDairy ? 8 : 7, c: noDairy ? 4 : 2 },
      // 1oz pecans/28g (196cal,20f,3p,1c net)
      { name: 'Pecans', desc: '1 oz (28g)', kcal: 196, f: 20, p: 3, c: 1 },
      // 2 large hard-boiled eggs (140cal,10f,12p,1c)
      { name: 'Hard-boiled eggs ×2', desc: '2 large eggs (100g)', kcal: 140, f: 10, p: 12, c: 1 },
      // 2 squares 90% dark chocolate/20g (120cal,10f,2p,4c net)
      { name: 'Dark chocolate 90%', desc: '2 squares (20g)', kcal: 120, f: 10, p: 2, c: 4 },
      // 1oz almonds/28g (164cal,14f,6p,3c net)
      { name: 'Almonds', desc: '1 oz (28g)', kcal: 164, f: 14, p: 6, c: 3 },
      // ¼ cup raspberries/31g (16cal,0f,0p,2c net) + 2 tbsp heavy cream/30ml (100cal,11f,1p,1c)
      { name: `Berries &amp; ${noDairy ? 'coconut cream' : 'heavy cream'}`, desc: `¼ cup raspberries (31g) · 2 tbsp ${noDairy ? 'coconut cream' : 'heavy cream'} (30ml)`, kcal: 116, f: 11, p: 1, c: 3 },
    ],
  };
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getBudgetDinners(noDairy) {
  return [
    { name: 'Ground beef &amp; broccoli bowl', desc: '8 oz ground beef 80/20 (227g) · 1 cup broccoli (91g) · 1 tbsp butter (14g)', kcal: 585, f: 40, p: 49, c: 4 },
    { name: 'Chicken thighs + green beans', desc: '10 oz bone-in chicken thighs (283g) · 1 cup green beans (100g) · 1 tbsp olive oil (14ml)', kcal: 601, f: 40, p: 49, c: 4 },
    { name: 'Pork loin + buttered cabbage', desc: '6 oz pork loin (170g) · 2 cups shredded cabbage (150g) · 2 tbsp butter (28g)', kcal: 452, f: 30, p: 40, c: 5 },
    { name: 'Salmon patties + spinach', desc: '6 oz canned salmon (170g) · 1 large egg (50g) · 2 cups spinach (60g) · 1 tbsp olive oil (14ml)', kcal: 398, f: 24, p: 40, c: 2 },
    { name: 'Roast drumsticks + zucchini', desc: '8 oz chicken drumsticks (227g) · 1 medium zucchini (200g) · 1 tbsp butter (14g)', kcal: 520, f: 33, p: 50, c: 4 },
    { name: 'Turkey taco bowl, no shell', desc: '6 oz ground turkey 85/15 (170g) · 2 cups shredded lettuce (94g) · ¼ avocado (34g) · 1 tbsp olive oil (14ml)', kcal: 418, f: 29, p: 33, c: 4 },
    { name: 'Slow-roast pork shoulder + slaw', desc: '8 oz pork shoulder, pulled (227g) · 1 cup coleslaw with olive-oil dressing (120g) · no sugar', kcal: 540, f: 36, p: 45, c: 4 },
  ];
}

// Fat-only add-on: 1 tbsp butter or olive oil (102-120 cal, 12-14f, 0p, 0c)
const FAT_ADD = { kcal: 102, f: 12, p: 0, c: 0, unit: '1 tbsp butter (14g)' };
// Lean protein snacks for when protein is short
const LEAN_SNACKS = [
  { name: 'Hard-boiled eggs ×2', desc: '2 large eggs (100g)', kcal: 140, f: 10, p: 12, c: 1 },
  { name: 'Turkey roll-ups', desc: '3 oz deli turkey (85g) · mustard', kcal: 90, f: 1, p: 18, c: 2 },
  { name: 'Beef jerky', desc: '1 oz (28g)', kcal: 80, f: 1, p: 13, c: 3 },
];

function scaleMeal(base, s) {
  return { ...base, kcal: Math.round(base.kcal * s), f: Math.round(base.f * s), p: Math.round(base.p * s), c: Math.round(base.c * s) };
}

function buildMealPlanDays(d) {
  // NO DEFAULTS. `prot` is not decoration here: it filters which meals are eligible
  // (minDensity, below) and scales every portion (protScale). A substituted 113 g
  // would silently reshape a real customer's week.
  requireFacts(d, ['calories', 'proteinG', 'carbG'], 'buildMealPlanDays');
  const cal = d.calories;
  const prot = d.proteinG;
  const carb = d.carbG;
  const budget = d.budget || 'mod';
  const dairyPref = (d.dairy || '').toLowerCase();
  const noDairy = dairyPref.includes('free') || dairyPref.includes('none') || dairyPref.includes('strict');
  const lightDairy = noDairy || dairyPref.includes('light') || dairyPref.includes('little') || dairyPref.includes('bother');
  const db = getMealDatabase(lightDairy);
  const budgetDins = budget === 'tight' ? getBudgetDinners(lightDairy) : null;

  // 1. Minimum protein density for template filtering
  const minDensity = prot / cal;
  const premiumWords = ['salmon', 'shrimp', 'prosciutto', 'caprese', 'mozzarella', 'ribeye'];
  function filterPool(pool, skipPremium) {
    let filtered = pool;
    if (skipPremium) {
      filtered = pool.filter(m => !premiumWords.some(w => m.name.toLowerCase().includes(w)));
      if (filtered.length < 3) filtered = pool;
    }
    const ranked = filtered.slice().sort((a, b) => (b.p / b.kcal) - (a.p / a.kcal));
    const good = ranked.filter(m => (m.p / m.kcal) >= minDensity * 0.65);
    return good.length >= 4 ? good : ranked.slice(0, Math.max(4, Math.ceil(filtered.length * 0.6)));
  }
  const isTight = budget === 'tight';
  const bPool = filterPool(db.breakfast, isTight);
  const lPool = filterPool(db.lunch, isTight);
  const dPool = filterPool(budgetDins || db.dinner, isTight);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const b = bPool[i % bPool.length];
    const l = lPool[i % lPool.length];
    const dn = dPool[i % dPool.length];

    // 2. Scale uniformly to anchor protein
    const baseP = b.p + l.p + dn.p;
    const protScale = baseP > 0 ? prot / baseP : 1;
    const clamped = Math.max(0.6, Math.min(2.0, protScale));

    const mB = { slot: 'Breakfast', ...scaleMeal(b, clamped) };
    const mL = { slot: 'Lunch', ...scaleMeal(l, clamped) };
    const mD = { slot: 'Dinner', ...scaleMeal(dn, clamped) };
    const mainP = mB.p + mL.p + mD.p;
    const mainKcal = mB.kcal + mL.kcal + mD.kcal;

    // 3. Fat knob: add/remove fat to hit calorie target
    //    Half-tbsp increments (~51 kcal, 6g fat each) for finer control
    const halfTbspKcal = 51;
    const halfTbspF = 6;
    const targetMainKcal = cal * 0.90;
    const calGap = targetMainKcal - mainKcal;
    const halfTbspAdj = Math.round(calGap / halfTbspKcal);

    if (halfTbspAdj !== 0) {
      mD.kcal += halfTbspAdj * halfTbspKcal;
      mD.f += halfTbspAdj * halfTbspF;
      const wholeTbsp = Math.abs(halfTbspAdj) / 2;
      if (halfTbspAdj > 0) {
        const label = wholeTbsp >= 1 ? (Number.isInteger(wholeTbsp) ? wholeTbsp : wholeTbsp.toFixed(1)) + ' tbsp' : '½ tbsp';
        mD.desc += ` · +${label} butter`;
      } else if (halfTbspAdj < 0) {
        const label = wholeTbsp >= 1 ? (Number.isInteger(wholeTbsp) ? wholeTbsp : wholeTbsp.toFixed(1)) + ' tbsp' : '½ tbsp';
        mD.desc += ` · −${label} fat`;
      }
      if (mD.f < 0) mD.f = 0;
      if (mD.kcal < 100) mD.kcal = 100;
    }

    const adjustedMainKcal = mB.kcal + mL.kcal + mD.kcal;
    const remainKcal = cal - adjustedMainKcal;
    const remainP = prot - mainP;

    // 4. Snack as final buffer — context-dependent selection
    let mS;
    if (remainP > 8) {
      // Protein short → lean protein snack
      const lean = LEAN_SNACKS[i % LEAN_SNACKS.length];
      const leanScale = Math.max(0.5, Math.min(3.0, remainP / lean.p));
      mS = { slot: 'Snack', ...scaleMeal(lean, leanScale) };
    } else if (remainKcal > 50) {
      // Calories short, protein ok → fat-heavy snack (low protein density)
      const fatSnacks = db.snack.filter(s => s.p <= 3);
      const sBase = fatSnacks.length > 0 ? fatSnacks[i % fatSnacks.length] : db.snack[i % db.snack.length];
      const sScale = Math.max(0.3, Math.min(4.0, remainKcal / sBase.kcal));
      mS = { slot: 'Snack', ...scaleMeal(sBase, sScale) };
    } else {
      // At or over budget → minimal
      mS = { slot: 'Snack', name: 'Celery + sea salt', desc: '3 stalks celery (90g)', kcal: 14, f: 0, p: 1, c: 2 };
    }

    const meals = [mB, mL, mD, mS];
    const totKcal = meals.reduce((a, m) => a + m.kcal, 0);
    const totF = meals.reduce((a, m) => a + m.f, 0);
    const totP = meals.reduce((a, m) => a + m.p, 0);
    const totC = meals.reduce((a, m) => a + m.c, 0);

    days.push({ dayNum: i + 1, dayName: DAY_NAMES[i], meals, totKcal, totF, totP, totC });
  }
  return days;
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

function grocerySection(d) {
  const dairyPrefGS = (d.dairy || '').toLowerCase();
  const noDairyGS = dairyPrefGS.includes('free') || dairyPrefGS.includes('none') || dairyPrefGS.includes('strict');
  const noDairy = noDairyGS || dairyPrefGS.includes('light') || dairyPrefGS.includes('little') || dairyPrefGS.includes('bother');
  const budget = d.budget || 'mod';

  const proteins = budget === 'tight' ? [
    ['Ground beef 80/20', '2 lb'],
    ['Chicken thighs &amp; drumsticks (bone-in)', '3 lb'],
    ['Pork loin + shoulder', '2.5 lb'],
    ['Canned salmon · canned tuna', '3 cans'],
    ['Ground turkey 85/15', '1 lb'],
    ['Bacon &amp; breakfast sausage', '1 pack ea'],
    ['Eggs', '2.5 dozen'],
  ] : [
    ['Ribeye / sirloin steak', '12 oz'],
    ['Chicken thighs (skin-on)', '2 lb'],
    ['Salmon &amp; cod fillets', '1.5 lb'],
    ['Pork chops + shoulder', '2.5 lb'],
    ['Bacon &amp; breakfast sausage', '1 pack ea'],
    ['Eggs', '2 dozen'],
    ['Shrimp · canned tuna', 'as needed'],
  ];

  const fats = budget === 'tight' ? [
    ['Olive oil (store brand)', '1 bottle'],
    ['Butter', '1 block'],
    ['Avocados', '4'],
    ['Almonds or pecans', '1 bag'],
    ['Olive-oil mayo', '1 jar'],
  ] : [
    ['Extra-virgin olive oil', '1 bottle'],
    ['Grass-fed butter', '1 block'],
    ['Avocados', '5'],
    ['Macadamias · pecans · almonds', '1 bag ea'],
    ['Olives', '1 jar'],
    ['Olive-oil mayo', '1 jar'],
  ];

  const produce = [
    ['Romaine · spinach · mixed greens', '3 bags'],
    ['Asparagus · broccoli · green beans', '1 ea'],
    ['Zucchini', '3'],
    ['Cucumber · celery', '2 ea'],
    ['Raspberries', '1 small'],
    ['Garlic · lemon · fresh basil', '1 ea'],
  ];

  const pantry = noDairy
    ? [
        ['Coconut cream · almond milk', '1 ea'],
        ['Almond flour', '1 bag'],
        ['Chia seeds · unsweetened coconut milk', '1 ea'],
        ['90% dark chocolate', '1 bar'],
        ['Low-carb tortillas', '1 pack'],
        ['Sesame oil · ginger', '1 ea'],
      ]
    : [
        ['Cheddar · feta · mozzarella', 'light use'],
        ['Cream cheese · heavy cream', '1 ea'],
        ['Almond flour', '1 bag'],
        ['Chia seeds · unsweetened coconut milk', '1 ea'],
        ['90% dark chocolate', '1 bar'],
        ['Low-carb tortillas', '1 pack'],
      ];

  function listItems(arr) {
    return arr.map(([item, qty]) => `<li>${item} <span class="q">${qty}</span></li>`).join('\n          ');
  }

  const budgetTip = budget === 'tight'
    ? 'Ground beef for ribeye, chicken thighs over breasts, frozen fish and frozen spinach, and whole blocks of cheese cut down the bill the most — roughly <b>30–40%</b> versus the premium versions above, with identical macros.'
    : 'Buy in bulk where possible. Costco-size proteins and eggs save 30–40% vs grocery store prices, with identical macros.';

  return `<section class="sec">
      <div class="sec-eyebrow">Shop once</div>
      <div class="sec-title">Your week's grocery list</div>
      <div class="sec-sub">Organized by aisle and sized for one person.${budget === 'tight' ? ' Budget-conscious swaps noted where they save the most.' : ''}</div>
    </section>

    <div class="grocery">
      <div class="gcat">
        <h4>Proteins</h4>
        <ul>
          ${listItems(proteins)}
        </ul>
      </div>
      <div class="gcat">
        <h4>Fats &amp; oils</h4>
        <ul>
          ${listItems(fats)}
        </ul>
      </div>
      <div class="gcat">
        <h4>Produce</h4>
        <ul>
          ${listItems(produce)}
        </ul>
      </div>
      <div class="gcat">
        <h4>${noDairy ? 'Pantry' : 'Dairy &amp; pantry'}</h4>
        <ul>
          ${listItems(pantry)}
        </ul>
      </div>
    </div>

    <div class="callout" style="margin-top:24px">
      <span class="ct">${budget === 'tight' ? 'Tight-budget swaps' : 'Money-saving tip'}</span>
      ${budgetTip}
    </div>`;
}

/**
 * What a customer who declared kidney disease receives in place of the seven-day
 * plan they bought.
 *
 * This is PRODUCT ROUTING, not clinical guidance. It states what the plan would have
 * been built from, why that is not something this software may build, and who to ask
 * instead. It gives no protein figure, no portion size and no substitute target, and
 * it does not imply that a gentler version of the plan exists somewhere.
 *
 * It also tells them, in the first line, that they can have their money back. A
 * customer who paid for a meal plan and received a referral is owed that plainly and
 * without having to ask twice.
 */
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
    <p>${escHtml(name)}, you told us about kidney disease. Every meal in this plan would have
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
    ${grocerySection(d)}
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
  const carb = d.carbG;
  const ctx = deriveKdMedicalContext(d);
  // `restricted` decides whether this document is allowed to print a quantitative
  // electrolyte protocol. Every quantity on page 2, plus the sodium/fluid
  // instructions scattered through pages 1 and 4, hang off it.
  const restricted = ctx.restrictElectrolyteProtocol;
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
        <div class="row">TARGET <b>${carb}g net carbs</b></div>
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

    <section class="sec avoid-break">
      <div class="sec-eyebrow">The golden rule</div>
      <div class="sec-title"><span class="num">02</span> Stay under your carb ceiling</div>
      <div class="callout">
        <span class="ct">Your number is ${carb}g net carbs per day</span>
        Net carbs = total carbs − fiber − sugar alcohols. Stay under this and ketosis takes care of itself. The cheat sheet on page 3 shows exactly which foods fit — keep it somewhere you'll see it.
      </div>
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
          <div class="target">~3,500 mg/day</div>
          <div class="src">Avocado, leafy greens, salmon, mushrooms. A potassium-chloride "lite salt" helps fill the gap.</div>
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
          <tr><td><b>Electrolyte powder</b><br /><span style="font-size:11px;color:var(--ink-faint)">no sugar</span></td><td>Easiest way to hit sodium &amp; potassium daily.</td><td class="mono">1 serving/day</td></tr>
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
      Your daily ceiling is <b>${carb}g net carbs</b>. A whole day of green-column eating barely touches it — that's the point. One slice of bread or half a banana spends most of your day in a single bite, which is why the red column is "treats," not "never."
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
        <li><b style="color:var(--ink)">Keep carbs under ${carb}g.</b> Lean on the green column. When in doubt, protein + fat + greens.</li>
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
