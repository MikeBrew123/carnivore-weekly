#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const TOKEN = JSON.parse(readFileSync('../secrets/api-keys.json', 'utf8')).replicate.api_token;

const icons = [
  { name: 'beef', prompt: 'Flat vector illustration of raw beef cuts on white background: ribeye steak, ground beef patty, brisket, short ribs. Vibrant colors, clean food illustration style, no text, no labels, bright and appetizing, editorial food art' },
  { name: 'organs', prompt: 'Flat vector illustration of organ meats on white background: beef liver, heart, tongue, bone marrow. Rich deep red and brown colors, clean food illustration style, no text, appetizing presentation, editorial food art' },
  { name: 'lamb', prompt: 'Flat vector illustration of lamb cuts on white background: lamb chops, rack of lamb, lamb shank, ground lamb. Warm colors, clean food illustration style, no text, appetizing, editorial food art' },
  { name: 'pork', prompt: 'Flat vector illustration of pork products on white background: crispy bacon strips, pork belly, pork chops, pork ribs. Warm golden and pink colors, clean food illustration style, no text, editorial food art' },
  { name: 'poultry', prompt: 'Flat vector illustration of poultry on white background: whole roasted chicken, chicken thighs, chicken wings, turkey leg, duck breast. Golden brown colors, clean food illustration style, no text, editorial food art' },
  { name: 'seafood', prompt: 'Flat vector illustration of fish and seafood on white background: salmon fillet, shrimp, lobster, oysters, sardines, crab. Ocean blues and pinks, clean food illustration style, no text, editorial food art' },
  { name: 'dairy', prompt: 'Flat vector illustration of eggs and dairy on white background: eggs in carton, block of butter, cheese wheel, heavy cream, sour cream. Warm yellows and creams, clean food illustration style, no text, editorial food art' },
  { name: 'vegetables', prompt: 'Flat vector illustration of low-carb vegetables on white background: broccoli, spinach leaves, cauliflower, zucchini, asparagus, mushrooms, kale. Fresh greens, clean food illustration style, no text, editorial food art' },
  { name: 'nuts-berries', prompt: 'Flat vector illustration of nuts seeds and berries on white background: almonds, walnuts, pecans, macadamia nuts, chia seeds, blackberries, raspberries, strawberries. Rich colors, clean food illustration style, no text, editorial food art' },
  { name: 'grains-legumes', prompt: 'Flat vector illustration of grains and legumes on white background: bowl of rice, quinoa, lentils, chickpeas, black beans, oats, whole wheat bread. Warm earth tones, clean food illustration style, no text, editorial food art' },
];

const submitted = [];
for (const icon of icons) {
  console.log(`Submitting ${icon.name}...`);
  const res = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      version: '71516450bdbeafc41df33ad538bc8cc6a90f80038a563b1260531c02d694f4fd',
      input: { prompt: icon.prompt, aspect_ratio: '1:1' }
    })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    console.log(`  ❌ HTTP ${res.status}: ${JSON.stringify(data).slice(0,200)}`);
    // Wait longer on rate limit
    if (res.status === 429) {
      console.log('  Waiting 30s for rate limit...');
      await new Promise(r => setTimeout(r, 30000));
      // Retry
      const retry = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: '71516450bdbeafc41df33ad538bc8cc6a90f80038a563b1260531c02d694f4fd', input: { prompt: icon.prompt, aspect_ratio: '1:1' } })
      });
      const retryData = await retry.json();
      if (retryData.id) {
        submitted.push({ name: icon.name, id: retryData.id });
        console.log(`  → retry: ${retryData.id}`);
      } else {
        console.log(`  ❌ retry failed: ${JSON.stringify(retryData).slice(0,200)}`);
      }
    }
  } else {
    submitted.push({ name: icon.name, id: data.id });
    console.log(`  → ${data.id}`);
  }
  await new Promise(r => setTimeout(r, 6000)); // 6s between submissions
}

console.log(`\nSubmitted ${submitted.length} predictions. Polling...`);

// Poll all predictions
for (const s of submitted) {
  console.log(`\nPolling ${s.name} (${s.id})...`);
  for (let i = 0; i < 90; i++) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${s.id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = JSON.parse(text.replace(/[\x00-\x1f\x7f]/g, ' ')); }

    if (data.status === 'succeeded') {
      const output = Array.isArray(data.output) ? data.output[0] : data.output;
      const imgRes = await fetch(output);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      writeFileSync(`/tmp/food-icon-${s.name}.png`, buf);
      console.log(`  ✅ ${s.name}: ${buf.length} bytes`);
      break;
    } else if (data.status === 'failed' || data.status === 'canceled') {
      console.log(`  ❌ ${s.name}: ${data.status}`);
      break;
    } else {
      if (i % 5 === 0) process.stdout.write(`  ${data.status}...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

console.log('\nAll food icons generated!');
