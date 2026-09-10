#!/usr/bin/env node
/**
 * tests/kd-diabetes-medication-safety.test.mjs
 *
 * Run it:
 *     node tests/kd-diabetes-medication-safety.test.mjs
 *
 * No network, no database, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS  (Blocker #1, found 2026-09-09)
 * ---------------------------------------------------------------------------
 * The Doctor's Report keyed its glycemic caution and its entire medication
 * considerations table off the condition CHIPS. The medications free text was
 * stored, printed back verbatim, and never read by any safety decision.
 *
 * So a customer who ticked no condition and typed
 *
 *     "Lantus insulin 24 units at night, glipizide 5mg"
 *
 * received a personalized 18 g net carb target, a conditions table reading
 * "None reported, standard monitoring recommended", the word hypoglycemia
 * nowhere in the document, and a seven day meal plan built at that carb level.
 * The report already CONTAINED the correct sentence about insulin and
 * sulfonylureas; it sat inside the Type 2 diabetes metadata where free text
 * could not reach it. The intake form has no Type 1 option, so an insulin user
 * can only tell us in that box.
 *
 * THE POLICY THIS SUITE PINS, and the two halves are deliberately different:
 *
 *   Insulin / sulfonylurea  targets and meal plan STAY. Carbohydrate restriction
 *                           lowers blood glucose, and what needs a clinician is
 *                           the DOSE, which this product never touches. Low-carb
 *                           eating is an accepted option provided medication is
 *                           adjusted proactively, so withholding the number would
 *                           not remove the risk, only the document that starts
 *                           the conversation. The report names the hypoglycemia
 *                           risk and routes the dose decision to the prescriber.
 *
 *   SGLT2 inhibitor         targets are WITHHELD. Here the ketogenic pattern
 *                           itself is the hazard: it is a recognised trigger for
 *                           euglycemic diabetic ketoacidosis, and glucose can
 *                           read normal throughout, so monitoring copy is not an
 *                           answer. When the recommendation is the unsafe thing,
 *                           the recommendation stops. No gentler number is
 *                           substituted.
 *
 * A MEDICATION IS NOT A DIAGNOSIS. Nothing here may write a condition, and the
 * copy says "you told us you take", never "your diabetes".
 *
 * GROUPS
 *   A  detection: the three classes, brands and generics
 *   B  detection: what must NOT be promoted into a high-risk class
 *   C  the derived gates
 *   D  what the insulin / sulfonylurea customer actually reads
 *   E  what the SGLT2 customer actually reads, and does not
 *   F  no diagnosis is asserted from medication text
 *   G  product eligibility and the delivery email
 *   H  Phase 2A renal and adrenal behaviour is untouched
 *   I  mutation
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
  kdDeriveMedicationRisk,
  allowedProducts,
  generateDoctorReport,
  generateMealPlan,
  generateStarterKit,
} = await import('file://' + REPORTS);

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

/** A complete intake. Only `meds`, `conditions` and `kidneyStatus` vary. */
function intake(over = {}) {
  return {
    sex: 'female', age: 61, heightCm: 163, weightKg: 82, goal: 'lose',
    calories: 1450, fatG: 113, proteinG: 91, carbG: 18, tdee: 1810,
    activity: 'light', kidneyStatus: 'no',
    conditions: [], meds: '', symptoms: [], diets: [],
    dairy: 'fine with dairy', budget: 'mod', cooking: 'Basic',
    prepTime: 'About 30 min/day', cookingFor: 'Just me', challenge: '',
    ...over,
  };
}

const CARB_TARGET = '18 g';
const CARB_CEILING = 'Your number is 18g net carbs per day';
const HYPO_CALLOUT = 'Talk to your prescriber before you start';
const WITHHELD_NOTE = 'Your macronutrient targets are not in this report';
const REFERRAL = 'We have not built this plan';
const INSULIN_ROW = 'Insulin / sulfonylureas';
const SGLT2_ROW = 'SGLT2 inhibitors';
const MED_SECTION = 'Medication considerations';

// ===========================================================================
// GROUP A — detection. Brands and generics, as a customer writes them.
// ===========================================================================
const INSULIN_TEXT = [
  'insulin', 'Lantus insulin 24 units at night', 'lantus', 'glargine 100u/ml',
  'Basaglar', 'Toujeo', 'Semglee', 'Humalog 6u with meals', 'lispro', 'Admelog',
  'Lyumjev', 'Novolog', 'NovoRapid', 'insulin aspart', 'Fiasp', 'Tresiba 20',
  'degludec', 'Levemir', 'detemir', 'Humulin N', 'Novolin R', 'apidra', 'glulisine',
];
const SULFONYLUREA_TEXT = [
  'glipizide 5mg', 'gliclazide MR 60', 'glimepiride 2mg', 'glyburide',
  'glibenclamide', 'Amaryl 4mg', 'Diamicron', 'Glucotrol XL', 'DiaBeta',
  'Glynase', 'Micronase', 'a sulfonylurea', 'sulphonylurea',
];
const SGLT2_TEXT = [
  'Jardiance 10mg', 'empagliflozin', 'Farxiga', 'dapagliflozin', 'Forxiga',
  'Invokana', 'canagliflozin', 'Steglatro', 'ertugliflozin', 'bexagliflozin',
  'Synjardy', 'Xigduo XR', 'Invokamet', 'Glyxambi', 'Trijardy XR', 'Qtern',
  // Brands whose names do not contain the -gliflozin stem. Review found these
  // failing open, which meant the full quantitative protocol was printed.
  'Steglujan 15/100mg', 'Segluromet', 'Inpefa', 'Brenzavvy',
  'SGLT2 inhibitor', 'sglt-2 inhibitor',
];

for (const meds of INSULIN_TEXT) {
  const r = kdDeriveMedicationRisk(meds);
  check('A', `insulin detected: "${meds}"`, r.diabetesMedClasses.includes('insulin'),
    JSON.stringify(r.diabetesMedClasses));
  check('A', `insulin raises the hypoglycemia flag: "${meds}"`, r.highHypoglycemiaMedication === true);
  check('A', `insulin is not SGLT2: "${meds}"`, r.sglt2Medication === false);
}
for (const meds of SULFONYLUREA_TEXT) {
  const r = kdDeriveMedicationRisk(meds);
  check('A', `sulfonylurea detected: "${meds}"`, r.diabetesMedClasses.includes('sulfonylurea'),
    JSON.stringify(r.diabetesMedClasses));
  check('A', `sulfonylurea raises the hypoglycemia flag: "${meds}"`, r.highHypoglycemiaMedication === true);
  check('A', `sulfonylurea is not SGLT2: "${meds}"`, r.sglt2Medication === false);
}
for (const meds of SGLT2_TEXT) {
  const r = kdDeriveMedicationRisk(meds);
  check('A', `SGLT2 detected: "${meds}"`, r.sglt2Medication === true, JSON.stringify(r.diabetesMedClasses));
  check('A', `SGLT2 does not raise the hypoglycemia flag on its own: "${meds}"`,
    r.highHypoglycemiaMedication === false);
}
// Written together, both are seen. A customer on two drugs gets both answers.
{
  const r = kdDeriveMedicationRisk('Jardiance 10mg + glipizide 5mg');
  check('A', 'two classes in one line are both detected',
    r.highHypoglycemiaMedication === true && r.sglt2Medication === true);
}

// ===========================================================================
// GROUP B — what must NOT be promoted into a high-risk class
// ===========================================================================
const NOT_HIGH_RISK = [
  // The named controls.
  'metformin 1000mg twice daily', 'Metformin', 'Metformin ER 500',
  'Ozempic', 'semaglutide', 'Wegovy', 'Rybelsus', 'Mounjaro', 'tirzepatide',
  'Zepbound', 'Trulicity', 'dulaglutide', 'Victoza', 'liraglutide', 'Saxenda',
  // Other diabetes drugs with no hypoglycemia or ketoacidosis interaction here.
  'Januvia', 'sitagliptin', 'Janumet', 'linagliptin', 'Tradjenta', 'pioglitazone',
  // Ordinary medication.
  'levothyroxine', 'lisinopril', 'atorvastatin', 'omeprazole', 'amlodipine',
  'hydrocortisone for adrenal insufficiency', 'sertraline', 'ibuprofen as needed',
  // The metabolic phrase that is not a prescription.
  'insulin resistance', 'insulin-resistant', 'I have insulin resistance and PCOS',
  'working on insulin sensitivity', 'insulin resistance, metformin 500mg',
  // A sweetener, not an insulin.
  'aspartame', 'I use aspartame in coffee',
  // Nothing declared.
  '', 'none', 'None reported', 'n/a', 'no meds',
];
for (const meds of NOT_HIGH_RISK) {
  const r = kdDeriveMedicationRisk(meds);
  check('B', `not high-hypoglycemia: "${meds}"`, r.highHypoglycemiaMedication === false,
    JSON.stringify(r.diabetesMedClasses));
  check('B', `not SGLT2: "${meds}"`, r.sglt2Medication === false, JSON.stringify(r.diabetesMedClasses));
  check('B', `no class claimed: "${meds}"`, r.diabetesMedClasses.length === 0,
    JSON.stringify(r.diabetesMedClasses));
}
// A GLP-1 alongside insulin: the insulin is still seen. The GLP-1 is not the reason.
{
  const r = kdDeriveMedicationRisk('Ozempic and insulin glargine');
  check('B', 'a GLP-1 next to insulin does not hide the insulin', r.highHypoglycemiaMedication === true);
  check('B', 'and the GLP-1 itself adds no class', r.diabetesMedClasses.join(',') === 'insulin');
}

// ===========================================================================
// GROUP C — the derived gates
// ===========================================================================
{
  const ins = deriveKdMedicalContext(intake({ meds: 'Lantus insulin 24 units at night, glipizide 5mg' }));
  check('C', 'insulin/SU raises highHypoglycemiaMedication', ins.highHypoglycemiaMedication === true);
  check('C', 'insulin/SU does NOT withhold the ketogenic protocol', ins.restrictKetogenicProtocol === false);
  check('C', 'insulin/SU does not touch the protein gate', ins.restrictProteinTarget === false);

  const sg = deriveKdMedicalContext(intake({ meds: 'Jardiance 10mg' }));
  check('C', 'SGLT2 raises sglt2Medication', sg.sglt2Medication === true);
  check('C', 'SGLT2 withholds the ketogenic protocol', sg.restrictKetogenicProtocol === true);
  check('C', 'SGLT2 does not touch the protein gate', sg.restrictProteinTarget === false);

  const met = deriveKdMedicalContext(intake({ meds: 'metformin 1000mg twice daily' }));
  check('C', 'metformin raises neither flag',
    met.highHypoglycemiaMedication === false && met.sglt2Medication === false);
  check('C', 'metformin does not withhold the ketogenic protocol', met.restrictKetogenicProtocol === false);
  // The electrolyte gate is older and blunter and must keep firing on any declared
  // medication. This fix narrows nothing that was already shut.
  check('C', 'metformin still withholds the electrolyte protocol', met.restrictElectrolyteProtocol === true);

  const none = deriveKdMedicalContext(intake({ meds: '' }));
  check('C', 'no medication, no gates',
    none.highHypoglycemiaMedication === false && none.sglt2Medication === false &&
    none.restrictKetogenicProtocol === false);
  check('C', 'a condition chip alone never implies a prescription',
    deriveKdMedicalContext(intake({ conditions: ['t2d'], meds: '' })).highHypoglycemiaMedication === false);
}

// ===========================================================================
// GROUP D — what the insulin / sulfonylurea customer reads. NO condition chip.
// ===========================================================================
{
  const d = intake({ meds: 'Lantus insulin 24 units at night, glipizide 5mg' });
  const doc = generateDoctorReport('Ann Whitfield', d);
  check('D', 'the hypoglycemia risk is named in the Doctor\'s Report', /hypoglycemia/i.test(doc));
  check('D', 'the prescriber callout renders', doc.includes(HYPO_CALLOUT));
  check('D', 'it routes the dose decision to the prescriber',
    /whether your dose needs to be adjusted/i.test(doc));
  check('D', 'it does not tell the reader to change a dose themselves',
    !/\b(reduce|lower|cut|skip|stop) your (dose|insulin)\b/i.test(doc));
  check('D', 'the medication considerations section appears without a condition chip',
    doc.includes(MED_SECTION));
  check('D', 'the insulin / sulfonylureas row appears', doc.includes(INSULIN_ROW));
  check('D', 'that row is the declared version, not the hypothetical one',
    doc.includes('reported by patient') && !doc.includes('Highest hypoglycemia risk with carb restriction'));
  check('D', 'no SGLT2 row is invented', !doc.includes(SGLT2_ROW));

  // THE POLICY: the number stays.
  check('D', 'the carb target is still printed', doc.includes(CARB_TARGET));
  check('D', 'the macro panel is not withheld', !doc.includes(WITHHELD_NOTE));
  const dMeal = generateMealPlan('Ann Whitfield', d);
  const dKit = generateStarterKit('Ann Whitfield', d);
  check('D', 'the meal plan is still built', !dMeal.includes(REFERRAL));
  check('D', 'the Starter Kit still carries the carb ceiling', dKit.includes(CARB_CEILING));

  // THE WARNING HAS TO TRAVEL WITH THE NUMBERS. The Essentials bundle is meal +
  // starter for $7.99 and contains no Doctor's Report, and both sell singly. A
  // customer on insulin could buy quantitative carbohydrate guidance and never
  // see the risk named, which is the same defect one product over.
  check('D', 'the meal plan names the risk too', dMeal.includes(HYPO_CALLOUT));
  check('D', 'the Starter Kit names the risk too', dKit.includes(HYPO_CALLOUT));
  for (const [what, html] of [['meal plan', dMeal], ['starter kit', dKit]]) {
    // Whitespace-normalised: the copy wraps across lines in the template, so a
    // literal match here would be testing the indentation, not the sentence.
    const flat = html.replace(/\s+/g, ' ');
    check('D', `the ${what} routes it to the prescriber`,
      /clinician who prescribes that medication before you start/i.test(flat));
    check('D', `the ${what} says hypoglycemia in words`, /hypoglycemia/i.test(html));
  }

  // Same medication, this time with the chip ticked. The chip must not be required
  // for any of it, and must not produce a second, weaker copy of the same row.
  const withChip = generateDoctorReport('Ann Whitfield', intake({
    meds: 'Lantus insulin 24 units at night', conditions: ['t2d'] }));
  check('D', 'with the chip ticked the callout still renders', withChip.includes(HYPO_CALLOUT));
  check('D', 'and the declared row wins over the "if applicable" one',
    withChip.includes('reported by patient') &&
    !withChip.includes('Highest hypoglycemia risk with carb restriction'));
}

// ===========================================================================
// GROUP E — what the SGLT2 customer reads, and what they must not
// ===========================================================================
{
  const d = intake({ meds: 'Jardiance 10mg' });
  const doc = generateDoctorReport('Ann Whitfield', d);
  check('E', 'the targets-withheld note renders', doc.includes(WITHHELD_NOTE));
  check('E', 'euglycemic DKA is named as the reason', /euglycemic diabetic ketoacidosis/i.test(doc));
  check('E', 'and so is the reason monitoring is not the answer',
    /blood glucose can read normal/i.test(doc));
  check('E', 'no net carb figure survives', !doc.includes(CARB_TARGET));
  check('E', 'no calorie gauge survives', !doc.includes('kcal / day'));
  check('E', 'no protein figure survives', !/\b91 g\b/.test(doc));
  check('E', 'no fat figure survives', !/\b113 g\b/.test(doc));
  check('E', 'nothing gentler is substituted', !/higher[- ]carb (target|version) (of|is)/i.test(doc));
  check('E', 'the SGLT2 row appears', doc.includes(SGLT2_ROW));
  check('E', 'the medication considerations section appears without a condition chip',
    doc.includes(MED_SECTION));

  const meal = generateMealPlan('Ann Whitfield', d);
  check('E', 'the meal plan is the referral, not a week of food', meal.includes(REFERRAL));
  check('E', 'the referral offers the money back', /refund the meal plan/i.test(meal));
  check('E', 'the referral names the medication class, not a diagnosis',
    /you take an SGLT2 inhibitor/i.test(meal));
  check('E', 'the referral substitutes no higher-carb week',
    /not quietly given you a gentler, higher-carb week/i.test(meal));
  check('E', 'the referral carries no daily calorie figure', !meal.includes('1,450'));

  const kit = generateStarterKit('Ann Whitfield', d);
  check('E', 'the Starter Kit carb ceiling is withheld', !kit.includes(CARB_CEILING));
  check('E', 'and replaced by the same note, not a different number',
    kit.includes(WITHHELD_NOTE));
  check('E', 'the Starter Kit still delivers its non-quantitative content',
    kit.includes('adaptation curve'));

  // THE NUMBER, NOT THE SENTENCE, AND NOT BY GREP EITHER.
  //
  // This assertion used to name one page-1 string, and 385 of them passed while
  // pages 3 and 4 of the same document printed the withheld ceiling twice: "Your
  // daily ceiling is 18g net carbs" and "Keep carbs under 18g". A suppression
  // test that matches copy cannot see a leak written in different copy.
  //
  // Grepping for the figure instead is also wrong: the net-carb cheat sheet is a
  // reference table of food values, and "Beans, half a cup, 18g" collides with a
  // customer whose target happens to be 18. That is not a leak and failing on it
  // would teach the next person to loosen the assertion.
  //
  // So the test is a property, not a string. Render each document twice with
  // DIFFERENT macros and everything else held constant. If any surviving text is
  // derived from a withheld target, the two renders differ. If none is, they are
  // identical, whatever the copy says and whatever numbers the food tables carry.
  const macrosA = { calories: 1450, fatG: 113, proteinG: 91, carbG: 18 };
  const macrosB = { calories: 2310, fatG: 180, proteinG: 144, carbG: 29 };
  for (const [what, gen] of [
    ['doctor', generateDoctorReport], ['meal plan', generateMealPlan], ['starter kit', generateStarterKit],
  ]) {
    const a = gen('Ann Whitfield', intake({ meds: 'Jardiance 10mg', ...macrosA }))
      .replace(/KD-\d{4}-\d{4}-\d+/g, 'RID');
    const b = gen('Ann Whitfield', intake({ meds: 'Jardiance 10mg', ...macrosB }))
      .replace(/KD-\d{4}-\d{4}-\d+/g, 'RID');
    check('E', `the ${what} is identical for two different macro sets, so nothing survives`,
      a === b, a === b ? '' : `${a.length} vs ${b.length} bytes; a withheld target still drives this document`);
  }
  // The same property, stated the other way: for a customer whose targets are NOT
  // withheld, the two macro sets must produce DIFFERENT documents. Without this,
  // a generator that ignored macros entirely would pass the check above.
  for (const [what, gen] of [
    ['doctor', generateDoctorReport], ['meal plan', generateMealPlan], ['starter kit', generateStarterKit],
  ]) {
    const a = gen('Ann Whitfield', intake({ meds: 'metformin 1000mg', ...macrosA }))
      .replace(/KD-\d{4}-\d{4}-\d+/g, 'RID');
    const b = gen('Ann Whitfield', intake({ meds: 'metformin 1000mg', ...macrosB }))
      .replace(/KD-\d{4}-\d{4}-\d+/g, 'RID');
    check('E', `the ${what} DOES track macros when nothing is withheld`, a !== b);
  }
  // The specific claim strings, kept as well, because they are the ones a reader
  // would act on and naming them makes a regression legible in the failure output.
  for (const [what, html] of Object.entries({ doctor: doc, 'meal plan': meal, 'starter kit': kit })) {
    for (const claim of [
      'Your number is', 'Your daily ceiling is', 'Keep carbs under', 'Daily targets',
    ]) {
      check('E', `the ${what} makes no "${claim}" quantity claim`, !html.includes(claim));
    }
  }
}

// ===========================================================================
// GROUP F — a medication is not a diagnosis
// ===========================================================================
for (const meds of ['Lantus insulin 24 units at night, glipizide 5mg', 'Jardiance 10mg']) {
  const ctx = deriveKdMedicalContext(intake({ meds }));
  const doc = generateDoctorReport('Ann Whitfield', intake({ meds }));
  check('F', `no condition is invented from "${meds}"`, ctx.declaredConditionSlugs.length === 0,
    ctx.declaredConditionSlugs.join(','));
  check('F', `the conditions table still reads None reported for "${meds}"`,
    doc.includes('None reported'));
  check('F', `the report never asserts the reader has diabetes for "${meds}"`,
    !/You reported Type 2 diabetes/i.test(doc) && !/your diabetes/i.test(doc));
  check('F', `the copy says what they told us, not what they have, for "${meds}"`,
    /you told us you take/i.test(doc));
}

// ===========================================================================
// GROUP G — product eligibility and the delivery email
// ===========================================================================
{
  const ins = allowedProducts(deriveKdMedicalContext(
    intake({ meds: 'Lantus insulin 24 units at night, glipizide 5mg' })));
  check('G', 'insulin/SU may still buy everything', ins.allowed.length === 5 && ins.blocked.length === 0);
  check('G', 'and no restriction reason is recorded', ins.reason === '');

  const sg = allowedProducts(deriveKdMedicalContext(intake({ meds: 'Jardiance 10mg' })));
  check('G', 'SGLT2 cannot be sold the meal plan or the bundles',
    ['meal', 'essentials', 'protocol'].every(p => sg.blocked.includes(p)), sg.blocked.join(','));
  check('G', 'SGLT2 keeps the two deliverable reports',
    sg.allowed.includes('doctor') && sg.allowed.includes('starter'), sg.allowed.join(','));
  check('G', 'and the reason names the ketogenic target, not protein',
    sg.reason === 'ketogenic_target_unavailable');

  const met = allowedProducts(deriveKdMedicalContext(intake({ meds: 'metformin 1000mg twice daily' })));
  check('G', 'metformin blocks nothing', met.allowed.length === 5 && met.reason === '');

  // The delivery email must not restate the numbers the report withheld.
  const worker = await import('file://' + path.join(ROOT, 'ketodial', 'worker', 'index.js'));
  void worker;
  const idx = fs.readFileSync(path.join(ROOT, 'ketodial', 'worker', 'index.js'), 'utf8');
  check('G', 'targetsLine consults the ketogenic gate',
    /restrictKetogenicProtocol/.test(idx.slice(idx.indexOf('function targetsLine'), idx.indexOf('function targetsLine') + 1600)));

  // THE DECLINE MESSAGE MUST NOT INVENT A HEALTH DECLARATION. This string was
  // hardcoded to the kidney case, so an SGLT2 customer who answered NO to the
  // kidney question was told in a browser alert that they had told us about their
  // kidney function. A fabricated declaration in an alert is the same defect as a
  // fabricated one in the report.
  const checkoutBlock = idx.slice(idx.indexOf("error: 'product_unavailable'"),
                                  idx.indexOf("error: 'product_unavailable'") + 1400);
  check('G', 'the checkout decline message branches on the reason',
    /offer\.reason === 'ketogenic_target_unavailable'/.test(checkoutBlock));
  check('G', 'and the medication branch never mentions kidney function',
    /Because of a medication you told us about/.test(checkoutBlock));

  // The resume projection computes the offer from the row's medications. It read
  // a key that does not exist (`medications`, where the function reads `meds`),
  // so a returning SGLT2 customer was offered a meal plan checkout would decline.
  const resumeBlock = idx.slice(idx.indexOf('async function handleResume'),
                                idx.indexOf('async function handleResume') + 4000);
  check('G', 'the resume offer is computed from the stored medications',
    /meds: row\.medications/.test(resumeBlock));
  check('G', 'and the misnamed key is gone', !/medications: ''/.test(resumeBlock));
}

// ===========================================================================
// GROUP H — Phase 2A renal and adrenal behaviour is untouched
// ===========================================================================
{
  for (const meds of ['hydrocortisone for adrenal insufficiency', 'adrenal fatigue', 'supra-renal gland removed']) {
    const ctx = deriveKdMedicalContext(intake({ meds }));
    check('H', `"${meds}" is still not renal`, ctx.renal === false);
    check('H', `"${meds}" still keeps its protein target`, ctx.restrictProteinTarget === false);
    check('H', `"${meds}" is still not a kidney diagnosis`, ctx.kidneyConditionDeclared === false);
    check('H', `"${meds}" is still not a diabetes medication`,
      ctx.highHypoglycemiaMedication === false && ctx.sglt2Medication === false);
  }
  for (const meds of ['kidney disease', 'prerenal azotemia', 'hemodialysis', 'stage 3 ckd']) {
    const ctx = deriveKdMedicalContext(intake({ meds }));
    check('H', `"${meds}" is still renal`, ctx.renal === true);
    check('H', `"${meds}" still suppresses protein`, ctx.restrictProteinTarget === true);
  }
  for (const k of ['yes', 'unsure']) {
    const ctx = deriveKdMedicalContext(intake({ kidneyStatus: k }));
    check('H', `kidney_status=${k} still suppresses protein`, ctx.restrictProteinTarget === true);
  }
  check('H', 'an absent kidney answer still fails closed',
    deriveKdMedicalContext(intake({ kidneyStatus: undefined })).restrictProteinTarget === true);
  // Both at once: each gate does its own job and neither cancels the other.
  {
    const both = deriveKdMedicalContext(intake({ meds: 'Jardiance 10mg', kidneyStatus: 'yes' }));
    check('H', 'renal and SGLT2 together keep both gates',
      both.restrictProteinTarget === true && both.restrictKetogenicProtocol === true);
    const doc = generateDoctorReport('Ann Whitfield', intake({ meds: 'Jardiance 10mg', kidneyStatus: 'yes' }));
    check('H', 'and the reader is told both reasons, not one',
      doc.includes('Your protein target is not in this report') && doc.includes(WITHHELD_NOTE));
  }
}

// ===========================================================================
// GROUP I — mutation. Break detection, and break its connection to the artifact.
// ===========================================================================
const MUTATIONS = [
  {
    name: 'the insulin term list is emptied',
    apply: (s) => s.replace(/ {2}insulin: \[[\s\S]*?\n {2}\],/, '  insulin: [],'),
    expect: (m) => m.kdDeriveMedicationRisk('Lantus insulin 24 units').highHypoglycemiaMedication === false,
    artifact: (m) => !m.generateDoctorReport('A', intake({ meds: 'Lantus insulin 24 units' })).includes(HYPO_CALLOUT),
  },
  {
    name: 'the sulfonylurea term list is emptied',
    apply: (s) => s.replace(/ {2}sulfonylurea: \[[\s\S]*?\n {2}\],/, '  sulfonylurea: [],'),
    expect: (m) => m.kdDeriveMedicationRisk('glipizide 5mg').highHypoglycemiaMedication === false,
    artifact: (m) => !m.generateDoctorReport('A', intake({ meds: 'glipizide 5mg' })).includes(HYPO_CALLOUT),
  },
  {
    name: 'the SGLT2 term list is emptied',
    apply: (s) => s.replace(/ {2}sglt2: \[[\s\S]*?\n {2}\],/, '  sglt2: [],'),
    expect: (m) => m.kdDeriveMedicationRisk('Jardiance 10mg').sglt2Medication === false,
    artifact: (m) => m.generateDoctorReport('A', intake({ meds: 'Jardiance 10mg' })).includes(CARB_TARGET),
  },
  {
    name: 'the signal is disconnected from the ketogenic gate',
    apply: (s) => s.replace(
      'const restrictKetogenicProtocol = medRisk.sglt2Medication;',
      'const restrictKetogenicProtocol = false;'),
    expect: (m) => m.deriveKdMedicalContext(intake({ meds: 'Jardiance 10mg' })).restrictKetogenicProtocol === false,
    artifact: (m) => m.generateDoctorReport('A', intake({ meds: 'Jardiance 10mg' })).includes(CARB_TARGET),
  },
  {
    name: 'the signal is disconnected from the customer-facing callout',
    apply: (s) => s.replace(
      "  if (!ctx || !ctx.highHypoglycemiaMedication) return '';",
      "  if (true) return '';"),
    expect: () => true,
    artifact: (m) => !m.generateDoctorReport('A', intake({ meds: 'glipizide 5mg' })).includes(HYPO_CALLOUT),
  },
  {
    // The exact leak the review found: page 4 of the Starter Kit printing the
    // withheld ceiling. Restoring it must turn group E red.
    name: 'the Starter Kit page-4 carb rule is ungated again',
    apply: (s) => s.replace(
      "        <li>${ketoWithheld ? `<b style=\"color:var(--ink)\">Your carb number comes from your prescriber.</b> Lean on the green column while you wait for it. When in doubt, protein + fat + greens.` : `<b style=\"color:var(--ink)\">Keep carbs under ${carb}g.</b> Lean on the green column. When in doubt, protein + fat + greens.`}</li>",
      "        <li><b style=\"color:var(--ink)\">Keep carbs under ${carb}g.</b> Lean on the green column. When in doubt, protein + fat + greens.</li>"),
    expect: () => true,
    artifact: (m) => {
      const A = m.generateStarterKit('A', intake({ meds: 'Jardiance 10mg', carbG: 18 }));
      const B = m.generateStarterKit('A', intake({ meds: 'Jardiance 10mg', carbG: 29 }));
      return A !== B;
    },
  },
  {
    name: 'the "insulin resistance" exclusion is removed',
    apply: (s) => s.replace(
      "['insulin', KD_MATCH_PREFIX, { notBefore: ['resistan', 'sensitiv'] }],",
      "['insulin', KD_MATCH_PREFIX],"),
    expect: (m) => m.kdDeriveMedicationRisk('insulin resistance').highHypoglycemiaMedication === true,
    artifact: (m) => m.generateDoctorReport('A', intake({ meds: 'I have insulin resistance and PCOS' })).includes(HYPO_CALLOUT),
  },
];

for (const m of MUTATIONS) {
  const src = fs.readFileSync(REPORTS, 'utf8');
  const mutated = m.apply(src).replace("from './intake.js'", `from '${'file://' + INTAKE}'`);
  check('I', `mutation applied: ${m.name}`, mutated.replace("from '" + 'file://' + INTAKE + "'", "from './intake.js'") !== src,
    'the replace matched nothing, so this mutation proves nothing');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-med-mutant-'));
  const file = path.join(dir, 'reports.mutant.mjs');
  fs.writeFileSync(file, mutated);
  try {
    const mut = await import('file://' + file + '?v=' + encodeURIComponent(m.name));
    check('I', `the signal breaks: ${m.name}`, m.expect(mut) === true);
    // The important half. A signal that still derives correctly but no longer
    // reaches the page is the defect this blocker WAS, so it has to be caught
    // separately from the detection itself.
    check('I', `and the customer artifact changes with it: ${m.name}`, m.artifact(mut) === true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ===========================================================================
if (failures.length) {
  console.error(`\nkd-diabetes-medication-safety: ${passed} passed, ${failures.length} FAILED\n`);
  for (const f of failures) console.error(`  [${f.group}] ${f.label}${f.detail ? `\n      ${f.detail}` : ''}`);
  console.error('\nThis suite stands between a customer on insulin and a carbohydrate');
  console.error('prescription with no mention of hypoglycemia. Do not loosen an assertion.\n');
  process.exit(1);
}
console.log(`\nkd-diabetes-medication-safety: ${passed} passed, 0 failed  (groups A B C D E F G H I)\n`);
console.log('Insulin and sulfonylureas keep their targets and are told why the prescriber');
console.log('has to see this first. An SGLT2 inhibitor gets no ketogenic targets at all,');
console.log('and no gentler ones instead. Neither is called diabetic.\n');
