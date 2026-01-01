/**
 * Carnivore Weekly Dashboard - Main Orchestration
 *
 * Initializes all dashboard modules and handles global state
 */

console.log('Dashboard initializing...')

// Global dashboard state
window.dashboard = {
  isInitialized: false,
  modules: {},
  lastUpdate: null,
  updateInterval: null
}

// Initialize dashboard on load
document.addEventListener('DOMContentLoaded', () => {
  initializeDashboard()
})

/**
 * Initialize dashboard
 */
async function initializeDashboard() {
  console.log('Starting dashboard initialization')

  try {
    // Update last update time
    updateLastUpdateTime()

    // Test API connection
    const healthResponse = await fetch('/api')
    if (!healthResponse.ok) {
      throw new Error('Cannot connect to API')
    }

    const apiInfo = await healthResponse.json()
    console.log('API connected:', apiInfo)

    // Initialize modules (placeholder for now)
    console.log('Dashboard ready!')
    window.dashboard.isInitialized = true

    // Show message
    showMessage('Dashboard ready!', 'info')

  } catch (error) {
    console.error('Dashboard initialization error:', error)
    showMessage('Dashboard initialization error: ' + error.message, 'error')
  }
}

/**
 * Update last update timestamp
 */
function updateLastUpdateTime() {
  const now = new Date()
  const timeString = now.toLocaleTimeString()
  const lastUpdateEl = document.getElementById('last-update')
  if (lastUpdateEl) {
    lastUpdateEl.textContent = `Last update: ${timeString}`
  }
}

/**
 * Show notification message
 */
function showMessage(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`)
  // Placeholder for toast notification
  // In full implementation, would show a toast UI element
}

/**
 * Refresh all dashboard data
 */
document.getElementById('refresh-all')?.addEventListener('click', async () => {
  console.log('Refreshing all dashboard data...')
  updateLastUpdateTime()
  // In full implementation, would refresh all modules
  showMessage('Dashboard data refreshed', 'success')
})

console.log('Dashboard script loaded')
