#!/usr/bin/env node
// Bead carnivore-weekly-pshn — meal-plan listing rescue (2026-07-27).
// 1. Replaces the digital files on the four listings that shipped with
//    overprinted grocery/directory pages (build_mealplans.py pagination bug),
//    plus refreshed zips for carnivore + lion.
// 2. Uploads real page-preview images (composite + week grid + grocery +
//    directory) — the listings launched with a single text-only hero card.
// 3. Applies evidence-based title/tag/materials updates (mined from top
//    score-ranked competitor listings per target query).
// Safe to re-run: file replacement uploads first, deletes old second.
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getEtsyToken, etsyHeaders } from './token.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDFS = path.join(__dirname, 'products', 'pdfs');
const IMGS = path.join(__dirname, 'products', 'mealplans', 'listing-images');
const SHOP = 63916912;

const token = await getEtsyToken();
const headers = etsyHeaders(token);

const LISTINGS = [
  {
    id: 4540695544, key: 'carnivore',
    file: { path: path.join(PDFS, 'carnivore-30-day-meal-plan.zip'), name: '30-Day-Carnivore-Meal-Plan.zip', type: 'application/zip' },
    title: '30 Day Carnivore Meal Plan Printable | Carnivore Diet Menu with Grocery Lists + Macros | High Protein Zero Carb Plan | Beginner PDF',
    tags: ['carnivore meal plan','carnivore diet','carnivore diet plan','carnivore grocery','carnivore printable','carnivore planner','30 day meal plan','zero carb meal plan','meat based diet','animal based diet','high protein','carnivore beginner','meal plan printable'],
  },
  {
    id: 4540695558, key: 'keto',
    file: { path: path.join(PDFS, 'keto-28-day-meal-plan-1500.pdf'), name: '28-Day-Keto-Meal-Plan-1500-Calorie.pdf', type: 'application/pdf' },
    title: 'Keto Meal Plan 28 Day 1500 Calorie | 4 Week Keto Menu with Grocery Lists | Keto for Beginners | Under 25g Net Carbs | Printable PDF',
    tags: ['keto meal plan','1500 calorie plan','28 day keto plan','keto diet plan','keto for beginners','low carb meal plan','keto grocery list','keto meal plan pdf','keto weight loss','printable meal plan','ketogenic diet','keto meal prep','keto shopping list'],
  },
  {
    id: 4540695566, key: 'lowcarb',
    file: { path: path.join(PDFS, 'lowcarb-28-day-meal-plan-1500.pdf'), name: '28-Day-Low-Carb-Meal-Plan-1500-Calorie.pdf', type: 'application/pdf' },
    title: 'Low Carb Meal Plan 28 Day 1500 Calorie | 4 Week Menu with Grocery Lists | Whole Foods Berries Yogurt | Weight Loss Printable PDF',
    tags: ['low carb meal plan','1500 calorie plan','28 day meal plan','low carb diet plan','low carb grocery','low carb diet','meal plan printable','weight loss plan','4 week meal plan','low carb menu','easy meal plan','low carb meals','whole food meal plan'],
  },
  {
    id: 4540678283, key: 'lion',
    file: { path: path.join(PDFS, 'lion-diet-30-day-protocol.zip'), name: 'Lion-Diet-30-Day-Protocol.zip', type: 'application/zip' },
    title: 'Lion Diet 30 Day Protocol & Meal Plan | Elimination Diet with Reintroduction Guide + Symptom Journal | Beef Salt Water | Printable PDF',
    tags: ['lion diet','lion diet plan','elimination diet','elimination protocol','beef salt water','reintroduction plan','symptom journal','food sensitivity','carnivore diet plan','30 day protocol','meat based diet','carnivore diet','proper human diet'],
  },
  {
    id: 4540695590, key: 'pescatarian',
    file: { path: path.join(PDFS, 'pescatarian-30-day-meal-plan.pdf'), name: '30-Day-Pescatarian-Low-Carb-Meal-Plan.pdf', type: 'application/pdf' },
    title: 'Pescatarian Meal Plan 30 Day Low Carb | Seafood Diet Menu with Grocery Lists | Heart Healthy Fish Meals | Printable PDF',
    tags: ['pescatarian plan','pescatarian diet','pescatarian meals','seafood meal plan','low carb pescatarian','fish meal plan','30 day meal plan','low carb meal plan','seafood diet plan','pescatarian keto','meal plan printable','pescatarian recipes','anti inflammatory'],
  },
  {
    id: 4540695604, key: 'mediterranean',
    file: { path: path.join(PDFS, 'mediterranean-7-day-meal-plan.pdf'), name: '7-Day-Mediterranean-Meal-Plan.pdf', type: 'application/pdf' },
    title: 'Mediterranean Meal Plan 7 Day with Grocery List | Mediterranean Diet Menu Printable | Heart Healthy Whole Food Plan | Easy PDF',
    tags: ['mediterranean diet','mediterranean plan','mediterranean food','mediterranean meal','mediterranean menu','7 day meal plan','whole food plan','healthy meal plan','weekly meal plan','meal plan printable','easy meal plan','heart healthy diet','weekly meal planner'],
  },
  {
    id: 4532542805, key: 'bundle', file: null, images: false,
    title: 'Keto for Beginners Starter Kit | 30 Day Keto Meal Plan + Food List + Grocery List Printable Bundle | 21+ Page PDF Instant Download',
    tags: ['keto starter kit','keto meal plan','keto food list','30 day keto plan','keto meal plan pdf','keto for beginners','keto grocery list','keto printable','keto meal planner','low carb food list','keto diet plan','keto beginner guide','keto guide'],
  },
];

const MATERIALS = ['digital download', 'printable PDF', '300 DPI'];

async function api(method, url, body, isForm) {
  const opts = { method, headers: isForm ? headers : { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } };
  if (body) opts.body = body;
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

for (const l of LISTINGS) {
  console.log(`\n━━ ${l.key} (${l.id}) ━━`);

  // 1. replace digital file (upload new first, then delete old)
  if (l.file) {
    const cur = await api('GET', `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.id}/files`);
    const oldIds = (cur.data.results || []).map(f => f.listing_file_id);
    const form = new FormData();
    form.append('file', new Blob([readFileSync(l.file.path)], { type: l.file.type }), l.file.name);
    form.append('name', l.file.name);
    const up = await api('POST', `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.id}/files`, form, true);
    console.log(up.ok ? `  file uploaded: ${l.file.name}` : `  FILE UPLOAD FAILED ${up.status}: ${JSON.stringify(up.data)}`);
    if (up.ok) {
      for (const fid of oldIds) {
        if (fid === up.data.listing_file_id) continue;
        const del = await api('DELETE', `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.id}/files/${fid}`);
        console.log(del.ok ? `  old file ${fid} removed` : `  old file ${fid} delete failed ${del.status}`);
      }
    }
  }

  // 2. upload preview images, composite becomes the thumbnail
  if (l.images !== false) {
    const imgs = [
      { f: `${l.key}-main.jpg`, rank: 1 },
      { f: `${l.key}-week.jpg`, rank: 2 },
      { f: `${l.key}-groc.jpg`, rank: 3 },
      { f: `${l.key}-dir.jpg`, rank: 4 },
    ];
    for (const im of imgs) {
      const form = new FormData();
      form.append('image', new Blob([readFileSync(path.join(IMGS, im.f))], { type: 'image/jpeg' }), im.f);
      form.append('rank', String(im.rank));
      form.append('overwrite', 'true');
      const up = await api('POST', `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.id}/images`, form, true);
      console.log(up.ok ? `  image ${im.f} @rank ${im.rank}` : `  IMAGE FAILED ${im.f} ${up.status}: ${JSON.stringify(up.data)}`);
      await new Promise(r => setTimeout(r, 400));
    }
  }

  // 3. title / tags / materials
  const body = new URLSearchParams();
  body.append('title', l.title);
  body.append('tags', l.tags.join(','));
  body.append('materials', MATERIALS.join(','));
  const patch = await api('PATCH', `https://openapi.etsy.com/v3/application/shops/${SHOP}/listings/${l.id}`, body);
  console.log(patch.ok ? `  title/tags/materials updated` : `  PATCH FAILED ${patch.status}: ${JSON.stringify(patch.data)}`);
  await new Promise(r => setTimeout(r, 500));
}
console.log('\nDone.');
