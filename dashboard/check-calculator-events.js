import { BetaAnalyticsDataClient } from '@google-analytics/data'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function checkCalculatorEvents() {
  try {
    console.log('Checking calculator event tracking...\n')

    // Get all events from last 7 days
    const [eventsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }]
    })

    console.log('=== ALL EVENTS (Last 7 Days) ===\n')

    if (eventsResponse.rows && eventsResponse.rows.length > 0) {
      eventsResponse.rows.forEach(row => {
        const eventName = row.dimensionValues[0].value
        const count = parseInt(row.metricValues[0].value)
        console.log(`  ${eventName}: ${count}`)
      })
    } else {
      console.log('  No events found in the last 7 days')
    }

    console.log('\n=== CALCULATOR-SPECIFIC EVENTS ===\n')

    // Check for our specific calculator events
    const calculatorEvents = [
      'calculator_free_results',
      'calculator_upgrade_click',
      'calculator_payment_complete',
      'calculator_report_generated'
    ]

    if (eventsResponse.rows) {
      const foundEvents = eventsResponse.rows.filter(row =>
        calculatorEvents.includes(row.dimensionValues[0].value)
      )

      if (foundEvents.length > 0) {
        foundEvents.forEach(row => {
          const eventName = row.dimensionValues[0].value
          const count = parseInt(row.metricValues[0].value)
          console.log(`  ✅ ${eventName}: ${count} events`)
        })
      } else {
        console.log('  ⚠️  No calculator events tracked yet')
        console.log('  Expected events:')
        calculatorEvents.forEach(e => console.log(`    - ${e}`))
      }
    }

    // Get calculator page activity from last 24 hours
    console.log('\n=== CALCULATOR PAGE ACTIVITY (Last 24 Hours) ===\n')

    const [calcPageResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: 'yesterday', endDate: 'today' }],
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
        { name: 'sessions' },
        { name: 'totalUsers' }
      ]
    })

    if (calcPageResponse.rows && calcPageResponse.rows.length > 0) {
      calcPageResponse.rows.forEach(row => {
        const page = row.dimensionValues[0].value
        const views = parseInt(row.metricValues[0].value)
        const sessions = parseInt(row.metricValues[1].value)
        const users = parseInt(row.metricValues[2].value)
        console.log(`  ${page}`)
        console.log(`    Views: ${views}, Sessions: ${sessions}, Users: ${users}`)
      })
    } else {
      console.log('  No calculator page visits in last 24 hours')
    }

  } catch (error) {
    console.error('Error:', error.message)
    if (error.details) console.error('Details:', error.details)
  }
}

checkCalculatorEvents()
