#!/usr/bin/env node
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;
const SHARED_SECRET = ETSY_SHARED_SECRET;
const SHOP_ID = 63916912;

async function run() {
  const token = await getEtsyToken();

  const hdrs = {
    'x-api-key': `${CLIENT_ID}:${SHARED_SECRET}`,
    'Authorization': `Bearer ${token}`
  };

  // Get all listings
  const listingsRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings?limit=25&includes=Images`, { headers: hdrs });
  const listings = await listingsRes.json();

  for (const l of (listings.results || [])) {
    console.log(`\n${l.listing_id} — ${l.title.substring(0, 60)}`);
    console.log(`  Images: ${(l.images || []).length}`);
    for (const img of (l.images || [])) {
      console.log(`    - ${img.listing_image_id}: ${img.url_75x75} | rank: ${img.rank} | ${img.url_fullxfull?.split('/').pop()}`);
    }
  }
}
run().catch(e => console.error(e));
