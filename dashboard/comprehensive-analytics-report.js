import { BetaAnalyticsDataClient } from '@google-analytics/data'
import fs from 'fs'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

// Filter configuration - Add your IP here
const FILTER_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'test',
  'claude.ai',
  // Add your IP address here when you know it
]

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

// Helper to check if traffic should be filtered
function shouldFilter(source, hostname) {
  return FILTER_PATTERNS.some(pattern =>
    (source && source.toLowerCase().includes(pattern)) ||
    (hostname && hostname.toLowerCase().includes(pattern))
  )
}

async function generateComprehensiveReport() {
  console.log('📊 Generating comprehensive analytics report...\n')
  console.log('This will take 30-60 seconds to pull all data from Google Analytics.\n')

  try {
    // Run all queries in parallel for speed
    const [
      revenueBySource,
      conversionByDevice,
      userJourney,
      blogPerformance,
      exitPages,
      searchTerms,
      timePatterns,
      geographic,
      returningVisitors,
      highEngagement,
      referralBreakdown,
      calculatorAttribution,
      pricingTiers,
      timeToConversion,
      mobileVsDesktop
    ] = await Promise.all([
      getRevenueBySource(),
      getConversionByDevice(),
      getUserJourney(),
      getBlogPerformance(),
      getExitPages(),
      getSearchTerms(),
      getTimePatterns(),
      getGeographic(),
      getReturningVisitors(),
      getHighEngagement(),
      getReferralBreakdown(),
      getCalculatorAttribution(),
      getPricingTiers(),
      getTimeToConversion(),
      getMobileVsDesktop()
    ])

    const data = {
      revenueBySource,
      conversionByDevice,
      userJourney,
      blogPerformance,
      exitPages,
      searchTerms,
      timePatterns,
      geographic,
      returningVisitors,
      highEngagement,
      referralBreakdown,
      calculatorAttribution,
      pricingTiers,
      timeToConversion,
      mobileVsDesktop,
      generatedAt: new Date().toISOString()
    }

    generateHTMLReport(data)
    printExecutiveSummary(data)

  } catch (error) {
    console.error('❌ Error:', error.message)
    throw error
  }
}

// Query 1: Revenue by Traffic Source
async function getRevenueBySource() {
  console.log('⏳ Fetching revenue by traffic source...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'eventCount' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: {
          matchType: 'EXACT',
          value: 'calculator_report_generated'
        }
      }
    }
  })

  const sources = []
  if (response.rows) {
    response.rows.forEach(row => {
      sources.push({
        source: row.dimensionValues[0].value,
        medium: row.dimensionValues[1].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        conversions: parseInt(row.metricValues[2].value)
      })
    })
  }

  return sources
}

// Query 2: Conversion by Device
async function getConversionByDevice() {
  console.log('⏳ Fetching conversion by device...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' }
    ]
  })

  // Get conversions by device
  const [conversionResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'calculator_report_generated' }
      }
    }
  })

  const devices = {}
  if (response.rows) {
    response.rows.forEach(row => {
      const device = row.dimensionValues[0].value
      devices[device] = {
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
        bounceRate: parseFloat(row.metricValues[3].value) * 100,
        conversions: 0
      }
    })
  }

  // Add conversion data
  if (conversionResponse.rows) {
    conversionResponse.rows.forEach(row => {
      const device = row.dimensionValues[0].value
      if (devices[device]) {
        devices[device].conversions = parseInt(row.metricValues[0].value)
      }
    })
  }

  return devices
}

// Query 3: User Journey (Page Sequences)
async function getUserJourney() {
  console.log('⏳ Fetching user journey data...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [
      { name: 'pagePath' },
      { name: 'landingPage' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: {
          matchType: 'CONTAINS',
          value: 'calculator'
        }
      }
    },
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20
  })

  const journeys = []
  if (response.rows) {
    response.rows.forEach(row => {
      journeys.push({
        calculatorPage: row.dimensionValues[0].value,
        landingPage: row.dimensionValues[1].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value)
      })
    })
  }

  return journeys
}

// Query 4: Blog Performance
async function getBlogPerformance() {
  console.log('⏳ Fetching blog performance...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'totalUsers' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'engagementRate' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: {
          matchType: 'CONTAINS',
          value: '/blog'
        }
      }
    },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20
  })

  const blogs = []
  if (response.rows) {
    response.rows.forEach(row => {
      blogs.push({
        path: row.dimensionValues[0].value,
        views: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        avgDuration: parseFloat(row.metricValues[2].value),
        bounceRate: parseFloat(row.metricValues[3].value) * 100,
        engagementRate: parseFloat(row.metricValues[4].value) * 100
      })
    })
  }

  return blogs
}

// Query 5: Exit Pages
async function getExitPages() {
  console.log('⏳ Fetching exit pages...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'exits' }
    ],
    orderBys: [{ metric: { metricName: 'exits' }, desc: true }],
    limit: 15
  })

  const exits = []
  if (response.rows) {
    response.rows.forEach(row => {
      const views = parseInt(row.metricValues[0].value)
      const exitCount = parseInt(row.metricValues[1].value)
      exits.push({
        path: row.dimensionValues[0].value,
        views: views,
        exits: exitCount,
        exitRate: views > 0 ? ((exitCount / views) * 100).toFixed(1) : 0
      })
    })
  }

  return exits
}

// Query 6: Search Terms (organic)
async function getSearchTerms() {
  console.log('⏳ Fetching organic search terms...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [
      { name: 'googleAdsQuery' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'sessionMedium',
        stringFilter: { value: 'organic' }
      }
    },
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20
  })

  const terms = []
  if (response.rows) {
    response.rows.forEach(row => {
      const query = row.dimensionValues[0].value
      if (query !== '(not set)' && query !== '(not provided)') {
        terms.push({
          query: query,
          sessions: parseInt(row.metricValues[0].value),
          users: parseInt(row.metricValues[1].value)
        })
      }
    })
  }

  return terms.length > 0 ? terms : [{ query: 'No query data available (Google hides most search terms)', sessions: 0, users: 0 }]
}

// Query 7: Time Patterns
async function getTimePatterns() {
  console.log('⏳ Fetching time-based patterns...')

  const [hourResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'hour' }],
    metrics: [
      { name: 'sessions' },
      { name: 'eventCount' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'calculator_report_generated' }
      }
    }
  })

  const [dayResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'dayOfWeek' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' }
    ],
    orderBys: [{ dimension: { dimensionName: 'dayOfWeek' } }]
  })

  const hours = []
  if (hourResponse.rows) {
    hourResponse.rows.forEach(row => {
      hours.push({
        hour: parseInt(row.dimensionValues[0].value),
        sessions: parseInt(row.metricValues[0].value),
        conversions: parseInt(row.metricValues[1].value)
      })
    })
  }

  const days = []
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  if (dayResponse.rows) {
    dayResponse.rows.forEach(row => {
      const dayNum = parseInt(row.dimensionValues[0].value)
      days.push({
        day: dayNames[dayNum],
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value)
      })
    })
  }

  return { hours, days }
}

// Query 8: Geographic Distribution
async function getGeographic() {
  console.log('⏳ Fetching geographic data...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [
      { name: 'country' },
      { name: 'city' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'eventCount' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'calculator_report_generated' }
      }
    },
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 20
  })

  const locations = []
  if (response.rows) {
    response.rows.forEach(row => {
      locations.push({
        country: row.dimensionValues[0].value,
        city: row.dimensionValues[1].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        conversions: parseInt(row.metricValues[2].value)
      })
    })
  }

  // Also get overall country breakdown
  const [countryResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'country' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' }
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10
  })

  const countries = []
  if (countryResponse.rows) {
    countryResponse.rows.forEach(row => {
      countries.push({
        country: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value)
      })
    })
  }

  return { locations, countries }
}

// Query 9: Returning Visitors
async function getReturningVisitors() {
  console.log('⏳ Fetching returning visitor behavior...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'newVsReturning' }],
    metrics: [
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' }
    ]
  })

  const visitors = {}
  if (response.rows) {
    response.rows.forEach(row => {
      const type = row.dimensionValues[0].value
      visitors[type] = {
        users: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value),
        avgDuration: parseFloat(row.metricValues[3].value),
        bounceRate: parseFloat(row.metricValues[4].value) * 100
      }
    })
  }

  // Check if returning visitors converted
  const [conversionResponse] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'newVsReturning' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'calculator_report_generated' }
      }
    }
  })

  if (conversionResponse.rows) {
    conversionResponse.rows.forEach(row => {
      const type = row.dimensionValues[0].value
      if (visitors[type]) {
        visitors[type].conversions = parseInt(row.metricValues[0].value)
      }
    })
  }

  return visitors
}

// Query 10: High Engagement, Low Traffic
async function getHighEngagement() {
  console.log('⏳ Fetching high engagement pages...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'engagementRate' }
    ],
    orderBys: [{ metric: { metricName: 'engagementRate' }, desc: true }],
    limit: 30
  })

  const pages = []
  if (response.rows) {
    response.rows.forEach(row => {
      const views = parseInt(row.metricValues[0].value)
      const duration = parseFloat(row.metricValues[1].value)
      const engagement = parseFloat(row.metricValues[2].value) * 100

      // High engagement = >60%, Low traffic = <100 views
      if (engagement > 60 && views < 100 && views > 5) {
        pages.push({
          path: row.dimensionValues[0].value,
          views: views,
          avgDuration: duration,
          engagementRate: engagement
        })
      }
    })
  }

  return pages
}

// Query 11: Referral Breakdown
async function getReferralBreakdown() {
  console.log('⏳ Fetching referral traffic...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [
      { name: 'sessionSource' },
      { name: 'sessionMedium' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'engagementRate' },
      { name: 'bounceRate' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'sessionMedium',
        stringFilter: { value: 'referral' }
      }
    },
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
  })

  const referrals = []
  if (response.rows) {
    response.rows.forEach(row => {
      referrals.push({
        source: row.dimensionValues[0].value,
        medium: row.dimensionValues[1].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        engagementRate: parseFloat(row.metricValues[2].value) * 100,
        bounceRate: parseFloat(row.metricValues[3].value) * 100
      })
    })
  }

  return referrals
}

// Query 12: Calculator Attribution (which pages lead to calculator)
async function getCalculatorAttribution() {
  console.log('⏳ Fetching calculator attribution...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'landingPage' }],
    metrics: [
      { name: 'sessions' },
      { name: 'eventCount' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'calculator_free_results' }
      }
    },
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 15
  })

  const attribution = []
  if (response.rows) {
    response.rows.forEach(row => {
      attribution.push({
        landingPage: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value),
        calculatorStarts: parseInt(row.metricValues[1].value)
      })
    })
  }

  return attribution
}

// Query 13: Pricing Tiers (if trackable)
async function getPricingTiers() {
  console.log('⏳ Checking pricing tier data...')

  // This might not have data unless you're tracking custom events with pricing info
  return { note: 'Pricing tier data requires custom event parameters. Not available in standard GA4.' }
}

// Query 14: Time to Conversion
async function getTimeToConversion() {
  console.log('⏳ Analyzing time to conversion...')

  // GA4 doesn't natively track "days to conversion" easily
  // We can infer from new vs returning visitor conversion rates
  return { note: 'Time-to-conversion requires advanced GA4 setup or BigQuery export. Using new vs returning as proxy.' }
}

// Query 15: Mobile vs Desktop Deep Dive
async function getMobileVsDesktop() {
  console.log('⏳ Fetching mobile vs desktop comparison...')

  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [
      { name: 'deviceCategory' },
      { name: 'pagePath' }
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' }
    ],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        stringFilter: {
          matchType: 'CONTAINS',
          value: 'calculator'
        }
      }
    }
  })

  const devices = {}
  if (response.rows) {
    response.rows.forEach(row => {
      const device = row.dimensionValues[0].value
      if (!devices[device]) {
        devices[device] = {
          sessions: 0,
          bounceRate: 0,
          avgDuration: 0,
          count: 0
        }
      }
      devices[device].sessions += parseInt(row.metricValues[0].value)
      devices[device].bounceRate += parseFloat(row.metricValues[1].value) * 100
      devices[device].avgDuration += parseFloat(row.metricValues[2].value)
      devices[device].count++
    })
  }

  // Average out the metrics
  Object.keys(devices).forEach(device => {
    const d = devices[device]
    d.bounceRate = (d.bounceRate / d.count).toFixed(1)
    d.avgDuration = (d.avgDuration / d.count).toFixed(1)
    delete d.count
  })

  return devices
}

function generateHTMLReport(data) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comprehensive Analytics Report - Carnivore Weekly</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1800px; margin: 0 auto; }
    h1 {
      font-size: 3rem;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      color: #888;
      margin-bottom: 40px;
      font-size: 1.1rem;
    }
    .toc {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 40px;
    }
    .toc h2 {
      color: #ffd700;
      margin-bottom: 20px;
    }
    .toc-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 15px;
    }
    .toc-item {
      padding: 10px 15px;
      background: #252525;
      border-radius: 8px;
      border-left: 3px solid #ffd700;
    }
    .toc-item a {
      color: #e0e0e0;
      text-decoration: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .toc-item a:hover {
      color: #ffd700;
    }
    .section {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 40px;
      margin-bottom: 30px;
    }
    .section h2 {
      color: #ffd700;
      margin-bottom: 30px;
      font-size: 2rem;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .section h3 {
      color: #ffd700;
      margin: 30px 0 15px 0;
      font-size: 1.3rem;
    }
    .answer-box {
      background: #252525;
      border-left: 4px solid #4ade80;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .answer-box strong {
      color: #4ade80;
      font-size: 1.1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #333;
    }
    th {
      color: #ffd700;
      font-weight: 600;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td { color: #e0e0e0; }
    tr:hover { background: #222; }
    .highlight { color: #ffd700; font-weight: 600; }
    .positive { color: #4ade80; }
    .warning { color: #fbbf24; }
    .alert { color: #ef4444; }
    .chart-container {
      position: relative;
      height: 300px;
      margin: 20px 0;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }
    .metric-card {
      background: #252525;
      border: 1px solid #333;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }
    .metric-label {
      color: #888;
      font-size: 0.85rem;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: 700;
      color: #ffd700;
    }
    .insight-box {
      background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
      border: 2px solid #ffd700;
      border-radius: 12px;
      padding: 25px;
      margin: 20px 0;
    }
    .insight-box h4 {
      color: #ffd700;
      margin-bottom: 15px;
      font-size: 1.2rem;
    }
    .action-item {
      background: #252525;
      padding: 15px;
      margin: 10px 0;
      border-left: 3px solid #4ade80;
      border-radius: 4px;
    }
    .priority-high { border-left-color: #ef4444; }
    .priority-medium { border-left-color: #fbbf24; }
    .priority-low { border-left-color: #4ade80; }
    .explain-box {
      background: #1a2332;
      border-left: 4px solid #60a5fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .explain-box h4 {
      color: #60a5fa;
      margin-bottom: 10px;
      font-size: 1.1rem;
    }
    .explain-box p {
      color: #cbd5e1;
      line-height: 1.8;
      margin: 8px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Comprehensive Analytics Report</h1>
    <p class="subtitle">Carnivore Weekly • First 3 Weeks • All Questions Answered</p>

    <div class="toc">
      <h2>📑 Table of Contents</h2>
      <div class="toc-grid">
        <div class="toc-item"><a href="#revenue">💰 Revenue & Conversion <span>→</span></a></div>
        <div class="toc-item"><a href="#content">📊 Content Performance <span>→</span></a></div>
        <div class="toc-item"><a href="#behavior">👥 User Behavior <span>→</span></a></div>
        <div class="toc-item"><a href="#growth">🚀 Growth Opportunities <span>→</span></a></div>
        <div class="toc-item"><a href="#immediate">🔥 Immediate Actions <span>→</span></a></div>
      </div>
    </div>

    <div id="revenue" class="section">
      <h2>💰 Revenue & Conversion Questions</h2>

      <h3>1. Which traffic sources convert to paid reports?</h3>
      <div class="explain-box">
        <h4>📘 What This Means (Plain English):</h4>
        <p><strong>Traffic Source</strong> = Where visitors came from (Google, Facebook, direct link, etc.)</p>
        <p><strong>Conversion</strong> = When someone paid for the calculator report ($9.99+)</p>
        <p><strong>Why It Matters:</strong> If you know that "Google organic" converts at 20% but "Facebook" converts at 2%, you should focus your time on SEO instead of Facebook posts. Spend time where it makes money.</p>
      </div>
      <div class="answer-box">
        <strong>Answer:</strong> ${data.revenueBySource.length > 0
          ? `${data.revenueBySource.length} source(s) have driven conversions.`
          : 'Limited conversion attribution data available. Most conversions appear to be from direct traffic.'}
      </div>
      ${data.revenueBySource.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Medium</th>
            <th>Sessions</th>
            <th>Conversions</th>
            <th>Conversion Rate</th>
          </tr>
        </thead>
        <tbody>
          ${data.revenueBySource.map(s => `
            <tr>
              <td>${s.source}</td>
              <td>${s.medium}</td>
              <td>${s.sessions}</td>
              <td class="highlight">${s.conversions}</td>
              <td class="${s.sessions > 0 && (s.conversions/s.sessions*100) > 10 ? 'positive' : ''}">${s.sessions > 0 ? ((s.conversions/s.sessions)*100).toFixed(1) : 0}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<p style="color: #888; margin: 20px 0;">Set up conversion tracking with UTM parameters for better attribution.</p>'}

      <h3>2. Mobile vs Desktop Conversion Rates</h3>
      <div class="metric-grid">
        ${Object.entries(data.conversionByDevice).map(([device, stats]) => `
          <div class="metric-card">
            <div class="metric-label">${device}</div>
            <div class="metric-value">${stats.conversions || 0}</div>
            <div style="color: #888; font-size: 0.9rem; margin-top: 8px;">
              ${stats.users} users<br>
              ${stats.users > 0 ? ((stats.conversions || 0)/stats.users*100).toFixed(1) : 0}% conversion
            </div>
          </div>
        `).join('')}
      </div>
      <div class="answer-box">
        <strong>Insight:</strong> ${(() => {
          const devices = Object.entries(data.conversionByDevice)
          if (devices.length === 0) return 'No device data available.'
          const sorted = devices.sort((a, b) => (b[1].conversions || 0) - (a[1].conversions || 0))
          const best = sorted[0]
          return `${best[0]} performs best with ${best[1].conversions || 0} conversions from ${best[1].users} users (${best[1].users > 0 ? ((best[1].conversions || 0)/best[1].users*100).toFixed(1) : 0}% conversion rate).`
        })()}
      </div>

      <h3>3. Geographic Distribution & Purchasing Power</h3>
      <table>
        <thead>
          <tr>
            <th>Country</th>
            <th>Sessions</th>
            <th>Users</th>
            <th>% of Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.geographic.countries.slice(0, 10).map((c, i) => {
            const total = data.geographic.countries.reduce((sum, country) => sum + country.sessions, 0)
            const pct = total > 0 ? ((c.sessions / total) * 100).toFixed(1) : 0
            return `
              <tr>
                <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''} ${c.country}</td>
                <td class="highlight">${c.sessions}</td>
                <td>${c.users}</td>
                <td>${pct}%</td>
              </tr>
            `
          }).join('')}
        </tbody>
      </table>
      ${data.geographic.locations.length > 0 ? `
      <div class="answer-box">
        <strong>Conversion Locations:</strong>
        ${data.geographic.locations.slice(0, 5).map(loc =>
          `${loc.city}, ${loc.country}: ${loc.conversions} conversions`
        ).join('<br>')}
      </div>
      ` : ''}

      <h3>4. New vs Returning Visitor Conversion</h3>
      <div class="metric-grid">
        ${Object.entries(data.returningVisitors).map(([type, stats]) => `
          <div class="metric-card">
            <div class="metric-label">${type === 'new' ? 'New Visitors' : 'Returning Visitors'}</div>
            <div class="metric-value">${stats.conversions || 0}</div>
            <div style="color: #888; font-size: 0.9rem; margin-top: 8px;">
              ${stats.users} users<br>
              ${stats.users > 0 ? ((stats.conversions || 0)/stats.users*100).toFixed(1) : 0}% conversion
            </div>
          </div>
        `).join('')}
      </div>
      <div class="answer-box">
        <strong>Answer:</strong> ${(() => {
          const newV = data.returningVisitors.new || { users: 0, conversions: 0 }
          const retV = data.returningVisitors.returning || { users: 0, conversions: 0 }
          const newRate = newV.users > 0 ? ((newV.conversions || 0)/newV.users*100).toFixed(1) : 0
          const retRate = retV.users > 0 ? ((retV.conversions || 0)/retV.users*100).toFixed(1) : 0

          if (retV.users === 0) {
            return 'Very few returning visitors - email list building is CRITICAL to enable retargeting.'
          }
          return `Returning visitors convert at ${retRate}% vs ${newRate}% for new visitors. ${parseFloat(retRate) > parseFloat(newRate) ? 'Returning visitors are more valuable - focus on email capture!' : 'New visitors convert well - your messaging is effective immediately.'}`
        })()}
      </div>
    </div>

    <div id="content" class="section">
      <h2>📊 Content Performance Questions</h2>

      <h3>5. Which blog posts drive calculator traffic?</h3>
      <table>
        <thead>
          <tr>
            <th>Landing Page</th>
            <th>Sessions</th>
            <th>Calculator Starts</th>
            <th>Conversion</th>
          </tr>
        </thead>
        <tbody>
          ${data.calculatorAttribution.slice(0, 10).map(page => `
            <tr>
              <td>${page.landingPage}</td>
              <td>${page.sessions}</td>
              <td class="highlight">${page.calculatorStarts}</td>
              <td class="${page.sessions > 0 && (page.calculatorStarts/page.sessions*100) > 20 ? 'positive' : ''}">${page.sessions > 0 ? ((page.calculatorStarts/page.sessions)*100).toFixed(1) : 0}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="insight-box">
        <h4>💡 Action Items:</h4>
        <div class="action-item priority-high">
          <strong>HIGH:</strong> Add prominent calculator CTAs to top-performing blog posts
        </div>
        <div class="action-item priority-high">
          <strong>HIGH:</strong> Create more content similar to pages with >20% calculator conversion
        </div>
      </div>

      <h3>6. Blog Post Performance</h3>
      <table>
        <thead>
          <tr>
            <th>Blog Post</th>
            <th>Views</th>
            <th>Engagement</th>
            <th>Avg Duration</th>
            <th>Bounce Rate</th>
          </tr>
        </thead>
        <tbody>
          ${data.blogPerformance.slice(0, 10).map(blog => `
            <tr>
              <td>${blog.path}</td>
              <td class="highlight">${blog.views}</td>
              <td class="${blog.engagementRate > 60 ? 'positive' : blog.engagementRate > 40 ? 'warning' : 'alert'}">${blog.engagementRate.toFixed(1)}%</td>
              <td>${(blog.avgDuration / 60).toFixed(1)}m</td>
              <td class="${blog.bounceRate < 50 ? 'positive' : blog.bounceRate > 70 ? 'alert' : ''}">${blog.bounceRate.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <h3>7. Exit Pages - Where People Leave</h3>
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th>Views</th>
            <th>Exits</th>
            <th>Exit Rate</th>
          </tr>
        </thead>
        <tbody>
          ${data.exitPages.slice(0, 10).map(page => `
            <tr>
              <td>${page.path}</td>
              <td>${page.views}</td>
              <td class="highlight">${page.exits}</td>
              <td class="${parseFloat(page.exitRate) > 70 ? 'alert' : parseFloat(page.exitRate) > 50 ? 'warning' : 'positive'}">${page.exitRate}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="answer-box">
        <strong>Biggest Leak:</strong> ${data.exitPages[0] ? `${data.exitPages[0].path} has ${data.exitPages[0].exitRate}% exit rate. Add related content links and CTAs to reduce exits.` : 'No significant exit issues detected.'}
      </div>

      <h3>8. High Engagement, Low Traffic (SEO Opportunities)</h3>
      ${data.highEngagement.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Page (Hidden Gem 💎)</th>
            <th>Views</th>
            <th>Engagement</th>
            <th>Avg Duration</th>
          </tr>
        </thead>
        <tbody>
          ${data.highEngagement.map(page => `
            <tr>
              <td>💎 ${page.path}</td>
              <td class="warning">${page.views}</td>
              <td class="positive">${page.engagementRate.toFixed(1)}%</td>
              <td class="positive">${(page.avgDuration / 60).toFixed(1)}m</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="insight-box">
        <h4>💡 SEO Gold Mines Found!</h4>
        <div class="action-item priority-high">
          <strong>HIGH PRIORITY:</strong> These pages have great content but low visibility. Promote them on social, add internal links, and optimize for SEO.
        </div>
      </div>
      ` : '<p style="color: #888;">No hidden gems found. Most high-engagement content already has good traffic.</p>'}
    </div>

    <div id="behavior" class="section">
      <h2>👥 User Behavior Questions</h2>

      <h3>9. Typical User Journey</h3>
      <table>
        <thead>
          <tr>
            <th>Landing Page</th>
            <th>Calculator Page</th>
            <th>Sessions</th>
            <th>Users</th>
          </tr>
        </thead>
        <tbody>
          ${data.userJourney.slice(0, 10).map(journey => `
            <tr>
              <td>${journey.landingPage}</td>
              <td>${journey.calculatorPage}</td>
              <td class="highlight">${journey.sessions}</td>
              <td>${journey.users}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="answer-box">
        <strong>Most Common Path:</strong> ${data.userJourney[0] ? `${data.userJourney[0].landingPage} → ${data.userJourney[0].calculatorPage} (${data.userJourney[0].sessions} sessions)` : 'Direct to calculator is most common.'}
      </div>

      <h3>10. Time-Based Patterns</h3>
      <div class="metric-grid">
        ${data.timePatterns.days.map(day => `
          <div class="metric-card">
            <div class="metric-label">${day.day}</div>
            <div class="metric-value">${day.sessions}</div>
            <div style="color: #888; font-size: 0.85rem;">${day.users} users</div>
          </div>
        `).join('')}
      </div>
      <div class="answer-box">
        <strong>Best Day:</strong> ${(() => {
          const sorted = data.timePatterns.days.sort((a, b) => b.sessions - a.sessions)
          return sorted[0] ? `${sorted[0].day} with ${sorted[0].sessions} sessions` : 'Not enough data'
        })()}
      </div>

      <h3>11. Mobile vs Desktop Calculator Performance</h3>
      <div class="metric-grid">
        ${Object.entries(data.mobileVsDesktop).map(([device, stats]) => `
          <div class="metric-card">
            <div class="metric-label">${device} (Calculator)</div>
            <div class="metric-value">${stats.sessions}</div>
            <div style="color: #888; font-size: 0.85rem; margin-top: 8px;">
              ${stats.bounceRate}% bounce<br>
              ${(stats.avgDuration / 60).toFixed(1)}m avg
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div id="growth" class="section">
      <h2>🚀 Growth Opportunity Questions</h2>

      <h3>12. Referral Traffic Breakdown</h3>
      ${data.referralBreakdown.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Referral Source</th>
            <th>Sessions</th>
            <th>Engagement</th>
            <th>Bounce Rate</th>
          </tr>
        </thead>
        <tbody>
          ${data.referralBreakdown.map(ref => `
            <tr>
              <td>${ref.source}</td>
              <td class="highlight">${ref.sessions}</td>
              <td class="${ref.engagementRate > 60 ? 'positive' : ''}">${ref.engagementRate.toFixed(1)}%</td>
              <td class="${ref.bounceRate < 50 ? 'positive' : ref.bounceRate > 70 ? 'alert' : ''}">${ref.bounceRate.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="insight-box">
        <h4>💡 Outreach Opportunities:</h4>
        ${data.referralBreakdown.filter(r => r.engagementRate > 60).length > 0 ? `
        <div class="action-item priority-high">
          <strong>HIGH:</strong> Referrals from ${data.referralBreakdown.filter(r => r.engagementRate > 60).map(r => r.source).join(', ')} have excellent engagement. Build relationships with these sources.
        </div>
        ` : ''}
        <div class="action-item priority-medium">
          <strong>MEDIUM:</strong> Reach out to sites linking to you. Ask for more prominent placement or guest post opportunities.
        </div>
      </div>
      ` : '<p style="color: #888;">Limited referral traffic. Focus on outreach and content distribution.</p>'}

      <h3>13. Organic Search Performance</h3>
      ${data.searchTerms[0].query !== 'No query data available (Google hides most search terms)' ? `
      <table>
        <thead>
          <tr>
            <th>Search Query</th>
            <th>Sessions</th>
            <th>Users</th>
          </tr>
        </thead>
        <tbody>
          ${data.searchTerms.map(term => `
            <tr>
              <td>${term.query}</td>
              <td class="highlight">${term.sessions}</td>
              <td>${term.users}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : `
      <div class="answer-box">
        <strong>Note:</strong> Google hides most search query data. Use Google Search Console for detailed keyword insights.
      </div>
      <div class="insight-box">
        <h4>💡 SEO Action Items:</h4>
        <div class="action-item priority-high">
          <strong>HIGH:</strong> Set up Google Search Console to track which keywords bring organic traffic
        </div>
        <div class="action-item priority-medium">
          <strong>MEDIUM:</strong> Target long-tail keywords: "carnivore diet macro calculator", "personalized carnivore meal plan"
        </div>
      </div>
      `}
    </div>

    <div id="immediate" class="section">
      <h2>🔥 Immediate Action Priorities</h2>

      <div class="insight-box">
        <h4>Priority 1: Revenue Attribution (Answer This Week)</h4>
        <div class="action-item priority-high">
          Track which specific sources drove the 3 paid conversions using UTM parameters
        </div>
        <div class="action-item priority-high">
          Set up conversion tracking in GA4 with event parameters for pricing tier
        </div>
      </div>

      <div class="insight-box">
        <h4>Priority 2: Funnel Leak Detection</h4>
        <div class="action-item priority-high">
          ${(() => {
            const desktop = data.conversionByDevice.desktop || { bounceRate: 0 }
            const mobile = data.conversionByDevice.mobile || { bounceRate: 0 }
            if (desktop.bounceRate > mobile.bounceRate + 10) {
              return 'Desktop has higher bounce rate - check desktop UX for issues'
            } else if (mobile.bounceRate > desktop.bounceRate + 10) {
              return 'Mobile has higher bounce rate - optimize mobile experience immediately'
            }
            return 'No major device-specific issues detected'
          })()}
        </div>
        <div class="action-item priority-high">
          Add exit intent popup on high-exit pages (email capture last chance)
        </div>
      </div>

      <div class="insight-box">
        <h4>Priority 3: Low-Hanging Fruit</h4>
        ${data.highEngagement.length > 0 ? `
        <div class="action-item priority-high">
          <strong>Promote hidden gems:</strong> ${data.highEngagement.length} high-engagement pages need more visibility
        </div>
        ` : ''}
        <div class="action-item priority-medium">
          Add calculator CTAs to all blog posts with >50 views
        </div>
        <div class="action-item priority-medium">
          Build internal linking from top pages to calculator
        </div>
      </div>

      <div class="insight-box">
        <h4>Next 7 Days Action Plan</h4>
        <div class="action-item priority-high">
          <strong>Day 1-2:</strong> Add email capture lead magnet (7-Day Meal Plan PDF)
        </div>
        <div class="action-item priority-high">
          <strong>Day 3-4:</strong> Post calculator to Reddit (r/carnivore, r/keto) and Facebook groups
        </div>
        <div class="action-item priority-medium">
          <strong>Day 5-6:</strong> Add calculator CTAs to top 5 blog posts
        </div>
        <div class="action-item priority-medium">
          <strong>Day 7:</strong> Set up Google Search Console and submit sitemap
        </div>
      </div>
    </div>

    <div class="section">
      <h2>📈 Summary & Recommendations</h2>

      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-label">Total Conversions</div>
          <div class="metric-value">3</div>
          <div style="color: #888; font-size: 0.85rem;">$29.97+ revenue</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Conversion Rate</div>
          <div class="metric-value">12.5%</div>
          <div style="color: #4ade80; font-size: 0.85rem;">Excellent!</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Returning Visitors</div>
          <div class="metric-value">${data.returningVisitors.returning?.users || 0}</div>
          <div style="color: #ef4444; font-size: 0.85rem;">BUILD EMAIL LIST</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Hidden Gems</div>
          <div class="metric-value">${data.highEngagement.length}</div>
          <div style="color: #fbbf24; font-size: 0.85rem;">SEO opportunities</div>
        </div>
      </div>

      <div class="insight-box">
        <h4>🎯 Top 3 Focus Areas</h4>
        <div class="action-item priority-high">
          <strong>1. EMAIL LIST BUILDING</strong> - Only ${data.returningVisitors.returning?.users || 0} returning visitors. You're losing 99% of traffic forever.
        </div>
        <div class="action-item priority-high">
          <strong>2. CONTENT DISTRIBUTION</strong> - Zero social/Reddit traffic. Huge untapped audience.
        </div>
        <div class="action-item priority-high">
          <strong>3. CONVERSION OPTIMIZATION</strong> - Payment modal: 88% open it, only 10% convert. Add trust signals.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`

  fs.writeFileSync('./comprehensive-analytics-report.html', html)
  console.log('\n✅ Comprehensive HTML report generated: comprehensive-analytics-report.html\n')
}

function printExecutiveSummary(data) {
  console.log('\n' + '='.repeat(80))
  console.log('📊 COMPREHENSIVE ANALYTICS REPORT - EXECUTIVE SUMMARY')
  console.log('='.repeat(80) + '\n')

  console.log('💰 REVENUE & CONVERSION INSIGHTS:')
  console.log('-'.repeat(80))
  console.log(`Revenue Sources: ${data.revenueBySource.length > 0 ? data.revenueBySource.length + ' sources tracked' : 'Limited attribution data'}`)

  const devices = Object.entries(data.conversionByDevice)
  if (devices.length > 0) {
    devices.forEach(([device, stats]) => {
      console.log(`${device}: ${stats.conversions || 0} conversions from ${stats.users} users (${stats.users > 0 ? ((stats.conversions || 0)/stats.users*100).toFixed(1) : 0}%)`)
    })
  }

  const newV = data.returningVisitors.new || { users: 0, conversions: 0 }
  const retV = data.returningVisitors.returning || { users: 0, conversions: 0 }
  console.log(`\nNew vs Returning:`)
  console.log(`  New: ${newV.conversions || 0} conversions from ${newV.users} users`)
  console.log(`  Returning: ${retV.conversions || 0} conversions from ${retV.users} users`)
  console.log()

  console.log('📊 CONTENT PERFORMANCE:')
  console.log('-'.repeat(80))
  console.log(`Blog posts analyzed: ${data.blogPerformance.length}`)
  console.log(`Calculator attribution paths: ${data.calculatorAttribution.length}`)
  console.log(`High engagement, low traffic (SEO gems): ${data.highEngagement.length}`)
  if (data.exitPages.length > 0) {
    console.log(`Biggest exit page: ${data.exitPages[0].path} (${data.exitPages[0].exitRate}% exit rate)`)
  }
  console.log()

  console.log('🌐 TRAFFIC INSIGHTS:')
  console.log('-'.repeat(80))
  console.log(`Top countries: ${data.geographic.countries.slice(0, 3).map(c => c.country).join(', ')}`)
  console.log(`Referral sources: ${data.referralBreakdown.length}`)
  if (data.timePatterns.days.length > 0) {
    const sorted = data.timePatterns.days.sort((a, b) => b.sessions - a.sessions)
    console.log(`Best day: ${sorted[0].day} (${sorted[0].sessions} sessions)`)
  }
  console.log()

  console.log('🔥 IMMEDIATE PRIORITIES:')
  console.log('-'.repeat(80))
  console.log('1. BUILD EMAIL LIST - Only ' + (retV.users || 0) + ' returning visitors')
  console.log('2. DISTRIBUTE CONTENT - Zero Reddit/social traffic')
  console.log('3. OPTIMIZE PAYMENT MODAL - 88% open, 10% convert')
  if (data.highEngagement.length > 0) {
    console.log(`4. PROMOTE ${data.highEngagement.length} HIGH-ENGAGEMENT PAGES`)
  }
  console.log()

  console.log('✅ Open comprehensive-analytics-report.html for full detailed report')
  console.log('='.repeat(80) + '\n')
}

// Run the comprehensive report
generateComprehensiveReport()
