/**
 * Chat API Route
 *
 * POST /api/chat - Send chat message and get Claude response
 *
 * Request body:
 * {
 *   message: "user message",
 *   conversationId: "optional-uuid",
 *   contextType: "quinn|leo|general|skills" (optional, auto-detected)
 * }
 */

import express from 'express'
import { claudeService } from '../../services/claude.js'
import { contextBuilder } from '../../config/context-builder.js'
import { logger } from '../../lib/logger.js'

const router = express.Router()

// Store conversations in memory (reset on server restart)
const conversations = new Map()
const MAX_HISTORY = 10

// Track token usage across all chat sessions
export const tokenTracker = {
  totalTokensUsed: 0,
  messagesProcessed: 0,
  startTime: new Date(),
  getStats: function() {
    return {
      totalTokensUsed: this.totalTokensUsed,
      messagesProcessed: this.messagesProcessed,
      averageTokensPerMessage: this.messagesProcessed > 0 ? Math.round(this.totalTokensUsed / this.messagesProcessed) : 0,
      sessionStartTime: this.startTime.toISOString()
    }
  },
  addTokens: function(tokens) {
    this.totalTokensUsed += tokens
    this.messagesProcessed++
  }
}

/**
 * POST /api/chat - Send message
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId, contextType: userContextType } = req.body

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message required' })
    }

    logger.debug(`Chat message: ${message.substring(0, 50)}`)

    // Generate or use provided conversation ID
    const convId = conversationId || generateId()

    // Get or create conversation history
    let history = conversations.get(convId) || []

    // Auto-detect context if not provided
    const contextType = userContextType || contextBuilder.detectContextType(message)

    // Get Claude response
    const response = await claudeService.sendMessage(message, contextType, history)

    // Add to history
    history.push({ role: 'user', content: message })
    history.push(response)

    // Trim history to MAX_HISTORY
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY)
    }

    // Store updated conversation
    conversations.set(convId, history)

    res.json({
      conversationId: convId,
      reply: response.content,
      contextType,
      timestamp: response.timestamp
    })
  } catch (error) {
    logger.error('Chat error:', error)
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.message
    })
  }
})

/**
 * GET /api/chat/:conversationId - Get conversation history
 */
router.get('/chat/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params
    const history = conversations.get(conversationId) || []

    res.json({
      conversationId,
      history,
      messageCount: history.length
    })
  } catch (error) {
    logger.error('Get conversation error:', error)
    res.status(500).json({
      error: 'Failed to retrieve conversation',
      message: error.message
    })
  }
})

/**
 * DELETE /api/chat/:conversationId - Clear conversation
 */
router.delete('/api/chat/:conversationId', (req, res) => {
  try {
    const { conversationId } = req.params
    conversations.delete(conversationId)

    res.json({
      conversationId,
      message: 'Conversation cleared'
    })
  } catch (error) {
    logger.error('Clear conversation error:', error)
    res.status(500).json({
      error: 'Failed to clear conversation',
      message: error.message
    })
  }
})

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export default router
