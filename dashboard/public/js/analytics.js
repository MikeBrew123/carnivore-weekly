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

  // Generate insights based on data
  const insights = generateInsights(data)

  const html = `
    <div class="analytics-container">
      <h2>📊 Site Traffic Report</h2>

      <!-- Key Metrics Grid -->
      <div class="analytics-grid">
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
          <div class="metric-label">Today's Visitors</div>
          <div class="metric-value">${data.users.today.toLocaleString()}</div>
          <div class="metric-sublabel">Unique Users</div>
        </div>

        <div class="metric-card realtime">
          <div class="metric-label">🔴 Live Now</div>
          <div class="metric-value">${data.realtime.activeUsers}</div>
          <div class="metric-sublabel">Active Users</div>
        </div>
      </div>

      <!-- Insights Section -->
      <div class="insights-section">
        <h3>📌 Key Insights</h3>
        <div class="insights-list">
          ${insights.map(insight => `
            <div class="insight-item ${insight.type}">
              <span class="insight-icon">${insight.icon}</span>
              <span class="insight-text">${insight.text}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Top Pages Table -->
      <div class="top-pages">
        <h3>🏆 Top Performing Pages</h3>
        ${data.topPages && data.topPages.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th style="width: 60px;">Rank</th>
                <th>Page Title</th>
                <th style="width: 100px; text-align: right;">Views</th>
              </tr>
            </thead>
            <tbody>
              ${data.topPages.map((page, index) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">
                    ${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '#' + (index + 1)}
                  </td>
                  <td class="page-title">
                    ${escapeHtml(page.title || page.path)}
                  </td>
                  <td style="text-align: right; font-weight: bold;">${page.views.toLocaleString()}</td>
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

      <!-- Affiliate Links Performance -->
      ${data.affiliateClicks && data.affiliateClicks.length > 0 ? `
        <div class="affiliate-clicks" style="margin-top: 30px;">
          <h3>💰 Affiliate Link Clicks (Last 7 Days)</h3>
          <table>
            <thead>
              <tr>
                <th>Product/Link</th>
                <th style="width: 120px; text-align: right;">Clicks</th>
              </tr>
            </thead>
            <tbody>
              ${data.affiliateClicks.map(aff => `
                <tr>
                  <td style="color: #d4a574; font-weight: 500;">${escapeHtml(aff.product)}</td>
                  <td style="text-align: right; font-weight: bold; color: #2d5016;">${aff.clicks}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ``}

      <div class="analytics-footer">
        ⏰ Last updated: ${new Date(data.timestamp).toLocaleTimeString()}
        ${data.error ? `<div style="color: #d4a574; margin-top: 5px;">⚠️ ${data.error}</div>` : ''}
      </div>
    </div>
  `

  container.innerHTML = html
}

function generateInsights(data) {
  const insights = []

  // Analyze page views
  if (data.pageViews.today > 1000) {
    insights.push({
      type: 'positive',
      icon: '✅',
      text: `Strong traffic today: <strong>${data.pageViews.today.toLocaleString()}</strong> views`
    })
  } else if (data.pageViews.today > 500) {
    insights.push({
      type: 'positive',
      icon: '👍',
      text: `Good traffic: <strong>${data.pageViews.today.toLocaleString()}</strong> views today`
    })
  }

  // Analyze top page
  if (data.topPages && data.topPages.length > 0) {
    const topPage = data.topPages[0]
    insights.push({
      type: 'info',
      icon: '⭐',
      text: `<strong>${topPage.title || topPage.path}</strong> is your most popular page (<strong>${topPage.views}</strong> views)`
    })
  }

  // Check traffic diversity
  if (data.topPages && data.topPages.length > 5) {
    const topFiveTotal = data.topPages.slice(0, 5).reduce((sum, p) => sum + p.views, 0)
    const totalViews = data.topPages.reduce((sum, p) => sum + p.views, 0)
    const topFivePercent = Math.round((topFiveTotal / totalViews) * 100)

    if (topFivePercent < 70) {
      insights.push({
        type: 'positive',
        icon: '📊',
        text: `Healthy traffic distribution: Top 5 pages get ${topFivePercent}% of views (not concentrated)`
      })
    }
  }

  // Analyze user engagement
  const avgViewsPerUser = data.users.today > 0 ? Math.round(data.pageViews.today / data.users.today) : 0
  if (avgViewsPerUser > 2) {
    insights.push({
      type: 'positive',
      icon: '📈',
      text: `Good engagement: <strong>${avgViewsPerUser}</strong> pages per visitor`
    })
  }

  // Check for tracking issues
  if (data.topPages && data.topPages.length > 0) {
    const duplicates = data.topPages.filter(p => p.path === '/' || p.path === '/' || p.path === '/index.html')
    if (duplicates.length > 1) {
      insights.push({
        type: 'warning',
        icon: '⚠️',
        text: 'Tracking alert: Homepage being tracked multiple times - affects accuracy'
      })
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'info',
      icon: '📝',
      text: 'Check back soon - more insights as traffic data accumulates'
    })
  }

  return insights
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
