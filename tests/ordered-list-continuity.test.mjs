#!/usr/bin/env node
/**
 * tests/ordered-list-continuity.test.mjs
 *
 *     node tests/ordered-list-continuity.test.mjs
 *
 * No network, no database. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * A blank line between numbered items closed the list, so the renderer opened a
 * fresh <ol> for the next one and the browser started counting again. Four steps
 * came out of a delivered PDF as:
 *
 *     1. Make dinner your largest meal
 *     1. If you're hungry after dinner, eat more meat
 *     1. Clear the kitchen
 *     1. Identify the trigger
 *
 * Found in the normal customer artifact at final verification. The model writes its
 * steps with blank lines between them, so this is the shape it produces most often,
 * and nothing checked the NUMBERS: the suites asserted that <ol> tags existed and
 * balanced, which they did, four times over.
 *
 * These tests assert on rendered output from the real renderer, and they count.
 */

import path from 'path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const { __test_markdownToHTML: render } = await import('file://' + path.join(ROOT, 'api', 'calculator-api.js'));

let passed = 0;
const failures = [];
const check = (group, label, ok, detail = '') =>
  ok ? passed++ : failures.push({ group, label, detail });

const count = (html, tag) => (html.match(new RegExp(`<${tag}>`, 'g')) || []).length;
/** What the reader sees: the ordinal each <li> renders with, per list. */
function visibleNumbering(html) {
  return [...html.matchAll(/<ol>([\s\S]*?)<\/ol>/g)]
    .map(m => (m[1].match(/<li>/g) || []).map((_, idx) => idx + 1));
}

// ===========================================================================
// GROUP A — a loose ordered list is ONE list.
// ===========================================================================
{
  const html = render('1. First step\n\n2. Second step\n\n3. Third step\n\n4. Fourth step\n');

  check('A', 'exactly one ordered list is opened',
    count(html, 'ol') === 1, `${count(html, 'ol')} <ol> blocks`);
  check('A', 'it holds all four items',
    count(html, 'li') === 4, `${count(html, 'li')} <li>`);
  check('A', 'there are no single-item ordered lists',
    ![...html.matchAll(/<ol>([\s\S]*?)<\/ol>/g)].some(m => (m[1].match(/<li>/g) || []).length === 1),
    'a one-item <ol> restarts the numbering at 1');
  check('A', 'the reader sees 1, 2, 3, 4',
    JSON.stringify(visibleNumbering(html)) === JSON.stringify([[1, 2, 3, 4]]),
    JSON.stringify(visibleNumbering(html)));
  check('A', 'the items keep their order and their text',
    /<li>First step<\/li>[\s\S]*<li>Second step<\/li>[\s\S]*<li>Third step<\/li>[\s\S]*<li>Fourth step<\/li>/.test(html),
    html.slice(0, 200));
  check('A', 'the source ordinals are not printed twice',
    !/<li>\s*\d+\.\s/.test(html), 'the marker survived into the item text');

  // The exact list from the artifact that failed final verification.
  const real = render(
    "1. **Make dinner your largest meal.** Front-load protein and fat.\n\n" +
    "2. **If you're hungry after dinner, eat more meat.** This isn't a willpower test.\n\n" +
    "3. **Clear the kitchen.** Designate one cabinet that is not yours.\n\n" +
    "4. **Identify the trigger.** Boredom, habit, or genuine hunger.\n");
  check('A', 'the real four-step list renders as one list of four',
    count(real, 'ol') === 1 && count(real, 'li') === 4,
    `${count(real, 'ol')} <ol>, ${count(real, 'li')} <li>`);
  check('A', 'and its numbering is 1, 2, 3, 4',
    JSON.stringify(visibleNumbering(real)) === JSON.stringify([[1, 2, 3, 4]]),
    JSON.stringify(visibleNumbering(real)));
}

// ===========================================================================
// GROUP B — prose after a loose list still ends it.
// ===========================================================================
{
  const html = render('1. First\n\n2. Second\n\nThis is a paragraph.\n');

  check('B', 'the list closes before the paragraph',
    /<\/ol>[\s\S]*<p>This is a paragraph\.<\/p>/.test(html), html);
  check('B', 'the paragraph is not swallowed into a list item',
    !/<li>[^<]*This is a paragraph/.test(html), html);
  check('B', 'one list, two items',
    count(html, 'ol') === 1 && count(html, 'li') === 2,
    `${count(html, 'ol')} <ol>, ${count(html, 'li')} <li>`);

  // The same for the other block types a blank line can be followed by.
  for (const [what, after, expect] of [
    ['a heading', '## Next Section', /<\/ol>[\s\S]*<h2>/],
    ['a table', '| a | b |\n| - | - |', /<\/ol>[\s\S]*<table>/],
    ['a bullet list', '- a bullet', /<\/ol>[\s\S]*<ul>/],
  ]) {
    const out = render(`1. First\n\n2. Second\n\n${after}\n`);
    check('B', `the list closes before ${what}`, expect.test(out), out.slice(0, 240));
  }
}

// ===========================================================================
// GROUP C — the compact form still works, and a later list is still its own list.
// ===========================================================================
{
  const compact = render('1. One\n2. Two\n3. Three\n');
  check('C', 'consecutive numbered lines are one list',
    count(compact, 'ol') === 1 && count(compact, 'li') === 3,
    `${count(compact, 'ol')} <ol>, ${count(compact, 'li')} <li>`);
  check('C', 'numbered 1, 2, 3',
    JSON.stringify(visibleNumbering(compact)) === JSON.stringify([[1, 2, 3]]),
    JSON.stringify(visibleNumbering(compact)));

  const two = render('1. One\n\n2. Two\n\nA paragraph between them.\n\n1. Fresh one\n\n2. Fresh two\n');
  check('C', 'a list separated by prose is still a SECOND list',
    count(two, 'ol') === 2, `${count(two, 'ol')} <ol> blocks`);
  check('C', 'and the second one restarts at 1, which is correct here',
    JSON.stringify(visibleNumbering(two)) === JSON.stringify([[1, 2], [1, 2]]),
    JSON.stringify(visibleNumbering(two)));

  // Hard-wrapped items still join the item they belong to rather than escaping it.
  const wrapped = render('1. A long first step that runs\n   onto the next line\n\n2. Second step\n');
  check('C', 'a hard-wrapped item stays in its own <li>',
    count(wrapped, 'li') === 2 && /onto the next line/.test(wrapped), wrapped.slice(0, 240));
  check('C', 'and the wrap did not orphan text outside the list',
    !/<\/ol>[\s\S]*onto the next line/.test(wrapped), wrapped.slice(0, 240));
}

// ===========================================================================
// GROUP D — unordered lists are untouched.
// ===========================================================================
{
  const tight = render('- one\n- two\n- three\n');
  check('D', 'a tight bullet list is one list of three',
    count(tight, 'ul') === 1 && count(tight, 'li') === 3,
    `${count(tight, 'ul')} <ul>, ${count(tight, 'li')} <li>`);

  const loose = render('- one\n\n- two\n');
  check('D', 'a blank line still separates bullet lists, exactly as before',
    count(loose, 'ul') === 2, `${count(loose, 'ul')} <ul> blocks`);
  check('D', 'a bullet list still closes before a paragraph',
    /<\/ul>[\s\S]*<p>After\.<\/p>/.test(render('- one\n- two\n\nAfter.\n')), '');
  check('D', 'bullets do not become an ordered list',
    !/<ol>/.test(tight) && !/<ol>/.test(loose), '');
}

// ===========================================================================
// GROUP E — the same renderer handles blockquotes recursively, so the safety
// callouts get the fix for free. Asserted because they are where the medical
// routing lives, and a restart there would be read as four separate first steps.
// ===========================================================================
{
  const quoted = render('> **Before you start**\n>\n> 1. Ask about your kidney function\n>\n> 2. Take this report with you\n>\n> 3. Follow their number\n');

  check('E', 'the blockquote still renders as a safety callout',
    /<blockquote class="safety-callout">/.test(quoted), quoted.slice(0, 200));
  check('E', 'the quoted ordered list is one list of three',
    count(quoted, 'ol') === 1 && count(quoted, 'li') === 3,
    `${count(quoted, 'ol')} <ol>, ${count(quoted, 'li')} <li>`);
  check('E', 'numbered 1, 2, 3 inside the callout',
    JSON.stringify(visibleNumbering(quoted)) === JSON.stringify([[1, 2, 3]]),
    JSON.stringify(visibleNumbering(quoted)));
  check('E', 'the callout is still balanced',
    (quoted.match(/<blockquote/g) || []).length === (quoted.match(/<\/blockquote>/g) || []).length, '');
  check('E', 'no literal quote marker survives',
    !/(^|\n)\s*&gt;/.test(quoted) && !/(^|\n)\s*>/.test(quoted.replace(/<[^>]+>/g, '')), '');
}

console.log('');
if (failures.length) {
  for (const f of failures) console.log(`  FAIL  [${f.group}] ${f.label}${f.detail ? ` — ${f.detail}` : ''}`);
  console.log(`\nordered-list-continuity: ${passed} passed, ${failures.length} FAILED`);
  process.exit(1);
}
console.log(`ordered-list-continuity: ${passed} passed, 0 failed  (groups A B C D E)`);
console.log('');
console.log('A blank line between numbered items no longer restarts the count, and');
console.log('every other thing a blank line can end still ends there.');
