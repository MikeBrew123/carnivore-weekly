// Free calculator step-2 save records the optional goal weight (2026-09-16).
//
// The field was asked from 2026-09-06 and used for the on-screen protein target, but
// the step-2 save never sent it and calculator_sessions_v2 had no column, so every
// answer was thrown away. A goal weight that contradicts the chosen goal is the
// clearest sign of a mis-picked goal (bead carnivore-weekly-4sk8), so it must persist.
//
// Run: node tests/calculator-goal-weight-save.test.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
let failed = 0, passed = 0;
function check(name, ok, detail = '') {
  if (ok) { passed++; console.log(`  ok   ${name}`); }
  else { failed++; console.log(`  FAIL ${name} ${detail}`); }
}

// --- Client: the step-2 payload carries it -----------------------------------
const app = fs.readFileSync(path.join(ROOT, 'calculator2-demo/src/components/calculator/CalculatorApp.tsx'), 'utf8');
const step2 = app.slice(app.indexOf('/api/v1/calculator/step/2'), app.indexOf('/api/v1/calculator/step/2') + 900);
check('client step-2 payload sends goal_weight_lb', /goal_weight_lb:/.test(step2));
check('client reads it from formData.goalWeight', /formData\.goalWeight/.test(step2));

// --- Worker: what reaches the database ----------------------------------------
const worker = (await import('file://' + path.join(ROOT, 'api', 'calculator-api.js'))).default;
const ENV = { SUPABASE_URL: 'https://supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const realFetch = globalThis.fetch;
const quiet = ['log', 'info', 'warn', 'debug', 'error'].map(k => [k, console[k]]);

async function save(goalWeight, token) {
  let patch = null;
  globalThis.fetch = async (url, opts = {}) => {
    if (String(url).includes('/rest/v1/calculator_sessions_v2') && opts.method === 'PATCH') {
      patch = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => [{ email: null }] };
    }
    return { ok: true, status: 200, json: async () => ({}), text: async () => '' };
  };
  const data = { lifestyle_activity: 'light', exercise_frequency: '1-2', goal: 'gain',
                 deficit_percentage: 10, diet_type: 'carnivore' };
  if (goalWeight !== undefined) data.goal_weight_lb = goalWeight;
  for (const [k] of quiet) console[k] = () => {};
  try {
    const res = await worker.fetch(new Request('https://api.test/api/v1/calculator/step/2', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_token: token, data }),
    }), ENV, { waitUntil() {} });
    return { status: res.status, patch };
  } finally {
    for (const [k, fn] of quiet) console[k] = fn;
    globalThis.fetch = realFetch;
  }
}

let i = 0;
const tok = () => `goal-weight-fixture-${i++}`;
let r = await save(180, tok());
check('a valid goal weight is written', r.status === 200 && r.patch?.goal_weight_lb === 180, JSON.stringify(r));
r = await save('172.46', tok());
check('a numeric string is stored to one decimal', r.patch?.goal_weight_lb === 172.5, JSON.stringify(r.patch));
r = await save(undefined, tok());
check('no goal weight stores null and the save still succeeds',
  r.status === 200 && r.patch && r.patch.goal_weight_lb === null && r.patch.goal === 'gain', JSON.stringify(r));
for (const bad of [0, 12, 5000, 'abc', null]) {
  r = await save(bad, tok());
  check(`unusable value ${JSON.stringify(bad)} stores null without failing the save`,
    r.status === 200 && r.patch?.goal_weight_lb === null && r.patch?.step_completed === 3, JSON.stringify(r));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
