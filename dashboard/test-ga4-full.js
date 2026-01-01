import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

try {
  // Get page views by date to see the actual distribution
  const response = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: '2025-11-01', endDate: '2026-01-01' }  // Last 2 months
    ],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'screenPageViews' }],
    limit: 62
  })

  const rows = response[0].rows || []
  console.log(`Found ${rows.length} days with data\n`)
  console.log('Most recent dates:')
  rows.slice(0, 15).forEach((row, idx) => {
    const date = row.dimensionValues[0]?.value
    const views = row.metricValues[0]?.value
    console.log(`${date}: ${views}`)
  })
} catch (error) {
  console.error('Error:', error.message)
}
