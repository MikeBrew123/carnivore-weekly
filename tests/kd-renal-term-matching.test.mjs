#!/usr/bin/env node
/**
 * tests/kd-renal-term-matching.test.mjs
 *
 * Run it:
 *     node tests/kd-renal-term-matching.test.mjs
 *
 * No network, no database, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS  (Blocker #2, found 2026-09-09)
 * ---------------------------------------------------------------------------
 * deriveKdMedicalContext() decided whether a customer had reduced kidney function
 * by testing `blob.includes('renal')` against their free-text medications box.
 *
 * "adrenal" contains "renal".
 *
 * A customer who answered NO to the kidney question, ticked no kidney condition,
 * and wrote "hydrocortisone for adrenal insufficiency" was classified renal. The
 * measured consequences, all three reproduced before the fix:
 *
 *   - restrictProteinTarget = true, so their protein target was withheld
 *   - the 7-Day Meal Plan and both bundles were removed from sale, and a buyer
 *     who paid first and filled the profile afterwards received a refund notice
 *     where their meal plan should have been
 *   - kidneyConditionDeclared = true, so the Doctor's Report told their physician
 *     "You told us about kidney disease" about a disease they had denied having
 *
 * That last one is the failure the dedicated kidney_status column exists to
 * prevent: suppression must not become diagnosis.
 *
 * WHAT THIS SUITE PINS
 * --------------------
 *   A  adrenal-family text does not trip the renal gate
 *   B  every genuine renal signal still does, including the ones a left boundary
 *      would have broken (hemodialysis, hydronephrosis)
 *   C  the structured kidney answer is untouched: yes suppresses, unsure
 *      suppresses without claiming a diagnosis, absent fails closed
 *   D  product eligibility is normal for adrenal and still restricted for renal
 *   E  the customer-facing sentences follow, in the generated reports
 *   F  nothing else loosened: the medication electrolyte gate and the cardiac
 *      term matching behave exactly as they did
 *   G  a mutation restoring substring matching is caught by group A
 *
 * The fix is a matching rule per term, not an exception list. "adrenal" is the
 * word that found the bug; it is not the bug. Adding it to a blocklist would
 * leave adrenaline, noradrenaline and adrenalectomy broken.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORTS = path.join(ROOT, 'ketodial', 'worker', 'reports.js');
const INTAKE = path.join(ROOT, 'ketodial', 'worker', 'intake.js');

const {
  deriveKdMedicalContext,
  allowedProducts,
  kdProteinSuppressionNote,
  kdTextDeclaresRenal,
  generateDoctorReport,
  generateMealPlan,
} = await import('file://' + REPORTS);

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

/**
 * A complete, plausible intake. Every required fact is present so the generators
 * run; only `meds`, `conditions` and `kidneyStatus` vary between cases.
 */
function intake(over = {}) {
  return {
    sex: 'female', age: 58, heightCm: 165, weightKg: 88, goal: 'lose',
    calories: 1520, fatG: 112, proteinG: 118, carbG: 22, tdee: 1900,
    activity: 'light', kidneyStatus: 'no',
    conditions: [], meds: '', symptoms: [], diets: [],
    dairy: 'fine with dairy', budget: 'mod', cooking: 'Basic',
    prepTime: 'About 30 min/day', cookingFor: 'Just me', challenge: '',
    ...over,
  };
}

const ALL_PRODUCTS = ['doctor', 'meal', 'starter', 'essentials', 'protocol'];

// ===========================================================================
// GROUP A — the blocker. Renal-like character sequences inside unrelated words.
// ===========================================================================
//
// Every entry: kidney question answered NO, no kidney condition slug. The only
// thing present is free text that happens to contain the letters r-e-n-a-l.
const ADRENAL_CASES = [
  'adrenal',
  'adrenal insufficiency',
  'hydrocortisone for adrenal insufficiency',
  'Adrenal Insufficiency',
  'adrenaline auto-injector',
  'noradrenaline',
  'adrenalectomy 2019',
  'adrenal fatigue supplements',
  'fludrocortisone, hydrocortisone (adrenal)',
  'levothyroxine; hydrocortisone for adrenal insufficiency; vitamin d',
];

/** The assertions that define the blocker. Re-run against the mutant in group G. */
function adrenalExpectations(derive) {
  const wrong = [];
  for (const meds of ADRENAL_CASES) {
    const ctx = derive(intake({ meds, kidneyStatus: 'no', conditions: [] }));
    if (ctx.renal !== false) wrong.push(`${meds}: renal=${ctx.renal}`);
    if (ctx.restrictProteinTarget !== false) wrong.push(`${meds}: restrictProteinTarget=${ctx.restrictProteinTarget}`);
    if (ctx.kidneyConditionDeclared !== false) wrong.push(`${meds}: kidneyConditionDeclared=${ctx.kidneyConditionDeclared}`);
    if (ctx.kidneyUnsureOnly !== false) wrong.push(`${meds}: kidneyUnsureOnly=${ctx.kidneyUnsureOnly}`);
  }
  return wrong;
}

for (const meds of ADRENAL_CASES) {
  const ctx = deriveKdMedicalContext(intake({ meds }));
  check('A', `"${meds}" is not renal`, ctx.renal === false, `renal=${ctx.renal}`);
  check('A', `"${meds}" keeps its protein target`, ctx.restrictProteinTarget === false);
  check('A', `"${meds}" is not recorded as a kidney diagnosis`, ctx.kidneyConditionDeclared === false);
  check('A', `"${meds}" is not treated as an unsure kidney answer`, ctx.kidneyUnsureOnly === false);
}
check('A', 'the rule itself rejects the exact reported example',
  kdTextDeclaresRenal('hydrocortisone for adrenal insufficiency') === false);

// ===========================================================================
// GROUP B — genuine renal signals still detected
// ===========================================================================
//
// Including the two a naive word-boundary fix would have broken: "hemodialysis"
// and "hydronephrosis" are single words whose renal term does not start them.
const RENAL_CASES = [
  'renal disease', 'renal impairment', 'renal failure', 'chronic renal failure',
  'kidney disease', 'chronic kidney disease', 'my kidneys are not great',
  'reduced kidney function', 'CKD', 'ckd', 'ckd3', 'CKD-4', 'stage 3 ckd',
  'ESRD', 'esrd, on the transplant list',
  'dialysis', 'hemodialysis three times a week', 'haemodialysis', 'peritoneal dialysis',
  'nephrologist', 'I see a nephrology clinic', 'diabetic nephropathy',
  'glomerulonephritis', 'hydronephrosis', 'eGFR 42', 'egfr is 38',
  'pre-renal azotemia',
];

for (const meds of RENAL_CASES) {
  const ctx = deriveKdMedicalContext(intake({ meds }));
  check('B', `"${meds}" is renal`, ctx.renal === true, `renal=${ctx.renal}`);
  check('B', `"${meds}" suppresses the protein target`, ctx.restrictProteinTarget === true);
  check('B', `"${meds}" reads as a declared kidney condition`, ctx.kidneyConditionDeclared === true);
}
// The condition slug route, which never went through the text matcher at all.
{
  const ctx = deriveKdMedicalContext(intake({ conditions: ['kidney'], kidneyStatus: 'no' }));
  check('B', 'the kidney condition chip still suppresses on its own', ctx.renal === true);
  check('B', 'the kidney condition chip is a declared diagnosis', ctx.kidneyConditionDeclared === true);
}

// ===========================================================================
// GROUP C — the structured kidney answer is untouched
// ===========================================================================
{
  const yes = deriveKdMedicalContext(intake({ kidneyStatus: 'yes' }));
  check('C', 'yes still suppresses', yes.renal === true && yes.restrictProteinTarget === true);
  check('C', 'yes is a declared diagnosis', yes.kidneyConditionDeclared === true);
  check('C', 'yes is not the unsure wording', yes.kidneyUnsureOnly === false);

  const unsure = deriveKdMedicalContext(intake({ kidneyStatus: 'unsure' }));
  check('C', 'unsure still suppresses', unsure.renal === true && unsure.restrictProteinTarget === true);
  check('C', 'unsure does NOT claim a diagnosis', unsure.kidneyConditionDeclared === false);
  check('C', 'unsure gets the unsure wording', unsure.kidneyUnsureOnly === true);

  // Fail closed. An unanswered safety question is not a negative answer.
  for (const [label, over] of [
    ['absent', { kidneyStatus: undefined }],
    ['null', { kidneyStatus: null }],
    ['empty string', { kidneyStatus: '' }],
    ['unrecognised', { kidneyStatus: 'maybe' }],
  ]) {
    const ctx = deriveKdMedicalContext(intake(over));
    check('C', `a ${label} kidney answer still fails closed`,
      ctx.renal === true && ctx.restrictProteinTarget === true, JSON.stringify(over));
    check('C', `a ${label} kidney answer is not a diagnosis`, ctx.kidneyConditionDeclared === false);
    check('C', `a ${label} kidney answer is not marked answered`, ctx.kidneyAnswered === false);
  }

  // The structured answer outranks the text. Free text may only ADD signal.
  const yesAdrenal = deriveKdMedicalContext(intake({ kidneyStatus: 'yes', meds: 'adrenal insufficiency' }));
  check('C', 'a yes answer is not undone by adrenal text',
    yesAdrenal.renal === true && yesAdrenal.restrictProteinTarget === true);
  const unsureAdrenal = deriveKdMedicalContext(intake({ kidneyStatus: 'unsure', meds: 'adrenal insufficiency' }));
  check('C', 'an unsure answer is not undone by adrenal text', unsureAdrenal.renal === true);
  check('C', 'and adrenal text does not upgrade unsure into a diagnosis',
    unsureAdrenal.kidneyConditionDeclared === false);
}

// ===========================================================================
// GROUP D — product eligibility
// ===========================================================================
{
  const adrenal = allowedProducts(deriveKdMedicalContext(
    intake({ meds: 'hydrocortisone for adrenal insufficiency' })));
  check('D', 'the adrenal customer may buy everything',
    ALL_PRODUCTS.every(p => adrenal.allowed.includes(p)) && adrenal.allowed.length === 5,
    adrenal.allowed.join(','));
  check('D', 'nothing is blocked for the adrenal customer', adrenal.blocked.length === 0);
  check('D', 'and no restriction reason is recorded', adrenal.reason === '');

  for (const [label, over] of [
    ['declared kidney disease', { meds: 'kidney disease' }],
    ['kidney answer yes', { kidneyStatus: 'yes' }],
    ['kidney answer unsure', { kidneyStatus: 'unsure' }],
    ['on dialysis', { meds: 'hemodialysis three times a week' }],
  ]) {
    const r = allowedProducts(deriveKdMedicalContext(intake(over)));
    check('D', `${label}: protein-anchored products still withheld`,
      ['meal', 'essentials', 'protocol'].every(p => r.blocked.includes(p)), r.blocked.join(','));
    check('D', `${label}: the two deliverable reports are still for sale`,
      r.allowed.includes('doctor') && r.allowed.includes('starter'), r.allowed.join(','));
    check('D', `${label}: the reason is recorded`,
      r.reason === 'personalized_protein_target_unavailable');
  }
}

// ===========================================================================
// GROUP E — what the customer actually reads
// ===========================================================================
const KIDNEY_CLAIM = 'you told us about kidney disease';
const SUPPRESSION_HEADING = 'Your protein target is not in this report';
const REFERRAL_HEADING = 'We have not built this plan';
{
  const d = intake({ meds: 'hydrocortisone for adrenal insufficiency' });
  const doc = generateDoctorReport('Judith Hall', d);
  check('E', 'the Doctor\'s Report does not claim the adrenal customer declared kidney disease',
    !doc.toLowerCase().includes(KIDNEY_CLAIM));
  check('E', 'and does not print the protein suppression callout',
    !doc.includes(SUPPRESSION_HEADING));
  check('E', 'and does print their protein target', /Protein<\/div>[\s\S]{0,240}?118 g/.test(doc));
  check('E', 'kdProteinSuppressionNote is empty for them',
    kdProteinSuppressionNote(deriveKdMedicalContext(d)) === '');

  const meal = generateMealPlan('Judith Hall', d);
  check('E', 'the adrenal customer receives a real meal plan, not the referral',
    !meal.includes(REFERRAL_HEADING));
  check('E', 'and that plan is built on their protein number', meal.includes('118'));

  // The genuine case must still say all of it.
  const r = intake({ meds: 'stage 3 ckd' });
  const rdoc = generateDoctorReport('Judith Hall', r);
  check('E', 'a genuine renal reader still gets the suppression callout',
    rdoc.includes(SUPPRESSION_HEADING));
  check('E', 'and no protein figure anywhere in their Doctor\'s Report',
    !rdoc.includes('118 g'));
  check('E', 'and the meal plan is still the referral',
    generateMealPlan('Judith Hall', r).includes(REFERRAL_HEADING));
}

// ===========================================================================
// GROUP F — nothing adjacent was loosened
// ===========================================================================
{
  // The medication gate is independent of the renal gate, and must stay shut.
  // Hydrocortisone acts on sodium and fluid; withholding the electrolyte
  // protocol for them is correct and is NOT what this fix relaxes.
  const ctx = deriveKdMedicalContext(intake({ meds: 'hydrocortisone for adrenal insufficiency' }));
  check('F', 'a declared medication still withholds the electrolyte protocol',
    ctx.restrictElectrolyteProtocol === true);
  check('F', 'and is still recorded as a declared medication', ctx.hasDeclaredMedication === true);

  // Cardiac and blood-pressure terms were deliberately left on substring
  // matching. Pinned so a later tightening is a decision, not a side effect.
  for (const meds of ['heartburn', 'cardio 3x a week', 'lisinopril for hypertension']) {
    const c = deriveKdMedicalContext(intake({ meds }));
    check('F', `"${meds}" still reads as cardio-renal, unchanged`, c.cardioRenal === true);
    check('F', `"${meds}" is not renal`, c.renal === false);
  }

  // No medication at all: nothing is declared and nothing is restricted.
  for (const meds of ['', 'none', 'None reported', 'n/a', 'no meds']) {
    const c = deriveKdMedicalContext(intake({ meds }));
    check('F', `"${meds}" declares nothing`, c.hasDeclaredMedication === false);
    check('F', `"${meds}" is not renal`, c.renal === false);
    check('F', `"${meds}" leaves the electrolyte protocol intact`,
      c.restrictElectrolyteProtocol === false);
  }

  // An unreadable intake still fails closed.
  const blank = deriveKdMedicalContext({ kidneyStatus: 'no' });
  check('F', 'an intake carrying neither conditions nor meds still fails closed',
    blank.unreadableIntake === true && blank.restrictElectrolyteProtocol === true);
}

// ===========================================================================
// GROUP G — mutation: put the substring behaviour back and prove group A fails
// ===========================================================================
//
// The mutant flips the two boundary-aware match modes to plain substring, which
// is exactly the pre-fix rule. Written to the OS temp directory, never the repo.
{
  const src = fs.readFileSync(REPORTS, 'utf8');
  const mutated = src
    .replace("const KD_MATCH_PREFIX = 'prefix';", "const KD_MATCH_PREFIX = 'anywhere';")
    .replace("const KD_MATCH_TOKEN = 'token';", "const KD_MATCH_TOKEN = 'anywhere';")
    .replace("from './intake.js'", `from '${'file://' + INTAKE}'`);
  check('G', 'the mutation actually applied',
    mutated !== src && mutated.includes("const KD_MATCH_PREFIX = 'anywhere';"));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-renal-mutant-'));
  const file = path.join(dir, 'reports.mutant.mjs');
  fs.writeFileSync(file, mutated);
  try {
    const mutant = await import('file://' + file);
    const wrong = adrenalExpectations(mutant.deriveKdMedicalContext);
    check('G', 'the mutant reintroduces the bug', wrong.length > 0);
    check('G', 'group A catches it on every adrenal case',
      wrong.length === ADRENAL_CASES.length * 3,
      `${wrong.length} broken assertions, expected ${ADRENAL_CASES.length * 3}`);
    check('G', 'and specifically on the exact reported example',
      wrong.some(w => w.startsWith('hydrocortisone for adrenal insufficiency: renal=true')));

    // The same mutant must still pass group B, which proves group A is what
    // catches this mutation rather than a suite-wide collapse.
    const stillRenal = RENAL_CASES.every(meds =>
      mutant.deriveKdMedicalContext(intake({ meds })).renal === true);
    check('G', 'the mutant still detects genuine renal text, so group A is the discriminator',
      stillRenal === true);

    // And the fixed module, run through the identical harness, is clean.
    check('G', 'the shipped module passes the same harness',
      adrenalExpectations(deriveKdMedicalContext).length === 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ===========================================================================
const groups = [...new Set(failures.map(f => f.group))].sort();
if (failures.length) {
  console.error(`\nkd-renal-term-matching: ${passed} passed, ${failures.length} FAILED\n`);
  for (const f of failures) console.error(`  [${f.group}] ${f.label}${f.detail ? `\n      ${f.detail}` : ''}`);
  console.error('\nThis suite is the only thing standing between a customer who takes');
  console.error('hydrocortisone and a report telling their doctor they have kidney disease.');
  console.error('Do not loosen an assertion to go green.\n');
  process.exit(1);
}
console.log(`\nkd-renal-term-matching: ${passed} passed, 0 failed  (groups A B C D E F G)\n`);
console.log('"adrenal" is a word that contains "renal", not a kidney condition. The gate');
console.log('now matches terms, the structured kidney answer still outranks the text, and');
console.log('every genuine renal signal still suppresses.\n');
void groups;
