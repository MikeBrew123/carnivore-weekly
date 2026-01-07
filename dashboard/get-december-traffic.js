import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getDecemberTraffic() {
  try {
    console.log('Fetching December 2025 GA4 data...\n')

    // Get overall metrics
    const [overallResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2025-12-01', endDate: '2025-12-31' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ]
    })

    // Get device breakdown
    const [deviceResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2025-12-01', endDate: '2025-12-31' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'sessions' }]
    })

    // Get top pages
    const [pagesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2025-12-01', endDate: '2025-12-31' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10
    })

    // Display results
    console.log('=== DECEMBER 2025 TRAFFIC SUMMARY ===\n')

    if (overallResponse.rows && overallResponse.rows.length > 0) {
      const row = overallResponse.rows[0]
      const pageViews = parseInt(row.metricValues[0].value)
      const sessions = parseInt(row.metricValues[1].value)
      const users = parseInt(row.metricValues[2].value)
      const newUsers = parseInt(row.metricValues[3].value)
      const avgDuration = parseFloat(row.metricValues[4].value)
      const bounceRate = parseFloat(row.metricValues[5].value)

      console.log('Overall Metrics:')
      console.log(`  Page Views: ${pageViews.toLocaleString()}`)
      console.log(`  Sessions: ${sessions.toLocaleString()}`)
      console.log(`  Total Users: ${users.toLocaleString()}`)
      console.log(`  New Users: ${newUsers.toLocaleString()}`)
      console.log(`  Avg Session Duration: ${Math.round(avgDuration)}s`)
      console.log(`  Bounce Rate: ${(bounceRate * 100).toFixed(1)}%`)
      console.log()
    }

    console.log('Device Breakdown:')
    if (deviceResponse.rows) {
      deviceResponse.rows.forEach(row => {
        const device = row.dimensionValues[0].value
        const views = parseInt(row.metricValues[0].value)
        const sess = parseInt(row.metricValues[1].value)
        console.log(`  ${device}: ${views.toLocaleString()} views, ${sess.toLocaleString()} sessions`)
      })
      console.log()
    }

    console.log('Top 10 Pages:')
    if (pagesResponse.rows) {
      pagesResponse.rows.forEach((row, i) => {
        const page = row.dimensionValues[0].value
        const views = parseInt(row.metricValues[0].value)
        console.log(`  ${i + 1}. ${page} - ${views.toLocaleString()} views`)
      })
    }

  } catch (error) {
    console.error('Error fetching GA4 data:', error.message)
    if (error.details) console.error('Details:', error.details)
  }
}

getDecemberTraffic()
