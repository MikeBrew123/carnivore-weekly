/**
 * Carnivore Weekly Dashboard - Express Server
 *
 * Main entry point for the local web-based dashboard
 * Serves frontend static files and API routes
 *
 * Start with: npm start
 * Access: http://localhost:3000
 */

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { logger } from './lib/logger.js'
import healthRouter from './api/routes/health.js'
import contentRouter from './api/routes/content.js'
import todosRouter from './api/routes/todos.js'
import resourcesRouter from './api/routes/resources.js'
import chatRouter from './api/routes/chat.js'
import leoRouter from './api/routes/leo.js'
import analyticsRouter from './api/routes/analytics.js'

// Get __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from parent directory
dotenv.config({ path: join(__dirname, '..', '.env') })

// Initialize Express app
const app = express()
const PORT = process.env.DASHBOARD_PORT || 3000
const HOST = '127.0.0.1' // Only localhost, not externally accessible

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')))

// Health check endpoint (for monitoring)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// API Routes
app.get('/api', (req, res) => {
  res.json({
    message: 'Carnivore Weekly Dashboard API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      content: '/api/content/*',
      todos: '/api/todos',
      resources: '/api/resources',
      chat: '/api/chat',
      leo: '/api/leo/*',
      analytics: '/api/analytics/summary'
    }
  })
})

// Register API route handlers - mount all at /api prefix
app.use('/api', healthRouter)
app.use('/api', contentRouter)
app.use('/api', todosRouter)
app.use('/api', resourcesRouter)
app.use('/api', chatRouter)
app.use('/api', leoRouter)
app.use('/api', analyticsRouter)

app.get('/api/content/recent', (req, res) => {
  res.json({ message: 'Content endpoint - coming soon' })
})

app.get('/api/todos', (req, res) => {
  res.json({ message: 'Todos endpoint - coming soon' })
})

app.get('/api/resources', (req, res) => {
  res.json({ message: 'Resources endpoint - coming soon' })
})

app.post('/api/chat', (req, res) => {
  res.json({ message: 'Chat endpoint - coming soon' })
})

app.get('/api/leo/health', (req, res) => {
  res.json({ message: 'Leo health endpoint - coming soon' })
})

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Express error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.path })
})

// Start server
app.listen(PORT, HOST, () => {
  logger.info(`Dashboard server running at http://${HOST}:${PORT}`)
  logger.info(`Press Ctrl+C to stop`)
})

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...')
  process.exit(0)
})
