#!/usr/bin/env node
/**
 * KetoDial GSC weekly routine: resubmit sitemap + inspect the 20 most recent live blog URLs.
 *
 * Mirrors what gsc-report.js + gsc-request-indexing.js do for carnivoreweekly.com.
 *
 * Two KD-specific gotchas this script exists to handle:
 *   1. KD blog URLs STRIP the YYYY-MM-DD- prefix from the blog_posts.json slug
 *      (see ketodial/scripts/generate_kd_blog.py:strip_date_prefix). Inspecting the
 *      raw slug would inspect 404s.
 *   2. KD is a dual pipeline — legacy hand-authored HTML plus new posts rendered from
 *      blog_posts.json. Candidates come from FILES ON DISK so both are covered and
 *      posts marked published without rendered HTML are never inspected as 404s.
 *
 * The Sitemaps API `indexed` field is deprecated and always returns 0. Coverage state
 * from URL Inspection is the real indexation signal — that's what this reports.
 */
import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SITE_URL = 'https://ketodial.com/'
const SITEMAP = 'https://ketodial.com/sitemap.xml'
const BLOG_DIR = path.join(__dirname, '..', 'ketodial', 'public', 'blog')
const BLOG_POSTS = path.join(__dirname, '..', 'data', 'blog_posts.json')
const INSPECT_LIMIT = 20

const stripDatePrefix = slug => slug.replace(/^\d{4}-\d{2}-\d{2}-/, '')

function getAuth() {
  const creds = JSON.parse(fs.readFileSync(path.join(__dirname, 'ga4-credentials.json'), 'utf8'))
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/webmasters']
  })
}

async function resubmitSitemap(sc) {
  await sc.sitemaps.submit({ siteUrl: SITE_URL, feedpath: SITEMAP })
  console.log(`✅ Resubmitted KD sitemap: ${SITEMAP}`)

  const { data } = await sc.sitemaps.get({ siteUrl: SITE_URL, feedpath: SITEMAP })
  const contents = data.contents || []
  if (contents.length === 0) {
    console.log('   (no content breakdown yet — Google has not processed this submission)')
  }
  for (const c of contents) {
    console.log(`   ${c.type}: submitted=${c.submitted}  (indexed field is deprecated, always 0)`)
  }
  console.log(`   errors=${data.errors ?? 0}  warnings=${data.warnings ?? 0}`)
  return contents[0]?.submitted ?? null
}

/** Live KD blog pages, newest first. Date comes from blog_posts.json when known, else file mtime. */
function candidateUrls() {
  if (!fs.existsSync(BLOG_DIR)) {
    console.log('  ⚠ ketodial/public/blog not found, skipping URL inspection')
    return []
  }

  const dates = new Map()
  if (fs.existsSync(BLOG_POSTS)) {
    const blogData = JSON.parse(fs.readFileSync(BLOG_POSTS, 'utf-8'))
    for (const p of blogData.blog_posts.filter(p => p.site === 'kd')) {
      const d = p.publish_date || p.date
      if (d) dates.set(stripDatePrefix(p.slug), d)
    }
  }

  return fs.readdirSync(BLOG_DIR)
    .filter(f => f.endsWith('.html') && f !== 'index.html')
    .map(f => {
      const slug = f.replace(/\.html$/, '')
      return {
        slug,
        url: `https://ketodial.com/blog/${slug}.html`,
        publishDate: dates.get(slug) || fs.statSync(path.join(BLOG_DIR, f)).mtime.toISOString().slice(0, 10),
        dateSource: dates.has(slug) ? 'blog_posts.json' : 'file mtime'
      }
    })
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate))
}

async function inspectUrls(sc, posts) {
  const results = []
  for (const post of posts) {
    try {
      const { data } = await sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: post.url, siteUrl: SITE_URL }
      })
      const r = data.inspectionResult?.indexStatusResult
      results.push({
        ...post,
        verdict: r?.verdict || 'UNKNOWN',
        coverageState: r?.coverageState || 'UNKNOWN',
        robotsTxt: r?.robotsTxtState || 'UNKNOWN',
        lastCrawl: r?.lastCrawlTime || null,
        pageFetchState: r?.pageFetchState || 'UNKNOWN',
        indexingState: r?.indexingState || 'UNKNOWN'
      })
      await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      results.push({
        ...post,
        verdict: 'ERROR',
        coverageState: e.message?.substring(0, 80) || 'API Error',
        robotsTxt: '-', lastCrawl: null, pageFetchState: '-', indexingState: '-'
      })
    }
  }
  return results
}

function printCoverage(inspections, totalCandidates) {
  console.log('\n' + '='.repeat(70))
  console.log('🔍 KETODIAL — URL INSPECTION COVERAGE')
  console.log('='.repeat(70))

  const counts = {}
  for (const i of inspections) counts[i.coverageState] = (counts[i.coverageState] || 0) + 1

  const indexed = inspections.filter(i => /indexed/i.test(i.coverageState) && i.verdict === 'PASS')
  const errors = inspections.filter(i => i.verdict === 'ERROR')
  const notIndexed = inspections.filter(i => i.verdict !== 'PASS' && i.verdict !== 'ERROR')

  console.log(`  Indexed:     ${indexed.length} of ${inspections.length} inspected`)
  console.log(`  Not indexed: ${notIndexed.length}`)
  console.log(`  API errors:  ${errors.length}  (inspection failed — not an indexation verdict)`)
  console.log('\n  Coverage states:')
  for (const [state, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${n.toString().padStart(3)}  ${state}`)
  }

  if (notIndexed.length > 0) {
    console.log('\n  ⚠ NOT INDEXED:')
    for (const i of notIndexed) console.log(`    ${i.publishDate}  ${i.slug} → ${i.coverageState}`)
  }
  if (errors.length > 0) {
    console.log('\n  ⚠ INSPECTION ERRORS (retry next week before treating as a problem):')
    for (const i of errors) console.log(`    ${i.publishDate}  ${i.slug} → ${i.coverageState}`)
  }

  // Never let a capped sample read as full coverage.
  if (totalCandidates > inspections.length) {
    console.log(`\n  NOTE: sample capped at ${INSPECT_LIMIT} newest of ${totalCandidates} live KD blog pages.`)
    console.log(`        ${totalCandidates - inspections.length} older pages were not inspected this run.`)
  }
}

async function main() {
  const auth = getAuth()
  const client = await auth.getClient()
  const sc = google.searchconsole({ version: 'v1', auth: client })

  const submitted = await resubmitSitemap(sc)

  const candidates = candidateUrls()
  const sample = candidates.slice(0, INSPECT_LIMIT)
  console.log(`\n  Inspecting ${sample.length} of ${candidates.length} live KD blog pages...`)
  const inspections = await inspectUrls(sc, sample)
  printCoverage(inspections, candidates.length)

  const out = path.join(__dirname, 'gsc-kd-report-data.json')
  fs.writeFileSync(out, JSON.stringify({
    site: 'kd', siteUrl: SITE_URL, sitemapSubmitted: submitted,
    inspections, totalCandidates: candidates.length, generatedAt: new Date().toISOString()
  }, null, 2))
  console.log(`\n  Saved: ${path.basename(out)}`)
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
