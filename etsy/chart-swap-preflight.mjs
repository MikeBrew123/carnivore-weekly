#!/usr/bin/env node
/**
 * READ-ONLY preflight for the red carnivore chart file swap on listing 4464217679.
 *
 * It makes GET calls only. It never POSTs, PATCHes or DELETEs anything on Etsy.
 * Nothing here can change a listing. Run it as often as you like.
 *
 * What it proves, so the swap decision is made on live facts and not on memory:
 *   1. which digital files the listing currently ships, with their file ids
 *   2. that the eight image-test images are still in place and untouched
 *   3. that the rebuilt PDF exists locally and is the one that was reviewed
 *   4. the exact revert record, printed so it can be pasted into the log
 *
 * Run from etsy/:
 *   node chart-swap-preflight.mjs
 */
import { createHash } from 'crypto';
import { existsSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SHOP = 63916912;
const LISTING = 4464217679; // Carnivore Diet Food List
const OLD_FILENAME = 'fridge-card-carnivore.pdf';
const NEW_PATH = path.resolve(__dirname, 'products/pdfs/fridge-card-carnivore-red.pdf');
const NEW_NAME = 'fridge-card-carnivore-red.pdf';
const REVIEWED_MD5 = 'fe3c59b33842d83f46074b9eae22336a'; // the PDF Brew was shown 2026-08-12

const token = await getEtsyToken();
const headers = etsyHeaders(token);
const base = `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${LISTING}`;

const get = async (url) => {
  const res = await fetch(url, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
};

console.log(`Listing ${LISTING} preflight, read-only. No write was made.\n`);

// --- 1. digital files currently attached -------------------------------------
const files = (await get(`${base}/files`)).results || [];
console.log('DIGITAL FILES NOW ATTACHED');
for (const f of files) {
  console.log(`  rank ${f.rank}  id ${f.listing_file_id}  ${f.filename}  ${f.filesize}`);
}
const old = files.find((f) => f.filename === OLD_FILENAME);
const already = files.find((f) => f.filename === NEW_NAME);
console.log(`\n  target to replace : ${old ? `${OLD_FILENAME} (id ${old.listing_file_id})` : 'NOT PRESENT -- do not run the swap'}`);
console.log(`  new file present  : ${already ? `YES (id ${already.listing_file_id}) -- swap already done` : 'no'}`);

// --- 2. images, which the swap must not touch --------------------------------
// Images live on the public listing path, not the shop-scoped one.
const images = (await get(`https://openapi.etsy.com/v3/application/listings/${LISTING}/images`)).results || [];
console.log(`\nIMAGES: ${images.length} attached (image test expects 8)`);
console.log('  ' + images.map((i) => `${i.rank}:${i.listing_image_id}`).join('  '));
console.log('  A digital-file swap uses the /files endpoint only. It cannot alter these.');

// --- 3. the local PDF --------------------------------------------------------
console.log('\nLOCAL FILE TO UPLOAD');
if (!existsSync(NEW_PATH)) {
  console.log(`  MISSING: ${NEW_PATH}`);
  console.log('  Rebuild it: python3 products/templates/build_carnivore_red_chart_art.py && node build-carnivore-red-chart.mjs');
} else {
  const buf = readFileSync(NEW_PATH);
  const md5 = createHash('md5').update(buf).digest('hex');
  console.log(`  ${NEW_PATH}`);
  console.log(`  ${statSync(NEW_PATH).size} bytes, md5 ${md5}`);
  console.log(`  matches the PDF reviewed on 2026-08-12: ${md5 === REVIEWED_MD5 ? 'YES' : 'NO -- stop and re-review'}`);
}

// --- 4. the revert record ----------------------------------------------------
console.log('\nREVERT RECORD (save this before any swap)');
console.log(JSON.stringify({
  captured_at: new Date().toISOString(),
  listing_id: LISTING,
  files_before: files.map((f) => ({
    listing_file_id: f.listing_file_id, filename: f.filename, rank: f.rank, filesize: f.filesize,
  })),
  image_ids_before: images.map((i) => ({ rank: i.rank, listing_image_id: i.listing_image_id })),
  old_file_local_copy: 'etsy/products/pdfs/fridge-card-carnivore.pdf',
  revert_procedure: 'Re-upload fridge-card-carnivore.pdf from the local copy, then delete the red file id returned by the swap. Same shape as the swap, in reverse.',
}, null, 2));
