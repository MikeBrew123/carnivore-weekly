#!/usr/bin/env node
/**
 * tests/goal-conflict-flow.test.mjs
 *
 * THE PURCHASE-FLOW GATE FOR CONTRADICTORY GOALS.
 *
 * Run it:
 *     node tests/goal-conflict-flow.test.mjs
 *
 * No dependencies, no network, no database. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * The questionnaire asks two different questions that can disagree:
 *
 *   goal    a single radio in Step 2: Fat Loss / Maintenance / Muscle Gain.
 *           This is the field the calorie maths consumes.
 *   goals   a checklist in Step 4: "What are you hoping to achieve?", which
 *           includes "Weight loss / fat loss".
 *
 * A customer picked Muscle Gain and also ticked Weight loss. Her calorie target
 * was a surplus; the written sections of her report described it as fat loss.
 *
 * The worker learned to refuse. But it refused at REPORT GENERATION, which in
 * this product happens after the customer has paid. Being told "we can't build
 * your report" by something you have already bought is not an acceptable flow.
 *
 * WHAT THIS SUITE PINS
 * --------------------
 *   1. One definition of a conflict, shared by the browser and the worker
 *      (api/goal-semantics.js). Not two implementations that agree today.
 *   2. Resolution requires an explicit customer choice. Not a default, not the
 *      first field, not the most recent one, not a truthy value, and not the
 *      act of pressing Continue.
 *   3. The guard survives a refresh, a resumed session, and a crafted request.
 *
 * A NOTE ON WHERE "BEFORE PAYMENT" ACTUALLY IS
 * --------------------------------------------
 * In the shipped step order, payment happens at the end of Step 3 and the
 * motivations checklist is Step 4. So for a first-time buyer the contradiction
 * is not knowable until after the charge: there is no earlier point at which
 * both halves exist. What IS enforced before payment is every case where the
 * answers are already known, which is a resumed session (the form is persisted
 * to localStorage and posted to /create-checkout), a returning customer, and a
 * crafted request. That is what GROUP C covers. Moving the checklist ahead of
 * payment is a questionnaire change and is tracked separately.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const SEMANTICS = path.join(ROOT, 'api', 'goal-semantics.js');

const {
  detectGoalConflict, resolveGoal, normalizeMotivation,
  MOTIVATIONS_CONTRADICTING, PRIMARY_GOAL_CHOICES, RESOLUTION_FLAG,
} = await import('file://' + SEMANTICS);

const failures = [];
let passed = 0;
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

/** Stands in for the browser posting form_data at /create-checkout. */
const formFor = (goal, goals, extra = {}) => ({
  sex: 'female', age: 51, heightFeet: 5, heightInches: 5, weight: 198,
  lifestyle: 'sedentary', exercise: '1-2', deficit: goal === 'maintain' ? undefined : 20,
  diet: 'Carnivore', email: 'flow-fixture@example.com', firstName: 'Flow',
  goal, goals, ...extra,
});

// ===========================================================================
// GROUP A — the conflict rule itself, over the supported matrix.
// ===========================================================================
const PRIMARIES = ['lose', 'maintain', 'gain'];
const MOTIVATIONS = ['weightloss', 'weight-loss', 'weight_loss', 'fatloss', 'loseweight',
                     'musclegain', 'muscle-gain', 'muscle_gain', 'gainmuscle', 'bulk', 'bulking',
                     'weightgain', 'mental', 'guthealth', 'inflammation', 'energy', 'athletic',
                     'hormones'];

const LOSS_FAMILY = new Set(['weightloss', 'weight-loss', 'weight_loss', 'fatloss', 'loseweight']);
const GAIN_FAMILY = new Set(['musclegain', 'muscle-gain', 'muscle_gain', 'gainmuscle', 'bulk',
                             'bulking', 'weightgain']);

/** What the rule OUGHT to say, written independently of how it is implemented. */
function expectedConflict(primary, motivation) {
  if (primary === 'gain') return LOSS_FAMILY.has(motivation);
  if (primary === 'lose') return GAIN_FAMILY.has(motivation);
  return LOSS_FAMILY.has(motivation) || GAIN_FAMILY.has(motivation); // maintain
}

for (const primary of PRIMARIES) {
  for (const motivation of MOTIVATIONS) {
    const r = detectGoalConflict(formFor(primary, [motivation]));
    check('A', `${primary} + ${motivation}`, r.conflict === expectedConflict(primary, motivation),
      `rule says conflict=${r.conflict}, expected ${expectedConflict(primary, motivation)}`);
  }
}

// Neutral motivations never create a conflict, however many are ticked.
check('A', 'a pile of neutral motivations is fine',
  detectGoalConflict(formFor('gain', ['mental', 'energy', 'athletic', 'hormones'])).conflict === false, '');
// A conflicting motivation among neutral ones is still a conflict.
check('A', 'a conflict hidden among neutral motivations is still caught',
  detectGoalConflict(formFor('gain', ['mental', 'energy', 'weightloss', 'hormones'])).conflict === true, '');
// Motivations may arrive as a comma string rather than an array.
check('A', 'motivations as a bare comma string',
  detectGoalConflict(formFor('gain', 'mental, weightloss')).conflict === true, '');
check('A', 'no motivations at all is not a conflict',
  detectGoalConflict(formFor('gain', [])).conflict === false, '');
check('A', 'missing motivations field is not a conflict',
  detectGoalConflict({ goal: 'gain' }).conflict === false, '');
// The primary goal always wins; a conflict never changes the direction.
for (const primary of PRIMARIES) {
  const r = detectGoalConflict(formFor(primary, ['weightloss', 'musclegain']));
  check('A', `${primary}: motivations never change the calorie direction`,
    r.primary === resolveGoal({ goal: primary }).key, `primary reported as ${r.primary}`);
}

// ===========================================================================
// GROUP B — resolution semantics. Only an explicit choice counts.
// ===========================================================================
const conflicted = formFor('gain', ['weightloss']);

check('B', 'unresolved conflict blocks', detectGoalConflict(conflicted).blocking === true, '');
check('B', `${RESOLUTION_FLAG} === true clears it`,
  detectGoalConflict({ ...conflicted, [RESOLUTION_FLAG]: true }).blocking === false, '');

for (const loose of ['true', 1, 'yes', 'on', [], {}, 'CONFIRMED']) {
  check('B', `loose value ${JSON.stringify(loose)} is NOT consent`,
    detectGoalConflict({ ...conflicted, [RESOLUTION_FLAG]: loose }).blocking === true,
    'a truthy value was accepted as an explicit customer decision');
}
for (const falsy of [false, 0, '', null, undefined]) {
  check('B', `falsy value ${JSON.stringify(falsy)} still blocks`,
    detectGoalConflict({ ...conflicted, [RESOLUTION_FLAG]: falsy }).blocking === true, '');
}

// Resolving does not rewrite the motivations, and does not flip the direction.
const resolvedToGain = { ...conflicted, goal: 'gain', [RESOLUTION_FLAG]: true };
check('B', 'resolving to gain keeps the calorie direction as gain',
  resolveGoal(resolvedToGain).key === 'gain', '');
check('B', 'resolving keeps the motivations the customer ticked',
  JSON.stringify(resolvedToGain.goals) === JSON.stringify(['weightloss']), '');
const resolvedToLose = { ...conflicted, goal: 'lose', [RESOLUTION_FLAG]: true };
check('B', 'resolving to lose changes the direction to lose',
  resolveGoal(resolvedToLose).key === 'lose', '');
check('B', 'resolving to lose is no longer a conflict at all',
  detectGoalConflict(resolvedToLose).conflict === false,
  'lose + weightloss is a consistent pair, so nothing should remain to resolve');

// Every choice offered to the customer is a real primary goal.
check('B', 'the offered choices are exactly the supported primary goals',
  JSON.stringify(PRIMARY_GOAL_CHOICES.map(c => c.value).sort()) === JSON.stringify([...PRIMARIES].sort()),
  JSON.stringify(PRIMARY_GOAL_CHOICES.map(c => c.value)));
for (const c of PRIMARY_GOAL_CHOICES) {
  check('B', `choice "${c.value}" has customer-facing wording`,
    typeof c.plain === 'string' && c.plain.length > 3 && !PRIMARIES.includes(c.plain),
    `plain="${c.plain}" reads like an internal enum`);
}

// ===========================================================================
// GROUP C — persistence, resume, historical records, crafted payloads.
// ===========================================================================
// A refresh replays whatever localStorage held. If the flag was never set, the
// rehydrated form must still block.
const rehydrated = JSON.parse(JSON.stringify(conflicted));
check('C', 'a refreshed/rehydrated form with no flag still blocks',
  detectGoalConflict(rehydrated).blocking === true, '');
// JSON round-tripping must not manufacture consent.
const rehydratedResolved = JSON.parse(JSON.stringify({ ...conflicted, [RESOLUTION_FLAG]: true }));
check('C', 'a refreshed form that WAS resolved stays resolved',
  detectGoalConflict(rehydratedResolved).blocking === false, '');

// A record written before this feature existed has no flag at all.
const historical = { goal: 'gain', goals: ['mental', 'weightloss', 'guthealth', 'inflammation',
                                           'energy', 'athletic', 'hormones'] };
check('C', 'a historical session predating the fix is blocked, not grandfathered',
  detectGoalConflict(historical).blocking === true,
  'an old contradictory record bypassed resolution because it predates the flag');
check('C', 'a historical session is not silently rewritten',
  historical.goal === 'gain' && !(RESOLUTION_FLAG in historical),
  'detection mutated the record it was given');

// A crafted payload cannot smuggle consent through a nested or aliased field.
for (const crafted of [
  { ...conflicted, primary_goal_confirmed: true },
  { ...conflicted, primaryGoalConfirmed: 'true' },
  { ...conflicted, resolution: 'CONFIRM_PRIMARY_GOAL' },
  { ...conflicted, meta: { primaryGoalConfirmed: true } },
]) {
  check('C', `crafted payload ${Object.keys(crafted).slice(-1)} does not resolve`,
    detectGoalConflict(crafted).blocking === true, JSON.stringify(crafted).slice(0, 120));
}

// ===========================================================================
// GROUP D — one definition, wired into every gate. Read the source, because
// "the client and server agree" is only true while they share the module.
// ===========================================================================
const worker = fs.readFileSync(path.join(ROOT, 'api', 'calculator-api.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(ROOT, 'calculator2-demo', 'src', 'components',
  'calculator', 'CalculatorApp.tsx'), 'utf8');
const resolverSrc = fs.readFileSync(path.join(ROOT, 'calculator2-demo', 'src', 'components',
  'calculator', 'GoalConflictResolver.tsx'), 'utf8');

check('D', 'the worker imports the shared semantics module',
  /from '\.\/goal-semantics\.js'/.test(worker), '');
check('D', 'the client imports the SAME module',
  /goal-semantics\.js'/.test(appSrc) && /goal-semantics\.js'/.test(resolverSrc), '');
for (const [name, src] of [['worker', worker], ['CalculatorApp', appSrc], ['resolver', resolverSrc]]) {
  check('D', `${name} does not define its own conflict rule`,
    !/MOTIVATIONS_CONTRADICTING\s*=/.test(src) && !/function detectGoalConflict/.test(src),
    'a second definition of the rule has appeared; the two can now drift');
}
{
  // Scoped to handleCreateCheckout: the file mentions both the sessions table and
  // Stripe elsewhere, and a file-wide indexOf would compare against the wrong ones.
  const start = worker.indexOf('async function handleCreateCheckout');
  const body = worker.slice(start, worker.indexOf('\nasync function', start + 10));
  const guard = body.indexOf('PAYMENT BOUNDARY');
  const insert = body.indexOf('rest/v1/cw_assessment_sessions');
  const stripe = body.indexOf('api.stripe.com');
  check('D', 'checkout guard exists inside handleCreateCheckout', guard > -1, '');
  check('D', 'checkout guard runs before the session row is written',
    guard > -1 && insert > -1 && guard < insert, `guard@${guard} insert@${insert}`);
  check('D', 'checkout guard runs before Stripe is called',
    guard > -1 && stripe > -1 && guard < stripe, `guard@${guard} stripe@${stripe}`);
}
check('D', 'the second payment route is guarded too',
  /PAYMENT BOUNDARY \(second route\)/.test(worker), '');
check('D', 'report generation keeps its own backstop',
  /assertReportInputsCoherent\(data\)/.test(worker), '');
check('D', 'the client blocks its own submit rather than trusting the button',
  /goalConflict\.blocking/.test(appSrc), '');
{
  // The 422 is defence in depth. If it ever reaches the customer, it must land them
  // back in the resolver with a question, not in an error state. A paying customer
  // seeing "Report generation failed" for what is really an unanswered question is
  // the failure mode this whole pass exists to remove.
  const step4Src = fs.readFileSync(path.join(ROOT, 'calculator2-demo', 'src', 'components',
    'calculator', 'steps', 'Step4HealthProfile.tsx'), 'utf8');
  check('D', 'a 422 GOAL_CONFLICT_UNRESOLVED is handled specifically, not as a generic error',
    /status === 422 && \w+\.code === 'GOAL_CONFLICT_UNRESOLVED'/.test(appSrc),
    'the conflict refusal falls through to the generic report-failure path');
  check('D', 'the 422 path returns instead of throwing',
    /GOAL_CONFLICT_UNRESOLVED[\s\S]{0,900}?\n\s+return\n?/.test(appSrc),
    'it still throws, so the customer sees a failure screen');
  check('D', 'the 422 path re-opens the resolver by clearing the flag',
    /GOAL_CONFLICT_UNRESOLVED[\s\S]{0,400}primaryGoalConfirmed: undefined/.test(appSrc), '');
  check('D', 'the 422 path leaves the generating animation',
    /GOAL_CONFLICT_UNRESOLVED[\s\S]{0,500}setIsGenerating\(false\)/.test(appSrc),
    'the customer is stranded on the progress animation');
  {
    // Only the 422 branch itself, up to its return. A window measured in characters
    // runs past the branch into the generic fallback below it and reports a false hit.
    const at = appSrc.indexOf("GOAL_CONFLICT_UNRESOLVED') {");
    const branch = at === -1 ? '' : appSrc.slice(at, appSrc.indexOf('\n          return', at));
    check('D', 'the customer is not shown the server-authored message',
      at > -1 && branch.length > 0 && !branch.includes('reportError.message'),
      'internal wording about calorie surpluses is being surfaced to the reader');
  }
  check('D', 'the goals error is actually rendered next to the checklist',
    /error=\{errors\.goals\}/.test(step4Src),
    'the message is set but nothing displays it');
}

{
  const st4 = fs.readFileSync(path.join(ROOT, 'calculator2-demo', 'src', 'components',
    'calculator', 'steps', 'Step4HealthProfile.tsx'), 'utf8');

  check('D', 'changing the motivations clears a stale resolution',
    /goals: values,\s*primaryGoalConfirmed: undefined/.test(st4),
    'editing the checklist keeps an answer that no longer describes the selection');

  // The clearing and the edit must land in ONE state update. handleInputChange spreads
  // the `data` of the current render, so two calls in a row make the second discard
  // the first. Shipped once: ticking a motivation set `goals` and instantly reverted
  // it, so the checklist did nothing at all and the resolver could never appear.
  // Found by driving the deployed page, not by any assertion that existed then.
  // Slice each handler by brace balance rather than by regex: JSX bodies vary in
  // indentation and a character-window match silently reports "not found" as a pass.
  const handlerBody = (marker, from = 0) => {
    const at = st4.indexOf(marker, from);
    if (at === -1) return null;
    let i = st4.indexOf('{', at + marker.length - 1), depth = 0;
    for (let j = i; j < st4.length; j++) {
      if (st4[j] === '{') depth++;
      else if (st4[j] === '}' && --depth === 0) return st4.slice(at, j + 1);
    }
    return null;
  };
  // Anchor on the goals CheckboxGroup: an earlier group (conditions) has an
  // identically shaped onChange, and matching that one would test nothing.
  const goalsAt = st4.indexOf('name="goals"');
  check('D', 'the goals checklist is present in Step 4', goalsAt > -1, '');
  for (const [what, marker] of [
    ['the motivations handler', 'onChange={(values)'],
    ['the resolver handler', 'onResolve={(primaryGoal)'],
  ]) {
    const body = handlerBody(marker, goalsAt);
    check('D', `${what} exists`, body !== null, `could not find "${marker}"`);
    if (body === null) continue;
    const calls = (body.match(/handleInputChange\(/g) || []).length;
    check('D', `${what} makes a single state update`, calls === 0,
      `it calls handleInputChange ${calls} time(s); each call spreads stale data, so ` +
      `all but the last are silently discarded. Use one onDataChange({...data, ...}).`);
  }
}

// ===========================================================================
// GROUP E — BEHAVIOURAL. Drive the real HTTP handlers and prove no charge can be
// created. GROUP D only proves a guard is written; this proves it fires. An
// earlier mutation run neutered both server guards while leaving their comments
// in place, and GROUP D alone did not notice.
// ===========================================================================
{
  const workerMod = await import('file://' + path.join(ROOT, 'api', 'calculator-api.js'));
  const handler = workerMod.default;
  check('E', 'the worker exposes a fetch handler', typeof handler?.fetch === 'function', '');

  const ENV = {
    SUPABASE_URL: 'https://supabase.test',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
    STRIPE_SECRET_KEY: 'sk_test_fixture',
    ANTHROPIC_API_KEY: 'sk-fixture',
    FRONTEND_URL: 'https://carnivoreweekly.test',
  };

  /** Records every outbound call so we can assert what did NOT happen. */
  function stubNetwork(sessionRow) {
    const calls = [];
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      calls.push({ url: u, method: opts.method || 'GET' });
      if (u.includes('/rest/v1/calculator_sessions_v2')) {
        return { ok: true, status: 200, json: async () => (sessionRow ? [sessionRow] : []) };
      }
      if (u.includes('/rest/v1/payment_tiers')) {
        return { ok: true, status: 200, json: async () => [{ id: 'bundle', price_cents: 2900, name: 'Bundle' }] };
      }
      if (u.includes('/rest/v1/cw_assessment_sessions')) {
        return { ok: true, status: 200, json: async () => [{ id: 'row-created-BAD' }] };
      }
      if (u.includes('api.stripe.com')) {
        return { ok: true, status: 200, json: async () => ({ id: 'cs_test_BAD', url: 'https://stripe.test/BAD' }) };
      }
      return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
    };
    return calls;
  }

  const post = (p, body) => new Request('https://api.test' + p, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });

  const realFetch = globalThis.fetch;
  const quiet = ['log', 'info', 'warn', 'debug', 'error'].map(k => [k, console[k]]);
  for (const [k] of quiet) console[k] = () => {};
  try {
    // --- /create-checkout with an unresolved contradiction -------------------
    let calls = stubNetwork(null);
    let res = await handler.fetch(post('/create-checkout', {
      email: 'flow-fixture@example.com', first_name: 'Flow', tier_id: 'bundle', amount: 2900,
      form_data: formFor('gain', ['weightloss', 'energy']),
    }), ENV, { waitUntil() {} });
    let body = await res.json();

    check('E', '/create-checkout refuses an unresolved contradiction (422)',
      res.status === 422, `got HTTP ${res.status}`);
    check('E', '/create-checkout returns the machine-readable code',
      body.code === 'GOAL_CONFLICT_UNRESOLVED', `code=${body.code}`);
    check('E', '/create-checkout says how to resolve it',
      body.details?.resolution === 'CONFIRM_PRIMARY_GOAL', JSON.stringify(body.details));
    check('E', '/create-checkout states that nothing was charged',
      body.details?.charged === false, JSON.stringify(body.details));
    check('E', 'NO Stripe checkout session was created',
      !calls.some(c => c.url.includes('api.stripe.com')),
      `stripe was called: ${calls.filter(c => c.url.includes('stripe')).map(c => c.url).join(', ')}`);
    check('E', 'NO assessment row was written',
      !calls.some(c => c.url.includes('cw_assessment_sessions') && c.method === 'POST'),
      'a pending purchase row was created for a request that was refused');

    // --- /create-checkout once the customer has chosen ----------------------
    calls = stubNetwork(null);
    res = await handler.fetch(post('/create-checkout', {
      email: 'flow-fixture@example.com', first_name: 'Flow', tier_id: 'bundle', amount: 2900,
      form_data: formFor('gain', ['weightloss', 'energy'], { [RESOLUTION_FLAG]: true }),
    }), ENV, { waitUntil() {} });
    check('E', '/create-checkout proceeds once the choice is explicit',
      res.status !== 422, `still refused with HTTP ${res.status}`);
    check('E', 'a resolved request does reach the purchase path',
      calls.some(c => c.url.includes('cw_assessment_sessions') || c.url.includes('api.stripe.com')),
      'nothing downstream was attempted, so this proves nothing');

    // --- a consistent pairing was never blocked -----------------------------
    calls = stubNetwork(null);
    res = await handler.fetch(post('/create-checkout', {
      email: 'flow-fixture@example.com', first_name: 'Flow', tier_id: 'bundle', amount: 2900,
      form_data: formFor('lose', ['weightloss', 'energy']),
    }), ENV, { waitUntil() {} });
    check('E', 'a consistent goal pairing is not blocked at checkout',
      res.status !== 422, `HTTP ${res.status} for lose + weightloss`);

    // --- the second payment route -------------------------------------------
    calls = stubNetwork({ session_token: 'tok', goal: 'gain', goals: ['weightloss'] });
    res = await handler.fetch(post('/api/v1/calculator/payment/initiate', {
      session_token: 'tok-' + Math.random().toString(36).slice(2), tier_id: 'bundle',
    }), ENV, { waitUntil() {} });
    body = await res.json();
    check('E', '/payment/initiate refuses an unresolved contradiction (422)',
      res.status === 422, `got HTTP ${res.status}`);
    check('E', '/payment/initiate returns the same code',
      body.code === 'GOAL_CONFLICT_UNRESOLVED', `code=${body.code}`);
    check('E', '/payment/initiate wrote no payment intent',
      !calls.some(c => c.method === 'PATCH'),
      'a payment intent was recorded for a refused request');

    // --- a historical record, exactly as it sits in the database today ------
    calls = stubNetwork(null);
    res = await handler.fetch(post('/create-checkout', {
      email: 'flow-fixture@example.com', first_name: 'Flow', tier_id: 'bundle', amount: 2900,
      form_data: { ...formFor('gain', ['mental', 'weightloss', 'guthealth', 'inflammation',
                                       'energy', 'athletic', 'hormones']) },
    }), ENV, { waitUntil() {} });
    check('E', 'a historical-shaped contradictory payload is refused at checkout',
      res.status === 422, `HTTP ${res.status}`);
    check('E', 'and it created no Stripe session',
      !calls.some(c => c.url.includes('api.stripe.com')), '');
  } finally {
    globalThis.fetch = realFetch;
    for (const [k, fn] of quiet) console[k] = fn;
  }
}

// ===========================================================================
// Report
// ===========================================================================
console.log(`\ngoal-conflict-flow: ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  FAIL [${f.group}] ${f.label}\n        ${f.detail}`);
  process.exit(1);
}
console.log('One conflict rule, shared by the browser and the worker, enforced at the');
console.log('questionnaire, at checkout, and again at report generation.\n');
