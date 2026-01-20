import { BetaAnalyticsDataClient } from '@google-analytics/data'
import fs from 'fs'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

// Test session identifiers to filter out
const TEST_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'test999',
  'TEST999'
]

async function getCalculatorFunnelData() {
  try {
    console.log('📊 Fetching calculator funnel data for last 3 days...\n')

    // 1. Get overall calculator page views by date
    const [pageViewsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '3daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'pagePath' }],
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
        { name: 'sessions' }
      ]
    })

    // 2. Get calculator events by date
    const [eventsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '3daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }, { name: 'eventName' }],
      dimensionFilter: {
        orGroup: {
          expressions: [
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_free_results' } } },
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_upgrade_click' } } },
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_payment_modal_opened' } } },
            { filter: { fieldName: 'eventName', stringFilter: { value: 'calculator_report_generated' } } },
            { filter: { fieldName: 'eventName', stringFilter: { value: 'page_view' } } },
            { filter: { fieldName: 'eventName', stringFilter: { value: 'session_start' } } }
          ]
        }
      },
      metrics: [{ name: 'eventCount' }]
    })

    // 3. Get session sources
    const [sourcesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '3daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'CONTAINS',
            value: 'calculator'
          }
        }
      },
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }]
    })

    // 4. Get device breakdown
    const [devicesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '3daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'CONTAINS',
            value: 'calculator'
          }
        }
      },
      metrics: [{ name: 'sessions' }]
    })

    // Process data
    const data = {
      pageViews: processPageViews(pageViewsResponse),
      events: processEvents(eventsResponse),
      sources: processSources(sourcesResponse),
      devices: processDevices(devicesResponse),
      generatedAt: new Date().toISOString()
    }

    // Generate HTML report
    generateHTMLReport(data)

    // Print summary to console
    printSummary(data)

    return data

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.details) console.error('Details:', error.details)
    throw error
  }
}

function processPageViews(response) {
  const byDate = {}

  if (response.rows) {
    response.rows.forEach(row => {
      const date = row.dimensionValues[0].value
      const path = row.dimensionValues[1].value
      const views = parseInt(row.metricValues[0].value)
      const users = parseInt(row.metricValues[1].value)
      const sessions = parseInt(row.metricValues[2].value)

      // Filter out test sessions (basic filtering based on path)
      if (!TEST_PATTERNS.some(pattern => path.toLowerCase().includes(pattern.toLowerCase()))) {
        if (!byDate[date]) {
          byDate[date] = { views: 0, users: 0, sessions: 0, paths: {} }
        }
        byDate[date].views += views
        byDate[date].users += users
        byDate[date].sessions += sessions
        byDate[date].paths[path] = { views, users, sessions }
      }
    })
  }

  return byDate
}

function processEvents(response) {
  const byDate = {}
  const totals = {}

  if (response.rows) {
    response.rows.forEach(row => {
      const date = row.dimensionValues[0].value
      const eventName = row.dimensionValues[1].value
      const count = parseInt(row.metricValues[0].value)

      if (!byDate[date]) {
        byDate[date] = {}
      }
      byDate[date][eventName] = count

      if (!totals[eventName]) {
        totals[eventName] = 0
      }
      totals[eventName] += count
    })
  }

  return { byDate, totals }
}

function processSources(response) {
  const sources = []

  if (response.rows) {
    response.rows.forEach(row => {
      const source = row.dimensionValues[0].value
      const medium = row.dimensionValues[1].value
      const sessions = parseInt(row.metricValues[0].value)
      const users = parseInt(row.metricValues[1].value)

      // Filter out internal/test traffic
      if (!TEST_PATTERNS.some(pattern =>
        source.toLowerCase().includes(pattern.toLowerCase()) ||
        medium.toLowerCase().includes(pattern.toLowerCase())
      )) {
        sources.push({ source, medium, sessions, users })
      }
    })
  }

  return sources.sort((a, b) => b.sessions - a.sessions)
}

function processDevices(response) {
  const devices = {}

  if (response.rows) {
    response.rows.forEach(row => {
      const device = row.dimensionValues[0].value
      const sessions = parseInt(row.metricValues[0].value)
      devices[device] = sessions
    })
  }

  return devices
}

function generateHTMLReport(data) {
  const dates = Object.keys(data.pageViews).sort()
  const eventTotals = data.events.totals

  // Calculate funnel metrics using actual tracked events
  const pageViews = eventTotals['page_view'] || totalViews
  const sessions = eventTotals['session_start'] || 0
  const freeResults = eventTotals['calculator_free_results'] || 0
  const upgradeClicks = eventTotals['calculator_upgrade_click'] || 0
  const paymentModals = eventTotals['calculator_payment_modal_opened'] || 0
  const reports = eventTotals['calculator_report_generated'] || 0

  const totalViews = Object.values(data.pageViews).reduce((sum, d) => sum + d.views, 0)
  const totalUsers = Object.values(data.pageViews).reduce((sum, d) => sum + d.users, 0)

  // Calculate conversion rates
  const viewsToResults = totalUsers > 0 ? ((freeResults / totalUsers) * 100).toFixed(1) : 0
  const resultsToUpgrade = freeResults > 0 ? ((upgradeClicks / freeResults) * 100).toFixed(1) : 0
  const upgradeToModal = upgradeClicks > 0 ? ((paymentModals / upgradeClicks) * 100).toFixed(1) : 0
  const modalToPayment = paymentModals > 0 ? ((reports / paymentModals) * 100).toFixed(1) : 0
  const overallConversion = totalUsers > 0 ? ((reports / totalUsers) * 100).toFixed(2) : 0

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Calculator Funnel Report - Last 3 Days</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .subtitle {
      color: #888;
      margin-bottom: 30px;
      font-size: 0.9rem;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .metric-card {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 24px;
      transition: all 0.3s ease;
    }
    .metric-card:hover {
      border-color: #ffd700;
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(255, 215, 0, 0.1);
    }
    .metric-label {
      color: #888;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 2.5rem;
      font-weight: 700;
      color: #ffd700;
      margin-bottom: 8px;
    }
    .metric-subtitle {
      color: #666;
      font-size: 0.85rem;
    }
    .section {
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 12px;
      padding: 30px;
      margin-bottom: 30px;
    }
    .section h2 {
      color: #ffd700;
      margin-bottom: 20px;
      font-size: 1.5rem;
    }
    .funnel {
      display: flex;
      flex-direction: column;
      gap: 15px;
      margin-top: 20px;
    }
    .funnel-step {
      background: linear-gradient(90deg, #ffd700 0%, transparent 100%);
      border-radius: 8px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      overflow: hidden;
    }
    .funnel-step::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      background: #ffd700;
      opacity: 0.1;
    }
    .funnel-step.step-1::before { width: 100%; }
    .funnel-step.step-2::before { width: var(--width-2); }
    .funnel-step.step-3::before { width: var(--width-3); }
    .funnel-step.upgrade::before { width: var(--width-upgrade); }
    .funnel-step.payment::before { width: var(--width-payment); }
    .funnel-info {
      position: relative;
      z-index: 1;
    }
    .funnel-label {
      font-weight: 600;
      color: #ffd700;
      font-size: 1.1rem;
    }
    .funnel-count {
      color: #e0e0e0;
      font-size: 2rem;
      font-weight: 700;
      margin-top: 5px;
    }
    .funnel-conversion {
      position: relative;
      z-index: 1;
      text-align: right;
    }
    .conversion-rate {
      font-size: 1.5rem;
      font-weight: 700;
      color: #4ade80;
    }
    .conversion-label {
      color: #888;
      font-size: 0.85rem;
    }
    .chart-container {
      position: relative;
      height: 300px;
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
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
  </style>
</head>
<body>
  <div class="container">
    <h1>🧮 Calculator Funnel Analysis</h1>
    <p class="subtitle">Last 3 Days • Generated ${new Date().toLocaleString()}</p>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Total Page Views</div>
        <div class="metric-value">${totalViews.toLocaleString()}</div>
        <div class="metric-subtitle">Calculator pages</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Unique Users</div>
        <div class="metric-value">${totalUsers.toLocaleString()}</div>
        <div class="metric-subtitle">Started calculator</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Free Results</div>
        <div class="metric-value">${freeResults.toLocaleString()}</div>
        <div class="metric-subtitle">Completed basic calculator</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Paid Reports</div>
        <div class="metric-value" style="color: #4ade80;">${reports.toLocaleString()}</div>
        <div class="metric-subtitle">💰 Conversions</div>
      </div>
    </div>

    <div class="section">
      <h2>📊 Conversion Funnel</h2>
      <div class="funnel" style="
        --width-2: ${totalUsers > 0 ? (freeResults/totalUsers*100) : 0}%;
        --width-3: ${totalUsers > 0 ? (upgradeClicks/totalUsers*100) : 0}%;
        --width-upgrade: ${totalUsers > 0 ? (paymentModals/totalUsers*100) : 0}%;
        --width-payment: ${totalUsers > 0 ? (reports/totalUsers*100) : 0}%;
      ">
        <div class="funnel-step step-1">
          <div class="funnel-info">
            <div class="funnel-label">👥 Unique Visitors</div>
            <div class="funnel-count">${totalUsers.toLocaleString()}</div>
          </div>
          <div class="funnel-conversion">
            <div class="conversion-rate">100%</div>
            <div class="conversion-label">baseline</div>
          </div>
        </div>

        <div class="funnel-step step-2">
          <div class="funnel-info">
            <div class="funnel-label">✅ Free Results Viewed</div>
            <div class="funnel-count">${freeResults.toLocaleString()}</div>
          </div>
          <div class="funnel-conversion">
            <div class="conversion-rate">${viewsToResults}%</div>
            <div class="conversion-label">completion rate</div>
          </div>
        </div>

        <div class="funnel-step step-3">
          <div class="funnel-info">
            <div class="funnel-label">🔼 Upgrade Clicks</div>
            <div class="funnel-count">${upgradeClicks.toLocaleString()}</div>
          </div>
          <div class="funnel-conversion">
            <div class="conversion-rate">${resultsToUpgrade}%</div>
            <div class="conversion-label">from free results</div>
          </div>
        </div>

        <div class="funnel-step upgrade">
          <div class="funnel-info">
            <div class="funnel-label">💳 Payment Modal Opened</div>
            <div class="funnel-count">${paymentModals.toLocaleString()}</div>
          </div>
          <div class="funnel-conversion">
            <div class="conversion-rate">${upgradeToModal}%</div>
            <div class="conversion-label">from upgrade clicks</div>
          </div>
        </div>

        <div class="funnel-step payment">
          <div class="funnel-info">
            <div class="funnel-label">💰 Paid Report Generated</div>
            <div class="funnel-count">${reports.toLocaleString()}</div>
          </div>
          <div class="funnel-conversion">
            <div class="conversion-rate">${modalToPayment}%</div>
            <div class="conversion-label">conversion rate</div>
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>📈 Daily Activity Trend</h2>
      <div class="chart-container">
        <canvas id="dailyChart"></canvas>
      </div>
    </div>

    <div class="section">
      <h2>🎯 Event Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Total Count</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(eventTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([event, count]) => `
              <tr>
                <td>${event}</td>
                <td class="highlight">${count.toLocaleString()}</td>
                <td class="${count > 0 ? 'positive' : 'warning'}">${count > 0 ? '✅ Active' : '⚠️ No activity'}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>🌐 Traffic Sources</h2>
      <div class="chart-container">
        <canvas id="sourcesChart"></canvas>
      </div>
      <table style="margin-top: 30px;">
        <thead>
          <tr>
            <th>Source</th>
            <th>Medium</th>
            <th>Sessions</th>
            <th>Users</th>
          </tr>
        </thead>
        <tbody>
          ${data.sources.map(s => `
            <tr>
              <td>${s.source}</td>
              <td>${s.medium}</td>
              <td class="highlight">${s.sessions.toLocaleString()}</td>
              <td>${s.users.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>📱 Device Breakdown</h2>
      <div class="chart-container">
        <canvas id="devicesChart"></canvas>
      </div>
    </div>

    <div class="section">
      <h2>💡 Key Insights</h2>
      <ul style="color: #e0e0e0; line-height: 2;">
        <li><strong class="highlight">Completion Rate:</strong> ${viewsToResults}% of visitors view their free results</li>
        <li><strong class="highlight">Upgrade Interest:</strong> ${resultsToUpgrade}% of free result viewers click the upgrade button</li>
        <li><strong class="highlight">Modal Engagement:</strong> ${upgradeToModal}% of upgrade clicks open the payment modal</li>
        <li><strong class="highlight">Payment Conversion:</strong> ${modalToPayment}% of payment modals convert to paid reports</li>
        <li><strong class="highlight">End-to-End Conversion:</strong> ${overallConversion}% of visitors become paying customers</li>
        <li><strong class="highlight">Total Revenue Impact:</strong> ${reports} paid reports generated (${reports > 0 ? `$${(reports * 9.99).toFixed(2)}` : '$0'} if all used base tier)</li>
      </ul>
    </div>
  </div>

  <script>
    // Daily Activity Chart
    const dailyCtx = document.getElementById('dailyChart').getContext('2d');
    new Chart(dailyCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(dates.map(d => {
          const year = d.substring(0, 4);
          const month = d.substring(4, 6);
          const day = d.substring(6, 8);
          return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }))},
        datasets: [{
          label: 'Page Views',
          data: ${JSON.stringify(dates.map(d => data.pageViews[d]?.views || 0))},
          borderColor: '#ffd700',
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e0e0e0' } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#888' },
            grid: { color: '#333' }
          },
          x: {
            ticks: { color: '#888' },
            grid: { color: '#333' }
          }
        }
      }
    });

    // Sources Chart
    const sourcesCtx = document.getElementById('sourcesChart').getContext('2d');
    new Chart(sourcesCtx, {
      type: 'bar',
      data: {
        labels: ${JSON.stringify(data.sources.slice(0, 10).map(s => `${s.source} / ${s.medium}`))},
        datasets: [{
          label: 'Sessions',
          data: ${JSON.stringify(data.sources.slice(0, 10).map(s => s.sessions))},
          backgroundColor: 'rgba(255, 215, 0, 0.8)',
          borderColor: '#ffd700',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#e0e0e0' } }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#888' },
            grid: { color: '#333' }
          },
          x: {
            ticks: { color: '#888' },
            grid: { color: '#333' }
          }
        }
      }
    });

    // Devices Chart
    const devicesCtx = document.getElementById('devicesChart').getContext('2d');
    new Chart(devicesCtx, {
      type: 'doughnut',
      data: {
        labels: ${JSON.stringify(Object.keys(data.devices))},
        datasets: [{
          data: ${JSON.stringify(Object.values(data.devices))},
          backgroundColor: ['#ffd700', '#4ade80', '#60a5fa', '#f472b6'],
          borderColor: '#1a1a1a',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { color: '#e0e0e0', padding: 20 }
          }
        }
      }
    });
  </script>
</body>
</html>`

  fs.writeFileSync('./calculator-funnel-report.html', html)
  console.log('✅ HTML report generated: calculator-funnel-report.html\n')
}

function printSummary(data) {
  console.log('\n' + '='.repeat(60))
  console.log('📊 CALCULATOR FUNNEL SUMMARY (Last 3 Days)')
  console.log('='.repeat(60) + '\n')

  const totalViews = Object.values(data.pageViews).reduce((sum, d) => sum + d.views, 0)
  const totalUsers = Object.values(data.pageViews).reduce((sum, d) => sum + d.users, 0)

  console.log(`📄 Total Page Views: ${totalViews}`)
  console.log(`👥 Unique Users: ${totalUsers}`)
  console.log()

  console.log('🎯 CONVERSION FUNNEL:')
  console.log('-'.repeat(60))

  const events = data.events.totals
  const freeResults = events['calculator_free_results'] || 0
  const upgradeClicks = events['calculator_upgrade_click'] || 0
  const paymentModals = events['calculator_payment_modal_opened'] || 0
  const reports = events['calculator_report_generated'] || 0

  const viewsToResults = totalUsers > 0 ? ((freeResults/totalUsers)*100).toFixed(1) : 0
  const resultsToUpgrade = freeResults > 0 ? ((upgradeClicks/freeResults)*100).toFixed(1) : 0
  const upgradeToModal = upgradeClicks > 0 ? ((paymentModals/upgradeClicks)*100).toFixed(1) : 0
  const modalToPayment = paymentModals > 0 ? ((reports/paymentModals)*100).toFixed(1) : 0
  const overallConversion = totalUsers > 0 ? ((reports/totalUsers)*100).toFixed(2) : 0

  console.log(`👥 Unique Visitors: ${totalUsers}`)
  console.log(`✅ Free Results: ${freeResults} (${viewsToResults}% completion rate)`)
  console.log(`🔼 Upgrade Clicks: ${upgradeClicks} (${resultsToUpgrade}% interest rate)`)
  console.log(`💳 Payment Modals: ${paymentModals} (${upgradeToModal}% modal open rate)`)
  console.log(`💰 Paid Reports: ${reports} (${modalToPayment}% conversion rate)`)
  console.log(`📊 Overall Conversion: ${overallConversion}% (visitor → customer)`)
  if (reports > 0) {
    console.log(`💵 Revenue Generated: $${(reports * 9.99).toFixed(2)} (base tier estimate)`)
  }
  console.log()

  console.log('🌐 TOP TRAFFIC SOURCES:')
  console.log('-'.repeat(60))
  data.sources.slice(0, 5).forEach(s => {
    console.log(`${s.source} / ${s.medium}: ${s.sessions} sessions, ${s.users} users`)
  })
  console.log()

  console.log('📱 DEVICES:')
  console.log('-'.repeat(60))
  Object.entries(data.devices).forEach(([device, sessions]) => {
    console.log(`${device}: ${sessions} sessions`)
  })
  console.log()
  console.log('✅ Open calculator-funnel-report.html in your browser for detailed charts')
  console.log('='.repeat(60) + '\n')
}

// Run the report
getCalculatorFunnelData()
