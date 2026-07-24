#!/usr/bin/env node
/**
 * Update the Carnivore Diet Food List listing (4451046699)
 * Repositions as kitchen wall art instead of info product
 * Only touches: title, description, tags
 */
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;
const SHOP = 63916912;
const LISTING_ID = 4451046699;

// Auth — valid token from the shared Supabase store (single source of truth).
const token = await getEtsyToken();
const headers = {
  'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  'Authorization': 'Bearer ' + token,
  'Content-Type': 'application/json'
};
console.log('Authenticated');

// New listing data
const title = 'Carnivore Diet Kitchen Poster | Watercolor Food Chart | Printable Wall Art PDF';
const description = `The carnivore food chart your kitchen actually deserves.

Hand-illustrated watercolor artwork with every animal-based food organized by category. Beef, pork, poultry, fish, shellfish, organ meats, dairy, and cooking fats — all in a clean layout that looks as good on your wall as it does on your fridge.

Most diet charts look like they were made in a spreadsheet. This one looks like it belongs in a frame.

What you get:
• 1 hand-illustrated watercolor food poster (PDF)
• 8.5x11" print-ready, 300 DPI
• Instant download — print at home or any print shop
• Works framed on a wall, on the fridge with magnets, or laminated on the counter

Who it's for:
• Starting your first elimination protocol and want a daily visual anchor
• Already carnivore but want something beautiful for the kitchen
• Looking for a gift for the meat lover in your life

Print it at home for under $2. Frame it for under $10. You'll reach for it every time you make a grocery list.

Pairs well with our keto and lion diet versions — build a gallery wall of your dietary journey.

All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download — no physical item shipped. A CarnivoreWeekly.com original.`;

const tags = [
  'carnivore poster',
  'kitchen wall art',
  'meat diet print',
  'carnivore food chart',
  'fridge poster',
  'watercolor kitchen',
  'carnivore cheatsheet',
  'animal based diet',
  'diet wall decor',
  'kitchen poster',
  'carnivore guide',
  'beef poster art',
  'kitchen printable'
];

// Update listing
console.log(`Updating listing ${LISTING_ID}...`);
const res = await fetch(
  `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${LISTING_ID}`,
  {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ title, description, tags })
  }
);

if (res.ok) {
  const data = await res.json();
  console.log(`✅ Updated: ${data.title}`);
  console.log(`   https://www.etsy.com/listing/${LISTING_ID}`);
} else {
  const err = await res.text();
  console.error(`❌ Failed (${res.status}):`, err);
}
