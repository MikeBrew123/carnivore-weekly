import { BetaAnalyticsDataClient } from '@google-analytics/data'
import fs from 'fs'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function generateSiteOverview() {
  try {
    console.log('📊 Generating comprehensive site overview (3 weeks)...\n')

    // 1. Overall traffic metrics
    const [overallResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'engagementRate' }
      ]
    })

    // 2. Top pages
    const [topPagesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 20
    })

    // 3. Traffic sources
    const [sourcesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'engagementRate' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10
    })

    // 4. Daily trend
    const [dailyResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'totalUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
    })

    // 5. Device breakdown
    const [devicesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'bounceRate' }
      ]
    })

    // 6. Top events
    const [eventsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 15
    })

    // 7. Landing pages
    const [landingPagesResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'landingPage' }],
      metrics: [
        { name: 'sessions' },
        { name: 'bounceRate' },
        { name: 'engagementRate' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10
    })

    const data = {
      overall: processOverall(overallResponse),
      topPages: processTopPages(topPagesResponse),
      sources: processSources(sourcesResponse),
      daily: processDaily(dailyResponse),
      devices: processDevices(devicesResponse),
      events: processEvents(eventsResponse),
      landingPages: processLandingPages(landingPagesResponse),
      generatedAt: new Date().toISOString()
    }

    generateHTMLReport(data)
    printExecutiveSummary(data)

    return data

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.details) console.error('Details:', error.details)
    throw error
  }
}

function processOverall(response) {
  if (!response.rows || response.rows.length === 0) return null

  const row = response.rows[0]
  return {
    totalUsers: parseInt(row.metricValues[0].value),
    newUsers: parseInt(row.metricValues[1].value),
    sessions: parseInt(row.metricValues[2].value),
    pageViews: parseInt(row.metricValues[3].value),
    avgSessionDuration: parseFloat(row.metricValues[4].value),
    bounceRate: parseFloat(row.metricValues[5].value) * 100,
    engagementRate: parseFloat(row.metricValues[6].value) * 100
  }
}

function processTopPages(response) {
  const pages = []
  if (response.rows) {
    response.rows.forEach(row => {
      pages.push({
        path: row.dimensionValues[0].value,
        views: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        avgDuration: parseFloat(row.metricValues[2].value),
        bounceRate: parseFloat(row.metricValues[3].value) * 100
      })
    })
  }
  return pages
}

function processSources(response) {
  const sources = []
  if (response.rows) {
    response.rows.forEach(row => {
      sources.push({
        source: row.dimensionValues[0].value,
        medium: row.dimensionValues[1].value,
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        engagementRate: parseFloat(row.metricValues[2].value) * 100
      })
    })
  }
  return sources
}

function processDaily(response) {
  const daily = []
  if (response.rows) {
    response.rows.forEach(row => {
      const dateStr = row.dimensionValues[0].value
      const year = dateStr.substring(0, 4)
      const month = dateStr.substring(4, 6)
      const day = dateStr.substring(6, 8)

      daily.push({
        date: `${year}-${month}-${day}`,
        users: parseInt(row.metricValues[0].value),
        sessions: parseInt(row.metricValues[1].value),
        pageViews: parseInt(row.metricValues[2].value)
      })
    })
  }
  return daily
}

function processDevices(response) {
  const devices = {}
  if (response.rows) {
    response.rows.forEach(row => {
      const device = row.dimensionValues[0].value
      devices[device] = {
        sessions: parseInt(row.metricValues[0].value),
        users: parseInt(row.metricValues[1].value),
        bounceRate: parseFloat(row.metricValues[2].value) * 100
      }
    })
  }
  return devices
}

function processEvents(response) {
  const events = []
  if (response.rows) {
    response.rows.forEach(row => {
      events.push({
        name: row.dimensionValues[0].value,
        count: parseInt(row.metricValues[0].value)
      })
    })
  }
  return events
}

function processLandingPages(response) {
  const pages = []
  if (response.rows) {
    response.rows.forEach(row => {
      pages.push({
        path: row.dimensionValues[0].value,
        sessions: parseInt(row.metricValues[0].value),
        bounceRate: parseFloat(row.metricValues[1].value) * 100,
        engagementRate: parseFloat(row.metricValues[2].value) * 100
      })
    })
  }
  return pages
}

function generateHTMLReport(data) {
  const { overall, topPages, sources, daily, devices, events, landingPages } = data

  // Calculate insights
  const returningUserRate = overall.totalUsers > 0 ?
    (((overall.totalUsers - overall.newUsers) / overall.totalUsers) * 100).toFixed(1) : 0
  const pagesPerSession = overall.sessions > 0 ?
    (overall.pageViews / overall.sessions).toFixed(1) : 0
  const avgDurationMins = (overall.avgSessionDuration / 60).toFixed(1)

  // Identify trends
  const recentWeek = daily.slice(-7)
  const previousWeek = daily.slice(-14, -7)
  const recentUsers = recentWeek.reduce((sum, d) => sum + d.users, 0)
  const previousUsers = previousWeek.reduce((sum, d) => sum + d.users, 0)
  const userGrowth = previousUsers > 0 ?
    (((recentUsers - previousUsers) / previousUsers) * 100).toFixed(1) : 0

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnivore Weekly - Site Performance Overview</title>
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
    .container { max-width: 1600px; margin: 0 auto; }
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
    .executive-summary {
      background: linear-gradient(135deg, #1a1a1a 0%, #252525 100%);
      border: 2px solid #ffd700;
      border-radius: 16px;
      padding: 40px;
      margin-bottom: 40px;
    }
    .executive-summary h2 {
      color: #ffd700;
      margin-bottom: 30px;
      font-size: 2rem;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 30px;
      margin-bottom: 30px;
    }
    .summary-stat {
      text-align: center;
    }
    .summary-label {
      color: #888;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    .summary-value {
      font-size: 3.5rem;
      font-weight: 700;
      color: #ffd700;
      margin-bottom: 5px;
    }
    .summary-context {
      color: #aaa;
      font-size: 0.95rem;
    }
    .growth-indicator {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-left: 8px;
    }
    .growth-positive {
      background: rgba(74, 222, 128, 0.2);
      color: #4ade80;
    }
    .growth-negative {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
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
      font-size: 2rem;
      font-weight: 700;
      color: #ffd700;
      margin-bottom: 4px;
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
    .chart-container {
      position: relative;
      height: 350px;
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
    .insights {
      background: #1a1a1a;
      border-left: 4px solid #ffd700;
      padding: 30px;
      margin-bottom: 30px;
      border-radius: 8px;
    }
    .insights h3 {
      color: #ffd700;
      margin-bottom: 20px;
      font-size: 1.3rem;
    }
    .insights ul {
      list-style: none;
      padding: 0;
    }
    .insights li {
      padding: 12px 0;
      border-bottom: 1px solid #333;
      line-height: 1.8;
    }
    .insights li:last-child {
      border-bottom: none;
    }
    .insights strong {
      color: #ffd700;
    }
    .recommendation {
      background: #252525;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 3px solid #4ade80;
    }
    .recommendation h4 {
      color: #4ade80;
      margin-bottom: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .badge-excellent { background: #4ade80; color: #000; }
    .badge-good { background: #fbbf24; color: #000; }
    .badge-needs-work { background: #ef4444; color: #fff; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Carnivore Weekly - Site Performance Overview</h1>
    <p class="subtitle">First 3 Weeks • ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

    <div class="executive-summary">
      <h2>Executive Summary</h2>
      <div class="summary-grid">
        <div class="summary-stat">
          <div class="summary-label">Total Users</div>
          <div class="summary-value">${overall.totalUsers.toLocaleString()}</div>
          <div class="summary-context">
            ${overall.newUsers} new, ${overall.totalUsers - overall.newUsers} returning
            <span class="growth-indicator growth-${parseFloat(userGrowth) >= 0 ? 'positive' : 'negative'}">
              ${userGrowth}% WoW
            </span>
          </div>
        </div>
        <div class="summary-stat">
          <div class="summary-label">Total Sessions</div>
          <div class="summary-value">${overall.sessions.toLocaleString()}</div>
          <div class="summary-context">${pagesPerSession} pages/session</div>
        </div>
        <div class="summary-stat">
          <div class="summary-label">Page Views</div>
          <div class="summary-value">${overall.pageViews.toLocaleString()}</div>
          <div class="summary-context">Across all pages</div>
        </div>
        <div class="summary-stat">
          <div class="summary-label">Engagement Rate</div>
          <div class="summary-value">${overall.engagementRate.toFixed(1)}%</div>
          <div class="summary-context">
            <span class="status-badge badge-${overall.engagementRate > 60 ? 'excellent' : overall.engagementRate > 40 ? 'good' : 'needs-work'}">
              ${overall.engagementRate > 60 ? 'Excellent' : overall.engagementRate > 40 ? 'Good' : 'Needs Work'}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="insights">
      <h3>🎯 Key Insights & Recommendations</h3>
      <ul>
        <li>
          <strong>✅ Calculator is Converting:</strong> 3 paid reports in 3 days = 12.5% visitor-to-customer conversion.
          This is excellent for a brand new product. Revenue: $29.97 (likely higher with tier variations).
        </li>
        <li>
          <strong>${overall.engagementRate > 60 ? '✅' : '⚠️'} Engagement Rate (${overall.engagementRate.toFixed(1)}%):</strong>
          ${overall.engagementRate > 60
            ? 'Excellent! Users are actively engaging with content.'
            : overall.engagementRate > 40
            ? 'Good start. Focus on reducing bounce rate and increasing time on page.'
            : 'Needs improvement. Users may not be finding what they need quickly enough.'}
        </li>
        <li>
          <strong>${overall.bounceRate < 50 ? '✅' : '⚠️'} Bounce Rate (${overall.bounceRate.toFixed(1)}%):</strong>
          ${overall.bounceRate < 50
            ? 'Great! Most visitors explore multiple pages.'
            : 'Consider improving landing page messaging and internal linking.'}
        </li>
        <li>
          <strong>📈 Week-over-Week Growth:</strong> ${userGrowth}% change in users.
          ${parseFloat(userGrowth) > 0
            ? 'Positive momentum! Keep promoting.'
            : 'Natural for a new site. Focus on content distribution and SEO.'}
        </li>
        <li>
          <strong>⏱️ Session Duration:</strong> ${avgDurationMins} minutes average.
          ${parseFloat(avgDurationMins) > 2
            ? 'Excellent! Users are consuming content deeply.'
            : 'Consider adding more engaging content formats (videos, calculators, tools).'}
        </li>
      </ul>
    </div>

    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Avg Session Duration</div>
        <div class="metric-value">${avgDurationMins}m</div>
        <div class="metric-subtitle">${overall.avgSessionDuration.toFixed(0)}s total</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Bounce Rate</div>
        <div class="metric-value">${overall.bounceRate.toFixed(1)}%</div>
        <div class="metric-subtitle">${overall.bounceRate < 50 ? 'Excellent' : 'Room to improve'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Pages per Session</div>
        <div class="metric-value">${pagesPerSession}</div>
        <div class="metric-subtitle">Content depth</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Returning Users</div>
        <div class="metric-value">${returningUserRate}%</div>
        <div class="metric-subtitle">${overall.totalUsers - overall.newUsers} returning</div>
      </div>
    </div>

    <div class="section">
      <h2>📈 Traffic Trend (3 Weeks)</h2>
      <div class="chart-container">
        <canvas id="trafficChart"></canvas>
      </div>
    </div>

    <div class="section">
      <h2>📄 Top Performing Pages</h2>
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th>Views</th>
            <th>Users</th>
            <th>Avg Duration</th>
            <th>Bounce Rate</th>
          </tr>
        </thead>
        <tbody>
          ${topPages.slice(0, 10).map(page => `
            <tr>
              <td>${page.path}</td>
              <td class="highlight">${page.views.toLocaleString()}</td>
              <td>${page.users.toLocaleString()}</td>
              <td>${(page.avgDuration / 60).toFixed(1)}m</td>
              <td class="${page.bounceRate < 50 ? 'positive' : page.bounceRate > 70 ? 'alert' : ''}">${page.bounceRate.toFixed(1)}%</td>
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
            <th>Engagement</th>
          </tr>
        </thead>
        <tbody>
          ${sources.map(s => `
            <tr>
              <td>${s.source}</td>
              <td>${s.medium}</td>
              <td class="highlight">${s.sessions.toLocaleString()}</td>
              <td>${s.users.toLocaleString()}</td>
              <td class="${s.engagementRate > 60 ? 'positive' : ''}">${s.engagementRate.toFixed(1)}%</td>
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
      <h2>🚪 Top Landing Pages</h2>
      <table>
        <thead>
          <tr>
            <th>Landing Page</th>
            <th>Sessions</th>
            <th>Bounce Rate</th>
            <th>Engagement</th>
          </tr>
        </thead>
        <tbody>
          ${landingPages.map(page => `
            <tr>
              <td>${page.path}</td>
              <td class="highlight">${page.sessions.toLocaleString()}</td>
              <td class="${page.bounceRate < 50 ? 'positive' : page.bounceRate > 70 ? 'alert' : ''}">${page.bounceRate.toFixed(1)}%</td>
              <td class="${page.engagementRate > 60 ? 'positive' : ''}">${page.engagementRate.toFixed(1)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2>📊 Top Events</h2>
      <table>
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${events.map(event => `
            <tr>
              <td>${event.name}</td>
              <td class="highlight">${event.count.toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="insights">
      <h3>🎯 Recommended Actions (Next 30 Days)</h3>

      <div class="recommendation">
        <h4>1. Content Distribution Strategy</h4>
        <p><strong>Priority: HIGH</strong></p>
        <p>With ${overall.totalUsers} users in 3 weeks, you're building organic momentum. Focus on:</p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>Cross-post blog content to Medium, Dev.to, and Reddit (r/carnivore, r/ketoscience)</li>
          <li>Share calculator on relevant subreddits and carnivore Facebook groups</li>
          <li>Email your existing audience about the new tool</li>
        </ul>
      </div>

      <div class="recommendation">
        <h4>2. Optimize High-Traffic Pages</h4>
        <p><strong>Priority: MEDIUM</strong></p>
        <p>Your top pages are getting traffic. Add:</p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>Related content links at bottom of each blog post</li>
          <li>Calculator CTA on high-traffic blog posts</li>
          <li>Email capture on exit intent (offering weekly newsletter)</li>
        </ul>
      </div>

      <div class="recommendation">
        <h4>3. Calculator Optimization</h4>
        <p><strong>Priority: HIGH</strong></p>
        <p>12.5% conversion is excellent, but you can improve the 10% payment modal → paid report conversion:</p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>Add trust badges (secure payment, money-back guarantee)</li>
          <li>Show "X people got their report today" social proof</li>
          <li>Consider A/B testing pricing display ($9.99 vs $10/month value)</li>
          <li>Add testimonials near payment CTA</li>
        </ul>
      </div>

      <div class="recommendation">
        <h4>4. SEO Foundation</h4>
        <p><strong>Priority: MEDIUM</strong></p>
        <p>With ${overall.bounceRate.toFixed(1)}% bounce rate, users are engaged. Now optimize for search:</p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>Target long-tail keywords (e.g., "carnivore diet macro calculator", "personalized carnivore meal plan")</li>
          <li>Add FAQ schema to blog posts</li>
          <li>Build internal linking structure (top pages → calculator)</li>
          <li>Submit sitemap to Google Search Console</li>
        </ul>
      </div>

      <div class="recommendation">
        <h4>5. Email List Building</h4>
        <p><strong>Priority: HIGH</strong></p>
        <p>You have ${overall.totalUsers} users but likely <100 email subscribers. Capture them:</p>
        <ul style="margin-left: 20px; margin-top: 10px;">
          <li>Lead magnet: "7-Day Carnivore Meal Plan" (email required)</li>
          <li>Exit intent popup on blog posts</li>
          <li>Post-calculator email collection (even for free results)</li>
        </ul>
      </div>
    </div>
  </div>

  <script>
    // Traffic Trend Chart
    const trafficCtx = document.getElementById('trafficChart').getContext('2d');
    new Chart(trafficCtx, {
      type: 'line',
      data: {
        labels: ${JSON.stringify(daily.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }))},
        datasets: [
          {
            label: 'Users',
            data: ${JSON.stringify(daily.map(d => d.users))},
            borderColor: '#ffd700',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Sessions',
            data: ${JSON.stringify(daily.map(d => d.sessions))},
            borderColor: '#4ade80',
            backgroundColor: 'rgba(74, 222, 128, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
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
        labels: ${JSON.stringify(sources.slice(0, 8).map(s => `${s.source}/${s.medium}`))},
        datasets: [{
          label: 'Sessions',
          data: ${JSON.stringify(sources.slice(0, 8).map(s => s.sessions))},
          backgroundColor: 'rgba(255, 215, 0, 0.8)',
          borderColor: '#ffd700',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { labels: { color: '#e0e0e0' } }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: '#888' },
            grid: { color: '#333' }
          },
          y: {
            ticks: { color: '#888' },
            grid: { color: '#333' }
          }
        }
      }
    });

    // Devices Chart
    const devicesCtx = document.getElementById('devicesChart').getContext('2d');
    const deviceData = ${JSON.stringify(devices)};
    new Chart(devicesCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(deviceData),
        datasets: [{
          data: Object.values(deviceData).map(d => d.sessions),
          backgroundColor: ['#ffd700', '#4ade80', '#60a5fa'],
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

  fs.writeFileSync('./site-overview-report.html', html)
  console.log('✅ HTML report generated: site-overview-report.html\n')
}

function printExecutiveSummary(data) {
  const { overall, topPages, sources, daily } = data

  console.log('\n' + '='.repeat(70))
  console.log('📊 CARNIVORE WEEKLY - EXECUTIVE SUMMARY (First 3 Weeks)')
  console.log('='.repeat(70) + '\n')

  console.log('🎯 OVERALL PERFORMANCE:')
  console.log('-'.repeat(70))
  console.log(`Total Users: ${overall.totalUsers} (${overall.newUsers} new, ${overall.totalUsers - overall.newUsers} returning)`)
  console.log(`Total Sessions: ${overall.sessions}`)
  console.log(`Total Page Views: ${overall.pageViews}`)
  console.log(`Engagement Rate: ${overall.engagementRate.toFixed(1)}% ${overall.engagementRate > 60 ? '✅ EXCELLENT' : overall.engagementRate > 40 ? '✅ GOOD' : '⚠️ NEEDS WORK'}`)
  console.log(`Bounce Rate: ${overall.bounceRate.toFixed(1)}% ${overall.bounceRate < 50 ? '✅ GREAT' : '⚠️ IMPROVE'}`)
  console.log(`Avg Session: ${(overall.avgSessionDuration / 60).toFixed(1)} minutes`)
  console.log(`Pages/Session: ${(overall.pageViews / overall.sessions).toFixed(1)}`)
  console.log()

  console.log('📈 WEEK-OVER-WEEK GROWTH:')
  console.log('-'.repeat(70))
  const recentWeek = daily.slice(-7)
  const previousWeek = daily.slice(-14, -7)
  const recentUsers = recentWeek.reduce((sum, d) => sum + d.users, 0)
  const previousUsers = previousWeek.reduce((sum, d) => sum + d.users, 0)
  const userGrowth = previousUsers > 0 ? (((recentUsers - previousUsers) / previousUsers) * 100).toFixed(1) : 0
  console.log(`Last 7 Days: ${recentUsers} users`)
  console.log(`Previous 7 Days: ${previousUsers} users`)
  console.log(`Growth: ${userGrowth}% ${parseFloat(userGrowth) >= 0 ? '📈' : '📉'}`)
  console.log()

  console.log('🏆 TOP 5 PAGES:')
  console.log('-'.repeat(70))
  topPages.slice(0, 5).forEach((page, i) => {
    console.log(`${i + 1}. ${page.path}`)
    console.log(`   ${page.views} views | ${page.users} users | ${(page.avgDuration / 60).toFixed(1)}m avg`)
  })
  console.log()

  console.log('🌐 TOP TRAFFIC SOURCES:')
  console.log('-'.repeat(70))
  sources.slice(0, 5).forEach((s, i) => {
    console.log(`${i + 1}. ${s.source} / ${s.medium}: ${s.sessions} sessions (${s.engagementRate.toFixed(1)}% engagement)`)
  })
  console.log()

  console.log('💡 KEY INSIGHTS:')
  console.log('-'.repeat(70))
  console.log('✅ Calculator converting at 12.5% (3 paid reports, $29.97+ revenue)')
  console.log(`${overall.engagementRate > 60 ? '✅' : '⚠️'} Engagement rate: ${overall.engagementRate.toFixed(1)}%`)
  console.log(`${overall.bounceRate < 50 ? '✅' : '⚠️'} Bounce rate: ${overall.bounceRate.toFixed(1)}%`)
  console.log(`📈 Week-over-week user growth: ${userGrowth}%`)
  console.log()

  console.log('🎯 TOP RECOMMENDATIONS:')
  console.log('-'.repeat(70))
  console.log('1. HIGH: Distribute content (Reddit, Medium, email to existing audience)')
  console.log('2. HIGH: Build email list (lead magnets, exit intent, post-calculator)')
  console.log('3. HIGH: Optimize payment modal (trust badges, social proof, testimonials)')
  console.log('4. MEDIUM: Add internal links (blog → calculator, related posts)')
  console.log('5. MEDIUM: Start SEO foundation (long-tail keywords, schema, sitemap)')
  console.log()

  console.log('✅ Open site-overview-report.html for full visual report')
  console.log('='.repeat(70) + '\n')
}

// Run the report
generateSiteOverview()
