#!/usr/bin/env node
// Read-only: per-listing review counts and averages, to see whether real Etsy
// review data exists to back aggregateRating markup on carnivoreweekly.com/shop.html.
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
const SHOP_ID = 63916912;
const token = await getEtsyToken();
const headers = { 'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET, Authorization: 'Bearer ' + token };
const base = 'https://openapi.etsy.com/v3/application';
const g = async (u) => (await fetch(u, { headers })).json();

const shop = await g(`${base}/shops/${SHOP_ID}`);
console.log(`SHOP: ${shop.review_count} reviews, avg ${shop.review_average}`);
const revs = await g(`${base}/shops/${SHOP_ID}/reviews?limit=100`);
if (!revs.results) { console.log('reviews endpoint said:', JSON.stringify(revs).slice(0, 300)); process.exit(0); }
const by = {};
for (const r of revs.results) {
  const k = r.listing_id;
  (by[k] ||= { n: 0, sum: 0, latest: 0 });
  by[k].n++; by[k].sum += r.rating;
  if (r.created_timestamp > by[k].latest) by[k].latest = r.created_timestamp;
}
const listings = await g(`${base}/shops/${SHOP_ID}/listings/active?limit=100`);
const titles = Object.fromEntries((listings.results || []).map(l => [l.listing_id, l.title.slice(0, 55)]));
console.log(`\nfetched ${revs.results.length} of ${revs.count} shop reviews\n`);
for (const [id, v] of Object.entries(by).sort((a, b) => b[1].n - a[1].n))
  console.log(`${id}  n=${v.n}  avg=${(v.sum / v.n).toFixed(2)}  last ${new Date(v.latest * 1000).toISOString().slice(0, 10)}  ${titles[id] || '(not active)'}`);
