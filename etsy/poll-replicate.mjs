#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';

const TOKEN = JSON.parse(readFileSync('../secrets/api-keys.json', 'utf8')).replicate.api_token;
const ids = {
  meatheals: 'pwtpfqfw9xrmt0cwm3fbq2y2h8',
  pyramid: 'kw4y0wrkj9rmy0cwm3fsf3n85r',
  bbbe: 'w8z6kzh535rmr0cwm3fth7ecvw'
};

for (const [name, id] of Object.entries(ids)) {
  console.log(`\nPolling ${name} (${id})...`);
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    const text = await res.text();
    // Parse carefully - logs field can have control chars
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Strip control chars and retry
      data = JSON.parse(text.replace(/[\x00-\x1f\x7f]/g, ' '));
    }

    if (data.status === 'succeeded') {
      const output = Array.isArray(data.output) ? data.output[0] : data.output;
      console.log(`${name}: SUCCESS - downloading...`);
      const imgRes = await fetch(output);
      const buf = Buffer.from(await imgRes.arrayBuffer());
      writeFileSync(`/tmp/replicate-${name}.png`, buf);
      console.log(`${name}: saved to /tmp/replicate-${name}.png (${buf.length} bytes)`);
      break;
    } else if (data.status === 'failed' || data.status === 'canceled') {
      console.log(`${name}: ${data.status} - ${data.error || 'unknown'}`);
      break;
    } else {
      if (i % 5 === 0) process.stdout.write(`  ${data.status}...`);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}
