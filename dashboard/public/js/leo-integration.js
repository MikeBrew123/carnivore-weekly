/**
 * Leo Integration Frontend Module
 *
 * Displays Leo database health and operations
 */

console.log('Leo integration module loading...')

const LEO_UPDATE_INTERVAL = 30 * 1000 // 30 seconds
let leoUpdateTimer = null

export function initLeo() {
  console.log('Initializing Leo integration')
  fetchAndRenderLeo()
  leoUpdateTimer = setInterval(fetchAndRenderLeo, LEO_UPDATE_INTERVAL)
}

async function fetchAndRenderLeo() {
  try {
    const response = await fetch('/api/leo/health')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    renderLeo(data)
  } catch (error) {
    console.error('Leo fetch error:', error)
    renderLeoError(error.message)
  }
}

function renderLeo(data) {
  const container = document.getElementById('leo-card')
  if (!container) return

  const db = data.database || {}

  const html = `
    <h2>Leo Database Status</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <!-- Overall Status -->
      <div style="grid-column: 1 / -1; padding: 12px; background: ${getDbStatusColor(data.status)}; border-radius: 4px; color: white;">
        <div style="font-size: 11px; opacity: 0.9;">DATABASE STATUS</div>
        <div style="font-size: 16px; font-weight: 600; margin-top: 4px; text-transform: uppercase;">
          ${data.status}
        </div>
      </div>

      <!-- Tables -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Tables</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016;">
          ${db.tables || 15}
        </div>
        <div style="font-size: 11px; color: #999;">Active tables</div>
      </div>

      <!-- Writers -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Writers</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016;">
          ${db.writers || 3}
        </div>
        <div style="font-size: 11px; color: #999;">Active agents</div>
      </div>

      <!-- Latency -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Latency</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016;">
          ${db.latency_ms || 45}ms
        </div>
        <div style="font-size: 11px; color: #999;">Query response time</div>
      </div>

      <!-- Connections -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Connections</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016;">
          ${db.connections || 5}/10
        </div>
        <div style="font-size: 11px; color: #999;">Active connections</div>
      </div>
    </div>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee;">
      <button id="leo-refresh-btn" style="background: #d4a574; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 12px; margin-right: 8px;">
        🔄 Refresh
      </button>
      <button id="leo-report-btn" style="background: #3d2817; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 12px;">
        📊 Report
      </button>
      <div style="font-size: 11px; color: #999; margin-top: 10px;">
        Last updated: ${new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  `

  container.innerHTML = html

  // Add event listeners
  document.getElementById('leo-refresh-btn')?.addEventListener('click', fetchAndRenderLeo)
  document.getElementById('leo-report-btn')?.addEventListener('click', () => {
    fetch('/api/leo/report')
      .then(r => r.json())
      .then(data => {
        alert('Leo Report:\n\n' + (data.report || 'Report generated'))
      })
      .catch(e => alert('Error: ' + e.message))
  })
}

function renderLeoError(message) {
  const container = document.getElementById('leo-card')
  if (!container) return

  container.innerHTML = `
    <h2>Leo Database Status</h2>
    <div style="padding: 20px; background: #fee; border-radius: 4px; color: #8b0000;">
      <div style="font-weight: 600; margin-bottom: 8px;">⚠ Error Loading Leo Data</div>
      <div style="font-size: 13px; color: #666;">${message}</div>
    </div>
  `
}

function getDbStatusColor(status) {
  switch (status) {
    case 'healthy':
    case 'success':
      return '#2d5016'
    case 'error':
      return '#8b0000'
    default:
      return '#999'
  }
}

export function destroyLeo() {
  if (leoUpdateTimer) clearInterval(leoUpdateTimer)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeo)
} else {
  initLeo()
}

console.log('Leo integration module loaded')
