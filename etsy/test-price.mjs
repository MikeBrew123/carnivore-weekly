#!/usr/bin/env node
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;
const SHARED_SECRET = ETSY_SHARED_SECRET;
const SHOP_ID = 63916912;
const TEST_LISTING = 4451046699;

async function run() {
  const token = await getEtsyToken();

  const hdrs = {
    'x-api-key': `${CLIENT_ID}:${SHARED_SECRET}`,
    'Authorization': `Bearer ${token}`
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
