#!/usr/bin/env node
/**
 * tests/goal-horizon-payback.test.mjs — ITEM 3A.
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tests/goal-horizon-payback.test.mjs
 *
 * Drives the REAL derivation against REAL calculator rows. Fixtures only, on the
 * IANA-reserved @example.com domain the sender refuses to mail. Cleans up.
 *
 * WHAT THIS PINS
 * --------------
 * The payback tells a reader how long their own stated goal plausibly takes. Two ways
 * that goes wrong, and both are worse than saying nothing:
 *   - a number derived from a SECOND formula that drifts from the calculator's;
 *   - a number invented where the canonical logic refuses to produce one.
 * So: every calorie figure must come from calculateMacros() through
 * checkTargetEligibility(), and every refusal must surface as a reason, never a
 * gentler estimate.
 */
import { randomUUID } from 'crypto';

const URL_BASE = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) { console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.'); process.exit(1); }
const REST = `${URL_BASE}/rest/v1`;
const H = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (p, i = {}) => fetch(`${REST}${p}`, { ...i, headers: { ...H, ...(i.headers || {}) } });

const mod = await import('file://' + new URL('../api/calculator-api.js', import.meta.url).pathname);
const { __test_computeGoalHorizon: computeGoalHorizon, __test_GOAL_MAGNITUDE_BANDS: BANDS,
        __test_HORIZON_BASIS_VERSION: BASIS, __test_calculateMacros: calculateMacros,
        __test_handleDripSurveySubmit: submit } = mod;
for (const [n, f] of Object.entries({ computeGoalHorizon, BANDS, calculateMacros, submit }))
  if (!f) { console.error(`FATAL: missing test surface export: ${n}`); process.exit(1); }

const env = { SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: KEY };
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { c ? (pass++, console.log(`  PASS  ${m}`)) : (fail++, console.log(`  FAIL  ${m}${d ? ' :: ' + d : ''}`)); };

const stamp = Date.now();
const made = { subs: [], calc: [], questions: [] };

async function fixture({ site = 'cw', email, calc }) {
  const s = (await (await rest('/drip_subscribers', { method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ email: email.toLowerCase(), site, source: 'horizon-test', current_day: 0 }) })).json())[0];
  made.subs.push(s.id);
  if (calc) {
    const c = (await (await rest('/calculator_sessions_v2', { method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ session_token: `hz-${stamp}-${randomUUID().slice(0, 8)}`, email, source: 'horizon-test', ...calc }) })).json())[0];
    made.calc.push(c.id);
  }
  return s;
}
const BASE_F = { sex: 'female', age: 58, weight_value: 200, weight_unit: 'lbs', height_feet: 5, height_inches: 4,
                 goal: 'lose', diet_type: 'carnivore', lifestyle_activity: 'sedentary', deficit_percentage: 20 };

console.log(`\nItem 3A goal-horizon payback — basis ${BASIS}\n`);

// 1 + 2. CW and KD subscribers with calculator context get a usable range.
for (const site of ['cw', 'kd']) {
  const s = await fixture({ site, email: `hz-${site}-${stamp}@example.com`, calc: BASE_F });
  const r = await computeGoalHorizon(env, s.id, 2); // 15-30 lb band
  ok(r.estimate_available === true, `${site.toUpperCase()}: estimate produced`, r.suppression_reason || '');
  ok(r.goal_band === '15_to_30' && r.goal_band_lbs === 22, `${site.toUpperCase()}: band resolved from option order`);
  ok(r.min_weeks > 0 && r.max_weeks > r.min_weeks, `${site.toUpperCase()}: a RANGE, not a single date`, `${r.min_weeks}-${r.max_weeks}w`);
  ok(r.basis_version === BASIS, `${site.toUpperCase()}: basis version stamped`);
  if (site === 'cw') console.log(`        (${r.min_weeks}-${r.max_weeks} weeks / ${r.min_months}-${r.max_months} months at ${r.daily_deficit_kcal} kcal/day)`);
}

// 8. The number is the CANONICAL one: recomputed from calculateMacros, not a second formula.
{
  const s = await fixture({ email: `hz-canon-${stamp}@example.com`, calc: BASE_F });
  const r = await computeGoalHorizon(env, s.id, 3); // 30-50 -> 40 lb
  const m = calculateMacros({ weight: 200, heightFeet: 5, heightInches: 4, age: 58, sex: 'female',
                              goal: 'lose', diet: 'carnivore', lifestyle: 'sedentary', deficit: 20 });
  const expectDeficit = Math.round(m.tdee - m.calories);
  ok(r.daily_deficit_kcal === expectDeficit, 'daily deficit equals calculateMacros(tdee - calories)', `${r.daily_deficit_kcal} vs ${expectDeficit}`);
  ok(r.effective_deficit_pct === m.effectiveDeficitPct, 'reports the EFFECTIVE deficit from canonical logic');
  ok(r.self_service_floor === m.selfServiceFloor, 'carries the canonical self-service floor');
  const expectMin = Math.round((40 * 3500) / (expectDeficit * 7));
  ok(r.min_weeks === expectMin, 'weeks derive from the canonical deficit', `${r.min_weeks} vs ${expectMin}`);
}

// 5a. Floor-capped: the requested deficit is NOT what gets reported.
{
  // Small, older, sedentary female: 20% of TDEE lands under the 1200 floor.
  const s = await fixture({ email: `hz-floor-${stamp}@example.com`,
    calc: { ...BASE_F, age: 72, weight_value: 122, height_feet: 5, height_inches: 0, deficit_percentage: 25 } });
  const r = await computeGoalHorizon(env, s.id, 1);
  if (r.estimate_available) {
    ok(r.floor_applied === true, 'floor-capped case is flagged', JSON.stringify(r.floor_applied));
    ok(r.effective_deficit_pct < r.requested_deficit_pct, 'effective deficit is LOWER than requested (no false claim)',
       `${r.effective_deficit_pct} vs ${r.requested_deficit_pct}`);
  } else {
    ok(r.suppression_reason === 'maintenance_at_or_below_self_service_floor',
       'floor case suppressed with the canonical reason', r.suppression_reason);
  }
}

// 5b. Maintenance at or below the floor: SUPPRESS, never substitute.
{
  const s = await fixture({ email: `hz-suppress-${stamp}@example.com`,
    calc: { ...BASE_F, age: 80, weight_value: 99, height_feet: 4, height_inches: 8, lifestyle_activity: 'sedentary' } });
  const r = await computeGoalHorizon(env, s.id, 1);
  ok(r.estimate_available === false, 'sub-floor maintenance produces NO estimate');
  ok(r.min_weeks === undefined && r.max_weeks === undefined, 'no invented numbers alongside the suppression');
  ok(typeof r.suppression_reason === 'string' && r.suppression_reason.length > 0, 'a reason is given', r.suppression_reason);
}

// 5c. Under 18 refuses through the canonical gate.
{
  const s = await fixture({ email: `hz-minor-${stamp}@example.com`, calc: { ...BASE_F, age: 16 } });
  const r = await computeGoalHorizon(env, s.id, 2);
  ok(r.estimate_available === false && r.suppression_reason === 'under_18_not_supported', 'under 18 suppressed', r.suppression_reason);
}

// 5d. Goal is not weight loss.
{
  const s = await fixture({ email: `hz-gain-${stamp}@example.com`, calc: { ...BASE_F, goal: 'gain' } });
  const r = await computeGoalHorizon(env, s.id, 2);
  ok(r.suppression_reason === 'goal_is_not_weight_loss', 'non-loss goal suppressed', r.suppression_reason);
}

// 3. Mixed-case calculator email still resolves.
{
  const mixed = `HZ-Mixed-${stamp}@Example.COM`;
  const s = await fixture({ email: mixed, calc: { ...BASE_F } });
  // store the calculator row with the ORIGINAL casing, subscriber lowercased
  await rest(`/calculator_sessions_v2?email=eq.${encodeURIComponent(mixed.toLowerCase())}`,
    { method: 'PATCH', body: JSON.stringify({ email: mixed }) });
  const r = await computeGoalHorizon(env, s.id, 2);
  ok(r.has_calculator_context === true && r.estimate_available === true,
     'mixed-case calculator email resolves via case-insensitive lookup', r.suppression_reason || '');
}

// 4. No calculator context: clean no-estimate state, and nothing fabricated.
{
  const s = await fixture({ email: `hz-nocalc-${stamp}@example.com` }); // no calc row
  const r = await computeGoalHorizon(env, s.id, 3);
  ok(r.estimate_available === false && r.suppression_reason === 'no_calculator_context', 'no-context state is clean', r.suppression_reason);
  ok(r.has_calculator_context === false, 'has_calculator_context false');
  ok(r.goal_band === '30_to_50', 'the band they chose is still returned for the writers');
  ok(r.min_weeks === undefined, 'no fabricated horizon');
}

// 9. Edge cases do not produce absurd timelines.
{
  const heavy = await fixture({ email: `hz-heavy-${stamp}@example.com`,
    calc: { ...BASE_F, sex: 'male', age: 45, weight_value: 400, height_feet: 6, height_inches: 2, lifestyle_activity: 'moderate' } });
  const big = await computeGoalHorizon(env, heavy.id, 5); // >80 lb band
  ok(big.estimate_available, 'very heavy subscriber still gets an estimate');
  ok(big.open_ended_band === true, 'open-ended top band flagged so copy can say "at least"');
  ok(big.min_weeks >= 1 && big.max_weeks < 520, 'top band horizon is finite and under 10 years', `${big.min_weeks}-${big.max_weeks}w`);

  const small = await fixture({ email: `hz-small-${stamp}@example.com`,
    calc: { ...BASE_F, sex: 'male', age: 30, weight_value: 260, lifestyle_activity: 'very', deficit_percentage: 25 } });
  const s2 = await computeGoalHorizon(env, small.id, 1); // up to 15 lb
  ok(s2.estimate_available && s2.min_weeks >= 1, 'smallest band never returns 0 weeks', `${s2.min_weeks}w`);
  ok(s2.max_weeks >= s2.min_weeks, 'max is never below min');
  for (const b of BANDS) {
    const r = await computeGoalHorizon(env, heavy.id, b.order);
    ok(Number.isFinite(r.min_weeks) && Number.isFinite(r.max_weeks) && r.min_weeks > 0,
       `band ${b.key} produces finite positive weeks`, `${r.min_weeks}-${r.max_weeks}`);
  }
  ok((await computeGoalHorizon(env, heavy.id, 99)).suppression_reason === 'unknown_goal_band', 'unknown band rejected');
}

// 7. The payback leaks nothing. It is derived data only.
{
  const s = await fixture({ email: `hz-leak-${stamp}@example.com`, calc: { ...BASE_F } });
  const r = await computeGoalHorizon(env, s.id, 2);
  const blob = JSON.stringify(r).toLowerCase();
  for (const [label, needle] of [['email', 'example.com'], ['a weight field', '"weight"'],
                                 ['subscriber id', s.id.toLowerCase()], ['checkin token', (s.checkin_token || 'x').toLowerCase()],
                                 ['conditions', 'condition'], ['medications', 'medication'], ['height', 'height'], ['age', '"age"']])
    ok(!blob.includes(needle), `payback exposes no ${label}`);
  // Check VALUES, not substrings. An earlier version of this test flagged
  // self_service_floor: 1200 as "leaking" the fixture's 200 lb weight, which it
  // plainly does not -- 1200 is a constant, identical for every female subscriber.
  const values = Object.values(r).filter((v) => typeof v === 'number');
  for (const [label, secret] of [['current weight', 200], ['age', 58], ['height inches', 64]])
    ok(!values.includes(secret), `no field carries the subscriber's ${label}`);
  const allowed = ['basis_version','goal_band','goal_band_lbs','goal_band_open_ended','has_calculator_context',
    'estimate_available','suppression_reason','min_weeks','max_weeks','min_months','max_months','daily_deficit_kcal',
    'requested_deficit_pct','effective_deficit_pct','floor_applied','self_service_floor','long_horizon','open_ended_band'];
  const extra = Object.keys(r).filter((k) => !allowed.includes(k));
  ok(extra.length === 0, 'payback returns only the agreed derived fields', extra.join(','));
}

// 6. Idempotency of the answer itself is unchanged by the payback wiring.
{
  const s = await fixture({ email: `hz-idem-${stamp}@example.com`, calc: { ...BASE_F } });
  // A day with an active question that is NOT goal_target: proves the wiring does not
  // disturb the existing path. goal_target itself ships INACTIVE until the copy lands.
  const q = (await (await rest('/drip_survey_questions?site=eq.cw&day=eq.1&active=eq.true&select=id&limit=1')).json())[0];
  const o = (await (await rest(`/drip_survey_options?question_id=eq.${q.id}&select=id&limit=1`)).json())[0];
  const call = () => submit(new Request('https://x/api/v1/drip-survey', { method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ site: 'cw', day: 1, option_ids: [o.id], fingerprint: randomUUID(), token: s.checkin_token }) }), env);
  const r1 = await call(), r2 = await call();
  const rows = await (await rest(`/drip_survey_responses?subscriber_id=eq.${s.id}&select=id`)).json();
  ok(r1.status === 200 && r2.status === 200, 'duplicate submission still returns 200 twice');
  ok(rows.length === 1, 'duplicate submission remains idempotent', `${rows.length} rows`);
  const body = await r2.json();
  ok(body.goal_horizon === undefined, 'no goal_horizon on a non-goal_target answer');
}

// goal_target ships inactive on purpose.
{
  const q = await (await rest('/drip_survey_questions?question_key=eq.goal_target&select=site,active,version')).json();
  ok(q.length === 2, 'goal_target seeded for both sites', `${q.length}`);
  ok(q.every((x) => x.active === false), 'goal_target is INACTIVE until the writers supply copy');
  ok(q.every((x) => x.version === 1), 'version column populated');
}

// cleanup
for (const id of made.subs) {
  await rest(`/drip_survey_responses?subscriber_id=eq.${id}`, { method: 'DELETE' });
  await rest(`/drip_subscribers?id=eq.${id}`, { method: 'DELETE' });
}
await rest(`/calculator_sessions_v2?source=eq.horizon-test`, { method: 'DELETE' });
{
  const leftS = (await (await rest('/drip_subscribers?source=eq.horizon-test&select=id')).json()).length;
  const leftC = (await (await rest('/calculator_sessions_v2?source=eq.horizon-test&select=id')).json()).length;
  ok(leftS === 0 && leftC === 0, 'fixtures cleaned up', `${leftS}/${leftC}`);
}
console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
