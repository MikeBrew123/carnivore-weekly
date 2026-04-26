#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const secrets = JSON.parse(readFileSync('../secrets/api-keys.json', 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;
const SHARED_SECRET = secrets.etsy.shared_secret;
const SHOP_ID = 63916912;
const MOCKUPS = resolve(import.meta.dirname, '../etsy-mockups');

// ── Image mapping ──────────────────────────────────────────
// Food Framework listings have WRONG images (troubleshooting instead of food)
// Troubleshooting Desktop/Mobile are SHORT on images (only 1 each)

const DELETES = {
  // Food Desktop — all 3 images are wrong (troubleshooting content)
  4451067037: [7745391587, 7745391589, 7697444510],
  // Food Mobile — all 3 images are wrong
  4451070758: [7745390477, 7697443510, 7697443512],
  // Food Bundle — all 4 images are wrong
  4451072926: [7697441464, 7745388509, 7745388511, 7697441468],
};

const UPLOADS = {
  // Food Desktop — upload food framework mockups
  4451067037: [
    { file: 'food_framework_hero_tablet.png', rank: 1 },
    { file: 'food_framework_dual_devices.png', rank: 2 },
    { file: 'food_framework_flat_lay.png', rank: 3 },
  ],
  // Food Mobile — upload food framework mobile mockups
  4451070758: [
    { file: 'food_framework_mobile.png', rank: 1 },
    { file: 'food_framework_hero_tablet.png', rank: 2 },
    { file: 'food_framework_flat_lay.png', rank: 3 },
  ],
  // Food Bundle — upload food framework bundle mockups
  4451072926: [
    { file: 'food_framework_dual_devices.png', rank: 1 },
    { file: 'food_framework_hero_tablet.png', rank: 2 },
    { file: 'food_framework_flat_lay.png', rank: 3 },
    { file: 'food_framework_mobile.png', rank: 4 },
  ],
  // Troubleshooting Desktop — add missing mockups (keep existing rank 1)
  4451073001: [
    { file: 'troubleshooting_dual_devices.png', rank: 2 },
    { file: 'troubleshooting_flat_lay.png', rank: 3 },
    { file: 'troubleshooting_hero_tablet.png', rank: 4 },
  ],
  // Troubleshooting Mobile — add missing mockups (keep existing rank 1)
  4451076646: [
    { file: 'troubleshooting_flat_lay.png', rank: 2 },
    { file: 'troubleshooting_hero_tablet.png', rank: 3 },
    { file: 'troubleshooting_mobile.png', rank: 4 },
  ],
};

async function run() {
  // Get token
  const tokenRes = await fetch('https://api.etsy.com/v3/public/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: secrets.etsy.refresh_token
    })
  });
  const tokens = await tokenRes.json();
  if (tokens.error) { console.error('Token error:', tokens); return; }
  if (tokens.refresh_token !== secrets.etsy.refresh_token) {
    secrets.etsy.refresh_token = tokens.refresh_token;
    writeFileSync('../secrets/api-keys.json', JSON.stringify(secrets, null, 2));
  }

  const hdrs = {
    'x-api-key': `${CLIENT_ID}:${SHARED_SECRET}`,
    'Authorization': `Bearer ${tokens.access_token}`
  };

  // ── Phase 1: Delete wrong images ──
  console.log('=== PHASE 1: Deleting wrong images ===\n');
  for (const [listingId, imageIds] of Object.entries(DELETES)) {
    for (const imageId of imageIds) {
      const url = `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${listingId}/images/${imageId}`;
      const res = await fetch(url, { method: 'DELETE', headers: hdrs });
      if (res.status === 204 || res.ok) {
        console.log(`  ${listingId}: deleted image ${imageId} ✓`);
      } else {
        const err = await res.text();
        console.log(`  ${listingId}: FAILED to delete ${imageId} — ${res.status} ${err}`);
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // ── Phase 2: Upload correct images ──
  console.log('\n=== PHASE 2: Uploading correct images ===\n');
  for (const [listingId, images] of Object.entries(UPLOADS)) {
    for (const img of images) {
      const filePath = resolve(MOCKUPS, img.file);
      const imageBuffer = readFileSync(filePath);
      const blob = new Blob([imageBuffer], { type: 'image/png' });

      const formData = new FormData();
      formData.append('image', blob, img.file);
      formData.append('rank', String(img.rank));

      const url = `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${listingId}/images`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': `${CLIENT_ID}:${SHARED_SECRET}`,
          'Authorization': `Bearer ${tokens.access_token}`
        },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`  ${listingId}: uploaded ${img.file} → rank ${img.rank} ✓ (id: ${data.listing_image_id})`);
      } else {
        const err = await res.text();
        console.log(`  ${listingId}: FAILED ${img.file} — ${res.status} ${err}`);
      }
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n=== Done ===');
}
run().catch(e => console.error(e));
