#!/usr/bin/env node
/**
 * Deck card bdc5c1e1 (answered by Brew 2026-09-19 05:38 PDT, "ship it Saturday"):
 * ship the Keto Starter Kit rewrite on listing 4532542805.
 *
 * Purpose-built and single-use on purpose: update-listings.mjs rewrites every
 * field on every listing, which is not what was approved. This script touches
 * ONE listing and exactly FOUR fields, all taken verbatim from
 * reports/starter-kit-fix-plan-2026-09-17.md sections 2, 3, 4 and 5:
 *
 *   title       -> plan section 2
 *   tags (13)   -> plan section 3
 *   description -> first three sentences replaced with plan section 4; the rest
 *                  of the existing text is kept byte for byte, except that the
 *                  literal &#39; sequences become real apostrophes
 *   materials   -> plan section 5
 *
 * It never sends any image field (this shop breaks on that), and never touches
 * price, state, taxonomy, attributes, digital files or the listing clock. It
 * does NOT renew: renewal costs money and money needs Brew's word.
 *
 * Run from etsy/:
 *   node starter-kit-rewrite-2026-09-20.mjs --dry-run   # compute + print, no write
 *   node starter-kit-rewrite-2026-09-20.mjs             # write, then re-read to verify
 */
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP_ID = 63916912;
const LISTING_ID = 4532542805;
const DRY = process.argv.includes('--dry-run');

// --- plan section 2 -------------------------------------------------------
const NEW_TITLE =
  'Keto Starter Kit for Beginners | 30-Day Meal Plan, Food List, Grocery & Snack Lists, Net Carb Cheat Sheet (Printable PDF)';

// --- plan section 3 -------------------------------------------------------
const NEW_TAGS = [
  'keto starter kit', 'keto snacks', 'keto snack ideas', 'what to eat on keto',
  '30 day keto plan', 'easy keto meal plan', 'keto for beginners', 'carb cheat sheet',
  'keto shopping list', 'eat limit avoid', 'keto flu checklist', 'beginner keto bundle',
  'keto binder',
];

// --- plan section 4 -------------------------------------------------------
const NEW_OPENING =
  'The Keto Starter Kit is a printable keto bundle for beginners: a keto food list, a 30-day keto meal plan, a matching grocery list, a keto snack list and a net carb cheat sheet in one download. It shows what to eat, what to limit and what to avoid on keto, then gives you the shopping list that goes with it. Print it once, put it on the fridge, and reprint the blank weekly planner for as long as you need it.';

// The exact three sentences being replaced. Asserted, not assumed: if the live
// text has drifted, this script refuses rather than guessing where to cut.
const OLD_OPENING =
  'Tired of screenshotting food lists and juggling three different apps just to figure out dinner? This is your whole keto system on paper. Print it, stick it on the fridge, put it in a binder, and stop guessing.';

// --- plan section 5 -------------------------------------------------------
const NEW_MATERIALS = [
  'keto food list', '30 day keto meal plan', 'keto grocery list', 'keto snack list',
  'net carb cheat sheet', 'keto flu checklist', 'blank weekly meal planner',
  'US Letter printable', 'A4 printable', 'digital PDF download',
];

const token = await getEtsyToken();
const headers = {
  'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  Authorization: 'Bearer ' + token,
  'Content-Type': 'application/json',
};

async function getListing() {
  // includes=Images so the image-count assertion is real; a bare GET omits the array entirely.
  const res = await fetch(`https://openapi.etsy.com/v3/application/listings/${LISTING_ID}?includes=Images`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET -> ${res.status} ${JSON.stringify(data)}`);
  if (String(data.shop_id) !== String(SHOP_ID)) throw new Error(`wrong shop ${data.shop_id}`);
  return data;
}
async function getFileCount() {
  const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${LISTING_ID}/files`, { headers });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET files -> ${res.status}`);
  return d.count ?? (d.results || []).length;
}

const before = await getListing();
const beforeFiles = await getFileCount();
const beforeDesc = before.description || '';

console.log('BEFORE title    : %j', before.title);
console.log('BEFORE tags (%d): %j', (before.tags || []).length, before.tags);
console.log('BEFORE materials: %j', before.materials);
console.log('BEFORE price    : %j  state: %s  taxonomy: %s', before.price, before.state, before.taxonomy_id);
console.log('BEFORE images: %d  files: %d  desc len: %d  &#39; count: %d',
  (before.images || []).length, beforeFiles, beforeDesc.length, (beforeDesc.match(/&#39;/g) || []).length);

// --- build the new description -------------------------------------------
if (!beforeDesc.startsWith(OLD_OPENING)) {
  console.error('REFUSING: the live description does not start with the three sentences the plan expects.');
  console.error('Live first 240 chars: %j', beforeDesc.slice(0, 240));
  process.exit(1);
}
const remainder = beforeDesc.slice(OLD_OPENING.length);        // keeps the "\n\n" and everything after
const newDesc = (NEW_OPENING + remainder).split('&#39;').join("'");

// Assertions on the computed text, before anything is sent.
const expectedRemainder = remainder.split('&#39;').join("'");
if (!newDesc.startsWith(NEW_OPENING)) throw new Error('computed description does not open with the plan block');
if (!newDesc.endsWith(expectedRemainder)) throw new Error('computed description lost the kept remainder');
if (newDesc.includes('&#39;')) throw new Error('computed description still contains &#39;');
if (newDesc.length !== NEW_OPENING.length + expectedRemainder.length) throw new Error('length math failed');

console.log('\nCOMPUTED new title len: %d (Etsy max 140)', NEW_TITLE.length);
console.log('COMPUTED new tags: %d, longest %d chars', NEW_TAGS.length, Math.max(...NEW_TAGS.map((t) => t.length)));
console.log('COMPUTED new materials: %d, longest %d chars', NEW_MATERIALS.length, Math.max(...NEW_MATERIALS.map((m) => m.length)));
console.log('COMPUTED new desc len: %d (was %d), &#39; count: %d', newDesc.length, beforeDesc.length, (newDesc.match(/&#39;/g) || []).length);
console.log('COMPUTED desc first 200: %j', newDesc.slice(0, 200));
if (NEW_TAGS.length !== 13 || new Set(NEW_TAGS).size !== 13) throw new Error('tags must be 13 distinct');
if (NEW_TAGS.some((t) => t.length > 20)) throw new Error('a tag exceeds 20 chars');
if (NEW_TITLE.length > 140) throw new Error('title too long');

// ONLY these four keys. No image field, ever: this shop breaks on that.
const payload = { title: NEW_TITLE, tags: NEW_TAGS, description: newDesc, materials: NEW_MATERIALS };
console.log('\nPAYLOAD KEYS: %j', Object.keys(payload));

if (DRY) {
  console.log('\nDRY RUN. Nothing sent to Etsy.');
  process.exit(0);
}

const res = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${LISTING_ID}`,
  { method: 'PATCH', headers, body: JSON.stringify(payload) },
);
if (!res.ok) {
  console.error('PATCH FAILED (%d): %s', res.status, await res.text());
  process.exit(1);
}
console.log('\nPATCH ok (%d)', res.status);

// --- fresh read-back verification ----------------------------------------
const after = await getListing();
const afterFiles = await getFileCount();
const afterDesc = after.description || '';
const checks = [
  ['title matches plan byte for byte', after.title === NEW_TITLE],
  ['exactly 13 tags', (after.tags || []).length === 13],
  ['tags match plan in order', JSON.stringify(after.tags) === JSON.stringify(NEW_TAGS)],
  ['description opens with plan block', afterDesc.startsWith(NEW_OPENING)],
  ['description contains zero &#39;', !afterDesc.includes('&#39;')],
  ['description matches computed text exactly', afterDesc === newDesc],
  ['materials match plan', JSON.stringify(after.materials) === JSON.stringify(NEW_MATERIALS)],
  ['price still CA$21.99', JSON.stringify(after.price) === JSON.stringify(before.price)],
  ['image count unchanged', (after.images || []).length === (before.images || []).length],
  ['digital file count unchanged', afterFiles === beforeFiles],
  ['state unchanged', after.state === before.state],
  ['taxonomy unchanged', after.taxonomy_id === before.taxonomy_id],
];
console.log('\n--- VERIFICATION (fresh GET) ---');
for (const [name, ok] of checks) console.log('%s %s', ok ? 'PASS' : 'FAIL', name);
console.log('\nAFTER title    : %j', after.title);
console.log('AFTER tags (%d): %j', (after.tags || []).length, after.tags);
console.log('AFTER materials: %j', after.materials);
console.log('AFTER price: %j  images: %d  files: %d  state: %s', after.price, (after.images || []).length, afterFiles, after.state);
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);
