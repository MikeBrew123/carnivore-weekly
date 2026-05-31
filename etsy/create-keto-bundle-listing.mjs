#!/usr/bin/env node
/**
 * Create Etsy listing for Keto Food List Bundle
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const DIR = path.resolve(import.meta.dirname);
const PRODUCTS_DIR = path.join(DIR, 'products');
const secrets = JSON.parse(readFileSync(path.resolve(DIR, '../secrets/api-keys.json'), 'utf8'));
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
  writeFileSync(path.resolve(DIR, '../secrets/api-keys.json'), JSON.stringify(secrets, null, 2));
  console.log('  Token rotated');
}
const headers = {
  'x-api-key': CLIENT_ID + ':' + secrets.etsy.shared_secret,
  'Authorization': 'Bearer ' + tokens.access_token
};
console.log('  ✅ Authenticated\n');

// --- Create Draft Listing ---
const title = 'Keto Food List Printable Bundle | 10-Page Grocery System with Carb Cheat Sheet | US Letter + A4 PDF';

const description = `Your fridge called. It wants a game plan.

You've got your macros figured out. Now you're standing in the grocery store wondering what actually fits. This 10-page printable bundle turns "what can I eat?" into a done-in-20-minutes grocery run. No guessing. No Googling carb counts in the bread aisle.

It's the practical stuff that keeps keto working past week one.

What's Inside (14 pages total — US Letter + A4):
• Eat / Limit / Avoid food list (traffic-light layout)
• Grocery checklist with 12 category cards
• Net carb cheat sheet for 50+ foods
• 30+ keto snacks under 5g net carbs
• Foods to avoid with hidden carb traps
• Protein-first foods sorted by macros
• Electrolyte & keto flu checklist
• 7-day blank meal planner
• Reusable blank grocery checklist
• 8-week macro notes & progress tracker

How to use:
1. Run the free KetoDial calculator at KetoDial.com to get your macros
2. Print the pages you need (or all of them — go wild)
3. Stick the food list on your fridge. Bring the grocery checklist to the store. Done.

File details: Instant PDF download. Includes both US Letter and A4 sizes. Print at home or at any print shop. Designed to look clean on your fridge.

You don't need a perfect plan. You need a starting point that's easy to follow. This is that.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download — no physical item shipped. Not medical advice. A CarnivoreWeekly.com original.`;

const tags = [
  'keto food list', 'keto grocery list', 'keto printable', 'keto cheat sheet',
  'net carb chart', 'keto meal planner', 'keto snack list', 'foods to avoid keto',
  'keto beginner', 'keto diet plan', 'keto electrolytes', 'low carb food list',
  'keto macro tracker'
];

console.log('Creating draft listing...');
const listingRes = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title,
    description,
    price: 4.99,
    quantity: 999,
    taxonomy_id: 69,  // Craft Supplies & Tools > Patterns & How To
    who_made: 'i_did',
    when_made: '2020_2025',
    is_supply: false,
    is_digital: true,
    type: 'download',
    tags,
    state: 'draft',
    should_auto_renew: true,
  })
});

const listing = await listingRes.json();
if (listing.error) {
  console.error('Listing error:', JSON.stringify(listing, null, 2));
  process.exit(1);
}
const listingId = listing.listing_id;
console.log(`  ✅ Draft listing created: ${listingId}`);
console.log(`  URL: https://www.etsy.com/listing/${listingId}\n`);

// --- Upload Digital File ---
console.log('Uploading PDF file...');
const pdfPath = path.join(PRODUCTS_DIR, 'keto-food-list-bundle.pdf');
const pdfBytes = readFileSync(pdfPath);
const fileForm = new FormData();
fileForm.append('file', new Blob([pdfBytes], { type: 'application/pdf' }), 'Keto-Food-List-Bundle-CarnivoreWeekly.pdf');
fileForm.append('name', 'Keto Food List Bundle - 10 Pages - US Letter + A4');

const fileRes = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/files`,
  { method: 'POST', headers, body: fileForm }
);
const fileData = await fileRes.json();
if (fileData.error) {
  console.error('File upload error:', JSON.stringify(fileData, null, 2));
} else {
  console.log('  ✅ PDF uploaded');
}

// --- Upload Images ---
const images = [
  'listing-images/listing-1-hero.jpg',
  'listing-images/listing-2-eat-limit-avoid.jpg',
  'listing-images/listing-3-whats-included.jpg',
  'listing-images/listing-4-grocery.jpg',
  'listing-images/listing-5-details.jpg',
];

for (let i = 0; i < images.length; i++) {
  const imgPath = path.join(PRODUCTS_DIR, images[i]);
  console.log(`Uploading image ${i + 1}/5: ${images[i]}...`);

  const imgBytes = readFileSync(imgPath);
  const imgForm = new FormData();
  imgForm.append('image', new Blob([imgBytes], { type: 'image/jpeg' }), path.basename(images[i]));
  imgForm.append('rank', String(i + 1));

  const imgRes = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/images`,
    { method: 'POST', headers, body: imgForm }
  );
  const imgData = await imgRes.json();
  if (imgData.error) {
    console.error(`  ❌ Image ${i + 1} error:`, JSON.stringify(imgData, null, 2));
  } else {
    console.log(`  ✅ Image ${i + 1} uploaded`);
  }
}

console.log(`\n🎉 Done! Draft listing ready for review:`);
console.log(`   https://www.etsy.com/listing/${listingId}`);
console.log(`\n   To publish: update state to 'active' in Etsy dashboard or via API.`);
