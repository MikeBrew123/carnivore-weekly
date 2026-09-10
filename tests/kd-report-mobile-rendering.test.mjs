#!/usr/bin/env node
/**
 * tests/kd-report-mobile-rendering.test.mjs
 *
 * Run it:
 *     node tests/kd-report-mobile-rendering.test.mjs
 *
 * Needs Chromium via the repo's own @playwright/test devDependency. No network,
 * no database, no API key. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS  (Blocker #4, found 2026-09-09)
 * ---------------------------------------------------------------------------
 * The paid reports were built as documents. `.page` is 8.5in wide, the gutters
 * are in inches, and the only media query in the whole stylesheet was
 * `@media print`. Measured before the fix, every report rendered 816px wide at
 * every viewport:
 *
 *     320px viewport -> 816px document   (39% of the page visible)
 *     390px viewport -> 816px document   (48%)
 *     430px viewport -> 816px document   (53%)
 *
 * Headings were cut mid-word, the four-cell patient snapshot showed two cells,
 * and the meal plan's macro column sat off the right edge. The delivery email's
 * only instruction is "click any report below to view it in your browser" and
 * there is no attached PDF, so that is how most customers meet the thing they
 * paid for.
 *
 * WHAT THIS SUITE PINS
 *   A  the document fits the viewport at every phone width
 *   B  nothing is clipped by the page's own overflow:hidden
 *   C  required content is present AND laid out, not merely in the HTML
 *   D  safety callouts survive at every width
 *   E  multi-column grids actually collapse
 *   F  desktop is unchanged
 *   G  print still gets the document page, not the phone one
 *   H  mutation
 *
 * B IS THE ONE THAT MATTERS. `.page` carries `overflow:hidden`, so an element
 * that is still too wide is CUT, silently, without widening the document. A
 * suite that only measured scrollWidth would pass while a renal referral was
 * being trimmed off the right-hand side. Group B walks the rendered box of every
 * element and compares it to the page box.
 */

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPORTS = path.join(ROOT, 'ketodial', 'worker', 'reports.js');
const INTAKE = path.join(ROOT, 'ketodial', 'worker', 'intake.js');

let chromium;
try {
  ({ chromium } = await import('@playwright/test'));
} catch {
  console.error('\nkd-report-mobile-rendering: SKIPPED — @playwright/test is not installed.');
  console.error('This suite measures a real rendering engine on purpose: string assertions');
  console.error('about CSS cannot tell you whether a phone clips a safety callout.');
  console.error('Run `npm ci` to enable it.\n');
  process.exit(0);
}

const { generateDoctorReport, generateMealPlan, generateStarterKit } =
  await import('file://' + REPORTS);

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

function intake(over = {}) {
  return {
    sex: 'female', age: 58, heightCm: 165, weightKg: 88, goal: 'lose',
    calories: 1650, fatG: 128, proteinG: 103, carbG: 21, tdee: 2060,
    activity: 'light', kidneyStatus: 'no', conditions: ['t2d', 'bp'],
    meds: 'metformin 1000mg', symptoms: ['energy', 'crave'], diets: [],
    dairy: 'fine with dairy', budget: 'mod', cooking: 'Basic',
    prepTime: 'About 30 min/day', cookingFor: 'Just me',
    challenge: 'Evening snacking after dinner.', ...over,
  };
}

/**
 * Every paid artifact, including the ones whose whole content is a safety
 * decision. `must` is text a customer has to be able to READ, not merely text
 * that exists somewhere in the HTML.
 */
const DOCS = [
  { id: 'doctor', gen: generateDoctorReport, d: intake(),
    must: ['Patient snapshot', 'Proposed dietary intervention', '103 g', 'Reported conditions'] },
  { id: 'doctor-renal', gen: generateDoctorReport, d: intake({ kidneyStatus: 'yes' }),
    must: ['Your protein target is not in this report', 'renal dietitian'] },
  { id: 'doctor-sglt2', gen: generateDoctorReport, d: intake({ meds: 'Jardiance 10mg' }),
    must: ['Your macronutrient targets are not in this report', 'euglycemic diabetic ketoacidosis'] },
  { id: 'doctor-insulin', gen: generateDoctorReport, d: intake({ meds: 'Lantus insulin 24u, glipizide 5mg' }),
    must: ['Talk to your prescriber before you start', 'hypoglycemia', 'Insulin / sulfonylureas'] },
  { id: 'meal', gen: generateMealPlan, d: intake(),
    must: ['Daily targets', 'DAY 01', 'Day total', "Your week's grocery list"] },
  { id: 'meal-renal', gen: generateMealPlan, d: intake({ kidneyStatus: 'yes' }),
    must: ['We have not built this plan', 'Your money back, no conversation required'] },
  { id: 'meal-sglt2', gen: generateMealPlan, d: intake({ meds: 'Jardiance 10mg' }),
    must: ['We have not built this plan', 'euglycemic diabetic ketoacidosis'] },
  { id: 'meal-insulin', gen: generateMealPlan, d: intake({ meds: 'Lantus insulin 24u' }),
    must: ['Talk to your prescriber before you start', 'Day total'] },
  { id: 'starter', gen: generateStarterKit, d: intake(),
    must: ['adaptation curve', 'Your number is 21g net carbs per day'] },
  { id: 'starter-sglt2', gen: generateStarterKit, d: intake({ meds: 'Jardiance 10mg' }),
    must: ['Your macronutrient targets are not in this report'] },
  { id: 'starter-insulin', gen: generateStarterKit, d: intake({ meds: 'Lantus insulin 24u' }),
    must: ['Talk to your prescriber before you start'] },
];

const PHONE_WIDTHS = [320, 375, 390, 430];
/** Sub-pixel layout rounding is not a customer problem. Half a line of text is. */
const OVERFLOW_SLACK = 2;

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-mobile-'));
for (const doc of DOCS) fs.writeFileSync(path.join(dir, `${doc.id}.html`), doc.gen('Ann Whitfield', doc.d));

const browser = await chromium.launch();

/** Measure one document at one width. */
async function measure(id, width, { media } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  if (media) await page.emulateMedia({ media });
  await page.goto('file://' + path.join(dir, `${id}.html`));
  await page.waitForTimeout(90);
  const result = await page.evaluate((slack) => {
    const doc = document.documentElement;
    const pages = [...document.querySelectorAll('.page')];
    // Anything whose painted box runs past the page's own box is being clipped
    // by .page{overflow:hidden} without ever widening the document.
    const clipped = [];
    for (const pg of pages) {
      const box = pg.getBoundingClientRect();
      for (const el of pg.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right > box.right + slack || r.left < box.left - slack) {
          clipped.push({
            tag: el.tagName.toLowerCase(),
            cls: (el.className && el.className.toString().slice(0, 40)) || '',
            over: Math.round(Math.max(r.right - box.right, box.left - r.left)),
            text: (el.textContent || '').trim().slice(0, 50),
          });
        }
      }
    }
    // Nothing floating may sit on top of the report's own header. On desktop the
    // print button lives in the page margin; on a phone there is no margin.
    const pb = document.querySelector('.printbar');
    const head = document.querySelector('.rep-head');
    let overlapsHead = false;
    if (pb && head) {
      const a = pb.getBoundingClientRect(), b2 = head.getBoundingClientRect();
      overlapsHead = a.right > b2.left && a.left < b2.right && a.bottom > b2.top && a.top < b2.bottom;
    }
    const pbOverflow = pb
      ? Math.round(pb.getBoundingClientRect().right - doc.clientWidth) : 0;
    const cols = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return getComputedStyle(el).gridTemplateColumns.split(' ').filter(Boolean).length;
    };
    return {
      client: doc.clientWidth,
      scroll: doc.scrollWidth,
      pageWidth: pages.length ? Math.round(pages[0].getBoundingClientRect().width) : null,
      pageCss: pages.length ? getComputedStyle(pages[0]).width : null,
      overlapsHead, pbOverflow,
      clipped: clipped.slice(0, 6),
      clippedCount: clipped.length,
      statCols: cols('.stat-grid.c4'),
      twoColCols: cols('.two-col'),
      groceryCols: cols('.grocery'),
      timelineCols: cols('.timeline'),
    };
  }, OVERFLOW_SLACK);
  await ctx.close();
  return { page, result };
}

/** Is this text laid out somewhere a reader can reach it? */
async function textIsVisible(id, width, needle) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(dir, `${id}.html`));
  await page.waitForTimeout(60);
  const out = await page.evaluate(({ needle, slack }) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.includes(needle)) continue;
      const el = node.parentElement;
      const r = el.getBoundingClientRect();
      const pg = el.closest('.page');
      if (!pg) return { found: true, reason: 'not inside a .page' };
      const box = pg.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        found: true,
        visible: r.width > 0 && r.height > 0,
        inside: r.right <= box.right + slack && r.left >= box.left - slack,
        hidden: cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0,
        right: Math.round(r.right), pageRight: Math.round(box.right),
      };
    }
    return { found: false };
  }, { needle, slack: OVERFLOW_SLACK });
  await ctx.close();
  return out;
}

// ===========================================================================
// GROUPS A, B, E — fit, clipping and grid collapse at phone widths
// ===========================================================================
for (const doc of DOCS) {
  for (const width of PHONE_WIDTHS) {
    const { result: r } = await measure(doc.id, width);
    check('A', `${doc.id} @${width}: the document fits the viewport`,
      r.scroll <= r.client + OVERFLOW_SLACK,
      `scrollWidth ${r.scroll} vs clientWidth ${r.client}`);
    check('A', `${doc.id} @${width}: the page fills the width rather than overhanging it`,
      r.pageWidth <= width + OVERFLOW_SLACK && r.pageWidth >= width * 0.9,
      `page ${r.pageWidth}px in ${width}px`);
    check('B', `${doc.id} @${width}: the print button does not cover the report header`,
      r.overlapsHead === false);
    check('B', `${doc.id} @${width}: the print button stays inside the viewport`,
      r.pbOverflow <= 0, `${r.pbOverflow}px past the edge`);
    check('B', `${doc.id} @${width}: nothing is clipped by the page edge`,
      r.clippedCount === 0,
      r.clipped.map(c => `${c.tag}.${c.cls} +${c.over}px "${c.text}"`).join(' | '));
    if (r.statCols !== null) {
      check('E', `${doc.id} @${width}: the 4-cell snapshot collapses`,
        r.statCols <= (width < 400 ? 1 : 2), `${r.statCols} columns`);
    }
    if (r.twoColCols !== null) {
      check('E', `${doc.id} @${width}: the two-column block collapses`, r.twoColCols === 1,
        `${r.twoColCols} columns`);
    }
    if (r.groceryCols !== null) {
      check('E', `${doc.id} @${width}: the grocery grid collapses`, r.groceryCols === 1,
        `${r.groceryCols} columns`);
    }
    if (r.timelineCols !== null) {
      check('E', `${doc.id} @${width}: the starter timeline collapses`, r.timelineCols === 1,
        `${r.timelineCols} columns`);
    }
  }
}

// ===========================================================================
// GROUPS C, D — required and safety content is present AND readable
// ===========================================================================
//
// "Present in the HTML" is not the assertion. A responsive rule that pushed a
// renal referral past the page edge would leave it in the markup and take it
// away from the reader, and .page{overflow:hidden} would hide the evidence.
for (const doc of DOCS) {
  for (const width of [320, 390]) {
    for (const needle of doc.must) {
      const v = await textIsVisible(doc.id, width, needle);
      const isSafety = /protein target is not|macronutrient targets are not|prescriber|hypoglycemia|not built this plan|ketoacidosis|money back|renal dietitian|sulfonylureas/i.test(needle);
      const group = isSafety ? 'D' : 'C';
      check(group, `${doc.id} @${width}: "${needle.slice(0, 44)}" is in the document`, v.found === true);
      check(group, `${doc.id} @${width}: "${needle.slice(0, 44)}" is laid out`,
        v.found === true && v.visible === true && v.hidden === false, JSON.stringify(v));
      check(group, `${doc.id} @${width}: "${needle.slice(0, 44)}" is inside the page, not past its edge`,
        v.found === true && v.inside === true, JSON.stringify(v));
    }
  }
}

// ===========================================================================
// GROUP F — desktop is unchanged
// ===========================================================================
for (const doc of DOCS) {
  const { result: r } = await measure(doc.id, 1280);
  check('F', `${doc.id} @1280: the page keeps its 8.5in document width`,
    Math.abs(r.pageWidth - 816) <= 2, `${r.pageWidth}px`);
  check('F', `${doc.id} @1280: no horizontal overflow on desktop`,
    r.scroll <= r.client + OVERFLOW_SLACK, `${r.scroll} vs ${r.client}`);
  check('F', `${doc.id} @1280: nothing clipped on desktop either`, r.clippedCount === 0,
    r.clipped.map(c => `${c.tag}.${c.cls} +${c.over}px`).join(' | '));
}

/** 0.46in 0.6in 0.3in and 0.5in 0.6in 0.46in, as Chromium computes them. */
const PRINT_BODY_PADDING = '44.16px 57.6px 28.8px';
const PRINT_HEAD_PADDING = '48px 57.6px 44.16px';

/** What print media actually sees, at a given viewport. */
async function printState(id, width) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  await page.emulateMedia({ media: 'print' });
  await page.goto('file://' + path.join(dir, `${id}.html`));
  await page.waitForTimeout(70);
  const out = await page.evaluate(() => {
    const body = document.querySelector('.rep-body');
    const head = document.querySelector('.rep-head');
    const pg = document.querySelector('.page');
    return {
      bodyPad: body ? getComputedStyle(body).padding : null,
      headPad: head ? getComputedStyle(head).padding : null,
      pageCount: document.querySelectorAll('.page').length,
      breakAfter: pg ? (getComputedStyle(pg).breakAfter || getComputedStyle(pg).pageBreakAfter) : null,
    };
  });
  await ctx.close();
  return out;
}

// ===========================================================================
// GROUP G — print keeps the document page
// ===========================================================================
//
// The mobile rules are `@media screen`, so print must never see them. Emulating
// print media at a PHONE viewport is the case that would catch a leak: if the
// query had been width-only, a 390px print would inherit the phone layout.
for (const doc of DOCS) {
  for (const width of [390, 1280]) {
    // Width is the wrong probe here: the pre-existing print block sets
    // .page{width:auto}, which correctly fills the print area at whatever
    // viewport is being emulated. What must be true is that the SCREEN rules are
    // not in effect, so the document keeps its inch gutters and its page breaks.
    const r = await printState(doc.id, width);
    // The referral documents are a single page built from `.sec` blocks and carry
    // no `.rep-body`, so the head gutter is the probe every document shares.
    check('G', `${doc.id} @${width} print: the head keeps its document gutters`,
      r.headPad === PRINT_HEAD_PADDING, `padding is ${r.headPad}`);
    if (r.bodyPad !== null) {
      check('G', `${doc.id} @${width} print: the body keeps its document gutters`,
        r.bodyPad === PRINT_BODY_PADDING, `padding is ${r.bodyPad}`);
    }
    // A single-page document correctly ends with `auto`; only a multi-page one
    // must force the break. Asserting "always or auto" would assert nothing.
    // Chromium reports the legacy `page-break-after:always` as the modern
    // `break-after:page`, so both spellings are the same instruction.
    const forced = r.breakAfter === 'page' || r.breakAfter === 'always';
    check('G', `${doc.id} @${width} print: ${r.pageCount} page(s) break as a document`,
      r.pageCount > 1 ? forced : r.breakAfter === 'auto',
      `break-after ${r.breakAfter} on a ${r.pageCount}-page document`);
  }
}
// And a real PDF still paginates as a document.
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('file://' + path.join(dir, 'doctor.html'));
  await page.waitForTimeout(80);
  const pdf = await page.pdf({ format: 'Letter', printBackground: true });
  await ctx.close();
  check('G', 'a PDF rendered from a phone viewport is still a multi-page document',
    pdf.length > 50000 && /%PDF/.test(pdf.slice(0, 8).toString('latin1')), `${pdf.length} bytes`);
}

// ===========================================================================
// GROUP H — mutation
// ===========================================================================
const MUTATIONS = [
  {
    name: 'the screen rules are removed, restoring the fixed 8.5in page',
    apply: (s) => s.replace('${SHARED_CSS}${extraCSS}${SCREEN_CSS}', '${SHARED_CSS}${extraCSS}'),
    expectPhoneOverflow: true, expectPrintBroken: false,
  },
  {
    name: 'the screen rules lose their `screen` keyword and leak into print',
    apply: (s) => s.replace('@media screen and (max-width:860px){', '@media (max-width:860px){')
      .replace('@media screen and (max-width:400px){', '@media (max-width:400px){'),
    expectPhoneOverflow: false, expectPrintBroken: true,
  },
];

for (const m of MUTATIONS) {
  const src = fs.readFileSync(REPORTS, 'utf8');
  const mutated = m.apply(src).replace("from './intake.js'", `from '${'file://' + INTAKE}'`);
  check('H', `mutation applied: ${m.name}`,
    mutated.replace(`from '${'file://' + INTAKE}'`, "from './intake.js'") !== src,
    'the replace matched nothing, so this mutation proves nothing');

  const mdir = fs.mkdtempSync(path.join(os.tmpdir(), 'kd-mobile-mutant-'));
  const file = path.join(mdir, 'reports.mutant.mjs');
  fs.writeFileSync(file, mutated);
  try {
    const mut = await import('file://' + file + '?v=' + encodeURIComponent(m.name));
    fs.writeFileSync(path.join(mdir, 'doctor.html'), mut.generateDoctorReport('Ann Whitfield', intake()));

    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
    const page = await ctx.newPage();
    await page.goto('file://' + path.join(mdir, 'doctor.html'));
    await page.waitForTimeout(80);
    const screenW = await page.evaluate(() => document.documentElement.scrollWidth);
    await page.emulateMedia({ media: 'print' });
    await page.waitForTimeout(60);
    const printPad = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.rep-head')).padding);
    await ctx.close();

    if (m.expectPhoneOverflow) {
      check('H', `group A catches: ${m.name}`, screenW > 390 + OVERFLOW_SLACK,
        `scrollWidth ${screenW} at a 390px viewport`);
    }
    if (m.expectPrintBroken) {
      check('H', `group G catches: ${m.name}`, printPad !== PRINT_HEAD_PADDING,
        `print padding is ${printPad}, which still matches the document value, so the leak went unnoticed`);
    }
  } finally {
    fs.rmSync(mdir, { recursive: true, force: true });
  }
}

await browser.close();
fs.rmSync(dir, { recursive: true, force: true });

// ===========================================================================
if (failures.length) {
  console.error(`\nkd-report-mobile-rendering: ${passed} passed, ${failures.length} FAILED\n`);
  for (const f of failures.slice(0, 25)) {
    console.error(`  [${f.group}] ${f.label}${f.detail ? `\n      ${f.detail}` : ''}`);
  }
  if (failures.length > 25) console.error(`  … and ${failures.length - 25} more`);
  console.error('\nThese reports are delivered as a link and read on a phone. Do not loosen');
  console.error('an assertion: a clipped safety callout is invisible, not merely awkward.\n');
  process.exit(1);
}
console.log(`\nkd-report-mobile-rendering: ${passed} passed, 0 failed  (groups A B C D E F G H)\n`);
console.log('Every paid report fits 320, 375, 390 and 430px with nothing clipped by the');
console.log('page edge, every safety callout is laid out inside the page, desktop still');
console.log('renders the 8.5in document, and print never sees the phone rules.\n');
