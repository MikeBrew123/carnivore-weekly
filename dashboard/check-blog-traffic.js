import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getBlogTraffic() {
  try {
    console.log('\n📊 BLOG TRAFFIC ANALYSIS - LAST 30 DAYS\n')
    console.log('=' .repeat(70))

    // Get blog page traffic
    const [blogResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'CONTAINS', value: '/blog/' }
        }
      },
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'averageSessionDuration' }
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 30
    })

    if (blogResponse.rows && blogResponse.rows.length > 0) {
      console.log(`\n📝 Blog Posts with Traffic (${blogResponse.rows.length} posts):\n`)

      let totalViews = 0
      let totalUsers = 0

      blogResponse.rows.forEach((row, idx) => {
        const path = row.dimensionValues[0].value
        const title = row.dimensionValues[1].value
        const views = parseInt(row.metricValues[0].value)
        const users = parseInt(row.metricValues[1].value)
        const avgDuration = parseFloat(row.metricValues[2].value).toFixed(0)

        totalViews += views
        totalUsers += users

        console.log(`${idx + 1}. ${views} views, ${users} users, ${avgDuration}s avg`)
        console.log(`   ${title}`)
        console.log(`   ${path}\n`)
      })

      console.log('=' .repeat(70))
      console.log(`\n📈 TOTAL: ${totalViews} blog views from ${totalUsers} users in last 30 days\n`)
    } else {
      console.log('\n⚠️  No blog traffic in the last 30 days\n')
    }

    // Check organic search traffic
    console.log('\n🔍 ORGANIC SEARCH TRAFFIC (Last 30 Days)')
    console.log('=' .repeat(70))

    const [organicResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' }
      ]
    })

    if (organicResponse.rows) {
      organicResponse.rows.forEach(row => {
        const channel = row.dimensionValues[0].value
        const sessions = parseInt(row.metricValues[0].value)
        const users = parseInt(row.metricValues[1].value)

        console.log(`${channel}: ${sessions} sessions, ${users} users`)
      })
    }

    console.log('\n')

  } catch (error) {
    console.error('Error:', error.message)
  }
}

getBlogTraffic()
