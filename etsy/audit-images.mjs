#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const secrets = JSON.parse(readFileSync('../secrets/api-keys.json', 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;
const SHARED_SECRET = secrets.etsy.shared_secret;
const SHOP_ID = 63916912;

async function run() {
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
