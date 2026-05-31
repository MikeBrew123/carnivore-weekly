#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const secrets = JSON.parse(readFileSync('../secrets/api-keys.json', 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;

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
if (tokens.error) { console.error('Token error:', tokens); process.exit(1); }
if (tokens.refresh_token !== secrets.etsy.refresh_token) {
  secrets.etsy.refresh_token = tokens.refresh_token;
  writeFileSync('../secrets/api-keys.json', JSON.stringify(secrets, null, 2));
  console.log('Token rotated');
}

const headers = {
  'x-api-key': CLIENT_ID + ':' + secrets.etsy.shared_secret,
  'Authorization': 'Bearer ' + tokens.access_token
};

const SHOP = 63916912;

const uploads = [
  { listingId: 4464128243, file: 'products/pdfs/grocery-list.pdf', name: 'Carnivore-Grocery-List.pdf' },
  { listingId: 4464128247, file: 'products/pdfs/meal-plan-30day.pdf', name: '30-Day-Carnivore-Meal-Plan.pdf' }
];

for (const u of uploads) {
  console.log(`Uploading ${u.name} to listing ${u.listingId}...`);
  const fileData = readFileSync(u.file);
  const blob = new Blob([fileData], { type: 'application/pdf' });

  const form = new FormData();
  form.append('file', blob, u.name);
  form.append('name', u.name);

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${u.listingId}/files`,
    { method: 'POST', headers, body: form }
  );
  const data = await res.json();
  if (res.ok) {
    console.log(`Uploaded: ${data.listing_file_id || 'ok'}`);
  } else {
    console.error(`Error ${res.status}:`, JSON.stringify(data));
  }
}
