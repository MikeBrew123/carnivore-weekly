#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

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
}

const headers = {
  'x-api-key': CLIENT_ID + ':' + secrets.etsy.shared_secret,
  'Authorization': 'Bearer ' + tokens.access_token
};
const SHOP = 63916912;

const uploads = [
  { listingId: 4464128243, image: '/tmp/etsy-grocery-mockup.png', name: 'grocery-mockup' },
  { listingId: 4464128247, image: '/tmp/etsy-mealplan-mockup.png', name: 'mealplan-mockup' }
];

for (const u of uploads) {
  console.log(`Uploading image for listing ${u.listingId}...`);
  const imgData = readFileSync(u.image);
  const blob = new Blob([imgData], { type: 'image/png' });
  const form = new FormData();
  form.append('image', blob, u.name + '.png');

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${u.listingId}/images`,
    { method: 'POST', headers, body: form }
  );
  const data = await res.json();
  if (res.ok) {
    console.log(`Uploaded image: ${data.listing_image_id}`);
  } else {
    console.error(`Error ${res.status}:`, JSON.stringify(data));
  }
}
