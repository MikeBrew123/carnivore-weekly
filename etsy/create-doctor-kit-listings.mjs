#!/usr/bin/env node
// Draft listings for the doctor-coordination printables (Sarah's line, green-lit 2026-07-28).
import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const KIT_DIR = path.resolve(import.meta.dirname, 'products/doctor-kit');
const PDF_DIR = path.resolve(import.meta.dirname, 'products/pdfs');
const IMG_DIR = path.join(KIT_DIR, 'listing-images');
const SHOP = 63916912;

const copy = JSON.parse(readFileSync(path.join(KIT_DIR, 'listings.json'), 'utf8'));

const listings = [
  {
    name: 'PrepKit', key: 'prepkit', price: 7.99,
    pdfs: [path.join(PDF_DIR, 'doctor-visit-prep-kit.pdf')],
    images: ['prepkit-main.jpg', 'prepkit-page1.jpg', 'prepkit-page2.jpg', 'prepkit-page3.jpg', 'prepkit-page4.jpg'].map(f => path.join(IMG_DIR, f)),
  },
  {
    name: 'BPLog', key: 'bplog', price: 4.99,
    pdfs: [path.join(PDF_DIR, 'bp-glucose-doctor-log.pdf')],
    images: ['bplog-main.jpg', 'bplog-page1.jpg', 'bplog-page2.jpg', 'bplog-page3.jpg', 'bplog-page4.jpg'].map(f => path.join(IMG_DIR, f)),
  },
];

console.log('Authenticating...');
const token = await getEtsyToken();
const headers = { 'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET, 'Authorization': 'Bearer ' + token };
console.log('  ok\n');

const created = [];
for (const l of listings) {
  const c = copy[l.key];
  const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      title: c.title, description: c.description, quantity: '999', price: String(l.price),
      who_made: 'i_did', when_made: '2020_2026', taxonomy_id: '69', type: 'download',
      is_digital: 'true', tags: c.tags.join(','),
    }),
  });
  const data = await res.json();
  if (res.ok) { console.log(`Created draft ${l.name}: ${data.listing_id}`); created.push({ ...l, listingId: data.listing_id }); }
  else console.error(`ERROR ${l.name} ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  await new Promise(r => setTimeout(r, 1000));
}

for (const l of created) {
  for (const pdf of l.pdfs) {
    const blob = new Blob([readFileSync(pdf)], { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', blob, path.basename(pdf));
    form.append('name', path.basename(pdf));
    const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.listingId}/files`, { method: 'POST', headers, body: form });
    console.log(res.ok ? `  file ok: ${l.name}` : `  FILE ERR ${l.name}: ${(await res.text()).slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 500));
  }
  for (const img of l.images) {
    const blob = new Blob([readFileSync(img)], { type: 'image/jpeg' });
    const form = new FormData();
    form.append('image', blob, path.basename(img));
    const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.listingId}/images`, { method: 'POST', headers, body: form });
    console.log(res.ok ? `  img ok: ${path.basename(img)}` : `  IMG ERR ${path.basename(img)}: ${(await res.text()).slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 500));
  }
}

console.log('\n=== DRAFTS ===');
for (const l of created) console.log(`${l.name}: https://www.etsy.com/listing/${l.listingId}`);
