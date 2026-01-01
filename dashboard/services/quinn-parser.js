/**
 * Quinn Parser - Parse Quinn's Agendas and Memory Logs
 *
 * Reads Quinn's daily agendas and agent memory logs to extract:
 * - Current tasks from agents
 * - Deadlines and status
 * - Recent incidents/blockers
 *
 * Usage:
 *   import { quinnParser } from './services/quinn-parser.js'
 *   const agenda = await quinnParser.parseLatestAgenda()
 */

import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { logger } from '../lib/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')

export const quinnParser = {
  /**
   * Parse latest daily agenda
   */
  parseLatestAgenda: async () => {
    try {
      logger.debug('Parsing latest agenda')

      const agendaDir = join(projectRoot, '..', 'agents', 'daily_logs')
      const files = readdirSync(agendaDir)
        .filter(f => f.endsWith('_AGENDA.md'))
        .sort()
        .reverse()

      if (files.length === 0) {
        logger.warn('No agenda files found')
        return generateMockAgenda()
      }

      const latestFile = files[0]
      const filePath = join(agendaDir, latestFile)
      const content = readFileSync(filePath, 'utf8')

      return parseAgendaContent(content, latestFile)
    } catch (error) {
      logger.error('Parse latest agenda error:', error)
      return generateMockAgenda()
    }
  },

  /**
   * Get recent agent memory incidents
   */
  getRecentMemoryIncidents: async () => {
    try {
      logger.debug('Fetching memory incidents')

      const memoryDir = join(projectRoot, '..', 'agents', 'memory')
      const incidents = []

      try {
        const files = readdirSync(memoryDir).filter(f => f.endsWith('_memory.log'))

        for (const file of files) {
          const filePath = join(memoryDir, file)
          const content = readFileSync(filePath, 'utf8')
          const lines = content.split('\n').filter(l => l.trim())

          if (lines.length > 0) {
            const agentName = file.replace('_memory.log', '')
            // Get last 3 incidents
            const recentLines = lines.slice(-3)
            incidents.push({
              agent: agentName,
              incidents: parseIncidents(recentLines)
            })
          }
        }
      } catch (e) {
        logger.warn('Could not read memory logs:', e.message)
      }

      return incidents.length > 0 ? incidents : generateMockIncidents()
    } catch (error) {
      logger.error('Memory incidents error:', error)
      return generateMockIncidents()
    }
  }
}

/**
 * Parse agenda markdown content
 */
function parseAgendaContent(content, filename) {
  const tasks = []
  const lines = content.split('\n')
  let currentAgent = null
  let currentTask = {}

  for (const line of lines) {
    // Match agent section headers like "### Sarah (Health Coach)"
    const agentMatch = line.match(/^###\s+(\w+)\s*\(([^)]+)\)/)
    if (agentMatch) {
      if (currentTask.agent) tasks.push(currentTask)
      currentAgent = agentMatch[1]
      currentTask = {
        agent: currentAgent,
        role: agentMatch[2],
        task: '',
        deadline: '',
        status: 'ON_TRACK',
        blocker: null
      }
      continue
    }

    // Parse task properties
    if (line.includes('**Priority Task:**')) {
      currentTask.task = line.split('**Priority Task:**')[1]?.trim() || ''
    } else if (line.includes('**Deadline:**')) {
      currentTask.deadline = line.split('**Deadline:**')[1]?.trim() || ''
    } else if (line.includes('**Status:**')) {
      const status = line.split('**Status:**')[1]?.trim() || ''
      currentTask.status = status.includes('TRACK') ? 'ON_TRACK' : status.includes('RISK') ? 'AT_RISK' : 'BLOCKED'
    } else if (line.includes('**Blockers:**') || line.includes('**Blocker:**')) {
      const blocker = line.split('**Blockers?:**')[1]?.trim() || ''
      currentTask.blocker = blocker !== 'None' ? blocker : null
    }
  }

  if (currentTask.agent) tasks.push(currentTask)

  return {
    date: extractDate(filename),
    agendaDate: filename,
    tasks: tasks.length > 0 ? tasks : generateMockTasks(),
    source: 'parsed-agenda'
  }
}

/**
 * Extract date from filename
 */
function extractDate(filename) {
  const match = filename.match(/(\d{4}-\d{2}-\d{2})/)
  return match ? match[1] : new Date().toISOString().split('T')[0]
}

/**
 * Parse incident lines from memory log
 */
function parseIncidents(lines) {
  return lines.map((line, idx) => ({
    id: idx,
    timestamp: new Date().toISOString(),
    severity: line.includes('ERROR') ? 'HIGH' : 'MEDIUM',
    message: line.substring(0, 100),
    status: 'Logged'
  }))
}

/**
 * Generate mock agenda for development
 */
function generateMockAgenda() {
  return {
    date: new Date().toISOString().split('T')[0],
    agendaDate: `${new Date().toISOString().split('T')[0]}_AGENDA.md`,
    tasks: generateMockTasks(),
    source: 'mock-data'
  }
}

/**
 * Generate mock tasks
 */
function generateMockTasks() {
  return [
    {
      agent: 'Sarah',
      role: 'Health Coach',
      task: 'Write PCOS & Hormones deep dive',
      deadline: 'Jan 8',
      status: 'ON_TRACK',
      blocker: null
    },
    {
      agent: 'Marcus',
      role: 'Sales & Performance',
      task: 'Analyze engagement metrics',
      deadline: 'Jan 5',
      status: 'ON_TRACK',
      blocker: null
    },
    {
      agent: 'Chloe',
      role: 'Marketing & Community',
      task: 'Create social media calendar',
      deadline: 'Jan 7',
      status: 'AT_RISK',
      blocker: 'Waiting for trend analysis'
    }
  ]
}

/**
 * Generate mock incidents
 */
function generateMockIncidents() {
  return [
    {
      agent: 'Sarah',
      incidents: [
        { id: 0, timestamp: new Date().toISOString(), severity: 'MEDIUM', message: 'Em-dash overuse detected', status: 'Fixed' }
      ]
    }
  ]
}
