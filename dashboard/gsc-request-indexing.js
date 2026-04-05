#!/usr/bin/env node
/**
 * Request Google Indexing for unindexed blog posts
 *
 * Uses the Google Indexing API to notify Google about URLs that need crawling.
 * Reads the latest gsc-report-data.json to find unindexed posts, or accepts
 * URLs as command line arguments.
 *
 * Usage:
 *   node gsc-request-indexing.js                    # Submit all unindexed from report
 *   node gsc-request-indexing.js URL1 URL2 ...      # Submit specific URLs
 *
 * Requires: Service account with Owner access on the GSC property.
 * API docs: https://developers.google.com/search/apis/indexing-api/v3/using-api
 */

import { google } from 'googleapis'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_PATH = path.join(__dirname, 'ga4-credentials.json')
const REPORT_PATH = path.join(__dirname, 'gsc-report-data.json')

async function createIndexingClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/indexing']
  })
  const authClient = await auth.getClient()
  return google.indexing({ version: 'v3', auth: authClient })
}

function getUnindexedUrls() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.error('❌ No gsc-report-data.json found. Run gsc-report.js first.')
    process.exit(1)
  }
  const data = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8'))
  return (data.inspections || [])
    .filter(i => i.verdict !== 'PASS')
    .map(i => `https://carnivoreweekly.com${i.url}`)
}

async function requestIndexing(indexing, url) {
  try {
    await indexing.urlNotifications.publish({
      requestBody: {
        url,
        type: 'URL_UPDATED'
      }
    })
    return { url, status: 'submitted' }
  } catch (e) {
    return { url, status: 'error', message: e.message }
  }
}

async function main() {
  const args = process.argv.slice(2)

  // Get URLs: from args or from report
  let urls
  if (args.length > 0) {
    urls = args.map(u => u.startsWith('http') ? u : `https://carnivoreweekly.com${u}`)
  } else {
    urls = getUnindexedUrls()
  }

  if (urls.length === 0) {
    console.log('✅ No unindexed URLs to submit.')
    return
  }

  console.log(`📡 Requesting indexing for ${urls.length} URL(s)...\n`)

  const indexing = await createIndexingClient()

  for (const url of urls) {
    const result = await requestIndexing(indexing, url)
    if (result.status === 'submitted') {
      console.log(`  ✅ ${url}`)
    } else {
      console.log(`  ❌ ${url} — ${result.message}`)
    }
  }

  console.log(`\n✅ Done. Google typically crawls submitted URLs within 24-48 hours.`)
}

main().catch(e => {
  console.error('❌ Fatal error:', e.message)
  if (e.message.includes('forbidden') || e.message.includes('403')) {
    console.error('\nThe Indexing API may not be enabled. Enable it at:')
    console.error('https://console.cloud.google.com/apis/library/indexing.googleapis.com?project=n8n-cal-466417')
  }
  process.exit(1)
})
