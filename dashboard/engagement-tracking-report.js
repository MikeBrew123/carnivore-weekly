import { BetaAnalyticsDataClient } from '@google-analytics/data'
import fs from 'fs'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getEngagementData() {
  console.log('📊 Fetching engagement tracking data...\n')

  try {
    // Get internal link clicks
    const [internalLinksResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }, { name: 'customEvent:destination' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'internal_link_click'
          }
        }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 50
    })

    // Get scroll depth data
    const [scrollDepthResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }, { name: 'customEvent:event_label' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'scroll_depth'
          }
        }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10
    })

    // Get outbound clicks
    const [outboundClicksResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }, { name: 'customEvent:link_type' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'outbound_click'
          }
        }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 50
    })

    const internalLinks = []
    if (internalLinksResponse.rows) {
      internalLinksResponse.rows.forEach(row => {
        const destination = row.dimensionValues[1].value
        if (destination && destination !== '(not set)') {
          internalLinks.push({
            destination: destination,
            count: parseInt(row.metricValues[0].value)
          })
        }
      })
    }

    const scrollDepth = []
    if (scrollDepthResponse.rows) {
      scrollDepthResponse.rows.forEach(row => {
        const label = row.dimensionValues[1].value
        if (label && label !== '(not set)') {
          scrollDepth.push({
            milestone: label,
            count: parseInt(row.metricValues[0].value)
          })
        }
      })
    }

    const outboundClicks = []
    if (outboundClicksResponse.rows) {
      outboundClicksResponse.rows.forEach(row => {
        const linkType = row.dimensionValues[1].value
        if (linkType && linkType !== '(not set)') {
          outboundClicks.push({
            type: linkType,
            count: parseInt(row.metricValues[0].value)
          })
        }
      })
    }

    generateHTMLReport({ internalLinks, scrollDepth, outboundClicks })
    printSummary({ internalLinks, scrollDepth, outboundClicks })

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('not set')) {
      console.log('\n⚠️  Note: The tracking was just added. Wait 24-48 hours for data to accumulate.')
      console.log('Then run this script again to see engagement metrics.\n')
    }
  }
}

function generateHTMLReport(data) {
  const { internalLinks, scrollDepth, outboundClicks } = data

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engagement Tracking Report - Carnivore Weekly</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
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
      margin-bottom: 40px;
      font-size: 1rem;
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
      font-size: 1.8rem;
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
    .explain-box {
      background: #1a2332;
      border-left: 4px solid #60a5fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .explain-box h3 {
      color: #60a5fa;
      margin-bottom: 10px;
    }
    .explain-box p {
      color: #cbd5e1;
      line-height: 1.8;
    }
    .no-data {
      text-align: center;
      padding: 40px;
      color: #888;
      font-size: 1.1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Engagement Tracking Report</h1>
    <p class="subtitle">How People Actually Use Your Site (Last 30 Days)</p>

    ${internalLinks.length > 0 || scrollDepth.length > 0 || outboundClicks.length > 0 ? `
      <div class="section">
        <h2>🔗 Internal Link Clicks</h2>
        <div class="explain-box">
          <h3>📘 What This Means:</h3>
          <p>These numbers show which pages people navigate TO from your content. High calculator clicks = good content-to-conversion flow.</p>
          <p><strong>Action:</strong> Pages with low clicks might need better CTAs or clearer links.</p>
        </div>

        ${internalLinks.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Destination Page</th>
              <th>Clicks</th>
            </tr>
          </thead>
          <tbody>
            ${internalLinks.map((link, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="highlight">${link.destination}</td>
                <td>${link.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p class="no-data">No internal link clicks yet. Give it 24-48 hours after deployment.</p>'}
      </div>

      <div class="section">
        <h2>📜 Scroll Depth</h2>
        <div class="explain-box">
          <h3>📘 What This Means:</h3>
          <p>This shows how far down the page people scroll. 100% = they read to the bottom. 25% = they bounced early.</p>
          <p><strong>Action:</strong> If most people only hit 25%, your intro isn't hooking them. If they hit 100%, your content is working!</p>
        </div>

        ${scrollDepth.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Milestone</th>
              <th>Times Reached</th>
            </tr>
          </thead>
          <tbody>
            ${scrollDepth.map(scroll => `
              <tr>
                <td class="highlight">${scroll.milestone}</td>
                <td>${scroll.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p class="no-data">No scroll depth data yet. Give it 24-48 hours after deployment.</p>'}
      </div>

      <div class="section">
        <h2>🌐 Outbound Clicks</h2>
        <div class="explain-box">
          <h3>📘 What This Means:</h3>
          <p>These are links people clicked to LEAVE your site (YouTube videos, research papers, affiliate links, etc.).</p>
          <p><strong>Action:</strong> High clicks = people trust your recommendations. Track which resources get the most engagement.</p>
        </div>

        ${outboundClicks.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Link Type</th>
              <th>Clicks</th>
            </tr>
          </thead>
          <tbody>
            ${outboundClicks.map((click, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="highlight">${click.type}</td>
                <td>${click.count}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p class="no-data">No outbound clicks yet. Give it 24-48 hours after deployment.</p>'}
      </div>
    ` : `
      <div class="section">
        <div class="no-data">
          <h2>⏳ No Engagement Data Yet</h2>
          <p style="margin-top: 20px;">The tracking was just added. Wait 24-48 hours for people to interact with the site.</p>
          <p style="margin-top: 15px;">Come back in 2 days and run this script again to see engagement metrics!</p>
        </div>
      </div>
    `}
  </div>
</body>
</html>`

  fs.writeFileSync('./engagement-tracking-report.html', html)
  console.log('✅ HTML report generated: engagement-tracking-report.html\n')
}

function printSummary(data) {
  const { internalLinks, scrollDepth, outboundClicks } = data

  console.log('\n' + '='.repeat(70))
  console.log('📊 ENGAGEMENT TRACKING REPORT')
  console.log('='.repeat(70) + '\n')

  if (internalLinks.length === 0 && scrollDepth.length === 0 && outboundClicks.length === 0) {
    console.log('⏳ No data yet - tracking was just added.')
    console.log('Wait 24-48 hours, then run this again to see engagement data.\n')
    return
  }

  console.log('🔗 INTERNAL LINK CLICKS (Top Destinations):')
  console.log('-'.repeat(70))
  if (internalLinks.length > 0) {
    internalLinks.slice(0, 10).forEach((link, i) => {
      console.log(`${i + 1}. ${link.destination} - ${link.count} clicks`)
    })
  } else {
    console.log('None yet.')
  }
  console.log()

  console.log('📜 SCROLL DEPTH:')
  console.log('-'.repeat(70))
  if (scrollDepth.length > 0) {
    scrollDepth.forEach(scroll => {
      console.log(`${scroll.milestone}: ${scroll.count} times`)
    })
  } else {
    console.log('None yet.')
  }
  console.log()

  console.log('🌐 OUTBOUND CLICKS (Where People Go):')
  console.log('-'.repeat(70))
  if (outboundClicks.length > 0) {
    outboundClicks.slice(0, 10).forEach((click, i) => {
      console.log(`${i + 1}. ${click.type} - ${click.count} clicks`)
    })
  } else {
    console.log('None yet.')
  }
  console.log()

  console.log('✅ Open engagement-tracking-report.html for full visual report')
  console.log('='.repeat(70) + '\n')
}

// Run the report
getEngagementData()
