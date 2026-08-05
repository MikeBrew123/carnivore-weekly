import { BetaAnalyticsDataClient } from '@google-analytics/data'
const client = new BetaAnalyticsDataClient({ keyFilename: './ga4-credentials.json' })
const [r] = await client.runReport({
  property: 'properties/539655784',
  dateRanges: [{ startDate: '90daysAgo', endDate: 'today' }],
  dimensions: [{ name: 'date' }, { name: 'city' }, { name: 'region' }, { name: 'deviceCategory' }, { name: 'landingPage' }],
  metrics: [{ name: 'sessions' }],
  dimensionFilter: { filter: { fieldName: 'sessionSourceMedium', stringFilter: { matchType: 'CONTAINS', value: 'pinterest', caseSensitive: false } } },
  orderBys: [{ dimension: { dimensionName: 'date' } }], limit: 50
})
console.log('PINTEREST SESSION DETAIL (KD, 90d):')
r.rows?.forEach(x => console.log('  ' + x.dimensionValues.map(d => d.value).join(' | ') + ' -> ' + x.metricValues[0].value))
// property data availability
const [r2] = await client.runReport({
  property: 'properties/539655784',
  dateRanges: [{ startDate: '2025-01-01', endDate: 'today' }],
  dimensions: [{ name: 'sessionSourceMedium' }], metrics: [{ name: 'sessions' }],
  dimensionFilter: { filter: { fieldName: 'sessionSourceMedium', stringFilter: { matchType: 'CONTAINS', value: 'pinterest', caseSensitive: false } } }, limit: 20
})
console.log('\nALL-TIME PINTEREST (KD):')
r2.rows?.forEach(x => console.log('  ' + x.dimensionValues[0].value + ' -> ' + x.metricValues[0].value)) || console.log('  none')
const [r3] = await client.runReport({
  property: 'properties/517632328',
  dateRanges: [{ startDate: '2025-01-01', endDate: 'today' }],
  dimensions: [{ name: 'sessionSourceMedium' }], metrics: [{ name: 'sessions' }],
  dimensionFilter: { filter: { fieldName: 'sessionSourceMedium', stringFilter: { matchType: 'CONTAINS', value: 'pinterest', caseSensitive: false } } }, limit: 20
})
console.log('\nALL-TIME PINTEREST (CW, since 2025-01-01):')
console.log(r3.rows?.length ? r3.rows.map(x => '  ' + x.dimensionValues[0].value + ' -> ' + x.metricValues[0].value).join('\n') : '  NONE - zero sessions all time')
