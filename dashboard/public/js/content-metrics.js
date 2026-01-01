/**
 * Content Metrics Frontend Module
 *
 * Displays content statistics and upcoming posts
 * Polls /api/content/recent, /api/content/upcoming, etc. every 60 seconds
 */

console.log('Content metrics module loading...')

const CONTENT_UPDATE_INTERVAL = 60 * 1000 // 60 seconds
let contentUpdateTimer = null

export function initContentMetrics() {
  console.log('Initializing content metrics')
  fetchAndRenderContent()
  contentUpdateTimer = setInterval(fetchAndRenderContent, CONTENT_UPDATE_INTERVAL)
}

async function fetchAndRenderContent() {
  try {
    const response = await fetch('/api/content')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    renderContent(data)
  } catch (error) {
    console.error('Content fetch error:', error)
    renderContentError(error.message)
  }
}

function renderContent(data) {
  const container = document.getElementById('content-card')
  if (!container) return

  const content = data.data
  const recentHtml = (content.recentPosts || []).map(post => `
    <div style="padding: 10px; border-bottom: 1px solid #eee;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 3px;">${post.title}</div>
      <div style="font-size: 11px; color: #666;">
        By ${post.author} • ${new Date(post.date).toLocaleDateString()}
      </div>
    </div>
  `).join('')

  const upcomingHtml = (content.upcomingPosts || []).map(post => `
    <div style="padding: 10px; border-bottom: 1px solid #eee;">
      <div style="font-weight: 600; font-size: 13px; margin-bottom: 3px;">${post.title}</div>
      <div style="font-size: 11px; color: #999;">
        ${new Date(post.scheduledDate).toLocaleDateString()} • ${post.author}
      </div>
    </div>
  `).join('')

  const archiveStats = content.archiveStats

  const html = `
    <h2>Content Metrics</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
      <!-- Recent Posts -->
      <div style="grid-column: 1 / -1;">
        <div style="font-size: 12px; font-weight: 600; color: #3d2817; margin-bottom: 10px; text-transform: uppercase;">
          Recent Posts (${content.recentPosts?.length || 0})
        </div>
        <div style="border: 1px solid #eee; border-radius: 4px; max-height: 200px; overflow-y: auto;">
          ${recentHtml || '<div style="padding: 15px; color: #999; text-align: center;">No posts</div>'}
        </div>
      </div>

      <!-- Upcoming Posts -->
      <div style="grid-column: 1 / -1;">
        <div style="font-size: 12px; font-weight: 600; color: #3d2817; margin-bottom: 10px; text-transform: uppercase;">
          Upcoming (${content.upcomingPosts?.length || 0})
        </div>
        <div style="border: 1px solid #eee; border-radius: 4px; max-height: 150px; overflow-y: auto;">
          ${upcomingHtml || '<div style="padding: 15px; color: #999; text-align: center;">No scheduled posts</div>'}
        </div>
      </div>

      <!-- Archive Stats -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">Archives</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016; margin-bottom: 8px;">
          ${archiveStats?.totalArchives || 0}
        </div>
        <div style="font-size: 11px; color: #999;">
          Total: ${archiveStats?.totalPostsPublished || 0} posts<br>
          Avg: ${archiveStats?.averagePostsPerWeek || 10}/week
        </div>
      </div>

      <!-- YouTube -->
      <div style="padding: 12px; background: #f5f5f5; border-radius: 4px;">
        <div style="font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 8px;">YouTube</div>
        <div style="font-size: 14px; font-weight: 600; color: #2d5016; margin-bottom: 8px;">
          ${content.youtubeVideos?.length || 0} Videos
        </div>
        <div style="font-size: 11px; color: #999;">
          ${content.youtubeVideos?.[0]?.publishedAt ? 'Latest: ' + new Date(content.youtubeVideos[0].publishedAt).toLocaleDateString() : 'No videos'}
        </div>
      </div>
    </div>
    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999;">
      Last updated: ${new Date(data.timestamp).toLocaleTimeString()}
    </div>
  `

  container.innerHTML = html
}

function renderContentError(message) {
  const container = document.getElementById('content-card')
  if (!container) return

  container.innerHTML = `
    <h2>Content Metrics</h2>
    <div style="padding: 20px; background: #fee; border-radius: 4px; color: #8b0000;">
      <div style="font-weight: 600; margin-bottom: 8px;">⚠ Error Loading Content</div>
      <div style="font-size: 13px; color: #666;">${message}</div>
    </div>
  `
}

export function destroyContentMetrics() {
  if (contentUpdateTimer) clearInterval(contentUpdateTimer)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initContentMetrics)
} else {
  initContentMetrics()
}

console.log('Content metrics module loaded')
