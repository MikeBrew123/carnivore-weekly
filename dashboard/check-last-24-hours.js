import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getLast24Hours() {
  try {
    console.log('\n📊 CALCULATOR PERFORMANCE - LAST 24 HOURS\n')
    console.log('=' .repeat(60))

    // Get calculator events
    const [eventsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        orGroup: {
          expressions: [
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_free_results' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_upgrade_click' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'purchase' }}},
          ]
        }
      }
    })

    const eventMap = {}
    eventsResponse.rows?.forEach(row => {
      const eventName = row.dimensionValues[0].value
      const count = parseInt(row.metricValues[0].value)
      eventMap[eventName] = count
    })

    const freeResults = eventMap.calculator_free_results || 0
    const upgradeClicks = eventMap.calculator_upgrade_click || 0
    const purchases = eventMap.purchase || 0

    console.log(`Free Results Viewed: ${freeResults}`)
    console.log(`Upgrade Button Clicks: ${upgradeClicks}`)
    console.log(`Purchases Completed: ${purchases}`)

    if (freeResults > 0) {
      const upgradeRate = ((upgradeClicks / freeResults) * 100).toFixed(1)
      console.log(`\n📈 Upgrade Click Rate: ${upgradeRate}%`)
    }

    // Get calculator page traffic
    console.log('\n\n📍 CALCULATOR PAGE TRAFFIC (Last 24 Hours)')
    console.log('=' .repeat(60))

    const [trafficResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'CONTAINS', value: 'calculator' }
        }
      },
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'averageSessionDuration' }
      ]
    })

    if (trafficResponse.rows?.[0]) {
      const views = parseInt(trafficResponse.rows[0].metricValues[0].value)
      const users = parseInt(trafficResponse.rows[0].metricValues[1].value)
      const sessions = parseInt(trafficResponse.rows[0].metricValues[2].value)
      const avgDuration = parseFloat(trafficResponse.rows[0].metricValues[3].value).toFixed(0)

      console.log(`Page Views: ${views}`)
      console.log(`Unique Users: ${users}`)
      console.log(`Sessions: ${sessions}`)
      console.log(`Avg Time on Page: ${avgDuration}s`)
    } else {
      console.log('No traffic in the last 24 hours')
    }

    // Get unique users who clicked upgrade
    console.log('\n\n👥 UNIQUE USER ANALYSIS (Last 24 Hours)')
    console.log('=' .repeat(60))

    const [upgradeUsers] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'eventCount' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'calculator_upgrade_click' }
        }
      }
    })

    if (upgradeUsers.rows?.[0]) {
      const uniqueUsers = parseInt(upgradeUsers.rows[0].metricValues[0].value)
      const totalClicks = parseInt(upgradeUsers.rows[0].metricValues[1].value)

      console.log(`Unique Users Who Clicked Upgrade: ${uniqueUsers}`)
      console.log(`Total Upgrade Clicks: ${totalClicks}`)

      if (totalClicks > uniqueUsers) {
        console.log(`⚠️  ${totalClicks - uniqueUsers} repeat clicks`)
      }
    } else {
      console.log('No upgrade clicks in the last 24 hours')
    }

    console.log('\n')

  } catch (error) {
    console.error('Error:', error.message)
  }
}

getLast24Hours()
