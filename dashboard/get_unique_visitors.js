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
      { startDate: '2025-01-01', endDate: '2026-01-05' }
    ],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }],
    limit: 100
  })

  const rows = response[0].rows || []
  let total = 0
  
  console.log('Unique Visitors by Date:\n')
  
  rows.forEach(row => {
    const date = row.dimensionValues[0]?.value
    const users = parseInt(row.metricValues[0]?.value)
    total += users
    
    // Format date for readability
    const year = date.substring(0, 4)
    const month = date.substring(4, 6)
    const day = date.substring(6, 8)
    console.log(`${month}/${day}/${year}: ${users} visitors`)
  })
  
  console.log(`\n--- TOTAL UNIQUE VISITORS: ${total} ---`)
} catch (error) {
  console.error('Error:', error.message)
}
