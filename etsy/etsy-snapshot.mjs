#!/usr/bin/env node
// Phase A / A2 — Daily Etsy snapshot.
// Read-only Etsy API pull (~3-4 requests/run — negligible vs Etsy's 10k/day limit).
// Appends one dated JSON line to reports/etsy-snapshots/snapshots.jsonl, building the time
// series that makes flatten-vs-recover measurable and that sales-summary.mjs uses for TRUE
// windowed conversion (Etsy's API only exposes LIFETIME views, so windowed views = snapshot
// delta; daily cadence gives tight ~30d and ~90d window matches).
// Output dir is gitignored — shop performance data must not land in the PUBLIC repo.
import { appendFileSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO, 'reports', 'etsy-snapshots');
const OUT = path.join(OUT_DIR, 'snapshots.jsonl');
const SHOP_ID = 63916912;

const CLIENT_ID = ETSY_CLIENT_ID;

// Valid Etsy access token from the shared Supabase store (single source of truth).
const token = await getEtsyToken();
const headers = { 'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET, Authorization: 'Bearer ' + token };

async function fetchAll(url) {
  let out = [], offset = 0, limit = 100;
  while (true) {
    const r = await (await fetch(`${url}${url.includes('?') ? '&' : '?'}limit=${limit}&offset=${offset}`, { headers })).json();
    if (!r.results) break;
    out.push(...r.results);
    if (r.results.length < limit) break;
    offset += limit;
  }
  return out;
}

const shop = await (await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}`, { headers })).json();
const listings = await fetchAll(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/active`);
const since = Math.floor((Date.now() - 90 * 86400 * 1000) / 1000);
const receipts = await fetchAll(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/receipts?min_created=${since}`);

// per-listing 90-day units from receipt transactions
const units90 = {};
for (const r of receipts) for (const tx of (r.transactions || [])) units90[tx.listing_id] = (units90[tx.listing_id] || 0) + (tx.quantity || 0);

const snap = {
  date: new Date().toISOString().slice(0, 10),
  ts: Math.floor(Date.now() / 1000),
  shop: {
    sales_lifetime: shop.transaction_sold_count,
    reviews: shop.review_count,
    review_avg: shop.review_average,
    followers: shop.num_favorers,
    active_listings: shop.listing_active_count,
  },
  listings: listings.map(l => ({
    id: l.listing_id,
    title: (l.title || '').slice(0, 80),
    views: l.views || 0,
    favers: l.num_favorers || 0,
    price: l.price ? l.price.amount / l.price.divisor : null,
    cur: l.price?.currency_code || null,
    units_90d: units90[l.listing_id] || 0,
  })),
};

mkdirSync(OUT_DIR, { recursive: true });
appendFileSync(OUT, JSON.stringify(snap) + '\n');
const totalViews = snap.listings.reduce((s, l) => s + l.views, 0);
console.log(`✅ snapshot ${snap.date} appended → reports/etsy-snapshots/snapshots.jsonl`);
console.log(`   ${snap.listings.length} listings · ${snap.shop.sales_lifetime} lifetime sales · ${snap.shop.reviews} reviews (${snap.shop.review_avg}) · ${totalViews} total lifetime views`);
