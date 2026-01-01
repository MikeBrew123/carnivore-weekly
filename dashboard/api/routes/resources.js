/**
 * Resource Usage API Route
 *
 * GET /api/resources - Track Claude API, GitHub, and Supabase usage
 *
 * Returns usage progress for:
 * - Claude API session time
 * - GitHub storage
 * - Supabase storage
 */

import express from 'express'
import { githubService } from '../../services/github.js'
import { logger } from '../../lib/logger.js'
import { tokenTracker } from '../../lib/token-tracker.js'

const router = express.Router()

// Track Claude usage in memory
let claudeUsageTracker = {
  startTime: Date.now(),
  requestCount: 0,
  estimatedTokens: 0
}

/**
 * GET /api/resources - Get resource usage
 */
router.get('/resources', async (req, res) => {
  try {
    logger.debug('Fetching resource usage')

    // Get GitHub storage
    const githubStorage = await githubService.getStorageUsage()

    // Calculate Claude session time
    const sessionHours = 8 // Max 8 hour session
    const elapsedMs = Date.now() - claudeUsageTracker.startTime
    const elapsedHours = elapsedMs / (1000 * 60 * 60)
    const remainingHours = Math.max(0, sessionHours - elapsedHours)
    const claudeUsagePercent = Math.round((elapsedHours / sessionHours) * 100)

    // Estimate Supabase usage
    const supabaseUsagePercent = 25 // Placeholder

    // Get token usage stats
    const tokenStats = tokenTracker.getStats()

    const resources = {
      timestamp: new Date().toISOString(),
      claude: {
        sessionTimeRemaining: formatHours(remainingHours),
        estimatedReset: new Date(Date.now() + remainingHours * 60 * 60 * 1000).toISOString(),
        usagePercent: claudeUsagePercent,
        requestCount: claudeUsageTracker.requestCount,
        tokens: {
          used: tokenStats.totalTokensUsed,
          messagesProcessed: tokenStats.messagesProcessed,
          averagePerMessage: tokenStats.averageTokensPerMessage,
          sessionStart: tokenStats.sessionStartTime
        }
      },
      github: {
        storageUsed: githubStorage.repositorySize ? `${githubStorage.repositorySize} MB` : '0 MB',
        storageLimit: '1 GB',
        usagePercent: githubStorage.repositorySize ? Math.round((githubStorage.repositorySize / 1024) * 100) : 0
      },
      supabase: {
        storageUsed: '125 MB',
        storageLimit: '500 MB',
        usagePercent: supabaseUsagePercent,
        databaseSize: '45 MB'
      }
    }

    res.json(resources)
  } catch (error) {
    logger.error('Resources error:', error)
    res.status(500).json({
      error: 'Failed to fetch resources',
      message: error.message
    })
  }
})

/**
 * Middleware to track Claude API usage
 */
export function trackClaudeUsage() {
  return (req, res, next) => {
    if (req.path.includes('/api/chat')) {
      claudeUsageTracker.requestCount++
      claudeUsageTracker.estimatedTokens += 500 // Estimate
    }
    next()
  }
}

function formatHours(hours) {
  const h = Math.floor(hours)
  const m = Math.floor((hours - h) * 60)
  return `${h}h ${m}m`
}

export default router
