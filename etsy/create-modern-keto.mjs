#!/usr/bin/env node
import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const VARIANTS_DIR = path.resolve(import.meta.dirname, 'products/variants');
const CLIENT_ID = ETSY_CLIENT_ID;
const SHOP = 63916912;

const token = await getEtsyToken();
const headers = {
  'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  'Authorization': 'Bearer ' + token
};

const listing = {
  title: 'Modern Keto Diet Food List Printable | Minimalist Low Carb Chart | Editorial Kitchen Wall Art | Keto Cheat Sheet PDF',
  description: `FAT CHANCE you'll find a keto chart this clean. (Okay, pretty good chance now.)

A modern keto food list that actually earns its spot on your fridge. No distressed textures, no farmhouse kitsch — just bold Swiss-grid typography, deep burgundy accents, and every fat-fueled food worth eating. The cheat sheet that doesn't feel like cheating.

WHAT'S INCLUDED
• 1 printable PDF (8.5x11, print-ready)
• Complete keto food list: meats, seafood, eggs & dairy, healthy fats, low-carb veggies, avocados & berries, nuts & seeds, condiments, beverages
• Clear "avoid" section (sugar, grains, bread, starches)
• Minimalist line icons, editorial layout
• Printer-friendly — minimal ink usage

PERFECT FOR
• Modern kitchens that don't do rustic
• Gifting the keto friend who takes macros seriously (butter late than never)
• Ketosis without the chaos — info at a glance, no apps required

FILE INFO
Instant digital download. 1 PDF file. Print at home or send to a print shop. No physical product ships. Personal use only.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available.

By CarnivoreWeekly — no-bullshit low-carb resources.`,
  price: 4.49,
  tags: 'modern keto print,minimalist keto,editorial wall art,keto gift,low carb gift,modern food print,minimalist poster,keto kitchen decor,foodie gift,swiss design print,keto cheat sheet,macro wall art,modern food chart',
  pdf: 'keto-modern-v1-print.pdf',
  image: 'keto-modern-v1-print.jpg'
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
    when_made: '2020_2026',
    taxonomy_id: '69',
    type: 'download',
    is_digital: 'true',
    tags: listing.tags
  })
});
const created = await createRes.json();
if (!createRes.ok) { console.error('Create failed:', JSON.stringify(created, null, 2)); process.exit(1); }
const listingId = created.listing_id;
console.log(`  ✅ Created listing ${listingId} (DRAFT)`);

console.log('Uploading PDF...');
const pdfData = readFileSync(path.join(VARIANTS_DIR, listing.pdf));
const pdfForm = new FormData();
pdfForm.append('file', new Blob([pdfData], { type: 'application/pdf' }), listing.pdf);
pdfForm.append('name', listing.pdf);
const pdfRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/files`, { method: 'POST', headers, body: pdfForm });
console.log(pdfRes.ok ? `  ✅ PDF uploaded` : `  ❌ PDF: ${JSON.stringify(await pdfRes.json()).slice(0,200)}`);

console.log('Uploading image...');
const imgData = readFileSync(path.join(VARIANTS_DIR, listing.image));
const imgForm = new FormData();
imgForm.append('image', new Blob([imgData], { type: 'image/jpeg' }), listing.image);
const imgRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/images`, { method: 'POST', headers, body: imgForm });
console.log(imgRes.ok ? `  ✅ Image uploaded` : `  ❌ Image: ${JSON.stringify(await imgRes.json()).slice(0,200)}`);

console.log(`\n=== DONE ===`);
console.log(`Listing ID: ${listingId}`);
console.log(`URL: https://www.etsy.com/listing/${listingId}`);
console.log(`Status: DRAFT — review & publish in Etsy seller dashboard`);
