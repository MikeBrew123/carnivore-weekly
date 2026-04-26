#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const secrets = JSON.parse(readFileSync('../secrets/api-keys.json', 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;
const SHARED_SECRET = secrets.etsy.shared_secret;
const SHOP_ID = 63916912;
const TEST_LISTING = 4451046699;

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

  // First get current price details
  console.log('Current listing price info:');
  const getRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${TEST_LISTING}`, { headers: hdrs });
  const listing = await getRes.json();
  console.log('  price object:', JSON.stringify(listing.price));
  console.log('  currency:', listing.currency_code);

  // Test 1: price as string "7.99"
  console.log('\nTest 1: price as string "7.99"');
  const body1 = new URLSearchParams();
  body1.append('price', '7.99');
  const res1 = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${TEST_LISTING}`, {
    method: 'PATCH',
    headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body1
  });
  const data1 = await res1.json();
  console.log('  status:', res1.status);
  console.log('  new price:', JSON.stringify(data1.price || data1.error));

  // Test 2: price as integer cents 799
  console.log('\nTest 2: price as integer 799 (cents)');
  const body2 = new URLSearchParams();
  body2.append('price', '799');
  const res2 = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${TEST_LISTING}`, {
    method: 'PATCH',
    headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body2
  });
  const data2 = await res2.json();
  console.log('  status:', res2.status);
  console.log('  new price:', JSON.stringify(data2.price || data2.error));

  // Verify final state
  console.log('\nFinal state:');
  const finalRes = await fetch(`https://openapi.etsy.com/v3/application/listings/${TEST_LISTING}`, { headers: hdrs });
  const finalListing = await finalRes.json();
  console.log('  price:', JSON.stringify(finalListing.price));
  console.log('  currency:', finalListing.currency_code);
}

run().catch(e => console.error(e));
