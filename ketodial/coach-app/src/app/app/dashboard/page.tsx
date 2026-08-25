'use client'

import { useState, useEffect } from 'react'
import { KdLogo, CheckIcon } from '@/components/landing/KdBrand'
import '@/styles/coach.css'
import '@/styles/member.css'
import '@/styles/dashboard.css'

interface DashboardState {
  state: string
  member?: {
    display_name: string
    tier: string
    founding_member: boolean
    diet_type: string
    current_weight: number
    goal_weight: number
    start_weight: number
  }
  access?: { status: string; can_access: boolean; requires_billing_action: boolean; cancel_at_period_end: boolean }
  check_in?: { status: string; can_submit: boolean; submitted_at: string | null; bonus_credits_available: number }
  coach?: { latest_response_preview: string | null; latest_response_at: string | null; has_unread_response: boolean }
  focus?: { body: string; source: string } | null
  notes?: { can_add_note: boolean }
  billing?: { portal_url_available: boolean }
  onboarding?: { current_step: number }
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardState | null>(null)
  const [noteText, setNoteText] = useState('')
  const [sendingNote, setSendingNote] = useState(false)
  const [noteError, setNoteError] = useState('')
  const [noteSent, setNoteSent] = useState(false)

  useEffect(() => {
    fetch('/api/member/dashboard-state')
      .then(r => r.json())
      .then(d => {
        if (d.state === 'onboarding_required') {
          window.location.href = '/app/onboarding'
          return
        }
        if (d.state === 'billing_required') {
          // Show billing message
        }
        setData(d)
      })
  }, [])

  async function sendNote() {
    if (!noteText.trim() || sendingNote) return
    setSendingNote(true)
    setNoteError('')
    setNoteSent(false)
    try {
      const res = await fetch('/api/member/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteText }),
      })
      if (res.ok) {
        setNoteText('')
        setNoteSent(true)
        setTimeout(() => setNoteSent(false), 3000)
      } else {
        const data = await res.json()
        setNoteError(data.error || 'Failed to send note')
      }
    } catch {
      setNoteError('Network error — try again')
    }
    setSendingNote(false)
  }

  async function openBillingPortal() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  if (!data) return <div className="dash-loading">Loading...</div>

  if (data.state === 'billing_required') {
    return (
      <div className="dash-page">
        <div className="dash">
          <div className="status-card overdue">
            <div className="sc-top">
              <div><div className="sc-title">Subscription issue</div></div>
            </div>
            <p className="sc-snip">Your subscription needs attention. Please update your billing to continue coaching.</p>
            <button className="btn btn-accent btn-block" onClick={openBillingPortal}>Manage billing</button>
          </div>
        </div>
      </div>
    )
  }

  const m = data.member!
  const ci = data.check_in!
  const coach = data.coach!

  return (
    <div className="dash-page">
      {/* App bar */}
      <div className="appbar">
        <span className="kd-brand" style={{ gap: '8px' }}>
          <KdLogo />
          <span className="word" style={{ fontSize: '17px' }}>Keto<b>Dial</b></span>
        </span>
        <a href="/app/settings" className="ic-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.77 1.05 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </a>
      </div>

      <div className="dash">
        {/* Greeting */}
        <div className="dash-hello">
          <div className="dh-l">
            <h1>Hi, {m.display_name}</h1>
            <div className="wk">{m.founding_member ? 'Founding member' : 'Member'} &middot; {m.diet_type}</div>
          </div>
          <span className="mem-av a lg">{m.display_name[0]?.toUpperCase()}</span>
        </div>

        {/* Status Card */}
        {ci.status === 'due' && (
          <div className="status-card due">
            <div className="sc-top">
              <span className="coach-av sm">R</span>
              <div>
                <div className="sc-k">It&apos;s check-in day</div>
                <div className="sc-title">Your weekly check-in is ready</div>
              </div>
            </div>
            <p className="sc-snip">Your coach is expecting your update. Takes about two minutes.</p>
            <a className="btn btn-accent btn-block" href="/app/checkin">Start check-in</a>
          </div>
        )}

        {ci.status === 'submitted' && (
          <div className="status-card reply">
            <div className="sc-top">
              <span className="coach-av sm">R</span>
              <div>
                <div className="sc-k">Check-in received</div>
                <div className="sc-title">{coach.has_unread_response ? 'New response from your coach' : 'Check-in submitted'}</div>
              </div>
              {coach.has_unread_response && <span className="sc-dot"></span>}
            </div>
            <p className="sc-snip">
              {coach.has_unread_response && coach.latest_response_preview
                ? coach.latest_response_preview
                : 'Your coach will review and respond within 24 hours.'}
            </p>
            {coach.has_unread_response && (
              <a className="btn btn-primary btn-block" href="/app/thread">View response</a>
            )}
          </div>
        )}

        {ci.status === 'overdue' && (
          <div className="status-card overdue">
            <div className="sc-top">
              <span className="coach-av sm">R</span>
              <div>
                <div className="sc-k" style={{ color: 'var(--warn)' }}>Check-in overdue</div>
                <div className="sc-title">Your check-in is waiting</div>
              </div>
            </div>
            <p className="sc-snip">No guilt — just pick it back up. Your coach is expecting your update.</p>
            <a className="btn btn-accent btn-block" href="/app/checkin">Pick it back up</a>
          </div>
        )}

        {/* Latest response preview */}
        {coach.latest_response_preview && (
          <>
            <div className="section-label">
              Latest coaching response
              <a href="/app/thread">All responses &rarr;</a>
            </div>
            <a className="thread-prev" href="/app/thread">
              <span className="coach-av sm">R</span>
              <div className="tp-body">
                <div className="tp-name">Your coach</div>
                <div className="tp-snip">{coach.latest_response_preview}</div>
              </div>
              <span className="tp-go">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
              </span>
            </a>
          </>
        )}

        {/* Quick note */}
        <div className="quick-reply">
          <input
            className="qr-inp-real"
            type="text"
            placeholder="Add a note for your next response..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendNote()}
          />
          {noteText.trim() && (
            <button className="btn btn-accent btn-sm" onClick={sendNote} disabled={sendingNote}>
              {sendingNote ? '...' : 'Send'}
            </button>
          )}
        </div>
        {noteError && <p style={{ fontSize: '12px', color: 'var(--bad)', marginTop: '6px' }}>{noteError}</p>}
        {noteSent && <p style={{ fontSize: '12px', color: 'var(--good)', marginTop: '6px' }}>Note sent to your coach</p>}

        {/* Focus card */}
        {data.focus?.body && (
          <div className="focus-card">
            <span className="fi">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a9 9 0 1 0 9 9"/><path d="M12 12l5-5"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>
              </svg>
            </span>
            <div>
              <div className="fk">Your current focus</div>
              <div className="fv">{data.focus.body}</div>
            </div>
          </div>
        )}

        {/* Bonus credit */}
        {ci.bonus_credits_available > 0 && ci.status === 'submitted' && (
          <div style={{ marginTop: '14px', textAlign: 'center' }}>
            <a href="/app/checkin?type=bonus" className="pill" style={{ cursor: 'pointer' }}>
              {ci.bonus_credits_available} bonus check-in credit available
            </a>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="tabbar">
        <a href="/app/dashboard" className="tab-btn on">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
          Home
        </a>
        <a href="/app/checkin" className="tab-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          Check-Ins
        </a>
        <a href="/app/thread" className="tab-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Responses
        </a>
        <a href="/app/settings" className="tab-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>
          Account
        </a>
      </div>
    </div>
  )
}
