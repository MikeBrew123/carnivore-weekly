/**
 * OAuth Authentication Routes
 *
 * GET /auth/login - Redirect user to Google OAuth login
 * GET /auth/callback - Handle OAuth callback and store token
 * GET /auth/status - Check authentication status
 */

import express from 'express'
import { getAuthorizationUrl, exchangeCodeForToken, isAuthenticated } from '../../lib/oauth-auth.js'
import { logger } from '../../lib/logger.js'

const router = express.Router()

/**
 * GET /auth/login - Redirect to Google OAuth consent screen
 */
router.get('/auth/login', (req, res) => {
  try {
    const authUrl = getAuthorizationUrl()
    logger.info('Redirecting user to OAuth login')
    res.redirect(authUrl)
  } catch (error) {
    logger.error('OAuth login error:', error.message)
    res.status(500).json({ error: 'Failed to initiate OAuth login' })
  }
})

/**
 * GET /auth/callback - Handle OAuth callback
 */
router.get('/auth/callback', async (req, res) => {
  try {
    const { code, error } = req.query

    if (error) {
      logger.error('OAuth error:', error)
      return res.status(400).json({ error: `OAuth error: ${error}` })
    }

    if (!code) {
      return res.status(400).json({ error: 'No authorization code provided' })
    }

    // Exchange code for token
    const success = await exchangeCodeForToken(code)

    if (success) {
      logger.info('Successfully authenticated with Google Analytics')
      res.json({
        message: 'Authentication successful!',
        status: 'authenticated',
        redirectUrl: 'http://localhost:3000'
      })
    } else {
      res.status(400).json({ error: 'Failed to authenticate' })
    }
  } catch (error) {
    logger.error('OAuth callback error:', error.message)
    res.status(500).json({ error: 'OAuth callback error' })
  }
})

/**
 * GET /auth/status - Check if user is authenticated
 */
router.get('/auth/status', (req, res) => {
  const authenticated = isAuthenticated()
  res.json({
    authenticated,
    message: authenticated ? 'User is authenticated' : 'User must authenticate'
  })
})

export default router
