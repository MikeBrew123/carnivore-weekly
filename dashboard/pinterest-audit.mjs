import { BetaAnalyticsDataClient } from '@google-analytics/data'

const CREDENTIALS_PATH = './ga4-credentials.json'
const client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH })

const PROPS = [
  { name: 'Carnivore Weekly', id: '517632328' },
  { name: 'KetoDial', id: '539655784' }
]

const RANGES = [
  { label: '90d', startDate: '90daysAgo', endDate: 'today' },
  { label: '28d', startDate: '28daysAgo', endDate: 'today' }
]

async function safe(fn, label) {
  try { return await fn() } catch (e) {
    console.log(`  !! ERROR ${label}: ${e.message?.slice(0, 200)}`)
    return null
  }
}

async function totals(propertyId, range) {
  return safe(async () => {
    const [r] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagedSessions' }, { name: 'keyEvents' }]
    })
    return r.rows?.[0]?.metricValues.map(m => m.value) ?? null
  }, `totals ${propertyId} ${range.label}`)
}

async function allSources(propertyId, range) {
  return safe(async () => {
    const [r] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      dimensions: [{ name: 'sessionSourceMedium' }],
      metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagedSessions' }, { name: 'keyEvents' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 100
    })
    return r.rows?.map(row => ({
      sm: row.dimensionValues[0].value,
      sessions: +row.metricValues[0].value,
      users: +row.metricValues[1].value,
      engaged: +row.metricValues[2].value,
      keyEvents: +row.metricValues[3].value
    })) ?? []
  }, `sources ${propertyId} ${range.label}`)
}

async function pinterestEvents(propertyId, range) {
  return safe(async () => {
    const [r] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
      dimensions: [{ name: 'sessionSourceMedium' }, { name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: {
        filter: { fieldName: 'sessionSourceMedium', stringFilter: { matchType: 'CONTAINS', value: 'pin', caseSensitive: false } }
      },
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 50
    })
    return r.rows?.map(row => `${row.dimensionValues[0].value} | ${row.dimensionValues[1].value} = ${row.metricValues[0].value}`) ?? []
  }, `events ${propertyId} ${range.label}`)
}

for (const p of PROPS) {
  console.log(`\n\n########## ${p.name} (${p.id}) ##########`)
  for (const range of RANGES) {
    console.log(`\n--- ${range.label} ---`)
    const t = await totals(p.id, range)
    if (t) console.log(`SITE TOTAL: sessions=${t[0]} users=${t[1]} engagedSessions=${t[2]} keyEvents=${t[3]}`)
    const src = await allSources(p.id, range)
    if (src) {
      const pin = src.filter(s => /pin/i.test(s.sm))
      console.log(`PINTEREST-MATCHING ROWS: ${pin.length}`)
      pin.forEach(s => console.log(`  ${s.sm}: sessions=${s.sessions} users=${s.users} engaged=${s.engaged} keyEvents=${s.keyEvents}`))
      const pinS = pin.reduce((a, b) => a + b.sessions, 0)
      const pinU = pin.reduce((a, b) => a + b.users, 0)
      const pinE = pin.reduce((a, b) => a + b.engaged, 0)
      const pinK = pin.reduce((a, b) => a + b.keyEvents, 0)
      console.log(`  PINTEREST SUBTOTAL: sessions=${pinS} users=${pinU} engaged=${pinE} keyEvents=${pinK}`)
      console.log(`  TOP 12 SOURCES:`)
      src.slice(0, 12).forEach(s => console.log(`    ${s.sm}: sessions=${s.sessions} users=${s.users} engaged=${s.engaged} keyEvents=${s.keyEvents}`))
    }
    if (range.label === '90d') {
      const ev = await pinterestEvents(p.id, range)
      if (ev) { console.log(`  PINTEREST EVENTS (90d): ${ev.length}`); ev.slice(0, 30).forEach(e => console.log(`    ${e}`)) }
    }
  }
}
