#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const secrets = JSON.parse(readFileSync('../secrets/api-keys.json', 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;
const SHARED_SECRET = secrets.etsy.shared_secret;
const SHOP_ID = 63916912;
const TEST_LISTING = 4451046699; // Macros Desktop

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

  // First verify we can GET the listing
  console.log('1. Testing GET single listing...');
  const getUrl = `https://openapi.etsy.com/v3/application/listings/${TEST_LISTING}`;
  const getRes = await fetch(getUrl, { headers: hdrs });
  console.log('   GET status:', getRes.status);
  const getListing = await getRes.json();
  console.log('   Title:', getListing.title || getListing.error);

  // Try PATCH instead of PUT
  console.log('\n2. Testing PATCH update...');
  const patchUrl = `https://openapi.etsy.com/v3/application/shops/${SHOP_ID}/listings/${TEST_LISTING}`;
  console.log('   URL:', patchUrl);
  const patchBody = new URLSearchParams();
  patchBody.append('tags', 'carnivore macros,carnivore diet guide,macro calculator pdf,keto macros,low carb macros,protein calculator,printable worksheet,zero carb,meat based diet,animal based,fat loss guide,carnivore pdf,instant download');
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: patchBody
  });
  console.log('   PATCH status:', patchRes.status);
  const patchData = await patchRes.json();
  console.log('   Response:', JSON.stringify(patchData).substring(0, 300));

  // Try PUT with just tags
  console.log('\n3. Testing PUT with minimal body...');
  const putBody = new URLSearchParams();
  putBody.append('tags', 'carnivore macros,test tag');
  const putRes = await fetch(patchUrl, {
    method: 'PUT',
    headers: { ...hdrs, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: putBody
  });
  console.log('   PUT status:', putRes.status);
  const putData = await putRes.json();
  console.log('   Response:', JSON.stringify(putData).substring(0, 300));

  // Try PUT with JSON body
  console.log('\n4. Testing PUT with JSON body...');
  const jsonRes = await fetch(patchUrl, {
    method: 'PUT',
    headers: { ...hdrs, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: ['carnivore macros', 'test tag'] })
  });
  console.log('   PUT JSON status:', jsonRes.status);
  const jsonData = await jsonRes.json();
  console.log('   Response:', JSON.stringify(jsonData).substring(0, 300));
}

run().catch(e => console.error(e));
