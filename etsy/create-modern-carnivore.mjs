#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const VARIANTS_DIR = path.resolve(import.meta.dirname, 'products/variants');
const secrets = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../secrets/api-keys.json'), 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;
const SHOP = 63916912;

// Auth
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
if (tokens.refresh_token && tokens.refresh_token !== secrets.etsy.refresh_token) {
  secrets.etsy.refresh_token = tokens.refresh_token;
  writeFileSync(path.resolve(import.meta.dirname, '../secrets/api-keys.json'), JSON.stringify(secrets, null, 2));
}
const headers = {
  'x-api-key': CLIENT_ID + ':' + secrets.etsy.shared_secret,
  'Authorization': 'Bearer ' + tokens.access_token
};

const listing = {
  title: 'Modern Carnivore Diet Food List Printable | Minimalist Meat Guide | Editorial Kitchen Wall Art | Rare Find PDF',
  description: `RARE. WELL DONE. (The print, not the steak.)

A modern carnivore food list that actually looks good on your fridge. No vintage butcher shop vibes, no distressed textures — just clean Swiss-grid typography, deep burgundy accents, and every animal food worth eating. Meat the upgrade your kitchen's been waiting for.

WHAT'S INCLUDED
• 1 printable PDF (8.5x11, print-ready)
• Complete carnivore food list: beef, organ meats, pork, eggs & dairy, poultry, animal fats, fish & seafood, beverages
• Minimalist line icons, editorial layout
• Printer-friendly design — minimal ink usage

PERFECT FOR
• Modern kitchens that don't do farmhouse
• Gifting the carnivore in your life (they'll be well-done with cheesy prints)
• Anyone who wants the info without the kitsch

FILE INFO
Instant digital download. 1 PDF file. Print at home or send to a print shop. No physical product ships. Personal use only.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available.

By CarnivoreWeekly — no-bullshit carnivore resources.`,
  price: 4.49,
  tags: 'modern kitchen art,minimalist print,editorial wall art,carnivore gift,meat lover gift,modern food print,minimalist poster,kitchen wall decor,foodie gift,swiss design print,carnivore printable,diet wall art,modern food chart',
  pdf: 'carnivore-modern-v2-print.pdf',
  image: 'carnivore-modern-v2-print.jpg'
};

console.log(`Creating listing: ${listing.title.slice(0, 60)}...`);
const createRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    title: listing.title,
    description: listing.description,
    quantity: '999',
    price: String(listing.price),
    who_made: 'i_did',
    when_made: 'made_to_order',
    taxonomy_id: '69',
    type: 'download',
    is_digital: 'true',
    tags: listing.tags
  })
});
const created = await createRes.json();
if (!createRes.ok) {
  console.error('Create failed:', JSON.stringify(created, null, 2));
  process.exit(1);
}
const listingId = created.listing_id;
console.log(`  ✅ Created listing ${listingId} (DRAFT)`);

// Upload PDF
console.log('Uploading PDF...');
const pdfData = readFileSync(path.join(VARIANTS_DIR, listing.pdf));
const pdfForm = new FormData();
pdfForm.append('file', new Blob([pdfData], { type: 'application/pdf' }), listing.pdf);
pdfForm.append('name', listing.pdf);
const pdfRes = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/files`,
  { method: 'POST', headers, body: pdfForm }
);
const pdfResult = await pdfRes.json();
console.log(pdfRes.ok ? `  ✅ PDF uploaded` : `  ❌ PDF: ${JSON.stringify(pdfResult).slice(0,200)}`);

// Upload image
console.log('Uploading image...');
const imgData = readFileSync(path.join(VARIANTS_DIR, listing.image));
const imgForm = new FormData();
imgForm.append('image', new Blob([imgData], { type: 'image/jpeg' }), listing.image);
const imgRes = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/images`,
  { method: 'POST', headers, body: imgForm }
);
const imgResult = await imgRes.json();
console.log(imgRes.ok ? `  ✅ Image uploaded` : `  ❌ Image: ${JSON.stringify(imgResult).slice(0,200)}`);

console.log(`\n=== DONE ===`);
console.log(`Listing ID: ${listingId}`);
console.log(`URL: https://www.etsy.com/listing/${listingId}`);
console.log(`Status: DRAFT — review & publish in Etsy seller dashboard`);
