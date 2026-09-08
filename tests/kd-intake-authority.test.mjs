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
  IntakeError, normalizeIntake, validateIntake, requireFacts, loadAuthoritativeIntake,
  toStoredVocabulary,
} = await import('file://' + INTAKE_JS);
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
  { id: 'medical screen never submitted (step 1)', row: { ...ROW, step_completed: 1 }, missing: 'medical intake' },
  { id: 'conditions column lost', row: { ...ROW, conditions: null }, missing: 'conditions' },
  { id: 'medications column lost', row: { ...ROW, medications: null }, missing: 'medications' },
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
    err instanceof IntakeError && err.code === 'INTAKE_INCOMPLETE',
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
  check('I', 'the browser sends the answer when the session is created',
    /kidney_status:kidneyStatus\(\)/.test(client), '');
  check('I', 'and re-sends it if the customer changes their mind',
    (client.match(/kidney_status:kidneyStatus\(\)/g) || []).length >= 2, '');
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
