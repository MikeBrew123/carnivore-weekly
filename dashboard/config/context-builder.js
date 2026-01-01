/**
 * Context Builder for Claude Chat
 *
 * Builds context from project documentation
 * Supports: Quinn, Leo, General, and Skills contexts
 *
 * Usage:
 *   import { contextBuilder } from './config/context-builder.js'
 *   const context = await contextBuilder.buildQuinnContext()
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { execSync } from 'child_process'
import { logger } from '../lib/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

/**
 * Get entries from last N hours from a log file
 */
function getRecentEntries(content, hours = 3) {
  const now = new Date()
  const cutoffTime = new Date(now - hours * 60 * 60 * 1000)

  const entries = []
  const lines = content.split('\n')

  for (const line of lines) {
    // Look for timestamp patterns like [2025-12-31 14:45:00]
    const match = line.match(/\[(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\]/)
    if (match) {
      try {
        const entryTime = new Date(match[1])
        if (entryTime >= cutoffTime) {
          entries.push(line)
        }
      } catch (e) {
        // Skip lines with unparseable timestamps
      }
    }
  }

  return entries
}

/**
 * Get the latest agenda file
 */
function getLatestAgenda() {
  try {
    const logsDir = join(projectRoot, '..', 'agents', 'daily_logs')
    const files = readdirSync(logsDir).filter(f => f.endsWith('.md'))
    if (files.length === 0) return null

    // Sort by filename (YYYY-MM-DD format) in descending order
    files.sort().reverse()
    return readFileSync(join(logsDir, files[0]), 'utf8')
  } catch (e) {
    logger.warn('Could not read latest agenda:', e.message)
    return null
  }
}

/**
 * Get recent git commits
 */
function getRecentCommits(hours = 3) {
  try {
    const projectDir = join(projectRoot, '..')
    const output = execSync(`cd "${projectDir}" && git log --since="${hours} hours ago" --format="%h %s (%an, %ar)" 2>/dev/null || echo "No commits"`, {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    })
    return output.trim()
  } catch (e) {
    logger.warn('Could not read git commits:', e.message)
    return null
  }
}

export const contextBuilder = {
  /**
   * Build Quinn context with recent activity
   */
  buildQuinnContext: async () => {
    try {
      logger.debug('Building Quinn context')

      let protocols = 'Quinn is the Record Keeper & Operating System.'
      let agenda = 'Daily agenda not available'
      let recentActivity = 'No recent activity'

      try {
        protocols = readFileSync(join(projectRoot, '..', 'agents', 'PROTOCOLS.md'), 'utf8')
      } catch (e) {
        logger.warn('Could not read PROTOCOLS.md')
      }

      // Get latest agenda
      const agendaContent = getLatestAgenda()
      if (agendaContent) {
        agenda = agendaContent.substring(0, 1000)
      }

      // Get recent memory log entries (last 3 hours, or most recent if none in last 3 hours)
      try {
        const memoryDir = join(projectRoot, '..', 'agents', 'memory')
        const memoryFiles = readdirSync(memoryDir).filter(f => f.endsWith('.log'))
        const allRecentEntries = []
        const allEntries = []

        for (const file of memoryFiles) {
          try {
            const content = readFileSync(join(memoryDir, file), 'utf8')
            const entries = getRecentEntries(content, 3)
            allRecentEntries.push(...entries)
            // Also collect all timestamped entries for fallback
            allEntries.push(...content.split('\n').filter(line => /\[\d{4}-\d{2}-\d{2}/.test(line)))
          } catch (e) {
            // Skip files that can't be read
          }
        }

        if (allRecentEntries.length > 0) {
          recentActivity = '**Activity (Last 3 Hours):**\n' + allRecentEntries.slice(-10).join('\n')
        } else if (allEntries.length > 0) {
          // If no activity in last 3 hours, show most recent activity
          recentActivity = '**Most Recent Activity:**\n' + allEntries.slice(-5).join('\n')
        }
      } catch (e) {
        logger.warn('Could not read memory logs')
      }

      // Get recent git commits
      let recentCommits = 'No recent commits'
      const commits = getRecentCommits(3)
      if (commits && commits !== 'No commits') {
        recentCommits = commits
      }

      return `
Quinn Documentation & Activity
==============================

**Role:** Record Keeper & Operating System
**Status:** ON DUTY

## Protocols & Rules:
${protocols.substring(0, 400)}...

## Today's Agenda:
${agenda}

## Recent Activity (Last 3 Hours):
${recentActivity}

## Recent Code Changes (Last 3 Hours):
\`\`\`
${recentCommits}
\`\`\`

Quinn is the operational backbone of the team. She maintains all agent memory logs, enforces validation protocols, and manages daily workflows. The Validation Law must be enforced at all times - no exceptions.
`
    } catch (error) {
      logger.error('Build Quinn context error:', error)
      return 'Quinn is the Record Keeper and Operating System of Carnivore Weekly.'
    }
  },

  /**
   * Build Leo context
   */
  buildLeoContext: async () => {
    try {
      logger.debug('Building Leo context')

      let blueprint = 'Leo manages the Supabase database.'

      try {
        blueprint = readFileSync(join(projectRoot, '..', 'LEO_DATABASE_BLUEPRINT.md'), 'utf8')
      } catch (e) {
        logger.warn('Could not read database blueprint')
      }

      return `
Leo Database Documentation
==========================

Leo is the Database Architect and Supabase Specialist.

Database Overview:
${blueprint.substring(0, 500)}...

Key Tables:
- writers: Agent writer profiles
- writer_content: Blog posts and content
- trending_topics: Trending topics with scores
- content_engagement: User engagement metrics
- writer_memory: Agent memory logs

Leo's Role:
- Design database schema
- Optimize queries (<50ms target)
- Manage Edge Functions
- Enforce RLS security policies
`
    } catch (error) {
      logger.error('Build Leo context error:', error)
      return 'Leo is the Database Architect managing Supabase PostgreSQL.'
    }
  },

  /**
   * Build general project context
   */
  buildGeneralContext: async () => {
    return `
Carnivore Weekly Project Overview
=================================

Project: Automated content curation for carnivore diet information

Technology Stack:
- Python 3.9+ for data collection and analysis
- Node.js for server and edge functions
- Supabase PostgreSQL for data storage
- Claude AI for content analysis and generation
- GitHub Actions for CI/CD automation
- GitHub Pages for static site hosting

Key Components:
1. Dashboard (local): This interface you're using
2. Main Site: carnivoreweekly.com (GitHub Pages)
3. Database: Supabase PostgreSQL with pgvector
4. AI Agents: 10 agents managing content workflow
5. Automation: YouTube collection, sentiment analysis, content generation

Goal: Provide comprehensive, accurate carnivore diet information curated by AI agents.
`
  },

  /**
   * Build skills context
   */
  buildSkillsContext: async () => {
    return `
Team Skills & Capabilities
===========================

Agent Skills:
- Sarah: Deep dive writing, health coaching perspective
- Marcus: Performance analytics, sales-focused content
- Chloe: Community engagement, trend identification
- Jordan: Quality assurance, validation expertise
- Quinn: Operations, protocol enforcement, documentation
- Leo: Database architecture, query optimization
- Casey: Design and UX
- Sam: SEO optimization
- Eric: Analytics and reporting
- Alex: Development and tooling

System Skills:
- 11-validator validation pipeline
- Real-time content engagement tracking
- Semantic search with pgvector
- Automated screenshot comparison
- Performance monitoring with Core Web Vitals
- AI detection prevention
`
  },

  /**
   * Auto-detect context type from message
   */
  detectContextType: (message) => {
    const lower = message.toLowerCase()

    if (lower.includes('quinn') || lower.includes('agenda') || lower.includes('protocol') ||
        lower.includes('what have we done') || lower.includes('recent activity') ||
        lower.includes('last 3 hours') || lower.includes('what happened') ||
        lower.includes('activity') || lower.includes('memory') ||
        lower.includes('error') || lower.includes('fix') || lower.includes('bug') ||
        lower.includes('issue') || lower.includes('commit') || lower.includes('changes')) {
      return 'quinn'
    }
    if (lower.includes('leo') || lower.includes('database') || lower.includes('sql') ||
        lower.includes('tables') || lower.includes('queries')) {
      return 'leo'
    }
    if (lower.includes('skill') || lower.includes('agent') || lower.includes('validation') ||
        lower.includes('sarah') || lower.includes('marcus') || lower.includes('jordan')) {
      return 'skills'
    }
    return 'general'
  }
}
