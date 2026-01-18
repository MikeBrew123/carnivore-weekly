import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getOverallTraffic() {
  try {
    console.log('\n📊 OVERALL SITE TRAFFIC - LAST 2 DAYS\n')
    console.log('=' .repeat(60))

    // Overall site metrics
    const [overallResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'sessions' }
      ]
    })

    if (overallResponse.rows?.[0]) {
      const views = parseInt(overallResponse.rows[0].metricValues[0].value)
      const users = parseInt(overallResponse.rows[0].metricValues[1].value)
      const sessions = parseInt(overallResponse.rows[0].metricValues[2].value)

      console.log(`Total Page Views: ${views}`)
      console.log(`Total Users: ${users}`)
      console.log(`Total Sessions: ${sessions}`)
    }

    // Top pages
    console.log('\n\n📍 TOP 15 PAGES (Last 2 Days)')
    console.log('=' .repeat(60))

    const [topPages] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15
    })

    topPages.rows?.forEach((row, idx) => {
      const path = row.dimensionValues[0].value
      const title = row.dimensionValues[1].value
      const views = parseInt(row.metricValues[0].value)
      console.log(`${idx + 1}. ${views} views - ${title}`)
      console.log(`   ${path}`)
    })

    // Check homepage traffic specifically
    console.log('\n\n🏠 HOMEPAGE TRAFFIC (Last 2 Days)')
    console.log('=' .repeat(60))

    const [homepageResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      dimensionFilter: {
        orGroup: {
          expressions: [
            { filter: { fieldName: 'pagePath', stringFilter: { value: '/' }}},
            { filter: { fieldName: 'pagePath', stringFilter: { value: '/index.html' }}}
          ]
        }
      },
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' }
      ]
    })

    if (homepageResponse.rows?.[0]) {
      const views = parseInt(homepageResponse.rows[0].metricValues[0].value)
      const users = parseInt(homepageResponse.rows[0].metricValues[1].value)

      console.log(`Homepage Views: ${views}`)
      console.log(`Homepage Users: ${users}`)
    } else {
      console.log('No homepage traffic')
    }

    console.log('\n')

  } catch (error) {
    console.error('Error:', error.message)
  }
}

getOverallTraffic()
