/**
 * GitHub API Service
 *
 * Provides GitHub workflow status and storage information
 * Uses Octokit (official GitHub SDK)
 *
 * Usage:
 *   import { githubService } from './services/github.js'
 *   const workflows = await githubService.getWorkflowStatus()
 */

import { Octokit } from '@octokit/rest'
import { logger } from '../lib/logger.js'
import { cache } from '../lib/cache.js'

const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_OWNER = 'mbrew'
const GITHUB_REPO = 'carnivore-weekly'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Initialize Octokit
const octokit = new Octokit(
  GITHUB_TOKEN ? { auth: GITHUB_TOKEN } : {}
)

export const githubService = {
  /**
   * Get recent GitHub workflow runs
   * Shows status of CI/CD pipeline (pass/fail)
   */
  getWorkflowStatus: async () => {
    try {
      logger.debug('Fetching GitHub workflow status')

      // Check cache first
      const cached = cache.get('github-workflows')
      if (cached) {
        logger.debug('Returning cached workflow status')
        return cached
      }

      // Get workflow runs
      const { data } = await octokit.actions.listWorkflowRuns({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        per_page: 10
      })

      const workflows = (data.workflow_runs || []).map(run => ({
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        runNumber: run.run_number,
        createdAt: run.created_at,
        updatedAt: run.updated_at,
        branch: run.head_branch,
        triggeredBy: run.event
      }))

      // Cache result
      cache.set('github-workflows', workflows, CACHE_TTL)

      return workflows
    } catch (error) {
      logger.error('Workflow status error:', error)
      return []
    }
  },

  /**
   * Get repository storage usage
   */
  getStorageUsage: async () => {
    try {
      logger.debug('Fetching GitHub storage usage')

      // Check cache first
      const cached = cache.get('github-storage')
      if (cached) {
        logger.debug('Returning cached storage usage')
        return cached
      }

      // Get repo size
      const { data } = await octokit.repos.get({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO
      })

      const sizeInMB = Math.round((data.size || 0) / 1024)
      const storageData = {
        repositorySize: sizeInMB,
        unit: 'MB',
        lastUpdated: new Date().toISOString()
      }

      // Cache result
      cache.set('github-storage', storageData, CACHE_TTL)

      return storageData
    } catch (error) {
      logger.error('Storage usage error:', error)
      return { repositorySize: 0, unit: 'MB', error: error.message }
    }
  },

  /**
   * Get recent commits
   */
  getRecentCommits: async (limit = 10) => {
    try {
      logger.debug(`Fetching ${limit} recent commits`)

      // Check cache first
      const cacheKey = `github-commits-${limit}`
      const cached = cache.get(cacheKey)
      if (cached) {
        logger.debug('Returning cached commits')
        return cached
      }

      const { data } = await octokit.repos.listCommits({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        per_page: limit
      })

      const commits = (data || []).map(commit => ({
        sha: commit.sha.substring(0, 7),
        message: commit.commit.message.split('\n')[0],
        author: commit.commit.author.name,
        date: commit.commit.author.date,
        htmlUrl: commit.html_url
      }))

      // Cache result
      cache.set(cacheKey, commits, CACHE_TTL)

      return commits
    } catch (error) {
      logger.error('Commits error:', error)
      return []
    }
  },

  /**
   * Get workflow run details
   */
  getWorkflowRunDetails: async (runId) => {
    try {
      logger.debug(`Fetching workflow run ${runId}`)

      const { data } = await octokit.actions.getWorkflowRun({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        run_id: runId
      })

      return {
        name: data.name,
        status: data.status,
        conclusion: data.conclusion,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        duration: data.run_number
      }
    } catch (error) {
      logger.error(`Workflow run error for ${runId}:`, error)
      return null
    }
  },

  /**
   * Clear cached data
   */
  clearCache: () => {
    cache.delete('github-workflows')
    cache.delete('github-storage')
    logger.info('GitHub cache cleared')
  }
}
