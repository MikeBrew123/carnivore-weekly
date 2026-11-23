#!/usr/bin/env node
/**
 * Add one calculator coupon card to the listings named on the command line.
 * FILES ONLY: each listing is read before and after and every other field is
 * asserted unchanged (same checks as add-insert-rollout.mjs, which a full-object
 * update wiping images on 2026-08-10 made mandatory).
 *
 * Usage (Live Changes Log row and edit-cap.mjs first, as always):
 *   node etsy/add-card-to-listings.mjs --deck kd 4550536874 4545921306 [--dry-run]
 *   node etsy/add-card-to-listings.mjs --deck cw <id> ...
 */
import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP = 63916912;
const CARDS = {
  cw: { src: 'products/pdfs/bonus-insert-calculator.pdf', name: 'Free-Calculator-50-Percent-Off.pdf' },
  kd: { src: 'products/pdfs/bonus-insert-kd-calculator.pdf', name: 'Free-KetoDial-Calculator-25-Percent-Off.pdf' },
};
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const deck = (args[args.indexOf('--deck') + 1] || '').toLowerCase();
const ids = args.filter((a) => /^\d{9,}$/.test(a)).map(Number);
if (!CARDS[deck] || !ids.length) { console.error('usage: --deck cw|kd <listing ids...> [--dry-run]'); process.exit(2); }

const card = CARDS[deck];
const pdf = readFileSync(path.resolve(import.meta.dirname, card.src));
const token = await getEtsyToken();
const headers = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, Authorization: `Bearer ${token}` };
const getJson = async (url) => { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };
const listing = (id) => getJson(`https://openapi.etsy.com/v3/application/listings/${id}?includes=Images,Videos`);
const files = async (id) => (await getJson(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`)).results || [];

let failed = 0;
console.log(`${deck.toUpperCase()} card ${card.src} (${Math.round(pdf.length / 1024)} KB) -> ${ids.join(', ')}${DRY ? '  DRY RUN' : ''}`);
for (const id of ids) {
  try {
    const before = await listing(id);
    const fBefore = await files(id);
    if (fBefore.length >= 5) { console.log(`  SKIP ${id}: at Etsy's 5-file cap`); continue; }
    if (DRY) { console.log(`  would add to ${id} "${before.title.slice(0, 50)}" (files ${fBefore.length} -> ${fBefore.length + 1})`); continue; }
    const form = new FormData();
    form.append('file', new Blob([pdf], { type: 'application/pdf' }), card.name);
    form.append('name', card.name);
    form.append('rank', String(fBefore.length + 1));
    const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`, { method: 'POST', headers, body: form });
    const body = await res.json();
    if (!res.ok) { failed++; console.log(`  FAILED ${id}: ${res.status} ${JSON.stringify(body).slice(0, 160)}`); continue; }
    const after = await listing(id);
    const fAfter = await files(id);
    const same = before.title === after.title && before.price.amount === after.price.amount && before.state === after.state
      && before.description === after.description && before.tags.join('|') === after.tags.join('|')
      && before.materials.join('|') === after.materials.join('|') && before.taxonomy_id === after.taxonomy_id
      && before.images.length === after.images.length && (before.videos || []).length === (after.videos || []).length
      && fAfter.length === fBefore.length + 1 && fBefore.every((b) => fAfter.some((a) => a.listing_file_id === b.listing_file_id));
    if (!same) { failed++; console.log(`  ASSERT FAILED ${id}: something other than the files moved`); continue; }
    console.log(`  added ${id}: file ${body.listing_file_id}, files ${fBefore.length} -> ${fAfter.length}`);
  } catch (e) { failed++; console.log(`  FAILED ${id}: ${e}`); }
}
process.exit(failed ? 1 : 0);
