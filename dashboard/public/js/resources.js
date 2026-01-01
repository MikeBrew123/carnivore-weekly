/**
 * Resource Usage Frontend Module
 *
 * Displays progress bars for:
 * - Claude API session time
 * - GitHub storage
 * - Supabase storage
 */

console.log('Resources module loading...')

const RESOURCES_UPDATE_INTERVAL = 120 * 1000 // 120 seconds
let resourcesUpdateTimer = null

export function initResources() {
  console.log('Initializing resources module')

  const container = document.getElementById('resources-card')
  console.log('Resources container found:', !!container)

  if (!container) {
    console.warn('ERROR: Resources card container not found!')
    return
  }

  console.log('Starting resource fetch')

  // Start fetching immediately with a small delay to ensure DOM is ready
  setTimeout(() => {
    console.log('Executing initial fetch after delay')
    fetchAndRenderResources()
  }, 100)

  // Set up interval for periodic updates
  resourcesUpdateTimer = setInterval(() => {
    console.log('Executing periodic fetch')
    fetchAndRenderResources()
  }, RESOURCES_UPDATE_INTERVAL)

  console.log('Resources module initialized successfully')
}

async function fetchAndRenderResources() {
  try {
    console.log('Fetching resources from /api/resources')

    const response = await fetch('/api/resources', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: 'no-cache'
    })

    console.log('Resources response received, status:', response.status)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Resources data parsed:', data)
    renderResources(data)
  } catch (error) {
    console.error('Resources fetch error:', error.message, error.stack)
    renderResourcesError(error.message || 'Unknown error')
  }
}

function renderResources(data) {
  const container = document.getElementById('resources-card')
  if (!container) return

  const html = `
    <h2>Resource Usage</h2>
    <div style="display: grid; gap: 15px;">
      <!-- Claude API - Tokens -->
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <div style="font-size: 12px; font-weight: 600; color: #3d2817;">🧠 Claude Tokens (Session)</div>
          <div style="font-size: 12px; color: #666;"><strong>${data.claude.tokens.used.toLocaleString()}</strong> used</div>
        </div>
        <div style="font-size: 11px; color: #555; margin-bottom: 8px;">
          📊 Messages: ${data.claude.tokens.messagesProcessed} | Avg/Message: ${data.claude.tokens.averagePerMessage} tokens
        </div>
        <div style="font-size: 10px; color: #999; background: #f9f9f9; padding: 6px; border-radius: 3px; border-left: 3px solid #d4a574;">
          Session started: ${new Date(data.claude.tokens.sessionStart).toLocaleString()}
        </div>
      </div>

      <!-- Claude API - Session Time -->
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <div style="font-size: 12px; font-weight: 600; color: #3d2817;">⏱️ Session Time</div>
          <div style="font-size: 12px; color: #666;">${data.claude.sessionTimeRemaining}</div>
        </div>
        <div style="width: 100%; height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
          <div style="width: ${data.claude.usagePercent}%; height: 100%; background: linear-gradient(90deg, #2d5016, #a85c00); transition: width 0.3s;"></div>
        </div>
        <div style="font-size: 10px; color: #999; margin-top: 4px;">
          Progress: ${data.claude.usagePercent}% • ${data.claude.requestCount} total requests
        </div>
      </div>

      <!-- GitHub Storage -->
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <div style="font-size: 12px; font-weight: 600; color: #3d2817;">GitHub Storage</div>
          <div style="font-size: 12px; color: #666;">${data.github.storageUsed} / ${data.github.storageLimit}</div>
        </div>
        <div style="width: 100%; height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
          <div style="width: ${data.github.usagePercent}%; height: 100%; background: linear-gradient(90deg, #2d5016, #a85c00); transition: width 0.3s;"></div>
        </div>
        <div style="font-size: 10px; color: #999; margin-top: 4px;">
          Usage: ${data.github.usagePercent}%
        </div>
      </div>

      <!-- Supabase Storage -->
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <div style="font-size: 12px; font-weight: 600; color: #3d2817;">Supabase Storage</div>
          <div style="font-size: 12px; color: #666;">${data.supabase.storageUsed} / ${data.supabase.storageLimit}</div>
        </div>
        <div style="width: 100%; height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
          <div style="width: ${data.supabase.usagePercent}%; height: 100%; background: linear-gradient(90deg, #2d5016, #a85c00); transition: width 0.3s;"></div>
        </div>
        <div style="font-size: 10px; color: #999; margin-top: 4px;">
          Usage: ${data.supabase.usagePercent}% • DB: ${data.supabase.databaseSize}
        </div>
      </div>
    </div>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
      Last updated: ${new Date(data.timestamp).toLocaleTimeString()}
    </div>
  `

  container.innerHTML = html
}

function renderResourcesError(message) {
  const container = document.getElementById('resources-card')
  if (!container) return

  console.error('Rendering error message:', message)

  container.innerHTML = `
    <h2>Resource Usage</h2>
    <div style="padding: 20px; background: #fee; border-radius: 4px; color: #8b0000;">
      <div style="font-weight: 600; margin-bottom: 8px;">⚠ Error Loading Resources</div>
      <div style="font-size: 12px; color: #666; word-break: break-all;">${message}</div>
      <div style="font-size: 11px; color: #999; margin-top: 10px;">Check browser console for details</div>
    </div>
  `
}

export function destroyResources() {
  if (resourcesUpdateTimer) clearInterval(resourcesUpdateTimer)
}
