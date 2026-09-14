// READ-ONLY market probe. GET only, never writes to Etsy.
// For each target query: how many listings compete, and what the top-ranked
// (sort_on=score) results look like — price, age, tags. Used to size demand and
// crowding before committing to a product family.
//
// Usage: node etsy/audit-market-demand.mjs [queriesFile.json]
//        node etsy/audit-market-demand.mjs --json > out.json
import { getEtsyToken, ETSY_CLIENT_ID, ETSY_SHARED_SECRET } from './token.mjs';
import { readFileSync } from 'fs';

const token = await getEtsyToken();
const headers = {
  'x-api-key': `${ETSY_CLIENT_ID}:${ETSY_SHARED_SECRET}`,
  Authorization: `Bearer ${token}`,
};

const DEFAULT_QUERIES = [
  // Family 1 — food lists
  'carnivore food list', 'carnivore diet food list printable',
  'keto food list', 'keto food list printable',
  'carnivore foods to eat and avoid', 'keto foods to eat and avoid',
  'low carb foods to eat and avoid',
  // Family 2 — shopping
  'carnivore grocery list', 'keto grocery list',
  'carnivore costco shopping list', 'keto costco shopping list',
  'costco keto shopping list', 'costco grocery list',
  'carnivore meal planner grocery list',
  // Family 3 — specific problems
  'carnivore 7 day meal plan', 'keto 7 day meal plan',
  'carnivore beginner meal plan', 'keto beginner meal plan',
  'carnivore restaurant guide', 'keto restaurant guide',
  'keto eating out guide', 'carnivore diet tracker',
  'carnivore 30 day tracker', 'keto diet tracker printable',
];

const argFile = process.argv.find((a) => a.endsWith('.json') && !a.startsWith('--'));
const QUERIES = argFile ? JSON.parse(readFileSync(argFile, 'utf8')) : DEFAULT_QUERIES;
const asJson = process.argv.includes('--json');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(q) {
  const url = `https://openapi.etsy.com/v3/application/listings/active?keywords=${encodeURIComponent(q)}&sort_on=score&sort_order=desc&limit=20`;
  const r = await fetch(url, { headers });
  if (!r.ok) return { q, error: `HTTP ${r.status}`, count: null, top: [] };
  const b = await r.json();
  const top = (b.results || []).map((l) => ({
    id: l.listing_id,
    title: l.title,
    price: l.price ? l.price.amount / l.price.divisor : null,
    cur: l.price?.currency_code,
    views: l.views ?? null,
    favs: l.num_favorers ?? null,
    tags: l.tags || [],
    digital: l.is_digital ?? null,
  }));
  return { q, count: b.count ?? null, top };
}

const out = [];
for (const q of QUERIES) {
  out.push(await probe(q));
  await sleep(1100); // stay well inside Etsy's rate limit
}

if (asJson) {
  console.log(JSON.stringify(out, null, 1));
} else {
  for (const r of out) {
    console.log(`\n=== "${r.q}" ${r.error ? `[${r.error}]` : `— ${r.count} competing listings`}`);
    if (!r.top.length) { console.log('  (no results)'); continue; }
    const prices = r.top.map((t) => t.price).filter((p) => p != null).sort((a, b) => a - b);
    const med = prices.length ? prices[Math.floor(prices.length / 2)] : null;
    const favs = r.top.map((t) => t.favs ?? 0);
    console.log(`  top-20 median price ${med} ${r.top[0].cur || ''} | favs: max ${Math.max(...favs)}, median ${favs.sort((a,b)=>a-b)[Math.floor(favs.length/2)]}`);
    for (const t of r.top.slice(0, 6)) {
      console.log(`   ${String(t.favs ?? 0).padStart(6)} favs | ${String(t.price ?? '?').padStart(6)} ${t.cur || ''} | ${t.title.slice(0, 68)}`);
    }
    // tag frequency across the top 20 — what the winners actually tag
    const tf = {};
    for (const t of r.top) for (const tag of t.tags) tf[tag.toLowerCase()] = (tf[tag.toLowerCase()] || 0) + 1;
    const topTags = Object.entries(tf).sort((a, b) => b[1] - a[1]).slice(0, 10);
    console.log(`  winning tags: ${topTags.map(([t, n]) => `${t}(${n})`).join(', ')}`);
  }
}
