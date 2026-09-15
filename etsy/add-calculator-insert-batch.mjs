#!/usr/bin/env node
/**
 * Attach the ETSY50 calculator bonus insert to the carnivore and lion listings.
 *
 * FILES ONLY. Nothing else on any listing is written. Each listing is read
 * before and after and every other field asserted unchanged, because a
 * full-object update wiped 7 of 8 images on two listings on 2026-08-10 and that
 * is the incident this shop's caution is built on.
 *
 * Carnivore and lion only, on purpose. The keto side needs a KetoDial-branded
 * card that does not exist yet, and a printed ETSY25 would be REJECTED at KD's
 * checkout because KD uses Stripe's native allow_promotion_codes and no
 * promotion code object exists on the account.
 *
 * Per listing this will SKIP rather than force, if:
 *   - the listing already holds 5 files (Etsy's hard cap), or
 *   - a calculator insert is already attached.
 *
 * Usage:
 *   node etsy/add-calculator-insert-batch.mjs --dry-run
 *   node etsy/add-calculator-insert-batch.mjs
 */

import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const DRY = process.argv.includes('--dry-run');
const SHOP = 63916912;
const SRC = path.resolve(import.meta.dirname, 'products/pdfs/bonus-insert-calculator.pdf');
const NAME = 'Free-Calculator-50-Percent-Off.pdf';
// Etsy dedupes identical uploads to ONE id shared across every listing.
const CARD_FILE_ID = 1515218127430;

const TARGETS = [
  [4464217679, 'Carnivore Diet Food List Printable'],
  [4495083368, 'Carnivore Diet Starter Bundle'],
  [4495052093, 'Lion Diet Guide and 14-Day Tracker'],
  [4489981356, 'Modern Carnivore Diet Food List'],
  [4464219372, 'Lion Diet Food List Printable'],
  [4540678283, 'Lion Diet 30-Day Protocol & Meal Plan'],
  [4540695544, '30-Day Carnivore Meal Plan'],
  // Mixed-diet bundle. Gets the CW card because the CW calculator covers
  // carnivore, keto, low carb and pescatarian, so it serves every buyer of it.
  [4495089980, 'Low Carb Keto Carnivore Mega Bundle'],
];

const token = await getEtsyToken();
const headers = {
  'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`,
  Authorization: `Bearer ${token}`,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Etsy throttles hard enough that a 7-listing loop trips 429 partway through.
// Retry reads with backoff rather than reporting a rate limit as a failure.
const getJson = async (url, label, tries = 4) => {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers });
    if (r.ok) return r.json();
    if (r.status === 429 && i < tries - 1) {
      const wait = 2000 * (i + 1);
      console.log(`     rate limited on ${label}, waiting ${wait}ms`);
      await new Promise((res) => setTimeout(res, wait));
      continue;
    }
    throw new Error(`${label} ${r.status}`);
  }
};
const listing = (id) => getJson(
  `https://openapi.etsy.com/v3/application/listings/${id}?includes=Images,Videos`, `listing ${id} read`);
const files = async (id) => (await getJson(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`, `files ${id} read`)).results || [];

const pdf = readFileSync(SRC);
console.log(`Card: ${path.basename(SRC)} (${Math.round(pdf.length / 1024)} KB)`);
console.log(DRY ? 'DRY RUN — nothing will be written\n' : 'LIVE\n');

const done = [], skipped = [], failed = [];

for (const [id, label] of TARGETS) {
  await sleep(700);
  try {
    const before = await listing(id);
    const fBefore = await files(id);

    if (fBefore.length >= 5) { skipped.push([id, label, 'at Etsy 5-file cap']); console.log(`  SKIP ${id} ${label} — 5-file cap`); continue; }
    // Match on file id, not name: Etsy returns blank names on this endpoint, so
    // a name check silently misses and the POST then 400s as a duplicate.
    if (fBefore.some((f) => String(f.listing_file_id) === String(CARD_FILE_ID))) {
      skipped.push([id, label, 'card already attached']);
      console.log(`  SKIP ${id} ${label} — already has it`); continue;
    }

    if (DRY) { console.log(`  would add to ${id} ${label} (files ${fBefore.length} -> ${fBefore.length + 1})`); continue; }

    const form = new FormData();
    form.append('file', new Blob([pdf], { type: 'application/pdf' }), NAME);
    form.append('name', NAME);
    form.append('rank', String(fBefore.length + 1));

    const res = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`,
      { method: 'POST', headers, body: form });
    const body = await res.json();
    if (!res.ok) { failed.push([id, label, `${res.status} ${JSON.stringify(body).slice(0, 120)}`]); console.log(`  ❌ ${id} ${label}: ${res.status}`); continue; }

    const after = await listing(id);
    const fAfter = await files(id);
    const same =
      before.title === after.title &&
      before.price.amount === after.price.amount &&
      before.state === after.state &&
      before.description === after.description &&
      before.tags.join('|') === after.tags.join('|') &&
      before.materials.join('|') === after.materials.join('|') &&
      before.taxonomy_id === after.taxonomy_id &&
      before.images.length === after.images.length &&
      (before.videos || []).length === (after.videos || []).length &&
      fAfter.length === fBefore.length + 1 &&
      fBefore.every((b) => fAfter.some((a) => a.listing_file_id === b.listing_file_id));

    if (!same) { failed.push([id, label, 'POST-WRITE ASSERT FAILED — something else moved']); console.log(`  ❌ ${id} ${label}: ASSERT FAILED`); continue; }
    done.push([id, label, body.listing_file_id]);
    console.log(`  ✅ ${id} ${label} — file id ${body.listing_file_id}, files ${fBefore.length} -> ${fAfter.length}`);
    await sleep(900);
  } catch (e) {
    failed.push([id, label, String(e).slice(0, 140)]);
    console.log(`  ❌ ${id} ${label}: ${e}`);
  }
}

console.log(`\n=== added ${done.length} | skipped ${skipped.length} | failed ${failed.length}`);
for (const [id, l, fid] of done) console.log(`  added   ${id} ${l} -> file ${fid}`);
for (const [id, l, why] of skipped) console.log(`  skipped ${id} ${l} (${why})`);
for (const [id, l, why] of failed) console.log(`  FAILED  ${id} ${l} (${why})`);
process.exit(failed.length ? 1 : 0);
