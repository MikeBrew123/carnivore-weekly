#!/usr/bin/env node
/**
 * Nudge Google to recrawl carnivoreweekly.com.
 *
 * The Google Indexing API (urlNotifications.publish) only affects
 * JobPosting/BroadcastEvent structured data — it does nothing for regular
 * blog pages (Google's own docs; see CLAUDE.md Lesson #13). Resubmitting
 * the sitemap is the documented way to nudge a recrawl of ordinary pages.
 * Run at most weekly — repeated resubmission doesn't speed things up further.
 *
 * Usage:
 *   node gsc-request-indexing.js               # CW (default)
 *   node gsc-request-indexing.js --site kd     # KetoDial
 *
 * Requires: Service account with Owner access on the GSC property.
 * (KD uses the URL-prefix property — the service account is not authorized
 * on sc-domain:ketodial.com, only on https://ketodial.com/.)
 */

import { google } from 'googleapis'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const CREDENTIALS_PATH = path.join(__dirname, 'ga4-credentials.json')

const SITES = {
  cw: { siteUrl: 'sc-domain:carnivoreweekly.com', feedpath: 'https://carnivoreweekly.com/sitemap.xml' },
  kd: { siteUrl: 'https://ketodial.com/', feedpath: 'https://ketodial.com/sitemap.xml' }
}
const siteArg = process.argv.includes('--site')
  ? process.argv[process.argv.indexOf('--site') + 1]
  : 'cw'
if (!SITES[siteArg]) {
  console.error(`Unknown --site '${siteArg}' (expected cw or kd)`)
  process.exit(1)
}
const { siteUrl: SITE_URL, feedpath: FEEDPATH } = SITES[siteArg]

async function main() {
  const auth = new google.auth.GoogleAuth({
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/webmasters']
  })
  const authClient = await auth.getClient()
  const sc = google.searchconsole({ version: 'v1', auth: authClient })

  await sc.sitemaps.submit({ siteUrl: SITE_URL, feedpath: FEEDPATH })
  console.log(`✅ Resubmitted sitemap: ${FEEDPATH}`)

  const status = await sc.sitemaps.get({ siteUrl: SITE_URL, feedpath: FEEDPATH })
  const contents = status.data.contents || []
  if (contents.length === 0) {
    console.log('   (no content type breakdown returned yet — check again after Google processes it)')
  }
  for (const c of contents) {
    console.log(`   ${c.type}: submitted=${c.submitted} indexed=${c.indexed ?? 'n/a'}`)
  }
}

main().catch(e => {
  console.error('❌ Fatal error:', e.message)
  process.exit(1)
})
