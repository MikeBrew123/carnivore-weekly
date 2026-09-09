#!/usr/bin/env node
/**
 * tests/report-copy-gate-retry.test.mjs
 *
 * Run it:
 *     node tests/report-copy-gate-retry.test.mjs
 *
 * No network, no database, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * Reports #1 and #6 are written by the model at request time, so every gate that
 * holds them to the product's content rules can fail on a sampling, not on a bug.
 * That is what the bounded retry in generateCheckedSection() is for: reject the
 * attempt, quote the violation back, ask again.
 *
 * The retry checked TWO of the four gates. The other two, the condition-claim frame
 * and the unfounded-clearance check, ran only at final assembly, where no retry
 * exists. So a model-written section that tripped either of them did not get re-asked
 * — it killed the whole generation for a customer who had already paid.
 *
 * Reproduced on 2026-09-09, declared kidney disease, 1 hard failure in 4 runs:
 * Report #1 wrote "What protein amount is appropriate for your current kidney
 * function", which is a question for the reader's clinician and exactly the routing
 * the product wants, and the clearance regex matched it. One re-ask away.
 *
 * The second half of the same defect: the failure came back to the browser as
 * String(err), so the customer's error banner carried the assertion text, the
 * rejected copy and the instruction we send the model.
 *
 * WHAT THIS SUITE PINS
 * --------------------
 *   A  a claim-frame violation on the first attempt is retried, not fatal
 *   B  a clearance violation on the first attempt is retried, not fatal
 *   C  a model that will not comply still fails closed
 *   D  the finished report is STILL validated section by section, template
 *      sections included, by the same four gates
 *   E  a generation failure reaches the customer as a generic sentence, and the
 *      detail is still logged server side
 *
 * NOTE ON METHOD. Every group asserts on behaviour: real calls into the worker's own
 * functions with the model stubbed, never a regex over the source hoping it means
 * something. The one source assertion in GROUP D is scoped to the function it is
 * about, because an unscoped match has silently passed through the wrong mechanism
 * nine times in this repository.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const API = path.join(ROOT, 'api', 'calculator-api.js');

const worker = await import('file://' + API);
const {
  __test_generateAIReports: generateAIReports,
  __test_generateAllReports: generateAllReports,
  __test_assertReportCopyIsClean: assertReportCopyIsClean,
  __test_calculateMacros: calculateMacros,
  __test_REPORT_GENERATION_FAILED_MESSAGE: GENERIC_MESSAGE,
} = worker;
const { deriveMedicalContext } = await import('file://' + path.join(ROOT, 'api', 'medical-context.js'));

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

// ===========================================================================
// COPY FIXTURES
// Each violating string trips exactly one gate, and GROUP D proves which. The
// compliant string has to pass all four, or the retry groups would prove nothing.
// ===========================================================================
const VIOLATION = {
  claimFrame: 'This carnivore protocol addresses your diabetes directly.',
  clearance: 'Your targets above are appropriate to follow.',
  outcome: 'By week three your energy returns and mental clarity improves.',
  advocacy: 'Ask for a carnivore-friendly doctor who will support you.',
};
const COMPLIANT =
  'Your daily numbers are listed below. People report a wide range of first-week ' +
  'experiences, and yours may differ. Take these figures to your doctor before you start.';

/** A reader who declared context, so the claim-frame gate has terms to match. */
const DECLARED_FORM = {
  sex: 'female', age: 54, heightFeet: 5, heightInches: 5, weight: 186, goalWeight: 150,
  goal: 'lose', deficit: 20, diet: 'Carnivore', selectedProtocol: 'Carnivore',
  firstName: 'Gate', lastName: 'Fixture', budget: 'moderate',
  lifestyle: 'sedentary', exercise: '1-2', carnivoreExperience: 'beginner',
  goals: ['weight-loss'], medications: '', otherConditions: '',
  conditions: ['diabetes'], healthConditions: ['diabetes'], symptoms: ['fatigue'],
};

/**
 * Stub the model with a scripted queue: one entry per attempt, in order.
 * Records every request body so a retry can be told apart from a first ask.
 */
function stubModel(queue) {
  const sent = [];
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.anthropic.com')) {
      sent.push(JSON.parse(opts.body || '{}'));
      const text = queue.length ? queue.shift() : COMPLIANT;
      return { ok: true, status: 200, json: async () => ({ content: [{ text }] }) };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  return sent;
}

/** Captures console output so "logged server side" can be asserted, not assumed. */
function captureConsole() {
  const lines = [];
  const real = {};
  for (const k of ['log', 'info', 'warn', 'debug', 'error']) {
    real[k] = console[k];
    console[k] = (...a) => lines.push(a.map(x => (x && x.stack) ? x.stack : String(x)).join(' '));
  }
  return { lines, restore: () => Object.assign(console, real) };
}

const realFetch = globalThis.fetch;

// ===========================================================================
// GROUP A — a condition-claim-frame violation is RETRIED, not fatal.
// ===========================================================================
{
  const sent = stubModel([VIOLATION.claimFrame, COMPLIANT, COMPLIANT]);
  const cap = captureConsole();
  let result = null, threw = null;
  try { result = await generateAIReports({ ...DECLARED_FORM }, 'test-key'); }
  catch (err) { threw = err; }
  cap.restore();

  check('A', 'generation survives a first attempt that trips the claim-frame gate',
    threw === null, threw ? threw.message.slice(0, 200) : '');
  check('A', 'attempt 1 was rejected BY THE CLAIM-FRAME GATE, not by something else',
    cap.lines.some(l => /attempt 1 rejected/.test(l) && /treatment-claim frame/.test(l)),
    cap.lines.filter(l => /rejected/.test(l)).join(' | ').slice(0, 300));
  check('A', 'the model was asked again',
    sent.length >= 2, `only ${sent.length} request(s) were made`);
  check('A', 'the re-ask quoted the violation back to the model',
    sent.length >= 2 && /YOUR PREVIOUS ATTEMPT WAS REJECTED/.test(sent[1].messages[0].content),
    'the second request was not a correction');
  check('A', 'the compliant attempt is what the report keeps',
    result !== null && result.summary === COMPLIANT,
    result ? JSON.stringify(result.summary).slice(0, 160) : 'no result');
  check('A', 'the rejected copy is nowhere in the accepted section',
    result !== null && !result.summary.includes(VIOLATION.claimFrame), '');
}

// ===========================================================================
// GROUP B — an unfounded-clearance violation is RETRIED, on Report #6 this time,
// so the fix cannot be keyed to the first section only.
// ===========================================================================
{
  const sent = stubModel([COMPLIANT, VIOLATION.clearance, COMPLIANT]);
  const cap = captureConsole();
  let result = null, threw = null;
  try { result = await generateAIReports({ ...DECLARED_FORM }, 'test-key'); }
  catch (err) { threw = err; }
  cap.restore();

  check('B', 'generation survives a first attempt that trips the clearance gate',
    threw === null, threw ? threw.message.slice(0, 200) : '');
  check('B', 'the rejection names Report #6 and the clearance gate',
    cap.lines.some(l => /Report #6 attempt 1 rejected/.test(l) &&
                        /numbers are appropriate or safe for them/.test(l)),
    cap.lines.filter(l => /rejected/.test(l)).join(' | ').slice(0, 300));
  check('B', 'three model calls: Report #1 once, Report #6 twice',
    sent.length === 3, `${sent.length} request(s)`);
  check('B', 'the accepted Report #6 is the compliant attempt',
    result !== null && result.obstacle.includes(COMPLIANT) &&
    !result.obstacle.includes(VIOLATION.clearance), '');
}

// ===========================================================================
// GROUP C — still fails closed. A model that will not comply ships nothing.
// ===========================================================================
for (const [name, bad] of Object.entries(VIOLATION)) {
  const sent = stubModel([bad, bad, bad, bad, bad, bad]);
  const cap = captureConsole();
  let result = null, threw = null;
  try { result = await generateAIReports({ ...DECLARED_FORM }, 'test-key'); }
  catch (err) { threw = err; }
  cap.restore();

  check('C', `${name}: generation is refused when every attempt violates`,
    threw !== null && result === null, 'a violating section was accepted');
  check('C', `${name}: the refusal says the model would not comply`,
    threw !== null && /would not produce acceptable copy after 3 attempts/.test(threw.message),
    threw ? threw.message.slice(0, 160) : '');
  check('C', `${name}: the retry is BOUNDED at 3 attempts, not unbounded`,
    sent.length === 3, `${sent.length} request(s) were made`);
}

// ===========================================================================
// GROUP D — the finished report is STILL validated, section by section.
//
// D is the group that would catch "the retry now covers everything, so the final
// check is redundant". It is not redundant: sections 2 to 13 are templates and
// never pass through the retry at all.
// ===========================================================================
{
  // D1. One runner, and all four gates are in it. Behavioural, one call per gate.
  const ctx = deriveMedicalContext(DECLARED_FORM);
  const expected = {
    claimFrame: /treatment-claim frame/,
    clearance: /numbers are appropriate or safe for them/,
    outcome: /promises an outcome the report cannot know/,
    advocacy: /advocacy rather than patient education/,
  };
  for (const [name, bad] of Object.entries(VIOLATION)) {
    let msg = null;
    try { assertReportCopyIsClean('Report #1', bad, ctx); } catch (e) { msg = e.message; }
    check('D', `the shared gate runner enforces the ${name} gate`,
      msg !== null && expected[name].test(msg), msg ? msg.slice(0, 160) : 'nothing was thrown');
  }
  let cleanThrew = null;
  try { assertReportCopyIsClean('Report #1', COMPLIANT, ctx); } catch (e) { cleanThrew = e; }
  check('D', 'the shared gate runner accepts compliant copy',
    cleanThrew === null, cleanThrew ? cleanThrew.message.slice(0, 160) : '');

  // Without a context the claim-frame gate has no terms and passes everything, so a
  // caller that omits it would run three gates of four and no one would know. The
  // runner refuses instead.
  let noCtxThrew = null;
  try { assertReportCopyIsClean('Report #1', VIOLATION.claimFrame); } catch (e) { noCtxThrew = e; }
  check('D', 'the runner refuses to run without a medical context',
    noCtxThrew !== null && /no medical context/.test(noCtxThrew.message),
    noCtxThrew ? noCtxThrew.message.slice(0, 160) : 'a section was gated with no context and accepted');

  // D2. BEHAVIOURAL: a TEMPLATE section still fails the finished-report check.
  // The reader's own free text is echoed into the physician handout (Report #5),
  // so a phrase the advocacy gate bans reaches a section the retry never sees.
  // With the model stubbed compliant, only the final read-back can catch this.
  stubModel([COMPLIANT, COMPLIANT]);
  const echoed = {
    ...DECLARED_FORM,
    conditions: [], healthConditions: [], symptoms: [],
    otherConditions: 'large, fluffy LDL', currentSymptoms: 'large, fluffy LDL',
  };
  const cap = captureConsole();
  echoed.macros = calculateMacros(echoed);
  let templateThrow = null;
  try { await generateAllReports(echoed, 'test-key'); } catch (e) { templateThrow = e; }
  cap.restore();
  check('D', 'a template section is still gated on the finished report',
    templateThrow !== null, 'the assembled report was accepted with banned copy in a template section');
  check('D', 'the failure names a TEMPLATE section, not a model-written one',
    templateThrow !== null && /Report #(?!1:|6:)\d+:/.test(templateThrow.message),
    templateThrow ? templateThrow.message.slice(0, 160) : '');
  check('D', 'and it names the gate that caught it',
    templateThrow !== null && /advocacy rather than patient education/.test(templateThrow.message),
    templateThrow ? templateThrow.message.slice(0, 160) : '');

  // D3. Scoped source pin: the final loop covers EVERY assembled section. Scoped to
  // generateAllReports' own body, because the same call appears in the retry path and
  // an unscoped match would be satisfied by it.
  const src = fs.readFileSync(API, 'utf8');
  const start = src.indexOf('async function generateAllReports(data, apiKey) {');
  const end = src.indexOf('async function generateCheckedSection(', start);
  const body = start >= 0 && end > start ? src.slice(start, end) : '';
  check('D', 'generateAllReports validates every entry of the assembled report',
    /for \(const \[num, body\] of Object\.entries\(reports\)\)\s*\{\s*assertReportCopyIsClean\(/.test(body),
    'the finished-report loop no longer runs the gate runner over Object.entries(reports)');
}

// ===========================================================================
// GROUP E — what the customer is told when generation fails.
// Drives the real HTTP handler, because the leak was in the handler's catch.
// ===========================================================================
{
  const handler = worker.default;
  check('E', 'the worker exposes a fetch handler', typeof handler?.fetch === 'function', '');

  const ENV = {
    SUPABASE_URL: 'https://supabase.test',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
    ANTHROPIC_API_KEY: 'sk-fixture',
    FRONTEND_URL: 'https://carnivoreweekly.test',
  };
  const SESSION = {
    id: '00000000-0000-4000-8000-00000000cafe',
    email: 'gate-fixture@example.invalid',
    diet_type: 'Carnivore',
    form_data: { ...DECLARED_FORM },
  };

  // Every attempt violates, so generation fails the way it failed in production.
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    if (u.includes('api.anthropic.com')) {
      return { ok: true, status: 200, json: async () => ({ content: [{ text: VIOLATION.clearance }] }) };
    }
    if (u.includes('/rest/v1/cw_assessment_sessions')) {
      return { ok: true, status: 200, json: async () => [SESSION], text: async () => '' };
    }
    if (u.includes('/rest/v1/calculator_reports')) {
      return { ok: true, status: 200, json: async () => [], text: async () => '' };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };

  const cap = captureConsole();
  const res = await handler.fetch(new Request('https://api.test/api/v1/calculator/report/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: SESSION.id }),
  }), ENV, { waitUntil() {} });
  const raw = await res.text();
  cap.restore();

  check('E', 'a failed generation is an error status, not a half-built report',
    res.status === 500, `HTTP ${res.status}`);
  check('E', 'the customer gets the generic message',
    JSON.parse(raw).message === GENERIC_MESSAGE, JSON.parse(raw).message?.slice(0, 160) || '');

  // The leak, named piece by piece. Each pattern is something that actually appears
  // in the underlying error for this exact failure.
  const MUST_NOT_LEAK = [
    [/appropriate to follow/i, 'the rejected report copy itself'],
    [/YOUR PREVIOUS ATTEMPT WAS REJECTED/i, 'the correction we send the model'],
    [/would not produce acceptable copy/i, 'the internal retry-exhausted wording'],
    [/assertNo|assertReportCopyIsClean|generateCheckedSection|generateAllReports/, 'internal gate and function names'],
    [/Report #\d/, 'internal section labelling'],
    [/\bat .*calculator-api\.js|\.mjs:\d+|\bError:/, 'stack or error-object detail'],
    [/regex|pattern|gate\b/i, 'the language of the checks'],
  ];
  for (const [re, what] of MUST_NOT_LEAK) {
    check('E', `the customer response carries no ${what}`, !re.test(raw), raw.slice(0, 200));
  }
  check('E', 'the generic message promises no email, since nothing here sends one',
    !/email/i.test(GENERIC_MESSAGE), GENERIC_MESSAGE);

  // ...and the detail is still available to whoever has to diagnose it.
  const logged = cap.lines.join('\n');
  check('E', 'the underlying failure IS logged server side',
    /\[handleReportInit\] generation failed:/.test(logged), '');
  check('E', 'the server-side log keeps the detail the customer no longer sees',
    /would not produce acceptable copy/.test(logged) || /appropriate to follow/.test(logged),
    logged.split('\n').filter(l => /generation failed/.test(l)).join(' | ').slice(0, 300));
}

globalThis.fetch = realFetch;

// ===========================================================================
console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  [${f.group}] ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
  console.log(`\nreport-copy-gate-retry: ${passed} passed, ${failures.length} FAILED`);
  process.exit(1);
}
console.log(`report-copy-gate-retry: ${passed} passed, 0 failed  (groups A B C D E)`);
console.log('');
console.log('The four content gates are one list, applied to a model-written section');
console.log('where a retry still exists, and again to every finished section. A failure');
console.log('the customer cannot act on reaches them as one sentence.');
