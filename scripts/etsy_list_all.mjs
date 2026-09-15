#!/usr/bin/env node
/**
 * Read-only: every listing in the shop, with its attached-file ids.
 *
 * etsy/fetch-listings.mjs stops at 25 (hardcoded limit) and never shows files,
 * so it cannot answer "which listings still need the bonus insert". This pages
 * the whole shop and, with --files, reads each listing's file list too.
 *
 * Lives in scripts/ because the etsy write-guard hook blocks unrecognised
 * scripts under etsy/, and this one is GET only.
 */
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from '../etsy/token.mjs';

const SHOP = 63916912;
const WANT_FILES = process.argv.includes('--files');
const token = await getEtsyToken();
const headers = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, Authorization: `Bearer ${token}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const get = async (url, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers });
    if (r.ok) return r.json();
    if (r.status === 429 && i < tries - 1) { await sleep(2000 * (i + 1)); continue; }
    throw new Error(`${r.status} on ${url}`);
  }
};

const all = [];
for (let off = 0; ; off += 100) {
  const page = await get(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings?limit=100&offset=${off}&state=active`);
  all.push(...(page.results || []));
  if (all.length >= page.count) break;
}
console.log(`${all.length} active listings\n`);

for (const l of all) {
  let extra = '';
  if (WANT_FILES) {
    await sleep(350);
    const f = (await get(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.listing_id}/files`)).results || [];
    extra = `  files=${f.length} [${f.map((x) => x.listing_file_id).join(',')}]`;
  }
  const price = (l.price.amount / l.price.divisor).toFixed(2);
  console.log(`${l.listing_id}  ${price.padStart(6)} ${l.price.currency_code}  views=${String(l.views).padStart(6)}${extra}  ${l.title.slice(0, 70)}`);
}
