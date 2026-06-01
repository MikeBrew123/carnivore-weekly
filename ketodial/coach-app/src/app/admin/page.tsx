'use client'

import { useState, useEffect, useCallback } from 'react'
import { KdLogo } from '@/components/landing/KdBrand'
import '@/styles/coach.css'
import '@/styles/admin.css'

interface QueueItem {
  id: string
  member_id: string
  content: string
  ai_draft: string | null
  ai_structured_output: any
  red_flag: boolean
  red_flag_reason: string | null
  review_status: string
  checkin_id: string | null
  created_at: string
}

interface Member {
  display_name: string
  email: string
  tier: string
  founding_member: boolean
  risk_level: string
  coaching_mode: string
  current_weight: number | null
  goal_weight: number | null
  start_weight: number | null
  diet_type: string
  health_conditions: string[]
  medications: string | null
  coach_notes: string | null
  member_summary: string | null
}

interface CheckIn {
  weight: number | null
  steps_avg: number | null
  sleep_quality: number | null
  energy_level: number | null
  cravings_level: number | null
  adherence: number | null
  wins: string | null
  struggles: string | null
  symptoms: string | null
  help_request: string | null
  period_start: string
  submitted_at: string
}

export default function AdminQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [members, setMembers] = useState<Record<string, Member>>({})
  const [checkins, setCheckins] = useState<Record<string, CheckIn>>({})
  const [stats, setStats] = useState({ pending: 0, flagged: 0, overdue: 0 })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draftContent, setDraftContent] = useState('')
  const [acting, setActing] = useState(false)
  const [toast, setToast] = useState('')

  const loadQueue = useCallback(async () => {
    const res = await fetch('/api/admin/queue')
    if (res.ok) {
      const data = await res.json()
      setQueue(data.queue)
      setMembers(data.members)
      setCheckins(data.checkins)
      setStats(data.stats)
      if (data.queue.length > 0 && !selectedId) {
        setSelectedId(data.queue[0].id)
        setDraftContent(data.queue[0].content || data.queue[0].ai_draft || '')
      }
    }
  }, [selectedId])

  useEffect(() => { loadQueue() }, [loadQueue])

  // Select item and load its draft
  function selectItem(item: QueueItem) {
    setSelectedId(item.id)
    setDraftContent(item.content || item.ai_draft || '')
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'Enter' && !e.shiftKey && selectedId) {
        e.preventDefault()
        handleAction('approve_send')
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [selectedId])

  async function handleAction(action: string) {
    if (!selectedId || acting) return
    setActing(true)

    const body: any = { action, message_id: selectedId }
    if (action === 'edit_send') body.content = draftContent

    const res = await fetch('/api/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (res.ok) {
      const labels: Record<string, string> = {
        approve_send: 'Sent',
        edit_send: 'Edited & sent',
        flag: 'Flagged for later',
        escalate: 'Escalated',
      }
      showToast(labels[action] || 'Done')
      // Remove from queue and select next
      const newQueue = queue.filter(q => q.id !== selectedId)
      setQueue(newQueue)
      if (newQueue.length > 0) {
        selectItem(newQueue[0])
      } else {
        setSelectedId(null)
      }
    }
    setActing(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function timeAgo(dateStr: string) {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const selected = queue.find(q => q.id === selectedId)
  const member = selected ? members[selected.member_id] : null
  const checkin = selected?.checkin_id ? checkins[selected.checkin_id] : null

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-head">
        <div className="lead">
          <span className="kd-brand">
            <KdLogo />
            <span className="word">Keto<b>Dial</b></span>
            <span className="sub">Coach</span>
          </span>
          <span className="badge-admin">Admin &middot; Review Queue</span>
        </div>
      </div>

      {/* Browser chrome */}
      <div className="browser">
        <div className="browser-bar">
          <div className="lights"><span className="r"></span><span className="y"></span><span className="g"></span></div>
          <div className="urlbar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12, color: 'var(--good)' }}>
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            coach.ketodial.com/admin/review
          </div>
        </div>

        <div className="work">
          {/* Top bar */}
          <div className="topbar">
            <div className="tb-l">
              <div className="who">
                <span className="coach-av sm">R</span>
                <b>Remy</b> <span style={{ color: 'var(--ink-faint)' }}>&middot; reviewing</span>
              </div>
              <div className="qstats">
                <span className="qstat"><b>{stats.pending}</b> pending</span>
                <span className={`qstat ${stats.flagged > 0 ? 'flag' : ''}`}><b>{stats.flagged}</b> red-flagged</span>
              </div>
            </div>
            <div className="kbd"><kbd>Enter</kbd> approve <span style={{ opacity: .5 }}>&middot;</span> <kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</div>
          </div>

          <div className="panes">
            {/* Queue list */}
            <div className="queue-pane">
              <div className="queue-head"><h3>Pending review &middot; red flags first</h3></div>
              <div className="queue-list">
                {queue.length === 0 && (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-faint)' }}>
                    Queue clear — nice work.
                  </div>
                )}
                {queue.map(item => {
                  const m = members[item.member_id]
                  return (
                    <div
                      key={item.id}
                      className={`qitem ${item.id === selectedId ? 'on' : ''} ${item.red_flag ? 'flag' : ''}`}
                      onClick={() => selectItem(item)}
                    >
                      <div className="qi-top">
                        <span className="mem-av sm">{m?.display_name?.[0]?.toUpperCase() || '?'}</span>
                        <div className="qi-id">
                          <div className="qi-name">{m?.display_name || 'Unknown'}</div>
                          <div className="qi-meta">
                            {item.checkin_id ? 'check-in' : 'message'} &middot; {timeAgo(item.created_at)}
                          </div>
                        </div>
                      </div>
                      {(item.red_flag) && (
                        <div className="qi-badges">
                          <span className="qbadge flag">Red flag</span>
                        </div>
                      )}
                      <div className="qi-prev">
                        {(item.content || item.ai_draft || '').substring(0, 72)}...
                      </div>
                      <button
                        className="qi-approve"
                        onClick={(e) => { e.stopPropagation(); setSelectedId(item.id); handleAction('approve_send') }}
                      >
                        Approve &amp; send
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Detail pane */}
            <div className="detail-pane">
              {!selected ? (
                <div className="empty-detail">
                  Queue clear — nice work.
                  <span>All caught up. New items appear here as members check in.</span>
                </div>
              ) : (
                <>
                  {/* Member context */}
                  {member && (
                    <div className="ctx-card">
                      <div className="ctx-top">
                        <span className="mem-av lg">{member.display_name[0]?.toUpperCase()}</span>
                        <div className="ctx-id">
                          <div className="ctx-name">{member.display_name}</div>
                          <div className="ctx-sub">{member.tier} member &middot; {member.diet_type}</div>
                        </div>
                      </div>
                      <div className="ctx-stats">
                        <div className="cs"><div className="csk">Weight</div><div className="csv">{member.current_weight || '—'}</div></div>
                        <div className="cs"><div className="csk">Goal</div><div className="csv">{member.goal_weight || '—'}</div></div>
                        <div className="cs"><div className="csk">Conditions</div><div className="csv sm">{member.health_conditions?.join(', ') || 'None'}</div></div>
                        <div className="cs"><div className="csk">Meds</div><div className="csv sm">{member.medications || 'None'}</div></div>
                      </div>
                      {member.coach_notes && (
                        <div className="ctx-notes">
                          <div className="cn-label">Coach notes</div>
                          <div className="notes-area">{member.coach_notes}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Check-in data */}
                  {checkin && (
                    <>
                      <div className="d-label">This check-in</div>
                      <div className="dgrid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '16px' }}>
                        <div className="cell"><div className="k">Weight</div><div className="v">{checkin.weight || '—'}</div></div>
                        <div className="cell"><div className="k">Steps</div><div className="v">{checkin.steps_avg ? `${(checkin.steps_avg / 1000).toFixed(1)}k` : '—'}</div></div>
                        <div className="cell"><div className="k">Sleep</div><div className="v">{checkin.sleep_quality || '—'}/5</div></div>
                        <div className="cell"><div className="k">Energy</div><div className="v">{checkin.energy_level || '—'}/5</div></div>
                        <div className="cell"><div className="k">Cravings</div><div className="v">{checkin.cravings_level || '—'}/5</div></div>
                        <div className="cell"><div className="k">Adherence</div><div className="v">{checkin.adherence || '—'}/10</div></div>
                      </div>

                      <div className="d-label">In their words</div>
                      {checkin.wins && <div className="qa-block"><div className="qa-q">Wins</div><div className="qa-a">{checkin.wins}</div></div>}
                      {checkin.struggles && <div className="qa-block"><div className="qa-q">Struggles</div><div className={`qa-a ${selected.red_flag ? 'hl' : ''}`}>{checkin.struggles}</div></div>}
                      {checkin.symptoms && <div className="qa-block"><div className="qa-q">Notes/symptoms</div><div className={`qa-a ${selected.red_flag ? 'hl' : ''}`}>{checkin.symptoms}</div></div>}
                    </>
                  )}

                  {/* Red flag banner */}
                  {selected.red_flag && (
                    <div className="flag-banner">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
                      </svg>
                      <div><b>Medical content detected</b> — {selected.red_flag_reason || 'flagged for review'}. Human review required.</div>
                    </div>
                  )}

                  {/* AI draft */}
                  <div className="d-label between">
                    <span>AI draft response</span>
                    <span className={`draft-tag ${selected.red_flag ? 'flag' : ''}`}>{selected.red_flag ? 'flagged' : 'ready'}</span>
                  </div>
                  <textarea
                    className="draft-area"
                    value={draftContent}
                    onChange={e => setDraftContent(e.target.value)}
                  />

                  {/* Actions */}
                  <div className="action-row">
                    <button className="btn btn-coach" onClick={() => handleAction('approve_send')} disabled={acting}>
                      Approve &amp; Send
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleAction('edit_send')} disabled={acting}>
                      Edit &amp; Send
                    </button>
                    <button className="btn btn-ghost" onClick={() => handleAction('flag')} disabled={acting}>
                      Flag for later
                    </button>
                    {selected.red_flag && (
                      <button className="btn btn-escalate" onClick={() => handleAction('escalate')} disabled={acting}>
                        Escalate
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && <div className="toast show">{toast}</div>}
    </div>
  )
}
