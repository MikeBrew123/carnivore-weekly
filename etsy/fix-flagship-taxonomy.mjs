#!/usr/bin/env node
/**
 * Correct listing 4575891585 from taxonomy 354 to 2078.
 *
 * 354 (Paper & Party Supplies > Paper > Calendars & Planners) makes Etsy print
 * "Party decor for gatherings and celebrations" as the first Highlight on a
 * keto meal plan. Measured alternative: 2078 renders "Designed by
 * CarnivoreWeekly" in that slot on live listing 4540695544. All five meal plans
 * already in the shop are 2078.
 *
 * ONE FIELD ONLY. updateListing with a full object is what wiped 7 of 8 images
 * on two listings on 2026-08-10, so this sends taxonomy_id and nothing else,
 * gates on the live state first, and re-reads everything afterwards to prove
 * nothing else moved.
 */

import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP = 63916912;
const ID = 4575891585;
const FROM = 354;
const TO = 2078;

const token = await getEtsyToken();
const headers = {
  'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`,
  Authorization: `Bearer ${token}`,
};
const read = async () => {
  const r = await fetch(
    `https://openapi.etsy.com/v3/application/listings/${ID}?includes=Images,Videos`,
    { headers }
  );
  if (!r.ok) throw new Error(`read failed ${r.status}`);
  return r.json();
};

const before = await read();
console.log('before:', {
  taxonomy: before.taxonomy_id,
  state: before.state,
  title: before.title.slice(0, 50),
  price: `${before.price.amount / before.price.divisor} ${before.price.currency_code}`,
  tags: before.tags.length,
  materials: before.materials.length,
  images: before.images.length,
  videos: (before.videos || []).length,
});

if (before.taxonomy_id !== FROM) {
  console.error(`\nABORT: expected taxonomy ${FROM}, live reads ${before.taxonomy_id}. Nothing written.`);
  process.exit(1);
}

const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${ID}`, {
  method: 'PATCH',
  headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ taxonomy_id: String(TO) }),
});
const body = await res.json();
if (!res.ok) {
  console.error(`\n❌ PATCH failed ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  process.exit(1);
}

const after = await read();
const same = [
  ['title', before.title === after.title],
  ['price', before.price.amount === after.price.amount],
  ['state', before.state === after.state],
  ['tags', before.tags.join('|') === after.tags.join('|')],
  ['materials', before.materials.join('|') === after.materials.join('|')],
  ['images', before.images.length === after.images.length],
  ['videos', (before.videos || []).length === (after.videos || []).length],
  ['description', before.description === after.description],
];
console.log(`\ntaxonomy: ${before.taxonomy_id} -> ${after.taxonomy_id}`);
let ok = after.taxonomy_id === TO;
for (const [n, unchanged] of same) {
  console.log(`  ${unchanged ? '✅' : '❌'} ${n} unchanged`);
  if (!unchanged) ok = false;
}
console.log(ok ? '\n✅ taxonomy corrected, nothing else moved.' : '\n❌ SOMETHING ELSE MOVED, investigate.');
process.exit(ok ? 0 : 1);
