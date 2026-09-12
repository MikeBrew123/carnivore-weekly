#!/usr/bin/env node
/**
 * tests/checkin-trend-engine.test.mjs — ITEM 3B.
 *
 * Run: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node tests/checkin-trend-engine.test.mjs
 *
 * Fixtures only, on the IANA-reserved @example.com domain the sender refuses to mail.
 * Cleans up. Never touches the 103 historical anonymous responses.
 *
 * WHAT THIS PINS
 * --------------
 * A trend is a claim about one person over time, so the ways it goes wrong are all
 * ways of inventing a pairing that does not exist:
 *   - pairing two different subscribers;
 *   - pairing an anonymous historical row with an identified one;
 *   - pairing answers whose option words changed underneath them;
 *   - showing a trend to whoever forwarded the link.
 * Each of those has a test below, and each must FAIL CLOSED with a reason rather than
 * produce a plausible-looking number.
 */
import { randomUUID } from 'crypto';

const URL_BASE = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) { console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.'); process.exit(1); }
const REST = `${URL_BASE}/rest/v1`;
const H = { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` };
const rest = (p, i = {}) => fetch(`${REST}${p}`, { ...i, headers: { ...H, ...(i.headers || {}) } });

const mod = await import('file://' + new URL('../api/calculator-api.js', import.meta.url).pathname);
const { __test_computeCheckinTrend: trend, __test_CHECKIN_TREND_SERIES: SERIES,
        __test_TREND_BASIS_VERSION: BASIS, __test_optionSignature: optionSignature } = mod;
for (const [n, f] of Object.entries({ trend, SERIES, BASIS, optionSignature }))
  if (!f) { console.error(`FATAL: missing test surface export: ${n}`); process.exit(1); }

const env = { SUPABASE_URL: URL_BASE, SUPABASE_SERVICE_ROLE_KEY: KEY };
let pass = 0, fail = 0;
const ok = (c, m, d = '') => { c ? (pass++, console.log(`  PASS  ${m}`)) : (fail++, console.log(`  FAIL  ${m}${d ? ' :: ' + d : ''}`)); };

const stamp = Date.now();
const madeSubs = [], madeQs = [];

const RESP_BEFORE = (await (await rest('/drip_survey_responses?select=id')).json()).length;
const ANON_BEFORE = (await (await rest('/drip_survey_responses?subscriber_id=is.null&select=id')).json()).length;
console.log(`\nItem 3B check-in trend — basis ${BASIS} — ${RESP_BEFORE} responses (${ANON_BEFORE} anonymous) before\n`);

async function mkSub(site, tag) {
  const s = (await (await rest('/drip_subscribers', { method: 'POST', headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ email: `trend-${tag}-${stamp}@example.com`, site, source: 'trend-test', current_day: 0 }) })).json())[0];
  madeSubs.push(s.id); return s;
}
/** The REAL frozen question for (site, day, key), so the test exercises production rows. */
async function realQuestion(site, day, key) {
  const q = (await (await rest(`/drip_survey_questions?site=eq.${site}&day=eq.${day}&question_key=eq.${key}&select=id,version`)).json())[0];
  const o = await (await rest(`/drip_survey_options?question_id=eq.${q.id}&select=id,option_text,display_order&order=display_order.asc`)).json();
  return { ...q, options: o };
}
/** Write an identified answer directly, so the test controls day and rank precisely. */
async function answer(sub, site, day, key, rankIndex) {
  const q = await realQuestion(site, day, key);
  const opt = q.options[rankIndex];
  await rest('/drip_survey_responses', { method: 'POST', body: JSON.stringify({
    question_id: q.id, option_id: opt.id, site, day, source: 'drip',
    fingerprint: randomUUID(), subscriber_id: sub.id, answered_via: 'one_tap' }) });
  return opt;
}

try {
  // 1 + 3. CW: a real improvement across the frozen scale.
  {
    const s = await mkSub('cw', 'cw-improve');
    await answer(s, 'cw', 2, 'checkin_energy', 1);  // Dragging
    await answer(s, 'cw', 2, 'checkin_mood', 1);    // Flat
    await answer(s, 'cw', 14, 'checkin_energy', 3); // Good
    await answer(s, 'cw', 14, 'checkin_mood', 3);   // Good
    const t = await trend(env, s.id, 'cw', 14);
    ok(t.trend_available === true, 'CW: paired answers produce a trend', t.reason || '');
    ok(t.series.checkin_energy.status === 'improved', 'CW: improvement detected', t.series.checkin_energy.status);
    ok(t.series.checkin_energy.step_change === 2, 'CW: step change is +2', String(t.series.checkin_energy.step_change));
    ok(t.series.checkin_energy.baseline_label === 'Dragging' && t.series.checkin_energy.current_label === 'Good',
       'CW: baseline and current labels carried');
    ok(t.series.checkin_energy.elapsed_days === 12, 'CW: elapsed days = 14 - 2', String(t.series.checkin_energy.elapsed_days));
    ok(t.series.checkin_energy.scale_points === 5, 'CW: 5-point scale reported');
    ok(t.series.checkin_hunger.status === 'insufficient_data' && t.series.checkin_hunger.reason === 'no_answers',
       'CW: an unanswered series is insufficient_data, not a fake zero', t.series.checkin_hunger.reason);
  }

  // 2. KD, whose options are numbered from 0 rather than 1. Rank-based scaling must
  //    make this behave identically to CW.
  {
    const s = await mkSub('kd', 'kd-improve');
    await answer(s, 'kd', 2, 'checkin_energy', 0);  // Running on empty
    await answer(s, 'kd', 14, 'checkin_energy', 4); // Firing on all cylinders
    const t = await trend(env, s.id, 'kd', 14);
    ok(t.trend_available === true, 'KD: paired answers produce a trend', t.reason || '');
    ok(t.series.checkin_energy.status === 'improved', 'KD: improvement detected');
    ok(t.series.checkin_energy.baseline_rank === 1 && t.series.checkin_energy.current_rank === 5,
       'KD: ranks are 1-based despite display_order starting at 0',
       `${t.series.checkin_energy.baseline_rank}->${t.series.checkin_energy.current_rank}`);
    ok(t.series.checkin_energy.step_change === 4, 'KD: full-scale step change');
  }

  // 4. Unchanged.
  {
    const s = await mkSub('cw', 'cw-same');
    await answer(s, 'cw', 2, 'checkin_mood', 2);
    await answer(s, 'cw', 14, 'checkin_mood', 2);
    const t = await trend(env, s.id, 'cw', 14);
    ok(t.series.checkin_mood.status === 'unchanged', 'unchanged detected', t.series.checkin_mood.status);
    ok(t.series.checkin_mood.step_change === 0, 'step change is 0');
  }

  // 5. Worsening.
  {
    const s = await mkSub('cw', 'cw-worse');
    await answer(s, 'cw', 2, 'checkin_hunger', 4);   // Cravings are gone
    await answer(s, 'cw', 14, 'checkin_hunger', 0);  // Constant cravings
    const t = await trend(env, s.id, 'cw', 14);
    ok(t.series.checkin_hunger.status === 'worsened', 'worsening detected', t.series.checkin_hunger.status);
    ok(t.series.checkin_hunger.step_change === -4, 'negative step change', String(t.series.checkin_hunger.step_change));
  }

  // Weight is categorical and NOT valenced. It must never be called improvement.
  {
    const s = await mkSub('cw', 'cw-weight');
    await answer(s, 'cw', 2, 'checkin_weight', 1);   // Holding steady
    await answer(s, 'cw', 14, 'checkin_weight', 0);  // Trending down
    const t = await trend(env, s.id, 'cw', 14);
    const w = t.series.checkin_weight;
    ok(w.status === 'changed', 'weight movement reported as "changed", not "improved"', w.status);
    ok(w.valence === null && w.valence_reason === 'goal_dependent', 'weight carries no valence judgement');
    ok(w.ordinal === false, 'weight is marked non-ordinal');
    ok(!('step_change' in w), 'no step_change invented for a categorical measure');
  }
  {
    // The not-weighed option is a non-answer, not a scale point.
    const s = await mkSub('cw', 'cw-noweigh');
    await answer(s, 'cw', 2, 'checkin_weight', 3);   // the not-weighed option
    await answer(s, 'cw', 14, 'checkin_weight', 0);
    const t = await trend(env, s.id, 'cw', 14);
    ok(t.series.checkin_weight.status === 'insufficient_data' && t.series.checkin_weight.reason === 'not_measured',
       'not-weighed baseline is a non-answer, not a comparison', t.series.checkin_weight.reason);
  }

  // 6. Missing baseline: the state every mid-sequence subscriber is in today.
  {
    const s = await mkSub('cw', 'cw-nobase');
    await answer(s, 'cw', 14, 'checkin_energy', 3); // day 14 only
    const t = await trend(env, s.id, 'cw', 14);
    ok(t.trend_available === false, 'no baseline -> trend_available false');
    ok(t.reason === 'no_baseline', 'machine-readable reason given', t.reason);
    ok(t.series.checkin_energy.status === 'insufficient_data', 'series marked insufficient_data');
    ok(!('step_change' in (t.series.checkin_energy || {})), 'nothing computed from a single point');
  }
  {
    const s = await mkSub('cw', 'cw-empty');
    const t = await trend(env, s.id, 'cw', 14);
    ok(t.trend_available === false && t.reason === 'no_identified_answers', 'subscriber with no answers at all', t.reason);
  }

  // 7. An ANONYMOUS historical row must never become somebody's baseline.
  {
    const s = await mkSub('cw', 'cw-anon');
    const q3 = await realQuestion('cw', 2, 'checkin_energy');
    // An anonymous day-3 answer that shares this subscriber's fingerprint: the closest
    // thing to a tempting false baseline. subscriber_id is NULL, so it must be ignored.
    const fp = randomUUID();
    await rest('/drip_survey_responses', { method: 'POST', body: JSON.stringify({
      question_id: q3.id, option_id: q3.options[0].id, site: 'cw', day: 2, source: 'drip', fingerprint: fp }) });
    await answer(s, 'cw', 14, 'checkin_energy', 4);
    const t = await trend(env, s.id, 'cw', 14);
    ok(t.trend_available === false && t.reason === 'no_baseline',
       'anonymous row is NOT adopted as a personal baseline', `${t.trend_available}/${t.reason}`);
    await rest(`/drip_survey_responses?fingerprint=eq.${fp}`, { method: 'DELETE' });
  }

  // 8. Two different subscribers can never pair.
  {
    const a = await mkSub('cw', 'cw-a'), b = await mkSub('cw', 'cw-b');
    await answer(a, 'cw', 2, 'checkin_mood', 0);   // A's baseline only
    await answer(b, 'cw', 14, 'checkin_mood', 4);  // B's current only
    const tb = await trend(env, b.id, 'cw', 14);
    ok(tb.trend_available === false && tb.reason === 'no_baseline',
       "subscriber B cannot borrow subscriber A's baseline", `${tb.trend_available}/${tb.reason}`);
    const ta = await trend(env, a.id, 'cw', 14);
    ok(ta.trend_available === false, "subscriber A cannot borrow subscriber B's current answer");
  }

  // Cross-site isolation: a CW baseline must not pair with a KD current answer.
  {
    const s = await mkSub('cw', 'cw-xsite');
    await answer(s, 'cw', 2, 'checkin_energy', 1);
    const t = await trend(env, s.id, 'kd', 14);
    ok(t.trend_available === false, 'a CW baseline does not surface under KD', t.reason);
  }

  // 9. Incompatible versions and incompatible option sets both refuse.
  {
    const s = await mkSub('cw', 'cw-ver');
    await answer(s, 'cw', 2, 'checkin_energy', 1);
    // A v2 of the same key on day 14, with DIFFERENT words: the scale changed, so the
    // comparison must be refused rather than silently made.
    const q2 = (await (await rest('/drip_survey_questions', { method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ site: 'cw', day: 14, question_key: 'checkin_energy', version: 2, active: false,
        question_text: 'fixture v2', question_type: 'single', display_order: 9 }) })).json())[0];
    madeQs.push(q2.id);
    const o2 = (await (await rest('/drip_survey_options', { method: 'POST', headers: { Prefer: 'return=representation' },
      body: JSON.stringify([1, 2, 3].map((n) => ({ question_id: q2.id, option_text: `v2 option ${n}`, display_order: n }))) })).json());
    await rest('/drip_survey_responses', { method: 'POST', body: JSON.stringify({
      question_id: q2.id, option_id: o2[2].id, site: 'cw', day: 14, source: 'drip',
      fingerprint: randomUUID(), subscriber_id: s.id, answered_via: 'one_tap' }) });
    const t = await trend(env, s.id, 'cw', 14);
    ok(t.series.checkin_energy.status === 'insufficient_data', 'version mismatch refuses comparison', t.series.checkin_energy.status);
    ok(t.series.checkin_energy.reason === 'incompatible_version', 'reason names the version mismatch', t.series.checkin_energy.reason);
    ok(t.series.checkin_energy.baseline_version === 1 && t.series.checkin_energy.current_version === 2,
       'both versions reported so the mismatch is diagnosable');
  }
  {
    const a = await realQuestion('cw', 2, 'checkin_energy');
    const b = await realQuestion('cw', 14, 'checkin_energy');
    ok(optionSignature(a.options) === optionSignature(b.options), 'the real day-2 and day-14 option sets are identical (frozen)');
    ok(optionSignature(a.options) !== optionSignature(a.options.slice(0, 3)), 'a changed option set produces a different signature');
  }

  // 10. Duplicate submissions must not distort the trend.
  {
    const s = await mkSub('cw', 'cw-dup');
    await answer(s, 'cw', 2, 'checkin_energy', 1);
    await answer(s, 'cw', 14, 'checkin_energy', 3);
    const before = await trend(env, s.id, 'cw', 14);
    // A second identical day-14 answer, the shape a mail-client prefetch produces.
    try { await answer(s, 'cw', 14, 'checkin_energy', 3); } catch { /* unique index may reject */ }
    const after = await trend(env, s.id, 'cw', 14);
    ok(after.series.checkin_energy.step_change === before.series.checkin_energy.step_change,
       'duplicate answer does not change the step', `${before.series.checkin_energy.step_change} -> ${after.series.checkin_energy.step_change}`);
    ok(after.series.checkin_energy.baseline_day === 2, 'baseline day unchanged by the duplicate');
  }

  // 11 + 12. Privacy: the engine is unreachable by token, and its output carries
  //          nothing personal beyond the answers the subscriber gave.
  {
    const s = await mkSub('cw', 'cw-priv');
    await answer(s, 'cw', 2, 'checkin_energy', 1);
    await answer(s, 'cw', 14, 'checkin_energy', 3);
    const t = await trend(env, s.id, 'cw', 14);
    const blob = JSON.stringify(t).toLowerCase();
    for (const [label, needle] of [['email', 'example.com'], ['checkin token', s.checkin_token.toLowerCase()],
                                   ['subscriber id', s.id.toLowerCase()], ['fingerprint', 'fingerprint'],
                                   ['ip address', 'ip_address'], ['medications', 'medication'],
                                   ['conditions', 'condition'], ['weight value', 'weight_value'],
                                   ['option ids', 'option_id']])
      ok(!blob.includes(needle), `trend output exposes no ${label}`);

    // The whole privacy argument: no HTTP route reaches this engine, so a forwarded
    // token cannot retrieve history. Asserted against the source, not just by habit.
    const { readFileSync } = await import('fs');
    const src = readFileSync(new URL('../api/calculator-api.js', import.meta.url).pathname, 'utf8');
    // Routing only: stop at the export block, which legitimately names the function
    // for the test surface. An earlier version of this assertion swept that in and
    // failed on its own export.
    const routing = src.slice(src.indexOf('async fetch(request, env'), src.lastIndexOf('export {'));
    ok(!routing.includes('computeCheckinTrend'), 'no HTTP route calls computeCheckinTrend (sender-only)');
    const submitFn = src.slice(src.indexOf('async function handleDripSurveySubmit'), src.indexOf('async function handleUnsubscribe'));
    ok(!submitFn.includes('computeCheckinTrend'), 'the token-reachable POST does not return a trend');
  }
} finally {
  for (const id of madeSubs) {
    await rest(`/drip_survey_responses?subscriber_id=eq.${id}`, { method: 'DELETE' });
    await rest(`/drip_subscribers?id=eq.${id}`, { method: 'DELETE' });
  }
  for (const id of madeQs) {
    await rest(`/drip_survey_responses?question_id=eq.${id}`, { method: 'DELETE' });
    await rest(`/drip_survey_options?question_id=eq.${id}`, { method: 'DELETE' });
    await rest(`/drip_survey_questions?id=eq.${id}`, { method: 'DELETE' });
  }
}

// 13-adjacent: the historical anonymous corpus is exactly as it was.
{
  const after = (await (await rest('/drip_survey_responses?select=id')).json()).length;
  const anon = (await (await rest('/drip_survey_responses?subscriber_id=is.null&select=id')).json()).length;
  const leftSubs = (await (await rest('/drip_subscribers?source=eq.trend-test&select=id')).json()).length;
  const leftQs = (await (await rest('/drip_survey_questions?version=eq.2&select=id')).json()).length;
  ok(after === RESP_BEFORE, `response table back to ${RESP_BEFORE}`, String(after));
  ok(anon === ANON_BEFORE, `all ${ANON_BEFORE} anonymous rows untouched`, String(anon));
  ok(leftSubs === 0 && leftQs === 0, 'fixtures cleaned up', `${leftSubs} subs / ${leftQs} questions`);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
