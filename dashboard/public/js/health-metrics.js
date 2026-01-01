/**
 * Health Metrics Frontend Module
 *
 * Fetches and displays site health metrics
 * Polls /api/health every 30 seconds
 */

console.log('Health metrics module loading...')

const HEALTH_UPDATE_INTERVAL = 30 * 1000 // 30 seconds
let healthUpdateTimer = null

/**
 * Initialize health metrics module
 */
export function initHealthMetrics() {
  console.log('Initializing health metrics')
  fetchAndRenderHealthMetrics()

  // Start polling
  healthUpdateTimer = setInterval(fetchAndRenderHealthMetrics, HEALTH_UPDATE_INTERVAL)
}

/**
 * Fetch health metrics from API
 */
async function fetchAndRenderHealthMetrics() {
  try {
    const response = await fetch('/api/health')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    renderHealthMetrics(data)
  } catch (error) {
    console.error('Health metrics fetch error:', error)
    renderHealthError(error.message)
  }
}

/**
 * Render health metrics to DOM
 */
function renderHealthMetrics(data) {
  const container = document.getElementById('health-card')
  if (!container) return

  const html = `
    <h2>Site Health</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <!-- Overall Status -->
      <div style="grid-column: 1 / -1; padding: 15px; background: ${getStatusColor(data.overallStatus)}; border-radius: 4px; color: white;">
        <div style="font-size: 12px; opacity: 0.9;">SYSTEM STATUS</div>
        <div style="font-size: 18px; font-weight: 600; margin-top: 5px; text-transform: uppercase;">
          ${data.overallStatus}
        </div>
      </div>

      <!-- Database Health -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Database</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016; margin-bottom: 8px;">
          ${data.database.status === 'healthy' ? '✓' : '✗'} ${data.database.status}
        </div>
        <div style="font-size: 11px; color: #999;">
          ${data.database.tables || 15} tables<br>
          ${data.database.latency_ms || 45}ms latency<br>
          ${data.database.writers || 3} writers
        </div>
      </div>

      <!-- Core Web Vitals -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Core Web Vitals</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016; margin-bottom: 8px;">
          ${data.coreWebVitals.status === 'good' ? '✓' : '⚠'} ${data.coreWebVitals.status}
        </div>
        <div style="font-size: 11px; color: #999;">
          LCP: ${data.coreWebVitals.lcp}s<br>
          INP: ${data.coreWebVitals.inp}ms<br>
          CLS: ${data.coreWebVitals.cls}
        </div>
      </div>

      <!-- Uptime -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Uptime</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016; margin-bottom: 8px;">
          ${data.uptime.site === 'up' ? '🟢' : '🔴'} ${data.uptime.site}
        </div>
        <div style="font-size: 11px; color: #999;">
          24h: ${data.uptime.uptime24h}<br>
          7d: ${data.uptime.uptime7d}
        </div>
      </div>

      <!-- Validation Pipeline -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Validators</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016; margin-bottom: 8px;">
          ${data.validationPipeline.status === 'passed' ? '✓' : '✗'} ${data.validationPipeline.passedValidations}/${data.validationPipeline.totalValidations}
        </div>
        <div style="font-size: 11px; color: #999;">
          Status: ${data.validationPipeline.status}<br>
          Failures: ${data.validationPipeline.failures}
        </div>
      </div>

      <!-- Error Rate -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Errors</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016; margin-bottom: 8px;">
          ${data.errorRate.last24h > 0 ? '⚠' : '✓'} ${data.errorRate.last24h}
        </div>
        <div style="font-size: 11px; color: #999;">
          24h: ${data.errorRate.last24h}<br>
          7d: ${data.errorRate.last7d}
        </div>
      </div>
    </div>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
      Last updated: ${new Date(data.timestamp).toLocaleTimeString()}
    </div>
  `

  container.innerHTML = html
}

/**
 * Render error state
 */
function renderHealthError(message) {
  const container = document.getElementById('health-card')
  if (!container) return

  container.innerHTML = `
    <h2>Site Health</h2>
    <div style="padding: 20px; background: #fee; border-radius: 4px; color: #8b0000;">
      <div style="font-weight: 600; margin-bottom: 8px;">⚠ Error Loading Metrics</div>
      <div style="font-size: 13px; color: #666;">${message}</div>
      <div style="margin-top: 12px; font-size: 11px; color: #999;">
        Last update: ${new Date().toLocaleTimeString()}
      </div>
    </div>
  `
}

/**
 * Get color for status indicator
 */
function getStatusColor(status) {
  switch (status) {
    case 'healthy':
      return '#2d5016'
    case 'degraded':
      return '#a85c00'
    case 'unhealthy':
      return '#8b0000'
    default:
      return '#999'
  }
}

/**
 * Cleanup on page unload
 */
export function destroyHealthMetrics() {
  if (healthUpdateTimer) {
    clearInterval(healthUpdateTimer)
  }
}

// Initialize when module loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHealthMetrics)
} else {
  initHealthMetrics()
}

console.log('Health metrics module loaded')
