#!/usr/bin/env node
/**
 * tests/verify-rendered-report.mjs
 *
 *     node tests/verify-rendered-report.mjs <report.html> [--macros 1463,109,114]
 *
 * Customer-visible defect gate for a fully generated report.
 *
 * The unit suite (tests/report-blockquote-render.test.mjs) proves the renderer
 * handles the markdown the safety helpers emit. It cannot prove that a whole
 * generated report is clean, because most of a report is written by the model at
 * request time and because template strings can carry their own defects. On
 * 2026-09-09 three separate customer-visible problems in a real report were
 * invisible to the unit suite and were only found by reading the artifact:
 *
 *   - literal '>' and '###' throughout the safety sections
 *   - "and goal. it does not know your kidney function", a sentence broken in
 *     half by an em-dash removal
 *   - "carnivore Target" and "Before Starting carnivore" from a lower-cased
 *     protocol name substituted into title-case positions
 *
 * This script mechanises that read so the next person does not have to notice.
 * It checks the rendered HTML. It is not a substitute for looking at the PDF,
 * which is the only thing that shows page breaks, clipping and layout.
 */

import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node tests/verify-rendered-report.mjs <report.html> [--macros cal,protein,fat]');
  process.exit(1);
}

const macrosArg = (() => {
  const i = process.argv.indexOf('--macros');
  return i > -1 ? process.argv[i + 1].split(',').map(Number) : null;
})();

const raw = fs.readFileSync(file, 'utf8');
const body = raw
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace(/<script>[\s\S]*?<\/script>/g, '');
// Two views of the same content, and the difference matters.
//
// textRaw keeps HTML entities. An unrendered markdown blockquote marker reaches
// the page as a literal '>' inside a paragraph, because the renderer does not
// escape paragraph text. A mathematical greater-than inside a list item or table
// cell IS escaped, so it arrives as '&gt;'. Checking markdown markers against
// textRaw therefore distinguishes "the renderer failed to parse a blockquote"
// from "the copy legitimately says 'if age >40'", which a decoded view cannot.
const textRaw = body.replace(/<[^>]+>/g, '');

// text decodes entities, because that is what the reader actually sees. Content
// and house-style checks run against this one.
const text = textRaw
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&');
const flat = text.replace(/\s+/g, ' ');

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}`);
    if (detail) console.log(`        ${String(detail).slice(0, 300)}`);
  }
};

// --- raw markdown leaking to the reader ------------------------------------
// A blockquote marker is '>' followed by a space, or a bare '>' on its own line.
const gtLines = textRaw.split('\n').filter(l => /^>(\s|$)/.test(l.trimStart()));
check('no unrendered blockquote marker', gtLines.length === 0, gtLines.slice(0, 2).join(' | '));
check('no literal ### is visible', !textRaw.includes('###'));
check('no literal ** is visible', !textRaw.includes('**'));
check('no unrendered [link](url) syntax', !/\[[^\]]+\]\([^)]+\)/.test(text));

// --- house style ------------------------------------------------------------
const em = flat.match(/.{0,45}—.{0,45}/g) || [];
check('no em-dash anywhere in customer-visible text', em.length === 0, em.slice(0, 2).join(' || '));

// --- sentence continuity ----------------------------------------------------
const broken = flat
  .split(/(?<=[.!?])\s+/)
  .map(f => f.trim())
  .filter(f => /^[a-z]/.test(f) && !/^(e\.g|i\.e|mg|g|kg|mmol|oz|lbs?)\b/.test(f));
check('no sentence begins in lower case', broken.length === 0, broken.slice(0, 2).join(' || '));

// --- protocol-name capitalisation -------------------------------------------
const lowerProtocol = [
  /\bcarnivore (Target|expectation)/,
  /Starting carnivore\b/,
  /about carnivore\*/
].filter(p => p.test(text));
check('protocol name is capitalised in title positions', lowerProtocol.length === 0,
  lowerProtocol.map(String).join(' | '));

// --- delivery artifacts -----------------------------------------------------
for (const [label, pat] of [
  ['no local filesystem path', /file:\/\/\//],
  ['no home directory path', /\/Users\//],
  ['no internal review filename', /review-v\d|MAINTENANCE-review/i]
]) {
  const hit = pat.exec(raw);
  check(label, !hit, hit ? hit[0] : '');
}

// --- macros -----------------------------------------------------------------
if (macrosArg) {
  const [cal, protein, fat] = macrosArg;
  const calStr = cal.toLocaleString('en-US');
  check(`calories ${calStr} present`, text.includes(calStr) || text.includes(String(cal)));
  check(`protein ${protein}g present`, new RegExp(`${protein}\\s*g`).test(text));
  check(`fat ${fat}g present`, new RegExp(`${fat}\\s*g`).test(text));
}

// --- safety structure -------------------------------------------------------
const quotes = (body.match(/<blockquote/g) || []).length;
check('safety callouts are rendered as blockquotes', quotes > 0, `found ${quotes}`);
check('blockquote tags are balanced',
  quotes === (body.match(/<\/blockquote>/g) || []).length);

console.log(`\n${failures === 0 ? 'CLEAN' : failures + ' DEFECT(S)'} in ${file}`);
process.exit(failures === 0 ? 0 : 1);
