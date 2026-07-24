#!/usr/bin/env node
// Create the 3 new "magazine-style" cheat sheet listings as Etsy DRAFTS.
// Copy by Sarah (writer agent). Listings stay as drafts until Mike publishes
// from the Etsy seller dashboard.
import { readFileSync } from 'fs';
import path from 'path';
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const PRODUCTS_DIR = path.resolve(import.meta.dirname, 'products');
const CLIENT_ID = ETSY_CLIENT_ID;
const SHOP = 63916912;

// --- Auth --- valid token from the shared Supabase store (single source of truth).
console.log('Authenticating...');
const token = await getEtsyToken();
const headers = {
  'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  Authorization: 'Bearer ' + token,
};
console.log('  Authenticated\n');

// --- Listings (copy by Sarah, see etsy/listings/cheatsheet-copy.md) ---
const listings = [
  {
    name: 'Carnivore Cheat Sheet',
    title: 'Carnivore Food Cheat Sheet Printable | Animal Based Diet Poster | What to Eat List Kitchen Wall Art PDF',
    description: `Tired of squinting at ingredient labels every grocery trip? Same.

This carnivore food cheat sheet is the magazine-style poster I wish I'd had when I started. Real photography, clean structure, and every animal food worth eating laid out in one glance. Meat and poultry (beef, lamb, pork, chicken, duck, organ meats), animal fats (tallow, butter, lard, bacon grease), seafood (salmon, shrimp, shellfish), eggs, animal-based extras like bone broth and collagen, plus salt and minerals. There's also a clear "avoid" section so you know exactly what to leave on the shelf, and a success tips footer with the stuff people forget. Eat to satisfaction. Hydrate. Be patient. Listen to your body.

Tagline at the top: Eat Animal Foods. Heal Your Body. Keep It Simple.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download. Print at home or any print shop.

I keep mine on the fridge. It's the easiest way to stop second-guessing every meal and just get on with eating.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 4.49,
    tags: 'carnivore poster,animal based diet,meat diet print,zero carb chart,beef list,what to eat,kitchen wall art,fridge poster,diet printable,ribeye lover gift,meal planning,organ meats,healing foods',
    pdfs: ['cheatsheet-carnivore-v1.pdf'],
    images: ['cheatsheet-carnivore-v1.jpg'],
  },
  {
    name: 'Keto Cheat Sheet',
    title: 'Keto Food Cheat Sheet Printable | Low Carb Allowed Foods Chart | High Fat Diet Kitchen Poster PDF',
    description: `If you've ever stood in the cereal aisle wondering "wait, can I have this?", this poster is for you.

A magazine-style keto cheat sheet with real food photography and every category sorted out for you. Proteins (beef, pork, chicken, salmon, eggs, organ meats), healthy fats (avocado, olive oil, butter, ghee, MCT, nuts and nut butters), low-carb veggies (spinach, broccoli, zucchini, asparagus, bell peppers), full-fat dairy (cheese, cream, greek yogurt), and keto-friendly snacks (pork rinds, jerky, olives, 85% dark chocolate). There's a clear avoid list (bread, pasta, rice, sugar, beer) so the answer's right there at eye level.

Tagline at the top: Eat Real Food. Stay Low Carb. Feel Amazing.

The success tips footer covers the stuff that actually keeps people on track. Hydrate. Eat enough fat. Track net carbs under 20g. Salt your food. Sleep matters more than you think.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download. Print at home or any print shop.

Some people find it helpful to put it on the fridge, others tape it inside a pantry door. Either way, it's the kind of reference you'll actually use.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 4.49,
    tags: 'keto printable,low carb chart,ketogenic poster,high fat foods,allowed foods list,kitchen art,fridge magnet style,diet planner,macro friendly,beginner keto,meal prep print,lchf guide,healthy eating',
    pdfs: ['cheatsheet-keto-v1.pdf'],
    images: ['cheatsheet-keto-v1.jpg'],
  },
  {
    name: 'Low Carb Cheat Sheet',
    title: 'Low Carb Food Cheat Sheet Printable | Allowed Foods List Chart | Healthy Eating Kitchen Poster PDF',
    description: `Low carb doesn't have to be confusing. It really doesn't.

This is the magazine-style cheat sheet I made because I was sick of texting people screenshots of food lists. Real photography, every category laid out clean, and the answers right where you need them. Proteins (beef, pork, chicken, fish, shellfish, eggs, tofu and tempeh if that's your thing), low-carb veggies (spinach, kale, broccoli, cauliflower, zucchini, mushrooms, radishes), healthy fats (avocado, olive oil, butter, nuts, olives), dairy (cheese, greek yogurt, cottage cheese, heavy cream), lower-carb fruits (berries, lemon, lime, tomatoes), plus a pantry section for condiments, oils, herbs, and sugar-free dressings.

Tagline at the top: Eat Real Food. Feel Better. Live Better.

The avoid section keeps it honest. Bread, pasta, rice, potatoes, sugary drinks, candy, ice cream, syrups, alcohol. The success tips footer covers what actually helps. Focus on whole foods. Hydrate. Plan ahead. Move your body. Sleep and manage stress.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download. Print at home or any print shop.

It's not about being perfect. It's about having a clear answer when you're tired and hungry and standing in front of the fridge at 6pm.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 4.49,
    tags: 'low carb printable,allowed foods chart,healthy eating,real food guide,kitchen wall art,diet planner,fridge reference,beginner friendly,whole foods list,sugar free,weight loss support,meal prep aid,food categories',
    pdfs: ['cheatsheet-lowcarb-v1.pdf'],
    images: ['cheatsheet-lowcarb-v1.jpg'],
  },
];

// --- Create draft listings ---
const created = [];
for (const l of listings) {
  console.log(`Creating: ${l.name}...`);
  const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      title: l.title,
      description: l.description,
      quantity: '999',
      price: String(l.price),
      who_made: 'i_did',
      when_made: '2020_2026',
      taxonomy_id: '69', // Art & Collectibles > Prints > Digital Prints
      type: 'download',
      is_digital: 'true',
      tags: l.tags,
    }),
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`  ✓ Created listing ${data.listing_id}`);
    created.push({ ...l, listingId: data.listing_id });
  } else {
    console.error(`  ✗ Error ${res.status}:`, JSON.stringify(data).slice(0, 400));
  }
  await new Promise((r) => setTimeout(r, 1000));
}

// --- Upload PDFs ---
console.log('\n--- Uploading PDFs ---');
for (const l of created) {
  for (const pdf of l.pdfs) {
    const filePath = path.join(PRODUCTS_DIR, pdf);
    const fileData = readFileSync(filePath);
    const blob = new Blob([fileData], { type: 'application/pdf' });
    const form = new FormData();
    form.append('file', blob, pdf);
    form.append('name', pdf);

    const res = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.listingId}/files`,
      { method: 'POST', headers, body: form }
    );
    const data = await res.json();
    if (res.ok) console.log(`  ✓ ${l.name}: ${pdf}`);
    else console.error(`  ✗ ${l.name}/${pdf}: ${JSON.stringify(data).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

// --- Upload images ---
console.log('\n--- Uploading images ---');
for (const l of created) {
  for (const img of l.images) {
    const filePath = path.join(PRODUCTS_DIR, img);
    const imgData = readFileSync(filePath);
    const ext = img.endsWith('.png') ? 'png' : 'jpeg';
    const blob = new Blob([imgData], { type: `image/${ext}` });
    const form = new FormData();
    form.append('image', blob, img);

    const res = await fetch(
      `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.listingId}/images`,
      { method: 'POST', headers, body: form }
    );
    const data = await res.json();
    if (res.ok) console.log(`  ✓ ${l.name}: ${img}`);
    else console.error(`  ✗ ${l.name}/${img}: ${JSON.stringify(data).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 500));
  }
}

// --- Summary ---
console.log('\n=== SUMMARY ===');
for (const l of created) {
  console.log(`${l.name}: https://www.etsy.com/listing/${l.listingId}`);
}
console.log(`\n${created.length}/3 draft listings created.`);
console.log('Next: review in https://www.etsy.com/your/shops/me/tools/listings/draft and publish each one.');
