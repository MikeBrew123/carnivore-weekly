#!/usr/bin/env node
/**
 * Attach the ETSY50 calculator bonus insert to the keto flagship (4575891585).
 *
 * The flagship shipped with no bonus insert, the only listing in the shop
 * without one. This also starts ETSY50 actually shipping: the card was built
 * 2026-09-07 and has never been distributed.
 *
 * FILES ONLY. This adds one file and touches nothing else. It reads the whole
 * listing before and after and asserts every other field is byte-identical,
 * because the 2026-08-10 incident (a full-object updateListing wiping 7 of 8
 * images) is what this shop's caution is built on.
 *
 * Etsy caps a listing at 5 files. This takes it from 2 to 3.
 */

import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP = 63916912;
const ID = 4575891585;
const SRC = path.resolve(import.meta.dirname, 'products/pdfs/bonus-insert-calculator.pdf');
const NAME = 'Free-Calculator-50-Percent-Off.pdf';

const token = await getEtsyToken();
const headers = {
  'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`,
  Authorization: `Bearer ${token}`,
};

const listing = async () => {
  const r = await fetch(
    `https://openapi.etsy.com/v3/application/listings/${ID}?includes=Images,Videos`, { headers });
  if (!r.ok) throw new Error(`listing read ${r.status}`);
  return r.json();
};
const files = async () => {
  const r = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${ID}/files`, { headers });
  if (!r.ok) throw new Error(`files read ${r.status}`);
  return (await r.json()).results || [];
};

const before = await listing();
const fBefore = await files();
console.log('BEFORE');
console.log(`  state=${before.state} price=${before.price.amount / before.price.divisor} ${before.price.currency_code}`);
console.log(`  tags=${before.tags.length} materials=${before.materials.length} images=${before.images.length} videos=${(before.videos || []).length}`);
console.log(`  files=${fBefore.length}: ${fBefore.map(f => f.name).join(', ')}`);

if (fBefore.length >= 5) {
  console.error('\nABORT: listing already at Etsy 5-file cap.');
  process.exit(1);
}
if (fBefore.some(f => /calculator/i.test(f.name))) {
  console.error('\nABORT: a calculator insert is already attached. Nothing to do.');
  process.exit(1);
}

const form = new FormData();
form.append('file', new Blob([readFileSync(SRC)], { type: 'application/pdf' }), NAME);
form.append('name', NAME);
form.append('rank', String(fBefore.length + 1)); // last, so the product stays first

const res = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${ID}/files`,
  { method: 'POST', headers, body: form });
const body = await res.json();
if (!res.ok) {
  console.error(`\n❌ upload failed ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  process.exit(1);
}
console.log(`\nUploaded. new file id ${body.listing_file_id}`);

const after = await listing();
const fAfter = await files();
const checks = [
  ['title', before.title === after.title],
  ['price', before.price.amount === after.price.amount],
  ['state', before.state === after.state],
  ['description', before.description === after.description],
  ['tags', before.tags.join('|') === after.tags.join('|')],
  ['materials', before.materials.join('|') === after.materials.join('|')],
  ['taxonomy', before.taxonomy_id === after.taxonomy_id],
  ['images', before.images.length === after.images.length],
  ['videos', (before.videos || []).length === (after.videos || []).length],
  ['files +1', fAfter.length === fBefore.length + 1],
  ['product pdfs intact', fBefore.every(b => fAfter.some(a => a.listing_file_id === b.listing_file_id))],
];
console.log('\nAFTER');
let ok = true;
for (const [n, pass] of checks) { console.log(`  ${pass ? '✅' : '❌'} ${n}`); if (!pass) ok = false; }
console.log(`  files=${fAfter.length}: ${fAfter.map(f => f.name).join(', ')}`);
console.log(ok ? '\n✅ Insert attached, nothing else moved.' : '\n❌ SOMETHING ELSE MOVED, investigate now.');
process.exit(ok ? 0 : 1);
