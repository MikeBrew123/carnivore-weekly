#!/usr/bin/env node
/**
 * Weekly coupon-card swap (Brew 2026-11-23: "do 3 a week, best sellers first").
 * Takes the next listings from etsy/data/card-swap-queue.json, swaps the old
 * calculator card for the new QR/link card. Progress is read from Etsy itself:
 * a listing is done once it no longer holds the old card file.
 *
 * Rules it enforces, in order:
 *  1. Never more than the edit cap allows: asks edit-cap.mjs for the batch and
 *     shrinks it until the cap passes (fails closed if the cap check errors).
 *  2. Writes the Live Changes Log rows BEFORE any Etsy call (the row is the counter).
 *  3. Files only: removes the old card file, adds the new one, then re-reads the
 *     listing and asserts title, price, state, description, tags, materials,
 *     category, images and videos are unchanged and every other file is kept.
 *
 * Usage (from etsy/):
 *   node swap-card-queue.mjs --dry-run      show what would happen, no writes
 *   node swap-card-queue.mjs [--count 3]    do the next batch
 */
import { readFileSync, appendFileSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import os from 'os';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const SHOP = 63916912;
const DIR = import.meta.dirname;
const QUEUE = path.join(DIR, 'data/card-swap-queue.json');
const LOG = path.join(os.homedir(), 'Documents/Brew-Vault/00-Core/Live-Changes-Log.md');
const CARDS = {
  cw: { src: 'products/pdfs/bonus-insert-calculator.pdf', name: 'Free-Calculator-50-Percent-Off.pdf' },
  kd: { src: 'products/pdfs/bonus-insert-kd-calculator.pdf', name: 'Free-KetoDial-Calculator-25-Percent-Off.pdf' },
};
const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const want = Number(args[args.indexOf('--count') + 1]) || 3;

const q = JSON.parse(readFileSync(QUEUE, 'utf8'));
const token = await getEtsyToken();
const headers = { 'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`, Authorization: `Bearer ${token}` };
const getJson = async (url) => { const r = await fetch(url, { headers }); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.json(); };
const listing = (id) => getJson(`https://openapi.etsy.com/v3/application/listings/${id}?includes=Images,Videos`);
const files = async (id) => (await getJson(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`)).results || [];
const fileUrl = (id, fid) => `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files${fid ? '/' + fid : ''}`;

// Progress lives on Etsy, not in a file: a listing is still to do while it holds
// the old card file. Walk the queue in sales order until `want` such listings.
const todo = [];
let left = 0;
for (const x of q.queue) {
  const has = (await files(x.id)).some((f) => String(f.listing_file_id) === String(q.old_file_ids[x.deck]));
  if (has) { left++; if (todo.length < want) todo.push(x); }
}
if (!todo.length) { console.log('Queue empty: every listing has the new card.'); process.exit(0); }

// 1. Cap: largest batch (<= want) that edit-cap.mjs accepts.
let batch = [];
for (let n = Math.min(want, todo.length); n > 0; n--) {
  const ids = todo.slice(0, n).map((x) => String(x.id));
  try { execFileSync('node', [path.join(DIR, 'edit-cap.mjs'), ...ids], { stdio: 'pipe' }); batch = todo.slice(0, n); break; }
  catch (e) { if (e.status !== 1) { console.error('edit-cap check failed to run; stopping (fail closed).'); process.exit(2); } }
}
if (!batch.length) { console.log('No headroom under the 3-listings-per-7-days cap this week. Nothing done.'); process.exit(0); }
console.log(`${DRY ? 'DRY RUN: ' : ''}swapping ${batch.length} of ${left} remaining: ${batch.map((x) => x.id).join(', ')}`);
if (DRY) { for (const x of batch) console.log(`  would swap ${x.deck.toUpperCase()} card on ${x.id} ${x.title}`); process.exit(0); }

// 2. Log rows first.
const stamp = new Date().toLocaleString('sv-SE', { timeZone: 'America/Vancouver' }).slice(0, 16);
for (const x of batch) {
  appendFileSync(LOG, `| ${stamp} MST | Etsy listing ${x.id} (${x.title}): ${x.deck.toUpperCase()} calculator coupon card swapped to the new QR/link version (old card file removed, new added). Files only. | Brew 2026-11-23 "do 3 a week, best sellers first" (weekly card-swap queue). | Re-add the old card file from etsy/products/pdfs/*-pre-2026-11-23.pdf and remove the new one. |\n`);
}

// 3. Swap.
let failed = 0;
for (const x of batch) {
  try {
    const card = CARDS[x.deck];
    const oldId = String(q.old_file_ids[x.deck]);
    const before = await listing(x.id);
    const fBefore = await files(x.id);
    const hadOld = fBefore.some((f) => String(f.listing_file_id) === oldId);
    if (hadOld) {
      const d = await fetch(fileUrl(x.id, oldId), { method: 'DELETE', headers });
      if (!d.ok) throw new Error(`remove old card ${d.status}`);
    }
    const form = new FormData();
    form.append('file', new Blob([readFileSync(path.join(DIR, card.src))], { type: 'application/pdf' }), card.name);
    form.append('name', card.name);
    form.append('rank', String(fBefore.length - (hadOld ? 1 : 0) + 1));
    const res = await fetch(fileUrl(x.id), { method: 'POST', headers, body: form });
    const body = await res.json();
    if (!res.ok) throw new Error(`add new card ${res.status} ${JSON.stringify(body).slice(0, 120)}`);
    const after = await listing(x.id);
    const fAfter = await files(x.id);
    const kept = fBefore.filter((f) => String(f.listing_file_id) !== oldId);
    const same = before.title === after.title && before.price.amount === after.price.amount && before.state === after.state
      && before.description === after.description && before.tags.join('|') === after.tags.join('|')
      && before.materials.join('|') === after.materials.join('|') && before.taxonomy_id === after.taxonomy_id
      && before.images.length === after.images.length && (before.videos || []).length === (after.videos || []).length
      && kept.every((k) => fAfter.some((a) => a.listing_file_id === k.listing_file_id))
      && fAfter.some((a) => a.listing_file_id === body.listing_file_id)
      && !fAfter.some((a) => String(a.listing_file_id) === oldId);
    if (!same) throw new Error('POST-WRITE ASSERT FAILED: something other than the card file moved');
    left--;
    console.log(`  swapped ${x.id} ${x.title}: files ${fBefore.length} -> ${fAfter.length}`);
  } catch (e) { failed++; console.log(`  FAILED ${x.id}: ${e.message}`); }
}
console.log(`${left} listings left in the queue.`);
process.exit(failed ? 1 : 0);
