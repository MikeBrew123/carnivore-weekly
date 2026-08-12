#!/usr/bin/env node
// Starter Kit keyword pass — listing 4532542805 (Keto for Beginners Starter Kit).
// Approved by Brew (voice, 2026-08-11) as KEEP + keyword/tag revision. Written
// 2026-08-12. Rationale and the full before/after table live in the vault at
// 04-Systems/Projects/Carnivore-Weekly/reports/starter-kit-keyword-pass-2026-08-12.md
//
// DRY RUN BY DEFAULT. It sends nothing until you pass --apply.
//
// SAFETY, and the reason it is written this narrowly: on 2026-08-10 an image
// reorder on this shop wiped 7 of 8 images on two listings for ten minutes.
// updateListing has already destroyed data here once. So this script sends
// EXACTLY TWO FIELDS — `title` and `tags` — and nothing else. It never sends
// image_ids, never touches /images, never touches /files, never touches price,
// description, materials or state. FIELDS below is the whole payload; the
// guard asserts it before any request leaves.
//
//   cd etsy && node starter-kit-keyword-apply.mjs            # dry run, shows the diff
//   cd etsy && node starter-kit-keyword-apply.mjs --apply    # writes title + tags only
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOP_ID = 63916912;
const LISTING_ID = 4532542805;

// Listings inside the live image A/B test (first read 2026-08-17). If the id
// above ever matches one of these, something is badly wrong — refuse to run.
const DO_NOT_TOUCH = [4464217679, 4464217699, 4495049647, 4495055944];

const NEW_TITLE =
  'Keto Starter Kit for Beginners | 30 Day Keto Meal Plan, Food List & Grocery List | What to Eat on Keto | 21+ Page Printable PDF Bundle';

const NEW_TAGS = [
  'keto starter kit',
  '30 day keto plan',
  'keto for beginners',
  'keto starter guide',
  'beginner keto plan',
  'what to eat on keto',
  'new to keto guide',
  'easy keto meal plan',
  'printable keto plan',
  'keto shopping list',
  'keto pantry list',
  'keto challenge',
  'low carb starter kit',
];

// The complete set of fields this script is allowed to send. Do not extend it.
const FIELDS = ['title', 'tags'];

const APPLY = process.argv.includes('--apply');

// ── guards ───────────────────────────────────────────────────────────────
if (DO_NOT_TOUCH.includes(LISTING_ID)) {
  throw new Error(`${LISTING_ID} is in the image A/B test. Refusing.`);
}
if (NEW_TITLE.length > 140) throw new Error(`title is ${NEW_TITLE.length} chars, max 140`);
if (NEW_TAGS.length > 13) throw new Error(`${NEW_TAGS.length} tags, max 13`);
for (const t of NEW_TAGS) {
  if (t.length > 20) throw new Error(`tag "${t}" is ${t.length} chars, max 20`);
}
if (new Set(NEW_TAGS).size !== NEW_TAGS.length) throw new Error('duplicate tag');
const FORBIDDEN = ['image_ids', 'images', 'image', 'listing_image_id'];
for (const f of FIELDS) {
  if (FORBIDDEN.includes(f)) throw new Error(`field "${f}" touches images. Refusing.`);
}

const token = await getEtsyToken();
const headers = etsyHeaders(token);

// ── read the before-state and save it as the revert record ───────────────
const res = await fetch(
  `https://openapi.etsy.com/v3/application/listings/${LISTING_ID}?includes=Images`,
  { headers },
);
const before = await res.json();
if (!res.ok) throw new Error(`read failed ${res.status}: ${JSON.stringify(before)}`);
if (String(before.shop_id) !== String(SHOP_ID)) {
  throw new Error(`listing ${LISTING_ID} is not in shop ${SHOP_ID}. Refusing.`);
}

console.log(`listing ${LISTING_ID} (${before.state}) — ${(before.images || []).length} images`);
console.log(`\nTITLE\n  before: ${before.title}\n  after : ${NEW_TITLE}`);
console.log('\nTAGS');
const kept = NEW_TAGS.filter((t) => (before.tags || []).includes(t));
const added = NEW_TAGS.filter((t) => !(before.tags || []).includes(t));
const dropped = (before.tags || []).filter((t) => !NEW_TAGS.includes(t));
console.log(`  kept    (${kept.length}): ${kept.join(', ')}`);
console.log(`  dropped (${dropped.length}): ${dropped.join(', ')}`);
console.log(`  added   (${added.length}): ${added.join(', ')}`);
console.log(`\nfields sent: ${FIELDS.join(', ')} — no image fields, no price, no description`);

if (!APPLY) {
  console.log('\nDRY RUN. Nothing was sent. Re-run with --apply to write.');
  process.exit(0);
}

const revertPath = path.resolve(
  __dirname,
  '..',
  'reports',
  `starter-kit-${LISTING_ID}-revert-${new Date().toISOString().slice(0, 10)}.json`,
);
writeFileSync(
  revertPath,
  JSON.stringify(
    {
      saved_at: new Date().toISOString(),
      listing_id: LISTING_ID,
      title: before.title,
      tags: before.tags,
      materials: before.materials,
      price: before.price,
      taxonomy_id: before.taxonomy_id,
      description: before.description,
      images: (before.images || []).map((i) => ({ id: i.listing_image_id, rank: i.rank })),
    },
    null,
    2,
  ),
);
console.log(`\nrevert record saved: ${revertPath}`);

const body = new URLSearchParams();
body.append('title', NEW_TITLE);
body.append('tags', NEW_TAGS.join(','));
for (const k of body.keys()) {
  if (!FIELDS.includes(k)) throw new Error(`payload carries unapproved field "${k}"`);
}

const patch = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${LISTING_ID}`,
  {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  },
);
const out = await patch.json().catch(() => ({}));
console.log(patch.ok ? 'title + tags updated' : `PATCH FAILED ${patch.status}: ${JSON.stringify(out)}`);

// verify the images survived, because that is the failure mode this shop has seen
const after = await (
  await fetch(`https://openapi.etsy.com/v3/application/listings/${LISTING_ID}?includes=Images`, {
    headers,
  })
).json();
const b = (before.images || []).length;
const a = (after.images || []).length;
console.log(a === b ? `images intact: ${a}` : `IMAGE COUNT CHANGED ${b} -> ${a}. Investigate now.`);
