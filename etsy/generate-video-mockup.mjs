#!/usr/bin/env node
/**
 * Generate a product mockup video using Kling 3.0 on Replicate.
 * Usage: node generate-video-mockup.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

const TOKEN = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, '../secrets/api-keys.json'), 'utf8')
).replicate.api_token;

const PROMPT = `A white iPad tablet lying flat on a light marble kitchen countertop, angled about 20 degrees toward camera. The tablet screen is completely blank solid white with no reflections, no icons, no UI elements. Soft natural daylight from a window on the left side. A small green succulent plant and a white ceramic coffee mug sit slightly out of focus in the background. Camera slowly pushes in toward the tablet over 5 seconds. Clean, modern, minimal lifestyle aesthetic. Photorealistic.`;

console.log('Submitting to Kling 3.0 Standard (720p, 5 seconds)...');

const res = await fetch('https://api.replicate.com/v1/predictions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    version: undefined,
    model: 'kwaivgi/kling-v3-video',
    input: {
      prompt: PROMPT,
      duration: 5,
      aspect_ratio: '16:9',
      mode: 'standard',
      negative_prompt: 'text on screen, app icons, UI elements, screen glare, reflections on screen, blurry, low quality, watermark',
      generate_audio: false,
    },
  }),
});

const data = await res.json();

if (data.error) {
  console.error('Error:', data.error);
  process.exit(1);
}

console.log(`Prediction ID: ${data.id}`);
console.log(`Status: ${data.status}`);
console.log('Polling for completion...\n');

const OUTPUT_PATH = path.resolve(import.meta.dirname, 'products/mockups/video-mockup-test.mp4');

for (let i = 0; i < 120; i++) {
  await new Promise(r => setTimeout(r, 5000));

  const poll = await fetch(`https://api.replicate.com/v1/predictions/${data.id}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` },
  });
  const status = await poll.json();

  if (status.status === 'succeeded') {
    const url = Array.isArray(status.output) ? status.output[0] : status.output;
    console.log(`\n✅ Done! Downloading video...`);
    const vidRes = await fetch(url);
    const buf = Buffer.from(await vidRes.arrayBuffer());
    writeFileSync(OUTPUT_PATH, buf);
    console.log(`Saved: ${OUTPUT_PATH} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);

    if (status.metrics) {
      console.log(`\nMetrics:`);
      if (status.metrics.predict_time) console.log(`  Generation time: ${status.metrics.predict_time.toFixed(0)}s`);
    }
    process.exit(0);
  } else if (status.status === 'failed' || status.status === 'canceled') {
    console.error(`\n❌ ${status.status}: ${status.error || 'unknown error'}`);
    process.exit(1);
  }

  if (i % 6 === 0) console.log(`  ${status.status}... (${i * 5}s elapsed)`);
}

console.error('Timed out after 10 minutes');
process.exit(1);
