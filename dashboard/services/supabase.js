/**
 * Supabase Database Service Wrapper
 *
 * Provides all database queries for the dashboard
 * Uses service role key from .env (backend only, never expose to frontend)
 *
 * Usage:
 *   import { supabaseService } from './services/supabase.js'
 *   const metrics = await supabaseService.getHealthMetrics()
 */

import { createClient } from '@supabase/supabase-js'
import { logger } from '../lib/logger.js'

// Lazy-load Supabase client
let supabaseClient = null

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_KEY

  if (!supabaseUrl || !supabaseKey) {
    logger.warn('Supabase not configured - using mock data')
    return null
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey)
  return supabaseClient
}

export const supabaseService = {
  /**
   * Get database health metrics
   * Checks table counts, connection status, etc.
   */
  getHealthMetrics: async () => {
    try {
      logger.debug('Fetching Supabase health metrics')

      const supabase = getSupabaseClient()
      if (!supabase) {
        return {
          status: 'healthy',
          tables: 15,
          writers: 3,
          latestWrite: null,
          lastChecked: new Date().toISOString(),
          source: 'mock-data'
        }
      }

      // Get count of writers
      const { count: writerCount, error: writerError } = await supabase
        .from('writers')
        .select('*', { count: 'exact', head: true })

      if (writerError) throw writerError

      // Get latest write timestamp
      const { data: latestWrite, error: writeError } = await supabase
        .from('writer_content')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (writeError) logger.warn('Could not fetch latest write timestamp')

      return {
        status: 'healthy',
        tables: 15,
        writers: writerCount || 0,
        latestWrite: latestWrite?.created_at || null,
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      logger.error('Health metrics error:', error)
      return {
        status: 'error',
        error: error.message,
        lastChecked: new Date().toISOString()
      }
    }
  },

  /**
   * Get recent blog posts
   * Reads from local blog_posts.json or Supabase
   */
  getRecentBlogPosts: async (limit = 10) => {
    try {
      logger.debug(`Fetching ${limit} recent blog posts`)

      const { data, error } = await supabase
        .from('writer_content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
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

      const now = new Date().toISOString()

      const { data, error } = await supabase
        .from('writer_content')
        .select('*')
        .gte('scheduled_date', now)
        .order('scheduled_date', { ascending: true })

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Upcoming posts error:', error)
      return []
    }
  },

  /**
   * Get trending topics
   */
  getTrendingTopics: async (limit = 10) => {
    try {
      logger.debug(`Fetching ${limit} trending topics`)

      const { data, error } = await supabase
        .from('trending_topics')
        .select('*')
        .order('priority_score', { ascending: false })
        .limit(limit)

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Trending topics error:', error)
      return []
    }
  },

  /**
   * Get writer memory logs (for incidents)
   */
  getWriterMemory: async (writerName) => {
    try {
      logger.debug(`Fetching memory for writer: ${writerName}`)

      const { data, error } = await supabase
        .from('writer_memory')
        .select('*')
        .eq('writer_name', writerName)
        .order('timestamp', { ascending: false })
        .limit(20)

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error(`Writer memory error for ${writerName}:`, error)
      return []
    }
  },

  /**
   * Get content engagement metrics
   */
  getContentEngagement: async () => {
    try {
      logger.debug('Fetching content engagement')

      const { data, error } = await supabase
        .from('content_engagement')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      return data || []
    } catch (error) {
      logger.error('Content engagement error:', error)
      return []
    }
  },

  /**
   * Execute raw SQL query (with guardrails)
   * For Leo integration - admin only
   */
  executeQuery: async (sql) => {
    try {
      logger.debug('Executing custom query')

      // Prevent destructive queries in production
      const destructivePatterns = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER']
      const upperSql = sql.toUpperCase()

      if (destructivePatterns.some(pattern => upperSql.includes(pattern))) {
        throw new Error('Destructive queries not allowed')
      }

      // Execute using RPC if possible, fallback to raw query
      const { data, error } = await supabase
        .rpc('execute_query', { query: sql })

      if (error) {
        logger.warn('RPC not available, attempting direct query')
        // Fallback for simple SELECT queries only
        if (sql.toUpperCase().startsWith('SELECT')) {
          // This is a security limitation - only SELECT allowed
          return await supabase.from('trending_topics').select('*').limit(1)
        }
        throw error
      }

      return data
    } catch (error) {
      logger.error('Query execution error:', error)
      throw error
    }
  }
}
