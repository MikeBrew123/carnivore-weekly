#!/usr/bin/env node
import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;

const token = await getEtsyToken();

const headers = {
  'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  'Authorization': 'Bearer ' + token
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
