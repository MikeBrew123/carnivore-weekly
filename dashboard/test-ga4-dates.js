import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

try {
  // Test with explicit dates
  const response = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: '2026-01-01', endDate: '2026-01-01' },  // Today
      { startDate: '2025-12-25', endDate: '2026-01-01' },  // Last 7 days
      { startDate: '2025-12-02', endDate: '2026-01-01' }   // Last 30 days
    ],
    metrics: [{ name: 'screenPageViews' }]
  })

  const rows = response[0].rows || []
  console.log('Explicit dates:')
  console.log('2026-01-01 to 2026-01-01 (today):', rows[0]?.metricValues[0]?.value)
  console.log('2025-12-25 to 2026-01-01 (7 days):', rows[1]?.metricValues[0]?.value)
  console.log('2025-12-02 to 2026-01-01 (30 days):', rows[2]?.metricValues[0]?.value)
} catch (error) {
  console.error('Error:', error.message)
}
