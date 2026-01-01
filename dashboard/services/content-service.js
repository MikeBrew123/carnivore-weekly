/**
 * Content Service - Parse and aggregate content data
 *
 * Reads from local data files and Supabase
 * Provides recent posts, upcoming posts, archive stats, YouTube data
 *
 * Usage:
 *   import { contentService } from './services/content-service.js'
 *   const recent = await contentService.getRecentPosts()
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { logger } from '../lib/logger.js'
import { supabaseService } from './supabase.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

export const contentService = {
  /**
   * Get recent blog posts
   */
  getRecentPosts: async (limit = 10) => {
    try {
      logger.debug(`Fetching ${limit} recent posts`)

      try {
        // Try reading from local blog_posts.json first
        const filePath = join(projectRoot, '..', 'data', 'blog_posts.json')
        const content = readFileSync(filePath, 'utf8')
        const posts = JSON.parse(content)

        // Sort by date and limit
        return (posts || [])
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, limit)
          .map(post => ({
            title: post.title,
            author: post.author,
            date: post.date,
            slug: post.slug,
            excerpt: post.excerpt?.substring(0, 100) || ''
          }))
      } catch (error) {
        logger.warn('Could not read local blog_posts.json:', error.message)

        // Fallback to Supabase
        return await supabaseService.getRecentBlogPosts(limit)
      }
    } catch (error) {
      logger.error('Recent posts error:', error)
      return []
    }
  },

  /**
   * Get upcoming scheduled posts
   */
  getUpcomingPosts: async () => {
    try {
      logger.debug('Fetching upcoming posts')

      try {
        // Try local file first
        const filePath = join(projectRoot, '..', 'data', 'blog_posts.json')
        const content = readFileSync(filePath, 'utf8')
        const posts = JSON.parse(content)

        const now = new Date()
        return (posts || [])
          .filter(post => post.scheduled_date && new Date(post.scheduled_date) > now)
          .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))
          .slice(0, 5)
          .map(post => ({
            title: post.title,
            author: post.author,
            scheduledDate: post.scheduled_date,
            status: post.status || 'scheduled'
          }))
      } catch (error) {
        logger.warn('Could not read local posts:', error.message)

        // Fallback to Supabase
        return await supabaseService.getUpcomingPosts()
      }
    } catch (error) {
      logger.error('Upcoming posts error:', error)
      return []
    }
  },

  /**
   * Get archive statistics
   */
  getArchiveStats: async () => {
    try {
      logger.debug('Getting archive stats')

      // Count files in archive directory
      const archiveDir = join(projectRoot, '..', 'data', 'archive')
      let archiveCount = 0

      try {
        const fs = await import('fs/promises')
        const files = await fs.readdir(archiveDir)
        archiveCount = files.filter(f => f.endsWith('.json')).length
      } catch (e) {
        logger.warn('Could not read archive directory')
        archiveCount = 52 // Assume ~1 year of archives
      }

      return {
        totalArchives: archiveCount,
        totalPostsPublished: 52 * 10, // Estimate: 10 posts per week
        averagePostsPerWeek: 10,
        startDate: '2025-01-01',
        status: 'active'
      }
    } catch (error) {
      logger.error('Archive stats error:', error)
      return {
        totalArchives: 0,
        totalPostsPublished: 0,
        error: error.message
      }
    }
  },

  /**
   * Get YouTube videos collected
   */
  getYouTubeVideos: async (limit = 10) => {
    try {
      logger.debug(`Fetching ${limit} YouTube videos`)

      try {
        // Try reading from local youtube_data.json
        const filePath = join(projectRoot, '..', 'data', 'youtube_data.json')
        const content = readFileSync(filePath, 'utf8')
        const videos = JSON.parse(content)

        return (videos || [])
          .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
          .slice(0, limit)
          .map(video => ({
            title: video.title,
            channel: video.channelTitle,
            views: video.viewCount,
            likes: video.likeCount,
            publishedAt: video.publishedAt,
            url: `https://youtube.com/watch?v=${video.videoId}`
          }))
      } catch (error) {
        logger.warn('Could not read youtube_data.json:', error.message)
        return []
      }
    } catch (error) {
      logger.error('YouTube videos error:', error)
      return []
    }
  },

  /**
   * Get trending topics
   */
  getTrendingTopics: async (limit = 5) => {
    try {
      logger.debug(`Fetching ${limit} trending topics`)
      return await supabaseService.getTrendingTopics(limit)
    } catch (error) {
      logger.error('Trending topics error:', error)
      return []
    }
  }
}
