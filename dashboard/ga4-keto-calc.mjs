// Pull GA4 stats for /keto-macro-calculator vs /calculator (last 30 days)
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';

const credPath = path.resolve('/Users/mbrew/Developer/carnivore-weekly/dashboard/ga4-credentials.json');
const client = new BetaAnalyticsDataClient({ keyFilename: credPath });
const PROPERTY = 'properties/517632328';

const pages = [
  '/keto-macro-calculator.html',
  '/keto-macro-calculator',
  '/calculator.html',
  '/calculator',
  '/starter-plan.html',
];

console.log('=== GA4 — last 30 days (page-level) ===\n');

for (const p of pages) {
  const [resp] = await client.runReport({
    property: PROPERTY,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'totalUsers' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
    ],
    dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { value: p, matchType: 'EXACT' } } },
  });
  const row = resp.rows?.[0];
  if (row) {
    const [views, users, eng, avgSec] = row.metricValues.map(m => m.value);
    console.log(`${p.padEnd(40)} | ${String(views).padStart(5)} views | ${String(users).padStart(4)} users | engagement ${(parseFloat(eng)*100).toFixed(1)}% | avg ${parseFloat(avgSec).toFixed(0)}s`);
  } else {
    console.log(`${p.padEnd(40)} | (no data)`);
  }
}

// Compare 30d vs prior 30d for keto-macro-calculator
console.log('\n=== /keto-macro-calculator — trend comparison ===\n');
for (const range of [
  { label: 'last 7d',     start: '7daysAgo',  end: 'today' },
  { label: 'prev 7d',     start: '14daysAgo', end: '8daysAgo' },
  { label: 'last 30d',    start: '30daysAgo', end: 'today' },
  { label: 'prev 30d',    start: '60daysAgo', end: '31daysAgo' },
]) {
  const [resp] = await client.runReport({
    property: PROPERTY,
    dateRanges: [{ startDate: range.start, endDate: range.end }],
    metrics: [{ name: 'screenPageViews' }, { name: 'totalUsers' }, { name: 'engagementRate' }],
    dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { value: '/keto-macro-calculator', matchType: 'CONTAINS' } } },
  });
  const row = resp.rows?.[0];
  if (row) {
    const [views, users, eng] = row.metricValues.map(m => m.value);
    console.log(`  ${range.label.padEnd(12)} | ${String(views).padStart(5)} views | ${String(users).padStart(4)} users | engagement ${(parseFloat(eng)*100).toFixed(1)}%`);
  } else {
    console.log(`  ${range.label.padEnd(12)} | 0 views`);
  }
}

// Top traffic sources
console.log('\n=== Top traffic sources to /keto-macro-calculator (last 30d) ===');
const [src] = await client.runReport({
  property: PROPERTY,
  dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
  dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
  metrics: [{ name: 'sessions' }, { name: 'engagedSessions' }],
  dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { value: '/keto-macro-calculator', matchType: 'CONTAINS' } } },
  orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
  limit: 10,
});
if (src.rows && src.rows.length) {
  for (const row of src.rows) {
    const source = row.dimensionValues[0].value || '(direct)';
    const medium = row.dimensionValues[1].value || '(none)';
    const sessions = row.metricValues[0].value;
    const engaged = row.metricValues[1].value;
    console.log(`  ${source} / ${medium} | ${sessions} sessions | ${engaged} engaged`);
  }
} else {
  console.log('  (no traffic data found)');
}
