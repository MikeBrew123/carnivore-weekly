#!/usr/bin/env node
/**
 * Finish the bonus-insert rollout: every remaining active listing gets a card.
 *
 * Split by diet, per Brew 2026-09-15: carnivore and lion (and mixed-diet bundles,
 * because the CW calculator covers all four diets) get the CW card and ETSY50;
 * everything else gets the KetoDial card and ETSY25. The point of the KD half is
 * to send Etsy buyers to ketodial.com, which has traffic to spare.
 *
 * FILES ONLY. Nothing else on any listing is written. Each listing is read before
 * and after and every other field asserted byte-identical, because a full-object
 * update wiped 7 of 8 images on two listings on 2026-08-10.
 *
 * NOT TOUCHED, deliberately:
 *   4464219356  the bestseller. The standing rule needs Brew's fresh word first.
 *   4545921306  Blood Pressure Log      ) 3 views and 0 sales between them; an
 *   4550536874  Doctor Visit Prep Kit   ) insert buys nothing here.
 *
 * Skips rather than forces when a listing is at Etsy's 5-file cap or already
 * holds the card. Duplicate detection keys on FILE ID, not name: this endpoint
 * returns blank names, so a name check silently misses and the POST then 400s.
 *
 * Usage:
 *   node etsy/add-insert-rollout.mjs --dry-run
 *   node etsy/add-insert-rollout.mjs --deck cw
 *   node etsy/add-insert-rollout.mjs --deck kd
 */

import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const DRY = process.argv.includes('--dry-run');
const deckArg = process.argv.indexOf('--deck');
// indexOf returns -1 when the flag is absent, and argv[0] is the node binary, so
// the naive `argv[indexOf + 1]` silently selects a deck that matches nothing.
const only = deckArg === -1 ? '' : (process.argv[deckArg + 1] || '').toLowerCase();
const SHOP = 63916912;

const CARDS = {
  cw: {
    src: path.resolve(import.meta.dirname, 'products/pdfs/bonus-insert-calculator.pdf'),
    name: 'Free-Calculator-50-Percent-Off.pdf',
    // Etsy dedupes identical uploads to ONE id shared across every listing.
    knownId: '1515218127430',
    targets: [
      [4464128243, 'Carnivore Grocery List'],
      [4495055944, 'Carnivore Diet Food Cheat Sheet'],
      [4495083274, 'Carnivore Diet Guide & 14-Day Tracker'],
      [4513517597, 'Carnivore Diet Food List (Animal Foods Chart)'],
      [4513518762, 'Lion Diet Food List (Elimination Chart)'],
      [4513508118, 'Carnivore Diet Food Pyramid Poster'],
      [4513506781, 'Lion Diet Food Pyramid Poster'],
      [4513508150, 'Diet Pyramids Bundle (mixed)'],
      [4464217665, 'Diet Food List Printable Bundle (mixed)'],
    ],
  },
  kd: {
    src: path.resolve(import.meta.dirname, 'products/pdfs/bonus-insert-kd-calculator.pdf'),
    name: 'Free-KetoDial-Calculator-25-Percent-Off.pdf',
    knownId: null, // first upload of this card; learned from the first response
    targets: [
      [4495077741, 'Keto Diet Starter Bundle'],
      [4495083342, 'Low Carb Diet Guide & 14-Day Tracker'],
      [4495083454, 'Low Carb Diet Starter Bundle'],
      [4489982664, 'Modern Keto Diet Food List'],
      [4495049647, 'Keto Food Cheat Sheet'],
      [4482132169, 'Mediterranean Diet Food List Poster'],
      [4540695558, '28-Day Keto Meal Plan'],
      [4540695566, '28-Day Low Carb Meal Plan'],
      [4540695590, '30-Day Pescatarian Low Carb Meal Plan'],
      [4540695604, '7-Day Mediterranean Meal Plan'],
      [4513433391, '20 Keto Dessert Recipe Cards'],
      [4464217699, 'Pescatarian Diet Food List'],
      [4532542805, 'Keto Starter Kit'],
      [4495077633, 'Keto Diet Guide & 14-Day Tracker'],
      [4495056564, 'Low Carb Food Cheat Sheet'],
      [4516511462, 'Anti-Inflammatory Food List'],
      [4516511480, 'Low Carb Anti-Inflammatory Food List'],
      [4516511490, 'Keto Anti-Inflammatory Food List'],
      [4514204763, 'Keto Grocery List Printable Bundle'],
      [4513518746, 'Pescatarian Low Carb Food List'],
      [4513518786, 'Mediterranean Diet Food List Printable'],
      [4513508098, 'Keto Food Pyramid Poster'],
    ],
  },
};

const token = await getEtsyToken();
const headers = {
  'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`,
  Authorization: `Bearer ${token}`,
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A 30-listing loop trips Etsy's rate limit partway through. Retry reads with
// backoff rather than reporting a 429 as a failure.
const getJson = async (url, label, tries = 5) => {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, { headers });
    if (r.ok) return r.json();
    if (r.status === 429 && i < tries - 1) {
      const wait = 2000 * (i + 1);
      console.log(`     rate limited on ${label}, waiting ${wait}ms`);
      await sleep(wait);
      continue;
    }
    throw new Error(`${label} ${r.status}`);
  }
};
const listing = (id) => getJson(
  `https://openapi.etsy.com/v3/application/listings/${id}?includes=Images,Videos`, `listing ${id} read`);
const files = async (id) => (await getJson(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`, `files ${id} read`)).results || [];

const done = [], skipped = [], failed = [];

for (const [deck, card] of Object.entries(CARDS)) {
  if (only && only !== deck) continue;
  const pdf = readFileSync(card.src);
  let cardId = card.knownId;
  console.log(`\n=== ${deck.toUpperCase()} card: ${path.basename(card.src)} (${Math.round(pdf.length / 1024)} KB), ${card.targets.length} listings`);
  console.log(DRY ? 'DRY RUN — nothing will be written' : 'LIVE');

  for (const [id, label] of card.targets) {
    await sleep(700);
    try {
      const before = await listing(id);
      const fBefore = await files(id);

      if (cardId && fBefore.some((f) => String(f.listing_file_id) === String(cardId))) {
        skipped.push([deck, id, label, 'card already attached']);
        console.log(`  SKIP ${id} ${label} — already has it`); continue;
      }
      if (fBefore.length >= 5) {
        skipped.push([deck, id, label, 'at Etsy 5-file cap']);
        console.log(`  SKIP ${id} ${label} — 5-file cap`); continue;
      }
      if (DRY) { console.log(`  would add to ${id} ${label} (files ${fBefore.length} -> ${fBefore.length + 1})`); continue; }

      const form = new FormData();
      form.append('file', new Blob([pdf], { type: 'application/pdf' }), card.name);
      form.append('name', card.name);
      form.append('rank', String(fBefore.length + 1)); // last, so the product stays first

      const res = await fetch(
        `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${id}/files`,
        { method: 'POST', headers, body: form });
      const body = await res.json();
      if (!res.ok) {
        failed.push([deck, id, label, `${res.status} ${JSON.stringify(body).slice(0, 120)}`]);
        console.log(`  ❌ ${id} ${label}: ${res.status} ${JSON.stringify(body).slice(0, 120)}`); continue;
      }
      if (!cardId) { cardId = String(body.listing_file_id); console.log(`     card file id is ${cardId}`); }

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

      if (!same) {
        failed.push([deck, id, label, 'POST-WRITE ASSERT FAILED — something else moved']);
        console.log(`  ❌ ${id} ${label}: ASSERT FAILED`); continue;
      }
      done.push([deck, id, label, body.listing_file_id]);
      console.log(`  ✅ ${id} ${label} — files ${fBefore.length} -> ${fAfter.length}`);
      await sleep(900);
    } catch (e) {
      failed.push([deck, id, label, String(e).slice(0, 140)]);
      console.log(`  ❌ ${id} ${label}: ${e}`);
    }
  }
}

console.log(`\n=== added ${done.length} | skipped ${skipped.length} | failed ${failed.length}`);
for (const [d, id, l, fid] of done) console.log(`  added   ${d} ${id} ${l} -> file ${fid}`);
for (const [d, id, l, why] of skipped) console.log(`  skipped ${d} ${id} ${l} (${why})`);
for (const [d, id, l, why] of failed) console.log(`  FAILED  ${d} ${id} ${l} (${why})`);
process.exit(failed.length ? 1 : 0);
