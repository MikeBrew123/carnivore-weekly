/**
 * Analytics Frontend Module
 *
 * Displays site traffic metrics from Google Analytics 4:
 * - Page views (today, last 7 days, last 30 days)
 * - Unique users (same time periods)
 * - Top 10 performing pages
 * - Real-time active users
 */

console.log('Analytics module loading...')

const ANALYTICS_UPDATE_INTERVAL = 60 * 1000 // 60 seconds
let analyticsUpdateTimer = null

export function initAnalytics() {
  console.log('Initializing analytics module')

  const container = document.getElementById('analytics-section')
  console.log('Analytics container found:', !!container)

  if (!container) {
    console.warn('ERROR: Analytics section container not found!')
    return
  }

  console.log('Starting analytics fetch')

  // Start fetching immediately with a small delay to ensure DOM is ready
  setTimeout(() => {
    console.log('Executing initial analytics fetch after delay')
    fetchAndRenderAnalytics()
  }, 100)

  // Set up interval for periodic updates
  analyticsUpdateTimer = setInterval(() => {
    console.log('Executing periodic analytics fetch')
    fetchAndRenderAnalytics()
  }, ANALYTICS_UPDATE_INTERVAL)

  console.log('Analytics module initialized successfully')
}

async function fetchAndRenderAnalytics() {
  try {
    console.log('Fetching analytics from /api/analytics/summary')

    const response = await fetch('/api/analytics/summary', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      cache: 'no-cache'
    })

    console.log('Analytics response received, status:', response.status)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Analytics data parsed:', data)
    renderAnalytics(data)
  } catch (error) {
    console.error('Analytics fetch error:', error.message, error.stack)
    renderAnalyticsError(error.message || 'Unknown error')
  }
}

function renderAnalytics(data) {
  const container = document.getElementById('analytics-section')
  if (!container) return

  const html = `
    <div class="analytics-container">
      <h2>Site Traffic</h2>

      <!-- Metrics Grid -->
      <div class="analytics-grid">
        <!-- Page Views -->
        <div class="metric-card">
          <div class="metric-label">Today</div>
          <div class="metric-value">${data.pageViews.today.toLocaleString()}</div>
          <div class="metric-sublabel">Page Views</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Last 7 Days</div>
          <div class="metric-value">${data.pageViews.last7Days.toLocaleString()}</div>
          <div class="metric-sublabel">Page Views</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Last 30 Days</div>
          <div class="metric-value">${data.pageViews.last30Days.toLocaleString()}</div>
          <div class="metric-sublabel">Page Views</div>
        </div>

        <div class="metric-card realtime">
          <div class="metric-label">🔴 Real-Time</div>
          <div class="metric-value">${data.realtime.activeUsers}</div>
          <div class="metric-sublabel">Active Users</div>
        </div>
      </div>

      <!-- Top Pages Table -->
      <div class="top-pages">
        <h3>Top Performing Pages (Last 7 Days)</h3>
        ${data.topPages && data.topPages.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Page</th>
                <th>Views</th>
              </tr>
            </thead>
            <tbody>
              ${data.topPages.map((page, index) => `
                <tr>
                  <td class="page-title">
                    <span class="page-rank">#${index + 1}</span>
                    ${escapeHtml(page.title || page.path)}
                  </td>
                  <td class="page-views">${page.views.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div style="padding: 20px; text-align: center; color: #999;">
            No page data available yet
          </div>
        `}
      </div>

      <!-- Unique Users Section -->
      <div class="users-section">
        <h3>Unique Visitors</h3>
        <div class="users-grid">
          <div class="user-stat">
            <div class="user-stat-label">Today</div>
            <div class="user-stat-value">${data.users.today.toLocaleString()}</div>
          </div>
          <div class="user-stat">
            <div class="user-stat-label">Last 7 Days</div>
            <div class="user-stat-value">${data.users.last7Days.toLocaleString()}</div>
          </div>
          <div class="user-stat">
            <div class="user-stat-label">Last 30 Days</div>
            <div class="user-stat-value">${data.users.last30Days.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div class="analytics-footer">
        Last updated: ${new Date(data.timestamp).toLocaleTimeString()}
        ${data.error ? `<div style="color: #d4a574; margin-top: 5px;">⚠️ ${data.error}</div>` : ''}
      </div>
    </div>
  `

  container.innerHTML = html
}

function renderAnalyticsError(message) {
  const container = document.getElementById('analytics-section')
  if (!container) return

  console.error('Rendering analytics error message:', message)

  container.innerHTML = `
    <div class="analytics-container">
      <h2>Site Traffic</h2>
      <div style="padding: 20px; background: #fee; border-radius: 4px; color: #8b0000;">
        <div style="font-weight: 600; margin-bottom: 8px;">⚠ Error Loading Analytics</div>
        <div style="font-size: 12px; color: #666; word-break: break-all; margin-bottom: 10px;">${escapeHtml(message)}</div>
        <div style="font-size: 11px; color: #999;">
          Check that GA4_PROPERTY_ID and GA4_CREDENTIALS_PATH environment variables are set.
        </div>
      </div>
    </div>
  `
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

export function destroyAnalytics() {
  if (analyticsUpdateTimer) clearInterval(analyticsUpdateTimer)
}
