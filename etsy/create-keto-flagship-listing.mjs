#!/usr/bin/env node
/**
 * Create the "30-Day Keto Meal Plan & Food Guide" flagship listing.
 *
 * Sequence, deliberately in this order:
 *   1. create as DRAFT   (invisible to buyers)
 *   2. upload 8 images with explicit rank AND alt_text
 *   3. upload the video
 *   4. attach the 2 PDFs
 *   5. read the listing back and assert every field
 *   6. only then PATCH state=active
 *
 * Drafts are free to fix and invisible while broken. Activating first and
 * uploading after would put a half-built listing in front of buyers.
 *
 * Image rank matters: Etsy ignores order unless rank is passed on upload, and
 * it clears alt_text if you do not resend it (decisions.md, 2026-08-10).
 * Rank 1 is product-first per ISSUE-064; the lifestyle composites are 7 and 8.
 *
 * Usage:
 *   node etsy/create-keto-flagship-listing.mjs --dry-run
 *   node etsy/create-keto-flagship-listing.mjs
 */

import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const DRY = process.argv.includes('--dry-run');
const SHOP = 63916912;
const ROOT = path.resolve(import.meta.dirname, '..');
const IMG_DIR = path.join(ROOT, 'etsy/products/listing-images/keto-flagship');
const PDF_DIR = path.join(ROOT, 'etsy/products/pdfs');

const content = JSON.parse(
  readFileSync(path.join(ROOT, 'etsy/products/content/keto-flagship-content.json'), 'utf8')
);
const L = content.listing;

const PRICE = 12.99;              // Brew, 2026-09-15, in session
const TAXONOMY = 354;             // Paper & Party Supplies > Paper > Calendars & Planners
const QUANTITY = 999;

const IMAGES = [
  ['01-hero.jpg', '30-Day Keto Meal Plan and Food Guide, 23 printable pages, US Letter and A4'],
  ['02-eat-limit-avoid.jpg', 'Keto food list page showing foods to eat, limit and avoid'],
  ['03-week-one.jpg', 'Week one of the 30 day keto meal plan, breakfast lunch and dinner for seven days'],
  ['04-grocery-list.jpg', 'Printable keto grocery list matching week one of the meal plan'],
  ['05-all-pages.jpg', 'All 23 pages of the keto meal plan and food guide'],
  ['06-whats-inside.jpg', 'What is inside: 30 days of meals, four grocery lists, eat limit avoid chart, tracker'],
  ['07-on-the-fridge.jpg', 'The printed keto food list held by a magnet on a fridge door'],
  ['08-in-the-kitchen.jpg', 'The printed keto meal plan on a wooden clipboard on a kitchen worktop'],
];
const VIDEO = 'video-keto-flagship.mp4';
const PDFS = ['keto-30day-flagship-letter.pdf', 'keto-30day-flagship-a4.pdf'];

const fail = (m) => { console.error(`\n❌ ${m}`); process.exit(1); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- preflight: never call Etsy with a payload we have not checked ----------
console.log('Preflight');
if (L.tags.length !== 13) fail(`expected 13 tags, got ${L.tags.length}`);
if (L.tags.some((t) => t.length > 20)) fail('a tag exceeds 20 chars');
if (L.title.length > 140) fail(`title too long: ${L.title.length}`);
if ((L.title.match(/\|/g) || []).length > 3) fail('title has too many pipe segments');
if (/instant download/i.test(L.title)) fail('title contains "Instant Download"');
// Etsy rejects a title carrying more than one of & % :  (400
// too_many_invalid_characters). Learned the hard way on 2026-09-15.
for (const ch of ['&', '%', ':']) {
  const n = (L.title.match(new RegExp(`\\${ch}`, 'g')) || []).length;
  if (n > 1) fail(`title has ${n} "${ch}" characters; Etsy allows at most one`);
}
if (/\d{3,4}\s*(k?cal|calorie)/i.test(L.title + L.description)) fail('calorie number in listing copy');

for (const [f] of IMAGES) {
  const p = path.join(IMG_DIR, f);
  if (!existsSync(p)) fail(`missing image ${f}`);
  if (statSync(p).size > 20e6) fail(`${f} over 20MB`);
}
const vpath = path.join(IMG_DIR, VIDEO);
if (!existsSync(vpath)) fail(`missing video ${VIDEO}`);
if (statSync(vpath).size > 100e6) fail('video over Etsy 100MB limit');
for (const f of PDFS) {
  const p = path.join(PDF_DIR, f);
  if (!existsSync(p)) fail(`missing pdf ${f}`);
  if (statSync(p).size > 20e6) fail(`${f} over 20MB`);
}
console.log(`  title    ${L.title.length} chars: ${L.title}`);
console.log(`  price    CA$${PRICE}   taxonomy ${TAXONOMY}   qty ${QUANTITY}`);
console.log(`  tags     ${L.tags.length}: ${L.tags.join(', ')}`);
console.log(`  materials ${L.materials.length}: ${L.materials.join(', ')}`);
console.log(`  desc     ${L.description.length} chars`);
console.log(`  assets   ${IMAGES.length} images, 1 video, ${PDFS.length} pdfs`);
console.log('  ✅ preflight passed');

if (DRY) {
  console.log('\nDRY RUN: nothing sent to Etsy.');
  process.exit(0);
}

// ---------- auth ----------
console.log('\nAuthenticating...');
const token = await getEtsyToken();
const headers = {
  'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`,
  Authorization: `Bearer ${token}`,
};
console.log('  ✅ authenticated');

// ---------- 1. create draft ----------
console.log('\n1. Creating DRAFT listing...');
const createRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    title: L.title,
    description: L.description,
    quantity: String(QUANTITY),
    price: String(PRICE),
    who_made: 'i_did',
    when_made: '2020_2026',
    taxonomy_id: String(TAXONOMY),
    type: 'download',
    is_digital: 'true',
    tags: L.tags.join(','),
    materials: L.materials.join(','),
  }),
});
const created = await createRes.json();
if (!createRes.ok) fail(`create failed ${createRes.status}: ${JSON.stringify(created).slice(0, 400)}`);
const ID = created.listing_id;
console.log(`  ✅ draft ${ID} (state: ${created.state})`);

// ---------- 2. images ----------
console.log('\n2. Uploading images...');
for (let i = 0; i < IMAGES.length; i++) {
  const [file, alt] = IMAGES[i];
  const form = new FormData();
  form.append('image', new Blob([readFileSync(path.join(IMG_DIR, file))], { type: 'image/jpeg' }), file);
  form.append('rank', String(i + 1));
  form.append('alt_text', alt);
  const r = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${ID}/images`,
    { method: 'POST', headers, body: form }
  );
  const d = await r.json();
  console.log(r.ok ? `  ✅ rank ${i + 1}  ${file}` : `  ❌ ${file}: ${JSON.stringify(d).slice(0, 220)}`);
  if (!r.ok) fail('image upload failed, listing left as draft');
  await sleep(600);
}

// ---------- 3. video ----------
console.log('\n3. Uploading video...');
{
  const form = new FormData();
  form.append('video', new Blob([readFileSync(vpath)], { type: 'video/mp4' }), VIDEO);
  form.append('name', VIDEO);
  const r = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${ID}/videos`,
    { method: 'POST', headers, body: form }
  );
  const d = await r.json();
  console.log(r.ok ? `  ✅ ${VIDEO}` : `  ⚠️  video failed: ${JSON.stringify(d).slice(0, 260)}`);
}

// ---------- 4. digital files ----------
console.log('\n4. Attaching digital files...');
for (const f of PDFS) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(path.join(PDF_DIR, f))], { type: 'application/pdf' }), f);
  form.append('name', f);
  const r = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${ID}/files`,
    { method: 'POST', headers, body: form }
  );
  const d = await r.json();
  console.log(r.ok ? `  ✅ ${f}` : `  ❌ ${f}: ${JSON.stringify(d).slice(0, 220)}`);
  if (!r.ok) fail('file attach failed, listing left as draft');
  await sleep(600);
}

// ---------- 5. verify before activating ----------
console.log('\n5. Verifying the draft before it goes public...');
const vres = await fetch(
  `https://openapi.etsy.com/v3/application/listings/${ID}?includes=Images,Videos`,
  { headers }
);
const v = await vres.json();
const fres = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${ID}/files`,
  { headers }
);
const files = await fres.json();

const checks = [
  ['title', v.title === L.title],
  ['price', Number(v.price?.amount) / Number(v.price?.divisor) === PRICE],
  ['taxonomy', v.taxonomy_id === TAXONOMY],
  ['tags', (v.tags || []).length === 13],
  ['materials', (v.materials || []).length === L.materials.length],
  ['images', (v.images || []).length === IMAGES.length],
  ['files', (files.results || []).length === PDFS.length],
];
let allOk = true;
for (const [name, ok] of checks) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}`);
  if (!ok) allOk = false;
}
console.log(`  ${(v.videos || []).length ? '✅' : 'ℹ️ '} video: ${(v.videos || []).length}`);
if (!allOk) fail(`verification failed. Listing ${ID} left as a DRAFT, invisible to buyers.`);

// ---------- 6. activate ----------
console.log('\n6. Activating...');
const act = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${ID}`,
  {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ state: 'active' }),
  }
);
const a = await act.json();
console.log(act.ok ? `  ✅ state: ${a.state}` : `  ❌ activate failed: ${JSON.stringify(a).slice(0, 300)}`);

console.log(`\n=== DONE ===\nhttps://www.etsy.com/listing/${ID}\nlisting_id: ${ID}`);
