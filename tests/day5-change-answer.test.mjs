#!/usr/bin/env node
/**
 * tests/day5-change-answer.test.mjs
 *
 * The DATABASE half of "Change my answer". The browser half (parity, adjacency, tap
 * targets) is verified by rendering; this proves that changing your mind REPLACES your
 * answer rather than adding to it.
 *
 * Fixtures only, @example.com (IANA-reserved, on the sender's undeliverable list).
 * Cleans up. Never touches the historical anonymous rows.
 *
 * WHY IT MATTERS
 * --------------
 * A reader who taps three times before settling must leave ONE observation behind. If
 * each tap accumulated, the only field this question exists to collect would be
 * silently weighted toward indecisive people, and every later reading of the goal
 * distribution would be wrong in a way nobody would notice.
 */
import { randomUUID } from 'crypto';

const URL_BASE = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) { console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.'); process.exit(1); }
const REST = `${URL_BASE}/rest/v1`;
const H = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (p, i = {}) => fetch(`${REST}${p}`, { ...i, headers: { ...H, ...(i.headers || {}) } });

const mod = await import('file://' + new URL('../api/calculator-api.js', import.meta.url).pathname);
const submit = mod.__test_handleDripSurveySubmit;
if (!submit) { console.error('FATAL: missing __test_handleDripSurveySubmit'); process.exit(1); }
const env = { SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: KEY };

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { c ? (pass++, console.log(`  PASS  ${m}`)) : (fail++, console.log(`  FAIL  ${m}${d ? ' :: ' + d : ''}`)); };

const stamp = Date.now();
const subs = [], qs = [];
const RESP_BEFORE = (await (await rest('/drip_survey_responses?select=id')).json()).length;
const ANON_BEFORE = (await (await rest('/drip_survey_responses?subscriber_id=is.null&select=id')).json()).length;
console.log(`\nDay-5 change-my-answer (database half) — ${RESP_BEFORE} responses (${ANON_BEFORE} anonymous) before\n`);

// goal_target is INACTIVE by design, and the submit handler only accepts options from
// ACTIVE questions. So the test seeds its own active six-option question on DAY 22 --
// a day no email links to and no subscriber can reach -- and deletes it afterwards.
// The real day-5 question is never touched or activated.
const DAY = 22;

async function seedQuestion(site) {
  const q = (await (await rest('/drip_survey_questions', { method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ site, day: DAY, question_key: 'goal_target', version: 1, active: true,
      question_text: 'fixture', question_type: 'single', archetype: 'personalization', display_order: 0 }) })).json())[0];
  qs.push(q.id);
  const opts = (await (await rest('/drip_survey_options', { method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify([1, 2, 3, 4, 5, 6].map((n) => ({ question_id: q.id, option_text: `band ${n}`, display_order: n }))) })).json())
    .sort((a, b) => a.display_order - b.display_order);
  return { q, opts };
}
async function mkSub(site, tag) {
  const email = `chg-${tag}-${stamp}@example.com`;
  const s = (await (await rest('/drip_subscribers', { method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ email, site, source: 'change-answer-test', current_day: 0 }) })).json())[0];
  subs.push(s.id);
  await rest('/calculator_sessions_v2', { method: 'POST', body: JSON.stringify({
    session_token: `chg-${stamp}-${randomUUID().slice(0, 8)}`, email, source: 'change-answer-test',
    sex: 'female', age: 58, weight_value: 200, weight_unit: 'lbs', height_feet: 5, height_inches: 4,
    goal: 'lose', diet_type: 'carnivore', lifestyle_activity: 'sedentary', deficit_percentage: 20 }) });
  return s;
}
const answer = (site, token, optId) => submit(new Request('https://x/api/v1/drip-survey', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ site, day: DAY, option_ids: [optId], fingerprint: randomUUID(), token, answered_via: 'page' }),
}), env);
const rowsFor = async (id) => (await (await rest(
  `/drip_survey_responses?subscriber_id=eq.${id}&select=option_id,day,answered_via`)).json());

try {
  const seeded = {};
  for (const site of ['cw', 'kd']) {
    const { opts } = await seedQuestion(site);
    seeded[site] = opts;
    const s = await mkSub(site, site);
    const S = site.toUpperCase();

    // 1. First answer: a numeric band.
    let r = await answer(site, s.checkin_token, opts[1].id);   // band 2
    let body = await r.json();
    ok(r.status === 200, `${S}: numeric answer accepted`);
    ok(body.goal_horizon && body.goal_horizon.estimate_available === true, `${S}: numeric answer returns a horizon`);
    let rows = await rowsFor(s.id);
    ok(rows.length === 1 && rows[0].option_id === opts[1].id, `${S}: exactly one observation after the first answer`, `${rows.length}`);

    // 3. Change to a DIFFERENT numeric band: replaced, not accumulated.
    r = await answer(site, s.checkin_token, opts[3].id);       // band 4
    body = await r.json();
    rows = await rowsFor(s.id);
    ok(rows.length === 1, `${S}: still exactly one observation after changing`, `${rows.length}`);
    ok(rows[0].option_id === opts[3].id, `${S}: the stored answer is the NEW one`, rows[0].option_id);
    ok(body.goal_horizon.goal_band === '50_to_80', `${S}: the horizon matches the new band`, body.goal_horizon.goal_band);

    // 4. Numeric -> no-specific-number.
    r = await answer(site, s.checkin_token, opts[5].id);       // band 6
    body = await r.json();
    rows = await rowsFor(s.id);
    ok(rows.length === 1 && rows[0].option_id === opts[5].id, `${S}: numeric -> no-specific-number replaces cleanly`, `${rows.length}`);
    ok(body.goal_horizon.suppression_reason === 'no_specific_goal', `${S}: state E returned`, body.goal_horizon.suppression_reason);
    ok(body.goal_horizon.min_weeks === undefined, `${S}: no stale number carried over from the previous answer`);

    // 5. No-specific-number -> numeric, back again.
    r = await answer(site, s.checkin_token, opts[0].id);       // band 1
    body = await r.json();
    rows = await rowsFor(s.id);
    ok(rows.length === 1 && rows[0].option_id === opts[0].id, `${S}: no-specific-number -> numeric replaces cleanly`, `${rows.length}`);
    ok(body.goal_horizon.estimate_available === true && body.goal_horizon.min_weeks > 0,
       `${S}: the horizon comes back after returning to a numeric band`);

    // 6. Six changes in a row still leave one row.
    for (const o of opts) await answer(site, s.checkin_token, o.id);
    rows = await rowsFor(s.id);
    ok(rows.length === 1, `${S}: six consecutive changes leave ONE observation`, `${rows.length}`);
    ok(rows[0].option_id === opts[5].id, `${S}: the final stored answer is the last one tapped`);

    // Privacy: nothing personal in any of these responses.
    const blob = JSON.stringify(body).toLowerCase();
    ok(!blob.includes('example.com') && !blob.includes(s.checkin_token.toLowerCase()) && !blob.includes(s.id.toLowerCase()),
       `${S}: no email, token or subscriber id in the response`);
  }

  // 8. Two subscribers changing answers never affect each other.
  {
    // Reuse the CW question already seeded above. Seeding a second one collides with
    // the unique index on (site, day, question_key, version), which is correct
    // behaviour by the schema and was a bug in this test.
    const opts = seeded.cw;
    const a = await mkSub('cw', 'a'), b = await mkSub('cw', 'b');
    await answer('cw', a.checkin_token, opts[0].id);
    await answer('cw', b.checkin_token, opts[4].id);
    await answer('cw', a.checkin_token, opts[2].id);   // A changes
    const ra = await rowsFor(a.id), rb = await rowsFor(b.id);
    ok(ra.length === 1 && ra[0].option_id === opts[2].id, "A's change is recorded", `${ra.length}`);
    ok(rb.length === 1 && rb[0].option_id === opts[4].id, "B's answer is untouched by A's change", `${rb.length}`);
  }
} finally {
  for (const id of subs) {
    await rest(`/drip_survey_responses?subscriber_id=eq.${id}`, { method: 'DELETE' });
    await rest(`/drip_subscribers?id=eq.${id}`, { method: 'DELETE' });
  }
  await rest('/calculator_sessions_v2?source=eq.change-answer-test', { method: 'DELETE' });
  for (const id of qs) {
    await rest(`/drip_survey_responses?question_id=eq.${id}`, { method: 'DELETE' });
    await rest(`/drip_survey_options?question_id=eq.${id}`, { method: 'DELETE' });
    await rest(`/drip_survey_questions?id=eq.${id}`, { method: 'DELETE' });
  }
}

{
  const after = (await (await rest('/drip_survey_responses?select=id')).json()).length;
  const anon = (await (await rest('/drip_survey_responses?subscriber_id=is.null&select=id')).json()).length;
  const day22 = (await (await rest(`/drip_survey_questions?day=eq.${DAY}&select=id`)).json()).length;
  const active = (await (await rest('/drip_survey_questions?active=eq.true&select=id')).json()).length;
  const goalActive = (await (await rest('/drip_survey_questions?question_key=eq.goal_target&active=eq.true&select=id')).json()).length;
  ok(after === RESP_BEFORE, `responses back to ${RESP_BEFORE}`, String(after));
  ok(anon === ANON_BEFORE, `all ${ANON_BEFORE} anonymous rows untouched`, String(anon));
  ok(day22 === 0, 'fixture question removed');
  ok(active === 76, 'active question count still 76', String(active));
  ok(goalActive === 0, 'the real goal_target is still INACTIVE');
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
