#!/usr/bin/env node
// READ-ONLY single-listing dump. Written 2026-08-12 for the Starter Kit keyword pass.
//
// Prints (and optionally saves) the complete current state of one listing:
// title, all tags, materials, price, taxonomy/category, description, image
// count and image ids. This is the revert record you capture BEFORE any
// metadata edit, so a bad change can be undone field by field.
//
// This script performs GET requests only. It never calls updateListing and it
// never touches images. Usage:
//   cd etsy && node dump-listing.mjs 4532542805 [--json ../reports/before.json]
import { writeFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const SHOP_ID = 63916912;

const listingId = process.argv[2];
if (!listingId || !/^\d+$/.test(listingId)) {
  console.error('usage: node dump-listing.mjs <listing_id> [--json <path>]');
  process.exit(1);
}
const jsonFlag = process.argv.indexOf('--json');
const jsonOut = jsonFlag > -1 ? process.argv[jsonFlag + 1] : null;

const token = await getEtsyToken();
const headers = etsyHeaders(token);

async function get(url) {
  const res = await fetch(url, { headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${JSON.stringify(data)}`);
  return data;
}

// getListing. NOTE: there is no shop-scoped single-listing GET in Etsy v3 —
// /shops/{shop_id}/listings/{listing_id} returns 404. Use the flat listings path.
const l = await get(
  `https://openapi.etsy.com/v3/application/listings/${listingId}?includes=Images`,
);
if (String(l.shop_id) !== String(SHOP_ID)) {
  throw new Error(`listing ${listingId} belongs to shop ${l.shop_id}, not ${SHOP_ID}`);
}
const imgs = (l.images || []).map((i) => ({
  listing_image_id: i.listing_image_id,
  rank: i.rank,
  url: i.url_570xN,
}));

let taxonomy = null;
try {
  const tree = await get('https://openapi.etsy.com/v3/application/seller-taxonomy/nodes');
  const flat = [];
  (function walk(nodes) {
    for (const n of nodes || []) {
      flat.push(n);
      walk(n.children);
    }
  })(tree.results);
  const node = flat.find((n) => n.id === l.taxonomy_id);
  taxonomy = node
    ? node.full_path_taxonomy_ids
        .map((id) => (flat.find((f) => f.id === id) || {}).name || id)
        .join(' > ')
    : null;
} catch {
  // taxonomy lookup is a nicety, never fail the dump over it
}

const out = {
  pulled_at: new Date().toISOString(),
  listing_id: l.listing_id,
  state: l.state,
  title: l.title,
  title_length: (l.title || '').length,
  price: l.price ? `${(l.price.amount / l.price.divisor).toFixed(2)} ${l.price.currency_code}` : null,
  taxonomy_id: l.taxonomy_id,
  taxonomy_path: taxonomy,
  who_made: l.who_made,
  when_made: l.when_made,
  is_digital: l.is_digital,
  quantity: l.quantity,
  views: l.views,
  num_favorers: l.num_favorers,
  created: l.created_timestamp ? new Date(l.created_timestamp * 1000).toISOString() : null,
  updated: l.updated_timestamp ? new Date(l.updated_timestamp * 1000).toISOString() : null,
  tags: l.tags || [],
  tag_count: (l.tags || []).length,
  materials: l.materials || [],
  image_count: imgs.length,
  images: imgs,
  description: l.description || '',
};

console.log(JSON.stringify({ ...out, description: out.description.slice(0, 600) + ' ...' }, null, 2));

if (jsonOut) {
  const p = path.resolve(jsonOut);
  writeFileSync(p, JSON.stringify(out, null, 2));
  console.log(`\nfull record saved: ${p}`);
}
