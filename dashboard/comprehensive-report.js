import { BetaAnalyticsDataClient } from '@google-analytics/data'
import fs from 'fs'
import path from 'path'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getComprehensiveReport() {
  const data = {
    timestamp: new Date().toISOString(),
    calculator: {},
    blogPages: [],
    wikiPages: [],
    searchQueries: [],
    topPages: []
  }

  try {
    // 1. Calculator Events (last 2 days)
    console.log('Fetching calculator data...')
    const [calcEvents] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
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

    calcEvents.rows?.forEach(row => {
      const eventName = row.dimensionValues[0].value
      const count = parseInt(row.metricValues[0].value)
      data.calculator[eventName] = count
    })

    // 2. Calculator page traffic
    const [calcTraffic] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'CONTAINS', value: 'calculator' }
        }
      },
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'averageSessionDuration' }
      ]
    })

    if (calcTraffic.rows?.[0]) {
      data.calculator.pageViews = parseInt(calcTraffic.rows[0].metricValues[0].value)
      data.calculator.users = parseInt(calcTraffic.rows[0].metricValues[1].value)
      data.calculator.avgDuration = parseFloat(calcTraffic.rows[0].metricValues[2].value).toFixed(0)
    }

    // 3. Blog pages (last 2 days)
    console.log('Fetching blog data...')
    const [blogData] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
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
      limit: 20
    })

    data.blogPages = blogData.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      views: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      avgDuration: parseFloat(row.metricValues[2].value).toFixed(0)
    })) || []

    // 4. Wiki pages (last 2 days)
    console.log('Fetching wiki data...')
    const [wikiData] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'CONTAINS', value: '/wiki/' }
        }
      },
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'averageSessionDuration' }
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 20
    })

    data.wikiPages = wikiData.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      views: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      avgDuration: parseFloat(row.metricValues[2].value).toFixed(0)
    })) || []

    // 5. Search queries (if tracked)
    console.log('Fetching search queries...')
    try {
      const [searchData] = await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'searchTerm' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: {
            fieldName: 'eventName',
            stringFilter: { value: 'view_search_results' }
          }
        },
        orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
        limit: 20
      })

      data.searchQueries = searchData.rows?.map(row => ({
        query: row.dimensionValues[0].value,
        count: parseInt(row.metricValues[0].value)
      })) || []
    } catch (e) {
      console.log('No search data available')
    }

    // 6. Top pages overall
    console.log('Fetching top pages...')
    const [topPages] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '2daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'totalUsers' },
        { name: 'averageSessionDuration' }
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 15
    })

    data.topPages = topPages.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      views: parseInt(row.metricValues[0].value),
      users: parseInt(row.metricValues[1].value),
      avgDuration: parseFloat(row.metricValues[2].value).toFixed(0)
    })) || []

    return data

  } catch (error) {
    console.error('Error:', error.message)
    throw error
  }
}

function generateHTML(data) {
  const calc = data.calculator
  const upgradeRate = calc.calculator_free_results > 0
    ? ((calc.calculator_upgrade_click / calc.calculator_free_results) * 100).toFixed(1)
    : 0

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnivore Weekly - Analytics Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #1a1a1a;
      color: #e0e0e0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 {
      color: #ffd700;
      margin-bottom: 0.5rem;
      font-size: 2rem;
    }
    .timestamp {
      color: #888;
      font-size: 0.9rem;
      margin-bottom: 2rem;
    }
    .section {
      background: #2a2a2a;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    h2 {
      color: #ffd700;
      font-size: 1.3rem;
      margin-bottom: 1rem;
      border-bottom: 2px solid #444;
      padding-bottom: 0.5rem;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .metric {
      background: #1a1a1a;
      padding: 1rem;
      border-radius: 6px;
      border-left: 4px solid #ffd700;
    }
    .metric-label {
      color: #888;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #ffd700;
      margin-top: 0.25rem;
    }
    .metric-sub {
      color: #aaa;
      font-size: 0.9rem;
      margin-top: 0.25rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }
    th {
      background: #1a1a1a;
      color: #ffd700;
      padding: 0.75rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 0.75rem;
      border-bottom: 1px solid #333;
    }
    tr:hover {
      background: #333;
    }
    .page-title {
      color: #e0e0e0;
      font-weight: 500;
    }
    .page-path {
      color: #888;
      font-size: 0.85rem;
      font-family: 'Courier New', monospace;
    }
    .highlight {
      color: #4ade80;
      font-weight: bold;
    }
    .low {
      color: #ef4444;
    }
    .empty-state {
      color: #666;
      font-style: italic;
      padding: 2rem;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Carnivore Weekly Analytics</h1>
    <div class="timestamp">Generated: ${new Date(data.timestamp).toLocaleString()}</div>

    <!-- Calculator Performance -->
    <div class="section">
      <h2>🧮 Calculator Performance (Last 2 Days)</h2>
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-label">Page Views</div>
          <div class="metric-value">${calc.pageViews || 0}</div>
          <div class="metric-sub">${calc.users || 0} unique users</div>
        </div>
        <div class="metric">
          <div class="metric-label">Avg Time on Page</div>
          <div class="metric-value">${calc.avgDuration || 0}s</div>
        </div>
        <div class="metric">
          <div class="metric-label">Free Results Viewed</div>
          <div class="metric-value">${calc.calculator_free_results || 0}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Upgrade Clicks</div>
          <div class="metric-value">${calc.calculator_upgrade_click || 0}</div>
          <div class="metric-sub ${upgradeRate > 50 ? 'highlight' : ''}">${upgradeRate}% click rate</div>
        </div>
        <div class="metric">
          <div class="metric-label">Purchases</div>
          <div class="metric-value ${calc.purchase > 0 ? 'highlight' : 'low'}">${calc.purchase || 0}</div>
        </div>
      </div>
    </div>

    <!-- Blog Performance -->
    <div class="section">
      <h2>📝 Blog Performance (Last 2 Days)</h2>
      ${data.blogPages.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th style="text-align: right;">Views</th>
            <th style="text-align: right;">Users</th>
            <th style="text-align: right;">Avg Time</th>
          </tr>
        </thead>
        <tbody>
          ${data.blogPages.map(page => `
            <tr>
              <td>
                <div class="page-title">${page.title}</div>
                <div class="page-path">${page.path}</div>
              </td>
              <td style="text-align: right;">${page.views}</td>
              <td style="text-align: right;">${page.users}</td>
              <td style="text-align: right;">${page.avgDuration}s</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<div class="empty-state">No blog traffic in the last 2 days</div>'}
    </div>

    <!-- Wiki Performance -->
    <div class="section">
      <h2>📚 Wiki Performance (Last 2 Days)</h2>
      ${data.wikiPages.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th style="text-align: right;">Views</th>
            <th style="text-align: right;">Users</th>
            <th style="text-align: right;">Avg Time</th>
          </tr>
        </thead>
        <tbody>
          ${data.wikiPages.map(page => `
            <tr>
              <td>
                <div class="page-title">${page.title}</div>
                <div class="page-path">${page.path}</div>
              </td>
              <td style="text-align: right;">${page.views}</td>
              <td style="text-align: right;">${page.users}</td>
              <td style="text-align: right;">${page.avgDuration}s</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<div class="empty-state">No wiki traffic in the last 2 days</div>'}
    </div>

    <!-- Search Queries -->
    <div class="section">
      <h2>🔍 Search Queries (Last 2 Days)</h2>
      ${data.searchQueries.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Query</th>
            <th style="text-align: right;">Count</th>
          </tr>
        </thead>
        <tbody>
          ${data.searchQueries.map(q => `
            <tr>
              <td>${q.query}</td>
              <td style="text-align: right;">${q.count}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ` : '<div class="empty-state">No search queries tracked (may need to implement site search tracking)</div>'}
    </div>

    <!-- Top Pages Overall -->
    <div class="section">
      <h2>📈 Top Pages Overall (Last 2 Days)</h2>
      <table>
        <thead>
          <tr>
            <th>Page</th>
            <th style="text-align: right;">Views</th>
            <th style="text-align: right;">Users</th>
            <th style="text-align: right;">Avg Time</th>
          </tr>
        </thead>
        <tbody>
          ${data.topPages.map(page => `
            <tr>
              <td>
                <div class="page-title">${page.title}</div>
                <div class="page-path">${page.path}</div>
              </td>
              <td style="text-align: right;">${page.views}</td>
              <td style="text-align: right;">${page.users}</td>
              <td style="text-align: right;">${page.avgDuration}s</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`
}

// Main execution
(async () => {
  console.log('🔄 Fetching comprehensive analytics data...\n')
  const data = await getComprehensiveReport()
  const html = generateHTML(data)

  const outputPath = path.join(process.cwd(), 'analytics-report.html')
  fs.writeFileSync(outputPath, html)

  console.log(`\n✅ Report generated: ${outputPath}`)
  console.log(`\nOpen in browser: open ${outputPath}`)
})()
