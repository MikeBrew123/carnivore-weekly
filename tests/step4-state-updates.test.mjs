#!/usr/bin/env node
/**
 * tests/step4-state-updates.test.mjs
 *
 * STATE-UPDATE REGRESSION FOR THE STEP 4 HEALTH PROFILE.
 *
 * Run it:
 *     node tests/step4-state-updates.test.mjs
 *
 * Needs calculator2-demo/node_modules (react + esbuild). Skips with a clear
 * message if they are absent, so a bare clone does not fail confusingly.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * Step 4 used to push state as a whole snapshot:
 *
 *     onDataChange({ ...data, [field]: value })
 *
 * `data` is the props object from the CURRENT RENDER, and the parent merges
 * whatever it receives into the store. So re-sending a stale snapshot writes
 * back every field as it was at that render, undoing anything changed since.
 *
 * On 2026-09-08 that shipped. The motivations handler made two calls (set
 * `goals`, then clear `primaryGoalConfirmed`); the second re-sent the snapshot
 * from before the first, so ticking "Weight loss / fat loss" set the value and
 * instantly reverted it. The checkbox appeared inert, no contradiction was ever
 * created, and the goal resolver could not appear. Found by driving the live
 * page, not by any test.
 *
 * The fix sends a PATCH instead of a snapshot, so nothing unmentioned is written
 * back and an update cannot undo one it does not know about.
 *
 * HOW THIS TESTS IT
 * -----------------
 * Step4HealthProfile is a pure function of its props (no hooks), so the real
 * component is transpiled and called directly, and its real handlers are pulled
 * out of the returned element tree and invoked. The parent is modelled exactly as
 * CalculatorApp behaves: onDataChange -> store merge. No DOM, no test runner.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APP = path.join(ROOT, 'calculator2-demo');
const ESBUILD = path.join(APP, 'node_modules', '.bin', 'esbuild');
const SRC = path.join(APP, 'src', 'components', 'calculator', 'steps', 'Step4HealthProfile.tsx');

if (!fs.existsSync(path.join(APP, 'node_modules', 'esbuild'))) {
  console.log('\nstep4-state-updates: SKIPPED — calculator2-demo/node_modules missing.');
  console.log('Run `npm ci` in calculator2-demo to enable this suite.\n');
  process.exit(0);
}

const require_ = createRequire(import.meta.url);
let React;
try { React = require_(path.join(APP, 'node_modules', 'react')); }
catch { console.log('\nstep4-state-updates: SKIPPED — react not installed in calculator2-demo.\n'); process.exit(0); }

// Emitted inside calculator2-demo so the externalised `react/jsx-runtime` resolves
// against that package's node_modules. Removed at the end of the run.
// CommonJS on purpose: a transitive dependency (use-sync-external-store, via
// zustand) calls require('react') at load time, which an ESM bundle cannot do.
// Emitted inside calculator2-demo so react resolves. Removed at the end.
const OUT = path.join(APP, `.step4-state-test-${process.pid}.cjs`);
// Step 4 pulls `resetForm` off the zustand store, which is a hook and would need a
// React renderer. Nothing in this suite exercises Start Over, so the store module is
// swapped for a stub via an esbuild resolve plugin, and the component can be invoked
// as the plain function it otherwise is. Everything under test (the real handlers and
// the real patch helper) is untouched.
const esbuild = require_(path.join(APP, 'node_modules', 'esbuild'));
await esbuild.build({
  entryPoints: [SRC],
  bundle: true, format: 'cjs', platform: 'node',
  external: ['react', 'react-dom'],
  jsx: 'automatic', jsxImportSource: 'react',
  outfile: OUT, logLevel: 'error',
  plugins: [{
    name: 'stub-form-store',
    setup(build) {
      build.onResolve({ filter: /stores\/formStore$/ }, () => ({ path: 'form-store-stub', namespace: 'stub' }));
      build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
        contents: 'export const useFormStore = () => ({ resetForm: () => {} })',
        loader: 'js',
      }));
    },
  }],
});
const mod = require_(OUT);
const Step4 = mod.default || mod;

const failures = [];
let passed = 0;
const check = (label, ok, detail = '') => ok ? passed++ : failures.push({ label, detail });

// ---------------------------------------------------------------------------
// The parent, modelled exactly as CalculatorApp wires it:
//   onDataChange={(data) => setFormData(data)}   ->   form: {...state.form, ...update}
// `data` handed to the component is the store's form at RENDER time. Handlers
// captured from one render therefore close over that snapshot, which is the
// whole point of this suite.
// ---------------------------------------------------------------------------
function mountStep4(initialForm = {}) {
  const store = { form: { ...initialForm } };
  const clearedErrors = [];
  let snapshot = { ...store.form };

  const render = () => {
    snapshot = { ...store.form };          // a fresh render sees fresh data
    return Step4({
      data: snapshot,
      onDataChange: (update) => { store.form = { ...store.form, ...update }; },
      onFieldChange: (field) => clearedErrors.push(field),
      onSetErrors: () => {},
      errors: {},
      onSubmit: () => {},
      onBack: () => {},
      isSubmitting: false,
      email: '', onEmailChange: () => {},
    });
  };

  /** Depth-first walk of a React element tree. */
  const walk = (node, visit) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(n => walk(n, visit));
    visit(node);
    const kids = node.props && node.props.children;
    if (kids) walk(kids, visit);
  };

  const findProps = (tree, predicate) => {
    let found = null;
    walk(tree, n => { if (!found && n.props && predicate(n)) found = n.props; });
    return found;
  };

  return {
    store, clearedErrors,
    /** Handlers as they exist in the CURRENT render (a stale set after a change). */
    handlers() {
      const tree = render();
      const goals = findProps(tree, n => n.props.name === 'goals');
      const resolver = findProps(tree, n => typeof n.props.onResolve === 'function');
      const conditions = findProps(tree, n => n.props.name === 'conditions');
      return { goals, resolver, conditions };
    },
  };
}

const BASE = { goal: 'gain', goals: [], conditions: [], medications: '' };

// ---------------------------------------------------------------------------
// 1. Two fields updated in one user action both persist.
// ---------------------------------------------------------------------------
{
  const m = mountStep4(BASE);
  const h = m.handlers();
  check('the goals checklist handler is reachable', !!h.goals?.onChange, 'no CheckboxGroup named "goals"');
  h.goals.onChange(['weightloss']);
  check('one action writing two fields: goals persisted',
    JSON.stringify(m.store.form.goals) === JSON.stringify(['weightloss']),
    `goals = ${JSON.stringify(m.store.form.goals)}`);
  check('one action writing two fields: primaryGoalConfirmed cleared in the same write',
    m.store.form.primaryGoalConfirmed === undefined,
    `primaryGoalConfirmed = ${JSON.stringify(m.store.form.primaryGoalConfirmed)}`);
}

// ---------------------------------------------------------------------------
// 2. The exact shipped defect: two updates made against ONE render's snapshot.
//    Both must survive. Under the old snapshot-spread helper the second call
//    reverted the first, which is what made the checkbox appear inert.
// ---------------------------------------------------------------------------
{
  const m = mountStep4({ ...BASE, goals: [], primaryGoalConfirmed: true });
  const stale = m.handlers();               // captured ONCE, then not re-rendered

  stale.goals.onChange(['weightloss']);     // first update
  stale.conditions.onChange(['none']);      // second update, same stale snapshot

  check('two sequential updates from one render: the first is not reverted',
    JSON.stringify(m.store.form.goals) === JSON.stringify(['weightloss']),
    `goals = ${JSON.stringify(m.store.form.goals)} — a later update wrote back a stale snapshot`);
  check('two sequential updates from one render: the second also applied',
    JSON.stringify(m.store.form.conditions) === JSON.stringify(['none']),
    `conditions = ${JSON.stringify(m.store.form.conditions)}`);
}

// ---------------------------------------------------------------------------
// 3. Checkbox and resolution cannot overwrite each other, in either order.
// ---------------------------------------------------------------------------
{
  const m = mountStep4(BASE);
  m.handlers().goals.onChange(['weightloss']);          // creates the contradiction
  const afterTick = m.handlers();
  check('the resolver appears once the answers contradict', !!afterTick.resolver?.onResolve,
    'GoalConflictResolver did not render for gain + weightloss');
  afterTick.resolver.onResolve('gain');                 // customer answers
  check('resolving keeps the motivations the customer ticked',
    JSON.stringify(m.store.form.goals) === JSON.stringify(['weightloss']),
    `goals = ${JSON.stringify(m.store.form.goals)}`);
  check('resolving records the explicit choice',
    m.store.form.primaryGoalConfirmed === true && m.store.form.goal === 'gain',
    `goal=${m.store.form.goal} confirmed=${m.store.form.primaryGoalConfirmed}`);
  check('resolving records an audit timestamp',
    typeof m.store.form.primaryGoalConfirmedAt === 'string', '');

  // Now the reverse order: a resolution followed by a motivations edit from the
  // SAME render must not resurrect the answer, nor lose the edit.
  const stale = m.handlers();
  stale.goals.onChange(['weightloss', 'energy']);
  check('editing motivations clears the previous resolution',
    m.store.form.primaryGoalConfirmed === undefined,
    'a stale answer survived an edit that may have changed the contradiction');
  check('editing motivations keeps the edit itself',
    JSON.stringify(m.store.form.goals) === JSON.stringify(['weightloss', 'energy']),
    `goals = ${JSON.stringify(m.store.form.goals)}`);
  check('editing motivations does not disturb the authoritative goal',
    m.store.form.goal === 'gain', `goal = ${m.store.form.goal}`);
}

// ---------------------------------------------------------------------------
// 4. Single-field handlers still work, and still clear their field error.
// ---------------------------------------------------------------------------
{
  const m = mountStep4(BASE);
  m.handlers().conditions.onChange(['diabetes']);
  check('a single-field change still persists',
    JSON.stringify(m.store.form.conditions) === JSON.stringify(['diabetes']),
    `conditions = ${JSON.stringify(m.store.form.conditions)}`);
  check('a single-field change still clears that field error',
    m.clearedErrors.includes('conditions'), `cleared: ${m.clearedErrors.join(', ')}`);

  const m2 = mountStep4(BASE);
  m2.handlers().goals.onChange(['energy']);
  check('a multi-field patch clears the error for the answered field',
    m2.clearedErrors.includes('goals'), `cleared: ${m2.clearedErrors.join(', ')}`);
  check('a multi-field patch does NOT treat an undefined value as answered',
    !m2.clearedErrors.includes('primaryGoalConfirmed'),
    'clearing the resolution counted as answering it');
}

// ---------------------------------------------------------------------------
// 5. Persistence shape is unchanged: the store only ever gains the fields the
//    patch names, so what survives a refresh is what it was before.
// ---------------------------------------------------------------------------
{
  const m = mountStep4({ ...BASE, weight: 186, email: 'x@example.com' });
  const before = Object.keys(m.store.form).sort().join(',');
  m.handlers().goals.onChange(['weightloss']);
  const after = Object.keys(m.store.form).sort().join(',');
  check('an update introduces no fields beyond the patch',
    after === [...new Set([...before.split(','), 'primaryGoalConfirmed'])].sort().join(','),
    `before: ${before}\n        after:  ${after}`);
  check('unrelated persisted fields are untouched',
    m.store.form.weight === 186 && m.store.form.email === 'x@example.com',
    `weight=${m.store.form.weight} email=${m.store.form.email}`);

  // A rehydrated snapshot (what a refresh produces) behaves identically.
  const rehydrated = mountStep4(JSON.parse(JSON.stringify(m.store.form)));
  rehydrated.handlers().goals.onChange(['weightloss', 'mental']);
  check('a rehydrated form updates the same way',
    JSON.stringify(rehydrated.store.form.goals) === JSON.stringify(['weightloss', 'mental']) &&
    rehydrated.store.form.weight === 186, '');
}

// ---------------------------------------------------------------------------
// 6. Source invariant: no update site may re-send a whole snapshot.
// ---------------------------------------------------------------------------
{
  // Comments are stripped first: the patch helper's own doc comment quotes the old
  // broken call verbatim, and matching that would fail the check it is explaining.
  const src = fs.readFileSync(SRC, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  const spreads = (src.match(/onDataChange\(\s*\{\s*\.\.\.data/g) || []).length;
  check('no handler re-sends a stale snapshot', spreads === 0,
    `${spreads} call site(s) still send { ...data, ... }`);
  const direct = (src.match(/onDataChange\(/g) || []).length;
  check('onDataChange is called from exactly one place (the patch helper)',
    direct === 1, `${direct} direct onDataChange call sites`);
}

// Always clean up, including on the failure path below.
const cleanup = () => { try { fs.unlinkSync(OUT); } catch {} };
cleanup();
process.on('exit', cleanup);

console.log(`\nstep4-state-updates: ${passed} passed, ${failures.length} failed\n`);
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  ${f.label}\n        ${f.detail}`);
  console.log('\nStep 4 pushes state as a patch, never as a snapshot. See the header.\n');
  process.exit(1);
}
console.log('Step 4 updates apply as patches, so no update can revert one it does not know about.\n');
