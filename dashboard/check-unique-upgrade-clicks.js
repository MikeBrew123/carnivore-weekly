import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getUniqueUpgradeClicks() {
  try {
    // Get unique users who clicked upgrade button
    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'eventCount' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'calculator_upgrade_click'
          }
        }
      }
    })

    if (response.rows?.[0]) {
      const uniqueUsers = parseInt(response.rows[0].metricValues[0].value)
      const totalClicks = parseInt(response.rows[0].metricValues[1].value)

      console.log('\n📊 UPGRADE CLICK ANALYSIS (Last 2 Days)')
      console.log('='.repeat(50))
      console.log(`Total Upgrade Clicks: ${totalClicks}`)
      console.log(`Unique Users Who Clicked: ${uniqueUsers}`)
      console.log(`Avg Clicks per User: ${(totalClicks / uniqueUsers).toFixed(2)}`)

      if (totalClicks > uniqueUsers) {
        console.log(`\n⚠️  ${totalClicks - uniqueUsers} repeat clicks detected`)
      }
    } else {
      console.log('No upgrade clicks in the last 2 days')
    }

    // Also check free results viewers for comparison
    const [resultsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'eventCount' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'calculator_free_results'
          }
        }
      }
    })

    if (resultsResponse.rows?.[0]) {
      const uniqueViewers = parseInt(resultsResponse.rows[0].metricValues[0].value)
      const totalViews = parseInt(resultsResponse.rows[0].metricValues[1].value)

      console.log('\n📊 FREE RESULTS VIEWS (Last 2 Days)')
      console.log('='.repeat(50))
      console.log(`Total Results Views: ${totalViews}`)
      console.log(`Unique Users Who Viewed: ${uniqueViewers}`)

      if (response.rows?.[0]) {
        const uniqueUpgradeClickers = parseInt(response.rows[0].metricValues[0].value)
        const conversionRate = ((uniqueUpgradeClickers / uniqueViewers) * 100).toFixed(1)
        console.log(`\n🎯 UNIQUE USER CONVERSION`)
        console.log('='.repeat(50))
        console.log(`${uniqueUpgradeClickers} out of ${uniqueViewers} users clicked upgrade`)
        console.log(`Conversion Rate: ${conversionRate}%`)
      }
    }

  } catch (error) {
    console.error('Error:', error.message)
  }
}

getUniqueUpgradeClicks()
