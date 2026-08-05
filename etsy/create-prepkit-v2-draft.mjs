#!/usr/bin/env node
// Create ONE new DRAFT listing for the redesigned Doctor Visit Prep Kit
// (v2 design rebuild, Brew-approved 2026-08-05).
//
// - Creates a NEW draft only. Never activates. Never touches existing listings
//   (the receipt-verified allowlist freeze applies; the Jul 28 draft 4545904719
//   is left untouched for Brew to delete or keep).
// - Copy comes from products/doctor-kit/listings.json (prepkit key).
// - Uploads the v2 PDF and the 8 prepkit2-* listing images in formula order.
import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const KIT_DIR = path.resolve(import.meta.dirname, 'products/doctor-kit');
const PDF = path.resolve(import.meta.dirname, 'products/pdfs/doctor-visit-prep-kit.pdf');
const IMG_DIR = path.join(KIT_DIR, 'listing-images');
const SHOP = 63916912;
const PRICE = '7.99';

const IMAGES = [
  'prepkit2-01-hero.jpg',
  'prepkit2-02-desk-mockup.jpg',
  'prepkit2-03-closeup.jpg',
  'prepkit2-04-contents-grid.jpg',
  'prepkit2-05-how-it-works.jpg',
  'prepkit2-06-clipboard-mockup.jpg',
  'prepkit2-07-format.jpg',
  'prepkit2-08-trust.jpg',
];

const copy = JSON.parse(readFileSync(path.join(KIT_DIR, 'listings.json'), 'utf8')).prepkit;

console.log('Authenticating...');
const token = await getEtsyToken();
const headers = { 'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET, 'Authorization': 'Bearer ' + token };
console.log('  ok\n');

const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    title: copy.title, description: copy.description, quantity: '999', price: PRICE,
    who_made: 'i_did', when_made: '2020_2026', taxonomy_id: '69', type: 'download',
    is_digital: 'true', tags: copy.tags.join(','),
  }),
});
const data = await res.json();
if (!res.ok) {
  console.error(`CREATE FAILED ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
  process.exit(1);
}
const id = data.listing_id;
console.log(`Created draft: ${id} (state: ${data.state})`);

// PDF file
{
  const blob = new Blob([readFileSync(PDF)], { type: 'application/pdf' });
  const form = new FormData();
  form.append('file', blob, path.basename(PDF));
  form.append('name', path.basename(PDF));
  const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`, { method: 'POST', headers, body: form });
  console.log(r.ok ? '  pdf ok' : `  PDF ERR: ${(await r.text()).slice(0, 200)}`);
  await new Promise(rs => setTimeout(rs, 600));
}

// Images, rank order = array order
let rank = 1;
for (const img of IMAGES) {
  const blob = new Blob([readFileSync(path.join(IMG_DIR, img))], { type: 'image/jpeg' });
  const form = new FormData();
  form.append('image', blob, img);
  form.append('rank', String(rank++));
  const r = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/images`, { method: 'POST', headers, body: form });
  console.log(r.ok ? `  img ok: ${img}` : `  IMG ERR ${img}: ${(await r.text()).slice(0, 200)}`);
  await new Promise(rs => setTimeout(rs, 600));
}

console.log(`\nDRAFT (not activated): https://www.etsy.com/listing/${id}`);
