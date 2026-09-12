#!/usr/bin/env node
/**
 * tests/day5-readiness.test.mjs
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tests/day5-readiness.test.mjs
 *
 * Covers the sixth goal_target option. Fixtures only, on the IANA-reserved
 * @example.com domain the sender refuses to mail. Cleans up.
 *
 * WHAT THIS PINS
 * --------------
 * "I don't have a specific number yet" is an ANSWER, not an error and not a zero. The
 * failure modes it exists to prevent are a reader taping a band that is not true, and
 * the system inventing a magnitude for somebody who explicitly declined to give one.
 * So: it records like any other answer, it returns its own reason, and it never
 * produces a number. The five numeric boundaries must be untouched by its arrival.
 */
import { randomUUID } from 'crypto';

const URL_BASE = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) { console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.'); process.exit(1); }
const REST = `${URL_BASE}/rest/v1`;
const H = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (p, i = {}) => fetch(`${REST}${p}`, { ...i, headers: { ...H, ...(i.headers || {}) } });

const mod = await import('file://' + new URL('../api/calculator-api.js', import.meta.url).pathname);
const { __test_computeGoalHorizon: horizon, __test_GOAL_MAGNITUDE_BANDS: BANDS,
        __test_bandForOptionOrder: bandFor } = mod;
for (const [n, f] of Object.entries({ horizon, BANDS, bandFor }))
  if (!f) { console.error(`FATAL: missing test surface export: ${n}`); process.exit(1); }

const env = { SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: KEY };
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { c ? (pass++, console.log(`  PASS  ${m}`)) : (fail++, console.log(`  FAIL  ${m}${d ? ' :: ' + d : ''}`)); };

const stamp = Date.now();
const subs = [];
const RESP_BEFORE = (await (await rest('/drip_survey_responses?select=id')).json()).length;
console.log(`\nDay-5 readiness: sixth goal_target option — ${RESP_BEFORE} responses before\n`);

const F = { sex: 'female', age: 58, weight_value: 200, weight_unit: 'lbs', height_feet: 5, height_inches: 4,
            goal: 'lose', diet_type: 'carnivore', lifestyle_activity: 'sedentary', deficit_percentage: 20 };
async function mkSub(site, tag, calc = F) {
  const email = `d5r-${tag}-${stamp}@example.com`;
  const s = (await (await rest('/drip_subscribers', { method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ email, site, source: 'day5-readiness', current_day: 0 }) })).json())[0];
  subs.push(s.id);
  if (calc) await rest('/calculator_sessions_v2', { method: 'POST',
    body: JSON.stringify({ session_token: `d5r-${stamp}-${randomUUID().slice(0, 8)}`, email, source: 'day5-readiness', ...calc }) });
  return s;
}

try {
  // REQ 1: the five numeric bands are UNCHANGED by the sixth arriving.
  {
    const numeric = BANDS.filter((b) => b.numeric !== false);
    ok(numeric.length === 5, 'still exactly five numeric bands', String(numeric.length));
    const contract = [['up_to_15', 1, 10], ['15_to_30', 2, 22], ['30_to_50', 3, 40], ['50_to_80', 4, 65], ['over_80', 5, 80]];
    for (const [key, order, lbs] of contract) {
      const b = bandFor(order);
      ok(b && b.key === key && b.lbs === lbs, `band ${order} is still ${key} at ${lbs} lb`, b ? `${b.key}/${b.lbs}` : 'missing');
    }
    ok(BANDS.find((b) => b.order === 5).openEnded === true, 'the 80+ band is still open-ended');

    const s = await mkSub('cw', 'numeric');
    for (const [key, order] of contract) {
      const r = await horizon(env, s.id, order);
      ok(r.estimate_available === true && r.min_weeks > 0 && r.max_weeks > r.min_weeks,
         `band ${key} still returns a real horizon range`, `${r.min_weeks}-${r.max_weeks}`);
    }
  }

  // REQ 2 + 3: the sixth option answers without fabricating anything.
  for (const site of ['cw', 'kd']) {
    const s = await mkSub(site, `six-${site}`);
    const r = await horizon(env, s.id, 6);
    ok(r.estimate_available === false, `${site.toUpperCase()}: sixth option returns no estimate`);
    ok(r.suppression_reason === 'no_specific_goal', `${site.toUpperCase()}: distinct reason "no_specific_goal"`, r.suppression_reason);
    ok(r.goal_band === 'no_specific_number', `${site.toUpperCase()}: the selected option is preserved`, r.goal_band);
    ok(r.goal_band_lbs === null, `${site.toUpperCase()}: no magnitude substituted`, String(r.goal_band_lbs));
    for (const k of ['min_weeks', 'max_weeks', 'min_months', 'max_months', 'daily_deficit_kcal'])
      ok(r[k] === undefined, `${site.toUpperCase()}: no ${k} fabricated`);
    // Not an error: it is a legitimate answer with its own reason, distinguishable from
    // both the unknown-band error and the no-calculator case.
    ok(r.suppression_reason !== 'unknown_goal_band', `${site.toUpperCase()}: NOT treated as an unknown band`);
    ok(r.suppression_reason !== 'no_calculator_context', `${site.toUpperCase()}: NOT confused with missing context`);
  }

  // The sixth option runs NO calculation, so it must not read the profile at all.
  // Proof: a subscriber whose context would normally suppress for a different reason
  // still gets no_specific_goal, which can only happen if the lookup never ran.
  {
    const s = await mkSub('cw', 'nocalc', null); // no calculator row at all
    const r = await horizon(env, s.id, 6);
    ok(r.suppression_reason === 'no_specific_goal',
       'sixth option short-circuits before the calculator lookup', r.suppression_reason);
    ok(r.has_calculator_context === false, 'and reports no context rather than claiming one');
  }

  // Privacy: the sixth-option payload leaks nothing either.
  {
    const s = await mkSub('cw', 'priv');
    const r = await horizon(env, s.id, 6);
    const blob = JSON.stringify(r).toLowerCase();
    for (const [label, needle] of [['email', 'example.com'], ['subscriber id', s.id.toLowerCase()],
                                   ['token', (s.checkin_token || 'zz').toLowerCase()], ['calorie figure', 'kcal']])
      ok(!blob.includes(needle), `sixth-option payload exposes no ${label}`);
    const values = Object.values(r).filter((v) => typeof v === 'number');
    ok(!values.includes(200) && !values.includes(58), 'no stored weight or age in the payload');
  }

  // An out-of-range order is still an error, distinct from the legitimate sixth.
  ok((await horizon(env, subs[0], 7)).suppression_reason === 'unknown_goal_band', 'band 7 is still an unknown band');
  ok(bandFor(6) !== null && bandFor(6).numeric === false, 'band 6 resolves and is flagged non-numeric');

  // The option exists on BOTH sites, on the inactive question, at display_order 6.
  {
    const rows = await (await rest(
      '/drip_survey_options?select=display_order,option_text,drip_survey_questions(site,active,question_key,version)' +
      '&drip_survey_questions.question_key=eq.goal_target&display_order=eq.6')).json();
    const mine = rows.filter((r) => r.drip_survey_questions);
    ok(mine.length === 2, 'seeded on both sites', String(mine.length));
    ok(mine.every((r) => r.drip_survey_questions.active === false), 'still on the INACTIVE question');
    ok(mine.every((r) => r.drip_survey_questions.version === 1), 'same question version as the five bands');
    ok(mine.every((r) => r.option_text === "I don't have a specific number yet"), 'stable option text');
  }
} finally {
  for (const id of subs) {
    await rest(`/drip_survey_responses?subscriber_id=eq.${id}`, { method: 'DELETE' });
    await rest(`/drip_subscribers?id=eq.${id}`, { method: 'DELETE' });
  }
  await rest('/calculator_sessions_v2?source=eq.day5-readiness', { method: 'DELETE' });
}

{
  const after = (await (await rest('/drip_survey_responses?select=id')).json()).length;
  const left = (await (await rest('/drip_subscribers?source=eq.day5-readiness&select=id')).json()).length;
  const active = (await (await rest('/drip_survey_questions?active=eq.true&select=id')).json()).length;
  const goalActive = (await (await rest('/drip_survey_questions?question_key=eq.goal_target&active=eq.true&select=id')).json()).length;
  ok(after === RESP_BEFORE, `responses back to ${RESP_BEFORE}`, String(after));
  ok(left === 0, 'fixtures cleaned up');
  ok(active === 76, 'active question count still 76', String(active));
  ok(goalActive === 0, 'goal_target still INACTIVE');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
