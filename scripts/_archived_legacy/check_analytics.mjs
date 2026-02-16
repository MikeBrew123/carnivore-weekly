#!/usr/bin/env node
/**
 * Quick Analytics Check
 * Fetches current site traffic data from Google Analytics
 */

import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Load environment variables
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '..', '.env') })

import { getAllMetrics } from '../dashboard/services/analytics.js'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import path from 'path'

const CREDENTIALS_PATH = path.join(process.cwd(), 'dashboard', 'ga4-credentials.json')
const propertyId = process.env.GA4_PROPERTY_ID

async function getBlogMetrics() {
  const analyticsDataClient = new BetaAnalyticsDataClient({
    keyFilename: CREDENTIALS_PATH
  })

  try {
    const response = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'engagementRate' },
        { name: 'userEngagementDuration' }
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: {
            matchType: 'CONTAINS',
            value: '/blog/'
          }
        }
      },
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10
    })

    const rows = response[0].rows || []

    return rows.map(row => ({
      path: row.dimensionValues[0]?.value || '/',
      title: row.dimensionValues[1]?.value || 'Untitled',
      views: parseInt(row.metricValues[0]?.value || '0', 10),
      avgSessionDuration: parseFloat(row.metricValues[1]?.value || '0'),
      engagementRate: parseFloat(row.metricValues[2]?.value || '0'),
      totalEngagementTime: parseFloat(row.metricValues[3]?.value || '0')
    }))
  } catch (error) {
    console.error('Error fetching blog metrics:', error.message)
    return []
  }
}

async function getCalculatorMetrics() {
  const analyticsDataClient = new BetaAnalyticsDataClient({
    keyFilename: CREDENTIALS_PATH
  })

  try {
    // Get calculator page flow
    const flowResponse = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      dimensionFilter: {
        orGroup: {
          expressions: [
            {
              filter: {
                fieldName: 'pagePath',
                stringFilter: {
                  matchType: 'EXACT',
                  value: '/calculator.html'
                }
              }
            },
            {
              filter: {
                fieldName: 'pagePath',
                stringFilter: {
                  matchType: 'CONTAINS',
                  value: 'calculator'
                }
              }
            }
          ]
        }
      }
    })

    const flowRows = flowResponse[0].rows || []

    return {
      pages: flowRows.map(row => ({
        path: row.dimensionValues[0]?.value || '/',
        views: parseInt(row.metricValues[0]?.value || '0', 10),
        avgTime: parseFloat(row.metricValues[1]?.value || '0'),
        bounceRate: parseFloat(row.metricValues[2]?.value || '0')
      }))
    }
  } catch (error) {
    console.error('Error fetching calculator metrics:', error.message)
    return { pages: [] }
  }
}

async function main() {
  console.log('📊 Fetching Google Analytics Data...\n')
  console.log('=' .repeat(60))

  const [metrics, blogMetrics, calculatorMetrics] = await Promise.all([
    getAllMetrics(),
    getBlogMetrics(),
    getCalculatorMetrics()
  ])

  if (metrics.error) {
    console.error('❌ Error fetching analytics:', metrics.error)
    return
  }

  console.log('\n📈 PAGE VIEWS')
  console.log('  Today:        ' + metrics.pageViews.today.toLocaleString())
  console.log('  Last 7 days:  ' + metrics.pageViews.last7Days.toLocaleString())
  console.log('  Last 30 days: ' + metrics.pageViews.last30Days.toLocaleString())

  console.log('\n👥 UNIQUE USERS')
  console.log('  Today:        ' + metrics.users.today.toLocaleString())
  console.log('  Last 7 days:  ' + metrics.users.last7Days.toLocaleString())
  console.log('  Last 30 days: ' + metrics.users.last30Days.toLocaleString())

  console.log('\n🔥 REAL-TIME')
  console.log('  Active now:   ' + metrics.realtimeUsers.toLocaleString() + ' users')

  console.log('\n📄 TOP PAGES (Last 7 Days)')
  if (metrics.topPages.length > 0) {
    metrics.topPages.forEach((page, i) => {
      console.log(`  ${i + 1}. ${page.views.toLocaleString()} views - ${page.path}`)
      if (page.title !== page.path && page.title !== 'Untitled') {
        console.log(`     "${page.title}"`)
      }
    })
  } else {
    console.log('  No page data available')
  }

  console.log('\n💰 AFFILIATE CLICKS (Last 7 Days)')
  if (metrics.affiliateClicks.length > 0) {
    metrics.affiliateClicks.forEach((affiliate, i) => {
      console.log(`  ${i + 1}. ${affiliate.clicks} clicks - ${affiliate.product}`)
    })
  } else {
    console.log('  No affiliate clicks tracked yet')
  }

  console.log('\n📝 TOP BLOG POSTS (Last 30 Days)')
  if (blogMetrics.length > 0) {
    const top3 = blogMetrics.slice(0, 3)
    top3.forEach((blog, i) => {
      const avgTimeMinutes = blog.totalEngagementTime > 0
        ? Math.round((blog.totalEngagementTime / blog.views) / 60)
        : 0
      const avgTimeSeconds = blog.totalEngagementTime > 0
        ? Math.round((blog.totalEngagementTime / blog.views) % 60)
        : 0
      const engagementPct = (blog.engagementRate * 100).toFixed(1)

      console.log(`\n  ${i + 1}. ${blog.views.toLocaleString()} views - ${blog.path}`)
      console.log(`     "${blog.title}"`)
      console.log(`     ⏱️  Avg time on page: ${avgTimeMinutes}m ${avgTimeSeconds}s`)
      console.log(`     📊 Engagement rate: ${engagementPct}%`)
    })

    console.log('\n  📊 All Blog Posts (Last 30 Days):')
    const totalBlogViews = blogMetrics.reduce((sum, blog) => sum + blog.views, 0)
    const totalBlogTime = blogMetrics.reduce((sum, blog) => sum + blog.totalEngagementTime, 0)
    const avgBlogTime = totalBlogViews > 0 ? totalBlogTime / totalBlogViews : 0
    console.log(`     Total: ${blogMetrics.length} posts`)
    console.log(`     Total views: ${totalBlogViews.toLocaleString()}`)
    console.log(`     Avg time per blog view: ${Math.floor(avgBlogTime / 60)}m ${Math.round(avgBlogTime % 60)}s`)
  } else {
    console.log('  No blog data available')
  }

  console.log('\n🧮 CALCULATOR PERFORMANCE (Last 30 Days)')
  if (calculatorMetrics.pages && calculatorMetrics.pages.length > 0) {
    calculatorMetrics.pages.forEach((page, i) => {
      const avgMinutes = Math.floor(page.avgTime / 60)
      const avgSeconds = Math.round(page.avgTime % 60)
      const bounceRatePct = (page.bounceRate * 100).toFixed(1)

      console.log(`\n  ${page.path}`)
      console.log(`     📊 ${page.views.toLocaleString()} views`)
      console.log(`     ⏱️  Avg time: ${avgMinutes}m ${avgSeconds}s`)
      console.log(`     📉 Bounce rate: ${bounceRatePct}%`)
    })

    const totalCalcViews = calculatorMetrics.pages.reduce((sum, p) => sum + p.views, 0)
    const totalCalcTime = calculatorMetrics.pages.reduce((sum, p) => sum + (p.avgTime * p.views), 0)
    const avgCalcTime = totalCalcViews > 0 ? totalCalcTime / totalCalcViews : 0

    console.log('\n  📊 Summary:')
    console.log(`     Total calculator views: ${totalCalcViews.toLocaleString()}`)
    console.log(`     Avg time per session: ${Math.floor(avgCalcTime / 60)}m ${Math.round(avgCalcTime % 60)}s`)

    // Look for conversion signals
    const hasCheckout = calculatorMetrics.pages.some(p => p.path.includes('checkout') || p.path.includes('payment'))
    const hasReport = calculatorMetrics.pages.some(p => p.path.includes('report'))

    console.log('\n  💰 Conversion Signals:')
    if (hasCheckout) {
      const checkoutPage = calculatorMetrics.pages.find(p => p.path.includes('checkout') || p.path.includes('payment'))
      console.log(`     ✅ Checkout page detected: ${checkoutPage.views} views`)
      const conversionRate = ((checkoutPage.views / totalCalcViews) * 100).toFixed(2)
      console.log(`     📊 Conversion rate: ${conversionRate}%`)
    } else {
      console.log(`     ⚠️  No checkout/payment page views detected`)
      console.log(`     💡 This means either:`)
      console.log(`        - Event tracking not set up for upgrade clicks`)
      console.log(`        - No one has clicked the upgrade button yet`)
      console.log(`        - Checkout happens on external page (Stripe)`)
    }
  } else {
    console.log('  No calculator data available')
  }

  console.log('\n' + '='.repeat(60))
  console.log(`\n✅ Data fetched at: ${new Date(metrics.timestamp).toLocaleString()}`)
  console.log('\n📊 Google Analytics ID: G-NR4JVKW2JV')
  console.log('🔗 Site: carnivoreweekly.com\n')
}

main().catch(console.error)
