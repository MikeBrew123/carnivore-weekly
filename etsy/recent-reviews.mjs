#!/usr/bin/env node
// Read-only: Etsy shop reviews left in the last N hours (default 25), newest first.
// Used by the writer-inbox-daily-check task. GETs only; never writes to Etsy.
//   node etsy/recent-reviews.mjs [--hours 25] [--json]
import { getEtsyToken, etsyHeaders } from './token.mjs';

const SHOP_ID = 63916912;
const base = 'https://openapi.etsy.com/v3/application';
const args = process.argv.slice(2);
const hi = args.indexOf('--hours');
const hours = hi >= 0 ? Number(args[hi + 1]) : 25;
if (!Number.isFinite(hours) || hours <= 0) { console.error('usage: node etsy/recent-reviews.mjs [--hours N] [--json]'); process.exit(1); }
const asJson = args.includes('--json');
const since = Math.floor(Date.now() / 1000 - hours * 3600);

const headers = etsyHeaders(await getEtsyToken());
const get = async (url) => {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
};

const reviews = [];
for (let offset = 0; ; offset += 100) {
  const page = await get(`${base}/shops/${SHOP_ID}/reviews?limit=100&offset=${offset}&min_created=${since}`);
  const rows = page.results || [];
  reviews.push(...rows.filter((r) => r.created_timestamp >= since));
  if (rows.length < 100) break;
}
reviews.sort((a, b) => b.created_timestamp - a.created_timestamp);

const ids = [...new Set(reviews.map((r) => r.listing_id))];
const titles = {};
if (ids.length) {
  const batch = await get(`${base}/listings/batch?listing_ids=${ids.join(',')}`);
  for (const l of batch.results || []) titles[l.listing_id] = l.title;
}

const out = reviews.map((r) => ({
  rating: r.rating,
  listing_id: r.listing_id,
  listing_title: titles[r.listing_id] || null,
  text: r.review || '',
  created: new Date(r.created_timestamp * 1000).toISOString(),
}));

if (asJson) {
  console.log(JSON.stringify({ hours, count: out.length, reviews: out }, null, 2));
} else {
  console.log(`${out.length} review(s) in the last ${hours}h`);
  for (const r of out) {
    console.log(`\n${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}  ${r.created}`);
    console.log(`listing ${r.listing_id}: ${r.listing_title || '(title unavailable)'}`);
    console.log(r.text ? `"${r.text}"` : '(no text, rating only)');
  }
}
