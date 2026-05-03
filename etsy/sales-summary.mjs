#!/usr/bin/env node
// Pull a sales + listing snapshot for CarnivoreWeekly Etsy shop.
import { readFileSync } from 'fs';

const secrets = JSON.parse(readFileSync('../secrets/api-keys.json', 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;

async function getToken() {
  const res = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: secrets.etsy.refresh_token,
    }),
  });
  const j = await res.json();
  if (j.error) throw new Error('token: ' + JSON.stringify(j));
  return j.access_token;
}

const token = await getToken();
const headers = {
  'x-api-key': CLIENT_ID + ':' + secrets.etsy.shared_secret,
  Authorization: 'Bearer ' + token,
};

const SHOP_ID = 63916912;

// 1. Shop info
const shop = await (await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}`, { headers })).json();

// 2. All active listings (paginated)
async function fetchAll(url) {
  let results = [], offset = 0, limit = 100;
  while (true) {
    const r = await (await fetch(`${url}${url.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`, { headers })).json();
    if (!r.results) break;
    results.push(...r.results);
    if (r.results.length < limit) break;
    offset += limit;
  }
  return results;
}

const listings = await fetchAll(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/active`);

// 3. Receipts (orders) — last 90 days
const since = Math.floor((Date.now() - 90 * 86400 * 1000) / 1000);
const receipts = await fetchAll(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/receipts?min_created=${since}`);

// === Output ===
console.log('\n=== SHOP ===');
console.log(`Name: ${shop.shop_name}`);
console.log(`Title: ${shop.title || '(none)'}`);
console.log(`URL: https://www.etsy.com/shop/${shop.shop_name}`);
console.log(`Total sales (lifetime): ${shop.transaction_sold_count}`);
console.log(`Reviews: ${shop.review_count} (avg ${shop.review_average})`);
console.log(`Followers: ${shop.num_favorers}`);
console.log(`Listings (active): ${shop.listing_active_count}`);

console.log('\n=== LISTING PERFORMANCE (active) ===');
const sortedListings = [...listings].sort((a, b) => (b.views || 0) - (a.views || 0));
const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
const totalFavs = listings.reduce((s, l) => s + (l.num_favorers || 0), 0);
console.log(`Total active listings: ${listings.length}`);
console.log(`Total views (lifetime, sum across listings): ${totalViews}`);
console.log(`Total favorites: ${totalFavs}`);
console.log('\nTop 10 by views:');
for (const l of sortedListings.slice(0, 10)) {
  const t = (l.title || '').slice(0, 60);
  console.log(`  ${String(l.views || 0).padStart(4)} views | ${String(l.num_favorers || 0).padStart(3)} favs | ${l.price.amount/l.price.divisor} ${l.price.currency_code} | ${t}`);
}
console.log('\nBottom 5 by views (likely dead listings):');
for (const l of sortedListings.slice(-5).reverse()) {
  const t = (l.title || '').slice(0, 60);
  console.log(`  ${String(l.views || 0).padStart(4)} views | ${String(l.num_favorers || 0).padStart(3)} favs | ${t}`);
}

console.log('\n=== ORDERS (last 90 days) ===');
console.log(`Total receipts: ${receipts.length}`);
if (receipts.length) {
  const byMonth = {};
  let totalRev = 0, totalUnits = 0;
  const byProduct = {};
  for (const r of receipts) {
    const d = new Date(r.create_timestamp * 1000);
    const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    byMonth[ym] = (byMonth[ym] || 0) + 1;
    const grand = (r.grandtotal?.amount || 0) / (r.grandtotal?.divisor || 1);
    totalRev += grand;
    for (const tx of (r.transactions || [])) {
      totalUnits += tx.quantity || 0;
      const key = (tx.title || 'unknown').slice(0, 50);
      byProduct[key] = (byProduct[key] || 0) + (tx.quantity || 0);
    }
  }
  const cur = receipts[0].grandtotal?.currency_code || 'CAD';
  console.log(`Total revenue (90d): ${totalRev.toFixed(2)} ${cur}`);
  console.log(`Total units sold (90d): ${totalUnits}`);
  console.log(`Avg order value: ${(totalRev / receipts.length).toFixed(2)} ${cur}`);
  console.log('\nOrders by month:');
  for (const [m, n] of Object.entries(byMonth).sort()) console.log(`  ${m}: ${n}`);
  console.log('\nTop products sold (90d):');
  for (const [p, q] of Object.entries(byProduct).sort((a,b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  ${String(q).padStart(2)} | ${p}`);
  }
  console.log('\n5 most recent orders:');
  for (const r of receipts.slice(0, 5)) {
    const d = new Date(r.create_timestamp * 1000).toISOString().slice(0, 10);
    const items = (r.transactions || []).map(t => t.title?.slice(0, 35)).filter(Boolean).join(' + ');
    const grand = (r.grandtotal?.amount || 0) / (r.grandtotal?.divisor || 1);
    console.log(`  ${d} | ${grand.toFixed(2)} ${r.grandtotal?.currency_code} | ${items}`);
  }
} else {
  console.log('  (no receipts in window)');
}
