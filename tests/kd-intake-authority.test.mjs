#!/usr/bin/env node
/**
 * tests/kd-intake-authority.test.mjs
 *
 * THE SOURCE-OF-TRUTH REGRESSION FOR PAID KETODIAL REPORTS.
 *
 * Run it:
 *     node tests/kd-intake-authority.test.mjs
 *
 * No network, no database, no Stripe, no API key. Supabase is stubbed at `fetch`.
 * Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHAT WENT WRONG
 * ---------------------------------------------------------------------------
 * The customer's questionnaire travelled to the report generators inside a Stripe
 * metadata field:
 *
 *     metadata[form_data] = JSON.stringify(formData).slice(0, 490)
 *
 * Stripe caps a metadata value at 500 characters. The fixed part of the KetoDial
 * form serialises to 307 of them, leaving 183 characters for every medication,
 * every condition slug and the free-text "what gets in your way" answer. Past that
 * the string was cut mid-JSON, `JSON.parse` threw, `safeParseJSON(...) || {}` handed
 * the generators an empty object, and the generators substituted constants:
 *
 *     cal=1800  fat=140  prot=113  carb=25  wKg=75  hCm=170
 *
 * A 58-year-old woman of 88 kg and 165 cm, on four medications with three declared
 * conditions, received a Doctor's Report stating BMI 26.0 instead of 32.3, "None
 * reported" against her conditions, and no medications at all — on the one document
 * in the product designed to be handed to her physician.
 *
 * Payload length correlates with medical complexity, so the loss concentrated on
 * exactly the customers the safety gate exists to protect. The 2026-09-08 safety
 * closeout recorded this as "contained" because the electrolyte gate treats an empty
 * form as unreadable and over-suppresses. That containment covered generateStarterKit
 * and nothing else.
 *
 * ---------------------------------------------------------------------------
 * THE ACCEPTANCE TEST THIS FILE ENCODES
 * ---------------------------------------------------------------------------
 *     A paid KetoDial report may only be generated from a complete, validated,
 *     authoritative intake record, and every failure to obtain one must produce
 *     NO REPORT rather than a report containing invented customer facts.
 *
 * Both halves matter. Refusing everything would pass the first half and destroy the
 * product; rendering a "best effort" report would pass the second and reintroduce
 * the defect.
 *
 * GROUP G is the mutation harness. A green suite is not evidence. Each protection is
 * broken on purpose, the suite is required to go red on a NAMED assertion, and the
 * protection is restored. On 2026-09-07 a 445-assertion green run sat on top of six
 * P0 defects; that is what GROUP G exists to prevent happening again here.
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(HERE, '..');
const INTAKE_JS = path.join(REPO, 'ketodial', 'worker', 'intake.js');
const WORKER_JS = path.join(REPO, 'ketodial', 'worker', 'index.js');
const REPORTS_JS = path.join(REPO, 'ketodial', 'worker', 'reports.js');
const KD_PUBLIC_JS = path.join(REPO, 'ketodial', 'public', 'ketodial.js');

const {
  IntakeError, normalizeIntake, validateIntake, validatePurchaseIntake,
  requireFacts, loadAuthoritativeIntake, loadIntakeForPurchase, toStoredVocabulary,
} = await import('file://' + INTAKE_JS);
const { kdProteinSuppressionNote } = await import('file://' + REPORTS_JS);
const WORKFLOW_YML = path.join(REPO, '.github', 'workflows', 'calculator-guard.yml');
const { generateDoctorReport, generateMealPlan, generateStarterKit,
        deriveKdMedicalContext, allowedProducts } = await import('file://' + REPORTS_JS);
const KD_INDEX_HTML = path.join(REPO, 'ketodial', 'public', 'index.html');

let checks = 0;
const failures = [];
function check(group, name, ok, detail = '') {
  checks++;
  if (!ok) failures.push({ group, name, detail });
}

// ===========================================================================
// FIXTURES
// ---------------------------------------------------------------------------
// A REAL row shape, taken from `information_schema.columns` for
// calculator_sessions_v2 and from live KetoDial rows. Note `weight_value` arrives
// from PostgREST as the string "194.00", not a number — a fixture that used a
// number would not exercise the coercion that actually runs in production.
// ===========================================================================
const ROW = {
  session_token: 'kd_71b397c6c78843879b4fa997f4a16',
  step_completed: 3,
  sex: 'female',
  age: 58,
  height_cm: 165,
  weight_value: '194.00',
  weight_unit: 'lbs',
  goal: 'lose',
  lifestyle_activity: 'sedentary',
  kidney_status: 'no',
  calculated_macros: { calories: 1650, fatG: 128, proteinG: 118, carbG: 22, tdee: 2060 },
  conditions: ['t2d', 'bp', 'chol'],
  symptoms: ['energy', 'cravings', 'sleep'],
  medications: 'Metformin 1000mg, Lisinopril 10mg, Levothyroxine 88mcg, Furosemide 40mg',
  dairy_tolerance: 'Fine with dairy',
  cooking_skill: 'Basic',
  meal_prep_time: '30 minutes',
  family_situation: 'Two',
  budget: 'moderate',
  biggest_challenge:
    'I keep falling off after two weeks when the evening cravings hit and I am cooking for my family.',
  previous_diets: ['keto', 'lowcarb'],
  email: 'linda@example.com',
  first_name: 'Linda',
};

/** The object the OLD code would have serialized into Stripe metadata. */
function legacyFormDataShape(row) {
  return {
    sex: row.sex, age: row.age,
    weightKg: Math.round(Number(row.weight_value) * 0.453592),
    heightCm: row.height_cm,
    goal: row.goal, activity: row.lifestyle_activity,
    kidneyStatus: row.kidney_status,
    calories: row.calculated_macros.calories, fatG: row.calculated_macros.fatG,
    proteinG: row.calculated_macros.proteinG, carbG: row.calculated_macros.carbG,
    tdee: row.calculated_macros.tdee,
    dairy: row.dairy_tolerance, cooking: row.cooking_skill,
    prepTime: row.meal_prep_time, cookingFor: row.family_situation,
    conditions: row.conditions, symptoms: row.symptoms, diets: row.previous_diets,
    budget: row.budget, meds: row.medications, challenge: row.biggest_challenge,
  };
}

/** A Supabase stub. Returns whatever rows the case wants, or fails the way asked. */
function stubSupabase({ rows = [ROW], status = 200, throwNetwork = false, badJson = false }) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (!String(url).includes('calculator_sessions_v2')) {
      throw new Error('kd-intake-authority: unexpected network call to ' + url);
    }
    if (throwNetwork) throw new TypeError('network down');
    if (badJson) return { ok: true, json: async () => { throw new SyntaxError('not json'); } };
    return { ok: status === 200, status, json: async () => rows };
  };
  return () => { globalThis.fetch = real; };
}

const ENV = { SUPABASE_URL: 'https://stub.invalid', SUPABASE_SERVICE_ROLE_KEY: 'stub' };

// ===========================================================================
// GROUP A — THE ORIGINAL DEFECT, END TO END, WITH A REALISTIC >490-CHAR INTAKE.
// ---------------------------------------------------------------------------
// This is the case from the bug report. The assertion is not "the JSON is long";
// it is that a customer whose questionnaire would have been destroyed by the old
// store now receives a report carrying HER OWN body, and that the specific wrong
// numbers she used to get appear nowhere in it.
// ===========================================================================
{
  const legacy = legacyFormDataShape(ROW);
  const serialized = JSON.stringify(legacy);

  check('A', 'the fixture is a realistic intake that OVERFLOWS the old 490-char store',
    serialized.length > 490,
    `serialized to ${serialized.length} chars; the fixture no longer reproduces the defect`);

  check('A', 'and the old store really did destroy it (truncated JSON does not parse)',
    (() => { try { JSON.parse(serialized.slice(0, 490)); return false; } catch { return true; } })(),
    'the truncated payload parsed, so this fixture does not exercise the failure');

  const restore = stubSupabase({});
  let intake, err = null;
  try { intake = await loadAuthoritativeIntake(ROW.session_token, ENV); } catch (e) { err = e; }
  restore();

  check('A', 'the authoritative path loads and validates that same intake', err === null,
    err ? `${err.name}: ${err.message}` : '');

  if (intake) {
    // 194 lb -> 88.0 kg. Her real body, not the substituted 75 kg.
    check('A', 'her real weight survives, converted from the stored lbs',
      Math.abs(intake.weightKg - 88.0) < 0.2, `got ${intake.weightKg}`);
    check('A', 'her real height survives', intake.heightCm === 165, `got ${intake.heightCm}`);
    check('A', 'her real macros survive', intake.calories === 1650 && intake.proteinG === 118, '');
    check('A', 'all four medications survive intact',
      /Metformin/.test(intake.meds) && /Lisinopril/.test(intake.meds) &&
      /Levothyroxine/.test(intake.meds) && /Furosemide/.test(intake.meds),
      `got: ${intake.meds}`);
    check('A', 'all three conditions survive',
      intake.conditions.length === 3, `got ${JSON.stringify(intake.conditions)}`);
    check('A', 'the 97-character free-text answer survives in full',
      intake.challenge === ROW.biggest_challenge, `got ${intake.challenge}`);

    const doc = generateDoctorReport('Linda', intake);
    // BMI 88.0 / 1.65^2 = 32.3. The defect printed 26.0.
    check('A', "the Doctor's Report states her real BMI (32.3), not the substituted 26.0",
      /32\.3/.test(doc) && !/\b26\.0\b/.test(doc),
      'the fabricated BMI is back, or the real one is missing');
    check('A', "the Doctor's Report lists her conditions rather than 'None reported'",
      !/None reported<\/b><\/td><td>Standard monitoring/.test(doc), '');
    check('A', "the Doctor's Report lists her medications", /Metformin/.test(doc), '');
    for (const [fact, re] of Object.entries({
      calories: /\b1,?800\b/, fatG: /\b140\s*g\b/, proteinG: /\b113\s*g\b/,
      weightKg: /\b75(?:\.0)?\s*kg\b/, heightCm: /\b170\s*cm\b/,
    })) {
      check('A', `no substituted ${fact} default appears in her report`, !re.test(doc), '');
    }
  }
}

// ===========================================================================
// GROUP B — STRIPE METADATA IS NO LONGER A STORE.
// Source invariants. If someone puts the questionnaire back into metadata, this
// goes red before a customer finds out.
// ===========================================================================
{
  const worker = fs.readFileSync(WORKER_JS, 'utf8');
  const client = fs.readFileSync(KD_PUBLIC_JS, 'utf8');
  // These files DOCUMENT the old store at length, so a naive scan matches the
  // tombstone comments describing the defect and reports it as still present.
  // Strip comments and assert against code.
  const strip = src => src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/^\s*\*.*$/gm, ' ');
  const workerCode = strip(worker);
  const clientCode = strip(client);

  check('B', 'the worker never writes metadata[form_data]',
    !/metadata\[form_data\]'\s*,/.test(worker) &&
    !/sessionParams\.append\(\s*'metadata\[form_data\]'/.test(workerCode),
    'the serialized questionnaire is being put back into Stripe metadata');

  check('B', 'the worker never reads metadata.form_data',
    !/metadata\??\.\??form_data/.test(workerCode),
    'a code path still treats Stripe metadata as the source of truth');

  check('B', 'the 490-character slice is gone',
    !/slice\(0,\s*49\d\)/.test(workerCode), '');

  check('B', 'safeParseJSON — the `|| {}` that turned a lost form into a blank one — is gone',
    !/function safeParseJSON/.test(workerCode), '');

  check('B', 'the worker still stamps the bounded session_token reference',
    /metadata\[session_token\]/.test(worker), '');

  check('B', 'both report paths go through loadAuthoritativeIntake',
    (worker.match(/loadAuthoritativeIntake\(/g) || []).length >= 3,
    'expected the checkout guard, the webhook and GET /report to each load authoritative intake');

  check('B', 'the browser no longer sends the serialized form to /checkout',
    !/formData:formData/.test(clientCode),
    'the client is still shipping the questionnaire into the checkout call');

  check('B', 'collectFormData() — which existed only to build that payload — is gone',
    !/function collectFormData/.test(clientCode), '');

  check('B', 'the browser persists lifestyle_activity, which the Doctor\'s Report prints',
    /lifestyle_activity:/.test(clientCode), '');

  // The vocabulary bridge, guarded at the source level too: without it the write
  // that carries conditions and medications is rejected by the shared table.
  check('B', "KetoDial's option text is translated before it reaches the shared table",
    /toStoredVocabulary\('dairy_tolerance'/.test(worker) &&
    /toStoredVocabulary\('cooking_skill'/.test(worker) &&
    /toStoredVocabulary\('budget'/.test(worker),
    'a raw KD select value is being written into a CW-constrained column again');
  check('B', 'a rejected session update is logged, not swallowed',
    /Session update REJECTED/.test(worker), '');

  check('B', 'session updates record an answer by PRESENCE, not truthiness',
    /setIfSent\(/.test(workerCode) && !/if \(b\.medications\) updates\.medications/.test(workerCode),
    'a falsy guard is back, so "no medications" is again indistinguishable from "lost"');
}

// ===========================================================================
// GROUP C — MISSING, MALFORMED, INCOMPLETE AND INVALID-REFERENCE CASES.
// Every one of these must fail closed. None may produce a report.
// ===========================================================================
const REFERENCE_CASES = [
  { id: 'no token', token: undefined, code: 'INTAKE_REFERENCE_INVALID' },
  { id: 'empty token', token: '', code: 'INTAKE_REFERENCE_INVALID' },
  { id: 'null token', token: null, code: 'INTAKE_REFERENCE_INVALID' },
  { id: 'non-string token', token: 12345, code: 'INTAKE_REFERENCE_INVALID' },
  { id: 'token of the wrong shape', token: 'cw_notaketodialtoken', code: 'INTAKE_REFERENCE_INVALID' },
  { id: 'token with an injection attempt', token: 'kd_abc&select=*', code: 'INTAKE_REFERENCE_INVALID' },
];
for (const c of REFERENCE_CASES) {
  const restore = stubSupabase({});
  let err = null;
  try { await loadAuthoritativeIntake(c.token, ENV); } catch (e) { err = e; }
  restore();
  check('C', `invalid reference rejected: ${c.id}`,
    err instanceof IntakeError && err.code === c.code,
    err ? `${err.name}/${err.code}` : 'an invalid session reference was accepted');
}

{
  // Row simply is not there — a real legacy purchase with no saved questionnaire.
  const restore = stubSupabase({ rows: [] });
  let err = null;
  try { await loadAuthoritativeIntake(ROW.session_token, ENV); } catch (e) { err = e; }
  restore();
  check('C', 'a missing row fails closed as INTAKE_NOT_FOUND',
    err instanceof IntakeError && err.code === 'INTAKE_NOT_FOUND',
    err ? `${err.name}/${err.code}` : 'a missing intake produced no error');
  check('C', 'and the customer is routed to a human rather than given a report',
    err && /ketodial@carnivoreweekly\.com/.test(err.customerMessage), '');
}

{
  // TRANSIENT vs DEFINITIVE. Collapsing these is how an outage becomes a refused
  // report for a customer whose data was fine all along.
  for (const [label, opts] of [
    ['network failure', { throwNetwork: true }],
    ['store 500', { status: 500 }],
    ['unparseable store response', { badJson: true }],
  ]) {
    const restore = stubSupabase(opts);
    let err = null;
    try { await loadAuthoritativeIntake(ROW.session_token, ENV); } catch (e) { err = e; }
    restore();
    check('C', `${label} is reported as transient, NOT as "no intake"`,
      err !== null && !(err instanceof IntakeError),
      err ? `threw ${err.name}, which the callers treat as unrecoverable` : 'no error at all');
  }
}

const INCOMPLETE_CASES = [
  // These three are the "profile not filled in yet" shape, which validateIntake
  // reports as INTAKE_PROFILE_NOT_COMPLETED so the page can send the customer back
  // to the form instead of telling them their answers were lost. Still refused.
  { id: 'medical screen never submitted (step 1)', row: { ...ROW, step_completed: 1 },
    missing: 'medical intake', code: 'INTAKE_PROFILE_NOT_COMPLETED' },
  { id: 'conditions column lost', row: { ...ROW, conditions: null },
    missing: 'conditions', code: 'INTAKE_PROFILE_NOT_COMPLETED' },
  { id: 'medications column lost', row: { ...ROW, medications: null },
    missing: 'medications', code: 'INTAKE_PROFILE_NOT_COMPLETED' },
  { id: 'macros absent', row: { ...ROW, calculated_macros: null }, missing: 'calories' },
  { id: 'macros present but empty', row: { ...ROW, calculated_macros: {} }, missing: 'calories' },
  { id: 'protein missing from macros',
    row: { ...ROW, calculated_macros: { ...ROW.calculated_macros, proteinG: null } }, missing: 'proteinG' },
  { id: 'weight lost', row: { ...ROW, weight_value: null }, missing: 'weightKg' },
  { id: 'weight unit unrecognised', row: { ...ROW, weight_unit: 'stone' }, missing: 'weightKg' },
  { id: 'height lost', row: { ...ROW, height_cm: null }, missing: 'heightCm' },
  { id: 'sex lost', row: { ...ROW, sex: null }, missing: 'sex' },
  { id: 'age lost', row: { ...ROW, age: null }, missing: 'age' },
  { id: 'goal lost', row: { ...ROW, goal: null }, missing: 'goal' },
];
for (const c of INCOMPLETE_CASES) {
  let err = null;
  try { validateIntake(normalizeIntake(c.row)); } catch (e) { err = e; }
  check('C', `incomplete intake fails closed: ${c.id}`,
    err instanceof IntakeError && err.code === (c.code || 'INTAKE_INCOMPLETE'),
    err ? `${err.name}/${err.code}` : 'an incomplete intake was accepted');
  check('C', `  ...and names the missing fact (${c.missing})`,
    err && err.missing.some(m => m.includes(c.missing)),
    err ? `reported: ${err.missing.join(', ')}` : '');
}

const MALFORMED_CASES = [
  { id: 'row is null', row: null, code: 'INTAKE_ROW_MISSING' },
  { id: 'row is a string', row: 'not a row', code: 'INTAKE_ROW_MISSING' },
  { id: 'age is nonsense text', row: { ...ROW, age: 'fifty-eight' }, code: 'INTAKE_INCOMPLETE' },
  { id: 'age out of range', row: { ...ROW, age: 240 }, code: 'INTAKE_IMPLAUSIBLE' },
  // age 0 is PRESENT and implausible, not missing — `0` is a real value that must
  // survive normalization (so it is not confused with absence) and then be rejected
  // on range. Expecting INTAKE_INCOMPLETE here would mean 0 was being read as null.
  { id: 'age is zero', row: { ...ROW, age: 0 }, code: 'INTAKE_IMPLAUSIBLE' },
  { id: 'height implausible', row: { ...ROW, height_cm: 12 }, code: 'INTAKE_IMPLAUSIBLE' },
  { id: 'weight implausible', row: { ...ROW, weight_value: '4000' }, code: 'INTAKE_IMPLAUSIBLE' },
  { id: 'calories implausible',
    row: { ...ROW, calculated_macros: { ...ROW.calculated_macros, calories: 42 } }, code: 'INTAKE_IMPLAUSIBLE' },
  { id: 'sex is not a value the form can send', row: { ...ROW, sex: 'yes' }, code: 'INTAKE_IMPLAUSIBLE' },
  { id: 'goal is not a value the form can send', row: { ...ROW, goal: 'thrive' }, code: 'INTAKE_IMPLAUSIBLE' },
  { id: 'macros is a string, not an object',
    row: { ...ROW, calculated_macros: '{"calories":1650}' }, code: 'INTAKE_INCOMPLETE' },
];
for (const c of MALFORMED_CASES) {
  let err = null;
  try { validateIntake(normalizeIntake(c.row)); } catch (e) { err = e; }
  check('C', `malformed intake fails closed: ${c.id}`,
    err instanceof IntakeError && err.code === c.code,
    err ? `${err.name}/${err.code}, expected ${c.code}` : 'malformed intake was accepted');
}

// ===========================================================================
// GROUP D — "ANSWERED NOTHING" IS NOT "NEVER ASKED".
// The distinction the falsy guards destroyed. A customer with no conditions and no
// medications is entitled to a report; a customer whose answers were lost is not.
// ===========================================================================
{
  const declaredNothing = { ...ROW, conditions: [], medications: '', symptoms: [] };
  let err = null, intake = null;
  try { intake = validateIntake(normalizeIntake(declaredNothing)); } catch (e) { err = e; }
  check('D', 'a customer who declared nothing still gets a report', err === null,
    err ? `${err.name}: ${err.message}` : '');
  check('D', 'and their empty answers are preserved as answers, not as absence',
    intake && Array.isArray(intake.conditions) && intake.conditions.length === 0 && intake.meds === '',
    '');

  const lost = { ...ROW, conditions: null, medications: null };
  let lostErr = null;
  try { validateIntake(normalizeIntake(lost)); } catch (e) { lostErr = e; }
  check('D', 'a customer whose answers were LOST does not get one',
    lostErr instanceof IntakeError,
    'a NULL medical column was read as "declared nothing", which is the fail-open');
}

// ===========================================================================
// GROUP E — LEGACY PAID SESSIONS.
// calculator_sessions_v2 showed 20 KetoDial sessions and 0 paid at the time of the
// change, so there is nothing to migrate. `payment_status` is only written when the
// webhook sees a token, so that count cannot PROVE no purchase ever happened — and
// these assertions exist so that a real legacy buyer is handled without fabrication
// if one turns up.
// ===========================================================================
{
  const legacyNoToken = { ...ROW, session_token: undefined };
  let err = null;
  try { await (async () => {
    const restore = stubSupabase({ rows: [legacyNoToken] });
    try { await loadAuthoritativeIntake(undefined, ENV); } finally { restore(); }
  })(); } catch (e) { err = e; }
  check('E', 'a legacy purchase with no session_token is refused, not reconstructed',
    err instanceof IntakeError && err.code === 'INTAKE_REFERENCE_INVALID', '');
  check('E', 'and the refusal tells them to email with their receipt',
    err && /receipt/.test(err.customerMessage), '');

  // A partial legacy row (the shape the falsy-guard bug actually produced live:
  // conditions [] written, medications/symptoms/budget NULL) must not be topped up.
  const partialLegacy = {
    ...ROW, step_completed: 3, conditions: [], medications: null, symptoms: null,
    dairy_tolerance: null, cooking_skill: null, budget: null, biggest_challenge: null,
  };
  let pErr = null;
  try { validateIntake(normalizeIntake(partialLegacy)); } catch (e) { pErr = e; }
  check('E', 'a real partial legacy row is refused rather than completed with defaults',
    pErr instanceof IntakeError && pErr.missing.includes('medications'),
    pErr ? `reported ${pErr.missing.join(', ')}` : 'a partial legacy row was accepted');

  // Preservation, the other half: a legacy row that IS complete must still work.
  let goodErr = null;
  try { validateIntake(normalizeIntake({ ...ROW, step_completed: 2 })); } catch (e) { goodErr = e; }
  check('E', 'a complete historical row is preserved and still generates', goodErr === null,
    goodErr ? `${goodErr.name}: ${goodErr.message}` : '');
}

// ===========================================================================
// GROUP F — requireFacts, the generator-level backstop.
// ===========================================================================
{
  let err = null;
  try { requireFacts({ calories: 1650 }, ['calories', 'proteinG'], 'test'); } catch (e) { err = e; }
  check('F', 'requireFacts throws IntakeError naming the missing fact',
    err instanceof IntakeError && err.missing.includes('proteinG'), '');

  let zeroErr = null;
  try { requireFacts({ carbG: 0 }, ['carbG'], 'test'); } catch (e) { zeroErr = e; }
  check('F', 'a legitimate zero is NOT treated as missing (carbG: 0 is a real answer)',
    zeroErr === null, 'zero net carbs was read as absent, which would refuse a valid report');

  let nullErr = null;
  try { requireFacts({ calories: null }, ['calories'], 'test'); } catch (e) { nullErr = e; }
  check('F', 'null IS treated as missing', nullErr instanceof IntakeError, '');
}

// ===========================================================================
// GROUP H — THE EARLY RENAL GATE: what we SHOW and what we SELL.
// ---------------------------------------------------------------------------
// One question, asked once, before the free protein result:
//
//   "Have you been diagnosed with kidney disease, told that your kidney function is
//    reduced, or are you on dialysis?"   No / Yes / I'm not sure
//
// The rule being tested is SAFETY CHANGES THE OFFER, NOT THE ABILITY TO PURCHASE.
// A customer who answers Yes must still be able to spend money — on the things we
// can actually deliver. Assertions that only checked suppression would be satisfied
// by a product that refuses to sell anything, which is the opposite of the point, so
// every suppression case below also asserts that a purchase path survives.
// ===========================================================================
{
  const asked = (answer, extra = {}) => ({ ...legacyFormDataShape(ROW), kidneyStatus: answer, ...extra });

  // --- No: nothing changes. ---
  {
    const d = asked('no');
    const ctx = deriveKdMedicalContext(d);
    const offer = allowedProducts(ctx);
    check('H', 'No — protein target is NOT suppressed', ctx.restrictProteinTarget === false, '');
    check('H', 'No — the personalized protein figure appears in the report',
      new RegExp(`${d.proteinG}\\s*g`).test(generateDoctorReport('Linda', d)), '');
    check('H', 'No — the protein-anchored meal plan is generated',
      /class="wg"/.test(generateMealPlan('Linda', d)), '');
    check('H', 'No — every product remains purchasable, bundles included',
      offer.allowed.length === 5 && offer.blocked.length === 0, offer.blocked.join(','));
  }

  // --- Yes and I'm not sure: identical treatment. ---
  for (const answer of ['yes', 'unsure']) {
    const d = asked(answer);
    const ctx = deriveKdMedicalContext(d);
    const offer = allowedProducts(ctx);
    const doc = generateDoctorReport('Linda', d);
    const meal = generateMealPlan('Linda', d);
    const starter = generateStarterKit('Linda', d);
    const text = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

    check('H', `${answer} — the gate suppresses the protein target`,
      ctx.restrictProteinTarget === true, '');
    check('H', `${answer} — and the electrolyte protocol too (renal is cardio-renal)`,
      ctx.restrictElectrolyteProtocol === true,
      'protein was withheld while the sodium and potassium protocol still printed');

    check('H', `${answer} — their protein number appears in NO document`,
      !new RegExp(`\\b${d.proteinG}\\s*g\\b`).test(text(doc + meal + starter)), '');
    check('H', `${answer} — and no SUBSTITUTE protein number is offered either`,
      !/\b\d{1,3}\s*(?:g|grams)\s*(?:of\s+)?protein\b/i.test(text(doc + meal + starter)) &&
      !/protein[^.]{0,40}?\b\d{1,3}\s*(?:g|grams)\b/i.test(text(doc + meal + starter)),
      'a gentler protein figure was printed, which is the same decision in a quieter voice');
    check('H', `${answer} — the reader is routed to a clinician instead`,
      /renal dietitian/i.test(text(doc)), '');

    check('H', `${answer} — the protein-anchored meal plan is NOT sold`,
      offer.blocked.includes('meal'), '');
    check('H', `${answer} — nor any bundle containing it`,
      offer.blocked.includes('essentials') && offer.blocked.includes('protocol'), '');

    // The half that stops this becoming a blocked funnel.
    check('H', `${answer} — the Doctor's Report is still purchasable`,
      offer.allowed.includes('doctor'), '');
    check('H', `${answer} — the Starter Kit is still purchasable`,
      offer.allowed.includes('starter'), '');
    check('H', `${answer} — the customer can still spend money`,
      offer.allowed.length >= 2, 'the funnel was closed rather than adjusted');

    // $5.99 + $3.99 = $9.98 against $10.99 for the Full Protocol they can no longer
    // receive in full. Removing the bundle must never cost them more.
    check('H', `${answer} — buying the remaining products costs less than the blocked bundle`,
      (5.99 + 3.99) < 10.99, '');
  }

  // --- The early answer is not the ONLY signal. ---
  {
    const backstop = asked('no', { meds: 'I see a nephrologist for CKD stage 3' });
    check('H', 'answering No does not override a declared CKD elsewhere in the intake',
      deriveKdMedicalContext(backstop).restrictProteinTarget === true,
      'the early question became the only signal, so free text no longer protects anyone');
  }

  // --- Unanswered is not "no". ---
  {
    const ctx = deriveKdMedicalContext(asked(undefined));
    check('H', 'an unrecorded answer fails CLOSED, it is not read as No',
      ctx.restrictProteinTarget === true, '');
  }
}

// ===========================================================================
// GROUP I — PERSISTENCE. One source of truth, not two.
// ---------------------------------------------------------------------------
// The early answer is given on the first screen, long before payment. If it lived
// only in client state it would be a second, contradictory source of truth — the
// exact shape of the defect this whole change removed. It must survive into the
// authoritative record and be the same value the report generator later reads.
// ===========================================================================
{
  const client = fs.readFileSync(KD_PUBLIC_JS, 'utf8');
  const html = fs.readFileSync(KD_INDEX_HTML, 'utf8');
  const worker = fs.readFileSync(WORKER_JS, 'utf8');

  check('I', 'the question is asked in the intake form',
    /data-seg="kidney"/.test(html), '');
  check('I', 'with all three answers the worker understands',
    ['no', 'yes', 'unsure'].every(v => new RegExp(`data-val="${v}"`).test(html)), '');
  check('I', 'and it is asked BEFORE the free results block',
    html.indexOf('id="kidneyField"') > -1 &&
    html.indexOf('id="kidneyField"') < html.indexOf('id="freeResults"'),
    'the protein figure would be shown before the safety question was answered');
  // SCOPED. An unscoped match here is satisfied by any of the three call sites, so
  // deleting it from the session-create payload left this green — the same masking
  // that hid three earlier mutations. Each site is asserted where it lives.
  const sessionCreatePayload = (() => {
    // Anchored on the CREATE call. The first `API_BASE+'/session'` in the file is the
    // PATCH inside updateSession(), which is a different write entirely.
    const i = client.indexOf("sessionReady=fetch(API_BASE+'/session'");
    return i === -1 ? '' : client.slice(i, i + 1600);
  })();
  check('I', 'the session-create call is locatable', sessionCreatePayload.length > 0, '');
  check('I', 'the browser sends the answer when the session is created',
    /kidney_status:kidneyStatus\(\)/.test(sessionCreatePayload),
    'the answer is not stored until some later PATCH lands');
  check('I', 'and re-sends it if the customer changes their mind',
    /\[data-seg="kidney"\][\s\S]{0,600}?updateSession\(\{kidney_status:kidneyStatus\(\)\}\)/.test(client),
    'changing the answer no longer updates the authoritative row');
  check('I', 'the worker persists it on session create',
    /kidney_status:\s*KIDNEY_ANSWERS\.has/.test(worker), '');
  check('I', 'and accepts a correction on session update',
    /updates\.kidney_status\s*=\s*b\.kidney_status/.test(worker), '');
  check('I', 'only the three real answers are storable',
    /KIDNEY_ANSWERS = new Set\(\['no', 'yes', 'unsure'\]\)/.test(worker), '');

  // THE ROUND TRIP: stored column -> authoritative intake -> medical context.
  for (const answer of ['no', 'yes', 'unsure']) {
    const intake = validateIntake(normalizeIntake({ ...ROW, kidney_status: answer }));
    check('I', `round trip: '${answer}' survives the DB row into authoritative intake`,
      intake.kidneyStatus === answer, `got ${intake.kidneyStatus}`);
    check('I', `round trip: report-generation medical context sees the same '${answer}'`,
      deriveKdMedicalContext(intake).kidneyAnswer === answer, '');
    check('I', `round trip: suppression follows the stored answer for '${answer}'`,
      deriveKdMedicalContext(intake).restrictProteinTarget === (answer !== 'no'), '');
  }

  // The column is REQUIRED, so a session that never asked cannot buy or generate.
  let err = null;
  try { validateIntake(normalizeIntake({ ...ROW, kidney_status: null })); } catch (e) { err = e; }
  check('I', 'a row where the question was never asked is refused, not defaulted to No',
    err instanceof IntakeError && err.missing.some(m => /kidney/i.test(m)),
    err ? err.missing.join(', ') : 'an intake with no kidney answer was accepted');

  for (const bogus of ['maybe', 'NO ', 'true', '']) {
    let e2 = null;
    try { validateIntake(normalizeIntake({ ...ROW, kidney_status: bogus })); } catch (e) { e2 = e; }
    check('I', `an answer outside the three options is rejected: ${JSON.stringify(bogus)}`,
      e2 instanceof IntakeError, '');
  }

  // ONE SOURCE OF TRUTH: the answer must not have been smuggled into `conditions`,
  // which would make the Doctor's Report assert a diagnosis for an "I'm not sure".
  const unsure = validateIntake(normalizeIntake({ ...ROW, kidney_status: 'unsure', conditions: [] }));
  check('I', 'an "I\'m not sure" answer does not fabricate a declared kidney condition',
    !unsure.conditions.includes('kidney'), '');
  check('I', 'and the report does not state kidney disease as something they reported',
    !/Kidney disease \/ CKD/i.test(generateDoctorReport('Linda', unsure)),
    'suppression turned into diagnosis: the report claims a condition the customer never declared');
}

// ===========================================================================
// GROUP J — THE VOCABULARY BRIDGE.
// ---------------------------------------------------------------------------
// calculator_sessions_v2 is shared with Carnivore Weekly and its CHECK constraints
// encode CW's vocabulary. KetoDial's step-2 selects have no `value` attributes, so
// the browser submits the option TEXT. Verified against the real table on
// 2026-09-08: every KD value violates a constraint, PostgREST rejects the whole
// PATCH, and conditions + medications + symptoms + step_completed=2 die with it.
// Every live KD row shows exactly that damage.
//
// The translation must be lossless in BOTH directions: reports.js decides dairy
// handling by substring, so storing the bare enum and handing it to the generator
// would quietly change which meals a dairy-sensitive customer receives.
// ===========================================================================
{
  const cases = [
    ['dairy_tolerance', 'A little bothers me', 'some', 'a little bothers me'],
    ['dairy_tolerance', 'Strict dairy-free', 'none', 'strict dairy-free'],
    ['dairy_tolerance', 'I love dairy', 'full', 'fine with dairy'],
    ['cooking_skill', 'Basic — I can follow a recipe', 'beginner', 'Basic'],
    ['cooking_skill', 'Chef-level', 'advanced', 'Chef-level'],
    ['meal_prep_time', 'About 30 min/day', 'some', 'About 30 min/day'],
    ['family_situation', 'Just me', 'solo', 'Just me'],
    ['budget', 'mod', 'moderate', 'mod'],
    ['budget', 'flex', 'flexible', 'flex'],
    ['budget', 'tight', 'tight', 'tight'],
  ];
  const COLUMN_TO_INTAKE = {
    dairy_tolerance: 'dairy', cooking_skill: 'cooking',
    meal_prep_time: 'prepTime', family_situation: 'cookingFor', budget: 'budget',
  };
  for (const [field, kdValue, stored, backOut] of cases) {
    check('J', `"${kdValue}" is stored as "${stored}"`,
      toStoredVocabulary(field, kdValue) === stored,
      `got ${toStoredVocabulary(field, kdValue)}`);
    const intake = normalizeIntake({ ...ROW, [field]: stored });
    check('J', `  ...and reads back as "${backOut}" for the generators`,
      intake[COLUMN_TO_INTAKE[field]] === backOut,
      `got ${intake[COLUMN_TO_INTAKE[field]]}`);
  }

  // Behaviour preservation is the point, not the strings.
  const dairyCase = (stored) => normalizeIntake({ ...ROW, dairy_tolerance: stored }).dairy.toLowerCase();
  check('J', 'a dairy-free customer still reads as dairy-free to the meal builder',
    /free|none|strict/.test(dairyCase('none')), '');
  check('J', 'a dairy-sensitive customer still reads as dairy-light',
    /light|little|bother/.test(dairyCase('some')), '');
  check('J', 'a dairy-fine customer reads as neither',
    !/free|none|strict|light|little|bother/.test(dairyCase('full')), '');

  // An unmappable preference is omitted, never allowed to fail the write that
  // carries the medical answers.
  check('J', 'an unrecognised preference yields undefined, so the caller can omit it',
    toStoredVocabulary('budget', 'lavish') === undefined, '');
  check('J', 'an already-stored value passes through unchanged (replay safety)',
    toStoredVocabulary('budget', 'moderate') === 'moderate', '');
  check('J', 'an empty answer is omitted rather than written as an invalid value',
    toStoredVocabulary('cooking_skill', '') === undefined, '');
}

// ===========================================================================
// GROUP K — THE INTAKE FORM'S VALUES ARE AN API CONTRACT.
// ---------------------------------------------------------------------------
// The vocabulary bridge is a compatibility layer. This group is the actual fix.
//
// Until 2026-09-08 the step-2 <option> tags had no value= attributes, so the browser
// submitted the LABEL TEXT into columns with CHECK constraints. Visible copy was the
// API contract, which means a copywriter improving "Basic — I can follow a recipe"
// would have silently destroyed the customer's medications — the PATCH fails as a
// unit and takes conditions, medications, symptoms and step_completed with it.
//
// Every option now carries an explicit value, and every value must be one the shared
// table accepts. THIS GROUP IS THE THING THAT STOPS IT REGRESSING: labels are free
// to change, values are not.
//
// The allowed sets are copied from the live CHECK constraints on
// calculator_sessions_v2, read on 2026-09-08 via pg_get_constraintdef.
// ===========================================================================
{
  const html = fs.readFileSync(KD_INDEX_HTML, 'utf8');
  const step2 = html.slice(html.indexOf('id="step2"'), html.indexOf('id="step2"') + 20000);

  const ALLOWED = {
    'Dairy tolerance': ['none', 'butter-only', 'some', 'full'],
    'Cooking skill': ['beginner', 'intermediate', 'advanced'],
    'Meal-prep time': ['minimal', 'some', 'lots'],
    'Who are you cooking for?': ['solo', 'partner', 'family-with-kids', 'large-household'],
  };
  const selects = [...step2.matchAll(/<select[\s\S]*?<\/select>/g)].map(m => m[0]);
  const labels = Object.keys(ALLOWED);

  check('K', 'the four constrained selects are still present',
    selects.length === labels.length, `found ${selects.length}, expected ${labels.length}`);

  selects.forEach((sel, i) => {
    const label = labels[i];
    const options = [...sel.matchAll(/<option([^>]*)>/g)].map(m => m[1]);
    const values = options.map(a => (a.match(/value="([^"]*)"/) || [])[1]);

    check('K', `${label}: every option declares an explicit value=`,
      values.every(v => v !== undefined),
      `${values.filter(v => v === undefined).length} option(s) fall back to their label text`);

    const bad = values.filter(v => v !== undefined && !ALLOWED[label].includes(v));
    check('K', `${label}: every value is one the shared table accepts`,
      bad.length === 0,
      bad.length ? `${bad.join(', ')} — not in [${ALLOWED[label].join('|')}]; PostgREST will 23514 the whole PATCH`
                 : '');
  });

  // Budget is chips, not a select, and had the same defect ('mod' / 'flex').
  const budgetSeg = step2.match(/data-seg="budget"[\s\S]*?<\/div>/);
  check('K', 'the budget chips are present', !!budgetSeg, '');
  if (budgetSeg) {
    const vals = [...budgetSeg[0].matchAll(/data-val="([^"]*)"/g)].map(m => m[1]);
    const allowedBudget = ['tight', 'moderate', 'flexible'];
    const bad = vals.filter(v => !allowedBudget.includes(v));
    check('K', 'every budget chip value is one the shared table accepts', bad.length === 0,
      bad.length ? `${bad.join(', ')} — not in [${allowedBudget.join('|')}]` : '');
  }

  // What the browser will now submit must survive the write path untouched.
  for (const [field, vals] of Object.entries({
    dairy_tolerance: ['none', 'some', 'full'],
    cooking_skill: ['beginner', 'intermediate', 'advanced'],
    meal_prep_time: ['minimal', 'some', 'lots'],
    family_situation: ['solo', 'partner', 'family-with-kids', 'large-household'],
    budget: ['tight', 'moderate', 'flexible'],
  })) {
    for (const v of vals) {
      check('K', `${field}="${v}" passes through the bridge unchanged`,
        toStoredVocabulary(field, v) === v, `became ${toStoredVocabulary(field, v)}`);
    }
  }

  // And the bridge still rescues a session created BEFORE this change, which is the
  // only reason to keep it now that the form sends the right thing.
  check('K', 'legacy label text is still translated, for sessions predating the fix',
    toStoredVocabulary('dairy_tolerance', 'A little bothers me') === 'some' &&
    toStoredVocabulary('budget', 'mod') === 'moderate', '');
}

// ===========================================================================
// GROUP KA — EVERY CONSTRAINED COLUMN GOES THROUGH THE VOCABULARY BRIDGE.
// ---------------------------------------------------------------------------
// PRODUCTION INCIDENT, 2026-09-09, caused by the Audit 2B deploy itself.
// lifestyle_activity was persisted straight from the client, which sends the TDEE
// multiplier (1.2 .. 1.9). The column's CHECK constraint accepts five words, so
// EVERY POST /session returned 500 the moment the worker shipped and no customer
// could reach checkout. GROUP K already pinned the option VALUES; this pins the one
// numeric field that never went through the bridge those values exist for.
// ===========================================================================
{
  const { activityToStored } = await import('file://' + INTAKE_JS + '?ka=' + Date.now());
  const ALLOWED = new Set(['sedentary', 'light', 'moderate', 'very', 'extreme']);

  // The five multipliers the calculator can actually produce.
  for (const [mult, word] of [[1.2, 'sedentary'], [1.375, 'light'], [1.55, 'moderate'],
                              [1.725, 'very'], [1.9, 'extreme']]) {
    check('KA', `activity ${mult} stores as "${word}"`, activityToStored(mult) === word,
      String(activityToStored(mult)));
  }
  // Anything the constraint would reject becomes null instead of failing the insert.
  for (const bad of ['garbage', {}, [], NaN, undefined, null, '']) {
    const out = activityToStored(bad);
    check('KA', `an unmappable activity (${JSON.stringify(bad) || String(bad)}) becomes null, not a 500`,
      out === null || ALLOWED.has(out), String(out));
  }
  // And both write paths use it, rather than one of them passing the number through.
  const worker = fs.readFileSync(WORKER_JS, 'utf8');
  check('KA', 'session CREATE maps the activity before insert',
    /lifestyle_activity: activityToStored\(b\.lifestyle_activity\)/.test(worker), '');
  check('KA', 'session PATCH maps it too',
    /setIfSent\('lifestyle_activity', b\.lifestyle_activity === undefined/.test(worker), '');
  check('KA', 'no raw client activity value reaches a column anywhere',
    !/lifestyle_activity: b\.lifestyle_activity \|\| null/.test(worker) &&
    !/setIfSent\('lifestyle_activity', b\.lifestyle_activity\)/.test(worker),
    'the number would violate the CHECK constraint and 500 the whole write');
}

// ===========================================================================
// GROUP L — PURCHASE ELIGIBILITY IS NOT REPORT ELIGIBILITY.
// ---------------------------------------------------------------------------
// These were one function, and that was a funnel bug wearing a safety costume.
// ketodial.js moves the priced picker ABOVE the step-2 profile on purpose ("so
// prices are visible without completing the 12-field profile"), and the profile's
// own heading says "Most are optional". Requiring it at checkout told a willing
// buyer to finish a questionnaire the product calls optional.
//
// Both halves are asserted here. Loosening the purchase bar is only correct if the
// REPORT bar stays exactly where it was.
// ===========================================================================
{
  // A real session that stopped after step 1: calculator done, kidney answered,
  // profile skipped. This is the customer the old code turned away.
  const step1Only = (kidney) => ({
    ...ROW, kidney_status: kidney, step_completed: 1,
    conditions: null, symptoms: null, medications: null,
    dairy_tolerance: null, cooking_skill: null, meal_prep_time: null,
    family_situation: null, budget: null, biggest_challenge: null, previous_diets: null,
  });

  for (const kidney of ['no', 'yes', 'unsure']) {
    const row = step1Only(kidney);
    let purchaseErr = null, intake = null;
    try { intake = validatePurchaseIntake(normalizeIntake(row)); } catch (e) { purchaseErr = e; }

    check('L', `kidney=${kidney}, no step 2: the purchase boundary ACCEPTS them`,
      purchaseErr === null,
      purchaseErr ? `${purchaseErr.code}: ${purchaseErr.missing.join(', ')} — a willing buyer was turned away`
                  : '');

    if (intake) {
      const offer = allowedProducts(deriveKdMedicalContext(intake));
      if (kidney === 'no') {
        check('L', 'kidney=no, no step 2: the full product set can reach checkout',
          offer.allowed.length === 5 && offer.blocked.length === 0, offer.blocked.join(','));
      } else {
        check('L', `kidney=${kidney}, no step 2: Doctor + Starter can reach checkout`,
          offer.allowed.includes('doctor') && offer.allowed.includes('starter'),
          `allowed: ${offer.allowed.join(',')}`);
        check('L', `kidney=${kidney}, no step 2: meal and its bundles still cannot`,
          offer.blocked.includes('meal') && offer.blocked.includes('essentials') &&
          offer.blocked.includes('protocol'), `blocked: ${offer.blocked.join(',')}`);
      }
    }

    // THE OTHER HALF: the same row must still be refused a REPORT.
    let reportErr = null;
    try { validateIntake(normalizeIntake(row)); } catch (e) { reportErr = e; }
    check('L', `kidney=${kidney}, no step 2: report generation still REFUSES`,
      reportErr instanceof IntakeError,
      'the report bar was loosened along with the purchase bar');
    check('L', `  ...and says the profile is unfinished, not that data was lost`,
      reportErr && reportErr.code === 'INTAKE_PROFILE_NOT_COMPLETED',
      reportErr ? reportErr.code : '');
    check('L', `  ...and no generator will render from it`,
      (() => { try { generateDoctorReport('L', normalizeIntake(row)); return false; }
               catch (e) { return e instanceof IntakeError; } })(), '');
  }

  // The purchase bar must stay STRICTLY weaker, never weaker on the things that
  // make a purchase honest.
  const noKidney = { ...ROW, kidney_status: null, step_completed: 1, conditions: null, medications: null };
  let e1 = null;
  try { validatePurchaseIntake(normalizeIntake(noKidney)); } catch (e) { e1 = e; }
  // NAMED PRECISELY. A looser assertion (`err.missing.some(/kidney/i)`) was satisfied
  // by the plausibility check reporting "kidneyStatus", so deleting the requirement
  // outright left this green — the assertion passed through a different mechanism
  // than the one it was written to pin. Mutation testing is how that surfaced.
  check('L', 'purchase is refused when the kidney answer is missing — it decides what we may sell',
    e1 instanceof IntakeError && e1.code === 'PURCHASE_INTAKE_INCOMPLETE' &&
    e1.missing.includes('kidney safety answer'),
    e1 ? `${e1.code}: ${e1.missing.join(', ')}` : 'a purchase with no kidney answer was accepted');

  for (const [what, row] of [
    ['body data', { ...ROW, weight_value: null, step_completed: 1, conditions: null, medications: null }],
    ['macros', { ...ROW, calculated_macros: null, step_completed: 1, conditions: null, medications: null }],
    ['a sane weight', { ...ROW, weight_value: '4000', step_completed: 1, conditions: null, medications: null }],
  ]) {
    let e2 = null;
    try { validatePurchaseIntake(normalizeIntake(row)); } catch (e) { e2 = e; }
    check('L', `purchase is still refused without ${what}`, e2 instanceof IntakeError, '');
  }

  // Anything the purchase bar accepts, the report bar must also demand.
  check('L', 'the report validator is strictly stronger than the purchase validator',
    (() => {
      const full = normalizeIntake(ROW);
      try { validatePurchaseIntake(full); validateIntake(full); } catch { return false; }
      const weakened = normalizeIntake(step1Only('no'));
      let purchaseOk = true, reportOk = true;
      try { validatePurchaseIntake(weakened); } catch { purchaseOk = false; }
      try { validateIntake(weakened); } catch { reportOk = false; }
      return purchaseOk && !reportOk;
    })(), '');

  const worker = fs.readFileSync(WORKER_JS, 'utf8');
  check('L', 'checkout uses the purchase boundary',
    /loadIntakeForPurchase\(token, env\)/.test(worker), '');
  check('L', 'the webhook and report paths still use the full report boundary',
    (worker.match(/loadAuthoritativeIntake\(/g) || []).length >= 2, '');
}

// ===========================================================================
// GROUP M — "I'M NOT SURE" IS NOT A DIAGNOSIS.
// ---------------------------------------------------------------------------
// Yes and Unsure get IDENTICAL safety behaviour. They are not the same statement
// about the reader. Until 2026-09-08 the suppression copy said "You told us about
// kidney disease" to both, which puts a diagnosis in the mouth of someone who
// answered "I'm not sure" — on a document they may hand to a clinician.
// ===========================================================================
{
  const withKidney = (kidney, extra = {}) => ({
    ...legacyFormDataShape(ROW), kidneyStatus: kidney, conditions: [], meds: '', ...extra });
  const text = h => h.replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');

  const unsure = withKidney('unsure');
  const yes = withKidney('yes');
  const unsureWhoAlsoTicked = withKidney('unsure', { conditions: ['kidney'] });

  // Safety first: unchanged.
  for (const [label, d] of [['unsure', unsure], ['yes', yes]]) {
    const ctx = deriveKdMedicalContext(d);
    check('M', `${label}: still restricted`, ctx.restrictProteinTarget === true, '');
    const all = text(generateDoctorReport('L', d) + generateMealPlan('L', d) + generateStarterKit('L', d));
    check('M', `${label}: still receives no personalized protein target`,
      !new RegExp(`\\b${d.proteinG}\\s*g\\b`).test(all), '');
    check('M', `${label}: and no substitute protein number`,
      !/\b\d{1,3}\s*g\s*(?:of\s+)?protein\b/i.test(all) &&
      !/protein[^.]{0,40}?\b\d{1,3}\s*g\b/i.test(all), '');
  }

  // Wording: the whole point of this group.
  const unsureAll = text(generateDoctorReport('L', unsure) + generateMealPlan('L', unsure) +
                         generateStarterKit('L', unsure));
  check('M', 'unsure: is NOT described as having told us about kidney disease',
    !/told us about kidney disease/i.test(unsureAll),
    'an "I am not sure" answer is being reported back as a declaration');
  check('M', 'unsure: is NOT described as having REPORTED kidney disease',
    !/reported kidney disease/i.test(unsureAll), '');
  check('M', 'unsure: the wording says they could not rule it out',
    /not sure whether your kidney function is reduced/i.test(unsureAll),
    'the neutral wording is missing, so the reader is told nothing about why');

  const yesAll = text(generateDoctorReport('L', yes) + generateMealPlan('L', yes));
  check('M', 'yes: DOES get the diagnosis-appropriate wording',
    /told us about kidney disease/i.test(yesAll),
    'a real declaration was softened into the unsure wording');

  // Someone who answered unsure AND ticked the condition has declared it.
  const bothAll = text(generateDoctorReport('L', unsureWhoAlsoTicked));
  check('M', 'unsure + kidney condition ticked: treated as a declaration',
    deriveKdMedicalContext(unsureWhoAlsoTicked).kidneyConditionDeclared === true &&
    /told us about kidney disease/i.test(bothAll), '');

  // Unit level, so a wording regression is attributable.
  check('M', 'kdProteinSuppressionNote branches on the distinction',
    /not sure whether your kidney function is reduced/i
      .test(kdProteinSuppressionNote(deriveKdMedicalContext(unsure))) &&
    /told us about kidney disease/i
      .test(kdProteinSuppressionNote(deriveKdMedicalContext(yes))), '');

  check('M', 'the meal-plan referral states the kidney check honestly for an unsure customer',
    /not a reported diagnosis/i.test(text(generateMealPlan('L', unsure))), '');
}

// ===========================================================================
// GROUP N — CI MUST RUN ON THE LIVE INTAKE UI.
// ---------------------------------------------------------------------------
// ketodial/public is a submodule. Its gitlink is where the kidney question and the
// option value= contract actually live, so a pointer bump changes what real
// customers submit. If the workflow does not watch that path, the KD safety suite
// does not run on the one change most likely to break it.
// ===========================================================================
{
  const yml = fs.readFileSync(WORKFLOW_YML, 'utf8');
  const section = (name) => {
    const i = yml.indexOf(`  ${name}:`);
    if (i === -1) return '';
    const rest = yml.slice(i + 1);
    const end = rest.search(/\n  [a-z_]+:/);
    return end === -1 ? rest : rest.slice(0, end);
  };
  for (const trigger of ['push', 'pull_request']) {
    const body = section(trigger);
    check('N', `${trigger} watches the ketodial/public submodule gitlink`,
      /^\s*- 'ketodial\/public'\s*$/m.test(body),
      'a change to the live intake UI would not run the KD safety suite');
    // The schema the safety code depends on. GROUP P mutation-tests this file, but a
    // migration-only edit would not have triggered the guard at all — so a backfill
    // giving every legacy customer a kidney answer nobody gave could have landed with
    // none of those tests running. Third instance of this exact hole.
    check('N', `${trigger} watches the Audit 2B migration`,
      /^\s*- 'supabase\/migrations\/20260908_kd_audit2b_kidney_status_and_delivery_marker\.sql'\s*$/m.test(body),
      'a migration-only change would bypass the safety suite that mutation-tests it');
    // The resume-token columns. Same hole, same fix: the email link's credential
    // model depends on this schema, so a migration-only edit must run the suites.
    check('N', `${trigger} watches the resume-token migration`,
      /^\s*- 'supabase\/migrations\/20260909_kd_audit2b_resume_token\.sql'\s*$/m.test(body),
      'a migration-only change would bypass the suites that pin the credential split');
    for (const p of ['ketodial/worker/index.js', 'ketodial/worker/reports.js', 'ketodial/worker/intake.js']) {
      check('N', `${trigger} watches ${p}`,
        new RegExp(`^\\s*- '${p.replace(/\//g, '\\/')}'\\s*$`, 'm').test(body), '');
    }
    check('N', `${trigger} watches all five KD suites`,
      /tests\/kd-report-safety\.test\.mjs/.test(body) &&
      /tests\/kd-intake-authority\.test\.mjs/.test(body) &&
      // Added 2026-09-08 with the conversion pass. It is the only suite that proves
      // the immediate upgrade card derives its offer from productAvailable() rather
      // than from a second, hand-written product list — the precise way a Meal Plan
      // could get advertised to a renal customer again.
      /tests\/kd-upgrade-offer\.test\.mjs/.test(body) &&
      // The free-results email. Auto-sent seconds after the first result, so it is
      // the highest-volume surface the renal gate has to hold on.
      /tests\/kd-plan-email\.test\.mjs/.test(body) &&
      /tests\/kd-schema-contract\.test\.mjs/.test(body), '');
    check('N', `${trigger} watches every migration, not just the two Audit 2B ones`,
      /^\s*- 'supabase\/migrations\/\*\*'\s*$/m.test(body),
      'a constraint added elsewhere would not re-run the schema contract test');
  }
  check('N', 'the report job still checks out submodules',
    /submodules:\s*true/.test(yml),
    'without this the intake assertions fail because the file is simply absent');
  check('N', 'the authoritative intake suite is a gating step',
    /node tests\/kd-intake-authority\.test\.mjs/.test(yml), '');
  check('N', 'the upgrade-offer suite is a gating step',
    /node tests\/kd-upgrade-offer\.test\.mjs/.test(yml), '');
  check('N', 'the free-results email suite is a gating step',
    /node tests\/kd-plan-email\.test\.mjs/.test(yml), '');
  // The schema contract. The 2026-09-09 outage happened because nothing in CI ever
  // performed a real INSERT, so a client-vs-schema vocabulary mismatch was invisible
  // until production. If this stops gating, that blind spot reopens.
  check('N', 'the database schema contract is a gating step',
    /node tests\/kd-schema-contract\.test\.mjs/.test(yml), '');
  // package-lock.json is gitignored here, so `npm ci` would fail on a missing
  // lockfile before it ever reached a defect.
  // Comment lines are stripped first: the job's own comment EXPLAINS why `npm ci`
  // cannot be used here, and matching that would flag the explanation as the thing
  // it warns against.
  const ymlRuns = yml.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const schemaJob = ymlRuns.slice(ymlRuns.indexOf('schema-contract:'),
                                 ymlRuns.indexOf('report-suites:'));
  check('N', 'and CI installs the dependency it needs, without needing a lockfile',
    /npm install[^\n]*pglite/.test(schemaJob) && !/npm ci/.test(schemaJob),
    'the job would fail on tooling rather than on a defect: package-lock.json is gitignored');
  check('N', 'the pinned version is the single source of truth',
    /devDependencies\['@electric-sql\/pglite'\]/.test(yml), '');
}

// ===========================================================================
// GROUP O — PAID FULFILMENT IS RESUMABLE, AND NEVER SILENT.
// ---------------------------------------------------------------------------
// Splitting purchase from report eligibility let a customer pay after step 1. The
// webhook then could not build a report, and it logged NO REPORT SENT, returned 200
// to Stripe and sent nothing — a paying customer heard silence. The recovery the
// error page suggested did not work either: Stripe redirects to a freshly loaded
// page where sessionToken is null and nothing restores it, so the profile could not
// be attached to the paid order.
//
// These are source-level invariants so they hold in CI without credentials; the
// behaviour itself is proven end to end in tests/kd-integration-live.test.mjs.
// ===========================================================================
{
  const worker = fs.readFileSync(WORKER_JS, 'utf8');
  const client = fs.readFileSync(KD_PUBLIC_JS, 'utf8');
  const code = worker.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const clientCode = client.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');

  check('O', 'the webhook does NOT go silent on an unfinished profile',
    /INTAKE_PROFILE_NOT_COMPLETED[\s\S]{0,400}?sendFinishProfileEmail/.test(code),
    'a paying customer with an unfinished profile is told nothing');
  // The host moved behind appBaseUrl(env) so the harness can follow this link; what
  // matters here is that the link still carries THAT session id.
  check('O', 'the finish-profile email links back to THAT paid session',
    /\?finish=\$\{encodeURIComponent\(stripeSessionId\)\}/.test(worker), '');

  check('O', 'the profile can be saved keyed on a paid Stripe session, not just a token',
    /b\.stripe_session_id[\s\S]{0,200}?resolvePaidCheckout/.test(code),
    'post-payment completion is impossible: the browser has no token after the redirect');
  // SCOPED TO THE FUNCTION. An unscoped scan for the paid check matched
  // handleReport's identical guard in a different function, so deleting this one
  // left the assertion green — it was passing through a mechanism it did not name.
  const resolveBody = (() => {
    const i = code.indexOf('async function resolvePaidCheckout');
    if (i === -1) return '';
    const j = code.indexOf('\nasync function', i + 10);
    const k = code.indexOf('\nfunction', i + 10);
    const end = Math.min(...[j, k].filter(x => x > -1).concat([code.length]));
    return code.slice(i, end);
  })();
  check('O', 'resolvePaidCheckout exists', resolveBody.length > 0, '');
  check('O', 'and that key only resolves for a PAID session',
    /payment_status !== 'paid'/.test(resolveBody) && /403/.test(resolveBody),
    'an unpaid checkout id could write to somebody\'s row');
  check('O', 'and only for a well-formed checkout id',
    /\^cs_/.test(resolveBody), '');
  check('O', 'the raw session token is never handed back to the browser',
    !/token:\s*resolved\.token/.test(code) && !/json.*\btoken\b.*resolved/.test(code), '');

  check('O', 'there is a purchase-status endpoint the success screen can read',
    /\/purchase\//.test(code) && /handlePurchaseStatus/.test(code), '');
  check('O', 'there is a fulfilment endpoint for late profile completion',
    /'\/fulfill'/.test(code) && /handleFulfill/.test(code), '');
  check('O', 'late fulfilment is idempotent',
    /reports_delivered_at[\s\S]{0,200}?alreadyDelivered/.test(code) && /markDelivered/.test(code),
    'a double click would email the customer twice');
  check('O', 'the happy path records delivery too, so "paid but not delivered" is answerable',
    /await sendReportEmail\([\s\S]{0,600}?markDelivered/.test(code),
    'the webhook no longer records a successful delivery at all');

  // The success screen.
  check('O', 'the success screen renders from the server, not a hardcoded report list',
    /loadPurchaseStatus/.test(clientCode) && /status\.purchased/.test(clientCode),
    'it shows reports the customer may never have bought');
  check('O', 'it no longer hardcodes all three reports',
    !/name:'7-Day Meal Plan',type:'meal'/.test(clientCode),
    'a renal customer is still offered a meal plan they were correctly not sold');
  check('O', 'the post-payment submit carries the Stripe session id',
    /payload\.stripe_session_id\s*=\s*paidSessionId/.test(clientCode), '');
  check('O', 'and the finish link from the email is honoured',
    /urlParams\.get\('finish'\)/.test(clientCode), '');

  // The race hole: a later success must not clear an earlier failure.
  // The response handler must not clear anything: checkout queues step_completed:3,
  // and its success would otherwise erase an earlier failed profile save. Clearing
  // belongs only to the checkpoint, and only once the checkpoint has landed.
  const responseHandler = clientCode.slice(
    clientCode.indexOf('.then(function(r){'), clientCode.indexOf('}).catch(function(e){'));
  check('O', 'a write failure is sticky, not cleared by the next successful write',
    /writeFailures\+\+/.test(clientCode) && /writeFailures>0/.test(clientCode) &&
    !/lastWriteError=null/.test(responseHandler),
    'a successful unrelated write still clears an earlier failure');
  check('O', 'and only a landed profile checkpoint clears it',
    /updateSession\(collectProfile\(\)\)\.then\(function\(\)\{[\s\S]{0,300}?writeFailures=0/.test(clientCode),
    'failures are cleared somewhere other than after a successful checkpoint');
  check('O', 'one profile collector serves both the pre- and post-payment submits',
    (clientCode.match(/collectProfile\(\)/g) || []).length >= 2, '');
}

// ===========================================================================
// GROUP P — DELIVERY TRUTHFULNESS, IDEMPOTENCY, AND THE DB VOCABULARY.
// ---------------------------------------------------------------------------
// Source-level invariants for the fourth review's findings. Behaviour is proven
// against the real database in tests/kd-integration-live.test.mjs; these hold in CI
// without credentials.
// ===========================================================================
{
  const worker = fs.readFileSync(WORKER_JS, 'utf8');
  const code = worker.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const client = fs.readFileSync(KD_PUBLIC_JS, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const fnBody = (name) => {
    const i = code.indexOf(name);
    if (i === -1) return '';
    const rest = code.slice(i + name.length);
    const end = rest.search(/\n(?:async )?function /);
    return end === -1 ? rest : rest.slice(0, end);
  };

  // --- 1. A failed send must never be recorded as a delivery. ---
  check('P', 'a non-2xx Resend response throws instead of returning normally',
    /RESEND_REJECTED/.test(code) && /throw new Error\(`RESEND_REJECTED/.test(worker),
    'a rejected send returns quietly and the caller marks it delivered');
  check('P', 'no Resend call swallows a failure with a bare console.error',
    !/console\.error\('Resend error:'/.test(code), '');
  check('P', 'the webhook marks delivery only AFTER the send returns',
    /await sendReportEmail\([\s\S]{0,400}?markDelivered/.test(code) &&
    /catch[\s\S]{0,240}?REPORT EMAIL NOT SENT[\s\S]{0,200}?return jsonResponse\(500/.test(code),
    'a send failure still reaches markDelivered, or is reported as success');
  check('P', '/fulfill returns a retryable failure rather than claiming success',
    /delivery_failed[\s\S]{0,120}?retryable: true/.test(code), '');
  check('P', 'markDelivered checks res.ok — a rejected PATCH is not success',
    /!res\.ok[\s\S]{0,200}?DELIVERY MARKER NOT WRITTEN[\s\S]{0,200}?return false/.test(fnBody('async function markDelivered')),
    'a rejected Supabase PATCH is indistinguishable from a written marker');
  check('P', 'and its result is inspected rather than discarded',
    /const marked = await markDelivered/.test(code), '');

  // --- 2. Deterministic idempotency keys. ---
  check('P', 'report delivery uses a deterministic key tied to the Stripe session',
    /report:\s*\(stripeSessionId\)\s*=>\s*`kd-report\/\$\{stripeSessionId\}`/.test(worker), '');
  check('P', 'the finish-profile reminder uses its own deterministic key',
    /finish:\s*\(stripeSessionId\)\s*=>\s*`kd-finish\/\$\{stripeSessionId\}`/.test(worker), '');
  check('P', 'the key is sent as an Idempotency-Key header',
    /'Idempotency-Key': idemKey/.test(worker), '');
  check('P', 'no send builds a random key per attempt',
    !/Idempotency-Key[^\n]*(?:randomUUID|Math\.random|Date\.now)/.test(worker),
    'a random key per retry defeats the entire mechanism');
  // Scoped to the two PAID delivery emails. handleEmailPlan sends the free
  // pre-purchase plan email; it already checks res.ok and returns 502, and has no
  // idempotency requirement, so it is not required to use the keyed helper.
  for (const fn of ['async function sendReportEmail', 'async function sendFinishProfileEmail']) {
    const body = fnBody(fn);
    check('P', `${fn.replace('async function ', '')} sends through the keyed helper`,
      /return resendSend\(/.test(body) && !/api\.resend\.com/.test(body),
      'this delivery posts to Resend directly, bypassing the idempotency key');
  }

  // --- 3. Stripe vocabulary vs the database vocabulary. ---
  check('P', "the webhook writes the DATABASE's word, not Stripe's",
    /payment_status: 'completed'/.test(code) && !/payment_status: 'paid'/.test(code),
    "writing Stripe's 'paid' makes PostgREST reject the whole writeback");
  check('P', 'the payment writeback still carries the money fields',
    /amount_paid_cents: session\.amount_total/.test(code) &&
    /stripe_payment_intent_id: session\.payment_intent/.test(code) &&
    /paid_at: nowIso/.test(code) && /payment_verified_at: nowIso/.test(code), '');
  check('P', 'is_premium is NOT written — premium_requires_payment needs a tier_id KD has none for',
    !/is_premium: true/.test(code),
    'is_premium=true is unsatisfiable without tier_id and rejects the entire patch');
  check('P', 'a failed writeback is logged loudly, not swallowed',
    /PAYMENT WRITEBACK FAILED/.test(code), '');

  // --- 4. The safety answer rides the checkpoint that clears failures. ---
  // SCOPED TO collectProfile's OWN BODY. Slicing to end-of-file matched the same
  // expression in the session-create payload and in the chip handler, so deleting it
  // from the checkpoint left this green. Third time an unscoped source match has
  // passed through a mechanism it did not name; scope every one of them.
  const collectProfileBody = (() => {
    const i = client.indexOf('function collectProfile');
    if (i === -1) return '';
    const rest = client.slice(i);
    const end = rest.indexOf('\n  }');
    return end === -1 ? rest : rest.slice(0, end);
  })();
  check('P', 'collectProfile() is present', collectProfileBody.length > 0, '');
  check('P', 'the profile checkpoint carries the current kidney answer',
    /kidney_status:kidneyStatus\(\)/.test(collectProfileBody),
    'a failed kidney write is erased by the profile submit and the server keeps the stale answer');
  check('P', 'failures are cleared only after the checkpoint has landed',
    !/writeFailures=0;\s*updateSession/.test(client) &&
    /updateSession\(collectProfile\(\)\)\.then/.test(client),
    'the counter is reset before the write, so a failed checkpoint looks clean');
  check('P', 'and only when that checkpoint itself succeeded',
    /lastCheckpointFailed/.test(client), '');

  // --- 5. The schema this code depends on is in the repository. ---
  const migDir = path.join(REPO, 'supabase', 'migrations');
  const mig = fs.existsSync(migDir)
    ? fs.readdirSync(migDir).filter(f => /kd_audit2b/.test(f)).map(f => fs.readFileSync(path.join(migDir, f), 'utf8')).join('\n')
    : '';
  check('P', 'a migration in the repo creates the schema the code expects', mig.length > 0,
    'production holds columns the repository cannot recreate');
  check('P', 'it adds kidney_status', /ADD COLUMN IF NOT EXISTS kidney_status/.test(mig), '');
  check('P', 'with the allowed-value constraint',
    /kidney_status IN \('no', 'yes', 'unsure'\)/.test(mig), '');
  check('P', 'it adds reports_delivered_at',
    /ADD COLUMN IF NOT EXISTS reports_delivered_at/.test(mig), '');
  check('P', 'it is idempotent against an already-migrated database',
    (mig.match(/IF NOT EXISTS/g) || []).length >= 3, '');
  check('P', 'and it backfills no customer health answer',
    !/UPDATE\s+public\.calculator_sessions_v2/i.test(mig) && !/SET DEFAULT '(no|yes|unsure)'/.test(mig),
    'a default kidney answer would be a safety answer nobody gave');
  check('P', 'nothing destructive',
    !/DROP\s+(TABLE|COLUMN)/i.test(mig) && !/TRUNCATE/i.test(mig), '');
  // The operational query is shared with Carnivore Weekly's rows. Unscoped it
  // returned 6 CW purchases from 2026-07-05 onward as KetoDial customers awaiting
  // delivery — CW's worker never writes this column, so it is NULL for all of them.
  check('P', "the paid-but-undelivered query is scoped to KetoDial",
    /source = 'ketodial'[\s\S]{0,120}?reports_delivered_at IS NULL/.test(mig),
    'the query surfaces Carnivore Weekly rows as stuck KetoDial fulfilments');
  check('P', 'and the index predicate matches that query',
    /WHERE source = 'ketodial'[\s\S]{0,120}?reports_delivered_at IS NULL/.test(mig), '');
}

// ===========================================================================
// GROUP Q — THE FREE PLAN EMAIL IS INSIDE THE GATE.
// ---------------------------------------------------------------------------
// The calculator auto-calls /email-plan seconds after the first free result. The
// page suppressed the protein figure for Yes / "I'm not sure" and the email then
// carried it in the subject line, a Protein row, "hit the protein number first",
// copy explaining why we set their protein high, and an upsell to the meal plan
// checkout had just refused to sell. Suppressed on one surface, emitted on another.
// ===========================================================================
{
  const worker = fs.readFileSync(WORKER_JS, 'utf8');
  const code = worker.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  const planFn = (() => {
    const i = code.indexOf('function buildPlanEmail');
    const rest = code.slice(i);
    const end = rest.search(/\n(?:async )?function /);
    return i === -1 ? '' : (end === -1 ? rest : rest.slice(0, end));
  })();
  const handler = (() => {
    const i = code.indexOf('async function handleEmailPlan');
    const rest = code.slice(i);
    const end = rest.search(/\n(?:async )?function /);
    return i === -1 ? '' : (end === -1 ? rest : rest.slice(0, end));
  })();

  check('Q', 'buildPlanEmail and handleEmailPlan are locatable',
    planFn.length > 0 && handler.length > 0, '');

  check('Q', 'the free email reads the kidney answer from the authoritative row',
    /readSessionRow\(b\.token, env\)/.test(handler) && /row\.kidney_status/.test(handler),
    'the email cannot know about the gate, so it prints what the page withheld');
  check('Q', 'and it fails closed when the answer is unknown',
    /kidneyStatus !== 'no'/.test(handler),
    'an unknown kidney answer is being treated as a negative one');
  // ASSERT THE ASSIGNMENT, NOT THE READ. Checking only for `row.calculated_macros`
  // stayed green when the assignment was deleted, because the value was still read
  // into a local that nothing used. Fifth instance of an assertion satisfied by a
  // mechanism other than the one it names.
  check('Q', 'macros come from the stored session, not the client',
    /stored\s*&&[\s\S]{0,80}?m\s*=\s*stored;/.test(handler),
    'the email trusts client-supplied numbers');
  check('Q', 'the subject line drops the protein figure when suppressed',
    /suppressProtein[\s\S]{0,200}?kcal[^`]*net carbs`/.test(handler) &&
    /suppressProtein\s*\n?\s*\?/.test(handler),
    'the number the page withheld is in the subject line');
  check('Q', 'the flag is passed into the email builder',
    /buildPlanEmail\([\s\S]{0,300}?suppressProtein,/.test(handler), '');

  // RENDER BOTH VARIANTS AND ASSERT ON THE OUTPUT. buildPlanEmail is pure, so the
  // real email can be produced here without credentials — far stronger than guessing
  // at distances between strings in the source, which is how the first version of
  // this group produced a false failure.
  const renderPlan = (() => {
    const m = worker.match(/function buildPlanEmail[\s\S]*?\n}/);
    if (!m) return null;
    try { return new Function('return (' + m[0] + ')')(); } catch { return null; }
  })();
  check('Q', 'buildPlanEmail can be rendered for assertion', typeof renderPlan === 'function', '');

  if (typeof renderPlan === 'function') {
    const MACROS = { calories: 1650, fatG: 128, proteinG: 118, carbG: 22, tdee: 2060 };
    const flat = (html) => html.replace(/<[^>]+>/g, ' | ').replace(/&[a-z]+;/g, ' ')
      .replace(/(\s*\|\s*)+/g, ' | ').replace(/[^\S\n]+/g, ' ');
    const open = flat(renderPlan(MACROS, 'lose', { age: 58, activity: 1.2, unsubUrl: '#' }));
    const shut = flat(renderPlan(MACROS, 'lose', { age: 58, activity: 1.2, unsubUrl: '#', suppressProtein: true }));

    check('Q', 'unsuppressed: the protein target is printed', /118 g/.test(open), '');
    check('Q', 'unsuppressed: the Full Protocol upsell is present', /Full Protocol/.test(open), '');
    check('Q', 'unsuppressed: the high-protein copy is present', /set your protein high/i.test(open), '');

    check('Q', 'suppressed: the protein figure appears nowhere',
      !/\b118\b/.test(shut), 'the number the page withheld is in the email');
    check('Q', 'suppressed: no substitute protein number',
      !/\b\d{1,3}\s*g\s*(?:of\s+)?protein\b/i.test(shut), '');
    check('Q', 'suppressed: routed to a clinician instead', /renal dietitian/i.test(shut), '');
    check('Q', 'suppressed: "hit the protein number first" is gone',
      !/hit the protein number/i.test(shut), '');
    check('Q', 'suppressed: no copy explaining why the protein target is high',
      !/set your protein high/i.test(shut) && !/needs more protein/i.test(shut), '');
    check('Q', 'suppressed: the meal-plan bundle is NOT advertised',
      !/Full Protocol/.test(shut) && !/7-day meal plan/i.test(shut),
      'the email upsells the product checkout would refuse to sell');
    // Matches what the two reports ARE, not one phrasing of them. The copy moved to
    // "A Doctor's Report for your next appointment" on 2026-09-08 and this assertion
    // failed on the wording while the behaviour was correct.
    check('Q', 'suppressed: the two deliverable reports are offered instead',
      /doctor\W{0,8}s report|doctor-ready report/i.test(shut) &&
      /starter kit/i.test(shut) && /9\.98/.test(shut), '');
    check('Q', 'suppressed: fat and carbs are still given — only protein is withheld',
      /128 g/.test(shut) && /22 g/.test(shut), '');
  }

  // CLAUDE.md: KetoDial replies go to the catch-all, never a personal inbox.
  check('Q', 'KetoDial replies go to the catch-all, not a personal inbox',
    !/iambrew@gmail\.com/.test(handler) && /ketodial@carnivoreweekly\.com/.test(handler),
    'KD subscriber replies are routed to a personal gmail address');
}

// ===========================================================================
// GROUP R — THE TEST-HARNESS OVERRIDES DEFAULT TO PRODUCTION.
// ---------------------------------------------------------------------------
// Two strings were hardcoded to production: the Stripe return URL and the report
// link base. A genuine TEST-mode end-to-end cannot use either — after paying in
// test mode the browser would land on the live site, and the emailed report links
// would point at the live worker, so the "test" would end by exercising production
// with test data.
//
// They are configurable now, and the ONLY acceptable default is exactly the string
// each replaced. An override that silently became the default would move production
// traffic to a test surface, which is far worse than the problem it solved.
// ===========================================================================
{
  const worker = fs.readFileSync(WORKER_JS, 'utf8');
  const mod = await import('file://' + WORKER_JS + '?groupR=' + Date.now());

  // Behavioural, not textual: call the worker with no env and read what it produces.
  // returnUrl() now delegates to appBaseUrl(), so both are extracted together —
  // evaluating one in isolation just throws ReferenceError, which would have read as
  // a broken test rather than the missing dependency it is.
  const returnUrlFn = (() => {
    const base = worker.match(/function appBaseUrl\(env\)[\s\S]*?\n}/);
    const m = worker.match(/function returnUrl\(env\)[\s\S]*?\n}/);
    return (base && m) ? new Function(`${base[0]}\n${m[0]}\nreturn returnUrl;`)() : null;
  })();
  const appBaseFn = (() => {
    const m = worker.match(/function appBaseUrl\(env\)[\s\S]*?\n}/);
    return m ? new Function('return (' + m[0] + ')')() : null;
  })();
  check('R', 'unset RETURN_URL_BASE gives exactly the production site',
    !!appBaseFn && appBaseFn({}) === 'https://ketodial.com' &&
    appBaseFn(undefined) === 'https://ketodial.com', `got ${appBaseFn && appBaseFn({})}`);
  const reportBaseFn = (() => {
    const m = worker.match(/function reportBaseUrl\(env\)[\s\S]*?\n}/);
    return m ? new Function('return (' + m[0] + ')')() : null;
  })();

  check('R', 'both overrides exist', !!returnUrlFn && !!reportBaseFn, '');
  if (returnUrlFn && reportBaseFn) {
    check('R', 'unset RETURN_URL_BASE gives exactly the production return URL',
      returnUrlFn({}) === 'https://ketodial.com/?success=true&session_id={CHECKOUT_SESSION_ID}' &&
      returnUrlFn(undefined) === 'https://ketodial.com/?success=true&session_id={CHECKOUT_SESSION_ID}',
      `got ${returnUrlFn({})}`);
    check('R', 'unset REPORT_BASE_URL gives exactly the production worker origin',
      reportBaseFn({}) === 'https://ketodial-api.iambrew.workers.dev' &&
      reportBaseFn(undefined) === 'https://ketodial-api.iambrew.workers.dev',
      `got ${reportBaseFn({})}`);
    check('R', 'an empty override falls back to production rather than an empty origin',
      returnUrlFn({ RETURN_URL_BASE: '' }).startsWith('https://ketodial.com') &&
      reportBaseFn({ REPORT_BASE_URL: '' }) === 'https://ketodial-api.iambrew.workers.dev', '');
    check('R', 'and a set override is honoured',
      returnUrlFn({ RETURN_URL_BASE: 'http://localhost:8797' })
        === 'http://localhost:8797/?success=true&session_id={CHECKOUT_SESSION_ID}' &&
      reportBaseFn({ REPORT_BASE_URL: 'http://127.0.0.1:8788' }) === 'http://127.0.0.1:8788', '');
  }

  check('R', 'the Stripe return URL is no longer hardcoded at the call site',
    !/append\('return_url', 'https:\/\/ketodial\.com/.test(worker), '');

  // The browser leg of the harness rewrites two constants in a COPY of the shipped
  // calculator. If either moves or changes shape, the harness silently serves a page
  // pointing at production with the LIVE publishable key — a "test" run that is not
  // one. Cheap to pin here, and impossible to notice otherwise.
  {
    const client = fs.readFileSync(KD_PUBLIC_JS, 'utf8');
    const apiRe = /var API_BASE='[^']*'/;
    const pkRe = /var STRIPE_PK='[^']*'/;
    check('R', 'the harness can still rewrite API_BASE', apiRe.test(client),
      'the constant moved; the harness would serve the production API base');
    check('R', 'the harness can still rewrite STRIPE_PK', pkRe.test(client),
      'the constant moved; the harness would serve the LIVE publishable key');
    const patched = client.replace(apiRe, "var API_BASE='http://localhost:8797/api'")
                          .replace(pkRe, "var STRIPE_PK='pk_test_harness'");
    check('R', 'and the rewrite removes every production surface from the served copy',
      !/ketodial-api\.iambrew\.workers\.dev/.test(patched.match(apiRe) || [''][0] || '') &&
      patched.includes("var API_BASE='http://localhost:8797/api'") &&
      patched.includes("var STRIPE_PK='pk_test_harness'") &&
      !/var STRIPE_PK='pk_live/.test(patched), '');
    check('R', 'the shipped file itself still carries the production values',
      /var API_BASE='https:\/\/ketodial-api\.iambrew\.workers\.dev'/.test(client) &&
      /var STRIPE_PK='pk_live_/.test(client),
      'the shipped calculator has been pointed at a test surface');
  }
  check('R', 'and PRICE_MAP_JSON still defaults to the live price map',
    /return PRICE_MAP_LIVE;/.test(worker), '');

  // The finish-profile email is the ONE link that proves pay-first recovery. It was
  // hardcoded to production, so the harness could not follow it without bouncing
  // into the live site.
  const code = worker.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
  check('R', 'the finish-profile link uses the configurable app base',
    /\$\{appBaseUrl\(env\)\}\/\?finish=/.test(code),
    'the reminder link is hardcoded to production');
  check('R', 'the report error page uses it too',
    /\$\{appBase\}\/#step2/.test(code), '');
  // THE MANUAL PAY PAGE. The harness used to print `/?cs=<session>` and wait — but
  // the shipped calculator mounts embedded Checkout only inside startCheckout(),
  // after ITS OWN /checkout call returns a clientSecret, and its URL handling reads
  // only session_id and finish. Opening that link showed a page with nothing to pay
  // and the harness polled until timeout. The harness serves its own /pay/<id>.
  {
    const harness = fs.readFileSync(path.join(REPO, 'tests', 'harness', 'stripe-e2e.mjs'), 'utf8');
    const client = fs.readFileSync(KD_PUBLIC_JS, 'utf8');

    check('R', 'the shipped calculator still does not consume ?cs (so /pay is required)',
      !/urlParams\.get\('cs'\)/.test(client) && /urlParams\.get\('finish'\)/.test(client),
      'the calculator now handles ?cs — revisit whether /pay is still needed');
    check('R', 'the harness serves its own pay page', /url\.pathname\.startsWith\('\/pay\/'\)/.test(harness),
      'the harness points at a URL nothing can render');
    check('R', 'which mounts embedded Checkout with the TEST publishable key',
      /initEmbeddedCheckout\(\{ clientSecret/.test(harness) && /Stripe\(\$\{JSON\.stringify\(PK\)\}/.test(harness), '');
    check('R', 'and the harness captures the clientSecret from /checkout',
      /clientSecrets\.set\(csid, buy\.json\.clientSecret\)/.test(harness), '');
    check('R', 'the worker already returns a clientSecret, so no production change was needed',
      /clientSecret: session\.client_secret/.test(worker), '');
    check('R', 'and the harness no longer prints the dead ?cs link',
      !/\/\?cs=\$\{sessionId\}/.test(harness), '');

    // A stale or mistyped publishable key cannot create a live charge — the Session
    // is made with the test secret — but it surfaces as a Stripe.js mode mismatch
    // inside the iframe, minutes into a manual run, naming nothing useful.
    check('R', 'the harness refuses a publishable key that is not pk_test_',
      /!PK\.startsWith\('pk_test_'\)/.test(harness), '');

    // Stripe CLI forwards genuinely Stripe-signed events. The proxy used to hardcode
    // Content-Type and drop every other header, which would have stripped
    // stripe-signature and rejected every real event as unsigned.
    // NAME THE SOURCE. Asserting only that `fwd.set(k, …)` exists was satisfied by
    // iterating an empty object — the headers were still dropped and the check stayed
    // green. The assertion has to say WHERE the headers come from.
    check('R', 'the harness proxy forwards incoming headers to the worker',
      /Object\.entries\(req\.headers\)/.test(harness) && /fwd\.set\(k,/.test(harness) &&
      !/headers: \{ 'Content-Type': 'application\/json' \}, body \}\), ENV\)/.test(harness),
      'stripe-signature would be stripped from any CLI-forwarded event');
    check('R', 'and a --stripe-cli run verifies against the secret the CLI printed',
      /KD_STRIPE_CLI_SECRET/.test(harness) && /STRIPE_CLI \? CLI_SECRET : HARNESS_WEBHOOK_SECRET/.test(harness), '');
  }

  check('R', 'no customer-facing link back into the site is hardcoded any more',
    !/href="https:\/\/ketodial\.com\/\?finish=/.test(code) &&
    !/href="https:\/\/ketodial\.com\/#step2"/.test(code), '');
}

// ===========================================================================
// GROUP S — THE WEBHOOK BOUNDARY: SIGNATURE, AND PAID-VS-COMPLETED.
// ---------------------------------------------------------------------------
// Two production defects, both found in the fifth review of the harness.
//
// 1. Verification was `if (env.STRIPE_WEBHOOK_SECRET && sig) { ...verify... }`, so a
//    request that OMITTED the stripe-signature header skipped it entirely. Anyone
//    able to POST here could forge a checkout.session.completed carrying any
//    session_token, write payment_status onto that customer's row, and trigger a
//    report email to an address of their choosing. Unauthenticated write and send.
//
// 2. `checkout.session.completed` was treated as "paid". Stripe's delayed and
//    asynchronous payment methods complete a Session before the money arrives and
//    report settlement later via checkout.session.async_payment_succeeded. Treating
//    the two as one delivers paid reports for a payment that may never settle.
//
// Driven through the worker's real fetch handler with genuinely signed requests.
// ===========================================================================
{
  const worker = (await import('file://' + WORKER_JS + '?groupS=' + Date.now())).default;
  const SECRET = 'whsec_group_s_harness_secret_not_a_real_key';

  // Build a real Stripe-style signature: HMAC-SHA256 over `${t}.${payload}`.
  const { createHmac } = await import('node:crypto');
  const sign = (payload, secret = SECRET, t = Math.floor(Date.now() / 1000)) =>
    `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${payload}`).digest('hex')}`;

  // Supabase and Stripe are stubbed here; this group is about the boundary itself.
  const realFetch = globalThis.fetch;
  const sideEffects = { supabaseWrites: 0, emails: 0 };
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('calculator_sessions_v2')) {
      if ((opts.method || 'GET') !== 'GET') sideEffects.supabaseWrites++;
      return { ok: true, json: async () => [] };
    }
    if (u.includes('api.resend.com')) { sideEffects.emails++; return { ok: true, json: async () => ({}) }; }
    if (u.includes('api.stripe.com')) return { ok: true, json: async () => ({ error: { message: 'stubbed' } }) };
    throw new Error('GROUP S: unexpected call to ' + u);
  };

  const ENV_S = { STRIPE_WEBHOOK_SECRET: SECRET, SUPABASE_URL: 'https://stub.invalid',
                  SUPABASE_SERVICE_ROLE_KEY: 'stub', RESEND_API_KEY: 'stub' };

  const post = async (payload, headers = {}, env = ENV_S) => {
    const res = await worker.fetch(new Request('https://kd.test/webhook', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: payload,
    }), env);
    return { status: res.status, json: await res.json().catch(() => null) };
  };

  const evt = (type, payment_status) => JSON.stringify({
    type, data: { object: {
      id: 'cs_test_group_s', payment_status,
      customer_email: 'group-s@example.invalid',   // RFC 2606 reserved; cannot receive mail
      metadata: { items: 'doctor', customer_name: 'S', session_token: 'kd_group_s_token_000000000000' },
      amount_total: 599, payment_intent: 'pi_group_s',
    } },
  });

  // --- signature ---
  {
    const body = evt('checkout.session.completed', 'paid');
    sideEffects.supabaseWrites = 0; sideEffects.emails = 0;

    const noSig = await post(body);
    check('S', 'a webhook with NO signature header is REJECTED', noSig.status === 400,
      `status ${noSig.status} — verification is skipped when the header is absent`);

    for (const junk of ['', 'garbage', 't=,v1=', 'v1=only', 't=1']) {
      const r = await post(body, { 'stripe-signature': junk });
      check('S', `a malformed signature header is rejected cleanly: ${JSON.stringify(junk)}`,
        r.status === 400, `status ${r.status} — verification must reject, not throw`);
    }

    const badSig = await post(body, { 'stripe-signature': 't=1,v1=deadbeef' });
    check('S', 'a webhook with an INVALID signature is rejected', badSig.status === 400,
      `status ${badSig.status}`);

    const wrongSecret = await post(body, { 'stripe-signature': sign(body, 'whsec_someone_elses_secret') });
    check('S', 'a signature from a different secret is rejected', wrongSecret.status === 400, '');

    const tampered = await post(body.replace('599', '1'), { 'stripe-signature': sign(body) });
    check('S', 'a signature that does not cover the body is rejected', tampered.status === 400, '');

    check('S', 'none of those rejected requests wrote or emailed anything',
      sideEffects.supabaseWrites === 0 && sideEffects.emails === 0,
      `${sideEffects.supabaseWrites} writes, ${sideEffects.emails} emails`);

    const noSecret = await post(body, { 'stripe-signature': sign(body) },
      { ...ENV_S, STRIPE_WEBHOOK_SECRET: '' });
    check('S', 'a misconfigured secret refuses to process, rather than trusting the event',
      noSecret.status === 500, `status ${noSecret.status}`);

    const good = await post(body, { 'stripe-signature': sign(body) });
    check('S', 'a VALID signature is accepted', good.status === 200 || good.status === 500,
      `status ${good.status} (200 processed, 500 = downstream stub, both mean it got past the gate)`);
  }

  // --- replay window ---
  // Without a tolerance, a payload and signature captured once stay valid forever.
  // Stripe's own libraries default to 300s and its retries carry a fresh timestamp
  // and signature, so a genuine retry is never rejected by this.
  {
    const body = evt('checkout.session.completed', 'paid');
    const now = Math.floor(Date.now() / 1000);
    sideEffects.supabaseWrites = 0; sideEffects.emails = 0;

    const old10m = await post(body, { 'stripe-signature': sign(body, SECRET, now - 600) });
    check('S', 'a correctly signed but 10-minute-old event is REJECTED', old10m.status === 400,
      `status ${old10m.status} — a captured event can be replayed indefinitely`);

    const old6m = await post(body, { 'stripe-signature': sign(body, SECRET, now - 360) });
    check('S', 'six minutes old is outside tolerance', old6m.status === 400, `${old6m.status}`);

    const future = await post(body, { 'stripe-signature': sign(body, SECRET, now + 600) });
    check('S', 'a far-future timestamp is rejected too', future.status === 400, `${future.status}`);

    check('S', 'no replayed event wrote or emailed anything',
      sideEffects.supabaseWrites === 0 && sideEffects.emails === 0,
      `${sideEffects.supabaseWrites} writes, ${sideEffects.emails} emails`);

    const recent = await post(body, { 'stripe-signature': sign(body, SECRET, now - 120) });
    check('S', 'a two-minute-old event is still accepted (real retries must work)',
      recent.status !== 400, `status ${recent.status}`);

    for (const bad of ['abc', '', '-1', '1e9', '12.5']) {
      const r = await post(body, { 'stripe-signature': `t=${bad},v1=${'0'.repeat(64)}` });
      check('S', `a non-numeric timestamp is rejected: ${JSON.stringify(bad)}`,
        r.status === 400, `status ${r.status}`);
    }
  }

  // --- multiple v1 signatures, as sent during a secret rotation ---
  // Stripe emits one v1 per active signing secret. The parser kept only the LAST,
  // so mid-rotation the header could carry a valid signature that was ignored and
  // genuine events would have started failing.
  {
    const body = evt('checkout.session.completed', 'paid');
    const t = Math.floor(Date.now() / 1000);
    const ours = sign(body, SECRET, t).split('v1=')[1];
    const theirs = sign(body, 'whsec_the_other_active_secret', t).split('v1=')[1];

    const oursFirst = await post(body, { 'stripe-signature': `t=${t},v1=${ours},v1=${theirs}` });
    check('S', 'a matching v1 is accepted when it is NOT last', oursFirst.status !== 400,
      `status ${oursFirst.status} — only the final v1 is being checked`);

    const oursLast = await post(body, { 'stripe-signature': `t=${t},v1=${theirs},v1=${ours}` });
    check('S', 'and when it is last', oursLast.status !== 400, `status ${oursLast.status}`);

    const neither = await post(body, { 'stripe-signature': `t=${t},v1=${theirs},v1=${'f'.repeat(64)}` });
    check('S', 'but a header with no matching v1 is still rejected', neither.status === 400,
      `status ${neither.status}`);
  }

  // --- completed is not paid ---
  {
    for (const status of ['unpaid', 'no_payment_required', undefined]) {
      const body = evt('checkout.session.completed', status);
      sideEffects.supabaseWrites = 0; sideEffects.emails = 0;
      const res = await post(body, { 'stripe-signature': sign(body) });
      check('S', `completed with payment_status=${status} is acknowledged but NOT fulfilled`,
        res.status === 200 && res.json?.awaiting_payment === true,
        `status ${res.status} ${JSON.stringify(res.json)}`);
      check('S', `  ...and writes nothing to the database`,
        sideEffects.supabaseWrites === 0,
        `${sideEffects.supabaseWrites} writes for an unsettled payment`);
      check('S', `  ...and sends no email`, sideEffects.emails === 0, `${sideEffects.emails}`);
    }

    // OBSERVE THE SIDE EFFECT, not just the status code. Asserting only "not 400 and
    // not awaiting_payment" was satisfied by the event being ignored entirely and
    // falling through to the generic {received:true} — so removing async handling
    // left this green. The paid path writes the payment back; that write is the
    // evidence that the event was actually processed.
    const asyncOk = evt('checkout.session.async_payment_succeeded', 'paid');
    sideEffects.supabaseWrites = 0;
    const res = await post(asyncOk, { 'stripe-signature': sign(asyncOk) });
    check('S', 'async_payment_succeeded goes through the SAME paid path',
      res.status !== 400 && res.json?.awaiting_payment !== true && sideEffects.supabaseWrites > 0,
      `status ${res.status} writes=${sideEffects.supabaseWrites} — a settled async payment was ignored`);

    const failed = JSON.stringify({ type: 'checkout.session.async_payment_failed',
      data: { object: { id: 'cs_test_failed' } } });
    sideEffects.supabaseWrites = 0; sideEffects.emails = 0;
    const f = await post(failed, { 'stripe-signature': sign(failed) });
    check('S', 'async_payment_failed is acknowledged and delivers nothing',
      f.status === 200 && f.json?.payment_failed === true &&
      sideEffects.supabaseWrites === 0 && sideEffects.emails === 0,
      `${f.status} ${JSON.stringify(f.json)}`);
  }

  globalThis.fetch = realFetch;

  // Source-level: the writeback must be unreachable for a non-paid session.
  const src = fs.readFileSync(WORKER_JS, 'utf8');
  check('S', "the DB is never told 'completed' before Stripe says paid",
    /payment_status !== 'paid'[\s\S]{0,400}?awaiting_payment[\s\S]{0,4000}?payment_status: 'completed'/.test(src),
    'the payment writeback is reachable without a settled payment');
}

// ===========================================================================
// GROUP G — MUTATION TESTING.
// ---------------------------------------------------------------------------
// A passing suite is not evidence. Each protection is broken on purpose against a
// COPY of the source, the relevant assertion is re-run, and it is required to go
// red. A mutation that leaves the suite green means the assertion above it is
// decorative, and this group fails so you find that out here rather than from a
// customer.
// ===========================================================================
{
  const intakeSrc = fs.readFileSync(INTAKE_JS, 'utf8');
  const reportsSrc = fs.readFileSync(REPORTS_JS, 'utf8');
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'kd-mutate-'));

  /**
   * Apply one mutation to a source file, load the mutated module, run `probe`
   * against it, and report whether the probe DETECTED the mutation.
   */
  async function mutate(label, file, src, find, replace, probe) {
    if (!src.includes(find)) {
      check('G', `mutation "${label}" could be applied`, false,
        'the code it targets has moved or changed; this mutation is no longer testing anything');
      return;
    }
    const mutated = src.replace(find, replace);
    const p = path.join(tmp, `${label.replace(/\W+/g, '-')}-${Date.now()}-${file}`);
    // Mutated reports.js imports ./intake.js relatively, so keep a sibling copy.
    fs.writeFileSync(path.join(tmp, 'intake.js'), intakeSrc);
    fs.writeFileSync(p, mutated);
    let detected = false, loadErr = null;
    try {
      const mod = await import('file://' + p);
      detected = await probe(mod);
    } catch (e) { loadErr = e; }
    check('G', `mutation is DETECTED: ${label}`, detected === true,
      loadErr ? `mutated module failed to load: ${loadErr.message}`
              : 'the mutation went UNDETECTED — the assertion guarding it is decorative');
  }

  // 1. Re-introduce the falsy read of medical intake: NULL becomes "declared nothing".
  await mutate('NULL medical intake accepted as "declared nothing"', 'intake.js', intakeSrc,
    "  if (intake.meds === undefined) missing.push('medications');",
    '  // mutated: medications no longer required',
    // DETECTED means the protection is gone: the mutated module ACCEPTS an intake
    // the real one refuses. Returning true on a throw would score the unmutated
    // behaviour as a detection and make every mutation here pass for free.
    async (m) => {
      try { m.validateIntake(m.normalizeIntake({ ...ROW, medications: null })); return true; }
      catch { return false; }
    });

  // 2. Drop the step_completed check, so a half-finished questionnaire generates.
  await mutate('step 2 no longer required', 'intake.js', intakeSrc,
    "  if (!(intake.stepCompleted >= 2)) missing.push('medical intake (step 2 never recorded)');",
    '  // mutated: step check removed',
    async (m) => {
      try { m.validateIntake(m.normalizeIntake({ ...ROW, step_completed: 1 })); return true; }
      catch { return false; }
    });

  // 3. Turn a transient store outage back into "no intake", the collapse that would
  //    refuse reports to customers whose data was perfectly fine.
  await mutate('store outage downgraded to "no intake"', 'intake.js', intakeSrc,
    'throw new Error(`INTAKE_STORE_UNREACHABLE: ${e.message}`);',
    "throw new IntakeError('INTAKE_NOT_FOUND', ['session record']);",
    async (m) => {
      const restore = stubSupabase({ throwNetwork: true });
      let err = null;
      try { await m.loadAuthoritativeIntake(ROW.session_token, ENV); } catch (e) { err = e; }
      restore();
      // Detected when the outage is NO LONGER reported as transient.
      return err !== null && err instanceof m.IntakeError;
    });

  // 4. Re-introduce a substituted default in requireFacts by making it never throw.
  await mutate('requireFacts stops refusing', 'intake.js', intakeSrc,
    "    throw new IntakeError('GENERATOR_MISSING_FACTS', missing,",
    '    if (false) throw new IntakeError("GENERATOR_MISSING_FACTS", missing,',
    async (m) => {
      let threw = false;
      try { m.requireFacts({}, ['calories'], 'test'); } catch { threw = true; }
      return threw === false;
    });

  // 5. Accept an implausible body. Bounds are the only thing standing between a
  //    corrupt row and a clinician-facing document about a 4000 lb person.
  await mutate('plausibility bounds removed', 'intake.js', intakeSrc,
    "  if (!inBounds('weight_kg', intake.weightKg)) invalid.push('weightKg');",
    '  // mutated: weight bound removed',
    async (m) => {
      try { m.validateIntake(m.normalizeIntake({ ...ROW, weight_value: '4000' })); return true; }
      catch { return false; }
    });

  // 6. Unhook renal protein suppression — the exact state the code was in before
  //    this change, where `renal` was computed and read by nothing.
  await mutate('renal protein suppression unhooked', 'reports.js', reportsSrc,
    '  const restrictProteinTarget = renal;',
    '  const restrictProteinTarget = false;',
    async (m) => {
      const renalIntake = {
        ...legacyFormDataShape(ROW), conditions: ['kidney'], meds: '',
      };
      const ctx = m.deriveKdMedicalContext(renalIntake);
      if (ctx.restrictProteinTarget) return false;
      // Detected when the protein figure is back in the document.
      const doc = m.generateDoctorReport('Linda', renalIntake);
      return new RegExp(`${renalIntake.proteinG}\\s*g`).test(doc);
    });

  // 7. Suppress the protein ROW only, leaving the rest of the macro panel — the
  //    cosmetic fix, where calories + fat + carbs still state protein by subtraction.
  await mutate('protein hidden but the macro panel left intact', 'reports.js', reportsSrc,
    '          ? kdProteinSuppressionNote(ctx)',
    '          ? kdProteinSuppressionNote(ctx) + `<div class="macro-line">${fmtNum(cal)} kcal · ${fat} g fat · ${carb} g carbs</div>`',
    async (m) => {
      const renalIntake = { ...legacyFormDataShape(ROW), conditions: ['kidney'], meds: '' };
      const doc = m.generateDoctorReport('Linda', renalIntake);
      return /class="macro-line"/.test(doc);
    });

  // 8. Let the protein-anchored meal plan generate for a renal reader after all.
  await mutate('renal reader gets the protein-anchored meal plan again', 'reports.js', reportsSrc,
    '    return generateRenalMealPlanReferral(name, d, ctx);',
    '    /* mutated: fall through and build the plan anyway */',
    async (m) => {
      const renalIntake = { ...legacyFormDataShape(ROW), conditions: ['kidney'], meds: '' };
      const meal = m.generateMealPlan('Linda', renalIntake);
      return /class="wg"/.test(meal);
    });

  // -------------------------------------------------------------------------
  // The early renal gate. Three mutations, one per required protection.
  // -------------------------------------------------------------------------
  const asked = (answer) => ({ ...legacyFormDataShape(ROW), kidneyStatus: answer });

  // 9. REMOVE THE EARLY GATE ENTIRELY. The answer is collected and then ignored,
  //    which is precisely the state ctx.renal was in before Audit 2B.
  await mutate('the early kidney answer is ignored', 'reports.js', reportsSrc,
    "  const kidneyDeclared = kidneyAnswer !== 'no';",
    '  const kidneyDeclared = false;',
    async (m) => {
      const yes = m.deriveKdMedicalContext(asked('yes'));
      // Detected when a Yes stops suppressing.
      return yes.restrictProteinTarget === false;
    });

  // 10. RESTORE INDIVIDUALIZED PROTEIN OUTPUT FOR YES/UNSURE by treating "not sure"
  //     as an all-clear — the tempting shortcut, since most unsure customers do not
  //     have kidney disease. It is still asking them to rule out their own renal
  //     function.
  await mutate('"I\'m not sure" treated as an all-clear', 'reports.js', reportsSrc,
    "  const kidneyDeclared = kidneyAnswer !== 'no';",
    "  const kidneyDeclared = kidneyAnswer === 'yes';",
    async (m) => {
      const unsure = m.deriveKdMedicalContext(asked('unsure'));
      if (unsure.restrictProteinTarget) return false;
      // Detected when the individualized figure comes back for an unsure customer.
      const doc = m.generateDoctorReport('Linda', asked('unsure'));
      return new RegExp(`${ROW.calculated_macros.proteinG}\\s*g`).test(doc);
    });

  // 11. ALLOW UNSUPPORTED MEAL-PLAN CHECKOUT: the offer stops adjusting, so a
  //     customer can pay for a plan that will be refused at generation time.
  await mutate('the meal plan is sold to a suppressed customer', 'reports.js', reportsSrc,
    "const PROTEIN_ANCHORED_PRODUCTS = new Set(['meal']);",
    'const PROTEIN_ANCHORED_PRODUCTS = new Set([]);',
    async (m) => {
      const offer = m.allowedProducts(m.deriveKdMedicalContext(asked('yes')));
      // Detected when a protein-anchored product is back on sale for this customer.
      return offer.allowed.includes('meal') || offer.allowed.includes('protocol');
    });

  // 12. And the belt to that brace: the renal signal reaching protein but not the
  //     electrolyte protocol. This is a hole that actually existed for one commit.
  await mutate('renal suppresses protein but not electrolytes', 'reports.js', reportsSrc,
    '  const cardioRenal = cardioRenalSlug || cardioRenalText || renal;',
    '  const cardioRenal = cardioRenalSlug || cardioRenalText;',
    async (m) => {
      // The probe MUST be a persona whose only restricting signal is the kidney
      // answer. ROW declares four medications, and hasDeclaredMedication alone keeps
      // the electrolyte protocol suppressed — so probing with it would mask this
      // mutation entirely and score a decorative assertion as a real one.
      const kidneyOnly = { ...asked('yes'), meds: '', conditions: [], symptoms: [] };
      const yes = m.deriveKdMedicalContext(kidneyOnly);
      return yes.restrictProteinTarget === true && yes.restrictElectrolyteProtocol === false;
    });

  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
}

// ===========================================================================
// Report
// ===========================================================================
const W = '─'.repeat(76);
console.log(W);
console.log('KETODIAL — AUTHORITATIVE INTAKE REGRESSION');
console.log(W);
const GROUPS = {
  A: 'the >490-char intake, end to end',
  B: 'Stripe metadata is not a store',
  C: 'missing / malformed / incomplete / invalid reference',
  D: '"answered nothing" is not "never asked"',
  E: 'legacy paid sessions',
  F: 'requireFacts backstop',
  H: 'early renal gate: what we show and what we sell',
  I: 'persistence: one source of truth',
  J: 'vocabulary bridge to the shared table',
  K: 'intake form values are an API contract',
  KA: 'every constrained column goes through the vocabulary bridge',
  L: 'purchase eligibility is not report eligibility',
  M: '"I am not sure" is not a diagnosis',
  N: 'CI runs on the live intake UI',
  O: 'paid fulfilment is resumable and never silent',
  P: 'delivery truthfulness, idempotency, DB vocabulary, schema in git',
  Q: 'the free plan email is inside the gate',
  R: 'test-harness overrides default to production',
  S: 'webhook signature, and completed-is-not-paid',
  G: 'mutation testing',
};
for (const [g, title] of Object.entries(GROUPS)) {
  const bad = failures.filter(f => f.group === g).length;
  console.log(`${bad ? 'FAIL' : 'PASS'}  ${g}  ${title}` + (bad ? `  · ${bad} failed` : ''));
}
console.log(W);

if (failures.length) {
  console.log(`\n${failures.length} of ${checks} assertions FAILED:\n`);
  for (const f of failures) {
    console.log(`  [${f.group}] ${f.name}`);
    if (f.detail) console.log(`      ${f.detail}`);
  }
  console.log('\nThis suite guards a paid, clinician-facing health document against being');
  console.log('written from data nobody supplied. Do not loosen an assertion to go green.\n');
  process.exit(1);
}

console.log(`\n${checks} assertions passed.`);
console.log('\nNOT covered: Stripe itself, Resend delivery, PDF conversion, and whether the');
console.log('ketodial/public submodule has been committed and deployed to ketodial.com.\n');
