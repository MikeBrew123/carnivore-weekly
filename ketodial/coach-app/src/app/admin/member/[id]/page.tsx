'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import '@/styles/coach.css'
import '@/styles/admin.css'
import '@/styles/member-profile.css'

type Tab = 'overview' | 'history' | 'thread' | 'account'

export default function MemberProfilePage() {
  const params = useParams()
  const router = useRouter()
  const memberId = params.id as string

  const [data, setData] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetch(`/api/admin/member?id=${memberId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setData(d)
          setNotes(d.member.coach_notes || '')
        }
      })
  }, [memberId])

  async function handleEditMessage(messageId: string) {
    if (!editContent.trim()) return
    setSaving(true)
    const res = await fetch('/api/admin/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'edit_sent', message_id: messageId, content: editContent.trim() }),
    })
    if (res.ok) {
      showToast('Response updated — member notified')
      setEditingMsgId(null)
      // Refresh data
      fetch(`/api/admin/member?id=${memberId}`).then(r => r.ok ? r.json() : null).then(d => { if (d) setData(d) })
    } else {
      showToast('Failed to update')
    }
    setSaving(false)
  }

  if (!data) return <div className="admin-page" style={{ padding: 60, textAlign: 'center' }}>Loading...</div>

  const { member, checkins, messages, safety_events, metrics, streak } = data

  const sentMessages = messages.filter((m: any) => m.sent_at)
  const weightData = metrics.filter((m: any) => m.weight)
  const weightChange = member.start_weight && member.current_weight
    ? (member.current_weight - member.start_weight).toFixed(1)
    : null
  const avgAdherence = checkins.length > 0
    ? (checkins.reduce((s: number, c: any) => s + (c.adherence || 0), 0) / checkins.length).toFixed(1)
    : null

  async function saveNotes() {
    setSaving(true)
    await fetch('/api/admin/member', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, coach_notes: notes }),
    })
    setSaving(false)
    showToast('Notes saved')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function fmtShort(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="profile-head">
        <button className="back-btn" onClick={() => router.push('/admin')}>&larr; Review queue</button>
        <div className="profile-id">
          <span className="mem-av lg">{member.display_name?.[0]?.toUpperCase()}</span>
          <div>
            <div className="profile-name">{member.display_name}</div>
            <div className="profile-sub">
              {member.tier} member &middot; {member.diet_type} &middot; since {fmtDate(member.onboarded_at || member.created_at)}
              {member.status !== 'active' && <span className="status-pill inactive">{member.status}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="profile-tabs">
        {(['overview', 'history', 'thread', 'account'] as Tab[]).map(t => (
          <button key={t} className={`ptab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="profile-body">
        {tab === 'overview' && (
          <div className="tab-content">
            {/* Key metrics */}
            <div className="metric-row">
              <div className="metric-card">
                <div className="mk">Weight</div>
                <div className="mv">{member.current_weight || '—'}<span className="mu">lbs</span></div>
                {weightChange && <div className={`mc ${Number(weightChange) < 0 ? 'good' : 'warn'}`}>{Number(weightChange) > 0 ? '+' : ''}{weightChange} from start</div>}
              </div>
              <div className="metric-card">
                <div className="mk">Goal</div>
                <div className="mv">{member.goal_weight || '—'}<span className="mu">lbs</span></div>
              </div>
              <div className="metric-card">
                <div className="mk">Streak</div>
                <div className="mv">{streak}<span className="mu">wks</span></div>
              </div>
              <div className="metric-card">
                <div className="mk">Avg adherence</div>
                <div className="mv">{avgAdherence || '—'}<span className="mu">/10</span></div>
              </div>
              <div className="metric-card">
                <div className="mk">Check-ins</div>
                <div className="mv">{checkins.length}</div>
              </div>
              <div className="metric-card">
                <div className="mk">Flags</div>
                <div className="mv">{safety_events.length}</div>
                {safety_events.filter((e: any) => !e.resolved_at).length > 0 && (
                  <div className="mc warn">{safety_events.filter((e: any) => !e.resolved_at).length} unresolved</div>
                )}
              </div>
            </div>

            {/* Weight chart (simple text-based for now) */}
            {weightData.length > 1 && (
              <div className="section-card">
                <div className="sc-label">Weight trend</div>
                <div className="weight-chart">
                  {weightData.slice(-12).map((m: any, i: number) => (
                    <div key={i} className="wc-point">
                      <div className="wc-val">{m.weight}</div>
                      <div className="wc-date">{fmtShort(m.recorded_date)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member summary */}
            {member.member_summary && (
              <div className="section-card">
                <div className="sc-label">Longitudinal summary</div>
                <div className="summary-text">{member.member_summary}</div>
              </div>
            )}

            {/* Coach notes */}
            <div className="section-card">
              <div className="sc-label">Coach notes</div>
              <textarea
                className="notes-edit"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this member..."
              />
              <button className="btn btn-coach btn-sm" onClick={saveNotes} disabled={saving}>
                {saving ? 'Saving...' : 'Save notes'}
              </button>
            </div>

            {/* Safety history */}
            {safety_events.length > 0 && (
              <div className="section-card">
                <div className="sc-label">Safety flag history</div>
                {safety_events.slice(0, 10).map((e: any) => (
                  <div key={e.id} className="safety-row">
                    <span className={`sf-sev ${e.severity}`}>{e.severity}</span>
                    <span className="sf-cat">{e.category}</span>
                    <span className="sf-trigger">{e.trigger_text}</span>
                    <span className="sf-date">{fmtShort(e.created_at)}</span>
                    <span className={`sf-status ${e.resolved_at ? 'resolved' : 'open'}`}>
                      {e.resolved_at ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="tab-content">
            {checkins.length === 0 && <div className="empty-tab">No check-ins yet.</div>}
            {checkins.map((c: any) => (
              <details key={c.id} className="checkin-card">
                <summary className="cc-summary">
                  <span className="cc-date">{fmtDate(c.submitted_at)}</span>
                  <span className="cc-nums">
                    {c.weight && <span>W: {c.weight}</span>}
                    {c.adherence && <span>A: {c.adherence}/10</span>}
                    {c.energy_level && <span>E: {c.energy_level}/5</span>}
                    {c.cravings_level && <span>C: {c.cravings_level}/5</span>}
                  </span>
                </summary>
                <div className="cc-body">
                  <div className="cc-grid">
                    <div><b>Sleep:</b> {c.sleep_quality || '—'}/5</div>
                    <div><b>Steps:</b> {c.steps_avg ? `${(c.steps_avg / 1000).toFixed(1)}k` : '—'}</div>
                  </div>
                  {c.wins && <div className="cc-text"><b>Wins:</b> {c.wins}</div>}
                  {c.struggles && <div className="cc-text"><b>Struggles:</b> {c.struggles}</div>}
                  {c.symptoms && <div className="cc-text"><b>Notes:</b> {c.symptoms}</div>}
                </div>
              </details>
            ))}
          </div>
        )}

        {tab === 'thread' && (
          <div className="tab-content">
            {messages.length === 0 && <div className="empty-tab">No messages yet.</div>}
            {[...messages].reverse().map((m: any) => (
              <div key={m.id} className={`thread-msg ${m.direction} ${!m.sent_at && m.direction === 'coach' ? 'pending' : ''}`}>
                <div className="tm-head">
                  <span className="tm-who">{m.direction === 'coach' ? 'Coach Remy' : member.display_name}</span>
                  <span className="tm-date">{m.sent_at ? fmtDate(m.sent_at) : fmtDate(m.created_at)}</span>
                  {!m.sent_at && m.direction === 'coach' && <span className="tm-badge pending-badge">Pending review</span>}
                  {m.was_edited && <span className="tm-badge edited">Edited</span>}
                  {m.was_auto_sent && <span className="tm-badge auto">Auto-sent</span>}
                  {m.red_flag && <span className="tm-badge flag-badge">Flagged</span>}
                  {m.sent_at && m.direction === 'coach' && editingMsgId !== m.id && (
                    <button className="tm-edit-btn" onClick={() => { setEditingMsgId(m.id); setEditContent(m.content) }}>Edit</button>
                  )}
                </div>
                {editingMsgId === m.id ? (
                  <div className="tm-edit-wrap">
                    <textarea className="tm-edit-area" value={editContent} onChange={e => setEditContent(e.target.value)} />
                    <div className="tm-edit-actions">
                      <button className="btn btn-coach btn-sm" onClick={() => handleEditMessage(m.id)} disabled={saving}>
                        {saving ? 'Saving...' : 'Update & notify member'}
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingMsgId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="tm-body">{m.content}</div>
                )}
                {m.direction === 'coach' && m.ai_draft && m.was_edited && editingMsgId !== m.id && (
                  <details className="tm-audit">
                    <summary>View original AI draft</summary>
                    <div className="tm-draft">{m.ai_draft}</div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'account' && (
          <div className="tab-content">
            <div className="section-card">
              <div className="sc-label">Subscription</div>
              <div className="acct-grid">
                <div><b>Tier:</b> {member.tier}{member.founding_member ? ' (founding)' : ''}</div>
                <div><b>Status:</b> {member.subscription_status || member.status}</div>
                <div><b>Stripe ID:</b> <code>{member.stripe_subscription_id || '—'}</code></div>
                <div><b>Bonus credits:</b> {member.bonus_credit_balance ?? 0}</div>
              </div>
            </div>

            <div className="section-card">
              <div className="sc-label">Intake form</div>
              <div className="acct-grid">
                <div><b>Age:</b> {member.age || '—'}</div>
                <div><b>Sex:</b> {member.sex || '—'}</div>
                <div><b>Height:</b> {member.height_cm ? `${member.height_cm} cm` : '—'}</div>
                <div><b>Activity:</b> {member.activity_level || '—'}</div>
                <div><b>Diet:</b> {member.diet_type} ({member.diet_duration || '?'})</div>
                <div><b>Conditions:</b> {member.health_conditions?.join(', ') || 'None'}</div>
                <div><b>Medications:</b> {member.medications || 'None'}</div>
              </div>
              {member.biggest_challenge && <div className="acct-text"><b>Challenge:</b> {member.biggest_challenge}</div>}
              {member.success_vision && <div className="acct-text"><b>Success vision:</b> {member.success_vision}</div>}
            </div>
          </div>
        )}
      </div>

      {toast && <div className="toast show">{toast}</div>}
    </div>
  )
}
