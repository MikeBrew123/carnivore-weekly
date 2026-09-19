#!/usr/bin/env node
/**
 * Deck card 412fdfaf (approved by Brew 2026-09-17): remove exactly 2 tags from
 * listing 4464217679 (Carnivore Diet Food List Printable). Tags only.
 *
 * Purpose-built and single-use on purpose: update-listings.mjs rewrites every
 * field on every listing, which is not what was approved. This script reads the
 * live tag array, removes only the two named tags, PATCHes, and re-reads to
 * verify. It never touches title, description, price, images, files or taxonomy.
 *
 * Run from etsy/:  node remove-tags-2026-09-19.mjs
 */
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP_ID = 63916912;
const LISTING_ID = 4464217679;
const REMOVE = ['carnivore meal prep', 'weight loss chart'];

const token = await getEtsyToken();
const headers = {
  'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  Authorization: 'Bearer ' + token,
  'Content-Type': 'application/json',
};

async function getListing() {
  const res = await fetch(`https://openapi.etsy.com/v3/application/listings/${LISTING_ID}`, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET -> ${res.status} ${JSON.stringify(data)}`);
  if (String(data.shop_id) !== String(SHOP_ID)) throw new Error(`wrong shop ${data.shop_id}`);
  return data;
}

const before = await getListing();
const beforeTags = before.tags || [];
console.log('BEFORE (%d tags): %s', beforeTags.length, JSON.stringify(beforeTags));

const missing = REMOVE.filter((t) => !beforeTags.includes(t));
if (missing.length) console.log('NOTE: already absent, nothing to remove for: %s', JSON.stringify(missing));
const target = REMOVE.filter((t) => beforeTags.includes(t));
if (!target.length) {
  console.log('Both tags already absent. No write performed.');
  process.exit(0);
}

const newTags = beforeTags.filter((t) => !REMOVE.includes(t));
console.log('AFTER (intended, %d tags): %s', newTags.length, JSON.stringify(newTags));

const res = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${LISTING_ID}`,
  { method: 'PATCH', headers, body: JSON.stringify({ tags: newTags }) },
);
if (!res.ok) {
  console.error('PATCH FAILED (%d): %s', res.status, await res.text());
  process.exit(1);
}
console.log('PATCH ok (%d)', res.status);

const after = await getListing();
const afterTags = after.tags || [];
console.log('VERIFIED AFTER (%d tags): %s', afterTags.length, JSON.stringify(afterTags));

const stillThere = REMOVE.filter((t) => afterTags.includes(t));
const lost = beforeTags.filter((t) => !REMOVE.includes(t) && !afterTags.includes(t));
console.log('removed-tags still present: %s', stillThere.length ? JSON.stringify(stillThere) : 'none');
console.log('other tags lost: %s', lost.length ? JSON.stringify(lost) : 'none');
console.log('title unchanged: %s', after.title === before.title);
console.log('price unchanged: %s', JSON.stringify(after.price) === JSON.stringify(before.price));
console.log('state unchanged: %s', after.state === before.state);
console.log('taxonomy unchanged: %s', after.taxonomy_id === before.taxonomy_id);
console.log('description unchanged: %s', after.description === before.description);
process.exit(stillThere.length || lost.length ? 1 : 0);
