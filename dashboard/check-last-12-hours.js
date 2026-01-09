import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getLast12Hours() {
  try {
    const now = new Date()
    const twelveHoursAgo = new Date(now - 12 * 60 * 60 * 1000)

    console.log('📊 CALCULATOR FUNNEL - LAST 12 HOURS')
    console.log('=' .repeat(60))
    console.log(`Time Range: ${twelveHoursAgo.toISOString()} to ${now.toISOString()}`)
    console.log('=' .repeat(60))

    // Get calculator page views
    const [pageViewsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{
        startDate: 'today',
        endDate: 'today'
      }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'CONTAINS',
            value: 'calculator'
          }
        }
      },
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' }
      ]
    })

    let totalPageViews = 0
    let totalUsers = 0

    if (pageViewsResponse.rows) {
      pageViewsResponse.rows.forEach(row => {
        totalPageViews += parseInt(row.metricValues[0].value)
        totalUsers += parseInt(row.metricValues[1].value)
      })
    }

    console.log('\n📍 CALCULATOR PAGE TRAFFIC')
    console.log('-'.repeat(60))
    console.log(`  Total Page Views: ${totalPageViews}`)
    console.log(`  Unique Users: ${totalUsers}`)

    // Get calculator events
    const [eventsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{
        startDate: 'today',
        endDate: 'today'
      }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        orGroup: {
          expressions: [
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_free_results' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_upgrade_click' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_payment_modal_opened' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_payment_complete' }}},
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_report_generated' }}},
          ]
        }
      }
    })

    const events = {}
    if (eventsResponse.rows) {
      eventsResponse.rows.forEach(row => {
        const eventName = row.dimensionValues[0].value
        const count = parseInt(row.metricValues[0].value)
        events[eventName] = count
      })
    }

    console.log('\n🎯 CALCULATOR EVENTS')
    console.log('-'.repeat(60))
    console.log(`  calculator_free_results: ${events.calculator_free_results || 0}`)
    console.log(`  calculator_upgrade_click: ${events.calculator_upgrade_click || 0}`)
    console.log(`  calculator_payment_modal_opened: ${events.calculator_payment_modal_opened || 0}`)
    console.log(`  calculator_payment_complete: ${events.calculator_payment_complete || 0}`)
    console.log(`  calculator_report_generated: ${events.calculator_report_generated || 0}`)

    // Calculate conversion rates
    const freeResults = events.calculator_free_results || 0
    const upgradeClicks = events.calculator_upgrade_click || 0
    const modalOpened = events.calculator_payment_modal_opened || 0
    const paymentComplete = events.calculator_payment_complete || 0
    const reportGenerated = events.calculator_report_generated || 0

    console.log('\n📈 CONVERSION FUNNEL')
    console.log('-'.repeat(60))

    if (totalPageViews > 0) {
      const completionRate = ((freeResults / totalPageViews) * 100).toFixed(1)
      console.log(`  Page View → Free Results: ${completionRate}% (${freeResults}/${totalPageViews})`)
    }

    if (freeResults > 0) {
      const upgradeRate = ((upgradeClicks / freeResults) * 100).toFixed(1)
      console.log(`  Free Results → Upgrade Click: ${upgradeRate}% (${upgradeClicks}/${freeResults})`)
    }

    if (upgradeClicks > 0) {
      const modalRate = ((modalOpened / upgradeClicks) * 100).toFixed(1)
      console.log(`  Upgrade Click → Modal Opened: ${modalRate}% (${modalOpened}/${upgradeClicks})`)
    }

    if (modalOpened > 0) {
      const paymentRate = ((paymentComplete / modalOpened) * 100).toFixed(1)
      console.log(`  Modal Opened → Payment: ${paymentRate}% (${paymentComplete}/${modalOpened})`)
    }

    if (paymentComplete > 0) {
      const reportRate = ((reportGenerated / paymentComplete) * 100).toFixed(1)
      console.log(`  Payment → Report Generated: ${reportRate}% (${reportGenerated}/${paymentComplete})`)
    }

    console.log('\n')

  } catch (error) {
    console.error('Error:', error.message)
  }
}

getLast12Hours()
