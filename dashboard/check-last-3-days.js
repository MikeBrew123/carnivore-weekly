import { BetaAnalyticsDataClient } from '@google-analytics/data';

const propertyId = '517632328';
const analyticsDataClient = new BetaAnalyticsDataClient({
  keyFilename: './ga4-credentials.json',
});

async function checkLast3Days() {
  try {
    const [response] = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        {
          startDate: '3daysAgo',
          endDate: 'today',
        },
      ],
      dimensions: [
        {
          name: 'date',
        },
      ],
      metrics: [
        {
          name: 'activeUsers',
        },
        {
          name: 'sessions',
        },
        {
          name: 'screenPageViews',
        },
      ],
    });

    console.log('\n📊 Traffic Report: Last 3 Days\n');
    console.log('Date       | Users | Sessions | Page Views');
    console.log('-----------|-------|----------|------------');

    let totalUsers = 0;
    let totalSessions = 0;
    let totalPageViews = 0;

    response.rows?.forEach((row) => {
      const date = row.dimensionValues[0].value;
      const users = parseInt(row.metricValues[0].value);
      const sessions = parseInt(row.metricValues[1].value);
      const pageViews = parseInt(row.metricValues[2].value);

      totalUsers += users;
      totalSessions += sessions;
      totalPageViews += pageViews;

      const formattedDate = `${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`;
      console.log(`${formattedDate} | ${users.toString().padStart(5)} | ${sessions.toString().padStart(8)} | ${pageViews.toString().padStart(10)}`);
    });

    console.log('-----------|-------|----------|------------');
    console.log(`Total      | ${totalUsers.toString().padStart(5)} | ${totalSessions.toString().padStart(8)} | ${totalPageViews.toString().padStart(10)}`);

    // Calculate trend
    if (response.rows && response.rows.length >= 2) {
      const firstDay = parseInt(response.rows[0].metricValues[0].value);
      const lastDay = parseInt(response.rows[response.rows.length - 1].metricValues[0].value);
      const change = ((lastDay - firstDay) / firstDay * 100).toFixed(1);

      console.log(`\n📈 Trend: ${change}% change from first to last day`);

      if (Math.abs(parseFloat(change)) > 20) {
        console.log(`⚠️  Significant ${parseFloat(change) > 0 ? 'increase' : 'decrease'} detected!`);
      }
    }

  } catch (error) {
    console.error('Error fetching GA4 data:', error.message);
  }
}

checkLast3Days();
