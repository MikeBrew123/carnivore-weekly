/**
 * KetoDial: does the payload the shipped worker builds actually fit the database?
 *
 * WHY THIS FILE EXISTS. On 2026-09-09 the Audit 2B deploy took the calculator down.
 * The client sends lifestyle_activity as a TDEE multiplier (1.2 .. 1.9); the column
 * has a CHECK constraint accepting sedentary|light|moderate|very|extreme. Every
 * POST /session returned 500 and no customer could reach checkout.
 *
 * The repository had 2,000-odd passing assertions at the time. Not one of them could
 * have caught it, because every test either mocked the database or asserted against
 * a JavaScript restatement of the constraint. A restatement cannot disagree with
 * itself. `activityToStored(1.2) === 'sedentary'` is a useful test and it is not
 * this test: it proves the mapping does what the mapping says, not that Postgres
 * will accept the result.
 *
 * So this runs the REAL worker handlers against a REAL PostgreSQL instance whose
 * schema is built from the repository's own checked-in migration files, and asserts
 * on rows that Postgres actually accepted.
 *
 * WHAT IS REAL: PostgreSQL 18 (PGlite, compiled to WebAssembly), the migration files
 * unedited, every CHECK constraint, every column type and length, and the worker's
 * own handleSession / handleSessionUpdate.
 *
 * WHAT IS EMULATED, stated plainly: PostgREST itself. A shim translates the three
 * request shapes the worker makes — insert, eq-filtered select, eq-filtered patch —
 * into SQL. A defect in PostgREST's own behaviour would not be caught here. A
 * client-vs-schema vocabulary mismatch cannot hide.
 *
 * NO CREDENTIALS. No Docker, no service container, nothing reaches production.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSchema, postgrestShim } from './support/pg-schema-harness.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WORKER_JS = path.join(REPO, 'ketodial', 'worker', 'index.js');

let checks = 0;
const failures = [];
function check(group, name, ok, detail) {
  checks++;
  if (!ok) failures.push({ group, name, detail: detail || '' });
}

const worker = (await import('file://' + WORKER_JS + '?schema=' + Date.now())).default;
const createdTokens = {};
const { db, applied } = await createSchema(REPO);
const shim = postgrestShim(db);

check('SC0', 'the schema was built from the checked-in migrations',
  applied.some(a => a.name.includes('create_calculator_payment_system') && a.statements > 0), '');

// The constraint that broke production must genuinely exist, or everything below is
// theatre.
{
  const r = await db.query(
    "SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname = 'calculator_sessions_v2_lifestyle_activity_check'");
  check('SC0', 'the real lifestyle_activity CHECK constraint is present',
    r.rows.length === 1 && /sedentary/.test(r.rows[0].d), JSON.stringify(r.rows));
  const k = await db.query(
    "SELECT pg_get_constraintdef(oid) d FROM pg_constraint WHERE conname = 'calculator_sessions_v2_kidney_status_check'");
  check('SC0', 'the Audit 2B kidney_status CHECK constraint is present',
    k.rows.length === 1 && /unsure/.test(k.rows[0].d), JSON.stringify(k.rows));
  // Prove Postgres is really enforcing, not merely storing.
  let rejected = false;
  try { await db.query("INSERT INTO public.calculator_sessions_v2 (session_token, lifestyle_activity) VALUES ('probe_raw', '1.2')"); }
  catch { rejected = true; }
  check('SC0', 'Postgres rejects the raw multiplier that broke production', rejected,
    'the constraint is not being enforced, so nothing below proves anything');
}

const ENV = { SUPABASE_URL: shim.BASE, SUPABASE_SERVICE_ROLE_KEY: 'harness' };

/** Route only Supabase traffic to the real schema; anything else is a test bug. */
async function withDb(fn) {
  const real = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.startsWith(shim.BASE)) return shim.fetch(u, opts);
    throw new Error('unexpected outbound call in a schema test: ' + u);
  };
  try { return await fn(); } finally { globalThis.fetch = real; }
}

const post = (body) => withDb(() => worker.fetch(new Request('https://kd.test/session', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), ENV));

const patch = (body) => withDb(() => worker.fetch(new Request('https://kd.test/session', {
  method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
}), ENV));

const row = async (token) => token ? (await db.query(
  'SELECT * FROM public.calculator_sessions_v2 WHERE session_token = $1', [token])).rows[0] : undefined;

/**
 * Every group below depends on GROUP SC1 having inserted something. When CREATE is
 * broken there is nothing to patch, and a test that then dies on `undefined.column`
 * reports a stack trace instead of a defect. Name the dependency and skip.
 */
function need(group, mult) {
  const token = createdTokens[mult];
  check(group, `a row created with activity ${mult} is available to work with`, !!token,
    'GROUP SC1 could not insert, so this group cannot run');
  return token;
}

/** What the shipped client actually posts after the free result. */
const step1 = (over = {}) => ({
  sex: 'female', age: 58, goal: 'lose',
  lifestyle_activity: 1.2,
  kidney_status: 'no',
  height_cm: 168, weight_value: 190, weight_unit: 'lbs',
  email: 'schema@example.invalid', newsletter_opt_in: true,
  macros: { calories: 1605, fatG: 125, proteinG: 100, carbG: 20, tdee: 2006 },
  referrer: '', device_type: 'desktop',
  utm_source: 'plan_email', utm_medium: 'email', utm_campaign: 'free_results',
  ...over,
});

// The five multipliers the calculator can actually emit, and the five words the
// column accepts. This pairing is the incident, expressed as a table.
const ACTIVITY = [
  [1.2, 'sedentary'], [1.375, 'light'], [1.55, 'moderate'], [1.725, 'very'], [1.9, 'extreme'],
];

// ===========================================================================
// GROUP SC1 — POST /session INSERTS, FOR EVERY REAL ACTIVITY MULTIPLIER.
// ===========================================================================
for (const [mult, word] of ACTIVITY) {
  const res = await post(step1({ lifestyle_activity: mult }));
  const body = await res.json().catch(() => ({}));
  check('SC1', `POST /session with activity ${mult} is accepted by the database`,
    res.status === 200 && !!body.token,
    `status ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  if (!body.token) continue;
  createdTokens[mult] = body.token;

  const r = await row(body.token);
  check('SC1', `  ...the row exists in Postgres`, !!r, 'the insert reported success but stored nothing');
  check('SC1', `  ...activity ${mult} is stored as "${word}"`,
    r && r.lifestyle_activity === word, r && String(r.lifestyle_activity));
}

// The other step-1 values have to survive the same trip.
{
  const r = await row(need('SC1', 1.55));
  check('SC1', 'sex, goal and weight_unit satisfy their own constraints',
    r && r.sex === 'female' && r.goal === 'lose' && r.weight_unit === 'lbs', JSON.stringify(r && {
      sex: r.sex, goal: r.goal, weight_unit: r.weight_unit }));
  check('SC1', 'diet_type is one the constraint allows', r && r.diet_type === 'keto', r && r.diet_type);
  check('SC1', 'the kidney answer is stored', r && r.kidney_status === 'no', r && r.kidney_status);
  check('SC1', 'the macros land as JSONB', r && r.calculated_macros && r.calculated_macros.calories === 1605,
    JSON.stringify(r && r.calculated_macros));
  check('SC1', 'the row is tagged as KetoDial', r && r.source === 'ketodial', r && r.source);
}

// ===========================================================================
// GROUP SC2 — PATCH /session STORES THE MAPPED VOCABULARY TOO.
// ---------------------------------------------------------------------------
// The hotfix had to cover both write paths. A fix applied only to CREATE would have
// left the resumed-recompute path 500ing.
// ===========================================================================
const patchToken = need('SC2', 1.2);
for (const [mult, word] of ACTIVITY) {
  if (!patchToken) break;
  const token = patchToken;
  const res = await patch({ token, lifestyle_activity: mult });
  check('SC2', `PATCH /session with activity ${mult} is accepted`, res.status === 200,
    `status ${res.status} ${(await res.text()).slice(0, 200)}`);
  const r = await row(token);
  check('SC2', `  ...and stores "${word}"`, r && r.lifestyle_activity === word,
    r && String(r.lifestyle_activity));
}

// ===========================================================================
// GROUP SC3 — EVERY OTHER CONSTRAINED COLUMN THE KD CLIENT WRITES.
// ---------------------------------------------------------------------------
// These are the option value= attributes the shipped index.html actually submits.
// The step-2 PATCH failed silently in production for months on exactly this class of
// mismatch, which is why the vocabulary bridge exists; this proves the bridge's
// output is what the schema takes.
// ===========================================================================
if (need('SC3', 1.375)) {
  const token = createdTokens[1.375];
  const profile = {
    token,
    step_completed: 2,
    conditions: ['diabetes-t2', 'hypertension'],
    medications: 'metformin 500mg twice daily',
    symptoms: 'fatigue, brain fog',
    dairy_tolerance: 'full',
    cooking_skill: 'beginner',
    meal_prep_time: 'minimal',
    budget: 'moderate',
    family_situation: 'family-with-kids',
    biggest_challenge: 'eating out with colleagues',
    previous_diets: 'keto, weight watchers',
    first_name: 'Schema',
    kidney_status: 'unsure',
  };
  const res = await patch(profile);
  check('SC3', 'the full step-2 profile is accepted by the real schema', res.status === 200,
    `status ${res.status} ${(await res.text()).slice(0, 300)}`);

  const r = await row(token);
  const expected = {
    dairy_tolerance: 'full', cooking_skill: 'beginner', meal_prep_time: 'minimal',
    budget: 'moderate', family_situation: 'family-with-kids', kidney_status: 'unsure',
    step_completed: 2,
  };
  for (const [col, want] of Object.entries(expected)) {
    check('SC3', `${col} stored as ${want}`, r && String(r[col]) === String(want),
      r && String(r[col]));
  }
  check('SC3', 'conditions survive as a text array',
    r && Array.isArray(r.conditions) && r.conditions.includes('diabetes-t2'),
    JSON.stringify(r && r.conditions));
  check('SC3', 'medications are not silently dropped',
    r && r.medications === 'metformin 500mg twice daily', r && r.medications);

  // Every enumerated column the client can write, exhaustively against its own
  // constraint. One value per option the page offers.
  const VOCAB = {
    dairy_tolerance: ['none', 'some', 'full'],
    cooking_skill: ['beginner', 'intermediate', 'advanced'],
    meal_prep_time: ['minimal', 'some', 'lots'],
    budget: ['tight', 'moderate', 'flexible'],
    family_situation: ['solo', 'partner', 'family-with-kids', 'large-household'],
    kidney_status: ['no', 'yes', 'unsure'],
    goal: ['lose', 'maintain', 'gain'],
  };
  for (const [col, values] of Object.entries(VOCAB)) {
    for (const v of values) {
      const res2 = await patch({ token, [col]: v });
      const r2 = await row(token);
      check('SC3', `${col}="${v}" is accepted and stored`,
        res2.status === 200 && r2 && String(r2[col]) === v,
        `status ${res2.status} stored=${r2 && r2[col]}`);
    }
  }
}

// ===========================================================================
// GROUP SC4 — UNMAPPABLE INPUT FAILS SAFELY, NOT WITH AN UNEXPLAINED 500.
// ===========================================================================
{
  for (const bad of ['garbage', '', 'SEDENTARY!!', 99, -1, null]) {
    const res = await post(step1({ lifestyle_activity: bad, email: `bad${String(bad)}@example.invalid`.replace(/[^a-z0-9@.]/gi, '') }));
    const body = await res.json().catch(() => ({}));
    check('SC4', `an unmappable activity (${JSON.stringify(bad)}) does not 500`,
      res.status !== 500, `status ${res.status} ${JSON.stringify(body).slice(0, 160)}`);
    if (body.token) {
      const r = await row(body.token);
      const ALLOWED = [null, 'sedentary', 'light', 'moderate', 'very', 'extreme'];
      check('SC4', `  ...and stores a value the constraint allows`,
        r && ALLOWED.includes(r.lifestyle_activity), r && String(r.lifestyle_activity));
    }
  }

  // An enumerated value the schema would reject must not take the whole write down.
  // The bridge omits what it cannot map: losing a preference costs personalization,
  // losing the write costs the customer's medications.
  const token = need('SC4', 1.725);
  if (!token) { /* named above; nothing further to assert */ } else {
  const res = await patch({ token, cooking_skill: 'not-a-real-option',
                            medications: 'levothyroxine 50mcg' });
  check('SC4', 'an unmappable preference does not reject the whole PATCH',
    res.status === 200, `status ${res.status} ${(await res.text()).slice(0, 200)}`);
  const r = await row(token);
  check('SC4', '  ...and the medications still landed',
    r && r.medications === 'levothyroxine 50mcg', r && String(r.medications));
  check('SC4', '  ...while the bad preference was omitted, not stored',
    r && r.cooking_skill !== 'not-a-real-option', r && String(r.cooking_skill));

  // A kidney answer outside the three real ones must never overwrite a stored one.
  const before = (await row(token)).kidney_status;
  await patch({ token, kidney_status: 'maybe' });
  const after = (await row(token)).kidney_status;
  check('SC4', 'an invalid kidney answer leaves the stored one alone',
    after === before, `${before} -> ${after}`);
  }
}

// ---------------------------------------------------------------------------
await db.close();

if (failures.length) {
  console.log(`\n${failures.length} of ${checks} assertions FAILED\n`);
  for (const f of failures) {
    console.log(`  [${f.group}] ${f.name}`);
    if (f.detail) console.log(`      ${String(f.detail).slice(0, 300)}`);
  }
  console.log('\nThis suite runs the real worker against a real PostgreSQL schema built');
  console.log('from the checked-in migrations. A failure here means a payload the');
  console.log('shipped code produces would be rejected by the production database.\n');
  process.exit(1);
}
const groups = {
  SC0: 'the schema and its constraints are genuinely present',
  SC1: 'POST /session inserts for every real activity multiplier',
  SC2: 'PATCH /session stores the mapped vocabulary too',
  SC3: 'every other constrained column the KD client writes',
  SC4: 'unmappable input fails safely, not with an unexplained 500',
};
for (const [k, v] of Object.entries(groups)) console.log(`PASS  ${k}  ${v}`);
console.log(`\n${checks} assertions passed against a real PostgreSQL schema.`);
