#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// COMPLETED — APPLIED TO THE LIVE LISTING ON 2026-08-22. DO NOT RE-RUN.
//
// Kept in the repo as the record of what was sent and why, not as a live tool.
// This is a WRITE script: with --apply it sends a real PATCH to openapi.etsy.com
// and it counts against the 3-listing/7-day edit cap. It is deliberately NOT on
// the read-only allowlist in scripts/hooks/etsy-write-first-guard.sh, and must
// never be added to it.
//
// It now refuses to do anything at all without --i-know-this-already-ran. The
// live-title gate below would also refuse (the title it expects was replaced by
// this very run), but a stale gate is not a safety mechanism — this is.
//
// To change this listing's title or tags again, write a NEW dated script, log
// the Live Changes Log row FIRST, and run `node etsy/edit-cap.mjs 4495089980`.
// ═══════════════════════════════════════════════════════════════════════════
if (!process.argv.includes('--i-know-this-already-ran')) {
  console.error('REFUSING: this keyword pass was already applied on 2026-08-22 and is kept only as a record.');
  console.error('Write a new dated script instead. See the header of this file.');
  process.exit(1);
}

// Mega Bundle keyword pass — listing 4495089980 (Low Carb Keto Carnivore Diet Mega Bundle).
// Requested by Brew live 2026-08-22 14:20 PDT: "fix the mega bundle title and tags with
// the listing standards". Applies .claude/skills/etsy-listing-standards.
//
// DRY RUN BY DEFAULT. Sends nothing until you pass --apply.
//
// SAFETY: modelled on starter-kit-keyword-apply.mjs. Sends EXACTLY TWO FIELDS,
// `title` and `tags`. Never image_ids, never /images, never /files, never price,
// description, materials, taxonomy or state. FIELDS is the whole payload and the
// guard asserts it before any request leaves.
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOP_ID = 63916912;
const LISTING_ID = 4495089980;
const DO_NOT_TOUCH = [4464217679, 4464217699, 4495049647, 4495055944];

// Etsy's own Search Visibility product name, applied earlier today and left VERBATIM.
// Only addition: the one clarifying segment Etsy's format calls for
// (`<Product Name> | <one clarifying phrase> (PDF)`), which the title was missing.
// Counts verified against etsy/products/pdfs/mega-bundle-9-pdfs.zip on 2026-08-22:
// 3 cheatsheet-*.pdf, 4 howto-*.pdf, 2 *-30-day-tracker.pdf = 9 files exactly.
const NEW_TITLE =
  'Low Carb Keto Carnivore Diet Mega Bundle | 3 Cheat Sheets, 4 Guides, 2 Trackers (9 PDFs)';

// Old tags broke the standard: 6 tags on the "diet" root (limit ~4), "meal planner pdf"
// described a product not in the zip, and "diet mega bundle" targets shop-internal
// language no buyer searches. New set: all 13 filled, multi-word, mixed types
// (descriptive / who-for / solution / contents / diet-specific), every claim in the zip.
const NEW_TAGS = [
  'keto starter kit',
  'carnivore diet kit',
  'low carb cheat sheet',
  'lion diet guide',
  '30 day tracker',
  'beginner diet set',
  'fridge wall chart',
  'gift for dieter',
  'high protein guide',
  'food list bundle',
  'zero carb printable',
  'healthy eating kit',
  'weight loss tracker',
];

const FIELDS = ['title', 'tags'];
const APPLY = process.argv.includes('--apply');

// ── guards ───────────────────────────────────────────────────────────────
if (DO_NOT_TOUCH.includes(LISTING_ID)) throw new Error(`${LISTING_ID} is in the image A/B test. Refusing.`);
if (NEW_TITLE.length > 140) throw new Error(`title is ${NEW_TITLE.length} chars, max 140`);
if (NEW_TAGS.length !== 13) throw new Error(`${NEW_TAGS.length} tags, want all 13`);
for (const t of NEW_TAGS) {
  if (t.length > 20) throw new Error(`tag "${t}" is ${t.length} chars, max 20`);
  if (!/^[a-z0-9 ]+$/.test(t)) throw new Error(`tag "${t}" has odd characters`);
}
if (new Set(NEW_TAGS).size !== NEW_TAGS.length) throw new Error('duplicate tag');
const roots = {};
for (const t of NEW_TAGS) for (const w of new Set(t.split(' '))) roots[w] = (roots[w] || 0) + 1;
const over = Object.entries(roots).filter(([, n]) => n > 4);
if (over.length) throw new Error(`root word over the ~4 cap: ${JSON.stringify(over)}`);
const FORBIDDEN = ['image_ids', 'images', 'image', 'listing_image_id', 'price', 'description', 'materials', 'taxonomy_id', 'state'];
for (const f of FIELDS) if (FORBIDDEN.includes(f)) throw new Error(`field "${f}" is not allowed. Refusing.`);

const token = await getEtsyToken();
const headers = etsyHeaders(token);

// ── read live state immediately before the write (near-miss rule 2026-08-10) ──
const res = await fetch(`https://openapi.etsy.com/v3/application/listings/${LISTING_ID}?includes=Images`, { headers });
const before = await res.json();
if (!res.ok) throw new Error(`read failed ${res.status}: ${JSON.stringify(before)}`);
if (String(before.shop_id) !== String(SHOP_ID)) throw new Error(`listing not in shop ${SHOP_ID}. Refusing.`);

// gate: the title must still be the one today's batch left, or something moved under us
const EXPECTED_TITLE = 'Low Carb Keto Carnivore Diet Mega Bundle (9 PDFs)';
if (before.title !== EXPECTED_TITLE) {
  throw new Error(`live title moved. expected ${JSON.stringify(EXPECTED_TITLE)}, got ${JSON.stringify(before.title)}. Refusing.`);
}
const livePrice = Number(before.price.amount) / before.price.divisor;
if (livePrice !== 19.99) throw new Error(`live price is ${livePrice}, expected 19.99. Refusing.`);

console.log(`listing ${LISTING_ID} (${before.state}) — ${(before.images || []).length} images, $${livePrice}, taxonomy ${before.taxonomy_id}`);
console.log(`\nTITLE (${before.title.length} -> ${NEW_TITLE.length} chars)\n  before: ${before.title}\n  after : ${NEW_TITLE}`);
const kept = NEW_TAGS.filter((t) => (before.tags || []).includes(t));
const added = NEW_TAGS.filter((t) => !(before.tags || []).includes(t));
const dropped = (before.tags || []).filter((t) => !NEW_TAGS.includes(t));
console.log('\nTAGS');
console.log(`  kept    (${kept.length}): ${kept.join(', ')}`);
console.log(`  dropped (${dropped.length}): ${dropped.join(', ')}`);
console.log(`  added   (${added.length}): ${added.join(', ')}`);
console.log(`\nfields sent: ${FIELDS.join(', ')} — no images, no price, no description, no taxonomy`);

if (!APPLY) {
  console.log('\nDRY RUN. Nothing was sent. Re-run with --apply to write.');
  process.exit(0);
}

const revertPath = path.resolve(__dirname, '..', 'reports', `mega-bundle-${LISTING_ID}-revert-2026-08-22.json`);
writeFileSync(revertPath, JSON.stringify({
  listing_id: LISTING_ID, title: before.title, tags: before.tags, materials: before.materials,
  price: before.price, taxonomy_id: before.taxonomy_id, description: before.description,
  images: (before.images || []).map((i) => ({ id: i.listing_image_id, rank: i.rank })),
}, null, 2));
console.log(`\nrevert record saved: ${revertPath}`);

const body = new URLSearchParams();
body.append('title', NEW_TITLE);
body.append('tags', NEW_TAGS.join(','));
for (const k of body.keys()) if (!FIELDS.includes(k)) throw new Error(`payload carries unapproved field "${k}"`);

const patch = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${LISTING_ID}`, {
  method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }, body,
});
const out = await patch.json().catch(() => ({}));
console.log(patch.ok ? 'title + tags updated' : `PATCH FAILED ${patch.status}: ${JSON.stringify(out)}`);
if (!patch.ok) process.exit(1);

const after = await (await fetch(`https://openapi.etsy.com/v3/application/listings/${LISTING_ID}?includes=Images`, { headers })).json();
const b = (before.images || []).length, a = (after.images || []).length;
console.log(a === b ? `images intact: ${a}` : `IMAGE COUNT CHANGED ${b} -> ${a}. Investigate now.`);
console.log(`price intact: ${Number(after.price.amount) / after.price.divisor}`);
console.log(`taxonomy intact: ${after.taxonomy_id}`);
console.log(`title now : ${after.title}`);
console.log(`tags now  : ${after.tags.join(', ')}`);
