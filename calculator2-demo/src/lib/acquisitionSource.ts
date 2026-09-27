/**
 * Recovery-source attribution (2026-09-27).
 *
 * The abandoned-checkout recovery email links back with `src=abandon_recovery` and
 * `rc=<the expired checkout id>`. Without this a reader who came back that way and
 * bought was indistinguishable from an organic bridge-offer conversion, which is why
 * sending was switched off on 2026-09-13.
 *
 * The source is read from the URL on arrival and kept in sessionStorage for the tab,
 * so it survives the Stripe round trip and a refresh. The worker also puts `src` on
 * the Stripe success URL, so the returning page sees it in the URL either way.
 * Only allowlisted values are kept: an unknown `src` is ignored, never forwarded.
 */

export const RECOVERY_SOURCE = 'abandon_recovery'
const ALLOWED = new Set<string>([RECOVERY_SOURCE])
const STORAGE_KEY = 'cw_acquisition_source'

export interface AcquisitionSource {
  source: string
  recoveredFrom: string | null
}

const cleanCheckoutRef = (v: string | null) =>
  v && /^cs_[A-Za-z0-9_]{1,200}$/.test(v) ? v : null

function fromUrl(): AcquisitionSource | null {
  try {
    const params = new URLSearchParams(window.location.search)
    const src = params.get('src')
    if (!src || !ALLOWED.has(src)) return null
    return { source: src, recoveredFrom: cleanCheckoutRef(params.get('rc')) }
  } catch {
    return null
  }
}

/** Read the URL once on arrival and remember the source for this tab. */
export function captureAcquisitionSource(): AcquisitionSource | null {
  const found = fromUrl()
  if (!found) return getAcquisitionSource()
  try {
    // Keep a checkout ref captured earlier if this URL (a Stripe return) lacks one.
    const prior = getStored()
    const merged = { source: found.source, recoveredFrom: found.recoveredFrom || prior?.recoveredFrom || null }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    return merged
  } catch {
    return found
  }
}

function getStored(): AcquisitionSource | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !ALLOWED.has(parsed.source)) return null
    return { source: parsed.source, recoveredFrom: cleanCheckoutRef(parsed.recoveredFrom ?? null) }
  } catch {
    return null
  }
}

/** The source for this tab, URL first, then what was captured on arrival. */
export function getAcquisitionSource(): AcquisitionSource | null {
  return fromUrl() || getStored()
}

/** Extra GA4 params. Empty for organic traffic, so organic events are unchanged. */
export function acquisitionGaParams(): Record<string, string> {
  const a = getAcquisitionSource()
  return a ? { acquisition_source: a.source } : {}
}

/** Extra /create-checkout body fields. Empty for organic traffic. */
export function acquisitionCheckoutFields(): Record<string, string> {
  const a = getAcquisitionSource()
  if (!a) return {}
  return a.recoveredFrom
    ? { acquisition_source: a.source, recovered_from_checkout: a.recoveredFrom }
    : { acquisition_source: a.source }
}
