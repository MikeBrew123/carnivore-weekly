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
  console.log('Initializing resources')
  fetchAndRenderResources()
  resourcesUpdateTimer = setInterval(fetchAndRenderResources, RESOURCES_UPDATE_INTERVAL)
}

async function fetchAndRenderResources() {
  try {
    const response = await fetch('/api/resources')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    renderResources(data)
  } catch (error) {
    console.error('Resources fetch error:', error)
    renderResourcesError(error.message)
  }
}

function renderResources(data) {
  const container = document.getElementById('resources-card')
  if (!container) return

  const html = `
    <h2>Resource Usage</h2>
    <div style="display: grid; gap: 15px;">
      <!-- Claude API -->
      <div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
          <div style="font-size: 12px; font-weight: 600; color: #3d2817;">Claude API Session</div>
          <div style="font-size: 12px; color: #666;">${data.claude.sessionTimeRemaining}</div>
        </div>
        <div style="width: 100%; height: 20px; background: #e0e0e0; border-radius: 4px; overflow: hidden;">
          <div style="width: ${data.claude.usagePercent}%; height: 100%; background: linear-gradient(90deg, #2d5016, #a85c00); transition: width 0.3s;"></div>
        </div>
        <div style="font-size: 10px; color: #999; margin-top: 4px;">
          Usage: ${data.claude.usagePercent}% • ${data.claude.requestCount} requests
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

  container.innerHTML = `
    <h2>Resource Usage</h2>
    <div style="padding: 20px; background: #fee; border-radius: 4px; color: #8b0000;">
      <div style="font-weight: 600; margin-bottom: 8px;">⚠ Error Loading Resources</div>
      <div style="font-size: 13px; color: #666;">${message}</div>
    </div>
  `
}

export function destroyResources() {
  if (resourcesUpdateTimer) clearInterval(resourcesUpdateTimer)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initResources)
} else {
  initResources()
}

console.log('Resources module loaded')
