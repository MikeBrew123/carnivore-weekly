import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_PATH = path.join(__dirname, 'ga4-credentials.json')
const SITE_URL = 'sc-domain:carnivoreweekly.com'
const SITE_URL_FALLBACK = 'https://carnivoreweekly.com/'

// Date helpers
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

async function createClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters'
    ]
  })
  const authClient = await auth.getClient()
  return google.searchconsole({ version: 'v1', auth: authClient })
}

async function detectSiteUrl(sc) {
  // Try domain property first, fall back to URL prefix
  try {
    await sc.searchanalytics.query({
      siteUrl: SITE_URL,
      requestBody: { startDate: daysAgo(3), endDate: daysAgo(1), rowLimit: 1 }
    })
    return SITE_URL
  } catch {
    try {
      await sc.searchanalytics.query({
        siteUrl: SITE_URL_FALLBACK,
        requestBody: { startDate: daysAgo(3), endDate: daysAgo(1), rowLimit: 1 }
      })
      return SITE_URL_FALLBACK
    } catch (e) {
      console.error('❌ Neither site URL format works:', e.message)
      throw e
    }
  }
}

async function getPerformanceByDate(sc, siteUrl) {
  const { data } = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: daysAgo(9), // GSC has 2-3 day delay
      endDate: daysAgo(1),
      dimensions: ['date'],
      rowLimit: 10
    }
  })
  return data.rows || []
}

async function getTopQueries(sc, siteUrl) {
  const { data } = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: daysAgo(9),
      endDate: daysAgo(1),
      dimensions: ['query'],
      rowLimit: 25,
      orderBy: 'clicks'
    }
  })
  return data.rows || []
}

async function getTopPages(sc, siteUrl) {
  const { data } = await sc.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate: daysAgo(9),
      endDate: daysAgo(1),
      dimensions: ['page'],
      rowLimit: 25,
      orderBy: 'clicks'
    }
  })
  return data.rows || []
}

async function getSitemaps(sc, siteUrl) {
  try {
    const { data } = await sc.sitemaps.list({ siteUrl })
    return data.sitemap || []
  } catch (e) {
    console.log('  ⚠ Sitemaps API error:', e.message)
    return []
  }
}

async function inspectUrls(sc, siteUrl) {
  // Load blog posts and pick 20 most recent published
  const blogPostsPath = path.join(__dirname, '..', 'data', 'blog_posts.json')
  if (!fs.existsSync(blogPostsPath)) {
    console.log('  ⚠ blog_posts.json not found, skipping URL inspection')
    return []
  }

  const blogData = JSON.parse(fs.readFileSync(blogPostsPath, 'utf-8'))
  const published = blogData.blog_posts
    .filter(p => p.status === 'published' || p.published)
    .sort((a, b) => (b.publish_date || b.date || '').localeCompare(a.publish_date || a.date || ''))
    .slice(0, 20)

  // URL Inspection API requires the URL-prefix property format, not sc-domain
  const inspectionSiteUrl = 'https://carnivoreweekly.com/'

  const results = []
  for (const post of published) {
    const url = `https://carnivoreweekly.com/blog/${post.slug}.html`
    try {
      const { data } = await sc.urlInspection.index.inspect({
        requestBody: {
          inspectionUrl: url,
          siteUrl: inspectionSiteUrl
        }
      })
      const result = data.inspectionResult
      results.push({
        url: url.replace('https://carnivoreweekly.com', ''),
        slug: post.slug,
        title: post.title,
        publishDate: post.publish_date || post.date,
        verdict: result?.indexStatusResult?.verdict || 'UNKNOWN',
        coverageState: result?.indexStatusResult?.coverageState || 'UNKNOWN',
        robotsTxt: result?.indexStatusResult?.robotsTxtState || 'UNKNOWN',
        lastCrawl: result?.indexStatusResult?.lastCrawlTime || null,
        pageFetchState: result?.indexStatusResult?.pageFetchState || 'UNKNOWN',
        indexingState: result?.indexStatusResult?.indexingState || 'UNKNOWN',
        referringUrls: result?.indexStatusResult?.referringUrls || []
      })
      // Small delay to respect rate limits
      await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      results.push({
        url: url.replace('https://carnivoreweekly.com', ''),
        slug: post.slug,
        title: post.title,
        publishDate: post.publish_date || post.date,
        verdict: 'ERROR',
        coverageState: e.message?.substring(0, 80) || 'API Error',
        robotsTxt: '-', lastCrawl: null, pageFetchState: '-', indexingState: '-'
      })
    }
  }
  return results
}

function printReport(performance, queries, pages, sitemaps, inspections) {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 GOOGLE SEARCH CONSOLE — 7 DAY REPORT')
  console.log('='.repeat(70))
  console.log(`  Note: GSC data has a 2-3 day delay\n`)

  // Performance summary
  let totalClicks = 0, totalImpressions = 0
  console.log('📈 DAILY PERFORMANCE:')
  console.log('-'.repeat(70))
  console.log('  Date         Clicks   Impressions   CTR      Avg Position')
  for (const row of performance) {
    const date = row.keys[0]
    totalClicks += row.clicks
    totalImpressions += row.impressions
    console.log(`  ${date}     ${String(row.clicks).padStart(4)}     ${String(row.impressions).padStart(7)}     ${(row.ctr * 100).toFixed(1)}%     ${row.position.toFixed(1)}`)
  }
  console.log('-'.repeat(70))
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100).toFixed(1) : '0.0'
  const avgPos = performance.length > 0 ? (performance.reduce((s, r) => s + r.position, 0) / performance.length).toFixed(1) : '0'
  console.log(`  TOTAL        ${String(totalClicks).padStart(4)}     ${String(totalImpressions).padStart(7)}     ${avgCtr}%     ${avgPos}`)
  console.log()

  // Top queries
  console.log('🔎 TOP SEARCH QUERIES:')
  console.log('-'.repeat(70))
  for (const row of queries.slice(0, 15)) {
    const q = row.keys[0].substring(0, 45).padEnd(45)
    console.log(`  ${q} ${String(row.clicks).padStart(3)} clicks  ${String(row.impressions).padStart(5)} imp  pos ${row.position.toFixed(0)}`)
  }
  console.log()

  // Top pages
  console.log('📄 TOP PAGES:')
  console.log('-'.repeat(70))
  for (const row of pages.slice(0, 15)) {
    const p = row.keys[0].replace('https://carnivoreweekly.com', '').substring(0, 50).padEnd(50)
    console.log(`  ${p} ${String(row.clicks).padStart(3)} clicks  ${String(row.impressions).padStart(5)} imp`)
  }
  console.log()

  // Sitemaps
  if (sitemaps.length > 0) {
    console.log('🗺️  SITEMAPS:')
    console.log('-'.repeat(70))
    for (const sm of sitemaps) {
      console.log(`  ${sm.path}`)
      console.log(`    Last submitted: ${sm.lastSubmitted || 'N/A'}`)
      console.log(`    Last downloaded: ${sm.lastDownloaded || 'N/A'}`)
      if (sm.contents) {
        for (const c of sm.contents) {
          console.log(`    ${c.type}: ${c.submitted} submitted, ${c.indexed} indexed`)
        }
      }
    }
    console.log()
  }

  // URL Inspections
  if (inspections.length > 0) {
    const indexed = inspections.filter(i => i.verdict === 'PASS')
    const notIndexed = inspections.filter(i => i.verdict !== 'PASS' && i.verdict !== 'ERROR')
    const errors = inspections.filter(i => i.verdict === 'ERROR')

    console.log('🔬 URL INSPECTION (20 most recent blog posts):')
    console.log('-'.repeat(70))
    console.log(`  ✅ Indexed: ${indexed.length}`)
    console.log(`  ❌ Not indexed: ${notIndexed.length}`)
    if (errors.length > 0) console.log(`  ⚠️  Errors: ${errors.length}`)
    console.log()

    if (indexed.length > 0) {
      console.log('  ✅ INDEXED:')
      for (const i of indexed) {
        const crawl = i.lastCrawl ? new Date(i.lastCrawl).toLocaleDateString() : 'N/A'
        console.log(`    ${i.url.substring(0, 55).padEnd(55)} crawled: ${crawl}`)
      }
      console.log()
    }

    if (notIndexed.length > 0) {
      console.log('  ❌ NOT INDEXED:')
      for (const i of notIndexed) {
        console.log(`    ${i.url.substring(0, 55).padEnd(55)} ${i.coverageState}`)
      }
      console.log()
    }

    if (errors.length > 0) {
      console.log('  ⚠️  INSPECTION ERRORS:')
      for (const i of errors) {
        console.log(`    ${i.url.substring(0, 55).padEnd(55)} ${i.coverageState}`)
      }
      console.log()
    }
  }

  console.log('='.repeat(70))
}

async function main() {
  console.log('🔍 Fetching Google Search Console data...\n')

  const sc = await createClient()
  const siteUrl = await detectSiteUrl(sc)
  console.log(`  ✓ Connected to GSC (${siteUrl})\n`)

  // Run queries
  console.log('  Fetching performance data...')
  const performance = await getPerformanceByDate(sc, siteUrl)
  console.log(`  ✓ ${performance.length} days of data`)

  console.log('  Fetching top queries...')
  const queries = await getTopQueries(sc, siteUrl)
  console.log(`  ✓ ${queries.length} queries`)

  console.log('  Fetching top pages...')
  const pages = await getTopPages(sc, siteUrl)
  console.log(`  ✓ ${pages.length} pages`)

  console.log('  Fetching sitemaps...')
  const sitemaps = await getSitemaps(sc, siteUrl)
  console.log(`  ✓ ${sitemaps.length} sitemaps`)

  console.log('  Inspecting 20 most recent blog posts (this takes ~10s)...')
  const inspections = await inspectUrls(sc, siteUrl)
  console.log(`  ✓ ${inspections.length} URLs inspected`)

  // Print console report
  printReport(performance, queries, pages, sitemaps, inspections)

  // Save raw data for reference
  const reportData = { performance, queries, pages, sitemaps, inspections, generatedAt: new Date().toISOString() }
  fs.writeFileSync(path.join(__dirname, 'gsc-report-data.json'), JSON.stringify(reportData, null, 2))
  console.log('\n✅ Raw data saved to dashboard/gsc-report-data.json')
}

main().catch(e => {
  console.error('❌ Fatal error:', e.message)
  if (e.message.includes('permission') || e.message.includes('403')) {
    console.error('\nCheck that:')
    console.error('1. Search Console API is enabled in Google Cloud project n8n-cal-466417')
    console.error('2. Service account is added as a user in GSC for carnivoreweekly.com')
  }
  process.exit(1)
})
