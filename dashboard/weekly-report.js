import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const propertyId = '517632328'
const CREDENTIALS_PATH = path.join(__dirname, 'ga4-credentials.json')

const ga4Client = new BetaAnalyticsDataClient({ keyFilename: CREDENTIALS_PATH })

// --------------- Supabase setup ---------------
let supabase = null
let supabaseError = null
try {
  const secretsPath = path.join(__dirname, '..', 'secrets', 'api-keys.json')
  let supabaseUrl = 'https://kwtdpvnjewtahuxjyltn.supabase.co'
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (fs.existsSync(secretsPath)) {
    const secrets = JSON.parse(fs.readFileSync(secretsPath, 'utf8'))
    if (secrets.supabase) {
      serviceRoleKey = serviceRoleKey || secrets.supabase.service_role_key || ''
      supabaseUrl = secrets.supabase.url || supabaseUrl
    }
  }
  if (!serviceRoleKey) throw new Error('No service role key found')
  supabase = createClient(supabaseUrl, serviceRoleKey)
} catch (e) {
  supabaseError = e.message
  console.warn('⚠️  Supabase unavailable:', e.message)
}

// --------------- Helpers ---------------
function fmt(n) { return n != null ? Number(n).toLocaleString() : '—' }
function pct(n) { return n != null ? Number(n).toFixed(1) + '%' : '—' }
function safeDiv(a, b) { return b > 0 ? a / b : 0 }

async function sbQuery(sql) {
  if (!supabase) return { data: null, error: supabaseError }
  try {
    // Use rpc for raw SQL via postgrest — fall back to from() queries
    const { data, error } = await supabase.rpc('exec_sql', { query: sql })
    if (error) throw error
    return { data, error: null }
  } catch {
    // Direct table queries below
    return { data: null, error: 'rpc not available' }
  }
}

// Table-level queries (safer than raw SQL via client)
async function sbFrom(table, opts = {}) {
  if (!supabase) return { data: [], count: 0, error: supabaseError }
  try {
    let q = supabase.from(table).select(opts.select || '*', { count: 'exact' })
    if (opts.filters) {
      for (const [col, op, val] of opts.filters) {
        if (op === 'eq') q = q.eq(col, val)
        else if (op === 'neq') q = q.neq(col, val)
        else if (op === 'gte') q = q.gte(col, val)
        else if (op === 'lte') q = q.lte(col, val)
        else if (op === 'gt') q = q.gt(col, val)
        else if (op === 'lt') q = q.lt(col, val)
        else if (op === 'in') q = q.in(col, val)
        else if (op === 'ilike') q = q.ilike(col, val)
      }
    }
    if (opts.order) q = q.order(opts.order, { ascending: opts.ascending ?? false })
    if (opts.limit) q = q.limit(opts.limit)
    const { data, error, count } = await q
    return { data: data || [], count: count || 0, error: error?.message || null }
  } catch (e) {
    return { data: [], count: 0, error: e.message }
  }
}

// --------------- GA4 data ---------------
async function fetchGA4() {
  console.log('📊 Fetching GA4 data (3 weeks)...')

  const [overallRes] = await ga4Client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      { startDate: '7daysAgo', endDate: 'today' },
      { startDate: '14daysAgo', endDate: '8daysAgo' }
    ],
    metrics: [
      { name: 'totalUsers' }, { name: 'newUsers' }, { name: 'sessions' },
      { name: 'screenPageViews' }, { name: 'averageSessionDuration' },
      { name: 'bounceRate' }, { name: 'engagementRate' }
    ]
  })

  const [topPagesRes] = await ga4Client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [
      { name: 'screenPageViews' }, { name: 'totalUsers' },
      { name: 'averageSessionDuration' }, { name: 'bounceRate' }
    ],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 10
  })

  const [sourcesRes] = await ga4Client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [
      { name: 'sessions' }, { name: 'totalUsers' }, { name: 'engagementRate' }
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10
  })

  const [dailyRes] = await ga4Client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }
    ],
    orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }]
  })

  const [devicesRes] = await ga4Client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: '21daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'bounceRate' }]
  })

  // Parse overall — row 0 = this week, row 1 (via dateRange index) = last week
  const parseOverallRow = (row) => ({
    totalUsers: parseInt(row.metricValues[0].value),
    newUsers: parseInt(row.metricValues[1].value),
    sessions: parseInt(row.metricValues[2].value),
    pageViews: parseInt(row.metricValues[3].value),
    avgSessionDuration: parseFloat(row.metricValues[4].value),
    bounceRate: parseFloat(row.metricValues[5].value) * 100,
    engagementRate: parseFloat(row.metricValues[6].value) * 100
  })

  let thisWeek = null, lastWeek = null
  if (overallRes.rows) {
    for (const row of overallRes.rows) {
      const rangeIdx = row.dimensionValues?.[0]?.value || '0'
      if (rangeIdx === 'date_range_0' || overallRes.rows.indexOf(row) === 0) thisWeek = parseOverallRow(row)
      if (rangeIdx === 'date_range_1' || overallRes.rows.indexOf(row) === 1) lastWeek = parseOverallRow(row)
    }
    if (!thisWeek && overallRes.rows[0]) thisWeek = parseOverallRow(overallRes.rows[0])
    if (!lastWeek && overallRes.rows[1]) lastWeek = parseOverallRow(overallRes.rows[1])
  }

  const topPages = (topPagesRes.rows || []).map(r => ({
    path: r.dimensionValues[0].value,
    views: parseInt(r.metricValues[0].value),
    users: parseInt(r.metricValues[1].value),
    avgDuration: parseFloat(r.metricValues[2].value),
    bounceRate: parseFloat(r.metricValues[3].value) * 100
  }))

  const sources = (sourcesRes.rows || []).map(r => ({
    source: r.dimensionValues[0].value,
    medium: r.dimensionValues[1].value,
    sessions: parseInt(r.metricValues[0].value),
    users: parseInt(r.metricValues[1].value),
    engagementRate: parseFloat(r.metricValues[2].value) * 100
  }))

  const daily = (dailyRes.rows || []).map(r => {
    const d = r.dimensionValues[0].value
    return {
      date: `${d.substring(0, 4)}-${d.substring(4, 6)}-${d.substring(6, 8)}`,
      users: parseInt(r.metricValues[0].value),
      sessions: parseInt(r.metricValues[1].value),
      pageViews: parseInt(r.metricValues[2].value)
    }
  })

  const devices = {}
  ;(devicesRes.rows || []).forEach(r => {
    devices[r.dimensionValues[0].value] = {
      sessions: parseInt(r.metricValues[0].value),
      users: parseInt(r.metricValues[1].value),
      bounceRate: parseFloat(r.metricValues[2].value) * 100
    }
  })

  // Bot-burst guard (bead yb7q): flag days >3x the trailing median — the
  // recurring direct/desktop/NY crawler burst (Jul 14 and Jul 28, 2026 hit
  // 71 and 56 sessions vs a ~15 median) — and compute a spike-excluded WoW
  // so one burst day can't fake a surge or a crash in the headline numbers.
  const sortedSessions = daily.map(d => d.sessions).sort((a, b) => a - b)
  const median = sortedSessions.length ? sortedSessions[Math.floor(sortedSessions.length / 2)] : 0
  const spikeDays = median >= 5 ? daily.filter(d => d.sessions > 3 * median) : []
  const spikeDates = new Set(spikeDays.map(d => d.date))
  let weekExSpike = null
  const last14 = daily.slice(-14)
  if (last14.length === 14 && spikeDates.size > 0) {
    const sum = rows => rows.filter(d => !spikeDates.has(d.date)).reduce((s, d) => s + d.sessions, 0)
    weekExSpike = { current: sum(last14.slice(7)), previous: sum(last14.slice(0, 7)) }
  }

  return { thisWeek, lastWeek, topPages, sources, daily, devices, median21d: median, spikeDays, weekExSpike }
}

// --------------- Test / internal account filtering ---------------
const EXCLUDED_EMAILS = ['iambrew@gmail.com', 'mbrew@telus.net']
const EXCLUDED_DOMAINS = ['@test.ketodial.com', '@example.com']

function isTestEmail(email) {
  if (!email) return false
  const lower = email.toLowerCase()
  if (EXCLUDED_EMAILS.includes(lower)) return true
  // Brew's own plus-addressed test accounts (iambrew+funneltest0720@ etc.).
  // Never filter on '+' alone — real readers use plus-addressing.
  if (lower.startsWith('iambrew+')) return true
  return EXCLUDED_DOMAINS.some(d => lower.includes(d))
}

function filterTestRows(rows) {
  return (rows || []).filter(r => !isTestEmail(r.email))
}

// --------------- Supabase data ---------------
async function fetchSupabaseData() {
  if (!supabase) return null
  console.log('📊 Fetching Supabase data...')

  const now = new Date()
  const weekAgo = new Date(now - 7 * 24 * 3600 * 1000).toISOString()
  const monthAgo = new Date(now - 30 * 24 * 3600 * 1000).toISOString()
  const sixWeeksAgo = new Date(now - 42 * 24 * 3600 * 1000).toISOString()

  // --- Calculator sessions (exclude test/internal — funnel tests land here too) ---
  const calcAllRaw = await sbFrom('calculator_sessions_v2', { select: 'id,email,gender,age,goal,diet_type,device_type,created_at,paid,amount_paid' })
  const calcAll = { ...calcAllRaw, data: filterTestRows(calcAllRaw.data) }
  const calcWeek = calcAll.data.filter(r => r.created_at >= weekAgo)

  // --- CW Newsletter (exclude test/internal) ---
  const cwNewsRaw = await sbFrom('newsletter_subscribers', {
    select: 'id,email,status,site,created_at',
    filters: [['site', 'eq', 'cw']]
  })
  const cwNews = { ...cwNewsRaw, data: filterTestRows(cwNewsRaw.data) }

  // --- CW Drip (exclude test/internal) ---
  const cwDripRaw = await sbFrom('drip_subscribers', {
    select: 'id,email,status,current_day,completed,site,created_at',
    filters: [['site', 'eq', 'cw']]
  })
  const cwDrip = { ...cwDripRaw, data: filterTestRows(cwDripRaw.data) }

  // --- Drip events (exclude test/internal emails) ---
  const dripEvents = await sbFrom('drip_events', {
    select: 'id,email,event_type,subject,created_at',
    filters: [['created_at', 'gte', monthAgo]]
  })
  const filteredEvents = filterTestRows(dripEvents.data)

  // --- KD Newsletter (exclude test/internal) ---
  const kdNewsRaw = await sbFrom('newsletter_subscribers', {
    select: 'id,email,status,site,created_at',
    filters: [['site', 'eq', 'kd']]
  })
  const kdNews = { ...kdNewsRaw, data: filterTestRows(kdNewsRaw.data) }

  // --- KD Drip (exclude test/internal) ---
  const kdDripRaw = await sbFrom('drip_subscribers', {
    select: 'id,email,status,current_day,completed,site,created_at',
    filters: [['site', 'eq', 'kd']]
  })
  const kdDrip = { ...kdDripRaw, data: filterTestRows(kdDripRaw.data) }

  // --- KD Coach (include email for filtering) ---
  let coachMembersRaw = await sbFrom('coach_members', { select: 'id,email,status,created_at' })
  let coachCheckinsRaw = await sbFrom('coach_checkins', { select: 'id,email,created_at' })
  let coachMessagesRaw = await sbFrom('coach_messages', { select: 'id,email,created_at' })
  let coachWaitlistRaw = await sbFrom('coach_waitlist', { select: 'id,email' })

  // Filter test/internal accounts from coach tables
  const coachMembers = filterTestRows(coachMembersRaw.data)
  const coachCheckins = filterTestRows(coachCheckinsRaw.data)
  const coachMessages = filterTestRows(coachMessagesRaw.data)
  const coachWaitlist = filterTestRows(coachWaitlistRaw.data)

  return {
    calculator: { all: calcAll.data || [], week: calcWeek, error: calcAll.error },
    cwNewsletter: { data: cwNews.data || [], error: cwNews.error },
    cwDrip: { data: cwDrip.data || [], error: cwDrip.error },
    dripEvents: { data: filteredEvents, error: dripEvents.error },
    kdNewsletter: { data: kdNews.data || [], error: kdNews.error },
    kdDrip: { data: kdDrip.data || [], error: kdDrip.error },
    coach: {
      members: coachMembers,
      checkins: coachCheckins,
      messages: coachMessages,
      waitlist: coachWaitlist,
      error: coachMembersRaw.error
    },
    weekAgo, monthAgo
  }
}

// --------------- HTML Generation ---------------
function growthArrow(thisVal, lastVal) {
  if (!lastVal || lastVal === 0) return ''
  const pctChange = ((thisVal - lastVal) / lastVal * 100).toFixed(1)
  const color = pctChange >= 0 ? '#4ade80' : '#f87171'
  const arrow = pctChange >= 0 ? '▲' : '▼'
  return `<span style="color:${color};font-size:0.85em;margin-left:6px">${arrow} ${Math.abs(pctChange)}%</span>`
}

function metricCard(label, value, sub = '', color = '#ffd700') {
  return `<div class="metric-card">
    <div class="metric-label">${label}</div>
    <div class="metric-value" style="color:${color}">${value}</div>
    ${sub ? `<div class="metric-sub">${sub}</div>` : ''}
  </div>`
}

function unavailableCard(section) {
  return `<div class="card"><h2>${section}</h2><p style="color:#f87171">Supabase unavailable — ${supabaseError || 'connection failed'}</p></div>`
}

function generateHTML(ga4, sb) {
  const now = new Date()
  const timestamp = now.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })

  // --- GA4 section ---
  const tw = ga4.thisWeek || {}
  const lw = ga4.lastWeek || {}

  // Spike-day callout: raw WoW arrows above are unreliable when a crawler
  // burst lands in either week, so say so right under them.
  let spikeBanner = ''
  if ((ga4.spikeDays || []).length > 0) {
    const dayList = ga4.spikeDays.map(d => `${d.date} (${d.sessions} sessions)`).join(', ')
    const ex = ga4.weekExSpike
    const exLine = ex
      ? ` Excluding spike days, sessions were ${fmt(ex.previous)} last week → ${fmt(ex.current)} this week.`
      : ''
    spikeBanner = `<div style="margin-top:12px;padding:10px 14px;background:#2a2216;border:1px solid #7c5e10;border-radius:8px;font-size:0.85rem;color:#fbbf24">
      ⚠️ Crawler-burst day(s) detected (&gt;3× the ${ga4.median21d}/day median): ${dayList}.
      These match the direct/desktop bot signature, not readers — the raw arrows above include them.${exLine}
    </div>`
  }

  const maxPageViews = Math.max(...ga4.daily.map(d => d.pageViews), 1)

  const dailyBars = ga4.daily.map(d => {
    const h = Math.round((d.pageViews / maxPageViews) * 120)
    const dayLabel = d.date.substring(5) // MM-DD
    return `<div class="bar-col">
      <div class="bar-value">${d.pageViews}</div>
      <div class="bar" style="height:${h}px;background:linear-gradient(180deg,#ffd700,#ff8c00)"></div>
      <div class="bar-label">${dayLabel}</div>
    </div>`
  }).join('')

  const topPagesRows = ga4.topPages.map((p, i) => `<tr>
    <td>${i + 1}</td>
    <td title="${p.path}" style="max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.path}</td>
    <td>${fmt(p.views)}</td>
    <td>${fmt(p.users)}</td>
    <td>${pct(p.bounceRate)}</td>
  </tr>`).join('')

  const sourcesRows = ga4.sources.map(s => `<tr>
    <td>${s.source}</td>
    <td>${s.medium}</td>
    <td>${fmt(s.sessions)}</td>
    <td>${fmt(s.users)}</td>
    <td>${pct(s.engagementRate)}</td>
  </tr>`).join('')

  const totalDeviceSessions = Object.values(ga4.devices).reduce((s, d) => s + d.sessions, 0) || 1
  const deviceBars = Object.entries(ga4.devices).map(([name, d]) => {
    const pctVal = (d.sessions / totalDeviceSessions * 100).toFixed(1)
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span>${name}</span><span>${pctVal}% (${fmt(d.sessions)} sessions)</span>
      </div>
      <div style="background:#2a2a4a;border-radius:6px;height:18px;overflow:hidden">
        <div style="width:${pctVal}%;height:100%;background:linear-gradient(90deg,#6366f1,#a78bfa);border-radius:6px"></div>
      </div>
    </div>`
  }).join('')

  // --- Calculator section ---
  let calcSection = ''
  if (!sb) {
    calcSection = unavailableCard('Calculator Demographics')
  } else if (sb.calculator.error) {
    calcSection = `<div class="card"><h2>Calculator Demographics</h2><p style="color:#f87171">Error: ${sb.calculator.error}</p></div>`
  } else {
    const all = sb.calculator.all
    const week = sb.calculator.week

    // Gender
    const genderCounts = {}
    all.forEach(r => { const g = (r.gender || 'unknown').toLowerCase(); genderCounts[g] = (genderCounts[g] || 0) + 1 })
    const genderTotal = all.length || 1
    const genderBars = Object.entries(genderCounts).sort((a, b) => b[1] - a[1]).map(([g, c]) => {
      const p = (c / genderTotal * 100).toFixed(1)
      const colors = { female: '#ec4899', male: '#3b82f6', other: '#a78bfa', unknown: '#6b7280' }
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>${g}</span><span>${p}% (${c})</span></div>
        <div style="background:#2a2a4a;border-radius:6px;height:14px;overflow:hidden">
          <div style="width:${p}%;height:100%;background:${colors[g] || '#6b7280'};border-radius:6px"></div>
        </div>
      </div>`
    }).join('')

    // Age brackets
    const ages = all.map(r => r.age).filter(a => a != null && a > 0)
    const avgAge = ages.length > 0 ? (ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1) : '—'
    const ageBrackets = { 'Under 25': 0, '25-34': 0, '35-44': 0, '45+': 0 }
    ages.forEach(a => {
      if (a < 25) ageBrackets['Under 25']++
      else if (a < 35) ageBrackets['25-34']++
      else if (a < 45) ageBrackets['35-44']++
      else ageBrackets['45+']++
    })
    const ageTotal = ages.length || 1
    const ageBars = Object.entries(ageBrackets).map(([label, c]) => {
      const p = (c / ageTotal * 100).toFixed(1)
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>${label}</span><span>${p}% (${c})</span></div>
        <div style="background:#2a2a4a;border-radius:6px;height:14px;overflow:hidden">
          <div style="width:${p}%;height:100%;background:#fbbf24;border-radius:6px"></div>
        </div>
      </div>`
    }).join('')

    // Goal breakdown
    const goalCounts = {}
    all.forEach(r => { const g = (r.goal || 'unknown').toLowerCase(); goalCounts[g] = (goalCounts[g] || 0) + 1 })
    const goalBars = Object.entries(goalCounts).sort((a, b) => b[1] - a[1]).map(([g, c]) => {
      const p = (c / genderTotal * 100).toFixed(1)
      return `<div style="margin-bottom:6px;display:flex;justify-content:space-between"><span>${g}</span><span>${p}% (${c})</span></div>`
    }).join('')

    // Diet type
    const dietCounts = {}
    all.forEach(r => { const d = (r.diet_type || 'unknown').toLowerCase(); dietCounts[d] = (dietCounts[d] || 0) + 1 })
    const dietBars = Object.entries(dietCounts).sort((a, b) => b[1] - a[1]).map(([d, c]) => {
      const p = (c / genderTotal * 100).toFixed(1)
      return `<div style="margin-bottom:6px;display:flex;justify-content:space-between"><span>${d}</span><span>${p}% (${c})</span></div>`
    }).join('')

    // Device type
    const devCounts = {}
    all.forEach(r => { const d = (r.device_type || 'unknown').toLowerCase(); devCounts[d] = (devCounts[d] || 0) + 1 })
    const devBars = Object.entries(devCounts).sort((a, b) => b[1] - a[1]).map(([d, c]) => {
      const p = (c / genderTotal * 100).toFixed(1)
      return `<div style="margin-bottom:6px;display:flex;justify-content:space-between"><span>${d}</span><span>${p}% (${c})</span></div>`
    }).join('')

    // Paid conversions
    const paidSessions = all.filter(r => r.paid)
    const totalRevenue = paidSessions.reduce((s, r) => s + (parseFloat(r.amount_paid) || 0), 0)

    // Weekly trend (last 6 weeks)
    const weeklyTrend = []
    for (let w = 5; w >= 0; w--) {
      const wStart = new Date(now - (w + 1) * 7 * 24 * 3600 * 1000)
      const wEnd = new Date(now - w * 7 * 24 * 3600 * 1000)
      const wSessions = all.filter(r => {
        const d = new Date(r.created_at)
        return d >= wStart && d < wEnd
      })
      const wLabel = wStart.toISOString().substring(5, 10)
      weeklyTrend.push({ label: wLabel, count: wSessions.length })
    }
    const maxWeekly = Math.max(...weeklyTrend.map(w => w.count), 1)
    const weeklyBars = weeklyTrend.map(w => {
      const h = Math.round((w.count / maxWeekly) * 80)
      return `<div class="bar-col"><div class="bar-value">${w.count}</div><div class="bar" style="height:${h}px;background:#6366f1"></div><div class="bar-label">${w.label}</div></div>`
    }).join('')

    calcSection = `<div class="card">
      <h2>Calculator Demographics</h2>
      <div class="metrics-grid">
        ${metricCard('Total Sessions', fmt(all.length))}
        ${metricCard('This Week', fmt(week.length), '', '#4ade80')}
        ${metricCard('Average Age', avgAge)}
        ${metricCard('Paid Conversions', fmt(paidSessions.length), '$' + totalRevenue.toFixed(2) + ' revenue', '#fbbf24')}
      </div>
      <div class="two-col">
        <div><h3>Gender Split</h3>${genderBars}</div>
        <div><h3>Age Brackets</h3>${ageBars}</div>
      </div>
      <div class="two-col" style="margin-top:16px">
        <div><h3>Goal</h3>${goalBars}</div>
        <div><h3>Diet Type</h3>${dietBars}</div>
      </div>
      <div class="two-col" style="margin-top:16px">
        <div><h3>Device Type</h3>${devBars}</div>
        <div><h3>Weekly Trend (6 weeks)</h3><div class="bar-chart" style="height:130px">${weeklyBars}</div></div>
      </div>
    </div>`
  }

  // --- Email & Newsletter ---
  let emailSection = ''
  if (!sb) {
    emailSection = unavailableCard('Email & Newsletter')
  } else {
    const weekAgo = sb.weekAgo
    const monthAgo = sb.monthAgo

    // CW Newsletter
    const cwAll = sb.cwNewsletter.data
    const cwActive = cwAll.filter(r => r.status === 'active')
    const cwUnsub = cwAll.filter(r => r.status === 'unsubscribed')
    const cwNewWeek = cwAll.filter(r => r.created_at >= weekAgo)
    const cwNewMonth = cwAll.filter(r => r.created_at >= monthAgo)

    // CW Drip
    const dripAll = sb.cwDrip.data
    const dripActive = dripAll.filter(r => r.status === 'active' && !r.completed)
    const dripCompleted = dripAll.filter(r => r.completed)
    const dripUnsub = dripAll.filter(r => r.status === 'unsubscribed')
    const dripNewWeek = dripAll.filter(r => r.created_at >= weekAgo)

    // Email engagement
    const events = sb.dripEvents.data
    const sent = events.filter(e => e.event_type === 'sent').length
    const delivered = events.filter(e => e.event_type === 'delivered').length
    const opened = events.filter(e => e.event_type === 'opened').length
    const clicked = events.filter(e => e.event_type === 'clicked').length
    const bounced = events.filter(e => e.event_type === 'bounced').length
    const complained = events.filter(e => e.event_type === 'complained').length
    const openRate = safeDiv(opened, delivered) * 100
    const clickRate = safeDiv(clicked, opened) * 100

    // Funnel visualization
    const funnelMax = Math.max(sent, 1)
    const funnelSteps = [
      { label: 'Sent', count: sent, color: '#6366f1' },
      { label: 'Delivered', count: delivered, color: '#3b82f6' },
      { label: 'Opened', count: opened, color: '#22c55e' },
      { label: 'Clicked', count: clicked, color: '#fbbf24' }
    ]
    const funnelBars = funnelSteps.map(s => {
      const w = Math.max((s.count / funnelMax * 100), 2)
      return `<div style="margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px"><span>${s.label}</span><span>${fmt(s.count)}</span></div>
        <div style="background:#2a2a4a;border-radius:6px;height:22px;overflow:hidden">
          <div style="width:${w}%;height:100%;background:${s.color};border-radius:6px"></div>
        </div>
      </div>`
    }).join('')

    // Subscriber list (CW newsletter — last 20)
    const cwRecentSubs = [...cwAll].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 20)
    const cwSubRows = cwRecentSubs.map(r => `<tr>
      <td style="font-size:0.85em">${r.email || '—'}</td>
      <td>${r.created_at ? r.created_at.substring(0, 10) : '—'}</td>
      <td><span class="status-badge ${r.status === 'active' ? 'status-good' : 'status-bad'}">${r.status}</span></td>
    </tr>`).join('')

    // Drip subscriber list (last 20)
    const dripRecent = [...dripAll].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 20)
    const dripSubRows = dripRecent.map(r => `<tr>
      <td style="font-size:0.85em">${r.email || '—'}</td>
      <td>Day ${r.current_day || '?'}</td>
      <td>${r.completed ? 'Completed' : r.status}</td>
      <td>${r.created_at ? r.created_at.substring(0, 10) : '—'}</td>
    </tr>`).join('')

    emailSection = `<div class="card">
      <h2>Email & Newsletter</h2>
      <h3 style="margin-top:8px;color:#ffd700">CW Newsletter</h3>
      <div class="metrics-grid">
        ${metricCard('Total Subscribers', fmt(cwAll.length))}
        ${metricCard('Active', fmt(cwActive.length), '', '#4ade80')}
        ${metricCard('Unsubscribed', fmt(cwUnsub.length), '', '#f87171')}
        ${metricCard('New This Week', fmt(cwNewWeek.length))}
        ${metricCard('New This Month', fmt(cwNewMonth.length))}
      </div>
      ${cwSubRows ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:#a78bfa">Recent Subscribers (${Math.min(cwAll.length, 20)})</summary>
        <table class="data-table" style="margin-top:8px"><thead><tr><th>Email</th><th>Joined</th><th>Status</th></tr></thead><tbody>${cwSubRows}</tbody></table>
      </details>` : ''}

      <h3 style="margin-top:24px;color:#ffd700">7-Day Drip (CW)</h3>
      <div class="metrics-grid">
        ${metricCard('Total', fmt(dripAll.length))}
        ${metricCard('Active in Drip', fmt(dripActive.length), '', '#4ade80')}
        ${metricCard('Completed', fmt(dripCompleted.length), '', '#6366f1')}
        ${metricCard('Unsubscribed', fmt(dripUnsub.length), '', '#f87171')}
        ${metricCard('New This Week', fmt(dripNewWeek.length))}
      </div>
      ${dripSubRows ? `<details style="margin-top:12px"><summary style="cursor:pointer;color:#a78bfa">Recent Drip Subscribers (${Math.min(dripAll.length, 20)})</summary>
        <table class="data-table" style="margin-top:8px"><thead><tr><th>Email</th><th>Day</th><th>Status</th><th>Joined</th></tr></thead><tbody>${dripSubRows}</tbody></table>
      </details>` : ''}

      <h3 style="margin-top:24px;color:#ffd700">Email Engagement (Last 30 Days)</h3>
      <div class="metrics-grid">
        ${metricCard('Open Rate', pct(openRate), `${fmt(opened)} / ${fmt(delivered)}`, openRate > 30 ? '#4ade80' : '#fbbf24')}
        ${metricCard('Click Rate', pct(clickRate), `${fmt(clicked)} / ${fmt(opened)}`, clickRate > 5 ? '#4ade80' : '#fbbf24')}
        ${metricCard('Bounced', fmt(bounced), '', bounced > 5 ? '#f87171' : '#4ade80')}
        ${metricCard('Complaints', fmt(complained), '', complained > 0 ? '#f87171' : '#4ade80')}
      </div>
      <h4 style="margin-top:16px">Funnel</h4>
      ${funnelBars}
    </div>`
  }

  // --- KetoDial Stats ---
  let kdSection = ''
  if (!sb) {
    kdSection = unavailableCard('KetoDial Stats')
  } else {
    const weekAgo = sb.weekAgo
    const monthAgo = sb.monthAgo

    // KD Newsletter
    const kdAll = sb.kdNewsletter.data
    const kdActive = kdAll.filter(r => r.status === 'active')
    const kdUnsub = kdAll.filter(r => r.status === 'unsubscribed')
    const kdNewWeek = kdAll.filter(r => r.created_at >= weekAgo)
    const kdNewMonth = kdAll.filter(r => r.created_at >= monthAgo)

    // KD Drip
    const kdDripAll = sb.kdDrip.data
    const kdDripActive = kdDripAll.filter(r => r.status === 'active' && !r.completed)
    const kdDripCompleted = kdDripAll.filter(r => r.completed)
    const kdDripUnsub = kdDripAll.filter(r => r.status === 'unsubscribed')
    const kdDripNewWeek = kdDripAll.filter(r => r.created_at >= weekAgo)

    // Coach
    const cm = sb.coach
    const coachActive = cm.members.filter(m => m.status === 'active')
    const coachCheckinsWeek = cm.checkins.filter(c => c.created_at >= weekAgo)
    const coachMsgsWeek = cm.messages.filter(m => m.created_at >= weekAgo)

    kdSection = `<div class="card">
      <h2>KetoDial Stats</h2>
      <h3 style="margin-top:8px;color:#ffd700">KD Newsletter</h3>
      <div class="metrics-grid">
        ${metricCard('Total', fmt(kdAll.length))}
        ${metricCard('Active', fmt(kdActive.length), '', '#4ade80')}
        ${metricCard('Unsubscribed', fmt(kdUnsub.length), '', '#f87171')}
        ${metricCard('New This Week', fmt(kdNewWeek.length))}
        ${metricCard('New This Month', fmt(kdNewMonth.length))}
      </div>

      <h3 style="margin-top:24px;color:#ffd700">KD Drip</h3>
      <div class="metrics-grid">
        ${metricCard('Total', fmt(kdDripAll.length))}
        ${metricCard('Active in Drip', fmt(kdDripActive.length), '', '#4ade80')}
        ${metricCard('Completed', fmt(kdDripCompleted.length), '', '#6366f1')}
        ${metricCard('Unsubscribed', fmt(kdDripUnsub.length), '', '#f87171')}
        ${metricCard('New This Week', fmt(kdDripNewWeek.length))}
      </div>

      <h3 style="margin-top:24px;color:#ffd700">KD Coach</h3>
      <div class="metrics-grid">
        ${metricCard('Total Members', fmt(cm.members.length))}
        ${metricCard('Active', fmt(coachActive.length), '', '#4ade80')}
        ${metricCard('Checkins (All)', fmt(cm.checkins.length))}
        ${metricCard('Checkins (Week)', fmt(coachCheckinsWeek.length))}
        ${metricCard('Messages (All)', fmt(cm.messages.length))}
        ${metricCard('Messages (Week)', fmt(coachMsgsWeek.length))}
        ${metricCard('Waitlist', fmt(cm.waitlist.length), '', '#fbbf24')}
      </div>
      ${cm.error ? `<p style="color:#fbbf24;margin-top:8px;font-size:0.85em">Note: some coach tables may not exist yet — ${cm.error}</p>` : ''}
    </div>`
  }

  // --- Unsubscribes & Health ---
  let healthSection = ''
  if (!sb) {
    healthSection = unavailableCard('Unsubscribes & Health')
  } else {
    const allUnsubs = []

    // CW newsletter unsubs
    sb.cwNewsletter.data.filter(r => r.status === 'unsubscribed').forEach(r => {
      allUnsubs.push({ email: r.email, source: 'CW Newsletter', date: r.created_at?.substring(0, 10) || '—' })
    })
    // CW drip unsubs
    sb.cwDrip.data.filter(r => r.status === 'unsubscribed').forEach(r => {
      allUnsubs.push({ email: r.email, source: 'CW Drip', date: r.created_at?.substring(0, 10) || '—' })
    })
    // KD newsletter unsubs
    sb.kdNewsletter.data.filter(r => r.status === 'unsubscribed').forEach(r => {
      allUnsubs.push({ email: r.email, source: 'KD Newsletter', date: r.created_at?.substring(0, 10) || '—' })
    })
    // KD drip unsubs
    sb.kdDrip.data.filter(r => r.status === 'unsubscribed').forEach(r => {
      allUnsubs.push({ email: r.email, source: 'KD Drip', date: r.created_at?.substring(0, 10) || '—' })
    })

    const unsubRows = allUnsubs.slice(0, 30).map(u => `<tr>
      <td style="font-size:0.85em">${u.email}</td>
      <td>${u.source}</td>
      <td>${u.date}</td>
    </tr>`).join('')

    // Bounce/complaint events
    const events = sb.dripEvents.data
    const bounceEvents = events.filter(e => e.event_type === 'bounced' || e.event_type === 'complained')
    const bounceRows = bounceEvents.slice(0, 20).map(e => `<tr>
      <td style="font-size:0.85em">${e.email}</td>
      <td><span class="status-badge ${e.event_type === 'bounced' ? 'status-warn' : 'status-bad'}">${e.event_type}</span></td>
      <td style="font-size:0.85em">${e.subject || '—'}</td>
      <td>${e.created_at?.substring(0, 10) || '—'}</td>
    </tr>`).join('')

    healthSection = `<div class="card">
      <h2>Unsubscribes & Health</h2>
      <div class="metrics-grid">
        ${metricCard('Total Unsubscribes', fmt(allUnsubs.length), 'across all lists', allUnsubs.length > 10 ? '#f87171' : '#fbbf24')}
        ${metricCard('Bounces (30d)', fmt(bounceEvents.filter(e => e.event_type === 'bounced').length), '', '#fbbf24')}
        ${metricCard('Complaints (30d)', fmt(bounceEvents.filter(e => e.event_type === 'complained').length), '', bounceEvents.filter(e => e.event_type === 'complained').length > 0 ? '#f87171' : '#4ade80')}
      </div>
      ${unsubRows ? `<details style="margin-top:16px"><summary style="cursor:pointer;color:#a78bfa">Unsubscribed Users (${allUnsubs.length})</summary>
        <table class="data-table" style="margin-top:8px"><thead><tr><th>Email</th><th>Source</th><th>Date</th></tr></thead><tbody>${unsubRows}</tbody></table>
      </details>` : '<p style="margin-top:12px;color:#4ade80">No unsubscribes found.</p>'}
      ${bounceRows ? `<details style="margin-top:16px"><summary style="cursor:pointer;color:#a78bfa">Bounce/Complaint Events (${bounceEvents.length})</summary>
        <table class="data-table" style="margin-top:8px"><thead><tr><th>Email</th><th>Type</th><th>Subject</th><th>Date</th></tr></thead><tbody>${bounceRows}</tbody></table>
      </details>` : ''}
    </div>`
  }

  // --- Assemble full HTML ---
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carnivore Weekly — Weekly Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e;
      color: #e0e0e0;
      padding: 24px;
      line-height: 1.6;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 {
      font-size: 2.4rem;
      margin-bottom: 6px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle { color: #888; font-size: 0.95rem; margin-bottom: 28px; }
    h2 {
      font-size: 1.5rem;
      color: #ffd700;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #333;
    }
    h3 { font-size: 1.1rem; color: #c0c0c0; margin-bottom: 12px; }
    h4 { font-size: 0.95rem; color: #aaa; margin-bottom: 8px; }
    .card {
      background: #16213e;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid #1f3460;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .metric-card {
      background: #1a1a2e;
      border-radius: 10px;
      padding: 16px;
      text-align: center;
      border: 1px solid #2a2a4a;
    }
    .metric-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .metric-value { font-size: 1.6rem; font-weight: 700; }
    .metric-sub { font-size: 0.8rem; color: #888; margin-top: 4px; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    @media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    .data-table th {
      text-align: left; padding: 8px 10px; background: #1a1a2e;
      color: #ffd700; border-bottom: 2px solid #333; font-size: 0.8rem;
      text-transform: uppercase; letter-spacing: 0.5px;
    }
    .data-table td { padding: 7px 10px; border-bottom: 1px solid #2a2a4a; }
    .data-table tr:hover { background: #1f2d50; }
    .status-badge {
      padding: 2px 8px; border-radius: 10px; font-size: 0.75rem; font-weight: 600;
    }
    .status-good { background: #064e3b; color: #4ade80; }
    .status-bad { background: #450a0a; color: #f87171; }
    .status-warn { background: #451a03; color: #fbbf24; }
    .bar-chart {
      display: flex; align-items: flex-end; gap: 4px; padding: 10px 0;
    }
    .bar-col { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 0; }
    .bar { border-radius: 4px 4px 0 0; min-width: 8px; width: 100%; max-width: 40px; transition: height 0.3s; }
    .bar-value { font-size: 0.65rem; color: #aaa; margin-bottom: 3px; white-space: nowrap; }
    .bar-label { font-size: 0.6rem; color: #666; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 48px; }
    details summary { font-weight: 600; font-size: 0.9rem; }
    details summary:hover { color: #ffd700; }
    .nav-bar {
      display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;
      padding: 12px 16px; background: #16213e; border-radius: 10px; border: 1px solid #1f3460;
    }
    .nav-bar a {
      color: #a78bfa; text-decoration: none; font-size: 0.85rem; font-weight: 500;
      padding: 4px 10px; border-radius: 6px; transition: background 0.2s;
    }
    .nav-bar a:hover { background: #2a2a4a; color: #ffd700; }
  </style>
</head>
<body>
<div class="container">
  <h1>Carnivore Weekly — Weekly Report</h1>
  <div class="subtitle">Generated: ${timestamp}</div>

  <div class="nav-bar">
    <a href="#site-overview">Site Overview</a>
    <a href="#calculator">Calculator</a>
    <a href="#email">Email & Newsletter</a>
    <a href="#ketodial">KetoDial</a>
    <a href="#health">Health</a>
  </div>

  <!-- Section 1: Site Overview -->
  <div class="card" id="site-overview">
    <h2>CW Site Overview (GA4) — Last 7 Days</h2>
    <div class="metrics-grid">
      ${metricCard('Total Users', fmt(tw.totalUsers) + growthArrow(tw.totalUsers, lw?.totalUsers))}
      ${metricCard('Sessions', fmt(tw.sessions) + growthArrow(tw.sessions, lw?.sessions))}
      ${metricCard('Page Views', fmt(tw.pageViews) + growthArrow(tw.pageViews, lw?.pageViews))}
      ${metricCard('Engagement Rate', pct(tw.engagementRate), '', tw.engagementRate > 50 ? '#4ade80' : '#fbbf24')}
      ${metricCard('Bounce Rate', pct(tw.bounceRate), '', tw.bounceRate < 60 ? '#4ade80' : '#f87171')}
      ${metricCard('Avg Session', (tw.avgSessionDuration / 60).toFixed(1) + ' min')}
    </div>
    ${spikeBanner}

    <div class="two-col">
      <div>
        <h3>Top 10 Pages (3 Weeks)</h3>
        <table class="data-table">
          <thead><tr><th>#</th><th>Page</th><th>Views</th><th>Users</th><th>Bounce</th></tr></thead>
          <tbody>${topPagesRows}</tbody>
        </table>
      </div>
      <div>
        <h3>Traffic Sources (3 Weeks)</h3>
        <table class="data-table">
          <thead><tr><th>Source</th><th>Medium</th><th>Sessions</th><th>Users</th><th>Engagement</th></tr></thead>
          <tbody>${sourcesRows}</tbody>
        </table>
      </div>
    </div>

    <h3 style="margin-top:24px">Daily Trend (3 Weeks — Page Views)</h3>
    <div class="bar-chart" style="height:160px">
      ${dailyBars}
    </div>

    <h3 style="margin-top:24px">Device Breakdown</h3>
    ${deviceBars}
  </div>

  <!-- Section 2: Calculator -->
  <div id="calculator">${calcSection}</div>

  <!-- Section 3: Email -->
  <div id="email">${emailSection}</div>

  <!-- Section 4: KetoDial -->
  <div id="ketodial">${kdSection}</div>

  <!-- Section 5: Health -->
  <div id="health">${healthSection}</div>

  <div style="margin-top:32px;padding:16px 20px;background:#16213e;border-radius:10px;border:1px solid #1f3460;font-size:0.8rem;color:#666;text-align:center">
    Test accounts (@test.ketodial.com, iambrew+*) and internal accounts (iambrew@gmail.com) are excluded from all counts.
  </div>

</div>
</body>
</html>`

  return html
}

// --------------- Main ---------------
async function main() {
  console.log('🚀 Carnivore Weekly — Weekly Report Generator\n')

  let ga4Data
  try {
    ga4Data = await fetchGA4()
  } catch (e) {
    console.error('❌ GA4 fetch failed:', e.message)
    // Create minimal fallback
    ga4Data = {
      thisWeek: { totalUsers: 0, newUsers: 0, sessions: 0, pageViews: 0, avgSessionDuration: 0, bounceRate: 0, engagementRate: 0 },
      lastWeek: null,
      topPages: [],
      sources: [],
      daily: [],
      devices: {}
    }
  }

  let sbData = null
  try {
    sbData = await fetchSupabaseData()
  } catch (e) {
    console.error('⚠️  Supabase fetch failed:', e.message)
    supabaseError = e.message
  }

  const html = generateHTML(ga4Data, sbData)
  const outPath = path.join(__dirname, 'weekly-report.html')
  fs.writeFileSync(outPath, html)
  console.log(`\n✅ Report generated → ${outPath}`)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
