#!/usr/bin/env node
/**
 * tests/step1-unit-toggle.test.mjs
 *
 * STEP 1 UNIT CONTROL AND HEIGHT ERROR REGRESSION (mobile audit 2026-09-10).
 *
 * Run it:
 *     node tests/step1-unit-toggle.test.mjs
 *
 * Needs calculator2-demo/node_modules (react + esbuild). Skips with a clear
 * message if they are absent, so a bare clone does not fail confusingly.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On production, a reader could fill in Step 1 completely and still be unable
 * to continue, with nothing on screen saying why:
 *
 *   - tapping the already-selected "ft / in" cleared her height;
 *   - switching to "cm" (or back) cleared height AND weight;
 *   - the resulting "height" error was stored under a key no field renders;
 *   - 182 cm was stored as 5 ft 12 in, so "Inches must be between 0 and 11"
 *     was raised against an inches field metric readers cannot see.
 *
 * The grey placeholders "5" and "10" then made the empty height look filled.
 *
 * HOW THIS TESTS IT
 * -----------------
 * Part 1 calls the pure conversion module, lib/unitSystem.ts.
 * Part 2 transpiles the real Step1PhysicalStats component, calls it as a plain
 * function, and invokes its real handlers from the returned element tree. Hooks
 * need a renderer, so useState and useRef are shimmed (neither is under test).
 * The parent is modelled as CalculatorApp wires it. Focus and scrolling need a
 * real DOM: tests/step1-units-and-errors.test.mjs covers them in a browser.
 */

import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const APP = path.join(ROOT, 'calculator2-demo');
const STEP1 = path.join(APP, 'src', 'components', 'calculator', 'steps', 'Step1PhysicalStats.tsx');
const UNITS = path.join(APP, 'src', 'lib', 'unitSystem.ts');

if (!fs.existsSync(path.join(APP, 'node_modules', 'esbuild')) || !fs.existsSync(path.join(APP, 'node_modules', 'react'))) {
  console.log('\nstep1-unit-toggle: SKIPPED, calculator2-demo/node_modules missing.');
  console.log('Run `npm ci` in calculator2-demo to enable this suite.\n');
  process.exit(0);
}

const require_ = createRequire(import.meta.url);
const esbuild = require_(path.join(APP, 'node_modules', 'esbuild'));

// Emitted inside calculator2-demo so `react` resolves against that package's
// node_modules. Removed when the process exits.
const OUT_STEP1 = path.join(APP, `.step1-unit-test-${process.pid}.cjs`);
const OUT_UNITS = path.join(APP, `.step1-unit-lib-${process.pid}.cjs`);
process.on('exit', () => { for (const f of [OUT_STEP1, OUT_UNITS]) fs.rmSync(f, { force: true }); });

// `import { useRef, useState } from 'react'` inside the component resolves to a
// shim; the shim's own require('react') is left external and gets the real one.
const hookShim = {
  name: 'react-hook-shim',
  setup(build) {
    build.onResolve({ filter: /^react$/ }, (args) =>
      args.namespace === 'react-shim'
        ? { path: 'react', external: true }
        : { path: 'react', namespace: 'react-shim' });
    build.onLoad({ filter: /.*/, namespace: 'react-shim' }, () => ({
      contents: "const R = require('react'); module.exports = { ...R, "
        + "useState: (i) => [typeof i === 'function' ? i() : i, () => {}], "
        + 'useRef: (v) => ({ current: v }) };',
      loader: 'js',
    }));
  },
};

const common = {
  bundle: true, format: 'cjs', platform: 'node', logLevel: 'error',
  jsx: 'automatic', jsxImportSource: 'react',
  external: ['react/jsx-runtime', 'react-dom'],
};
await esbuild.build({ ...common, entryPoints: [UNITS], outfile: OUT_UNITS });
await esbuild.build({ ...common, entryPoints: [STEP1], outfile: OUT_STEP1, plugins: [hookShim] });

const { switchUnitSystem, unitSystemOf, cmToFeetInches, feetInchesToCm } = require_(OUT_UNITS);
const Step1 = ((m) => m.default || m)(require_(OUT_STEP1));

// The component logs every Continue; keep the suite output readable.
const say = (line = '') => process.stdout.write(`${line}\n`);
console.log = () => {};

const failures = [];
let passed = 0;
const check = (label, ok, detail = '') => (ok ? passed++ : failures.push({ label, detail }));
const show = (o, keys = ['heightFeet', 'heightInches', 'heightCm', 'weight', 'weightKg']) =>
  JSON.stringify(Object.fromEntries(keys.map((k) => [k, o[k]])));

const FILLED = {
  email: 'reader@example.com', sex: 'female', age: 58,
  heightFeet: 5, heightInches: 4, weight: 185,
  goal: 'lose', diet: 'carnivore',
};

// ===========================================================================
// PART 1: the conversion module
// ===========================================================================
{
  check('unitSystemOf: no heightCm is imperial', unitSystemOf({}) === 'imperial');
  check('unitSystemOf: heightCm 0 (metric, nothing typed yet) is metric', unitSystemOf({ heightCm: 0 }) === 'metric');

  check('switchUnitSystem: re-selecting imperial returns the same object', switchUnitSystem(FILLED, 'imperial') === FILLED);
  const metric = switchUnitSystem(FILLED, 'metric');
  check('switchUnitSystem: re-selecting metric returns the same object', switchUnitSystem(metric, 'metric') === metric);

  check('switchUnitSystem: 5 ft 4 in becomes 163 cm', metric.heightCm === 163, show(metric));
  check('switchUnitSystem: 185 lbs becomes 84 kg', metric.weightKg === 84, show(metric));

  const back = switchUnitSystem(metric, 'imperial');
  check('switchUnitSystem: round trip returns exactly 5 ft 4 in', back.heightFeet === 5 && back.heightInches === 4, show(back));
  check('switchUnitSystem: round trip returns exactly 185 lbs', back.weight === 185, show(back));
  check('switchUnitSystem: round trip is imperial again', unitSystemOf(back) === 'imperial' && back.weightKg === undefined, show(back));
  check('switchUnitSystem: non-measurement fields survive both switches',
    ['email', 'sex', 'age', 'goal', 'diet'].every((k) => metric[k] === FILLED[k] && back[k] === FILLED[k]));

  const emptyMetric = switchUnitSystem({ email: 'reader@example.com' }, 'metric');
  check('switchUnitSystem: nothing entered, metric invents no measurement',
    emptyMetric.heightCm === 0 && emptyMetric.weightKg === undefined, show(emptyMetric));
  const emptyBack = switchUnitSystem(emptyMetric, 'imperial');
  check('switchUnitSystem: nothing entered, imperial invents no measurement',
    emptyBack.heightFeet === undefined && emptyBack.heightInches === undefined && !emptyBack.weight, show(emptyBack));

  const badInches = [];
  const drift = [];
  for (let cm = 90; cm <= 250; cm++) {
    const r = cmToFeetInches(cm);
    if (r.heightInches < 0 || r.heightInches > 11) badInches.push(`${cm} cm = ${r.heightFeet} ft ${r.heightInches} in`);
    const again = feetInchesToCm(r.heightFeet, r.heightInches);
    if (Math.abs(again - cm) > 2) drift.push(`${cm} -> ${again}`);
  }
  check('cmToFeetInches: inches always 0-11 for every height from 90 to 250 cm', badInches.length === 0, badInches.slice(0, 5).join(', '));
  check('cmToFeetInches: cm -> ft/in -> cm moves at most 2 cm (display rounding only)', drift.length === 0, drift.slice(0, 5).join(', '));

  const typedInMetric = switchUnitSystem({ heightCm: 182, ...cmToFeetInches(182), weightKg: 84, weight: 185 }, 'imperial');
  check('switchUnitSystem: 182 cm typed in metric switches to 6 ft 0 in',
    typedInMetric.heightFeet === 6 && typedInMetric.heightInches === 0, show(typedInMetric));

  const retyped = switchUnitSystem({ ...metric, heightCm: 170, weightKg: 70 }, 'imperial');
  check('switchUnitSystem: a height re-typed in cm replaces the old ft/in', retyped.heightFeet === 5 && retyped.heightInches === 7, show(retyped));
  check('switchUnitSystem: a weight re-typed in kg replaces the old lbs', retyped.weight === 154, show(retyped));
}

// ===========================================================================
// PART 2: the real component and its handlers
// ===========================================================================
/** Depth-first walk of a React element tree. */
const walk = (node, visit) => {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach((n) => walk(n, visit));
  visit(node);
  const kids = node.props && node.props.children;
  if (kids) walk(kids, visit);
};

function mountStep1(initialForm = {}, initialErrors = {}) {
  const s = { form: { ...initialForm }, errors: { ...initialErrors }, writes: 0, continued: 0 };
  // Wired as CalculatorApp does: onDataChange -> store merge, onSetErrors ->
  // setErrors, onFieldChange -> drop one key from the errors of that render.
  const render = () => Step1({
    data: s.form,
    errors: s.errors,
    onDataChange: (update) => { s.writes++; s.form = { ...s.form, ...update }; },
    onSetErrors: (next) => { s.errors = next; },
    onFieldChange: (field) => { const next = { ...s.errors }; delete next[field]; s.errors = next; },
    onContinue: () => { s.continued++; },
  });
  const find = (tree, predicate) => {
    let hit = null;
    walk(tree, (n) => { if (!hit && n.props && predicate(n)) hit = n; });
    return hit;
  };
  const api = {
    s,
    render,
    button: (label) => find(render(), (n) => n.type === 'button' && n.props.children === label),
    field: (id) => find(render(), (n) => n.props.id === id && typeof n.props.label === 'string'),
    node: (id) => find(render(), (n) => n.props.id === id),
    tap(label) {
      const b = api.button(label);
      if (!b) throw new Error(`no button labelled "${label}"`);
      b.props.onClick();
    },
    type(id, value) {
      const f = api.field(id);
      if (!f) throw new Error(`no field #${id}`);
      f.props.onChange({ target: { value: String(value) } });
    },
    /** Is the element with id `child` rendered inside the element with id `parent`? */
    inside(parent, child) {
      const p = find(render(), (n) => n.props.id === parent);
      return !!p && !!find(p.props.children, (n) => n.props.id === child);
    },
  };
  return api;
}

// ---------------------------------------------------------------------------
// 2a. The destructive toggle
// ---------------------------------------------------------------------------
{
  const c = mountStep1(FILLED);

  c.tap('ft / in');
  check('destructive toggle: re-selecting "ft / in" keeps the height',
    c.s.form.heightFeet === 5 && c.s.form.heightInches === 4, show(c.s.form));
  check('destructive toggle: re-selecting "ft / in" keeps the weight', c.s.form.weight === 185, show(c.s.form));
  check('destructive toggle: re-selecting "ft / in" writes nothing', c.s.writes === 0, `writes=${c.s.writes}`);
  check('unit control: "ft / in" is pressed and "cm" is not while imperial is active',
    c.button('ft / in').props['aria-pressed'] === true && c.button('cm').props['aria-pressed'] === false);

  c.tap('cm');
  check('destructive toggle: switching to "cm" converts the height to 163 cm', c.s.form.heightCm === 163, show(c.s.form));
  check('destructive toggle: switching to "cm" converts the weight to 84 kg', c.s.form.weightKg === 84, show(c.s.form));
  check('destructive toggle: the cm field shows 163', String(c.field('heightCm')?.props.value) === '163');
  check('destructive toggle: the kg field shows 84', String(c.field('weightKg')?.props.value) === '84');

  const writesBefore = c.s.writes;
  c.tap('cm');
  check('destructive toggle: re-selecting "cm" changes nothing',
    c.s.writes === writesBefore && c.s.form.heightCm === 163 && c.s.form.weightKg === 84, show(c.s.form));

  c.tap('ft / in');
  check('destructive toggle: switching back restores 5 ft 4 in',
    c.s.form.heightFeet === 5 && c.s.form.heightInches === 4 && c.s.form.heightCm === undefined, show(c.s.form));
  check('destructive toggle: switching back restores 185 lbs', c.s.form.weight === 185, show(c.s.form));
  check('destructive toggle: email, sex and age are untouched by switching',
    c.s.form.email === FILLED.email && c.s.form.sex === FILLED.sex && c.s.form.age === FILLED.age);
}

// ---------------------------------------------------------------------------
// 2b. Unit control and placeholders
// ---------------------------------------------------------------------------
{
  const c = mountStep1({});
  check('unit control: both options have a 44px minimum touch height',
    ['ft / in', 'cm'].every((label) => c.button(label)?.props.style?.minHeight === '44px'));
  check('unit control: options are real buttons that cannot submit the form',
    ['ft / in', 'cm'].every((label) => c.button(label)?.props.type === 'button'));

  const placeholders = ['heightFeet', 'heightInches', 'weight'].map((id) => c.field(id)?.props.placeholder);
  c.tap('cm');
  placeholders.push(c.field('heightCm')?.props.placeholder, c.field('weightKg')?.props.placeholder);
  check('placeholders: no measurement placeholder contains a digit',
    placeholders.every((p) => typeof p === 'string' && p && !/\d/.test(p)), placeholders.join(' | '));
  check('placeholders: feet is "ft", inches is "in", centimetres is "cm"',
    placeholders[0] === 'ft' && placeholders[1] === 'in' && placeholders[3] === 'cm', placeholders.join(' | '));
}

// ---------------------------------------------------------------------------
// 2c. Missing and invalid height
// ---------------------------------------------------------------------------
{
  const c = mountStep1({ email: 'reader@example.com', sex: 'female', age: 58, weight: 185 });
  c.tap('Continue to Next Step');
  check('missing height: Continue does not advance', c.s.continued === 0);
  check('missing height: the error is "Please enter your height"', c.s.errors.height === 'Please enter your height', JSON.stringify(c.s.errors));

  const message = c.node('height-error');
  check('missing height: a message element renders with that text',
    message?.props.children === 'Please enter your height', String(message?.props.children));
  check('missing height: the message renders inside the height group', c.inside('height-group', 'height-error'));
  for (const id of ['heightFeet', 'heightInches']) {
    const p = c.field(id)?.props || {};
    check(`missing height: #${id} is aria-invalid`, p['aria-invalid'] === true, String(p['aria-invalid']));
    check(`missing height: #${id} is described by #height-error`, p['aria-describedby'] === 'height-error', String(p['aria-describedby']));
  }
  check('missing height: the height group is labelled by the Height label',
    c.node('height-group')?.props['aria-labelledby'] === 'height-label' && c.node('height-group')?.props.role === 'group');
}
{
  const c = mountStep1({ sex: 'female', age: 58, weight: 185 }, {});
  c.tap('Continue to Next Step');
  check('missing email and height: both errors are raised together', !!c.s.errors.email && !!c.s.errors.height, JSON.stringify(c.s.errors));
  c.type('heightFeet', 5);
  check('typing a height clears the height message', !c.s.errors.height && !c.node('height-error'), JSON.stringify(c.s.errors));
  check('typing a height leaves the email error in place', !!c.s.errors.email, JSON.stringify(c.s.errors));
  check('typing feet alone defaults inches to 0', c.s.form.heightInches === 0, show(c.s.form));
}
{
  // The existing height policy, unchanged by this batch: inches 0-11 in
  // imperial, 90-250 cm in metric. No separate feet range.
  const c = mountStep1({ ...FILLED, heightInches: 12 });
  c.tap('Continue to Next Step');
  check('invalid height: 12 inches is refused with a message at the height group',
    c.s.continued === 0 && c.s.errors.heightInches === 'Inches must be between 0 and 11' && c.inside('height-group', 'height-error'),
    JSON.stringify(c.s.errors));

  const m = mountStep1({ email: 'reader@example.com', sex: 'female', age: 58 });
  m.tap('cm');
  m.type('heightCm', 300);
  m.type('weightKg', 84);
  m.tap('Continue to Next Step');
  check('invalid height: 300 cm is refused with a message at the height group',
    m.s.continued === 0 && m.s.errors.heightCm === 'Height must be between 90 and 250 cm' && m.inside('height-group', 'height-error'),
    JSON.stringify(m.s.errors));

  check('height policy unchanged: Step 1 adds no separate feet-range rule',
    !/Feet must be between/.test(fs.readFileSync(STEP1, 'utf8')));
}
{
  const c = mountStep1(FILLED, { heightInches: 'Inches must be between 0 and 11', weight: 'Weight must be between 80 and 500 lbs' });
  c.tap('cm');
  check('switching units clears messages that name the other unit system',
    !c.s.errors.heightInches && !c.s.errors.weight, JSON.stringify(c.s.errors));
}

// ---------------------------------------------------------------------------
// 2d. Email copy, metric heights, and the happy path
// ---------------------------------------------------------------------------
{
  const c = mountStep1({ sex: 'female', age: 58, heightFeet: 5, heightInches: 4, weight: 185 });
  c.tap('Continue to Next Step');
  check('missing email: message reads "Email is required to continue"',
    c.s.errors.email === 'Email is required to continue', String(c.s.errors.email));
  check('Step 1 no longer says the email is needed to "receive your results"',
    !fs.readFileSync(STEP1, 'utf8').includes('receive your results'));
}
{
  const c = mountStep1({ email: 'reader@example.com', sex: 'female', age: 58 });
  c.tap('cm');
  c.type('heightCm', 182);
  c.type('weightKg', 84);
  c.tap('Continue to Next Step');
  check('metric 182 cm / 84 kg: Continue advances (no hidden inches error)', c.s.continued === 1, JSON.stringify(c.s.errors));
  check('metric 182 cm is stored internally as 6 ft 0 in', c.s.form.heightFeet === 6 && c.s.form.heightInches === 0, show(c.s.form));
}
{
  const c = mountStep1(FILLED);
  c.tap('Continue to Next Step');
  check('valid imperial Step 1 advances with no errors', c.s.continued === 1 && Object.keys(c.s.errors).length === 0, JSON.stringify(c.s.errors));
}

say(`\nstep1-unit-toggle: ${passed} passed, ${failures.length} failed\n`);
for (const f of failures) say(`  ✗ ${f.label}${f.detail ? `  [${f.detail}]` : ''}`);
if (failures.length) process.exit(1);
say('Step 1 unit switching converts instead of clearing, and a failed Continue always says why.\n');
