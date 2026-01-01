/**
 * Claude API Service
 *
 * Wrapper for Claude API with context building
 * Handles chat conversations with project documentation context
 *
 * Usage:
 *   import { claudeService } from './services/claude.js'
 *   const reply = await claudeService.sendMessage(message, context, history)
 */

import Anthropic from '@anthropic-ai/sdk'
import { contextBuilder } from '../config/context-builder.js'
import { logger } from '../lib/logger.js'

let anthropic = null

function getAnthropicClient() {
  if (!anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set')
    }
    anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
  }
  return anthropic
}

export const claudeService = {
  /**
   * Send message to Claude with context
   */
  sendMessage: async (userMessage, contextType = 'general', conversationHistory = []) => {
    try {
      logger.debug(`Claude message (${contextType}):`, userMessage.substring(0, 50))

      // Build context
      let context = ''
      switch (contextType) {
        case 'quinn':
          context = await contextBuilder.buildQuinnContext()
          break
        case 'leo':
          context = await contextBuilder.buildLeoContext()
          break
        case 'skills':
          context = await contextBuilder.buildSkillsContext()
          break
        default:
          context = await contextBuilder.buildGeneralContext()
      }

      // Build messages array
      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: userMessage
        }
      ]

      // System prompt
      const systemPrompt = `You are a helpful assistant for the **Carnivore Weekly** project. Your role is to help the team understand project status, activities, and coordinate work.

## Response Guidelines
- Use **markdown formatting** for clarity:
  - Headers (##, ###) for sections
  - **Bold** for emphasis
  - Bullet points for lists
  - Code blocks for commands/data
- Keep language simple and avoid jargon
- When explaining technical concepts, break them down into easy-to-understand parts
- Be concise but thorough
- If you don't know something, say so honestly

## Project Context
${context}

## Formatting Examples
✅ Good: "## Status Update\n- Task A: Complete\n- Task B: In Progress"
✅ Good: "**Critical Issue**: The validation pipeline is..."
❌ Avoid: "The validation pipeline is having some issues with the following..."

Focus on clarity and readability above all else.`

      // Call Claude
      const client = getAnthropicClient()
      const response = await client.messages.create({
        model: 'claude-opus-4-5-20251101',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages
      })

      const reply = response.content[0].type === 'text' ? response.content[0].text : ''

      // Track token usage
      const inputTokens = response.usage?.input_tokens || 0
      const outputTokens = response.usage?.output_tokens || 0
      const totalTokens = inputTokens + outputTokens

      logger.debug('Claude response generated', reply.length, `Tokens: ${totalTokens}`)

      return {
        role: 'assistant',
        content: reply,
        contextType,
        timestamp: new Date().toISOString(),
        usage: {
          inputTokens,
          outputTokens,
          totalTokens
        }
      }
    } catch (error) {
      logger.error('Claude API error:', error)
      throw error
    }
  },

  /**
   * Simplify technical explanation
   */
  simplifyExplanation: (technicalText) => {
    // In production, could call Claude to rewrite in simpler language
    // For now, basic text processing
    return technicalText
      .replace(/database/gi, 'data storage')
      .replace(/API/gi, 'interface')
      .replace(/schema/gi, 'structure')
      .replace(/query/gi, 'question to the database')
  }
}
