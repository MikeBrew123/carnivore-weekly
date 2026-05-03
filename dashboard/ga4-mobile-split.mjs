import { BetaAnalyticsDataClient } from '@google-analytics/data';
import path from 'path';
const credPath = path.resolve('/Users/mbrew/Developer/carnivore-weekly/dashboard/ga4-credentials.json');
const client = new BetaAnalyticsDataClient({ keyFilename: credPath });
const PROPERTY = 'properties/517632328';

console.log('=== /calculator.html — desktop vs mobile (last 30d) ===\n');
for (const path of ['/calculator.html']) {
  const [resp] = await client.runReport({
    property: PROPERTY,
    dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'totalUsers' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' },
    ],
    dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { value: path, matchType: 'EXACT' } } },
  });
  for (const row of resp.rows || []) {
    const [device] = row.dimensionValues.map(d => d.value);
    const [views, users, eng, avgSec] = row.metricValues.map(m => m.value);
    console.log(`  ${device.padEnd(8)} | ${String(views).padStart(4)} views | ${String(users).padStart(4)} users | engagement ${(parseFloat(eng)*100).toFixed(1)}% | avg ${parseFloat(avgSec).toFixed(0)}s`);
  }
}

console.log('\n=== Calculator events by device (last 7d) ===\n');
const events = ['calculator_free_results', 'calculator_meal_lock_seen', 'calculator_lock_overlay_click', 'calculator_payment_modal_opened'];
for (const ev of events) {
  const [resp] = await client.runReport({
    property: PROPERTY,
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: ev, matchType: 'EXACT' } } },
  });
  if (resp.rows && resp.rows.length) {
    const split = {};
    for (const row of resp.rows) split[row.dimensionValues[0].value] = row.metricValues[0].value;
    console.log(`  ${ev.padEnd(35)} | desktop:${(split.desktop||0).toString().padStart(3)} | mobile:${(split.mobile||0).toString().padStart(3)} | tablet:${(split.tablet||0).toString().padStart(3)}`);
  } else {
    console.log(`  ${ev.padEnd(35)} | (no events)`);
  }
}
