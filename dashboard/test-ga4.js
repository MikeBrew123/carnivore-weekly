import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

try {
  const response = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: 'today', endDate: 'today' },
      { startDate: '7daysAgo', endDate: 'today' },
      { startDate: '30daysAgo', endDate: 'today' }
    ],
    metrics: [{ name: 'screenPageViews' }]
  })

  console.log('Full response:', JSON.stringify(response[0], null, 2))
  
  const rows = response[0].rows || []
  console.log('\nParsed values:')
  console.log('Today (row 0):', rows[0]?.metricValues[0]?.value)
  console.log('Last 7 days (row 1):', rows[1]?.metricValues[0]?.value)
  console.log('Last 30 days (row 2):', rows[2]?.metricValues[0]?.value)
} catch (error) {
  console.error('Error:', error.message)
}
