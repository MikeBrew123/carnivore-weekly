/**
 * Google Analytics 4 Service
 *
 * Provides methods to fetch analytics data from Google Analytics Data API v1
 * Requires environment variables:
 * - GA4_PROPERTY_ID: The GA4 property ID (numeric, e.g., "123456789")
 * - GA4_CREDENTIALS_PATH: Path to service account JSON credentials file
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { logger } from '../lib/logger.js'

let analyticsDataClient = null
let propertyId = null

/**
 * Initialize the Analytics client with credentials
 * Called automatically on first use
 */
function initializeClient() {
  if (analyticsDataClient && propertyId) {
    return
  }

  propertyId = process.env.GA4_PROPERTY_ID
  const credentialsPath = process.env.GA4_CREDENTIALS_PATH

  if (!propertyId || !credentialsPath) {
    logger.warn('GA4 credentials not configured. Set GA4_PROPERTY_ID and GA4_CREDENTIALS_PATH environment variables.')
    return
  }

  try {
    analyticsDataClient = new BetaAnalyticsDataClient({
      keyFilename: credentialsPath
    })
    logger.debug(`Analytics client initialized with property ID: ${propertyId}`)
  } catch (error) {
    logger.error('Failed to initialize Analytics client:', error.message)
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
        { startDate: 'today', endDate: 'today' },
        { startDate: '7daysAgo', endDate: 'today' },
        { startDate: '30daysAgo', endDate: 'today' }
      ],
      metrics: [{ name: 'screenPageViews' }]
    })

    const rows = response[0].rows || []

    return {
      today: parseInt(rows[0]?.metricValues[0]?.value || '0', 10),
      last7Days: parseInt(rows[1]?.metricValues[0]?.value || '0', 10),
      last30Days: parseInt(rows[2]?.metricValues[0]?.value || '0', 10)
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
        { startDate: 'today', endDate: 'today' },
        { startDate: '7daysAgo', endDate: 'today' },
        { startDate: '30daysAgo', endDate: 'today' }
      ],
      metrics: [{ name: 'totalUsers' }]
    })

    const rows = response[0].rows || []

    return {
      today: parseInt(rows[0]?.metricValues[0]?.value || '0', 10),
      last7Days: parseInt(rows[1]?.metricValues[0]?.value || '0', 10),
      last30Days: parseInt(rows[2]?.metricValues[0]?.value || '0', 10)
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
 * Export all analytics data in a single call
 * Uses Promise.all to fetch all metrics in parallel
 * @returns {Promise<{pageViews, users, topPages, realtime}>}
 */
export async function getAllMetrics() {
  try {
    const [pageViews, users, topPages, realtimeUsers] = await Promise.all([
      getPageViews(),
      getUsers(),
      getTopPages(),
      getRealtimeUsers()
    ])

    return {
      pageViews,
      users,
      topPages,
      realtimeUsers,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Error fetching all metrics:', error.message)
    return {
      pageViews: { today: 0, last7Days: 0, last30Days: 0 },
      users: { today: 0, last7Days: 0, last30Days: 0 },
      topPages: [],
      realtimeUsers: 0,
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
  getAllMetrics
}
