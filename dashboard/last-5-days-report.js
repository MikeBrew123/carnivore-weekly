import { BetaAnalyticsDataClient } from '@google-analytics/data';

const propertyId = '517632328';
const client = new BetaAnalyticsDataClient({
  keyFilename: './ga4-credentials.json'
});

async function getLast5DaysReport() {
  console.log('📊 Fetching last 5 days of analytics data...\n');

  try {
    // Overview metrics
    const [overview] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '5daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
    });

    // Top pages
    const [topPages] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '5daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' }
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10
    });

    // Traffic sources
    const [trafficSources] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '5daysAgo', endDate: 'today' }],
      dimensions: [
        { name: 'sessionSource' },
        { name: 'sessionMedium' }
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10
    });

    // Device breakdown
    const [devices] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '5daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' }
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    });

    // Events (newsletter signups, calculator usage, etc)
    const [events] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '5daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 15
    });

    printReport(overview, topPages, trafficSources, devices, events);

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

function printReport(overview, topPages, trafficSources, devices, events) {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📈 CARNIVORE WEEKLY - LAST 5 DAYS ANALYTICS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Daily overview
  console.log('📅 DAILY BREAKDOWN');
  console.log('─────────────────────────────────────────────────────────');
  let totalUsers = 0;
  let totalSessions = 0;
  let totalPageviews = 0;

  overview.rows?.forEach(row => {
    const date = row.dimensionValues[0].value;
    const users = parseInt(row.metricValues[0].value);
    const sessions = parseInt(row.metricValues[1].value);
    const pageviews = parseInt(row.metricValues[2].value);
    const avgDuration = parseFloat(row.metricValues[3].value);
    const bounceRate = parseFloat(row.metricValues[4].value);

    totalUsers += users;
    totalSessions += sessions;
    totalPageviews += pageviews;

    console.log(`${date}: ${users} users | ${sessions} sessions | ${pageviews} pageviews | ${Math.round(avgDuration)}s avg | ${(bounceRate * 100).toFixed(1)}% bounce`);
  });

  console.log('\n📊 TOTALS (Last 5 Days)');
  console.log(`   Users: ${totalUsers}`);
  console.log(`   Sessions: ${totalSessions}`);
  console.log(`   Pageviews: ${totalPageviews}`);
  console.log(`   Pages/Session: ${(totalPageviews / totalSessions).toFixed(2)}`);

  // Top pages
  console.log('\n\n📄 TOP 10 PAGES');
  console.log('─────────────────────────────────────────────────────────');
  topPages.rows?.forEach((row, i) => {
    const path = row.dimensionValues[0].value;
    const views = row.metricValues[0].value;
    const users = row.metricValues[1].value;
    console.log(`${i + 1}. ${path}`);
    console.log(`   ${views} views | ${users} users`);
  });

  // Traffic sources
  console.log('\n\n🌐 TRAFFIC SOURCES');
  console.log('─────────────────────────────────────────────────────────');
  trafficSources.rows?.forEach((row, i) => {
    const source = row.dimensionValues[0].value;
    const medium = row.dimensionValues[1].value;
    const sessions = row.metricValues[0].value;
    const users = row.metricValues[1].value;
    console.log(`${i + 1}. ${source} / ${medium}: ${sessions} sessions | ${users} users`);
  });

  // Device breakdown
  console.log('\n\n📱 DEVICE BREAKDOWN');
  console.log('─────────────────────────────────────────────────────────');
  devices.rows?.forEach(row => {
    const device = row.dimensionValues[0].value;
    const users = row.metricValues[0].value;
    const sessions = row.metricValues[1].value;
    const percentage = (parseInt(sessions) / totalSessions * 100).toFixed(1);
    console.log(`${device}: ${sessions} sessions (${percentage}%) | ${users} users`);
  });

  // Events
  console.log('\n\n⚡ TOP EVENTS');
  console.log('─────────────────────────────────────────────────────────');
  events.rows?.slice(0, 15).forEach((row, i) => {
    const eventName = row.dimensionValues[0].value;
    const count = row.metricValues[0].value;
    console.log(`${i + 1}. ${eventName}: ${count}`);
  });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`Report generated: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

getLast5DaysReport().catch(console.error);
