/**
 * Analytics API Routes
 *
 * GET /api/analytics/summary - Get all analytics metrics in one call
 * GET /api/analytics/realtime - Get real-time active users
 * GET /api/analytics/top-pages - Get top 10 performing pages
 */

import express from 'express'
import { analyticsService } from '../../services/analytics.js'
import { logger } from '../../lib/logger.js'

const router = express.Router()

/**
 * GET /api/analytics/summary
 * Returns all analytics metrics combined
 * Includes: page views, users, top pages, and real-time active users
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    logger.debug('Fetching analytics summary')

    const data = await analyticsService.getAllMetrics()

    res.json({
      timestamp: data.timestamp,
      pageViews: data.pageViews,
      users: data.users,
      topPages: data.topPages,
      realtime: {
        activeUsers: data.realtimeUsers
      },
      affiliateClicks: data.affiliateClicks || [],
      error: data.error || null
    })
  } catch (error) {
    logger.error('Analytics summary error:', error)
    res.status(500).json({
      error: 'Failed to fetch analytics summary',
      message: error.message
    })
  }
})

/**
 * GET /api/analytics/realtime
 * Returns real-time active user count
 */
router.get('/analytics/realtime', async (req, res) => {
  try {
    logger.debug('Fetching real-time active users')

    const activeUsers = await analyticsService.getRealtimeUsers()

    res.json({
      timestamp: new Date().toISOString(),
      activeUsers
    })
  } catch (error) {
    logger.error('Analytics realtime error:', error)
    res.status(500).json({
      error: 'Failed to fetch real-time data',
      message: error.message
    })
  }
})

/**
 * GET /api/analytics/top-pages
 * Returns top 10 performing pages
 * Query parameter: days (default: 7) - number of days to look back
 */
router.get('/analytics/top-pages', async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days || '7', 10), 90) // Max 90 days

    logger.debug(`Fetching top pages for last ${days} days`)

    const topPages = await analyticsService.getTopPages(days)

    res.json({
      timestamp: new Date().toISOString(),
      days,
      topPages
    })
  } catch (error) {
    logger.error('Analytics top pages error:', error)
    res.status(500).json({
      error: 'Failed to fetch top pages',
      message: error.message
    })
  }
})

/**
 * GET /api/analytics/health
 * Check if analytics service is properly configured
 */
router.get('/analytics/health', (req, res) => {
  const propertyId = process.env.GA4_PROPERTY_ID
  const credentialsPath = process.env.GA4_CREDENTIALS_PATH

  const isConfigured = !!(propertyId && credentialsPath)

  res.json({
    status: isConfigured ? 'configured' : 'not-configured',
    propertyId: propertyId ? 'set' : 'missing',
    credentialsPath: credentialsPath ? 'set' : 'missing',
    message: !isConfigured ? 'Set GA4_PROPERTY_ID and GA4_CREDENTIALS_PATH environment variables' : 'Ready'
  })
})

export default router
