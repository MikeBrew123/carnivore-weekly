import { BetaAnalyticsDataClient } from '@google-analytics/data'
const c = new BetaAnalyticsDataClient({ keyFilename: './ga4-credentials.json' })
const [r] = await c.runReport({
  property: 'properties/539655784',
  dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
  dimensions: [{ name: 'country' }, { name: 'deviceCategory' }],
  metrics: [{ name: 'sessions' }], orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 15
})
console.log('KD ALL TRAFFIC by country/device (90d):')
r.rows?.forEach(x => console.log('  ' + x.dimensionValues.map(d => d.value).join(' | ') + ' -> ' + x.metricValues[0].value))
const [r2] = await c.runReport({
  property: 'properties/539655784',
  dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
  dimensions: [{ name: 'eventName' }], metrics: [{ name: 'eventCount' }],
  orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 25
})
console.log('\nKD ALL EVENTS (90d):')
r2.rows?.forEach(x => console.log('  ' + x.dimensionValues[0].value + ' -> ' + x.metricValues[0].value))
