#!/usr/bin/env node
// Revert the 2026-08-10 food-list image build-out (Test 1).
//
// Deletes the 6 images added at ranks 3-8 on each treated listing. Ranks 1-2 are
// the original hero and second image and are left alone, so this restores the
// listings to exactly their pre-2026-08-10 gallery.
//
// Dry run by default. Pass --confirm to actually delete.
//
//   node etsy/image-test-revert.mjs            # show what would be deleted
//   node etsy/image-test-revert.mjs --confirm  # do it
//
// If ranks 1-2 are ever lost, the originals are in etsy/_build/restore/.

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const MARKER = join(HERE, '..', 'reports', 'etsy-image-test-2026-08-10.json');
const SHOP = 63916912;

const marker = JSON.parse(readFileSync(MARKER, 'utf8'));
const { delete_image_ids: toDelete, keep_image_ids: toKeep } = marker.revert;
const confirm = process.argv.includes('--confirm');

const token = await getEtsyToken();
const headers = {
  'x-api-key': ETSY_CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  'Authorization': 'Bearer ' + token,
};

console.log(`Test: ${marker.test}`);
console.log(`Applied ${marker.change_made_at}. Revert rule: ${marker.decision_rules.REVERT}\n`);

for (const [listingId, ids] of Object.entries(toDelete)) {
  // Safety: confirm live state still matches the marker before removing anything.
  const live = await (await fetch(
    `https://openapi.etsy.com/v3/application/listings/${listingId}?includes=Images`, { headers })).json();
  const liveIds = (live.images || []).map(i => i.listing_image_id);
  const missing = ids.filter(id => !liveIds.includes(id));
  const keepMissing = toKeep[listingId].filter(id => !liveIds.includes(id));

  console.log(`Listing ${listingId} (${live.title ? live.title.slice(0, 45) : ''})`);
  console.log(`  live images: ${liveIds.length}`);
  if (keepMissing.length) {
    console.log(`  ABORT: original image(s) ${keepMissing.join(', ')} are no longer live.`);
    console.log(`  Re-upload from etsy/_build/restore/ before reverting. Skipping this listing.`);
    continue;
  }
  if (missing.length) {
    console.log(`  WARNING: ${missing.length} of the added images are already gone (${missing.join(', ')}).`);
    console.log(`  The gallery has changed since the marker was written. Skipping this listing.`);
    continue;
  }

  for (const id of ids) {
    if (!confirm) {
      console.log(`  would delete image ${id}`);
      continue;
    }
    const res = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/images/${id}`,
      { method: 'DELETE', headers });
    console.log(`  delete ${id}: ${res.status === 204 ? 'ok' : 'FAILED ' + res.status + ' ' + await res.text()}`);
    await new Promise(r => setTimeout(r, 400));
  }
  console.log(`  keeping ranks 1-2: ${toKeep[listingId].join(', ')}\n`);
}

if (!confirm) console.log('\nDry run. Nothing was changed. Pass --confirm to execute.');
