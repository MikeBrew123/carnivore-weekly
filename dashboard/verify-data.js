import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

try {
  // Get page views by date for all data
  const response = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: '2025-01-01', endDate: '2026-01-01' }
    ],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'screenPageViews' }],
    limit: 100
  })

  const rows = response[0].rows || []
  let total = 0
  let totalLast7 = 0
  let totalLast30 = 0
  
  const today = new Date()
  const sevenDaysAgo = new Date(today.getTime() - 7*24*60*60*1000)
  const thirtyDaysAgo = new Date(today.getTime() - 30*24*60*60*1000)
  
  console.log(`Today's date: ${today.toISOString().split('T')[0]}`)
  console.log(`7 days ago: ${sevenDaysAgo.toISOString().split('T')[0]}`)
  console.log(`30 days ago: ${thirtyDaysAgo.toISOString().split('T')[0]}`)
  console.log(`\nAll traffic (YYYYMMDD format):\n`)
  
  rows.forEach(row => {
    const date = row.dimensionValues[0]?.value
    const views = parseInt(row.metricValues[0]?.value)
    
    // Parse YYYYMMDD format
    const year = parseInt(date.substring(0, 4))
    const month = parseInt(date.substring(4, 6)) - 1
    const day = parseInt(date.substring(6, 8))
    const rowDate = new Date(year, month, day)
    
    total += views
    
    if (rowDate >= sevenDaysAgo) {
      totalLast7 += views
    }
    if (rowDate >= thirtyDaysAgo) {
      totalLast30 += views
    }
    
    console.log(`${date}: ${views} views`)
  })
  
  console.log(`\n--- SUMMARY ---`)
  console.log(`Total all-time: ${total}`)
  console.log(`Last 7 days: ${totalLast7}`)
  console.log(`Last 30 days: ${totalLast30}`)
} catch (error) {
  console.error('Error:', error.message)
}
