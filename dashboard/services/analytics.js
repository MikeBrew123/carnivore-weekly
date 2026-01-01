/**
 * Google Analytics 4 Service
 *
 * Provides methods to fetch analytics data from Google Analytics Data API v1
 * Uses OAuth 2.0 authentication with user's Google account
 * Requires:
 * - GA4_PROPERTY_ID: The GA4 property ID (numeric, e.g., "2173561")
 * - oauth-credentials.json: OAuth client credentials in project directory
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { logger } from '../lib/logger.js'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_PATH = path.join(__dirname, '../ga4-credentials.json')

let analyticsDataClient = null
let propertyId = null

/**
 * Initialize the Analytics client with service account credentials
 * Called automatically on first use
 */
function initializeClient() {
  if (analyticsDataClient && propertyId) {
    return
  }

  propertyId = process.env.GA4_PROPERTY_ID

  if (!propertyId) {
    logger.warn('GA4_PROPERTY_ID not configured in environment variables.')
    return
  }

  try {
    // Create Analytics client with service account credentials
    analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: CREDENTIALS_PATH
    })

    logger.info(`Analytics client initialized with service account for property ID: ${propertyId}`)
  } catch (error) {
    logger.error('Failed to initialize Analytics client:', error.message)
    // Set to null so we can retry next time
    analyticsDataClient = null
  }
}

/**
 * Get page views for today, last 7 days, and last 30 days
 * @returns {Promise<{today: number, last7Days: number, last30Days: number}>}
 */
export async function getPageViews() {
  initializeClient()

  if (!analyticsDataClient || !propertyId) {
    logger.warn('Analytics client not available')
    return { today: 0, last7Days: 0, last30Days: 0 }
  }

  try {
    const response = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: 'today', endDate: 'today' },          // index 0
        { startDate: '7daysAgo', endDate: 'today' },       // index 1
        { startDate: '30daysAgo', endDate: 'today' }       // index 2
      ],
      metrics: [{ name: 'screenPageViews' }]
    })

    const rows = response[0].rows || []

    // Map date_range indices to values
    const values = { 0: 0, 1: 0, 2: 0 }
    rows.forEach(row => {
      const rangeIndex = row.dimensionValues[0]?.value
      const value = parseInt(row.metricValues[0]?.value || '0', 10)
      if (rangeIndex && rangeIndex.includes('date_range')) {
        const idx = parseInt(rangeIndex.replace('date_range_', ''), 10)
        values[idx] = value
      }
    })

    return {
      today: values[0],           // today
      last7Days: values[1],       // 7 days
      last30Days: values[2]       // 30 days
    }
  } catch (error) {
    logger.error('Error fetching page views:', error.message)
    return { today: 0, last7Days: 0, last30Days: 0 }
  }
}

/**
 * Get unique user counts for today, last 7 days, and last 30 days
 * @returns {Promise<{today: number, last7Days: number, last30Days: number}>}
 */
export async function getUsers() {
  initializeClient()

  if (!analyticsDataClient || !propertyId) {
    logger.warn('Analytics client not available')
    return { today: 0, last7Days: 0, last30Days: 0 }
  }

  try {
    const response = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [
        { startDate: 'today', endDate: 'today' },          // index 0
        { startDate: '7daysAgo', endDate: 'today' },       // index 1
        { startDate: '30daysAgo', endDate: 'today' }       // index 2
      ],
      metrics: [{ name: 'totalUsers' }]
    })

    const rows = response[0].rows || []

    // Map date_range indices to values
    const values = { 0: 0, 1: 0, 2: 0 }
    rows.forEach(row => {
      const rangeIndex = row.dimensionValues[0]?.value
      const value = parseInt(row.metricValues[0]?.value || '0', 10)
      if (rangeIndex && rangeIndex.includes('date_range')) {
        const idx = parseInt(rangeIndex.replace('date_range_', ''), 10)
        values[idx] = value
      }
    })

    return {
      today: values[0],           // today
      last7Days: values[1],       // 7 days
      last30Days: values[2]       // 30 days
    }
  } catch (error) {
    logger.error('Error fetching users:', error.message)
    return { today: 0, last7Days: 0, last30Days: 0 }
  }
}

/**
 * Get top 10 pages by views for a given number of days
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise<Array<{path: string, title: string, views: number}>>}
 */
export async function getTopPages(days = 7) {
  initializeClient()

  if (!analyticsDataClient || !propertyId) {
    logger.warn('Analytics client not available')
    return []
  }

  try {
    const response = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10
    })

    const rows = response[0].rows || []

    return rows.map(row => ({
      path: row.dimensionValues[0]?.value || '/',
      title: row.dimensionValues[1]?.value || 'Untitled',
      views: parseInt(row.metricValues[0]?.value || '0', 10)
    }))
  } catch (error) {
    logger.error('Error fetching top pages:', error.message)
    return []
  }
}

/**
 * Get real-time active user count
 * @returns {Promise<number>}
 */
export async function getRealtimeUsers() {
  initializeClient()

  if (!analyticsDataClient || !propertyId) {
    logger.warn('Analytics client not available')
    return 0
  }

  try {
    const response = await analyticsDataClient.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }]
    })

    const totalValue = response[0].totals?.[0]?.metricValues?.[0]?.value || '0'
    return parseInt(totalValue, 10)
  } catch (error) {
    logger.error('Error fetching real-time users:', error.message)
    return 0
  }
}

/**
 * Get affiliate link clicks (ButcherBox, LMNT, Amazon)
 * @returns {Promise<Array<{product: string, clicks: number, lastClicked: string}>>}
 */
export async function getAffiliateClicks() {
  initializeClient()

  if (!analyticsDataClient || !propertyId) {
    logger.warn('Analytics client not available')
    return []
  }

  try {
    const response = await analyticsDataClient.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }, { name: 'eventLabel' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: {
            matchType: 'EXACT',
            value: 'click'
          }
        }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 20
    })

    const rows = response[0].rows || []

    // Group by eventLabel (product name) and sum clicks
    const affiliateMap = {}
    rows.forEach(row => {
      const eventLabel = row.dimensionValues[1]?.value || 'Unknown'
      const clicks = parseInt(row.metricValues[0]?.value || '0', 10)

      // Filter for Affiliate events only
      if (eventLabel && (eventLabel.includes('ButcherBox') || eventLabel.includes('LMNT') || eventLabel.includes('Amazon') || eventLabel.includes('Lodge') || eventLabel.includes('Affiliate'))) {
        affiliateMap[eventLabel] = (affiliateMap[eventLabel] || 0) + clicks
      }
    })

    return Object.entries(affiliateMap).map(([product, clicks]) => ({
      product,
      clicks,
      lastClicked: new Date().toISOString()
    }))
  } catch (error) {
    logger.error('Error fetching affiliate clicks:', error.message)
    return []
  }
}

/**
 * Export all analytics data in a single call
 * Uses Promise.all to fetch all metrics in parallel
 * @returns {Promise<{pageViews, users, topPages, realtime, affiliateClicks}>}
 */
export async function getAllMetrics() {
  try {
    const [pageViews, users, topPages, realtimeUsers, affiliateClicks] = await Promise.all([
      getPageViews(),
      getUsers(),
      getTopPages(),
      getRealtimeUsers(),
      getAffiliateClicks()
    ])

    return {
      pageViews,
      users,
      topPages,
      realtimeUsers,
      affiliateClicks,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Error fetching all metrics:', error.message)
    return {
      pageViews: { today: 0, last7Days: 0, last30Days: 0 },
      users: { today: 0, last7Days: 0, last30Days: 0 },
      topPages: [],
      realtimeUsers: 0,
      affiliateClicks: [],
      timestamp: new Date().toISOString(),
      error: error.message
    }
  }
}

export const analyticsService = {
  getPageViews,
  getUsers,
  getTopPages,
  getRealtimeUsers,
  getAffiliateClicks,
  getAllMetrics
}
