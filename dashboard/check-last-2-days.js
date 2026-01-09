import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getLast2Days() {
  try {
    console.log('📊 CALCULATOR PERFORMANCE - LAST 2 DAYS\n')
    console.log('=' .repeat(60))

    // Get calculator events breakdown
    const [eventsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }, { name: 'date' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        orGroup: {
          expressions: [
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_free_results' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_upgrade_click' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'purchase' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'payment_initiated' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculate' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'submit_goals' }}}
          ]
        }
      },
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
    })

    // Organize by date
    const dateMap = {}

    if (eventsResponse.rows) {
      eventsResponse.rows.forEach(row => {
        const eventName = row.dimensionValues[0].value
        const date = row.dimensionValues[1].value
        const count = parseInt(row.metricValues[0].value)

        if (!dateMap[date]) dateMap[date] = {}
        dateMap[date][eventName] = count
      })
    }

    // Display by date
    Object.keys(dateMap).sort().forEach(date => {
      const year = date.substring(0, 4)
      const month = date.substring(4, 6)
      const day = date.substring(6, 8)
      const formatted = `${year}-${month}-${day}`

      console.log(`\n📅 ${formatted}`)
      console.log('-'.repeat(60))

      const data = dateMap[date]
      const freeResults = data.calculator_free_results || 0
      const upgradeClicks = data.calculator_upgrade_click || 0
      const purchases = data.purchase || 0
      const calculates = data.calculate || 0
      const submits = data.submit_goals || 0

      console.log(`  Calculator Uses: ${calculates}`)
      console.log(`  Goals Submitted: ${submits}`)
      console.log(`  Free Results Viewed: ${freeResults}`)
      console.log(`  Upgrade Button Clicks: ${upgradeClicks}`)
      console.log(`  Purchases Completed: ${purchases}`)

      if (freeResults > 0) {
        const upgradeRate = ((upgradeClicks / freeResults) * 100).toFixed(1)
        console.log(`  \n  📈 Upgrade Click Rate: ${upgradeRate}%`)
      }

      if (upgradeClicks > 0 && purchases > 0) {
        const purchaseRate = ((purchases / upgradeClicks) * 100).toFixed(1)
        console.log(`  💰 Purchase Conversion: ${purchaseRate}%`)
      }
    })

    // Get calculator page traffic
    console.log('\n\n📍 CALCULATOR PAGE TRAFFIC (Last 2 Days)')
    console.log('=' .repeat(60))

    const [trafficResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'CONTAINS',
            value: 'calculator'
          }
        }
      },
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'averageSessionDuration' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
    })

    if (trafficResponse.rows) {
      trafficResponse.rows.forEach(row => {
        const date = row.dimensionValues[0].value
        const year = date.substring(0, 4)
        const month = date.substring(4, 6)
        const day = date.substring(6, 8)
        const formatted = `${year}-${month}-${day}`

        const views = parseInt(row.metricValues[0].value)
        const users = parseInt(row.metricValues[1].value)
        const sessions = parseInt(row.metricValues[2].value)
        const avgDuration = parseFloat(row.metricValues[3].value).toFixed(0)

        console.log(`\n${formatted}:`)
        console.log(`  Page Views: ${views}`)
        console.log(`  Unique Users: ${users}`)
        console.log(`  Sessions: ${sessions}`)
        console.log(`  Avg Time on Page: ${avgDuration}s`)
      })
    }

    // Overall summary
    console.log('\n\n🎯 OVERALL SUMMARY (Last 2 Days)')
    console.log('=' .repeat(60))

    let totalFreeResults = 0
    let totalUpgradeClicks = 0
    let totalPurchases = 0

    Object.values(dateMap).forEach(data => {
      totalFreeResults += data.calculator_free_results || 0
      totalUpgradeClicks += data.calculator_upgrade_click || 0
      totalPurchases += data.purchase || 0
    })

    console.log(`  Total Free Results: ${totalFreeResults}`)
    console.log(`  Total Upgrade Clicks: ${totalUpgradeClicks}`)
    console.log(`  Total Purchases: ${totalPurchases}`)

    if (totalFreeResults > 0) {
      const overallUpgradeRate = ((totalUpgradeClicks / totalFreeResults) * 100).toFixed(1)
      console.log(`  \n  🎯 Overall Upgrade Click Rate: ${overallUpgradeRate}%`)
    }

    if (totalUpgradeClicks > 0) {
      const overallPurchaseRate = ((totalPurchases / totalUpgradeClicks) * 100).toFixed(1)
      console.log(`  💵 Overall Purchase Rate: ${overallPurchaseRate}%`)
    }

    console.log('\n')

  } catch (error) {
    console.error('Error:', error.message)
  }
}

getLast2Days()
