#!/usr/bin/env node
import { readFileSync } from 'fs';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;

const token = await getEtsyToken();

const headers = {
  'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  'Authorization': 'Bearer ' + token
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
