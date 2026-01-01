/**
 * Leo Integration API Routes
 *
 * GET /api/leo/health - Run Leo health check
 * GET /api/leo/verify - Verify writer system
 * GET /api/leo/report - Performance report
 */

import express from 'express'
import { leoService } from '../../services/leo-service.js'
import { logger } from '../../lib/logger.js'

const router = express.Router()

/**
 * GET /api/leo/health - Run health check
 */
router.get('/leo/health', async (req, res) => {
  try {
    logger.debug('Leo health check request')
    const health = await leoService.runHealthCheck()
    res.json(health)
  } catch (error) {
    logger.error('Leo health error:', error)
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    })
  }
})

/**
 * GET /api/leo/verify - Verify writers
 */
router.get('/leo/verify', async (req, res) => {
  try {
    logger.debug('Leo verify writers request')
    const verify = await leoService.runVerifyWriters()
    res.json(verify)
  } catch (error) {
    logger.error('Leo verify error:', error)
    res.status(500).json({
      error: 'Writer verification failed',
      message: error.message
    })
  }
})

/**
 * GET /api/leo/report - Generate report
 */
router.get('/leo/report', async (req, res) => {
  try {
    logger.debug('Leo report request')
    const report = await leoService.runReport()
    res.json(report)
  } catch (error) {
    logger.error('Leo report error:', error)
    res.status(500).json({
      error: 'Report generation failed',
      message: error.message
    })
  }
})

export default router
