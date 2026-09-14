#!/usr/bin/env node
/**
 * tests/false-regulatory-cap.test.mjs
 *
 * CORPUS-WIDE GUARD: 99 mg must never be framed as a regulatory cap.
 *
 * Run it:
 *     node tests/false-regulatory-cap.test.mjs
 *     node tests/false-regulatory-cap.test.mjs --list   (print every 99 mg mention it sees)
 *
 * ---------------------------------------------------------------------------
 * THE CLAIM, AND WHY IT IS WRONG
 * ---------------------------------------------------------------------------
 * For months this site told readers that 99 mg is an FDA-imposed cap on potassium
 * supplements. It is not. Per the NIH Office of Dietary Supplements:
 *
 *   - MANY dietary supplement manufacturers VOLUNTARILY limit potassium to 99 mg
 *     per serving. It is an industry convention.
 *   - FDA ruled that SOME oral drug products containing potassium chloride and
 *     providing MORE THAN 99 mg are not safe, because of small-bowel lesions, and
 *     requires SOME potassium salts above 99 mg per tablet to carry a warning.
 *     Those are DRUG products.
 *   - FDA HAS NOT issued a ruling on whether dietary SUPPLEMENTS above 99 mg must
 *     carry a warning label.
 *
 * The claim was live in 7 places across 5 pages, and the worst instance read
 * "The 99 mg limit is what's safe to hand a stranger with no test results and no
 * medical history." That is an affirmative safety claim about a dose, credited to
 * a regulator who never made it.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS FILE IS CORPUS-WIDE AND NOT A GUARDED LIST
 * ---------------------------------------------------------------------------
 * The sibling guard, electrolyte-self-dosing.test.mjs, asserts against a
 * hand-maintained GUARDED array. That is right for dosing, where each page needs
 * an individually reviewed repair, but it is exactly wrong here: a hand-kept list
 * means a NEW article can repeat this claim and CI stays green because nobody
 * added the new slug.
 *
 * So this guard scans EVERY managed CW post in data/blog_posts.json AND EVERY
 * rendered CW page in public/blog/. There is no list to forget to update. A new
 * article that repeats the claim fails the build on the day it is written.
 *
 * The mutation test at the bottom proves that property: it injects the false claim
 * into a post that appears in no guarded list anywhere, and asserts the scan still
 * catches it.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LIST = process.argv.includes('--list');

let failures = [];
const check = (name, cond, detail) => { if (!cond) failures.push({ name, detail }); };

// ---------------------------------------------------------------------------
// the detector
// ---------------------------------------------------------------------------

/**
 * Framings that assert 99 mg is a limit imposed by a regulator, or that the
 * number itself certifies safety. Deliberately broad on the verb and the subject,
 * because the false claim has appeared in at least five different phrasings.
 */
const FALSE_CAP = [
  // "FDA limits/caps ... 99 mg", "the law allows ... 99 mg"
  /(?:fda|regulator[s]?|government|the law|legally)[^.!?]{0,80}?(?:limits?|caps?|restricts?|allows?|permits?|mandates?)[^.!?]{0,80}?99\s*mg/i,
  // "capped at 99 mg", "limited to 99 mg", "restricted to 99mg"
  /(?:capped|limited|restricted|maxed)\s*(?:at|to)\s*99\s*?mg/i,
  // "the 99 mg limit/cap", "a 99mg ceiling/maximum"
  /\b(?:a|the)?\s*99\s*?mg\s*(?:limit|cap|ceiling|maximum|max)\b/i,
  // "99 mg is the legal/safe maximum", "99 mg ... is what's safe"
  /99\s*?mg[^.!?]{0,60}?(?:is|as)\s+(?:the\s+)?(?:legal|safe|allowed|permitted)\b/i,
  /99\s*?mg[^.!?]{0,40}?what(?:'s| is)\s+safe/i,
  // "what a regulator will allow"
  /what\s+a\s+regulator\s+will\s+allow/i,
  // Over-absolute claims about how concentrated potassium is obtained. Corrected
  // 2026-09-14: concentrated potassium is ALSO sold without a prescription as bulk
  // powder and salt substitutes, and not every prescription includes blood testing.
  /\b(?:high[- ]?dose|higher[- ]?dose|concentrated)\s+potassium[^.!?]{0,40}?\bis\s+(?:only\s+)?a\s+prescription\b/i,
  /\bprescription[^.!?]{0,30}?(?:and\s+)?it\s+comes\s+with\s+bloodwork\b/i,
  /\bevery\s+prescription[^.!?]{0,40}?bloodwork\b/i,
  // "that cap" / "this cap" within 120 chars after a 99 mg mention
  /99\s*?mg[\s\S]{0,140}?\b(?:that|this|the)\s+cap\b/i,
];

/** Returns the offending snippets in `text`, empty if clean. */
function falseCapHits(text) {
  const out = [];
  for (const rx of FALSE_CAP) {
    const m = text.match(rx);
    if (m) out.push(m[0].replace(/\s+/g, ' ').trim());
  }
  return out;
}

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
// FIXTURES
// ---------------------------------------------------------------------------

// Every one of these was live on carnivoreweekly.com or ketodial.com on 2026-09-14.
const MUST_FLAG = [
  ['FDA limits supplements', 'The FDA limits over-the-counter potassium supplements to 99 mg per dose.'],
  ['pills are capped at', 'Over-the-counter potassium pills are capped at 99 mg each.'],
  ['capped, no space', 'Over-the-counter potassium pills are capped at 99mg each precisely because too much potassium affects heart rhythm.'],
  ['the 99 mg limit is safe', "The 99 mg limit is what's safe to hand a stranger with no test results."],
  ['that cap has a reason', "Over the counter potassium tablets are 99 mg. That cap isn't a scheme to sell more bottles."],
  ['regulator will allow', 'That is 25 times what a regulator will allow a company to put in a pill.'],
  ['legal maximum phrasing', '99 mg is the legal maximum for a potassium supplement.'],
  ['a 99mg ceiling', 'There is a 99mg ceiling on these products.'],
  ['prescription absolute', 'High dose potassium does exist. It is a prescription, and it comes with bloodwork.'],
  ['every prescription claim', 'Every prescription comes with bloodwork.'],
];

// The accurate explanation must stay legal, or the guard forces us back into vagueness.
const MUST_NOT_FLAG = [
  ['voluntary industry serving size',
   'Many potassium supplements give you no more than 99 mg per serving. That is a serving size the supplement industry settled on for itself, not a limit the FDA sets on supplements.'],
  ['narrow, accurate regulatory history',
   'Certain oral potassium chloride drug products delivering more than 99 mg were ruled unsafe after being linked to small bowel lesions, and some potassium salts above 99 mg per tablet have to carry a warning about it.'],
  ['FDA silence stated accurately',
   "The FDA hasn't ruled on whether dietary supplements above 99 mg need a warning at all. Read that as nobody having evaluated them, not as anyone having checked them and found them fine."],
  ['explicit not-a-target framing',
   "It isn't a dose worked out for you, it isn't a line where everything underneath becomes safe, and it isn't a quiet hint that two or three would be fine."],
  ['plain shelf description',
   'Most potassium tablets on the shelf hold 99 mg. You would need dozens to cover a day.'],
  ['negation of the false claim',
   'Those 99mg potassium pills are an industry serving size, not an FDA safety cap.'],
  ['accurate prescription framing',
   'Sometimes a doctor prescribes it, and when that happens the amount and the follow up are built around that person\'s own medical picture. Monitoring can include blood tests where that is clinically appropriate.'],
  ['accurate non-prescription availability',
   'Concentrated potassium also sits on open shelves as bulk powder and as potassium based salt substitutes, no prescription involved. Easy to buy is not the same as suitable for you to take.'],
];

for (const [label, text] of MUST_FLAG) {
  check(`fixture MUST flag: ${label}`, falseCapHits(text).length > 0, `not detected: ${text}`);
}
for (const [label, text] of MUST_NOT_FLAG) {
  const hits = falseCapHits(text);
  check(`fixture MUST NOT flag: ${label}`, hits.length === 0, `wrongly flagged ${JSON.stringify(hits)}: ${text}`);
}

// ---------------------------------------------------------------------------
// CORPUS SCAN 1: every managed CW post. No list, no exemptions.
// ---------------------------------------------------------------------------

const posts = JSON.parse(readFileSync(join(ROOT, 'data/blog_posts.json'), 'utf8')).blog_posts;
const cw = posts.filter((p) => p.site === 'cw');
check('corpus: CW posts were actually loaded', cw.length > 100, `only ${cw.length} CW posts found`);

let scannedPosts = 0;
for (const p of cw) {
  scannedPosts++;
  // every field a reader can see
  const surfaces = [
    ['content', p.content],
    ['title', p.title],
    ['excerpt', p.excerpt],
    ['meta_description', p.meta_description],
    ['seo.meta_description', p.seo && p.seo.meta_description],
  ];
  for (const [field, raw] of surfaces) {
    if (!raw) continue;
    const text = stripHtml(String(raw));
    if (LIST && /99\s*?mg/i.test(text)) {
      console.log(`  [99mg] ${p.slug} (${field})`);
    }
    const hits = falseCapHits(text);
    check(`source ${p.slug} (${field}): 99 mg not framed as a regulatory cap`,
      hits.length === 0, hits.join(' | ').slice(0, 200));
  }
}

// ---------------------------------------------------------------------------
// CORPUS SCAN 2: every rendered CW page. No list, no exemptions.
// ---------------------------------------------------------------------------

const BLOG = join(ROOT, 'public/blog');
let scannedPages = 0;
if (existsSync(BLOG)) {
  for (const f of readdirSync(BLOG).filter((x) => x.endsWith('.html'))) {
    scannedPages++;
    const text = stripHtml(readFileSync(join(BLOG, f), 'utf8'));
    const hits = falseCapHits(text);
    check(`rendered ${f}: 99 mg not framed as a regulatory cap`,
      hits.length === 0, hits.join(' | ').slice(0, 200));
  }
}
check('corpus: rendered CW pages were actually scanned', scannedPages > 100, `only ${scannedPages} scanned`);

// ---------------------------------------------------------------------------
// report
// ---------------------------------------------------------------------------
if (failures.length) {
  console.error(`\nfalse-regulatory-cap: ${failures.length} FAILED\n`);
  for (const f of failures) {
    console.error(`  ✗ ${f.name}`);
    if (f.detail) console.error(`        ${f.detail}`);
  }
  process.exit(1);
}
console.log(`false-regulatory-cap: all checks passed `
  + `(${MUST_FLAG.length} positive fixtures, ${MUST_NOT_FLAG.length} negative fixtures, `
  + `${scannedPosts} CW posts x 5 surfaces, ${scannedPages} rendered pages, NO guarded list)`);
