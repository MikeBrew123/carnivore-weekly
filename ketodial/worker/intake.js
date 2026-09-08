/**
 * ketodial/worker/intake.js
 *
 * THE authoritative intake record for every paid KetoDial report.
 *
 * Why this file exists
 * --------------------
 * Until 2026-09-08 the customer's questionnaire was carried to the report
 * generators inside a Stripe metadata field:
 *
 *     metadata[form_data] = JSON.stringify(formData).slice(0, 490)
 *
 * Stripe caps a metadata value at 500 characters. The fixed part of the KetoDial
 * form serialises to 307 of them, so the entire free-text budget — every
 * medication, every condition slug, the "what gets in your way" answer — was 183
 * characters. Past that the string was cut mid-JSON, `JSON.parse` threw,
 * `safeParseJSON(...) || {}` turned the whole questionnaire into an empty object,
 * and the generators filled the hole with constants:
 *
 *     cal=1800  fat=140  prot=113  carb=25  wKg=75  hCm=170
 *
 * A 58-year-old woman of 88 kg and 165 cm, on four medications, with three
 * declared conditions, received a Doctor's Report stating BMI 26.0 instead of
 * 32.3, "None reported" against her conditions, and no medications at all. She
 * paid for that document specifically so she could hand it to her physician.
 *
 * The payload length correlates with medical complexity, so the failure was
 * concentrated in exactly the readers the safety gate exists to protect.
 *
 * What replaced it
 * ----------------
 * `calculator_sessions_v2` already held all of this. It was written at
 * `POST /session` and again at `PATCH /session`, and then never read at report
 * time. So the fix is a rewiring, not a new store:
 *
 *     validated intake -> calculator_sessions_v2 (durable, authoritative)
 *                      -> Stripe metadata[session_token] (a 32-char REFERENCE)
 *                      -> load + validate at report time
 *                      -> deriveKdMedicalContext()
 *                      -> generators
 *
 * Stripe metadata is no longer a store. It is a pointer.
 *
 * The governing principle
 * -----------------------
 * NOTHING IN THIS FILE INVENTS A CUSTOMER FACT. Not a weight, not a height, not
 * a calorie figure, not a condition, not a medication. If a fact required to
 * write an individualised clinician-facing document did not arrive, report
 * generation FAILS CLOSED and the customer is routed to a human. A refused
 * report is recoverable. A report asserting a body the reader does not have,
 * addressed to their doctor, is not.
 *
 * "Answered nothing" is not "never asked"
 * ---------------------------------------
 * A customer who takes no medications and ticks no conditions has told us
 * something, and their report should say "None reported". A customer whose
 * answers were lost has told us nothing, and their report must not be written at
 * all. Those two states were indistinguishable in the database until
 * 2026-09-08, because `handleSessionUpdate` guarded every write with a falsy
 * check (`if (b.medications)`), so an empty answer was silently skipped and the
 * column stayed NULL. Live rows confirm it. That guard is now an
 * `!== undefined` check, and this module treats a NULL medical column on a row
 * that reached step 2 as LOST, not as empty. Fail closed.
 */

// ---------------------------------------------------------------------------
// THE VOCABULARY BRIDGE
// ---------------------------------------------------------------------------
// `calculator_sessions_v2` is shared with Carnivore Weekly and carries CHECK
// constraints written for CW's answer vocabulary. KetoDial's step-2 selects have no
// `value` attributes, so the browser submits the OPTION TEXT — "A little bothers me",
// "Basic — I can follow a recipe", "About 30 min/day", "Just me", "mod".
//
// Every one of those violates a constraint, and one of them also exceeds
// varchar(20). PostgREST rejects the whole PATCH, `handleSessionUpdate` returns 500,
// and `updateSession()` in ketodial.js is fire-and-forget with `.catch(warn)`.
//
// So KetoDial's medical screen has NEVER been persisted. Verified against the real
// table on 2026-09-08: every live KD row shows step_completed=3 with medications,
// symptoms, dairy_tolerance, cooking_skill, budget and biggest_challenge all NULL —
// because they died with the same rejected write.
//
// That was survivable while nothing read the row. It stops being survivable the
// moment the row becomes authoritative: validateIntake would refuse every customer,
// so the checkout guard would have declined 100% of KetoDial purchases.
//
// These tables are the fix, and they are deliberately a TRANSLATION, not a
// relaxation. CW's constraints stay exactly as strict as they were.
//
// The read side matters as much as the write side: reports.js decides dairy handling
// by substring ("free", "strict", "little", "bother"), so storing the bare enum and
// handing it straight to the generator would silently change which meals a customer
// gets. Each enum maps back to a phrase that reproduces today's behaviour exactly.

/** KetoDial's option text -> the vocabulary the shared table accepts. */
const KD_TO_DB = {
  dairy_tolerance: {
    'i love dairy': 'full',
    'i tolerate it fine': 'full',
    'a little bothers me': 'some',
    'strict dairy-free': 'none',
  },
  cooking_skill: {
    'microwave only': 'beginner',
    'basic — i can follow a recipe': 'beginner',
    'basic - i can follow a recipe': 'beginner',
    'confident in the kitchen': 'intermediate',
    'chef-level': 'advanced',
  },
  meal_prep_time: {
    'under 15 min/day': 'minimal',
    'about 30 min/day': 'some',
    'i batch on weekends': 'lots',
    'i love cooking': 'lots',
  },
  family_situation: {
    'just me': 'solo',
    'me + my partner': 'partner',
    'a family with kids': 'family-with-kids',
    'i cook for others / caregiver': 'large-household',
  },
  budget: { tight: 'tight', mod: 'moderate', flex: 'flexible' },
};

/** The stored enum -> a phrase reports.js interprets the way it always has. */
const DB_TO_REPORT = {
  dairy_tolerance: {
    none: 'strict dairy-free',
    // "free" keeps shouldFilterOutFood's dairy handling on, which is the intent.
    'butter-only': 'butter only, otherwise dairy-free',
    some: 'a little bothers me',
    full: 'fine with dairy',
  },
  cooking_skill: { beginner: 'Basic', intermediate: 'Confident in the kitchen', advanced: 'Chef-level' },
  meal_prep_time: { minimal: 'Under 15 min/day', some: 'About 30 min/day', lots: 'I batch on weekends' },
  family_situation: {
    solo: 'Just me', partner: 'Me + my partner',
    'family-with-kids': 'A family with kids', 'large-household': 'I cook for others',
  },
  // reports.js compares against 'tight' and 'generous'; anything else reads as
  // moderate. Mapping back preserves that exactly.
  budget: { tight: 'tight', moderate: 'mod', flexible: 'flex' },
};

/**
 * Translate one KetoDial answer for storage.
 *
 * Returns `undefined` when the value does not map. The caller OMITS the field rather
 * than failing the write: these five are personalization preferences, none of them is
 * a required fact, and losing one costs a slightly less tailored meal plan. Failing
 * the write costs the customer's medications, conditions and symptoms, which is what
 * has actually been happening.
 */
export function toStoredVocabulary(field, value) {
  const table = KD_TO_DB[field];
  if (!table) return value;
  if (value === undefined || value === null) return undefined;
  const key = String(value).trim().toLowerCase();
  if (key === '') return undefined;
  // Already in the stored vocabulary (a replayed row, or a value CW wrote).
  if (Object.values(table).includes(key)) return key;
  return table[key];
}

/** Translate a stored value back into what the report generators expect. */
function fromStoredVocabulary(field, value) {
  if (value === undefined || value === null) return undefined;
  const table = DB_TO_REPORT[field];
  if (!table) return String(value);
  return table[String(value).trim().toLowerCase()] ?? String(value);
}

/** Thrown whenever a report cannot be honestly generated. Never caught into a default. */
export class IntakeError extends Error {
  /**
   * @param {string} code    machine-readable reason, for logs and tests
   * @param {string[]} missing  the facts that were absent or implausible
   * @param {string} customerMessage  what a human is allowed to be told
   */
  constructor(code, missing = [], customerMessage = '') {
    super(`${code}${missing.length ? ': ' + missing.join(', ') : ''}`);
    this.name = 'IntakeError';
    this.code = code;
    this.missing = missing;
    this.customerMessage = customerMessage ||
      'We could not find the complete questionnaire for this purchase, so we have not ' +
      'generated your report rather than guess at your details. Nothing is lost and you ' +
      'have not been charged twice. Email ketodial@carnivoreweekly.com and we will sort it out.';
  }
}

/**
 * Plausibility bounds on SELF-REPORTED data. These are not clinical judgements and
 * they never alter a value — they only decide whether a figure is usable at all.
 * A value outside these ranges is treated as corrupt input, not as a small person.
 */
const BOUNDS = {
  age: [13, 120],
  height_cm: [100, 250],
  weight_kg: [25, 400],
  calories: [800, 6000],
  proteinG: [10, 500],
  fatG: [5, 600],
  carbG: [0, 200],
  tdee: [800, 8000],
};

const VALID_SEX = new Set(['male', 'female']);
const VALID_GOAL = new Set(['lose', 'maintain', 'gain']);
/** The only three answers the early kidney question can produce. */
const VALID_KIDNEY = new Set(['no', 'yes', 'unsure']);

function inBounds(name, value) {
  const b = BOUNDS[name];
  if (!b) return true;
  return typeof value === 'number' && Number.isFinite(value) && value >= b[0] && value <= b[1];
}

/** Postgres numerics arrive over PostgREST as strings ("222.00"). Numbers stay numbers. */
function num(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** A text column that was written, even as ''. NULL/undefined means it never arrived. */
function textOrLost(v) {
  if (v === null || v === undefined) return undefined;
  return String(v);
}

/**
 * The `conditions` column is a Postgres array; `symptoms` and `previous_diets` are
 * text columns the browser sends arrays to. Accept either shape without inventing
 * entries, and preserve the empty case — [] is an answer.
 */
function listOrLost(v) {
  if (v === null || v === undefined) return undefined;
  if (Array.isArray(v)) return v.filter(x => typeof x === 'string' && x.trim() !== '');
  if (typeof v === 'string') {
    const s = v.trim();
    if (s === '') return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        return Array.isArray(parsed) ? parsed.filter(x => typeof x === 'string' && x.trim()) : [];
      } catch { /* fall through to delimiter split */ }
    }
    return s.replace(/^\{|\}$/g, '').split(',').map(x => x.trim().replace(/^"|"$/g, '')).filter(Boolean);
  }
  return undefined;
}

/**
 * Map an authoritative `calculator_sessions_v2` row onto the object shape the
 * report generators consume. This is a RENAME, not a computation: every value
 * either came from the customer or is `undefined`. There is no `|| fallback`
 * anywhere in this function and there must never be one.
 *
 * @param {object} row a row from calculator_sessions_v2
 * @returns {object} intake, with `undefined` wherever the customer told us nothing
 */
export function normalizeIntake(row) {
  if (!row || typeof row !== 'object') {
    throw new IntakeError('INTAKE_ROW_MISSING', ['session record']);
  }

  const macros = (row.calculated_macros && typeof row.calculated_macros === 'object')
    ? row.calculated_macros
    : {};

  const weightValue = num(row.weight_value);
  const unit = String(row.weight_unit || '').toLowerCase();
  // The browser stores lbs by default and kg when the customer switched units.
  // Convert, never guess: an unrecognised unit leaves weight undefined so
  // validateIntake() reports it as missing.
  let weightKg;
  if (weightValue !== null) {
    if (unit === 'kg' || unit === 'kgs') weightKg = weightValue;
    else if (unit === 'lbs' || unit === 'lb') weightKg = weightValue * 0.453592;
  }

  return {
    // Identity and provenance
    sessionToken: row.session_token,
    stepCompleted: num(row.step_completed) ?? undefined,
    email: textOrLost(row.email),
    firstName: textOrLost(row.first_name),

    // Body facts
    sex: textOrLost(row.sex),
    age: num(row.age) ?? undefined,
    heightCm: num(row.height_cm) ?? undefined,
    weightKg: weightKg === undefined ? undefined : Math.round(weightKg * 10) / 10,
    goal: textOrLost(row.goal),
    activity: textOrLost(row.lifestyle_activity),

    // Macros, as computed and shown to the customer on the free results screen
    calories: num(macros.calories) ?? undefined,
    fatG: num(macros.fatG) ?? undefined,
    proteinG: num(macros.proteinG) ?? undefined,
    carbG: num(macros.carbG) ?? undefined,
    tdee: num(macros.tdee) ?? undefined,

    // THE EARLY RENAL GATE. Asked once, before the free protein result, and stored
    // in its own column rather than folded into `conditions` — writing the slug
    // 'kidney' would have made the Doctor's Report assert a diagnosis for a customer
    // who answered "I'm not sure". Suppression must not become diagnosis.
    kidneyStatus: textOrLost(row.kidney_status),

    // Medical intake. `undefined` here means LOST, not "none".
    conditions: listOrLost(row.conditions),
    symptoms: listOrLost(row.symptoms),
    meds: textOrLost(row.medications),

    // Preferences. Absence degrades personalisation; it does not make the
    // document dishonest, so these are not required facts.
    diets: listOrLost(row.previous_diets) ?? [],
    // Translated back out of the shared table's vocabulary. See THE VOCABULARY
    // BRIDGE above: handing reports.js the bare enum would quietly change which
    // meals a dairy-sensitive customer is given.
    dairy: fromStoredVocabulary('dairy_tolerance', row.dairy_tolerance) ?? '',
    cooking: fromStoredVocabulary('cooking_skill', row.cooking_skill) ?? '',
    prepTime: fromStoredVocabulary('meal_prep_time', row.meal_prep_time) ?? '',
    cookingFor: fromStoredVocabulary('family_situation', row.family_situation) ?? '',
    budget: fromStoredVocabulary('budget', row.budget) ?? '',
    challenge: textOrLost(row.biggest_challenge) ?? '',
  };
}

/**
 * The facts an individualised, clinician-facing document cannot be honestly
 * written without. Anything not on this list may be absent; the report simply
 * says less. Anything ON this list stops the report.
 */
const REQUIRED_BODY_FACTS = ['sex', 'age', 'heightCm', 'weightKg', 'goal'];
const REQUIRED_MACRO_FACTS = ['calories', 'proteinG', 'fatG', 'carbG', 'tdee'];

/**
 * Decide whether this intake may be turned into a paid report.
 *
 * Throws IntakeError. Does not repair, default, or approximate anything.
 *
 * @param {object} intake from normalizeIntake()
 * @returns {object} the same intake, once it has earned the right to be used
 */
export function validateIntake(intake) {
  if (!intake || typeof intake !== 'object') {
    throw new IntakeError('INTAKE_ROW_MISSING', ['session record']);
  }

  const missing = [];

  for (const f of REQUIRED_BODY_FACTS) {
    if (intake[f] === undefined || intake[f] === null || intake[f] === '') missing.push(f);
  }
  for (const f of REQUIRED_MACRO_FACTS) {
    if (intake[f] === undefined || intake[f] === null) missing.push(f);
  }

  // MEDICAL INTAKE IS MANDATORY, AND "none" MUST HAVE BEEN RECORDED AS AN ANSWER.
  // step_completed >= 2 is written in the same PATCH that carries conditions and
  // medications, so it is the signal that the medical screen was actually
  // submitted. A row that reached step 2 but has a NULL medical column lost that
  // answer somewhere; it is not a customer who declared nothing.
  if (!(intake.stepCompleted >= 2)) missing.push('medical intake (step 2 never recorded)');
  if (intake.conditions === undefined) missing.push('conditions');
  if (intake.meds === undefined) missing.push('medications');
  // The early kidney answer decides both what we show and what we are allowed to
  // sell, so a session that never recorded it cannot produce a paid report. NULL is
  // every session predating 2026-09-08; there were 0 paid KetoDial sessions then.
  if (intake.kidneyStatus === undefined) missing.push('kidney safety answer');

  if (missing.length) {
    throw new IntakeError('INTAKE_INCOMPLETE', missing);
  }

  // Shape and plausibility. A value that fails here is corrupt, not small.
  const invalid = [];
  if (!VALID_SEX.has(String(intake.sex).toLowerCase())) invalid.push('sex');
  if (!VALID_GOAL.has(String(intake.goal).toLowerCase())) invalid.push('goal');
  if (!VALID_KIDNEY.has(String(intake.kidneyStatus).toLowerCase())) invalid.push('kidneyStatus');
  if (!inBounds('age', intake.age)) invalid.push('age');
  if (!inBounds('height_cm', intake.heightCm)) invalid.push('heightCm');
  if (!inBounds('weight_kg', intake.weightKg)) invalid.push('weightKg');
  if (!inBounds('calories', intake.calories)) invalid.push('calories');
  if (!inBounds('proteinG', intake.proteinG)) invalid.push('proteinG');
  if (!inBounds('fatG', intake.fatG)) invalid.push('fatG');
  if (!inBounds('carbG', intake.carbG)) invalid.push('carbG');
  if (!inBounds('tdee', intake.tdee)) invalid.push('tdee');

  if (invalid.length) {
    throw new IntakeError('INTAKE_IMPLAUSIBLE', invalid);
  }

  return intake;
}

/**
 * Guard placed at the top of every report generator.
 *
 * The generators used to open with `const cal = d.calories || 1800`. That single
 * idiom is what turned a lost questionnaire into a confident document about
 * somebody else's body. This is its replacement: state the requirement, and
 * refuse rather than substitute.
 *
 * It is deliberately redundant with validateIntake(). validateIntake() guards the
 * request path; this guards the FUNCTION, so a future caller that reaches a
 * generator by some other route still cannot get a fabricated report out of it.
 *
 * @param {object} d      the intake object
 * @param {string[]} facts field names the generator is about to print or compute from
 * @param {string} who    generator name, for the log line
 */
export function requireFacts(d, facts, who = 'report generator') {
  const missing = [];
  for (const f of facts) {
    const v = d ? d[f] : undefined;
    if (v === undefined || v === null || v === '') missing.push(f);
  }
  if (missing.length) {
    throw new IntakeError('GENERATOR_MISSING_FACTS', missing,
      'We could not generate this report because part of your questionnaire did not ' +
      'reach us. We have not filled in the gaps with assumptions. Email ' +
      'ketodial@carnivoreweekly.com and we will get it to you.');
  }
  return d;
}

/**
 * Fetch and validate the authoritative intake for a session token.
 *
 * Distinguishes three outcomes on purpose, because they need different handling
 * upstream:
 *   - transient (Supabase unreachable or 5xx)  -> throws Error, caller may retry
 *   - definitively unusable (missing/invalid)  -> throws IntakeError, no retry
 *   - usable                                   -> returns the intake
 *
 * @param {string} sessionToken the kd_… token stored in Stripe metadata
 * @param {object} env worker env with SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 */
export async function loadAuthoritativeIntake(sessionToken, env) {
  if (!sessionToken || typeof sessionToken !== 'string' || !/^kd_[A-Za-z0-9]{8,64}$/.test(sessionToken)) {
    throw new IntakeError('INTAKE_REFERENCE_INVALID', ['session_token'],
      'This purchase is not linked to a saved questionnaire, so we have not generated a ' +
      'report rather than guess at your details. Email ketodial@carnivoreweekly.com with ' +
      'your receipt and we will generate it by hand.');
  }

  const url = `${env.SUPABASE_URL}/rest/v1/calculator_sessions_v2` +
    `?session_token=eq.${encodeURIComponent(sessionToken)}&limit=1`;

  let res;
  try {
    res = await fetch(url, {
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Accept': 'application/json',
      },
    });
  } catch (e) {
    // Network failure is transient. Do NOT downgrade it to "no intake" — that
    // would turn an outage into a refused report for a customer whose data is fine.
    throw new Error(`INTAKE_STORE_UNREACHABLE: ${e.message}`);
  }

  if (!res.ok) {
    throw new Error(`INTAKE_STORE_ERROR: ${res.status}`);
  }

  let rows;
  try {
    rows = await res.json();
  } catch (e) {
    throw new Error(`INTAKE_STORE_BAD_RESPONSE: ${e.message}`);
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new IntakeError('INTAKE_NOT_FOUND', ['session record'],
      'We could not find the questionnaire attached to this purchase. We have not ' +
      'generated a report rather than fill in your details with assumptions. Email ' +
      'ketodial@carnivoreweekly.com with your receipt and we will sort it out.');
  }

  return validateIntake(normalizeIntake(rows[0]));
}
