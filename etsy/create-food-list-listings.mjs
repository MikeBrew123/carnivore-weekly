#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const PRODUCTS_DIR = path.resolve(import.meta.dirname, 'products');
const secrets = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../secrets/api-keys.json'), 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;
const SHOP = 63916912;

// --- Auth ---
console.log('Authenticating...');
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
  writeFileSync(path.resolve(import.meta.dirname, '../secrets/api-keys.json'), JSON.stringify(secrets, null, 2));
  console.log('  Token rotated');
}
const headers = {
  'x-api-key': CLIENT_ID + ':' + secrets.etsy.shared_secret,
  'Authorization': 'Bearer ' + tokens.access_token
};
console.log('  ✅ Authenticated\n');

// --- Listings ---
const listings = [
  {
    name: 'Bundle',
    title: 'Diet Food List Bundle Printable | Carnivore Keto Pescatarian Lion | Food Chart PDF Wall Art',
    description: `The steaks have never been higher — get all four diets in one download.

This bundle includes everything you need to stay on track, no matter which low-carb path you're on. You'll get one beautiful landscape poster featuring all four diets side by side, PLUS four individual fridge cards — Carnivore, Keto, Pescatarian Low Carb, and Lion Diet.

Each chart is hand-illustrated in gorgeous watercolor style, designed to actually look good on your fridge (finally, something worth pinning next to the kids' art). At a glance, you'll know exactly what's on your plate — and what's not.

What you get:
• 1 landscape comparison poster (all 4 diets) in US Letter + A4 sizes
• 4 individual diet fridge cards
• 6 high-res PDFs, 8.5x11", 300 DPI, print-ready
• Instant download — print at home or at any print shop

Perfect for meal preppers, diet explorers, or anyone who's tired of Googling "can I eat this?" at the grocery store.

This bundle is a rare deal. Don't miss it.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download — no physical item shipped. A CarnivoreWeekly.com original.`,
    price: 7.99,
    tags: 'diet food list,carnivore food,keto food list,lion diet,pescatarian,printable pdf,food chart,kitchen wall art,fridge poster,meal planning,diet guide,grocery list,low carb',
    pdfs: [
      'diet-food-list-landscape-letter.pdf',
      'diet-food-list-landscape-a4.pdf',
      'fridge-card-carnivore.pdf',
      'fridge-card-keto.pdf',
      'fridge-card-pescatarian.pdf',
      'fridge-card-lion.pdf'
    ],
    images: ['mockup-wall-frame.jpg', 'mockup-fridge-all4.jpg', 'mockup-flat-lay-bundle.jpg']
  },
  {
    name: 'Carnivore',
    title: 'Carnivore Diet Food List Printable | What to Eat Cheat Sheet | Fridge Poster PDF',
    description: `Zero plants. Zero confusion. Just meat the essentials.

This carnivore diet food card puts every animal-based option right where you need it — on your fridge, at eye level, between the butter and the ribeyes. Beef, pork, poultry, fish, shellfish, organ meats, dairy, and cooking fats, all organized in a clean layout with hand-illustrated watercolor artwork that actually looks beautiful in your kitchen.

No seed oils. No grains. No squinting at ingredient labels. Just a simple, gorgeous reference for what belongs on your plate.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download — print at home or any print shop

Whether you're 30 days in or just starting your first elimination protocol, this card keeps you focused. Hang it up, let it guide your grocery runs, and stop second-guessing every meal.

Because eating should be simple. And this is as simple as it gets.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download — no physical item shipped. A CarnivoreWeekly.com original.`,
    price: 4.49,
    tags: 'carnivore diet,carnivore food,meat diet,zero carb,animal based,carnivore cheat,what to eat,beef food list,printable pdf,kitchen poster,diet guide,fridge chart,carnivore guide',
    pdfs: ['fridge-card-carnivore.pdf'],
    images: ['fridge-card-carnivore.jpg', 'mockup-lifestyle-carnivore.jpg']
  },
  {
    name: 'Keto',
    title: 'Keto Diet Food List Printable | High Fat Low Carb Cheat Sheet | Fridge Poster PDF',
    description: `Fat is fuel — and this is your cheat sheet.

This keto food card covers everything from ribeyes to raspberries, organized across 10 categories so you always know what's on the menu. Meat, fish, eggs, dairy, healthy fats, low-carb veggies, nuts, seeds, berries, condiments, baking staples, and beverages — all with hand-illustrated watercolor artwork that looks way too good for a fridge magnet.

High fat. Under 20g net carbs. No confusion.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download — print at home or any print shop

Whether you're tracking macros or just keeping it simple, this card keeps you in ketosis without second-guessing every snack.

Keep calm and keto on.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download — no physical item shipped. A CarnivoreWeekly.com original.`,
    price: 4.49,
    tags: 'keto diet,keto food list,low carb,high fat diet,keto cheat sheet,what to eat keto,printable pdf,kitchen poster,diet guide,fridge chart,keto guide,meal planning,ketogenic',
    pdfs: ['fridge-card-keto.pdf'],
    images: ['fridge-card-keto.jpg', 'mockup-fridge-keto.jpg']
  },
  {
    name: 'Pescatarian',
    title: 'Pescatarian Low Carb Food List Printable | Seafood Diet Cheat Sheet | Fridge Poster PDF',
    description: `Something's fishy — and it's your entire meal plan. (That's the point.)

This pescatarian low-carb food card covers everything from salmon and sardines to shrimp and scallops, with all the plant-based sides that keep you under 50g carbs without missing a beat. Fresh fish, shellfish, eggs, dairy, low-carb veggies, nuts, seeds, and healthy fats — all organized with hand-illustrated watercolor art that actually deserves a spot on your fridge.

Plus a "Foods to Avoid" section so you don't accidentally reel in the grains, bread, pasta, or potatoes. No carb traps. No confusion. Just a clean catch.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download — print at home or any print shop

Whether you're keeping it low carb for health reasons or just prefer your protein with fins, this card is your daily anchor.

Seafood and chill — now you know what's on the menu.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download — no physical item shipped. A CarnivoreWeekly.com original.`,
    price: 4.49,
    tags: 'pescatarian,low carb,seafood diet,fish diet,pescatarian food,low carb food,what to eat,printable pdf,kitchen poster,diet guide,fridge chart,seafood list,healthy eating',
    pdfs: ['fridge-card-pescatarian.pdf'],
    images: ['fridge-card-pescatarian.jpg']
  },
  {
    name: 'Lion Diet',
    title: 'Lion Diet Food List Printable | Elimination Diet Cheat Sheet | Fridge Poster PDF',
    description: `Mane course only. No sides. No substitutes.

The lion diet is the most stripped-down elimination protocol out there — ruminant meat, salt, and water. That's it. And this fridge card makes sure you don't accidentally wander into "but what about chicken?" territory. (Chicken is not a ruminant. We checked.)

Beef cuts, lamb, bison, organ meats, cooking fats, bone broth, and a Common Mistakes section to keep you from going off-pride. Hand-illustrated watercolor style that looks way better than a sticky note that says "just eat steak."

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download — print at home or any print shop

If you're doing a strict elimination for autoimmune, gut, or inflammation issues, this card is your daily reminder that simplicity IS the protocol.

Keep it primal. Keep it simple. Keep it on the fridge.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download — no physical item shipped. A CarnivoreWeekly.com original.`,
    price: 4.49,
    tags: 'lion diet,elimination diet,ruminant meat,beef salt water,lion diet food,carnivore diet,autoimmune diet,what to eat,printable pdf,kitchen poster,diet guide,fridge chart,gut health',
    pdfs: ['fridge-card-lion.pdf'],
    images: ['fridge-card-lion.jpg']
  }
];

// --- Create listings ---
const createdListings = [];
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
      taxonomy_id: '69',
      type: 'download',
      is_digital: 'true',
      tags: l.tags
    })
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`  ✅ Created listing ${data.listing_id}`);
    createdListings.push({ ...l, listingId: data.listing_id });
  } else {
    console.error(`  ❌ Error ${res.status}:`, JSON.stringify(data).slice(0, 300));
  }
  await new Promise(r => setTimeout(r, 1000));
}

// --- Upload PDFs ---
console.log('\n--- Uploading PDFs ---');
for (const l of createdListings) {
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
    if (res.ok) {
      console.log(`  ✅ ${l.name}: ${pdf}`);
    } else {
      console.error(`  ❌ ${l.name}/${pdf}: ${JSON.stringify(data).slice(0, 200)}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

// --- Upload images ---
console.log('\n--- Uploading images ---');
for (const l of createdListings) {
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
    if (res.ok) {
      console.log(`  ✅ ${l.name}: ${img}`);
    } else {
      console.error(`  ❌ ${l.name}/${img}: ${JSON.stringify(data).slice(0, 200)}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
}

// --- Summary ---
console.log('\n=== SUMMARY ===');
for (const l of createdListings) {
  console.log(`${l.name}: https://www.etsy.com/listing/${l.listingId}`);
}
console.log(`\nTotal: ${createdListings.length} listings created as drafts.`);
console.log('Go to Etsy seller dashboard to review and publish.');
