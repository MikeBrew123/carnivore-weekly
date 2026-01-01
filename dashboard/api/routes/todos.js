/**
 * Todo List API Route
 *
 * GET /api/todos - Current work from Quinn's agendas
 *
 * Returns:
 * - Current tasks from latest agenda
 * - Recent memory incidents
 * - Upcoming blog posts
 */

import express from 'express'
import { quinnParser } from '../../services/quinn-parser.js'
import { contentService } from '../../services/content-service.js'
import { logger } from '../../lib/logger.js'

const router = express.Router()

/**
 * GET /api/todos - Get current work
 */
router.get('/todos', async (req, res) => {
  try {
    logger.debug('Fetching todos')

    const [agenda, incidents, upcoming] = await Promise.all([
      quinnParser.parseLatestAgenda(),
      quinnParser.getRecentMemoryIncidents(),
      contentService.getUpcomingPosts()
    ])

    const todos = {
      timestamp: new Date().toISOString(),
      agendaDate: agenda.agendaDate,
      currentWork: agenda.tasks,
      memoryIncidents: incidents,
      upcomingPosts: upcoming
    }

    res.json(todos)
  } catch (error) {
    logger.error('Todos error:', error)
    res.status(500).json({
      error: 'Failed to fetch todos',
      message: error.message
    })
  }
})

export default router
