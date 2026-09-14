#!/usr/bin/env node
/**
 * tests/electrolyte-self-dosing.test.mjs
 *
 * REGRESSION GUARD AGAINST UNGATED ELECTROLYTE SELF-DOSING, CW BLOG.
 *
 * Run it:
 *     node tests/electrolyte-self-dosing.test.mjs
 *     node tests/electrolyte-self-dosing.test.mjs --list   (print every match it finds)
 *
 * No dependencies, no network. Exits non-zero on any failure.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE EXISTS
 * ---------------------------------------------------------------------------
 * On 2026-09-14 a sweep found 16 live CW blog pages printing quantitative
 * sodium, potassium and magnesium dosing with no medication or condition gate.
 * The worst instances told every reader to take 4-6 g of sodium a day, to salt
 * every meal, to self-mix cream of tartar (potassium bitartrate) into water for
 * a hot run, and to read a cramp as proof they needed more salt. Potassium and
 * magnesium are renally cleared. On an ACE inhibitor, an ARB, spironolactone, a
 * loop diuretic, or with reduced kidney function, those instructions are unsafe.
 *
 * The standing rule (CLAUDE.md) is SUPPRESS, NEVER SUBSTITUTE: where a safe
 * answer needs clinical judgement, the number is removed and the reader is
 * routed to a clinician. It is never replaced with a gentler number.
 *
 * ---------------------------------------------------------------------------
 * THE HARD PART: A NUMBER IS NOT AUTOMATICALLY A DOSE
 * ---------------------------------------------------------------------------
 * "A 10 oz ribeye gives you roughly 700 to 800 mg of potassium" is a food fact
 * and must survive. "Take 300-400 mg of magnesium glycinate" is a dose and must
 * not. A guard that cannot tell them apart is useless: it either fires on every
 * nutrition article or it fires on nothing.
 *
 * So classification is by GRAMMAR, not by the presence of a number:
 *   - an INTAKE VERB or TARGET NOUN near the figure  -> dose
 *   - a COMPOSITION CUE near the figure ("per 100 g",
 *     "per serving", "contains", "gives you")        -> food fact, allowed
 *   - composition cue wins ties, because a sentence that says what is in a
 *     food is describing the food even if it also says "you get"
 *
 * The FIXTURES block at the bottom proves that distinction in both directions
 * and is itself asserted, so the classifier cannot silently rot into a
 * rubber stamp.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIST = process.argv.includes('--list');

let failures = [];
function check(name, cond, detail) {
  if (!cond) failures.push({ name, detail });
}

// ---------------------------------------------------------------------------
// classifier
// ---------------------------------------------------------------------------

const MINERAL = '(?:sodium|potassium|magnesium|salt|lite\\s?salt|no\\s?salt|electrolytes?)';
const QTY = '[0-9][0-9,.]*\\s*(?:(?:-|–|to)\\s*[0-9][0-9,.]*\\s*)?(?:mg|g|grams?|tsp|teaspoons?)';

// verbs and nouns that turn a figure into an instruction
const INTAKE = /\b(?:take|add|supplement|consume|aim for|target|targets|hit|drink|dissolve|mix|load|loading|dose|dosing|get in|shoot for|need(?:s)?|require(?:s)?)\b/i;
const TARGETY = /\b(?:daily|per day|a day|each day|every day|per hour|an hour|hourly|per meal|every meal|before bed|pre-?(?:run|wod|race|workout)|post-?(?:run|wod|race|workout)|throughout)\b/i;

// cues that mark a figure as describing food composition
const COMPOSITION = /\b(?:per\s*(?:100\s*(?:g|grams?)|serving|oz|ounce|lb|pound|cup|tablespoon|tbsp)|contains?|gives? you|provides?|has about|is about|roughly|worth of|in a\b|of cooked|content)\b/i;
// physiological LOSS, not intake (sweat rates). Allowed: it argues against dosing.
const LOSS = /\b(?:loss|lose[sn]?|losing|excrete[sd]?|sweat(?:ing|s)? (?:out|rate)|through sweat|runs anywhere)\b/i;

function sentences(text) {
  return text.split(/(?<=[.!?])\s+/);
}

/** Returns array of {sentence, kind} for every mineral+quantity sentence. */
function classify(text) {
  const near = new RegExp(`(?:${QTY})[^.]{0,60}?${MINERAL}|${MINERAL}[^.]{0,60}?(?:${QTY})`, 'i');
  const out = [];
  for (const s of sentences(text)) {
    if (!near.test(s)) continue;
    let kind;
    if (COMPOSITION.test(s) || LOSS.test(s)) kind = 'food-or-loss';
    else if (INTAKE.test(s) || TARGETY.test(s)) kind = 'DOSE';
    else kind = 'ambiguous';
    out.push({ sentence: s.trim().replace(/\s+/g, ' '), kind });
  }
  return out;
}

// symptom-based self-treatment: "if you cramp, it's sodium" / "probably low"
const SYMPTOM_SELF_DX =
  /\b(?:if you(?:'re| are)?\s*(?:cramp|feel|get|getting|experiencing)[^.]{0,80}?(?:it(?:'s| is)\s*(?:almost always|usually|probably)|you(?:'re| are)\s*(?:probably|likely))[^.]{0,40}?(?:sodium|potassium|magnesium|salt|low)|(?:cramp|headache)[^.]{0,50}?(?:means|signals|=)\s*(?:you need|more)\s*(?:salt|sodium|potassium|magnesium))/i;

// blanket instruction to salt everything
const SALT_EVERY_MEAL = /\bsalt (?:every meal|everything|all your food)\b|\b(?:1|one|1-2|two)\s*(?:-|to)?\s*(?:2\s*)?(?:tsp|teaspoons?)\s*per meal\b/i;

// per-hour mineral prescription
const PER_HOUR_MINERAL = new RegExp(`(?:${QTY})[^.]{0,40}?(?:sodium|potassium|magnesium)[^.]{0,40}?\\bper hour\\b|\\bper hour\\b[^.]{0,60}?(?:${QTY})[^.]{0,30}?(?:sodium|potassium|magnesium)`, 'i');

// potassium / salt-substitute self-dosing
const POTASSIUM_SELF_DOSE = new RegExp(`(?:${INTAKE.source})[^.]{0,60}?(?:potassium (?:chloride|supplement|pill)|lite\\s?salt|no\\s?salt|salt substitute)|(?:potassium (?:chloride|supplement)|lite\\s?salt)[^.]{0,40}?(?:${QTY})`, 'i');

function stripHtml(h) {
  return h
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ');
}

// ---------------------------------------------------------------------------
// FIXTURES — the classifier must get all of these right, in both directions
// ---------------------------------------------------------------------------

const MUST_FLAG = [
  ['universal daily target', 'Most carnivore eaters need 4,000 to 6,000 mg of sodium daily.'],
  ['daily target, g form', 'Daily sodium: 5-6g on hard training days, 3-5g otherwise.'],
  ['magnesium bedtime dose', 'Take 300-400mg of magnesium glycinate before bed.'],
  ['per-hour prescription', 'Electrolyte targets per hour in the heat: 500-700mg sodium, 150-300mg potassium.'],
  ['pre-workout loading', 'Pre-WOD electrolyte drink, target 500-1000mg sodium 30 minutes before training.'],
  ['supplement imperative', 'Supplement 300-400 mg magnesium glycinate if you have cramps.'],
];

const MUST_NOT_FLAG = [
  ['per-100g composition', 'Pork loin: about 400 mg per 100 grams of cooked food.'],
  ['per-serving composition', 'Beef has 300-400mg of potassium per 4 oz serving.'],
  ['per-pound composition', 'A pound of ground beef contains roughly 1,200 mg of potassium.'],
  ['ribeye food fact', 'A 10 ounce ribeye gives you roughly 700 to 800 mg of potassium.'],
  ['sweat loss physiology', 'Sodium loss through sweat runs anywhere from roughly 500 to 1500mg per hour depending on heat.'],
  ['banana comparison', 'Banana: about 360 mg, and beef is close behind.'],
];

for (const [label, text] of MUST_FLAG) {
  const got = classify(text);
  check(
    `fixture MUST flag: ${label}`,
    got.length > 0 && got.some((g) => g.kind === 'DOSE'),
    `classified as ${JSON.stringify(got.map((g) => g.kind))} for: ${text}`,
  );
}
for (const [label, text] of MUST_NOT_FLAG) {
  const got = classify(text);
  check(
    `fixture MUST NOT flag: ${label}`,
    !got.some((g) => g.kind === 'DOSE'),
    `wrongly classified as DOSE: ${text}`,
  );
}

// ---------------------------------------------------------------------------
// the repaired pages — asserted against SOURCE and RENDERED output
// ---------------------------------------------------------------------------

const GUARDED = [
  '2026-07-06-carnivore-seasonings-condiments',
  '2026-01-19-crossfit-high-intensity',
  '2026-02-08-endurance-running-marathon',
  '2026-05-15-carnivore-cardio-heat-training',
];

function assertClean(label, text) {
  const doses = classify(text).filter((d) => d.kind === 'DOSE');
  check(`${label}: no electrolyte dosing instruction`, doses.length === 0,
    doses.map((d) => d.sentence.slice(0, 150)).join('\n        '));
  check(`${label}: no symptom-based self-treatment`, !SYMPTOM_SELF_DX.test(text),
    (text.match(SYMPTOM_SELF_DX) || [''])[0].slice(0, 150));
  check(`${label}: no salt-every-meal instruction`, !SALT_EVERY_MEAL.test(text),
    (text.match(SALT_EVERY_MEAL) || [''])[0].slice(0, 150));
  check(`${label}: no per-hour mineral prescription`, !PER_HOUR_MINERAL.test(text),
    (text.match(PER_HOUR_MINERAL) || [''])[0].slice(0, 150));
  check(`${label}: no potassium or salt-substitute self-dosing`, !POTASSIUM_SELF_DOSE.test(text),
    (text.match(POTASSIUM_SELF_DOSE) || [''])[0].slice(0, 150));
}

// SOURCE
const posts = JSON.parse(readFileSync(join(ROOT, 'data/blog_posts.json'), 'utf8')).blog_posts;
for (const slug of GUARDED) {
  const p = posts.find((x) => x.slug === slug);
  check(`source: ${slug} exists in blog_posts.json`, !!p, 'missing');
  if (!p) continue;
  const text = stripHtml(p.content);
  assertClean(`source ${slug}`, text);
  // the repair must ROUTE, not merely delete
  check(`source ${slug}: routes to a clinician`,
    /\b(?:doctor|pharmacist|clinician|dietitian|nephrologist)\b/i.test(text),
    'no clinician routing found after suppression');
  if (LIST) {
    console.log(`\n--- ${slug} retained figures ---`);
    for (const c of classify(text)) console.log(`  [${c.kind}] ${c.sentence.slice(0, 130)}`);
  }
}

// RENDERED
for (const slug of GUARDED) {
  const f = join(ROOT, 'public/blog', `${slug}.html`);
  if (!existsSync(f)) {
    check(`rendered: ${slug}.html exists`, false, 'page not rendered — run generate_blog_pages.py --site cw');
    continue;
  }
  assertClean(`rendered ${slug}`, stripHtml(readFileSync(f, 'utf8')));
}

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
const total = failures.length;
if (total) {
  console.error(`\nelectrolyte-self-dosing: ${total} FAILED\n`);
  for (const f of failures) {
    console.error(`  ✗ ${f.name}`);
    if (f.detail) console.error(`        ${f.detail}`);
  }
  process.exit(1);
}
console.log('electrolyte-self-dosing: all checks passed '
  + `(${MUST_FLAG.length} positive fixtures, ${MUST_NOT_FLAG.length} negative fixtures, `
  + `${GUARDED.length} pages × source + rendered)`);
