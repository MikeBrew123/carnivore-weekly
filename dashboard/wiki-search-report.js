import { BetaAnalyticsDataClient } from '@google-analytics/data'
import fs from 'fs'

const propertyId = '517632328'
const CREDENTIALS_PATH = './ga4-credentials.json'

const client = new BetaAnalyticsDataClient({
  keyFilename: CREDENTIALS_PATH
})

async function getWikiSearchData() {
  console.log('📊 Fetching wiki search data...\n')

  try {
    // Get successful wiki searches
    const [searchResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }, { name: 'customEvent:search_term' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'wiki_search'
          }
        }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 50
    })

    // Get failed searches (no results)
    const [noResultsResponse] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }, { name: 'customEvent:search_term' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'wiki_search_no_results'
          }
        }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 50
    })

    const searches = []
    if (searchResponse.rows) {
      searchResponse.rows.forEach(row => {
        const term = row.dimensionValues[1].value
        if (term && term !== '(not set)') {
          searches.push({
            term: term,
            count: parseInt(row.metricValues[0].value),
            foundResults: true
          })
        }
      })
    }

    const noResults = []
    if (noResultsResponse.rows) {
      noResultsResponse.rows.forEach(row => {
        const term = row.dimensionValues[1].value
        if (term && term !== '(not set)') {
          noResults.push({
            term: term,
            count: parseInt(row.metricValues[0].value),
            foundResults: false
          })
        }
      })
    }

    generateHTMLReport({ searches, noResults })
    printSummary({ searches, noResults })

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.message.includes('not set')) {
      console.log('\n⚠️  Note: The tracking was just added. Wait 24-48 hours for data to accumulate.')
      console.log('Then run this script again to see what people are searching for.\n')
    }
  }
}

function generateHTMLReport(data) {
  const { searches, noResults } = data

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wiki Search Report - Carnivore Weekly</title>
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
    .alert { color: #ef4444; font-weight: 600; }
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
    .action-box {
      background: #2a1a0a;
      border-left: 4px solid #ffd700;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .action-box h3 {
      color: #ffd700;
      margin-bottom: 15px;
    }
    .action-box ul {
      margin-left: 20px;
    }
    .action-box li {
      margin: 8px 0;
      color: #e0e0e0;
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
    <h1>🔍 Wiki Search Report</h1>
    <p class="subtitle">What People Are Looking For (Last 30 Days)</p>

    ${searches.length > 0 || noResults.length > 0 ? `
      <div class="section">
        <h2>✅ Successful Searches (Found Results)</h2>
        <div class="explain-box">
          <h3>📘 What This Means:</h3>
          <p>These are the topics people searched for AND found on your wiki. This tells you which content is being actively used.</p>
          <p><strong>Action:</strong> These are your popular topics - make sure they're always up-to-date and comprehensive.</p>
        </div>

        ${searches.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Search Term</th>
              <th>Times Searched</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${searches.map((s, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="highlight">${s.term}</td>
                <td>${s.count}</td>
                <td class="positive">✅ Found</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p class="no-data">No successful searches yet. Give it 24-48 hours after deployment.</p>'}
      </div>

      <div class="section">
        <h2>❌ Failed Searches (No Results Found)</h2>
        <div class="explain-box">
          <h3>📘 What This Means:</h3>
          <p>These are topics people searched for but your wiki DOESN'T cover yet. <strong>This is GOLD</strong> - it's your audience telling you exactly what content they need.</p>
          <p><strong>Action:</strong> Write wiki topics for the most-searched "no results" terms. These are guaranteed to get traffic because people are already looking for them!</p>
        </div>

        ${noResults.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Missing Topic</th>
              <th>Times Searched</th>
              <th>Action Needed</th>
            </tr>
          </thead>
          <tbody>
            ${noResults.map((s, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="highlight">${s.term}</td>
                <td class="alert">${s.count}</td>
                <td class="alert">📝 Write this topic!</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="action-box">
          <h3>🎯 Immediate Actions:</h3>
          <ul>
            ${noResults.slice(0, 5).map(s =>
              `<li><strong>${s.term}:</strong> Add this topic to your wiki (${s.count} people already looking for it)</li>`
            ).join('')}
          </ul>
        </div>
        ` : '<p class="no-data">Great! No failed searches - all topics are covered.</p>'}
      </div>

      <div class="section">
        <h2>💡 Insights & Next Steps</h2>
        <div class="action-box">
          <h3>Based on search data:</h3>
          <ul>
            <li><strong>Total searches:</strong> ${searches.reduce((sum, s) => sum + s.count, 0) + noResults.reduce((sum, s) => sum + s.count, 0)}</li>
            <li><strong>Successful:</strong> ${searches.reduce((sum, s) => sum + s.count, 0)} (${searches.length} unique terms)</li>
            <li><strong>Failed:</strong> ${noResults.reduce((sum, s) => sum + s.count, 0)} (${noResults.length} missing topics)</li>
            ${noResults.length > 0 ? `
            <li class="alert"><strong>Content Gap:</strong> ${((noResults.reduce((sum, s) => sum + s.count, 0) / (searches.reduce((sum, s) => sum + s.count, 0) + noResults.reduce((sum, s) => sum + s.count, 0))) * 100).toFixed(1)}% of searches found nothing - write these topics!</li>
            ` : ''}
          </ul>
        </div>

        ${noResults.length > 0 ? `
        <div class="action-box">
          <h3>📝 Priority Content to Create:</h3>
          <p>Based on demand (most-searched missing topics):</p>
          <ol style="margin-left: 20px; margin-top: 15px;">
            ${noResults.slice(0, 10).map((s, i) =>
              `<li style="margin: 10px 0;"><strong>${s.term}</strong> - ${s.count} searches (high demand!)</li>`
            ).join('')}
          </ol>
        </div>
        ` : ''}
      </div>
    ` : `
      <div class="section">
        <div class="no-data">
          <h2>⏳ No Search Data Yet</h2>
          <p style="margin-top: 20px;">The tracking was just added. Wait 24-48 hours for people to search the wiki.</p>
          <p style="margin-top: 15px;">Come back in 2 days and run this script again to see what people are looking for!</p>
        </div>
      </div>
    `}
  </div>
</body>
</html>`

  fs.writeFileSync('./wiki-search-report.html', html)
  console.log('✅ HTML report generated: wiki-search-report.html\n')
}

function printSummary(data) {
  const { searches, noResults } = data

  console.log('\n' + '='.repeat(70))
  console.log('🔍 WIKI SEARCH REPORT')
  console.log('='.repeat(70) + '\n')

  if (searches.length === 0 && noResults.length === 0) {
    console.log('⏳ No data yet - tracking was just added.')
    console.log('Wait 24-48 hours, then run this again to see search data.\n')
    return
  }

  console.log('✅ SUCCESSFUL SEARCHES (Found Results):')
  console.log('-'.repeat(70))
  if (searches.length > 0) {
    searches.slice(0, 10).forEach((s, i) => {
      console.log(`${i + 1}. "${s.term}" - ${s.count} searches`)
    })
  } else {
    console.log('None yet.')
  }
  console.log()

  console.log('❌ FAILED SEARCHES (No Results):')
  console.log('-'.repeat(70))
  if (noResults.length > 0) {
    noResults.slice(0, 10).forEach((s, i) => {
      console.log(`${i + 1}. "${s.term}" - ${s.count} searches 📝 WRITE THIS TOPIC`)
    })
  } else {
    console.log('None - all searches found results!')
  }
  console.log()

  if (noResults.length > 0) {
    console.log('🎯 IMMEDIATE ACTION:')
    console.log('-'.repeat(70))
    console.log(`Add these ${Math.min(5, noResults.length)} topics to your wiki (highest demand):`)
    noResults.slice(0, 5).forEach(s => {
      console.log(`  • ${s.term}`)
    })
    console.log()
  }

  console.log('✅ Open wiki-search-report.html for full visual report')
  console.log('='.repeat(70) + '\n')
}

// Run the report
getWikiSearchData()
