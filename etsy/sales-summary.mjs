#!/usr/bin/env node
// Pull a sales + listing snapshot for CarnivoreWeekly Etsy shop.
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ID = ETSY_CLIENT_ID;

// Valid Etsy access token from the shared Supabase store (single source of truth).
// Reuse and rotation are handled centrally in etsy/token.mjs.
const token = await getEtsyToken();
const headers = {
  'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
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

// A1: per-listing 90-day units (map receipt transactions to listing_id) for the conversion table
const units90 = {};
for (const r of receipts) for (const tx of (r.transactions || [])) units90[tx.listing_id] = (units90[tx.listing_id] || 0) + (tx.quantity || 0);

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

// === A1: PER-LISTING METRICS — proxy now; TRUE conversion once snapshot history spans the window ===
// Etsy's API exposes only LIFETIME views, so windowed views come from the daily snapshot log
// (reports/etsy-snapshots/snapshots.jsonl, written by etsy-snapshot.mjs).
console.log('\n=== PER-LISTING METRICS (A1) ===');
console.log('proxy% = units(90d) ÷ LIFETIME views — a coarse SELL-THROUGH PROXY, NOT a conversion rate.');
console.log('  ⚠ denominator mismatch: a 90-day numerator over all-time views. It understates mature');
console.log('    high-view listings and flatters brand-new ones. Use only for rough ranking.');
console.log('convNd = units(Nd) ÷ views-gained(Nd) over the SAME N-day window (numerator window is set to');
console.log('  the matched snapshot age, so denominators align). Shown only when a snapshot that old exists.');

const SNAP = path.join(__dirname, '..', 'reports', 'etsy-snapshots', 'snapshots.jsonl');
let snaps = [];
if (existsSync(SNAP)) snaps = readFileSync(SNAP, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const nowTs = Math.floor(Date.now() / 1000);
const withAge = snaps.map(s => ({ s, age: (nowTs - s.ts) / 86400 })).filter(x => x.age >= 1);

// closest snapshot to `target` days old within [min,max]; null if none qualifies
function pickWindow(target, min, max) {
  const cand = withAge.filter(x => x.age >= min && x.age <= max);
  if (!cand.length) return null;
  const p = cand.sort((a, b) => Math.abs(a.age - target) - Math.abs(b.age - target))[0];
  const viewsAt = {}; for (const l of p.s.listings) viewsAt[l.id] = l.views;
  return { ageDays: Math.round(p.age), ts: p.s.ts, viewsAt };
}
// units per listing since a timestamp — aligns the numerator window to the snapshot
function unitsSince(ts) {
  const m = {};
  for (const r of receipts) if (r.create_timestamp >= ts) for (const tx of (r.transactions || [])) m[tx.listing_id] = (m[tx.listing_id] || 0) + (tx.quantity || 0);
  return m;
}
const w30 = pickWindow(30, 20, 45);
const w90 = pickWindow(90, 70, 110);
const u30 = w30 ? unitsSince(w30.ts) : null;
const u90w = w90 ? unitsSince(w90.ts) : null;
const oldestAge = withAge.length ? Math.round(Math.max(...withAge.map(x => x.age))) : 0;
const firstSnap = snaps.length ? snaps[0].date : '(none yet)';
console.log(`\n30d conversion: ${w30 ? 'LIVE — matched ' + w30.ageDays + 'd snapshot' : `pending (need a snapshot ~20-45d old; history started ${firstSnap}, oldest ${oldestAge}d)`}`);
console.log(`90d conversion: ${w90 ? 'LIVE — matched ' + w90.ageDays + 'd snapshot' : `pending (need a snapshot ~70-110d old; oldest ${oldestAge}d)`}`);

const h30 = w30 ? `conv${w30.ageDays}d` : 'conv30d', h90 = w90 ? `conv${w90.ageDays}d` : 'conv90d';
console.log(`\n  units90  viewsLife   proxy%  ${h30.padStart(7)}  ${h90.padStart(7)}   title`);
const rows = [...listings].sort((a, b) => (units90[b.listing_id] || 0) - (units90[a.listing_id] || 0) || (b.views || 0) - (a.views || 0));
for (const l of rows) {
  const id = l.listing_id, u = units90[id] || 0, v = l.views || 0;
  const proxy = v ? (u / v * 100).toFixed(2) + '%' : '—';
  const winConv = (w, uw) => {
    if (!w) return '—';
    const vd = v - (w.viewsAt[id] ?? v);
    return vd > 0 ? ((uw[id] || 0) / vd * 100).toFixed(1) + '%' : (vd === 0 ? '0v' : '—');
  };
  console.log(`  ${String(u).padStart(6)}   ${String(v).padStart(7)}   ${proxy.padStart(6)}  ${winConv(w30, u30).padStart(7)}  ${winConv(w90, u90w).padStart(7)}   ${(l.title || '').slice(0, 40)}`);
}
