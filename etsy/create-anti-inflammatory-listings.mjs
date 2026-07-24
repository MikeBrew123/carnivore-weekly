#!/usr/bin/env node
/**
 * Create 3 Anti-Inflammatory Food Guide listings on Etsy
 * Same product, different titles/tags targeting different search audiences
 * Price: $1.49 CAD (volume test)
 */
import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;
const SHOP = 63916912;

// Auth — valid token from the shared Supabase store (single source of truth).
const token = await getEtsyToken();
const headers = {
  'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  'Authorization': 'Bearer ' + token
};
console.log('Authenticated\n');

const listings = [
  {
    name: 'Anti-Inflammatory Food Guide',
    title: 'Anti-Inflammatory Food Guide Printable | Eat Limit Avoid Chart | Large Print Kitchen Poster PDF',
    tags: ['anti inflammatory','arthritis diet','joint pain food','inflammation food','gut health diet','IBD food list','food guide chart','kitchen poster','large print chart','eat avoid list','anti inflame foods','fridge food chart','printable diet'],
    description: `I made this for my grandmother. She has arthritis and kept asking me "but what CAN I eat?" Every article she found was 20 pages long with conflicting advice. So I sat down and made her a simple one-page chart she could stick on the fridge. Three columns. Eat freely. Limit. Avoid. Done.

That's what you're getting here. No complicated meal plans. No recipes you won't make. Just a clear, large-print food guide you can reference every time you open the fridge or walk into a grocery store.

You get 2 files:
- Anti-Inflammatory Food Guide (1 page, large print)
- Getting Started Bonus with printing tips and an important note about talking to your doctor

Print it. Stick it on the fridge. You'll actually use this one.

All sales are final. Due to the digital nature of this product, refunds or exchanges are not available.

For personal use only. Digital download. A CarnivoreWeekly.com original.`
  },
  {
    name: 'Low Carb Anti-Inflammatory',
    title: 'Low Carb Anti-Inflammatory Food List | Large Print Diet Chart | Printable Kitchen Poster PDF',
    tags: ['low carb foods','anti inflammatory','joint pain diet','cholesterol food','metabolic syndrome','large print chart','diet food list','kitchen poster','eat avoid chart','inflammation diet','low carb chart','printable food','blood sugar food'],
    description: `My grandmother has arthritis and she was drowning in confusing nutrition advice. So I made her a simple chart for the fridge. One page. Three columns. What to eat, what to limit, what to avoid. She didn't need a textbook. She needed clarity.

If you're eating low carb and trying to reduce inflammation, this is for you. It's focused on foods that won't spike your blood sugar or trigger inflammatory responses. No guesswork at the grocery store. No scrolling through articles at dinner time.

You get 2 files:
- Anti-Inflammatory Food Chart (1 page, large print)
- Getting Started Bonus with printing tips and an important note about talking to your doctor

Print it, put it where you'll see it, and stop second-guessing every meal.

All sales are final. Due to the digital nature of this product, refunds or exchanges are not available.

For personal use only. Digital download. A CarnivoreWeekly.com original.`
  },
  {
    name: 'Keto Anti-Inflammatory',
    title: 'Keto Anti-Inflammatory Food List Printable | Large Print Diet Chart | Kitchen Poster PDF',
    tags: ['keto food list','anti inflammatory','ketogenic diet','low carb keto','arthritis keto','gut health keto','large print chart','keto kitchen','eat avoid chart','keto printable','inflammation keto','fridge poster','keto food guide'],
    description: `I originally made this for my grandmother. She's got arthritis and was tired of conflicting advice about what to eat. I gave her a one-page chart for the fridge and she actually started using it. That's when I knew it worked.

This version is built for keto. If you're already eating ketogenic and want to double down on reducing inflammation, this tells you exactly which foods to prioritize and which ones to skip. Simple Eat, Limit, Avoid columns. Large print so you can read it from across the kitchen.

You get 2 files:
- Anti-Inflammatory Food Guide (1 page, large print)
- Getting Started Bonus with printing tips and an important note about talking to your doctor

Stick it on the fridge. Reference it at the store. Done.

All sales are final. Due to the digital nature of this product, refunds or exchanges are not available.

For personal use only. Digital download. A CarnivoreWeekly.com original.`
  }
];

const PDFS = [
  'products/pdfs/anti-inflammatory-food-guide.pdf',
  'products/pdfs/anti-inflammatory-getting-started.pdf'
];

const created = [];

for (const l of listings) {
  console.log(`Creating: ${l.name}...`);

  const body = {
    quantity: 999,
    title: l.title,
    description: l.description,
    price: 1.49,
    who_made: 'i_did',
    when_made: '2020_2026',
    taxonomy_id: 69,  // Art & Collectibles > Prints > Digital Prints
    tags: l.tags,
    type: 'download',
    is_digital: true,
    should_auto_renew: true,
    language: 'en-US',
  };

  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings`,
    { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );

  const data = await res.json();
  if (data.listing_id) {
    console.log(`  Created: ${data.listing_id}`);
    created.push({ ...l, listingId: data.listing_id });
  } else {
    console.error(`  FAILED:`, JSON.stringify(data).substring(0, 300));
  }
}

// Upload PDF files to each listing
for (const l of created) {
  console.log(`\nUploading files to ${l.name} (${l.listingId})...`);
  for (const pdfRel of PDFS) {
    const pdfPath = path.resolve(import.meta.dirname, pdfRel);
    const pdfName = path.basename(pdfPath);
    const fileData = readFileSync(pdfPath);

    const form = new FormData();
    form.append('file', new Blob([fileData], { type: 'application/pdf' }), pdfName);

    const uploadRes = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.listingId}/files`,
      { method: 'POST', headers: { 'x-api-key': headers['x-api-key'], 'Authorization': headers['Authorization'] }, body: form }
    );

    if (uploadRes.ok) {
      console.log(`  Uploaded: ${pdfName}`);
    } else {
      const err = await uploadRes.text();
      console.error(`  FAILED ${pdfName}:`, err.substring(0, 200));
    }
  }
}

console.log('\n=== RESULTS ===');
for (const l of created) {
  console.log(`${l.name}: https://www.etsy.com/listing/${l.listingId}`);
}
