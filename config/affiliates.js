/**
 * Affiliate partner URLs for CarnivoreWeekly.com
 *
 * These are the canonical affiliate links used across the site.
 * Update here to change globally (when using a build system).
 *
 * For static HTML: Use these as reference when manually updating links.
 */

export const AFFILIATES = {
  butcherbox: {
    url: 'https://butcherbox.pxf.io/Z6oVMR',
    name: 'ButcherBox',
    description: 'Grass-fed meat delivery service'
  },
  lmnt: {
    url: 'https://drinklmnt.com',
    name: 'LMNT',
    description: 'Electrolyte drink mix'
  }
}

/**
 * Generate affiliate link with UTM parameters
 * @param {string} partner - Partner key (butcherbox, lmnt)
 * @param {string} source - UTM source (default: carnivore_weekly)
 * @param {string} medium - UTM medium (default: affiliate)
 * @param {string} campaign - UTM campaign (default: general)
 */
export function getAffiliateLink(partner, source = 'carnivore_weekly', medium = 'affiliate', campaign = 'general') {
  const affiliate = AFFILIATES[partner]
  if (!affiliate) {
    throw new Error(`Unknown affiliate partner: ${partner}`)
  }

  const url = new URL(affiliate.url)
  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', campaign)

  return url.toString()
}
