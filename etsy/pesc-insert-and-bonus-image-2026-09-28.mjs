#!/usr/bin/env node
// Pescatarian listings, 2026-09-28. Brew: "go ahead and make the Etsy fixes - we should be giving a
// Pescatarian insert for these listings".
//
// 1. On 4464217699, 4513518746 and 4540695590: add Bonus-Low-Mercury-Seafood-Guide.pdf in the slot
//    of bonus-insert-carnivore-weekly.pdf, then remove the Carnivore Weekly card from that listing.
//    Upload first, delete second, so no listing is ever without a bonus. The KetoDial calculator
//    coupon file stays (approved 2026-08-25 insert-as-ad). The CW card still exists locally
//    (etsy/products/pdfs/bonus-insert-carnivore-weekly.pdf), so this is reversible.
// 2. On 4464217699 only: rank-2 image 8363173838 is a byte-identical copy of rank 1. Overwrite
//    rank 2 with pescatarian-02-free-bonus.png. Rank 1 (the thumbnail) is never touched.
//
// Titles, tags, prices and descriptions are NOT touched (one variable per window).
//   node pesc-insert-and-bonus-image-2026-09-28.mjs          # dry run, reads only
//   node pesc-insert-and-bonus-image-2026-09-28.mjs --apply  # writes
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHOP = 63916912;
const LISTINGS = [4464217699, 4513518746, 4540695590];
const OLD_INSERT = 'bonus-insert-carnivore-weekly.pdf';
const NEW_INSERT = 'Bonus-Low-Mercury-Seafood-Guide.pdf';
const NEW_INSERT_PATH = path.resolve(__dirname, 'products/pdfs', NEW_INSERT);
const IMG_LISTING = 4464217699;
const RANK1_ID = 8411055725;
const DUP_ID = 8363173838;
const NEW_IMG_PATH = path.resolve(__dirname, 'products/listing-images/food-list-buildout-2026-08-10/out/pescatarian-02-free-bonus.png');
const apply = process.argv.includes('--apply');

const headers = etsyHeaders(await getEtsyToken());
const api = 'https://openapi.etsy.com/v3/application';
const get = async (url) => { const r = await fetch(url, { headers }); const j = await r.json(); if (!r.ok) throw new Error(`${url} ${r.status} ${JSON.stringify(j)}`); return j; };
const md5 = (b) => createHash('md5').update(b).digest('hex');
const files = async (id) => (await get(`${api}/shops/${SHOP}/listings/${id}/files`)).results || [];
const images = async (id) => (await get(`${api}/listings/${id}/images`)).results || [];
const show = (fs_) => fs_.map((f) => `${f.rank}:${f.filename}`).join(' | ');

const pdf = readFileSync(NEW_INSERT_PATH);
const png = readFileSync(NEW_IMG_PATH);
console.log(`new insert ${pdf.length} bytes md5 ${md5(pdf)}; new image ${png.length} bytes md5 ${md5(png)}`);

// Preflight every listing before any write (near-miss rule: check live state immediately before).
const plan = [];
for (const id of LISTINGS) {
  const fs_ = await files(id);
  const old = fs_.find((f) => f.filename === OLD_INSERT);
  const done = fs_.find((f) => f.filename === NEW_INSERT);
  console.log(`${id} files: ${show(fs_)}`);
  if (!old && !done) throw new Error(`${id}: neither ${OLD_INSERT} nor ${NEW_INSERT} attached, unexpected state`);
  plan.push({ id, old, done });
}
const imgs = await images(IMG_LISTING);
const r1 = imgs.find((i) => i.rank === 1), r2 = imgs.find((i) => i.rank === 2);
console.log(`${IMG_LISTING} images: ${imgs.length}, rank1 ${r1?.listing_image_id}, rank2 ${r2?.listing_image_id}`);
const imgTodo = r1?.listing_image_id === RANK1_ID && r2?.listing_image_id === DUP_ID;
if (!imgTodo) console.log('  rank-2 image is no longer the duplicate; image step will be skipped');

if (!apply) { console.log('\nDRY RUN. Nothing changed. Re-run with --apply.'); process.exit(0); }

let sharedFileId = null;
for (const p of plan) {
  const base = `${api}/shops/${SHOP}/listings/${p.id}/files`;
  if (!p.done) {
    const form = new FormData();
    if (sharedFileId) {
      form.append('listing_file_id', String(sharedFileId));
    } else {
      form.append('file', new Blob([pdf], { type: 'application/pdf' }), NEW_INSERT);
      form.append('name', NEW_INSERT);
    }
    form.append('rank', String(p.old.rank));
    const r = await fetch(base, { method: 'POST', headers, body: form });
    const j = await r.json();
    if (!r.ok) throw new Error(`${p.id} upload failed ${r.status} ${JSON.stringify(j)}`);
    sharedFileId = sharedFileId || j.listing_file_id;
    console.log(`${p.id}: added ${NEW_INSERT} (file id ${j.listing_file_id})`);
  } else {
    sharedFileId = sharedFileId || p.done.listing_file_id;
  }
  const now = await files(p.id);
  const old = now.find((f) => f.filename === OLD_INSERT);
  if (!now.find((f) => f.filename === NEW_INSERT)) throw new Error(`${p.id}: new insert not visible after upload, NOT deleting old`);
  if (old) {
    const d = await fetch(`${base}/${old.listing_file_id}`, { method: 'DELETE', headers });
    if (!d.ok) throw new Error(`${p.id} delete failed ${d.status} ${await d.text()}`);
    console.log(`${p.id}: removed ${OLD_INSERT}`);
  }
  console.log(`${p.id} AFTER: ${show(await files(p.id))}`);
}

if (imgTodo) {
  const form = new FormData();
  form.append('image', new Blob([png], { type: 'image/png' }), 'pescatarian-free-bonus.png');
  form.append('rank', '2');
  form.append('overwrite', 'true');
  form.append('alt_text', 'Pescatarian low carb food list and the free bonus low-mercury seafood guide page');
  const r = await fetch(`${api}/shops/${SHOP}/listings/${IMG_LISTING}/images`, { method: 'POST', headers, body: form });
  const j = await r.json();
  if (!r.ok) throw new Error(`image upload failed ${r.status} ${JSON.stringify(j)}`);
  const after = await images(IMG_LISTING);
  const a1 = after.find((i) => i.rank === 1), a2 = after.find((i) => i.rank === 2);
  console.log(`${IMG_LISTING} images AFTER: ${after.length}, rank1 ${a1?.listing_image_id} (must be ${RANK1_ID}), rank2 ${a2?.listing_image_id}`);
  if (a1?.listing_image_id !== RANK1_ID) console.error('WARNING: rank 1 changed. Check the thumbnail now.');
  console.log(`Undo image: POST ${api}/shops/${SHOP}/listings/${IMG_LISTING}/images with listing_image_id=${DUP_ID} rank=2 overwrite=true`);
}
