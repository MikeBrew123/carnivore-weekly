#!/usr/bin/env node
// Post 3 new How-To listings + 3 Bundle listings as Etsy DRAFTS.
// Then add bundle-ad images as cross-sell Photo #2 to the existing
// cheat sheet listings + the new how-to listings.
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const PRODUCTS_DIR = path.resolve(import.meta.dirname, 'products');
const SECRETS_PATH = path.resolve(import.meta.dirname, '../secrets/api-keys.json');
const secrets = JSON.parse(readFileSync(SECRETS_PATH, 'utf8'));
const CLIENT_ID = secrets.etsy.api_key;
const SHOP = 63916912;

console.log('Authenticating...');
const tokenRes = await fetch('https://api.etsy.com/v3/public/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    refresh_token: secrets.etsy.refresh_token,
  }),
});
const tokens = await tokenRes.json();
if (tokens.error) { console.error('Token error:', tokens); process.exit(1); }
if (tokens.refresh_token !== secrets.etsy.refresh_token) {
  secrets.etsy.refresh_token = tokens.refresh_token;
  writeFileSync(SECRETS_PATH, JSON.stringify(secrets, null, 2));
}
const headers = {
  'x-api-key': CLIENT_ID + ':' + secrets.etsy.shared_secret,
  Authorization: 'Bearer ' + tokens.access_token,
};
console.log('  Authenticated\n');

// === LISTINGS ===
const howtos = [
  {
    name: 'Carnivore How-To',
    title: 'How To Carnivore Diet Guide & 14-Day Tracker Printable | Animal Foods Starter Poster | Beginner Carnivore PDF',
    description: `Most people quit carnivore in week three. Not because it doesn't work. Because nobody told them what week three actually feels like.

This poster fixes that. It's the magazine-style how-to I built for people who want the full picture before they start, plus the data to prove it's working. Three phases laid out plainly. Phase 1 adaptation (1-2 weeks). Phase 2 keto-flu and detox (2-6 weeks). Phase 3 fat-adapted (6+ weeks). What to eat: meat (beef, lamb, bison, pork, chicken, turkey, organ meats, ground meat), animal fat (tallow, lard, chicken fat, duck fat, suet), eggs, salt and water. The basics, the tips, the why-it-works.

There's a "Possible Detox Symptoms" sidebar so you stop panicking when the headache hits. Headache, fatigue, digestive changes, skin flare-ups, brain fog, mood changes. All normal. All temporary.

The 14-day tracker is the part you'll actually use. Daily rows for meat intake, fat intake, water, salt, plus 0-10 scales for symptoms, energy, and mood. A notes column for what you noticed. Two weeks of honest data tells you more than a month of guessing.

Navy and red palette with a bull illustration. Mantra at the bottom: Discipline today. Freedom tomorrow. You got this.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download. Print at home or any print shop.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 5.99,
    tags: 'carnivore how to,carnivore tracker,14 day tracker,beginner carnivore,animal foods,meat diet poster,carnivore starter,zero carb guide,elimination diet,keto flu tracker,gut healing,nose to tail,bull poster',
    pdfs: ['howto-carnivore-v1.pdf'],
    images: ['howto-carnivore-v1.jpg', 'bundle-carnivore-v1.jpg'],
    bundleAd: 'bundle-carnivore-v1.jpg',
  },
  {
    name: 'Keto How-To',
    title: 'How To Keto Diet Guide & 14-Day Tracker Printable | Ketogenic Starter Poster | Low Carb Beginner PDF',
    description: `Keto isn't complicated. It just gets explained badly.

This is the magazine-style how-to I wish I could hand to every friend who texts me "wait, can I eat this on keto?" Real photography, clean structure, and the answers right where you need them. What you eat: healthy fats (avocado, olive oil, butter, ghee, MCT, nuts), protein in moderation (beef, pork, chicken, salmon, eggs), low-carb veggies (spinach, broccoli, zucchini, asparagus, peppers), and limited carbs from berries, avocado, and olives. The basics: 20-50g net carbs a day. That's the whole game.

There's a "Keto Flu?" callout at the bottom because most people hit it around day three and think they're broken. You're not broken. You need salt, water, and a few more days.

The 14-day tracker is what makes this actually useful. Daily rows for net carbs (≤50g), water, electrolytes yes-or-no, plus 1-10 scales for energy and mood. A notes column for what you noticed. Two weeks of honest data shows you exactly how your body is responding.

Magazine layout in navy and green. Mantra at the bottom: Keep it simple. Stay consistent. Your results will follow.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download. Print at home or any print shop.

Some people put it on the fridge. Others tape it inside a pantry door. Either way, it's the kind of reference that gets used.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 5.99,
    tags: 'keto how to,keto tracker,14 day tracker,keto starter,low carb tracker,beginner keto,keto flu guide,ketogenic diet,net carbs chart,high fat diet,lchf printable,keto poster,macro tracker',
    pdfs: ['howto-keto-v1.pdf'],
    images: ['howto-keto-v1.jpg', 'bundle-keto-v1.jpg'],
    bundleAd: 'bundle-keto-v1.jpg',
  },
  {
    name: 'Low Carb How-To',
    title: 'How To Low Carb Diet Guide & 14-Day Tracker Printable | Healthy Eating Starter Poster | Beginner PDF',
    description: `Low carb isn't a diet. It's a way of eating you can actually keep up with.

This poster is for people who want a real plan without the all-or-nothing pressure of stricter approaches. Magazine-style, clean photography, and every category laid out without the dogma. What you eat: protein (beef, pork, chicken, fish, eggs), low-carb veggies (spinach, kale, broccoli, cauliflower, zucchini, mushrooms), healthy fats (avocado, olive oil, butter, nuts, olives), and smart carbs in moderation (berries, small fruit portions, legumes if they work for you, dairy if you tolerate it). The basics: 20-50g net carbs, or wherever you feel best.

There's a "Why It Works" section so you know what's actually happening, plus an "Extra Tips for Long-Term Success" footer covering the stuff most plans skip. Shop smart. Cook at home. Build balanced meals. Move your body. Sleep well. Stay consistent.

The 14-day tracker is where it earns its keep. Daily rows for net carbs (20-50g), water, exercise yes-or-no, plus 1-10 scales for energy and mood. A notes column for what you noticed. Some people find two weeks of honest tracking shifts more than two months of willpower.

Magazine layout in navy and green. Mantra at the bottom: Small choices. Big changes. Lasting results.

What you get:
• 1 high-res PDF, 8.5x11", 300 DPI, print-ready
• Instant download. Print at home or any print shop.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 5.99,
    tags: 'low carb how to,low carb tracker,14 day tracker,healthy eating,beginner diet,low carb starter,real food guide,net carbs chart,weight loss aid,meal planner,wellness tracker,lifestyle change,whole foods',
    pdfs: ['howto-lowcarb-v1.pdf'],
    images: ['howto-lowcarb-v1.jpg', 'bundle-lowcarb-v1.jpg'],
    bundleAd: 'bundle-lowcarb-v1.jpg',
  },
];

const bundles = [
  {
    name: 'Carnivore Bundle',
    title: 'Carnivore Diet Starter Bundle | Cheat Sheet + How To Guide & 14-Day Tracker | Beginner Kit Printable PDF',
    description: `Two posters that do different jobs. Together, they're the whole system.

The cheat sheet is your at-a-glance answer for daily decisions. Standing in front of the fridge wondering if something counts? Look up. Done. Every animal food worth eating laid out clean, plus a clear avoid list. It's the reference that lives on your fridge for years.

The how-to is the plan for your first month. Three phases mapped out (adaptation, detox, fat-adapted). What to eat, how to handle keto flu, why it works. And the 14-day tracker, which is honestly the part that keeps people from quitting in week three. Daily check-ins for meat, fat, water, salt, plus 0-10 scales for symptoms, energy, and mood. Two weeks of honest data tells you more than two months of guessing.

Cheat sheet for the long haul. How-to for the start. Together they're Your Carnivore Success System.

Pricing math: $4.49 cheat sheet + $5.99 how-to = $10.48 standalone. Bundle is $7.99. You save $2.49.

What you get:
• 2 high-res PDFs, 8.5x11", 300 DPI, print-ready
• Carnivore Food Cheat Sheet (daily reference)
• Carnivore How-To Guide & 14-Day Tracker (starter plan)
• Instant download. Print at home or any print shop.

This is the complete beginner kit. The cheat sheet for every day after, the how-to for the days that matter most.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 7.99,
    tags: 'carnivore bundle,carnivore starter,carnivore guide,beginner carnivore,carnivore kit,14 day tracker,animal based diet,elimination diet,zero carb bundle,meat diet guide,carnivore poster,starter pack,complete guide',
    pdfs: ['cheatsheet-carnivore-v1.pdf', 'howto-carnivore-v1.pdf'],
    images: ['bundle-carnivore-v1.jpg', 'cheatsheet-carnivore-v1.jpg', 'howto-carnivore-v1.jpg'],
  },
  {
    name: 'Keto Bundle',
    title: 'Keto Diet Starter Bundle | Cheat Sheet + How To Guide & 14-Day Tracker | Beginner Kit Printable PDF',
    description: `One poster for daily decisions. One poster for your first month. They're built to work together.

The cheat sheet is the answer to "wait, can I eat this?" Real photography, every category sorted (proteins, healthy fats, low-carb veggies, full-fat dairy, keto-friendly snacks), and a clear avoid list. It's the reference you'll keep on the fridge long after you've got the macros down.

The how-to is the plan for getting there. Basics laid out (20-50g net carbs), what to eat, why it works, and a "Keto Flu?" callout for the day-three slump. The 14-day tracker is where people actually figure out what's working. Daily rows for net carbs, water, electrolytes, plus 1-10 scales for energy and mood. Two weeks of honest data shows you exactly how your body responds.

Cheat sheet for "what do I eat?" How-to for "how do I start?" Together they're Your Keto Success System.

Pricing math: $4.49 cheat sheet + $5.99 how-to = $10.48 standalone. Bundle is $7.99. You save $2.49.

What you get:
• 2 high-res PDFs, 8.5x11", 300 DPI, print-ready
• Keto Food Cheat Sheet (daily reference)
• Keto How-To Guide & 14-Day Tracker (starter plan)
• Instant download. Print at home or any print shop.

The complete starter pack. Some people find the tracker is the thing that finally makes keto stick. Others swear by the cheat sheet on the fridge. Get both, figure out which one you reach for more.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 7.99,
    tags: 'keto bundle,keto starter pack,keto guide,beginner keto,keto kit,14 day tracker,low carb bundle,ketogenic guide,keto printable,high fat diet,keto poster,starter pack,complete guide',
    pdfs: ['cheatsheet-keto-v1.pdf', 'howto-keto-v1.pdf'],
    images: ['bundle-keto-v1.jpg', 'cheatsheet-keto-v1.jpg', 'howto-keto-v1.jpg'],
  },
  {
    name: 'Low Carb Bundle',
    title: 'Low Carb Diet Starter Bundle | Cheat Sheet + How To Guide & 14-Day Tracker | Beginner Kit Printable PDF',
    description: `Two posters. Two jobs. Together they're a real plan you can stick with.

The cheat sheet is your daily reference. Real photography, every category sorted (proteins, low-carb veggies, healthy fats, dairy, lower-carb fruits, pantry staples) with a clear avoid list. It's the answer when you're tired and hungry and standing in front of the fridge at 6pm.

The how-to is the plan for actually getting started. Basics laid out (20-50g net carbs, or wherever you feel best), what to eat, why it works, plus an "Extra Tips for Long-Term Success" footer covering the stuff most plans skip. The 14-day tracker is where it earns its keep. Daily rows for net carbs, water, exercise, plus 1-10 scales for energy and mood. Some people find two weeks of honest tracking shifts more than two months of willpower.

Cheat sheet for daily decisions. How-to for the first month. Together they're Your Low Carb Success System.

Pricing math: $4.49 cheat sheet + $5.99 how-to = $10.48 standalone. Bundle is $7.99. You save $2.49.

What you get:
• 2 high-res PDFs, 8.5x11", 300 DPI, print-ready
• Low Carb Food Cheat Sheet (daily reference)
• Low Carb How-To Guide & 14-Day Tracker (starter plan)
• Instant download. Print at home or any print shop.

The complete beginner kit. Not about being perfect. About having the right tools when you need them.

⚠️ All sales are final. Due to the digital nature of this product, refunds or exchanges are not available. Please review the listing carefully before purchasing.

For personal use only. Digital download. No physical item shipped. A CarnivoreWeekly.com original.`,
    price: 7.99,
    tags: 'low carb bundle,low carb starter,low carb guide,beginner diet,low carb kit,14 day tracker,healthy eating,real food guide,wellness bundle,starter pack,complete guide,meal planner,lifestyle change',
    pdfs: ['cheatsheet-lowcarb-v1.pdf', 'howto-lowcarb-v1.pdf'],
    images: ['bundle-lowcarb-v1.jpg', 'cheatsheet-lowcarb-v1.jpg', 'howto-lowcarb-v1.jpg'],
  },
];

// === HELPERS ===
async function createListing(l) {
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
      tags: l.tags,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Create failed (${res.status}): ${JSON.stringify(data).slice(0, 400)}`);
  return data.listing_id;
}

async function uploadPdf(listingId, pdfName) {
  const fileData = readFileSync(path.join(PRODUCTS_DIR, pdfName));
  const form = new FormData();
  form.append('file', new Blob([fileData], { type: 'application/pdf' }), pdfName);
  form.append('name', pdfName);
  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/files`,
    { method: 'POST', headers, body: form }
  );
  if (!res.ok) throw new Error(`PDF upload failed: ${JSON.stringify(await res.json()).slice(0, 200)}`);
}

async function uploadImage(listingId, imgName, rank) {
  const imgData = readFileSync(path.join(PRODUCTS_DIR, imgName));
  const form = new FormData();
  form.append('image', new Blob([imgData], { type: 'image/jpeg' }), imgName);
  if (rank) form.append('rank', String(rank));
  const res = await fetch(
    `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${listingId}/images`,
    { method: 'POST', headers, body: form }
  );
  if (!res.ok) throw new Error(`Image upload failed: ${JSON.stringify(await res.json()).slice(0, 200)}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// === RUN ===
const results = { howtos: [], bundles: [] };

console.log('--- Creating How-To listings ---');
for (const l of howtos) {
  try {
    process.stdout.write(`${l.name}... `);
    const id = await createListing(l);
    for (const pdf of l.pdfs) await uploadPdf(id, pdf);
    let rank = 1;
    for (const img of l.images) { await uploadImage(id, img, rank++); await sleep(300); }
    console.log(`✓ ${id}`);
    results.howtos.push({ name: l.name, id });
  } catch (e) {
    console.log(`✗ ${e.message}`);
  }
  await sleep(800);
}

console.log('\n--- Creating Bundle listings ---');
for (const l of bundles) {
  try {
    process.stdout.write(`${l.name}... `);
    const id = await createListing(l);
    for (const pdf of l.pdfs) await uploadPdf(id, pdf);
    let rank = 1;
    for (const img of l.images) { await uploadImage(id, img, rank++); await sleep(300); }
    console.log(`✓ ${id}`);
    results.bundles.push({ name: l.name, id });
  } catch (e) {
    console.log(`✗ ${e.message}`);
  }
  await sleep(800);
}

// === Cross-sell: bundle ad as Photo #2 on existing cheat sheet listings ===
console.log('\n--- Cross-sell: adding bundle ads to existing cheat sheets ---');
const crossSell = [
  { listingId: 4495055944, name: 'Carnivore Cheat Sheet', img: 'bundle-carnivore-v1.jpg' },
  { listingId: 4495049647, name: 'Keto Cheat Sheet',      img: 'bundle-keto-v1.jpg' },
  { listingId: 4495056564, name: 'Low Carb Cheat Sheet',  img: 'bundle-lowcarb-v1.jpg' },
];
for (const c of crossSell) {
  try {
    process.stdout.write(`${c.name} += ${c.img}... `);
    await uploadImage(c.listingId, c.img, 2);
    console.log('✓');
  } catch (e) {
    console.log(`✗ ${e.message}`);
  }
  await sleep(500);
}

// === Summary ===
console.log('\n=== SUMMARY ===');
console.log('How-Tos ($5.99):');
for (const r of results.howtos) console.log(`  ${r.name}: https://www.etsy.com/listing/${r.id}`);
console.log('Bundles ($7.99):');
for (const r of results.bundles) console.log(`  ${r.name}: https://www.etsy.com/listing/${r.id}`);
console.log(`\n${results.howtos.length}/3 how-tos + ${results.bundles.length}/3 bundles created.`);
console.log('All listings are DRAFTS. Review at: https://www.etsy.com/your/shops/me/tools/listings/draft');
