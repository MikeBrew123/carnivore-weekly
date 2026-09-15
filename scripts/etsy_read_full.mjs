#!/usr/bin/env node
/**
 * Read-only Etsy helper: full untruncated descriptions and shop sections.
 *
 * etsy/dump-listing.mjs truncates the description to ~600 chars, which silently
 * hides cross-sell URLs living at the end of the copy. This reads the whole
 * thing. GET only, nothing is ever written.
 *
 * Lives in scripts/ rather than etsy/ on purpose: the etsy write-guard hook
 * blocks unrecognised scripts under etsy/, and this needs no such exception
 * because it cannot write.
 *
 * Usage:
 *   node scripts/etsy_read_full.mjs 4464217679 4464219356
 *   node scripts/etsy_read_full.mjs --sections
 */

import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from '../etsy/token.mjs';

const SHOP = 63916912;
const args = process.argv.slice(2);
const token = await getEtsyToken();
const headers = {
  'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`,
  Authorization: `Bearer ${token}`,
};

const get = async (url) => {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} on ${url}`);
  return r.json();
};

if (args.includes('--sections')) {
  const s = await get(`https://openapi.etsy.com/v3/application/shops/${SHOP}/sections`);
  console.log(`Shop sections (${s.count}):`);
  for (const sec of s.results || []) {
    console.log(`  ${sec.shop_section_id}  ${String(sec.active_listing_count).padStart(3)} listings  ${sec.title}`);
  }
  process.exit(0);
}

for (const id of args) {
  const d = await get(`https://openapi.etsy.com/v3/application/listings/${id}`);
  const desc = d.description || '';
  const links = desc.match(/https?:\/\/[^\s)]+/g) || [];
  console.log('='.repeat(72));
  console.log(`${id}  ${d.title}`);
  console.log(`  state=${d.state} views=${d.views} favs=${d.num_favorers} section=${d.shop_section_id ?? 'none'}`);
  console.log(`  description: ${desc.length} chars`);
  console.log(`  URLs in description (${links.length}):`);
  for (const l of links) console.log(`    ${l}`);
  console.log('  --- full description ---');
  console.log(desc.replace(/^/gm, '  '));
}
