/**
 * Content Metrics API Routes
 *
 * GET /api/content/recent - Recent blog posts
 * GET /api/content/upcoming - Scheduled posts
 * GET /api/content/archive-stats - Archive statistics
 * GET /api/content/youtube - YouTube videos
 */

import express from 'express'
import { contentService } from '../../services/content-service.js'
import { logger } from '../../lib/logger.js'

const router = express.Router()

/**
 * GET /api/content/recent - Recent blog posts
 */
router.get('/content/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    logger.debug(`Fetching recent posts (limit: ${limit})`)

    const posts = await contentService.getRecentPosts(limit)
    res.json({
      data: posts,
      count: posts.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Recent posts error:', error)
    res.status(500).json({
      error: 'Failed to fetch recent posts',
      message: error.message
    })
  }
})

/**
 * GET /api/content/upcoming - Upcoming scheduled posts
 */
router.get('/content/upcoming', async (req, res) => {
  try {
    logger.debug('Fetching upcoming posts')

    const posts = await contentService.getUpcomingPosts()
    res.json({
      data: posts,
      count: posts.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Upcoming posts error:', error)
    res.status(500).json({
      error: 'Failed to fetch upcoming posts',
      message: error.message
    })
  }
})

/**
 * GET /api/content/archive-stats - Archive statistics
 */
router.get('/content/archive-stats', async (req, res) => {
  try {
    logger.debug('Fetching archive stats')

    const stats = await contentService.getArchiveStats()
    res.json({
      data: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Archive stats error:', error)
    res.status(500).json({
      error: 'Failed to fetch archive stats',
      message: error.message
    })
  }
})

/**
 * GET /api/content/youtube - YouTube videos collected
 */
router.get('/content/youtube', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10
    logger.debug(`Fetching YouTube videos (limit: ${limit})`)

    const videos = await contentService.getYouTubeVideos(limit)
    res.json({
      data: videos,
      count: videos.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('YouTube videos error:', error)
    res.status(500).json({
      error: 'Failed to fetch YouTube videos',
      message: error.message
    })
  }
})

/**
 * GET /api/content - Content overview
 */
router.get('/content', async (req, res) => {
  try {
    logger.debug('Fetching content overview')

    const [recent, upcoming, archive, youtube] = await Promise.all([
      contentService.getRecentPosts(5),
      contentService.getUpcomingPosts(),
      contentService.getArchiveStats(),
      contentService.getYouTubeVideos(5)
    ])

    res.json({
      data: {
        recentPosts: recent,
        upcomingPosts: upcoming,
        archiveStats: archive,
        youtubeVideos: youtube
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Content overview error:', error)
    res.status(500).json({
      error: 'Failed to fetch content overview',
      message: error.message
    })
  }
})

export default router
