#!/usr/bin/env node
// Pinterest referral check against GA4, for both properties.
//
// Answers one question: is Pinterest sending anyone to CW or KD, and does any of
// it carry a utm campaign? Windows are computed relative to the end date, so this
// keeps working; it is not pinned to the 2026-08-24 read it was first written for.
//
//   node dashboard/pinterest-traffic-check.mjs                  # windows ending today
//   node dashboard/pinterest-traffic-check.mjs --end 2026-08-24 # reproduce an older read
//   node dashboard/pinterest-traffic-check.mjs --since 2026-07-29
//
// --since adds an extra "since <date>" window, for measuring from the day a
// campaign started. Read-only: GA4 runReport calls, nothing is written anywhere.
import path from 'path';
import { fileURLToPath } from 'url';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const client = new BetaAnalyticsDataClient({
  keyFilename: path.resolve(__dirname, 'ga4-credentials.json'),
});

const PROPS = [
  { n: 'Carnivore Weekly', id: '517632328' },
  { n: 'KetoDial', id: '539655784' },
];

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
};
const iso = (d) => d.toISOString().slice(0, 10);
const daysBefore = (end, n) => {
  const d = new Date(`${end}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return iso(d);
};

const END = arg('--end') || iso(new Date());
const SINCE = arg('--since');
if (!/^\d{4}-\d{2}-\d{2}$/.test(END)) throw new Error(`--end must be YYYY-MM-DD, got "${END}"`);
if (SINCE && !/^\d{4}-\d{2}-\d{2}$/.test(SINCE)) throw new Error(`--since must be YYYY-MM-DD, got "${SINCE}"`);

const RANGES = [
  { label: '28d', startDate: daysBefore(END, 27), endDate: END },
  { label: '90d', startDate: daysBefore(END, 89), endDate: END },
  { label: 'all-time', startDate: '2024-01-01', endDate: END },
];
if (SINCE) RANGES.splice(1, 0, { label: `since-${SINCE}`, startDate: SINCE, endDate: END });

// the window used for the utm campaign breakdown
const CAMPAIGN_FROM = SINCE || daysBefore(END, 27);

async function safe(fn, label) {
  try {
    return await fn();
  } catch (e) {
    console.log(`  !!ERR ${label}: ${e.message?.slice(0, 180)}`);
    return null;
  }
}

const isPinterest = (s) => /pinterest|pin\.it/i.test(s);

for (const p of PROPS) {
  console.log(`\n########## ${p.n} (${p.id}) ##########`);
  for (const r of RANGES) {
    const range = { startDate: r.startDate, endDate: r.endDate };
    const tot = await safe(async () => {
      const [x] = await client.runReport({
        property: `properties/${p.id}`,
        dateRanges: [range],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
      });
      return x.rows?.[0]?.metricValues.map((m) => m.value);
    }, 'totals');

    const pin = await safe(async () => {
      const [x] = await client.runReport({
        property: `properties/${p.id}`,
        dateRanges: [range],
        dimensions: [{ name: 'sessionSourceMedium' }],
        metrics: [
          { name: 'sessions' }, { name: 'totalUsers' },
          { name: 'engagedSessions' }, { name: 'keyEvents' },
        ],
      });
      return (x.rows || [])
        .filter((row) => isPinterest(row.dimensionValues[0].value))
        .map((row) => [row.dimensionValues[0].value, ...row.metricValues.map((m) => m.value)]);
    }, 'pinterest');

    console.log(`\n[${r.label}] ${r.startDate}..${r.endDate}  SITE TOTAL sessions/users: ${tot ? tot.join(' / ') : 'n/a'}`);
    if (!pin || pin.length === 0) console.log('   PINTEREST: ZERO rows (no pinterest source/medium at all)');
    else pin.forEach((v) => console.log(`   PINTEREST ${v[0]}: sessions=${v[1]} users=${v[2]} engaged=${v[3]} keyEvents=${v[4]}`));
  }

  const camp = await safe(async () => {
    const [x] = await client.runReport({
      property: `properties/${p.id}`,
      dateRanges: [{ startDate: CAMPAIGN_FROM, endDate: END }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }, { name: 'sessionCampaignName' }],
      metrics: [{ name: 'sessions' }],
    });
    return (x.rows || [])
      .filter((row) => /pinterest|social/i.test(row.dimensionValues.map((d) => d.value).join(' ')))
      .map((row) => `${row.dimensionValues.map((d) => d.value).join(' | ')} => ${row.metricValues[0].value}`);
  }, 'campaigns');

  console.log(
    `\n[utm social/pinterest campaigns ${CAMPAIGN_FROM}..${END}] ${p.n}:`,
    camp && camp.length ? `\n   ${camp.join('\n   ')}` : 'NONE',
  );
}
