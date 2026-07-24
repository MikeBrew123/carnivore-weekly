#!/usr/bin/env node
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';

const CLIENT_ID = ETSY_CLIENT_ID;

const token = await getEtsyToken();

const headers = {
  'x-api-key': CLIENT_ID + ':' + ETSY_SHARED_SECRET,
  'Authorization': 'Bearer ' + token
};

const meRes = await fetch('https://openapi.etsy.com/v3/application/users/me', { headers });
const me = await meRes.json();
const SHOP = me.shop_id;
console.log('Shop ID:', SHOP);

const listings = [
  {
    name: 'Grocery List',
    title: 'Carnivore Grocery Shopping List - Printable PDF - Carnivore Diet Food List',
    description: `The only grocery list you need for the carnivore diet.

Organized by tier (essential, supportive, optional) with checkboxes, a weekly shopping template organized by store section, and practical tips from a real carnivore dieter.

What you get:
- Tier 1 essentials: beef, eggs, salt, water, butter
- Tier 2 variety: lamb, pork, fish, organ meats, poultry
- Tier 3 extras: bone broth, tallow, ghee, cheese, heavy cream
- Weekly shopping template with quantity boxes
- Quick shopping tips (what to buy, where to save)

Print it, stick it on the fridge, and stop overthinking your grocery runs.

Designed for Letter size paper (8.5 x 11). Instant digital download. Print as many times as you need.

From CarnivoreWeekly.com`,
    price: 4.99,
    tags: 'carnivore diet,grocery list,carnivore food,meat diet,printable pdf,carnivore shopping,keto grocery,animal based diet,zero carb,meal prep,diet food list,carnivore gift,food list'
  },
  {
    name: '30-Day Meal Plan',
    title: '30-Day Carnivore Meal Plan - Printable PDF - Weekly Carnivore Diet Guide',
    description: `A complete 30-day carnivore meal plan that takes you from day one to building your permanent rotation.

No guesswork. No overthinking. Just eat what is on the list.

Week 1 - Foundation: Beef and eggs only. Ground beef, ribeye, chuck, NY strip. All 80/20 fat. Salt everything.

Week 2 - Expansion: Introduces bacon, pork chops, lamb, salmon, sardines, and your first liver serving.

Week 3 - Optimization: Bone broth mornings, reverse sear technique, slow-cooker pork shoulder, smash burgers.

Week 4 - Your Rhythm: Nine days of personalized rotation. Build your permanent protocol.

Each week includes daily meals, prep tips, and practical cooking notes.

Designed for Letter size paper. Five pages (cover plus four weekly plans). Instant digital download.

From CarnivoreWeekly.com`,
    price: 9.99,
    tags: 'carnivore meal plan,30 day meal plan,carnivore diet,meat diet plan,meal prep,carnivore guide,keto meal plan,animal based,zero carb,weekly meal plan,diet plan pdf,carnivore gift,printable pdf'
  }
];

for (const l of listings) {
  console.log(`\nCreating: ${l.name}...`);
  const res = await fetch(`https://openapi.etsy.com/v3/application/shops/${SHOP}/listings`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      title: l.title,
      description: l.description,
      quantity: '999',
      price: String(l.price),
      who_made: 'i_did',
      when_made: '2020_2025',
      taxonomy_id: '69',
      type: 'download',
      is_digital: 'true',
      tags: l.tags
    })
  });
  const data = await res.json();
  if (res.ok) {
    console.log(`Created listing ${data.listing_id}: ${data.title}`);
  } else {
    console.error(`Error ${res.status}:`, JSON.stringify(data));
  }
}
